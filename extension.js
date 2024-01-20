'use strict';

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Config from 'resource:///org/gnome/shell/misc/config.js';

import SoundPlayer from './sound_player.js';
import AlarmClock from './alarm_clock.js';

const [SHELL_MAJOR, SHELL_MINOR] = Config.PACKAGE_VERSION.split('.').map(s => Number(s));


// need to keep while lock screen
var SavedEndDate = null;

const Icon = {
    ON: 'icons/sand-clock-on-symbolic.svg',
    OFF: 'icons/sand-clock-off-symbolic.svg',
};


Number.prototype.pad = function (size) {
    let s = String(this);
    while (s.length < (size || 2)) { s = "0" + s; }
    return s;
}


var ReminderAlarmClock = GObject.registerClass(
class ReminderAlarmClock extends PanelMenu.Button {
    _init(extension) {
        super._init(0.0, `${extension.metadata.name} ReminderAlarmClock`, false);

        this.extension = extension;
        this.ResetLabel = _('R');

        this.icon = new St.Icon({ style_class: 'system-status-icon' });
        this.label = new St.Label({
            text: ':00', y_align: Clutter.ActorAlign.CENTER
        });
        this.insert_child_at_index(this.icon, 0);

        this.timeLabel = new St.Label({ style_class: 'rac-time-label' });

        this.settings = extension.getSettings();

        this.messageEntry = new St.Entry({
            track_hover: false,
            can_focus: true,
            style_class: 'rac-message-entry',
            text: this.settings.get_value('message').deep_unpack()
        });

        this.alarmClock = new AlarmClock(
            (hm) => {
                this.label.text = Math.round(hm / 2) + ':';
            },
            (s) => { this.label.text = ':' + s.pad(); },
            () => {
                this._updateTaskbar(false);
                this._showReminder();
                // repeat notification
                if (this.settings.get_value('repeat').deep_unpack()) {
                    this.setEndDate(this._getRepeatTime(this.settings.get_value(
                        'time-repeat').deep_unpack()));
                }
            }
        );

        // to prevent an empty label after sleep mode
        this._updateTimeLabel();

        let menuItem = new PopupMenu.PopupBaseMenuItem({
            can_focus: false, reactive: false
        });
        let presents = this.settings.get_value('presents').deep_unpack()
        menuItem.actor.add(this._makeUi(this._toLabels(presents)));
        this.menu.addMenuItem(menuItem);

        this.menu.connect('open-state-changed', () => {
            this._updateTimeLabel();
            this.settings.set_value(
                'message', new GLib.Variant('s', this.messageEntry.text))
        });

        this.settings.connect(
            'changed::drop-seconds',
            this._onDropSecondsChanged.bind(this)
        );

        this.settings.connect(
            'changed::play-sound',
            this._onPlaySoundChanged.bind(this)
        );

        this.settings.connect(
            'changed::auto-close-reminder-window',
            this._onAutoCloseReminderWindowChanged.bind(this)
        );

        this.settings.connect(
            'changed::show-test-notification', this._showReminder.bind(this)
        );

        this.settings.connect(
            'changed::show-remaining-time-in-taskbar',
            this._onShowRemainingTimeInTaskbarChanged.bind(this)
        );

        this.settings.connect(
            'changed::repeat', this._onRepeatChanged.bind(this)
        );

        this.settings.connect(
            'changed::time-repeat', this._onRepeatChanged.bind(this)
        );

        this._onDropSecondsChanged();
        this._onPlaySoundChanged();
        this._onAutoCloseReminderWindowChanged();
        this._onShowRemainingTimeInTaskbarChanged();
        this._onRepeatChanged();
    }

    _makeUi(labels) {
        let oneBox = new St.BoxLayout({ vertical: false });
        oneBox.add(this._makeButtonsColon([labels[2], labels[3]]));
        oneBox.add(this._makeButtonsColon([labels[4], labels[5]]));

        let twoBox = new St.BoxLayout({ vertical: true });
        twoBox.add(this.timeLabel);
        twoBox.add(oneBox);

        let threeBox = new St.BoxLayout({ vertical: false });
        threeBox.add(twoBox);
        threeBox.add(
            this._makeButtonsColon([this.ResetLabel, labels[0], labels[1]]));

        let mainBox = new St.BoxLayout({ vertical: true });
        mainBox.add(threeBox);
        mainBox.add(this.messageEntry);

        return mainBox;
    }

    _makeButtonsColon(labels) {
        let box = new St.BoxLayout({ vertical: true });
        labels.forEach(label => {
            box.add_child(this._createButton(label));
        });
        return box;
    }

    _updateTimeLabel() {
        let date = this.alarmClock.getEndDate();
        this.timeLabel.text = date.toLocaleString('en-us', {
            hour12: false, hour: '2-digit', minute: '2-digit'
        });
    }

    _createButton(label) {
        let button = new St.Button({
            label: label, style_class: 'button rac-minutes-button'
        });
        button.connect('clicked', () => {
            if (button.label == this.ResetLabel) {
                this._resetAlarm();
            }
            else {
                let integer = parseInt(button.label, 10);
                let minutes = isNaN(integer) ? 0 : integer;
                this._startAlarm(minutes);
            }
        });

        return button;
    }

    _startAlarm(minutes) {
        this.alarmClock.isOnlyAlarm =
            !this.isShowRemainingTimeInTaskbar;
        this.alarmClock.add(minutes);
        this.alarmClock.start();
        this._updateTimeLabel();
        this._updateTaskbar(this.alarmClock.isRunning());
    }

    _resetAlarm() {
        this.alarmClock.reset();
        this._updateTimeLabel();
        this._updateTaskbar(this.alarmClock.isRunning());
    }

    _setPanelMenuIcon(icon) {
        this.icon.gicon = new Gio.FileIcon({
            file: Gio.File.new_for_path(this.extension.dir.get_child(icon).get_path())
        });
    }

    _showReminder() {
        if (this.isPlaySound) {
            this._playSound();
        }
        if (this.isAutoCloseReminderWindow) {
            this._showReminderWithoutCloseButton();
        }
        else {
            this._showReminderWithCloseButton();
        }
    }

    _showReminderWithoutCloseButton() {
        let reminder = new St.Label({
            style_class: 'rac-message-label-with-border'
        });
        Main.uiGroup.add_actor(reminder);
        reminder.text = this.messageEntry.text;
        reminder.opacity = 255;
        this._setReminderPosition(reminder);

        reminder.ease({
            opacity: 0,
            duration: 5000,
            transition: Clutter.AnimationMode.EASE_OUT_QUAD,
            onComplete: () => {
                Main.uiGroup.remove_actor(reminder);
            }
        });
    }

    _showReminderWithCloseButton() {
        let label = new St.Label({
            text: this.messageEntry.text, style_class: 'rac-message-label'
        });
        let button = new St.Button({
            label: _('Close'), style_class: 'rac-message-close-button'
        });
        let reminder = new St.BoxLayout({
            vertical: true, style_class: 'rac-message-layout'
        });
        button.connect('clicked', () => {
            Main.uiGroup.remove_actor(reminder);

            let _modalArg = reminder;
            if(SHELL_MAJOR > 4 || (SHELL_MAJOR == 4 && SHELL_MINOR >= 42)) {
                _modalArg = this._modalGrab;
            }

            if(_modalArg) {
                Main.popModal(_modalArg);
            }
        });
        reminder.add(label);
        reminder.add(button);
        Main.uiGroup.add_actor(reminder);
        this._setReminderPosition(reminder);
        this._modalGrab = Main.pushModal(reminder);
    }

    _setReminderPosition(reminder) {
        let monitor = Main.layoutManager.primaryMonitor;

        reminder.set_position(
            monitor.x + Math.floor(monitor.width / 2 - reminder.width / 2),
            monitor.y + Math.floor(monitor.height / 2 - reminder.height / 2));
    }

    _playSound() {
        new SoundPlayer().play(
            this.settings.get_string('sound-file-path'));
    }

    _updateTaskbar(isOn) {
        let oldChild = this.get_first_child();
        let newChild = this.icon;
        if (this.isShowRemainingTimeInTaskbar && isOn) {
            newChild = this.label;
        }
        else {
            this._setPanelMenuIcon(isOn ? Icon.ON : Icon.OFF);
        }

        if (oldChild != newChild) {
            this.replace_child(oldChild, newChild);
        }
    }

    _getRepeatTime(timeString) {
        let parts = timeString.split(':');
        let repeatTime = new Date();
        repeatTime.setHours(parts[0]);
        repeatTime.setMinutes(parts[1]);
        repeatTime.setSeconds(0);
        repeatTime.setMilliseconds(0);
        let oneSecond = 1000;
        return repeatTime.getTime() - Date.now() < oneSecond
            // shift for one day 
            ? new Date(repeatTime.getTime() + 24 * 60 * 60 * 1000)
            : repeatTime;
    }

    _onDropSecondsChanged() {
        this.alarmClock.isDropSeconds = this.settings.get_value(
            'drop-seconds').deep_unpack();
    }

    _onPlaySoundChanged() {
        this.isPlaySound = this.settings.get_value('play-sound').deep_unpack();
    }

    _onAutoCloseReminderWindowChanged() {
        this.isAutoCloseReminderWindow = this.settings.get_value(
            'auto-close-reminder-window').deep_unpack();
    }

    _onShowRemainingTimeInTaskbarChanged() {
        this.isShowRemainingTimeInTaskbar = this.settings.get_value(
            'show-remaining-time-in-taskbar').deep_unpack();
        this._updateTaskbar(this.alarmClock.isRunning());
        if (this.alarmClock.isRunning()) {
            // restart alarm
            this.setEndDate(this.getEndDate());
        }
    }

    _onRepeatChanged() {
        if (this.settings.get_value('repeat').deep_unpack()) {
            this.alarmClock.reset();
            this.setEndDate(this._getRepeatTime(
                this.settings.get_value('time-repeat').deep_unpack()));
        }
        else {
            this._resetAlarm();
        }
    }

    _toLabels(presents) {
        let r = new Array();
        presents = presents.replace(/\s\s+/g, ' ').trim();
        presents.split(' ').forEach((item) => {
            r.push('+' + item)
        });
        return r;
    }

    destroy() {
        this.alarmClock.reset();
        super.destroy();
    }

    getEndDate() {
        return this.alarmClock.isRunning()
            ? this.alarmClock.getEndDate()
            : null;
    }

    setEndDate(date) {
        this._resetAlarm();
        let diff = date - Date.now();
        this._startAlarm(diff > 0 ? (diff / 1000) / 60 : 0);
    }
});

// Compatibility with gnome-shell >= 3.32
if (SHELL_MAJOR == 3 && SHELL_MINOR > 30) {
    ReminderAlarmClock = GObject.registerClass(
        { GTypeName: 'ReminderAlarmClock' },
        ReminderAlarmClock
    );
}

export default class ReminderAlarmClockExtension extends Extension {
    enable() {
        this.reminderAlarmClock = new ReminderAlarmClock(this);

        // The `main` import is an example of file that is mostly live instances of
        // objects, rather than reusable code. `Main.panel` is the actual panel you
        // see at the top of the screen.
        Main.panel.addToStatusArea(`${this.metadata.name} ReminderAlarmClock`, this.reminderAlarmClock);

        // restore after screen lock
        if (SavedEndDate != null) {
            this.reminderAlarmClock.setEndDate(SavedEndDate);
        }
    }

    disable() {
        SavedEndDate = this.reminderAlarmClock.getEndDate();

        // REMINDER: It's required for extensions to clean up after themselves when
        // they are disabled. This is required for approval during review!
        if (this.reminderAlarmClock !== null) {
            this.reminderAlarmClock.destroy();
            this.reminderAlarmClock = null;
        }
    }
}
