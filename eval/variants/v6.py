"""v6: v4's guard plus `ended_evidence`, a quote-based version of the stand-down rule.

v5's boolean `aftermath` was true on 14 of 24 steps (it read "nothing active" for steps that are still unfolding)
and made seven misses. A boolean is too easy to say yes to, so v6 asks the intake for the sentence of the report that
says the creature or hazard is gone or has changed back to a harmless state, and null when the report has none.
Rule: `ended_evidence` present, `creature_countered` false and the report not already harmless: observe and no
CountermeasurePicker. CivilianTracker and FloorPlan stay.
"""
import importlib.util
from pathlib import Path

spec = importlib.util.spec_from_file_location("v4", Path(__file__).with_name("v4.py"))
v4 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v4)

ENDED = {"type": ["string", "null"], "description": (
    "The sentence from the report that says the creature or hazard is gone or has changed back to a harmless state, copied "
    "from the report. null (never the word unknown) when the report does not say so. A report that is still unfolding, or "
    "that mentions a creature being held back, kept out or countered, has no such sentence")}


def has_evidence(text):
    """A real sentence, not 'unknown' or a denial: the first v6 run took the model's 'unknown' for evidence and made nine misses."""
    t = (text or "").strip().lower()
    return len(t.split()) >= 4 and not t.startswith(("unknown", "not ", "no ", "none", "n/a", "null"))


def apply(flow, library):
    v4.apply(flow, library)
    v4.add_fields(flow, library, {"ended_evidence": ENDED})
    flow.EXTRACT_SYSTEM = flow.EXTRACT_SYSTEM.replace(
        "creature_countered and verdict before ", "creature_countered, ended_evidence and verdict before ")

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
        if has_evidence(inc.get("ended_evidence")) and not inc.get("creature_countered") and not library.is_harmless(inc):
            kept = [c for c in out["components"] if c["type"] != "CountermeasurePicker"]
            if len(kept) != len(out["components"]) or out["recommended_action"] != "observe":
                notes.append("the report says the threat has ended: observe and no CountermeasurePicker")
                out["components"], out["recommended_action"] = kept, "observe"
        return out, notes

    library.clean_manifest = stood_down
