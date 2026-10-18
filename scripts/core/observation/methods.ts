import { block, blocks } from "./block.ts";
import { capabilities } from "./capabilities.ts";
import type { ObservationMethods } from "./context.ts";
import { entities } from "./entities.ts";
import { events } from "./events.ts";
import { player } from "./player.ts";
import { players } from "./players.ts";
import { snapshot } from "./snapshot.ts";
import { target } from "./target.ts";

/**
 * The handler of every method in shared/protocol/methods.ts. The type requires exactly those names, so a
 * method cannot be listed in `capabilities` without a handler, or handled without being listed.
 */
export const OBSERVATION_METHODS: ObservationMethods = {
  capabilities,
  players,
  player,
  block,
  blocks,
  target,
  entities,
  snapshot,
  events,
};
