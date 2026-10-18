/**
 * V-RO-01 and V-DEP-01 (docs/TESTING.md): guards for the read-only promise (SECURITY.md, ADR-0003).
 *
 * This is a tripwire, not a proof: it fails when scripts/ calls an API that is known to change the world
 * or to have a visible side effect. Every new API use is still reviewed by hand, and OBS-RO-01 checks the
 * world in game.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { walk } from "../../tools/lib/fs.ts";
import { readManifest } from "../../tools/lib/manifest.ts";
import { PATHS } from "../../tools/lib/paths.ts";

/** Calls and assignments that mutate the world, entities, items or settings, or that run code/commands. */
const FORBIDDEN: ReadonlyArray<[RegExp, string]> = [
  [/\brunCommand(?:Async)?\s*\(/, "runs a command"],
  [/\.(?:setBlock\w*|setType|setPermutation|setWaterlogged|fillBlocks|cloneBlocks|placeFeature\w*)\s*\(/, "changes blocks"],
  [/\.(?:setDynamicPropert\w*|clearDynamicProperties)\s*\(/, "writes dynamic properties"],
  [/\.(?:teleport|tryTeleport|setRotation|applyImpulse|applyKnockback|clearVelocity|applyDamage|kill|remove|setOnFire|extinguishFire)\s*\(/, "changes an entity"],
  [/\.(?:addEffect|removeEffect|addTag|removeTag|triggerEvent|setProperty|resetProperty|setGameMode|setSpawnPoint|setOp|resetLevel|addLevels|addExperience)\s*\(/, "changes an entity or player"],
  [/\.(?:setItem|addItem|swapItems|transferItem|moveItem|clearAll|setEquipment|setCurrentValue|resetToDefaultValue|resetToMaxValue|resetToMinValue)\s*\(/, "changes an inventory or attribute"],
  [/\.(?:spawnEntity|spawnItem|spawnParticle|createExplosion|playSound|playMusic|queueMusic|stopMusic|setWeather|setTimeOfDay|setAbsoluteTime|setDefaultSpawnLocation|setDifficulty)\s*\(/, "changes the world"],
  [/\.(?:addObjective|removeObjective|setScore|addScore|resetScore|setObjectiveAtDisplaySlot)\s*\(/, "changes scoreboards"],
  [/\.(?:sendMessage|onScreenDisplay)\b/, "shows something to players"],
  [/\.(?:nameTag|isSneaking|selectedSlotIndex|commandPermissionLevel|amount|lockMode|keepOnDeath)\s*=[^=]/, "assigns a writable game property"],
  [/\bgameRules\.\w+\s*=[^=]/, "changes a game rule"],
  [/\beval\s*\(|\bnew\s+Function\s*\(/, "executes code"],
];

/** Removes comments so explanations that mention an API do not trip the guard. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:\\])\/\/.*$/gm, "$1");
}

test("V-RO-01 scripts/ calls no world-changing or side-effect API", () => {
  const offences: string[] = [];
  for (const file of walk(PATHS.scripts)) {
    if (!file.endsWith(".ts") || file.endsWith(".d.ts")) continue;
    const lines = stripComments(readFileSync(file, "utf8")).split("\n");
    lines.forEach((line, i) => {
      for (const [pattern, why] of FORBIDDEN) {
        if (pattern.test(line)) offences.push(`${path.relative(PATHS.root, file)}:${i + 1}: ${why}: ${line.trim()}`);
      }
    });
  }
  assert.deepEqual(offences, [], `read-only rule broken (SECURITY.md):\n${offences.join("\n")}`);
});

test("V-RO-01 the guard itself catches typical mutations", () => {
  const samples = [
    'dimension.runCommand("say hi")',
    "block.setType(\"minecraft:stone\")",
    "world.setDynamicProperty(\"k\", 1)",
    "player.teleport(location)",
    "player.nameTag = \"x\"",
    "player.sendMessage(\"hi\")",
    "eval(code)",
  ];
  for (const sample of samples) {
    assert.ok(FORBIDDEN.some(([pattern]) => pattern.test(sample)), sample);
  }
  for (const allowed of ["player.nameTag === \"x\"", "dimension.getBlock(pos)", "player.getRotation()", "players.length"]) {
    assert.ok(!FORBIDDEN.some(([pattern]) => pattern.test(allowed)), allowed);
  }
});

test("V-DEP-01 the core pack depends on @minecraft/server only", () => {
  const modules = (readManifest(PATHS.behaviorPack).dependencies ?? [])
    .map((d) => d.module_name)
    .filter((name): name is string => typeof name === "string");
  assert.deepEqual(modules, ["@minecraft/server"], "server-net/server-admin belong to a separate adapter pack (ADR-0004)");
});
