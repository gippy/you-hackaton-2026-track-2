"""Preflight for Hack with YOU: Halloween Edition.

Checks every partner and the scenario feed with read-only calls, then prints one line per check.
It never pulls a tick or submits a containment, so it does not touch your team's cursor or score.

Run it from the repo root:
    .venv/bin/python scripts/smoke_test.py
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import urllib.error
import urllib.request

from dotenv import load_dotenv

load_dotenv()

YOU_KEY = os.environ.get("YDC_API_KEY") or os.environ.get("YOU_API_KEY", "")
PARASAIL_KEY = os.environ.get("PARASAIL_API_KEY", "")
PARASAIL_MODEL = os.environ.get("PARASAIL_MODEL", "parasail-deepseek-v4-flash")
SCENARIO_MCP = os.environ.get("SCENARIO_MCP", "https://api.you.com/mcp/halloween-hack-26")


class Warn(Exception):
    """The check ran, but something needs attention before the build."""


def http(method: str, url: str, headers: dict, body: dict | None = None) -> tuple[int, dict, str]:
    data = json.dumps(body).encode() if body is not None else None
    # Cloudflare in front of the scenario feed blocks urllib's default "Python-urllib" user agent (error 1010).
    req = urllib.request.Request(url, data=data, method=method, headers={"User-Agent": "hack-with-you-smoke-test", **headers})
    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            return res.status, dict(res.headers), res.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), e.read().decode()


def check_python() -> str:
    version = sys.version_info[:2]
    if not (3, 10) <= version <= (3, 13):
        raise RuntimeError(f"Python {version[0]}.{version[1]}; CrewAI needs 3.10 to 3.13")
    import crewai

    return f"Python {version[0]}.{version[1]}, crewai {crewai.__version__}"


def check_you() -> str:
    if not YOU_KEY:
        raise RuntimeError("set YDC_API_KEY (or YOU_API_KEY)")
    status, _, text = http(
        "POST",
        "https://ydc-index.io/v1/search",
        {"X-API-Key": YOU_KEY, "Content-Type": "application/json"},
        {"query": "AWS Builder Loft San Francisco", "count": 1},
    )
    if status != 200:
        raise RuntimeError(f"HTTP {status}: {text[:200]}")
    hits = json.loads(text).get("results", {}).get("web", [])
    return f"{len(hits)} result(s)"


def check_parasail_models() -> str:
    if not PARASAIL_KEY:
        raise RuntimeError("set PARASAIL_API_KEY")
    status, _, text = http("GET", "https://api.parasail.io/v1/models", {"Authorization": f"Bearer {PARASAIL_KEY}"})
    if status != 200:
        raise RuntimeError(f"HTTP {status}: {text[:200]}")
    ids = {m["id"] for m in json.loads(text).get("data", [])}
    if PARASAIL_MODEL not in ids:
        raise RuntimeError(f"{PARASAIL_MODEL} is not in your model list")
    return f"{len(ids)} models, {PARASAIL_MODEL} listed"


def check_parasail_inference() -> str:
    status, _, text = http(
        "POST",
        "https://api.parasail.io/v1/chat/completions",
        {"Authorization": f"Bearer {PARASAIL_KEY}", "Content-Type": "application/json"},
        {"model": PARASAIL_MODEL, "messages": [{"role": "user", "content": "Reply with the word ok"}], "max_tokens": 5},
    )
    if status == 403 and "payment" in text.lower():
        raise RuntimeError("403: no credits yet. Redeem the event credits in the Parasail dashboard")
    if status != 200:
        raise RuntimeError(f"HTTP {status}: {text[:200]}")
    return "inference works"


def run_one(*args: str) -> dict | list:
    if not shutil.which("one"):
        raise RuntimeError("the One CLI is not installed (npm i -g @withone/cli)")
    out = subprocess.run(["one", "--agent", *args], capture_output=True, text=True, timeout=60)
    text = (out.stdout or out.stderr).strip()
    if "Node.js" in text and "requires" in text:
        raise RuntimeError("the One CLI refuses this Node version; it needs 24.22.1 or newer")
    parsed = json.loads(text)
    if isinstance(parsed, dict) and "error" in parsed:
        raise RuntimeError(parsed["error"])
    return parsed


def check_one_account() -> str:
    node = subprocess.run(["node", "--version"], capture_output=True, text=True).stdout.strip()
    who = run_one("whoami")
    return f"{who['user']['email']} ({who['env']}), Node {node}"


def check_one_discord() -> str:
    listing = run_one("list")
    connections = listing.get("connections", listing) if isinstance(listing, dict) else listing
    platforms = sorted({c.get("platform", "?") for c in connections})
    if "discord" not in platforms:
        raise Warn(f"no Discord connection yet (connected: {', '.join(platforms) or 'none'}). Run: one add discord")
    return f"Discord connected (all: {', '.join(platforms)})"


def mcp_call(method: str, params: dict) -> dict:
    status, _, text = http(
        "POST",
        SCENARIO_MCP,
        {"Content-Type": "application/json", "Accept": "application/json, text/event-stream"},
        {"jsonrpc": "2.0", "id": 1, "method": method, "params": params},
    )
    if status != 200:
        raise RuntimeError(f"HTTP {status}: {text[:200]}")
    # The feed answers as server-sent events: the JSON-RPC reply is on the "data:" line.
    for line in text.splitlines():
        if line.startswith("data: "):
            reply = json.loads(line[len("data: "):])
            if "error" in reply:
                raise RuntimeError(reply["error"])
            return reply["result"]
    return json.loads(text)["result"]


def check_scenario_feed() -> str:
    tools = sorted(t["name"] for t in mcp_call("tools/list", {})["tools"])
    expected = {"hack26-get-tick", "hack26-submit-containment", "hack26-get-scoreboard"}
    missing = expected - set(tools)
    if missing:
        raise RuntimeError(f"missing tools: {', '.join(sorted(missing))}")
    reply = mcp_call("tools/call", {"name": "hack26-list-scenarios", "arguments": {}})
    scenarios = json.loads(reply["content"][0]["text"])["scenarios"]
    summary = ", ".join(f"{s['name']} ({s['ticks']} ticks)" for s in scenarios)
    return f"{len(tools)} tools; scenarios: {summary}"


CHECKS = [
    ("Python and CrewAI", check_python),
    ("You.com search", check_you),
    ("Parasail models", check_parasail_models),
    ("Parasail inference", check_parasail_inference),
    ("One account", check_one_account),
    ("One Discord connection", check_one_discord),
    ("Scenario feed", check_scenario_feed),
]


def main() -> int:
    failed = 0
    for name, check in CHECKS:
        try:
            print(f"PASS  {name}: {check()}")
        except Warn as e:
            print(f"WARN  {name}: {e}")
        except Exception as e:
            failed += 1
            print(f"FAIL  {name}: {e}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
