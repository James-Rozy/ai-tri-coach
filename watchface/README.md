# Split Decisions watch face

A Connect IQ watch face for the Garmin Fēnix 9 Pro 47mm (454×454 AMOLED), laid out like a digital sports watch from James's sketch, in the site's Race Timing colors. The design is the [mockup](https://claude.ai/artifact/HjvifodYnxCwp42sEF1FZk); the code follows its pixel positions.

- **LCD panel (center):** a bordered panel with the day of the week (plain bold type) and the date (month-day, in a darker inset box) on top, then the time, AM/PM and amber seconds. Unlit segments show faintly behind the digits.
- **Sport rings (top):** swim, bike and run. Each ring fills from 12 o'clock toward that sport's weekly time target. Inside are the icon, the week's distance and the week's time.
- **Left:** phone connected, do not disturb, alarm set. Lit when on, faint when off.
- **Right:** a wind dial (the arrow points where the wind is blowing) with its speed, then an icon for the current conditions over the temperature.
- **Under the panel:** steps starting at the panel's left edge across its left half, then watch battery from the middle and heart rate ending at the panel's right edge, a quarter each.
- **Bottom bezel:** days to race day, with "DAYS UNTIL RACE" curved along the bezel. The word after "DAYS UNTIL" is a setting.

**Always-on:** the panel outline, the time and the date only, dimmed. Every other pixel row is blacked out, alternating each minute, so no pixel stays lit for more than a minute (Garmin's AMOLED burn-in rule). Nothing drifts, so the time stays put when the watch wakes.

The rings count activities recorded on the watch since Monday. Anything logged elsewhere, like polo added by hand on Strava, won't count.

## Settings

Garmin Connect app → the watch → Watch Faces → Split Decisions → Settings:

| Setting | Default |
| --- | --- |
| Weekly swim / bike / run target (minutes) | 80 / 180 / 150 |
| Race date (YYYY-MM-DD) | 2027-09-19 (placeholder; the 2027 date isn't confirmed) |
| Countdown label (after "DAYS UNTIL") | RACE |

## Run it in the simulator

1. Install [VS Code's Monkey C extension](https://marketplace.visualstudio.com/items?itemName=garmin.monkey-c) and the [Connect IQ SDK Manager](https://developer.garmin.com/connect-iq/sdk/). In the SDK Manager, download the latest SDK and the **fēnix 9 Pro** and **fēnix 8 47mm** devices.
2. In VS Code run **Monkey C: Generate a Developer Key** once. Keep the key out of git (`.gitignore` already covers `developer_key*`).
3. Open the `watchface/` folder in VS Code, run **Monkey C: Edit Products** and tick the fēnix 9 Pro 47mm. The manifest ships with the fēnix 8 47mm, which has the same screen, because the Fenix 9 Pro product id wasn't confirmed when this was written.
4. **Run → Run Without Debugging** and pick the device. In the simulator, **Settings → Low Power Mode** shows the always-on face, **Simulation → Activity Data** fills in steps and HR, and **File → View Memory** shows how close it is to the watch face memory limit.

## Put it on your watch

1. **Monkey C: Build for Device**, pick the fēnix 9 Pro. This writes a `.prg` into `bin/`.
2. Plug the watch into your Mac. macOS can't open Garmin's MTP storage on its own, so use [OpenMTP](https://openmtp.ganeshrvel.com/) (free).
3. Copy the `.prg` into `GARMIN/APPS/` on the watch and unplug. Pick **Split Decisions** from the watch face list.

Sideloaded faces can't be changed from Garmin Connect, so the settings only work once it's published to the Connect IQ Store. Until then it uses the defaults above.

## Changing fonts

Text and numbers use Garmin's built-in scalable Roboto Condensed (`Graphics.getVectorFont`), which the watch draws smoothly at any size. Bitmap fonts compiled from Archivo and JetBrains Mono (SIL Open Font License, in `tools/fonts/`) came out jagged on the watch, so they're only a fallback for watches without scalable fonts. The LCD panel's seven-segment digits and the icons are generated as bitmaps from the same geometry as the mockup.

```sh
python3 -m pip install pillow
python3 watchface/tools/make_assets.py
```
