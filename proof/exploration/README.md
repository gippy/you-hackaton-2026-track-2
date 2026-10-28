# Parasail model tests, 2026-10-28

Before building, we tested the event's Parasail models on what the station needs: tool calls, streaming, schema-locked JSON, embeddings and SVG drawing. These results decided which model does what. The scripts in this folder rerun every test: `.venv/bin/python proof/exploration/<script>.py .env`.

## Tool calling (`parasail_models.py`)

Each model got a plain prompt and a prompt with one tool, `submit_containment(tick_id, action)`, for tick 142 of the official incident.

| Model | Tool call | Notes |
|---|---|---|
| `parasail-minimax-m31-flash` | `evacuate` in 0.8 seconds | The fastest |
| `parasail-deepseek-v41-flash` | `evacuate` in 1.4 seconds | |
| `parasail-glm-53` | `evacuate` in 4.2 seconds | Returned nothing under a 300-token cap, because it reasons first. It needs room |
| `parasail-kimi-k3` | none | 429 "engine overloaded", twice |
| `parasail-deepseek-v4-flash` | `evacuate` in 7.3 seconds | Works, but is not on the event list |

## Track 2 features (`parasail_track2.py`)

| Model | Streaming | Strict `json_schema` |
|---|---|---|
| `parasail-minimax-m31-flash` | First text after 0.9 seconds | Valid and matches the schema |
| `parasail-deepseek-v41-flash` | First text after 1.0 seconds | Valid and matches the schema |
| `parasail-glm-53` | First text after 0.7 seconds | Empty content |

Embeddings: `parasail-ai/GritLM-7B-vllm`, the model the event portal names, returned 404 "doesn't exist or isn't accessible". `parasail-bge-m3` works and returns 1024-dimension vectors.

## SVG drawing (`svg_test.py`, results in `svg-banshee/`)

Every model got the same prompt: a banshee icon in the station's palette, `viewBox="0 0 256 256"`, no text, no scripts, under 6 KB.

| Model | Result |
|---|---|
| `parasail-minimax-m31-flash` | A recognizable banshee in 8.1 seconds (3,985 bytes) |
| `parasail-qwen3-coder-next` | A valid SVG in 16.6 seconds (2,469 bytes), but abstract |
| `parasail-deepseek-v41-flash` | Never closed the SVG |
| `parasail-glm-53` | Returned nothing after 51.5 seconds |

## What we chose

- `parasail-minimax-m31-flash` runs the agents and draws the icons, because it was the fastest at tool calls and valid at strict JSON and SVG.
- `parasail-deepseek-v41-flash` is the fallback.
- `parasail-glm-53` is kept for steps that need longer reasoning, with a generous token budget and never with `json_schema`.
- `parasail-bge-m3` handles embeddings.
