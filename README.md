# MC Addon Template

<!-- addon:start -->
| | |
| --- | --- |
| **Add-On** | Addon Template |
| **Slug** | `addon-template` |
| **Namespace** | `addon_template:` |
| **Minimum Minecraft version** | 1.26.50 |
| **Description** | Describe your Add-On here. |
<!-- addon:end -->

> 日本語版: [README.ja.md](README.ja.md)

A GitHub **template repository** for developing **one Minecraft Bedrock Edition Add-On** (behavior
pack + resource pack + TypeScript scripts) together with AI agents such as Codex or Claude Code.
Each Add-On gets its own repository created from this template; the table above is filled in by
`pnpm init:addon`.

## Overview

- **1 Add-On = 1 repository.** One behavior pack, one resource pack, one script bundle, one version.
- **Minecraft's structure is kept as-is** inside `behavior_pack/` and `resource_pack/`; only the
  TypeScript side has its own (feature-based) architecture.
- **Source vs generated is explicit.** Everything Minecraft loads is produced into `dist/` by
  `pnpm build`; nothing in `dist/` is ever edited.
- **Rules for agents live in `AGENTS.md`** (root + one per key directory), so an AI agent can work
  safely and consistently: immutable UUIDs, namespace policy, validation before commit.
- **No framework.** Node.js ≥ 22.18, pnpm, TypeScript, esbuild (bundler), fflate (zip). That is all.

## Repository structure

```
/
├── AGENTS.md                 # rules for agents/humans (root)
├── README.md · README.ja.md · CHANGELOG.md · LICENSE
├── addon.config.json         # the Add-On's identity: name, slug, namespace, description, minEngineVersion
├── package.json · pnpm-lock.yaml · pnpm-workspace.yaml
├── tsconfig.json             # type-check for scripts/   (Minecraft runtime)
├── tsconfig.tools.json       # type-check for tools/ + tests/ (Node.js)
├── .editorconfig · .gitignore · .node-version
│
├── behavior_pack/            # Minecraft behavior pack (source)       → dist/<slug>_BP/
│   ├── AGENTS.md
│   ├── manifest.json
│   └── pack_icon.png         # + blocks/ items/ entities/ recipes/ ... as needed
├── resource_pack/            # Minecraft resource pack (source)       → dist/<slug>_RP/
│   ├── AGENTS.md
│   ├── manifest.json
│   └── pack_icon.png         # + textures/ models/ entity/ animations/ sounds/ texts/ ... as needed
├── scripts/                  # TypeScript sources of the script module → dist/<slug>_BP/scripts/main.js
│   ├── AGENTS.md
│   ├── main.ts
│   ├── features/             # one folder per gameplay feature
│   ├── core/                 # runtime plumbing (Feature contract, bootstrap)
│   └── shared/               # constants (generated namespace), types, pure utils
│
├── assets/                   # production originals (.bbmodel, .psd, .wav, references)
├── media/                    # marketing: Marketplace, SNS, YouTube, press (never shipped)
│   ├── AGENTS.md
│   ├── source/{screenshots,artwork,video,branding}/
│   ├── marketplace/ · social/{x,youtube,tiktok,instagram}/ · exports/
│
├── docs/                     # SPEC.md · ARCHITECTURE.md · CONTENT.md · TESTING.md · PROMPTS.md · ADDONS.md
│   ├── adr/                  # decision records: why it is this way, and dated history (Japanese)
│   └── knowledge/            # lessons learned, written in Japanese (culling, geometry, Marketplace, iOS testing, ...)
├── tests/                    # unit/ · validation/ · fixtures/   (node --test)
├── tools/                    # build.ts · validate.ts · package.ts · deploy.ts · dev.ts · init-addon.ts · ...
├── dist/                     # generated (git-ignored)
└── .github/workflows/        # validate.yml · release.yml
```

## Getting started

```bash
# 1. On GitHub: "Use this template" → create your repository, then clone it
git clone <your-repo-url> my-addon
cd my-addon

# 2. Install (Node.js >= 22.18, pnpm via corepack or your package manager)
pnpm install

# 3. Give the Add-On its identity (interactive; or pass flags, see below)
pnpm init:addon

# 4. Check, build, test
pnpm validate
pnpm build
pnpm test
```

`pnpm init:addon` asks for name, slug, namespace, description, minimum Minecraft version and author,
then updates `addon.config.json`, both manifests (including generating real UUIDs **once**),
`scripts/shared/constants/addon.ts`, `package.json`, this README's table and the `LICENSE` holder.
Non-interactive form:

```bash
pnpm init:addon --name "Ruby Tools" --description "Adds ruby tools and armor." --min-engine-version 1.26.50 --yes
```

Re-running it later is safe: it rewrites names/descriptions/versions from `addon.config.json` and
never regenerates an existing UUID.

`description` is used for both manifests and this README. To show a Japanese description in
`README.ja.md`, add an optional `"descriptionJa"` to `addon.config.json` (edited there only; no prompt
or flag) and re-run `pnpm init:addon`.

## Installation

| Requirement | Notes |
| --- | --- |
| Node.js ≥ 22.18 (24 recommended, see `.node-version`) | Tools run TypeScript directly via Node's type stripping |
| pnpm (version pinned in `package.json` → `packageManager`) | `corepack enable` or install pnpm globally |
| Minecraft Bedrock Edition | for in-game testing; version ≥ `minEngineVersion` |
| VS Code + Minecraft Debugger / Bedrock extensions | optional, recommended (`.vscode/extensions.json`) |

## Development

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Watch `scripts/`, `behavior_pack/`, `resource_pack/`, `addon.config.json` and rebuild |
| `pnpm dev --deploy` | Same, plus copy each build into Minecraft's development pack folders |
| `pnpm deploy` | Build and copy into `com.mojang/development_*_packs` (`--preview` for Minecraft Preview) |
| `pnpm version:set 1.2.0` | Bump the Add-On version everywhere it must agree |

Workflow for a change: read `docs/SPEC.md`, `docs/CONTENT.md` and the matching ADRs in `docs/adr/` → add JSON in the packs and/or a
feature in `scripts/features/<name>/` → record it in `docs/CONTENT.md` and `docs/TESTING.md` →
`pnpm validate && pnpm build && pnpm test` → deploy and test in-game → `CHANGELOG.md` → PR.

## Validation

```bash
pnpm validate            # full check of the source tree
pnpm validate --dist     # check the built packs in dist/ (what build does)
pnpm validate --strict   # placeholder UUIDs become errors (what package does)
```

Checks: TypeScript type-check (scripts and tools) · strict JSON in both packs · manifest rules
(format_version 2, UUID format/uniqueness, versions in sync with `package.json`, BP⇄RP mutual dependency, RP `pack_scope: "world"`,
script module entry and `@minecraft/*` dependencies vs actual imports) · namespace and identifier
rules · resource reference integrity (texture atlases, client entity textures/geometry/animations/
render controllers, sound definitions, item icons, block material instances) · unreferenced textures.

## Build

`pnpm build` performs, in order:

1. clean `dist/`
2. copy `behavior_pack/` → `dist/<slug>_BP/` (documentation files such as `AGENTS.md` are skipped)
3. copy `resource_pack/` → `dist/<slug>_RP/`
4. bundle `scripts/main.ts` with esbuild → `dist/<slug>_BP/scripts/main.js` (ESM, `@minecraft/*` external)
5. validate the built packs (manifests, JSON, identifiers, resource references)

`--sourcemap` embeds an inline source map for use with the Minecraft Debugger.

### VS Code extensions

`.vscode/extensions.json` recommends two extensions (VS Code offers to install them when you open the folder):

| Extension | Used for |
| --- | --- |
| Minecraft Bedrock Debugger (`mojang-studios.minecraft-debugger`) | Breakpoints in `scripts/*.ts` while the game runs |
| Blockception's Minecraft Bedrock Development (`BlockceptionLtd.blockceptionvscodeminecraftbedrockdevelopmentextension`) | Completion and diagnostics for pack JSON, `.lang`, `.mcfunction` |

Debugging: `pnpm dev --deploy --sourcemap` → start `Debug with Minecraft (listen)` in Run and Debug →
run `/script debugger connect` in game (cheats on). For a Bedrock Dedicated Server, run
`script debugger listen 19144` on the server and use the `(connect)` configuration.
The `dist/<slug>_BP` paths in `.vscode/launch.json` are rewritten by `pnpm init:addon`.
macOS has no Bedrock client, so the debugger is used with the Windows client or a BDS.
`.mcignore` keeps the Blockception extension from analysing the built copies in `dist/`.

## Packaging

```bash
pnpm package
```

Produces, after a strict validation and a fresh build:

```
dist/
├── <slug>_BP/
├── <slug>_RP/
├── <slug>_BP-<version>.mcpack   # behavior pack only
├── <slug>_RP-<version>.mcpack   # resource pack only
└── <slug>-<version>.mcaddon     # both packs; the file to distribute
```

The version (from `package.json`) is part of every file name, so a device never mixes up a new build
with an older copy of the same name. Use only `<slug>-<version>.mcaddon` to install or distribute: it already contains both packs. The two `.mcpack`
files hold one pack each, for the rare case where only one pack must be shared or reinstalled;
opening them as well as the `.mcaddon` would import the same packs twice.

Packaging refuses to run while template placeholder UUIDs remain (run `pnpm init:addon`).

## Installing into Minecraft

**Development (Windows):** `pnpm deploy` copies the built packs into
`%APPDATA%\Minecraft Bedrock\users\shared\games\com.mojang\development_behavior_packs\<slug>_BP` and
`...\development_resource_packs\<slug>_RP` (Minecraft Preview: `pnpm deploy --preview`; legacy
Microsoft Store/UWP installs are detected too). On other platforms or for a Bedrock Dedicated Server,
set `MINECRAFT_COM_MOJANG=/path/to/com.mojang`. Then create or open a world, activate the behavior
pack (the resource pack is added through the dependency), and use `/reload` after script-only changes.

**Players / any platform:** open `dist/<slug>-<version>.mcaddon` (double-click, share to Minecraft on mobile).
Minecraft imports both packs; activate the behavior pack in the world settings.

Enable *Settings → Creator → Content Log* in the game to see pack errors.

## AI agent workflow

The repository is designed to be driven by an AI agent:

1. The agent reads `AGENTS.md` (root) and the `AGENTS.md` of each directory it touches, plus
   `docs/SPEC.md` and `docs/CONTENT.md`.
2. It consults the current official Bedrock documentation for any JSON format it writes
   (formats change between game versions), and looks vanilla values and formats up in Mojang's
   `bedrock-samples` (a local clone), the Minecraft Wiki and the Bedrock Wiki instead of writing them from
   memory (`AGENTS.md` → "Reference sources", `docs/knowledge/vanilla-reference/`).
3. It changes only source files, records new content in `docs/CONTENT.md` and tests in
   `docs/TESTING.md`, and runs `pnpm validate && pnpm build && pnpm test`.
4. It reports what changed, what was validated and what still needs in-game verification.

Hard limits for agents (enforced by `pnpm validate` where possible): never change existing UUIDs,
never edit `dist/`, never put scripts into `behavior_pack/`, never put media into a pack, never change
namespace/version/`format_version` without an explicit instruction.

## Directory responsibilities

| Directory | Holds | Shipped to players? |
| --- | --- | --- |
| `behavior_pack/` | Behavior pack source (Minecraft layout) | yes, via `dist/` |
| `resource_pack/` | Resource pack source: exported, game-ready files (Minecraft layout) | yes, via `dist/` |
| `scripts/` | TypeScript sources; compiled into the behavior pack at build time | compiled output only |
| `assets/` | Originals used to produce pack content (Blockbench, PSD, audio projects, references) | no |
| `media/` | Marketplace / SNS / YouTube / press material | no |
| `docs/` | Spec, architecture, content ledger, test plan, decision records (`docs/adr/`), knowledge base | no |
| `tests/` | Unit and validation tests, fixtures | no |
| `tools/` | Build, validate, package, deploy, init | no |
| `dist/` | Generated packs and archives | this *is* what ships |

In one line: `assets/` = how it is made · `resource_pack/` = what Minecraft reads · `media/` = how it
is promoted · `dist/` = what is distributed.

## UUIDs

Each pack has a header UUID and one UUID per module; the behavior pack references the resource pack's
header UUID in `dependencies`. Minecraft identifies packs by these values, so **they must never change
after the first release**: a changed UUID is a different pack (worlds lose it, updates break).
The template ships placeholder UUIDs (`00000000-0000-4000-8000-0000000000xx`); `pnpm init:addon`
replaces them exactly once with random v4 UUIDs and never touches real ones again. `pnpm validate`
warns while placeholders remain and `pnpm package` refuses to ship them. Agents are forbidden from
editing UUIDs by `AGENTS.md`.

## Media / Marketplace assets

Promotional material lives in `media/` and is never copied into a pack: `media/source/` holds the
editable originals (screenshots, artwork projects, video projects, branding), `media/marketplace/`
the exports for a Marketplace submission (key art, panorama, screenshots, icon, trailer),
`media/social/<platform>/` platform-sized posts and thumbnails, and `media/exports/` everything else.
Dimensions and formats for Marketplace submissions follow the current Minecraft Creator Portal
requirements at submission time; `media/AGENTS.md` has the rules.

## Release process

1. Update `docs/CONTENT.md`, `docs/TESTING.md` and `CHANGELOG.md`; run the in-game release checklist.
2. `pnpm version:set <major.minor.patch>` and move the *Unreleased* changelog entries under the new version.
3. Commit, then tag and push: `git tag v<major.minor.patch> && git push --tags`
   (or create a GitHub Release with that tag).
4. `release.yml` validates, builds, packages, uploads the archives as a workflow artifact and attaches
   `<slug>-<version>.mcaddon` + both `.mcpack` files to the GitHub Release. It fails if the tag does not match
   `package.json`.

`validate.yml` runs `pnpm validate`, `pnpm build` and `pnpm test` on every push to `main` and every
pull request.

## License

MIT — see `LICENSE` (the copyright holder is filled in by `pnpm init:addon --author`).
