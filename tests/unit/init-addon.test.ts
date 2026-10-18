import assert from "node:assert/strict";
import { test } from "node:test";
import { namespaceFromSlug, parseArgs, renderReadmeBlock, rewriteLaunchSlug, slugFromName } from "../../tools/init-addon.ts";
import { validateConfigShape } from "../../tools/lib/config.ts";
import { isPlaceholderUuid } from "../../tools/lib/manifest.ts";
import { formatJson } from "../../tools/lib/json.ts";

test("slugFromName() produces a lowercase hyphenated slug", () => {
  assert.equal(slugFromName("Ruby Tools"), "ruby-tools");
  assert.equal(slugFromName("  My Add-On! v2 "), "my-add-on-v2");
});

test("namespaceFromSlug() produces a valid namespace", () => {
  assert.equal(namespaceFromSlug("ruby-tools"), "ruby_tools");
  assert.equal(namespaceFromSlug("123-abc"), "abc");
});

test("parseArgs() reads flags in both --flag value and --flag=value forms", () => {
  const args = parseArgs(["--name", "Ruby Tools", "--slug=ruby-tools", "--yes", "--dry-run"]);
  assert.deepEqual(args.values, { name: "Ruby Tools", slug: "ruby-tools" });
  assert.equal(args.yes, true);
  assert.equal(args.dryRun, true);
  assert.throws(() => parseArgs(["--bogus"]), /unknown argument/);
});

test("rewriteLaunchSlug() retargets every dist/<slug>_BP path", () => {
  const text = '"sourceMapRoot": "${workspaceFolder}/dist/addon-template_BP/scripts/",\n"generatedSourceRoot": "${workspaceFolder}/dist/addon-template_BP/scripts/"';
  const next = rewriteLaunchSlug(text, "ruby-tools");
  assert.equal(next.match(/dist\/ruby-tools_BP\/scripts\//g)?.length, 2);
  assert.equal(next.includes("addon-template"), false);
  assert.equal(rewriteLaunchSlug(next, "ruby-tools"), next);
});

test("placeholder UUIDs are recognised, real ones are not", () => {
  assert.equal(isPlaceholderUuid("00000000-0000-4000-8000-000000000001"), true);
  assert.equal(isPlaceholderUuid("2f70b37c-1529-4d23-83ea-38d84d9f8e65"), false);
});

test("formatJson() keeps version arrays on one line", () => {
  assert.match(formatJson({ version: [1, 26, 50] }), /"version": \[1, 26, 50\]/);
});

test("renderReadmeBlock() uses descriptionJa only for the Japanese README", () => {
  const base = { name: "Ruby Tools", slug: "ruby-tools", namespace: "ruby_tools", description: "Adds rubies.", minEngineVersion: "1.26.50", author: "" };
  const cfg = validateConfigShape({ ...base, descriptionJa: "ルビーを追加します。" });
  assert.match(renderReadmeBlock(cfg, "en"), /\| Adds rubies\. \|/);
  assert.match(renderReadmeBlock(cfg, "ja"), /\| ルビーを追加します。 \|/);
  assert.match(renderReadmeBlock(validateConfigShape(base), "ja"), /\| Adds rubies\. \|/);
});
