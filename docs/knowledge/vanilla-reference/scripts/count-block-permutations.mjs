#!/usr/bin/env node
// ビヘイビアパックのブロックのパーミュテーションの合計を出す。各ブロックについて、状態ごとの値の数を
// 掛け合わせて合計する（トレイトは数えない）。Marketplace のガイドラインは合計 1 万未満。
// 使い方: node docs/knowledge/vanilla-reference/scripts/count-block-permutations.mjs [behavior_pack]
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = path.join(process.argv[2] ?? "behavior_pack", "blocks");
const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else if (name.endsWith(".json")) files.push(full);
  }
};
walk(root);

let total = 0;
const rows = [];
for (const file of files) {
  const block = JSON.parse(readFileSync(file, "utf8"))["minecraft:block"];
  const states = block?.description?.states ?? {};
  let count = 1;
  for (const values of Object.values(states)) {
    if (Array.isArray(values)) count *= values.length;
    else if (Array.isArray(values?.values)) count *= values.values.length;
    else if (typeof values?.min === "number" && typeof values?.max === "number") count *= values.max - values.min + 1;
  }
  total += count;
  rows.push([count, block?.description?.identifier ?? file]);
}
rows.sort((a, b) => b[0] - a[0]);
for (const [count, id] of rows.slice(0, 10)) console.log(String(count).padStart(7), id);
console.log(`${String(total).padStart(7)} total in ${files.length} block(s)${total >= 10000 ? "  <-- over the 10,000 guideline" : ""}`);
