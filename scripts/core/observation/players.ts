import { world } from "@minecraft/server";
import type { MethodHandler } from "../../shared/protocol/dispatch.ts";
import { expectOnlyKeys } from "../../shared/protocol/params.ts";
import type { RequestContext } from "./context.ts";

interface PlayerSummary {
  id: string;
  name: string;
  dimension: string;
}

/**
 * `players`: everyone in the world (docs/PROTOCOL.md §5.2). Read-only. A player who becomes invalid while
 * the list is read (left the game) is left out and counted in `skipped`, instead of failing the request.
 */
export const players: MethodHandler<RequestContext> = (params) => {
  expectOnlyKeys(params, []);

  const list: PlayerSummary[] = [];
  let skipped = 0;
  for (const player of world.getAllPlayers()) {
    try {
      if (!player.isValid) {
        skipped++;
        continue;
      }
      list.push({ id: player.id, name: player.name, dimension: player.dimension.id });
    } catch {
      skipped++;
    }
  }

  return { data: { players: list, count: list.length, skipped }, truncatable: [["players"]] };
};
