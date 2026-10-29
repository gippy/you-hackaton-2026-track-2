# Nightfall eval report: run i

Generated 2026-10-28 18:01 · pipeline `c94aa03f3b` · sky input on · scenario `fixtures/nightfall/scenario.json` · answer key `fixtures/nightfall/answer-key.json`

The files on disk have changed since this run (now `18e72150f3`).

Model(s) seen: parasail-minimax-m31-flash · steps run: 24 · failures: 0

Dispatch is scored from `recommended_action` (observe = no dispatch). The pipeline itself never posts; nothing was sent to Discord or PagerDuty.

## Score: 133.3 / 144 points (93%)

Per step, one point each for: action match, dispatch match, hot-sector match, panel recall (fractional), no discouraged panel, no failure.

## Metrics

| Metric | Baseline | This run |
|---|---|---|
| Points | 114/144 | 133.3/144 |
| **Misses** (key says contain/evacuate, model observed) | 0/14 | 0/14 |
| False alarms (harmless step, model acts) | 3/5 | 1/5 |
| Harmless handled calmly (observe, low banner, no discouraged panel) | 0/5 | 4/5 |
| Harmless with the `all_clear` cue | 1/5 | 4/5 |
| Over-escalations (real step the key wants watched, model acts) | 4/5 | 1/5 |
| Action match | 13/24 | 20/24 |
| Contain against evacuate: called too low / too high | 4 / 0 | 1 / 1 |
| Dispatch match | 17/24 | 22/24 |
| Intake severity copies the feed tier (the model reads the label, not the text) | 20/20 | 12/20 |
| Routed to the key's playbook (not scored) | 3/24 | 21/24 |
| Playbooks routed | spectral ×12, anomalous ×9, corporeal ×3 | corporeal ×21, anomalous ×3 |
| Hot sector match (FloorPlan, else intake sector) | 23/24 | 23/24 |
| Hot sector match from the intake alone | 23/24 | 24/24 |
| Seal set exact (not scored) | 7/24 | 14/24 |
| Route set exact (not scored) | 0/24 | 5/24 |
| Panel recall, mean | 92% | 97% |
| Steps with every expected panel | 19/24 | 21/24 |
| Steps with a discouraged panel | 9/24 | 3/24 |
| Discouraged panels shown, in all | 18 | 4 |
| Panels the key neither expects nor discourages (neutral) | SkyClock ×14, SystemsBoard ×6, SourceLedger ×5, EMFGauge ×1, CivilianTracker ×1, ThermalReadout ×1 | SkyClock ×13, EntityCard ×5, SourceLedger ×5, SystemsBoard ×3, CivilianTracker ×1 |
| Distinct layouts | 12 | 13 |
| Distinct layouts the key expects | 13 | 13 |
| Most common layout | CivilianTracker, CountermeasurePicker, FloorPlan, SkyClock, SourceLedger, ThermalReadout, ThreatBanner on 6/24 steps | CivilianTracker, CountermeasurePicker, FloorPlan, SkyClock, SourceLedger, ThermalReadout, ThreatBanner on 6/24 steps |
| Mean pairwise layout distance (Jaccard, 0 = identical) | 0.29 | 0.40 |
| Failures (bad JSON, timeout, empty output) | 0/24 | 0/24 |
| Latency per step, mean | 14.7s | 16.1s |
| Latency per step, median | 13.6s | 15.5s |
| Latency per step, p95 | 19.8s | 20.0s |
| Latency per step, max | 23.6s | 25.1s |
| Intake phase inside the flow, mean | 2.3s | 3.8s |
| Grounding phase inside the flow, mean | 7.7s | 7.7s |
| Compose phase inside the flow, mean | 3.3s | 3.2s |
| **Time to the first panel**, mean | 12.3s | 13.6s |
| Time to the last panel, mean | 14.1s | 15.4s |

## Action confusion (rows = key, columns = model)

| key \ model | observe | contain | evacuate |
|---|---|---|---|
| observe | 8 | 2 | 0 |
| contain | 0 | 9 | 1 |
| evacuate | 0 | 1 | 3 |

## Per step

Truth: R real, H harmless. Hot is the FloorPlan hot sector, or the intake sector when there is no FloorPlan. Δ panels: `-X` is an expected panel that is missing, `!X` a discouraged panel that is present.

| # | Time | Feed tier | Truth | Key action | Model action | Disp | Hot (model → key) | Recall | Panels (model) | Δ panels | Playbook | Sound | Lat s | Pts |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 11:20 | ELEVATED_HAUNT | H | observe | observe ✓ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, SourceLedger, ThermalReadout, EntityCard | – | corporeal | all_clear | 14 | 6/6 |
| 2 | 12:10 | UNVERIFIED | R | observe | observe ✓ | ✓ | network_closet ✗ → lounge | 100% | ThreatBanner, SourceLedger, ThermalReadout, FloorPlan, CivilianTracker, EntityCard | !CivilianTracker | anomalous ✗ | sting_residual_haunting | 15 | 4/6 |
| 3 | 12:50 | LOW_HAUNT | R | observe | observe ✓ | ✓ | lounge ✓ → lounge | 100% | ThreatBanner, SourceLedger, ThermalReadout, FloorPlan, CivilianTracker, EntityCard | – | anomalous ✗ | sting_residual_haunting | 17 | 6/6 |
| 4 | 13:05 | UNVERIFIED | H | observe | observe ✓ | ✓ | catering ✓ → catering | 100% | ThreatBanner, SourceLedger, ThermalReadout | – | corporeal | all_clear | 14 | 6/6 |
| 5 | 14:20 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | hack_floor_west ✓ → hack_floor_west | 100% | ThreatBanner, CivilianTracker, FloorPlan, ThermalReadout, CountermeasurePicker, SkyClock, SourceLedger | – | corporeal | sting_vampire | 20 | 6/6 |
| 6 | 15:05 | UNVERIFIED | R | observe | observe ✓ | ✓ | registration ✓ → registration | 100% | ThreatBanner, SourceLedger, FloorPlan, CivilianTracker, ThermalReadout, SystemsBoard | – | corporeal | alert_chime | 20 | 6/6 |
| 7 | 15:50 | LOW_HAUNT | R | observe | observe ✓ | ✓ | hack_floor_east ✓ → hack_floor_east | 75% | ThreatBanner, ThermalReadout, SourceLedger | -CivilianTracker | corporeal | all_clear | 18 | 5.75/6 |
| 8 | 16:40 | CRITICAL_HAUNT | H | observe | contain ✗ | ✗ | network_closet ✓ → network_closet | 100% | ThreatBanner, EMFGauge, FloorPlan, CivilianTracker, SystemsBoard, CountermeasurePicker, SourceLedger | !CountermeasurePicker !CivilianTracker | anomalous ✗ | sting_poltergeist | 20 | 3/6 |
| 9 | 17:10 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | hack_floor_east ✓ → hack_floor_east | 100% | ThreatBanner, FloorPlan, CivilianTracker, CountermeasurePicker, SkyClock, SystemsBoard, SourceLedger | – | corporeal | sting_vampire | 16 | 6/6 |
| 10 | 17:40 | CRITICAL_HAUNT | R | contain (D) | contain ✓ | ✓ | lounge ✓ → lounge | 100% | ThreatBanner, FloorPlan, CivilianTracker, CountermeasurePicker, ThermalReadout, SkyClock, SourceLedger | – | corporeal | sting_vampire | 15 | 6/6 |
| 11 | 18:00 | LOW_HAUNT | H | observe | observe ✓ | ✓ | hack_floor_west ✓ → hack_floor_west | 100% | ThreatBanner, SourceLedger, ThermalReadout, EntityCard | – | corporeal | all_clear | 12 | 6/6 |
| 12 | 18:15 | CRITICAL_HAUNT | R | evacuate (D) | contain ✗ | ✓ | hack_floor_west ✓ → hack_floor_west/lounge | 100% | ThreatBanner, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, SkyClock, SourceLedger | – | corporeal | sting_vampire | 12 | 5/6 |
| 13 | 18:25 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, FloorPlan, CivilianTracker, CountermeasurePicker, ThermalReadout, SkyClock, SourceLedger | – | corporeal | sting_vampire | 25 | 6/6 |
| 14 | 18:40 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | catering ✓ → catering | 100% | ThreatBanner, FloorPlan, CivilianTracker, CountermeasurePicker, SkyClock, SourceLedger | – | corporeal | sting_vampire | 17 | 6/6 |
| 15 | 18:55 | LOW_HAUNT | R | contain (D) | contain ✓ | ✓ | hack_floor_east ✓ → hack_floor_east | 100% | ThreatBanner, FloorPlan, CivilianTracker, ThermalReadout, CountermeasurePicker, SkyClock, SourceLedger | – | corporeal | sting_vampire | 16 | 6/6 |
| 16 | 19:10 | CRITICAL_HAUNT | R | contain (D) | contain ✓ | ✓ | network_closet ✓ → network_closet | 100% | ThreatBanner, FloorPlan, CivilianTracker, SystemsBoard, CountermeasurePicker, ThermalReadout, SourceLedger | – | corporeal | alert_chime | 14 | 6/6 |
| 17 | 19:20 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | entrance ✓ → entrance | 75% | ThreatBanner, FloorPlan, CivilianTracker, CountermeasurePicker, SkyClock, SourceLedger | -SystemsBoard | corporeal | sting_vampire | 14 | 5.75/6 |
| 18 | 19:33 | ELEVATED_HAUNT | H | observe | observe ✓ | ✓ | main_stage ✓ → main_stage | 100% | ThreatBanner, SourceLedger, EntityCard, SystemsBoard | – | corporeal | all_clear | 12 | 6/6 |
| 19 | 19:46 | CRITICAL_HAUNT | R | evacuate (D) | evacuate ✓ | ✓ | main_stage ✓ → main_stage | 100% | ThreatBanner, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, ThermalReadout, SkyClock, SourceLedger | – | corporeal | sting_vampire | 15 | 6/6 |
| 20 | 19:55 | CRITICAL_HAUNT | R | evacuate (D) | evacuate ✓ | ✓ | main_stage ✓ → main_stage | 100% | ThreatBanner, CivilianTracker, FloorPlan, ThermalReadout, CountermeasurePicker, SkyClock, SourceLedger | – | corporeal | sting_vampire | 15 | 6/6 |
| 21 | 20:02 | CRITICAL_HAUNT | R | evacuate (D) | evacuate ✓ | ✓ | main_stage ✓ → main_stage | 80% | ThreatBanner, SkyClock, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, SourceLedger | -ThermalReadout | corporeal | sting_vampire | 18 | 5.8/6 |
| 22 | 20:10 | ELEVATED_HAUNT | R | contain (D) | evacuate ✗ | ✓ | main_stage ✓ → main_stage | 100% | ThreatBanner, FloorPlan, CivilianTracker, CountermeasurePicker, ThermalReadout, SystemsBoard, SkyClock | – | corporeal | sting_werewolf | 17 | 5/6 |
| 23 | 20:18 | LOW_HAUNT | R | contain (D) | contain ✓ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, SourceLedger | – | corporeal | sting_vampire | 13 | 6/6 |
| 24 | 20:26 | UNVERIFIED | R | observe | contain ✗ | ✗ | hack_floor_east ✓ → hack_floor_east | 100% | ThreatBanner, CivilianTracker, ThermalReadout, FloorPlan, CountermeasurePicker, SkyClock, SourceLedger | !CountermeasurePicker | corporeal | sting_vampire | 19 | 3/6 |

## Where the points went

| Criterion | Points lost | Steps |
|---|---|---|
| action | 4.00 | 8, 12, 22, 24 |
| dispatch | 2.00 | 8, 24 |
| hot | 1.00 | 2 |
| recall | 0.70 | 7 (-0.25), 17 (-0.25), 21 (-0.20) |
| no_discouraged | 3.00 | 2, 8, 24 |
| no_failure | 0.00 | – |

- **false alarms (harmless, acted)**: steps 8
- **over-escalations (real/observe step, acted)**: steps 24
- **contain↔evacuate mismatches**: steps 12, 22
- **alarmist harmless layout**: steps 8
- **expected panels most often missing**: CivilianTracker ×1 (steps 7); SystemsBoard ×1 (steps 17); ThermalReadout ×1 (steps 21)
- **discouraged panels most often present**: CivilianTracker ×2 (steps 2, 8); CountermeasurePicker ×2 (steps 8, 24)
- **pipeline notes**: dropped a quick action this station cannot run: … ×20; dropped a sky warning that states times instead … ×12; dropped a ThreatBanner title over 6 words or 32 … ×4; dropped 1 evidence quote(s) not found in the rep… ×3; dropped a ThermalReadout title over 6 words or 3… ×1; the EMF reading is above its threshold: danger ×1; dropped a ThermalReadout showing its normal temp… ×1; dropped a SystemsBoard with no systems ×1

## Against the baseline (eval/baseline/results.jsonl)

Steps that changed (points before → after):

| # | Truth | Key | Baseline action | This run's action | Points |
|---|---|---|---|---|---|
| 1 | harmless | observe | contain | observe | 2.5 → 6 |
| 2 | real | observe | contain | observe | 2.75 → 4 |
| 3 | real | observe | contain | observe | 4 → 6 |
| 4 | harmless | observe | observe | observe | 4.5 → 6 |
| 5 | real | contain | contain | contain | 5 → 6 |
| 6 | real | observe | contain | observe | 3 → 6 |
| 7 | real | observe | observe | observe | 6 → 5.75 |
| 11 | harmless | observe | observe | observe | 5 → 6 |
| 13 | real | contain | contain | contain | 5 → 6 |
| 17 | real | contain | contain | contain | 6 → 5.75 |
| 18 | harmless | observe | contain | observe | 2.5 → 6 |
| 19 | real | evacuate | contain | evacuate | 5 → 6 |
| 20 | real | evacuate | contain | evacuate | 5 → 6 |
| 21 | real | evacuate | contain | evacuate | 5 → 5.8 |
| 22 | real | contain | contain | evacuate | 6 → 5 |
| 24 | real | observe | contain | contain | 2.75 → 3 |
