"""Worker for variant runs: the pipeline's own entry point, with a variant's changes applied in memory.

    .venv/bin/python eval/worker.py v3        (reads one incident on stdin, like `python -m pipeline`)

Nothing under pipeline/ is edited. eval/variants/<name>.py defines apply(flow, library), which swaps prompts,
schemas or functions on the imported modules before the flow runs. Used by `eval/run.py --variant <name>`.
"""
import importlib.util
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))  # the repo root, so `pipeline` imports

from pipeline import __main__ as entry  # noqa: E402 - importing it keeps stdout for events, as `python -m pipeline` does
from pipeline import flow, library  # noqa: E402

spec = importlib.util.spec_from_file_location("variant", Path(__file__).parent / "variants" / f"{sys.argv[1]}.py")
variant = importlib.util.module_from_spec(spec)
spec.loader.exec_module(variant)
variant.apply(flow, library)
sys.exit(entry.main())
