// Where each component sits on the 12-column station grid. The model decides which components
// appear and in what order; the page decides how wide each type is, so the station is always laid
// out the same way and leaves no gaps.
//
//   ThreatBanner                 full width, first
//   FloorPlan                    8 columns, with the CountermeasurePicker beside it (the operator's
//                                one decision stays near the top), or else up to two small panels
//   SkyClock                     full width, after that row
//   CivilianTracker,
//   CountermeasurePicker         6 columns
//   EntityCard, SystemsBoard,
//   ThermalReadout, EMFGauge     4 columns
//   SourceLedger                 full width, last
//
// Everything else fills rows of 12 in the model's order; a row that cannot take the next panel is
// widened so it has no gap. A row of two with the EntityCard keeps the portrait at 4 and gives the
// other panel 8, so the row is no taller than the art.
import type { Component, ComponentType } from '../../shared/protocol.ts';

export interface Placed {
    component: Component;
    index: number; // the model's position, shown on the card
    span: number;
    tall: boolean; // spans two rows (the floor plan beside two stacked panels)
}

const FIRST: ComponentType[] = ['ThreatBanner'];
const AFTER_FLOOR: ComponentType[] = ['SkyClock'];
const LAST: ComponentType[] = ['SourceLedger'];
const SMALL: ComponentType[] = ['EntityCard', 'SystemsBoard', 'ThermalReadout', 'EMFGauge'];
const MEDIUM: ComponentType[] = ['CivilianTracker', 'CountermeasurePicker'];

export function layout(components: (Component | undefined)[]): Placed[] {
    const items = components.flatMap((component, index) => (component ? [{ component, index }] : []));
    const of = (types: ComponentType[]) => items.filter((x) => types.includes(x.component.type));
    const out: Placed[] = of(FIRST).map((x) => ({ ...x, span: 12, tall: false }));

    let rest = items.filter((x) => ![...FIRST, ...AFTER_FLOOR, ...LAST].includes(x.component.type));
    const floor = rest.find((x) => x.component.type === 'FloorPlan');
    if (floor) {
        const picker = rest.find((x) => x.component.type === 'CountermeasurePicker');
        const beside = picker ? [picker] : rest.filter((x) => SMALL.includes(x.component.type)).slice(0, 2);
        out.push({ ...floor, span: beside.length ? 8 : 12, tall: beside.length === 2 });
        out.push(...beside.map((x) => ({ ...x, span: 4, tall: false })));
        rest = rest.filter((x) => x !== floor && !beside.includes(x));
    }
    out.push(...of(AFTER_FLOOR).map((x) => ({ ...x, span: 12, tall: false })));

    let row: Placed[] = [];
    const flush = () => {
        const used = row.reduce((sum, p) => sum + p.span, 0);
        const entity = row.find((p) => p.component.type === 'EntityCard');
        if (row.length === 2 && entity) {
            // The square portrait sets a short row at 4 columns, and its neighbour gets the width.
            row.forEach((p) => (p.span = p === entity ? 4 : 8));
        } else if (used < 12) {
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
