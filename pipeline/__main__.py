"""Run the Flow once, as a worker for the TypeScript server.

    echo '{"raw": "...", "incident_id": "", "severity_tier": ""}' | .venv/bin/python -m pipeline

Reads one incident as JSON on stdin (a scenario step also carries `sky`, and `moves` once the
operator has acted) and writes one JSON event per line on stdout: the
flow's progress events, then {"type": "result", "state": {...}} or {"type": "fatal", "detail": ...}.
CrewAI prints its own panels to stdout, so the real stdout is kept for events and
everything else is sent to stderr.
"""
import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

events = os.fdopen(os.dup(1), "w", buffering=1)
os.dup2(2, 1)
sys.stdout = sys.stderr

load_dotenv(Path(__file__).resolve().parent.parent / ".env")
# CrewAI tracing asks for a login on first run; this pipeline does not need it.
os.environ.setdefault("CREWAI_TRACING_ENABLED", "false")
os.environ.setdefault("CREWAI_DISABLE_TELEMETRY", "true")


def emit(msg: dict) -> None:
    events.write(json.dumps(msg) + "\n")


def main() -> int:
    from . import proof
    from .flow import HauntFlow

    job = json.loads(sys.stdin.read() or "{}")
    inputs = {key: str(job.get(key, "")) for key in ("raw", "incident_id", "severity_tier")}
    inputs.update(sky=job.get("sky") or {}, moves=job.get("moves") or {}, earlier=job.get("earlier") or [])
    flow = HauntFlow().bind(emit)
    proof.CONTEXT.update(incident_id=inputs["incident_id"], run_id=flow.state.id)
    proof.listen_to_crewai()
    try:
        flow.kickoff(inputs=inputs)
    except Exception as exc:  # noqa: BLE001 - the server falls back to the saved run on any failure
        emit({"type": "fatal", "detail": str(exc)[:500]})
        return 1
    finally:
        proof.flush_crewai()
    if not flow.state.manifest:
        emit({"type": "fatal", "detail": "the flow ended without a manifest: " + "; ".join(flow.state.notes or ["no detail"])})
        return 1
    emit({"type": "result", "state": flow.state.model_dump()})
    return 0


if __name__ == "__main__":
    sys.exit(main())
