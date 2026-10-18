/**
 * pnpm package
 *
 * Runs a full build, refuses to ship template placeholder UUIDs, then writes:
 *   dist/<slug>_BP-<version>.mcpack   (zip of the behavior pack, manifest.json at the zip root)
 *   dist/<slug>_RP-<version>.mcpack   (zip of the resource pack)
 *   dist/<slug>-<version>.mcaddon     (zip containing <slug>_BP/ and <slug>_RP/ folders)
 *
 * The version (package.json) is part of the file names so that a device never confuses a new build
 * with an older copy of the same name (iCloud Drive, "Recents", earlier downloads).
 */
import { zipSync, type Zippable } from "fflate";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { build } from "./build.ts";
import { loadConfig, packDirNames } from "./lib/config.ts";
import { readJson } from "./lib/json.ts";
import { walk } from "./lib/fs.ts";
import { log } from "./lib/log.ts";
import { PATHS, rel, isMain } from "./lib/paths.ts";
import { validate } from "./validate.ts";

export interface PackageResult {
  bpMcpack: string;
  rpMcpack: string;
  mcaddon: string;
}

export async function packageAddon(): Promise<PackageResult> {
  const config = loadConfig();
  const dirs = packDirNames(config);

  log.step("Validating source (strict)");
  if (!validate({ mode: "source", strict: true, typecheck: true })) {
    throw new Error("cannot package: validation failed (placeholder UUIDs are not allowed in distributed packs)");
  }

  const { bpDir, rpDir } = await build();

  log.step("Writing .mcpack / .mcaddon");
  const bpFiles = collect(bpDir);
  const rpFiles = collect(rpDir);

  const { version } = readJson<{ version: string }>(PATHS.packageJson);
  const bpMcpack = path.join(PATHS.dist, `${dirs.bp}-${version}.mcpack`);
  const rpMcpack = path.join(PATHS.dist, `${dirs.rp}-${version}.mcpack`);
  const mcaddon = path.join(PATHS.dist, `${config.slug}-${version}.mcaddon`);

  writeZip(bpMcpack, bpFiles);
  writeZip(rpMcpack, rpFiles);
  writeZip(mcaddon, { [dirs.bp]: bpFiles, [dirs.rp]: rpFiles });

  log.ok(`Packaged: ${rel(bpMcpack)}, ${rel(rpMcpack)}, ${rel(mcaddon)}`);
  return { bpMcpack, rpMcpack, mcaddon };
}

/** Reads a built pack folder into fflate's nested structure (posix paths relative to the pack root). */
function collect(dir: string): Zippable {
  const files: Zippable = {};
  for (const file of walk(dir)) {
    const key = path.relative(dir, file).split(path.sep).join("/");
    files[key] = readFileSync(file);
  }
  return files;
}

function writeZip(target: string, data: Zippable): void {
  writeFileSync(target, zipSync(data, { level: 6 }));
}

if (isMain(import.meta.url)) {
  packageAddon().catch((error) => {
    log.error(String(error instanceof Error ? error.message : error));
    process.exit(1);
  });
}
