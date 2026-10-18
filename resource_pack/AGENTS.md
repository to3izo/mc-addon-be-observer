# resource_pack/AGENTS.md

Rules for the **resource pack** source. Root `AGENTS.md` still applies.

## What lives here

Only exported, game-ready files in Minecraft's own layout:

```
resource_pack/
├── manifest.json              # managed by pnpm init:addon / pnpm version:set
├── pack_icon.png
├── textures/
│   ├── item_texture.json      # "<namespace>:<name>" -> textures/<creator>/<pack>/...
│   ├── terrain_texture.json   # "<namespace>:<name>" -> textures/<creator>/<pack>/...
│   ├── flipbook_textures.json
│   └── <creator>/<pack>/      # ALL texture files of this Add-On (blocks/ items/ entity/ ... below it)
├── models/entity/ models/blocks/   # geometry.<namespace>.<name> (Blockbench export)
├── block_culling/             # minecraft:block_culling_rules, <namespace>:culling.<name>
├── blocks.json                # block sounds / textures for custom blocks
├── entity/                    # minecraft:client_entity
├── attachables/               # minecraft:attachable (held/worn items)
├── animations/                # animation.<name>.<state>
├── animation_controllers/     # controller.animation.<name>.<state>
├── render_controllers/        # controller.render.<name>
├── particles/                 # <namespace>:<name>
├── sounds/
│   ├── sound_definitions.json
│   └── <creator>/<pack>/<file>.ogg
├── sounds.json                # entity / block sound events
├── texts/                     # en_US.lang, languages.json
└── ui/ font/ ...              # only if actually used
```

Source projects (`.bbmodel`, `.psd`, `.wav`) go in `assets/`, promotional images in `media/`. Never here.

## Rules

Folder and naming rules follow the Minecraft Marketplace "Guidelines for Building Cooperative
Add-Ons" so that the Add-On can be submitted to the Marketplace and coexist with other Add-Ons.
`<creator>` is `addon.config.json` → `author` and `<pack>` is the slug with `_` instead of `-`
(e.g. author `alice` + slug `ruby-tools` → `alice/ruby_tools`). `<namespace>` is `addon.config.json` → `namespace`.

1. **Texture paths.** Every texture file lives under `textures/<creator>/<pack>/` (sub-folders such as
   `blocks/`, `items/`, `entity/<name>/` below that are fine). Lowercase `snake_case`, PNG (TGA only
   when alpha needs it). Never put loose files directly in `textures/<creator>/`. Atlas short names in
   `item_texture.json` / `terrain_texture.json` are namespaced: `<namespace>:<name>`. References in
   JSON omit the extension (`"textures/alice/ruby_tools/blocks/ruby_block"`).
2. **Geometry naming.** `geometry.<namespace>.<name>` for the main model,
   `geometry.<namespace>.<name>.<variant>` for variants, in `models/entity/<name>.geo.json`
   (blocks: `models/blocks/<name>.geo.json`). Export from Blockbench with the `1.12.0`+ geometry
   format; keep the identifier stable once released. Block culling rules are
   `<namespace>:culling.<name>` in `block_culling/<name>.json`.
3. **Animation naming.** `animation.<namespace>.<name>.<action>` in
   `animations/<name>.animation.json`; controllers `controller.animation.<namespace>.<name>.<purpose>`
   in `animation_controllers/<name>.animation_controllers.json`.
4. **Render controller naming.** `controller.render.<namespace>.<name>` (one per entity/attachable unless variants
   need more) in `render_controllers/<name>.render_controllers.json`.
5. **Reference integrity.** A client entity / attachable may only reference textures, geometry,
   animations, controllers, render controllers, particles and sounds that exist in this pack (or vanilla
   `minecraft:` ones). `pnpm validate` resolves these links and fails on a dangling reference. Add the
   target file in the same change as the reference.
6. **Unreferenced resources.** Files nobody references are dead weight and inflate the download.
   `pnpm validate` warns about unreferenced textures. Delete them, or document why they are needed
   (vanilla overrides such as `textures/blocks/stone.png` are legitimately unreferenced).
7. **Vanilla textures by reference only.** A custom block may use a vanilla texture through its
   vanilla terrain atlas key (`"texture": "glass"`); that copies and overrides nothing. Never copy a
   Mojang texture file into this pack. `pnpm validate` treats un-namespaced material texture keys as
   vanilla keys.
8. **No vanilla overrides.** Do not replace vanilla textures, models, sounds, UI, fonts or `.lang`
   strings: the Marketplace cooperative guidelines forbid it. If an explicit instruction ever requires
   one, list it in `docs/CONTENT.md`. Do not ship stray copies of vanilla files.
9. **manifest.json is managed** (same rules as the behavior pack). `header.pack_scope` is `"world"` and
   the RP depends on the BP by UUID; both are written by `pnpm init:addon`. A resource pack never
   contains a script module.
10. **Sounds.** `.ogg` (Vorbis), mono for positional sounds, under `sounds/<creator>/<pack>/`; names in
   `sound_definitions.json` are `<namespace>:<category>.<name>` and the file path is relative to the
   pack root without extension.
11. **Localisation.** All player-facing strings for custom content go in `texts/<lang>.lang` with
    namespaced keys (`tile.<namespace>:<name>.name`); never redefine a vanilla key;
    `texts/languages.json` lists every provided language and `en_US` is always present.
12. **Image hygiene.** Power-of-two sizes where the format expects them (16/32/64 for blocks and
    items), no embedded colour profiles, no trailing whitespace in `.lang` files that changes meaning.

## Checklist before finishing

- every reference resolves (`pnpm validate`), no new unreferenced files
- naming follows the patterns above and matches the behavior pack identifiers
- source files stayed in `assets/`, promo files in `media/`
