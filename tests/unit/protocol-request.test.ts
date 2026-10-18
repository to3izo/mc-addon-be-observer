/**
 * U-PROTO-01..05 (docs/TESTING.md): request envelope validation. Pure logic; no Minecraft runtime.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { SIZE_LIMITS } from "../../scripts/shared/protocol/constants.ts";
import { parseRequest, recoverRequestId } from "../../scripts/shared/protocol/request.ts";

function expectError(message: string, code: string) {
  const parsed = parseRequest(message);
  assert.equal(parsed.ok, false, `expected ${code} for ${message}`);
  if (parsed.ok) throw new Error("unreachable");
  assert.equal(parsed.error.code, code);
  return parsed;
}

test("U-PROTO-01 a valid request keeps requestId, method and params", () => {
  const parsed = parseRequest('{"protocol":1,"requestId":"r-0001","method":"players","params":{"a":1}}');
  assert.deepEqual(parsed, { ok: true, request: { protocol: 1, requestId: "r-0001", method: "players", params: { a: 1 } } });
});

test("U-PROTO-01 params and protocol are optional", () => {
  const parsed = parseRequest('{"requestId":"c1","method":"capabilities"}');
  assert.deepEqual(parsed, { ok: true, request: { protocol: undefined, requestId: "c1", method: "capabilities", params: {} } });
});

test("U-PROTO-02 broken JSON is INVALID_JSON and the requestId is recovered from the text", () => {
  const parsed = expectError('{"requestId":"x1",', "INVALID_JSON");
  assert.equal(parsed.requestId, "x1");
  assert.equal(parsed.method, null);
});

test("U-PROTO-02 non-object JSON is INVALID_JSON; an unrecoverable id is null", () => {
  assert.equal(expectError("[1,2]", "INVALID_JSON").requestId, null);
  assert.equal(expectError('"players"', "INVALID_JSON").requestId, null);
  assert.equal(expectError("players", "INVALID_JSON").requestId, null);
  assert.equal(expectError('{"requestId":"has space",', "INVALID_JSON").requestId, null);
});

test("U-PROTO-02 recoverRequestId only returns well-formed ids", () => {
  assert.equal(recoverRequestId('xx "requestId" : "ok.1:2-3_4" yy'), "ok.1:2-3_4");
  assert.equal(recoverRequestId('{"requestId":""}'), null);
  assert.equal(recoverRequestId(`{"requestId":"${"a".repeat(65)}"}`), null);
});

test("U-PROTO-03 an oversized message is refused before parsing", () => {
  const big = `{"requestId":"big1","method":"players","params":{"pad":"${"x".repeat(SIZE_LIMITS.maxRequestChars)}"}}`;
  const parsed = expectError(big, "REQUEST_TOO_LARGE");
  assert.equal(parsed.requestId, "big1");
  assert.deepEqual(parsed.error.details, { limit: SIZE_LIMITS.maxRequestChars, length: big.length });
  // Exactly at the limit is still parsed.
  const exact = '{"requestId":"e","method":"players"}';
  assert.equal(parseRequest(exact, exact.length).ok, true);
  assert.equal(parseRequest(exact, exact.length - 1).ok, false);
});

test("U-PROTO-04 requestId must be 1-64 characters from [A-Za-z0-9._:-]", () => {
  for (const id of ["", "a b", "日本", "a".repeat(65), 5, null]) {
    const parsed = expectError(JSON.stringify({ requestId: id, method: "players" }), "INVALID_REQUEST");
    assert.equal(parsed.requestId, null);
  }
  assert.equal(parseRequest(JSON.stringify({ requestId: "a".repeat(64), method: "players" })).ok, true);
});

test("U-PROTO-04 method must be a well-formed name; the requestId is still echoed", () => {
  for (const method of [undefined, "", "Players", "players!", 3, "a".repeat(65)]) {
    const parsed = expectError(JSON.stringify({ requestId: "m1", method }), "INVALID_REQUEST");
    assert.equal(parsed.requestId, "m1");
    assert.equal(parsed.method, null);
  }
});

test("U-PROTO-04 unknown top-level fields, bad params and bad protocol are rejected", () => {
  assert.equal(expectError('{"requestId":"t1","method":"players","parms":{}}', "INVALID_REQUEST").error.details?.field, "parms");
  expectError('{"requestId":"t2","method":"players","params":[]}', "INVALID_REQUEST");
  expectError('{"requestId":"t3","method":"players","params":null}', "INVALID_REQUEST");
  expectError('{"requestId":"t4","method":"players","protocol":"1"}', "INVALID_REQUEST");
  expectError('{"requestId":"t5","method":"players","protocol":1.5}', "INVALID_REQUEST");
  const unsupported = expectError('{"requestId":"t6","method":"players","protocol":2}', "UNSUPPORTED_PROTOCOL");
  assert.deepEqual(unsupported.error.details, { supported: [1] });
  assert.equal(unsupported.method, "players");
});

test("U-PROTO-04 non-ASCII text inside string values is accepted", () => {
  const parsed = parseRequest('{"requestId":"j1","method":"player","params":{"player":{"name":"テスト プレイヤー \\"q\\" \\\\"}}}');
  assert.equal(parsed.ok, true);
  if (parsed.ok) assert.deepEqual(parsed.request.params, { player: { name: 'テスト プレイヤー "q" \\' } });
});
