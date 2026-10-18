import path from "node:path";
import { isRecord, readJson } from "./json.ts";

/** Subset of the pack manifest (format_version 2) that the tooling touches. */
export interface Manifest {
  format_version: number;
  header: {
    name: string;
    description?: string;
    uuid: string;
    version: number[];
    min_engine_version: number[];
    [key: string]: unknown;
  };
  modules: ManifestModule[];
  dependencies?: ManifestDependency[];
  metadata?: { authors?: string[]; [key: string]: unknown };
  [key: string]: unknown;
}

export interface ManifestModule {
  type: string;
  uuid: string;
  version: number[];
  description?: string;
  language?: string;
  entry?: string;
  [key: string]: unknown;
}

export interface ManifestDependency {
  uuid?: string;
  module_name?: string;
  version: number[] | string;
}

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Template placeholder UUIDs. They are syntactically valid so the template
 * itself validates, but they must be replaced by `pnpm init:addon` before any
 * pack is distributed (every repo created from the template would otherwise
 * collide in Minecraft).
 */
export const PLACEHOLDER_UUID_PATTERN = /^00000000-0000-4000-8000-0000000000[0-9a-f]{2}$/i;

export function isPlaceholderUuid(uuid: string): boolean {
  return PLACEHOLDER_UUID_PATTERN.test(uuid);
}

export function manifestPath(packDir: string): string {
  return path.join(packDir, "manifest.json");
}

export function readManifest(packDir: string): Manifest {
  const data = readJson(manifestPath(packDir));
  if (!isRecord(data)) throw new Error(`${manifestPath(packDir)}: manifest must be a JSON object`);
  return data as unknown as Manifest;
}

/** Every UUID a manifest declares (header + modules). Dependencies are references, not declarations. */
export function declaredUuids(manifest: Manifest): string[] {
  const uuids: string[] = [];
  if (isRecord(manifest.header) && typeof manifest.header.uuid === "string") uuids.push(manifest.header.uuid);
  if (Array.isArray(manifest.modules)) {
    for (const m of manifest.modules) if (isRecord(m) && typeof m.uuid === "string") uuids.push(m.uuid);
  }
  return uuids;
}

export function hasPlaceholderUuids(manifest: Manifest): boolean {
  return declaredUuids(manifest).some(isPlaceholderUuid);
}

export function isVersionArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.length === 3 && value.every((n) => Number.isInteger(n) && n >= 0);
}

export function versionEquals(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((n, i) => n === b[i]);
}

/**
 * Makes `from` depend on `to` by UUID, rewriting the existing UUID dependency or adding one.
 * This is the one place where a UUID is legitimately (re)written, and only to match the other pack.
 */
export function syncPackDependency(from: Manifest, to: Manifest): void {
  from.dependencies = from.dependencies ?? [];
  const existing = from.dependencies.find((d) => typeof d.uuid === "string");
  if (existing) {
    existing.uuid = to.header.uuid;
    existing.version = to.header.version;
  } else {
    from.dependencies.unshift({ uuid: to.header.uuid, version: to.header.version });
  }
}

/** Sets header.pack_scope, placing it right after header.uuid as the cooperative Add-On guidelines show. */
export function setPackScope(manifest: Manifest, scope: "world" | "global" | "any"): void {
  const header: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(manifest.header)) {
    if (key === "pack_scope") continue;
    header[key] = value;
    if (key === "uuid") header.pack_scope = scope;
  }
  manifest.header = header as Manifest["header"];
}
