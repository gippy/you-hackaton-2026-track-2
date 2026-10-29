# Zombie Rush eval report: run zombies-d

Generated 2026-10-28 18:49 · pipeline `8292cf0dcc` · sky input OFF · scenario `fixtures/zombies/scenario.json` · answer key `fixtures/zombies/answer-key.json`

Model(s) seen: parasail-minimax-m31-flash · steps run: 24 · failures: 0

Dispatch is scored from `recommended_action` (observe = no dispatch). The pipeline itself never posts; nothing was sent to Discord or PagerDuty.

## Score: 114.5 / 144 points (80%)

Per step, one point each for: action match, dispatch match, hot-sector match, panel recall (fractional), no discouraged panel, no failure.

## Metrics

| Metric | This run |
|---|---|
| Points | 114.5/144 |
| **Misses** (key says contain/evacuate, model observed) | 1/15 |
| False alarms (harmless step, model acts) | 2/5 |
| Harmless handled calmly (observe, low banner, no discouraged panel) | 3/5 |
| Harmless with the `all_clear` cue | 2/5 |
| Over-escalations (real step the key wants watched, model acts) | 4/4 |
| Action match | 14/24 |
| Contain against evacuate: called too low / too high | 0 / 3 |
| Dispatch match | 18/24 |
| Intake severity copies the feed tier (the model reads the label, not the text) | 10/19 |
| Routed to the key's playbook (not scored) | 24/24 |
| Playbooks routed | corporeal ×24 |
| Hot sector match (FloorPlan, else intake sector) | 20/24 |
| Hot sector match from the intake alone | 19/24 |
| Seal set exact (not scored) | 4/24 |
| Route set exact (not scored) | 3/24 |
| Panel recall, mean | 94% |
| Steps with every expected panel | 21/24 |
| Steps with a discouraged panel | 8/24 |
| Discouraged panels shown, in all | 9 |
| Panels the key neither expects nor discourages (neutral) | SourceLedger ×13, SystemsBoard ×4, EntityCard ×1, FloorPlan ×1 |
| Distinct layouts | 7 |
| Distinct layouts the key expects | 11 |
| Most common layout | CivilianTracker, CountermeasurePicker, FloorPlan, SourceLedger, SystemsBoard, ThreatBanner on 10/24 steps |
| Mean pairwise layout distance (Jaccard, 0 = identical) | 0.22 |
| Failures (bad JSON, timeout, empty output) | 0/24 |
| Latency per step, mean | 16.4s |
| Latency per step, median | 16.1s |
| Latency per step, p95 | 22.2s |
| Latency per step, max | 27.3s |
| Intake phase inside the flow, mean | 4.0s |
| Grounding phase inside the flow, mean | 7.5s |
| Compose phase inside the flow, mean | 3.5s |
| **Time to the first panel**, mean | 13.5s |
| Time to the last panel, mean | 15.6s |

## Action confusion (rows = key, columns = model)

| key \ model | observe | contain | evacuate |
|---|---|---|---|
| observe | 3 | 6 | 0 |
| contain | 1 | 7 | 3 |
| evacuate | 0 | 0 | 4 |

## Per step

Truth: R real, H harmless. Hot is the FloorPlan hot sector, or the intake sector when there is no FloorPlan. Δ panels: `-X` is an expected panel that is missing, `!X` a discouraged panel that is present.

| # | Time | Feed tier | Truth | Key action | Model action | Disp | Hot (model → key) | Recall | Panels (model) | Δ panels | Playbook | Sound | Lat s | Pts |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 09:34 | ELEVATED_HAUNT | H | observe | contain ✗ | ✗ | entrance ✓ → entrance | 100% | ThreatBanner, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, SourceLedger | !CountermeasurePicker | corporeal | sting_zombie | 16 | 3/6 |
| 2 | 10:09 | UNVERIFIED | R | observe | contain ✗ | ✗ | entrance ✓ → entrance | 100% | ThreatBanner, FloorPlan, CivilianTracker, SystemsBoard, ThermalReadout, CountermeasurePicker, SourceLedger | !CountermeasurePicker !FloorPlan | corporeal | sting_zombie | 17 | 3/6 |
| 3 | 10:46 | LOW_HAUNT | R | contain (D) | contain ✓ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, FloorPlan, CivilianTracker, ThermalReadout, CountermeasurePicker, SystemsBoard, SourceLedger | – | corporeal | sting_zombie | 13 | 6/6 |
| 4 | 11:12 | CRITICAL_HAUNT | H | observe | observe ✓ | ✓ | hack_floor_west ✓ → hack_floor_west | 67% | ThreatBanner, SourceLedger, SystemsBoard | -EMFGauge | corporeal | all_clear | 13 | 5.667/6 |
| 5 | 11:39 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, FloorPlan, CivilianTracker, ThermalReadout, SystemsBoard, CountermeasurePicker, SourceLedger | – | corporeal | sting_zombie | 18 | 6/6 |
| 6 | 12:17 | CRITICAL_HAUNT | R | contain (D) | contain ✓ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, FloorPlan, CivilianTracker, SystemsBoard, CountermeasurePicker, SourceLedger | – | corporeal | sting_zombie | 14 | 6/6 |
| 7 | 12:44 | LOW_HAUNT | R | contain (D) | evacuate ✗ | ✓ | entrance ✗ → registration | 100% | ThreatBanner, FloorPlan, CivilianTracker, SystemsBoard, CountermeasurePicker, SourceLedger | – | corporeal | sting_zombie | 20 | 4/6 |
| 8 | 13:04 | UNVERIFIED | H | observe | contain ✗ | ✗ | catering ✓ → catering | 100% | ThreatBanner, FloorPlan, CivilianTracker, SystemsBoard, CountermeasurePicker, SourceLedger | !CountermeasurePicker | corporeal | sting_zombie | 27 | 3/6 |
| 9 | 13:41 | ELEVATED_HAUNT | R | contain (D) | evacuate ✗ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, FloorPlan, CivilianTracker, SystemsBoard, ThermalReadout, CountermeasurePicker, SourceLedger | – | corporeal | sting_zombie | 22 | 5/6 |
| 10 | 14:18 | LOW_HAUNT | R | evacuate (D) | evacuate ✓ | ✓ | network_closet ✓ → network_closet | 100% | ThreatBanner, CivilianTracker, FloorPlan, ThermalReadout, SystemsBoard, CountermeasurePicker, SourceLedger | !CountermeasurePicker | corporeal | sting_zombie | 15 | 5/6 |
| 11 | 15:03 | UNVERIFIED | R | observe | contain ✗ | ✗ | main_stage ✓ → main_stage | 100% | ThreatBanner, FloorPlan, CivilianTracker, SystemsBoard, CountermeasurePicker, SourceLedger | !CountermeasurePicker | corporeal | sting_zombie | 22 | 3/6 |
| 12 | 15:36 | ELEVATED_HAUNT | R | contain (D) | evacuate ✗ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, ThermalReadout, SourceLedger | – | corporeal | sting_zombie | 17 | 5/6 |
| 13 | 16:05 | UNVERIFIED | R | contain (D) | contain ✓ | ✓ | catering ✓ → catering | 100% | ThreatBanner, FloorPlan, CivilianTracker, SystemsBoard, CountermeasurePicker, ThermalReadout, SourceLedger | – | corporeal | sting_zombie | 14 | 6/6 |
| 14 | 16:48 | CRITICAL_HAUNT | H | observe | observe ✓ | ✓ | registration ✓ → registration | 100% | ThreatBanner, FloorPlan, CivilianTracker, SystemsBoard, ThermalReadout, SourceLedger | – | corporeal | sting_zombie | 16 | 6/6 |
| 15 | 17:20 | LOW_HAUNT | R | contain (D) | contain ✓ | ✓ | lounge ✓ → lounge | 100% | ThreatBanner, CivilianTracker, FloorPlan, ThermalReadout, CountermeasurePicker, SourceLedger | – | corporeal | sting_zombie | 16 | 6/6 |
| 16 | 17:51 | ELEVATED_HAUNT | R | contain (D) | observe ✗ | ✗ | lounge ✗ → hack_floor_east | 50% | ThreatBanner, SourceLedger, SystemsBoard, ThermalReadout | -CivilianTracker -FloorPlan !ThermalReadout | corporeal | all_clear | 18 | 1.5/6 |
| 17 | 18:02 | LOW_HAUNT | R | contain (D) | contain ✓ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, FloorPlan, CivilianTracker, SystemsBoard, CountermeasurePicker, SourceLedger | – | corporeal | sting_zombie | 17 | 6/6 |
| 18 | 18:25 | CRITICAL_HAUNT | R | evacuate (D) | evacuate ✓ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, SourceLedger | – | corporeal | sting_zombie | 14 | 6/6 |
| 19 | 18:44 | CRITICAL_HAUNT | R | evacuate (D) | evacuate ✓ | ✓ | entrance ✗ → lounge | 100% | ThreatBanner, CivilianTracker, FloorPlan, SystemsBoard, CountermeasurePicker, EntityCard | – | corporeal | sting_zombie | 13 | 5/6 |
| 20 | 19:12 | LOW_HAUNT | R | evacuate (D) | evacuate ✓ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, CivilianTracker, FloorPlan, SystemsBoard, ThermalReadout, CountermeasurePicker, SourceLedger | – | corporeal | sting_zombie | 14 | 6/6 |
| 21 | 19:33 | ELEVATED_HAUNT | H | observe | observe ✓ | ✓ | main_stage ✓ → main_stage | 33% | ThreatBanner, SourceLedger, SystemsBoard | -FloorPlan -CivilianTracker | corporeal | all_clear | 16 | 5.333/6 |
| 22 | 19:48 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, SourceLedger | – | corporeal | sting_zombie | 16 | 6/6 |
| 23 | 20:24 | LOW_HAUNT | R | observe (D) | contain ✗ | ✓ | entrance ✗ → registration | 100% | ThreatBanner, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, SourceLedger | !CountermeasurePicker | corporeal | sting_zombie | 10 | 3/6 |
| 24 | 20:48 | UNVERIFIED | R | observe | contain ✗ | ✗ | entrance ✓ → entrance | 100% | ThreatBanner, FloorPlan, CivilianTracker, SystemsBoard, CountermeasurePicker, SourceLedger | !CountermeasurePicker | corporeal | sting_zombie | 13 | 3/6 |

## Where the points went

| Criterion | Points lost | Steps |
|---|---|---|
| action | 10.00 | 1, 2, 7, 8, 9, 11, 12, 16, 23, 24 |
| dispatch | 6.00 | 1, 2, 8, 11, 16, 24 |
| hot | 4.00 | 7, 16, 19, 23 |
| recall | 1.50 | 4 (-0.33), 16 (-0.50), 21 (-0.67) |
| no_discouraged | 8.00 | 1, 2, 8, 10, 11, 16, 23, 24 |
| no_failure | 0.00 | – |

- **false alarms (harmless, acted)**: steps 1, 8
- **misses (acting step, observed)**: steps 16
- **over-escalations (real/observe step, acted)**: steps 2, 11, 23, 24
- **contain↔evacuate mismatches**: steps 7, 9, 12
- **alarmist harmless layout**: steps 1, 8
- **expected panels most often missing**: CivilianTracker ×2 (steps 16, 21); FloorPlan ×2 (steps 16, 21); EMFGauge ×1 (steps 4)
- **discouraged panels most often present**: CountermeasurePicker ×7 (steps 1, 2, 8, 10, 11, 23, 24); FloorPlan ×1 (steps 2); ThermalReadout ×1 (steps 16)
- **pipeline notes**: dropped a quick action this station cannot run: … ×31; dropped a ThreatBanner title over 6 words or 32 … ×2; the civilian count 231 became the 220 people in … ×1; dropped 2 evidence quote(s) not found in the rep… ×1; dropped a SystemsBoard title over 6 words or 32 … ×1; dropped a CountermeasurePicker title over 6 word… ×1; the civilian count 8 became the 6 people in reac… ×1; dropped 1 evidence quote(s) not found in the rep… ×1; dropped a ThermalReadout showing its normal temp… ×1
