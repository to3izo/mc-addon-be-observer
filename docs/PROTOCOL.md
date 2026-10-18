# PROTOCOL — Bedrock Observer public protocol (draft, protocol version 1)

> Status: **draft**. Phase 1 implements the transport, the envelopes, the error handling, the size limits,
> `capabilities` and `players`, verified on BDS 1.26.52.3; the other methods are specified but not implemented
> (`docs/PLAN.md`). The protocol is frozen as version 1 when Phase 2 ends; until then fields may change.
> Limits marked *provisional* are starting values, not documented Minecraft limits.
> The Add-On targets **Bedrock Dedicated Server only** (ADR-0006).

The protocol lets any external tool — an AI agent, a test script, a human at the chat — ask the Add-On for
observations and read the answers. It is deliberately small:

- **Read-only.** Every method only reads the game. There is no method that changes the world or runs a command.
- **Tool-independent.** Requests are plain JSON in a `/scriptevent` command; responses are one-line JSON in the
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
- A cheat-free player entry point (a custom command) is a Phase 2 candidate, not part of this draft.
- Other packs may send the same request with `system.sendScriptEvent("to3izo_bo:query", json)`; it is handled
  identically (there is no source player then; see §3).

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

- **Dimensions** are full ids: `minecraft:overworld`, `minecraft:nether`, `minecraft:the_end`. When omitted,
  the selected player's dimension is used; with no player context it is required.
- **Positions** (`location`, `headLocation`, ray hit points) are `{ "x": number, "y": number, "z": number }`
  in blocks, as returned by the API (not rounded).
- **Block coordinates** are integers. A request with a non-integer, `NaN`, infinite, or out-of-range value is
  `INVALID_PARAMS`. Horizontal range: |x|, |z| ≤ 30,000,000; vertical range: the dimension's height range
  (`OUT_OF_BOUNDS` per item for in-range-type but outside-world values, see §6).
- **Rotations** are `{ "pitch": number, "yaw": number }` in degrees (API `x` = pitch, `y` = yaw).
- **Directions** are unit vectors `{x,y,z}`.
- All numbers in requests must be finite JSON numbers; strings are not converted to numbers.

## 5. Methods

Every method is a pure read at one tick. "Planned phase" refers to `docs/PLAN.md`.

| Method | Phase | Summary |
| --- | --- | --- |
| `capabilities` | 1 | Versions, methods, limits |
| `players` | 1 | Players in the world |
| `player` | 2 | One player's state |
| `block` | 2 | One block |
| `blocks` | 2 | A few blocks by coordinates |
| `target` | 2 | What a player is looking at (block, optionally entity) |
| `entities` | 2 | Entities near a point, limited |
| `snapshot` | 2 | Several of the above for one player in one response |

Optional sections (`health`, `inventory`, `equipment`, `world`) are added only where the stable API makes them
trivial; `capabilities.methods` and `capabilities.sections` list what a build really supports.

### 5.1 `capabilities`

```json
{ "requestId": "c1", "method": "capabilities" }
```

```json
{
  "protocol": 1, "requestId": "c1", "ok": true, "method": "capabilities", "tick": 100, "session": "k3f9q2", "seq": 1, "time": 1797590000000,
  "data": {
    "addon": { "slug": "be-observer", "namespace": "to3izo_bo", "version": "0.1.0" },
    "protocol": { "version": 1, "supported": [1] },
    "scriptApi": { "@minecraft/server": "2.10.0" },
    "transport": { "requestEventId": "to3izo_bo:query", "responsePrefix": "to3izo_bo.response " },
    "methods": ["capabilities", "players"],
    "sections": [],
    "limits": { "maxRequestChars": 2048, "maxResponseChars": 4000 },
    "readOnly": true
  }
}
```

The example is the Phase 1 build. `capabilities` describes the running build exactly: `methods` and the handler
table come from one list, and a test checks that every listed method answers. Phase 2 adds its methods, sections
and parameter limits (planned: `maxBlocksPerRequest` 32, `maxRayDistance` 64, `maxEntityRadius` 32,
`maxEntities` 32, `maxInventorySlots` 54). All limit values are *provisional*. `capabilities` takes no
parameters.

### 5.2 `players`

```json
{ "requestId": "p1", "method": "players" }
```

```json
"data": {
  "players": [
    { "id": "-4294967295", "name": "Steve", "dimension": "minecraft:overworld" },
    { "id": "-8589934591", "name": "テスト プレイヤー", "dimension": "minecraft:nether" }
  ],
  "count": 2,
  "skipped": 0
}
```

`players` takes no parameters. A player who becomes invalid while the list is read (just left) is left out and
counted in `skipped`. The list may be truncated (§7).

### 5.3 `player`

```json
{ "requestId": "p2", "method": "player", "params": { "player": { "name": "Steve" } } }
```

```json
"data": {
  "id": "-4294967295",
  "name": "Steve",
  "dimension": "minecraft:overworld",
  "location": { "x": 10.5, "y": 64, "z": -3.2 },
  "headLocation": { "x": 10.5, "y": 65.62, "z": -3.2 },
  "rotation": { "pitch": 12.5, "yaw": -90 },
  "viewDirection": { "x": 0.98, "y": -0.21, "z": 0 },
  "velocity": { "x": 0, "y": -0.08, "z": 0 },
  "movement": { "onGround": true, "sneaking": false, "sprinting": false, "swimming": false, "falling": false, "inWater": false, "flying": false, "gliding": false, "climbing": false, "sleeping": false },
  "gameMode": "Creative",
  "selectedSlot": 0
}
```

`movement` contains only flags the stable API exposes directly; missing flags are omitted, never guessed.
Optional `params.include`: array of section names (`health`, `inventory`, `equipment`) to add.

### 5.4 `block`

```json
{ "requestId": "b1", "method": "block", "params": { "dimension": "minecraft:overworld", "x": -12, "y": 63, "z": 40 } }
```

```json
"data": {
  "dimension": "minecraft:overworld",
  "position": { "x": -12, "y": 63, "z": 40 },
  "status": "ok",
  "block": { "typeId": "minecraft:grass_block", "states": {}, "isAir": false, "isLiquid": false, "isWaterlogged": false }
}
```

`status` values (also used per item by `blocks` and `snapshot`):

| `status` | Meaning | `block` |
| --- | --- | --- |
| `ok` | The block was read. Air is a normal block (`typeId: "minecraft:air"`, `isAir: true`). | present |
| `unloaded` | The chunk is not loaded on the server. Nothing was loaded to answer. | absent |
| `out_of_bounds` | The position is outside the dimension's height range. | absent |
| `error` | The read failed for another reason; `reason` has a short code. | absent |

### 5.5 `blocks`

```json
{ "requestId": "b2", "method": "blocks", "params": { "dimension": "minecraft:overworld", "positions": [ { "x": 0, "y": 64, "z": 0 }, { "x": 0, "y": 65, "z": 0 } ] } }
```

`data.results` is an array in request order, each shaped like `block`'s data. More than `maxBlocksPerRequest`
positions → `LIMIT_EXCEEDED` (the request is rejected, not cut).

### 5.6 `target`

```json
{ "requestId": "t1", "method": "target", "params": { "maxDistance": 8, "includeLiquids": false, "includeEntities": true } }
```

```json
"data": {
  "player": { "id": "-4294967295", "name": "Steve" },
  "origin": { "x": 10.5, "y": 65.62, "z": -3.2 },
  "direction": { "x": 0.98, "y": -0.21, "z": 0 },
  "maxDistance": 8,
  "block": {
    "hit": true,
    "position": { "x": 15, "y": 63, "z": -4 },
    "face": "Up",
    "faceLocation": { "x": 0.42, "y": 1, "z": 0.77 },
    "block": { "typeId": "minecraft:grass_block", "states": {}, "isAir": false, "isLiquid": false, "isWaterlogged": false }
  },
  "entity": { "hit": false }
}
```

`hit: false` means the ray met nothing within `maxDistance` (which may include rays into unloaded or empty space;
the API does not tell those apart). `entity` is present only when `includeEntities` was requested and the build
supports it.

### 5.7 `entities`

```json
{ "requestId": "e1", "method": "entities", "params": { "radius": 16, "limit": 10, "excludePlayers": false } }
```

The centre is the selected player's location unless `dimension` + `center` are given. Results are sorted by
distance.

```json
"data": {
  "center": { "x": 10.5, "y": 64, "z": -3.2 },
  "radius": 16,
  "entities": [ { "id": "-12884901887", "typeId": "minecraft:cow", "location": { "x": 13.1, "y": 64, "z": -1.5 }, "distance": 3.1 } ],
  "returned": 1,
  "limit": 10,
  "truncated": false
}
```

### 5.8 `snapshot`

The basic information for one decision, in one response. Each section is taken in the same script call (same
tick), but the protocol does not promise transactional consistency, and it is not synchronised with
screenshots or input.

```json
{ "requestId": "s1", "method": "snapshot", "params": { "include": ["player", "target", "entities", "world"], "entities": { "radius": 8, "limit": 8 } } }
```

```json
"data": {
  "player": { },
  "target": { },
  "entities": { },
  "world": { "timeOfDay": 6000, "day": 3, "absoluteTime": 78000 },
  "errors": { }
}
```

A section that fails does not fail the snapshot: its key is absent from `data` and `data.errors.<section>` holds
`{ "code", "message" }`. Default `include` is `["player", "target"]`.

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
| `RESPONSE_TOO_LARGE` | Even after the documented truncation the response would exceed `maxResponseChars`. |
| `INTERNAL_ERROR` | An unexpected exception. The message is a short summary; the details go to a diagnostic line. |

Per-item conditions inside a successful response (`unloaded`, `out_of_bounds`, `hit: false`) are **not** errors.

## 7. Size limits and truncation

- Lengths are JavaScript string lengths (UTF-16 code units). `maxResponseChars` is measured on the final ASCII
  line, where a non-ASCII character takes 6 characters (`\uXXXX`).
- A request longer than `maxRequestChars` characters is refused before parsing.
- `maxResponseChars` limits the whole line, prefix included.
- A response is built, serialised and measured. If it exceeds `maxResponseChars`, list fields that allow it
  (`entities`, inventory slots) are shortened from the end and the response gets `"truncated": true` and
  `"omitted": { "<field>": <count> }` at the level of that list. Single values are never cut.
- If the response is still too long, the answer is `RESPONSE_TOO_LARGE`; ask for less (lower `limit`, fewer
  sections).
- There is no paging, resend, or multi-line response in protocol 1. If a parser sees a prefixed line that is not
  valid JSON, it treats the response as lost and may resend the request with a new `requestId`.

## 8. Versioning

- `protocol` is an integer that changes only for incompatible changes (renamed/removed fields, changed meaning).
  Adding a method, an optional field, or a new error code is compatible and does not change it.
- The Add-On version (`capabilities.addon.version`) follows `docs/adr/0002-versioning.md` and is independent.
- Tools call `capabilities` first, check `protocol.supported`, and use only listed methods and sections.

## 9. Responsibilities of an external tool

The Add-On only answers. A tool that uses it is responsible for:

- **Sending** `scriptevent` on the BDS standard input (no leading `/`, ASCII only, at most 2048 characters of
  message), or typing `/scriptevent` into an operator's chat (cheats on, whole command ≤ 448 characters), and
  choosing who sends it (which affects `NO_SOURCE_PLAYER` and the game's permission checks).
- **Collecting** the BDS standard output, finding the prefix, and matching responses to requests by `requestId`,
  with its own timeout. A missing response means "unknown", not "failure of the game".
- **Recording receive time** on its own clock next to `tick`/`time`, and not treating observations as current.
- **Rate**: sending one request at a time per world (or a small number) and not flooding the chat or console.
- **Not exposing** the log or the console to other users or networks (`SECURITY.md`).
