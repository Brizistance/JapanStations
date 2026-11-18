# Wayfinding, and closing up the wide interchanges

## Goal

1. Away from the platforms a passenger gets almost no guidance: a header over the gates, a yellow
   sign at each exit doorway, a toilets label. Add the signs a Japanese station has.
2. Interchange concourses are still wide open, Tsumugibashi most of all (about 60 × 90 m,
   because three lines meet there). Close them up.

Decisions (user, 2026-11-18): overhead direction signs, yellow exit boards, maps and facility
signs (no floor lines); exit boards say what is near each exit, **derived from what is actually
built at street level**; Tsumugibashi becomes an underground shopping street (the ninth hero);
every other interchange gets shop islands and denser pillars.

## 1. Wayfinding

All of it is generated from data, like the existing signs. Nothing is typed in by hand per
station, so it cannot go stale or show something that is not there.

| Sign | Where | Says |
|---|---|---|
| Overhead platform signs | Hanging at the top of every stair and escalator in the paid area | Line badge, platform numbers, "for <terminus>" (both directions for an island) |
| Overhead transfer signs | At the transfer stairs and along the route to them | "Transfer: <line>" with its badge |
| Overhead exit signs | In the paid area pointing to each gate line; in each unpaid hall pointing to its exits | 出口 Exit, the exit numbers that way, arrow |
| Yellow exit board (出口案内) | By each gate line on the unpaid side, and one inside the gates | Every exit number with what is near it |
| Exit doorway sign | At each exit (exists today: number only) | Number plus the nearest landmark |
| Station map (構内図) | Near the gates | Levels of the station: concourse, each line's platforms and numbers, exits |
| Area map (周辺図) | Unpaid hall | Schematic of the streets above with the exits marked |
| Facility pictograms | At the thing itself and on overhead signs | Toilets, lift, lockers, tickets, station office |

- **Exit landmarks** come from each station's street spec: named parks, arcades and canal
  bridges, and what stands on each side (campus, dome, quay, promenade, shops, housing). A new
  `src/stations/exits.ts` works out, for each exit number, which side of the street it surfaces
  on and what is there. A test checks it against the exits the 3D build really has.
- **Signs always win.** A station look hangs beams, pennants, lanterns and cloth from the same
  ceiling. Rather than teach every look where the signs are, the builder protects the space
  round each wayfinding sign and cuts any decoration that intrudes.
- The composers tell the concourse which stair leads to which line and platforms (today it only
  knows there are holes in the floor).

Scope: ordinary underground stations and interchanges (concourse, exits, transfer passages).
The hub keeps its own signage; elevated stations are left for a later pass.

## 2. Closing up the interchanges

- **More pillars**: a wide concourse gets pillar rows across its width (about every 7 m), not
  just the two rows beside the stairs. Real structure for a wide span.
- **Shop islands** (default look): blocks of back-to-back shops down the middle of any concourse
  28 m or wider, sized to the free floor, leaving aisles of 3 m or more.
- **Tsumugibashi, the ninth hero: 紬橋 underground shopping street.** The hall is cut into named
  "streets" by blocks of shops; a weaving theme from the silk district (warp-and-weft ceiling
  bands, bolts of cloth, a loom as the centrepiece); street name signs at the crossings.

## Approach

1. **By hand first**: sign kinds and a stub for the exit data; stair and exit information passed
   into the concourse; the protect-and-cut mechanism in the builder; extra pillar rows.
2. **Four subagents in parallel**, one file set each:
   - sign drawing (exit board, pictograms, station map, area map) and the exit-landmark data;
   - wayfinding placement (`src/stations/wayfinding.ts`);
   - shop islands in the default look and parts library;
   - the Tsumugibashi look.
3. Tests, typecheck, build, then a browser walk: follow the signs from a street entrance to a
   platform and across a transfer.

## Done

- Standing anywhere in a concourse you can see a sign telling you where the platforms and the
  exits are; every exit board matches the street above.
- No interchange concourse has a clear view from one side wall to the other.
- `npm test` (all zones reachable; exit data matches the build), typecheck and build pass.
- `docs/station-design.md`, `docs/network.md` if the data format changes, `docs/worldbuilding.md`.
