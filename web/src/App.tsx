import { useEffect, useReducer, useRef, useState } from 'react';

import type { ClientMessage, Expert, OperatorMoves, PageInfo, ServerMessage, StepId } from '../../shared/protocol.ts';
import type { Incident } from '../../shared/protocol.ts';
import { Card, IncidentHead, Link, PanelBoundary, squares, type Ctx } from './components.tsx';
import { FloorPlan } from './floorplan.tsx';
import { layout } from './layout.ts';
import { artUrl, withToken } from './url.ts';
import { SoundBoard } from './audio.ts';
import { initial, reduce } from './station.ts';

const STEPS: { id: StepId; label: string; partner: string }[] = [
    { id: 'ingest', label: 'Intake', partner: 'Parasail' },
    { id: 'triage', label: 'Route', partner: 'CrewAI Flow' },
    { id: 'ground', label: 'Ground', partner: 'CrewAI agent · You.com' },
    { id: 'compose', label: 'Compose', partner: 'Parasail stream' },
];

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

const EXPERTS: Expert[] = ['vampire_hunter', 'ghostbuster'];
const OPEN: PageInfo['status'][] = ['sending', 'triggered', 'acknowledged'];

/** A page's status by its expert's button: "Paging…", "Triggered #12", "Acknowledged by Jaroslav", "Resolved". */
function pageStatus(page: PageInfo): string {
    switch (page.status) {
        case 'sending':
            return 'Paging…';
        case 'triggered':
            return `Triggered${page.number ? ` #${page.number}` : ''}`;
        case 'acknowledged':
            return page.acknowledged_by.length ? `Acknowledged by ${page.acknowledged_by.map((name) => name.split(' ')[0]).join(', ')}` : 'Acknowledged';
        case 'resolved':
            return 'Resolved';
        case 'failed':
            return 'Paging failed';
        case 'off':
            return 'Not sent: paging is off';
    }
}

/** A feed tier as words: CRITICAL_HAUNT reads "critical haunt". */
const tier = (raw: string) => raw.replace(/_/g, ' ').toLowerCase();

/** A timeline label: the report's first clause, without its "ALERT 18:15" prefix, cut at a word and never mid-word. */
function stepLabel(raw: string): string {
    const clause = raw.replace(/^[A-Z ]+\d{1,2}:\d{2},?\s*/, '').split(/[.,;]/)[0];
    let out = '';
    for (const word of clause.split(/\s+/)) {
        if (`${out} ${word}`.trim().length > 30) break;
        out = `${out} ${word}`.trim();
    }
    // A label that was cut short should not end on a filler word ("breaker panel in the").
    return out.replace(/(\s+(a|an|the|in|of|to|at|on|for|and|with|from|by))+$/i, '');
}

const VERDICT_WORD = { real_threat: 'Real threat', harmless: 'Harmless', unclear: 'Unclear' } as const;

/** "2 offline · 1 online": the systems an incident names, counted by status. */
function systemsSummary(systems: { status: string }[] = []): string {
    const counts = new Map<string, number>();
    for (const s of systems) counts.set(s.status, (counts.get(s.status) ?? 0) + 1);
    return [...counts].map(([status, n]) => `${n} ${status}`).join(' · ') || '—';
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
    // Several viewers share one station. This tab steps from the step it last asked for, not from
    // whatever run another viewer started, and it can tell its own runs from theirs.
    const [cursor, setCursor] = useState<string | null>(null);
    const [reasoning, setReasoning] = useState(false); // the model's "why" for each panel, on demand
    const [menuOpen, setMenuOpen] = useState(false); // the single-incident menu in the report panel
    const [composing, setComposing] = useState(false); // the report panel shows the paste box for a new incident
    const menu = useRef<HTMLDivElement>(null);
    const menuList = useRef<HTMLUListElement>(null);
    const [lastStep, setLastStep] = useState<string | null>(null); // the scenario step to go back to from a single incident
    const requested = useRef<string | null>(null);
    const synced = useRef(false);

    useEffect(() => {
        let closed = false;
        let timer = 0;
        const connect = () => {
            const socket = new WebSocket(withToken(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`));
            socket.onopen = () => {
                synced.current = false; // the history replay comes first: none of it is news
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
                sound.current.onMessage(msg);
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

    useEffect(() => {
        document.body.dataset.theme = state.theme;
        document.title = state.title;
    }, [state.theme, state.title]);

    const post = (msg: ClientMessage) => ws.current?.readyState === WebSocket.OPEN && ws.current.send(JSON.stringify(msg));
    const { incident, library, operator } = state;
    const cited = new Set<number>();
    for (const c of state.components) {
        if (c?.type === 'SourceLedger' || c?.type === 'SkyClock') (c.props.cited ?? []).forEach((n) => cited.add(n));
        if (c?.type === 'CountermeasurePicker') (c.props.options ?? []).forEach((o) => o.source && cited.add(o.source));
    }
    const clock = state.scenarios.flatMap((s) => s.steps).find((step) => step.incident_id === incident?.incident_id)?.time ?? '';
    const ctx: Ctx | null = library && {
        library, art: state.art, floor: state.floor, sources: state.sources, cited, sky: state.sky,
        incident: incident?.incident ?? null, clock, action: state.manifest?.recommended_action ?? null, operator, send,
    };
    const sourceLabel = !state.connected ? 'disconnected' : state.source === 'snapshot' ? 'saved run' : state.source === 'live' ? 'live run' : state.mode ?? 'connecting';
    // Where the station on screen sits in a scenario, when it is one of its steps.
    const scenario = state.scenarios.find((s) => s.steps.some((step) => step.incident_id === incident?.incident_id)) ?? state.scenarios[0];
    const current = scenario?.steps.find((step) => step.incident_id === incident?.incident_id);
    const running = Boolean(state.source) && !state.manifest;
    // What the operator did on the scenario step on screen: sent on with the next step, so its station builds on it.
    const movesHere = (): OperatorMoves | undefined => {
        if (!current || !state.manifest) return undefined;
        const tracker = state.components.find((c) => c?.type === 'CivilianTracker');
        const count = tracker?.type === 'CivilianTracker' ? tracker.props.count : null;
        return {
            step: current.incident_id,
            time: current.time ?? '',
            countermeasure: operator.countermeasure,
            sealed: operator.sealed,
            people_out: count === null ? 0 : squares(count, operator.extracted).people,
            people: count,
        };
    };
    const compileId = (id: string) => {
        setCursor(id);
        requested.current = id;
        // Only a step later in the same scenario builds on the moves; going back or elsewhere starts clean.
        const target = scenario?.steps.find((step) => step.incident_id === id);
        const moves = target && current && target.step! > current.step! ? movesHere() : undefined;
        post({ type: 'compile', incident_id: id, moves });
    };
    // This tab's own place in the scenario: the step it last asked for, else the step on screen.
    const mine = scenario?.steps.find((step) => step.incident_id === cursor) ?? current;
    // The report panel shows the step or incident this tab picked, from the fixtures, so its text is there before the run.
    const picked = cursor ?? incident?.incident_id ?? ''; // '' after a paste, which has no incident id
    const pickedFixture = [...state.scenarios.flatMap((s) => s.steps), ...state.incidents].find((x) => x.incident_id === picked);
    const pickedStep = scenario?.steps.find((step) => step.incident_id === picked);
    // From a single incident or a pasted report, Back returns to the scenario step this tab was last on.
    const backTo = scenario?.steps.find((step) => step.incident_id === lastStep) ?? scenario?.steps[0];
    useEffect(() => {
        if (current) setLastStep(current.incident_id);
    }, [current?.incident_id]);
    useEffect(() => {
        if (!menuOpen) return;
        // The menu closes on Escape or on a click anywhere outside it.
        const close = (e: MouseEvent | KeyboardEvent) => {
            const outside = !menu.current?.contains(e.target as Node) && !menuList.current?.contains(e.target as Node);
            if (e instanceof KeyboardEvent ? e.key === 'Escape' : outside) setMenuOpen(false);
        };
        document.addEventListener('mousedown', close);
        document.addEventListener('keydown', close);
        return () => {
            document.removeEventListener('mousedown', close);
            document.removeEventListener('keydown', close);
        };
    }, [menuOpen]);
    // The expert the code-mapped playbook points to is the primary button; a harmless report needs neither.
    const harmless = incident?.incident.verdict === 'harmless';
    const recommended = harmless || !library || !state.playbook ? null : EXPERTS.find((x) => library.experts[x].playbooks.includes(state.playbook!)) ?? null;
    const offline = state.mode === 'offline';
    const canCall = Boolean(state.manifest) && !running && !offline;
    // This step's page for an expert (a pasted report's id is made on the server, so match any pasted one).
    const pageFor = (expert: Expert) => state.pages.find((p) => p.expert === expert && (incident?.incident_id ? p.incident_id === incident.incident_id : p.incident_id.startsWith('pasted-')));


    const callExpert = (expert: Expert) => {
        const open = pageFor(expert);
        if (!canCall || (open && OPEN.includes(open.status))) return; // aria-disabled, so the button keeps focus
        // The click is the interaction browsers wait for: with sound off it allows only this call's sting and voice.
        if (!soundOn) sound.current.voiceOnce = true;
        post({ type: 'call_expert', expert, countermeasure: operator.countermeasure });
    };

    return (
        <>
            <a className="skip" href="#station">
                Skip to the station
            </a>
            <header className="topbar">
                <div className="brand">
                    <span className="sigil" aria-hidden="true">
                        ☍
                    </span>
                    <div>
                        <h1>{state.title}</h1>
                        <div className="subrow">
                            <div className="sub">
                                {current ? `${scenario?.title} · ${current.time}` : incident ? incident.incident_id || 'pasted incident' : 'waiting for an incident'}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="controls">
                    <div className="group" aria-label="Station status">
                        <span className={`state ${state.source === 'snapshot' || state.mode === 'offline' ? 'snapshot' : state.connected ? 'live' : 'muted'}`}>{sourceLabel}</span>
                    </div>
                    <div className="group" aria-label="Sound">
                        <button type="button" className={`ghost ${soundOn ? 'on' : ''}`} aria-pressed={soundOn} onClick={() => enableSound(!soundOn)}>
                            Sound<span aria-hidden="true">{soundOn ? ' ◉' : ' ○'}</span>
                        </button>
                        <input
                            type="range"
                            className="volume"
                            aria-label="Volume"
                            aria-valuetext={`${Math.round(volume * 100)}%`}
                            min={0}
                            max={1}
                            step={0.05}
                            value={volume}
                            onChange={(e) => {
                                sound.current.setVolume(Number(e.target.value));
                                setVolume(Number(e.target.value));
                            }}
                        />
                    </div>
                    <div className="group experts" role="group" aria-labelledby="experts-label">
                        <span id="experts-label" className="experts-label">
                            Call expert
                        </span>
                        {library &&
                            EXPERTS.map((expert) => {
                                const page = pageFor(expert);
                                const open = page && OPEN.includes(page.status);
                                return (
                                    <span key={expert} className="expert">
                                        <button
                                            type="button"
                                            className={expert === recommended ? '' : 'ghost'}
                                            aria-disabled={!canCall || open}
                                            title={offline ? 'Offline: no expert can be paged' : `Pages ${library.experts[expert].label.toLowerCase()} on call through PagerDuty`}
                                            onClick={() => callExpert(expert)}
                                        >
                                            {library.experts[expert].label}
                                        </button>
                                        {page && (
                                            <span className={`page-status page-${page.status}`} title={page.error}>
                                                {pageStatus(page)}
                                            </span>
                                        )}
                                        {open && page.id && (
                                            <button type="button" className="link" onClick={() => post({ type: 'resolve_page', key: page.key })}>
                                                Resolve
                                            </button>
                                        )}
                                    </span>
                                );
                            })}
                        <span className="cm">
                            {offline
                                ? 'Offline: no expert can be paged'
                                : harmless
                                  ? 'No expert needed'
                                  : operator.countermeasure
                                    ? (library?.arsenal[operator.countermeasure] ?? operator.countermeasure)
                                    : 'No countermeasure picked'}
                        </span>
                    </div>
                </div>
            </header>

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
                    {EXPERTS.map((expert) => pageFor(expert))
                        .filter(Boolean)
                        .map((page) => ` ${library?.experts[page!.expert].label}: ${pageStatus(page!)}.`)
                        .join('')}
                </div>
                <aside className="rail">
                    <section className="panel">
                        <h2>Pipeline</h2>
                        <ol className="steps">
                            {STEPS.map((s) => {
                                const step = state.steps[s.id];
                                return (
                                    <li key={s.id} className={step?.state ?? ''} title={step?.detail}>
                                        <span className="dot" />
                                        <b>{s.label}</b>
                                        <em className="partner">{s.partner}</em>
                                        <time>{step?.ms ? `${(step.ms / 1000).toFixed(1)}s` : ''}</time>
                                    </li>
                                );
                            })}
                        </ol>
                        <details className="more">
                            <summary>Details</summary>
                            <ul className="queries">
                                {STEPS.map((s) => state.steps[s.id]?.detail && <li key={s.id}>{`${s.label}: ${state.steps[s.id]!.detail}`}</li>)}
                                {state.queries.map((q, i) => (
                                    <li key={i}>{q}</li>
                                ))}
                            </ul>
                        </details>
                    </section>

                    <section className="panel">
                        <h2>Intake</h2>
                        {!incident && <p className="muted small">The facts the model reads from the report appear here.</p>}
                        {incident && library && (
                            <dl className="facts">
                                <dt>Verdict</dt>
                                <dd>{incident.incident.verdict ? VERDICT_WORD[incident.incident.verdict] : '—'}</dd>
                                <dt>Entity</dt>
                                <dd>{incident.incident.entity}</dd>
                                <dt>Sector</dt>
                                <dd>{library.sectors[incident.incident.sector] ?? incident.incident.sector}</dd>
                                <dt>People</dt>
                                <dd>
                                    {incident.incident.people_in_reach ?? incident.incident.civilians?.count ?? '—'}
                                    {incident.incident.people_hurt ? ` · ${incident.incident.people_hurt} hurt` : ''}
                                </dd>
                                <dt>EMF</dt>
                                <dd>{incident.incident.emf_mg == null ? '—' : `${incident.incident.emf_mg} mG`}</dd>
                                <dt>Temp</dt>
                                <dd>{incident.incident.temperature_c == null ? '—' : `${incident.incident.temperature_c} °C`}</dd>
                                <dt>Systems</dt>
                                <dd>{systemsSummary(incident.incident.systems)}</dd>
                                {incident.severity_tier && (
                                    <>
                                        <dt>Feed tier</dt>
                                        <dd>{tier(incident.severity_tier)}</dd>
                                    </>
                                )}
                            </dl>
                        )}
                    </section>


                </aside>

                <section className="stage" id="station" tabIndex={-1}>
                    {/* The report the station is built from, and the controls that pick it: a step back or on, or any step or incident. */}
                    <section className="panel report" aria-labelledby="report-title">
                        <div className="report-head">
                            <h2 id="report-title">Incident report</h2>
                            <span className="muted small">
                                {composing
                                    ? 'New incident: paste a report'
                                    : pickedStep && scenario
                                    ? `${scenario.title} · step ${pickedStep.step} of ${scenario.steps.length} · ${pickedStep.time}`
                                    : pickedFixture
                                      ? pickedFixture.incident_id
                                      : incident
                                        ? 'Pasted report'
                                        : 'Waiting for an incident'}
                                {!composing && (
                                    <>
                                        {pickedFixture ? ` · feed tier ${tier(pickedFixture.severity_tier)}` : ''}
                                        {pickedFixture?.source === 'simulated' ? ' · simulated' : ''}
                                        {current && mine && mine !== current ? ` · on screen: step ${current.step}` : ''}
                                    </>
                                )}
                            </span>
                        </div>
                        {state.moves && library && (
                            <p className="moves small">
                                Building on your moves at {state.moves.time}:{' '}
                                {[
                                    state.moves.countermeasure ? (library.arsenal[state.moves.countermeasure] ?? state.moves.countermeasure) : 'no countermeasure picked',
                                    state.moves.sealed.length ? `sealed ${state.moves.sealed.map((id) => library.sectors[id] ?? id).join(', ')}` : 'nothing sealed',
                                    state.moves.people !== null ? `${state.moves.people_out} of ${state.moves.people} people out` : '',
                                ]
                                    .filter(Boolean)
                                    .join(' · ')}
                            </p>
                        )}
                        {/* Controls stay focusable while a run streams (aria-disabled), so stepping by keyboard is one key per step. */}
                        <div className="report-nav">
                            {scenario && pickedStep && !composing ? (
                                <>
                                    <button
                                        type="button"
                                        className="ghost"
                                        disabled={!mine || mine.step === 1}
                                        aria-disabled={running}
                                        onClick={() => !running && mine && compileId(scenario.steps[mine.step! - 2].incident_id)}
                                    >
                                        ◀ Previous
                                    </button>
                                    <select aria-label={`${scenario.title} step`} value={picked} aria-disabled={running} onChange={(e) => !running && compileId(e.target.value)}>
                                        {scenario.steps.map((step) => (
                                            <option key={step.incident_id} value={step.incident_id}>
                                                {`${step.step}. ${step.time} · ${stepLabel(step.raw_incident_stream)}`}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        className="next"
                                        aria-disabled={running || mine?.step === scenario.steps.length}
                                        onClick={() => !running && mine?.step !== scenario.steps.length && compileId(scenario.steps[mine ? mine.step! : 0].incident_id)}
                                    >
                                        Next step ▶
                                    </button>
                                </>
                            ) : (
                                scenario &&
                                backTo && (
                                    <button
                                        type="button"
                                        className="ghost"
                                        aria-disabled={running}
                                        onClick={() => {
                                            if (running) return;
                                            setComposing(false);
                                            compileId(backTo.incident_id);
                                        }}
                                    >
                                        ◀ Back to {scenario.title}, step {backTo.step}
                                    </button>
                                )
                            )}
                            {state.incidents.length > 0 && (
                                <div className="menu" ref={menu}>
                                    <button type="button" className="ghost" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
                                        Single incidents ▾
                                    </button>
                                </div>
                            )}
                        </div>
                        {menuOpen && (
                            <ul className="menu-list" ref={menuList} aria-label="Single incidents">
                                {state.incidents.map((i) => (
                                    <li key={i.incident_id}>
                                        <button
                                            type="button"
                                            className={`ghost ${picked === i.incident_id ? 'active' : ''}`}
                                            aria-disabled={running}
                                            onClick={() => {
                                                if (running) return;
                                                setMenuOpen(false);
                                                setComposing(false);
                                                compileId(i.incident_id);
                                            }}
                                        >
                                            <b>{i.incident_id}</b> {tier(i.severity_tier)}
                                            {i.source === 'simulated' && ' · simulated'}
                                            <span className="snippet">{i.raw_incident_stream.slice(0, 90)}…</span>
                                        </button>
                                    </li>
                                ))}
                                <li>
                                    <button
                                        type="button"
                                        className={`ghost ${composing ? 'active' : ''}`}
                                        onClick={() => {
                                            setMenuOpen(false);
                                            setComposing(true);
                                        }}
                                    >
                                        <b>New incident…</b>
                                        <span className="snippet">Paste any raw report, and the model builds a station for it.</span>
                                    </button>
                                </li>
                            </ul>
                        )}
                        {composing ? (
                            <form
                                className="compile"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    if (!raw.trim() || running) return;
                                    setComposing(false);
                                    setCursor(''); // a pasted report has no incident id
                                    requested.current = '';
                                    post({ type: 'compile', raw: raw.trim() });
                                }}
                            >
                                <textarea rows={6} value={raw} onChange={(e) => setRaw(e.target.value)} aria-label="Raw incident report" placeholder="Paste a raw incident report…" autoFocus />
                                <div className="report-nav">
                                    <button type="submit" disabled={state.mode === 'offline'}>
                                        {state.mode === 'offline' ? 'Compile (needs live mode)' : 'Compile station'}
                                    </button>
                                    <button type="button" className="ghost" onClick={() => setComposing(false)}>
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <blockquote className="report-text">{pickedFixture?.raw_incident_stream ?? (cursor === '' ? raw.trim() : incident?.raw) ?? 'The raw report appears here.'}</blockquote>
                        )}
                    </section>
                    <div className="stage-head">
                        <h2>Station</h2>
                        <button type="button" className="link" aria-pressed={reasoning} onClick={() => setReasoning(!reasoning)}>
                            Reasoning
                        </button>
                    </div>
                    <div className={`components ${reasoning ? 'reasoning' : ''}`}>
                        {ctx && state.components.length ? (
                            layout(state.components).map((p) => <Card key={`${p.index}-${p.component.type}`} index={p.index} component={p.component} ctx={ctx} span={p.span} tall={p.tall} />)
                        ) : ctx && incident ? (
                            <PanelBoundary key={incident.incident_id} name="Provisional">
                                <Provisional incident={incident.incident} ctx={ctx} stage={!state.sources.length ? 'Grounding countermeasures with You.com…' : 'Composing the station…'} />
                            </PanelBoundary>
                        ) : (
                            <div className="empty hero" style={state.art.hero_station_night ? { backgroundImage: `url(${artUrl(state.art.hero_station_night)})` } : undefined}>
                                {!incident ? 'Reading the incident…' : !state.sources.length ? 'Grounding countermeasures with You.com…' : 'Composing the station…'}
                            </div>
                        )}
                    </div>
                    {state.pages.length > 0 && (
                        <section className="panel pages">
                            <h2>
                                Expert calls <em className="partner">One → PagerDuty</em>
                            </h2>
                            <ul>
                                {state.pages.map((page) => (
                                    <li key={page.key}>
                                        <div className="page-head">
                                            <span className={`pill page-${page.status}`}>{pageStatus(page)}</span>
                                            <b>{page.title}</b>
                                            <span className="muted small">
                                                {page.urgency} urgency · {page.key}
                                            </span>
                                            {page.url && <Link url={page.url}>#{page.number ?? 'incident'}</Link>}
                                            {OPEN.includes(page.status) && page.id && (
                                                <button type="button" className="ghost" onClick={() => post({ type: 'resolve_page', key: page.key })}>
                                                    Resolve
                                                </button>
                                            )}
                                        </div>
                                        {page.error && <p className="status-danger small">{page.error}</p>}
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
