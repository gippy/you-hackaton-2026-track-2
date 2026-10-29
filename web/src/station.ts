// The page's state: everything the server has streamed for the current run, plus the operator's choices.
// Every server message goes through `reduce`, so a late joiner that gets the history replayed ends up
// in the same state as a page that watched the run live.
import type { ArtAsset, Component, DispatchInfo, FixtureIncident, Floor, Incident, Library, Manifest, OperatorMoves, PageInfo, Scenario, ScenarioStep, ServerMessage, Sky, Source, StepId, StepState, Theme } from '../../shared/protocol.ts';

interface Step {
    state?: StepState;
    detail?: string;
    ms?: number;
}

export interface Operator {
    countermeasure: string | null;
    sealed: string[];
    extracted: number[]; // indexes of people marked extracted
    map: 'floor' | 'area' | null; // the FloorPlan view the operator picked, or null for the model's
}

export interface State {
    connected: boolean;
    mode: 'live' | 'offline' | null;
    pages: PageInfo[];
    dispatches: DispatchInfo[]; // posts to #loft-incident, newest first
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
    | { type: 'extract'; indexes: number[] }
    | { type: 'map-view'; view: 'floor' | 'area' };

const OPERATOR: Operator = { countermeasure: null, sealed: [], extracted: [], map: null };

export const initial: State = {
    connected: false,
    mode: null,
    pages: [],
    dispatches: [],
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

/** The operator's starting point is the model's: its recommended countermeasure and its sealed sectors. */
function adopt(operator: Operator, comp: Component): Operator {
    if (comp.type === 'CountermeasurePicker' && !operator.countermeasure) return { ...operator, countermeasure: comp.props.recommended };
    if (comp.type === 'FloorPlan') return { ...operator, sealed: operator.sealed.length ? operator.sealed : comp.props.seal };
    return operator;
}

/** The CivilianTracker's head count, or null when the station has no tracker. */
export function peopleCount(components: Component[]): number | null {
    const tracker = components.find((c) => c.type === 'CivilianTracker');
    return tracker?.type === 'CivilianTracker' ? tracker.props.count : null;
}

/** The scenario and step an incident id belongs to, when it is a scenario step. */
export function findStep(scenarios: Scenario[], id: string | null | undefined): { scenario: Scenario; step: ScenarioStep } | undefined {
    for (const scenario of scenarios) {
        const step = scenario.steps.find((s) => s.incident_id === id);
        if (step) return { scenario, step };
    }
    return undefined;
}

/** "Nightfall step 21 (20:02)", an incident id, or "a pasted incident", for the notice about another viewer's run. */
function runLabel(state: State, id: string): string {
    const at = findStep(state.scenarios, id);
    return at ? `${at.scenario.title} step ${at.step.step} (${at.step.time})` : id || 'a pasted incident';
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
                dispatches: state.dispatches,
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
            components[msg.index] = msg.component;
            return { ...state, components, operator: adopt(state.operator, msg.component) };
        }
        case 'run_end': {
            const { manifest } = msg;
            const operator = manifest.components.reduce(adopt, state.operator);
            const notes = msg.notes?.length && msg.source === 'live' ? { text: `Pipeline notes: ${msg.notes.join('; ')}`, kind: 'info' as const } : state.banner;
            return { ...state, manifest, components: manifest.components, title: manifest.title ? cleanTitle(manifest.title) : state.title, theme: manifest.theme, operator, banner: notes };
        }
        case 'pages':
            return { ...state, pages: msg.pages };
        case 'dispatches':
            return { ...state, dispatches: msg.dispatches };
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
        case 'extract':
            return { ...state, operator: { ...state.operator, extracted: [...new Set([...state.operator.extracted, ...event.indexes])] } };
        case 'map-view':
            return { ...state, operator: { ...state.operator, map: event.view } };
    }
}
