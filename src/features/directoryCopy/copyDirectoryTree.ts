import * as vscode from "vscode";
import * as fs from "node:fs";
import { generateDirectoryTree } from "./copyDirectoryCode";

export async function copyDirectoryTree(resource: vscode.Uri) {
	if (resource && fs.lstatSync(resource.fsPath).isDirectory()) {
		const tree = generateDirectoryTree(resource.fsPath, "", false);
		vscode.env.clipboard.writeText(tree);
		vscode.window.showInformationMessage("Directory tree copied to clipboard!");
	}
}
