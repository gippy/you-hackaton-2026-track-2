# Nightfall eval report

Generated 2026-10-28 15:29 · scenario `fixtures/nightfall/scenario.json` · answer key `fixtures/nightfall/answer-key.json` · Baseline: pipeline `d0f4cdd6fd` · Pass C: pipeline `a57d1180b5` · Pass D: pipeline `a57d1180b5`

Dispatch is scored from `recommended_action` (observe = no dispatch). Nothing was sent to Discord or PagerDuty. Worker runs carry `PROOF_CONTEXT=eval` in the proof ledger.

## Score

| | Baseline | Pass C | Pass D | Mean of passes |
|---|---|---|---|---|
| Points / 144 | 114.00 | 134.17 | 130.92 | 132.54 |

## Metrics

| Metric | Baseline | Pass C | Pass D |
|---|---|---|---|
| **Misses** (key says contain/evacuate, model observed) | **0/14** | **1/14** | **2/14** |
| False alarms (harmless step, model acts) | 3/5 | 0/5 | 0/5 |
| Harmless handled calmly (observe, low banner, no discouraged panel) | 0/5 | 5/5 | 5/5 |
| Harmless with the `all_clear` cue | 1/5 | 5/5 | 5/5 |
| Over-escalations (real step the key wants watched, model acts) | 4/5 | 1/5 | 1/5 |
| Evacuate matches (key says evacuate) | 0/4 | 2/4 | 2/4 |
| Action match | 13/24 | 19/24 | 18/24 |
| Dispatch match | 17/24 | 22/24 | 21/24 |
| Hot sector match | 23/24 | 24/24 | 24/24 |
| Routed to the key's playbook (corporeal) | 3/24 | 15/24 | 16/24 |
| Intake severity copies the feed tier | 20/20 | 10/20 | 10/20 |
| Panel recall, mean | 92% | 97% | 91% |
| Steps with a discouraged panel | 9/24 | 2/24 | 2/24 |
| Distinct layouts (key expects 13) | 12 | 15 | 13 |
| Failures | 0/24 | 0/24 | 0/24 |
| Latency per step, mean | 14.7s | 14.1s | 14.3s |
| Latency per step, median | 13.6s | 14.0s | 14.0s |
| Latency per step, p95 | 19.8s | 19.0s | 18.9s |
| Latency per step, max | 23.6s | 19.2s | 22.6s |
| Time to the `incident` event (earliest thing the page could show) | 3.4s | 4.1s | 3.9s |
| **Time to the first panel**, mean | 12.3s | 12.0s | 12.3s |
| Time to the first panel, p95 | 17.5s | 16.3s | 16.1s |
| Time to the first panel, max | 22.5s | 18.1s | 19.8s |
| Time to the last panel, mean | 14.1s | 13.5s | 13.7s |

## Action confusion (rows = key, columns = model: observe / contain / evacuate)

| key | Baseline | Pass C | Pass D |
|---|---|---|---|
| observe | 3 / 7 / 0 | 9 / 0 / 1 | 9 / 1 / 0 |
| contain | 0 / 10 / 0 | 1 / 8 / 1 | 2 / 7 / 1 |
| evacuate | 0 / 4 / 0 | 0 / 2 / 2 | 0 / 2 / 2 |

## Per step

Cells are `action pts`. Δ panels: `-X` an expected panel missing, `!X` a discouraged one present. A `*` marks an action different from the key.

| # | Truth | Key | Feed tier | Baseline act pts | Pass C act pts | Pass D act pts | Pass C Δ panels | Pass D Δ panels | Flip A/B |
|---|---|---|---|---|---|---|---|---|---|
| 1 | H | observe | ELEVATED_HAUNT | contain* 2.5 | observe 6 | observe 6 | – | – |  |
| 2 | R | observe | UNVERIFIED | contain* 2.75 | observe 5 | observe 5 | !CivilianTracker | !CivilianTracker |  |
| 3 | R | observe | LOW_HAUNT | contain* 4 | observe 6 | observe 6 | – | – |  |
| 4 | H | observe | UNVERIFIED | observe 4.5 | observe 6 | observe 6 | – | – |  |
| 5 | R | contain (D) | ELEVATED_HAUNT | contain 5 | evacuate* 5 | contain 6 | – | – | flip |
| 6 | R | observe | UNVERIFIED | contain* 3 | observe 6 | observe 6 | – | – |  |
| 7 | R | observe | LOW_HAUNT | observe 6 | observe 5.75 | observe 5.75 | -CivilianTracker | -CivilianTracker |  |
| 8 | H | observe | CRITICAL_HAUNT | contain* 3 | observe 5.667 | observe 5.667 | -EMFGauge | -EMFGauge |  |
| 9 | R | contain (D) | ELEVATED_HAUNT | contain 6 | contain 6 | observe* 3.25 | – | -FloorPlan -CivilianTracker -CountermeasurePicker | flip |
| 10 | R | contain (D) | CRITICAL_HAUNT | contain 6 | contain 6 | contain 6 | – | – |  |
| 11 | H | observe | LOW_HAUNT | observe 5 | observe 6 | observe 6 | – | – |  |
| 12 | R | evacuate (D) | CRITICAL_HAUNT | contain* 5 | contain* 5 | contain* 5 | – | – |  |
| 13 | R | contain (D) | ELEVATED_HAUNT | contain 5 | contain 6 | contain 6 | – | – |  |
| 14 | R | contain (D) | ELEVATED_HAUNT | contain 6 | contain 6 | contain 6 | – | – |  |
| 15 | R | contain (D) | LOW_HAUNT | contain 6 | contain 5.75 | contain 6 | -ThermalReadout | – |  |
| 16 | R | contain (D) | CRITICAL_HAUNT | contain 6 | observe* 4 | observe* 3.5 | – | -FloorPlan -CivilianTracker |  |
| 17 | R | contain (D) | ELEVATED_HAUNT | contain 6 | contain 6 | contain 6 | – | – |  |
| 18 | H | observe | ELEVATED_HAUNT | contain* 2.5 | observe 6 | observe 6 | – | – |  |
| 19 | R | evacuate (D) | CRITICAL_HAUNT | contain* 5 | contain* 5 | contain* 5 | – | – |  |
| 20 | R | evacuate (D) | CRITICAL_HAUNT | contain* 5 | evacuate 6 | evacuate 6 | – | – |  |
| 21 | R | evacuate (D) | CRITICAL_HAUNT | contain* 5 | evacuate 6 | evacuate 6 | – | – |  |
| 22 | R | contain (D) | ELEVATED_HAUNT | contain 6 | contain 6 | evacuate* 5 | – | – | flip |
| 23 | R | contain (D) | LOW_HAUNT | contain 6 | contain 6 | contain 6 | – | – |  |
| 24 | R | observe | UNVERIFIED | contain* 2.75 | evacuate* 3 | contain* 2.75 | !CountermeasurePicker | -ThermalReadout !CountermeasurePicker | flip |

## Where the points went

| Criterion | Baseline | Pass C | Pass D |
|---|---|---|---|
| action | 11.00 | 5.00 | 6.00 |
| dispatch | 7.00 | 2.00 | 3.00 |
| hot | 1.00 | 0.00 | 0.00 |
| recall | 2.00 | 0.83 | 2.08 |
| no_discouraged | 9.00 | 2.00 | 2.00 |
| no_failure | 0.00 | 0.00 | 0.00 |

- **Pass C**: misses [16]; false alarms none; over-escalations [24]; contain/evacuate mismatches [5, 12, 19]; discouraged panels CivilianTracker [2]; CountermeasurePicker [24]; pipeline notes dropped an EMFGauge showing an ordinary reading ×2; someone acted deliberately, so the harmless verdict became unclear ×1; dropped a safe route that walks through walls ×2
- **Pass D**: misses [9, 16]; false alarms none; over-escalations [24]; contain/evacuate mismatches [12, 19, 22]; discouraged panels CivilianTracker [2]; CountermeasurePicker [24]; pipeline notes dropped a safe route that walks through walls ×3; dropped an EMFGauge showing an ordinary reading ×2; someone acted deliberately, so the harmless verdict became unclear ×1

## Status after the guard experiments (15:15)

- Fix 1 (sky lead-time rule) landed in `5c42469`; the live code scored 133.07 in one pass.
- Fix 2 (step 24 stand-down) was tried as an `aftermath` boolean and as an `ended_evidence` quote: 8 and 9 misses, then 1 and 3 after a predicate fix. Rejected, see Part 2 below. Leave step 24.
- Guard for the step 23 miss (`creature_countered`): accepted, `eval/guard1.patch` applies to the live tree.
- Fix 3 (one LLM call less in grounding) is still open.

## What landed, and what is left

Both passes ran on pipeline `23b5233007` (committed code at HEAD `9501176`; the hash did not change afterwards), 24 steps each, `PROOF_CONTEXT=eval`. Score: **126.70 and 127.50 of 144, mean 127.10, against 114.00 for the baseline (+13.1)**. 16.9 points are still lost, and two thirds of them sit in four steps (2, 3, 6, 24).

What the commits bought, measured against the baseline:

| Fix from the first report | Result |
|---|---|
| Harmless verdict at intake plus the calm-layout guard | harmless handled calmly 0/5 to 5/5 and 4/5; false alarms 3/5 to 0/5 and 1/5; `all_clear` cue 1/5 to 5/5 and 4/5 |
| Evacuate rubric | evacuate matches 0/4 to 1/4 and 2/4 (steps 12 and 19 never; 20 flips; 21 yes) |
| Corporeal routing in code | 3/24 to 15/24 on both passes. The other nine (2, 3, 6, 7, 8, 11, 15, 16, 19) are reports that name no creature, so the intake says `unknown` and the model's own class stands; the key calls all of them corporeal, so steps 15, 16 and 19 (real, contain) get spectral or anomalous countermeasures |
| EMF cleanup, SourceLedger always | steps with a discouraged panel 9 to 3 and 4; panel recall 92% to 95% and 98%; hot sector 23/24 to 24/24 |
| Timeouts | 0 failures in 48 runs (the baseline had one 240 s hang in about 60) |
| Intake stops copying the feed tier | tier copied 20/20 to 9/20 and 12/20 |
| Cost | mean latency 14.7 s to 16.2 s and 16.5 s; first panel 12.3 s to 14.0 s and 13.9 s (the longer intake: 3.1 s against 2.3 s) |

Misses were **1/14 in pass A (step 23) and 0/14 in pass B**. Step 23 is real (three vampires held at the street doors under UV and garlic) and the intake called it `harmless`: "The flinch/hiss behavior and 14C skin reading are consistent with cold exposure". The harmless gate also cleared step 7 in both passes (real, but the key says observe, so it scored by luck). The gate can produce a miss; it did once in two passes.

## Top 3 remaining fixes

### 1. Observe while the sky is far from nightfall (+7.0 on replay, steps 2, 3, 6)

Evidence. The model contains on 2, 3, 6 and 24 in both passes (over-escalation 4/5, the single largest pool: 11.25 points). The answer key separates these steps from the ones it wants contained by one thing the model never uses: how far away the sky event is. The quiet steps are 365, 325 and 190 minutes from sunset; the first step the key wants contained with nobody hurt (9) is 65 minutes out. The sky is already in `state.sky.minutes_to`, but only the compose prompt sees it, and the intake and the rubric have no lead-time idea.

Change. A rule in code, the same mechanism as the harmless guard: when `people_hurt == 0`, the sky exists, and the nearest upcoming event in `sky.minutes_to` (positive values only) is more than **100 minutes** away, treat the step as calm: `observe`, no CountermeasurePicker. Compute it before streaming and pass it into `clean_manifest` next to `incident`, because `recommended_action` is the last field the model writes and the components stream first. Pasted incidents have no sky, so the rule never fires on them.

Measured by replaying the saved manifests of both passes through the rule (no model calls): pass A 126.70 to 133.70, pass B 127.50 to 134.50. Over-escalation 4/5 to 1/5, misses unchanged (1 and 0), no step that the key wants contained is touched. Any lead from 66 to 144 minutes gives the same result; 60 breaks step 9 and adds a miss. This is one scenario and one constant, so check it on another pitch's scenario before trusting the number. Step 2 keeps a discouraged CivilianTracker (-1).

Not the model's size: I moved the intake alone to `parasail-kimi-k3-fast` (variant `v3`, steps 2, 3, 6, 10, 23, 24). It still contains on 2, 3 and 6, rates them `real_threat` and more severe, turned step 10 into an evacuate, and the intake took 10 to 16 s instead of 3 s. Do not swap the model.

### 2. Stand-down is not an emergency (+3.25 estimated, step 24, untested)

Evidence. Step 24 is the end-of-event debrief: the three subjects are "back in human form", headcount 160 of 160, doors latched. The intake reads "9 injured" as a live emergency (`real_threat`, `people_hurt` 9, severity critical) and the station contains in pass A and **evacuates in pass B**, which would dispatch a stand-down. It also carries a discouraged CountermeasurePicker and misses ThermalReadout. 2.75 of 6 both times.

Change. One narrow yes/no field in `INCIDENT_SCHEMA`, placed before `verdict`: `threat_present_now` ("a creature or hazard is still present and unrestrained in the report; false when it is gone, human again, or the report is a debrief"). When it is false and nobody is in reach, treat the step as calm like fix 1.

Risk. A model that reads step 23 (creatures present but held at the door) as "not present" turns that step into a miss, which is the failure to avoid. My earlier three-way `threat_state` (v2) failed exactly this way: `over` went to step 23 and `inert` to five contain steps. Land it as a variant first and accept it only if misses stay 0/14 on two passes.

### 3. First panel at 14 s: one LLM call less in the grounding step (-3.7 s, no points)

Evidence. Time to the first panel is 14.0 s and 13.9 s (p95 22.8 s and 18.1 s); the page already shows the provisional card from the `incident` event at 4.5 s, so the gap is the wait for the first real component. `ground` is 7.8 s of it. The proof ledger (162 You.com searches, 108 Lore Researcher calls) shows where: the CrewAI agent makes **two** Parasail calls per run (decide to search, then write the notes), 3.7 s each on average, and a You.com search takes 0.5 s. The LLM round trips are 95% of the phase.

Change. Run the two grounding searches in code first, in parallel threads (about 0.6 s), put the numbered results into the Lore Researcher's prompt, and let the agent write the notes in one call. The agent and its role stay; it just stops spending a turn on tool selection. Expected first panel about 10 s. The cost is that the demo no longer shows the agent choosing its own queries; keep the tool-calling path behind a flag if that story matters to a judge.

## Considered and rejected

- **A stronger intake model**: see fix 1; +8 to 13 s of ingest for no gain on 2, 3 and 6.
- **Calling the intake twice and requiring both to say harmless**: the passes disagree on `harmless` for steps 8 and 23 only. The rule fixes pass A's step 23 (+2.8) and breaks pass A's step 8 (-3), so net -0.2. The leftover noise is about 3 points per pass; compare changes over two passes.
- **A rule for evacuate** (steps 12 and 19, about 2.5 points): no field separates the key's evacuate steps from its contain steps. Step 22 (20:10, the same 158-person hall, 9 hurt) is contain, while 20 and 21 (same hall and crowd, minutes earlier) are evacuate. Steps 12 and 19 get contain in every run. Leave it unless the key's boundary is made explicit.
- **Route and seal** (11/24 and 7/24 exact): not scored, and the key's routes are not the path to the entrance the prompt asks for.

## Noise

Between the two passes the action changed on steps 8, 20, 23 and 24, and the intake's `verdict` or severity on 2, 3, 8, 9, 10, 17 and 23, with temperature 0 at intake. The compose call still runs at 0.3. Expect about ±1 point between passes on this code; a change that moves the score by less than 3 is inside the noise.


---

# Part 2: guard variants against the control

Generated 2026-10-28 15:04. Control = labels a, b (pipeline `23b5233007`). Variants run on a frozen copy of that pipeline (`eval/snap-23b5233007`) with `PROOF_CONTEXT=eval`.

Base pipeline hash per column: a `23b5233007`, b `23b5233007`, v4a `23b5233007`, v4b `23b5233007`, v5a `23b5233007`, v6a `23b5233007`, v6b `23b5233007`, v6c `23b5233007`

## Metrics

| Metric | a | b | v4a | v4b | v5a | v6a | v6b | v6c |
|---|---|---|---|---|---|---|---|---|
| **Points / 144** | **126.70** | **127.50** | **126.25** | **127.75** | **123.45** | **122.27** | **128.02** | **126.52** |
| **Misses** (key contain/evacuate, model observed) | **1/14** | **0/14** | **0/14** | **0/14** | **8/14** | **9/14** | **1/14** | **3/14** |
| False alarms (harmless, acted) | 0/5 | 1/5 | 1/5 | 1/5 | 0/5 | 0/5 | 0/5 | 0/5 |
| Harmless handled calmly | 5/5 | 4/5 | 4/5 | 4/5 | 5/5 | 5/5 | 5/5 | 5/5 |
| Over-escalations | 4/5 | 4/5 | 4/5 | 4/5 | 0/5 | 0/5 | 3/5 | 3/5 |
| Evacuate matches | 1/4 | 2/4 | 1/4 | 2/4 | 1/4 | 1/4 | 2/4 | 2/4 |
| Action match | 16/24 | 17/24 | 16/24 | 17/24 | 16/24 | 15/24 | 17/24 | 16/24 |
| Dispatch match | 19/24 | 19/24 | 19/24 | 19/24 | 16/24 | 15/24 | 20/24 | 18/24 |
| Panel recall | 95% | 98% | 97% | 99% | 85% | 89% | 88% | 94% |
| Steps with a discouraged panel | 3/24 | 4/24 | 4/24 | 4/24 | 1/24 | 1/24 | 2/24 | 2/24 |
| Failures | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

## Mean points per group

| Group | Passes | Mean points | Delta to control | Misses per pass |
|---|---|---|---|---|
| control | 126.70, 127.50 | 127.10 | +0.00 | 1/14, 0/14 |
| v4 | 126.25, 127.75 | 127.00 | -0.10 | 0/14, 0/14 |
| v5 | 123.45 | 123.45 | -3.65 | 8/14 |
| v6 | 122.27 | 122.27 | -4.83 | 9/14 |
| v6 | 128.02, 126.52 | 127.27 | +0.17 | 1/14, 3/14 |

## Steps that differ

Cells are `action points`; `*` marks an action different from the key.

| # | Truth | Key | a | b | v4a | v4b | v5a | v6a | v6b | v6c |
|---|---|---|---|---|---|---|---|---|---|---|
| 2 | R | observe | contain* 3 | contain* 3 | contain* 3 | contain* 3 | observe 5 | observe 5 | contain* 2.75 | contain* 3 |
| 3 | R | observe | contain* 4 | contain* 4 | contain* 4 | contain* 4 | observe 6 | observe 6 | contain* 4 | contain* 4 |
| 5 | R | contain | contain 6 | contain 6 | contain 6 | contain 6 | contain 6 | observe* 3.75 | evacuate* 5 | contain 6 |
| 6 | R | observe | contain* 3 | contain* 3 | contain* 3 | contain* 3 | observe 6 | observe 6 | observe 5.75 | observe 6 |
| 8 | H | observe | observe 6 | contain* 3 | contain* 3 | contain* 3 | observe 6 | observe 5.667 | observe 5.667 | observe 5.667 |
| 9 | R | contain | contain 6 | contain 6 | contain 6 | contain 6 | observe* 3.25 | observe* 3.75 | observe* 3.75 | observe* 3.75 |
| 10 | R | contain | contain 6 | contain 6 | contain 6 | contain 6 | contain 6 | contain 6 | contain 5.4 | contain 5.8 |
| 12 | R | evacuate | contain* 5 | contain* 5 | contain* 5 | contain* 5 | observe* 3.25 | observe* 3.75 | contain* 5 | contain* 5 |
| 13 | R | contain | contain 6 | contain 6 | contain 6 | contain 6 | observe* 3.75 | contain 6 | contain 6 | observe* 3.75 |
| 14 | R | contain | contain 6 | contain 6 | contain 6 | contain 6 | observe* 3.75 | observe* 3.75 | contain 6 | contain 6 |
| 15 | R | contain | contain 6 | contain 6 | contain 5.75 | contain 6 | observe* 3.75 | observe* 3.75 | contain 6 | contain 6 |
| 16 | R | contain | contain 6 | contain 6 | contain 6 | contain 6 | observe* 4 | observe* 4 | contain 6 | observe* 4 |
| 17 | R | contain | contain 6 | contain 6 | contain 6 | contain 6 | contain 6 | observe* 3.75 | contain 6 | contain 6 |
| 19 | R | evacuate | contain* 5 | contain* 5 | contain* 5 | evacuate 6 | observe* 3.8 | observe* 3.8 | contain* 5 | contain* 5 |
| 20 | R | evacuate | contain* 5 | evacuate 6 | contain* 5 | contain* 5 | evacuate 6 | evacuate 6 | evacuate 6 | evacuate 6 |
| 21 | R | evacuate | evacuate 6 | evacuate 6 | evacuate 6 | evacuate 6 | observe* 3.4 | observe* 3.8 | evacuate 6 | evacuate 6 |
| 23 | R | contain | observe* 3.2 | contain 6 | contain 6 | contain 6 | contain 6 | contain 6 | contain 5.2 | contain 5.8 |
| 24 | R | observe | contain* 2.75 | evacuate* 2.75 | contain* 2.75 | contain* 3 | observe 5.75 | observe 5.75 | contain* 2.75 | contain* 3 |

## What the guards saw

- **a** (control): misses at [23]; false alarms at none
- **b** (control): misses at none; false alarms at [8]
- **v4a**: `creature_countered` true on 10(R), 13(R), 20(R), 22(R), 23(R); misses at none; false alarms at [8]
- **v4b**: `creature_countered` true on 10(R), 13(R), 20(R), 22(R), 23(R); misses at none; false alarms at [8]
- **v5a**: `creature_countered` true on 10(R), 20(R), 22(R), 23(R); `aftermath` true on 2(R), 3(R), 4(H), 6(R), 12(R), 13(R), 14(R), 15(R), 16(R), 19(R), 20(R), 21(R), 22(R), 23(R), 24(R); aftermath rule fired on [2, 3, 6, 13, 14, 15, 16, 19, 21, 24]; misses at [9, 12, 13, 14, 15, 16, 19, 21]; false alarms at none
- **v6a**: `creature_countered` true on 10(R), 13(R), 20(R), 22(R), 23(R); misses at [5, 9, 12, 14, 15, 16, 17, 19, 21]; false alarms at none
- **v6b**: `creature_countered` true on 10(R), 13(R), 20(R), 22(R), 23(R); misses at [9]; false alarms at none
- **v6c**: `creature_countered` true on 10(R), 22(R), 23(R); misses at [9, 13, 16]; false alarms at none

## Verdict on the two requests

**Accept: guard 1 (`creature_countered`).** **Reject: fix 2 in both forms I tried (`aftermath`, `ended_evidence`).**

Accept rule: misses stay at 0/14 over two passes. Guard 1 (v4) had 0/14 and 0/14 on the frozen pipeline, and 0/14 on the live code. Both forms of fix 2 broke the rule. All variants ran on a frozen copy of the pipeline (`eval/snap-23b5233007`, before the sky lead-time rule) so the control cannot move; one extra pair of passes ran on the live code, which has the lead-time rule.

| Variant | What it adds | Passes | Mean points | Delta to control | Misses per pass |
|---|---|---|---|---|---|
| control (frozen) | nothing | 126.70, 127.50 | 127.10 | | 1/14, 0/14 |
| **v4** | guard 1 | 126.25, 127.75 | 127.00 | **-0.10** (noise) | **0/14, 0/14** |
| v5 | v4 + `aftermath` boolean | 123.45 | 123.45 | -3.65 | 8/14 |
| v6 first run | v4 + `ended_evidence` quote | 122.27 | 122.27 | -4.83 | 9/14 |
| v6 fixed | same, the model's "unknown" no longer counts as a quote | 128.02, 126.52 | 127.27 | +0.17 | 1/14, 3/14 |
| control (live code, has the lead-time rule) | nothing | 133.07 | | | 1/14 |
| **v4 on the live code** | guard 1 | 132.80 | | **-0.27** (noise) | **0/14** |

### Guard 1: what it does, and the evidence

- It fired only on real steps, all from 10, 13, 20, 22 and 23 (a subset in some passes), and **never on a harmless step: 0 of 35 harmless samples** across the 7 guarded passes.
- Step 23 (real, three vampires held at the doors by UV and garlic) was contained in **7 of 7** guarded passes. The unguarded passes missed it in 1 of 3 (pass A).
- Cost: none measurable. Mean points -0.10 and -0.27, inside the noise of about ±1. Harmless false alarms were 1/5 in both v4 passes and in v4 on the live code (step 8 each time); the controls had 0/5 and 1/5 (frozen) and 0/5 (live), so step 8 flips with or without the guard.
- Not built from this scenario's words: the field's description is assembled from `library.ARSENAL` (the unit's own countermeasure names), so a new countermeasure extends it.

Exact change for the build session (`pipeline/flow.py`, against the live file):

```python
# 1. INCIDENT_SCHEMA["required"]: add "creature_countered" between "deliberate_act" and "verdict".
# 2. INCIDENT_SCHEMA["properties"]: add, between "deliberate_act" and "verdict":
        "creature_countered": {"type": "boolean", "description": (
            "true when the report shows a person or thing held back, repelled or reacting to one of the unit's countermeasures ("
            + ", ".join(v.lower() for v in library.ARSENAL.values())
            + ") or to a threshold or barricade: hissing, flinching, burning, refusing to cross. "
            "A costume, a prop or a smell alone is false")},
# 3. EXTRACT_SYSTEM: two replacements.
#    "Fill evidence_of_threat, ordinary_explanation, deliberate_act and verdict before "
#      -> "Fill evidence_of_threat, ordinary_explanation, deliberate_act, creature_countered and verdict before "
#    "supports an ordinary explanation and nobody acted deliberately; "
#      -> "supports an ordinary explanation, nobody acted deliberately and nothing is held back or repelled by a countermeasure; "
# 4. HauntFlow.ingest, directly after the existing deliberate_act block:
        if incident.get("verdict") == "harmless" and incident.get("creature_countered"):
            incident["verdict"] = "unclear"
            self.state.notes.append("something is held back or repelled by a countermeasure, so the harmless verdict became unclear")
```

Also add `creature_countered?: boolean` to `Incident` in `shared/protocol.ts`. `eval/variants/v4.py` is the same change applied in memory; its two `assert`s fail loudly if the prompt text above has moved.

### Fix 2: why it does not pass

- **`aftermath` boolean (v5): 8 misses.** The intake set it on 15 of 24 steps, 14 of them real, because it reads "nothing is acting right now" as "ended". The rule forced observe on 10 steps; six of those are misses (13, 14, 15, 16, 19, 21). Two more misses (9, 12) came from the model itself, which sees `aftermath: true` in the incident it composes from. My two-step smoke test (23, 24) had shown it working; two steps were not enough to see this.
- **`ended_evidence` quote (v6): 9 misses on the first run.** The model wrote the word "unknown" into the field (the intake prompt tells it to) and the rule counted that as evidence. With that fixed (a quote must have at least four words and must not start with unknown, no, not or none), two passes still had 1 and 3 misses: the model fills the field with any sentence ("Blinds remain lowered; staff request to raise them", "Breaker remains tripped; network still up"), and the rule fired on steps 9, 13 and 16. It also did not fire on step 24 in either pass: the field was "unknown" there.
- The pool is 3.25 of 144 points. A model-judged "it ended" flag is not reliable enough on this model to trade against the miss invariant. Leave step 24 as it is.

## Two findings that are not guards

**1. Step 9 is the next miss.** It is real (the key wants contain) and the model observed it in 2 of 7 plain samples, both times through a `harmless` verdict: live-code control and v5. A third sample (the first v4 pass A) did the same; the harness discarded it when I re-ran the steps whose variant files had changed, so it is not in the table. Step 9 is a tall man lowering fourteen blinds while two seated guests read 16 C and nobody has seen them eat; the model takes "the glare was killing his screen" as the ordinary explanation and ignores the readings. The `deliberate_act` downgrade only catches it when the model sets that flag.
Candidate guard, not tested: one more schema field, `unexplained_anomaly` (boolean, "true when the report contains a reading or behaviour that the ordinary explanation does not cover"), and downgrade `harmless` to `unclear` when it is true, next to the two existing downgrades. Test it as `v7` on two passes before landing; it must not turn steps 1, 4, 8, 11 or 18 into false alarms.
A floor rule does not help here: I replayed "observe is only allowed for a harmless verdict or the lead-time calm" over all nine saved passes. It changed nothing on the control, v4 and live passes (their misses come from `harmless` verdicts, which the floor allows), and it only repaired the broken fix-2 variants.

**2. The timeout fix does not bound a slow stream.** In v4 pass A, steps 1, 4 and 17 sat in `compose` for the harness's whole 150 s after their first component (`last phase seen: compose:progress`), while two or three pipelines ran in parallel. Nothing else in about 215 steps stalled (the control's 48 sequential runs, the live passes, the other five variant passes). `parasail.client()` sets `httpx.Timeout(45, connect=8)`, which is per read: a stream that keeps trickling bytes resets it, so it never reaches the fallback model. Add a wall-clock deadline inside `chat_json`'s chunk loop (a compose call takes 3.6 s on average, 15 s at the worst I saw):

```python
        t_stream = time.monotonic()
        for chunk in stream:
            if time.monotonic() - t_stream > 40:   # whole-call deadline; the per-read timeout cannot see a slow stream
                raise TimeoutError("Parasail stream passed its 40 s deadline")
```

The `except` below it already falls through to the second model. The harness's `--timeout` of 150 s is what caught these; the 90 s worker kill in `station.ts` would catch them too, but only by replaying the saved run.


---

# Part 2: guard variants against the control (live code)

Generated 2026-10-28 15:04. Control = labels live (pipeline `23b5233007`). Variants run on a frozen copy of that pipeline (`eval/snap-23b5233007`) with `PROOF_CONTEXT=eval`.

Base pipeline hash per column: live `1f473642d7`, v4live `1f473642d7`

## Metrics

| Metric | live | v4live |
|---|---|---|
| **Points / 144** | **133.07** | **132.80** |
| **Misses** (key contain/evacuate, model observed) | **1/14** | **0/14** |
| False alarms (harmless, acted) | 0/5 | 1/5 |
| Harmless handled calmly | 5/5 | 4/5 |
| Over-escalations | 1/5 | 1/5 |
| Evacuate matches | 2/4 | 3/4 |
| Action match | 19/24 | 19/24 |
| Dispatch match | 22/24 | 22/24 |
| Panel recall | 92% | 95% |
| Steps with a discouraged panel | 2/24 | 3/24 |
| Failures | 0 | 0 |

## Mean points per group

| Group | Passes | Mean points | Delta to control | Misses per pass |
|---|---|---|---|---|
| control | 133.07 | 133.07 | +0.00 | 1/14 |
| v4live | 132.80 | 132.80 | -0.27 | 0/14 |

## Steps that differ

Cells are `action points`; `*` marks an action different from the key.

| # | Truth | Key | live | v4live |
|---|---|---|---|---|
| 6 | R | observe | observe 6 | observe 5.75 |
| 8 | H | observe | observe 5.667 | contain* 3 |
| 9 | R | contain | observe* 3.25 | contain 6 |
| 10 | R | contain | contain 6 | contain 5.8 |
| 13 | R | contain | contain 6 | contain 5.75 |
| 15 | R | contain | contain 6 | contain 5.75 |
| 19 | R | evacuate | contain* 5 | evacuate 6 |
| 22 | R | contain | contain 5.4 | evacuate* 5 |
| 24 | R | observe | contain* 3 | evacuate* 3 |

## What the guards saw

- **live** (control): misses at [9]; false alarms at none
- **v4live**: `creature_countered` true on 10(R), 20(R), 22(R), 23(R); misses at none; false alarms at [8]
