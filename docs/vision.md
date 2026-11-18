# Vision

## What this is

A fictional transit simulator for an invented Japanese city. The city has an Osaka-like personality: a dense downtown, a strong north–south trunk line, and a slightly scrappy charm. It's built as a web app with React Three Fiber.

## End goals

- **Portfolio piece**: polished, runs in a browser, and is shareable.
- **Personal creative project**: worldbuilding with no deadline.
- **Learning R3F**: React Three Fiber and three.js.

## The four pillars

| Pillar | What it is | State |
|---|---|---|
| **Map / network** | A stylized route diagram driven by network data | Done for 3 lines. No geographic view yet. |
| **Operations sim** | Trains running to a timetable: headways, dwell times | Done: fixed headway all day. No rush hour, delays or passenger flow. |
| **Station walk-throughs** | First-person exploration of 3D stations | Done for all 14 stations, generated from kits + per-station specs, plus one hand-composed hub. |
| **Ride-along** | Riding between stations | Done: board, ride, look out of the cab end. No audio yet. |

## Scope

- **Now:** 3 lines, 14 stations, one operator (Kawaminato Metro), and a central station (Kita-Ōdōri / Kawaminato Station) with space reserved for four more railways.
- **Next, in rough order of value:** audio (door chimes, announcements, departure melodies), passenger NPCs, rush-hour service patterns, working elevators, day/night.
- **Later, maybe:** the railways the hub is waiting for (a fourth metro line, a JR-style main line, a private-railway terminal, a high-speed line), through-running, express services.
- **Out of scope:** real-world data, real station names, and exact replicas of real stations.

## Roadmap (loose)

1. ~~Phase 1: Network data + map.~~ Done.
2. ~~Phase 2: Operations sim.~~ Done (basic, reliable service).
3. ~~Phase 3: First station walk-through.~~ Done, and extended to every station.
4. ~~Phase 4: Ride-along.~~ Done (silent).
5. **Phase 5: Atmosphere.** ~~Better lighting and materials~~ (done, see Plans/features/visual-realism). Still to do: audio, NPCs, day/night.
6. **Phase 6: Growth.** Started: the Akanesuji Line and the hub. Still to come: more lines, express/local patterns, a bigger city.

## Known limitations (deliberate, for now)

- Service is the same frequency around the clock; there are no first/last trains, delays or incidents.
- Every station on a line shares one platform type (island on Y and A, side on N) so the track spacing never has to flare. See network.md.
- The hub's upper levels are shells: you can see the future platforms but not enter them, and nothing runs there.
- Elevators are scenery. Escalators carry you; ticket gates are open (no fares).
- No audio, no passengers, always daytime.
- The city beyond each station's plot is a low-detail backdrop you cannot walk into.
