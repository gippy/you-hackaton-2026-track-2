## Status after the guard experiments (15:15)

- Fix 1 (sky lead-time rule) landed in `5c42469`; the live code scored 133.07 in one pass.
- Fix 2 (step 24 stand-down) was tried as an `aftermath` boolean and as an `ended_evidence` quote: 8 and 9 misses, then 1 and 3 after a predicate fix. Rejected, see Part 2 below. Leave step 24.
- Guard for the step 23 miss (`creature_countered`): accepted, `eval/archive/guard1.patch` applies to the live tree.
- Fix 3 (one LLM call less in grounding) is still open.

## What landed, and what is left

Both passes ran on pipeline `23b5233007` (committed code at HEAD `9501176`; the hash did not change afterwards), 24 steps each, `PROOF_CONTEXT=eval`. Score: **126.70 and 127.50 of 144, mean 127.10, against 114.00 for the baseline (+13.1)**. 16.9 points are still lost, and two thirds of them sit in four steps (2, 3, 6, 24).

What the commits bought, measured against the baseline:

| Fix from the first report | Result |
|---|---|
| Harmless verdict at intake plus the calm-layout guard | harmless handled calmly 0/5 to 5/5 and 4/5; false alarms 3/5 to 0/5 and 1/5; `all_clear` cue 1/5 to 5/5 and 4/5 |
| Evacuate rubric | evacuate matches 0/4 to 1/4 and 2/4 (steps 12 and 19 never; 20 flips; 21 yes) |
| Corporeal routing in code | 3/24 to 15/24 on both passes. The other nine (2, 3, 6, 7, 8, 11, 15, 16, 19) are reports that name no creature, so the intake says `unknown` and the model's own class stands; the key calls all of them corporeal, so steps 15, 16 and 19 (real, contain) get spectral or anomalous countermeasures |
| EMF cleanup, SourceLedger always | steps with a discouraged panel 9 to 3 and 4; panel recall 92% to 95% and 98%; hot sector 23/24 to 24/24 |
| Timeouts | 0 failures in 48 runs (the baseline had one 240 s hang in about 60) |
| Intake stops copying the feed tier | tier copied 20/20 to 9/20 and 12/20 |
| Cost | mean latency 14.7 s to 16.2 s and 16.5 s; first panel 12.3 s to 14.0 s and 13.9 s (the longer intake: 3.1 s against 2.3 s) |

Misses were **1/14 in pass A (step 23) and 0/14 in pass B**. Step 23 is real (three vampires held at the street doors under UV and garlic) and the intake called it `harmless`: "The flinch/hiss behavior and 14C skin reading are consistent with cold exposure". The harmless gate also cleared step 7 in both passes (real, but the key says observe, so it scored by luck). The gate can produce a miss; it did once in two passes.

## Top 3 remaining fixes

### 1. Observe while the sky is far from nightfall (+7.0 on replay, steps 2, 3, 6)

Evidence. The model contains on 2, 3, 6 and 24 in both passes (over-escalation 4/5, the single largest pool: 11.25 points). The answer key separates these steps from the ones it wants contained by one thing the model never uses: how far away the sky event is. The quiet steps are 365, 325 and 190 minutes from sunset; the first step the key wants contained with nobody hurt (9) is 65 minutes out. The sky is already in `state.sky.minutes_to`, but only the compose prompt sees it, and the intake and the rubric have no lead-time idea.

Change. A rule in code, the same mechanism as the harmless guard: when `people_hurt == 0`, the sky exists, and the nearest upcoming event in `sky.minutes_to` (positive values only) is more than **100 minutes** away, treat the step as calm: `observe`, no CountermeasurePicker. Compute it before streaming and pass it into `clean_manifest` next to `incident`, because `recommended_action` is the last field the model writes and the components stream first. Pasted incidents have no sky, so the rule never fires on them.

Measured by replaying the saved manifests of both passes through the rule (no model calls): pass A 126.70 to 133.70, pass B 127.50 to 134.50. Over-escalation 4/5 to 1/5, misses unchanged (1 and 0), no step that the key wants contained is touched. Any lead from 66 to 144 minutes gives the same result; 60 breaks step 9 and adds a miss. This is one scenario and one constant, so check it on another pitch's scenario before trusting the number. Step 2 keeps a discouraged CivilianTracker (-1).

Not the model's size: I moved the intake alone to `parasail-kimi-k3-fast` (variant `v3`, steps 2, 3, 6, 10, 23, 24). It still contains on 2, 3 and 6, rates them `real_threat` and more severe, turned step 10 into an evacuate, and the intake took 10 to 16 s instead of 3 s. Do not swap the model.

### 2. Stand-down is not an emergency (+3.25 estimated, step 24, untested)

Evidence. Step 24 is the end-of-event debrief: the three subjects are "back in human form", headcount 160 of 160, doors latched. The intake reads "9 injured" as a live emergency (`real_threat`, `people_hurt` 9, severity critical) and the station contains in pass A and **evacuates in pass B**, which would dispatch a stand-down. It also carries a discouraged CountermeasurePicker and misses ThermalReadout. 2.75 of 6 both times.

Change. One narrow yes/no field in `INCIDENT_SCHEMA`, placed before `verdict`: `threat_present_now` ("a creature or hazard is still present and unrestrained in the report; false when it is gone, human again, or the report is a debrief"). When it is false and nobody is in reach, treat the step as calm like fix 1.

Risk. A model that reads step 23 (creatures present but held at the door) as "not present" turns that step into a miss, which is the failure to avoid. My earlier three-way `threat_state` (v2) failed exactly this way: `over` went to step 23 and `inert` to five contain steps. Land it as a variant first and accept it only if misses stay 0/14 on two passes.

### 3. First panel at 14 s: one LLM call less in the grounding step (-3.7 s, no points)

Evidence. Time to the first panel is 14.0 s and 13.9 s (p95 22.8 s and 18.1 s); the page already shows the provisional card from the `incident` event at 4.5 s, so the gap is the wait for the first real component. `ground` is 7.8 s of it. The proof ledger (162 You.com searches, 108 Lore Researcher calls) shows where: the CrewAI agent makes **two** Parasail calls per run (decide to search, then write the notes), 3.7 s each on average, and a You.com search takes 0.5 s. The LLM round trips are 95% of the phase.

Change. Run the two grounding searches in code first, in parallel threads (about 0.6 s), put the numbered results into the Lore Researcher's prompt, and let the agent write the notes in one call. The agent and its role stay; it just stops spending a turn on tool selection. Expected first panel about 10 s. The cost is that the demo no longer shows the agent choosing its own queries; keep the tool-calling path behind a flag if that story matters to a judge.

## Considered and rejected

- **A stronger intake model**: see fix 1; +8 to 13 s of ingest for no gain on 2, 3 and 6.
- **Calling the intake twice and requiring both to say harmless**: the passes disagree on `harmless` for steps 8 and 23 only. The rule fixes pass A's step 23 (+2.8) and breaks pass A's step 8 (-3), so net -0.2. The leftover noise is about 3 points per pass; compare changes over two passes.
- **A rule for evacuate** (steps 12 and 19, about 2.5 points): no field separates the key's evacuate steps from its contain steps. Step 22 (20:10, the same 158-person hall, 9 hurt) is contain, while 20 and 21 (same hall and crowd, minutes earlier) are evacuate. Steps 12 and 19 get contain in every run. Leave it unless the key's boundary is made explicit.
- **Route and seal** (11/24 and 7/24 exact): not scored, and the key's routes are not the path to the entrance the prompt asks for.

## Noise

Between the two passes the action changed on steps 8, 20, 23 and 24, and the intake's `verdict` or severity on 2, 3, 8, 9, 10, 17 and 23, with temperature 0 at intake. The compose call still runs at 0.3. Expect about ±1 point between passes on this code; a change that moves the score by less than 3 is inside the noise.
