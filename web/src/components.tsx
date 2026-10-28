// One renderer per component in the library. The model picks which ones appear and in what order;
// it never writes markup. Model and web text is rendered as React text, and only http(s) links render.
import { type ReactNode, useEffect, useState } from 'react';

import type { ArtAsset, Component, ComponentType, Floor, Library, Sky, Source } from '../../shared/protocol.ts';
import { FloorPlan } from './floorplan.tsx';
import type { Event, Operator } from './station.ts';
import { artUrl } from './url.ts';

export interface Ctx {
    library: Library;
    art: Record<string, ArtAsset>;
    floor: Floor | null;
    sources: Source[];
    sky: Sky | null;
    operator: Operator;
    send: (event: Event) => void;
}

type Props<T extends ComponentType> = Extract<Component, { type: T }>['props'];

export const TITLES: Record<ComponentType, string> = {
    ThreatBanner: 'Threat',
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

const WIDE = new Set<ComponentType>(['ThreatBanner', 'FloorPlan', 'CountermeasurePicker', 'SkyClock']);

export function domain(url: string): string {
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

export function Card({ index, component, ctx }: { index: number; component: Component; ctx: Ctx }) {
    const extra =
        component.type === 'ThreatBanner' ? `threat sev-${component.props.severity}` : component.type === 'FloorPlan' ? 'floor' : component.type === 'EMFGauge' ? 'gauge' : '';
    return (
        <article className={`card ${WIDE.has(component.type) ? 'wide' : ''} ${extra}`}>
            <header>
                <h3>{TITLES[component.type] ?? component.type}</h3>
                <span className="order">
                    #{index + 1} {component.type}
                </span>
            </header>
            {component.why && <p className="why">{component.why}</p>}
            <Body component={component} ctx={ctx} />
        </article>
    );
}

function Body({ component: c, ctx }: { component: Component; ctx: Ctx }) {
    switch (c.type) {
        case 'ThreatBanner':
            return (
                <div>
                    <div className="headline">{c.props.headline}</div>
                    <div className="directive">{c.props.directive}</div>
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
            return (
                <ul className="systems">
                    {c.props.systems.map((s) => (
                        <li key={s.name}>
                            <span>{s.name}</span>
                            <b className={s.status}>{s.status}</b>
                        </li>
                    ))}
                </ul>
            );
        case 'SkyClock':
            return <SkyClock p={c.props} ctx={ctx} />;
        case 'EntityCard': {
            const asset = ctx.art[c.props.image];
            return (
                <figure className="entity">
                    {asset && <img src={artUrl(asset.file)} alt={asset.alt} loading="lazy" />}
                    <figcaption>
                        <span className={`pill verdict-${c.props.verdict}`}>{c.props.verdict}</span> {c.props.caption}
                    </figcaption>
                </figure>
            );
        }
        case 'SourceLedger': {
            const cited = c.props.cited.length ? c.props.cited : ctx.sources.map((s) => s.n);
            return (
                <ol className="ledger">
                    {cited.map((n) => {
                        const s = ctx.sources.find((x) => x.n === n);
                        return s ? (
                            <li key={n} value={n}>
                                <Link url={s.url}>{s.title}</Link>
                                <p>{(s.snippet || s.description).slice(0, 220)}</p>
                            </li>
                        ) : null;
                    })}
                </ol>
            );
        }
    }
}

function Gauge(p: Props<'EMFGauge'>) {
    const max = Math.max(100, Math.ceil(Math.max(p.value_mg * 1.3, p.threshold_mg * 2) / 50) * 50);
    const pt = (f: number, r = 80) => [100 - r * Math.cos(Math.PI * f), 100 - r * Math.sin(Math.PI * f)];
    const arc = (a: number, b: number, color: string) => {
        const [x1, y1] = pt(a);
        const [x2, y2] = pt(b);
        return <path d={`M${x1} ${y1} A80 80 0 0 1 ${x2} ${y2}`} stroke={color} strokeWidth={14} fill="none" />;
    };
    const th = Math.min(p.threshold_mg / max, 1);
    const v = Math.min(p.value_mg / max, 1);
    const [tx, ty] = pt(th, 96);
    const arrow = { rising: '▲', falling: '▼', steady: '▶' }[p.trend];
    return (
        <div className={`status-${p.status}`}>
            <svg viewBox="0 0 200 112" role="img" aria-label={`EMF ${p.value_mg} milligauss, danger above ${p.threshold_mg}`}>
                {arc(0, th * 0.5, '#4ade80')}
                {arc(th * 0.5, th, '#ffb547')}
                {arc(th, 1, '#ff4d6d')}
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

function Thermal(p: Props<'ThermalReadout'>) {
    const delta = p.temperature_c - p.baseline_c;
    const pct = (t: number) => Math.max(0, Math.min(100, ((t + 20) / 60) * 100));
    return (
        <div className="thermo">
            <div className="bar">
                <span style={{ width: `${pct(p.temperature_c)}%` }} />
            </div>
            <b className={`status-${p.status}`}>{p.temperature_c} °C</b>
            <div className="bar">
                <span style={{ width: `${pct(p.baseline_c)}%`, opacity: 0.45 }} />
            </div>
            <span className="muted">baseline {p.baseline_c} °C</span>
            <div className="muted small">
                {delta > 0 ? '+' : ''}
                {delta.toFixed(1)} °C against the room
            </div>
        </div>
    );
}

function Civilians({ p, ctx }: { p: Props<'CivilianTracker'>; ctx: Ctx }) {
    const shown = Math.min(p.count, 24);
    const extracted = ctx.operator.extracted;
    return (
        <div>
            <div className="people">
                {Array.from({ length: shown }, (_, i) => {
                    const safe = extracted.includes(i);
                    return (
                        <button
                            key={i}
                            type="button"
                            className={`person ${safe ? 'safe' : ''}`}
                            aria-pressed={safe}
                            aria-label={`Person ${i + 1}: ${safe ? 'extracted' : 'mark extracted'}`}
                            title="Mark extracted"
                            onClick={() => ctx.send({ type: 'toggle-person', index: i })}
                        >
                            {safe ? '✓' : '☺'}
                        </button>
                    );
                })}
                {p.count > shown && <span className="muted">+{p.count - shown}</span>}
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
                    <b>{extracted.length}</b> of {shown}
                </dd>
            </dl>
        </div>
    );
}

const LEVELS = { strong: 4, moderate: 3, weak: 2, unproven: 1 };

function Picker({ p, ctx }: { p: Props<'CountermeasurePicker'>; ctx: Ctx }) {
    return (
        <div>
            <div className="muted small spaced">Target: {p.target_entity}. Pick one to dispatch.</div>
            <div className="options">
                {p.options.map((o) => {
                    const src = ctx.sources.find((s) => s.n === o.source);
                    return (
                        <label key={o.id} className="option">
                            <input
                                type="radio"
                                name="countermeasure"
                                value={o.id}
                                checked={ctx.operator.countermeasure === o.id}
                                onChange={() => ctx.send({ type: 'countermeasure', id: o.id })}
                            />
                            <div className="name">
                                {ctx.art[ctx.library.arsenal_icons[o.id]] && (
                                    <img className="icon" src={artUrl(ctx.art[ctx.library.arsenal_icons[o.id]].file)} alt="" aria-hidden="true" />
                                )}
                                {ctx.library.arsenal[o.id] ?? o.id}
                                <span className="support" title={`${o.support} support in the sources`}>
                                    {[1, 2, 3, 4].map((n) => (
                                        <i key={n} className={n <= LEVELS[o.support] ? 'on' : ''} />
                                    ))}
                                </span>
                                <span className="muted small">{o.support}</span>
                                {o.id === p.recommended && <span className="tag">recommended</span>}
                            </div>
                            <div className="why-cm">
                                {o.rationale}{' '}
                                {src ? (
                                    <Link url={src.url}>
                                        [{src.n}] {domain(src.url)}
                                    </Link>
                                ) : (
                                    <span>(no source)</span>
                                )}
                            </div>
                        </label>
                    );
                })}
            </div>
        </div>
    );
}

/** "in 7 min", "in 1 h 47 min", "in 6:42" in the last ten minutes of live time, or "12 min ago". */
function countdown(ms: number, live: boolean): string {
    const minutes = Math.round(ms / 60000);
    if (ms < 0) return minutes === 0 ? 'now' : `${-minutes} min ago`;
    if (live && ms < 10 * 60000) return `in ${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;
    return minutes >= 60 ? `in ${Math.floor(minutes / 60)} h ${minutes % 60} min` : `in ${minutes} min`;
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
            <circle cx={20} cy={20} r={r} fill="var(--panel-2)" stroke="var(--line)" />
            <path d={`M20 2 A${r} ${r} 0 0 ${edge} 20 38 A${rx} ${r} 0 0 ${terminator} 20 2`} fill="#f5e9c8" />
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
    const cited = p.cited.map((n) => ctx.sources.find((s) => s.n === n)).filter((s): s is Source => Boolean(s));
    const hero = ctx.art.hero_moonrise;
    return (
        <div className="sky" style={hero ? { backgroundImage: `linear-gradient(90deg, var(--panel) 35%, transparent), url(${artUrl(hero.file)})` } : undefined}>
            <div className="sky-head">
                <span className="warning">{p.warning}</span>
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
                            <span className="muted small" title={e.source === 'wttr.in' ? `suncalc computed ${e.computed}` : 'computed offline'}>
                                {e.source === 'wttr.in' ? 'wttr.in' : 'computed'}
                            </span>
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
