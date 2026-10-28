// Calling an expert: a "Call expert" click opens a real PagerDuty incident with One, the station follows
// it until someone acknowledges it, and resolves it when the station stands down.
//
// Every title starts with [SIMULATED]. The incident_key is `<incident_id>:<expert>`, so PagerDuty keeps
// one open incident per expert and step, and the station adds a cooldown per expert on top. The service
// defaults to the station's own (PAGERDUTY_SERVICE_ID overrides it); the From email PagerDuty requires is
// the account owner's, found at run time (PAGERDUTY_FROM overrides it), so no email lives in the repo.
// PAGING=off switches paging off for tests and the eval: a click then records an "off" page and calls nothing.
import type { Expert, PageInfo } from '../shared/protocol.ts';
import { connection, findAction, one, OneError } from './one.ts';

const POLL_MS = 15_000;
const COOLDOWN_MS = 60_000; // one page per expert per minute, whatever the clicks
const SERVICE = 'P1KQZ39'; // the PagerDuty account's one service
const TASK = 'page an expert for a simulated incident and follow it';

export interface PageRequest {
    expert: Expert;
    incident_id: string;
    title: string;
    details: string;
    urgency: 'high' | 'low';
}

let from: Promise<string> | null = null;

/** The email PagerDuty requires in the From header: the account owner's. */
function fromEmail(): Promise<string> {
    from ??= (async () => {
        if (process.env.PAGERDUTY_FROM) return process.env.PAGERDUTY_FROM;
        const [key, usersId] = await Promise.all([connection('pager-duty'), findAction('pager-duty', 'list users', 'GET', '/users', TASK)]);
        const owners = (await one(['actions', 'execute', 'pager-duty', usersId, key], 120_000, 'find the From email')).response?.users?.filter((u: any) => u.role === 'owner');
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
            const [email, conn, createId] = await Promise.all([fromEmail(), connection('pager-duty'), findAction('pager-duty', 'create an incident', 'POST', '/incidents', TASK)]);
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
                incident = (await one(['actions', 'execute', 'pager-duty', createId, conn, '-d', JSON.stringify(body), '--headers', JSON.stringify({ From: email })], 60_000, `call the ${req.expert}`)).response?.incident;
            } catch (err) {
                // A second open incident with the same key is refused: follow the one that is open.
                if (!/key|dedup|already/i.test(String((err as Error).message))) throw err;
                incident = await this.findOpen(key, conn);
            }
            if (!incident?.id) throw new OneError('PagerDuty did not return an incident');
            this.set({ ...base, ...fromIncident(incident) });
            this.follow(key);
        } catch (err) {
            this.set({ ...base, status: 'failed', error: String((err as Error).message).slice(0, 400) });
        }
    }

    private async findOpen(incidentKey: string, conn: string): Promise<any> {
        const listId = await findAction('pager-duty', 'list incidents', 'GET', '/incidents', TASK);
        const res = await one(['actions', 'execute', 'pager-duty', listId, conn, '--query-params', JSON.stringify({ incident_key: incidentKey })], 120_000, 'find the open page');
        return (res.response?.incidents ?? []).find((i: any) => i.status !== 'resolved');
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
                const [conn, getId] = await Promise.all([connection('pager-duty'), findAction('pager-duty', 'get an incident by id', 'GET', '/incidents/{{id}}', TASK)]);
                const incident = (await one(['actions', 'execute', 'pager-duty', getId, conn, '--path-vars', JSON.stringify({ id: page.id })], 120_000, 'follow the page')).response?.incident;
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

    async resolve(page: PageInfo): Promise<void> {
        if (!page.id) return;
        try {
            const [email, conn, updateId] = await Promise.all([fromEmail(), connection('pager-duty'), findAction('pager-duty', 'update an incident by id', 'PUT', '/incidents/{{id}}', TASK)]);
            const incident = (
                await one(
                    [
                        'actions', 'execute', 'pager-duty', updateId, conn,
                        '-d', JSON.stringify({ incident: { type: 'incident_reference', status: 'resolved' } }),
                        '--path-vars', JSON.stringify({ id: page.id }),
                        '--headers', JSON.stringify({ From: email }),
                    ],
                    60_000,
                    'resolve the page',
                )
            ).response?.incident;
            this.set({ ...page, ...fromIncident(incident), error: undefined });
        } catch (err) {
            this.set({ ...page, error: `Resolve failed: ${String((err as Error).message).slice(0, 300)}` });
        }
    }
}

function fromIncident(incident: any): Pick<PageInfo, 'id' | 'number' | 'url' | 'status' | 'acknowledged_by'> {
    return {
        id: incident?.id,
        number: incident?.incident_number,
        url: incident?.html_url,
        status: incident?.status ?? 'triggered',
        acknowledged_by: (incident?.acknowledgements ?? []).map((a: any) => a.acknowledger?.summary).filter(Boolean),
    };
}
