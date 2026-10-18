import type { AddonConfig } from "../lib/config.ts";
import type { Reporter } from "../lib/log.ts";

/**
 * Where a check runs:
 * - "source": behavior_pack/ and resource_pack/ in the repository (scripts are still TypeScript).
 * - "dist":   the built packs in dist/ (scripts/main.js must exist).
 */
export type CheckMode = "source" | "dist";

export interface CheckContext {
  reporter: Reporter;
  config: AddonConfig;
  bpDir: string;
  rpDir: string;
  mode: CheckMode;
  /** Treat template placeholder UUIDs as errors (used before packaging). */
  strict: boolean;
}

/** Safely walks `obj` along `keys`; returns undefined on any miss. */
export function get(obj: unknown, ...keys: string[]): unknown {
  let cur: unknown = obj;
  for (const key of keys) {
    if (typeof cur !== "object" || cur === null || Array.isArray(cur)) return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Flattens the common Bedrock "string | string[] | {path} | mixed array" shapes into strings. */
export function asStringList(value: unknown, objectKey = "path"): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap((v) => asStringList(v, objectKey));
  if (isObject(value) && typeof value[objectKey] === "string") return [value[objectKey]];
  return [];
}
