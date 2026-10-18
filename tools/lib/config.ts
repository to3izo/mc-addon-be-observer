import { existsSync } from "node:fs";
import { isRecord, readJson } from "./json.ts";
import { PATHS, rel } from "./paths.ts";

/** Contents of addon.config.json: the single place that names this Add-On. */
export interface AddonConfig {
  /** Human-readable name shown to players (e.g. "Ruby Tools"). */
  name: string;
  /** Lowercase, hyphenated; used for dist folder and file names (e.g. "ruby-tools"). */
  slug: string;
  /** Identifier prefix for all custom content (e.g. "rubytools" -> "rubytools:ruby_sword"). */
  namespace: string;
  description: string;
  /** Optional Japanese description, used only for README.ja.md (falls back to `description`). */
  descriptionJa?: string;
  /** Minimum game version as "major.minor.patch" (e.g. "1.26.50"). */
  minEngineVersion: string;
  author: string;
}

export const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
export const NAMESPACE_PATTERN = /^[a-z][a-z0-9_]*$/;
export const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;
/** Namespaces owned by Mojang; using them breaks or shadows vanilla content. */
export const RESERVED_NAMESPACES = new Set(["minecraft", "minecon", "mojang"]);

export function validateConfigShape(value: unknown, file = PATHS.config): AddonConfig {
  if (!isRecord(value)) throw new Error(`${rel(file)}: must be a JSON object`);
  const text = (key: keyof AddonConfig, required = true): string => {
    const v = value[key];
    if (v === undefined && !required) return "";
    if (typeof v !== "string") throw new Error(`${rel(file)}: "${key}" must be a string`);
    if (required && v.trim() === "") throw new Error(`${rel(file)}: "${key}" must not be empty`);
    return v;
  };
  const descriptionJa = text("descriptionJa", false);
  const cfg: AddonConfig = {
    name: text("name"),
    slug: text("slug"),
    namespace: text("namespace"),
    description: text("description"),
    ...(descriptionJa ? { descriptionJa } : {}),
    minEngineVersion: text("minEngineVersion"),
    author: text("author", false),
  };
  if (!SLUG_PATTERN.test(cfg.slug)) throw new Error(`${rel(file)}: "slug" must match ${SLUG_PATTERN}`);
  if (!NAMESPACE_PATTERN.test(cfg.namespace)) throw new Error(`${rel(file)}: "namespace" must match ${NAMESPACE_PATTERN}`);
  if (RESERVED_NAMESPACES.has(cfg.namespace)) throw new Error(`${rel(file)}: "namespace" "${cfg.namespace}" is reserved`);
  if (!VERSION_PATTERN.test(cfg.minEngineVersion)) throw new Error(`${rel(file)}: "minEngineVersion" must look like "1.26.50"`);
  return cfg;
}

export function loadConfig(): AddonConfig {
  if (!existsSync(PATHS.config)) throw new Error(`${rel(PATHS.config)} not found. Run "pnpm init:addon" first.`);
  return validateConfigShape(readJson(PATHS.config));
}

/** "1.26.50" -> [1, 26, 50] */
export function parseVersion(version: string): [number, number, number] {
  const parts = version.split(".").map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isInteger(n) || n < 0)) {
    throw new Error(`invalid version "${version}" (expected major.minor.patch)`);
  }
  return [parts[0]!, parts[1]!, parts[2]!];
}

export function formatVersion(version: readonly number[]): string {
  return version.join(".");
}

/** Names of the output folders inside dist/ and inside the .mcaddon. */
export function packDirNames(cfg: AddonConfig): { bp: string; rp: string } {
  return { bp: `${cfg.slug}_BP`, rp: `${cfg.slug}_RP` };
}
