// Identity of the bundle, reported by `capabilities.build` (docs/PROTOCOL.md §5.1, ADR-0014). tools/build.ts
// embeds the real values with esbuild `define`; code that is not bundled (unit tests) gets UNBUNDLED_BUILD.

export interface BuildInfo {
  /** One comparable string: `<commit>[+dirty]@<UTC time as YYYYMMDDTHHMMSSZ>`; `nogit` when git was not available. */
  id: string;
  /** Bundle time, ISO 8601 UTC. */
  time: string | null;
  /** Short commit hash of HEAD, or null without git. */
  commit: string | null;
  /** True when the working tree had uncommitted changes; null without git. */
  dirty: boolean | null;
}

export const UNBUNDLED_BUILD: BuildInfo = { id: "unbundled", time: null, commit: null, dirty: null };

/** Replaced by tools/build.ts at bundle time; undefined everywhere else. */
declare const __BUILD_INFO__: BuildInfo | undefined;

export const BUILD_INFO: BuildInfo = typeof __BUILD_INFO__ === "undefined" ? UNBUNDLED_BUILD : __BUILD_INFO__;
