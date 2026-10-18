/**
 * The versions that `capabilities` reports are constants in scripts/shared/constants/version.ts (the script
 * cannot read package.json or the manifest at runtime). This test fails when they drift.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { ADDON_VERSION, SCRIPT_API_MODULES } from "../../scripts/shared/constants/version.ts";
import { readJson } from "../../tools/lib/json.ts";
import { readManifest } from "../../tools/lib/manifest.ts";
import { PATHS } from "../../tools/lib/paths.ts";

test("ADDON_VERSION equals package.json version", () => {
  const { version } = readJson<{ version: string }>(PATHS.packageJson);
  assert.equal(ADDON_VERSION, version, "update scripts/shared/constants/version.ts after pnpm version:set");
});

test("SCRIPT_API_MODULES equals the manifest's script module dependencies", () => {
  const declared: Record<string, string> = {};
  for (const dep of readManifest(PATHS.behaviorPack).dependencies ?? []) {
    if (typeof dep.module_name === "string" && typeof dep.version === "string") declared[dep.module_name] = dep.version;
  }
  assert.deepEqual({ ...SCRIPT_API_MODULES }, declared);
});
