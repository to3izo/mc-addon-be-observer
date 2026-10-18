import { block, blocks } from "./block.ts";
import { capabilities } from "./capabilities.ts";
import type { ObservationMethods } from "./context.ts";
import { entities } from "./entities.ts";
import { entity } from "./entity.ts";
import { events, subscribe } from "./events.ts";
import { container, features } from "./features.ts";
import { player } from "./player.ts";
import { players } from "./players.ts";
import { scoreboard } from "./scoreboard.ts";
import { snapshot } from "./snapshot.ts";
import { target } from "./target.ts";
import { top, tops } from "./top.ts";

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
  entity,
  top,
  tops,
  scoreboard,
  subscribe,
  features,
  container,
};
