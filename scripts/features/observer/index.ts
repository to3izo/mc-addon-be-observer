import { Player, system, type ScriptEventCommandMessageAfterEvent } from "@minecraft/server";
import type { RequestContext } from "../../core/observation/context.ts";
import { watchGameEvents } from "../../core/observation/events.ts";
import { OBSERVATION_METHODS } from "../../core/observation/methods.ts";
import type { Feature } from "../../core/runtime/feature.ts";
import { ADDON_SLUG, NAMESPACE } from "../../shared/constants/addon.ts";
import { REQUEST_EVENT_ID, SIZE_LIMITS } from "../../shared/protocol/constants.ts";
import { handleRequest } from "../../shared/protocol/dispatch.ts";
import { formatEventLine } from "../../shared/protocol/events.ts";
import { errorEnvelope, renderResponseLine, type ResponseMeta } from "../../shared/protocol/response.ts";
import { createSessionId } from "../../shared/protocol/session.ts";

const LOG_TAG = `[${ADDON_SLUG}] observer:`;

/**
 * Read-only observation over `/scriptevent to3izo_bo:query <json>` (docs/PROTOCOL.md, ADR-0003).
 * Each request is answered by exactly one `to3izo_bo.response {json}` log line, and selected game events are
 * pushed as `to3izo_bo.event {json}` lines (ADR-0008). Nothing runs per tick.
 */
export const observerFeature: Feature = {
  id: "observer",
  register() {
    const session = createSessionId();
    let seq = 0;

    system.afterEvents.scriptEventReceive.subscribe(
      (event) => {
        if (event.id !== REQUEST_EVENT_ID) {
          // Other ids in the namespace are reserved; answer nothing so a typo cannot look like a reply.
          console.warn(`${LOG_TAG} ignored script event "${event.id}"; requests use "${REQUEST_EVENT_ID}"`);
          return;
        }
        seq += 1;
        const meta: ResponseMeta = { tick: system.currentTick, session, seq, time: Date.now() };
        emitResponse(answer(event, meta));
      },
      { namespaces: [NAMESPACE] },
    );

    // Game events (ADR-0008): one `to3izo_bo.event {json}` line each, on the same channel as responses.
    watchGameEvents(
      (event) => console.log(formatEventLine(event, session)),
      (kind, error) => console.warn(`${LOG_TAG} ${kind} event could not be read: ${String(error)}`),
    );
  },
};

function answer(event: ScriptEventCommandMessageAfterEvent, meta: ResponseMeta): string {
  try {
    const handled = handleRequest(event.message, contextOf(event), meta, OBSERVATION_METHODS);
    if (handled.failure !== undefined) {
      console.warn(`${LOG_TAG} ${handled.envelope.method ?? "request"} failed: ${String(handled.failure)}`);
    }
    return renderResponseLine(handled.envelope, { maxChars: SIZE_LIMITS.maxResponseChars, truncatable: handled.truncatable });
  } catch (error) {
    // Last guard (e.g. data that cannot be serialised): the request still gets its one answer.
    console.warn(`${LOG_TAG} could not answer: ${String(error)}`);
    const fallback = errorEnvelope(null, null, meta, { code: "INTERNAL_ERROR", message: "the response could not be produced" });
    return renderResponseLine(fallback, { maxChars: SIZE_LIMITS.maxResponseChars });
  }
}

function contextOf(event: ScriptEventCommandMessageAfterEvent): RequestContext {
  const source = event.sourceEntity;
  return {
    sourceType: event.sourceType,
    sourcePlayer: source instanceof Player && source.isValid ? source : undefined,
  };
}

/**
 * Writes the machine-readable line. On BDS, `console.log` reaches standard output when
 * `content-log-console-output-enabled=true` (ADR-0003, ADR-0006). `console.warn` is not used because warnings
 * are shown on a client's in-game content log overlay.
 */
function emitResponse(line: string): void {
  console.log(line);
}
