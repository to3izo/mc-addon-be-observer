import type { Dimension, EntityQueryOptions, Vector3 } from "@minecraft/server";
import type { MethodHandler } from "../../shared/protocol/dispatch.ts";
import { ObserverError } from "../../shared/protocol/errors.ts";
import { parseEntityOptions, type EntityOptions } from "../../shared/protocol/options.ts";
import { expectOnlyKeys, parsePlayerSelector } from "../../shared/protocol/params.ts";
import type { RequestContext } from "./context.ts";
import { entitySummary, readEntity, vec } from "./read.ts";
import { resolveDimension, resolvePlayer } from "./resolve.ts";

/**
 * Entities within `radius` of `center`, nearest first, at most `limit` (docs/PROTOCOL.md §5.7).
 * `excludeId` leaves out the player the search is centred on.
 */
export function nearbyEntities(
  dimension: Dimension,
  center: Vector3,
  options: Pick<EntityOptions, "radius" | "limit" | "excludePlayers">,
  excludeId?: string,
): Record<string, unknown> {
  // Ask for a few more than needed: one may be the excluded player, one more shows that the list was cut.
  const query: EntityQueryOptions = { location: center, maxDistance: options.radius, closest: options.limit + 2 };
  if (options.excludePlayers) query.excludeTypes = ["minecraft:player"];
  const found = dimension
    .getEntities(query)
    .filter((e) => e.isValid && e.id !== excludeId)
    .map((e) => entitySummary(e, center))
    .sort((a, b) => Number(a.distance) - Number(b.distance));
  const entities = found.slice(0, options.limit);
  return {
    dimension: dimension.id,
    center: vec(center),
    radius: options.radius,
    entities,
    returned: entities.length,
    limit: options.limit,
    truncated: found.length > options.limit,
  };
}

/** `entities`: around the selected player, or around `center` in `dimension`. */
export const entities: MethodHandler<RequestContext> = (params, context) => {
  expectOnlyKeys(params, ["player", "center", "dimension", "radius", "limit", "excludePlayers"]);
  const options = parseEntityOptions(params);

  if (options.center) {
    if (params.player !== undefined) {
      throw new ObserverError("INVALID_PARAMS", "give either player or center, not both", { param: "center" });
    }
    const dimension = resolveDimension(options.dimension, context.sourcePlayer);
    return { data: nearbyEntities(dimension, options.center, options), truncatable: [["entities"]] };
  }
  if (options.dimension) throw new ObserverError("INVALID_PARAMS", "dimension is only used together with center", { param: "dimension" });

  const player = resolvePlayer(parsePlayerSelector(params.player), context);
  const data = readEntity("the player", () => nearbyEntities(player.dimension, player.location, options, player.id));
  return { data, truncatable: [["entities"]] };
};
