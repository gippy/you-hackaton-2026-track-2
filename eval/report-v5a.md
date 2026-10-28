# Nightfall eval report — variant v5 — run v5a

Generated 2026-10-28 14:36 · pipeline hash `160fe5dba4` · sky input on · scenario `fixtures/nightfall/scenario.json` · answer key `fixtures/nightfall/answer-key.json`

Model(s) seen: parasail-minimax-m31-flash · steps run: 24 · failures: 0

Dispatch is scored from `recommended_action` (observe = no dispatch). The pipeline itself never posts; nothing was sent to Discord or PagerDuty.

## Score: 123.45 / 144 points (86%)

Per step, one point each for: action match, dispatch match, hot-sector match, panel recall (fractional), no discouraged panel, no failure.

## Metrics

| Metric | Result |
|---|---|
| False alarms (harmless step, model acts or dispatches) | 0/5 |
| Harmless handled calmly (observe, low banner, no discouraged panel) | 5/5 (100%) |
| Harmless with the `all_clear` sound cue | 5/5 (100%) |
| Misses (key says contain/evacuate, model observes) | 8/14 |
| Over-escalation (real but key says observe, model acts) | 0/5 |
| Action match | 16/24 (67%) |
| of which called too low / too high (contain vs evacuate) | 0 / 0 |
| Dispatch match | 16/24 (67%) |
| Intake severity equals the feed's tier label (diagnostic: the model reads the label, not the text) | 10/20 (50%) of the steps with a LOW/ELEVATED/CRITICAL tier |
| Entity routed to the key's playbook (diagnostic, not scored) | 17/24 (71%); routed: corporeal ×17, spectral ×4, anomalous ×3 |
| Hot sector match (FloorPlan, else incident sector) | 24/24 (100%) |
| Hot sector match from the intake step alone | 24/24 (100%) |
| Seal set exact / route set exact (secondary, not scored) | 12/24 (50%) / 6/24 (25%) |
| Panel recall, mean | 85% (all expected present on 15/24 steps) |
| Discouraged panels present | 1 panels on 1/24 steps |
| Panels the key neither expects nor discourages | SkyClock ×10, SourceLedger ×6, EntityCard ×5, SystemsBoard ×2, CivilianTracker ×1 (neutral) |
| Layout variety (distinct panel sets) | 14 distinct in 24 runs; the key itself expects 13 |
| Most common layout | CivilianTracker, FloorPlan, SkyClock, SourceLedger, ThermalReadout, ThreatBanner on 4/24 steps |
| Mean pairwise layout distance (Jaccard, 0 = identical) | 0.46 |
| Failures (bad JSON, timeout, empty output) | 0/24 |
| Latency per step (wall) | mean 17.4s · median 16.6s · p95 24.6s · max 33.0s |
| Mean phase time inside the flow | ingest 3.4s · ground 9.1s · compose 3.3s |
| Time to first / last component on the wire | 15.2s / 16.8s |

## Action confusion (rows = key, columns = model)

| key \ model | observe | contain | evacuate |
|---|---|---|---|
| observe | 10 | 0 | 0 |
| contain | 5 | 5 | 0 |
| evacuate | 3 | 0 | 1 |

## Per step

Truth: R real, H harmless. Hot is the FloorPlan hot sector, or the intake sector when there is no FloorPlan. Δ panels: `-X` is an expected panel that is missing, `!X` a discouraged panel that is present.

| # | Time | Feed tier | Truth | Key action | Model action | Disp | Hot (model → key) | Recall | Panels (model) | Δ panels | Playbook | Sound | Lat s | Pts |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 11:20 | ELEVATED_HAUNT | H | observe | observe ✓ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, SourceLedger, EntityCard | – | corporeal | all_clear | 12 | 6/6 |
| 2 | 12:10 | UNVERIFIED | R | observe | observe ✓ | ✓ | lounge ✓ → lounge | 100% | ThreatBanner, SourceLedger, FloorPlan, CivilianTracker, ThermalReadout, SkyClock | !CivilianTracker | anomalous ✗ | sting_ghost | 22 | 5/6 |
| 3 | 12:50 | LOW_HAUNT | R | observe | observe ✓ | ✓ | lounge ✓ → lounge | 100% | ThreatBanner, ThermalReadout, FloorPlan, CivilianTracker, SkyClock, SourceLedger | – | spectral ✗ | sting_ghost | 24 | 6/6 |
| 4 | 13:05 | UNVERIFIED | H | observe | observe ✓ | ✓ | catering ✓ → catering | 100% | ThreatBanner, SourceLedger, ThermalReadout, EntityCard | – | corporeal | all_clear | 18 | 6/6 |
| 5 | 14:20 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | hack_floor_west ✓ → hack_floor_west | 100% | ThreatBanner, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, SourceLedger | – | corporeal | sting_vampire | 25 | 6/6 |
| 6 | 15:05 | UNVERIFIED | R | observe | observe ✓ | ✓ | registration ✓ → registration | 100% | ThreatBanner, ThermalReadout, FloorPlan, CivilianTracker, SystemsBoard, SourceLedger | – | anomalous ✗ | sting_ghost | 17 | 6/6 |
| 7 | 15:50 | LOW_HAUNT | R | observe | observe ✓ | ✓ | hack_floor_east ✓ → hack_floor_east | 75% | ThreatBanner, SourceLedger, ThermalReadout, EntityCard | -CivilianTracker | corporeal | all_clear | 17 | 5.75/6 |
| 8 | 16:40 | CRITICAL_HAUNT | H | observe | observe ✓ | ✓ | network_closet ✓ → network_closet | 100% | ThreatBanner, SourceLedger, SystemsBoard, EMFGauge | – | anomalous ✗ | all_clear | 33 | 6/6 |
| 9 | 17:10 | ELEVATED_HAUNT | R | contain (D) | observe ✗ | ✗ | hack_floor_east ✓ → hack_floor_east | 25% | ThreatBanner, SourceLedger, ThermalReadout | -FloorPlan -CivilianTracker -CountermeasurePicker | corporeal | all_clear | 17 | 3.25/6 |
| 10 | 17:40 | CRITICAL_HAUNT | R | contain (D) | contain ✓ | ✓ | lounge ✓ → lounge | 100% | ThreatBanner, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SourceLedger, SkyClock, EntityCard | – | corporeal | sting_vampire | 17 | 6/6 |
| 11 | 18:00 | LOW_HAUNT | H | observe | observe ✓ | ✓ | hack_floor_west ✓ → hack_floor_west | 100% | ThreatBanner, SourceLedger, ThermalReadout | – | spectral ✗ | all_clear | 13 | 6/6 |
| 12 | 18:15 | CRITICAL_HAUNT | R | evacuate (D) | observe ✗ | ✗ | hack_floor_west ✓ → hack_floor_west/lounge | 25% | ThreatBanner, SourceLedger, ThermalReadout | -FloorPlan -CivilianTracker -CountermeasurePicker | corporeal | alert_chime | 15 | 3.25/6 |
| 13 | 18:25 | ELEVATED_HAUNT | R | contain (D) | observe ✗ | ✗ | entrance ✓ → entrance | 75% | ThreatBanner, CivilianTracker, FloorPlan, ThermalReadout, SkyClock, SourceLedger | -CountermeasurePicker | corporeal | sting_vampire | 17 | 3.75/6 |
| 14 | 18:40 | ELEVATED_HAUNT | R | contain (D) | observe ✗ | ✗ | catering ✓ → catering | 75% | ThreatBanner, FloorPlan, CivilianTracker, SkyClock, SourceLedger | -CountermeasurePicker | corporeal | sting_vampire | 15 | 3.75/6 |
| 15 | 18:55 | LOW_HAUNT | R | contain (D) | observe ✗ | ✗ | hack_floor_east ✓ → hack_floor_east | 75% | ThreatBanner, CivilianTracker, FloorPlan, ThermalReadout, SkyClock, SourceLedger | -CountermeasurePicker | spectral ✗ | sting_ghost | 17 | 3.75/6 |
| 16 | 19:10 | CRITICAL_HAUNT | R | contain (D) | observe ✗ | ✗ | network_closet ✓ → network_closet | 100% | ThreatBanner, FloorPlan, CivilianTracker, SystemsBoard, ThermalReadout, SourceLedger | – | corporeal | alert_chime | 16 | 4/6 |
| 17 | 19:20 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, SystemsBoard, FloorPlan, CivilianTracker, CountermeasurePicker, SourceLedger | – | corporeal | alert_chime | 16 | 6/6 |
| 18 | 19:33 | ELEVATED_HAUNT | H | observe | observe ✓ | ✓ | main_stage ✓ → main_stage | 100% | ThreatBanner, SourceLedger, ThermalReadout, EntityCard | – | corporeal | all_clear | 16 | 6/6 |
| 19 | 19:46 | CRITICAL_HAUNT | R | evacuate (D) | observe ✗ | ✗ | main_stage ✓ → main_stage | 80% | ThreatBanner, FloorPlan, CivilianTracker, ThermalReadout, SystemsBoard, SkyClock, SourceLedger | -CountermeasurePicker | spectral ✗ | sting_ghost | 14 | 3.8/6 |
| 20 | 19:55 | CRITICAL_HAUNT | R | evacuate (D) | evacuate ✓ | ✓ | main_stage ✓ → main_stage | 100% | ThreatBanner, FloorPlan, CivilianTracker, ThermalReadout, CountermeasurePicker, SkyClock, SourceLedger | – | corporeal | sting_vampire | 16 | 6/6 |
| 21 | 20:02 | CRITICAL_HAUNT | R | evacuate (D) | observe ✗ | ✗ | main_stage ✓ → main_stage | 40% | ThreatBanner, SkyClock, ThermalReadout | -FloorPlan -CivilianTracker -CountermeasurePicker | corporeal | sting_werewolf | 17 | 3.4/6 |
| 22 | 20:10 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | main_stage ✓ → main_stage | 100% | ThreatBanner, ThermalReadout, FloorPlan, CivilianTracker, SystemsBoard, CountermeasurePicker, SourceLedger | – | corporeal | sting_werewolf | 16 | 6/6 |
| 23 | 20:18 | LOW_HAUNT | R | contain (D) | contain ✓ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, FloorPlan, CivilianTracker, ThermalReadout, SystemsBoard, CountermeasurePicker, SourceLedger | – | corporeal | sting_vampire | 14 | 6/6 |
| 24 | 20:26 | UNVERIFIED | R | observe | observe ✓ | ✓ | hack_floor_east ✓ → hack_floor_east | 75% | ThreatBanner, CivilianTracker, FloorPlan, SystemsBoard, SkyClock, SourceLedger | -ThermalReadout | corporeal | sting_werewolf | 14 | 5.75/6 |

## Where the points went

| Criterion | Points lost | Steps |
|---|---|---|
| action | 8.00 | 9, 12, 13, 14, 15, 16, 19, 21 |
| dispatch | 8.00 | 9, 12, 13, 14, 15, 16, 19, 21 |
| hot | 0.00 | – |
| recall | 3.55 | 7 (-0.25), 9 (-0.75), 12 (-0.75), 13 (-0.25), 14 (-0.25), 15 (-0.25), 19 (-0.20), 21 (-0.60), 24 (-0.25) |
| no_discouraged | 1.00 | 2 |
| no_failure | 0.00 | – |

- **misses (acting step, observed)**: steps 9, 12, 13, 14, 15, 16, 19, 21
- **expected panels most often missing**: CountermeasurePicker ×7 (steps 9, 12, 13, 14, 15, 19, 21); CivilianTracker ×4 (steps 7, 9, 12, 21); FloorPlan ×3 (steps 9, 12, 21); ThermalReadout ×1 (steps 24)
- **discouraged panels most often present**: CivilianTracker ×1 (steps 2)
- **pipeline notes**: the intake says this is an aftermath: observe an… ×10; dropped an EMFGauge showing an ordinary reading ×1

## Against the baseline (eval/baseline/results.jsonl)

| Metric | Baseline | This run |
|---|---|---|
| Points | 114/144 | 123.45/144 |
| False alarms (harmless, acted) | 3/5 | 0/5 |
| Harmless handled calmly | 0/5 | 5/5 |
| Harmless with `all_clear` | 1/5 | 5/5 |
| Misses | 0/14 | 8/14 |
| Over-escalations | 4/5 | 0/5 |
| Action match | 13/24 | 16/24 |
| Dispatch match | 17/24 | 16/24 |
| Hot sector match | 23/24 | 24/24 |
| Panel recall, mean | 92% | 85% |
| Steps with a discouraged panel | 9/24 | 1/24 |
| Routed to the key's playbook | 3/24 | 17/24 |
| Intake severity copies the feed tier | 20/20 | 10/20 |
| Distinct layouts | 12 | 14 |
| Failures | 0 | 0 |
| Mean latency | 14.7s | 17.4s |

Steps that changed (points before → after):

| # | Truth | Key | Baseline action | Variant action | Points |
|---|---|---|---|---|---|
| 1 | harmless | observe | contain | observe | 2.5 → 6 |
| 2 | real | observe | contain | observe | 2.75 → 5 |
| 3 | real | observe | contain | observe | 4 → 6 |
| 4 | harmless | observe | observe | observe | 4.5 → 6 |
| 5 | real | contain | contain | contain | 5 → 6 |
| 6 | real | observe | contain | observe | 3 → 6 |
| 7 | real | observe | observe | observe | 6 → 5.75 |
| 8 | harmless | observe | contain | observe | 3 → 6 |
| 9 | real | contain | contain | observe | 6 → 3.25 |
| 11 | harmless | observe | observe | observe | 5 → 6 |
| 12 | real | evacuate | contain | observe | 5 → 3.25 |
| 13 | real | contain | contain | observe | 5 → 3.75 |
| 14 | real | contain | contain | observe | 6 → 3.75 |
| 15 | real | contain | contain | observe | 6 → 3.75 |
| 16 | real | contain | contain | observe | 6 → 4 |
| 18 | harmless | observe | contain | observe | 2.5 → 6 |
| 19 | real | evacuate | contain | observe | 5 → 3.8 |
| 20 | real | evacuate | contain | evacuate | 5 → 6 |
| 21 | real | evacuate | contain | observe | 5 → 3.4 |
| 24 | real | observe | contain | observe | 2.75 → 5.75 |
