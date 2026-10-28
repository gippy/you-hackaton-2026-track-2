"""v5: v4's guard plus `aftermath` (first tried as `threat_present_now`, which stayed true on step 24), for the stand-down step.

`aftermath` (boolean, before `verdict`): true when the incident has ended and the report is a debrief about follow-up. When it is true and the report
is not already harmless and nothing is being countered (`creature_countered` is false), the station is calm in the way the harmless guard makes it: observe, and no CountermeasurePicker.
(CivilianTracker and FloorPlan stay: people were hurt.) The rule runs in clean_manifest, so it also applies to the components
streamed while the manifest is being written.
"""
import importlib.util
from pathlib import Path

spec = importlib.util.spec_from_file_location("v4", Path(__file__).with_name("v4.py"))
v4 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v4)

PRESENT = {"type": "boolean", "description": (
    "true when the report is an aftermath or debrief: the incident has ended, nothing in it is still active, held back or "
    "being countered, and it asks about follow-up, release, headcount or cleanup. false for anything still unfolding")}


def apply(flow, library):
    v4.apply(flow, library)
    v4.add_fields(flow, library, {"aftermath": PRESENT})
    flow.EXTRACT_SYSTEM = flow.EXTRACT_SYSTEM.replace(
        "creature_countered and verdict before ", "creature_countered, aftermath and verdict before ")

    seen = {}
    chat_json = flow.chat_json

    def spy(schema, name, system, user, on_text=None, **kwargs):
        out, model = chat_json(schema, name, system, user, on_text, **kwargs)
        if name == "incident":
            seen["incident"] = out
        return out, model

    flow.chat_json = spy
    clean_manifest = library.clean_manifest

    def stood_down(raw, arsenal, source_count, incident=None):
        out, notes = clean_manifest(raw, arsenal, source_count, incident)
        inc = incident or seen.get("incident") or {}
        if inc.get("aftermath") is True and not inc.get("creature_countered") and not library.is_harmless(inc):
            kept = [c for c in out["components"] if c["type"] != "CountermeasurePicker"]
            if len(kept) != len(out["components"]) or out["recommended_action"] != "observe":
                notes.append("the intake says this is an aftermath: observe and no CountermeasurePicker")
                out["components"], out["recommended_action"] = kept, "observe"
        return out, notes

    library.clean_manifest = stood_down
