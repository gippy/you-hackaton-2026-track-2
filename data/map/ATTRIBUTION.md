# Attribution

## What must appear on the page

Wherever the area map is visible (the page itself, not just this repo), show this credit, readable and linked:

> © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright)

If there is room for one more line: "Map data available under the Open Database License."

The floor schematic is not OpenStreetMap data and needs no credit, but it should say "Schematic, not to scale".

## Notice

`area.geojson` contains data © OpenStreetMap contributors, extracted from the Overpass API on 2026-10-28 and made available under the [Open Database License (ODbL) 1.0](https://opendatacommons.org/licenses/odbl/1-0/). See <https://www.openstreetmap.org/copyright>.

`area.geojson` is a **derived database** of OpenStreetMap: we filtered, clipped and simplified the geometry, merged street segments by name, and added our own `anchor` features. Those anchors, and nothing else in the file, are not from OSM. Under ODbL the file stays under ODbL 1.0 wherever it is published. The rendered map on the page is a *produced work*: it needs the credit above and no share-alike. The application code is a separate work.

If you change the file, keep the `attribution` field and this notice with it. This note is not legal advice.

## What was fetched

Overpass API (`https://overpass-api.de/api/interpreter`), User-Agent `HauntedDashboardHackathon/1.0 (hackathon prototype)`, bounding box `37.7877,-122.4034,37.7931,-122.3953`:

- ways: `building`, `highway`, `railway` (subway, rail, light rail, tram), `leisure`, `place=square`, `amenity=fountain`, and building relations;
- nodes: subway entrances, public-transport stops, bus stops, elevators, shops, cafes and similar amenities, tourism and entrance nodes, anything named Loft, Plaza or Fountain, and anything on `level=2`.

Two data queries made it into the file. A third, tags-only, was discarded. The public servers were at capacity for several minutes, so a few more attempts were retried against them.

## Other sources

Facts about the venue (the SW-corner stairs, photo ID and registration, lobby elevators, the 2nd floor) come from public pages listed in `scenarios/research/venue.md`. They are facts, not copied text.
