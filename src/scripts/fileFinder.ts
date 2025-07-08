import fg from "fast-glob"

async function main() {
    const files = await fg(["src/**/*.ts", "src/**/*.js"])
    console.log(files) // ファイル一覧が配列で得られる
}

main()
