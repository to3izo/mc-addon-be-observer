import { PARAM_LIMITS } from "../../shared/protocol/constants.ts";
import type { MethodHandler } from "../../shared/protocol/dispatch.ts";
import { SECTIONS } from "../../shared/protocol/methods.ts";
import { expectOnlyKeys, parsePlayerSelector, readNameList } from "../../shared/protocol/params.ts";
import type { RequestContext } from "./context.ts";
import { effectsOf, equipmentOf, healthOf, inventoryOf, playerState, readEntity, worldTime } from "./read.ts";
import { resolvePlayer } from "./resolve.ts";

/** `player`: one player's state, plus optional sections (docs/PROTOCOL.md §5.3). */
export const player: MethodHandler<RequestContext> = (params, context) => {
  expectOnlyKeys(params, ["player", "include"]);
  const selector = parsePlayerSelector(params.player);
  const include = readNameList(params, "include", SECTIONS, []);
  const target = resolvePlayer(selector, context);

  const data = playerState(target);
  for (const section of include) {
    if (section === "health") data.health = healthOf(target);
    else if (section === "inventory") data.inventory = inventoryOf(target, PARAM_LIMITS.maxInventorySlots);
    else if (section === "equipment") data.equipment = equipmentOf(target);
    else if (section === "effects") data.effects = readEntity("the player", () => effectsOf(target));
    else data.world = worldTime();
  }
  return { data, truncatable: [["inventory", "items"]] };
};
