// Calling an expert: a "Call expert" click opens a real PagerDuty incident with One, the station follows
// it until someone acknowledges it, and resolves it when the station stands down.
//
// - Every title starts with [SIMULATED].
// - The incident_key is `<incident_id>:<expert>`, so PagerDuty keeps one open incident per expert and step.
//   The station adds a cooldown per expert on top.
// - The service defaults to the station's own (PAGERDUTY_SERVICE_ID overrides it).
// - The From email PagerDuty requires is the account owner's, found at run time (PAGERDUTY_FROM overrides
//   it), so no email lives in the repo.
// - PAGING=off switches paging off for tests and the eval: a click then records an "off" page and calls nothing.
import { createHash } from 'node:crypto';

import library from '../shared/library.json' with { type: 'json' };
import type { Expert, PageInfo, RunState } from '../shared/protocol.ts';
import { connection, findAction, one, OneError } from './one.ts';

const POLL_MS = 15_000;
const COOLDOWN_MS = 60_000; // one page per expert per minute, whatever the clicks
const SERVICE = 'P1KQZ39'; // the PagerDuty account's one service
const TASK = 'page an expert for a simulated incident and follow it';

/** The PagerDuty actions the pager uses, as One's search query, method and path. */
const ACTIONS = {
    listUsers: ['list users', 'GET', '/users'],
    create: ['create an incident', 'POST', '/incidents'],
    list: ['list incidents', 'GET', '/incidents'],
    get: ['get an incident by id', 'GET', '/incidents/{{id}}'],
    update: ['update an incident by id', 'PUT', '/incidents/{{id}}'],
} as const;
type Action = keyof typeof ACTIONS;

interface PageRequest {
    expert: Expert;
    incident_id: string;
    title: string;
    details: string;
    urgency: 'high' | 'low';
}

function actionId(action: Action): Promise<string> {
    const [query, method, path] = ACTIONS[action];
    return findAction('pager-duty', query, method, path, TASK);
}

/** Run a PagerDuty action through One with extra CLI flags, and return PagerDuty's response. */
async function execute(action: Action, flags: string[], timeout: number, purpose: string): Promise<any> {
    const [conn, id] = await Promise.all([connection('pager-duty'), actionId(action)]);
    return (await one(['actions', 'execute', 'pager-duty', id, conn, ...flags], timeout, purpose)).response;
}

let from: Promise<string> | null = null;

/** The email PagerDuty requires in the From header: the account owner's. */
function fromEmail(): Promise<string> {
    from ??= (async () => {
        if (process.env.PAGERDUTY_FROM) return process.env.PAGERDUTY_FROM;
        const owners = (await execute('listUsers', [], 120_000, 'find the From email'))?.users?.filter((u: any) => u.role === 'owner');
        if (owners?.length !== 1) throw new OneError(`PagerDuty has ${owners?.length ?? 0} owners; set PAGERDUTY_FROM in .env`);
        return owners[0].email as string;
    })();
    from.catch(() => (from = null));
    return from;
}

export class Pager {
    private pages = new Map<string, PageInfo>();
    private timers = new Map<string, NodeJS.Timeout>();
    private lastCall = new Map<Expert, number>();
    private readonly onChange: (pages: PageInfo[]) => void;
    readonly enabled = process.env.PAGING?.trim().toLowerCase() !== 'off';

    constructor(onChange: (pages: PageInfo[]) => void) {
        this.onChange = onChange;
    }

    /** Every page, newest first. */
    list(): PageInfo[] {
        return [...this.pages.values()].sort((a, b) => b.opened_at.localeCompare(a.opened_at));
    }

    private set(page: PageInfo): void {
        this.pages.set(page.key, page);
        this.onChange(this.list());
    }

    /** Seconds until this expert can be paged again, or 0. */
    cooldown(expert: Expert): number {
        return Math.max(0, Math.ceil(((this.lastCall.get(expert) ?? 0) + COOLDOWN_MS - Date.now()) / 1000));
    }

    /** Page an expert. A page still open for the same step and expert is kept, not sent again. */
    async open(req: PageRequest): Promise<void> {
        const key = `${req.incident_id}:${req.expert}`;
        const existing = this.pages.get(key);
        if (existing && ['sending', 'triggered', 'acknowledged'].includes(existing.status)) return;
        this.lastCall.set(req.expert, Date.now());
        const base: PageInfo = { key, expert: req.expert, incident_id: req.incident_id, title: req.title, urgency: req.urgency, status: 'sending', opened_at: new Date().toISOString(), acknowledged_by: [] };
        if (!this.enabled) {
            this.set({ ...base, status: 'off' });
            return;
        }
        this.set(base);
        try {
            const [email, createId] = await Promise.all([fromEmail(), actionId('create')]);
            const body = {
                incident: {
                    type: 'incident',
                    title: req.title,
                    service: { id: process.env.PAGERDUTY_SERVICE_ID || SERVICE, type: 'service_reference' },
                    urgency: req.urgency,
                    incident_key: key,
                    body: { type: 'incident_body', details: req.details },
                },
            };
            await one(['actions', 'load', createId]); // read the action's docs before its first execute
            let incident: any;
            try {
                incident = (await execute('create', ['-d', JSON.stringify(body), '--headers', JSON.stringify({ From: email })], 60_000, `call the ${req.expert}`))?.incident;
            } catch (err) {
                // A second open incident with the same key is refused: follow the one that is open.
                if (!/key|dedup|already/i.test(String((err as Error).message))) throw err;
                const open = await execute('list', ['--query-params', JSON.stringify({ incident_key: key })], 120_000, 'find the open page');
                incident = (open?.incidents ?? []).find((i: any) => i.status !== 'resolved');
            }
            if (!incident?.id) throw new OneError('PagerDuty did not return an incident');
            this.set({ ...base, ...fromIncident(incident) });
            this.follow(key);
        } catch (err) {
            this.set({ ...base, status: 'failed', error: String((err as Error).message).slice(0, 400) });
        }
    }

    /** Poll an incident until it is resolved, so the station shows who acknowledged it. */
    private follow(pageKey: string): void {
        clearInterval(this.timers.get(pageKey));
        const timer = setInterval(async () => {
            const page = this.pages.get(pageKey);
            if (!page?.id || page.status === 'resolved') {
                clearInterval(timer);
                return;
            }
            try {
                const incident = (await execute('get', ['--path-vars', JSON.stringify({ id: page.id })], 120_000, 'follow the page'))?.incident;
                const next = { ...page, ...fromIncident(incident) };
                if (next.status !== page.status || next.acknowledged_by.join() !== page.acknowledged_by.join()) this.set(next);
            } catch (err) {
                console.warn(`PagerDuty follow-up failed: ${(err as Error).message}`);
            }
        }, POLL_MS);
        this.timers.set(pageKey, timer);
    }

    /** Resolve every open page: the station stood down. */
    async resolveAll(): Promise<void> {
        for (const page of this.list()) {
            if (page.status === 'triggered' || page.status === 'acknowledged') await this.resolve(page);
        }
    }

    /** Resolve one page in PagerDuty. A failure is shown on the page. */
    async resolve(page: PageInfo): Promise<void> {
        if (!page.id) return;
        try {
            const email = await fromEmail();
            const flags = [
                '-d', JSON.stringify({ incident: { type: 'incident_reference', status: 'resolved' } }),
                '--path-vars', JSON.stringify({ id: page.id }),
                '--headers', JSON.stringify({ From: email }),
            ];
            const incident = (await execute('update', flags, 60_000, 'resolve the page'))?.incident;
            this.set({ ...page, ...fromIncident(incident), error: undefined });
        } catch (err) {
            this.set({ ...page, error: `Resolve failed: ${String((err as Error).message).slice(0, 300)}` });
        }
    }
}

/** The page fields a PagerDuty incident fills in. */
function fromIncident(incident: any): Pick<PageInfo, 'id' | 'number' | 'url' | 'status' | 'acknowledged_by'> {
    return {
        id: incident?.id,
        number: incident?.incident_number,
        url: incident?.html_url,
        status: incident?.status ?? 'triggered',
        acknowledged_by: (incident?.acknowledgements ?? []).map((a: any) => a.acknowledger?.summary).filter(Boolean),
    };
}

/** Flatten whitespace and cut to `limit` characters, with an ellipsis when cut. */
const short = (text: string, limit: number) => {
    const flat = (text || '').split(/\s+/).join(' ').trim();
    return flat.length <= limit ? flat : `${flat.slice(0, limit - 1).trimEnd()}…`;
};

/** The PagerDuty incident for a call: the station's headline as the title, and what the expert needs to know. */
export function pageRequest(state: RunState, expert: Expert, countermeasure: string | null): PageRequest {
    const { incident: inc, manifest } = state;
    const sectors = library.sectors as Record<string, string>;
    const arsenal = library.arsenal as Record<string, string>;
    const sector = sectors[inc.sector] ?? inc.sector;
    const people = inc.people_in_reach ?? inc.civilians?.count ?? 0;
    // The same headline as the page's: what, where, when and who.
    const headline = [inc.entity.replace(/\s*\([^)]*\)/g, ''), sector, state.sky?.clock, `${people} people`].filter(Boolean).join(' · ');
    const banner = manifest.components.find((c) => c.type === 'ThreatBanner');
    const severity = banner?.type === 'ThreatBanner' ? banner.props.severity : inc.severity;
    const critical = ['critical', 'catastrophic'].includes(severity) || manifest.recommended_action === 'evacuate';
    const option = manifest.components.flatMap((c) => (c.type === 'CountermeasurePicker' ? c.props.options : [])).find((o) => o.id === countermeasure);
    const optionSource = option && state.sources.find((s) => s.n === option.source);
    const directive = banner?.type === 'ThreatBanner' ? banner.props.directive : '';
    const details = [
        'Simulated incident from the Haunted Command Station, a hackathon demo. Nothing here is real.',
        `Incident: ${state.incident_id || 'pasted report'}, ${inc.entity} (threat ${inc.threat_level}/5, ${severity}).`,
        `Sector: ${sector}.`,
        `People at risk: ${people}${inc.people_hurt ? `, ${inc.people_hurt} hurt` : ''}.`,
        `Recommended: ${manifest.recommended_action}.${directive ? ` ${short(directive, 300)}` : ''}`,
        countermeasure ? `Countermeasure: ${arsenal[countermeasure]}${optionSource ? ` (${optionSource.url})` : ''}.` : 'Countermeasure: none picked.',
        'Sources:',
        ...state.sources.slice(0, 3).map((s) => `- ${short(s.title, 90)}: ${s.url}`),
    ].join('\n');
    const id = state.incident_id || `pasted-${createHash('sha256').update(state.raw).digest('hex').slice(0, 8)}`;
    return {
        expert,
        incident_id: id,
        title: `[SIMULATED] ${library.experts[expert].label} needed: ${headline}`.slice(0, 250),
        details: details.slice(0, 4000),
        urgency: critical ? 'high' : 'low',
    };
}
