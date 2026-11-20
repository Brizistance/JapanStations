# Street design: rules for redesigning a station's outside

The owner's rules for every street-level redesign, agreed 2026-11-19 after the Tsumugibashi and Kita-Ōdōri passes. Those two stations are the worked examples: `src/stations/hub.ts` (`street()`) and `src/stations/surface.ts` with `roadKit` and `models` set.

## The rules

1. **No plain boxes in view.** Every building a player can see from the street is a Blender model: the front rows, the rows behind them, and the backdrop city round the station. Textured boxes (`facade:…`) are not acceptable in a finished redesign.
2. **The road kit on every road.** Signals, pedestrian signals, blue direction boards, lane paint, kerb guard rails and modelled vehicles. Signal arms carry a junction name plate.
3. **Street furniture and signs.** Modelled trees, lamps, benches, drinks machines and bicycle racks. Billboards and vertical signs on buildings, lettered by the game.
4. **Landmarks per station.** Each redesigned station gets a few one-off landmark buildings of its own.
5. **The look comes from the district, and the owner is still asked.** Building mix, heights and materials follow the station's district in `src/data/network.ts` and match the station's interior theme. Before building, ask the owner whether they want changes or have new ideas.
6. **Names are invented and recorded.** Landmark and shop names never copy a real business. New ones go in `docs/worldbuilding.md`; junction names come from the area (rule 2).

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

## Known gaps

- New model sets have no simplified copies for distance. `plaza.glb` is about 5 MB and `city.glb` about 8 MB; frame rate has not been measured.
- The backdrop is only modelled round stations that set a district. Others still show plain boxes.
- Utility poles come only with the kit's narrow side streets.
