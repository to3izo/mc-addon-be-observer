# Announcement and README images for v1.0.0 (2026-10-18)

| Export | Source (this folder) | Materials (`media/source/screenshots/`) |
| --- | --- | --- |
| `social/x/be-observer_x_main_20261018.png` (1600×900, Japanese; also for `README.ja.md`) | `be-observer_x_main_20261018.html` | `be-observer_snapshot_20261018.jpeg`, response `promo-3` in `be-observer_bds-stdout_20261018.txt` |
| `social/x/be-observer_x_death-event_20261018.png` (1600×900, Japanese; also for `README.ja.md`) | `be-observer_x_death-event_20261018.html` | `be-observer_entity-die_20261018.png`, the `entity_die` line in `be-observer_bds-stdout_20261018.txt` |
| `exports/be-observer_readme_main-en_20261018.png` (1600×900, English, for `README.md`) | `be-observer_readme_main-en_20261018.html` | same as the Japanese main image |
| `exports/be-observer_readme_death-event-en_20261018.png` (1600×900, English, for `README.md`) | `be-observer_readme_death-event-en_20261018.html` | same as the Japanese death image (the game UI in the capture is Japanese) |

## Container images for v1.2.0 (2026-10-19)

| Export | Source (this folder) | Materials (`media/source/screenshots/`) |
| --- | --- | --- |
| `social/x/be-observer_x_container_20261019.png` (1600×900, Japanese; also for Japanese blog posts) | `be-observer_x_container_20261019.html` | `be-observer_chest-closed_20261019.jpeg`, `be-observer_loot-chest-opened_20261019.png`, response `promo-c1` in `be-observer_bds-stdout_containers_20261019.txt` |
| `exports/be-observer_blog_container-en_20261019.png` (1600×900, English; blog and README) | `be-observer_blog_container-en_20261019.html` | same as the Japanese image |

How the materials were made (Windows 11 VM, BDS 1.26.52.3, client 1.26.52.3, Bedrock Observer development build that
becomes 1.2.0):

- A temporary generated world `addon-lab-loot` (`level-name` changed and `level-type=FLAT` commented out in
  `server.properties`, both restored afterwards). The chest is the buried treasure at (456, 66, -312): read while
  unopened (empty, `lr1`/`lr2` in the log), then opened in the client — `be-observer_loot-chest-opened_20261019.png`.
- The opened chest was copied with `/clone` onto the beach at (456, 71, -312), so it can be seen closed.
  `be-observer_chest-closed_20261019.jpeg` was captured with the HUD hidden (F1) through VMPal's screenshot, and
  `container` was sent through the console bridge right after (`promo-c1`). The clone has the same 27 items as the
  chest in the opened capture, so the inset shows the same contents.
- The JSON in the images is an excerpt of `promo-c1`: envelope fields and most items are omitted (shown as `…`), and
  spaces were added for reading. The request lines omit `requestId` and `dimension`.
- No player name appears in these images or in the log.

## Key visual (README header)

| Export | Source | Notes |
| --- | --- | --- |
| `exports/bedrock_observer_2x1_with_text.png` (1774×887, with title) | none in this repository | Supplied by the author on 2026-10-18; used at the top of `README.md` and `README.ja.md` |
| `exports/bedrock_observer_2x1.png` (1774×887, no text) | none in this repository | Same artwork without the title, kept for other uses |

The editable source, the tool it was made with and its licence are not recorded yet; add them here (or put the
source next to this file) before reusing the artwork elsewhere.

## How the materials were made

- Real run on the Windows 11 VM: BDS 1.26.52.3 with Bedrock Observer 1.0.0, world `addon-lab-flat`, client 1.26.52.3.
  Scene set up with console commands (a diamond block, a pig, a sheep and a cow summoned near 300, -60, 305;
  removed afterwards).
- Main: the game screenshot was taken with F2 (HUD hidden with F1); `snapshot` was sent through the console bridge
  about a second later. Mobs had Slowness, so the scene did not change in between.
- Death: the player was killed with `/damage … entity_attack entity <zombie>`; the death screen was captured with
  `PrintWindow` (F2 does not capture UI screens).

## Edits for privacy

- In the log and in the images, the player's gamertag is replaced with `Steve` (`"name"` fields only).
- In `be-observer_entity-die_20261018.png`, the gamertag in the death message is mosaicked; this was done before the
  file was saved here, so the stored capture is not the unedited original.
- The JSON in the images is an excerpt of the real lines: fields are omitted (shown as `…`) and numbers are rounded
  (`pitch` 9.9977 → 10.0, `distance` to two decimals).

## Render

The HTML files are 1600×900 pages that load the materials by relative path. From `media/`:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 --window-size=1600,900 --virtual-time-budget=3000 --screenshot="$PWD/social/x/be-observer_x_container_20261019.png" "file://$PWD/source/artwork/be-observer_x_container_20261019.html"
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 --window-size=1600,900 --virtual-time-budget=3000 --screenshot="$PWD/exports/be-observer_blog_container-en_20261019.png" "file://$PWD/source/artwork/be-observer_blog_container-en_20261019.html"
for n in main death-event; do "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 --window-size=1600,900 --virtual-time-budget=3000 --screenshot="$PWD/social/x/be-observer_x_${n}_20261018.png" "file://$PWD/source/artwork/be-observer_x_${n}_20261018.html"; done
for n in main death-event; do "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 --window-size=1600,900 --virtual-time-budget=3000 --screenshot="$PWD/exports/be-observer_readme_${n}-en_20261018.png" "file://$PWD/source/artwork/be-observer_readme_${n}-en_20261018.html"; done
```

## Licences

- Fonts: Hiragino Sans, Helvetica Neue and Menlo, bundled with macOS, used only to render the PNGs (no font files are stored here).
- Game screenshots: Minecraft content shown as captured, following Mojang's usage guidelines for screenshots.
