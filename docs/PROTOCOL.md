# PROTOCOL — Bedrock Observer public protocol (protocol version 1)

> Status: **frozen as protocol 1** (2026-10-18, end of Phase 2). Everything below is implemented and verified on
> BDS 1.26.52.3 (`docs/TESTING.md`). From now on, incompatible changes need a new protocol version; compatible
> additions do not (§8).
> The Add-On targets **Bedrock Dedicated Server only** (ADR-0006).

The protocol lets any external tool — an AI agent, a test script, a human at the chat — ask the Add-On for
observations and read the answers. It is deliberately small:

- **Read-only.** Every method only reads the game. There is no method that changes the world or runs a command.
  The only settings, which opt-in event kinds are on (`subscribe`, §5.14) and which opt-in features are on
  (`features`, §5.15), live in the Add-On's memory only.
- **Tool-independent.** Requests are plain JSON in a `/scriptevent` command (or the operator command of §1); responses are one-line JSON in the
  script log. No AI model, MCP server, HTTP or WebSocket is assumed.
- **Explicit about uncertainty.** Air, "no hit", unloaded chunks, unsupported methods and failures are different
  answers. When a result is limited or cut short, the response says so.

## 1. Transport

### Request

```
/scriptevent to3izo_bo:query <request JSON>
```

- The script event id is `to3izo_bo:query`. Other ids in the `to3izo_bo:` namespace are reserved.
- The message is the rest of the command line: one JSON object. Spaces, quotes and backslashes inside strings
  are fine.
- **Send ASCII only.** On BDS for Windows the console reads its input in a non-UTF-8 code page, so non-ASCII text
  typed into the console arrives garbled. Write any non-ASCII character as a JSON escape (`"\u30c6"` for テ);
  the Add-On's JSON parser restores it exactly (verified on BDS 1.26.52.3).
- Who can run `/scriptevent` is decided by the game; the Add-On adds no permission of its own and no way around
  the game's. Verified on BDS 1.26.52.3:
  - from the **BDS console**: works with `allow-cheats=false` (no source player; `sourceType` `Server`);
  - from a **player's chat**: needs cheats on *and* operator permission (a `member` gets "command permission
    level" errors).
- Length: the BDS console refuses a message over 2048 characters (`Message length exceeds (2048) character
  limit!`; the Add-On never sees it). A **player's chat command** of about 511 characters or more disconnects
  that player (NetherNet `ClientDisconnection-122`; a 448-character command worked), so tools that type into chat
  keep the whole command at or below 448 characters. The Add-On's own `maxRequestChars` (2048) only matters for
  requests that arrive by other routes (`system.sendScriptEvent`).
- Other packs may send the same request with `system.sendScriptEvent("to3izo_bo:query", json)`; it is handled
  identically (there is no source player then; see §3).

### Request by custom command (operators, no cheats needed)

```
/to3izo_bo:query "<request JSON with every \" escaped>"
```

The same request can be sent as a custom command (ADR-0010). It is answered exactly like the script event (same
response line, errors and limits); `capabilities.transport.requestCommand` names it.

- **Operators only, cheats not required.** Verified on BDS 1.26.52.3 with `allow-cheats=false`: a `member` gets
  the game's "command permission level" error and nothing reaches the Add-On; an operator gets the answer; the
  BDS console can run it too (`to3izo_bo:query "…"`, no leading `/`).
- **The JSON is one quoted string.** Put it in double quotes and write every `"` inside as `\"`:
  `/to3izo_bo:query "{\"requestId\":\"p1\",\"method\":\"player\"}"`. Unquoted JSON is a syntax error.
  Spaces inside the quotes are kept. Non-ASCII text typed in chat arrives intact.
- The sender becomes the source player (§3), as with `/scriptevent` from chat.
- Nothing is printed to the sender's chat; the answer is the log line only.
- Without another command of the same name, the game also accepts the short form `/query "…"`; tools should use
  the full name.
- The command is registered when the server starts. After updating to a build that adds or changes it, restart
  BDS; `/reload` cannot register a new or changed command.
- Keep the whole command within the chat length given above (escaped quotes count). That limit was measured with
  `/scriptevent`; it was not measured separately for this command.

### Response

One line per request, written with `console.log`. On BDS it reaches standard output when
`content-log-console-output-enabled=true` is set in `server.properties`; it appears immediately, as:

```
[2026-10-18 13:55:12:647 INFO] [Scripting] to3izo_bo.response {"protocol":1,"requestId":"k2","ok":true,...}
```

- **The line is pure ASCII.** Every non-ASCII character in the JSON is written as a `\uXXXX` escape, because BDS for
  Windows writes its console in the system code page (CP932 on a Japanese system) and would garble UTF-8 text.
  A standard JSON parser turns the escapes back into the original text.
- BDS may follow the line with empty lines; ignore them.

- The fixed prefix `to3izo_bo.response ` (with one trailing space) marks a machine-readable line. Everything
  after the prefix up to the end of the line is exactly one JSON object.
- The host may put its own text **before** the prefix (BDS adds a timestamp and log level, the content log adds
  its own decoration). Parsers search for the prefix inside the line and parse the rest; they never assume the
  line starts with it.
- Lines without the prefix are human diagnostics (`[be-observer] ...`), have no fixed format, and must not be
  parsed by tools.
- How a tool collects the BDS standard output (and writes to its standard input) is the tool's job (§9). A
  reference bridge for Windows is `docs/knowledge/bds-local-server/scripts/bds-console-bridge.ps1`.

## 2. Envelopes

### Request

```json
{ "protocol": 1, "requestId": "r-0001", "method": "player", "params": { "player": { "name": "Steve" } } }
```

| Field | Type | Required | Rule |
| --- | --- | --- | --- |
| `protocol` | integer | no | If present, must be a version this Add-On speaks (`capabilities.protocol.supported`). Otherwise `UNSUPPORTED_PROTOCOL`. |
| `requestId` | string | yes | 1–64 characters from `[A-Za-z0-9._:-]`. Echoed unchanged. The Add-On does not check uniqueness. |
| `method` | string | yes | One of §5. Unknown → `UNKNOWN_METHOD`. |
| `params` | object | no | Method-specific; unknown keys → `INVALID_PARAMS` (so typos are not silently ignored). |

Any other top-level field → `INVALID_REQUEST` (`details.field` names it). A `method` that is not a well-formed
name (`^[a-z][A-Za-z0-9_]{0,63}$`) is `INVALID_REQUEST`; a well-formed but unimplemented one is `UNKNOWN_METHOD`.

### Success response

```json
{
  "protocol": 1,
  "requestId": "r-0001",
  "ok": true,
  "method": "player",
  "tick": 183402,
  "session": "k3f9q2",
  "seq": 17,
  "time": 1797590000123,
  "data": { }
}
```

### Error response

```json
{
  "protocol": 1,
  "requestId": "r-0001",
  "ok": false,
  "method": "player",
  "tick": 183402,
  "session": "k3f9q2",
  "seq": 18,
  "time": 1797590000180,
  "error": { "code": "PLAYER_NOT_FOUND", "message": "no player named \"Stve\"" }
}
```

| Field | Meaning |
| --- | --- |
| `protocol` | Protocol version of this response. |
| `requestId` | Copied from the request. When the message is not valid JSON, the Add-On still looks for a well-formed `"requestId":"<id>"` pair in the raw text and echoes it (so a tool can match the `INVALID_JSON` answer); if none is found it is `null`. |
| `ok` | `true` → `data` is present; `false` → `error` is present. Never both. |
| `method` | Copied from the request when it was a string; else `null`. |
| `tick` | `system.currentTick` when the observation was taken. Use it to order observations; it keeps counting across `/reload` (only `session`/`seq` restart). |
| `session` | Random id chosen when the script starts. A new value means the script was reloaded (`/reload`, server restart) and `seq` restarted. |
| `seq` | Response counter within the session, starting at 1. Gaps mean lost lines. |
| `time` | `Date.now()` on the machine running the script (ms since epoch). The game host's clock is not synchronised with the tool's; the tool records its own receive time and does not compare the two directly. |

`error.message` is for humans and may change; tools branch on `error.code`. `error.details` (object) is optional.

## 3. Choosing a player

Methods that observe a player take `params.player`:

| Form | Meaning |
| --- | --- |
| omitted | The player who ran `/scriptevent` (`sourceEntity` is a player). |
| `{ "name": "Steve" }` | Exact, case-sensitive match on `Player.name` (the account name; may contain spaces and non-ASCII). Not `nameTag`. |
| `{ "id": "-4294967295" }` | Exact match on `Player.id` (a string, as returned by `players`). |

- When `player` is omitted and there is no source player (server console, command block, another pack's
  `sendScriptEvent`), the answer is `NO_SOURCE_PLAYER`. The Add-On never guesses "the only player".
- Name and id together → `INVALID_PARAMS`.
- A player who left between the request and the read is `PLAYER_NOT_FOUND`; an entity reference that became
  invalid during the read is `TARGET_INVALID`.

## 4. Values and validation

- **Dimensions** are full ids: `minecraft:overworld`, `minecraft:nether`, `minecraft:the_end` (anything else is
  `DIMENSION_NOT_FOUND`). Where a method takes `dimension` and it is omitted, the source player's dimension is
  used; a request from the BDS console has no source player, so it must give `dimension` (else
  `INVALID_PARAMS`).
- **Positions** (`location`, `headLocation`, ray hit points) are `{ "x": number, "y": number, "z": number }`
  in blocks, as returned by the API (not rounded).
- **Block coordinates** are integers. A non-integer, non-number or |value| > 30,000,000 is `INVALID_PARAMS`.
  A position outside the dimension's height range (`y < min` or `y >= max`, e.g. -64…319 in the overworld) is not
  an error: it is answered per item as `out_of_bounds` (§5.4).
- **Rotations** are `{ "pitch": number, "yaw": number }` in degrees (API `x` = pitch, `y` = yaw).
- **Directions** are unit vectors `{x,y,z}`.
- Requests use JSON numbers and booleans as such; strings are never converted (`"8"` is not 8, `"true"` is not
  true).
- **Columns** (`top`, `tops`) are `{ "x": integer, "z": integer }` with the same range as block coordinates.
- **Names in filters** (entity type ids, families, tags, entity names, objective ids) are strings of 1–64
  characters; lists of them hold 1–16 items. They are passed to the game as they are (no `minecraft:` is added).
- Distances (`radius`, `maxDistance`) accept decimals; counts (`limit`) are integers. A value above its
  `capabilities.limits` entry is `LIMIT_EXCEEDED`; below the minimum (1) is `INVALID_PARAMS`. Omitted values use
  `capabilities.defaults`.

## 5. Methods

Every method is a pure read at one tick. All of them are implemented (Phase 2, `docs/ROADMAP.md`).

| Method | Summary |
| --- | --- |
| `capabilities` | Versions, methods, sections, limits, defaults |
| `players` | Players in the world |
| `player` | One player's state, plus optional sections |
| `block` | One block |
| `blocks` | A few blocks by coordinates |
| `target` | What a player is looking at (block, optionally entity) |
| `entities` | Entities near a player or a point, limited |
| `snapshot` | Several of the above for one player in one response |
| `events` | Recent game events after a sequence number (§5.9, §10) |
| `entity` | One entity by id (§5.10) |
| `top` | The topmost block of one column: where the ground is (§5.11) |
| `tops` | The topmost blocks of a few columns, compact (§5.12) |
| `scoreboard` | Objectives, the scores of one objective, or one player's scores (§5.13) |
| `subscribe` | Turn opt-in event kinds on or off, or read which are on (§5.14) |
| `features` | Turn opt-in features on (BDS console only) or off, or read which are on (§5.15) |
| `container` | The items in one block's inventory (chest, barrel, hopper, ...); needs the `containers` feature (§5.16) |

### 5.1 `capabilities`

```json
{ "requestId": "c1", "method": "capabilities" }
```

```json
"data": {
  "addon": { "slug": "be-observer", "namespace": "to3izo_bo", "version": "1.1.0" },
  "build": { "id": "23aec2ab6a45@20261018T142622Z", "time": "2026-10-18T14:26:22.068Z", "commit": "23aec2ab6a45", "dirty": false },
  "protocol": { "version": 1, "supported": [1] },
  "scriptApi": { "@minecraft/server": "2.10.0" },
  "transport": { "requestEventId": "to3izo_bo:query", "requestCommand": "to3izo_bo:query", "responsePrefix": "to3izo_bo.response ", "eventPrefix": "to3izo_bo.event " },
  "methods": ["capabilities", "players", "player", "block", "blocks", "target", "entities", "snapshot", "events", "entity", "top", "tops", "scoreboard", "subscribe", "features", "container"],
  "sections": ["health", "inventory", "equipment", "effects", "world"],
  "events": ["player_join", "player_leave", "player_spawn", "entity_die", "dimension_change", "game_mode_change", "game_rule_change"],
  "optionalEvents": { "kinds": ["block_break", "block_place", "entity_hurt", "effect_add", "item_use", "explosion", "weather_change", "entity_spawn"], "enabled": ["entity_hurt"] },
  "optionalFeatures": { "kinds": ["containers"], "enabled": [] },
  "limits": { "maxRequestChars": 2048, "maxResponseChars": 4000, "maxBlocksPerRequest": 32, "maxRayDistance": 64, "maxEntityRadius": 32, "maxEntities": 32, "maxInventorySlots": 54, "maxScoreEntries": 64, "maxEventsPerSecond": 20, "eventBufferSize": 64, "maxEventsPerRequest": 64, "eventPlayerRadius": 32 },
  "defaults": { "rayDistance": 8, "entityRadius": 16, "entityLimit": 16, "scoreLimit": 32 },
  "readOnly": true
}
```

`capabilities` describes the running build exactly: `methods` and the handler table come from one list, and a
test checks that every listed method answers. Limit values may be raised or lowered by a later build without a
protocol change; tools read them from here instead of hard-coding them.
`capabilities` takes no parameters.

- `build` identifies the bundle the server runs (ADR-0014): `commit` is the short hash of the source commit, `dirty`
  is true when the source had uncommitted changes, `time` is when it was bundled (UTC), and `id` joins them as
  `<commit>[+dirty]@<YYYYMMDDTHHMMSSZ>`. After deploying a build, a tool compares `build.id` with the id the build
  printed (`pnpm build` logs it) to know that the server runs it; a rebuild always gets a new `id`. Without git,
  `commit` and `dirty` are `null` and `id` starts with `nogit`. Compare `id` as a whole; do not parse it.
- `events` lists the event kinds that are always on (§10). `optionalEvents.kinds` lists the opt-in kinds and
  `optionalEvents.enabled` the ones that are on right now (§5.14).
- `optionalFeatures.kinds` lists the opt-in features and `optionalFeatures.enabled` the ones that are on right now
  (§5.15).

### 5.2 `players`

```json
{ "requestId": "p1", "method": "players" }
```

```json
"data": {
  "players": [
    { "id": "-8589934591", "name": "Steve", "dimension": "minecraft:overworld" },
    { "id": "-12884901887", "name": "テスト プレイヤー", "dimension": "minecraft:nether" }
  ],
  "count": 2,
  "skipped": 0
}
```

`players` takes no parameters. A player who becomes invalid while the list is read (just left) is left out and
counted in `skipped`. The list may be truncated (§7). (Non-ASCII names appear as `\uXXXX` escapes on the wire,
§1.) A player `id` is an entity id, not an account id: on one BDS world it stayed the same across leaving/rejoining
and a server restart, but the same account had a different id in another world.

### 5.3 `player`

Parameters: `player` (selector, §3), `include` (array of section names from `capabilities.sections`).

```json
{ "requestId": "p2", "method": "player", "params": { "player": { "name": "Steve" }, "include": ["health", "inventory", "equipment", "effects", "world"] } }
```

```json
"data": {
  "id": "-8589934591",
  "name": "Steve",
  "dimension": "minecraft:overworld",
  "location": { "x": 0.5, "y": -60, "z": 0.5 },
  "headLocation": { "x": 0.5, "y": -58.47998809814453, "z": 0.5 },
  "rotation": { "pitch": 48.7421875, "yaw": 0.3460693359375 },
  "viewDirection": { "x": -0.0039, "y": -0.7517, "z": 0.6594 },
  "velocity": { "x": 0, "y": 0, "z": 0 },
  "movement": { "onGround": true, "sneaking": false, "sprinting": false, "swimming": false, "falling": false, "inWater": false, "flying": false, "gliding": false, "climbing": false, "sleeping": false, "jumping": false },
  "gameMode": "Creative",
  "selectedSlot": 0,
  "health": { "current": 20, "max": 20 },
  "inventory": { "size": 36, "emptySlots": 34, "items": [ { "slot": 0, "typeId": "minecraft:stone", "amount": 64 }, { "slot": 1, "typeId": "minecraft:diamond_sword", "amount": 1, "nameTag": "Blade" } ] },
  "equipment": { "Head": null, "Chest": null, "Legs": null, "Feet": null, "Mainhand": { "typeId": "minecraft:stone", "amount": 64 }, "Offhand": null },
  "effects": [ { "typeId": "minecraft:speed", "amplifier": 1, "duration": 11928 } ],
  "world": { "timeOfDay": 17014, "day": 3, "absoluteTime": 89014 }
}
```

- `movement` contains only flags the stable API exposes directly; nothing is guessed.
- `health`, `inventory`, `equipment` are `null` when the entity has no such component.
- `effects` lists the active status effects: `amplifier` 0 is level I, `duration` is the remaining time in ticks as
  the API reports it.
- `inventory.items` lists occupied slots only, in slot order; `nameTag` appears only when the item has a custom
  name. It may be truncated (§7).

### 5.4 `block`

Parameters: `x`, `y`, `z` (integers), `dimension` (§4).

```json
{ "requestId": "b1", "method": "block", "params": { "dimension": "minecraft:overworld", "x": 0, "y": -61, "z": 0 } }
```

```json
"data": {
  "dimension": "minecraft:overworld",
  "position": { "x": 0, "y": -61, "z": 0 },
  "status": "ok",
  "block": { "typeId": "minecraft:grass_block", "states": {}, "isAir": false, "isLiquid": false, "isWaterlogged": false }
}
```

`status` values (also used per item by `blocks`):

| `status` | Meaning | `block` |
| --- | --- | --- |
| `ok` | The block was read. Air is a normal block (`typeId: "minecraft:air"`, `isAir: true`). | present |
| `unloaded` | The chunk is not loaded on the server (for example, no player is near). Nothing is loaded to answer. | absent |
| `out_of_bounds` | The position is outside the dimension's height range. | absent |
| `error` | The read failed for another reason; `reason` has the error's name. | absent |

### 5.5 `blocks`

Parameters: `positions` (1…`maxBlocksPerRequest` integer positions), `dimension` (§4).

```json
{ "requestId": "b2", "method": "blocks", "params": { "dimension": "minecraft:overworld", "positions": [ { "x": 0, "y": -61, "z": 0 }, { "x": 0, "y": 320, "z": 0 } ] } }
```

```json
"data": { "dimension": "minecraft:overworld", "results": [ { "position": { "x": 0, "y": -61, "z": 0 }, "status": "ok", "block": { } }, { "position": { "x": 0, "y": 320, "z": 0 }, "status": "out_of_bounds" } ] }
```

`results` is in request order, each shaped like `block`'s data. More than `maxBlocksPerRequest` positions →
`LIMIT_EXCEEDED` (the request is rejected, not cut).

### 5.6 `target`

Parameters: `player` (§3), `maxDistance` (default `rayDistance`, at most `maxRayDistance`), `includeLiquids`,
`includePassable`, `includeEntities` (booleans, default false).

```json
{ "requestId": "t1", "method": "target", "params": { "player": { "name": "Steve" }, "maxDistance": 8, "includeEntities": true } }
```

```json
"data": {
  "player": { "id": "-8589934591", "name": "Steve" },
  "origin": { "x": 0.5, "y": -58.48, "z": 0.5 },
  "direction": { "x": -0.0039, "y": -0.7517, "z": 0.6594 },
  "maxDistance": 8,
  "block": {
    "hit": true,
    "position": { "x": 0, "y": -61, "z": 1 },
    "face": "Up",
    "faceLocation": { "x": 0.49, "y": 0, "z": 0.83 },
    "block": { "typeId": "minecraft:grass_block", "states": {}, "isAir": false, "isLiquid": false, "isWaterlogged": false }
  },
  "entity": { "hit": true, "id": "-17179869176", "typeId": "minecraft:cow", "location": { "x": 1.2, "y": -60, "z": 4.0 }, "distance": 3.4 }
}
```

- The ray starts at the player's head. `face` is `Up`, `Down`, `North`, `South`, `East` or `West`;
  `faceLocation` is relative to the block's bottom north-west corner.
- `hit: false` means the ray met nothing within `maxDistance` (which may include rays into unloaded or empty
  space; the API does not tell those apart).
- `entity` is present only when `includeEntities` is true: the nearest entity on the ray, not the player
  itself. Players carry `name`; other entities carry `nameTag` when they have a custom name.

### 5.7 `entities`

Parameters: either `player` (§3; the centre is that player's location, and the player itself is left out) or
`center` (`{x,y,z}`, decimals allowed) with an optional `dimension` (§4), not both; `radius` (default
`entityRadius`), `limit` (default `entityLimit`), `excludePlayers` (boolean), `includeEffects` (boolean; adds
`effects` as in §5.3 to each entity), and these filters, applied by the game before `limit`:

| Filter | Keeps entities that |
| --- | --- |
| `type` | have this type id (e.g. `minecraft:zombie`) |
| `excludeTypes` | have none of these type ids |
| `families` | belong to all of these families (e.g. `["monster"]`) |
| `excludeFamilies` | belong to none of these families |
| `name` | have this name (a player's name, or an entity's name tag) |
| `tags` | have all of these tags |

```json
{ "requestId": "e1", "method": "entities", "params": { "player": { "name": "Steve" }, "radius": 32, "limit": 5 } }
{ "requestId": "e2", "method": "entities", "params": { "player": { "name": "Steve" }, "families": ["monster"], "includeEffects": true } }
```

```json
"data": {
  "dimension": "minecraft:overworld",
  "center": { "x": 0.5, "y": -60, "z": 0.5 },
  "radius": 32,
  "entities": [ { "id": "-17179869176", "typeId": "minecraft:cow", "location": { "x": 10.0, "y": -60, "z": 11.2 }, "distance": 14.33 } ],
  "returned": 1,
  "limit": 5,
  "truncated": false
}
```

Results are sorted by distance from the centre. `truncated: true` means more entities were in range than
`limit` (or the list was shortened to fit the response, §7, which also adds `omitted`).

### 5.8 `snapshot`

The basic information for one decision, in one response. Each section is taken in the same script call (same
tick), but the protocol does not promise transactional consistency, and it is not synchronised with
screenshots or input.

Parameters: `player` (§3); `include` (any of `player`, `health`, `inventory`, `equipment`, `effects`, `target`,
`entities`, `world`; default `["player", "target"]`); `target` (options of §5.6 except `player`); `entities` (the
options and filters of §5.7 except `player`, `center` and `dimension`; the centre is always the snapshot's player). Option groups are validated before
anything is read, so a typo fails the whole request.

```json
{ "requestId": "s1", "method": "snapshot", "params": { "player": { "name": "Steve" }, "include": ["player", "target", "entities", "world"], "entities": { "radius": 16, "limit": 8 } } }
```

```json
"data": {
  "player": { },
  "target": { },
  "entities": { },
  "world": { "timeOfDay": 17520, "day": 3, "absoluteTime": 89520 },
  "errors": { }
}
```

Each section has the shape of the matching method or `player` section. A section that fails does not fail the
snapshot: its key is absent from `data` and `data.errors.<section>` holds `{ "code", "message" }`. A player who
cannot be found fails the whole request (`NO_SOURCE_PLAYER`, `PLAYER_NOT_FOUND`).

### 5.9 `events`

Recent game events (§10) kept in memory, for a tool that missed event lines or started late. Parameters:
`since` (event `seq`; default 0 = everything held), `limit` (1…`maxEventsPerRequest`, default 32), `kinds`
(array of event kinds from `capabilities.events` or `capabilities.optionalEvents.kinds`).

```json
{ "requestId": "ev2", "method": "events", "params": { "since": 12, "limit": 2 } }
```

```json
"data": {
  "events": [
    { "kind": "player_leave", "seq": 13, "tick": 119660, "time": 1792307365980, "data": { "player": { "id": "-8589934591", "name": "Steve" } } },
    { "kind": "player_join", "seq": 14, "tick": 120260, "time": 1792307396123, "data": { "player": { "id": "-8589934591", "name": "Steve" } } }
  ],
  "returned": 2,
  "limit": 2,
  "more": true,
  "missed": false,
  "oldestSeq": 1,
  "latestSeq": 17
}
```

- Events are oldest first. `more: true` means more events after the last one returned; ask again with `since`
  set to the last `seq`.
- `missed: true` means some events after `since` are no longer available: pushed out of the buffer
  (`eventBufferSize`), or dropped by the rate limit.
- The buffer lives in memory only: `/reload` or a server restart empties it and starts a new `session`, whose
  event `seq` starts again at 1.

### 5.10 `entity`

One entity by its `id` (from `players`, `entities`, `target` or an event), e.g. to follow a mob or a player.
Parameter: `id` (string, required).

```json
{ "requestId": "n1", "method": "entity", "params": { "id": "-25769803765" } }
```

```json
"data": {
  "id": "-25769803765",
  "typeId": "minecraft:pig",
  "nameTag": "BoPig",
  "dimension": "minecraft:overworld",
  "location": { "x": -5.08, "y": -60, "z": 0.79 },
  "rotation": { "pitch": 0, "yaw": 124.7 },
  "velocity": { "x": 0, "y": 0, "z": 0 },
  "health": { "current": 10, "max": 10 },
  "effects": [ { "typeId": "minecraft:slowness", "amplifier": 0, "duration": 11889 } ]
}
```

- A player has `name` instead of `nameTag`. `health` is `null` for entities without a health component.
- An entity that is not loaded (unloaded chunk, dead, despawned, or an id that never existed) is
  `ENTITY_NOT_FOUND`. Entity ids stay the same while the entity exists; a player's id stayed the same across
  rejoins and server restarts in the same world (`docs/knowledge/bds-local-server/`).

### 5.11 `top`

The topmost non-air block of one column: the ground, a tree top or a roof. Parameters: `x`, `z` (§4), `dimension`
(§4).

```json
{ "requestId": "h1", "method": "top", "params": { "dimension": "minecraft:overworld", "x": 5, "z": 5 } }
```

```json
"data": {
  "dimension": "minecraft:overworld",
  "column": { "x": 5, "z": 5 },
  "status": "ok",
  "position": { "x": 5, "y": -61, "z": 5 },
  "block": { "typeId": "minecraft:grass_block", "states": {}, "isAir": false, "isLiquid": false, "isWaterlogged": false }
}
```

`status` is `ok`, `unloaded` (the chunk is not loaded; nothing is loaded to answer), `empty` (only air), or
`error` (with `reason`). Like `block`, these are not errors (§6).

### 5.12 `tops`

Up to `maxBlocksPerRequest` columns in one request, answered in request order, as a compact height map. Parameters:
`columns` (array of `{x, z}`), `dimension` (§4). More columns than the limit is `LIMIT_EXCEEDED`.

```json
{ "requestId": "h2", "method": "tops", "params": { "dimension": "minecraft:overworld", "columns": [ { "x": 0, "z": 0 }, { "x": -3, "z": 7 }, { "x": 200000, "z": 200000 } ] } }
```

```json
"data": {
  "dimension": "minecraft:overworld",
  "results": [
    { "x": 0, "z": 0, "status": "ok", "y": -61, "typeId": "minecraft:grass_block" },
    { "x": -3, "z": 7, "status": "ok", "y": -61, "typeId": "minecraft:grass_block" },
    { "x": 200000, "z": 200000, "status": "unloaded" }
  ]
}
```

Entries leave out block states so that a full request always fits in one response; ask `top` or `block` for
the details of one column.

### 5.13 `scoreboard`

Read-only access to the world's scoreboard. Parameters: `objective` (objective id), `player` (§3), `limit`
(1…`maxScoreEntries`, default `scoreLimit`). What is answered depends on which are given:

| Parameters | Answer |
| --- | --- |
| none | `objectives`: `{ id, displayName, participants }` for each objective |
| `objective` | `objective` and its `scores`: `{ name, type, score }` per participant (`type` is `Player`, `Entity` or `FakePlayer`) |
| `player` | that player's `scores` in every objective: `{ objective, displayName, score }` (objectives without a score are left out) |
| `player` + `objective` | the same, for that objective only |

```json
{ "requestId": "b1", "method": "scoreboard", "params": { "objective": "kills" } }
```

```json
"data": {
  "objective": { "id": "kills", "displayName": "Kills" },
  "scores": [ { "name": "Steve", "type": "Player", "score": 7 }, { "name": "fake_p", "type": "FakePlayer", "score": 3 } ],
  "returned": 2,
  "total": 2,
  "truncated": false
}
```

- Lists are in the order the game gives them; `truncated: true` means more entries than `limit`.
- An objective that does not exist is `INVALID_PARAMS` (`details.param` = `objective`).
- The Add-On never creates or changes objectives or scores.

### 5.14 `subscribe`

Turns opt-in event kinds (§10) on and off (ADR-0014). Parameters: `enable`, `disable` (arrays of kinds from
`capabilities.optionalEvents.kinds`; both optional). Without parameters it only reports the state.

```json
{ "requestId": "o1", "method": "subscribe", "params": { "enable": ["block_break", "block_place", "entity_hurt"] } }
```

```json
"data": {
  "optional": ["block_break", "block_place", "entity_hurt", "effect_add", "item_use", "explosion", "weather_change", "entity_spawn"],
  "enabled": ["block_break", "block_place", "entity_hurt"],
  "changed": ["block_break", "block_place", "entity_hurt"]
}
```

- `enabled` is the state after the request; `changed` lists the kinds whose state the request changed (enabling a
  kind that is already on changes nothing). Both are in the order of `optional`.
- **Every opt-in kind is off when the script starts.** The state lives in memory only and is never written to the
  world: `/reload` and a server restart turn every kind off again. A tool that sees a new `session` (in a response
  or an event line) calls `subscribe` again.
- The state is one per server, shared by every tool and operator that sends requests: a kind stays on until
  someone turns it off. Tools that share a server agree on who switches what.
- The always-on kinds cannot be switched: naming one is `INVALID_PARAMS` (`details.param` names the list), as is an
  unknown kind, a kind in both lists, or a list that is not an array.

### 5.15 `features`

Turns opt-in features on and off (ADR-0015). Parameters: `enable`, `disable` (arrays of names from
`capabilities.optionalFeatures.kinds`; both optional). Without parameters it only reports the state. The only
feature is `containers` (§5.16).

```json
{ "requestId": "f1", "method": "features", "params": { "enable": ["containers"] } }
```

```json
"data": { "optional": ["containers"], "enabled": ["containers"], "changed": ["containers"] }
```

- **Only the BDS console can turn a feature on.** A request with `enable` that does not come from the console is
  `PERMISSION_DENIED` (`details: { "param": "enable", "required": "console" }`) and changes nothing. The console is
  a request whose source the game reports as the server, with no source player: `/scriptevent` typed into the
  console, or the custom command typed into the console. The game reports a pack script's `runCommand` as the
  server too; that is code the server owner installed. Chat (any player, operators included), `/execute as` a
  player, command blocks and NPC dialogue cannot turn a feature on. Verified on BDS 1.26.52.3.
- **Anyone who can send requests can turn a feature off**, and anyone can read the state.
- `enabled` is the state after the request; `changed` lists the features whose state the request changed. Both are
  in the order of `optional`.
- **Every feature is off when the script starts.** The state lives in memory only and is never written to the
  world: `/reload` and a server restart turn every feature off again. A tool that sees a new `session` asks the
  console to turn the feature on again.
- The state is one per server, shared by every tool and operator: while a feature is on, every source that can send
  requests can use it.
- An unknown name, a name in both lists, or a list that is not an array is `INVALID_PARAMS`.

### 5.16 `container`

The items in one block's inventory. Needs the `containers` feature (§5.15); while it is off the answer is
`FEATURE_DISABLED` (`details: { "feature": "containers" }`). Parameters: `x`, `y`, `z` (integers), `dimension`
(§4), `fromSlot` (integer, default 0, at most `maxInventorySlots` - 1).

```json
{ "requestId": "k1", "method": "container", "params": { "dimension": "minecraft:overworld", "x": 6, "y": -60, "z": 6 } }
```

```json
"data": {
  "dimension": "minecraft:overworld",
  "position": { "x": 6, "y": -60, "z": 6 },
  "status": "ok",
  "block": { "typeId": "minecraft:chest" },
  "container": { "size": 27, "emptySlots": 25, "items": [ { "slot": 0, "typeId": "minecraft:apple", "amount": 3 }, { "slot": 13, "typeId": "minecraft:bread", "amount": 2, "nameTag": "Lunch" } ] }
}
```

- `status` is the same as for `block` (§5.4): `ok`, `unloaded`, `out_of_bounds` or `error`; `block` and `container`
  are present only with `ok`. Nothing is loaded to answer, and there is no distance limit: any loaded chunk can be
  read.
- `container` is `null` when the block has no inventory the Script API exposes (stone, air, ...). Any block with an
  inventory is read; there is no list of types. Measured on BDS 1.26.52.3:

  | Block | `size` |
  | --- | --- |
  | chest, trapped chest, barrel, shulker boxes | 27 |
  | double chest (either half) | 54 |
  | dispenser, dropper | 9 |
  | hopper, brewing stand | 5 |
  | furnace, blast furnace, smoker | 3 (0 input, 1 fuel, 2 output) |
  | jukebox, lectern | 1 |
  | crafter, ender chest, chiseled bookshelf, decorated pot, campfire | `container: null` |

- **A double chest is one inventory.** Either half answers the whole double chest with the same `size` (54) and the
  same slot numbers.
- `size` and `emptySlots` describe the whole container. `items` lists occupied slots only, in slot order, from
  `fromSlot` on; `nameTag` appears only when the item has a custom name. Items inside an item (a shulker box in a
  chest) are not read.
- `items` may be truncated (§7). A full double chest of short item ids fits one line; long ids or custom names may
  not. When `container.truncated` is true, ask again with `fromSlot` = the last returned `slot` + 1.
- Reading does not open the container: no lid moves, no player sees anything, and the contents do not change.
- **A chest that still has a loot table** (a structure chest nobody has opened yet) **reads as empty**
  (`emptySlots` = `size`, no items), and reading it does not generate the loot: the game fills it when a player
  opens it. A tool cannot tell such a chest from an empty one. Verified on BDS 1.26.52.3 with a buried treasure
  chest.

## 6. Error codes

| Code | When |
| --- | --- |
| `REQUEST_TOO_LARGE` | The message exceeds `maxRequestChars` (checked before parsing). |
| `INVALID_JSON` | The message is not one JSON object. `requestId` is recovered from the raw text when possible, else `null`. |
| `INVALID_REQUEST` | Missing/invalid `requestId` or `method`, or wrong field types. |
| `UNSUPPORTED_PROTOCOL` | `protocol` is not in `capabilities.protocol.supported`. |
| `UNKNOWN_METHOD` | The method name is not implemented by this build. |
| `INVALID_PARAMS` | A parameter is missing, of the wrong type, non-finite, non-integer where an integer is needed, or unknown. `details.param` names it. |
| `LIMIT_EXCEEDED` | A count, radius or distance is above its limit. `details` has `param` and `limit`. |
| `NO_SOURCE_PLAYER` | A player was needed, none was given, and the request has no source player. |
| `PLAYER_NOT_FOUND` | No player matches the selector. |
| `DIMENSION_NOT_FOUND` | Unknown dimension id. |
| `TARGET_INVALID` | The player or entity became invalid while it was being read. |
| `ENTITY_NOT_FOUND` | `entity`: no loaded entity has this id. |
| `UNLOADED_CHUNK` | A read needed a chunk that is not loaded (methods that answer per item use `status: "unloaded"` instead). |
| `PERMISSION_DENIED` | `features`: only the BDS console can turn a feature on (§5.15). `details.required` is `"console"`. |
| `FEATURE_DISABLED` | The method needs an opt-in feature that is off (§5.15). `details.feature` names it. |
| `RESPONSE_TOO_LARGE` | Even after the documented truncation the response would exceed `maxResponseChars`. |
| `INTERNAL_ERROR` | An unexpected exception. The message is a short summary; the details go to a diagnostic line. |

Per-item conditions inside a successful response (`unloaded`, `out_of_bounds`, `empty`, `hit: false`) are **not** errors.

Known Script API errors are answered with a protocol code instead of `INTERNAL_ERROR`, matched by the error's
name, and `details.scriptError` holds that name: `InvalidEntityError` → `TARGET_INVALID`;
`LocationInUnloadedChunkError`, `UnloadedChunksError` → `UNLOADED_CHUNK`; `LocationOutOfWorldBoundariesError`,
`ArgumentOutOfBoundsError`, `InvalidArgumentError`, `PropertyOutOfBoundsError`, `EntityQueryError`,
`NamespaceNameError` → `INVALID_PARAMS`. The same mapping is used for `snapshot` section errors.

## 7. Size limits and truncation

- Lengths are JavaScript string lengths (UTF-16 code units). `maxResponseChars` is measured on the final ASCII
  line, where a non-ASCII character takes 6 characters (`\uXXXX`).
- A request longer than `maxRequestChars` characters is refused before parsing.
- `maxResponseChars` limits the whole line, prefix included.
- A response is built, serialised and measured. If it exceeds `maxResponseChars`, list fields that allow it
  are shortened from the end, in this order: `players`; `entities`; `inventory.items`; `events`; `scores`; `objectives`; `container.items`. The object holding the
  list gets `"truncated": true` and `"omitted": { "<field>": <count> }`. Single values are never cut.
- If the response is still too long, the answer is `RESPONSE_TOO_LARGE`; ask for less (lower `limit`, fewer
  sections).
- There is no paging, resend, or multi-line response in protocol 1. If a parser sees a prefixed line that is not
  valid JSON, it treats the response as lost and may resend the request with a new `requestId`.

## 8. Versioning

- `protocol` is an integer that changes only for incompatible changes (renamed/removed fields, changed meaning).
  Adding a method, an optional field, or a new error code is compatible and does not change it.
- The Add-On version (`capabilities.addon.version`) follows Semantic Versioning (`AGENTS.md` Version policy,
  `docs/adr/0013-semantic-versioning.md`) and is independent. A new `protocol` number always comes with a new major
  Add-On version; compatible additions come with a minor version.
- Tools call `capabilities` first, check `protocol.supported`, and use only listed methods and sections.

## 9. Responsibilities of an external tool

The Add-On only answers. A tool that uses it is responsible for:

- **Sending** `scriptevent` on the BDS standard input (no leading `/`, ASCII only, at most 2048 characters of
  message), or typing a command into an operator's chat — `/to3izo_bo:query "…"` (no cheats needed) or
  `/scriptevent` (cheats on) — with the whole command ≤ 448 characters, and choosing who sends it (which affects
  `NO_SOURCE_PLAYER` and the game's permission checks).
- **Collecting** the BDS standard output, finding the prefix, and matching responses to requests by `requestId`,
  with its own timeout. A missing response means "unknown", not "failure of the game".
- **Recording receive time** on its own clock next to `tick`/`time`, and not treating observations as current.
- **Rate**: sending one request at a time per world (or a small number) and not flooding the chat or console.
- **Not exposing** the log or the console to other users or networks (`SECURITY.md`).
- **Moving lines between machines** when the tool does not run on the BDS host (for example a tool on a Mac and
  BDS in a Windows VM). The Add-On has no network transport and will not get one (ADR-0004); read the files of a
  console bridge through the VM's own channel (such as a VM manager's command execution), or forward the lines
  with a program outside Minecraft. A forwarder over the network follows `SECURITY.md` ("No network adapter;
  forwarding observations off the server").

## 10. Event lines

Besides answering requests, the Add-On writes one line for each of these game events (ADR-0008):

```
[2026-10-18 16:08:35:859 INFO] [Scripting] to3izo_bo.event {"protocol":1,"session":"2rgzknbo","kind":"entity_die","seq":10,"tick":118658,"time":1792307315858,"data":{...}}
```

- Prefix `to3izo_bo.event ` (one trailing space); the rest of the line is one JSON object, pure ASCII (§1).
  Like responses, find the prefix inside the line.
- Envelope: `protocol`, `session` (as in responses), `kind`, `seq` (event counter in the session, from 1,
  separate from response `seq`), `tick`, `time`, `data`, and `dropped` when the rate limit dropped events just
  before this one.
- Rate limit: at most `maxEventsPerSecond` lines per second (20 ticks). Dropped events get no `seq`; the next line
  carries their count in `dropped`, and `events` reports `missed`.
- The kinds in the first table below are always on. The opt-in kinds in the second table are off until a tool turns
  them on with `subscribe` (§5.14); while a kind is off, nothing of it is written or kept.
- Opt-in events share the rate limit, the buffer and the `seq` counter with the always-on kinds. A burst of
  opt-in events can therefore push other events out of the buffer or get them dropped; `dropped` and `missed` say so.

| `kind` | When | `data` |
| --- | --- | --- |
| `player_join` | A player connected (before spawning) | `player: {id, name}` |
| `player_leave` | A player left | `player: {id, name}` |
| `player_spawn` | A player spawned: first spawn after joining (`initialSpawn: true`) or respawn after death (`false`) | `player`, `initialSpawn`, `dimension`, `location` |
| `entity_die` | A player died, or a player killed an entity (other deaths are not reported) | `entity: {id, typeId, name \| nameTag}`, `cause` (API `EntityDamageCause`, e.g. `entityAttack`, `selfDestruct` for `/kill`), `dimension` and `location` when still readable, `killer` when an entity did it, `projectile` (type id) when a projectile did it |
| `dimension_change` | A player finished changing dimension | `player`, `from: {dimension, location}`, `to: {dimension, location}` |
| `game_mode_change` | A player's game mode changed (no-op changes are not reported) | `player`, `from`, `to` (e.g. `Creative`, `Survival`) |
| `game_rule_change` | A game rule changed | `rule` (e.g. `doDayLightCycle`), `value` |

Opt-in kinds (ADR-0014). Positions are `{x, y, z}`; `block` is `{typeId, states}` as in §5.4.

| `kind` | When | `data` |
| --- | --- | --- |
| `block_break` | A player broke a block | `player`, `dimension`, `position`, `block` (the block before it broke), `item` (type id of the item in hand, when there was one) |
| `block_place` | A player placed a block | `player`, `dimension`, `position`, `block` (the placed block) |
| `entity_hurt` | A player took damage, or a player damaged an entity (directly or with a projectile). Damage between other entities is not reported | `entity` (`{id, typeId, name \| nameTag}`), `damage`, `cause` (as in `entity_die`), `health` (`{current, max}` after the damage) with `dimension` and `location` while the entity is readable, `attacker` when an entity did it, `projectile` (type id) when a projectile did it |
| `effect_add` | A player got a status effect it did not have (effects on other entities are not reported) | `player`, `effect: {typeId, amplifier, duration}` |
| `item_use` | A player used an item (threw a snowball, placed a block, …) | `player`, `item: {typeId, amount}` |
| `explosion` | An explosion happened | `dimension`, `impactedBlocks` (number of blocks it destroyed), `bounds: {min, max}` of those blocks when there were any, `source` (`{id, typeId}`) when an entity caused it |
| `weather_change` | The weather changed | `dimension`, `from`, `to` (`Clear`, `Rain`, `Thunder`) |
| `entity_spawn` | An entity appeared within `eventPlayerRadius` blocks of a player in the same dimension (summoned, spawned naturally, born, a dropped item, a projectile, …). Entities coming back with a loaded chunk are not reported | `entity`, `cause` (API `EntityInitializationCause`, e.g. `Spawned`, `Born`), `dimension`, `location` |

Notes measured on BDS 1.26.52.3:

- `item_use` is also sent when a player places a block (the block item is "used"), together with `block_place`.
- `effect_add` is sent only when the player had no effect of that type: re-applying, extending or strengthening an
  effect the player already has sends nothing. Use `player` with `include: ["effects"]` for the current effects.
- `entity_hurt` follows the game's damage: a second hit within the short invulnerability time after a hit does no
  damage and sends nothing. Creative players take no damage.
- `explosion` has no position of its own: the source (TNT, creeper, end crystal) is gone when it is sent. `bounds`
  shows where blocks were destroyed; an explosion that destroyed nothing (in the air, in water) only says
  `impactedBlocks: 0`.
- Breaking a block in Survival drops an item: with `entity_spawn` on, a `minecraft:item` spawn follows the
  `block_break`. In Creative nothing drops.

- `dimension_change` is sent when the move completes for the player, which can be many seconds after the
  teleport (about 19 s for a teleport into the Nether). A player teleported back before that produced no event
  for the first move. `to.location` was about 1.6 below the teleport target's feet height.
- Chat messages and command use are **not** available (no stable API; BDS does not print chat). Detect chat in the
  tool, e.g. from the game screen. `game_mode_change` and `game_rule_change` are the only cheat-related signals,
  and they do not say who caused them.

