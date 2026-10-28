import { type FormEvent, useEffect, useReducer, useRef, useState } from 'react';

import type { Action, ClientMessage, ServerMessage, StepId } from '../../shared/protocol.ts';
import { Card, domain, Link, type Ctx } from './components.tsx';
import { initial, reduce } from './station.ts';

const STEPS: { id: StepId; label: string; partner: string }[] = [
    { id: 'ingest', label: 'Intake', partner: 'Parasail' },
    { id: 'triage', label: 'Route', partner: 'CrewAI Flow' },
    { id: 'ground', label: 'Ground', partner: 'CrewAI agent · You.com' },
    { id: 'compose', label: 'Compose', partner: 'Parasail stream' },
];

// Example inputs for the paste box. They are raw reports, not layouts: the model decides what to show.
const SAMPLES: [string, string][] = [
    [
        'Zombie horde at the entrance',
        'URGENT: Shambling horde of roughly 30 zombies pressing against the glass doors at the 525 Market entrance. ' +
            'Registration volunteers (6) barricaded behind the badge desk. Doors holding but one hinge is failing. ' +
            'Smell of formaldehyde, no EMF anomaly on handhelds. Badge printers and door access control still online.',
    ],
    [
        'Cursed GPU in the network closet',
        'Network closet: the GPU rack is running models nobody launched, fans screaming in a language. Wi-Fi ' +
            'dropping across hack floor east. Handheld EMF reads 41 mG and steady. Room temp 39C. One sysadmin ' +
            'inside, says the door locked itself. Badge readers offline, power still on.',
    ],
];

export function App() {
    const [state, send] = useReducer(reduce, initial);
    const ws = useRef<WebSocket | null>(null);
    const [raw, setRaw] = useState('');
    const [live, setLive] = useState(false);

    useEffect(() => {
        let closed = false;
        let timer = 0;
        const connect = () => {
            const socket = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
            socket.onopen = () => send({ type: 'connected', value: true });
            socket.onmessage = (ev) => send({ type: 'server', msg: JSON.parse(ev.data) as ServerMessage });
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
    const ctx: Ctx | null = library && { library, sources: state.sources, operator, send };
    const cited = new Set<number>();
    for (const c of state.components) {
        if (c?.type === 'SourceLedger') c.props.cited.forEach((n) => cited.add(n));
        if (c?.type === 'CountermeasurePicker') c.props.options.forEach((o) => o.source && cited.add(o.source));
    }
    const sourceLabel = !state.connected ? 'disconnected' : state.source === 'snapshot' ? 'saved run' : state.source === 'live' ? 'live run' : state.mode ?? 'connecting';
    const armed = live && state.liveDispatch;

    const dispatch = (e: FormEvent) => {
        e.preventDefault();
        if (armed && !confirm('Post this containment alert to the real #loft-incident channel?')) return;
        send({ type: 'dispatching' });
        post({ type: 'dispatch', action: operator.action, countermeasure: operator.countermeasure, sealed: operator.sealed, extracted: operator.extracted.length, live: armed });
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
                            {incident ? `${incident.incident_id || 'pasted incident'} · ${incident.severity_tier || `threat ${incident.incident.threat_level}/5`}` : 'waiting for an incident'}
                        </div>
                    </div>
                </div>
                <div className="status">
                    {incident && <span className={`pill sev-${incident.incident.severity}`}>{incident.incident.severity}</span>}
                    <span className={`pill ${state.source === 'snapshot' || state.mode === 'offline' ? 'snapshot' : state.connected ? 'live' : 'muted'}`}>{sourceLabel}</span>
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
                    <button type="submit" disabled={!state.manifest || state.dispatching}>
                        {state.dispatching ? 'Dispatching…' : 'Dispatch to #loft-incident'}
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
                        <h2>New incident</h2>
                        <form
                            className="compile"
                            onSubmit={(e) => {
                                e.preventDefault();
                                if (raw.trim()) post({ type: 'compile', raw: raw.trim() });
                            }}
                        >
                            <textarea rows={5} value={raw} onChange={(e) => setRaw(e.target.value)} placeholder="Paste a raw incident report…" />
                            <div className="samples">
                                {SAMPLES.map(([label, text]) => (
                                    <button key={label} type="button" className="ghost" onClick={() => setRaw(text)}>
                                        {label}
                                    </button>
                                ))}
                            </div>
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
                </section>
            </main>
        </>
    );
}
