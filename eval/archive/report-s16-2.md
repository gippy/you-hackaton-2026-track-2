# Nightfall eval report — run s16-2

Generated 2026-10-28 15:31 · pipeline hash `a57d1180b5` · sky input on · scenario `fixtures/nightfall/scenario.json` · answer key `fixtures/nightfall/answer-key.json`

Model(s) seen: parasail-minimax-m31-flash · steps run: 1 · failures: 0

Dispatch is scored from `recommended_action` (observe = no dispatch). The pipeline itself never posts; nothing was sent to Discord or PagerDuty.

## Score: 4 / 6 points (67%)

Per step, one point each for: action match, dispatch match, hot-sector match, panel recall (fractional), no discouraged panel, no failure.

## Metrics

| Metric | Result |
|---|---|
| False alarms (harmless step, model acts or dispatches) | 0/0 |
| Harmless handled calmly (observe, low banner, no discouraged panel) | n/a |
| Harmless with the `all_clear` sound cue | n/a |
| Misses (key says contain/evacuate, model observes) | 1/1 |
| Over-escalation (real but key says observe, model acts) | 0/0 |
| Action match | 0/1 (0%) |
| of which called too low / too high (contain vs evacuate) | 0 / 0 |
| Dispatch match | 0/1 (0%) |
| Intake severity equals the feed's tier label (diagnostic: the model reads the label, not the text) | 0/1 (0%) of the steps with a LOW/ELEVATED/CRITICAL tier |
| Entity routed to the key's playbook (diagnostic, not scored) | 0/1 (0%); routed: anomalous ×1 |
| Hot sector match (FloorPlan, else incident sector) | 1/1 (100%) |
| Hot sector match from the intake step alone | 1/1 (100%) |
| Seal set exact / route set exact (secondary, not scored) | 1/1 (100%) / 0/1 (0%) |
| Panel recall, mean | 100% (all expected present on 1/1 steps) |
| Discouraged panels present | 0 panels on 0/1 steps |
| Panels the key neither expects nor discourages | SourceLedger ×1 (neutral) |
| Layout variety (distinct panel sets) | 1 distinct in 1 runs; the key itself expects 1 |
| Most common layout | CivilianTracker, FloorPlan, SourceLedger, SystemsBoard, ThermalReadout, ThreatBanner on 1/1 steps |
| Mean pairwise layout distance (Jaccard, 0 = identical) | 0.00 |
| Failures (bad JSON, timeout, empty output) | 0/1 |
| Latency per step (wall) | mean 16.5s · median 16.5s · p95 16.5s · max 16.5s |
| Mean phase time inside the flow | ingest 6.3s · ground 5.2s · compose 3.5s |
| Time to first / last component on the wire | 13.8s / 15.8s |

## Action confusion (rows = key, columns = model)

| key \ model | observe | contain | evacuate |
|---|---|---|---|
| observe | 0 | 0 | 0 |
| contain | 1 | 0 | 0 |
| evacuate | 0 | 0 | 0 |

## Per step

Truth: R real, H harmless. Hot is the FloorPlan hot sector, or the intake sector when there is no FloorPlan. Δ panels: `-X` is an expected panel that is missing, `!X` a discouraged panel that is present.

| # | Time | Feed tier | Truth | Key action | Model action | Disp | Hot (model → key) | Recall | Panels (model) | Δ panels | Playbook | Sound | Lat s | Pts |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 16 | 19:10 | CRITICAL_HAUNT | R | contain (D) | observe ✗ | ✗ | network_closet ✓ → network_closet | 100% | ThreatBanner, SourceLedger, ThermalReadout, SystemsBoard, FloorPlan, CivilianTracker | – | anomalous ✗ | alert_chime | 17 | 4/6 |

## Where the points went

| Criterion | Points lost | Steps |
|---|---|---|
| action | 1.00 | 16 |
| dispatch | 1.00 | 16 |
| hot | 0.00 | – |
| recall | 0.00 | – |
| no_discouraged | 0.00 | – |
| no_failure | 0.00 | – |

- **misses (acting step, observed)**: steps 16
- **pipeline notes**: someone acted deliberately, so the harmless verd… ×1

## Against the baseline (eval/baseline/results.jsonl)

| Metric | Baseline | This run |
|---|---|---|
| Points | 6/6 | 4/6 |
| False alarms (harmless, acted) | 0/0 | 0/0 |
| Harmless handled calmly | 0/0 | 0/0 |
| Harmless with `all_clear` | 0/0 | 0/0 |
| Misses | 0/1 | 1/1 |
| Over-escalations | 0/0 | 0/0 |
| Action match | 1/1 | 0/1 |
| Dispatch match | 1/1 | 0/1 |
| Hot sector match | 1/1 | 1/1 |
| Panel recall, mean | 100% | 100% |
| Steps with a discouraged panel | 0/1 | 0/1 |
| Routed to the key's playbook | 0/1 | 0/1 |
| Intake severity copies the feed tier | 1/1 | 0/1 |
| Distinct layouts | 1 | 1 |
| Failures | 0 | 0 |
| Mean latency | 13.2s | 16.5s |

Steps that changed (points before → after):

| # | Truth | Key | Baseline action | Variant action | Points |
|---|---|---|---|---|---|
| 16 | real | contain | contain | observe | 6 → 4 |
