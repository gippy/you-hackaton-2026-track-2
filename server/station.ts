// The station: runs the pipeline worker, streams its events to every page over the WebSocket,
// saves each good run, replays the last one when offline or when a live run fails, and calls experts.
//
// A page that connects mid-run gets the messages so far, then the rest live, each exactly once:
// Node runs this on one thread, so the replay and the subscription happen in the same tick.
import { spawn } from 'node:child_process';
import { createWriteStream, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';

import type { RawData, WebSocket, WebSocketServer } from 'ws';

import library from '../shared/library.json' with { type: 'json' };
import type { ArtAsset, ClientMessage, Expert, Finding, FixtureIncident, Floor, FlowEvent, Library, OperatorMoves, RunState, Scenario, ServerMessage } from '../shared/protocol.ts';
import { Pager, pageRequest } from './pager.ts';
import { skyFor } from './sky.ts';
import { speak } from './speech.ts';

const REPLAY_GAP_MS = 350; // longest pause between replayed messages
const SAFE_ID = /^[\w.-]{1,80}$/; // incident ids that are safe as file names
const WORKER_TIMEOUT_MS = 90_000; // a normal run takes 10 to 25 seconds

/** A finished run as saved in out/: the worker's final state and every event with its time in seconds. */
interface SavedRun {
    saved_at: string;
    state: RunState;
    events: { t: number; msg: FlowEvent }[];
}

interface StationOptions {
    root: string;
    python: string;
    offline: boolean;
    incidents: FixtureIncident[];
    scenarios: Scenario[];
    /** Read for every new connection, so re-rendered art shows up without a restart. */
    art: () => Record<string, ArtAsset>;
    floor: Floor | null;
}

/** What a run is built from. A pasted report has an empty id and tier; a scenario step also has its clock time. */
type Report = Pick<FixtureIncident, 'raw_incident_stream' | 'incident_id' | 'severity_tier' | 'time' | 'scenario'>;

/** One line the worker prints on stdout. */
type WorkerLine = FlowEvent | { type: 'result'; state: RunState } | { type: 'fatal'; detail: string };

/** When a run was saved, in the venue's time ("6:42 PM"), for the replay notice. */
const savedAt = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', minute: '2-digit' });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class Station {
    private clients = new Set<WebSocket>();
    /** Every message of the current run, for pages that connect mid-run. */
    private history: ServerMessage[] = [];
    run: SavedRun | null = null;
    private busy = false;
    private readonly opts: StationOptions;
    private readonly outDir: string;
    readonly pager: Pager;

    constructor(opts: StationOptions) {
        this.opts = opts;
        this.outDir = join(opts.root, 'out');
        this.pager = new Pager((pages) => this.broadcast({ type: 'pages', pages }));
    }

    // --- pages ----------------------------------------------------------------------------

    attach(wss: WebSocketServer): void {
        wss.on('connection', (ws) => {
            const status: ServerMessage[] = [{ type: 'pages', pages: this.pager.list() }, { type: 'synced' }];
            for (const msg of [this.hello(), ...this.history, ...status]) ws.send(JSON.stringify(msg));
            this.clients.add(ws);
            ws.on('close', () => this.clients.delete(ws));
            ws.on('message', (data) => this.onMessage(ws, data));
        });
    }

    private hello(): ServerMessage {
        return {
            type: 'hello',
            mode: this.opts.offline ? 'offline' : 'live',
            library: library as unknown as Library,
            incidents: this.opts.incidents,
            scenarios: this.opts.scenarios,
            art: this.opts.art(),
            floor: this.opts.floor,
        };
    }

    private onMessage(ws: WebSocket, data: RawData): void {
        let msg: ClientMessage;
        try {
            msg = JSON.parse(String(data));
        } catch {
            return;
        }
        if (msg.type === 'compile' && msg.incident_id) this.compileIncident(String(msg.incident_id), checkMoves(msg.moves));
        else if (msg.type === 'compile') void this.compile({ raw_incident_stream: String(msg.raw ?? '').slice(0, 4000), incident_id: '', severity_tier: '' });
        else if (msg.type === 'call_expert') this.callExpert(ws, msg);
        else if (msg.type === 'resolve_page') {
            const page = this.pager.list().find((p) => p.key === msg.key);
            if (page) void this.pager.resolve(page);
        }
    }

    /** Send to every page and keep it in the run's history, for pages that connect later. */
    private emit(msg: ServerMessage): void {
        this.history.push(msg);
        this.broadcast(msg);
    }

    /** Send to every page without keeping it in the run's history. */
    private broadcast(msg: ServerMessage): void {
        const frame = JSON.stringify(msg);
        for (const ws of this.clients) ws.send(frame);
    }

    // --- runs -----------------------------------------------------------------------------

    /** Build the station for a fixture incident, by id. Does nothing when no fixture has that id. */
    compileIncident(incidentId: string, moves?: OperatorMoves): void {
        const incident = [...this.opts.scenarios.flatMap((s) => s.steps), ...this.opts.incidents].find((i) => i.incident_id === incidentId);
        if (incident) void this.compile(incident, moves, this.earlier(incident));
    }

    /**
     * What this station's saved runs of the scenario's earlier steps found, oldest first. Later reports often
     * refer back ("the figures"), so the intake reads these. A step never run here adds nothing.
     */
    private earlier(step: FixtureIncident): Finding[] {
        const scenario = this.opts.scenarios.find((s) => s.id === step.scenario);
        if (!scenario || !step.step) return [];
        return scenario.steps
            .filter((s) => s.step! < step.step!)
            .flatMap((s) => {
                const saved = this.loadOwn(s.incident_id);
                const found = saved?.state.incident;
                if (!found) return [];
                const { sector, entity, entity_class, verdict, summary } = found;
                return [{ time: s.time ?? '', sector, entity, entity_class, verdict: verdict ?? null, summary }];
            });
    }

    /**
     * Run the pipeline on a report, one run at a time. Offline, replay a saved run instead.
     * `moves` are what the operator did on the step before, for the station to build on.
     */
    private async compile(report: Report, moves?: OperatorMoves, earlier: Finding[] = []): Promise<void> {
        if (!report.raw_incident_stream.trim()) return;
        if (this.busy) {
            this.broadcast({ type: 'error', detail: 'A run is already in progress.' });
            return;
        }
        this.busy = true;
        try {
            if (this.opts.offline) await this.replay('Offline mode: the pipeline is off, so this is a saved run.', report.incident_id);
            else await this.runLive(report, moves, earlier);
        } finally {
            this.busy = false;
        }
    }

    /**
     * A live run: stream the worker's events, then save the result. When the worker fails, replay a saved run.
     * A step of a scenario with a sky gets the sky at its clock time.
     */
    private async runLive({ raw_incident_stream: raw, incident_id: incidentId, severity_tier, time, scenario }: Report, moves?: OperatorMoves, earlier: Finding[] = []): Promise<void> {
        this.history = [];
        this.emit({ type: 'run_begin', incident_id: incidentId, source: 'live', requested: incidentId, moves, remembered: earlier.length });
        const events: SavedRun['events'] = [];
        const t0 = Date.now();
        const record = (msg: FlowEvent) => {
            events.push({ t: (Date.now() - t0) / 1000, msg });
            this.emit(msg);
        };
        // Only a scenario where the real sky matters gets one; elsewhere the sky clock and its advice would mislead.
        const sky = time && this.opts.scenarios.find((s) => s.id === scenario)?.sky ? await skyFor(time, this.outDir) : undefined;
        if (sky) record({ type: 'sky', sky });
        let state: RunState;
        try {
            state = await this.runWorker({ raw, incident_id: incidentId, severity_tier, sky, moves, earlier }, record);
        } catch (err) {
            const detail = (err as Error).message;
            console.error(`Pipeline failed: ${detail}`);
            this.emit({ type: 'error', detail: `Pipeline failed: ${detail.slice(0, 300)}` });
            await this.replay('The live pipeline failed, so this is a saved run.', incidentId);
            return;
        }
        this.run = { saved_at: `${new Date().toISOString().slice(0, 19)}Z`, state, events };
        this.save(this.run);
        this.endRun(this.run, 'live');
        console.log(`Station built: ${state.manifest.components.map((c) => c.type).join(', ')}`);
        // The model says watch, not act: the station stands down, so open pages are resolved.
        if (state.manifest.recommended_action === 'observe') void this.pager.resolveAll();
    }

    private endRun({ state, saved_at }: SavedRun, source: 'live' | 'snapshot'): void {
        this.emit({ type: 'run_end', manifest: state.manifest, notes: state.notes, models: state.models, saved_at, source });
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
            // A stalled run is killed, so the page falls back to the saved run instead of waiting forever.
            const timer = setTimeout(() => {
                fatal = `the pipeline took longer than ${WORKER_TIMEOUT_MS / 1000} seconds and was stopped`;
                child.kill();
            }, WORKER_TIMEOUT_MS);
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
                clearTimeout(timer);
                if (state) resolve(state);
                else reject(new Error(fatal || `the pipeline exited with code ${code}; see out/pipeline.log`));
            });
        });
    }

    // --- saved runs -----------------------------------------------------------------------

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
     * A saved run, from the first of these that reads:
     * - this incident's own run, in out/runs/ and then in snapshots/
     * - the last good run
     * - the newest snapshot committed with the repo
     */
    /** This incident's own saved run, from out/runs/ or snapshots/, or null. */
    private loadOwn(incidentId: string): SavedRun | null {
        if (!SAFE_ID.test(incidentId)) return null;
        for (const path of [join(this.outDir, 'runs', `${incidentId}.json`), join(this.opts.root, 'snapshots', `${incidentId}.json`)]) {
            try {
                return JSON.parse(readFileSync(path, 'utf8')) as SavedRun;
            } catch {
                continue;
            }
        }
        return null;
    }

    private loadSaved(incidentId: string): SavedRun | null {
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
    private async replay(reason: string, incidentId: string): Promise<void> {
        const saved = this.loadSaved(incidentId);
        if (!saved) {
            this.emit({ type: 'error', detail: 'No saved run to show. Run once online first.' });
            return;
        }
        this.history = [];
        this.run = saved;
        const { state } = saved;
        const other = incidentId && state.incident_id !== incidentId ? ` No run of ${incidentId} is saved, so this is ${state.incident_id || 'another incident'}.` : '';
        this.emit({ type: 'run_begin', incident_id: state.incident_id, source: 'snapshot', detail: `${reason}${other} Saved at ${savedAt(saved.saved_at)}.`, requested: incidentId });
        let last = 0;
        for (const { t, msg } of saved.events) {
            await sleep(Math.min(Math.max((t - last) * 1000, 0), REPLAY_GAP_MS));
            last = t;
            this.emit(msg);
        }
        this.endRun(saved, 'snapshot');
    }

    // --- calling an expert ----------------------------------------------------------------

    /** Page the vampire hunter or the ghostbuster about the station on screen, and say so aloud. */
    private callExpert(ws: WebSocket, msg: Extract<ClientMessage, { type: 'call_expert' }>): void {
        const tell = (detail: string) => ws.send(JSON.stringify({ type: 'error', detail } satisfies ServerMessage));
        const expert = msg.expert in library.experts ? msg.expert : null;
        if (!expert) return;
        if (this.opts.offline) return tell('Offline: no expert can be paged.');
        if (!this.run || this.busy) return tell('Wait for the station to finish building before calling an expert.');
        const wait = this.pager.cooldown(expert);
        if (wait) return tell(`The ${library.experts[expert].label.toLowerCase()} was just paged. Wait ${wait} seconds before paging again.`);
        const countermeasure = typeof msg.countermeasure === 'string' && msg.countermeasure in library.arsenal ? msg.countermeasure : null;
        void this.pager.open(pageRequest(this.run.state, expert, countermeasure));
        void this.speakCall(expert);
    }

    /** Voice the call in the background; the page plays the expert's sting, then the line. A failure is only logged. */
    private async speakCall(expert: Expert): Promise<void> {
        const { spoken, sting } = library.experts[expert];
        try {
            const file = await speak(spoken, join(this.outDir, 'speech'));
            this.broadcast({ type: 'speech', url: `speech/${file}`, cue: sting });
        } catch (err) {
            console.warn(`Spoken call skipped: ${(err as Error).message}`);
        }
    }
}

/** The operator's moves from a page, kept only where they name the library's countermeasures and sectors. */
function checkMoves(raw: unknown): OperatorMoves | undefined {
    if (!raw || typeof raw !== 'object') return undefined;
    const m = raw as Partial<OperatorMoves>;
    const count = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) && n >= 0 ? Math.min(Math.round(n), 100000) : null);
    return {
        step: String(m.step ?? '').slice(0, 80),
        time: String(m.time ?? '').slice(0, 5),
        countermeasure: typeof m.countermeasure === 'string' && m.countermeasure in library.arsenal ? m.countermeasure : null,
        sealed: Array.isArray(m.sealed) ? [...new Set(m.sealed.filter((id): id is string => typeof id === 'string' && id in library.sectors))] : [],
        people_out: count(m.people_out) ?? 0,
        people: count(m.people),
    };
}
