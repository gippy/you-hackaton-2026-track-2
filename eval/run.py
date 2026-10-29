"""Evaluation harness for the Haunted Command Station pipeline.

    .venv/bin/python eval/run.py                    run every step of the Nightfall scenario, then score and report
    .venv/bin/python eval/run.py --steps 1-3        only these steps (also "1,4,7-9")
    .venv/bin/python eval/run.py --resume           keep rows that succeeded on the current pipeline, run only the rest
    .venv/bin/python eval/run.py --report-only      re-score results.jsonl and rewrite report.md, no model calls
    .venv/bin/python eval/run.py --label a          a named run: results-a.jsonl, report-a.md, raw/ and logs/ tagged -a
    .venv/bin/python eval/run.py --combine a,b      rewrite report.md from results-a.jsonl and results-b.jsonl, against eval/baseline/
    .venv/bin/python eval/run.py --variant v3       run eval/variants/v3.py's in-memory prompt changes (results-v3.jsonl, report-v3.md)

Each step is run exactly the way server/station.ts runs it: `.venv/bin/python -m pipeline` from the repo
root, one JSON object {raw, incident_id, severity_tier, sky} on stdin, NDJSON events on stdout. The sky comes
from the server's own server/sky.ts (through eval/sky.ts and Node), as it does for every scenario step. The pipeline
never dispatches (the server does, when the operator presses the button), so nothing here can post to
Discord or open a PagerDuty incident. "Would dispatch" is scored from the manifest's recommended_action,
which is the same rule the page uses to decide between "Dispatch to #loft-incident" and "Dispatch anyway".

The answer key is read only after a step has finished. The worker input is built from the scenario's raw
text, id and feed tier, plus the sky, and nothing else.

Writes only under eval/: results.jsonl, report.md, raw/step-NN.json (the full flow state), logs/step-NN.log.
Standard library only.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import statistics
import subprocess
import sys
import threading
import time
from collections import Counter
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EVAL = Path(__file__).resolve().parent
LIB = json.loads((ROOT / "shared" / "library.json").read_text())
BASELINE = EVAL / "baseline" / "results.jsonl"  # the first full run, kept to compare later runs against
SECTOR_ALIASES = LIB["sector_aliases"]
ACTS = ["observe", "contain", "evacuate"]
RANK = {a: i for i, a in enumerate(ACTS)}
TIER_SEVERITY = {"LOW_HAUNT": "low", "ELEVATED_HAUNT": "elevated", "CRITICAL_HAUNT": "critical"}  # UNVERIFIED maps to nothing
# One point each per step, so a perfect run scores 6 per step. Panel recall counts fractionally.
CRITERIA = ["action", "dispatch", "hot", "recall", "no_discouraged", "no_failure"]


# --- inputs ------------------------------------------------------------------------------------------

def load_scenario(path: Path) -> dict:
    """The scenario: its `title`, whether the server gives it a `sky`, and its `ticks`."""
    return json.loads(path.read_text())


def load_key(path: Path) -> dict[str, dict]:
    """Steps by incident id. The key's top-level `playbook` ("corporeal for every step ...") rides along as `_playbook`."""
    doc = json.loads(path.read_text())
    playbook = (doc.get("playbook") or "").split()[0] if doc.get("playbook") else None
    return {s["incident_id"]: {**s, "_playbook": playbook} for s in doc["steps"]}


def parse_steps(spec: str | None, total: int) -> list[int]:
    if not spec:
        return list(range(1, total + 1))
    out: list[int] = []
    for part in spec.split(","):
        lo, _, hi = part.strip().partition("-")
        out += range(int(lo), int(hi or lo) + 1)
    return sorted(set(out))


def pipeline_hash(variant: str | None = None) -> str:
    """A short hash of what a step runs on.

    - pipeline/, the library and the floor, map and art files it names, and the server's sky code
    - the model names set in the environment
    - for a variant, the worker and that variant's file
    """
    h = hashlib.sha256()
    files = sorted((ROOT / "pipeline").glob("*.py")) + [ROOT / "shared" / "library.json", ROOT / "server" / "sky.ts"]
    files += [ROOT / LIB[k] for k in ("floor_plan", "area_map", "art_manifest")]
    if variant:
        files += [EVAL / "worker.py", EVAL / "variants" / f"{variant}.py"]
    for p in files:
        h.update(p.name.encode())
        h.update(p.read_bytes() if p.exists() else b"")
    for name in ("HAUNT_MODEL", "HAUNT_FALLBACK_MODEL"):
        h.update(os.environ.get(name, "").encode())
    return h.hexdigest()[:10]


def load_skies(scenario: Path) -> dict[str, dict]:
    """The sky the server adds to each step of a scenario, computed by the server's own server/sky.ts through Node."""
    out = subprocess.run(["node", str(EVAL / "sky.ts"), str(scenario), str(EVAL / "cache")], cwd=ROOT, capture_output=True,
                         text=True, timeout=60, check=True).stdout
    return json.loads(out)


def norm_sector(s: str | None) -> str | None:
    return SECTOR_ALIASES.get(s or "", s)


def rel(path: Path) -> str:
    """The path relative to the repo root when it is inside it."""
    return str(path.relative_to(ROOT)) if path.is_relative_to(ROOT) else str(path)


def read_rows(path: Path) -> list[dict]:
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def write_rows(path: Path, rows: list[dict]) -> None:
    path.write_text("".join(json.dumps(r) + "\n" for r in sorted(rows, key=lambda r: r["step"])))


def load_scored(path: Path, keys: dict[str, dict]) -> list[dict]:
    """The rows of a results file, each re-scored against the answer key, so a scoring change needs no model calls."""
    return [{**r, "score": score(r, keys[r["incident_id"]])} for r in read_rows(path)]


# --- running one step --------------------------------------------------------------------------------

def run_worker(cmd: list[str], payload: dict, env: dict, log, timeout: float) -> tuple[int | None, dict | None, str, list]:
    """Start the worker, send it one incident, and read its NDJSON events until it exits.

    Returns the exit code (None after a timeout), the final flow state, the fatal detail, and the other events as
    (seconds since start, event). Raises OSError when the worker cannot start."""
    events: list[tuple[float, dict]] = []
    result: dict | None = None
    fatal = ""
    t0 = time.monotonic()
    proc = subprocess.Popen(cmd, cwd=ROOT, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=log, text=True, env=env)

    def pump() -> None:
        nonlocal result, fatal
        for line in proc.stdout:  # type: ignore[union-attr]
            try:
                msg = json.loads(line)
            except json.JSONDecodeError:
                continue
            if msg.get("type") == "result":
                result = msg["state"]
            elif msg.get("type") == "fatal":
                fatal = msg.get("detail", "")
            else:
                events.append((time.monotonic() - t0, msg))

    reader = threading.Thread(target=pump, daemon=True)
    reader.start()
    try:
        proc.stdin.write(json.dumps(payload))  # type: ignore[union-attr]
        proc.stdin.close()  # type: ignore[union-attr]
    except BrokenPipeError:
        pass
    try:
        code = proc.wait(timeout=timeout)
    except subprocess.TimeoutExpired:
        proc.kill()
        proc.wait()
        code = None
    reader.join(5)
    return code, result, fatal, events


def run_step(tick: dict, name: str, variant: str | None, timeout: float, sky: dict | None, earlier: list[dict]) -> dict:
    """Run the pipeline worker on one incident. Never raises: a failure is a row with ok=False."""
    step = tick["step"]
    payload = {"raw": tick["raw_incident_stream"], "incident_id": tick["incident_id"], "severity_tier": tick["severity_tier"]}
    if sky:
        payload["sky"] = sky  # what server/station.ts adds for a scenario step
    if earlier:
        payload["earlier"] = earlier  # what earlier steps found, as server/station.ts sends from its saved runs
    python = os.environ.get("PYTHON") or str(ROOT / ".venv" / "bin" / "python")
    cmd = [python, str(EVAL / "worker.py"), variant] if variant else [python, "-m", "pipeline"]
    # The pipeline tags its proof-ledger lines with PROOF_CONTEXT, so eval runs can be told from demo runs.
    env = {**os.environ, "PROOF_CONTEXT": os.environ.get("PROOF_CONTEXT") or "eval"}
    tag = f"-{name}"
    row: dict = {"step": step, "incident_id": tick["incident_id"], "ok": False, "error": None,
                 "pipeline_hash": pipeline_hash(variant), "sky": bool(sky)}

    (EVAL / "logs").mkdir(exist_ok=True)
    t0 = time.monotonic()
    with open(EVAL / "logs" / f"step-{step:02d}{tag}.log", "w") as log:
        try:
            code, result, fatal, events = run_worker(cmd, payload, env, log, timeout)
        except OSError as exc:
            row["error"] = f"could not start {python}: {exc}"
            row["latency_s"] = 0.0
            return row
    row["latency_s"] = round(time.monotonic() - t0, 2)
    if code is None:
        row["error"] = f"timeout after {timeout:.0f}s"
    phases = [e for _, e in events if e.get("type") == "step"]
    if phases:
        row["last_phase"] = f"{phases[-1]['id']}:{phases[-1]['state']}"
    if code is not None and not result:
        row["error"] = fatal or f"exit {code} with no result; see eval/logs/step-{step:02d}{tag}.log"
    if row["error"] and row.get("last_phase"):
        row["error"] += f" (last phase seen: {row['last_phase']})"
    row["timing"] = timing_from(events)
    (EVAL / "raw").mkdir(exist_ok=True)
    (EVAL / "raw" / f"step-{step:02d}{tag}.json").write_text(json.dumps({"state": result, "events": events}, indent=1))
    if result:
        row["state"] = {k: result.get(k) for k in ("incident", "playbook", "manifest", "notes", "models")}
        if not (result.get("manifest") or {}).get("components"):
            row["error"] = "empty manifest"
        elif row["error"] is None:
            row["ok"] = True
    return row


def timing_from(events: list[tuple[float, dict]]) -> dict:
    """Seconds from process start to the `incident` event and to the first and last panel, and the pipeline's own per-phase ms."""
    t: dict = {}
    comps = [e for e in events if e[1].get("type") == "component"]
    incident = next((e[0] for e in events if e[1].get("type") == "incident"), None)
    if incident is not None:
        t["incident_s"] = round(incident, 2)
    if comps:
        t["first_component_s"], t["last_component_s"] = round(comps[0][0], 2), round(comps[-1][0], 2)
    for _, e in events:
        if e.get("type") == "step" and e.get("state") == "done":
            t[f"{e['id']}_ms"] = e.get("ms")
    return t


# --- scoring -----------------------------------------------------------------------------------------

def score(row: dict, key: dict) -> dict:
    """Score one finished step against its answer-key entry."""
    exp_action = key["expected_action"]
    exp_hot = {norm_sector(s) for s in key["sectors"]["hot"]}
    exp_seal = {norm_sector(s) for s in key["sectors"]["seal"]}
    exp_route = {norm_sector(s) for s in key["sectors"]["route"]}
    expected, optional, discouraged = (list(key.get(k) or []) for k in ("panels_expected", "panels_optional", "panels_discouraged"))
    s: dict = {"truth": key["truth"], "expected_action": exp_action, "failed": not row.get("ok")}
    if not row.get("ok"):
        s.update(points={c: 0.0 for c in CRITERIA}, total=0.0, max=float(len(CRITERIA)))
        return s
    state = row["state"]
    manifest, inc = state["manifest"], state["incident"]
    comps = {c["type"]: c for c in manifest["components"]}
    present = [c["type"] for c in manifest["components"]]
    action = manifest.get("recommended_action")
    fp = comps.get("FloorPlan", {}).get("props") or {}
    hot = fp.get("hot_sector") or inc.get("sector")
    banner = (comps.get("ThreatBanner", {}).get("props") or {}).get("severity")
    recall_hits = [p for p in expected if p in present]
    disc_present = [p for p in discouraged if p in present]
    s.update(
        action=action, panels=present, hot=hot,
        action_ok=action == exp_action,
        dispatch_ok=(action != "observe") == bool(key["discord_dispatch"]),
        hot_ok=hot in exp_hot, hot_incident_ok=inc.get("sector") in exp_hot,
        seal_ok=set(fp.get("seal") or []) == exp_seal, route_ok=set(fp.get("safe_route") or []) == exp_route,
        recall=len(recall_hits) / len(expected) if expected else 1.0, missing_panels=[p for p in expected if p not in present],
        discouraged_present=disc_present, extra_panels=[p for p in present if p not in expected + optional + discouraged],
        false_alarm=key["truth"] == "harmless" and action != "observe",
        miss=exp_action != "observe" and action == "observe",
        over_escalation=exp_action == "observe" and key["truth"] == "real" and action != "observe",
        under_call=exp_action != "observe" and action != "observe" and RANK[action] < RANK[exp_action],
        over_call=exp_action != "observe" and action != "observe" and RANK[action] > RANK[exp_action],
        alarmist_harmless=key["truth"] == "harmless" and (banner not in (None, "low") or bool(disc_present)),
        sound_cue=manifest.get("sound_cue"), playbook=state.get("playbook"),
        playbook_ok=(state.get("playbook") == key["_playbook"]) if key.get("_playbook") else None,
        tier_copied=(inc.get("severity") == TIER_SEVERITY[key["severity_tier_in_input"]]) if key.get("severity_tier_in_input") in TIER_SEVERITY else None,
        models=state.get("models"), notes=state.get("notes") or [],
    )
    p = {"action": float(s["action_ok"]), "dispatch": float(s["dispatch_ok"]), "hot": float(s["hot_ok"]),
         "recall": round(s["recall"], 3), "no_discouraged": float(not disc_present), "no_failure": 1.0}
    s.update(points=p, total=round(sum(p.values()), 3), max=float(len(CRITERIA)))
    return s


def p95(vals: list[float]) -> float:
    ordered = sorted(vals)
    return ordered[min(len(ordered) - 1, int(0.95 * len(ordered)))]


def jaccard_distance(a: set, b: set) -> float:
    return 1 - len(a & b) / len(a | b) if a | b else 0.0


def summarize(rows: list[dict], keys: dict[str, dict]) -> dict:
    """Aggregate metrics over scored rows. Each row carries its own `score`."""
    sc = [r["score"] for r in rows]
    done = [s for s in sc if not s["failed"]]
    harmless = [s for s in done if s["truth"] == "harmless"]
    real_act = [s for s in done if s["expected_action"] != "observe"]
    real_obs = [s for s in done if s["truth"] == "real" and s["expected_action"] == "observe"]
    lat = [r["latency_s"] for r in rows if r.get("ok")]
    sets = [tuple(sorted(s["panels"])) for s in done]
    exp_sets = {tuple(sorted(keys[r["incident_id"]]["panels_expected"])) for r in rows}
    pairs = [jaccard_distance(set(a), set(b)) for i, a in enumerate(sets) for b in sets[i + 1:]]
    common = Counter(sets).most_common(1)[0][0] if sets else ()  # a tie goes to the layout seen first
    m: dict = {
        "steps": len(rows), "failed": sum(s["failed"] for s in sc),
        "harmless_n": len(harmless),
        "false_alarms": sum(s["false_alarm"] for s in harmless),
        "harmless_calm": sum(not s["false_alarm"] and not s["alarmist_harmless"] for s in harmless),
        "harmless_all_clear": sum(s["sound_cue"] == "all_clear" for s in harmless),
        "act_n": len(real_act), "acted": sum(s["action"] != "observe" for s in real_act),
        "misses": sum(s["miss"] for s in real_act),
        "watch_n": len(real_obs), "over_escalations": sum(s["over_escalation"] for s in real_obs),
        "action_ok": sum(s["action_ok"] for s in done), "dispatch_ok": sum(s["dispatch_ok"] for s in done),
        "hot_ok": sum(s["hot_ok"] for s in done), "hot_incident_ok": sum(s["hot_incident_ok"] for s in done),
        "seal_ok": sum(s["seal_ok"] for s in done), "route_ok": sum(s["route_ok"] for s in done),
        "tier_copied": sum(bool(s["tier_copied"]) for s in done if s["tier_copied"] is not None),
        "tier_n": sum(s["tier_copied"] is not None for s in done),
        "playbook_ok": sum(bool(s["playbook_ok"]) for s in done if s["playbook_ok"] is not None),
        "playbook_n": sum(s["playbook_ok"] is not None for s in done),
        "playbooks": dict(Counter(s["playbook"] for s in done)),
        "under_calls": sum(s["under_call"] for s in done), "over_calls": sum(s["over_call"] for s in done),
        "recall_mean": statistics.mean(s["recall"] for s in done) if done else 0.0,
        "full_recall": sum(s["recall"] == 1.0 for s in done),
        "extra_panels": dict(Counter(p for s in done for p in s["extra_panels"])),
        "discouraged_steps": sum(bool(s["discouraged_present"]) for s in done),
        "discouraged_total": sum(len(s["discouraged_present"]) for s in done),
        "distinct_sets": len(set(sets)), "key_distinct_sets": len(exp_sets),
        "most_common_set": list(common), "most_common_share": sets.count(common) if sets else 0,
        "mean_jaccard_distance": statistics.mean(pairs) if pairs else 0.0,
        "points": sum(s["total"] for s in sc), "points_max": sum(s["max"] for s in sc),
        "confusion": {e: {p: sum(1 for s in done if s["expected_action"] == e and s["action"] == p) for p in ACTS} for e in ACTS},
    }
    if lat:
        m["latency"] = {"mean": statistics.mean(lat), "median": statistics.median(lat), "p95": p95(lat), "min": min(lat), "max": max(lat)}
        for name in ("incident_s", "first_component_s", "last_component_s"):
            vals = [r["timing"][name] for r in rows if r.get("ok") and name in r.get("timing", {})]
            if vals:
                m["latency"][name] = statistics.mean(vals)
                if name == "first_component_s":
                    m["latency"]["first_component_max"] = max(vals)
                    m["latency"]["first_component_p95"] = p95(vals)
        for name in ("ingest_ms", "ground_ms", "compose_ms"):
            vals = [r["timing"][name] / 1000 for r in rows if r.get("ok") and r.get("timing", {}).get(name)]
            if vals:
                m["latency"][name.replace("_ms", "_s")] = statistics.mean(vals)
    return m


# --- report helpers ----------------------------------------------------------------------------------

def mark(ok: bool | None) -> str:
    return "✓" if ok else "✗"


def action_cell(s: dict) -> str:
    """`action points` for a finished step, with `*` when the action differs from the key."""
    return f"{s['action']}{'' if s['action_ok'] else '*'} {s['total']:g}"


def panel_delta(s: dict) -> str:
    """`-X` for each expected panel that is missing, `!X` for each discouraged panel that is present."""
    return " ".join([f"-{p}" for p in s["missing_panels"]] + [f"!{p}" for p in s["discouraged_present"]]) or "–"


def steps_where(rows: list[dict], *flags: str) -> list[int]:
    """Steps whose score has any of these flags set."""
    return [r["step"] for r in rows if any(r["score"].get(f) for f in flags)]


def steps_by_panel(rows: list[dict], field: str) -> dict[str, list[int]]:
    """For a panel list in the score (`missing_panels`, `discouraged_present`): the steps each panel appears on."""
    out: dict[str, list[int]] = {}
    for r in rows:
        for p in r["score"].get(field, []):
            out.setdefault(p, []).append(r["step"])
    return out


def short_note(note: str) -> str:
    """A pipeline note cut short so repeats group: the part before the colon for a failed or skipped call, else 48 characters."""
    if "failed" in note or "skipped" in note:
        return note.split(":")[0][:70]
    return note[:48] + "…" if len(note) > 48 else note


def md_row(*cells) -> str:
    return "| " + " | ".join(str(c) for c in cells) + " |"


def table_head(*names: str) -> str:
    return md_row(*names) + "\n|" + "---|" * len(names)


def ratio(n: str, d: str):
    """Shows `n/d` from two counts in summarize()'s output, or n/a when there is nothing to count."""
    return lambda m: f"{m[n]:g}/{m[d]:g}" if m[d] else "n/a"


def seconds(name: str):
    """Shows a latency from summarize()'s output, in seconds."""
    return lambda m: f"{m['latency'][name]:.1f}s" if name in m.get("latency", {}) else "n/a"


def tally(name: str):
    """Shows a count per name from summarize()'s output, most common first."""
    return lambda m: ", ".join(f"{k} ×{v}" for k, v in sorted(m[name].items(), key=lambda kv: -kv[1])) or "n/a"


# Every metric a report can show: its label, and how to show it from summarize()'s output.
METRICS = {
    "points": ("Points", lambda m: f"{m['points']:g}/{m['points_max']:g}"),
    "misses": ("**Misses** (key says contain/evacuate, model observed)", ratio("misses", "act_n")),
    "false_alarms": ("False alarms (harmless step, model acts)", ratio("false_alarms", "harmless_n")),
    "harmless_calm": ("Harmless handled calmly (observe, low banner, no discouraged panel)", ratio("harmless_calm", "harmless_n")),
    "all_clear": ("Harmless with the `all_clear` cue", ratio("harmless_all_clear", "harmless_n")),
    "over_escalations": ("Over-escalations (real step the key wants watched, model acts)", ratio("over_escalations", "watch_n")),
    "evacuate_ok": ("Evacuate matches (key says evacuate)",
                    lambda m: f"{m['confusion']['evacuate']['evacuate']}/{sum(m['confusion']['evacuate'].values())}"),
    "action_ok": ("Action match", ratio("action_ok", "steps")),
    "too_low_high": ("Contain against evacuate: called too low / too high", lambda m: f"{m['under_calls']} / {m['over_calls']}"),
    "dispatch_ok": ("Dispatch match", ratio("dispatch_ok", "steps")),
    "hot_ok": ("Hot sector match (FloorPlan, else intake sector)", ratio("hot_ok", "steps")),
    "hot_incident_ok": ("Hot sector match from the intake alone", ratio("hot_incident_ok", "steps")),
    "seal_ok": ("Seal set exact (not scored)", ratio("seal_ok", "steps")),
    "route_ok": ("Route set exact (not scored)", ratio("route_ok", "steps")),
    "playbook_ok": ("Routed to the key's playbook (not scored)", ratio("playbook_ok", "playbook_n")),
    "playbooks": ("Playbooks routed", tally("playbooks")),
    "tier_copied": ("Intake severity copies the feed tier (the model reads the label, not the text)", ratio("tier_copied", "tier_n")),
    "recall": ("Panel recall, mean", lambda m: f"{100 * m['recall_mean']:.0f}%"),
    "full_recall": ("Steps with every expected panel", ratio("full_recall", "steps")),
    "discouraged": ("Steps with a discouraged panel", ratio("discouraged_steps", "steps")),
    "discouraged_total": ("Discouraged panels shown, in all", lambda m: str(m["discouraged_total"])),
    "extra_panels": ("Panels the key neither expects nor discourages (neutral)", tally("extra_panels")),
    "distinct_sets": ("Distinct layouts", lambda m: str(m["distinct_sets"])),
    "key_distinct_sets": ("Distinct layouts the key expects", lambda m: str(m["key_distinct_sets"])),
    "most_common": ("Most common layout",
                    lambda m: f"{', '.join(m['most_common_set']) or 'n/a'} on {m['most_common_share']}/{m['steps'] - m['failed']} steps"),
    "jaccard": ("Mean pairwise layout distance (Jaccard, 0 = identical)", lambda m: f"{m['mean_jaccard_distance']:.2f}"),
    "failed": ("Failures (bad JSON, timeout, empty output)", ratio("failed", "steps")),
    "latency_mean": ("Latency per step, mean", seconds("mean")),
    "latency_median": ("Latency per step, median", seconds("median")),
    "latency_p95": ("Latency per step, p95", seconds("p95")),
    "latency_max": ("Latency per step, max", seconds("max")),
    "ingest": ("Intake phase inside the flow, mean", seconds("ingest_s")),
    "ground": ("Grounding phase inside the flow, mean", seconds("ground_s")),
    "compose": ("Compose phase inside the flow, mean", seconds("compose_s")),
    "incident_s": ("Time to the `incident` event (earliest thing the page could show)", seconds("incident_s")),
    "first_panel": ("**Time to the first panel**, mean", seconds("first_component_s")),
    "first_panel_p95": ("Time to the first panel, p95", seconds("first_component_p95")),
    "first_panel_max": ("Time to the first panel, max", seconds("first_component_max")),
    "last_panel": ("Time to the last panel, mean", seconds("last_component_s")),
}
# The metrics each report shows, in order.
ONE_RUN = ["points", "misses", "false_alarms", "harmless_calm", "all_clear", "over_escalations", "action_ok", "too_low_high",
           "dispatch_ok", "tier_copied", "playbook_ok", "playbooks", "hot_ok", "hot_incident_ok", "seal_ok", "route_ok", "recall",
           "full_recall", "discouraged", "discouraged_total", "extra_panels", "distinct_sets", "key_distinct_sets", "most_common",
           "jaccard", "failed", "latency_mean", "latency_median", "latency_p95", "latency_max", "ingest", "ground", "compose",
           "first_panel", "last_panel"]
COMBINED = ["misses", "false_alarms", "harmless_calm", "all_clear", "over_escalations", "evacuate_ok", "action_ok", "dispatch_ok",
            "hot_ok", "playbook_ok", "tier_copied", "recall", "discouraged", "distinct_sets", "key_distinct_sets", "failed",
            "latency_mean", "latency_median", "latency_p95", "latency_max", "incident_s", "first_panel", "first_panel_p95",
            "first_panel_max", "last_panel"]


def metrics_table(sm: dict[str, dict], ids: list[str]) -> list[str]:
    """One row per metric, one column per summary. A metric that no column has is left out."""
    out = [table_head("Metric", *sm)]
    for i in ids:
        label, show = METRICS[i]
        cells = [show(m) for m in sm.values()]
        if any(c != "n/a" for c in cells):
            out.append(md_row(label, *cells))
    return out


# --- report for one run ------------------------------------------------------------------------------

def render(rows: list[dict], keys: dict[str, dict], meta: dict, baseline: list[dict] | None = None) -> str:
    """The report for one run: score, metrics (beside the baseline when there is one), confusion, per step, lost points,
    and the steps that changed against the baseline."""
    m = summarize(rows, keys)
    L: list[str] = []
    w = L.append
    w(f"# {meta['title']} eval report: run {meta['name']}" + (f", variant {meta['variant']}" if meta["variant"] else "") + "\n")
    w(f"Generated {meta['generated']} · pipeline `{'/'.join(meta['hashes'])}` · sky input {'on' if meta['sky'] else 'OFF'} · "
      f"scenario `{meta['scenario']}` · answer key `{meta['key']}`\n")
    if len(meta["hashes"]) > 1:
        w(f"**The rows come from {len(meta['hashes'])} pipeline versions: the code changed during the run.** Re-run for a consistent report.\n")
    if meta["now"] not in meta["hashes"]:
        w(f"The files on disk have changed since this run (now `{meta['now']}`).\n")
    models = sorted({mod for r in rows if r.get("ok") for mod in (r["state"].get("models") or [])})
    w(f"Model(s) seen: {', '.join(models) or 'none'} · steps run: {len(rows)} · failures: {m['failed']}\n")
    w("Dispatch is scored from `recommended_action` (observe = no dispatch). The pipeline itself never posts; nothing was sent to Discord or PagerDuty.\n")

    pts = m["points"]
    w(f"## Score: {pts:g} / {m['points_max']:g} points ({100 * pts / m['points_max']:.0f}%)\n" if m["points_max"] else "## Score\n")
    w("Per step, one point each for: action match, dispatch match, hot-sector match, panel recall (fractional), no discouraged panel, no failure.\n")
    w("## Metrics\n")
    L += metrics_table({"Baseline": summarize(baseline, keys), "This run": m} if baseline else {"This run": m}, ONE_RUN)
    w("")

    w("## Action confusion (rows = key, columns = model)\n")
    w(table_head("key \\ model", *ACTS))
    for e in ACTS:
        w(md_row(e, *(m["confusion"][e][p] for p in ACTS)))
    w("")

    L += per_step_table(rows, keys)
    L += lost_points(rows)
    if baseline:
        L += changed_steps(baseline, rows)
    return "\n".join(L)


STEP_HEAD = ["#", "Time", "Feed tier", "Truth", "Key action", "Model action", "Disp", "Hot (model → key)", "Recall",
             "Panels (model)", "Δ panels", "Playbook", "Sound", "Lat s", "Pts"]


def per_step_table(rows: list[dict], keys: dict[str, dict]) -> list[str]:
    out = ["## Per step\n",
           "Truth: R real, H harmless. Hot is the FloorPlan hot sector, or the intake sector when there is no FloorPlan. "
           "Δ panels: `-X` is an expected panel that is missing, `!X` a discouraged panel that is present.\n",
           table_head(*STEP_HEAD)]
    for r in rows:
        key, s = keys[r["incident_id"]], r["score"]
        first = [r["step"], key["time"], key["severity_tier_in_input"], s["truth"][0].upper(),
                 key["expected_action"] + (" (D)" if key["discord_dispatch"] else "")]
        if s["failed"]:
            blank = [""] * (len(STEP_HEAD) - len(first) - 3)
            out.append(md_row(*first, f"**FAILED**: {r.get('error')}", *blank, f"{r.get('latency_s', 0):.0f}", f"0/{s['max']:g}"))
            continue
        hot_key = "/".join(norm_sector(x) or "" for x in key["sectors"]["hot"])
        out.append(md_row(*first, f"{s['action']} {mark(s['action_ok'])}", mark(s["dispatch_ok"]), f"{s['hot']} {mark(s['hot_ok'])} → {hot_key}",
                          f"{100 * s['recall']:.0f}%", ", ".join(s["panels"]), panel_delta(s),
                          f"{s['playbook']}{'' if s['playbook_ok'] in (None, True) else ' ✗'}", s["sound_cue"],
                          f"{r['latency_s']:.0f}", f"{s['total']:g}/{s['max']:g}"))
    return out + [""]


def lost_points(rows: list[dict]) -> list[str]:
    """Points lost per criterion, then the steps behind each kind of mistake."""
    out = ["## Where the points went\n", table_head("Criterion", "Points lost", "Steps")]
    for c in CRITERIA:
        points = [(r["step"], r["score"]["points"][c]) for r in rows]
        steps = [f"{step}" + (f" (-{1 - v:.2f})" if v > 0 else "") for step, v in points if v < 1]
        out.append(md_row(c, f"{sum(1 - v for _, v in points):.2f}", ", ".join(steps) or "–"))
    out.append("")
    kinds = {"false alarms (harmless, acted)": steps_where(rows, "false_alarm"),
             "misses (acting step, observed)": steps_where(rows, "miss"),
             "over-escalations (real/observe step, acted)": steps_where(rows, "over_escalation"),
             "contain↔evacuate mismatches": steps_where(rows, "under_call", "over_call"),
             "alarmist harmless layout": steps_where(rows, "alarmist_harmless")}
    for name, hit in kinds.items():
        if hit:
            out.append(f"- **{name}**: steps {', '.join(map(str, hit))}")
    for title, field in (("expected panels most often missing", "missing_panels"), ("discouraged panels most often present", "discouraged_present")):
        by_panel = steps_by_panel(rows, field)
        if by_panel:
            out.append(f"- **{title}**: " + "; ".join(f"{p} ×{len(v)} (steps {', '.join(map(str, v))})" for p, v in sorted(by_panel.items(), key=lambda kv: -len(kv[1]))))
    notes = Counter(short_note(n) for r in rows for n in r["score"].get("notes", []))
    if notes:
        out.append("- **pipeline notes**: " + "; ".join(f"{n} ×{c}" for n, c in notes.most_common()))
    fallback = [r["step"] for r in rows if r["score"].get("models") and len(set(r["score"]["models"])) > 1]
    if fallback:
        out.append(f"- **fallback model used** on steps {', '.join(map(str, fallback))}")
    return out + [""]


def changed_steps(base: list[dict], rows: list[dict]) -> list[str]:
    """The steps whose action or points differ from the baseline."""
    before = {r["step"]: r["score"] for r in base}
    out = ["## Against the baseline (eval/baseline/results.jsonl)\n", "Steps that changed (points before → after):\n",
           table_head("#", "Truth", "Key", "Baseline action", "This run's action", "Points")]
    for r in rows:
        x, y = before.get(r["step"]), r["score"]
        if x and (x.get("action") != y.get("action") or x["total"] != y["total"]):
            out.append(md_row(r["step"], y["truth"], y["expected_action"], x.get("action"), y.get("action"), f"{x['total']:g} → {y['total']:g}"))
    return out + [""]


# --- report across passes ----------------------------------------------------------------------------

def combine(labels: list[str], scen_path: Path, key_path: Path) -> int:
    """report.md for several named passes of the current code, side by side with the baseline."""
    keys = load_key(key_path)
    base = load_scored(BASELINE, keys)
    passes = {lab: load_scored(EVAL / f"results-{lab}.jsonl", keys) for lab in labels}
    if not base or not all(passes.values()):
        print("missing results for the baseline or a pass", file=sys.stderr)
        return 1
    cols = {"Baseline": base, **{f"Pass {lab.upper()}": rows for lab, rows in passes.items()}}
    sm = {name: summarize(rows, keys) for name, rows in cols.items()}
    names = list(cols)
    hashes = {name: sorted({r["pipeline_hash"] for r in rows}) for name, rows in cols.items()}
    L: list[str] = []
    w = L.append

    w(f"# {load_scenario(scen_path)['title']} eval report\n")
    w(f"Generated {datetime.now().strftime('%Y-%m-%d %H:%M')} · scenario `{rel(scen_path)}` · answer key `{rel(key_path)}` · "
      + " · ".join(f"{n}: pipeline `{'/'.join(h)}`" for n, h in hashes.items()) + "\n")
    mixed = [n for n, h in hashes.items() if len(h) > 1]
    if mixed:
        w(f"**{', '.join(mixed)} mix pipeline versions: the code changed during the run.**\n")
    now = pipeline_hash()
    if now not in {h for hs in hashes.values() for h in hs}:
        w(f"The files on disk have changed since these runs (now `{now}`).\n")
    w("Dispatch is scored from `recommended_action` (observe = no dispatch). Nothing was sent to Discord or PagerDuty. Worker runs carry `PROOF_CONTEXT=eval` in the proof ledger.\n")

    w("## Score\n")
    w("| | " + " | ".join(names) + " | Mean of passes |\n|---|" + "---|" * (len(names) + 1))
    w("| Points / " + f"{sm[names[0]]['points_max']:g} | " + " | ".join(f"{sm[n]['points']:.2f}" for n in names)
      + f" | {statistics.mean(sm[n]['points'] for n in names[1:]):.2f} |")
    w("")

    w("## Metrics\n")
    L += metrics_table(sm, COMBINED)
    w("")

    w("## Action confusion (rows = key, columns = model: observe / contain / evacuate)\n")
    w(table_head("key", *names))
    for e in ACTS:
        w(md_row(e, *(" / ".join(str(m["confusion"][e][p]) for p in ACTS) for m in sm.values())))
    w("")

    by_step = {n: {r["step"]: r for r in rows} for n, rows in cols.items()}
    w("## Per step\n")
    w("Cells are `action pts`. Δ panels: `-X` an expected panel missing, `!X` a discouraged one present. A `*` marks an action different from the key.\n")
    w(table_head("#", "Truth", "Key", "Feed tier", *(f"{n} act pts" for n in names), *(f"{n} Δ panels" for n in names[1:]), "Flip"))
    for step in sorted(by_step[names[0]]):
        key = keys[by_step[names[0]][step]["incident_id"]]
        cells, deltas = [], []
        for n in names:
            r = by_step[n].get(step)
            if not r:
                cells.append("–")
                continue
            sc = r["score"]
            cells.append("FAILED 0" if sc["failed"] else action_cell(sc))
            if n != names[0]:
                deltas.append("FAILED" if sc["failed"] else panel_delta(sc))
        flip = "flip" if len({by_step[n][step]["score"].get("action") for n in names[1:] if step in by_step[n]}) > 1 else ""
        w(md_row(step, key["truth"][0].upper(), key["expected_action"] + (" (D)" if key["discord_dispatch"] else ""),
                 key["severity_tier_in_input"], *cells, *deltas, flip))
    w("")

    w("## Where the points went\n")
    w(table_head("Criterion", *names))
    for c in CRITERIA:
        w(md_row(c, *(f"{sum(1 - r['score']['points'][c] for r in cols[n]):.2f}" for n in names)))
    w("")
    for n in names[1:]:
        rows = cols[n]
        dis = steps_by_panel(rows, "discouraged_present")
        notes = Counter(short_note(note) for r in rows for note in r["score"].get("notes", []))
        w(f"- **{n}**: misses {steps_where(rows, 'miss') or 'none'}; false alarms {steps_where(rows, 'false_alarm') or 'none'}; "
          f"over-escalations {steps_where(rows, 'over_escalation') or 'none'}; contain/evacuate mismatches {steps_where(rows, 'under_call', 'over_call') or 'none'}; "
          f"discouraged panels " + ("; ".join(f"{p} {v}" for p, v in dis.items()) or "none") + "; pipeline notes " + ("; ".join(f"{k} ×{v}" for k, v in notes.most_common()) or "none"))
    w("")
    w("Notes: what I fixed and rejected after the first passes is in [fixes.md](fixes.md). The guard experiments are in "
      "[archive/report-guards.md](archive/report-guards.md), [archive/report-guards-live.md](archive/report-guards-live.md) "
      "and [archive/guards-fixes.md](archive/guards-fixes.md).\n")
    out = EVAL / "report.md"
    out.write_text("\n".join(L))
    print(f"wrote {out.name}: " + "; ".join(f"{n} {sm[n]['points']:.2f}" for n in names))
    return 0


# --- CLI ---------------------------------------------------------------------------------------------

def run_pass(args, name: str, scenario: dict, keys: dict[str, dict], results: Path, old: dict[int, dict],
             current_hash: str) -> dict[int, dict]:
    """Run the selected steps one at a time and write results after each one. Returns every row by step, run or kept."""
    ticks = scenario["ticks"]
    wanted = parse_steps(args.steps, len(ticks))
    todo = [t for t in ticks if t["step"] in wanted]
    times = {t["step"]: t.get("time", "") for t in ticks}
    keep: dict[int, dict] = {}
    if args.resume:
        # A row is kept only if it succeeded on the pipeline that is on disk now.
        fresh = lambda r: r.get("ok") and r.get("pipeline_hash") == current_hash and r.get("sky") == scenario["sky"]
        todo = [t for t in todo if not fresh(old.get(t["step"]) or {})]
        keep = {s: r for s, r in old.items() if s in wanted and fresh(r)}
    # A fresh run replaces only the selected steps; rows for other steps stay (use --steps to extend a run).
    rows_by_step = {s: r for s, r in old.items() if s not in wanted} | keep
    print(f"scenario {rel(args.scenario)}, key {args.key.name}; "
          f"{len(todo)} step(s) to run, timeout {args.timeout:.0f}s, pipeline {current_hash}", flush=True)
    # As on the server, only a scenario marked with a sky gets one.
    skies = load_skies(args.scenario) if scenario["sky"] else {}

    def earlier_findings(t: dict) -> list[dict]:
        """What this pass's earlier steps found, oldest first, the way the server sends it."""
        out = []
        for step in sorted(s for s in rows_by_step if s < t["step"]):
            found = ((rows_by_step[step].get("state") or {}).get("incident")) or {}
            if found:
                out.append({"time": times.get(step, ""), "sector": found.get("sector", ""), "entity": found.get("entity", ""),
                            "entity_class": found.get("entity_class"), "verdict": found.get("verdict"), "summary": found.get("summary", "")})
        return out

    for t in todo:
        row = run_step(t, name, args.variant, args.timeout, skies.get(t["incident_id"]), earlier_findings(t))
        row["score"] = score(row, keys[t["incident_id"]])
        rows_by_step[t["step"]] = row
        write_rows(results, list(rows_by_step.values()))  # a crash keeps every finished step
        s = row["score"]
        state = "FAILED: " + str(row.get("error")) if s["failed"] else \
            f"{s['action']:<8} exp {s['expected_action']:<8} hot {s['hot']} {mark(s['hot_ok'])} panels {','.join(s['panels'])}"
        print(f"step {t['step']:>2} {row['latency_s']:6.1f}s  {s['total']:g}/{s['max']:g}  {state}", flush=True)
    return rows_by_step


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--label", help="name this run: results-<label>.jsonl, report-<label>.md, and -<label> on its raw/ and logs/ files")
    ap.add_argument("--variant", help="run eval/variants/<name>.py's in-memory changes through eval/worker.py; names the run when there is no --label")
    ap.add_argument("--steps", help='steps to run, e.g. "1-5" or "1,4,7-9" (default: all)')
    ap.add_argument("--timeout", type=float, default=150, help="seconds before a step is killed and counted as failed")
    ap.add_argument("--resume", action="store_true", help="keep rows in the results file that succeeded on the pipeline now on disk; run the rest")
    ap.add_argument("--report-only", action="store_true", help="re-score the results file and rewrite the run's report; no pipeline runs")
    ap.add_argument("--results", type=Path, help="the results file (default eval/results-<label>.jsonl); with --report-only, re-scores an archived pass in place")
    ap.add_argument("--scenario", type=Path, default=ROOT / "fixtures" / "nightfall" / "scenario.json", help="scenario.json (default: Nightfall)")
    ap.add_argument("--key", type=Path, default=ROOT / "fixtures" / "nightfall" / "answer-key.json", help="answer-key.json (default: Nightfall)")
    ap.add_argument("--combine", help="comma-separated labels (a,b): write report.md from their results, against eval/baseline/; no pipeline runs")
    args = ap.parse_args()
    if args.combine:
        return combine(args.combine.split(","), args.scenario, args.key)
    name = args.label or args.variant
    if not name:
        ap.error("a run needs --label (or --variant)")
    results = args.results or EVAL / f"results-{name}.jsonl"
    report = EVAL / f"report-{name}.md"

    scenario, keys = load_scenario(args.scenario), load_key(args.key)
    rows_by_step = {r["step"]: r for r in read_rows(results)}
    if not args.report_only:
        rows_by_step = run_pass(args, name, scenario, keys, results, rows_by_step, pipeline_hash(args.variant))

    rows = [{**rows_by_step[s], "score": score(rows_by_step[s], keys[rows_by_step[s]["incident_id"]])} for s in sorted(rows_by_step)]
    if not rows:
        print("no results yet", file=sys.stderr)
        return 1
    meta = {"title": scenario["title"], "name": name, "variant": args.variant, "generated": datetime.now().strftime("%Y-%m-%d %H:%M"),
            "hashes": sorted({r["pipeline_hash"] for r in rows}), "now": pipeline_hash(args.variant),
            "sky": all(r.get("sky") for r in rows), "scenario": rel(args.scenario), "key": rel(args.key)}
    # The baseline is a Nightfall run, so another scenario's report has no baseline. It covers the steps this run covers.
    baseline_ids = {r["incident_id"] for r in read_rows(BASELINE)}
    base = [r for r in load_scored(BASELINE, keys) if r["step"] in rows_by_step] if baseline_ids <= keys.keys() else None
    report.write_text(render(rows, keys, meta, base))
    s = summarize(rows, keys)
    print(f"\n{s['points']:g}/{s['points_max']:g} points, {s['failed']} failed; wrote {rel(report)}")
    if len(meta["hashes"]) > 1:
        print("warning: the pipeline changed while rows were collected; re-run (--resume reruns the stale steps) for a consistent report", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
