import path from "node:path";
import { walk } from "../lib/fs.ts";
import { readJson } from "../lib/json.ts";
import { rel } from "../lib/paths.ts";
import { get, isObject, type CheckContext } from "./context.ts";

/** BP folders whose JSON files declare a namespaced identifier under `<root>.description.identifier`. */
const BP_DEFINITION_DIRS = ["blocks", "items", "entities", "recipes", "features", "feature_rules", "spawn_rules", "biomes"];
/** RP folders with the same shape (client entities, attachables, particles, block culling rules). */
const RP_DEFINITION_DIRS = ["entity", "attachables", "particles", "block_culling"];

interface Definition {
  file: string;
  rootKey: string;
  identifier: string;
}

/**
 * Identifier policy:
 * - every custom definition uses `<namespace>:<name>` with the configured namespace
 * - names are lowercase snake_case
 * - no duplicate identifiers of the same kind
 * - BP entities should have an RP client entity and vice versa (warnings)
 */
export function checkIdentifiers(ctx: CheckContext): void {
  const { reporter, config } = ctx;
  const bpDefs = collect(ctx.bpDir, BP_DEFINITION_DIRS);
  const rpDefs = collect(ctx.rpDir, RP_DEFINITION_DIRS);

  const seen = new Map<string, string>();
  for (const def of [...bpDefs, ...rpDefs]) {
    const [ns, name] = splitIdentifier(def.identifier);
    const where = `${rel(def.file)}: ${def.rootKey} identifier "${def.identifier}"`;

    if (!ns || !name) {
      reporter.error(`${where} must be "<namespace>:<name>"`);
      continue;
    }
    if (ns === "minecraft") {
      // Overriding vanilla content is allowed but worth knowing about.
      reporter.warn(`${where} overrides vanilla content`);
    } else if (ns !== config.namespace) {
      reporter.error(`${where} uses namespace "${ns}" but this Add-On's namespace is "${config.namespace}"`);
    }
    if (!/^[a-z0-9_.]+$/.test(name)) {
      reporter.error(`${where}: name part must be lowercase snake_case ([a-z0-9_.])`);
    }
    const key = `${def.rootKey}|${def.identifier}`;
    const prev = seen.get(key);
    if (prev) reporter.error(`${where} is also defined in ${prev}`);
    else seen.set(key, rel(def.file));
  }

  const serverEntities = new Set(bpDefs.filter((d) => d.rootKey === "minecraft:entity").map((d) => d.identifier));
  const clientEntities = new Set(rpDefs.filter((d) => d.rootKey === "minecraft:client_entity").map((d) => d.identifier));
  for (const id of serverEntities) {
    if (!clientEntities.has(id) && !id.startsWith("minecraft:")) {
      reporter.warn(`entity "${id}" has no client entity in ${rel(ctx.rpDir)}/entity/ (it will render as an invisible/placeholder entity)`);
    }
  }
  for (const id of clientEntities) {
    if (!serverEntities.has(id) && !id.startsWith("minecraft:")) {
      reporter.warn(`client entity "${id}" has no server entity in ${rel(ctx.bpDir)}/entities/`);
    }
  }
}

function collect(packDir: string, dirs: string[]): Definition[] {
  const defs: Definition[] = [];
  for (const dir of dirs) {
    for (const file of walk(path.join(packDir, dir))) {
      if (!file.endsWith(".json")) continue;
      let data: unknown;
      try {
        data = readJson(file);
      } catch {
        continue; // reported by checkJson
      }
      if (!isObject(data)) continue;
      for (const rootKey of Object.keys(data)) {
        if (!rootKey.startsWith("minecraft:")) continue;
        const identifier = get(data[rootKey], "description", "identifier");
        if (typeof identifier === "string") defs.push({ file, rootKey, identifier });
      }
    }
  }
  return defs;
}

function splitIdentifier(identifier: string): [string | undefined, string | undefined] {
  const i = identifier.indexOf(":");
  if (i <= 0 || i === identifier.length - 1) return [undefined, undefined];
  return [identifier.slice(0, i), identifier.slice(i + 1)];
}
