# web/

The React page, built by Vite into one `web/dist/index.html` (JS and CSS inlined). The server serves it.

## Entry points

- `src/main.tsx` mounts `src/App.tsx`: the WebSocket, the top bar, the left rail, the report and the station grid.
- `src/station.ts`: the page state. Every server message goes through `reduce`.
- `src/components.tsx`: one renderer per panel type in `shared/library.json`. `src/floorplan.tsx`: the FloorPlan panel's two maps.
- `src/layout.ts`: how wide each panel sits on the 12-column grid. `src/route.ts`: safe routes on the floor plan.
- `src/report.tsx`, `src/evidence.tsx`, `src/rail.tsx`, `src/topbar.tsx`, `src/actions.tsx`, `src/experts.tsx`: the report, its highlighted evidence, the pipeline rail, the top bar, quick actions and expert calls.
- Tests: `src/layout.test.ts` and `src/route.test.ts`, run by `pnpm test`.

## Invariants

- The page renders model and web text as React text, never as HTML. Only http and https links render.
- Every panel type has exactly one renderer, and the props come from `shared/protocol.ts`.
- Art and sound load as separate files through `src/url.ts`, so they keep the Standby `?token=` query.
- Type-check with `tsc --noEmit -p web` (part of `pnpm check`).
