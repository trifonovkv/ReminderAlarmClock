'use strict';

import Adw from 'gi://Adw';

import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';


import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';


export default class ReminderAlarmClockPreferences extends ExtensionPreferences {
    getPreferencesWidget() {
        const settings = this.getSettings();

        // Create a parent widget that we'll return from this function
        let prefsWidget = new Gtk.Grid({
            margin_start: 36,
            margin_end: 36,
            margin_top: 36,
            margin_bottom: 36,
            column_spacing: 12,
            row_spacing: 12,
            visible: true,
            hexpand: true
        });

        let title = new Gtk.Label({
            label: '<b>' + this.metadata.name + ' ' + _('Extension Preferences') + '</b>',
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
            active: settings.get_boolean('drop-seconds'),
            halign: Gtk.Align.END,
            visible: true
        });
        prefsWidget.attach(dropSecondsSwitch, 1, 1, 1, 1);

        settings.bind(
            'drop-seconds',
            dropSecondsSwitch,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );


        let autoCloseReminderWindowLabel = new Gtk.Label({
            label: _('Auto hide reminder window:'),
            halign: Gtk.Align.START,
            visible: true
        });
        prefsWidget.attach(autoCloseReminderWindowLabel, 0, 2, 1, 1);

        let autoCloseReminderWindowSwitch = new Gtk.Switch({
            active: settings.get_boolean('auto-close-reminder-window'),
            halign: Gtk.Align.END,
            visible: true
        });
        prefsWidget.attach(autoCloseReminderWindowSwitch, 1, 2, 1, 1);

        settings.bind(
            'auto-close-reminder-window',
            autoCloseReminderWindowSwitch,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );


        let showRemainingTimeInTaskbarLabel = new Gtk.Label({
            label: _('Show remaining time in taskbar:'),
            halign: Gtk.Align.START,
            visible: true
        });
        prefsWidget.attach(showRemainingTimeInTaskbarLabel, 0, 3, 1, 1);

        let showRemainingTimeInTaskbarSwitch = new Gtk.Switch({
            active: settings.get_boolean('show-remaining-time-in-taskbar'),
            halign: Gtk.Align.END,
            visible: true
        });
        prefsWidget.attach(showRemainingTimeInTaskbarSwitch, 1, 3, 1, 1);

        settings.bind(
            'show-remaining-time-in-taskbar',
            showRemainingTimeInTaskbarSwitch,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );


        let playSoundLabel = new Gtk.Label({
            label: _('Play sound:'),
            halign: Gtk.Align.START,
            visible: true
        });
        prefsWidget.attach(playSoundLabel, 0, 4, 1, 1);

        let playSoundSwitch = new Gtk.Switch({
            active: settings.get_boolean('play-sound'),
            halign: Gtk.Align.END,
            visible: true
        });
        prefsWidget.attach(playSoundSwitch, 1, 4, 1, 1);

        settings.bind(
            'play-sound',
            playSoundSwitch,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );

        let soundChooser = new Gtk.Button({
            visible: true,
            label: this.soundChooserLabel(),
        });

        soundChooser.connect('clicked', (widget) => {
            let dialog = new Gtk.FileChooserNative({
                action: Gtk.FileChooserAction.OPEN,
                modal: true,
                title: _("Please choose sound file"),
            });
            dialog.set_file(Gio.File.new_for_uri(settings.get_string('sound-file-path')));
            dialog.connect('response', (dialog, response_id) => {
                if(response_id == Gtk.ResponseType.ACCEPT)
                {
                    settings.set_string('sound-file-path', dialog.get_file().get_uri());
                    soundChooser.set_label(this.soundChooserLabel());
                }
            });

            dialog.show();
        });

        prefsWidget.attach(soundChooser, 1, 5, 1, 1);

        playSoundSwitch.connect('state-set', (self) => {
            soundChooser.set_sensitive(self.active);
        });


        let timeRepeatEntry = new Gtk.Entry({
            text: settings.get_string('time-repeat'),
            halign: Gtk.Align.END,
            visible: true,        
            name: 'time-repeat-entry'
        });

        timeRepeatEntry.connect('changed', (self) => {
            if (/^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/.test(self.text)) {
                settings.set_string('time-repeat', self.text);
                self.secondary_icon_name = '';
            } else {
                self.secondary_icon_name = 'dialog-error-symbolic';
            }
        });

        settings.bind(
            'time-repeat',
            timeRepeatEntry,
            'icon-press',
            Gio.SettingsBindFlags.DEFAULT
        );

        let repeatLabel = new Gtk.Label({
            label: _('Repeat every day:'),
            halign: Gtk.Align.START,
            visible: true
        });
        prefsWidget.attach(repeatLabel, 0, 6, 1, 1);

        let repeatSwitch = new Gtk.Switch({
            active: settings.get_boolean('repeat'),
            halign: Gtk.Align.END,
            visible: true
        });
        
        repeatSwitch.connect('state-set', (self) => {
            timeRepeatEntry.set_sensitive(self.active);
        });

        settings.bind(
            'repeat',
            repeatSwitch,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );

        prefsWidget.attach(repeatSwitch, 1, 6, 1, 1);
        prefsWidget.attach(timeRepeatEntry, 1, 7, 1, 1);


        let presentsLabel = new Gtk.Label({
            label: _('Presents <small>(extension restart needed)</small>:'),
            halign: Gtk.Align.START,
            use_markup: true,
            visible: true
        });
        prefsWidget.attach(presentsLabel, 0, 8, 1, 1);

        let presentsEntry = new Gtk.Entry({
            text: settings.get_string('presents'),
            halign: Gtk.Align.END,
            visible: true
        });
        prefsWidget.attach(presentsEntry, 1, 8, 1, 1);

        settings.bind(
            'presents',
            presentsEntry,
            'text',
            Gio.SettingsBindFlags.DEFAULT
        );


        let showTestNotificationButton = new Gtk.Button({
            label: _('Show test notification'),
            halign: Gtk.Align.CENTER,
            visible: true
        });

        showTestNotificationButton.connect('clicked', () => {
            settings.set_boolean(
                'show-test-notification', !settings.get_boolean(
                    'show-test-notification'));
        });

        prefsWidget.attach(showTestNotificationButton, 0, 9, 2, 1);

        return prefsWidget;
    }

    soundChooserLabel() {
        let file = Gio.File.new_for_uri(this.getSettings().get_string('sound-file-path'))
        let filename = file.get_basename() || "None"
        return `${_('Selected')} "${filename}". ${_('Choose new…')}`;
    }
}
