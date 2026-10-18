import { NAMESPACE } from "../constants/addon.ts";

/** Version of the public protocol (docs/PROTOCOL.md). Changes only for incompatible changes. */
export const PROTOCOL_VERSION = 1;

/** Protocol versions this build answers. */
export const SUPPORTED_PROTOCOLS: readonly number[] = [PROTOCOL_VERSION];

/** Script event id that carries requests: `/scriptevent to3izo_bo:query <json>`. */
export const REQUEST_EVENT_ID = `${NAMESPACE}:query`;

/**
 * Custom command that carries requests without cheats, for operators: `/to3izo_bo:query "<json>"` (ADR-0010).
 * The JSON is one quoted string argument.
 */
export const REQUEST_COMMAND_NAME = `${NAMESPACE}:query`;

/** Marks a machine-readable response line. Exactly one JSON object follows it on the same line. */
export const RESPONSE_PREFIX = `${NAMESPACE}.response `;

/**
 * Size limits of every request and response, in JavaScript string length (UTF-16 code units), published in
 * `capabilities`. Confirmed on BDS in Phase 2 (ADR-0007): `maxRequestChars` matches the 2048-character limit of
 * the BDS console, and a 3,965-character response line reached standard output intact.
 */
export const SIZE_LIMITS = {
  maxRequestChars: 2048,
  /** Whole response line, prefix included. */
  maxResponseChars: 4000,
} as const;

/** Upper limits of request parameters (ADR-0007). Above them a request is LIMIT_EXCEEDED. */
export const PARAM_LIMITS = {
  maxBlocksPerRequest: 32,
  maxRayDistance: 64,
  maxEntityRadius: 32,
  maxEntities: 32,
  maxInventorySlots: 54,
  maxScoreEntries: 64,
} as const;

/** Values used when a request leaves a parameter out. */
export const PARAM_DEFAULTS = {
  rayDistance: 8,
  entityRadius: 16,
  entityLimit: 16,
  scoreLimit: 32,
} as const;
