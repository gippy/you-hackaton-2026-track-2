/// <reference types="node" />
// Run with: node --test web/src/route.test.ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import type { Floor } from '../../shared/protocol.ts';
import { findRoute, routeThrough, zoneAnchor, zoneAt } from './route.ts';
import type { Point } from './route.ts';

const load = () => JSON.parse(readFileSync(new URL('../../data/map/floor.json', import.meta.url), 'utf8')) as Floor;
const floor = load();

const inPoly = (poly: Point[], [x, y]: Point): boolean => {
    let hit = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const [xi, yi] = poly[i];
        const [xj, yj] = poly[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
    }
    return hit;
};

/** Points along a polyline, a quarter of a unit apart. */
function sample(points: Point[]): Point[] {
    const out: Point[] = [];
    for (let k = 0; k + 1 < points.length; k++) {
        const [a, b] = [points[k], points[k + 1]];
        const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.25));
        for (let s = 0; s <= n; s++) out.push([a[0] + ((b[0] - a[0]) * s) / n, a[1] + ((b[1] - a[1]) * s) / n]);
    }
    return points.length === 1 ? [points[0]] : out;
}

/** Every pair of neighbouring samples that changes zone must be a pair the floor connects. */
function assertOnlyThroughConnections(points: Point[]): void {
    const connected = new Set(floor.connections.flatMap((c) => [`${c.a}|${c.b}`, `${c.b}|${c.a}`]));
    const samples = sample(points);
    const names = samples.map((p) => zoneAt(floor, p));
    for (let i = 0; i + 1 < names.length; i++) {
        const [a, b] = [names[i], names[i + 1]];
        if (a === b) continue;
        assert.ok(a && b && connected.has(`${a}|${b}`), `walked from ${a} to ${b} without a connection`);
        // Through the middle of a door, not past its jamb.
        const link = floor.connections.find((c) => (c.a === a && c.b === b) || (c.a === b && c.b === a))!;
        const door = link.via ? floor.features.find((f) => f.id === link.via) : undefined;
        if (door) assert.ok(Math.hypot(samples[i][0] - door.at[0], samples[i][1] - door.at[1]) < 0.9, `crossed from ${a} to ${b} away from ${door.id}`);
    }
}

const sectors = floor.zones.map((z) => z.slug);

test('main stage to the entrance never enters the open middle', () => {
    const route = findRoute(floor, { from: 'main_stage', to: 'entrance' });
    assert.equal(route.blocked, false);
    assert.equal(route.zones[0], 'main_stage');
    assert.equal(route.zones.at(-1), 'entrance');
    assert.ok(route.points.length >= 3 && route.points.length <= 8, `a few clean segments, got ${route.points.length} points`);
    for (const p of sample(route.points)) assert.ok(!inPoly(floor.open_middle ?? [], p), `${p} is in the open middle`);
    assertOnlyThroughConnections(route.points);
});

test('with Registration sealed the route goes around it or reports blocked', () => {
    const route = findRoute(floor, { from: 'main_stage', to: 'entrance', avoid: ['registration'] });
    assert.ok(!route.zones.includes('registration'));
    if (!route.blocked) {
        assert.equal(route.zones.at(-1), 'entrance');
        assert.ok(route.zones.includes('hack_floor_west'), 'goes round through Training Rooms');
    } else {
        assert.ok(route.blockedBy.includes('registration'));
    }
    for (const p of sample(route.points)) assert.notEqual(zoneAt(floor, p), 'registration');
    assertOnlyThroughConnections(route.points);
});

test('without the Training Rooms door, sealing Registration traps the stage hall', () => {
    const closed = load();
    closed.connections = closed.connections.filter((c) => c.via !== 'training_door');
    const route = findRoute(closed, { from: 'main_stage', to: 'entrance', avoid: ['registration'] });
    assert.equal(route.blocked, true);
    assert.deepEqual(route.blockedBy, ['registration']);
    assert.equal(route.zones.at(-1), 'main_stage');
    assert.ok(route.points.every((p) => zoneAt(closed, p) !== null));
});

test('with every way out sealed the route is blocked and stops before the sealed zones', () => {
    const route = findRoute(floor, { from: 'main_stage', to: 'entrance', avoid: ['registration', 'hack_floor_west'] });
    assert.equal(route.blocked, true);
    assert.ok(route.blockedBy.length > 0);
    assert.ok(route.points.length >= 1);
    for (const z of route.zones) assert.ok(!['registration', 'hack_floor_west'].includes(z), `entered ${z}`);
    assert.ok(route.points.every((p) => zoneAt(floor, p) !== null));
});

test('a sealed goal is blocked, and the start zone is exempt from avoid', () => {
    const sealedGoal = findRoute(floor, { from: 'lounge', to: 'registration', avoid: ['registration'] });
    assert.equal(sealedGoal.blocked, true);
    assert.ok(!sealedGoal.zones.includes('registration'));
    const sealedStart = findRoute(floor, { from: 'main_stage', to: 'entrance', avoid: ['main_stage'] });
    assert.equal(sealedStart.blocked, false);
    assert.equal(sealedStart.zones[0], 'main_stage');
});

test('every point of every route between sectors and exits is inside a walkable zone', () => {
    const exits = floor.features.filter((f) => f.exit).map((f) => f.id);
    let routes = 0;
    for (const from of sectors) {
        for (const to of [...sectors, ...exits]) {
            const route = findRoute(floor, { from, to });
            routes++;
            assert.equal(route.blocked, false, `${from} to ${to}`);
            for (const p of route.points) assert.ok(zoneAt(floor, p) !== null, `${from} to ${to}: ${p} is not walkable`);
            for (const p of sample(route.points)) assert.ok(zoneAt(floor, p) !== null, `${from} to ${to}: ${p} is not walkable`);
            assertOnlyThroughConnections(route.points);
        }
    }
    assert.ok(routes > 60);
});

test('routes never cross the open middle or leave the outline', () => {
    for (const from of sectors) {
        for (const to of sectors) {
            for (const p of sample(findRoute(floor, { from, to, avoid: ['registration'] }).points)) {
                assert.ok(!inPoly(floor.open_middle ?? [], p));
                assert.ok(inPoly(floor.outline, p) || p[0] === 0 || p[1] === 0);
            }
        }
    }
});

test('routeThrough leaves a sealed middle sector out and routes round it', () => {
    const open = routeThrough(floor, ['main_stage', 'registration', 'entrance']);
    assert.equal(open.blocked, false);
    assert.ok(open.zones.includes('registration'));
    assert.deepEqual(open.skipped, []);
    assert.equal(open.legs.length, 2);

    const sealed = routeThrough(floor, ['main_stage', 'registration', 'entrance'], { avoid: ['registration'] });
    assert.deepEqual(sealed.skipped, ['registration']);
    assert.equal(sealed.blocked, false);
    assert.ok(!sealed.zones.includes('registration'));
    assert.equal(sealed.zones.at(-1), 'entrance');
    assertOnlyThroughConnections(sealed.points);
});

test('routeThrough passes through a named sector without walking to its middle', () => {
    const r = routeThrough(floor, ['main_stage', 'hack_floor_east', 'registration', 'entrance']);
    assert.equal(r.blocked, false);
    assert.deepEqual(r.zones.slice(0, 3), ['main_stage', 'hack_floor_east', 'registration']);
    const joined = r.legs.reduce((sum, leg) => sum + leg.length, 0);
    assert.ok(r.length < joined - 10, `a straightened route (${r.length}) is shorter than its legs end to end (${joined})`);
    for (const p of sample(r.points)) assert.ok(zoneAt(floor, p) !== null);
    assertOnlyThroughConnections(r.points);
});

test('routeThrough can finish out of an exit, and accepts the station alias for catering', () => {
    const out = routeThrough(floor, ['catering', 'lounge', 'entrance'], { exit: true });
    assert.equal(out.blocked, false);
    assert.equal(out.zones[0], 'catering_coffee_bar');
    const last = out.points.at(-1)!;
    const exit = floor.features.find((f) => f.id === 'courtyard_stairs')!;
    assert.ok(Math.hypot(last[0] - exit.at[0], last[1] - exit.at[1]) < 0.6);
});

test('routeThrough is blocked when a leg cannot be walked', () => {
    const r = routeThrough(floor, ['main_stage', 'entrance'], { avoid: ['registration', 'hack_floor_west'] });
    assert.equal(r.blocked, true);
    assert.ok(r.blockedBy.length > 0);
    const sealedLast = routeThrough(floor, ['lounge', 'registration'], { avoid: ['registration'] });
    assert.equal(sealedLast.blocked, true);
});

test('points and zone names can be given instead of sectors', () => {
    const r = findRoute(floor, { from: [12, 80], to: 'courtyard_stairs' });
    assert.equal(r.blocked, false);
    assert.deepEqual(r.points[0], [12, 80]);
    assert.equal(zoneAt(floor, [12, 80]), 'main_stage');
    assert.equal(zoneAt(floor, [60, 50]), null, 'the open middle is not walkable');
    assert.equal(zoneAt(floor, [95, 90]), null, 'the Merch Store is closed');
    assert.throws(() => findRoute(floor, { from: 'nowhere', to: 'entrance' }), /unknown place/);
    for (const slug of sectors) {
        const anchor = zoneAnchor(floor, slug)!;
        assert.equal(zoneAt(floor, anchor), slug, `${slug} anchor sits in its own zone`);
    }
});

test('every connection has a door on the border it joins, and every shared wall is accounted for', () => {
    const features = new Map(floor.features.map((f) => [f.id, f]));
    for (const c of floor.connections) {
        if (!c.via) continue;
        const door = features.get(c.via);
        assert.ok(door, `${c.via} is a feature`);
        const seen = new Set<string | null>();
        for (const [dx, dy] of [[0.6, 0], [-0.6, 0], [0, 0.6], [0, -0.6]]) seen.add(zoneAt(floor, [door.at[0] + dx, door.at[1] + dy]));
        assert.ok(seen.has(c.a) && seen.has(c.b), `${c.via} sits on the border of ${c.a} and ${c.b}`);
    }
    // Every pair of regions that share a border is connected, except walls that are meant to be walls.
    const connected = new Set(floor.connections.flatMap((c) => [`${c.a}|${c.b}`, `${c.b}|${c.a}`]));
    const walls = new Set(['lounge|network_closet', 'reception|hack_floor_east']);
    const shared = new Set<string>();
    for (let x = 0.25; x < 100; x += 0.5) {
        for (let y = 0.25; y < 97; y += 0.5) {
            const here = zoneAt(floor, [x, y]);
            for (const there of [zoneAt(floor, [x + 0.5, y]), zoneAt(floor, [x, y + 0.5])]) {
                if (here && there && here !== there) shared.add([here, there].sort().join('|'));
            }
        }
    }
    for (const pair of shared) {
        const [a, b] = pair.split('|');
        assert.ok(connected.has(pair) || walls.has(pair) || walls.has(`${b}|${a}`), `${a} and ${b} share a wall but have no connection`);
    }
});

test('a route takes under 50 ms, including building the grid', () => {
    const fresh = load(); // a new object, so nothing is cached
    let t = performance.now();
    findRoute(fresh, { from: 'main_stage', to: 'entrance', avoid: ['registration'] });
    const cold = performance.now() - t;
    t = performance.now();
    for (let i = 0; i < 10; i++) findRoute(fresh, { from: 'catering_coffee_bar', to: 'hack_floor_east', avoid: ['entrance'] });
    const warm = (performance.now() - t) / 10;
    t = performance.now();
    routeThrough(fresh, ['main_stage', 'registration', 'lounge', 'entrance'], { avoid: ['registration'], exit: true });
    const through = performance.now() - t;
    console.log(`route timing: first call ${cold.toFixed(1)} ms (builds the grid), later calls ${warm.toFixed(1)} ms, routeThrough ${through.toFixed(1)} ms`);
    assert.ok(cold < 50, `first call took ${cold.toFixed(1)} ms`);
    assert.ok(warm < 50, `later calls took ${warm.toFixed(1)} ms`);
    assert.ok(through < 50, `routeThrough took ${through.toFixed(1)} ms`);
});
