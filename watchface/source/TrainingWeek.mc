import Toybox.Activity;
import Toybox.Lang;
import Toybox.Time;
import Toybox.Time.Gregorian;
import Toybox.UserProfile;

// Index order used everywhere for the three sports.
const SPORT_SWIM = 0;
const SPORT_BIKE = 1;
const SPORT_RUN = 2;

// This week's swim, bike and run, Monday to now, from activities recorded on the watch.
// Anything logged elsewhere (like polo added by hand on Strava) won't show up.
class TrainingWeek {

    var meters as Array<Float> = [0.0, 0.0, 0.0] as Array<Float>;
    var seconds as Array<Number> = [0, 0, 0] as Array<Number>;
    // One entry per day, Monday first. Bit 0 swim, bit 1 bike, bit 2 run.
    var dayMask as Array<Number> = [0, 0, 0, 0, 0, 0, 0] as Array<Number>;

    function initialize() {
    }

    function load() as Void {
        meters = [0.0, 0.0, 0.0] as Array<Float>;
        seconds = [0, 0, 0] as Array<Number>;
        dayMask = [0, 0, 0, 0, 0, 0, 0] as Array<Number>;
        if (!(UserProfile has :getUserActivityHistory)) {
            return;
        }
        var weekStart = mondayStart();
        var history = UserProfile.getUserActivityHistory();
        var activity = history.next();
        while (activity != null) {
            var sport = sportIndex(activity.type);
            var start = activity.startTime;
            if (sport >= 0 && start != null && start.value() >= weekStart) {
                if (activity.distance != null) {
                    meters[sport] += activity.distance.toFloat();
                }
                if (activity.duration != null) {
                    seconds[sport] += activity.duration.value();
                }
                var day = (start.value() - weekStart) / Gregorian.SECONDS_PER_DAY;
                if (day >= 0 && day < 7) {
                    dayMask[day] = dayMask[day] | (1 << sport);
                }
            }
            activity = history.next();
        }
    }

    function totalMinutes() as Number {
        return (seconds[SPORT_SWIM] + seconds[SPORT_BIKE] + seconds[SPORT_RUN]) / 60;
    }

    // 0 for Monday through 6 for Sunday.
    static function todayIndex() as Number {
        var info = Gregorian.info(Time.now(), Time.FORMAT_SHORT);
        return ((info.day_of_week as Number) + 5) % 7;
    }

    // Local midnight at the start of this Monday, in epoch seconds.
    private function mondayStart() as Number {
        return Time.today().value() - TrainingWeek.todayIndex() * Gregorian.SECONDS_PER_DAY;
    }

    private function sportIndex(type as Activity.Sport?) as Number {
        if (type == Activity.SPORT_SWIMMING) {
            return SPORT_SWIM;
        } else if (type == Activity.SPORT_CYCLING) {
            return SPORT_BIKE;
        } else if (type == Activity.SPORT_RUNNING) {
            return SPORT_RUN;
        }
        return -1;
    }
}
