# TESTING — Minecraft 内で確認すること

> English: [TESTING.md](TESTING.md)（正本は英語版です。内容を変えるときは両方を更新してください）

自動チェック（`pnpm validate`、`pnpm build`、`pnpm test`）で分かるのは、ファイルの形式が正しく参照が
解決できることまでです。ゲーム内の動作は確認できません。このファイルは手動テストの計画書で、変更の
たびにテストケースを追加し、リリース前にはすべて通す必要があります。

## テストの進め方

1. ビルドと導入:
   - Windows: `pnpm deploy`（作業中は `pnpm dev --deploy`）で Minecraft にパックをコピーします。
   - それ以外（macOS → iPhone / iPad、Android など）: `pnpm package` を実行し、`dist/<slug>-<version>.mcaddon` を
     端末で開きます（AirDrop など）。`pnpm build` だけでは `.mcaddon` は作られません。また `pnpm build` は
     最初に `dist/` を空にするので、前に `pnpm package` で作った `.mcaddon` も消えます。
     端末に入れるのは `.mcaddon` だけです（両パック入り）。一緒に出力される2つの `.mcpack` は不要です。
2. チートを有効にした**新規**のフラット・クリエイティブワールドを作り、ビヘイビアパックを有効にします
   （リソースパックは依存関係で一緒に有効になります）。設定 → クリエイターで *コンテンツログの GUI / ファイル*
   を有効にすると、JSON やスクリプトのエラーが見られます。
3. リリース時は、前のバージョンを入れた**既存のサバイバルワールド**でも確認します
   （アップデート経路: UUID とコンテンツの識別子が変わっていないこと）。
4. 結果を PR に記録します: 実施したケース、プラットフォームとバージョン、合否。

### iPhone / iPad への導入（AirDrop）

1. Mac で `pnpm package` を実行し、Finder から `dist/<slug>-<version>.mcaddon`（このファイルだけ）を端末に
   AirDrop します。端末上では、ファイル名のバージョンでビルドを見分けます。
2. 端末で AirDrop を受け入れます。Minecraft で開くか聞かれたら Minecraft を選び、手順4へ進みます。
   そうでなければ「ファイル」アプリに保存されます（通常は *このiPhone内（このiPad内）→ ダウンロード*）。
   保存先はどのフォルダでも構いません。「ファイル」の *Minecraft* フォルダには**入れないでください**。
   Minecraft はそこにある `.mcaddon` を読み込みません。
3. 「ファイル」で、**ファイル名のバージョンを見て**目的のファイルを探します（検索するか、保存先のフォルダを
   開きます）。*最近の項目* からは選ばないでください。*最近の項目* には、iCloud Drive や *最近削除した項目*
   にある古いコピーも並びます。ファイルを長押し → *共有* → *Minecraft* を選びます（アプリの列に Minecraft がなければ
   *その他* から選びます）。
4. Minecraft が起動し、「インポートを開始しました…」のあと「インポートに成功しました」と表示されます。
   重複したパックと表示された場合は、同じバージョンがすでに入っています。下の「新しいビルドを入れるとき」を
   見てください。
5. ワールドにパックを適用します（新規・既存どちらでも）:
   1. ワールド一覧で、対象ワールドの鉛筆アイコン（*編集*）をタップします。
   2. *ビヘイビアパック* を開き、*使用中* に `<アドオン名> [BP]` があるか確認します。なければ *利用可能* から
      探します（iPhone / iPad では、インポートしたアドオンが *購入済み* の中にある場合があります）。
      タップして *有効にする* を選びます。
   3. *リソースパック* を開き、`<アドオン名> [RP]` も *使用中* にあるか確認します（BP を有効にすると通常は
      依存関係で自動的に入ります。入っていなければ同じ手順で有効にします）。
   4. *実験* を開き、すべてオフになっていることを確認します（このアドオンは実験的機能を使いません。ADR-0001）。
   5. ワールドを開始します。既存のワールドにパックを適用すると、Minecraft がバックアップのコピーを
      勧めてきます。テスト用ワールドなら任意です。

**端末に残る古いコピー:** 「ファイル」から古い `.mcaddon` をときどき削除してください（iCloud Drive と
*最近削除した項目* の中も）。最新のビルドだけが残っている状態にしておくと安全です。Minecraft が実際に
取り込んだバージョンは、「ファイル」で *Minecraft → games → com.mojang → behavior_packs → パックのフォルダ →
manifest.json* を開き、`"version"` で確認できます。

**新しいビルドを入れるとき**（端末に入っているものと同じバージョン番号の場合）: Minecraft は、UUID と
バージョンが同じパックがすでに入っているとインポートを飛ばすため、古いビルドが置き換わりません。
インポートの前に、Minecraft の *設定 → ストレージ → リソースパック / ビヘイビアパック* でこのアドオンの
両パックを選んで削除し、それからインポートし直してください。古いビルドを使っていたワールドは、開き直すと
新しいビルドを使います（UUID が同じため）。

**おすすめ: 端末に入れるビルドごとにパッチ番号を上げる**（最初のリリース前の検証用ビルドなら
`pnpm version:set 0.1.1`、`0.1.2`、…）。新しいバージョンは必ず取り込まれるので古いパックの削除が不要になり、
*編集 → ビヘイビアパック / リソースパック → 使用中* に表示されるバージョンで、どのビルドが動いているかも
分かります（テストの前に確認してください）。この運用にする場合は `CHANGELOG.md` に記録し、それらのビルドの
変更内容は最初の公開バージョンにまとめて載せます。AI エージェントは、ユーザーがこの運用に同意した場合にだけ
バージョンを変更します（`AGENTS.md` 参照）。

## スモークテスト（変更のたびに実施）

| ID | 手順 | 期待結果 |
| --- | --- | --- |
| S-01 | パックを有効にしたワールドを読み込み、コンテンツログを開く | このアドオン由来のエラーや警告がない |
| S-02 | 読み込み直後のチャット/ログを見る | スクリプトのログ `[<slug>] scripts loaded` が1回だけ出る |
| S-03 | `/reload` を実行する | スクリプトがエラーなく再読み込みされ、動作が二重にならない（イベントの二重処理など） |
| S-04 | ワールドを出て入り直す | 動作が変わらず、保存データ（ダイナミックプロパティ、スコアボード）が残っている |
| S-05 | ワールド設定のパック一覧を見る | パック名・説明・アイコンが `addon.config.json` と一致し、バージョンが `package.json` と一致する |

## コンテンツ別の確認項目

該当する項目を下の機能別セクションにコピーして埋めてください。

- **アイテム**: クリエイティブインベントリの想定どおりのグループにある。アイコンと名前が正しい。クラフトレシピが使える。性能（攻撃力、耐久値、エンチャント性）が `CONTENT.md` のとおり。メインハンド・オフハンド・ドロップ時の挙動が正しい。
- **ブロック**: 設置できる。すべての面のテクスチャが正しい。想定した道具で壊せて、想定したアイテムを落とす。当たり判定と明るさが仕様どおり。手に持ったときとインベントリでの表示が正しい。
- **エンティティ**: `/summon` と、正しいバイオームでのスポーンルールで出現する。モデル・テクスチャ・アニメーションが再生される。AI（待機・歩行・攻撃・逃走）が正しい。体力・攻撃力・ドロップ・音が仕様どおり。デスポーン/残留が想定どおり。遠くからやマルチプレイでも見た目が正しい。
- **レシピ**: レシピブックに出る。材料と完成数が正しい。バニラのレシピと衝突しない。
- **スクリプト機能**: 発動条件、結果、境界ケース（プレイヤーがいない、複数いる、途中で抜ける）を確認する。tick ごとの負荷がない（`/scriptprofiler` を使うか、カクつきを観察する）。
- **UI（server-ui のフォーム）**: 開く、きれいにキャンセルできる、入力が検証される、タッチ操作とコントローラーで使える。
- **言語**: ゲームの言語を切り替えて、文字列が表示され、生のキーが出ていない。

## 機能別のテストケース

### startup（scripts/features/startup）

| ID | 手順 | 期待結果 |
| --- | --- | --- |
| F-startup-01 | パックを有効にしたワールドを読み込む | `[<slug>] scripts loaded` がちょうど1行出る |

### observer（scripts/features/observer）— Phase 2 完了

Phase 1・2（`docs/ROADMAP.md`）のテスト計画です。アドオンは **BDS 専用**（ADR-0006）。ゲーム内のケースは BDS で行い、「ローカルワールド」のケースは参考とする。自動テスト U-PROTO-*・V-* は `pnpm test` で実行する。Phase 1 の結果は、下の「結果」にある。**単体テストはゲームを使いません。単体テストが通っても、ゲーム内で確認したとは報告しません。**

ゲーム内のケースの準備: BDS のワールド `addon-lab-flat`（フラット、クリエイティブ）、`content-log-console-output-enabled=true`。要求は BDS のコンソールに `scriptevent to3izo_bo:query <JSON>` と送る（ASCII だけ。ほかの文字は `\uXXXX`）か、チートありで operator のプレイヤーのチャットに `/scriptevent …` と打つ（コマンド全体で 448 文字以下）。応答は BDS の標準出力で読み、`to3izo_bo.response ` の後ろを JSON として読む。実行ごとに、機種・ゲーム／BDS のバージョン・環境（ローカルワールド／BDS）・合否・メモを記録する。

#### 自動テスト（ゲームなし）

| ID | 内容 | 場所 |
| --- | --- | --- |
| U-PROTO-01 | 正しい要求を解析でき、`requestId`・`method`・`params` が保たれる | tests/unit/protocol-request.test.ts |
| U-PROTO-02 | JSON でない／オブジェクトでない → `INVALID_JSON`。形の正しい `requestId` は生の文字列から拾い、なければ `null` | 同上 |
| U-PROTO-03 | `maxRequestChars` を超える → 解析せずに `REQUEST_TOO_LARGE` | 同上 |
| U-PROTO-04 | `requestId`（文字種、1〜64 文字）や `method` がない・不正 → `INVALID_REQUEST`。対応しない `protocol` → `UNSUPPORTED_PROTOCOL` | 同上 |
| U-PROTO-05 | 未知の method → `UNKNOWN_METHOD`。未知の引数名 → `INVALID_PARAMS`。ハンドラーの例外 → `INTERNAL_ERROR` | tests/unit/protocol-dispatch.test.ts、tests/unit/protocol-params.test.ts |
| U-PROTO-06 | 座標: 負の整数は受け付ける。`1.5`・文字列・`1e999`・範囲外 → `INVALID_PARAMS`。半径・件数・距離・一括の数が上限を超える → `LIMIT_EXCEEDED` | tests/unit/protocol-params.test.ts |
| U-PROTO-07 | プレイヤーの指定: 空白や日本語を含む名前を受け付ける。name と id の両方 → `INVALID_PARAMS` | 同上 |
| U-PROTO-08 | 封筒: `data` と `error` のどちらか一方だけ。応答は 1 行（名前の `\n` もエスケープされる）で、接頭辞から始まる | tests/unit/protocol-response.test.ts |
| U-PROTO-09 | 切り詰め: リストを短くして `truncated`/`omitted` を付ける。それでも大きい → `RESPONSE_TOO_LARGE` | 同上 |
| U-PROTO-10 | `capabilities` がビルドを正しく表し、一覧のどの method も表を通して応答する（表の型が、一覧と同じ名前を要求する） | tests/unit/protocol-dispatch.test.ts |
| U-PROTO-11 | Phase 2 の引数: ディメンションの ID（`DIMENSION_NOT_FOUND`）、小数の座標、真偽値、名前のリスト（`include`） | tests/unit/protocol-options.test.ts |
| U-PROTO-12 | `blocks` の座標: 空でなく、`maxBlocksPerRequest` 以下（`LIMIT_EXCEEDED`）。項目ごとのエラーに番号が付く | 同上 |
| U-PROTO-13 | オプションのまとまり: `target`・`entities` の既定値と上限。`snapshot` のまとまりは、ほかのまとまりのキーを拒否する | 同上 |
| U-PROTO-14 | エンティティの絞り込み（`type`・`excludeTypes`・`families`・`excludeFamilies`・`name`・`tags`）と `includeEffects`。`top`・`tops` の列（整数の `x`・`z`、`LIMIT_EXCEEDED`）。`scoreboard` の `objective`・`limit` | tests/unit/protocol-options.test.ts |
| U-PROTO-15 | 既知の Script API のエラーを、名前でプロトコルのコードに変える（`details.scriptError`）。未知のエラーは `INTERNAL_ERROR` のまま | tests/unit/protocol-dispatch.test.ts |
| U-EVT-01 | 通知の行: 接頭辞、封筒の項目、`dropped` は 0 でないときだけ、ASCII だけ | tests/unit/protocol-events.test.ts |
| U-EVT-02 | 保持: 新しい N 件を残す。`since`・`limit`・`more`・`kinds`。押し出しや破棄があれば `missed` | 同上 |
| U-EVT-03 | 頻度の上限: 20 tick ごとの上限、捨てた数を数える | 同上 |
| U-EVT-04 | `events` の引数: `since` は 0 以上の整数、`limit` は `maxEventsPerRequest` 以下、`kinds` は既知の種類だけ | 同上 |
| U-EVT-05 | 追加のイベントの切り替え: 起動時はすべて OFF。`changed` は本当に変わった種類だけ、決まった順。常時の種類と追加の種類は重ならない。`events` の `kinds` は追加の種類も受け付ける | 同上 |
| U-EVT-06 | 通知の絞り込み: プレイヤーから `eventPlayerRadius` 以内、`Loaded` の出現は除く、爆発の `bounds`、ディメンションの完全な ID | 同上 |
| U-PROTO-16 | `subscribe` の引数: 追加の種類だけ（常時の種類はメッセージで名前を挙げる）、両方のリストに同じ種類は不可、配列だけ、未知のキー | 同上 |
| U-PROTO-17 | `capabilities.build`（ビルドの外では unbundled）、`optionalEvents.kinds`/`enabled`、`eventPlayerRadius`。`events` は変わらない | tests/unit/protocol-dispatch.test.ts |
| U-PROTO-18 | `features` の引数: 既知の機能名だけ、両方のリストに同じ名前は不可、配列だけ | tests/unit/protocol-features.test.ts |
| U-PROTO-19 | 機能を ON にできるのは BDS のコンソール（送り主のプレイヤーがない `Server` / `command:Server`）だけ（ほかは `PERMISSION_DENIED`）。OFF は誰でも。`FEATURE_DISABLED`。機能の切り替え。新しいコードは末尾に足す | 同上 |
| U-PROTO-20 | `capabilities` に `features`・`container`・`optionalFeatures`。`container` の引数（`fromSlot` は 0〜53）。満杯の大きいチェストは、短い ID なら 1 行に収まり、長い ID や名前なら切り詰める（拒否しない） | 同上 |
| U-BUILD-01 | ビルドの識別子の形 `<commit>[+dirty]@<UTC>`、git がなければ `nogit`。リポジトリの外では git の状態は null | tests/unit/build-info.test.ts |
| V-VER-01 | `capabilities` が返すバージョンが、`package.json` と manifest のモジュールの依存と一致する（`pnpm version:set` のあとは `scripts/shared/constants/version.ts` を直す） | tests/validation/version-constants.test.ts |
| V-RO-01 | 読み取り専用の検査: `scripts/` に変更系の API（`runCommand`、`setBlock`/`setType`/`setPermutation`、`setDynamicProperty`、`teleport`、`addEffect`、`kill`、`remove`、`spawnEntity`、`setItem`、`nameTag =` など）の呼び出しがない | tests/validation/read-only.test.ts |
| V-DEP-01 | コアの manifest の依存が `@minecraft/server` だけ（`server-net`/`server-admin` がない） | `pnpm validate` と tests/validation/read-only.test.ts |

#### 環境（ゲーム内）

| ID | 手順 | 期待結果 |
| --- | --- | --- |
| OBS-ENV-01 | ローカルワールド（クライアントがホスト）で `capabilities` を送る。ゲームの動作中に `%APPDATA%\Minecraft Bedrock\logs\ContentLog*.txt` と「設定 → クリエイター → コンテンツ ログの履歴」で応答を探す | どこに出たか、ファイルが動作中に書かれるかを記録する（ローカルワールドでの回収方法が決まる） |
| OBS-ENV-02 | BDS: プレイヤーから `capabilities` を送り、BDS の標準出力を読む | `to3izo_bo.response {…}` を含む 1 行が出る。BDS が前に付ける文字列を記録する |
| OBS-ENV-03 | 権限: (a) チートありのローカルワールド、(b) チートなし、(c) `allow-cheats=false` の BDS でプレイヤーから、(d) BDS のコンソールから、要求を送る | どれが動くかを記録する。回避は試みない |
| OBS-ENV-04 | 通常の配布物を作り（`pnpm package`）、`dist/be-observer_BP/manifest.json` を開く | モジュールの依存は `@minecraft/server` だけ。新しいワールドで、実験的機能なしにパックを有効にできる |
| OBS-ENV-05 | 同じ VM のクライアントで、サーバー `127.0.0.1`・ポート `19132` を追加して参加する | ループバックの例外設定なしで接続できる。失敗したら、対処を試す前にエラーをそのまま記録する（`docs/knowledge/bds-local-server/`） |
| OBS-ENV-06 | 運用者が公開範囲を絞ったあと（ファイアウォールの範囲／`server-ip`）、VM の外の機器（LAN の iPhone、Mac）から接続を試す | 接続できない。VM 内のクライアントは接続できる |
| OBS-ENV-07 | 対象外: Phase 3（通信アダプター）は却下した（ADR-0004）。番号を使い回さないために残す | — |

#### プロトコルと観測（ゲーム内。BDS とローカルワールドの両方で）

| ID | 手順 | 期待結果 |
| --- | --- | --- |
| OBS-IN-01 | `{"requestId":"c1","method":"capabilities"}` | JSON として読め、`requestId` が `c1`。method と上限がビルドと一致する |
| OBS-IN-02 | `{"requestId":"x1",`（壊れた JSON） | `INVALID_JSON`、`requestId` は `x1` |
| OBS-IN-03 | `{"requestId":"x2","method":"teleport"}` | `UNKNOWN_METHOD`。ワールドでは何も起きない |
| OBS-IN-04 | 文字列の値に空白・`"`・`\`・日本語を含む要求 | そのまま届く（返ってきた値と比べる） |
| OBS-IN-05 | 2,100 文字の message | ゲームの扱い（切られる・拒否される）を記録する。アドオンは `REQUEST_TOO_LARGE` を返すか、何も届かない |
| OBS-IN-06 | BDS のコンソールから、`player` を引数なしで。次に `{"name":…}` 付きで | `NO_SOURCE_PLAYER`。次にそのプレイヤーのデータ |
| OBS-IN-07 | `/reload` のあと、`capabilities` を 2 回 | `session` が新しくなり、`seq` が 1, 2。要求 1 つに応答はちょうど 1 つ |
| OBS-PLY-01 | `players` を 1 人のとき、2 人（別のアカウント）のとき | 人数・id・名前・ディメンションが正しい |
| OBS-PLY-02 | 空白や日本語を含む名前で `player`（そのアカウントがあれば） | 見つかる。アカウントがなければ「実施不可」と記録する |
| OBS-PLY-03 | 存在しない名前で `player`。次に、退出した直後のプレイヤーで | どちらも `PLAYER_NOT_FOUND` |
| OBS-PLY-04 | ネザーとジ・エンドで `player` | `dimension` が完全な ID。位置がゲームの座標表示と一致する |
| OBS-PLY-05 | スニーク・ダッシュ・水泳・飛行（クリエイティブ）・静止のそれぞれで問い合わせる | 状態の値が動作と一致する。静止中の速度はほぼ 0 |
| OBS-PLY-06 | `id` を記録し、退出・再参加、BDS の再起動のあとに再び問い合わせる | `id` が変わらないかを記録する（U7） |
| OBS-BLK-01 | 負の座標（例: -1, 4, -1。座標表示で確認）に分かっているブロックを置き、`block` で読む | `typeId` と `states` が一致し、`position` が要求した整数座標と同じ |
| OBS-BLK-02 | 空気の位置、`x=1000000`（未ロード）、`y=400`（ワールドの上）で `block` | `ok` で `minecraft:air`、`unloaded`、`out_of_bounds` |
| OBS-BLK-03 | `maxBlocksPerRequest` 個の座標で `blocks`、次に 1 個多く | 全件が順番どおり。次は `LIMIT_EXCEEDED` |
| OBS-TGT-01 | ブロックの面を見て `target` | ブロックの位置・面・面上の位置が正しい |
| OBS-TGT-02 | 空を見て `target` | `block.hit: false` |
| OBS-TGT-03 | `includeEntities` を付けて動物を見る | エンティティに当たり、id と種類が返る |
| OBS-TGT-04 | 上限を超える `maxDistance`、次に省略 | `LIMIT_EXCEEDED`。省略時は既定の距離を使い、応答に出る |
| OBS-ENT-01 | スポーンエッグで牛を 12 頭、近くに出す。半径 8・件数 5 で `entities` | 近い順に 5 頭、`truncated: true`（または `returned`/`limit` で切ったことが分かる） |
| OBS-SNP-01 | すべての節で `snapshot`。次に、存在しない節の名前で | 節がそろい、`tick` は 1 つ。次は `INVALID_PARAMS` |
| OBS-SIZE-01 | 名前付きのアイテムでインベントリを満たし、`inventory` 付きで `player` | `maxResponseChars` 以下か、`truncated`/`omitted` か、`RESPONSE_TOO_LARGE`。途中で切れた行は出ない |
| OBS-RO-01 | すべての method を実行する前と後で、ブロックの範囲・インベントリ・ゲームモード・エンティティの数・`/scoreboard objectives list`・`/tag @s list` を比べる | 違いがない。コンテンツログに、アドオンによるコマンドの出力がない |
| OBS-PERF-01 | BDS で、1 秒に 1 回の要求を 5 分（`snapshot` と `entities` を交互に） | スクリプトのウォッチドッグの警告がなく、目に見える遅れもない。どの要求にも応答が 1 つ |

#### 出来事の通知（ゲーム内、BDS）

| ID | 手順 | 期待結果 |
| --- | --- | --- |
| OBS-EVT-01 | プレイヤーが退出して、入り直す | `player_leave`、`player_join`、`player_spawn`（`initialSpawn: true`）。`from` と `to` が同じ `game_mode_change` は出ない |
| OBS-EVT-02 | サバイバルのプレイヤーを、コンソールの `kill <名前>` で倒し、プレイヤーがリスポーンを押す | `entity_die`（プレイヤー、`cause`）、続いて `player_spawn`（`initialSpawn: false`） |
| OBS-EVT-03 | コンソールの `execute as <名前> at @s run damage @e[…,c=1] 100 entity_attack entity <名前>` | そのモブの `entity_die`、`killer` がプレイヤー |
| OBS-EVT-04 | プレイヤーをネザーに tp し、読み込みが終わるまで待って、戻す | `dimension_change` が 2 件、`from`・`to` が正しい |
| OBS-EVT-05 | コンソールの `gamemode survival <名前>`、次に `gamemode creative <名前>` | `game_mode_change` が 2 件 |
| OBS-EVT-06 | コンソールの `gamerule dodaylightcycle false`、次に `true` | `game_rule_change` が 2 件（`doDayLightCycle`） |
| OBS-EVT-07 | `events` を、引数なし・`since` と `limit` 付き・`kinds` 付き・未知の種類付きで | 保持している全件、`more` 付きの次のページ、絞り込み、`INVALID_PARAMS` |
| OBS-EVT-08 | `/reload` | `session` が新しくなり、通知の `seq` が 1 から。次の出来事まで `events` は空 |

#### operator 用のコマンド（ゲーム内、BDS。ADR-0010）

BDS を**再起動**してから行う（新しいコマンドや変えたコマンドは `/reload` では登録されない）。`allow-cheats=false` のまま。
先に `permissions.json` のバックアップを取り、試験のあとで戻す（`deop` しても `member` の行が残る）。

| ID | 手順 | 期待する結果 |
| --- | --- | --- |
| OBS-CMD-01 | BDS のコンソールで `to3izo_bo:query "{\"requestId\":\"c\",\"method\":\"capabilities\"}"` | 応答の行が 1 つ。`transport.requestCommand` は `to3izo_bo:query` |
| OBS-CMD-02 | `member` のプレイヤーが `/to3izo_bo:query "{\"requestId\":\"m\",\"method\":\"player\"}"` と打つ | ゲームが拒否する（コマンドの権限レベル）。応答の行は出ない |
| OBS-CMD-03 | コンソールで `op <名前>`。プレイヤーが同じコマンドを `requestId` `o` で打つ | そのプレイヤーのデータで応答がある（送った人が source player）。プレイヤーのチャットには何も出ない |
| OBS-CMD-04 | コンソールで `reload` してから、OBS-CMD-01 をもう一度 | 応答がある（コマンドは変わっていない） |
| OBS-CMD-05 | `bo-verify.ps1` を `bo-verify-cases.json` で実行 | すべて成功（script event の経路は変わらない） |

#### Phase 2 の追加分（ゲーム内、BDS、スクリプトで実行）

`bds-console-bridge.ps1` で BDS を動かした状態で、参考のスクリプト `docs/knowledge/bds-local-server/scripts/bo-verify.ps1`
に、同じフォルダーの `bo-verify-cases.json` を渡して実行する。ケースのファイルは、コンソールのコマンドで状態を用意し
（タグ `bo_tag` と移動速度低下の付いた、名前 `BoPig` のブタ、プレイヤーの移動速度上昇 II、`PlayerA` = 7・`fake_p` = 3
のスコアボード `bo_test`）、要求を 1 件ずつ送り、`ok`・`code`・項目を判定して、最後に片付ける。判定（すべての応答を含む）は
JSON のファイルに書かれる。下の ID は、ケースのファイルの ID。

| ID | 内容 | 期待する結果 |
| --- | --- | --- |
| CAP-01 | `capabilities` | `entity`・`top`・`tops`・`scoreboard`、セクション `effects`、`maxScoreEntries` がある |
| EFF-01、-02 | `effects` 付きの `player`・`snapshot` | `minecraft:speed`、amplifier 1、残りの tick |
| FLT-01〜07 | `entities` に `type`、`tags` ＋ `includeEffects`、`name` ＋ `excludeTypes`、`families` ＋ `excludeFamilies`、`center` ＋ `type: minecraft:player`、空の `type`。`snapshot.entities` に `tags` | 条件に合うものだけ（ブタと移動速度低下、0 件、プレイヤー）。`INVALID_PARAMS` |
| ENT-01〜05 | `entity` をブタの id、プレイヤーの id、未知の id、`id` なし、未知のキーで | 位置・向き・速度・体力・効果付きのブタ。プレイヤー。`ENTITY_NOT_FOUND`。`INVALID_PARAMS` が 2 回 |
| TOP-01〜05 | `top` を読み込まれた列、遠い列、誰もいないネザー、コンソールから `dimension` なし、`x` = 0.5 で | y = -61 の `minecraft:grass_block` で `ok`。`unloaded`。`unloaded`。`INVALID_PARAMS` が 2 回 |
| TOPS-01〜03 | `tops` を 3 列（1 つは遠い）、33 列、32 列で | 順番どおりの簡潔な結果（`ok`・`ok`・`unloaded`）。`LIMIT_EXCEEDED`。32 列が 1 つの応答に収まる |
| SB-01〜09 | `scoreboard` を引数なし、`objective`、`objective` ＋ `limit` 1、`player` ＋ `objective`、`player`、未知の objective、`limit` 65、未知のプレイヤーで。objective を消したあとに `player` で | objective の一覧。`type` が `Player`・`FakePlayer` の 2 件。`truncated: true`。スコア 7。1 件以上。`INVALID_PARAMS`。`LIMIT_EXCEEDED`。`PLAYER_NOT_FOUND`。得点なし（エラーではない） |
| REG-01、-02 | `players`、既定の `snapshot` | Phase 2 から変わらない |

#### 追加のイベントとビルドの識別子（ゲーム内、BDS。ADR-0014）

「スクリプト」と書いたケースは `docs/knowledge/bds-local-server/scripts/bo-verify-optional-cases.json` にある（`bo-verify.ps1`
で実行する。ファイルの ID は下の ID と同じで、細かいケースには英字を付けた）。ほかはプレイヤーのクライアントが要る。

| ID | 手順 | 期待する結果 |
| --- | --- | --- |
| OBS-OPT-01 | BDS の起動直後に `capabilities`（スクリプト） | `methods` の最後が `subscribe`。`optionalEvents.kinds` に 8 種類、`enabled` は `[]`。`build.id` が `pnpm build` の表示した id と同じ |
| OBS-OPT-02 | `subscribe` を `enable`（8 種類すべて、またはいくつか）で、次に引数なしで。`capabilities`（スクリプト） | `enabled`・`changed` が決まった順。2 回目は `changed: []`。`capabilities.optionalEvents.enabled` と一致する |
| OBS-OPT-03 | クライアントで、ブロックを壊し、次に置く | 同じ位置の `block_break`（壊す前のブロック、手に持っていた `item`）と `block_place`（置いたブロックと状態） |
| OBS-OPT-04 | `damage` を、プレイヤーを原因にしてブタへ、原因なしでブタへ、ブタを原因にしてプレイヤー（サバイバル）へ（一部スクリプト） | 1 つ目と 3 つ目に `entity_hurt`（`attacker`・`cause`・`health`）。2 つ目は出ない |
| OBS-OPT-05 | `effect` をプレイヤーと、ウシに（スクリプト） | プレイヤーの `effect_add` が 1 件。ウシの分は出ない |
| OBS-OPT-06 | クライアントで、雪玉を投げる | `item_use`（`minecraft:snowball`）。`entity_spawn` が ON なら雪玉の出現も |
| OBS-OPT-07 | 空中のエンドクリスタルを壊す（スクリプト）。スポーンから離れた地面で TNT を爆発させ、穴を埋め戻す | クリスタルは `impactedBlocks: 0` で `source` がクリスタルの `explosion`。TNT は数と `bounds` |
| OBS-OPT-08 | `weather rain`、`weather clear`（スクリプト） | `minecraft:overworld` で `from`/`to` の `weather_change` が 2 件 |
| OBS-OPT-09 | 自然なスポーンを止めて、プレイヤーから 3 ブロックと 60 ブロックの位置にブタを `summon`（スクリプト） | 近いブタの `entity_spawn`（`Spawned`）だけ。参加のときにチャンクと一緒に読み込まれたモブは出ない |
| OBS-OPT-10 | OFF の間に効果と天気を変える。`subscribe` の `disable`（スクリプト） | OFF の種類は、書かれず、保持もされない |
| OBS-OPT-11 | コンソールの `reload` のあと、`capabilities`・`events`・`subscribe` | 新しい `session`。`enabled: []`。保持は空 |
| OBS-OPT-12 | `entity_hurt` を ON にし、1 つのコマンドでブタ 30 頭にダメージ。そのあと別の出来事を 1 つ | その 1 秒は 20 行で、残りは捨てる。次の行に `dropped`、`events` は `missed: true` |
| OBS-OPT-13 | `subscribe` に常時の種類、未知の種類、両方のリストに同じ種類、リストの代わりに文字列、未知のキー。`events` に未知の種類（スクリプト） | どれも `INVALID_PARAMS` |
| OBS-BUILD-01 | ビルドし直し、動いているサーバーに配置し、コンソールで `reload`、`capabilities` | `build.id` が新しいビルドの id に変わる（`dirty` は元のツリーの状態） |

#### コンテナーの中身（ゲーム内、BDS。ADR-0015）

「スクリプト」と書いたケースは `docs/knowledge/bds-local-server/scripts/bo-verify-container-cases.json` にある
（CON-00〜20。要求はすべてコンソールから）。「プレイヤーとして」の要求は、コンソールから
`execute as <プレイヤー> run scriptevent …` か `execute as <プレイヤー> run to3izo_bo:query "…"` で送った。このとき
ゲームは、チャットと同じく、プレイヤーを送り主として伝える（`sourceType` は `Entity`）。

| ID | 手順 | 期待する結果 |
| --- | --- | --- |
| OBS-CON-01 | BDS の起動直後に `capabilities`・`features`・`container`（スクリプト） | `methods` の最後が `features`・`container`。`optionalFeatures` は `{kinds: ["containers"], enabled: []}`。`container` は `FEATURE_DISABLED` |
| OBS-CON-02 | コンソールから `features` の `enable` を、`/scriptevent`（スクリプト）とカスタムコマンドで | `enabled`・`changed` が `["containers"]`。2 回目は `changed: []` |
| OBS-CON-03 | プレイヤーとして `features` の `enable`（`/scriptevent` とカスタムコマンド）。member がチャットでカスタムコマンドを入力 | `PERMISSION_DENIED`（`required: "console"`）で、状態は変わらない。member にはゲームの「コマンドの権限レベル」のエラーが出て、アドオンには届かない |
| OBS-CON-04 | ON の間に、プレイヤーとして `dimension` なしで `container`。プレイヤーとして `features` の `disable`。もう一度 `container` | プレイヤーのディメンションのブロックの中身。`changed: ["containers"]`。`FEATURE_DISABLED` |
| OBS-CON-05 | チェスト、トラップチェスト、樽、シュルカーボックス、ホッパー、ディスペンサー、ドロッパー、かまど、溶鉱炉、燻製器、醸造台、クラフター、エンダーチェスト、模様入りの本棚、飾り壺、ジュークボックス、焚き火、書見台、石、空気に `container`（一部スクリプト） | `size`・`emptySlots` と、`replaceitem` で入れたアイテム。インベントリが API に出ないブロックは `container: null`（表は `docs/PROTOCOL.md` §5.16） |
| OBS-CON-06 | 大きいチェストの、どちらかの半分からスロット 0〜2・26・40 に入れ、両方の半分に `container`（スクリプト） | どちらの半分も `size` 54 で、同じスロット番号に同じアイテム |
| OBS-CON-07 | 大きいチェストの 54 スロットを、32 文字の ID で、次に 43 文字の ID で埋める。`container`、次に `fromSlot` を最後のスロット＋1 で。`fromSlot` 54（スクリプト） | 32 文字: 54 件すべてが 1 行に入る。43 文字: `truncated`・`omitted.items` が付き、残りは `fromSlot` で取れる。54: `LIMIT_EXCEEDED` |
| OBS-CON-08 | 遠く（未ロード）、ワールドの上、コンソールから `dimension` なし（スクリプト） | `unloaded`。`out_of_bounds`。`INVALID_PARAMS`（`dimension`） |
| OBS-CON-09 | 読んでいる間、プレイヤーがチェストを見る。2 回読む。コンソールで `reload` し、`features` と `container` | ふたは閉じたまま、中身は変わらない。`reload` のあとは新しい `session`、`enabled: []`、`FEATURE_DISABLED` |
| OBS-CON-10 | ルートテーブルが残ったチェスト（開けていない構造物のチェスト）に `container` | 未実施: 平らなワールドで用意できなかった。ADR-0015 の未確認事項 |

#### 結果

2026-10-18 に実施。BDS for Windows 1.26.52.3（Windows 11 VM）、クライアント Minecraft for Windows 1.26.52.3、アドオン 0.1.0（Phase 1）。BDS のコンソールからの要求は `bds-console-bridge.ps1` 経由、チャットからの要求はクリップボードから貼り付けた。アドオンは BDS 専用（ADR-0006）。ローカルワールドの行は参考として残す。

| ID | 環境 | 結果 | メモ |
| --- | --- | --- | --- |
| U-PROTO-01〜10、V-RO-01、V-DEP-01、V-VER-01 | `pnpm test` | 成功 | 59 件 |
| S-01 / S-02 | BDS | 成功 | `Pack Stack - [00] Bedrock Observer [BP] … 0.1.0`。`[Scripting] [be-observer] scripts loaded` が 1 行 |
| S-03 / OBS-IN-07 | BDS、ローカルワールド | 成功 | コンソールの `reload` で `session` が新しくなり `seq` が 1。要求 1 つに応答 1 つ |
| OBS-ENV-02 | BDS | 設定が必要 | `content-log-console-output-enabled=false` ではスクリプトの出力が標準出力に出ない。`true` で応答がすぐに出る |
| OBS-ENV-03 | BDS | 記載どおり | コンソール: `allow-cheats=false` で動く。チャット: チートなしは拒否、チートありでも `member` は拒否、チート＋operator で動く |
| OBS-ENV-04 | BDS、ローカルワールド | 成功 | manifest の依存は `@minecraft/server` だけ。実験的機能は不要 |
| OBS-ENV-05 | BDS | 成功（一部） | `127.0.0.1:19132` に参加できた。ループバックの例外が設定済みだったので、「例外なし」は示せていない |
| OBS-ENV-06、-07 | — | 未実施・対象外 | 公開範囲は変えていない。Phase 3 は却下したので、OBS-ENV-07 は対象外（ADR-0004） |
| OBS-ENV-01 | ローカルワールド（参考） | 観察 | 応答は `ContentLog*.txt` に欠けずに出るが、ファイルは約 4 KB ずつ書かれる |
| OBS-IN-01 | BDS | 成功 | 569 文字の行、JSON として読め、`requestId` が保たれる |
| OBS-IN-02 | BDS、ローカルワールド | 成功 | `INVALID_JSON`、`requestId` を回収 |
| OBS-IN-03 | BDS、ローカルワールド | 成功 | `teleport` → `UNKNOWN_METHOD`。ワールドでは何も起きない |
| OBS-IN-04 | BDS | ASCII のエスケープで成功 | コンソールに UTF-8 のまま送ると化ける。`\u30c6…` なら正確に届く。応答は ASCII にエスケープ（修正後） |
| OBS-IN-05 | BDS | ゲームの制限 | コンソール: 2048 文字を超えると、アドオンに届く前に BDS が拒否。チャット: 511 文字以上のコマンドでプレイヤーが切断。448 文字は通った |
| OBS-IN-06 | — | Phase 2 | `player` が必要 |
| OBS-PLY-01 | BDS | 成功（0 人と 1 人） | 2 人は未実施 |
| OBS-PLY-03 | — | Phase 2 | `player` が必要 |
| OBS-PLY-06 | BDS、ローカルワールド | 観察 | 同じアカウントの id が、ローカルワールドで `-4294967295`、BDS で `-8589934591`。id はワールド・セッションごとで、アカウントの id ではない |

Phase 2 — 2026-10-18 に同じ BDS で実施（アドオン 0.1.0、8 つの method すべて）。2 人目は `PlayerB` のアカウントで、`allowlist add` のあと LAN の別の機器から参加した。要求は BDS のコンソールから送った。

| ID | 結果 | メモ |
| --- | --- | --- |
| U-PROTO-11〜13 | 成功 | 全体で 66 件 |
| OBS-IN-06 | 成功 | コンソールから選択なしの `player` → `NO_SOURCE_PLAYER`。`{"name":…}` 付きなら、そのプレイヤー |
| OBS-PLY-01 | 成功 | 2 人とも、id とディメンション付きで並ぶ |
| OBS-PLY-02 | 実施不可 | 空白や日本語を含む名前のアカウントがない |
| OBS-PLY-03 | 成功 | 存在しない名前 → `PLAYER_NOT_FOUND`。退出の直後に名前と id で問い合わせ → どちらも `PLAYER_NOT_FOUND`、`players` は 1 人 |
| OBS-PLY-04 | 成功 | `execute in nether run tp …` のあと、`dimension` が `minecraft:nether`。そのあとオーバーワールドに戻した |
| OBS-PLY-05 | 成功 | スニーク中 → `sneaking: true`。ジャンプ 2 回で飛行 → `flying: true`、`onGround: false`。静止中は速度 0。ダッシュ（平地で Ctrl+W）→ `sprinting: true`、速度 0.28 ブロック/tick。水泳（一時的に作った深さ 3 の水場でダッシュ）→ `swimming: true`、`sprinting: true`、`inWater: true`、頭の位置は足の 0.3 上。水に入った直後は `inWater: true` だけ |
| OBS-PLY-06 | 成功 | 退出・再参加のあとも、BDS の再起動のあとも（同じワールド）、id は同じ。ワールドが違うと違う |
| OBS-BLK-01 | 成功 | `(-1,-64,-1)` → `minecraft:bedrock` と `states`。位置は要求した整数のまま |
| OBS-BLK-02 | 成功 | 空気 → `ok` と `minecraft:air`。遠いチャンク → `unloaded`。オーバーワールドの `y=320`・`-65` → `out_of_bounds`。ネザーの `y=128` → `out_of_bounds`（ネザーの高さは 0〜127）。プレイヤーが 1 人もいないと、スポーン地点も `unloaded` |
| OBS-BLK-03 | 成功（単体テスト） | 上限は U-PROTO-12 で確認。ゲーム内では、6 か所の混在した座標が順番どおりに返った |
| OBS-TGT-01 | 成功 | 地面を見る → ブロック `(0,-61,1)`、面 `Up`、面上の位置 |
| OBS-TGT-02 | 成功 | 地平線を見る → `block.hit: false` |
| OBS-TGT-03 | 成功 | `includeEntities` 付きでもう 1 人を見る → `entity.hit: true`、`minecraft:player`、`name`、距離 7.77 |
| OBS-TGT-04 | 成功 | `maxDistance` 65 → `LIMIT_EXCEEDED`。省略時は 8 が返る |
| OBS-ENT-01 | 成功 | 半径 32・件数 5 → 近い順に 5 件、`truncated: true`。中心のプレイヤー自身は除かれ、もう 1 人は `name` 付きで出る。`excludePlayers` で除かれる |
| OBS-SNP-01 | 成功 | 7 つの節が 1 つの応答に入り、`tick` は 1 つ、`errors: {}`。未知の節 → `INVALID_PARAMS`。`snapshot.entities` に `center` → `INVALID_PARAMS` |
| OBS-SIZE-01 | 成功 | インベントリ満杯（36 スタック）＋全節: エンティティを 14 件に縮め `omitted: {entities: 11}`。行は 3,965 文字で、標準出力に欠けずに出た |
| OBS-RO-01 | 成功 | 独立したケースとして実施。決まった状態（ブロック、防具立て、石 5 個、タグ、objective、効果、`doMobSpawning` false）を用意し、コンソールの問い合わせ 12 個（`testforblock` ×2、`testfor` で防具立て・`hasitem` ×2・ゲームモード・タグ、`querytarget`、`tag list`、`scoreboard players list`、`scoreboard objectives list`、`gamerule`）を取り、13 メソッドすべてを実行し（`bo-verify-ro-cases.json`、16 件とも期待どおり）、同じ問い合わせを取り直した。違いなし |
| OBS-PERF-01 | 成功 | 1 秒に 1 回 × 5 分で 300 件（`snapshot` と `entities` を交互）: BDS に届いた 297 件すべてに、`ok: true` の応答が 1 つずつ返った。警告・ウォッチドッグなし。3 件は、参考のブリッジのファイル経由の入力で失われ、BDS に届いていない（試験の道具の問題。`docs/knowledge/bds-local-server/` §8） |

出来事の通知 — 2026-10-18 に同じ BDS で実施。すべて成功: OBS-EVT-01（下の修正のあと）、-02（`cause` は `selfDestruct`、リスポーンは `initialSpawn: false`）、-03（クモ、`killer` は PlayerA、`cause` は `entityAttack`）、-04（ネザーへの移動は、クライアントの読み込みが終わった tp の約 19 秒後に通知された）、-05、-06、-07、-08（`reload` で新しい session、`seq` は 1 から）。見つけて直したこと: 参加のときに BDS が `Creative → Creative` を 2 回報告していた（`force-gamemode`）。変化のないものは送らないようにした。メモ: クリエイティブのプレイヤーは `/kill` で倒せない（先にサバイバルにする）。

Phase 2 の追加分 — 2026-10-18 に同じ BDS で実施（アドオン 0.1.0、メソッド 13 個）。PlayerA はフラットなオーバーワールドの
(0, -60, 0)。`bo-verify.ps1` で実行。

| ID | 結果 | メモ |
| --- | --- | --- |
| U-PROTO-14、-15 | 成功 | テストは全部で 75 件 |
| CAP-01、EFF-01〜02、FLT-01〜07、ENT-01〜05、TOP-01〜05、TOPS-01〜03、SB-01〜09、REG-01〜02 | 成功 | 最終のビルドで 34/34。途中で見つけたこと: `tops` の 1 件が大きく 32 列では `maxResponseChars` に収まらないため、簡潔な形にした（TOPS-03 を追加）。objective のないワールドで `player` 付きの `scoreboard` が誤って `INVALID_PARAMS` を返していた（直して SB-09 を追加） |
| OBS-CMD-01〜05 | 成功 | operator 用のコマンド（ADR-0010 の版、BDS を再起動、`allow-cheats=false`）。コンソール → 応答あり。`member` → 「コマンドの権限レベルが正しくありません: to3izo_bo:query。」で、アドオンには届かない。`op` のあと → 応答あり、送った人が source player、チャットには何も出ない。`reload` のあと → 応答あり。回帰 34/34。試験のあと `permissions.json` をバックアップから戻した |
| ブリッジの再試験 | 成功 | `bds-console-bridge.ps1` の修正（共有モードで読む、改行で終わった行だけ送る）のあと、4 回の実行で 131 件を送り、131 件とも応答があった。取りこぼしなし |

リリース 1.0.0 — 2026-10-18 に同じ BDS（1.26.52.3）で、`dist/be-observer-1.0.0.mcaddon` を README の手順どおりに入れて実施した。`behavior_packs/` と `resource_packs/` に展開し（0.1.0 の開発用パックはよけた）、既存のワールド `addon-lab-flat` の `world_*_packs.json` を `[0,1,0]` から `[1,0,0]` にした。要求は `bds-console-bridge.ps1` 経由。プレイヤー PlayerA は同じ VM から参加。

| ID | 結果 | メモ |
| --- | --- | --- |
| S-01 / S-02 / S-05 | 成功 | `Pack Stack - [00] Bedrock Observer [BP] … version: 1.0.0 @ behavior_packs/be-observer_BP`。`scripts loaded` が 1 行。アドオンの警告・エラーなし。`capabilities` の `addon.version` が `1.0.0` |
| S-03 | 成功 | コンソールの `reload` で `session` が新しくなり、`scripts loaded` が 1 行。要求 1 つに応答 1 つ |
| S-04 | 成功 | 退出と再参加で `player_leave`、`player_join`・`player_spawn` の通知。プレイヤーの id は同じ（`-8589934591`） |
| 0.1.0 → 1.0.0 の更新 | 成功 | 0.1.0 の開発用ビルドで使っていたワールド。変えたのは `world_*_packs.json` のパックのバージョンだけ |
| 回帰（`bo-verify-cases.json`） | 成功 | 34/34 |
| 全メソッド（`bo-verify-ro-cases.json`） | 成功 | 前提の状態（3,-60,3 のダイヤモンドブロック、防具立て、PlayerA の得点がある objective `bo_ro`）を用意して 16/16。あとで片付けた。用意しないと 5 件が失敗する（ケースの前提） |
| コンテンツログ | 問題なし | `ERROR` の行は、試験の片付けのコマンド（対象のない `kill`、ない objective の `scoreboard objectives remove`）への BDS の返事だけ |

リリース 1.0.1 — 2026-10-18 に同じ BDS で、`dist/be-observer-1.0.1.mcaddon` を開発用のフォルダに展開し（1.0.0 と入れ替え）、`world_*_packs.json` を `[1,0,1]` にして実施した。1.0.0 からの変更は、パックのアイコンと文書だけ（スクリプトの違いは `ADDON_VERSION` だけ）。

| ID | 結果 | メモ |
| --- | --- | --- |
| S-01 / S-02 / S-05 | 成功 | `Pack Stack … version: 1.0.1`。`scripts loaded` が 1 行。`capabilities` が `1.0.1` |
| S-03 | 成功 | `reload` で `session` が新しくなり、`scripts loaded` が 1 行。要求 1 つに応答 1 つ |
| 1.0.0 → 1.0.1 の更新 | 成功 | 同じワールド。変えたのは `world_*_packs.json` のパックのバージョンだけ |
| 回帰（`bo-verify-cases.json`） | 成功 | 34/34。1 回目は、アドオンではなくワールドの原因で 6 件が失敗した。スポーンの近くに穴（夜にサバイバルで撮影したあと）ができていて、試験のブタが地面の中に出て、(0,0) の列も変わっていた。`tops` で穴を調べ、`fill … replace air` で埋めて、再実行で成功 |
| コンテンツログ | 問題なし | 試験の片付けのコマンドへの BDS の返事だけ |
| パックのアイコン | ゲーム内では未確認 | BDS はアイコンを表示しない。PNG は 256×256 |

1.1.0 の開発用ビルド — 2026-10-18 に同じ BDS（1.26.52.3）で、開発用のパックを `pnpm build` の出力に入れ替えて実施した（`addon.version` は 1.0.1 のまま。ローカルビルドには番号を付けない、ADR-0013）。プレイヤー PlayerA は同じ VM から参加。要求は `bds-console-bridge.ps1` 経由。

| ID | 結果 | メモ |
| --- | --- | --- |
| U-EVT-05〜06、U-PROTO-16〜17、U-BUILD-01 | 成功 | 全体で 81 件 |
| OBS-OPT-01、-02、-13 | 成功 | スクリプトでも確認（最終のビルドで `bo-verify-optional-cases.json` 21/21） |
| OBS-OPT-03 | 成功 | クリエイティブ: (1,-61,0) の草ブロックを壊し、`item` は `minecraft:dirt`。そこに土を置き、`states` は `{dirt_type: normal}`。置いたときは `item_use`（土）も出た。最初のビルドで実施（この種類のコードは、そのあと変えていない） |
| OBS-OPT-04 | 成功 | プレイヤーが叩いたブタ: `attacker` がプレイヤー、`health` 9/10。プレイヤーの関わらないブタの `fall`: 出ない。ブタが叩いたプレイヤー（サバイバル）: `attacker` がブタの `entity_hurt`。叩かれた 1 tick 後の 2 回目のダメージは出なかった（ゲームの無敵時間で、ダメージ自体がない）。あとでの `fall` は出た |
| OBS-OPT-05 | 成功 | 分かったこと: その種類の効果がないときだけ出る（移動速度上昇 II がかかっている間に付け直す・III に上げる、では出なかった）。スクリプトのケースは、先に効果を消す |
| OBS-OPT-06 | 成功 | 雪玉: `item_use`（`amount` 4）と雪玉の `entity_spawn`（`Spawned`） |
| OBS-OPT-07 | 成功 | クリスタル: `impactedBlocks` 0。(20,-60,20) の TNT: 95 ブロック、`bounds` (17,-63,17)〜(23,-61,23)、そのあとアイテムの出現が 5 件。穴は埋め戻し、`tops` で確かめた。爆発元は一度も読めなかったので、`location` を通知から除いた |
| OBS-OPT-08 | 修正のあと成功 | API は `overworld` を返す。通知には完全な ID `minecraft:overworld` を書くようにした |
| OBS-OPT-09 | 成功 | 近いブタは出た（`Spawned`）。60 ブロック先のブタと、参加のときに読み込まれたモブは出なかった。自然なスポーンが ON だと、25 ブロック先に出たスライムが通知された（正しい動き）ので、スクリプトのケースは自然なスポーンを止める |
| OBS-OPT-10 | 成功 | 連続の前に `entity_spawn` を OFF。OFF の間の効果と天気は保持されない |
| OBS-OPT-11 | 成功 | `reload` のあと: 新しい `session`、`enabled: []`、`events` は空。ON にし直すまで `effect_add` は出ない |
| OBS-OPT-12 | 成功 | 1 tick でブタ 30 頭: 20 行（`seq` 28〜47）。残りの 10 件と、同じ 1 秒の天気の変化 2 件は捨てた。次の `weather_change` に `dropped: 12`、27 からの `events` は `missed: true` で、一覧は収まるように切られた（`omitted: {events: 11}`） |
| OBS-BUILD-01 | 成功 | `23aec2ab6a45+dirty@20261018T142622Z` → ビルドし直して、動いているサーバーの開発用パックに上書きし、`reload`: `…@20261018T143212Z` |
| 回帰（`bo-verify-cases.json`） | 成功 | 最終のビルドで、追加の種類をいくつか ON にしたまま 34/34 |
| 追加のケース（`bo-verify-optional-cases.json`） | 成功 | 最終のビルドで 21/21（その前の 2 回は試験の準備が原因で失敗: 移動速度上昇 II がかかったまま、自然に出たスライム。ケースを直した） |
| 終了 | 成功 | プレイヤーは「セーブして終了」で退出。`stop` で「Quit correctly」 |

リリース 1.1.0 — 2026-10-19 に同じ BDS（1.26.52.3）で、`dist/be-observer-1.1.0.mcaddon` を開発用のフォルダに展開し（1.1.0 の開発用ビルドと入れ替え）、`world_*_packs.json` を `[1,0,1]` から `[1,1,0]` にして実施した。始める前に、昼にし、スポーンの近くの敵対モブを除き、`tops` でスポーンが平らなことを確かめた。

| ID | 結果 | メモ |
| --- | --- | --- |
| S-01 / S-02 / S-05 | 成功 | `Pack Stack … version: 1.1.0`。`scripts loaded` が 1 行。`capabilities` が `1.1.0` と `build` を返す |
| S-03 | 成功 | `reload` で `session` が新しくなり、`scripts loaded` が 1 行。要求 1 つに応答 1 つ |
| S-04 | 成功 | 退出と再参加で `player_leave`、`player_join`、`player_spawn`（`initialSpawn: true`）。プレイヤーの id は同じ |
| 1.0.1 → 1.1.0 の更新 | 成功 | 同じワールド。変えたのは `world_*_packs.json` のパックのバージョンだけ |
| 回帰（`bo-verify-cases.json`） | 成功 | 34/34 |
| 追加のケース（`bo-verify-optional-cases.json`） | 成功 | 21/21 |
| 全メソッド（`bo-verify-ro-cases.json`） | 成功 | 前提の状態を用意して 16/16。終わったあと片付けた |
| OBS-OPT-03、-06（クライアント） | 成功 | (1,-61,0) でブロックを壊して置いた: `block_break`・`block_place`・`item_use`。そのあと OFF に戻した |
| コンテンツログ | 問題なし | アドオンの警告・エラーなし。試験の準備と片付けのコマンドへの BDS の返事だけ |

1.2.0 の開発用ビルド（コンテナーの中身）— 2026-10-19 に同じ BDS（1.26.52.3）で、開発用のビヘイビアーパックを `pnpm build` の出力に入れ替えて実施した（`addon.version` は 1.1.0 のまま。ローカルのビルドには番号を付けない、ADR-0013）。プレイヤー PlayerA は同じ VM から参加した（operator ではなく member）。要求は `bds-console-bridge.ps1` から送った。

| ID | 結果 | メモ |
| --- | --- | --- |
| U-PROTO-18〜20 | 成功 | 全部で 86 件 |
| OBS-CON-01、-02 | 成功 | コンソールからのカスタムコマンド（`command:Server`）でも ON にできた |
| OBS-CON-03 | 成功 | プレイヤーとして `execute as` で送ると、`/scriptevent` でもカスタムコマンドでも `PERMISSION_DENIED`。member のチャットのコマンドは、ゲームが拒否した（「コマンドの権限レベルが正しくありません」）。operator のチャットは別に試していない（プレイヤーを operator にすると、サーバーの権限の設定が変わるため） |
| OBS-CON-04 | 成功 | プレイヤーとして樽を読めた。プレイヤーとして OFF にでき、そのあとは `FEATURE_DISABLED` |
| OBS-CON-05 | 成功 | 大きさは `docs/PROTOCOL.md` §5.16 のとおり。分かったこと: クラフターは、`replaceitem` で入れられるのに、Script API ではインベントリがない（`container: null`）。エンダーチェストは `replaceitem` でもコンテナーではない |
| OBS-CON-06 | 成功 | 分かったこと: ゲームの `replaceitem` も、どちらの半分からでも大きいチェスト全体を指す（それぞれの半分から書いたスロット 0 は同じスロット） |
| OBS-CON-07 | 成功 | `enchanted_golden_apple` × 54: 3,986 文字で切り詰めなし。`waxed_weathered_cut_copper_stairs` × 54: 46 件、`omitted.items` 8。`fromSlot` 46 でスロット 46〜53 が返った |
| OBS-CON-08 | 成功 | |
| OBS-CON-09 | 成功 | 読んでいる間のスクリーンショットで、ふたは閉じたまま。`reload` のあと、session が変わり `enabled: []` |
| OBS-CON-10 | 未実施 | `/place structure` はあるが、平らなワールドでルートテーブル付きのチェストのある構造物を置いて位置を突き止めるところまではしなかった |
| コンテナーのケース（`bo-verify-container-cases.json`） | 成功 | 21/21 |
| 回帰（`bo-verify-cases.json`） | 成功 | 34/34 |
| 追加のケース（`bo-verify-optional-cases.json`） | 成功 | 21/21 |
| コンテンツログ | 問題なし | `observer:` の警告なし。試験の準備のコマンドへの BDS の返事だけ |
| 終了 | 成功 | プレイヤーは「セーブして終了」で退出。`stop` で「Quit correctly」 |

## リリース前チェックリスト

このアドオンは BDS 専用（ADR-0006）なので、パッケージした `.mcaddon` を README の手順で BDS に入れて確かめる。最後の実施: 1.1.0、2026-10-19（上の結果）。

- [x] 対象バージョンの BDS（Windows）で、パッケージした `.mcaddon` からスモークテストがすべて通る
- [x] 別プラットフォーム: 対象外（BDS 専用。Linux の BDS は未確認と README に書いてある）
- [x] 既存ワールドで、前の版からの更新が問題なくできる（初回なので、0.1.0 の開発用ビルドから）
- [x] 回帰のケース（`bo-verify-cases.json`、`bo-verify-ro-cases.json`。1.1.0 からは `bo-verify-optional-cases.json` も）が通る
- [x] コンテンツログがきれいで、未参照リソースの警告が説明なしに残っていない
- [x] `docs/CONTENT.md` を確認し（1.1.0: 追加のイベントの種類と `subscribe` を載せた）、`CHANGELOG.md` を更新し、`pnpm version:set` を適用した
