# Nightfall eval report

Generated 2026-10-28 18:50 · scenario `fixtures/nightfall/scenario.json` · answer key `fixtures/nightfall/answer-key.json` · Baseline: pipeline `d0f4cdd6fd` · Pass K: pipeline `8292cf0dcc` · Pass L: pipeline `8292cf0dcc`

Dispatch is scored from `recommended_action` (observe = no dispatch). Nothing was sent to Discord or PagerDuty. Worker runs carry `PROOF_CONTEXT=eval` in the proof ledger.

## Score

| | Baseline | Pass K | Pass L | Mean of passes |
|---|---|---|---|---|
| Points / 144 | 114.00 | 136.47 | 132.55 | 134.51 |

## Metrics

| Metric | Baseline | Pass K | Pass L |
|---|---|---|---|
| **Misses** (key says contain/evacuate, model observed) | 0/14 | 0/14 | 0/14 |
| False alarms (harmless step, model acts) | 3/5 | 0/5 | 1/5 |
| Harmless handled calmly (observe, low banner, no discouraged panel) | 0/5 | 5/5 | 4/5 |
| Harmless with the `all_clear` cue | 1/5 | 5/5 | 4/5 |
| Over-escalations (real step the key wants watched, model acts) | 4/5 | 1/5 | 1/5 |
| Evacuate matches (key says evacuate) | 0/4 | 2/4 | 3/4 |
| Action match | 13/24 | 19/24 | 19/24 |
| Dispatch match | 17/24 | 23/24 | 22/24 |
| Hot sector match (FloorPlan, else intake sector) | 23/24 | 24/24 | 23/24 |
| Routed to the key's playbook (not scored) | 3/24 | 21/24 | 20/24 |
| Intake severity copies the feed tier (the model reads the label, not the text) | 20/20 | 13/20 | 15/20 |
| Panel recall, mean | 92% | 98% | 98% |
| Steps with a discouraged panel | 9/24 | 1/24 | 3/24 |
| Distinct layouts | 12 | 14 | 13 |
| Distinct layouts the key expects | 13 | 13 | 13 |
| Failures (bad JSON, timeout, empty output) | 0/24 | 0/24 | 0/24 |
| Latency per step, mean | 14.7s | 17.4s | 18.6s |
| Latency per step, median | 13.6s | 16.9s | 17.1s |
| Latency per step, p95 | 19.8s | 21.7s | 23.2s |
| Latency per step, max | 23.6s | 28.2s | 56.3s |
| Time to the `incident` event (earliest thing the page could show) | 3.4s | 4.4s | 6.5s |
| **Time to the first panel**, mean | 12.3s | 14.5s | 15.7s |
| Time to the first panel, p95 | 17.5s | 19.6s | 20.1s |
| Time to the first panel, max | 22.5s | 22.1s | 53.1s |
| Time to the last panel, mean | 14.1s | 16.6s | 17.7s |

## Action confusion (rows = key, columns = model: observe / contain / evacuate)

| key | Baseline | Pass K | Pass L |
|---|---|---|---|
| observe | 3 / 7 / 0 | 9 / 1 / 0 | 8 / 1 / 1 |
| contain | 0 / 10 / 0 | 0 / 8 / 2 | 0 / 8 / 2 |
| evacuate | 0 / 4 / 0 | 0 / 2 / 2 | 0 / 1 / 3 |

## Per step

Cells are `action pts`. Δ panels: `-X` an expected panel missing, `!X` a discouraged one present. A `*` marks an action different from the key.

| # | Truth | Key | Feed tier | Baseline act pts | Pass K act pts | Pass L act pts | Pass K Δ panels | Pass L Δ panels | Flip |
|---|---|---|---|---|---|---|---|---|---|
| 1 | H | observe | ELEVATED_HAUNT | contain* 2.5 | observe 6 | observe 6 | – | – |  |
| 2 | R | observe | UNVERIFIED | contain* 2.75 | observe 6 | observe 4 | – | !CivilianTracker |  |
| 3 | R | observe | LOW_HAUNT | contain* 4 | observe 6 | observe 6 | – | – |  |
| 4 | H | observe | UNVERIFIED | observe 4.5 | observe 6 | observe 6 | – | – |  |
| 5 | R | contain (D) | ELEVATED_HAUNT | contain 5 | contain 6 | contain 6 | – | – |  |
| 6 | R | observe | UNVERIFIED | contain* 3 | observe 6 | observe 6 | – | – |  |
| 7 | R | observe | LOW_HAUNT | observe 6 | observe 6 | observe 5.75 | – | -CivilianTracker |  |
| 8 | H | observe | CRITICAL_HAUNT | contain* 3 | observe 5.667 | contain* 3 | -EMFGauge | !CountermeasurePicker !CivilianTracker | flip |
| 9 | R | contain (D) | ELEVATED_HAUNT | contain 6 | contain 6 | contain 6 | – | – |  |
| 10 | R | contain (D) | CRITICAL_HAUNT | contain 6 | contain 6 | contain 6 | – | – |  |
| 11 | H | observe | LOW_HAUNT | observe 5 | observe 6 | observe 6 | – | – |  |
| 12 | R | evacuate (D) | CRITICAL_HAUNT | contain* 5 | contain* 5 | contain* 5 | – | – |  |
| 13 | R | contain (D) | ELEVATED_HAUNT | contain 5 | contain 6 | contain 6 | – | – |  |
| 14 | R | contain (D) | ELEVATED_HAUNT | contain 6 | contain 6 | contain 6 | – | – |  |
| 15 | R | contain (D) | LOW_HAUNT | contain 6 | contain 6 | contain 6 | – | – |  |
| 16 | R | contain (D) | CRITICAL_HAUNT | contain 6 | evacuate* 5 | evacuate* 5 | – | – |  |
| 17 | R | contain (D) | ELEVATED_HAUNT | contain 6 | contain 6 | contain 6 | – | – |  |
| 18 | H | observe | ELEVATED_HAUNT | contain* 2.5 | observe 6 | observe 6 | – | – |  |
| 19 | R | evacuate (D) | CRITICAL_HAUNT | contain* 5 | contain* 4.8 | evacuate 6 | -ThermalReadout | – | flip |
| 20 | R | evacuate (D) | CRITICAL_HAUNT | contain* 5 | evacuate 6 | evacuate 6 | – | – |  |
| 21 | R | evacuate (D) | CRITICAL_HAUNT | contain* 5 | evacuate 6 | evacuate 5.8 | – | -ThermalReadout |  |
| 22 | R | contain (D) | ELEVATED_HAUNT | contain 6 | evacuate* 5 | evacuate* 5 | – | – |  |
| 23 | R | contain (D) | LOW_HAUNT | contain 6 | contain 6 | contain 6 | – | – |  |
| 24 | R | observe | UNVERIFIED | contain* 2.75 | contain* 3 | evacuate* 3 | !CountermeasurePicker | !CountermeasurePicker | flip |

## Where the points went

| Criterion | Baseline | Pass K | Pass L |
|---|---|---|---|
| action | 11.00 | 5.00 | 5.00 |
| dispatch | 7.00 | 1.00 | 2.00 |
| hot | 1.00 | 0.00 | 1.00 |
| recall | 2.00 | 0.53 | 0.45 |
| no_discouraged | 9.00 | 1.00 | 3.00 |
| no_failure | 0.00 | 0.00 | 0.00 |

- **Pass K**: misses none; false alarms none; over-escalations [24]; contain/evacuate mismatches [12, 16, 19, 22]; discouraged panels CountermeasurePicker [24]; pipeline notes dropped a quick action this station cannot run: … ×25; dropped a sky warning that states times instead … ×10; dropped a ThreatBanner title over 6 words or 32 … ×4; dropped a repeated FloorPlan ×2; dropped 1 evidence quote(s) not found in the rep… ×1; dropped a FloorPlan title over 6 words or 32 cha… ×1
- **Pass L**: misses none; false alarms [8]; over-escalations [24]; contain/evacuate mismatches [12, 16, 22]; discouraged panels CivilianTracker [2, 8]; CountermeasurePicker [8, 24]; pipeline notes dropped a quick action this station cannot run: … ×24; dropped a sky warning that states times instead … ×13; dropped a SystemsBoard with no systems ×2; dropped a ThreatBanner title over 6 words or 32 … ×2; dropped FloorPlan: the intake judged the report … ×1; dropped CivilianTracker: the intake judged the r… ×1; dropped CountermeasurePicker: the intake judged … ×1; dropped a SourceLedger title over 6 words or 32 … ×1; dropped a repeated SourceLedger ×1; the EMF reading is above its threshold: danger ×1; dropped a CountermeasurePicker title over 6 word… ×1; dropped 1 evidence quote(s) not found in the rep… ×1

Notes: what I fixed and rejected after the first passes is in [fixes.md](fixes.md). The guard experiments are in [archive/report-guards.md](archive/report-guards.md), [archive/report-guards-live.md](archive/report-guards-live.md) and [archive/guards-fixes.md](archive/guards-fixes.md).
