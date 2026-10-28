// The spoken call: a short line such as "Calling the vampire hunter", read by an ElevenLabs voice through
// One's text-to-speech action.
//
// Each line is generated once and cached in out/speech/ under a hash of the voice, model and text, so a
// repeated call costs nothing. Generated speech is never committed.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';

import { connection, findAction, one, OneError } from './one.ts';

const VOICE = process.env.ELEVENLABS_VOICE_ID || 'onwK4e9ZLuTAKqWW03F9'; // "Daniel, Steady Broadcaster"
const MODEL = 'eleven_multilingual_v2';
const FORMAT = 'mp3_44100_64';
export const SPEECH_FILE = /^[a-f0-9]{16}\.mp3$/;

const inFlight = new Map<string, Promise<string>>();

/** The cached MP3's file name in `dir`, generating it first if needed. Concurrent calls share one generation. */
export function speak(text: string, dir: string): Promise<string> {
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
        findAction('elevenlabs', 'stream text to speech audio for a voice', 'POST', '/text-to-speech/{{voiceId}}/stream', 'read a call for an expert aloud'),
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
    ], 120_000, 'spoken call');
    if (!res.response?.saved) throw new OneError(`ElevenLabs returned no audio: ${JSON.stringify(res).slice(0, 300)}`);
    renameSync(tmp, join(dir, name));
    return name;
}
