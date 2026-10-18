import { world } from "@minecraft/server";
import type { Feature } from "../../core/runtime/feature.ts";
import { ADDON_SLUG } from "../../shared/constants/addon.ts";

/**
 * Minimal reference feature: logs once when the world has finished loading.
 * It proves the script pipeline works end to end. Replace or delete it freely.
 */
export const startupFeature: Feature = {
  id: "startup",
  register() {
    world.afterEvents.worldLoad.subscribe(() => {
      console.log(`[${ADDON_SLUG}] scripts loaded`);
    });
  },
};
