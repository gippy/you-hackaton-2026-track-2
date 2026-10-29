"""v1: the prompt, schema and guard fixes proposed in eval/report.md, applied in memory.

1. Intake classifies by what the creature is (vampires and werewolves are corporeal) and answers three
   questions before it rates severity: what shows a real danger, what ordinary explanation the report
   itself supports, and who is within reach. The feed tier is called a label that can be wrong.
2. Compose gets a rubric for observe / contain / evacuate and a panel recipe per mode, in place of the
   one-sentence "calm" rule.
3. A guard in clean_manifest: a harmless verdict forces observe, all_clear and drops the three panels
   that read as an alarm. It removes, never adds.

The wording is general (no step, sector or name from the Nightfall scenario) but it was written after
reading this scenario's failures, so the measured gain is optimistic until it is checked on another scenario.
"""
import copy

CLASS_OLD = ("entity_class: spectral for ghosts, phantoms, apparitions and poltergeists; corporeal for physical monsters; "
             "anomalous for cursed technology, rifts or anything else. ")
CLASS_NEW = ("entity_class: corporeal for anything with a body, living or undead: vampires, werewolves, zombies, cryptids, "
             "even when asleep, disguised or only claimed; spectral for ghosts, phantoms, apparitions and poltergeists; "
             "anomalous only for cursed technology, rifts and signals with no creature in the report. "
             "Rate severity from the evidence in the report, never from the feed's tier label: the label is a sensor "
             "guess and can be wrong in both directions. Fill evidence_of_threat, ordinary_explanation and verdict "
             "before severity. verdict is harmless only when the report's own evidence (readings, measurements, "
             "witness checks, logs) supports an ordinary explanation; real_threat when a creature or hazard is acting; "
             "unclear otherwise. people_in_reach counts only the people the threat can reach now, not everyone present. ")

RUBRIC = (
    "The incident carries a verdict and people_in_reach; build the station from them, never from the feed tier. "
    "Choose recommended_action with this rubric: observe when the verdict is harmless, or when the threat is real but "
    "nobody is within its reach right now and watching is enough; contain when a real threat is active and people are "
    "within its reach or soon will be; evacuate when people are already hurt, pinned or fleeing, or the threat is loose "
    "among a crowd, so the safe move is to get them out. "
    "Panels: ThreatBanner and SourceLedger in every station. EMFGauge only when the EMF reading is above normal or "
    "rising, never for a normal reading. CountermeasurePicker only when the action is contain or evacuate. FloorPlan "
    "and CivilianTracker when real people are near a real threat. A harmless verdict gets exactly: a low ThreatBanner "
    "that says why it is safe, SourceLedger, and at most one of ThermalReadout or SystemsBoard; sound_cue all_clear; "
    "recommended_action observe; no CountermeasurePicker, FloorPlan or CivilianTracker. "
)


def apply(flow, library):
    schema = copy.deepcopy(flow.INCIDENT_SCHEMA)
    props = {}
    for key, value in schema["properties"].items():
        if key == "severity":
            props["evidence_of_threat"] = {"type": "string", "description": "What in the report shows a real, present danger to people, or 'none'. Under 25 words"}
            props["ordinary_explanation"] = {"type": ["string", "null"], "description": "An ordinary explanation the report's own evidence supports, with that evidence, else null. Under 25 words"}
            props["verdict"] = {"type": "string", "enum": ["real_threat", "harmless", "unclear"]}
            props["people_in_reach"] = {"type": "integer", "minimum": 0, "description": "People the threat can reach right now"}
        props[key] = value
    schema["properties"], schema["required"] = props, list(props)
    flow.INCIDENT_SCHEMA = schema

    assert CLASS_OLD in flow.EXTRACT_SYSTEM, "pipeline/flow.py EXTRACT_SYSTEM changed; update the variant"
    flow.EXTRACT_SYSTEM = flow.EXTRACT_SYSTEM.replace(CLASS_OLD, CLASS_NEW)
    head, sep, _ = flow.COMPOSE_SYSTEM.partition("When the readings are normal")
    assert sep, "pipeline/flow.py COMPOSE_SYSTEM changed; update the variant"
    flow.COMPOSE_SYSTEM = head + RUBRIC + flow.UNTRUSTED

    seen = {}
    chat_json = flow.chat_json

    def spy(schema, name, system, user, on_text=None):
        out, model = chat_json(schema, name, system, user, on_text)
        if name == "incident":
            seen["incident"] = out
        return out, model

    flow.chat_json = spy
    clean_manifest = library.clean_manifest

    def guarded(raw, arsenal, source_count):
        out, notes = clean_manifest(raw, arsenal, source_count)
        if seen.get("incident", {}).get("verdict") == "harmless":
            kept = [c for c in out["components"] if c["type"] not in ("CountermeasurePicker", "CivilianTracker", "FloorPlan")]
            if kept and (len(kept) != len(out["components"]) or out["recommended_action"] != "observe" or out["sound_cue"] != "all_clear"):
                notes.append("guard: harmless verdict, forced observe, all_clear and a calm layout")
                out["components"], out["recommended_action"], out["sound_cue"] = kept, "observe", "all_clear"
        return out, notes

    library.clean_manifest = guarded
