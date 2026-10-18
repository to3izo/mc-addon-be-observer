import { NAMESPACE } from "../constants/addon.ts";
import { PROTOCOL_VERSION } from "./constants.ts";
import type { BlockPosition, Location } from "./params.ts";
import { toAsciiJson } from "./response.ts";

/**
 * Game events pushed as `to3izo_bo.event {json}` lines (docs/PROTOCOL.md §10, ADR-0008).
 * Kinds are a stable contract: add new ones, never rename or remove one.
 * These kinds are always on; `capabilities.events` lists them.
 */
export const EVENT_KINDS = [
  "player_join",
  "player_leave",
  "player_spawn",
  "entity_die",
  "dimension_change",
  "game_mode_change",
  "game_rule_change",
] as const;

export type CoreEventKind = (typeof EVENT_KINDS)[number];

/**
 * Opt-in kinds (ADR-0014): off until a tool enables them with the `subscribe` method. The switch is kept in
 * memory only, so /reload and a server restart turn them all off again. `capabilities.optionalEvents` lists them.
 */
export const OPTIONAL_EVENT_KINDS = [
  "block_break",
  "block_place",
  "entity_hurt",
  "effect_add",
  "item_use",
  "explosion",
  "weather_change",
  "entity_spawn",
] as const;

export type OptionalEventKind = (typeof OPTIONAL_EVENT_KINDS)[number];

export type EventKind = CoreEventKind | OptionalEventKind;

/** Every kind this build can send, always-on kinds first. */
export const ALL_EVENT_KINDS: readonly EventKind[] = [...EVENT_KINDS, ...OPTIONAL_EVENT_KINDS];

export function isOptionalEventKind(kind: unknown): kind is OptionalEventKind {
  return (OPTIONAL_EVENT_KINDS as readonly unknown[]).includes(kind);
}

export function isCoreEventKind(kind: unknown): kind is CoreEventKind {
  return (EVENT_KINDS as readonly unknown[]).includes(kind);
}

/** Marks a machine-readable event line. Exactly one JSON object follows it on the same line. */
export const EVENT_PREFIX = `${NAMESPACE}.event `;

/** Limits of the event stream (ADR-0008), published in `capabilities.limits`. */
export const EVENT_LIMITS = {
  /** Event lines per second (20 ticks); more are dropped and counted in the next line's `dropped`. */
  maxEventsPerSecond: 20,
  /** Recent events kept in memory for the `events` method. */
  eventBufferSize: 64,
  /** Most events one `events` request returns. */
  maxEventsPerRequest: 64,
  /** `entity_spawn` is sent only for entities this close (blocks) to a player in the same dimension. */
  eventPlayerRadius: 32,
} as const;

/** `entity_spawn` causes that are not reported: `Loaded` is an existing entity coming back with its chunk. */
export const IGNORED_SPAWN_CAUSES: readonly string[] = ["Loaded"];

/** Which opt-in kinds are on. Memory only (ADR-0014): never stored in the world. */
export class EventSwitch {
  private readonly on = new Set<OptionalEventKind>();

  isOn(kind: OptionalEventKind): boolean {
    return this.on.has(kind);
  }

  /** The kinds that are on, in `OPTIONAL_EVENT_KINDS` order. */
  enabled(): OptionalEventKind[] {
    return OPTIONAL_EVENT_KINDS.filter((kind) => this.on.has(kind));
  }

  /** Turns kinds on and off and returns the kinds whose state changed, in `OPTIONAL_EVENT_KINDS` order. */
  apply(enable: readonly OptionalEventKind[], disable: readonly OptionalEventKind[]): OptionalEventKind[] {
    const changed = new Set<OptionalEventKind>();
    for (const kind of enable) {
      if (!this.on.has(kind)) {
        this.on.add(kind);
        changed.add(kind);
      }
    }
    for (const kind of disable) {
      if (this.on.delete(kind)) changed.add(kind);
    }
    return OPTIONAL_EVENT_KINDS.filter((kind) => changed.has(kind));
  }
}

/**
 * Dimension ids in events are full ids (`minecraft:overworld`), as everywhere in the protocol. `weatherChange`
 * gives a short one (`overworld`, seen on BDS 1.26.52.3).
 */
export function fullDimensionId(id: string): string {
  return id.includes(":") ? id : `minecraft:${id}`;
}

/** True when `point` is within `radius` blocks of any of `others` (straight-line distance). */
export function isNearAny(point: Location, others: readonly Location[], radius: number): boolean {
  const r2 = radius * radius;
  return others.some((o) => (o.x - point.x) ** 2 + (o.y - point.y) ** 2 + (o.z - point.z) ** 2 <= r2);
}

/** The smallest box holding all `positions`, or undefined when there are none (`explosion.bounds`). */
export function blockBounds(positions: readonly BlockPosition[]): { min: BlockPosition; max: BlockPosition } | undefined {
  const first = positions[0];
  if (!first) return undefined;
  const min = { ...first };
  const max = { ...first };
  for (const p of positions) {
    min.x = Math.min(min.x, p.x);
    min.y = Math.min(min.y, p.y);
    min.z = Math.min(min.z, p.z);
    max.x = Math.max(max.x, p.x);
    max.y = Math.max(max.y, p.y);
    max.z = Math.max(max.z, p.z);
  }
  return { min, max };
}

export interface EventRecord {
  kind: EventKind;
  /** Event counter within the session, from 1; separate from the response `seq`. Gaps mean dropped events. */
  seq: number;
  tick: number;
  time: number;
  data: Record<string, unknown>;
  /** Events dropped by the rate limit just before this one. Present only when non-zero. */
  dropped?: number;
}

/** One event line: `to3izo_bo.event {"protocol":1,"session":…,"kind":…,"seq":…,…}` in pure ASCII. */
export function formatEventLine(record: EventRecord, session: string): string {
  const { kind, seq, tick, time, data, dropped } = record;
  const body = dropped
    ? { protocol: PROTOCOL_VERSION, session, kind, seq, tick, time, dropped, data }
    : { protocol: PROTOCOL_VERSION, session, kind, seq, tick, time, data };
  return EVENT_PREFIX + toAsciiJson(body);
}

/** Fixed-size buffer of the most recent events, oldest first. */
export class EventBuffer {
  private readonly capacity: number;
  private readonly items: EventRecord[] = [];

  constructor(capacity: number) {
    this.capacity = capacity;
  }

  push(record: EventRecord): void {
    this.items.push(record);
    if (this.items.length > this.capacity) this.items.shift();
  }

  /** Lowest and highest `seq` still held, or 0 when empty. */
  range(): { oldestSeq: number; latestSeq: number } {
    const first = this.items[0];
    const last = this.items[this.items.length - 1];
    return { oldestSeq: first ? first.seq : 0, latestSeq: last ? last.seq : 0 };
  }

  /**
   * Events with `seq` > `since`, oldest first, at most `limit`, optionally only some kinds. `missed` is true
   * when events after `since` were already pushed out of the buffer (or dropped by the rate limit).
   */
  since(since: number, limit: number, kinds?: readonly EventKind[]): { events: EventRecord[]; missed: boolean; more: boolean } {
    const { oldestSeq } = this.range();
    const missed = oldestSeq > since + 1 || this.items.some((e) => e.seq > since && (e.dropped ?? 0) > 0);
    const matching = this.items.filter((e) => e.seq > since && (!kinds || kinds.includes(e.kind)));
    return { events: matching.slice(0, limit), missed, more: matching.length > limit };
  }
}

/** Allows at most `max` events per `windowTicks` ticks and counts the rest. */
export class EventRateLimiter {
  private readonly max: number;
  private readonly windowTicks: number;
  private windowStart = Number.NEGATIVE_INFINITY;
  private used = 0;
  private droppedCount = 0;

  constructor(max: number, windowTicks: number) {
    this.max = max;
    this.windowTicks = windowTicks;
  }

  allow(tick: number): boolean {
    if (tick >= this.windowStart + this.windowTicks) {
      this.windowStart = tick;
      this.used = 0;
    }
    if (this.used >= this.max) {
      this.droppedCount += 1;
      return false;
    }
    this.used += 1;
    return true;
  }

  /** Number of events dropped since the last call. */
  takeDropped(): number {
    const n = this.droppedCount;
    this.droppedCount = 0;
    return n;
  }
}
