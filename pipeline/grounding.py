"""You.com grounding: the Search API, and the CrewAI tool the Lore Researcher calls.

Every hit the researcher sees is numbered once, in the order it was found, so the
manifest can cite sources by number and the page can link them.

No `from __future__ import annotations` here: CrewAI builds the tool's JSON schema
from real type hints.
"""
import os
import time
from typing import Callable

import httpx
from crewai.tools import BaseTool
from pydantic import BaseModel, Field, PrivateAttr

from . import proof

SEARCH_URL = "https://ydc-index.io/v1/search"


class YouError(RuntimeError):
    """A You.com call failed. The message never contains the key."""


def you_key() -> str:
    key = (os.environ.get("YDC_API_KEY") or os.environ.get("YOU_API_KEY") or "").strip()
    if not key:
        raise YouError("YDC_API_KEY is empty. Get a key at https://you.com/platform and put it in .env")
    return key


def search(query: str, count: int = 4) -> list[dict]:
    """Web results for a query: title, url, description and the best snippet."""
    t0 = time.monotonic()
    try:
        hits = _search(query, count)
    except YouError as exc:
        proof.record("partners", {"partner": "you.com", "action": "Search", "request": {"query": query, "count": count},
                                  "error": str(exc), "latency_ms": int((time.monotonic() - t0) * 1000)})
        raise
    proof.record("partners", {"partner": "you.com", "action": "Search", "request": {"query": query, "count": count},
                              "response": {"results": [{"title": h["title"], "url": h["url"]} for h in hits]},
                              "latency_ms": int((time.monotonic() - t0) * 1000)})
    return hits


def _search(query: str, count: int) -> list[dict]:
    for attempt in range(3):
        try:
            res = httpx.post(SEARCH_URL, headers={"X-API-Key": you_key()},
                             json={"query": query, "count": count}, timeout=30)
        except httpx.HTTPError as exc:
            raise YouError(f"could not reach You.com: {type(exc).__name__}") from exc
        if res.status_code == 429 and attempt < 2:
            time.sleep(2 * (attempt + 1))  # no rate-limit headers to trust; back off and retry a read
            continue
        if res.status_code != 200:
            raise YouError(f"You.com search answered {res.status_code}: {res.text[:200]}")
        break
    hits = (res.json().get("results") or {}).get("web") or []
    return [{"title": h.get("title", ""), "url": h["url"], "description": h.get("description", ""),
             "snippet": (h.get("snippets") or [""])[0]} for h in hits if h.get("url")][:count]


class Ledger:
    """The numbered sources of one run, shared by the tool and the flow."""

    def __init__(self, on_search: Callable[[str, list[dict]], None] = lambda q, hits: None):
        self.sources: list[dict] = []
        self.queries: list[str] = []
        self.on_search = on_search

    def add(self, query: str, hits: list[dict]) -> list[dict]:
        self.queries.append(query)
        known = {s["url"]: s for s in self.sources}
        numbered = []
        for hit in hits:
            if hit["url"] not in known:
                known[hit["url"]] = {**hit, "n": len(self.sources) + 1, "query": query}
                self.sources.append(known[hit["url"]])
            numbered.append(known[hit["url"]])
        self.on_search(query, numbered)
        return numbered


class SearchInput(BaseModel):
    query: str = Field(..., description="A focused web search query, under 12 words")


class YouSearchTool(BaseTool):
    name: str = "you_search"
    description: str = (
        "Search the live web with You.com. Returns numbered sources [n] with a title, URL and snippet. "
        "Cite sources by their number."
    )
    args_schema: type[BaseModel] = SearchInput
    _ledger: Ledger = PrivateAttr()

    def __init__(self, ledger: Ledger, **kwargs):
        super().__init__(**kwargs)
        self._ledger = ledger

    def _run(self, query: str) -> str:
        try:
            hits = self._ledger.add(query, search(query))
        except YouError as exc:
            return f"Search failed: {exc}"
        if not hits:
            return "No results. Try different words."
        return "\n".join(f"[{h['n']}] {h['title']} ({h['url']})\n    {h['snippet'][:300]}" for h in hits)
