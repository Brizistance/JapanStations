# JapanStations

A **fictional** Japanese transit simulator set in an Osaka-like second city, **Kawaminato (川湊)**, the one playable city of the invented **Seikai (西海)** region. Stations are styled after real Tokyo/Osaka Metro stations but are invented: no real data, no real station names.

## What this project is for

In the owner's words (interview, 2026-11-18), it is three things at once:

1. **Personal worldbuilding.** A city and metro the owner enjoys inventing. Their taste decides.
2. **A portfolio piece.** It should look good to a stranger on first sight.
3. **A game to play.** Walking and riding around should feel good.

Work for the coming months goes to **more stations and lines** and **visual quality** of what exists. Gameplay systems (passengers, tickets, objectives) and public deployment are not the focus unless asked for.

## Status

Playable. Seven lines (Yanagisuji **Y**, Nagisa **N**, Akanesuji **A**, Shiokaze **S**, Kikyō **K**, Sumire **M**, Ichō **G**), 54 stations, fourteen interchanges, eleven hero stations. Kita-Ōdōri is the central hub. The AR Main Line (Akitsushima Railway, 6 stations, Local and Rapid) is built in 3D from Miokami to Kon'yahama and on south at street level past Watayamachi's level crossings: trains, trackbed, Kawaminato Station in full (in Kita-Ōdōri's plot), platforms only at Higashi-Kawaminato and Miokami, and Kon'yahama with its station house, footbridge and shore street at street level by Aizomechō (`src/stations/rail.ts`, `konyahama-street.ts`): [docs/akitsushima-railway.md](docs/akitsushima-railway.md). Main menu with route map, teleport, first-person walking, timetabled trains you can board and ride, live departure boards. Details: [docs/vision.md](docs/vision.md).

## Working cheaply (usage limits are tight)

The owner hits usage limits fast. These are defaults, not suggestions:

- **Do not read docs or source up front.** Use the code map below to pick the one file a task touches. Never read all of `docs/` or browse `src/` "for context".
- **Search before reading.** Many files are 30–85 KB. Grep for the symbol, then Read only that range with `offset`/`limit`. Never read a whole file over ~15 KB unless the task truly needs all of it.
- **No subagents or extra sessions** unless the owner asks. They re-read everything.
- **No auditor in the `new-station` skill** (decided 2026-11-25): it slowed the work. Run `station-auditor` only when asked.
- **After building or changing a station, sign-off is the owner's** (decided 2026-11-21): run the tests, take a few sanity views in the browser, say what was not looked at, and report. The owner walks it and sends screenshots. Run the `station-checker` subagent (`.claude/agents/station-checker.md`) only when asked.
- **Verify narrowly.** Run `npm run typecheck`, plus only the test file near the change (`npx vitest run <file>`). Run the full suite only for changes to `src/data/`, `src/sim/` or shared station code (`build.ts`, `kit.ts`, `parts.ts`, `specs.ts`).
- **Reply very short.** What changed and where to look, in a few lines. No code walkthroughs or option surveys.
- **Docs upkeep is one line.** After a real decision, add or fix one line in the one relevant doc. Update the Status paragraph above only when lines or station counts change.

## Stack and commands

React 19 + TypeScript + Vite, three.js via `@react-three/fiber` (no drei, no physics engine), zustand, vitest. Localhost only.

```bash
npm run dev        # http://localhost:5173
npm test
npm run typecheck
npm run build
```

## Code map (sizes show what is expensive to read)

| Path | What is there |
|---|---|
| `src/data/network.ts` (32 KB), `types.ts` | All lines, stations, transfers. The single source of truth |
| `src/sim/` | Timetable, alignment, geometry (pure TS, tested) |
| `src/stations/specs.ts`, `build.ts` (49 KB), `kit.ts` | Station sizing and the shared builder and parts kit |
| `src/stations/themes/<line>.ts` | One platform architecture per line (y, n, a, s, k, m) |
| `src/stations/looks/<station>.ts` | One file per hero station (27–70 KB each); `default.ts` for the rest; `parts.ts` (81 KB) shared pieces; `types.ts` |
| `src/stations/hub.ts`, `hub-street.ts`, `atrium.ts` | Kita-Ōdōri hub (below ground; its streets and terminal district), and the atrium kind |
| `src/stations/wayfinding.ts` (67 KB), `floor.ts` (56 KB), `exits.ts`, `rooms.ts`, `surface.ts` | Sign placement, floor guidance, exits, rooms, street level |
| `src/signs/draw.ts` (84 KB), `departures.ts`, `content.ts` | Sign and departure-board drawing |
| `src/render/` | Scene, materials, textures, lighting, post effects, track, world view |
| `src/trains/`, `src/player/`, `src/world/` | Train cars and system, player movement, world builder and collision |
| `src/ui/` | Title screen, region map, city menu, settings, metro map, HUD, zustand store |

To work on one station, open only its look file and, if needed, its line's theme. Do not read other stations' look files for reference unless asked.

## Docs: open one only when the task needs it, and grep for the section first

| Doc | Read when… |
|---|---|
| [docs/worldbuilding.md](docs/worldbuilding.md) (23 KB) | Naming anything: districts, operators, stations, lines, shops |
| [docs/network.md](docs/network.md) (16 KB) | Touching lines, stations, transfers, numbering, timetable, data format |
| [docs/station-design.md](docs/station-design.md) (33 KB) | Designing a 3D station or signage |
| [docs/street-design.md](docs/street-design.md) | Redesigning a station's outside: streets, buildings, road kit, street furniture (the owner's rules) |
| [docs/station-playbook.md](docs/station-playbook.md) | Before building or rebuilding any station's outside: read only "The brief" at the top (plot size, two steps, layout types, edges); the rest is reference to grep (or run the `new-station` skill) |
| [docs/model-library.md](docs/model-library.md) | Before making any building model: every set in `assets/buildings` by theme |
| [docs/theme-notes.md](docs/theme-notes.md) | A station's theme was researched before: measured sizes and patterns per theme (grep the theme's section) |
| [docs/station-kit.md](docs/station-kit.md) | Bringing the modelled kit to another station: goals, minimum set, what stays rare, sign-off views (the owner's rules) |
| [docs/between-stations.md](docs/between-stations.md) | Working on what the ride shows between stations: tunnels by era, trackside, city band (a plan for later, the owner's rules) |
| [docs/conventions.md](docs/conventions.md) | Adding a station or a line (read those sections only) |
| [docs/architecture.md](docs/architecture.md) | Changing structure, data flow, sim loop, collision |
| [docs/vision.md](docs/vision.md), [docs/references.md](docs/references.md) | Scope questions; visual references and asset licensing |

`Plans/` holds old feature plans. Do not read them unless asked.

## Core rules

1. **Fictional, but plausible.** It should feel like it could exist in Japan. Never copy a real station name, line name, or operator brand.
2. **Bilingual JP/EN, done properly.** Every station and line has kanji, kana, and romaji (Hepburn, macrons in display text).
3. **Data drives everything.** Map, sim, walk-throughs, signage and ride-along read from `src/data/network.ts`. Don't hardcode station info into components.
4. **Short plan in chat, then build.** For a new feature, station or line, give a plan of a few lines in chat and wait for a yes. No plan files. Small fixes and tweaks need no plan.
5. **Keep it loose.** Iterate on something working over big upfront design.
6. **No fake information.** Departure boards, in-car displays, the HUD and the map read the timetable; never show invented times.
7. **Every new line gets its own era and theme.** An invented opening year and a platform architecture unlike any other line's.
8. **Every new station gets its own layout and theme. Strict.** No new station falls back to the default look or reuses another station's arrangement.
9. **Every station's entry area is its own too.** Street entrances, the stairwells down and the ticket hall differ from station to station, not only the platform.
9. **Keep this file short.** Details go in `docs/`.
