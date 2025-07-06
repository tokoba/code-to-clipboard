import * as vscode from "vscode";
import * as fs from "node:fs";
import * as path from "node:path";
import * as childProcess from "node:child_process";
import { minimatch } from 'minimatch';
import * as jschardet from 'jschardet';
import iconv from 'iconv-lite';

// コードブロック用バッククォート（再利用しやすいよう定数化）
const CODE_BLOCK = "```";

interface OpenAIChatCompletionMessage {
	role: string;
	content: string;
}

interface OpenAIChatCompletionChoice {
	message?: OpenAIChatCompletionMessage;
}

interface OpenAIChatCompletionResponse {
	choices?: OpenAIChatCompletionChoice[];
}

export function activate(context: vscode.ExtensionContext) {
	const disposable = vscode.commands.registerCommand(
		"code-to-clipboard.copyCode",
		async () => {
			const tabGroups = vscode.window.tabGroups;
			let content = "";
			const copiedFiles: string[] = [];

			for (const tabGroup of tabGroups.all) {
				for (const tab of tabGroup.tabs) {
					if (tab.input instanceof vscode.TabInputText) {
						const filePath = tab.input.uri.fsPath;
						if (isTextFile(filePath)) {
							const fileContent = detectAndDecodeFile(filePath);
							if (fileContent === null) { continue; }
							const relativeFilePath = vscode.workspace.asRelativePath(filePath);
							content += `### ${relativeFilePath}\n\n${CODE_BLOCK}\n${fileContent}\n${CODE_BLOCK}\n\n`;
							copiedFiles.push(relativeFilePath);
						}
					}
				}
			}

			const projectName = vscode.workspace.name || "Untitled";
			const copiedFilesContent = copiedFiles
				.map((relativeFilePath) => `  - ${relativeFilePath}`)
				.join("\n");

			const outputContent = `# ${projectName}\n\n## Copied Files\n\n${copiedFilesContent}\n\n## File Contents\n\n${content}`;

			vscode.env.clipboard.writeText(outputContent);
			vscode.window.showInformationMessage("Code copied to clipboard!");
		},
	);

	const disposableCurrentTab = vscode.commands.registerCommand(
		"code-to-clipboard.copyCurrentTabCode",
		async () => {
			const activeTextEditor = vscode.window.activeTextEditor;
			if (activeTextEditor) {
				const filePath = activeTextEditor.document.uri.fsPath;
				if (isTextFile(filePath)) {
					const fileContent = detectAndDecodeFile(filePath);
					if (fileContent === null) { return; }
					const relativeFilePath = vscode.workspace.asRelativePath(filePath);
					const content = `### ${relativeFilePath}\n\n${CODE_BLOCK}\n${fileContent}\n${CODE_BLOCK}\n\n`;
					const projectName = vscode.workspace.name || "Untitled";
					const outputContent = `# ${projectName}\n\n## Copied Files\n\n  - ${relativeFilePath}\n\n## File Contents\n\n${content}`;
					vscode.env.clipboard.writeText(outputContent);
					vscode.window.showInformationMessage("Code copied to clipboard!");
				}
			}
		},
	);

	const disposableDirectory = vscode.commands.registerCommand(
		"code-to-clipboard.copyDirectoryCode",
		async (resource: vscode.Uri) => {
			let content = "";
			if (resource && fs.lstatSync(resource.fsPath).isDirectory()) {
				content = generateDirectoryTree(resource.fsPath, "", true);
			}
			vscode.env.clipboard.writeText(content);
			vscode.window.showInformationMessage(
				"Directory code copied to clipboard!",
			);
		},
	);

	const disposableDirectoryTree = vscode.commands.registerCommand(
		"code-to-clipboard.copyDirectoryTree",
		async (resource: vscode.Uri) => {
			if (resource && fs.lstatSync(resource.fsPath).isDirectory()) {
				const tree = generateDirectoryTree(resource.fsPath, "", false);
				vscode.env.clipboard.writeText(tree);
				vscode.window.showInformationMessage("Directory tree copied to clipboard!");
			}
		},
	);

	const disposableOpenRelatedFilesDepth1 = vscode.commands.registerCommand(
		"code-to-clipboard.openRelatedFilesDepth1",
		async (resource: vscode.Uri) => {
			await vscode.window.withProgress(
				{
					location: vscode.ProgressLocation.Window,
					title: "Fetching related files...",
					cancellable: false
				},
				async () => {
					try {
						const startFile = resource.fsPath;

						const workspaceFolders = vscode.workspace.workspaceFolders;
						if (!workspaceFolders) {
							vscode.window.showErrorMessage("No workspace folder open.");
							return;
						}
						const rootPath = workspaceFolders[0].uri.fsPath;

						const allFiles = childProcess
							.execSync(`git -C "${rootPath}" ls-files`)
							.toString()
							.trim()
							.split("\n");

						const apiKey = process.env.OPENAI_API_KEY;
						if (!apiKey) {
							vscode.window.showErrorMessage("OpenAI API key not set. Set OPENAI_API_KEY env.");
							return;
						}

						const fileListText = allFiles.map(f => `- ${f}`).join("\n");
						const relativeStartFile = path.relative(rootPath, startFile);

						const prompt = `\nYou are given a project file list and a starting file.\nThe project files are:\n${fileListText}\n\nThe starting file is: ${relativeStartFile}\n\nIdentify all files that are directly referenced or related to the starting file (depth=1).\nReturn only their relative paths, one per line, without explanations.\n`;

						const response = await fetch("https://api.openai.com/v1/chat/completions", {
							method: "POST",
							headers: {
								"Content-Type": "application/json",
								Authorization: `Bearer ${apiKey}`
							},
							body: JSON.stringify({
								model: "gpt-4o",
								messages: [
									{ role: "system", content: "You are a helpful assistant." },
									{ role: "user", content: prompt }
								],
								temperature: 0
							})
						});

						if (!response.ok) {
							const errorText = await response.text();
							vscode.window.showErrorMessage(`OpenAI API error: ${errorText}`);
							return;
						}

						const data = (await response.json()) as OpenAIChatCompletionResponse;
						const content: string = data.choices?.[0]?.message?.content || "";

						const relatedFiles = content
							.split("\n")
							.map(line => line.trim())
							.filter(line => line && !line.startsWith("#") && !line.startsWith("-"));

						const existingFiles = relatedFiles
							.map(f => path.join(rootPath, f))
							.filter(f => fs.existsSync(f));

						if (existingFiles.length === 0) {
							vscode.window.showInformationMessage("No related files found.");
							return;
						}

						for (const filePath of existingFiles) {
							const doc = await vscode.workspace.openTextDocument(filePath);
							await vscode.window.showTextDocument(doc, { preview: false, preserveFocus: true });
						}

						vscode.window.showInformationMessage(`${existingFiles.length} related files opened.`);
					} catch (error: unknown) {
						if (error instanceof Error) {
							vscode.window.showErrorMessage(`Error occurred: ${error.message}`);
						} else {
							vscode.window.showErrorMessage("Error occurred.");
						}
					}
				}
			);
		}
	);

	context.subscriptions.push(disposable, disposableCurrentTab, disposableDirectory, disposableDirectoryTree, disposableOpenRelatedFilesDepth1);
}

export function generateDirectoryTree(dir: string, indent: string, includeFileContents: boolean): string {
	const excludePatterns = vscode.workspace.getConfiguration('codeToClipboard').get<string[]>('excludePatterns');

	const files = childProcess
		.execSync(`git -C "${dir}" ls-files`)
		.toString()
		.trim()
		.split("\n")
		.filter(file => !excludePatterns?.some(pattern => minimatch(file, pattern)));

	const projectName = path.basename(dir);
	let tree = `# ${projectName}\n\n## Directory Structure\n\n- ${projectName}/\n`;
	let fileContents = "## File Contents\n\n";

	interface FileTree {
		[key: string]: FileTree | boolean;
	}

	const fileTree: FileTree = {};

	for (const file of files) {
		const filePath = path.join(dir, file);
		const parts = file.split("/");
		let currentLevel = fileTree;
		for (let i = 0; i < parts.length - 1; i++) {
			const part = parts[i];
			if (!currentLevel[part]) {
				currentLevel[part] = {};
			}
			currentLevel = currentLevel[part] as FileTree;
		}
		const fileName = parts[parts.length - 1];
		if (fs.lstatSync(filePath).isDirectory()) {
			currentLevel[fileName] = {};
			tree += generateDirectoryTree(filePath, `${indent}  `, true);
		} else if (isTextFile(filePath)) {
			currentLevel[fileName] = true;
			const fileContent = detectAndDecodeFile(filePath);
							if (fileContent === null) {
					continue; // Skip if decoding failed
				}
			fileContents += `### ${file}\n\n${CODE_BLOCK}\n${fileContent}\n${CODE_BLOCK}\n\n`;
		}
	}

	function printTree(obj: FileTree, level: string) {
		for (const key in obj) {
			tree += `${level}  - ${key}\n`;
			if (typeof obj[key] === "object") {
				printTree(obj[key] as FileTree, `${level}  `);
			}
		}
	}

	printTree(fileTree, indent);

	if (includeFileContents && indent === '') {
		return `${tree}\n${fileContents}`;
	}
	return tree;
}

export function isTextFile(filePath: string): boolean {
	try {
		if (path.extname(filePath) === ".svg") {
			return false;
		}

		const buffer = fs.readFileSync(filePath);
		const size = buffer.length;

		if (size === 0) {
			return true;
		}

		const chunk = buffer.subarray(0, size);

		// Check for BOM
		if (size >= 3 && chunk[0] === 0xEF && chunk[1] === 0xBB && chunk[2] === 0xBF) {
			return true;
		}

		// Check for text characters
		for (let i = 0; i < chunk.length; i++) {
			const charCode = chunk[i];
			if (charCode === 0) {
				return false;
			}
			if (charCode < 7 || (charCode >= 14 && charCode < 32 && charCode !== 27)) {
				return false;
			}
		}

		return true;
	} catch (error) {
		return false;
	}
}

function normalizeEncoding(enc: string | undefined): string {
  if (!enc) return "utf-8";

  // 前後空白除去＋小文字化
  let e = enc.trim().toLowerCase();

  // 共通的な揺らぎを統一
  e = e.replace(/[_\s]/g, "-");          // "_" や空白 → "-"
  if (e.startsWith("windows-")) {        // 例: windows-31j
    e = e.replace(/^windows-/, "");
  }
  if (e === "utf8") e = "utf-8";
  if (e === "utf16" || e === "utf-16") e = "utf-16le";

  // 代表的エイリアスマップ（JIS/簡体/ハングル以外も網羅）
  const map: Record<string, string> = {
    /* --- Japanese / Chinese / Korean ---------------------------- */
    "shift-jis":"shift_jis","sjis":"shift_jis","ms932":"shift_jis","cp932":"shift_jis",
    "eucjp":"euc-jp",
    "euckr":"euc-kr","euc_kr":"euc-kr","ks_c_5601-1987":"euc-kr","iso-2022-kr":"euc-kr",
    "gb2312":"gbk","gb_2312":"gbk","gbk":"gbk","gb18030":"gb18030",
    "big5hkscs":"big5","big5-hkscs":"big5","cn-big5":"big5",

    /* --- Western European -------------------------------------- */
    "latin1":"iso-8859-1","iso8859-1":"iso-8859-1",
    "windows-1252":"iso-8859-1","win1252":"iso-8859-1","cp1252":"iso-8859-1",

    /* --- Central European -------------------------------------- */
    "latin2":"windows-1250","iso8859-2":"windows-1250","iso-8859-2":"windows-1250",
    "windows-1250":"windows-1250","win1250":"windows-1250","cp1250":"windows-1250",

    /* --- Turkish ----------------------------------------------- */
    "latin5":"windows-1254","iso8859-9":"windows-1254","iso-8859-9":"windows-1254",
    "windows-1254":"windows-1254","win1254":"windows-1254","cp1254":"windows-1254",

    /* --- Cyrillic ---------------------------------------------- */
    "cyrillic":"windows-1251","iso8859-5":"windows-1251","iso-8859-5":"windows-1251",
    "windows-1251":"windows-1251","win1251":"windows-1251","cp1251":"windows-1251",
    "koi8r":"koi8-r","koi8-r":"koi8-r","koi8u":"koi8-u","koi8-u":"koi8-u",

    /* --- Greek -------------------------------------------------- */
    "iso8859-7":"windows-1253","iso-8859-7":"windows-1253",
    "windows-1253":"windows-1253","win1253":"windows-1253","cp1253":"windows-1253",

    /* --- Arabic ------------------------------------------------- */
    "iso8859-6":"windows-1256","iso-8859-6":"windows-1256",
    "windows-1256":"windows-1256","win1256":"windows-1256","cp1256":"windows-1256",

    /* --- Hebrew ------------------------------------------------- */
    "iso8859-8":"windows-1255","iso-8859-8":"windows-1255",
    "windows-1255":"windows-1255","win1255":"windows-1255","cp1255":"windows-1255",

    /* --- Baltic ------------------------------------------------- */
    "latin4":"windows-1257","iso8859-4":"windows-1257","iso-8859-4":"windows-1257",
    "iso8859-13":"windows-1257","iso-8859-13":"windows-1257",
    "windows-1257":"windows-1257","win1257":"windows-1257","cp1257":"windows-1257",

    /* --- Thai --------------------------------------------------- */
    "iso8859-11":"windows-874","iso-8859-11":"windows-874",
    "windows-874":"windows-874","win874":"windows-874","cp874":"windows-874","tis-620":"windows-874",

    /* --- Vietnamese -------------------------------------------- */
    "windows-1258":"windows-1258","win1258":"windows-1258","cp1258":"windows-1258",

    /* --- Western Extended -------------------------------------- */
    "iso8859-15":"iso-8859-15","iso-8859-15":"iso-8859-15","latin9":"iso-8859-15",

    /* --- Mac ---------------------------------------------------- */
    "mac":"macroman","macintosh":"macroman","macroman":"macroman"
  };
  return map[e] ?? e;
}

export function detectAndDecodeFile(filePath: string): string | null {
		try {
		const buffer = fs.readFileSync(filePath);
		const detected = jschardet.detect(buffer);

		const encoding = normalizeEncoding(
			detected && detected.confidence > 0.8 ? detected.encoding : "utf-8"
		);

		// ① TextDecoder が対応している場合はそれを使用
		try {
			return new TextDecoder(encoding as any).decode(buffer);
		} catch {
			/* fall-through */
		}

		// ② 非対応エンコーディングは iconv-lite にフォールバック
		try {
			return iconv.decode(buffer, encoding);
		} catch (e) {
			console.error(`Error decoding file ${filePath} with encoding ${encoding}:`, e);
			// 最後の手段として UTF-8
			try {
				return iconv.decode(buffer, "utf-8");
			} catch {
				return null;
			}
		}
	} catch (error) {
		console.error(`Error reading or decoding file ${filePath}:`, error);
		return null;
	}
}

export function deactivate() { }
