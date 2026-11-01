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
const WEEK_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

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
    private var _numData as WatchUi.FontResource;
    private var _numDetail as WatchUi.FontResource;
    private var _label as WatchUi.FontResource;
    private var _bold as WatchUi.FontResource;

    // Set at the top of each onUpdate.
    private var _cx as Number = 227;
    private var _cy as Number = 227;
    private var _s as Float = 1.0;

    function initialize() {
        WatchFace.initialize();
        _segTime = WatchUi.loadResource(Rez.Fonts.SegTime) as WatchUi.FontResource;
        _segSecs = WatchUi.loadResource(Rez.Fonts.SegSecs) as WatchUi.FontResource;
        _numData = WatchUi.loadResource(Rez.Fonts.NumData) as WatchUi.FontResource;
        _numDetail = WatchUi.loadResource(Rez.Fonts.NumDetail) as WatchUi.FontResource;
        _label = WatchUi.loadResource(Rez.Fonts.MonoLabel) as WatchUi.FontResource;
        _bold = WatchUi.loadResource(Rez.Fonts.MonoBold) as WatchUi.FontResource;
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

        drawTopRow(dc);
        drawWeekStrip(dc);
        drawClock(dc, clock, settings.is24Hour);
        drawCentered(dc, y(298), _bold, dateText(Gregorian.info(Time.now(), Time.FORMAT_SHORT)), COLOR_MUTED);
        var plan = planText();
        if (plan != null) {
            drawCentered(dc, y(324), _bold, plan, COLOR_INK);
        }
        drawWeekSplits(dc);
    }

    // Three gauges flush with the bezel (Body Battery, race countdown, week hours), one per third of the dial, with 30 degree gaps at 12, 4 and 8 o'clock.
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

        // Right, 1 to 4 o'clock: plan start to race day, filling upward as the race gets closer.
        var progress = raceProgress();
        if (progress != null) {
            drawClockArc(dc, 105.0, 105.0 - 90.0 * progress, COLOR_INK, width);
        }

        // Bottom, 5 to 7 o'clock: this week's hours by sport, filling left to right toward the target.
        var target = targetMinutes();
        var done = 0;
        for (var i = 0; i < 3; i++) {
            var from = 225.0 - 90.0 * min(done, target) / target;
            done += _week.seconds[i] / 60;
            var to = 225.0 - 90.0 * min(done, target) / target;
            drawClockArc(dc, from, to + 0.8, SPORT_COLORS[i], width);
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
            var colX = _cx + (((i - 1) * 86) * _s).toNumber();
            var x0 = colX - (vw + 3 + uw - 12) / 2;
            dc.setColor(SPORT_COLORS[i], Graphics.COLOR_TRANSPARENT);
            dc.fillRectangle(x0 - 12, y(346), 6, 6);
            drawBaseline(dc, x0, y(358), _numDetail, value, COLOR_INK, Graphics.TEXT_JUSTIFY_LEFT);
            drawBaseline(dc, x0 + vw + 3, y(358), _label, unit, COLOR_FAINT, Graphics.TEXT_JUSTIFY_LEFT);
        }
        drawRuns(dc, y(390), [
            [formatMinutes(_week.totalMinutes()), _numData, COLOR_INK, 2],
            ["/" + (targetMinutes() / 60).toString() + "H", _label, COLOR_FAINT, 0]
        ]);
    }

    // HR with a zone pip, steps, weather.
    private function drawTopRow(dc as Graphics.Dc) as Void {
        var hr = heartRate();
        var steps = ActivityMonitor.getInfo().steps;
        var labels = ["HR", "STEPS", "WEATHER"];
        var values = [
            hr == null ? "--" : hr.toString(),
            steps == null ? "--" : thousands(steps),
            temperature()
        ];
        for (var i = 0; i < 3; i++) {
            var colX = _cx + (((i - 1) * 100) * _s).toNumber();
            drawBaseline(dc, colX, y(80), _label, labels[i], COLOR_FAINT, Graphics.TEXT_JUSTIFY_CENTER);
            drawBaseline(dc, colX, y(108), _numData, values[i], COLOR_INK, Graphics.TEXT_JUSTIFY_CENTER);
        }
        if (hr != null) {
            var vw = dc.getTextWidthInPixels(values[0], _numData);
            dc.setColor(zoneColor(hr), Graphics.COLOR_TRANSPARENT);
            dc.fillCircle(_cx - (100 * _s).toNumber() - vw / 2 - 10, y(99), 4);
        }
    }

    // Monday to Sunday with sport dots. Today is amber.
    private function drawWeekStrip(dc as Graphics.Dc) as Void {
        var todayIdx = TrainingWeek.todayIndex();
        for (var i = 0; i < 7; i++) {
            var lx = _cx + (((i - 3) * 26) * _s).toNumber();
            var color = i == todayIdx ? COLOR_ACCENT : (i > todayIdx ? COLOR_FAINT : COLOR_MUTED);
            drawBaseline(dc, lx, y(150), _bold, WEEK_LETTERS[i], color, Graphics.TEXT_JUSTIFY_CENTER);
            if (i == todayIdx) {
                dc.setColor(COLOR_ACCENT, Graphics.COLOR_TRANSPARENT);
                dc.fillRectangle(lx - 7, y(155), 14, 2);
            }
            var mask = _week.dayMask[i];
            var count = 0;
            for (var s = 0; s < 3; s++) {
                if ((mask & (1 << s)) != 0) {
                    count++;
                }
            }
            var dx = lx - count * 7 / 2 + 1;
            for (var s = 0; s < 3; s++) {
                if ((mask & (1 << s)) != 0) {
                    dc.setColor(SPORT_COLORS[s], Graphics.COLOR_TRANSPARENT);
                    dc.fillRectangle(dx, y(161), 5, 5);
                    dx += 7;
                }
            }
        }
    }

    // Segment time, dead center, with faint unlit segments. Amber seconds hang off the right,
    // and the two side gauges' readouts sit either side.
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
            drawBaseline(dc, left + tw + 10 + sw / 2, top + 22, _label, clock.hour < 12 ? "AM" : "PM", COLOR_FAINT, Graphics.TEXT_JUSTIFY_CENTER);
        }
        drawTop(dc, left + tw + 10, top + 46, _segSecs, "88", COLOR_GHOST);
        drawTop(dc, left + tw + 10, top + 46, _segSecs, secStr, COLOR_ACCENT);

        var bb = bodyBattery();
        drawBaseline(dc, x(46), top + 40, _numData, bb == null ? "--" : bb.toString(), COLOR_INK, Graphics.TEXT_JUSTIFY_CENTER);
        drawBaseline(dc, x(46), top + 58, _label, "BB", COLOR_FAINT, Graphics.TEXT_JUSTIFY_CENTER);
        var daysLeft = daysUntil(Application.Properties.getValue("RaceDate"), Gregorian.info(Time.now(), Time.FORMAT_SHORT));
        drawBaseline(dc, x(410), top + 40, _numData, daysLeft == null ? "--" : daysLeft.toString(), COLOR_INK, Graphics.TEXT_JUSTIFY_CENTER);
        drawBaseline(dc, x(410), top + 58, _label, "DAYS", COLOR_FAINT, Graphics.TEXT_JUSTIFY_CENTER);
    }

    // Wrist down: dimmed time and date with the gauges, then every other row blacked out
    // (alternating each minute) for AMOLED burn-in protection.
    private function drawAlwaysOn(dc as Graphics.Dc, clock as System.ClockTime) as Void {
        var timeStr = hourText(clock.hour, System.getDeviceSettings().is24Hour) + ":" + clock.min.format("%02d");
        var tw = dc.getTextWidthInPixels(timeStr, _segTime);
        drawTop(dc, _cx - tw / 2, y(189), _segTime, timeStr, COLOR_MUTED);
        drawCentered(dc, y(298), _bold, dateText(Gregorian.info(Time.now(), Time.FORMAT_SHORT)), COLOR_FAINT);

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

    private function bodyBattery() as Number? {
        if ((Toybox has :SensorHistory) && (SensorHistory has :getBodyBatteryHistory)) {
            var sample = SensorHistory.getBodyBatteryHistory({:period => 1}).next();
            if (sample != null && sample.data != null) {
                return sample.data.toNumber();
            }
        }
        return null;
    }

    // How far from plan start to race day, 0.0 to 1.0, or null if either date doesn't parse.
    private function raceProgress() as Float? {
        var today = Gregorian.info(Time.now(), Time.FORMAT_SHORT);
        var sinceStart = daysUntil(Application.Properties.getValue("PlanStart"), today);
        var daysLeft = daysUntil(Application.Properties.getValue("RaceDate"), today);
        if (sinceStart == null || daysLeft == null) {
            return null;
        }
        var span = daysLeft - sinceStart;
        if (span <= 0) {
            return null;
        }
        var done = 1.0 - daysLeft.toFloat() / span;
        return done < 0.0 ? 0.0 : (done > 1.0 ? 1.0 : done);
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

    // "BASE WK 1", or "BASE IN 2D" before the block starts.
    private function planText() as String? {
        var name = Application.Properties.getValue("PlanName");
        var today = Gregorian.info(Time.now(), Time.FORMAT_SHORT);
        var until = daysUntil(Application.Properties.getValue("PlanStart"), today);
        if (!(name instanceof String) || until == null) {
            return null;
        }
        if (until > 0) {
            return name.toUpper() + " IN " + until.toString() + "D";
        }
        return name.toUpper() + " WK " + (-until / 7 + 1).toString();
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
            total += dc.getTextWidthInPixels(p[0] as String, p[1] as WatchUi.FontResource) + (p[3] as Number);
        }
        var px = _cx - total / 2;
        for (var i = 0; i < pieces.size(); i++) {
            var p = pieces[i];
            drawBaseline(dc, px, baseline, p[1] as WatchUi.FontResource, p[0] as String, p[2] as Number, Graphics.TEXT_JUSTIFY_LEFT);
            px += dc.getTextWidthInPixels(p[0] as String, p[1] as WatchUi.FontResource) + (p[3] as Number);
        }
    }

    private function drawCentered(dc as Graphics.Dc, baseline as Number, font as WatchUi.FontResource, text as String, color as Number) as Void {
        drawBaseline(dc, _cx, baseline, font, text, color, Graphics.TEXT_JUSTIFY_CENTER);
    }

    // Text placed by its baseline, the way the mockup lays it out.
    private function drawBaseline(dc as Graphics.Dc, px as Numeric, baseline as Numeric, font as WatchUi.FontResource,
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
