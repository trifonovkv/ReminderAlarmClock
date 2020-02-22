const Mainloop = imports.mainloop;
const ExtensionUtils = imports.misc.extensionUtils;

const Me = ExtensionUtils.getCurrentExtension();
const REPEATER = Me.imports.repeater;


class Timer {

    constructor() {
        this.delayMinutes = 0;
        this.callback = function () { };
        this.timeoutID = 0;
        this.isDropSeconds = false;
        this.repeater = undefined;
        this.startDate = undefined;
        this.isSet = false;
    }

    // TODO check date for repeater to for thie need callback wraper
    // TODO check end date after sleep


    // TODO check date
    // system delay = ? [30sec, 1sec, 5sec]
    // if now > end date + plus system delay then just exit
    // else run callback

    
    // TODO rename to endDate and refactor
    get countDownDate() {
        let milliseconds = this.delayMinutes * 60 * 1000;
        return new Date(this.startDate.getTime() + milliseconds);
    }

    start() {
        this.startDate = new Date();

        // Find the distance between now and the count down date
        let distance
        if (this.isDropSeconds) {
            distance = this.countDownDate.setSeconds(0) - new Date();
        }
        else {
            distance = this.countDownDate - new Date();
        }
        let delay = distance < 0 ? 0 : distance;

        this.clearTimeout();
        this.timeoutID = Mainloop.timeout_add(delay, () => {
            this.callback();
            this.reset();
            return false; // Stop repeating
        }, null);

        if (this.repeater != undefined) {
            this.repeater.call_every_minute_then_every_second(this.delayMinutes * 60);
        }

        this.isSet = true;
    }

    reset() {
        this.clearTimeout();
        this.delayMinutes = 0;
        if (this.repeater != undefined) {
            this.repeater.reset();
        }
    }

    // TODO for what this method?
    clearTimeout() {
        if (this.timeoutID != 0) {
            Mainloop.source_remove(this.timeoutID);
            this.timeoutID = 0;
        }
        // TODO
        if (this.repeater != undefined) {
            this.repeater.reset();
        }
        this.isSet = false;
    }

    getLeftSeconds() {
        let milliseconds = this.delayMinutes * 60 * 1000;
        let endDate = new Date(this.startDate.getTime() + milliseconds);
        return Math.floor((endDate - new Date()) / 1000);
    }

    setRepeater(minutesCallback, secondsCallback, endCallback) {
        this.repeater = new REPEATER.Repeater(minutesCallback, secondsCallback, endCallback)
    }
}