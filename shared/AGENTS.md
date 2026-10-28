# shared/

The contract between the pipeline, the server and the page.

- `protocol.ts`: the WebSocket messages, the incident and manifest shapes, and the props of every panel type (the `Component` union). The server and the page import it.
- `library.json`: the fixed vocabulary: sectors, arsenal, playbooks, panel types (`components`), quick actions, sounds, experts, the art manifest path (`art_manifest`) and the map files. `pipeline/library.py` reads it to build the model's JSON schema.

## Invariants

- A change here usually needs the matching change in `pipeline/library.py` (schema and clean-up) and `web/src/components.tsx` (renderer).
- `protocol.ts` runs under Node type stripping, so only erasable TypeScript syntax.
