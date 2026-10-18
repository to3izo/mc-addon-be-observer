# 共有コンテナ（エンティティの入れ物＋構造物の保存）

実験的機能なしで、「ブロックの見た目＋エンティティの入れ物」と「構造物による保存」を組み合わせる設計の検証結果です（`docs/SPEC.md` の S1〜S6）。
すべて Windows 11（VM）の Minecraft Bedrock（タイトル画面の表示 v26.52）、`@minecraft/server` 2.10.0、実験的機能すべてオフで確認しました。iOS 実機は未確認です。

## 背景（公式資料、2026-10 時点）

- ブロックの `minecraft:block_entity` の `container` は 1.26.50 でも実験的機能。使えない。
- Script API には、プレイヤーにコンテナ画面を開かせる関数がない。画面が開くのは、プレイヤーが `minecraft:inventory` を持つエンティティに触れたとき。
- 安定版の `world.afterEvents.entityContainerOpened/Closed` が使える（エンティティの種類で絞れる）。

## S1: エンティティの当たり判定とコンテナ画面

### カスタムエンティティの右クリックで 27 スロットの画面が開く（実機で確認済み、Windows）

- `minecraft:inventory` に `container_type: "container"`、`inventory_size: 27` を指定したカスタムエンティティを右クリックすると、バニラのチェストと同じ 3×9 の画面が開く。
- 画面のタイトルは「不明」になる（エンティティ名が反映されない）。タイトルをどうするかは未解決。
- `container_type: "minecart_chest"`（変種 b、d）は未確認。

### ブロックと同じ位置のエンティティが、ブロックより優先される（実機で確認済み、Windows）

- 当たり判定がブロックの選択範囲より大きい（1.02 × 1.02、変種 a）場合も、ブロックと同じ大きさ（0.875 × 0.875、変種 c）の場合も、右クリックはエンティティに当たる。ブロックの `onPlayerInteract` ではなく `playerInteractWithEntity` が発火する。
- 左クリック（クリエイティブでの破壊の操作）もエンティティに当たる。`entityHitEntity` が発火し、**ブロックは壊れない**。つまり、このやり方ではブロックを普通に叩いて壊せない。壊す操作はスクリプトで再現する必要がある。
- スニーク（Shift）しながらの右クリックでもチェストが開く。ブロックを持ってスニーククリックしても、チェストの隣にブロックを置けない。
- イベントの順序: `entityContainerOpened` → `playerInteractWithEntity`（after）→ `entityContainerClosed`。`playerInteractWithEntity` の after は、画面が開いたあとに来る。

### ブロックの設置・破壊とプロキシの連動（実機で確認済み、Windows）

- カスタムコンポーネントの `onPlace` で `dimension.spawnEntity` を呼ぶと、プロキシが出る（`system.run` で 1 tick 遅らせて実行）。
- `onBreak` は、`/setblock ... air destroy` で壊したときにも呼ばれ、プロキシも消えた。
- ワールドを保存して終了し、入り直しても、プロキシは残っていた（`minecraft:persistent`）。

## S2: 構造物にエンティティの持ち物を保存する

### エンティティだけを含む構造物の保存と復元（実機で確認済み、Windows）

- `world.structureManager.createFromWorld(id, dimension, cell, cell, { includeBlocks: false, includeEntities: true, saveMode: StructureSaveMode.World })`（1×1×1 の範囲、中にプロキシがいる）で保存し、`structureManager.place(id, dimension, cell, { includeBlocks: false, includeEntities: true })` で戻すと、持ち物ごとプロキシが 1 体生成される。生成には約 10 tick 待てば足りた。
- 保存したアイテムとの比較（種類、個数、名前、説明文、エンチャント、耐久値、`isStackableWith`）はすべて一致した。確認したのは、名前と説明文つきのダイヤの剣（鋭さ V、耐久力 III）、耐久値を減らした鉄のツルハシ、64 個のスタックと 16 個のスタック、名前つきのシュルカーボックス。
- **中身の入ったシュルカーボックス**（ダイヤ 5 個と金のリンゴ 7 個）も、保存して `clear` して復元したあと、設置して開くと中身が残っていた。
- ワールドを保存して終了し、入り直したあとでも、構造物（`status` で 1×1×1 と表示）から復元できた。剣の名前、説明文、エンチャント、ツルハシの耐久値、シュルカーの名前も残っていた。
- 復元でできるプロキシを別のプロキシの持ち物にコピーするには、`container.setItem(i, other.getItem(i))` で足りた。コピー元は `entity.remove()` で消せる。
- 未確認のもの: エンチャント本、ポーション、地図、バンドル、記入済みの本、旗、ロケット花火。革の上着の染色は、検証用コードで色が付いたか自体を確認していない。

### `scriptevent` の使い方（実機で確認済み）

- `/scriptevent <名前空間>:<コマンド>` を `system.afterEvents.scriptEventReceive`（`namespaces` で絞る）で受けられる。チャットから実行すると `sourceEntity` がプレイヤーになる。

## エンティティ定義の注意

### `minecraft:pushable` は format 1.26.30 のエンティティでは使えない（実機で確認済み、Windows）

- **症状（コンテンツログ）:** `components -> minecraft:pushable: this component was found in the input, but is not present in the Schema`。エンティティ全体が読み込めず、スクリプトの `spawnEntity` が `... is not a valid entity type` で失敗する。
- **対処:** 外す（押されない動きが既定）。押されるようにしたい場合は `minecraft:pushable_by_entity` / `minecraft:pushable_by_block` を使う。
- `minecraft:damage_sensor`（`deals_damage: "no"`）、`minecraft:physics`（`has_gravity: false`、`has_collision: false`）、`minecraft:persistent`、`minecraft:knockback_resistance`、`minecraft:type_family` は問題なく読み込めた。
- 同じエンティティ内で `component_groups` ＋ `events` を使い、`entity.triggerEvent` で当たり判定の大きさと入れ物の種類を切り替えられた。

## S3: 画面が途中で閉じるとき、「閉じた」イベントは発火するか

プロキシのコンテナを開いたまま、スクリプトで次の操作をして確認しました（`/scriptevent to3izo_sec:s3 <tp|kill|nether|remove> <秒>`）。ログの数字は tick です。

### 発火する（実機で確認済み、Windows）

- 通常に閉じる（Esc）: 発火する。
- **距離が離れる**（テレポートで 30 ブロック離れた）: 画面が閉じ、11 tick 後（テレポートが t=29698、`CLOSED` が t=29709）に `entityContainerClosed` が発火した。
- **プレイヤーの死亡**（サバイバルで `player.kill()`）: 画面が閉じ、10 tick 後に発火した（死亡の `entityDie` が t=34641、`CLOSED` が t=34651）。クリエイティブでは `player.kill()` で死なず、画面も閉じない（`/kill` の挙動とは別）。
- **ディメンション移動**（ネザーへテレポート）: 画面が閉じ、52 tick 後（テレポートが t=36489、`CLOSED` が t=36541）に発火した。

### 発火しない（実機で確認済み、Windows）

- **開いている最中にプロキシが `entity.remove()` で消えた**: 画面は閉じるが、`entityContainerClosed` は**発火しない**（`removed 1 proxy` のあと、10 秒以上待っても出なかった）。プロキシだけが消え、ブロックは残る（`status` で近くのプロキシが 0 になった）。
- そのため、プロキシを消す側（壊す処理、掃除の処理）が先に中身を保存してから消すこと。それ以外の経路（`/kill @e` など）で消えた場合は、このイベントでは検出できない。`world.beforeEvents.entityRemove` で中身を読めるかは未確認。

### 未確認

- 接続の切断中に開いていた場合（`playerLeave` と `entityContainerClosed` のどちらが来るか）。1 人で試せる方法がなく、複数人のワールドでの確認が必要。

## S4: 壊し方（プロキシを叩いて壊す）

プロキシが `entityHitEntity` を受けて壊す処理をスクリプトで再現しました（`breakmode progress`）。ダイヤのツルハシ、サバイバル。

### 長押ししても攻撃は1回しか入らない（実機で確認済み、Windows）

- 左ボタンを 8 秒押し続けても、`entityHitEntity` は 1 回だけだった。バニラのブロックのようにボタンを押し続けて壊すことはできず、**連打が必要**になる。
- 連打すると、クリックのたびに攻撃が入った。攻撃のクールダウンはなく、間隔は VMPal の自動クリックで約 5〜6 tick（0.25 秒）だった。人が連打する速さはこれより遅いことが多い。

### 「実際に掘った時間」を積み上げる方式は動く（実機で確認済み、Windows）

- バニラの式（硬度 22.5 × 1.5 ÷ 道具の速さ。ダイヤのツルハシで 4.2 秒）を、攻撃の間隔（1 回につき最大 12 tick）で積み上げる方式にした。約 5 tick 間隔で 17 回ほど叩くと壊れ、黒曜石 8 個が出た。
- **シルクタッチ**のツルハシで同じように壊すと、共有エンダーチェスト本体が 1 個出た。
- 壊れるときは、ブロックを空気にし、プロキシも消す必要がある（`block.setType("minecraft:air")` で足りた。`dig.stone` を鳴らした）。
- 連打の速さに結果が左右される。1 回あたりの積み上げに上限（12 tick）を付けたので、ゆっくり叩くほど回数が増える。固定の回数にするかどうかは設計の判断が要る。

### 固定回数の方式で決定（実機で確認済み、Windows）

- 連打が前提になるため、時間の積み上げではなく、**道具ごとの固定回数**にした（`docs/SPEC.md` 参照）。回数は、バニラの破壊時間（22.5 × 1.5 ÷ 道具の速さ。ツルハシ以外は × 5）を 0.55 秒で割り、3〜40 回に収める。ダイヤのツルハシで 8 回、ネザライトで 7 回、鉄で 11 回、石で 16 回、木で 31 回、素手で 40 回（上限）。2 秒空けると数え直し。
- サバイバルのダイヤのツルハシで 8 回叩くと壊れ、黒曜石 8 個が出た（`hit 1/8` から `hit 8/8`、約 5 tick 間隔）。計算は `scripts/shared/utils/break-hits.ts`（単体テストあり）。

### 未確認

- `instant` モード、クリエイティブでの 1 回破壊、アドベンチャー、素手（黒曜石 8 個）、ツルハシ以外の道具、エフィシェンシー。実装はあるが、実機では試していない。

## S5: 開閉音とフタを開けた見た目

### フタを開けた見た目は、ブロックの状態で切り替えられる（実機で確認済み、Windows）

- （初版。現在は下の「フタの開閉アニメーション」の整数の状態 `to3izo_sec:lid` に置き換え済み）ブロックに真偽値の状態 `to3izo_sec:open` を持たせ、ジオメトリに閉じたフタ（`lid_closed`）と開いたフタ（`lid_open`、ヒンジを軸に x 軸で -55 度回転）の 2 つのボーンを入れ、`minecraft:geometry` の `bone_visibility` を Molang の文字列（`"!q.block_state('to3izo_sec:open')"` と `"q.block_state('to3izo_sec:open')"`）で切り替えた。実験的機能なしで読み込めた。
- 状態は、`entityContainerOpened`（最初の 1 人）で true、`entityContainerClosed`（最後の 1 人）で false にした。`block.setPermutation(block.permutation.withState(...))` で足りた。`/scriptevent` で状態だけ切り替えても、フタが上がって後ろのヒンジで開く見た目になった。ちらつきは見えなかった。
- 状態が 1 つ増えるので、パーミュテーションは向き 4 × 2 = 8 種類。Marketplace の上限（1 万）には余裕がある。
- 開いたときのフタの角度（-55 度）は、実際には 70〜80 度ほどに見えた。好みに応じて調整する。
- 滑らかなアニメーションはできない（切り替えは一瞬）。

### バニラの開閉音の呼び出し（実機で確認済み。音そのものは未確認）

- イベント名はバニラの `sound_definitions.json` / `sounds.json` で確認した: `random.enderchestopen`、`random.enderchestclosed`（バニラの音量 0.5、ピッチ 0.9〜1.0）。
- `dimension.playSound("random.enderchestopen", 位置, { volume: 0.5, pitch: 0.9〜1.0 })` は、例外なく実行できた（開閉のたびに呼んだ）。VM の音は聞けなかったので、実際に鳴ったかどうかは**耳で未確認**。

## S6: 保存と復元の負荷

### 1 往復あたり約 2.6 ms、復元は次の tick で終わる（実機で確認済み、Windows 11 VM）

- 27 スロットすべてに、名前・説明文・エンチャントつきの剣とツルハシ、64 個のスタックを入れたプロキシで 20 往復した（`Date.now()`、1 ms 単位）。
  - `createFromWorld`: 平均 0.8 ms（最大 1 ms）
  - `place`: 平均 1.0 ms（最大 2 ms）
  - 復元されたプロキシが現れるまで: 平均 0.9 tick（最大 1 tick）。以前の検証コードで待っていた 10 tick は不要だった
  - 27 スロットのコピーとプロキシの削除: 平均 0.8 ms
  - 合計: 平均 2.6 ms（最大 3 ms）
- 画面が引っかかる様子はなかった。開閉のたびに行っても問題ない軽さ。
- 計測は Windows 11 の VM（12 コア）。スマートフォンなどの低性能な端末では、数倍かかる可能性がある。iOS 実機での確認は未実施。

## 見た目: エンダーチェスト風のテクスチャと粒子（実機で確認済み、Windows）

- バニラのエンダーチェストは、フタの縦縞・フタと胴体の間の暗い隙間・胴体中央の目・金の留め金・天面の斑点が特徴。これを、スカイブルーのパレットで一から描き起こした（`assets/textures/generate_shared_ender_chest.mjs`。バニラの画像は読み込まず、コピーも色替えもしていない）。胴体を暗く、フタを明るくすると、バニラらしいコントラストになった。
- 粒子は、プロキシの**クライアントエンティティ**で鳴らす。`animations` に `particle_effects` のキーフレーム（`animation_length` 1 秒のループ）を書き、`scripts.animate` で再生し、`particle_effects` でエミッターを割り当てる。エミッターは 1 秒で終わる（`emitter_lifetime_once`）ので、ループのたびに新しく出る。**スクリプトは要らず、サーバー側の負荷もない**。
- 粒子の定義（`emitter_shape_box` の `direction: inwards` ＋ `particle_initial_speed` ＋ `linear_drag_coefficient`）で、箱の外側から中心へ寄ってくる動きになった。画像はバニラの粒子アトラス（`textures/particle/particles`）をパスで参照している（コピーしていない）。
- **バニラの定義との比較**（`bedrock-samples` の `resource_pack/particles/end_chest.json`、1.26.50.4）: バニラは「1 個だけ出して 1 秒で終わる」エミッターで、**いつ・どこに・いくつ出すかは本体側の処理で、JSON には書かれていない**。1 個の粒子の動きだけが分かる。粒子は `particle_motion_parametric` で、チェストの上（高さ 1.0 付近）から 0.25〜1.25 ブロック外側の位置に現れ、約 2 秒かけて下へ沈みながら中心の近く（±0.25）に寄っていく。色は紫のランダムな明るさ（赤 0.4〜1.0、緑はその 0.3 倍、青は 0.9 倍）、大きさは 0.05〜0.07 で、出現直後は 0 から大きくなる。画像は粒子アトラスの 1 行目（8×8 の点〜雪の結晶形の 8 種類）から選ぶ。
- **粒子の色はバニラと同じ式**にした（実機で確認済み、Windows）: 赤 = 0.4〜1.0 のランダムな明るさ、緑 = 赤 × 0.3、青 = 赤 × 0.9（パープル〜ピンク）。`particle_appearance_tinting` の `gradient` に 1 つだけ式のキーを置き、`interpolant` を 0 にする書き方（バニラの `end_chest.json` と同じ）。アルファは寿命の終わりに向けて 0 にした（`1 - Math.pow(age / lifetime, 4)`）。式による色指定は問題なく動いたので、動きを `parametric` に変えたときに見えなくなった原因は、色の式ではない。
- 本アドオンの粒子は、同じ見た目の方向（外から中心へ寄る、約 2 秒で消える、粒子アトラスの 1 行目）を、`emitter_shape_box`（`inwards`）＋初速＋空気抵抗で表している（バニラは `parametric` だが、動きの式は自作）。数は 1 秒に 4 個、同時に最大 8 個前後で、バニラのスクリーンショットの密度に近い（本体側の出す頻度は不明なので、目で合わせた）。
- **`particle_motion_parametric` に書き換えると、粒子が見えなくなった**（実機で確認済み、Windows。コンテンツログにエラーは出ない）。式を線形に単純化しても、色を変えて並べても、同じだった。一方、元の `emitter_shape_box` 方式は表示された。原因は特定していない（サンプルの `basic_portal.json` などは `parametric` を使っているので、書き方の違いが原因とみられる）。バニラと同じ軌道にしたくなったら、`basic_portal.json` の書き方を土台に、1 つずつ変えて確かめる。
- **2026-10-12 の再調査（Windows）**: ①`end_chest.json` をそのまま写して、アニメーションで 1 秒に 6 回出した版、②粒子ごとの乱数だけで式を書き直した版、③式を 1 行ずつの最小の `parametric` にした版は、**すべて粒子が見えなかった**（コンテンツログにエラーなし）。一方、`emitter_shape_box` 版は表示された。このアドオンのようにクライアントエンティティから出す粒子では、`particle_motion_parametric` は使えないとみてよい。
- 代わりに、`emitter_shape_custom` で出現位置を式で決め、`particle_initial_speed` で中心へ動かした（バニラの軌道に近い）。注意点: `direction` は `"inwards"` ではなく、**3 つの式の配列**（文字列だとコンテンツログに `EmitterShapeCustomComponent | direction | error reading array`）。`offset` の式で `variable.ox = …; return variable.ox;` と代入しておけば、`direction` の式（`-variable.ox`、`-1.0`、`-variable.oz`）で同じ値を使える。
- 粒子の読み込みエラーは、「設定 → クリエイター → コンテンツ ログの履歴」と、ワールド入場時の画面表示に出る（`[Effects][error]-particles/…`）。粒子を直したら、必ずここを見る。
- 見ていて分かった点: 粒子は雪の結晶のような形の小さな点で、パープル〜ピンクの色でチェストの周りに漂う。数や大きさの好みは調整できる。

## 本実装で分かったこと（実機で確認済み、Windows）

- **`dimension.spawnEntity` は `is_summonable: true` のエンティティしか生成できない。** `false` にすると、`'...' is not summonable (is_summonable is set to false in the entity definition file)` で失敗する。プロキシをスクリプトで生成するので、`true` にする（`is_spawnable` は `false` のまま。プレイヤーが `/summon` で出すことはできるが、害はない）。
- **コンテナ画面のタイトルは、プロキシの `nameTag` に翻訳キーを入れると翻訳される**: `proxy.nameTag = "container.enderchest"`（バニラのキー）にすると、画面のタイトルが「エンダーチェスト」になった（それまでは「不明」）。名前タグのキーは、画面が言語ファイルで引くらしい。
- 名前タグを付けても、エンティティの頭上には名前が出なかった（`minecraft:nameable` で常時表示にしない限り、出ない）。ただし iOS ではカーソルを当てるとタッチ用の表示に名前（未設定だと翻訳キーそのまま）が出た。バニラのエンダーチェストでは出ないので、現在は名前タグを付けない（タイトルは「不明」になりうる）。

### 本実装の確認結果（Windows 11 VM、実験的機能なし）

- **画面のタイトル**は「共有エンダーチェスト」（日本語）で表示された。`nameTag` にブロック名の翻訳キー（`tile.to3izo_sec:shared_ender_chest.name`）を入れるだけでよい。
- **破壊**: サバイバルでダイヤのツルハシを持ち、連打して 8 回目で壊れ、黒曜石が出た。
- **補充**: `/kill @e[type=to3izo_sec:chest_proxy]` でプロキシを全部倒すと、約 10 秒以内にブロックの定期チェックが作り直し、開くと中身も無事だった。
- **レシピ**: サバイバルの作業台で、レシピブックに「共有エンダーチェスト」が現れ、`###/#E#/#S#`（ダイヤ 7 個、エンダーチェスト、調律されたスカルクセンサー）が自動で並び、取り出せた。解放条件はエンダーチェストの所持。

## まだ確認していないこと

- 実際に音が鳴るか（耳での確認）、複数人が同時に開閉したときのフタの状態、素早い開閉の連続。
- iOS 実機での動作と負荷。
- コンテナ画面のタイトルが「不明」になる問題の解決（名前タグは、iOS でカーソルを当てたときに文字が出るため外した。クリックの瞬間にだけ付ける方法は、before イベントでの書き込み禁止と、開いた後に付けても反映されないことで不可能だった）。
- iOS でカーソルを当てたときにプロキシの文字が出ないこと（名前を空にした翻訳と `minecraft:nameable` で確認予定）。

## フタの開閉アニメーション（2026-10-12、iOS 指摘で追加。iOS で見た目を確認済み）

- バニラのエンダーチェストはブロックエンティティがフタを滑らかに動かすが、実験的機能なしのカスタムブロックにはアニメーションがない。
- 代わりに、整数の状態 `to3izo_sec:lid`（0〜4）を持たせ、ジオメトリに角度の違うフタのボーン `lid_0`〜`lid_4`（0、13.75、27.5、41.25、55 度）を入れて、`bone_visibility` で `q.block_state('to3izo_sec:lid') == N` と切り替えた。
- 開閉の瞬間だけ、スクリプトが 2 ティックごとに状態を 1 つずつ進める（開くのに 8 ティック）。常時のスクリプトは動かさない。開いている途中で閉じても、現在の位置から戻る。
- 再起動などでフタが開いたまま残った場合は、10 秒ごとのブロックの定期チェックで、使用中でなければ閉じる。

## iOS 実機の確認結果（0.2.1、2026-10-12）

- クリエイティブの「アイテム」タブで、`menu_category` に `category: items` と `group: minecraft:itemGroup.name.chest` を書くと、チェスト一覧の最後尾（バニラのチェストの後ろ）に出た。`category: construction` のままだと「構築」タブに出る。バニラのチェスト類は「アイテム」タブにある。
- 4 段階のフタの動きは、見た目に問題なかった。音も問題なかった。
- 名前タグを外し、エンティティ名の翻訳を空にすると、カーソルを当てても文字は出なかった。画面タイトルは「不明」のまま。
- タッチ端末では、エンティティはタップが攻撃になり、「開く」ボタンか長押しで開く（チェスト付きトロッコと同じ）。
