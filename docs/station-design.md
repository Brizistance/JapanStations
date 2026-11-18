# Station Design

A reference for building stylized-realistic Japanese metro stations. The aim is clean geometry, believable materials and good lighting — "somewhat realistic", not photorealism.

## Layouts implemented

| Composer | Used by | Shape |
|---|---|---|
| **Underground** (`buildUnderground`) | 7 stations | Street → exits → B1 concourse (gates at one or both ends) → stairs → platform hall. Works for island or side platforms. |
| **Interchange** (`buildInterchange`) | Tsumugibashi | Shared B1 concourse over the upper line; a transfer passage beside each upper platform; stairs down to the deeper line's island platform, which crosses at 90°. |
| **Elevated** (`buildElevated`) | Hibarino | Street-level concourse under a viaduct; stairs up through the deck to side platforms with canopies. |

Vertical order underground: street (0) → concourse floor (platform + 4.9 m) → platform (rail + 1.1 m). Platforms are 116 m long for 6-car, 18 m-car trains.

## The kit (`src/stations/kit.ts`)

Reusable parts, all driven by the line/station data:

- `hall` — track bed, platforms, half-height **platform screen doors** aligned to the train doors, tactile strip, walls with line-colour band, ceilings (flat or faceted **vault**), pillars, lighting, benches, vending machines, name boards, posters, direction signs, live departure boards.
- `pillar` — round clad column with steel base ring and line-colour band (the collider stays a square post).
- `ceilingLight` — strip light: white housing with a glowing diffuser. Use it instead of a bare `light` box.
- `stairs`, `escalator`, `rail` — vertical circulation.
- `gateLine` — automatic ticket gates, fences, station office, header signs, live departures screen.
- `ticketMachines` — machines with the fare board above (drawn from the network).
- `exit` — passage, stair to the street, glass canopy, entrance sign with station name, numbers and exit number.
- `surface` (`surface.ts`) — roads, kerbs, crossings, signals, guard rails, lamps, trees, utility poles, buildings with shopfronts and signs, plus features: canal + bridge, shopping arcade, park, quay, campus gate.

## Finishes

Named by material key and resolved in `src/render/materials.ts`:

| Key | Look | Use for |
|---|---|---|
| `floor:#hex` | 400 mm stone-look tile, semi-gloss | Platform and concourse floors |
| `tile:#hex` | 150 mm glazed tile | Walls, columns |
| `panel:#hex` | 900 × 1200 enamel panels | Walls, platform end screens |
| `brick:#hex`, `wood:#hex` | Scanned brick / boards, re-tinted | Feature walls, old-town fronts |
| `ceil` | Perforated ceiling panels | Ceilings over platforms and concourses |
| `paint:#hex` | Glossy painted metal | Screen-door panels, colour bands, seats |
| `metal:#hex` | Brushed stainless | Gates, handrails, housings, base rings |
| `flat:#hex` | Plain satin | Small parts with no finish worth showing |
| `glass`, `glassDark`, `glassTint` | Reflective glass | Screens, windows, canopies |
| `tactile`, `tactileBar` | Warning domes / guidance bars | Platform edges, routes |
| `light`, `glow:#hex` | Self-lit, blooms on High | Light diffusers, lamps, LEDs |

Station identity comes from the spec's wall, floor and pillar keys; everything else is shared.

## Details that make it read as "Japan"

- **Tactile paving** (点字ブロック) along platform edges.
- **Platform screen doors**, half height: white panels, glass above, line-colour top rail, housings with a status lamp between doors.
- **Platform edge**: dark coping, yellow tactile strip, white line. Dark exposed soffit over the tracks, pale panels over the platform.
- **Ticket gates** (改札) with IC readers, and a staffed window.
- **Signage**: line colour + station number badge, bilingual (JP large, EN smaller), exits on **yellow**, platform headers on navy with the platform number in the line colour.
- **Station name board** (駅名標): name, kana, romaji, number, and neighbouring stations with arrows that point the right way for where the sign is mounted.
- Vending machines, lockers, posters, horizontal traffic signals, guard rails, utility poles, vertical shop signs (袖看板).
- **Audio** (not built yet): departure melodies, bilingual announcements, door chimes.

## Per-station identity (`src/stations/specs.ts`)

| Station | Finish | Distinctive feature | Outside |
|---|---|---|---|
| Midorizaka | Warm brick | Leaf mural | Park, houses, utility poles |
| Kita-Ōdōri | White enamel panels | Vaulted hall with hanging lights | Office towers, boulevard trees |
| Tsumugibashi | Cream tile | Woven-stripe mural along the transfer passage | Two crossing avenues |
| Hyōtanbori | Black + gold tile | Gourd mural | Neon signs, canal with red bridge |
| Tsurumatsu | Green glazed tile | Pine-and-crane mural | Covered shopping arcade |
| Kawaminato-kō | Blue-grey panels | Wave mural | Quay, cranes, ferry |
| Aizomechō | Indigo tile | Wave (seigaiha) mural | Old wooden shophouses |
| Daigaku-mae | Brick | Leaf mural | University gate and lawn |
| Hibarino | Light panels, glass | Daylight, hills mural | Plaza, bus stop, convenience store, hills |

## Design rules

- Each line has a **visual identity**: its color appears on pillars, signs, and screen door trim.
- Each station gets **one distinctive feature** so stations don't all feel the same.
- Station designs are **invented but plausible**. Draw from real stations for patterns, never copy one exactly.
- Build reusable parts so new stations can be assembled quickly. A new station should be a spec, not new geometry code, unless it needs a new layout.

## Per-station plans

A station with a new layout or a hero feature gets `Plans/stations/<station-id>/plan.md` before it's built. A station that only needs a new entry in `specs.ts` doesn't.
