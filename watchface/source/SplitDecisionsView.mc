import Toybox.Activity;
import Toybox.ActivityMonitor;
import Toybox.Application;
import Toybox.Graphics;
import Toybox.Lang;
import Toybox.Math;
import Toybox.SensorHistory;
import Toybox.System;
import Toybox.Time;
import Toybox.Time.Gregorian;
import Toybox.UserProfile;
import Toybox.Weather;
import Toybox.WatchUi;

// Race Timing palette, matching the site's tokens in src/styles/global.css.
const COLOR_BG = 0x000000;
const COLOR_TRACK = 0x161B22;
const COLOR_GHOST = 0x13171D;
const COLOR_INK = 0xF2F4F7;
const COLOR_MUTED = 0xA9B2C0;
const COLOR_FAINT = 0x7D8796;
const COLOR_ACCENT = 0xFFB020;

// Swim, bike, run. These colors only ever mean the sport.
const SPORT_COLORS = [0x2EA4DC, 0xF28E42, 0x35C177];
// HR zones 1 to 5.
const ZONE_COLORS = [0x7D8796, 0x2EA4DC, 0x35C177, 0xF28E42, 0xE5484D];

const DAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTH_NAMES = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

// Garmin's built-in scalable font faces, first match wins. Condensed to match the race-board look.
const BOLD_FACES = ["RobotoCondensedBold", "Swiss721Bold", "BionicBold"];
const REGULAR_FACES = ["RobotoCondensedRegular", "Swiss721Regular", "RobotoCondensedBold"];

// Always-on drift, one step per minute, so no pixel stays lit in one place.
const AOD_SHIFTS = [[0, 0], [3, 2], [-2, 3], [-3, -2], [2, -3]];

// Layout is designed on the 454px Fenix 9 Pro 47mm (see the mockup) and scaled from there.
const DESIGN_SIZE = 454.0;
const GAUGE_R = 221;

class SplitDecisionsView extends WatchUi.WatchFace {

    private var _asleep as Boolean = false;
    private var _week as TrainingWeek = new TrainingWeek();
    private var _weekLoadedMinute as Number = -1;
    private var _hrZones as Array<Number>? = null;

    private var _segTime as WatchUi.FontResource;
    private var _segSecs as WatchUi.FontResource;
    // Type scale: segment clock, _numData for every reading, _numDetail for the per-sport breakdown, mono 14 for labels and text.
    // Text uses Garmin's built-in scalable fonts, which the watch draws smoothly at any size.
    // The bundled bitmap fonts compile without smoothing, so they're only a fallback.
    private var _numData as Graphics.FontType;
    private var _numDetail as Graphics.FontType;
    private var _label as Graphics.FontType;
    private var _bold as Graphics.FontType;
    // Swim, bike, run icons for the distance row.
    private var _sportIcons as Array<WatchUi.BitmapResource>;
    // Body Battery, steps, weather and heart rate icons for the readout band.
    private var _readoutIcons as Array<WatchUi.BitmapResource>;

    // Set at the top of each onUpdate.
    private var _cx as Number = 227;
    private var _cy as Number = 227;
    private var _s as Float = 1.0;

    function initialize() {
        WatchFace.initialize();
        _segTime = WatchUi.loadResource(Rez.Fonts.SegTime) as WatchUi.FontResource;
        _segSecs = WatchUi.loadResource(Rez.Fonts.SegSecs) as WatchUi.FontResource;
        _numData = textFont(BOLD_FACES, 40, Rez.Fonts.NumData);
        _numDetail = textFont(BOLD_FACES, 24, Rez.Fonts.NumDetail);
        _label = textFont(REGULAR_FACES, 18, Rez.Fonts.MonoLabel);
        _bold = textFont(BOLD_FACES, 22, Rez.Fonts.MonoBold);
        _sportIcons = [
            WatchUi.loadResource(Rez.Drawables.IconSwim) as WatchUi.BitmapResource,
            WatchUi.loadResource(Rez.Drawables.IconBike) as WatchUi.BitmapResource,
            WatchUi.loadResource(Rez.Drawables.IconRun) as WatchUi.BitmapResource
        ] as Array<WatchUi.BitmapResource>;
        _readoutIcons = [
            WatchUi.loadResource(Rez.Drawables.IconBodyBattery) as WatchUi.BitmapResource,
            WatchUi.loadResource(Rez.Drawables.IconSteps) as WatchUi.BitmapResource,
            WatchUi.loadResource(Rez.Drawables.IconTemp) as WatchUi.BitmapResource,
            WatchUi.loadResource(Rez.Drawables.IconHeart) as WatchUi.BitmapResource
        ] as Array<WatchUi.BitmapResource>;
        if (UserProfile has :getHeartRateZones) {
            _hrZones = UserProfile.getHeartRateZones(UserProfile.HR_ZONE_SPORT_GENERIC);
        }
    }

    function onUpdate(dc as Graphics.Dc) as Void {
        var w = dc.getWidth();
        var h = dc.getHeight();
        _s = w / DESIGN_SIZE;

        var settings = System.getDeviceSettings();
        var burnIn = (settings has :requiresBurnInProtection) && settings.requiresBurnInProtection;
        var aod = _asleep && burnIn;
        var clock = System.getClockTime();

        // Activity history only changes between activities; once a minute is plenty.
        if (clock.min != _weekLoadedMinute) {
            _week.load();
            _weekLoadedMinute = clock.min;
        }

        _cx = w / 2;
        _cy = h / 2;
        if (aod) {
            var shift = AOD_SHIFTS[clock.min % AOD_SHIFTS.size()] as Array<Number>;
            _cx += shift[0];
            _cy += shift[1];
        }

        dc.setColor(COLOR_BG, COLOR_BG);
        dc.clear();
        if (dc has :setAntiAlias) {
            dc.setAntiAlias(true);
        }

        drawGauges(dc, aod);
        if (aod) {
            drawAlwaysOn(dc, clock);
            return;
        }

        drawReadouts(dc);
        drawClock(dc, clock, settings.is24Hour);
        drawCentered(dc, y(304), _bold, dateText(Gregorian.info(Time.now(), Time.FORMAT_SHORT)), COLOR_MUTED);
        var daysLeft = daysUntil(Application.Properties.getValue("RaceDate"), Gregorian.info(Time.now(), Time.FORMAT_SHORT));
        if (daysLeft != null && daysLeft >= 0) {
            drawCentered(dc, y(334), _bold, daysLeft == 0 ? "RACE DAY" : daysLeft.toString() + (daysLeft == 1 ? " DAY" : " DAYS") + " TO RACE DAY", COLOR_INK);
        }
        drawWeekSplits(dc);
    }

    // Three gauges flush with the bezel (Body Battery, heart rate, week hours), one per third of the dial, with 30 degree gaps at 12, 4 and 8 o'clock.
    private function drawGauges(dc as Graphics.Dc, aod as Boolean) as Void {
        var width = aod ? 3 : 6;
        if (!aod) {
            drawClockArc(dc, 255.0, 345.0, COLOR_TRACK, width);
            drawClockArc(dc, 105.0, 15.0, COLOR_TRACK, width);
            drawClockArc(dc, 225.0, 135.0, COLOR_TRACK, width);
        }

        // Left, 8 to 11 o'clock: Body Battery, filling upward.
        var bb = bodyBattery();
        if (bb != null) {
            drawClockArc(dc, 255.0, 255.0 + 90.0 * bb / 100.0, COLOR_INK, width);
        }

        // Right, 1 to 4 o'clock: heart rate from resting to max, filling upward in the current zone's color,
        // with notches cut at the zone lines.
        var hr = heartRate();
        if (hr != null) {
            var angle = hrAngle(hr);
            if (angle != null) {
                drawClockArc(dc, 105.0, angle as Float, zoneColor(hr), width);
            }
        }
        var zones = _hrZones;
        if (!aod && zones != null && zones.size() >= 6) {
            for (var z = 1; z < 5; z++) {
                var notch = hrAngle(zones[z]);
                if (notch != null) {
                    drawClockArc(dc, (notch as Float) + 0.6, (notch as Float) - 0.6, COLOR_BG, width + 2);
                }
            }
        }

        // Bottom, 5 to 7 o'clock: this week's hours by sport, filling left to right toward the target.
        var target = targetMinutes();
        var done = 0;
        for (var i = 0; i < 3; i++) {
            var from = 225.0 - 90.0 * min(done, target) / target;
            done += _week.seconds[i] / 60;
            var to = 225.0 - 90.0 * min(done, target) / target;
            // Skip sports with no time yet, or the 0.8 degree overlap draws a stray dot at 7:30.
            if (to < from) {
                drawClockArc(dc, from, to + 0.8, SPORT_COLORS[i], width);
            }
        }
    }

    // Each sport's distance, then the week total, just above the bottom gauge.
    private function drawWeekSplits(dc as Graphics.Dc) as Void {
        var statute = System.getDeviceSettings().distanceUnits == System.UNIT_STATUTE;
        for (var i = 0; i < 3; i++) {
            var value = distanceValue(i, statute);
            var unit = distanceUnit(i, statute);
            var vw = dc.getTextWidthInPixels(value, _numDetail);
            var uw = dc.getTextWidthInPixels(unit, _label);
            var colX = _cx + (((i - 1) * 114) * _s).toNumber();
            var x0 = colX - (vw + 3 + uw - 24) / 2;
            dc.drawBitmap(x0 - 24, y(354), _sportIcons[i]);
            drawBaseline(dc, x0, y(373), _numDetail, value, COLOR_INK, Graphics.TEXT_JUSTIFY_LEFT);
            drawBaseline(dc, x0 + vw + 3, y(373), _label, unit, COLOR_MUTED, Graphics.TEXT_JUSTIFY_LEFT);
        }
        drawRuns(dc, y(418), [
            [formatMinutes(_week.totalMinutes()), _numData, COLOR_INK, 2],
            ["/" + (targetMinutes() / 60).toString() + "H", _label, COLOR_MUTED, 0]
        ]);
    }

    // One band across the top: Body Battery and heart rate at their gauges' midpoints (10 and 2 o'clock,
    // radius 180), steps and weather between them. An icon sits over each number instead of a text label.
    private function drawReadouts(dc as Graphics.Dc) as Void {
        var bb = bodyBattery();
        var hr = heartRate();
        var steps = ActivityMonitor.getInfo().steps;
        var xs = [71, 172, 288, 383];
        var values = [
            bb == null ? "--" : bb.toString(),
            steps == null ? "--" : thousands(steps),
            temperature(),
            hr == null ? "--" : hr.toString()
        ];
        for (var i = 0; i < 4; i++) {
            var px = x(xs[i]);
            dc.drawBitmap(px - 12, y(100), _readoutIcons[i]);
            drawBaseline(dc, px, y(162), _numData, values[i], COLOR_INK, Graphics.TEXT_JUSTIFY_CENTER);
        }
    }

    // Segment time, dead center, with faint unlit segments. Amber seconds hang off the right.
    private function drawClock(dc as Graphics.Dc, clock as System.ClockTime, is24Hour as Boolean) as Void {
        var timeStr = hourText(clock.hour, is24Hour) + ":" + clock.min.format("%02d");
        var secStr = clock.sec.format("%02d");
        var top = y(189);
        var tw = dc.getTextWidthInPixels(timeStr, _segTime);
        var sw = dc.getTextWidthInPixels(secStr, _segSecs);
        var left = _cx - tw / 2;

        drawTop(dc, left, top, _segTime, "88:88", COLOR_GHOST);
        drawTop(dc, left, top, _segTime, timeStr, COLOR_INK);
        if (!is24Hour) {
            drawBaseline(dc, left + tw + 10 + sw / 2, top + 22, _label, clock.hour < 12 ? "AM" : "PM", COLOR_MUTED, Graphics.TEXT_JUSTIFY_CENTER);
        }
        drawTop(dc, left + tw + 10, top + 46, _segSecs, "88", COLOR_GHOST);
        drawTop(dc, left + tw + 10, top + 46, _segSecs, secStr, COLOR_ACCENT);

    }

    // Wrist down: dimmed time and date with the gauges, then every other row blacked out
    // (alternating each minute) for AMOLED burn-in protection.
    private function drawAlwaysOn(dc as Graphics.Dc, clock as System.ClockTime) as Void {
        var timeStr = hourText(clock.hour, System.getDeviceSettings().is24Hour) + ":" + clock.min.format("%02d");
        var tw = dc.getTextWidthInPixels(timeStr, _segTime);
        drawTop(dc, _cx - tw / 2, y(189), _segTime, timeStr, COLOR_MUTED);
        drawCentered(dc, y(304), _bold, dateText(Gregorian.info(Time.now(), Time.FORMAT_SHORT)), COLOR_FAINT);

        if (dc has :setAntiAlias) {
            dc.setAntiAlias(false);
        }
        dc.setColor(COLOR_BG, COLOR_BG);
        dc.setPenWidth(1);
        for (var row = clock.min % 2; row < dc.getHeight(); row += 2) {
            dc.drawLine(0, row, dc.getWidth(), row);
        }
    }

    // ---- Data ----

    private function heartRate() as Number? {
        var info = Activity.getActivityInfo();
        if (info != null && info.currentHeartRate != null) {
            return info.currentHeartRate;
        }
        if (ActivityMonitor has :getHeartRateHistory) {
            var sample = ActivityMonitor.getHeartRateHistory(1, true).next();
            if (sample != null && sample.heartRate != ActivityMonitor.INVALID_HR_SAMPLE) {
                return sample.heartRate;
            }
        }
        return null;
    }

    private function zoneColor(hr as Number) as Number {
        var zones = _hrZones;
        if (zones == null || zones.size() < 6 || hr < zones[0]) {
            return ZONE_COLORS[0];
        }
        for (var i = 1; i < 6; i++) {
            if (hr <= zones[i]) {
                return ZONE_COLORS[i - 1];
            }
        }
        return ZONE_COLORS[4];
    }

    // Newest Body Battery reading. The latest sample is often empty, so walk back a few.
    private function bodyBattery() as Number? {
        if ((Toybox has :SensorHistory) && (SensorHistory has :getBodyBatteryHistory)) {
            var history = SensorHistory.getBodyBatteryHistory({:period => 10, :order => SensorHistory.ORDER_NEWEST_FIRST});
            var sample = history.next();
            while (sample != null) {
                if (sample.data != null) {
                    return sample.data.toNumber();
                }
                sample = history.next();
            }
        }
        return null;
    }

    // Where a heart rate sits on the right gauge, in clock degrees: resting HR at 105 (4 o'clock),
    // max HR at 15 (1 o'clock). Resting comes from the watch's profile, falling back to the zone 1 floor;
    // max is the top of the user's zones. Null when the watch has no zones.
    private function hrAngle(bpm as Number) as Float? {
        var zones = _hrZones;
        if (zones == null || zones.size() < 6) {
            return null;
        }
        var floor = zones[0];
        var profile = UserProfile.getProfile();
        if (profile != null && profile.restingHeartRate != null && profile.restingHeartRate < zones[5]) {
            floor = profile.restingHeartRate as Number;
        }
        var span = zones[5] - floor;
        if (span <= 0) {
            return null;
        }
        var f = (bpm - floor).toFloat() / span;
        f = f < 0.0 ? 0.0 : (f > 1.0 ? 1.0 : f);
        return 105.0 - 90.0 * f;
    }

    private function temperature() as String {
        if (Toybox has :Weather) {
            var conditions = Weather.getCurrentConditions();
            if (conditions != null && conditions.temperature != null) {
                var t = conditions.temperature.toFloat();
                if (System.getDeviceSettings().temperatureUnits == System.UNIT_STATUTE) {
                    t = t * 9 / 5 + 32;
                }
                return Math.round(t).toNumber().toString() + "°";
            }
        }
        return "--";
    }

    private function targetMinutes() as Number {
        var hours = Application.Properties.getValue("TargetHours");
        return ((hours instanceof Number && hours > 0) ? hours : 7) * 60;
    }

    // Days from today to a "YYYY-MM-DD" setting, or null if it doesn't parse.
    private function daysUntil(value as Application.PropertyValueType, today as Gregorian.Info) as Number? {
        if (!(value instanceof String) || value.length() != 10) {
            return null;
        }
        var yr = value.substring(0, 4).toNumber();
        var mo = value.substring(5, 7).toNumber();
        var dy = value.substring(8, 10).toNumber();
        if (yr == null || mo == null || dy == null) {
            return null;
        }
        return civilDays(yr, mo, dy) - civilDays(today.year as Number, today.month as Number, today.day as Number);
    }

    // Days since 1970-01-01 for a calendar date (Howard Hinnant's algorithm), so date math ignores time zones.
    private function civilDays(yr as Number, mo as Number, dy as Number) as Number {
        if (mo <= 2) {
            yr -= 1;
        }
        var era = (yr >= 0 ? yr : yr - 399) / 400;
        var yoe = yr - era * 400;
        var doy = (153 * (mo + (mo > 2 ? -3 : 9)) + 2) / 5 + dy - 1;
        var doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
        return era * 146097 + doe - 719468;
    }

    // ---- Formatting ----

    private function distanceValue(sport as Number, statute as Boolean) as String {
        var m = _week.meters[sport];
        if (sport == SPORT_SWIM) {
            return thousands((statute ? m * 1.09361 : m).toNumber());
        }
        return (statute ? m / 1609.344 : m / 1000).format("%.1f");
    }

    private function distanceUnit(sport as Number, statute as Boolean) as String {
        if (sport == SPORT_SWIM) {
            return statute ? "YD" : "M";
        }
        return statute ? "MI" : "KM";
    }

    private function dateText(today as Gregorian.Info) as String {
        return DAY_NAMES[(today.day_of_week as Number) - 1] + " " + (today.day as Number).format("%02d") + " "
            + MONTH_NAMES[(today.month as Number) - 1];
    }

    private function hourText(hour as Number, is24Hour as Boolean) as String {
        if (!is24Hour) {
            hour = hour % 12 == 0 ? 12 : hour % 12;
        }
        return hour.format("%02d");
    }

    private function formatMinutes(m as Number) as String {
        return (m / 60).format("%d") + ":" + (m % 60).format("%02d");
    }

    private function thousands(n as Number) as String {
        if (n < 1000) {
            return n.toString();
        }
        return thousands(n / 1000) + "," + (n % 1000).format("%03d");
    }

    // ---- Drawing helpers ----

    // An arc between two angles in degrees clockwise from 12 o'clock, in either direction.
    private function drawClockArc(dc as Graphics.Dc, from as Float, to as Float, color as Number, width as Number) as Void {
        var span = to - from;
        if (span < 0.5 && span > -0.5) {
            return;
        }
        dc.setColor(color, Graphics.COLOR_TRANSPARENT);
        dc.setPenWidth((width * _s).toNumber());
        var dir = span > 0 ? Graphics.ARC_CLOCKWISE : Graphics.ARC_COUNTER_CLOCKWISE;
        dc.drawArc(_cx, _cy, (GAUGE_R * _s).toNumber(), dir, toArcDegrees(from), toArcDegrees(to));
    }

    // Garmin arcs count counter-clockwise from 3 o'clock.
    private function toArcDegrees(clockDeg as Float) as Float {
        var d = 90.0 - clockDeg;
        while (d < 0) {
            d += 360.0;
        }
        while (d >= 360) {
            d -= 360.0;
        }
        return d;
    }

    // Several differently styled pieces, centered as one line on a shared baseline.
    // Each piece is [text, font, color, gap after].
    private function drawRuns(dc as Graphics.Dc, baseline as Number, pieces as Array<Array>) as Void {
        var total = 0;
        for (var i = 0; i < pieces.size(); i++) {
            var p = pieces[i];
            total += dc.getTextWidthInPixels(p[0] as String, p[1] as Graphics.FontType) + (p[3] as Number);
        }
        var px = _cx - total / 2;
        for (var i = 0; i < pieces.size(); i++) {
            var p = pieces[i];
            drawBaseline(dc, px, baseline, p[1] as Graphics.FontType, p[0] as String, p[2] as Number, Graphics.TEXT_JUSTIFY_LEFT);
            px += dc.getTextWidthInPixels(p[0] as String, p[1] as Graphics.FontType) + (p[3] as Number);
        }
    }

    private function drawCentered(dc as Graphics.Dc, baseline as Number, font as Graphics.FontType, text as String, color as Number) as Void {
        drawBaseline(dc, _cx, baseline, font, text, color, Graphics.TEXT_JUSTIFY_CENTER);
    }

    // A built-in scalable font at a pixel size, or the bundled bitmap font if this watch has none.
    private function textFont(faces as Array<String>, size as Number, fallback as ResourceId) as Graphics.FontType {
        if (Graphics has :getVectorFont) {
            var font = Graphics.getVectorFont({:face => faces, :size => size});
            if (font != null) {
                return font;
            }
        }
        return WatchUi.loadResource(fallback) as WatchUi.FontResource;
    }

    // Text placed by its baseline, the way the mockup lays it out.
    private function drawBaseline(dc as Graphics.Dc, px as Numeric, baseline as Numeric, font as Graphics.FontType,
            text as String, color as Number, justify as Number) as Void {
        dc.setColor(color, Graphics.COLOR_TRANSPARENT);
        dc.drawText(px, baseline - Graphics.getFontAscent(font), font, text, justify);
    }

    // Text placed by its top edge, for the segment fonts.
    private function drawTop(dc as Graphics.Dc, px as Numeric, top as Numeric, font as WatchUi.FontResource, text as String, color as Number) as Void {
        dc.setColor(color, Graphics.COLOR_TRANSPARENT);
        dc.drawText(px, top, font, text, Graphics.TEXT_JUSTIFY_LEFT);
    }

    private function x(v as Numeric) as Number {
        return _cx + ((v - 227) * _s).toNumber();
    }

    private function y(v as Numeric) as Number {
        return _cy + ((v - 227) * _s).toNumber();
    }

    private function min(a as Number, b as Number) as Number {
        return a < b ? a : b;
    }

    function onExitSleep() as Void {
        _asleep = false;
        WatchUi.requestUpdate();
    }

    function onEnterSleep() as Void {
        _asleep = true;
        WatchUi.requestUpdate();
    }
}
