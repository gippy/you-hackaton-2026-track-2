// The FloorPlan component's two views: the Loft's floor (a schematic from data/map/floor.json) and the
// blocks around the tower (OpenStreetMap, data/map/area.geojson). The model's manifest places every
// marker: the hot sector or outdoor spot, the sealed sectors and the route out.
import { useEffect, useState } from 'react';

import type { Component, Floor } from '../../shared/protocol.ts';
import type { Ctx } from './components.tsx';
import { artUrl, withToken } from './url.ts';

type Props = Extract<Component, { type: 'FloorPlan' }>['props'];
type Point = [number, number];

const CLOSE_M = 150; // the area view shows 150 metres around the tower

export function FloorPlan({ p, ctx }: { p: Props; ctx: Ctx }) {
    const [view, setView] = useState<'floor' | 'area'>(p.view === 'area' ? 'area' : 'floor');
    const scene = p.scene && ctx.art[p.scene];
    return (
        <div>
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
                    <span className="crt-img">
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

const centroid = (poly: Point[]): Point => [poly.reduce((s, p) => s + p[0], 0) / poly.length, poly.reduce((s, p) => s + p[1], 0) / poly.length];

/** Places a route can pass through that are not sectors: the hall (older data) or AWS's Reception block. */
function corridors(floor: Floor): { id: string; label_at: Point }[] {
    return [
        ...(floor.areas ?? []).map((a) => ({ id: a.id, label_at: a.label_at })),
        ...(floor.blocks ?? []).map((b) => ({ id: b.id, label_at: centroid(b.polygon) })),
    ];
}

/** The route's drawn path: from sector to sector through the doors and corridors that connect them, then out an exit. */
function routePath(floor: Floor, route: string[], slugOf: (id: string) => string): Point[] {
    const zone = (slug: string) => floor.zones.find((z) => z.slug === slug);
    const halls = corridors(floor);
    const node = (id: string) => zone(id)?.label_at ?? halls.find((a) => a.id === id)?.label_at;
    const door = (via: string | null) => floor.features.find((f) => f.id === via)?.at;
    const link = (a: string, b: string) => floor.connections.find((c) => (c.a === a && c.b === b) || (c.a === b && c.b === a));
    const out: Point[] = [];
    const slugs = route.map(slugOf);
    slugs.forEach((slug, i) => {
        const here = node(slug);
        if (i > 0) {
            const prev = slugs[i - 1];
            const direct = link(prev, slug);
            if (direct) {
                const d = door(direct.via);
                if (d) out.push(d);
            } else {
                // Through a corridor area, such as the hall.
                const corridor = halls.find((a) => link(prev, a.id) && link(a.id, slug));
                if (corridor) {
                    const d1 = door(link(prev, corridor.id)!.via);
                    const d2 = door(link(corridor.id, slug)!.via);
                    out.push(...([d1, corridor.label_at, d2].filter(Boolean) as Point[]));
                }
            }
        }
        if (here) out.push(here);
    });
    const last = slugs[slugs.length - 1];
    const exit = floor.features.find((f) => f.exit && f.zone === last);
    if (exit) out.push(exit.at);
    return out;
}

function FloorView({ p, ctx }: { p: Props; ctx: Ctx }) {
    const floor = ctx.library && ctx.floor;
    if (!floor) return <p className="muted">No floor plan available.</p>;
    const { sectors, sector_aliases } = ctx.library;
    // floor.json names sectors with the official slugs; the station's id for catering_coffee_bar is catering.
    const idOf = (slug: string) => sector_aliases[slug] ?? slug;
    const slugOf = (id: string) => Object.entries(sector_aliases).find(([, v]) => v === id)?.[0] ?? id;
    const sealed = ctx.operator.sealed;
    const route = p.safe_route.length > 1 ? routePath(floor, p.safe_route, slugOf) : [];
    const { width, height } = floor.space;
    return (
        <div>
            <svg viewBox={`-2 -2 ${width + 4} ${height + 4}`} role="img" aria-label={`Floor schematic, hot sector ${sectors[p.hot_sector] ?? p.hot_sector}`} className="floor-svg">
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
                    // AWS's name for the block, in its bottom-left corner, clear of the sector labels in the middle.
                    const x = Math.min(...b.polygon.map((p) => p[0]));
                    const y = Math.max(...b.polygon.filter((p) => p[0] === x).map((p) => p[1]));
                    return (
                        <g key={b.id}>
                            <polygon points={points(b.polygon)} className="block">
                                <title>{`${b.aws_name} (AWS's name)`}</title>
                            </polygon>
                            <text x={x + 1.2} y={y - 1.2} className="area-label">
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
                                tabIndex={0}
                                role="button"
                                aria-pressed={sealed.includes(id)}
                                aria-label={`${sectors[id] ?? z.label}: seal or unseal`}
                                onClick={toggle}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        toggle();
                                    }
                                }}
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
                {route.length > 1 && <polyline className="route" points={points(route)} />}
                {route.length > 0 && <circle cx={route[0][0]} cy={route[0][1]} r={1.8} className="route-start" />}
            </svg>
            <div className="legend">
                <span>
                    <i className="sw-hot" />
                    hot sector
                </span>
                <span>
                    <i className="sw-sealed" />
                    sealed (click a sector to change)
                </span>
                <span>
                    <i className="sw-route" />
                    {p.safe_route.length ? `safe route: ${p.safe_route.map((id) => sectors[id] ?? id).join(' → ')}` : 'no safe route given'}
                </span>
                <span title={floor.notice}>Schematic, not to scale</span>
            </div>
            <div className="muted small">{sealed.length ? `Sealed: ${sealed.map((id) => sectors[id] ?? id).join(', ')}` : 'No sectors sealed.'}</div>
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
