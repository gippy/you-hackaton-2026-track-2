// The left rail: the pipeline's four steps with their timings and search queries, and the facts the intake
// read from the report.
import type { StepId } from '../../shared/protocol.ts';
import { tier } from './report.tsx';
import type { State } from './station.ts';

export const STEPS: { id: StepId; label: string; partner: string }[] = [
    { id: 'ingest', label: 'Intake', partner: 'Parasail' },
    { id: 'triage', label: 'Route', partner: 'CrewAI Flow' },
    { id: 'ground', label: 'Ground', partner: 'CrewAI agent · You.com' },
    { id: 'compose', label: 'Compose', partner: 'Parasail stream' },
];

const VERDICT_WORD = { real_threat: 'Real threat', harmless: 'Harmless', unclear: 'Unclear' } as const;

/** "2 offline · 1 online": the systems an incident names, counted by status. */
function systemsSummary(systems: { status: string }[] = []): string {
    const counts = new Map<string, number>();
    for (const s of systems) counts.set(s.status, (counts.get(s.status) ?? 0) + 1);
    return [...counts].map(([status, n]) => `${n} ${status}`).join(' · ') || '—';
}

export function Rail({ state }: { state: State }) {
    const { incident, library } = state;
    return (
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
    );
}
