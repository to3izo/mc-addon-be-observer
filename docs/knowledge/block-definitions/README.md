# ブロックの定義

以下の format_version は、`min_engine_version` 1.26.50 で動作したものです。

## まずコンテンツログを読む

ほとんどのミスは、ゲームを止めることなく、そのブロックの登録だけを静かに失敗させます。そのあと、そのブロックに触れているレシピや blocks.json の項目がすべてエラーになります。そのブロックについて**最初に**出る `[Blocks][error]` が原因で、残りはその連鎖です。連鎖の例は次のとおりです。
- `Recipe result malformed`
- `custom component … is not being used by a block`
- `block … used in a "blocks.json" file does not exist in the registry`

## `minecraft:item_visual` の bone_visibility は Molang の文字列で書く（実機で確認済み、iOS 1.26.50）

- `minecraft:item_visual.geometry` の中で `"bone_visibility": { "arm": true }` のように書くと、**ブロック全体**が拒否されます（`invalid string / expected an object / invalid numeric value`）。`"1.0"` / `"0.0"` で書いてください。
- ブロック本体の `minecraft:geometry.bone_visibility` では、`"q.block_state('ns:north') != 'none'"` のような Molang の文字列が動作しました。true/false は試していません。
- このテンプレートの `pnpm validate` は、`item_visual` の true/false を検出します。

## 実験的機能なしで「繋がるブロック」を作る（公式資料、2026-10 時点）

- `minecraft:connection` トレイト（フェンスのように接続状態を自動で持つ `minecraft:cardinal_connections`）は *Upcoming Creator Features* が必要なので、Marketplace では使えません。
- `minecraft:connection_rule`（バニラのフェンス・壁・鉄格子・板ガラスが、自作ブロック**に**繋がってよいか）は、ブロックの format 1.26.0 以降なら実験的機能なしで使えます。
- `minecraft:collision_box` は、1.26.0 から実験的機能なしで当たり判定を**配列**で複数指定できます（パーミュテーションごとに、柱と繋がった腕を指定する、など）。
- **うまくいった作り方:**
  - スクリプトの**カスタムコンポーネント**（`onPlace`、`onBreak`）でブロックの状態を設定する。`onBreak` は原因を問わず呼ばれる。
  - 自作ブロック以外の隣のブロックについては、`world.afterEvents.playerPlaceBlock` / `playerBreakBlock` で拾う。
  - 調べるのは隣の 4〜6 マスだけにし、状態が変わったときだけ `BlockPermutation.resolve(typeId, states)` で書き込む。
  - ピストン・爆発・火・コマンドによる隣の変化は拾えないので、その旨を文書に書いておく。
- ブロックの JSON でのカスタムコンポーネントは、`components` の下に `"<名前空間>:<名前>": {}` と書きます（ブロックの format 1.26.50 で動作）。スクリプト側では `system.beforeEvents.startup` → `blockComponentRegistry.registerCustomComponent` で登録します。

## シルクタッチのときだけドロップする（Windows の VM で実機確認済み。2026-10）

- ルートテーブルの `match_tool` でエンチャントを指定する書き方が、資料によって食い違っています（`{"enchantment": …, "levels": {…}}` と `{"silk_touch": {…}}`）。どちらも未確認です。
- 確実な代替策: ルートテーブルを空にし、`world.afterEvents.playerBreakBlock` を使う。このイベントには `itemStackBeforeBreak`（壊す前に持っていた道具）が入っています。
  - `getComponent("minecraft:enchantable")?.hasEnchantment("silk_touch")` で道具を確認する。
  - ゲームモードを確認する（`GameMode.Creative` なら何も落とさない）。
  - 条件を満たしたら `dimension.spawnItem` で落とす。

## クリエイティブでの並び順（実機で確認済み、iOS 1.26.50）

- 各ブロックの `menu_category.group` でバニラのグループに入れると、読み込み順（ほぼ識別子のアルファベット順）で末尾に並び、まとまりのない順になります。
- `BP/item_catalog/crafting_item_catalog.json`（`minecraft:crafting_items_catalog`）を使うと、既存のバニラのグループ（`"group_identifier": { "name": "minecraft:itemGroup.name.glass" }`）の末尾に、書いた順で追加できます。バニラのアイテムは元の順のまま先頭に並びます。バニラと交互に並べることはできません。
- 公式ドキュメントによると、ブロック側にも `menu_category` を書き、カタログで別の場所に置くとコンテンツの警告が出ます。カタログで配置するブロックには `menu_category` を書かないでください。

## レシピ（公式資料）

- レシピには必ず `unlock` が必要です（format 1.20.10 以降）。
- 石切台のレシピは `recipe_shapeless` に `"tags": ["stonecutter"]` を付けて書きます。同じ材料から複数のレシピを作れるので、ほかのアドオンとぶつかりません。
- 作業台では、材料の並びが同じレシピは1つしか有効にならないため、バニラのアイテムだけで作る形はほかのアドオンとぶつかります。材料に自作のアイテムを入れてください。

## 名前

- バニラの日本語名の例:
  - glass pane =「ガラス板」（「板ガラス」ではない）
  - stained glass =「<色>の色付きガラス」
  - tinted glass =「遮光ガラス」
- 名前は `bedrock-samples` の `texts/ja_JP.lang` から写してください（`vanilla-reference/` 参照）。

## クリエイティブの「アイテム」タブの「チェスト」グループに入れる（実機で確認済み、iOS 1.26.50）

- バニラのチェスト類は、クリエイティブの「**アイテム**」タブにある。`menu_category` を `{ "category": "items", "group": "minecraft:itemGroup.name.chest" }` にすると、**チェスト一覧の最後尾**（バニラのチェストの後ろ）に並んだ。
- `category: "construction"` のままにすると、グループ名がバニラのものでも、**「建築」タブ**に出る（タブが違うと、見つからない）。バニラの同等品が、どのタブにあるかを、先に確かめる。

## フタの開閉を、ブロックの状態の段階で滑らかにする（実機で確認済み、Windows・iOS）

- バニラのチェストのフタの動きは、ブロックエンティティ（実験的機能なしのカスタムブロックにはない）が動かす。代わりに、整数の状態（例: `<名前空間>:lid`: 0〜4）を持たせ、ジオメトリに角度の違うフタのボーン（`lid_0` 〜 `lid_4`、0 / 13.75 / 27.5 / 41.25 / 55 度）を入れ、`minecraft:geometry` の `bone_visibility` で `q.block_state('<名前空間>:lid') == N` と切り替える。
- スクリプトは、開閉の瞬間だけ、`system.runTimeout` で 2 ティックごとに状態を 1 つずつ進める（開くのに 8 ティック）。常時のスクリプトは要らない。進行中の動きは、別のセルごとの地図で管理し、反対の動きが来たら、現在の位置から戻す。
- 見た目は、iPhone で確認して「問題なし」だった。段階を増やせば、さらに滑らかになる。パーミュテーションは、向き 4 × 5 段階 = 20 で、上限（1 万）より、はるかに少ない。
- 再起動やクラッシュで、フタが開いたまま残る場合があるので、ブロックの定期処理（`minecraft:tick`）で、使用中でなければ閉じる。

## 名前の表示

- 見えないエンティティ（補助）に `nameTag` を入れると、**iOS のタッチ用の HUD で、カーソルを当てたときに、その名前（翻訳キー）が文字で出る**。バニラのブロックでは出ないので、気づかれる。`nameTag` は付けず、`minecraft:nameable` で `allow_name_tag_renaming: false` にし、エンティティ名の翻訳を空にする（`entity.<名前空間>:<名前>.name=`）。代わりに、コンテナ画面のタイトルが「不明」になる（`shared-container/` 参照）。
