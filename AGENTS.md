# Haunted Command Station

A raw incident report goes in, and a model-composed command station comes out, live over a WebSocket. Built solo for You.com's "Hack with YOU", Track 2, "The Haunted Dashboard".

## How a report becomes a station

1. The server (`server/main.ts`) loads an incident from `fixtures/`: a single report, or one step of a scenario.
2. `server/station.ts` spawns the pipeline (`.venv/bin/python -m pipeline`) with one JSON incident on stdin.
3. The pipeline (`pipeline/flow.py`, a CrewAI Flow) runs intake on Parasail, routes to a playbook, grounds with You.com and streams the manifest. Each step prints one JSON event per line.
4. The server forwards each event over `/ws`. The page (`web/src/`) builds the station panel by panel from the manifest.
5. The operator's moves (countermeasure, seals, people out, expert calls) go back to the server and feed the next step.

The contract between all three sits in `shared/`: `protocol.ts` (messages and panel props) and `library.json` (sectors, arsenal, panel types, art manifest path).

## Folders

| Folder | What lives there | Start reading |
|---|---|---|
| `pipeline/` | Python 3.13 CrewAI Flow: intake, routing, grounding, compose | `pipeline/flow.py` |
| `server/` | Node 24 server: serves the page, spawns the pipeline, streams `/ws`, pages experts | `server/main.ts` |
| `web/` | React and Vite page | `web/src/App.tsx` |
| `shared/` | The contract: protocol types and the component library | `shared/protocol.ts` |
| `fixtures/` | Incident reports and scenarios, with answer keys beside them | `fixtures/nightfall/scenario.json` |
| `eval/` | Scoring harness that runs scenarios through the real pipeline against answer keys | `eval/README.md` |
| `art/station/` | Every scenario's art (WebP) and its `manifest.json` | `art/station/manifest.json` |
| `data/map/` | Floor plan and the OpenStreetMap area | `data/map/README.md` |
| `snapshots/` | Committed saved runs that offline mode can replay | |
| `proof/` | Ledgers of every partner call, written by `pnpm proof` | `proof/README.md` |
| `scripts/` | Art, sound and proof tools, plus the partner preflight | `scripts/art.ts` |
| `docs/` | Component guide, deploy notes, a judges' explainer | `docs/README.md` |
| `scenarios/` | Venue research and lore notes used while writing the scenarios | |
| `.actor/`, `Dockerfile` | Packaging as an Apify Standby Actor | `docs/deploy.md` |

## Run, check, evaluate

Node 24.22.1 (`.nvmrc`) with pnpm, and Python 3.13 in `.venv` (`requirements.txt`). Keys go in `.env` at the repo root: `PARASAIL_API_KEY`, `YDC_API_KEY`, `ONE_SECRET`.

```bash
pnpm install
uv venv --python 3.13 .venv && uv pip install --python .venv/bin/python -r requirements.txt
PAGING=off pnpm start --port 8674 --no-browser            # build the page, then serve the station
PAGING=off pnpm start --port 8674 --no-browser --offline  # no network or keys: replay saved runs
pnpm check                                                # type-check, unit tests, page build
PAGING=off PROOF_CONTEXT=eval .venv/bin/python eval/run.py --label mine --steps 1,21
.venv/bin/python scripts/smoke_test.py                    # read-only preflight of every partner
```

`pnpm dev` runs the server with reload, and `pnpm dev:web` runs Vite with hot reload against it (the Vite proxy expects port 8666).

## Rules that matter

- **Answer keys never reach the model.** The server reads only `scenario.json` and the single-report fixtures. The eval reads `answer-key.json` only after a step has finished.
- **`PAGING=off` for tests and the eval.** Without it, "Call expert" pages a real phone through PagerDuty.
- **Ports.** The server defaults to 8666. Pick your own with `--port` so you do not collide with another running station.
- **Node 24.22.1.** The server runs `.ts` files directly (type stripping), so only erasable TypeScript syntax works there. The One CLI refuses older Node.
- **Keys only in the environment** (`.env` locally, Apify secrets on the platform). Never in code, fixtures, the image or the ledgers.
- **The model never writes markup.** It picks panels from the library and fills their props; a strict JSON schema enforces it.

## Common changes

**Add a panel type.** Touch each layer in this order, then run `pnpm check` and the eval:
1. `shared/library.json`: the panel's one-line description under `components`.
2. `shared/protocol.ts`: its props in the `Component` union.
3. `pipeline/library.py`: its JSON schema in `manifest_schema`, and any clean-up rule in `clean_manifest`.
4. `web/src/components.tsx`: its renderer and title; `web/src/layout.ts`: its width.
5. `docs/components.md`: what it shows and what powers it.

**Add a scenario.** Create `fixtures/<id>/scenario.json` (`title`, `sky`, and `ticks` with `incident_id`, `step`, `time`, `severity_tier`, `raw_incident_stream`, `source`) and an `answer-key.json` beside it. The server picks it up on restart. Evaluate it with `--scenario fixtures/<id>/scenario.json --key fixtures/<id>/answer-key.json`.

**Change a prompt.** The prompts are `EXTRACT_SYSTEM` and `COMPOSE_SYSTEM` in `pipeline/flow.py`. Run the eval before and after with two labels, and keep the change only if the score holds and misses do not go up. See `eval/README.md`.
