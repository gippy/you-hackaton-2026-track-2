"""Try each event model on Parasail: a plain reply, then a forced-choice tool call."""
import json
import os
import sys
import time

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv(sys.argv[1])
client = OpenAI(base_url="https://api.parasail.io/v1", api_key=os.environ["PARASAIL_API_KEY"])

MODELS = sys.argv[2:] or [
    "parasail-glm-53",
    "parasail-kimi-k3",
    "parasail-minimax-m31-flash",
    "parasail-deepseek-v41-flash",
    "parasail-deepseek-v4-flash",
]
MAX_TOKENS = int(os.environ.get("MAX_TOKENS", "300"))
TOOL = {
    "type": "function",
    "function": {
        "name": "submit_containment",
        "description": "Report the containment action for a tick.",
        "parameters": {
            "type": "object",
            "properties": {
                "tick_id": {"type": "integer"},
                "action": {"type": "string", "enum": ["contain", "evacuate", "observe"]},
            },
            "required": ["tick_id", "action"],
        },
    },
}
PROMPT = "Tick 142: level-5 phantom in the coffee bar, 4 civilians pinned, containment breached. Submit your action with the tool."

for model in MODELS:
    start = time.time()
    try:
        reply = client.chat.completions.create(
            model=model, messages=[{"role": "user", "content": "Reply with the word ok"}], max_tokens=MAX_TOKENS
        )
        text = (reply.choices[0].message.content or "").strip()[:20]
        plain = f"ok ({time.time() - start:.1f}s, said {text!r})"
    except Exception as e:
        print(f"{model:30} plain: FAIL {str(e)[:150]}")
        continue
    start = time.time()
    try:
        reply = client.chat.completions.create(
            model=model, messages=[{"role": "user", "content": PROMPT}], tools=[TOOL], tool_choice="auto", max_tokens=MAX_TOKENS
        )
        calls = reply.choices[0].message.tool_calls or []
        if calls:
            args = json.loads(calls[0].function.arguments)
            tool = f"called {calls[0].function.name}({args}) in {time.time() - start:.1f}s"
        else:
            tool = f"NO tool call, replied in prose ({time.time() - start:.1f}s)"
    except Exception as e:
        tool = f"FAIL {str(e)[:150]}"
    print(f"{model:30} plain: {plain} | tools: {tool}")
