# Street design: rules for redesigning a station's outside

The owner's rules for every street-level redesign, agreed 2026-11-19 after the Tsumugibashi and Kita-Ōdōri passes. Those two stations are the worked examples: `src/stations/hub.ts` (`street()`) and `src/stations/surface.ts` with `roadKit` and `models` set.

## The rules

1. **No plain boxes in view.** Every building a player can see from the street is a Blender model: the front rows, the rows behind them, and the backdrop city round the station. Textured boxes (`facade:…`) are not acceptable in a finished redesign.
2. **The road kit on every road.** Signals, pedestrian signals, blue direction boards, lane paint, kerb guard rails and modelled vehicles. Signal arms carry a junction name plate.
3. **Street furniture and signs.** Modelled trees, lamps, benches, drinks machines and bicycle racks. Billboards and vertical signs on buildings, lettered by the game. Shop signs are lightboxes, not colour bands (decided 2026-11-23, `src/signs/shop.ts`): framed, with the shop's emblem, each tenant once per building, a dozen chains that look the same everywhere plus local shops, and wear by the building's age. How thick they are goes by street (`fillModelLots`' `signs`: busy at the hub and night spots, quiet in old quarters), and multi-tenant buildings get a standing sign and a floor directory at the door.
4. **Landmarks per station.** Each redesigned station gets a few one-off landmark buildings of its own.
5. **The look comes from the district, and the owner is still asked.** Building mix, heights and materials follow the station's district in `src/data/network.ts` and match the station's interior theme. Before building, ask the owner whether they want changes or have new ideas.
6. **Names are invented and recorded.** Landmark and shop names never copy a real business. New ones go in `docs/worldbuilding.md`; junction names come from the area (rule 2).
7. **Every walkable space is filled with detail, with alleys and small streets all round, as in Japan** (owner, 2026-11-21). Lanes and alleys cut the blocks into small pieces, their density by district: dense in nightlife and old-town districts, sparser in office districts and suburbs. They hold tiny shops and bars, houses and apartments (doors, plants, bikes, mailboxes), back-of-house clutter (bins, AC units, pipes, meters, crates, wires) and small surprises (a tiny shrine, a vending corner, coin parking, a pocket park). Everything inside the plot is walkable; past its edge the streets carry on and are only seen. No bare building backs or sides, no empty lots, no view ending in empty land.

Added from the owner interview, 2026-11-20, after the Hyōtanbori, Minamihorie and Tsumugibashi passes:

8. **Osaka small streets in every redesign.**
   - Every future station outside gets the small-street layout: 6.5 m streets back from the main road, a parallel back street, open alleys and back lanes, poles and wires, and two-way scooter and kei traffic.
   - Its density follows the district, and so does the street life: vending clusters, plants, AC units, A-boards, のぼり flags and bikes. There is more in old and nightlife quarters, less by offices.
9. **Nothing floats.**
   - Every object stands on the ground or on a real wall.
   - Wall clutter (AC units, wall lamps, meters, service drops, pipes) is modelled into the buildings, never placed by guessing where walls are. Hitboxes are not walls: they reach above the roof and over open stairs, balconies and corridors.
   - Nothing is placed against an alley's open mouth.
10. **Everything that looks walkable is walkable.** No hitbox-blocked lanes or gaps; slivers too narrow to enter are closed visibly.
11. **Night must look right.**
    - Every street, small street and back lane is lit by its lamps.
    - Signs, shop windows and lit windows glow softly and never glare or blow out to white.
    - Check every redesign at 21:00 as well as by day.
12. **The signal standard.**
    - At narrow junctions: the Honjō-nishi short-arm pole, with the junction plate beside its top and a thin LED head.
    - Pedestrian heads hang on the vehicle mast wherever one stands by a crosswalk.
    - Some small-street crossings get a signal with a crosswalk.
    - Every station gets blue 通り/筋 road-name boards and invented junction names.
13. **One hero piece each, inside and out.**
    - Each station gets one or two invented landmark pieces on top of the shared kit.
    - A redesign always covers both the street and the station inside (rule 19 says how far inside).
    - The owner picks which station comes next each time.

Added from the owner interview, 2026-11-21, after the Kita-Ōdōri rebuild (`src/stations/hub-street.ts` is the worked example for all of these):

14. **The standard set, at every station.**
    - No bare ground inside a block: every leftover patch is put to use by its size (coin car park, pocket park, shrine, tiny-shop lane, bicycle park, service yard, dressed back lane).
    - Every road that reaches the plot's edge runs on about 200 m between rows of buildings, with a cross street half way.
    - A lift you can ride: at least street to concourse, and on to the platform where there is room.
    - A real street grid: a second parallel street and cross streets, a signal wherever two streets with traffic cross, one-way local streets joined by left turns only.
15. **Size by station class.** Interchanges and hero stations get one large landmark building you can walk into and a full grid. Ordinary stations get the standard set, new main-street fronts and one or two small landmark pieces. Only the hub has a terminal, towers and a viaduct.
16. **Main streets are purpose-built.** Whatever fronts the station's main street and its exits is modelled for that station. Stock kits (zakkyo, machi, shophouse, office, manshon) only on back streets, in lanes and past the plot's edge.
17. **A real Japanese place as the model.** For each station, propose one real district type that fits its ward (Umeda was the hub's) and get the owner's yes before planning. The layout takes after it; no real name is copied.
18. **Main boulevards keep the height line.** A cornice at 31 m with towers set back above it, as on Yanagi-suji. Lesser streets vary freely.
19. **Below ground, the whole concourse.** Ticket hall, gates, paid corridors, passages, shops and exits are redesigned to match the new outside. Platforms stay unless the owner asks. (Kita-Ōdōri's gates and paid side were left as they were; they are owed this.)
20. **Research before building.** Before any new kind of thing (a level crossing, a bus terminal, a shrine approach, an expressway), look up how it is really done in Japan, in Kansai where it differs; write the sources into this doc; ask the owner questions.
21. **The signal standard is the researched one** (see Traffic signals below). It replaces rule 12's first two points.
22. **Every invented name is web-checked** before it goes in, and `docs/worldbuilding.md` says which were. (At Kita-Ōdōri only eight were; the rest are owed.)
23. **No awkward gaps in a street block** (the owner, 2026-11-25, after Minato Center and Shiomi).
    - **Size blocks to their buildings before laying streets:** a block's depth is about two rows of the buildings meant for it plus at most a back alley (stock rows are 9–14 m deep). A block too big for its buildings gets another street first, never a lawn.
    - **What a leftover becomes, by width:** up to 6 m a paved back alley with clutter (bins, AC units, bicycles); 6–15 m parking or a yard; wider than 15 m means the layout is wrong: add a building or a street.
    - **By district:** dense places (old town, nightlife, station fronts) close gaps with buildings and alleys; new towns and waterfronts may also use parking and small greens.
    - **Greens are small pockets only:** pocket parks, planted strips, courtyard trees; no open lawn longer than about 20 m, and a real park only where the plan names one.
    - **Coin parking may open straight onto the street**, with its sign, pay machine and a lamp.
    - **Every leftover is either walkable or plainly shut:** an enclosed courtyard gets a passage in; a sliver shut in behind buildings is a raised service yard, not bare ground.
    - **Check before reporting:** the stage-3 bare-ground test, plus a view from above and one along each small street.

## How to work

1. **Interview the owner first, as a Japanese urban planner would:** the real place to take after (rule 17), what to model, which landmarks, extras. Offer a recommended answer to each question.
2. **Short plan in chat, then wait for a yes.** No plan files unless asked.
3. **Build in stages:** streets first, then the buildings you walk into, then below ground. The owner looks after each stage.
4. After each stage run `npm run typecheck` and the full `npm test`, and the data checks:
   - no wall item without a wall behind it, and no AC unit above its wall top
   - no blocked lane; nothing blocking an exit stair or a door; a collider (`b.block`) on every model a player can reach
   - the walk and traffic tests
5. **Sign-off is the owner's.** Take a few sanity views (the first view a player sees, one junction, one interior, by day and at 21:00), say plainly what was not looked at, and report. The owner walks it and sends screenshots of what is wrong. No full browser checklist and no checker agent unless asked.
6. **Work in fewer, bigger rounds.**

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
- **Where wires go** is the spec's `poles` flag (residential, old-town and hill streets) plus every narrow side street of a road-kit station. Business centres bury them on the main road: Kita-Ōdōri has them only along Minami-niban-dōri.
- **Signs added**: junction name plates, 30 km/h over a school-route warning on narrow side streets, no-stopping at kerb bus stops, a hydrant sign, a finger post and a standing area map at every junction, delineator posts at side-street corners, shopping-street lamps along canal banks.
- **Not built yet**: one-way and no-entry signs, pedestrian-only hours with time plates, street-name plates on walls, convex mirrors beyond the kit's own, school-zone road paint, evacuation signs.

## Convenience stores you can enter (built 2026-11-19)

- `konbini(b, { type, chain, y? })` in `src/stations/konbini.ts` builds a shop in the current frame: front on z = 0 facing −z. It makes the room, the colliders and a zone (so the walk test must get inside), and places the fittings from `konbini.glb` (`tools/blender/build_konbini.py`).
- **Types:** `corner` (stand-alone, 14 × 9 m), `ground` (in the base of the `mid_k` block, 12 × 10 m), `kiosk` (open-fronted, inside a station, 8 × 5 m), `roadside` (16 × 10 m behind a car park with a pole sign; modelled, not placed yet).
- **Chains:** Maruhoshi Mart, Asanagi, Hinode Stop (`CHAINS`). Stock is plain colour blocks; nothing is copied from a real shop.
- **Placing one:** at a `surface.ts` station, add to the spec's `konbini` list (`{ type, chain, side, x0 }`); its lot is kept out of the ordinary fill. In a composer like `hub.ts`, reserve the lot and call `konbini` inside `b.with`.
- **Placed so far:** Kita-Ōdōri (a `corner` shop on Minami-ichiban-dōri, a `kiosk` in the Central Passage) and Tsumugibashi (a `corner` shop by the side street, a `ground` shop on the avenue). Long term: every station.
- Below the street a shop uses the `konbiniu_…` copies of the fittings, which take no daylight.

## Level crossing kit (built 2026-11-19, not placed anywhere)

- `levelCrossing(b, { road, x, z, rw, tracks, line, station })` in `src/stations/roads.ts`: a mast with lamps and a gate on each approach, a track panel with rails, stop lines and yellow edge lines.
- The lamps and gate arms are live signs (`{ k: 'crossing' }`). They follow `crossingActive` in `src/signs/departures.ts`: closed from 35 s before a train of the line reaches the station until 12 s after it leaves. No line has a crossing yet, so nothing calls it.
- The arms are drawn, not solid, and snap between up and down.
- To look at one without a line: place it temporarily and use `__sim.crossing(true | false | null)`.

**Hyōtanbori (2026-11-20):** nightlife model lots (`night`), the grand canal and station pieces in `src/stations/hyotanbori-street.ts` (spec `canalGrand`, `pieces`; models `build_hyotan.py`).

**Kita-Ōdōri, the terminal district (2026-11-21, stage 1 of 3):** the old plaza, Sky Crown, expressway and scramble are gone. `src/stations/hub-street.ts` lays a grid of 筋 and 通 (the file's head has the plan): the avenue and four wide streets on the road kit (`tees` for Yanagi-suji, which ends at the terminal), Minami-ichiban-dōri and Kōka-dōri with their own signalled junctions (`junction`, `sideRoad`; 14 signalled junctions in all, one shared cycle: axis 0 east–west, axis 1 north–south), three one-way local streets joined by left turns only, corner cut-offs, a median on the avenue. Models: `build_kitafront.py` (13 avenue fronts), `build_mioya.py` (the terminal department store), `build_gate.py` (the Gate Towers), `build_viaduct.py` (AR viaduct: arch bays, walk-through bays, station bays, girder bridges), `build_ring.py`, `build_kitaarcade.py`, `build_kitacity.py`, sharing `kitakit.py`. Names, clocks and screens are placed from `src/stations/anchors/*.ts`, which the scripts write (`mark`). Screens are a live sign (`{ k: 'screen' }`). Road signs gained one-way and no-entry. Stage 2 (same day) opened the terminal: `build_mioya.py` leaves the grand concourse's room in the `store` model and dresses it with a second model, `hall` (interior faces; `DAYLIGHT` 0.45); the colliders, galleries, stairs and signs are in the terminal block of `hub-street.ts`. A building you walk into needs both: the outer model's faces do not show from inside. Stage 3 (same day) added Miochika's south town at B1 (`town` in `hub.ts`, models `build_miochika.py`) with exits 11–14: two rise in bays cut into the Gate Towers' podium fronts (`RX0` … in `build_gate.py`, mirrored by the colliders), two on the local streets' pavements. The gates and everything inside them were kept: they are fitted to the platform stairs. Owner's round of fixes, same day:
- **Lifts you can ride** (`src/world/lifts.ts`, `src/stations/lift.ts`, `Builder.lift`): a shaft with a floor at every level; whoever stands in it is carried to the next. At the hub: food floor, grand concourse and gallery; street to Miochika beside exits 13 and 14; the footbridge's four towers.
- **Yanagi-suji's fronts** south of Minami-ichiban-dōri are purpose-built (`suji_a` … `suji_h` in `build_kitafront.py`): a colonnaded street storey, a cornice at the old 31 m line, towers set back above.
- **No bare ground inside a block** (rule 7): after the buildings are placed, `hub-street.ts` finds every free rectangle in each block's interior and dresses it by size: coin car park, pocket park or shrine; a row of tiny shops with a lane; bicycle park or service yard; a back lane.
- **Past the plot's edge** every street runs on 200 m between rows of simplified buildings, with a cross street half way (Yanagi-suji excepted: Tsumugibashi's boulevard arrives there).

**Midorizaka (2026-11-21):** a different street plan: the park (pond, bridge, trellis, playground) opens onto the pavement where the station's pavilions stand; across the road a bus and taxi rotary (standing buses and taxis; moving traffic stays on the main road) and Midorizaka Ginza, all `pieces` (`midorizaka-street.ts`, models `build_midori.py`).

**Moving rotary traffic (2026-11-22, Hibarino):** `LanePart.detours` take a share of a main lane's buses and taxis off it, round the rotary (bus bays, a taxi stand) and back onto it with a give-way at the exit (`traffic/system.ts` `detourRoute`).

**Kaiseichō (2026-11-20):** model old town with small streets and ginkgo street trees; the high school (walk-in forecourt, porch, clock tower) and Gakurindō Stationery as `pieces` (`kaiseicho-street.ts`, models `build_kaisei.py`).

**Small-street signals (2026-11-20):** each signalled small-street junction has a head on each side with its own crosswalk; spec `smallSignals` sets the share per station (default 0.4).

**Tsurumatsu (2026-11-20):** model old town (spec `oldTown`), the shōtengai built from models (spec `arcadeModel`, `tsurumatsu-street.ts`: gate, roof bays, shop rows), Tsuru-no-yu bath as a `piece` (models `build_tsuru.py`); arcade rows leave the corner piece's flank open.

**Minamihorie (2026-11-20):** the quiet canal (spec `canalQuiet`, `minamihorie-street.ts`), clock tower, Café Horie and Kinoha as `pieces` (models `build_horie.py`); canal rows stand back behind any piece on their corner.

**Map edges (2026-11-21):** model streets carry on 210 m past the plot (`continuation` in `surface.ts`, `CONTINUE`) with side streets, crossings, lamps and kerb rails; full models on the first block, simplified beyond. The backdrop lays district blocks on the station's own grid (`districtGrid` in `render/world-view.ts`); the daytime haze is nearer (`atmosphere.ts`).

**Tsumugibashi, the merchant quarter (2026-11-21, stage 1 of 3, after Senba and Kitahama):** `src/stations/tsumugibashi-street.ts` replaces `surface()` here (the file's head has the plan; plot 200 x 150). Tsumugi-dōri's 24 m either side of the carriageway is, as on the old Midosuji, a ginkgo separator, a side lane (側道, parked vans and cars), a planted strip with a second ginkgo row and a 9 m pavement (owner, 2026-11-21: the plain pavement was too wide); the side lanes stop by the footbridge, at the bridge and before the Exchange (its forecourt), and open into the one-way streets or through the separator into the main road (parked cars only, no moving traffic yet); the canal and its walks are built `open` so the street never hides them; outdoor paving is `tile:`, never the reflective `floor:`; 筋 at x −160, −100, −66, 0, 125, 165 and 通 at z ±90 (cars west of Yanagi-suji only, a paved walk east of it). Tsumugi-bori has a riverside walk 2.15 m down on both banks (after Dōtonbori's river walk: city.osaka.lg.jp/kensetsu/cmsfiles/contents/0000010/10856/01J.pdf), reached by stairs from the west quay, the bridge-foot plaza and a passage; the east bank's buildings back onto it with cafés at walk level and named terraces at the second floor, and a boat landing with a sightseeing boat lies on the west bank (after Kitahama Terrace: pref.osaka.lg.jp/documents/2670/03_kitahamaterasu.pdf). 絹問屋横丁, a wholesalers' lane, runs north off the avenue. An old painted-steel footbridge squares the main junction, with lifts at two corners and an arm towards the Exchange (joined to its upper floor in stage 2). Models: `build_tsumugifront.py`, `build_tsumugikit.py`. One-way streets wait at the avenue's kerb for the cross phase before turning in. Stage 2 (same day): the Silk Exchange opened up (`src/stations/exchange.ts`, model `exchange_inside` in `build_exchange.py`): the old trading floor as a double-height hall east of the drum, a gallery with the silk museum round the hall and the drum, a stair and a lift; the footbridge's arm ramps down into a second-floor door through a glazed link. Not yet: stage 3 (the concourse, and a street-to-concourse lift).

**Aizomechō, the dyers' quarter (2026-11-22, stage 1 of 3, after Karahori and Nakazakichō):** `src/stations/aizomecho-street.ts` replaces `surface()` here (the file's head has the plan; plot 170 x 150). Tsumugi-dōri over the Nagisa Line and Akane-suji over the Akanesuji Line are the two big streets, with purpose-built fronts (`build_aizomefront.py`: wholesalers' tile blocks and signboard shop houses are new, the rest are Tsumugibashi's styles recoloured). Behind them 藍甕筋 Aigame-suji, the dyers' street, has no cars: stone setts, the rinsing stream down its west side north of Tsumugi-dōri (slabs to each house, a low rail, piped under the streets), cloth drying across it, merchants' houses, the cotton wholesalers' storehouses, the dye works つゆ草 with a passage through to its drying yard, a lane to 甕守稲荷. The station's headhouse stands on its east side (a shell until stage 2 opens the hall), with のれん小路 along its flank from the avenue and 藍染横丁 behind the houses. East of the avenue the blocks are row-house lanes with a Jizō each (`roji`). Models: `build_aizome.py`; `leftovers()` is shared with Tsumugibashi. Sources: Kyoto City's machiya guides for the house plan (city.kyoto.lg.jp/tokei/cmsfiles/contents/0000024/24803/kyomachiya.pdf), drying yards of tall poles behind dyers' shops and the Kon'yachō prints (ndl.go.jp/en/landmarks/sights/konyacho, gotokyo.org dyeing workshops of the Kanda river), Karahori's lanes under 4 m with row houses and Jizō (mlit.go.jp/crd/city/mint/pdf/099osaka3.pdf). Stage 2 (same day): the headhouse is open (`src/stations/headhouse.ts`, spec `headhouse`). The concourse keeps its place under Tsumugi-dōri but has gates at its east end only (exits 1 and 2); from a doorway in its north wall at the west end a paid corridor runs under the pavement to a stair between two escalators and a lift you can ride, up into the hall, where the gate line, the office and the ticket machines stand at street level and the great doorway (exit 3) opens on Aigame-suji. The old pavement stairs 3 and 4 are gone. The outer model has an open doorway and no inner faces; the inside is built in code. Stage 3 (same day): the hall is dressed as a dyers' house in `headhouse.ts` (indigo tile dado, posts and tie beams, kōshi inside the front wall, lengths drying on poles high across the hall, the crest and the wave mural on the back wall, benches, lanterns); the corridor has the dado, the mural and a rail of lengths; lengths hang across the Nagisa platforms (`platform` in the look). AR Kon'yahama is listed on exit 3's board and on a notice in the hall. Known conflict for later: by `network.ts` Kon'yahama stands about (−32, −81) in this plot and the AR line crosses it from there south-west through the dye yard and the headhouse; one of the two has to move when AR is built in 3D.

**Aobadai, a hillside garden suburb (2026-11-22, stages 1 to 3):** `src/stations/aobadai-street.ts` replaces `surface()` (plot 260 x 170; the file's head has the plan). Not the avenue template: Kitaoka-dōri is a two-lane 10 m road with 2.5 m pavements; the two 筋 cross it under signals; the back streets 上ノ段通 and 下ノ段通 are one-way with short-arm signals; lanes run between them. The station's own quarter: a small exit house over exit 1 (the stair comes up inside it; a café upstairs; a lift from the ticket hall to the street and the café, `through.ts`), the covered 葉月商店街 off the north plaza (walk-in shops, `build_aoba.py`), 丘守神社 on a terrace up a stone stair, bicycle parking on both plazas. Below: a lift you ride from the platform (`platLift` in `specs.ts`), the ticket hall dressed with a sage gateway and lanterns (`looks/aobadai.ts`, `entry-specs.ts`, `indoors` for exits that come up inside a building). Past the edge the streets keep their markings and poles; the first band is low houses, apartments only beyond the halfway cross street. Sources: Hankyu's model of suburban development by the railway and the Hanshinkan hillside suburbs (smtrc.jp/town-archives/city/nishinomiya/p03.html, narapu.repo.nii.ac.jp/record/876/files/KJ00008729059.pdf, allabout.co.jp/gm/gc/31289/ on Hibarigaoka-Hanayashiki); covered arcades, full-cover type, 7 to 10 m high (chusho.meti.go.jp/shogyo/shogyo/jirei/15/dl/01.pdf, city.matsuyama.ehime.jp Urbandesign shiryou4.pdf); shrine layout, torii, stone stair, approach, water basin, lanterns, lion-dogs (nippon.com/ja/views/b05201/, mlit.go.jp/tagengo-db/R3-00187.html); station-front bicycle parking and lifts from street to station (mlit.go.jp/road/road/bicycle/introduce/pdf/07_7.pdf, city.ota.tokyo.jp Kamata station-front plan). Not verified: the exact arcade roof heights used here (7.6 m to the eaves) against a standard.

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

Mounting follows Japanese practice as researched 2026-11-21 (the owner asked for Kansai). `vehicleSignal`, `shortSignal`, `pedSignal` in `src/stations/roads.ts`; models in `tools/blender/build_road.py`.

- **Where heads stand:** the main head beyond the junction on the left; a second head for the other way hangs back to back with it on the same arm, which is that traffic's near-side head (`back`). No separate repeater poles.
- **Arms are short:** a straight steel pole with two parallel beams, 2.0 m or at most 3.5 m (`sigp2`, `sigp3`), the head fixed between the beams at the tip. The long curved arms (`signal7`, `signal9`) are no longer placed.
- **By era (`PoleStyle`):** `new` as above with thin LED heads; `old` (spec `oldTown`, or an old-town or nightlife side) keeps the single curved arm `signal3` and hooded heads, one in three with the green-and-white striped back board (`head_zebra`); `shared` (road kit `shared: true`) hangs the signal on a matt dark grey pole that carries the street light too (`siglight2`, `siglight3`), after Osaka's Midosuji guideline. At the hub: the avenue and Yanagi-suji.
- **Never on a utility pole.** A narrow street's own signal stands on the short-arm steel pole (`sigshort`).
- **Name plate:** on the arm, road side, between the pole and the head, its foot on the upper beam (owner, 2026-11-21); a pole with a plate always has the 3.5 m arm. On the old curved arm and the short-arm pole it stands on posts over the arm.
- **Heights:** vehicle heads' middle 5.55 m (underside 5.4 m thin, 5.2 m hooded); pedestrian heads' middle 3.1 m (underside 2.7 m). Lamp order green, yellow, red from the left, red nearest the road's centre.
- **Audible signals** are the bird calls (ピヨピヨ / カッコー, `src/audio/traffic.ts`), with a speaker on the pedestrian heads of every wide crossing.
- Right-turn arrows on avenues at wide junctions, countdown bars on thin pedestrian heads, push buttons on narrow crossings, a control cabinet at each junction. The arrow has its own 4 s after the main road's yellow (`signalState`).

Sources: Osaka Prefectural Police signal pages (police.pref.osaka.lg.jp/kotsu/kisei/shingouki/12203.html, 12112.html; audible signals are the bird-call type), Osaka City's Midosuji road-space guideline draft (signals share lighting poles, dark grey about N4), ja.wikipedia.org 日本の交通信号機 (far-left main head and auxiliary heads, 2.0 to 3.5 m arms, steel replacing concrete poles, utility poles discouraged, pedestrian heads 2.5 m or more), kuruma-news.jp/post/73048 (striped back boards dying out), and for flat heads newswitch.jp/p/10304, kuruma-news.jp/post/107499. Not verified against a primary standard: the exact minimum heights. The game's flat heads hang upright, not tilted, because signs cannot lean.

## Small street places

Four kinds, each on its own lot on a street front (`src/stations/places.ts`, models in `tools/blender/build_places.py`): a pocket park (14 x 12 m), a neighbourhood shrine (9 x 14 m), a vending corner (6 m) and a police box (kōban). Stations built by `surface.ts` list them in the spec field `places` like the konbini lots; Kita-Ōdōri reserves three lots west of the tower in `hub.ts`. Placed so far: Kita-Ōdōri has Yanagisuji Pocket Park west of the tower and the kōban on the corner of Akitsushima-dōri (a shophouse row fronts that street; the city round the hub plot is perimeter blocks: rows on every street, dressed corner walls, coin parks inside, signalled ring junctions); Tsumugibashi has Tsumugi Inari Shrine, its kōban and a vending corner.

## Trees

Twelve kinds as Blender models (`tools/blender/build_trees.py`, placed with `modelTree` in `src/stations/trees.ts`), each in two sizes: ginkgo, zelkova, flowering dogwood, trident maple and a clipped azalea hedge for streets; cherry and Japanese maple for parks; black pine, camphor and cedar for shrines; weeping willow and bamboo. The street kinds follow the 2022 national street-tree survey (nilim.go.jp, report ks1246: ginkgo, cherry, zelkova, dogwood and trident maple are the five most planted).

Trees that change have spring, summer and autumn versions; the season is chosen in Settings under Graphics (`src/render/season.ts`, default summer) and changes the trees only. Used so far at Kita-Ōdōri (ginkgo and zelkova by block on the avenue, willows on Yanagi-suji, cherry, maple and dogwood round the plaza and in the park) and Tsumugibashi (spec field `treeKinds` for the main road; camphor, cedar, pine and bamboo at the shrine). Other stations keep the plain `tree()` until their own redesign.

Leaves are cut-out cards carrying a spray of leaves from a painted sheet, over a small dark core, and trunks are wrapped in a bark sheet (`trees_leaves.png`, `trees_bark.png` beside the models; both painted by the build script and repaintable by hand in Blender). The loader keeps their UVs, lights the cards as a round crown, leaves them out of shadow casting and ambient occlusion, and sways them a little above head height (`leafMaterial` in `src/render/building-models.ts`). Trees that shed have leaves or petals lying round their foot in autumn (cherry: spring too). A tree placed with `street` gets an iron grate, and support stakes in its smaller form.

Winter is a fourth season: trees that drop their leaves stand bare, their cards showing fine twigs; evergreens and the azalea hedge stay green. No snow.

## University quarter (Daigaku-mae, 2026-11-22)

After Hongō-style university towns: the campus behind a long brick wall on the main road with a grand brick gate and a ginkgo avenue in, used-book shops in 1920s-30s "signboard architecture" (看板建築: copper or mortar fronts on timber shop houses) facing the wall, old wooden boarding houses (下宿) and a sentō behind. Researched 2026-11-22 (search results only): Hongō's Akamon gate (1827) and the ginkgo avenue from the main gate (NDL landmarks, ndl.go.jp/landmarks/sights/hongo); old wooden glass-fronted lodging inns like Homeikan in Hongō 5-chōme; the UTokyo General Library (1928, Uchida, tan tile, grand staircase up to a basilica-like reading room). Ours stays red brick with a ground-floor reading room, a deliberate difference. The road kit gained `teeNorth` (roads.ts) for T-junctions that open north. Stage 2 (owner's choice): Gakufu-dōri got a ginkgo median and a signalled crossing straight to the main gate; the exits are brick entrance houses; Exit 2's lobby opens on a lift to the library forecourt; the library has a walk-in hall and reading room (`daigaku-library.ts`). Later (owner's choice): Gakufu-dōri's signals on long mast arms (roads.ts `long`, build_road.py `sigp6`, 6.5 m with a stay rod); the campus got the auditorium closing the avenue, a pond garden, campus props and an athletics ground past the south edge.

## Junction town (Hibarino, 2026-11-22)

After Kansai suburban junction towns (Ibaraki-shi, Takatsuki): the main road a block off the viaduct with a bus and taxi rotary (駅前ロータリー) between, left turns in and out; tenant buildings and a manshon tower by the station; a covered shōtengai with gates at both ends; a Hachiman shrine in its grove and a hill park behind the tracks. `roadKit` takes `reach` (a main road off the plot's centre line, called in a moved frame) and `noPoles` (no pole lines under a viaduct). Sources: not yet written down (owed, rule 20).

Hibarino's station (hibarino.ts, the owner's picks 2026-11-22): a free passage with the gates off it; the meadow theme (wheat enamel, honey tile, timber slat ceiling and canopy soffits, sky-blue fins, meadow-green kick, skylark murals) reaching the platforms through `StationStyle.platWall` and `canopy`; the Kikyō B1 in that line's lilac.

## Sides that face a street (the owner, 2026-11-25)

A building whose side wall faces a street gets a real front there: an entrance, shop windows or shutters, the firm's boards, pipes and units on the wall. Flat windows on a blank base are not acceptable, on generic sets as much as on landmarks. The `wholesale` set is the worked example (`side_fronts` in `tools/blender/build_wholesale.py`); Aizomechō's fronts are the level to match.

## Wholesale centre under an expressway (Watayamachi, 2026-11-24)

After Osaka's Semba Center Building (city.osaka.lg.jp, SEMBA_CENTER_BUILDING.pdf): ten linked buildings about 930 m long in the middle of an 80 m avenue, one to four floors above ground, the road and the expressway on their roof, a subway beneath. Ours is scaled to a 40 m avenue: two floors, an 18 m strip, halls broken at every cross street. Measured sizes: docs/theme-notes.md.

## Brick port (Kawaminato-kō, 2026-11-24)

After a redeveloped Meiji–Taishō port (Yokohama's red-brick bonded warehouses, Kobe's and Moji's old customs houses): `minato-street.ts`, models `build_minato.py` and `build_minatofront.py`. The harbour boulevard runs on east over 湊浦橋, a low girder bridge level with the streets, and through the sea wall at Kon'yahama by a **flood gate (陸閘)**: a road opening in a sea wall with a steel leaf that slides shut on wheels along a rail, worked from a panel on site; other kinds are stop logs (角落とし) and lift gates. Sources (search results only, 2026-11-24): MLIT on 陸閘 as openings closed against the sea and open for people and vehicles (mlit.go.jp/common/001123576.pdf); a sliding wheeled gate at both ends of a national-road bridge (soumu.go.jp/main_content/000891184.pdf); Miyagi's design rule that the sill suits the road's level for traffic and evacuation (pref.miyagi.jp/documents/11795/287157.pdf). Models standing on the water past a plot are kept only for kind `minato` and the port cranes (stations/index.ts `place`).

**Joining two stations' streets** (2026-11-24): a plot can have `arms` (world/builder.ts), strips walked past its rectangle; Kawaminato-kō's boulevard runs on that way to the middle of 湊浦橋, where Kon'yahama's arm takes over. Traffic cannot cross from one station's street to another's by itself, so a lane with `hand` moves its vehicles at that point onto the neighbour's lane through it, and a lane `fed` by a neighbour sets out none of its own while that street runs (traffic/street.ts). The seam goes mid-bridge or wherever nothing needs drawing twice.

**Districts without a station** (2026-11-24): land between stations is built as district worlds (`DISTRICT_WORLDS` in stations/index.ts; the first is 唐船町 Tōsen-machi, `tosen-street.ts`, north of Kawaminato-kō). Each mounts by distance like a station, paves its whole plot, walls its open edges, keeps run-on roads out (world/runon.ts) and gives the HUD its zones and name only: never a station, teleport or route end. The north of the port landfill is planned as three: Tōsen-machi, the diagonal 帆影大通 Hokage-ōdōri with 帆影広場 (the quarter 北波止場 Kita-Hatoba), and the Kamome-ga-oka foreign quarter. A district's traffic is its neighbouring station's street (Kita-Hatoba's lanes are Kawaminato-kō's, stations/north-roads.ts), so cars turn between them; a lane marked `angled` turns at any angle (diagonal streets, laid with Builder.poly), and one marked `chain` lets a car that turned onto it pick its next turn there.

## Two stations joined by a walked district (Umibe-shiyakusho-mae to Kawaminato-kō, 2026-11-25)

The 422 m between the two plots is built in Umibe-shiyakusho-mae's world along its plot's `arms` (`src/stations/umibe-east.ts`, numbers in `umibe-plan.ts` `UMIBE_EAST`), not as a district world: one world's lanes then run the whole way and only the seam at Kawaminato-kō's west edge needs `hand` / `fed` lanes (both files; `minato-street.ts` opens its west wall at the boulevard, the back street and the promenade and no longer draws rows west of its edge). The avenue narrows from six lanes to Kawaminato-kō's four at 艀筋, where each station's back street ends at a T; the middle lanes end at the last 筋 before the seam. The street-rule checks cover the plot's rectangle only, not the arms.

## A bascule bridge joining two stations (Shiomi to Minato Center, 2026-11-25)

潮見大橋 carries Shiomi's Hamakaze-suji (4 lanes) over the river mouth to Minato Center, built in Shiomi's world as a plot arm to Minato Center's edge (`shiomi-street.ts`, numbers in `shiomi-plan.ts` `SHIOMI_BRIDGE`); lanes hand over at the seam both ways (`hand` / `fed`), and Minato Center meets it at a staggered T on Hama-dōri, 18 m east of its own Hamakaze-suji (a skewed bridge would have needed angled lanes joining straight ones). It opens on a cycle (`signs/departures.ts` `basculeState`, line `'bascule'`): the level-crossing kit's bell, lamps, barrier arms and traffic gates follow it, `build.barriers` hold people on foot, and `world-view.ts` lifts `build.leaves`. Tests: `shiomi-bridge.test.ts`.

## Size, joins, layout and edges (the owner, 2026-11-25)

Fixed plot of about 300 × 250 m per station, no joins unless asked, a named Japanese layout type per station, and every edge a real boundary or a carried-on street: the rules are in [station-playbook.md](station-playbook.md), "The brief".

## Planned new towns (Minato Center, the owner, 2026-11-25)
Wires are buried in a planned bay new town; poles and wires run only on its back street, where it meets older ground. It has no 6.5 m small streets (rule 8 does not apply there).
No stand-in (`_lo`) rows in a redesign, past the edge either (the owner, 2026-11-25): they read as placeholders from the street. Carry the district's own blocks on instead, and let blocks run across a plot edge rather than leave a lane of backs along it.
