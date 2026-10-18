import { SIZE_LIMITS } from "./constants.ts";
import { errorBodyOf } from "./errors.ts";
import { isMethodName, type MethodName } from "./methods.ts";
import { parseRequest } from "./request.ts";
import { errorEnvelope, successEnvelope, type ResponseEnvelope, type ResponseMeta, type TruncatablePath } from "./response.ts";

/** What a method handler returns: plain-JSON data, and the lists that may be shortened to fit. */
export interface MethodResult {
  data: Record<string, unknown>;
  truncatable?: readonly TruncatablePath[];
}

/** A method handler. It reads the game (through the context and the Script API) and never changes it. */
export type MethodHandler<Context> = (params: Record<string, unknown>, context: Context) => MethodResult;

export type MethodTable<Context> = Readonly<Record<MethodName, MethodHandler<Context>>>;

export interface HandledRequest {
  envelope: ResponseEnvelope;
  truncatable: readonly TruncatablePath[];
  /** The unexpected exception behind an INTERNAL_ERROR answer, for a diagnostic line. */
  failure?: unknown;
}

/**
 * Turns one request message into exactly one response envelope. Never throws: validation problems,
 * ObserverErrors and known Script API errors become protocol errors, anything else becomes INTERNAL_ERROR.
 */
export function handleRequest<Context>(
  message: string,
  context: Context,
  meta: ResponseMeta,
  methods: MethodTable<Context>,
  maxRequestChars: number = SIZE_LIMITS.maxRequestChars,
): HandledRequest {
  const parsed = parseRequest(message, maxRequestChars);
  if (!parsed.ok) return { envelope: errorEnvelope(parsed.requestId, parsed.method, meta, parsed.error), truncatable: [] };

  const { requestId, method, params } = parsed.request;
  if (!isMethodName(method)) {
    return {
      envelope: errorEnvelope(requestId, method, meta, { code: "UNKNOWN_METHOD", message: `unknown method "${method}"`, details: { method } }),
      truncatable: [],
    };
  }

  try {
    const result = methods[method](params, context);
    return { envelope: successEnvelope(requestId, method, meta, result.data), truncatable: result.truncatable ?? [] };
  } catch (error) {
    const known = errorBodyOf(error);
    if (known) return { envelope: errorEnvelope(requestId, method, meta, known), truncatable: [] };
    return {
      envelope: errorEnvelope(requestId, method, meta, { code: "INTERNAL_ERROR", message: "the observation failed unexpectedly" }),
      truncatable: [],
      failure: error,
    };
  }
}
