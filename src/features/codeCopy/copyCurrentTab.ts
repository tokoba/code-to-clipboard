import * as vscode from "vscode";
import * as path from "node:path";
import { isTextFile } from "../common/fileUtils";
import { detectAndDecodeFile } from "../common/encoding";
import { outputChannel } from "../common/logger";

const CODE_BLOCK = "```";

export async function copyCurrentTabCode() {
	const activeTextEditor = vscode.window.activeTextEditor;
	if (activeTextEditor) {
		const filePath = activeTextEditor.document.uri.fsPath;
		if (isTextFile(filePath)) {
			const fileContent = detectAndDecodeFile(filePath);
			if (fileContent === null) {
				return;
			}
			const relativeFilePath = vscode.workspace.asRelativePath(filePath);
			const extension = path.extname(filePath).slice(1);
			outputChannel.appendLine(
				`[DEBUG] File: ${filePath}, Extension: ${extension}`,
			);
			const content = `### ${relativeFilePath}\n\n${CODE_BLOCK}${extension}\n${fileContent}\n${CODE_BLOCK}\n\n`;
			const projectName = vscode.workspace.name || "Untitled";
			const outputContent = `# ${projectName}\n\n## Copied Files\n\n  - ${relativeFilePath}\n\n## File Contents\n\n${content}`;
			vscode.env.clipboard.writeText(outputContent);
			vscode.window.showInformationMessage("Code copied to clipboard!");
		}
	}
}
