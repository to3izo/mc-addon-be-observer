import { world, type Dimension, type Player } from "@minecraft/server";
import { ObserverError } from "../../shared/protocol/errors.ts";
import type { DimensionId, PlayerSelector } from "../../shared/protocol/params.ts";
import type { RequestContext } from "./context.ts";

/** Finds the player a request is about (docs/PROTOCOL.md §3). Never guesses "the only player". */
export function resolvePlayer(selector: PlayerSelector, context: RequestContext): Player {
  if (selector.kind === "source") {
    if (!context.sourcePlayer || !context.sourcePlayer.isValid) {
      throw new ObserverError("NO_SOURCE_PLAYER", "this request has no source player; pass params.player {name} or {id}");
    }
    return context.sourcePlayer;
  }
  for (const player of world.getAllPlayers()) {
    if (!player.isValid) continue;
    if (selector.kind === "name" ? player.name === selector.name : player.id === selector.id) return player;
  }
  const what = selector.kind === "name" ? `named "${selector.name}"` : `with id "${selector.id}"`;
  throw new ObserverError("PLAYER_NOT_FOUND", `no player ${what}`);
}

/**
 * The dimension a block/entity request is about: the given id, else the dimension of `player` (the selected
 * or source player). Without either it is required.
 */
export function resolveDimension(id: DimensionId | undefined, player: Player | undefined): Dimension {
  if (id) {
    try {
      return world.getDimension(id);
    } catch {
      throw new ObserverError("DIMENSION_NOT_FOUND", `unknown dimension "${id}"`);
    }
  }
  if (player && player.isValid) return player.dimension;
  throw new ObserverError("INVALID_PARAMS", "dimension is required when the request has no player", { param: "dimension" });
}
