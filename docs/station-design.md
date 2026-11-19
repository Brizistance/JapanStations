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
| `light`, `glow:#hex` | Self-lit, blooms when Glow is on | Light diffusers, lamps, LEDs |

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

Each theme also carries a subtle **colour grade** (`grade` in the theme file), applied on its underground platforms and trains when Colour grading is on: Y is warm and faded like an old print, N has a faint fluorescent green, A is warm and deep, S is clean and cool, K is cool with blue-violet shadows, and M is warm neutral with violet in the shadows. Keep it subtle enough that line colours on signs still read as themselves.

A hall takes the theme of the line it is built for, so interchanges and the hub show two or more themes. Where Sumire trains run on Shiokaze track, the platforms are Shiokaze's. Themes cover platform halls only; concourses, gates and exits are still shared.

To add a theme for a new line: write `themes/<id>.ts`, register it in `themes/index.ts`, and add a row here and an opening year in worldbuilding.md.

A theme can also set `lowCeil`: the hung ceiling under a concourse drops to that height. Yanagisuji (3.4 m) and Nagisa (3.45 m) use it, with pipes, cable trays and ducts under it, so the old lines' platforms are low and busy where the newer ones keep 4.05 m.

## Size by era

The older the line, the smaller the station. An ordinary station's concourse width follows its line's opening year (`concourseHalf` in `build.ts`; a spec can override it with `width`).

| Line | Concourse width | Gates per line | Exit corridor |
|---|---|---|---|
| Yanagisuji (1933) | 16 m | 5 | 4 m, 2.5 m high |
| Nagisa (1961), Akanesuji (1994), Shiokaze (2004) | 20 m | 7 | 2 m |
| Kikyō (2015), Sumire (2023) | 24 m | 7 | none |

- The street entrances do not move: a narrower concourse reaches them by a longer, lower exit corridor (`exit(…, ext)`).
- Nagisa cannot go below 20 m because its side-platform stairs come up 8.6 m from the centre.
- Interchange concourses (28 m or more) are fixed by their transfer passages, and elevated stations' street-level concourses are already small. The hub is untouched.

## Station looks (`src/stations/looks/`)

A line's theme shapes the platform hall; a station's **look** shapes everything else: the concourse, the exits and the transfer passages. A `StationLook` is a set of optional hooks (`finishes`, `concourse`, `lights`, `pillar`, `exit`, `canopy`, `passage`) called by `concourse()`, `exit()` and the passage loop in `buildInterchange()`. The contract is `looks/types.ts`.

- Unlike a line theme, a look may add solid things (a kiosk is solid). It may only build where `ConcInfo.free()` is true: that keeps it off the stair openings and their landings, the gate lines, machines, lockers, exit doorways, toilets, murals, pillars and lifts. The walk test then proves every zone is still reachable.
- `looks/parts.ts` is the shared library: shop fronts and presets (convenience store, kiosk, soba stand, bakery, café, flower stall, lockers, photo booth, vending row, ATM corner), beams, ducts, pipes, cable trays, lanterns, noren, banners, dados, poster rows, and exit and passage helpers. It also holds `SHOPS`, the catalogue of invented brands.
- **The default look** (`looks/default.ts`) is what every station without its own gets. It follows the primary line's era and a per-station seed:
  - *old* (Y, N): tiled dado in the platform wall's colour, downstand beams every 4 m, a duct, cable tray and pipes, bare battens, square tiled pillars with adverts, small counters and kiosks, posters on every free wall;
  - *mid* (A, S): enamel dado, shallow coffers with light panels, a convenience store plus a bakery, café or ATM corner, benches;
  - *new* (K, M): pale panels, continuous light slots, fewer and larger glazed fronts, digital advert panels, benches and planters.
- **Hero stations** have a look of their own, registered in `looks/index.ts`:

| Station | Look | Centrepiece |
|---|---|---|
| Hyōtanbori | A yokochō carried underground: black tile, gold, neon | Alley of tiny bars under lanterns and projecting signs |
| Tsurumatsu | The shōtengai continues underground | Arcade arch and awning-fronted stalls |
| Kurayashiki | Inside a kura: plaster, namako tile, dark timber | Kura front and a timber post-and-beam frame |
| Kamomehama | Stadium station on match day | Pennant ceiling, dome wall, queue lanes |
| Hoshimine | Under the night sky | Star-field ceiling and an orrery |
| Tōmyōbori | The lantern canal at dusk | Lantern-hung transfer passages |
| Aizomechō | The dyers' street | Hanging indigo cloth and noren gates |
| Daigaku-mae | The campus undercroft | Brick arcade and the noticeboard court |
| Tsumugibashi | 紬橋地下街, an underground shopping street: the 60 m wide hall cut into named streets by blocks of shops, with a weaving theme | The street plan itself, and the Tsumugi Loom at Shuttle Crossing |

To add a hero: write `looks/<station-id>.ts` following [Plans/features/station-looks/hero-brief.md](../Plans/features/station-looks/hero-brief.md), register it in `looks/index.ts`, and add a row here.

Not covered yet: elevated stations (their street-level concourse is built separately) and the hub.

**Wide concourses.** An interchange concourse is 28 m wide or more, so it gets pillar rows about every 7 m across its width (`concourse()` in `build.ts`), and the default look places **shop islands** in the lanes between them (`shopIsland`, `vendingIsland`, `benchIsland`, `totemRow`, `waitingRoom` in `parts.ts`). Islands keep 3 m aisles and leave a 4 m route from every gate line to every stair. Where stairs fill the lanes (Kawaminato-kō) few islands fit.

## Wayfinding (`src/stations/wayfinding.ts`)

Passenger guidance away from the platforms. All of it is generated: nothing is typed in per station.

| Sign | Where |
|---|---|
| Platform signs (line, platform number, "for <terminus>") | Hanging at the top of every stair; the back face points to the exits |
| Transfer signs | At transfer stair heads, along transfer passages, opposite platform doorways |
| Direction signs | 5.5 m inside each gate line, then about every 18 m through the paid area |
| Exit signs (yellow, with numbers and landmarks) | Outside each gate line, pointing left and right to the two doorways; in each exit lobby |
| Exit board (出口案内), station map (構内図), area map (周辺図) | On the walls of each unpaid hall; an exit board and station map inside the gates too |
| Pictograms | Toilets, station office, lockers, lift, tickets |

- **What the composers tell it.** `ConcInfo.stairs` says where each floor opening leads (line, platform numbers, platform or transfer stair, the point at its top and the way down); `ConcInfo.exits` lists the exit doorways. Elevated stations pass an `ElevInfo`, transfer passages a `PassageCtx`.
- **Exit landmarks** come from `src/stations/exits.ts`, which works out from the station's spec where each numbered exit surfaces and what `surface()` builds there. `exits.test.ts` checks every exit's number, side and position against the built station. It copies a few constants from the builders (to avoid an import cycle); the test fails if they drift.
- **New sign kinds** (`src/signs/content.ts`, drawn in `draw.ts`): `exits`, `picto`, `stationmap`, `areamap`. The station map is a level diagram from each line's rail level; the area map is a plan drawn the way `surface()` lays the street out. `boards.test.ts` checks that their text fits and that every exit and platform number appears.
- **Signs always win.** Each sign's surroundings are registered with `Builder.protect`; a look's decoration runs inside `Builder.guard`, which trims boxes and drops meshes that intrude. A look does not need to know where the signs are, but anything it hangs in front of a stair head or over a gate line will be cut.
- The hub keeps its own signage.

## Details that make it read as "Japan"

- **Tactile paving** (点字ブロック) along platform edges.
- **Platform screen doors**: white panels, glass above, line-colour top rail, housings with a status lamp between doors. Half height on the older lines; full-height glass screens on the Akanesuji Line.
- **Platform edge**: dark coping, yellow tactile strip, white line. Dark exposed soffit over the tracks, pale panels over the platform.
- **Ticket gates** (改札) with IC readers, and a staffed window.
- **Signage**: line colour + station number badge, bilingual (JP large, EN smaller), exits on **yellow**, platform headers on navy with the platform number in the line colour.
- **Station name board** (駅名標): name, kana, romaji, number, and neighbouring stations with arrows that point the right way for where the sign is mounted.
- **Departure boards** (発車標, `src/signs/departures.ts`): equipment, not signs. They hang lower than the printed platform signs (centre pf + 2.45 against 2.72) in a deep metal case with a hood and stout rods (`Builder.screen`), and glow. Lines opened before 2000 (Y, N, A) have 3-colour dot-matrix LED boards: drawn one pixel per LED, snapped to red / green / amber, and shown as round dots by the sign material. Newer lines (S, K, M) have full-colour LCDs. The style per line is in `src/signs/board-style.ts`; a concourse board takes the station's oldest line's. Both show a header (track, line, clock), the next trains, an approach strip (接近表示: the last two stops, with the next train lit where it really is), and a scrolling ticker (status, transfers, operator). Japanese and English alternate every 4 s. 45 s before a train arrives the header flashes まもなく電車がまいります; 8 s before it leaves it says 発車します. Boards near the player redraw at 15 Hz. Every time shown is a timetable time, and `boards.test.ts` checks this.
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
- **Every new station gets its own layout and its own look** (standing rule, user, 2026-11-18): an arrangement and a theme no other station has. The default look is only for the stations built before this rule. See "Adding a station" in conventions.md.
- Station designs are **invented but plausible**. Draw from real stations for patterns, never copy one exactly.
- Build reusable parts so a new station's unique layout and look can be built from kit and `parts.ts` pieces, with new geometry code only where the kit has nothing that fits.

## Per-station plans

Every new station gets `Plans/stations/<station-id>/plan.md` before it's built, proposing its layout and its look (see Design rules).
