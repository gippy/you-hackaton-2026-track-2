# Nightfall

**Logline.** Vampires and werewolves arrive at the AWS Builder Loft as the real San Francisco sky turns over on 2026-10-28: sunset at 18:15, full dark at 19:43, moonrise at 20:02, all of it inside the demo block. The Haunted Dashboard rebuilds itself from a 24-step log that runs from a costume at 11:20 to a stand-down at 20:26, and the countdown to moonrise is the plot.

All sensor readings, people and badge numbers are invented and every tick has `"source": "simulated"`. Only the sky, the moon phase and the Loft's own rules (registration only, ID, badge always visible) are real.

## Files

- `scenario.json`: 24 ticks, 93 to 120 words each. `time` is 24-hour. `step` and `time` are extra fields beyond the official fixture, so check that the worker ignores them.
- `answer-key.json`: for testing only. Per step: real or harmless, expected action, dispatch yes or no, hot and sealed sectors, panels (expected, optional, discouraged), good and poor countermeasures.

## The two steps that should impress

**Step 21, 20:02, moonrise.** The "minutes to moonrise" number that has been falling since step 7 hits zero at the exact real moonrise (20:02, azimuth 54, 93% lit). Werewolves turn in a hall of 158 people while two vampires still sit in row 16, so the countermeasure picker has to hold two opposite toolkits: silver netting, foam and badge-name calling for the pack, light and garlic for the vampires. Dawn is at 07:32 tomorrow, so the folk "wait for dawn" cure is useless, and a good ledger says so.

**Step 14, 18:40, dinner.** Three genuine folk motifs hit the catering line at once: a vampire counting spilled poppy seeds (1,812 so far), another asking the catering lead "may I come in?" at the staff door, and garlic naan keeping both 3 m back. The right call is "do not invite" plus a garlic and seed line, which is the best-supported advice of the day. Sunlight and silver are the weakly supported ones, and You.com should show that: the sources say lethal sunlight is a 1922 film invention and that silver against werewolves comes from film too.

## What sets it apart

The other four pitches pick a monster or a place. This one picks a clock. The same sector (`main_stage`, `entrance`, `lounge`) gets a different layout at different times, because what changes is how many minutes of daylight, dusk or moonlight are left. Three things back that:

- **Real grounding.** The times come from You.com search results (timeanddate, cited below), and a live run can re-check them. The pipeline's lore step has a real conflict to resolve: pop-culture rules (sunlight, silver) against older folklore (garlic, thresholds, invitation, counting seeds).
- **A tick can lie about its own tier.** The blackout is tiered `CRITICAL_HAUNT` and is not a threat. The wolf pack at 18:55 is tiered `LOW_HAUNT` and is. The model has to read the text, not the label.
- **The agenda is the pressure.** Submissions close at 18:25 while 42 people refuse to leave their desks (step 12), dinner at 18:30 is the vampires' buffet (step 14), and the demo block opens at 19:30 with the house lights down (steps 18 and 19).

No ghosts or phantoms, no zombie crowd from Market Street, no cursed tech, no 1906 history.

## Layouts it should force

| Layout | Panels | Steps |
|---|---|---|
| Quiet watch | ThreatBanner, SourceLedger | 1, 4, 11, 18 |
| Cold case | ThreatBanner, ThermalReadout, plus FloorPlan or SystemsBoard; CivilianTracker only when people are close | 2, 3, 6, 7 |
| Systems-led | SystemsBoard in front, FloorPlan, EMFGauge only at step 8 | 8, 16, 17 |
| Containment board | FloorPlan, CivilianTracker, CountermeasurePicker, with SystemsBoard when lights or doors matter | 5, 9, 10, 13, 14, 15, 22, 23 |
| Evacuation | all but EMFGauge, routes through `entrance` and `registration` | 12, 19, 20, 21 |
| Stand-down | CivilianTracker, ThermalReadout, no countermeasure picker | 24 |

EMFGauge appears in only two answer keys because these are physical monsters. An optional new `SkyClock` strip (sunset, civil dusk, astronomical dusk, moonrise as a countdown) would make the pitch visible in one glance, but it needs a component in `shared/library.json`, which this session did not touch.

## Harmless steps and what makes them tricky

Five of 24, with tiers `ELEVATED`, `UNVERIFIED`, `CRITICAL`, `LOW`, `ELEVATED`. No tier maps to harmless, and none of the text says so.

| Step | Looks like | What is actually there |
|---|---|---|
| 1, 11:20 | A vampire asking to be "invited in" | A caped guest in the line, IR skin 33.8C, photo ID matched |
| 4, 13:05 | Garlic against vampires, hung over the bar | Lunch: 3 kg of garlic in the bread |
| 8, 16:40 | Lights out, "something grabbed my ankle", 11 mG spike, tier CRITICAL | A 3.2 s sag on the street transformer, all back by 16:41 |
| 11, 18:00 | "No reflection in the photo" at sunset | Backlit shot at 1/4000 s, next three frames show a warm, badged guest |
| 18, 19:33 | A wolf on stage, a howl at 94 dB | Team 12's wolf-ear headbands and a 4.1 kHz mic feedback, just before the real wolves |

Step 18 is the cry-wolf trap: it sits in the same sector and the same half-hour as the real peak. Steps 2, 3, 6, 7 and 24 are real but low-urgency, so the right call is observe with no dispatch.

## Timeline against the agenda

| Time | Agenda | Step |
|---|---|---|
| 11:20 | Build opens 11:10 | 1 |
| 13:05 | Lunch 13:00 | 4 |
| 15:05 | Check-in 15:00 | 6 |
| 18:15 to 18:25 | Sunset; submissions close 18:25 | 12, 13 |
| 18:40 | Dinner 18:30 | 14 |
| 19:33 to 20:10 | Demos 19:30; astronomical dusk 19:43; moonrise 20:02 | 18 to 22 |
| 20:26 | Event ends 20:30 | 24 |

Fourteen steps expect a dispatch (5, 9 to 10, 12 to 17, 19 to 23) and ten do not (1 to 4, 6 to 8, 11, 18, 24). The key is authoritative.

## Sky facts used

Sunrise 07:31, sunset 18:15, civil twilight ends 18:42, astronomical dusk 19:43, moonrise 20:02 at azimuth 54, moonset 10:43 today and 11:52 tomorrow, waning gibbous about 93% lit, full moon was Oct 25 at 21:11. Sources differ by a minute or two (one lists sunset as 18:17 and moonrise as 20:03). I used timeanddate and kept all clocks consistent.

## Assumptions

- Sectors are the eight slugs in `scenarios/research/venue.md`. The east and west halves of the hack floor and the network closet are invented there. The blinds, the lounge side door, the SW stair as the exit, the 160 attendees and "check-in at 15:00 means the organizers' floor round plus late registrations" are my assumptions.
- Demos at 19:30 follow the agenda we were given. `venue.md` notes a past event with demos at 19:30 and awards at 20:00.

## Sources

Sky
- https://www.timeanddate.com/astronomy/usa/san-francisco
- https://www.timeanddate.com/moon/usa/san-francisco
- https://alpenglowapp.com/times/san-francisco
- https://www.sunrisesunsettime.org/north-america/united-states/san-francisco.htm
- https://www.fullmoonphase.com/north-america/united-states/san-francisco-moonrise-set

Lore
- https://www.monstropedia.org/index.php?title=Weaknesses_of_the_Vampire (garlic, invitation, seed counting, lethal sunlight not in folklore, hunts noon to midnight)
- https://maverickwerewolf.com/vampire-facts/weaknesses/ (what is and is not folklore)
- https://drakorix.com/chronicles/werewolf (wolfsbane, calling by name, full-moon rule from 1943)
- https://www.crystalinks.com/werewolves.html (name three times, drawing blood)
- https://www.britannica.com/art/werewolf
- https://connectparanormal.net/2025/10/06/werewolves-myths-silver-bullets-and-their-cultural-significance/ (silver as a film convention)
- `scenarios/lore.json` entries `vampire` and `werewolf`

Venue
- https://builder.aws.com/connect/events/builder-loft (registration only, ID, badge visible)
- https://aws.amazon.com/startups/events/startups-demo-and-networking-san-francisco (stairs at the SW corner, lobby elevators)
- `scenarios/research/venue.md`
