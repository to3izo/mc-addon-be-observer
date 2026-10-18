import { NAMESPACE } from "../constants/addon.ts";
import { PROTOCOL_VERSION } from "./constants.ts";
import { toAsciiJson } from "./response.ts";

/**
 * Game events pushed as `to3izo_bo.event {json}` lines (docs/PROTOCOL.md §10, ADR-0008).
 * Kinds are a stable contract: add new ones, never rename or remove one.
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

export type EventKind = (typeof EVENT_KINDS)[number];

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
} as const;

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
