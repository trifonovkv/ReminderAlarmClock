'use strict';

const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const GLib = imports.gi.GLib;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();


function init() {
}

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

    // Add a simple title and add it to the prefsWidget
    let title = new Gtk.Label({
        label: '<b>' + Me.metadata.name + ' Extension Preferences</b>',
        halign: Gtk.Align.CENTER,
        hexpand: true,
        use_markup: true,
        visible: true
    });
    prefsWidget.attach(title, 0, 0, 2, 1);


    let dropSecondsLabel = new Gtk.Label({
        label: 'Drop seconds:',
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
        label: 'Play sound:',
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
        label: 'Presents <small>(extension restart needed)</small>:',
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

    // Return our widget which will be added to the window
    return prefsWidget;
}