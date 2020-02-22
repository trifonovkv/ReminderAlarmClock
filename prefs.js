'use strict';

const { Gio, GLib, Gtk } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Gettext = imports.gettext;
Gettext.textdomain('reminderAlarmClock');
Gettext.bindtextdomain('reminderAlarmClock', Me.dir.get_child('locale').get_path());
const _ = Gettext.gettext;


function init() {
}

// TODO group all switches

function buildPrefsWidget() {

    // Copy the same GSettings code from `extension.js`
    let gschema = Gio.SettingsSchemaSource.new_from_directory(
        Me.dir.get_child('schemas').get_path(),
        Gio.SettingsSchemaSource.get_default(),
        false
    );

    this.settings = new Gio.Settings({
        settings_schema: gschema.lookup('org.gnome.shell.extensions.reminderalarmclock', true)
    });

    // Create a parent widget that we'll return from this function
    let prefsWidget = new Gtk.Grid({
        margin: 36,
        column_spacing: 12,
        row_spacing: 12,
        visible: true,
        hexpand: true
    });

    let title = new Gtk.Label({
        label: '<b>' + Me.metadata.name + ' ' + _('Extension Preferences') + '</b>',
        halign: Gtk.Align.CENTER,
        hexpand: true,
        use_markup: true,
        visible: true
    });
    prefsWidget.attach(title, 0, 0, 2, 1);


    let dropSecondsLabel = new Gtk.Label({
        label: _('Round to minutes:'),
        halign: Gtk.Align.START,
        visible: true
    });
    prefsWidget.attach(dropSecondsLabel, 0, 1, 1, 1);
    
    let dropSecondsSwitch = new Gtk.Switch({
        active: this.settings.get_boolean('drop-seconds'),
        halign: Gtk.Align.END,
        visible: true
    });
    prefsWidget.attach(dropSecondsSwitch, 1, 1, 1, 1);

    this.settings.bind(
        'drop-seconds',
        dropSecondsSwitch,
        'active',
        Gio.SettingsBindFlags.DEFAULT
    );


    let playSoundLabel = new Gtk.Label({
        label: _('Play sound:'),
        halign: Gtk.Align.START,
        visible: true
    });
    prefsWidget.attach(playSoundLabel, 0, 2, 1, 1);

    let playSoundSwitch = new Gtk.Switch({
        active: this.settings.get_boolean('play-sound'),
        halign: Gtk.Align.END,
        visible: true
    });
    prefsWidget.attach(playSoundSwitch, 1, 2, 1, 1);

    this.settings.bind(
        'play-sound',
        playSoundSwitch,
        'active',
        Gio.SettingsBindFlags.DEFAULT
    );

    let soundChooser = new Gtk.FileChooserButton({
        visible: true
    });

    soundChooser.set_uri(this.settings.get_string('sound-file-path'));
    soundChooser.connect('file-set', (widget) => {
        this.settings.set_string('sound-file-path', widget.get_uri());
    });

    prefsWidget.attach(soundChooser, 1, 3, 1, 1);


    let presentsLabel = new Gtk.Label({
        label: _('Presents <small>(extension restart needed)</small>:'),
        halign: Gtk.Align.START,
        use_markup: true,
        visible: true
    });
    prefsWidget.attach(presentsLabel, 0, 4, 1, 1);
    
    let presentsEntry = new Gtk.Entry({
        text: this.settings.get_string('presents'),
        halign: Gtk.Align.END,
        visible: true
    });
    prefsWidget.attach(presentsEntry, 1, 4, 1, 1);

    this.settings.bind(
        'presents',
        presentsEntry,
        'text',
        Gio.SettingsBindFlags.DEFAULT
    );


    let autoCloseReminderWindowLabel = new Gtk.Label({
        label: _('Auto hide reminder window:'),
        halign: Gtk.Align.START,
        visible: true
    });
    prefsWidget.attach(autoCloseReminderWindowLabel, 0, 5, 1, 1);
    
    let autoCloseReminderWindowSwitch = new Gtk.Switch({
        active: this.settings.get_boolean('auto-close-reminder-window'),
        halign: Gtk.Align.END,
        visible: true
    });
    prefsWidget.attach(autoCloseReminderWindowSwitch, 1, 5, 1, 1);

    this.settings.bind(
        'auto-close-reminder-window',
        autoCloseReminderWindowSwitch,
        'active',
        Gio.SettingsBindFlags.DEFAULT
    );


    // TODO update translate
    let showRemainingTimeInTaskbarLabel = new Gtk.Label({
        label: _('Show remaining time in taskbar:'),
        halign: Gtk.Align.START,
        visible: true
    });
    prefsWidget.attach(showRemainingTimeInTaskbarLabel, 0, 6, 1, 1);
    
    let showRemainingTimeInTaskbarSwitch = new Gtk.Switch({
        active: this.settings.get_boolean('show-remaining-time-in-taskbar'),
        halign: Gtk.Align.END,
        visible: true
    });
    prefsWidget.attach(showRemainingTimeInTaskbarSwitch, 1, 6, 1, 1);

    this.settings.bind(
        'show-remaining-time-in-taskbar',
        showRemainingTimeInTaskbarSwitch,
        'active',
        Gio.SettingsBindFlags.DEFAULT
    );


    let showTestNotificationButton = new Gtk.Button({
        label: _('Show test notification'),
        halign: Gtk.Align.CENTER,
        visible: true
    });

    showTestNotificationButton.connect('clicked', () => {
        this.settings.set_boolean('show-test-notification', true);
    });

    prefsWidget.attach(showTestNotificationButton, 0, 7, 2, 1);

    // Return our widget which will be added to the window
    return prefsWidget;
}