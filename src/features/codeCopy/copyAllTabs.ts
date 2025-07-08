import * as vscode from "vscode";
import * as path from "node:path";
import { isTextFile } from "../common/fileUtils";
import { detectAndDecodeFile } from "../common/encoding";
import { outputChannel } from "../common/logger";

const CODE_BLOCK = "```";

export async function copyCode() {
	const tabGroups = vscode.window.tabGroups;
	let content = "";
	const copiedFiles: string[] = [];

	for (const tabGroup of tabGroups.all) {
		for (const tab of tabGroup.tabs) {
			if (tab.input instanceof vscode.TabInputText) {
				const filePath = tab.input.uri.fsPath;
				if (isTextFile(filePath)) {
					const fileContent = detectAndDecodeFile(filePath);
					if (fileContent === null) {
						continue;
					}
					const relativeFilePath = vscode.workspace.asRelativePath(filePath);
					const extension = path.extname(filePath).slice(1);
					outputChannel.appendLine(
						`[DEBUG] File: ${filePath}, Extension: ${extension}`,
					);
					content += `### ${relativeFilePath}\n\n${CODE_BLOCK}${extension}\n${fileContent}\n${CODE_BLOCK}\n\n`;
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
}
