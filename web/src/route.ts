// Realistic safe routes on the Loft's floor schematic (data/map/floor.json).
//
// A pure module: no React, no DOM, no I/O. It rasterizes the walkable area onto a fine grid, treats zone
// borders as walls that can only be crossed at the doors the `connections` name, runs A* with a small
// extra cost near walls, and smooths the result with line-of-sight so a route reads as a few clean
// segments through the doors. It never cuts through a wall or across the open middle of AWS's C.
import type { Floor } from '../../shared/protocol.ts';

export type Point = [number, number];

export interface RouteRequest {
    /** A zone slug (or alias), a feature id, a block id such as `reception`, or a point on the floor. */
    from: string | Point;
    /** An exit id, a zone slug (or alias), a feature id, a block id, or a point. */
    to: string | Point;
    /** Zone slugs the route must not enter, such as sealed sectors. The start zone is exempt. */
    avoid?: string[];
}

export interface Route {
    /** The route as a polyline in floor units (0 to 100 wide, y down). */
    points: Point[];
    /** The zones (and unzoned blocks such as `reception`) the polyline passes through, in order. */
    zones: string[];
    /** True when the goal cannot be reached without entering an avoided zone. `points` is then the best partial path. */
    blocked: boolean;
    /** When blocked: the avoided zones the direct route would have had to enter. */
    blockedBy: string[];
    /** Length of the polyline in floor units. */
    length: number;
}

export interface ThroughOptions {
    avoid?: string[];
    /** Finish by walking out of the last sector's first exit. */
    exit?: boolean;
}

export interface ThroughRoute extends Route {
    /** One route per leg. */
    legs: Route[];
    /** Named sectors that were left out because they are sealed (the route goes round them). */
    skipped: string[];
}

const CELL = 0.5; // grid cell size in floor units
const DOOR_RADIUS = 1.7; // half the width of a door opening, in floor units
const CLEARANCE = 0.7; // how close smoothing lets a shortcut pass a wall, in floor units
const WALL_RANGE = 3; // floor units over which walls add cost
const WALL_COST = 3; // extra cost multiplier right at a wall
const MIN_BLOCK_CELLS = 6; // unzoned block slivers smaller than this are dropped

// --- geometry -----------------------------------------------------------------------------------

interface Shape {
    poly: Point[];
    x0: number;
    y0: number;
    x1: number;
    y1: number;
}

function shape(poly: Point[]): Shape {
    const xs = poly.map((p) => p[0]);
    const ys = poly.map((p) => p[1]);
    return { poly, x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

/** Whether the point (x, y) lies inside a polygon, by the even-odd rule. */
export function inPolygon(x: number, y: number, poly: Point[]): boolean {
    let hit = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const [xi, yi] = poly[i];
        const [xj, yj] = poly[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
    }
    return hit;
}

/** `inPolygon` with the shape's bounding box checked first, for the grid's many tests. */
function inside(s: Shape, x: number, y: number): boolean {
    return x >= s.x0 && x <= s.x1 && y >= s.y0 && y <= s.y1 && inPolygon(x, y, s.poly);
}

// --- the grid -----------------------------------------------------------------------------------

interface Opening {
    x: number;
    y: number;
    /** Radius around the door point within which the border can be crossed. Infinity: the whole border is open. */
    r: number;
}

interface Grid {
    cell: number;
    nx: number;
    ny: number;
    /** Region index per cell; -1 is not walkable. */
    region: Int16Array;
    /** Region names: zone slugs, then block ids for unzoned parts of a block. */
    names: string[];
    /** Slugs, aliases and block ids to a region index. */
    index: Map<string, number>;
    /** Distance to the nearest wall in floor units. */
    wall: Float32Array;
    /** Step cost multiplier per cell: 1 in the open, up to 1 + WALL_COST at a wall. */
    cost: Float32Array;
    openings: Map<number, Opening[]>;
    doorPoints: Opening[];
}

const grids = new WeakMap<Floor, Grid>();

function gridFor(floor: Floor): Grid {
    let g = grids.get(floor);
    if (!g) grids.set(floor, (g = buildGrid(floor)));
    return g;
}

function buildGrid(floor: Floor): Grid {
    const cell = CELL;
    const nx = Math.ceil(floor.space.width / cell);
    const ny = Math.ceil(floor.space.height / cell);
    const outline = shape(floor.outline);
    const middle = floor.open_middle ? shape(floor.open_middle) : null;
    const zones = floor.zones.map((z) => shape(z.polygon));
    const blocks = floor.blocks.map((b) => ({ id: b.id, s: shape(b.polygon), walkable: b.walkable !== false }));

    const names = floor.zones.map((z) => z.slug);
    const index = new Map<string, number>();
    floor.zones.forEach((z, i) => {
        index.set(z.slug, i);
        for (const a of z.aliases ?? []) index.set(a, i);
    });
    const blockRegion = new Map<string, number>();
    const region = new Int16Array(nx * ny).fill(-1);
    for (let j = 0; j < ny; j++) {
        const y = (j + 0.5) * cell;
        for (let i = 0; i < nx; i++) {
            const x = (i + 0.5) * cell;
            if (!inside(outline, x, y) || (middle && inside(middle, x, y))) continue;
            let r = -1;
            for (let k = 0; k < zones.length; k++) {
                if (inside(zones[k], x, y)) {
                    r = k;
                    break;
                }
            }
            if (r < 0) {
                for (const b of blocks) {
                    if (b.walkable && inside(b.s, x, y)) {
                        let id = blockRegion.get(b.id);
                        if (id === undefined) {
                            id = names.length;
                            names.push(b.id);
                            blockRegion.set(b.id, id);
                            if (!index.has(b.id)) index.set(b.id, id);
                        }
                        r = id;
                        break;
                    }
                }
            }
            region[j * nx + i] = r;
        }
    }
    // Drop unzoned block slivers left by rounding at the seams.
    const counts = new Map<number, number>();
    for (const r of region) if (r >= floor.zones.length) counts.set(r, (counts.get(r) ?? 0) + 1);
    for (let c = 0; c < region.length; c++) {
        const r = region[c];
        if (r >= floor.zones.length && (counts.get(r) ?? 0) < MIN_BLOCK_CELLS) region[c] = -1;
    }

    // Doors and open borders from the connections.
    const openings = new Map<number, Opening[]>();
    const doorPoints: Opening[] = [];
    for (const c of floor.connections) {
        const ra = index.get(c.a);
        const rb = index.get(c.b);
        if (ra === undefined || rb === undefined) continue;
        const via = c.via === null ? undefined : floor.features.find((f) => f.id === c.via);
        const o: Opening = via ? { x: via.at[0], y: via.at[1], r: DOOR_RADIUS } : { x: 0, y: 0, r: Infinity };
        if (via) doorPoints.push(o);
        for (const key of [ra * 256 + rb, rb * 256 + ra]) {
            const list = openings.get(key);
            if (list) list.push(o);
            else openings.set(key, [o]);
        }
    }

    const g: Grid = { cell, nx, ny, region, names, index, wall: new Float32Array(nx * ny), cost: new Float32Array(nx * ny), openings, doorPoints };
    computeWalls(g);
    return g;
}

/** Can a walker move between two orthogonally adjacent cells? Same region, or a crossing at a door or open border. */
function canStep(g: Grid, a: number, b: number): boolean {
    const ra = g.region[a];
    const rb = g.region[b];
    if (ra < 0 || rb < 0) return false;
    if (ra === rb) return true;
    const list = g.openings.get(ra * 256 + rb);
    if (!list) return false;
    const { nx, cell } = g;
    const mx = (((a % nx) + (b % nx)) / 2 + 0.5) * cell;
    const my = ((((a / nx) | 0) + ((b / nx) | 0)) / 2 + 0.5) * cell;
    for (const o of list) if (o.r === Infinity || Math.hypot(mx - o.x, my - o.y) <= o.r) return true;
    return false;
}

/** Can a walker move to a neighbouring cell? A diagonal move needs both corner cells open and not avoided. */
function canMove(g: Grid, a: number, b: number, avoided: Set<number>): boolean {
    const dx = (b % g.nx) - (a % g.nx);
    const dy = ((b / g.nx) | 0) - ((a / g.nx) | 0);
    if (dx === 0 || dy === 0) return canStep(g, a, b);
    const n1 = a + dx;
    const n2 = a + dy * g.nx;
    return !avoided.has(g.region[n1]) && !avoided.has(g.region[n2]) && canStep(g, a, n1) && canStep(g, n1, b) && canStep(g, a, n2) && canStep(g, n2, b);
}

function computeWalls(g: Grid): void {
    const { nx, ny, cell, wall, cost, region } = g;
    const INF = 1e9;
    wall.fill(INF);
    for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
            const c = j * nx + i;
            if (region[c] < 0) continue;
            const edge = i === 0 || j === 0 || i === nx - 1 || j === ny - 1 || !canStep(g, c, c - 1) || !canStep(g, c, c + 1) || !canStep(g, c, c - nx) || !canStep(g, c, c + nx);
            if (edge) wall[c] = 0;
        }
    }
    // Two-pass chamfer distance transform, 8 neighbours.
    const D = Math.SQRT2;
    for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
            const c = j * nx + i;
            if (region[c] < 0) continue;
            let d = wall[c];
            if (i > 0 && region[c - 1] >= 0) d = Math.min(d, wall[c - 1] + 1);
            if (j > 0 && region[c - nx] >= 0) d = Math.min(d, wall[c - nx] + 1);
            if (i > 0 && j > 0 && region[c - nx - 1] >= 0) d = Math.min(d, wall[c - nx - 1] + D);
            if (i < nx - 1 && j > 0 && region[c - nx + 1] >= 0) d = Math.min(d, wall[c - nx + 1] + D);
            wall[c] = d;
        }
    }
    for (let j = ny - 1; j >= 0; j--) {
        for (let i = nx - 1; i >= 0; i--) {
            const c = j * nx + i;
            if (region[c] < 0) continue;
            let d = wall[c];
            if (i < nx - 1 && region[c + 1] >= 0) d = Math.min(d, wall[c + 1] + 1);
            if (j < ny - 1 && region[c + nx] >= 0) d = Math.min(d, wall[c + nx] + 1);
            if (i < nx - 1 && j < ny - 1 && region[c + nx + 1] >= 0) d = Math.min(d, wall[c + nx + 1] + D);
            if (i > 0 && j < ny - 1 && region[c + nx - 1] >= 0) d = Math.min(d, wall[c + nx - 1] + D);
            wall[c] = d;
        }
    }
    for (let c = 0; c < wall.length; c++) {
        if (region[c] < 0) continue;
        wall[c] = Math.min(wall[c] * cell, 1e6);
        cost[c] = 1 + WALL_COST * Math.max(0, 1 - wall[c] / WALL_RANGE);
    }
}

function cellAt(g: Grid, x: number, y: number): number {
    const i = Math.floor(x / g.cell);
    const j = Math.floor(y / g.cell);
    return i < 0 || j < 0 || i >= g.nx || j >= g.ny ? -1 : j * g.nx + i;
}

function centerOf(g: Grid, c: number): Point {
    return [((c % g.nx) + 0.5) * g.cell, (((c / g.nx) | 0) + 0.5) * g.cell];
}

/** The nearest walkable cell to a point, searching outward in rings. */
function snap(g: Grid, x: number, y: number): number {
    const c0 = cellAt(g, x, y);
    if (c0 >= 0 && g.region[c0] >= 0) return c0;
    const i0 = Math.min(g.nx - 1, Math.max(0, Math.floor(x / g.cell)));
    const j0 = Math.min(g.ny - 1, Math.max(0, Math.floor(y / g.cell)));
    let best = -1;
    let bestD = Infinity;
    for (let r = 1; r < Math.max(g.nx, g.ny) && best < 0; r++) {
        for (let j = j0 - r; j <= j0 + r; j++) {
            for (let i = i0 - r; i <= i0 + r; i++) {
                if (i < 0 || j < 0 || i >= g.nx || j >= g.ny) continue;
                if (Math.max(Math.abs(i - i0), Math.abs(j - j0)) !== r) continue;
                const c = j * g.nx + i;
                if (g.region[c] < 0) continue;
                const [cx, cy] = centerOf(g, c);
                const d = Math.hypot(cx - x, cy - y);
                if (d < bestD) {
                    bestD = d;
                    best = c;
                }
            }
        }
    }
    return best;
}

// --- places -------------------------------------------------------------------------------------

interface Place {
    point: Point;
    cell: number;
    region: number;
}

/** The roomiest cell of a region (most clearance), nearest the middle of the region among near-ties. */
function regionAnchor(g: Grid, r: number): number {
    let best = 0;
    let n = 0;
    let sx = 0;
    let sy = 0;
    for (let c = 0; c < g.region.length; c++) {
        if (g.region[c] !== r) continue;
        best = Math.max(best, g.wall[c]);
        const [x, y] = centerOf(g, c);
        sx += x;
        sy += y;
        n++;
    }
    if (n === 0) return -1;
    let pick = -1;
    let pickD = Infinity;
    for (let c = 0; c < g.region.length; c++) {
        if (g.region[c] !== r || g.wall[c] < 0.9 * best) continue;
        const [x, y] = centerOf(g, c);
        const d = Math.hypot(x - sx / n, y - sy / n);
        if (d < pickD) {
            pickD = d;
            pick = c;
        }
    }
    return pick;
}

function resolve(g: Grid, floor: Floor, spec: string | Point): Place {
    let point: Point | undefined;
    let cell = -1;
    if (Array.isArray(spec)) {
        point = spec;
    } else {
        const zone = floor.zones.find((z) => z.slug === spec || z.aliases?.includes(spec));
        const feature = floor.features.find((f) => f.id === spec);
        if (zone) {
            const r = g.index.get(zone.slug) ?? -1;
            if (zone.route_at) {
                const c = snap(g, zone.route_at[0], zone.route_at[1]);
                if (c >= 0 && g.region[c] === r) cell = c;
            }
            if (cell < 0) cell = regionAnchor(g, r);
        } else if (feature) {
            point = feature.at;
        } else if (g.index.has(spec)) {
            cell = regionAnchor(g, g.index.get(spec)!);
        } else {
            throw new Error(`route: unknown place "${spec}"`);
        }
    }
    if (point) {
        cell = snap(g, point[0], point[1]);
        // Keep the exact point when it already lies on a walkable cell (an exit on the outline, say).
        if (cell !== cellAt(g, point[0], point[1])) point = undefined;
    }
    if (cell < 0) throw new Error(`route: nowhere to stand near "${String(spec)}"`);
    return { point: point ?? centerOf(g, cell), cell, region: g.region[cell] };
}

// --- search -------------------------------------------------------------------------------------

class Heap {
    private f: number[] = [];
    private id: number[] = [];
    get size(): number {
        return this.f.length;
    }
    push(f: number, id: number): void {
        const a = this.f;
        const b = this.id;
        let i = a.length;
        a.push(f);
        b.push(id);
        while (i > 0) {
            const p = (i - 1) >> 1;
            if (a[p] <= f) break;
            a[i] = a[p];
            b[i] = b[p];
            i = p;
        }
        a[i] = f;
        b[i] = id;
    }
    pop(): number {
        const a = this.f;
        const b = this.id;
        const top = b[0];
        const f = a.pop()!;
        const id = b.pop()!;
        const n = a.length;
        if (n > 0) {
            let i = 0;
            for (;;) {
                let c = 2 * i + 1;
                if (c >= n) break;
                if (c + 1 < n && a[c + 1] < a[c]) c++;
                if (a[c] >= f) break;
                a[i] = a[c];
                b[i] = b[c];
                i = c;
            }
            a[i] = f;
            b[i] = id;
        }
        return top;
    }
}

interface Search {
    path: number[] | null;
    /** The reached cell nearest the goal, for a partial path when the goal is unreachable. */
    closest: number;
    parent: Int32Array;
}

const DIRS: [number, number][] = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
];

/** A* on the grid. `avoided` regions may not be entered. */
function search(g: Grid, start: number, goal: number, avoided: Set<number>): Search {
    const { nx, ny, region, cost } = g;
    const n = nx * ny;
    const dist = new Float64Array(n).fill(Infinity);
    const parent = new Int32Array(n).fill(-1);
    const gi = goal % nx;
    const gj = (goal / nx) | 0;
    const h = (c: number) => {
        const dx = Math.abs((c % nx) - gi);
        const dy = Math.abs(((c / nx) | 0) - gj);
        return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
    };
    const heap = new Heap();
    dist[start] = 0;
    heap.push(h(start), start);
    let closest = start;
    let closestH = h(start);
    while (heap.size) {
        const c = heap.pop();
        if (c === goal) return { path: pathTo(parent, goal), closest: goal, parent };
        const hc = h(c);
        if (hc < closestH) {
            closestH = hc;
            closest = c;
        }
        const ci = c % nx;
        const cj = (c / nx) | 0;
        for (const [dx, dy] of DIRS) {
            const i = ci + dx;
            const j = cj + dy;
            if (i < 0 || j < 0 || i >= nx || j >= ny) continue;
            const b = j * nx + i;
            if (region[b] < 0 || avoided.has(region[b]) || !canMove(g, c, b, avoided)) continue;
            const len = dx !== 0 && dy !== 0 ? Math.SQRT2 : 1;
            const d = dist[c] + (len * (cost[c] + cost[b])) / 2;
            if (d < dist[b]) {
                dist[b] = d;
                parent[b] = c;
                heap.push(d + h(b), b);
            }
        }
    }
    return { path: null, closest, parent };
}

function pathTo(parent: Int32Array, end: number): number[] {
    const path: number[] = [];
    for (let p = end; p !== -1; p = parent[p]) path.push(p);
    return path.reverse();
}

// --- smoothing ----------------------------------------------------------------------------------

function nearDoor(g: Grid, x: number, y: number): boolean {
    for (const o of g.doorPoints) if (Math.hypot(x - o.x, y - o.y) <= o.r + 0.5) return true;
    return false;
}

/** Can a walker go straight from p to q without touching a wall, entering an avoided zone or crowding a wall? */
function lineClear(g: Grid, p: Point, q: Point, avoided: Set<number>): boolean {
    const L = Math.hypot(q[0] - p[0], q[1] - p[1]);
    const steps = Math.max(1, Math.ceil(L / (g.cell * 0.25)));
    const slack = 2; // right at an end the walker may be near a wall: an exit on the outline, a door
    let prev = cellAt(g, p[0], p[1]);
    if (prev < 0 || g.region[prev] < 0) return false;
    for (let k = 1; k <= steps; k++) {
        const x = p[0] + ((q[0] - p[0]) * k) / steps;
        const y = p[1] + ((q[1] - p[1]) * k) / steps;
        const c = cellAt(g, x, y);
        if (c < 0 || g.region[c] < 0 || avoided.has(g.region[c])) return false;
        if (c !== prev) {
            if (!canMove(g, prev, c, avoided)) return false;
            prev = c;
        }
        if (g.wall[c] < CLEARANCE && Math.hypot(x - p[0], y - p[1]) > slack && Math.hypot(x - q[0], y - q[1]) > slack && !nearDoor(g, x, y)) return false;
    }
    return true;
}

/** Does the segment p to q pass through the region? */
function touches(g: Grid, p: Point, q: Point, region: number): boolean {
    const steps = Math.max(1, Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]) / (g.cell * 0.5)));
    for (let s = 0; s <= steps; s++) {
        const c = cellAt(g, p[0] + ((q[0] - p[0]) * s) / steps, p[1] + ((q[1] - p[1]) * s) / steps);
        if (c >= 0 && g.region[c] === region) return true;
    }
    return false;
}

/**
 * Straightens a route with line-of-sight shortcuts. `named` marks where a route joined from legs ends in a
 * sector the model named: a walker only has to pass through it, so a shortcut may drop that point as long as
 * it still goes through the sector.
 */
function straighten(g: Grid, pts: Point[], named: { at: number; region: number }[], avoided: Set<number>): Point[] {
    if (pts.length <= 2) return pts;
    const out: Point[] = [pts[0]];
    let i = 0;
    while (i < pts.length - 1) {
        let j = pts.length - 1;
        while (j > i + 1 && !(lineClear(g, pts[i], pts[j], avoided) && named.every((n) => n.at <= i || n.at >= j || touches(g, pts[i], pts[j], n.region)))) j--;
        out.push(pts[j]);
        i = j;
    }
    return out;
}

/** Pull a route through the middle of each door it crosses, so it reads as passing the door and not its jamb. */
function throughDoors(g: Grid, pts: Point[]): Point[] {
    const out: Point[] = [pts[0]];
    for (let k = 0; k + 1 < pts.length; k++) {
        const a = pts[k];
        const b = pts[k + 1];
        const steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (g.cell * 0.25)));
        const at = (t: number) => cellAt(g, a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t);
        let prev = g.region[at(0)] ?? -1;
        for (let s = 1; s <= steps; s++) {
            const t = s / steps;
            const c = at(t);
            const r = c >= 0 ? g.region[c] : -1;
            if (r >= 0 && prev >= 0 && r !== prev) {
                const x = a[0] + (b[0] - a[0]) * t;
                const y = a[1] + (b[1] - a[1]) * t;
                let door: Opening | undefined;
                let best = Infinity;
                for (const o of g.openings.get(prev * 256 + r) ?? []) {
                    const d = Math.hypot(x - o.x, y - o.y);
                    if (o.r !== Infinity && d < best) {
                        best = d;
                        door = o;
                    }
                }
                if (door && best > 0.5) out.push([door.x, door.y]);
            }
            if (r >= 0) prev = r;
        }
        out.push(b);
    }
    return out;
}

// --- public API ---------------------------------------------------------------------------------

const round2 = (v: number) => Math.round(v * 100) / 100;

/** The zones a polyline passes through, in order, and its length. */
function describe(g: Grid, pts: Point[]): { zones: string[]; length: number } {
    const zones: string[] = [];
    let length = 0;
    for (let k = 0; k < pts.length; k++) {
        const a = pts[k];
        const b = pts[k + 1] ?? a;
        const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
        length += L;
        const steps = Math.max(1, Math.ceil(L / (g.cell * 0.5)));
        for (let s = 0; s <= steps; s++) {
            const c = cellAt(g, a[0] + ((b[0] - a[0]) * s) / steps, a[1] + ((b[1] - a[1]) * s) / steps);
            const r = c >= 0 ? g.region[c] : -1;
            if (r >= 0 && g.names[r] !== zones[zones.length - 1]) zones.push(g.names[r]);
        }
    }
    return { zones, length };
}

function finish(g: Grid, cells: number[], from: Place, to: Place | null, avoided: Set<number>, blockedBy: string[]): Route {
    let pts: Point[] = cells.map((c) => centerOf(g, c));
    pts[0] = from.point;
    if (to) pts[pts.length - 1] = to.point;
    pts = throughDoors(g, straighten(g, pts, [], avoided));
    const { zones, length } = describe(g, pts);
    return { points: pts.map(([x, y]) => [round2(x), round2(y)] as Point), zones, blocked: blockedBy.length > 0 || to === null, blockedBy, length: round2(length) };
}

/**
 * The route from one place to another that keeps to the floor's doors and corridors.
 * When the goal cannot be reached without entering an avoided zone, `blocked` is true and `points` is the
 * part of the direct route that can be walked safely.
 */
export function findRoute(floor: Floor, req: RouteRequest): Route {
    const g = gridFor(floor);
    const from = resolve(g, floor, req.from);
    const to = resolve(g, floor, req.to);
    const avoided = new Set<number>();
    for (const slug of req.avoid ?? []) {
        const r = g.index.get(slug);
        if (r !== undefined) avoided.add(r);
    }
    avoided.delete(from.region); // the start zone is exempt
    if (from.cell === to.cell) return finish(g, [from.cell], from, to, avoided, []);

    const safe = search(g, from.cell, to.cell, avoided);
    if (safe.path) return finish(g, safe.path, from, to, avoided, []);

    // Not reachable without entering an avoided zone: walk the direct route up to the first one.
    const direct = avoided.size ? search(g, from.cell, to.cell, new Set()) : safe;
    if (direct.path) {
        const cut = direct.path.findIndex((c) => avoided.has(g.region[c]));
        const by: string[] = [];
        for (const c of direct.path) {
            const name = g.names[g.region[c]];
            if (avoided.has(g.region[c]) && !by.includes(name)) by.push(name);
        }
        if (cut > 0) return finish(g, direct.path.slice(0, cut), from, null, avoided, by);
    }
    // No route at all: the reachable cell nearest the goal.
    return finish(g, pathTo(safe.parent, safe.closest), from, null, avoided, []);
}

/**
 * A route through the sectors the model names, in order. Each leg is a `findRoute`. A named sector that is
 * sealed is left out of the sequence (the route goes round it) and listed in `skipped`; if the start or the
 * last sector is sealed, or a leg cannot be walked, the route is blocked and ends where the walking stops.
 */
export function routeThrough(floor: Floor, slugs: string[], opts: ThroughOptions = {}): ThroughRoute {
    const avoid = opts.avoid ?? [];
    const g = gridFor(floor);
    const sealed = new Set(avoid.map((s) => g.index.get(s)).filter((r): r is number => r !== undefined));
    const regionOf = (s: string) => g.index.get(s);
    const named = slugs.filter((s, i) => i === 0 || regionOf(s) !== regionOf(slugs[i - 1]));
    const skipped: string[] = [];
    const stops = named.filter((s, i) => {
        const keep = i === 0 || i === named.length - 1 || !sealed.has(regionOf(s) ?? -1);
        if (!keep) skipped.push(s);
        return keep;
    });
    if (opts.exit && stops.length) {
        const last = stops[stops.length - 1];
        const zone = floor.zones.find((z) => z.slug === last || z.aliases?.includes(last));
        const exit = floor.features.find((f) => f.exit && f.zone === zone?.slug)?.id;
        if (exit) stops.push(exit);
    }
    const legs: Route[] = [];
    const visits: { at: number; region: number }[] = []; // where a leg ends in a sector the model named
    let points: Point[] = [];
    const zones: string[] = [];
    let blocked = false;
    const blockedBy: string[] = [];
    for (let i = 0; i + 1 < stops.length && !blocked; i++) {
        const leg = findRoute(floor, { from: stops[i], to: stops[i + 1], avoid });
        legs.push(leg);
        const first = points.length ? 1 : 0; // the junction point is shared
        points = points.concat(leg.points.slice(first));
        const region = regionOf(stops[i + 1]);
        if (i + 2 < stops.length && region !== undefined) visits.push({ at: points.length - 1, region });
        for (const z of leg.zones) if (z !== zones[zones.length - 1]) zones.push(z);
        if (leg.blocked) {
            blocked = true;
            for (const b of leg.blockedBy) if (!blockedBy.includes(b)) blockedBy.push(b);
        }
    }
    if (!points.length && stops.length) {
        const only = resolve(g, floor, stops[0]);
        points = [[round2(only.point[0]), round2(only.point[1])]];
        zones.push(g.names[only.region]);
    }
    if (!blocked && visits.length) {
        const avoided = new Set(sealed);
        if (stops.length) avoided.delete(regionOf(stops[0]) ?? -1);
        points = throughDoors(g, straighten(g, points, visits, avoided)).map(([x, y]) => [round2(x), round2(y)] as Point);
        zones.splice(0, zones.length, ...describe(g, points).zones);
    }
    return { points, zones, blocked, blockedBy, length: round2(describe(g, points).length), legs, skipped };
}

/** The zone (or unzoned block) a point lies in, or null when it is not on the walkable floor. */
export function zoneAt(floor: Floor, point: Point): string | null {
    const g = gridFor(floor);
    const c = cellAt(g, point[0], point[1]);
    return c >= 0 && g.region[c] >= 0 ? g.names[g.region[c]] : null;
}

/** Where a route to or from a zone starts and ends: the zone's `route_at`, or its roomiest spot. */
export function zoneAnchor(floor: Floor, slug: string): Point | null {
    const g = gridFor(floor);
    const r = g.index.get(slug);
    if (r === undefined) return null;
    return resolve(g, floor, slug).point;
}
