import { ADDON_SLUG, NAMESPACE } from "../constants/addon.ts";
import { ADDON_VERSION, SCRIPT_API_MODULES } from "../constants/version.ts";
import { PARAM_DEFAULTS, PARAM_LIMITS, PROTOCOL_VERSION, REQUEST_EVENT_ID, RESPONSE_PREFIX, SIZE_LIMITS, SUPPORTED_PROTOCOLS } from "./constants.ts";
import { METHODS, SECTIONS } from "./methods.ts";

/** `data` of the `capabilities` method (docs/PROTOCOL.md §5.1). Describes exactly this build. */
export function buildCapabilities(): Record<string, unknown> {
  return {
    addon: { slug: ADDON_SLUG, namespace: NAMESPACE, version: ADDON_VERSION },
    protocol: { version: PROTOCOL_VERSION, supported: [...SUPPORTED_PROTOCOLS] },
    scriptApi: { ...SCRIPT_API_MODULES },
    transport: { requestEventId: REQUEST_EVENT_ID, responsePrefix: RESPONSE_PREFIX },
    methods: [...METHODS],
    sections: [...SECTIONS],
    limits: { ...SIZE_LIMITS, ...PARAM_LIMITS },
    defaults: { ...PARAM_DEFAULTS },
    readOnly: true,
  };
}
