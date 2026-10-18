import { PROTOCOL_VERSION, RESPONSE_PREFIX } from "./constants.ts";
import { isRecord, type ErrorBody } from "./errors.ts";

/** Values that identify when and in which script session a response was produced. */
export interface ResponseMeta {
  /** `system.currentTick` when the observation was taken. */
  tick: number;
  /** Random id chosen when the script started; changes on /reload or restart. */
  session: string;
  /** Response counter within the session, from 1. */
  seq: number;
  /** `Date.now()` on the machine running the script. Not synchronised with the tool's clock. */
  time: number;
}

interface EnvelopeFields extends ResponseMeta {
  protocol: number;
  requestId: string | null;
  method: string | null;
}

export type SuccessEnvelope = EnvelopeFields & { ok: true; data: Record<string, unknown> };
export type ErrorEnvelope = EnvelopeFields & { ok: false; error: ErrorBody };
export type ResponseEnvelope = SuccessEnvelope | ErrorEnvelope;

/**
 * A list inside `data` that may be shortened to fit the size limit: the keys leading from `data` to the
 * array. The object holding the array gets `truncated: true` and `omitted: {<key>: <count>}`.
 */
export type TruncatablePath = readonly string[];

// Key order matches docs/PROTOCOL.md so lines are easy to read by eye.
export function successEnvelope(requestId: string, method: string, meta: ResponseMeta, data: Record<string, unknown>): SuccessEnvelope {
  return { protocol: PROTOCOL_VERSION, requestId, ok: true, method, tick: meta.tick, session: meta.session, seq: meta.seq, time: meta.time, data };
}

export function errorEnvelope(requestId: string | null, method: string | null, meta: ResponseMeta, error: ErrorBody): ErrorEnvelope {
  return { protocol: PROTOCOL_VERSION, requestId, ok: false, method, tick: meta.tick, session: meta.session, seq: meta.seq, time: meta.time, error };
}

const NON_ASCII = /[\u007f-\uffff]/g;

/**
 * Serialises an envelope as one log line: the prefix followed by JSON on a single line, in pure ASCII.
 * JSON.stringify already escapes control characters and CR/LF; every other non-ASCII character (and DEL)
 * is written as a \uXXXX escape. BDS on Windows writes its console in the system code page (CP932 on a
 * Japanese system), which would garble UTF-8 text; ASCII survives any console encoding, and U+2028/U+2029
 * can no longer look like line breaks.
 */
export function formatResponseLine(envelope: ResponseEnvelope): string {
  return RESPONSE_PREFIX + JSON.stringify(envelope).replace(NON_ASCII, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`);
}

export interface RenderOptions {
  /** Longest allowed line, prefix included. */
  maxChars: number;
  truncatable?: readonly TruncatablePath[];
}

/**
 * Renders a response line that fits `maxChars`: lists named in `truncatable` are shortened from the end
 * (marked `truncated`/`omitted`); if it still does not fit, the answer becomes RESPONSE_TOO_LARGE.
 * Single values are never cut, and a line is never cut in the middle.
 */
export function renderResponseLine(envelope: ResponseEnvelope, options: RenderOptions): string {
  const line = formatResponseLine(envelope);
  if (line.length <= options.maxChars) return line;

  if (envelope.ok && options.truncatable?.length) {
    // Work on a JSON copy: the data is plain JSON by contract.
    let data = JSON.parse(JSON.stringify(envelope.data)) as Record<string, unknown>;
    for (const path of options.truncatable) {
      const fitted = shortenList(data, path, (candidate) => formatResponseLine({ ...envelope, data: candidate }).length <= options.maxChars);
      if (!fitted) continue;
      data = fitted.data;
      if (fitted.fits) return formatResponseLine({ ...envelope, data });
    }
  }

  return formatResponseLine(
    errorEnvelope(envelope.requestId, envelope.method, envelope, {
      code: "RESPONSE_TOO_LARGE",
      message: `response would be ${line.length} characters; the limit is ${options.maxChars}. Ask for less.`,
      details: { limit: options.maxChars, length: line.length },
    }),
  );
}

/** Keeps the longest prefix of the list at `path` for which `fits` holds (binary search). */
function shortenList(
  data: Record<string, unknown>,
  path: TruncatablePath,
  fits: (candidate: Record<string, unknown>) => boolean,
): { data: Record<string, unknown>; fits: boolean } | undefined {
  const key = path[path.length - 1];
  if (key === undefined) return undefined;
  const parentOf = (root: Record<string, unknown>): Record<string, unknown> | undefined => {
    let node: unknown = root;
    for (const step of path.slice(0, -1)) node = isRecord(node) ? node[step] : undefined;
    return isRecord(node) ? node : undefined;
  };
  const original = parentOf(data)?.[key];
  if (!Array.isArray(original)) return undefined;

  const withLength = (keep: number): Record<string, unknown> => {
    const copy = JSON.parse(JSON.stringify(data)) as Record<string, unknown>;
    const parent = parentOf(copy)!;
    parent[key] = original.slice(0, keep);
    if (keep < original.length) {
      parent.truncated = true;
      const omitted = isRecord(parent.omitted) ? parent.omitted : {};
      parent.omitted = { ...omitted, [key]: original.length - keep };
    }
    return copy;
  };

  // The full length is a candidate too: an earlier list may already have been shortened enough.
  let low = 0;
  let high = original.length;
  let best = -1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (fits(withLength(mid))) {
      best = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return best === -1 ? { data: withLength(0), fits: false } : { data: withLength(best), fits: true };
}
