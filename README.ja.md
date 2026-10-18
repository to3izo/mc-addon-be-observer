# Bedrock Observer

<!-- addon:start -->
| | |
| --- | --- |
| **Add-On 名** | Bedrock Observer |
| **スラッグ** | `be-observer` |
| **名前空間** | `to3izo_bo:` |
| **最小 Minecraft バージョン** | 1.26.50 |
| **説明** | プレイヤーや周辺世界の情報を読み取り専用の構造化データとして提供し、デバッグやAIエージェントによるプレイを支援する。 |
<!-- addon:end -->

> English: [README.md](README.md)

Minecraft 統合版の Bedrock Dedicated Server（BDS）向けの、**読み取り専用の観測アドオン**です。外部のツール（統合版を
遊ぶ AI エージェント、試験のスクリプト、アドオンを調べる人など）が JSON の要求を送ると、アドオンはサーバーの標準出力に
1 行の JSON で答えます。プレイヤーの位置と見ているもの、ブロック、周りのエンティティ、効果、地面の高さ、スコアボード、
そしてゲーム内の出来事を知らせます。

- **読み取り専用。** ワールドを変えません。コマンドも、値の書き込みも、チャンクの読み込みもしません（`SECURITY.md`）。
- **ツールに依存しない。** 入力は `/scriptevent`、出力はログの行だけです。AI のモデル、MCP、HTTP を前提にしません。
- **上限つき。** 要求ごとに、大きさ・件数・半径・距離の上限があり、`capabilities` で分かります。
- **安定版の API だけ。** `@minecraft/server` 2.10.0。実験的機能もベータ版の API も使いません。

> **状態: 公開前（0.1.0）。** すべてのメソッドを実装し、Windows 版 BDS 1.26.52.3 で確認済みです。
> プロトコル 1（`docs/PROTOCOL.md`）は確定しました。今後の版は、項目を足すか、プロトコルの番号を上げます。

## 必要なもの

| | |
| --- | --- |
| サーバー | Bedrock Dedicated Server（確認済み: Windows、1.26.52.3）。Linux 版の BDS でも動く見込みですが、未確認です。クライアントで開いたワールドと Realms には対応しません。 |
| ゲームの最小バージョン | 1.26.50 |
| `server.properties` | `content-log-console-output-enabled=true`（これがないと、スクリプトの出力が標準出力に出ません） |
| 実験的機能 | なし |

## BDS への導入

1. パックをビルドします（[ビルド](#ビルド)）。または、リリースの `be-observer-<version>.mcaddon` を zip として展開します。
2. `be-observer_BP` を `<BDS>/behavior_packs/`（または `development_behavior_packs/`）に、`be-observer_RP` を
   `<BDS>/resource_packs/`（または `development_resource_packs/`）にコピーします。
3. ワールドで有効にします。`worlds/<ワールド名>/world_behavior_packs.json` と `world_resource_packs.json` に、パックの
   UUID とバージョンを書きます。例:
   `[{"pack_id":"cbe4cdb9-3dc0-43c3-9750-a100b27a414e","version":[0,1,0]}]`（ビヘイビアーパック）、
   `[{"pack_id":"3d21d349-fedb-4dd4-8b7c-a7f130ea5fe7","version":[0,1,0]}]`（リソースパック）。
4. `content-log-console-output-enabled=true` にしてサーバーを起動します。ログに
   `[Scripting] [be-observer] scripts loaded` が出ます。

## 使ってみる

BDS のコンソールで（先頭の `/` は付けません。ASCII だけを使い、ほかの文字は `\uXXXX` で書きます）:

```text
scriptevent to3izo_bo:query {"requestId":"c1","method":"capabilities"}
scriptevent to3izo_bo:query {"requestId":"p1","method":"player","params":{"player":{"name":"Steve"},"include":["health","effects"]}}
```

要求 1 つに、標準出力の 1 行が必ず返ります（行の前に BDS の時刻が付きます）:

```text
to3izo_bo.response {"protocol":1,"requestId":"p1","ok":true,"method":"player","tick":144897,"session":"rohuvqp7","seq":4,"time":1792311918513,"data":{"id":"-8589934591","name":"Steve",...}}
```

応答と要求は `requestId` で突き合わせます。エラーは `"ok":false` と、決まった `error.code` で返ります。
ゲーム内の出来事は、要求がなくても `to3izo_bo.event {...}` の行で出ます。

プレイヤーのチャットからは、**operator** なら、チートを有効にしなくても、次のコマンドで同じ要求を送れます。引数は
JSON を `"` で囲んだもので、中の `"` はすべて `\"` と書きます。

```text
/to3izo_bo:query "{\"requestId\":\"p1\",\"method\":\"player\"}"
```

チャットからの `/scriptevent to3izo_bo:query {...}` も使えますが、こちらはチートの有効化も必要です。長いコマンドを
送るとそのプレイヤーが切断されるので、コマンド全体を約 448 文字以内にしてください。

## ツールから使う

アドオンは、ワールドを読んで行を書くだけです。要求を送り、行を回収するのはツールの役目です（`docs/PROTOCOL.md` §9）。BDS は、標準入出力をツールにつないで起動します。たとえば参考のブリッジ `docs/knowledge/bds-local-server/scripts/bds-console-bridge.ps1`（Windows）は、標準出力を `<BDS>\bo-bridge\stdout.log` に書き、`<BDS>\bo-bridge\stdin.txt` に追記された行をコンソールのコマンドとして送ります。

| ツールが動く場所 | 要求の送り方 | 応答の回収 |
| --- | --- | --- |
| BDS と同じマシン（例: 同じ Windows の PC のエージェント） | BDS の標準入力に `scriptevent to3izo_bo:query {...}` を書く（または `stdin.txt` に追記する） | 標準出力（または `stdout.log`）を読む |
| 別のマシン（例: Mac のエージェントと、Windows の VM の BDS） | VM の経路（VM の管理ツールのコマンド実行など）で `stdin.txt` に追記する。または operator のチャットに `/to3izo_bo:query "…"` を入力する | 同じ経路で `stdout.log` を読む |

アドオンにはネットワークで送る仕組みはありません（`@minecraft/server-net` は使わない。ADR-0004）。ネットワークで行を運ぶ必要があるときは、Minecraft の外のプログラムで送り、`SECURITY.md` に従ってください。

## 観測できるもの

| メソッド | 返すもの |
| --- | --- |
| `capabilities` | バージョン、メソッド、セクション、上限、既定値。最初に呼びます |
| `players` | ワールドにいるプレイヤー |
| `player` | 位置、頭の位置、向き、視線、速度、移動の状態、ゲームモード。任意で `health`・`inventory`・`equipment`・`effects`・`world`（時刻） |
| `block` / `blocks` | 座標で指定したブロック（`unloaded`・`out_of_bounds` を空気と区別します） |
| `target` | プレイヤーが見ているブロック（任意でエンティティ） |
| `entities` | プレイヤーか地点の周りのエンティティ。距離順。種類・ファミリー・名前・タグで絞れます。任意で効果も |
| `entity` | id で指定した 1 体のエンティティ |
| `top` / `tops` | 列の一番上のブロック（地面の高さ）。`tops` は簡潔な高さの地図 |
| `scoreboard` | objective の一覧、objective ごとのスコア、プレイヤーごとのスコア |
| `snapshot` | 1 人のプレイヤーについて、上のいくつかを 1 つの応答で |
| `events` | 最近の出来事を取り直す: 参加、退出、スポーン、プレイヤーに関わる死亡、ディメンション・ゲームモード・ゲームルールの変更 |

通信の形式、上限、エラーコードの詳細は **[docs/PROTOCOL.md](docs/PROTOCOL.md)** にあります。

取れないもの: チャットとコマンドの使用（安定版の API がないため）、画面、あらゆる入力。ワールドを変えることは、
設計として扱いません（`docs/SPEC.md` の Non-goals）。

## セキュリティ

観測の結果には、プレイヤー名・位置・インベントリが含まれ、サーバーの標準出力に書かれます。サーバーのコンソールと
operator は、すべてのプレイヤーを観測できます。ほかのプレイヤーは要求を送れません。ほかの人が参加するサーバーに
入れる前に、**[SECURITY.md](SECURITY.md)** を読んでください。

## ビルド

Node.js 22.18 以上と pnpm が必要です。

```bash
pnpm install
pnpm validate   # 型チェック、パックとプロトコルの規則
pnpm test       # 単体テスト（ゲームは不要）
pnpm package    # dist/be-observer-<version>.mcaddon と、パックごとの .mcpack
```

`pnpm build` は、展開した状態のパックを `dist/be-observer_BP/` と `dist/be-observer_RP/` に書きます。

## 文書

| 文書 | 内容 |
| --- | --- |
| [docs/SPEC.md](docs/SPEC.md) | アドオンがすること、しないこと（英語） |
| [docs/PROTOCOL.md](docs/PROTOCOL.md) | 要求、応答、メソッド、上限、エラーコード、出来事の行（英語） |
| [docs/TESTING.ja.md](docs/TESTING.ja.md) | テストケースとゲーム内の結果 |
| [docs/ROADMAP.md](docs/ROADMAP.md) | 進捗と、次にすること |
| [docs/adr/](docs/adr/) | 決めたことと理由 |
| [docs/knowledge/bds-local-server/](docs/knowledge/bds-local-server/) | BDS の設定の記録、コンソールのブリッジ、確認用スクリプト |
| [AGENTS.md](AGENTS.md) | このリポジトリで作業する人と AI エージェントのための規則（英語） |

## 貢献

Issue と Pull Request を歓迎します。先に `AGENTS.md` を読んでください。リポジトリの規則（UUID を変えない、名前空間、
読み取り専用の確認、コミット前の検証）が書いてあります。`pnpm validate && pnpm build && pnpm test` が通ること、
ゲームの動きを変えるときは `docs/TESTING.md` にゲーム内のテストケースを足すことが必要です。

## ライセンス

MIT。[LICENSE](LICENSE) を見てください。
