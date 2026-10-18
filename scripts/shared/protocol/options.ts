import { PARAM_DEFAULTS, PARAM_LIMITS } from "./constants.ts";
import { EVENT_KINDS, EVENT_LIMITS, type EventKind } from "./events.ts";
import {
  expectOnlyKeys,
  parseDimension,
  parseLocation,
  readBoolean,
  readLimitedNumber,
  readNameList,
  type DimensionId,
  type Location,
} from "./params.ts";

/** Options of a view-direction ray (`target`, and `snapshot.target`). */
export interface TargetOptions {
  maxDistance: number;
  includeLiquids: boolean;
  includePassable: boolean;
  includeEntities: boolean;
}

export const TARGET_OPTION_KEYS = ["maxDistance", "includeLiquids", "includePassable", "includeEntities"] as const;

export function parseTargetOptions(params: Record<string, unknown>): TargetOptions {
  return {
    maxDistance: readLimitedNumber(params, "maxDistance", { min: 1, max: PARAM_LIMITS.maxRayDistance }, PARAM_DEFAULTS.rayDistance),
    includeLiquids: readBoolean(params, "includeLiquids", false),
    includePassable: readBoolean(params, "includePassable", false),
    includeEntities: readBoolean(params, "includeEntities", false),
  };
}

/** Options of a nearby-entity search (`entities`, and `snapshot.entities`). */
export interface EntityOptions {
  radius: number;
  limit: number;
  excludePlayers: boolean;
  /** Search centre; absent means "the selected player's location". */
  center: Location | undefined;
  dimension: DimensionId | undefined;
}

/** Keys accepted inside `snapshot.entities` (the centre is always the snapshot's player there). */
export const ENTITY_OPTION_KEYS = ["radius", "limit", "excludePlayers"] as const;

export function parseEntityOptions(params: Record<string, unknown>): EntityOptions {
  const center = params.center === undefined ? undefined : parseLocation(params.center, "center");
  return {
    radius: readLimitedNumber(params, "radius", { min: 1, max: PARAM_LIMITS.maxEntityRadius }, PARAM_DEFAULTS.entityRadius),
    limit: readLimitedNumber(params, "limit", { min: 1, max: PARAM_LIMITS.maxEntities, integer: true }, PARAM_DEFAULTS.entityLimit),
    excludePlayers: readBoolean(params, "excludePlayers", false),
    center,
    dimension: parseDimension(params.dimension),
  };
}

/** Sections `snapshot` can return (docs/PROTOCOL.md §5.8). */
export const SNAPSHOT_SECTIONS = ["player", "health", "inventory", "equipment", "target", "entities", "world"] as const;
export type SnapshotSection = (typeof SNAPSHOT_SECTIONS)[number];
export const SNAPSHOT_DEFAULT_SECTIONS: readonly SnapshotSection[] = ["player", "target"];

/** Validates a nested option group against its allowed keys and returns it. */
export function optionGroup(group: Record<string, unknown>, allowed: readonly string[], name: string): Record<string, unknown> {
  try {
    expectOnlyKeys(group, allowed);
  } catch (error) {
    // Name the group in the message so `snapshot.target.maxDistnce` is easy to find.
    if (error instanceof Error) error.message = `${name}: ${error.message}`;
    throw error;
  }
  return group;
}

/** Parameters of the `events` method (docs/PROTOCOL.md §5.9). */
export interface EventQuery {
  since: number;
  limit: number;
  kinds: EventKind[] | undefined;
}

export const EVENT_QUERY_KEYS = ["since", "limit", "kinds"] as const;

export function parseEventQuery(params: Record<string, unknown>): EventQuery {
  return {
    since: readLimitedNumber(params, "since", { min: 0, max: Number.MAX_SAFE_INTEGER, integer: true }, 0),
    limit: readLimitedNumber(params, "limit", { min: 1, max: EVENT_LIMITS.maxEventsPerRequest, integer: true }, 32),
    kinds: params.kinds === undefined ? undefined : readNameList(params, "kinds", EVENT_KINDS, []),
  };
}
