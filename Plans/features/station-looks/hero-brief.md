# Brief for a hero station look

Shared instructions for whoever writes `src/stations/looks/<station-id>.ts`. The station-specific
part (the look itself) is given separately.

## Background

JapanStations is a fictional Japanese metro simulator (React Three Fiber, TypeScript). Stations
are built from axis-aligned boxes and a few meshes added to a `Builder`
(`src/world/builder.ts`). Platform halls have per-line architecture (`src/stations/themes/`).
Away from the platforms, each station has a **look**: hooks that the concourse, exit and
transfer-passage builders call. Most stations use the default look (`looks/default.ts`). A hero
station has a look of its own: finishes, ceiling, a centrepiece, shops and clutter, and themed
exits, so that you know which station you are in from the concourse alone.

The user's complaints that started this: stations are bland ("just white tiles") away from the
platform, and too open compared with real Japanese stations, which are often cramped.

## Read first, fully

- `src/stations/looks/types.ts`: `StationLook`, `ConcInfo`, `ExitInfo`, `PassageInfo`. The contract.
- `src/stations/looks/parts.ts`: the shared parts (shop fronts, kiosks, lockers, beams, ducts,
  pipes, lanterns, noren, banners, dados, posters, exit and passage helpers) and the `SHOPS`
  brand catalogue. **Use these wherever they fit**; write new geometry only for what is special
  to your station.
- `src/stations/looks/default.ts`: a complete worked example of a look. Your station should be
  at least as full as the default, and clearly different from it.
- `src/stations/build.ts` (`concourse()`, `unpaidEnd()`, `buildUnderground()`, the passage loop
  in `buildInterchange()`) and `src/stations/kit.ts` (`gateLine()`, `exit()`): what is already
  in a concourse, an exit and a passage, where, and when your hooks run.
- Your station's entry in `src/stations/specs.ts` (its platform style and its street), its row in
  `docs/station-design.md` and `docs/worldbuilding.md` (district, naming rules).
- `src/signs/content.ts` for the sign kinds you may place: `shop`, `poster`, `label`, `machine`.

## Your file

Rewrite ONLY `src/stations/looks/<station-id>.ts` (currently a stub re-exporting the default) so
it exports `look: StationLook`. Do not edit any other file: seven other agents are writing the
other hero files in the same folder at the same time. If parts.ts lacks something, build it
locally in your file and say so in your report.

A hero look should set:

- `finishes`: wall, floor, pillar and ceiling materials for the concourse, exits and passages.
- `concourse`: wall treatment, ceiling, the **centrepiece**, shops and clutter.
- `lights` and `pillar` where the theme needs its own (remember that when you define them you
  must draw all the lights / every pillar's look yourself; the kit keeps the pillar collider).
- `exit`, and `canopy` (the street entrance), so the identity starts at street level.
- `passage` at interchanges.
- `posters: false` / `skirting: false` if you place your own.

## Rules

- Materials that exist: `tile:#hex`, `panel:#hex`, `floor:#hex`, `brick:#hex`, `wood:#hex`,
  `paint:#hex`, `metal:#hex`, `flat:#hex`, `concrete`, `concreteDark`, `ceil`, `glass`,
  `glassDark`, `glassTint`, `light` (white emissive), `glow:#hex` (coloured emissive; neon and
  lanterns). Each distinct key is a cached material: keep to a modest palette.
- `b.deco` is visual only; `b.box` is visible and solid; `b.block` is an invisible collider;
  `b.mesh(mat, 'cyl'|'sphere'|'cone', cx, cy, cz, sx, sy, sz)` is visual only, vertical axis.
  Use solids only for things on the floor that a person should not walk through, only where
  `i.free()` is true, and `i.claim()` them. Everything overhead or on a wall is `deco`.
- `exit`, `canopy` and `passage` hooks are decoration only.
- Never call `b.zone`, `b.keepOut`, `b.setSpawn`, `b.hole`, `b.ramp`, `b.gate`.
- Keep every route at least 2.4 m wide: between each gate line, stair or escalator opening,
  exit doorway, the toilets, the office, and through any transfer passage (4.3 m wide: nothing
  solid in it).
- Clear height: nothing below cf + 2.3 over anywhere people walk (shop fascias and awnings
  against a wall may come down to cf + 2.2 within 1.7 m of the wall). Signs the kit hangs: over
  each gate line (cf + 2.35 … 2.85, full gate width), the toilets label, exit signs at each exit
  doorway (cf + 2.0 … 3.0), at interchanges transfer signs in the passages (pf + 2.3 … 2.8). Do
  not cover or crowd them, and leave the mural visible (end wall of each unpaid hall; at
  interchanges also the zc1 wall of each passage).
- No fake information: shop and bar signs, adverts, banners and lanterns are welcome, but
  nothing may show train times, platform numbers, prices or opening hours. No wayfinding signs
  (`guide`, `dir`, `dep`, `name`, `entrance`): the kit owns those.
- Fictional but plausible: every shop, bar, team or brand name is invented (kanji/kana + romaji),
  never a real chain or a real place. Prefer names already in `SHOPS` and the worldbuilding doc;
  list any new ones in your report so they can be recorded.
- Text on signs: `shop` and `label` signs render Japanese and English text; keep strings short.
- Budget: about 300–700 added parts for the concourse, 20–60 per exit, 60–150 per passage.
- Robustness: derive everything from the info object (cf, cw, x0, x1, ends, paid, holes,
  pillars); do not assume numbers from this brief. Things that do not fit must be skipped, not
  forced.
- Code style: match the repo (2-space indent, single quotes, short comments that say why). No
  new dependencies.

## Verify

- `npm run typecheck`: your file must be clean (errors in the other seven hero files while they
  are mid-edit are not yours).
- `npx vitest run src/stations/walk.test.ts -t "<station-id>"`: must pass. It walks the whole
  station on foot and requires every zone to be reachable.
- Do not start the dev server or use a browser; the lead does the visual check. Reason carefully
  about coordinates: for each element check where it lands, which way it faces, that it is not
  buried in a wall, floor or ceiling, and that it stays 0.005 m or more off coplanar surfaces.

## Report

What each hook draws; the centrepiece and where it stands; new names invented (ja + en);
approximate part counts; anything you could not do; anything in the hook API or parts library
that got in your way.
