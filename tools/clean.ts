/** pnpm clean — removes dist/. */
import { removeDir } from "./lib/fs.ts";
import { log } from "./lib/log.ts";
import { PATHS, rel, isMain } from "./lib/paths.ts";

export function clean(): void {
  removeDir(PATHS.dist);
  log.ok(`Removed ${rel(PATHS.dist)}/`);
}

if (isMain(import.meta.url)) clean();
