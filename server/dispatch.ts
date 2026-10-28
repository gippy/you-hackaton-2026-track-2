// The containment alert: built from the current incident and the operator's choices, sent to
// Discord through One's "Create a Message in a Channel" action with the One CLI.
//
// The action id is found at run time by method and path, never pasted in. A dry run asks the CLI
// for the exact request it would send (`--dry-run`), and a live post is never retried blindly.
import library from '../shared/library.json' with { type: 'json' };
import type { Action, DispatchMode, RunState } from '../shared/protocol.ts';
import { connection, findAction, one, OneError } from './one.ts';

const DEFAULT_CHANNEL = '1564842098740695100'; // the venue's #loft-incident
const PROJECT = 'Haunted Command Station';
const MESSAGE_PATH = '/channels/{{channelId}}/messages';
const EDIT_PATH = '/channels/{{channelId}}/messages/{{messageId}}';
// Failures where the post may have landed even though no answer came back.
const UNCERTAIN = /timed out|timeout|socket hang up|econnreset|bad gateway|\b5\d\d\b|429|network/i;

const sectors: Record<string, string> = library.sectors;
const arsenal: Record<string, string> = library.arsenal;

export interface OperatorChoice {
    action: Action;
    countermeasure: string | null;
    sealed: string[];
    extracted: number;
}

export interface DispatchResult {
    mode: DispatchMode;
    request?: unknown;
    response?: unknown;
    error?: string;
}

export function channelId(): string {
    return (process.env.DISCORD_CHANNEL_ID || DEFAULT_CHANNEL).trim();
}

const short = (text: string, limit: number) => {
    const flat = (text || '').split(/\s+/).join(' ').trim();
    return flat.length <= limit ? flat : `${flat.slice(0, limit - 1).trimEnd()}…`;
};

/** The message, in the venue's format: [project] · [sector] · [action] · one-line rationale. */
export function alertText(run: RunState, choice: OperatorChoice): string {
    const { incident: inc, manifest } = run;
    const lines = [
        `[${PROJECT}] · ${sectors[inc.sector] ?? inc.sector} · ${choice.action.toUpperCase()} · ${short(manifest.dispatch_rationale, 160)}`,
    ];
    const readings: string[] = [];
    if (inc.emf_mg !== null) readings.push(`EMF ${inc.emf_mg} mG (${inc.emf_trend})`);
    if (inc.temperature_c !== null) readings.push(`${inc.temperature_c}°C`);
    if (inc.civilians.count) {
        const out = choice.extracted ? `, ${choice.extracted} extracted` : '';
        readings.push(`${inc.civilians.count} civilian(s) ${inc.civilians.condition} at ${inc.civilians.location}${out}`);
    }
    lines.push(
        `${run.incident_id || 'pasted incident'}: ${inc.entity} (threat ${inc.threat_level}/5, ${inc.severity}). ${readings.join('; ')}`,
    );
    if (choice.countermeasure && arsenal[choice.countermeasure]) {
        const source = sourceFor(run, choice.countermeasure);
        lines.push(`Countermeasure: ${arsenal[choice.countermeasure]}${source ? ` (grounded in ${source})` : ''}`);
    }
    const sealed = choice.sealed.filter((id) => id in sectors);
    if (sealed.length) lines.push(`Sealed: ${sealed.map((id) => sectors[id]).join(', ')}`);
    return lines.join('\n').slice(0, 1900); // Discord's limit is 2000 characters
}

function sourceFor(run: RunState, countermeasure: string): string {
    for (const comp of run.manifest.components) {
        if (comp.type !== 'CountermeasurePicker') continue;
        const option = comp.props.options.find((o) => o.id === countermeasure);
        const source = option && run.sources.find((s) => s.n === option.source);
        if (source) return source.url;
    }
    return '';
}

/** Dry run: the exact request One would send. Live: post it, once. Offline: the body, without calling One. */
export async function send(text: string, mode: DispatchMode): Promise<DispatchResult> {
    const body = { content: text };
    const channel = channelId();
    if (mode === 'offline') {
        return { mode, request: { method: 'POST', path: `/channels/${channel}/messages`, data: body, note: 'One was not called' } };
    }
    const [id, key] = await Promise.all([
        findAction('discord', 'create a message in a channel', 'POST', MESSAGE_PATH, 'post a containment alert to an incident channel'),
        connection('discord'),
    ]);
    // The URL template names the variable channelId and the validator checks channel_id: send both.
    const args = ['actions', 'execute', 'discord', id, key, '-d', JSON.stringify(body), '--path-vars', JSON.stringify({ channelId: channel, channel_id: channel })];
    if (mode === 'dry-run') {
        const res = await one([...args, '--dry-run']);
        return { mode, request: res.request ?? res };
    }
    await one(['actions', 'load', id]); // read the action's docs before its first live execute
    try {
        const res = await one(args, 60_000);
        const message = res.response ?? res;
        return { mode, response: { id: message.id, channel_id: message.channel_id, timestamp: message.timestamp } };
    } catch (err) {
        const msg = String((err as Error).message);
        if (UNCERTAIN.test(msg)) {
            throw new OneError(`${msg}\nThe post may have landed. Check #loft-incident or app.withone.ai/logs before sending again.`);
        }
        throw err;
    }
}

/** Edit a message this station posted, such as a sky warning whose countdown moved. Same modes as `send`. */
export async function edit(messageId: string, text: string, mode: DispatchMode): Promise<DispatchResult> {
    const body = { content: text };
    const channel = channelId();
    const [id, key] = await Promise.all([
        findAction('discord', 'update a channel message', 'PATCH', EDIT_PATH, 'keep a posted warning up to date'),
        connection('discord'),
    ]);
    // Both spellings of each path variable, as for the post.
    const pathVars = { channelId: channel, channel_id: channel, messageId, message_id: messageId };
    const args = ['actions', 'execute', 'discord', id, key, '-d', JSON.stringify(body), '--path-vars', JSON.stringify(pathVars)];
    if (mode === 'dry-run') {
        const res = await one([...args, '--dry-run']);
        return { mode, request: res.request ?? res };
    }
    await one(['actions', 'load', id]);
    const res = await one(args, 60_000); // an edit that is repeated changes nothing, so a failure is safe to report and retry later
    const message = res.response ?? res;
    return { mode, response: { id: message.id, edited_timestamp: message.edited_timestamp } };
}
