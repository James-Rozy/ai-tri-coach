# Split Decisions watch face

A Connect IQ watch face for the Garmin Fēnix 9 Pro 47mm (454×454 AMOLED), in the site's Race Timing look.

- **Day ring:** your 70.3 splits stretched over 24 hours. The swim starts at midnight and the finish is the next midnight. The lit part is how far through the day you are, and the white tick is now.
- **Leg line:** the current leg and the next change, for example `BIKE  T2 IN 3:05`.
- **Splits panel:** wrist HR, today's steps and Body Battery. Watch battery sits along the bottom.
- **Always-on:** no wordmark or panel, dimmed, every other pixel row blacked out (alternating each minute) and the layout drifts a few pixels each minute. That keeps it inside Garmin's AMOLED burn-in rules.

The split lengths are settings (Garmin Connect app → the watch → Watch Faces → Split Decisions → Settings). They default to a 5:00 race: swim 32, T1 4, bike 155, T2 3, run 106 minutes.

## Run it in the simulator

1. Install [VS Code's Monkey C extension](https://marketplace.visualstudio.com/items?itemName=garmin.monkey-c) and the [Connect IQ SDK Manager](https://developer.garmin.com/connect-iq/sdk/). In the SDK Manager, download the latest SDK and the **fēnix 9 Pro** and **fēnix 8 47mm** devices.
2. In VS Code run **Monkey C: Generate a Developer Key** once. Keep the key out of git (`.gitignore` already covers `developer_key*`).
3. Open the `watchface/` folder in VS Code, run **Monkey C: Edit Products** and tick the fēnix 9 Pro 47mm. The manifest ships with the fēnix 8 47mm, which has the same screen, because the Fenix 9 Pro product id wasn't confirmed when this was written.
4. **Run → Run Without Debugging** and pick the device. In the simulator, **Settings → Low Power Mode** shows the always-on face, and **File → View Memory** shows how close it is to the watch face memory limit.

## Put it on your watch

1. **Monkey C: Build for Device**, pick the fēnix 9 Pro. This writes a `.prg` into `bin/`.
2. Plug the watch into your Mac. macOS can't open Garmin's MTP storage on its own, so use [OpenMTP](https://openmtp.ganeshrvel.com/) (free).
3. Copy the `.prg` into `GARMIN/APPS/` on the watch and unplug. Pick **Split Decisions** from the watch face list.

Sideloaded faces can't be changed from Garmin Connect, so the split settings only work once it's published to the Connect IQ Store. Until then it uses the defaults.

## Changing fonts or the wordmark

Connect IQ can't load TTF files, so the fonts, wordmark and launcher icon are generated as bitmaps from Archivo Condensed Black and JetBrains Mono (both SIL Open Font License, in `tools/fonts/`):

```sh
python3 -m pip install pillow
python3 watchface/tools/make_assets.py
```
