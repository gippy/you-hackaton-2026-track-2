# Nightfall eval report — variant v3 — run probe

Generated 2026-10-28 14:13 · pipeline hash `b6b0701692` · sky input on · scenario `fixtures/nightfall/scenario.json` · answer key `fixtures/nightfall/answer-key.json`

Model(s) seen: parasail-kimi-k3-fast, parasail-minimax-m31-flash · steps run: 6 · failures: 0

Dispatch is scored from `recommended_action` (observe = no dispatch). The pipeline itself never posts; nothing was sent to Discord or PagerDuty.

## Score: 23.25 / 36 points (65%)

Per step, one point each for: action match, dispatch match, hot-sector match, panel recall (fractional), no discouraged panel, no failure.

## Metrics

| Metric | Result |
|---|---|
| False alarms (harmless step, model acts or dispatches) | 0/0 |
| Harmless handled calmly (observe, low banner, no discouraged panel) | n/a |
| Harmless with the `all_clear` sound cue | n/a |
| Misses (key says contain/evacuate, model observes) | 0/2 |
| Over-escalation (real but key says observe, model acts) | 4/4 |
| Action match | 1/6 (17%) |
| of which called too low / too high (contain vs evacuate) | 0 / 1 |
| Dispatch match | 2/6 (33%) |
| Intake severity equals the feed's tier label (diagnostic: the model reads the label, not the text) | 1/3 (33%) of the steps with a LOW/ELEVATED/CRITICAL tier |
| Entity routed to the key's playbook (diagnostic, not scored) | 6/6 (100%); routed: corporeal ×6 |
| Hot sector match (FloorPlan, else incident sector) | 6/6 (100%) |
| Hot sector match from the intake step alone | 6/6 (100%) |
| Seal set exact / route set exact (secondary, not scored) | 0/6 (0%) / 0/6 (0%) |
| Panel recall, mean | 88% (all expected present on 3/6 steps) |
| Discouraged panels present | 3 panels on 3/6 steps |
| Panels the key neither expects nor discourages | SkyClock ×6, SystemsBoard ×2, CivilianTracker ×1, SourceLedger ×1, EntityCard ×1 (neutral) |
| Layout variety (distinct panel sets) | 5 distinct in 6 runs; the key itself expects 6 |
| Most common layout | CivilianTracker, CountermeasurePicker, FloorPlan, SkyClock, SourceLedger, SystemsBoard, ThreatBanner on 2/6 steps |
| Mean pairwise layout distance (Jaccard, 0 = identical) | 0.22 |
| Failures (bad JSON, timeout, empty output) | 0/6 |
| Latency per step (wall) | mean 31.9s · median 31.0s · p95 40.2s · max 40.2s |
| Mean phase time inside the flow | ingest 12.3s · ground 12.2s · compose 5.3s |
| Time to first / last component on the wire | 27.6s / 31.0s |

## Action confusion (rows = key, columns = model)

| key \ model | observe | contain | evacuate |
|---|---|---|---|
| observe | 0 | 3 | 1 |
| contain | 0 | 1 | 1 |
| evacuate | 0 | 0 | 0 |

## Per step

Truth: R real, H harmless. Hot is the FloorPlan hot sector, or the intake sector when there is no FloorPlan. Δ panels: `-X` is an expected panel that is missing, `!X` a discouraged panel that is present.

| # | Time | Feed tier | Truth | Key action | Model action | Disp | Hot (model → key) | Recall | Panels (model) | Δ panels | Playbook | Sound | Lat s | Pts |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2 | 12:10 | UNVERIFIED | R | observe | contain ✗ | ✗ | lounge ✓ → lounge | 75% | ThreatBanner, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, SkyClock | -SourceLedger !CivilianTracker | corporeal | sting_vampire | 33 | 2.75/6 |
| 3 | 12:50 | LOW_HAUNT | R | observe | contain ✗ | ✗ | lounge ✓ → lounge | 100% | ThreatBanner, SourceLedger, FloorPlan, CivilianTracker, ThermalReadout, SystemsBoard, CountermeasurePicker, SkyClock | – | corporeal | alert_chime | 23 | 4/6 |
| 6 | 15:05 | UNVERIFIED | R | observe | contain ✗ | ✗ | registration ✓ → registration | 75% | ThreatBanner, FloorPlan, CivilianTracker, SystemsBoard, SkyClock, CountermeasurePicker, SourceLedger | -ThermalReadout !CountermeasurePicker | corporeal | sting_vampire | 27 | 2.75/6 |
| 10 | 17:40 | CRITICAL_HAUNT | R | contain (D) | evacuate ✗ | ✓ | lounge ✓ → lounge | 100% | ThreatBanner, CivilianTracker, FloorPlan, ThermalReadout, SkyClock, CountermeasurePicker, SourceLedger | – | corporeal | sting_vampire | 40 | 5/6 |
| 23 | 20:18 | LOW_HAUNT | R | contain (D) | contain ✓ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, SourceLedger, FloorPlan, CivilianTracker, SystemsBoard, CountermeasurePicker, SkyClock | – | corporeal | sting_vampire | 29 | 6/6 |
| 24 | 20:26 | UNVERIFIED | R | observe | evacuate ✗ | ✗ | hack_floor_east ✓ → hack_floor_east | 75% | ThreatBanner, CivilianTracker, FloorPlan, CountermeasurePicker, SkyClock, EntityCard, SourceLedger | -ThermalReadout !CountermeasurePicker | corporeal | sting_werewolf | 39 | 2.75/6 |

## Where the points went

| Criterion | Points lost | Steps |
|---|---|---|
| action | 5.00 | 2, 3, 6, 10, 24 |
| dispatch | 4.00 | 2, 3, 6, 24 |
| hot | 0.00 | – |
| recall | 0.75 | 2 (-0.25), 6 (-0.25), 24 (-0.25) |
| no_discouraged | 3.00 | 2, 6, 24 |
| no_failure | 0.00 | – |

- **over-escalations (real/observe step, acted)**: steps 2, 3, 6, 24
- **contain↔evacuate mismatches**: steps 10
- **expected panels most often missing**: ThermalReadout ×2 (steps 6, 24); SourceLedger ×1 (steps 2)
- **discouraged panels most often present**: CountermeasurePicker ×2 (steps 6, 24); CivilianTracker ×1 (steps 2)
- **pipeline notes**: dropped an EMFGauge showing an ordinary reading ×1
- **fallback model used** on steps 2, 3, 6, 10, 23, 24

## Against the baseline (eval/baseline/results.jsonl)

| Metric | Baseline | This run |
|---|---|---|
| Points | 24.5/36 | 23.25/36 |
| False alarms (harmless, acted) | 0/0 | 0/0 |
| Harmless handled calmly | 0/0 | 0/0 |
| Harmless with `all_clear` | 0/0 | 0/0 |
| Misses | 0/2 | 0/2 |
| Over-escalations | 4/4 | 4/4 |
| Action match | 2/6 | 1/6 |
| Dispatch match | 2/6 | 2/6 |
| Hot sector match | 6/6 | 6/6 |
| Panel recall, mean | 92% | 88% |
| Steps with a discouraged panel | 3/6 | 3/6 |
| Routed to the key's playbook | 0/6 | 6/6 |
| Intake severity copies the feed tier | 3/3 | 1/3 |
| Distinct layouts | 5 | 5 |
| Failures | 0 | 0 |
| Mean latency | 15.9s | 31.9s |

Steps that changed (points before → after):

| # | Truth | Key | Baseline action | Variant action | Points |
|---|---|---|---|---|---|
| 6 | real | observe | contain | contain | 3 → 2.75 |
| 10 | real | contain | contain | evacuate | 6 → 5 |
| 24 | real | observe | contain | evacuate | 2.75 → 2.75 |
