// Build facts reported by the `capabilities` method. The script cannot read package.json or the manifest at
// runtime, so they are written here. tests/validation/version-constants.test.ts fails when they drift:
// after `pnpm version:set x.y.z`, update ADDON_VERSION in the same change.

/** Must equal package.json "version" (and both manifests' header.version). */
export const ADDON_VERSION = "1.0.0";

/** Must equal the `module_name` dependencies in behavior_pack/manifest.json. */
export const SCRIPT_API_MODULES: Readonly<Record<string, string>> = {
  "@minecraft/server": "2.10.0",
};
