const Gst = imports.gi.Gst; Gst.init(null);

var SoundPlayer = class SoundPlayer {

    constructor() {
        this.playbin = Gst.ElementFactory.make("playbin", "player");
        let bus = this.playbin.get_bus();
        bus.add_signal_watch();
        bus.connect('message', (_, msg) => this._on_message_received(msg));
    }

    play(uri) {
        this.playbin.set_property("uri", uri);
        this.playbin.set_state(Gst.State.PLAYING);
    }

    stop() {
        this.playbin.set_state(Gst.State.NULL);
    }

    _on_message_received(msg) {
        if (msg.type == Gst.MessageType.EOS || msg.type == Gst.MessageType.ERROR) {
            this.stop();
        }
    }
}