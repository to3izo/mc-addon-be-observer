# ADR-0010: チートなしの入口として、operator 用のカスタムコマンドを足す

- 状態: 採用
- 日付: 2026-10-18
- 決定者: 運営（利用者の承認）

## 背景
プレイヤーのチャットから `/scriptevent` で要求を送るには、チートの有効化と operator の権限の両方が要る（ADR-0003）。普通のワールドでチートを有効にすると、実績が解除されなくなるなど、遊び方に影響が出る。安定版の API には、`cheatsRequired: false` にできるカスタムコマンド（`customCommandRegistry.registerCommand`）がある。

2026-10-18 に試作して、BDS 1.26.52.3 で次のことを確かめた（ブランチ `proto/custom-command`、`docs/knowledge/bds-local-server/`）。

- JSON は、引用符で囲み、中の `"` を `\"` にすれば、1 つの文字列引数で渡せる。
- 日本語も届く。
- 権限を「誰でも」にすると、チートなし・`member` のプレイヤーでも使える。

## 決定
1. `/scriptevent` に加えて、カスタムコマンド `to3izo_bo:query <json: string>` を 2 つ目の入口にする。
   - 応答・エラー・上限は `/scriptevent` と同じにする。
   - `capabilities.transport.requestCommand` でコマンド名を知らせる。
2. 権限は `CommandPermissionLevel.GameDirectors`（operator。コマンドブロックを含む）にし、`cheatsRequired: false` にする。
3. コールバックは restricted-execution で動くので、観測は `system.run` で次の tick に行う。
4. 成功したときに、チャットにメッセージは出さない。応答は、これまでどおり標準出力の 1 行だけにする。
5. `/scriptevent` の入口は、そのまま残す。

## 理由・検討した案
- **権限を「誰でも」にしなかった**: 観測の結果には、全員の名前・位置・持ち物が含まれる。誰でも使えると、一般の参加者がほかのプレイヤーを見られてしまう（`SECURITY.md`）。operator に絞れば、見られる人の範囲は `/scriptevent` と同じで、チートの有効化だけが要らなくなる。
- **`Admin`（コマンドブロックを除く）にしなかった**: `/scriptevent` はコマンドブロックからも送れるので、同じ範囲にそろえた。
- **チャットにメッセージを返さなかった**: 応答をゲーム内に送るのは、読み取り専用の原則（ADR-0003）の例外になる。チャットで答える機能は、ADR-0009 の候補（既定は OFF）として扱う。
- **入口を置き換えなかった**: コンソールと、ほかのパックからの `system.sendScriptEvent` は、`/scriptevent` の経路のほうが自然なため。

## 影響
- `docs/PROTOCOL.md` §1・§5.1・§9、`SECURITY.md`、`docs/SPEC.md`、README
- `docs/TESTING.md`（OBS-CMD-01〜05）
- カスタムコマンドは起動時にしか登録できない。新しく足したり引数を変えたりした版に更新するときは、`/reload` ではなく、BDS の再起動が要る。

## 経過
- 2026-10-18: 利用者が承認し、実装した。BDS 1.26.52.3 で確認した:
  - `member` は「コマンドの権限レベルが正しくありません」で拒否され、アドオンには届かない
  - operator はチートなしで使える
  - コンソールからも使える
  - 変更のない `/reload` のあとも使える
