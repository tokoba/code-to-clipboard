import * as fs from "node:fs"
import * as path from "node:path"
import * as vscode from "vscode"
import { detectAndDecodeFile } from "../common/encoding"
import { listWorkspaceFiles } from "../common/workspaceFiles"
import { LLMConfigurationManager } from "../llm/LLMConfigurationManager"

let llmManager: LLMConfigurationManager | undefined;

function getLLMManager(context: vscode.ExtensionContext): LLMConfigurationManager {
    if (!llmManager) {
        llmManager = new LLMConfigurationManager(context);
    }
    return llmManager;
}

export async function openRelatedFilesDepth1(resource: vscode.Uri, context?: vscode.ExtensionContext) {
    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Window,
            title: "Fetching related files...",
            cancellable: false,
        },
        async () => {
            try {
                // Get extension context - this should be passed from the main extension
                if (!context) {
                    const extensions = vscode.extensions.all;
                    const codeToClipboardExt = extensions.find(ext => ext.id.includes('code-to-clipboard'));
                    if (!codeToClipboardExt) {
                        vscode.window.showErrorMessage("Extension context not available");
                        return;
                    }
                    // This is a workaround - ideally context should be passed from extension.ts
                }

                const startFile = resource.fsPath

                const workspaceFolders = vscode.workspace.workspaceFolders
                if (!workspaceFolders) {
                    vscode.window.showErrorMessage("No workspace folder open.")
                    return
                }
                const rootPath = workspaceFolders[0].uri.fsPath

                // VS Code API＋.gitignore に基づきファイル一覧取得
                const fileUris = await listWorkspaceFiles()
                const allFiles = fileUris.map((u) => path.relative(rootPath, u.fsPath))

                // Use new LLM configuration manager
                const manager = getLLMManager(context!);
                
                try {
                    // Refresh configuration to get latest settings
                    await manager.refreshConfiguration();
                    
                    // Validate that we have a working provider
                    const activeProvider = await manager.getActiveProvider();
                    vscode.window.showInformationMessage(
                        `Using LLM provider: ${activeProvider.name}`
                    );
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    vscode.window.showErrorMessage(
                        `LLM Configuration Error: ${errorMessage}. Please check your settings.`
                    );
                    return;
                }

                // Read and prepare start file content
                const fileContent = detectAndDecodeFile(startFile)
                if (fileContent === null) {
                    vscode.window.showErrorMessage(
                        `Failed to read or decode the starting file: ${startFile}`
                    )
                    return
                }
                const startFileContent = fileContent.split("\n").slice(0, 200).join("\n")

                const fileListText = allFiles.map((f) => `- ${f}`).join("\n")
                const relativeStartFile = path.relative(rootPath, startFile)

                const prompt = `
# Related File Search

## Request
You are given a project file list and a starting file. Identify all files that are directly referenced or strongly related to the starting file.
Return only their relative paths, one per line, without explanations.

## Workspace Project Files
The project files are:
${fileListText}

## Starting File
The starting file is: ${relativeStartFile}

## Starting File Content
The first 200 lines of the starting file are as follows:
\`\`\`
${startFileContent}
\`\`\`
`

                // Use the new LLM manager to send request
                const response = await manager.sendRequest(prompt);
                const content = response.content;

                const relatedFiles = content
                    .split("\n")
                    .map((line) => line.trim())
                    .filter((line) => line && !line.startsWith("#") && !line.startsWith("-"))

                const existingFiles = relatedFiles
                    .map((f) => path.join(rootPath, f))
                    .filter((f) => fs.existsSync(f))

                if (existingFiles.length === 0) {
                    vscode.window.showInformationMessage("No related files found.")
                    return
                }

                for (const filePath of existingFiles) {
                    const doc = await vscode.workspace.openTextDocument(filePath)
                    await vscode.window.showTextDocument(doc, {
                        preview: false,
                        preserveFocus: true,
                    })
                }

                vscode.window.showInformationMessage(
                    `${existingFiles.length} related files opened using ${response.provider} (${response.model}).`
                )
            } catch (error: unknown) {
                if (error instanceof Error) {
                    vscode.window.showErrorMessage(`Error occurred: ${error.message}`)
                } else {
                    vscode.window.showErrorMessage("Error occurred.")
                }
            }
        }
    )
}

// Function to refresh LLM configuration (can be called when settings change)
export function refreshLLMConfiguration(): void {
    if (llmManager) {
        llmManager.refreshConfiguration();
    }
}