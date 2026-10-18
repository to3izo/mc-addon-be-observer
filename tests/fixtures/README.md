# tests/fixtures

Static inputs for tests (sample JSON definitions, minimal textures, expected
outputs). Nothing in here is shipped; `pnpm build` ignores this directory.

`tests/validation/manifests.test.ts` currently derives its fixtures from the
real manifests at runtime, so this directory only holds a placeholder. Add
files here when a test needs hand-written content.
