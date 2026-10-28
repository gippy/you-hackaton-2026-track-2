# Nightfall eval report — variant v4 — run v4live

Generated 2026-10-28 15:02 · pipeline hash `b5068e8b5a` · sky input on · scenario `fixtures/nightfall/scenario.json` · answer key `fixtures/nightfall/answer-key.json`

Model(s) seen: parasail-minimax-m31-flash · steps run: 24 · failures: 0

Dispatch is scored from `recommended_action` (observe = no dispatch). The pipeline itself never posts; nothing was sent to Discord or PagerDuty.

## Score: 132.8 / 144 points (92%)

Per step, one point each for: action match, dispatch match, hot-sector match, panel recall (fractional), no discouraged panel, no failure.

## Metrics

| Metric | Result |
|---|---|
| False alarms (harmless step, model acts or dispatches) | 1/5 |
| Harmless handled calmly (observe, low banner, no discouraged panel) | 4/5 (80%) |
| Harmless with the `all_clear` sound cue | 4/5 (80%) |
| Misses (key says contain/evacuate, model observes) | 0/14 |
| Over-escalation (real but key says observe, model acts) | 1/5 |
| Action match | 19/24 (79%) |
| of which called too low / too high (contain vs evacuate) | 1 / 2 |
| Dispatch match | 22/24 (92%) |
| Intake severity equals the feed's tier label (diagnostic: the model reads the label, not the text) | 9/20 (45%) of the steps with a LOW/ELEVATED/CRITICAL tier |
| Entity routed to the key's playbook (diagnostic, not scored) | 15/24 (62%); routed: corporeal ×15, anomalous ×6, spectral ×3 |
| Hot sector match (FloorPlan, else incident sector) | 24/24 (100%) |
| Hot sector match from the intake step alone | 24/24 (100%) |
| Seal set exact / route set exact (secondary, not scored) | 15/24 (62%) / 8/24 (33%) |
| Panel recall, mean | 95% (all expected present on 19/24 steps) |
| Discouraged panels present | 4 panels on 3/24 steps |
| Panels the key neither expects nor discourages | SkyClock ×12, SystemsBoard ×8, SourceLedger ×6, EntityCard ×4, ThermalReadout ×1 (neutral) |
| Layout variety (distinct panel sets) | 13 distinct in 24 runs; the key itself expects 13 |
| Most common layout | CivilianTracker, CountermeasurePicker, FloorPlan, SkyClock, SourceLedger, SystemsBoard, ThermalReadout, ThreatBanner on 5/24 steps |
| Mean pairwise layout distance (Jaccard, 0 = identical) | 0.41 |
| Failures (bad JSON, timeout, empty output) | 0/24 |
| Latency per step (wall) | mean 17.3s · median 15.6s · p95 34.4s · max 53.6s |
| Mean phase time inside the flow | ingest 3.6s · ground 8.9s · compose 3.2s |
| Time to first / last component on the wire | 14.9s / 16.7s |

## Action confusion (rows = key, columns = model)

| key \ model | observe | contain | evacuate |
|---|---|---|---|
| observe | 8 | 1 | 1 |
| contain | 0 | 8 | 2 |
| evacuate | 0 | 1 | 3 |

## Per step

Truth: R real, H harmless. Hot is the FloorPlan hot sector, or the intake sector when there is no FloorPlan. Δ panels: `-X` is an expected panel that is missing, `!X` a discouraged panel that is present.

| # | Time | Feed tier | Truth | Key action | Model action | Disp | Hot (model → key) | Recall | Panels (model) | Δ panels | Playbook | Sound | Lat s | Pts |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 11:20 | ELEVATED_HAUNT | H | observe | observe ✓ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, SourceLedger, EntityCard | – | corporeal | all_clear | 10 | 6/6 |
| 2 | 12:10 | UNVERIFIED | R | observe | observe ✓ | ✓ | lounge ✓ → lounge | 100% | ThreatBanner, SourceLedger, ThermalReadout, SystemsBoard, FloorPlan, CivilianTracker, SkyClock | !CivilianTracker | anomalous ✗ | sting_residual_haunting | 17 | 5/6 |
| 3 | 12:50 | LOW_HAUNT | R | observe | observe ✓ | ✓ | lounge ✓ → lounge | 100% | ThreatBanner, FloorPlan, CivilianTracker, ThermalReadout, SystemsBoard, SkyClock, SourceLedger | – | spectral ✗ | sting_residual_haunting | 13 | 6/6 |
| 4 | 13:05 | UNVERIFIED | H | observe | observe ✓ | ✓ | catering ✓ → catering | 100% | ThreatBanner, SourceLedger, ThermalReadout | – | corporeal | all_clear | 15 | 6/6 |
| 5 | 14:20 | ELEVATED_HAUNT | R | contain (D) | evacuate ✗ | ✓ | hack_floor_west ✓ → hack_floor_west | 100% | ThreatBanner, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, SourceLedger | – | corporeal | sting_vampire | 16 | 5/6 |
| 6 | 15:05 | UNVERIFIED | R | observe | observe ✓ | ✓ | registration ✓ → registration | 75% | ThreatBanner, SourceLedger, ThermalReadout | -SystemsBoard | anomalous ✗ | alert_chime | 14 | 5.75/6 |
| 7 | 15:50 | LOW_HAUNT | R | observe | observe ✓ | ✓ | hack_floor_east ✓ → hack_floor_east | 75% | ThreatBanner, SourceLedger, ThermalReadout | -CivilianTracker | anomalous ✗ | all_clear | 10 | 5.75/6 |
| 8 | 16:40 | CRITICAL_HAUNT | H | observe | contain ✗ | ✗ | network_closet ✓ → network_closet | 100% | ThreatBanner, EMFGauge, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, SourceLedger | !CountermeasurePicker !CivilianTracker | anomalous ✗ | sting_poltergeist | 13 | 3/6 |
| 9 | 17:10 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | hack_floor_east ✓ → hack_floor_east | 100% | ThreatBanner, SourceLedger, SkyClock, FloorPlan, CivilianTracker, CountermeasurePicker | – | corporeal | sting_vampire | 54 | 6/6 |
| 10 | 17:40 | CRITICAL_HAUNT | R | contain (D) | contain ✓ | ✓ | lounge ✓ → lounge | 80% | ThreatBanner, FloorPlan, CivilianTracker, SystemsBoard, CountermeasurePicker, SkyClock, SourceLedger | -ThermalReadout | corporeal | sting_vampire | 17 | 5.8/6 |
| 11 | 18:00 | LOW_HAUNT | H | observe | observe ✓ | ✓ | hack_floor_west ✓ → hack_floor_west | 100% | ThreatBanner, SourceLedger, ThermalReadout | – | anomalous ✗ | all_clear | 14 | 6/6 |
| 12 | 18:15 | CRITICAL_HAUNT | R | evacuate (D) | contain ✗ | ✓ | hack_floor_west ✓ → hack_floor_west/lounge | 100% | ThreatBanner, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, SourceLedger | – | corporeal | sting_vampire | 18 | 5/6 |
| 13 | 18:25 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | entrance ✓ → entrance | 75% | ThreatBanner, FloorPlan, CivilianTracker, ThermalReadout | -CountermeasurePicker | corporeal | sting_vampire | 22 | 5.75/6 |
| 14 | 18:40 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | catering ✓ → catering | 100% | ThreatBanner, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, ThermalReadout, SkyClock, SourceLedger | – | corporeal | sting_werewolf | 17 | 6/6 |
| 15 | 18:55 | LOW_HAUNT | R | contain (D) | contain ✓ | ✓ | hack_floor_east ✓ → hack_floor_east | 75% | ThreatBanner, SkyClock, FloorPlan, CivilianTracker, CountermeasurePicker, SourceLedger | -ThermalReadout | spectral ✗ | sting_werewolf | 15 | 5.75/6 |
| 16 | 19:10 | CRITICAL_HAUNT | R | contain (D) | contain ✓ | ✓ | network_closet ✓ → network_closet | 100% | ThreatBanner, SystemsBoard, CivilianTracker, FloorPlan, ThermalReadout, CountermeasurePicker, SourceLedger | – | anomalous ✗ | alert_chime | 16 | 6/6 |
| 17 | 19:20 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, SkyClock, FloorPlan, CivilianTracker, ThermalReadout, SystemsBoard, CountermeasurePicker, SourceLedger | – | corporeal | sting_vampire | 17 | 6/6 |
| 18 | 19:33 | ELEVATED_HAUNT | H | observe | observe ✓ | ✓ | main_stage ✓ → main_stage | 100% | ThreatBanner, SourceLedger, EntityCard, SystemsBoard | – | corporeal | all_clear | 12 | 6/6 |
| 19 | 19:46 | CRITICAL_HAUNT | R | evacuate (D) | evacuate ✓ | ✓ | main_stage ✓ → main_stage | 100% | ThreatBanner, SkyClock, CivilianTracker, FloorPlan, SystemsBoard, ThermalReadout, CountermeasurePicker, SourceLedger | – | spectral ✗ | sting_ghost | 17 | 6/6 |
| 20 | 19:55 | CRITICAL_HAUNT | R | evacuate (D) | evacuate ✓ | ✓ | main_stage ✓ → main_stage | 100% | ThreatBanner, SkyClock, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, SourceLedger | – | corporeal | sting_vampire | 14 | 6/6 |
| 21 | 20:02 | CRITICAL_HAUNT | R | evacuate (D) | evacuate ✓ | ✓ | main_stage ✓ → main_stage | 100% | ThreatBanner, FloorPlan, CivilianTracker, ThermalReadout, SystemsBoard, CountermeasurePicker, SkyClock, EntityCard | – | corporeal | sting_werewolf | 15 | 6/6 |
| 22 | 20:10 | ELEVATED_HAUNT | R | contain (D) | evacuate ✗ | ✓ | main_stage ✓ → main_stage | 100% | ThreatBanner, EntityCard, FloorPlan, CivilianTracker, ThermalReadout, SystemsBoard, CountermeasurePicker, SourceLedger | – | corporeal | sting_werewolf | 34 | 5/6 |
| 23 | 20:18 | LOW_HAUNT | R | contain (D) | contain ✓ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, FloorPlan, CivilianTracker, ThermalReadout, SystemsBoard, SkyClock, CountermeasurePicker, SourceLedger | – | corporeal | sting_vampire | 16 | 6/6 |
| 24 | 20:26 | UNVERIFIED | R | observe | evacuate ✗ | ✗ | hack_floor_east ✓ → hack_floor_east | 100% | ThreatBanner, SkyClock, FloorPlan, CivilianTracker, ThermalReadout, CountermeasurePicker, SourceLedger | !CountermeasurePicker | corporeal | sting_werewolf | 12 | 3/6 |

## Where the points went

| Criterion | Points lost | Steps |
|---|---|---|
| action | 5.00 | 5, 8, 12, 22, 24 |
| dispatch | 2.00 | 8, 24 |
| hot | 0.00 | – |
| recall | 1.20 | 6 (-0.25), 7 (-0.25), 10 (-0.20), 13 (-0.25), 15 (-0.25) |
| no_discouraged | 3.00 | 2, 8, 24 |
| no_failure | 0.00 | – |

- **false alarms (harmless, acted)**: steps 8
- **over-escalations (real/observe step, acted)**: steps 24
- **contain↔evacuate mismatches**: steps 5, 12, 22
- **alarmist harmless layout**: steps 8
- **expected panels most often missing**: ThermalReadout ×2 (steps 10, 15); SystemsBoard ×1 (steps 6); CivilianTracker ×1 (steps 7); CountermeasurePicker ×1 (steps 13)
- **discouraged panels most often present**: CivilianTracker ×2 (steps 2, 8); CountermeasurePicker ×2 (steps 8, 24)
- **pipeline notes**: dropped a safe route that walks through walls ×3; dropped an EMFGauge showing an ordinary reading ×2

## Against the baseline (eval/baseline/results.jsonl)

| Metric | Baseline | This run |
|---|---|---|
| Points | 114/144 | 132.8/144 |
| False alarms (harmless, acted) | 3/5 | 1/5 |
| Harmless handled calmly | 0/5 | 4/5 |
| Harmless with `all_clear` | 1/5 | 4/5 |
| Misses | 0/14 | 0/14 |
| Over-escalations | 4/5 | 1/5 |
| Action match | 13/24 | 19/24 |
| Dispatch match | 17/24 | 22/24 |
| Hot sector match | 23/24 | 24/24 |
| Panel recall, mean | 92% | 95% |
| Steps with a discouraged panel | 9/24 | 3/24 |
| Routed to the key's playbook | 3/24 | 15/24 |
| Intake severity copies the feed tier | 20/20 | 9/20 |
| Distinct layouts | 12 | 13 |
| Failures | 0 | 0 |
| Mean latency | 14.7s | 17.3s |

Steps that changed (points before → after):

| # | Truth | Key | Baseline action | Variant action | Points |
|---|---|---|---|---|---|
| 1 | harmless | observe | contain | observe | 2.5 → 6 |
| 2 | real | observe | contain | observe | 2.75 → 5 |
| 3 | real | observe | contain | observe | 4 → 6 |
| 4 | harmless | observe | observe | observe | 4.5 → 6 |
| 5 | real | contain | contain | evacuate | 5 → 5 |
| 6 | real | observe | contain | observe | 3 → 5.75 |
| 7 | real | observe | observe | observe | 6 → 5.75 |
| 10 | real | contain | contain | contain | 6 → 5.8 |
| 11 | harmless | observe | observe | observe | 5 → 6 |
| 13 | real | contain | contain | contain | 5 → 5.75 |
| 15 | real | contain | contain | contain | 6 → 5.75 |
| 18 | harmless | observe | contain | observe | 2.5 → 6 |
| 19 | real | evacuate | contain | evacuate | 5 → 6 |
| 20 | real | evacuate | contain | evacuate | 5 → 6 |
| 21 | real | evacuate | contain | evacuate | 5 → 6 |
| 22 | real | contain | contain | evacuate | 6 → 5 |
| 24 | real | observe | contain | evacuate | 2.75 → 3 |
