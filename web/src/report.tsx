// The incident report panel above the station: the raw report the station is built from, and the controls
// that pick it. In a scenario they step back and on or jump to any step; the "Single incidents" menu picks
// a standalone incident or opens a box to paste a new report.
import { useEffect, useRef, useState } from 'react';

import type { ClientMessage, FixtureIncident, OperatorMoves, Scenario } from '../../shared/protocol.ts';
import { squares } from './components.tsx';
import { EvidenceLegend, EvidenceText } from './evidence.tsx';
import type { State } from './station.ts';

export type CompileRequest = Omit<Extract<ClientMessage, { type: 'compile' }>, 'type'>;

/** A feed tier as words: CRITICAL_HAUNT reads "critical haunt". */
export const tier = (raw: string) => raw.replace(/_/g, ' ').toLowerCase();

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

/** What the operator did on the step on screen. It is sent on with the next step, so that step's station builds on it. */
function movesOn(state: State, current: FixtureIncident): OperatorMoves {
    const { operator } = state;
    const tracker = state.components.find((c) => c?.type === 'CivilianTracker');
    const count = tracker?.type === 'CivilianTracker' ? tracker.props.count : null;
    return {
        step: current.incident_id,
        time: current.time ?? '',
        countermeasure: operator.countermeasure,
        sealed: operator.sealed,
        people_out: count === null ? 0 : squares(count, operator.extracted).people,
        people: count,
        // Every call still standing, from any step: the expert is on the way, so the next station knows.
        experts: state.pages
            .filter((p) => ['sending', 'triggered', 'acknowledged', 'off'].includes(p.status))
            .map((p) => ({ expert: p.expert, status: p.status, by: p.acknowledged_by })),
    };
}

/**
 * - `scenario` is the scenario the station on screen belongs to (else the first one), and `current` its step on screen.
 * - `running` is true while a run streams; the controls stay focusable (aria-disabled), so stepping by keyboard is one key per step.
 */
export function ReportPanel({
    state,
    scenario,
    current,
    running,
    compile,
}: {
    state: State;
    scenario: Scenario | undefined;
    current: FixtureIncident | undefined;
    running: boolean;
    compile: (request: CompileRequest) => void;
}) {
    const { incident, library } = state;
    // Several viewers share one station. This tab steps from the step it last asked for, not from
    // whatever run another viewer started.
    const [cursor, setCursor] = useState<string | null>(null);
    const [lastStep, setLastStep] = useState<string | null>(null); // the scenario step to go back to from a single incident
    const [menuOpen, setMenuOpen] = useState(false);
    const [composing, setComposing] = useState(false); // the panel shows the paste box for a new incident
    const [raw, setRaw] = useState('');
    const menu = useRef<HTMLDivElement>(null);
    const menuList = useRef<HTMLUListElement>(null);

    // The panel shows the step or incident this tab picked, from the fixtures, so its text is there before the run.
    const picked = cursor ?? incident?.incident_id ?? ''; // '' after a paste, which has no incident id
    const pickedFixture = [...state.scenarios.flatMap((s) => s.steps), ...state.incidents].find((x) => x.incident_id === picked);
    // The scenario of the picked step, so picking a step of another scenario switches the stepper at once.
    const shown = state.scenarios.find((s) => s.steps.some((step) => step.incident_id === picked)) ?? scenario;
    const pickedStep = shown?.steps.find((step) => step.incident_id === picked);
    // This tab's own place in the scenario: the step it last asked for, else the step on screen.
    const mine = pickedStep ?? current;
    // From a single incident or a pasted report, Back returns to the scenario step this tab was last on.
    const backTo = state.scenarios.flatMap((s) => s.steps).find((step) => step.incident_id === lastStep) ?? scenario?.steps[0];
    const backScenario = state.scenarios.find((s) => s.steps.includes(backTo!));

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

    const compileId = (id: string) => {
        setCursor(id);
        // Only a step later in the same scenario builds on the moves; going back or elsewhere starts clean.
        const target = scenario?.steps.find((step) => step.incident_id === id);
        const moves = target && current && state.manifest && target.step! > current.step! ? movesOn(state, current) : undefined;
        compile({ incident_id: id, moves });
    };

    const text = pickedFixture?.raw_incident_stream ?? (cursor === '' ? raw.trim() : incident?.raw) ?? 'The raw report appears here.';
    // The intake's quotes mark the report only when it is the one the station on screen was built from.
    const quotes = incident && incident.raw === text ? (incident.incident.evidence_quotes ?? []) : [];

    // The step or incident this tab picked and its feed tier, plus the step on screen when this tab picked another.
    const heading = composing
        ? 'New incident: paste a report'
        : [
              pickedStep && shown
                  ? `${shown.title} · step ${pickedStep.step} of ${shown.steps.length} · ${pickedStep.time}`
                  : pickedFixture
                    ? pickedFixture.incident_id
                    : incident
                      ? 'Pasted report'
                      : 'Waiting for an incident',
              pickedFixture ? ` · feed tier ${tier(pickedFixture.severity_tier)}` : '',
              pickedFixture?.source === 'simulated' ? ' · simulated' : '',
              current && mine && mine !== current ? ` · on screen: step ${current.step}` : '',
          ].join('');

    return (
        <section className="panel report" aria-labelledby="report-title">
            <div className="report-head">
                <h2 id="report-title">Incident report</h2>
                <span className="muted small">{heading}</span>
            </div>
            {state.remembered > 0 && (
                <p className="moves small">
                    Reading this report with what the {state.remembered} earlier {state.remembered === 1 ? 'step' : 'steps'} of this scenario found.
                </p>
            )}
            {state.moves && library && (
                <p className="moves small">
                    Building on your moves at {state.moves.time}:{' '}
                    {[
                        state.moves.countermeasure ? (library.arsenal[state.moves.countermeasure] ?? state.moves.countermeasure) : 'no countermeasure picked',
                        state.moves.sealed.length ? `sealed ${state.moves.sealed.map((id) => library.sectors[id] ?? id).join(', ')}` : 'nothing sealed',
                        state.moves.people !== null ? `${state.moves.people_out} of ${state.moves.people} people out` : '',
                        ...(state.moves.experts ?? []).map((e) => `${library.experts[e.expert]?.label ?? e.expert} called (${e.status === 'off' ? 'paging off' : e.status})`),
                    ]
                        .filter(Boolean)
                        .join(' · ')}
                </p>
            )}
            <div className="report-nav">
                {shown && pickedStep && !composing ? (
                    <>
                        <button
                            type="button"
                            className="ghost"
                            disabled={!mine || mine.step === 1}
                            aria-disabled={running}
                            onClick={() => !running && mine && compileId(shown.steps[mine.step! - 2].incident_id)}
                        >
                            ◀ Previous
                        </button>
                        <select aria-label="Scenario and step" value={picked} aria-disabled={running} onChange={(e) => !running && compileId(e.target.value)}>
                            {state.scenarios.map((s) => (
                                <optgroup key={s.id} label={s.title}>
                                    {s.steps.map((step) => (
                                        <option key={step.incident_id} value={step.incident_id}>
                                            {`${step.step}. ${step.time} · ${stepLabel(step.raw_incident_stream)}`}
                                        </option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                        <button
                            type="button"
                            className="next"
                            aria-disabled={running || mine?.step === shown.steps.length}
                            onClick={() => !running && mine?.step !== shown.steps.length && compileId(shown.steps[mine ? mine.step! : 0].incident_id)}
                        >
                            Next step ▶
                        </button>
                    </>
                ) : (
                    backScenario &&
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
                            ◀ Back to {backScenario.title}, step {backTo.step}
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
                        compile({ raw: raw.trim() });
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
                <>
                    <blockquote className="report-text">
                        <EvidenceText text={text} quotes={quotes} />
                    </blockquote>
                    {quotes.length > 0 && <EvidenceLegend quotes={quotes} />}
                </>
            )}
        </section>
    );
}
