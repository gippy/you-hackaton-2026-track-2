// The WebSocket protocol and the manifest, shared by the server and the page.
// The pipeline (Python) emits these shapes; pipeline/library.py builds the matching json_schema.

export type Severity = 'low' | 'elevated' | 'critical' | 'catastrophic';
export type Action = 'contain' | 'evacuate' | 'observe';
export type Theme = 'crypt-dark' | 'ectoplasm' | 'blood-moon' | 'fog-bank';
export type Support = 'strong' | 'moderate' | 'weak' | 'unproven';
export type Level = 'nominal' | 'elevated' | 'danger';
export type SystemStatus = 'online' | 'degraded' | 'offline';
export type Condition = 'pinned' | 'trapped' | 'injured' | 'evacuating' | 'safe' | 'unknown';

export interface Incident {
    entity: string;
    entity_class: 'spectral' | 'corporeal' | 'anomalous';
    threat_level: number;
    sector: string;
    location_detail: string;
    emf_mg: number | null;
    emf_trend: 'rising' | 'steady' | 'falling' | 'unknown';
    temperature_c: number | null;
    civilians: { count: number; condition: Condition; location: string };
    systems: { name: string; status: SystemStatus }[];
    /** The intake's judgment, made before severity. Runs saved before these fields existed have none. */
    evidence_of_threat?: string;
    ordinary_explanation?: string | null;
    deliberate_act?: boolean;
    verdict?: 'real_threat' | 'harmless' | 'unclear';
    people_in_reach?: number;
    people_hurt?: number;
    severity: Severity;
    summary: string;
}

export interface Source {
    n: number;
    title: string;
    url: string;
    description: string;
    snippet: string;
    query: string;
}

interface Base<T extends string, P> {
    type: T;
    why: string;
    props: P;
}

export type Component =
    | Base<'ThreatBanner', { severity: Severity; headline: string; directive: string }>
    | Base<'EMFGauge', { value_mg: number; threshold_mg: number; trend: 'rising' | 'steady' | 'falling'; status: Level }>
    | Base<'ThermalReadout', { temperature_c: number; baseline_c: number; status: Level }>
    | Base<'FloorPlan', { hot_sector: string; seal: string[]; safe_route: string[]; scene?: string; view?: 'floor' | 'area'; anchor?: string }>
    | Base<'CivilianTracker', { count: number; location: string; condition: Condition; priority: 'immediate' | 'high' | 'routine' }>
    | Base<
          'CountermeasurePicker',
          {
              target_entity: string;
              options: { id: string; support: Support; rationale: string; source: number }[];
              recommended: string;
          }
      >
    | Base<'SystemsBoard', { systems: { name: string; status: SystemStatus }[] }>
    | Base<'SourceLedger', { cited: number[] }>
    | Base<'SkyClock', { focus: SkyEvent['id']; warning: string; cited: number[] }>
    | Base<'EntityCard', { image: string; verdict: 'real' | 'look-alike' | 'unconfirmed'; caption: string }>;

export type ComponentType = Component['type'];

export interface SkyEvent {
    id: 'sunset' | 'civil_dusk' | 'full_dark' | 'moonrise';
    label: string;
    /** "HH:MM" in the Loft's time zone, and the same moment as ISO. */
    local: string;
    at: string;
    /** Where `local` came from: wttr.in when the network was up, else suncalc. `computed` is suncalc's own. */
    source: 'wttr.in' | 'suncalc';
    computed: string;
}

/** The sky over the Loft for a scenario step, computed by server/sky.ts. */
export interface Sky {
    day: string;
    place: string;
    /** The scenario step's "HH:MM", or empty for live time. */
    clock: string;
    clock_at: string;
    events: SkyEvent[];
    /** Minutes from `clock` (or from when the run started) to each event; negative once it has passed. */
    minutes_to: Partial<Record<SkyEvent['id'], number>>;
    moon: { phase: string; illumination: number; source: 'wttr.in' | 'suncalc' };
    live_source: { url: string; summary: string } | null;
}

export interface Manifest {
    title: string;
    theme: Theme;
    /** A key of `sounds` in shared/library.json whose kind is cue or sting. Older saved runs have none. */
    sound_cue?: string;
    components: Component[];
    recommended_action: Action;
    dispatch_rationale: string;
}

/** The flow's final state, as pipeline/flow.py HauntState dumps it. */
export interface RunState {
    incident_id: string;
    severity_tier: string;
    raw: string;
    incident: Incident;
    playbook: string;
    sources: Source[];
    research: string;
    manifest: Manifest;
    notes: string[];
    models: string[];
    sky?: Sky;
}

/** data/map/floor.json: a schematic of the Loft, 0 to 100 wide with y pointing down. Only the fields the page draws. */
export interface Floor {
    notice: string;
    space: { width: number; height: number };
    outline: [number, number][];
    zones: { slug: string; label: string; polygon: [number, number][]; label_at: [number, number] }[];
    areas: { id: string; label: string; polygon: [number, number][]; label_at: [number, number] }[];
    features: { id: string; type: string; label: string; at: [number, number]; polygon?: [number, number][]; line?: [number, number][]; zone: string | null; exit?: boolean }[];
    connections: { a: string; b: string; via: string | null }[];
}

/** One image from art/nightfall/manifest.json. `file` is relative to the repo root. */
export interface ArtAsset {
    file: string;
    kind: 'entity' | 'sector' | 'hero' | 'icon';
    alt: string;
}

export interface Library {
    sectors: Record<string, string>;
    sector_aliases: Record<string, string>;
    arsenal: Record<string, string>;
    arsenal_icons: Record<string, string>;
    playbooks: Record<string, { label: string; arsenal: string[]; lore_focus: string }>;
    components: Record<ComponentType, string>;
    actions: Action[];
}

/** One incident from fixtures/*.json. Simulated ones carry `source: "simulated"`. */
export interface FixtureIncident {
    incident_id: string;
    severity_tier: string;
    raw_incident_stream: string;
    source: 'official' | 'simulated';
    /** Scenario steps only: the scenario's id, the step number and the step's 24-hour clock time. */
    scenario?: string;
    step?: number;
    time?: string;
}

/** A scenario from fixtures/<id>/scenario.json, played one step at a time. */
export interface Scenario {
    id: string;
    title: string;
    steps: FixtureIncident[];
}

export type StepId = 'ingest' | 'triage' | 'ground' | 'compose';
export type StepState = 'running' | 'progress' | 'done' | 'failed';

/** Events the pipeline worker writes, one per line. The server forwards them as they are. */
export type FlowEvent =
    | { type: 'step'; id: StepId; state: StepState; detail: string; ms: number }
    | { type: 'incident'; incident: Incident; incident_id: string; severity_tier: string; raw: string }
    | { type: 'route'; label: string; playbook: string; arsenal: { id: string; name: string }[] }
    | { type: 'search'; query: string; hits: { n: number; title: string; url: string }[] }
    | { type: 'sources'; sources: Source[]; research: string }
    | { type: 'frame'; title?: string; theme?: Theme; sound_cue?: string }
    | { type: 'component'; index: number; component: Component }
    | { type: 'sky'; sky: Sky };

export type DispatchMode = 'dry-run' | 'live' | 'offline';

/** A countdown message for one sky event, posted once and then edited in place. */
export interface SkyWarning {
    event: SkyEvent['id'];
    text: string;
    minutes: number;
    mode: DispatchMode;
    edits: number;
    message_id?: string;
    updated_at: string;
    request?: unknown;
    error?: string;
}

/** A PagerDuty page, opened for a critical dispatch and followed until it is resolved. */
export interface PageInfo {
    key: string;
    title: string;
    urgency: 'high' | 'low';
    mode: 'dry-run' | 'live';
    status: 'sending' | 'dry-run' | 'triggered' | 'acknowledged' | 'resolved' | 'failed';
    opened_at: string;
    acknowledged_by: string[];
    id?: string;
    number?: number;
    url?: string;
    request?: unknown;
    error?: string;
}

export type ServerMessage =
    | FlowEvent
    | { type: 'hello'; mode: 'live' | 'offline'; live_dispatch: boolean; live_page: boolean; library: Library; channel: string; incidents: FixtureIncident[]; scenarios: Scenario[]; art: Record<string, ArtAsset>; floor: Floor | null }
    /** `requested` is the incident a viewer asked for; a snapshot replay may show another one. */
    | { type: 'run_begin'; incident_id: string; source: 'live' | 'snapshot'; detail?: string; requested?: string }
    /** Sent after the replay to a viewer that just connected: what follows is live. */
    | { type: 'synced' }
    | { type: 'run_end'; manifest: Manifest; notes: string[]; models: string[]; saved_at: string; source: 'live' | 'snapshot' }
    | { type: 'dispatch'; mode: DispatchMode; text: string; request?: unknown; response?: unknown; error?: string; paging?: string }
    | { type: 'pages'; pages: PageInfo[] }
    | { type: 'sky_warnings'; warnings: SkyWarning[] }
    | { type: 'speech'; url: string }
    | { type: 'error'; detail: string };

export type ClientMessage =
    | { type: 'compile'; raw?: string; incident_id?: string }
    | { type: 'dispatch'; action: Action; countermeasure: string | null; sealed: string[]; extracted: number; live: boolean; live_page: boolean }
    | { type: 'resolve_page'; key: string };
