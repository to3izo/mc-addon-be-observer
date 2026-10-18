import type { Player } from "@minecraft/server";
import type { MethodHandler } from "../../shared/protocol/dispatch.ts";
import { TARGET_OPTION_KEYS, parseTargetOptions, type TargetOptions } from "../../shared/protocol/options.ts";
import { expectOnlyKeys, parsePlayerSelector } from "../../shared/protocol/params.ts";
import type { RequestContext } from "./context.ts";
import { blockInfo, entitySummary, playerRef, readEntity, vec } from "./read.ts";
import { resolvePlayer } from "./resolve.ts";

/**
 * What `player` is looking at (docs/PROTOCOL.md §5.6). `hit: false` means nothing within `maxDistance`,
 * which may include unloaded or empty space: the API does not tell those apart.
 */
export function lookAt(player: Player, options: TargetOptions): Record<string, unknown> {
  return readEntity("the player", () => {
    const origin = player.getHeadLocation();
    const data: Record<string, unknown> = {
      player: playerRef(player),
      origin: vec(origin),
      direction: vec(player.getViewDirection()),
      maxDistance: options.maxDistance,
    };

    const hit = player.getBlockFromViewDirection({
      maxDistance: options.maxDistance,
      includeLiquidBlocks: options.includeLiquids,
      includePassableBlocks: options.includePassable,
    });
    data.block = hit
      ? { hit: true, position: vec(hit.block.location), face: hit.face, faceLocation: vec(hit.faceLocation), block: blockInfo(hit.block) }
      : { hit: false };

    if (options.includeEntities) {
      const hits = player
        .getEntitiesFromViewDirection({ maxDistance: options.maxDistance })
        .filter((h) => h.entity.isValid && h.entity.id !== player.id)
        .sort((a, b) => a.distance - b.distance);
      const first = hits[0];
      data.entity = first ? { hit: true, ...entitySummary(first.entity, origin), distance: first.distance } : { hit: false };
    }
    return data;
  });
}

/** `target`: the block (and optionally the entity) a player looks at. */
export const target: MethodHandler<RequestContext> = (params, context) => {
  expectOnlyKeys(params, ["player", ...TARGET_OPTION_KEYS]);
  const options = parseTargetOptions(params);
  const player = resolvePlayer(parsePlayerSelector(params.player), context);
  return { data: lookAt(player, options) };
};
