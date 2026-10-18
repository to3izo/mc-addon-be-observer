import type { Dimension } from "@minecraft/server";
import { PARAM_LIMITS } from "../../shared/protocol/constants.ts";
import type { MethodHandler } from "../../shared/protocol/dispatch.ts";
import { errorBodyOf } from "../../shared/protocol/errors.ts";
import { expectOnlyKeys, parseColumn, parseDimension, readColumns, type Column } from "../../shared/protocol/params.ts";
import type { RequestContext } from "./context.ts";
import { blockInfo, vec } from "./read.ts";
import { resolveDimension } from "./resolve.ts";

/**
 * The topmost non-air block of one column (docs/PROTOCOL.md §5.11): where the ground (or a roof) is.
 * Never loads a chunk: an unloaded column is `unloaded`, a column with only air is `empty`.
 */
export function readTopAt(dimension: Dimension, column: Column): Record<string, unknown> {
  const base = { dimension: dimension.id, column: { x: column.x, z: column.z } };
  if (!dimension.isChunkLoaded({ x: column.x, y: Number(dimension.heightRange.min), z: column.z })) return { ...base, status: "unloaded" };
  try {
    const block = dimension.getTopmostBlock({ x: column.x, z: column.z });
    if (!block) return { ...base, status: "empty" };
    return { ...base, status: "ok", position: vec(block.location), block: blockInfo(block) };
  } catch (error) {
    const known = errorBodyOf(error);
    if (known?.code === "UNLOADED_CHUNK") return { ...base, status: "unloaded" };
    return { ...base, status: "error", reason: error instanceof Error ? error.name : "unknown" };
  }
}

/** `top`: one column by `x`, `z`. */
export const top: MethodHandler<RequestContext> = (params, context) => {
  expectOnlyKeys(params, ["dimension", "x", "z"]);
  const column = parseColumn({ x: params.x, z: params.z }, "");
  const dimension = resolveDimension(parseDimension(params.dimension), context.sourcePlayer);
  return { data: readTopAt(dimension, column) };
};

/**
 * One `tops` entry: `{x, z, status}` plus `y` and `typeId` when found. Kept compact (no block states) so that
 * `maxBlocksPerRequest` columns always fit in one response; ask `top` or `block` for the details.
 */
function compactTop(top: Record<string, unknown>): Record<string, unknown> {
  const { column, status, position, block, reason } = top as {
    column: Column;
    status: string;
    position?: { y: number };
    block?: { typeId: string };
    reason?: string;
  };
  const entry: Record<string, unknown> = { x: column.x, z: column.z, status };
  if (position && block) {
    entry.y = position.y;
    entry.typeId = block.typeId;
  }
  if (reason) entry.reason = reason;
  return entry;
}

/** `tops`: up to `maxBlocksPerRequest` columns, answered in request order (a height map). */
export const tops: MethodHandler<RequestContext> = (params, context) => {
  expectOnlyKeys(params, ["dimension", "columns"]);
  const columns = readColumns(params, "columns", PARAM_LIMITS.maxBlocksPerRequest);
  const dimension = resolveDimension(parseDimension(params.dimension), context.sourcePlayer);
  return { data: { dimension: dimension.id, results: columns.map((column) => compactTop(readTopAt(dimension, column))) } };
};
