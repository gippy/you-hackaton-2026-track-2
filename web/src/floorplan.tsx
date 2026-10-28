// The FloorPlan component's two views: the Loft's floor (a schematic from data/map/floor.json) and the
// blocks around the tower (OpenStreetMap, data/map/area.geojson). The model's manifest places every
// marker: the hot sector or outdoor spot, the sealed sectors and the route out.
import { useEffect, useMemo, useState } from 'react';

import type { Component, Floor } from '../../shared/protocol.ts';
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
                        <img src={artUrl(scene.file)} alt={scene.alt} loading="lazy" />
                    </span>
                    <figcaption className="muted small">{scene.alt}</figcaption>
                </figure>
            )}
        </div>
    );
}

// --- the floor ------------------------------------------------------------------------------

const points = (poly: Point[]) => poly.map(([x, y]) => `${x},${y}`).join(' ');

/** Where floor.json draws a block's name. shared/protocol.ts's Floor type does not list these two fields yet. */
type BlockLabel = { label_at?: Point; label_anchor?: 'start' | 'middle' | 'end' };

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

function FloorView({ p, ctx }: { p: Props; ctx: Ctx }) {
    const floor = ctx.library && ctx.floor;
    const sealed = ctx.operator.sealed;
    const route = useMemo(() => (floor ? walk(floor, ctx.library.sector_aliases, p.safe_route, sealed) : null), [floor, ctx.library, p.safe_route, sealed]);
    if (!floor) return <p className="muted">No floor plan available.</p>;
    const { sectors, sector_aliases } = ctx.library;
    // floor.json names sectors with the official slugs; the station's id for catering_coffee_bar is catering.
    const idOf = (slug: string) => sector_aliases[slug] ?? slug;
    const name = (slug: string) => sectors[idOf(slug)] ?? floor.blocks?.find((b) => b.id === slug)?.aws_name ?? slug;
    const names = (slugs: string[]) => slugs.map(name).join(', ');
    const path = route?.points ?? [];
    const end = path[path.length - 1];
    const exit = route && !route.blocked && end ? floor.features.find((f) => f.exit && Math.hypot(f.at[0] - end[0], f.at[1] - end[1]) < 2) : undefined;
    const { width, height } = floor.space;
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
                {(floor.blocks ?? []).map((b) => {
                    // AWS's name for the block, where floor.json puts it: clear of borders, of the sector labels and of the
                    // route markers, and beside the block when the block is too narrow for its name. Older data has no
                    // label_at: then the name goes in the block's bottom-left corner.
                    const placed = b as typeof b & BlockLabel;
                    const corner = Math.min(...b.polygon.map((p) => p[0]));
                    const at: Point = placed.label_at ?? [corner + 1.2, Math.max(...b.polygon.filter((p) => p[0] === corner).map((p) => p[1])) - 1.2];
                    return (
                        <g key={b.id}>
                            <polygon points={points(b.polygon)} className="block">
                                <title>{`${b.aws_name} (AWS's name)`}</title>
                            </polygon>
                            <text x={at[0]} y={at[1]} textAnchor={placed.label_anchor ?? 'start'} className="area-label">
                                {b.aws_name}
                            </text>
                        </g>
                    );
                })}
                {floor.open_middle && <polygon points={points(floor.open_middle)} className="open-middle" />}
                {(floor.areas ?? []).map((a) => (
                    <g key={a.id}>
                        <polygon points={points(a.polygon)} className="area" />
                        <text x={a.label_at[0]} y={a.label_at[1]} className="area-label" textAnchor="middle">
                            {a.label}
                        </text>
                    </g>
                ))}
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
