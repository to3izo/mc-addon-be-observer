import { Player, system, world, type Entity } from "@minecraft/server";
import type { MethodHandler } from "../../shared/protocol/dispatch.ts";
import { EVENT_LIMITS, EventBuffer, EventRateLimiter, type EventKind, type EventRecord } from "../../shared/protocol/events.ts";
import { EVENT_QUERY_KEYS, parseEventQuery } from "../../shared/protocol/options.ts";
import { expectOnlyKeys } from "../../shared/protocol/params.ts";
import type { RequestContext } from "./context.ts";
import { playerRef, vec } from "./read.ts";

/**
 * Game events (ADR-0008): subscribes to stable after-events, keeps the most recent ones in memory for the
 * `events` method, and hands each one to `emit` (the observer feature writes it as a log line).
 * Nothing is written to the world; the buffer is lost on /reload, which `session` makes visible.
 */

const TICKS_PER_SECOND = 20;
const buffer = new EventBuffer(EVENT_LIMITS.eventBufferSize);
const limiter = new EventRateLimiter(EVENT_LIMITS.maxEventsPerSecond, TICKS_PER_SECOND);
let eventSeq = 0;

/** `{id, typeId, name | nameTag}` of an entity that may already be invalid (a dead mob). */
function entityRef(entity: Entity): Record<string, unknown> {
  const ref: Record<string, unknown> = { id: entity.id, typeId: entity.typeId };
  try {
    if (entity instanceof Player) return { ...ref, name: entity.name };
    if (entity.isValid && entity.nameTag) return { ...ref, nameTag: entity.nameTag };
  } catch {
    // The entity went away while it was read; id and typeId are enough.
  }
  return ref;
}

export function watchGameEvents(emit: (record: EventRecord) => void, onError: (kind: EventKind, error: unknown) => void): void {
  const record = (kind: EventKind, read: () => Record<string, unknown> | undefined): void => {
    try {
      const data = read();
      if (!data) return;
      const tick = system.currentTick;
      if (!limiter.allow(tick)) return;
      eventSeq += 1;
      const dropped = limiter.takeDropped();
      const event: EventRecord = dropped
        ? { kind, seq: eventSeq, tick, time: Date.now(), data, dropped }
        : { kind, seq: eventSeq, tick, time: Date.now(), data };
      buffer.push(event);
      emit(event);
    } catch (error) {
      onError(kind, error);
    }
  };

  world.afterEvents.playerJoin.subscribe((e) => record("player_join", () => ({ player: { id: e.playerId, name: e.playerName } })));
  world.afterEvents.playerLeave.subscribe((e) => record("player_leave", () => ({ player: { id: e.playerId, name: e.playerName } })));
  world.afterEvents.playerSpawn.subscribe((e) =>
    record("player_spawn", () => ({
      player: playerRef(e.player),
      initialSpawn: e.initialSpawn,
      dimension: e.player.dimension.id,
      location: vec(e.player.location),
    })),
  );
  world.afterEvents.entityDie.subscribe((e) =>
    record("entity_die", () => {
      const dead = e.deadEntity;
      const killer = e.damageSource.damagingEntity;
      // Only deaths that matter to players: a player died, or a player killed something. Mob-on-mob deaths
      // would flood the log in farms.
      if (!(dead instanceof Player) && !(killer instanceof Player)) return undefined;
      const data: Record<string, unknown> = { entity: entityRef(dead), cause: e.damageSource.cause };
      if (dead.isValid) {
        data.dimension = dead.dimension.id;
        data.location = vec(dead.location);
      }
      if (killer) data.killer = entityRef(killer);
      const projectile = e.damageSource.damagingProjectile;
      if (projectile) data.projectile = projectile.typeId;
      return data;
    }),
  );
  world.afterEvents.playerDimensionChange.subscribe((e) =>
    record("dimension_change", () => ({
      player: playerRef(e.player),
      from: { dimension: e.fromDimension.id, location: vec(e.fromLocation) },
      to: { dimension: e.toDimension.id, location: vec(e.toLocation) },
    })),
  );
  world.afterEvents.playerGameModeChange.subscribe((e) =>
    // BDS with force-gamemode reports "Creative → Creative" twice when a player joins; that is not a change.
    record("game_mode_change", () =>
      e.fromGameMode === e.toGameMode ? undefined : { player: playerRef(e.player), from: e.fromGameMode, to: e.toGameMode },
    ),
  );
  world.afterEvents.gameRuleChange.subscribe((e) => record("game_rule_change", () => ({ rule: e.rule, value: e.value })));
}

/** `events`: recent events after `since` (docs/PROTOCOL.md §5.9), for tools that missed event lines. */
export const events: MethodHandler<RequestContext> = (params) => {
  expectOnlyKeys(params, EVENT_QUERY_KEYS);
  const query = parseEventQuery(params);
  const { oldestSeq, latestSeq } = buffer.range();
  const result = buffer.since(query.since, query.limit, query.kinds);
  return {
    data: {
      events: result.events,
      returned: result.events.length,
      limit: query.limit,
      more: result.more,
      missed: result.missed,
      oldestSeq,
      latestSeq,
    },
    truncatable: [["events"]],
  };
};
