/**
 * U-PROTO-05 and U-PROTO-10 (docs/TESTING.md): dispatching and `capabilities`. Uses a fake method table, so
 * no Minecraft runtime is involved; the real handlers are verified in game (OBS-IN-*).
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { NAMESPACE } from "../../scripts/shared/constants/addon.ts";
import { buildCapabilities } from "../../scripts/shared/protocol/capabilities.ts";
import { REQUEST_EVENT_ID, RESPONSE_PREFIX, SIZE_LIMITS } from "../../scripts/shared/protocol/constants.ts";
import { handleRequest, type MethodTable } from "../../scripts/shared/protocol/dispatch.ts";
import { ObserverError } from "../../scripts/shared/protocol/errors.ts";
import { METHODS, SECTIONS } from "../../scripts/shared/protocol/methods.ts";
import { createSessionId } from "../../scripts/shared/protocol/session.ts";

const meta = { tick: 7, session: "s", seq: 3, time: 0 };

function table(overrides: Partial<MethodTable<string>> = {}): MethodTable<string> {
  return {
    capabilities: () => ({ data: buildCapabilities() }),
    players: (_params, context) => ({ data: { context }, truncatable: [["players"]] }),
    ...overrides,
  };
}

test("U-PROTO-05 unknown methods are UNKNOWN_METHOD and never reach a handler", () => {
  const handled = handleRequest('{"requestId":"u1","method":"teleport"}', "ctx", meta, table());
  assert.equal(handled.envelope.ok, false);
  if (!handled.envelope.ok) assert.equal(handled.envelope.error.code, "UNKNOWN_METHOD");
  assert.equal(handled.envelope.requestId, "u1");
  assert.equal(handled.envelope.method, "teleport");
});

test("a known method gets the context, meta and truncatable lists", () => {
  const handled = handleRequest('{"requestId":"p1","method":"players"}', "ctx", meta, table());
  assert.deepEqual(handled.envelope, {
    protocol: 1,
    requestId: "p1",
    ok: true,
    method: "players",
    tick: 7,
    session: "s",
    seq: 3,
    time: 0,
    data: { context: "ctx" },
  });
  assert.deepEqual(handled.truncatable, [["players"]]);
});

test("ObserverError becomes its protocol error; other exceptions become INTERNAL_ERROR with the failure kept", () => {
  const known = handleRequest('{"requestId":"e1","method":"players"}', "", meta, table({
    players: () => {
      throw new ObserverError("PLAYER_NOT_FOUND", "no player named \"x\"");
    },
  }));
  assert.equal(known.envelope.ok, false);
  if (!known.envelope.ok) assert.equal(known.envelope.error.code, "PLAYER_NOT_FOUND");
  assert.equal(known.failure, undefined);

  const boom = new Error("boom");
  const unexpected = handleRequest('{"requestId":"e2","method":"players"}', "", meta, table({
    players: () => {
      throw boom;
    },
  }));
  assert.equal(unexpected.envelope.ok, false);
  if (!unexpected.envelope.ok) assert.equal(unexpected.envelope.error.code, "INTERNAL_ERROR");
  assert.equal(unexpected.failure, boom);
});

test("validation errors are answered without calling a handler", () => {
  let called = false;
  const handled = handleRequest("{oops", "", meta, table({
    players: () => {
      called = true;
      return { data: {} };
    },
  }));
  assert.equal(called, false);
  assert.equal(handled.envelope.ok, false);
  if (!handled.envelope.ok) assert.equal(handled.envelope.error.code, "INVALID_JSON");
});

test("U-PROTO-10 capabilities describes this build: methods, transport, limits", () => {
  const caps = buildCapabilities() as any;
  assert.deepEqual(caps.methods, [...METHODS]);
  assert.deepEqual(caps.sections, [...SECTIONS]);
  assert.deepEqual(caps.protocol, { version: 1, supported: [1] });
  assert.deepEqual(caps.transport, { requestEventId: REQUEST_EVENT_ID, responsePrefix: RESPONSE_PREFIX });
  assert.deepEqual(caps.limits, { ...SIZE_LIMITS });
  assert.equal(caps.readOnly, true);
  assert.equal(caps.addon.namespace, NAMESPACE);
  assert.equal(REQUEST_EVENT_ID, `${NAMESPACE}:query`);
  assert.equal(RESPONSE_PREFIX, `${NAMESPACE}.response `);
});

test("U-PROTO-10 every listed method answers (no UNKNOWN_METHOD) through the table", () => {
  for (const method of METHODS) {
    const handled = handleRequest(JSON.stringify({ requestId: "m", method }), "", meta, table());
    assert.equal(handled.envelope.ok, true, method);
  }
});

test("session ids are 8 lowercase alphanumerics and depend on the random source", () => {
  assert.match(createSessionId(), /^[0-9a-z]{8}$/);
  assert.equal(createSessionId(() => 0), "00000000");
  assert.equal(createSessionId(() => 0.999999), "zzzzzzzz");
});
