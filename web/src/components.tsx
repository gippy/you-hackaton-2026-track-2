// One renderer per component in the library. The model picks which ones appear and in what order;
// it never writes markup. Model and web text is rendered as React text, and only http(s) links render.
import type { ReactNode } from 'react';

import type { Component, ComponentType, Library, Source } from '../../shared/protocol.ts';
import type { Event, Operator } from './station.ts';

export interface Ctx {
    library: Library;
    sources: Source[];
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
};

const WIDE = new Set<ComponentType>(['ThreatBanner', 'FloorPlan', 'CountermeasurePicker']);

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

function FloorPlan({ p, ctx }: { p: Props<'FloorPlan'>; ctx: Ctx }) {
    const { layout, sectors } = ctx.library;
    const sealed = ctx.operator.sealed;
    const center = (id: string) => {
        const [x, y, w, h] = layout[id];
        return [x + w / 2, y + h / 2 + 12];
    };
    const start = p.safe_route.length ? center(p.safe_route[0]) : null;
    return (
        <div>
            <svg viewBox="0 0 600 360" role="img" aria-label={`Floor plan, hot sector ${sectors[p.hot_sector] ?? p.hot_sector}`}>
                <defs>
                    <pattern id="hatch" width={8} height={8} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                        <rect width={8} height={8} fill="var(--panel-2)" />
                        <line x1={0} y1={0} x2={0} y2={8} stroke="#ffb547" strokeWidth={3} />
                    </pattern>
                    <pattern id="hatch-hot" width={8} height={8} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                        <rect width={8} height={8} fill="#5a1622" />
                        <line x1={0} y1={0} x2={0} y2={8} stroke="#ff4d6d" strokeWidth={3} />
                    </pattern>
                </defs>
                {Object.entries(layout).map(([id, [x, y, w, h]]) => {
                    const toggle = () => ctx.send({ type: 'toggle-seal', sector: id });
                    return (
                        <g key={id}>
                            <rect
                                x={x + 3}
                                y={y + 3}
                                width={w - 6}
                                height={h - 6}
                                rx={6}
                                className={`sector ${id === p.hot_sector ? 'hot' : ''} ${sealed.includes(id) ? 'sealed' : ''}`}
                                tabIndex={0}
                                role="button"
                                aria-pressed={sealed.includes(id)}
                                aria-label={`${sectors[id]}: seal or unseal`}
                                onClick={toggle}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        toggle();
                                    }
                                }}
                            />
                            <text x={x + 12} y={y + 22}>
                                {sectors[id]}
                            </text>
                        </g>
                    );
                })}
                {p.safe_route.length > 1 && <polyline className="route" points={p.safe_route.map((id) => center(id).join(',')).join(' ')} />}
                {start && <circle cx={start[0]} cy={start[1]} r={7} fill="#4ade80" />}
            </svg>
            <div className="legend">
                <span>
                    <i style={{ background: '#ff4d6d' }} />
                    hot sector
                </span>
                <span>
                    <i style={{ background: '#ffb547' }} />
                    sealed (click a sector to change)
                </span>
                <span>
                    <i style={{ background: '#4ade80' }} />
                    {p.safe_route.length ? `safe route: ${p.safe_route.map((id) => sectors[id]).join(' → ')}` : 'no safe route given'}
                </span>
            </div>
            <div className="muted small">{sealed.length ? `Sealed: ${sealed.map((id) => sectors[id] ?? id).join(', ')}` : 'No sectors sealed.'}</div>
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
