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

const MESSAGE = "Wake up, Neo..."

const setTimeout = function (func, milliseconds /* , ... args */) {

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

let TextLabel;

// We'll extend the Button class from Panel Menu so we can do some setup in
// the init() function.
var Indicator = class Indicator extends PanelMenu.Button {

    _init() {
        super._init(0.0, `${Me.metadata.name} Indicator`, false);

        // Pick an icon
        let icon = new St.Icon({
            gicon: new Gio.ThemedIcon({ name: 'face-laugh-symbolic' }),
            style_class: 'system-status-icon'
        });

        this.actor.add_child(icon);

        this._entryItem = new PopupMenu.PopupBaseMenuItem({
            reactive: false,
            can_focus: false
        });

        function createButton(label, callback) {
            let button = new St.Button({
                label: label,
                can_focus: true,
                x_expand: true,
                style_class: 'button',
            });
            button.connect('clicked', callback);
            return button;
        }

        function createButtonsBox(labels) {
            let box = new St.BoxLayout({ x_expand: true });
            labels.forEach(label => {
                box.add_child(createButton(label, buttonCallback));
            });
            return box;

            function buttonCallback(button) {
                log(`Button ${button.label} activated`);
                let minutes = parseInt(button.label, 10);
                let milliseconds = minutes * 60 * 1000;
                log(`${milliseconds}`);
                setTimeout(showMessage, milliseconds);
            }
        }

        let buttonsBox = createButtonsBox(['+1', '+2', '+5', '+10', '+15', '+30', '+60']);
        this._entryItem.actor.add(buttonsBox, { expand: true });

        this.menu.addMenuItem(this._entryItem);
    }
}

function showMessage() {
    if (!TextLabel) {
        TextLabel = new St.Label({ style_class: 'message-label', text: MESSAGE });
        Main.uiGroup.add_actor(TextLabel);
    }

    TextLabel.opacity = 255;

    let monitor = Main.layoutManager.primaryMonitor;

    TextLabel.set_position(monitor.x + Math.floor(monitor.width / 2 - TextLabel.width / 2),
        monitor.y + Math.floor(monitor.height / 2 - TextLabel.height / 2));

    Tweener.addTween(TextLabel,
        {
            opacity: 0,
            time: 5,
            transition: 'easeInQuint',
            onComplete: hideMessage
        });
}

function hideMessage() {
    Main.uiGroup.remove_actor(TextLabel);
    TextLabel = null;
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