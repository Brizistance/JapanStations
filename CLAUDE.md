# JapanStations

A **fictional** Japanese transit simulator set in an Osaka-like second city. Stations are styled after real Tokyo/Osaka Metro stations but are invented — no real data, no real station names. Sibling project to the BART simulator, but nothing here is based on real ridership or geography.

Goals: portfolio piece, personal worldbuilding project, and a vehicle for learning React Three Fiber.

## Status

Pre-code. Docs only. **Phase 1 = network data + map** (see [docs/vision.md](docs/vision.md)).

## Stack

- React + TypeScript + Vite
- React Three Fiber (`@react-three/fiber`), `@react-three/drei`, likely `@react-three/rapier` for walk-through collisions
- Deploy target: undecided (local only for now)

## Commands

_TBD once the project is scaffolded._ <!-- e.g. npm run dev / npm run build / npm test -->

## Docs map — read the one relevant to the task

| Doc | Read when… |
|---|---|
| [docs/vision.md](docs/vision.md) | Deciding scope, priorities, or what phase we're in |
| [docs/worldbuilding.md](docs/worldbuilding.md) | Naming anything: city, districts, operators, stations, lines |
| [docs/network.md](docs/network.md) | Touching lines, stations, transfers, numbering, or the network data format |
| [docs/station-design.md](docs/station-design.md) | Designing or building a 3D station, signage, or station UI |
| [docs/architecture.md](docs/architecture.md) | Writing code: structure, data flow, sim loop |
| [docs/conventions.md](docs/conventions.md) | Code style, file naming, plan docs, skills |

## Core rules

1. **Fictional, but plausible.** Everything should feel like it could exist in Japan. Never copy a real station name, line name, or operator brand.
2. **Bilingual JP/EN, done properly.** Every station and line has kanji, kana, and romaji (Hepburn, with macrons in display text). See worldbuilding.md.
3. **Data drives everything.** The map, sim, walk-throughs, and ride-along all read from the same network data. Don't hardcode station info into components.
4. **Plan before building features.** For a new feature or station, write a short `Plans/<area>/<name>/plan.md` and get approval first. Small fixes and tweaks don't need one.
5. **Keep it loose.** Prefer iterating on something working over big upfront design.
6. **Keep this file short.** Put details in `docs/`, and update the relevant doc when a decision is made.
