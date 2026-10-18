# TESTING — what to verify in Minecraft

> 日本語版: [TESTING.ja.md](TESTING.ja.md) (keep both files in sync when changing test cases)

Automated checks (`pnpm validate`, `pnpm build`, `pnpm test`) prove that files are well-formed and
references resolve. They cannot prove gameplay. This file is the manual test plan that every change
must extend and that a release must pass.

## How to run a test session

1. Build and install:
   - Windows: `pnpm deploy` (or `pnpm dev --deploy` while iterating) copies the packs into Minecraft.
   - Any other platform (macOS → iPhone/iPad, Android, ...): `pnpm package`, then open
     `dist/<slug>-<version>.mcaddon` on the device (e.g. via AirDrop). `pnpm build` alone does **not** write the
     `.mcaddon`, and it empties `dist/` first, deleting any `.mcaddon` from an earlier `pnpm package`.
     Install only the `.mcaddon` (it contains both packs); the two `.mcpack` files next to it are not needed.
2. Create a **new** flat creative world with cheats on; activate the behavior pack (the resource pack
   is pulled in by the dependency). Enable *Content Log GUI/File* in Settings → Creator to see
   JSON/script errors.
3. Also test in an **existing survival world** with the previous version installed when releasing
   (upgrade path: UUIDs unchanged, content identifiers unchanged).
4. Record results in the PR: which cases ran, on which platform/version, pass/fail.

### Installing on iPhone / iPad (AirDrop)

1. On the Mac: `pnpm package`, then AirDrop `dist/<slug>-<version>.mcaddon` (only this file) from
   Finder to the device. The version in the file name is how you tell builds apart on the device.
2. On the device, accept the AirDrop. If iOS offers to open it in Minecraft, choose Minecraft and skip
   to step 4. Otherwise it is saved to the Files app (usually *On My iPhone/iPad → Downloads*); any
   folder is fine. Do **not** copy it into the *Minecraft* folder in Files — Minecraft does not read
   `.mcaddon` files from there.
3. In Files, find the file **by its version in the name** (search for it or browse the folder it was
   saved to). Do not pick it from *Recents*: Recents also lists older copies, including ones in
   iCloud Drive and in *Recently Deleted*. Long-press the file → *Share* → *Minecraft* (if Minecraft is not in the app row, tap
   *More* and pick it).
4. Minecraft starts and shows "Import started…" then "Successfully imported". If it says the pack is a
   duplicate, the same version is already installed: see "Installing a new build" below.
5. Apply the packs to a world (new or existing):
   1. On the world list, tap the pencil (*Edit*) button of the world.
   2. Open *Behavior Packs* and check the *Active* list. If `<Add-On name> [BP]` is not there, find it under
      *Available* — on iPhone/iPad imported Add-Ons may be listed in the *Owned/Purchased* section
      (「購入済み」 in Japanese) — tap it and tap *Activate*.
   3. Open *Resource Packs* and check that `<Add-On name> [RP]` is in *Active* too (activating the BP normally
      adds it through the dependency; if not, activate it the same way).
   4. Check *Experiments*: everything must be off (this Add-On uses no experiments, ADR-0001).
   5. Start the world. Activating packs on an existing world makes Minecraft suggest a backup copy;
      for test worlds that is optional.

**Old copies on the device:** delete earlier `.mcaddon` files from Files (also from iCloud Drive and
*Recently Deleted*) from time to time, so only the current build is around. To check what Minecraft
actually imported, open *Minecraft → games → com.mojang → behavior_packs → <pack folder> →
manifest.json* in Files and read `"version"`.

**Installing a new build** (same version number as the one already on the device): Minecraft skips a
pack whose UUID and version are already installed, so the new build would not replace the old one.
Before importing, delete the old packs in Minecraft: *Settings → Storage → Resource Packs / Behavior
Packs* → select both packs of this Add-On → delete. Then import again. Worlds that used the old build
pick up the new one when they are opened again (same UUIDs).

**Recommended: bump the patch version for every build you install on a device** (verification
builds before the first release: `pnpm version:set 0.1.1`, `0.1.2`, …). A new version is always
imported, so deleting old packs is not needed, and the version shown in *Edit → Behavior Packs /
Resource Packs → Active* tells you which build is running (check it before testing). Record this
choice in `CHANGELOG.md` and list the changes of those builds together under the first public
version. AI agents change the version only after the user has agreed to this (see `AGENTS.md`).

## Smoke tests (every change)

| ID | Steps | Expected |
| --- | --- | --- |
| S-01 | Load the world with the packs active, open the content log | No errors or warnings from this Add-On |
| S-02 | Watch the chat/log right after loading | Script log line `[<slug>] scripts loaded` appears once |
| S-03 | Run `/reload` | Scripts reload without errors; no duplicated behaviour (e.g. double event handling) |
| S-04 | Leave the world and re-enter | Behaviour identical; persisted data (dynamic properties, scoreboards) survives |
| S-05 | Check pack list in world settings | Pack names, descriptions and icons match `addon.config.json`; versions match `package.json` |

## Content checks (per content type)

Copy the relevant block into the feature section below and fill it in.

- **Item**: appears in creative inventory in the expected group; icon and name correct; crafting recipe works; stats (damage, durability, enchantability) as in `CONTENT.md`; behaves correctly in hand / offhand / dropped.
- **Block**: placeable, correct texture on all faces, breaks with the intended tool and drops the intended loot; collision and light as specified; renders correctly in hand and in the inventory.
- **Entity**: spawns via `/summon` and via spawn rules in the right biomes; model, textures and animations play; AI behaves (idle/walk/attack/flee); health, damage, loot and sounds match spec; despawns/persists as intended; looks right at distance and in multiplayer.
- **Recipe**: shows in the recipe book; ingredients and output count correct; no conflict with vanilla recipes.
- **Script feature**: trigger conditions, result, edge cases (no players, multiple players, player leaves mid-action), no per-tick lag (use `/scriptprofiler` or watch for stutter).
- **UI (server-ui forms)**: opens, cancels cleanly, inputs validated, works on touch and controller.
- **Localisation**: switch the game language; strings resolve, no raw keys.

## Feature test cases

### startup (scripts/features/startup)

| ID | Steps | Expected |
| --- | --- | --- |
| F-startup-01 | Load a world with the packs | Exactly one `[<slug>] scripts loaded` line |

### observer (scripts/features/observer) — Phase 2 complete

Plan for Phases 1–2 (`docs/ROADMAP.md`). The Add-On is **BDS-only** (ADR-0006): in-game cases run on BDS; cases
marked "local world" are reference only. Automated cases U-PROTO-* and V-* run with `pnpm test`. Phase 1 results
are under "Results" below. **Unit tests use no Minecraft runtime;
a passing unit test is never reported as in-game verification.**

Setup for in-game cases: BDS world `addon-lab-flat` (flat, creative) with `content-log-console-output-enabled=true`.
Send requests as `scriptevent to3izo_bo:query <JSON>` on the BDS console (ASCII only; `\uXXXX` for other characters),
or as `/scriptevent …` in an operator's chat with cheats on (whole command ≤ 448 characters). Read responses from
the BDS standard output; a response is the text after `to3izo_bo.response `.
Record each run: platform, game/BDS version, environment (local world / BDS), pass/fail, notes.

#### Automated (no game)

| ID | What | Where |
| --- | --- | --- |
| U-PROTO-01 | Valid request parses; `requestId`, `method`, `params` kept | tests/unit/protocol-request.test.ts |
| U-PROTO-02 | Not JSON / not an object → `INVALID_JSON`; `requestId` recovered from raw text when well-formed, else `null` | same |
| U-PROTO-03 | Message over `maxRequestChars` → `REQUEST_TOO_LARGE` without parsing | same |
| U-PROTO-04 | Missing/invalid `requestId` (charset, 1–64 chars) or `method` → `INVALID_REQUEST`; unsupported `protocol` → `UNSUPPORTED_PROTOCOL` | same |
| U-PROTO-05 | Unknown method → `UNKNOWN_METHOD`; unknown param key → `INVALID_PARAMS`; handler exceptions → `INTERNAL_ERROR` | tests/unit/protocol-dispatch.test.ts, tests/unit/protocol-params.test.ts |
| U-PROTO-06 | Coordinates: negative integers accepted; `1.5`, `NaN`/`Infinity` (as JSON cannot carry them: strings, `1e999`), out-of-range → `INVALID_PARAMS`; radius/limit/distance/batch over limit → `LIMIT_EXCEEDED` | tests/unit/protocol-params.test.ts |
| U-PROTO-07 | Player selector: name with spaces and Japanese accepted; name+id → `INVALID_PARAMS` | same |
| U-PROTO-08 | Envelope: exactly one of `data`/`error`; serialised response is one line (names with `\n` stay escaped) and starts with the prefix | tests/unit/protocol-response.test.ts |
| U-PROTO-09 | Truncation: lists shortened with `truncated`/`omitted`; still too large → `RESPONSE_TOO_LARGE` | same |
| U-PROTO-10 | `capabilities` describes the build; every listed method answers through the table (the table's type requires exactly the listed names) | tests/unit/protocol-dispatch.test.ts |
| U-PROTO-11 | Phase 2 parameters: dimension ids (`DIMENSION_NOT_FOUND`), decimal locations, booleans, name lists (`include`) | tests/unit/protocol-options.test.ts |
| U-PROTO-12 | `blocks` positions: non-empty, at most `maxBlocksPerRequest` (`LIMIT_EXCEEDED`), per-item errors name the index | same |
| U-PROTO-13 | Option groups: `target` / `entities` defaults and limits; `snapshot` groups reject keys of other groups | same |
| U-PROTO-14 | Entity filters (`type`, `excludeTypes`, `families`, `excludeFamilies`, `name`, `tags`) and `includeEffects`; `top`/`tops` columns (integer `x`/`z`, `LIMIT_EXCEEDED`); `scoreboard` `objective`/`limit` | tests/unit/protocol-options.test.ts |
| U-PROTO-15 | Known Script API errors map to protocol codes by name (`details.scriptError`); unknown errors stay `INTERNAL_ERROR` | tests/unit/protocol-dispatch.test.ts |
| U-EVT-01 | Event line: prefix, envelope fields, `dropped` only when non-zero, pure ASCII | tests/unit/protocol-events.test.ts |
| U-EVT-02 | Event buffer keeps the newest N, `since`/`limit`/`more`/`kinds`, `missed` when pushed out or dropped | same |
| U-EVT-03 | Rate limit: max per 20-tick window, dropped events counted | same |
| U-EVT-04 | `events` parameters: `since` ≥ 0 integer, `limit` ≤ `maxEventsPerRequest`, known `kinds` only | same |
| V-VER-01 | Versions reported by `capabilities` equal `package.json` and the manifest's module dependencies (update `scripts/shared/constants/version.ts` after `pnpm version:set`) | tests/validation/version-constants.test.ts |
| V-RO-01 | Read-only guard: `scripts/` contains no call to mutating APIs (`runCommand`, `setBlock`/`setType`/`setPermutation`, `setDynamicProperty`, `teleport`, `addEffect`, `kill`, `remove`, `spawnEntity`, `setItem`, `nameTag =`, …) | tests/validation/read-only.test.ts |
| V-DEP-01 | The core manifest declares only `@minecraft/server` (no `server-net`/`server-admin`) | `pnpm validate` + tests/validation/read-only.test.ts |

#### Environment (in game)

| ID | Steps | Expected |
| --- | --- | --- |
| OBS-ENV-01 | Local world (client-hosted): send `capabilities`; while the game runs, look for the response in `%APPDATA%\Minecraft Bedrock\logs\ContentLog*.txt` and in Settings → Creator → content log history | Record where the line appears and whether the file is written while the game runs (decides the local-world collection path) |
| OBS-ENV-02 | BDS: send `capabilities` from a player; read BDS standard output | One line containing `to3izo_bo.response {…}`; record the text BDS puts before it |
| OBS-ENV-03 | Permission: send a request (a) in a local world with cheats on, (b) with cheats off, (c) on BDS from a player with `allow-cheats=false`, (d) from the BDS console | Record which work; no bypass is attempted |
| OBS-ENV-04 | Build the normal distributable (`pnpm package`); open `dist/be-observer_BP/manifest.json` | Only `@minecraft/server` among module dependencies; no experiments needed to activate the pack in a new world |
| OBS-ENV-05 | Windows client in the same VM: add server `127.0.0.1` port `19132`, join | Connects without any loopback exemption; if it fails, record the exact error before trying any remedy (`docs/knowledge/bds-local-server/`) |
| OBS-ENV-06 | After the operator restricts exposure (firewall scope / `server-ip`), try to connect from a device outside the VM (iPhone on the LAN, Mac) | Connection refused/times out; the in-VM client still connects |
| OBS-ENV-07 | Not applicable: Phase 3 (network adapter) was rejected (ADR-0004). Kept so the id is not reused | — |

#### Protocol and observations (in game; run on BDS and on a local world)

| ID | Steps | Expected |
| --- | --- | --- |
| OBS-IN-01 | `{"requestId":"c1","method":"capabilities"}` | Valid JSON; `requestId` `c1`; methods and limits match this build |
| OBS-IN-02 | `{"requestId":"x1",` (broken) | `INVALID_JSON`, `requestId` `x1` |
| OBS-IN-03 | `{"requestId":"x2","method":"teleport"}` | `UNKNOWN_METHOD`; nothing happens in the world |
| OBS-IN-04 | A request with spaces, `"`, `\` and Japanese in string values | Arrives intact (compare echoed fields) |
| OBS-IN-05 | A message of 2,100 characters | Record the game's behaviour (cut/refused); the Add-On answers `REQUEST_TOO_LARGE` or nothing reaches it |
| OBS-IN-06 | From the BDS console: `player` without `player` param; then with `{"name":…}` | `NO_SOURCE_PLAYER`; then the player's data |
| OBS-IN-07 | `/reload`, then `capabilities` twice | New `session`; `seq` 1, 2; exactly one response per request |
| OBS-PLY-01 | `players` with 1 player, then 2 (second account) | Correct count, ids, names, dimensions |
| OBS-PLY-02 | `player` by a name containing a space / Japanese (if such an account is available) | Found; otherwise mark "not available" |
| OBS-PLY-03 | `player` with an unknown name; then for a player who just left | `PLAYER_NOT_FOUND` both times |
| OBS-PLY-04 | `player` in the Nether and the End | `dimension` is the full id; location matches the in-game coordinates display |
| OBS-PLY-05 | Sneak, sprint, swim, fly (creative), stand still; query each | Flags match the action; velocity ≈ 0 when still |
| OBS-PLY-06 | Note `id`; leave and rejoin; restart BDS; query again | Record whether `id` is stable (U7) |
| OBS-BLK-01 | Place a known block at negative coordinates (e.g. -1, 4, -1, read from the coordinates display); `block` there | `typeId` and `states` match; integer `position` equal to the request |
| OBS-BLK-02 | `block` at an air position, at `x=1000000` (unloaded), at `y=400` (above the world) | `ok` + `minecraft:air`; `unloaded`; `out_of_bounds` |
| OBS-BLK-03 | `blocks` with `maxBlocksPerRequest` positions, then one more | All results in order; then `LIMIT_EXCEEDED` |
| OBS-TGT-01 | Look at a block face; `target` | Correct block position, face, face location |
| OBS-TGT-02 | Look at the sky; `target` | `block.hit: false` |
| OBS-TGT-03 | Look at an animal with `includeEntities` | Entity hit with id/type |
| OBS-TGT-04 | `maxDistance` above the limit; and omitted | `LIMIT_EXCEEDED`; default distance used and reported |
| OBS-ENT-01 | Spawn eggs: 12 cows near the player; `entities` radius 8 limit 5 | 5 nearest, sorted, `truncated: true` (or `returned`/`limit` show the cut) |
| OBS-SNP-01 | `snapshot` with all sections; then with an invalid section name | Sections present, one `tick`; then `INVALID_PARAMS` |
| OBS-SIZE-01 | Full inventory of named items; `player` with `inventory` | Response ≤ `maxResponseChars`, or `truncated`/`omitted`, or `RESPONSE_TOO_LARGE`; never a cut line |
| OBS-RO-01 | Before/after running every method: compare the block area, inventory, game mode, entity count, `/scoreboard objectives list`, `/tag @s list` | No difference; content log has no command output from the Add-On |
| OBS-PERF-01 | 1 request per second for 5 minutes (alternate `snapshot` and `entities`) on BDS | No script watchdog warnings, no visible lag; every request answered once |

#### Events (in game, BDS)

| ID | Steps | Expected |
| --- | --- | --- |
| OBS-EVT-01 | A player leaves and joins again | `player_leave`, `player_join`, `player_spawn` (`initialSpawn: true`); no `game_mode_change` with `from` = `to` |
| OBS-EVT-02 | Survival player: console `kill <name>`, then the player presses Respawn | `entity_die` (player, `cause`), then `player_spawn` (`initialSpawn: false`) |
| OBS-EVT-03 | Console `execute as <name> at @s run damage @e[…,c=1] 100 entity_attack entity <name>` | `entity_die` of that mob with `killer` = the player |
| OBS-EVT-04 | Teleport a player into the Nether, wait until it has loaded, teleport back | Two `dimension_change` events with correct `from`/`to` |
| OBS-EVT-05 | Console `gamemode survival <name>` then `gamemode creative <name>` | Two `game_mode_change` events |
| OBS-EVT-06 | Console `gamerule dodaylightcycle false` then `true` | Two `game_rule_change` events (`doDayLightCycle`) |
| OBS-EVT-07 | `events` with no params, with `since`/`limit`, with `kinds`, with an unknown kind | All held events; the next page with `more`; filtered; `INVALID_PARAMS` |
| OBS-EVT-08 | `/reload` | New `session`; event `seq` starts at 1; `events` is empty until the next event |

#### Operator command (in game, BDS; ADR-0010)

Run after a BDS **restart** (a new or changed command is not registered by `/reload`), with `allow-cheats=false`.
Back up `permissions.json` first and restore it after the test (`deop` leaves a `member` line behind).

| ID | Steps | Expected |
| --- | --- | --- |
| OBS-CMD-01 | BDS console: `to3izo_bo:query "{\"requestId\":\"c\",\"method\":\"capabilities\"}"` | One response line; `transport.requestCommand` is `to3izo_bo:query` |
| OBS-CMD-02 | A `member` player types `/to3izo_bo:query "{\"requestId\":\"m\",\"method\":\"player\"}"` | The game refuses it ("command permission level"); no response line |
| OBS-CMD-03 | Console `op <name>`; the player types the same command with `requestId` `o` | A response with that player's data (the sender is the source player); nothing in the player's chat |
| OBS-CMD-04 | Console `reload`, then OBS-CMD-01 again | Still answered (the command did not change) |
| OBS-CMD-05 | `bo-verify.ps1` with `bo-verify-cases.json` | All cases pass (the script-event path is unchanged) |

#### Phase 2 additions (in game, BDS, scripted)

These cases are run by the reference script `docs/knowledge/bds-local-server/scripts/bo-verify.ps1` with
`bo-verify-cases.json` (same folder), while `bds-console-bridge.ps1` runs BDS. The cases file sets up the state with
console commands (a pig named `BoPig` with the tag `bo_tag` and Slowness, Speed II on the player, the objective
`bo_test` with `PlayerA` = 7 and `fake_p` = 3), runs each request, judges `ok`/`code`/fields, and cleans up. The
verdicts (with every response) go to a JSON file. Case ids below are the ids in the cases file.

| IDs | What | Expected |
| --- | --- | --- |
| CAP-01 | `capabilities` | Lists `entity`, `top`, `tops`, `scoreboard`, the `effects` section, `maxScoreEntries` |
| EFF-01, -02 | `player` / `snapshot` with `effects` | `minecraft:speed`, amplifier 1, remaining ticks |
| FLT-01…07 | `entities` with `type`, `tags` + `includeEffects`, `name` + `excludeTypes`, `families` + `excludeFamilies`, `center` + `type: minecraft:player`, an empty `type`; `snapshot.entities` with `tags` | Only the matching entities (the pig, with Slowness; none; the player); `INVALID_PARAMS` |
| ENT-01…05 | `entity` by the pig's id, by the player's id, by an unknown id, without `id`, with an unknown key | Pig with location, rotation, velocity, health, effects; the player; `ENTITY_NOT_FOUND`; `INVALID_PARAMS` twice |
| TOP-01…05 | `top` at a loaded column, a far column, the Nether with nobody there, without `dimension` from the console, with `x` = 0.5 | `ok` + `minecraft:grass_block` at y = -61; `unloaded`; `unloaded`; `INVALID_PARAMS` twice |
| TOPS-01…03 | `tops` with 3 columns (one far), 33 columns, 32 columns | Compact results in order (`ok`, `ok`, `unloaded`); `LIMIT_EXCEEDED`; all 32 fit in one response |
| SB-01…09 | `scoreboard` with no params, `objective`, `objective` + `limit` 1, `player` + `objective`, `player`, an unknown objective, `limit` 65, an unknown player; `player` after the objective was removed | Objectives; both scores with `type` `Player`/`FakePlayer`; `truncated: true`; score 7; at least one score; `INVALID_PARAMS`; `LIMIT_EXCEEDED`; `PLAYER_NOT_FOUND`; no scores (not an error) |
| REG-01, -02 | `players`, `snapshot` defaults | Unchanged from Phase 2 |

#### Results

Run 2026-10-18 — BDS for Windows 1.26.52.3 (Windows 11 VM), client Minecraft for Windows 1.26.52.3, Add-On
0.1.0 (Phase 1). Requests from the BDS console went through `bds-console-bridge.ps1`; requests from chat were
pasted from the clipboard. The Add-On is BDS-only (ADR-0006); local-world rows are kept as reference.

| ID | Environment | Result | Notes |
| --- | --- | --- | --- |
| U-PROTO-01–10, V-RO-01, V-DEP-01, V-VER-01 | `pnpm test` | pass | 59 tests |
| S-01 / S-02 | BDS | pass | `Pack Stack - [00] Bedrock Observer [BP] … 0.1.0`; one `[Scripting] [be-observer] scripts loaded` line |
| S-03 / OBS-IN-07 | BDS, local world | pass | console `reload` → new `session`, `seq` 1; one response per request |
| OBS-ENV-02 | BDS | pass with a setting | No script output on stdout while `content-log-console-output-enabled=false`; with `true` the response line appears at once |
| OBS-ENV-03 | BDS | as documented | Console: works with `allow-cheats=false`. Player chat: refused without cheats; refused as `member` with cheats; works with cheats + operator |
| OBS-ENV-04 | BDS, local world | pass | Manifest depends on `@minecraft/server` only; no experiment needed |
| OBS-ENV-05 | BDS | pass (partial) | Joined `127.0.0.1:19132`; a loopback exemption already existed, so "without exemption" is not shown |
| OBS-ENV-06, -07 | — | not run / not applicable | Exposure not changed; Phase 3 rejected (ADR-0004), so OBS-ENV-07 does not apply |
| OBS-ENV-01 | local world (reference) | observed | Response lines are in `ContentLog*.txt`, intact, but the file is written in ~4 KB blocks |
| OBS-IN-01 | BDS | pass | 569-char line, valid JSON, `requestId` kept |
| OBS-IN-02 | BDS, local world | pass | `INVALID_JSON`, `requestId` recovered |
| OBS-IN-03 | BDS, local world | pass | `teleport` → `UNKNOWN_METHOD`; nothing happened in the world |
| OBS-IN-04 | BDS | pass with ASCII escapes | Raw UTF-8 on the console arrives garbled; `\u30c6…` escapes arrive exactly; responses are ASCII-escaped (after the fix) |
| OBS-IN-05 | BDS | game limits | Console: BDS refuses > 2048 chars before the Add-On. Chat: ≥ 511-char command disconnects the player; 448 worked |
| OBS-IN-06 | — | Phase 2 | needs the `player` method |
| OBS-PLY-01 | BDS | pass (0 and 1 player) | 2 players not run |
| OBS-PLY-03 | — | Phase 2 | needs the `player` method |
| OBS-PLY-06 | BDS, local world | observed | The same account had id `-4294967295` in the local world and `-8589934591` on BDS: ids are per world/session, not account ids |

Phase 2 — run 2026-10-18 on the same BDS (Add-On 0.1.0 with all eight methods). Second player: account
`PlayerB`, joined from another device on the LAN after `allowlist add`. Requests from the BDS console.

| ID | Result | Notes |
| --- | --- | --- |
| U-PROTO-11–13 | pass | 66 tests in total |
| OBS-IN-06 | pass | Console `player` without a selector → `NO_SOURCE_PLAYER`; with `{"name":…}` → the player |
| OBS-PLY-01 | pass | 2 players: both listed with ids and dimensions |
| OBS-PLY-02 | not available | No account with a space or Japanese in its name |
| OBS-PLY-03 | pass | Unknown name → `PLAYER_NOT_FOUND`; right after the player left, by name and by id → `PLAYER_NOT_FOUND` and `players` count 1 |
| OBS-PLY-04 | pass | After `execute in nether run tp …`: `dimension` `minecraft:nether`; back in the overworld afterwards |
| OBS-PLY-05 | pass | Sneaking → `sneaking: true`; double-jump flying → `flying: true`, `onGround: false`; standing still → velocity 0. Sprint (Ctrl+W on flat ground) → `sprinting: true`, velocity 0.28 blocks/tick. Swim (sprint in a temporary 3-deep pool) → `swimming: true`, `sprinting: true`, `inWater: true`, head 0.3 above the feet; just entering water → `inWater: true` only |
| OBS-PLY-06 | pass | Same id after leaving and rejoining, and after a BDS restart (same world); different between worlds |
| OBS-BLK-01 | pass | `(-1,-64,-1)` → `minecraft:bedrock` with `states`; positions echo the integer request |
| OBS-BLK-02 | pass | Air → `ok` + `minecraft:air`; far chunk → `unloaded`; overworld `y=320`/`-65` → `out_of_bounds`; Nether `y=128` → `out_of_bounds` (Nether height is 0–127); with no player online even spawn is `unloaded` |
| OBS-BLK-03 | pass (unit) | Limit covered by U-PROTO-12; 6 mixed positions answered in order in game |
| OBS-TGT-01 | pass | Looking at the ground → block `(0,-61,1)`, face `Up`, face location |
| OBS-TGT-02 | pass | Looking at the horizon → `block.hit: false` |
| OBS-TGT-03 | pass | Looking at the other player with `includeEntities` → `entity.hit: true`, `typeId` `minecraft:player`, `name`, distance 7.77 |
| OBS-TGT-04 | pass | `maxDistance` 65 → `LIMIT_EXCEEDED`; omitted → 8 reported |
| OBS-ENT-01 | pass | Radius 32, limit 5 → 5 nearest, sorted, `truncated: true`; the centre player is left out; the other player appears with `name`; `excludePlayers` removes them |
| OBS-SNP-01 | pass | All 7 sections in one response, one `tick`, `errors: {}`; unknown section → `INVALID_PARAMS`; `center` inside `snapshot.entities` → `INVALID_PARAMS` |
| OBS-SIZE-01 | pass | Full inventory (36 stacks) + all sections: entity list shortened to 14 with `omitted: {entities: 11}`, line 3,965 chars, intact on stdout |
| OBS-RO-01 | pass | Run separately: set up a known state (block, armor stand, 5 stone, tag, objective, effect, `doMobSpawning` false), took 12 console queries (`testforblock` ×2, `testfor` armor stand / `hasitem` ×2 / game mode / tag, `querytarget`, `tag list`, `scoreboard players list`, `scoreboard objectives list`, `gamerule`), ran all 13 methods (`bo-verify-ro-cases.json`, 16/16 answered as expected), took the same queries again: no difference |
| OBS-PERF-01 | pass | 300 requests at 1/s for 5 min (alternating `snapshot` and `entities`): every request that reached BDS (297) answered once with `ok: true`; no warnings or watchdog messages. 3 requests never reached BDS because the reference bridge's file-based input lost them (test harness, `docs/knowledge/bds-local-server/` §8) |

Events — run 2026-10-18 on the same BDS. All passed: OBS-EVT-01 (after the fix below), -02 (`cause`
`selfDestruct`, respawn `initialSpawn: false`), -03 (spider, `killer` PlayerA, `cause` `entityAttack`), -04 (the
Nether move was reported ~19 s after the teleport, when the client had loaded it), -05, -06, -07, -08 (new
session after `reload`, `seq` from 1). Found and fixed: on join BDS reported `Creative → Creative` twice
(`force-gamemode`); such no-op changes are no longer sent. Note: Creative players cannot be killed with `/kill`
(switch to Survival first).

Phase 2 additions — run 2026-10-18 on the same BDS (Add-On 0.1.0 with 13 methods), with PlayerA in the flat
overworld at (0, -60, 0), using `bo-verify.ps1`.

| ID | Result | Notes |
| --- | --- | --- |
| U-PROTO-14, -15 | pass | 75 tests in total |
| CAP-01, EFF-01–02, FLT-01–07, ENT-01–05, TOP-01–05, TOPS-01–03, SB-01–09, REG-01–02 | pass | 34/34 on the final build. Found on the way: 32 full `tops` entries would not fit in `maxResponseChars`, so entries were made compact (TOPS-03 added); `scoreboard` with `player` in a world without objectives wrongly answered `INVALID_PARAMS` (fixed, SB-09 added) |
| OBS-CMD-01–05 | pass | Operator command, Add-On build with ADR-0010, BDS restarted, `allow-cheats=false`. Console → answered. `member` → "コマンドの権限レベルが正しくありません: to3izo_bo:query。", nothing reached the Add-On. After `op` → answered, sender as source player, no chat output. After `reload` → answered. Regression 34/34. `permissions.json` restored from its backup afterwards |
| Bridge re-test | pass | After the fix to `bds-console-bridge.ps1` (shared read, complete lines only): 131 requests sent in four runs, 131 answered, none lost |

Release 1.0.0 — run 2026-10-18 on the same BDS (1.26.52.3) with the packaged `dist/be-observer-1.0.0.mcaddon`,
installed as the README says: unzipped into `behavior_packs/` and `resource_packs/` (the 0.1.0 development packs
moved aside), and the existing world `addon-lab-flat` switched from `[0,1,0]` to `[1,0,0]` in
`world_*_packs.json`. Requests through `bds-console-bridge.ps1`; player PlayerA joined from the same VM.

| ID | Result | Notes |
| --- | --- | --- |
| S-01 / S-02 / S-05 | pass | `Pack Stack - [00] Bedrock Observer [BP] … version: 1.0.0 @ behavior_packs/be-observer_BP`; one `scripts loaded` line; no warning or error from the Add-On. `capabilities` reports `addon.version` `1.0.0` |
| S-03 | pass | Console `reload` → new `session`, one `scripts loaded` line, one response per request |
| S-04 | pass | Leave and rejoin: `player_leave` then `player_join`/`player_spawn` events; same player id `-8589934591` |
| Upgrade 0.1.0 → 1.0.0 | pass | Existing world from the 0.1.0 development build; only the pack version in `world_*_packs.json` changed |
| Regression (`bo-verify-cases.json`) | pass | 34/34 |
| All methods (`bo-verify-ro-cases.json`) | pass | 16/16 after preparing its state (diamond block at 3,-60,3, an armor stand, objective `bo_ro` with a score for PlayerA); removed afterwards. Without that state 5 cases fail by design |
| Content log | clean | The only `ERROR` lines are BDS's replies to the test's own cleanup commands (`kill` / `scoreboard objectives remove` with nothing to remove) |

## Release checklist

The Add-On is BDS-only (ADR-0006), so the checks run on BDS with the packaged `.mcaddon` installed as the README
describes. Last run: 1.0.0, 2026-10-18 (Results above).

- [x] All smoke tests pass on BDS (Windows) with the target version, from the packaged `.mcaddon`
- [x] Secondary platform: not applicable (BDS only; Linux BDS is stated as untested in the README)
- [x] Upgrade from the previous version in an existing world works (first release: from the 0.1.0 development build)
- [x] Regression sets pass (`bo-verify-cases.json`, `bo-verify-ro-cases.json`)
- [x] Content log clean; no unreferenced-resource warnings left unexplained
- [x] `docs/CONTENT.md` checked (no new identifiers) and `CHANGELOG.md` updated; `pnpm version:set` applied
