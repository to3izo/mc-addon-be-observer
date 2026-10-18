# 粒子（パーティクル）

共有エンダーチェスト（`mc-addon-shared-ender-chest`）で、バニラのエンダーチェストと同じ紫のきらめきを出したときの知見です。確認は、Windows 11（VM）の Minecraft Bedrock 1.26.50 と、iPhone です。

## ブロックから粒子を出す方法（実機で確認済み、Windows・iOS）

- カスタムブロックには、粒子を出す項目がない。代わりに、同じ位置にいる**クライアントエンティティ**から出す。
  - `entity/<名前>.entity.json` の `animations` に、`particle_effects` を持つアニメーションを置き、`scripts.animate` で再生し、`particle_effects` でエミッターを割り当てる。
  - アニメーションは `animation_length` 1 秒のループにして、キーフレームでエミッターを出す。エミッターは `emitter_lifetime_once` で 1 秒に終わるので、ループのたびに新しく出る。
  - スクリプトは要らず、サーバー側の負荷もない（クライアント側だけの処理）。
- 数は、`emitter_rate_steady` の `spawn_rate`（毎秒の個数）と `max_particles` で決めた（毎秒 10 個、同時に最大 12 個で、バニラの密度に近かった。目で合わせた）。

## `particle_motion_parametric` は、この方法では見えなかった（実機で確認済み、Windows）

- バニラの `end_chest.json` をそのまま写した版も、最小の書き方に直した版も、**粒子が見えなかった**（コンテンツログにエラーは出ない）。
- 原因は特定していない。バニラの粒子は、本体の処理が「いつ・どこに・いくつ」出すかを決めていて、`parametric` の式はその前提で書かれている可能性がある（推測）。
- 代わりに、`emitter_shape_custom`（出現位置を式で決める）＋ `particle_initial_speed`（中心へ動かす）で、バニラに近い軌道にできた。
  - `offset` は 3 つの式の配列。`variable.ox = …; return variable.ox;` と代入しておけば、`direction` の式でも同じ値を使える。
  - **`direction` は `"inwards"` ではなく、3 つの式の配列**（文字列だと、コンテンツログに `EmitterShapeCustomComponent | direction | error reading array`）。
  - 例: 出現位置を、チェストの横 0.25〜1.25 ブロック・上 1 ブロックにして、`direction` を `[-variable.ox, -1.0, -variable.oz]`（中心の下向き）にする。

## 色と大きさ（バニラと同じ式、実機で確認済み）

- 色は `particle_appearance_tinting` の `gradient` に、キーを 1 つだけ置き、`interpolant` を 0 にする書き方で、式による色指定が使える。
  - 赤 = `particle_random_1 * 0.6 + 0.4`、緑 = 赤 × 0.3、青 = 赤 × 0.9（パープル〜ピンク）。
- 大きさは、出現直後は 0 から大きくなり、消える前に小さくなる式にした: `(random * 0.02 + 0.05) * (1 - Math.Pow(1 - age/lifetime, 2))`。
- 画像は、バニラの粒子アトラス（`textures/particle/particles`）をパスで参照する（コピーしない）。1 行目の 8×8 の 8 種類から選ぶ。

## エラーの探し方

- 粒子の読み込みエラーは、「設定 → クリエイター → コンテンツ ログの履歴」と、ワールド入場時の画面表示に出る（`[Effects][error]-particles/…`）。粒子を直したら、必ずここを見る。
- 動きの確認は、スクリーンショットを連続で撮ると分かる（粒子が外から中心へ寄る、約 2 秒で消える）。
