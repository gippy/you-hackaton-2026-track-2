"""v2: v1 plus a threat_state field, so "real but not yet acting" can be told from "acting".

v1 left every unclear or quiet-but-real incident on `contain`, because its rubric only asked who is in reach.
v2 asks the intake step what the threat is doing right now (inert, active or over) and gates `observe` on it.
Same caveat as v1: written after reading this scenario's failures, so the gain is in-sample.
"""
import copy
import importlib.util
from pathlib import Path

STATE_OLD = "people_in_reach counts only the people the threat can reach now, not everyone present. "
STATE_NEW = (STATE_OLD +
             "threat_state is what the threat is doing now: inert when it is present but dormant, contained or waiting "
             "on a trigger that has not happened and nobody is hurt; active when it is acting on people or about to; "
             "over when the incident has ended and everyone is accounted for. ")

RUBRIC = (
    "The incident carries a verdict, threat_state and people_in_reach; build the station from them, never from the feed tier. "
    "Choose recommended_action with this rubric: observe when the verdict is harmless, or when threat_state is inert or over "
    "and nobody is hurt, even if the verdict is real_threat or unclear; contain when threat_state is active and people are "
    "within its reach or soon will be; evacuate when people are already hurt, pinned or fleeing, or the threat is loose "
    "among a crowd, so the safe move is to get them out. An unclear verdict with an active threat is treated as real. "
    "Panels: ThreatBanner and SourceLedger in every station. EMFGauge only when the EMF reading is above normal or "
    "rising, never for a normal reading. CountermeasurePicker only when the action is contain or evacuate. FloorPlan "
    "and CivilianTracker when real people are near a real threat. A harmless verdict gets exactly: a low ThreatBanner "
    "that says why it is safe, SourceLedger, and at most one of ThermalReadout or SystemsBoard; sound_cue all_clear; "
    "recommended_action observe; no CountermeasurePicker, FloorPlan or CivilianTracker. "
)


def apply(flow, library):
    path = Path(__file__).with_name("v1.py")
    spec = importlib.util.spec_from_file_location("v1", path)
    v1 = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(v1)
    v1.RUBRIC = RUBRIC
    v1.apply(flow, library)

    assert STATE_OLD in flow.EXTRACT_SYSTEM
    flow.EXTRACT_SYSTEM = flow.EXTRACT_SYSTEM.replace(STATE_OLD, STATE_NEW)
    schema = copy.deepcopy(flow.INCIDENT_SCHEMA)
    props = {}
    for key, value in schema["properties"].items():
        if key == "people_in_reach":
            props["threat_state"] = {"type": "string", "enum": ["inert", "active", "over"]}
        props[key] = value
    schema["properties"], schema["required"] = props, list(props)
    flow.INCIDENT_SCHEMA = schema
