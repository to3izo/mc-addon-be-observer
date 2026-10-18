import { PARAM_LIMITS } from "../../shared/protocol/constants.ts";
import type { MethodHandler } from "../../shared/protocol/dispatch.ts";
import { expectOnlyKeys, parseBlockPosition, parseDimension, readBlockPositions } from "../../shared/protocol/params.ts";
import type { RequestContext } from "./context.ts";
import { readBlockAt } from "./read.ts";
import { resolveDimension } from "./resolve.ts";

/** `block`: one block by integer coordinates (docs/PROTOCOL.md §5.4). */
export const block: MethodHandler<RequestContext> = (params, context) => {
  expectOnlyKeys(params, ["dimension", "x", "y", "z"]);
  const position = parseBlockPosition({ x: params.x, y: params.y, z: params.z }, "");
  const dimension = resolveDimension(parseDimension(params.dimension), context.sourcePlayer);
  return { data: readBlockAt(dimension, position) };
};

/** `blocks`: a few blocks, answered in request order (docs/PROTOCOL.md §5.5). */
export const blocks: MethodHandler<RequestContext> = (params, context) => {
  expectOnlyKeys(params, ["dimension", "positions"]);
  const positions = readBlockPositions(params, "positions", PARAM_LIMITS.maxBlocksPerRequest);
  const dimension = resolveDimension(parseDimension(params.dimension), context.sourcePlayer);
  return { data: { dimension: dimension.id, results: positions.map((position) => readBlockAt(dimension, position)) } };
};
