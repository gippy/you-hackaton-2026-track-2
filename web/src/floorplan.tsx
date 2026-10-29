// The FloorPlan component's two views: the Loft's floor (a schematic from data/map/floor.json) and the
// blocks around the tower (OpenStreetMap, data/map/area.geojson). The model's manifest places every
// marker: the hot sector or outdoor spot, the sealed sectors, the route out, and what is where on the
// floor as small pictures (creatures, people, objects, countermeasures) with short notes.
import { useEffect, useId, useMemo, useState } from 'react';

import type { ArtAsset, Component, Floor, Marker } from '../../shared/protocol.ts';
import type { Ctx } from './components.tsx';
import { routeThrough, type ThroughRoute } from './route.ts';
import { artUrl, withToken } from './url.ts';

type Props = Extract<Component, { type: 'FloorPlan' }>['props'];
type Point = [number, number];

const CLOSE_M = 150; // the area view shows 150 metres around the tower

/** The view on screen: the operator's choice, else the model's. The card's title follows it. */
export const mapView = (p: Props, ctx: Ctx): 'floor' | 'area' => ctx.operator.map ?? (p.view === 'area' ? 'area' : 'floor');

export function FloorPlan({ p, ctx }: { p: Props; ctx: Ctx }) {
    const view = mapView(p, ctx);
    const setView = (v: 'floor' | 'area') => ctx.send({ type: 'map-view', view: v });
    const scene = p.scene && ctx.art[p.scene];
    return (
        <div className="floor">
            <div className="seg spaced" role="group" aria-label="Map view">
                <button type="button" className={view === 'floor' ? 'on' : ''} aria-pressed={view === 'floor'} onClick={() => setView('floor')}>
                    Floor
                </button>
                <button type="button" className={view === 'area' ? 'on' : ''} aria-pressed={view === 'area'} onClick={() => setView('area')}>
                    Around the tower
                </button>
            </div>
            {view === 'floor' ? <FloorView p={p} ctx={ctx} /> : <AreaView anchor={p.anchor && p.anchor !== 'none' ? p.anchor : null} />}
            {scene && (
                <figure className="scene">
                    <span className="framed-img">
                        <img src={artUrl(scene)} alt={scene.alt} loading="lazy" />
                    </span>
                    <figcaption className="muted small">{scene.alt}</figcaption>
                </figure>
            )}
        </div>
    );
}

// --- the floor ------------------------------------------------------------------------------

const points = (poly: Point[]) => poly.map(([x, y]) => `${x},${y}`).join(' ');

/**
 * The model's route through its sectors as a walkable line (route.ts): through the doors, round sealed
 * sectors, then out the last sector's exit. The start is where people are now, so it is never avoided.
 */
function walk(floor: Floor, aliases: Record<string, string>, route: string[], sealed: string[]): ThroughRoute | null {
    if (!route.length) return null;
    const slugOf = (id: string) => Object.entries(aliases).find(([, v]) => v === id)?.[0] ?? id;
    const slugs = route.map(slugOf);
    try {
        return routeThrough(floor, slugs, { avoid: sealed.map(slugOf).filter((s) => s !== slugs[0]), exit: true });
    } catch (err) {
        console.error('Could not walk the safe route', err);
        return null;
    }
}

// --- the model's notes on the floor -----------------------------------------------------------

type Box = [number, number, number, number]; // x0, y0, x1, y1
interface Placed {
    marker: Marker;
    at: Point; // the picture's centre
}

const MARK_SIZE = 3.4; // the hover label's height, the same as the zone labels
const CHAR_W = 0.42; // VT323's advance in ems, with a little room
const GLYPH = 2.6; // the radius of a marker's picture, and half the width of its fallback shape
const KIND_NAME: Record<Marker['kind'], string> = { threat: 'threat', people: 'people', countermeasure: 'countermeasure', hazard: 'hazard' };

const overlap = (a: Box, b: Box) => Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
const around = ([x, y]: Point, r: number): Box => [x - r, y - r, x + r, y + r];

function textBox([x, y]: Point, text: string, size: number, anchor: 'start' | 'middle' | 'end'): Box {
    const w = text.length * CHAR_W * size;
    const x0 = anchor === 'start' ? x : anchor === 'middle' ? x - w / 2 : x - w;
    return [x0, y - 0.8 * size, x0 + w, y + 0.2 * size];
}

function inside([x, y]: Point, poly: Point[]): boolean {
    let hit = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const [xi, yi] = poly[i];
        const [xj, yj] = poly[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
    }
    return hit;
}

/** Points every unit along the route, so a marker can keep off the line between its corners. */
function along(path: Point[]): Point[] {
    return path.flatMap((q, i) => {
        if (i === 0) return [q];
        const p = path[i - 1];
        const n = Math.max(1, Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1])));
        return Array.from({ length: n }, (_, k): Point => [p[0] + ((q[0] - p[0]) * (k + 1)) / n, p[1] + ((q[1] - p[1]) * (k + 1)) / n]);
    });
}

/**
 * A spot for each marker's picture (its label shows only on hover):
 * - the picture sits inside the marker's sector
 * - the spot overlaps the zone and block labels, the route, the exits and earlier markers the least
 * - among equal spots, the one nearest the sector's label wins
 */
function placeMarkers(floor: Floor, markers: Marker[], idOf: (slug: string) => string, path: Point[]): Placed[] {
    const { width, height } = floor.space;
    const taken: Box[] = [
        ...floor.zones.map((z) => textBox(z.label_at, z.label, 3.4, 'middle')),
        ...floor.blocks.map((b) => textBox(b.label_at, b.aws_name, 2.4, b.label_anchor)),
        ...along(path).map((q) => around(q, 1)),
        ...(path.length ? [around(path[0], 2.8), around(path[path.length - 1], 2.8)] : []),
        ...floor.features.filter((f) => f.exit).map((f) => around(f.at, 1.8)),
    ];
    const placed: Placed[] = [];
    for (const marker of markers) {
        const zone = floor.zones.find((z) => idOf(z.slug) === marker.sector);
        if (!zone) continue;
        const xs = zone.polygon.map((q) => q[0]);
        const ys = zone.polygon.map((q) => q[1]);
        let best: { score: number; at: Point; box: Box } | null = null;
        for (let x = Math.min(...xs) + GLYPH; x <= Math.max(...xs) - GLYPH; x += 1) {
            for (let y = Math.min(...ys) + GLYPH; y <= Math.max(...ys) - GLYPH; y += 1) {
                if (!inside([x, y], zone.polygon)) continue;
                const box = around([x, y], GLYPH + 0.3);
                if (box[0] < 0 || box[1] < 0 || box[2] > width || box[3] > height) continue;
                const hit = taken.reduce((sum, b) => sum + overlap(box, b), 0);
                const score = hit * 100 + Math.hypot(x - zone.label_at[0], y - zone.label_at[1]);
                if (!best || score < best.score) best = { score, at: [x, y], box };
            }
        }
        if (best) {
            taken.push(best.box);
            placed.push({ marker, at: best.at });
        }
    }
    return placed;
}

/** The marker's shape: a diamond for a threat, a circle for people, a square for a countermeasure, a triangle for a hazard. */
function Glyph({ kind, at: [x, y] }: { kind: Marker['kind']; at: Point }) {
    const r = GLYPH * 0.6;
    if (kind === 'people') return <circle cx={x} cy={y} r={r} className={`glyph ${kind}`} />;
    if (kind === 'countermeasure') return <rect x={x - r * 0.85} y={y - r * 0.85} width={r * 1.7} height={r * 1.7} className={`glyph ${kind}`} />;
    const d = kind === 'threat' ? `M${x},${y - r}L${x + r},${y}L${x},${y + r}L${x - r},${y}Z` : `M${x},${y - r}L${x + r},${y + r * 0.8}L${x - r},${y + r * 0.8}Z`;
    return <path d={d} className={`glyph ${kind}`} />;
}

/** The art for a marker's entity: its map token, or the icon of the countermeasure it names. */
function entityArt(entity: string | undefined, ctx: Ctx): ArtAsset | undefined {
    if (!entity) return undefined;
    return ctx.art[`token_${entity}`] ?? ctx.art[ctx.library.arsenal_icons[entity]];
}

/**
 * What a marker shows, in a ring colored by its kind:
 * - the picture of its entity
 * - a dot in the model's color when no picture fits (entity 'other', or art not rendered yet)
 * - the kind's shape for a saved run from before markers had an entity
 * `clip` is a page-unique id for the picture's round crop.
 */
function Token({ marker, at: [x, y], ctx, clip }: { marker: Marker; at: Point; ctx: Ctx; clip: string }) {
    const art = entityArt(marker.entity, ctx);
    const r = GLYPH;
    if (art) {
        return (
            <g>
                <clipPath id={clip}>
                    <circle cx={x} cy={y} r={r} />
                </clipPath>
                <circle cx={x} cy={y} r={r} className="token-bg" />
                <image href={artUrl(art)} x={x - r * 1.1} y={y - r * 1.1} width={r * 2.2} height={r * 2.2} clipPath={`url(#${clip})`} />
                <circle cx={x} cy={y} r={r} className={`token-ring ${marker.kind}`} />
            </g>
        );
    }
    if (!marker.entity) return <Glyph kind={marker.kind} at={[x, y]} />;
    const fill = ctx.library.dot_colors[marker.color ?? ''] ?? 'var(--text)';
    return <circle cx={x} cy={y} r={r * 0.7} className={`token-ring ${marker.kind}`} style={{ fill }} />;
}

function FloorView({ p, ctx }: { p: Props; ctx: Ctx }) {
    const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
    const [hover, setHover] = useState<number | null>(null); // the marker whose label shows
    const floor = ctx.library && ctx.floor;
    const sealed = ctx.operator.sealed;
    const route = useMemo(() => (floor ? walk(floor, ctx.library.sector_aliases, p.safe_route, sealed) : null), [floor, ctx.library, p.safe_route, sealed]);
    const marks = useMemo(() => {
        // A streaming manifest can hold a marker that is still being written.
        const markers = (p.markers ?? []).filter((m) => m?.sector && m.label && m.kind in KIND_NAME);
        const aliases = ctx.library?.sector_aliases ?? {};
        return floor ? placeMarkers(floor, markers, (slug) => aliases[slug] ?? slug, route?.points ?? []) : [];
    }, [floor, ctx.library, p.markers, route]);
    if (!floor) return <p className="muted">No floor plan available.</p>;
    const { sectors, sector_aliases } = ctx.library;
    // floor.json names sectors with the official slugs; the station's id for catering_coffee_bar is catering.
    const idOf = (slug: string) => sector_aliases[slug] ?? slug;
    const name = (slug: string) => sectors[idOf(slug)] ?? floor.blocks.find((b) => b.id === slug)?.aws_name ?? slug;
    const names = (slugs: string[]) => slugs.map(name).join(', ');
    const path = route?.points ?? [];
    const end = path[path.length - 1];
    const exit = route && !route.blocked && end ? floor.features.find((f) => f.exit && Math.hypot(f.at[0] - end[0], f.at[1] - end[1]) < 2) : undefined;
    const { width, height } = floor.space;
    const shown = hover === null ? undefined : marks[hover];
    // The hover label runs to the picture's right, or to its left where the floor ends.
    const labelRight = !shown || shown.at[0] + GLYPH + 0.8 + shown.marker.label.length * CHAR_W * MARK_SIZE <= width;
    return (
        <div>
            <svg viewBox={`-2 -2 ${width + 4} ${height + 4}`} role="group" aria-label={`Floor schematic, hot sector ${sectors[p.hot_sector] ?? p.hot_sector}`} className="floor-svg">
                <defs>
                    <pattern id="hatch" width={2} height={2} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                        <rect width={2} height={2} style={{ fill: 'var(--bg)' }} />
                        <line x1={0} y1={0} x2={0} y2={2} style={{ stroke: 'var(--amber)' }} strokeWidth={0.6} />
                    </pattern>
                    <pattern id="hatch-hot" width={2} height={2} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                        <rect width={2} height={2} style={{ fill: 'var(--red-deep)' }} />
                        <line x1={0} y1={0} x2={0} y2={2} style={{ stroke: 'var(--red)' }} strokeWidth={0.6} />
                    </pattern>
                </defs>
                <polygon points={points(floor.outline)} className="outline" />
                {floor.blocks.map((b) => (
                    <g key={b.id}>
                        <polygon points={points(b.polygon)} className="block">
                            <title>{`${b.aws_name} (AWS's name)`}</title>
                        </polygon>
                        <text x={b.label_at[0]} y={b.label_at[1]} textAnchor={b.label_anchor} className="area-label">
                            {b.aws_name}
                        </text>
                    </g>
                ))}
                {floor.open_middle && <polygon points={points(floor.open_middle)} className="open-middle" />}
                {floor.zones.map((z) => {
                    const id = idOf(z.slug);
                    const toggle = () => ctx.send({ type: 'toggle-seal', sector: id });
                    return (
                        <g key={z.slug}>
                            <polygon
                                points={points(z.polygon)}
                                className={`sector ${id === p.hot_sector ? 'hot' : ''} ${sealed.includes(id) ? 'sealed' : ''}`}
                                aria-hidden="true"
                                onClick={toggle}
                            />
                            <text x={z.label_at[0]} y={z.label_at[1]} textAnchor="middle" className="zone-label">
                                {z.label}
                            </text>
                        </g>
                    );
                })}
                {floor.features.map((f) =>
                    f.type === 'window' && f.line ? (
                        <polyline key={f.id} points={points(f.line)} className="window">
                            <title>{f.label}</title>
                        </polyline>
                    ) : f.polygon ? (
                        <polygon key={f.id} points={points(f.polygon)} className={`feature ${f.type}`}>
                            <title>{f.label}</title>
                        </polygon>
                    ) : (
                        <circle key={f.id} cx={f.at[0]} cy={f.at[1]} r={f.exit ? 1.6 : 1} className={`feature ${f.type} ${f.exit ? 'exit' : ''}`}>
                            <title>{f.label}</title>
                        </circle>
                    ),
                )}
                {path.length > 1 && <polyline className={`route ${route?.blocked ? 'blocked' : ''}`} points={points(path)} />}
                {path.length > 0 && (
                    <circle cx={path[0][0]} cy={path[0][1]} r={1.8} className="route-start">
                        <title>Start</title>
                    </circle>
                )}
                {exit && (
                    <rect x={exit.at[0] - 1.8} y={exit.at[1] - 1.8} width={3.6} height={3.6} className="route-exit">
                        <title>{`Exit: ${exit.label}`}</title>
                    </rect>
                )}
                {marks.map(({ marker, at }, i) => (
                    <g
                        key={i}
                        className="marker"
                        role="img"
                        tabIndex={0}
                        aria-label={`${KIND_NAME[marker.kind]} in ${name(marker.sector)}: ${marker.label}`}
                        onMouseEnter={() => setHover(i)}
                        onMouseLeave={() => setHover(null)}
                        onFocus={() => setHover(i)}
                        onBlur={() => setHover(null)}
                    >
                        <Token marker={marker} at={at} ctx={ctx} clip={`${uid}-map-${i}`} />
                    </g>
                ))}
                {/* Drawn last, so the label sits on top of everything it crosses. */}
                {shown && (
                    <text
                        x={shown.at[0] + (labelRight ? 1 : -1) * (GLYPH + 0.8)}
                        y={shown.at[1] + MARK_SIZE * 0.3}
                        textAnchor={labelRight ? 'start' : 'end'}
                        className="marker-label"
                        aria-hidden="true"
                    >
                        {shown.marker.label}
                    </text>
                )}
            </svg>
            <div className="legend">
                <span>
                    <i className="sw-hot" />
                    hot sector
                </span>
                <span>
                    <i className="sw-sealed" />
                    sealed
                </span>
                <span>
                    <i className="sw-route" />
                    {!route
                        ? 'no safe route given'
                        : route.blocked
                          ? route.blockedBy.length
                              ? `No safe route: ${names(route.blockedBy)} ${route.blockedBy.length > 1 ? 'are' : 'is'} sealed`
                              : 'No safe route found'
                          : `safe route: ${[...route.zones.map(name), ...(exit ? [exit.label] : [])].join(' → ')}`}
                    {route?.skipped.length ? ` (round sealed ${names(route.skipped)})` : ''}
                </span>
                <span title={floor.notice}>Schematic, not to scale</span>
            </div>
            <div className="muted small seal-label">Seal sectors (or click one on the plan)</div>
            <div className="seg seal-list" role="group" aria-label="Seal sectors">
                {Object.entries(sectors).map(([id, name]) => (
                    <button key={id} type="button" className={sealed.includes(id) ? 'on' : ''} aria-pressed={sealed.includes(id)} onClick={() => ctx.send({ type: 'toggle-seal', sector: id })}>
                        {name}
                    </button>
                ))}
            </div>
        </div>
    );
}

// --- around the tower -------------------------------------------------------------------------

interface Feature {
    geometry: { type: string; coordinates: any };
    properties: Record<string, any> & { kind: string };
}
interface Area {
    projection_hint: { lat0: number; lon0: number; x_m_per_deg_lon: number; y_m_per_deg_lat: number };
    features: Feature[];
}

let areaLoad: Promise<Area> | null = null;
const loadArea = () => (areaLoad ??= fetch(withToken('./data/map/area.geojson')).then((r) => r.json() as Promise<Area>));

function AreaView({ anchor }: { anchor: string | null }) {
    const [area, setArea] = useState<Area | null>(null);
    useEffect(() => {
        loadArea().then(setArea, () => setArea(null));
    }, []);
    if (!area) return <p className="muted">Loading the map…</p>;
    const { lat0, lon0, x_m_per_deg_lon: kx, y_m_per_deg_lat: ky } = area.projection_hint;
    // Local equirectangular metres around the tower: x east, y north (flipped for SVG).
    const xy = ([lon, lat]: number[]): Point => [(lon - lon0) * kx, -(lat - lat0) * ky];
    const ring = (coords: number[][]) => `M${coords.map((c) => xy(c).join(',')).join('L')}Z`;
    const path = (g: Feature['geometry']) => {
        if (g.type === 'Polygon') return g.coordinates.map(ring).join('');
        if (g.type === 'MultiPolygon') return g.coordinates.flat().map(ring).join('');
        if (g.type === 'LineString') return `M${g.coordinates.map((c: number[]) => xy(c).join(',')).join('L')}`;
        if (g.type === 'MultiLineString') return g.coordinates.map((line: number[][]) => `M${line.map((c) => xy(c).join(',')).join('L')}`).join('');
        return '';
    };
    const pin = area.features.find((f) => (anchor ? f.properties.kind === 'anchor' && f.properties.id === anchor : f.properties.kind === 'venue_pin'));
    const pinAt = pin && xy(pin.geometry.coordinates);
    const venue = area.features.find((f) => f.properties.kind === 'venue_pin');
    const venueAt = venue && xy(venue.geometry.coordinates);
    return (
        <div>
            <svg viewBox={`${-CLOSE_M} ${-CLOSE_M} ${2 * CLOSE_M} ${2 * CLOSE_M}`} role="img" aria-label="The blocks around the tower" className="area-svg">
                <rect x={-CLOSE_M} y={-CLOSE_M} width={2 * CLOSE_M} height={2 * CLOSE_M} className="ground" />
                {area.features.map((f, i) => {
                    const k = f.properties.kind;
                    if (k === 'park' || k === 'plaza' || k === 'fountain') return <path key={i} d={path(f.geometry)} className={`osm ${k}`} />;
                    if (k === 'street') return <path key={i} d={path(f.geometry)} className={`osm street ${f.properties.class}`} />;
                    if (k === 'building') return <path key={i} d={path(f.geometry)} className={`osm building ${f.properties.venue ? 'venue' : ''}`} />;
                    if (k === 'steps') return <path key={i} d={path(f.geometry)} className="osm steps" />;
                    if (k === 'transit') {
                        const [x, y] = xy(f.geometry.coordinates);
                        return (
                            <circle key={i} cx={x} cy={y} r={2} className="osm transit">
                                <title>{f.properties.name}</title>
                            </circle>
                        );
                    }
                    return null;
                })}
                {venueAt && (
                    <g>
                        <circle cx={venueAt[0]} cy={venueAt[1]} r={4} className="venue-pin" />
                        <text x={venueAt[0] + 6} y={venueAt[1] - 4} className="map-label">
                            AWS Builder Loft (level 2)
                        </text>
                    </g>
                )}
                {anchor && pinAt && (
                    <g>
                        <circle cx={pinAt[0]} cy={pinAt[1]} r={6} className="hot-pin" />
                        <text x={pinAt[0] + 8} y={pinAt[1] + 12} className="map-label hot">
                            {pin?.properties.label}
                        </text>
                    </g>
                )}
            </svg>
            <div className="legend">
                <span>
                    <i className="sw-hot" />
                    {anchor ? `incident: ${pin?.properties.label ?? anchor}` : 'the incident is inside the Loft'}
                </span>
                <span>
                    © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>. Map data under the Open Database License.
                </span>
            </div>
        </div>
    );
}
