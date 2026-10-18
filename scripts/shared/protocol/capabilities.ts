import { ADDON_SLUG, NAMESPACE } from "../constants/addon.ts";
import { BUILD_INFO } from "../constants/build.ts";
import { ADDON_VERSION, SCRIPT_API_MODULES } from "../constants/version.ts";
import { PARAM_DEFAULTS, PARAM_LIMITS, PROTOCOL_VERSION, REQUEST_COMMAND_NAME, REQUEST_EVENT_ID, RESPONSE_PREFIX, SIZE_LIMITS, SUPPORTED_PROTOCOLS } from "./constants.ts";
import { EVENT_KINDS, EVENT_LIMITS, EVENT_PREFIX, OPTIONAL_EVENT_KINDS, type OptionalEventKind } from "./events.ts";
import { OPTIONAL_FEATURES, type OptionalFeature } from "./features.ts";
import { METHODS, SECTIONS } from "./methods.ts";

/**
 * `data` of the `capabilities` method (docs/PROTOCOL.md §5.1). Describes exactly this build, plus the opt-in event
 * kinds and features that are on right now (`enabled`, memory only; ADR-0014, ADR-0015).
 */
export function buildCapabilities(
  enabledEvents: readonly OptionalEventKind[] = [],
  enabledFeatures: readonly OptionalFeature[] = [],
): Record<string, unknown> {
  return {
    addon: { slug: ADDON_SLUG, namespace: NAMESPACE, version: ADDON_VERSION },
    build: { ...BUILD_INFO },
    protocol: { version: PROTOCOL_VERSION, supported: [...SUPPORTED_PROTOCOLS] },
    scriptApi: { ...SCRIPT_API_MODULES },
    transport: { requestEventId: REQUEST_EVENT_ID, requestCommand: REQUEST_COMMAND_NAME, responsePrefix: RESPONSE_PREFIX, eventPrefix: EVENT_PREFIX },
    methods: [...METHODS],
    sections: [...SECTIONS],
    events: [...EVENT_KINDS],
    optionalEvents: { kinds: [...OPTIONAL_EVENT_KINDS], enabled: [...enabledEvents] },
    optionalFeatures: { kinds: [...OPTIONAL_FEATURES], enabled: [...enabledFeatures] },
    limits: { ...SIZE_LIMITS, ...PARAM_LIMITS, ...EVENT_LIMITS },
    defaults: { ...PARAM_DEFAULTS },
    readOnly: true,
  };
}
