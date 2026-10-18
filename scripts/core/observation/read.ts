import {
  EquipmentSlot,
  InvalidEntityError,
  LocationInUnloadedChunkError,
  LocationOutOfWorldBoundariesError,
  Player,
  world,
  type Block,
  type Container,
  type Dimension,
  type Entity,
  type Vector3,
} from "@minecraft/server";
import { ObserverError } from "../../shared/protocol/errors.ts";
import type { BlockPosition, Location } from "../../shared/protocol/params.ts";

/**
 * Read-only helpers that turn Script API objects into plain JSON values (DTOs). Nothing here changes the
 * world: only getters, `getComponent`, `getItem`, `getEquipment`, `getBlock`, `isChunkLoaded` are used.
 */

export function vec(v: Vector3): Location {
  return { x: v.x, y: v.y, z: v.z };
}

/** Runs a read on an entity and reports an entity that disappeared meanwhile as TARGET_INVALID. */
export function readEntity<T>(what: string, read: () => T): T {
  try {
    return read();
  } catch (error) {
    if (error instanceof InvalidEntityError) throw new ObserverError("TARGET_INVALID", `${what} is no longer valid`);
    throw error;
  }
}

export function playerRef(player: Player): { id: string; name: string } {
  return { id: player.id, name: player.name };
}

/** `player` data (docs/PROTOCOL.md §5.3) without optional sections. */
export function playerState(player: Player): Record<string, unknown> {
  return readEntity("the player", () => {
    const rotation = player.getRotation();
    return {
      id: player.id,
      name: player.name,
      dimension: player.dimension.id,
      location: vec(player.location),
      headLocation: vec(player.getHeadLocation()),
      rotation: { pitch: rotation.x, yaw: rotation.y },
      viewDirection: vec(player.getViewDirection()),
      velocity: vec(player.getVelocity()),
      movement: {
        onGround: player.isOnGround,
        sneaking: player.isSneaking,
        sprinting: player.isSprinting,
        swimming: player.isSwimming,
        falling: player.isFalling,
        inWater: player.isInWater,
        flying: player.isFlying,
        gliding: player.isGliding,
        climbing: player.isClimbing,
        sleeping: player.isSleeping,
        jumping: player.isJumping,
      },
      gameMode: player.getGameMode(),
      selectedSlot: player.selectedSlotIndex,
    };
  });
}

/** `health` section: null when the entity has no health component. */
export function healthOf(entity: Entity): { current: number; max: number } | null {
  return readEntity("the player", () => {
    const health = entity.getComponent("minecraft:health");
    return health ? { current: health.currentValue, max: health.effectiveMax } : null;
  });
}

interface ItemSummary {
  typeId: string;
  amount: number;
  nameTag?: string;
}

function itemSummary(item: { typeId: string; amount: number; nameTag?: string | undefined }): ItemSummary {
  return item.nameTag ? { typeId: item.typeId, amount: item.amount, nameTag: item.nameTag } : { typeId: item.typeId, amount: item.amount };
}

/**
 * `{size, emptySlots, items}` of a container: occupied slots from `fromSlot` on, in slot order, below slot
 * `maxSlots`. Null when there is no valid container. The list may be truncated to fit (`items`).
 */
function containerSummary(container: Container | undefined, fromSlot: number, maxSlots: number): Record<string, unknown> | null {
  if (!container || !container.isValid) return null;
  const end = Math.min(container.size, maxSlots);
  const items: Array<ItemSummary & { slot: number }> = [];
  for (let slot = fromSlot; slot < end; slot++) {
    const item = container.getItem(slot);
    if (item) items.push({ slot, ...itemSummary(item) });
  }
  return { size: container.size, emptySlots: container.emptySlotsCount, items };
}

/** `inventory` section (docs/PROTOCOL.md §5.3). */
export function inventoryOf(entity: Entity, maxSlots: number): Record<string, unknown> | null {
  return readEntity("the player", () => containerSummary(entity.getComponent("minecraft:inventory")?.container, 0, maxSlots));
}

const EQUIPMENT_SLOTS: readonly EquipmentSlot[] = [
  EquipmentSlot.Head,
  EquipmentSlot.Chest,
  EquipmentSlot.Legs,
  EquipmentSlot.Feet,
  EquipmentSlot.Mainhand,
  EquipmentSlot.Offhand,
];

/** `equipment` section: each slot's item, or null when empty. */
export function equipmentOf(entity: Entity): Record<string, ItemSummary | null> | null {
  return readEntity("the player", () => {
    const equippable = entity.getComponent("minecraft:equippable");
    if (!equippable) return null;
    const slots: Record<string, ItemSummary | null> = {};
    for (const slot of EQUIPMENT_SLOTS) {
      const item = equippable.getEquipment(slot);
      slots[slot] = item ? itemSummary(item) : null;
    }
    return slots;
  });
}

/** `world` section. */
export function worldTime(): Record<string, number> {
  return { timeOfDay: world.getTimeOfDay(), day: world.getDay(), absoluteTime: world.getAbsoluteTime() };
}

export function blockInfo(block: Block): Record<string, unknown> {
  return {
    typeId: block.typeId,
    states: { ...block.permutation.getAllStates() },
    isAir: block.isAir,
    isLiquid: block.isLiquid,
    isWaterlogged: block.isWaterlogged,
  };
}

/**
 * Reads one block with `read` and answers `{dimension, position, status, ...}`. Never loads a chunk: an unloaded
 * chunk is reported as `unloaded`, a height outside the dimension as `out_of_bounds`.
 */
function readBlockWith(dimension: Dimension, position: BlockPosition, read: (block: Block) => Record<string, unknown>): Record<string, unknown> {
  const base = { dimension: dimension.id, position: { x: position.x, y: position.y, z: position.z } };
  const range = dimension.heightRange;
  // heightRange.max is the first height above the world (e.g. 320 in the overworld).
  if (position.y < Number(range.min) || position.y >= Number(range.max)) return { ...base, status: "out_of_bounds" };
  if (!dimension.isChunkLoaded(position)) return { ...base, status: "unloaded" };
  try {
    const block = dimension.getBlock(position);
    if (!block) return { ...base, status: "unloaded" };
    return { ...base, status: "ok", ...read(block) };
  } catch (error) {
    if (error instanceof LocationInUnloadedChunkError) return { ...base, status: "unloaded" };
    if (error instanceof LocationOutOfWorldBoundariesError) return { ...base, status: "out_of_bounds" };
    return { ...base, status: "error", reason: error instanceof Error ? error.name : "unknown" };
  }
}

/** One block as `block` answers it (docs/PROTOCOL.md §5.4). */
export function readBlockAt(dimension: Dimension, position: BlockPosition): Record<string, unknown> {
  return readBlockWith(dimension, position, (block) => ({ block: blockInfo(block) }));
}

/**
 * One block's container as `container` answers it (docs/PROTOCOL.md §5.16, ADR-0015): `container` is null when the
 * block has no inventory. Only the inventory component's getters and `getItem` are used; nothing is opened.
 */
export function readContainerAt(dimension: Dimension, position: BlockPosition, fromSlot: number, maxSlots: number): Record<string, unknown> {
  return readBlockWith(dimension, position, (block) => ({
    block: { typeId: block.typeId },
    container: containerSummary(block.getComponent("minecraft:inventory")?.container, fromSlot, maxSlots),
  }));
}

export function distance(a: Vector3, b: Vector3): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

/** `{name}` for players, `{nameTag}` for entities with a custom name, `{}` otherwise. */
function labelOf(entity: Entity): Record<string, string> {
  return entity instanceof Player ? { name: entity.name } : entity.nameTag ? { nameTag: entity.nameTag } : {};
}

/** Active status effects (`effects` section): type id, amplifier (0 = level I) and remaining ticks. */
export function effectsOf(entity: Entity): Array<{ typeId: string; amplifier: number; duration: number }> {
  return entity.getEffects().map((effect) => ({ typeId: effect.typeId, amplifier: effect.amplifier, duration: effect.duration }));
}

/** One entity in `entities` / `target.entity`. Players also get their name; a custom name tag is added when set. */
export function entitySummary(entity: Entity, from: Vector3, withEffects = false): Record<string, unknown> {
  const summary: Record<string, unknown> = {
    id: entity.id,
    typeId: entity.typeId,
    ...labelOf(entity),
    location: vec(entity.location),
    distance: distance(entity.location, from),
  };
  return withEffects ? { ...summary, effects: effectsOf(entity) } : summary;
}

/** One entity as `entity` answers it (docs/PROTOCOL.md §5.10). */
export function entityDetail(entity: Entity): Record<string, unknown> {
  return readEntity("the entity", () => {
    const rotation = entity.getRotation();
    const health = entity.getComponent("minecraft:health");
    return {
      id: entity.id,
      typeId: entity.typeId,
      ...labelOf(entity),
      dimension: entity.dimension.id,
      location: vec(entity.location),
      rotation: { pitch: rotation.x, yaw: rotation.y },
      velocity: vec(entity.getVelocity()),
      health: health ? { current: health.currentValue, max: health.effectiveMax } : null,
      effects: effectsOf(entity),
    };
  });
}
