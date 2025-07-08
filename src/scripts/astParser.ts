import fs from "fs"
import ts from "typescript"

function getSourceFile(filePath: string) {
    const sourceCode = fs.readFileSync(filePath, "utf8")
    return ts.createSourceFile(filePath, sourceCode, ts.ScriptTarget.Latest)
}
