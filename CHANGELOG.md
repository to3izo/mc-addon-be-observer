# Changelog

All notable changes to this Add-On are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions follow `major.minor.patch`
and must match `package.json` and both pack manifests (`pnpm version:set <x.y.z>`).

## [Unreleased]

### Added
- Initial project structure created from the Bedrock Add-On template.
- VS Code setup: `.vscode/launch.json` for the Minecraft Debugger (paths kept in sync by
  `pnpm init:addon`), `.mcignore` for the Blockception extension, `--sourcemap` for `pnpm dev`/`pnpm deploy`.

<!--
Release checklist:
1. pnpm version:set <x.y.z>
2. Move "Unreleased" entries under "## [x.y.z] - YYYY-MM-DD"
3. Commit, tag v<x.y.z>, push the tag (release.yml packages and attaches the .mcaddon)
-->
