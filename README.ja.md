# Bedrock Observer

<!-- addon:start -->
| | |
| --- | --- |
| **Add-On 名** | Bedrock Observer |
| **スラッグ** | `be-observer` |
| **名前空間** | `to3izo_bo:` |
| **最小 Minecraft バージョン** | 1.26.50 |
| **説明** | プレイヤーや周辺世界の情報を読み取り専用の構造化データとして提供し、デバッグやAIエージェントによるプレイを支援する。 |
<!-- addon:end -->

> English: [README.md](README.md)

Minecraft Bedrock Edition（統合版）の **Add-On を 1 つ**（Behavior Pack + Resource Pack + TypeScript スクリプト）
を、Codex や Claude Code などの AI エージェントと共同開発するための GitHub **テンプレートリポジトリ**です。
Add-On ごとにこのテンプレートから新しいリポジトリを作成します。上の表は `pnpm init:addon` が書き換えます。

## 概要

- **1 Add-On = 1 リポジトリ。** Behavior Pack 1 つ、Resource Pack 1 つ、スクリプトバンドル 1 つ、バージョン 1 つ。
- **Minecraft の標準ディレクトリ構造をそのまま維持。** `behavior_pack/` と `resource_pack/` は Minecraft が要求する構造そのもので、独自の抽象化は入れません。feature-based な設計を採用するのは TypeScript 側だけです。
- **ソースと生成物を明確に分離。** Minecraft が読むものはすべて `pnpm build` が `dist/` に生成します。`dist/` を直接編集することはありません。
- **エージェント向けルールは `AGENTS.md`**（ルート + 主要ディレクトリごと）に集約。UUID 不変、名前空間ポリシー、コミット前の検証などを明文化しています。
- **フレームワーク不使用。** Node.js 22.18 以上、pnpm、TypeScript、esbuild（バンドル）、fflate（zip）のみ。

## リポジトリ構成

```
/
├── AGENTS.md                 # エージェント/人間向けルール（ルート）
├── README.md · README.ja.md · CHANGELOG.md · LICENSE
├── addon.config.json         # Add-On の識別情報: name, slug, namespace, description, minEngineVersion
├── package.json · pnpm-lock.yaml · pnpm-workspace.yaml
├── tsconfig.json             # scripts/ の型チェック用（Minecraft ランタイム）
├── tsconfig.tools.json       # tools/ + tests/ の型チェック用（Node.js）
├── .editorconfig · .gitignore · .node-version
│
├── behavior_pack/            # Behavior Pack（ソース）          → dist/<slug>_BP/
│   ├── AGENTS.md
│   ├── manifest.json
│   └── pack_icon.png         # 必要に応じて blocks/ items/ entities/ recipes/ ... を追加
├── resource_pack/            # Resource Pack（ソース）          → dist/<slug>_RP/
│   ├── AGENTS.md
│   ├── manifest.json
│   └── pack_icon.png         # 必要に応じて textures/ models/ entity/ animations/ sounds/ texts/ ... を追加
├── scripts/                  # スクリプトモジュールの TypeScript → dist/<slug>_BP/scripts/main.js
│   ├── AGENTS.md
│   ├── main.ts
│   ├── features/             # ゲームプレイ機能ごとに 1 フォルダ
│   ├── core/                 # ランタイム基盤（Feature 契約、bootstrap）
│   └── shared/               # 定数（生成される名前空間）、型、純粋なユーティリティ
│
├── assets/                   # 制作用原本（.bbmodel, .psd, .wav, 参考資料）
├── media/                    # 広報素材: Marketplace, SNS, YouTube, プレス（Minecraft には含めない）
│   ├── AGENTS.md
│   ├── source/{screenshots,artwork,video,branding}/
│   ├── marketplace/ · social/{x,youtube,tiktok,instagram}/ · exports/
│
├── docs/                     # SPEC.md · ARCHITECTURE.md · CONTENT.md · TESTING.md · PROMPTS.md · ADDONS.md（開発済みアドオン一覧）
│   ├── adr/                  # 決定記録: なぜそう決めたか、日付つきの経過（日本語）
│   └── knowledge/            # 開発で得た知見（カリング、モデル、Marketplace、iOS での確認など）
├── tests/                    # unit/ · validation/ · fixtures/   (node --test)
├── tools/                    # build.ts · validate.ts · package.ts · deploy.ts · dev.ts · init-addon.ts ...
├── dist/                     # 生成物（git 無視）
└── .github/workflows/        # validate.yml · release.yml
```

## はじめかた

```bash
# 1. GitHub で「Use this template」からリポジトリを作成し、clone する
git clone <your-repo-url> my-addon
cd my-addon

# 2. インストール（Node.js >= 22.18、pnpm は corepack などで）
pnpm install

# 3. Add-On の識別情報を設定（対話形式。フラグ指定も可）
pnpm init:addon

# 4. 検証・ビルド・テスト
pnpm validate
pnpm build
pnpm test
```

`pnpm init:addon` は name / slug / namespace / description / 最小 Minecraft バージョン / author を受け取り、
`addon.config.json`、両 manifest（実 UUID の生成は **初回のみ**）、`scripts/shared/constants/addon.ts`、
`package.json`、README（英・日）の表、`LICENSE` の著作権者を更新します。非対話形式:

```bash
pnpm init:addon --name "Ruby Tools" --description "Adds ruby tools and armor." --min-engine-version 1.26.50 --yes
```

後から再実行しても安全です。名前・説明・バージョンは `addon.config.json` から書き直されますが、既存の UUID は再生成されません。

`description` は両 manifest と README.md に使われます。`README.ja.md` に日本語の説明を表示したい場合は、
`addon.config.json` に任意項目 `"descriptionJa"` を追加して（プロンプト・フラグはなく、ファイルを直接編集します）
`pnpm init:addon` を再実行してください。

## インストール要件

| 要件 | 補足 |
| --- | --- |
| Node.js 22.18 以上（推奨 24、`.node-version` 参照） | ツール群は Node の型除去機能で TypeScript を直接実行 |
| pnpm（`package.json` の `packageManager` で固定） | `corepack enable` またはグローバルインストール |
| Minecraft Bedrock Edition | 実機テスト用。`minEngineVersion` 以上 |
| VS Code + Minecraft Debugger / Bedrock 系拡張 | 任意・推奨（`.vscode/extensions.json`） |

## 開発

| コマンド | 内容 |
| --- | --- |
| `pnpm dev` | `scripts/`、`behavior_pack/`、`resource_pack/`、`addon.config.json` を監視して再ビルド |
| `pnpm dev --deploy` | 上記に加えて、ビルドごとに Minecraft の development フォルダへコピー |
| `pnpm deploy` | ビルドして `com.mojang/development_*_packs` へコピー（`--preview` で Minecraft Preview） |
| `pnpm version:set 1.2.0` | Add-On のバージョンを一致が必要な全箇所で更新 |

変更の流れ: `docs/SPEC.md`、`docs/CONTENT.md`、触る領域の `docs/adr/` を読む → パックに JSON を追加 / `scripts/features/<name>/` に機能を追加 →
`docs/CONTENT.md` と `docs/TESTING.md` に記録 → `pnpm validate && pnpm build && pnpm test` → deploy して実機確認 →
`CHANGELOG.md` → PR。

## 検証

```bash
pnpm validate            # ソースツリー全体のチェック
pnpm validate --dist     # dist/ のビルド済みパックをチェック（build が内部で実行）
pnpm validate --strict   # プレースホルダ UUID をエラー扱い（package が内部で実行）
```

検証内容: TypeScript 型チェック（scripts と tools）・両パックの厳密 JSON・manifest ルール（format_version 2、UUID の形式と重複、
`package.json` とのバージョン一致、BP⇄RP の相互依存、RP の `pack_scope: "world"`、script モジュールの entry、`@minecraft/*` の依存宣言と実際の import の一致）・
名前空間と識別子ルール・リソース参照整合性（テクスチャアトラス、クライアントエンティティの textures / geometry / animations /
render controllers、サウンド定義、アイテム icon、ブロック material_instances）・未参照テクスチャの警告。

## ビルド

`pnpm build` は次を順に行います。

1. `dist/` をクリーン
2. `behavior_pack/` → `dist/<slug>_BP/` へコピー（`AGENTS.md` などの文書ファイルは除外）
3. `resource_pack/` → `dist/<slug>_RP/` へコピー
4. `scripts/main.ts` を esbuild でバンドル → `dist/<slug>_BP/scripts/main.js`（ESM、`@minecraft/*` は external）
5. ビルド済みパックを検証（manifest、JSON、識別子、リソース参照）

`--sourcemap` を付けると Minecraft Debugger 用のインライン source map を埋め込みます。

### VS Code 拡張機能

`.vscode/extensions.json` で次の 2 つを推奨しています（VS Code でフォルダを開くとインストールを提案されます）。

| 拡張機能 | 用途 |
| --- | --- |
| Minecraft Bedrock Debugger（`mojang-studios.minecraft-debugger`） | `scripts/*.ts` にブレークポイントを置いてゲーム実行中にデバッグ |
| Blockception's Minecraft Bedrock Development（`BlockceptionLtd.blockceptionvscodeminecraftbedrockdevelopmentextension`） | パック JSON・`.lang`・`.mcfunction` の補完と診断 |

デバッグ手順: `pnpm dev --deploy --sourcemap` → VS Code の「実行とデバッグ」で
`Debug with Minecraft (listen)` を開始 → ゲーム内で `/script debugger connect`（チートを有効化）。
Bedrock Dedicated Server では `script debugger listen 19144` の後に `... (connect)` を使います。
`.vscode/launch.json` の `dist/<slug>_BP` は `pnpm init:addon` が書き換えます。
macOS には統合版のクライアントがないため、デバッガーは Windows 版または BDS と組み合わせて使います。
Blockception 拡張が `dist/` を二重に解析しないよう、`.mcignore` で除外しています。

## パッケージング

```bash
pnpm package
```

厳密検証とクリーンビルドの後、次を生成します。

```
dist/
├── <slug>_BP/
├── <slug>_RP/
├── <slug>_BP-<version>.mcpack   # Behavior Pack のみ
├── <slug>_RP-<version>.mcpack   # Resource Pack のみ
└── <slug>-<version>.mcaddon     # 両パック。配布するのはこれ
```

ファイル名には `package.json` のバージョンが入るので、端末で新しいビルドと同じ名前の古いコピーを取り違えることが
ありません。導入や配布に使うのは `<slug>-<version>.mcaddon` だけです。両パックがすでに入っています。2つの `.mcpack` はそれぞれ片方の
パックだけを入れたもので、片方だけを配りたい・入れ直したいときのためのものです。`.mcaddon` と一緒に開くと、
同じパックを二重に読み込むことになります。

テンプレートのプレースホルダ UUID が残っている間は拒否されます（`pnpm init:addon` を実行してください）。

## Minecraft への導入方法

**開発中（Windows）:** `pnpm deploy` がビルド済みパックを
`%APPDATA%\Minecraft Bedrock\users\shared\games\com.mojang\development_behavior_packs\<slug>_BP` と
`...\development_resource_packs\<slug>_RP` にコピーします（Minecraft Preview は `pnpm deploy --preview`。旧 Microsoft Store/UWP 版の
パスも検出）。その他の OS や Bedrock Dedicated Server では `MINECRAFT_COM_MOJANG=/path/to/com.mojang` を設定してください。
ワールドを作成または開き、Behavior Pack を有効化すると（Resource Pack は依存関係で自動追加）、スクリプトのみの変更は `/reload` で反映できます。

**プレイヤー / 全プラットフォーム:** `dist/<slug>-<version>.mcaddon` を開く（ダブルクリック、モバイルでは Minecraft に共有）と両パックが
インポートされます。ワールド設定で Behavior Pack を有効化してください。

ゲーム内の「設定 → クリエイター → コンテンツログ」を有効にするとパックのエラーを確認できます。

## AI エージェントのワークフロー

このリポジトリは AI エージェントが主体で作業する前提で設計されています。

1. エージェントはルートの `AGENTS.md` と、触るディレクトリの `AGENTS.md`、`docs/SPEC.md`、`docs/CONTENT.md`、触る領域の `docs/adr/`（なぜそう決めたか）を読む。
2. 書こうとする JSON 形式については、現行の公式 Bedrock ドキュメントを参照する（形式はバージョン間で変わる）。
   バニラの数値・形式は、記憶で書かず、Mojang の公式サンプル `bedrock-samples`（ローカルのクローン）、Minecraft Wiki、
   Bedrock Wiki で調べる（`AGENTS.md` の "Reference sources"、`docs/knowledge/vanilla-reference/`）。
3. ソースファイルだけを変更し、新しいコンテンツを `docs/CONTENT.md`、テストを `docs/TESTING.md` に記録し、
   `pnpm validate && pnpm build && pnpm test` を実行する。
4. 何を変更し、何を検証し、何が実機確認待ちかを報告する。

エージェントの禁止事項（可能な範囲で `pnpm validate` が強制）: 既存 UUID の変更、`dist/` の編集、`behavior_pack/` へのスクリプト配置、
パックへのメディア素材の混入、明示的な指示なしの namespace / version / `format_version` の変更。

## ディレクトリの責務

| ディレクトリ | 内容 | 配布される? |
| --- | --- | --- |
| `behavior_pack/` | Behavior Pack ソース（Minecraft 標準構造） | はい（`dist/` 経由） |
| `resource_pack/` | Resource Pack ソース: 書き出し済みの実データ（Minecraft 標準構造） | はい（`dist/` 経由） |
| `scripts/` | TypeScript ソース。ビルド時に Behavior Pack へコンパイル | コンパイル結果のみ |
| `assets/` | パックの素材を作るための原本（Blockbench、PSD、音声プロジェクト、参考資料） | いいえ |
| `media/` | Marketplace / SNS / YouTube / プレス用素材 | いいえ |
| `docs/` | 仕様、アーキテクチャ、コンテンツ台帳、テスト計画、決定記録（`docs/adr/`）、ナレッジ | いいえ |
| `tests/` | ユニット・検証テスト、フィクスチャ | いいえ |
| `tools/` | build / validate / package / deploy / init | いいえ |
| `dist/` | 生成されたパックとアーカイブ | これが配布物 |

一言でいうと: `assets/` = 作り方 ・ `resource_pack/` = Minecraft が読むもの ・ `media/` = 宣伝 ・ `dist/` = 配布物。

## UUID に関する注意

各パックにはヘッダ UUID とモジュールごとの UUID があり、Behavior Pack は `dependencies` で Resource Pack のヘッダ UUID を参照します。
Minecraft はこの値でパックを識別するため、**初回リリース後は絶対に変更してはいけません**。UUID が変わると別のパック扱いになり、
既存ワールドから外れ、アップデートが壊れます。テンプレートにはプレースホルダ UUID（`00000000-0000-4000-8000-0000000000xx`）が入っており、
`pnpm init:addon` が一度だけランダムな v4 UUID に置き換え、以後は触りません。`pnpm validate` はプレースホルダが残っていると警告し、
`pnpm package` は出荷を拒否します。エージェントによる UUID 編集は `AGENTS.md` で禁止しています。

## メディア / Marketplace 素材

広報素材は `media/` に置き、パックには決してコピーしません。`media/source/` に編集可能な原本（スクリーンショット、アートワーク、
動画プロジェクト、ブランディング）、`media/marketplace/` に Marketplace 提出用の書き出し（キーアート、パノラマ、スクリーンショット、
アイコン、トレーラー）、`media/social/<platform>/` に各プラットフォーム向けの投稿画像・サムネイル、`media/exports/` にその他を置きます。
Marketplace 提出素材のサイズ・形式は提出時点の Minecraft Creator Portal の要件に従います。詳細は `media/AGENTS.md`。

## リリース手順

1. `docs/CONTENT.md`、`docs/TESTING.md`、`CHANGELOG.md` を更新し、実機でのリリースチェックリストを実施。
2. `pnpm version:set <major.minor.patch>` を実行し、CHANGELOG の *Unreleased* を新バージョンの見出しへ移動。
3. コミットしてタグを push: `git tag v<major.minor.patch> && git push --tags`（または同じタグで GitHub Release を作成）。
4. `release.yml` が validate → build → package を実行し、アーカイブを workflow artifact としてアップロードし、
   `<slug>-<version>.mcaddon` と両 `.mcpack` を GitHub Release に添付します。タグが `package.json` と一致しないと失敗します。

`validate.yml` は `main` への push と全 Pull Request で `pnpm validate`、`pnpm build`、`pnpm test` を実行します。

## ライセンス

MIT — `LICENSE` を参照（著作権者は `pnpm init:addon --author` で記入されます）。
