import * as fs from "node:fs"
import * as path from "node:path"
import * as vscode from "vscode"
import { detectAndDecodeFile } from "../common/encoding"
import { listWorkspaceFiles } from "../common/workspaceFiles"
import type { OpenAIChatCompletionResponse } from "../types"

export async function openRelatedFilesDepth1(resource: vscode.Uri) {
    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Window,
            title: "Fetching related files...",
            cancellable: false,
        },
        async () => {
            try {
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

                const apiKey = process.env.OPENAI_API_KEY
                if (!apiKey) {
                    vscode.window.showErrorMessage(
                        "OpenAI API key not set. Set OPENAI_API_KEY env."
                    )
                    return
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

                const endpoint = "http://localhost:5130/v1/chat/completions"
                // const endpoint = "https://api.openai.com/v1/chat/completions"
                const response = await fetch(endpoint, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${apiKey}`,
                    },
                    body: JSON.stringify({
                        model: "gpt-4o",
                        messages: [
                            { role: "system", content: "You are a helpful assistant." },
                            { role: "user", content: prompt },
                        ],
                        temperature: 0,
                    }),
                })

                if (!response.ok) {
                    const errorText = await response.text()
                    vscode.window.showErrorMessage(`OpenAI API error: ${errorText}`)
                    return
                }

                const data = (await response.json()) as OpenAIChatCompletionResponse
                const content: string = data.choices?.[0]?.message?.content || ""

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
                    `${existingFiles.length} related files opened.`
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
