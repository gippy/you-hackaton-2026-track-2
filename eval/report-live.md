# Nightfall eval report — run live

Generated 2026-10-28 15:02 · pipeline hash `1f473642d7` · sky input on · scenario `fixtures/nightfall/scenario.json` · answer key `fixtures/nightfall/answer-key.json`

Model(s) seen: parasail-minimax-m31-flash · steps run: 24 · failures: 0

Dispatch is scored from `recommended_action` (observe = no dispatch). The pipeline itself never posts; nothing was sent to Discord or PagerDuty.

## Score: 133.067 / 144 points (92%)

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
| Entity routed to the key's playbook (diagnostic, not scored) | 15/24 (62%); routed: corporeal ×15, anomalous ×8, spectral ×1 |
| Hot sector match (FloorPlan, else incident sector) | 24/24 (100%) |
| Hot sector match from the intake step alone | 24/24 (100%) |
| Seal set exact / route set exact (secondary, not scored) | 15/24 (62%) / 7/24 (29%) |
| Panel recall, mean | 92% (all expected present on 20/24 steps) |
| Discouraged panels present | 2 panels on 2/24 steps |
| Panels the key neither expects nor discourages | SkyClock ×15, SystemsBoard ×5, SourceLedger ×5, EntityCard ×4 (neutral) |
| Layout variety (distinct panel sets) | 15 distinct in 24 runs; the key itself expects 13 |
| Most common layout | CivilianTracker, CountermeasurePicker, FloorPlan, SkyClock, SourceLedger, SystemsBoard, ThermalReadout, ThreatBanner on 5/24 steps |
| Mean pairwise layout distance (Jaccard, 0 = identical) | 0.43 |
| Failures (bad JSON, timeout, empty output) | 0/24 |
| Latency per step (wall) | mean 17.0s · median 14.3s · p95 31.4s · max 32.9s |
| Mean phase time inside the flow | ingest 4.0s · ground 7.7s · compose 3.6s |
| Time to first / last component on the wire | 14.6s / 16.3s |

## Action confusion (rows = key, columns = model)

| key \ model | observe | contain | evacuate |
|---|---|---|---|
| observe | 9 | 1 | 0 |
| contain | 1 | 8 | 1 |
| evacuate | 0 | 2 | 2 |

## Per step

Truth: R real, H harmless. Hot is the FloorPlan hot sector, or the intake sector when there is no FloorPlan. Δ panels: `-X` is an expected panel that is missing, `!X` a discouraged panel that is present.

| # | Time | Feed tier | Truth | Key action | Model action | Disp | Hot (model → key) | Recall | Panels (model) | Δ panels | Playbook | Sound | Lat s | Pts |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 11:20 | ELEVATED_HAUNT | H | observe | observe ✓ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, SourceLedger, ThermalReadout, EntityCard, SystemsBoard | – | corporeal | all_clear | 13 | 6/6 |
| 2 | 12:10 | UNVERIFIED | R | observe | observe ✓ | ✓ | lounge ✓ → lounge | 100% | ThreatBanner, SourceLedger, FloorPlan, CivilianTracker, ThermalReadout, SkyClock | !CivilianTracker | anomalous ✗ | sting_ghost | 15 | 5/6 |
| 3 | 12:50 | LOW_HAUNT | R | observe | observe ✓ | ✓ | lounge ✓ → lounge | 100% | ThreatBanner, ThermalReadout, FloorPlan, CivilianTracker, SkyClock, SourceLedger | – | anomalous ✗ | sting_residual_haunting | 18 | 6/6 |
| 4 | 13:05 | UNVERIFIED | H | observe | observe ✓ | ✓ | catering ✓ → catering | 100% | ThreatBanner, SourceLedger, ThermalReadout | – | corporeal | all_clear | 12 | 6/6 |
| 5 | 14:20 | ELEVATED_HAUNT | R | contain (D) | evacuate ✗ | ✓ | hack_floor_west ✓ → hack_floor_west | 100% | ThreatBanner, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, SkyClock | – | corporeal | sting_vampire | 13 | 5/6 |
| 6 | 15:05 | UNVERIFIED | R | observe | observe ✓ | ✓ | registration ✓ → registration | 100% | ThreatBanner, SourceLedger, ThermalReadout, SystemsBoard | – | corporeal | all_clear | 14 | 6/6 |
| 7 | 15:50 | LOW_HAUNT | R | observe | observe ✓ | ✓ | hack_floor_east ✓ → hack_floor_east | 75% | ThreatBanner, SourceLedger, ThermalReadout, EntityCard | -CivilianTracker | anomalous ✗ | all_clear | 15 | 5.75/6 |
| 8 | 16:40 | CRITICAL_HAUNT | H | observe | observe ✓ | ✓ | network_closet ✓ → network_closet | 67% | ThreatBanner, SourceLedger, SystemsBoard | -EMFGauge | anomalous ✗ | all_clear | 23 | 5.667/6 |
| 9 | 17:10 | ELEVATED_HAUNT | R | contain (D) | observe ✗ | ✗ | hack_floor_east ✓ → hack_floor_east | 25% | ThreatBanner, SourceLedger, ThermalReadout | -FloorPlan -CivilianTracker -CountermeasurePicker | corporeal | all_clear | 31 | 3.25/6 |
| 10 | 17:40 | CRITICAL_HAUNT | R | contain (D) | contain ✓ | ✓ | lounge ✓ → lounge | 100% | ThreatBanner, SkyClock, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SourceLedger | – | corporeal | sting_vampire | 24 | 6/6 |
| 11 | 18:00 | LOW_HAUNT | H | observe | observe ✓ | ✓ | hack_floor_west ✓ → hack_floor_west | 100% | ThreatBanner, SourceLedger, ThermalReadout | – | anomalous ✗ | all_clear | 13 | 6/6 |
| 12 | 18:15 | CRITICAL_HAUNT | R | evacuate (D) | contain ✗ | ✓ | hack_floor_west ✓ → hack_floor_west/lounge | 100% | ThreatBanner, SourceLedger, FloorPlan, CivilianTracker, ThermalReadout, SystemsBoard, CountermeasurePicker, SkyClock | – | corporeal | sting_ghost | 22 | 5/6 |
| 13 | 18:25 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, SourceLedger, FloorPlan, CivilianTracker, CountermeasurePicker, SkyClock, ThermalReadout | – | corporeal | sting_vampire | 25 | 6/6 |
| 14 | 18:40 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | catering ✓ → catering | 100% | ThreatBanner, FloorPlan, CivilianTracker, CountermeasurePicker, SkyClock, SourceLedger | – | corporeal | sting_ghost | 13 | 6/6 |
| 15 | 18:55 | LOW_HAUNT | R | contain (D) | contain ✓ | ✓ | hack_floor_east ✓ → hack_floor_east | 100% | ThreatBanner, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SkyClock, SourceLedger, EntityCard | – | spectral ✗ | sting_ghost | 15 | 6/6 |
| 16 | 19:10 | CRITICAL_HAUNT | R | contain (D) | contain ✓ | ✓ | network_closet ✓ → network_closet | 100% | ThreatBanner, SourceLedger, SystemsBoard, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker | – | anomalous ✗ | alert_chime | 12 | 6/6 |
| 17 | 19:20 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, SkyClock, FloorPlan, CivilianTracker, SystemsBoard, CountermeasurePicker, SourceLedger | – | corporeal | sting_will_o_wisp | 14 | 6/6 |
| 18 | 19:33 | ELEVATED_HAUNT | H | observe | observe ✓ | ✓ | main_stage ✓ → main_stage | 100% | ThreatBanner, SourceLedger, EntityCard, SystemsBoard | – | corporeal | all_clear | 13 | 6/6 |
| 19 | 19:46 | CRITICAL_HAUNT | R | evacuate (D) | contain ✗ | ✓ | main_stage ✓ → main_stage | 100% | ThreatBanner, CivilianTracker, FloorPlan, ThermalReadout, SystemsBoard, SkyClock, CountermeasurePicker, SourceLedger | – | anomalous ✗ | sting_ghost | 17 | 5/6 |
| 20 | 19:55 | CRITICAL_HAUNT | R | evacuate (D) | evacuate ✓ | ✓ | main_stage ✓ → main_stage | 100% | ThreatBanner, SkyClock, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, SourceLedger | – | corporeal | sting_werewolf | 12 | 6/6 |
| 21 | 20:02 | CRITICAL_HAUNT | R | evacuate (D) | evacuate ✓ | ✓ | main_stage ✓ → main_stage | 100% | ThreatBanner, SkyClock, ThermalReadout, FloorPlan, CivilianTracker, SystemsBoard, CountermeasurePicker, SourceLedger | – | corporeal | sting_werewolf | 10 | 6/6 |
| 22 | 20:10 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | main_stage ✓ → main_stage | 40% | ThreatBanner, SkyClock, ThermalReadout | -CivilianTracker -CountermeasurePicker -SystemsBoard | corporeal | sting_werewolf | 14 | 5.4/6 |
| 23 | 20:18 | LOW_HAUNT | R | contain (D) | contain ✓ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, FloorPlan, CivilianTracker, ThermalReadout, SystemsBoard, CountermeasurePicker, SkyClock, SourceLedger | – | corporeal | sting_vampire | 33 | 6/6 |
| 24 | 20:26 | UNVERIFIED | R | observe | contain ✗ | ✗ | hack_floor_east ✓ → hack_floor_east | 100% | ThreatBanner, CivilianTracker, FloorPlan, ThermalReadout, SkyClock, CountermeasurePicker, SourceLedger | !CountermeasurePicker | anomalous ✗ | sting_werewolf | 14 | 3/6 |

## Where the points went

| Criterion | Points lost | Steps |
|---|---|---|
| action | 5.00 | 5, 9, 12, 19, 24 |
| dispatch | 2.00 | 9, 24 |
| hot | 0.00 | – |
| recall | 1.93 | 7 (-0.25), 8 (-0.33), 9 (-0.75), 22 (-0.60) |
| no_discouraged | 2.00 | 2, 24 |
| no_failure | 0.00 | – |

- **misses (acting step, observed)**: steps 9
- **over-escalations (real/observe step, acted)**: steps 24
- **contain↔evacuate mismatches**: steps 5, 12, 19
- **expected panels most often missing**: CivilianTracker ×3 (steps 7, 9, 22); CountermeasurePicker ×2 (steps 9, 22); EMFGauge ×1 (steps 8); FloorPlan ×1 (steps 9); SystemsBoard ×1 (steps 22)
- **discouraged panels most often present**: CivilianTracker ×1 (steps 2); CountermeasurePicker ×1 (steps 24)
- **pipeline notes**: dropped a safe route that walks through walls ×3; dropped an EMFGauge showing an ordinary reading ×1; someone acted deliberately, so the harmless verd… ×1

## Against the baseline (eval/baseline/results.jsonl)

| Metric | Baseline | This run |
|---|---|---|
| Points | 114/144 | 133.067/144 |
| False alarms (harmless, acted) | 3/5 | 0/5 |
| Harmless handled calmly | 0/5 | 5/5 |
| Harmless with `all_clear` | 1/5 | 5/5 |
| Misses | 0/14 | 1/14 |
| Over-escalations | 4/5 | 1/5 |
| Action match | 13/24 | 19/24 |
| Dispatch match | 17/24 | 22/24 |
| Hot sector match | 23/24 | 24/24 |
| Panel recall, mean | 92% | 92% |
| Steps with a discouraged panel | 9/24 | 2/24 |
| Routed to the key's playbook | 3/24 | 15/24 |
| Intake severity copies the feed tier | 20/20 | 10/20 |
| Distinct layouts | 12 | 15 |
| Failures | 0 | 0 |
| Mean latency | 14.7s | 17.0s |

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
| 9 | real | contain | contain | observe | 6 → 3.25 |
| 11 | harmless | observe | observe | observe | 5 → 6 |
| 13 | real | contain | contain | contain | 5 → 6 |
| 18 | harmless | observe | contain | observe | 2.5 → 6 |
| 20 | real | evacuate | contain | evacuate | 5 → 6 |
| 21 | real | evacuate | contain | evacuate | 5 → 6 |
| 22 | real | contain | contain | contain | 6 → 5.4 |
| 24 | real | observe | contain | contain | 2.75 → 3 |
