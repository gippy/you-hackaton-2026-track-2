// The page's state: everything the server has streamed for the current run, plus the operator's choices.
// Every server message goes through `reduce`, so a late joiner that gets the history replayed ends up
// in the same state as a page that watched the run live.
import type { ArtAsset, Component, FixtureIncident, Floor, Incident, Library, Manifest, OperatorMoves, PageInfo, Scenario, ServerMessage, Sky, Source, StepId, StepState, Theme } from '../../shared/protocol.ts';

interface Step {
    state?: StepState;
    detail?: string;
    ms?: number;
}

export interface Operator {
    countermeasure: string | null;
    sealed: string[];
    extracted: number[]; // indexes of people marked extracted
    map: 'floor' | 'area' | null; // the FloorPlan's view: the model's, until the operator switches it
}

export interface State {
    connected: boolean;
    mode: 'live' | 'offline' | null;
    pages: PageInfo[];
    library: Library | null;
    incidents: FixtureIncident[];
    scenarios: Scenario[];
    art: Record<string, ArtAsset>;
    floor: Floor | null;
    source: 'live' | 'snapshot' | null;
    banner: { text: string; kind: 'info' | 'error' } | null;
    steps: Partial<Record<StepId, Step>>;
    queries: string[];
    incident: { incident: Incident; incident_id: string; severity_tier: string; raw: string } | null;
    /** The playbook the code routed the incident to (corporeal, spectral or anomalous): it picks the expert to call. */
    playbook: string | null;
    sources: Source[];
    sky: Sky | null;
    title: string;
    theme: Theme;
    components: Component[];
    manifest: Manifest | null;
    operator: Operator;
    /** What the operator did on the step before, when this run builds on it. */
    moves: OperatorMoves | null;
    /** How many earlier steps of this scenario the run's intake read (its memory). */
    remembered: number;
    /** Set when another viewer of this shared station started the run on screen. */
    notice: string | null;
}

export type Event =
    | { type: 'server'; msg: ServerMessage; foreign?: boolean }
    | { type: 'connected'; value: boolean }
    | { type: 'countermeasure'; id: string }
    | { type: 'toggle-seal'; sector: string }
    | { type: 'toggle-person'; index: number }
    | { type: 'map-view'; view: 'floor' | 'area' };

const OPERATOR: Operator = { countermeasure: null, sealed: [], extracted: [], map: null };

export const initial: State = {
    connected: false,
    mode: null,
    pages: [],
    library: null,
    incidents: [],
    scenarios: [],
    art: {},
    floor: null,
    source: null,
    banner: null,
    steps: {},
    queries: [],
    incident: null,
    playbook: null,
    sources: [],
    sky: null,
    title: 'Haunted Command Station',
    theme: 'crypt-dark',
    components: [],
    manifest: null,
    operator: OPERATOR,
    moves: null,
    remembered: 0,
    notice: null,
};

/** The model sometimes opens its title with the fixture id ("SIM NIGHTFALL 21 — …"); the step shows elsewhere. */
const cleanTitle = (title: string) =>
    title.replace(/^\s*sim[- ]nightfall[- ]\d+\s*[—–:-]\s*/i, '').replace(/\s*(?:[—–-]\s*|\()sim[- ]nightfall[- ]\d+\)?\s*$/i, '').trim() || title;

const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

/**
 * A component with every list and text prop present. Saved runs from older versions, or a model that
 * skipped a field, would otherwise hand a panel `undefined` where it expects an array.
 */
function withDefaults(c: Component): Component {
    const p: any = { ...(c.props ?? {}) };
    const lists: Partial<Record<Component['type'], string[]>> = {
        SourceLedger: ['cited'],
        SkyClock: ['cited'],
        CountermeasurePicker: ['options'],
        SystemsBoard: ['systems'],
        FloorPlan: ['seal', 'safe_route'],
    };
    for (const key of lists[c.type] ?? []) if (!Array.isArray(p[key])) p[key] = [];
    if (c.type === 'CountermeasurePicker') p.options = p.options.filter((o: any) => o && typeof o.id === 'string');
    return { ...c, why: c.why ?? '', props: p } as Component;
}

/** The operator's starting point is the model's: its recommended countermeasure, its sealed sectors and its map view. */
function adopt(operator: Operator, comp: Component): Operator {
    if (comp.type === 'CountermeasurePicker' && !operator.countermeasure) return { ...operator, countermeasure: comp.props.recommended };
    if (comp.type === 'FloorPlan') {
        return { ...operator, sealed: operator.sealed.length ? operator.sealed : comp.props.seal, map: operator.map ?? (comp.props.view === 'area' ? 'area' : 'floor') };
    }
    return operator;
}

/** "step 21 (20:02)", an incident id, or "a pasted incident", for the notice about another viewer's run. */
function runLabel(state: State, id: string): string {
    for (const scenario of state.scenarios) {
        const step = scenario.steps.find((s) => s.incident_id === id);
        if (step) return `${scenario.title} step ${step.step} (${step.time})`;
    }
    return id || 'a pasted incident';
}

function applyServerMessage(state: State, msg: ServerMessage, foreign = false): State {
    switch (msg.type) {
        case 'hello':
            return { ...state, mode: msg.mode, library: msg.library, incidents: msg.incidents, scenarios: msg.scenarios, art: msg.art, floor: msg.floor };
        case 'run_begin':
            return {
                ...initial,
                connected: state.connected,
                mode: state.mode,
                pages: state.pages,
                library: state.library,
                incidents: state.incidents,
                scenarios: state.scenarios,
                art: state.art,
                floor: state.floor,
                source: msg.source,
                // A run that builds on the operator's moves keeps their seals on the map.
                moves: msg.moves ?? null,
                remembered: msg.remembered ?? 0,
                operator: msg.moves ? { ...OPERATOR, sealed: msg.moves.sealed } : OPERATOR,
                banner: msg.detail ? { text: msg.detail, kind: 'info' } : null,
                notice: foreign ? `Another viewer of this station started ${runLabel(state, msg.requested ?? msg.incident_id)}.` : null,
            };
        case 'step':
            return { ...state, steps: { ...state.steps, [msg.id]: { ...state.steps[msg.id], state: msg.state, detail: msg.detail, ms: msg.ms || state.steps[msg.id]?.ms } } };
        case 'incident':
            return { ...state, incident: msg };
        case 'route':
            return { ...state, playbook: msg.label, steps: { ...state.steps, triage: { state: 'done', detail: `${msg.playbook}: ${msg.arsenal.length} countermeasures in the arsenal` } } };
        case 'search':
            return { ...state, queries: [...state.queries, `${msg.query} → ${msg.hits.length} hits`] };
        case 'sources':
            return { ...state, sources: msg.sources };
        case 'sky':
            return { ...state, sky: msg.sky };
        case 'frame':
            return { ...state, title: msg.title ? cleanTitle(msg.title) : state.title, theme: msg.theme ?? state.theme };
        case 'component': {
            const components = [...state.components];
            components[msg.index] = withDefaults(msg.component);
            return { ...state, components, operator: adopt(state.operator, components[msg.index]) };
        }
        case 'run_end': {
            const manifest = { ...msg.manifest, components: (msg.manifest.components ?? []).map(withDefaults) };
            const operator = manifest.components.reduce(adopt, state.operator);
            const notes = msg.notes?.length && msg.source === 'live' ? { text: `Pipeline notes: ${msg.notes.join('; ')}`, kind: 'info' as const } : state.banner;
            return { ...state, manifest, components: manifest.components, title: manifest.title ? cleanTitle(manifest.title) : state.title, theme: manifest.theme, operator, banner: notes };
        }
        case 'pages':
            return { ...state, pages: msg.pages };
        case 'error':
            return { ...state, banner: { text: msg.detail, kind: 'error' } };
        case 'speech':
        case 'synced':
            return state; // handled outside the page state: by the SoundBoard, and by App's own-request tracking
    }
}

export function reduce(state: State, event: Event): State {
    switch (event.type) {
        case 'server':
            return applyServerMessage(state, event.msg, event.foreign);
        case 'connected':
            return { ...state, connected: event.value };
        case 'countermeasure':
            return { ...state, operator: { ...state.operator, countermeasure: event.id } };
        case 'toggle-seal':
            return { ...state, operator: { ...state.operator, sealed: toggle(state.operator.sealed, event.sector) } };
        case 'toggle-person':
            return { ...state, operator: { ...state.operator, extracted: toggle(state.operator.extracted, event.index) } };
        case 'map-view':
            return { ...state, operator: { ...state.operator, map: event.view } };
    }
}
