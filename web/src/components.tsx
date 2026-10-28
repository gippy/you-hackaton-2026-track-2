// One renderer per component in the library. The model picks which ones appear and in what order;
// it never writes markup. Model and web text is rendered as React text, and only http(s) links render.
import { Component as ReactComponent, type ReactNode, useEffect, useState } from 'react';

import type { Action, ArtAsset, Component, ComponentType, Floor, Incident, Library, Sky, SkyEvent, Source } from '../../shared/protocol.ts';
import { FloorPlan, mapView } from './floorplan.tsx';
import type { Event, Operator } from './station.ts';
import { artUrl } from './url.ts';

export interface Ctx {
    library: Library;
    art: Record<string, ArtAsset>;
    floor: Floor | null;
    sources: Source[];
    /** Numbers of the sources the plan relies on: cited by the ledger, a countermeasure or the sky clock. */
    cited: Set<number>;
    sky: Sky | null;
    /** The intake's incident, the step's clock ("19:33", or empty) and the model's recommended action. */
    incident: Incident | null;
    clock: string;
    action: Action | null;
    operator: Operator;
    send: (event: Event) => void;
}

type Props<T extends ComponentType> = Extract<Component, { type: T }>['props'];

const TITLES: Record<ComponentType, string> = {
    ThreatBanner: 'Incident',
    EMFGauge: 'EMF field',
    ThermalReadout: 'Thermal',
    FloorPlan: 'Loft floor plan',
    CivilianTracker: 'Civilians',
    CountermeasurePicker: 'Countermeasures',
    SystemsBoard: 'Facility systems',
    SourceLedger: 'Grounding',
    SkyClock: 'Sky clock',
    EntityCard: 'Entity',
};

function domain(url: string): string {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return '';
    }
}

export function Link({ url, children }: { url: string; children?: ReactNode }) {
    try {
        const u = new URL(url);
        if (u.protocol === 'http:' || u.protocol === 'https:') {
            return (
                <a href={u.href} target="_blank" rel="noopener noreferrer">
                    {children ?? u.hostname}
                </a>
            );
        }
    } catch {
        /* not a URL */
    }
    return <span>{children ?? url}</span>;
}

/** One panel failing to render shows a small notice instead of blanking the whole station. */
export class PanelBoundary extends ReactComponent<{ name: string; children: ReactNode }, { failed: boolean }> {
    state = { failed: false };
    static getDerivedStateFromError() {
        return { failed: true };
    }
    componentDidCatch(error: unknown) {
        console.error(`The ${this.props.name} panel failed to render`, error);
    }
    render() {
        return this.state.failed ? <p className="muted">Panel unavailable.</p> : this.props.children;
    }
}

const VERDICT = { real_threat: 'Real', harmless: 'Harmless', unclear: 'Unclear' } as const;

/**
 * The incident at a glance: what, where, when and who is at risk on one line, the intake's verdict and
 * the recommended action as chips, and one sentence of what to do. Built from the intake's own fields.
 */
export function IncidentHead({ incident, ctx, action, directive }: { incident: Incident; ctx: Ctx; action: Action | null; directive: string }) {
    const people = incident.people_in_reach ?? incident.civilians?.count;
    const harmless = incident.verdict === 'harmless';
    // The detail in parentheses is in the directive and the report; the headline stays one or two lines.
    const entity = incident.entity.replace(/\s*\([^)]*\)/g, '');
    const parts = [
        harmless ? `False alarm: ${entity}` : entity,
        ctx.library.sectors[incident.sector] ?? incident.sector,
        ctx.clock,
        people === undefined ? '' : people > 0 ? `${people} ${harmless ? 'nearby' : 'people'}` : 'no one in reach',
    ];
    return (
        <div className="incident-head">
            <div className="headline-row">
                <div className="headline">{parts.filter(Boolean).join(' · ')}</div>
                <div className="chips">
                    {incident.verdict && <span className={`chip verdict-${incident.verdict}`}>{VERDICT[incident.verdict]}</span>}
                    <span className={`chip action-${action ?? 'pending'}`}>{action ?? 'deciding…'}</span>
                </div>
            </div>
            {directive && <p className="directive">{directive}</p>}
        </div>
    );
}

/** One component as a terminal window. `span` and `tall` come from layout.ts, within the bounds it sets for the model's size. */
export function Card({ index, component, ctx, span, tall }: { index: number; component: Component; ctx: Ctx; span: number; tall: boolean }) {
    // The model's title for this incident, else the panel's own name; the area map is always "Around the tower".
    const title = component.type === 'FloorPlan' && mapView(component.props, ctx) === 'area' ? 'Around the tower' : component.props?.title || TITLES[component.type];
    const extra =
        component.type === 'ThreatBanner' ? `threat sev-${component.props?.severity}` : component.type === 'FloorPlan' ? 'floor' : component.type === 'EMFGauge' ? 'gauge' : '';
    return (
        <article className={`card ${extra}`} style={{ gridColumn: `span ${span}`, gridRow: tall ? 'span 2' : undefined }}>
            {/* The incident headline is the panel's own title, so its frame header is for screen readers only. */}
            <header title={component.why} className={component.type === 'ThreatBanner' ? 'sr-only' : undefined}>
                <h3>
                    {title !== TITLES[component.type] && <span className="sr-only">{`${TITLES[component.type]}: `}</span>}
                    {title}
                </h3>
                <span className="order" title={component.type}>
                    #{index + 1}
                </span>
            </header>
            {component.why && <p className="why">{component.why}</p>}
            <PanelBoundary name={component.type}>
                <Body component={component} ctx={ctx} />
            </PanelBoundary>
        </article>
    );
}

function Body({ component: c, ctx }: { component: Component; ctx: Ctx }) {
    switch (c.type) {
        case 'ThreatBanner':
            return ctx.incident ? (
                <IncidentHead incident={ctx.incident} ctx={ctx} action={ctx.action} directive={c.props.directive} />
            ) : (
                <div className="incident-head">
                    <p className="directive">{c.props.directive}</p>
                </div>
            );
        case 'EMFGauge':
            return <Gauge {...c.props} />;
        case 'ThermalReadout':
            return <Thermal {...c.props} />;
        case 'FloorPlan':
            return <FloorPlan p={c.props} ctx={ctx} />;
        case 'CivilianTracker':
            return <Civilians p={c.props} ctx={ctx} />;
        case 'CountermeasurePicker':
            return <Picker p={c.props} ctx={ctx} />;
        case 'SystemsBoard':
            return <Systems systems={c.props.systems} />;
        case 'SkyClock':
            return <SkyClock p={c.props} ctx={ctx} />;
        case 'EntityCard': {
            const asset = ctx.art[c.props.image];
            return (
                <figure className="entity">
                    {asset && (
                        <span className="framed-img">
                            <img src={artUrl(asset)} alt={asset.alt} loading="lazy" />
                        </span>
                    )}
                    <figcaption>
                        <span className={`pill verdict-${c.props.verdict}`}>{c.props.verdict}</span> {c.props.caption}
                    </figcaption>
                </figure>
            );
        }
        case 'SourceLedger':
            return <Ledger cited={new Set([...c.props.cited, ...ctx.cited])} sources={ctx.sources} />;
    }
}

function Gauge(p: Props<'EMFGauge'>) {
    // The scale fits the reading and the threshold: steps of 10 up to 50 mG, then steps of 50.
    const top = Math.max(p.value_mg * 1.3, p.threshold_mg * 2, 10);
    const step = top > 50 ? 50 : 10;
    const max = Math.ceil(top / step) * step;
    const pt = (f: number, r = 80) => [100 - r * Math.cos(Math.PI * f), 100 - r * Math.sin(Math.PI * f)];
    const arc = (a: number, b: number, color: string) => {
        const [x1, y1] = pt(a);
        const [x2, y2] = pt(b);
        return <path d={`M${x1} ${y1} A80 80 0 0 1 ${x2} ${y2}`} style={{ stroke: color }} strokeWidth={14} fill="none" />;
    };
    const th = Math.min(p.threshold_mg / max, 1);
    const v = Math.min(p.value_mg / max, 1);
    const [tx, ty] = pt(th, 96);
    const arrow = { rising: '▲', falling: '▼', steady: '▶' }[p.trend];
    return (
        <div className={`status-${p.status}`}>
            <svg viewBox="0 0 200 112" role="img" aria-label={`EMF ${p.value_mg} milligauss, danger above ${p.threshold_mg}`}>
                {arc(0, th * 0.5, 'var(--dim)')}
                {arc(th * 0.5, th, 'var(--amber)')}
                {arc(th, 1, 'var(--red)')}
                <text x={tx} y={ty} textAnchor="middle" fontSize={9} fill="currentColor">
                    {p.threshold_mg}
                </text>
                <g className="needle" style={{ transform: `rotate(${-90 + 180 * v}deg)` }}>
                    <line x1={100} y1={100} x2={100} y2={32} stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
                    <circle cx={100} cy={100} r={6} fill="currentColor" />
                </g>
            </svg>
            <div className="readout">
                <span className="big">{p.value_mg}</span>
                <span>
                    mG {arrow} {p.trend}
                </span>
            </div>
            <div className="muted small center">
                danger above {p.threshold_mg} mG · scale 0 to {max}
            </div>
        </div>
    );
}

/** The reading against its normal (room, body or skin). The normal is null when the report states none. */
function Thermal(p: Props<'ThermalReadout'>) {
    const normal = typeof p.baseline_c === 'number' ? p.baseline_c : null;
    const delta = normal === null ? null : p.temperature_c - normal;
    const pct = (t: number) => Math.max(0, Math.min(100, ((t + 20) / 60) * 100));
    return (
        <div className="thermo">
            <div className="thermo-row">
                <div className="bar">
                    <span style={{ width: `${pct(p.temperature_c)}%` }} />
                </div>
                <b className={`status-${p.status}`}>{p.temperature_c} °C</b>
            </div>
            {normal !== null && (
                <div className="thermo-row">
                    <div className="bar">
                        <span style={{ width: `${pct(normal)}%`, opacity: 0.45 }} />
                    </div>
                    <span className="muted">normal {normal} °C</span>
                </div>
            )}
            <div className="muted small delta">
                {delta === null ? 'The report gives no normal to compare with' : `${delta > 0 ? '+' : ''}${delta.toFixed(1)} °C against normal`}
            </div>
        </div>
    );
}

const MAX_SQUARES = 24;

/** The tracker's squares: up to 24, one per person in a small group, else one per equal share of the crowd (the last takes the rest). */
export function squares(count: number, extracted: number[]) {
    const per = Math.max(1, Math.ceil(count / MAX_SQUARES));
    const total = Math.ceil(count / per);
    const size = (i: number) => Math.min(per, count - i * per);
    const out = extracted.filter((i) => i < total);
    return { per, total, size, out, people: out.reduce((sum, i) => sum + size(i), 0) };
}

function Civilians({ p, ctx }: { p: Props<'CivilianTracker'>; ctx: Ctx }) {
    const { per, total, size, out: extracted, people: out } = squares(p.count, ctx.operator.extracted);
    return (
        <div>
            <div className="muted small">{per > 1 ? `Each square is ${per} people. Click one when they are out.` : 'Click a person when they are out.'}</div>
            <div className="people">
                {Array.from({ length: total }, (_, i) => {
                    const safe = extracted.includes(i);
                    return (
                        <button
                            key={i}
                            type="button"
                            className={`person ${safe ? 'safe' : ''}`}
                            aria-pressed={safe}
                            aria-label={per > 1 ? `Group ${i + 1}, ${size(i)} people` : `Person ${i + 1}`}
                            title="Mark extracted"
                            onClick={() => ctx.send({ type: 'toggle-person', index: i })}
                        >
                            {safe ? '✓' : per > 1 ? size(i) : '☺'}
                        </button>
                    );
                })}
            </div>
            <dl className="kv">
                <dt>Count</dt>
                <dd>{p.count}</dd>
                <dt>Where</dt>
                <dd>{p.location}</dd>
                <dt>Condition</dt>
                <dd>{p.condition}</dd>
                <dt>Priority</dt>
                <dd className={p.priority === 'immediate' ? 'status-danger' : ''}>{p.priority}</dd>
                <dt>Extracted</dt>
                <dd>
                    <b>{out}</b> of {p.count}
                </dd>
            </dl>
        </div>
    );
}

const LEVELS = { strong: 3, moderate: 2, weak: 1, unproven: 0 };
// A target that only names a playbook class or says unknown tells the operator nothing.
const VAGUE_TARGET = new Set(['', 'unknown', 'corporeal', 'spectral', 'anomalous', 'entity']);

function Picker({ p, ctx }: { p: Props<'CountermeasurePicker'>; ctx: Ctx }) {
    const vague = p.target_entity.toLowerCase().split(/\s+/).every((w) => VAGUE_TARGET.has(w));
    return (
        <div>
            <div className="muted small spaced">{vague ? 'Pick one for the expert.' : `Target: ${p.target_entity}. Pick one for the expert.`}</div>
            <fieldset className="options">
                <legend className="sr-only">Countermeasure for the expert</legend>
                {p.options.map((o) => {
                    const src = ctx.sources.find((s) => s.n === o.source);
                    const icon = ctx.art[ctx.library.arsenal_icons[o.id]];
                    return (
                        <div key={o.id} className="option">
                            <label>
                                <input
                                    type="radio"
                                    name="countermeasure"
                                    value={o.id}
                                    checked={ctx.operator.countermeasure === o.id}
                                    onChange={() => ctx.send({ type: 'countermeasure', id: o.id })}
                                />
                                <span className="name">
                                    {icon && <img className="icon" src={artUrl(icon)} alt="" aria-hidden="true" />}
                                    {ctx.library.arsenal[o.id] ?? o.id}
                                </span>
                                {o.id === p.recommended && <span className="tag">recommended</span>}
                            </label>
                            <div className="why-cm">
                                <span className="meter">
                                    <span className="support" aria-hidden="true">
                                        {[1, 2, 3].map((n) => (
                                            <i key={n} className={n <= LEVELS[o.support] ? 'on' : ''} />
                                        ))}
                                    </span>
                                    {o.support} support
                                </span>
                                {o.rationale}{' '}
                                {src ? (
                                    <span className="cite" title={src.title}>
                                        <Link url={src.url}>
                                            [{src.n}] {domain(src.url)}
                                        </Link>
                                    </span>
                                ) : (
                                    <span>(no source)</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </fieldset>
        </div>
    );
}

const STATUS_ORDER = { offline: 0, degraded: 1, online: 2 };

/** "rear_exit_door_R2" reads as "Rear exit door R2". */
function systemName(name: string): string {
    const s = name.replace(/_/g, ' ').trim();
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function Systems({ systems }: { systems: Props<'SystemsBoard'>['systems'] }) {
    // Broken systems first, so the eye lands on what is down.
    const sorted = [...systems].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
    return (
        <ul className="systems">
            {sorted.map((s, i) => (
                <li key={i} className={s.status}>
                    <span>{systemName(s.name)}</span>
                    <b>{s.status}</b>
                </li>
            ))}
        </ul>
    );
}

/** "in 7 min", "in 1 h 47 min", "in 6:42" in the last ten minutes of live time, or "12 min ago". */
function countdown(ms: number, live: boolean): string {
    const minutes = Math.round(ms / 60000);
    if (ms < 0) return minutes === 0 ? 'now' : `${-minutes} min ago`;
    if (live && ms < 10 * 60000) return `in ${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;
    return minutes >= 60 ? `in ${Math.floor(minutes / 60)} h ${minutes % 60} min` : `in ${minutes} min`;
}

const LEAD_MINUTES = 30; // a sky event gets a warning this long before it
const AFTER_MINUTES = 10; // and keeps saying "now" this long after

/**
 * The sky events from half an hour ahead of `reference` to just past it, each with what to do as it nears.
 * The model's focus event is listed however far ahead it is, with the model's own warning as its order;
 * the library's advice covers the other events.
 */
function skyWarnings(
    sky: Sky,
    reference: number,
    advice: Library['sky_advice'],
    focus: SkyEvent['id'],
    warning: string,
): { event: SkyEvent; minutes: number; todo: string }[] {
    return sky.events.flatMap((event) => {
        const minutes = Math.round((Date.parse(event.at) - reference) / 60000);
        const focused = event.id === focus;
        if (!event.at || minutes < -AFTER_MINUTES || (minutes > LEAD_MINUTES && !focused)) return [];
        return [{ event, minutes, todo: (focused && warning) || (advice?.[event.id] ?? '') }];
    });
}

/** The moon's lit part: waning lights the left side and waxing the right, as seen from the northern hemisphere. */
function Moon({ illumination, phase }: { illumination: number; phase: string }) {
    const f = Math.max(0, Math.min(1, illumination / 100));
    const r = 18;
    const rx = r * Math.abs(2 * f - 1);
    const waning = /waning|last/i.test(phase);
    const gibbous = f > 0.5;
    const edge = waning ? 0 : 1; // the lit side's outer edge
    const terminator = gibbous === waning ? 0 : 1;
    return (
        <svg viewBox="0 0 40 40" className="moon" role="img" aria-label={`${phase}, ${illumination}% lit`}>
            <circle cx={20} cy={20} r={r} className="moon-dark" />
            <path d={`M20 2 A${r} ${r} 0 0 ${edge} 20 38 A${rx} ${r} 0 0 ${terminator} 20 2`} className="moon-lit" />
        </svg>
    );
}

function SkyClock({ p, ctx }: { p: Props<'SkyClock'>; ctx: Ctx }) {
    const sky = ctx.sky;
    const [mode, setMode] = useState<'scenario' | 'live'>(sky?.clock ? 'scenario' : 'live');
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (mode !== 'live') return;
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, [mode]);
    if (!sky) return <p className="muted">No sky data for this run.</p>;
    const reference = mode === 'scenario' && sky.clock_at ? Date.parse(sky.clock_at) : now;
    const warnings = skyWarnings(sky, reference, ctx.library.sky_advice, p.focus, p.warning);
    const cited = p.cited.map((n) => ctx.sources.find((s) => s.n === n)).filter((s): s is Source => Boolean(s));
    const hero = ctx.art.hero_moonrise;
    return (
        <div className="sky" style={hero ? { backgroundImage: `linear-gradient(90deg, var(--panel) 40%, transparent), url(${artUrl(hero)})` } : undefined}>
            <div className="sky-head">
                <span className="seg" role="group" aria-label="Count down from">
                    {sky.clock && (
                        <button type="button" className={mode === 'scenario' ? 'on' : ''} aria-pressed={mode === 'scenario'} onClick={() => setMode('scenario')}>
                            Scenario {sky.clock}
                        </button>
                    )}
                    <button type="button" className={mode === 'live' ? 'on' : ''} aria-pressed={mode === 'live'} onClick={() => setMode('live')}>
                        Live now
                    </button>
                </span>
            </div>
            <div className="sky-events">
                {sky.events.map((e) => {
                    const ms = Date.parse(e.at) - reference;
                    return (
                        <div key={e.id} className={`sky-event ${e.id === p.focus ? 'focus' : ''} ${ms < 0 ? 'passed' : ''}`}>
                            <span className="muted small">{e.label}</span>
                            <b className="time">{e.local}</b>
                            <span className="count">{countdown(ms, mode === 'live')}</span>
                        </div>
                    );
                })}
                <div className="sky-event moon-tile">
                    <Moon illumination={sky.moon.illumination} phase={sky.moon.phase} />
                    <span className="small">
                        {sky.moon.phase}, {sky.moon.illumination}% lit
                    </span>
                </div>
            </div>
            {warnings.length > 0 && (
                <ul className="sky-warnings">
                    {warnings.map((w) => (
                        <li key={w.event.id}>
                            <span className={`pill ${w.minutes <= 10 ? 'page-triggered' : 'muted'}`}>{w.minutes > 0 ? `T-${w.minutes}` : 'now'}</span>
                            <span>
                                {w.event.label} at {w.event.local}
                                {w.todo && ` · ${w.todo}`}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
            {cited.length > 0 && (
                <div className="muted small">
                    Sky sources:{' '}
                    {cited.map((s) => (
                        <span key={s.n}>
                            <Link url={s.url}>
                                [{s.n}] {domain(s.url)}
                            </Link>{' '}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}

/** The sources, compact: the five the plan leans on most as title and domain, the rest and the snippets on click. */
function Ledger({ cited, sources }: { cited: Set<number>; sources: Source[] }) {
    const ordered = [...sources].sort((a, b) => Number(cited.has(b.n)) - Number(cited.has(a.n)) || a.n - b.n);
    const item = (s: Source, snippet: boolean) => (
        <li key={s.n} className={cited.has(s.n) ? 'cited' : ''}>
            <span className="n">[{s.n}]</span>
            <Link url={s.url}>{s.title || domain(s.url)}</Link>
            <span className="domain">
                {domain(s.url)}
                {cited.has(s.n) ? ' · relied on' : ''}
            </span>
            {snippet && <p className="snippet">{s.snippet || s.description}</p>}
        </li>
    );
    if (!sources.length) return <p className="muted">No sources yet.</p>;
    return (
        <div className="ledger">
            <ol className="ledger-top">{ordered.slice(0, 5).map((s) => item(s, false))}</ol>
            <details>
                <summary>{ordered.length > 5 ? `All ${ordered.length} sources, with snippets` : 'Snippets'}</summary>
                <ol className="ledger-all">{ordered.map((s) => item(s, true))}</ol>
            </details>
        </div>
    );
}
