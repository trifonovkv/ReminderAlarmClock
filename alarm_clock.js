const Mainloop = imports.mainloop;
const GLib = imports.gi.GLib;


class Timer {

    constructor() {
        this.id = 0;
    }

    start(callback, seconds) {
        if (this.id > 0) {
            return false;
        }
        this.id = Mainloop.timeout_add_seconds(
            seconds,
            () => {
                return callback();
            }
        );
        return true;
    }

    reset() {
        if (this.id > 0) {
            let source = GLib.main_context_default().find_source_by_id(this.id);
            if (source != null) {
                source.destroy();
                this.id = 0;
            }
        }
    }

}


class Notification {

    constructor(callback, timeout, firstRunDelay) {
        this.callback = callback;
        this.timeout = timeout;
        this.firstRunDelay = firstRunDelay;
    }

}


class CountdownTimer {

    constructor() {
        this.timers = new Array();
        this.notifications = new Array();
        this.endDate = new Date();
        this.isRunning = false;
    }

    _getLeftBy(timeout) {
        if (timeout > 0) {
            let leftSeconds = (this.endDate - new Date()) / 1000;
            return Math.floor(leftSeconds / timeout);
        }
        return 0;
    }

    _startTimer(notification) {
        let timer = new Timer();
        this.timers.push(timer);

        let delayedCallback = () => {
            notification.firstRunDelay = 0;
            this._startTimer(notification);
            return false; // don't repeat
        }

        let repeatedlyCallback = () => {
            let left = this._getLeftBy(notification.timeout);
            if (left > 0) {
                // run separately
                Mainloop.idle_add(() => { notification.callback(left); });
                return true;  // repeat
            }
            this.isRunning = false;
            return false;  // don't repeat       
        }

        if (notification.firstRunDelay > 0) {
            return timer.start(delayedCallback, notification.firstRunDelay);
        }

        notification.callback(this._getLeftBy(notification.timeout));

        // if notification run once
        if (notification.timeout == 0) {
            this.isRunning = false;
        }

        // don't start if left seconds < 60
        if (this._getLeftBy(notification.timeout) > 1) {
            return timer.start(repeatedlyCallback, notification.timeout);
        }

        return false;
    }

    start(date) {
        this.isRunning = true;
        this.endDate = date;
        let isSuccess = false;
        this.notifications.forEach(notification => {
            isSuccess |= this._startTimer(notification);
        });
        return isSuccess;
    }

    reset() {
        this.isRunning = false;
        this.endDate = new Date();
        this.timers.forEach(timer => { timer.reset(); });
        this.timers = [];
    }

}


var AlarmClock = class AlarmClock {

    constructor(halfMinutesCallback, secondsCallback, endCallback) {
        this.halfMinutesNotification = new Notification(halfMinutesCallback, 30, 0);
        this.secondsNotification = new Notification(secondsCallback, 1, 0);
        this.endNotification = new Notification(endCallback, 0, 0);
        this.endDate = new Date();
        this.isDropSeconds = false;
        this.countdownTimer = new CountdownTimer();
        this.isOnlyAlarm = true;
    }

    add(minutes) {
        let ms = minutes * 60 * 1000;
        let now = new Date();
        if (this.endDate > now) {
            this.endDate = new Date(this.endDate.getTime() + ms);
        }
        else {
            this.endDate = new Date(now.getTime() + ms);
        }
        if (this.isDropSeconds) {
            this.endDate.setSeconds(0);
        }
    }

    start() {
        this.countdownTimer.reset();
        this.countdownTimer.notifications = [];
        let leftSeconds =
            Math.floor((this.endDate.getTime() - new Date().getTime()) / 1000);
        this.endNotification.firstRunDelay = leftSeconds;
        this.countdownTimer.notifications.push(this.endNotification);
        if (!this.isOnlyAlarm) {
            this.secondsNotification.firstRunDelay =
                leftSeconds < 60 ? 0 : leftSeconds - 60;
            this.countdownTimer.notifications.push(
                this.halfMinutesNotification,
                this.secondsNotification
            );
        }
        this.countdownTimer.start(this.endDate);
    }

    reset() {
        this.countdownTimer.reset();
        this.endDate = new Date();
    }

    isRunning() {
        return this.countdownTimer.isRunning;
    }

    getEndDate() {
        let now = new Date();
        return this.isRunning() ? this.endDate : now;
    }
}