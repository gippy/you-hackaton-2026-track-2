# Map data for the Haunted Command Station

Two files feed the map panel. Both are static and committed, so the station opens offline: **no tiles, no network calls**.

| File | Size | What it is |
|---|---|---|
| `area.geojson` | 100 KB | The real blocks around the AWS Builder Loft from OpenStreetMap: 176 buildings, 43 streets, parks and plazas, transit entrances, the courtyard stairs and fountain, plus nine story anchors for outdoor incidents. |
| `floor.json` | 16 KB | A coarse, not-to-scale schematic of the Loft on level 2: AWS's six blocks, our 8 sector polygons inside them, doors, stairs, elevators. Redrawn from AWS's own kiosk map and Jarda's on-site notes; not OSM. |
| `preview-area.svg`, `preview-floor.svg` | 94 KB, 11 KB | Throwaway previews rendered from the two files above. Not for the app. |
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

Schematic of the Loft on level 2, redrawn from **AWS's own kiosk map** (two photos Jarda took at the Loft on 2026-10-28). AWS draws the Loft as a C-shaped footprint with six colored blocks (Training Rooms, Lounge, AWS Heroes Hub, Reception, Co-Working, Merch Store) around an empty middle. The photo is taken at an angle, so the edges were straightened and snapped to right angles. Coordinates are in a **0 to 100 wide box, `y` pointing down** (the box is 100 by 96.97). It is stylised and not to scale. AWS does not say how it lines up with the compass, so do not rotate it onto the area map. It carries a `notice` string you should show.

An earlier version was drawn from Jarda's own hand sketch (Figma `hoMyQYoQfNspdNGmuqeijJ`). The two disagree on shape, so AWS's map won. The sketch survives as a hint for doors and neighbours only.

| Field | Meaning |
|---|---|
| `space` | `width` (100), `height`, `y_axis` "down", `orientation` note |
| `outline` | Bounding rectangle of the whole map |
| `open_middle` | The part of the C that AWS leaves empty. Not a sector. Open on the right |
| `blocks[]` | AWS's six blocks: `id`, `aws_name` (show this), `polygon`, `sectors[]` (our sectors inside), `note`, `position` |
| `zones[]` | One polygon per sector, each inside one block (`block`) except `entrance` |
| `zones[].slug` | The sector slug from `scenarios/research/venue.md`. `catering_coffee_bar` also carries `aliases: ["catering"]`, because `shared/library.json` still calls it `catering` |
| `zones[].label`, `label_at` | Display label and a point to draw it at |
| `zones[].position` | `verified` (AWS's map or a public source), `sketched` (Jarda's on-site notes or sketch) or `assumed` (a guess): how well is *where it sits* known? |
| `zones[].existence` | `verified` or `invented`: does the sector exist at all? (`hack_floor_*` split and `network_closet` are invented in venue.md) |
| `zones[].basis` | One or two sentences on the source or the guess |
| `zones[].spots[]` | Real spots inside the sector, as text only (the "exact spot goes in free text" rule) |
| `zones[].touches[]` | Zones sharing a wall. Not a door: use `connections` for movement |
| `zones[].area_anchor`, `outside_anchors[]` | Only on `entrance`: link to `area.geojson` anchors |
| `features[]` | Doors, stairs, elevators, desks, the stage |
| `features[].type` | `stairs` \| `door` \| `elevator` \| `desk` \| `stage` |
| `features[].at` | `[x, y]`. `polygon` (stage, elevator box) when it has extent |
| `features[].zone` | Owning sector slug, or null. Then `block` names the AWS block (the elevators sit in `reception`) |
| `features[].exit` | True for ways out of the building: the stairs, the street doors, the rear stage door |
| `features[].position`, `basis` | As for zones. `basis` names the Nightfall step where one mentions the feature |
| `connections[]` | Graph edges `a`, `b` (a sector slug or the block id `reception`), `via` (a feature id or null), `note`. Use them to draw routes: all are assumed |
| `exits[]` | Ids of the features with `exit: true` |

### AWS blocks and our sectors

| Block id | AWS name | Our sectors inside |
|---|---|---|
| `training_rooms` | Training Rooms | `hack_floor_west`, `network_closet` |
| `lounge_area` | Lounge | `entrance`, `lounge`, `catering_coffee_bar` |
| `heroes_hub` | AWS Heroes Hub | none |
| `reception` | Reception | `registration` |
| `co_working` | Co-Working | `main_stage`, `hack_floor_east` |
| `merch_store` | Merch Store | none |

### Zones

| Slug | Label | Block | Position | Existence | Touches |
|---|---|---|---|---|---|
| `entrance` | Entrance | lounge_area | sketched | verified | lounge, catering_coffee_bar |
| `registration` | Registration | reception | sketched | verified | main_stage, hack_floor_east |
| `lounge` | Lounge | lounge_area | verified | verified | entrance, hack_floor_west, network_closet |
| `catering_coffee_bar` | Catering and coffee bar | lounge_area | assumed | verified | entrance |
| `hack_floor_west` | Hack floor west | training_rooms | assumed | invented | lounge, main_stage, network_closet |
| `main_stage` | Main stage | co_working | assumed | verified | registration, hack_floor_west, hack_floor_east |
| `hack_floor_east` | Hack floor east | co_working | assumed | invented | registration, main_stage |
| `network_closet` | Network closet | training_rooms | assumed | invented | lounge, hack_floor_west |

### Features

| Id | Type | Label | Zone | Exit | Position |
|---|---|---|---|---|---|
| `courtyard_stairs` | stairs | Courtyard Entrance stairs | entrance | yes | sketched |
| `street_doors` | door | Street doors | entrance | yes | sketched |
| `security_desk` | desk | Security desk | entrance |  | assumed |
| `elevators` | elevator | Elevators (from the 1st floor) | reception |  | sketched |
| `registration_desk` | desk | Registration desk | registration |  | sketched |
| `rear_stage_door` | door | Rear stage door (R2) | main_stage | yes | assumed |
| `coding_zone_door` | door | Door to Training Rooms | hack_floor_west |  | assumed |
| `stage` | stage | Stage | main_stage |  | assumed |
| `lounge_side_door` | door | Lounge side door | lounge |  | assumed |
| `lounge_main_door` | door | Lounge main door | lounge |  | assumed |
| `kitchen_door` | door | Staff-only kitchen door | catering_coffee_bar |  | assumed |

The walk-through: guests come up the **Courtyard Entrance stairs** and in through the glass doors on the top edge of AWS's **Lounge** band, where `entrance` sits in the middle with the guard's desk just inside. The `lounge` is on its left; `catering_coffee_bar` is on its right, beside the **AWS Heroes Hub**. Down the left of the open middle runs **Reception**, a teal hall. The **elevators** from the 1st floor arrive at the right end of its stepped corner, and `registration` is the corner beside them. To the left of Reception are **Training Rooms** (`hack_floor_west`, `network_closet`); below it is the gold **Co-Working** L (`main_stage` in the lower-left arm, `hack_floor_east` along the bottom). The **rear stage door R2** joins the stage hall to the registration corner, and the **lounge side door** joins `lounge` to `hack_floor_west`. The Merch Store is "coming soon" on the kiosk and is treated as closed. Evacuation in the Nightfall scenario runs through `entrance` and `registration`: out of R2, across the open middle, to the entrance.

## Verified, sketched and assumed

**Verified (public sources and AWS's own map):**

- The Loft is on level 2 of First Market Tower, 525 Market St, OSM way 32946570: 39 levels, 169 m. The OSM node "AWS Loft - co-working" has `level=2`.
- Guests enter by the Courtyard Entrance stairs at the building's SW corner, next to a Chipotle and a water fountain (AWS Builder Loft page, AICamp 2025 page, the AWS startups event page). OSM maps one flight of stairs, a fountain and a Chipotle at that spot.
- Photo ID at a security desk first, then the Loft's registration desk (AWS Builder Loft page). Lobby elevators exist (AWS startups event page).
- The six block names, their colors' grouping and their shape: AWS's own kiosk map (straightened from a photo, so edges are approximate). The Merch Store is "coming soon".
- All of `area.geojson` except the anchors: it is OSM as of 2026-10-28, simplified.

**Sketched (Jarda, on site, including his marks on the kiosk photo):**

- **The entrance:** an arrow into the top edge of the Lounge band, about halfway across. **The elevators:** an arrow reading "Elevator from 1st floor" at the right end of Reception's stepped corner. The lobby has no elevator. Registration is at the corner of the hall, beside the elevators.
- Photos 1 to 6 show what is in the rooms: the long room with tables and a podium, the guard's desk and seating inside the glass doors, the curved world-map wall, the catering counter and AWS Heroes panel, the signage listing Restrooms, Reception, AWS Event Space, AWS User Group Commons, AWS Community Builder Base and a hack stage (partly legible).

**Assumed (guesswork, labelled `assumed` in the files):**

- **How wide the entrance zone is.** Jarda marked a point on the top edge; the zone is a vertical slice of the Lounge band around it, sized by eye.
- **Which sector sits in which block.** Training Rooms = `hack_floor_west` (venue.md lists meeting rooms and sound-proof booths there); Co-Working = `main_stage` and `hack_floor_east`; the left of Lounge = `lounge`, the right of it = `catering_coffee_bar`. Where each stops, and where the stage sits inside Co-Working, are guesses. The east/west and stage splits are invented in venue.md.
- The network closet (invented in venue.md), put in the top corner of Training Rooms.
- The doors: the rear door R2, the lounge side door and main door, the staff-only kitchen door, the door into Training Rooms. Their story comes from the Nightfall scenario, not from any plan of the Loft. The scenario's freight lift is read as one of the elevators. The window walls and toilets of the earlier sketch are not drawn.
- The anchors `market_sidewalk` and `stevenson_street` on the area map.
- No source gives the Loft's footprint; a 2018 article gives 10,000 sq ft. AWS's map is stylised and not to scale, and neither is this file.

## How the build session might use it

1. `import area from '../data/map/area.geojson'` (or fetch it from the server) and draw the `building`, `street`, `park`/`plaza`, `fountain` and `steps` features in file order. Highlight the building with `venue: true`.
2. For an incident outside the Loft, drop a pin at the anchor whose id the model names (`market_sidewalk`, `courtyard_stairs`, `plaza`). For an incident inside, pin the sector polygon in `floor.json` and, for the area view, pin `venue_pin`.
3. The model's `FloorPlan` can keep using sector slugs. `shared/library.json` has its own 600 by 360 grid in `layout`; `floor.json` is a more map-like alternative and would replace it. The slug `catering` maps to `catering_coffee_bar`.
4. Show the OSM credit under the area map and "Schematic, not to scale" under the floor plan. Do not overlay the floor plan on the area map: AWS's map has no known compass direction.

## How it was made

Overpass API, bounding box 37.7877,-122.4034 to 37.7931,-122.3953 (the +/-300 m window is cut from it), queried on 2026-10-28 with a descriptive User-Agent. Geometry was simplified with Douglas-Peucker (0.12 m within 90 m of the tower, 0.45 m beyond; streets 0.8 m), coordinates rounded to 6 decimals, lines clipped to the window. Buildings under 6 square metres were dropped. Streets without a name, footways, cycleways, busways and the underground lines were left out. The generator scripts and the raw responses were not kept in the repo.
