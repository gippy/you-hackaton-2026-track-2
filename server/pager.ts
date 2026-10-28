// Paging the on-call through PagerDuty with One: open an incident for a critical dispatch, follow it
// until someone acknowledges it, and resolve it when the station stands down.
//
// Dry run by default: the One CLI returns the exact request and nothing is created. A live page
// buzzes a real phone, so it needs --live-page and the page's "Live page" switch. Every title starts
// with [SIMULATED]. The service and the From email are found at run time (PAGERDUTY_SERVICE_ID and
// PAGERDUTY_FROM override them), so no account detail lives in the repo.
import type { PageInfo } from '../shared/protocol.ts';
import { connection, findAction, one, OneError } from './one.ts';

const POLL_MS = 15_000;
const TASK = 'page on-call for a simulated incident and follow it';

export interface PageRequest {
    key: string; // the incident_key: PagerDuty refuses a second open incident with the same key
    title: string;
    details: string;
    urgency: 'high' | 'low';
}

let account: Promise<{ service: string; from: string }> | null = null;

/** The service to page and the email PagerDuty requires in the From header. */
function pagerAccount(): Promise<{ service: string; from: string }> {
    account ??= (async () => {
        const key = await connection('pager-duty');
        const [servicesId, usersId] = await Promise.all([
            findAction('pager-duty', 'list services', 'GET', '/services', TASK),
            findAction('pager-duty', 'list users', 'GET', '/users', TASK),
        ]);
        const service =
            process.env.PAGERDUTY_SERVICE_ID ||
            only((await one(['actions', 'execute', 'pager-duty', servicesId, key])).response?.services?.filter((s: any) => s.status !== 'disabled'), 'active service', 'PAGERDUTY_SERVICE_ID').id;
        const from =
            process.env.PAGERDUTY_FROM ||
            only((await one(['actions', 'execute', 'pager-duty', usersId, key])).response?.users?.filter((u: any) => u.role === 'owner'), 'owner', 'PAGERDUTY_FROM').email;
        return { service, from };
    })();
    account.catch(() => (account = null));
    return account;
}

function only(rows: any[] | undefined, what: string, env: string): any {
    if (rows?.length === 1) return rows[0];
    throw new OneError(`PagerDuty has ${rows?.length ?? 0} ${what}s; set ${env} in .env`);
}

export class Pager {
    private pages = new Map<string, PageInfo>();
    private timers = new Map<string, NodeJS.Timeout>();
    private readonly onChange: (pages: PageInfo[]) => void;

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

    /** Open a page. A live page that is still open for the same key is kept, not sent again. */
    async open(req: PageRequest, live: boolean): Promise<void> {
        const existing = this.pages.get(req.key);
        if (live && existing?.mode === 'live' && existing.status !== 'resolved' && existing.status !== 'failed') return;
        const base: PageInfo = { key: req.key, title: req.title, urgency: req.urgency, mode: live ? 'live' : 'dry-run', status: 'sending', opened_at: new Date().toISOString(), acknowledged_by: [] };
        this.set(base);
        try {
            const [{ service, from }, key, createId] = await Promise.all([
                pagerAccount(),
                connection('pager-duty'),
                findAction('pager-duty', 'create an incident', 'POST', '/incidents', TASK),
            ]);
            const body = {
                incident: {
                    type: 'incident',
                    title: req.title,
                    service: { id: service, type: 'service_reference' },
                    urgency: req.urgency,
                    incident_key: req.key,
                    body: { type: 'incident_body', details: req.details },
                },
            };
            const args = ['actions', 'execute', 'pager-duty', createId, key, '-d', JSON.stringify(body), '--headers', JSON.stringify({ From: from })];
            if (!live) {
                const res = await one([...args, '--dry-run']);
                this.set({ ...base, status: 'dry-run', request: redactFrom(res.request ?? res) });
                return;
            }
            await one(['actions', 'load', createId]); // read the action's docs before its first live execute
            let incident: any;
            try {
                incident = (await one(args, 60_000)).response?.incident;
            } catch (err) {
                // A second open incident with the same key is refused: follow the one that is open.
                if (!/key|dedup|already/i.test(String((err as Error).message))) throw err;
                incident = await this.findOpen(req.key, key);
            }
            if (!incident?.id) throw new OneError('PagerDuty did not return an incident');
            this.set({ ...base, ...fromIncident(incident) });
            this.follow(req.key);
        } catch (err) {
            this.set({ ...base, status: 'failed', error: String((err as Error).message).slice(0, 400) });
        }
    }

    private async findOpen(incidentKey: string, key: string): Promise<any> {
        const listId = await findAction('pager-duty', 'list incidents', 'GET', '/incidents', TASK);
        const res = await one(['actions', 'execute', 'pager-duty', listId, key, '--query-params', JSON.stringify({ incident_key: incidentKey })]);
        return (res.response?.incidents ?? []).find((i: any) => i.status !== 'resolved');
    }

    /** Poll a live incident until it is resolved, so the station shows who acknowledged it. */
    private follow(pageKey: string): void {
        clearInterval(this.timers.get(pageKey));
        const timer = setInterval(async () => {
            const page = this.pages.get(pageKey);
            if (!page?.id || page.status === 'resolved') {
                clearInterval(timer);
                return;
            }
            try {
                const [key, getId] = await Promise.all([connection('pager-duty'), findAction('pager-duty', 'get an incident by id', 'GET', '/incidents/{{id}}', TASK)]);
                const incident = (await one(['actions', 'execute', 'pager-duty', getId, key, '--path-vars', JSON.stringify({ id: page.id })])).response?.incident;
                const next = { ...page, ...fromIncident(incident) };
                if (next.status !== page.status || next.acknowledged_by.join() !== page.acknowledged_by.join()) this.set(next);
            } catch (err) {
                console.warn(`PagerDuty follow-up failed: ${(err as Error).message}`);
            }
        }, POLL_MS);
        this.timers.set(pageKey, timer);
    }

    /** Resolve every open page: the station stood down. Dry-run pages get the request that would resolve them. */
    async resolveAll(): Promise<void> {
        for (const page of this.list()) {
            if (page.status === 'resolved' || page.status === 'failed') continue;
            await this.resolve(page);
        }
    }

    async resolve(page: PageInfo): Promise<void> {
        try {
            const [{ from }, key, updateId] = await Promise.all([
                pagerAccount(),
                connection('pager-duty'),
                findAction('pager-duty', 'update an incident by id', 'PUT', '/incidents/{{id}}', TASK),
            ]);
            const args = [
                'actions', 'execute', 'pager-duty', updateId, key,
                '-d', JSON.stringify({ incident: { type: 'incident_reference', status: 'resolved' } }),
                '--path-vars', JSON.stringify({ id: page.id ?? '<incident id>' }),
                '--headers', JSON.stringify({ From: from }),
            ];
            if (page.mode === 'dry-run') {
                const res = await one([...args, '--dry-run']);
                this.set({ ...page, status: 'resolved', request: redactFrom(res.request ?? res) });
                return;
            }
            const incident = (await one(args, 60_000)).response?.incident;
            this.set({ ...page, ...fromIncident(incident) });
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

/** The page shows the dry-run request; the From email stays on the server. */
function redactFrom(request: any): unknown {
    if (request?.headers?.From) return { ...request, headers: { ...request.headers, From: '***' } };
    return request;
}
