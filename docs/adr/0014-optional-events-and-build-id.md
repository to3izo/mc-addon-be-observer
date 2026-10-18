# ADR-0014: 追加のイベントを要求で付け外しし（メモリだけに持つ）、`capabilities` にビルドの識別子を入れる

- 状態: 採用
- 日付: 2026-10-18
- 決定者: 運営（利用者が計画を承認）

## 背景
主な使い手は、Mac から VM の Minecraft を動かす AI エージェントのツールと、アドオンを試す開発者である。どちらも、効率に関わる次の 2 点が足りなかった。

- **行動の結果を、問い合わせずに知りたい。** 壊した・置いたブロック、受けたダメージなどは、いまは `block`・`player` を繰り返し問い合わせて推測するしかない。
- **配置したビルドが動いているかを知りたい。** 配置のあとに `/reload` を忘れた、古いパックが残っていた、などを、ツールが見分けられない。

どちらも ADR-0009 で後回しにした候補（`docs/ROADMAP.md`「後回し・検討の候補」）である。イベントの ON/OFF を後回しにした理由は、「設定を保存するにはワールドに書く必要がある」だった（ADR-0008 の決定 7、ADR-0009）。

## 決定

### 追加のイベント
1. 次の 8 種類を、**追加のイベント**として足す。どれも安定版 `@minecraft/server` 2.10.0 の `world.afterEvents` で取れる。
   - `block_break`（`playerBreakBlock`）
   - `block_place`（`playerPlaceBlock`）
   - `entity_hurt`（`entityHurt`）
   - `effect_add`（`effectAdd`）
   - `item_use`（`itemUse`）
   - `explosion`（`explosion`）
   - `weather_change`（`weatherChange`）
   - `entity_spawn`（`entitySpawn`）
2. 追加の種類は、**起動時はすべて OFF** にする。新しいメソッド `subscribe`（引数 `enable`・`disable`）で付け外しする。引数がなければ状態を返すだけ。
3. ON/OFF の状態は**メモリだけ**に持ち、ワールドには書かない（dynamic property も使わない）。`/reload` と再起動で、すべて OFF に戻る。ツールは、`session` が変わったことで気づき、`subscribe` を送り直す。
4. 状態はサーバーに 1 つで、要求を送れる全員で共有する。
5. ADR-0008 の 7 種類は、これまでどおり常に出す。切り替えられない（`subscribe` で指定すると `INVALID_PARAMS`）。
6. 量を抑える。
   - 頻度の上限（毎秒 20 件）・保持（64 件）・連番は、常時の種類と共有する。意味は変えない。
   - 種類ごとの絞り込み:
     - `entity_hurt` は、プレイヤーが受けたか、プレイヤーが与えたダメージだけ（`entity_die` と同じ考え方）
     - `effect_add` はプレイヤーだけ。ゲームの購読のオプション `entityTypes` で絞る
     - `entity_spawn` は、プレイヤーから `eventPlayerRadius`（32）ブロック以内だけ。チャンクと一緒に読み込まれたもの（`cause: Loaded`）は除く
   - `explosion` は、壊したブロックの数と範囲（`bounds`）だけを返し、ブロックの一覧は返さない。
7. 購読は、ほかのイベントと同じく `register()` で 1 回だけ行う。OFF のときは、ハンドラーの先頭で何も読まずに返す。
8. `capabilities` に `optionalEvents: { kinds, enabled }` と `limits.eventPlayerRadius` を足す。`capabilities.events` は、常時の 7 種類のまま。
9. ディメンションは、ほかと同じく完全な ID（`minecraft:overworld`）で書く（`weatherChange` は `overworld` を返すため）。

### ビルドの識別子
10. `capabilities.build` を足す: `{ id, time, commit, dirty }`。
    - `commit`: git の短いハッシュ（12 文字）
    - `dirty`: コミットしていない変更があったか
    - `time`: バンドルした時刻（UTC）
    - `id`: `<commit>[+dirty]@<YYYYMMDDTHHMMSSZ>`
11. 値は `tools/build.ts` が git のコマンドで読み、esbuild の `define` で埋め込む。npm の依存は足さない。
    - git がなければ、`commit`・`dirty` は `null`、`id` は `nogit@…` にする。
    - バンドルしないコード（単体テスト）では `id: "unbundled"` にする。
12. 同じコミットでも、ビルドし直せば `id` が変わる（時刻を含むため）。

### バージョン
13. どれも互換な追加なので、`protocol` は 1 のまま。アドオンは MINOR を上げる（1.1.0、ADR-0013）。

## 理由・検討した案
| 案 | 判断 | 理由 |
| --- | --- | --- |
| 新しいメソッド `subscribe` で切り替える | **採る** | 読むメソッド（`events`）と、状態を変えるメソッドを分けると、`events` の意味が変わらない |
| `events` の引数で切り替える | 採らない | 「最近のイベントを読む」要求に副作用が付き、紛らわしい |
| 状態を dynamic property に保存する | 採らない | ワールドに書く。読み取り専用（ADR-0003）に反し、アドオンを外したあともワールドに残る |
| 要求ごと・ツールごとに購読を分ける | 採らない | 出力は標準出力の 1 本で、受け手を区別できない。状態を共有と明記するほうが単純 |
| 追加の種類に、別の頻度の上限を設ける | 採らない | 上限の意味が増える。いまの `dropped`・`missed` で、取りこぼしは分かる |
| OFF のときは購読を外す（`unsubscribe`） | 採らない | scripts/AGENTS.md の規則 2（購読は `register()` で 1 回）に合わない。OFF のときは先頭で返すので、負担は小さい |
| ビルドの識別子を package.json の版だけにする | 採らない | 開発中のローカルビルドは番号を上げない（ADR-0013）ので、見分けられない |
| ビルドの識別子にハッシュ（ファイルの内容）を使う | 採らない | 識別子をバンドルに埋め込むと、内容のハッシュが循環する。コミット＋dirty＋時刻で目的は足りる |

採らなかった安定版のイベント（あとで、互換な追加として足せる）:

| イベント | 理由 |
| --- | --- |
| `blockExplode` | ブロック 1 つごとに出て量が多い。`explosion` の数と範囲で足りる |
| `entityHitEntity`・`entityHitBlock`・`entityHealthChanged`・`entityHeal` | 素振りや回復のたびに出る。結果は `entity_hurt` で分かる |
| `itemStartUse`・`itemStopUse`・`itemReleaseUse`・`itemCompleteUse` | チャージ（弓・食事）の段階ごとに出る。食べ終わりは次の候補 |
| `entityLoad`・`entityRemove` | チャンクの出入りで大量に出る |
| `playerInventoryItemChange` | 量が多い |
| コンテナーの開閉 | 後回しの「コンテナーの中身」と一緒に考える |

チャットは、安定版の API がない（ADR-0008）。

## 影響
- `docs/PROTOCOL.md`: §5.1（`build`・`optionalEvents`）、§5.9、§5.14（`subscribe`）、§10（追加の種類と、測定した注意点）
- `docs/SPEC.md`（16・17）、`docs/CONTENT.md`、`SECURITY.md`（追加のイベントでも、プレイヤーの行動と位置が出る）、README
- `docs/TESTING.md`: U-EVT-05・06、U-PROTO-16・17、U-BUILD-01、OBS-OPT-01〜13、OBS-BUILD-01
- 確認用のケース: `docs/knowledge/bds-local-server/scripts/bo-verify-optional-cases.json`
- ADR-0008 の決定 7（通知は常に出し、切り替えを作らない）は、常時の 7 種類に限った決定として残る。
- 読み取り専用の性質は変わらない。アドオンが持つ状態は、メモリの中だけ（最近のイベントと、追加の種類の ON/OFF）。

## 経過
- 2026-10-18: 計画を利用者が承認した。コミットは main に直接置く、と指示された。
- 2026-10-18: 実装し、BDS 1.26.52.3 で、OBS-OPT-01〜13 と OBS-BUILD-01 を確認した。回帰 34/34、追加のケース 21/21（`docs/TESTING.md`）。
  - 試験で分かり、直したこと:
    - `weatherChange` のディメンションが `overworld` だったので、完全な ID に直した（決定 9）
    - `explosion` の爆発元は、通知の時点でいつも無効で、位置が読めなかったので、`location` を除いた
  - 試験で分かったゲームの動き（`docs/PROTOCOL.md` §10 の注意点）:
    - `effect_add` は、その種類の効果がないときだけ出る
    - ブロックを置くと `item_use` も出る
    - 無敵時間中のダメージは出ない
- 2026-10-19: 利用者の指示で 1.1.0 として公開した。パッケージした `.mcaddon` で、リリース前チェックリストを通した（`docs/TESTING.md`）。
