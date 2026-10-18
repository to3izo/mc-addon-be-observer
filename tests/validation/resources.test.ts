/**
 * Runs the block reference checks in tools/checks/resources.ts against a tiny fixture pack pair.
 */
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import { checkResources } from "../../tools/checks/resources.ts";
import type { CheckContext } from "../../tools/checks/context.ts";
import { Reporter } from "../../tools/lib/log.ts";
import { formatJson } from "../../tools/lib/json.ts";
import { loadConfig } from "../../tools/lib/config.ts";

let root: string;

before(() => {
  root = mkdtempSync(path.join(tmpdir(), "addon-resources-"));
});
after(() => {
  rmSync(root, { recursive: true, force: true });
});

function write(file: string, data: unknown): void {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, typeof data === "string" ? data : formatJson(data));
}

/** A pack pair with one block that references a geometry, a culling rule and a loot table. */
function fixture(name: string, opts: { culling?: boolean; loot?: boolean; permutationCulling?: string }): CheckContext {
  const bpDir = path.join(root, name, "BP");
  const rpDir = path.join(root, name, "RP");
  write(path.join(rpDir, "textures", "a", "b", "glass.png"), "");
  write(path.join(rpDir, "textures", "terrain_texture.json"), { texture_data: { "ns:glass": { textures: "textures/a/b/glass" } } });
  write(path.join(rpDir, "models", "blocks", "glass.geo.json"), { format_version: "1.16.0", "minecraft:geometry": [{ description: { identifier: "geometry.ns.glass" }, bones: [] }] });
  if (opts.culling) write(path.join(rpDir, "block_culling", "glass.json"), { format_version: "1.21.80", "minecraft:block_culling_rules": { description: { identifier: "ns:culling.glass" }, rules: [] } });
  if (opts.loot) write(path.join(bpDir, "loot_tables", "a", "b", "empty.json"), { pools: [] });
  const geometry = { identifier: "geometry.ns.glass", culling: "ns:culling.glass" };
  write(path.join(bpDir, "blocks", "glass.json"), {
    format_version: "1.26.50",
    "minecraft:block": {
      description: { identifier: "ns:glass" },
      components: {
        "minecraft:geometry": geometry,
        "minecraft:material_instances": { "*": { texture: "ns:glass" } },
        "minecraft:loot": "loot_tables/a/b/empty.json",
      },
      permutations: opts.permutationCulling ? [{ condition: "1", components: { "minecraft:geometry": { ...geometry, culling: opts.permutationCulling } } }] : [],
    },
  });
  return { reporter: new Reporter(), config: loadConfig(), bpDir, rpDir, mode: "source", strict: false };
}

test("a block whose culling rule and loot table exist passes", () => {
  const ctx = fixture("ok", { culling: true, loot: true });
  checkResources(ctx);
  assert.deepEqual(ctx.reporter.errors, []);
});

test("a missing culling rule is an error", () => {
  const ctx = fixture("no-culling", { loot: true });
  checkResources(ctx);
  assert.ok(ctx.reporter.errors.some((e) => e.includes('culling "ns:culling.glass" is not defined')));
});

test("a missing loot table is an error", () => {
  const ctx = fixture("no-loot", { culling: true });
  checkResources(ctx);
  assert.ok(ctx.reporter.errors.some((e) => e.includes('minecraft:loot "loot_tables/a/b/empty.json" does not exist')));
});

test("references inside permutations are checked too", () => {
  const ctx = fixture("perm", { culling: true, loot: true, permutationCulling: "ns:culling.missing" });
  checkResources(ctx);
  assert.ok(ctx.reporter.errors.some((e) => e.includes('"ns:culling.missing"')));
});

test("two culling rules on the same geometry part are an error; bone and face parts are distinct", () => {
  const ctx = fixture("dup-rule", { culling: true, loot: true });
  const rule = (direction: string, geometry_part: Record<string, unknown>) => ({ direction, condition: "same_block", geometry_part });
  write(path.join(ctx.rpDir, "block_culling", "glass.json"), {
    format_version: "1.21.80",
    "minecraft:block_culling_rules": {
      description: { identifier: "ns:culling.glass" },
      rules: [rule("up", { bone: "edge" }), rule("north", { bone: "edge", cube: 0, face: "up" }), rule("north", { bone: "edge" })],
    },
  });
  checkResources(ctx);
  assert.equal(ctx.reporter.errors.length, 1);
  assert.match(ctx.reporter.errors[0]!, /rules\[2\] culls the same geometry part as rules\[0\]/);
});

test("boolean bone_visibility in minecraft:item_visual is an error", () => {
  const ctx = fixture("item-visual", { culling: true, loot: true });
  const file = path.join(ctx.bpDir, "blocks", "glass.json");
  write(file, {
    format_version: "1.26.50",
    "minecraft:block": {
      description: { identifier: "ns:glass" },
      components: {
        "minecraft:loot": "loot_tables/a/b/empty.json",
        "minecraft:item_visual": { geometry: { identifier: "geometry.ns.glass", bone_visibility: { a: true, b: "1.0" } } },
      },
    },
  });
  checkResources(ctx);
  assert.equal(ctx.reporter.errors.length, 1);
  assert.match(ctx.reporter.errors[0]!, /bone_visibility\.a must be a Molang string/);
});

test("un-namespaced material textures are vanilla atlas keys and are not required in the pack", () => {
  const ctx = fixture("vanilla-key", { culling: true, loot: true });
  write(path.join(ctx.bpDir, "blocks", "glass.json"), {
    format_version: "1.26.50",
    "minecraft:block": {
      description: { identifier: "ns:glass" },
      components: {
        "minecraft:loot": "loot_tables/a/b/empty.json",
        "minecraft:material_instances": { "*": { texture: "glass" }, frame: { texture: "ns:missing" } },
      },
    },
  });
  checkResources(ctx);
  assert.equal(ctx.reporter.errors.length, 1);
  assert.match(ctx.reporter.errors[0]!, /"ns:missing" is not a key/);
});
