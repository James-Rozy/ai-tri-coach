# Split Decisions watch face

A Connect IQ watch face for the Garmin Fēnix 9 Pro 47mm (454×454 AMOLED), in the site's Race Timing look. The approved design is the [mockup](https://claude.ai/artifact/HjvifodYnxCwp42sEF1FZk); the code follows its pixel positions.

**Three edge gauges**, one per third of the dial, flush with the bezel:
- **Left (8 to 11 o'clock):** Body Battery, filling upward, with its number at the gauge's midpoint.
- **Right (1 to 4 o'clock):** heart rate, filling upward from your resting HR to your max in the current zone's color, with notches at the zone lines and BPM at the gauge's midpoint. Zones and max come from your Garmin HR zones.
- **Bottom (5 to 7 o'clock):** this week's training hours by sport (swim, bike, run colors), filling left to right toward your weekly target.

**Center, top to bottom:** steps and weather, a Monday-to-Sunday strip with swim, bike and run icons, the segment clock dead center with amber seconds, the date, days to race day, swim/bike/run distance with sport icons, and the week total.

**Always-on:** time (in the same centered spot), date and thin gauges only, dimmed. Every other pixel row is blacked out (alternating each minute) and the layout drifts a few pixels each minute, to stay inside Garmin's AMOLED burn-in rules.

The weekly numbers come from activities recorded on the watch since Monday. Anything logged elsewhere, like polo added by hand on Strava, won't count.

## Settings

Garmin Connect app → the watch → Watch Faces → Split Decisions → Settings:

| Setting | Default |
| --- | --- |
| Weekly training target (hours) | 7 |
| Race date (YYYY-MM-DD) | 2027-09-19 (placeholder; the 2027 date isn't confirmed) |

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

Connect IQ can't load TTF files, so the fonts are generated as bitmaps: Archivo Condensed Black and JetBrains Mono (both SIL Open Font License, in `tools/fonts/`) for text and numbers, and seven-segment digits drawn from the same geometry as the mockup for the clock.

```sh
python3 -m pip install pillow
python3 watchface/tools/make_assets.py
```
