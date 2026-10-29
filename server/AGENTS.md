# server/

The Node 24 server. It serves the built page, loads incidents from `fixtures/`, spawns the pipeline per run, streams its events over `/ws`, saves runs, and pages experts.

## Entry points

- `main.ts`: flags (`--port`, `--host`, `--offline`, `--incident`, `--no-browser`), fixture and art loading, and the HTTP routes (`/manifest.json`, `/speech/`, `/data/map/area.geojson`, `/art/station/`, then `web/dist/`).
- `station.ts`: one run at a time. Spawns `.venv/bin/python -m pipeline`, forwards events, saves good runs to `out/runs/`, replays saved runs offline or when a live run fails, and handles the operator's moves.
- `pager.ts`: "Call expert" opens a real PagerDuty incident through the One CLI (`one.ts`). `dispatch.ts`: "Dispatch to #loft-incident" posts to the venue's Discord channel through its webhook (`LOFT_WEBHOOK_URL`), once per incident, at most every two minutes; `DISPATCH=off` posts nothing. `speech.ts`: the spoken call through ElevenLabs. `sky.ts`: sunset and moon for scenarios that use the sky. `proof.ts`: the TypeScript side of the proof ledgers.

## Invariants

- Node runs these `.ts` files directly, so only erasable TypeScript syntax (no enums, no parameter properties). `pnpm type-check` enforces it.
- The server reads only `scenario.json` in a scenario folder, never `answer-key.json`.
- `PAGING=off` switches paging off; use it for every test and the eval. `--offline` also disables paging.
- Default port is 8666. Pass `--port` to run a second station.
- The art route serves only files under `art/station/`, and never its JSON.
