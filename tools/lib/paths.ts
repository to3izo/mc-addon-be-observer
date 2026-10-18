import path from "node:path";
import { fileURLToPath } from "node:url";

/** Absolute repository root (the directory containing package.json). */
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export const PATHS = {
  root: ROOT,
  config: path.join(ROOT, "addon.config.json"),
  packageJson: path.join(ROOT, "package.json"),
  readme: path.join(ROOT, "README.md"),
  readmeJa: path.join(ROOT, "README.ja.md"),
  license: path.join(ROOT, "LICENSE"),
  vscodeLaunch: path.join(ROOT, ".vscode", "launch.json"),
  behaviorPack: path.join(ROOT, "behavior_pack"),
  resourcePack: path.join(ROOT, "resource_pack"),
  scripts: path.join(ROOT, "scripts"),
  scriptEntry: path.join(ROOT, "scripts", "main.ts"),
  addonConstants: path.join(ROOT, "scripts", "shared", "constants", "addon.ts"),
  dist: path.join(ROOT, "dist"),
  nodeModules: path.join(ROOT, "node_modules"),
} as const;

/** Repo-relative path for messages. */
export function rel(file: string): string {
  return path.relative(ROOT, file) || ".";
}

/** True when `moduleUrl` is the script Node was started with (works on Node 22.18+). */
export function isMain(moduleUrl: string): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return path.resolve(entry) === fileURLToPath(moduleUrl);
}
