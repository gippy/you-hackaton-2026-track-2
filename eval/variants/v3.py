"""v3: the current pipeline, with only the intake call (the threat judgment) moved to a stronger model.

Nothing else changes: same prompts, same schema, same temperature 0. The compose call stays on the pipeline's
own model. EVAL_INTAKE_MODEL picks the model (default parasail-kimi-k3-fast). Tests whether the remaining
observe-versus-contain errors come from the model's size rather than from the prompt.
"""
import os

INTAKE_MODEL = os.environ.get("EVAL_INTAKE_MODEL", "parasail-kimi-k3-fast")


def apply(flow, library):
    chat_json = flow.chat_json

    def intake_on_a_stronger_model(schema, name, system, user, on_text=None, **kwargs):
        if name != "incident":
            return chat_json(schema, name, system, user, on_text, **kwargs)
        pipeline_model = flow.MODEL
        flow.MODEL = INTAKE_MODEL
        try:
            return chat_json(schema, name, system, user, on_text, **kwargs)
        finally:
            flow.MODEL = pipeline_model

    flow.chat_json = intake_on_a_stronger_model
