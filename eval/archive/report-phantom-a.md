# Nightfall eval report — run phantom-a

Generated 2026-10-28 16:33 · pipeline hash `160db8b1b7` · sky input OFF · scenario `fixtures/phantom/scenario.json` · answer key `fixtures/phantom/answer-key.json`

Model(s) seen: parasail-minimax-m31-flash · steps run: 24 · failures: 1

Dispatch is scored from `recommended_action` (observe = no dispatch). The pipeline itself never posts; nothing was sent to Discord or PagerDuty.

## Score: 107.1 / 144 points (74%)

Per step, one point each for: action match, dispatch match, hot-sector match, panel recall (fractional), no discouraged panel, no failure.

## Metrics

| Metric | Result |
|---|---|
| False alarms (harmless step, model acts or dispatches) | 1/5 |
| Harmless handled calmly (observe, low banner, no discouraged panel) | 2/5 (40%) |
| Harmless with the `all_clear` sound cue | 3/5 (60%) |
| Misses (key says contain/evacuate, model observes) | 0/10 |
| Over-escalation (real but key says observe, model acts) | 7/8 |
| Action match | 13/24 (54%) |
| of which called too low / too high (contain vs evacuate) | 1 / 1 |
| Dispatch match | 14/24 (58%) |
| Intake severity equals the feed's tier label (diagnostic: the model reads the label, not the text) | 16/19 (84%) of the steps with a LOW/ELEVATED/CRITICAL tier |
| Entity routed to the key's playbook (diagnostic, not scored) | 11/23 (48%); routed: anomalous ×12, spectral ×11 |
| Hot sector match (FloorPlan, else incident sector) | 22/24 (92%) |
| Hot sector match from the intake step alone | 23/24 (96%) |
| Seal set exact / route set exact (secondary, not scored) | 9/24 (38%) / 4/24 (17%) |
| Panel recall, mean | 92% (all expected present on 19/24 steps) |
| Discouraged panels present | 11 panels on 9/24 steps |
| Panels the key neither expects nor discourages | SourceLedger ×2 (neutral) |
| Layout variety (distinct panel sets) | 9 distinct in 23 runs; the key itself expects 13 |
| Most common layout | CivilianTracker, CountermeasurePicker, EMFGauge, FloorPlan, SourceLedger, SystemsBoard, ThermalReadout, ThreatBanner on 10/23 steps |
| Mean pairwise layout distance (Jaccard, 0 = identical) | 0.29 |
| Failures (bad JSON, timeout, empty output) | 1/24 |
| Latency per step (wall) | mean 18.5s · median 17.7s · p95 26.7s · max 29.0s |
| Mean phase time inside the flow | ingest 3.3s · ground 9.2s · compose 4.4s |
| Time to first / last component on the wire | 15.9s / 17.6s |

## Action confusion (rows = key, columns = model)

| key \ model | observe | contain | evacuate |
|---|---|---|---|
| observe | 5 | 8 | 0 |
| contain | 0 | 6 | 1 |
| evacuate | 0 | 1 | 2 |

## Per step

Truth: R real, H harmless. Hot is the FloorPlan hot sector, or the intake sector when there is no FloorPlan. Δ panels: `-X` is an expected panel that is missing, `!X` a discouraged panel that is present.

| # | Time | Feed tier | Truth | Key action | Model action | Disp | Hot (model → key) | Recall | Panels (model) | Δ panels | Playbook | Sound | Lat s | Pts |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 09:40 | LOW_HAUNT | R | observe | contain ✗ | ✗ | catering ✓ → catering | 100% | ThreatBanner, EMFGauge, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard | !SystemsBoard | anomalous ✗ | sting_ghost | 13 | 3/6 |
| 2 | 09:55 | ELEVATED_HAUNT | H | observe | contain ✗ | ✗ | entrance ✓ → entrance | 100% | ThreatBanner, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, SourceLedger | !CountermeasurePicker !CivilianTracker !SystemsBoard | spectral | sting_ghost | 23 | 3/6 |
| 3 | 10:35 | UNVERIFIED | R | observe | contain ✗ | ✗ | lounge ✓ → lounge | 100% | ThreatBanner, SourceLedger, EMFGauge, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker | – | anomalous ✗ | sting_ghost | 13 | 4/6 |
| 4 | 11:20 | LOW_HAUNT | R | observe | contain ✗ | ✗ | hack_floor_west ✓ → hack_floor_west | 100% | ThreatBanner, EMFGauge, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, SourceLedger | !SourceLedger | anomalous ✗ | sting_ghost | 18 | 3/6 |
| 5 | 12:10 | ELEVATED_HAUNT | R | contain | contain ✓ | ✗ | catering ✓ → catering | 100% | ThreatBanner, EMFGauge, ThermalReadout, FloorPlan, CivilianTracker, SystemsBoard, CountermeasurePicker, SourceLedger | !SystemsBoard | spectral | sting_ghost | 15 | 4/6 |
| 6 | 12:40 | LOW_HAUNT | R | observe | contain ✗ | ✗ | registration ✓ → registration | 100% | ThreatBanner, SourceLedger, EMFGauge, FloorPlan, CivilianTracker, CountermeasurePicker | – | spectral | sting_ghost | 12 | 4/6 |
| 7 | 13:05 | CRITICAL_HAUNT | H | observe | observe ✓ | ✓ | catering ✓ → catering | 33% | ThreatBanner, SourceLedger, ThermalReadout | -EMFGauge -FloorPlan | anomalous ✗ | all_clear | 14 | 5.333/6 |
| 8 | 13:40 | ELEVATED_HAUNT | R | contain (D) | evacuate ✗ | ✓ | hack_floor_east ✓ → hack_floor_east | 100% | ThreatBanner, EMFGauge, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SourceLedger | – | spectral | sting_poltergeist | 19 | 5/6 |
| 9 | 14:15 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | network_closet ✓ → network_closet | 100% | ThreatBanner, EMFGauge, ThermalReadout, SystemsBoard, FloorPlan, CivilianTracker, CountermeasurePicker | – | anomalous ✗ | sting_ghost | 14 | 6/6 |
| 10 | 14:50 | LOW_HAUNT | R | observe | contain ✗ | ✗ | main_stage ✓ → main_stage | 100% | ThreatBanner, EMFGauge, ThermalReadout, FloorPlan, CivilianTracker, SystemsBoard, CountermeasurePicker, SourceLedger | !CountermeasurePicker | spectral | sting_ghost | 25 | 3/6 |
| 11 | 15:05 | UNVERIFIED | H | observe | observe ✓ | ✓ | hack_floor_west ✓ → hack_floor_west | 100% | ThreatBanner, EMFGauge, FloorPlan, CivilianTracker, SystemsBoard, SourceLedger | !CivilianTracker | anomalous ✗ | sting_ghost | 27 | 5/6 |
| 12 | 15:30 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | catering ✓ → catering | 100% | ThreatBanner, EMFGauge, ThermalReadout, FloorPlan, CivilianTracker, SystemsBoard, CountermeasurePicker, SourceLedger | – | spectral | sting_ghost | 26 | 6/6 |
| 13 | 16:12 | CRITICAL_HAUNT | R | evacuate (D) | evacuate ✓ | ✓ | catering ✓ → catering | 100% | ThreatBanner, EMFGauge, ThermalReadout, FloorPlan, CivilianTracker, SystemsBoard, CountermeasurePicker, SourceLedger | – | spectral | sting_ghost | 16 | 6/6 |
| 14 | 16:20 | CRITICAL_HAUNT | R | evacuate (D) | contain ✗ | ✓ | catering ✓ → catering | 100% | ThreatBanner, EMFGauge, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, SourceLedger | – | spectral | sting_ghost | 21 | 5/6 |
| 15 | 16:32 | CRITICAL_HAUNT | R | contain (D) | contain ✓ | ✓ | catering ✓ → catering | 100% | ThreatBanner, EMFGauge, ThermalReadout, FloorPlan, CivilianTracker, SystemsBoard, CountermeasurePicker, SourceLedger | – | spectral | sting_ghost | 24 | 6/6 |
| 16 | 16:48 | UNVERIFIED | R | observe | contain ✗ | ✗ | entrance ✓ → entrance | 100% | ThreatBanner, EMFGauge, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SourceLedger | !CivilianTracker | spectral | sting_ghost | 17 | 3/6 |
| 17 | 17:05 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | hack_floor_east ✓ → hack_floor_east | 100% | ThreatBanner, EMFGauge, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, SourceLedger | !SourceLedger | anomalous ✗ | sting_poltergeist | 16 | 5/6 |
| 18 | 17:40 | CRITICAL_HAUNT | R | evacuate (D) | evacuate ✓ | ✓ | network_closet ✓ → network_closet | 100% | ThreatBanner, EMFGauge, ThermalReadout, FloorPlan, CivilianTracker, SystemsBoard, CountermeasurePicker, SourceLedger | – | anomalous ✗ | sting_ghost | 29 | 6/6 |
| 19 | 18:08 | LOW_HAUNT | R | observe | contain ✗ | ✗ | network_closet ✗ → hack_floor_west | 100% | ThreatBanner, EMFGauge, ThermalReadout, FloorPlan, CivilianTracker, SystemsBoard, CountermeasurePicker, SourceLedger | – | anomalous ✗ | sting_ghost | 18 | 3/6 |
| 20 | 18:25 | ELEVATED_HAUNT | R | contain (D) | **FAILED** | | | | | | | | | 150 | 0/6 |  
  ↳ timeout after 150s (last phase seen: compose:progress)
| 21 | 18:40 | ELEVATED_HAUNT | H | observe | observe ✓ | ✓ | lounge ✓ → lounge | 50% | ThreatBanner, SourceLedger, ThermalReadout | -FloorPlan | anomalous ✗ | all_clear | 19 | 5.5/6 |
| 22 | 19:10 | LOW_HAUNT | H | observe | observe ✓ | ✓ | main_stage ✓ → main_stage | 67% | ThreatBanner, SourceLedger, SystemsBoard | -FloorPlan !SystemsBoard | anomalous ✗ | all_clear | 19 | 4.667/6 |
| 23 | 19:35 | CRITICAL_HAUNT | R | contain (D) | contain ✓ | ✓ | main_stage ✓ → main_stage | 100% | ThreatBanner, EMFGauge, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, SourceLedger | – | spectral | sting_ghost | 14 | 6/6 |
| 24 | 20:05 | UNVERIFIED | R | observe | observe ✓ | ✓ | catering ✓ → catering | 60% | ThreatBanner, SourceLedger, ThermalReadout | -EMFGauge -FloorPlan | anomalous ✗ | all_clear | 14 | 5.6/6 |

## Where the points went

| Criterion | Points lost | Steps |
|---|---|---|
| action | 11.00 | 1, 2, 3, 4, 6, 8, 10, 14, 16, 19, 20 |
| dispatch | 10.00 | 1, 2, 3, 4, 5, 6, 10, 16, 19, 20 |
| hot | 2.00 | 19, 20 |
| recall | 2.90 | 7 (-0.67), 20, 21 (-0.50), 22 (-0.33), 24 (-0.40) |
| no_discouraged | 10.00 | 1, 2, 4, 5, 10, 11, 16, 17, 20, 22 |
| no_failure | 1.00 | 20 |

- **false alarms (harmless, acted)**: steps 2
- **over-escalations (real/observe step, acted)**: steps 1, 3, 4, 6, 10, 16, 19
- **contain↔evacuate mismatches**: steps 8, 14
- **alarmist harmless layout**: steps 2, 11, 22
- **expected panels most often missing**: FloorPlan ×4 (steps 7, 21, 22, 24); EMFGauge ×2 (steps 7, 24)
- **discouraged panels most often present**: SystemsBoard ×4 (steps 1, 2, 5, 22); CivilianTracker ×3 (steps 2, 11, 16); CountermeasurePicker ×2 (steps 2, 10); SourceLedger ×2 (steps 4, 17)
- **pipeline notes**: the EMF reading is above its threshold: danger ×12; dropped a ThermalReadout showing its normal temp… ×3; dropped an EMFGauge showing an ordinary reading ×1; the civilian count 31 became the 7 people in rea… ×1
