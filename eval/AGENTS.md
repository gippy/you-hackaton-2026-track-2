# eval/

Scores the pipeline against hand-written answer keys. Start with `README.md`.

## Entry points

- `run.py`: plays a scenario's steps through `.venv/bin/python -m pipeline`, then scores each station. Standard library only.
- `worker.py`: the pipeline entry point with a variant's in-memory prompt changes (`variants/`).
- `sky.ts`: the sky for each step of a scenario marked with `sky`, computed with `server/sky.ts`.
- `baseline/`: control results that every Nightfall report compares against. `archive/`: older passes, the guard experiments and their variants.

```bash
PAGING=off PROOF_CONTEXT=eval .venv/bin/python eval/run.py --label mine --steps 1,21
PAGING=off PROOF_CONTEXT=eval .venv/bin/python eval/run.py --label mine --scenario fixtures/phantom/scenario.json --key fixtures/phantom/answer-key.json
```

## Invariants

- The answer key is read only after a step has finished. The worker never sees it.
- Always run with `PAGING=off` and `PROOF_CONTEXT=eval`.
- Every run needs `--label` (or `--variant`). It writes `results-<label>.jsonl` and `report-<label>.md` here, plus `raw/` and `logs/` (gitignored). Delete scratch runs before committing.
- Accept a prompt change only if the score holds and misses do not go up.
