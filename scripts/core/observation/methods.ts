import { capabilities } from "./capabilities.ts";
import type { ObservationMethods } from "./context.ts";
import { players } from "./players.ts";

/**
 * The handler of every method in shared/protocol/methods.ts. The type requires exactly those names, so a
 * method cannot be listed in `capabilities` without a handler, or handled without being listed.
 */
export const OBSERVATION_METHODS: ObservationMethods = {
  capabilities,
  players,
};
