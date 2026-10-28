"""The fixed vocabulary the model builds a station from: sectors, arsenal, components.

The model never writes markup. It picks components from COMPONENTS, fills their
props and orders them; Parasail's strict `json_schema` response format makes
anything outside this library impossible to emit. The page has one renderer per
component type and nothing else.
"""
from __future__ import annotations

import json
from pathlib import Path

# One library for the pipeline, the server and the page: shared/library.json.
_LIB = json.loads((Path(__file__).resolve().parent.parent / "shared" / "library.json").read_text())

SECTORS: dict[str, str] = _LIB["sectors"]               # loft sectors the floor plan draws
SECTOR_ALIASES: dict[str, str] = _LIB["sector_aliases"]  # other names for a sector, e.g. the official fixture's catering_coffee_bar
LAYOUT: dict[str, list[int]] = _LIB["layout"]           # x, y, w, h on a 600 x 360 canvas
ARSENAL: dict[str, str] = _LIB["arsenal"]               # everything the containment team can deploy
PLAYBOOKS: dict[str, dict] = _LIB["playbooks"]          # the router picks one per incident class
COMPONENTS: dict[str, str] = _LIB["components"]         # what each component is for, shown to the model
ACTIONS: list[str] = _LIB["actions"]
SEVERITIES: list[str] = _LIB["severities"]
THEMES: list[str] = _LIB["themes"]
SUPPORT: list[str] = _LIB["support"]                    # how well the sources back a countermeasure
SOUNDS: dict[str, dict] = _LIB["sounds"]                # generated once by `pnpm sfx`, played by the page
CUES: list[str] = [k for k, v in SOUNDS.items() if v["kind"] in ("cue", "sting")]  # the sounds a manifest may open with


def sector_id(name: str) -> str:
    """A sector slug from any of its names: catering_coffee_bar becomes catering."""
    return SECTOR_ALIASES.get(name, name)


def adjacency() -> dict[str, list[str]]:
    """Sectors that share a wall segment, from LAYOUT."""
    def touches(a, b):
        ax, ay, aw, ah = LAYOUT[a]
        bx, by, bw, bh = LAYOUT[b]
        side = (ax + aw == bx or bx + bw == ax) and min(ay + ah, by + bh) - max(ay, by) > 0
        top = (ay + ah == by or by + bh == ay) and min(ax + aw, bx + bw) - max(ax, bx) > 0
        return side or top
    return {a: [b for b in LAYOUT if b != a and touches(a, b)] for a in LAYOUT}


def _obj(props: dict, required: list[str] | None = None) -> dict:
    return {"type": "object", "properties": props, "required": required or list(props), "additionalProperties": False}


def _enum(values) -> dict:
    return {"type": "string", "enum": list(values)}


def _component(name: str, props: dict) -> dict:
    return _obj({
        "type": _enum([name]),
        "why": {"type": "string", "description": "One sentence: why the commander needs this panel for this incident"},
        "props": _obj(props),
    })


SKY_EVENTS = ["sunset", "civil_dusk", "full_dark", "moonrise"]


def components_for(sky: bool) -> dict[str, str]:
    """The components a run may use: SkyClock only when the run has a sky (a scenario step)."""
    return {k: v for k, v in COMPONENTS.items() if sky or k != "SkyClock"}


def manifest_schema(arsenal: list[str], source_count: int, sky: bool = False) -> dict:
    """The strict json_schema for one manifest. Arsenal, sources and the sky are per run, so the schema is too."""
    source_ref = {"type": "integer", "minimum": 0, "maximum": source_count,
                  "description": "1-based number of the supporting source, 0 if none"}
    variants = [
        _component("ThreatBanner", {"severity": _enum(SEVERITIES), "headline": {"type": "string"},
                                    "directive": {"type": "string"}}),
        _component("EMFGauge", {"value_mg": {"type": "number"}, "threshold_mg": {"type": "number"},
                                "trend": _enum(["rising", "steady", "falling"]),
                                "status": _enum(["nominal", "elevated", "danger"])}),
        _component("ThermalReadout", {"temperature_c": {"type": "number"}, "baseline_c": {"type": "number"},
                                      "status": _enum(["nominal", "elevated", "danger"])}),
        _component("FloorPlan", {
            "hot_sector": _enum(SECTORS),
            "seal": {"type": "array", "items": _enum(SECTORS), "description": "Distinct sectors to lock down"},
            "safe_route": {"type": "array", "items": _enum(SECTORS),
                           "description": "Adjacent sectors from where the people are to the entrance, in order"}}),
        _component("CivilianTracker", {"count": {"type": "integer"}, "location": {"type": "string"},
                                       "condition": _enum(["pinned", "trapped", "injured", "evacuating", "safe", "unknown"]),
                                       "priority": _enum(["immediate", "high", "routine"])}),
        _component("CountermeasurePicker", {
            "target_entity": {"type": "string"},
            "options": {"type": "array", "items": _obj({
                "id": _enum(arsenal),
                "support": _enum(SUPPORT),
                "rationale": {"type": "string", "description": "Under 20 words"}, "source": source_ref})},
            "recommended": _enum(arsenal)}),
        _component("SystemsBoard", {"systems": {"type": "array", "items": _obj({
            "name": {"type": "string"}, "status": _enum(["online", "degraded", "offline"])})}}),
        _component("SourceLedger", {"cited": {"type": "array", "items": source_ref}}),
    ]
    if sky:
        variants.append(_component("SkyClock", {
            "focus": {**_enum(SKY_EVENTS), "description": "The sky event that matters most for this incident"},
            "warning": {"type": "string", "description": "What to do before that event, under 15 words"},
            "cited": {"type": "array", "items": source_ref}}))
    return _obj({
        "title": {"type": "string", "description": "Station title for this incident, under 8 words"},
        "theme": _enum(THEMES),
        "sound_cue": {**_enum(CUES), "description": "The sound the station opens with"},
        "components": {"type": "array", "items": {"anyOf": variants}, "minItems": 3, "maxItems": 8},
        "recommended_action": _enum(ACTIONS),
        "dispatch_rationale": {"type": "string", "description": "One line for the containment alert, under 20 words"},
    })


def clean_manifest(raw: dict, arsenal: list[str], source_count: int) -> tuple[dict, list[str]]:
    """Keep what the page can render. Returns the manifest and notes on anything dropped.

    The schema already fixes the shape; this only removes repeats and out-of-range references,
    which a schema cannot express. It never adds a component the model did not choose.
    """
    notes: list[str] = []
    seen: set[str] = set()
    components = []
    for comp in raw.get("components") or []:
        kind = comp.get("type")
        if kind not in COMPONENTS:
            notes.append(f"dropped unknown component {kind!r}")
            continue
        if kind in seen:
            notes.append(f"dropped a repeated {kind}")
            continue
        seen.add(kind)
        props = comp.get("props") or {}
        if kind == "CountermeasurePicker":
            options, ids = [], set()
            for opt in props.get("options") or []:
                if opt.get("id") in arsenal and opt["id"] not in ids:
                    ids.add(opt["id"])
                    opt["source"] = opt.get("source") if 0 <= int(opt.get("source") or 0) <= source_count else 0
                    options.append(opt)
            props["options"] = sorted(options, key=lambda o: SUPPORT.index(o["support"]) if o.get("support") in SUPPORT else 9)
            if props.get("recommended") not in ids and options:
                props["recommended"] = options[0]["id"]
        if kind == "FloorPlan":
            props["seal"] = list(dict.fromkeys(sector_id(s) for s in props.get("seal") or [] if sector_id(s) in SECTORS))
            route = list(dict.fromkeys(sector_id(s) for s in props.get("safe_route") or [] if sector_id(s) in SECTORS))
            adj = adjacency()
            if any(b not in adj[a] for a, b in zip(route, route[1:])):
                notes.append("dropped a safe route that walks through walls")
                route = []
            props["safe_route"] = route
        if kind in ("SourceLedger", "SkyClock"):
            props["cited"] = sorted({n for n in props.get("cited") or [] if 1 <= n <= source_count})
        components.append({"type": kind, "why": comp.get("why", ""), "props": props})
    out = {
        "title": raw.get("title") or "Haunted command station",
        "theme": raw.get("theme") if raw.get("theme") in THEMES else THEMES[0],
        "sound_cue": raw.get("sound_cue") if raw.get("sound_cue") in CUES else "alert_chime",
        "components": components,
        "recommended_action": raw.get("recommended_action") if raw.get("recommended_action") in ACTIONS else "contain",
        "dispatch_rationale": raw.get("dispatch_rationale") or "",
    }
    return out, notes
