#!/bin/sh
# Mojang/bedrock-samples から、最新の形式の確認に役立つファイルだけを取得する（スパースクローン）。
# 使い方: sh docs/knowledge/vanilla-reference/scripts/fetch-bedrock-samples.sh <保存先ディレクトリ>
# git が必要。取得量は数 MB。もう一度実行すると main（最新リリース）に更新する。
set -eu
dir="${1:?usage: fetch-bedrock-samples.sh <target-dir>}"
if [ ! -d "$dir/.git" ]; then
  git clone --quiet --depth 1 --filter=blob:none --sparse https://github.com/Mojang/bedrock-samples.git "$dir"
fi
cd "$dir"
git sparse-checkout set --no-cone \
  '/version.json' \
  '/behavior_pack/recipes/*' \
  '/behavior_pack/blocks/*' \
  '/behavior_pack/loot_tables/*' \
  '/resource_pack/textures/terrain_texture.json' \
  '/resource_pack/textures/item_texture.json' \
  '/resource_pack/texts/en_US.lang' \
  '/resource_pack/texts/ja_JP.lang' \
  '/resource_pack/blocks.json' \
  '/metadata/json_schemas/*'
git pull --quiet --depth 1 || true
printf 'bedrock-samples %s in %s\n' "$(grep -m1 '"version"' version.json | tr -d ' ",' | cut -d: -f2)" "$dir"
