/**
 * U-PROTO-05..07 (docs/TESTING.md): parameter validators. Pure logic; no Minecraft runtime.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { ObserverError } from "../../scripts/shared/protocol/errors.ts";
import {
  MAX_HORIZONTAL_COORDINATE,
  expectOnlyKeys,
  parseBlockPosition,
  parsePlayerSelector,
  readLimitedNumber,
} from "../../scripts/shared/protocol/params.ts";

function throwsCode(fn: () => unknown, code: string, param?: string) {
  assert.throws(fn, (error: unknown) => {
    assert.ok(error instanceof ObserverError);
    assert.equal(error.code, code);
    if (param !== undefined) assert.equal(error.details?.param, param);
    return true;
  });
}

test("U-PROTO-05 unknown parameter names are INVALID_PARAMS", () => {
  expectOnlyKeys({ radius: 1 }, ["radius", "limit"]);
  throwsCode(() => expectOnlyKeys({ raduis: 1 }, ["radius"]), "INVALID_PARAMS", "raduis");
  throwsCode(() => expectOnlyKeys({ anything: true }, []), "INVALID_PARAMS", "anything");
});

test("U-PROTO-06 block coordinates: negative integers are accepted", () => {
  assert.deepEqual(parseBlockPosition({ x: -1, y: -64, z: -30_000_000 }, "position"), { x: -1, y: -64, z: -30_000_000 });
  assert.deepEqual(parseBlockPosition({ z: 3, x: 0, y: 400 }, "position"), { x: 0, y: 400, z: 3 });
});

test("U-PROTO-06 block coordinates: non-integers, strings, non-finite and out-of-range are INVALID_PARAMS", () => {
  throwsCode(() => parseBlockPosition({ x: 1.5, y: 0, z: 0 }, "position"), "INVALID_PARAMS", "position.x");
  throwsCode(() => parseBlockPosition({ x: "1", y: 0, z: 0 }, "position"), "INVALID_PARAMS", "position.x");
  throwsCode(() => parseBlockPosition({ x: 0, y: JSON.parse("1e999"), z: 0 }, "position"), "INVALID_PARAMS", "position.y");
  throwsCode(() => parseBlockPosition({ x: 0, y: 0, z: MAX_HORIZONTAL_COORDINATE + 1 }, "position"), "INVALID_PARAMS", "position.z");
  throwsCode(() => parseBlockPosition({ x: 0, y: 0 }, "position"), "INVALID_PARAMS", "position");
  throwsCode(() => parseBlockPosition({ x: 0, y: 0, z: 0, w: 0 }, "position"), "INVALID_PARAMS", "position");
  throwsCode(() => parseBlockPosition([0, 0, 0], "position"), "INVALID_PARAMS", "position");
});

test("U-PROTO-06 limited numbers: default, bounds, LIMIT_EXCEEDED above the published limit", () => {
  const rule = { min: 1, max: 32, integer: true };
  assert.equal(readLimitedNumber({}, "radius", rule, 8), 8);
  assert.equal(readLimitedNumber({ radius: 32 }, "radius", rule, 8), 32);
  throwsCode(() => readLimitedNumber({ radius: 33 }, "radius", rule, 8), "LIMIT_EXCEEDED", "radius");
  throwsCode(() => readLimitedNumber({ radius: 0 }, "radius", rule, 8), "INVALID_PARAMS", "radius");
  throwsCode(() => readLimitedNumber({ radius: 2.5 }, "radius", rule, 8), "INVALID_PARAMS", "radius");
  throwsCode(() => readLimitedNumber({ radius: "8" }, "radius", rule, 8), "INVALID_PARAMS", "radius");
  throwsCode(() => readLimitedNumber({ radius: JSON.parse("1e999") }, "radius", rule, 8), "INVALID_PARAMS", "radius");
  const error = (() => {
    try {
      readLimitedNumber({ radius: 99 }, "radius", rule, 8);
    } catch (e) {
      return e;
    }
  })();
  assert.ok(error instanceof ObserverError);
  assert.deepEqual(error.toBody().details, { param: "radius", limit: 32 });
});

test("U-PROTO-07 player selector: omitted, name with spaces and Japanese, id", () => {
  assert.deepEqual(parsePlayerSelector(undefined), { kind: "source" });
  assert.deepEqual(parsePlayerSelector({ name: "Steve Two" }), { kind: "name", name: "Steve Two" });
  assert.deepEqual(parsePlayerSelector({ name: "テスト プレイヤー" }), { kind: "name", name: "テスト プレイヤー" });
  assert.deepEqual(parsePlayerSelector({ id: "-4294967295" }), { kind: "id", id: "-4294967295" });
});

test("U-PROTO-07 player selector: both, neither, wrong types are INVALID_PARAMS", () => {
  throwsCode(() => parsePlayerSelector({ name: "a", id: "1" }), "INVALID_PARAMS", "player");
  throwsCode(() => parsePlayerSelector({}), "INVALID_PARAMS", "player");
  throwsCode(() => parsePlayerSelector({ nick: "a" }), "INVALID_PARAMS", "player");
  throwsCode(() => parsePlayerSelector({ name: "" }), "INVALID_PARAMS", "player.name");
  throwsCode(() => parsePlayerSelector({ id: 5 }), "INVALID_PARAMS", "player.id");
  throwsCode(() => parsePlayerSelector({ name: "x".repeat(65) }), "INVALID_PARAMS", "player.name");
  throwsCode(() => parsePlayerSelector("Steve"), "INVALID_PARAMS", "player");
});
