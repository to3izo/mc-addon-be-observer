import { readFileSync, writeFileSync } from "node:fs";
import { rel } from "./paths.ts";

export class JsonError extends Error {
  readonly file: string;

  constructor(file: string, message: string) {
    super(`${rel(file)}: ${message}`);
    this.file = file;
  }
}

/** Reads and parses strict JSON (no comments, no trailing commas). */
export function readJson<T = unknown>(file: string): T {
  let text: string;
  try {
    text = readFileSync(file, "utf8");
  } catch (error) {
    throw new JsonError(file, `cannot read file (${(error as Error).message})`);
  }
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new JsonError(file, `invalid JSON (${(error as Error).message})`);
  }
}

/** Writes JSON with 2-space indentation, numeric arrays kept on one line ([1, 0, 0]), and a trailing newline. */
export function writeJson(file: string, data: unknown): void {
  writeFileSync(file, formatJson(data), "utf8");
}

export function formatJson(data: unknown): string {
  const text = JSON.stringify(data, null, 2).replace(/\[\s*((?:-?\d+(?:\.\d+)?\s*,\s*)*-?\d+(?:\.\d+)?)\s*\]/g, (_m, inner: string) =>
    `[${inner.replace(/\s+/g, " ").replace(/\s*,\s*/g, ", ")}]`,
  );
  return text + "\n";
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
