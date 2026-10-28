"""Proof of work: every Parasail call and every partner call, appended to proof/*.jsonl.

    proof/parasail.jsonl   one line per Parasail call: request, response, usage, latency
    proof/partners.jsonl   one line per You.com search (and, from the server, per One action)

The repo is public, so keys never reach these files: known key values, One connection keys and
bearer tokens are replaced, headers are never written, and any string over 20,000 characters is cut.
"""
from __future__ import annotations

import datetime as dt
import json
import os
import re
import threading
import time
from pathlib import Path

PROOF = Path(__file__).resolve().parent.parent / "proof"
MAX_STRING = 20_000
SECRET_RES = [
    (re.compile(r"live::[\w-]+::default::[0-9a-f]{32}"), "live::<platform>::default::<redacted>"),
    (re.compile(r"sk_(?:live|test)_[A-Za-z0-9_-]+"), "sk_<redacted>"),
    (re.compile(r"Bearer\s+[A-Za-z0-9._-]{12,}"), "Bearer <redacted>"),
]
SECRET_ENV = ("PARASAIL_API_KEY", "YDC_API_KEY", "YOU_API_KEY", "ONE_SECRET")

# Who this process is working for, added to every line: incident_id and run_id.
CONTEXT: dict = {}
_lock = threading.Lock()


def scrub(value):
    """A copy of `value` with secrets replaced and long strings cut. Drops any `headers` key."""
    if isinstance(value, dict):
        return {k: scrub(v) for k, v in value.items() if k.lower() != "headers"}
    if isinstance(value, (list, tuple)):
        return [scrub(v) for v in value]
    if isinstance(value, str):
        for key in (os.environ.get(name, "").strip() for name in SECRET_ENV):
            if len(key) >= 8:
                value = value.replace(key, "<redacted>")
        for pattern, repl in SECRET_RES:
            value = pattern.sub(repl, value)
        return value if len(value) <= MAX_STRING else value[:MAX_STRING] + f"… [cut from {len(value)} characters]"
    return value


def record(ledger: str, entry: dict) -> None:
    """Append one line to proof/<ledger>.jsonl. Never raises: proof must not break a run."""
    try:
        line = {"ts": dt.datetime.now(dt.timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z"),
                **{k: v for k, v in CONTEXT.items() if v}, **entry}
        text = json.dumps(scrub(line), ensure_ascii=False, default=str)
        with _lock:
            PROOF.mkdir(exist_ok=True)
            with open(PROOF / f"{ledger}.jsonl", "a", encoding="utf-8") as fh:
                fh.write(text + "\n")
    except Exception as exc:  # noqa: BLE001
        print(f"proof: could not record a {ledger} line: {exc}", flush=True)


def listen_to_crewai() -> None:
    """Record every LLM call CrewAI makes (the Lore Researcher agent) from its event bus."""
    from crewai.events import BaseEventListener, LLMCallCompletedEvent, LLMCallFailedEvent, LLMCallStartedEvent

    started: dict[str, tuple[float, LLMCallStartedEvent]] = {}

    class ProofListener(BaseEventListener):
        def setup_listeners(self, bus):
            @bus.on(LLMCallStartedEvent)
            def on_start(source, event):
                started[event.call_id] = (time.monotonic(), event)

            def finish(event, extra: dict) -> None:
                t0, start = started.pop(event.call_id, (None, None))
                request = {"messages": getattr(start, "messages", None), "temperature": getattr(start, "temperature", None),
                           "max_tokens": getattr(start, "max_tokens", None),
                           "tools": [t.get("function", t).get("name", t) if isinstance(t, dict) else str(t)
                                     for t in (getattr(start, "tools", None) or [])]}
                record("parasail", {
                    "source": "pipeline", "purpose": f"CrewAI agent: {event.agent_role or 'agent'}",
                    "model": event.model, "request": request, **extra,
                    "latency_ms": int((time.monotonic() - t0) * 1000) if t0 else None,
                })

            @bus.on(LLMCallCompletedEvent)
            def on_done(source, event):
                response = event.response if isinstance(event.response, str) else json.loads(json.dumps(event.response, default=str))
                finish(event, {"response": {"content": response, "finish_reason": event.finish_reason}, "usage": event.usage})

            @bus.on(LLMCallFailedEvent)
            def on_fail(source, event):
                finish(event, {"error": str(event.error)[:2000]})

    ProofListener()


def flush_crewai() -> None:
    """Wait for CrewAI's event handlers, which run on worker threads, so no line is lost at exit."""
    try:
        from crewai.events import crewai_event_bus

        crewai_event_bus.flush()
    except Exception:  # noqa: BLE001
        pass
