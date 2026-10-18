import type { Feature } from "../core/runtime/feature.ts";
import { startupFeature } from "./startup/index.ts";

/**
 * Feature registry. Add a feature here to enable it; remove it to disable it.
 * Order matters only if features depend on each other (avoid that).
 */
export const features: readonly Feature[] = [startupFeature];
