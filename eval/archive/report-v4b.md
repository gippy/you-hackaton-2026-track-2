# Nightfall eval report — variant v4 — run v4b

Generated 2026-10-28 14:43 · pipeline hash `732756ca31` · sky input on · scenario `fixtures/nightfall/scenario.json` · answer key `fixtures/nightfall/answer-key.json`

Model(s) seen: parasail-minimax-m31-flash · steps run: 24 · failures: 0

Dispatch is scored from `recommended_action` (observe = no dispatch). The pipeline itself never posts; nothing was sent to Discord or PagerDuty.

## Score: 127.75 / 144 points (89%)

Per step, one point each for: action match, dispatch match, hot-sector match, panel recall (fractional), no discouraged panel, no failure.

## Metrics

| Metric | Result |
|---|---|
| False alarms (harmless step, model acts or dispatches) | 1/5 |
| Harmless handled calmly (observe, low banner, no discouraged panel) | 4/5 (80%) |
| Harmless with the `all_clear` sound cue | 4/5 (80%) |
| Misses (key says contain/evacuate, model observes) | 0/14 |
| Over-escalation (real but key says observe, model acts) | 4/5 |
| Action match | 17/24 (71%) |
| of which called too low / too high (contain vs evacuate) | 2 / 0 |
| Dispatch match | 19/24 (79%) |
| Intake severity equals the feed's tier label (diagnostic: the model reads the label, not the text) | 9/20 (45%) of the steps with a LOW/ELEVATED/CRITICAL tier |
| Entity routed to the key's playbook (diagnostic, not scored) | 17/24 (71%); routed: corporeal ×17, anomalous ×6, spectral ×1 |
| Hot sector match (FloorPlan, else incident sector) | 24/24 (100%) |
| Hot sector match from the intake step alone | 24/24 (100%) |
| Seal set exact / route set exact (secondary, not scored) | 12/24 (50%) / 5/24 (21%) |
| Panel recall, mean | 99% (all expected present on 23/24 steps) |
| Discouraged panels present | 5 panels on 4/24 steps |
| Panels the key neither expects nor discourages | SkyClock ×14, SourceLedger ×6, EntityCard ×5, SystemsBoard ×5, CivilianTracker ×1, ThermalReadout ×1 (neutral) |
| Layout variety (distinct panel sets) | 14 distinct in 24 runs; the key itself expects 13 |
| Most common layout | CivilianTracker, CountermeasurePicker, FloorPlan, SkyClock, SourceLedger, ThermalReadout, ThreatBanner on 4/24 steps |
| Mean pairwise layout distance (Jaccard, 0 = identical) | 0.40 |
| Failures (bad JSON, timeout, empty output) | 0/24 |
| Latency per step (wall) | mean 15.8s · median 15.5s · p95 24.0s · max 24.6s |
| Mean phase time inside the flow | ingest 3.4s · ground 7.4s · compose 3.4s |
| Time to first / last component on the wire | 13.2s / 15.0s |

## Action confusion (rows = key, columns = model)

| key \ model | observe | contain | evacuate |
|---|---|---|---|
| observe | 5 | 5 | 0 |
| contain | 0 | 10 | 0 |
| evacuate | 0 | 2 | 2 |

## Per step

Truth: R real, H harmless. Hot is the FloorPlan hot sector, or the intake sector when there is no FloorPlan. Δ panels: `-X` is an expected panel that is missing, `!X` a discouraged panel that is present.

| # | Time | Feed tier | Truth | Key action | Model action | Disp | Hot (model → key) | Recall | Panels (model) | Δ panels | Playbook | Sound | Lat s | Pts |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 11:20 | ELEVATED_HAUNT | H | observe | observe ✓ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, SourceLedger, ThermalReadout, EntityCard | – | corporeal | all_clear | 15 | 6/6 |
| 2 | 12:10 | UNVERIFIED | R | observe | contain ✗ | ✗ | lounge ✓ → lounge | 100% | ThreatBanner, SourceLedger, FloorPlan, CivilianTracker, ThermalReadout | !CivilianTracker | anomalous ✗ | alert_chime | 16 | 3/6 |
| 3 | 12:50 | LOW_HAUNT | R | observe | contain ✗ | ✗ | lounge ✓ → lounge | 100% | ThreatBanner, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SourceLedger | – | corporeal | sting_ghost | 16 | 4/6 |
| 4 | 13:05 | UNVERIFIED | H | observe | observe ✓ | ✓ | catering ✓ → catering | 100% | ThreatBanner, SourceLedger, ThermalReadout, EntityCard | – | corporeal | all_clear | 13 | 6/6 |
| 5 | 14:20 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | hack_floor_west ✓ → hack_floor_west | 100% | ThreatBanner, CivilianTracker, FloorPlan, CountermeasurePicker, SystemsBoard, SkyClock, EntityCard | – | corporeal | sting_vampire | 25 | 6/6 |
| 6 | 15:05 | UNVERIFIED | R | observe | contain ✗ | ✗ | registration ✓ → registration | 100% | ThreatBanner, SourceLedger, ThermalReadout, SystemsBoard, FloorPlan, CivilianTracker, CountermeasurePicker, SkyClock | !CountermeasurePicker | anomalous ✗ | alert_chime | 24 | 3/6 |
| 7 | 15:50 | LOW_HAUNT | R | observe | observe ✓ | ✓ | hack_floor_east ✓ → hack_floor_east | 75% | ThreatBanner, SourceLedger, ThermalReadout | -CivilianTracker | anomalous ✗ | all_clear | 16 | 5.75/6 |
| 8 | 16:40 | CRITICAL_HAUNT | H | observe | contain ✗ | ✗ | network_closet ✓ → network_closet | 100% | ThreatBanner, EMFGauge, SystemsBoard, FloorPlan, CivilianTracker, CountermeasurePicker, SourceLedger | !CountermeasurePicker !CivilianTracker | anomalous ✗ | sting_ghost | 12 | 3/6 |
| 9 | 17:10 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | hack_floor_east ✓ → hack_floor_east | 100% | ThreatBanner, SkyClock, FloorPlan, CivilianTracker, SystemsBoard, CountermeasurePicker, SourceLedger | – | corporeal | sting_vampire | 20 | 6/6 |
| 10 | 17:40 | CRITICAL_HAUNT | R | contain (D) | contain ✓ | ✓ | lounge ✓ → lounge | 100% | ThreatBanner, EntityCard, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SkyClock, SourceLedger | – | corporeal | sting_vampire | 12 | 6/6 |
| 11 | 18:00 | LOW_HAUNT | H | observe | observe ✓ | ✓ | hack_floor_west ✓ → hack_floor_west | 100% | ThreatBanner, SourceLedger, ThermalReadout | – | anomalous ✗ | all_clear | 14 | 6/6 |
| 12 | 18:15 | CRITICAL_HAUNT | R | evacuate (D) | contain ✗ | ✓ | hack_floor_west ✓ → hack_floor_west/lounge | 100% | ThreatBanner, FloorPlan, CivilianTracker, ThermalReadout, SkyClock, CountermeasurePicker, SourceLedger | – | corporeal | sting_vampire | 11 | 5/6 |
| 13 | 18:25 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, CivilianTracker, FloorPlan, CountermeasurePicker, SystemsBoard, SkyClock, SourceLedger | – | corporeal | sting_werewolf | 14 | 6/6 |
| 14 | 18:40 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | catering ✓ → catering | 100% | ThreatBanner, FloorPlan, CivilianTracker, CountermeasurePicker, ThermalReadout, SkyClock, SourceLedger | – | corporeal | sting_werewolf | 16 | 6/6 |
| 15 | 18:55 | LOW_HAUNT | R | contain (D) | contain ✓ | ✓ | hack_floor_east ✓ → hack_floor_east | 100% | ThreatBanner, SkyClock, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SourceLedger | – | corporeal | sting_werewolf | 16 | 6/6 |
| 16 | 19:10 | CRITICAL_HAUNT | R | contain (D) | contain ✓ | ✓ | network_closet ✓ → network_closet | 100% | ThreatBanner, SystemsBoard, FloorPlan, CivilianTracker, SourceLedger | – | anomalous ✗ | alert_chime | 12 | 6/6 |
| 17 | 19:20 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, FloorPlan, CivilianTracker, SystemsBoard, SkyClock, CountermeasurePicker, SourceLedger | – | corporeal | sting_vampire | 16 | 6/6 |
| 18 | 19:33 | ELEVATED_HAUNT | H | observe | observe ✓ | ✓ | main_stage ✓ → main_stage | 100% | ThreatBanner, SourceLedger, SystemsBoard | – | corporeal | all_clear | 11 | 6/6 |
| 19 | 19:46 | CRITICAL_HAUNT | R | evacuate (D) | evacuate ✓ | ✓ | main_stage ✓ → main_stage | 100% | ThreatBanner, SkyClock, ThermalReadout, FloorPlan, CivilianTracker, SystemsBoard, CountermeasurePicker, SourceLedger | – | spectral ✗ | sting_ghost | 15 | 6/6 |
| 20 | 19:55 | CRITICAL_HAUNT | R | evacuate (D) | contain ✗ | ✓ | main_stage ✓ → main_stage | 100% | ThreatBanner, FloorPlan, CivilianTracker, ThermalReadout, SystemsBoard, CountermeasurePicker, SkyClock, EntityCard | – | corporeal | sting_vampire | 16 | 5/6 |
| 21 | 20:02 | CRITICAL_HAUNT | R | evacuate (D) | evacuate ✓ | ✓ | main_stage ✓ → main_stage | 100% | ThreatBanner, SkyClock, ThermalReadout, FloorPlan, CivilianTracker, SystemsBoard, CountermeasurePicker, SourceLedger | – | corporeal | sting_werewolf | 19 | 6/6 |
| 22 | 20:10 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | main_stage ✓ → main_stage | 100% | ThreatBanner, FloorPlan, CivilianTracker, ThermalReadout, SystemsBoard, CountermeasurePicker, SourceLedger | – | corporeal | sting_werewolf | 14 | 6/6 |
| 23 | 20:18 | LOW_HAUNT | R | contain (D) | contain ✓ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, FloorPlan, CivilianTracker, ThermalReadout, SystemsBoard, CountermeasurePicker, SkyClock, SourceLedger | – | corporeal | sting_vampire | 16 | 6/6 |
| 24 | 20:26 | UNVERIFIED | R | observe | contain ✗ | ✗ | hack_floor_east ✓ → hack_floor_east | 100% | ThreatBanner, CivilianTracker, FloorPlan, ThermalReadout, SkyClock, CountermeasurePicker, SourceLedger | !CountermeasurePicker | corporeal | sting_werewolf | 21 | 3/6 |

## Where the points went

| Criterion | Points lost | Steps |
|---|---|---|
| action | 7.00 | 2, 3, 6, 8, 12, 20, 24 |
| dispatch | 5.00 | 2, 3, 6, 8, 24 |
| hot | 0.00 | – |
| recall | 0.25 | 7 (-0.25) |
| no_discouraged | 4.00 | 2, 6, 8, 24 |
| no_failure | 0.00 | – |

- **false alarms (harmless, acted)**: steps 8
- **over-escalations (real/observe step, acted)**: steps 2, 3, 6, 24
- **contain↔evacuate mismatches**: steps 12, 20
- **alarmist harmless layout**: steps 8
- **expected panels most often missing**: CivilianTracker ×1 (steps 7)
- **discouraged panels most often present**: CountermeasurePicker ×3 (steps 6, 8, 24); CivilianTracker ×2 (steps 2, 8)
- **pipeline notes**: someone acted deliberately, so the harmless verd… ×1

## Against the baseline (eval/baseline/results.jsonl)

| Metric | Baseline | This run |
|---|---|---|
| Points | 114/144 | 127.75/144 |
| False alarms (harmless, acted) | 3/5 | 1/5 |
| Harmless handled calmly | 0/5 | 4/5 |
| Harmless with `all_clear` | 1/5 | 4/5 |
| Misses | 0/14 | 0/14 |
| Over-escalations | 4/5 | 4/5 |
| Action match | 13/24 | 17/24 |
| Dispatch match | 17/24 | 19/24 |
| Hot sector match | 23/24 | 24/24 |
| Panel recall, mean | 92% | 99% |
| Steps with a discouraged panel | 9/24 | 4/24 |
| Routed to the key's playbook | 3/24 | 17/24 |
| Intake severity copies the feed tier | 20/20 | 9/20 |
| Distinct layouts | 12 | 14 |
| Failures | 0 | 0 |
| Mean latency | 14.7s | 15.8s |

Steps that changed (points before → after):

| # | Truth | Key | Baseline action | Variant action | Points |
|---|---|---|---|---|---|
| 1 | harmless | observe | contain | observe | 2.5 → 6 |
| 2 | real | observe | contain | contain | 2.75 → 3 |
| 4 | harmless | observe | observe | observe | 4.5 → 6 |
| 5 | real | contain | contain | contain | 5 → 6 |
| 7 | real | observe | observe | observe | 6 → 5.75 |
| 11 | harmless | observe | observe | observe | 5 → 6 |
| 13 | real | contain | contain | contain | 5 → 6 |
| 18 | harmless | observe | contain | observe | 2.5 → 6 |
| 19 | real | evacuate | contain | evacuate | 5 → 6 |
| 21 | real | evacuate | contain | evacuate | 5 → 6 |
| 24 | real | observe | contain | contain | 2.75 → 3 |
