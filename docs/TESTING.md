# TESTING — what to verify in Minecraft

> 日本語版: [TESTING.ja.md](TESTING.ja.md) (keep both files in sync when changing test cases)

Automated checks (`pnpm validate`, `pnpm build`, `pnpm test`) prove that files are well-formed and
references resolve. They cannot prove gameplay. This file is the manual test plan that every change
must extend and that a release must pass.

## How to run a test session

1. Build and install:
   - Windows: `pnpm deploy` (or `pnpm dev --deploy` while iterating) copies the packs into Minecraft.
   - Any other platform (macOS → iPhone/iPad, Android, ...): `pnpm package`, then open
     `dist/<slug>-<version>.mcaddon` on the device (e.g. via AirDrop). `pnpm build` alone does **not** write the
     `.mcaddon`, and it empties `dist/` first, deleting any `.mcaddon` from an earlier `pnpm package`.
     Install only the `.mcaddon` (it contains both packs); the two `.mcpack` files next to it are not needed.
2. Create a **new** flat creative world with cheats on; activate the behavior pack (the resource pack
   is pulled in by the dependency). Enable *Content Log GUI/File* in Settings → Creator to see
   JSON/script errors.
3. Also test in an **existing survival world** with the previous version installed when releasing
   (upgrade path: UUIDs unchanged, content identifiers unchanged).
4. Record results in the PR: which cases ran, on which platform/version, pass/fail.

### Installing on iPhone / iPad (AirDrop)

1. On the Mac: `pnpm package`, then AirDrop `dist/<slug>-<version>.mcaddon` (only this file) from
   Finder to the device. The version in the file name is how you tell builds apart on the device.
2. On the device, accept the AirDrop. If iOS offers to open it in Minecraft, choose Minecraft and skip
   to step 4. Otherwise it is saved to the Files app (usually *On My iPhone/iPad → Downloads*); any
   folder is fine. Do **not** copy it into the *Minecraft* folder in Files — Minecraft does not read
   `.mcaddon` files from there.
3. In Files, find the file **by its version in the name** (search for it or browse the folder it was
   saved to). Do not pick it from *Recents*: Recents also lists older copies, including ones in
   iCloud Drive and in *Recently Deleted*. Long-press the file → *Share* → *Minecraft* (if Minecraft is not in the app row, tap
   *More* and pick it).
4. Minecraft starts and shows "Import started…" then "Successfully imported". If it says the pack is a
   duplicate, the same version is already installed: see "Installing a new build" below.
5. Apply the packs to a world (new or existing):
   1. On the world list, tap the pencil (*Edit*) button of the world.
   2. Open *Behavior Packs* and check the *Active* list. If `<Add-On name> [BP]` is not there, find it under
      *Available* — on iPhone/iPad imported Add-Ons may be listed in the *Owned/Purchased* section
      (「購入済み」 in Japanese) — tap it and tap *Activate*.
   3. Open *Resource Packs* and check that `<Add-On name> [RP]` is in *Active* too (activating the BP normally
      adds it through the dependency; if not, activate it the same way).
   4. Check *Experiments*: everything must be off (Marketplace Add-Ons use no experiments).
   5. Start the world. Activating packs on an existing world makes Minecraft suggest a backup copy;
      for test worlds that is optional.

**Old copies on the device:** delete earlier `.mcaddon` files from Files (also from iCloud Drive and
*Recently Deleted*) from time to time, so only the current build is around. To check what Minecraft
actually imported, open *Minecraft → games → com.mojang → behavior_packs → <pack folder> →
manifest.json* in Files and read `"version"`.

**Installing a new build** (same version number as the one already on the device): Minecraft skips a
pack whose UUID and version are already installed, so the new build would not replace the old one.
Before importing, delete the old packs in Minecraft: *Settings → Storage → Resource Packs / Behavior
Packs* → select both packs of this Add-On → delete. Then import again. Worlds that used the old build
pick up the new one when they are opened again (same UUIDs).

**Recommended: bump the patch version for every build you install on a device** (verification
builds before the first release: `pnpm version:set 0.1.1`, `0.1.2`, …). A new version is always
imported, so deleting old packs is not needed, and the version shown in *Edit → Behavior Packs /
Resource Packs → Active* tells you which build is running (check it before testing). Record this
choice in `CHANGELOG.md` and list the changes of those builds together under the first public
version. AI agents change the version only after the user has agreed to this (see `AGENTS.md`).

## Smoke tests (every change)

| ID | Steps | Expected |
| --- | --- | --- |
| S-01 | Load the world with the packs active, open the content log | No errors or warnings from this Add-On |
| S-02 | Watch the chat/log right after loading | Script log line `[<slug>] scripts loaded` appears once |
| S-03 | Run `/reload` | Scripts reload without errors; no duplicated behaviour (e.g. double event handling) |
| S-04 | Leave the world and re-enter | Behaviour identical; persisted data (dynamic properties, scoreboards) survives |
| S-05 | Check pack list in world settings | Pack names, descriptions and icons match `addon.config.json`; versions match `package.json` |

## Content checks (per content type)

Copy the relevant block into the feature section below and fill it in.

- **Item**: appears in creative inventory in the expected group; icon and name correct; crafting recipe works; stats (damage, durability, enchantability) as in `CONTENT.md`; behaves correctly in hand / offhand / dropped.
- **Block**: placeable, correct texture on all faces, breaks with the intended tool and drops the intended loot; collision and light as specified; renders correctly in hand and in the inventory.
- **Entity**: spawns via `/summon` and via spawn rules in the right biomes; model, textures and animations play; AI behaves (idle/walk/attack/flee); health, damage, loot and sounds match spec; despawns/persists as intended; looks right at distance and in multiplayer.
- **Recipe**: shows in the recipe book; ingredients and output count correct; no conflict with vanilla recipes.
- **Script feature**: trigger conditions, result, edge cases (no players, multiple players, player leaves mid-action), no per-tick lag (use `/scriptprofiler` or watch for stutter).
- **UI (server-ui forms)**: opens, cancels cleanly, inputs validated, works on touch and controller.
- **Localisation**: switch the game language; strings resolve, no raw keys.

## Feature test cases

### startup (scripts/features/startup)

| ID | Steps | Expected |
| --- | --- | --- |
| F-startup-01 | Load a world with the packs | Exactly one `[<slug>] scripts loaded` line |

### <feature or content name>

| ID | Steps | Expected |
| --- | --- | --- |
| | | |

## Release checklist

- [ ] All smoke tests pass on Windows (or the primary platform) with the target version
- [ ] At least one secondary platform (mobile/console) checked for rendering and performance
- [ ] Upgrade from the previous released version in an existing world works
- [ ] Content log clean; no unreferenced-resource warnings left unexplained
- [ ] `docs/CONTENT.md` and `CHANGELOG.md` updated; `pnpm version:set` applied
