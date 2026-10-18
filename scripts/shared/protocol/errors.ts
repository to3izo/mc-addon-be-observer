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

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
