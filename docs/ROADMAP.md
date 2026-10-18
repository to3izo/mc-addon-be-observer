# ROADMAP — 完成までの道のりと進捗

Bedrock Observer を最初の公開版（初回リリース）まで進めるための、チェックリストです。ここを見れば、どこまで終わっていて、次に何をするかが分かるようにします。

- **書き方:** 項目を終えたら `[x]` にし、根拠（`docs/TESTING.md` の結果、ADR、コミットなど）を添えます。項目を足したり外したりしたら、「現在地」の数も直します。
- **ほかの文書との役割分担:** 各段階の作業の中身と手順は `docs/PLAN.md`、決めたことと理由は `docs/adr/`、仕様は `docs/SPEC.md`・`docs/PROTOCOL.md`、ゲーム内の確認結果は `docs/TESTING.md` にあります。
- 最終更新: 2026-10-18（Phase 1 を BDS で確認したあと）

## 現在地

| 段階 | 進捗 | 状態 |
| --- | --- | --- |
| Phase 0: 初期設定・調査・計画 | 8 / 8 | ✅ 完了 |
| Phase 1: 最小の経路（scriptevent ＋ JSON ログ） | 9 / 11 | 🟡 ほぼ完了（残りは Phase 2 と一緒に） |
| Phase 2: 主要な観測機能とプロトコル v1 の確定 | 0 / 11 | ⬜ 未着手 ← **次はここ** |
| Phase 3: BDS からネットワークで送る仕組み（必要な場合だけ） | 0 / 5 | ⏸ Phase 2 のあとで要否を判断 |
| 初回リリース | 0 / 6 | ⬜ 未着手 |
| 運用・外部（このリポジトリの外の作業） | 2 / 6 | 🟡 一部 |

## Phase 0: 初期設定・調査・計画 ✅

- [x] アドオン情報の設定（`addon.config.json`、`pnpm init:addon`、UUID の生成）— コミット `c6e813e`
- [x] 名前・slug・名前空間の衝突の確認（`docs/ADDONS.md`、兄弟リポジトリ、公開情報）
- [x] ADR 0001・0002 の見直しと日付の記入
- [x] 既存 OSS の調査（`docs/RESEARCH.md` §1）
- [x] 公式 API と対象バージョンの互換性の確認（`docs/RESEARCH.md` §2）
- [x] ローカル BDS の環境の調査（`docs/knowledge/bds-local-server/`）
- [x] 仕様・プロトコルの草案・セキュリティ・テスト計画・実装計画（`docs/SPEC.md`、`docs/PROTOCOL.md`、`SECURITY.md`、`docs/TESTING.md`、`docs/PLAN.md`、ADR 0003〜0005）
- [x] 計画の承認（2026-10-18）

## Phase 1: 最小の経路 🟡

- [x] プロトコルの純粋な部分: 要求の検証、応答の形式（封筒）、サイズの上限と切り詰め、エラーコード（`scripts/shared/protocol/`）
- [x] `capabilities`
- [x] `players`
- [x] `/scriptevent` の受信と、1 行 JSON の出力（`scripts/features/observer/`）
- [x] 単体テストと、読み取り専用の検査（`pnpm test` 59 件成功）— コミット `9fb0782`
- [x] BDS で、応答を標準出力から読めることの確認（OBS-ENV-02。`content-log-console-output-enabled=true` が必要）
- [x] 要求の送り方と権限の確認（OBS-ENV-03。コンソールはチート不要、チャットはチート＋operator）
- [x] 実測で決めること: 出力は `console.log`、応答は ASCII だけ、チャットのコマンドは 448 文字以下（ADR-0003 の経過）
- [x] 対象を BDS だけにする（ADR-0006）
- [ ] 2 人のプレイヤーでの `players`（OBS-PLY-01。2 つ目のアカウントが必要）
- [ ] VM の外から BDS に接続できないことの確認（OBS-ENV-06。運用者が公開範囲を絞ったあと）

## Phase 2: 主要な観測機能とプロトコル v1 の確定 ⬜

- [ ] `player`（位置・頭の位置・回転・視線・速度・移動の状態・ゲームモード・選択スロット）
- [ ] `block` / `blocks`（未ロード・範囲外を、空気と区別して返す）
- [ ] `target`（視線の先のブロック。面と当たった位置。任意でエンティティ）
- [ ] `entities`（半径と件数に上限を付け、距離順）
- [ ] 追加の項目: `health`・`inventory`・`equipment`・`world`（時刻）
- [ ] `snapshot`（1 回の判断に必要な情報をまとめて取る。項目ごとにエラーを返す）
- [ ] 単体テストの追加（新しい引数の検証、切り詰め）
- [ ] BDS でのゲーム内のテスト（OBS-PLY・OBS-BLK・OBS-TGT・OBS-ENT・OBS-SNP・OBS-SIZE・OBS-RO・OBS-PERF）
- [ ] 上限値を実測で確定し、プロトコル v1 を確定する（`docs/PROTOCOL.md` から「draft」「provisional」を外す）
- [ ] 判断: チートなしで使えるカスタムコマンドの入口を足すか
- [ ] 判断: Phase 3 を採るか（ADR-0004 を「採用」か「却下」にする）

## Phase 3: BDS からネットワークで送る仕組み（必要な場合だけ）⏸

Phase 2 の判断で「採用」になった場合だけ進めます。「却下」なら、この段階は飛ばします。

- [ ] ADR-0004 の決定（採用 / 却下）
- [ ] （採用時）別リポジトリのアダプター（`@minecraft/server-net`・`server-admin`、Beta APIs を有効にした別の検証用ワールド）
- [ ] （採用時）コアの追加: 要求の `"reply": "event"` に応じて、`to3izo_bo:response` の script event でも応答する
- [ ] （採用時）Play Conductor 側の、VM 向けの小さな受信口（`docs/PLAN.md` の提案 B）
- [ ] （採用時）VM から Mac への、トークン付きの通信の確認（OBS-ENV-07）

## 初回リリース ⬜

- [ ] ADR-0002: 「1.0.0」の意味を決め直す（Marketplace 公開のままか、最初の安定した公開版か）
- [ ] README（英・日）を、テンプレートの説明から利用者向けの説明に書き換える
- [ ] バージョンを決めて `pnpm version:set`、`scripts/shared/constants/version.ts` と CHANGELOG を合わせる
- [ ] リリース前のチェックリスト（`docs/TESTING.md`）を BDS で通す
- [ ] `pnpm package` と、タグによる GitHub Release
- [ ] テンプレート側の `docs/ADDONS.md` に 1 行を足す

## 運用・外部（このリポジトリの外の作業）🟡

- [x] Windows VM への BDS の導入と、ワールド `addon-lab-flat` の作成（利用者）
- [x] BDS に開発用パックを入れ、`content-log-console-output-enabled=true` にする（2026-10-18。`docs/knowledge/bds-local-server/` §8）
- [ ] BDS の公開範囲を絞る（運用者。手順案は `docs/knowledge/bds-local-server/` §6）
- [ ] BDS を標準入出力をつないで常用する起動方法を決める（参考スクリプトは VMPal の exec では最大 24 時間で止まるので、タスク スケジューラなどにする）
- [ ] Play Conductor 側の、要求の送信と応答の回収の部品（`docs/PLAN.md` の提案 A）
- [ ] （任意）ループバックの例外なしでも接続できるかの確認（例外を外すかは利用者の判断）
