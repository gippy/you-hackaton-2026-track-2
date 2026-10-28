# pipeline/

The Python 3.13 CrewAI Flow that turns one incident into a station manifest. The server runs it once per step.

## Entry points

- `__main__.py`: `.venv/bin/python -m pipeline`. One JSON incident on stdin, one JSON event per line on stdout, ending with `{"type": "result", ...}` or `{"type": "fatal", ...}`.
- `flow.py`: the Flow (`ingest`, `triage`, one `*_playbook` per class, `ground`, `compose`), its prompts (`EXTRACT_SYSTEM`, `COMPOSE_SYSTEM`) and the streaming manifest parser.
- `library.py`: the vocabulary from `shared/library.json`, the strict `manifest_schema`, and `clean_manifest`, the code rules that keep, drop or fix the model's panels.
- `grounding.py`: You.com search and the CrewAI tool the Lore Researcher calls.
- `parasail.py`: the Parasail client. `proof.py`: appends every call to `proof/*.jsonl`.

## Invariants

- The input carries only the report, its id, the feed tier, the sky and the operator's moves. Never an answer key.
- stdout is for events only. CrewAI's own output goes to stderr.
- The model fills a strict JSON schema; it never writes markup. Keep `manifest_schema` in line with `shared/protocol.ts`.
- Keys come from the environment (`.env` at the repo root).
- After a prompt change, run the eval (see `eval/README.md`).

Try one step by hand:

```bash
echo '{"raw": "EMF spikes in the lounge", "incident_id": "", "severity_tier": ""}' | .venv/bin/python -m pipeline
```
