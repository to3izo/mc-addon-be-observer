import { PARAM_LIMITS } from "./constants.ts";
import { ObserverError } from "./errors.ts";
import { expectOnlyKeys, parseBlockPosition, parseDimension, readLimitedNumber, readNameList, type BlockPosition, type DimensionId } from "./params.ts";

/**
 * Opt-in features (ADR-0015): off until the BDS console turns them on with the `features` method. The switch is
 * kept in memory only, so /reload and a server restart turn them all off again. `capabilities.optionalFeatures`
 * lists them. Names are a stable contract: add new ones, never rename or remove one.
 */
export const OPTIONAL_FEATURES = ["containers"] as const;

export type OptionalFeature = (typeof OPTIONAL_FEATURES)[number];

/** Parameters of the `features` method (docs/PROTOCOL.md §5.15). */
export interface FeatureQuery {
  enable: OptionalFeature[];
  disable: OptionalFeature[];
}

export const FEATURE_QUERY_KEYS = ["enable", "disable"] as const;

export function parseFeatureQuery(params: Record<string, unknown>): FeatureQuery {
  const enable = readNameList(params, "enable", OPTIONAL_FEATURES, []);
  const disable = readNameList(params, "disable", OPTIONAL_FEATURES, []);
  const both = enable.find((name) => disable.includes(name));
  if (both) throw new ObserverError("INVALID_PARAMS", `"${both}" is in both enable and disable`, { param: "disable" });
  return { enable, disable };
}

/**
 * True when a request counts as coming from the BDS console: the game reports the server as its source
 * (`Server` for `/scriptevent`, `command:Server` for the custom command) and there is no source player.
 * The game also reports `Server` for a pack script's `runCommand`; that code was installed by the server owner.
 */
export function isConsoleSource(sourceType: string, hasSourcePlayer: boolean): boolean {
  return !hasSourcePlayer && (sourceType === "Server" || sourceType === "command:Server");
}

/** Only the BDS console may turn a feature on; anyone who can send requests may turn one off (ADR-0015). */
export function authorizeFeatureQuery(query: FeatureQuery, fromConsole: boolean): void {
  if (query.enable.length > 0 && !fromConsole) {
    throw new ObserverError("PERMISSION_DENIED", "only the BDS console can turn features on", { param: "enable", required: "console" });
  }
}

/** The answer to a method whose feature is off. */
export function featureDisabled(feature: OptionalFeature): ObserverError {
  return new ObserverError("FEATURE_DISABLED", `"${feature}" is off; the BDS console turns it on with the features method`, { feature });
}

/** Parameters of the `container` method (docs/PROTOCOL.md §5.16). */
export interface ContainerQuery {
  position: BlockPosition;
  dimension: DimensionId | undefined;
  /** First slot to read; a tool whose answer was truncated asks again from the next slot. */
  fromSlot: number;
}

export function parseContainerQuery(params: Record<string, unknown>): ContainerQuery {
  expectOnlyKeys(params, ["dimension", "x", "y", "z", "fromSlot"]);
  return {
    position: parseBlockPosition({ x: params.x, y: params.y, z: params.z }, ""),
    dimension: parseDimension(params.dimension),
    fromSlot: readLimitedNumber(params, "fromSlot", { min: 0, max: PARAM_LIMITS.maxInventorySlots - 1, integer: true }, 0),
  };
}
