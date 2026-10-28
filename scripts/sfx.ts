// The station's sound effects, generated once with ElevenLabs through One and committed, so the
// station plays them offline too.
//
//     pnpm sfx                  generate every sound in shared/library.json that is missing or whose prompt changed
//     pnpm sfx --force zombie   generate the sounds whose id contains "zombie" again
//     pnpm sfx --list           show what would be generated, and generate nothing
//
// The prompts live in shared/library.json under "sounds". web/public/sfx/sounds.json records the
// prompt, length and loop setting each file was made from, so an unchanged sound is never paid for twice.
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

import library from '../shared/library.json' with { type: 'json' };
import { connection, findAction, one } from '../server/one.ts';

const ROOT = resolve(import.meta.dirname, '..');
const OUT = join(ROOT, 'web', 'public', 'sfx');
const RECORD = join(OUT, 'sounds.json');
const FORMAT = 'mp3_44100_64'; // small files: about 8 KB per second

interface Sound {
    kind: string;
    label: string;
    prompt: string;
    duration: number;
    loop?: boolean;
}

const { values: args } = parseArgs({ options: { force: { type: 'string' }, list: { type: 'boolean', default: false } } });

if (existsSync(join(ROOT, '.env'))) process.loadEnvFile(join(ROOT, '.env'));

const sounds = library.sounds as Record<string, Sound>;
const made: Record<string, Omit<Sound, 'kind' | 'label'>> = existsSync(RECORD) ? JSON.parse(readFileSync(RECORD, 'utf8')) : {};
const sameAsMade = (id: string, s: Sound) =>
    made[id]?.prompt === s.prompt && made[id]?.duration === s.duration && Boolean(made[id]?.loop) === Boolean(s.loop) && existsSync(join(OUT, `${id}.mp3`));
const todo = Object.entries(sounds).filter(([id, s]) => (args.force ? id.includes(args.force) : !sameAsMade(id, s)));

if (!todo.length) {
    console.log('Every sound is up to date.');
    process.exit(0);
}
for (const [id, s] of todo) console.log(`${args.list ? 'would generate' : 'generating'} ${id} (${s.duration} seconds${s.loop ? ', loop' : ''}): ${s.prompt}`);
if (args.list) process.exit(0);

const [actionId, key] = await Promise.all([
    findAction('elevenlabs', 'generate sound effects from text', 'POST', '/sound-generation', 'make short sound effects for a dashboard'),
    connection('elevenlabs'),
]);
await one(['actions', 'load', actionId]); // read the action's docs before its first execute

for (const [id, s] of todo) {
    const body = { text: s.prompt, duration_seconds: s.duration, ...(s.loop ? { loop: true } : {}) };
    const tmp = join(OUT, `${id}.tmp.mp3`);
    const res = await one(['actions', 'execute', 'elevenlabs', actionId, key, '-d', JSON.stringify(body), '--query-params', JSON.stringify({ output_format: FORMAT }), '--output', tmp]);
    if (!res.response?.saved) throw new Error(`ElevenLabs did not return audio for ${id}: ${JSON.stringify(res).slice(0, 300)}`);
    renameSync(tmp, join(OUT, `${id}.mp3`));
    made[id] = { prompt: s.prompt, duration: s.duration, ...(s.loop ? { loop: true } : {}) };
    writeFileSync(RECORD, `${JSON.stringify(made, null, 2)}\n`); // after every sound, so a failure keeps what was paid for
    console.log(`  saved web/public/sfx/${id}.mp3 (${Math.round(res.response.size / 1024)} KB)`);
}
