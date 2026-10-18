import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { formatVersion, parseVersion } from "../lib/config.ts";
import { exists, isDirectory, walk } from "../lib/fs.ts";
import { readJson } from "../lib/json.ts";
import {
  declaredUuids,
  isVersionArray,
  manifestPath,
  readManifest,
  UUID_PATTERN,
  versionEquals,
  isPlaceholderUuid,
  type Manifest,
  type ManifestDependency,
} from "../lib/manifest.ts";
import { PATHS, rel } from "../lib/paths.ts";
import { get, isObject, type CheckContext } from "./context.ts";

const BP_MODULE_TYPES = new Set(["data", "script"]);
const RP_MODULE_TYPES = new Set(["resources"]);
const SCRIPT_ENTRY = "scripts/main.js";

export function checkManifests(ctx: CheckContext): void {
  const { reporter, config } = ctx;
  const bp = loadOrReport(ctx, ctx.bpDir, "behavior pack");
  const rp = loadOrReport(ctx, ctx.rpDir, "resource pack");
  if (!bp || !rp) return;

  const bpFile = rel(manifestPath(ctx.bpDir));
  const rpFile = rel(manifestPath(ctx.rpDir));

  checkCommon(ctx, bp, bpFile, BP_MODULE_TYPES);
  checkCommon(ctx, rp, rpFile, RP_MODULE_TYPES);

  // UUIDs must be unique across the whole Add-On.
  const seen = new Map<string, string>();
  for (const [file, manifest] of [
    [bpFile, bp],
    [rpFile, rp],
  ] as const) {
    for (const uuid of declaredUuids(manifest)) {
      const key = uuid.toLowerCase();
      const prev = seen.get(key);
      if (prev) reporter.error(`${file}: UUID ${uuid} is also declared in ${prev}; every header/module UUID must be unique`);
      else seen.set(key, file);
    }
  }

  // Pack versions must agree with each other and with package.json.
  const pkgVersion = readPackageVersion();
  if (isVersionArray(bp.header?.version) && isVersionArray(rp.header?.version)) {
    if (!versionEquals(bp.header.version, rp.header.version)) {
      reporter.error(`${bpFile} and ${rpFile}: header.version differ (${formatVersion(bp.header.version)} vs ${formatVersion(rp.header.version)}); use "pnpm version:set <x.y.z>"`);
    }
    if (pkgVersion && formatVersion(bp.header.version) !== pkgVersion) {
      reporter.error(`${bpFile}: header.version ${formatVersion(bp.header.version)} does not match package.json version ${pkgVersion}; use "pnpm version:set <x.y.z>"`);
    }
  }

  // The two packs depend on each other by UUID (cooperative Add-On rule), and on nothing
  // else: 1 Add-On = 1 repository.
  checkPackDependency(ctx, bp, bpFile, rp, rpFile, "resource pack");
  checkPackDependency(ctx, rp, rpFile, bp, bpFile, "behavior pack");

  // The resource pack must not be usable as a global resource pack (cooperative Add-On rule).
  if (rp.header?.pack_scope !== "world") {
    strictWarn(ctx, `${rpFile}: header.pack_scope should be "world" so the resource pack cannot be applied globally; re-run "pnpm init:addon"`);
  }

  // Script module <-> dependencies <-> actual imports.
  const scriptModule = (bp.modules ?? []).find((m) => isObject(m) && m.type === "script");
  const moduleDeps = (bp.dependencies ?? []).filter((d) => typeof d.module_name === "string");
  if (scriptModule) {
    checkScriptModule(ctx, scriptModule, bpFile);
    checkScriptDependencies(ctx, moduleDeps, bpFile);
  } else {
    if (moduleDeps.length > 0) reporter.error(`${bpFile}: declares script API dependencies but has no "script" module`);
    if (ctx.mode === "source" && existsSync(PATHS.scriptEntry)) {
      reporter.error(`${bpFile}: scripts/main.ts exists but the manifest has no "script" module`);
    }
  }
  if (ctx.mode === "source" && isDirectory(path.join(ctx.bpDir, "scripts"))) {
    reporter.error(`${rel(ctx.bpDir)}/scripts/ must not exist in the source tree: TypeScript lives in scripts/ and JavaScript is generated into dist/ by "pnpm build"`);
  }
  if ((rp.modules ?? []).some((m) => isObject(m) && m.type === "script")) {
    reporter.error(`${rpFile}: resource packs cannot contain script modules`);
  }

  // Both packs must target the configured engine version.
  const expected = parseVersion(config.minEngineVersion);
  for (const [file, manifest] of [
    [bpFile, bp],
    [rpFile, rp],
  ] as const) {
    const mev = manifest.header?.min_engine_version;
    if (isVersionArray(mev) && !versionEquals(mev, expected)) {
      reporter.error(`${file}: header.min_engine_version is ${formatVersion(mev)} but addon.config.json says ${config.minEngineVersion}; change the config and re-run "pnpm init:addon"`);
    }
    if (typeof manifest.header?.name === "string" && !manifest.header.name.includes(config.name)) {
      reporter.warn(`${file}: header.name "${manifest.header.name}" does not contain the configured name "${config.name}"`);
    }
  }
}

function checkPackDependency(ctx: CheckContext, from: Manifest, fromFile: string, to: Manifest, toFile: string, toLabel: string): void {
  const uuidDeps = (from.dependencies ?? []).filter((d) => typeof d.uuid === "string");
  const toUuid = to.header?.uuid?.toLowerCase();
  if (uuidDeps.length === 0) {
    strictWarn(ctx, `${fromFile}: no pack dependency on the ${toLabel}; add {"uuid": "<${toLabel} header uuid>", "version": [...]} (re-run "pnpm init:addon")`);
  }
  for (const dep of uuidDeps) {
    if (dep.uuid!.toLowerCase() !== toUuid) {
      ctx.reporter.error(`${fromFile}: dependency ${dep.uuid} does not match the ${toLabel} header UUID (${to.header?.uuid}); 1 Add-On = 1 repository, external pack dependencies are not expected`);
    } else if (isVersionArray(dep.version) && isVersionArray(to.header?.version) && !versionEquals(dep.version, to.header.version)) {
      ctx.reporter.error(`${fromFile}: dependency on the ${toLabel} declares version ${formatVersion(dep.version)} but ${toFile} is ${formatVersion(to.header.version)}`);
    }
  }
}

/** A cooperative Add-On requirement: a warning while developing, an error for release builds (--strict). */
function strictWarn(ctx: CheckContext, message: string): void {
  if (ctx.strict) ctx.reporter.error(message);
  else ctx.reporter.warn(message);
}

function loadOrReport(ctx: CheckContext, dir: string, label: string): Manifest | undefined {
  const file = manifestPath(dir);
  if (!exists(file)) {
    ctx.reporter.error(`${rel(file)}: ${label} manifest is missing`);
    return undefined;
  }
  try {
    return readManifest(dir);
  } catch (error) {
    ctx.reporter.error(String(error instanceof Error ? error.message : error));
    return undefined;
  }
}

function checkCommon(ctx: CheckContext, m: Manifest, file: string, allowedModuleTypes: Set<string>): void {
  const { reporter } = ctx;
  if (m.format_version !== 2) {
    reporter.error(`${file}: format_version must be 2 (manifest version 3 is still a preview-only feature)`);
  }
  if (!isObject(m.header)) {
    reporter.error(`${file}: "header" object is required`);
    return;
  }
  if (typeof m.header.name !== "string" || m.header.name.trim() === "") reporter.error(`${file}: header.name is required`);
  if (typeof m.header.description !== "string") reporter.warn(`${file}: header.description is missing`);
  checkUuid(ctx, m.header.uuid, `${file}: header.uuid`);
  if (!isVersionArray(m.header.version)) reporter.error(`${file}: header.version must be [major, minor, patch]`);
  if (!isVersionArray(m.header.min_engine_version)) reporter.error(`${file}: header.min_engine_version must be [major, minor, patch]`);

  if (!Array.isArray(m.modules) || m.modules.length === 0) {
    reporter.error(`${file}: "modules" must contain at least one module`);
    return;
  }
  m.modules.forEach((mod, i) => {
    const where = `${file}: modules[${i}]`;
    if (!isObject(mod)) {
      reporter.error(`${where}: must be an object`);
      return;
    }
    if (typeof mod.type !== "string" || !allowedModuleTypes.has(mod.type)) {
      reporter.error(`${where}: type "${String(mod.type)}" is not allowed here (expected ${[...allowedModuleTypes].join(" | ")})`);
    }
    checkUuid(ctx, mod.uuid, `${where}.uuid`);
    if (!isVersionArray(mod.version)) reporter.error(`${where}.version must be [major, minor, patch]`);
    else if (isVersionArray(m.header.version) && !versionEquals(mod.version, m.header.version)) {
      reporter.warn(`${where}.version ${formatVersion(mod.version)} differs from header.version ${formatVersion(m.header.version)}`);
    }
  });

  if (!exists(path.join(path.dirname(path.join(PATHS.root, file)), "pack_icon.png"))) {
    reporter.warn(`${path.dirname(file)}/pack_icon.png is missing (Minecraft will show a default icon)`);
  }
}

function checkUuid(ctx: CheckContext, uuid: unknown, where: string): void {
  if (typeof uuid !== "string" || !UUID_PATTERN.test(uuid)) {
    ctx.reporter.error(`${where} must be a UUID in the form xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`);
    return;
  }
  if (isPlaceholderUuid(uuid)) {
    const msg = `${where} is still the template placeholder ${uuid}; run "pnpm init:addon" to generate real UUIDs`;
    if (ctx.strict) ctx.reporter.error(msg);
    else ctx.reporter.warn(msg);
  }
}

function checkScriptModule(ctx: CheckContext, mod: Record<string, unknown>, file: string): void {
  const { reporter } = ctx;
  if (mod.language !== "javascript") reporter.error(`${file}: script module "language" must be "javascript"`);
  if (mod.entry !== SCRIPT_ENTRY) {
    reporter.error(`${file}: script module "entry" must be "${SCRIPT_ENTRY}" (that is where "pnpm build" writes the bundle)`);
  }
  if (ctx.mode === "source") {
    if (!exists(PATHS.scriptEntry)) reporter.error(`${rel(PATHS.scriptEntry)} is missing but the manifest declares a script module`);
  } else {
    const built = path.join(ctx.bpDir, SCRIPT_ENTRY);
    if (!exists(built)) reporter.error(`${rel(built)} is missing; the script bundle was not produced`);
  }
}

/** Every @minecraft/* module imported by scripts/ must be declared, with a version matching the installed types. */
function checkScriptDependencies(ctx: CheckContext, deps: ManifestDependency[], file: string): void {
  const { reporter } = ctx;
  const declared = new Map<string, ManifestDependency>();
  for (const dep of deps) declared.set(dep.module_name!, dep);

  if (!declared.has("@minecraft/server")) {
    reporter.error(`${file}: a script module requires a dependency on "@minecraft/server"`);
  }

  for (const [name, dep] of declared) {
    if (typeof dep.version !== "string" || !/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(dep.version)) {
      reporter.error(`${file}: dependency "${name}" version must be a semver string such as "2.10.0"`);
      continue;
    }
    const installed = installedVersion(name);
    if (installed && installed !== dep.version) {
      reporter.warn(`${file}: "${name}" is declared as ${dep.version} but node_modules has ${installed}; keep the manifest and package.json aligned`);
    }
  }

  const imported = importedScriptModules();
  for (const name of imported) {
    if (!declared.has(name)) reporter.error(`scripts/ imports "${name}" but ${file} does not declare it as a dependency`);
  }
  for (const name of declared.keys()) {
    if (!imported.has(name)) reporter.warn(`${file}: dependency "${name}" is declared but never imported from scripts/`);
  }
}

function installedVersion(moduleName: string): string | undefined {
  const file = path.join(PATHS.nodeModules, moduleName, "package.json");
  if (!exists(file)) return undefined;
  const version = get(readJson(file), "version");
  return typeof version === "string" ? version : undefined;
}

function importedScriptModules(): Set<string> {
  const names = new Set<string>();
  const pattern = /from\s+["'](@minecraft\/[a-z0-9-]+)["']/g;
  for (const f of walk(PATHS.scripts)) {
    if (!f.endsWith(".ts") || f.endsWith(".d.ts")) continue;
    const text = readFileSync(f, "utf8");
    for (const m of text.matchAll(pattern)) names.add(m[1]!);
  }
  return names;
}

function readPackageVersion(): string | undefined {
  const version = get(readJson(PATHS.packageJson), "version");
  return typeof version === "string" ? version : undefined;
}
