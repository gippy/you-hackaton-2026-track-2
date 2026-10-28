// The page's state: everything the server has streamed for the current run, plus the operator's choices.
// Every server message goes through `reduce`, so a late joiner that gets the history replayed ends up
// in the same state as a page that watched the run live.
import type { Action, ArtAsset, Component, DispatchMode, FixtureIncident, Floor, Incident, Library, PageInfo, Scenario, Sky, SkyWarning, Manifest, ServerMessage, Source, StepId, StepState, Theme } from '../../shared/protocol.ts';

export interface Step {
    state?: StepState;
    detail?: string;
    ms?: number;
}

export interface Operator {
    action: Action;
    countermeasure: string | null;
    sealed: string[];
    extracted: number[]; // indexes of people marked extracted
}

export interface State {
    connected: boolean;
    mode: 'live' | 'offline' | null;
    liveDispatch: boolean;
    livePage: boolean;
    pages: PageInfo[];
    skyWarnings: SkyWarning[];
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
    sources: Source[];
    sky: Sky | null;
    title: string;
    theme: Theme;
    components: Component[];
    manifest: Manifest | null;
    operator: Operator;
    dispatch: { mode: DispatchMode; text: string; request?: unknown; response?: unknown; error?: string; paging?: string } | null;
    dispatching: boolean;
}

export type Event =
    | { type: 'server'; msg: ServerMessage }
    | { type: 'connected'; value: boolean }
    | { type: 'action'; value: Action }
    | { type: 'countermeasure'; id: string }
    | { type: 'toggle-seal'; sector: string }
    | { type: 'toggle-person'; index: number }
    | { type: 'dispatching' };

const OPERATOR: Operator = { action: 'contain', countermeasure: null, sealed: [], extracted: [] };

export const initial: State = {
    connected: false,
    mode: null,
    liveDispatch: false,
    livePage: false,
    pages: [],
    skyWarnings: [],
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
    sources: [],
    sky: null,
    title: 'Haunted Command Station',
    theme: 'crypt-dark',
    components: [],
    manifest: null,
    operator: OPERATOR,
    dispatch: null,
    dispatching: false,
};

const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

/** The operator's starting point is the model's: its recommended countermeasure and its sealed sectors. */
function adopt(operator: Operator, comp: Component): Operator {
    if (comp.type === 'CountermeasurePicker' && !operator.countermeasure) return { ...operator, countermeasure: comp.props.recommended };
    if (comp.type === 'FloorPlan' && !operator.sealed.length) return { ...operator, sealed: comp.props.seal };
    return operator;
}

function server(state: State, msg: ServerMessage): State {
    switch (msg.type) {
        case 'hello':
            return { ...state, mode: msg.mode, liveDispatch: msg.live_dispatch, livePage: msg.live_page, library: msg.library, incidents: msg.incidents, scenarios: msg.scenarios, art: msg.art, floor: msg.floor };
        case 'run_begin':
            return {
                ...initial,
                connected: state.connected,
                mode: state.mode,
                liveDispatch: state.liveDispatch,
                livePage: state.livePage,
                pages: state.pages,
                skyWarnings: state.skyWarnings,
                library: state.library,
                incidents: state.incidents,
                scenarios: state.scenarios,
                art: state.art,
                floor: state.floor,
                source: msg.source,
                banner: msg.detail ? { text: msg.detail, kind: 'info' } : null,
            };
        case 'step':
            return { ...state, steps: { ...state.steps, [msg.id]: { ...state.steps[msg.id], state: msg.state, detail: msg.detail, ms: msg.ms || state.steps[msg.id]?.ms } } };
        case 'incident':
            return { ...state, incident: msg };
        case 'route':
            return { ...state, steps: { ...state.steps, triage: { state: 'done', detail: `${msg.playbook}: ${msg.arsenal.length} countermeasures in the arsenal` } } };
        case 'search':
            return { ...state, queries: [...state.queries, `${msg.query} → ${msg.hits.length} hits`] };
        case 'sources':
            return { ...state, sources: msg.sources };
        case 'sky':
            return { ...state, sky: msg.sky };
        case 'frame':
            return { ...state, title: msg.title ?? state.title, theme: msg.theme ?? state.theme };
        case 'component': {
            const components = [...state.components];
            components[msg.index] = msg.component;
            return { ...state, components, operator: adopt(state.operator, msg.component) };
        }
        case 'run_end': {
            const operator = msg.manifest.components.reduce(adopt, { ...state.operator, action: msg.manifest.recommended_action });
            const notes = msg.notes.length && msg.source === 'live' ? { text: `Pipeline notes: ${msg.notes.join('; ')}`, kind: 'info' as const } : state.banner;
            return { ...state, manifest: msg.manifest, components: msg.manifest.components, title: msg.manifest.title, theme: msg.manifest.theme, operator, banner: notes };
        }
        case 'dispatch':
            return { ...state, dispatch: msg, dispatching: false };
        case 'pages':
            return { ...state, pages: msg.pages };
        case 'sky_warnings':
            return { ...state, skyWarnings: msg.warnings };
        case 'error':
            return { ...state, banner: { text: msg.detail, kind: 'error' }, dispatching: false };
        case 'speech':
            return state; // played by the SoundBoard, not part of what the page shows
    }
}

export function reduce(state: State, event: Event): State {
    switch (event.type) {
        case 'server':
            return server(state, event.msg);
        case 'connected':
            return { ...state, connected: event.value };
        case 'action':
            return { ...state, operator: { ...state.operator, action: event.value } };
        case 'countermeasure':
            return { ...state, operator: { ...state.operator, countermeasure: event.id } };
        case 'toggle-seal':
            return { ...state, operator: { ...state.operator, sealed: toggle(state.operator.sealed, event.sector) } };
        case 'toggle-person':
            return { ...state, operator: { ...state.operator, extracted: toggle(state.operator.extracted, event.index) } };
        case 'dispatching':
            return { ...state, dispatching: true };
    }
}
