'use strict';

import Gio from 'gi://Gio';

export default class SoundPlayer {
    constructor() {
        this.player = global.display.get_sound_player();
    }

    play(uri) {
        let file = Gio.File.new_for_uri(uri);
        this.player.play_from_file(file, 'Alarm Clock', null);
    }
}
