/**
 * pnpm dev [--deploy] [--preview] [--sourcemap]
 *
 * Rebuilds on every change under scripts/, behavior_pack/, resource_pack/ or
 * addon.config.json. With --deploy, each successful build is copied into the
 * Minecraft development pack folders (see deploy.ts). --sourcemap embeds inline
 * source maps for the Minecraft Debugger (.vscode/launch.json).
 */
import { watch } from "node:fs";
import { build } from "./build.ts";
import { deploy } from "./deploy.ts";
import { log } from "./lib/log.ts";
import { PATHS, rel } from "./lib/paths.ts";

const DEBOUNCE_MS = 200;

async function run(options: { deploy: boolean; preview: boolean; sourcemap: boolean }): Promise<void> {
  if (options.deploy) await deploy({ preview: options.preview, build: true, sourcemap: options.sourcemap });
  else await build({ sourcemap: options.sourcemap });
}

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2));
  const options = { deploy: args.has("--deploy"), preview: args.has("--preview"), sourcemap: args.has("--sourcemap") };

  const attempt = async (): Promise<void> => {
    try {
      await run(options);
    } catch (error) {
      log.error(String(error instanceof Error ? error.message : error));
    }
  };

  await attempt();

  let timer: NodeJS.Timeout | undefined;
  let running = false;
  let queued = false;
  const schedule = (file: string): void => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      if (running) {
        queued = true;
        return;
      }
      running = true;
      log.step(`Change detected: ${file}`);
      await attempt();
      running = false;
      if (queued) {
        queued = false;
        schedule("(queued changes)");
      }
    }, DEBOUNCE_MS);
  };

  for (const dir of [PATHS.scripts, PATHS.behaviorPack, PATHS.resourcePack]) {
    watch(dir, { recursive: true }, (_event, filename) => schedule(`${rel(dir)}/${filename ?? ""}`));
  }
  watch(PATHS.config, () => schedule(rel(PATHS.config)));

  log.info("Watching scripts/, behavior_pack/, resource_pack/, addon.config.json (Ctrl+C to stop)");
}

main().catch((error) => {
  log.error(String(error instanceof Error ? error.message : error));
  process.exit(1);
});
