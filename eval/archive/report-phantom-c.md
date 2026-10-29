# The Coffee Bar Phantom eval report: run phantom-c

Generated 2026-10-28 18:01 · pipeline `c94aa03f3b` · sky input OFF · scenario `fixtures/phantom/scenario.json` · answer key `fixtures/phantom/answer-key.json`

The files on disk have changed since this run (now `18e72150f3`).

Model(s) seen: parasail-minimax-m31-flash · steps run: 24 · failures: 0

Dispatch is scored from `recommended_action` (observe = no dispatch). The pipeline itself never posts; nothing was sent to Discord or PagerDuty.

## Score: 113.99 / 144 points (79%)

Per step, one point each for: action match, dispatch match, hot-sector match, panel recall (fractional), no discouraged panel, no failure.

## Metrics

| Metric | This run |
|---|---|
| Points | 113.99/144 |
| **Misses** (key says contain/evacuate, model observed) | 0/11 |
| False alarms (harmless step, model acts) | 1/5 |
| Harmless handled calmly (observe, low banner, no discouraged panel) | 3/5 |
| Harmless with the `all_clear` cue | 3/5 |
| Over-escalations (real step the key wants watched, model acts) | 8/8 |
| Action match | 14/24 |
| Contain against evacuate: called too low / too high | 1 / 0 |
| Dispatch match | 14/24 |
| Intake severity copies the feed tier (the model reads the label, not the text) | 15/20 |
| Routed to the key's playbook (not scored) | 18/24 |
| Playbooks routed | spectral ×18, anomalous ×6 |
| Hot sector match (FloorPlan, else intake sector) | 23/24 |
| Hot sector match from the intake alone | 23/24 |
| Seal set exact (not scored) | 7/24 |
| Route set exact (not scored) | 3/24 |
| Panel recall, mean | 92% |
| Steps with every expected panel | 17/24 |
| Steps with a discouraged panel | 7/24 |
| Discouraged panels shown, in all | 9 |
| Panels the key neither expects nor discourages (neutral) | EntityCard ×4, SourceLedger ×2 |
| Distinct layouts | 10 |
| Distinct layouts the key expects | 13 |
| Most common layout | CivilianTracker, CountermeasurePicker, EMFGauge, FloorPlan, SourceLedger, SystemsBoard, ThermalReadout, ThreatBanner on 7/24 steps |
| Mean pairwise layout distance (Jaccard, 0 = identical) | 0.30 |
| Failures (bad JSON, timeout, empty output) | 0/24 |
| Latency per step, mean | 15.9s |
| Latency per step, median | 16.3s |
| Latency per step, p95 | 20.6s |
| Latency per step, max | 23.0s |
| Intake phase inside the flow, mean | 3.3s |
| Grounding phase inside the flow, mean | 7.6s |
| Compose phase inside the flow, mean | 3.7s |
| **Time to the first panel**, mean | 13.3s |
| Time to the last panel, mean | 15.2s |

## Action confusion (rows = key, columns = model)

| key \ model | observe | contain | evacuate |
|---|---|---|---|
| observe | 4 | 9 | 0 |
| contain | 0 | 8 | 0 |
| evacuate | 0 | 1 | 2 |

## Per step

Truth: R real, H harmless. Hot is the FloorPlan hot sector, or the intake sector when there is no FloorPlan. Δ panels: `-X` is an expected panel that is missing, `!X` a discouraged panel that is present.

| # | Time | Feed tier | Truth | Key action | Model action | Disp | Hot (model → key) | Recall | Panels (model) | Δ panels | Playbook | Sound | Lat s | Pts |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 09:40 | LOW_HAUNT | R | observe | contain ✗ | ✗ | catering ✓ → catering | 100% | ThreatBanner, FloorPlan, CivilianTracker, EMFGauge, ThermalReadout, CountermeasurePicker, SourceLedger | – | anomalous ✗ | sting_poltergeist | 15 | 4/6 |
| 2 | 09:55 | ELEVATED_HAUNT | H | observe | observe ✓ | ✓ | entrance ✓ → entrance | 50% | ThreatBanner, SourceLedger, EntityCard | -FloorPlan | spectral | all_clear | 16 | 5.5/6 |
| 3 | 10:35 | UNVERIFIED | R | observe | contain ✗ | ✗ | lounge ✓ → lounge | 100% | ThreatBanner, EMFGauge, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SourceLedger | – | spectral | sting_ghost | 14 | 4/6 |
| 4 | 11:20 | LOW_HAUNT | R | observe | contain ✗ | ✗ | hack_floor_west ✓ → hack_floor_west | 100% | ThreatBanner, EMFGauge, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, SourceLedger | !SourceLedger | anomalous ✗ | sting_ghost | 17 | 3/6 |
| 5 | 12:10 | ELEVATED_HAUNT | R | contain | contain ✓ | ✗ | catering ✓ → catering | 100% | ThreatBanner, EMFGauge, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, SourceLedger | !SystemsBoard | spectral | sting_ghost | 21 | 4/6 |
| 6 | 12:40 | LOW_HAUNT | R | observe | contain ✗ | ✗ | registration ✓ → registration | 100% | ThreatBanner, FloorPlan, CivilianTracker, CountermeasurePicker, EMFGauge, SystemsBoard, SourceLedger | – | spectral | sting_ghost | 18 | 4/6 |
| 7 | 13:05 | CRITICAL_HAUNT | H | observe | observe ✓ | ✓ | catering ✓ → catering | 100% | ThreatBanner, EMFGauge, ThermalReadout, FloorPlan, CivilianTracker, SourceLedger, EntityCard | !CivilianTracker | spectral | sting_ghost | 16 | 5/6 |
| 8 | 13:40 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | hack_floor_east ✓ → hack_floor_east | 100% | ThreatBanner, EMFGauge, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SourceLedger, EntityCard | – | spectral | sting_ghost | 17 | 6/6 |
| 9 | 14:15 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | network_closet ✓ → network_closet | 83% | ThreatBanner, EMFGauge, ThermalReadout, FloorPlan, SystemsBoard, CountermeasurePicker, SourceLedger | -CivilianTracker | anomalous ✗ | sting_ghost | 17 | 5.833/6 |
| 10 | 14:50 | LOW_HAUNT | R | observe | contain ✗ | ✗ | main_stage ✓ → main_stage | 100% | ThreatBanner, EMFGauge, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, SourceLedger | !CountermeasurePicker | spectral | sting_ghost | 16 | 3/6 |
| 11 | 15:05 | UNVERIFIED | H | observe | contain ✗ | ✗ | hack_floor_west ✓ → hack_floor_west | 100% | ThreatBanner, EMFGauge, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, SourceLedger | !CountermeasurePicker !CivilianTracker | anomalous ✗ | sting_poltergeist | 14 | 3/6 |
| 12 | 15:30 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | catering ✓ → catering | 100% | ThreatBanner, EMFGauge, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard | – | spectral | sting_ghost | 23 | 6/6 |
| 13 | 16:12 | CRITICAL_HAUNT | R | evacuate (D) | evacuate ✓ | ✓ | catering ✓ → catering | 100% | ThreatBanner, EMFGauge, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, SourceLedger | – | spectral | sting_ghost | 18 | 6/6 |
| 14 | 16:20 | CRITICAL_HAUNT | R | evacuate (D) | contain ✗ | ✓ | catering ✓ → catering | 100% | ThreatBanner, EMFGauge, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, SourceLedger | – | spectral | sting_ghost | 14 | 5/6 |
| 15 | 16:32 | CRITICAL_HAUNT | R | contain (D) | contain ✓ | ✓ | catering ✓ → catering | 83% | ThreatBanner, EMFGauge, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SourceLedger | -SystemsBoard | spectral | sting_ghost | 13 | 5.833/6 |
| 16 | 16:48 | UNVERIFIED | R | observe | contain ✗ | ✗ | entrance ✓ → entrance | 100% | ThreatBanner, EMFGauge, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SourceLedger | !CivilianTracker | spectral | sting_ghost | 14 | 3/6 |
| 17 | 17:05 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | hack_floor_east ✓ → hack_floor_east | 100% | ThreatBanner, FloorPlan, CivilianTracker, EMFGauge, ThermalReadout, CountermeasurePicker, SystemsBoard | – | spectral | sting_ghost | 14 | 6/6 |
| 18 | 17:40 | CRITICAL_HAUNT | R | evacuate (D) | evacuate ✓ | ✓ | network_closet ✓ → network_closet | 86% | ThreatBanner, EMFGauge, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker | -SystemsBoard | anomalous ✗ | sting_ghost | 19 | 5.857/6 |
| 19 | 18:08 | LOW_HAUNT | R | observe | contain ✗ | ✗ | network_closet ✗ → hack_floor_west | 100% | ThreatBanner, FloorPlan, CivilianTracker, EMFGauge, ThermalReadout, CountermeasurePicker, SystemsBoard, SourceLedger | – | spectral | sting_ghost | 14 | 3/6 |
| 20 | 18:25 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | registration ✓ → registration | 100% | ThreatBanner, EMFGauge, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard | – | spectral | sting_ghost | 17 | 6/6 |
| 21 | 18:40 | ELEVATED_HAUNT | H | observe | observe ✓ | ✓ | lounge ✓ → lounge | 50% | ThreatBanner, SourceLedger, ThermalReadout | -FloorPlan | spectral | all_clear | 13 | 5.5/6 |
| 22 | 19:10 | LOW_HAUNT | H | observe | observe ✓ | ✓ | main_stage ✓ → main_stage | 67% | ThreatBanner, SourceLedger, EntityCard | -FloorPlan | spectral | all_clear | 13 | 5.667/6 |
| 23 | 19:35 | CRITICAL_HAUNT | R | contain (D) | contain ✓ | ✓ | main_stage ✓ → main_stage | 100% | ThreatBanner, EMFGauge, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, SourceLedger | – | spectral | sting_ghost | 18 | 6/6 |
| 24 | 20:05 | UNVERIFIED | R | observe | contain ✗ | ✗ | catering ✓ → catering | 80% | ThreatBanner, EMFGauge, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard | -SourceLedger !CivilianTracker !SystemsBoard | anomalous ✗ | sting_ghost | 13 | 2.8/6 |

## Where the points went

| Criterion | Points lost | Steps |
|---|---|---|
| action | 10.00 | 1, 3, 4, 6, 10, 11, 14, 16, 19, 24 |
| dispatch | 10.00 | 1, 3, 4, 5, 6, 10, 11, 16, 19, 24 |
| hot | 1.00 | 19 |
| recall | 2.01 | 2 (-0.50), 9 (-0.17), 15 (-0.17), 18 (-0.14), 21 (-0.50), 22 (-0.33), 24 (-0.20) |
| no_discouraged | 7.00 | 4, 5, 7, 10, 11, 16, 24 |
| no_failure | 0.00 | – |

- **false alarms (harmless, acted)**: steps 11
- **over-escalations (real/observe step, acted)**: steps 1, 3, 4, 6, 10, 16, 19, 24
- **contain↔evacuate mismatches**: steps 14
- **alarmist harmless layout**: steps 7, 11
- **expected panels most often missing**: FloorPlan ×3 (steps 2, 21, 22); SystemsBoard ×2 (steps 15, 18); CivilianTracker ×1 (steps 9); SourceLedger ×1 (steps 24)
- **discouraged panels most often present**: CivilianTracker ×4 (steps 7, 11, 16, 24); SystemsBoard ×2 (steps 5, 24); CountermeasurePicker ×2 (steps 10, 11); SourceLedger ×1 (steps 4)
- **pipeline notes**: dropped a quick action this station cannot run: … ×28; the EMF reading is above its threshold: danger ×14; dropped a ThreatBanner title over 6 words or 32 … ×3; dropped 1 evidence quote(s) not found in the rep… ×3; dropped a ThermalReadout showing its normal temp… ×1; dropped a CountermeasurePicker title over 6 word… ×1; dropped a FloorPlan title over 6 words or 32 cha… ×1; the civilian count 31 became the 7 people in rea… ×1; dropped a SystemsBoard with no systems ×1
