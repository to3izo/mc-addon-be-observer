# Changelog

All notable changes to this Add-On are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions follow `major.minor.patch`
and must match `package.json` and both pack manifests (`pnpm version:set <x.y.z>`).

## [Unreleased]

### Removed
- Documentation inherited from the private template that does not apply to this BDS-only Add-On:
  `docs/PROMPTS.md` and the knowledge topics on blocks, particles, textures, shared containers, iOS testing,
  releases/media and the Marketplace (ADR-0012).

### Changed
- Pack icon: the template's checkerboard placeholder is replaced by original pixel art of a grass block side
  with `{ }` (same icon for both packs; source `assets/textures/pack_icon.svg`).
- Docs no longer depend on private repositories or tools: the author's tool is called "an external tool",
  examples from other add-ons were replaced, and commit references point at the rewritten history (ADR-0012).
- The Add-On is not distributed through the Minecraft Marketplace: the "Marketplace policy" is now the
  "Cooperative Add-On policy" (additive, no experiments, namespaced), and Marketplace-only wording, the
  `media/marketplace/` folder and the block permutation counter were removed.
- Versioning follows Semantic Versioning 2.0.0 with a defined public API (protocol, entry points, BDS, world
  data), deprecation before removal, and no pre-release versions (ADR-0013, replacing ADR-0002). `SECURITY.md`
  supports the latest release of the latest major.

## [1.0.0] - 2026-10-18

First public release: a read-only observation Add-On for Bedrock Dedicated Server, protocol 1.

### Added
- Initial project structure created from the Bedrock Add-On template.
- VS Code setup: `.vscode/launch.json` for the Minecraft Debugger (paths kept in sync by
  `pnpm init:addon`), `.mcignore` for the Blockception extension, `--sourcemap` for `pnpm dev`/`pnpm deploy`.
- Add-On identity set with `pnpm init:addon`: Bedrock Observer (`be-observer`, namespace `to3izo_bo`).
- Specification, public protocol draft, research notes, BDS setup notes, security policy and the phased
  implementation plan for the read-only observer.
- Observer Phase 1 (not yet verified in game): `/scriptevent to3izo_bo:query <JSON>` requests answered by one
  `to3izo_bo.response {JSON}` log line; request validation, stable error codes, size limits with list
  truncation, `session`/`seq`/`tick`/`time` metadata; methods `capabilities` and `players`.
- Tests: protocol unit tests, a read-only guard over `scripts/`, and a check that the versions reported by
  `capabilities` match `package.json` and the manifest.
- Responses are pure ASCII (non-ASCII characters as `\uXXXX`), because BDS for Windows writes its console in the
  system code page.
- Target narrowed to Bedrock Dedicated Server (ADR-0006); Phase 1 verified on BDS 1.26.52.3.
- Observer Phase 2: methods `player` (with `health`, `inventory`, `equipment`, `world` sections), `block`,
  `blocks`, `target`, `entities` and `snapshot`, with parameter limits and defaults reported by `capabilities`;
  verified on BDS 1.26.52.3 with two players.
- Game event notifications (ADR-0008): `to3izo_bo.event` lines for player join/leave/spawn, deaths involving
  players, dimension, game mode and game rule changes, rate-limited, plus the `events` method to read recent
  events again.
- Reference script `docs/knowledge/bds-local-server/scripts/bds-console-bridge.ps1` to run BDS with its console
  redirected to files (lines appended to `stdin.txt` while it reads are no longer lost).
- More observations (ADR-0009): entity filters (`type`, `excludeTypes`, `families`, `excludeFamilies`, `name`,
  `tags`) for `entities` and `snapshot.entities`; status effects (`effects` section, `includeEffects`); methods
  `entity` (one entity by id, `ENTITY_NOT_FOUND`), `top`/`tops` (topmost block of columns) and `scoreboard`
  (read-only); known Script API errors mapped by name to stable codes (new code `UNLOADED_CHUNK`). Verified on
  BDS 1.26.52.3.
- Reference script `docs/knowledge/bds-local-server/scripts/bo-verify.ps1` with `bo-verify-cases.json`: sends a
  set of requests through the bridge, judges the responses and writes the verdicts as JSON.
  `bo-verify-ro-cases.json` runs every method for the read-only before/after check (OBS-RO-01).
- Operator command `/to3izo_bo:query "<json>"` (ADR-0010): the same requests from an operator's chat without
  cheats; `capabilities.transport.requestCommand` names it. Verified on BDS 1.26.52.3.
- Protocol 1 frozen (`docs/PROTOCOL.md`); limits unchanged.
- README (English and Japanese) rewritten for users of the Add-On: requirements, BDS install, quick start,
  methods, security, building.
- `docs/ROADMAP.md`: checklist of every phase up to the first release, with the current progress, task details
  and open questions. It replaces `docs/PLAN.md`, whose decisions moved to ADR-0007 and ADR-0004.

### Changed
- Version 1.0.0: "1.0.0" now means the first release outside users can install and use (ADR-0002), not
  Marketplace publication.
- Phase 3 closed: the optional BDS network adapter using `@minecraft/server-net` is rejected (ADR-0004). The core
  stays `@minecraft/server` only, no `"reply": "event"` / `to3izo_bo:response` is added, and forwarding
  observation lines off the BDS host is left to the external tool (`SECURITY.md`). OBS-ENV-07 is not applicable.
- README (English and Japanese): "Using it from a tool" — sending and collecting on the BDS host and from another
  machine (e.g. a Mac with BDS in a Windows VM). `docs/PROTOCOL.md` §9 points network forwarders to `SECURITY.md`.

<!--
Release checklist:
1. pnpm version:set <x.y.z>
2. Move "Unreleased" entries under "## [x.y.z] - YYYY-MM-DD"
3. Commit, tag v<x.y.z>, push the tag (release.yml packages and attaches the .mcaddon)
-->
