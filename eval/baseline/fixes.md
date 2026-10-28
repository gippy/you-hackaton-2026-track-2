## Top 5 fixes, ranked by points recovered

Baseline: **114 / 144** (pipeline `d0f4cdd6fd`: SkyClock and the proof ledger are in, the later EntityCard and Nightfall-arsenal edits are not; 24 steps, 0 failures). 30 points were lost. Where they went: harmless steps 12.5, real-but-quiet steps (key says observe) 11.5, contain-vs-evacuate 4, the rest 2. The model contains on 21 of 24 steps and never once evacuates.

I tested the prompt and schema fixes without touching `pipeline/`: `eval/worker.py` applies `eval/variants/v1.py` and `v2.py` in memory and `--variant` scores them with the same harness. **v1 = 120.05, v2 = 120.95** (one sample each; the same step flips between runs, see "Noise"). Both wordings are general (no sector, name or step from the scenario) but were written after reading this scenario's failures, so treat the gains as in-sample until you check them on another pitch's scenario.

### 1. Judge before composing: a harmless gate at intake, enforced in code (+9.5 measured, pool 12.5)

Evidence. The five harmless steps scored 17.5/30. The model acts on 3 of 5 (steps 1, 8, 18) and handles 0 of 5 calmly (every one carries a discouraged panel). It reads the explanation and still contains: step 1's rationale says "costumed guest, warm-blooded IR" and then "re-seal the threshold with salt". Cause: nothing at intake asks "is this a threat?". The intake severity **equals the feed's tier label on 20 of 20 labelled steps**, so `CRITICAL_HAUNT` on the 4-second power sag (step 8) becomes a critical station. The compose prompt's calm rule is one sentence that names no panels.

Change (all in `pipeline/flow.py` and `pipeline/library.py`).
- `INCIDENT_SCHEMA` (flow.py:32): add before `severity`, in this order: `evidence_of_threat` (string), `ordinary_explanation` (string or null, "supported by the report's own evidence"), `verdict` (`real_threat` | `harmless` | `unclear`), `people_in_reach` (integer). Property order matters: the model fills them in order.
- `EXTRACT_SYSTEM` (flow.py:63): say the feed tier is a sensor guess that can be wrong in both directions and that severity comes from the evidence. See `CLASS_NEW` in `eval/variants/v1.py`.
- `COMPOSE_SYSTEM` (flow.py:72): replace the calm sentence with the rubric in `RUBRIC` (same file): harmless gets a low ThreatBanner, SourceLedger and at most one of ThermalReadout or SystemsBoard, `all_clear`, observe.
- `clean_manifest` (library.py:135): take the incident's verdict and, when it is `harmless`, force `observe` and `all_clear` and drop CountermeasurePicker, CivilianTracker and FloorPlan. Removes, never adds. This also makes the already-streamed components consistent, because the flow calls `clean_manifest` per component.

Measured (v1): harmless handled calmly 0/5 to 4/5, false alarms 3/5 to 1/5, `all_clear` cue 1/5 to 4/5, steps 1, 4, 11, 18 at 6/6. Still failing: step 8 (the model says `unclear`, not `harmless`, and contains).
Cost: step 16 (a real blackout, key says contain) was judged harmless and observed, -2.5. A harmless verdict needs an evidence rule that excludes "a person caused it": reject `harmless` when the report names an actor.

### 2. Observe for a real threat that is not acting yet (pool 11.5, +7.75 measured but -11.85 regressions, so net negative so far)

Evidence. Steps 2, 3, 6, 24 (and 7, which flips run to run) are real but the key says observe: a crate that is cold and knocking with nobody hurt, a walk-in with a miscalibrated gate, the stand-down. The model contains on 4 of 5. The compose prompt says only "recommended_action is contain, evacuate or observe" with no criteria.

What I tried (v2). Add `threat_state` (`inert` | `active` | `over`) to the intake and gate observe on it. It fixed 2, 3, 6, 7 (+7.75) and over-escalation fell 4/5 to 1/5. But the intake also called five real contain steps (9, 10, 14, 16, 23) `inert` or `over`, so misses went 0/14 to 5/14 (-11.85). A miss is worse than a false alarm on a safety board, so do not ship v2 as is.

Next experiment, not run. Make the gate asymmetric: observe only when `verdict` is harmless, or `threat_state` is inert **and** `people_in_reach` is 0 or the report names no creature acting. Set `temperature` to 0 for the intake call (flow.py:110 hard-codes 0.3). Feed the sky into the decision (the Nightfall plot is minutes to moonrise, which is already in `state.sky`). Re-run with `--variant` and accept it only if misses stay at 0/14.

### 3. Evacuate has no trigger (pool 4, +1.8 measured)

Evidence. Key says evacuate on steps 12, 19, 20, 21; the model says contain on all four, in every baseline run (0 evacuate calls in 24 steps). The reports say people are bitten or down (19, 20), a crowd surges to jammed doors (21), a subject walks among 61 people (12). The intake leaves `civilians.condition` as `unknown` on 17 of 24 steps, even when the text says "5 injured civilians at the foot of the stairs", because it records one condition for the whole room (158 people).

Change. Rubric line (in `RUBRIC`): evacuate when people are hurt, pinned or fleeing, or the threat is loose among a crowd. Schema: replace the single `civilians.condition` with `people_hurt` (integer) next to `people_in_reach`, so the rule has a number to read. Measured with the rubric alone: steps 20, 21 fixed in v1, step 21 in v2; 12 and 19 still contain because the model counts "no injuries yet" or "unclear". A code rule on `people_hurt > 0 and verdict != harmless` would likely cover 19 and 20; untested.

### 4. Two deterministic cleanups: nominal EMFGauge and sector landmarks (+3)

- EMFGauge on a normal reading, +2. Steps 2 and 5 show a gauge at 3 mG with `status: elevated`, although step 2's own report calls 3 mG normal, and the key discourages the gauge on both. The schema lets the model pick `threshold_mg` and `status`. In `clean_manifest`, drop an EMFGauge whose `value_mg` is at or below a normal ceiling (5 mG; the readings in this scenario are 2 to 3 normal and 11 for the one real spike, which the key expects). It costs nothing on the 24 steps: the only reading above 3 mG is step 8's 11 mG spike, the one step where the key expects the gauge. The prompt line "only when above normal" did not hold in v1 (the gauge stayed on 5 and 10), so do it in code.
- Sector landmarks, +1. Step 13 puts the SW stairwell landing in `network_closet`; the model also flips step 1 between `entrance` and `registration`. The sector list the intake sees is only `"entrance": "Entrance (525 Market)"`. Add landmarks to `shared/library.json` `sectors` ("lobby, security desk, street doors, SW stairwell exit").
- SourceLedger is missing on 4 steps (1, 2, 4, 18, -1.75 recall). Rule: "SourceLedger in every station" (in `RUBRIC`). Recall is 96% in v1; v2's 87% comes from its five misses, which also lose FloorPlan and CivilianTracker.

### 5. A hung Parasail stream blocks the demo (insurance: -6 on the step it hits)

Evidence. One of about 60 live runs (step 20, run 1) sat in `compose` for the whole 240 s timeout and produced nothing. `parasail.client()` (parasail.py:106) builds `OpenAI(...)` with the SDK default timeout of 600 s, and `chat_json` falls back to the second model only on an exception, so a stalled stream never reaches the fallback. `Station.runWorker` (station.ts:179) has no timeout either, so the page would wait on "Parasail is choosing and ordering components" and never replay the saved run.

Change. `OpenAI(base_url=..., api_key=..., timeout=httpx.Timeout(45, connect=8), max_retries=0)`; the fallback then runs as designed. And in `runWorker`, `setTimeout(() => child.kill(), 90_000)` so the existing "pipeline failed, replay the last saved run" path fires.

## Not scored, but a judge sees them

| What | Measured | Fix |
|---|---|---|
| Entity routed to the right playbook | **3/24** corporeal on every vampire and werewolf step (12 spectral, 9 anomalous). Salt rings and Faraday mesh are recommended against werewolves | The intake prompt lists no corporeal examples. `CLASS_NEW` in `variants/v1.py` raises it to 17/24 and 18/24. Better: map the entity name to its class in code |
| Opening sound | `sting_ghost` on 16 steps, `sting_vampire` 2, `sting_werewolf` 3, `sting_residual_haunting` 2; `all_clear` on 1 of 5 harmless | Follows from the class and verdict fixes (4/5 `all_clear` in v1). The cue is streamed from the model's raw text before `clean_manifest`, so overriding it in code must also happen in `on_text` |
| Time to first panel | 12.3 s on average; the page is blank until `ground` (CrewAI agent plus You.com, 7.7 s) finishes. The `incident` event arrives at 2 to 5 s | Render a provisional ThreatBanner and hot sector from the `incident` event; page-side only |
| No memory between steps | Step 12's "tall subject from the lounge" and step 16's "come right in" only read as a threat with the earlier steps in hand | Server passes the last N incident summaries into the worker payload. Unmeasured |
| Route and seal | Seal set exact 7/24, route set exact 0/24 (not scored: the key's routes are short and the prompt asks for a path to the entrance). Harmless step 4 gets a six-sector route | Needs a decision on what a route means before it can be scored |

## Noise

The same step flips between runs: across three runs the action differed on steps 1, 4, 7 and 18 (and step 20 hung once). The runs used slightly different pipeline versions, so this overstates it a little. Expect about ±3 points per run. The intake and compose calls both use temperature 0.3 with no seed. Compare variants over two runs, and set the decision call to 0.

## Hooks the harness would like (none needed for the numbers above)

- `pipeline/proof.py` writes to a hard-coded `proof/`. The eval's roughly 120 pipeline runs appended to `proof/parasail.jsonl` (323 lines now) and `proof/partners.jsonl` (251) under the same `sim-nightfall-NN` ids the demo uses, so they cannot be told apart from demo runs. A `PROOF_DIR` environment variable, read where `PROOF` is defined, would let the eval point elsewhere.
- Dispatch is inferred from `recommended_action`. A `dispatch: bool` in the manifest would make the key's `discord_dispatch` comparable without that assumption.
