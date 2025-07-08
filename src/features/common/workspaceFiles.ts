import * as vscode from "vscode"
import * as fs from "node:fs"
import * as path from "node:path"
import ignore from "ignore"

/**
 * .gitignore 等を考慮してワークスペース内のファイル URI を返す
 */
export async function listWorkspaceFiles(): Promise<vscode.Uri[]> {
    const ws = vscode.workspace.workspaceFolders?.[0]
    if (!ws) return []

    const root = ws.uri.fsPath
    const ig = ignore()

    const gitignore = path.join(root, ".gitignore")
    if (fs.existsSync(gitignore)) {
        ig.add(fs.readFileSync(gitignore, "utf8"))
    }

    // VS Code API で候補取得（代表的な生成物は除外）
    const uris = await vscode.workspace.findFiles(
        "**/*",
        "**/{node_modules,dist,out,.vscode-test}/**",
    )

    return uris.filter((u) => {
        const rel = path.relative(root, u.fsPath)
        return rel && !ig.ignores(rel)
    })
}
