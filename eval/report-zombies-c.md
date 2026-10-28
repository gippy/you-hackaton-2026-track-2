# Nightfall eval report — run zombies-c

Generated 2026-10-28 16:54 · pipeline hash `c94aa03f3b` · sky input OFF · scenario `fixtures/zombies/scenario.json` · answer key `fixtures/zombies/answer-key.json`

Model(s) seen: parasail-minimax-m31-flash · steps run: 24 · failures: 0

Dispatch is scored from `recommended_action` (observe = no dispatch). The pipeline itself never posts; nothing was sent to Discord or PagerDuty.

## Score: 108.217 / 144 points (75%)

Per step, one point each for: action match, dispatch match, hot-sector match, panel recall (fractional), no discouraged panel, no failure.

## Metrics

| Metric | Result |
|---|---|
| False alarms (harmless step, model acts or dispatches) | 3/5 |
| Harmless handled calmly (observe, low banner, no discouraged panel) | 2/5 (40%) |
| Harmless with the `all_clear` sound cue | 2/5 (40%) |
| Misses (key says contain/evacuate, model observes) | 1/15 |
| Over-escalation (real but key says observe, model acts) | 4/4 |
| Action match | 10/24 (42%) |
| of which called too low / too high (contain vs evacuate) | 1 / 5 |
| Dispatch match | 17/24 (71%) |
| Intake severity equals the feed's tier label (diagnostic: the model reads the label, not the text) | 8/19 (42%) of the steps with a LOW/ELEVATED/CRITICAL tier |
| Entity routed to the key's playbook (diagnostic, not scored) | 24/24 (100%); routed: corporeal ×24 |
| Hot sector match (FloorPlan, else incident sector) | 20/24 (83%) |
| Hot sector match from the intake step alone | 20/24 (83%) |
| Seal set exact / route set exact (secondary, not scored) | 3/24 (12%) / 3/24 (12%) |
| Panel recall, mean | 93% (all expected present on 20/24 steps) |
| Discouraged panels present | 10 panels on 9/24 steps |
| Panels the key neither expects nor discourages | SourceLedger ×12, SystemsBoard ×4, ThermalReadout ×3, EntityCard ×1, FloorPlan ×1 (neutral) |
| Layout variety (distinct panel sets) | 7 distinct in 24 runs; the key itself expects 11 |
| Most common layout | CivilianTracker, CountermeasurePicker, FloorPlan, SourceLedger, SystemsBoard, ThreatBanner on 10/24 steps |
| Mean pairwise layout distance (Jaccard, 0 = identical) | 0.24 |
| Failures (bad JSON, timeout, empty output) | 0/24 |
| Latency per step (wall) | mean 15.1s · median 14.7s · p95 17.4s · max 24.4s |
| Mean phase time inside the flow | ingest 3.1s · ground 7.5s · compose 3.1s |
| Time to first / last component on the wire | 12.6s / 14.3s |

## Action confusion (rows = key, columns = model)

| key \ model | observe | contain | evacuate |
|---|---|---|---|
| observe | 2 | 7 | 0 |
| contain | 1 | 5 | 5 |
| evacuate | 0 | 1 | 3 |

## Per step

Truth: R real, H harmless. Hot is the FloorPlan hot sector, or the intake sector when there is no FloorPlan. Δ panels: `-X` is an expected panel that is missing, `!X` a discouraged panel that is present.

| # | Time | Feed tier | Truth | Key action | Model action | Disp | Hot (model → key) | Recall | Panels (model) | Δ panels | Playbook | Sound | Lat s | Pts |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 09:34 | ELEVATED_HAUNT | H | observe | contain ✗ | ✗ | entrance ✓ → entrance | 100% | ThreatBanner, FloorPlan, CivilianTracker, SystemsBoard, CountermeasurePicker, SourceLedger | !CountermeasurePicker | corporeal | sting_zombie | 14 | 3/6 |
| 2 | 10:09 | UNVERIFIED | R | observe | contain ✗ | ✗ | entrance ✓ → entrance | 100% | ThreatBanner, SourceLedger, SystemsBoard, ThermalReadout, CivilianTracker, FloorPlan, CountermeasurePicker | !CountermeasurePicker !FloorPlan | corporeal | sting_zombie | 15 | 3/6 |
| 3 | 10:46 | LOW_HAUNT | R | contain (D) | contain ✓ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, FloorPlan, CivilianTracker, ThermalReadout, CountermeasurePicker, SystemsBoard, SourceLedger | – | corporeal | sting_zombie | 15 | 6/6 |
| 4 | 11:12 | CRITICAL_HAUNT | H | observe | observe ✓ | ✓ | hack_floor_west ✓ → hack_floor_west | 67% | ThreatBanner, SourceLedger, SystemsBoard, ThermalReadout | -EMFGauge | corporeal | all_clear | 13 | 5.667/6 |
| 5 | 11:39 | ELEVATED_HAUNT | R | contain (D) | evacuate ✗ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, ThermalReadout, SourceLedger | – | corporeal | sting_zombie | 16 | 5/6 |
| 6 | 12:17 | CRITICAL_HAUNT | R | contain (D) | evacuate ✗ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, SourceLedger | – | corporeal | sting_zombie | 17 | 5/6 |
| 7 | 12:44 | LOW_HAUNT | R | contain (D) | evacuate ✗ | ✓ | entrance ✗ → registration | 100% | ThreatBanner, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, ThermalReadout | – | corporeal | sting_zombie | 15 | 4/6 |
| 8 | 13:04 | UNVERIFIED | H | observe | contain ✗ | ✗ | catering ✓ → catering | 100% | ThreatBanner, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, SourceLedger | !CountermeasurePicker | corporeal | sting_zombie | 17 | 3/6 |
| 9 | 13:41 | ELEVATED_HAUNT | R | contain (D) | evacuate ✗ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, FloorPlan, CivilianTracker, SystemsBoard, CountermeasurePicker, ThermalReadout | – | corporeal | sting_zombie | 16 | 5/6 |
| 10 | 14:18 | LOW_HAUNT | R | evacuate (D) | evacuate ✓ | ✓ | network_closet ✓ → network_closet | 100% | ThreatBanner, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, ThermalReadout, SourceLedger | !CountermeasurePicker | corporeal | sting_zombie | 17 | 5/6 |
| 11 | 15:03 | UNVERIFIED | R | observe | contain ✗ | ✗ | main_stage ✓ → main_stage | 100% | ThreatBanner, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, SourceLedger | !CountermeasurePicker | corporeal | sting_zombie | 12 | 3/6 |
| 12 | 15:36 | ELEVATED_HAUNT | R | contain (D) | evacuate ✗ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, ThermalReadout, SourceLedger | – | corporeal | sting_zombie | 15 | 5/6 |
| 13 | 16:05 | UNVERIFIED | R | contain (D) | contain ✓ | ✓ | catering ✓ → catering | 100% | ThreatBanner, FloorPlan, CivilianTracker, SystemsBoard, CountermeasurePicker, SourceLedger | – | corporeal | alert_chime | 24 | 6/6 |
| 14 | 16:48 | CRITICAL_HAUNT | H | observe | observe ✓ | ✓ | registration ✓ → registration | 25% | ThreatBanner, SourceLedger, EntityCard | -ThermalReadout -CivilianTracker -SystemsBoard | corporeal | all_clear | 13 | 5.25/6 |
| 15 | 17:20 | LOW_HAUNT | R | contain (D) | contain ✓ | ✓ | lounge ✓ → lounge | 100% | ThreatBanner, FloorPlan, CivilianTracker, ThermalReadout, CountermeasurePicker, SourceLedger | – | corporeal | sting_zombie | 13 | 6/6 |
| 16 | 17:51 | ELEVATED_HAUNT | R | contain (D) | observe ✗ | ✗ | lounge ✗ → hack_floor_east | 50% | ThreatBanner, SourceLedger, SystemsBoard | -CivilianTracker -FloorPlan | corporeal | all_clear | 12 | 2.5/6 |
| 17 | 18:02 | LOW_HAUNT | R | contain (D) | contain ✓ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, SourceLedger | – | corporeal | sting_zombie | 13 | 6/6 |
| 18 | 18:25 | CRITICAL_HAUNT | R | evacuate (D) | contain ✗ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, SourceLedger | – | corporeal | sting_zombie | 15 | 5/6 |
| 19 | 18:44 | CRITICAL_HAUNT | R | evacuate (D) | evacuate ✓ | ✓ | entrance ✗ → lounge | 100% | ThreatBanner, FloorPlan, CivilianTracker, SystemsBoard, CountermeasurePicker, SourceLedger | – | corporeal | sting_zombie | 15 | 5/6 |
| 20 | 19:12 | LOW_HAUNT | R | evacuate (D) | evacuate ✓ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, CivilianTracker, FloorPlan, SystemsBoard, CountermeasurePicker, ThermalReadout, SourceLedger | – | corporeal | sting_zombie | 16 | 6/6 |
| 21 | 19:33 | ELEVATED_HAUNT | H | observe | contain ✗ | ✗ | main_stage ✓ → main_stage | 100% | ThreatBanner, FloorPlan, CivilianTracker, SystemsBoard, CountermeasurePicker, SourceLedger, ThermalReadout | !CountermeasurePicker | corporeal | alert_chime | 15 | 3/6 |
| 22 | 19:48 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | entrance ✓ → entrance | 80% | ThreatBanner, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, ThermalReadout | -SourceLedger !ThermalReadout | corporeal | sting_zombie | 14 | 4.8/6 |
| 23 | 20:24 | LOW_HAUNT | R | observe (D) | contain ✗ | ✓ | entrance ✗ → registration | 100% | ThreatBanner, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, SourceLedger | !CountermeasurePicker | corporeal | sting_zombie | 13 | 3/6 |
| 24 | 20:48 | UNVERIFIED | R | observe | contain ✗ | ✗ | entrance ✓ → entrance | 100% | ThreatBanner, FloorPlan, CivilianTracker, SystemsBoard, CountermeasurePicker, SourceLedger | !CountermeasurePicker | corporeal | sting_zombie | 16 | 3/6 |

## Where the points went

| Criterion | Points lost | Steps |
|---|---|---|
| action | 14.00 | 1, 2, 5, 6, 7, 8, 9, 11, 12, 16, 18, 21, 23, 24 |
| dispatch | 7.00 | 1, 2, 8, 11, 16, 21, 24 |
| hot | 4.00 | 7, 16, 19, 23 |
| recall | 1.78 | 4 (-0.33), 14 (-0.75), 16 (-0.50), 22 (-0.20) |
| no_discouraged | 9.00 | 1, 2, 8, 10, 11, 21, 22, 23, 24 |
| no_failure | 0.00 | – |

- **false alarms (harmless, acted)**: steps 1, 8, 21
- **misses (acting step, observed)**: steps 16
- **over-escalations (real/observe step, acted)**: steps 2, 11, 23, 24
- **contain↔evacuate mismatches**: steps 5, 6, 7, 9, 12, 18
- **alarmist harmless layout**: steps 1, 8, 21
- **expected panels most often missing**: CivilianTracker ×2 (steps 14, 16); EMFGauge ×1 (steps 4); ThermalReadout ×1 (steps 14); SystemsBoard ×1 (steps 14); FloorPlan ×1 (steps 16); SourceLedger ×1 (steps 22)
- **discouraged panels most often present**: CountermeasurePicker ×8 (steps 1, 2, 8, 10, 11, 21, 23, 24); FloorPlan ×1 (steps 2); ThermalReadout ×1 (steps 22)
- **pipeline notes**: dropped a quick action this station cannot run: … ×26; dropped a ThreatBanner title over 6 words or 32 … ×6; dropped a ThermalReadout showing its normal temp… ×3; dropped a CountermeasurePicker title over 6 word… ×2; dropped a FloorPlan title over 6 words or 32 cha… ×2; dropped 2 evidence quote(s) not found in the rep… ×1; dropped 1 evidence quote(s) not found in the rep… ×1; the civilian count 4 became the 3 people in reac… ×1; dropped a SystemsBoard title over 6 words or 32 … ×1
