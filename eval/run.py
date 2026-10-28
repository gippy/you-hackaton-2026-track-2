"""Evaluation harness for the Haunted Command Station pipeline.

    .venv/bin/python eval/run.py                    run every step of the Nightfall scenario, then score and report
    .venv/bin/python eval/run.py --steps 1-3        only these steps (also "1,4,7-9")
    .venv/bin/python eval/run.py --resume           keep rows that succeeded on the current pipeline, run only the rest
    .venv/bin/python eval/run.py --report-only      re-score results.jsonl and rewrite report.md, no model calls
    .venv/bin/python eval/run.py --label a          a named run: results-a.jsonl, report-a.md, raw/ and logs/ tagged -a
    .venv/bin/python eval/run.py --combine a,b      rewrite report.md from results-a.jsonl and results-b.jsonl, against eval/baseline/
    .venv/bin/python eval/run.py --variant v1       run eval/variants/v1.py's in-memory prompt changes (results-v1.jsonl, report-v1.md)

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
import concurrent.futures as cf
import hashlib
import json
import os
import statistics
from collections import Counter
import subprocess
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EVAL = Path(__file__).resolve().parent
LIB = json.loads((ROOT / "shared" / "library.json").read_text())
BASELINE = EVAL / "baseline" / "results.jsonl"  # the first full run, kept to compare later runs against
SECTORS = set(LIB["sectors"])
SECTOR_ALIASES = {**(LIB.get("sector_aliases") or {}), "catering_coffee_bar": "catering", "coffee_bar": "catering"}
ACTS = ["observe", "contain", "evacuate"]
RANK = {a: i for i, a in enumerate(ACTS)}
SEV_RANK = {"low": 0, "elevated": 1, "critical": 2, "catastrophic": 3}
TIER_SEVERITY = {"LOW_HAUNT": "low", "ELEVATED_HAUNT": "elevated", "CRITICAL_HAUNT": "critical"}  # UNVERIFIED maps to nothing
# One point each per step, so a perfect run scores 6 per step. Panel recall counts fractionally.
CRITERIA = ["action", "dispatch", "hot", "recall", "no_discouraged", "no_failure"]


# --- inputs ------------------------------------------------------------------------------------------

def find_input(kind: str, override: str | None) -> Path:
    """Prefer the copies in fixtures/ (the build session puts them there), else scenarios/pitches/nightfall."""
    if override:
        return Path(override)
    want = "answer-key" if kind == "key" else "scenario"
    hits = sorted(p for p in (ROOT / "fixtures").rglob("*.json")
                  if "nightfall" in str(p.relative_to(ROOT / "fixtures")).lower() and want in p.name.lower()
                  and (kind == "key" or "answer" not in p.name.lower()))
    return hits[0] if hits else ROOT / "scenarios" / "pitches" / "nightfall" / f"{'answer-key' if kind == 'key' else 'scenario'}.json"


def load_scenario(path: Path) -> list[dict]:
    return json.loads(path.read_text())["ticks"]


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


def pipeline_hash(variant: str | None = None, base: Path | None = None) -> str:
    h = hashlib.sha256()
    base = base or ROOT
    files = sorted((base / "pipeline").glob("*.py")) + [base / "shared" / "library.json", ROOT / "server" / "sky.ts"]
    if variant:
        files += [EVAL / "worker.py", *sorted((EVAL / "variants").glob("*.py"))]
    for p in files:
        h.update(p.name.encode())
        h.update(p.read_bytes() if p.exists() else b"")
    return h.hexdigest()[:10]


def load_skies(scenario: Path) -> dict[str, dict] | None:
    """The sky the server adds to a scenario step, computed by the server's own server/sky.ts through Node.

    None when Node or the helper fails; the steps then run without a sky, as a pasted report does."""
    node = os.environ.get("NODE") or "node"
    try:
        out = subprocess.run([node, str(EVAL / "sky.ts"), str(scenario), str(EVAL / "cache")], cwd=ROOT, capture_output=True,
                             text=True, timeout=60, check=True).stdout
        return json.loads(out)
    except (OSError, subprocess.SubprocessError, json.JSONDecodeError) as exc:
        print(f"warning: could not compute the sky ({type(exc).__name__}); steps run without SkyClock", file=sys.stderr)
        return None


def norm_sector(s: str | None) -> str | None:
    s = SECTOR_ALIASES.get(s or "", s)
    return s


# --- running one step --------------------------------------------------------------------------------

def run_step(tick: dict, timeout: float, sky: dict | None = None, variant: str | None = None, label: str | None = None,
             snapshot: Path | None = None) -> dict:
    """Run the pipeline worker on one incident. Never raises: a failure is a row with ok=False."""
    step = tick["step"]
    payload = {"raw": tick["raw_incident_stream"], "incident_id": tick["incident_id"], "severity_tier": tick["severity_tier"]}
    if sky:
        payload["sky"] = sky  # what server/station.ts adds for a scenario step
    (EVAL / "logs").mkdir(exist_ok=True)
    python = os.environ.get("PYTHON") or str(ROOT / ".venv" / "bin" / "python")
    row: dict = {"step": step, "incident_id": tick["incident_id"], "ok": False, "error": None, "pipeline_hash": pipeline_hash(variant, snapshot), "base_hash": pipeline_hash(None, snapshot), "sky": bool(sky), "variant": variant, "label": label,
                 "started": datetime.now(timezone.utc).isoformat(timespec="seconds")}
    events: list[tuple[float, dict]] = []
    result: dict | None = None
    fatal = ""
    t0 = time.monotonic()
    tag = f"-{label or variant}" if (label or variant) else ""
    # The pipeline tags its proof-ledger lines with PROOF_CONTEXT, so eval runs can be told from demo runs.
    env = {**os.environ, "PROOF_CONTEXT": os.environ.get("PROOF_CONTEXT") or "eval"}
    if snapshot:
        env["EVAL_SNAPSHOT"] = str(snapshot)
    with open(EVAL / "logs" / f"step-{step:02d}{tag}.log", "w") as log:
        try:
            cmd = [python, str(EVAL / "worker.py"), variant] if variant else [python, "-m", "pipeline"]
            proc = subprocess.Popen(cmd, cwd=ROOT, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                    stderr=log, text=True, env=env)
        except OSError as exc:
            row["error"] = f"could not start {python}: {exc}"
            row["latency_s"] = 0.0
            return row

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
            row["error"] = f"timeout after {timeout:.0f}s"
        reader.join(5)
    row["latency_s"] = round(time.monotonic() - t0, 2)
    row["exit_code"] = code
    steps_seen = [e for _, e in events if e.get("type") == "step"]
    if steps_seen:
        row["last_phase"] = f"{steps_seen[-1]['id']}:{steps_seen[-1]['state']}"
    if code is not None and not result:
        row["error"] = fatal or f"exit {code} with no result; see eval/logs/step-{step:02d}{tag}.log"
    if row["error"] and row.get("last_phase"):
        row["error"] += f" (last phase seen: {row['last_phase']})"
    if fatal:
        row["fatal"] = fatal
    row["timing"] = timing_from(events)
    (EVAL / "raw").mkdir(exist_ok=True)
    (EVAL / "raw" / f"step-{step:02d}{tag}.json").write_text(json.dumps({"state": result, "events": events}, indent=1))
    if result:
        sources = result.get("sources") or []
        row["state"] = {k: result.get(k) for k in ("incident", "playbook", "manifest", "notes", "models")}
        row["state"]["source_count"] = len(sources)
        row["state"]["research_chars"] = len(result.get("research") or "")
        if not (result.get("manifest") or {}).get("components"):
            row["error"] = "empty manifest"
        elif row["error"] is None:
            row["ok"] = True
    return row


def timing_from(events: list[tuple[float, dict]]) -> dict:
    """Seconds from process start to the first of each event, and the pipeline's own per-phase ms."""
    t: dict = {}
    comps = [e for e in events if e[1].get("type") == "component"]
    for name, typ in (("incident_s", "incident"), ("route_s", "route"), ("sources_s", "sources"), ("frame_s", "frame")):
        hit = next((e[0] for e in events if e[1].get("type") == typ), None)
        if hit is not None:
            t[name] = round(hit, 2)
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
    s: dict = {"truth": key["truth"], "expected_action": exp_action, "expected_dispatch": bool(key["discord_dispatch"]),
               "failed": not row.get("ok")}
    if not row.get("ok"):
        s.update(points={c: 0.0 for c in CRITERIA}, total=0.0, max=float(len(CRITERIA)))
        return s
    state = row["state"]
    manifest, inc = state["manifest"], state["incident"]
    comps = {c["type"]: c for c in manifest["components"]}
    present = [c["type"] for c in manifest["components"]]
    action = manifest.get("recommended_action")
    fp = comps.get("FloorPlan", {}).get("props") or {}
    hot_fp = fp.get("hot_sector")
    hot = hot_fp or inc.get("sector")
    banner = (comps.get("ThreatBanner", {}).get("props") or {}).get("severity")
    recall_hits = [p for p in expected if p in present]
    disc_present = [p for p in discouraged if p in present]
    seal_pred = set(fp.get("seal") or [])
    route_pred = set(fp.get("safe_route") or [])
    s.update(
        action=action, dispatch=action != "observe", banner_severity=banner, panels=present,
        panel_set=sorted(present), hot=hot, hot_floorplan=hot_fp, incident_sector=inc.get("sector"),
        seal=sorted(seal_pred), route=list(fp.get("safe_route") or []),
        action_ok=action == exp_action,
        dispatch_ok=(action != "observe") == bool(key["discord_dispatch"]),
        hot_ok=hot in exp_hot, hot_incident_ok=inc.get("sector") in exp_hot,
        seal_ok=seal_pred == exp_seal, route_ok=route_pred == exp_route,
        recall=len(recall_hits) / len(expected) if expected else 1.0, missing_panels=[p for p in expected if p not in present],
        discouraged_present=disc_present, extra_panels=[p for p in present if p not in expected + optional + discouraged],
        false_alarm=key["truth"] == "harmless" and action != "observe",
        miss=exp_action != "observe" and action == "observe",
        over_escalation=exp_action == "observe" and key["truth"] == "real" and action != "observe",
        under_call=exp_action != "observe" and action != "observe" and RANK[action] < RANK[exp_action],
        over_call=exp_action != "observe" and action != "observe" and RANK[action] > RANK[exp_action],
        alarmist_harmless=key["truth"] == "harmless" and (banner not in (None, "low") or bool(disc_present)),
        sound_cue=manifest.get("sound_cue"), n_components=len(present),
        severity_extracted=inc.get("severity"), threat_level=inc.get("threat_level"),
        entity_class=inc.get("entity_class"), playbook=state.get("playbook"),
        playbook_ok=(state.get("playbook") == key["_playbook"]) if key.get("_playbook") else None,
        tier_copied=(inc.get("severity") == TIER_SEVERITY[key["severity_tier_in_input"]]) if key.get("severity_tier_in_input") in TIER_SEVERITY else None,
        models=state.get("models"), notes=state.get("notes") or [],
    )
    p = {"action": float(s["action_ok"]), "dispatch": float(s["dispatch_ok"]), "hot": float(s["hot_ok"]),
         "recall": round(s["recall"], 3), "no_discouraged": float(not disc_present), "no_failure": 1.0}
    s.update(points=p, total=round(sum(p.values()), 3), max=float(len(CRITERIA)))
    return s


def pct(n: float, d: float) -> str:
    return f"{n:g}/{d:g} ({100 * n / d:.0f}%)" if d else "n/a"


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
    sets = [tuple(s["panel_set"]) for s in done]
    exp_sets = {tuple(sorted(keys[r["incident_id"]]["panels_expected"])) for r in rows}
    pairs = [jaccard_distance(set(a), set(b)) for i, a in enumerate(sets) for b in sets[i + 1:]]
    common = max(set(sets), key=sets.count) if sets else ()
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
        ls = sorted(lat)
        m["latency"] = {"mean": statistics.mean(lat), "median": statistics.median(lat), "p95": ls[min(len(ls) - 1, int(0.95 * len(ls)))],
                        "min": ls[0], "max": ls[-1]}
        for name in ("incident_s", "first_component_s", "last_component_s"):
            vals = [r["timing"][name] for r in rows if r.get("ok") and name in r.get("timing", {})]
            if vals:
                m["latency"][name] = statistics.mean(vals)
                if name == "first_component_s":
                    m["latency"]["first_component_max"] = max(vals)
                    m["latency"]["first_component_p95"] = sorted(vals)[min(len(vals) - 1, int(0.95 * len(vals)))]
        for name in ("ingest_ms", "ground_ms", "compose_ms"):
            vals = [r["timing"][name] / 1000 for r in rows if r.get("ok") and r.get("timing", {}).get(name)]
            if vals:
                m["latency"][name.replace("_ms", "_s")] = statistics.mean(vals)
    return m


# --- report ------------------------------------------------------------------------------------------

def tick(ok: bool | None) -> str:
    return "✓" if ok else "✗"


def compare(base: list[dict], rows: list[dict], keys: dict[str, dict]) -> list[str]:
    """Baseline against this run: the metrics side by side, then the steps whose action or points changed."""
    base = [r for r in base if r["step"] in {x["step"] for x in rows}]  # compare the steps this run covers
    b, v = summarize(base, keys), summarize(rows, keys)
    out = ["## Against the baseline (eval/baseline/results.jsonl)\n", "| Metric | Baseline | This run |\n|---|---|---|"]
    def line(name, f):
        out.append(f"| {name} | {f(b)} | {f(v)} |")
    line("Points", lambda m: f"{m['points']:g}/{m['points_max']:g}")
    line("False alarms (harmless, acted)", lambda m: f"{m['false_alarms']}/{m['harmless_n']}")
    line("Harmless handled calmly", lambda m: f"{m['harmless_calm']}/{m['harmless_n']}")
    line("Harmless with `all_clear`", lambda m: f"{m['harmless_all_clear']}/{m['harmless_n']}")
    line("Misses", lambda m: f"{m['misses']}/{m['act_n']}")
    line("Over-escalations", lambda m: f"{m['over_escalations']}/{m['watch_n']}")
    line("Action match", lambda m: f"{m['action_ok']}/{m['steps']}")
    line("Dispatch match", lambda m: f"{m['dispatch_ok']}/{m['steps']}")
    line("Hot sector match", lambda m: f"{m['hot_ok']}/{m['steps']}")
    line("Panel recall, mean", lambda m: f"{100 * m['recall_mean']:.0f}%")
    line("Steps with a discouraged panel", lambda m: f"{m['discouraged_steps']}/{m['steps']}")
    line("Routed to the key's playbook", lambda m: f"{m['playbook_ok']}/{m['playbook_n']}")
    line("Intake severity copies the feed tier", lambda m: f"{m['tier_copied']}/{m['tier_n']}")
    line("Distinct layouts", lambda m: f"{m['distinct_sets']}")
    line("Failures", lambda m: f"{m['failed']}")
    if "latency" in b and "latency" in v:
        line("Mean latency", lambda m: f"{m['latency']['mean']:.1f}s")
    out += ["", "Steps that changed (points before → after):\n", "| # | Truth | Key | Baseline action | Variant action | Points |", "|---|---|---|---|---|---|"]
    bs = {r["step"]: r["score"] for r in base}
    for r in rows:
        x, y = bs.get(r["step"]), r["score"]
        if x and (x.get("action") != y.get("action") or x["total"] != y["total"]):
            out.append(f"| {r['step']} | {y['truth']} | {y['expected_action']} | {x.get('action')} | {y.get('action')} | {x['total']:g} → {y['total']:g} |")
    return out + [""]


def render(rows: list[dict], keys: dict[str, dict], meta: dict, baseline: list[dict] | None = None) -> str:
    m = summarize(rows, keys)
    L: list[str] = []
    w = L.append
    w(f"# Nightfall eval report{' — variant ' + meta['variant'] if meta.get('variant') else ''}{' — run ' + meta['label'] if meta.get('label') else ''}\n")
    w(f"Generated {meta['generated']} · pipeline hash `{meta['hash']}`"
      + (f" · **rows come from {len(meta['hashes'])} pipeline versions** ({', '.join(meta['hashes'])}); re-run for a consistent report" if len(meta["hashes"]) > 1 else "")
      + (f" · the files on disk have changed since this run (now `{meta['disk_changed']}`)" if meta.get("disk_changed") else "")
      + f" · sky input {'on' if meta.get('sky') else 'OFF'} · scenario `{meta['scenario']}` · answer key `{meta['key']}`\n")
    models = sorted({mod for r in rows if r.get("ok") for mod in (r["state"].get("models") or [])})
    w(f"Model(s) seen: {', '.join(models) or 'none'} · steps run: {len(rows)} · failures: {m['failed']}\n")
    w("Dispatch is scored from `recommended_action` (observe = no dispatch). The pipeline itself never posts; nothing was sent to Discord or PagerDuty.\n")

    pts = m["points"]
    w(f"## Score: {pts:g} / {m['points_max']:g} points ({100 * pts / m['points_max']:.0f}%)\n" if m["points_max"] else "## Score\n")
    w("Per step, one point each for: action match, dispatch match, hot-sector match, panel recall (fractional), no discouraged panel, no failure.\n")
    w("## Metrics\n")
    w("| Metric | Result |\n|---|---|")
    done = m["steps"] - m["failed"]
    w(f"| False alarms (harmless step, model acts or dispatches) | {m['false_alarms']}/{m['harmless_n']} |")
    w(f"| Harmless handled calmly (observe, low banner, no discouraged panel) | {pct(m['harmless_calm'], m['harmless_n'])} |")
    w(f"| Harmless with the `all_clear` sound cue | {pct(m['harmless_all_clear'], m['harmless_n'])} |")
    w(f"| Misses (key says contain/evacuate, model observes) | {m['misses']}/{m['act_n']} |")
    w(f"| Over-escalation (real but key says observe, model acts) | {m['over_escalations']}/{m['watch_n']} |")
    w(f"| Action match | {pct(m['action_ok'], m['steps'])} |")
    w(f"| of which called too low / too high (contain vs evacuate) | {m['under_calls']} / {m['over_calls']} |")
    w(f"| Dispatch match | {pct(m['dispatch_ok'], m['steps'])} |")
    if m["tier_n"]:
        w(f"| Intake severity equals the feed's tier label (diagnostic: the model reads the label, not the text) | {pct(m['tier_copied'], m['tier_n'])} of the steps with a LOW/ELEVATED/CRITICAL tier |")
    if m["playbook_n"]:
        w(f"| Entity routed to the key's playbook (diagnostic, not scored) | {pct(m['playbook_ok'], m['playbook_n'])}; routed: "
          + ", ".join(f"{k} ×{v}" for k, v in sorted(m["playbooks"].items(), key=lambda kv: -kv[1])) + " |")
    w(f"| Hot sector match (FloorPlan, else incident sector) | {pct(m['hot_ok'], m['steps'])} |")
    w(f"| Hot sector match from the intake step alone | {pct(m['hot_incident_ok'], m['steps'])} |")
    w(f"| Seal set exact / route set exact (secondary, not scored) | {pct(m['seal_ok'], m['steps'])} / {pct(m['route_ok'], m['steps'])} |")
    w(f"| Panel recall, mean | {100 * m['recall_mean']:.0f}% (all expected present on {m['full_recall']}/{m['steps']} steps) |")
    w(f"| Discouraged panels present | {m['discouraged_total']} panels on {m['discouraged_steps']}/{m['steps']} steps |")
    if m["extra_panels"]:
        w(f"| Panels the key neither expects nor discourages | " + ", ".join(f"{p} ×{c}" for p, c in sorted(m["extra_panels"].items(), key=lambda kv: -kv[1])) + " (neutral) |")
    w(f"| Layout variety (distinct panel sets) | {m['distinct_sets']} distinct in {done} runs; the key itself expects {m['key_distinct_sets']} |")
    w(f"| Most common layout | {', '.join(m['most_common_set']) or 'n/a'} on {m['most_common_share']}/{done} steps |")
    w(f"| Mean pairwise layout distance (Jaccard, 0 = identical) | {m['mean_jaccard_distance']:.2f} |")
    w(f"| Failures (bad JSON, timeout, empty output) | {m['failed']}/{m['steps']} |")
    lat = m.get("latency")
    if lat:
        w(f"| Latency per step (wall) | mean {lat['mean']:.1f}s · median {lat['median']:.1f}s · p95 {lat['p95']:.1f}s · max {lat['max']:.1f}s |")
        parts = [f"{k.split('_')[0]} {lat[k]:.1f}s" for k in ("ingest_s", "ground_s", "compose_s") if k in lat]
        w(f"| Mean phase time inside the flow | {' · '.join(parts)} |")
        if "first_component_s" in lat:
            w(f"| Time to first / last component on the wire | {lat['first_component_s']:.1f}s / {lat['last_component_s']:.1f}s |")
    w("")

    w("## Action confusion (rows = key, columns = model)\n")
    w("| key \\ model | observe | contain | evacuate |\n|---|---|---|---|")
    for e in ACTS:
        w(f"| {e} | " + " | ".join(str(m["confusion"][e][p]) for p in ACTS) + " |")
    w("")

    w("## Per step\n")
    w("Truth: R real, H harmless. Hot is the FloorPlan hot sector, or the intake sector when there is no FloorPlan. "
      "Δ panels: `-X` is an expected panel that is missing, `!X` a discouraged panel that is present.\n")
    w("| # | Time | Feed tier | Truth | Key action | Model action | Disp | Hot (model → key) | Recall | Panels (model) | Δ panels | Playbook | Sound | Lat s | Pts |")
    w("|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|")
    for r in rows:
        key, s = keys[r["incident_id"]], r["score"]
        tier = key["severity_tier_in_input"]
        base = f"| {r['step']} | {key['time']} | {tier} | {s['truth'][0].upper()} | {key['expected_action']}{' (D)' if key['discord_dispatch'] else ''} |"
        if s["failed"]:
            w(f"{base} **FAILED** | | | | | | | | | {r.get('latency_s', 0):.0f} | 0/{s['max']:g} |  \n  ↳ {r.get('error')}")
            continue
        delta = " ".join([f"-{p}" for p in s["missing_panels"]] + [f"!{p}" for p in s["discouraged_present"]]) or "–"
        hot_key = "/".join(norm_sector(x) or "" for x in key["sectors"]["hot"])
        w(f"{base} {s['action']} {tick(s['action_ok'])} | {tick(s['dispatch_ok'])} | {s['hot']} {tick(s['hot_ok'])} → {hot_key} | "
          f"{100 * s['recall']:.0f}% | {', '.join(s['panels'])} | {delta} | {s['playbook']}{'' if s['playbook_ok'] in (None, True) else ' ✗'} | {s['sound_cue']} | {r['latency_s']:.0f} | {s['total']:g}/{s['max']:g} |")
    w("")

    w("## Where the points went\n")
    by: dict[str, list[str]] = {c: [] for c in CRITERIA}
    for r in rows:
        for c, v in r["score"]["points"].items():
            if v < 1:
                by[c].append(f"{r['step']}" + (f" (-{1 - v:.2f})" if 0 < v < 1 else ""))
    w("| Criterion | Points lost | Steps |\n|---|---|---|")
    for c in CRITERIA:
        lost = sum(1 - r["score"]["points"][c] for r in rows)
        w(f"| {c} | {lost:.2f} | {', '.join(by[c]) or '–'} |")
    w("")
    kinds = {"false alarms (harmless, acted)": [r for r in rows if r["score"].get("false_alarm")],
             "misses (acting step, observed)": [r for r in rows if r["score"].get("miss")],
             "over-escalations (real/observe step, acted)": [r for r in rows if r["score"].get("over_escalation")],
             "contain↔evacuate mismatches": [r for r in rows if r["score"].get("under_call") or r["score"].get("over_call")],
             "alarmist harmless layout": [r for r in rows if r["score"].get("alarmist_harmless")]}
    for name, hit in kinds.items():
        if hit:
            w(f"- **{name}**: steps {', '.join(str(r['step']) for r in hit)}")
    missing: dict[str, list[int]] = {}
    for r in rows:
        for p in r["score"].get("missing_panels", []):
            missing.setdefault(p, []).append(r["step"])
    if missing:
        w("- **expected panels most often missing**: " + "; ".join(f"{p} ×{len(v)} (steps {', '.join(map(str, v))})" for p, v in sorted(missing.items(), key=lambda kv: -len(kv[1]))))
    disc: dict[str, list[int]] = {}
    for r in rows:
        for p in r["score"].get("discouraged_present", []):
            disc.setdefault(p, []).append(r["step"])
    if disc:
        w("- **discouraged panels most often present**: " + "; ".join(f"{p} ×{len(v)} (steps {', '.join(map(str, v))})" for p, v in sorted(disc.items(), key=lambda kv: -len(kv[1]))))
    notes: dict[str, int] = {}
    for r in rows:
        for n in r["score"].get("notes", []):
            tag = n.split(":")[0][:70] if "failed" in n or "skipped" in n else (n[:48] + "…" if len(n) > 48 else n)
            notes[tag] = notes.get(tag, 0) + 1
    fallback = [r["step"] for r in rows if r["score"].get("models") and len(set(r["score"]["models"])) > 1]
    if notes:
        w("- **pipeline notes**: " + "; ".join(f"{n} ×{c}" for n, c in sorted(notes.items(), key=lambda kv: -kv[1])))
    if fallback:
        w(f"- **fallback model used** on steps {', '.join(map(str, fallback))}")
    w("")

    fixes = EVAL / "fixes.md"
    if baseline:
        L.extend(compare(baseline, rows, keys))
    elif meta.get("variant") or meta.get("label"):
        pass
    elif fixes.exists():
        w(fixes.read_text().rstrip() + "\n")
    if not baseline and not meta.get("variant") and not meta.get("label") and not fixes.exists():
        w("## Top fixes\n\n_Not written yet (eval/fixes.md)._\n")
    return "\n".join(L)


# --- main --------------------------------------------------------------------------------------------

def read_rows(path: Path) -> list[dict]:
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def write_rows(path: Path, rows: list[dict]) -> None:
    path.write_text("".join(json.dumps(r) + "\n" for r in sorted(rows, key=lambda r: r["step"])))


def combine(labels: list[str], args) -> int:
    """report.md for several named passes of the current code, side by side with the baseline."""
    scen_path, key_path = find_input("scenario", args.scenario), find_input("key", args.key)
    keys = load_key(key_path)
    def load(path: Path) -> list[dict]:
        return [{**r, "score": score(r, keys[r["incident_id"]])} for r in read_rows(path)]
    base = load(BASELINE)
    passes = {lab: load(EVAL / f"results-{lab}.jsonl") for lab in labels}
    if not base or not all(passes.values()):
        print("missing results for the baseline or a pass", file=sys.stderr)
        return 1
    cols = {"Baseline": base, **{f"Pass {lab.upper()}": rows for lab, rows in passes.items()}}
    sm = {name: summarize(rows, keys) for name, rows in cols.items()}
    hashes = {name: sorted({r["pipeline_hash"] for r in rows}) for name, rows in cols.items()}
    L: list[str] = []
    w = L.append
    w("# Nightfall eval report\n")
    w(f"Generated {datetime.now().strftime('%Y-%m-%d %H:%M')} · scenario `{scen_path.relative_to(ROOT) if scen_path.is_relative_to(ROOT) else scen_path}` · "
      f"answer key `{key_path.relative_to(ROOT) if key_path.is_relative_to(ROOT) else key_path}` · "
      + " · ".join(f"{n}: pipeline `{'/'.join(h)}`" for n, h in hashes.items()) + "\n")
    mixed = [n for n, h in hashes.items() if len(h) > 1]
    if mixed:
        w(f"**{', '.join(mixed)} mix pipeline versions: the code changed during the run.**\n")
    now = pipeline_hash()
    if now not in {h for hs in hashes.values() for h in hs}:
        w(f"The files on disk have changed since these runs (now `{now}`).\n")
    w("Dispatch is scored from `recommended_action` (observe = no dispatch). Nothing was sent to Discord or PagerDuty. Worker runs carry `PROOF_CONTEXT=eval` in the proof ledger.\n")
    names = list(cols)
    w("## Score\n")
    w("| | " + " | ".join(names) + " | Mean of passes |\n|---|" + "---|" * (len(names) + 1))
    pts = [sm[n]["points"] for n in names[1:]]
    w("| Points / " + f"{sm[names[0]]['points_max']:g} | " + " | ".join(f"{sm[n]['points']:.2f}" for n in names) + f" | {statistics.mean(pts):.2f} |")
    w("")
    w("## Metrics\n")
    w("| Metric | " + " | ".join(names) + " |\n|---|" + "---|" * len(names))
    def line(label, f):
        w(f"| {label} | " + " | ".join(f(sm[n]) for n in names) + " |")
    line("**Misses** (key says contain/evacuate, model observed)", lambda m: f"**{m['misses']}/{m['act_n']}**")
    line("False alarms (harmless step, model acts)", lambda m: f"{m['false_alarms']}/{m['harmless_n']}")
    line("Harmless handled calmly (observe, low banner, no discouraged panel)", lambda m: f"{m['harmless_calm']}/{m['harmless_n']}")
    line("Harmless with the `all_clear` cue", lambda m: f"{m['harmless_all_clear']}/{m['harmless_n']}")
    line("Over-escalations (real step the key wants watched, model acts)", lambda m: f"{m['over_escalations']}/{m['watch_n']}")
    line("Evacuate matches (key says evacuate)", lambda m: f"{m['confusion']['evacuate']['evacuate']}/{sum(m['confusion']['evacuate'].values())}")
    line("Action match", lambda m: f"{m['action_ok']}/{m['steps']}")
    line("Dispatch match", lambda m: f"{m['dispatch_ok']}/{m['steps']}")
    line("Hot sector match", lambda m: f"{m['hot_ok']}/{m['steps']}")
    line("Routed to the key's playbook (corporeal)", lambda m: f"{m['playbook_ok']}/{m['playbook_n']}")
    line("Intake severity copies the feed tier", lambda m: f"{m['tier_copied']}/{m['tier_n']}")
    line("Panel recall, mean", lambda m: f"{100 * m['recall_mean']:.0f}%")
    line("Steps with a discouraged panel", lambda m: f"{m['discouraged_steps']}/{m['steps']}")
    line("Distinct layouts (key expects %d)" % sm[names[0]]["key_distinct_sets"], lambda m: f"{m['distinct_sets']}")
    line("Failures", lambda m: f"{m['failed']}/{m['steps']}")
    def lat(label, key):
        w(f"| {label} | " + " | ".join(f"{sm[n]['latency'][key]:.1f}s" if key in sm[n].get("latency", {}) else "n/a" for n in names) + " |")
    lat("Latency per step, mean", "mean")
    lat("Latency per step, median", "median")
    lat("Latency per step, p95", "p95")
    lat("Latency per step, max", "max")
    lat("Time to the `incident` event (earliest thing the page could show)", "incident_s")
    lat("**Time to the first panel**, mean", "first_component_s")
    lat("Time to the first panel, p95", "first_component_p95")
    lat("Time to the first panel, max", "first_component_max")
    lat("Time to the last panel, mean", "last_component_s")
    w("")

    w("## Action confusion (rows = key, columns = model: observe / contain / evacuate)\n")
    w("| key | " + " | ".join(names) + " |\n|---|" + "---|" * len(names))
    for e in ACTS:
        w(f"| {e} | " + " | ".join(" / ".join(str(sm[n]["confusion"][e][p]) for p in ACTS) for n in names) + " |")
    w("")

    by_step = {n: {r["step"]: r for r in rows} for n, rows in cols.items()}
    w("## Per step\n")
    w("Cells are `action pts`. Δ panels: `-X` an expected panel missing, `!X` a discouraged one present. A `*` marks an action different from the key.\n")
    head = "| # | Truth | Key | Feed tier | " + " | ".join(f"{n} act pts" for n in names) + " | " + " | ".join(f"{n} Δ panels" for n in names[1:]) + " | Flip A/B |"
    w(head)
    w("|---|---|---|---|" + "---|" * (len(names) * 2))
    for step in sorted(by_step[names[0]]):
        key = keys[by_step[names[0]][step]["incident_id"]]
        cells, deltas = [], []
        for n in names:
            r = by_step[n].get(step)
            if not r:
                cells.append("–")
                continue
            sc = r["score"]
            cells.append("FAILED 0" if sc["failed"] else f"{sc['action']}{'' if sc['action_ok'] else '*'} {sc['total']:g}")
            if n != names[0]:
                deltas.append("FAILED" if sc["failed"] else (" ".join([f"-{p}" for p in sc["missing_panels"]] + [f"!{p}" for p in sc["discouraged_present"]]) or "–"))
        pa = [by_step[n][step]["score"].get("action") for n in names[1:] if step in by_step[n]]
        flip = "flip" if len(set(pa)) > 1 else ""
        w(f"| {step} | {key['truth'][0].upper()} | {key['expected_action']}{' (D)' if key['discord_dispatch'] else ''} | {key['severity_tier_in_input']} | " + " | ".join(cells) + " | " + " | ".join(deltas) + f" | {flip} |")
    w("")

    w("## Where the points went\n")
    w("| Criterion | " + " | ".join(names) + " |\n|---|" + "---|" * len(names))
    for c in CRITERIA:
        w(f"| {c} | " + " | ".join(f"{sum(1 - r['score']['points'][c] for r in cols[n]):.2f}" for n in names) + " |")
    w("")
    for n in names[1:]:
        rows = cols[n]
        miss = [r["step"] for r in rows if r["score"].get("miss")]
        fa = [r["step"] for r in rows if r["score"].get("false_alarm")]
        oe = [r["step"] for r in rows if r["score"].get("over_escalation")]
        mm = [r["step"] for r in rows if r["score"].get("under_call") or r["score"].get("over_call")]
        dis: dict[str, list[int]] = {}
        for r in rows:
            for p in r["score"].get("discouraged_present", []):
                dis.setdefault(p, []).append(r["step"])
        notes: dict[str, int] = {}
        for r in rows:
            for note in r["score"].get("notes", []):
                notes[note[:80]] = notes.get(note[:80], 0) + 1
        w(f"- **{n}**: misses {miss or 'none'}; false alarms {fa or 'none'}; over-escalations {oe or 'none'}; contain/evacuate mismatches {mm or 'none'}; "
          f"discouraged panels " + ("; ".join(f"{p} {v}" for p, v in dis.items()) or "none") + "; pipeline notes " + ("; ".join(f"{k} ×{v}" for k, v in notes.items()) or "none"))
    w("")
    fixes = EVAL / "fixes.md"
    if fixes.exists():
        w(fixes.read_text().rstrip() + "\n")
    for name in ("report-guards.md", "report-guards-live.md"):  # the guard-variant experiments, appended when they exist
        part = EVAL / name
        if part.exists():
            w("\n---\n")
            w(part.read_text().replace("# Guard variants against the control", "# Part 2: guard variants against the control" + (" (live code)" if "live" in name else ""), 1).rstrip() + "\n")
    Path(args.report if args.report else EVAL / "report.md").write_text("\n".join(L))
    print(f"wrote {Path(args.report if args.report else EVAL / 'report.md').name}: " + "; ".join(f"{n} {sm[n]['points']:.2f}" for n in names))
    return 0



def compare_variants(spec: str, args) -> int:
    """report-<name>.md: variant passes against the control passes, e.g. --compare "a,b|v4a,v4b|v5a,v5b".

    The first group is the control. Each later group is one variant. Misses and false alarms are listed by step,
    with the fields a guard reads (`creature_countered`, `aftermath`) so a guard's firing can be checked."""
    keys = load_key(find_input("key", args.key))
    groups = [g.split(",") for g in spec.split("|")]
    def load(lab: str) -> list[dict]:
        return [{**r, "score": score(r, keys[r["incident_id"]])} for r in read_rows(EVAL / f"results-{lab}.jsonl")]
    cols = {lab: load(lab) for g in groups for lab in g}
    sm = {n: summarize(r, keys) for n, r in cols.items()}
    names = list(cols)
    L: list[str] = []
    w = L.append
    w("# Guard variants against the control\n")
    w(f"Generated {datetime.now().strftime('%Y-%m-%d %H:%M')}. Control = labels {', '.join(groups[0])} (pipeline `23b5233007`). "
      "Variants run on a frozen copy of that pipeline (`eval/snap-23b5233007`) with `PROOF_CONTEXT=eval`.\n")
    hashes = {n: sorted({r["base_hash"] if "base_hash" in r else r["pipeline_hash"] for r in rows}) for n, rows in cols.items()}
    w("Base pipeline hash per column: " + ", ".join(f"{n} `{'/'.join(h)}`" for n, h in hashes.items()) + "\n")
    w("## Metrics\n")
    w("| Metric | " + " | ".join(names) + " |\n|---|" + "---|" * len(names))
    def line(label, f):
        w(f"| {label} | " + " | ".join(f(sm[n]) for n in names) + " |")
    line("**Points / 144**", lambda m: f"**{m['points']:.2f}**")
    line("**Misses** (key contain/evacuate, model observed)", lambda m: f"**{m['misses']}/{m['act_n']}**")
    line("False alarms (harmless, acted)", lambda m: f"{m['false_alarms']}/{m['harmless_n']}")
    line("Harmless handled calmly", lambda m: f"{m['harmless_calm']}/{m['harmless_n']}")
    line("Over-escalations", lambda m: f"{m['over_escalations']}/{m['watch_n']}")
    line("Evacuate matches", lambda m: f"{m['confusion']['evacuate']['evacuate']}/4")
    line("Action match", lambda m: f"{m['action_ok']}/{m['steps']}")
    line("Dispatch match", lambda m: f"{m['dispatch_ok']}/{m['steps']}")
    line("Panel recall", lambda m: f"{100 * m['recall_mean']:.0f}%")
    line("Steps with a discouraged panel", lambda m: f"{m['discouraged_steps']}/{m['steps']}")
    line("Failures", lambda m: f"{m['failed']}")
    w("")
    w("## Mean points per group\n")
    w("| Group | Passes | Mean points | Delta to control | Misses per pass |\n|---|---|---|---|---|")
    ctrl = statistics.mean(sm[l]["points"] for l in groups[0])
    for g in groups:
        mean = statistics.mean(sm[l]["points"] for l in g)
        w(f"| {'control' if g is groups[0] else g[0].rstrip('ab')} | {', '.join(f'{sm[l]['points']:.2f}' for l in g)} | {mean:.2f} | {mean - ctrl:+.2f} | "
          + ", ".join(f"{sm[l]['misses']}/14" for l in g) + " |")
    w("")
    w("## Steps that differ\n")
    by = {n: {r["step"]: r for r in rows} for n, rows in cols.items()}
    w("Cells are `action points`; `*` marks an action different from the key.\n")
    w("| # | Truth | Key | " + " | ".join(names) + " |\n|---|---|---|" + "---|" * len(names))
    for step in range(1, 25):
        cells, acts = [], set()
        for n in names:
            r = by[n].get(step)
            sc = r["score"] if r else None
            acts.add(sc.get("action") if sc and not sc["failed"] else "FAILED")
            cells.append("–" if not sc else ("FAILED" if sc["failed"] else f"{sc['action']}{'' if sc['action_ok'] else '*'} {sc['total']:g}"))
        pts = {by[n][step]["score"]["total"] for n in names if step in by[n]}
        if len(acts) > 1 or len(pts) > 1:
            k = keys[next(iter(by[names[0]].values()))["incident_id"][:-2] + f"{step:02d}"]
            w(f"| {step} | {k['truth'][0].upper()} | {k['expected_action']} | " + " | ".join(cells) + " |")
    w("")
    w("## What the guards saw\n")
    for n in names:
        rows = cols[n]
        inc = lambda r: r["state"]["incident"] if r.get("ok") else {}
        counter = [(r["step"], r["score"]["truth"][0].upper()) for r in rows if inc(r).get("creature_countered")]
        after = [(r["step"], r["score"]["truth"][0].upper()) for r in rows if inc(r).get("aftermath")]
        notes = [r["step"] for r in rows if r.get("ok") and any("aftermath" in x for x in r["state"]["notes"])]
        if any("creature_countered" in inc(r) for r in rows):
            w(f"- **{n}**: `creature_countered` true on {', '.join(f'{s}({t})' for s, t in counter) or 'none'}"
              + (f"; `aftermath` true on {', '.join(f'{s}({t})' for s, t in after) or 'none'}; aftermath rule fired on {notes or 'none'}" if any('aftermath' in inc(r) for r in rows) else "")
              + f"; misses at {[r['step'] for r in rows if r['score'].get('miss')] or 'none'}; false alarms at {[r['step'] for r in rows if r['score'].get('false_alarm')] or 'none'}")
        else:
            w(f"- **{n}** (control): misses at {[r['step'] for r in rows if r['score'].get('miss')] or 'none'}; false alarms at {[r['step'] for r in rows if r['score'].get('false_alarm')] or 'none'}")
    w("")
    out = Path(args.report) if args.report else EVAL / "report-guards.md"
    notes_file = EVAL / "guards-fixes.md"
    if notes_file.exists() and "live" not in out.name:
        w(notes_file.read_text().rstrip() + "\n")
    out.write_text("\n".join(L))
    print(f"wrote {out.name}: " + "; ".join(f"{n} {sm[n]['points']:.2f} ({sm[n]['misses']} miss)" for n in names))
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--steps", help='steps to run, e.g. "1-5" or "1,4,7-9" (default: all)')
    ap.add_argument("--workers", type=int, default=1, help="steps in parallel (default 1; Parasail uses the event key)")
    ap.add_argument("--timeout", type=float, default=150, help="seconds before a step is killed and counted as failed")
    ap.add_argument("--no-sky", action="store_true", help="do not add the scenario sky (the server adds it for every scenario step)")
    ap.add_argument("--resume", action="store_true", help="keep rows in results.jsonl that succeeded on the pipeline now on disk; run the rest")
    ap.add_argument("--report-only", action="store_true", help="re-score results.jsonl and rewrite report.md; no pipeline runs")
    ap.add_argument("--scenario", help="scenario.json (default: fixtures/ copy, else scenarios/pitches/nightfall)")
    ap.add_argument("--key", help="answer-key.json (default: fixtures/ copy, else scenarios/pitches/nightfall)")
    ap.add_argument("--label", help="name this run: results-<label>.jsonl, report-<label>.md, raw/ and logs/ files tagged -<label>")
    ap.add_argument("--compare", help='labels as "ctrl_a,ctrl_b|v4a,v4b|v5a,v5b": variant passes against the control; writes report-guards.md')
    ap.add_argument("--combine", help="comma-separated labels (a,b): rewrite report.md from their results, against eval/baseline/; no pipeline runs")
    ap.add_argument("--snapshot", help="a frozen copy of the pipeline (eval/snap-<hash>/) for the worker to import; needs --variant")
    ap.add_argument("--variant", help="run eval/variants/<name>.py's in-memory changes instead of the pipeline as it is")
    ap.add_argument("--results", help="default eval/results.jsonl, or results-<variant>.jsonl")
    ap.add_argument("--report", help="default eval/report.md, or report-<variant>.md")
    args = ap.parse_args()
    suffix = f"-{args.label or args.variant}" if (args.label or args.variant) else ""
    if args.combine:
        return combine(args.combine.split(","), args)
    if args.compare:
        return compare_variants(args.compare, args)
    args.results = args.results or str(EVAL / f"results{suffix}.jsonl")
    args.report = args.report or str(EVAL / f"report{suffix}.md")

    scen_path, key_path = find_input("scenario", args.scenario), find_input("key", args.key)
    ticks, keys = load_scenario(scen_path), load_key(key_path)
    wanted = parse_steps(args.steps, len(ticks))
    results = Path(args.results)
    old = {r["step"]: r for r in read_rows(results)}
    snapshot = Path(args.snapshot).resolve() if args.snapshot else None
    hashes = [pipeline_hash(args.variant, snapshot)]

    if not args.report_only:
        todo = [t for t in ticks if t["step"] in wanted]
        if args.resume:
            # A row is kept only if it succeeded on the pipeline that is on disk now.
            fresh = lambda r: r.get("ok") and r.get("pipeline_hash") == hashes[0] and r.get("sky") == (not args.no_sky)
            todo = [t for t in todo if not fresh(old.get(t["step"]) or {})]
            keep = {s: r for s, r in old.items() if s in wanted and fresh(r)}
        else:
            keep = {}
        # A fresh run replaces only the selected steps; rows for other steps stay (use --steps to extend a run).
        rows_by_step = {s: r for s, r in old.items() if s not in wanted} | keep
        print(f"scenario {scen_path.relative_to(ROOT) if scen_path.is_relative_to(ROOT) else scen_path}, key {key_path.name}; "
              f"{len(todo)} step(s) to run, {args.workers} worker(s), timeout {args.timeout:.0f}s, pipeline {hashes[0]}", flush=True)
        skies = None if args.no_sky else load_skies(scen_path)
        lock = threading.Lock()

        def job(t: dict) -> None:
            row = run_step(t, args.timeout, (skies or {}).get(t["incident_id"]), args.variant, args.label, snapshot)
            row["score"] = score(row, keys[t["incident_id"]])
            with lock:
                rows_by_step[t["step"]] = row
                write_rows(results, list(rows_by_step.values()))  # a crash keeps every finished step
                s = row["score"]
                state = "FAILED: " + str(row.get("error")) if s["failed"] else \
                    f"{s['action']:<8} exp {s['expected_action']:<8} hot {s['hot']} {tick(s['hot_ok'])} panels {','.join(s['panels'])}"
                print(f"step {t['step']:>2} {row['latency_s']:6.1f}s  {s['total']:g}/{s['max']:g}  {state}", flush=True)

        with cf.ThreadPoolExecutor(max_workers=max(1, args.workers)) as pool:
            list(pool.map(job, todo))
        old = rows_by_step
        hashes.append(pipeline_hash(args.variant, snapshot))

    rows = []
    for s in sorted(old):
        r = old[s]
        r["score"] = score(r, keys[r["incident_id"]])  # re-score so a scoring change needs no model calls
        rows.append(r)
    if not rows:
        print("no results yet", file=sys.stderr)
        return 1
    write_rows(results, rows)
    run_hashes = sorted({r["pipeline_hash"] for r in rows} | (set() if args.report_only else set(hashes)))
    disk_now = pipeline_hash(args.variant, snapshot)
    meta = {"variant": args.variant, "label": args.label, "generated": datetime.now().strftime("%Y-%m-%d %H:%M"), "hash": run_hashes[-1], "hashes": run_hashes,
            "disk_changed": None if args.variant or disk_now in run_hashes else disk_now,
            "sky": all(r.get("sky") for r in rows), "scenario": str(scen_path.relative_to(ROOT)) if scen_path.is_relative_to(ROOT) else str(scen_path),
            "key": str(key_path.relative_to(ROOT)) if key_path.is_relative_to(ROOT) else str(key_path)}
    base = None
    if (args.variant or args.label) and BASELINE.exists():
        base = [{**r, "score": score(r, keys[r["incident_id"]])} for r in read_rows(BASELINE)]
    Path(args.report).write_text(render(rows, keys, meta, base))
    s = summarize(rows, keys)
    print(f"\n{s['points']:g}/{s['points_max']:g} points, {s['failed']} failed; wrote {Path(args.results).name} and {Path(args.report).name}")
    if len(meta["hashes"]) > 1:
        print("warning: the pipeline changed while rows were collected; re-run (--resume reruns the stale steps) for a consistent report", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
