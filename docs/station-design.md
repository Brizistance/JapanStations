# Station Design

A reference for building stylized-realistic Japanese metro stations. The aim is clean geometry, believable materials and good lighting — "somewhat realistic", not photorealism.

## Layouts implemented

| Composer | Used by | Shape |
|---|---|---|
| **Underground** (`buildUnderground`) | 32 stations | Street → exits → B1 concourse (gates at one or both ends) → walled stairwells → platform hall. Works for island or side platforms. |
| **Interchange** (`buildInterchange`) | Midorizaka, Tsumugibashi, Aizomechō, Daigaku-mae, Kawaminato-kō, Watayamachi, Tōmyōbori | A narrow **spine** corridor over the upper line (half width 8 m over an island, 8.9 m over side platforms) with the platform stairwells in it. A transfer passage outside each side wall of the upper hall leads to stairs down to the deeper line's island platform, which crosses at 90°; the lower line must have an island platform. Each transfer stair comes up in a walled **transfer bay** beside the spine, entered through a mouth in the spine wall just past the platform stairwell's head (4.9 m wide, x 14.75 to 19.65 over side platforms, 12.5 to 17.4 over an island).<br>- Side-platform upper line: doorways lead straight into the passages.<br>- Island upper line: the passages are reached from the concourse.<br>- With a line **beside** the upper one (Tsumugibashi's K, 16.8 m to +z): the Nagisa spine, a second spine over the Kikyō hall (11 m wide, x −26 to 26, closed at both ends, the Kikyō stairwells on its axis) and three cross passages 5 m wide joining them inside the paid area (x −22, 0 and 22). Gates stay on the Nagisa spine. The −z transfer bay opens off the Nagisa spine, the +z one off the Kikyō spine, beyond its hall.<br>- What lies between the walkable rooms and the old outer wall (14 m half width, about 31 m at Tsumugibashi) is bare structure: the slab and ceiling span it, but it has no finished floor and no way in. The exits keep their street positions and are reached by corridors across it. |
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

A theme can also set `lowCeil`: the hung ceiling under a concourse drops to that height. Yanagisuji (3.4 m) and Nagisa (3.45 m) use it, with pipes, cable trays and ducts under it, so the old lines' platforms are low and busy where the newer ones keep 4.05 m.

## Size by era

The older the line, the smaller the station. An ordinary station's concourse width follows its line's opening year (`concourseHalf` in `build.ts`; a spec can override it with `width`).

| Line | Concourse width | Gates per line | Exit corridor |
|---|---|---|---|
| Yanagisuji (1933) | 16 m | 5 | 4 m, 2.5 m high |
| Nagisa (1961), Akanesuji (1994), Shiokaze (2004) | 20 m | 7 | 2 m |
| Kikyō (2015), Sumire (2023) | 24 m | 7 | none |
| Interchange spine over an island primary (Midorizaka Y, Watayamachi K, Tōmyōbori S) | 16 m (half width 8) | 5 | 6 m |
| Interchange spine over side platforms (Nagisa at Kawaminato-kō, Aizomechō, Daigaku-mae, Tsumugibashi) | 17.8 m (half width 8.9) | 7 | 5.1 m |
| Tsumugibashi | 17.8 m spine, plus the Kikyō spine (11 m wide) | 7 | 22.1 m |

- The street entrances do not move: a narrower concourse reaches them by a longer, lower exit corridor (`exit(…, ext)`). An interchange's structure keeps its old 14 m half width (about 31 m at Tsumugibashi, where the Kikyō hall and its transfer passage lie beyond the Nagisa hall), so its exits are reached by corridors of `ext` = structure − spine. Tsumugibashi's are the long ones, and a sign hangs halfway along each (see Wayfinding).
- A concourse under 8.5 m half width is "narrow": five gates (not seven), a smaller gate header and slightly narrower direction signs. The 8.9 m spine is above the threshold and keeps seven.
- Nagisa cannot go below 20 m because its side-platform stairs come up 8.6 m from the centre. An interchange spine over side platforms is 8.9 m for the same reason: its long walls stand just outside the stairs' outer rails, so the stairs run along them.
- Pillars stand every 8 m in a row each side (none within 4 m of a gate line or 0.5 m of a stairwell). The row is 3.4 m from the axis over side platforms; over an island it is `islandPillarZ`: 4.9 m in a 16 m concourse, so the aisle beside a stairwell stays 2.4 m wide, and 6 m in a 20 or 24 m one.
- Elevated stations' street-level concourses are already small. The hub is untouched.

## Stairwells and portals

Every stair and escalator opening in an underground concourse (the hub and elevated stations excepted) is a walled **stairwell**, planned by `planStairwells` in `src/stations/rooms.ts` and built by `concourse()`:

- Full-height walls, 0.18 m thick and 0.1 m outside the glass rails, on both long sides and the closed end. A side within 2.4 m of a concourse wall uses that wall instead, and the strip between is closed off. Two stairwells back to back with a gap under 2.4 m are joined. In a transfer bay every side is the bay's own wall, so only the portal is added.
- A **portal** at the head: two jambs (0.3 m deep) and a fascia from 2.35 m above the floor up to the ceiling, leaving the opening clear. On a platform stair the portal is in the line's colour. A transfer stair's is white with a line-colour stripe along its foot, so it never reads as a platform stair. The stair's header sign sits on the fascia (see Wayfinding).
- `ConcInfo.stairwells` gives a look each stairwell's wall boxes, footprint and portal. `free()` refuses the footprint plus 0.3 m, and a look keeps its own overhead runs (beams, pipes, strings, cloth) short of stairwell and room walls. `stairwellFaces()` in `parts.ts` returns the outer faces someone can see, to dress.

## Floor guidance (`src/stations/floor.ts`)

**Frontage zone.** Along each long wall of a spine's paid area (and of a spine room) the guidance keeps 2.8 m clear, so the walls can carry shop fronts. Bands and tactile paths cross that zone only at right angles, to reach a portal against the wall, a room mouth, an exit doorway or a gate lane. Where a corridor is too narrow for all its lanes the zone shrinks, never below 1.8 m (only Tsumugibashi's Kikyō spine, 2.1 m). Guidance claims only its own footprint plus 0.15 m. A stair inside a room reserves floor only in that room, and only 0.5 m is kept past a stairwell's closed end. On an interchange spine the default look then puts shop fronts on at least 70% of the free wall, with a service element about every 8 to 12 m.

Generated from the concourse info, the exits and the transfer passages; nothing is typed in per station. It runs after wayfinding and before the look's hooks, and everything it lays is `claim`ed, so a look does not build on it.

- **Line bands**: a 0.3 m band in each line's colour, white-edged, from just inside each gate line along the spine to that line's stairwell portals, or through a transfer bay's mouth to its portal, ending in a stepped arrowhead. One lane per line; bands cross only at right angles, and the crossing one is broken where it passes.
- **Tactile paths** (誘導ブロック): guidance blocks from each exit doorway through one gate lane to every stair head, with warning blocks (点状ブロック) at junctions, either side of the gates and across each stair head. The exit corridors carry a path to the foot of their stair (`floorExit`), and each transfer passage a path and a band in the colour of the line it leads to (`floorPassage`).
- **Floor marks** (the `floormark` sign kind, `signs/content.ts`): a large arrow with the line badge and the platform numbers (or のりかえ for a transfer stair) just inside each gate line, in front of each room mouth a band passes through and at each portal; the line's badge repeated along its band at each turn and about every 9 m.
- **How routes are found.** The concourse floor (spine, rooms and the floor across their mouths) is cut into a 0.6 m grid of lanes. Each path is a shortest route through the lanes (A\*, with a cost for each turn), kept clear of walls, stairwells, gates, pillars, machines and anything the kit has taken. Tactile paths are laid first; each band then takes lanes of its own, crossing others only straight across. For each platform of each line, a gate leads to the nearest portal that serves it. A band or mark that cannot be routed is left out rather than drawn through a wall, and if guidance fails for a station it is left off entirely.
- Everything is decoration within 15 mm of the floor (bands 2 to 5 mm, tactile 6 to 12 mm, marks at 13 mm), with no yellow exit band. **A look must keep off the floor guidance claims**: nothing solid there, and no floor inlay or painted lane between the floor and 15 mm above it where `free()` is false.

## Station looks (`src/stations/looks/`)

A line's theme shapes the platform hall; a station's **look** shapes everything else: the concourse, its stairwells and rooms, the exits and the transfer passages. A `StationLook` is a set of optional hooks (`finishes`, `concourse`, `bay`, `lights`, `pillar`, `exit`, `canopy`, `passage`) called by `concourse()`, `exit()` and the passage loop in `buildInterchange()`, plus the flags `posters: false` and `skirting: false`. The contract is `looks/types.ts`.

- Unlike a line theme, a look may add solid things (a kiosk is solid). It may only build where `ConcInfo.free()` is true: that keeps it off the stair openings and their landings, the stairwell footprints plus 0.3 m, the 2.5 m in front of each room mouth, the gate lines, machines, lockers, exit doorways, toilets, murals, pillars, lifts, the floor under hanging signs and the floor guidance. Rooms are never free. The walk test then proves every zone is still reachable.
- `ConcInfo` describes the concourse as a spine plus rooms: `cw` is the spine's half width, `footprint` the old outer wall, `openings` every gap in the spine's long walls (exit doorways and room mouths), `rooms` the transfer bays, second spine and cross passages (`ConcRoom`: kind, rectangle, mouths, stairs and the finished wall `faces` to dress), `stairwells` (walls, footprint, portal and fascia) and `toilets` (x of the toilet doors).
- The **`bay` hook** takes a `RoomInfo` (a `ConcRoom` plus the builder, finishes, `cf`, `clear`, its `index` and the whole `conc`) and is called once per room, after `concourse`, inside the same `Builder.guard`. It decorates only: the room's walls, mouths, stair openings and portals stay as the kit built them.
- `looks/parts.ts` is the shared library: shop fronts and presets (convenience store, kiosk, soba stand, bakery, café, flower stall, lockers, photo booth, vending row, ATM corner), beams, ducts, pipes, cable trays, lanterns, noren, banners, dados, poster rows, and exit and passage helpers. It also holds `SHOPS`, the catalogue of invented brands. Newer parts:
  - *wall faces*: `faceDado`, `facePosters` and `dressFace` dress any `WallFace` as `wallDado` does a long wall (a room's faces, say); `stairwellFaces` returns a stairwell's outer faces, with `end` marking the closed end;
  - *service elements*, each on a face or long wall, 0.12 m proud at most so they can line a corridor: `serviceDoor` (staff door, one or two leaves, labelled from `STAFF_ROOMS`), `shutter` (a closed shop with a brand sign or a "unit to let" notice), `ventGrille`, `hoseCabinet` (消火栓) and `meterCupboard` (分電盤). Where the info object has `free()` they check and claim their strip.
  - `doorways()` returns every opening, so dados, shops and posters skip room mouths. The island parts (`shopIsland`, `vendingIsland`, `benchIsland`, `totemRow`, `waitingRoom`) are still there.
- **The default look** (`looks/default.ts`) is what every station without its own gets. It follows the primary line's era and a per-station seed:
  - *old* (Y, N): tiled dado in the platform wall's colour, downstand beams every 4 m, a duct, cable tray and pipes, bare battens, square tiled pillars with adverts, small counters and kiosks, posters on every free wall;
  - *mid* (A, S): enamel dado, shallow coffers with light panels, a convenience store plus a bakery, café or ATM corner, benches;
  - *new* (K, M): pale panels, continuous light slots, fewer and larger glazed fronts, digital advert panels, benches and planters.
  - **On an interchange spine** both walls of the paid area are lined with a near-continuous run of shop fronts that are never entered, interleaved with staff doors, closed shutters, grilles, hose cabinets and meter cupboards: many small units, shutters and meter cupboards on old lines, a few long clean glazed fronts and flush doors on new ones. Where a transfer bay's stair landing lies behind the wall, only flat service elements go up, nothing solid. Every stairwell's outer walls get the dado and a poster or two, and its closed end a framed poster and, where the floor allows, a bench. The `bay` hook gives each room the dado, up to two posters and a ceiling of its era (a pipe bundle and a downstand beam; a coffer frame; a light cove along both sides).
  - **On an ordinary station** each wall gets a staff door and a hose cabinet, and on older lines sometimes a meter cupboard. Shop islands are gone from the interchanges: the default look places a single small bench-and-planter or vending island, and only at a new-line station with a 24 m concourse (half width 12).
- **Hero stations** have a look of their own, registered in `looks/index.ts`:

| Station | Look | Centrepiece |
|---|---|---|
| Hyōtanbori | A yokochō carried underground: black tile, gold, neon | Alley of tiny bars under lanterns and projecting signs; gold gourd charms on wires along the stairwell walls, which carry the doors of the bars that did not fit on the long walls |
| Tsurumatsu | The shōtengai continues underground | Arcade arch and awning-fronted stalls |
| Kurayashiki | Inside a kura: plaster, namako tile, dark timber | Kura front and a timber post-and-beam frame |
| Kamomehama | Stadium station on match day | Pennant ceiling, dome wall, queue lanes |
| Hoshimine | Under the night sky | Star-field ceiling and an orrery, at the far end of the paid area (the unpaid hall is crossed by floor guidance) |
| Tōmyōbori | The lantern canal at dusk | A canal of light down the middle of the spine's ceiling between timber banks, with lantern strings; the Tōmyō-bashi bridges are gateway frames across the spine; lantern-hung transfer passages |
| Aizomechō | The dyers' street | One dye yard of indigo lengths drying against a spine wall between the stairwells' closed ends, more lengths hung across the spine; noren gate and drying cloth in each transfer bay |
| Daigaku-mae | The campus undercroft | Brick arcade on the stretches of wall the corridor leaves free, and the noticeboard court (a cork wall facing a row of tatekan) on one bay |
| Tsumugibashi | 紬橋地下街, an underground shopping street: the corridors are the streets, each named on plates at its corners, with a weaving theme | Shops on the walls of Tateito-dōri (the Nagisa spine, low and timber) and Ayaori-dōri (the Kikyō spine, bright and glazed, with a woven tapestry); the Tsumugi Loom at Shuttle Crossing in the Nagisa spine |

To add a hero: write `looks/<station-id>.ts` following [Plans/features/station-looks/hero-brief.md](../Plans/features/station-looks/hero-brief.md), register it in `looks/index.ts`, and add a row here.

Not covered yet: elevated stations (their street-level concourse is built separately) and the hub.

## Wayfinding (`src/stations/wayfinding.ts`)

Passenger guidance away from the platforms. All of it is generated: nothing is typed in per station.

| Sign | Where |
|---|---|
| Portal headers: platform signs (line, platform number, "for <terminus>") and, on a transfer stair, the line and のりかえ | On the fascia of every stairwell portal. Inside the portal, facing people coming up, a second panel gives the way out and the other lines |
| Transfer signs | On the portal of each transfer stair, along transfer passages, opposite platform doorways |
| Mouth signs | Hanging across the spine beside each bay mouth (and, at Tsumugibashi, each mouth of the Kikyō spine), naming what lies through it, with arrows into it |
| Cross passage signs | Hanging across each cross passage, each face saying what lies beyond the mouth ahead of the reader |
| Signs inside rooms | On the wall at the end of a transfer bay's lobby, facing people coming up out of the portal: the way out and the other lines |
| Direction signs | 5.5 m inside each gate line, then about every 18 m through the paid area, each face listing the lines ahead and the exits |
| Exit signs (yellow, with numbers and landmarks) | Outside each gate line, pointing left and right to the two doorways; in each exit lobby; and halfway along any exit corridor over 8 m (Tsumugibashi's 22 m ones), hung across it: the exit number going out, the way to the gates coming in |
| Exit board (出口案内), station map (構内図), area map (周辺図) | On the walls of each unpaid hall; an exit board and station map inside the gates too. Only on solid wall: never across a doorway or a mouth |
| Pictograms | Toilets, station office, lockers, lift, tickets |

- **What the composers tell it.** `ConcInfo.stairs` says where each floor opening leads (line, platform numbers, platform or transfer stair, the point at its top and the way down); `ConcInfo.exits` lists the exit doorways, `ConcInfo.rooms` and `openings` the rooms and their mouths (routes between the spine and the rooms are worked out from them, so a sign points through the right mouth), and `ConcInfo.stairwells` the portals. Elevated stations pass an `ElevInfo`, transfer passages a `PassageCtx`.
- **Exit landmarks** come from `src/stations/exits.ts`, which works out from the station's spec where each numbered exit surfaces and what `surface()` builds there. `exits.test.ts` checks every exit's number, side and position against the built station. It copies a few constants from the builders (to avoid an import cycle); the test fails if they drift.
- **New sign kinds** (`src/signs/content.ts`, drawn in `draw.ts`): `exits`, `picto`, `stationmap`, `areamap`, and `floormark` (drawn on the floor by `floor.ts`: an arrow with the line badge and platform numbers). The station map is a level diagram from each line's rail level; the area map is a plan drawn the way `surface()` lays the street out. `boards.test.ts` checks that their text fits and that every exit and platform number appears.
- **Signs always win.** Each sign's surroundings are registered with `Builder.protect`; a look's decoration runs inside `Builder.guard`, which trims boxes and drops meshes that intrude. A look does not need to know where the signs are, but anything it hangs in front of a stair head or over a gate line will be cut. Floor guidance (see above) is laid after the signs and avoids the floor under hanging ones.
- The hub keeps its own signage.

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
