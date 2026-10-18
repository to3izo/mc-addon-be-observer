/**
 * pnpm build [--sourcemap] [--no-validate]
 *
 *  1. clean dist/
 *  2. copy behavior_pack/ -> dist/<slug>_BP/
 *  3. copy resource_pack/ -> dist/<slug>_RP/
 *  4. bundle scripts/main.ts -> dist/<slug>_BP/scripts/main.js (esbuild, ESM, @minecraft/* external)
 *  5. validate the built packs (manifests, JSON, identifiers, resource references)
 *
 * The source tree is never modified. dist/ is disposable.
 */
import * as esbuild from "esbuild";
import path from "node:path";
import { loadConfig, packDirNames } from "./lib/config.ts";
import { copyPack, removeDir } from "./lib/fs.ts";
import { log } from "./lib/log.ts";
import { PATHS, rel, isMain } from "./lib/paths.ts";
import { validate } from "./validate.ts";

export interface BuildOptions {
  sourcemap?: boolean;
  validate?: boolean;
}

export interface BuildResult {
  bpDir: string;
  rpDir: string;
}

export async function build(options: BuildOptions = {}): Promise<BuildResult> {
  const config = loadConfig();
  const dirs = packDirNames(config);
  const bpDir = path.join(PATHS.dist, dirs.bp);
  const rpDir = path.join(PATHS.dist, dirs.rp);

  log.step("Cleaning dist/");
  removeDir(PATHS.dist);

  log.step(`Copying behavior_pack/ -> ${rel(bpDir)}/`);
  log.info(`${copyPack(PATHS.behaviorPack, bpDir)} file(s)`);
  log.step(`Copying resource_pack/ -> ${rel(rpDir)}/`);
  log.info(`${copyPack(PATHS.resourcePack, rpDir)} file(s)`);

  const outfile = path.join(bpDir, "scripts", "main.js");
  log.step(`Bundling scripts/main.ts -> ${rel(outfile)}`);
  await esbuild.build({
    entryPoints: [PATHS.scriptEntry],
    outfile,
    bundle: true,
    format: "esm",
    platform: "neutral",
    target: "es2022",
    // Script API modules are provided by the game at runtime, never bundled.
    external: ["@minecraft/*"],
    sourcemap: options.sourcemap ? "inline" : false,
    legalComments: "none",
    logLevel: "warning",
    absWorkingDir: PATHS.root,
  });

  if (options.validate !== false) {
    const ok = validate({ mode: "dist", strict: false, typecheck: false });
    if (!ok) throw new Error("build output failed validation");
  }

  log.ok(`Build complete: ${rel(bpDir)}/, ${rel(rpDir)}/`);
  return { bpDir, rpDir };
}

if (isMain(import.meta.url)) {
  const args = new Set(process.argv.slice(2));
  build({ sourcemap: args.has("--sourcemap"), validate: !args.has("--no-validate") }).catch((error) => {
    log.error(String(error instanceof Error ? error.message : error));
    process.exit(1);
  });
}
