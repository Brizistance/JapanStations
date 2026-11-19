# Brief: re-fitting a station look to the new layout

Shared instructions for whoever re-fits `src/stations/looks/<station-id>.ts`. The
station-specific notes are given separately.

## What changed under your look

Your station's look was written for an open concourse hall. The station layouts have since been
rebuilt (see `Plans/features/station-layouts/plan.md`):

- **Walled stairwells.** Every stair and escalator opening is now enclosed by full-height walls
  on three sides, entered through a **portal** (jambs and a fascia at cf + 2.35 to the ceiling,
  in the line colour; white for a transfer stair). The platform sign is mounted on the fascia.
- **Interchanges are corridors.** An interchange concourse is no longer a 28 m hall. It is a
  **spine** 16 to 18 m wide (`i.cw` is now the spine half width, 8 or 8.9), and the transfer
  stairs are in **transfer bays**: walled rooms entered through a mouth in the spine wall.
  Tsumugibashi also has a second spine for the Kikyō Line and three cross passages. Exits are
  reached by longer exit corridors (`ExitInfo.ext` is 5 to 6 m, 22 m at Tsumugibashi).
- **Floor guidance.** Line-colour bands, yellow tactile paths and floor decals now run over the
  floor from the gates to every portal. They are laid before your hooks run and their floor is
  `claim`ed.
- **Wayfinding** signs were re-fitted: headers on portal fascias, signs over every bay mouth
  and cross passage, signs inside rooms.

## Read first

- `Plans/features/station-looks/hero-brief.md`: the original rules for a look. They all still
  apply (materials, solids only on `free()` floor and `claim`ed, decoration is cut back from
  signs by `Builder.guard`, no fake information, no wayfinding signs, routes 2.4 m, clear
  height 2.3 m).
- `src/stations/looks/types.ts`, all of it. New on `ConcInfo`: `cw` (spine half width),
  `footprint` (the old outer wall), `openings` (exit doorways and room mouths), `rooms`
  (`ConcRoom`: kind, rect, mouths, stairs, `faces`), `stairwells` (walls, footprint, portal),
  `toilets`. New hook `StationLook.bay?(r: RoomInfo)`: decoration only, called once per room.
- `src/stations/looks/parts.ts`: new helpers `faceDado`, `facePosters`, `dressFace`,
  `stairwellFaces`, `serviceDoor`, `shutter`, `ventGrille`, `hoseCabinet`, `meterCupboard`,
  `STAFF_ROOMS`; `doorways()` now returns every opening; `toiletX()` returns `i.toilets`.
- `src/stations/looks/default.ts`: a worked example of a look on the new layout (spine
  frontage, stairwell walls, `bay`).
- `src/stations/build.ts` `concourse()` and `src/stations/rooms.ts`: what is built, what
  `free()` now refuses (stairwell footprints plus 0.3 m, 2.5 m in front of each room mouth,
  the floor under bands, tactile paths and hanging signs).
- Your own look file, all of it.

## Your job

Edit ONLY your station's look file. Keep the station's theme, centrepiece and invented names;
re-lay them on the new layout so that nothing is lost, hidden, cut in half or floating.

1. **Find what broke.** Write a throwaway script (under `src/` temporarily, deleted before you
   finish; import `src/stations/index` first because of an import-order cycle) that builds
   your station and prints an ASCII plan at 1 m per character: spine, rooms, walls, stairwells,
   portals, mouths, gates, exits, floor guidance, and everything your look places. List which
   of your features no longer appear, which sit inside or against a stairwell wall, which
   cross a portal approach or a mouth, and which overhead things now pass through walls.
2. **Stairwells.** Nothing of yours may be inside a stairwell footprint, on its portal (jambs,
   fascia) or within 3 m in front of the opening. Things that used to hang over or beside the
   open stair (lights along its edges, strings across it, charms over it) must move or go.
   Dress the stairwell's blank outer walls in your station's finishes (`stairwellFaces` gives
   the faces; `dressFace` or your own treatment).
3. **Overhead runs** (beams, pipes, strings, pennants, cloth, lantern rows) must stop at
   stairwell walls and room walls instead of passing through them.
4. **Floor.** Keep floor-level decoration (inlays, painted lanes, floor motifs) off the bands,
   tactile paths and decals: do not lay anything between cf and cf + 0.015 where `free()` is
   false, and prefer to drop floor patterns in the walking lanes altogether. If your theme had
   a floor feature there, move it to a wall, the ceiling, or a claimed island.
5. **Interchanges only.** The spine walls are your shop frontage now: line them (the user wants
   corridors faced with shop fronts and service doors, not blank walls). Re-place your
   centrepiece where the spine allows, keeping 2.4 m routes both sides. Add a `bay` hook that
   carries the theme into each transfer bay and cross passage (decoration only; keep mouths
   and portals clear). Longer exit corridors: check your `exit` hook against `e.ext`.
6. Leave alone what still works.

## Verify

- `npm run typecheck`: your file clean (errors in other look files being edited at the same
  time are not yours).
- `npx vitest run src/stations/walk.test.ts -t "<station-id>"` passes.
- Your script asserts: nothing you place overlaps a stairwell footprint, a portal's 3 m
  approach, a room mouth, a gate line or an exit doorway; no solid of yours sits on floor that
  `free()` refuses; no overhead box of yours intersects a stairwell or room wall box.
- Delete the script. Do not start the dev server or a browser; the lead does the visual check.

## Report

What no longer fitted and what you did about each; what the look now places in the spine, on
stairwell walls, in rooms and in exits; anything from the original look that had to be dropped;
part counts; anything in the new interface that got in your way.
