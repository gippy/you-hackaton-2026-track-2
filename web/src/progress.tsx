// The "building the station" panel shown for the whole of a live run: how long it has taken, which of the four
// pipeline phases is working (and with which partner), what it is doing now, and a plain line that the operator
// should wait while the panels stream in.
import { useEffect, useState } from 'react';

import { STEPS } from './rail.tsx';
import type { State } from './station.ts';

export function BuildProgress({ state }: { state: State }) {
    const [startedAt] = useState(() => Date.now());
    const [now, setNow] = useState(startedAt);
    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 100);
        return () => clearInterval(timer);
    }, []);
    // The phase at work: the first one that is not done yet.
    const current = STEPS.find((s) => state.steps[s.id]?.state !== 'done') ?? STEPS[STEPS.length - 1];
    const detail = state.steps[current.id]?.detail;
    const panels = state.components.filter(Boolean).length;
    return (
        <section className="build" role="status" aria-label="Building the station">
            <div className="build-head">
                <h2>Building the station</h2>
                <span className="build-clock">
                    {((now - startedAt) / 1000).toFixed(1)} s<span className="muted"> · usually 15 to 25 s</span>
                </span>
            </div>
            <p className="build-note">
                Hold on: the model is reading the report and building this station live.
                {panels > 0 ? ` ${panels} ${panels === 1 ? 'panel' : 'panels'} placed so far; the rest stream in below.` : ' Panels appear below as it writes them.'}
            </p>
            <ol className="build-steps">
                {STEPS.map((s) => {
                    const step = state.steps[s.id];
                    const phase = step?.state === 'done' ? 'done' : step?.state === 'failed' ? 'failed' : s === current ? 'running' : 'pending';
                    return (
                        <li key={s.id} className={`build-step ${phase}`} aria-current={phase === 'running' ? 'step' : undefined}>
                            <span className="build-mark" aria-hidden="true">
                                {phase === 'done' ? '✓' : phase === 'failed' ? '✕' : phase === 'running' ? '▶' : '·'}
                            </span>
                            <b>{s.label}</b>
                            <span className="build-partner">{s.partner}</span>
                            {phase === 'done' && step?.ms ? <span className="build-time">{(step.ms / 1000).toFixed(1)} s</span> : null}
                        </li>
                    );
                })}
            </ol>
            <div className="build-bar" aria-hidden="true">
                <span style={{ width: `${(STEPS.indexOf(current) + (state.steps[current.id] ? 0.5 : 0)) * 25}%` }} />
            </div>
            {detail && <p className="build-detail">{`> ${detail}`}</p>}
        </section>
    );
}
