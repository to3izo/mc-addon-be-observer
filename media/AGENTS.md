# media/AGENTS.md

Rules for **promotional media** (social networks, video, press). This Add-On is not sold on the Minecraft
Marketplace, so there is no store material.
Root `AGENTS.md` still applies.

## Scope

`media/` is for everything shown *outside* the game to announce or explain the Add-On.
Nothing in `media/` is read by Minecraft, copied by `pnpm build`, or included in `.mcaddon` files.

| Path | Contents |
| --- | --- |
| `source/screenshots/` | Raw in-game captures (full resolution, unedited, with capture date in name) |
| `source/artwork/` | Layered key-art / illustration projects (`.psd`, `.kra`, `.blend`, `.afdesign`) |
| `source/video/` | Raw footage and editor projects (`.mp4` captures, `.prproj`, `.kdenlive`, `.drp`) |
| `source/branding/` | Logo sources, colour palette, fonts/licences, naming guide |
| `social/x/`, `social/youtube/`, `social/tiktok/`, `social/instagram/` | Exports sized for each platform (posts, thumbnails, vertical video) |
| `exports/` | Other final exports: press kit, README and release images, blog images, GIFs |

## Rules

1. **Never inside the runtime.** Do not copy anything from `media/` into `behavior_pack/`,
   `resource_pack/` or `dist/`. If an in-game asset is needed (e.g. a pack icon), it is produced from
   `assets/` and committed as `pack_icon.png` in the pack — `media/` may keep the marketing variant.
2. **Do not overwrite sources.** `source/` is append-only: a re-edit is saved as a new version
   (`key_art_v02.psd`), never over the original. Agents must not run image/video processing *on* files
   in `source/`; they read from `source/` and write to `social/*` or `exports/`.
3. **Originals and exports are separate.** Every file in `social/*` and `exports/` is
   a derived, flattened output (PNG/JPG/MP4). The corresponding editable project lives in `source/`
   with the same base name. A derived file without a source is a bug.
4. **Output destination by purpose.** Platform posts in `social/<platform>/`; everything else in
   `exports/`. Do not keep "final" files in `source/`.
5. **Platform exports** follow each platform's current recommended sizes (X/Twitter, YouTube thumbnails
   1280×720 16:9, TikTok/Instagram 9:16 vertical, ...). Name files
   `<slug>_<platform>_<purpose>_<yyyymmdd>.<ext>` (`ruby-tools_youtube_thumbnail_20260401.png`).
6. **Accuracy.** Promo images show only content that actually exists in the Add-On version being
   promoted. No mock-ups of unimplemented features.
7. **Rights.** Only fonts, music, footage and artwork with a licence that allows commercial use;
   record the licence next to the asset in `source/branding/` or a `LICENSES.md` in the folder.
8. **Size.** Large binaries (>10 MB) and video should use Git LFS. Keep `exports/` free of duplicates.

## Checklist before finishing

- new files are in the right folder for their purpose
- every export has its editable source in `source/`
- nothing from `media/` ended up in a pack or in `dist/`
