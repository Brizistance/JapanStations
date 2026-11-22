# Station rebuild playbook

The fixed procedure for rebuilding a station's outside and its way in, written after Aizomechō (2026-11-22). Follow the steps in order. The rules for what a street must contain are in [street-design.md](street-design.md); this file is how to build one without the mistakes that cost the owner extra rounds.

Worked example throughout: Aizomechō. Its files are `src/stations/aizomecho-street.ts`, `src/stations/headhouse.ts`, `tools/blender/build_aizome.py` and `tools/blender/build_aizomefront.py`. Open them when a step says "as at Aizomechō"; do not open other stations' files.

## The three mistakes this is here to stop

1. **Layout and placement:** buildings on roads or on each other, pieces facing the wrong way, exits coming up in the wrong place, streets stopping short.
2. **Walking and colliders:** blocked lanes, invisible walls, models with no collider, floating objects.
3. **Rules skipped:** plain boxes, bare ground, no lanes, no signals, dark streets at night, stock kits on main streets.

Each step below ends with the checks that catch them. Do the checks before moving on, not at the end.

## Step 1: Measure before you plan

Never plan from memory of another station. Get the numbers from the built station.

- **Exits and levels.** Write a throwaway test in `src/stations/` that finds the station in `STATION_WORLDS` and writes `build.holes`, `build.plot`, `build.zones` and `spawn` to a file (vitest hides `console.log`). Delete it afterwards. At Aizomechō this gave the exit holes (x ±43 … 52.6, z ±15.2 … 18), the concourse floor (−6.2) and the platform extents.
- **The building line.** The exits fix it: the street builder is passed `cw`, and the line is `cw + 5.5`. Throw if it moves, as `aizomeStreet` does.
- **Other lines through the plot.** Check `src/data/network.ts` for every line and station within 200 m, including ones not in 3D yet, and work out where they fall in the station frame. Aizomechō missed this: the planned AR line crosses the dyers' quarter, found only in stage 3.

## Step 2: Interview, then a plan with coordinates

- Ask the owner first (street-design.md rule 17 and "How to work"): the real district to take after, the station building, the landmarks, how far below ground the rebuild goes. Give a recommended answer to each question.
- Then write the plan as the **head comment of the street file**: every street with its centre line, half width, pavement and name; every landmark with its lot. Aizomechō's head comment is the model.
- Before any geometry, write the **lot table**: for each block, what stands on each of its four edges and how deep. Check by arithmetic that depths on opposite edges do not add up to more than the block. Leftover strips need a use (a lane, a yard): name it.
- Wait for the owner's yes.

Checks: every street reaches the plot's edge; every block edge has a row; no two lots share ground; exits rise in a pavement, not in a lot or a carriageway.

## Step 3: The frame, and which way things face

Station frame: **+x east along the primary line, +z south**. The crossing line runs along z.

A piece's **face letter is the way its front looks**, and it extends the other way:

| Face | Turn | Stands on | Occupies, for building line `line`, along-street span `u … u + w`, depth `d` |
|---|---|---|---|
| `n` | none | south side of an east–west street | `[u, line, u + w, line + d]` |
| `s` | `rot: 2` | north side | `[u, line − d, u + w, line]` |
| `e` | `rot: 1` | west side of a north–south street | `[line − d, u, line, u + w]` |
| `w` | `rot: 3` | east side | `[line, u, line + d, u + w]` |

- Inside a piece's frame, work in local coordinates (front at z = 0, +z into the lot) and let `b.pt` and `b.dir` convert. Never work out by hand where local x lands in the world.
- When a turn is needed and you are not sure which, find it by trying all four and testing `b.dir`, as `turn()` in `headhouse.ts` does.
- Traffic keeps left: on an east–west street the eastbound lane is the north half.

## Step 4: Models

- One script per set, built headless (street-design.md "Making models"). Front at z = 0 facing −z, origin mid-frontage on the pavement.
- Sizes and sign places come from `mark()` and the generated `src/stations/anchors/<kind>.ts`. Never copy a number from the script into the street file by hand. A mark whose name starts with `_` carries a measurement (a doorway, a shed) for colliders.
- Render close views and look at them before placing anything (`render_views` in `buildkit.py` shows the whole row from too far to judge; render single pieces).
- Add the kind to `PROPS` and, if it stands outdoors, `OUTDOOR` in `src/render/building-models.ts`.
- After every run: `git checkout -- tools/blender/__pycache__` and delete any new `.pyc` there.
- Lit faces: small strips may be `light`; anything larger than a hand (a paper lantern, a shop window) is `windowDim` with a warm colour, or it glares white.
- **A building you walk into:** the outer model has a real opening where the door is, no plinth or step across the floor, and no inner faces (draw walls as outside faces only). Build the inside in code: inner walls just inside the model's, floor, ceiling, lights. Aizomechō's headhouse is the example.

## Step 5: Build the street in this order

The order matters: later steps look for what earlier ones placed.

1. Ground slabs, with holes for every exit well and anything cut into the street (a stream, a canal). Plot-edge blocks. `b.out.district`.
2. Road paint, then `roadKit` for the main road and the wide cross streets; then the back streets' junctions and lanes by hand; then add the back streets' stops to the kit's lanes.
3. Clear the kit's furniture out of every narrow street's mouth. Kerb rails with gaps at mouths, bus stops and the taxi stand. Trees and furniture.
4. Purpose-built fronts on the main streets.
5. The station's own quarter: landmarks, lanes, the station building.
6. Stock rows on back streets. **Place fixed things (a convenience store, a shrine) before the row filler runs over their ground.**
7. `leftovers()` for every block interior. **Push to `reserved` every patch that must stay empty** (lanes, yards, precincts, the inside of a walk-in building), or it becomes a car park.
8. Exit pylons, then the streets past the plot's edge.

Colliders, as you place each thing:

- Every model a player can reach gets a `b.block`. `piece(…, solid = true)` gives a full box; pass `false` and add your own where the piece has a passage, a yard or a doorway.
- Anything cut below the street (a stream) is blocked over its whole length except where a slab crosses, and has a rail as high as the block looks.
- A gap between buildings is either walkable (1.2 m or more, paved, reachable) or visibly closed with a board.
- Every named place is a `b.zone`, so the walk test must reach it.

## Step 6: Below ground, change as little as possible

- Keep `concourse()` and its options rather than writing a new layout. Aizomechō planned to move the concourse and did not need to: one gate end (`ends: twoEnds(…).slice(0, 1)`), a doorway in the long wall (`wallGaps`, `claims`), and a corridor, stair and lift built in its own file.
- A new way in must be a numbered exit everywhere. `exits.test.ts` wants a zone whose English name is exactly `Exit n`, on the right side of the road, and a `b.hole` matching the exit's rectangle in `exits.ts`.
- If the station does not use `surface()`, list what stands round its exits in `exits.ts` (`aizomeFeatures`).
- Stage 1 keeps the old exits where they rise. Remove them only in the stage that replaces them.

## Step 7: Check, in this order, after every stage

1. `npm run typecheck`.
2. `npm test` (the full suite: shared station code changed). `walk.test.ts` proves every zone is reachable; `exits.test.ts` proves the exits match.
3. Views in the browser with `__sim.look(id, [x, y, z], yaw, pitch)`:
   - `y` is the **floor** height (0.15 on the street), not eye height.
   - yaw 0 looks north (−z), π/2 west.
   - Set the clock with `__sim.clock.time = 21 * 3600` for the night views.
   - If a screenshot shows only a corner of the view, say so in the report rather than describing what you could not see.
4. The minimum set of views: the first street view, the main junction, the station building's door, each landmark, one lane, one view inside each walk-in building, then the door and one lane again at 21:00.
5. Report: what changed, what was looked at, **what was not looked at**. Sign-off is the owner's.

## Before reporting: go down this list

Layout and placement
- [ ] No building stands on a carriageway, a pavement exit or another building.
- [ ] Every street and lane runs to the plot's edge or to another street, and carries on past the edge.
- [ ] Every piece faces its street (check one of each face letter in a view).
- [ ] Other lines and stations in `network.ts` near the plot were checked.

Walking and colliders
- [ ] Every reachable model has a collider; nothing has a collider where nothing is drawn, except over water.
- [ ] Every gap is walkable or visibly closed; nothing stands in a lane's mouth.
- [ ] Every object stands on the ground or on a wall that is there.
- [ ] The walk test passes and every named place is a zone.

Rules (street-design.md)
- [ ] Main-street fronts are purpose-built; stock kits only on back streets and past the edge.
- [ ] No bare ground inside a block.
- [ ] A signal wherever two streets with traffic cross; junction names; road-name boards.
- [ ] Lanes at the district's density, with lamps; checked at 21:00.
- [ ] New names are invented, web-checked, and recorded in `docs/worldbuilding.md` with which were checked.
- [ ] Sources for each new kind of thing are written into `street-design.md`.

## Traps met at Aizomechō

- `tile:` paving renders much paler than its colour suggests; use `flat:` for earth or dark stone and look at it.
- Shell heredocs with quotes in them fail on this machine. Write the script to a file and run the file.
- `fillModelLots` rows need about 8 m of depth; a strip shallower than that is left empty for `leftovers()`.
- `roadKit` puts a bus stop and a taxi stand where it likes: pass `busX` and `taxiX` when a mouth or an exit is near, and give the same values to `kerbGaps`.
- A sign placed by a model anchor is in the model's frame; a hand-placed sign needs its normal turned to match.

## Still to build (not done; a later session can build these from here)

- **Street-rule tests.** A test per rebuilt station that fails with a plain message when: two building colliders overlap; a building overlaps a carriageway; a model within reach has no collider; a lane zone is narrower than 1.2 m or unreachable; a street stops short of the plot's edge; two lanes with traffic cross without a stop for each; an exit hole is not on a pavement; a free rectangle over 18 m² is left inside a block; a street has no lamp for more than 30 m.
- **Top-down plan view.** A dev command (`__sim.plan(id)`) that draws the plot from above in one image: carriageways, pavements, lanes, each building's footprint and face, exits, zones and names. To be looked at after step 5 and attached to the report.
- **Shared street composer.** The parts every hand-built street repeats (`junction`, `pack` and `row`, the mouth clearing, the kerb rails, `roadOut` and `packOut` past the edge) moved out of `tsumugibashi-street.ts` and `aizomecho-street.ts` into one module, so a new station is a table of streets, blocks and landmarks.
