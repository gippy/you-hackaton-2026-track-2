import { type FormEvent, useEffect, useReducer, useRef, useState } from 'react';

import type { Action, ClientMessage, ServerMessage, StepId } from '../../shared/protocol.ts';
import { Card, domain, Link, type Ctx } from './components.tsx';
import { SoundBoard } from './audio.ts';
import { initial, reduce } from './station.ts';

const STEPS: { id: StepId; label: string; partner: string }[] = [
    { id: 'ingest', label: 'Intake', partner: 'Parasail' },
    { id: 'triage', label: 'Route', partner: 'CrewAI Flow' },
    { id: 'ground', label: 'Ground', partner: 'CrewAI agent · You.com' },
    { id: 'compose', label: 'Compose', partner: 'Parasail stream' },
];

/** A timeline label: the report without its leading "ALERT 18:15" or "GUEST REPORT 11:20," prefix. */
const stepLabel = (raw: string) => raw.replace(/^[A-Z ]+\d{1,2}:\d{2},?\s*/, '').slice(0, 60);

/** Light or dark: starts from the system setting (applied in index.html before paint), a click remembers the other. */
function ModeToggle() {
    const [mode, setMode] = useState(document.documentElement.dataset.mode === 'light' ? 'light' : 'dark');
    const next = mode === 'light' ? 'dark' : 'light';
    return (
        <button
            type="button"
            className="ghost"
            onClick={() => {
                document.documentElement.dataset.mode = next;
                try {
                    localStorage.setItem('hcs-mode', next);
                } catch {
                    /* private window: the choice lasts until reload */
                }
                setMode(next);
            }}
        >
            {next === 'light' ? 'Light mode' : 'Dark mode'}
        </button>
    );
}

export function App() {
    const [state, send] = useReducer(reduce, initial);
    const ws = useRef<WebSocket | null>(null);
    const sound = useRef(new SoundBoard());
    const [soundOn, setSoundOn] = useState(false);
    const [volume, setVolume] = useState(sound.current.volume);
    const enableSound = (on: boolean) => {
        sound.current.setEnabled(on);
        setSoundOn(on);
    };
    const [raw, setRaw] = useState('');
    const [live, setLive] = useState(false);
    const [livePage, setLivePage] = useState(false);

    useEffect(() => {
        let closed = false;
        let timer = 0;
        const connect = () => {
            const socket = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
            socket.onopen = () => send({ type: 'connected', value: true });
            socket.onmessage = (ev) => {
                const msg = JSON.parse(ev.data) as ServerMessage;
                sound.current.onMessage(msg);
                send({ type: 'server', msg });
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

    useEffect(() => {
        document.body.dataset.theme = state.theme;
        document.title = state.title;
    }, [state.theme, state.title]);

    const post = (msg: ClientMessage) => ws.current?.readyState === WebSocket.OPEN && ws.current.send(JSON.stringify(msg));
    const { incident, library, operator } = state;
    const ctx: Ctx | null = library && { library, sources: state.sources, sky: state.sky, operator, send };
    const cited = new Set<number>();
    for (const c of state.components) {
        if (c?.type === 'SourceLedger') c.props.cited.forEach((n) => cited.add(n));
        if (c?.type === 'CountermeasurePicker') c.props.options.forEach((o) => o.source && cited.add(o.source));
    }
    const sourceLabel = !state.connected ? 'disconnected' : state.source === 'snapshot' ? 'saved run' : state.source === 'live' ? 'live run' : state.mode ?? 'connecting';
    const armed = live && state.liveDispatch;
    // Where the station on screen sits in a scenario, when it is one of its steps.
    const scenario = state.scenarios.find((s) => s.steps.some((step) => step.incident_id === incident?.incident_id)) ?? state.scenarios[0];
    const current = scenario?.steps.find((step) => step.incident_id === incident?.incident_id);
    const running = Boolean(state.source) && !state.manifest;
    const compileId = (id: string) => post({ type: 'compile', incident_id: id });
    // A harmless report: the model recommends watching, so the page does not push a dispatch.
    const calm = state.manifest?.recommended_action === 'observe';
    const pageArmed = livePage && state.livePage;

    const dispatch = (e: FormEvent) => {
        e.preventDefault();
        if (armed && !confirm('Post this containment alert to the real #loft-incident channel?')) return;
        if (pageArmed && !confirm('If the model marked this critical, really page the on-call through PagerDuty?')) return;
        if (!soundOn) enableSound(true); // the click is the interaction browsers wait for before playing audio
        send({ type: 'dispatching' });
        post({ type: 'dispatch', action: operator.action, countermeasure: operator.countermeasure, sealed: operator.sealed, extracted: operator.extracted.length, live: armed, live_page: pageArmed });
    };

    return (
        <>
            <header className="topbar">
                <div className="brand">
                    <span className="sigil" aria-hidden="true">
                        ☍
                    </span>
                    <div>
                        <h1>{state.title}</h1>
                        <div className="sub">
                            {current
                                ? `${scenario?.title} · step ${current.step} of ${scenario?.steps.length} · ${current.time} · ${current.severity_tier}`
                                : incident
                                  ? `${incident.incident_id || 'pasted incident'} · ${incident.severity_tier || `threat ${incident.incident.threat_level}/5`}`
                                  : 'waiting for an incident'}
                        </div>
                    </div>
                </div>
                <div className="status">
                    {incident && <span className={`pill sev-${incident.incident.severity}`}>{incident.incident.severity}</span>}
                    <span className={`pill ${state.source === 'snapshot' || state.mode === 'offline' ? 'snapshot' : state.connected ? 'live' : 'muted'}`}>{sourceLabel}</span>
                    <button type="button" className="ghost" aria-pressed={soundOn} onClick={() => enableSound(!soundOn)}>
                        {soundOn ? 'Mute' : 'Enable sound'}
                    </button>
                    <input
                        type="range"
                        className="volume"
                        aria-label="Volume"
                        min={0}
                        max={1}
                        step={0.05}
                        value={volume}
                        onChange={(e) => {
                            sound.current.setVolume(Number(e.target.value));
                            setVolume(Number(e.target.value));
                        }}
                    />
                    <ModeToggle />
                </div>
                <form className="dispatch" aria-label="Dispatch a containment alert" onSubmit={dispatch}>
                    <label>
                        Action
                        <select value={operator.action} onChange={(e) => send({ type: 'action', value: e.target.value as Action })}>
                            <option value="contain">Contain</option>
                            <option value="evacuate">Evacuate</option>
                            <option value="observe">Observe</option>
                        </select>
                    </label>
                    <span className="cm">
                        Countermeasure: <b>{operator.countermeasure ? library?.arsenal[operator.countermeasure] : 'none picked'}</b>
                    </span>
                    {state.liveDispatch && (
                        <label className="live-toggle">
                            <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} /> Live post
                        </label>
                    )}
                    {state.livePage && (
                        <label className="live-toggle">
                            <input type="checkbox" checked={livePage} onChange={(e) => setLivePage(e.target.checked)} /> Live page
                        </label>
                    )}
                    {calm && <span className="cm">The model says observe: no dispatch needed.</span>}
                    <button type="submit" className={calm ? 'ghost' : ''} disabled={!state.manifest || state.dispatching}>
                        {state.dispatching ? 'Dispatching…' : calm ? 'Dispatch anyway' : 'Dispatch to #loft-incident'}
                    </button>
                    <span className={`pill ${armed ? 'armed' : 'muted'}`}>{state.mode === 'offline' ? 'offline' : armed ? 'live' : 'dry run'}</span>
                </form>
            </header>

            {state.banner && (
                <div className={`banner ${state.banner.kind === 'error' ? 'error' : ''}`} role="status">
                    {state.banner.text}
                </div>
            )}

            <main className="layout">
                <aside className="rail">
                    {scenario && (
                        <section className="panel">
                            <h2>
                                Scenario: {scenario.title} <em className="partner">simulated</em>
                            </h2>
                            <div className="stepper">
                                <button type="button" className="ghost" disabled={running || !current || current.step === 1} onClick={() => current && compileId(scenario.steps[current.step! - 2].incident_id)}>
                                    ◀ Previous
                                </button>
                                <span className="muted small">{current ? `Step ${current.step} of ${scenario.steps.length}, ${current.time}` : 'Not started'}</span>
                                <button
                                    type="button"
                                    disabled={running || current?.step === scenario.steps.length}
                                    onClick={() => compileId(scenario.steps[current ? current.step! : 0].incident_id)}
                                >
                                    {current ? 'Next step ▶' : 'Start ▶'}
                                </button>
                            </div>
                            <ol className="timeline">
                                {scenario.steps.map((step) => (
                                    <li key={step.incident_id}>
                                        <button
                                            type="button"
                                            className={step.incident_id === current?.incident_id ? 'active' : ''}
                                            title={step.raw_incident_stream}
                                            disabled={running}
                                            onClick={() => compileId(step.incident_id)}
                                        >
                                            <time>{step.time}</time> {stepLabel(step.raw_incident_stream)}
                                        </button>
                                    </li>
                                ))}
                            </ol>
                        </section>
                    )}
                    <section className="panel">
                        <h2>Pipeline</h2>
                        <ol className="steps">
                            {STEPS.map((s) => {
                                const step = state.steps[s.id];
                                return (
                                    <li key={s.id} className={step?.state ?? ''}>
                                        <span className="dot" />
                                        <div>
                                            <b>{s.label}</b> <em className="partner">{s.partner}</em>
                                            <p>{step?.detail}</p>
                                        </div>
                                        <time>{step?.ms ? `${(step.ms / 1000).toFixed(1)}s` : ''}</time>
                                    </li>
                                );
                            })}
                        </ol>
                        <ul className="queries">
                            {state.queries.map((q, i) => (
                                <li key={i}>{q}</li>
                            ))}
                        </ul>
                    </section>

                    <section className="panel">
                        <h2>Incident</h2>
                        <blockquote className="raw">{incident?.raw ?? 'The raw report appears here.'}</blockquote>
                        {incident && library && (
                            <dl className="facts">
                                <dt>Entity</dt>
                                <dd>
                                    {incident.incident.entity} ({incident.incident.entity_class})
                                </dd>
                                <dt>Sector</dt>
                                <dd>
                                    {library.sectors[incident.incident.sector]}: {incident.incident.location_detail}
                                </dd>
                                <dt>EMF</dt>
                                <dd>{incident.incident.emf_mg === null ? 'not reported' : `${incident.incident.emf_mg} mG, ${incident.incident.emf_trend}`}</dd>
                                <dt>Temp</dt>
                                <dd>{incident.incident.temperature_c === null ? 'not reported' : `${incident.incident.temperature_c} °C`}</dd>
                                <dt>People</dt>
                                <dd>
                                    {incident.incident.civilians.count} {incident.incident.civilians.condition}, {incident.incident.civilians.location}
                                </dd>
                                <dt>Systems</dt>
                                <dd>{incident.incident.systems.map((s) => `${s.name}: ${s.status}`).join('; ') || 'none reported'}</dd>
                            </dl>
                        )}
                    </section>

                    <section className="panel">
                        <h2>
                            Sources <em className="partner">You.com</em>
                        </h2>
                        <ol className="sources">
                            {state.sources.length ? (
                                state.sources.map((s) => (
                                    <li key={s.n} value={s.n} className={cited.has(s.n) ? 'cited' : ''}>
                                        <Link url={s.url}>{s.title || s.url}</Link>
                                        <span className="domain">{domain(s.url)}</span>
                                    </li>
                                ))
                            ) : (
                                <li className="muted">{incident ? 'Searching…' : 'No sources yet.'}</li>
                            )}
                        </ol>
                    </section>

                    <section className="panel">
                        <h2>Single incidents</h2>
                        <ul className="incidents">
                            {state.incidents.map((i) => (
                                <li key={i.incident_id}>
                                    <button
                                        type="button"
                                        className={`ghost ${incident?.incident_id === i.incident_id ? 'active' : ''}`}
                                        title={i.raw_incident_stream}
                                        disabled={running}
                                        onClick={() => compileId(i.incident_id)}
                                    >
                                        <b>{i.incident_id}</b> {i.severity_tier}
                                        {i.source === 'simulated' && <span className="tag">simulated</span>}
                                        <span className="snippet">{i.raw_incident_stream.slice(0, 90)}…</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </section>

                    <section className="panel">
                        <h2>New incident</h2>
                        <form
                            className="compile"
                            onSubmit={(e) => {
                                e.preventDefault();
                                if (raw.trim()) post({ type: 'compile', raw: raw.trim() });
                            }}
                        >
                            <textarea rows={5} value={raw} onChange={(e) => setRaw(e.target.value)} placeholder="Paste a raw incident report…" />
                            <button type="submit" disabled={state.mode === 'offline'}>
                                {state.mode === 'offline' ? 'Compile (needs live mode)' : 'Compile station'}
                            </button>
                        </form>
                    </section>
                </aside>

                <section className="stage">
                    <div className="stage-head">
                        <h2>
                            Station <span className="muted">{state.components.length ? `· ${state.components.filter(Boolean).length} components` : ''}</span>
                        </h2>
                        <span className="muted small">Components chosen and ordered by the model</span>
                    </div>
                    <div className="components">
                        {ctx && state.components.length ? (
                            state.components.map((c, i) => c && <Card key={`${i}-${c.type}`} index={i} component={c} ctx={ctx} />)
                        ) : (
                            <div className="empty">
                                {!incident ? 'Reading the incident…' : !state.sources.length ? 'Grounding countermeasures with You.com…' : 'Composing the station…'}
                            </div>
                        )}
                    </div>
                    {state.dispatch && (
                        <section className="panel dispatch-log">
                            <h2>
                                Dispatch <em className="partner">One → Discord</em>
                            </h2>
                            <pre>{state.dispatch.text}</pre>
                            {state.dispatch.paging && <p className="muted small">{state.dispatch.paging}</p>}
                            <details open>
                                <summary>
                                    {state.dispatch.error
                                        ? `${state.dispatch.mode === 'live' ? 'Live post' : 'Dry run'} failed`
                                        : { 'dry-run': 'Dry run: the exact request One would send (nothing was posted)', live: 'Posted to Discord through One', offline: 'Offline: One was not called' }[state.dispatch.mode]}
                                </summary>
                                <pre>{JSON.stringify(state.dispatch.error ? { error: state.dispatch.error } : (state.dispatch.request ?? state.dispatch.response), null, 2)}</pre>
                            </details>
                        </section>
                    )}
                    {state.pages.length > 0 && (
                        <section className="panel pages">
                            <h2>
                                Paging <em className="partner">One → PagerDuty</em>
                            </h2>
                            <ul>
                                {state.pages.map((page) => (
                                    <li key={page.key}>
                                        <div className="page-head">
                                            <span className={`pill page-${page.status}`}>
                                                {page.status === 'acknowledged' && page.acknowledged_by.length ? `acknowledged by ${page.acknowledged_by.join(', ')}` : page.status}
                                            </span>
                                            <b>{page.title}</b>
                                            <span className="muted small">
                                                {page.urgency} urgency · {page.mode === 'live' ? 'live' : 'dry run'} · {page.key}
                                            </span>
                                            {page.url && <Link url={page.url}>#{page.number ?? 'incident'}</Link>}
                                            {page.status !== 'resolved' && page.status !== 'failed' && page.status !== 'sending' && (
                                                <button type="button" className="ghost" onClick={() => post({ type: 'resolve_page', key: page.key })}>
                                                    Resolve
                                                </button>
                                            )}
                                        </div>
                                        {page.error && <p className="status-danger small">{page.error}</p>}
                                        {page.request !== undefined && (
                                            <details>
                                                <summary>{page.mode === 'dry-run' ? 'Dry run: the exact request One would send' : 'Request'}</summary>
                                                <pre>{JSON.stringify(page.request, null, 2)}</pre>
                                            </details>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}
                </section>
            </main>
        </>
    );
}
