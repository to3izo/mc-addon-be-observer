import { ObserverError, isRecord } from "./errors.ts";

/**
 * Parameter validators shared by the method handlers (docs/PROTOCOL.md §3–§4).
 * They throw ObserverError (INVALID_PARAMS / LIMIT_EXCEEDED) so a handler stays a straight line.
 */

/** Largest |x| and |z| accepted for a block coordinate. Also used as a sanity bound for y. */
export const MAX_HORIZONTAL_COORDINATE = 30_000_000;

/** Rejects keys other than `allowed`, so a mistyped parameter is never silently ignored. */
export function expectOnlyKeys(params: Record<string, unknown>, allowed: readonly string[]): void {
  for (const key of Object.keys(params)) {
    if (!allowed.includes(key)) throw new ObserverError("INVALID_PARAMS", `unknown parameter "${key}"`, { param: key });
  }
}

export interface NumberRule {
  /** Values above this are LIMIT_EXCEEDED (a published limit), not INVALID_PARAMS. */
  max: number;
  min: number;
  integer?: boolean;
}

/** Reads an optional finite number with a lower bound and a published upper limit. */
export function readLimitedNumber(params: Record<string, unknown>, key: string, rule: NumberRule, fallback: number): number {
  const value = params[key];
  if (value === undefined) return fallback;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ObserverError("INVALID_PARAMS", `${key} must be a finite number`, { param: key });
  }
  if (rule.integer && !Number.isInteger(value)) throw new ObserverError("INVALID_PARAMS", `${key} must be an integer`, { param: key });
  if (value < rule.min) throw new ObserverError("INVALID_PARAMS", `${key} must be at least ${rule.min}`, { param: key });
  if (value > rule.max) throw new ObserverError("LIMIT_EXCEEDED", `${key} must be at most ${rule.max}`, { param: key, limit: rule.max });
  return value;
}

export interface BlockPosition {
  x: number;
  y: number;
  z: number;
}

/**
 * Parses `{x, y, z}` integer block coordinates. Values outside the dimension's height range are not an
 * error here: they are answered per item as `out_of_bounds`.
 */
export function parseBlockPosition(value: unknown, param: string): BlockPosition {
  if (!isRecord(value)) throw new ObserverError("INVALID_PARAMS", `${param} must be an object {x, y, z}`, { param });
  const keys = Object.keys(value);
  if (keys.length !== 3 || !("x" in value) || !("y" in value) || !("z" in value)) {
    throw new ObserverError("INVALID_PARAMS", `${param} must have exactly x, y and z`, { param });
  }
  const read = (axis: "x" | "y" | "z"): number => {
    const n = value[axis];
    if (typeof n !== "number" || !Number.isInteger(n)) {
      throw new ObserverError("INVALID_PARAMS", `${param}.${axis} must be an integer block coordinate`, { param: `${param}.${axis}` });
    }
    if (Math.abs(n) > MAX_HORIZONTAL_COORDINATE) {
      throw new ObserverError("INVALID_PARAMS", `${param}.${axis} must be within ±${MAX_HORIZONTAL_COORDINATE}`, { param: `${param}.${axis}` });
    }
    return n;
  };
  return { x: read("x"), y: read("y"), z: read("z") };
}

export type PlayerSelector = { kind: "source" } | { kind: "name"; name: string } | { kind: "id"; id: string };

const MAX_SELECTOR_CHARS = 64;

/**
 * Parses `params.player`: omitted → the player who sent the request; `{name}` → exact `Player.name`
 * (spaces and non-ASCII allowed); `{id}` → exact `Player.id`.
 */
export function parsePlayerSelector(value: unknown, param = "player"): PlayerSelector {
  if (value === undefined) return { kind: "source" };
  if (!isRecord(value)) throw new ObserverError("INVALID_PARAMS", `${param} must be an object {name} or {id}`, { param });
  const keys = Object.keys(value);
  if (keys.length !== 1 || (keys[0] !== "name" && keys[0] !== "id")) {
    throw new ObserverError("INVALID_PARAMS", `${param} must have exactly one of name or id`, { param });
  }
  const key = keys[0];
  const text = value[key];
  if (typeof text !== "string" || text.length === 0 || text.length > MAX_SELECTOR_CHARS) {
    throw new ObserverError("INVALID_PARAMS", `${param}.${key} must be a string of 1-${MAX_SELECTOR_CHARS} characters`, { param: `${param}.${key}` });
  }
  return key === "name" ? { kind: "name", name: text } : { kind: "id", id: text };
}
