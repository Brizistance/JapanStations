# Metro train model in Blender

## Context

Trains are currently assembled in code from axis-aligned boxes (`src/trains/car.ts`), and the
same boxes are the collision. They read as "boxes with a stripe". The goal is a proper Blender
model of the metro's rolling stock, shown in the game in place of the boxes.

Decisions from the questions:

- **Scope:** exterior + interior; the model replaces everything you see, the boxes stay as invisible collision.
- **Variants:** one fictional series, modelled once, with the line colour applied at runtime (Y green, N blue, A madder red).
- **Style:** modern aluminium, 2010s-2020s: brushed unpainted body, black cab mask, LED lights, line-colour bands.
- **Detail:** mid-poly (target 15-30k triangles per car), flat materials matching the current look, no baked textures.

## Fixed dimensions (the model must match the game)

Taken from `src/trains/car.ts`, `src/stations/kit.ts`, `src/sim/geometry.ts`. These drive platform
door alignment and collision, so they are not up for redesign.

| | |
|---|---|
| Body length / pitch | 18.0 m body (x = ±9), 18.5 m coupling pitch |
| Body half-width | 1.4 m at floor level (platform gap) |
| Floor / roof | floor y = 1.1 (`PF_H`), ceiling 3.35, roof top 3.55, roof gear up to ~3.85 |
| Doors | 3 per side at x = -5.8, 0, +5.8; opening 1.3 m wide, 1.85 m high |
| Seats | longitudinal benches where the box seats are now (they are colliders) |
| Cab | partition 1.7 m back from the cab end; the nose may bulge past x = 9 by ~0.3 m |

Axes: game car frame is +x along the car, y up, +z right. In Blender: X along the car, Z up,
Blender Y = -game z (the glTF exporter's +Y-up conversion does the rest). Origin at rail level, car centre.

## Part 1: Blender model

Built through the Blender MCP with Python (`bpy` / `bmesh`), in steps, checking each with a viewport render.

1. Check the Blender connection and inspect the open scene first; work in a new file / `Train` collection so nothing existing is touched.
2. **Two car objects:** `car_mid` and `car_cab` (cab at +x). The opposite cab car is the same mesh turned 180 degrees in the game, so the body is kept symmetric about its centre.
3. **Exterior:** extruded body profile with slight side tumblehome and rounded roof shoulders; window bands with frames; door openings with surrounds; waist and cantrail bands as separate faces for the line colour; gangway ends with bellows; cab front with black mask, raked windscreen, offset emergency door, LED head/tail light clusters, skirt and coupler; roof air-con units; underfloor equipment boxes; two bogies per car with frames, wheels and axleboxes. Current collection: check `src/render/track.ts`; if there is no overhead wire, use third-rail shoes on the bogies and no pantographs.
4. **Interior:** floor, wall and ceiling panels, bench seats with end screens, overhead grab rails and strap hangers, luggage racks, door-header housings (where the LCD signs sit), ceiling light strips, cab partition with window, driver's desk and seat.
5. **Not modelled** (stay as code so they keep working): sliding door leaves (`GateSet`), LCD and destination displays (live canvases), head/tail lamp glow. The model leaves openings and recesses where they go.
6. **Materials are named by the game's material keys** (`metal:#c9cdd1`, `flat:#16181b`, `glassTint`, `light`, ...) plus two placeholders, `LINE` (bands) and `SEAT` (moquette), which the loader swaps for the line colour. Interior and exterior faces are separate mesh objects (`int_*` / `ext_*`) so the loader can light them differently.
7. Save `assets/trains/metro-car.blend`, export `public/models/metro-car.glb` (both cars in one file, no Draco, transforms applied), and keep the generator script in `tools/blender/build_metro_car.py` so the model can be rebuilt.

## Part 2: Game integration

- **New `src/render/car-model.ts`:** loads the GLB once with `GLTFLoader` from `three/examples/jsm` (no drei). For each mesh: resolve its material name through `getMaterial()` in `src/render/materials.ts` (`LINE` → `paint:<line colour>`, `SEAT` → `flat:<line colour>`), add the `aEnv` attribute the lit shader needs (`int_*` meshes get the saloon values the box path uses in `boxesToGeometry` car mode, `ext_*` get exterior values), set shadow flags as `makeStatic` in `src/render/part-view.ts` does. Returns a cloneable group per (line, car kind).
- **`mountTrain` in `src/render/world-view.ts`:** use the model group instead of `staticGroup(build, CAR_ENV, ...)` when it has loaded, rotating it 180 degrees for `cabLow`; keep the existing per-car material cloning (`withEnvMod`), signs, `GateSet` doors and lamps. Until the GLB has loaded, or if it fails, fall back to the current boxes. Nudge lamp and destination-sign positions to sit in the modelled recesses.
- **`src/trains/car.ts` stays** as the collision and test source (it must not import three.js). Only adjust it if a modelled feature would otherwise be walked through or bumped into invisibly.
- Add a material key in `materials.ts` only if a needed finish (brushed aluminium) is not covered by `metal:`.

## Part 3: Project housekeeping

- First step on approval: copy this into `Plans/features/train-model/plan.md` (core rule 4).
- Name the series per `docs/worldbuilding.md` (fictional operator, no real series names).
- Update `docs/architecture.md` ("one part list, two consumers" now has a train exception: modelled visuals, box collision), `docs/conventions.md` (how to rebuild/export the model) and `docs/references.md` (asset is original work; note what, if anything, was looked at).

## Verification

- Blender: viewport renders of each car from front, side, three-quarter and interior; triangle count per car within budget; dimensions checked against the table by script.
- `npm test` and `npm run typecheck` pass (collision and walk tests unchanged).
- Run the dev server with `preview_start`; screenshots of a train at a platform (doors line up with platform screen doors on all three lines, including Akanesuji's full-height ones), from inside the saloon, through the cab window, and in a tunnel vs open air (exterior lighting still follows the car). No console errors; frame rate not visibly worse with several trains in view.

## As built

- Blender was run in background mode from the generator script rather than through a live session.
- About 11-12k triangles per car (4.5-5.3k exterior, 7k interior), below the 15-30k target.
- No overhead wire exists in the game, so the car has third-rail shoes and no pantographs.
- The series has no name or number yet; nothing in the game displays one.
