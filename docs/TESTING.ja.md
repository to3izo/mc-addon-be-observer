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
   4. *実験* を開き、すべてオフになっていることを確認します（Marketplace 向けのアドオンは実験的機能を使いません）。
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

### observer（scripts/features/observer）— Phase 1 実装済み

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
| OBS-ENV-07 | Phase 3 を採る場合だけ: アダプターから Mac の受信口へ、トークンあり・なしで送る | ありは受け付け、なし・誤りは拒否。ログにトークンの値が出ない |

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
| OBS-ENV-06、-07 | — | 未実施 | 公開範囲は変えていない。Phase 3 は未採用 |
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

## リリース前チェックリスト

- [ ] 対象バージョンの Windows（または主なプラットフォーム）で、スモークテストがすべて通る
- [ ] 少なくとも1つの別プラットフォーム（モバイル/コンソール）で表示と性能を確認した
- [ ] 既存ワールドで、前のリリース版からのアップデートが問題なくできる
- [ ] コンテンツログがきれいで、未参照リソースの警告が説明なしに残っていない
- [ ] `docs/CONTENT.md` と `CHANGELOG.md` を更新し、`pnpm version:set` を適用した
