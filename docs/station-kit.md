# The station kit: goals and how to bring it to more stations

The owner's rules for using the modelled kit (fittings, shops, street places, road furniture) at stations beyond Kita-Ōdōri and Tsumugibashi. Interview of 2026-11-20. Details of each part live in [station-design.md](station-design.md) and [street-design.md](street-design.md); this file says what the kit is for and how to roll it out.

## Goal

**Each station should feel like a real place.** Believability comes first: a thing stands where it would in Japan, even if that means fewer things. Looking rich and being fun to explore matter, but when they conflict with believability, believability wins.

## Rollout

- **One station at a time, with its own redesign.** A station gets the full outside kit only when its street is redesigned together with the owner. No automatic pass over all stations.
- **Inside defaults are already everywhere.** Platform and concourse fittings come from shared code and need no per-station work.
- **Rules place, the owner picks the specials.** Rules handle fittings, signals, wall fills and shop presets. For each station the owner chooses its landmark, its street places, which shops can be entered, and its theme. Ask before building; give a short plan and wait for a yes.

## What every station must have (the minimum)

1. **Platform and concourse defaults:** queue marks, boards, era fittings, gates, toilets where the ground allows.
2. **The road kit on its street:** signals, lamps by environment, signs, kerb furniture, utility poles and wires in residential areas.
3. **One place to buy something** by the exits: a konbini, or at least a vending corner.
4. **No plain boxes in view** of the exits: every building in sight is a model.

## How stations differ

All four apply together:

- **District character:** office, old town, harbour, residential, university and so on each get their own mix of shops, street places, lights and wires.
- **Station size:** hubs get everything and several of each; small stations get the minimum set.
- **One signature item per station:** at least one model or place found nowhere else.
- **Line era:** fittings inside follow the year the line opened (old, mid, new).

## What stays rare

- **Kōban:** only at hubs and district centres.
- **Shrines:** only in old or residential districts, each with its own invented name.

Enterable shops and landmark buildings were not marked as rare: use them where they fit, within the rules below.

## When a rule and realism disagree

**Leave the item out, or replace it with something honest, and say so in the report.** Do not move walls, stairs or lots to make room. Examples already in the code: a shop front with a stair or passage within 3 m behind it becomes posters or a service; a stall island that would block a tactile path is not built; a walk-in room is made only where the ground behind the wall is free.

## Finishing a station

End every redesign with **screenshots of the same fixed views**:

1. each exit, from the street;
2. the main junction;
3. each platform;
4. the concourse;
5. the inside of anything that can be entered.

Say plainly what was dropped and what was not looked at.

## The kit, by where it lives

| Part | Code | Models |
|---|---|---|
| Era fittings, gates, safety set, lifts, toilets | `src/stations/fittings.ts`, `toilets.ts`, `kit.ts`, `looks/parts.ts` | `tools/blender/build_station.py` |
| Queue marks, boards, women-only car | `kit.ts`, `src/signs/boards.ts`, `src/signs/draw.ts` | none (signs) |
| Shop fronts, recessed counters, walk-in shops, show windows | `src/stations/shopfronts.ts` | `build_shops.py` |
| Konbini | `src/stations/konbini.ts` | `build_konbini.py` |
| Street places | `src/stations/places.ts` | `build_places.py` |
| Trees in three seasons | `src/stations/trees.ts`, `src/render/season.ts` | `build_trees.py` |
| Roads, signals, lamps, poles and wires, level crossing | `src/stations/roads.ts` | `build_road.py` |
| Street buildings and landmarks | `src/stations/surface.ts`, `hub.ts` | `build_city.py`, `build_plaza.py` |
