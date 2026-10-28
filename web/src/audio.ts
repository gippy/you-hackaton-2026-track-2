// The station's sound: committed effects from web/public/sfx and the spoken "Calling the vampire hunter"
// from the server.
//
// Browsers block audio until the user interacts with the page, so sound starts off, and the Sound
// button turns it on. A "Call expert" click with sound off allows only that call's sting and spoken line,
// never the drone or the station's own cues.
import type { ServerMessage } from '../../shared/protocol.ts';
import { withToken } from './url.ts';

const AMBIENT_SHARE = 0.25; // the drone sits under everything else

export class SoundBoard {
    enabled = false;
    volume = 0.7;
    private ambient: HTMLAudioElement | null = null;
    private voice: HTMLAudioElement | null = null;
    private cue: string | undefined; // the model's opening sound for the current run
    voiceOnce = false; // set by a "Call expert" click: play the next spoken call even with sound off

    setEnabled(on: boolean): void {
        this.enabled = on;
        if (on) {
            this.ambient ??= Object.assign(new Audio(withToken('./sfx/ambient_drone.mp3')), { loop: true });
            this.ambient.volume = this.volume * AMBIENT_SHARE;
            void this.ambient.play().catch(() => {});
            // The station on screen was usually built before sound was on: open with its cue now.
            if (this.cue) void this.effect(this.cue);
        } else {
            this.ambient?.pause();
            this.voice?.pause();
        }
    }

    setVolume(volume: number): void {
        this.volume = volume;
        if (this.ambient) this.ambient.volume = volume * AMBIENT_SHARE;
        if (this.voice) this.voice.volume = volume;
    }

    /** Play a sound from the library by id. Resolves when it ends, or at once when sound is off or it fails. */
    private effect(id: string): Promise<void> {
        return this.play(withToken(`./sfx/${id}.mp3`));
    }

    private play(url: string, keep?: (a: HTMLAudioElement) => void, force = false): Promise<void> {
        if (!this.enabled && !force) return Promise.resolve();
        const audio = new Audio(url);
        audio.volume = this.volume;
        keep?.(audio);
        return new Promise((resolve) => {
            audio.onended = () => resolve();
            audio.onerror = () => resolve();
            audio.play().catch(() => resolve());
        });
    }

    /** React to what the server streams: the model's cue, a ready station, and a call's sting and voice. */
    onMessage(msg: ServerMessage): void {
        if (msg.type === 'run_begin') this.cue = undefined;
        if (msg.type === 'frame' && msg.sound_cue) this.cue = msg.sound_cue;
        if (msg.type === 'speech' && (this.enabled || this.voiceOnce)) {
            const force = !this.enabled; // this tab clicked "Call expert" with sound off
            this.voiceOnce = false;
            this.voice?.pause();
            const sting = withToken(`./sfx/${msg.cue ?? 'squelch'}.mp3`);
            void this.play(sting, undefined, force).then(() => this.play(withToken(`./${msg.url}`), (a) => (this.voice = a), force));
            return;
        }
        if (!this.enabled) return;
        if (msg.type === 'frame' && msg.sound_cue) void this.effect(msg.sound_cue);
        else if (msg.type === 'run_end' && msg.manifest.recommended_action !== 'observe' && this.cue !== 'alert_chime') void this.effect('alert_chime');
    }
}
