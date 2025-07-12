import * as vscode from "vscode";
import { outputChannel } from "./features/common/logger";
import { copyCode } from "./features/codeCopy/copyAllTabs";
import { copyCurrentTabCode } from "./features/codeCopy/copyCurrentTab";
import { copyDirectoryCode } from "./features/directoryCopy/copyDirectoryCode";
import { copyDirectoryTree } from "./features/directoryCopy/copyDirectoryTree";
import { copyOpenTabFileNames } from "./features/filenameCopy/copyOpenTabFileNames";
import { openRelatedFilesDepth1, refreshLLMConfiguration } from "./features/relatedFiles/openRelatedFiles";

export function activate(context: vscode.ExtensionContext) {
	outputChannel.clear();
	outputChannel.appendLine("CodeToClipboard extension activated");

	// Register commands
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
			(resource: vscode.Uri) => openRelatedFilesDepth1(resource, context),
		),
		vscode.commands.registerCommand(
			"code-to-clipboard.copyOpenTabFileNames",
			copyOpenTabFileNames,
		),
	);

	// Listen for configuration changes
	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration((event) => {
			if (event.affectsConfiguration('codeToClipboard.llm')) {
				outputChannel.appendLine("LLM configuration changed, refreshing...");
				refreshLLMConfiguration();
			}
		})
	);

	outputChannel.appendLine("CodeToClipboard extension setup complete");
}

export function deactivate() {}
