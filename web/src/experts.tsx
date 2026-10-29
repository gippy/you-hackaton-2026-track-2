// The expert pages: which page belongs to the incident on screen, how its status reads, and the panel that
// lists every page sent through One to PagerDuty. The "Call expert" buttons are in topbar.tsx.
import type { ClientMessage, Expert, PageInfo } from '../../shared/protocol.ts';
import type { SoundBoard } from './audio.ts';
import { Link } from './components.tsx';
import type { State } from './station.ts';

export const EXPERTS: Expert[] = ['vampire_hunter', 'ghostbuster'];

const OPEN: PageInfo['status'][] = ['sending', 'triggered', 'acknowledged'];

/** A page that is still open: it can be resolved, and its expert cannot be paged again. */
export const isOpen = (page: PageInfo) => OPEN.includes(page.status);

/** The expert's page for the incident on screen. A pasted report's id is made on the server, so any pasted page matches. */
export function pageFor(state: State, expert: Expert): PageInfo | undefined {
    const id = state.incident?.incident_id;
    return state.pages.find((p) => p.expert === expert && (id ? p.incident_id === id : p.incident_id.startsWith('pasted-')));
}

/** Whether the expert's page for the incident on screen is still open. */
export function isPaged(state: State, expert: Expert): boolean {
    const page = pageFor(state, expert);
    return Boolean(page && isOpen(page));
}

/** Whether an expert can be paged now: the station is built, the server is live, and no page of theirs for it is open. */
export function canCall(state: State, expert: Expert): boolean {
    return Boolean(state.manifest) && state.mode !== 'offline' && !isPaged(state, expert);
}

/** Page an expert with the operator's countermeasure, when `canCall` allows it. */
export function callExpert(state: State, expert: Expert, sound: SoundBoard, post: (msg: ClientMessage) => void) {
    if (!canCall(state, expert)) return;
    // The click is the interaction browsers wait for: with sound off it allows only this call's sting and voice.
    if (!sound.enabled) sound.voiceOnce = true;
    post({ type: 'call_expert', expert, countermeasure: state.operator.countermeasure });
}

/** A page's status by its expert's button: "Paging…", "Triggered #12", "Acknowledged by Jaroslav", "Resolved". */
export function pageStatus(page: PageInfo): string {
    switch (page.status) {
        case 'sending':
            return 'Paging…';
        case 'triggered':
            return `Triggered${page.number ? ` #${page.number}` : ''}`;
        case 'acknowledged':
            return page.acknowledged_by.length ? `Acknowledged by ${page.acknowledged_by.map((name) => name.split(' ')[0]).join(', ')}` : 'Acknowledged';
        case 'resolved':
            return 'Resolved';
        case 'failed':
            return 'Paging failed';
        case 'off':
            return 'Not sent: paging is off';
    }
}

/** Every page this station has sent, each with a Resolve button while it is open. */
export function ExpertCalls({ pages, post }: { pages: PageInfo[]; post: (msg: ClientMessage) => void }) {
    return (
        <section className="panel pages">
            <h2>
                Expert calls <em className="partner">One → PagerDuty</em>
            </h2>
            <ul>
                {pages.map((page) => (
                    <li key={page.key}>
                        <div className="page-head">
                            <span className={`pill page-${page.status}`}>{pageStatus(page)}</span>
                            <b>{page.title}</b>
                            <span className="muted small">
                                {page.urgency} urgency · {page.key}
                            </span>
                            {page.url && <Link url={page.url}>#{page.number ?? 'incident'}</Link>}
                            {isOpen(page) && page.id && (
                                <button type="button" className="ghost" onClick={() => post({ type: 'resolve_page', key: page.key })}>
                                    Resolve
                                </button>
                            )}
                        </div>
                        {page.error && <p className="status-danger small">{page.error}</p>}
                    </li>
                ))}
            </ul>
        </section>
    );
}
