# Nightfall eval report

Generated 2026-10-28 12:54 · pipeline hash `950b685239` · **pipeline changed during the run** (hashes: 1897b966a2, 244d730e2b, 5f8f65d845, 950b685239); re-run before trusting this · scenario `scenarios/pitches/nightfall/scenario.json` · answer key `scenarios/pitches/nightfall/answer-key.json`

Model(s) seen: parasail-minimax-m31-flash · steps run: 24 · failures: 1

Dispatch is scored from `recommended_action` (observe = no dispatch). The pipeline itself never posts; nothing was sent to Discord or PagerDuty.

## Score: 113.35 / 144 points (79%)

Per step, one point each for: action match, dispatch match, hot-sector match, panel recall (fractional), no discouraged panel, no failure.

## Metrics

| Metric | Result |
|---|---|
| False alarms (harmless step, model acts or dispatches) | 1/5 |
| Harmless handled calmly (observe, low banner, no discouraged panel) | 0/5 (0%) |
| Harmless with the `all_clear` sound cue | 1/5 (20%) |
| Misses (key says contain/evacuate, model observes) | 0/13 |
| Over-escalation (real but key says observe, model acts) | 4/5 |
| Action match | 15/24 (62%) |
| of which called too low / too high (contain vs evacuate) | 3 / 0 |
| Dispatch match | 18/24 (75%) |
| Hot sector match (FloorPlan, else incident sector) | 22/24 (92%) |
| Hot sector match from the intake step alone | 22/24 (92%) |
| Seal set exact / route set exact (secondary, not scored) | 7/24 (29%) / 1/24 (4%) |
| Panel recall, mean | 93% (all expected present on 20/24 steps) |
| Discouraged panels present | 16 panels on 9/24 steps |
| Layout variety (distinct panel sets) | 11 distinct in 23 runs; the key itself expects 13 |
| Most common layout | CivilianTracker, CountermeasurePicker, FloorPlan, SourceLedger, ThermalReadout, ThreatBanner on 5/23 steps |
| Mean pairwise layout distance (Jaccard, 0 = identical) | 0.30 |
| Failures (bad JSON, timeout, empty output) | 1/24 |
| Latency per step (wall) | mean 20.4s · median 17.3s · p95 33.7s · max 49.6s |
| Mean phase time inside the flow | ingest 2.8s · ground 11.4s · compose 4.0s |
| Time to first / last component on the wire | 17.8s / 19.6s |

## Action confusion (rows = key, columns = model)

| key \ model | observe | contain | evacuate |
|---|---|---|---|
| observe | 5 | 5 | 0 |
| contain | 0 | 10 | 0 |
| evacuate | 0 | 3 | 0 |

## Per step

Truth: R real, H harmless. Hot is the FloorPlan hot sector, or the intake sector when there is no FloorPlan. Panels: missing expected in **bold-less** `-X`, discouraged present in `!X`.

| # | Time | Feed tier | Truth | Key action | Model action | Disp | Hot (model → key) | Recall | Panels (model) | Δ panels | Sound | Lat s | Pts |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 11:20 | ELEVATED_HAUNT | H | observe | observe ✓ | ✓ | registration ✗ → entrance | 100% | ThreatBanner, CivilianTracker, ThermalReadout, EMFGauge, FloorPlan, SystemsBoard, SourceLedger | !CivilianTracker !FloorPlan | sting_vampire | 18 | 4/6 |
| 2 | 12:10 | UNVERIFIED | R | observe | contain ✗ | ✗ | lounge ✓ → lounge | 100% | ThreatBanner, FloorPlan, CivilianTracker, ThermalReadout, EMFGauge, CountermeasurePicker, SourceLedger | !CivilianTracker !EMFGauge | sting_residual_haunting | 13 | 3/6 |
| 3 | 12:50 | LOW_HAUNT | R | observe | contain ✗ | ✗ | lounge ✓ → lounge | 100% | ThreatBanner, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SourceLedger | – | sting_ghost | 17 | 4/6 |
| 4 | 13:05 | UNVERIFIED | H | observe | observe ✓ | ✓ | catering ✓ → catering | 100% | ThreatBanner, CivilianTracker, SystemsBoard, SourceLedger | !CivilianTracker | all_clear | 28 | 5/6 |
| 5 | 14:20 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | hack_floor_west ✓ → hack_floor_west | 100% | ThreatBanner, CivilianTracker, EMFGauge, ThermalReadout, FloorPlan, SystemsBoard, CountermeasurePicker | !EMFGauge | sting_ghost | 34 | 5/6 |
| 6 | 15:05 | UNVERIFIED | R | observe | contain ✗ | ✗ | registration ✓ → registration | 100% | ThreatBanner, CivilianTracker, ThermalReadout, SystemsBoard, FloorPlan, CountermeasurePicker, SourceLedger | !CountermeasurePicker | sting_ghost | 28 | 3/6 |
| 7 | 15:50 | LOW_HAUNT | R | observe | observe ✓ | ✓ | hack_floor_east ✓ → hack_floor_east | 100% | ThreatBanner, ThermalReadout, CivilianTracker, FloorPlan, CountermeasurePicker, SourceLedger | – | sting_ghost | 22 | 6/6 |
| 8 | 16:40 | CRITICAL_HAUNT | H | observe | contain ✗ | ✗ | network_closet ✓ → network_closet | 100% | ThreatBanner, EMFGauge, FloorPlan, CivilianTracker, SystemsBoard, CountermeasurePicker, SourceLedger | !CountermeasurePicker !CivilianTracker | sting_ghost | 50 | 3/6 |
| 9 | 17:10 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | hack_floor_east ✓ → hack_floor_east | 100% | ThreatBanner, CivilianTracker, FloorPlan, SystemsBoard, CountermeasurePicker, SourceLedger | – | sting_ghost | 23 | 6/6 |
| 10 | 17:40 | CRITICAL_HAUNT | R | contain (D) | contain ✓ | ✓ | lounge ✓ → lounge | 60% | ThreatBanner, CivilianTracker, ThermalReadout | -FloorPlan -CountermeasurePicker | sting_ghost | 19 | 5.6/6 |
| 11 | 18:00 | LOW_HAUNT | H | observe | observe ✓ | ✓ | hack_floor_west ✓ → hack_floor_west | 100% | ThreatBanner, FloorPlan, CivilianTracker, CountermeasurePicker, SourceLedger | !CountermeasurePicker !CivilianTracker !FloorPlan | sting_ghost | 19 | 5/6 |
| 12 | 18:15 | CRITICAL_HAUNT | R | evacuate (D) | contain ✗ | ✓ | hack_floor_west ✓ → hack_floor_west/lounge | 100% | ThreatBanner, CivilianTracker, ThermalReadout, CountermeasurePicker, FloorPlan, SystemsBoard | – | sting_ghost | 18 | 5/6 |
| 13 | 18:25 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, CivilianTracker, ThermalReadout, FloorPlan, CountermeasurePicker, SourceLedger | – | sting_ghost | 16 | 6/6 |
| 14 | 18:40 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | catering ✓ → catering | 100% | ThreatBanner, CivilianTracker, FloorPlan, SystemsBoard, CountermeasurePicker, SourceLedger | – | sting_ghost | 15 | 6/6 |
| 15 | 18:55 | LOW_HAUNT | R | contain (D) | contain ✓ | ✓ | hack_floor_east ✓ → hack_floor_east | 100% | ThreatBanner, ThermalReadout, CivilianTracker, FloorPlan, CountermeasurePicker, SourceLedger | – | sting_residual_haunting | 16 | 6/6 |
| 16 | 19:10 | CRITICAL_HAUNT | R | contain (D) | contain ✓ | ✓ | network_closet ✓ → network_closet | 100% | ThreatBanner, CivilianTracker, SystemsBoard, FloorPlan, ThermalReadout, CountermeasurePicker, SourceLedger | – | sting_ghost | 17 | 6/6 |
| 17 | 19:20 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | entrance ✓ → entrance | 25% | ThreatBanner, CivilianTracker, ThermalReadout | -FloorPlan -SystemsBoard -CountermeasurePicker | sting_ghost | 15 | 5.25/6 |
| 18 | 19:33 | ELEVATED_HAUNT | H | observe | observe ✓ | ✓ | main_stage ✓ → main_stage | 50% | ThreatBanner, EMFGauge, ThermalReadout, FloorPlan, CivilianTracker, SystemsBoard, CountermeasurePicker | -SourceLedger !CountermeasurePicker !CivilianTracker !FloorPlan | sting_ghost | 30 | 4.5/6 |
| 19 | 19:46 | CRITICAL_HAUNT | R | evacuate (D) | contain ✗ | ✓ | main_stage ✓ → main_stage | 100% | ThreatBanner, ThermalReadout, CivilianTracker, FloorPlan, SystemsBoard, CountermeasurePicker, SourceLedger | – | sting_ghost | 15 | 5/6 |
| 20 | 19:55 | CRITICAL_HAUNT | R | evacuate (D) | **FAILED** | | | | | | | | 240 | 0/6 |  
  ↳ timeout after 240s
| 21 | 20:02 | CRITICAL_HAUNT | R | evacuate (D) | contain ✗ | ✓ | main_stage ✓ → main_stage | 100% | ThreatBanner, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SourceLedger | – | sting_werewolf | 13 | 5/6 |
| 22 | 20:10 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | main_stage ✓ → main_stage | 100% | ThreatBanner, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SystemsBoard, SourceLedger | – | sting_werewolf | 15 | 6/6 |
| 23 | 20:18 | LOW_HAUNT | R | contain (D) | contain ✓ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, CivilianTracker, FloorPlan, SystemsBoard, CountermeasurePicker, SourceLedger | – | sting_ghost | 14 | 6/6 |
| 24 | 20:26 | UNVERIFIED | R | observe | contain ✗ | ✗ | hack_floor_east ✓ → hack_floor_east | 100% | ThreatBanner, CivilianTracker, ThermalReadout, FloorPlan, SystemsBoard, CountermeasurePicker, SourceLedger | !CountermeasurePicker | alert_chime | 14 | 3/6 |

## Where the points went

| Criterion | Points lost | Steps |
|---|---|---|
| action | 9.00 | 2, 3, 6, 8, 12, 19, 20, 21, 24 |
| dispatch | 6.00 | 2, 3, 6, 8, 20, 24 |
| hot | 2.00 | 1, 20 |
| recall | 2.65 | 10 (-0.40), 17 (-0.75), 18 (-0.50), 20 |
| no_discouraged | 10.00 | 1, 2, 4, 5, 6, 8, 11, 18, 20, 24 |
| no_failure | 1.00 | 20 |

- **false alarms (harmless, acted)**: steps 8
- **over-escalations (real/observe step, acted)**: steps 2, 3, 6, 24
- **contain↔evacuate mismatches**: steps 12, 19, 21
- **alarmist harmless layout**: steps 1, 4, 8, 11, 18
- **expected panels most often missing**: FloorPlan ×2 (steps 10, 17); CountermeasurePicker ×2 (steps 10, 17); SystemsBoard ×1 (steps 17); SourceLedger ×1 (steps 18)
- **discouraged panels most often present**: CivilianTracker ×6 (steps 1, 2, 4, 8, 11, 18); CountermeasurePicker ×5 (steps 6, 8, 11, 18, 24); FloorPlan ×3 (steps 1, 11, 18); EMFGauge ×2 (steps 2, 5)
- **pipeline notes**: dropped a repeated ThermalReadout ×1

## Top fixes

_Not written yet (eval/fixes.md)._
