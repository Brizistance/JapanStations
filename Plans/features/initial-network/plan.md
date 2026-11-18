# Initial playable network

**Status:** built (2026-11-18). Written alongside the work rather than before it: the request asked for a working implementation in one pass, which stood in for the usual approval step.

## Goal

A playable foundation: two connected lines, a handful of distinct stations, a main menu with an interactive map and teleport, first-person exploration, and trains that run to a timetable and can be ridden.

## Approach

- Network as typed data; everything else derived from it.
- Trains as a closed-form function of the clock, so boards and trains cannot disagree.
- Stations generated from reusable kits + a small per-station spec, so nine stations did not need nine hand-built scenes.
- Hand-written collision in per-object local frames, so riding a moving train is stable without a physics engine.

## Decisions made here

- City: Kawaminato. Operator: Kawaminato Metro. Lines: Yanagisuji (Y), Nagisa (N). See docs/worldbuilding.md.
- One platform type per line (island on Y, side on N). See docs/network.md.
- Terminal turnback via a siding and crossover beyond each terminus.
- No drei, no rapier, no asset files. See docs/architecture.md.

## Done means

- [x] `npm test` passes (timetable + walkability of every station).
- [x] Menu → map → teleport to any station.
- [x] Walk street ↔ concourse ↔ platforms, and between lines at the interchange.
- [x] Board a train, ride to the next station, doors open.
- [x] Boards, in-car displays, HUD and map agree with the trains.

## Open questions / next

- Audio (door chimes, announcements, departure melodies).
- Mixed platform types on one line.
- Passengers, rush-hour patterns, first/last trains.
- Per-station plans for any future hero station.
