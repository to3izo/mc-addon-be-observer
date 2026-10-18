import path from "node:path";
import { exists, walk } from "../lib/fs.ts";
import { readJson } from "../lib/json.ts";
import { rel } from "../lib/paths.ts";
import { asStringList, get, isObject, type CheckContext } from "./context.ts";

const TEXTURE_EXTENSIONS = [".png", ".tga", ".jpg", ".jpeg"];
const SOUND_EXTENSIONS = [".ogg", ".wav", ".fsb", ".mp3"];

/** Everything a resource pack defines, keyed the way other files reference it. */
interface Catalog {
  /** Texture paths without extension, relative to the RP root ("textures/items/ruby_sword"). */
  textures: Set<string>;
  /** Short names from item_texture.json / terrain_texture.json. */
  itemTextureKeys: Set<string>;
  terrainTextureKeys: Set<string>;
  geometries: Set<string>;
  /** Identifiers from block_culling/*.json (minecraft:block_culling_rules). */
  cullingRules: Set<string>;
  animations: Set<string>;
  animationControllers: Set<string>;
  renderControllers: Set<string>;
  particles: Set<string>;
  sounds: Set<string>;
  /** Texture paths referenced from anywhere (for the unreferenced-texture warning). */
  referencedTextures: Set<string>;
}

/**
 * Basic reference integrity between behavior pack, resource pack and files on disk.
 * It does not validate full Bedrock schemas; it catches the common "typo in a path" class of bugs.
 */
export function checkResources(ctx: CheckContext): void {
  const catalog = buildCatalog(ctx);
  checkTextureAtlases(ctx, catalog);
  checkFlipbooks(ctx, catalog);
  checkSoundDefinitions(ctx, catalog);
  for (const dir of ["entity", "attachables"]) checkClientDefinitions(ctx, catalog, dir);
  checkBehaviorReferences(ctx, catalog);
  reportUnreferencedTextures(ctx, catalog);
}

function buildCatalog(ctx: CheckContext): Catalog {
  const rp = ctx.rpDir;
  const catalog: Catalog = {
    textures: new Set(),
    itemTextureKeys: new Set(),
    terrainTextureKeys: new Set(),
    geometries: new Set(),
    cullingRules: new Set(),
    animations: new Set(),
    animationControllers: new Set(),
    renderControllers: new Set(),
    particles: new Set(),
    sounds: new Set(),
    referencedTextures: new Set(),
  };

  for (const file of walk(path.join(rp, "textures"))) {
    const ext = path.extname(file).toLowerCase();
    if (TEXTURE_EXTENSIONS.includes(ext)) catalog.textures.add(toPosix(path.relative(rp, file)).slice(0, -ext.length));
  }
  for (const file of walk(path.join(rp, "sounds"))) {
    const ext = path.extname(file).toLowerCase();
    if (SOUND_EXTENSIONS.includes(ext)) catalog.sounds.add(toPosix(path.relative(rp, file)).slice(0, -ext.length));
  }

  for (const file of jsonFiles(path.join(rp, "models"))) {
    const data = readJson(file);
    // 1.12.0+ format
    const list = get(data, "minecraft:geometry");
    if (Array.isArray(list)) {
      for (const g of list) {
        const id = get(g, "description", "identifier");
        if (typeof id === "string") catalog.geometries.add(id);
      }
    }
    // legacy format: top-level "geometry.xxx" keys
    if (isObject(data)) for (const key of Object.keys(data)) if (key.startsWith("geometry.")) catalog.geometries.add(key);
  }
  for (const file of jsonFiles(path.join(rp, "block_culling"))) {
    const id = get(readJson(file), "minecraft:block_culling_rules", "description", "identifier");
    if (typeof id === "string") catalog.cullingRules.add(id);
    checkCullingRules(ctx, file);
  }
  collectKeys(path.join(rp, "animations"), "animations", catalog.animations);
  collectKeys(path.join(rp, "animation_controllers"), "animation_controllers", catalog.animationControllers);
  collectKeys(path.join(rp, "render_controllers"), "render_controllers", catalog.renderControllers);
  for (const file of jsonFiles(path.join(rp, "particles"))) {
    const id = get(readJson(file), "particle_effect", "description", "identifier");
    if (typeof id === "string") catalog.particles.add(id);
  }
  return catalog;
}

/**
 * Minecraft refuses a whole block culling file when two rules name the same geometry part
 * (same bone, cube and face; a part without cube/face means the whole bone).
 */
function checkCullingRules(ctx: CheckContext, file: string): void {
  const rules = get(readJson(file), "minecraft:block_culling_rules", "rules");
  if (!Array.isArray(rules)) return;
  const seen = new Map<string, number>();
  rules.forEach((rule, i) => {
    const part = get(rule, "geometry_part");
    const bone = get(part, "bone");
    if (typeof bone !== "string") return;
    const cube = get(part, "cube");
    const face = get(part, "face");
    const key = `${bone}|${typeof cube === "number" ? cube : "*"}|${typeof face === "string" ? face : "*"}`;
    const earlier = seen.get(key);
    if (earlier !== undefined) {
      ctx.reporter.error(`${rel(file)}: rules[${i}] culls the same geometry part as rules[${earlier}] (${key.replace(/\|/g, " / ")}); Minecraft rejects the whole file`);
    } else seen.set(key, i);
  });
}

function checkTextureAtlases(ctx: CheckContext, catalog: Catalog): void {
  const atlases: Array<[string, Set<string>]> = [
    ["item_texture.json", catalog.itemTextureKeys],
    ["terrain_texture.json", catalog.terrainTextureKeys],
  ];
  for (const [name, keys] of atlases) {
    const file = path.join(ctx.rpDir, "textures", name);
    if (!exists(file)) continue;
    const data = tryJson(file);
    const textureData = get(data, "texture_data");
    if (!isObject(textureData)) {
      ctx.reporter.error(`${rel(file)}: "texture_data" object is required`);
      continue;
    }
    for (const [key, entry] of Object.entries(textureData)) {
      keys.add(key);
      const paths = asStringList(get(entry, "textures"));
      if (paths.length === 0) ctx.reporter.error(`${rel(file)}: "${key}" has no "textures" path`);
      for (const p of paths) requireTexture(ctx, catalog, p, `${rel(file)}: "${key}"`);
    }
  }
}

function checkFlipbooks(ctx: CheckContext, catalog: Catalog): void {
  const file = path.join(ctx.rpDir, "textures", "flipbook_textures.json");
  if (!exists(file)) return;
  const data = tryJson(file);
  if (!Array.isArray(data)) return;
  data.forEach((entry, i) => {
    const p = get(entry, "flipbook_texture");
    if (typeof p === "string") requireTexture(ctx, catalog, p, `${rel(file)}: [${i}]`);
  });
}

function checkSoundDefinitions(ctx: CheckContext, catalog: Catalog): void {
  const file = path.join(ctx.rpDir, "sounds", "sound_definitions.json");
  if (!exists(file)) return;
  const defs = get(tryJson(file), "sound_definitions");
  if (!isObject(defs)) return;
  for (const [name, def] of Object.entries(defs)) {
    for (const sound of asStringList(get(def, "sounds"), "name")) {
      if (!catalog.sounds.has(sound)) {
        ctx.reporter.error(`${rel(file)}: "${name}" references sound "${sound}" but no ${sound}.(${SOUND_EXTENSIONS.map((e) => e.slice(1)).join("|")}) exists in the resource pack`);
      }
    }
  }
}

/** entity/*.json (minecraft:client_entity) and attachables/*.json (minecraft:attachable) share a description shape. */
function checkClientDefinitions(ctx: CheckContext, catalog: Catalog, dir: string): void {
  for (const file of jsonFiles(path.join(ctx.rpDir, dir))) {
    const data = tryJson(file);
    const root = get(data, "minecraft:client_entity") ?? get(data, "minecraft:attachable");
    const desc = get(root, "description");
    if (!isObject(desc)) continue;
    const where = rel(file);

    for (const [k, v] of entriesOf(desc.textures)) {
      if (typeof v === "string") requireTexture(ctx, catalog, v, `${where}: textures.${k}`);
    }
    for (const [k, v] of entriesOf(desc.geometry)) {
      if (typeof v === "string" && !catalog.geometries.has(v)) ctx.reporter.error(`${where}: geometry.${k} "${v}" is not defined in resource_pack/models/`);
    }
    for (const [k, v] of entriesOf(desc.animations)) {
      if (typeof v !== "string") continue;
      const known = v.startsWith("controller.") ? catalog.animationControllers : catalog.animations;
      const folder = v.startsWith("controller.") ? "animation_controllers" : "animations";
      if (!known.has(v)) ctx.reporter.error(`${where}: animations.${k} "${v}" is not defined in resource_pack/${folder}/`);
    }
    for (const rc of asStringList(desc.render_controllers)) {
      if (!catalog.renderControllers.has(rc)) ctx.reporter.error(`${where}: render controller "${rc}" is not defined in resource_pack/render_controllers/`);
    }
    if (Array.isArray(desc.render_controllers)) {
      for (const entry of desc.render_controllers) {
        if (!isObject(entry)) continue;
        for (const rc of Object.keys(entry)) {
          if (!catalog.renderControllers.has(rc)) ctx.reporter.error(`${where}: render controller "${rc}" is not defined in resource_pack/render_controllers/`);
        }
      }
    }
    for (const [k, v] of entriesOf(desc.particle_effects)) {
      if (typeof v === "string" && !catalog.particles.has(v) && !v.startsWith("minecraft:")) {
        ctx.reporter.warn(`${where}: particle_effects.${k} "${v}" is not defined in resource_pack/particles/`);
      }
    }
  }
}

/** Behavior pack items/blocks that point at resource pack texture keys and geometries. */
function checkBehaviorReferences(ctx: CheckContext, catalog: Catalog): void {
  for (const file of jsonFiles(path.join(ctx.bpDir, "items"))) {
    const icon = get(tryJson(file), "minecraft:item", "components", "minecraft:icon");
    const keys = typeof icon === "string" ? [icon] : Object.values((get(icon, "textures") as Record<string, unknown>) ?? {});
    for (const key of keys) {
      if (typeof key === "string" && !catalog.itemTextureKeys.has(key)) {
        ctx.reporter.error(`${rel(file)}: minecraft:icon "${key}" is not a key in resource_pack/textures/item_texture.json`);
      }
    }
  }
  for (const file of jsonFiles(path.join(ctx.bpDir, "blocks"))) {
    const block = get(tryJson(file), "minecraft:block");
    const permutations = get(block, "permutations");
    // Components may appear at the top level and in every permutation.
    const componentSets = [get(block, "components"), ...(Array.isArray(permutations) ? permutations.map((p) => get(p, "components")) : [])];
    for (const components of componentSets) {
      const instanceSets = [get(components, "minecraft:material_instances"), get(components, "minecraft:item_visual", "material_instances")];
      for (const instances of instanceSets) {
        for (const [face, inst] of entriesOf(instances)) {
          const tex = get(inst, "texture");
          // Keys without a namespace are vanilla terrain atlas keys ("glass", "red_stained_glass"): custom
          // keys are always "<namespace>:<name>" (Marketplace naming), so only those must exist here.
          if (typeof tex === "string" && tex.includes(":") && !catalog.terrainTextureKeys.has(tex)) {
            ctx.reporter.error(`${rel(file)}: material_instances.${face}.texture "${tex}" is not a key in resource_pack/textures/terrain_texture.json`);
          }
        }
      }
      for (const geo of [get(components, "minecraft:geometry"), get(components, "minecraft:item_visual", "geometry")]) {
        const geoId = typeof geo === "string" ? geo : get(geo, "identifier");
        if (typeof geoId === "string" && !geoId.startsWith("minecraft:") && !catalog.geometries.has(geoId)) {
          ctx.reporter.error(`${rel(file)}: minecraft:geometry "${geoId}" is not defined in resource_pack/models/`);
        }
        for (const [bone, value] of entriesOf(get(geo, "bone_visibility"))) {
          if (typeof value === "boolean" && geo === get(components, "minecraft:item_visual", "geometry")) {
            ctx.reporter.error(`${rel(file)}: minecraft:item_visual geometry bone_visibility.${bone} must be a Molang string such as "1.0", not a boolean (Minecraft rejects the block)`);
          }
        }
        const culling = get(geo, "culling");
        if (typeof culling === "string" && culling !== "" && !catalog.cullingRules.has(culling)) {
          ctx.reporter.error(`${rel(file)}: minecraft:geometry culling "${culling}" is not defined in resource_pack/block_culling/`);
        }
      }
      const loot = get(components, "minecraft:loot");
      if (typeof loot === "string" && !exists(path.join(ctx.bpDir, loot))) {
        ctx.reporter.error(`${rel(file)}: minecraft:loot "${loot}" does not exist in ${rel(ctx.bpDir)}/`);
      }
    }
  }
}

function reportUnreferencedTextures(ctx: CheckContext, catalog: Catalog): void {
  const unreferenced = [...catalog.textures].filter((t) => !catalog.referencedTextures.has(t) && !t.startsWith("textures/ui/"));
  if (unreferenced.length === 0) return;
  const shown = unreferenced.slice(0, 20).join(", ");
  const more = unreferenced.length > 20 ? ` (+${unreferenced.length - 20} more)` : "";
  ctx.reporter.warn(`resource_pack has ${unreferenced.length} texture(s) not referenced by any atlas/entity/attachable (fine for vanilla overrides, otherwise dead weight): ${shown}${more}`);
}

// --- helpers -------------------------------------------------------------

function requireTexture(ctx: CheckContext, catalog: Catalog, texturePath: string, where: string): void {
  const normalized = toPosix(texturePath).replace(/\.(png|tga|jpe?g)$/i, "");
  catalog.referencedTextures.add(normalized);
  if (!catalog.textures.has(normalized)) {
    ctx.reporter.error(`${where} references texture "${texturePath}" but resource_pack/${normalized}.(png|tga|jpg) does not exist`);
  }
}

function collectKeys(dir: string, rootKey: string, into: Set<string>): void {
  for (const file of jsonFiles(dir)) {
    const obj = get(readJson(file), rootKey);
    if (isObject(obj)) for (const key of Object.keys(obj)) into.add(key);
  }
}

function jsonFiles(dir: string): string[] {
  return walk(dir).filter((f) => f.endsWith(".json") && safeJson(f));
}

function safeJson(file: string): boolean {
  try {
    readJson(file);
    return true;
  } catch {
    return false; // reported by checkJson
  }
}

function tryJson(file: string): unknown {
  try {
    return readJson(file);
  } catch {
    return undefined;
  }
}

function entriesOf(value: unknown): Array<[string, unknown]> {
  return isObject(value) ? Object.entries(value) : [];
}

function toPosix(p: string): string {
  return p.split(path.sep).join("/");
}
