# Guard variants against the control

Generated 2026-10-28 15:04. Control = labels live (pipeline `23b5233007`). Variants run on a frozen copy of that pipeline (`eval/snap-23b5233007`) with `PROOF_CONTEXT=eval`.

Base pipeline hash per column: live `1f473642d7`, v4live `1f473642d7`

## Metrics

| Metric | live | v4live |
|---|---|---|
| **Points / 144** | **133.07** | **132.80** |
| **Misses** (key contain/evacuate, model observed) | **1/14** | **0/14** |
| False alarms (harmless, acted) | 0/5 | 1/5 |
| Harmless handled calmly | 5/5 | 4/5 |
| Over-escalations | 1/5 | 1/5 |
| Evacuate matches | 2/4 | 3/4 |
| Action match | 19/24 | 19/24 |
| Dispatch match | 22/24 | 22/24 |
| Panel recall | 92% | 95% |
| Steps with a discouraged panel | 2/24 | 3/24 |
| Failures | 0 | 0 |

## Mean points per group

| Group | Passes | Mean points | Delta to control | Misses per pass |
|---|---|---|---|---|
| control | 133.07 | 133.07 | +0.00 | 1/14 |
| v4live | 132.80 | 132.80 | -0.27 | 0/14 |

## Steps that differ

Cells are `action points`; `*` marks an action different from the key.

| # | Truth | Key | live | v4live |
|---|---|---|---|---|
| 6 | R | observe | observe 6 | observe 5.75 |
| 8 | H | observe | observe 5.667 | contain* 3 |
| 9 | R | contain | observe* 3.25 | contain 6 |
| 10 | R | contain | contain 6 | contain 5.8 |
| 13 | R | contain | contain 6 | contain 5.75 |
| 15 | R | contain | contain 6 | contain 5.75 |
| 19 | R | evacuate | contain* 5 | evacuate 6 |
| 22 | R | contain | contain 5.4 | evacuate* 5 |
| 24 | R | observe | contain* 3 | evacuate* 3 |

## What the guards saw

- **live** (control): misses at [9]; false alarms at none
- **v4live**: `creature_countered` true on 10(R), 20(R), 22(R), 23(R); misses at none; false alarms at [8]
