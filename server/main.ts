// Haunted Command Station: a raw incident report in, an operable command station out.
//
//     pnpm start                     build the page, then build the station from the fixture, live
//     pnpm start --offline           no network or keys: replay the last saved run (and no expert can be paged)
//     pnpm start --incident <id>     start from another incident in fixtures/ (default: Nightfall step 20)
//     PAGING=off pnpm start          the "Call expert" buttons page nobody (for tests and the eval)
//
// Serves the Vite build of web/ and the /ws stream on one port (default http://127.0.0.1:8666).
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { WebSocketServer } from 'ws';

import type { ArtAsset, FixtureIncident, Floor, Scenario } from '../shared/protocol.ts';
import { SPEECH_FILE } from './speech.ts';
import { Station } from './station.ts';

const ROOT = resolve(import.meta.dirname, '..');
const DIST = join(ROOT, 'web', 'dist');
const FIXTURES = join(ROOT, 'fixtures');
const OFFICIAL = 'haunted-dashboard.json';
const ART = join(ROOT, 'art', 'station'); // the only part of art/ the page may load
const MAP = join(ROOT, 'data', 'map');
const SPEECH = join(ROOT, 'out', 'speech');
// The demo opens on Nightfall step 20, a real threat with a decision to make (step 1 is a costume).
const DEMO_INCIDENT = 'sim-nightfall-20';
const TYPES: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.json': 'application/json',
    '.mp3': 'audio/mpeg',
    '.webp': 'image/webp',
};

const { values: args } = parseArgs({
    options: {
        offline: { type: 'boolean', default: false },
        incident: { type: 'string' },
        // Apify Standby sets ACTOR_WEB_SERVER_PORT; the server then listens on every interface.
        host: { type: 'string', default: process.env.HOST ?? (process.env.ACTOR_WEB_SERVER_PORT ? '0.0.0.0' : '127.0.0.1') },
        port: { type: 'string', default: process.env.ACTOR_WEB_SERVER_PORT ?? process.env.PORT ?? '8666' },
        'no-browser': { type: 'boolean', default: false },
    },
});

if (existsSync(join(ROOT, '.env'))) process.loadEnvFile(join(ROOT, '.env'));

// --- fixtures, art and the map ----------------------------------------------------------

const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8'));

/** The incidents in a fixture file. Scenario steps also carry their scenario, step and clock time. */
function readTicks(path: string, scenario?: string): FixtureIncident[] {
    return readJson<{ ticks: FixtureIncident[] }>(path).ticks.map((tick) => ({
        incident_id: tick.incident_id,
        severity_tier: tick.severity_tier,
        raw_incident_stream: tick.raw_incident_stream,
        source: tick.source === 'simulated' ? 'simulated' : 'official',
        ...(scenario ? { scenario, step: tick.step, time: tick.time } : {}),
    }));
}

/** Single incidents: every fixtures/*.json, the official fixture first. */
function loadIncidents(): FixtureIncident[] {
    return readdirSync(FIXTURES)
        .filter((f) => f.endsWith('.json'))
        .sort((a, b) => Number(b === OFFICIAL) - Number(a === OFFICIAL) || a.localeCompare(b))
        .flatMap((file) => readTicks(join(FIXTURES, file)));
}

/** Scenarios: every fixtures/<id>/scenario.json, played step by step. Other files there (answer keys) are not read. */
function loadScenarios(): Scenario[] {
    return readdirSync(FIXTURES, { withFileTypes: true })
        .filter((d) => d.isDirectory() && existsSync(join(FIXTURES, d.name, 'scenario.json')))
        .map((d) => {
            const path = join(FIXTURES, d.name, 'scenario.json');
            const { title, sky } = readJson<{ title?: string; sky?: boolean }>(path);
            return { id: d.name, title: title ?? d.name[0].toUpperCase() + d.name.slice(1), sky: sky === true, steps: readTicks(path, d.name) };
        })
        .sort((a, b) => Number(b.id === 'nightfall') - Number(a.id === 'nightfall') || a.title.localeCompare(b.title)); // the demo scenario first
}

/** The art library's entries the page needs: file, kind, alt text and a content hash. Empty when there is no art. */
function loadArt(): Record<string, ArtAsset> {
    const path = join(ART, 'manifest.json');
    if (!existsSync(path)) return {};
    const version = (file: string) => (existsSync(join(ROOT, file)) ? createHash('sha1').update(readFileSync(join(ROOT, file))).digest('hex').slice(0, 8) : undefined);
    return Object.fromEntries(Object.entries(readJson<Record<string, ArtAsset>>(path)).map(([id, a]) => [id, { file: a.file, kind: a.kind, alt: a.alt, v: version(a.file) }]));
}

// --- HTTP -------------------------------------------------------------------------------

function sendFile(res: ServerResponse, file: string, type: string, cache: string): void {
    res.writeHead(200, { 'content-type': type, 'cache-control': cache });
    res.end(readFileSync(file));
}

/** The file under `dir` for a URL path, or null when it is outside `dir`, missing or of a type not served. */
function fileIn(dir: string, urlPath: string): string | null {
    const file = normalize(join(dir, urlPath));
    return file.startsWith(`${dir}/`) && existsSync(file) && TYPES[extname(file)] ? file : null;
}

/**
 * - /manifest.json: the current run's state
 * - /speech/<hash>.mp3: a spoken call from out/speech/
 * - /data/map/area.geojson: the venue's map
 * - /art/station/...: the art the page shows
 * - everything else: the built page in web/dist/
 */
function handle(req: IncomingMessage, res: ServerResponse): void {
    const path = (req.url ?? '/').split('?')[0];
    if (path === '/manifest.json') {
        res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
        res.end(JSON.stringify(station.run?.state ?? {}, null, 2));
        return;
    }
    const speech = path.match(/^\/speech\/([^/]+)$/)?.[1];
    if (speech && SPEECH_FILE.test(speech) && existsSync(join(SPEECH, speech))) {
        return sendFile(res, join(SPEECH, speech), 'audio/mpeg', 'max-age=31536000, immutable');
    }
    if (path === '/data/map/area.geojson' && existsSync(join(MAP, 'area.geojson'))) {
        return sendFile(res, join(MAP, 'area.geojson'), 'application/geo+json', 'max-age=3600');
    }
    if (path.startsWith('/art/station/')) {
        const art = fileIn(ART, path.slice('/art/station'.length));
        if (art && extname(art) !== '.json') return sendFile(res, art, TYPES[extname(art)], 'max-age=3600');
    }
    const file = fileIn(DIST, path === '/' ? 'index.html' : path);
    if (!file) {
        res.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
        return;
    }
    sendFile(res, file, TYPES[extname(file)], 'no-store');
}

// --- start ------------------------------------------------------------------------------

/** The One CLI refuses Node older than 22.23.4, 24.22.1 or 26.12.1, so say so at start, not at dispatch time. */
function checkNode(): void {
    const [major, minor] = process.versions.node.split('.').map(Number);
    const ok = (major === 22 && minor >= 23) || (major === 24 && minor >= 22) || major >= 26;
    if (!ok) console.warn(`warning: Node ${process.version}; the One CLI needs 22.23.4+, 24.22.1+ or 26.12.1+, so calling an expert will fail`);
}

function openBrowser(url: string): void {
    const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer' : 'xdg-open';
    execFile(cmd, [url], () => {});
}

if (!existsSync(join(DIST, 'index.html'))) {
    console.error('The page is not built yet. Run `pnpm start` (it builds first) or `pnpm build`.');
    process.exit(1);
}

const incidents = loadIncidents();
const scenarios = loadScenarios();
const known = [...scenarios.flatMap((s) => s.steps), ...incidents];
const firstIncident = args.incident ?? (known.some((i) => i.incident_id === DEMO_INCIDENT) ? DEMO_INCIDENT : known[0].incident_id);
if (!known.some((i) => i.incident_id === firstIncident)) {
    console.error(`No incident with id ${firstIncident}. Known ids: ${known.map((i) => i.incident_id).join(', ')}`);
    process.exit(1);
}

const station = new Station({
    root: ROOT,
    python: process.env.PYTHON ?? join(ROOT, '.venv', 'bin', 'python'),
    offline: args.offline,
    incidents,
    scenarios,
    art: loadArt,
    floor: existsSync(join(MAP, 'floor.json')) ? readJson<Floor>(join(MAP, 'floor.json')) : null,
});

const server = createServer(handle);
// Registered before the WebSocket server's own listener, which would rethrow the error.
server.on('error', (err: NodeJS.ErrnoException) => {
    console.error(err.code === 'EADDRINUSE' ? `Port ${args.port} is in use. Pick another: pnpm start --port 8667` : err.message);
    process.exit(1);
});
station.attach(new WebSocketServer({ server, path: '/ws', maxPayload: 1 << 20 }));

const url = `http://${args.host}:${args.port}`;
server.listen(Number(args.port), args.host, () => {
    const mode = args.offline ? 'OFFLINE (replaying the last saved run)' : 'live';
    const paging = args.offline ? 'off (offline)' : station.pager.enabled ? 'on (PagerDuty)' : 'off (PAGING=off)';
    console.log(`Haunted Command Station on ${url}  mode: ${mode}  paging: ${paging}`);
    if (!args.offline) checkNode();
    if (!args['no-browser']) openBrowser(url);
    station.compileIncident(firstIncident);
});
