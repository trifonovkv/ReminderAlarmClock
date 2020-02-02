'use strict';

const Gio = imports.gi.Gio;
const Gst = imports.gi.Gst; Gst.init(null);
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;

const St = imports.gi.St;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;

const PopupMenu = imports.ui.popupMenu;
const Mainloop = imports.mainloop;
const Tweener = imports.ui.tweener;

const Config = imports.misc.config;
const SHELL_MINOR = parseInt(Config.PACKAGE_VERSION.split('.')[1]);

const SOUND_PLAYER = Me.imports.sound_player;

const Icon = {
    ON: 'icons/sand-clock-on-symbolic.svg',
    OFF: 'icons/sand-clock-off-symbolic.svg',
};


var Timer = {
    delayMinutes: 0,
    callback: function () { },
    timeoutID: 0,
    isDropSeconds: false,

    get countDownDate() {
        let milliseconds = this.delayMinutes * 60 * 1000;
        return new Date(new Date().getTime() + milliseconds);
    },

    start() {
        // Find the distance between now and the count down date
        // let isDropSeconds = this.settings.get_value('drop-seconds');
        let distance
        if (this.isDropSeconds) {
            distance = this.countDownDate.setSeconds(0) - new Date();
        }
        else {
            distance = this.countDownDate - new Date();
        }
        let delay = distance < 0 ? 0 : distance;

        Timer.clearTimeout();
        this.timeoutID = Mainloop.timeout_add(delay, () => {
            this.callback();
            this.reset();
            return false; // Stop repeating
        }, null);
    },

    reset() {
        this.clearTimeout();
        this.delayMinutes = 0;
    },

    clearTimeout() {
        if (this.timeoutID != 0) {
            Mainloop.source_remove(this.timeoutID);
            this.timeoutID = 0;
        }
    }
};

let notificationTextLabel;

var ReminderAlarmClock = class ReminderAlarmClock extends PanelMenu.Button {
    _init() {
        super._init(0.0, `${Me.metadata.name} ReminderAlarmClock`, false);

        this.icon = new St.Icon({ style_class: 'system-status-icon' });
        this.actor.add_child(this.icon);
        this._setPanelMenuIcon(Icon.OFF);

        this.timeLabel = new St.Label({ style_class: 'time-label' });

        // to prevent an empty label after sleep mode
        this._setTimeToLabel(new Date());

        // Get the GSchema source so we can lookup our settings
        let gschema = Gio.SettingsSchemaSource.new_from_directory(
            Me.dir.get_child('schemas').get_path(),
            Gio.SettingsSchemaSource.get_default(),
            false
        );

        this.settings = new Gio.Settings({
            settings_schema: gschema.lookup('org.gnome.shell.extensions.reminderalarmclock', true)
        });

        this.messageEntry = new St.Entry({
            track_hover: false,
            can_focus: true,
            style_class: 'message-entry',
            text: this.settings.get_value('message').deep_unpack()
        });

        let menuItem = new PopupMenu.PopupBaseMenuItem({ can_focus: false, reactive: false });
        let presents = this.settings.get_value('presents').deep_unpack()
        menuItem.actor.add(this._makeUi(this._toLabels(presents)));
        this.menu.addMenuItem(menuItem);

        this.menu.connect('open-state-changed', () => {
            if (Timer.delayMinutes == 0) {
                this._setTimeToLabel(new Date());
            }
            this.settings.set_value('message', new GLib.Variant('s', this.messageEntry.text))
        });

        Timer.callback = () => {
            this._setPanelMenuIcon(Icon.OFF);
            if (this.isPlaySound) this._playSound();
            this._showMessage();
        }

        this._onDropSecondsChangedId = this.settings.connect(
            'changed::drop-seconds',
            this._onDropSecondsChanged.bind(this)
        );

        this._onPlaySoundChangedId = this.settings.connect(
            'changed::play-sound',
            this._onPlaySoundChanged.bind(this)
        );

        Timer.isDropSeconds = this.settings.get_value('drop-seconds').deep_unpack();

        this.isPlaySound = this.settings.get_value('play-sound').deep_unpack();
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
        threeBox.add(this._makeButtonsColon(['0', labels[0], labels[1]]));

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

    _setTimeToLabel(time) {
        this.timeLabel.text = time.toLocaleString('en-us', {
            hour12: false, hour: '2-digit', minute: '2-digit'
        });
    }

    _createButton(label) {
        let button = new St.Button({ label: label, style_class: 'number-button' });
        button.connect('clicked', () => {
            // reset timeout when pressed zero button
            if (button.label == '0') {
                Timer.reset();
            } else {
                let parsed = parseInt(button.label, 10);
                if (isNaN(parsed)) parsed = 0;
                Timer.delayMinutes += parsed;
            }

            Timer.start();

            this._setTimeToLabel(Timer.countDownDate);
            this._setPanelMenuIcon(Icon.ON);
        });

        return button;
    }

    _setPanelMenuIcon(icon) {
        this.icon.gicon = new Gio.FileIcon({
            file: Gio.File.new_for_path(Me.dir.get_child(icon).get_path())
        });
    }

    _showMessage() {
        if (!notificationTextLabel) {
            notificationTextLabel = new St.Label({ style_class: 'message-label' });
            Main.uiGroup.add_actor(notificationTextLabel);
        }

        notificationTextLabel.text = this.messageEntry.text;

        notificationTextLabel.opacity = 255;

        let monitor = Main.layoutManager.primaryMonitor;

        notificationTextLabel.set_position(monitor.x + Math.floor(monitor.width / 2 - notificationTextLabel.width / 2),
            monitor.y + Math.floor(monitor.height / 2 - notificationTextLabel.height / 2));

        Tweener.addTween(notificationTextLabel,
            {
                opacity: 0,
                time: 5,
                transition: 'easeInQuint',
                onComplete: hideMessage
            }
        );

        function hideMessage() {
            Main.uiGroup.remove_actor(notificationTextLabel);
            notificationTextLabel = null;
        }
    }

    _playSound() {
        new SOUND_PLAYER.SoundPlayer().play(this.settings.get_string('sound-file-path'));
    }

    _onDropSecondsChanged() {
        Timer.isDropSeconds = this.settings.get_value('drop-seconds').deep_unpack();
    }

    _onPlaySoundChanged() {
        this.isPlaySound = this.settings.get_value('play-sound').deep_unpack();
    }

    _toLabels(presents) {
        var r = new Array();
        presents = presents.replace(/\s\s+/g, ' ').trim();
        presents.split(' ').forEach((item) => {
            r.push('+' + item)
        });
        return r;
    }
}

// Compatibility with gnome-shell >= 3.32
if (SHELL_MINOR > 30) {
    ReminderAlarmClock = GObject.registerClass(
        { GTypeName: 'ReminderAlarmClock' },
        ReminderAlarmClock
    );
}

// We're going to declare `reminderAlarmClock` in the scope of the whole script so it can
// be accessed in both `enable()` and `disable()`
var reminderAlarmClock = null;


function init() {
    log(`initializing ${Me.metadata.name} version ${Me.metadata.version}`);
}


function enable() {
    log(`enabling ${Me.metadata.name} version ${Me.metadata.version}`);

    reminderAlarmClock = new ReminderAlarmClock();

    // The `main` import is an example of file that is mostly live instances of
    // objects, rather than reusable code. `Main.panel` is the actual panel you
    // see at the top of the screen.
    Main.panel.addToStatusArea(`${Me.metadata.name} ReminderAlarmClock`, reminderAlarmClock);
}


function disable() {
    log(`disabling ${Me.metadata.name} version ${Me.metadata.version}`);

    // REMINDER: It's required for extensions to clean up after themselves when
    // they are disabled. This is required for approval during review!
    if (reminderAlarmClock !== null) {
        reminderAlarmClock.destroy();
        reminderAlarmClock = null;
    }
    Timer.reset();
}