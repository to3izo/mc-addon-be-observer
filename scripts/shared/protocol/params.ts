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
 * error here: they are answered per item as `out_of_bounds`. With `param` "" the axes are named `x`/`y`/`z`
 * (for methods that take the coordinates as top-level parameters).
 */
export function parseBlockPosition(value: unknown, param: string): BlockPosition {
  if (!isRecord(value)) throw new ObserverError("INVALID_PARAMS", `${param} must be an object {x, y, z}`, { param });
  const keys = Object.keys(value);
  if (keys.length !== 3 || !("x" in value) || !("y" in value) || !("z" in value)) {
    throw new ObserverError("INVALID_PARAMS", `${param} must have exactly x, y and z`, { param });
  }
  const read = (axis: "x" | "y" | "z"): number => {
    const name = param ? `${param}.${axis}` : axis;
    const n = value[axis];
    if (typeof n !== "number" || !Number.isInteger(n)) {
      throw new ObserverError("INVALID_PARAMS", `${name} must be an integer block coordinate`, { param: name });
    }
    if (Math.abs(n) > MAX_HORIZONTAL_COORDINATE) {
      throw new ObserverError("INVALID_PARAMS", `${name} must be within ±${MAX_HORIZONTAL_COORDINATE}`, { param: name });
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

/** Dimension ids accepted in requests (docs/PROTOCOL.md §4). */
export const DIMENSION_IDS = ["minecraft:overworld", "minecraft:nether", "minecraft:the_end"] as const;
export type DimensionId = (typeof DIMENSION_IDS)[number];

/** Parses an optional dimension id. Unknown ids are DIMENSION_NOT_FOUND. */
export function parseDimension(value: unknown, param = "dimension"): DimensionId | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new ObserverError("INVALID_PARAMS", `${param} must be a dimension id string`, { param });
  const known = DIMENSION_IDS.find((id) => id === value);
  if (!known) throw new ObserverError("DIMENSION_NOT_FOUND", `unknown dimension "${value}"`, { param, supported: [...DIMENSION_IDS] });
  return known;
}

export interface Location {
  x: number;
  y: number;
  z: number;
}

/** Parses `{x, y, z}` finite (not necessarily integer) coordinates, e.g. a search centre. */
export function parseLocation(value: unknown, param: string): Location {
  if (!isRecord(value)) throw new ObserverError("INVALID_PARAMS", `${param} must be an object {x, y, z}`, { param });
  const keys = Object.keys(value);
  if (keys.length !== 3 || !("x" in value) || !("y" in value) || !("z" in value)) {
    throw new ObserverError("INVALID_PARAMS", `${param} must have exactly x, y and z`, { param });
  }
  const read = (axis: "x" | "y" | "z"): number => {
    const n = value[axis];
    if (typeof n !== "number" || !Number.isFinite(n) || Math.abs(n) > MAX_HORIZONTAL_COORDINATE) {
      throw new ObserverError("INVALID_PARAMS", `${param}.${axis} must be a finite number within ±${MAX_HORIZONTAL_COORDINATE}`, {
        param: `${param}.${axis}`,
      });
    }
    return n;
  };
  return { x: read("x"), y: read("y"), z: read("z") };
}

/** Reads an optional boolean. Strings such as "true" are not converted. */
export function readBoolean(params: Record<string, unknown>, key: string, fallback: boolean): boolean {
  const value = params[key];
  if (value === undefined) return fallback;
  if (typeof value !== "boolean") throw new ObserverError("INVALID_PARAMS", `${key} must be true or false`, { param: key });
  return value;
}

/** Reads an optional object parameter (a nested option group); absent means `{}`. */
export function readOptions(params: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = params[key];
  if (value === undefined) return {};
  if (!isRecord(value)) throw new ObserverError("INVALID_PARAMS", `${key} must be an object`, { param: key });
  return value;
}

/** Reads an optional list of names from `allowed`, without duplicates, in request order. */
export function readNameList<T extends string>(params: Record<string, unknown>, key: string, allowed: readonly T[], fallback: readonly T[]): T[] {
  const value = params[key];
  if (value === undefined) return [...fallback];
  if (!Array.isArray(value)) throw new ObserverError("INVALID_PARAMS", `${key} must be an array of names`, { param: key });
  const names: T[] = [];
  for (const item of value) {
    const name = allowed.find((a) => a === item);
    if (!name) throw new ObserverError("INVALID_PARAMS", `${key} contains an unknown name`, { param: key, allowed: [...allowed] });
    if (!names.includes(name)) names.push(name);
  }
  return names;
}

/** Reads `positions`: a non-empty array of block positions, at most `max` long (LIMIT_EXCEEDED above). */
export function readBlockPositions(params: Record<string, unknown>, key: string, max: number): BlockPosition[] {
  const value = params[key];
  if (!Array.isArray(value) || value.length === 0) {
    throw new ObserverError("INVALID_PARAMS", `${key} must be a non-empty array of {x, y, z}`, { param: key });
  }
  if (value.length > max) throw new ObserverError("LIMIT_EXCEEDED", `${key} may hold at most ${max} positions`, { param: key, limit: max });
  return value.map((item, i) => parseBlockPosition(item, `${key}[${i}]`));
}
