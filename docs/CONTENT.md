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

_None yet._ (Features with no JSON content, e.g. `scripts/features/startup` — list them here too so the
ledger is complete.)

## Vanilla overrides

_None._ (Any `minecraft:` identifier this Add-On redefines, with the reason.)
