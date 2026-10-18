/**
 * Script entry point.
 *
 * Built by `pnpm build` into `dist/<slug>_BP/scripts/main.js`, which is the
 * `entry` referenced by behavior_pack/manifest.json.
 *
 * Keep this file tiny: it only wires features into the runtime.
 */
import { bootstrap } from "./core/runtime/bootstrap.ts";
import { features } from "./features/index.ts";

bootstrap(features);
