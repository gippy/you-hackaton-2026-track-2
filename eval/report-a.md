# Nightfall eval report — run a

Generated 2026-10-28 14:03 · pipeline hash `23b5233007` · sky input on · scenario `fixtures/nightfall/scenario.json` · answer key `fixtures/nightfall/answer-key.json`

Model(s) seen: parasail-minimax-m31-flash · steps run: 24 · failures: 0

Dispatch is scored from `recommended_action` (observe = no dispatch). The pipeline itself never posts; nothing was sent to Discord or PagerDuty.

## Score: 126.7 / 144 points (88%)

Per step, one point each for: action match, dispatch match, hot-sector match, panel recall (fractional), no discouraged panel, no failure.

## Metrics

| Metric | Result |
|---|---|
| False alarms (harmless step, model acts or dispatches) | 0/5 |
| Harmless handled calmly (observe, low banner, no discouraged panel) | 5/5 (100%) |
| Harmless with the `all_clear` sound cue | 5/5 (100%) |
| Misses (key says contain/evacuate, model observes) | 1/14 |
| Over-escalation (real but key says observe, model acts) | 4/5 |
| Action match | 16/24 (67%) |
| of which called too low / too high (contain vs evacuate) | 3 / 0 |
| Dispatch match | 19/24 (79%) |
| Intake severity equals the feed's tier label (diagnostic: the model reads the label, not the text) | 9/20 (45%) of the steps with a LOW/ELEVATED/CRITICAL tier |
| Entity routed to the key's playbook (diagnostic, not scored) | 15/24 (62%); routed: corporeal ×15, anomalous ×7, spectral ×2 |
| Hot sector match (FloorPlan, else incident sector) | 24/24 (100%) |
| Hot sector match from the intake step alone | 24/24 (100%) |
| Seal set exact / route set exact (secondary, not scored) | 11/24 (46%) / 7/24 (29%) |
| Panel recall, mean | 95% (all expected present on 21/24 steps) |
| Discouraged panels present | 3 panels on 3/24 steps |
| Panels the key neither expects nor discourages | SkyClock ×12, SourceLedger ×6, EntityCard ×5, SystemsBoard ×4, CivilianTracker ×1, ThermalReadout ×1 (neutral) |
| Layout variety (distinct panel sets) | 13 distinct in 24 runs; the key itself expects 13 |
| Most common layout | SourceLedger, ThermalReadout, ThreatBanner on 4/24 steps |
| Mean pairwise layout distance (Jaccard, 0 = identical) | 0.43 |
| Failures (bad JSON, timeout, empty output) | 0/24 |
| Latency per step (wall) | mean 16.2s · median 15.5s · p95 25.9s · max 26.0s |
| Mean phase time inside the flow | ingest 3.1s · ground 7.8s · compose 3.4s |
| Time to first / last component on the wire | 14.0s / 15.5s |

## Action confusion (rows = key, columns = model)

| key \ model | observe | contain | evacuate |
|---|---|---|---|
| observe | 6 | 4 | 0 |
| contain | 1 | 9 | 0 |
| evacuate | 0 | 3 | 1 |

## Per step

Truth: R real, H harmless. Hot is the FloorPlan hot sector, or the intake sector when there is no FloorPlan. Δ panels: `-X` is an expected panel that is missing, `!X` a discouraged panel that is present.

| # | Time | Feed tier | Truth | Key action | Model action | Disp | Hot (model → key) | Recall | Panels (model) | Δ panels | Playbook | Sound | Lat s | Pts |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 11:20 | ELEVATED_HAUNT | H | observe | observe ✓ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, SourceLedger, EntityCard | – | corporeal | all_clear | 13 | 6/6 |
| 2 | 12:10 | UNVERIFIED | R | observe | contain ✗ | ✗ | lounge ✓ → lounge | 100% | ThreatBanner, FloorPlan, CivilianTracker, ThermalReadout, CountermeasurePicker, SourceLedger | !CivilianTracker | anomalous ✗ | alert_chime | 15 | 3/6 |
| 3 | 12:50 | LOW_HAUNT | R | observe | contain ✗ | ✗ | lounge ✓ → lounge | 100% | ThreatBanner, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SourceLedger | – | spectral ✗ | sting_ghost | 16 | 4/6 |
| 4 | 13:05 | UNVERIFIED | H | observe | observe ✓ | ✓ | catering ✓ → catering | 100% | ThreatBanner, SourceLedger, ThermalReadout | – | corporeal | all_clear | 14 | 6/6 |
| 5 | 14:20 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | hack_floor_west ✓ → hack_floor_west | 100% | ThreatBanner, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SkyClock, EntityCard | – | corporeal | sting_vampire | 19 | 6/6 |
| 6 | 15:05 | UNVERIFIED | R | observe | contain ✗ | ✗ | registration ✓ → registration | 100% | ThreatBanner, SourceLedger, ThermalReadout, SystemsBoard, FloorPlan, CivilianTracker, CountermeasurePicker, EntityCard | !CountermeasurePicker | anomalous ✗ | alert_chime | 18 | 3/6 |
| 7 | 15:50 | LOW_HAUNT | R | observe | observe ✓ | ✓ | hack_floor_east ✓ → hack_floor_east | 75% | ThreatBanner, SourceLedger, ThermalReadout | -CivilianTracker | anomalous ✗ | all_clear | 16 | 5.75/6 |
| 8 | 16:40 | CRITICAL_HAUNT | H | observe | observe ✓ | ✓ | network_closet ✓ → network_closet | 100% | ThreatBanner, SourceLedger, EMFGauge, SystemsBoard | – | anomalous ✗ | all_clear | 15 | 6/6 |
| 9 | 17:10 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | hack_floor_east ✓ → hack_floor_east | 100% | ThreatBanner, CivilianTracker, FloorPlan, CountermeasurePicker, SkyClock, SourceLedger | – | corporeal | sting_vampire | 26 | 6/6 |
| 10 | 17:40 | CRITICAL_HAUNT | R | contain (D) | contain ✓ | ✓ | lounge ✓ → lounge | 100% | ThreatBanner, SkyClock, FloorPlan, CivilianTracker, ThermalReadout, CountermeasurePicker, SourceLedger | – | corporeal | sting_vampire | 20 | 6/6 |
| 11 | 18:00 | LOW_HAUNT | H | observe | observe ✓ | ✓ | hack_floor_west ✓ → hack_floor_west | 100% | ThreatBanner, SourceLedger, ThermalReadout | – | anomalous ✗ | all_clear | 13 | 6/6 |
| 12 | 18:15 | CRITICAL_HAUNT | R | evacuate (D) | contain ✗ | ✓ | hack_floor_west ✓ → hack_floor_west/lounge | 100% | ThreatBanner, CivilianTracker, FloorPlan, ThermalReadout, SystemsBoard, CountermeasurePicker, SkyClock, SourceLedger | – | corporeal | alert_chime | 16 | 5/6 |
| 13 | 18:25 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, FloorPlan, CivilianTracker, ThermalReadout, CountermeasurePicker, SkyClock, SourceLedger | – | corporeal | sting_vampire | 15 | 6/6 |
| 14 | 18:40 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | catering ✓ → catering | 100% | ThreatBanner, SourceLedger, CivilianTracker, FloorPlan, CountermeasurePicker, SkyClock, ThermalReadout | – | corporeal | sting_vampire | 11 | 6/6 |
| 15 | 18:55 | LOW_HAUNT | R | contain (D) | contain ✓ | ✓ | hack_floor_east ✓ → hack_floor_east | 100% | ThreatBanner, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SkyClock, SourceLedger | – | spectral ✗ | sting_residual_haunting | 26 | 6/6 |
| 16 | 19:10 | CRITICAL_HAUNT | R | contain (D) | contain ✓ | ✓ | network_closet ✓ → network_closet | 100% | ThreatBanner, SourceLedger, SystemsBoard, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker | – | anomalous ✗ | alert_chime | 19 | 6/6 |
| 17 | 19:20 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, SourceLedger, SkyClock, FloorPlan, CivilianTracker, SystemsBoard, CountermeasurePicker | – | corporeal | sting_vampire | 15 | 6/6 |
| 18 | 19:33 | ELEVATED_HAUNT | H | observe | observe ✓ | ✓ | main_stage ✓ → main_stage | 100% | ThreatBanner, SourceLedger, EntityCard, SystemsBoard | – | corporeal | all_clear | 14 | 6/6 |
| 19 | 19:46 | CRITICAL_HAUNT | R | evacuate (D) | contain ✗ | ✓ | main_stage ✓ → main_stage | 100% | ThreatBanner, SourceLedger, ThermalReadout, FloorPlan, CivilianTracker, SystemsBoard, SkyClock, CountermeasurePicker | – | anomalous ✗ | sting_poltergeist | 16 | 5/6 |
| 20 | 19:55 | CRITICAL_HAUNT | R | evacuate (D) | contain ✗ | ✓ | main_stage ✓ → main_stage | 100% | ThreatBanner, CivilianTracker, FloorPlan, CountermeasurePicker, ThermalReadout, SystemsBoard, SkyClock | – | corporeal | sting_vampire | 17 | 5/6 |
| 21 | 20:02 | CRITICAL_HAUNT | R | evacuate (D) | evacuate ✓ | ✓ | main_stage ✓ → main_stage | 100% | ThreatBanner, ThermalReadout, FloorPlan, CivilianTracker, SystemsBoard, CountermeasurePicker, SkyClock | – | corporeal | sting_werewolf | 15 | 6/6 |
| 22 | 20:10 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | main_stage ✓ → main_stage | 100% | ThreatBanner, EntityCard, FloorPlan, CivilianTracker, ThermalReadout, SystemsBoard, CountermeasurePicker, SourceLedger | – | corporeal | sting_werewolf | 14 | 6/6 |
| 23 | 20:18 | LOW_HAUNT | R | contain (D) | observe ✗ | ✗ | entrance ✓ → entrance | 20% | ThreatBanner, SourceLedger, ThermalReadout | -FloorPlan -SystemsBoard -CountermeasurePicker -CivilianTracker | corporeal | all_clear | 14 | 3.2/6 |
| 24 | 20:26 | UNVERIFIED | R | observe | contain ✗ | ✗ | hack_floor_east ✓ → hack_floor_east | 75% | ThreatBanner, SkyClock, CivilianTracker, FloorPlan, SystemsBoard, CountermeasurePicker, SourceLedger | -ThermalReadout !CountermeasurePicker | corporeal | sting_werewolf | 11 | 2.75/6 |

## Where the points went

| Criterion | Points lost | Steps |
|---|---|---|
| action | 8.00 | 2, 3, 6, 12, 19, 20, 23, 24 |
| dispatch | 5.00 | 2, 3, 6, 23, 24 |
| hot | 0.00 | – |
| recall | 1.30 | 7 (-0.25), 23 (-0.80), 24 (-0.25) |
| no_discouraged | 3.00 | 2, 6, 24 |
| no_failure | 0.00 | – |

- **misses (acting step, observed)**: steps 23
- **over-escalations (real/observe step, acted)**: steps 2, 3, 6, 24
- **contain↔evacuate mismatches**: steps 12, 19, 20
- **expected panels most often missing**: CivilianTracker ×2 (steps 7, 23); FloorPlan ×1 (steps 23); SystemsBoard ×1 (steps 23); CountermeasurePicker ×1 (steps 23); ThermalReadout ×1 (steps 24)
- **discouraged panels most often present**: CountermeasurePicker ×2 (steps 6, 24); CivilianTracker ×1 (steps 2)
- **pipeline notes**: dropped an EMFGauge showing an ordinary reading ×3; someone acted deliberately, so the harmless verd… ×2; dropped a safe route that walks through walls ×1

## Against the baseline (eval/baseline/results.jsonl)

| Metric | Baseline | This run |
|---|---|---|
| Points | 114/144 | 126.7/144 |
| False alarms (harmless, acted) | 3/5 | 0/5 |
| Harmless handled calmly | 0/5 | 5/5 |
| Harmless with `all_clear` | 1/5 | 5/5 |
| Misses | 0/14 | 1/14 |
| Over-escalations | 4/5 | 4/5 |
| Action match | 13/24 | 16/24 |
| Dispatch match | 17/24 | 19/24 |
| Hot sector match | 23/24 | 24/24 |
| Panel recall, mean | 92% | 95% |
| Steps with a discouraged panel | 9/24 | 3/24 |
| Routed to the key's playbook | 3/24 | 15/24 |
| Intake severity copies the feed tier | 20/20 | 9/20 |
| Distinct layouts | 12 | 13 |
| Failures | 0 | 0 |
| Mean latency | 14.7s | 16.2s |

Steps that changed (points before → after):

| # | Truth | Key | Baseline action | Variant action | Points |
|---|---|---|---|---|---|
| 1 | harmless | observe | contain | observe | 2.5 → 6 |
| 2 | real | observe | contain | contain | 2.75 → 3 |
| 4 | harmless | observe | observe | observe | 4.5 → 6 |
| 5 | real | contain | contain | contain | 5 → 6 |
| 7 | real | observe | observe | observe | 6 → 5.75 |
| 8 | harmless | observe | contain | observe | 3 → 6 |
| 11 | harmless | observe | observe | observe | 5 → 6 |
| 13 | real | contain | contain | contain | 5 → 6 |
| 18 | harmless | observe | contain | observe | 2.5 → 6 |
| 21 | real | evacuate | contain | evacuate | 5 → 6 |
| 23 | real | contain | contain | observe | 6 → 3.2 |
