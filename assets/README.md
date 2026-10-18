# assets/ — production sources for the Add-On

Editable originals used to *make* the Add-On. Nothing here is read by Minecraft
and nothing here ends up in `dist/`.

| Folder | Put here |
| --- | --- |
| `blockbench/` | `.bbmodel` project files. Export geometry to `resource_pack/models/` and textures to `resource_pack/textures/`. |
| `textures/` | Layered source images (`.psd`, `.kra`, `.ase`, `.xcf`). Export flattened `.png` into `resource_pack/textures/`. |
| `audio/` | Uncompressed / project audio (`.wav`, `.flac`, DAW projects). Export `.ogg` into `resource_pack/sounds/`. |
| `references/` | Concept art, mood boards, reference screenshots. |

Rules
- `resource_pack/` must contain only the *exported* result, never the source project.
- Keep the source and its export with the same base name (`ruby_sword.ase` → `textures/items/ruby_sword.png`).
- Large binaries: consider Git LFS.
- Promotional material (thumbnails, key art, trailers) belongs in `media/`, not here.
