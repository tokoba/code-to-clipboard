import * as vscode from "vscode";
import * as path from "node:path";

export async function copyOpenTabFileNames() {
	const names: string[] = [];

	for (const group of vscode.window.tabGroups.all) {
		for (const tab of group.tabs) {
			if (tab.input instanceof vscode.TabInputText) {
				names.push(`@${path.basename(tab.input.uri.fsPath)}`);
			}
		}
	}

	if (names.length === 0) {
		vscode.window.showInformationMessage("No open text tabs.");
		return;
	}

	await vscode.env.clipboard.writeText(names.join(" "));
	vscode.window.showInformationMessage(
		"Open tab file names copied to clipboard!",
	);
}
