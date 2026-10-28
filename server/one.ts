// The One CLI, shared by the Discord dispatch, the spoken dispatch and `pnpm sfx`.
//
// Action ids are found at run time with `one actions find` and picked by method and path, never
// pasted in. Connection keys come from `one list`, or from ONE_<PLATFORM>_CONNECTION_KEY in .env
// when a platform has more than one connection.
import { execFile } from 'node:child_process';

import { record, summarize } from './proof.ts';

const SECRET_RE = /sk_(?:live|test)_[A-Za-z0-9_-]+/g;

export class OneError extends Error {}

export const redact = (text: string) => text.replace(SECRET_RE, 'sk_***');

function parseJson(out: string): any {
    try {
        return JSON.parse(out);
    } catch {
        const line = out.split('\n').reverse().find((l) => l.trim().startsWith('{'));
        if (line) return JSON.parse(line);
        throw new OneError(`could not parse One CLI output: ${redact(out.slice(0, 300))}`);
    }
}

/**
 * Run `one --agent <args>` and return its JSON. The CLI prints a JSON error and exits non-zero on failure.
 * Every `actions execute` is recorded in proof/partners.jsonl, with `purpose` saying what it was for.
 */
export function one(args: string[], timeout = 120_000, purpose = ''): Promise<any> {
    if (args[0] === 'actions' && args[1] === 'execute') return executeWithProof(args, timeout, purpose);
    return run(args, timeout);
}

const flag = (args: string[], name: string) => {
    const i = args.indexOf(name);
    return i >= 0 ? JSON.parse(args[i + 1]) : undefined;
};

async function executeWithProof(args: string[], timeout: number, purpose: string): Promise<any> {
    const [, , platform, actionId] = args; // args[4] is the connection key: never recorded
    const action = titles.get(actionId);
    const entry = {
        partner: 'one',
        platform,
        action: action?.title ?? actionId,
        method: action?.method,
        path: action?.path,
        purpose,
        dry_run: args.includes('--dry-run'),
        request: { data: flag(args, '-d'), path_vars: flag(args, '--path-vars'), query_params: flag(args, '--query-params') },
    };
    const t0 = Date.now();
    try {
        const res = await run(args, timeout);
        record('partners', { ...entry, response: entry.dry_run ? { would_send_to: res.request?.url } : summarize(res.response), latency_ms: Date.now() - t0 });
        return res;
    } catch (err) {
        record('partners', { ...entry, error: String((err as Error).message).slice(0, 2000), latency_ms: Date.now() - t0 });
        throw err;
    }
}

function run(args: string[], timeout: number): Promise<any> {
    return new Promise((resolve, reject) => {
        execFile('one', ['--agent', ...args], { timeout, maxBuffer: 8 * 1024 * 1024 }, (err, stdout, stderr) => {
            if (!stdout.trim()) {
                const why = (err as NodeJS.ErrnoException | null)?.code === 'ENOENT' ? 'the `one` CLI is not installed' : stderr || err?.message;
                reject(new OneError(`one ${args.slice(0, 2).join(' ')} failed: ${redact(String(why))}`));
                return;
            }
            try {
                const parsed = parseJson(stdout);
                if (parsed?.error) {
                    const detail = parsed.validation ? ` ${JSON.stringify(parsed.validation)}` : '';
                    reject(new OneError(redact(`${parsed.error}${detail}`)));
                } else resolve(parsed);
            } catch (e) {
                reject(e);
            }
        });
    });
}

const norm = (path: string) => path.replace(/\{\{?\w+\}?\}/g, '{}').replace(/\/$/, '');
const actions = new Map<string, Promise<string>>();
const titles = new Map<string, { title: string; method: string; path: string }>(); // action id -> what it is, for the proof ledger
const connections = new Map<string, Promise<string>>();

/** The action id for a platform's `method path`, found once per process. */
export function findAction(platform: string, query: string, method: string, path: string, task: string): Promise<string> {
    const cacheKey = `${platform} ${method} ${norm(path)}`;
    if (!actions.has(cacheKey)) {
        const found = one(['actions', 'find', platform, query, '--task', task, '--no-knowledge', '-t', 'execute']).then((res) => {
            const answer = res.answers?.[0] ?? {};
            const candidates = [...(answer.selected ?? []), ...(answer.alsoSelected ?? []), ...(answer.alternatives ?? [])];
            const hit = candidates.find((a: any) => a.method?.toUpperCase() === method && norm(a.path) === norm(path));
            if (!hit) throw new OneError(`no ${platform} action matched ${method} ${path}`);
            titles.set(hit.actionId, { title: hit.title, method: hit.method, path: hit.path });
            return hit.actionId as string;
        });
        found.catch(() => actions.delete(cacheKey)); // a failed lookup is retried next time
        actions.set(cacheKey, found);
    }
    return actions.get(cacheKey)!;
}

/** The connection key for a platform: ONE_<PLATFORM>_CONNECTION_KEY, else its only operational connection. */
export function connection(platform: string): Promise<string> {
    const envName = `ONE_${platform.toUpperCase().replace(/-/g, '_')}_CONNECTION_KEY`; // pager-duty: ONE_PAGER_DUTY_…
    const fromEnv = process.env[envName]?.trim();
    if (fromEnv) return Promise.resolve(fromEnv);
    if (!connections.has(platform)) {
        const found = one(['list', '--search', platform, '--limit', '100']).then((listing) => {
            const rows = (listing.connections ?? []).filter((c: any) => c.platform === platform && c.state === 'operational');
            if (rows.length === 1) return rows[0].key as string;
            throw new OneError(
                rows.length
                    ? `${rows.length} ${platform} connections; set ${envName} in .env`
                    : `${platform} is not connected. Run: one add ${platform}`,
            );
        });
        found.catch(() => connections.delete(platform));
        connections.set(platform, found);
    }
    return connections.get(platform)!;
}
