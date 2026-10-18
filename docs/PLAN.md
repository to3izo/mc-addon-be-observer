# PLAN — 実装計画

Bedrock Observer を小さな段階に分けて作る計画です。2026-10-18 に承認され、Phase 1 のコードと自動テストまで進んでいます（ゲーム内の確認は未実施）。 仕様は `docs/SPEC.md`・`docs/PROTOCOL.md`、理由は `docs/adr/`、調査は `docs/RESEARCH.md`・`docs/knowledge/bds-local-server/` にあります。計画が終わったら、この文書は「完了した段階」の記録を残して短くするか、消します（決定は ADR に残っているため）。

## 段階

### Phase 1: 最小の経路（観測コア ＋ scriptevent ＋ JSON ログ）

目的: 要求が届き、1 行 JSON の応答が、通常ワールドと BDS の両方で**外部から読めること**を、最初に確かめる。ここが成り立たないと、後の機能が使えない。

| # | 作業 | ファイル |
| --- | --- | --- |
| 1-1 | プロトコルの純粋な部分: 要求の長さの検査、JSON の解析、`requestId` の回収、`method`/`params` の検証、封筒、1 行への直列化、サイズの上限と切り詰め、エラーコード | `scripts/shared/protocol/*.ts`（`@minecraft/*` を読み込まない） |
| 1-2 | method の振り分けの表と `capabilities` | `scripts/core/observation/registry.ts`、`capabilities.ts` |
| 1-3 | `players` | `scripts/core/observation/players.ts` |
| 1-4 | `scriptEventReceive`（名前空間 `to3izo_bo` に絞って購読）→ 振り分け → `console.*` に 1 行。`session`/`seq`/`tick`/`time` | `scripts/features/observer/index.ts`、`scripts/features/index.ts` に登録 |
| 1-5 | 単体テスト U-PROTO-01〜10、読み取り専用の検査 V-RO-01・V-DEP-01、バージョンの一致 V-VER-01 | `tests/unit/protocol-*.test.ts`、`tests/validation/read-only.test.ts`、`tests/validation/version-constants.test.ts` |
| 1-6 | ゲーム内: OBS-ENV-01〜05、OBS-IN-01〜07、OBS-PLY-01・03 | `docs/TESTING.md` に結果を記録 |
| 1-7 | 実測の結果で決めること: 出力に使う関数（`log`/`info`/`warn`）、`maxResponseChars`、ローカルワールドでの回収方法、BDS の標準出力の回収方法 | ADR-0003 の経過、`docs/knowledge/bds-local-server/` |

進み具合（2026-10-18）: 1-1〜1-7 を終えた。対象は BDS だけになった（ADR-0006）。
- BDS 1.26.52.3 で、`capabilities`・`players` の応答を標準出力から読めた。結果は `docs/TESTING.md` の「Results」。
- 実測で決めたこと:
  - 出力は `console.log`。BDS の `content-log-console-output-enabled=true` が必要。
  - 応答の行は ASCII だけにした（BDS のコンソールが CP932 のため）。
  - 要求は、コンソールから ASCII で送る。チャットで送るときは 448 文字以下にする。
- 残り（Phase 2 と一緒に行う）: 2 人での `players`（OBS-PLY-01）、公開範囲の確認（OBS-ENV-06。運用者が範囲を絞ったあと）。

完了の条件: `pnpm validate && pnpm build && pnpm test` が通る。BDS で `capabilities` と `players` の応答を、外部（標準出力）から読めた記録がある。制約は SPEC と PROTOCOL に書かれている。

### Phase 2: 主な観測、snapshot、公開仕様の確定

| # | 作業 |
| --- | --- |
| 2-1 | `player`（位置・頭の位置・回転・視線・速度・移動の状態・ゲームモード・選択スロット） |
| 2-2 | `block`・`blocks`（`isChunkLoaded`・`heightRange` で先に判定し、例外を `unloaded`/`out_of_bounds`/`error` に対応づける） |
| 2-3 | `target`（`getBlockFromViewDirection`、任意で `getEntitiesFromViewDirection`） |
| 2-4 | `entities`（半径・件数の上限、距離順） |
| 2-5 | 節: `health`・`inventory`・`equipment`・`world` |
| 2-6 | `snapshot`（節ごとのエラー） |
| 2-7 | ゲーム内: OBS-PLY・OBS-BLK・OBS-TGT・OBS-ENT・OBS-SNP・OBS-SIZE・OBS-RO・OBS-PERF |
| 2-8 | 上限値を実測で確定し、`PROTOCOL.md` から「draft」「provisional」を外して protocol 1 を確定。README（英・日）を利用者向けに書き直す |
| 2-9 | 判断: カスタムコマンド（チートなしの入口）を足すか（RESEARCH U5 を確かめてから）。Phase 3 に進むか（ADR-0004） |

完了の条件: Definition of Done（`AGENTS.md`）をすべて満たし、TESTING の結果が BDS とローカルワールドの両方で記録されている。

### Phase 3（必要と判断した場合だけ）: BDS 専用の通信アダプターと Mac 連携

- 前提: Phase 2 で「BDS の標準出力のログ回収では足りない」と判断し、ADR-0004 を「採用」にしたとき。
- 別のリポジトリの別のアドオン（server-net ＋ server-admin、Beta APIs を有効にした別の検証用ワールド）。コアには、要求の `"reply": "event"` に応じて `to3izo_bo:response` の script event を出す小さな追加だけを行う（互換な追加）。
- 送信側の規則: 送り先は 1 つ、外向きだけ、観測のメッセージだけ。同時要求は 1 件（`HttpRequestLimitExceededError` は同時実行の上限で、値は記載がないため）。送信待ちのキューは上限付き（古い観測を捨て、最新を優先）。定期送信は検証の初期値 2〜5 回/秒（公式の上限ではない）。再接続は待ち時間（指数バックオフ）付き。WebSocket は 1 本。
- 観測値に `session`・`seq`・`tick`・`time` を付け、受信側は受信時刻を記録する（VM と Mac の時計は同期していると仮定しない）。
- 検証: OBS-ENV-06・07、`docs/knowledge/bds-local-server/` §7。

## 外部ツールの責務（このアドオンが担わないこと）

`docs/PROTOCOL.md` §9 のとおり。要点:
- `/scriptevent` を送る（チャットへの入力、BDS の標準入力、コマンドブロック）。誰が送るかで `NO_SOURCE_PLAYER` とゲームの権限の判定が変わる。
- ログを回収し、`to3izo_bo.response ` を探して JSON を解析し、`requestId` で対応づける。タイムアウトは自分で持ち、応答がないことは「不明」として扱う。
- 受信時刻を自分の時計で記録する。観測とスクリーンショットが同時だとは仮定しない。
- 要求は 1 つずつ（多くても少数）送り、チャットやコンソールを埋めない。
- ログやコンソールを、ほかの利用者やネットワークに公開しない。

## Play Conductor 側への変更提案

Play Conductor の本体・`SECURITY.md`・ADR は、このリポジトリから参照できない。以下は、連携に必要な変更の**提案**で、Play Conductor の設計に合わせて取捨してください。

### A. Phase 1・2（ネットワークなし）で必要なもの

1. **観測アダプター（ツール内の部品）**: `capabilities` → 必要な method の呼び出し、`requestId` の採番（例: `pc-<連番>`、64 文字以内、`[A-Za-z0-9._:-]`）、タイムアウト（初期値の案: 2 秒。実測で決める）、`session` の変化（再読み込み）の検知、`protocol` の確認。
2. **送信の手段（推奨は (b)）**:
   - (b) BDS の標準入力に `scriptevent to3izo_bo:query <JSON>` を書く。チート不要で、プレイヤーの画面に何も出ない。ASCII だけで送る（日本語などは `\uXXXX`）。BDS は、標準入出力をつないで起動する（参考: `docs/knowledge/bds-local-server/scripts/bds-console-bridge.ps1`）。
   - (a) operator のプレイヤーのチャットに `/scriptevent …` を入力する。チートと operator が必要。コマンド全体で 448 文字以下（511 文字以上でプレイヤーが切断された）。入力は、クリップボードからの貼り付けが確実（`docs/knowledge/device-testing-windows-vm/`）。
3. **回収の手段**: BDS の標準出力（または、それを書き写したファイル）を VM から読む。例えば、参考のブリッジが書く `stdout.log` を VMPal の `exec` で読む方法がある。ほかに、標準出力を Mac と共有するフォルダへ書く方法もある（VM の `Z:` は今は読み取り専用）。応答の行は ASCII なので、文字コードを気にせず読める。BDS 自身のログ行（プレイヤー名など）は CP932 で書かれる。
4. **データの扱い**: 応答にはプレイヤー名が入るので、記録を外部に送らない・公開しない。

### B. Phase 3 を採る場合（VM 向けの小さな受信口）

1. **既存の汎用ローカル API は loopback（127.0.0.1）のままにする。** VM 用の受信口を、別のリスナーとして足す。
2. **bind**: VMPal のネットワーク側の Mac のアドレス（<VMPal のローカルネットワーク> のブリッジ）にだけ。`0.0.0.0` にしない（自宅の Wi-Fi に出てしまう）。
3. **接続元の制限**: VM のアドレス（例: <VM のローカル側のアドレス>）以外を拒否する（アドレスは偽装できるので、これだけを頼りにしない）。
4. **認証**: 推測困難な共有トークン（例: 32 バイト以上の乱数）を `Authorization` ヘッダーで受け、定数時間で比較する。トークンは Mac 側では OS のキーチェーンなど、BDS 側では `config/<アダプターの script モジュール UUID>/secrets.json`（`SecretString` で送る）に置く。**Git・パック・ワールド・スクリプトの定数・ログには置かない。** ワールドやパックの設定を秘密の置き場所とみなさない。トークンを替える手順も用意する。
5. **受け付けるもの**: 観測のメッセージの種類だけ（`observation` など）。それ以外は拒否する。受信口から Minecraft へ命令を送る経路は作らない（任意コマンドの実行なし）。
6. **制限**: 1 メッセージの最大サイズ（例: 16 KiB）、頻度（例: 10 回/秒を超えたら捨てる）、同時接続 1 本。超えたら拒否してログに数だけ残す。
7. **ログ**: トークンやヘッダーの値を出さない。拒否の理由と回数だけ。
8. **時刻**: 受信時刻を記録し、`tick`・`time` と並べて保存する。
9. **暗号化**: 平文の http/ws なら、同じネットワークの上で読まれうることを文書に書く。「内部ネットワークだから安全」とは説明しない。TLS を使う場合は、Mac 側の証明書の扱いと server-net の `force_tls` の設定（設定場所は未確認）を決める。
10. **health**: 状態の確認の口を作るなら、それにも認証を掛ける（既存 OSS B は認証なしだった）。

### C. BDS 専用の依存（server-admin など）を足すかの検討

- トークンを安全に送るには `@minecraft/server-admin` の `secrets`（`SecretString`）が要る。server-net と同じくベータで、Beta APIs の実験が必要。足すなら、アダプターのアドオン（別リポジトリ）だけに足す。観測コアには足さない（ADR-0004）。
- 依存の追加・実装は、Phase 3 の承認のあとに行う。

## 未確認の事項と、確かめる手順

| # | 項目 | 手順 | 段階 |
| --- | --- | --- | --- |
| 1 | BDS で `console.*` が標準出力に出るか、形式と 1 行の長さの上限 | 解決: 設定が必要。569 文字は欠けなかった（上限は未確認） | 1 |
| 2 | ローカルワールドのコンテンツログを、動作中にファイルで読めるか | 観察のみ（BDS 専用にしたので対象外） | — |
| 3 | `/scriptevent` のチートの要否（BDS の `allow-cheats=false`、コンソール） | 解決: コンソールは不要、プレイヤーはチート＋operator | 1 |
| 4 | 2048 文字を超えた message の扱い | 解決: コンソールは BDS が拒否、チャットは 511 文字以上で切断 | 1 |
| 5 | 同じ VM のクライアントから `127.0.0.1:19132` で接続できるか（NetherNet、例外設定なし） | 接続できた。ただし例外が設定済みで、「例外なし」は未確認（外すかは利用者の判断） | 1 |
| 6 | `Player.id` の安定性 | OBS-PLY-06 | 2 |
| 7 | レイの `maxDistance` の上限・既定値 | OBS-TGT-04 | 2 |
| 8 | カスタムコマンドに JSON を 1 引数で渡せるか | 試作して確認 | 2 |
| 9 | 公開範囲を絞ったあと、VM の外から接続できないこと | OBS-ENV-06（人が設定を変えたあと） | 運用者 |
| 10 | VM → Mac の到達性、Mac の待受アドレス | `bds-local-server/` §7 | 3 |
| 11 | server-net の上限値・許可リスト・`force_tls` の設定場所 | Phase 3 の試作 | 3 |

## 承認が必要な判断

**2026-10-18 に、下の 1〜8 を提案どおりで承認済み。** 3 と 4 は人が判断して行い、エージェントは BDS の設定を変えない（Phase 1 の開始時点で「BDS の設定変更はまだしない」と指示あり）。6 は提案どおり、最初のリリースの前に決め直す。

1. **この計画で Phase 1 に進むか。**（承認されるまで、機能の実装はしない）
2. **入口: Phase 1 は `/scriptevent` だけでよいか。** 公式資料では `/scriptevent` はチートが必要。ローカルワールドでチートを有効にすると実績が解除されなくなる。BDS の `allow-cheats=false` のままでは、プレイヤーからの要求が通らない見込み（コンソールからは未確認）。チートなしのカスタムコマンドを Phase 2 で追加するかは、実機の確認のあとに判断する案。
3. **Phase 1 の検証のために、BDS の設定を変えてよいか**（例: `allow-cheats=true` にする、`changesetting allow-cheats true` を使う、またはコンソールからだけ送る）。エージェントは変更しない。
4. **BDS の公開範囲を絞るか**（`docs/knowledge/bds-local-server/` §6。いまは自宅 LAN から到達しうる）。実行は人が行う。
5. **Phase 3（ADR-0004）**: 別リポジトリのアダプターという分け方でよいか。採るかどうかは Phase 2 の後で決めてよいか。
6. **ADR-0002**: 1.0.0 を「Marketplace 公開」のままにするか、「最初の安定した OSS リリース」に読み替えるか。
7. **上限値の初期値**（`maxRequestChars` 2048、`maxResponseChars` 4000、ブロック 32、レイ 64、半径 32、エンティティ 32）。Phase 1・2 の実測で調整する前提でよいか。
8. **公開時の README**: テンプレートの説明（英・日）を、Phase 2 の終わりに利用者向けに書き換える案でよいか。
