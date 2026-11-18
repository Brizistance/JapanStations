# Vision

## What this is

A fictional transit simulator for an invented Japanese city. The city has an Osaka-like personality: a dense downtown, a strong north–south trunk line, and a slightly scrappy charm. It's built as a web app with React Three Fiber.

## End goals

- **Portfolio piece**: polished, runs in a browser, and is shareable.
- **Personal creative project**: worldbuilding with no deadline.
- **Learning R3F**: React Three Fiber, drei, and possibly rapier.

## The four pillars

| Pillar | What it is |
|---|---|
| **Map / network** | A stylized Osaka/Tokyo Metro-style route diagram and a geographic view, driven by network data |
| **Operations sim** | Trains running to a timetable: headways, rush hour, dwell times, and maybe delays and passenger flow |
| **Station walk-throughs** | First-person exploration of 3D stations: concourse, ticket gates, stairs, platforms |
| **Ride-along** | Riding between stations, with announcements, departure melodies, and a cab or window view |

## Scope

- **Initial network:** a small city with 3–5 lines, all underground metro, under one metro operator.
- **Later, maybe:** JR-style elevated or commuter lines, private railways, through-running.
- **Undecided:** Shinkansen or a major terminal hub.
- **Out of scope:** real-world data, real station names, and exact replicas of real stations.

## Roadmap (loose)

1. **Phase 1: Network data + map.** Define the city, lines, and stations as typed data, and render a route diagram.
2. **Phase 2: Operations sim.** Trains moving along lines on the map according to a timetable.
3. **Phase 3: First station walk-through.** One hero station that sets the visual standard.
4. **Phase 4: Ride-along.** Connect stations together with train rides.
5. **Later:** more stations, more line types, polish, and deployment.

The order can change, but Phase 1 comes first because everything else reads from it.
