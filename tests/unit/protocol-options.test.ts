/**
 * U-PROTO-11..13 (docs/TESTING.md): Phase 2 parameters — dimensions, locations, booleans, name lists,
 * block position lists, and the option groups of target / entities / snapshot. Pure logic only.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { PARAM_DEFAULTS, PARAM_LIMITS } from "../../scripts/shared/protocol/constants.ts";
import { ObserverError } from "../../scripts/shared/protocol/errors.ts";
import {
  ENTITY_OPTION_KEYS,
  SNAPSHOT_DEFAULT_SECTIONS,
  SNAPSHOT_SECTIONS,
  TARGET_OPTION_KEYS,
  optionGroup,
  parseEntityFilter,
  parseEntityOptions,
  parseScoreboardQuery,
  parseTargetOptions,
} from "../../scripts/shared/protocol/options.ts";
import {
  parseBlockPosition,
  parseColumn,
  parseDimension,
  parseLocation,
  readBlockPositions,
  readBoolean,
  readColumns,
  readNameList,
  readOptions,
} from "../../scripts/shared/protocol/params.ts";

function throwsCode(fn: () => unknown, code: string, param?: string) {
  assert.throws(fn, (error: unknown) => {
    assert.ok(error instanceof ObserverError, String(error));
    assert.equal(error.code, code);
    if (param !== undefined) assert.equal(error.details?.param, param);
    return true;
  });
}

test("U-PROTO-11 dimensions: full ids only; unknown is DIMENSION_NOT_FOUND", () => {
  assert.equal(parseDimension(undefined), undefined);
  assert.equal(parseDimension("minecraft:nether"), "minecraft:nether");
  throwsCode(() => parseDimension("nether"), "DIMENSION_NOT_FOUND", "dimension");
  throwsCode(() => parseDimension("minecraft:moon"), "DIMENSION_NOT_FOUND", "dimension");
  throwsCode(() => parseDimension(0), "INVALID_PARAMS", "dimension");
});

test("U-PROTO-11 locations accept finite decimals; block positions with an empty prefix name the axis", () => {
  assert.deepEqual(parseLocation({ x: 1.5, y: -60.25, z: 0 }, "center"), { x: 1.5, y: -60.25, z: 0 });
  throwsCode(() => parseLocation({ x: "1", y: 0, z: 0 }, "center"), "INVALID_PARAMS", "center.x");
  throwsCode(() => parseLocation({ x: 0, y: 0 }, "center"), "INVALID_PARAMS", "center");
  throwsCode(() => parseBlockPosition({ x: 1, y: undefined, z: 2 }, ""), "INVALID_PARAMS", "y");
  assert.deepEqual(parseBlockPosition({ x: -1, y: 4, z: -1 }, ""), { x: -1, y: 4, z: -1 });
});

test("U-PROTO-11 booleans, option groups and name lists", () => {
  assert.equal(readBoolean({}, "a", true), true);
  assert.equal(readBoolean({ a: false }, "a", true), false);
  throwsCode(() => readBoolean({ a: "true" }, "a", false), "INVALID_PARAMS", "a");
  assert.deepEqual(readOptions({}, "target"), {});
  throwsCode(() => readOptions({ target: 3 }, "target"), "INVALID_PARAMS", "target");
  assert.deepEqual(readNameList({ include: ["target", "player", "target"] }, "include", SNAPSHOT_SECTIONS, []), ["target", "player"]);
  assert.deepEqual(readNameList({}, "include", SNAPSHOT_SECTIONS, SNAPSHOT_DEFAULT_SECTIONS), ["player", "target"]);
  throwsCode(() => readNameList({ include: ["camera"] }, "include", SNAPSHOT_SECTIONS, []), "INVALID_PARAMS", "include");
  throwsCode(() => readNameList({ include: "player" }, "include", SNAPSHOT_SECTIONS, []), "INVALID_PARAMS", "include");
});

test("U-PROTO-12 block position lists: non-empty, at most maxBlocksPerRequest", () => {
  const max = PARAM_LIMITS.maxBlocksPerRequest;
  const positions = Array.from({ length: max }, (_, i) => ({ x: i, y: 0, z: -i }));
  assert.equal(readBlockPositions({ positions }, "positions", max).length, max);
  throwsCode(() => readBlockPositions({ positions: [...positions, { x: 0, y: 0, z: 0 }] }, "positions", max), "LIMIT_EXCEEDED", "positions");
  throwsCode(() => readBlockPositions({ positions: [] }, "positions", max), "INVALID_PARAMS", "positions");
  throwsCode(() => readBlockPositions({ positions: [{ x: 0.5, y: 0, z: 0 }] }, "positions", max), "INVALID_PARAMS", "positions[0].x");
});

test("U-PROTO-13 target options: defaults and limits", () => {
  assert.deepEqual(parseTargetOptions({}), { maxDistance: PARAM_DEFAULTS.rayDistance, includeLiquids: false, includePassable: false, includeEntities: false });
  assert.equal(parseTargetOptions({ maxDistance: PARAM_LIMITS.maxRayDistance }).maxDistance, PARAM_LIMITS.maxRayDistance);
  throwsCode(() => parseTargetOptions({ maxDistance: PARAM_LIMITS.maxRayDistance + 1 }), "LIMIT_EXCEEDED", "maxDistance");
  throwsCode(() => parseTargetOptions({ maxDistance: 0 }), "INVALID_PARAMS", "maxDistance");
});

test("U-PROTO-13 entity options: defaults, integer limit, centre and dimension", () => {
  const defaults = parseEntityOptions({});
  assert.deepEqual(defaults, { radius: PARAM_DEFAULTS.entityRadius, limit: PARAM_DEFAULTS.entityLimit, excludePlayers: false, includeEffects: false, filter: {}, center: undefined, dimension: undefined });
  throwsCode(() => parseEntityOptions({ limit: 2.5 }), "INVALID_PARAMS", "limit");
  throwsCode(() => parseEntityOptions({ limit: PARAM_LIMITS.maxEntities + 1 }), "LIMIT_EXCEEDED", "limit");
  throwsCode(() => parseEntityOptions({ radius: PARAM_LIMITS.maxEntityRadius + 0.5 }), "LIMIT_EXCEEDED", "radius");
  const centred = parseEntityOptions({ center: { x: 0.5, y: -60, z: 0.5 }, dimension: "minecraft:overworld" });
  assert.deepEqual(centred.center, { x: 0.5, y: -60, z: 0.5 });
  assert.equal(centred.dimension, "minecraft:overworld");
});

test("U-PROTO-13 snapshot option groups reject keys that belong elsewhere", () => {
  assert.deepEqual(optionGroup({ maxDistance: 5 }, TARGET_OPTION_KEYS, "target"), { maxDistance: 5 });
  assert.throws(
    () => optionGroup({ center: { x: 0, y: 0, z: 0 } }, ENTITY_OPTION_KEYS, "entities"),
    (error: unknown) => error instanceof ObserverError && error.code === "INVALID_PARAMS" && error.message.startsWith("entities: "),
  );
});

test("U-PROTO-14 entity filters: only given keys are kept; wrong shapes are INVALID_PARAMS", () => {
  assert.deepEqual(parseEntityFilter({}), {});
  assert.deepEqual(parseEntityFilter({ type: "minecraft:zombie", families: ["monster"], tags: ["boss"], name: "\u30dc\u30b9" }), {
    type: "minecraft:zombie",
    families: ["monster"],
    tags: ["boss"],
    name: "\u30dc\u30b9",
  });
  assert.deepEqual(parseEntityFilter({ excludeTypes: ["minecraft:item"], excludeFamilies: ["inanimate"] }), {
    excludeTypes: ["minecraft:item"],
    excludeFamilies: ["inanimate"],
  });
  throwsCode(() => parseEntityFilter({ type: "" }), "INVALID_PARAMS", "type");
  throwsCode(() => parseEntityFilter({ type: ["minecraft:zombie"] }), "INVALID_PARAMS", "type");
  throwsCode(() => parseEntityFilter({ families: [] }), "INVALID_PARAMS", "families");
  throwsCode(() => parseEntityFilter({ tags: ["ok", 3] }), "INVALID_PARAMS", "tags[1]");
  throwsCode(() => parseEntityFilter({ excludeTypes: Array.from({ length: 17 }, (_, i) => `t${i}`) }), "INVALID_PARAMS", "excludeTypes");
  const options = parseEntityOptions({ includeEffects: true, type: "minecraft:villager_v2" });
  assert.equal(options.includeEffects, true);
  assert.deepEqual(options.filter, { type: "minecraft:villager_v2" });
  for (const key of ["type", "excludeTypes", "families", "excludeFamilies", "name", "tags", "includeEffects"]) {
    assert.ok((ENTITY_OPTION_KEYS as readonly string[]).includes(key), key);
  }
  assert.ok(SNAPSHOT_SECTIONS.includes("effects"));
});

test("U-PROTO-14 columns: integer x/z only; list length is limited", () => {
  assert.deepEqual(parseColumn({ x: -5, z: 12 }, ""), { x: -5, z: 12 });
  throwsCode(() => parseColumn({ x: 1 }, ""), "INVALID_PARAMS");
  throwsCode(() => parseColumn({ x: 1, z: 2, y: 3 }, "c"), "INVALID_PARAMS", "c");
  throwsCode(() => parseColumn({ x: 1.5, z: 2 }, ""), "INVALID_PARAMS", "x");
  throwsCode(() => parseColumn({ x: 1, z: "2" }, "columns[0]"), "INVALID_PARAMS", "columns[0].z");
  assert.deepEqual(readColumns({ columns: [{ x: 0, z: 0 }, { x: 1, z: -1 }] }, "columns", 32), [
    { x: 0, z: 0 },
    { x: 1, z: -1 },
  ]);
  throwsCode(() => readColumns({}, "columns", 32), "INVALID_PARAMS", "columns");
  throwsCode(() => readColumns({ columns: [] }, "columns", 32), "INVALID_PARAMS", "columns");
  const tooMany = Array.from({ length: PARAM_LIMITS.maxBlocksPerRequest + 1 }, (_, i) => ({ x: i, z: 0 }));
  throwsCode(() => readColumns({ columns: tooMany }, "columns", PARAM_LIMITS.maxBlocksPerRequest), "LIMIT_EXCEEDED", "columns");
});

test("U-PROTO-14 scoreboard query: objective is optional, limit has a default and a ceiling", () => {
  assert.deepEqual(parseScoreboardQuery({}), { objective: undefined, limit: PARAM_DEFAULTS.scoreLimit });
  assert.deepEqual(parseScoreboardQuery({ objective: "kills", limit: 5 }), { objective: "kills", limit: 5 });
  throwsCode(() => parseScoreboardQuery({ objective: 3 }), "INVALID_PARAMS", "objective");
  throwsCode(() => parseScoreboardQuery({ limit: 0 }), "INVALID_PARAMS", "limit");
  throwsCode(() => parseScoreboardQuery({ limit: PARAM_LIMITS.maxScoreEntries + 1 }), "LIMIT_EXCEEDED", "limit");
});
