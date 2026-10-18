/**
 * pnpm validate [--dist] [--strict] [--no-typecheck]
 *
 * Checks the repository without producing output:
 *  1. TypeScript type-check of scripts/ and tools/ (skipped with --no-typecheck)
 *  2. addon.config.json shape
 *  3. strict JSON parse of every .json in both packs
 *  4. manifest rules (format_version, UUIDs, versions, dependencies, script module)
 *  5. identifier / namespace rules
 *  6. resource reference integrity (textures, geometry, animations, sounds, ...)
 *
 * --dist   run the pack checks against dist/ instead of the source tree (used by build)
 * --strict placeholder UUIDs become errors (used by package)
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { checkIdentifiers } from "./checks/identifiers.ts";
import { checkJson } from "./checks/json.ts";
import { checkManifests } from "./checks/manifests.ts";
import { checkResources } from "./checks/resources.ts";
import type { CheckContext, CheckMode } from "./checks/context.ts";
import { loadConfig, packDirNames, type AddonConfig } from "./lib/config.ts";
import { log, Reporter } from "./lib/log.ts";
import { PATHS, isMain } from "./lib/paths.ts";

export interface ValidateOptions {
  mode: CheckMode;
  strict: boolean;
  typecheck: boolean;
}

export function validate(options: ValidateOptions): boolean {
  const reporter = new Reporter();

  let config: AddonConfig;
  try {
    config = loadConfig();
  } catch (error) {
    log.error(String(error instanceof Error ? error.message : error));
    return false;
  }

  if (options.typecheck) {
    log.step("Type-checking scripts/ and tools/");
    if (!runTsc("tsconfig.json") || !runTsc("tsconfig.tools.json")) return false;
  }

  const dirs = packDirNames(config);
  const ctx: CheckContext = {
    reporter,
    config,
    strict: options.strict,
    mode: options.mode,
    bpDir: options.mode === "dist" ? path.join(PATHS.dist, dirs.bp) : PATHS.behaviorPack,
    rpDir: options.mode === "dist" ? path.join(PATHS.dist, dirs.rp) : PATHS.resourcePack,
  };

  log.step(`Validating packs (${options.mode})`);
  checkJson(ctx);
  checkManifests(ctx);
  checkIdentifiers(ctx);
  checkResources(ctx);

  const ok = reporter.print();
  if (ok) log.ok(`Validation passed${reporter.warnings.length ? ` with ${reporter.warnings.length} warning(s)` : ""}`);
  else log.error(`Validation failed with ${reporter.errors.length} error(s)`);
  return ok;
}

function runTsc(project: string): boolean {
  const bin = path.join(PATHS.nodeModules, ".bin", process.platform === "win32" ? "tsc.cmd" : "tsc");
  const result = spawnSync(bin, ["-p", project], { cwd: PATHS.root, stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) log.error(`tsc -p ${project} failed`);
  return result.status === 0;
}

if (isMain(import.meta.url)) {
  const args = new Set(process.argv.slice(2));
  const ok = validate({
    mode: args.has("--dist") ? "dist" : "source",
    strict: args.has("--strict"),
    typecheck: !args.has("--no-typecheck"),
  });
  process.exit(ok ? 0 : 1);
}
