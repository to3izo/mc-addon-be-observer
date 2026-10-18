# SPEC — Bedrock Observer

> Agents read this file first. It states the current spec only; why it is this way is in `docs/adr/`
> (0003 protocol, 0004 BDS adapter, 0005 resource pack, 0006 BDS only), the wire format in `docs/PROTOCOL.md`, the research
> behind it in `docs/RESEARCH.md`, and the phased roadmap and progress in `docs/ROADMAP.md`.

## Purpose

Bedrock Observer gives external tools — AI agents that play Minecraft Bedrock, test scripts, and humans who
develop and debug Add-Ons — **structured, read-only observations** of players and the world around them, on a
**Bedrock Dedicated Server (BDS)**. A tool sends a JSON request with `/scriptevent` (typically on the BDS
console); the Add-On answers with one line of JSON on the BDS standard output.
It depends on no particular AI model, MCP server or control tool, and it never changes the world.
It is published as open source in its own repository.

## Main features

Status: all rows are implemented and verified on BDS 1.26.52.3 (`docs/TESTING.md`); protocol 1 is not frozen yet
(`docs/ROADMAP.md`).

| # | Feature | Summary | Phase | Status |
| --- | --- | --- | --- | --- |
| 1 | Request / response path | `/scriptevent to3izo_bo:query <JSON>` → `to3izo_bo.response {JSON}` log line; validation, error codes, size limits | 1 | done (BDS) |
| 2 | `capabilities` | Add-On / protocol / Script API versions, methods, sections, limits | 1 | done (BDS) |
| 3 | `players` | Players in the world (id, name, dimension) | 1 | done (BDS) |
| 4 | `player` | Position, head position, rotation, view direction, velocity, movement flags, game mode, selected slot | 2 | done (BDS) |
| 5 | `block` / `blocks` | Block id and states at integer coordinates; `unloaded` / `out_of_bounds` distinguished from air | 2 | done (BDS) |
| 6 | `target` | Block the player looks at (face, hit position); optionally the entity | 2 | done (BDS) |
| 7 | `entities` | Entities near a point, radius- and count-limited, sorted by distance | 2 | done (BDS) |
| 8 | `snapshot` | `player` + `target` (+ `entities`, `world`) in one response, per-section errors | 2 | done (BDS) |
| 9 | Sections | `health`, `inventory`, `equipment`, `world` (time of day, day, absolute time) | 2 | done (BDS) |

Deferred (stable API exists but not in the first version): weather (stable read API does not exist), light
level, biome, rays from an arbitrary origin, small block regions (`getBlocks`), client/input info, join/leave
events, a cheat-free custom command entry point, the BDS network adapter (ADR-0004).

## Target Minecraft version

| | |
| --- | --- |
| Minimum engine version | `addon.config.json` → `minEngineVersion` = 1.26.50 |
| Script API | `@minecraft/server` 2.10.0 (stable; the 1.26.50 release). No other module in this pack. |
| Verified builds | BDS for Windows 1.26.52.3 with the Windows client 1.26.52.3 (2026-10-18, `docs/knowledge/bds-local-server/`). |
| Experimental toggles | None. |

## Supported environments

The Add-On is developed for **BDS only** (ADR-0006).

| Environment | Status | Notes |
| --- | --- | --- |
| BDS (Windows; verified on 1.26.52.3) | **supported** | Needs `content-log-console-output-enabled=true` so script `console.*` lines reach standard output. Requests from the BDS console work without cheats; requests from a player's chat need cheats on and operator permission. |
| BDS on Linux | expected, untested | Same script API; not verified. |
| BDS with the network adapter | proposal only | ADR-0004, Phase 3. |
| Local world hosted by a game client, Realms, other platforms | **not supported** | The script itself may run, but responses only reach the client content log (written in ~4 KB blocks, so they can be delayed); not tested or maintained. |

## Namespace

`to3izo_bo:` — see `addon.config.json`. Public identifiers: script event id `to3izo_bo:query` (and, if Phase 3 is
adopted, `to3izo_bo:response`), log prefix `to3izo_bo.response`. The Add-On creates no blocks, items, entities,
dynamic properties, scoreboard objectives or tags.

## Constraints

- **Read-only.** Only read APIs. No commands, no setters, no world/entity/item state written, no chunk loading.
- **Bounded.** Every request is limited in input size, counts, radii, ray distance and output size
  (`capabilities.limits`); limits are explicit in responses. No per-tick work: observations are taken only when
  a request arrives.
- **Stable API only**, `@minecraft/server` only (ADR-0001, ADR-0004). `pnpm validate` enforces that the manifest
  and imports agree.
- **Tool-independent.** No AI, MCP, HTTP or WebSocket assumptions in the core; external tools own sending,
  collecting, timeouts, and clock alignment (`docs/PROTOCOL.md` §9).
- **No consistency guarantees** beyond "taken in one script call at `tick`". Not synchronised with screenshots.
- Marketplace cooperative rules still apply (additive, namespaced, no experiments). The resource pack stays empty
  (ADR-0005).
- Multiplayer: any operator (or the server console) that can run `/scriptevent` can observe every player
  (`SECURITY.md`).
- Request size in practice: the BDS console refuses messages over 2048 characters, and a player's chat command of
  about 511 characters or more disconnects that player (448 worked). Keep commands short (`docs/PROTOCOL.md` §1).
- Localisation: no player-facing strings; diagnostics are English.

## Non-goals

What this Add-On deliberately does not do (so agents do not "helpfully" add it):

- Change the world in any way: teleport, setblock, give, game mode, effects, commands, `eval` or any code execution.
- Input: key presses, clicks, taps; autonomous movement, path finding, combat, mining, building.
- Screenshots, pixel-to-world conversion, camera projection or third-person view handling.
- Unbounded scans: whole dimensions, all entities, large terrain maps; force-loading unloaded areas.
- AI models, MCP servers, HTTP servers or the control tool itself.
- Custom blocks, items, entities, recipes; resource pack content; human GUI forms.
- Streaming/diff delivery, persistence, chunked responses, resend protocols (protocol 1).
