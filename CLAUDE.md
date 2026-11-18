# JapanStations

A **fictional** Japanese transit simulator set in an Osaka-like second city, **Kawaminato (川湊)**. Stations are styled after real Tokyo/Osaka Metro stations but are invented — no real data, no real station names. Sibling project to the BART simulator, but nothing here is based on real ridership or geography.

Goals: portfolio piece, personal worldbuilding project, and a vehicle for learning React Three Fiber.

## Status

Playable foundation. Three lines (Yanagisuji **Y**, Nagisa **N**, Akanesuji **A**), 14 stations, three interchanges. Kita-Ōdōri is the central hub: the metro under the glass atrium of Kawaminato Station, with closed-off shells for future railways. Main menu with interactive route map, teleport, first-person walking, timetabled trains you can board and ride, live departure boards. See [docs/vision.md](docs/vision.md) for what is and isn't done.

## Stack

- React 19 + TypeScript + Vite
- three.js via `@react-three/fiber` (no drei, no physics engine — see [docs/architecture.md](docs/architecture.md) for why)
- zustand for UI state, vitest for tests
- Runs on localhost only for now

## Commands

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # sim + station walkability tests (pure TS, no browser)
npm run typecheck
npm run build
```

## Docs map — read the one relevant to the task

| Doc | Read when… |
|---|---|
| [docs/vision.md](docs/vision.md) | Deciding scope, priorities, or what phase we're in |
| [docs/worldbuilding.md](docs/worldbuilding.md) | Naming anything: city, districts, operators, stations, lines, shops |
| [docs/network.md](docs/network.md) | Touching lines, stations, transfers, numbering, timetable, or the data format |
| [docs/station-design.md](docs/station-design.md) | Designing or building a 3D station, signage, or station UI |
| [docs/architecture.md](docs/architecture.md) | Writing code: structure, data flow, sim loop, collision |
| [docs/conventions.md](docs/conventions.md) | Code style, file naming, plan docs, how to add a station or line |
| [docs/references.md](docs/references.md) | Visual references that were actually looked at, and asset licensing |

## Core rules

1. **Fictional, but plausible.** Everything should feel like it could exist in Japan. Never copy a real station name, line name, or operator brand.
2. **Bilingual JP/EN, done properly.** Every station and line has kanji, kana, and romaji (Hepburn, with macrons in display text). See worldbuilding.md.
3. **Data drives everything.** The map, sim, walk-throughs, signage and ride-along all read from `src/data/network.ts`. Don't hardcode station info into components.
4. **Plan before building features.** For a new feature or station, write a short `Plans/<area>/<name>/plan.md` and get approval first. Small fixes and tweaks don't need one.
5. **Keep it loose.** Prefer iterating on something working over big upfront design.
6. **Keep this file short.** Put details in `docs/`, and update the relevant doc when a decision is made.
7. **No fake information.** Departure boards, in-car displays, the HUD and the map must read the timetable; never show invented times.
