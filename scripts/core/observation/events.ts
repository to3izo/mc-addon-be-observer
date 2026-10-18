import { Player, system, world, type BlockPermutation, type Entity } from "@minecraft/server";
import type { MethodHandler } from "../../shared/protocol/dispatch.ts";
import {
  EVENT_LIMITS,
  EventBuffer,
  EventRateLimiter,
  EventSwitch,
  IGNORED_SPAWN_CAUSES,
  OPTIONAL_EVENT_KINDS,
  blockBounds,
  fullDimensionId,
  isNearAny,
  isOptionalEventKind,
  type EventKind,
  type EventRecord,
  type OptionalEventKind,
} from "../../shared/protocol/events.ts";
import { EVENT_QUERY_KEYS, SUBSCRIBE_KEYS, parseEventQuery, parseSubscribeQuery } from "../../shared/protocol/options.ts";
import { expectOnlyKeys } from "../../shared/protocol/params.ts";
import type { RequestContext } from "./context.ts";
import { healthOf, playerRef, vec } from "./read.ts";

/**
 * Game events (ADR-0008): subscribes to stable after-events, keeps the most recent ones in memory for the
 * `events` method, and hands each one to `emit` (the observer feature writes it as a log line).
 * Opt-in kinds (ADR-0014) are subscribed too, but dropped at the top of the handler until `subscribe` turns them
 * on. Nothing is written to the world; the buffer and the switch are lost on /reload, which `session` makes visible.
 */

const TICKS_PER_SECOND = 20;
const buffer = new EventBuffer(EVENT_LIMITS.eventBufferSize);
const limiter = new EventRateLimiter(EVENT_LIMITS.maxEventsPerSecond, TICKS_PER_SECOND);
const optional = new EventSwitch();
let eventSeq = 0;

/** Opt-in kinds that are on now, for `capabilities.optionalEvents.enabled`. */
export function enabledOptionalEvents(): OptionalEventKind[] {
  return optional.enabled();
}

/** `{typeId, states}` of a block permutation. */
function permutationInfo(permutation: BlockPermutation): Record<string, unknown> {
  return { typeId: permutation.type.id, states: { ...permutation.getAllStates() } };
}

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
    // Off is the common case for opt-in kinds: return before reading anything.
    if (isOptionalEventKind(kind) && !optional.isOn(kind)) return;
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

  // Opt-in kinds (ADR-0014). Subscribed once here, like the kinds above; `record` drops them while they are off.
  world.afterEvents.playerBreakBlock.subscribe((e) =>
    record("block_break", () => {
      const data: Record<string, unknown> = {
        player: playerRef(e.player),
        dimension: e.dimension.id,
        position: vec(e.block.location),
        block: permutationInfo(e.brokenBlockPermutation),
      };
      if (e.itemStackBeforeBreak) data.item = e.itemStackBeforeBreak.typeId;
      return data;
    }),
  );
  world.afterEvents.playerPlaceBlock.subscribe((e) =>
    record("block_place", () => ({
      player: playerRef(e.player),
      dimension: e.dimension.id,
      position: vec(e.block.location),
      block: permutationInfo(e.block.permutation),
    })),
  );
  world.afterEvents.entityHurt.subscribe((e) =>
    record("entity_hurt", () => {
      const hurt = e.hurtEntity;
      const attacker = e.damageSource.damagingEntity;
      // As for entity_die: only damage a player takes or deals, so mob fights and farms cannot flood the log.
      if (!(hurt instanceof Player) && !(attacker instanceof Player)) return undefined;
      const data: Record<string, unknown> = { entity: entityRef(hurt), damage: e.damage, cause: e.damageSource.cause };
      if (hurt.isValid) {
        data.health = healthOf(hurt);
        data.dimension = hurt.dimension.id;
        data.location = vec(hurt.location);
      }
      if (attacker) data.attacker = entityRef(attacker);
      const projectile = e.damageSource.damagingProjectile;
      if (projectile) data.projectile = projectile.typeId;
      return data;
    }),
  );
  world.afterEvents.effectAdd.subscribe(
    (e) =>
      record("effect_add", () => {
        if (!(e.entity instanceof Player)) return undefined;
        return { player: playerRef(e.entity), effect: { typeId: e.effect.typeId, amplifier: e.effect.amplifier, duration: e.effect.duration } };
      }),
    // Players only, filtered by the game so effects on mobs never reach the script.
    { entityTypes: ["minecraft:player"] },
  );
  world.afterEvents.itemUse.subscribe((e) =>
    record("item_use", () => ({ player: playerRef(e.source), item: { typeId: e.itemStack.typeId, amount: e.itemStack.amount } })),
  );
  world.afterEvents.explosion.subscribe((e) =>
    record("explosion", () => {
      const impacted = e.getImpactedBlocks().map((block) => vec(block.location));
      const data: Record<string, unknown> = { dimension: e.dimension.id, impactedBlocks: impacted.length };
      const bounds = blockBounds(impacted);
      if (bounds) data.bounds = bounds;
      // The source (TNT, creeper, crystal) is already gone here, so it has no location; `bounds` shows where.
      if (e.source) data.source = entityRef(e.source);
      return data;
    }),
  );
  world.afterEvents.weatherChange.subscribe((e) =>
    record("weather_change", () => ({ dimension: fullDimensionId(e.dimension), from: e.previousWeather, to: e.newWeather })),
  );
  world.afterEvents.entitySpawn.subscribe((e) =>
    record("entity_spawn", () => {
      const entity = e.entity;
      if (IGNORED_SPAWN_CAUSES.includes(e.cause) || !entity.isValid) return undefined;
      const dimension = entity.dimension.id;
      const location = vec(entity.location);
      // Only near a player: natural spawning far away would otherwise flood the log.
      const players = world.getAllPlayers().filter((p) => p.isValid && p.dimension.id === dimension);
      if (!isNearAny(location, players.map((p) => p.location), EVENT_LIMITS.eventPlayerRadius)) return undefined;
      return { entity: entityRef(entity), cause: e.cause, dimension, location };
    }),
  );
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

/**
 * `subscribe`: turns opt-in event kinds on and off (docs/PROTOCOL.md §5.14, ADR-0014). Without parameters it only
 * reports the state. The switch is shared by every tool on this server and lives in memory only.
 */
export const subscribe: MethodHandler<RequestContext> = (params) => {
  expectOnlyKeys(params, SUBSCRIBE_KEYS);
  const query = parseSubscribeQuery(params);
  const changed = optional.apply(query.enable, query.disable);
  return { data: { optional: [...OPTIONAL_EVENT_KINDS], enabled: optional.enabled(), changed } };
};
