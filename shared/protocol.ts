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
    creature_countered?: boolean;
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
    | Base<'ThreatBanner', { severity: Severity; directive: string }>
    | Base<'EMFGauge', { value_mg: number; threshold_mg: number; trend: 'rising' | 'steady' | 'falling'; status: Level }>
    | Base<'ThermalReadout', { temperature_c: number; baseline_c: number | null; status: Level }>
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
    /**
     * AWS's own blocks from the kiosk map, with the sectors inside each, and the empty middle of the C.
     * `label_at` places the block's name clear of borders, sector labels and route markers.
     */
    blocks: { id: string; aws_name: string; polygon: [number, number][]; sectors: string[]; label_at: [number, number]; label_anchor: 'start' | 'middle' | 'end' }[];
    open_middle?: [number, number][];
    features: { id: string; type: string; label: string; at: [number, number]; polygon?: [number, number][]; line?: [number, number][]; zone: string | null; exit?: boolean }[];
    connections: { a: string; b: string; via: string | null }[];
}

/** One image from art/nightfall/manifest.json. `file` is relative to the repo root. */
export interface ArtAsset {
    file: string;
    kind: 'entity' | 'sector' | 'hero' | 'icon';
    alt: string;
    /** A short hash of the file's content, so a re-rendered image under the same name is not served from a cache. */
    v?: string;
}

export interface Library {
    sectors: Record<string, string>;
    sector_aliases: Record<string, string>;
    arsenal: Record<string, string>;
    arsenal_icons: Record<string, string>;
    playbooks: Record<string, { label: string; arsenal: string[]; lore_focus: string }>;
    components: Record<ComponentType, string>;
    actions: Action[];
    /** What to do as each sky event nears, for SkyClock's countdown when the model gave no warning of its own. */
    sky_advice: Partial<Record<SkyEvent['id'], string>>;
    /** The two experts the station can page: who handles which playbooks, what the voice says, which sting plays. */
    experts: Record<Expert, { label: string; playbooks: string[]; spoken: string; sting: string }>;
}

export type Expert = 'vampire_hunter' | 'ghostbuster';

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
    sky: boolean; // the real sky over the venue matters to this scenario, so its steps get sunset and moonrise times
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

/**
 * A PagerDuty page for an expert, opened by a "Call expert" click and followed until it is resolved.
 * `key` is the incident_key, `<incident_id>:<expert>`. `off` means the server has paging switched off.
 */
export interface PageInfo {
    key: string;
    expert: Expert;
    incident_id: string;
    title: string;
    urgency: 'high' | 'low';
    status: 'sending' | 'triggered' | 'acknowledged' | 'resolved' | 'failed' | 'off';
    opened_at: string;
    acknowledged_by: string[];
    id?: string;
    number?: number;
    url?: string;
    error?: string;
}

export type ServerMessage =
    | FlowEvent
    | { type: 'hello'; mode: 'live' | 'offline'; library: Library; incidents: FixtureIncident[]; scenarios: Scenario[]; art: Record<string, ArtAsset>; floor: Floor | null }
    /** `requested` is the incident a viewer asked for; a snapshot replay may show another one. */
    | { type: 'run_begin'; incident_id: string; source: 'live' | 'snapshot'; detail?: string; requested?: string; moves?: OperatorMoves; remembered?: number }
    /** Sent after the replay to a viewer that just connected: what follows is live. */
    | { type: 'synced' }
    | { type: 'run_end'; manifest: Manifest; notes: string[]; models: string[]; saved_at: string; source: 'live' | 'snapshot' }
    | { type: 'pages'; pages: PageInfo[] }
    /** A spoken line to play after the `cue` sound, such as "Calling the vampire hunter". */
    | { type: 'speech'; url: string; cue?: string }
    | { type: 'error'; detail: string };

/** What an earlier step of a scenario found, from its saved run, for a later step's intake to read. */
export interface Finding {
    time: string;
    sector: string;
    entity: string;
    entity_class: Incident['entity_class'];
    verdict: Incident['verdict'] | null;
    summary: string;
}

/** What the operator did on a scenario step, sent with the next step so its station can build on it. */
export interface OperatorMoves {
    step: string; // the incident id of the step the moves were made on
    time: string; // that step's scenario clock, "HH:MM"
    countermeasure: string | null; // an arsenal id
    sealed: string[]; // sector ids
    people_out: number; // people marked extracted on the civilian tracker
    people: number | null; // the tracker's count, when there was a tracker
}

export type ClientMessage =
    | { type: 'compile'; raw?: string; incident_id?: string; moves?: OperatorMoves }
    /** Page an expert about the station on screen, with the countermeasure the operator picked. */
    | { type: 'call_expert'; expert: Expert; countermeasure: string | null }
    | { type: 'resolve_page'; key: string };
