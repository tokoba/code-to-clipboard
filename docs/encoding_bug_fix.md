# 文字コード関係の不具合修正のお願い

文字コードの処理に関して，設計の検討が漏れており，文字化けする不具合が発生しているので，以下のドキュメントの内容を読んだうえで，設計変更方針を提案してください。
そして，ベストな設計変更案について処理内容の修正点を docs/projectBrief.md docs/projectDetail.md に追記してください。
既存の設計を変更・修正してかまいません。
そして，ベストな設計変更案について処理内容の修正点をソースコードに反映してください。
テストコードも追加し，動作確認も行って下さい。

## 不具合の内容

本プロジェクトでは以下のように，すべてのタブから内容をコピー，現在のタブから内容をコピー，という2種類の機能が提供されています。

```md
### 3.2. すべてのタブからコードをコピー (`code-to-clipboard.copyCode`)

1. `vscode.window.tabGroups.all` を使用して、開いているすべてのタブグループを取得します。
2. 各タブグループ内のタブをループ処理します。
3. タブが `vscode.TabInputText` のインスタンスである（つまり、テキストファイルである）ことを確認します。
4. `tab.input.uri.fsPath` からファイルの絶対パスを取得し、`isTextFile` 関数でテキストファイルかどうかを再度検証します。
5. `fs.readFileSync` を使ってファイルの内容を同期的に読み込みます。
6. `vscode.workspace.asRelativePath` を使って、ワークスペースルートからの相対パスに変換します。
7. ファイルの内容を `### {相対パス}\n\n```\n{ファイル内容}\n```\n\n` の形式で文字列に追記します。
8. コピーしたファイル名を `copiedFiles` 配列に保存します。
9. 最後に、プロジェクト名、コピーしたファイル一覧、ファイル内容を結合して最終的なMarkdown文字列を生成します。
10. `vscode.env.clipboard.writeText` を使って、生成した文字列をクリップボードに書き込みます。
11. `vscode.window.showInformationMessage` でユーザーに完了を通知します。

### 3.3. 現在のタブからコードをコピー (`code-to-clipboard.copyCurrentTabCode`)

1. `vscode.window.activeTextEditor` を使って、現在アクティブなエディタを取得します。
2. エディタが存在する場合、`document` プロパティからドキュメントオブジェクトを取得します。
3. `document.uri.fsPath` からファイルパスを取得し、`isTextFile` で検証します。
4. `document.getText()` を使って、エディタの現在の内容（未保存の変更も含む）を取得します。
5. 以降の処理は `copyCode` コマンドと同様に、Markdown形式で文字列を生成し、クリップボードに書き込みます。
```

しかし，これらの処理の中にはファイルの文字コードの判別，および複数ファイルの文字コードの統一に関する考慮が含まれていません。
その結果，以下のような不具合が発生します。この不具合はUTF-8のファイルとShift_JISのファイルが混在した場合に，すべてのタブの内容をコピーする処理を行った場合の結果です。

````md
# code-to-clipboard

## Copied Files

  - docs/projectDetail.md
  - docs/Shift_JIS_doc.md

## File Contents

### docs/projectDetail.md

```
# 詳細設計仕様書

## 1. 概要

本ドキュメントは、VSCode拡張機能「Code to Clipboard」の内部設計について詳細に記述したものです。

## 2. アーキテクチャ

本拡張機能は、VSCode APIを直接利用するシンプルなアーキテクチャを採用しています。主要な処理は `src/extension.ts` に実装されており、外部ライブラリへの依存は最小限に抑えられています（`minimatch` のみ）。

## 3. 主要な機能と実装

### 3.1. 拡張機能のアクティベーション (`activate`関数)

- **エントリーポイント**: `activate` 関数が拡張機能の起動時に呼び出されます。
- **コマンド登録**: 以下の5つのコマンドを `vscode.commands.registerCommand` を用いて登録します。
  - `code-to-clipboard.copyCode`
  - `code-to-clipboard.copyCurrentTabCode`
  - `code-to-clipboard.copyDirectoryCode`
  - `code-to-clipboard.copyDirectoryTree`
  - `code-to-clipboard.openRelatedFilesDepth1`
- **コンテキストへの登録**: 登録されたコマンドは `context.subscriptions` に `push` され、拡張機能の非アクティブ化時に適切に破棄されます。

### 3.2. すべてのタブからコードをコピー (`code-to-clipboard.copyCode`)

1. `vscode.window.tabGroups.all` を使用して、開いているすべてのタブグループを取得します。
2. 各タブグループ内のタブをループ処理します。
3. タブが `vscode.TabInputText` のインスタンスである（つまり、テキストファイルである）ことを確認します。
4. `tab.input.uri.fsPath` からファイルの絶対パスを取得し、`isTextFile` 関数でテキストファイルかどうかを再度検証します。
5. `fs.readFileSync` を使ってファイルの内容を同期的に読み込みます。
6. `vscode.workspace.asRelativePath` を使って、ワークスペースルートからの相対パスに変換します。
7. ファイルの内容を `### {相対パス}\n\n```\n{ファイル内容}\n```\n\n` の形式で文字列に追記します。
8. コピーしたファイル名を `copiedFiles` 配列に保存します。
9. 最後に、プロジェクト名、コピーしたファイル一覧、ファイル内容を結合して最終的なMarkdown文字列を生成します。
10. `vscode.env.clipboard.writeText` を使って、生成した文字列をクリップボードに書き込みます。
11. `vscode.window.showInformationMessage` でユーザーに完了を通知します。

### 3.3. 現在のタブからコードをコピー (`code-to-clipboard.copyCurrentTabCode`)

1. `vscode.window.activeTextEditor` を使って、現在アクティブなエディタを取得します。
2. エディタが存在する場合、`document` プロパティからドキュメントオブジェクトを取得します。
3. `document.uri.fsPath` からファイルパスを取得し、`isTextFile` で検証します。
4. `document.getText()` を使って、エディタの現在の内容（未保存の変更も含む）を取得します。
5. 以降の処理は `copyCode` コマンドと同様に、Markdown形式で文字列を生成し、クリップボードに書き込みます。

### 3.4. ディレクトリからコードをコピー (`code-to-clipboard.copyDirectoryCode`)

1. コマンドの引数として渡された `resource: vscode.Uri` （右クリックされたディレクトリのURI）を受け取ります。
2. `fs.lstatSync` を使って、リソースがディレクトリであることを確認します。
3. `generateDirectoryTree` 関数を `includeFileContents = true` で呼び出し、ディレクトリツリーとファイル内容を含む文字列を生成します。
4. 生成された文字列をクリップボードに書き込みます。

### 3.5. ディレクトリツリーをコピー (`code-to-clipboard.copyDirectoryTree`)

1. `copyDirectoryCode` と同様に、リソースがディレクトリであることを確認します。
2. `generateDirectoryTree` 関数を `includeFileContents = false` で呼び出し、ディレクトリツリーのみの文字列を生成します。
3. 生成された文字列をクリップボードに書き込みます。

### 3.6. 関連ファイルを開く (`code-to-clipboard.openRelatedFilesDepth1`)

1. `vscode.window.withProgress` を使用して、処理中にプログレスインジケーターを表示します。
2. `git ls-files` コマンドを実行して、Gitが追跡しているプロジェクト内の全ファイルリストを取得します。これにより、`.gitignore` を尊重したファイルリストが得られます。
3. 環境変数 `OPENAI_API_KEY` を確認し、設定されていない場合はエラーメッセージを表示します。
4. OpenAIのChat Completions API (`gpt-4o`) に送信するためのプロンプトを生成します。プロンプトには、プロジェクトの全ファイルリストと、起点となるファイル名を渡します。
5. `fetch` APIを使用してOpenAIにリクエストを送信します。
6. APIからのレスポンスを解析し、関連するファイルの相対パスリストを取得します。
7. 取得したパスが存在するファイルであることを `fs.existsSync` で確認します。
8. 存在するファイルパスを `vscode.workspace.openTextDocument` と `vscode.window.showTextDocument` を使ってエディタで開きます。

## 4. 補助関数

### 4.1. `generateDirectoryTree(dir, indent, includeFileContents)`

- **目的**: 再帰的にディレクトリを探索し、Markdown形式のツリーとファイル内容を生成します。
- **ファイルリストの取得**: `git -C "{dir}" ls-files` を実行して、指定されたディレクトリ以下のファイルをGitの追跡対象から取得します。これにより、`.gitignore` が自動的に適用されます。
- **除外設定の適用**: `vscode.workspace.getConfiguration('codeToClipboard').get('excludePatterns')` からユーザー設定の除外パターンを取得し、`minimatch` を使ってファイルリストをフィルタリングします。
- **ツリー構造の構築**: ファイルパスを `/` で分割し、再帰的にオブジェクトを構築することでメモリ上にファイルツリーを表現します。
- **出力の生成**:
  - `includeFileContents` が `true` の場合、ファイル内容を読み込み、`## File Contents` セクションに追加します。
  - 構築したファイルツリーを再帰的に処理し、Markdownのリスト形式で `## Directory Structure` セクションを生成します。
  - ヘッダー（プロジェクト名、セクションヘッダー）が重複しないように、`indent` が空文字列（つまり、再帰の初回呼び出し）の場合のみヘッダーを出力します。

### 4.2. `isTextFile(filePath)`

- **目的**: 指定されたファイルがテキストファイルである可能性が高いかどうかを判定します。
- **処理**:
    1. `.svg` ファイルはバイナリとして扱うため、常に `false` を返します。
    2. `fs.readFileSync` でファイルをバイナリバッファとして読み込みます。
    3. ファイルサイズが0の場合はテキストファイルと見なします。
    4. ファイルの先頭がUTF-8のBOM（`0xEF, 0xBB, 0xBF`）で始まっている場合はテキストファイルと見なします。
    5. バッファの先頭部分をチェックし、ヌル文字（`0x00`）や特定の制御文字が含まれている場合はバイナリファイルと見なします。
    6. 上記いずれにも該当しない場合、テキストファイルと見なします。
- **注意**: この判定は100%正確ではありませんが、一般的なケースでは十分に機能します。

## 5. 設定 (`package.json` の `contributes`セクション)

- **`codeToClipboard.excludePatterns`**:
  - **型**: `array`
  - **デフォルト値**: `["*.lock", "yarn.lock", "package-lock.json", "pnpm-lock.yaml", "composer.lock"]`
  - **説明**: `copyDirectoryCode` 実行時に除外するファイルのglobパターンを指定します。

## 6. テスト (`src/test/suite/extension.test.ts`)

Mochaを使用した単体・統合テストが実装されています。

- **`isTextFile`のテスト**: 様々な拡張子のファイル（`.txt`, `.png`, `.rs`, `.json`, `.svg`）を対象に、正しくテキスト/バイナリ判定が行われるかテストします。
- **`generateDirectoryTree`のテスト**: 関数が正しいヘッダーと構造を持つ出力を生成するかテストします。
- **コマンドのテスト**:
  - 実際にコマンド (`vscode.commands.executeCommand`) を実行し、クリップボードの内容 (`vscode.env.clipboard.readText`) を検証することで、各コピー機能が期待通りに動作するかテストします。
  - `copyDirectoryCode` のテストでは、設定 (`excludePatterns`) を動的に変更し、除外機能が正しく動作することも確認します。
- **`openRelatedFilesDepth1`のテスト**:
  - `fetch` APIをモック化し、OpenAI APIからの偽のレスポンスを返すように設定します。
  - コマンド実行後、期待されるファイルが実際にエディタで開かれたかを `vscode.window.visibleTextEditors` を通じて検証します。

```

### docs/Shift_JIS_doc.md

```
# SHIFT JIS �`���̓��{��h�L�������g

```

````

上記の通り，UTF-8のファイルは正確に内容がコピーされていますが，SHIFT-JISのファイルは文字化けしてしまっています。
これはファイル間で文字コードが異なる場合に，UTF-8に統一する処理が抜けているためです。

ファイルが1個のみ(現在のタブの内容をコピー)の場合は以下の通り文字化けしません。1種類だけだからだと思われます。

````md
# code-to-clipboard

## Copied Files

  - docs/Shift_JIS_doc.md

## File Contents

### docs/Shift_JIS_doc.md

```
# SHIFT JIS 形式の日本語ドキュメント

```


````
