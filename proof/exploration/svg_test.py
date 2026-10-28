"""Ask several Parasail models to draw the same SVG icon, then save each one for a visual check."""
import os
import re
import sys
import time
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv(sys.argv[1])
out = Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
client = OpenAI(base_url="https://api.parasail.io/v1", api_key=os.environ["PARASAIL_API_KEY"])

MODELS = ["parasail-glm-53", "parasail-qwen3-coder-next", "parasail-deepseek-v41-flash", "parasail-minimax-m31-flash"]
PROMPT = """Draw an SVG icon of a banshee: the Irish wailing spirit, a gaunt woman in a hooded grey shroud,
long pale hair streaming, mouth open in a keening wail, eyes red from weeping, a faint mist around her.
Style: flat vector illustration for a dark "haunted command station" dashboard.
Canvas: viewBox="0 0 256 256", background rect #14101f.
Palette: #e8e4f0 (pale), #8f86a8 (shroud), #c0392b (eyes), #6ee7b7 (spectral glow), with opacity for mist.
Rules: no text, no <script>, no external references or images, no foreignObject. Under 6 KB.
Reply with only the SVG markup."""

for model in MODELS:
    start = time.time()
    try:
        reply = client.chat.completions.create(
            model=model, messages=[{"role": "user", "content": PROMPT}], max_tokens=8000
        )
        text = reply.choices[0].message.content or ""
        match = re.search(r"<svg[\s\S]*?</svg>", text)
        if not match:
            print(f"{model:30} no <svg> in reply ({time.time() - start:.1f}s): {text[:120]!r}")
            continue
        svg = match.group(0)
        unsafe = re.search(r"<script|foreignObject|href=\"http|on\w+=", svg, re.I)
        path = out / f"{model}.svg"
        path.write_text(svg)
        print(f"{model:30} {len(svg)} bytes in {time.time() - start:.1f}s{'  UNSAFE CONTENT' if unsafe else ''} -> {path.name}")
    except Exception as e:
        print(f"{model:30} FAIL {str(e)[:150]}")
