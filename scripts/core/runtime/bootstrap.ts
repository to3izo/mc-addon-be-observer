import { ADDON_SLUG } from "../../shared/constants/addon.ts";
import type { Feature } from "./feature.ts";

/**
 * Registers every feature exactly once. A failing feature must not take the
 * whole script down, so each registration is isolated.
 */
export function bootstrap(features: readonly Feature[]): void {
  const seen = new Set<string>();

  for (const feature of features) {
    if (seen.has(feature.id)) {
      console.warn(`[${ADDON_SLUG}] duplicate feature id: ${feature.id}`);
      continue;
    }
    seen.add(feature.id);

    try {
      feature.register();
    } catch (error) {
      console.error(`[${ADDON_SLUG}] failed to register feature "${feature.id}": ${String(error)}`);
    }
  }
}
