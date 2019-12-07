'use strict';

const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const St = imports.gi.St;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;

const PopupMenu = imports.ui.popupMenu;
const MainLoop = imports.mainloop;
const Tweener = imports.ui.tweener;

// For compatibility checks, as described above
const Config = imports.misc.config;
const SHELL_MINOR = parseInt(Config.PACKAGE_VERSION.split('.')[1]);


let notificationTextLabel;
let totalTimeoutMinutes = 0;
let sourceID = 0;
let sandClockOffIcon = new Gio.FileIcon({
    file: Gio.File.new_for_path(Me.dir.get_child(
        'icons/sand-clock-off.svg').get_path())
});
let sandClockOnIcon = new Gio.FileIcon({
    file: Gio.File.new_for_path(Me.dir.get_child(
        'icons/sand-clock-on.svg').get_path())
});


var Indicator = class Indicator extends PanelMenu.Button {
    _init() {
        super._init(0.0, `${Me.metadata.name} Indicator`, false);

        this.icon = new St.Icon({
            gicon: sandClockOffIcon,
            style_class: 'system-status-icon'
        });
        this.actor.add_child(this.icon);

        this.timeLabel = new St.Label({ style_class: 'time-label' });
        this.messageEntry = new St.Entry({
            track_hover: false,
            can_focus: true,
            style_class: 'message-entry',
            text: "Wake up, Neo..."
        });

        let menuItem = new PopupMenu.PopupBaseMenuItem({ can_focus: false, reactive: false });
        menuItem.actor.add(this._makeUi());
        this.menu.addMenuItem(menuItem);

        this.menu.connect('open-state-changed', () => {
            if (totalTimeoutMinutes === 0) {
                this._setTimeToLabel(new Date());
            }
        });
    }

    _makeUi() {
        let oneBox = new St.BoxLayout({ vertical: false });
        oneBox.add(this._makeButtonsColon(['+10', '+15']));
        oneBox.add(this._makeButtonsColon(['+30', '+60']));

        let twoBox = new St.BoxLayout({ vertical: true });
        twoBox.add(this.timeLabel);
        twoBox.add(oneBox);

        let threeBox = new St.BoxLayout({ vertical: false });
        threeBox.add(twoBox);
        threeBox.add(this._makeButtonsColon(['0', '+1', '+5']));

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
            let minutes = parseInt(button.label, 10);

            // handle press a zero button
            if (minutes === 0) {
                totalTimeoutMinutes = 0;
                this._showMessage();
                this._setTimeToLabel(new Date());
                return;
            }

            this._setPanelMenuIcon(sandClockOnIcon);

            totalTimeoutMinutes += minutes;
            let milliseconds = totalTimeoutMinutes * 60 * 1000;
            // round down to minutes
            milliseconds -= new Date().getSeconds() * 1000;
            
            if (totalTimeoutMinutes !== 0) {
                removeTimeout(sourceID);
            }

            sourceID = setTimeout(() => {
                this._showMessage();
                totalTimeoutMinutes = 0;
                this._setPanelMenuIcon(sandClockOffIcon);
            }, milliseconds);

            // set time to alarm label 
            let time = new Date();
            time.setMinutes(time.getMinutes() + totalTimeoutMinutes);
            this._setTimeToLabel(time);
        });

        return button;
    }

    _setPanelMenuIcon(icon) {
        this.icon.gicon = icon;
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
}

// Compatibility with gnome-shell >= 3.32
if (SHELL_MINOR > 30) {
    Indicator = GObject.registerClass(
        { GTypeName: 'Indicator' },
        Indicator
    );
}

// We're going to declare `indicator` in the scope of the whole script so it can
// be accessed in both `enable()` and `disable()`
var indicator = null;


function init() {
    log(`initializing ${Me.metadata.name} version ${Me.metadata.version}`);
}


function enable() {
    log(`enabling ${Me.metadata.name} version ${Me.metadata.version}`);

    indicator = new Indicator();

    // The `main` import is an example of file that is mostly live instances of
    // objects, rather than reusable code. `Main.panel` is the actual panel you
    // see at the top of the screen.
    Main.panel.addToStatusArea(`${Me.metadata.name} Indicator`, indicator);
}


function disable() {
    log(`disabling ${Me.metadata.name} version ${Me.metadata.version}`);

    // REMINDER: It's required for extensions to clean up after themselves when
    // they are disabled. This is required for approval during review!
    if (indicator !== null) {
        indicator.destroy();
        indicator = null;
    }
}


function setTimeout(func, milliseconds /* , ... args */) {
    let args = [];
    if (arguments.length > 2) {
        args = args.slice.call(arguments, 2);
    }

    let id = MainLoop.timeout_add(milliseconds, () => {
        func.apply(null, args);
        return false; // Stop repeating
    }, null);

    return id;
};


function removeTimeout(timeoutID) {
    if (timeoutID == 0) return
    MainLoop.source_remove(timeoutID);
}