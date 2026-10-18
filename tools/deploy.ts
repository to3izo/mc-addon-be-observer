/**
 * pnpm deploy [--preview] [--no-build] [--sourcemap]
 *
 * Copies the built packs into Minecraft's development pack folders so the game
 * picks them up on the next launch / world reload:
 *   <com.mojang>/development_behavior_packs/<slug>_BP
 *   <com.mojang>/development_resource_packs/<slug>_RP
 *
 * Location of com.mojang (first match wins):
 *   1. MINECRAFT_COM_MOJANG environment variable (any platform, e.g. a Bedrock Dedicated Server path)
 *   2. Windows, Minecraft (GDK, 1.21.120+):  %APPDATA%\Minecraft Bedrock\users\shared\games\com.mojang
 *      Windows, Minecraft Preview:            %APPDATA%\Minecraft Bedrock Preview\users\shared\games\com.mojang
 *   3. Windows, legacy UWP install:           %LOCALAPPDATA%\Packages\Microsoft.MinecraftUWP_8wekyb3d8bbwe\LocalState\games\com.mojang
 *      (Preview: Microsoft.MinecraftWindowsBeta_8wekyb3d8bbwe)
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { build } from "./build.ts";
import { loadConfig, packDirNames } from "./lib/config.ts";
import { copyPack, removeDir } from "./lib/fs.ts";
import { log } from "./lib/log.ts";
import { PATHS, isMain } from "./lib/paths.ts";

export function findComMojang(preview: boolean): string | undefined {
  const fromEnv = process.env.MINECRAFT_COM_MOJANG;
  if (fromEnv) return fromEnv;
  if (process.platform !== "win32") return undefined;

  const appData = process.env.APPDATA;
  const localAppData = process.env.LOCALAPPDATA;
  const candidates = [
    appData && path.join(appData, preview ? "Minecraft Bedrock Preview" : "Minecraft Bedrock", "users", "shared", "games", "com.mojang"),
    localAppData &&
      path.join(localAppData, "Packages", preview ? "Microsoft.MinecraftWindowsBeta_8wekyb3d8bbwe" : "Microsoft.MinecraftUWP_8wekyb3d8bbwe", "LocalState", "games", "com.mojang"),
  ].filter((p): p is string => Boolean(p));
  return candidates.find((p) => existsSync(p));
}

export async function deploy(options: { preview: boolean; build: boolean; sourcemap?: boolean }): Promise<void> {
  const config = loadConfig();
  const dirs = packDirNames(config);
  const comMojang = findComMojang(options.preview);
  if (!comMojang) {
    throw new Error("could not locate com.mojang. Set MINECRAFT_COM_MOJANG to the com.mojang folder of your Minecraft installation.");
  }

  const bpSrc = path.join(PATHS.dist, dirs.bp);
  const rpSrc = path.join(PATHS.dist, dirs.rp);
  if (options.build || !existsSync(bpSrc) || !existsSync(rpSrc)) await build({ sourcemap: options.sourcemap });

  const targets: Array<[string, string]> = [
    [bpSrc, path.join(comMojang, "development_behavior_packs", dirs.bp)],
    [rpSrc, path.join(comMojang, "development_resource_packs", dirs.rp)],
  ];
  for (const [src, dest] of targets) {
    log.step(`Deploying -> ${dest}`);
    removeDir(dest);
    log.info(`${copyPack(src, dest)} file(s)`);
  }
  log.ok("Deployed. In Minecraft, re-enter the world (or run /reload for script-only changes).");
}

if (isMain(import.meta.url)) {
  const args = new Set(process.argv.slice(2));
  deploy({ preview: args.has("--preview"), build: !args.has("--no-build"), sourcemap: args.has("--sourcemap") }).catch((error) => {
    log.error(String(error instanceof Error ? error.message : error));
    process.exit(1);
  });
}
