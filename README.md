# Haunted Command Station

Our entry for Track 2, The Haunted Dashboard, at Hack with YOU: Halloween Edition (San Francisco, October 28, 2026).

A raw paranormal incident report goes in. An operable command station comes out, live, over a WebSocket. The model picks the panels from a fixed component library, orders them by urgency and fills them with facts from the report. Every countermeasure it offers is backed by a numbered You.com source.

The operator then works the station. They pick a countermeasure, seal sectors on the floor plan and mark people as extracted. When the threat needs a specialist, a "Call expert" button pages one through PagerDuty with One: the vampire hunter for corporeal threats, the ghostbuster for spectral and anomalous ones.

## What happens on a run

1. **Intake (Parasail).** `parasail-minimax-m31-flash` turns the raw text into a structured incident: entity, class, sector, EMF, temperature, people at risk, affected systems and severity. A strict `json_schema` response format fixes the shape.
2. **Route (CrewAI Flow).** A `@router` reads the incident class and picks a playbook: spectral, corporeal or anomalous. Each playbook has its own arsenal of countermeasures and its own lore focus.
3. **Ground (CrewAI agent and You.com).** A CrewAI Lore Researcher agent runs two You.com searches through a custom tool, then writes short notes that cite the numbered sources. If the agent skips its searches, the Flow runs them itself, so the station is never built on guesses.
4. **Compose (Parasail, streamed).** Parasail streams the manifest under a strict `json_schema` built from the component library, the playbook's arsenal and the number of sources. The server sends each component to the page the moment its JSON object closes, so the station assembles while the model is still writing.
5. **Call an expert (One).** Two buttons, "Vampire hunter" and "Ghostbuster", open a PagerDuty incident through One's "Create an Incident" action. The playbook the code routed to picks the primary button, and the station follows the page until someone acknowledges it.

Different incidents get different stations. Besides the official fixture, `fixtures/simulated-incidents.json` holds three simulated ones, marked `"source": "simulated"`: a zombie crowd at the entrance, a poltergeist in the network closet with no one at risk, and a harmless fog machine at a costume contest. The page lists them all, and one click builds a station for any of them. For the harmless one, the model recommends observing, both expert buttons step back, and the page says no expert is needed.

## How the partners work together

| Partner | What it does here | Where |
|---|---|---|
| CrewAI | Runs the pipeline as a Flow: `@start` intake, `@router` on incident class, one listener per playbook, an `or_` join into grounding, then composition. The Lore Researcher is a CrewAI `Agent` with a `BaseTool` for You.com. | `pipeline/flow.py` |
| You.com | Search API (`POST https://ydc-index.io/v1/search`) grounds the countermeasures. Each hit becomes a numbered source that the manifest cites and the page links. | `pipeline/grounding.py` |
| Parasail | Reasons in every step: incident extraction, the Lore Researcher agent, and the streamed manifest. Both direct calls use a strict `json_schema`. `parasail-deepseek-v41-flash` is the fallback model. | `pipeline/flow.py`, `pipeline/parasail.py` |
| One | Pages the vampire hunter or the ghostbuster through PagerDuty and follows the incident, and reaches ElevenLabs for the spoken call and the sound effects. Action ids are found at run time by method and path, and connection keys come from `one list`. | `server/one.ts`, `server/pager.ts`, `server/speech.ts` |

## How it is built

```text
fixtures/haunted-dashboard.json ──► server/main.ts (Node, TypeScript)
                                       │  spawns, writes the incident to stdin
                                       ▼
                                    python -m pipeline (CrewAI Flow)
                                       │  one JSON event per line on stdout
                                       ▼
                                    server/station.ts ──► WebSocket /ws ──► web/ (Vite + React)
                                       │                                      │ compile, call expert
                                       ├─ out/last_run.json (every good run)  ◄┘
                                       └─ server/pager.ts ──► One CLI ──► PagerDuty
```

- **Python only where CrewAI needs it.** `pipeline/` holds the Flow, the You.com tool and the Parasail calls. It runs as a worker that reads one incident on stdin and writes events on stdout.
- **TypeScript for everything else.** Node 24 runs `server/*.ts` directly. The page is Vite, React and TypeScript.
- **One library, three readers.** `shared/library.json` holds the sectors, floor plan geometry, arsenal, playbooks and component descriptions. The pipeline builds its `json_schema` from it, and the server and page render from it.
- **One protocol.** `shared/protocol.ts` types every WebSocket message and the manifest, for both the server and the page.
- **The model never writes markup.** It can only emit components from the library. The page has one React renderer per component, and all model and web text renders as text. Links render only for `http` and `https` URLs.

## Run it

You need Node 24.22.1 or newer, pnpm, and Python 3.10 to 3.13 (CrewAI does not support 3.14 yet).

```bash
pnpm install
python3.13 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

Put the keys in `.env` (it is gitignored):

| Variable | What it is for |
|---|---|
| `PARASAIL_API_KEY` | Parasail inference |
| `YDC_API_KEY` (or `YOU_API_KEY`) | You.com Search |
| `ONE_SECRET` | The One CLI, for paging and speech |
| `ONE_PAGER_DUTY_CONNECTION_KEY`, `ONE_ELEVENLABS_CONNECTION_KEY` | Optional. Only needed with more than one connection for that platform in One |
| `PAGERDUTY_SERVICE_ID`, `PAGERDUTY_FROM` | Optional. The service to page (default `P1KQZ39`) and the email PagerDuty requires in the `From` header (default: the account owner's, looked up at run time) |
| `PAGING` | Optional. `off` makes the "Call expert" buttons page nobody, for tests and the eval. On by default |
| `ELEVENLABS_VOICE_ID` | Optional. The caller's voice, default "Daniel, Steady Broadcaster" (`onwK4e9ZLuTAKqWW03F9`) |
| `HAUNT_MODEL`, `HAUNT_FALLBACK_MODEL` | Optional. Default `parasail-minimax-m31-flash` and `parasail-deepseek-v41-flash` |

To call experts, install the One CLI and connect PagerDuty and ElevenLabs:

```bash
npm i -g @withone/cli
one add pager-duty
one add elevenlabs
```

Then start the station. It builds the page, opens http://127.0.0.1:8666 and builds a station from the fixture:

```bash
pnpm start
```

Other ways to run it:

```bash
pnpm start --offline          # no network and no keys: replays the last saved run, and no expert can be paged
pnpm start --incident sim-2026-0102   # start from another incident in fixtures/ (default: Nightfall step 20, a real threat)
PAGING=off pnpm start         # the expert buttons page nobody
pnpm start --port 8667        # another port
pnpm start --no-browser       # do not open the page
```

For development, `pnpm dev` restarts the server on changes and `pnpm dev:web` serves the page with hot reload. `pnpm check` type-checks both and builds the page.

## Offline

Every good run is saved to `out/last_run.json`, with every event it streamed. `--offline` replays the last saved run through the same WebSocket messages, so the page builds itself the same way without the network. When `out/` is empty, it replays the snapshot committed in `snapshots/`, which a real run produced. A clean clone with no Python and no keys can show the station with `pnpm install && pnpm start --offline`.

If a live run fails, for example on a network error or a bad key, the page shows the error and replays the last saved run.

## Calling an expert

Two buttons sit in the header: **Vampire hunter** for corporeal threats (vampires, werewolves, zombies) and **Ghostbuster** for spectral and anomalous ones (ghosts, poltergeists, banshees, hexes). The playbook the code routed the incident to makes one of them the primary button, and the other stays available. On a harmless report both step back and the page says no expert is needed.

A click opens a real PagerDuty incident through One:

```text
[SIMULATED] Vampire hunter needed: werewolves · Main stage · 20:02 · 158 people
```

- **Details.** The incident body has the sector, the people at risk, the model's recommendation, the countermeasure the operator picked with its source, and the top three You.com sources.
- **Urgency.** High when the model marked the threat critical or recommends evacuating, low otherwise.
- **No paging loops.** The `incident_key` is `<incident id>:<expert>`, so PagerDuty keeps one open incident per step and expert, and the server pages each expert at most once a minute.
- **Followed to the end.** The server polls the incident every 15 seconds, and the status sits beside the button: Paging, Triggered, Acknowledged by the person who took it, Resolved. "Resolve" closes it from the station, and a later step the model calls safe (observe) resolves every open page.
- **Offline.** The buttons are disabled.

## Sound

The station has sound, made with ElevenLabs through One. Browsers block audio until you interact with the page, so it starts muted. "Sound" in the header turns it on and a slider sets the volume. A "Call expert" click with sound off plays only that call's sting and voice.

- **Sound effects.** A radio squelch, an alert chime, an all-clear chime, a low ambient drone and one short sting per entity in the lore catalog, such as a banshee's wail or a wolf howl. They are generated once and committed in `web/public/sfx/` (about 324 KB), so they play offline too.
- **The model picks the cue.** The manifest has a `sound_cue` field, an enum of the cue and sting ids, the same way it picks components. The station opens with that sound. The phantom gets a ship's bell in fog, the zombie crowd gets a groan, and a harmless report gets the all-clear chime.
- **Spoken call.** Calling an expert plays that expert's sting, then a voice says "Calling the vampire hunter. This is a drill." (or the ghostbuster). The server generates the line with One's ElevenLabs text-to-speech action and caches it in `out/speech/` under a hash of the text, so later calls cost nothing. Generated speech is never committed.

The prompts live in `shared/library.json` under `sounds`. `pnpm sfx` generates the sounds that are missing or whose prompt changed, and `web/public/sfx/sounds.json` records what each file was made from:

```bash
pnpm sfx                  # generate what is missing or changed
pnpm sfx --list           # show what would be generated
pnpm sfx --force zombie   # generate the sounds whose id contains "zombie" again
```

## Art

The art is made on a Mac with Apple Silicon. Parasail turns a short brief into image prompts in the station's palette, and [Z-Image Turbo](https://huggingface.co/Tongyi-MAI/Z-Image-Turbo) renders each prompt locally through [mflux](https://github.com/mflux-community/mflux). Install mflux once. The first render downloads the 4-bit model, about 6 GB:

```bash
uv tool install --python 3.13 mflux
```

Then describe what you need:

```bash
pnpm art "a hero image for the landing screen"
pnpm art --count 4 --size 1536x864 "the entities from the simulated incidents"
pnpm art --prompt "an exact prompt, rendered as written" --seed 7
```

Images land in `art/`. `art/prompts.jsonl` keeps each image's prompt and seed, so a good image can be rendered again or varied with another seed.

## Proof of work

Every Parasail call is appended to `proof/parasail.jsonl`: the pipeline's intake and layout calls, the CrewAI Lore Researcher's calls (recorded from CrewAI's LLM call events), the art prompt writer and the icon generator. Each line has the request, the response, token usage and latency. `proof/partners.jsonl` does the same for You.com searches and every One action (PagerDuty, ElevenLabs, and the Discord posts of earlier versions), with `dry_run` true or false. Keys, headers and One connection keys are redacted before a line is written. `pnpm proof` summarizes both into `proof/README.md`, and `proof/exploration/` holds the morning's model tests.

## Project layout

```text
pipeline/        Python: the CrewAI Flow, the You.com tool, Parasail calls, the NDJSON worker
server/          TypeScript: HTTP and WebSocket server, runs and replays, paging and speech through One
web/             Vite + React page; web/public/sfx holds the committed sound effects
shared/          library.json and protocol.ts, read by all three
scripts/         art.ts renders images locally; sfx.ts generates the sound effects with ElevenLabs through One
fixtures/        the published Track 2 incident, plus three simulated ones
snapshots/       a saved run, for offline mode on a fresh clone
```

## Credits

- `pipeline/parasail.py` comes from One's Track 2 template, [withoneai/you-hackathon](https://github.com/withoneai/you-hackathon/tree/main/templates/haunted-command-station). `server/one.ts` and `server/pager.ts` port the approach of that template's `one_cli.py` to TypeScript: find the action at run time, read its docs before a live call, and never retry a write blindly.
- `fixtures/haunted-dashboard.json` is the published fixture from [youdotcom-oss/halloween-hack-2026](https://github.com/youdotcom-oss/halloween-hack-2026/tree/main/fixtures).
- Built during the hackathon with Claude Code.
