# AGENTS.md — repository rules for AI agents and humans

This file is the contract for anyone (human or AI agent) changing this repository.
Sub-directories have their own `AGENTS.md` with more specific rules; the most specific file wins,
but nothing in a sub-directory may relax the rules written here.

## Project purpose

This repository contains **exactly one Minecraft Bedrock Edition Add-On** (one behavior pack + one
resource pack + its scripts), developed with the "1 Add-On = 1 repository" principle. It was created
from a GitHub template; identity (name, slug, namespace, UUIDs) is set once with `pnpm init:addon`.

Read `docs/SPEC.md` for what this particular Add-On is supposed to do before changing gameplay.

## Architecture

```
scripts/*.ts  ──(esbuild)──►  dist/<slug>_BP/scripts/main.js
behavior_pack/ ──(copy)─────►  dist/<slug>_BP/
resource_pack/ ──(copy)─────►  dist/<slug>_RP/
dist/<slug>_BP, dist/<slug>_RP ──(zip)──► dist/<slug>-<version>.mcaddon (+ .mcpack per pack)
```

- Minecraft reads only what ends up in `dist/`. `dist/` is built from source, never edited.
- Minecraft's own directory layout is kept verbatim inside `behavior_pack/` and `resource_pack/`.
- Only the TypeScript side (`scripts/`) uses a software architecture of its own (feature-based).
- See `docs/ARCHITECTURE.md` for the full picture.

## Directory responsibilities

| Path | Responsibility | Read by Minecraft? |
| --- | --- | --- |
| `behavior_pack/` | Behavior pack source: manifest + Bedrock JSON definitions (blocks, items, entities, recipes, loot tables, functions, ...) | yes (via dist) |
| `resource_pack/` | Resource pack source: manifest + textures, models, animations, sounds, texts | yes (via dist) |
| `scripts/` | TypeScript source of the script module. Compiled JS goes to `dist/`, never into `behavior_pack/` | no (compiled output is) |
| `assets/` | Editable originals used to produce pack content (.bbmodel, .psd, .wav, references) | no |
| `media/` | Promotional material: Marketplace key art, screenshots, SNS/YouTube images, trailers, press kit | no |
| `docs/` | Specification, architecture, content ledger, test plan, knowledge base (`docs/knowledge/`), decision records (`docs/adr/`) | no |
| `tests/` | Unit tests for tooling/pure logic, validation tests, fixtures | no |
| `tools/` | Build, validate, package, deploy, init scripts (Node.js + TypeScript, no framework) | no |
| `dist/` | Generated output (git-ignored) | yes |
| `tmp/` | Local scratch for reference repositories cloned to read (git-ignored, excluded in `.mcignore`). Nothing in it is used by the build, tools or tests; never copy its files into a pack (see "Reference sources") | no |
| `.github/workflows/` | CI: validate on PR/push, package on release | no |
| `.vscode/` | Shared editor setup: `extensions.json` (recommended extensions) and `launch.json` (Minecraft Debugger). Nothing else is committed | no |
| `.mcignore` | Paths the Blockception extension must not scan (`dist/` etc.) | no |

Never move files across these boundaries "for convenience" (e.g. a thumbnail into `resource_pack/`,
a `.bbmodel` into `resource_pack/models/`, a `.ts` into `behavior_pack/`).

## Supported Minecraft Bedrock version

- Target: the version in `addon.config.json` → `minEngineVersion` (mirrored into both manifests'
  `header.min_engine_version`). Change it only via `addon.config.json` + `pnpm init:addon`.
- Script API: the `@minecraft/server` version declared in `behavior_pack/manifest.json` must match the
  version installed in `package.json` (stable releases only, e.g. `2.10.0`; no `-beta` in a release).
- Bedrock changes format versions frequently. When adding a definition file, use the `format_version`
  that the current official documentation (learn.microsoft.com/minecraft/creator) shows for the target
  game version. Do not copy format versions from old tutorials.

## Marketplace policy

This Add-On is built to be submitted to the Minecraft Marketplace as a *cooperative Add-On*. The
official "Guidelines for Building Cooperative Add-Ons" (learn.microsoft.com/minecraft/creator) are
requirements here:

- **Additive only.** Add new content; never override or change vanilla blocks, items, entities,
  recipes, loot tables, textures, sounds, UI, fonts or `.lang` strings, and never use scripts to change
  or disable vanilla gameplay. Removing the Add-On must not break vanilla gameplay.
- **No experimental features.** Nothing that needs an experimental toggle.
- **Namespacing.** Unique namespace `<creator>_<pack abbreviation>`; namespaced texture/geometry/
  culling/sound/lang names; `<creator>/<pack>/` folders for textures, sounds, loot tables, functions and
  trade tables (see `behavior_pack/AGENTS.md` and `resource_pack/AGENTS.md`).
- **Size and performance.** Under 25 MB / 3,500 files; total block permutations under 10,000;
  block/item textures at most 256×256; no ticking areas.

## Namespace policy

- Namespace is `addon.config.json` → `namespace` (also exported as `NAMESPACE` in
  `scripts/shared/constants/addon.ts`).
- Every custom identifier is `<namespace>:<snake_case_name>`: blocks, items, entities, recipes,
  features, spawn rules, client entities, attachables, particles, sound events, scoreboard objectives,
  dynamic properties, tags.
- `minecraft:` is used only to reference vanilla content. Overrides are not allowed (Marketplace
  policy); if an explicit instruction ever requires one, record it in `docs/CONTENT.md`.
- Never change the namespace of existing content without an explicit instruction (it breaks worlds).

## Build commands

| Command | What it does |
| --- | --- |
| `pnpm install` | Install dependencies (pnpm only; no npm/yarn lockfiles) |
| `pnpm init:addon` | One-time identity setup (name/slug/namespace/description/min version/UUIDs) |
| `pnpm build` | Clean `dist/`, copy packs, bundle scripts, validate the output |
| `pnpm dev` | Rebuild on change (`--deploy` also copies into Minecraft's development folders) |
| `pnpm package` | `build` + write `dist/<slug>_BP-<version>.mcpack`, `dist/<slug>_RP-<version>.mcpack`, `dist/<slug>-<version>.mcaddon` |
| `pnpm deploy` | Copy built packs into `com.mojang/development_*_packs` (Windows, or `MINECRAFT_COM_MOJANG`) |
| `pnpm clean` | Remove `dist/` |
| `pnpm version:set x.y.z` | Set the version in package.json and both manifests consistently |

## Validation commands

| Command | What it checks |
| --- | --- |
| `pnpm validate` | TypeScript type-check (scripts + tools), strict JSON, manifests, UUIDs, versions, namespace/identifier rules, resource reference integrity |
| `pnpm typecheck` | Type-check only |
| `pnpm test` | Node test runner over `tests/**/*.test.ts` |

`pnpm validate` must pass with zero errors before any commit. Warnings must be read; fix them or
explain in the PR why they are expected (e.g. vanilla texture overrides).

## Testing policy

- Pure logic (anything that does not import `@minecraft/*`) gets a unit test in `tests/unit/`.
- Tooling rules (`tools/checks/*`) get tests in `tests/validation/`.
- Gameplay behavior can only be verified inside Minecraft. Every feature must have a manual test
  case in `docs/TESTING.md`, and the PR must state which cases were executed in-game.
- Do not mock `@minecraft/server` to "unit test" gameplay; write the in-game test instead.

## Editor tooling

The repository recommends two VS Code extensions (`.vscode/extensions.json`):

| Extension | Used for |
| --- | --- |
| `mojang-studios.minecraft-debugger` | Breakpoints and stepping in `scripts/*.ts` while the game runs (`.vscode/launch.json`) |
| `BlockceptionLtd.blockceptionvscodeminecraftbedrockdevelopmentextension` | Completion, schema validation and cross-reference diagnostics for pack JSON, `.lang`, `.mcfunction` |

Rules:

- `pnpm validate` is the source of truth. Extension diagnostics are a second opinion: when the user
  reports one (or you can see it), fix it if it is a real defect; if it conflicts with `pnpm validate`
  or the current official documentation, follow those and say so in your report.
- Never "fix" content just to silence the extension (e.g. downgrading a `format_version`, adding
  Blockception-only settings to pack files, disabling diagnostics in `.mcattributes`) without an
  explicit instruction.
- Keep `.vscode/launch.json` working: its `dist/<slug>_BP/scripts/` paths are rewritten by
  `pnpm init:addon`; do not hard-code another slug, add `targetModuleUuid`, or change ports without an
  explicit instruction. Debugging needs inline source maps (`pnpm build --sourcemap`,
  `pnpm dev --deploy --sourcemap`); release builds (`pnpm package`) never include them.
- Keep `.mcignore` excluding `dist/` (and other non-pack folders) so packs are not analysed twice.
- An agent cannot run these extensions itself. When a problem needs the debugger (a script error
  whose cause is not visible from the content log), say so and give the user the steps:
  build with `--sourcemap`, start the matching launch configuration, set breakpoints, reproduce.
- Do not add other recommended extensions or other `.vscode/` files without an explicit instruction.

## Manifest policy

- `format_version` stays `2`. Do not switch to 3 (preview-only) without an explicit instruction.
- `header.name`, `header.description`, `header.min_engine_version`, `metadata.authors` are managed by
  `pnpm init:addon` from `addon.config.json`. Edit the config, re-run the command.
- `header.version` / module versions are managed by `pnpm version:set`.
- The script module keeps `"language": "javascript"` and `"entry": "scripts/main.js"`.
- The behavior pack and the resource pack depend on each other by UUID; no other pack dependencies.
  The resource pack has `header.pack_scope: "world"`. Both are written by `pnpm init:addon`.
- Script API dependencies (`module_name`) are added only when `scripts/` actually imports the module,
  and removed when it no longer does (`pnpm validate` enforces both directions).

## UUID policy

**Existing UUIDs are immutable.** Unless the user explicitly asks for it, an agent must never change,
regenerate, swap or "clean up" any of:

- behavior pack `header.uuid`
- behavior pack module UUIDs (`data`, `script`)
- resource pack `header.uuid`
- resource pack module UUID (`resources`)
- the UUID inside the behavior pack's `dependencies` (it must equal the resource pack header UUID)

Changing a UUID makes Minecraft treat the pack as a different pack: existing worlds lose the Add-On,
Marketplace updates break, and players get duplicates. Template placeholder UUIDs
(`00000000-0000-4000-8000-0000000000xx`) are replaced exactly once by `pnpm init:addon`; after that,
`pnpm validate` only warns if any placeholder remains and `pnpm package` refuses to ship them.
New UUIDs are needed only when adding a *new* module, and must be generated with `crypto.randomUUID()`
or an equivalent v4 generator, never typed by hand.

## Version policy

- Single version for the whole Add-On: `package.json` `version` == BP `header.version` == RP
  `header.version` == every module version == BP→RP dependency version. `pnpm validate` enforces it.
- Change it only with `pnpm version:set <major.minor.patch>` and add a `CHANGELOG.md` entry.
- Release tags are `v<major.minor.patch>`; `release.yml` fails if the tag and `package.json` disagree.
- Bump `minor` for new content/features, `patch` for fixes, `major` for world-incompatible changes.
- **1.0.0 is the first public release that outside users can install and use** (protocol frozen, release
  checklist passed on BDS); Marketplace publication is not a milestone for this BDS-only Add-On. After 1.0.0, the
  major rises for changes that break tools or worlds (a new `protocol` number, world-incompatible changes, a
  narrower set of supported environments); a compatible spec change raises the minor, anything else the patch
  (`docs/adr/0002-versioning.md`).

## Generated files policy

The following are **generated** and must never be edited directly, committed, or hand-fixed:

- `dist/` (entire directory, git-ignored)
- any JavaScript produced from `scripts/` (there is no JS in the source tree by design)
- `.mcpack` / `.mcaddon` files
- `pnpm-lock.yaml` is generated by pnpm; update it only through pnpm commands

If a generated file is wrong, fix the source (`scripts/`, `behavior_pack/`, `resource_pack/`,
`addon.config.json`, `tools/`) and rebuild. `scripts/shared/constants/addon.ts` is generated by
`pnpm init:addon` but committed; regenerate it instead of editing it.

## Git policy

- Branch from `main`; one topic per branch; open a PR. `validate.yml` must be green.
- Commit messages: imperative, scoped prefix when useful (`bp:`, `rp:`, `scripts:`, `docs:`, `tools:`).
- Never commit `dist/`, `node_modules/`, secrets, or Minecraft world files.
- Large binaries (sources in `assets/`, exports in `media/`) should use Git LFS if they exceed a few MB.
- Do not rewrite history on `main`. Do not force-push shared branches.
- Tags are created only by the release process (see Version policy).

## AI agent workflow

1. **Read first**: this file, the `AGENTS.md` of every directory you will touch, `docs/SPEC.md`,
   `docs/CONTENT.md` (what already exists), `docs/adr/` (why the design is the way it is: read the ADRs of
   the area you change before reopening a decision), the matching topics in `docs/knowledge/` (lessons learned
   in-game that the official docs do not cover), and the current official Bedrock documentation for
   any JSON format you are about to write. Do not rely on memorised formats or vanilla values; Bedrock
   changes often. Look them up as described in "Reference sources" below and in
   `docs/knowledge/vanilla-reference/`, and confirm in the game.
2. **Plan**: state which files you will add/change and which identifiers you will introduce
   (`<namespace>:<name>`), and check `docs/CONTENT.md` for collisions.
3. **Implement** in the source tree only. Keep Minecraft's directory structure; keep features isolated
   in `scripts/features/<feature>/`.
4. **Record**: add or update the entry in `docs/CONTENT.md` for every block/item/entity/recipe/feature;
   add a manual test case to `docs/TESTING.md`; add a `CHANGELOG.md` line under *Unreleased*.
5. **Verify**: `pnpm validate && pnpm build && pnpm test` must all pass locally. Then, if a game is
   available, `pnpm deploy` and run the relevant cases from `docs/TESTING.md`.
6. **Record decisions**: when you or the user decide something that is not obvious from the code (a design
   choice, a rejected alternative, an accepted limitation, an exception to a rule here), add or update an ADR
   in `docs/adr/` following `docs/adr/README.md`. Decisions and dated history live there; `docs/SPEC.md`,
   `docs/CONTENT.md` and this file state the current rules in the present tense only.
7. **Record knowledge**: when something surprising is learned (a format quirk, an in-game behaviour
   that differs from the docs, a platform pitfall), add it to `docs/knowledge/<topic>/` following
   `docs/knowledge/README.md`. The knowledge base is written in Japanese (it is edited by hand).
8. **Report**: summarise what changed, which validations ran, which in-game tests were (not) executed,
   and any warnings left intentionally.

Things an agent must *not* do without an explicit instruction from the user:
- change UUIDs, namespace, slug, `min_engine_version`, `format_version`, or the pack version
- add dependencies to `package.json` or new build tooling/frameworks
- edit anything under `dist/`
- put files into a directory whose `AGENTS.md` says they do not belong there
- delete or rename existing content identifiers (worlds reference them)

## Reference sources (read-only)

When a task depends on how vanilla Minecraft or an existing Add-On does something, **look it up; do not
write it from memory**. Which source answers which question (details, commands and pitfalls:
`docs/knowledge/vanilla-reference/`):

| Question | Source |
| --- | --- |
| JSON format, fields, names, sound event names, particle definitions, translation keys | **Mojang's official Bedrock samples**: a local clone of `https://github.com/Mojang/bedrock-samples` (next to this repository, e.g. `../bedrock-samples`; branch `main` = latest release, `preview` = preview). Check `version.json` / `git log -1` first and `git pull` if old. Search with `grep` and `git ls-files`. |
| Vanilla block/item numbers and behaviour (hardness, blast resistance, light, drops, history) | **Minecraft Wiki** (`ja.minecraft.wiki`, `minecraft.wiki`). Java and Bedrock may be mixed on a page: check which edition a statement is about. |
| When a feature was added, whether it is experimental (per format version) | **Bedrock Wiki** (`wiki.bedrock.dev`), especially `blocks/block-format-history` |
| Guidelines (cooperative Add-Ons, Marketplace) | Microsoft Learn originals (some pages are AI-assisted and can be outdated) |
| Beta Script API contents | the beta typings on npm (read only; beta APIs are experimental and must not be used) |
| Final answer | the game itself (Windows VM, iOS); if sources disagree, trust the game and record the difference in `docs/knowledge/` |

Rules:

- These are **reading material only**. Never copy Mojang's files (textures, models, sounds, ...) or another
  Add-On's files into a pack; refer to vanilla assets by name (texture key, sound event, particle atlas path).
  Recolouring or tracing Mojang textures is also a Marketplace risk (`docs/knowledge/marketplace/`).
- Another published Add-On or a sample project may be used to learn *how* something is done. Adapt the
  idea, re-implement it with this Add-On's namespace and folders, and keep it additive and non-experimental.
- A schema or sample existing does not mean the feature is stable (a `container` schema existed while the
  feature was still experimental): confirm in the Bedrock Wiki history or in the game.
- When a source turns out to be wrong or outdated, write what you found in `docs/knowledge/`.

## Definition of Done

A change is done when all of the following are true:

- [ ] `pnpm validate` passes with zero errors; remaining warnings are explained
- [ ] `pnpm build` succeeds and `pnpm test` passes
- [ ] Minecraft directory structure is unchanged in meaning (no custom folders inside the packs)
- [ ] All new identifiers use the configured namespace and are listed in `docs/CONTENT.md`
- [ ] Resource references (textures, geometry, animations, sounds) resolve; no new unreferenced files
- [ ] No UUID, namespace, version or `format_version` changed unless explicitly requested
- [ ] No generated file was edited; `dist/` is not committed
- [ ] `docs/TESTING.md` has a test case for the change, and executed in-game results are reported
- [ ] `CHANGELOG.md` *Unreleased* section describes the change
- [ ] Media/promo files, if any, are in `media/`, not in a pack
