# Street design: rules for redesigning a station's outside

The owner's rules for every street-level redesign, agreed 2026-11-19 after the Tsumugibashi and Kita-Ōdōri passes. Those two stations are the worked examples: `src/stations/hub.ts` (`street()`) and `src/stations/surface.ts` with `roadKit` and `models` set.

## The rules

1. **No plain boxes in view.** Every building a player can see from the street is a Blender model: the front rows, the rows behind them, and the backdrop city round the station. Textured boxes (`facade:…`) are not acceptable in a finished redesign.
2. **The road kit on every road.** Signals, pedestrian signals, blue direction boards, lane paint, kerb guard rails and modelled vehicles. Signal arms carry a junction name plate.
3. **Street furniture and signs.** Modelled trees, lamps, benches, drinks machines and bicycle racks. Billboards and vertical signs on buildings, lettered by the game.
4. **Landmarks per station.** Each redesigned station gets a few one-off landmark buildings of its own.
5. **The look comes from the district, and the owner is still asked.** Building mix, heights and materials follow the station's district in `src/data/network.ts` and match the station's interior theme. Before building, ask the owner whether they want changes or have new ideas.
6. **Names are invented and recorded.** Landmark and shop names never copy a real business. New ones go in `docs/worldbuilding.md`; junction names come from the area (rule 2).
7. **Every walkable space is filled with detail, with alleys and small streets all round, as in Japan** (owner, 2026-11-21). Lanes and alleys cut the blocks into small pieces, their density by district: dense in nightlife and old-town districts, sparser in office districts and suburbs. They hold tiny shops and bars, houses and apartments (doors, plants, bikes, mailboxes), back-of-house clutter (bins, AC units, pipes, meters, crates, wires) and small surprises (a tiny shrine, a vending corner, coin parking, a pocket park). Everything inside the plot is walkable; past its edge the streets carry on and are only seen. No bare building backs or sides, no empty lots, no view ending in empty land.

## How to work

1. **Ask questions first:** what to model, which landmarks, style, extras. Offer the district-based default and ask for changes or new ideas.
2. **Short plan in chat, then wait for a yes.** No plan files unless asked.
3. **Build**, then `npm run typecheck` and the full `npm test`.
4. **Check exits and collision:** nothing may block an exit stair or the station doors, and every model a player can reach needs a collider (`b.block`). Trees, lamps, shelters and vehicles included.
5. **Finish with screenshots** from several street-level points, including the view a player sees first, and say what was not viewed.

## How each rule is met in code

| Rule | What to use |
|---|---|
| Front-row buildings | `fillModelLots(..., { noBack: true })` in `surface.ts`; catalogue in `src/stations/buildings.ts` |
| Rows behind | A row filler over a pool of models, as `row()` in `hub.ts` (`ROW_POOL`). Leave an alley between rows |
| Backdrop city | `b.out.district = { radius, old, oldRadius }`. `surface.ts` sets it when the spec has `models: true`; the hub sets it by hand (radius 620) |
| Road kit | `roadKit(b, geo)` in `src/stations/roads.ts`. `tee: true` where the crossing road only runs to one side. Kerb rails via `kerbRail` and `kerbGaps`. Spec flag: `roadKit: true` |
| Junction names | Default: the station's name, plus a chōme number when it has several junctions. Override with `junctions: [{ ja, en }]` for a named place (the hub: 川湊駅前) |
| Moving traffic | Lanes laid with `trafficLane` (`roads.ts`; `roadKit` and `surface.ts` lay theirs), driven by `src/traffic/system.ts`: signals and queues on kit streets, free flow on plain ones. Turns at signalled junctions are worked out from where lanes cross; a side street that ends at the main road is a `dead` lane in and a `flow: 0` lane out. A lane's `halts` are its bus stop and taxi stand (vehicles pull in to the kerb and out again; nothing is parked there), `yields` its unsignalled zebra crossings, `gates` a level crossing (none placed yet). Cyclists ride a `cycle` lane in the kit's bicycle lane. Where a lane meets the plot's edge and no other plot or open track is in the way, its road runs on 90 m past it (`src/world/runon.ts`): the backdrop paves it and keeps buildings off it. Its sounds (`src/audio/traffic.ts`) are made in the audio engine until recordings named in `ROAD_SFX` (`src/audio/sfx.ts`) are generated. Wheels and lamps are drawn by `src/render/traffic-view.ts` from the positions in `RIG` (`src/traffic/vehicles.ts`), which mirror `build_road.py`. Density follows the street's buildings and the hour. A hand-built street needs its own `trafficLane` calls |
| Extra vehicles | `roadModel(b, id, x, 0, z, facing)` plus a `b.block`. Traffic keeps left; `roads.ts` is the one place that says so |
| Street furniture | Models in `city.glb`, placed merged (`merge: true`) as `furniture()` in `hub.ts`. Drinks machine faces are `machine` signs |
| Landmarks | One-off models with a fixed lot (`LANDMARKS` in `hub.ts`), listed in `exits.ts` so exit boards name them |
| Names on buildings | Plain boards on the model; the name is a game sign placed on top. Generic boards are lettered automatically from `SHOPS`, `SIGN_WORDS`, `TOWER_NAMES` |

## Making models

- Scripts live in `tools/blender/`, built headless: `blender --background --python tools/blender/build_<kind>.py`. Blender 5.3 is at `C:\Program Files\Blender Foundation\Blender 5.3\blender.exe`.
- Use `buildkit.py` (`Part`, `run`, `sign`, `win`). `build_plaza.py` has reusable helpers: `windows`, `piers`, `band`, `display`, `doors`, `lamp`, `planter`, `roof_plant`.
- Frame: front at z = 0 facing −z, origin mid-frontage on the pavement. A building that must face +z is placed with `rot: 2`, which also mirrors its x.
- Output goes to `public/models/buildings/<kind>.glb`. Add the kind to `PROPS` in `src/render/building-models.ts`, and to `OUTDOOR` if it stands in daylight.
- Models carry no information: names, clocks, signal lenses and maps are game signs on blank boards.
- Sizes used for lots and colliders are mirrored in code (`CITY`, `LANDMARKS` in `hub.ts`). Change both together.
- Running a script rewrites `tools/blender/__pycache__/buildkit.cpython-313.pyc`, which is tracked. Restore it with `git checkout --` before committing.

## Lights, signs and power lines (built 2026-11-19)

All in the road kit (`tools/blender/build_road.py`, `src/stations/roads.ts`) and used by every street `surface.ts` builds, with or without `roadKit`.

- **Streetlights by environment** (`streetLamp`): `lamp_hw` highway masts on avenues and by offices; `lamp_shop` by shops (`mixed`, `neon`); `lamp_park` by parks, campuses and the sea, and on forecourts. Where a street has `poles: true` and houses or apartments, the utility poles carry the lights instead.
- **Power lines** (`poleLine`): poles with a crossarm, three high-voltage wires, three low-voltage wires and two telecom cables, all sagging between poles; drops to the buildings behind; lines crossing the road from every second pole; a transformer on every second pole; green address plates (station name plus a chōme number). Wires are generated in code so they follow the street.
- **Where wires go** is the spec's `poles` flag (residential, old-town and hill streets) plus every narrow side street of a road-kit station. Business centres bury them on the main road: Kita-Ōdōri has them only in the back lane behind the avenue.
- **Signs added**: junction name plates, 30 km/h over a school-route warning on narrow side streets, no-stopping at kerb bus stops, a hydrant sign, a finger post and a standing area map at every junction, delineator posts at side-street corners, shopping-street lamps along canal banks.
- **Not built yet**: one-way and no-entry signs, pedestrian-only hours with time plates, street-name plates on walls, convex mirrors beyond the kit's own, school-zone road paint, evacuation signs.

## Convenience stores you can enter (built 2026-11-19)

- `konbini(b, { type, chain, y? })` in `src/stations/konbini.ts` builds a shop in the current frame: front on z = 0 facing −z. It makes the room, the colliders and a zone (so the walk test must get inside), and places the fittings from `konbini.glb` (`tools/blender/build_konbini.py`).
- **Types:** `corner` (stand-alone, 14 × 9 m), `ground` (in the base of the `mid_k` block, 12 × 10 m), `kiosk` (open-fronted, inside a station, 8 × 5 m), `roadside` (16 × 10 m behind a car park with a pole sign; modelled, not placed yet).
- **Chains:** Maruhoshi Mart, Asanagi, Hinode Stop (`CHAINS`). Stock is plain colour blocks; nothing is copied from a real shop.
- **Placing one:** at a `surface.ts` station, add to the spec's `konbini` list (`{ type, chain, side, x0 }`); its lot is kept out of the ordinary fill. In a composer like `hub.ts`, reserve the lot and call `konbini` inside `b.with`.
- **Placed so far:** Kita-Ōdōri (a `ground` shop on the avenue, a `kiosk` in the Central Passage) and Tsumugibashi (a `corner` shop by the side street, a `ground` shop on the avenue). Long term: every station.
- Below the street a shop uses the `konbiniu_…` copies of the fittings, which take no daylight.

## Level crossing kit (built 2026-11-19, not placed anywhere)

- `levelCrossing(b, { road, x, z, rw, tracks, line, station })` in `src/stations/roads.ts`: a mast with lamps and a gate on each approach, a track panel with rails, stop lines and yellow edge lines.
- The lamps and gate arms are live signs (`{ k: 'crossing' }`). They follow `crossingActive` in `src/signs/departures.ts`: closed from 35 s before a train of the line reaches the station until 12 s after it leaves. No line has a crossing yet, so nothing calls it.
- The arms are drawn, not solid, and snap between up and down.
- To look at one without a line: place it temporarily and use `__sim.crossing(true | false | null)`.

**Hyōtanbori (2026-11-20):** nightlife model lots (`night`), the grand canal and station pieces in `src/stations/hyotanbori-street.ts` (spec `canalGrand`, `pieces`; models `build_hyotan.py`).

**Minamihorie (2026-11-20):** the quiet canal (spec `canalQuiet`, `minamihorie-street.ts`), clock tower, Café Horie and Kinoha as `pieces` (models `build_horie.py`); canal rows stand back behind any piece on their corner.

**Map edges (2026-11-21):** model streets carry on 210 m past the plot (`continuation` in `surface.ts`, `CONTINUE`) with side streets, crossings, lamps and kerb rails; full models on the first block, simplified beyond. The backdrop lays district blocks on the station's own grid (`districtGrid` in `render/world-view.ts`); the daytime haze is nearer (`atmosphere.ts`).

**Boulevard (2026-11-21):** Tsumugibashi's avenue runs on 435 m to Kita-Ōdōri (spec `boulevard`, `surface.ts`): median trees, side streets with building rows, frontage rising to towers, landmark corners (つむぎ百貨店 Tsumugi Department Store, 時計の辻 Clock Corner, ホテル 柳筋 Hotel Yanagisuji). Past the plots everything is merged, nothing underground is drawn, and AO is off.

**Detail by distance (2026-11-21):** building models with a simplified copy go in 150 m cells (`lodModels`/`updateLod` in `render/building-models.ts`): full models near the camera, merged lazily one cell a frame. Leftover gaps in building rows become alleys (`alley` in `surface.ts`). Districts reach 450 m; daytime haze 200–800 m. Measure frame rate with the browser pane visible: a hidden pane throttles to 1 fps.

**Backs and lanes (2026-11-21):** every building set has detailed backs and sides (`backs()` in `tools/blender/buildkit.py`: windows, pipes, AC units, meters, back doors, fire escapes on tall ones). Back lanes behind the front rows are dressed (`backLane`), and each plot side street carries on 170 m past the edge with a cross street (`sideStreetOut`).

**Rule 7 in code (2026-11-21):** on a model street each block between side streets is cut by lanes back from the pavement (`crossLane`; every 30 m in old and nightlife quarters, 42 m mixed, 60 m offices) and filled behind its front row by `rearRows`: lanes parallel to the street with rows of small buildings facing them, doorstep plants, mailboxes and bikes, and now and then a lane shrine, pocket park, vending corner or coin parking (`coinParking`). Lots behind kept pieces are filled too. Alleys end at low block walls. `walk.test.ts` reaches as far as small street zones.

**Small-street traffic (2026-11-21):** each lane back from a main road is a one-way `minor` lane (`crossLane` in `surface.ts`; `use: 'minor'` in `traffic/system.ts`): scooters, bicycles, kei trucks, the odd small car come from past the plot's back, stop before the pavement (main-road phase) and turn left onto the road. No traffic where the mouth meets a bus stop or taxi stand, an exit stair, a junction within 35 m, or another lane facing it. The mouth's kerb rail, lamps and trees are cleared.

**Osaka small streets (2026-11-20):** `smallStreets` in a surface spec (Hyōtanbori, Minamihorie, Tsumugibashi) replaces the 3 m lanes with 6.5 m streets every 45 m (old or nightlife quarters) or 62 m, plus one parallel street 20 m behind the pavement. They have white edge lines, 止まれ, stop and 30 signs, a kerb mirror, and poles and wires down one side. Low `machi` buildings (build_machi.py) front them, with doorstep clutter. Traffic runs both ways: out by a stop line, in by left turns off the main road (`P_MINOR`).

**Small streets, second pass (2026-11-20):** each road segment goes through `smallSegment` in `surface.ts`:
- Small streets avoid kept lots and exit stairs.
- The parallel street (`SMALL_P` = 28 m back) runs through the whole segment, out across the pavement onto side streets, and through the canal rows to the quay.
- A second row faces the parallel street, and rows are stacked behind (`stackRows`), so no paving is left bare.
- The rows sometimes include a shrine, pocket park or coin parking.
- No balconied flats line the small streets.
- Side walls have more pipes and meters and painted wall ads (`backs(signs=)`).
- Bike lanes have blue dashes and bus lanes a white line, with no solid colour bands.

**No blocked gaps (2026-11-20):** a gap between buildings that looks like a lane is walkable. In small-street blocks, colliders sit on each building only, and the gaps behind rows are back lanes (`backGap`: paving, a drain, bins, a lamp, wires). Slivers under 1.2 m are closed. Wires crossing a small street end on the opposite wall at a bracket with insulators and a drop to a meter (`poleLine` `wall`).

**Street life (2026-11-20, small-street stations):**
- Each block gets a vending cluster on the main pavement: 2–4 lit machines, a bin at each end, sometimes under a corrugated nook roof with a bench (`vendCluster`).
- Doorsteps get herb boxes, potted pines, plant shelves, green curtains, A-board menus, food-sample cases and のぼり flags. There are more in old and nightlife quarters.
- AC racks of 2–8 units go up walls that exist (`wallAC`).
- About 40% of the crossings where a small street meets the parallel street get the short-arm signal: a crosswalk, a stop line and pedestrian heads, with outbound traffic stopping on the main road's phase.

**Wall clutter lives in the buildings (2026-11-20):** AC units on brackets, bracket lamps, service-drop insulators and meters are modelled on side and back walls by `backs()` in `buildkit.py`, only where a wall exists (`side_z`). The street code no longer places anything on walls: no `wallAC`, no back-lane wall lamps or wires, no wire crossings to buildings. Lanes are lit at night from each building's back-door lamp (`lamps.ts`, `BACK_DOOR`).

**Lights, signals, props (2026-11-20):** street lights follow the quarter: `lamp_led` by offices, `lamp_suzuran` in nightlife quarters, `lamp_shop` among shops, `lamp_twin` down a boulevard median, `lamp_small` in small streets. At some narrow junctions the side street gets `sigshort` instead of the utility-pole bracket (`(seed + junction) % 2`). It carries the junction plate on top, a short arm with the head, the pedestrian head and a no-parking sign. Wherever a signal mast stands by a crosswalk, the pedestrian head hangs on that mast (`mastPed`). Blue road-name boards hang on the masts. Props: post boxes, phone boxes, bike racks, planters, benches, garbage stations, barber poles. Vehicles: courier and plain vans, kei vans, more minivans and scooters.

## Ideas for later (the owner's picks)

- A ramen or soba counter you can enter; a small shrine or pocket park between buildings. (Built inside stations: `shopRoom` in `src/stations/shopfronts.ts`.)
- Vending machine corners.
- Night mode: a time of day in which lamps, shop fronts, lit windows and signals glow.

## Known gaps

- New model sets have no simplified copies for distance. `plaza.glb` is about 5 MB and `city.glb` about 8 MB; frame rate has not been measured.
- The backdrop is only modelled round stations that set a district. Others still show plain boxes.
- Utility poles come only with the kit's narrow side streets.

## Traffic signals

Three mountings (`src/stations/roads.ts`, models in `tools/blender/build_road.py`): a tapered pole with a curved arm and stay (`vehicleSignal`), a standing head on a straight pole as a repeater at the stop line of wide junctions (`sideSignal`), and a head on a bracket from a concrete utility pole (`poleSignal`), which gives every other narrow side street its own signal instead of a stop sign. Heads are separate models: the hooded 300 mm type with a back board, and the thin 250 mm LED type on avenues (main road half width 8 m or more). Avenues also get a right-turn arrow lamp at wide junctions, pedestrian heads with countdown bars and audible-signal speakers; push-button crossings get button boxes; each junction has a control cabinet. The arrow has its own 4 s after the main road's yellow (`signalState` in `src/signs/draw.ts`).

References (2026-11-20): the 2017 National Police Agency change to flat heads with 250 mm lenses (newswitch.jp/p/10304, kuruma-news.jp/post/107499); a maker's flat head of about 1050 x 350 x 88 mm, tilted 15 degrees; pole types from Maruichi Steel Tube's signal pole catalogue. Not verified: mounting heights (4.5 m over the road and 2.5 m for pedestrian heads are the commonly quoted clearances). The game's flat heads hang upright, not tilted, because signs cannot lean.

## Small street places

Four kinds, each on its own lot on a street front (`src/stations/places.ts`, models in `tools/blender/build_places.py`): a pocket park (14 x 12 m), a neighbourhood shrine (9 x 14 m), a vending corner (6 m) and a police box (kōban). Stations built by `surface.ts` list them in the spec field `places` like the konbini lots; Kita-Ōdōri reserves three lots west of the tower in `hub.ts`. Placed so far: Kita-Ōdōri has the kōban, Yanagisuji Pocket Park and a vending corner; Tsumugibashi has Tsumugi Inari Shrine, its kōban and a vending corner.

## Trees

Twelve kinds as Blender models (`tools/blender/build_trees.py`, placed with `modelTree` in `src/stations/trees.ts`), each in two sizes: ginkgo, zelkova, flowering dogwood, trident maple and a clipped azalea hedge for streets; cherry and Japanese maple for parks; black pine, camphor and cedar for shrines; weeping willow and bamboo. The street kinds follow the 2022 national street-tree survey (nilim.go.jp, report ks1246: ginkgo, cherry, zelkova, dogwood and trident maple are the five most planted).

Trees that change have spring, summer and autumn versions; the season is chosen on the main menu beside time and weather (`src/render/season.ts`, default summer) and changes the trees only. Used so far at Kita-Ōdōri (ginkgo and zelkova by block on the avenue, willows on Yanagi-suji, cherry, maple and dogwood round the plaza and in the park) and Tsumugibashi (spec field `treeKinds` for the main road; camphor, cedar, pine and bamboo at the shrine). Other stations keep the plain `tree()` until their own redesign.

Leaves are cut-out cards carrying a spray of leaves from a painted sheet, over a small dark core, and trunks are wrapped in a bark sheet (`trees_leaves.png`, `trees_bark.png` beside the models; both painted by the build script and repaintable by hand in Blender). The loader keeps their UVs, lights the cards as a round crown, leaves them out of shadow casting and ambient occlusion, and sways them a little above head height (`leafMaterial` in `src/render/building-models.ts`). Trees that shed have leaves or petals lying round their foot in autumn (cherry: spring too). A tree placed with `street` gets an iron grate, and support stakes in its smaller form.

Winter is a fourth season: trees that drop their leaves stand bare, their cards showing fine twigs; evergreens and the azalea hedge stay green. No snow.
