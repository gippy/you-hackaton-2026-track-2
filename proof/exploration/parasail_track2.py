"""Check the Parasail features Track 2 needs: streaming, schema-locked JSON, embeddings."""
import json
import os
import sys
import time

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv(sys.argv[1])
client = OpenAI(base_url="https://api.parasail.io/v1", api_key=os.environ["PARASAIL_API_KEY"])

MODELS = ["parasail-minimax-m31-flash", "parasail-deepseek-v41-flash", "parasail-glm-53"]
SCHEMA = {
    "type": "object",
    "properties": {
        "theme": {"type": "string"},
        "components": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {"component": {"type": "string"}, "reason": {"type": "string"}},
                "required": ["component", "reason"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["theme", "components"],
    "additionalProperties": False,
}
PROMPT = "Incident: EMF 98 milligauss and climbing, 4 engineers pinned behind the coffee bar. Pick 2 dashboard components."

for model in MODELS:
    # Streaming: count chunks and time to first content token.
    start, first, chunks = time.time(), None, 0
    try:
        stream = client.chat.completions.create(
            model=model, messages=[{"role": "user", "content": "Count from 1 to 10, comma separated."}],
            stream=True, max_tokens=2000,
        )
        for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                chunks += 1
                first = first or time.time() - start
        stream_result = f"{chunks} content chunks, first after {first:.1f}s" if first else "no content chunks"
    except Exception as e:
        stream_result = f"FAIL {str(e)[:120]}"

    # Schema-locked JSON through response_format.
    try:
        reply = client.chat.completions.create(
            model=model, messages=[{"role": "user", "content": PROMPT}], max_tokens=2000,
            response_format={"type": "json_schema", "json_schema": {"name": "manifest", "schema": SCHEMA, "strict": True}},
        )
        data = json.loads(reply.choices[0].message.content)
        ok = set(data) == {"theme", "components"} and all(set(c) == {"component", "reason"} for c in data["components"])
        schema_result = f"valid JSON, {'matches' if ok else 'DOES NOT match'} schema, {len(data['components'])} components"
    except Exception as e:
        schema_result = f"FAIL {str(e)[:120]}"
    print(f"{model:30} stream: {stream_result} | json_schema: {schema_result}")

for model in ["parasail-ai/GritLM-7B-vllm"]:
    try:
        emb = client.embeddings.create(model=model, input=["salt line deployer", "uv lantern"])
        print(f"{model:30} embeddings: {len(emb.data)} vectors of {len(emb.data[0].embedding)} dimensions")
    except Exception as e:
        print(f"{model:30} embeddings: FAIL {str(e)[:160]}")
