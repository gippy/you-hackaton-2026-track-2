// Where each component sits on the 12-column station grid. The model decides which components
// appear and in what order; the page decides how wide each type is, so the station is always laid
// out the same way and leaves no gaps.
//
//   ThreatBanner and SkyClock    full width, first
//   FloorPlan                    8 columns, with up to two small panels stacked beside it
//   CivilianTracker,
//   CountermeasurePicker         6 columns
//   EntityCard, SystemsBoard,
//   ThermalReadout, EMFGauge     4 columns
//   SourceLedger                 full width, last
//
// Everything else fills rows of 12 in the model's order; a row that cannot take the next panel is
// widened so it has no gap.
import type { Component, ComponentType } from '../../shared/protocol.ts';

export interface Placed {
    component: Component;
    index: number; // the model's position, shown on the card
    span: number;
    tall: boolean; // spans two rows (the floor plan beside two stacked panels)
}

const FIRST: ComponentType[] = ['ThreatBanner', 'SkyClock'];
const LAST: ComponentType[] = ['SourceLedger'];
const SMALL: ComponentType[] = ['EntityCard', 'SystemsBoard', 'ThermalReadout', 'EMFGauge'];
const MEDIUM: ComponentType[] = ['CivilianTracker', 'CountermeasurePicker'];

export function layout(components: (Component | undefined)[]): Placed[] {
    const items = components.flatMap((component, index) => (component ? [{ component, index }] : []));
    const of = (types: ComponentType[]) => items.filter((x) => types.includes(x.component.type));
    const out: Placed[] = of(FIRST)
        .sort((a, b) => FIRST.indexOf(a.component.type) - FIRST.indexOf(b.component.type))
        .map((x) => ({ ...x, span: 12, tall: false }));

    let rest = items.filter((x) => !FIRST.includes(x.component.type) && !LAST.includes(x.component.type));
    const floor = rest.find((x) => x.component.type === 'FloorPlan');
    if (floor) {
        const beside = rest.filter((x) => SMALL.includes(x.component.type)).slice(0, 2);
        out.push({ ...floor, span: beside.length ? 8 : 12, tall: beside.length === 2 });
        out.push(...beside.map((x) => ({ ...x, span: 4, tall: false })));
        rest = rest.filter((x) => x !== floor && !beside.includes(x));
    }

    let row: Placed[] = [];
    const flush = () => {
        const used = row.reduce((sum, p) => sum + p.span, 0);
        if (used < 12) {
            // Share the row equally when that divides it, else give the remainder to the last panel.
            if (12 % row.length === 0) row.forEach((p) => (p.span = 12 / row.length));
            else row[row.length - 1].span += 12 - used;
        }
        out.push(...row);
        row = [];
    };
    for (const x of rest) {
        const span = MEDIUM.includes(x.component.type) ? 6 : 4;
        if (row.reduce((sum, p) => sum + p.span, 0) + span > 12) flush();
        row.push({ ...x, span, tall: false });
    }
    if (row.length) flush();

    out.push(...of(LAST).map((x) => ({ ...x, span: 12, tall: false })));
    return out;
}
