import { SIZE_LIMITS, SUPPORTED_PROTOCOLS } from "./constants.ts";
import { isRecord, type ErrorBody } from "./errors.ts";

/** A request that passed envelope validation. The method name is checked later by the dispatcher. */
export interface ObserverRequest {
  protocol: number | undefined;
  requestId: string;
  method: string;
  params: Record<string, unknown>;
}

export type ParsedRequest =
  | { ok: true; request: ObserverRequest }
  | { ok: false; requestId: string | null; method: string | null; error: ErrorBody };

export const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,64}$/;
/** Well-formed method names; anything else is INVALID_REQUEST, a well-formed unknown name UNKNOWN_METHOD. */
export const METHOD_NAME_PATTERN = /^[a-z][A-Za-z0-9_]{0,63}$/;

const REQUEST_ID_IN_TEXT = /"requestId"\s*:\s*"([A-Za-z0-9._:-]{1,64})"/;
const TOP_LEVEL_KEYS = new Set(["protocol", "requestId", "method", "params"]);

/**
 * Best-effort `requestId` for a message that cannot be parsed, so the tool can still match the error
 * to its request. Only a well-formed id is returned.
 */
export function recoverRequestId(message: string, maxChars: number = SIZE_LIMITS.maxRequestChars): string | null {
  const match = REQUEST_ID_IN_TEXT.exec(message.slice(0, maxChars));
  return match?.[1] ?? null;
}

/** Validates the request envelope (docs/PROTOCOL.md §2). Never throws. */
export function parseRequest(message: string, maxChars: number = SIZE_LIMITS.maxRequestChars): ParsedRequest {
  const fail = (requestId: string | null, method: string | null, error: ErrorBody): ParsedRequest => ({ ok: false, requestId, method, error });

  // The length is checked before parsing so an oversized message costs no JSON work.
  if (message.length > maxChars) {
    return fail(recoverRequestId(message, maxChars), null, {
      code: "REQUEST_TOO_LARGE",
      message: `request is ${message.length} characters; the limit is ${maxChars}`,
      details: { limit: maxChars, length: message.length },
    });
  }

  let value: unknown;
  try {
    value = JSON.parse(message);
  } catch {
    return fail(recoverRequestId(message, maxChars), null, { code: "INVALID_JSON", message: "request is not valid JSON" });
  }
  if (!isRecord(value)) {
    return fail(recoverRequestId(message, maxChars), null, { code: "INVALID_JSON", message: "request must be one JSON object" });
  }

  const { requestId, method, params, protocol } = value;
  if (typeof requestId !== "string" || !REQUEST_ID_PATTERN.test(requestId)) {
    return fail(null, null, {
      code: "INVALID_REQUEST",
      message: "requestId must be a string of 1-64 characters from [A-Za-z0-9._:-]",
      details: { field: "requestId" },
    });
  }
  if (typeof method !== "string" || !METHOD_NAME_PATTERN.test(method)) {
    return fail(requestId, null, { code: "INVALID_REQUEST", message: "method must be a method name such as \"players\"", details: { field: "method" } });
  }
  for (const key of Object.keys(value)) {
    if (!TOP_LEVEL_KEYS.has(key)) {
      return fail(requestId, method, { code: "INVALID_REQUEST", message: `unknown field "${key}"`, details: { field: key } });
    }
  }
  if (protocol !== undefined) {
    if (typeof protocol !== "number" || !Number.isInteger(protocol)) {
      return fail(requestId, method, { code: "INVALID_REQUEST", message: "protocol must be an integer", details: { field: "protocol" } });
    }
    if (!SUPPORTED_PROTOCOLS.includes(protocol)) {
      return fail(requestId, method, {
        code: "UNSUPPORTED_PROTOCOL",
        message: `protocol ${protocol} is not supported`,
        details: { supported: [...SUPPORTED_PROTOCOLS] },
      });
    }
  }
  if (params !== undefined && !isRecord(params)) {
    return fail(requestId, method, { code: "INVALID_REQUEST", message: "params must be a JSON object", details: { field: "params" } });
  }

  return { ok: true, request: { protocol, requestId, method, params: params ?? {} } };
}
