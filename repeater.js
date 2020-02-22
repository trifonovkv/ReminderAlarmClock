const Mainloop = imports.mainloop;
const GLib = imports.gi.GLib;


class Repeater {

    constructor(minutesCallback, secondsCallback, endCallback) {
        this.oneSourceId = 0;
        this.twoSourceId = 0;
        this.minutesCallback = minutesCallback;
        this.secondsCallback = secondsCallback;
        this.endCallback = endCallback;
    }

    _call_periodic(timeout, count, callback, notify) {
        let that = this;
        return function recursive() {
            if (count > 0) {
                // async run callback
                Mainloop.idle_add(callback);
                that.twoSourceId = Mainloop.timeout_add_seconds(
                    timeout,
                    that._call_periodic(timeout, count - 1, callback, notify)
                );
            }
            else {
                if (notify != undefined) {
                    notify();
                }
            }
        }
    }

    _safetyDestroySourceById(sourceId) {
        if (sourceId > 0) {
            let source = GLib.main_context_default().find_source_by_id(sourceId);
            if (source != null) {
                source.destroy();
            }
        }
    }

    call_every_minute_then_every_second(seconds) {
        let minutes = Math.floor(seconds / 60);
        let timeout;
        let leftSeconds;

        if (seconds < 60) {
            leftSeconds = seconds;
            timeout = 0;
        }
        else {
            leftSeconds = 60;
            timeout = seconds - 60;
        }

        if (minutes > 0) {
            (this._call_periodic(60, minutes, this.minutesCallback))();
        }

        if (leftSeconds > 0) {
            this.oneSourceId = Mainloop.timeout_add_seconds(
                timeout,
                this._call_periodic(1, leftSeconds, this.secondsCallback, this.endCallback)
            );
        }
    }

    reset() {
        this._safetyDestroySourceById(this.oneSourceId);
        this._safetyDestroySourceById(this.twoSourceId);
    }
}