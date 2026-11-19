# Station layouts: corridors, walled stairwells, floor guidance

## Goal

At Kawaminato-kō (Nagisa and Kikyō) the concourse was one 28 × 90 m rectangle with the stair
openings sitting in open floor behind knee-high glass rails. Platform stairs and transfer stairs
sat side by side and looked alike, and once through the gates nothing led you anywhere. The signs
and shop islands of the last round did not fix the shape. The problems to fix, in the user's
words: stairs are just holes; the hall is too wide and shapeless; transfers are confusing; the
way from the gates to the stairs is unclear.

## Decisions (user, 2026-11-18)

- **Walled stairwells everywhere** underground: full-height walls on three sides and a portal at
  the head, in the line's colour.
- **Corridors, not a hall**, at the seven interchanges (Kawaminato-kō, Watayamachi, Midorizaka,
  Aizomechō, Daigaku-mae, Tōmyōbori, Tsumugibashi): a central spine with side bays. Ordinary
  stations keep their footprint and get stairwells and floor guidance only.
- Behind the new walls: shop fronts and service doors, not enterable.
- The existing looks and wayfinding are reworked to fit, not dropped.
- Floor guidance: line-colour bands, tactile paths, floor arrows with platform numbers. No yellow
  exit band.

## Design

### 1. An interchange is a narrow station plus rooms

An ordinary station's concourse is already a corridor (16 to 24 m wide, stairs on its axis or
along its walls, exits reached by corridors when it is narrow). An interchange concourse becomes
the same thing, the **spine**, and the stairs that do not fit in it get **rooms** of their own.

| Primary line | Spine half width | Platform stairs | Transfer stairs |
|---|---|---|---|
| Side platforms (Nagisa: Kawaminato-kō, Aizomechō, Daigaku-mae, Tsumugibashi) | 8.9 m: the long walls stand just outside the stairs' outer rails, so the stairs run along them | In the spine | A bay outside each wall; its mouth starts just past the platform stair's head (x 14.75 to 19.65) |
| Island (Yanagisuji Midorizaka, Kikyō Watayamachi, Shiokaze Tōmyōbori) | 8 m | On the axis | A bay outside each wall, mouth beside the stair head (x 12.5 to 17.4) |

- The spine width comes from the primary's own stair openings (outermost rail plus 0.2 m, at
  least 8 m). Everything the kit does by width (gates, office, machines, pillars, look hooks,
  wayfinding) then works as at an ordinary station: seven gates over side platforms, five over an
  island.
- **The exits do not move.** The structure keeps its old width (14 m, about 31 m at
  Tsumugibashi), and each exit is reached by a corridor across it (`exit(..., ext)`), 5 to 6 m
  long (22 m at Tsumugibashi). `exits.ts` and its test are unchanged.
- **Transfer bay**: a walled room holding one transfer stair and a lobby at its head, entered
  through a mouth in the spine wall. The bay's walls are the stairwell; its portal is white with a
  line-colour stripe, so it never reads as a platform stair.
- **Tsumugibashi** (Kikyō beside Nagisa, 16.8 m to +z): the Nagisa spine, a second spine over the
  Kikyō hall (11 m wide, closed at both ends, the Kikyō stairwells on its axis) and three cross
  passages 5 m wide joining them inside the paid area (x about ±22 and 0). Gates stay on the
  Nagisa spine. The −z transfer bay opens off the Nagisa spine, the +z one off the Kikyō spine.
- What lies between the walkable rooms and the old outer wall is structure: the slab and ceiling
  still span it (the slab roofs the platform halls below), but it has no finished floor and no
  way in.
- The kiosk in the middle of the paid area stays over side platforms and goes over an island,
  where the stairs are on the axis.

### 2. Walled stairwells (every underground station except the hub)

For each stair opening: solid walls floor to ceiling just outside the glass rails, on both long
sides and the closed end, and at the head a portal (two jambs and a fascia from 2.35 m up to the
ceiling) leaving the opening clear. A side within 2.4 m of a concourse wall uses that wall, and
the strip between is closed off. Two stairwells back to back are joined. The walls are kept free
of the look's parts. Island stations' pillar rows move out to 4.9 m in a 16 m concourse, so the
aisle beside a stairwell stays 2.4 m wide; side-platform stations whose stairs filled the
toilets' place get their toilets moved along the wall.

### 3. Floor guidance (`src/stations/floor.ts`)

Generated from the concourse's stairs, stairwells, openings and rooms, the exits and passages:

- Line bands: a 0.3 m band in each line's colour from each gate line along the spine, one lane per
  line, turning into that line's stairwell or transfer bay; continued along transfer passages.
- Tactile paths: guidance bars from each exit doorway through a gate to each stair head, warning
  squares at junctions and stair heads.
- Floor arrows with the line badge and platform numbers at each decision point and in front of
  each stairwell (new sign kind `floormark`).

### 4. What the looks and signs are told

`ConcInfo` gains `openings` (every gap in the spine's long walls), `rooms` (each with its rect,
mouths, stairs and dressable wall faces), `stairwells` (walls and portal with its fascia face),
`footprint` and `toilets`; `cw` is now the spine's half width. A look gets a `bay(room)` hook for
decorating rooms. `parts.ts` `doorways()` returns every opening, so dados, shops and posters skip
room mouths.

## Who does what

| Phase | Work | Files |
|---|---|---|
| A1 Structure (done) | Spine and rooms, Tsumugibashi's two spines, stairwells and portals, the new `ConcInfo` fields, the `bay` hook, call sites and stubs for floor guidance | `build.ts`, `rooms.ts` (new), `kit.ts`, `looks/types.ts`, `parts.ts` (`doorways` only), `floor.ts` (stub), `signs/content.ts`, `signs/draw.ts` (placeholder) |
| B1 Floor guidance | Line bands, tactile paths, floor arrows | `floor.ts`, `signs/draw.ts`, `signs/content.ts`, `signs/boards.test.ts` |
| B2 Wayfinding | Portal headers, transfer bay signs, cross passage signs, wall boards on the spine walls | `wayfinding.ts` |
| B3 Default look | Narrow spines instead of wide halls, `bay` decoration, service doors and shutters on wall runs | `looks/default.ts`, `looks/parts.ts` |
| C1 to C9 Hero looks | Each hero station re-fitted to its spine, rooms and stairwells | `looks/<station>.ts` |
| D1 Docs | Layouts, size by era, stairwells, floor guidance | `docs/station-design.md`, `docs/worldbuilding.md`, `CLAUDE.md` |

## Done when

- `npm run typecheck`, `npm test` (every zone reachable in all 44 stations, tracks not; exits
  unchanged; boards) and `npm run build` pass.
- From every gate there is a route at least 2.4 m wide to every stairwell portal, room mouth and
  exit; every stair head has 3 m clear in front; no void is visible through any gap.
- In the browser: at Kawaminato-kō the stairs are walled portals and the transfer bay is distinct;
  gate to platform and platform to transfer at Aizomechō, Midorizaka and Tsumugibashi can be
  walked by following the floor bands and signs.
