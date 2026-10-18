import { world, type ScoreboardIdentity } from "@minecraft/server";
import type { MethodHandler } from "../../shared/protocol/dispatch.ts";
import { ObserverError } from "../../shared/protocol/errors.ts";
import { parseScoreboardQuery } from "../../shared/protocol/options.ts";
import { expectOnlyKeys, parsePlayerSelector } from "../../shared/protocol/params.ts";
import type { RequestContext } from "./context.ts";
import { resolvePlayer } from "./resolve.ts";

function participantOf(identity: ScoreboardIdentity): Record<string, unknown> {
  return { name: identity.displayName, type: identity.type };
}

/**
 * `scoreboard` (docs/PROTOCOL.md §5.13), read-only:
 * - no parameters: the objectives;
 * - `objective`: the scores in that objective;
 * - `player`: that player's score in every objective (with `objective`: in that one only).
 */
export const scoreboard: MethodHandler<RequestContext> = (params, context) => {
  expectOnlyKeys(params, ["objective", "player", "limit"]);
  const query = parseScoreboardQuery(params);
  const board = world.scoreboard;

  if (params.player !== undefined) {
    const player = resolvePlayer(parsePlayerSelector(params.player), context);
    let objectives = board.getObjectives();
    if (query.objective) {
      const one = board.getObjective(query.objective);
      if (!one) throw new ObserverError("INVALID_PARAMS", `no objective "${query.objective}"`, { param: "objective" });
      objectives = [one];
    }
    const scores = objectives
      .filter((o) => o.isValid)
      .map((o) => ({ objective: o.id, displayName: o.displayName, score: o.getScore(player) ?? null }))
      .filter((s) => s.score !== null);
    const shown = scores.slice(0, query.limit);
    return { data: { player: { id: player.id, name: player.name }, scores: shown, returned: shown.length, truncated: scores.length > shown.length }, truncatable: [["scores"]] };
  }

  if (query.objective) {
    const objective = board.getObjective(query.objective);
    if (!objective) throw new ObserverError("INVALID_PARAMS", `no objective "${query.objective}"`, { param: "objective" });
    const all = objective.getScores().map((info) => ({ ...participantOf(info.participant), score: info.score }));
    const shown = all.slice(0, query.limit);
    return {
      data: { objective: { id: objective.id, displayName: objective.displayName }, scores: shown, returned: shown.length, total: all.length, truncated: all.length > shown.length },
      truncatable: [["scores"]],
    };
  }

  const all = board.getObjectives().map((o) => ({ id: o.id, displayName: o.displayName, participants: o.getParticipants().length }));
  const shown = all.slice(0, query.limit);
  return { data: { objectives: shown, returned: shown.length, total: all.length, truncated: all.length > shown.length }, truncatable: [["objectives"]] };
};
