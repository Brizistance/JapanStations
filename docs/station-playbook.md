# Station rebuild playbook

The fixed procedure for rebuilding a station's outside and its way in, written after Aizomechō (2026-11-22). Follow the steps in order. The rules for what a street must contain are in [street-design.md](street-design.md); this file is how to build one without the mistakes that cost the owner extra rounds.

Worked example throughout: Aizomechō. Its files are `src/stations/aizomecho-street.ts`, `src/stations/headhouse.ts`, `tools/blender/build_aizome.py` and `tools/blender/build_aizomefront.py`. Open them when a step says "as at Aizomechō"; do not open other stations' files.

## The three mistakes this is here to stop

1. **Layout and placement:** buildings on roads or on each other, pieces facing the wrong way, exits coming up in the wrong place, streets stopping short.
2. **Walking and colliders:** blocked lanes, invisible walls, models with no collider, floating objects.
3. **Rules skipped:** plain boxes, bare ground, no lanes, no signals, dark streets at night, stock kits on main streets.

Each step below ends with the checks that catch them. Do the checks before moving on, not at the end.

## The order of work (owner's rule, decided 2026-11-24)

This order overrides any step below that reads differently.

1. **First question: redo the entire area, or not?** Ask before anything else.
   - **No:** the outside stays. Ask which parts change and touch only those, with the checks below.
   - **Yes:** carry on from 2. The outside is started from scratch.
2. **Measure** (step 1), including the edges shared with neighbouring stations.
3. **Theme** (asked in the same card as the first question, before measuring). Propose three real Japanese districts or area types that fit the station's place in the city and its neighbours, one recommended. The owner picks or names another.
4. **Second question: rebuild the whole station, or modify it?** Station means the building, exits, concourse and platforms. Modify follows step 6.
5. **Plan in chat, the owner's yes, the auditor on the plan.**
6. **Clear the outside.** Remove every street, building and piece of furniture in the plot, down to bare ground. Keep the exits where they rise until the stage that replaces them, so the tests still pass.
7. **Stage 1, the station:** build or rebuild it. Stop; the owner walks it.
8. **Stage 2, the street layout and the landmarks only:** ground, roads, junctions, pavements, kerbs, crossings, signals, lights, the joins at every edge, and the landmarks on their lots. Every other lot stays bare. Stop; the owner walks it.
9. **Stage 3, the fill:** purpose-built fronts, stock rows and `leftovers()` on the remaining lots. Stop; the owner walks it.

**A Japanese layout.** The street plan must be one Japan would have for the chosen theme: its block sizes, street widths and hierarchy (arterial, shopping street, back lanes), where the station sits in it, shrine and temple lots, arcades, rail-side strips. Take it from the real district the theme names, and say in the plan what was taken. No generic grid.

**Research first (decided 2026-11-24).** Once the theme is picked, look up the real district it names (maps and photos) and take measured numbers from it: block sizes, street widths, lot frontages, where the station sits. The plan cites them. Take proportions and patterns only; never a real name (CLAUDE.md rule 1).

**Normal Japanese sizes.** Check every plan against this table; a number outside it needs a reason from the research. Existing rules in street-design.md (the 6.5 m small street) stand.

| Thing | Normal size |
|---|---|
| Arterial (4–6 lanes) | 25–40 m between building lines, pavements 3.5–6 m |
| Two-lane local or shopping street | 8–12 m, pavements 1.5–2.5 m or a painted side strip |
| Small street | 5–6.5 m, no kerb, painted side lines |
| Back lane, alley | 2.7–4 m; footpath alleys down to 1.2–1.8 m |
| Covered arcade (shōtengai) | 6–8 m wide, shop frontages 4–6 m |
| Traffic lane | 3–3.25 m (2.75 m on small streets) |
| Block | 40–70 m × 80–120 m in a planned grid; smaller and irregular in old quarters |
| Shop or house lot | frontage 4–8 m, depth 12–20 m |
| Mid-rise (pencil building) lot | frontage 6–12 m, depth 15–25 m |
| Large lot (department store, tower) | 30–60 m a side, on the arterial or the station square |

**Height and use fall away from the station.** Tall commercial on the arterial and by the station; mid-rise mixed use one street back; low houses, small shops and workshops in the lanes. No tower in a lane, no house on the arterial.

**Irregular on purpose.** Each plan names at least three: a bent or dead-end lane, an odd-shaped or flag lot, a pocket park, a coin car park, a gap site, a building plainly older or newer than its row.

**What every station area has.** The plan ticks off, or says why not: a convenience store, a kōban, bicycle parking, a clinic or pharmacy, a bank or post office, vending machines, and somewhere to eat by the exits.

**A top-down map before the yes.** With the plan in chat, show a simple 2D map (drawn with the visualize tool until `__sim.plan` exists): streets with widths, lots, landmarks, exits, and the neighbours' streets at each edge. The owner approves the picture.

**Record the theme.** After the yes, add one line for the station to [worldbuilding.md](worldbuilding.md): its theme, the district it takes after, its landmarks.

**A top-down view in every stage report**, of the whole area, beside the walking views.

**Two tracks: light and full (decided 2026-11-24).** Round 1 also asks which track, with a recommendation: full for hero stations, interchanges and any station getting a walk-in building or a new theme; light for the rest. The owner's answer decides.

- **Full:** everything in this file.
- **Light:** no fresh research (use the sizes table and [theme-notes.md](theme-notes.md); if the theme has no notes yet, research it once and save them). One question card: round 2's questions join round 1. When the station is only being modified, stages 1 and 2 are built and walked together, so there are two stops, not three.
- **On both tracks, never skipped:** measuring, the edges, the top-down map before the yes, the tests, the top-down view in each report.

**Theme notes.** The first time a theme is researched, save what was measured in [theme-notes.md](theme-notes.md): block sizes, street widths, lot frontages, layout patterns, typical buildings. Later stations with that theme read its section instead of researching again, and add only what is new.

**Two interview rounds (decided 2026-11-24).** Round 1, one card: entire area or not, and the theme. Then research. Round 2, one card: whole station or modify, the station building, the landmarks, each with a recommendation from the research. No other question rounds unless something blocks.

**Check the library first.** Before making a model, look in [model-library.md](model-library.md) for a set that fits the theme. New regular buildings are generic: named and built by theme, no station name or station-specific signs in the model; only landmarks are station-specific. Add each new set to the library.

**Auditor runs:** on the plan, after stage 1 and after stage 2. Stage 3 is checked by the overlap tests instead; until those tests exist, the auditor runs on stage 3 too.

**New models are allowed.** Where the kit in `assets/buildings` has nothing that fits the theme or a lot's shape, make new models for it (step 4), for landmarks and for regular buildings alike, rather than forcing a stock piece. List the new sets in the plan.

**Edges.** The area must join its neighbours: every street that reaches a shared edge meets the neighbour's street with the same centre line, width, pavement and lanes, and building heights and types step across the edge rather than jump. The neighbour's outer row (road ends, edge buildings) may be changed to make the two sides meet; list those changes in the plan first. Nothing deeper in the neighbour's plot changes.

## Step 1: Measure before you plan

Never plan from memory of another station. Get the numbers from the built station.

- **Exits and levels.** Write a throwaway test in `src/stations/` that finds the station in `STATION_WORLDS` and writes `build.holes`, `build.plot`, `build.zones` and `spawn` to a file (vitest hides `console.log`). Delete it afterwards. At Aizomechō this gave the exit holes (x ±43 … 52.6, z ±15.2 … 18), the concourse floor (−6.2) and the platform extents.
- **The building line.** The exits fix it: the street builder is passed `cw`, and the line is `cw + 5.5`. Throw if it moves, as `aizomeStreet` does.
- **Water in the plot.** Sample `isWater` (`src/data/geography.ts`) over the whole planned plot on a 4 m grid, and read the `Channel` list for any canal within 200 m. Watayamachi missed a 14 m canal with a 20 × 40 m grid; `geography.test.ts` caught it only after the plot grew.
- **Other lines through the plot.** Check `src/data/network.ts` for every line and station within 200 m, including ones not in 3D yet, and work out where they fall in the station frame. Aizomechō missed this: the planned AR line crosses the dyers' quarter, found only in stage 3.
- **The edges.** For each neighbouring station whose outside touches or faces this plot, grep its street file for the streets that reach the shared edge and note each one's centre line, half width, pavement and lanes, and the heights and kinds of its edge buildings. Read only those ranges.

## Step 2: Interview, then a plan with coordinates

- Ask the owner first (street-design.md rule 17 and "How to work"), in the order given in "The order of work": entire area or not, the theme (three proposals), whole station or modify, then the station building and the landmarks. Give a recommended answer to each question.
- The plan lists every street that reaches an edge with the neighbour's street it meets, and any change to a neighbour's outer row.
- Then write the plan as the **head comment of the street file**: every street with its centre line, half width, pavement and name; every landmark with its lot. Aizomechō's head comment is the model.
- Before any geometry, write the **lot table**: for each block, what stands on each of its four edges and how deep. Check by arithmetic that depths on opposite edges do not add up to more than the block. Leftover strips need a use (a lane, a yard): name it.
- Wait for the owner's yes.

Checks: every street reaches the plot's edge and lines up with the neighbour's street there; every block edge has a row; no two lots share ground; exits rise in a pavement, not in a lot or a carriageway.

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

The order matters: later steps look for what earlier ones placed. By stage: **stage 2** is items 1–3, the landmarks and the station's quarter from 5, and 8; **stage 3** is items 4, 6 and 7. In stage 2 the lots still to be filled are bare ground, not car parks: do not run `leftovers()` yet.

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

This step is for when the owner chose to modify the station. If they chose a whole rebuild, the layout is new (CLAUDE.md rules 8 and 9), but the exit and zone rules below still hold.

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
4. The minimum set of views: one view along each street that crosses an edge into a neighbour, the first street view, the main junction, the station building's door, each landmark, one lane, one view inside each walk-in building, then the door and one lane again at 21:00.
5. Report: what changed, what was looked at, **what was not looked at**. Sign-off is the owner's.

## Before reporting: go down this list

As clean as Aizomechō (the owner's bar for every station, 2026-11-25; walk Aizomechō to compare)
- [ ] Nothing is filler: every building and street is there for a reason that fits the place, not stock rows packed in to cover ground.
- [ ] The layout reads at a glance: clear streets, consistent building lines, heights that step down sensibly, an obvious edge to the town.
- [ ] The build is tidy: no floating pieces, gaps, overlaps, clipped signs or odd joins where things meet.
- [ ] Past the plot's edge is calm: low-key and plausible, not a wall of busy buildings.

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

Decided 2026-11-24: the edge-join test, the overlap tests and the top-down view are built as the first step of the next station redesign, before its stage 1.

**Built 2026-11-24 (Watayamachi, after its stage 1):** the first three below. A rebuilt station declares its streets as a table (`StreetPlan` in `src/stations/street-plan.ts`, with the stage that is built); `street-rules.test.ts` holds the build to it and to its neighbours' tables at shared edges; `__sim.plan(id)` (`src/dev/plan.ts`) draws the build and the table from above, with broken rules in red. Not checked yet: a model within reach with no collider when it is not a building (only buildings are), and lanes that are unreachable (the walk test covers named zones). The shared street composer is still to build.

- **Edge-join test.** Fails when a street reaching a shared edge does not meet the neighbour's street with the same centre line and width.
- **Street-rule tests.** A test per rebuilt station that fails with a plain message when: two building colliders overlap; a building overlaps a carriageway or an exit; a model within reach has no collider; a lane zone is narrower than 1.2 m or unreachable; a street stops short of the plot's edge; two lanes with traffic cross without a stop for each; an exit hole is not on a pavement; a free rectangle over 18 m² is left inside a block; a street has no lamp for more than 30 m.
- **Top-down plan view.** A dev command (`__sim.plan(id)`) that draws the plot from above in one image: carriageways, pavements, lanes, each building's footprint and face, exits, zones and names. To be looked at after step 5 and attached to the report.
- **Shared street composer.** The parts every hand-built street repeats (`junction`, `pack` and `row`, the mouth clearing, the kerb rails, `roadOut` and `packOut` past the edge) moved out of `tsumugibashi-street.ts` and `aizomecho-street.ts` into one module, so a new station is a table of streets, blocks and landmarks.
