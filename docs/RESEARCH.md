# RESEARCH — 既存 OSS と公式 API の調査メモ

Bedrock Observer の設計の前提にした調査の記録です（調査日 2026-10-18）。外部の事実には、調べた日と出どころを付けます。決定とその理由は `docs/adr/`、仕様は `docs/SPEC.md`・`docs/PROTOCOL.md` に書きます。

表記:
- **[README]**: README などの文書に書かれている主張（ソースで確かめていない）。
- **[src]**: ソースで確かめた事実（`path:line` は下表のコミット時点）。
- **[公式]**: Microsoft Learn・npm の公式パッケージ・インストール済みの型定義・BDS 同梱の文書。
- **[実機]**: このリポジトリの開発環境（Windows 11 VM）で確かめたもの。
- **未確認**: まだ確かめていないもの。確かめ方を添える。

---

## 1. 既存 OSS

### 1.1 対象

| # | リポジトリ（2026-10-18 時点の正式名） | 参照コミット | ライセンス |
| --- | --- | --- | --- |
| A | https://github.com/chapmanjw/minecraft-bedrock-mcp-behavior-pack | `3a01704f758611b44efeaf3f1c6e910e6479f03c`（2026-07-15） | MIT（Copyright (c) 2026 John Chapman） |
| B | https://github.com/chapmanjw/minecraft-bedrock-mcp-server | `222b5b77debc211c74ff56d8be5358d90e73c481`（2026-08-08） | MIT（同上） |
| C | https://github.com/Mming-Lab/minecraft-bedrock-education-mcp（**改名済み**。旧名 `Mming-Lab/minecraft-bedrock-mcp-server` はここへリダイレクトされる） | `00711f55156a29fc1f08e2988da76d4581a776aa`（2026-10-04） | MIT（Copyright (c) 2026 mcbk-mcp contributors） |

- 調べ方: `gh api` で改名の有無を確認し、`git clone --depth 1` で取得してファイルを読んだだけ。インストール・ビルド・実行はしていない。
- A と B は同じ作者の一対（BP と MCP サーバー）。C は v2 で全面的に書き直され、旧版は `legacy/v1.0.0` タグにある（[README]）。
- **コードは流用しない。** 設計の考え方だけを参考にする。流用する場合は MIT の全文と著作権表示を残す必要がある（その時点で ADR に記録する）。

### 1.2 A+B（chapmanjw 構成）

| 観点 | 内容 |
| --- | --- |
| 責務 | MCP クライアント ⇄（HTTP＋bearer）⇄ MCP サーバー ⇄（HTTP long-poll＋bearer）⇄ BP ⇄ ワールド（[README]）。BP は `GET /bridge/poll` で取った命令を `kind` ごとに実行し、`POST /bridge/result` で返す（[src] `A:src/transport/http-transport.ts:25-36`）。書き込み系（`mc_block_set`・`fill`・ゲームモード変更・kick など）と、任意コマンドの実行（`runCommand`、`A:src/dispatcher/handlers/command-handlers.ts:13-29`）を含む |
| 使う API | `@minecraft/server` 2.6.0 ＋ `@minecraft/server-net` 1.0.0-beta ＋ `@minecraft/server-admin` 1.0.0-beta（[src] `A:manifest.json:20-22`） |
| 観測 | プレイヤー一覧は `world.getAllPlayers()`（`player-handlers.ts:52-61`）。ブロックは `dimension.getBlock` を try/catch で包み、未ロードは `NOT_FOUND`（"unloaded chunk?"）に丸める（`block-handlers.ts:64-95`）。範囲取得は `system.runJob` で、1 ページ 1024 件、1 回の走査上限 16,384、カーソルで続きを取る（同 :18-23, :127-162）。エンティティの件数上限は BP 側にない（`entity-handlers.ts:44-47`） |
| 対応付け | 命令 ID は `cmd_<ULID>`。応答は `{id, status:"ok", result}` / `{id, status:"error", error:{code,message,details?}}`（`A:src/protocol/command.ts:14-25`、`result.ts:8-40`） |
| エラー | BP 側は 5 種のコード（`INVALID_INPUT`・`BEHAVIOR_PACK_ERROR`・`NOT_FOUND`・`UNSUPPORTED_CAPABILITY`・`INTERNAL`）。Script API の例外名をコードに対応づける表がある（`A:src/dispatcher/error-mapping.ts:25-57`）。サーバー側のコードは「改名しない・追加のみ」の安定契約（`B:src/errors/error-codes.ts:1-35`） |
| バージョン・能力 | プロトコルは semver `1.0.0`、メジャーが一致すれば互換。ハンドシェイクで拒否すると 409（`A:src/protocol/protocol-version.ts:10-30`、`handshake.ts:20-71`）。機能の有無を実行時に調べ、なければ `UNSUPPORTED_CAPABILITY`（`A:src/capabilities/capability-probe.ts:34-62`）。モジュールの版は実行時に取れないので、ビルド時に manifest から生成（`A:src/generated/module-versions.ts`） |
| 診断 | `GET /healthz`（**認証なし**）が接続状態・キューの深さを返す（`B:src/http/health-route.ts:10-19`）。tick の差分から TPS を出す（`A:.../server-handlers.ts:35-48`）。再接続はフルジッター付き指数バックオフ 250ms〜5s（`A:src/runtime/backoff.ts:26-44`） |
| 上限 | kind 別 20/s・burst 40、未処理の命令 256、`/mcp` 60 rpm/トークン、1 回の poll で 32 件、poll 保持 30s、命令のタイムアウト 15s、命令は直列実行（`B:src/index.ts:19`、`B:src/config/environment.ts:29-45`、`A:src/command-pump.ts`） |
| 前提 | BDS 専用、**Beta APIs の実験的機能が必須**、`allow-cheats=true`、Ubuntu を想定（[README]） |
| 通信 | BP → サーバーへの外向き HTTP。サーバーの既定の待受は **`0.0.0.0:8765`**（`B:src/config/environment.ts:11,13`）。トークンは SHA-256 後に定数時間比較（`B:src/http/authentication.ts:17-44`）。BP 側のトークンは `SecretString` のまま `Authorization` ヘッダーへ渡し、スクリプトから値を読めない（`A:src/config/config.ts:61-67`）。BP は起動時に world の dynamic property へ world_id を書き込む（`A:src/world-identity.ts:29-37`） |

### 1.3 C（Mming-Lab、Education 向け）

| 観点 | 内容 |
| --- | --- |
| 責務 | Education Edition 1.26 以降向けの建築用 MCP サーバー（stdio）。ゲームが `/connect localhost:19131` で WebSocket サーバーへ接続し、読み取りは同梱のアドオンが担う（[README]）。書き込み系（`build.*`）、任意コマンド、`/tickingarea` の発行（`src/tools/area.ts:87,117`）を含む |
| 使う API | `@minecraft/server` **2.1.0 だけ**、ベータなし（[src] `addon/manifest.json:31-36`）。Education では 2.1.0 以外が動かなかったとのコメント（`addon/scripts/main.js:23-27`） |
| 入出力 | 要求は `/scriptevent mcp:<action> <id> <json>` を `system.afterEvents.scriptEventReceive` で受ける（`main.js:233-252`）。応答は `runCommand('tell @s …')` でチャットに出し、WebSocket の PlayerMessage として受け取る（`main.js:63-76`）。**プレイヤーが 1 人もいないと応答できない** |
| 観測 | `ping`（版・tick・人数）、`getblock`（`typeId` と `permutation.getAllStates()`）、`readregion`、`entities`、`container`（`main.js:82-231`）。**未ロードを空気と区別して `chunk not loaded` を返す**（`main.js:93-105`） |
| 対応付け | ID（小文字英数字 1〜12 文字）を JSON より前に置くので、JSON が壊れていても ID 付きで返せる（`main.js:238-241`、`src/bridge/protocol.ts:67-74`）。応答は `MCPB|<id>|<json>`、分割時は `parts`/`total` のヘッダー行と `<id>.<n>` の行（`main.js:149-160`）。欠けたら 1 行の量を半分にして再試行（`src/tools/world.ts:340-365`） |
| エラー・版 | エラーは自由文字列だけで、コード体系なし（`main.js:78-80`）。プロトコルの版も能力の交渉もなく、アドオンの版の文字列を比べるだけ |
| 診断 | `world.bridge_status` は失敗しない設計で、接続の有無・版・人数・tick・対処の助言を返す（`src/tools/world.ts:113-171`）。接続できない原因（ポート、`/connect` 未実行、暗号化設定）を名指しする（`src/bridge/transport.ts:166-214`） |
| 上限 | チャット 1 行 460 文字（実測で 481 は届き、487 は行ごと消えた、`src/bridge/protocol.ts:17-20,44`。**Education のチャット経路での値**）、範囲 4096 ブロック、entities は半径 1〜64・件数 1〜100 |
| 前提 | Education を同じ PC で動かす。Windows では `CheckNetIsolation LoopbackExempt` が必要（[README]） |
| 通信 | ゲーム → WebSocket サーバー（既定 19131）。`host` を省くと全インターフェースで待受、**認証なし**、最初に接続したワールドを使う（`src/bridge/transport.ts:42-135`） |

### 1.4 取り入れる考え方 / 取り入れないもの

| 取り入れる（考え方のみ） | 出典 | このリポジトリでの形 |
| --- | --- | --- |
| 解析に失敗しても要求 ID を返す | C | JSON の中の `requestId` を、解析に失敗したときも生の文字列から拾って返す（`PROTOCOL.md` §2）。要求の形は `requestId`/`method`/`params` の JSON のまま |
| 応答の封筒の統一と、安定したエラーコード（追加のみ・改名しない） | A/B | `ok` ＋ `data` / `error:{code,message,details?}`、コード表（`PROTOCOL.md` §6） |
| Script API の例外 → コード / 状態への対応表 | A | `LocationInUnloadedChunkError` → `unloaded` など（Phase 2 で実装） |
| 未ロードと空気の区別 | C | `status: "unloaded"`（エラーではなく項目ごとの状態） |
| 件数・半径・範囲の上限 | A/C | `capabilities.limits`（値は実機で決める） |
| 失敗しない診断（版・tick・人数・対応機能） | C/A | `capabilities`（`session` で再読み込みを検出） |
| プロトコルの版と能力の通知 | A | 整数の `protocol` と `capabilities.methods`/`sections` |
| 外向き接続、`SecretString`、バックオフ、liveness、期限切れ要求の破棄 | A/B | Phase 3 のアダプターを作る場合だけ参考にする |

| 取り入れない | 出典 | 理由 |
| --- | --- | --- |
| 任意コマンドの実行、ブロック・インベントリ・ゲームモードの書き換え | A/C | 読み取り専用の原則に反する |
| `/tickingarea` の発行（未ロード領域のロード） | C | ワールドを変える。Marketplace の方針でも禁止 |
| world の dynamic property への書き込み | A | 観測のためにワールドを変える |
| Beta API と Beta APIs 実験の必須化 | A | ADR-0001。観測コアには入れない |
| チャット（`tell`）を応答経路にする | C | プレイヤーの画面に出る。プレイヤーがいないと返せない |
| 認証なし・全インターフェースでの待受、認証なしの health | B/C | 将来のアダプターでも、受信側は限定した待受とトークン必須にする |
| エンティティ件数の上限なし、同期の三重ループの範囲走査 | A/C | 処理量と出力量が無制限になる |
| 分割・再送のプロトコル | C | 初版では作らず、上限で小さく保つ（ユーザーの方針） |

---

## 2. 公式 API と対象バージョン

出典の略記: **S** = インストール済みの `node_modules/@minecraft/server/index.d.ts`（2.10.0、`@beta` は 0 件。行番号は S:行）、**SB** = `@minecraft/server@2.11.0-beta.1.26.52-stable` の型定義、**N** = `@minecraft/server-net@1.0.0-beta.1.26.52-stable`、**A** = `@minecraft/server-admin@1.0.0-beta.1.26.52-stable`（いずれも `npm pack` で取得して読んだだけ）。npm の情報は 2026-10-18 に `npm view` で取得。

### 2.1 バージョンの対応

| 項目 | 値 | 出どころ |
| --- | --- | --- |
| 実機のクライアント | `Microsoft.MinecraftUWP` 1.26.5203.0（= 1.26.52.3。実行ファイルは `Minecraft.Windows.exe`、データは `%APPDATA%\Minecraft Bedrock`） | [実機] `Get-AppxPackage` |
| 実機の BDS | `C:\MinecraftServer\bedrock_server.exe` FileVersion 1.26.52.3 | [実機] |
| `@minecraft/server` 2.10.0 | 1.26.50 の安定リリース（npm 公開 2026-09-15、同時刻に `2.11.0-beta.1.26.50-stable`）。2026-10-18 時点の `latest` も 2.10.0 | [公式] npm、`bedrock-samples` の `version.json`（latest 1.26.50.4）と `metadata` の `server_2.10.0.json` |
| 1.26.5x 向けのベータ | `2.11.0-beta.1.26.50/51/52-stable`（使わない） | [公式] npm |
| 次の版 | `rc` 2.12.0-rc.1.26.70-preview.20、`beta` 2.13.0-beta.1.26.70-preview.20。1.26.60 の stable 版はまだない | [公式] npm dist-tags |
| 互換性 | 安定版はマイナー間で後方互換（Learn Versioning の "Stable track"）。min_engine_version 1.26.50 ＋ 2.10.0 で、1.26.52 のクライアントと BDS に合う | [公式] https://learn.microsoft.com/en-us/minecraft/creator/documents/scripting/versioning |

- 「26.52」という表示は、パッケージ版 1.26.52.x のこと（タイトル画面の表示。既存のナレッジ `device-testing-windows-vm/` と一致）。
- **minEngineVersion（1.26.50）は変更不要。**

### 2.2 機能ごとの互換性

「安定」は 2.10.0 の型定義に `@beta` がないこと。通常ワールドと BDS の違いは、型定義にも Learn にも書かれていない（server-net/admin を除く）。**どれも実機ではまだ動かしていない**（Phase 1・2 で確認する）。

| 機能 | 使用 API（S:行） | 2.10.0 | 安定/ベータ | 通常 / BDS | 必要な設定・権限 | 注意点 | 判断 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 要求の受信（scriptevent） | `system.afterEvents.scriptEventReceive`（S:21720）、`ScriptEventCommandMessageAfterEvent`（S:20453: id/message/sourceType/sourceEntity/sourceBlock/initiator）、`subscribe(cb, {namespaces})`（S:26075）、`ScriptEventSource`（S:2717）、`system.sendScriptEvent`（S:21685） | ○ | 安定 | ○ / ○ | Learn: **チートが必要**、権限レベル Game Directors、message は **2048 文字まで** | BDS のコンソールからは `sourceType: Server`（S:2737-2744）。id には名前空間を付ける（`NamespaceNameError` S:2449-2461） | **v1 採用** |
| 要求の受信（カスタムコマンド） | `system.beforeEvents.startup`（S:21743）→ `customCommandRegistry.registerCommand`（S:7402）、`CustomCommand.cheatsRequired`（S:24179、既定 true）、`permissionLevel: CommandPermissionLevel`（S:245） | ○ | 安定 | ○ / ○ | `cheatsRequired: false` にすると **チートなしで使える** | コールバックは restricted-execution（読み取りは `system.run` で後回しにする）。登録は startup の中だけ。JSON を 1 つの文字列引数として渡せるか（引用符・空白）は未確認 | **保留**（Phase 2 で実機確認してから決める。承認事項） |
| 出力 | `console.log/info/warn/error` | ○ | — | クライアント: コンテンツログ / BDS: 公式の記述なし | クライアントでコンテンツログを有効にする | Learn（Debugging Scripts、2026-10-15、AI 支援の記述あり）: `warn` はログレベルに関係なく表示、`log` は Verbose/Info のときだけ。1 行の長さの上限の記述はない。BDS の標準出力に出るかは未確認 | **v1 採用**（どの関数で出すかは Phase 1 の実測で決める） |
| tick・時刻 | `system.currentTick`（S:21506）、`world.getAbsoluteTime`（S:22440）、`getTimeOfDay`（S:22654）、`getDay`（S:22467）、`getMoonPhase`（S:22620）、`getDifficulty`（S:22485） | ○ | 安定 | ○ / ○ | なし | スクリプトの最上位（early-execution）では呼べない API がある。`worldLoad` 後に呼ぶ | v1 採用 |
| 天気 | `Dimension.getWeather` は **ベータ**（SB:8647）。安定版は変化のイベント `weatherChange`（S:23378）だけ | ✕ | ベータ | — | — | 読み込み時点の天気は分からない | 後回し |
| プレイヤー一覧 | `world.getAllPlayers`（S:22458）、`getPlayers(opts)`（S:22646） | ○ | 安定 | ○ / ○ | なし | — | v1 採用 |
| プレイヤーの基本 | `id`（S:8824）、`name`（S:17217）、`dimension.id`、`location`（S:8932）、`getHeadLocation`（S:9481）、`getRotation`（S:9512）、`getViewDirection`（S:9560）、`getVelocity`（S:9549）、`getGameMode`（S:17320）、`selectedSlotIndex`（S:17237）、`isValid`（S:8913） | ○ | 安定 | ○ / ○ | なし | 多くが `InvalidEntityError` を投げる。`isValid` を確かめ、try/catch で囲む。`nameTag`・`selectedSlotIndex` などは書き込みもできるので、代入しない | v1 採用 |
| 移動の状態 | `isOnGround`（S:8866）、`isSneaking`（S:8884）、`isSprinting`（S:8895）、`isSwimming`（S:8905）、`isFalling`（S:8845）、`isInWater`（S:8854）、`isClimbing`（S:8835）、`isSleeping`（S:8875）、`isFlying`（S:17180）、`isGliding`（S:17187）、`isJumping`（S:17195）、`isEmoting`（S:17172） | ○ | 安定 | ○ / ○ | なし | throw しうる | v1 採用 |
| 入力・クライアント情報 | `inputInfo`（S:17159）、`clientSystemInfo`（S:17129）、`graphicsMode`（S:17153） | ○ | 安定 | ○ / ○ | なし | 観測の目的に必須ではない | 後回し |
| カメラ | `Player.camera`（S:17122）は読める値が `isValid` だけ（ほかは変更系） | 実質 ✕ | — | — | — | 視点は `getViewDirection` で代わりにする | 対象外 |
| 出入り | `playerJoin`（S:23271）、`playerLeave`（S:23279）、`playerSpawn`（S:23297）、`playerDimensionChange`（S:23200） | ○ | 安定 | ○ / ○ | なし | 初版はオンデマンドなので購読しない | 後回し |
| 体力 | `getComponent('minecraft:health')`（S:9367）→ `currentValue`（S:10117）、`effectiveMax`（S:10132） | ○ | 安定 | ○ / ○ | なし | `set*/reset*` は呼ばない | v1 採用（容易） |
| インベントリ | `EntityInventoryComponent.container`（S:11290）、`Container.size`（S:6657）、`getItem`（S:6783）、`ItemStack.typeId/amount/nameTag` | ○ | 安定 | ○ / ○ | なし | `getSlot`（生きた参照）は使わない | v1 採用（容易） |
| 装備 | `EntityEquippableComponent.getEquipment(EquipmentSlot)`（S:10632）、`totalArmor`（S:10610） | ○ | 安定 | ○ / ○ | なし | 空のスロットは undefined。Body スロットはベータ | v1 採用（容易） |
| ブロック | `Dimension.getBlock`（S:7802: 未ロードは undefined、範囲外などで `LocationInUnloadedChunkError`/`LocationOutOfWorldBoundariesError`）、`isChunkLoaded`（S:8051）、`heightRange`（S:7528）、`Block.typeId`（S:3975）、`permutation.getAllStates()`、`isAir`（S:3887）、`isLiquid`（S:3901）、`isWaterlogged`（S:3920） | ○ | 安定 | ○ / ○ | なし | 先に `isChunkLoaded` と `heightRange` で確かめ、try/catch で囲む。`isSolid` はベータ | v1 採用 |
| 明るさ・バイオーム | `Dimension.getLightLevel`（S:7997）、`getSkyLightLevel`（S:8030）、`getBiome`（S:7778） | ○ | 安定 | ○ / ○ | なし | 未ロードで throw | 後回し（Phase 2 の余裕次第） |
| 範囲のブロック | `Dimension.getBlocks`（S:7868、2.10.0 で追加） | ○ | 安定 | ○ / ○ | なし | 範囲が大きいと重い。`UnloadedChunksError` | 後回し（初版は座標の一括取得だけ） |
| 視線の先のブロック | `Entity.getBlockFromViewDirection`（S:9332）→ `BlockRaycastHit{block, face, faceLocation}`、`Dimension.getBlockFromRay`（S:7842）、`BlockRaycastOptions`（S:23913） | ○ | 安定 | ○ / ○ | なし | maxDistance の上限・既定値は記載なし。こちらで上限を決める | v1 採用 |
| 視線の先のエンティティ | `getEntitiesFromViewDirection`（S:9468）、`Dimension.getEntitiesFromRay`（S:7981） | ○ | 安定 | ○ / ○ | なし | `UnsupportedFunctionalityError` を投げうる（条件は記載なし） | v1 採用（容易） |
| 周辺のエンティティ | `Dimension.getEntities(EntityQueryOptions)`（S:7953: location/maxDistance/closest/type/excludeTypes） | ○ | 安定 | ○ / ○ | なし | 半径と件数に必ず上限を付ける | v1 採用 |
| 任意の始点・方向のレイ | `Dimension.getBlockFromRay`（S:7842） | ○ | 安定 | ○ / ○ | なし | 入力の検証（有限・正規化） | 後回し（Phase 2 の余裕次第） |
| server-net | `http.request`（N:496）、`websocket.connect`（N:844） | ✕ | **ベータのみ** | ✕ / ○ | **Beta APIs の実験**、`config/<script module UUID>/permissions.json` で許可 | 待ち受け（listen）の API はない。外向きのクライアントだけ | 観測コアには入れない（ADR-0004） |
| server-admin | `secrets.get`（A:407）→ `SecretString`、`variables.get`（A:458） | ✕ | **ベータのみ** | ✕ / ○ | Beta APIs の実験 | クライアントと Realms では使えない（A:9-17） | 観測コアには入れない（ADR-0004） |

### 2.3 読み取り専用であること

- 取得系の API に、ワールドを変えると書かれたものはなかった。`getBlock` は未ロードのとき undefined を返し、チャンクを読み込むという記述はない。
- **避けるもの**: 書き込みもできるプロパティへの代入（`Entity.nameTag`、`isSneaking`、`Player.selectedSlotIndex`、`commandPermissionLevel`、`ItemStack.amount`/`nameTag`）、変更系のメソッド（`set*`、`Camera.*`、`ContainerSlot` への書き込み、`runCommand`、`setWeather`）、`getSlot`。
- 状態は変えないが、外から見える副作用: console への出力、`sendScriptEvent`（全パックの購読者に届く）、カスタムコマンドの登録（コマンド一覧に出る）。

### 2.4 server-net / server-admin

- npm の公開版に、ベータでない版は **0 件**（server-net 285 件、server-admin 283 件）。1.26.5x 向けは `1.0.0-beta.1.26.50/51/52-stable`。manifest での版は `"1.0.0-beta"`。
- server-net は **BDS だけ**で動く（N:9-15「can only be used on Bedrock Dedicated Server」）。server-admin はクライアントと Realms では使えない（A:9-17）。
- ベータ版のモジュールには、ワールドで **Beta APIs の実験**を有効にする必要がある（Learn Versioning）。
- 実機の BDS の `config/default/permissions.json` の `allowed_modules` に、server-net は**ない**（server-admin はある）[実機]。server-net は、そのパックの **script モジュールの UUID** のフォルダ `config/<UUID>/permissions.json` で許可する（Learn Scripting BDS）。`secrets.json`・`variables.json` も `config/default/` か同じフォルダに置く。
- server-net が提供するのは、外向きの `http`（get/request/cancelAll、`HttpRequest.timeout` は秒）と `websocket.connect(uri, headers?)`、パケットのイベント。**HTTP サーバーや待ち受けの API はない。**
- `HttpRequestLimitExceededError`（N:952-976、Learn 2026-01-28）は「**同時**に処理中の HTTP 要求の数が上限に達した」というエラーで、`inFlightRequests` と `maxConcurrentRequests` を持つ。毎秒の回数の上限ではない。**上限値は記載がない。** WebSocket 側は別の `WebSocketLimitExceededError` がある。ほかに `RequestBodyTooLargeError`、`TLSOnlyError`、`UriNotAllowedError`（許可リスト）。
- `HttpHeader` の値に `SecretString` を渡せる（N:536）。トークンの値をスクリプトから読まずに送れる。

### 2.5 パックの間の依存

- manifest の `dependencies` は `uuid`・`module_name`・`version` だけで、**任意（optional）の依存の仕組みは記載がない**（Learn manifest リファレンス、2026-04-21）。依存先のモジュールがない環境での失敗の仕方も記載がない。
- 別のパックのスクリプトを import する方法は見つからなかった。**記載がある疎結合の方法は `/scriptevent` と `system.sendScriptEvent` だけ。**
- したがって、`import()` や条件分岐で server-net の依存を避けられるとは仮定しない。manifest に server-net を宣言したパックは、通常ワールドで読み込まれない（またはスクリプトが動かない）おそれがある（未確認。確認は不要な設計にする: ADR-0004）。

### 2.6 未確認（確かめ方）

| # | 項目 | 確かめ方（`docs/TESTING.md`） |
| --- | --- | --- |
| U1 | BDS で `console.*` が標準出力に出るか、その形式（前置き）、1 行の長さの上限 | **解決（2026-10-18）**: `content-log-console-output-enabled=true` で `[日時 INFO] [Scripting] …` として出る。569 文字の行は欠けなかった（上限は未確認）。出力はシステムのコードページ（`docs/knowledge/bds-local-server/` §8） |
| U2 | クライアントのコンテンツログを、ゲームの動作中にファイルとして読めるか | **観察（2026-10-18）**: 読めるが、約 4 KB ずつ書かれる。BDS 専用にしたので対象外（ADR-0006） |
| U3 | `/scriptevent` のチートの要否（BDS の `allow-cheats=false` で、プレイヤー・コンソールから） | **解決（2026-10-18）**: コンソールはチート不要。プレイヤーはチートと operator が必要 |
| U4 | 2048 文字を超えた message の扱い（切られる・拒否される） | **解決（2026-10-18）**: コンソールでは BDS が拒否（エラー行）。チャットでは 511 文字以上のコマンドでプレイヤーが切断 |
| U5 | カスタムコマンドに JSON を 1 引数で渡せるか | Phase 2 の判断の前 |
| U6 | レイの `maxDistance` の上限・既定値 | Phase 2（OBS-TGT-04） |
| U7 | `Player.id` が再参加・再起動の後も同じか | **一部（2026-10-18）**: 同じアカウントでも、ワールドが違うと id が違った。同じ BDS での再参加・再起動は Phase 2（OBS-PLY-06） |
| U8 | 通常ワールドで、manifest に server-net を宣言したパックがどう失敗するか | Phase 3 を採る場合だけ |

### 2.7 参照した公式ページ（updated_at）

- scriptevent コマンド（2025-07-31）: https://learn.microsoft.com/en-us/minecraft/creator/commands/commands/scriptevent
- カスタムコマンド（2025-11-04）: https://learn.microsoft.com/en-us/minecraft/creator/documents/scripting/custom-commands
- 実行権限（2026-01-08）: https://learn.microsoft.com/en-us/minecraft/creator/documents/scripting/execution-privilege
- スクリプトのデバッグ（2026-10-15）: https://learn.microsoft.com/en-us/minecraft/creator/documents/scripting/debugging-scripts
- バージョニング（2025-07-17）: https://learn.microsoft.com/en-us/minecraft/creator/documents/scripting/versioning
- `@minecraft/server` の変更履歴（2026-10-13）: https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/changelog
- server-net（2026-10-13、pre-release）: https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server-net/minecraft-server-net
- HttpRequestLimitExceededError（2026-01-28）: https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server-net/httprequestlimitexceedederror
- server-admin（2026-10-13）: https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server-admin/minecraft-server-admin
- BDS でのスクリプト（2025-07-17）: https://learn.microsoft.com/en-us/minecraft/creator/documents/scriptingservers
- manifest リファレンス（2026-04-21）: https://learn.microsoft.com/en-us/minecraft/creator/reference/content/addonsreference/packmanifest
