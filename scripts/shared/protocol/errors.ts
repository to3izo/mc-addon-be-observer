/**
 * Error codes of the public protocol (docs/PROTOCOL.md §6).
 * Codes are a stable contract: add new ones, never rename or remove one.
 */
export const ERROR_CODES = [
  "REQUEST_TOO_LARGE",
  "INVALID_JSON",
  "INVALID_REQUEST",
  "UNSUPPORTED_PROTOCOL",
  "UNKNOWN_METHOD",
  "INVALID_PARAMS",
  "LIMIT_EXCEEDED",
  "NO_SOURCE_PLAYER",
  "PLAYER_NOT_FOUND",
  "DIMENSION_NOT_FOUND",
  "TARGET_INVALID",
  "RESPONSE_TOO_LARGE",
  "INTERNAL_ERROR",
  "ENTITY_NOT_FOUND",
  "UNLOADED_CHUNK",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

/** The `error` member of a failed response. `message` is for humans; tools branch on `code`. */
export interface ErrorBody {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

/** Thrown by validators and method handlers to answer with a protocol error instead of INTERNAL_ERROR. */
export class ObserverError extends Error {
  readonly code: ErrorCode;
  readonly details: Record<string, unknown> | undefined;

  constructor(code: ErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "ObserverError";
    this.code = code;
    this.details = details;
  }

  toBody(): ErrorBody {
    return this.details ? { code: this.code, message: this.message, details: this.details } : { code: this.code, message: this.message };
  }
}

/**
 * Script API errors, by their stable `name`, and the protocol code each one means. Matching by name keeps this
 * table free of `@minecraft/server` imports (and unit-testable).
 */
const SCRIPT_ERROR_CODES: Readonly<Record<string, ErrorCode>> = {
  InvalidEntityError: "TARGET_INVALID",
  LocationInUnloadedChunkError: "UNLOADED_CHUNK",
  UnloadedChunksError: "UNLOADED_CHUNK",
  LocationOutOfWorldBoundariesError: "INVALID_PARAMS",
  ArgumentOutOfBoundsError: "INVALID_PARAMS",
  InvalidArgumentError: "INVALID_PARAMS",
  PropertyOutOfBoundsError: "INVALID_PARAMS",
  EntityQueryError: "INVALID_PARAMS",
  NamespaceNameError: "INVALID_PARAMS",
};

/**
 * The protocol error for a thrown value: an ObserverError's own body, a known Script API error mapped by
 * name, or `undefined` for anything unexpected (answered as INTERNAL_ERROR by the caller).
 */
export function errorBodyOf(error: unknown): ErrorBody | undefined {
  if (error instanceof ObserverError) return error.toBody();
  if (error instanceof Error) {
    const code = SCRIPT_ERROR_CODES[error.name];
    if (code) return { code, message: error.message || error.name, details: { scriptError: error.name } };
  }
  return undefined;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
