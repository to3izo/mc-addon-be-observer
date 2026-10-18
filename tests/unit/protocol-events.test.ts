/**
 * U-EVT-01..06 and U-PROTO-16 (docs/TESTING.md): event lines, the recent-event buffer, the rate limit, the `events`
 * and `subscribe` parameters, the opt-in switch and the event filters. Pure logic; no Minecraft runtime.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { ObserverError } from "../../scripts/shared/protocol/errors.ts";
import {
  ALL_EVENT_KINDS,
  EVENT_KINDS,
  EVENT_LIMITS,
  EVENT_PREFIX,
  EventBuffer,
  EventRateLimiter,
  EventSwitch,
  IGNORED_SPAWN_CAUSES,
  OPTIONAL_EVENT_KINDS,
  blockBounds,
  formatEventLine,
  fullDimensionId,
  isNearAny,
  type EventKind,
  type EventRecord,
} from "../../scripts/shared/protocol/events.ts";
import { parseEventQuery, parseSubscribeQuery } from "../../scripts/shared/protocol/options.ts";

const code = (fn: () => unknown) => {
  try {
    fn();
  } catch (error) {
    return error instanceof ObserverError ? error.code : String(error);
  }
  return "no error";
};

function ev(seq: number, kind: EventKind = "player_join", dropped?: number): EventRecord {
  return dropped ? { kind, seq, tick: seq * 10, time: 0, data: { seq }, dropped } : { kind, seq, tick: seq * 10, time: 0, data: { seq } };
}

test("U-EVT-01 an event line has the prefix, the envelope fields and pure ASCII", () => {
  const line = formatEventLine({ kind: "entity_die", seq: 3, tick: 99, time: 1, data: { entity: { name: "テスト" } } }, "abc");
  assert.ok(line.startsWith(EVENT_PREFIX));
  assert.equal(/[^\x20-\x7e]/.test(line), false);
  const body = JSON.parse(line.slice(EVENT_PREFIX.length));
  assert.deepEqual(body, { protocol: 1, session: "abc", kind: "entity_die", seq: 3, tick: 99, time: 1, data: { entity: { name: "テスト" } } });
  const withDrops = JSON.parse(formatEventLine(ev(4, "player_leave", 2), "abc").slice(EVENT_PREFIX.length));
  assert.equal(withDrops.dropped, 2);
  assert.equal(EVENT_PREFIX, "to3izo_bo.event ");
});

test("U-EVT-02 the buffer keeps the newest events and reports what was missed", () => {
  const buffer = new EventBuffer(3);
  assert.deepEqual(buffer.range(), { oldestSeq: 0, latestSeq: 0 });
  assert.deepEqual(buffer.since(0, 10), { events: [], missed: false, more: false });
  for (let seq = 1; seq <= 5; seq++) buffer.push(ev(seq, seq % 2 ? "player_join" : "entity_die"));
  assert.deepEqual(buffer.range(), { oldestSeq: 3, latestSeq: 5 });
  // 1 and 2 were pushed out: asking from 0 says "missed".
  const all = buffer.since(0, 10);
  assert.deepEqual(all.events.map((e) => e.seq), [3, 4, 5]);
  assert.equal(all.missed, true);
  // Asking from 2 misses nothing.
  assert.equal(buffer.since(2, 10).missed, false);
  // Limit and "more".
  const first = buffer.since(2, 2);
  assert.deepEqual(first.events.map((e) => e.seq), [3, 4]);
  assert.equal(first.more, true);
  // Kind filter.
  assert.deepEqual(buffer.since(2, 10, ["entity_die"]).events.map((e) => e.seq), [4]);
  // Nothing new.
  assert.deepEqual(buffer.since(5, 10).events, []);
});

test("U-EVT-02 events dropped by the rate limit count as missed", () => {
  const buffer = new EventBuffer(5);
  buffer.push(ev(1));
  buffer.push(ev(2, "player_join", 3));
  assert.equal(buffer.since(0, 10).missed, true);
  assert.equal(buffer.since(2, 10).missed, false);
});

test("U-EVT-03 the rate limit allows max per window and counts the rest", () => {
  const limiter = new EventRateLimiter(2, 20);
  assert.equal(limiter.allow(100), true);
  assert.equal(limiter.allow(105), true);
  assert.equal(limiter.allow(110), false);
  assert.equal(limiter.allow(119), false);
  assert.equal(limiter.takeDropped(), 2);
  assert.equal(limiter.takeDropped(), 0);
  assert.equal(limiter.allow(120), true);
});

test("U-EVT-04 events parameters: since, limit, kinds", () => {
  assert.deepEqual(parseEventQuery({}), { since: 0, limit: 32, kinds: undefined });
  assert.deepEqual(parseEventQuery({ since: 7, limit: EVENT_LIMITS.maxEventsPerRequest, kinds: ["entity_die"] }), {
    since: 7,
    limit: EVENT_LIMITS.maxEventsPerRequest,
    kinds: ["entity_die"],
  });
  assert.equal(code(() => parseEventQuery({ since: -1 })), "INVALID_PARAMS");
  assert.equal(code(() => parseEventQuery({ since: 1.5 })), "INVALID_PARAMS");
  assert.equal(code(() => parseEventQuery({ limit: EVENT_LIMITS.maxEventsPerRequest + 1 })), "LIMIT_EXCEEDED");
  assert.equal(code(() => parseEventQuery({ kinds: ["chat"] })), "INVALID_PARAMS");
  assert.deepEqual([...EVENT_KINDS], ["player_join", "player_leave", "player_spawn", "entity_die", "dimension_change", "game_mode_change", "game_rule_change"]);
});

test("U-EVT-05 the opt-in switch: off by default, changed kinds reported, canonical order", () => {
  assert.deepEqual([...OPTIONAL_EVENT_KINDS], [
    "block_break",
    "block_place",
    "entity_hurt",
    "effect_add",
    "item_use",
    "explosion",
    "weather_change",
    "entity_spawn",
  ]);
  // No kind is both always-on and opt-in.
  assert.equal(new Set(ALL_EVENT_KINDS).size, EVENT_KINDS.length + OPTIONAL_EVENT_KINDS.length);
  const sw = new EventSwitch();
  assert.deepEqual(sw.enabled(), []);
  assert.equal(sw.isOn("block_break"), false);
  assert.deepEqual(sw.apply(["entity_spawn", "block_break"], []), ["block_break", "entity_spawn"]);
  assert.deepEqual(sw.enabled(), ["block_break", "entity_spawn"]);
  // Enabling again changes nothing; disabling one that is off changes nothing.
  assert.deepEqual(sw.apply(["block_break"], ["item_use"]), []);
  assert.deepEqual(sw.apply(["explosion"], ["block_break"]), ["block_break", "explosion"]);
  assert.deepEqual(sw.enabled(), ["explosion", "entity_spawn"]);
  assert.equal(sw.isOn("explosion"), true);
  assert.deepEqual(sw.apply([], [...OPTIONAL_EVENT_KINDS]), ["explosion", "entity_spawn"]);
  assert.deepEqual(sw.enabled(), []);
  // `events` can filter by opt-in kinds too.
  assert.deepEqual(parseEventQuery({ kinds: ["entity_hurt", "player_join"] }).kinds, ["entity_hurt", "player_join"]);
});

test("U-EVT-06 event filters: near a player, ignored spawn causes, explosion bounds, full dimension ids", () => {
  assert.equal(fullDimensionId("overworld"), "minecraft:overworld");
  assert.equal(fullDimensionId("minecraft:the_end"), "minecraft:the_end");
  const players = [{ x: 0, y: -60, z: 0 }, { x: 100, y: 64, z: 100 }];
  assert.equal(isNearAny({ x: 32, y: -60, z: 0 }, players, 32), true);
  assert.equal(isNearAny({ x: 20, y: -40, z: 20 }, players, 32), false);
  assert.equal(isNearAny({ x: 90, y: 64, z: 95 }, players, 32), true);
  assert.equal(isNearAny({ x: 0, y: 0, z: 0 }, [], 32), false);
  assert.deepEqual([...IGNORED_SPAWN_CAUSES], ["Loaded"]);
  assert.equal(blockBounds([]), undefined);
  assert.deepEqual(blockBounds([{ x: 1, y: -61, z: 3 }, { x: -2, y: -60, z: 5 }, { x: 0, y: -63, z: 4 }]), {
    min: { x: -2, y: -63, z: 3 },
    max: { x: 1, y: -60, z: 5 },
  });
});

test("U-PROTO-16 subscribe parameters: opt-in kinds only, no overlap", () => {
  assert.deepEqual(parseSubscribeQuery({}), { enable: [], disable: [] });
  assert.deepEqual(parseSubscribeQuery({ enable: ["block_break", "block_break", "entity_hurt"], disable: ["explosion"] }), {
    enable: ["block_break", "entity_hurt"],
    disable: ["explosion"],
  });
  assert.equal(code(() => parseSubscribeQuery({ enable: ["player_join"] })), "INVALID_PARAMS");
  assert.equal(code(() => parseSubscribeQuery({ disable: ["chat"] })), "INVALID_PARAMS");
  assert.equal(code(() => parseSubscribeQuery({ enable: "block_break" })), "INVALID_PARAMS");
  assert.equal(code(() => parseSubscribeQuery({ enable: [1] })), "INVALID_PARAMS");
  assert.equal(code(() => parseSubscribeQuery({ enable: ["item_use"], disable: ["item_use"] })), "INVALID_PARAMS");
  try {
    parseSubscribeQuery({ enable: ["entity_die"] });
  } catch (error) {
    assert.ok(error instanceof ObserverError);
    assert.match(error.message, /always on/);
    assert.deepEqual(error.details, { param: "enable" });
  }
});
