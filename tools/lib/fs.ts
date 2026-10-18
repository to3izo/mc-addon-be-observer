import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";

/** Files that live next to Minecraft content but must never ship inside a pack. */
const NON_PACK_FILES = new Set(["AGENTS.md", "README.md", ".gitkeep", ".DS_Store", "Thumbs.db"]);

export function isPackFile(file: string): boolean {
  return !NON_PACK_FILES.has(path.basename(file));
}

export function exists(file: string): boolean {
  return existsSync(file);
}

export function isDirectory(file: string): boolean {
  return existsSync(file) && statSync(file).isDirectory();
}

export function ensureDir(dir: string): void {
  mkdirSync(dir, { recursive: true });
}

export function removeDir(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

/** Recursively lists files (absolute paths) under `dir`, sorted. Returns [] when missing. */
export function walk(dir: string): string[] {
  if (!isDirectory(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true, recursive: true })) {
    if (!entry.isFile()) continue;
    out.push(path.join(entry.parentPath, entry.name));
  }
  return out.sort();
}

/** Copies a pack directory, skipping documentation/noise files. */
export function copyPack(src: string, dest: string): number {
  let count = 0;
  ensureDir(dest);
  cpSync(src, dest, {
    recursive: true,
    filter: (file) => {
      const keep = isPackFile(file);
      if (keep && existsSync(file) && statSync(file).isFile()) count++;
      return keep;
    },
  });
  return count;
}
