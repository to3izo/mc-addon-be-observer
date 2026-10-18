/**
 * U-PROTO-08..09 (docs/TESTING.md): response envelopes, one-line serialisation, size limits.
 * Pure logic; no Minecraft runtime.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { RESPONSE_PREFIX } from "../../scripts/shared/protocol/constants.ts";
import {
  errorEnvelope,
  formatResponseLine,
  renderResponseLine,
  successEnvelope,
  type ResponseMeta,
} from "../../scripts/shared/protocol/response.ts";

const meta: ResponseMeta = { tick: 100, session: "abc12345", seq: 1, time: 1_797_590_000_000 };

/** What a tool does: find the prefix anywhere in the line and parse the rest. */
function parseLine(line: string): any {
  const at = line.indexOf(RESPONSE_PREFIX);
  assert.notEqual(at, -1);
  return JSON.parse(line.slice(at + RESPONSE_PREFIX.length));
}

test("U-PROTO-08 success and error envelopes carry exactly one of data/error", () => {
  const ok = parseLine(formatResponseLine(successEnvelope("r1", "players", meta, { count: 0 })));
  assert.deepEqual(ok, { protocol: 1, requestId: "r1", ok: true, method: "players", tick: 100, session: "abc12345", seq: 1, time: 1_797_590_000_000, data: { count: 0 } });
  const err = parseLine(formatResponseLine(errorEnvelope(null, null, meta, { code: "INVALID_JSON", message: "x" })));
  assert.equal(err.ok, false);
  assert.equal(err.requestId, null);
  assert.equal("data" in err, false);
  assert.deepEqual(err.error, { code: "INVALID_JSON", message: "x" });
});

test("U-PROTO-08 the line starts with the prefix, stays on one line and is pure ASCII", () => {
  const nasty = "a\nb\rc d e \"q\" \\ テスト \u007f 😀";
  const line = formatResponseLine(successEnvelope("r2", "players", meta, { players: [{ name: nasty }] }));
  assert.ok(line.startsWith(RESPONSE_PREFIX));
  assert.equal(/[\n\r]/.test(line), false);
  assert.equal(/[^\x20-\x7e]/.test(line), false, "every character is printable ASCII");
  assert.ok(line.includes("\\u30c6\\u30b9\\u30c8"));
  assert.equal(parseLine(`[2026-10-18 12:00:00:000 INFO] [Scripting] ${line}`).data.players[0].name, nasty);
});

test("U-PROTO-09 a response within the limit is unchanged", () => {
  const envelope = successEnvelope("r3", "players", meta, { players: [1, 2, 3] });
  const line = formatResponseLine(envelope);
  assert.equal(renderResponseLine(envelope, { maxChars: line.length, truncatable: [["players"]] }), line);
});

test("U-PROTO-09 a long list is shortened from the end and marked truncated/omitted", () => {
  const players = Array.from({ length: 50 }, (_, i) => ({ id: String(i), name: `player-${i}` }));
  const envelope = successEnvelope("r4", "players", meta, { players, count: 50 });
  const maxChars = 600;
  const line = renderResponseLine(envelope, { maxChars, truncatable: [["players"]] });
  assert.ok(line.length <= maxChars);
  const data = parseLine(line).data;
  assert.equal(data.truncated, true);
  assert.equal(data.count, 50);
  assert.ok(data.players.length > 0 && data.players.length < 50);
  assert.equal(data.omitted.players, 50 - data.players.length);
  assert.deepEqual(data.players, players.slice(0, data.players.length));
  // Greedy: one more item would not fit.
  const oneMore = { ...data, players: players.slice(0, data.players.length + 1), omitted: { players: data.omitted.players - 1 } };
  assert.ok(formatResponseLine({ ...envelope, data: oneMore }).length > maxChars);
});

test("U-PROTO-09 nested lists use their own parent for the markers", () => {
  const items = Array.from({ length: 40 }, (_, i) => ({ slot: i, typeId: "minecraft:stone", amount: 64 }));
  const envelope = successEnvelope("r5", "player", meta, { name: "Steve", inventory: { size: 40, items } });
  const line = renderResponseLine(envelope, { maxChars: 700, truncatable: [["inventory", "items"]] });
  const data = parseLine(line).data;
  assert.equal(data.inventory.truncated, true);
  assert.equal(data.inventory.omitted.items, 40 - data.inventory.items.length);
  assert.equal("truncated" in data, false);
});

test("U-PROTO-09 when even an empty list does not fit, the answer is RESPONSE_TOO_LARGE", () => {
  const envelope = successEnvelope("r6", "players", meta, { note: "x".repeat(500), players: [1, 2] });
  const line = renderResponseLine(envelope, { maxChars: 300, truncatable: [["players"]] });
  const parsed = parseLine(line);
  assert.equal(parsed.ok, false);
  assert.equal(parsed.requestId, "r6");
  assert.equal(parsed.error.code, "RESPONSE_TOO_LARGE");
  assert.equal(parsed.error.details.limit, 300);
  assert.ok(line.length <= 300);
});

test("U-PROTO-09 without truncatable lists an oversized response is RESPONSE_TOO_LARGE", () => {
  const envelope = successEnvelope("r7", "capabilities", meta, { pad: "y".repeat(1000) });
  assert.equal(parseLine(renderResponseLine(envelope, { maxChars: 500 })).error.code, "RESPONSE_TOO_LARGE");
});
