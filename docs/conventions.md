# Conventions

## Workflow

- **Keep it loose.** Iterate on working things and avoid heavy process.
- **Short plan in chat for features and stations.** Give a plan of a few lines in chat, then wait for approval before building. No plan files (changed 2026-11-18; `Plans/` holds the old ones). Bug fixes and tweaks skip this step.
- **When a decision is made, update the relevant doc** in `docs/`, so the docs don't drift from reality.
- **Custom skills:** once a workflow has been repeated two or three times (adding a station, adding a line), turn it into a project skill in `.claude/skills/`. Planned skills: `new-station`, `new-line`.

## Commands

```bash
npm run dev        # http://localhost:5173
npm test           # must pass before a change is called done
npm run typecheck
npm run build
```

## Code

- TypeScript with strict mode
- File names: `kebab-case.ts`, components `PascalCase.tsx`
- Station and line IDs: lowercase ASCII slugs (`tsumugibashi`), with no macrons in IDs
- `sim/`, `data/`, `world/`, `stations/`, `signs/content.ts` and `trains/car.ts` must not import three.js or touch the DOM: they run in tests.
- Materials are named by string key (`tile:#24407a`, `glass`, …) and resolved in `render/materials.ts`. Add new finishes there: a procedural pattern in `render/textures.ts`, or a CC0 scan recorded in `docs/references.md`. The finish table is in `docs/station-design.md`.
- Decoration must not change collision: use `deco` / `mesh` for looks and `block` for the collider, so the walk test keeps meaning what it says.
- Sign text never lives in a component. Add a `SignContent` variant and draw it in `signs/draw.ts`.

## Coordinates

- World: metres, **x east, z south, y up**, street level 0.
- Station frame: **+x along the line towards the last stop**, +z to the right of that. Car frame: the same, with y = 0 at rail level.
- Camera yaw 0 looks down −z; positive turns left.

## Adding a station

1. Add a `StationDef` to `STATIONS` in `src/data/network.ts`. Its `position` must be on the line's alignment, on straight track, at least 400 m from its neighbours.
2. Insert its id into the line's `stops` and its rail level into `railY`.
3. Add a spec to `src/stations/specs.ts`.
4. **Give it a layout and a theme of its own** (standing rule, user, 2026-11-18). Every new station is a hero station; none falls back to the default look.
   - *Layout:* an arrangement no existing station has: a different platform form (island, side, stacked, split-level, offset), concourse shape or level, gate and exit placement, or circulation (mezzanine, sunken court, long passage). Changing only the finishes or the exit count doesn't count. If no composer can build it, extend one or add one (listed in "Layouts implemented" in station-design.md).
   - *Theme:* a `StationLook` of its own, `looks/<station-id>.ts`, with a concept and a centrepiece drawn from the station's name or district, following the hero brief. Its palette and centrepiece must not repeat another hero's.
   - Propose both in a short plan in chat and get approval before building. Add the row to the hero table in station-design.md, and to "Layouts implemented" if the layout is new.
5. `npm test`. The sim tests check the geometry; the walk test checks you can reach every part of it.

Signs, the map, departure boards and the timetable pick it up automatically.

## Adding a line

1. Add a `LineDef` to `LINES` with an alignment, stops, rail levels and a service pattern. Leave 290 m of track beyond each terminus for the turnback siding.
2. Add its stations as above. A station shared with another line needs the lines to cross at right angles there, 7.5 m apart in depth, and uses `kind: 'interchange'` with `primary` set to the upper line. That composer needs side platforms above and an island below; any other pairing needs its own composer, as the hub has. A line that runs **beside** another at a station (the Shiokaze Line at Kita-Ōdōri) gets its own platform centre in `StationDef.at` and needs a composer that builds both halls.
3. Lines crossing **between** stations need at least 7 m between rail levels there; `npm test` finds every such crossing.
4. Give the map positions (`diagram`) for the new stations, then look at the map: interchange badges (`badges`) and labels can land on another line.
5. **Give it an era and a theme of its own** (standing rule, user, 2026-11-18). Every new line gets an invented opening year and a platform architecture no other line has: its own ceiling, pillars, lighting, wall motif (drawn from the line's name) and benches. Propose the era and theme in the line's plan, then write `src/stations/themes/<id>.ts`, register it in `themes/index.ts`, give the theme a subtle `grade`, and add the row to "Line themes" in station-design.md and the opening year to worldbuilding.md. Add the line to `BOARD` in `src/signs/board-style.ts` too: `led` for a line opened before 2000, `lcd` after, with the same opening year as its theme (a test checks).

## Text

- Display romaji uses macrons (Ō, ū). IDs and file names never do.
- Japanese text is stored as UTF-8 in data files, not escaped.
- UI and signs are bilingual: Japanese first and larger, English second.

## The train model

One fictional series, modelled once: a middle car and a cab car (the cab car is turned round for the other end). The line colour is applied at load time.

- The model is generated by `tools/blender/build_metro_car.py`. Change the script, not the `.blend` by hand, or the next rebuild loses the edit:

  ```bash
  blender --background --python tools/blender/build_metro_car.py -- --renders <dir>
  ```

  It writes `assets/trains/metro-car.blend` (to look at) and `public/models/metro-car.glb` (what the game loads). `--renders` is optional and saves preview images.
- The script works in the car frame (x along, y up from rail level, z right) and its constants mirror `src/trains/car.ts`. Doors, floor, seats and the cab partition are colliders there: move them in both places or not at all.
- Material names in the model are material keys (`metal:#d4d8db`, `glassTint`, …) plus `LINE` and `SEAT` for the line colour. Objects named `*_int` are the saloon; `*_ext` follow tunnel, station and daylight lighting.
- Door leaves, the LCDs over the doors, destination displays and head/tail lamps are not in the model. They stay in code so they keep moving and reading the timetable.
