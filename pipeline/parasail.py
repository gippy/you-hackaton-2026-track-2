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
DEFAULT_MODEL = "parasail-kimi-k26"


class ParasailError(RuntimeError):
    """A Parasail call failed. The message never contains the key."""


def model_id() -> str:
    return (os.environ.get("PARASAIL_MODEL") or DEFAULT_MODEL).strip()


def api_key() -> str:
    key = (os.environ.get("PARASAIL_API_KEY") or "").strip()
    if not key:
        raise ParasailError("PARASAIL_API_KEY is empty. Get a key at https://www.saas.parasail.io/keys and put it in .env")
    return key


def base_url() -> str:
    return (os.environ.get("PARASAIL_BASE_URL") or BASE_URL).rstrip("/")


def redact(text: object) -> str:
    """`text` as a string, with the Parasail key replaced."""
    out = str(text)
    key = (os.environ.get("PARASAIL_API_KEY") or "").strip()
    if len(key) >= 8:
        out = out.replace(key, "<redacted>")
    return out


def crew_llm(temperature: float = 0.2, **kwargs):
    """A CrewAI LLM on Parasail, through CrewAI's native OpenAI-compatible client.

    `provider="openai"` with the bare model id, not `model="openai/<id>"`: in crewai 1.15.2 the
    prefix form only reaches the native client for model names CrewAI already knows (gpt-4o and
    friends). Any other name falls through to LiteLLM, which plain `crewai` does not install, and
    the constructor raises ImportError. With the prefix and `provider` together, the prefix is
    sent to Parasail as part of the model name.

    `context_window_size` tells CrewAI when to summarize a long conversation. It defaults to
    about 7k tokens for a model it does not know, which is far below what Parasail's models take.
    """
    from crewai import LLM

    window = int(os.environ.get("PARASAIL_CONTEXT_WINDOW") or 128000)
    llm = LLM(model=model_id(), provider="openai", base_url=base_url(), api_key=api_key(),
              temperature=temperature, **kwargs)
    # The native client reads its window from a table of OpenAI model names; pin ours instead.
    object.__setattr__(llm, "get_context_window_size", lambda: int(window * 0.85))
    return llm


def client():
    import httpx
    from openai import OpenAI

    # 45 seconds without a byte ends a call, and nothing is retried here, so a stalled stream reaches
    # the caller's fallback model instead of waiting out the SDK's 10-minute default.
    return OpenAI(base_url=base_url(), api_key=api_key(), timeout=httpx.Timeout(45, connect=8), max_retries=0)


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
