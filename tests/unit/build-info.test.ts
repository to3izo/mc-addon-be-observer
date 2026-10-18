/**
 * U-BUILD-01 (docs/TESTING.md): the build identifier that tools/build.ts embeds for `capabilities.build`.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { compactUtc, makeBuildInfo, readGitState } from "../../tools/lib/build-info.ts";
import { PATHS } from "../../tools/lib/paths.ts";

const time = new Date("2026-10-18T12:34:56.789Z");

test("U-BUILD-01 the build id joins commit, dirty flag and UTC time", () => {
  assert.equal(compactUtc(time), "20261018T123456Z");
  assert.deepEqual(makeBuildInfo(time, { commit: "23aec2a1b2c3", dirty: false }), {
    id: "23aec2a1b2c3@20261018T123456Z",
    time: "2026-10-18T12:34:56.789Z",
    commit: "23aec2a1b2c3",
    dirty: false,
  });
  assert.equal(makeBuildInfo(time, { commit: "23aec2a1b2c3", dirty: true }).id, "23aec2a1b2c3+dirty@20261018T123456Z");
  assert.deepEqual(makeBuildInfo(time, { commit: null, dirty: null }), {
    id: "nogit@20261018T123456Z",
    time: "2026-10-18T12:34:56.789Z",
    commit: null,
    dirty: null,
  });
  // The id is plain ASCII without spaces, so tools can compare it as one token.
  assert.match(makeBuildInfo(time, { commit: "abc", dirty: true }).id, /^[0-9a-z+@T]+Z$/i);
});

test("U-BUILD-01 git state outside a repository is null, not an error", () => {
  assert.deepEqual(readGitState("/"), { commit: null, dirty: null });
  // In this checkout (CI and local) HEAD resolves to a short hash.
  const state = readGitState(PATHS.root);
  if (state.commit !== null) assert.match(state.commit, /^[0-9a-f]{12}$/);
});
