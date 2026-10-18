/**
 * The build identifier embedded into the script bundle (`capabilities.build`, ADR-0014), so a tool can tell
 * whether the server runs the build it just deployed. Uses the git command line only; no dependencies.
 */
import { execFileSync } from "node:child_process";
import type { BuildInfo } from "../../scripts/shared/constants/build.ts";

export interface GitState {
  commit: string | null;
  dirty: boolean | null;
}

/** `20261018T123456Z` */
export function compactUtc(time: Date): string {
  return time.toISOString().replace(/\.\d{3}Z$/, "Z").replace(/[-:]/g, "");
}

export function makeBuildInfo(time: Date, git: GitState): BuildInfo {
  const id = `${git.commit ?? "nogit"}${git.dirty ? "+dirty" : ""}@${compactUtc(time)}`;
  return { id, time: time.toISOString(), commit: git.commit, dirty: git.dirty };
}

function git(root: string, args: string[]): string {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}

/** HEAD and whether the tree has uncommitted changes (git-ignored files such as dist/ do not count). */
export function readGitState(root: string): GitState {
  try {
    const commit = git(root, ["rev-parse", "--short=12", "HEAD"]);
    const dirty = git(root, ["status", "--porcelain"]).length > 0;
    return { commit, dirty };
  } catch {
    // Not a git checkout (e.g. a source archive) or git is not installed.
    return { commit: null, dirty: null };
  }
}
