import * as vscode from "vscode";
import * as fs from "node:fs";
import * as path from "node:path";
import * as childProcess from "node:child_process";
import { minimatch } from "minimatch";
import { isTextFile } from "../common/fileUtils";
import { detectAndDecodeFile } from "../common/encoding";
import { outputChannel } from "../common/logger";

const CODE_BLOCK = "```";

export async function copyDirectoryCode(resource: vscode.Uri) {
	let content = "";
	if (resource && fs.lstatSync(resource.fsPath).isDirectory()) {
		content = generateDirectoryTree(resource.fsPath, "", true);
	}
	vscode.env.clipboard.writeText(content);
	vscode.window.showInformationMessage("Directory code copied to clipboard!");
}

export function generateDirectoryTree(
	dir: string,
	indent: string,
	includeFileContents: boolean,
): string {
	const excludePatterns = vscode.workspace
		.getConfiguration("codeToClipboard")
		.get<string[]>("excludePatterns");

	const files = childProcess
		.execSync(`git -C "${dir}" ls-files`)
		.toString()
		.trim()
		.split("\n")
		.filter(
			(file) => !excludePatterns?.some((pattern) => minimatch(file, pattern)),
		);

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
			const extension = path.extname(filePath).slice(1);
			outputChannel.appendLine(
				`[DEBUG] File: ${filePath}, Extension: ${extension}`,
			);
			fileContents += `### ${file}\n\n${CODE_BLOCK}${extension}\n${fileContent}\n${CODE_BLOCK}\n\n`;
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

	if (includeFileContents && indent === "") {
		return `${tree}\n${fileContents}`;
	}
	return tree;
}
