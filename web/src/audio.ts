// The station's sound: committed effects from web/public/sfx and the spoken dispatch from the server.
//
// Browsers block audio until the user interacts with the page, so sound starts off. The "Enable
// sound" button, or a dispatch click, turns it on. Nothing plays while it is off.
import type { ServerMessage } from '../../shared/protocol.ts';

const AMBIENT_SHARE = 0.25; // the drone sits under everything else

export class SoundBoard {
    enabled = false;
    volume = 0.7;
    private ambient: HTMLAudioElement | null = null;
    private voice: HTMLAudioElement | null = null;
    private cue: string | undefined; // the model's opening sound for the current run

    setEnabled(on: boolean): void {
        this.enabled = on;
        if (on) {
            this.ambient ??= Object.assign(new Audio('./sfx/ambient_drone.mp3'), { loop: true });
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
    effect(id: string): Promise<void> {
        return this.play(`./sfx/${id}.mp3`);
    }

    private play(url: string, keep?: (a: HTMLAudioElement) => void): Promise<void> {
        if (!this.enabled) return Promise.resolve();
        const audio = new Audio(url);
        audio.volume = this.volume;
        keep?.(audio);
        return new Promise((resolve) => {
            audio.onended = () => resolve();
            audio.onerror = () => resolve();
            audio.play().catch(() => resolve());
        });
    }

    /** React to what the server streams: the model's cue, a ready station, a dispatch and its voice. */
    onMessage(msg: ServerMessage): void {
        if (msg.type === 'run_begin') this.cue = undefined;
        if (msg.type === 'frame' && msg.sound_cue) this.cue = msg.sound_cue;
        if (!this.enabled) return;
        if (msg.type === 'frame' && msg.sound_cue) void this.effect(msg.sound_cue);
        else if (msg.type === 'run_end' && msg.manifest.recommended_action !== 'observe' && this.cue !== 'alert_chime') void this.effect('alert_chime');
        else if (msg.type === 'dispatch' && msg.mode === 'offline') void this.effect('squelch');
        else if (msg.type === 'speech') {
            this.voice?.pause();
            void this.effect('squelch').then(() => this.play(msg.url, (a) => (this.voice = a)));
        }
    }
}
