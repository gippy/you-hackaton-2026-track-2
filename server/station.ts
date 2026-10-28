// The station: runs the pipeline worker, streams its events to every page over the WebSocket,
// saves each good run, replays the last one when offline or when a live run fails, and dispatches.
//
// A page that connects mid-run gets the messages so far, then the rest live, each exactly once:
// Node runs this on one thread, so the replay and the subscription happen in the same tick.
import { spawn } from 'node:child_process';
import { createWriteStream, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';

import type { WebSocket, WebSocketServer } from 'ws';

import library from '../shared/library.json' with { type: 'json' };
import type { ClientMessage, FixtureIncident, FlowEvent, Library, RunState, Scenario, ServerMessage } from '../shared/protocol.ts';
import { alertText, channelId, send } from './dispatch.ts';
import { OneError } from './one.ts';
import { Pager } from './pager.ts';
import { skyFor, today } from './sky.ts';
import { SkyWarnings } from './skywarn.ts';
import { speak } from './speech.ts';

const REPLAY_GAP_MS = 350; // longest pause between replayed messages
const SAFE_ID = /^[\w.-]{1,80}$/; // incident ids that are safe as file names

export interface SavedRun {
    saved_at: string;
    state: RunState;
    events: { t: number; msg: FlowEvent }[];
}

export interface StationOptions {
    root: string;
    python: string;
    offline: boolean;
    liveDispatch: boolean;
    livePage: boolean;
    skyWarnings: 'scenario' | 'live' | 'off';
    liveSkyWarnings: boolean;
    incidents: FixtureIncident[];
    scenarios: Scenario[];
}

type WorkerLine = FlowEvent | { type: 'result'; state: RunState } | { type: 'fatal'; detail: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class Station {
    private clients = new Set<WebSocket>();
    private history: ServerMessage[] = [];
    run: SavedRun | null = null;
    private busy = false;
    private readonly opts: StationOptions;
    private readonly outDir: string;
    private readonly pager: Pager;
    private readonly warnings: SkyWarnings;

    constructor(opts: StationOptions) {
        this.opts = opts;
        this.outDir = join(opts.root, 'out');
        this.pager = new Pager((pages) => this.broadcastOnly({ type: 'pages', pages }));
        const warnMode = opts.offline ? 'offline' : opts.liveSkyWarnings ? 'live' : 'dry-run';
        this.warnings = new SkyWarnings(warnMode, (warnings) => this.broadcastOnly({ type: 'sky_warnings', warnings }));
        if (opts.skyWarnings === 'live' && !opts.offline) {
            // Real time: recompute the sky each minute (cached after the first fetch) and move the countdowns.
            const tick = async () => void this.warnings.tick(await skyFor(today(), '', this.outDir, false), new Date(), this.run?.state.manifest);
            void tick();
            setInterval(tick, 60_000).unref();
        }
    }

    private hello(): ServerMessage {
        return {
            type: 'hello',
            mode: this.opts.offline ? 'offline' : 'live',
            live_dispatch: this.opts.liveDispatch && !this.opts.offline,
            live_page: this.opts.livePage && !this.opts.offline,
            library: library as unknown as Library,
            channel: channelId(),
            incidents: this.opts.incidents,
            scenarios: this.opts.scenarios,
        };
    }

    attach(wss: WebSocketServer): void {
        wss.on('connection', (ws) => {
            const status: ServerMessage[] = [{ type: 'pages', pages: this.pager.list() }, { type: 'sky_warnings', warnings: this.warnings.list() }];
            for (const msg of [this.hello(), ...this.history, ...status]) ws.send(JSON.stringify(msg));
            this.clients.add(ws);
            ws.on('close', () => this.clients.delete(ws));
            ws.on('message', (data) => {
                let msg: ClientMessage;
                try {
                    msg = JSON.parse(String(data));
                } catch {
                    return;
                }
                if (msg.type === 'compile' && msg.incident_id) void this.compileIncident(String(msg.incident_id));
                else if (msg.type === 'compile') void this.compile(String(msg.raw ?? '').slice(0, 4000), '', '');
                else if (msg.type === 'dispatch') void this.dispatch(ws, msg);
                else if (msg.type === 'resolve_page') {
                    const page = this.pager.list().find((p) => p.key === msg.key);
                    if (page) void this.pager.resolve(page);
                }
            });
        });
    }

    private emit(msg: ServerMessage): void {
        this.history.push(msg);
        const frame = JSON.stringify(msg);
        for (const ws of this.clients) ws.send(frame);
    }

    private broadcastOnly(msg: ServerMessage): void {
        const frame = JSON.stringify(msg);
        for (const ws of this.clients) ws.send(frame);
    }

    // --- runs ---------------------------------------------------------------------------

    /** Build the station for a fixture incident, by id. Returns false when no fixture has that id. */
    compileIncident(incidentId: string): boolean {
        const incident = [...this.opts.scenarios.flatMap((s) => s.steps), ...this.opts.incidents].find((i) => i.incident_id === incidentId);
        if (!incident) return false;
        void this.compile(incident.raw_incident_stream, incident.incident_id, incident.severity_tier, incident.time ?? '');
        return true;
    }

    /** Run the pipeline on a report. `clock` is a scenario step's "HH:MM": the step then gets a sky. */
    async compile(raw: string, incidentId: string, severityTier: string, clock = ''): Promise<void> {
        if (!raw.trim()) return;
        if (this.busy) {
            this.broadcastOnly({ type: 'error', detail: 'A run is already in progress.' });
            return;
        }
        this.busy = true;
        try {
            if (this.opts.offline) {
                await this.replay('Offline mode: the pipeline is off, so this is a saved run.', incidentId);
                return;
            }
            this.history = [];
            this.emit({ type: 'run_begin', incident_id: incidentId, source: 'live' });
            const events: SavedRun['events'] = [];
            const t0 = Date.now();
            const record = (msg: FlowEvent) => {
                events.push({ t: (Date.now() - t0) / 1000, msg });
                this.emit(msg);
            };
            const sky = clock ? await skyFor(today(), clock, this.outDir, false) : undefined;
            if (sky) record({ type: 'sky', sky });
            let state: RunState;
            try {
                state = await this.runWorker({ raw, incident_id: incidentId, severity_tier: severityTier, sky }, record);
            } catch (err) {
                const detail = (err as Error).message;
                console.error(`Pipeline failed: ${detail}`);
                this.emit({ type: 'error', detail: `Pipeline failed: ${detail.slice(0, 300)}` });
                await this.replay('The live pipeline failed, so this is a saved run.', incidentId);
                return;
            }
            const saved_at = `${new Date().toISOString().slice(0, 19)}Z`;
            this.run = { saved_at, state, events };
            this.save(this.run);
            this.emit({ type: 'run_end', manifest: state.manifest, notes: state.notes, models: state.models, saved_at, source: 'live' });
            console.log(`Station built: ${state.manifest.components.map((c) => c.type).join(', ')}`);
            // A scenario step moves the scenario clock, and with it the sky warnings' countdowns.
            if (sky?.clock_at && this.opts.skyWarnings === 'scenario') void this.warnings.tick(sky, new Date(sky.clock_at), state.manifest);
            // The model says watch, not act: the station stands down, so open pages are resolved.
            if (state.manifest.recommended_action === 'observe') void this.pager.resolveAll();
        } finally {
            this.busy = false;
        }
    }

    /** Spawn `python -m pipeline`, feed it the incident, and forward its events as they arrive. */
    private runWorker(input: object, onEvent: (msg: FlowEvent) => void): Promise<RunState> {
        mkdirSync(this.outDir, { recursive: true });
        const log = createWriteStream(join(this.outDir, 'pipeline.log'));
        const child = spawn(this.opts.python, ['-m', 'pipeline'], { cwd: this.opts.root, stdio: ['pipe', 'pipe', 'pipe'] });
        child.stderr.pipe(log);
        child.stdin.end(JSON.stringify(input));
        return new Promise((resolve, reject) => {
            let state: RunState | null = null;
            let fatal = '';
            createInterface({ input: child.stdout }).on('line', (line) => {
                let msg: WorkerLine;
                try {
                    msg = JSON.parse(line);
                } catch {
                    return;
                }
                if (msg.type === 'result') state = msg.state;
                else if (msg.type === 'fatal') fatal = msg.detail;
                else onEvent(msg);
            });
            child.on('error', (err) => reject(new Error(`could not start ${this.opts.python}: ${err.message}`)));
            child.on('close', (code) => {
                if (state) resolve(state);
                else reject(new Error(fatal || `the pipeline exited with code ${code}; see out/pipeline.log`));
            });
        });
    }

    /** Save a run as the last one, and as its incident's own run, so offline mode can replay any step. */
    private save(run: SavedRun): void {
        const paths = [join(this.outDir, 'last_run.json')];
        if (SAFE_ID.test(run.state.incident_id)) {
            mkdirSync(join(this.outDir, 'runs'), { recursive: true });
            paths.push(join(this.outDir, 'runs', `${run.state.incident_id}.json`));
        }
        for (const path of paths) {
            writeFileSync(`${path}.tmp`, JSON.stringify(run, null, 2));
            renameSync(`${path}.tmp`, path);
        }
    }

    /**
     * A saved run: this incident's own (out/runs, then snapshots/), else the last good run, else the
     * newest snapshot committed with the repo.
     */
    loadSaved(incidentId = ''): SavedRun | null {
        const snapshots = join(this.opts.root, 'snapshots');
        const committed = existsSync(snapshots)
            ? readdirSync(snapshots)
                  .filter((f) => f.endsWith('.json'))
                  .map((f) => join(snapshots, f))
                  .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
            : [];
        const own = SAFE_ID.test(incidentId) ? [join(this.outDir, 'runs', `${incidentId}.json`), join(snapshots, `${incidentId}.json`)] : [];
        for (const path of [...own, join(this.outDir, 'last_run.json'), ...committed]) {
            try {
                return JSON.parse(readFileSync(path, 'utf8')) as SavedRun;
            } catch {
                continue;
            }
        }
        return null;
    }

    /** Stream a saved run through the same messages, so the page builds the same way offline. */
    async replay(reason: string, incidentId = ''): Promise<void> {
        const saved = this.loadSaved(incidentId);
        if (!saved) {
            this.emit({ type: 'error', detail: 'No saved run to show. Run once online first.' });
            return;
        }
        this.history = [];
        this.run = saved;
        const { state } = saved;
        const other = incidentId && state.incident_id !== incidentId ? ` No run of ${incidentId} is saved, so this is ${state.incident_id || 'another incident'}.` : '';
        this.emit({ type: 'run_begin', incident_id: state.incident_id, source: 'snapshot', detail: `${reason}${other} Saved ${saved.saved_at}.` });
        let last = 0;
        for (const { t, msg } of saved.events) {
            await sleep(Math.min(Math.max((t - last) * 1000, 0), REPLAY_GAP_MS));
            last = t;
            this.emit(msg);
        }
        this.emit({ type: 'run_end', manifest: state.manifest, notes: state.notes, models: state.models, saved_at: saved.saved_at, source: 'snapshot' });
    }

    // --- dispatch -------------------------------------------------------------------------

    private async dispatch(ws: WebSocket, msg: Extract<ClientMessage, { type: 'dispatch' }>): Promise<void> {
        if (!this.run) {
            ws.send(JSON.stringify({ type: 'error', detail: 'Nothing to dispatch yet.' } satisfies ServerMessage));
            return;
        }
        const action = library.actions.includes(msg.action) ? msg.action : 'contain';
        const mode = this.opts.offline ? 'offline' : msg.live && this.opts.liveDispatch ? 'live' : 'dry-run';
        const text = alertText(this.run.state, {
            action,
            countermeasure: typeof msg.countermeasure === 'string' ? msg.countermeasure : null,
            sealed: Array.isArray(msg.sealed) ? msg.sealed.map(String) : [],
            extracted: Number(msg.extracted) || 0,
        });
        // Offline, the page plays its committed effects and skips the speech quietly.
        if (mode !== 'offline') void this.speakDispatch(text);
        const paging = mode === 'offline' ? 'Offline: no page.' : this.pageIfCritical(this.run.state, action, text, Boolean(msg.live_page));
        let result: ServerMessage;
        try {
            result = { type: 'dispatch', text, paging, ...(await send(text, mode)) };
        } catch (err) {
            const detail = err instanceof OneError ? err.message : String(err);
            result = { type: 'dispatch', mode, text, paging, error: detail.slice(0, 800) };
        }
        console.log(`\nDispatch (${result.mode}) to #loft-incident:\n${JSON.stringify(result, null, 2)}\n`);
        this.broadcastOnly(result);
    }

    /** Page the on-call for a dispatch the model marked critical. Returns what the page shows about it. */
    private pageIfCritical(state: RunState, action: string, text: string, livePage: boolean): string {
        const banner = state.manifest.components.find((c) => c.type === 'ThreatBanner');
        const critical = ['critical', 'catastrophic'].includes(banner?.type === 'ThreatBanner' ? banner.props.severity : state.incident.severity);
        if (action === 'observe' || !critical) return 'No page: the model did not mark this critical.';
        const live = livePage && this.opts.livePage;
        const sector = (library.sectors as Record<string, string>)[state.incident.sector] ?? state.incident.sector;
        void this.pager.open(
            {
                key: state.incident_id || `pasted-${Date.now()}`,
                title: `[SIMULATED] ${state.incident.entity} in ${sector}: ${action}`.slice(0, 250),
                details: `${text}\n\nSimulated incident from the Haunted Command Station (hackathon demo). Nothing here is real.`,
                urgency: action === 'evacuate' ? 'high' : 'low',
            },
            live,
        );
        return live ? 'Paging the on-call through PagerDuty.' : 'Page prepared as a dry run (PagerDuty not called).';
    }

    /** Voice the alert in the background; the page plays it when it is ready. A failure is only logged. */
    private async speakDispatch(text: string): Promise<void> {
        try {
            const file = await speak(text, join(this.outDir, 'speech'));
            this.broadcastOnly({ type: 'speech', url: `speech/${file}` });
        } catch (err) {
            console.warn(`Spoken dispatch skipped: ${(err as Error).message}`);
        }
    }
}
