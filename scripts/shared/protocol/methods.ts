/**
 * Methods this build answers. The dispatcher's handler table is typed as `Record<MethodName, …>`, so it
 * cannot drift from this list, and `capabilities.methods` is built from it.
 */
export const METHODS = ["capabilities", "players"] as const;

export type MethodName = (typeof METHODS)[number];

export function isMethodName(name: string): name is MethodName {
  return (METHODS as readonly string[]).includes(name);
}

/** Optional data sections (`health`, `inventory`, ...). None in this build. */
export const SECTIONS: readonly string[] = [];
