// The page: one WebSocket to the server, the station state its messages build (station.ts), and the page's
// layout: the top bar, the left rail, and the stage with the incident report, the station's panels and
// the expert calls.
import { useEffect, useReducer, useRef, useState } from 'react';

import type { ClientMessage, Incident, ServerMessage } from '../../shared/protocol.ts';
import { SoundBoard } from './audio.ts';
import { Card, IncidentHead, PanelBoundary, type Ctx } from './components.tsx';
import { EXPERTS, ExpertCalls, callExpert, isOpen, pageFor, pageStatus } from './experts.tsx';
import { FloorPlan } from './floorplan.tsx';
import { layout } from './layout.ts';
import { BuildProgress } from './progress.tsx';
import { Rail } from './rail.tsx';
import { ReportPanel, type CompileRequest } from './report.tsx';
import { findStep, initial, reduce, type Event, type State } from './station.ts';
import { TopBar } from './topbar.tsx';
import { artUrl, withToken } from './url.ts';

/**
 * The connection to the server, reconnecting 1.5 seconds after it drops. Every server message goes to the
 * SoundBoard and the reducer, marked `foreign` when another viewer of this shared station started its run.
 */
function useServer(send: (event: Event) => void, sound: SoundBoard) {
    const ws = useRef<WebSocket | null>(null);
    const requested = useRef<string | null>(null); // the incident id this tab last asked to compile ('' for a paste)
    const synced = useRef(false); // false while the server replays its history on connect: none of it is news

    useEffect(() => {
        let closed = false;
        let timer = 0;
        const connect = () => {
            const socket = new WebSocket(withToken(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`));
            socket.onopen = () => {
                synced.current = false;
                send({ type: 'connected', value: true });
            };
            socket.onmessage = (ev) => {
                const msg = JSON.parse(ev.data) as ServerMessage;
                if (msg.type === 'synced') synced.current = true;
                let foreign = false;
                // A failed run sends run_begin, error, then run_begin for the saved replay of the same request:
                // the request stays this tab's own until its run ends, or until the server refuses it outright.
                if (msg.type === 'run_begin') foreign = synced.current && requested.current !== (msg.requested ?? msg.incident_id);
                if (msg.type === 'run_end') requested.current = null;
                if (msg.type === 'error' && /already in progress/i.test(msg.detail)) requested.current = null;
                sound.onMessage(msg);
                send({ type: 'server', msg, foreign });
            };
            socket.onclose = () => {
                send({ type: 'connected', value: false });
                if (!closed) timer = window.setTimeout(connect, 1500);
            };
            ws.current = socket;
        };
        connect();
        return () => {
            closed = true;
            clearTimeout(timer);
            ws.current?.close();
        };
    }, []);

    const post = (msg: ClientMessage) => ws.current?.readyState === WebSocket.OPEN && ws.current.send(JSON.stringify(msg));
    const compile = (request: CompileRequest) => {
        requested.current = request.incident_id ?? '';
        post({ type: 'compile', ...request });
    };
    return { post, compile };
}

/**
 * What the page knows two seconds in, from the intake alone, while the station is still being grounded and
 * composed: the intake's verdict as a banner and the hot sector on the floor plan. The model's components
 * replace it as they arrive.
 */
function Provisional({ incident, ctx, stage }: { incident: Incident; ctx: Ctx; stage: string }) {
    const directive =
        incident.verdict === 'harmless'
            ? `Likely harmless: ${incident.ordinary_explanation ?? 'an ordinary explanation'}`
            : incident.verdict === 'real_threat'
              ? `Threat at intake: ${incident.evidence_of_threat ?? incident.summary}`
              : 'Unclear at intake. Grounding before anyone acts.';
    return (
        <>
            <article className={`card threat sev-${incident.severity} provisional`} style={{ gridColumn: 'span 12' }}>
                <header>
                    <h3>Incident</h3>
                    <span className="order">intake only · {stage}</span>
                </header>
                <IncidentHead incident={incident} ctx={ctx} action={null} directive={directive} />
            </article>
            <article className="card provisional" style={{ gridColumn: 'span 12' }}>
                <header>
                    <h3>Hot sector</h3>
                    <span className="order">intake only</span>
                </header>
                <FloorPlan p={{ hot_sector: incident.sector, seal: [], safe_route: [], view: 'floor' }} ctx={ctx} />
            </article>
        </>
    );
}

/** The station's panels on the 12-column grid, or while they stream in, what the intake already knows. */
function Station({ state, ctx }: { state: State; ctx: Ctx | null }) {
    const [reasoning, setReasoning] = useState(false); // the model's "why" for each panel, on demand
    const { incident } = state;
    const progress = !incident ? 'Reading the incident…' : !state.sources.length ? 'Grounding countermeasures with You.com…' : 'Composing the station…';
    const running = Boolean(state.source) && !state.manifest;
    return (
        <>
            <div className="stage-head">
                <h2>Station</h2>
                <button type="button" className="link" aria-pressed={reasoning} onClick={() => setReasoning(!reasoning)}>
                    Reasoning
                </button>
            </div>
            {running && <BuildProgress state={state} />}
            <div className={`components ${reasoning ? 'reasoning' : ''}`}>
                {ctx && state.components.length ? (
                    layout(state.components).map((p) => <Card key={`${p.index}-${p.component.type}`} index={p.index} component={p.component} ctx={ctx} span={p.span} tall={p.tall} />)
                ) : ctx && incident ? (
                    <PanelBoundary key={incident.incident_id} name="Provisional">
                        <Provisional incident={incident.incident} ctx={ctx} stage={progress} />
                    </PanelBoundary>
                ) : (
                    <div className="empty hero" style={state.art.hero_station_night ? { backgroundImage: `url(${artUrl(state.art.hero_station_night)})` } : undefined}>
                        {progress}
                    </div>
                )}
            </div>
        </>
    );
}

export function App() {
    const [state, send] = useReducer(reduce, initial);
    const sound = useRef(new SoundBoard());
    const { post, compile } = useServer(send, sound.current);

    useEffect(() => {
        document.body.dataset.theme = state.theme;
        document.title = state.title;
    }, [state.theme, state.title]);

    const { incident, library } = state;
    // Where the station on screen sits in a scenario, when it is one of its steps.
    const at = findStep(state.scenarios, incident?.incident_id);
    const scenario = at?.scenario ?? state.scenarios[0];
    const current = at?.step;
    const running = Boolean(state.source) && !state.manifest;

    const cited = new Set<number>();
    for (const c of state.components) {
        if (c?.type === 'SourceLedger' || c?.type === 'SkyClock') (c.props.cited ?? []).forEach((n) => cited.add(n));
        if (c?.type === 'CountermeasurePicker') (c.props.options ?? []).forEach((o) => o.source && cited.add(o.source));
    }
    const tracker = state.components.find((c) => c?.type === 'CivilianTracker');
    const quick: Ctx['quick'] = {
        actions: state.manifest?.quick_actions ?? [],
        people: tracker?.type === 'CivilianTracker' ? tracker.props.count : null,
        call: (expert) => callExpert(state, expert, sound.current, post),
        paged: (expert) => {
            const page = pageFor(state, expert);
            return Boolean(page && isOpen(page));
        },
    };
    const ctx: Ctx | null = library && {
        library, art: state.art, floor: state.floor, sources: state.sources, cited, sky: state.sky,
        incident: incident?.incident ?? null, clock: current?.time ?? '', action: state.manifest?.recommended_action ?? null, operator: state.operator, send, quick,
    };

    return (
        <>
            <a className="skip" href="#station">
                Skip to the station
            </a>
            <TopBar
                state={state}
                subtitle={current ? `${scenario?.title} · ${current.time}` : incident ? incident.incident_id || 'pasted incident' : 'waiting for an incident'}
                sound={sound.current}
                post={post}
            />

            {state.notice && (
                <div className="banner notice" role="status">
                    {state.notice}
                </div>
            )}
            {state.banner && (
                <div className={`banner ${state.banner.kind === 'error' ? 'error' : ''}`} role={state.banner.kind === 'error' ? 'alert' : 'status'}>
                    {state.banner.text}
                </div>
            )}

            <main className="layout">
                <div className="sr-only" role="status" aria-live="polite">
                    {running
                        ? `Building the station for ${current ? `step ${current.step}` : 'the incident'}…`
                        : state.manifest && incident
                          ? `Station ready: ${state.components.filter(Boolean).length} panels. ${incident.incident.entity} in ${library?.sectors[incident.incident.sector] ?? incident.incident.sector}. Recommended: ${state.manifest.recommended_action}.`
                          : ''}
                    {EXPERTS.map((expert) => pageFor(state, expert))
                        .filter(Boolean)
                        .map((page) => ` ${library?.experts[page!.expert].label}: ${pageStatus(page!)}.`)
                        .join('')}
                </div>
                <Rail state={state} />
                <section className="stage" id="station" tabIndex={-1}>
                    <ReportPanel state={state} scenario={scenario} current={current} running={running} compile={compile} />
                    <Station state={state} ctx={ctx} />
                    {state.pages.length > 0 && <ExpertCalls pages={state.pages} post={post} />}
                </section>
            </main>
        </>
    );
}
