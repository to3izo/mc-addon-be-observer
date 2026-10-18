# Changelog

All notable changes to this Add-On are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions follow `major.minor.patch`
and must match `package.json` and both pack manifests (`pnpm version:set <x.y.z>`).

## [Unreleased]

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
- Reference script `docs/knowledge/bds-local-server/scripts/bds-console-bridge.ps1` to run BDS with its console
  redirected to files.
- `docs/ROADMAP.md`: checklist of every phase up to the first release, with the current progress, task details
  and open questions. It replaces `docs/PLAN.md`, whose decisions moved to ADR-0007 and ADR-0004.

<!--
Release checklist:
1. pnpm version:set <x.y.z>
2. Move "Unreleased" entries under "## [x.y.z] - YYYY-MM-DD"
3. Commit, tag v<x.y.z>, push the tag (release.yml packages and attaches the .mcaddon)
-->
