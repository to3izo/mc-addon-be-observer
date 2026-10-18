import { PARAM_LIMITS } from "../../shared/protocol/constants.ts";
import type { MethodHandler } from "../../shared/protocol/dispatch.ts";
import {
  FEATURE_QUERY_KEYS,
  OPTIONAL_FEATURES,
  authorizeFeatureQuery,
  featureDisabled,
  isConsoleSource,
  parseContainerQuery,
  parseFeatureQuery,
  type OptionalFeature,
} from "../../shared/protocol/features.ts";
import { expectOnlyKeys } from "../../shared/protocol/params.ts";
import { NameSwitch } from "../../shared/protocol/switch.ts";
import type { RequestContext } from "./context.ts";
import { readContainerAt } from "./read.ts";
import { resolveDimension } from "./resolve.ts";

/** Which opt-in features are on. Memory only (ADR-0015): never stored in the world. */
const switches = new NameSwitch<OptionalFeature>(OPTIONAL_FEATURES);

/** Opt-in features that are on now, for `capabilities.optionalFeatures.enabled`. */
export function enabledFeatures(): OptionalFeature[] {
  return switches.enabled();
}

/**
 * `features`: turns opt-in features on and off (docs/PROTOCOL.md §5.15, ADR-0015). Only the BDS console may turn
 * one on; anyone may turn one off. Without parameters it only reports the state. The switch is shared by every
 * tool on this server and lives in memory only.
 */
export const features: MethodHandler<RequestContext> = (params, context) => {
  expectOnlyKeys(params, FEATURE_QUERY_KEYS);
  const query = parseFeatureQuery(params);
  authorizeFeatureQuery(query, isConsoleSource(context.sourceType, context.sourcePlayer !== undefined));
  const changed = switches.apply(query.enable, query.disable);
  return { data: { optional: [...OPTIONAL_FEATURES], enabled: switches.enabled(), changed } };
};

/** `container`: the items in one block's inventory (docs/PROTOCOL.md §5.16). Needs the `containers` feature. */
export const container: MethodHandler<RequestContext> = (params, context) => {
  if (!switches.isOn("containers")) throw featureDisabled("containers");
  const query = parseContainerQuery(params);
  const dimension = resolveDimension(query.dimension, context.sourcePlayer);
  const data = readContainerAt(dimension, query.position, query.fromSlot, PARAM_LIMITS.maxInventorySlots);
  return { data, truncatable: [["container", "items"]] };
};
