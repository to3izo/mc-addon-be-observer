import path from "node:path";
import { exists, walk } from "../lib/fs.ts";
import { readJson, JsonError } from "../lib/json.ts";
import { rel } from "../lib/paths.ts";
import type { CheckContext } from "./context.ts";

/** Every .json file in both packs must be strict JSON; language lists must point at existing .lang files. */
export function checkJson(ctx: CheckContext): void {
  for (const dir of [ctx.bpDir, ctx.rpDir]) {
    for (const file of walk(dir)) {
      if (!file.endsWith(".json")) continue;
      try {
        readJson(file);
      } catch (error) {
        ctx.reporter.error(error instanceof JsonError ? error.message : `${rel(file)}: ${String(error)}`);
      }
    }
    checkLanguages(ctx, dir);
  }
}

function checkLanguages(ctx: CheckContext, packDir: string): void {
  const list = path.join(packDir, "texts", "languages.json");
  if (!exists(list)) return;
  let langs: unknown;
  try {
    langs = readJson(list);
  } catch {
    return; // already reported above
  }
  if (!Array.isArray(langs) || !langs.every((l) => typeof l === "string")) {
    ctx.reporter.error(`${rel(list)}: must be an array of language codes (e.g. ["en_US"])`);
    return;
  }
  for (const lang of langs as string[]) {
    const file = path.join(packDir, "texts", `${lang}.lang`);
    if (!exists(file)) ctx.reporter.error(`${rel(list)}: lists "${lang}" but ${rel(file)} does not exist`);
  }
}
