/**
 * pnpm init:addon [--name "..."] [--slug ...] [--namespace ...] [--description "..."]
 *                 [--min-engine-version 1.26.50] [--author "..."] [--yes] [--dry-run]
 *
 * One-time (but re-runnable) setup for a repository created from this template.
 * Interactive when a flag is missing and stdin is a TTY; `--yes` accepts defaults.
 *
 * It writes ONLY Add-On-specific identity:
 *   - addon.config.json
 *   - behavior_pack/manifest.json, resource_pack/manifest.json
 *       name, description, min_engine_version, metadata.authors,
 *       UUIDs (generated ONLY where the template placeholder is still present),
 *       BP <-> RP dependencies (kept in sync with the other pack's header), RP pack_scope "world"
 *   - scripts/shared/constants/addon.ts
 *   - package.json name/description
 *   - README.md / README.ja.md title + the block between <!-- addon:start --> and <!-- addon:end -->
 *   - LICENSE placeholders ([year], [fullname] / [your_name]) if still present
 *   - .vscode/launch.json dist/<slug>_BP paths (Minecraft Debugger)
 *
 * Existing real UUIDs are never regenerated.
 */
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import readline from "node:readline/promises";
import {
  NAMESPACE_PATTERN,
  RESERVED_NAMESPACES,
  SLUG_PATTERN,
  VERSION_PATTERN,
  parseVersion,
  validateConfigShape,
  type AddonConfig,
} from "./lib/config.ts";
import { readJson, writeJson } from "./lib/json.ts";
import { log } from "./lib/log.ts";
import { isPlaceholderUuid, readManifest, setPackScope, syncPackDependency, type Manifest } from "./lib/manifest.ts";
import { PATHS, isMain, rel } from "./lib/paths.ts";

interface Args {
  values: Partial<Record<keyof AddonConfig, string>>;
  yes: boolean;
  dryRun: boolean;
}

const FLAG_TO_KEY: Record<string, keyof AddonConfig> = {
  "--name": "name",
  "--slug": "slug",
  "--namespace": "namespace",
  "--description": "description",
  "--min-engine-version": "minEngineVersion",
  "--author": "author",
};

export function parseArgs(argv: string[]): Args {
  const args: Args = { values: {}, yes: false, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "--yes" || arg === "-y") args.yes = true;
    else if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      const [flag, inline] = arg.includes("=") ? [arg.slice(0, arg.indexOf("=")), arg.slice(arg.indexOf("=") + 1)] : [arg, undefined];
      const key = FLAG_TO_KEY[flag];
      if (!key) throw new Error(`unknown argument "${arg}" (see --help)`);
      const value = inline ?? argv[++i];
      if (value === undefined) throw new Error(`${flag} needs a value`);
      args.values[key] = value;
    }
  }
  return args;
}

function printHelp(): void {
  console.log(`Usage: pnpm init:addon [options]

Options:
  --name <text>                 Display name, e.g. "Ruby Tools"
  --slug <slug>                 Lowercase-hyphen slug (default: from name), e.g. ruby-tools
  --namespace <ns>              Identifier namespace (default: from slug), e.g. rubytools
  --description <text>          One-line description shown in Minecraft
  --min-engine-version <x.y.z>  Minimum Minecraft version (default: current config)
  --author <text>               Author name (default: git user.name)
  --yes, -y                     Accept defaults for anything not passed; never prompt
  --dry-run                     Show what would change without writing
  --help, -h                    This help`);
}

// --- derivations -----------------------------------------------------------

export function slugFromName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function namespaceFromSlug(slug: string): string {
  const ns = slug.replace(/-/g, "_").replace(/^[^a-z]+/, "");
  return ns || "addon";
}

function gitUserName(): string {
  try {
    return execFileSync("git", ["config", "user.name"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

// --- prompting -------------------------------------------------------------

type Validator = (value: string) => string | undefined;

async function resolveConfig(args: Args, current: AddonConfig): Promise<AddonConfig> {
  const interactive = !args.yes && process.stdin.isTTY === true;
  const rl = interactive ? readline.createInterface({ input: process.stdin, output: process.stdout }) : undefined;

  const ask = async (key: keyof AddonConfig, label: string, fallback: string, validator: Validator): Promise<string> => {
    const provided = args.values[key];
    if (provided !== undefined) {
      const problem = validator(provided);
      if (problem) throw new Error(`--${key}: ${problem}`);
      return provided;
    }
    if (!rl) {
      const problem = validator(fallback);
      if (problem) throw new Error(`${key}: ${problem} (pass --${key} or fix addon.config.json)`);
      return fallback;
    }
    for (;;) {
      const answer = (await rl.question(`${label} [${fallback}]: `)).trim() || fallback;
      const problem = validator(answer);
      if (!problem) return answer;
      console.log(`  ${problem}`);
    }
  };

  try {
    const notEmpty: Validator = (v) => (v.trim() ? undefined : "must not be empty");
    const name = await ask("name", "Add-On name", current.name, notEmpty);
    const slug = await ask("slug", "Slug", args.values.name || name !== current.name ? slugFromName(name) : current.slug, (v) =>
      SLUG_PATTERN.test(v) ? undefined : `must match ${SLUG_PATTERN} (lowercase letters, digits, hyphens)`,
    );
    const namespace = await ask("namespace", "Namespace", slug !== current.slug ? namespaceFromSlug(slug) : current.namespace, (v) => {
      if (!NAMESPACE_PATTERN.test(v)) return `must match ${NAMESPACE_PATTERN} (lowercase letters, digits, underscores)`;
      if (RESERVED_NAMESPACES.has(v)) return `"${v}" is reserved by Mojang`;
      return undefined;
    });
    const description = await ask("description", "Description", current.description, notEmpty);
    const minEngineVersion = await ask("minEngineVersion", "Minimum Minecraft version", current.minEngineVersion, (v) =>
      VERSION_PATTERN.test(v) ? undefined : 'must look like "1.26.50"',
    );
    const author = await ask("author", "Author", current.author || gitUserName(), () => undefined);
    // descriptionJa is edited in addon.config.json only (no prompt/flag); carry it over unchanged.
    const extra = current.descriptionJa ? { descriptionJa: current.descriptionJa } : {};
    return validateConfigShape({ name, slug, namespace, description, ...extra, minEngineVersion, author });
  } finally {
    rl?.close();
  }
}

// --- writers ---------------------------------------------------------------

interface Change {
  file: string;
  apply(): void;
  summary: string[];
}

function planManifests(cfg: AddonConfig): { changes: Change[]; generated: string[] } {
  const generated: string[] = [];
  const bp = readManifest(PATHS.behaviorPack);
  const rp = readManifest(PATHS.resourcePack);
  const minEngine = parseVersion(cfg.minEngineVersion);

  const fillUuids = (m: Manifest, label: string): void => {
    if (isPlaceholderUuid(m.header.uuid)) {
      m.header.uuid = randomUUID();
      generated.push(`${label} header`);
    }
    m.modules.forEach((mod, i) => {
      if (isPlaceholderUuid(mod.uuid)) {
        mod.uuid = randomUUID();
        generated.push(`${label} modules[${i}] (${mod.type})`);
      }
    });
  };
  fillUuids(bp, "behavior_pack");
  fillUuids(rp, "resource_pack");

  const apply = (m: Manifest, suffix: string): void => {
    m.header.name = `${cfg.name} ${suffix}`;
    m.header.description = cfg.description;
    m.header.min_engine_version = minEngine;
    m.metadata = { ...(m.metadata ?? {}), authors: cfg.author ? [cfg.author] : [] };
  };
  apply(bp, "[BP]");
  apply(rp, "[RP]");

  // The packs depend on each other by UUID (Marketplace cooperative Add-On rule), derived from the
  // other pack's header. The RP is world-scoped so it cannot be applied as a global resource pack.
  syncPackDependency(bp, rp);
  syncPackDependency(rp, bp);
  setPackScope(rp, "world");

  const changes: Change[] = [
    { file: rel(`${PATHS.behaviorPack}/manifest.json`), apply: () => writeJson(`${PATHS.behaviorPack}/manifest.json`, bp), summary: [`name "${bp.header.name}"`, `min_engine_version ${cfg.minEngineVersion}`] },
    { file: rel(`${PATHS.resourcePack}/manifest.json`), apply: () => writeJson(`${PATHS.resourcePack}/manifest.json`, rp), summary: [`name "${rp.header.name}"`, `min_engine_version ${cfg.minEngineVersion}`] },
  ];
  return { changes, generated };
}

function planConfig(cfg: AddonConfig): Change {
  return { file: rel(PATHS.config), apply: () => writeJson(PATHS.config, cfg), summary: [`slug ${cfg.slug}`, `namespace ${cfg.namespace}`] };
}

function planConstants(cfg: AddonConfig): Change {
  const content = `// Generated by \`pnpm init:addon\` from addon.config.json. Do not edit by hand;
// change addon.config.json and re-run \`pnpm init:addon\` instead.

/** Identifier namespace for every custom block/item/entity (\`<namespace>:<name>\`). */
export const NAMESPACE = ${JSON.stringify(cfg.namespace)};

/** Repository / package slug. Used for log prefixes and dist folder names. */
export const ADDON_SLUG = ${JSON.stringify(cfg.slug)};
`;
  return { file: rel(PATHS.addonConstants), apply: () => writeFileSync(PATHS.addonConstants, content), summary: [`NAMESPACE "${cfg.namespace}"`] };
}

function planPackageJson(cfg: AddonConfig): Change {
  const pkg = readJson<Record<string, unknown>>(PATHS.packageJson);
  return {
    file: rel(PATHS.packageJson),
    apply: () => writeJson(PATHS.packageJson, { ...pkg, name: cfg.slug, description: cfg.description }),
    summary: [`name ${cfg.slug}`],
  };
}

const README_START = "<!-- addon:start -->";
const README_END = "<!-- addon:end -->";

export function renderReadmeBlock(cfg: AddonConfig, lang: "en" | "ja" = "en"): string {
  const labels =
    lang === "ja"
      ? { addon: "Add-On 名", slug: "スラッグ", ns: "名前空間", min: "最小 Minecraft バージョン", desc: "説明" }
      : { addon: "Add-On", slug: "Slug", ns: "Namespace", min: "Minimum Minecraft version", desc: "Description" };
  return `${README_START}
| | |
| --- | --- |
| **${labels.addon}** | ${cfg.name} |
| **${labels.slug}** | \`${cfg.slug}\` |
| **${labels.ns}** | \`${cfg.namespace}:\` |
| **${labels.min}** | ${cfg.minEngineVersion} |
| **${labels.desc}** | ${lang === "ja" ? cfg.descriptionJa || cfg.description : cfg.description} |
${README_END}`;
}

/** Updates the H1 and the addon block of README.md and README.ja.md (whichever exist). */
function planReadmes(cfg: AddonConfig): Change[] {
  const targets: Array<[string, "en" | "ja"]> = [
    [PATHS.readme, "en"],
    [PATHS.readmeJa, "ja"],
  ];
  const changes: Change[] = [];
  for (const [file, lang] of targets) {
    if (!existsSync(file)) continue;
    const text = readFileSync(file, "utf8");
    let next = text.replace(/^# .*$/m, `# ${cfg.name}`);
    const start = next.indexOf(README_START);
    const end = next.indexOf(README_END);
    if (start !== -1 && end > start) {
      next = next.slice(0, start) + renderReadmeBlock(cfg, lang) + next.slice(end + README_END.length);
    }
    if (next !== text) changes.push({ file: rel(file), apply: () => writeFileSync(file, next), summary: ["title + addon block"] });
  }
  return changes;
}

function planLicense(cfg: AddonConfig): Change | undefined {
  if (!existsSync(PATHS.license) || !cfg.author) return undefined;
  const text = readFileSync(PATHS.license, "utf8");
  const next = text.replace("[year]", String(new Date().getFullYear())).replace(/\[(?:fullname|your_name)\]/, cfg.author);
  if (next === text) return undefined;
  return { file: rel(PATHS.license), apply: () => writeFileSync(PATHS.license, next), summary: ["copyright holder"] };
}

/** Points every `dist/<slug>_BP/` path in a launch.json text at the given slug. */
export function rewriteLaunchSlug(text: string, slug: string): string {
  return text.replace(/dist\/[a-z0-9-]+_BP\//g, `dist/${slug}_BP/`);
}

function planLaunchJson(cfg: AddonConfig): Change | undefined {
  if (!existsSync(PATHS.vscodeLaunch)) return undefined;
  const text = readFileSync(PATHS.vscodeLaunch, "utf8");
  const next = rewriteLaunchSlug(text, cfg.slug);
  if (next === text) return undefined;
  return { file: rel(PATHS.vscodeLaunch), apply: () => writeFileSync(PATHS.vscodeLaunch, next), summary: [`debugger paths dist/${cfg.slug}_BP`] };
}

// --- main ------------------------------------------------------------------

export async function initAddon(argv: string[]): Promise<void> {
  const args = parseArgs(argv);
  const current = validateConfigShape(readJson(PATHS.config));
  const cfg = await resolveConfig(args, current);

  const { changes: manifestChanges, generated } = planManifests(cfg);
  const changes: Change[] = [planConfig(cfg), ...manifestChanges, planConstants(cfg), planPackageJson(cfg)];
  changes.push(...planReadmes(cfg));
  const license = planLicense(cfg);
  if (license) changes.push(license);
  const launch = planLaunchJson(cfg);
  if (launch) changes.push(launch);

  log.step(args.dryRun ? "Planned changes (dry run)" : "Applying changes");
  for (const change of changes) {
    if (!args.dryRun) change.apply();
    log.info(`${change.file}: ${change.summary.join(", ")}`);
  }
  if (generated.length) log.info(`generated ${generated.length} UUID(s): ${generated.join(", ")}`);
  else log.info("UUIDs: unchanged (no template placeholders left)");

  if (args.dryRun) {
    log.ok("Dry run complete; nothing written");
    return;
  }
  log.ok(`Initialized "${cfg.name}" (${cfg.slug}, namespace ${cfg.namespace}:)`);
  log.info("Next: pnpm validate && pnpm build, then commit the result.");
}

if (isMain(import.meta.url)) {
  initAddon(process.argv.slice(2)).catch((error) => {
    log.error(String(error instanceof Error ? error.message : error));
    process.exit(1);
  });
}
