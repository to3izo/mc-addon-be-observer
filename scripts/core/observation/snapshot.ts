import { InvalidEntityError } from "@minecraft/server";
import { PARAM_LIMITS } from "../../shared/protocol/constants.ts";
import type { MethodHandler } from "../../shared/protocol/dispatch.ts";
import { ObserverError } from "../../shared/protocol/errors.ts";
import {
  ENTITY_OPTION_KEYS,
  SNAPSHOT_DEFAULT_SECTIONS,
  SNAPSHOT_SECTIONS,
  TARGET_OPTION_KEYS,
  optionGroup,
  parseEntityOptions,
  parseTargetOptions,
} from "../../shared/protocol/options.ts";
import { expectOnlyKeys, parsePlayerSelector, readNameList, readOptions } from "../../shared/protocol/params.ts";
import type { RequestContext } from "./context.ts";
import { nearbyEntities } from "./entities.ts";
import { equipmentOf, healthOf, inventoryOf, playerState, readEntity, worldTime } from "./read.ts";
import { resolvePlayer } from "./resolve.ts";
import { lookAt } from "./target.ts";

/**
 * `snapshot`: several sections about one player in one response, taken in the same script call
 * (docs/PROTOCOL.md §5.8). A failing section does not fail the snapshot: it is reported in `errors`.
 */
export const snapshot: MethodHandler<RequestContext> = (params, context) => {
  expectOnlyKeys(params, ["player", "include", "target", "entities"]);
  const include = readNameList(params, "include", SNAPSHOT_SECTIONS, SNAPSHOT_DEFAULT_SECTIONS);
  // Options are validated before anything is read, so a typo fails the request instead of one section.
  const targetOptions = parseTargetOptions(optionGroup(readOptions(params, "target"), TARGET_OPTION_KEYS, "target"));
  const entityOptions = parseEntityOptions(optionGroup(readOptions(params, "entities"), ENTITY_OPTION_KEYS, "entities"));
  const player = resolvePlayer(parsePlayerSelector(params.player), context);

  const data: Record<string, unknown> = {};
  const errors: Record<string, { code: string; message: string }> = {};
  for (const section of include) {
    try {
      if (section === "player") data.player = playerState(player);
      else if (section === "health") data.health = healthOf(player);
      else if (section === "inventory") data.inventory = inventoryOf(player, PARAM_LIMITS.maxInventorySlots);
      else if (section === "equipment") data.equipment = equipmentOf(player);
      else if (section === "target") data.target = lookAt(player, targetOptions);
      else if (section === "entities") {
        data.entities = readEntity("the player", () => nearbyEntities(player.dimension, player.location, entityOptions, player.id));
      } else data.world = worldTime();
    } catch (error) {
      errors[section] =
        error instanceof ObserverError
          ? { code: error.code, message: error.message }
          : error instanceof InvalidEntityError
            ? { code: "TARGET_INVALID", message: "the player is no longer valid" }
            : { code: "INTERNAL_ERROR", message: "this section failed unexpectedly" };
    }
  }
  data.errors = errors;
  return { data, truncatable: [["entities", "entities"], ["inventory", "items"]] };
};
