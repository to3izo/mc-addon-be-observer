# media/AGENTS.md

Rules for **promotional and distribution media** (Marketplace, social networks, video, press).
Root `AGENTS.md` still applies.

## Scope

`media/` is for everything shown *outside* the game to sell, announce or explain the Add-On.
Nothing in `media/` is read by Minecraft, copied by `pnpm build`, or included in `.mcaddon` files.

| Path | Contents |
| --- | --- |
| `source/screenshots/` | Raw in-game captures (full resolution, unedited, with capture date in name) |
| `source/artwork/` | Layered key-art / illustration projects (`.psd`, `.kra`, `.blend`, `.afdesign`) |
| `source/video/` | Raw footage and editor projects (`.mp4` captures, `.prproj`, `.kdenlive`, `.drp`) |
| `source/branding/` | Logo sources, colour palette, fonts/licences, naming guide |
| `marketplace/` | Exports for the Minecraft Marketplace submission: key art, panorama, screenshots, product icon, trailer |
| `social/x/`, `social/youtube/`, `social/tiktok/`, `social/instagram/` | Exports sized for each platform (posts, thumbnails, vertical video) |
| `exports/` | Other final exports: press kit, store listings elsewhere, blog images, GIFs |

## Rules

1. **Never inside the runtime.** Do not copy anything from `media/` into `behavior_pack/`,
   `resource_pack/` or `dist/`. If an in-game asset is needed (e.g. a pack icon), it is produced from
   `assets/` and committed as `pack_icon.png` in the pack — `media/` may keep the marketing variant.
2. **Do not overwrite sources.** `source/` is append-only: a re-edit is saved as a new version
   (`key_art_v02.psd`), never over the original. Agents must not run image/video processing *on* files
   in `source/`; they read from `source/` and write to `marketplace/`, `social/*` or `exports/`.
3. **Originals and exports are separate.** Every file in `marketplace/`, `social/*` and `exports/` is
   a derived, flattened output (PNG/JPG/MP4). The corresponding editable project lives in `source/`
   with the same base name. A derived file without a source is a bug.
4. **Output destination by purpose.** Marketplace material only in `marketplace/`; platform posts in
   `social/<platform>/`; everything else in `exports/`. Do not keep "final" files in `source/`.
5. **Marketplace specifications win.** Dimensions, aspect ratios, formats, file sizes, naming and the
   number of required images for Marketplace submissions are defined by the current Minecraft Creator
   Portal / partner documentation at the time of submission. Look them up, write the values you used in
   `media/marketplace/README.md` (create it with the first export), and do not reuse numbers from old
   posts or memory. Common historic shapes (key art 16:9, panorama wide strip, screenshots 16:9, square
   product icon) are hints for layout, not a spec.
6. **Platform exports** follow each platform's current recommended sizes (X/Twitter, YouTube thumbnails
   1280×720 16:9, TikTok/Instagram 9:16 vertical, ...). Name files
   `<slug>_<platform>_<purpose>_<yyyymmdd>.<ext>` (`ruby-tools_youtube_thumbnail_20260401.png`).
7. **Accuracy.** Promo images show only content that actually exists in the Add-On version being
   promoted. No mock-ups of unimplemented features in `marketplace/`.
8. **Rights.** Only fonts, music, footage and artwork with a licence that allows commercial use;
   record the licence next to the asset in `source/branding/` or a `LICENSES.md` in the folder.
9. **Size.** Large binaries (>10 MB) and video should use Git LFS. Keep `exports/` free of duplicates.

## Checklist before finishing

- new files are in the right folder for their purpose
- every export has its editable source in `source/`
- Marketplace exports were checked against the current official requirements and those are noted
- nothing from `media/` ended up in a pack or in `dist/`
