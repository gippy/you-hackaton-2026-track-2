"""The model client: Parasail's OpenAI-compatible API at https://api.parasail.io/v1.

    client()     a plain OpenAI SDK client, for the flow's own streamed calls
    crew_llm()   a CrewAI LLM, for the Lore Researcher agent
    parse_json() a JSON object out of a model reply

The model must support tool (function) calling, because CrewAI agents call tools.
"""
from __future__ import annotations

import json
import os
import re

BASE_URL = "https://api.parasail.io/v1"


class ParasailError(RuntimeError):
    """A Parasail call failed. The message never contains the key."""


def api_key() -> str:
    key = (os.environ.get("PARASAIL_API_KEY") or "").strip()
    if not key:
        raise ParasailError("PARASAIL_API_KEY is empty. Get a key at https://www.saas.parasail.io/keys and put it in .env")
    return key


def crew_llm(model: str, **kwargs):
    """A CrewAI LLM on Parasail.

    - `provider="openai"` with the bare model id. With `model="openai/<id>"`, a model name CrewAI does not
      know goes to LiteLLM, which is not installed.
    """
    from crewai import LLM

    return LLM(model=model, provider="openai", base_url=BASE_URL, api_key=api_key(), temperature=0.2, **kwargs)


def client():
    import httpx
    from openai import OpenAI

    # 45 seconds without a byte ends a call, and nothing is retried here, so a stalled stream reaches
    # the caller's fallback model instead of waiting out the SDK's 10-minute default.
    return OpenAI(base_url=BASE_URL, api_key=api_key(), timeout=httpx.Timeout(45, connect=8), max_retries=0)


def parse_json(text: str) -> dict:
    """Parse a JSON object out of a reply, tolerating a ```json fence or text around it."""
    text = (text or "").strip()
    fence = re.search(r"```(?:json)?\s*(.*?)\s*```", text, re.S)
    if fence:
        text = fence.group(1)
    try:
        value = json.loads(text)
    except json.JSONDecodeError:
        start, end = text.find("{"), text.rfind("}")
        if start < 0 or end <= start:
            raise ParasailError(f"the model did not return JSON: {text[:200]!r}") from None
        try:
            value = json.loads(text[start:end + 1])
        except json.JSONDecodeError as exc:
            raise ParasailError(f"the model returned broken JSON: {text[:200]!r}") from exc
    if not isinstance(value, dict):
        raise ParasailError(f"expected a JSON object, got {type(value).__name__}")
    return value
