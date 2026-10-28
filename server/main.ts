// Haunted Command Station: a raw incident report in, an operable command station out.
//
//     pnpm start                     build the page, then build the station from the fixture, live
//     pnpm start --offline           no network or keys: replay the last saved run
//     pnpm start --live-dispatch     let the page's dispatch button really post to #loft-incident
//     pnpm start --incident <id>     start from another incident in fixtures/ (default: the official one)
//
// Serves the Vite build of web/ and the /ws stream on one port (default http://127.0.0.1:8666).
import { execFile } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { WebSocketServer } from 'ws';

import type { FixtureIncident } from '../shared/protocol.ts';
import { SPEECH_FILE } from './speech.ts';
import { Station } from './station.ts';

const ROOT = resolve(import.meta.dirname, '..');
const DIST = join(ROOT, 'web', 'dist');
const FIXTURES = join(ROOT, 'fixtures');
const OFFICIAL = 'haunted-dashboard.json';
const TYPES: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.svg': 'image/svg+xml',
    '.json': 'application/json',
    '.mp3': 'audio/mpeg',
};

const { values: args } = parseArgs({
    options: {
        offline: { type: 'boolean', default: false },
        'live-dispatch': { type: 'boolean', default: false },
        incident: { type: 'string' },
        host: { type: 'string', default: process.env.HOST ?? '127.0.0.1' },
        port: { type: 'string', default: process.env.PORT ?? '8666' },
        'no-browser': { type: 'boolean', default: false },
    },
});

if (existsSync(join(ROOT, '.env'))) process.loadEnvFile(join(ROOT, '.env'));

/** The One CLI refuses Node older than 22.23.4, 24.22.1 or 26.12.1, so say so at start, not at dispatch time. */
function checkNode(): void {
    const [major, minor] = process.versions.node.split('.').map(Number);
    const ok = (major === 22 && minor >= 23) || (major === 24 && minor >= 22) || major >= 26;
    if (!ok) console.warn(`warning: Node ${process.version}; the One CLI needs 22.23.4+, 24.22.1+ or 26.12.1+, so dispatch will fail`);
}

function openBrowser(url: string): void {
    const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer' : 'xdg-open';
    execFile(cmd, [url], () => {});
}

if (!existsSync(join(DIST, 'index.html'))) {
    console.error('The page is not built yet. Run `pnpm start` (it builds first) or `pnpm build`.');
    process.exit(1);
}

/** Every incident in fixtures/*.json, the official fixture first. */
function loadIncidents(): FixtureIncident[] {
    const files = readdirSync(FIXTURES)
        .filter((f) => f.endsWith('.json'))
        .sort((a, b) => Number(b === OFFICIAL) - Number(a === OFFICIAL) || a.localeCompare(b));
    return files.flatMap((file) =>
        (JSON.parse(readFileSync(join(FIXTURES, file), 'utf8')).ticks as FixtureIncident[]).map((tick) => ({
            incident_id: tick.incident_id,
            severity_tier: tick.severity_tier,
            raw_incident_stream: tick.raw_incident_stream,
            source: tick.source === 'simulated' ? 'simulated' : 'official',
        })),
    );
}

const incidents = loadIncidents();
const firstIncident = args.incident ?? incidents[0].incident_id;
if (!incidents.some((i) => i.incident_id === firstIncident)) {
    console.error(`No incident with id ${firstIncident}. Known ids: ${incidents.map((i) => i.incident_id).join(', ')}`);
    process.exit(1);
}

const python = process.env.PYTHON ?? join(ROOT, '.venv', 'bin', 'python');
const station = new Station({ root: ROOT, python, offline: args.offline, liveDispatch: args['live-dispatch'], incidents });

const server = createServer((req, res) => {
    const path = (req.url ?? '/').split('?')[0];
    if (path === '/manifest.json') {
        res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
        res.end(JSON.stringify(station.run?.state ?? {}, null, 2));
        return;
    }
    const speech = path.match(/^\/speech\/([^/]+)$/)?.[1];
    if (speech && SPEECH_FILE.test(speech) && existsSync(join(ROOT, 'out', 'speech', speech))) {
        res.writeHead(200, { 'content-type': 'audio/mpeg', 'cache-control': 'max-age=31536000, immutable' });
        res.end(readFileSync(join(ROOT, 'out', 'speech', speech)));
        return;
    }
    const file = normalize(join(DIST, path === '/' ? 'index.html' : path));
    if (!file.startsWith(DIST) || !existsSync(file) || !TYPES[extname(file)]) {
        res.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
        return;
    }
    res.writeHead(200, { 'content-type': TYPES[extname(file)], 'cache-control': 'no-store' });
    res.end(readFileSync(file));
});
// Registered before the WebSocket server's own listener, which would rethrow the error.
server.on('error', (err: NodeJS.ErrnoException) => {
    console.error(err.code === 'EADDRINUSE' ? `Port ${args.port} is in use. Pick another: pnpm start --port 8667` : err.message);
    process.exit(1);
});
station.attach(new WebSocketServer({ server, path: '/ws', maxPayload: 1 << 20 }));

const url = `http://${args.host}:${args.port}`;
server.listen(Number(args.port), args.host, () => {
    const mode = args.offline ? 'OFFLINE (replaying the last saved run)' : 'live';
    console.log(`Haunted Command Station on ${url}  mode: ${mode}  dispatch: ${args['live-dispatch'] ? 'LIVE' : 'dry run'}`);
    if (!args.offline) checkNode();
    if (!args['no-browser']) openBrowser(url);
    station.compileIncident(firstIncident);
});
