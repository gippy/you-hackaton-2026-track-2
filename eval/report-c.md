# Nightfall eval report — run c

Generated 2026-10-28 15:21 · pipeline hash `a57d1180b5` · sky input on · scenario `fixtures/nightfall/scenario.json` · answer key `fixtures/nightfall/answer-key.json`

Model(s) seen: parasail-minimax-m31-flash · steps run: 24 · failures: 0

Dispatch is scored from `recommended_action` (observe = no dispatch). The pipeline itself never posts; nothing was sent to Discord or PagerDuty.

## Score: 134.167 / 144 points (93%)

Per step, one point each for: action match, dispatch match, hot-sector match, panel recall (fractional), no discouraged panel, no failure.

## Metrics

| Metric | Result |
|---|---|
| False alarms (harmless step, model acts or dispatches) | 0/5 |
| Harmless handled calmly (observe, low banner, no discouraged panel) | 5/5 (100%) |
| Harmless with the `all_clear` sound cue | 5/5 (100%) |
| Misses (key says contain/evacuate, model observes) | 1/14 |
| Over-escalation (real but key says observe, model acts) | 1/5 |
| Action match | 19/24 (79%) |
| of which called too low / too high (contain vs evacuate) | 2 / 1 |
| Dispatch match | 22/24 (92%) |
| Intake severity equals the feed's tier label (diagnostic: the model reads the label, not the text) | 10/20 (50%) of the steps with a LOW/ELEVATED/CRITICAL tier |
| Entity routed to the key's playbook (diagnostic, not scored) | 15/24 (62%); routed: corporeal ×15, anomalous ×5, spectral ×4 |
| Hot sector match (FloorPlan, else incident sector) | 24/24 (100%) |
| Hot sector match from the intake step alone | 24/24 (100%) |
| Seal set exact / route set exact (secondary, not scored) | 16/24 (67%) / 6/24 (25%) |
| Panel recall, mean | 97% (all expected present on 21/24 steps) |
| Discouraged panels present | 2 panels on 2/24 steps |
| Panels the key neither expects nor discourages | SkyClock ×12, SystemsBoard ×7, EntityCard ×5, SourceLedger ×5, CivilianTracker ×1, ThermalReadout ×1 (neutral) |
| Layout variety (distinct panel sets) | 15 distinct in 24 runs; the key itself expects 13 |
| Most common layout | CivilianTracker, CountermeasurePicker, FloorPlan, SkyClock, SourceLedger, SystemsBoard, ThermalReadout, ThreatBanner on 5/24 steps |
| Mean pairwise layout distance (Jaccard, 0 = identical) | 0.39 |
| Failures (bad JSON, timeout, empty output) | 0/24 |
| Latency per step (wall) | mean 14.1s · median 14.0s · p95 19.0s · max 19.2s |
| Mean phase time inside the flow | ingest 2.9s · ground 6.9s · compose 2.8s |
| Time to first / last component on the wire | 12.0s / 13.5s |

## Action confusion (rows = key, columns = model)

| key \ model | observe | contain | evacuate |
|---|---|---|---|
| observe | 9 | 0 | 1 |
| contain | 1 | 8 | 1 |
| evacuate | 0 | 2 | 2 |

## Per step

Truth: R real, H harmless. Hot is the FloorPlan hot sector, or the intake sector when there is no FloorPlan. Δ panels: `-X` is an expected panel that is missing, `!X` a discouraged panel that is present.

| # | Time | Feed tier | Truth | Key action | Model action | Disp | Hot (model → key) | Recall | Panels (model) | Δ panels | Playbook | Sound | Lat s | Pts |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 11:20 | ELEVATED_HAUNT | H | observe | observe ✓ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, SourceLedger, ThermalReadout | – | corporeal | all_clear | 11 | 6/6 |
| 2 | 12:10 | UNVERIFIED | R | observe | observe ✓ | ✓ | lounge ✓ → lounge | 100% | ThreatBanner, SourceLedger, ThermalReadout, FloorPlan, CivilianTracker, SystemsBoard | !CivilianTracker | anomalous ✗ | alert_chime | 14 | 5/6 |
| 3 | 12:50 | LOW_HAUNT | R | observe | observe ✓ | ✓ | lounge ✓ → lounge | 100% | ThreatBanner, ThermalReadout, FloorPlan, CivilianTracker, SourceLedger | – | spectral ✗ | sting_ghost | 19 | 6/6 |
| 4 | 13:05 | UNVERIFIED | H | observe | observe ✓ | ✓ | catering ✓ → catering | 100% | ThreatBanner, SourceLedger, ThermalReadout, EntityCard | – | corporeal | all_clear | 14 | 6/6 |
| 5 | 14:20 | ELEVATED_HAUNT | R | contain (D) | evacuate ✗ | ✓ | hack_floor_west ✓ → hack_floor_west | 100% | ThreatBanner, FloorPlan, CivilianTracker, EntityCard, SystemsBoard, CountermeasurePicker, SkyClock, SourceLedger | – | corporeal | sting_vampire | 13 | 5/6 |
| 6 | 15:05 | UNVERIFIED | R | observe | observe ✓ | ✓ | registration ✓ → registration | 100% | ThreatBanner, SourceLedger, ThermalReadout, FloorPlan, CivilianTracker, SystemsBoard, SkyClock | – | anomalous ✗ | sting_ghost | 13 | 6/6 |
| 7 | 15:50 | LOW_HAUNT | R | observe | observe ✓ | ✓ | hack_floor_east ✓ → hack_floor_east | 75% | ThreatBanner, SourceLedger, ThermalReadout | -CivilianTracker | anomalous ✗ | all_clear | 12 | 5.75/6 |
| 8 | 16:40 | CRITICAL_HAUNT | H | observe | observe ✓ | ✓ | network_closet ✓ → network_closet | 67% | ThreatBanner, SourceLedger, SystemsBoard | -EMFGauge | anomalous ✗ | all_clear | 14 | 5.667/6 |
| 9 | 17:10 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | hack_floor_east ✓ → hack_floor_east | 100% | ThreatBanner, SkyClock, FloorPlan, CivilianTracker, ThermalReadout, SystemsBoard, CountermeasurePicker, SourceLedger | – | corporeal | sting_vampire | 15 | 6/6 |
| 10 | 17:40 | CRITICAL_HAUNT | R | contain (D) | contain ✓ | ✓ | lounge ✓ → lounge | 100% | ThreatBanner, SkyClock, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SourceLedger | – | corporeal | sting_vampire | 16 | 6/6 |
| 11 | 18:00 | LOW_HAUNT | H | observe | observe ✓ | ✓ | hack_floor_west ✓ → hack_floor_west | 100% | ThreatBanner, SourceLedger, ThermalReadout, EntityCard | – | spectral ✗ | all_clear | 13 | 6/6 |
| 12 | 18:15 | CRITICAL_HAUNT | R | evacuate (D) | contain ✗ | ✓ | hack_floor_west ✓ → hack_floor_west/lounge | 100% | ThreatBanner, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, SourceLedger | – | corporeal | sting_vampire | 14 | 5/6 |
| 13 | 18:25 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, SourceLedger | – | corporeal | sting_vampire | 15 | 6/6 |
| 14 | 18:40 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | catering ✓ → catering | 100% | ThreatBanner, FloorPlan, CivilianTracker, ThermalReadout, CountermeasurePicker, SourceLedger | – | corporeal | sting_vampire | 14 | 6/6 |
| 15 | 18:55 | LOW_HAUNT | R | contain (D) | contain ✓ | ✓ | hack_floor_east ✓ → hack_floor_east | 75% | ThreatBanner, SkyClock, FloorPlan, CivilianTracker, CountermeasurePicker, SourceLedger | -ThermalReadout | spectral ✗ | sting_ghost | 13 | 5.75/6 |
| 16 | 19:10 | CRITICAL_HAUNT | R | contain (D) | observe ✗ | ✗ | network_closet ✓ → network_closet | 100% | ThreatBanner, SourceLedger, ThermalReadout, SystemsBoard, CivilianTracker, FloorPlan | – | anomalous ✗ | alert_chime | 11 | 4/6 |
| 17 | 19:20 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, SkyClock, CivilianTracker, FloorPlan, SystemsBoard, CountermeasurePicker, SourceLedger | – | corporeal | sting_vampire | 14 | 6/6 |
| 18 | 19:33 | ELEVATED_HAUNT | H | observe | observe ✓ | ✓ | main_stage ✓ → main_stage | 100% | ThreatBanner, SourceLedger, SystemsBoard, EntityCard | – | corporeal | all_clear | 12 | 6/6 |
| 19 | 19:46 | CRITICAL_HAUNT | R | evacuate (D) | contain ✗ | ✓ | main_stage ✓ → main_stage | 100% | ThreatBanner, CivilianTracker, FloorPlan, ThermalReadout, SystemsBoard, SkyClock, CountermeasurePicker, SourceLedger | – | spectral ✗ | sting_ghost | 16 | 5/6 |
| 20 | 19:55 | CRITICAL_HAUNT | R | evacuate (D) | evacuate ✓ | ✓ | main_stage ✓ → main_stage | 100% | ThreatBanner, SkyClock, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SourceLedger | – | corporeal | sting_werewolf | 11 | 6/6 |
| 21 | 20:02 | CRITICAL_HAUNT | R | evacuate (D) | evacuate ✓ | ✓ | main_stage ✓ → main_stage | 100% | ThreatBanner, CivilianTracker, FloorPlan, SystemsBoard, ThermalReadout, CountermeasurePicker, SkyClock, SourceLedger | – | corporeal | sting_werewolf | 19 | 6/6 |
| 22 | 20:10 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | main_stage ✓ → main_stage | 100% | ThreatBanner, FloorPlan, CivilianTracker, ThermalReadout, SystemsBoard, CountermeasurePicker, SkyClock, EntityCard | – | corporeal | sting_werewolf | 15 | 6/6 |
| 23 | 20:18 | LOW_HAUNT | R | contain (D) | contain ✓ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, SourceLedger, FloorPlan, CivilianTracker, ThermalReadout, SystemsBoard, CountermeasurePicker, SkyClock | – | corporeal | sting_vampire | 15 | 6/6 |
| 24 | 20:26 | UNVERIFIED | R | observe | evacuate ✗ | ✗ | hack_floor_east ✓ → hack_floor_east | 100% | ThreatBanner, SkyClock, FloorPlan, CivilianTracker, ThermalReadout, SystemsBoard, CountermeasurePicker, SourceLedger | !CountermeasurePicker | corporeal | sting_werewolf | 14 | 3/6 |

## Where the points went

| Criterion | Points lost | Steps |
|---|---|---|
| action | 5.00 | 5, 12, 16, 19, 24 |
| dispatch | 2.00 | 16, 24 |
| hot | 0.00 | – |
| recall | 0.83 | 7 (-0.25), 8 (-0.33), 15 (-0.25) |
| no_discouraged | 2.00 | 2, 24 |
| no_failure | 0.00 | – |

- **misses (acting step, observed)**: steps 16
- **over-escalations (real/observe step, acted)**: steps 24
- **contain↔evacuate mismatches**: steps 5, 12, 19
- **expected panels most often missing**: CivilianTracker ×1 (steps 7); EMFGauge ×1 (steps 8); ThermalReadout ×1 (steps 15)
- **discouraged panels most often present**: CivilianTracker ×1 (steps 2); CountermeasurePicker ×1 (steps 24)
- **pipeline notes**: dropped an EMFGauge showing an ordinary reading ×2; dropped a safe route that walks through walls ×2; someone acted deliberately, so the harmless verd… ×1

## Against the baseline (eval/baseline/results.jsonl)

| Metric | Baseline | This run |
|---|---|---|
| Points | 114/144 | 134.167/144 |
| False alarms (harmless, acted) | 3/5 | 0/5 |
| Harmless handled calmly | 0/5 | 5/5 |
| Harmless with `all_clear` | 1/5 | 5/5 |
| Misses | 0/14 | 1/14 |
| Over-escalations | 4/5 | 1/5 |
| Action match | 13/24 | 19/24 |
| Dispatch match | 17/24 | 22/24 |
| Hot sector match | 23/24 | 24/24 |
| Panel recall, mean | 92% | 97% |
| Steps with a discouraged panel | 9/24 | 2/24 |
| Routed to the key's playbook | 3/24 | 15/24 |
| Intake severity copies the feed tier | 20/20 | 10/20 |
| Distinct layouts | 12 | 15 |
| Failures | 0 | 0 |
| Mean latency | 14.7s | 14.1s |

Steps that changed (points before → after):

| # | Truth | Key | Baseline action | Variant action | Points |
|---|---|---|---|---|---|
| 1 | harmless | observe | contain | observe | 2.5 → 6 |
| 2 | real | observe | contain | observe | 2.75 → 5 |
| 3 | real | observe | contain | observe | 4 → 6 |
| 4 | harmless | observe | observe | observe | 4.5 → 6 |
| 5 | real | contain | contain | evacuate | 5 → 5 |
| 6 | real | observe | contain | observe | 3 → 6 |
| 7 | real | observe | observe | observe | 6 → 5.75 |
| 8 | harmless | observe | contain | observe | 3 → 5.667 |
| 11 | harmless | observe | observe | observe | 5 → 6 |
| 13 | real | contain | contain | contain | 5 → 6 |
| 15 | real | contain | contain | contain | 6 → 5.75 |
| 16 | real | contain | contain | observe | 6 → 4 |
| 18 | harmless | observe | contain | observe | 2.5 → 6 |
| 20 | real | evacuate | contain | evacuate | 5 → 6 |
| 21 | real | evacuate | contain | evacuate | 5 → 6 |
| 24 | real | observe | contain | evacuate | 2.75 → 3 |
