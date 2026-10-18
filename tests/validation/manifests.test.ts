/**
 * Runs the manifest checks against small fixture packs so that the rules in
 * tools/checks/manifests.ts are themselves tested.
 */
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import { checkManifests } from "../../tools/checks/manifests.ts";
import type { CheckContext } from "../../tools/checks/context.ts";
import { Reporter } from "../../tools/lib/log.ts";
import { formatJson } from "../../tools/lib/json.ts";
import { loadConfig } from "../../tools/lib/config.ts";
import { readManifest } from "../../tools/lib/manifest.ts";
import { PATHS } from "../../tools/lib/paths.ts";

let root: string;

before(() => {
  root = mkdtempSync(path.join(tmpdir(), "addon-fixture-"));
});
after(() => {
  rmSync(root, { recursive: true, force: true });
});

/** Writes a BP/RP pair derived from the repository's own manifests, with `mutate` applied. */
function fixture(name: string, mutate: (bp: any, rp: any) => void): CheckContext {
  const bp = structuredClone(readManifest(PATHS.behaviorPack));
  const rp = structuredClone(readManifest(PATHS.resourcePack));
  mutate(bp, rp);
  const bpDir = path.join(root, name, "BP");
  const rpDir = path.join(root, name, "RP");
  mkdirSync(bpDir, { recursive: true });
  mkdirSync(rpDir, { recursive: true });
  writeFileSync(path.join(bpDir, "manifest.json"), formatJson(bp));
  writeFileSync(path.join(rpDir, "manifest.json"), formatJson(rp));
  writeFileSync(path.join(bpDir, "pack_icon.png"), "");
  writeFileSync(path.join(rpDir, "pack_icon.png"), "");
  return { reporter: new Reporter(), config: loadConfig(), bpDir, rpDir, mode: "source", strict: false };
}

test("the repository's own manifests pass (placeholders are warnings, not errors)", () => {
  const ctx = fixture("baseline", () => {});
  checkManifests(ctx);
  assert.deepEqual(ctx.reporter.errors, []);
});

test("strict mode rejects template placeholder UUIDs", () => {
  // Inject placeholders explicitly: the repository's own manifests no longer have them after init:addon.
  const ctx = fixture("strict", (bp, rp) => {
    rp.header.uuid = "00000000-0000-4000-8000-000000000003";
    bp.dependencies[0].uuid = rp.header.uuid;
  });
  ctx.strict = true;
  checkManifests(ctx);
  assert.ok(ctx.reporter.errors.some((e) => e.includes("placeholder")));
});

test("duplicate UUIDs across packs are an error", () => {
  const ctx = fixture("dup", (bp, rp) => {
    rp.header.uuid = bp.header.uuid;
  });
  checkManifests(ctx);
  assert.ok(ctx.reporter.errors.some((e) => e.includes("must be unique")));
});

test("BP -> RP dependency must point at the RP header UUID with the same version", () => {
  const ctx = fixture("dep", (bp) => {
    bp.dependencies[0].uuid = "11111111-1111-4111-8111-111111111111";
  });
  checkManifests(ctx);
  assert.ok(ctx.reporter.errors.some((e) => e.includes("does not match the resource pack header UUID")));
});

test("RP -> BP dependency must point at the BP header UUID with the same version", () => {
  const ctx = fixture("rpdep", (_bp, rp) => {
    rp.dependencies[0].version = [9, 9, 9];
  });
  checkManifests(ctx);
  assert.ok(ctx.reporter.errors.some((e) => e.includes("dependency on the behavior pack declares version 9.9.9")));
});

test("missing RP -> BP dependency and pack_scope are warnings, and errors in strict mode", () => {
  const mutate = (_bp: any, rp: any) => {
    delete rp.dependencies;
    delete rp.header.pack_scope;
  };
  const loose = fixture("scope", mutate);
  checkManifests(loose);
  assert.deepEqual(loose.reporter.errors, []);
  assert.ok(loose.reporter.warnings.some((w) => w.includes("no pack dependency on the behavior pack")));
  assert.ok(loose.reporter.warnings.some((w) => w.includes("pack_scope")));

  const strict = fixture("scope-strict", mutate);
  strict.strict = true;
  checkManifests(strict);
  assert.ok(strict.reporter.errors.some((e) => e.includes("no pack dependency on the behavior pack")));
  assert.ok(strict.reporter.errors.some((e) => e.includes("pack_scope")));
});

test("script module must use entry scripts/main.js and declare @minecraft/server", () => {
  const ctx = fixture("script", (bp) => {
    bp.modules[1].entry = "main.js";
    bp.dependencies = bp.dependencies.filter((d: any) => !d.module_name);
  });
  checkManifests(ctx);
  assert.ok(ctx.reporter.errors.some((e) => e.includes('"entry" must be "scripts/main.js"')));
  assert.ok(ctx.reporter.errors.some((e) => e.includes("@minecraft/server")));
});

test("format_version other than 2 is rejected", () => {
  const ctx = fixture("fmt", (bp) => {
    bp.format_version = 3;
  });
  checkManifests(ctx);
  assert.ok(ctx.reporter.errors.some((e) => e.includes("format_version must be 2")));
});
