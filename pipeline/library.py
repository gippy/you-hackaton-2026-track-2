"""The fixed vocabulary the model builds a station from: sectors, arsenal, components.

The model never writes markup. It picks components from COMPONENTS, fills their
props and orders them; Parasail's strict `json_schema` response format makes
anything outside this library impossible to emit. The page has one renderer per
component type and nothing else.

    data             shared/library.json, the floor and area maps, and the art manifest
    incident rules   the playbook, harmless and quiet checks, and the opening sound
    manifest_schema  the strict json_schema for one run's manifest
    clean_manifest   the code rules that keep, drop or fix the model's components
"""
from __future__ import annotations

import json
import re
from pathlib import Path

# One library for the pipeline, the server and the page: shared/library.json.
_ROOT = Path(__file__).resolve().parent.parent
_LIB = json.loads((_ROOT / "shared" / "library.json").read_text())


def _load(key: str) -> dict:
    """The JSON file library.json names under `key`."""
    return json.loads((_ROOT / _LIB[key]).read_text())


# The Loft's floor (a schematic) and the blocks around it (OpenStreetMap), from data/map/.
FLOOR: dict = _load("floor_plan")
AREA: dict = _load("area_map")
# The art library (art/station/manifest.json): the model may pick entity and sector images by id.
ART: dict[str, dict] = _load("art_manifest")
ENTITY_IMAGES = {k: v["alt"] for k, v in ART.items() if v.get("kind") == "entity"}
SCENE_IMAGES = {k: v["alt"] for k, v in ART.items() if v.get("kind") == "sector"}

SECTORS: dict[str, str] = _LIB["sectors"]               # loft sectors the floor plan draws
SECTOR_ALIASES: dict[str, str] = _LIB["sector_aliases"]  # other names for a sector, e.g. the official fixture's catering_coffee_bar
ARSENAL: dict[str, str] = _LIB["arsenal"]               # everything the containment team can deploy
PLAYBOOKS: dict[str, dict] = _LIB["playbooks"]          # the router picks one per incident class
COMPONENTS: dict[str, str] = _LIB["components"]         # what each component is for, shown to the model
ACTIONS: list[str] = _LIB["actions"]
EXPERTS: dict[str, dict] = _LIB["experts"]               # who the station can page, by id
SEVERITIES: list[str] = _LIB["severities"]
THEMES: list[str] = _LIB["themes"]
SUPPORT: list[str] = _LIB["support"]                    # how well the sources back a countermeasure
SOUNDS: dict[str, dict] = _LIB["sounds"]                # generated once by `pnpm sfx`, played by the page
CUES: list[str] = [k for k, v in SOUNDS.items() if v["kind"] in ("cue", "sting")]  # the sounds a manifest may open with
ENTITY_CLASSES: dict[str, list[str]] = _LIB["entity_classes"]  # playbook -> words that name its creatures
EMF_NORMAL_MG: float = _LIB["emf_normal_mg"]  # at or below this, an EMF reading is ordinary background
SKY_EVENTS = ["sunset", "civil_dusk", "full_dark", "moonrise"]  # what a SkyClock can focus on
MARKER_KINDS = ["threat", "people", "countermeasure", "hazard"]  # what a note on the floor plan is about
MAX_MARKERS = 6
MAP_TOKENS: dict[str, str] = _LIB["map_tokens"]  # the pictures a floor plan marker can show, besides the arsenal icons
DOT_COLORS: list[str] = list(_LIB["dot_colors"])  # a marker that no picture fits is a dot in one of these
SIZES = ["hero", "standard", "compact"]  # how much room a panel asks for; layout.ts sets the widths
# Minutes to the next sky event beyond which an unhurt crowd is watched, not contained yet.
QUIET_LEAD_MIN = 100


def sector_id(name: str) -> str:
    """A sector slug from any of its names: catering_coffee_bar becomes catering."""
    return SECTOR_ALIASES.get(name, name)


def entity_class(incident: dict) -> str:
    """The playbook for an incident: named creatures decide (a vampire is corporeal), else the model's own class."""
    for text in (incident.get("entity", ""), incident.get("summary", "")):
        low = text.lower()
        for label, words in ENTITY_CLASSES.items():
            if any(w in low for w in words):
                return label
    label = incident.get("entity_class")
    return label if label in PLAYBOOKS else "anomalous"


def is_harmless(incident: dict) -> bool:
    """The intake judged the report harmless. Ingest has already made it unclear when someone acted deliberately."""
    return incident.get("verdict") == "harmless"


def far_from_sky(incident: dict, sky: dict) -> int | None:
    """Minutes to the next sky event when nobody is hurt and it is over QUIET_LEAD_MIN away, else None.

    Pasted incidents carry no sky, and a night with every event passed has nothing upcoming, so the
    rule never applies to them.
    """
    upcoming = [m for m in (sky.get("minutes_to") or {}).values() if isinstance(m, (int, float)) and m > 0]
    if not upcoming or incident.get("people_hurt"):
        return None
    return min(upcoming) if min(upcoming) > QUIET_LEAD_MIN else None


def opening_cue(cue: str | None, harmless: bool) -> str:
    """The station's opening sound: all_clear for a harmless report and only then, else the model's pick."""
    if harmless:
        return "all_clear"
    return cue if cue in CUES and cue != "all_clear" else "alert_chime"


QUOTE_KINDS = ["threat", "harmless", "people"]  # how the report panel colors an evidence quote


def clean_quotes(quotes: list[dict] | None, raw: str) -> tuple[list[dict], int]:
    """The intake's evidence quotes that occur in the report, each as the report's own text. Returns them and how many went.

    A quote matches exactly or with its whitespace normalized; a paraphrase matches nothing and is dropped.
    Quotes that repeat or overlap an earlier one go too, so every highlight marks a distinct part of the report.
    """
    kept: list[dict] = []
    spans: list[tuple[int, int]] = []
    for q in quotes or []:
        words = str(q.get("quote") or "").split()
        m = re.search(r"\s+".join(map(re.escape, words)), raw) if words else None
        if not m or len(m.group(0)) < 4 or any(m.start() < b and a < m.end() for a, b in spans):
            continue
        spans.append(m.span())
        kept.append({"quote": m.group(0), "kind": q["kind"], "why": str(q.get("why") or "")})
    return kept, len(quotes or []) - len(kept)


def sector_spots(sector: str) -> list[str]:
    """Landmarks inside a sector, from data/map/floor.json, for the intake's sector choice."""
    for zone in FLOOR["zones"]:
        if sector_id(zone["slug"]) == sector:
            return zone.get("spots", [])
    return []


def exit_sectors() -> set[str]:
    """Sectors with a way out of the building (data/map/floor.json's exits), in the station's slugs."""
    return {sector_id(f["zone"]) for f in FLOOR["features"] if f.get("exit") and f.get("zone")}


def anchors() -> dict[str, str]:
    """Outdoor story spots around the tower (area.geojson anchors): id -> label."""
    return {f["properties"]["id"]: f["properties"]["label"] for f in AREA["features"]
            if f["properties"].get("kind") == "anchor"}


def _obj(props: dict) -> dict:
    """A strict object schema: every property required, nothing else allowed."""
    return {"type": "object", "properties": props, "required": list(props), "additionalProperties": False}


def _enum(values) -> dict:
    return {"type": "string", "enum": list(values)}


def _component(name: str, props: dict) -> dict:
    return _obj({
        "type": _enum([name]),
        "why": {"type": "string", "description": "One sentence: why the commander needs this panel for this incident"},
        "props": _obj({
            **props,
            "size": {**_enum(SIZES), "description": "hero for the panel this incident turns on, compact for a supporting one, else standard"},
            "title": {"type": "string", "description": "The panel's title for this incident, at most 5 words, e.g. 'Who's still in the hall'"},
        }),
    })


def components_for(sky: bool) -> dict[str, str]:
    """The components a run may use: SkyClock only with a sky (a scenario step)."""
    return {k: v for k, v in COMPONENTS.items() if sky or k != "SkyClock"}


def token_listing() -> str:
    """The pictures a floor plan marker can show, for the compose prompt."""
    return "\n".join(f"- {k}: {v}" for k, v in MAP_TOKENS.items())


def art_listing() -> str:
    """The images the model may choose from, for the compose prompt."""
    lines = [f"- {k}: {alt}" for k, alt in {**ENTITY_IMAGES, **SCENE_IMAGES}.items()]
    return "\n".join(lines) or "- none"


QUICK_KINDS = ["seal", "unseal", "countermeasure", "extract", "call_expert"]  # the operator moves a quick action runs
PEOPLE_SHARES = ["all", "half"]  # how many of the tracked people an extract action marks out


def manifest_schema(arsenal: list[str], source_count: int, sky: bool) -> dict:
    """The strict json_schema for one manifest. Arsenal, sources and the sky are per run, so the schema is too."""
    source_ref = {"type": "integer", "minimum": 0, "maximum": source_count,
                  "description": "1-based number of the supporting source, 0 if none"}
    variants = [
        _component("ThreatBanner", {"severity": _enum(SEVERITIES), "directive": {"type": "string"}}),
        _component("EMFGauge", {"value_mg": {"type": "number"}, "threshold_mg": {"type": "number"},
                                "trend": _enum(["rising", "steady", "falling"]),
                                "status": _enum(["nominal", "elevated", "danger"])}),
        _component("ThermalReadout", {
            "temperature_c": {"type": "number", "description": "The temperature the report gives"},
            "baseline_c": {"type": ["number", "null"],
                           "description": ("The normal for what was measured: the room temperature the report states for an air reading, "
                                           "37 for a body or fever reading, 33 for skin. null when the report states no room temperature")},
            "status": _enum(["nominal", "elevated", "danger"])}),
        _component("FloorPlan", {
            "hot_sector": _enum(SECTORS),
            "seal": {"type": "array", "items": _enum(SECTORS), "description": "Distinct sectors to lock down"},
            "safe_route": {"type": "array", "items": _enum(SECTORS),
                           "description": ("Where the people are now, then only the sectors the route must pass through, "
                                           "ending at entrance. The page walks the path between them and goes round sealed sectors")},
            "view": {**_enum(["floor", "area"]), "description": "area only when the incident is outside the building; floor for anything inside the Loft"},
            "anchor": {**_enum([*anchors(), "none"]), "description": "The outdoor spot of an incident outside the Loft, else none"},
            "scene": {**_enum([*SCENE_IMAGES, "none"]), "description": "A sector image to show beside the plan, or none"},
            "markers": {"type": "array", "maxItems": MAX_MARKERS,
                        "description": "What is where on the floor view, in their sectors, e.g. '2 vampires, row 16' or 'foam line here'",
                        "items": _obj({"sector": _enum(SECTORS),
                                       "label": {"type": "string", "description": "A fact from the report, at most 5 words"},
                                       "kind": _enum(MARKER_KINDS),
                                       "entity": {**_enum([*MAP_TOKENS, *ARSENAL, "other"]),
                                                  "description": "The picture: a map token, the countermeasure's arsenal id, or other"},
                                       "color": {**_enum(DOT_COLORS), "description": "The dot's color when entity is other"}})}}),
        _component("CivilianTracker", {"count": {"type": "integer"}, "location": {"type": "string"},
                                       "condition": _enum(["pinned", "trapped", "injured", "evacuating", "safe", "unknown"]),
                                       "priority": _enum(["immediate", "high", "routine"])}),
        _component("CountermeasurePicker", {
            "target_entity": {"type": "string", "description": ("Who the countermeasures are aimed at, as the report names them "
                                                                "(e.g. 'three werewolves'), under 6 words. Never a class like corporeal")},
            "options": {"type": "array", "items": _obj({
                "id": _enum(arsenal),
                "support": _enum(SUPPORT),
                "rationale": {"type": "string", "description": "Under 20 words"}, "source": source_ref})},
            "recommended": _enum(arsenal)}),
        _component("SystemsBoard", {"systems": {"type": "array", "items": _obj({
            "name": {"type": "string"}, "status": _enum(["online", "degraded", "offline"])})}}),
        _component("SourceLedger", {"cited": {"type": "array", "items": source_ref}}),
        _component("EntityCard", {
            "image": {**_enum(ENTITY_IMAGES), "description": "The entity image that matches the report"},
            "verdict": {**_enum(["real", "look-alike", "unconfirmed"]), "description": "look-alike for a costume or prop"},
            "caption": {"type": "string", "description": "What the commander is looking at, under 15 words"}}),
    ]
    if sky:
        variants.append(_component("SkyClock", {
            "focus": {**_enum(SKY_EVENTS), "description": "The sky event that matters most for this incident"},
            "warning": {"type": "string", "description": ("An order to the floor for before that event, e.g. 'Clear the stage and arm the netting before it rises'. "
                                        "No times, minutes or moon phase: the clock shows them. Under 15 words")},
            "cited": {"type": "array", "items": source_ref}}))
    return _obj({
        "title": {"type": "string", "description": "Station title for this incident, under 8 words"},
        "theme": _enum(THEMES),
        "sound_cue": {**_enum(CUES), "description": "The sound the station opens with"},
        "components": {"type": "array", "items": {"anyOf": variants}, "minItems": 3, "maxItems": 8},
        "recommended_action": _enum(ACTIONS),
        "dispatch_rationale": {"type": "string", "description": "One line for the containment alert, under 20 words"},
        "quick_actions": {"type": "array", "maxItems": 3, "description": "1 to 3 one-click moves for the commander", "items": _obj({
            "label": {"type": "string", "description": "Button text, an order under 5 words, e.g. 'Seal the kitchen'"},
            "kind": _enum(QUICK_KINDS),
            "target": {**_enum([*SECTORS, *arsenal, *EXPERTS, *PEOPLE_SHARES]), "description": (
                "seal and unseal: a sector; countermeasure: a picker option id; extract: all or half; call_expert: an expert")}})},
    })


def clean_manifest(raw: dict, source_count: int, incident: dict, quiet: bool) -> tuple[dict, list[str]]:
    """Keep what the page can render. Returns the manifest and notes on anything dropped.

    The schema already fixes the shape; this only removes repeats and out-of-range references,
    which a schema cannot express, and enforces these rules on the model's choices:
    - a harmless report gets a calm station (observe, the all-clear sound, no alarm panels)
    - a quiet one (far_from_sky) gets observe and no countermeasure picker yet
    - an ordinary EMF reading gets no gauge, and one above its threshold is danger
    - a thermal reading at its normal gets no panel, except as the calm panel of a harmless report
    - a SystemsBoard lists the intake's systems, and goes when there are none
    - the ledger's relied-on sources are the ones the other panels cite
    It never adds a component the model did not choose.
    """
    notes: list[str] = []
    seen: set[str] = set()
    components = []
    calm = is_harmless(incident)
    for comp in raw.get("components") or []:
        kind = comp.get("type")
        if calm and kind in ("CountermeasurePicker", "CivilianTracker", "FloorPlan"):
            notes.append(f"dropped {kind}: the intake judged the report harmless")
            continue
        if quiet and kind == "CountermeasurePicker":
            notes.append("dropped CountermeasurePicker: nobody is hurt and the next sky event is hours away")
            continue
        if kind == "EMFGauge" and float((comp.get("props") or {}).get("value_mg") or 0) <= EMF_NORMAL_MG:
            notes.append("dropped an EMFGauge showing an ordinary reading")
            continue
        if kind == "ThermalReadout" and not calm and _flat((comp.get("props") or {})):
            notes.append("dropped a ThermalReadout showing its normal temperature")
            continue
        if kind in seen:
            notes.append(f"dropped a repeated {kind}")
            continue
        seen.add(kind)
        props = comp.get("props") or {}
        if kind == "ThreatBanner" and calm and props.get("severity") != "low":
            notes.append("the intake judged the report harmless: a low ThreatBanner")
            props["severity"] = "low"
        if kind == "EMFGauge" and float(props.get("value_mg") or 0) > float(props.get("threshold_mg") or 0) and props.get("status") != "danger":
            # A reading past the gauge's own danger line is danger, whatever status the model gave.
            notes.append("the EMF reading is above its threshold: danger")
            props["status"] = "danger"
        if kind == "CountermeasurePicker":
            _clean_picker(props)
        if kind == "SystemsBoard":
            # The board shows the intake's systems, so it never lists one the report does not name.
            props["systems"] = [{"name": s["name"], "status": s["status"]} for s in incident.get("systems") or []
                                if s.get("name") and s["name"].lower() != "unknown"]
            if not props.get("systems"):
                notes.append("dropped a SystemsBoard with no systems")
                continue
        if kind == "FloorPlan":
            _clean_floor_plan(props, notes)
        reach = incident.get("people_in_reach") or 0
        if kind == "CivilianTracker" and reach and (props.get("count") or 0) > reach:
            # The headline counts the people the threat can reach; the tracker never shows more than that.
            notes.append(f"the civilian count {props.get('count')} became the {reach} people in reach")
            props["count"] = reach
        if kind == "SkyClock" and any(ch.isdigit() for ch in props.get("warning") or ""):
            # A time or a countdown in the warning goes stale as the clock runs; the page then uses the library's order.
            notes.append("dropped a sky warning that states times instead of an order")
            props["warning"] = ""
        if kind == "SkyClock":
            props["cited"] = sorted({n for n in props.get("cited") or [] if 1 <= n <= source_count})
        title = " ".join(str(props.get("title") or "").split())
        if len(title.split()) > 6 or len(title) > 32:
            # A cut title reads as a broken phrase, so the page shows the panel's own name instead.
            notes.append(f"dropped a {kind} title over 6 words or 32 characters")
            title = ""
        props["title"] = title
        components.append({"type": kind, "why": comp.get("why", ""), "props": props})
    # The ledger marks as relied on only the sources the countermeasures and the sky clock cite.
    relied = sorted({o["source"] for c in components if c["type"] == "CountermeasurePicker" for o in c["props"]["options"] if o.get("source")}
                    | {n for c in components if c["type"] == "SkyClock" for n in c["props"]["cited"]})
    for c in components:
        if c["type"] == "SourceLedger":
            c["props"]["cited"] = relied
    out = {
        "title": raw.get("title") or "Haunted command station",
        "theme": raw.get("theme") if raw.get("theme") in THEMES else THEMES[0],
        "sound_cue": opening_cue(raw.get("sound_cue"), calm),
        "components": components,
        "recommended_action": "observe" if calm or quiet else raw.get("recommended_action") if raw.get("recommended_action") in ACTIONS else "contain",
        "dispatch_rationale": raw.get("dispatch_rationale") or "",
        "quick_actions": _clean_quick_actions(raw.get("quick_actions"), components, calm, notes),
    }
    if calm and (raw.get("recommended_action") != "observe" or raw.get("sound_cue") != "all_clear"):
        notes.append("the intake judged the report harmless: observe and the all-clear sound")
    elif quiet and raw.get("recommended_action") != "observe":
        notes.append("nobody is hurt and the next sky event is hours away: observe")
    return out, notes


def _flat(thermal: dict) -> bool:
    """A thermal reading within half a degree of its normal."""
    base = thermal.get("baseline_c")
    return isinstance(base, (int, float)) and abs(float(thermal.get("temperature_c") or 0) - base) < 0.5


def _clean_picker(props: dict) -> None:
    """Keep each option once, recommend a kept option, and list the recommended option first, then the rest
    best supported first."""
    options, ids = [], set()
    for opt in props.get("options") or []:
        if opt["id"] not in ids:
            ids.add(opt["id"])
            options.append(opt)
    ranked = sorted(options, key=lambda o: SUPPORT.index(o["support"]))
    if props.get("recommended") not in ids and ranked:
        props["recommended"] = ranked[0]["id"]
    props["options"] = sorted(ranked, key=lambda o: o["id"] != props.get("recommended"))


def _clean_quick_actions(actions: list[dict] | None, components: list[dict], calm: bool, notes: list[str]) -> list[dict]:
    """Keep the quick actions this station can run, each once:
    - seal and unseal: a sector, with a FloorPlan on the station, and never one the plan already seals
    - countermeasure: an option of the station's picker other than the recommended one, which is already picked
    - extract: all or half of the people on the station's CivilianTracker
    - call_expert: a known expert
    A harmless station keeps only unseal. A label of 5 words or more becomes the code's own.
    """
    props = {c["type"]: c["props"] for c in components}
    plan, picker = props.get("FloorPlan"), props.get("CountermeasurePicker")
    options = {o["id"] for o in picker["options"] if o["id"] != picker.get("recommended")} if picker else set()
    runnable = {
        "seal": lambda t: plan is not None and t in SECTORS and t not in plan["seal"],
        "unseal": lambda t: plan is not None and t in SECTORS and t not in plan["seal"],
        "countermeasure": lambda t: t in options,
        "extract": lambda t: "CivilianTracker" in props and t in PEOPLE_SHARES,
        "call_expert": lambda t: t in EXPERTS,
    }
    names = {"seal": lambda t: f"Seal {SECTORS[t]}", "unseal": lambda t: f"Unseal {SECTORS[t]}", "countermeasure": lambda t: ARSENAL[t],
             "extract": lambda t: f"Get {t} out", "call_expert": lambda t: f"Call {EXPERTS[t]['label']}"}
    kept: list[dict] = []
    for a in actions or []:
        kind, target = a.get("kind"), a.get("target")
        if not runnable[kind](target) or (calm and kind != "unseal") \
                or any(k["kind"] == kind and k["target"] == target for k in kept):
            notes.append(f"dropped a quick action this station cannot run: {kind} {target}")
            continue
        label = str(a.get("label") or "").strip()
        kept.append({"label": label if label and len(label.split()) < 5 else names[kind](target), "kind": kind, "target": target})
    return kept


def _clean_floor_plan(props: dict, notes: list[str]) -> None:
    """Distinct seals, a safe route that ends at a way out, and markers with short labels."""
    props["seal"] = list(dict.fromkeys(props.get("seal") or []))
    route = list(dict.fromkeys(props.get("safe_route") or []))
    if not route:
        # No route given: the people are where the threat is, and the page walks them to a way out.
        notes.append("no safe route given: one starts at the hot sector")
        route = [props["hot_sector"]]
    if route[-1] not in exit_sectors():
        # The page walks out of the last sector's exit, so a route that stops inside the building goes on to the entrance.
        notes.append("a safe route that stopped inside the building now ends at the entrance")
        route.append("entrance")
    props["safe_route"] = route
    markers = [{**m, "label": _short(m.get("label"), 5, 28)} for m in props.get("markers") or []]
    props["markers"] = [m for m in markers if m["label"]]
    if len(props["markers"]) < len(markers):
        notes.append("dropped floor plan markers with no label")


def _short(text: str | None, words: int, chars: int) -> str:
    """The first `words` words of `text` that fit in `chars` characters."""
    out = ""
    for word in str(text or "").split()[:words]:
        if len(out) + len(word) + bool(out) > chars:
            break
        out = f"{out} {word}" if out else word
    return out
