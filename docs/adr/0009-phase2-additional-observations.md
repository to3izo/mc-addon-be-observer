# ADR-0009: Phase 2 に観測を 6 つ足し、残りの候補は後回しにする

- 状態: 採用
- 日付: 2026-10-18
- 決定者: 運営（利用者の指示）

## 背景
Phase 2 の 8 つのメソッドと出来事の通知（ADR-0008）で、AI のプレイヤーが周りを見る基本はそろった。使い方を検討すると、次の情報が足りなかった。

- 敵対モブだけ、名前の付いたモブだけ、のような絞り込み
- 見つけたエンティティを、あとから追いかけること
- 透明化や毒などの効果
- 地面の高さ（どこに立てるか、どこまで落ちるか）
- スコアボード（ミニゲームの得点など）

また、Script API の例外の多くが `INTERNAL_ERROR` になり、ツールが理由で分岐できなかった。

## 決定
1. 次の 6 つを足す（`docs/PROTOCOL.md` §5.7・§5.10〜5.13・§6）。
   - `entities`・`snapshot.entities` の絞り込み: `type`・`excludeTypes`・`families`・`excludeFamilies`・`name`・`tags`。ゲームの `EntityQueryOptions` にそのまま渡す
   - `entity`: id で 1 体を取る。読み込まれていなければ、新しいコード `ENTITY_NOT_FOUND`
   - 効果: 節 `effects`、`entity` の結果、`entities` の `includeEffects`
   - `top`・`tops`: 列の一番上のブロック。チャンクは読み込まない（`unloaded`）
   - Script API のエラーを、名前で安定したコードに変える。新しいコード `UNLOADED_CHUNK`。対応表は `@minecraft/server` を読み込まない純粋な層に置く
   - `scoreboard`: 目標の一覧、目標ごとの得点、プレイヤーごとの得点。読むだけ
2. `tops` の結果は、高さの地図向けの簡潔な形（`x`・`z`・`status`・`y`・`typeId`）にする。ブロックの状態は `top` か `block` で取る。
3. 次の候補は後回しにする（`docs/ROADMAP.md`「後回し・検討の候補」）。
   - 出来事の通知の購読の ON/OFF
   - コンテナーの中身の読み取り（既定は OFF。ON/OFF を切り替えられるようにする）
   - 範囲のブロックの読み取り（分割して少しずつ）
   - `capabilities` へのビルドの識別子
   - チャットの `tell` で応答する機能（任意。既定は OFF）
4. 検証の薄いラッパー `bo-verify.ps1` を、参考のスクリプトとして `docs/knowledge/bds-local-server/scripts/` に置く。ビルドの道具や `pnpm` のコマンドには入れない。

## 理由・検討した案
- **絞り込みをゲームに任せた**: 件数の上限（`limit`）の前に絞れるので、遠くの目的のモブが近くのほかのモブに押し出されない。値を変えずに渡すので、ゲームの意味と同じになる。
- **`ENTITY_NOT_FOUND` を分けた**: 読む途中で無効になった（`TARGET_INVALID`）のと、最初からいない（退出・死亡・未ロード）のとを、ツールが区別できるようにした。
- **`tops` を簡潔にした**: 状態まで含めると 1 列で約 190 文字になり、上限の 32 列では `maxResponseChars`（4,000）を超えた（試験で分かった）。上限まで頼んでも必ず 1 行に収まることを優先した。
- **エラーを名前で対応づけた**: `instanceof` だと対応表が `@minecraft/server` に依存し、単体テストができない。エラーの `name` は API の型名で、変わりにくい。
- **チャットの `tell` を既定にしなかった**: 応答をゲーム内に送ることは、ワールドへの書き込み（メッセージの送信）にあたり、読み取り専用の原則（ADR-0003）の例外になる。採るときは、既定を OFF にし、例外を ADR に書く。
- **ON/OFF の設定を後回しにした**: 設定を保存するにはワールドに書く必要がある（ADR-0008 の理由と同じ）。保存のしかたを決めてから、まとめて扱う。

## 影響
- `docs/PROTOCOL.md`（§4・§5・§6・§7）、`capabilities`（`methods`・`sections`・`limits.maxScoreEntries`・`defaults.scoreLimit`）
- `docs/TESTING.md`（U-PROTO-14・15、Phase 2 の追加分）
- `docs/knowledge/bds-local-server/`（`bo-verify.ps1`・`bo-verify-cases.json`）

## 経過
- 2026-10-18: 利用者の指示で実装し、BDS 1.26.52.3 で 34 のケースをすべて確認した。途中で、`tops` の 32 列が応答に収まらないと分かり、簡潔な形にした（決定 2）。
- 2026-10-18: 決定 3 の候補のうち、出来事の通知の ON/OFF と、ビルドの識別子を採った（ADR-0014）。ON/OFF は、ワールドに保存せずメモリだけに持つことで、保存の問題を避けた。
