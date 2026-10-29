import Toybox.Application;
import Toybox.Lang;
import Toybox.WatchUi;

class SplitDecisionsApp extends Application.AppBase {

    function initialize() {
        AppBase.initialize();
    }

    function getInitialView() as [WatchUi.Views] or [WatchUi.Views, WatchUi.InputDelegates] {
        return [new SplitDecisionsView()];
    }

    // Split lengths can change from Garmin Connect while the face is running.
    function onSettingsChanged() as Void {
        WatchUi.requestUpdate();
    }
}
