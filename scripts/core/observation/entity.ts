import { world } from "@minecraft/server";
import type { MethodHandler } from "../../shared/protocol/dispatch.ts";
import { ObserverError } from "../../shared/protocol/errors.ts";
import { expectOnlyKeys, readOptionalString } from "../../shared/protocol/params.ts";
import type { RequestContext } from "./context.ts";
import { entityDetail } from "./read.ts";

/**
 * `entity`: one entity by id (docs/PROTOCOL.md §5.10), e.g. to follow a mob or player found by `entities`.
 * An entity in an unloaded chunk, dead or despawned is ENTITY_NOT_FOUND.
 */
export const entity: MethodHandler<RequestContext> = (params) => {
  expectOnlyKeys(params, ["id"]);
  const id = readOptionalString(params, "id");
  if (!id) throw new ObserverError("INVALID_PARAMS", "id is required", { param: "id" });
  const found = world.getEntity(id);
  if (!found || !found.isValid) throw new ObserverError("ENTITY_NOT_FOUND", `no loaded entity with id "${id}"`);
  return { data: entityDetail(found) };
};
