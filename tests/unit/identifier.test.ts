import assert from "node:assert/strict";
import { test } from "node:test";
import { id, isOwnIdentifier } from "../../scripts/shared/utils/identifier.ts";
import { NAMESPACE } from "../../scripts/shared/constants/addon.ts";

test("id() prefixes the configured namespace", () => {
  assert.equal(id("ruby_sword"), `${NAMESPACE}:ruby_sword`);
});

test("isOwnIdentifier() distinguishes own and vanilla identifiers", () => {
  assert.equal(isOwnIdentifier(id("ruby_sword")), true);
  assert.equal(isOwnIdentifier("minecraft:diamond_sword"), false);
});
