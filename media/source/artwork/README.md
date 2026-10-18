# X announcement images for v1.0.0 (2026-10-18)

| Export (`media/social/x/`) | Source (this folder) | Materials (`media/source/screenshots/`) |
| --- | --- | --- |
| `be-observer_x_main_20261018.png` (1600×900) | `be-observer_x_main_20261018.html` | `be-observer_snapshot_20261018.jpeg`, response `promo-3` in `be-observer_bds-stdout_20261018.txt` |
| `be-observer_x_death-event_20261018.png` (1600×900) | `be-observer_x_death-event_20261018.html` | `be-observer_entity-die_20261018.png`, the `entity_die` line in `be-observer_bds-stdout_20261018.txt` |

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
for n in main death-event; do "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 --window-size=1600,900 --virtual-time-budget=3000 --screenshot="$PWD/social/x/be-observer_x_${n}_20261018.png" "file://$PWD/source/artwork/be-observer_x_${n}_20261018.html"; done
```

## Licences

- Fonts: Hiragino Sans and Menlo, bundled with macOS, used only to render the PNGs (no font files are stored here).
- Game screenshots: Minecraft content shown as captured, following Mojang's usage guidelines for screenshots.
