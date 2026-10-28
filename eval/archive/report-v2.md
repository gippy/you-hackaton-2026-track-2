# Nightfall eval report — variant v2

Generated 2026-10-28 13:26 · pipeline hash `cbf79e95dc` · **rows come from 2 pipeline versions** (3f628415b3, cbf79e95dc); re-run for a consistent report · sky input on · scenario `fixtures/nightfall/scenario.json` · answer key `fixtures/nightfall/answer-key.json`

Model(s) seen: parasail-minimax-m31-flash · steps run: 24 · failures: 0

Dispatch is scored from `recommended_action` (observe = no dispatch). The pipeline itself never posts; nothing was sent to Discord or PagerDuty.

## Score: 120.95 / 144 points (84%)

Per step, one point each for: action match, dispatch match, hot-sector match, panel recall (fractional), no discouraged panel, no failure.

## Metrics

| Metric | Result |
|---|---|
| False alarms (harmless step, model acts or dispatches) | 1/5 |
| Harmless handled calmly (observe, low banner, no discouraged panel) | 4/5 (80%) |
| Harmless with the `all_clear` sound cue | 4/5 (80%) |
| Misses (key says contain/evacuate, model observes) | 5/14 |
| Over-escalation (real but key says observe, model acts) | 1/5 |
| Action match | 14/24 (58%) |
| of which called too low / too high (contain vs evacuate) | 3 / 0 |
| Dispatch match | 17/24 (71%) |
| Intake severity equals the feed's tier label (diagnostic: the model reads the label, not the text) | 10/20 (50%) of the steps with a LOW/ELEVATED/CRITICAL tier |
| Entity routed to the key's playbook (diagnostic, not scored) | 18/24 (75%); routed: corporeal ×18, anomalous ×3, spectral ×3 |
| Hot sector match (FloorPlan, else incident sector) | 23/24 (96%) |
| Hot sector match from the intake step alone | 23/24 (96%) |
| Seal set exact / route set exact (secondary, not scored) | 10/24 (42%) / 6/24 (25%) |
| Panel recall, mean | 87% (all expected present on 16/24 steps) |
| Discouraged panels present | 3 panels on 2/24 steps |
| Panels the key neither expects nor discourages | SkyClock ×12, SourceLedger ×6, SystemsBoard ×5, ThermalReadout ×2, CivilianTracker ×1 (neutral) |
| Layout variety (distinct panel sets) | 11 distinct in 24 runs; the key itself expects 13 |
| Most common layout | SourceLedger, ThermalReadout, ThreatBanner on 5/24 steps |
| Mean pairwise layout distance (Jaccard, 0 = identical) | 0.42 |
| Failures (bad JSON, timeout, empty output) | 0/24 |
| Latency per step (wall) | mean 23.3s · median 19.8s · p95 46.0s · max 49.8s |
| Mean phase time inside the flow | ingest 4.1s · ground 12.9s · compose 4.7s |
| Time to first / last component on the wire | 19.9s / 22.4s |

## Action confusion (rows = key, columns = model)

| key \ model | observe | contain | evacuate |
|---|---|---|---|
| observe | 8 | 2 | 0 |
| contain | 5 | 5 | 0 |
| evacuate | 0 | 3 | 1 |

## Per step

Truth: R real, H harmless. Hot is the FloorPlan hot sector, or the intake sector when there is no FloorPlan. Δ panels: `-X` is an expected panel that is missing, `!X` a discouraged panel that is present.

| # | Time | Feed tier | Truth | Key action | Model action | Disp | Hot (model → key) | Recall | Panels (model) | Δ panels | Playbook | Sound | Lat s | Pts |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 11:20 | ELEVATED_HAUNT | H | observe | observe ✓ | ✓ | registration ✗ → entrance | 100% | ThreatBanner, SourceLedger, ThermalReadout | – | corporeal | all_clear | 16 | 5/6 |
| 2 | 12:10 | UNVERIFIED | R | observe | observe ✓ | ✓ | lounge ✓ → lounge | 75% | ThreatBanner, SourceLedger, ThermalReadout | -FloorPlan | anomalous ✗ | all_clear | 17 | 5.75/6 |
| 3 | 12:50 | LOW_HAUNT | R | observe | observe ✓ | ✓ | lounge ✓ → lounge | 100% | ThreatBanner, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SourceLedger | – | spectral ✗ | sting_ghost | 18 | 6/6 |
| 4 | 13:05 | UNVERIFIED | H | observe | observe ✓ | ✓ | catering ✓ → catering | 100% | ThreatBanner, SourceLedger, ThermalReadout | – | corporeal | all_clear | 16 | 6/6 |
| 5 | 14:20 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | hack_floor_west ✓ → hack_floor_west | 100% | ThreatBanner, CivilianTracker, FloorPlan, CountermeasurePicker, SystemsBoard, SkyClock | – | corporeal | sting_vampire | 25 | 6/6 |
| 6 | 15:05 | UNVERIFIED | R | observe | observe ✓ | ✓ | registration ✓ → registration | 100% | ThreatBanner, SourceLedger, SystemsBoard, ThermalReadout, CivilianTracker, FloorPlan | – | anomalous ✗ | sting_ghost | 26 | 6/6 |
| 7 | 15:50 | LOW_HAUNT | R | observe | observe ✓ | ✓ | hack_floor_east ✓ → hack_floor_east | 75% | ThreatBanner, SourceLedger, ThermalReadout | -CivilianTracker | spectral ✗ | all_clear | 20 | 5.75/6 |
| 8 | 16:40 | CRITICAL_HAUNT | H | observe | contain ✗ | ✗ | network_closet ✓ → network_closet | 100% | ThreatBanner, EMFGauge, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, SourceLedger | !CountermeasurePicker !CivilianTracker | anomalous ✗ | sting_poltergeist | 17 | 3/6 |
| 9 | 17:10 | ELEVATED_HAUNT | R | contain (D) | observe ✗ | ✗ | hack_floor_east ✓ → hack_floor_east | 25% | ThreatBanner, SourceLedger, ThermalReadout | -FloorPlan -CivilianTracker -CountermeasurePicker | corporeal | all_clear | 25 | 3.25/6 |
| 10 | 17:40 | CRITICAL_HAUNT | R | contain (D) | observe ✗ | ✗ | lounge ✓ → lounge | 100% | ThreatBanner, CivilianTracker, FloorPlan, CountermeasurePicker, ThermalReadout, SkyClock, SourceLedger | – | corporeal | sting_ghost | 24 | 4/6 |
| 11 | 18:00 | LOW_HAUNT | H | observe | observe ✓ | ✓ | hack_floor_west ✓ → hack_floor_west | 100% | ThreatBanner, SourceLedger, ThermalReadout, SystemsBoard | – | corporeal | all_clear | 17 | 6/6 |
| 12 | 18:15 | CRITICAL_HAUNT | R | evacuate (D) | contain ✗ | ✓ | hack_floor_west ✓ → hack_floor_west/lounge | 100% | ThreatBanner, SourceLedger, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, SkyClock | – | corporeal | sting_wendigo | 15 | 5/6 |
| 13 | 18:25 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, CivilianTracker, FloorPlan, CountermeasurePicker, ThermalReadout, SkyClock, SourceLedger | – | corporeal | sting_werewolf | 20 | 6/6 |
| 14 | 18:40 | ELEVATED_HAUNT | R | contain (D) | observe ✗ | ✗ | catering ✓ → catering | 100% | ThreatBanner, SourceLedger, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SkyClock | – | spectral ✗ | sting_ghost | 20 | 4/6 |
| 15 | 18:55 | LOW_HAUNT | R | contain (D) | contain ✓ | ✓ | hack_floor_east ✓ → hack_floor_east | 75% | ThreatBanner, SkyClock, CivilianTracker, FloorPlan, CountermeasurePicker, SourceLedger | -ThermalReadout | corporeal | sting_werewolf | 19 | 5.75/6 |
| 16 | 19:10 | CRITICAL_HAUNT | R | contain (D) | observe ✗ | ✗ | network_closet ✓ → network_closet | 50% | ThreatBanner, SourceLedger, SystemsBoard, ThermalReadout | -FloorPlan -CivilianTracker | corporeal | all_clear | 18 | 3.5/6 |
| 17 | 19:20 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, SourceLedger, FloorPlan, CivilianTracker, SystemsBoard, CountermeasurePicker, SkyClock | – | corporeal | sting_vampire | 21 | 6/6 |
| 18 | 19:33 | ELEVATED_HAUNT | H | observe | observe ✓ | ✓ | main_stage ✓ → main_stage | 100% | ThreatBanner, SourceLedger, SystemsBoard | – | corporeal | all_clear | 22 | 6/6 |
| 19 | 19:46 | CRITICAL_HAUNT | R | evacuate (D) | contain ✗ | ✓ | main_stage ✓ → main_stage | 100% | ThreatBanner, CivilianTracker, FloorPlan, ThermalReadout, SystemsBoard, SkyClock, CountermeasurePicker, SourceLedger | – | corporeal | sting_vampire | 46 | 5/6 |
| 20 | 19:55 | CRITICAL_HAUNT | R | evacuate (D) | contain ✗ | ✓ | main_stage ✓ → main_stage | 100% | ThreatBanner, SkyClock, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, SourceLedger | – | corporeal | sting_werewolf | 50 | 5/6 |
| 21 | 20:02 | CRITICAL_HAUNT | R | evacuate (D) | evacuate ✓ | ✓ | main_stage ✓ → main_stage | 80% | ThreatBanner, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, SkyClock, SourceLedger | -ThermalReadout | corporeal | sting_werewolf | 41 | 5.8/6 |
| 22 | 20:10 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | main_stage ✓ → main_stage | 100% | ThreatBanner, CivilianTracker, FloorPlan, CountermeasurePicker, ThermalReadout, SystemsBoard, SkyClock, SourceLedger | – | corporeal | sting_werewolf | 29 | 6/6 |
| 23 | 20:18 | LOW_HAUNT | R | contain (D) | observe ✗ | ✗ | entrance ✓ → entrance | 40% | ThreatBanner, SourceLedger, SystemsBoard, ThermalReadout | -FloorPlan -CountermeasurePicker -CivilianTracker | corporeal | sting_vampire | 21 | 3.4/6 |
| 24 | 20:26 | UNVERIFIED | R | observe | contain ✗ | ✗ | hack_floor_east ✓ → hack_floor_east | 75% | ThreatBanner, SkyClock, CivilianTracker, FloorPlan, CountermeasurePicker, SourceLedger | -ThermalReadout !CountermeasurePicker | corporeal | sting_werewolf | 16 | 2.75/6 |

## Where the points went

| Criterion | Points lost | Steps |
|---|---|---|
| action | 10.00 | 8, 9, 10, 12, 14, 16, 19, 20, 23, 24 |
| dispatch | 7.00 | 8, 9, 10, 14, 16, 23, 24 |
| hot | 1.00 | 1 |
| recall | 3.05 | 2 (-0.25), 7 (-0.25), 9 (-0.75), 15 (-0.25), 16 (-0.50), 21 (-0.20), 23 (-0.60), 24 (-0.25) |
| no_discouraged | 2.00 | 8, 24 |
| no_failure | 0.00 | – |

- **false alarms (harmless, acted)**: steps 8
- **misses (acting step, observed)**: steps 9, 10, 14, 16, 23
- **over-escalations (real/observe step, acted)**: steps 24
- **contain↔evacuate mismatches**: steps 12, 19, 20
- **alarmist harmless layout**: steps 8
- **expected panels most often missing**: FloorPlan ×4 (steps 2, 9, 16, 23); CivilianTracker ×4 (steps 7, 9, 16, 23); ThermalReadout ×3 (steps 15, 21, 24); CountermeasurePicker ×2 (steps 9, 23)
- **discouraged panels most often present**: CountermeasurePicker ×2 (steps 8, 24); CivilianTracker ×1 (steps 8)

## Against the baseline (eval/results.jsonl)

| Metric | Baseline | This run |
|---|---|---|
| Points | 114/144 | 120.95/144 |
| False alarms (harmless, acted) | 3/5 | 1/5 |
| Harmless handled calmly | 0/5 | 4/5 |
| Harmless with `all_clear` | 1/5 | 4/5 |
| Misses | 0/14 | 5/14 |
| Over-escalations | 4/5 | 1/5 |
| Action match | 13/24 | 14/24 |
| Dispatch match | 17/24 | 17/24 |
| Hot sector match | 23/24 | 23/24 |
| Panel recall, mean | 92% | 87% |
| Steps with a discouraged panel | 9/24 | 2/24 |
| Routed to the key's playbook | 3/24 | 18/24 |
| Intake severity copies the feed tier | 20/20 | 10/20 |
| Distinct layouts | 12 | 11 |
| Failures | 0 | 0 |
| Mean latency | 14.7s | 23.3s |

Steps that changed (points before → after):

| # | Truth | Key | Baseline action | Variant action | Points |
|---|---|---|---|---|---|
| 1 | harmless | observe | contain | observe | 2.5 → 5 |
| 2 | real | observe | contain | observe | 2.75 → 5.75 |
| 3 | real | observe | contain | observe | 4 → 6 |
| 4 | harmless | observe | observe | observe | 4.5 → 6 |
| 5 | real | contain | contain | contain | 5 → 6 |
| 6 | real | observe | contain | observe | 3 → 6 |
| 7 | real | observe | observe | observe | 6 → 5.75 |
| 9 | real | contain | contain | observe | 6 → 3.25 |
| 10 | real | contain | contain | observe | 6 → 4 |
| 11 | harmless | observe | observe | observe | 5 → 6 |
| 13 | real | contain | contain | contain | 5 → 6 |
| 14 | real | contain | contain | observe | 6 → 4 |
| 15 | real | contain | contain | contain | 6 → 5.75 |
| 16 | real | contain | contain | observe | 6 → 3.5 |
| 18 | harmless | observe | contain | observe | 2.5 → 6 |
| 21 | real | evacuate | contain | evacuate | 5 → 5.8 |
| 23 | real | contain | contain | observe | 6 → 3.4 |
