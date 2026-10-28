// Icons for the Nightfall scenario's countermeasures and props, drawn by Parasail as SVG and
// committed, so the station shows them offline too.
//
//     node scripts/icons.ts                    draw every icon that is missing or whose brief changed
//     node scripts/icons.ts --force garlic     draw the icons whose id contains "garlic" again
//     node scripts/icons.ts --list             show what would be drawn, and draw nothing
//
// Icons land in art/nightfall/icons/. The brief of each one is recorded in
// art/nightfall/manifest.json (kind "icon"), next to the Nightfall images, so an unchanged icon
// is never drawn twice. A drawing is accepted only if it passes the checks in `problem`.
//
// Every Parasail call, accepted or not, is appended to proof/parasail.jsonl with its request,
// the raw reply, token usage and timing. The API key is never written there.
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';

const ROOT = resolve(import.meta.dirname, '..');
const OUT = join(ROOT, 'art', 'nightfall');
const ICON_DIR = join(OUT, 'icons');
const MANIFEST = join(OUT, 'manifest.json');
const LEDGER = join(ROOT, 'proof', 'parasail.jsonl');
const MODEL = 'parasail-minimax-m31-flash';
const TRIES = 4;
const MAX_BYTES = 6000;

// The station's palette (web/src/style.css). Every color in an icon has to come from this list.
const PALETTE = {
    violet: '#b388ff',
    amber: '#ffb547',
    red: '#ff4d6d',
    green: '#4ade80',
    lavender: '#ece6f5',
    deep: '#2e2540',
};

interface Icon {
    id: string;
    alt: string;
    brief: string;
}

const ICONS: Icon[] = [
    { id: 'icon_garlic', alt: 'A garlic bulb', brief: 'a garlic bulb with a pointed top and three curved clove lines, with two small sparkle marks' },
    { id: 'icon_silver_netting', alt: 'A net with a diamond mesh', brief: 'a net: a rounded square of diamond mesh drawn as crossing diagonal lines, with a small knot at each corner' },
    { id: 'icon_uv_lamp', alt: 'A lamp casting a beam of light', brief: 'a UV and sunlight lamp: a rounded rectangular lamp head tilted down to the left on a short stand with a flat base, and five straight amber beams radiating from the front of the head' },
    { id: 'icon_barricade_foam', alt: 'A foam canister spraying foam', brief: 'a spray can of expanding foam: a tall canister with a nozzle, and three soft round foam blobs stacked beside it' },
    { id: 'icon_window_blinds', alt: 'A window with the blinds lowered', brief: 'a window with horizontal blinds half lowered: a square frame, five slats at the top, a pull cord with a small weight at the bottom' },
    { id: 'icon_name_badge', alt: 'A name badge on a lanyard', brief: 'a name badge on a lanyard: a rounded rectangle badge with a circle for a photo, two plain lines, and a V-shaped lanyard strap above' },
    { id: 'icon_poppy_seeds', alt: 'A small heap of poppy seeds', brief: 'a small heap of poppy seeds: a low mound of about twelve small dots, with a few single dots scattered around it' },
    { id: 'icon_do_not_invite', alt: 'A door with a prohibition sign', brief: 'a "do not invite" door sign: a door with a round knob, with a circle and a diagonal slash drawn over it in red' },
    { id: 'icon_moon_phase', alt: 'A waning gibbous moon', brief: 'a waning gibbous moon: one large circle outline, with its right three quarters filled lavender and its left quarter left dark, a curved line between the two parts, and two small amber four-point stars in the corners' },
    { id: 'icon_howl', alt: 'A howl as sound waves', brief: 'a howl: three curved sound-wave arcs growing outward from a small crescent moon, left to right' },
];

const SYSTEM = `You draw flat SVG icons for the Haunted Command Station, a paranormal incident dashboard.
Reply with one SVG and nothing else: no explanation, no markdown fence.

Rules:
- The root is <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="${PALETTE.violet}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"> and the file ends with </svg>.
- Flat line-art: simple shapes, 4 to 14 elements, nothing smaller than 3 units. No gradients, no filters, no shadows, no <text>, no <image>, no <style>, no scripts.
- Use only these colors: violet ${PALETTE.violet} for the main strokes, amber ${PALETTE.amber} or red ${PALETTE.red} for one accent, green ${PALETTE.green} only if the icon needs it, lavender ${PALETTE.lavender} or deep ${PALETTE.deep} for small fills.
- Keep the drawing inside x and y from 6 to 58, centered, readable at 24 pixels.
- Close every element. Use only <svg>, <g>, <path>, <circle>, <ellipse>, <rect>, <line>, <polyline>, <polygon>.

Format example, a clock. Draw the requested icon, not this:
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="${PALETTE.violet}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="32" cy="32" r="22"/><path d="M32 20v12l8 5" stroke="${PALETTE.amber}"/></svg>`;

const ALLOWED_TAGS = new Set(['svg', 'g', 'path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon']);
const ALLOWED_COLORS = new Set([...Object.values(PALETTE), 'none']);

// Returns why a drawing is rejected, or null when it is safe to commit.
function problem(svg: string): string | null {
    if (!svg.startsWith('<svg') || !svg.endsWith('</svg>')) return 'not a closed <svg>';
    if (Buffer.byteLength(svg) > MAX_BYTES) return 'too large';
    if (!/<svg[^>]*\sviewBox="0 0 64 64"/.test(svg)) return 'viewBox is not "0 0 64 64"';
    if (/<script|foreignObject|<!|<\?|<style|<text|<image|javascript:/i.test(svg)) return 'contains a forbidden element';
    if (/\son[a-z]+\s*=/i.test(svg)) return 'contains an event handler';
    if (/(xlink:)?href\s*=/i.test(svg)) return 'contains a link';
    if (/url\(/i.test(svg)) return 'contains url()';

    const stack: string[] = [];
    const tags = [...svg.matchAll(/<(\/?)([a-zA-Z][\w:-]*)([^>]*)>/g)];
    for (const [i, [, closing, name, attrs]] of tags.entries()) {
        if (!ALLOWED_TAGS.has(name)) return `contains <${name}>`;
        if (closing) {
            if (stack.pop() !== name) return `unbalanced </${name}>`;
        } else if (!attrs.endsWith('/')) {
            stack.push(name);
        }
        if (!stack.length && i < tags.length - 1) return 'content after the root';
    }
    if (stack.length) return `<${stack.at(-1)}> is not closed`;
    if (tags.filter((t) => t[2] === 'svg' && !t[1]).length !== 1) return 'more than one <svg>';

    for (const [, value] of svg.matchAll(/\s(?:fill|stroke)="([^"]*)"/g)) {
        if (!ALLOWED_COLORS.has(value.toLowerCase())) return `color ${value} is outside the palette`;
    }
    if (/#[0-9a-f]{3,8}\b/i.test(svg.replace(/\s(?:fill|stroke)="[^"]*"/gi, ''))) return 'color outside fill or stroke';
    return null;
}

interface Drawing {
    svg: string;
    // What went to Parasail and what came back, for the ledger. Holds no credentials.
    call: { request: unknown; response?: unknown; usage?: unknown; latency_ms: number; error?: string };
}

async function draw(brief: string, model: string): Promise<Drawing> {
    const request = {
        temperature: 0.6,
        messages: [
            { role: 'system', content: SYSTEM },
            { role: 'user', content: `Draw this icon: ${brief}.` },
        ],
    };
    const started = Date.now();
    const call: Drawing['call'] = { request, latency_ms: 0 };
    let svg = '';
    try {
        const key = process.env.PARASAIL_API_KEY?.trim();
        if (!key) throw new Error('PARASAIL_API_KEY is empty. Put it in .env.');
        const base = (process.env.PARASAIL_BASE_URL || 'https://api.parasail.io/v1').replace(/\/$/, '');
        const res = await fetch(`${base}/chat/completions`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, ...request }),
        });
        if (!res.ok) throw new Error(`Parasail answered ${res.status}: ${(await res.text()).slice(0, 300)}`);
        const body = await res.json();
        const text: string = body.choices?.[0]?.message?.content ?? '';
        call.response = { content: text, finish_reason: body.choices?.[0]?.finish_reason ?? null };
        call.usage = body.usage ?? null;
        const start = text.indexOf('<svg');
        // A reply cut off before </svg> has no end to find, so it fails the closed check below.
        const end = text.lastIndexOf('</svg>');
        svg = (start === -1 ? text : text.slice(start, end === -1 ? undefined : end + '</svg>'.length)).replace(/<!--[\s\S]*?-->/g, '').trim();
    } catch (error) {
        call.error = (error as Error).message;
    }
    call.latency_ms = Date.now() - started;
    return { svg, call };
}

function record(purpose: string, model: string, attempt: number, call: Drawing['call'], rejected: string | null): void {
    const { request, response, usage, latency_ms, error } = call;
    const entry = { ts: new Date().toISOString(), source: 'icons', purpose, attempt, model, request, response, usage, latency_ms, error: error ?? (rejected ? `rejected: ${rejected}` : undefined) };
    mkdirSync(dirname(LEDGER), { recursive: true });
    appendFileSync(LEDGER, `${JSON.stringify(entry)}\n`);
}

interface Entry {
    file: string;
    kind: 'entity' | 'sector' | 'hero' | 'icon';
    alt: string;
    prompt: string;
    seed: number | null;
}

const { values: args } = parseArgs({
    options: { force: { type: 'string' }, list: { type: 'boolean', default: false }, model: { type: 'string', default: MODEL } },
});

if (existsSync(join(ROOT, '.env'))) process.loadEnvFile(join(ROOT, '.env'));

const manifest: Record<string, Entry> = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {};
const upToDate = (icon: Icon) => manifest[icon.id]?.prompt === icon.brief && existsSync(join(ICON_DIR, `${icon.id}.svg`));
const todo = ICONS.filter((icon) => (args.force ? icon.id.includes(args.force) : !upToDate(icon)));

if (!todo.length) {
    console.log('Every icon is up to date.');
    process.exit(0);
}
for (const icon of todo) console.log(`${args.list ? 'would draw' : 'drawing'} ${icon.id}: ${icon.brief}`);
if (args.list) process.exit(0);

mkdirSync(ICON_DIR, { recursive: true });
for (const icon of todo) {
    let svg: string | null = null;
    for (let attempt = 1; attempt <= TRIES && !svg; attempt++) {
        const { svg: candidate, call } = await draw(icon.brief, args.model);
        const why = candidate ? problem(candidate) : (call.error ?? 'no SVG came back');
        record(`icon: ${icon.id.replace(/^icon_/, '').replaceAll('_', ' ')}`, args.model, attempt, call, call.error ? null : why);
        console.log(`  try ${attempt}: ${why ? `rejected, ${why}` : 'accepted'} (${(call.latency_ms / 1000).toFixed(1)} s)`);
        if (!why) svg = candidate;
    }
    if (!svg) {
        console.log(`  ${icon.id}: no acceptable drawing after ${TRIES} tries, skipped`);
        continue;
    }
    const file = join(ICON_DIR, `${icon.id}.svg`);
    writeFileSync(file, `${svg}\n`);
    manifest[icon.id] = { file: relative(ROOT, file), kind: 'icon', alt: icon.alt, prompt: icon.brief, seed: null };
    writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 4)}\n`); // after every icon, so a failure keeps the rest
}
