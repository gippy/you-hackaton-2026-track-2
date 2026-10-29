# Nightfall eval report — run zombies-b

Generated 2026-10-28 16:47 · pipeline hash `affb06cb80` · sky input OFF · scenario `fixtures/zombies/scenario.json` · answer key `fixtures/zombies/answer-key.json`

Model(s) seen: parasail-minimax-m31-flash · steps run: 24 · failures: 0

Dispatch is scored from `recommended_action` (observe = no dispatch). The pipeline itself never posts; nothing was sent to Discord or PagerDuty.

## Score: 105.799 / 144 points (73%)

Per step, one point each for: action match, dispatch match, hot-sector match, panel recall (fractional), no discouraged panel, no failure.

## Metrics

| Metric | Result |
|---|---|
| False alarms (harmless step, model acts or dispatches) | 5/5 |
| Harmless handled calmly (observe, low banner, no discouraged panel) | 0/5 (0%) |
| Harmless with the `all_clear` sound cue | 0/5 (0%) |
| Misses (key says contain/evacuate, model observes) | 1/15 |
| Over-escalation (real but key says observe, model acts) | 3/4 |
| Action match | 11/24 (46%) |
| of which called too low / too high (contain vs evacuate) | 0 / 4 |
| Dispatch match | 16/24 (67%) |
| Intake severity equals the feed's tier label (diagnostic: the model reads the label, not the text) | 12/19 (63%) of the steps with a LOW/ELEVATED/CRITICAL tier |
| Entity routed to the key's playbook (diagnostic, not scored) | 24/24 (100%); routed: corporeal ×24 |
| Hot sector match (FloorPlan, else incident sector) | 19/24 (79%) |
| Hot sector match from the intake step alone | 17/24 (71%) |
| Seal set exact / route set exact (secondary, not scored) | 2/24 (8%) / 1/24 (4%) |
| Panel recall, mean | 95% (all expected present on 19/24 steps) |
| Discouraged panels present | 13 panels on 11/24 steps |
| Panels the key neither expects nor discourages | SourceLedger ×12, SystemsBoard ×5, EntityCard ×3, ThermalReadout ×1, FloorPlan ×1 (neutral) |
| Layout variety (distinct panel sets) | 8 distinct in 24 runs; the key itself expects 11 |
| Most common layout | CivilianTracker, CountermeasurePicker, FloorPlan, SourceLedger, SystemsBoard, ThreatBanner on 9/24 steps |
| Mean pairwise layout distance (Jaccard, 0 = identical) | 0.21 |
| Failures (bad JSON, timeout, empty output) | 0/24 |
| Latency per step (wall) | mean 18.2s · median 17.5s · p95 23.7s · max 23.9s |
| Mean phase time inside the flow | ingest 3.9s · ground 8.9s · compose 4.1s |
| Time to first / last component on the wire | 15.0s / 17.2s |

## Action confusion (rows = key, columns = model)

| key \ model | observe | contain | evacuate |
|---|---|---|---|
| observe | 1 | 8 | 0 |
| contain | 1 | 6 | 4 |
| evacuate | 0 | 0 | 4 |

## Per step

Truth: R real, H harmless. Hot is the FloorPlan hot sector, or the intake sector when there is no FloorPlan. Δ panels: `-X` is an expected panel that is missing, `!X` a discouraged panel that is present.

| # | Time | Feed tier | Truth | Key action | Model action | Disp | Hot (model → key) | Recall | Panels (model) | Δ panels | Playbook | Sound | Lat s | Pts |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 09:34 | ELEVATED_HAUNT | H | observe | contain ✗ | ✗ | entrance ✓ → entrance | 100% | ThreatBanner, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, SourceLedger | !CountermeasurePicker | corporeal | sting_zombie | 18 | 3/6 |
| 2 | 10:09 | UNVERIFIED | R | observe | observe ✓ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, FloorPlan, CivilianTracker, SystemsBoard, CountermeasurePicker, SourceLedger | !CountermeasurePicker !FloorPlan | corporeal | sting_zombie | 16 | 5/6 |
| 3 | 10:46 | LOW_HAUNT | R | contain (D) | evacuate ✗ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, FloorPlan, CivilianTracker, CountermeasurePicker, ThermalReadout, SystemsBoard, SourceLedger | – | corporeal | sting_zombie | 21 | 5/6 |
| 4 | 11:12 | CRITICAL_HAUNT | H | observe | contain ✗ | ✗ | hack_floor_west ✓ → hack_floor_west | 100% | ThreatBanner, EMFGauge, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, SourceLedger | !CountermeasurePicker !CivilianTracker | corporeal | alert_chime | 17 | 3/6 |
| 5 | 11:39 | ELEVATED_HAUNT | R | contain (D) | evacuate ✗ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, FloorPlan, CivilianTracker, CountermeasurePicker, ThermalReadout, SystemsBoard, SourceLedger | – | corporeal | sting_zombie | 16 | 5/6 |
| 6 | 12:17 | CRITICAL_HAUNT | R | contain (D) | evacuate ✗ | ✓ | entrance ✓ → entrance | 83% | ThreatBanner, FloorPlan, CivilianTracker, SystemsBoard, ThermalReadout, CountermeasurePicker, EntityCard | -SourceLedger | corporeal | sting_zombie | 17 | 4.833/6 |
| 7 | 12:44 | LOW_HAUNT | R | contain (D) | contain ✓ | ✓ | entrance ✗ → registration | 100% | ThreatBanner, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, ThermalReadout, SourceLedger | – | corporeal | sting_zombie | 18 | 5/6 |
| 8 | 13:04 | UNVERIFIED | H | observe | contain ✗ | ✗ | catering ✓ → catering | 100% | ThreatBanner, FloorPlan, CivilianTracker, SystemsBoard, SourceLedger, EntityCard | – | corporeal | sting_zombie | 19 | 4/6 |
| 9 | 13:41 | ELEVATED_HAUNT | R | contain (D) | evacuate ✗ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, FloorPlan, CivilianTracker, CountermeasurePicker, ThermalReadout, SystemsBoard | – | corporeal | sting_zombie | 16 | 5/6 |
| 10 | 14:18 | LOW_HAUNT | R | evacuate (D) | evacuate ✓ | ✓ | network_closet ✓ → network_closet | 100% | ThreatBanner, CivilianTracker, SystemsBoard, ThermalReadout, FloorPlan, CountermeasurePicker, SourceLedger | !CountermeasurePicker | corporeal | sting_zombie | 18 | 5/6 |
| 11 | 15:03 | UNVERIFIED | R | observe | contain ✗ | ✗ | main_stage ✓ → main_stage | 100% | ThreatBanner, FloorPlan, CivilianTracker, SystemsBoard, CountermeasurePicker, SourceLedger | !CountermeasurePicker | corporeal | sting_zombie | 16 | 3/6 |
| 12 | 15:36 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | entrance ✓ → entrance | 83% | ThreatBanner, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, ThermalReadout | -SourceLedger | corporeal | sting_zombie | 17 | 5.833/6 |
| 13 | 16:05 | UNVERIFIED | R | contain (D) | contain ✓ | ✓ | catering ✓ → catering | 100% | ThreatBanner, SourceLedger, SystemsBoard, FloorPlan, CivilianTracker, CountermeasurePicker | – | corporeal | sting_zombie | 24 | 6/6 |
| 14 | 16:48 | CRITICAL_HAUNT | H | observe | contain ✗ | ✗ | registration ✓ → registration | 100% | ThreatBanner, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, ThermalReadout, SourceLedger | !CountermeasurePicker | corporeal | sting_zombie | 21 | 3/6 |
| 15 | 17:20 | LOW_HAUNT | R | contain (D) | contain ✓ | ✓ | lounge ✓ → lounge | 100% | ThreatBanner, ThermalReadout, FloorPlan, CivilianTracker, SystemsBoard, CountermeasurePicker, SourceLedger | – | corporeal | sting_zombie | 24 | 6/6 |
| 16 | 17:51 | ELEVATED_HAUNT | R | contain (D) | observe ✗ | ✗ | lounge ✗ → hack_floor_east | 50% | ThreatBanner, SourceLedger, SystemsBoard, ThermalReadout | -CivilianTracker -FloorPlan !ThermalReadout | corporeal | all_clear | 20 | 1.5/6 |
| 17 | 18:02 | LOW_HAUNT | R | contain (D) | contain ✓ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, FloorPlan, CivilianTracker, SystemsBoard, ThermalReadout, CountermeasurePicker, SourceLedger | !ThermalReadout | corporeal | sting_zombie | 17 | 5/6 |
| 18 | 18:25 | CRITICAL_HAUNT | R | evacuate (D) | evacuate ✓ | ✓ | entrance ✓ → entrance | 83% | ThreatBanner, CivilianTracker, FloorPlan, SystemsBoard, CountermeasurePicker, EntityCard | -SourceLedger | corporeal | sting_zombie | 17 | 5.833/6 |
| 19 | 18:44 | CRITICAL_HAUNT | R | evacuate (D) | evacuate ✓ | ✓ | entrance ✗ → lounge | 100% | ThreatBanner, FloorPlan, CivilianTracker, SystemsBoard, CountermeasurePicker, ThermalReadout | – | corporeal | sting_zombie | 21 | 5/6 |
| 20 | 19:12 | LOW_HAUNT | R | evacuate (D) | evacuate ✓ | ✓ | catering ✗ → entrance | 80% | ThreatBanner, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, SourceLedger | -ThermalReadout | corporeal | sting_zombie | 18 | 4.8/6 |
| 21 | 19:33 | ELEVATED_HAUNT | H | observe | contain ✗ | ✗ | main_stage ✓ → main_stage | 100% | ThreatBanner, FloorPlan, CivilianTracker, SystemsBoard, CountermeasurePicker, SourceLedger | !CountermeasurePicker | corporeal | alert_chime | 18 | 3/6 |
| 22 | 19:48 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, SourceLedger | – | corporeal | sting_zombie | 17 | 6/6 |
| 23 | 20:24 | LOW_HAUNT | R | observe (D) | contain ✗ | ✓ | entrance ✗ → registration | 100% | ThreatBanner, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, SourceLedger | !CountermeasurePicker | corporeal | sting_zombie | 15 | 3/6 |
| 24 | 20:48 | UNVERIFIED | R | observe | contain ✗ | ✗ | entrance ✓ → entrance | 100% | ThreatBanner, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, SourceLedger | !CountermeasurePicker | corporeal | sting_zombie | 15 | 3/6 |

## Where the points went

| Criterion | Points lost | Steps |
|---|---|---|
| action | 13.00 | 1, 3, 4, 5, 6, 8, 9, 11, 14, 16, 21, 23, 24 |
| dispatch | 8.00 | 1, 4, 8, 11, 14, 16, 21, 24 |
| hot | 5.00 | 7, 16, 19, 20, 23 |
| recall | 1.20 | 6 (-0.17), 12 (-0.17), 16 (-0.50), 18 (-0.17), 20 (-0.20) |
| no_discouraged | 11.00 | 1, 2, 4, 10, 11, 14, 16, 17, 21, 23, 24 |
| no_failure | 0.00 | – |

- **false alarms (harmless, acted)**: steps 1, 4, 8, 14, 21
- **misses (acting step, observed)**: steps 16
- **over-escalations (real/observe step, acted)**: steps 11, 23, 24
- **contain↔evacuate mismatches**: steps 3, 5, 6, 9
- **alarmist harmless layout**: steps 1, 4, 14, 21
- **expected panels most often missing**: SourceLedger ×3 (steps 6, 12, 18); CivilianTracker ×1 (steps 16); FloorPlan ×1 (steps 16); ThermalReadout ×1 (steps 20)
- **discouraged panels most often present**: CountermeasurePicker ×9 (steps 1, 2, 4, 10, 11, 14, 21, 23, 24); ThermalReadout ×2 (steps 16, 17); FloorPlan ×1 (steps 2); CivilianTracker ×1 (steps 4)
- **pipeline notes**: dropped a quick action this station cannot run: … ×27; dropped a ThreatBanner title over 6 words or 32 … ×2; dropped a FloorPlan title over 6 words or 32 cha… ×2; dropped a ThermalReadout showing its normal temp… ×2; the civilian count 13 became the 9 people in rea… ×1; the EMF reading is above its threshold: danger ×1; dropped a CountermeasurePicker title over 6 word… ×1; dropped 2 evidence quote(s) not found in the rep… ×1; dropped 1 evidence quote(s) not found in the rep… ×1; the civilian count 4 became the 1 people in reac… ×1
