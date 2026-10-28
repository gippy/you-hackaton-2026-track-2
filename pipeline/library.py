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
from pathlib import Path

# One library for the pipeline, the server and the page: shared/library.json.
_ROOT = Path(__file__).resolve().parent.parent
_LIB = json.loads((_ROOT / "shared" / "library.json").read_text())


def _load_optional(key: str) -> dict:
    """The JSON file library.json names under `key`, or {} when it is missing."""
    path = _ROOT / _LIB[key]
    return json.loads(path.read_text()) if path.exists() else {}


# The Loft's floor (a schematic) and the blocks around it (OpenStreetMap), from data/map/.
FLOOR: dict = _load_optional("floor_plan")
AREA: dict = _load_optional("area_map")
# The art library (art/nightfall/manifest.json): the model may pick entity and sector images by id.
ART: dict[str, dict] = _load_optional("art_manifest")
ENTITY_IMAGES = {k: v["alt"] for k, v in ART.items() if v.get("kind") == "entity"}
SCENE_IMAGES = {k: v["alt"] for k, v in ART.items() if v.get("kind") == "sector"}

SECTORS: dict[str, str] = _LIB["sectors"]               # loft sectors the floor plan draws
SECTOR_ALIASES: dict[str, str] = _LIB["sector_aliases"]  # other names for a sector, e.g. the official fixture's catering_coffee_bar
ARSENAL: dict[str, str] = _LIB["arsenal"]               # everything the containment team can deploy
PLAYBOOKS: dict[str, dict] = _LIB["playbooks"]          # the router picks one per incident class
COMPONENTS: dict[str, str] = _LIB["components"]         # what each component is for, shown to the model
ACTIONS: list[str] = _LIB["actions"]
SEVERITIES: list[str] = _LIB["severities"]
THEMES: list[str] = _LIB["themes"]
SUPPORT: list[str] = _LIB["support"]                    # how well the sources back a countermeasure
SOUNDS: dict[str, dict] = _LIB["sounds"]                # generated once by `pnpm sfx`, played by the page
CUES: list[str] = [k for k, v in SOUNDS.items() if v["kind"] in ("cue", "sting")]  # the sounds a manifest may open with
ENTITY_CLASSES: dict[str, list[str]] = _LIB["entity_classes"]  # playbook -> words that name its creatures
EMF_NORMAL_MG: float = _LIB["emf_normal_mg"]  # at or below this, an EMF reading is ordinary background
SKY_EVENTS = ["sunset", "civil_dusk", "full_dark", "moonrise"]  # what a SkyClock can focus on
MARKER_KINDS = ["threat", "people", "countermeasure", "hazard"]  # what a note on the floor plan is about
MAX_MARKERS = 4
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


def is_harmless(incident: dict | None) -> bool:
    """The intake judged the report harmless, and nobody in it acted deliberately."""
    return bool(incident) and incident.get("verdict") == "harmless" and not incident.get("deliberate_act")


def far_from_sky(incident: dict | None, sky: dict | None) -> int | None:
    """Minutes to the next sky event when nobody is hurt and it is over QUIET_LEAD_MIN away, else None.

    Pasted incidents carry no sky, and a night with every event passed has nothing upcoming, so the
    rule never applies to them.
    """
    upcoming = [m for m in ((sky or {}).get("minutes_to") or {}).values() if isinstance(m, (int, float)) and m > 0]
    if not incident or not upcoming or incident.get("people_hurt"):
        return None
    return min(upcoming) if min(upcoming) > QUIET_LEAD_MIN else None


def opening_cue(cue: str | None, harmless: bool) -> str:
    """The station's opening sound: all_clear for a harmless report and only then, else the model's pick."""
    if harmless:
        return "all_clear"
    return cue if cue in CUES and cue != "all_clear" else "alert_chime"


def sector_spots(sector: str) -> list[str]:
    """Landmarks inside a sector, from data/map/floor.json, for the intake's sector choice."""
    for zone in FLOOR.get("zones", []):
        if sector_id(zone["slug"]) == sector:
            return zone.get("spots", [])
    return []


def exit_sectors() -> set[str]:
    """Sectors with a way out of the building (data/map/floor.json's exits), in the station's slugs."""
    return {sector_id(f["zone"]) for f in FLOOR.get("features", []) if f.get("exit") and f.get("zone")}


def anchors() -> dict[str, str]:
    """Outdoor story spots around the tower (area.geojson anchors): id -> label."""
    return {f["properties"]["id"]: f["properties"]["label"] for f in AREA.get("features", [])
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
        "props": _obj(props),
    })


def components_for(sky: bool) -> dict[str, str]:
    """The components a run may use: SkyClock only with a sky (a scenario step), EntityCard only with art."""
    return {k: v for k, v in COMPONENTS.items() if (sky or k != "SkyClock") and (ENTITY_IMAGES or k != "EntityCard")}


def art_listing() -> str:
    """The images the model may choose from, for the compose prompt."""
    lines = [f"- {k}: {alt}" for k, alt in {**ENTITY_IMAGES, **SCENE_IMAGES}.items()]
    return "\n".join(lines) or "- none"


def manifest_schema(arsenal: list[str], source_count: int, sky: bool = False) -> dict:
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
            **({"scene": {**_enum([*SCENE_IMAGES, "none"]), "description": "A sector image to show beside the plan, or none"}}
               if SCENE_IMAGES else {}),
            "markers": {"type": "array", "maxItems": MAX_MARKERS,
                        "description": "Short notes pinned on the floor view, in their sectors, e.g. '2 vampires, row 16' or 'foam line here'",
                        "items": _obj({"sector": _enum(SECTORS),
                                       "label": {"type": "string", "description": "A fact from the report, at most 5 words"},
                                       "kind": _enum(MARKER_KINDS)})}}),
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
    ]
    if ENTITY_IMAGES:
        variants.append(_component("EntityCard", {
            "image": {**_enum(ENTITY_IMAGES), "description": "The entity image that matches the report"},
            "verdict": {**_enum(["real", "look-alike", "unconfirmed"]), "description": "look-alike for a costume or prop"},
            "caption": {"type": "string", "description": "What the commander is looking at, under 15 words"}}))
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
    })


def clean_manifest(raw: dict, arsenal: list[str], source_count: int, incident: dict | None = None,
                   quiet: bool = False) -> tuple[dict, list[str]]:
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
        if kind not in COMPONENTS:
            notes.append(f"dropped unknown component {kind!r}")
            continue
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
            _clean_picker(props, arsenal, source_count)
        if kind == "SystemsBoard":
            if incident is not None:
                # The board shows the intake's systems, so it never lists one the report does not name.
                props["systems"] = [{"name": s["name"], "status": s["status"]} for s in incident.get("systems") or []
                                    if s.get("name") and s["name"].lower() != "unknown"]
            if not props.get("systems"):
                notes.append("dropped a SystemsBoard with no systems")
                continue
        if kind == "FloorPlan":
            _clean_floor_plan(props, notes)
        reach = (incident or {}).get("people_in_reach") or 0
        if kind == "CivilianTracker" and reach and (props.get("count") or 0) > reach:
            # The headline counts the people the threat can reach; the tracker never shows more than that.
            notes.append(f"the civilian count {props.get('count')} became the {reach} people in reach")
            props["count"] = reach
        if kind == "EntityCard" and props.get("image") not in ENTITY_IMAGES:
            notes.append("dropped an EntityCard with an unknown image")
            continue
        if kind == "SkyClock" and any(ch.isdigit() for ch in props.get("warning") or ""):
            # A time or a countdown in the warning goes stale as the clock runs; the page then uses the library's order.
            notes.append("dropped a sky warning that states times instead of an order")
            props["warning"] = ""
        if kind == "SkyClock":
            props["cited"] = sorted({n for n in props.get("cited") or [] if 1 <= n <= source_count})
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


def _clean_picker(props: dict, arsenal: list[str], source_count: int) -> None:
    """Keep each arsenal option once, with a source in range, recommend a kept option, and list the recommended
    option first, then the rest best supported first."""
    options, ids = [], set()
    for opt in props.get("options") or []:
        if opt.get("id") in arsenal and opt["id"] not in ids:
            ids.add(opt["id"])
            opt["source"] = opt.get("source") if 0 <= int(opt.get("source") or 0) <= source_count else 0
            options.append(opt)
    ranked = sorted(options, key=lambda o: SUPPORT.index(o["support"]) if o.get("support") in SUPPORT else 9)
    if props.get("recommended") not in ids and ranked:
        props["recommended"] = ranked[0]["id"]
    props["options"] = sorted(ranked, key=lambda o: o["id"] != props.get("recommended"))


def _clean_floor_plan(props: dict, notes: list[str]) -> None:
    """Known sectors only, a safe route that ends at a way out, a known scene, anchor and view, and short markers."""
    props["seal"] = list(dict.fromkeys(sector_id(s) for s in props.get("seal") or [] if sector_id(s) in SECTORS))
    route = list(dict.fromkeys(sector_id(s) for s in props.get("safe_route") or [] if sector_id(s) in SECTORS))
    if not route and sector_id(props.get("hot_sector")) in SECTORS:
        # No route given: the people are where the threat is, and the page walks them to a way out.
        notes.append("no safe route given: one starts at the hot sector")
        route = [sector_id(props["hot_sector"])]
    if route and route[-1] not in exit_sectors():
        # The page walks out of the last sector's exit, so a route that stops inside the building goes on to the entrance.
        notes.append("a safe route that stopped inside the building now ends at the entrance")
        route.append("entrance")
    props["safe_route"] = route
    if props.get("scene") not in SCENE_IMAGES:
        props["scene"] = "none"
    if props.get("anchor") not in anchors():
        props["anchor"] = "none"
    if props.get("view") not in ("floor", "area"):
        props["view"] = "area" if props["anchor"] != "none" else "floor"
    markers = []
    for m in props.get("markers") or []:
        label = _short(m.get("label"), 5, 28)
        if sector_id(m.get("sector") or "") in SECTORS and m.get("kind") in MARKER_KINDS and label:
            markers.append({"sector": sector_id(m["sector"]), "label": label, "kind": m["kind"]})
    if len(markers) < len(props.get("markers") or []):
        notes.append("dropped floor plan markers with an unknown sector or kind, or no label")
    props["markers"] = markers[:MAX_MARKERS]


def _short(text: str | None, words: int, chars: int) -> str:
    """The first `words` words of `text` that fit in `chars` characters."""
    out = ""
    for word in str(text or "").split()[:words]:
        if len(out) + len(word) + bool(out) > chars:
            break
        out = f"{out} {word}" if out else word
    return out
