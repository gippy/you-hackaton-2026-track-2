"""v4: guard for the step 23 miss. A `harmless` verdict becomes `unclear` when the report shows something held
back, repelled or reacting to one of the unit's countermeasures.

Built from a schema field and one line of code, mirroring the existing `deliberate_act` downgrade in flow.ingest:
- INCIDENT_SCHEMA gets `creature_countered` (boolean) before `verdict`; its description is made from the arsenal
  in shared/library.json, not from this scenario's wording.
- EXTRACT_SYSTEM tells the model that harmless also requires that nothing is held back or repelled.
- After the intake call, harmless + creature_countered is downgraded to unclear.

Run it on a frozen copy: `--snapshot eval/snap-<hash>`.
"""
import copy

OLD_FILL = "Fill evidence_of_threat, ordinary_explanation, deliberate_act and verdict before "
NEW_FILL = "Fill evidence_of_threat, ordinary_explanation, deliberate_act, creature_countered and verdict before "
OLD_RULE = "supports an ordinary explanation and nobody acted deliberately; "
NEW_RULE = "supports an ordinary explanation, nobody acted deliberately and nothing is held back or repelled by a countermeasure; "


def countered_field(library):
    kinds = ", ".join(v.lower() for v in library.ARSENAL.values())
    return {"type": "boolean", "description": (
        "true when the report shows a person or thing held back, repelled or reacting to one of the unit's countermeasures "
        f"({kinds}) or to a threshold or barricade: hissing, flinching, burning, refusing to cross. "
        "A costume, a prop or a smell alone is false")}


def add_fields(flow, library, extra):
    """Insert `extra` ({name: schema}) right before `verdict` in the intake schema, so the model fills them first."""
    schema = copy.deepcopy(flow.INCIDENT_SCHEMA)
    props = {}
    for key, value in schema["properties"].items():
        if key == "verdict":
            props.update(extra)
        props[key] = value
    schema["properties"], schema["required"] = props, list(props)
    flow.INCIDENT_SCHEMA = schema


def apply(flow, library):
    add_fields(flow, library, {"creature_countered": countered_field(library)})
    assert OLD_FILL in flow.EXTRACT_SYSTEM and OLD_RULE in flow.EXTRACT_SYSTEM, "EXTRACT_SYSTEM changed; update the variant"
    flow.EXTRACT_SYSTEM = flow.EXTRACT_SYSTEM.replace(OLD_FILL, NEW_FILL).replace(OLD_RULE, NEW_RULE)

    chat_json = flow.chat_json

    def downgrade(schema, name, system, user, on_text=None, **kwargs):
        out, model = chat_json(schema, name, system, user, on_text, **kwargs)
        if name == "incident" and out.get("verdict") == "harmless" and out.get("creature_countered"):
            out["verdict"] = "unclear"
        return out, model

    flow.chat_json = downgrade
