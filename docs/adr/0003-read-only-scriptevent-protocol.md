# ADR-0003: 読み取り専用の観測を、/scriptevent と 1 行 JSON ログで提供する

- 状態: 採用（プロトコルの細部は Phase 2 の終わりに確定する）
- 日付: 2026-10-18
- 決定者: 運営（承認待ちの項目は `docs/PLAN.md` の「承認が必要な判断」）

## 背景
外部の AI 操作ツール（例: Play Conductor）や人が、プレイヤーと周辺の世界の状態を、機械が読める形で取得したい。特定の AI・MCP・操作ツールに依存させず、通常のローカルワールドと BDS の両方で動かしたい。実験的機能は使わない（ADR-0001）。

## 決定
1. **読み取り専用。** スクリプトは読み取りの API だけを呼ぶ。コマンドの実行、ブロック・インベントリ・dynamic property・スコアボード・タグの変更、未ロード領域のロードはしない。
2. **入力は `/scriptevent to3izo_bo:query <JSON>`。** JSON は `requestId`・`method`・`params`（＋任意の `protocol`）。受け取りは安定版の `system.afterEvents.scriptEventReceive`。
3. **出力は `console.log` の 1 行 JSON。** 固定の接頭辞 `to3izo_bo.response ` で、人向けの診断行（`[be-observer] …`）と区別する。応答は `protocol`・`requestId`・`ok`・`tick`・`session`・`seq`・`time` と、`data` または `error`。
4. **責務を 3 層に分ける。** `scripts/shared/protocol/`（純粋なロジック: 検証・封筒・サイズ制限。`@minecraft/*` を読み込まない）、`scripts/core/observation/`（ゲームを読んで DTO にする）、`scripts/features/observer/`（scriptevent の受信とログの出力）。観測コアは入出力の方法を知らない。
5. **小さく保つ。** 件数・半径・距離・応答サイズに上限を設け、超えたら拒否するか、`truncated` を付けて切る。分割・再送・ページングは初版で作らない。
6. **プロトコルの版はアドオンの版と別。** 整数の `protocol`（互換性のない変更でだけ上げる）。対応機能は `capabilities` で返す。

## 理由・検討した案
- `/scriptevent` は安定版で、通常ワールドでも BDS でも同じ経路で使える。外部ツールは、チャットへの入力でも BDS の標準入力でも送れる。
- **カスタムコマンド（`CustomCommandRegistry`）**: 安定版にあり、`cheatsRequired: false` にすればチートなしで使える（`/scriptevent` は公式資料ではチートが必要。通常ワールドでチートを有効にすると実績が解除されなくなる）。一方、JSON を 1 つの文字列引数として渡せるか（引用符・空白の扱い）が未確認で、コールバックが restricted-execution で動く。そのため初版の入口は `/scriptevent` とし、カスタムコマンドは Phase 2 で実機確認してから、追加の入口として採るかを決める（承認事項）。
- **チャットへの出力（`sendMessage`/`tell`）**: プレイヤーの画面に出て、プレイヤーがいないと返せない（既存 OSS C の制約）。採らない。
- **`@minecraft/server-net` で直接送る**: BDS 専用・ベータ版で、ADR-0001 に反する。観測コアには入れない（ADR-0004）。
- **要求 ID を JSON の外（先頭）に置く形**（既存 OSS C）: 解析に失敗しても ID を返せる利点があるが、利用者の基本案（`requestId`・`method`・`params` の JSON）を優先し、解析に失敗したときは生の文字列から `requestId` を拾う方法で同じ利点を得る。
- 範囲の大量取得・差分配信・永続化は、ワールドと出力への負荷が読めないため、初版の対象外にした。

## 影響
- 公開仕様: `docs/PROTOCOL.md`。セキュリティの性質: `SECURITY.md`。
- `scriptevent` の権限（チートや操作権限が要るか）はゲームが決める。アドオンは独自の権限を足さない。
- 通常ワールドで、外部ツールがクライアントのコンテンツログを動作中に読めるかは未確認（`docs/knowledge/device-testing-windows-vm/` の既存の知見では、ファイルは動作中 0 バイトだった）。Phase 1 で最初に確かめる。読めなければ、通常ワールドでの機械的な回収は「人のデバッグ用（画面のログ）」に限られる。
- 上限値は実機で決め、`capabilities.limits` に出す。

## 経過
- 2026-10-18: 初期設定と調査のあとに決定（実装前）。計画（`docs/PLAN.md`）とともに承認された。
- 2026-10-18: Phase 1 を実装（ゲーム内は未確認）。出力は仮に `console.log`（`console.warn` はクライアントの画面のログに重なるため避けた）。最終の選択は Phase 1 の実測のあとに、ここに書く。要求の未知の最上位の項目は `INVALID_REQUEST` にした。
- 2026-10-18: BDS 1.26.52.3 で確認し、出力は `console.log` に決めた（`content-log-console-output-enabled=true` で、標準出力に `[Scripting]` 付きで遅れなく出る）。対象を BDS だけにした（ADR-0006）。
- 2026-10-18: BDS for Windows の標準出力がシステムのコードページ（CP932）で書かれ、日本語が化けると分かったので、応答の行を **ASCII だけ**にした（ASCII 以外の文字は `\uXXXX`）。要求も、コンソールから送るときは ASCII（`\uXXXX`）にするよう仕様に書いた。
- 2026-10-18: チャットからの長いコマンド（511 文字以上）でプレイヤーが切断されると分かった。ゲームの制限なのでアドオンでは防げない。`docs/PROTOCOL.md` に、チャットで送るときの長さ（448 文字以下）を書いた。
