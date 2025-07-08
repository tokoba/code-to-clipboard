# ドメイン駆動に近いパッケージ構成にリファクタリングする

エントリファイル（例：src/extension.ts）は extension.ts のままとする。
各ファイルはエントリファイルからインポートして利用する形にする。

以下の階層構造にファイルを機能別に細分化することで疎結合とする。
機能ごとに「UI，ドメイン，インフラ」の責務を分割し，機能ごとに完結させる。
将来的に機能単位で分割配布（別拡張への抽出等）を考慮したディレクトリー構成とする。

ただし，通信機能(providers)やクリップボードへのアクセスなど全体的に使用する可能性のある機能は共通ユーティリティとして `features/utils/` 配下に配置する。

```text
src/
├── extension.ts
└── features/
    ├── utils/
    │   ├── clipboard.ts
    │   └── prividers/
    │       ├── openai_compatible.ts
    │       └── openai.ts
    ├── codeCopy/
    │   ├── commands.ts
    │   └── encoder.ts
    ├── directoryCopy/
    │   ├── commands.ts
    │   ├── tree.ts
    │   └── encoder.ts
    ├── filenameCopy/
    │   ├── commands.ts
    │   ├── tree.ts
    │   └── encoder.ts
    └── relatedFiles/
        ├── commands.ts
        ├── git.ts
```
