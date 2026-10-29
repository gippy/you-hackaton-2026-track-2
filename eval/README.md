# Eval: scoring the command station against hand-written answer keys

This folder checks whether the pipeline builds the right command station for each incident. It plays every step
of a scenario through the real pipeline and scores each station against a hand-written answer key beside the
scenario in `fixtures/`. Nightfall (`fixtures/nightfall/`) is the main one; The Coffee Bar Phantom and Zombie Rush
are scored the same way.

The latest results, on the pipeline as it ships:

| Scenario | Points (of 144) | Misses | False alarms | Report |
|---|---|---|---|---|
| Nightfall | **134.86** (mean of two passes, up from 114 for the first version) | 0/14, 0/14 | 1/5, 0/5 | [report.md](report.md) |
| The Coffee Bar Phantom | 113.99 (one pass, before any tuning for it) | 0/11 | 1/5 | [report-phantom-c.md](report-phantom-c.md) |
| Zombie Rush | 108.22 (one pass, before any tuning for it) | 1/15 | 3/5 | [report-zombies-c.md](report-zombies-c.md) |

## What it measures

The key says, for every step, whether the incident is `real` or `harmless`, what the station should do (`observe`,
`contain` or `evacuate`), whether to dispatch, which sector is hot, and which panels it expects, allows or
discourages. The scenario has 19 real and 5 harmless steps. The key wants 10 observed, 10 contained and 4 evacuated.

Each step earns up to 6 points, one per criterion, so a perfect pass scores 144:

| Criterion | One point when |
|---|---|
| `action` | the station's `recommended_action` equals the key's action |
| `dispatch` | the station would dispatch (any action but `observe`) exactly when the key dispatches |
| `hot` | the FloorPlan's hot sector (or the intake's sector when there is no FloorPlan) is one of the key's hot sectors |
| `recall` | the share of the key's expected panels that the station shows (fractional) |
| `no_discouraged` | the station shows none of the key's discouraged panels |
| `no_failure` | the run finished with a non-empty manifest within the timeout |

The report also counts things that are not scored but tell what went wrong:

- **Misses**: the key says contain or evacuate and the station observes. On a safety board this is the worst mistake, so I accept a change only if misses do not go up.
- **False alarms**: a harmless step where the station acts.
- **Over-escalations**: a real step that the key wants watched, and the station acts.
- **Playbook routing**, **intake severity copying the feed tier**, layout variety, and latency up to the first and last panel.

## How a step runs

`run.py` runs each step the way the server does: `.venv/bin/python -m pipeline` from the repo root, one JSON
incident on stdin (raw text, incident id, feed tier and the sky), NDJSON events on stdout. The sky comes from the
server's own `server/sky.ts`, through `sky.ts` and Node.

- The answer key is read only after a step has finished. The worker sees nothing from it.
- The pipeline never dispatches (the server does, when the operator presses the button), so the eval cannot post to Discord or page anyone. "Would dispatch" is read from `recommended_action`.
- `PROOF_CONTEXT=eval` tags the eval's lines in the proof ledger, so they can be told apart from demo runs.
- `run.py` uses the standard library only.

## Running it

A full pass of 24 steps takes about 6 minutes and calls Parasail and You.com for every step. Run steps one at a
time (the default), so each step's memory of the earlier ones is complete.

```bash
PAGING=off PROOF_CONTEXT=eval .venv/bin/python eval/run.py --label e
PAGING=off PROOF_CONTEXT=eval .venv/bin/python eval/run.py --label zombies-x --no-sky \
    --scenario fixtures/zombies/scenario.json --key fixtures/zombies/answer-key.json
```

Only Nightfall gets a sky on the server, so the other scenarios run with `--no-sky`. Their reports have no
baseline column, because the baseline is a Nightfall pass.

| Command | What it does |
|---|---|
| `--label e` | a named pass: writes `results-e.jsonl` and `report-e.md`, compared with the baseline |
| `--steps 1-3` | only these steps (also `1,4,7-9`); rows for other steps stay in the results file |
| `--resume` | keep rows that succeeded on the pipeline now on disk, run only the rest |
| `--report-only` | re-score the results file and rewrite the report, with no model calls |
| `--combine e,f` | write `report.md` from several passes, side by side with the baseline |
| `--variant v4` | run `variants/v4.py`'s in-memory changes to the pipeline (through `worker.py`), without editing `pipeline/` |
| `--snapshot eval/snap-<hash>` | with `--variant`: run against a frozen copy of the pipeline, so the control cannot move while the code changes |
| `--compare "a,b\|v4a,v4b"` | variant passes against control passes: writes `report-guards.md` |

Each run also keeps the full flow state in `raw/` and the worker's stderr in `logs/`. Both folders, `cache/` and
`snap-*/` are gitignored.

## Reading a report

A one-pass report (`report-e.md`) has these sections:

1. **Score**: points out of 144.
2. **Metrics**: the scored criteria and the diagnostics above, plus latency.
3. **Action confusion**: rows are the key's action, columns are the station's.
4. **Per step**: one row per step. `✓`/`✗` mark matches. In "Δ panels", `-X` is an expected panel that is missing and `!X` a discouraged panel that is present.
5. **Where the points went**: points lost per criterion, and the steps behind each kind of mistake.
6. **Against the baseline**: the same metrics for `baseline/results.jsonl` on the same steps, and the steps that changed.

The combined [report.md](report.md) shows the baseline and every pass as columns. A `*` marks an action different
from the key. After the tables it appends my notes from [fixes.md](fixes.md) and the guard experiments
([report-guards.md](report-guards.md), [report-guards-live.md](report-guards-live.md)).

## What I found

All numbers are from the reports in this folder and in `archive/`.

| Pipeline | Passes | Points (of 144) | Misses | False alarms | Over-escalations |
|---|---|---|---|---|---|
| Baseline, first version | 1 | 114.00 | 0/14 | 3/5 | 4/5 |
| Prompt variants v1, v2 (not shipped) | 1 each | 120.05, 120.95 | 1/14, 5/14 | 1/5, 1/5 | 5/5, 1/5 |
| Harmless gate at intake, playbook routing in code, timeouts | A, B | 126.70, 127.50 | 1/14, 0/14 | 0/5, 1/5 | 4/5, 4/5 |
| + sky lead-time rule | live | 133.07 | 1/14 | 0/5 | 1/5 |
| + guard 1 | C, D | 134.17, 130.92 | 1/14, 2/14 | 0/5, 0/5 | 1/5, 1/5 |
| + panel clean-up | E, F | 132.30, 129.55 | 1/14, 1/14 | 1/5, 1/5 | 1/5, 1/5 |
| + generative features, operator moves, memory (first wording) | G, H | 132.50, 134.50 | 0/14, 0/14 | 1/5, 1/5 | 1/5, 1/5 |
| + memory (final wording, current) | I, J | 133.30, 136.42 | 0/14, 0/14 | 1/5, 0/5 | 1/5, 1/5 |

1. **The first version contained almost everything.** It contained 21 of 24 steps, never evacuated, and copied the feed's tier label into the intake severity on 20 of 20 labelled steps. A `CRITICAL_HAUNT` label on a 4-second power sag became a critical station. 30 points were lost: 12.5 on harmless steps, 11.5 on real steps the key wants watched, 4 on contain against evacuate. Details: [baseline/fixes.md](baseline/fixes.md).
2. **Judging harmless reports at intake, enforced in code, fixed the false alarms.** Harmless steps handled calmly went from 0/5 to 4 or 5 of 5 in every pass since, and the `all_clear` cue from 1/5 to 4 or 5 of 5. The feed tier is now copied on about half of the labelled steps instead of all of them.
3. **Watching while nightfall is hours away fixed the over-escalations.** When nobody is hurt and the next sky event is more than 100 minutes away, the station observes. Replaying the saved manifests of passes A and B through the rule gave +7 points each, and over-escalations fell from 4/5 to 1/5 with no new miss.
4. **Guard 1 keeps a creature held back by a countermeasure from being called harmless.** It fixed the step 23 miss (vampires held at the doors by UV and garlic): contained in 7 of 7 guarded passes. It never fired on a harmless step (0 of 35 samples) and cost no measurable points. It is in the pipeline now. Details: [guards-fixes.md](guards-fixes.md).
5. **Two attempts to observe the step 24 stand-down made misses worse**, so I rejected them: an `aftermath` boolean (8/14 misses) and an `ended_evidence` quote (9/14, then 1/14 and 3/14 after a fix). A three-way `threat_state` in the v2 prompt variant failed the same way (5/14).
6. **Memory across steps fixed the zombie misses, once its wording let a report clear itself.** Zombie Rush's later reports stop naming the creature ("the figures"), so the intake, reading each step alone, missed 3 of 15. Each step now reads what earlier steps found. The first wording ("a creature the earlier reports confirmed is never an ordinary explanation") cut zombie misses to 1/15 but raised false alarms to 4/5 on the phantom and 5/5 on the zombies. The final wording lets a report's own checks (a green badge read, a normal temperature) clear it, and scored best on all three: Nightfall 134.86, phantom 113.99 (from 107.10), zombies 108.22 (from 106.40). Passes `phantom-a`, `-b`, `zombies-a`, `-b` are in `archive/`.
7. **The station is a little slower.** Mean time to the first panel was 12.3 seconds at baseline and 10.7 to 11.7 in passes E and F; in passes I and J it is 13.6 and 14.4, because the intake now also quotes the report's evidence and the manifest carries titles, sizes, markers and quick actions.

What is still lost in passes I and J:

- **Steps 12 and 20** are contained where the key says evacuate, and **step 13 and 22** once evacuated where the key says contain. Contain against evacuate is the closest call the key makes.
- **Step 24** (the end-of-event debrief) is contained.
- **Step 8** (a harmless 4-second power sag with a `CRITICAL_HAUNT` label) is contained in one of the two passes.
- **Step 16**, the old coin flip, was contained in both.

**Noise.** The same code moves by about 1 to 3 points between passes (passes C and D differ by 3.25), and single
steps such as 8, 16, 20, 23 and 24 flip. So I compare changes over two passes and treat a difference under 3 points
as noise.

## Files

| Path | What it is |
|---|---|
| `run.py` | the harness: inputs, running a step, scoring, reports, CLI |
| `worker.py` | the pipeline's entry point with a variant applied in memory, used by `--variant` |
| `sky.ts` | computes each step's sky with the server's own code |
| `variants/` | the prompt and schema variants v1 to v6; each file's docstring says what it changes |
| `baseline/` | the first full pass (114 of 144): results, report and the first list of fixes. Every labelled report compares against it |
| `results-i.jsonl`, `results-j.jsonl`, `report-i.md`, `report-j.md` | the two Nightfall passes on the current pipeline |
| `report.md` | baseline, pass I and pass J side by side, with my notes |
| `results-phantom-c.jsonl`, `report-phantom-c.md`, `results-zombies-c.jsonl`, `report-zombies-c.md` | one pass each of the other two scenarios on the current pipeline, with no sky (as the server runs them) |
| `fixes.md` | my notes after passes A and B: what landed, the next three fixes, what I rejected, noise |
| `guards-fixes.md`, `report-guards.md`, `report-guards-live.md` | the guard experiments (v4 to v6) against the control, and the verdict on each |

`archive/` keeps the superseded runs, each as a `results-*.jsonl` and a `report-*.md`:

- `v1`, `v2`, `probe`: the first prompt variants, and a probe of a larger intake model (`v3`) on six steps.
- `run1-mixed-pipeline`, `run2-mixed-pipeline`: early passes where the code changed mid-run, so their rows mix pipeline versions.
- `a`, `b`: passes on the pipeline with the harmless gate. They are the control for the guard experiments.
- `live`, `v4live`: the control and guard 1 on the code with the sky lead-time rule.
- `v4a`, `v4b`, `v5a`, `v6a`, `v6b`, `v6c`: the guard variant passes summarized in `report-guards.md`.
- `c`, `d`: the two passes with guard 1, before the panel clean-up.
- `s16-1` to `s16-3`: step 16 alone, three times, on the code of passes C and D.
- `e`, `f`: the passes after the panel clean-up. `g`, `h`: with the generative features and the first memory wording.
- `phantom-a`, `zombies-a`: the other scenarios before memory; `phantom-b`, `zombies-b`: with the first memory wording.
- `guard1.patch`: guard 1 as it was tested; it is now part of `pipeline/`.

To re-score or combine an archived pass, copy its results file back into `eval/` first: `--combine`,
`--compare` and `--label` read `eval/results-<label>.jsonl`.
