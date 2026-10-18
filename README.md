# Bedrock Observer

<!-- addon:start -->
| | |
| --- | --- |
| **Add-On** | Bedrock Observer |
| **Slug** | `be-observer` |
| **Namespace** | `to3izo_bo:` |
| **Minimum Minecraft version** | 1.26.50 |
| **Description** | Provides structured, read-only observations of players and the surrounding world for debugging and AI-agent gameplay. |
<!-- addon:end -->

> 日本語版: [README.ja.md](README.ja.md)

A **read-only observation Add-On** for Minecraft Bedrock Dedicated Server (BDS). External tools — AI agents that
play Bedrock, test scripts, people debugging Add-Ons — send a JSON request, and the Add-On answers with one line
of JSON on the server's standard output: where players are and what they see, blocks, nearby entities, effects,
ground height, scoreboards, and game events as they happen.

- **Read-only.** It never changes the world: no commands, no setters, no chunk loading (`SECURITY.md`).
- **Tool-independent.** Plain `/scriptevent` in, plain log lines out. No AI model, MCP server or HTTP is assumed.
- **Bounded.** Every request has size, count, radius and distance limits, reported by `capabilities`.
- **Stable APIs only.** `@minecraft/server` 2.10.0; no experimental toggles, no beta APIs.

> **Status: pre-release (0.1.0).** All methods are implemented and verified on BDS for Windows 1.26.52.3.
> Protocol 1 (`docs/PROTOCOL.md`) is frozen: later versions only add to it, or raise the protocol number.

## Requirements

| | |
| --- | --- |
| Server | Bedrock Dedicated Server (verified: Windows, 1.26.52.3). Linux BDS is expected to work but is untested. Client-hosted worlds and Realms are not supported. |
| Minimum game version | 1.26.50 |
| `server.properties` | `content-log-console-output-enabled=true` (otherwise script output never reaches standard output) |
| Experiments | none |

## Install on BDS

1. Build the packs (see [Building](#building)), or take `be-observer-<version>.mcaddon` from a release and unzip it.
2. Copy `be-observer_BP` into `<BDS>/behavior_packs/` (or `development_behavior_packs/`) and `be-observer_RP` into
   `<BDS>/resource_packs/` (or `development_resource_packs/`).
3. Enable them in the world: add the pack UUID and version to `worlds/<level>/world_behavior_packs.json` and
   `world_resource_packs.json`, e.g.
   `[{"pack_id":"cbe4cdb9-3dc0-43c3-9750-a100b27a414e","version":[0,1,0]}]` (behavior pack) and
   `[{"pack_id":"3d21d349-fedb-4dd4-8b7c-a7f130ea5fe7","version":[0,1,0]}]` (resource pack).
4. Set `content-log-console-output-enabled=true` and start the server. The log shows
   `[Scripting] [be-observer] scripts loaded`.

## Quick start

On the BDS console (no leading `/`, ASCII only; write other characters as `\uXXXX`):

```text
scriptevent to3izo_bo:query {"requestId":"c1","method":"capabilities"}
scriptevent to3izo_bo:query {"requestId":"p1","method":"player","params":{"player":{"name":"Steve"},"include":["health","effects"]}}
```

Each request is answered by exactly one line on standard output (BDS adds its own timestamp before it):

```text
to3izo_bo.response {"protocol":1,"requestId":"p1","ok":true,"method":"player","tick":144897,"session":"rohuvqp7","seq":4,"time":1792311918513,"data":{"id":"-8589934591","name":"Steve",...}}
```

Match responses to requests by `requestId`. Errors come back as `"ok":false` with a stable `error.code`.
Game events are written without a request as `to3izo_bo.event {...}` lines.

From a player's chat, an **operator** can send the same request without cheats as a command whose argument is
the JSON in double quotes, with every inner `"` written as `\"`:

```text
/to3izo_bo:query "{\"requestId\":\"p1\",\"method\":\"player\"}"
```

`/scriptevent to3izo_bo:query {...}` also works from chat, but needs cheats on as well. Long chat commands
disconnect the player: keep the whole command under about 448 characters.

## What it can observe

| Method | Answers |
| --- | --- |
| `capabilities` | Versions, methods, sections, limits and defaults — call this first |
| `players` | Players in the world |
| `player` | Position, head, rotation, view direction, velocity, movement flags, game mode; optional `health`, `inventory`, `equipment`, `effects`, `world` (time) |
| `block` / `blocks` | Blocks by coordinates (`unloaded` / `out_of_bounds` are told apart from air) |
| `target` | The block (and optionally the entity) a player is looking at |
| `entities` | Entities near a player or a point, sorted by distance; filters by type, family, name and tag; optional effects |
| `entity` | One entity by id |
| `top` / `tops` | The topmost block of a column — the ground height; `tops` as a compact height map |
| `scoreboard` | Objectives, the scores of one objective, or one player's scores |
| `snapshot` | Several of the above for one player, in one response |
| `events` | Recent game events again: joins, leaves, spawns, deaths involving players, dimension, game mode and game rule changes |

The full wire format, limits and error codes are in **[docs/PROTOCOL.md](docs/PROTOCOL.md)**.

Not available: chat messages and command use (no stable API), screenshots, input of any kind. Anything that
would change the world is out of scope by design (`docs/SPEC.md` → Non-goals).

## Security

Observations include player names, positions and inventories, and they are written to the server's standard
output. The server console and every operator can observe every player; other players cannot send requests.
Read **[SECURITY.md](SECURITY.md)** before installing it on a server other people join.

## Building

Requires Node.js ≥ 22.18 and pnpm.

```bash
pnpm install
pnpm validate   # type-check, pack and protocol rules
pnpm test       # unit tests (no game needed)
pnpm package    # dist/be-observer-<version>.mcaddon and one .mcpack per pack
```

`pnpm build` writes the unpacked packs to `dist/be-observer_BP/` and `dist/be-observer_RP/`.

## Documentation

| Document | Contents |
| --- | --- |
| [docs/SPEC.md](docs/SPEC.md) | What the Add-On does and does not do |
| [docs/PROTOCOL.md](docs/PROTOCOL.md) | Requests, responses, methods, limits, error codes, event lines |
| [docs/TESTING.md](docs/TESTING.md) | Test cases and in-game results |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Progress and what comes next (Japanese) |
| [docs/adr/](docs/adr/) | Decision records (Japanese) |
| [docs/knowledge/bds-local-server/](docs/knowledge/bds-local-server/) | BDS setup notes, console bridge and verification scripts (Japanese) |
| [AGENTS.md](AGENTS.md) | Rules for contributors and AI agents working on this repository |

## Contributing

Issues and pull requests are welcome. Read `AGENTS.md` first: it holds the repository rules (immutable UUIDs,
namespace, read-only guard, validation before every commit). `pnpm validate && pnpm build && pnpm test` must pass,
and gameplay changes need an in-game test case in `docs/TESTING.md`.

## License

MIT — see [LICENSE](LICENSE).
