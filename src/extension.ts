import * as vscode from "vscode";
import { outputChannel } from "./features/common/logger";
import { copyCode } from "./features/codeCopy/copyAllTabs";
import { copyCurrentTabCode } from "./features/codeCopy/copyCurrentTab";
import { copyDirectoryCode } from "./features/directoryCopy/copyDirectoryCode";
import { copyDirectoryTree } from "./features/directoryCopy/copyDirectoryTree";
import { copyOpenTabFileNames } from "./features/filenameCopy/copyOpenTabFileNames";
import { openRelatedFilesDepth1 } from "./features/relatedFiles/openRelatedFiles";

export function activate(context: vscode.ExtensionContext) {
	outputChannel.clear();
	outputChannel.appendLine("CodeToClipboard extension activated");

	context.subscriptions.push(
		vscode.commands.registerCommand("code-to-clipboard.copyCode", copyCode),
		vscode.commands.registerCommand(
			"code-to-clipboard.copyCurrentTabCode",
			copyCurrentTabCode,
		),
		vscode.commands.registerCommand(
			"code-to-clipboard.copyDirectoryCode",
			copyDirectoryCode,
		),
		vscode.commands.registerCommand(
			"code-to-clipboard.copyDirectoryTree",
			copyDirectoryTree,
		),
		vscode.commands.registerCommand(
			"code-to-clipboard.openRelatedFilesDepth1",
			openRelatedFilesDepth1,
		),
		vscode.commands.registerCommand(
			"code-to-clipboard.copyOpenTabFileNames",
			copyOpenTabFileNames,
		),
	);
}

export function deactivate() {}
