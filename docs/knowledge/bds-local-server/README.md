# ローカル BDS（同じ Windows VM）での開発と検証

Windows 11 VM（VMPal）の中で Bedrock Dedicated Server（BDS）を動かし、同じ VM の Minecraft for Windows から接続して、観測アドオンを確かめるための事実と手順です。調査日は 2026-10-18 です。

- **実機で確認済み**: 2026-10-18 に、VM の中で読み取りだけのコマンドで確かめたもの（設定は何も変えていない）。
- **公式資料**: BDS 同梱の `bedrock_server_how_to.html`（1.26.52.3）、Microsoft Learn、Microsoft・Apple の文書。
- **非公式**: Minecraft Wiki、Mojira、ホスティング業者の記事など。
- **推測／未確認**: 確かめ方を添える。

> この文書の「推奨手順」は、**人が判断して実行する案**です。BDS の更新、ファイアウォールの変更、実験的機能の有効化、ネットワークの公開範囲の変更は、エージェントが勝手に行わない（`AGENTS.md`、`SECURITY.md`）。

## 1. 現在の環境（実機で確認済み、2026-10-18）

| 項目 | 値 |
| --- | --- |
| クライアント | Appx `Microsoft.MinecraftUWP` 1.26.5203.0（= 1.26.52.3、画面の表示は 26.52）。実行ファイル `Minecraft.Windows.exe`（ファイアウォールの規則では `C:\XboxGames\Minecraft for Windows\Content\Minecraft.Windows.exe`）、データは `%APPDATA%\Minecraft Bedrock` |
| BDS | `C:\MinecraftServer\bedrock_server.exe`、FileVersion 1.26.52.3 |
| ワールド | `worlds\addon-lab-flat`（`level-type=FLAT`、`gamemode=creative`） |
| `server.properties`（抜粋） | `transport=nethernet`、`server-port=19132`、`server-portv6=19133`、`server-ip` なし、`allow-cheats=false`、`online-mode=true`、`allow-list=true`、`enable-lan-visibility=true`、`max-players=2`、`default-player-permission-level=member`、`content-log-file-enabled=false`、`content-log-console-output-enabled=false`（2026-10-18 に `true` へ変更。§8） |
| `config/default/permissions.json` | `allowed_modules`: `@minecraft/server-gametest`、`@minecraft/server`、`@minecraft/server-ui`、`@minecraft/server-admin`、`@minecraft/server-editor`、`@minecraft/debug-utilities`（**server-net はない**）。モジュール別のフォルダ `config/<UUID>/` はない |
| 待受 | TCP `[::]:19132` LISTEN。UDP `<VM のローカル側のアドレス>:19132`、`<VM の LAN 側のアドレス>:19132`、`[::]:7551`（7551 の用途は未確認） |
| VM のネットワーク | NIC が 2 枚。`<VM の LAN 側のアドレス>/24`（既定のルート <LAN のルーター> = 自宅 LAN、インターネットへの経路）と、`<VM のローカル側のアドレス>/24`（VMPal の、Mac と VM のローカルネットワーク）。どちらもネットワークのプロファイルは **Public** |
| ファイアウォール | 受信の許可規則「Minecraft」が 4 つ（`bedrock_server.exe` と `Minecraft.Windows.exe` の TCP/UDP、**ポートもリモートアドレスも Any**、Public プロファイル）。つまり、`online-mode`・`allow-list` を除けば、**自宅 LAN の機器から BDS に届きうる状態** |
| 共有フォルダ | `Z:\` が VMPal の共有（属性は ReadOnly） |

- 起動のしかた（実機で確認済み）: BDS は「管理者: Windows PowerShell」のウィンドウから `.\bedrock_server.exe` で起動されていた（ワールドのフォルダの所有者は `BUILTIN\Administrators`）。ファイルの変更と起動・停止には管理者の権限が要る。
- クライアントのサーバーの登録「Local Addon Lab Server」の接続先は `127.0.0.1:19132`（実機で確認済み）。
- ループバックの例外は、すでに `microsoft.minecraftuwp_8wekyb3d8bbwe` に設定されていた（`CheckNetIsolation LoopbackExempt -s`）。アプリの `EntryPoint` は `Windows.FullTrustApplication`（実行ファイル `GameLaunchHelper.exe`）。

## 2. 新しい通信方式 NetherNet（公式資料: 同梱の how-to）

- `transport` に `nethernet`（**既定**）と `raknet` がある。
  - **nethernet**: WebRTC 系。`server-port` のデュアルスタックの **TCP** ソケットで HTTP 系のシグナリングを受け、その後クライアントごとに **UDP** の接続をネゴシエートする。UDP のポートは OS の一時ポートから選ばれ、`server-udp-ports` で範囲を固定できる。`server-portv6` は無視される。
  - **raknet**: 従来の UDP。`server-port`（IPv4、既定 19132）と `server-portv6`（IPv6、既定 19133）で待つ。
- `server-ip`（nethernet のときだけ）: 待受のソケットを、指定したローカルアドレスに bind する。空なら全インターフェース。**raknet には bind のアドレスを指定する公式の設定がない。**
- `enable-lan-visibility`: 「LAN でサーバーを探しているクライアントに応答する」設定。**アクセス制御ではない。** raknet では、ポートを変えても 19132/19133 を bind する。
- インターネットに公開する場合、シグナリングの TCP の前にリバースプロキシを置くことを推奨している（このプロジェクトでは公開しない）。
- Learn の server.properties のページ（2025-06）は、`transport`・`server-ip`・`server-udp-ports` をまだ載せていない。**同梱の how-to を優先する。**
- 26.50 で NetherNet が BDS の既定になったという告知は、二次情報（Minecraft Wiki、ホスティング業者の記事）経由でしか読めなかった（公式の changelog の本文は取得できなかった）。
- 非公式: Mojira BDS-23108（1.26.51.1〜1.26.52.3、未確定）に、NetherNet で参加できない事例と、「IP とポートを手入力して一度接続する」という回避策の報告がある。BDS-23126 に、`server-udp-ports` の範囲が無視されるという未確定の報告がある。

## 3. 同じ VM のクライアントからの接続（ループバック）

- Windows 版は 1.21.120 で UWP から GDK に移り、データが `%APPDATA%\Minecraft Bedrock` に移った（公式資料: Learn「GDK Migration」）。パッケージ名は `Microsoft.MinecraftUWP` のまま（実機）。
- Learn の「Getting Started with BDS」（2026-01 更新）には、今も SID を指定した `CheckNetIsolation LoopbackExempt` の手順が載っているが、UWP 時代の記述が残っている可能性がある。GDK Migration のページと BDS 同梱の how-to は、ループバックに触れていない。
- Windows の文書では、ループバックの制限は UWP（AppContainer）のネットワーク分離。**GDK 版が AppContainer で動くかは未確認**（full trust なら、例外の設定は意味を持たない見込み。推測）。
- **方針: まず例外の設定なしで接続を試す。古い固定 SID のコマンドは実行しない。**

推奨手順（人が実行する）:
1. 読み取りだけで現状を確かめる: `CheckNetIsolation.exe LoopbackExempt -s`、`(Get-AppxPackage Microsoft.MinecraftUWP | Get-AppxPackageManifest).Package.Applications.Application | Select Id,Executable,EntryPoint`（`Windows.FullTrustApplication` なら full trust）。
2. 例外なしで、サーバーを追加（アドレス `127.0.0.1`、ポート `19132`。`localhost` は使わない）して参加する（`docs/TESTING.md` OBS-ENV-05）。
3. 失敗したら、エラーの文言をそのまま記録し、`<VM のローカル側のアドレス>:19132` で試す。こちらだけ成功するなら、NetherNet の問題（BDS-23108 系）を疑う。
4. AppContainer だと確かめられ、かつ 127.0.0.1 と NIC のアドレスの両方で失敗した場合だけ、手順 1 で得た PackageFamilyName を名前で指定して例外を足す（`CheckNetIsolation.exe LoopbackExempt -a -n=<PFN>`、管理者。取り消しは `-d -n=<PFN>`）。SID は直書きしない。
5. 結果をこの文書に追記する。

結果（2026-10-18、実機）: 例外の設定が**すでにある状態**で、`127.0.0.1:19132` に接続できた。例外なしで接続できるかは、例外を外して確かめていないので未確認（外すのは利用者の判断）。アプリは full trust で動くので、例外は不要の見込み（推測）。BDS を起動し直すと、毎回「このサーバーを信頼しますか？」と聞かれた。BDS が識別用の鍵を保存しておらず（`keys/server_identity_key.pem` がない）、起動のたびに新しい鍵を作るため（同梱の how-to の「Server Identity」）。

## 4. バージョンの互換性

- 接続できるかは**ネットワークプロトコルのバージョン**で決まり、表示のバージョンの全桁の一致は要らない（公式資料: Getting Started の Troubleshooting）。ただし、パッチ版でもプロトコルが変わることがある（同ページの例: 1.21.0 と 1.21.30）。"Outdated Server" なら BDS を、"Outdated Client" ならクライアントを更新する。
- 表示は年ベース（26.50、26.51、26.52）、内部の番号と BDS のファイルは 1.26.xx。非公式（Minecraft Wiki）では、26.50〜26.52 のプロトコルは 2193 で同じ。実機の組み合わせ: クライアント 1.26.52.3 ＋ BDS 1.26.52.3。
- **接続の互換と Script API の互換は別。** スクリプトは BDS で動くので、使えるモジュールの版は BDS のエンジンで決まる。`@minecraft/server` 2.10.0 は 1.26.50 の安定版（`docs/RESEARCH.md` §2.1）。
- Microsoft Store のアプリの自動更新は、無効にできず一時停止（1〜5 週間）だけと報じられている（非公式。公式の文書では未確認）。BDS は zip なので自動では更新されない。**自動更新を止めることを、唯一の対策にしない。**

更新の手順（人が実行する）:
1. 更新前: VMPal でスナップショットを取る。`C:\MinecraftServer` を日付付きでコピーする（`worlds`、`config`、`server.properties`、`allowlist.json`、`permissions.json`）。クライアントの `minecraftWorlds` もバックアップする。
2. 新しい BDS は別のフォルダに展開し、`worlds`・`config`・設定ファイルを移す。旧版のフォルダは残す。
3. 更新後のテスト: 両方のバージョンを記録 → 接続して "Outdated" が出ない → BDS のログにパックとスクリプトのエラーがない → `docs/TESTING.md` のスモークテストと OBS-ENV-02・OBS-IN-01 → 問題があれば旧フォルダかスナップショットに戻す。
4. 確認した組み合わせを、下の「確認した組み合わせ」に足す。

## 5. スクリプトの権限（server-net を使う場合だけ）

- 既定の権限は `config/default/permissions.json`。公式は「既定は最小限にし、追加はモジュール単位で与える」ことを推奨している（公式資料: Learn「Scripting with BDS」、2025-07。既定の一覧は古く、`@minecraft/debug-utilities` がない）。
- モジュール単位のフォルダ名は、BP の **script モジュールの UUID**（manifest の `modules[]` で `"type": "script"` の項目の `uuid`）。**パックのヘッダーの UUID ではない**（公式資料に manifest の抜粋付きで明記）。
  - このアドオン（観測コア）の script モジュールの UUID は `a0c32fd2-f698-42ad-843d-09dd3204352e`（ヘッダーは `cbe4cdb9-…`）。ただし、**観測コアは追加の権限を必要としない**ので、このフォルダは作らない。
- `variables.json`・`secrets.json` は `config/default/` か UUID のフォルダに置き、`@minecraft/server-admin` の `variables.get()`・`secrets.get()` で読む。secret は `SecretString` のまま `HttpHeader` に渡せる。
- server-net・server-admin はベータ版しかなく、ワールドで **Beta APIs の実験**が必要（公式資料: Learn Versioning）。
- 未確認: モジュール別の `permissions.json` が既定を置き換えるのか足すのか（安全のため、必要なモジュールをすべて書く）、server-net の URI の許可リスト・`force_tls`・各上限の設定場所と既定値、再起動なしの再読み込み。

Phase 3 を採る場合の手順案（ADR-0004。人が承認してから）:
1. アダプターは別のリポジトリの別のアドオン。その script モジュールの UUID で `config/<UUID>/permissions.json` を作る（`{"allowed_modules":["@minecraft/server","@minecraft/server-net","@minecraft/server-admin"]}`）。`default` には足さない。
2. Beta APIs を有効にした**別の検証用ワールド**を使う（`addon-lab-flat` には有効にしない。実験は後からオフにできない）。
3. トークンは `config/<UUID>/secrets.json` に置く。Git・パック・ワールド・ログには置かない。

## 6. 公開範囲を絞る（人が実行する案）

現状（§1）は、自宅 LAN の機器から BDS の TCP 19132 と UDP に届きうる。`online-mode=true` と `allow-list=true` で参加者は絞られているが、**ポートへの到達そのものは防いでいない**。ルーターのポート開放はしない（必要ない）。

各手順の前にスナップショットを取り、1 つずつ確かめる:
1. `enable-lan-visibility=false` にする（LAN の一覧に出なくなるだけ。接続は手入力で行う）。`online-mode=true`・`allow-list=true`・`max-players=2` は保つ。
2. ファイアウォールで、`bedrock_server.exe` の受信を、必要な相手だけに絞る（主な手段）。例: 既存の許可規則のリモートアドレスを絞る（`Set-NetFirewallRule` の `-RemoteAddress`）か、自宅 LAN（`<自宅 LAN の範囲>`）からの受信を拒否する規則を足す。Mac からの直接の接続が要らなければ、`<VMPal のローカルネットワークの範囲>` も外す。受信の規則がループバックの通信に掛かるかは未確認なので、変更のあとで同じ VM のクライアントが接続できることを確かめる。
3. 任意: `server-ip=127.0.0.1` を試し、待受が `127.0.0.1:19132` になるか、同じ VM のクライアントが接続できるか、ICE の UDP も絞られるかを確かめる。繋がらなければ戻す。
4. 確認: Mac（`nc -vz <VM の LAN 側のアドレス> 19132`、`nc -vz <VM のローカル側のアドレス> 19132`）や LAN の iPhone から接続できないこと、同じ VM のクライアントからは接続できること（`docs/TESTING.md` OBS-ENV-06）。
5. 自宅 LAN 側の NIC を外す案は、`online-mode=true` のための Xbox Live の認証にインターネットが要るので、<VMPal のローカルネットワーク> 側から外に出られるかを確かめてからにする。

## 7. VM から Mac への通信（Phase 3 を採る場合の検証手順。この環境の事実ではない）

- server-net には待受の API がない。接続はいつも **BDS（VM）→ Mac** の向き。WebSocket でも、接続を始めるのは BDS 側で、接続後は双方向に送れる（観測の経路では、Mac から BDS への命令は受け付けない設計にする）。
- Mac のアドレスは、<VMPal のローカルネットワークの範囲> のブリッジのアドレス（.1 であることが多いが未確認）。192.168.64.x などと決め打ちしない。
- 手順: (1) Windows で `Get-NetIPConfiguration`・`route print -4`、(2) Mac で `ifconfig` から <VMPal のローカルネットワーク> を持つブリッジを探す、(3) 受信側をそのアドレスにだけ bind し、`lsof -nP -iTCP -sTCP:LISTEN` で `*:<port>` でないことを確認、(4) Windows から `Test-NetConnection <Mac のアドレス> -Port <port>`、(5) 自宅 LAN の別の機器から Mac の LAN のアドレスへは繋がらないことを確認。
- macOS: TCP の待受と受信する UDP のユニキャストには、ローカルネットワークの許可は要らない（公式資料: Apple TN3179）。アプリケーションファイアウォールが有効なら、署名のないバイナリの待受で許可のプロンプトが出ることがある。
- この経路は暗号化されていない（http の場合）。同じネットワーク（VMPal のネットワーク）の上では読まれうるものとして扱う。

## 8. ログの回収と、コンソールからの要求（実機で確認済み、2026-10-18、BDS 1.26.52.3）

- **スクリプトの `console.*` は、`content-log-console-output-enabled=true` のときだけ標準出力に出る。** `false`（既定）では、`[be-observer] scripts loaded` も応答も出なかった（起動時に `Content logging to console is disabled.` の警告が出る）。`true` にすると、`[2026-10-18 13:55:12:647 INFO] [Scripting] to3izo_bo.response {...}` の形で、要求の直後（数十 ms 以内）に出た。行のあとに空行が 2 つほど続く。
  - この設定は、2026-10-18 に `server.properties` で `true` にした（ほかの行は変えていない。元のファイルは `C:\MinecraftServer-backup\20261018-135239\`）。
- **コンソールからの `scriptevent` は、`allow-cheats=false` のままで動く**（`Script event to3izo_bo:query has been sent`）。コンソールでは先頭の `/` は付けない。
- **プレイヤーのチャットからの `/scriptevent` は、チートと operator の両方が必要。** `allow-cheats=false` では「このワールドでは、[チート]は有効になっていません。」、チートを有効にしても `member` では「コマンドの権限レベルが正しくありません: scriptevent」になった。`changesetting allow-cheats true`（`server.properties` は変わらない）と `op <名前>` で通った。
  - 試験のあと、`changesetting allow-cheats false` に戻し、`permissions.json` をバックアップから戻した（`deop` はプレイヤーが退出していて「No targets matched selector」になったため）。
- **文字コード（Windows の BDS）:**
  - 標準入力に UTF-8 で送った日本語は、化けて届いた（UTF-8 のバイトを 1 バイトずつ別の文字として読んでいた）。JSON の `\u30c6` のような ASCII のエスケープなら正しく届いた。
  - 標準出力は、システムのコードページ（日本語の Windows では CP932）で書かれる。UTF-8 として読むと日本語が化けた。対策として、アドオンは応答の JSON の ASCII 以外の文字をすべて `\uXXXX` にする（`docs/PROTOCOL.md` §1）。
- **長さ:** コンソールからの 2,109 文字の message は、BDS が `[ERROR] Message length exceeds (2048) character limit!` で拒否し、アドオンには届かなかった。
- **プレイヤーのチャットからの長いコマンドで、そのプレイヤーが切断される。** 511 文字の `/scriptevent` で「マルチプレイ接続失敗」（`NetherNet`、`ClientDisconnection-122`）。BDS のログは `Player disconnected` だけで、アドオンには届かなかった。448 文字は通った（境目の正確な値は未確認）。ローカルワールドでも同じ傾向で、511・512・1,024・2,048 文字で切断され（`ClientDisconnection-41`、「Bat」）、256・384・448 文字は通った。
- ネザーの高さの範囲は 0〜127（`y=128` は `out_of_bounds`）。プレイヤーはネザーの天井の上（y=128）に立てる。
- プレイヤーが 1 人もいないときは、スポーン地点を含めてチャンクが読み込まれていない（`unloaded`）。
- `Player.id` は、同じワールドでは退出・再参加でも、BDS の再起動でも変わらなかった。
- 2 人目のプレイヤーは、`allowlist add <ゲーマータグ>` のあと、LAN の別の機器から `<VM の LAN 側のアドレス>:19132` で参加できた（公開範囲はまだ絞っていない）。
- `packetlimitconfig.json`（BDS 同梱）には、パケットの種類ごとの頻度の上限（例: ID 9・97 は毎秒 10、まとめて 50）がある。チャットで要求を送るときの頻度の目安になりうる（ID と種類の対応、要求への影響は未確認）。

### 標準入出力をつなぐ（参考の実装）

- Mac の外部ツールは、ウィンドウで動いている BDS の標準出力を読めない。`scripts/bds-console-bridge.ps1` は、BDS を標準入出力をつないで起動し、標準出力を `<BDS>\bo-bridge\stdout.log` に UTF-8 で書き、`<BDS>\bo-bridge\stdin.txt` に追記された行をコンソールのコマンドとして送る。止めるときは `stop` を追記する。
- 2026-10-18 の試験では、VMPal の管理者の `exec`（`vmpal_exec_admin`、待たないジョブ）で起動した。**`exec` のジョブには時間の上限（最大 24 時間）があり、上限で止められると BDS も強制終了される**ので、長く動かすときは別の起動のしかた（タスク スケジューラなど）にする。試験のあとは `stop` で止めた。
- 文字コードの扱いは上のとおり。ブリッジは UTF-8 で書くが、BDS の出力の日本語は CP932 なので、応答以外の行（プレイヤー名を含む BDS 自身のログなど）は化けることがある。
- **ファイル経由の入力は、取りこぼすことがある（2026-10-18、実機）。** 1 秒に 1 回 × 300 件を `stdin.txt` に追記したところ、3 件が BDS に送られなかった（ブリッジの `# sent` 行が 297 件）。書き込み側の追記と、ブリッジの読み取りがぶつかったためと見られる。常用する外部ツールは、ファイルではなくパイプ（BDS の標準入力に直接書く）を使うか、送った要求と応答を `requestId` で突き合わせて再送する。
- 応答の 1 行は、3,965 文字まで欠けずに標準出力に出た（Phase 2 の OBS-SIZE-01）。

## 確認した組み合わせ

| 日付 | クライアント | BDS | `@minecraft/server` | 接続 | アドオンの読み込み | 観測の経路 |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-18 | 1.26.52.3 | 1.26.52.3 | 2.10.0（manifest） | `127.0.0.1:19132` で接続できた（ループバックの例外は設定済みの状態） | `Pack Stack - [00] Bedrock Observer [BP] … 0.1.0`、エラーなし | コンソールとプレイヤー（チート＋operator）から要求し、標準出力で応答を読めた |

## 出典

- BDS 同梱 `bedrock_server_how_to.html`（1.26.52.3）— VM 内で読んだ。
- Learn「Getting Started with BDS」: https://learn.microsoft.com/en-us/minecraft/creator/documents/bedrockserver/getting-started （2026-01-28 更新。ループバックの記述は古い可能性）
- Learn「GDK Migration」: https://learn.microsoft.com/en-us/minecraft/creator/documents/gdkpcprojectfolder
- Learn「Scripting with BDS」: https://learn.microsoft.com/en-us/minecraft/creator/documents/bedrockserver/scripting
- Learn「server.properties」: https://learn.microsoft.com/en-us/minecraft/creator/documents/bedrockserver/server-properties （2025-06。古い）
- Windows「Troubleshooting UWP App Connectivity Issues」: https://learn.microsoft.com/en-us/windows/security/operating-system-security/network-security/windows-firewall/troubleshooting-uwp-firewall
- Apple TN3179: https://developer.apple.com/documentation/technotes/tn3179-understanding-local-network-privacy
- 非公式: https://minecraft.wiki/w/Bedrock_Dedicated_Server_1.26.52.3 、https://mojira.dev/BDS-23108
