// The One CLI, shared by the Discord dispatch, the spoken dispatch and `pnpm sfx`.
//
// Action ids are found at run time with `one actions find` and picked by method and path, never
// pasted in. Connection keys come from `one list`, or from ONE_<PLATFORM>_CONNECTION_KEY in .env
// when a platform has more than one connection.
import { execFile } from 'node:child_process';

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

/** Run `one --agent <args>` and return its JSON. The CLI prints a JSON error and exits non-zero on failure. */
export function one(args: string[], timeout = 120_000): Promise<any> {
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
            return hit.actionId as string;
        });
        found.catch(() => actions.delete(cacheKey)); // a failed lookup is retried next time
        actions.set(cacheKey, found);
    }
    return actions.get(cacheKey)!;
}

/** The connection key for a platform: ONE_<PLATFORM>_CONNECTION_KEY, else its only operational connection. */
export function connection(platform: string): Promise<string> {
    const fromEnv = process.env[`ONE_${platform.toUpperCase()}_CONNECTION_KEY`]?.trim();
    if (fromEnv) return Promise.resolve(fromEnv);
    if (!connections.has(platform)) {
        const found = one(['list', '--search', platform, '--limit', '100']).then((listing) => {
            const rows = (listing.connections ?? []).filter((c: any) => c.platform === platform && c.state === 'operational');
            if (rows.length === 1) return rows[0].key as string;
            throw new OneError(
                rows.length
                    ? `${rows.length} ${platform} connections; set ONE_${platform.toUpperCase()}_CONNECTION_KEY in .env`
                    : `${platform} is not connected. Run: one add ${platform}`,
            );
        });
        found.catch(() => connections.delete(platform));
        connections.set(platform, found);
    }
    return connections.get(platform)!;
}
