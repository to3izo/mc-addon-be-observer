/**
 * Methods this build answers. The dispatcher's handler table is typed as `Record<MethodName, …>`, so it
 * cannot drift from this list, and `capabilities.methods` is built from it.
 */
export const METHODS = ["capabilities", "players", "player", "block", "blocks", "target", "entities", "snapshot", "events", "entity", "top", "tops", "scoreboard", "subscribe", "features", "container"] as const;

export type MethodName = (typeof METHODS)[number];

export function isMethodName(name: string): name is MethodName {
  return (METHODS as readonly string[]).includes(name);
}

/** Optional data sections that `player` and `snapshot` can add (`include`). */
export const SECTIONS = ["health", "inventory", "equipment", "effects", "world"] as const;

export type SectionName = (typeof SECTIONS)[number];
