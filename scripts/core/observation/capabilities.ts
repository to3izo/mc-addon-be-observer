import { buildCapabilities } from "../../shared/protocol/capabilities.ts";
import type { MethodHandler } from "../../shared/protocol/dispatch.ts";
import { expectOnlyKeys } from "../../shared/protocol/params.ts";
import type { RequestContext } from "./context.ts";

/** `capabilities`: versions, methods and limits of this build. Takes no parameters. */
export const capabilities: MethodHandler<RequestContext> = (params) => {
  expectOnlyKeys(params, []);
  return { data: buildCapabilities() };
};
