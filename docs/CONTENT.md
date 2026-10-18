# CONTENT — ledger of everything this Add-On defines

Every custom block, item, entity, recipe, loot table, feature, sound event, UI form and vanilla
override gets an entry here. Agents check this file for collisions before adding content and update it
in the same change as the content.

Conventions
- Heading = name part of the identifier (`ruby_sword`), sections ordered by type then name.
- `Identifier` is the full `<namespace>:<name>`.
- `Resources` lists resource pack paths relative to `resource_pack/`.
- `Scripts` lists the feature folder(s) under `scripts/features/` or `none`.
- `Status`: planned · in progress · done · deprecated (keep deprecated entries; worlds still reference them).

---

## Template

```
## <name>

Identifier:
<namespace>:<name>

Type:
Item | Block | Entity | Recipe | Loot table | Spawn rule | Feature | Sound | UI | Vanilla override

Status:
planned

Behavior:
- behavior_pack/items/<name>.json
- Damage: 8
- Durability: 750

Resources:
- textures/items/<name>.png (item_texture.json key: <name>)
- texts: item.<namespace>:<name>=Ruby Sword

Scripts:
- none

Tests:
- docs/TESTING.md → "<name>"
```

---

## Items

_None yet._

## Blocks

_None yet._

## Entities

_None yet._

## Recipes

_None yet._

## Loot tables / spawn rules / features

_None yet._

## Sounds

_None yet._

## Script-only features

This Add-On defines no blocks, items, entities, recipes, sounds or other JSON content. Its public surface
is a script-event id and a log line prefix (see `docs/PROTOCOL.md`); both are namespaced and must not be
renamed once released (external tools depend on them).

## startup

Identifier:
none (log line `[be-observer] scripts loaded`)

Type:
Feature (script only)

Status:
done (template reference feature; kept as the load marker)

Scripts:
- scripts/features/startup

Tests:
- docs/TESTING.md → "startup"

## observer

Identifier:
- script event id `to3izo_bo:query` (request, received through `/scriptevent` or `system.sendScriptEvent`)
- custom command `to3izo_bo:query <json: string>` (request; operators, cheats not required; ADR-0010)
- response log prefix `to3izo_bo.response` (one-line JSON, see `docs/PROTOCOL.md`)
- event log prefix `to3izo_bo.event` and event kinds `player_join`, `player_leave`, `player_spawn`, `entity_die`,
  `dimension_change`, `game_mode_change`, `game_rule_change` (`docs/PROTOCOL.md` §10, ADR-0008)
- opt-in event kinds `block_break`, `block_place`, `entity_hurt`, `effect_add`, `item_use`, `explosion`,
  `weather_change`, `entity_spawn`, switched by the `subscribe` method (in memory only; ADR-0014)
- opt-in feature `containers` (the `container` method), switched by the `features` method; only the BDS console can
  turn it on (in memory only; ADR-0015)

Type:
Feature (script only, read-only)

Status:
done for Phase 2 (13 methods and both entry points verified on BDS 1.26.52.3; protocol 1 frozen); 1.1.0 adds
`subscribe`, the opt-in event kinds and `capabilities.build` (verified on BDS 1.26.52.3); 1.2.0 adds `features` and
`container` (verified on BDS 1.26.52.3)

Behavior:
- Reads players, blocks, ray hits, nearby entities (with filters and effects), entities by id, the topmost block of
  columns, the scoreboard and, when the console turned it on, block containers with the stable `@minecraft/server`
  API and writes a
  JSON response to the script log. Never changes the world (no commands, no setters, no dynamic properties,
  no scoreboards, no tags).

Scripts:
- scripts/features/observer: script-event input and log output
- scripts/core/observation: game reads → DTOs (`capabilities`, `players`, `player`, `block`/`blocks`, `target`,
  `entities`, `snapshot`, `events`, `entity`, `top`/`tops`, `scoreboard`, `subscribe`, `features`, `container`; shared readers in `read.ts`, player/dimension resolution in `resolve.ts`, game
  event subscriptions, the in-memory event buffer and the opt-in switch in `events.ts`, the feature switch in
  `features.ts`)
- scripts/shared/constants/build.ts: the build identifier, embedded by tools/build.ts (esbuild `define`)
- scripts/shared/protocol: pure request validation, option parsing, dispatch, envelopes, size limits
- scripts/shared/constants/version.ts: versions reported by `capabilities`

Tests:
- docs/TESTING.md → "observer"
- tests/unit/protocol-*.test.ts, tests/unit/build-info.test.ts, tests/validation/read-only.test.ts,
  tests/validation/version-constants.test.ts

## Vanilla overrides

_None._ (Any `minecraft:` identifier this Add-On redefines, with the reason.)
