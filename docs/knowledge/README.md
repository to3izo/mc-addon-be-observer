# ナレッジ集

このテンプレートからアドオンを作る中で得た知見をまとめたものです。公式ドキュメントに書かれていないこと、書き方があいまいなこと、実際の動作と違うことを中心に残しています。作業に関係するテーマは、コンテンツを書く**前に**読んでください（`AGENTS.md` の「AI agent workflow」参照）。

手で直すことが多いため、ナレッジは日本語で書きます（リポジトリのほかの文書は英語が基本です）。ここには「分かった事実と、確認の方法」を書きます。「なぜそう決めたか」は `docs/adr/` に書きます。

| テーマ | 内容 |
| --- | --- |
| [marketplace/](marketplace/README.md) | 協調型アドオンの要件、出品までの道と価格の目安、パーミュテーションの上限、バニラのテクスチャの扱い、カスタムブロックの上にモブが湧くこと（防げない理由と判断） |
| [block-culling/](block-culling/README.md) | カリングのルールの落とし穴（同じ部位の重複、不透明なブロックの隣）、状態で代替する方法、状態で枠を出し入れする規則 |
| [block-geometry/](block-geometry/README.md) | X 軸の反転、バニラのテクスチャの一部を使う UV、重ね描きの帯、アンビエントオクルージョン |
| [block-definitions/](block-definitions/README.md) | コンポーネントの注意点、実験的機能なしの接続、シルクタッチのドロップ、クリエイティブのタブとグループ、フタの開閉アニメーション、名前の表示 |
| [device-testing-ios/](device-testing-ios/README.md) | iPhone / iPad にビルドを確実に入れる方法と、ワールドへの適用、タッチ操作でのエンティティ、2 人でのテスト |
| [device-testing-windows-vm/](device-testing-windows-vm/README.md) | VMPal の Windows 11 VM で、開発用パックを入れて確認する手順と、MCP 経由の操作の落とし穴、`.mcaddon` の取り込み、補助パックの `.mcfunction`、F2 と透かしなしの画像、応答しなくなったとき |
| [shared-container/](shared-container/README.md) | 実験的機能なしの共有コンテナ（エンティティの入れ物＋構造物の保存）の検証結果 |
| [particles/](particles/README.md) | ブロックから粒子を出す方法（クライアントエンティティ）、`particle_motion_parametric` が見えなかったこと、`emitter_shape_custom` の書き方 |
| [block-textures-and-icons/](block-textures-and-icons/README.md) | スクリプトでテクスチャとアイコンを作る方法、バニラに寄せるときの注意、内側のテクスチャ、スクリーンショットから色を測る方法 |
| [release-and-media/](release-and-media/README.md) | バージョンの付け方、README に書くこと、紹介記事の依頼、VM での紹介用スクリーンショットの撮り方（足場・カメラ・背景・水槽の場面など） |
| [vanilla-reference/](vanilla-reference/README.md) | バニラの仕様・形式の調べ方（Minecraft Wiki、Bedrock Wiki、`bedrock-samples` のクローン、ベータ版の型定義）と補助スクリプト |

## ナレッジの追加方法

- テーマごとにディレクトリを作り（`docs/knowledge/<テーマ>/`）、`README.md` と関連ファイル（スクリーンショット `*.png`、小さなスクリプト、サンプル JSON など）を置きます。上の表にも追加してください。
- 各項目には、**どうやって分かったか**を書きます。
  - **実機で確認済み**: Minecraft で実際に見たもの。機種とバージョンを書く（例: iOS、1.26.50）。
  - **公式資料**: 公式ドキュメントや Mojang の `bedrock-samples` から分かったもの。リンクを付ける。
  - **推測**: まだ確かめていない推論。何を確かめれば確定するかも書く。
- 「症状 → 原因 → 対処」の順で短く書きます。見つかったアドオンのリポジトリやコミットを書いておくと役立つ場合があります。
- 新しいバージョンで動作が変わったら、項目を消さずに書き換えます（古いバージョンでの動作も残す）。
- ここに置くスクリプトは人と AI エージェントのための参考資料で、ビルドツールではありません。`pnpm` からは実行せず、`tools/` や `scripts/` から読み込まないでください。

## 補足

- 各テーマの中で `docs/adr/…` と書かれているもの（`0002-one-active-chest.md`、`0003-fixed-hit-breaking.md`、`0007-versioning.md` など）は、元になったアドオン（`mc-addon-shared-ender-chest`）の決定記録です。このテンプレートの `docs/adr/` にあるのは、出発点の `0001`（実験的機能を使わない）と `0002`（バージョン番号の付け方）だけで、番号が同じでも別の ADR です。アドオンごとの ADR は、各リポジトリで `0003` から足していきます（`docs/adr/README.md`）。
