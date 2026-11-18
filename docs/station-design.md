# Station Design

A reference for building stylized-realistic Japanese metro stations. The aim is clean geometry, believable materials and good lighting — "somewhat realistic", not photorealism.

## Layouts implemented

| Composer | Used by | Shape |
|---|---|---|
| **Underground** (`buildUnderground`) | 30 stations | Street → exits → B1 concourse (gates at one or both ends) → stairs → platform hall. Works for island or side platforms. |
| **Interchange** (`buildInterchange`) | Tsumugibashi, Aizomechō, Daigaku-mae, Kawaminato-kō, Watayamachi, Tōmyōbori | Shared B1 concourse over the upper line; a transfer passage outside each side wall of the upper hall; stairs down to the deeper line's island platform, which crosses at 90°. The lower line must have an island platform.<br>- Side-platform upper line: doorways lead straight into the passages.<br>- Island upper line: the passages are reached from the concourse.<br>- With a line **beside** the upper one (Tsumugibashi's K): that line gets its own hall on the +z side, with island stairs into a concourse widened over both halls. The +z passage moves out past its far wall. |
| **Hub** (`buildHub`, `hub.ts`) | Kita-Ōdōri | Two island-platform lines crossing at 90°, and two more alongside the deeper one (S, then M further south), under a glass-roofed atrium, with a shopping street, a plaza and shells for future railways. See below. |
| **Elevated** (`buildElevated`) | Hibarino, Asahino, Takanodai, Izumigaoka | Street-level concourse under a viaduct; stairs up through the deck to side platforms with canopies. With a second line (Hibarino's K), that line crosses underneath: its island hall, a stair to a paid B1 mezzanine, and a flight up into the paid concourse (`underLine`). |

Vertical order underground: street (0) → concourse floor (platform + 4.9 m) → platform (rail + 1.1 m). Platforms are 116 m long for 6-car, 18 m-car trains.

## The kit (`src/stations/kit.ts`)

Reusable parts, all driven by the line/station data:

- `hall` — track bed, platforms, **platform screen doors** aligned to the train doors (waist-high, or full-height glass screens when the line has `platformDoors: 'full'`), tactile strip, walls with line-colour band, ceilings (flat or faceted **vault**), pillars, lighting, benches, vending machines, name boards, posters, direction signs, live departure boards.
- `pillar` — round clad column with steel base ring and line-colour band (the collider stays a square post).
- `ceilingLight` — strip light: white housing with a glowing diffuser. Use it instead of a bare `light` box.
- `stairs`, `escalator`, `rail` — vertical circulation.
- `gateLine` — automatic ticket gates, fences, station office, header signs, live departures screen.
- `ticketMachines` — machines with the fare board above (drawn from the network).
- `exit` — passage, stair to the street, glass canopy, entrance sign with station name, numbers and exit number.
- `surface` (`surface.ts`) — roads, kerbs, crossings, signals, guard rails, lamps, trees, utility poles, buildings with shopfronts and signs, plus features: canal + bridge, shopping arcade, park, quay, campus gate, stadium dome.

Every hall also declares its track beds as **keep-out volumes** (`Builder.keepOut`), which the walk test checks nobody can reach. Use the same call for anything else that must stay closed.

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

Station identity comes from the spec's wall, floor and pillar keys. The shapes those finishes are applied to come from the line's theme.

## Line themes (`src/stations/themes/`)

**The line sets the form, the station sets the colour.** Each line has one file exporting a `LineTheme`: a set of optional hooks that `hall()` calls in place of its default ceiling trim, lights, pillars, wall trim and benches. A hook left out keeps the default. Themes draw decoration only (`deco`/`mesh`); `hall()` owns every collider, the screen doors, signs and zones, so a theme cannot change where you can walk. The contract and its clearances are in `themes/types.ts`.

| Line | Opened | Idea | Ceiling | Pillars | Lighting | Wall motif | Benches |
|---|---|---|---|---|---|---|---|
| **Y** Yanagisuji | 1933 | The first subway | Barrel vault with arch ribs; riveted cross-beams under a concourse | Square riveted steel | Pendant globes | Tile dado, **willow** strands | Wooden slats |
| **N** Nagisa | 1961 | High-growth era, plain | Concrete downstand beams | Chunky tiled columns between the tracks | Rows of fluorescent battens | Two-tone tile, stepped **shoreline** band | Shell seats; scalloped canopy valance when elevated |
| **A** Akanesuji | 1994 | Bubble-era stone and brass | Dark coffers, lit centre cove | Fat round stone columns, brass collars | Cove glow and downlights | **Madder-dyed warp threads** | Stone plinth, red cushion |
| **S** Shiokaze | 2004 | Sea breeze | White fins rippling in a wave | Slim paired white tubes | Cool lines between the fins | **Wind streaks** | Pale wood on steel |
| **K** Kikyō | 2015 | Night garden | Near-black | Round, flaring to a lit bell capital | Pentagon of downlights (the **bellflower**) | Star studs over a dark base | Drum seats |
| **M** Sumire | 2023 | Timber and soft light | Timber battens | Slim timber posts with a violet light slot | LED lines between battens | Timber wainscot, drifting **violet petals** | Timber blocks |

A hall takes the theme of the line it is built for, so interchanges and the hub show two or more themes. Where Sumire trains run on Shiokaze track, the platforms are Shiokaze's. Themes cover platform halls only; concourses, gates and exits are still shared.

To add a theme for a new line: write `themes/<id>.ts`, register it in `themes/index.ts`, and add a row here and an opening year in worldbuilding.md.

## Details that make it read as "Japan"

- **Tactile paving** (点字ブロック) along platform edges.
- **Platform screen doors**: white panels, glass above, line-colour top rail, housings with a status lamp between doors. Half height on the older lines; full-height glass screens on the Akanesuji Line.
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
| Kita-Ōdōri | White enamel panels, gold trim | The atrium and the gilded willow; the Yanagisuji platforms keep their vaulted hall | Station plaza, the avenue |
| Tsumugibashi | Cream tile | Woven-stripe mural along the transfer passage | Two crossing avenues |
| Hyōtanbori | Black + gold tile | Gourd mural | Neon signs, canal with red bridge |
| Tsurumatsu | Green glazed tile | Pine-and-crane mural | Covered shopping arcade |
| Kawaminato-kō | Blue-grey panels | Wave mural | Quay, cranes, ferry |
| Aizomechō | Indigo tile | Wave (seigaiha) mural along the transfer passage | Old wooden shophouses, Akane-suji crossing |
| Daigaku-mae | Brick | Leaf mural; Shiokaze island below the Nagisa platforms | University gate and lawn |
| Hibarino | Light panels, glass | Daylight, hills mural | Plaza, bus stop, convenience store, hills |
| Kamomehama | Pale sea-grey panels | Gull mural, two gate lines for match days | Kawaminato Dome, the quay |
| Watayamachi | Unbleached-cotton tile, madder-red pillars | Hanging-thread mural | Old shophouses |
| Suzukakedōri | Pale stone panels | Plane-leaf mural | Offices, tree-lined avenue |
| Tsukimizaka | Night-blue tile | Moon-over-the-slope mural | Houses and apartments |
| Yamabukidai | Cream panels, kerria-yellow trim | Kerria flower mural | New-town apartments |
| Yūnagihama | Warm sand panels | Sunset-over-the-bay mural | Sunset promenade at the Mio-gawa mouth: boardwalk, benches, breakwater lighthouse (`waterfront: 'promenade'`) |
| Kurayashiki | White plaster tile, charcoal pillars | Namako-wall mural | Storehouse street (`godown` block style): white kura on namako bases, some now cafés |
| Tōmyōbori | Dark brown tile, persimmon pillars | Lantern mural | Canal with lantern strings on both banks and Tōmyō-bashi (`canalLanterns`, `canalName`) |
| Sakurazutsumi | Blush panels | Cherry-embankment mural | Sakurazutsumi Park; cherry trees in the park and street (`treeLeaf`, `parkName`) |

## The hub (Kita-Ōdōri / Kawaminato Station)

Built by `buildHub` in `src/stations/hub.ts`. The station frame follows the Akanesuji Line: **+x east, +z south**. Its plot is 380 × 320 m, against 260 × 170 m for an ordinary station (`Build.plot`).

| Level | Height | What is there | State |
|---|---|---|---|
| 3F | +14 m | High-speed deck, and a landing overlooking the atrium | Deck is a shell; landing is walkable |
| 2F | +7 m | Gallery round the atrium. Main-line deck to the north, private-railway bay platforms to the east | Gallery walkable; platforms are shells |
| 1F | 0 | Atrium ring, station doors, plaza with bus terminal and taxi rank, Kita-Ōdōri avenue | Built |
| B1 | −7 m | Concourse: a paid "T" (a bar under the avenue over the Akanesuji platforms, a stem over the Yanagisuji platforms), three gate lines, Yanagi Mall, exits 1–8, the atrium floor with Kin no Yanagi | Built |
| B2 | −12 m | Yanagisuji island platform | Built |
| B4 | −19 m | Akanesuji island platform; 15.9 m south, the Shiokaze island platform; 15.9 m further, the Sumire island platform | All built |

- **The atrium** is one void from the B1 floor to the glass roof at +26 m. Zones can be flagged `sky` so the atrium floor keeps daylight instead of the underground fog.
- **The deep escalators** rise 12.4 m from the Akanesuji platform through an open shaft into the middle of the concourse.
- **The Sumire hall** is a second `sHall`, 15.9 m south of the Shiokaze hall, with windows into it on the same three bays. Its shaft climbs into the same stub passage, which runs on south past both shafts. The hub spec names it `outer: 'M'`.
- **The Shiokaze hall** (`sHall`) fills what was the B4 shell. It shares three windows with the Akanesuji hall, so you see one line's trains from the other's platform. A stair and escalator climb west through an enclosed shaft into the stub passage south of the paid concourse, so A/Y ↔ S transfers stay inside the gates. The line beside the primary is named by `beside` in the hub spec; without one, `buildHub` still draws the shell.
- **The Yanagisuji hall** keeps its vault over the southern 47 m. The northern part now has the concourse above it, so the vault is shorter than it was.
- **Shells** are real geometry you can see but not enter: closed by glass or hoardings, signed 将来線予定地 with the kind of railway, with the future gate position marked on the floor. They have no departure boards and are absent from the map. The unfinished viaducts simply stop at a hoarded end.
- **The clock** on the facade and on the willow is a live sign (`{ k: 'clock' }`) reading the sim clock.

To open a shell later: add the line to the network data, replace the hoarding with a gate line, and remove its `keepOut` (as was done for the Shiokaze Line's box and passage). The private-railway bays would also need a turnback inside the station, which the timetable code does not have yet (it reverses in a siding beyond the terminus).

## Design rules

- Each line has a **visual identity**: its colour on signs and screen door trim, and its own architecture (see Line themes).
- Each station gets **one distinctive feature** so stations don't all feel the same.
- Station designs are **invented but plausible**. Draw from real stations for patterns, never copy one exactly.
- Build reusable parts so new stations can be assembled quickly. A new station should be a spec, not new geometry code, unless it needs a new layout.

## Per-station plans

A station with a new layout or a hero feature gets `Plans/stations/<station-id>/plan.md` before it's built. A station that only needs a new entry in `specs.ts` doesn't.
