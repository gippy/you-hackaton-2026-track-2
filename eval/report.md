# Nightfall eval report

Generated 2026-10-28 18:01 · scenario `fixtures/nightfall/scenario.json` · answer key `fixtures/nightfall/answer-key.json` · Baseline: pipeline `d0f4cdd6fd` · Pass I: pipeline `c94aa03f3b` · Pass J: pipeline `c94aa03f3b`

The files on disk have changed since these runs (now `18e72150f3`).

Dispatch is scored from `recommended_action` (observe = no dispatch). Nothing was sent to Discord or PagerDuty. Worker runs carry `PROOF_CONTEXT=eval` in the proof ledger.

## Score

| | Baseline | Pass I | Pass J | Mean of passes |
|---|---|---|---|---|
| Points / 144 | 114.00 | 133.30 | 136.42 | 134.86 |

## Metrics

| Metric | Baseline | Pass I | Pass J |
|---|---|---|---|
| **Misses** (key says contain/evacuate, model observed) | 0/14 | 0/14 | 0/14 |
| False alarms (harmless step, model acts) | 3/5 | 1/5 | 0/5 |
| Harmless handled calmly (observe, low banner, no discouraged panel) | 0/5 | 4/5 | 5/5 |
| Harmless with the `all_clear` cue | 1/5 | 4/5 | 5/5 |
| Over-escalations (real step the key wants watched, model acts) | 4/5 | 1/5 | 1/5 |
| Evacuate matches (key says evacuate) | 0/4 | 3/4 | 2/4 |
| Action match | 13/24 | 20/24 | 20/24 |
| Dispatch match | 17/24 | 22/24 | 23/24 |
| Hot sector match (FloorPlan, else intake sector) | 23/24 | 23/24 | 23/24 |
| Routed to the key's playbook (not scored) | 3/24 | 21/24 | 22/24 |
| Intake severity copies the feed tier (the model reads the label, not the text) | 20/20 | 12/20 | 13/20 |
| Panel recall, mean | 92% | 97% | 98% |
| Steps with a discouraged panel | 9/24 | 3/24 | 1/24 |
| Distinct layouts | 12 | 13 | 12 |
| Distinct layouts the key expects | 13 | 13 | 13 |
| Failures (bad JSON, timeout, empty output) | 0/24 | 0/24 | 0/24 |
| Latency per step, mean | 14.7s | 16.1s | 16.7s |
| Latency per step, median | 13.6s | 15.5s | 16.0s |
| Latency per step, p95 | 19.8s | 20.0s | 22.7s |
| Latency per step, max | 23.6s | 25.1s | 32.5s |
| Time to the `incident` event (earliest thing the page could show) | 3.4s | 4.9s | 4.5s |
| **Time to the first panel**, mean | 12.3s | 13.6s | 14.4s |
| Time to the first panel, p95 | 17.5s | 17.7s | 19.4s |
| Time to the first panel, max | 22.5s | 21.5s | 29.5s |
| Time to the last panel, mean | 14.1s | 15.4s | 15.9s |

## Action confusion (rows = key, columns = model: observe / contain / evacuate)

| key | Baseline | Pass I | Pass J |
|---|---|---|---|
| observe | 3 / 7 / 0 | 8 / 2 / 0 | 9 / 1 / 0 |
| contain | 0 / 10 / 0 | 0 / 9 / 1 | 0 / 9 / 1 |
| evacuate | 0 / 4 / 0 | 0 / 1 / 3 | 0 / 2 / 2 |

## Per step

Cells are `action pts`. Δ panels: `-X` an expected panel missing, `!X` a discouraged one present. A `*` marks an action different from the key.

| # | Truth | Key | Feed tier | Baseline act pts | Pass I act pts | Pass J act pts | Pass I Δ panels | Pass J Δ panels | Flip |
|---|---|---|---|---|---|---|---|---|---|
| 1 | H | observe | ELEVATED_HAUNT | contain* 2.5 | observe 6 | observe 6 | – | – |  |
| 2 | R | observe | UNVERIFIED | contain* 2.75 | observe 4 | observe 5 | !CivilianTracker | – |  |
| 3 | R | observe | LOW_HAUNT | contain* 4 | observe 6 | observe 6 | – | – |  |
| 4 | H | observe | UNVERIFIED | observe 4.5 | observe 6 | observe 6 | – | – |  |
| 5 | R | contain (D) | ELEVATED_HAUNT | contain 5 | contain 6 | contain 6 | – | – |  |
| 6 | R | observe | UNVERIFIED | contain* 3 | observe 6 | observe 6 | – | – |  |
| 7 | R | observe | LOW_HAUNT | observe 6 | observe 5.75 | observe 6 | -CivilianTracker | – |  |
| 8 | H | observe | CRITICAL_HAUNT | contain* 3 | contain* 3 | observe 5.667 | !CountermeasurePicker !CivilianTracker | -EMFGauge | flip |
| 9 | R | contain (D) | ELEVATED_HAUNT | contain 6 | contain 6 | contain 6 | – | – |  |
| 10 | R | contain (D) | CRITICAL_HAUNT | contain 6 | contain 6 | contain 6 | – | – |  |
| 11 | H | observe | LOW_HAUNT | observe 5 | observe 6 | observe 6 | – | – |  |
| 12 | R | evacuate (D) | CRITICAL_HAUNT | contain* 5 | contain* 5 | contain* 5 | – | – |  |
| 13 | R | contain (D) | ELEVATED_HAUNT | contain 5 | contain 6 | evacuate* 5 | – | – | flip |
| 14 | R | contain (D) | ELEVATED_HAUNT | contain 6 | contain 6 | contain 6 | – | – |  |
| 15 | R | contain (D) | LOW_HAUNT | contain 6 | contain 6 | contain 6 | – | – |  |
| 16 | R | contain (D) | CRITICAL_HAUNT | contain 6 | contain 6 | contain 6 | – | – |  |
| 17 | R | contain (D) | ELEVATED_HAUNT | contain 6 | contain 5.75 | contain 5.75 | -SystemsBoard | -SystemsBoard |  |
| 18 | H | observe | ELEVATED_HAUNT | contain* 2.5 | observe 6 | observe 6 | – | – |  |
| 19 | R | evacuate (D) | CRITICAL_HAUNT | contain* 5 | evacuate 6 | evacuate 6 | – | – |  |
| 20 | R | evacuate (D) | CRITICAL_HAUNT | contain* 5 | evacuate 6 | contain* 5 | – | – | flip |
| 21 | R | evacuate (D) | CRITICAL_HAUNT | contain* 5 | evacuate 5.8 | evacuate 6 | -ThermalReadout | – |  |
| 22 | R | contain (D) | ELEVATED_HAUNT | contain 6 | evacuate* 5 | contain 6 | – | – | flip |
| 23 | R | contain (D) | LOW_HAUNT | contain 6 | contain 6 | contain 6 | – | – |  |
| 24 | R | observe | UNVERIFIED | contain* 2.75 | contain* 3 | contain* 3 | !CountermeasurePicker | !CountermeasurePicker |  |

## Where the points went

| Criterion | Baseline | Pass I | Pass J |
|---|---|---|---|
| action | 11.00 | 4.00 | 4.00 |
| dispatch | 7.00 | 2.00 | 1.00 |
| hot | 1.00 | 1.00 | 1.00 |
| recall | 2.00 | 0.70 | 0.58 |
| no_discouraged | 9.00 | 3.00 | 1.00 |
| no_failure | 0.00 | 0.00 | 0.00 |

- **Pass I**: misses none; false alarms [8]; over-escalations [24]; contain/evacuate mismatches [12, 22]; discouraged panels CivilianTracker [2, 8]; CountermeasurePicker [8, 24]; pipeline notes dropped a quick action this station cannot run: … ×20; dropped a sky warning that states times instead … ×12; dropped a ThreatBanner title over 6 words or 32 … ×4; dropped 1 evidence quote(s) not found in the rep… ×3; dropped a ThermalReadout title over 6 words or 3… ×1; the EMF reading is above its threshold: danger ×1; dropped a ThermalReadout showing its normal temp… ×1; dropped a SystemsBoard with no systems ×1
- **Pass J**: misses none; false alarms none; over-escalations [24]; contain/evacuate mismatches [12, 13, 20]; discouraged panels CountermeasurePicker [24]; pipeline notes dropped a quick action this station cannot run: … ×24; dropped a sky warning that states times instead … ×11; dropped a ThreatBanner title over 6 words or 32 … ×5; dropped a ThermalReadout title over 6 words or 3… ×1; dropped a SkyClock title over 6 words or 32 char… ×1; a safe route that stopped inside the building no… ×1

Notes: what I fixed and rejected after the first passes is in [fixes.md](fixes.md). The guard experiments are in [archive/report-guards.md](archive/report-guards.md), [archive/report-guards-live.md](archive/report-guards-live.md) and [archive/guards-fixes.md](archive/guards-fixes.md).
