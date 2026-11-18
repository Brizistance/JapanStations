# Conventions

## Workflow

- **Keep it loose.** Iterate on working things and avoid heavy process.
- **Plan docs for features and stations only.** Write `Plans/<area>/<name>/plan.md` (for example `Plans/stations/kitahama-bashi/plan.md` or `Plans/features/route-diagram/plan.md`), then wait for approval before building. Bug fixes and tweaks skip this step.
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
3. Add a spec to `src/stations/specs.ts` (copy a similar station).
4. `npm test`. The sim tests check the geometry; the walk test checks you can reach every part of it.

Signs, the map, departure boards and the timetable pick it up automatically.

## Adding a line

1. Add a `LineDef` to `LINES` with an alignment, stops, rail levels and a service pattern. Leave 290 m of track beyond each terminus for the turnback siding.
2. Add its stations as above. A station shared with another line needs the lines to cross at right angles there, and uses `kind: 'interchange'`.
3. Give the map positions (`diagram`) for the new stations.

## Text

- Display romaji uses macrons (Ō, ū). IDs and file names never do.
- Japanese text is stored as UTF-8 in data files, not escaped.
- UI and signs are bilingual: Japanese first and larger, English second.
