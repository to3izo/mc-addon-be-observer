# ROADMAP — 完成までの道のりと進捗

Bedrock Observer を最初の公開版（初回リリース）まで進めるための、チェックリストと作業の中身です。ここを見れば、どこまで終わっていて、次に何をするかが分かるようにします。

- **書き方:**
  - 項目を終えたら `[x]` にし、根拠（`docs/TESTING.md` の結果、ADR、コミットなど）を添えます。
  - 項目を足したり外したりしたら、「現在地」の数も直します。
  - 決めたことと理由はここに書かず、ADR に書きます。
- **ほかの文書との役割分担:**
  - 段階の進め方・完了の条件・承認した判断: ADR-0007
  - 決めたことと理由: `docs/adr/`
  - 仕様: `docs/SPEC.md`・`docs/PROTOCOL.md`
  - ゲーム内の確認の手順と結果: `docs/TESTING.md`
  - 調べた事実: `docs/RESEARCH.md`・`docs/knowledge/`
- 最終更新: 2026-10-19（コンテナーの中身の読み取りを実装したあと。未公開）

## 現在地

| 段階 | 進捗 | 状態 |
| --- | --- | --- |
| Phase 0: 初期設定・調査・計画 | 8 / 8 | ✅ 完了 |
| Phase 1: 最小の経路（scriptevent ＋ JSON ログ） | 10 / 11 | 🟡 ほぼ完了（残りは運用者の作業待ち） |
| Phase 2: 主要な観測機能とプロトコル v1 の確定 | 20 / 20 | ✅ 完了（2026-10-18） |
| Phase 3: BDS からネットワークで送る仕組み（必要な場合だけ） | 1 / 1 | ⛔ 却下して閉じた（2026-10-18、ADR-0004） |
| 後回し・検討の候補 | 0 / 2 | ⏸ Phase 2 のあとで、採るかと時期を決める |
| 初回リリース | 6 / 6 | ✅ 完了（2026-10-18、1.0.0 を公開） |
| 1.1.0: 追加のイベントとビルドの識別子 | 3 / 3 | ✅ 完了（2026-10-19、1.1.0 を公開） |
| 1.2.0: コンテナーの中身の読み取り | 2 / 3 | 🟡 実装と BDS での確認が済み、公開は指示待ち |
| 運用・外部（このリポジトリの外の作業） | 2 / 7 | 🟡 一部 |

## Phase 0: 初期設定・調査・計画 ✅

- [x] アドオン情報の設定（`addon.config.json`、`pnpm init:addon`、UUID の生成）— コミット `53ca66e`
- [x] 名前・slug・名前空間の衝突の確認（テンプレートのアドオン一覧、同じ作者のほかのリポジトリ、公開情報）
- [x] ADR 0001・0002 の見直しと日付の記入
- [x] 既存 OSS の調査（`docs/RESEARCH.md` §1）
- [x] 公式 API と対象バージョンの互換性の確認（`docs/RESEARCH.md` §2）
- [x] ローカル BDS の環境の調査（`docs/knowledge/bds-local-server/`）
- [x] 仕様・プロトコルの草案・セキュリティ・テスト計画・実装計画（`docs/SPEC.md`、`docs/PROTOCOL.md`、`SECURITY.md`、`docs/TESTING.md`、ADR 0003〜0005）
- [x] 計画の承認（2026-10-18、ADR-0007）

## Phase 1: 最小の経路 🟡

目的は、要求が届き、1 行 JSON の応答を**外部から読めること**を、最初に確かめることです。完了の条件は ADR-0007 にあります。

- [x] プロトコルの純粋な部分（`scripts/shared/protocol/`。`@minecraft/*` を読み込まない）
  - 要求の長さの検査、JSON の解析、`requestId` の回収
  - `method`・`params` の検証、エラーコード
  - 応答の形式（封筒）、1 行への直列化（ASCII だけ）、サイズの上限と切り詰め
  - 振り分け
- [x] `capabilities`（`scripts/core/observation/capabilities.ts`。method の一覧は `scripts/shared/protocol/methods.ts`）
- [x] `players`（`scripts/core/observation/players.ts`）
- [x] `/scriptevent` の受信と 1 行 JSON の出力（`scripts/features/observer/`）
  - 名前空間 `to3izo_bo` に絞って購読する
  - 応答に `session`・`seq`・`tick`・`time` を付ける
- [x] 単体テストと読み取り専用の検査 — `pnpm test` で 59 件成功、コミット `669fd96`
  - 単体テスト: U-PROTO-01〜10
  - 検査: V-RO-01・V-DEP-01・V-VER-01
- [x] BDS で、応答を標準出力から読めることの確認（OBS-ENV-02。`content-log-console-output-enabled=true` が必要）
- [x] 要求の送り方と権限の確認（OBS-ENV-03。コンソールはチート不要、チャットはチートと operator が必要）
- [x] 実測で決めること（ADR-0003 の経過）
  - 出力は `console.log`
  - 応答は ASCII だけ（BDS のコンソールが CP932 のため）
  - 要求は、コンソールから ASCII で送る。チャットで送るコマンドは 448 文字以下
- [x] 対象を BDS だけにする（ADR-0006）
- [x] 2 人のプレイヤーでの `players`（OBS-PLY-01。2026-10-18、`PlayerB` で確認）
- [ ] VM の外から BDS に接続できないことの確認（OBS-ENV-06。運用者が公開範囲を絞ったあと）

## Phase 2: 主要な観測機能とプロトコル v1 の確定 ✅

使う API と注意点は `docs/RESEARCH.md` §2.2、応答の形は `docs/PROTOCOL.md` §5 にあります。

- [x] `player`（位置・頭の位置・回転・視線・速度・移動の状態・ゲームモード・選択スロット）— `scripts/core/observation/player.ts`
  - 対象のプレイヤーは `params.player` で選ぶ（`docs/PROTOCOL.md` §3）
- [x] `block` / `blocks` — `scripts/core/observation/block.ts`、`read.ts`
  - 先に `isChunkLoaded` と `heightRange` で判定する
  - 例外は `unloaded`・`out_of_bounds`・`error` に対応づける
  - 空気は、未ロードと区別して返す
- [x] `target`（`getBlockFromViewDirection` で、面と当たった位置を返す）— `scripts/core/observation/target.ts`
  - 任意で `getEntitiesFromViewDirection` も返す
- [x] `entities`（半径と件数に上限を付け、距離順に並べる。中心のプレイヤー自身は除く）— `scripts/core/observation/entities.ts`
- [x] 追加の項目: `health`・`inventory`・`equipment`・`world`（時刻）
- [x] `snapshot`（1 回の判断に必要な情報をまとめて取る。項目ごとにエラーを返す）— `scripts/core/observation/snapshot.ts`
- [x] 単体テストの追加（U-PROTO-11〜13、`tests/unit/protocol-options.test.ts`。全体で 66 件成功）
- [x] BDS でのゲーム内のテスト（OBS-PLY・OBS-BLK・OBS-TGT・OBS-ENT・OBS-SNP・OBS-SIZE・OBS-RO・OBS-PERF）
  - 2026-10-18 にすべて成功（`docs/TESTING.md` の Phase 2 の結果）。OBS-RO-01 は前後の比較を独立して実施、OBS-PLY-05 はダッシュ・水泳も確認
  - OBS-PLY-02 は、日本語の名前のアカウントがないので実施不可（日本語の名前の受け渡しは OBS-IN-04 とカスタムコマンドの試作で確認）
- [x] 上限値を実測で確定し、プロトコル v1 を確定する — 2026-10-18 に確定（`docs/PROTOCOL.md` の冒頭、ADR-0003 の経過）
  - `docs/PROTOCOL.md` から「draft」「provisional」を外した
  - 上限値は ADR-0007 の 7 のまま。実測では変える必要がなかった（ADR-0007 の経過）
- [x] README（英・日）を、テンプレートの説明から利用者向けの説明に書き換える（ADR-0007 の 8）
- [x] 判断: チートなしで使えるカスタムコマンドの入口を足すか → 足す。operator だけ、チートは不要（2026-10-18、ADR-0010）
  - 試作で確認（ブランチ `proto/custom-command`、`docs/knowledge/bds-local-server/`）: 引用符で囲めば JSON を 1 つの引数で渡せる。`/reload` では新しいコマンドを登録できず、BDS の再起動が要る
  - 実装と確認: `/to3izo_bo:query "…"`。BDS で OBS-CMD-01〜05（`member` は拒否、operator はチートなしで使える）
- [x] エンティティの絞り込み: `entities`（と `snapshot.entities`）に、種類・ファミリー・名前・タグで絞る引数を足す（例: `families: ["monster"]` で敵対モブだけ）— `docs/PROTOCOL.md` §5.7、BDS で FLT-01〜07
- [x] `entity`: id でエンティティを 1 体取る（`world.getEntity`）。見つからなければ新しいエラーコード `ENTITY_NOT_FOUND` — `scripts/core/observation/entity.ts`、BDS で ENT-01〜05
- [x] 効果: プレイヤーの節 `effects`、`entity` の結果、`entities` の `includeEffects` で、かかっている効果（透明化・毒など）を返す（`getEffects`）— BDS で EFF-01・02、FLT-02、ENT-01・02
- [x] 地面の高さ: `top`（1 列）と `tops`（複数の列）で、指定した x・z の一番上のブロックを返す（`getTopmostBlock`）— `scripts/core/observation/top.ts`、BDS で TOP-01〜05・TOPS-01〜03
  - `tops` は高さの地図向けに簡潔な形（`x`・`z`・`status`・`y`・`typeId`）にし、32 列が 1 つの応答に収まるようにした
- [x] エラーの名前での対応表: Script API のエラーを名前で安定したコードに対応づけ、`INTERNAL_ERROR` を減らす（新しいコード `UNLOADED_CHUNK` を含む）— `scripts/shared/protocol/errors.ts`、U-PROTO-15
- [x] スコアボードの読み取り: `scoreboard` で、目標の一覧・目標ごとの得点・プレイヤーごとの得点を返す — `scripts/core/observation/scoreboard.ts`、BDS で SB-01〜09
- [x] 確認用スクリプト（薄いラッパー）: 決まった要求のまとまりを BDS に送り、応答を判定して結果を JSON で残す（`docs/knowledge/bds-local-server/scripts/`。ビルドの道具には入れない）— `bo-verify.ps1` と `bo-verify-cases.json`。BDS で 34/34 成功（`docs/TESTING.md`）
- [x] 判断: 出来事（イベント）の通知を観測コアに足すか（`docs/RESEARCH.md` §2.2.1）→ 足す（2026-10-18、ADR-0008）
  - 安定版で取れるもの: 死亡、参加・退出・リスポーン、ディメンションの移動、ゲームモードの変更、ゲームルールの変更
  - 取れないもの: チャット（メンションを含む）とコマンドの使用。チャットは、操作ツールの画面読み取りか、ベータ版を使う別パックになる
  - 足す場合は、protocol 1 を確定する前に、通知の行の形（例: `to3izo_bo.event {...}`）と、取りこぼし対策（最近のイベントを取る method）を決める
- [x] 出来事の通知の実装: 7 種類の `to3izo_bo.event` 行と `events` メソッド（`scripts/core/observation/events.ts`、`scripts/shared/protocol/events.ts`）。BDS で OBS-EVT-01〜08 を確認（`docs/TESTING.md`）

## Phase 3: BDS からネットワークで送る仕組み（必要な場合だけ）⛔

2026-10-18 に、Phase 3 の採否を判断し、**却下**しました。理由と見直す条件は ADR-0004 にあります。観測を BDS のホストから Mac へ届ける課題は、Minecraft の外で扱います（下の「運用・外部」）。

- [x] ADR-0004 の決定（採用 / 却下）→ 却下（2026-10-18、ADR-0004）
  - 採用した場合の項目（別のリポジトリのアダプター、コアへの `"reply": "event"`、外部ツール側の受信口、VM から Mac へのトークン付きの通信の確認）は、行わないので外した
  - 見直す条件（server-net の安定版が出た、など）は ADR-0004 の「見直す条件」

## 後回し・検討の候補 ⏸

2026-10-18 に、Phase 2 のあとに回すと決めたものと、導入を検討する候補です。採るときは、ADR に決定を書いてから、Phase 2 か新しい段階に移します。

- [ ] 範囲のブロック取得（`system.runJob` で処理を分け、カーソルでページを分け、含める・除くブロックで絞る）。応答が後から返る仕組みが要る
- [ ] 任意の機能: チャット（`tell`）で応答する。要求したプレイヤーの画面に出る副作用があり、読み取り専用の方針（コマンドを実行しない）の例外になるので、既定は無効で、ADR で例外を決めてから

## 1.2.0: コンテナーの中身の読み取り 🟡

「後回し・検討の候補」から採った（2026-10-19、ADR-0015）。互換な追加なので、`protocol` は 1 のまま、MINOR を上げる（ADR-0013）。

- [x] ON/OFF の方式を決める — 起動時は OFF、メモリだけ。ON にできるのは BDS のコンソールだけ、OFF は誰でも。ON の間は、要求を送れる全員が読める。範囲は読み込み済みのチャンク（ADR-0015）
- [x] メソッド `features`・`container`、コード `PERMISSION_DENIED`・`FEATURE_DISABLED`、`capabilities.optionalFeatures` — BDS で OBS-CON-01〜10、確認用のケース 21/21（`docs/TESTING.md`）
- [ ] 1.2.0 のリリース（利用者の指示を待つ）

## 1.1.0: 追加のイベントとビルドの識別子 ✅

「後回し・検討の候補」から、すぐに効果がある 2 つを採った（2026-10-18、ADR-0014）。どちらも互換な追加なので、`protocol` は 1 のまま、MINOR を上げる（ADR-0013）。

- [x] 追加のイベントを、要求で付け外しする — メソッド `subscribe`、8 種類（`block_break`・`block_place`・`entity_hurt`・`effect_add`・`item_use`・`explosion`・`weather_change`・`entity_spawn`）。メモリだけに持ち、ワールドには書かない。BDS で OBS-OPT-01〜13（`docs/TESTING.md`）
- [x] ビルドの識別子を `capabilities.build` に入れる — `tools/build.ts` が commit・dirty・時刻を埋め込む。BDS で OBS-BUILD-01
- [x] 1.1.0 のリリース — `pnpm version:set 1.1.0`、`ADDON_VERSION`、CHANGELOG の `[1.1.0] - 2026-10-19`。パッケージした `.mcaddon` でリリース前チェックリストを通した（回帰 34/34、追加 21/21、全メソッド 16/16。`docs/TESTING.md`）。タグ `v1.1.0` で `release.yml` が添付

## 初回リリース ✅

- [x] ADR-0002: 「1.0.0」の意味を決め直す → 「外部で使える最初の公開版」（2026-10-18、ADR-0002）
- [x] バージョンを決める → 1.0.0
  - `pnpm version:set 1.0.0`、`scripts/shared/constants/version.ts`、CHANGELOG の `[1.0.0] - 2026-10-18`
- [x] リリース前のチェックリスト（`docs/TESTING.md`）を BDS で通す — 2026-10-18、パッケージした `.mcaddon` で全項目（回帰 34/34、全メソッド 16/16）
- [x] `pnpm package` と、タグによる GitHub Release — タグ `v1.0.0`、`release.yml` が `.mcaddon` と `.mcpack` を添付（2026-10-18）
- [x] リポジトリを OSS として公開する — 2026-10-18 に公開。ライセンスは MIT、`SECURITY.md` の窓口（非公開の脆弱性報告）を有効にした。公開の前に、履歴から環境の値とゲーマータグを除いた（ADR-0011）
- [x] テンプレート側のアドオン一覧に 1 行を足す（2026-10-18。一覧はテンプレートだけで管理し、このリポジトリからは消した）

## 運用・外部（このリポジトリの外の作業）🟡

- [x] Windows VM への BDS の導入と、ワールド `addon-lab-flat` の作成（利用者）
- [x] BDS に開発用パックを入れ、`content-log-console-output-enabled=true` にする（2026-10-18。`docs/knowledge/bds-local-server/` §8）
- [ ] BDS の公開範囲を絞る（運用者。手順案は `docs/knowledge/bds-local-server/` §6）
- [ ] BDS を、標準入出力をつないで常用する起動方法を決める
  - 参考のスクリプトは、VMPal の exec から起動すると最大 24 時間で止まる
  - タスク スケジューラなどにする
- [ ] （必要になったら）BDS のホストから Mac へ、観測の行を届ける方法を決める
  - Minecraft の外（ブリッジの側）で行い、ベータ版の API は使わない（ADR-0004）
  - ネットワークを使うなら、受信側は ADR-0004 の「受信側の条件」に従う。VM から Mac に届くかは `docs/knowledge/bds-local-server/` §7 で確かめる
  - ファイアウォールやネットワークの公開範囲を変えるときは、先に利用者に確認する
- [ ] （任意）ループバックの例外なしでも接続できるかの確認（例外を外すかは利用者の判断）

### 外部ツールを作るときの提案（ネットワークなし）

以下は、外部ツールの側で連携に必要な部品の提案で、ツールの設計に合わせて取捨してください。外部ツール一般の責務は `docs/PROTOCOL.md` §9 にあります。

1. **観測アダプター（ツールの中の部品）**
   - `capabilities` で対応を確かめてから、必要な method を呼ぶ。`protocol` も確かめる。
   - `requestId` を採番する（例: `tool-<連番>`。64 文字以内、`[A-Za-z0-9._:-]`）。
   - タイムアウトは、初期値の案で 2 秒（実測で決める）。
   - `session` が変わったら、スクリプトが読み直されたと判断する。
2. **送信の手段（推奨は (b)）**
   - (b) BDS の標準入力に `scriptevent to3izo_bo:query <JSON>` を書く。
     - チートが要らず、プレイヤーの画面に何も出ない。
     - ASCII だけで送る（日本語などは `\uXXXX`）。
     - BDS は、標準入出力をつないで起動する（参考: `docs/knowledge/bds-local-server/scripts/bds-console-bridge.ps1`）。
   - (a) operator のプレイヤーのチャットに `/scriptevent …` を入力する。
     - チートと operator が必要。
     - コマンド全体を 448 文字以下にする（511 文字以上でプレイヤーが切断された）。
     - 入力は、クリップボードからの貼り付けが確実（`docs/knowledge/device-testing-windows-vm/`）。
3. **回収の手段**
   - BDS の標準出力（または、それを書き写したファイル）を VM から読む。
   - 例: 参考のブリッジが書く `stdout.log` を、VMPal の `exec` で読む。標準出力を、Mac と共有するフォルダへ書く方法もある（VM の `Z:` は今は読み取り専用）。
   - 応答の行は ASCII なので、文字コードを気にせず読める。BDS 自身のログ行（プレイヤー名など）は CP932 で書かれる。
4. **データの扱い**: 応答にはプレイヤー名が入るので、記録を外部に送らない・公開しない。

## 未確認の事項

解決したものは `docs/RESEARCH.md` §2.6、`docs/TESTING.md` の結果、`docs/knowledge/` に記録してあります。ここには、まだ確かめていないものだけを置きます。

| # | 項目 | 確かめ方 | 段階 |
| --- | --- | --- | --- |
| 1 | チャットのコマンドで切断される長さの正確な境目（448 は通り、511 で切断） | 必要になったら二分探索 | 任意 |
| 2 | 公開範囲を絞ったあと、VM の外から接続できないこと | OBS-ENV-06（運用者が設定を変えたあと） | 運用 |
| 3 | ループバックの例外なしでも接続できるか | 例外を外して接続（利用者の判断） | 任意 |
| 4 | VM から Mac に届くか、Mac がどのアドレスで待ち受けるか | `docs/knowledge/bds-local-server/` §7 | 運用（ネットワークで届ける場合だけ） |
