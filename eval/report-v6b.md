# Nightfall eval report — variant v6 — run v6b

Generated 2026-10-28 14:55 · pipeline hash `292a86b6ff` · sky input on · scenario `fixtures/nightfall/scenario.json` · answer key `fixtures/nightfall/answer-key.json`

Model(s) seen: parasail-minimax-m31-flash · steps run: 24 · failures: 0

Dispatch is scored from `recommended_action` (observe = no dispatch). The pipeline itself never posts; nothing was sent to Discord or PagerDuty.

## Score: 128.017 / 144 points (89%)

Per step, one point each for: action match, dispatch match, hot-sector match, panel recall (fractional), no discouraged panel, no failure.

## Metrics

| Metric | Result |
|---|---|
| False alarms (harmless step, model acts or dispatches) | 0/5 |
| Harmless handled calmly (observe, low banner, no discouraged panel) | 5/5 (100%) |
| Harmless with the `all_clear` sound cue | 5/5 (100%) |
| Misses (key says contain/evacuate, model observes) | 1/14 |
| Over-escalation (real but key says observe, model acts) | 3/5 |
| Action match | 17/24 (71%) |
| of which called too low / too high (contain vs evacuate) | 2 / 1 |
| Dispatch match | 20/24 (83%) |
| Intake severity equals the feed's tier label (diagnostic: the model reads the label, not the text) | 10/20 (50%) of the steps with a LOW/ELEVATED/CRITICAL tier |
| Entity routed to the key's playbook (diagnostic, not scored) | 17/24 (71%); routed: corporeal ×17, anomalous ×5, spectral ×2 |
| Hot sector match (FloorPlan, else incident sector) | 24/24 (100%) |
| Hot sector match from the intake step alone | 24/24 (100%) |
| Seal set exact / route set exact (secondary, not scored) | 12/24 (50%) / 7/24 (29%) |
| Panel recall, mean | 88% (all expected present on 16/24 steps) |
| Discouraged panels present | 2 panels on 2/24 steps |
| Panels the key neither expects nor discourages | SkyClock ×10, EntityCard ×8, SourceLedger ×6, SystemsBoard ×3 (neutral) |
| Layout variety (distinct panel sets) | 15 distinct in 24 runs; the key itself expects 13 |
| Most common layout | CivilianTracker, CountermeasurePicker, FloorPlan, SkyClock, SourceLedger, ThermalReadout, ThreatBanner on 3/24 steps |
| Mean pairwise layout distance (Jaccard, 0 = identical) | 0.47 |
| Failures (bad JSON, timeout, empty output) | 0/24 |
| Latency per step (wall) | mean 15.7s · median 15.1s · p95 27.0s · max 31.1s |
| Mean phase time inside the flow | ingest 3.0s · ground 8.3s · compose 2.7s |
| Time to first / last component on the wire | 13.6s / 15.1s |

## Action confusion (rows = key, columns = model)

| key \ model | observe | contain | evacuate |
|---|---|---|---|
| observe | 7 | 3 | 0 |
| contain | 1 | 8 | 1 |
| evacuate | 0 | 2 | 2 |

## Per step

Truth: R real, H harmless. Hot is the FloorPlan hot sector, or the intake sector when there is no FloorPlan. Δ panels: `-X` is an expected panel that is missing, `!X` a discouraged panel that is present.

| # | Time | Feed tier | Truth | Key action | Model action | Disp | Hot (model → key) | Recall | Panels (model) | Δ panels | Playbook | Sound | Lat s | Pts |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 11:20 | ELEVATED_HAUNT | H | observe | observe ✓ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, SourceLedger, EntityCard | – | corporeal | all_clear | 27 | 6/6 |
| 2 | 12:10 | UNVERIFIED | R | observe | contain ✗ | ✗ | lounge ✓ → lounge | 75% | ThreatBanner, SourceLedger, FloorPlan, CivilianTracker, SystemsBoard, CountermeasurePicker | -ThermalReadout !CivilianTracker | anomalous ✗ | sting_residual_haunting | 17 | 2.75/6 |
| 3 | 12:50 | LOW_HAUNT | R | observe | contain ✗ | ✗ | lounge ✓ → lounge | 100% | ThreatBanner, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SourceLedger | – | spectral ✗ | sting_ghost | 17 | 4/6 |
| 4 | 13:05 | UNVERIFIED | H | observe | observe ✓ | ✓ | catering ✓ → catering | 100% | ThreatBanner, SourceLedger, ThermalReadout, EntityCard | – | corporeal | all_clear | 12 | 6/6 |
| 5 | 14:20 | ELEVATED_HAUNT | R | contain (D) | evacuate ✗ | ✓ | hack_floor_west ✓ → hack_floor_west | 100% | ThreatBanner, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SkyClock, EntityCard | – | corporeal | sting_vampire | 16 | 5/6 |
| 6 | 15:05 | UNVERIFIED | R | observe | observe ✓ | ✓ | registration ✓ → registration | 75% | ThreatBanner, SourceLedger, ThermalReadout | -SystemsBoard | anomalous ✗ | all_clear | 12 | 5.75/6 |
| 7 | 15:50 | LOW_HAUNT | R | observe | observe ✓ | ✓ | hack_floor_east ✓ → hack_floor_east | 75% | ThreatBanner, SourceLedger, ThermalReadout | -CivilianTracker | anomalous ✗ | all_clear | 14 | 5.75/6 |
| 8 | 16:40 | CRITICAL_HAUNT | H | observe | observe ✓ | ✓ | network_closet ✓ → network_closet | 67% | ThreatBanner, SourceLedger, SystemsBoard | -EMFGauge | anomalous ✗ | all_clear | 10 | 5.667/6 |
| 9 | 17:10 | ELEVATED_HAUNT | R | contain (D) | observe ✗ | ✗ | hack_floor_east ✓ → hack_floor_east | 75% | ThreatBanner, SourceLedger, FloorPlan, CivilianTracker, SkyClock, EntityCard | -CountermeasurePicker | corporeal | sting_vampire | 14 | 3.75/6 |
| 10 | 17:40 | CRITICAL_HAUNT | R | contain (D) | contain ✓ | ✓ | lounge ✓ → lounge | 40% | ThreatBanner, EntityCard, ThermalReadout | -FloorPlan -CivilianTracker -CountermeasurePicker | corporeal | sting_vampire | 31 | 5.4/6 |
| 11 | 18:00 | LOW_HAUNT | H | observe | observe ✓ | ✓ | hack_floor_west ✓ → hack_floor_west | 100% | ThreatBanner, SourceLedger, ThermalReadout, EntityCard | – | corporeal | all_clear | 11 | 6/6 |
| 12 | 18:15 | CRITICAL_HAUNT | R | evacuate (D) | contain ✗ | ✓ | hack_floor_west ✓ → hack_floor_west/lounge | 100% | ThreatBanner, FloorPlan, CivilianTracker, ThermalReadout, CountermeasurePicker, SkyClock, SourceLedger | – | corporeal | sting_vampire | 15 | 5/6 |
| 13 | 18:25 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, CivilianTracker, FloorPlan, CountermeasurePicker, ThermalReadout, SkyClock, SourceLedger | – | corporeal | sting_vampire | 16 | 6/6 |
| 14 | 18:40 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | catering ✓ → catering | 100% | ThreatBanner, SourceLedger, FloorPlan, CivilianTracker, CountermeasurePicker, SkyClock | – | corporeal | sting_vampire | 13 | 6/6 |
| 15 | 18:55 | LOW_HAUNT | R | contain (D) | contain ✓ | ✓ | hack_floor_east ✓ → hack_floor_east | 100% | ThreatBanner, CivilianTracker, SkyClock, ThermalReadout, FloorPlan, CountermeasurePicker, SourceLedger | – | corporeal | sting_werewolf | 16 | 6/6 |
| 16 | 19:10 | CRITICAL_HAUNT | R | contain (D) | contain ✓ | ✓ | network_closet ✓ → network_closet | 100% | ThreatBanner, SourceLedger, SystemsBoard, CivilianTracker, FloorPlan, CountermeasurePicker | – | anomalous ✗ | alert_chime | 15 | 6/6 |
| 17 | 19:20 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, SourceLedger | – | corporeal | sting_vampire | 19 | 6/6 |
| 18 | 19:33 | ELEVATED_HAUNT | H | observe | observe ✓ | ✓ | main_stage ✓ → main_stage | 100% | ThreatBanner, SourceLedger, ThermalReadout, SystemsBoard, EntityCard | – | corporeal | all_clear | 11 | 6/6 |
| 19 | 19:46 | CRITICAL_HAUNT | R | evacuate (D) | contain ✗ | ✓ | main_stage ✓ → main_stage | 100% | ThreatBanner, SourceLedger, CivilianTracker, FloorPlan, ThermalReadout, SystemsBoard, SkyClock, CountermeasurePicker | – | spectral ✗ | sting_ghost | 22 | 5/6 |
| 20 | 19:55 | CRITICAL_HAUNT | R | evacuate (D) | evacuate ✓ | ✓ | main_stage ✓ → main_stage | 100% | ThreatBanner, CivilianTracker, FloorPlan, ThermalReadout, SystemsBoard, CountermeasurePicker, SkyClock, SourceLedger | – | corporeal | sting_vampire | 10 | 6/6 |
| 21 | 20:02 | CRITICAL_HAUNT | R | evacuate (D) | evacuate ✓ | ✓ | main_stage ✓ → main_stage | 100% | ThreatBanner, SkyClock, ThermalReadout, FloorPlan, CivilianTracker, SystemsBoard, CountermeasurePicker, SourceLedger | – | corporeal | sting_werewolf | 16 | 6/6 |
| 22 | 20:10 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | main_stage ✓ → main_stage | 100% | ThreatBanner, EntityCard, FloorPlan, CivilianTracker, ThermalReadout, SystemsBoard, CountermeasurePicker, SourceLedger | – | corporeal | sting_werewolf | 14 | 6/6 |
| 23 | 20:18 | LOW_HAUNT | R | contain (D) | contain ✓ | ✓ | entrance ✓ → entrance | 20% | ThreatBanner, SourceLedger, ThermalReadout | -FloorPlan -SystemsBoard -CountermeasurePicker -CivilianTracker | corporeal | sting_vampire | 17 | 5.2/6 |
| 24 | 20:26 | UNVERIFIED | R | observe | contain ✗ | ✗ | hack_floor_east ✓ → hack_floor_east | 75% | ThreatBanner, SkyClock, FloorPlan, CivilianTracker, CountermeasurePicker, SourceLedger | -ThermalReadout !CountermeasurePicker | corporeal | sting_werewolf | 11 | 2.75/6 |

## Where the points went

| Criterion | Points lost | Steps |
|---|---|---|
| action | 7.00 | 2, 3, 5, 9, 12, 19, 24 |
| dispatch | 4.00 | 2, 3, 9, 24 |
| hot | 0.00 | – |
| recall | 2.98 | 2 (-0.25), 6 (-0.25), 7 (-0.25), 8 (-0.33), 9 (-0.25), 10 (-0.60), 23 (-0.80), 24 (-0.25) |
| no_discouraged | 2.00 | 2, 24 |
| no_failure | 0.00 | – |

- **misses (acting step, observed)**: steps 9
- **over-escalations (real/observe step, acted)**: steps 2, 3, 24
- **contain↔evacuate mismatches**: steps 5, 12, 19
- **expected panels most often missing**: CivilianTracker ×3 (steps 7, 10, 23); CountermeasurePicker ×3 (steps 9, 10, 23); ThermalReadout ×2 (steps 2, 24); SystemsBoard ×2 (steps 6, 23); FloorPlan ×2 (steps 10, 23); EMFGauge ×1 (steps 8)
- **discouraged panels most often present**: CivilianTracker ×1 (steps 2); CountermeasurePicker ×1 (steps 24)
- **pipeline notes**: dropped an EMFGauge showing an ordinary reading ×2; the report says the threat has ended: observe an… ×1

## Against the baseline (eval/baseline/results.jsonl)

| Metric | Baseline | This run |
|---|---|---|
| Points | 114/144 | 128.017/144 |
| False alarms (harmless, acted) | 3/5 | 0/5 |
| Harmless handled calmly | 0/5 | 5/5 |
| Harmless with `all_clear` | 1/5 | 5/5 |
| Misses | 0/14 | 1/14 |
| Over-escalations | 4/5 | 3/5 |
| Action match | 13/24 | 17/24 |
| Dispatch match | 17/24 | 20/24 |
| Hot sector match | 23/24 | 24/24 |
| Panel recall, mean | 92% | 88% |
| Steps with a discouraged panel | 9/24 | 2/24 |
| Routed to the key's playbook | 3/24 | 17/24 |
| Intake severity copies the feed tier | 20/20 | 10/20 |
| Distinct layouts | 12 | 15 |
| Failures | 0 | 0 |
| Mean latency | 14.7s | 15.7s |

Steps that changed (points before → after):

| # | Truth | Key | Baseline action | Variant action | Points |
|---|---|---|---|---|---|
| 1 | harmless | observe | contain | observe | 2.5 → 6 |
| 4 | harmless | observe | observe | observe | 4.5 → 6 |
| 5 | real | contain | contain | evacuate | 5 → 5 |
| 6 | real | observe | contain | observe | 3 → 5.75 |
| 7 | real | observe | observe | observe | 6 → 5.75 |
| 8 | harmless | observe | contain | observe | 3 → 5.667 |
| 9 | real | contain | contain | observe | 6 → 3.75 |
| 10 | real | contain | contain | contain | 6 → 5.4 |
| 11 | harmless | observe | observe | observe | 5 → 6 |
| 13 | real | contain | contain | contain | 5 → 6 |
| 18 | harmless | observe | contain | observe | 2.5 → 6 |
| 20 | real | evacuate | contain | evacuate | 5 → 6 |
| 21 | real | evacuate | contain | evacuate | 5 → 6 |
| 23 | real | contain | contain | contain | 6 → 5.2 |
