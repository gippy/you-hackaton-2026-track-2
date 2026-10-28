# fixtures/

The incidents the station can open.

- `haunted-dashboard.json`: the official single report from the hackathon. `simulated-incidents.json`: more single reports.
- `<scenario>/scenario.json`: a scenario played step by step (`nightfall`, `phantom`, `zombies`). Each has `title`, `sky` (whether steps get the sky) and `ticks`.
- `<scenario>/answer-key.json`: the expected station for each step, for `eval/` only.

## Invariants

- **Answer keys never reach the model.** The server reads only `scenario.json` and the top-level `*.json` reports. Do not copy key fields into a report.
- Every top-level `*.json` here must have a `ticks` array; the server loads all of them.
- A new scenario folder shows up after a server restart. Add an `answer-key.json` to evaluate it.
