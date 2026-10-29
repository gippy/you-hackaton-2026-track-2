# Nightfall eval report: run j

Generated 2026-10-28 18:01 · pipeline `c94aa03f3b` · sky input on · scenario `fixtures/nightfall/scenario.json` · answer key `fixtures/nightfall/answer-key.json`

The files on disk have changed since this run (now `18e72150f3`).

Model(s) seen: parasail-minimax-m31-flash · steps run: 24 · failures: 0

Dispatch is scored from `recommended_action` (observe = no dispatch). The pipeline itself never posts; nothing was sent to Discord or PagerDuty.

## Score: 136.417 / 144 points (95%)

Per step, one point each for: action match, dispatch match, hot-sector match, panel recall (fractional), no discouraged panel, no failure.

## Metrics

| Metric | Baseline | This run |
|---|---|---|
| Points | 114/144 | 136.417/144 |
| **Misses** (key says contain/evacuate, model observed) | 0/14 | 0/14 |
| False alarms (harmless step, model acts) | 3/5 | 0/5 |
| Harmless handled calmly (observe, low banner, no discouraged panel) | 0/5 | 5/5 |
| Harmless with the `all_clear` cue | 1/5 | 5/5 |
| Over-escalations (real step the key wants watched, model acts) | 4/5 | 1/5 |
| Action match | 13/24 | 20/24 |
| Contain against evacuate: called too low / too high | 4 / 0 | 2 / 1 |
| Dispatch match | 17/24 | 23/24 |
| Intake severity copies the feed tier (the model reads the label, not the text) | 20/20 | 13/20 |
| Routed to the key's playbook (not scored) | 3/24 | 22/24 |
| Playbooks routed | spectral ×12, anomalous ×9, corporeal ×3 | corporeal ×22, anomalous ×2 |
| Hot sector match (FloorPlan, else intake sector) | 23/24 | 23/24 |
| Hot sector match from the intake alone | 23/24 | 24/24 |
| Seal set exact (not scored) | 7/24 | 15/24 |
| Route set exact (not scored) | 0/24 | 5/24 |
| Panel recall, mean | 92% | 98% |
| Steps with every expected panel | 19/24 | 22/24 |
| Steps with a discouraged panel | 9/24 | 1/24 |
| Discouraged panels shown, in all | 18 | 1 |
| Panels the key neither expects nor discourages (neutral) | SkyClock ×14, SystemsBoard ×6, SourceLedger ×5, EMFGauge ×1, CivilianTracker ×1, ThermalReadout ×1 | SkyClock ×13, SystemsBoard ×6, SourceLedger ×5, EntityCard ×4, CivilianTracker ×1, ThermalReadout ×1 |
| Distinct layouts | 12 | 12 |
| Distinct layouts the key expects | 13 | 13 |
| Most common layout | CivilianTracker, CountermeasurePicker, FloorPlan, SkyClock, SourceLedger, ThermalReadout, ThreatBanner on 6/24 steps | CivilianTracker, CountermeasurePicker, FloorPlan, SkyClock, SourceLedger, ThermalReadout, ThreatBanner on 6/24 steps |
| Mean pairwise layout distance (Jaccard, 0 = identical) | 0.29 | 0.38 |
| Failures (bad JSON, timeout, empty output) | 0/24 | 0/24 |
| Latency per step, mean | 14.7s | 16.7s |
| Latency per step, median | 13.6s | 16.0s |
| Latency per step, p95 | 19.8s | 22.7s |
| Latency per step, max | 23.6s | 32.5s |
| Intake phase inside the flow, mean | 2.3s | 3.5s |
| Grounding phase inside the flow, mean | 7.7s | 8.8s |
| Compose phase inside the flow, mean | 3.3s | 3.0s |
| **Time to the first panel**, mean | 12.3s | 14.4s |
| Time to the last panel, mean | 14.1s | 15.9s |

## Action confusion (rows = key, columns = model)

| key \ model | observe | contain | evacuate |
|---|---|---|---|
| observe | 9 | 1 | 0 |
| contain | 0 | 9 | 1 |
| evacuate | 0 | 2 | 2 |

## Per step

Truth: R real, H harmless. Hot is the FloorPlan hot sector, or the intake sector when there is no FloorPlan. Δ panels: `-X` is an expected panel that is missing, `!X` a discouraged panel that is present.

| # | Time | Feed tier | Truth | Key action | Model action | Disp | Hot (model → key) | Recall | Panels (model) | Δ panels | Playbook | Sound | Lat s | Pts |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 11:20 | ELEVATED_HAUNT | H | observe | observe ✓ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, SourceLedger, EntityCard, ThermalReadout | – | corporeal | all_clear | 15 | 6/6 |
| 2 | 12:10 | UNVERIFIED | R | observe | observe ✓ | ✓ | network_closet ✗ → lounge | 100% | ThreatBanner, SourceLedger, FloorPlan, ThermalReadout, EntityCard | – | anomalous ✗ | sting_residual_haunting | 17 | 5/6 |
| 3 | 12:50 | LOW_HAUNT | R | observe | observe ✓ | ✓ | lounge ✓ → lounge | 100% | ThreatBanner, SourceLedger, FloorPlan, CivilianTracker, ThermalReadout, EntityCard | – | corporeal | sting_residual_haunting | 14 | 6/6 |
| 4 | 13:05 | UNVERIFIED | H | observe | observe ✓ | ✓ | catering ✓ → catering | 100% | ThreatBanner, SourceLedger, ThermalReadout, SystemsBoard | – | corporeal | all_clear | 17 | 6/6 |
| 5 | 14:20 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | hack_floor_west ✓ → hack_floor_west | 100% | ThreatBanner, CivilianTracker, FloorPlan, CountermeasurePicker, SystemsBoard, SkyClock, SourceLedger | – | corporeal | sting_vampire | 18 | 6/6 |
| 6 | 15:05 | UNVERIFIED | R | observe | observe ✓ | ✓ | registration ✓ → registration | 100% | ThreatBanner, SourceLedger, ThermalReadout, SystemsBoard, FloorPlan, CivilianTracker | – | corporeal | alert_chime | 18 | 6/6 |
| 7 | 15:50 | LOW_HAUNT | R | observe | observe ✓ | ✓ | hack_floor_east ✓ → hack_floor_east | 100% | ThreatBanner, SourceLedger, ThermalReadout, FloorPlan, CivilianTracker, EntityCard | – | corporeal | sting_werewolf | 16 | 6/6 |
| 8 | 16:40 | CRITICAL_HAUNT | H | observe | observe ✓ | ✓ | network_closet ✓ → network_closet | 67% | ThreatBanner, SourceLedger, SystemsBoard | -EMFGauge | anomalous ✗ | all_clear | 14 | 5.667/6 |
| 9 | 17:10 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | hack_floor_east ✓ → hack_floor_east | 100% | ThreatBanner, FloorPlan, CivilianTracker, CountermeasurePicker, SkyClock, ThermalReadout, SourceLedger | – | corporeal | sting_vampire | 20 | 6/6 |
| 10 | 17:40 | CRITICAL_HAUNT | R | contain (D) | contain ✓ | ✓ | lounge ✓ → lounge | 100% | ThreatBanner, FloorPlan, CivilianTracker, CountermeasurePicker, ThermalReadout, SkyClock, SourceLedger | – | corporeal | sting_vampire | 14 | 6/6 |
| 11 | 18:00 | LOW_HAUNT | H | observe | observe ✓ | ✓ | hack_floor_west ✓ → hack_floor_west | 100% | ThreatBanner, SourceLedger, ThermalReadout | – | corporeal | all_clear | 12 | 6/6 |
| 12 | 18:15 | CRITICAL_HAUNT | R | evacuate (D) | contain ✗ | ✓ | hack_floor_west ✓ → hack_floor_west/lounge | 100% | ThreatBanner, FloorPlan, CivilianTracker, CountermeasurePicker, ThermalReadout, SkyClock, SourceLedger | – | corporeal | sting_vampire | 33 | 5/6 |
| 13 | 18:25 | ELEVATED_HAUNT | R | contain (D) | evacuate ✗ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, FloorPlan, CivilianTracker, CountermeasurePicker, ThermalReadout, SkyClock, SourceLedger | – | corporeal | sting_vampire | 23 | 5/6 |
| 14 | 18:40 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | catering ✓ → catering | 100% | ThreatBanner, FloorPlan, CivilianTracker, CountermeasurePicker, ThermalReadout, SkyClock, SourceLedger | – | corporeal | sting_vampire | 18 | 6/6 |
| 15 | 18:55 | LOW_HAUNT | R | contain (D) | contain ✓ | ✓ | hack_floor_east ✓ → hack_floor_east | 100% | ThreatBanner, FloorPlan, CivilianTracker, ThermalReadout, CountermeasurePicker, SkyClock, SystemsBoard, SourceLedger | – | corporeal | sting_werewolf | 16 | 6/6 |
| 16 | 19:10 | CRITICAL_HAUNT | R | contain (D) | contain ✓ | ✓ | network_closet ✓ → network_closet | 100% | ThreatBanner, FloorPlan, CivilianTracker, SystemsBoard, CountermeasurePicker, ThermalReadout, SourceLedger | – | corporeal | alert_chime | 16 | 6/6 |
| 17 | 19:20 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | entrance ✓ → entrance | 75% | ThreatBanner, FloorPlan, CivilianTracker, CountermeasurePicker, ThermalReadout, SkyClock, SourceLedger | -SystemsBoard | corporeal | sting_vampire | 15 | 5.75/6 |
| 18 | 19:33 | ELEVATED_HAUNT | H | observe | observe ✓ | ✓ | main_stage ✓ → main_stage | 100% | ThreatBanner, SourceLedger, SystemsBoard | – | corporeal | all_clear | 13 | 6/6 |
| 19 | 19:46 | CRITICAL_HAUNT | R | evacuate (D) | evacuate ✓ | ✓ | main_stage ✓ → main_stage | 100% | ThreatBanner, FloorPlan, CivilianTracker, CountermeasurePicker, SkyClock, SystemsBoard, ThermalReadout, SourceLedger | – | corporeal | sting_vampire | 17 | 6/6 |
| 20 | 19:55 | CRITICAL_HAUNT | R | evacuate (D) | contain ✗ | ✓ | main_stage ✓ → main_stage | 100% | ThreatBanner, FloorPlan, CivilianTracker, ThermalReadout, CountermeasurePicker, SystemsBoard, SkyClock, SourceLedger | – | corporeal | sting_werewolf | 14 | 5/6 |
| 21 | 20:02 | CRITICAL_HAUNT | R | evacuate (D) | evacuate ✓ | ✓ | main_stage ✓ → main_stage | 100% | ThreatBanner, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, ThermalReadout, SkyClock | – | corporeal | sting_werewolf | 14 | 6/6 |
| 22 | 20:10 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | main_stage ✓ → main_stage | 100% | ThreatBanner, FloorPlan, CivilianTracker, CountermeasurePicker, ThermalReadout, SystemsBoard, SkyClock | – | corporeal | sting_werewolf | 14 | 6/6 |
| 23 | 20:18 | LOW_HAUNT | R | contain (D) | contain ✓ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, ThermalReadout, SkyClock, SourceLedger | – | corporeal | sting_vampire | 18 | 6/6 |
| 24 | 20:26 | UNVERIFIED | R | observe | contain ✗ | ✗ | hack_floor_east ✓ → hack_floor_east | 100% | ThreatBanner, CivilianTracker, FloorPlan, CountermeasurePicker, ThermalReadout, SystemsBoard, SourceLedger | !CountermeasurePicker | corporeal | sting_werewolf | 15 | 3/6 |

## Where the points went

| Criterion | Points lost | Steps |
|---|---|---|
| action | 4.00 | 12, 13, 20, 24 |
| dispatch | 1.00 | 24 |
| hot | 1.00 | 2 |
| recall | 0.58 | 8 (-0.33), 17 (-0.25) |
| no_discouraged | 1.00 | 24 |
| no_failure | 0.00 | – |

- **over-escalations (real/observe step, acted)**: steps 24
- **contain↔evacuate mismatches**: steps 12, 13, 20
- **expected panels most often missing**: EMFGauge ×1 (steps 8); SystemsBoard ×1 (steps 17)
- **discouraged panels most often present**: CountermeasurePicker ×1 (steps 24)
- **pipeline notes**: dropped a quick action this station cannot run: … ×24; dropped a sky warning that states times instead … ×11; dropped a ThreatBanner title over 6 words or 32 … ×5; dropped a ThermalReadout title over 6 words or 3… ×1; dropped a SkyClock title over 6 words or 32 char… ×1; a safe route that stopped inside the building no… ×1

## Against the baseline (eval/baseline/results.jsonl)

Steps that changed (points before → after):

| # | Truth | Key | Baseline action | This run's action | Points |
|---|---|---|---|---|---|
| 1 | harmless | observe | contain | observe | 2.5 → 6 |
| 2 | real | observe | contain | observe | 2.75 → 5 |
| 3 | real | observe | contain | observe | 4 → 6 |
| 4 | harmless | observe | observe | observe | 4.5 → 6 |
| 5 | real | contain | contain | contain | 5 → 6 |
| 6 | real | observe | contain | observe | 3 → 6 |
| 8 | harmless | observe | contain | observe | 3 → 5.667 |
| 11 | harmless | observe | observe | observe | 5 → 6 |
| 13 | real | contain | contain | evacuate | 5 → 5 |
| 17 | real | contain | contain | contain | 6 → 5.75 |
| 18 | harmless | observe | contain | observe | 2.5 → 6 |
| 19 | real | evacuate | contain | evacuate | 5 → 6 |
| 21 | real | evacuate | contain | evacuate | 5 → 6 |
| 24 | real | observe | contain | contain | 2.75 → 3 |
