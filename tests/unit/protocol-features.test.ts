/**
 * U-PROTO-18..20 (docs/TESTING.md): opt-in features (ADR-0015): the `features` parameters, who may turn a feature
 * on, the switch, `capabilities.optionalFeatures`, and the size of a `container` answer. Pure logic; the real
 * handlers are verified in game (OBS-CON-*).
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildCapabilities } from "../../scripts/shared/protocol/capabilities.ts";
import { RESPONSE_PREFIX, SIZE_LIMITS } from "../../scripts/shared/protocol/constants.ts";
import { ERROR_CODES, ObserverError, errorBodyOf } from "../../scripts/shared/protocol/errors.ts";
import {
  OPTIONAL_FEATURES,
  authorizeFeatureQuery,
  featureDisabled,
  isConsoleSource,
  parseContainerQuery,
  parseFeatureQuery,
} from "../../scripts/shared/protocol/features.ts";
import { METHODS } from "../../scripts/shared/protocol/methods.ts";
import { renderResponseLine, successEnvelope } from "../../scripts/shared/protocol/response.ts";
import { NameSwitch } from "../../scripts/shared/protocol/switch.ts";

function code(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (error) {
    return errorBodyOf(error)?.code;
  }
  return undefined;
}

test("U-PROTO-18 features parameters: known names only, no overlap", () => {
  assert.deepEqual([...OPTIONAL_FEATURES], ["containers"]);
  assert.deepEqual(parseFeatureQuery({}), { enable: [], disable: [] });
  assert.deepEqual(parseFeatureQuery({ enable: ["containers", "containers"] }), { enable: ["containers"], disable: [] });
  assert.deepEqual(parseFeatureQuery({ disable: ["containers"] }), { enable: [], disable: ["containers"] });
  assert.equal(code(() => parseFeatureQuery({ enable: ["chests"] })), "INVALID_PARAMS");
  assert.equal(code(() => parseFeatureQuery({ enable: "containers" })), "INVALID_PARAMS");
  assert.equal(code(() => parseFeatureQuery({ enable: ["block_break"] })), "INVALID_PARAMS");
  assert.equal(code(() => parseFeatureQuery({ enable: ["containers"], disable: ["containers"] })), "INVALID_PARAMS");
});

test("U-PROTO-19 only the BDS console may turn a feature on; anyone may turn one off", () => {
  // The console: `/scriptevent` and the custom command, with no source player.
  assert.equal(isConsoleSource("Server", false), true);
  assert.equal(isConsoleSource("command:Server", false), true);
  // Players (chat, /execute as a player), command blocks, NPC dialogue.
  assert.equal(isConsoleSource("Server", true), false);
  assert.equal(isConsoleSource("Entity", true), false);
  assert.equal(isConsoleSource("Entity", false), false);
  assert.equal(isConsoleSource("command:Entity", true), false);
  assert.equal(isConsoleSource("Block", false), false);
  assert.equal(isConsoleSource("command:Block", false), false);
  assert.equal(isConsoleSource("NPCDialogue", false), false);

  const on = { enable: ["containers" as const], disable: [] };
  const off = { enable: [], disable: ["containers" as const] };
  assert.doesNotThrow(() => authorizeFeatureQuery(on, true));
  assert.doesNotThrow(() => authorizeFeatureQuery(off, false));
  assert.doesNotThrow(() => authorizeFeatureQuery({ enable: [], disable: [] }, false));
  try {
    authorizeFeatureQuery(on, false);
    assert.fail("expected PERMISSION_DENIED");
  } catch (error) {
    assert.ok(error instanceof ObserverError);
    assert.equal(error.code, "PERMISSION_DENIED");
    assert.deepEqual(error.details, { param: "enable", required: "console" });
  }
  assert.deepEqual(featureDisabled("containers").toBody().details, { feature: "containers" });
  assert.equal(featureDisabled("containers").code, "FEATURE_DISABLED");
  // New codes are additions at the end (codes are never renamed or removed).
  assert.deepEqual(ERROR_CODES.slice(-2), ["PERMISSION_DENIED", "FEATURE_DISABLED"]);

  const sw = new NameSwitch(OPTIONAL_FEATURES);
  assert.deepEqual(sw.enabled(), []);
  assert.deepEqual(sw.apply(["containers"], []), ["containers"]);
  assert.equal(sw.isOn("containers"), true);
  assert.deepEqual(sw.apply(["containers"], []), []);
  assert.deepEqual(sw.apply([], ["containers"]), ["containers"]);
  assert.deepEqual(sw.enabled(), []);
});

test("U-PROTO-20 capabilities lists features and container, and the features that are on", () => {
  assert.deepEqual(METHODS.slice(-2), ["features", "container"]);
  const caps = buildCapabilities() as any;
  assert.deepEqual(caps.optionalFeatures, { kinds: ["containers"], enabled: [] });
  assert.deepEqual((buildCapabilities([], ["containers"]) as any).optionalFeatures.enabled, ["containers"]);
  assert.equal(caps.limits.maxInventorySlots, 54);
  assert.equal(caps.readOnly, true);
});

test("U-PROTO-20 container parameters: block coordinates, optional dimension and fromSlot", () => {
  assert.deepEqual(parseContainerQuery({ x: 1, y: -60, z: -3 }), { position: { x: 1, y: -60, z: -3 }, dimension: undefined, fromSlot: 0 });
  assert.deepEqual(parseContainerQuery({ dimension: "minecraft:nether", x: 0, y: 64, z: 0, fromSlot: 53 }), {
    position: { x: 0, y: 64, z: 0 },
    dimension: "minecraft:nether",
    fromSlot: 53,
  });
  assert.equal(code(() => parseContainerQuery({ x: 0, y: 0 })), "INVALID_PARAMS");
  assert.equal(code(() => parseContainerQuery({ x: 0.5, y: 0, z: 0 })), "INVALID_PARAMS");
  assert.equal(code(() => parseContainerQuery({ x: 0, y: 0, z: 0, fromSlot: -1 })), "INVALID_PARAMS");
  assert.equal(code(() => parseContainerQuery({ x: 0, y: 0, z: 0, fromSlot: 1.5 })), "INVALID_PARAMS");
  assert.equal(code(() => parseContainerQuery({ x: 0, y: 0, z: 0, fromSlot: 54 })), "LIMIT_EXCEEDED");
  assert.equal(code(() => parseContainerQuery({ x: 0, y: 0, z: 0, slot: 1 })), "INVALID_PARAMS");
});

/** A `container` answer for a full double chest. */
function fullChest(typeId: string, nameTag?: string): Record<string, unknown> {
  const items = Array.from({ length: 54 }, (_, slot) => ({
    slot,
    typeId,
    amount: 64,
    ...(nameTag ? { nameTag } : {}),
  }));
  return {
    dimension: "minecraft:overworld",
    position: { x: -29999984, y: -64, z: -29999984 },
    status: "ok",
    block: { typeId: "minecraft:trapped_chest" },
    container: { size: 54, emptySlots: 0, items },
  };
}

function parse(line: string): any {
  return JSON.parse(line.slice(line.indexOf(RESPONSE_PREFIX) + RESPONSE_PREFIX.length));
}

test("U-PROTO-20 a full double chest of short ids fits one line; longer ones are truncated, not refused", () => {
  const meta = { tick: 2_000_000_000, session: "abcd1234", seq: 99999, time: 1_797_590_000_000 };
  const options = { maxChars: SIZE_LIMITS.maxResponseChars, truncatable: [["container", "items"]] };
  const plain = parse(renderResponseLine(successEnvelope("request-id-0001", "container", meta, fullChest("minecraft:diamond")), options));
  assert.equal(plain.data.container.items.length, 54);
  assert.equal("truncated" in plain.data.container, false);

  // Long ids or custom names do not fit 54 slots in one line: the tool asks again with fromSlot.
  for (const data of [fullChest("minecraft:enchanted_golden_apple"), fullChest("minecraft:diamond", "N".repeat(40))]) {
    const line = renderResponseLine(successEnvelope("r", "container", meta, data), options);
    const cut = parse(line);
    assert.equal(cut.ok, true);
    assert.equal(cut.data.container.truncated, true);
    assert.ok(cut.data.container.items.length >= 27, "at least a single chest fits");
    assert.equal(cut.data.container.omitted.items, 54 - cut.data.container.items.length);
    assert.ok(line.length <= SIZE_LIMITS.maxResponseChars);
  }
});
