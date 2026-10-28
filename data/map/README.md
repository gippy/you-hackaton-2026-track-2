# Map data for the Haunted Command Station

Two files feed the map panel. Both are static and committed, so the station opens offline: **no tiles, no network calls**.

| File | Size | What it is |
|---|---|---|
| `area.geojson` | 100 KB | The real blocks around the AWS Builder Loft from OpenStreetMap: 176 buildings, 43 streets, parks and plazas, transit entrances, the courtyard stairs and fountain, plus nine story anchors for outdoor incidents. |
| `floor.json` | 16 KB | A coarse, not-to-scale schematic of the Loft on level 2: 8 sector polygons, the hall and toilets, doors, stairs, lifts, windows. Redrawn from Jarda's hand-drawn plan and site photos; not OSM. |
| `preview-area.svg`, `preview-floor.svg` | 94 KB, 10 KB | Throwaway previews rendered from the two files above. Not for the app. |
| `ATTRIBUTION.md` | | ODbL notice and the credit the page **must** show. |

**The page must show "© OpenStreetMap contributors" wherever the area map is visible.** See `ATTRIBUTION.md`. Label the floor plan "Schematic, not to scale" on the page too; the repo is public and the plan is mostly guesswork.

## area.geojson

A GeoJSON `FeatureCollection` in WGS84 (`[lon, lat]`), about 600 m by 600 m, centred on the Loft. Polygon exteriors are counter-clockwise (RFC 7946), so d3-geo also works.

Top-level extras (ignored by GeoJSON readers): `center` `[lon, lat]`, `bbox` `[w, s, e, n]`, `window_m` (600), `venue` (name, building, OSM way, address, level), `attribution` (the credit string), `osm_base_timestamp`, `projection_hint`.

Every feature has `properties.kind`. Features are stored in **draw order** (parks first, anchors last), so you can paint them in file order.

| `kind` | Geometry | Properties |
|---|---|---|
| `park` | Polygon | `name?`, `osm` |
| `plaza` | Polygon | `name?`, `osm`. Two unnamed polygons are the tower's own courtyard and the plaza beside it. |
| `street` | MultiLineString (one per name and type) | `name`, `highway` (OSM value), `class` = `arterial` \| `street` \| `alley` \| `pedestrian`. Only named streets are kept. Centre lines, not road widths. |
| `building` | Polygon or MultiPolygon | `name?`, `height_m?`, `levels?`, `osm`. First Market Tower also has `venue: true`, `venue_name`, `address`, `loft_level: 2`. 71 of 176 buildings have a name and 168 have a height or a level count. |
| `fountain` | Polygon | `name`, `osm` (courtyard fountain) |
| `steps` | LineString | `name` = "Courtyard Entrance stairs", `venue_entrance: true`, `incline`, `level`, `osm` |
| `transit` | Point | `mode` = `subway_entrance` \| `stop`, `name`, `ref?`, `station?`, `network?`, `wheelchair?`, `elevator?`, `access?` (`no` or `private`: closed to the public), `osm` |
| `poi` | Point | Ground-floor shops in the tower (Chipotle, Joe & The Juice, Proper Food): `name`, `amenity`, `level`, `osm` |
| `venue_pin` | Point | The OSM node "AWS Loft - co-working" (`level` 2). Put the Loft marker here. |
| `anchor` | Point | Outdoor story locations, below. Not OSM data: we placed them. |

`osm` is `w<way id>`, `r<relation id>` or `n<node id>`.

### Drawing it without a tile library

Local equirectangular projection around `center`. At this size the error is under 0.1 m, and it keeps `y` up:

```ts
const [lon0, lat0] = collection.center;
const KX = collection.projection_hint.x_m_per_deg_lon;   // 87,9xx m per degree of longitude
const KY = collection.projection_hint.y_m_per_deg_lat;   // 110,574 m per degree of latitude
const toMetres = ([lon, lat]: number[]) => [(lon - lon0) * KX, (lat - lat0) * KY]; // x east, y north
// SVG: x = cx + SCALE * mx, y = cy - SCALE * my
```

The window is +/-300 m. 1.5 px per metre fills a 900 px square; for a panel, scale to fit and zoom to about +/-150 m around the Loft for the "close" view. The tower is a square rotated about 45 degrees because Market Street runs diagonally: leave north up.

### Story anchors (outdoor incident locations)

`status` is `verified` when OSM maps the thing itself, `assumed` when we placed it from the building geometry. `floor_link` ties an anchor to a sector in `floor.json`. Every outdoor incident belongs to the `entrance` sector, so `entrance` lists its `outside_anchors` in `floor.json`.

| id | Label | Status | lat, lon | From Loft pin | Floor link |
|---|---|---|---|---|---|
| `courtyard_stairs` | Courtyard Entrance stairs | verified | 37.790242, -122.399514 | 22 m | entrance |
| `courtyard_fountain` | Courtyard fountain | verified | 37.790314, -122.399707 | 39 m |  |
| `plaza` | Plaza at the foot of the tower (Ecker Plaza) | verified | 37.790212, -122.399651 | 35 m |  |
| `market_sidewalk` | Market Street sidewalk (525 Market frontage) | assumed | 37.790694, -122.399395 | 46 m |  |
| `first_street_sidewalk` | 1st Street sidewalk (tower's NE face) | verified | 37.790714, -122.398935 | 56 m |  |
| `stevenson_street` | Stevenson Street (back of the tower) | assumed | 37.790327, -122.398929 | 30 m |  |
| `muni_stop` | Muni stop, Market St & 1st St | verified | 37.790390, -122.399816 | 50 m |  |
| `subway_entrance` | Nearest BART/Muni entrance (BART/Muni elevator) | verified | 37.790079, -122.400585 | 118 m |  |
| `transit_center` | Salesforce Transit Center | verified | 37.789003, -122.397016 | 244 m |  |

Notes on the anchors:

- `courtyard_stairs` is OSM `highway=steps` w941650785 on the tower's SW face, up from street level (`level` 0;1) to the courtyard door. It sits beside the fountain and the Chipotle, which matches the 2025 AICamp event page. That page may be dated.
- `plaza` is the midpoint of the OSM pedestrian way named Ecker Plaza (w8917670) along the tower's SW face. OSM's unnamed `place=square` polygon w132127550 covers the same open space, and the stairs stand inside it, so the plaza, the stairs and the fountain are all within about 30 m of each other.
- `market_sidewalk` is 5 m outside the tower's NW face. OSM does not map that stretch of sidewalk as its own way.
- `stevenson_street` is the nearest point on Stevenson Street to the tower's SE face. We do not know whether the freight lift or a service door opens there.
- `subway_entrance` is far (about 120 m): the Montgomery St station entrances are west on Market, and Embarcadero is about 230 m north-east. The Muni stop on Market at 1st is 40 m away.
- The OSM `entrance` nodes in the courtyard (level 1 and level 0) were not kept as separate features.

## floor.json

Schematic of the Loft on level 2, redrawn from Jarda's hand-drawn plan (Figma `hoMyQYoQfNspdNGmuqeijJ`, page 1) and six site photos. Coordinates are in a **0 to 100 wide box, `y` pointing down** (the plan is 771 by 628 units in Figma, so the box is 100 by 81.45). The plan is a *rotated* view: plan-up is about NE, plan-right SE, plan-down SW (the courtyard side), plan-left NW (the Market Street side). That orientation is inferred from the verified SW entrance and the street the lobby windows look onto, and it matches the tower's footprint, a square turned about 45 degrees (`plan_up_bearing_deg`: 45). It is not an architectural drawing and carries a `notice` string you should show.

| Field | Meaning |
|---|---|
| `space` | `width` (100), `height`, `y_axis` "down", `orientation` note, `plan_up_bearing_deg` |
| `outline` | The floor outline, a rectangle |
| `source` | Where the plan came from |
| `zones[]` | One polygon per sector (all axis-aligned rectangles) |
| `areas[]` | Regions drawn in the plan that are not sectors: `hall` (L-shaped) and `toilets`. Same fields as zones (`id`, `label`, `kind`, `polygon`, `position`, `basis`, `label_at`) |
| `zones[].slug` | The sector slug from `scenarios/research/venue.md`. `catering_coffee_bar` also carries `aliases: ["catering"]`, because `shared/library.json` still calls it `catering` |
| `zones[].label`, `label_at` | Display label and a point to draw it at |
| `zones[].position` | `verified` (public source), `sketched` (taken from the hand-drawn plan or photos) or `assumed` (a guess): how well is *where it sits on the floor* known? |
| `zones[].existence` | `verified` or `invented`: does the sector exist at all? (`hack_floor_*` split and `network_closet` are invented in venue.md) |
| `zones[].basis` | One sentence on the source or the guess |
| `zones[].spots[]` | Real spots inside the sector, as text only (the "exact spot goes in free text" rule) |
| `zones[].touches[]` | Zones sharing a wall. Not a door: use `connections` for movement |
| `zones[].area_anchor`, `outside_anchors[]` | Only on `entrance`: link to `area.geojson` anchors |
| `features[]` | Doors, stairs, lifts, desks, stage, window walls |
| `features[].type` | `stairs` \| `door` \| `elevator` \| `desk` \| `stage` \| `window` |
| `features[].at` | `[x, y]`. `polygon` (stage, lift box) or `line` (window walls) when it has extent |
| `features[].zone` | Owning sector slug, or null. Then `area` names a region (`hall`) or `zones[]` lists the sectors the feature runs along (window walls) |
| `features[].exit` | True for ways out of the building: the stairs, the street doors, the rear stage-hall door |
| `features[].position`, `basis` | As for zones. `basis` names the Nightfall step where one mentions the feature |
| `connections[]` | Graph edges `a`, `b` (a sector slug or an area id such as `hall`), `via` (a feature id or null), `note`. Use them to draw routes: all are assumed |
| `exits[]` | Ids of the features with `exit: true` |

### Zones

| Slug | Label | Position | Existence | Touches |
|---|---|---|---|---|
| `entrance` | Entrance | verified | verified | registration, lounge |
| `registration` | Registration | assumed | verified | entrance, catering_coffee_bar |
| `lounge` | Lounge | assumed | verified | entrance, hack_floor_west, hack_floor_east |
| `catering_coffee_bar` | Catering and coffee bar | sketched | verified | registration |
| `main_stage` | Main stage | assumed | verified | hack_floor_west, hack_floor_east |
| `hack_floor_west` | Hack floor west | assumed | invented | lounge, main_stage, hack_floor_east |
| `hack_floor_east` | Hack floor east | assumed | invented | lounge, main_stage, hack_floor_west |
| `network_closet` | Network closet | assumed | invented | none (off the hall) |

### Features

| Id | Type | Label | Zone | Exit | Position |
|---|---|---|---|---|---|
| `courtyard_stairs` | stairs | Courtyard Entrance stairs | entrance | yes | verified |
| `street_doors` | door | Street doors | entrance | yes | assumed |
| `security_desk` | desk | Security desk | registration |  | assumed |
| `registration_desk` | desk | Registration desk | registration |  | assumed |
| `lobby_elevators` | elevator | Lobby elevators | entrance |  | assumed |
| `hall_double_doors` | door | Hall double doors | entrance |  | assumed |
| `rear_stage_door` | door | Rear stage door (R2) | main_stage | yes | assumed |
| `coding_zone_door` | door | Door to the coding zone | hack_floor_west |  | assumed |
| `stage` | stage | Stage | main_stage |  | assumed |
| `lounge_side_door` | door | Lounge side door | lounge |  | assumed |
| `lounge_main_door` | door | Lounge main door | lounge |  | assumed |
| `kitchen_door` | door | Staff-only kitchen door | catering_coffee_bar |  | assumed |
| `freight_lift` | elevator | Freight lift | hall |  | assumed |
| `nw_glass` | window | Windows (street side) |  |  | assumed |
| `se_glass` | window | Windows (coding zone) |  |  | assumed |

The walk-through: guests come up the **Courtyard Entrance stairs** into `entrance`, past the security desk and the lobby elevators. The west lobby (`registration`) opens onto the eating area (`catering_coffee_bar`). The east lobby is the `lounge`, with a side door north into `hack_floor_west`. Double doors lead north into the **hall**, which runs between the toilets and the big coding room, then along the top of the plan. The hall reaches the coding room through a door and through the **rear stage door R2**. `main_stage`, `hack_floor_west` and `hack_floor_east` are one room, split on paper. Evacuation routes in the Nightfall scenario run through `entrance` and `registration`.

## Verified, sketched and assumed

**Verified (public sources):**

- The Loft is on level 2 of First Market Tower, 525 Market St, OSM way 32946570: 39 levels, 169 m. The OSM node "AWS Loft - co-working" has `level=2`.
- Guests enter by the Courtyard Entrance stairs at the building's SW corner, next to a Chipotle and a water fountain (AWS Builder Loft page, AICamp 2025 page, the AWS startups event page). OSM maps one flight of stairs, a fountain and a Chipotle at that spot.
- Photo ID at a security desk first, then the Loft's registration desk (AWS Builder Loft page). Lobby elevators exist (AWS startups event page).
- All of `area.geojson` except the anchors: it is OSM as of 2026-10-28, simplified.

**Sketched (from Jarda's hand-drawn plan and photos, on site):**

- The outline of the floor and where the entrance, the two lobbies, the eating area, the toilets, the hall and the one big coding room sit relative to each other.
- That the hall is L-shaped and runs between the toilets and the coding room. The sign in photo 6 (partly legible) lists Restrooms, Reception, AWS Event Space, AWS User Group Commons, AWS Community Builder Base and a hack stage.
- That the eating area has a catering counter and a drinks fridge, and that the lobby windows on the left look onto a street (photos 2 to 5).

**Assumed (guesswork, labelled `assumed` in the files):**

- Which lobby is registration and which is the lounge. The plan just says "lobby" twice. The west one has the guard's desk (photo 2), the east one the seating and the curved world-map wall (photos 2 and 3).
- Where the stage sits in the coding room (taken as its north end) and the east/west split of the hack floor. Both are invented in venue.md; the plan has one room.
- The network closet (invented in venue.md), put at the north end of the toilet block.
- The doors: the rear door R2, the lounge side door and main door, the staff-only kitchen door, the coding-room door, the double doors, the freight lift. Their story comes from the Nightfall scenario, not from any plan of the Loft. The scenario's "stage corridor" is read as the hall.
- The exact spot of the stairs along the entrance block, and the plan orientation (see above).
- The anchors `market_sidewalk` and `stevenson_street`.
- No source gives the Loft's footprint; a 2018 article gives 10,000 sq ft. The sketch is not to scale, and neither is this file.

## How the build session might use it

1. `import area from '../data/map/area.geojson'` (or fetch it from the server) and draw the `building`, `street`, `park`/`plaza`, `fountain` and `steps` features in file order. Highlight the building with `venue: true`.
2. For an incident outside the Loft, drop a pin at the anchor whose id the model names (`market_sidewalk`, `courtyard_stairs`, `plaza`). For an incident inside, pin the sector polygon in `floor.json` and, for the area view, pin `venue_pin`.
3. The model's `FloorPlan` can keep using sector slugs. `shared/library.json` has its own 600 by 360 grid in `layout`; `floor.json` is a more map-like alternative and would replace it. The slug `catering` maps to `catering_coffee_bar`.
4. Show the OSM credit under the area map and "Schematic, not to scale" under the floor plan. The floor plan is drawn rotated about 45 degrees from north; if you place it over the area map, rotate it by `plan_up_bearing_deg` clockwise.

## How it was made

Overpass API, bounding box 37.7877,-122.4034 to 37.7931,-122.3953 (the +/-300 m window is cut from it), queried on 2026-10-28 with a descriptive User-Agent. Geometry was simplified with Douglas-Peucker (0.12 m within 90 m of the tower, 0.45 m beyond; streets 0.8 m), coordinates rounded to 6 decimals, lines clipped to the window. Buildings under 6 square metres were dropped. Streets without a name, footways, cycleways, busways and the underground lines were left out. The generator scripts and the raw responses were not kept in the repo.
