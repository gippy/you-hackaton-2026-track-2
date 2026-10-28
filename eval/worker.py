"""Worker for variant runs: the pipeline's own entry point, with a variant's changes applied in memory.

    .venv/bin/python eval/worker.py v1        (reads one incident on stdin, like `python -m pipeline`)

Nothing under pipeline/ is edited. eval/variants/<name>.py defines apply(flow, library), which swaps prompts,
schemas or functions on the imported modules before the flow runs. Used by `eval/run.py --variant <name>`.
"""
import importlib.util
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
# EVAL_SNAPSHOT: a frozen copy of pipeline/, shared/, data/ and the art manifest (eval/snap-<hash>/), so a variant is
# compared against a control that cannot move while the build session edits the live tree. Keys still come from ROOT/.env.
SNAPSHOT = os.environ.get("EVAL_SNAPSHOT")
if SNAPSHOT:
    from dotenv import load_dotenv

    load_dotenv(ROOT / ".env")
sys.path.insert(0, str(Path(SNAPSHOT).resolve() if SNAPSHOT else ROOT))

from pipeline import __main__ as entry  # noqa: E402 - importing it keeps stdout for events, as `python -m pipeline` does
from pipeline import flow, library  # noqa: E402

spec = importlib.util.spec_from_file_location("variant", Path(__file__).parent / "variants" / f"{sys.argv[1]}.py")
variant = importlib.util.module_from_spec(spec)
spec.loader.exec_module(variant)
variant.apply(flow, library)
sys.exit(entry.main())
