// Proof of work for the TypeScript side: Parasail calls (scripts/art.ts) and One actions (Discord,
// ElevenLabs, PagerDuty), appended to proof/parasail.jsonl and proof/partners.jsonl.
//
// The repo is public, so keys never reach these files: known key values, One connection keys and
// bearer tokens are replaced, headers are never written, and any string over 20,000 characters is cut.
// pipeline/proof.py does the same for the Python side.
import { appendFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const PROOF = join(resolve(import.meta.dirname, '..'), 'proof');
const MAX_STRING = 20_000;
const SECRET_RES: [RegExp, string][] = [
    [/live::[\w-]+::default::[0-9a-f]{32}/g, 'live::<platform>::default::<redacted>'],
    [/sk_(?:live|test)_[A-Za-z0-9_-]+/g, 'sk_<redacted>'],
    [/Bearer\s+[A-Za-z0-9._-]{12,}/g, 'Bearer <redacted>'],
];
const SECRET_ENV = ['PARASAIL_API_KEY', 'YDC_API_KEY', 'YOU_API_KEY', 'ONE_SECRET'];

export function scrub(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(scrub);
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).filter(([k]) => k.toLowerCase() !== 'headers').map(([k, v]) => [k, scrub(v)]));
    }
    if (typeof value !== 'string') return value;
    let text = value;
    for (const name of SECRET_ENV) {
        const key = process.env[name]?.trim();
        if (key && key.length >= 8) text = text.split(key).join('<redacted>');
    }
    for (const [pattern, repl] of SECRET_RES) text = text.replace(pattern, repl);
    return text.length <= MAX_STRING ? text : `${text.slice(0, MAX_STRING)}… [cut from ${text.length} characters]`;
}

/** Append one line to proof/<ledger>.jsonl. Never throws: proof must not break the station. */
export function record(ledger: 'parasail' | 'partners', entry: Record<string, unknown>): void {
    try {
        mkdirSync(PROOF, { recursive: true });
        // PROOF_CONTEXT (for example "eval") tells demo lines from test-harness lines.
        const context = process.env.PROOF_CONTEXT?.trim();
        appendFileSync(join(PROOF, `${ledger}.jsonl`), `${JSON.stringify(scrub({ ts: new Date().toISOString(), ...(context ? { context } : {}), ...entry }))}\n`);
    } catch (err) {
        console.warn(`proof: could not record a ${ledger} line: ${(err as Error).message}`);
    }
}

/** The small, non-personal part of a One action's response: ids, statuses and sizes, never lists of people. */
export function summarize(response: any): unknown {
    if (!response || typeof response !== 'object') return response;
    const pick = (o: any) =>
        Object.fromEntries(['id', 'status', 'incident_number', 'urgency', 'channel_id', 'timestamp', 'edited_timestamp', 'saved', 'size', 'contentType'].filter((k) => o?.[k] !== undefined).map((k) => [k, o[k]]));
    const inner = response.incident ?? response.message ?? response;
    const counts = Object.fromEntries(Object.entries(response).filter(([, v]) => Array.isArray(v)).map(([k, v]) => [`${k}_count`, (v as unknown[]).length]));
    return { ...pick(inner), ...counts };
}
