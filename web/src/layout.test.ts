/// <reference types="node" />
// Run with: node --test web/src/layout.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Component, ComponentType, PanelLook } from '../../shared/protocol.ts';
import { layout } from './layout.ts';

const panel = (type: ComponentType, size?: PanelLook['size']) => ({ type, why: '', props: { size } }) as Component;
const spans = (components: Component[]) => layout(components).map((p) => `${p.component.type}:${p.span}`);

/** Every row of the grid adds up to 12 columns, counting a tall panel in the next row too. */
function rowsFull(components: Component[]) {
    let used = 0;
    let carry = 0; // a tall panel's columns in the next row
    for (const p of layout(components)) {
        if (used === 0) [used, carry] = [carry, 0];
        if (p.tall) carry = p.span;
        used += p.span;
        assert.ok(used <= 12, `a row past 12 columns at ${p.component.type}`);
        if (used === 12) used = 0;
    }
    assert.equal(used, 0, 'the last row has a gap');
}

test('the banner stays first, the ledger last and the picker beside the floor plan, whatever their size', () => {
    const out = spans([
        panel('SourceLedger', 'hero'),
        panel('CountermeasurePicker', 'compact'),
        panel('FloorPlan', 'compact'),
        panel('ThreatBanner', 'compact'),
    ]);
    assert.deepEqual(out, ['ThreatBanner:12', 'FloorPlan:8', 'CountermeasurePicker:4', 'SourceLedger:12']);
});

test('a hero floor plan without a picker takes the full row', () => {
    assert.deepEqual(spans([panel('ThreatBanner'), panel('FloorPlan', 'hero'), panel('EMFGauge'), panel('ThermalReadout')]).slice(0, 2), [
        'ThreatBanner:12',
        'FloorPlan:12',
    ]);
});

test('a hero panel takes 8 columns and a compact one 4', () => {
    const out = spans([panel('ThreatBanner'), panel('CivilianTracker', 'hero'), panel('SystemsBoard', 'compact'), panel('SourceLedger')]);
    assert.deepEqual(out, ['ThreatBanner:12', 'CivilianTracker:8', 'SystemsBoard:4', 'SourceLedger:12']);
});

test('the entity portrait stays at 4 columns', () => {
    const out = spans([panel('ThreatBanner'), panel('EntityCard', 'hero'), panel('CivilianTracker'), panel('SourceLedger')]);
    assert.deepEqual(out, ['ThreatBanner:12', 'EntityCard:4', 'CivilianTracker:8', 'SourceLedger:12']);
});

test('rows have no gaps for any mix of sizes', () => {
    const types: ComponentType[] = ['CivilianTracker', 'EntityCard', 'SystemsBoard', 'ThermalReadout', 'EMFGauge', 'CountermeasurePicker'];
    const sizes: PanelLook['size'][] = ['hero', 'standard', 'compact', undefined];
    for (let seed = 0; seed < 500; seed++) {
        const pick = types.filter((_, i) => (seed >> i) % 2 === 1);
        const withFloor = seed % 3 !== 0;
        const components = [
            panel('ThreatBanner'),
            ...(withFloor ? [panel('FloorPlan', sizes[seed % 4])] : []),
            ...pick.map((t, i) => panel(t, sizes[(seed + i) % 4])),
            ...(seed % 2 ? [panel('SkyClock')] : []),
            panel('SourceLedger'),
        ];
        rowsFull(components);
    }
});
