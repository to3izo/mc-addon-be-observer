# behavior_pack/AGENTS.md

Rules for the **behavior pack** source. Root `AGENTS.md` still applies.

## What lives here

Exactly what Minecraft expects inside a behavior pack, in Minecraft's own layout:

```
behavior_pack/
├── manifest.json          # managed by pnpm init:addon / pnpm version:set
├── pack_icon.png          # square PNG (256x256 recommended)
├── blocks/                # minecraft:block definitions
├── items/                 # minecraft:item definitions
├── entities/              # minecraft:entity (server side) definitions
├── recipes/
├── loot_tables/<creator>/<pack>/   # see rule 11
├── spawn_rules/
├── trading/<creator>/<pack>/
├── functions/<creator>/<pack>/    # .mcfunction files (+ tick.json if needed)
├── structures/<namespace>/        # .mcstructure
├── features/ feature_rules/
├── biomes/
├── animations/ animation_controllers/   # behavior (server) animations only
├── scripts/               # DOES NOT EXIST IN SOURCE — generated into dist/ by pnpm build
└── texts/                 # en_US.lang, languages.json (BP-side strings, e.g. pack.name)
```

Create a folder only when you add content to it. Do not add folders Minecraft does not know.

## Rules

1. **Keep the standard structure.** File names, folder names and JSON shapes come from the official
   documentation for the target version (`addon.config.json` → `minEngineVersion`). No custom
   sub-structure, no "src/", no index files.
2. **Identifiers.** Every `description.identifier` is `<namespace>:<snake_case_name>` using the
   namespace from `addon.config.json`. One definition per file; file name == name part of the
   identifier (`items/ruby_sword.json` → `<namespace>:ruby_sword`). `pnpm validate` rejects foreign
   namespaces and duplicate identifiers.
3. **Namespace.** `minecraft:` only to reference vanilla things (components, vanilla items in recipes,
   entity families). Do not override vanilla definitions (blocks, items, entities, recipes, loot tables,
   spawn rules): the Marketplace cooperative guidelines forbid it. If an explicit instruction ever
   requires one, record it in `docs/CONTENT.md`.
4. **manifest.json is managed.** Do not hand-edit name, description, versions, `min_engine_version`,
   UUIDs or the RP dependency. Use `pnpm init:addon`, `pnpm version:set`. The only manual edits are
   adding/removing a `module_name` dependency when `scripts/` starts/stops importing a Script API module,
   and `metadata` fields. The BP and RP depend on each other by UUID (written by `pnpm init:addon`).
5. **format_version.** Each definition file carries its own `format_version`. Use the one the current
   official docs show for the target game version; do not bump or downgrade format versions of existing
   files "to be safe" — behaviour changes between format versions.
6. **Resource pack dependency.** Anything visual or audible a BP file references must exist in
   `resource_pack/`: item icons (`minecraft:icon` ↔ `textures/item_texture.json`), block textures
   (`minecraft:material_instances` ↔ `textures/terrain_texture.json`), block/entity geometry
   (↔ `models/`), entities (↔ `entity/<name>.json` client entity), sounds (↔ `sounds/sound_definitions.json`).
   Add both sides in the same change.
7. **JSON integrity.** Strict JSON only (no comments, no trailing commas), UTF-8 without BOM, 2-space
   indent. `pnpm validate` parses every file.
8. **Scripts.** Never put `.js` or `.ts` files here. The script module's `entry` is always
   `scripts/main.js`, produced by `pnpm build` from `scripts/main.ts`.
9. **Functions / commands.** `.mcfunction` files use the identifier namespace in scoreboard objectives
   and tags (`<namespace>.objective`) to avoid clashes with other packs.
10. **Localisation.** Player-facing names go through `texts/*.lang` keys (`item.<namespace>:<name>`,
    `entity.<namespace>:<name>.name`, `tile.<namespace>:<name>.name`); do not hard-code English in
    definitions when a lang key exists for that content type.

11. **Marketplace folder layout.** Loot tables, functions and trade tables live under
    `<folder>/<creator>/<pack>/` (`<creator>` = `addon.config.json` → `author`, `<pack>` = slug with `_`;
    e.g. author `alice` + slug `ruby-tools` → `loot_tables/alice/ruby_tools/`). Structures live under
    `structures/<namespace>/`. No loose files directly in `<folder>/<creator>/`.
12. **No experimental features.** Do not use components, traits, fields or format versions that need an
    experimental toggle (check the official docs for "[Experimental]" / "Upcoming Creator Features").
13. **Recipes** use only this Add-On's items as crafting-table input unless the recipe is a stonecutter
    recipe: a crafting shape made only of vanilla items collides with vanilla and other Add-Ons.
    Every recipe has an `unlock` entry.

## Checklist before finishing

- `pnpm validate` has no errors for this pack
- every new identifier is in `docs/CONTENT.md`
- every referenced resource exists in `resource_pack/`
- a manual test case exists in `docs/TESTING.md`
