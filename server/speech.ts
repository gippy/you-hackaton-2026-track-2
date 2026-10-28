// The spoken dispatch: the alert text read by an ElevenLabs voice, through One's text-to-speech action.
//
// Each spoken text is generated once and cached in out/speech/ under a hash of the voice, model and
// text, so a repeated dispatch costs nothing. Generated speech is never committed.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';

import { connection, findAction, one, OneError } from './one.ts';

const VOICE = process.env.ELEVENLABS_VOICE_ID || 'onwK4e9ZLuTAKqWW03F9'; // "Daniel, Steady Broadcaster"
const MODEL = 'eleven_multilingual_v2';
const FORMAT = 'mp3_44100_64';
export const SPEECH_FILE = /^[a-f0-9]{16}\.mp3$/;

const inFlight = new Map<string, Promise<string>>();

/** What the voice says: the alert, marked as simulated, without symbols and links that read badly aloud. */
export function spokenText(alert: string): string {
    const lines = alert
        .split('\n')
        .map((line) =>
            line
                .replace(/\s*\(grounded in https?:\/\/\S+\)/g, '')
                .replace(/^\[([^\]]+)\]/, '$1')
                .replace(/\s+·\s+/g, '. ')
                .replace(/°C/g, ' degrees Celsius')
                .replace(/\bmG\b/g, 'milligauss')
                .replace(/(\d)\/(\d)/g, '$1 out of $2')
                .replace(/\(s\)/g, 's')
                .replace(/(^|[\s(;])-(\d)/g, '$1minus $2')
                .replace(/\b([A-Z]{4,})\b/g, (word) => word[0] + word.slice(1).toLowerCase()),
        );
    return `Simulated dispatch, this is a drill. ${lines.join('. ').replace(/\.\s*\./g, '.')}`;
}

/** The cached MP3's file name in `dir`, generating it first if needed. Concurrent calls share one generation. */
export function speak(alert: string, dir: string): Promise<string> {
    const text = spokenText(alert);
    const name = `${createHash('sha256').update(`${VOICE}|${MODEL}|${text}`).digest('hex').slice(0, 16)}.mp3`;
    if (existsSync(join(dir, name))) return Promise.resolve(name);
    if (!inFlight.has(name)) {
        const job = generate(text, dir, name).finally(() => inFlight.delete(name));
        inFlight.set(name, job);
    }
    return inFlight.get(name)!;
}

async function generate(text: string, dir: string, name: string): Promise<string> {
    const [actionId, key] = await Promise.all([
        findAction('elevenlabs', 'stream text to speech audio for a voice', 'POST', '/text-to-speech/{{voiceId}}/stream', 'read a containment dispatch aloud'),
        connection('elevenlabs'),
    ]);
    mkdirSync(dir, { recursive: true });
    const tmp = join(dir, `${name}.tmp`);
    // The URL template names the voice voiceId and the validator checks voice_id: send both.
    const res = await one([
        'actions', 'execute', 'elevenlabs', actionId, key,
        '-d', JSON.stringify({ text, model_id: MODEL }),
        '--path-vars', JSON.stringify({ voiceId: VOICE, voice_id: VOICE }),
        '--query-params', JSON.stringify({ output_format: FORMAT }),
        '--output', tmp,
    ], 120_000, 'spoken dispatch');
    if (!res.response?.saved) throw new OneError(`ElevenLabs returned no audio: ${JSON.stringify(res).slice(0, 300)}`);
    renameSync(tmp, join(dir, name));
    return name;
}
