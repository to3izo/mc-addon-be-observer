import type { Player } from "@minecraft/server";
import type { MethodTable } from "../../shared/protocol/dispatch.ts";

/** Who sent the request, as far as the game tells. Independent of how the request arrived. */
export interface RequestContext {
  /** `ScriptEventSource` value (`Entity`, `Block`, `NPCDialogue`, `Server`) or another transport's label. */
  sourceType: string;
  /** The player who sent the request, when there is one; selectors that omit `player` use it. */
  sourcePlayer: Player | undefined;
}

export type ObservationMethods = MethodTable<RequestContext>;
