/**
 * pnpm version:set <major.minor.patch>
 *
 * Sets the Add-On version in every place it must agree:
 *   package.json "version", both manifest headers, every module version,
 *   and the BP <-> RP dependency versions.
 * UUIDs are untouched.
 */
import { VERSION_PATTERN, parseVersion } from "./lib/config.ts";
import { readJson, writeJson } from "./lib/json.ts";
import { log } from "./lib/log.ts";
import { manifestPath, readManifest } from "./lib/manifest.ts";
import { PATHS, isMain, rel } from "./lib/paths.ts";

export function setVersion(version: string): void {
  if (!VERSION_PATTERN.test(version)) throw new Error(`version must look like "1.2.3", got "${version}"`);
  const arr = parseVersion(version);

  const rp = readManifest(PATHS.resourcePack);
  const bp = readManifest(PATHS.behaviorPack);
  for (const m of [bp, rp]) {
    m.header.version = arr;
    for (const mod of m.modules) mod.version = arr;
  }
  for (const [from, to] of [
    [bp, rp],
    [rp, bp],
  ] as const) {
    for (const dep of from.dependencies ?? []) {
      if (typeof dep.uuid === "string" && dep.uuid.toLowerCase() === to.header.uuid.toLowerCase()) dep.version = arr;
    }
  }
  writeJson(manifestPath(PATHS.behaviorPack), bp);
  writeJson(manifestPath(PATHS.resourcePack), rp);

  const pkg = readJson<Record<string, unknown>>(PATHS.packageJson);
  writeJson(PATHS.packageJson, { ...pkg, version });

  log.ok(`Version set to ${version} in ${rel(PATHS.packageJson)}, ${rel(manifestPath(PATHS.behaviorPack))}, ${rel(manifestPath(PATHS.resourcePack))}`);
  log.info("Remember to add a CHANGELOG.md entry.");
}

if (isMain(import.meta.url)) {
  const version = process.argv[2];
  if (!version) {
    log.error("usage: pnpm version:set <major.minor.patch>");
    process.exit(1);
  }
  try {
    setVersion(version);
  } catch (error) {
    log.error(String(error instanceof Error ? error.message : error));
    process.exit(1);
  }
}
