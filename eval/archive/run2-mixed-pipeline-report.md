# Nightfall eval report

Generated 2026-10-28 13:01 · pipeline hash `d0f4cdd6fd` · **pipeline changed during the run** (hashes: 754b01f008, 7fc86e00d1, d0f4cdd6fd, ee63d62364); re-run before trusting this · sky input on · scenario `fixtures/nightfall/scenario.json` · answer key `fixtures/nightfall/answer-key.json`

Model(s) seen: parasail-minimax-m31-flash · steps run: 24 · failures: 0

Dispatch is scored from `recommended_action` (observe = no dispatch). The pipeline itself never posts; nothing was sent to Discord or PagerDuty.

## Score: 110.75 / 144 points (77%)

Per step, one point each for: action match, dispatch match, hot-sector match, panel recall (fractional), no discouraged panel, no failure.

## Metrics

| Metric | Result |
|---|---|
| False alarms (harmless step, model acts or dispatches) | 3/5 |
| Harmless handled calmly (observe, low banner, no discouraged panel) | 0/5 (0%) |
| Harmless with the `all_clear` sound cue | 0/5 (0%) |
| Misses (key says contain/evacuate, model observes) | 0/14 |
| Over-escalation (real but key says observe, model acts) | 5/5 |
| Action match | 12/24 (50%) |
| of which called too low / too high (contain vs evacuate) | 4 / 0 |
| Dispatch match | 16/24 (67%) |
| Entity routed to the key's playbook (diagnostic, not scored) | 3/24 (12%); routed: spectral ×13, anomalous ×8, corporeal ×3 |
| Hot sector match (FloorPlan, else incident sector) | 22/24 (92%) |
| Hot sector match from the intake step alone | 22/24 (92%) |
| Seal set exact / route set exact (secondary, not scored) | 5/24 (21%) / 0/24 (0%) |
| Panel recall, mean | 95% (all expected present on 21/24 steps) |
| Discouraged panels present | 19 panels on 10/24 steps |
| Panels the key neither expects nor discourages | SkyClock ×15, SystemsBoard ×5, SourceLedger ×5, EMFGauge ×1, CivilianTracker ×1, ThermalReadout ×1 (neutral) |
| Layout variety (distinct panel sets) | 12 distinct in 24 runs; the key itself expects 13 |
| Most common layout | CivilianTracker, CountermeasurePicker, FloorPlan, SkyClock, SourceLedger, ThermalReadout, ThreatBanner on 6/24 steps |
| Mean pairwise layout distance (Jaccard, 0 = identical) | 0.27 |
| Failures (bad JSON, timeout, empty output) | 0/24 |
| Latency per step (wall) | mean 13.7s · median 13.4s · p95 16.0s · max 18.7s |
| Mean phase time inside the flow | ingest 2.0s · ground 7.1s · compose 3.1s |
| Time to first / last component on the wire | 11.3s / 13.0s |

## Action confusion (rows = key, columns = model)

| key \ model | observe | contain | evacuate |
|---|---|---|---|
| observe | 2 | 8 | 0 |
| contain | 0 | 10 | 0 |
| evacuate | 0 | 4 | 0 |

## Per step

Truth: R real, H harmless. Hot is the FloorPlan hot sector, or the intake sector when there is no FloorPlan. Panels: missing expected in **bold-less** `-X`, discouraged present in `!X`.

| # | Time | Feed tier | Truth | Key action | Model action | Disp | Hot (model → key) | Recall | Panels (model) | Δ panels | Playbook | Sound | Lat s | Pts |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 11:20 | ELEVATED_HAUNT | H | observe | observe ✓ | ✓ | registration ✗ → entrance | 50% | ThreatBanner, EMFGauge, ThermalReadout, CivilianTracker, FloorPlan, SystemsBoard, SkyClock | -SourceLedger !CivilianTracker !FloorPlan | anomalous ✗ | sting_vampire | 15 | 3.5/6 |
| 2 | 12:10 | UNVERIFIED | R | observe | contain ✗ | ✗ | lounge ✓ → lounge | 100% | ThreatBanner, ThermalReadout, EMFGauge, FloorPlan, CivilianTracker, CountermeasurePicker, SourceLedger | !CivilianTracker !EMFGauge | anomalous ✗ | sting_ghost | 13 | 3/6 |
| 3 | 12:50 | LOW_HAUNT | R | observe | contain ✗ | ✗ | lounge ✓ → lounge | 100% | ThreatBanner, EMFGauge, ThermalReadout, FloorPlan, CivilianTracker, CountermeasurePicker, SourceLedger, SkyClock | !EMFGauge | spectral ✗ | sting_ghost | 14 | 3/6 |
| 4 | 13:05 | UNVERIFIED | H | observe | contain ✗ | ✗ | catering ✓ → catering | 100% | ThreatBanner, CivilianTracker, FloorPlan, SystemsBoard, CountermeasurePicker, SourceLedger | !CountermeasurePicker !CivilianTracker !FloorPlan | anomalous ✗ | sting_ghost | 15 | 3/6 |
| 5 | 14:20 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | hack_floor_west ✓ → hack_floor_west | 100% | ThreatBanner, CivilianTracker, EMFGauge, ThermalReadout, FloorPlan, CountermeasurePicker, SkyClock | !EMFGauge | spectral ✗ | sting_ghost | 13 | 5/6 |
| 6 | 15:05 | UNVERIFIED | R | observe | contain ✗ | ✗ | registration ✓ → registration | 100% | ThreatBanner, CivilianTracker, ThermalReadout, SystemsBoard, FloorPlan, CountermeasurePicker, SourceLedger | !CountermeasurePicker | anomalous ✗ | sting_ghost | 15 | 3/6 |
| 7 | 15:50 | LOW_HAUNT | R | observe | contain ✗ | ✗ | hack_floor_east ✓ → hack_floor_east | 100% | ThreatBanner, CivilianTracker, ThermalReadout, FloorPlan, CountermeasurePicker, SkyClock, SourceLedger | – | anomalous ✗ | sting_ghost | 15 | 4/6 |
| 8 | 16:40 | CRITICAL_HAUNT | H | observe | contain ✗ | ✗ | network_closet ✓ → network_closet | 100% | ThreatBanner, EMFGauge, FloorPlan, CivilianTracker, SystemsBoard, CountermeasurePicker, SourceLedger | !CountermeasurePicker !CivilianTracker | spectral ✗ | sting_ghost | 11 | 3/6 |
| 9 | 17:10 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | hack_floor_east ✓ → hack_floor_east | 100% | ThreatBanner, CivilianTracker, FloorPlan, CountermeasurePicker, SkyClock, SourceLedger | – | spectral ✗ | sting_ghost | 14 | 6/6 |
| 10 | 17:40 | CRITICAL_HAUNT | R | contain (D) | contain ✓ | ✓ | lounge ✓ → lounge | 100% | ThreatBanner, CivilianTracker, ThermalReadout, FloorPlan, CountermeasurePicker, SystemsBoard, SkyClock | – | spectral ✗ | sting_ghost | 13 | 6/6 |
| 11 | 18:00 | LOW_HAUNT | H | observe | observe ✓ | ✓ | hack_floor_west ✓ → hack_floor_west | 100% | ThreatBanner, CivilianTracker, SkyClock, FloorPlan, CountermeasurePicker, SourceLedger | !CountermeasurePicker !CivilianTracker !FloorPlan | spectral ✗ | sting_ghost | 15 | 5/6 |
| 12 | 18:15 | CRITICAL_HAUNT | R | evacuate (D) | contain ✗ | ✓ | hack_floor_west ✓ → hack_floor_west/lounge | 100% | ThreatBanner, CivilianTracker, ThermalReadout, FloorPlan, CountermeasurePicker, SkyClock, SourceLedger | – | spectral ✗ | sting_ghost | 13 | 5/6 |
| 13 | 18:25 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | network_closet ✗ → entrance | 100% | ThreatBanner, CivilianTracker, ThermalReadout, FloorPlan, CountermeasurePicker, SkyClock, SourceLedger | – | spectral ✗ | sting_ghost | 16 | 5/6 |
| 14 | 18:40 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | catering ✓ → catering | 100% | ThreatBanner, CivilianTracker, FloorPlan, ThermalReadout, CountermeasurePicker, SkyClock, SourceLedger | – | spectral ✗ | sting_ghost | 11 | 6/6 |
| 15 | 18:55 | LOW_HAUNT | R | contain (D) | contain ✓ | ✓ | hack_floor_east ✓ → hack_floor_east | 100% | ThreatBanner, ThermalReadout, CivilianTracker, FloorPlan, CountermeasurePicker, SkyClock, SourceLedger | – | spectral ✗ | sting_ghost | 11 | 6/6 |
| 16 | 19:10 | CRITICAL_HAUNT | R | contain (D) | contain ✓ | ✓ | network_closet ✓ → network_closet | 100% | ThreatBanner, CivilianTracker, SystemsBoard, FloorPlan, CountermeasurePicker, SourceLedger, SkyClock | – | anomalous ✗ | sting_ghost | 13 | 6/6 |
| 17 | 19:20 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, FloorPlan, CivilianTracker, ThermalReadout, SystemsBoard, CountermeasurePicker, SourceLedger | – | spectral ✗ | sting_ghost | 14 | 6/6 |
| 18 | 19:33 | ELEVATED_HAUNT | H | observe | contain ✗ | ✗ | main_stage ✓ → main_stage | 50% | ThreatBanner, EMFGauge, ThermalReadout, FloorPlan, CivilianTracker, SystemsBoard, CountermeasurePicker | -SourceLedger !CountermeasurePicker !CivilianTracker !FloorPlan | corporeal | sting_werewolf | 11 | 2.5/6 |
| 19 | 19:46 | CRITICAL_HAUNT | R | evacuate (D) | contain ✗ | ✓ | main_stage ✓ → main_stage | 100% | ThreatBanner, ThermalReadout, FloorPlan, CivilianTracker, SystemsBoard, CountermeasurePicker, SkyClock | – | spectral ✗ | sting_ghost | 13 | 5/6 |
| 20 | 19:55 | CRITICAL_HAUNT | R | evacuate (D) | contain ✗ | ✓ | main_stage ✓ → main_stage | 100% | ThreatBanner, CivilianTracker, ThermalReadout, FloorPlan, CountermeasurePicker, SkyClock, SourceLedger | – | anomalous ✗ | sting_vampire | 12 | 5/6 |
| 21 | 20:02 | CRITICAL_HAUNT | R | evacuate (D) | contain ✗ | ✓ | main_stage ✓ → main_stage | 100% | ThreatBanner, CivilianTracker, FloorPlan, SystemsBoard, ThermalReadout, CountermeasurePicker, SourceLedger | – | corporeal | sting_werewolf | 13 | 5/6 |
| 22 | 20:10 | ELEVATED_HAUNT | R | contain (D) | contain ✓ | ✓ | main_stage ✓ → main_stage | 100% | ThreatBanner, ThermalReadout, CivilianTracker, FloorPlan, SystemsBoard, CountermeasurePicker, SkyClock | – | corporeal | sting_werewolf | 13 | 6/6 |
| 23 | 20:18 | LOW_HAUNT | R | contain (D) | contain ✓ | ✓ | entrance ✓ → entrance | 100% | ThreatBanner, FloorPlan, CivilianTracker, SystemsBoard, CountermeasurePicker, ThermalReadout, SourceLedger | – | spectral ✗ | sting_ghost | 19 | 6/6 |
| 24 | 20:26 | UNVERIFIED | R | observe | contain ✗ | ✗ | hack_floor_east ✓ → hack_floor_east | 75% | ThreatBanner, CivilianTracker, FloorPlan, CountermeasurePicker, SystemsBoard, SourceLedger | -ThermalReadout !CountermeasurePicker | anomalous ✗ | sting_ghost | 15 | 2.75/6 |

## Where the points went

| Criterion | Points lost | Steps |
|---|---|---|
| action | 12.00 | 2, 3, 4, 6, 7, 8, 12, 18, 19, 20, 21, 24 |
| dispatch | 8.00 | 2, 3, 4, 6, 7, 8, 18, 24 |
| hot | 2.00 | 1, 13 |
| recall | 1.25 | 1 (-0.50), 18 (-0.50), 24 (-0.25) |
| no_discouraged | 10.00 | 1, 2, 3, 4, 5, 6, 8, 11, 18, 24 |
| no_failure | 0.00 | – |

- **false alarms (harmless, acted)**: steps 4, 8, 18
- **over-escalations (real/observe step, acted)**: steps 2, 3, 6, 7, 24
- **contain↔evacuate mismatches**: steps 12, 19, 20, 21
- **alarmist harmless layout**: steps 1, 4, 8, 11, 18
- **expected panels most often missing**: SourceLedger ×2 (steps 1, 18); ThermalReadout ×1 (steps 24)
- **discouraged panels most often present**: CivilianTracker ×6 (steps 1, 2, 4, 8, 11, 18); CountermeasurePicker ×6 (steps 4, 6, 8, 11, 18, 24); FloorPlan ×4 (steps 1, 4, 11, 18); EMFGauge ×3 (steps 2, 3, 5)

## Top fixes

_Not written yet (eval/fixes.md)._
