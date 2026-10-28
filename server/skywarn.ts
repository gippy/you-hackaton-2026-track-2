// Warnings ahead of the sky, posted to #loft-incident with One's Discord action and kept current:
// an event's first warning creates a message, and every later one edits that same message, so the
// channel shows one countdown per event rather than a stream of posts.
//
// The countdown follows the scenario clock (each step moves it) or real time (--sky-warnings live).
// Dry run by default. Live posts need --live-sky-warnings, because they post without a click.
import library from '../shared/library.json' with { type: 'json' };
import type { DispatchMode, Manifest, Sky, SkyEvent, SkyWarning } from '../shared/protocol.ts';
import { edit, send } from './dispatch.ts';

const LEAD_MINUTES = 30; // the first warning goes out this long before an event
const AFTER_MINUTES = 10; // and the message keeps saying "now" for this long after it
const advice = library.sky_advice as Record<SkyEvent['id'], string>;

export class SkyWarnings {
    private warnings = new Map<SkyEvent['id'], SkyWarning>();
    private readonly mode: DispatchMode;
    private readonly onChange: (warnings: SkyWarning[]) => void;
    private queue: Promise<void> = Promise.resolve();

    constructor(mode: DispatchMode, onChange: (warnings: SkyWarning[]) => void) {
        this.mode = mode;
        this.onChange = onChange;
    }

    list(): SkyWarning[] {
        return [...this.warnings.values()];
    }

    /** Bring every warning up to date for `now`. Runs one at a time, so a slow post never overlaps the next tick. */
    tick(sky: Sky, now: Date, manifest?: Manifest): Promise<void> {
        this.queue = this.queue.then(() => this.update(sky, now, manifest)).catch((err) => console.warn(`Sky warning failed: ${err.message}`));
        return this.queue;
    }

    private async update(sky: Sky, now: Date, manifest?: Manifest): Promise<void> {
        const clock = manifest?.components.find((c) => c.type === 'SkyClock');
        for (const event of sky.events) {
            if (!event.at) continue;
            const minutes = Math.round((Date.parse(event.at) - now.getTime()) / 60000);
            if (minutes > LEAD_MINUTES || minutes < -AFTER_MINUTES) continue;
            // The model's own warning, when its SkyClock focuses on this event, else the library's.
            const todo = clock?.type === 'SkyClock' && clock.props.focus === event.id && clock.props.warning ? clock.props.warning : advice[event.id];
            const when = minutes > 0 ? `in ${minutes} min` : minutes === 0 ? 'now' : `${-minutes} min ago`;
            const text = `[Haunted Command Station] SIMULATED sky warning · ${event.label} at ${event.local} (${event.source}), ${when} · ${todo}`;
            const previous = this.warnings.get(event.id);
            if (previous?.text === text) continue;
            const base: SkyWarning = { event: event.id, text, minutes, mode: this.mode, edits: previous ? previous.edits + 1 : 0, message_id: previous?.message_id, updated_at: new Date().toISOString() };
            try {
                const result = previous ? await edit(previous.message_id ?? '<id of the first post>', text, this.mode) : await send(text, this.mode);
                const id = (result.response as { id?: string } | undefined)?.id;
                this.warnings.set(event.id, { ...base, message_id: id ?? base.message_id, request: result.request });
            } catch (err) {
                this.warnings.set(event.id, { ...base, error: String((err as Error).message).slice(0, 300) });
            }
            console.log(`Sky warning (${this.mode}, ${previous ? 'edit' : 'post'}): ${text}`);
            this.onChange(this.list());
        }
    }
}
