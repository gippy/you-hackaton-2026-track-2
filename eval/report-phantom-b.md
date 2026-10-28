# Nightfall eval report — run phantom-b

Generated 2026-10-28 16:46 · pipeline hash `affb06cb80` · sky input OFF · scenario `fixtures/phantom/scenario.json` · answer key `fixtures/phantom/answer-key.json`

Model(s) seen: parasail-minimax-m31-flash · steps run: 24 · failures: 0

Dispatch is scored from `recommended_action` (observe = no dispatch). The pipeline itself never posts; nothing was sent to Discord or PagerDuty.

## Score: 102.94 / 144 points (71%)

Per step, one point each for: action match, dispatch match, hot-sector match, panel recall (fractional), no discouraged panel, no failure.

## Metrics

| Metric | Result |
|---|---|
| False alarms (harmless step, model acts or dispatches) | 4/5 |
| Harmless handled calmly (observe, low banner, no discouraged panel) | 1/5 (20%) |
| Harmless with the `all_clear` sound cue | 1/5 (20%) |
| Misses (key says contain/evacuate, model observes) | 0/11 |
| Over-escalation (real but key says observe, model acts) | 8/8 |
| Action match | 9/24 (38%) |
| of which called too low / too high (contain vs evacuate) | 1 / 2 |
| Dispatch match | 11/24 (46%) |
| Intake severity equals the feed's tier label (diagnostic: the model reads the label, not the text) | 18/20 (90%) of the steps with a LOW/ELEVATED/CRITICAL tier |
| Entity routed to the key's playbook (diagnostic, not scored) | 18/24 (75%); routed: spectral ×18, anomalous ×6 |
| Hot sector match (FloorPlan, else incident sector) | 23/24 (96%) |
| Hot sector match from the intake step alone | 23/24 (96%) |
| Seal set exact / route set exact (secondary, not scored) | 4/24 (17%) / 1/24 (4%) |
| Panel recall, mean | 96% (all expected present on 20/24 steps) |
| Discouraged panels present | 18 panels on 11/24 steps |
| Panels the key neither expects nor discourages | SourceLedger ×2 (neutral) |
| Layout variety (distinct panel sets) | 8 distinct in 24 runs; the key itself expects 13 |
| Most common layout | CivilianTracker, CountermeasurePicker, EMFGauge, FloorPlan, SourceLedger, SystemsBoard, ThermalReadout, ThreatBanner on 8/24 steps |
| Mean pairwise layout distance (Jaccard, 0 = identical) | 0.20 |
| Failures (bad JSON, timeout, empty output) | 0/24 |
| Latency per step (wall) | mean 16.9s · median 17.0s · p95 19.7s · max 19.9s |
| Mean phase time inside the flow | ingest 3.5s · ground 8.2s · compose 3.8s |
| Time to first / last component on the wire | 13.8s / 16.1s |

## Action confusion (rows = key, columns = model)

| key \ model | observe | contain | evacuate |
|---|---|---|---|
| observe | 1 | 12 | 0 |
| contain | 0 | 6 | 2 |
| evacuate | 0 | 1 | 2 |

## Per step

Truth: R real, H harmless. Hot is the FloorPlan hot sector, or the intake sector when there is no FloorPlan. Δ panels: `-X` is an expected panel that is missing, `!X` a discouraged panel that is present.

| # | Time | Feed tier | Truth | Key action | Model action | Disp | Hot (model → key) | Recall | Panels (model) | Δ panels | Playbook | Sound | Lat s | Pts |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 09:40 | LOW_HAUNT | R | observe | contain ✗ | ✗ | catering ✓ → catering | 100% | ThreatBanner, SourceLedger, EMFGauge, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker | – | anomalous ✗ | sting_ghost | 16 | 4/6 |
| 2 | 09:55 | ELEVATED_HAUNT | H | observe | contain ✗ | ✗ | entrance ✓ → entrance | 100% | ThreatBanner, FloorPlan, CivilianTracker, ThermalReadout, CountermeasurePicker, SystemsBoard, SourceLedger | !CountermeasurePicker !CivilianTracker !SystemsBoard | spectral | sting_ghost | 17 | 3/6 |
| 3 | 10:35 | UNVERIFIED | R | observe | contain ✗ | ✗ | lounge ✓ → lounge | 100% | ThreatBanner, EMFGauge, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SourceLedger | – | anomalous ✗ | sting_ghost | 16 | 4/6 |
| 4 | 11:20 | LOW_HAUNT | R | observe | contain ✗ | ✗ | hack_floor_west ✓ → hack_floor_west | 100% | ThreatBanner, EMFGauge, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, SourceLedger | !SourceLedger | anomalous ✗ | sting_ghost | 17 | 3/6 |
| 5 | 12:10 | ELEVATED_HAUNT | R | contain | contain ✓ | ✗ | catering ✓ → catering | 100% | ThreatBanner, EMFGauge, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, SourceLedger | !SystemsBoard | spectral | sting_ghost | 16 | 4/6 |
| 6 | 12:40 | LOW_HAUNT | R | observe | contain ✗ | ✗ | registration ✓ → registration | 100% | ThreatBanner, FloorPlan, CivilianTracker, EMFGauge, CountermeasurePicker, SystemsBoard, SourceLedger | – | anomalous ✗ | sting_poltergeist | 16 | 4/6 |
| 7 | 13:05 | CRITICAL_HAUNT | H | observe | contain ✗ | ✗ | catering ✓ → catering | 100% | ThreatBanner, EMFGauge, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, SourceLedger | !CountermeasurePicker !CivilianTracker !SystemsBoard | spectral | sting_ghost | 18 | 3/6 |
| 8 | 13:40 | ELEVATED_HAUNT | R | contain (D) | evacuate ✗ | ✓ | hack_floor_east ✓ → hack_floor_east | 100% | ThreatBanner, FloorPlan, CivilianTracker, EMFGauge, ThermalReadout, CountermeasurePicker, SystemsBoard | !SystemsBoard | spectral | sting_poltergeist | 14 | 4/6 |
| 9 | 14:15 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | network_closet ✓ → network_closet | 83% | ThreatBanner, EMFGauge, ThermalReadout, SystemsBoard, FloorPlan, CountermeasurePicker, SourceLedger | -CivilianTracker | anomalous ✗ | sting_ghost | 17 | 5.833/6 |
| 10 | 14:50 | LOW_HAUNT | R | observe | contain ✗ | ✗ | main_stage ✓ → main_stage | 75% | ThreatBanner, EMFGauge, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard | -SourceLedger !CountermeasurePicker | spectral | sting_ghost | 18 | 2.75/6 |
| 11 | 15:05 | UNVERIFIED | H | observe | contain ✗ | ✗ | hack_floor_west ✓ → hack_floor_west | 100% | ThreatBanner, EMFGauge, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, SourceLedger | !CountermeasurePicker !CivilianTracker !ThermalReadout | anomalous ✗ | sting_ghost | 18 | 3/6 |
| 12 | 15:30 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | catering ✓ → catering | 100% | ThreatBanner, EMFGauge, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard | – | spectral | sting_ghost | 13 | 6/6 |
| 13 | 16:12 | CRITICAL_HAUNT | R | evacuate (D) | evacuate ✓ | ✓ | catering ✓ → catering | 100% | ThreatBanner, EMFGauge, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard | – | spectral | sting_ghost | 14 | 6/6 |
| 14 | 16:20 | CRITICAL_HAUNT | R | evacuate (D) | contain ✗ | ✓ | catering ✓ → catering | 100% | ThreatBanner, EMFGauge, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, SourceLedger | – | spectral | sting_ghost | 20 | 5/6 |
| 15 | 16:32 | CRITICAL_HAUNT | R | contain (D) | contain ✓ | ✓ | catering ✓ → catering | 100% | ThreatBanner, EMFGauge, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard | – | spectral | sting_ghost | 15 | 6/6 |
| 16 | 16:48 | UNVERIFIED | R | observe | contain ✗ | ✗ | entrance ✓ → entrance | 100% | ThreatBanner, EMFGauge, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SourceLedger | !CivilianTracker | spectral | sting_ghost | 19 | 3/6 |
| 17 | 17:05 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | hack_floor_east ✓ → hack_floor_east | 100% | ThreatBanner, EMFGauge, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, SourceLedger | !SourceLedger | spectral | sting_ghost | 20 | 5/6 |
| 18 | 17:40 | CRITICAL_HAUNT | R | evacuate (D) | evacuate ✓ | ✓ | network_closet ✓ → network_closet | 100% | ThreatBanner, FloorPlan, CivilianTracker, EMFGauge, ThermalReadout, SystemsBoard, CountermeasurePicker, SourceLedger | – | spectral | sting_ghost | 19 | 6/6 |
| 19 | 18:08 | LOW_HAUNT | R | observe | contain ✗ | ✗ | network_closet ✗ → hack_floor_west | 100% | ThreatBanner, FloorPlan, CivilianTracker, EMFGauge, ThermalReadout, CountermeasurePicker, SystemsBoard, SourceLedger | – | spectral | sting_ghost | 19 | 3/6 |
| 20 | 18:25 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | registration ✓ → registration | 100% | ThreatBanner, FloorPlan, CivilianTracker, EMFGauge, ThermalReadout, CountermeasurePicker, SystemsBoard | – | spectral | sting_ghost | 14 | 6/6 |
| 21 | 18:40 | ELEVATED_HAUNT | H | observe | observe ✓ | ✓ | lounge ✓ → lounge | 50% | ThreatBanner, SourceLedger, ThermalReadout | -FloorPlan | spectral | all_clear | 17 | 5.5/6 |
| 22 | 19:10 | LOW_HAUNT | H | observe | contain ✗ | ✗ | main_stage ✓ → main_stage | 100% | ThreatBanner, FloorPlan, CivilianTracker, CountermeasurePicker, SourceLedger | !CountermeasurePicker !CivilianTracker | spectral | sting_ghost | 19 | 3/6 |
| 23 | 19:35 | CRITICAL_HAUNT | R | contain (D) | evacuate ✗ | ✓ | main_stage ✓ → main_stage | 86% | ThreatBanner, EMFGauge, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SourceLedger | -SystemsBoard | spectral | sting_ghost | 18 | 4.857/6 |
| 24 | 20:05 | UNVERIFIED | R | observe | contain ✗ | ✗ | catering ✓ → catering | 100% | ThreatBanner, EMFGauge, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SourceLedger | !CivilianTracker | spectral | sting_ghost | 17 | 3/6 |

## Where the points went

| Criterion | Points lost | Steps |
|---|---|---|
| action | 15.00 | 1, 2, 3, 4, 6, 7, 8, 10, 11, 14, 16, 19, 22, 23, 24 |
| dispatch | 13.00 | 1, 2, 3, 4, 5, 6, 7, 10, 11, 16, 19, 22, 24 |
| hot | 1.00 | 19 |
| recall | 1.06 | 9 (-0.17), 10 (-0.25), 21 (-0.50), 23 (-0.14) |
| no_discouraged | 11.00 | 2, 4, 5, 7, 8, 10, 11, 16, 17, 22, 24 |
| no_failure | 0.00 | – |

- **false alarms (harmless, acted)**: steps 2, 7, 11, 22
- **over-escalations (real/observe step, acted)**: steps 1, 3, 4, 6, 10, 16, 19, 24
- **contain↔evacuate mismatches**: steps 8, 14, 23
- **alarmist harmless layout**: steps 2, 7, 11, 22
- **expected panels most often missing**: CivilianTracker ×1 (steps 9); SourceLedger ×1 (steps 10); FloorPlan ×1 (steps 21); SystemsBoard ×1 (steps 23)
- **discouraged panels most often present**: CivilianTracker ×6 (steps 2, 7, 11, 16, 22, 24); CountermeasurePicker ×5 (steps 2, 7, 10, 11, 22); SystemsBoard ×4 (steps 2, 5, 7, 8); SourceLedger ×2 (steps 4, 17); ThermalReadout ×1 (steps 11)
- **pipeline notes**: dropped a quick action this station cannot run: … ×25; the EMF reading is above its threshold: danger ×14; dropped a ThreatBanner title over 6 words or 32 … ×6; dropped a CountermeasurePicker title over 6 word… ×3; dropped an EMFGauge showing an ordinary reading ×1; the civilian count 31 became the 7 people in rea… ×1; dropped a ThermalReadout showing its normal temp… ×1; dropped 1 evidence quote(s) not found in the rep… ×1
