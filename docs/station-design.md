# Station Design

A reference for building stylized-realistic Japanese metro stations. The aim is clean geometry and correct details with good lighting, not photorealism.

## Layouts implemented

| Composer | Used by | Shape |
|---|---|---|
| **Underground** (`buildUnderground`) | 11 stations | Street → exits → B1 concourse (gates at one or both ends) → stairs → platform hall. Works for island or side platforms. |
| **Interchange** (`buildInterchange`) | Tsumugibashi, Aizomechō | Shared B1 concourse over the upper line; a transfer passage beside each upper platform; stairs down to the deeper line's island platform, which crosses at 90°. The upper line must have side platforms and the lower one an island. |
| **Hub** (`buildHub`, `hub.ts`) | Kita-Ōdōri | Two island-platform lines crossing at 90° under a glass-roofed atrium, with a shopping street, a plaza and shells for future railways. See below. |
| **Elevated** (`buildElevated`) | Hibarino | Street-level concourse under a viaduct; stairs up through the deck to side platforms with canopies. |

Vertical order underground: street (0) → concourse floor (platform + 4.9 m) → platform (rail + 1.1 m). Platforms are 116 m long for 6-car, 18 m-car trains.

## The kit (`src/stations/kit.ts`)

Reusable parts, all driven by the line/station data:

- `hall` — track bed, platforms, **platform screen doors** aligned to the train doors (waist-high, or full-height glass screens when the line has `platformDoors: 'full'`), tactile strip, walls with line-colour band, ceilings (flat or faceted **vault**), pillars, lighting, benches, vending machines, name boards, posters, direction signs, live departure boards.
- `stairs`, `escalator`, `rail` — vertical circulation.
- `gateLine` — automatic ticket gates, fences, station office, header signs, live departures screen.
- `ticketMachines` — machines with the fare board above (drawn from the network).
- `exit` — passage, stair to the street, glass canopy, entrance sign with station name, numbers and exit number.
- `surface` (`surface.ts`) — roads, kerbs, crossings, signals, guard rails, lamps, trees, utility poles, buildings with shopfronts and signs, plus features: canal + bridge, shopping arcade, park, quay, campus gate, stadium dome.

Every hall also declares its track beds as **keep-out volumes** (`Builder.keepOut`), which the walk test checks nobody can reach. Use the same call for anything else that must stay closed.

## Details that make it read as "Japan"

- **Tactile paving** (点字ブロック) along platform edges.
- **Platform screen doors** with a line-colour top rail: half height on the older lines, full height on the Akanesuji Line.
- **Ticket gates** (改札) with IC readers, and a staffed window.
- **Signage**: line colour + station number badge, bilingual (JP large, EN smaller), exits on **yellow**, platform headers on navy with the platform number in the line colour.
- **Station name board** (駅名標): name, kana, romaji, number, and neighbouring stations with arrows that point the right way for where the sign is mounted.
- Vending machines, lockers, posters, horizontal traffic signals, guard rails, utility poles, vertical shop signs (袖看板).
- **Audio** (not built yet): departure melodies, bilingual announcements, door chimes.

## Per-station identity (`src/stations/specs.ts`)

| Station | Finish | Distinctive feature | Outside |
|---|---|---|---|
| Midorizaka | Warm brick | Leaf mural | Park, houses, utility poles |
| Kita-Ōdōri | White enamel panels, gold trim | The atrium and the gilded willow; the Yanagisuji platforms keep their vaulted hall | Station plaza, the avenue |
| Tsumugibashi | Cream tile | Woven-stripe mural along the transfer passage | Two crossing avenues |
| Hyōtanbori | Black + gold tile | Gourd mural | Neon signs, canal with red bridge |
| Tsurumatsu | Green glazed tile | Pine-and-crane mural | Covered shopping arcade |
| Kawaminato-kō | Blue-grey panels | Wave mural | Quay, cranes, ferry |
| Aizomechō | Indigo tile | Wave (seigaiha) mural along the transfer passage | Old wooden shophouses, Akane-suji crossing |
| Daigaku-mae | Brick | Leaf mural | University gate and lawn |
| Hibarino | Light panels, glass | Daylight, hills mural | Plaza, bus stop, convenience store, hills |
| Kamomehama | Pale sea-grey panels | Gull mural, two gate lines for match days | Kawaminato Dome, the quay |
| Watayamachi | Unbleached-cotton tile, madder-red pillars | Hanging-thread mural | Old shophouses |
| Suzukakedōri | Pale stone panels | Plane-leaf mural | Offices, tree-lined avenue |
| Tsukimizaka | Night-blue tile | Moon-over-the-slope mural | Houses and apartments |
| Yamabukidai | Cream panels, kerria-yellow trim | Kerria flower mural | New-town apartments |

## The hub (Kita-Ōdōri / Kawaminato Station)

Built by `buildHub` in `src/stations/hub.ts`. The station frame follows the Akanesuji Line: **+x east, +z south**. Its plot is 380 × 320 m, against 260 × 170 m for an ordinary station (`Build.plot`).

| Level | Height | What is there | State |
|---|---|---|---|
| 3F | +14 m | High-speed deck, and a landing overlooking the atrium | Deck is a shell; landing is walkable |
| 2F | +7 m | Gallery round the atrium. Main-line deck to the north, private-railway bay platforms to the east | Gallery walkable; platforms are shells |
| 1F | 0 | Atrium ring, station doors, plaza with bus terminal and taxi rank, Kita-Ōdōri avenue | Built |
| B1 | −7 m | Concourse: a paid "T" (a bar under the avenue over the Akanesuji platforms, a stem over the Yanagisuji platforms), three gate lines, Yanagi Mall, exits 1–8, the atrium floor with Kin no Yanagi | Built |
| B2 | −12 m | Yanagisuji island platform | Built |
| B4 | −19 m | Akanesuji island platform; beside it an empty box for a future metro line | Platform built; box is a shell |

- **The atrium** is one void from the B1 floor to the glass roof at +26 m. Zones can be flagged `sky` so the atrium floor keeps daylight instead of the underground fog.
- **The deep escalators** rise 12.4 m from the Akanesuji platform through an open shaft into the middle of the concourse.
- **The Yanagisuji hall** keeps its vault over the southern 47 m. The northern part now has the concourse above it, so the vault is shorter than it was.
- **Shells** are real geometry you can see but not enter: closed by glass or hoardings, signed 将来線予定地 with the kind of railway, with the future gate position marked on the floor. They have no departure boards and are absent from the map. The unfinished viaducts simply stop at a hoarded end.
- **The clock** on the facade and on the willow is a live sign (`{ k: 'clock' }`) reading the sim clock.

To open a shell later: add the line to the network data, replace the hoarding with a gate line, and remove its `keepOut`. The private-railway bays would also need a turnback inside the station, which the timetable code does not have yet (it reverses in a siding beyond the terminus).

## Design rules

- Each line has a **visual identity**: its color appears on pillars, signs, and screen door trim.
- Each station gets **one distinctive feature** so stations don't all feel the same.
- Station designs are **invented but plausible**. Draw from real stations for patterns, never copy one exactly.
- Build reusable parts so new stations can be assembled quickly. A new station should be a spec, not new geometry code, unless it needs a new layout.

## Per-station plans

A station with a new layout or a hero feature gets `Plans/stations/<station-id>/plan.md` before it's built. A station that only needs a new entry in `specs.ts` doesn't.
