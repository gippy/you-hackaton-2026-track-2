# Guard variants against the control

Generated 2026-10-28 15:04. Control = labels a, b (pipeline `23b5233007`). Variants run on a frozen copy of that pipeline (`eval/snap-23b5233007`) with `PROOF_CONTEXT=eval`.

Base pipeline hash per column: a `23b5233007`, b `23b5233007`, v4a `23b5233007`, v4b `23b5233007`, v5a `23b5233007`, v6a `23b5233007`, v6b `23b5233007`, v6c `23b5233007`

## Metrics

| Metric | a | b | v4a | v4b | v5a | v6a | v6b | v6c |
|---|---|---|---|---|---|---|---|---|
| **Points / 144** | **126.70** | **127.50** | **126.25** | **127.75** | **123.45** | **122.27** | **128.02** | **126.52** |
| **Misses** (key contain/evacuate, model observed) | **1/14** | **0/14** | **0/14** | **0/14** | **8/14** | **9/14** | **1/14** | **3/14** |
| False alarms (harmless, acted) | 0/5 | 1/5 | 1/5 | 1/5 | 0/5 | 0/5 | 0/5 | 0/5 |
| Harmless handled calmly | 5/5 | 4/5 | 4/5 | 4/5 | 5/5 | 5/5 | 5/5 | 5/5 |
| Over-escalations | 4/5 | 4/5 | 4/5 | 4/5 | 0/5 | 0/5 | 3/5 | 3/5 |
| Evacuate matches | 1/4 | 2/4 | 1/4 | 2/4 | 1/4 | 1/4 | 2/4 | 2/4 |
| Action match | 16/24 | 17/24 | 16/24 | 17/24 | 16/24 | 15/24 | 17/24 | 16/24 |
| Dispatch match | 19/24 | 19/24 | 19/24 | 19/24 | 16/24 | 15/24 | 20/24 | 18/24 |
| Panel recall | 95% | 98% | 97% | 99% | 85% | 89% | 88% | 94% |
| Steps with a discouraged panel | 3/24 | 4/24 | 4/24 | 4/24 | 1/24 | 1/24 | 2/24 | 2/24 |
| Failures | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

## Mean points per group

| Group | Passes | Mean points | Delta to control | Misses per pass |
|---|---|---|---|---|
| control | 126.70, 127.50 | 127.10 | +0.00 | 1/14, 0/14 |
| v4 | 126.25, 127.75 | 127.00 | -0.10 | 0/14, 0/14 |
| v5 | 123.45 | 123.45 | -3.65 | 8/14 |
| v6 | 122.27 | 122.27 | -4.83 | 9/14 |
| v6 | 128.02, 126.52 | 127.27 | +0.17 | 1/14, 3/14 |

## Steps that differ

Cells are `action points`; `*` marks an action different from the key.

| # | Truth | Key | a | b | v4a | v4b | v5a | v6a | v6b | v6c |
|---|---|---|---|---|---|---|---|---|---|---|
| 2 | R | observe | contain* 3 | contain* 3 | contain* 3 | contain* 3 | observe 5 | observe 5 | contain* 2.75 | contain* 3 |
| 3 | R | observe | contain* 4 | contain* 4 | contain* 4 | contain* 4 | observe 6 | observe 6 | contain* 4 | contain* 4 |
| 5 | R | contain | contain 6 | contain 6 | contain 6 | contain 6 | contain 6 | observe* 3.75 | evacuate* 5 | contain 6 |
| 6 | R | observe | contain* 3 | contain* 3 | contain* 3 | contain* 3 | observe 6 | observe 6 | observe 5.75 | observe 6 |
| 8 | H | observe | observe 6 | contain* 3 | contain* 3 | contain* 3 | observe 6 | observe 5.667 | observe 5.667 | observe 5.667 |
| 9 | R | contain | contain 6 | contain 6 | contain 6 | contain 6 | observe* 3.25 | observe* 3.75 | observe* 3.75 | observe* 3.75 |
| 10 | R | contain | contain 6 | contain 6 | contain 6 | contain 6 | contain 6 | contain 6 | contain 5.4 | contain 5.8 |
| 12 | R | evacuate | contain* 5 | contain* 5 | contain* 5 | contain* 5 | observe* 3.25 | observe* 3.75 | contain* 5 | contain* 5 |
| 13 | R | contain | contain 6 | contain 6 | contain 6 | contain 6 | observe* 3.75 | contain 6 | contain 6 | observe* 3.75 |
| 14 | R | contain | contain 6 | contain 6 | contain 6 | contain 6 | observe* 3.75 | observe* 3.75 | contain 6 | contain 6 |
| 15 | R | contain | contain 6 | contain 6 | contain 5.75 | contain 6 | observe* 3.75 | observe* 3.75 | contain 6 | contain 6 |
| 16 | R | contain | contain 6 | contain 6 | contain 6 | contain 6 | observe* 4 | observe* 4 | contain 6 | observe* 4 |
| 17 | R | contain | contain 6 | contain 6 | contain 6 | contain 6 | contain 6 | observe* 3.75 | contain 6 | contain 6 |
| 19 | R | evacuate | contain* 5 | contain* 5 | contain* 5 | evacuate 6 | observe* 3.8 | observe* 3.8 | contain* 5 | contain* 5 |
| 20 | R | evacuate | contain* 5 | evacuate 6 | contain* 5 | contain* 5 | evacuate 6 | evacuate 6 | evacuate 6 | evacuate 6 |
| 21 | R | evacuate | evacuate 6 | evacuate 6 | evacuate 6 | evacuate 6 | observe* 3.4 | observe* 3.8 | evacuate 6 | evacuate 6 |
| 23 | R | contain | observe* 3.2 | contain 6 | contain 6 | contain 6 | contain 6 | contain 6 | contain 5.2 | contain 5.8 |
| 24 | R | observe | contain* 2.75 | evacuate* 2.75 | contain* 2.75 | contain* 3 | observe 5.75 | observe 5.75 | contain* 2.75 | contain* 3 |

## What the guards saw

- **a** (control): misses at [23]; false alarms at none
- **b** (control): misses at none; false alarms at [8]
- **v4a**: `creature_countered` true on 10(R), 13(R), 20(R), 22(R), 23(R); misses at none; false alarms at [8]
- **v4b**: `creature_countered` true on 10(R), 13(R), 20(R), 22(R), 23(R); misses at none; false alarms at [8]
- **v5a**: `creature_countered` true on 10(R), 20(R), 22(R), 23(R); `aftermath` true on 2(R), 3(R), 4(H), 6(R), 12(R), 13(R), 14(R), 15(R), 16(R), 19(R), 20(R), 21(R), 22(R), 23(R), 24(R); aftermath rule fired on [2, 3, 6, 13, 14, 15, 16, 19, 21, 24]; misses at [9, 12, 13, 14, 15, 16, 19, 21]; false alarms at none
- **v6a**: `creature_countered` true on 10(R), 13(R), 20(R), 22(R), 23(R); misses at [5, 9, 12, 14, 15, 16, 17, 19, 21]; false alarms at none
- **v6b**: `creature_countered` true on 10(R), 13(R), 20(R), 22(R), 23(R); misses at [9]; false alarms at none
- **v6c**: `creature_countered` true on 10(R), 22(R), 23(R); misses at [9, 13, 16]; false alarms at none

## Verdict on the two requests

**Accept: guard 1 (`creature_countered`).** **Reject: fix 2 in both forms I tried (`aftermath`, `ended_evidence`).**

Accept rule: misses stay at 0/14 over two passes. Guard 1 (v4) had 0/14 and 0/14 on the frozen pipeline, and 0/14 on the live code. Both forms of fix 2 broke the rule. All variants ran on a frozen copy of the pipeline (`eval/snap-23b5233007`, before the sky lead-time rule) so the control cannot move; one extra pair of passes ran on the live code, which has the lead-time rule.

| Variant | What it adds | Passes | Mean points | Delta to control | Misses per pass |
|---|---|---|---|---|---|
| control (frozen) | nothing | 126.70, 127.50 | 127.10 | | 1/14, 0/14 |
| **v4** | guard 1 | 126.25, 127.75 | 127.00 | **-0.10** (noise) | **0/14, 0/14** |
| v5 | v4 + `aftermath` boolean | 123.45 | 123.45 | -3.65 | 8/14 |
| v6 first run | v4 + `ended_evidence` quote | 122.27 | 122.27 | -4.83 | 9/14 |
| v6 fixed | same, the model's "unknown" no longer counts as a quote | 128.02, 126.52 | 127.27 | +0.17 | 1/14, 3/14 |
| control (live code, has the lead-time rule) | nothing | 133.07 | | | 1/14 |
| **v4 on the live code** | guard 1 | 132.80 | | **-0.27** (noise) | **0/14** |

### Guard 1: what it does, and the evidence

- It fired only on real steps, all from 10, 13, 20, 22 and 23 (a subset in some passes), and **never on a harmless step: 0 of 35 harmless samples** across the 7 guarded passes.
- Step 23 (real, three vampires held at the doors by UV and garlic) was contained in **7 of 7** guarded passes. The unguarded passes missed it in 1 of 3 (pass A).
- Cost: none measurable. Mean points -0.10 and -0.27, inside the noise of about ±1. Harmless false alarms were 1/5 in both v4 passes and in v4 on the live code (step 8 each time); the controls had 0/5 and 1/5 (frozen) and 0/5 (live), so step 8 flips with or without the guard.
- Not built from this scenario's words: the field's description is assembled from `library.ARSENAL` (the unit's own countermeasure names), so a new countermeasure extends it.

Exact change for the build session (`pipeline/flow.py`, against the live file):

```python
# 1. INCIDENT_SCHEMA["required"]: add "creature_countered" between "deliberate_act" and "verdict".
# 2. INCIDENT_SCHEMA["properties"]: add, between "deliberate_act" and "verdict":
        "creature_countered": {"type": "boolean", "description": (
            "true when the report shows a person or thing held back, repelled or reacting to one of the unit's countermeasures ("
            + ", ".join(v.lower() for v in library.ARSENAL.values())
            + ") or to a threshold or barricade: hissing, flinching, burning, refusing to cross. "
            "A costume, a prop or a smell alone is false")},
# 3. EXTRACT_SYSTEM: two replacements.
#    "Fill evidence_of_threat, ordinary_explanation, deliberate_act and verdict before "
#      -> "Fill evidence_of_threat, ordinary_explanation, deliberate_act, creature_countered and verdict before "
#    "supports an ordinary explanation and nobody acted deliberately; "
#      -> "supports an ordinary explanation, nobody acted deliberately and nothing is held back or repelled by a countermeasure; "
# 4. HauntFlow.ingest, directly after the existing deliberate_act block:
        if incident.get("verdict") == "harmless" and incident.get("creature_countered"):
            incident["verdict"] = "unclear"
            self.state.notes.append("something is held back or repelled by a countermeasure, so the harmless verdict became unclear")
```

Also add `creature_countered?: boolean` to `Incident` in `shared/protocol.ts`. `eval/archive/variants/v4.py` is the same change applied in memory; its two `assert`s fail loudly if the prompt text above has moved.

### Fix 2: why it does not pass

- **`aftermath` boolean (v5): 8 misses.** The intake set it on 15 of 24 steps, 14 of them real, because it reads "nothing is acting right now" as "ended". The rule forced observe on 10 steps; six of those are misses (13, 14, 15, 16, 19, 21). Two more misses (9, 12) came from the model itself, which sees `aftermath: true` in the incident it composes from. My two-step smoke test (23, 24) had shown it working; two steps were not enough to see this.
- **`ended_evidence` quote (v6): 9 misses on the first run.** The model wrote the word "unknown" into the field (the intake prompt tells it to) and the rule counted that as evidence. With that fixed (a quote must have at least four words and must not start with unknown, no, not or none), two passes still had 1 and 3 misses: the model fills the field with any sentence ("Blinds remain lowered; staff request to raise them", "Breaker remains tripped; network still up"), and the rule fired on steps 9, 13 and 16. It also did not fire on step 24 in either pass: the field was "unknown" there.
- The pool is 3.25 of 144 points. A model-judged "it ended" flag is not reliable enough on this model to trade against the miss invariant. Leave step 24 as it is.

## Two findings that are not guards

**1. Step 9 is the next miss.** It is real (the key wants contain) and the model observed it in 2 of 7 plain samples, both times through a `harmless` verdict: live-code control and v5. A third sample (the first v4 pass A) did the same; the harness discarded it when I re-ran the steps whose variant files had changed, so it is not in the table. Step 9 is a tall man lowering fourteen blinds while two seated guests read 16 C and nobody has seen them eat; the model takes "the glare was killing his screen" as the ordinary explanation and ignores the readings. The `deliberate_act` downgrade only catches it when the model sets that flag.
Candidate guard, not tested: one more schema field, `unexplained_anomaly` (boolean, "true when the report contains a reading or behaviour that the ordinary explanation does not cover"), and downgrade `harmless` to `unclear` when it is true, next to the two existing downgrades. Test it as `v7` on two passes before landing; it must not turn steps 1, 4, 8, 11 or 18 into false alarms.
A floor rule does not help here: I replayed "observe is only allowed for a harmless verdict or the lead-time calm" over all nine saved passes. It changed nothing on the control, v4 and live passes (their misses come from `harmless` verdicts, which the floor allows), and it only repaired the broken fix-2 variants.

**2. The timeout fix does not bound a slow stream.** In v4 pass A, steps 1, 4 and 17 sat in `compose` for the harness's whole 150 s after their first component (`last phase seen: compose:progress`), while two or three pipelines ran in parallel. Nothing else in about 215 steps stalled (the control's 48 sequential runs, the live passes, the other five variant passes). `parasail.client()` sets `httpx.Timeout(45, connect=8)`, which is per read: a stream that keeps trickling bytes resets it, so it never reaches the fallback model. Add a wall-clock deadline inside `chat_json`'s chunk loop (a compose call takes 3.6 s on average, 15 s at the worst I saw):

```python
        t_stream = time.monotonic()
        for chunk in stream:
            if time.monotonic() - t_stream > 40:   # whole-call deadline; the per-read timeout cannot see a slow stream
                raise TimeoutError("Parasail stream passed its 40 s deadline")
```

The `except` below it already falls through to the second model. The harness's `--timeout` of 150 s is what caught these; the 90 s worker kill in `station.ts` would catch them too, but only by replaying the saved run.
