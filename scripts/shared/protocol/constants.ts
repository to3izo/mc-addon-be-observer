import { NAMESPACE } from "../constants/addon.ts";

/** Version of the public protocol (docs/PROTOCOL.md). Changes only for incompatible changes. */
export const PROTOCOL_VERSION = 1;

/** Protocol versions this build answers. */
export const SUPPORTED_PROTOCOLS: readonly number[] = [PROTOCOL_VERSION];

/** Script event id that carries requests: `/scriptevent to3izo_bo:query <json>`. */
export const REQUEST_EVENT_ID = `${NAMESPACE}:query`;

/** Marks a machine-readable response line. Exactly one JSON object follows it on the same line. */
export const RESPONSE_PREFIX = `${NAMESPACE}.response `;

/**
 * Size limits of every request and response, in JavaScript string length (UTF-16 code units).
 * Provisional values (ADR-0007): finalised by in-game measurement in Phase 2 (docs/ROADMAP.md), published in
 * `capabilities`.
 * `maxRequestChars` matches the documented 2048-character limit of the /scriptevent message.
 */
export const SIZE_LIMITS = {
  maxRequestChars: 2048,
  /** Whole response line, prefix included. */
  maxResponseChars: 4000,
} as const;
