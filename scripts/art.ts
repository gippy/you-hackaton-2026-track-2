// Art for the station, made on this Mac: Parasail turns a short brief into image prompts, and
// Z-Image Turbo renders each one locally through mflux.
//
//     pnpm art "a hero image for the landing screen"                 Parasail writes 3 prompts, each rendered once
//     pnpm art --count 4 --size 1536x864 "the entities from the simulated incidents"
//     pnpm art --prompt "an exact prompt, rendered as written" --seed 7
//
// Images land in art/, and art/prompts.jsonl keeps the prompt and seed of each one, so a good
// image can be rendered again, or varied with another seed.
//
// Needs mflux: `uv tool install --python 3.13 mflux`. The first render downloads the 4-bit model,
// about 6 GB, from Hugging Face.
import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';

const ROOT = resolve(import.meta.dirname, '..');
const MFLUX = 'mflux-generate-z-image-turbo';
const MODEL = 'mflux-community/z-image-turbo-mflux-q4';
const STEPS = '9';
// The station page's palette and mood, so art from separate runs still belongs together.
const STYLE =
    'near-black purple background, violet glow with small amber and red accents, ' +
    'retro-futurist paranormal control room mood, cinematic digital illustration';

const { values: args, positionals } = parseArgs({
    allowPositionals: true,
    options: {
        count: { type: 'string', default: '3' },
        size: { type: 'string', default: '1024x1024' },
        prompt: { type: 'string' },
        seed: { type: 'string' },
        style: { type: 'string', default: STYLE },
        out: { type: 'string', default: 'art' },
    },
});

if (existsSync(join(ROOT, '.env'))) process.loadEnvFile(join(ROOT, '.env'));

interface ArtPrompt {
    name: string;
    prompt: string;
}

const SYSTEM = (count: number, style: string) => `You write prompts for Z-Image Turbo, a text-to-image model.
The images are art for the Haunted Command Station, a dashboard where operators contain paranormal incidents at a venue.
Turn the brief into ${count} different images.

Each prompt:
- is 40 to 80 words of plain descriptive English, with no lists, tags or weights.
- has one clear subject in simple surroundings. Name the subject first, then the composition and camera, the lighting, the colors and the medium.
- shows no detailed real-world places or landmarks, no real people, and no logos or brand marks.
- has no written text in the image unless the brief asks for it. Then quote the exact words.
- ends with this shared style: ${style}.

Make the images differ in subject or composition, not only in wording.
"name" is a short kebab-case file name for the image.`;

const SCHEMA = {
    type: 'object',
    additionalProperties: false,
    required: ['images'],
    properties: {
        images: {
            type: 'array',
            items: {
                type: 'object',
                additionalProperties: false,
                required: ['name', 'prompt'],
                properties: { name: { type: 'string' }, prompt: { type: 'string' } },
            },
        },
    },
};

async function writePrompts(brief: string, count: number, style: string): Promise<ArtPrompt[]> {
    const key = process.env.PARASAIL_API_KEY?.trim();
    if (!key) throw new Error('PARASAIL_API_KEY is empty. Put it in .env, or pass --prompt to skip Parasail.');
    const base = (process.env.PARASAIL_BASE_URL || 'https://api.parasail.io/v1').replace(/\/$/, '');
    const res = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: process.env.HAUNT_MODEL || 'parasail-minimax-m31-flash',
            temperature: 0.9,
            response_format: { type: 'json_schema', json_schema: { name: 'art_prompts', strict: true, schema: SCHEMA } },
            messages: [
                { role: 'system', content: SYSTEM(count, style) },
                { role: 'user', content: brief },
            ],
        }),
    });
    if (!res.ok) throw new Error(`Parasail answered ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const body = await res.json();
    const { images } = JSON.parse(body.choices[0].message.content) as { images: ArtPrompt[] };
    return images.slice(0, count);
}

function render(prompt: string, seed: number, width: number, height: number, file: string): void {
    const res = spawnSync(
        MFLUX,
        ['--model', MODEL, '--base-model', 'z-image-turbo', '--steps', STEPS, '--seed', String(seed),
            '--width', String(width), '--height', String(height), '--prompt', prompt, '--output', file],
        { stdio: 'inherit' },
    );
    if (res.error) throw new Error(`could not start ${MFLUX}. Install it with: uv tool install --python 3.13 mflux`);
    if (res.status !== 0) throw new Error(`${MFLUX} exited with code ${res.status}`);
}

const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'image';

const size = /^(\d+)x(\d+)$/.exec(args.size);
const [width, height] = size ? [Number(size[1]), Number(size[2])] : [0, 0];
if (!width || width % 16 || height % 16) {
    console.error(`--size must be WIDTHxHEIGHT in multiples of 16, for example 1024x1024 or 1536x864, not ${args.size}`);
    process.exit(1);
}
const brief = positionals.join(' ').trim();
if (!args.prompt && !brief) {
    console.error('Say what the art is for, for example: pnpm art "a hero image for the landing screen"');
    process.exit(1);
}

const images = args.prompt
    ? [{ name: slug(args.prompt.split(/\s+/).slice(0, 6).join(' ')), prompt: args.prompt }]
    : await writePrompts(brief, Number(args.count), args.style);

const out = resolve(ROOT, args.out);
mkdirSync(out, { recursive: true });
for (const [i, image] of images.entries()) {
    const seed = args.seed ? Number(args.seed) : Math.floor(Math.random() * 2 ** 31);
    const file = join(out, `${slug(image.name)}-${seed}.png`);
    console.log(`\n[${i + 1}/${images.length}] ${file}\n${image.prompt}\n`);
    render(image.prompt, seed, width, height, file);
    const entry = { file: relative(ROOT, file), prompt: image.prompt, seed, width, height, brief };
    appendFileSync(join(out, 'prompts.jsonl'), `${JSON.stringify(entry)}\n`);
}
