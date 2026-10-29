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
import Toybox.WatchUi;

// Race Timing palette, matching the site's tokens in src/styles/global.css.
const COLOR_BG = 0x000000;
const COLOR_SURFACE = 0x151A21;
const COLOR_LINE = 0x262C36;
const COLOR_INK = 0xF2F4F7;
const COLOR_MUTED = 0xA9B2C0;
const COLOR_FAINT = 0x7D8796;
const COLOR_ACCENT = 0xFFB020;

// The five legs of the day ring, in race order.
const LEG_NAMES = ["SWIM", "T1", "BIKE", "T2", "RUN"];
const LEG_PROPS = ["SwimMin", "T1Min", "BikeMin", "T2Min", "RunMin"];
const LEG_DEFAULTS = [32, 4, 155, 3, 106];
const LEG_COLORS = [0x2EA4DC, 0x8A939F, 0xF28E42, 0x8A939F, 0x35C177];
const LEG_DIMS = [0x0F3446, 0x2C2F33, 0x4D2D15, 0x2C2F33, 0x113E26];

const DAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTH_NAMES = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

// Always-on drift, one step per minute, so no pixel stays lit in one place.
const AOD_SHIFTS = [[0, 0], [3, 2], [-2, 3], [-3, -2], [2, -3]];

// Layout is designed on the 454px Fenix 9 Pro 47mm and scaled from there.
const DESIGN_SIZE = 454.0;
const RING_R = 213;
const RING_W = 12;
const GAP_DEG = 1.5;

class SplitDecisionsView extends WatchUi.WatchFace {

    private var _asleep as Boolean = false;

    private var _timeFont as WatchUi.FontResource;
    private var _labelFont as WatchUi.FontResource;
    private var _smallFont as WatchUi.FontResource;
    private var _legFont as WatchUi.FontResource;
    private var _dateFont as WatchUi.FontResource;
    private var _valueFont as WatchUi.FontResource;
    private var _secsFont as WatchUi.FontResource;
    private var _wordmark as WatchUi.BitmapResource;

    // Set at the top of each onUpdate.
    private var _cx as Number = 227;
    private var _cy as Number = 227;
    private var _s as Float = 1.0;

    function initialize() {
        WatchFace.initialize();
        _timeFont = WatchUi.loadResource(Rez.Fonts.TimeLarge) as WatchUi.FontResource;
        _labelFont = WatchUi.loadResource(Rez.Fonts.MonoLabel) as WatchUi.FontResource;
        _smallFont = WatchUi.loadResource(Rez.Fonts.MonoSmall) as WatchUi.FontResource;
        _legFont = WatchUi.loadResource(Rez.Fonts.MonoLeg) as WatchUi.FontResource;
        _dateFont = WatchUi.loadResource(Rez.Fonts.MonoDate) as WatchUi.FontResource;
        _valueFont = WatchUi.loadResource(Rez.Fonts.MonoValue) as WatchUi.FontResource;
        _secsFont = WatchUi.loadResource(Rez.Fonts.MonoSecs) as WatchUi.FontResource;
        _wordmark = WatchUi.loadResource(Rez.Drawables.Wordmark) as WatchUi.BitmapResource;
    }

    function onUpdate(dc as Graphics.Dc) as Void {
        var w = dc.getWidth();
        var h = dc.getHeight();
        _s = w / DESIGN_SIZE;

        var settings = System.getDeviceSettings();
        var burnIn = (settings has :requiresBurnInProtection) && settings.requiresBurnInProtection;
        var aod = _asleep && burnIn;
        var showSeconds = !_asleep;

        var clock = System.getClockTime();
        var mins = clock.hour * 60 + clock.min + (showSeconds ? clock.sec / 60.0 : 0.0);
        var nowDeg = mins / 1440.0 * 360.0;

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

        // Day ring: race splits stretched over 24 hours, lit up to now.
        var ends = legEnds();
        var start = 0.0;
        for (var i = 0; i < LEG_NAMES.size(); i++) {
            var a0 = start / 1440.0 * 360.0 + GAP_DEG / 2;
            var a1 = ends[i] / 1440.0 * 360.0 - GAP_DEG / 2;
            if (!aod) {
                drawRingArc(dc, a0, a1, LEG_DIMS[i], RING_W, RING_R);
            }
            drawRingArc(dc, a0, a1 < nowDeg ? a1 : nowDeg, LEG_COLORS[i], aod ? 4 : RING_W, aod ? RING_R - 4 : RING_R);
            start = ends[i];
        }
        var rad = Math.toRadians(nowDeg - 90);
        dc.setColor(COLOR_INK, Graphics.COLOR_TRANSPARENT);
        dc.setPenWidth(aod ? 3 : 4);
        dc.drawLine(
            _cx + Math.cos(rad) * (RING_R - 14) * _s, _cy + Math.sin(rad) * (RING_R - 14) * _s,
            _cx + Math.cos(rad) * (RING_R + 8) * _s, _cy + Math.sin(rad) * (RING_R + 8) * _s
        );

        if (!aod) {
            dc.drawBitmap(_cx - _wordmark.getWidth() / 2, y(80) - _wordmark.getHeight(), _wordmark);
        }

        // Date
        var today = Gregorian.info(Time.now(), Time.FORMAT_SHORT);
        var dateStr = DAY_NAMES[(today.day_of_week as Number) - 1] + " " + (today.day as Number).format("%02d") + " "
            + MONTH_NAMES[(today.month as Number) - 1];
        drawBaseline(dc, _cx, y(114), _dateFont, dateStr, aod ? COLOR_FAINT : COLOR_MUTED, Graphics.TEXT_JUSTIFY_CENTER);

        // Time, with amber seconds while awake
        var hour = clock.hour;
        var timeStr;
        if (settings.is24Hour) {
            timeStr = hour.format("%02d") + ":" + clock.min.format("%02d");
        } else {
            hour = hour % 12 == 0 ? 12 : hour % 12;
            timeStr = hour.format("%d") + ":" + clock.min.format("%02d");
        }
        var secStr = clock.sec.format("%02d");
        var tw = dc.getTextWidthInPixels(timeStr, _timeFont);
        var sw = showSeconds ? dc.getTextWidthInPixels(secStr, _secsFont) + 8 : 0;
        var left = _cx - (tw + sw) / 2;
        drawBaseline(dc, left, y(240), _timeFont, timeStr, aod ? COLOR_MUTED : COLOR_INK, Graphics.TEXT_JUSTIFY_LEFT);
        if (showSeconds) {
            drawBaseline(dc, left + tw + 8, y(240), _secsFont, secStr, COLOR_ACCENT, Graphics.TEXT_JUSTIFY_LEFT);
        }

        // Leg line: "BIKE  T2 IN 3:05"
        var leg = LEG_NAMES.size() - 1;
        for (var i = 0; i < ends.size(); i++) {
            if (mins < ends[i]) {
                leg = i;
                break;
            }
        }
        var next = leg < LEG_NAMES.size() - 1 ? LEG_NAMES[leg + 1] : "FINISH";
        var rest = "  " + next + " IN " + formatMinutes(ends[leg] - mins);
        var lw = dc.getTextWidthInPixels(LEG_NAMES[leg], _legFont);
        var rw = dc.getTextWidthInPixels(rest, _legFont);
        var lx = _cx - (lw + rw) / 2;
        drawBaseline(dc, lx, y(278), _legFont, LEG_NAMES[leg], LEG_COLORS[leg], Graphics.TEXT_JUSTIFY_LEFT);
        drawBaseline(dc, lx + lw, y(278), _legFont, rest, aod ? COLOR_FAINT : COLOR_MUTED, Graphics.TEXT_JUSTIFY_LEFT);

        if (!aod) {
            drawSplitsPanel(dc);
            var battery = System.getSystemStats().battery.toNumber();
            drawBaseline(dc, _cx, y(402), _smallFont, "BATT " + battery + "%", COLOR_FAINT, Graphics.TEXT_JUSTIFY_CENTER);
        }

        if (aod) {
            // Black out every other row, alternating each minute, for AMOLED burn-in protection.
            if (dc has :setAntiAlias) {
                dc.setAntiAlias(false);
            }
            dc.setColor(COLOR_BG, COLOR_BG);
            dc.setPenWidth(1);
            for (var row = clock.min % 2; row < h; row += 2) {
                dc.drawLine(0, row, w, row);
            }
        }
    }

    // The timing-mat strip: HR, steps, Body Battery.
    private function drawSplitsPanel(dc as Graphics.Dc) as Void {
        var px = x(90);
        var py = y(300);
        var pw = (274 * _s).toNumber();
        var ph = (66 * _s).toNumber();
        dc.setColor(COLOR_SURFACE, Graphics.COLOR_TRANSPARENT);
        dc.fillRoundedRectangle(px, py, pw, ph, 6);
        dc.setColor(COLOR_ACCENT, Graphics.COLOR_TRANSPARENT);
        dc.fillRectangle(px, py, pw, 3);

        var hr = heartRate();
        var bb = bodyBattery();
        var steps = ActivityMonitor.getInfo().steps;
        var labels = ["HR", "STEPS", "BODY BAT"];
        var values = [
            hr == null ? "--" : hr.toString(),
            steps == null ? "--" : thousands(steps),
            bb == null ? "--" : bb.toString()
        ];
        var cw = pw / labels.size();
        for (var i = 0; i < labels.size(); i++) {
            var cellX = px + cw * i + cw / 2;
            if (i > 0) {
                dc.setColor(COLOR_LINE, Graphics.COLOR_TRANSPARENT);
                dc.fillRectangle(px + cw * i, py + 12, 1, ph - 22);
            }
            drawBaseline(dc, cellX, py + 24, _labelFont, labels[i], COLOR_FAINT, Graphics.TEXT_JUSTIFY_CENTER);
            drawBaseline(dc, cellX, py + 55, _valueFont, values[i], COLOR_INK, Graphics.TEXT_JUSTIFY_CENTER);
        }
    }

    // Draws an arc clockwise from a0 to a1, both in degrees from 12 o'clock.
    private function drawRingArc(dc as Graphics.Dc, a0 as Float, a1 as Float, color as Number, width as Number, r as Number) as Void {
        if (a1 - a0 < 0.5) {
            return;
        }
        dc.setColor(color, Graphics.COLOR_TRANSPARENT);
        dc.setPenWidth((width * _s).toNumber());
        dc.drawArc(_cx, _cy, (r * _s).toNumber(), Graphics.ARC_CLOCKWISE, toArcDegrees(a0), toArcDegrees(a1));
    }

    // Garmin arcs count counter-clockwise from 3 o'clock.
    private function toArcDegrees(clockDeg as Float) as Float {
        var d = 90.0 - clockDeg;
        while (d < 0) {
            d += 360.0;
        }
        return d;
    }

    // Each leg's end as a minute of the day, from the split settings.
    private function legEnds() as Array<Float> {
        var splits = [] as Array<Number>;
        var total = 0;
        for (var i = 0; i < LEG_PROPS.size(); i++) {
            var v = Application.Properties.getValue(LEG_PROPS[i]);
            var m = (v instanceof Number && v > 0) ? v : LEG_DEFAULTS[i];
            splits.add(m);
            total += m;
        }
        var ends = [] as Array<Float>;
        var acc = 0;
        for (var i = 0; i < splits.size(); i++) {
            acc += splits[i];
            ends.add(acc * 1440.0 / total);
        }
        return ends;
    }

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

    private function bodyBattery() as Number? {
        if ((Toybox has :SensorHistory) && (SensorHistory has :getBodyBatteryHistory)) {
            var sample = SensorHistory.getBodyBatteryHistory({:period => 1}).next();
            if (sample != null && sample.data != null) {
                return sample.data.toNumber();
            }
        }
        return null;
    }

    // Text placed by its baseline, the way the mockup lays it out.
    private function drawBaseline(dc as Graphics.Dc, px as Numeric, baseline as Numeric, font as WatchUi.FontResource,
            text as String, color as Number, justify as Number) as Void {
        dc.setColor(color, Graphics.COLOR_TRANSPARENT);
        dc.drawText(px, baseline - Graphics.getFontAscent(font), font, text, justify);
    }

    private function x(v as Numeric) as Number {
        return _cx + ((v - 227) * _s).toNumber();
    }

    private function y(v as Numeric) as Number {
        return _cy + ((v - 227) * _s).toNumber();
    }

    private function formatMinutes(m as Float) as String {
        var t = m.toNumber();
        return (t / 60).format("%d") + ":" + (t % 60).format("%02d");
    }

    private function thousands(n as Number) as String {
        if (n < 1000) {
            return n.toString();
        }
        return thousands(n / 1000) + "," + (n % 1000).format("%03d");
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
