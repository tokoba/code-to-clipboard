# 「code-to-clipboard」を世界水準へ ─ DDD ベース構成ガイド

## 目標

1. 機能単位で疎結合化し、機能追加・抽出を低コスト化  
2. presentation / application / domain / infrastructure の責務分離  
3. ドメイン層は VS Code 依存ゼロで Node 単体テスト可能  
4. 依存関係逆転を徹底し、上位レイヤは下位詳細に依存しない  

## レイヤ定義

| レイヤ | 役割 | VS Code 依存 | 置き場 |
|-------|------|-------------|--------|
| presentation | Command・Webview 等 UI | あり | `presentation/` |
| application  | ユースケース調整 | 最小 | `application/` |
| domain       | ビジネスロジック | なし | `domain/` |
| infrastructure| 外部 IO (VS Code・Git・OpenAI) | あり | `infrastructure/` |

## トップレベル構成

```text
src/
├── extension.ts
├── core/                 # 共通横断モジュール
│   ├── di/               # DI 設定 (inversify 等)
│   ├── domain/           # 共通 ValueObject
│   ├── infrastructure/   # 共通 Adapter (VsCodeClipboard 等)
│   └── utils/            # 汎用ヘルパ
└── features/             # 機能ごとに完全分離
    ├── codeCopy/
    │   ├── presentation/commands.ts
    │   ├── application/CopyAllOpenTabsUseCase.ts
    │   ├── domain/{CodeSnippet,CodeFile}.ts
    │   └── infrastructure/VsCodeClipboard.ts
    ├── directoryCopy/
    │   ├── presentation/commands.ts
    │   ├── application/CopyDirectoryTreeUseCase.ts
    │   ├── domain/DirectoryGraph.ts
    │   └── infrastructure/FsNodeRepository.ts
    ├── filenameCopy/
    │   ├── presentation/commands.ts
    │   ├── application/CopyOpenTabFileNamesUseCase.ts
    │   ├── domain/FileNameList.ts
    │   └── infrastructure/VsCodeTabRepository.ts
    └── relatedFiles/
        ├── presentation/commands.ts
        ├── application/OpenRelatedFilesUseCase.ts
        ├── domain/RelatedFileFinder.ts
        └── infrastructure/GitFileLocator.ts
```

## 実装ロードマップ

1. **core モジュール整備** – 共通 Adapter を `core/infrastructure` へ、DI を `core/di` へ配置  
2. **既存処理の分割** – `extension.ts` からロジックを各 UseCase へ移動  
3. **型境界の厳格化** – Domain 層で VS Code 型参照を禁止 (ESLint ルール導入)  
4. **ビルド & テスト** – `tsconfig paths` に `@core/*`, `@codeCopy/*` 等を設定し、  
   Domain/Application を Node 単体テスト (Mocha/Jest)、Presentation を VS Code Test で結合試験  
5. **CI/CD** – GitHub Actions で `pnpm test` → `vsce package` → `vsce publish` を自動化  

## 命名規約

* コマンド ID: `feature.action` (`codeCopy.copyAll`)  
* UseCase: 動詞 + 名詞 + `UseCase` (`CopyDirectoryTreeUseCase`)  
* Adapter: `Repository`, `Client`, `Gateway`, `Service` 接尾辞  

## 拡張余地

* Webview UI は `presentation/panels/` に追加  
* CLI 版は別 Presentation を追加し既存層を再利用  
* AI プロバイダー差し替えは Infrastructure の Strategy で対応  

---

> **最初のステップ**: `core` と `features/*/presentation` ディレクトリーを作成し、既存ロジックを UseCase へ段階的に移行してください。
