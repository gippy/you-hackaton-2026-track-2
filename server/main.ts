// Haunted Command Station: a raw incident report in, an operable command station out.
//
//     pnpm start                     build the page, then build the station from the fixture, live
//     pnpm start --offline           no network or keys: replay the last saved run
//     pnpm start --live-dispatch     let the page's dispatch button really post to #loft-incident
//
// Serves the Vite build of web/ and the /ws stream on one port (default http://127.0.0.1:8666).
import { execFile } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { WebSocketServer } from 'ws';

import { Station } from './station.ts';

const ROOT = resolve(import.meta.dirname, '..');
const DIST = join(ROOT, 'web', 'dist');
const TYPES: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.svg': 'image/svg+xml',
    '.json': 'application/json',
};

const { values: args } = parseArgs({
    options: {
        offline: { type: 'boolean', default: false },
        'live-dispatch': { type: 'boolean', default: false },
        fixture: { type: 'string', default: join(ROOT, 'fixtures', 'haunted-dashboard.json') },
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

const python = process.env.PYTHON ?? join(ROOT, '.venv', 'bin', 'python');
const station = new Station({ root: ROOT, python, offline: args.offline, liveDispatch: args['live-dispatch'] });

const server = createServer((req, res) => {
    const path = (req.url ?? '/').split('?')[0];
    if (path === '/manifest.json') {
        res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
        res.end(JSON.stringify(station.run?.state ?? {}, null, 2));
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
    const tick = JSON.parse(readFileSync(args.fixture, 'utf8')).ticks[0];
    void station.compile(tick.raw_incident_stream, tick.incident_id ?? '', tick.severity_tier ?? '');
});
