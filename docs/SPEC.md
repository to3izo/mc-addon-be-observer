# SPEC — <Add-On name>

> Fill this in before building gameplay. Agents read this file first.
> Keep it short and factual; details of individual content go in `CONTENT.md`. This file states the current
> spec only; why it is this way, and the dated history, go in `docs/adr/`.

## Purpose

One paragraph: what this Add-On adds to a Bedrock world and for whom (survival players, map makers,
servers, Marketplace customers, ...).

## Main features

| # | Feature | Summary | Status |
| --- | --- | --- | --- |
| 1 | | | planned / in progress / done |
| 2 | | | |

## Target Minecraft version

| | |
| --- | --- |
| Minimum engine version | see `addon.config.json` → `minEngineVersion` |
| Script API | `@minecraft/server` version in `behavior_pack/manifest.json` (stable) |
| Platforms | Bedrock (Windows, mobile, console via Realms/worlds); note any platform-specific limits |
| Experimental toggles | none required (list any that are) |

## Namespace

`<namespace>:` — see `addon.config.json`. All custom identifiers, scoreboard objectives, tags and
dynamic properties use this prefix.

## Constraints

- Compatibility: works alongside other Add-Ons; no vanilla overrides unless listed in `CONTENT.md`.
- Performance budget: no per-tick scripting without justification; entity counts and particle use kept
  reasonable for low-end mobile devices.
- Multiplayer: all logic is server-side (scripts run on the host); UI only via `@minecraft/server-ui`.
- Content rating / Marketplace guidelines if the Add-On is intended for the Marketplace.
- Localisation: `en_US` always; additional languages listed here.

## Non-goals

What this Add-On deliberately does not do (so agents do not "helpfully" add it):

- 
- 
