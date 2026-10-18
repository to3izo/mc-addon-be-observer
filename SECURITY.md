# Security policy

Bedrock Observer is a **read-only** observation Add-On. This file states what it protects, what it does not,
and how to report a problem. Design decisions behind it are in `docs/adr/0003-read-only-scriptevent-protocol.md`
and `docs/adr/0004-bds-network-adapter.md`; the wire format is in `docs/PROTOCOL.md`.

## Supported versions

Only the latest released version (and `main`) receives fixes. Before 1.0.0, the public protocol may change
between minor versions; the `protocol` field of every response says which version a tool is talking to.

## Reporting a vulnerability

Please do **not** open a public issue for a security problem. Use GitHub's private vulnerability reporting
("Security" tab → "Report a vulnerability") on this repository. Include the Add-On version, the game/BDS
version, and the steps to reproduce. Never include tokens, server addresses that are reachable from the
Internet, or other people's account names in the report.

## Security properties (what the Add-On guarantees)

| Property | How it is kept |
| --- | --- |
| No world changes | The script only calls read APIs (getters, `getBlock`, ray casts, entity queries). It runs no commands, sets no blocks, dynamic properties, scoreboards, tags, game rules or inventories. Every new API use is reviewed against this rule; `docs/TESTING.md` has an in-game check that the world is unchanged. |
| No command or code execution | Requests are JSON data with a fixed set of methods. There is no `eval`, no `Function`, no `runCommand`, and no method that forwards text to the command system. Unknown methods are rejected. |
| Bounded work per request | Radii, counts, ray distances, batch sizes and response size are capped (`capabilities.limits`). Requests over a limit are rejected or truncated with an explicit flag, never processed unbounded. Unloaded chunks are reported, never force-loaded. |
| Input validation | Request length is capped before parsing; numbers must be finite; block coordinates must be integers inside the world's height range and the documented horizontal range. |
| No network access in the core | The core behavior pack depends only on `@minecraft/server`. It opens no sockets and makes no HTTP requests. |

## What it does *not* protect

- **The observations are not secret.** Responses contain player names, IDs, positions, inventories and
  surrounding blocks. They are written to the script log: the content log of the device that hosts the world,
  or the standard output of a Bedrock Dedicated Server (BDS). Anyone who can read that log can read them.
  Treat logs as containing personal data (player names) and do not publish them without consent.
- **Who may send requests is decided by Minecraft, not by this Add-On.** Requests arrive through `/scriptevent`
  or the custom command `/to3izo_bo:query`. On BDS (1.26.52.3) the server console can always send them; a player
  needs operator permission (`/to3izo_bo:query` works without cheats, `/scriptevent` needs cheats on too). Players
  without operator permission cannot send requests. Anyone who can can query observations of every player in the
  world. Do not install the Add-On on servers where that is unacceptable, and give operator permission only to
  people who may see everyone's observations.
- **Event lines tell who joined, left, died, moved between dimensions or changed game mode, and where.** They are
  written whenever these happen, without a request (ADR-0008).
- **Script output goes to the server console.** The Add-On needs `content-log-console-output-enabled=true`, which
  also prints other packs' script logs and content errors to standard output. Protect the console and any file it
  is redirected to like other server logs.
- **No authentication or encryption** exists on the script-event/log path. It is a local, same-machine debugging
  interface.
- **Timing is not a security boundary.** Observations are taken at a server tick and may be stale by the time a
  tool reads them; nothing in the protocol is transactionally consistent.

## Running on a Bedrock Dedicated Server

These are recommendations for the operator; the Add-On cannot enforce them.

- Keep the server private: `online-mode=true`, `allow-list=true` with only the people who should join.
  `enable-lan-visibility=false` stops LAN discovery answers but is **not** an access control and does not bind
  the server to localhost.
- On BDS versions with the NetherNet transport (`transport=nethernet`), the listening socket can be bound to one
  local address with `server-ip`, and the client UDP port range can be pinned with `server-udp-ports`. Combine
  this with host firewall rules scoped to the networks that need access. Do not open router ports.
- Review `config/default/permissions.json` (`allowed_modules`) instead of widening it. Grant extra modules to
  one pack only, through `config/<script module UUID>/permissions.json`.
- See `docs/knowledge/bds-local-server/README.md` for the verified local setup and the open questions.

## No network adapter; forwarding observations off the server

The Add-On opens no network connection. An adapter pack using `@minecraft/server-net` was considered and
rejected (`docs/adr/0004-bds-network-adapter.md`). If an external tool forwards the observation lines from the
BDS host to another machine (for example from the console bridge to a receiver on the Mac), it is outside this
Add-On and should follow these rules (details in ADR-0004, "受信側の条件"):

- Forward observation lines only (`to3izo_bo.response`, `to3izo_bo.event`), to one configured receiver. No
  inbound command channel through the receiver, no arbitrary command execution, no world changes.
- The receiver binds only to the address of the network that needs it (never `0.0.0.0`) and requires a long
  random shared token, compared in constant time. The token lives in the OS secret stores on both sides, never
  in a pack, a world, a script constant, a log line or Git.
- Size, rate and queue limits on the sender; the receiver enforces its own limits as well and logs only reject
  reasons and counts, never token or header values.
- The path between the VM and the receiving host is assumed to be readable by others on that network unless it
  is encrypted; "it is an internal network" is not treated as a security property.
