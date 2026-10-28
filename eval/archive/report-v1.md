# Nightfall eval report — variant v1

Generated 2026-10-28 13:26 · pipeline hash `5ae1a7039e` · sky input on · scenario `fixtures/nightfall/scenario.json` · answer key `fixtures/nightfall/answer-key.json`

Model(s) seen: parasail-minimax-m31-flash · steps run: 24 · failures: 0

Dispatch is scored from `recommended_action` (observe = no dispatch). The pipeline itself never posts; nothing was sent to Discord or PagerDuty.

## Score: 120.05 / 144 points (83%)

Per step, one point each for: action match, dispatch match, hot-sector match, panel recall (fractional), no discouraged panel, no failure.

## Metrics

| Metric | Result |
|---|---|
| False alarms (harmless step, model acts or dispatches) | 1/5 |
| Harmless handled calmly (observe, low banner, no discouraged panel) | 4/5 (80%) |
| Harmless with the `all_clear` sound cue | 4/5 (80%) |
| Misses (key says contain/evacuate, model observes) | 1/14 |
| Over-escalation (real but key says observe, model acts) | 5/5 |
| Action match | 15/24 (62%) |
| of which called too low / too high (contain vs evacuate) | 2 / 0 |
| Dispatch match | 17/24 (71%) |
| Intake severity equals the feed's tier label (diagnostic: the model reads the label, not the text) | 11/20 (55%) of the steps with a LOW/ELEVATED/CRITICAL tier |
| Entity routed to the key's playbook (diagnostic, not scored) | 17/24 (71%); routed: corporeal ×17, spectral ×4, anomalous ×3 |
| Hot sector match (FloorPlan, else incident sector) | 23/24 (96%) |
| Hot sector match from the intake step alone | 23/24 (96%) |
| Seal set exact / route set exact (secondary, not scored) | 7/24 (29%) / 4/24 (17%) |
| Panel recall, mean | 96% (all expected present on 21/24 steps) |
| Discouraged panels present | 7 panels on 6/24 steps |
| Panels the key neither expects nor discourages | SkyClock ×15, SystemsBoard ×7, SourceLedger ×6, CivilianTracker ×1, ThermalReadout ×1 (neutral) |
| Layout variety (distinct panel sets) | 10 distinct in 24 runs; the key itself expects 13 |
| Most common layout | CivilianTracker, CountermeasurePicker, FloorPlan, SkyClock, SourceLedger, ThermalReadout, ThreatBanner on 5/24 steps |
| Mean pairwise layout distance (Jaccard, 0 = identical) | 0.36 |
| Failures (bad JSON, timeout, empty output) | 0/24 |
| Latency per step (wall) | mean 16.9s · median 17.1s · p95 22.6s · max 22.6s |
| Mean phase time inside the flow | ingest 3.6s · ground 8.4s · compose 3.3s |
| Time to first / last component on the wire | 14.4s / 16.2s |

## Action confusion (rows = key, columns = model)

| key \ model | observe | contain | evacuate |
|---|---|---|---|
| observe | 4 | 6 | 0 |
| contain | 1 | 9 | 0 |
| evacuate | 0 | 2 | 2 |

## Per step

Truth: R real, H harmless. Hot is the FloorPlan hot sector, or the intake sector when there is no FloorPlan. Δ panels: `-X` is an expected panel that is missing, `!X` a discouraged panel that is present.

| # | Time | Feed tier | Truth | Key action | Model action | Disp | Hot (model → key) | Recall | Panels (model) | Δ panels | Playbook | Sound | Lat s | Pts |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 11:20 | ELEVATED_HAUNT | H | observe | observe ✓ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, SourceLedger, ThermalReadout | – | corporeal | all_clear | 18 | 6/6 |
| 2 | 12:10 | UNVERIFIED | R | observe | contain ✗ | ✗ | lounge ✓ → lounge | 100% | ThreatBanner, SourceLedger, ThermalReadout, SystemsBoard, FloorPlan, CivilianTracker, CountermeasurePicker | !CivilianTracker | anomalous ✗ | sting_ghost | 19 | 3/6 |
| 3 | 12:50 | LOW_HAUNT | R | observe | contain ✗ | ✗ | lounge ✓ → lounge | 100% | ThreatBanner, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SkyClock, SourceLedger | – | spectral ✗ | sting_ghost | 15 | 4/6 |
| 4 | 13:05 | UNVERIFIED | H | observe | observe ✓ | ✓ | catering ✓ → catering | 100% | ThreatBanner, SourceLedger, ThermalReadout | – | corporeal | all_clear | 12 | 6/6 |
| 5 | 14:20 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | hack_floor_west ✓ → hack_floor_west | 100% | ThreatBanner, EMFGauge, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, SkyClock | !EMFGauge | corporeal | sting_vampire | 20 | 5/6 |
| 6 | 15:05 | UNVERIFIED | R | observe | contain ✗ | ✗ | registration ✓ → registration | 100% | ThreatBanner, SourceLedger, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, SkyClock | !CountermeasurePicker | spectral ✗ | sting_ghost | 20 | 3/6 |
| 7 | 15:50 | LOW_HAUNT | R | observe | contain ✗ | ✗ | hack_floor_east ✓ → hack_floor_east | 100% | ThreatBanner, SourceLedger, ThermalReadout, SkyClock, CivilianTracker, FloorPlan, CountermeasurePicker | – | corporeal | sting_werewolf | 16 | 4/6 |
| 8 | 16:40 | CRITICAL_HAUNT | H | observe | contain ✗ | ✗ | network_closet ✓ → network_closet | 100% | ThreatBanner, EMFGauge, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, SourceLedger | !CountermeasurePicker !CivilianTracker | anomalous ✗ | sting_ghost | 16 | 3/6 |
| 9 | 17:10 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | hack_floor_east ✓ → hack_floor_east | 100% | ThreatBanner, SourceLedger, FloorPlan, CivilianTracker, SystemsBoard, CountermeasurePicker, SkyClock | – | corporeal | sting_vampire | 14 | 6/6 |
| 10 | 17:40 | CRITICAL_HAUNT | R | contain (D) | contain ✓ | ✓ | lounge ✓ → lounge | 100% | ThreatBanner, EMFGauge, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, SourceLedger | !EMFGauge | corporeal | sting_vampire | 12 | 5/6 |
| 11 | 18:00 | LOW_HAUNT | H | observe | observe ✓ | ✓ | hack_floor_west ✓ → hack_floor_west | 100% | ThreatBanner, SourceLedger, ThermalReadout | – | spectral ✗ | all_clear | 12 | 6/6 |
| 12 | 18:15 | CRITICAL_HAUNT | R | evacuate (D) | contain ✗ | ✓ | hack_floor_west ✓ → hack_floor_west/lounge | 100% | ThreatBanner, SourceLedger, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SkyClock | – | corporeal | sting_ghost | 17 | 5/6 |
| 13 | 18:25 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | network_closet ✗ → entrance | 100% | ThreatBanner, CivilianTracker, FloorPlan, CountermeasurePicker, SourceLedger, SkyClock | – | corporeal | sting_werewolf | 11 | 5/6 |
| 14 | 18:40 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | catering ✓ → catering | 100% | ThreatBanner, SkyClock, FloorPlan, CivilianTracker, ThermalReadout, SystemsBoard, CountermeasurePicker, SourceLedger | – | corporeal | sting_vampire | 18 | 6/6 |
| 15 | 18:55 | LOW_HAUNT | R | contain (D) | contain ✓ | ✓ | hack_floor_east ✓ → hack_floor_east | 100% | ThreatBanner, SkyClock, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SourceLedger | – | corporeal | sting_werewolf | 19 | 6/6 |
| 16 | 19:10 | CRITICAL_HAUNT | R | contain (D) | observe ✗ | ✗ | network_closet ✓ → network_closet | 50% | ThreatBanner, SourceLedger, SystemsBoard | -FloorPlan -CivilianTracker | anomalous ✗ | all_clear | 15 | 3.5/6 |
| 17 | 19:20 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, CivilianTracker, FloorPlan, SystemsBoard, CountermeasurePicker, SkyClock, SourceLedger | – | corporeal | sting_werewolf | 23 | 6/6 |
| 18 | 19:33 | ELEVATED_HAUNT | H | observe | observe ✓ | ✓ | main_stage ✓ → main_stage | 100% | ThreatBanner, SourceLedger, SystemsBoard | – | corporeal | all_clear | 17 | 6/6 |
| 19 | 19:46 | CRITICAL_HAUNT | R | evacuate (D) | contain ✗ | ✓ | main_stage ✓ → main_stage | 100% | ThreatBanner, CivilianTracker, FloorPlan, ThermalReadout, SystemsBoard, CountermeasurePicker, SkyClock, SourceLedger | – | spectral ✗ | sting_ghost | 15 | 5/6 |
| 20 | 19:55 | CRITICAL_HAUNT | R | evacuate (D) | evacuate ✓ | ✓ | main_stage ✓ → main_stage | 100% | ThreatBanner, SkyClock, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SourceLedger | – | corporeal | sting_vampire | 16 | 6/6 |
| 21 | 20:02 | CRITICAL_HAUNT | R | evacuate (D) | evacuate ✓ | ✓ | main_stage ✓ → main_stage | 80% | ThreatBanner, CivilianTracker, FloorPlan, SystemsBoard, CountermeasurePicker, SkyClock, SourceLedger | -ThermalReadout | corporeal | sting_werewolf | 19 | 5.8/6 |
| 22 | 20:10 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | main_stage ✓ → main_stage | 100% | ThreatBanner, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, SourceLedger | – | corporeal | sting_werewolf | 23 | 6/6 |
| 23 | 20:18 | LOW_HAUNT | R | contain (D) | contain ✓ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, SourceLedger, ThermalReadout, SystemsBoard, CountermeasurePicker, SkyClock, FloorPlan, CivilianTracker | – | corporeal | sting_vampire | 20 | 6/6 |
| 24 | 20:26 | UNVERIFIED | R | observe | contain ✗ | ✗ | hack_floor_east ✓ → hack_floor_east | 75% | ThreatBanner, CivilianTracker, FloorPlan, CountermeasurePicker, SystemsBoard, SkyClock, SourceLedger | -ThermalReadout !CountermeasurePicker | corporeal | sting_werewolf | 21 | 2.75/6 |

## Where the points went

| Criterion | Points lost | Steps |
|---|---|---|
| action | 9.00 | 2, 3, 6, 7, 8, 12, 16, 19, 24 |
| dispatch | 7.00 | 2, 3, 6, 7, 8, 16, 24 |
| hot | 1.00 | 13 |
| recall | 0.95 | 16 (-0.50), 21 (-0.20), 24 (-0.25) |
| no_discouraged | 6.00 | 2, 5, 6, 8, 10, 24 |
| no_failure | 0.00 | – |

- **false alarms (harmless, acted)**: steps 8
- **misses (acting step, observed)**: steps 16
- **over-escalations (real/observe step, acted)**: steps 2, 3, 6, 7, 24
- **contain↔evacuate mismatches**: steps 12, 19
- **alarmist harmless layout**: steps 8
- **expected panels most often missing**: ThermalReadout ×2 (steps 21, 24); FloorPlan ×1 (steps 16); CivilianTracker ×1 (steps 16)
- **discouraged panels most often present**: CountermeasurePicker ×3 (steps 6, 8, 24); CivilianTracker ×2 (steps 2, 8); EMFGauge ×2 (steps 5, 10)

## Against the baseline (eval/results.jsonl)

| Metric | Baseline | This run |
|---|---|---|
| Points | 114/144 | 120.05/144 |
| False alarms (harmless, acted) | 3/5 | 1/5 |
| Harmless handled calmly | 0/5 | 4/5 |
| Harmless with `all_clear` | 1/5 | 4/5 |
| Misses | 0/14 | 1/14 |
| Over-escalations | 4/5 | 5/5 |
| Action match | 13/24 | 15/24 |
| Dispatch match | 17/24 | 17/24 |
| Hot sector match | 23/24 | 23/24 |
| Panel recall, mean | 92% | 96% |
| Steps with a discouraged panel | 9/24 | 6/24 |
| Routed to the key's playbook | 3/24 | 17/24 |
| Intake severity copies the feed tier | 20/20 | 11/20 |
| Distinct layouts | 12 | 10 |
| Failures | 0 | 0 |
| Mean latency | 14.7s | 16.9s |

Steps that changed (points before → after):

| # | Truth | Key | Baseline action | Variant action | Points |
|---|---|---|---|---|---|
| 1 | harmless | observe | contain | observe | 2.5 → 6 |
| 2 | real | observe | contain | contain | 2.75 → 3 |
| 4 | harmless | observe | observe | observe | 4.5 → 6 |
| 7 | real | observe | observe | contain | 6 → 4 |
| 10 | real | contain | contain | contain | 6 → 5 |
| 11 | harmless | observe | observe | observe | 5 → 6 |
| 16 | real | contain | contain | observe | 6 → 3.5 |
| 18 | harmless | observe | contain | observe | 2.5 → 6 |
| 20 | real | evacuate | contain | evacuate | 5 → 6 |
| 21 | real | evacuate | contain | evacuate | 5 → 5.8 |
