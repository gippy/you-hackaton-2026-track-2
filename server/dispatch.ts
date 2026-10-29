// Posts the station's escalation to the venue's #loft-incident Discord channel through the venue webhook (the
// hackathon portal, section 3.4), as "<team handle> · <sector> · <action> · <one-line rationale>", built from the
// run on screen.
// - LOFT_WEBHOOK_URL holds the webhook. It is a posting credential, so it lives in the environment, never in
//   the repo, the ledger or a log.
// - DISPATCH=off posts nothing, for tests and the eval: a click then records an "off" dispatch.
// - Each incident is posted at most once, and the channel at most once every two minutes, because the station
//   is public and the whole venue shares the channel.
import library from '../shared/library.json' with { type: 'json' };
import type { DispatchInfo, RunState } from '../shared/protocol.ts';
import { short } from './pager.ts';
import { record } from './proof.ts';

/** The team handle every post starts with; the webhook cannot tell teams apart on its own. */
const TEAM = 'jarda-haunted-station';

const GAP_MS = 120_000;
const TIMEOUT_MS = 15_000;

export class Dispatcher {
    private sent = new Map<string, DispatchInfo>();
    private last = 0;
    private readonly onChange: (dispatches: DispatchInfo[]) => void;
    private readonly off = process.env.DISPATCH?.trim().toLowerCase() === 'off';
    private readonly url = process.env.LOFT_WEBHOOK_URL?.trim() ?? '';
    readonly enabled = !this.off && this.url.startsWith('https://');

    constructor(onChange: (dispatches: DispatchInfo[]) => void) {
        this.onChange = onChange;
    }

    /** Every dispatch, newest first. */
    list(): DispatchInfo[] {
        return [...this.sent.values()].reverse();
    }

    /** Whether this incident already has a post that went out or is going out. */
    has(incidentId: string): boolean {
        const d = this.sent.get(incidentId);
        return Boolean(d && d.status !== 'failed');
    }

    /** Seconds until the channel may be posted to again, or 0. */
    wait(): number {
        return Math.max(0, Math.ceil((this.last + GAP_MS - Date.now()) / 1000));
    }

    async post(incidentId: string, text: string): Promise<void> {
        const set = (d: DispatchInfo) => {
            this.sent.delete(incidentId); // a retry moves to the end, so list() stays newest first
            this.sent.set(incidentId, d);
            this.onChange(this.list());
        };
        const base = { incident_id: incidentId, text, at: new Date().toISOString() };
        const entry = { partner: 'discord', platform: 'discord', action: 'Venue webhook post to #loft-incident', purpose: 'dispatch the station', dry_run: !this.enabled, request: { content: text } };
        if (!this.enabled) {
            set({ ...base, status: 'off' });
            record('partners', { ...entry, response: { skipped: this.off ? 'DISPATCH=off' : 'no LOFT_WEBHOOK_URL' } });
            return;
        }
        this.last = Date.now();
        set({ ...base, status: 'sending' });
        const t0 = Date.now();
        try {
            const res = await fetch(this.url, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                // No mentions: the text carries model output, which must never ping the room.
                body: JSON.stringify({ content: text, allowed_mentions: { parse: [] } }),
                signal: AbortSignal.timeout(TIMEOUT_MS),
            });
            if (!res.ok) throw new Error(`Discord answered ${res.status}`);
            set({ ...base, status: 'sent' });
            record('partners', { ...entry, response: { status: res.status }, latency_ms: Date.now() - t0 });
        } catch (err) {
            const error = (err as Error).message.slice(0, 200);
            set({ ...base, status: 'failed', error });
            record('partners', { ...entry, error, latency_ms: Date.now() - t0 });
        }
    }
}

/**
 * The #loft-incident post for a run, in the venue's format: "<team> · <sector> · <action> · <rationale>". Every part
 * comes from the run itself: the intake's sector, the model's action and its dispatch rationale.
 */
export function dispatchText(state: RunState): string {
    const sectors = library.sectors as Record<string, string>;
    const sector = sectors[state.incident.sector] ?? state.incident.sector;
    const why = short(state.manifest.dispatch_rationale || state.incident.summary || '', 220);
    const ref = state.incident_id ? ` (${state.incident_id}, simulated)` : ' (pasted report)';
    return `${TEAM} · ${sector} · ${state.manifest.recommended_action} · ${why}${ref}`;
}
