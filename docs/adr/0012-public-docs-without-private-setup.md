# ADR-0012: 公開の文書を、非公開のリポジトリとツールに頼らない形にする

- 状態: 採用
- 日付: 2026-10-18
- 決定者: 運営（利用者の承認）

## 背景
このリポジトリは、非公開のテンプレートから作り、2026-10-18 に OSS として公開した。文書には、テンプレートや作者のほかのアドオンから引き継いだものが残っていた。

- `docs/PROMPTS.md`: テンプレートから新しいアドオンを作るときの、AI エージェントへの指示の例。例はガラスのブロックやエンティティで、このアドオンと関係がない。
- `docs/knowledge/` の 9 つのテーマ（block-culling、block-geometry、block-definitions、block-textures-and-icons、particles、shared-container、release-and-media、device-testing-ios、marketplace）: ブロック・粒子・テクスチャ・iOS への配布・Marketplace への出品の知見。元になったのは非公開のアドオン（共有エンダーチェストなど）で、その ADR の番号も出てくる。
- 作者の非公開のツール（Play Conductor）の名前と、それに向けた作業の項目。
- 公開の前に履歴を書き換えたので（ADR-0011）、文書に書いたコミットの SHA が引けなくなった。

公開の文書は、利用者が読めないリポジトリやツールを前提にしない、というのが利用者の方針。

## 決定
1. `docs/PROMPTS.md` を消す。
2. 上の 9 つのテーマを、`docs/knowledge/` から消す。このアドオンにはブロックもアイテムもなく、リソースパックは空で（ADR-0005）、BDS だけを対象にして（ADR-0006）、iOS への配布も Marketplace への出品もしない。消したテーマへの参照（`AGENTS.md`、ADR-0001・0002、vanilla-reference）は、`AGENTS.md` の Marketplace policy（いまの Cooperative Add-On policy）や、このリポジトリの ADR に付け替える。
3. 残すテーマ（device-testing-windows-vm、bds-local-server、vanilla-reference）は残す。ほかのアドオンの識別子や試験の ID の例は、このアドオンの例か、一般的な書き方に直す。`docs/knowledge/README.md` の「補足」（ほかのアドオンの ADR の番号の説明）は消す。
4. 作者の非公開のツールの名前は「外部ツール」と書く。そのツールの側の未完の作業の項目（ROADMAP の「運用・外部」）は、このリポジトリの利用者に関係がないので消す。外部ツールを作るときの提案は、一般の提案として残す。
5. 文書のコミットの SHA は、書き換えのあとの、同じ件名のコミットに直す。ADR-0011 の本文にある書き換えの前の SHA は、その例として正しいので残す。

## 理由・検討した案
| 案 | 判断 | 理由 |
| --- | --- | --- |
| 関係のない文書を消し、名前を言い換える | **採る** | 利用者が読めないものを前提にしない。消した内容は、テンプレートと元のアドオンのリポジトリに残っている |
| 「テンプレートから引き継いだ」と注記して残す | 採らない | 読む人がこのアドオンに関係があると誤解し、AI エージェントも作業の前に読んでしまう（`AGENTS.md` の「AI agent workflow」） |
| 9 つのテーマを、一般のナレッジとして書き直す | 採らない | このアドオンで確かめられない内容を、保守し続けることになる |

## 影響
- `docs/PROMPTS.md` と、`docs/knowledge/` の 9 つのテーマがなくなった。`docs/knowledge/README.md` の表から消した。
- `AGENTS.md`、ADR-0001・0002・0003・0004・0007、`docs/ROADMAP.md`、`docs/knowledge/device-testing-windows-vm/`・`vanilla-reference/` の参照と言い換え。
- 「テンプレートから作った」という経過の記述（CHANGELOG・ADR-0005 など）は事実なので、残す。
- 以後、公開の文書に、非公開のリポジトリやツールを前提にした記述を足さない。

## 経過
- 2026-10-18: 公開のあとに文書を点検し、整理の案を利用者が承認した。上の決定のとおりに直した。
- 2026-10-18: 続けて、vanilla-reference の作者のローカルのパスを消し、Marketplace 向けの文言を除いた（ADR-0006 の経過）。
