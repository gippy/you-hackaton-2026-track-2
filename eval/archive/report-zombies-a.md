# Nightfall eval report — run zombies-a

Generated 2026-10-28 16:33 · pipeline hash `160db8b1b7` · sky input OFF · scenario `fixtures/zombies/scenario.json` · answer key `fixtures/zombies/answer-key.json`

Model(s) seen: parasail-minimax-m31-flash · steps run: 24 · failures: 0

Dispatch is scored from `recommended_action` (observe = no dispatch). The pipeline itself never posts; nothing was sent to Discord or PagerDuty.

## Score: 106.399 / 144 points (74%)

Per step, one point each for: action match, dispatch match, hot-sector match, panel recall (fractional), no discouraged panel, no failure.

## Metrics

| Metric | Result |
|---|---|
| False alarms (harmless step, model acts or dispatches) | 2/5 |
| Harmless handled calmly (observe, low banner, no discouraged panel) | 2/5 (40%) |
| Harmless with the `all_clear` sound cue | 3/5 (60%) |
| Misses (key says contain/evacuate, model observes) | 3/15 |
| Over-escalation (real but key says observe, model acts) | 2/4 |
| Action match | 14/24 (58%) |
| of which called too low / too high (contain vs evacuate) | 2 / 1 |
| Dispatch match | 16/24 (67%) |
| Intake severity equals the feed's tier label (diagnostic: the model reads the label, not the text) | 10/19 (53%) of the steps with a LOW/ELEVATED/CRITICAL tier |
| Entity routed to the key's playbook (diagnostic, not scored) | 3/24 (12%); routed: anomalous ×18, corporeal ×3, spectral ×3 |
| Hot sector match (FloorPlan, else incident sector) | 19/24 (79%) |
| Hot sector match from the intake step alone | 19/24 (79%) |
| Seal set exact / route set exact (secondary, not scored) | 9/24 (38%) / 6/24 (25%) |
| Panel recall, mean | 85% (all expected present on 18/24 steps) |
| Discouraged panels present | 12 panels on 11/24 steps |
| Panels the key neither expects nor discourages | SourceLedger ×14, ThermalReadout ×2, SystemsBoard ×2, EntityCard ×2, FloorPlan ×1 (neutral) |
| Layout variety (distinct panel sets) | 9 distinct in 24 runs; the key itself expects 11 |
| Most common layout | CivilianTracker, CountermeasurePicker, FloorPlan, SourceLedger, SystemsBoard, ThermalReadout, ThreatBanner on 7/24 steps |
| Mean pairwise layout distance (Jaccard, 0 = identical) | 0.32 |
| Failures (bad JSON, timeout, empty output) | 0/24 |
| Latency per step (wall) | mean 17.5s · median 16.5s · p95 25.9s · max 26.1s |
| Mean phase time inside the flow | ingest 4.2s · ground 8.5s · compose 3.2s |
| Time to first / last component on the wire | 15.2s / 16.8s |

## Action confusion (rows = key, columns = model)

| key \ model | observe | contain | evacuate |
|---|---|---|---|
| observe | 5 | 4 | 0 |
| contain | 3 | 7 | 1 |
| evacuate | 0 | 2 | 2 |

## Per step

Truth: R real, H harmless. Hot is the FloorPlan hot sector, or the intake sector when there is no FloorPlan. Δ panels: `-X` is an expected panel that is missing, `!X` a discouraged panel that is present.

| # | Time | Feed tier | Truth | Key action | Model action | Disp | Hot (model → key) | Recall | Panels (model) | Δ panels | Playbook | Sound | Lat s | Pts |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 09:34 | ELEVATED_HAUNT | H | observe | contain ✗ | ✗ | entrance ✓ → entrance | 100% | ThreatBanner, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, SourceLedger | !CountermeasurePicker | corporeal | sting_zombie | 14 | 3/6 |
| 2 | 10:09 | UNVERIFIED | R | observe | observe ✓ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, SourceLedger, FloorPlan, CivilianTracker, SystemsBoard, ThermalReadout | !FloorPlan | anomalous ✗ | sting_ghost | 23 | 5/6 |
| 3 | 10:46 | LOW_HAUNT | R | contain (D) | contain ✓ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, FloorPlan, CivilianTracker, ThermalReadout, SystemsBoard, CountermeasurePicker, SourceLedger | – | spectral ✗ | sting_ghost | 14 | 6/6 |
| 4 | 11:12 | CRITICAL_HAUNT | H | observe | contain ✗ | ✗ | hack_floor_west ✓ → hack_floor_west | 100% | ThreatBanner, EMFGauge, FloorPlan, CivilianTracker, SystemsBoard, CountermeasurePicker, SourceLedger | !CountermeasurePicker !CivilianTracker | anomalous ✗ | alert_chime | 14 | 3/6 |
| 5 | 11:39 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, CivilianTracker, FloorPlan, SystemsBoard, ThermalReadout, CountermeasurePicker, SourceLedger | – | anomalous ✗ | sting_ghost | 14 | 6/6 |
| 6 | 12:17 | CRITICAL_HAUNT | R | contain (D) | contain ✓ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, SourceLedger, SystemsBoard, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker | – | anomalous ✗ | alert_chime | 17 | 6/6 |
| 7 | 12:44 | LOW_HAUNT | R | contain (D) | observe ✗ | ✗ | entrance ✗ → registration | 100% | ThreatBanner, SourceLedger, FloorPlan, CivilianTracker, SystemsBoard, ThermalReadout | – | anomalous ✗ | sting_zombie | 14 | 3/6 |
| 8 | 13:04 | UNVERIFIED | H | observe | observe ✓ | ✓ | catering ✓ → catering | 33% | ThreatBanner, SourceLedger, ThermalReadout | -CivilianTracker -FloorPlan !ThermalReadout | anomalous ✗ | all_clear | 19 | 4.333/6 |
| 9 | 13:41 | ELEVATED_HAUNT | R | contain (D) | evacuate ✗ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, CivilianTracker, FloorPlan, SystemsBoard, ThermalReadout, CountermeasurePicker, SourceLedger | – | spectral ✗ | sting_zombie | 11 | 5/6 |
| 10 | 14:18 | LOW_HAUNT | R | evacuate (D) | evacuate ✓ | ✓ | network_closet ✓ → network_closet | 100% | ThreatBanner, CivilianTracker, SystemsBoard, ThermalReadout, FloorPlan, CountermeasurePicker, SourceLedger | !CountermeasurePicker | spectral ✗ | sting_zombie | 26 | 5/6 |
| 11 | 15:03 | UNVERIFIED | R | observe | contain ✗ | ✗ | main_stage ✓ → main_stage | 100% | ThreatBanner, SourceLedger, CivilianTracker, FloorPlan, SystemsBoard, CountermeasurePicker | !CountermeasurePicker | anomalous ✗ | alert_chime | 26 | 3/6 |
| 12 | 15:36 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, SourceLedger, FloorPlan, CivilianTracker, ThermalReadout, SystemsBoard, CountermeasurePicker, EntityCard | – | anomalous ✗ | sting_ghost | 19 | 6/6 |
| 13 | 16:05 | UNVERIFIED | R | contain (D) | contain ✓ | ✓ | catering ✓ → catering | 100% | ThreatBanner, SourceLedger, SystemsBoard, CivilianTracker, FloorPlan, CountermeasurePicker | – | anomalous ✗ | alert_chime | 13 | 6/6 |
| 14 | 16:48 | CRITICAL_HAUNT | H | observe | observe ✓ | ✓ | registration ✓ → registration | 50% | ThreatBanner, SourceLedger, ThermalReadout | -CivilianTracker -SystemsBoard | corporeal | all_clear | 21 | 5.5/6 |
| 15 | 17:20 | LOW_HAUNT | R | contain (D) | contain ✓ | ✓ | lounge ✓ → lounge | 100% | ThreatBanner, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SourceLedger | – | corporeal | sting_zombie | 22 | 6/6 |
| 16 | 17:51 | ELEVATED_HAUNT | R | contain (D) | observe ✗ | ✗ | lounge ✗ → hack_floor_east | 50% | ThreatBanner, SourceLedger, ThermalReadout, SystemsBoard | -CivilianTracker -FloorPlan !ThermalReadout | anomalous ✗ | all_clear | 13 | 1.5/6 |
| 17 | 18:02 | LOW_HAUNT | R | contain (D) | contain ✓ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, SourceLedger, FloorPlan, CivilianTracker, SystemsBoard, ThermalReadout, CountermeasurePicker, EntityCard | !ThermalReadout | anomalous ✗ | alert_chime | 20 | 5/6 |
| 18 | 18:25 | CRITICAL_HAUNT | R | evacuate (D) | contain ✗ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, CivilianTracker, FloorPlan, SystemsBoard, CountermeasurePicker, SourceLedger | – | anomalous ✗ | sting_ghost | 14 | 5/6 |
| 19 | 18:44 | CRITICAL_HAUNT | R | evacuate (D) | contain ✗ | ✓ | entrance ✗ → lounge | 100% | ThreatBanner, CivilianTracker, FloorPlan, SystemsBoard, CountermeasurePicker, SourceLedger | – | anomalous ✗ | sting_zombie | 19 | 4/6 |
| 20 | 19:12 | LOW_HAUNT | R | evacuate (D) | evacuate ✓ | ✓ | lounge ✗ → entrance | 100% | ThreatBanner, CivilianTracker, FloorPlan, ThermalReadout, CountermeasurePicker, SourceLedger | – | anomalous ✗ | sting_residual_haunting | 14 | 5/6 |
| 21 | 19:33 | ELEVATED_HAUNT | H | observe | observe ✓ | ✓ | main_stage ✓ → main_stage | 33% | ThreatBanner, SourceLedger, SystemsBoard | -FloorPlan -CivilianTracker | anomalous ✗ | all_clear | 18 | 5.333/6 |
| 22 | 19:48 | ELEVATED_HAUNT | R | contain (D) | observe ✗ | ✗ | entrance ✓ → entrance | 40% | ThreatBanner, SourceLedger, ThermalReadout | -CountermeasurePicker -FloorPlan -CivilianTracker !ThermalReadout | anomalous ✗ | all_clear | 14 | 2.4/6 |
| 23 | 20:24 | LOW_HAUNT | R | observe (D) | observe ✓ | ✗ | entrance ✗ → registration | 33% | ThreatBanner, SourceLedger, ThermalReadout | -CivilianTracker -SystemsBoard !ThermalReadout | anomalous ✗ | all_clear | 16 | 2.333/6 |
| 24 | 20:48 | UNVERIFIED | R | observe | contain ✗ | ✗ | entrance ✓ → entrance | 100% | ThreatBanner, SourceLedger, SystemsBoard, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker | !CountermeasurePicker | anomalous ✗ | sting_zombie | 24 | 3/6 |

## Where the points went

| Criterion | Points lost | Steps |
|---|---|---|
| action | 10.00 | 1, 4, 7, 9, 11, 16, 18, 19, 22, 24 |
| dispatch | 8.00 | 1, 4, 7, 11, 16, 22, 23, 24 |
| hot | 5.00 | 7, 16, 19, 20, 23 |
| recall | 3.60 | 8 (-0.67), 14 (-0.50), 16 (-0.50), 21 (-0.67), 22 (-0.60), 23 (-0.67) |
| no_discouraged | 11.00 | 1, 2, 4, 8, 10, 11, 16, 17, 22, 23, 24 |
| no_failure | 0.00 | – |

- **false alarms (harmless, acted)**: steps 1, 4
- **misses (acting step, observed)**: steps 7, 16, 22
- **over-escalations (real/observe step, acted)**: steps 11, 24
- **contain↔evacuate mismatches**: steps 9, 18, 19
- **alarmist harmless layout**: steps 1, 4, 8
- **expected panels most often missing**: CivilianTracker ×6 (steps 8, 14, 16, 21, 22, 23); FloorPlan ×4 (steps 8, 16, 21, 22); SystemsBoard ×2 (steps 14, 23); CountermeasurePicker ×1 (steps 22)
- **discouraged panels most often present**: CountermeasurePicker ×5 (steps 1, 4, 10, 11, 24); ThermalReadout ×5 (steps 8, 16, 17, 22, 23); FloorPlan ×1 (steps 2); CivilianTracker ×1 (steps 4)
- **pipeline notes**: dropped a ThermalReadout showing its normal temp… ×2; dropped an EMFGauge showing an ordinary reading ×1; the EMF reading is above its threshold: danger ×1; a safe route that stopped inside the building no… ×1; the civilian count 8 became the 6 people in reac… ×1; the civilian count 4 became the 3 people in reac… ×1
