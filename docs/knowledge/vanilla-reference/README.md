# バニラの仕様・形式の調べ方

バニラの数値・挙動・JSON の形式は、記憶で書かずに、**調べてから**書きます。調べる先は次のとおりで、何を調べるかで使い分けます。

| 知りたいこと | 調べる先 | 注意 |
| --- | --- | --- |
| JSON の形式、項目、名前、サウンドのイベント名、粒子の定義、翻訳キー | `bedrock-samples` のクローン（下） | 本体の処理は載っていない |
| バニラのブロック・アイテムの数値と挙動（硬度、爆発耐性、発光、ドロップ、仕様の履歴） | **Minecraft Wiki**（日本語版 `ja.minecraft.wiki`、英語版 `minecraft.wiki`） | Java 版と統合版が書き分けられていない箇所がある。更新で古くなることがある |
| アドオンの機能が、いつ追加され、実験的機能かどうか（形式のバージョンごとの履歴） | **Bedrock Wiki**（`wiki.bedrock.dev`）。特に `blocks/block-format-history` | 例が足りないページがある（たとえば `placement_direction` の回転の値の例はなかった） |
| 公式のガイドライン（協調型アドオン、Marketplace の要件） | Microsoft Learn の原文 | AI の支援で書かれたページは古いことがある |
| ベータ API の中身 | npm のベータ版の型定義（下） | ベータ API は実験的機能 |
| 最終的な正解 | 実機（Windows の VM、iOS） | 上のどれとも食い違ったら、実機を信じ、食い違いを記録する |

Microsoft Learn のページには AI の支援で書かれたものがあり、内容が古い場合があります（古い format_version、項目の抜けなど）。現行リリースの正しい形式は、Mojang の **`bedrock-samples`** で確認します。

## Minecraft Wiki と Bedrock Wiki（公式資料ではないが、よく役立つ）

- **Minecraft Wiki** で、バニラの数値と挙動を確認する。例（日本語版のエンダーチェストのページ、2026-10-12 に確認）: 爆発耐性 600、硬度 22.5、明るさ 7。シルクタッチならチェスト本体、それ以外は「道具の種類に関わらず」黒曜石 8 個（Java 版は 1.21.4 より前、ツルハシ以外では何も落とさなかった）。
  - 記憶の中の古い挙動で実装しないこと。以前に別のアドオンで、古い Java 版の挙動の記憶で「ツルハシ以外ではドロップなし」にしてしまい、Wiki で確認して直したことがある。
  - ページが長い（エンダーチェストのページは約 24 万文字）ので、取得するときは `offset` で続きを読む。版（Java / 統合版）の書き分けを確認する。書いていない項目は「不明」として扱い、実機で確かめる。
- **Bedrock Wiki** で、機能の履歴を確認する。`blocks/block-format-history` は、`block_entity` が 1.26.30 で追加され 1.26.50 で正式化されたこと、`container` が 1.26.50 でもまだ実験的機能であることを、形式のバージョンごとに書いていた。**「実験的機能に当たらないか」を判断するときは、まずここを見る。**

## bedrock-samples をクローンして使う

- 取得は、このリポジトリと同じ階層に `git clone https://github.com/Mojang/bedrock-samples`（この環境では `~/git/to3izo/minecraft/bedrock-samples`）。GitHub の API で 1 ファイルずつ取るより、クローンのほうが、検索（`grep`）と一覧（`git ls-files`）が速い。
- **使う前に版を確認する**: `git log -1` と `version.json`（`latest` が最新のリリース）。古ければ `git pull`。ブランチ `main` が最新のリリース、`preview` がプレビュー版（確認済み）。
- 探し方の例:
  - `git ls-files | grep -i <名前>`: アセットを探す。
  - `grep -rIl "<識別子>" . --exclude-dir=.git`: その名前を使っている定義を、横断して探す（粒子 → アニメーション → エンティティ、サウンドのイベント名 → `sounds.json` など）。
  - `resource_pack/texts/en_US.lang` と `ja_JP.lang`: バニラの翻訳キー（`container.enderchest`、`itemGroup.name.chest` など）と正式名称。
  - `resource_pack/sounds.json` と `sound_definitions.json`: サウンドのイベント名、音量、ピッチ（`random.enderchestopen` など）。
  - `resource_pack/particles/*.json`、`textures/particle/particles.png`: 粒子の定義と、アトラスの画像の位置。
  - `resource_pack/textures/blocks/*_mers.tga`: PBR の MERS マップ（R=金属、G=発光、B=粗さ）。エンダーチェストの G は全面 0（光らない）で、見た目の光る目は、ブロックの発光（明るさ 7）だけだった。
  - `metadata/json_schemas/server/block/<版>/*.json`（エンティティ、クライアントの粒子なども同様）: 項目の一覧、型、範囲。
- **載っていないもの**（ゲーム本体のソースではない）:
  - 粒子を「いつ・どこに・いくつ出すか」: `end_chest.json` は粒子 1 個の動きと見た目だけで、出す頻度は本体の処理。
  - エンダーチェストのブロックモデルとワールド上のテクスチャ: 公開されているのは、インベントリ用の 16×16 の面だけだった。
  - コンテナ画面のタイトル: UI の JSON は `$container_title` という変数を使うだけで、値は本体が決める（実機で、プロキシの `nameTag` に翻訳キーを入れるとタイトルになると分かった）。
- **スキーマがある ≠ 実験的機能ではない**: `server/block/1.26.20/container.json`（`block_entity.container`）のスキーマがサンプルにあったが、`container` は 1.26.50 でも実験的機能だった。フォルダの版と、機能が追加・正式化された版は、一致するとは限らない。実験的機能かどうかは、Bedrock Wiki の履歴か実機で確かめる。
- **Mojang のファイルは、パックにコピーしない**（再配布や色替えにあたる）。参照用に読むだけにして、名前（テクスチャのキー、サウンドのイベント名、粒子のアトラスのパス）で参照する。`AGENTS.md` の Marketplace policy と Reference sources 参照。

## ベータ版の型定義を見る

- 安定版の `@minecraft/server` に入っていない API（実験的機能の「ベータ API」）が何かを知りたいときは、npm のベータ版を取得して、型定義を読む（実験的機能なので、このアドオンでは使わない。何があるかを知り、「使える」と思い込まないための調査）。
  - `npm view @minecraft/server versions --json` で版を探し、`npm pack @minecraft/server@<ベータ版>` で取得して展開し、`package/index.d.ts` の `@beta` の付いた宣言を読む。
  - 例: 1.26.60 のプレビュー（`2.12.0-beta.1.26.60-preview.30`）には、ブロックの固さを調べる `isSolid`、ブロックの中にエンティティを保存する `BlockEntityStorageComponent`、隣の変化の `onNeighborChanged` があった。コンテナ画面を開く API や、複数のブロックで 1 つの入れ物を共有する仕組みはなかった（`docs/adr/0002-one-active-chest.md`）。

## bedrock-samples の主な場所（公式資料）

- https://github.com/Mojang/bedrock-samples — `main` が最新のリリースです（`version.json` にバージョンがある）。
- 役立つ場所:
  - `behavior_pack/recipes/*.json` — 現行のレシピの形式（石切台、`unlock` など）。
  - `behavior_pack/blocks/*.block.json` — データ駆動になっている一部のバニラブロック。現行のブロックの `format_version` や、`minecraft:itemGroup.name.slab` のような `menu_category` のグループ名が分かる。
  - `resource_pack/textures/terrain_texture.json` — バニラの地形テクスチャのキー（`glass`、`red_stained_glass`、`glass_pane_top` など）とファイルの場所。
  - `resource_pack/texts/en_US.lang`、`ja_JP.lang` — バニラの正確な名前とグループ名（`itemGroup.name.glass` など）。
  - `metadata/json_schemas/` — format version ごとの JSON スキーマ（ブロック、カリングルール、クリエイティブのカタログなど）。どの項目が存在するかを最も正確に示している。
- `scripts/fetch-bedrock-samples.sh` を使うと、上の場所だけを取得できます（リポジトリ全体ではなく数 MB）。

## インストールされている Script API の型定義

- `node_modules/@minecraft/server/index.d.ts` が、宣言しているバージョンの API の正解です。たとえば、カスタムコンポーネントでどのイベントが使えるか（`onPlace`、`onBreak`、`onPlayerBreak` など）はここで分かります。

## 補助スクリプト

| スクリプト | 用途 |
| --- | --- |
| `scripts/fetch-bedrock-samples.sh <ディレクトリ>` | 上の場所だけを取得する |
| `scripts/png-alpha-dump.py <ファイル.png>…` | 16×16 のテクスチャの透明度を1ピクセルずつ表示する（`..` は完全に透明）。枠や光の筋の位置を確認できる |
| `scripts/count-block-permutations.mjs [behavior_pack]` | ブロックのパーミュテーションの合計を出す（Marketplace の上限は `AGENTS.md` の Marketplace policy 参照） |
