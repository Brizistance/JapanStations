# Akitsushima Railway (AR): future plans

**Status:** pass 1 done (2026-11-19): the Main Line is in the data, the timetable and on the route map (`RAIL_LINES` / `RAIL_STATIONS` in `network.ts`, `RAIL_NET` in `sim/index.ts`). Nothing is in the 3D world yet. Draft from 2026-11-18. Its viaduct through Kita-Ōdōri is built as scenery (2026-11-21, `hub-street.ts`, `build_viaduct.py`): four tracks at +9 m, two island platforms over the terminal's block, no trains and no times. The high-speed deck is no longer planned at this site. Station names below are drafts and have **not** been web-checked yet.

## The company

| | |
|---|---|
| Name | **秋津島鉄道 (あきつしまてつどう) Akitsushima Tetsudō**, English **Akitsushima Railway** |
| Short forms | **AR** on maps, numbering and timetables; **秋津 / Akitsu** in speech and on train sides |
| Meaning | *Akitsushima* is an old poetic name for Japan, so it reads as the national railway |
| Role | The JR analogue: regional and intercity trains, a commuter network, freight heritage, and (later) the high-speed line |
| History (draft) | Successor to the state railway, privatised in 1987. Built the first line through Kawaminato in 1889, which makes it the oldest railway in the city |
| Corporate colour | Deep teal `#0b6e6e` (clear of Y green, N blue and the metro's navy) |
| Map style | AR lines are drawn in the classic Japanese **black-and-white "railway" pattern**, not in a line colour. This keeps them apart from the six metro colours, as real Japanese metro maps do |
| Fare card | **HANECA (ハネカ)**, interoperable with MINACA |
| Regional company | **AR Ashihara (秋津島鉄道葦原)**, one of the companies from the 1987 split |

## Geography logic

Japanese main lines are older than the metro, ran on the surface, and followed the terrain:

- **Inland**, a main line follows the river valley. The Mio-gawa flows west to the bay, so AR comes **down the Mio-gawa valley from the east/north-east**, the direction of the rest of the country.
- **Along the coast**, it runs on the **old shoreline**, inland of the later reclaimed land. On the bay side, that means running **south along the edge of the old town**, toward the next city down the coast.
- It reached Kawaminato before the city grew, so the station sits at the **edge of the 1889 town**. Kita then grew up around the station, which is the Umeda story.
- **The port** had a freight branch. Since the waterfront was redeveloped, it carries passengers to the dome and the reclaimed islands.

## Proposed network (draft)

### 1. AR Main Line (本線): the trunk

It runs **north-east ↔ south-west** through Kawaminato Station on the viaduct, with the through-platforms used as reserved.

- **North-east (inland):** it climbs the Mio-gawa valley past the University district and out toward the east hills, then leaves the map toward the inland cities.
- **South-west (coastal):** it crosses the Mio-gawa on a **steel truss bridge** (a good visual landmark), runs along the old shoreline behind the merchant quarter, passes above the container port near Nankōdai, and leaves the map toward the coastal cities.

Draft in-city stations, with about 4–6 on the map:

| Draft | Kanji | Where | Metro interchange |
|---|---|---|---|
| **Kawaminato** | 川湊 | Kita, the hub | Kita-Ōdōri (Y, A, S, M) |
| Higashi-Kawaminato | 東川湊 | Kita east, by the civic district | Suzukakedōri (A), under a different name like Umeda/Higashi-Umeda |
| (university area) | TBD | Upper Mio-gawa valley | Kawaminato-daigaku-mae (N, S, M) or nearby |
| (east suburb) | TBD | East hills | Hibarino (N, K), where the N viaduct meets it |
| (south of the river) | TBD | Behind the merchant quarter | Aizomechō or Watayamachi (N, A, K) |
| (south port) | TBD | Above the container port | Nankōdai (Y) |

The termini are **off-map**. The boards show real timetable entries "for" named cities beyond the map edge (rule 6 still holds: these are real slots in the timetable, not invented times).

**Services**, in the JR-West pattern:

| Type | Kanji | Stops |
|---|---|---|
| Local | 普通 | All |
| Rapid | 快速 | Main in-city stations, then all stations beyond the city |
| Special Rapid | 特別快速 | Kawaminato and one or two others only; fast 12-car trains |
| Limited Express | 特急 | Named trains to far cities, with reserved seats. Kawaminato only in the city |

### 2. Bay branch: the old port freight line

It leaves the Main Line south of the river and runs west to **Kawaminato-kō** and then the **south bay** (Kamomehama, the Dome), like the JR Sakurazaki/Yumesaki story. It runs at street level and on a low embankment, and has a few stations:

- an interchange at Kawaminato-kō (N, K);
- a terminus at Kamomehama (A), the dome station, with crowd platforms and extra trains on event days.

### 3. Later or optional

- **High-speed line:** the reserved top deck at Kawaminato Station. AR runs it (decided), as JR runs the Shinkansen. Its trains leave toward the far cities and never stop in the city again.
- **Loop line:** an Osaka-Loop-style ring around the centre. It is probably too much for this city's size. The Main Line and the bay branch already do most of the job.
- **Airport line:** only if the world has an airport (none is named yet).

## Rolling stock and stations (look)

- **Commuter trains:** 4-door, 20 m stainless steel cars with a teal band. 8 cars on Local and Rapid, and 3-door 12-car sets on Special Rapid.
- **Limited express:** a named train with a distinctive nose (design TBD).
- **Stations:** above ground, on embankments and viaducts. Island platforms, steel canopies, and an older 1930s brick and iron station at Higashi-Kawaminato or the port. This makes AR the first railway to have **daytime outdoor platforms**, which no metro line has.
- **Signage:** AR's own sign style, not the metro's. White on dark grey with teal accents, and numbering like `AR-A 05` (TBD).

## Decisions (interview, 2026-11-18)

1. **Company:** regional split. The state railway was divided in 1987, and this region's company is **秋津島鉄道葦原 / AR Ashihara** (葦原, "reed plain", the river-delta region). The other regional companies exist off-map.
2. **Main Line:** north-east ↔ south-west, as drafted above.
3. **Off-map cities:** inland **霧ヶ原 Kirigahara** (a misty plateau city) and coastal **朝凪 Asanagi** ("morning calm", the pair of Yūnagihama). Not yet web-checked.
4. **First build:** the AR platforms at Kawaminato Station plus **Higashi-Kawaminato (東川湊)**: the older brick-and-iron station in the east of Kita, with a transfer to Suzukakedōri (A).
5. **Fastest commuter service:** **特別快速 Special Rapid**. **IC card:** **HANECA (ハネカ)**, from 羽 hane, "wing", with a dragonfly-wing logo (*akitsu* is an old word for dragonfly). It is interoperable with MINACA.
6. **High-speed:** AR runs it, on the top deck of Kawaminato Station.

## Implementation decisions (interview, 2026-11-19)

1. **Data extent:** all six in-city Main Line stations go in `network.ts` from the start. Only Kawaminato and Higashi-Kawaminato are hero builds. The Bay branch stays out of the data for now.
2. **Services:** Local and Rapid first, on a general service-type field, so Special Rapid and Limited Express are later only new rows.
3. **Map edge:** trains run past the last in-city station to an edge point. A rider who stays aboard gets a fade and is returned to the last station. Boards show Kirigahara / Asanagi.
4. **Daylight:** sky and sun follow the sim clock (morning, day, dusk, night), shared by all later outdoor stations.
5. **Hub:** AR **Kawaminato** is its own station with its own gates, linked to Kita-Ōdōri by a walking transfer through the atrium.
6. **Unbuilt stops:** a simple shared AR island platform (not the metro default), doors open, exits closed off as under construction. Replaced station by station.
7. **Length:** 8-car trains; Kawaminato and Rapid stops are built 12 cars long.
8. **Names (picked 2026-11-19, web-searched, no real railway station found):** numbering `AR-A01`…`AR-A06` from the north-east (line id `AR`, badge reads AR over A01).

| Station | Kana | Romaji | Where | Metro transfer |
|---|---|---|---|---|
| 鶯坂 | うぐいすざか | Uguisuzaka | East hills | Hibarino (N, K) |
| 澪上 | みおかみ | Miokami | Upper Mio-gawa valley | Kawaminato-daigaku-mae (N, S, M) |
| 東川湊 | ひがしかわみなと | Higashi-Kawaminato | Kita east | Suzukakedōri (A) |
| 川湊 | かわみなと | Kawaminato | Kita, the hub | Kita-Ōdōri (Y, A, S, M) |
| 紺屋浜 | こんやはま | Kon'yahama | Old shoreline behind the merchant quarter | Aizomechō or Watayamachi (TBD) |
| 舟見台 | ふなみだい | Funamidai | Bluff above the container port | Nankōdai (Y) |

Kirigahara (霧ヶ原) and Asanagi (朝凪) were searched the same day: no real station or city found.

## Pass 1 as built (2026-11-19)

- **Rapid** skips Higashi-Kawaminato and Kon'yahama (Claude's choice, not yet confirmed). Local and Rapid each run every 10 minutes, five minutes apart at Kawaminato.
- **Alignment (draft):** 150 m north of Kita-Ōdōri avenue through Kawaminato and Higashi-Kawaminato, rail level +9 m everywhere. To be matched to the reserved deck in `hub.ts` in pass 2, and lifted clear of the Nagisa viaduct by Uguisuzaka.
- **Uguisuzaka moved 60 m north (2026-11-22)** for the Hibarino rebuild: the valley run is 529.5 m, the hills run 661.9 m, and Miokami moved to 280 m along the valley to stay off the curve.
- **Miokami is about 570 m from Kawaminato-daigaku-mae**, on the other bank. It is listed as a walking transfer, but that is long; open point.
- **Kon'yahama** (settled 2026-11-24): the line was rerouted to turn south (R 120, round Kurayashiki's plot) and run 15 m past Aizomechō's west edge; it comes down from the viaduct to street level, Kon'yahama has temporary side platforms there (`rail.ts`), and a level crossing over Tsumugi-dōri (timetable gates, arrows, made bell; `LineDef.crossings`). Hanada-dōri has a second crossing (`key` 'konyahama-hanada'); Asagi-dōri ends at a lane along each side of the line (線路沿いの道), its traffic turning off at Shinshi-suji. Crossings (2026-11-24): gates on all four corners with 3D arms (down 5 s after the bell, over 6 s; up over 4 s once clear), name plates and emergency buttons on every mast, red lamp light at night, no wire masts in the road; the made bell is tuned to a reference recording (740 + 690 Hz, a strike every 0.47 s).
- **Not done:** the AR train model (20 m, 4 doors) and anything in 3D. Trains exist as timetable entries and live dots on the map.

- **Kon'yahama's design** (interview 2026-11-24): an old shore town; a 1930s wooden station house at the south end by the Tsumugi-dōri crossing on the east side, a footbridge with lifts, a small west wicket; west of the line one walkable block, 浜通 Hama-dōri and a tall sea wall with steps over it to a beach at street level (the edge of the map); landmarks a sentō, an Ebisu shrine and the memorial steps. Kon'yahama's world walks everything west of Aizomechō's plot edge; Aizomechō keeps the traffic (`shore.ts`). Stage 1 (the shore) built 2026-11-24. Stage 2 (2026-11-24): the house (Exit 1) on platform 1's side, the footbridge at x 64 with a lift at each end standing in the lanes (the platforms are too narrow for one), the Exit 2 wicket and ramp in the west lane; `rail.ts` `konyahama`/`konyaHouse`. The water past the beach is a 45 m inlet with a quay and the 問屋街 shore beyond (decided 2026-11-24): the route map shows land between Kawaminato-kō and Aizomechō, so no open bay here. **Mio-gawa bridge (澪川橋梁, 2026-11-24):** wherever a main line crosses water (`geography.ts`) its deck becomes a `'bridge'` (`world/structure.ts` `bridgesOf`): two oxide-red Warren through-trusses on a granite pier and abutments (`render/track.ts`); views to it kept clear by `VISTAS`. **Port quay across the inlet (2026-11-24):** brick warehouses, steel sheds, a harbour office, two cranes, boats and lorries on the port landfill's east quay, drawn as scenery from Kon'yahama's street (`konyahama-street.ts` `port`, models `tools/blender/build_port.py`).

## Pass 2 decisions (interview, 2026-11-23)

- **First physical stretch:** Kawaminato → Higashi-Kawaminato → Miokami. Kawaminato in full, with gates both under the arches on Ekiura-dōri and at deck level into the Mioya terminal; the other two get platforms only, entries later. Miokami gets its own design (this replaces decision 6 of 2026-11-19 for it).
- **Alignment as built in the data:** through Kita the Main Line's centre line is the viaduct's **south island**, 86.9 m north of the avenue, track offset 4.3 m (since stage 4 of the second build the tracks fan out at the station to the middle and south islands: see below); the north island (1·2) is kept for later lines. The valley and shore bends stay where the draft put them, so the valley run is 504 m at about 21° south of east. Miokami is at 250 m along it, rail level +6.5 m.
- **Miokami ↔ Kawaminato-daigaku-mae** stays a long walking transfer (about 545 m); the riverside walk and footbridge come in a later pass. Closer was not possible without AR crossing the Nagisa Line twice.
- **Trackbed:** brick-arch viaduct to Higashi-Kawaminato, then an earth embankment up the valley. **Line ends:** track stubs past Miokami and Kawaminato, fade and return.
- **Rapid** skipping Higashi-Kawaminato is confirmed.

- **AR car (built 2026-11-23):** `LineDef.car` gives a line its own car size and doors (AR: 20 m pitch, four doors; the metro's 18 m car is the default). Model `public/models/ar-car.glb`, from `build_metro_car.py -- --stock ar`. Local and Rapid run as separate train sets. Not visible in the game until the line joins the 3D world (trackbed stage).

- **Trackbed (built 2026-11-23):** AR is in the 3D world from Miokami to Kawaminato plus 320 m stubs (`LineDef.built`, `WORLD_NET`); trains beyond the stubs are not drawn. Through Kita the hub's viaduct models carry it (`built.modelled`); east of them `track.ts` sweeps a two-track brick viaduct (`deckAt` 'brick', rail level 8.8 m and up) and then a grassed embankment ('bank'). The viaduct models' rail head and contact wire now sit at the game's levels. The viaduct runs along the north edge of Suzukakedōri's plot, whose back row is cut back for it (`clearRailCorridors` in `stations/index.ts`). The four-track viaduct narrows to two tracks where the hub's models end (x 2360); the north pair simply stops there. No AR station is built yet: trains stop in mid-air at Higashi-Kawaminato and Miokami, nobody can board, and the fade-and-return waits for the stations.

## Kawaminato Station (interview and plan, 2026-11-23)

- **Model place:** a brick-arch under-viaduct station (Shimbashi / Yūrakuchō, Kobe's Motomachi). **Platforms:** the south island, 12 cars (hub x −125 … 127), over four street bridges, with half-height platform gates. The north island stays closed.
- **Layout (hub frame; rebuilt in stage 4a of the grand station, see below, which replaces what stood here first):** a free central passage x −12 … 12 under all six tracks; the Central Gate in a fence at x 12; a paid concourse x 12 … 28 with the lift to the south island; one stair up east to a mezzanine at +6.0 (x 23.9 … 28) and from it a stair up west to each island (x 23.9 → 16.4). The Mioya Gate is on Mioya's level 2, east third of the north wall (x 4 … 12), with a paid bridge over Ekiura-dōri (x 4.5 … 7.5) and a gallery inside the viaduct's south wall to the mezzanine. The lift serves concourse and platform only.
- **West bend moved 200 m west** (`AR_W1` x 1300) so trains leave along the hub's straight viaduct; the curve begins about 313 m west of the station and the hub's plain run west ends at 310 m (`AR_HUB_MODELS`). Kon'yahama (not built) moved about 56 m with it. Rail level on the viaduct is +9.15, as the models stand on the pavement.
- **Stage 1 built (models and data):** `build_viaduct.py` has `pf_<id>` pieces (platforms carried over every piece) and the station's five middle bays `hw8 hm8 he8 hl8 ho8`; `build_mioya.py` has the level-2 bridge door. Nothing of the station is walkable until stage 2 (`src/stations/kawaminato.ts`, not written yet); stage 3 is signs, boards, door and fade-return rules.

- **Stage 2 built (the walkable station, 2026-11-23):** `src/stations/kawaminato.ts`, called from `hub-street.ts`: platform floor and half-height gates (`psd()` with `ends`; `gateOpen()` now counts every service type), mezzanine, three stairs, the lift, the Central Gate hall and gate line, the gallery and bridge, and `mioyaGate()` on Mioya's level 2. You can walk from Ekiura-dōri or Mioya's level 2 to the platform and board; doors still open in mid-air at the stations not built, and there are no AR signs, boards or ticket machines yet (stage 3).

- **Stage 3 built (signs, boards, rules, 2026-11-23):** AR's own signs (white on dark grey; `arname` name boards and live `ardep` departure boards in `signs/draw.ts`), ticket machines without the metro's fare chart, a lamp under the canopy at every platform bay. `built.stations` lists the stops with platforms: doors open only there (`hasPlatform`, tested in `trains/system.test.ts`). A rider carried past the end of the track is brought back to Kawaminato's platform (`player.ts`; `HOSTED` in `stations/index.ts` gives a station inside another's plot its place). The HUD's departures panel lists AR trains on the AR platform. Still owed: the map and the guide treat every AR station as not built (`isUnbuilt`), and there is no AR fare chart.

**Build plan:** pass 2 adds the sim-clock sky, the viaduct and AR train in 3D, the Kawaminato Station platforms, Higashi-Kawaminato, and the shared platform for the unbuilt stops.

## Higashi-Kawaminato and Miokami platforms (built 2026-11-23)

- **Platforms only**, in `src/stations/rail.ts`, each a small world of its own on the swept trackbed (`RAIL_WORLDS` in `stations/index.ts`, kept out of `STATION_WORLDS`). Exits are boarded up until each station's own entry pass (`new-station`).
- **Higashi-Kawaminato:** one island 5.6 m wide and 8 cars long on the brick viaduct; riveted iron columns down the middle under a butterfly roof, a brick stair house (boarded), a glazed waiting shelter.
- **Miokami:** two side platforms 12 cars long on the embankment (`sideAt`), old-rail posts and a timber-boarded roof over the middle, a roofed timber footbridge between them. The station carries the wire on its own portals (`built.platformHalf`).
- Both use AR's half-height platform gates. The HUD names the metro station each is the change for, with the AR station in the zone line, as at Kawaminato.
- **Still owed:** the ways in; the map and guide still treat every AR station as unbuilt; no auditor run on these two.

## Announcements (built 2026-11-23)

AR speaks in its own three voices (`RF`, `RM`, `RC` in `src/audio/phrases.ts`; ids in `.env.local` as `ELEVENLABS_VOICE_AR_F`, `_AR_M`, `_AR_CAR`) and in JR West's wording under AR's name: 「のりば」, 「まいります」, the service type every time, the yellow tactile blocks, "We will soon be making a brief stop at…". Up (Kirigahara) is the female voice, down (Asanagi) the male. One approach melody for the whole line (`approach-AR`) and a short bell at departure (`depart-AR`), no per-station melody. A Rapid running through Higashi-Kawaminato is announced from where the train really is. Not done: stops lists for Rapids, car counts and queue marks. Bake only AR's clips with `npm run voice -- --voices RF,RM,RC`.

## Grand Kawaminato Station (plan and stage 1, 2026-11-23)

The plan, the owner's decisions and the auditor's corrections are in `Plans/stations/kawaminato-grand.md`: a 1914 red-brick station building on the viaduct's north side, a station square, Tokei-suji running north, three islands and six tracks. **Stage 1 built (the ground):** the hub's plot reaches north to z −285 (`Plot.north` in `world/builder.ts`); Kōka-dōri, the back quarter and the Hokuei-dōri arcade are gone; Ekimae-dōri (z −212), Tokei-suji (x 0), the square (z −204.5 … −145) and a hoarded building site (z −145 … −119) are laid in `hub-street.ts`. Stock rows stand where the purpose-built fronts will, the square has no bus or taxi loops yet, and the capsule hotel and karaoke tower lost with the back quarter are owed a new lot.
**Stage 2 built (the viaduct, 2026-11-23):** the widening is a second brick viaduct 13 m deep along the old one's north side (`build_viaduct.py` pieces `n<id>`, placed by `putNorth` in `hub-street.ts`): two more tracks (z −115.6, −107.0) and a third island, not reachable and not in use. The old pieces lost their north parapet, screens and wire masts. Owed: platform numbers are still 3·4 (renumbering waits for the track-use decision), the new island has no "not in use" boards, the plain run beyond the plot is still two tracks wide (`a8_lo`), and the central passage comes with the inside (stage 4).
**Stage 3a built (the station building's shell, 2026-11-23):** `tools/blender/build_kawaeki.py` (kind `kawaeki`): 188 m of red brick with stone bands, a domed great hall in the middle and a smaller dome at each end. Placed by `piece('kawaeki', …)` in `hub-street.ts`; the hall is walkable from its three doors on the square to the walkway under the tracks, and nothing else is entered. Not yet seen in the game (the browser pane was hidden): only Blender renders. Owed in stage 3b: the square's bus and taxi loops, purpose-built fronts on Ekimae-dōri and Tokei-suji, the two short arcades.

**Stage 3b built (the square and its fronts, 2026-11-23):** the square has a bus loop (two bays) west of its axis and a taxi loop east of it, each a detour off Ekimae-dōri's westbound lane round a planted island (`LOOP` in `hub-street.ts`; tested in `traffic.test.ts`), and a paved forecourt before the building. Two short arcades at z −168 … −162 (`ARC`): west x −178 … −116 ending at a game hall, east x 113.6 … 144 through to Chidori-suji; the capsule hotel and karaoke tower stand on their north sides. Eight period blocks to the 31 m line face the station and line Tokei-suji (`tools/blender/build_tokei.py`, kind `tokei`).

**Stage 4a built (the inside, 2026-11-23):** the owner chose brick piers over a clear span (a pier-free 24 m bay would leave under 5 m of height). The central passage is the hollow bays `ho8 ho8 he8` and the widening's `nh8` (`build_viaduct.py`; `hm8` and `hw8` are gone): free, 24 m wide, 8 m high, piers every 8 m under each track, three arches into the great hall (whose back wall now opens 24 × 8.15 m) and two out to Ekiura-dōri. The gate line is in a fence at x 12 (two gates since 4b, below); the concourse (`hl8 hs8`, `nc8`) has one stair up to a mezzanine that serves both islands; the middle island's stair is shut until stage 6. The Mioya gallery now runs along the south wall from the bridge's door to the mezzanine. The great hall has its dress (globes, dado, pilasters, departures, ticket windows). All of it is `src/stations/kawaminato.ts`.

**Stage 4b built (2026-11-23):** the metro's Exit 15 leaves Mioya's food floor by a doorway in its north wall, climbs north roofed under the central passage and comes out in the great hall's south-east corner (`EXIT15` in `kawaminato.ts`, built by `exit15()` in `hub.ts`; well x 10.5 … 13.3). Its lift stands in the hall's south-west corner, with its own corridor from the food floor. (It first stood free in the middle of the food floor and the passage; the owner found that awkward and it was moved the same day.) The fence at x 12 has two gates into the one concourse: the Hokuei Gate (北栄口) under the widening, by the great hall, and the Central Gate (中央口) under the middle island. The plan put the Hokuei Gate inside the great hall; it stands just behind it instead, because a gate in the hall would need the building's wing hollowed. Three ways run through the station building at street level where walkways under the tracks ended blind (`TUNNELS` in `build_kawaeki.py`: x ±31 through the wings, x 85.7 through the east pavilion). Owed in stage 6: a lift to the middle island (the Central Gate now stands where the south island's lift has its twin spot).

**Stage 5 built (platform dress, 2026-11-23):** each island has one long canopy of the 1910s its whole length (`platforms()` in `build_viaduct.py`): green riveted columns with arms to the eave beams, a low boarded gable on rafters, a valance along each eave, a glazed lantern on the ridge, hanging lamps. `platformPiece()` adds an enamel kana name plate on each column of the south island and "not in use" boards on every other frame of the other two islands. Platform numbers on signs wait for stage 6 (the tracks by direction).

## Kawaminato Station, bigger and grander (2026-11-23, second build)

Owner's answers: grand hall, vaulted concourses east and west of the passage (x ±(12 … 60), stopping at Mioya Nishi-dōri and Higashi-dōri), one 1914 iron-and-glass shed over all six tracks, a paid bridge concourse over the tracks at +16.5, and the tracks by direction (counting from the north: 1·2 closed, 3·4 towards Kirigahara on the middle island, 5·6 towards Asanagi on the south island). Stairs and lifts only: the kit has no escalator.
**Stage 1 built (the great hall):** the middle pavilion is 38 m wide and 23 m to its cornice, with a larger dome (`build_kawaeki.py`). The hall is a rotunda open into the dome (coffered inside, eye at about +36), with balconies at +6.0, a gallery ring at +16.5 and the departures over the opening to the passage. A stair hall either side (x ±(14 … 18.6)) has a dogleg stair round a spine wall and a lift to both galleries; off them a ticket office (east) and a waiting room (west) in the wings (x ±(19 … 28.5)). The doorway from the +16.5 ring to the bridge concourse is hoarded until stage 3. All game-side in the `piece('kawaeki', …)` callback in `hub-street.ts`. Next: stage 2, the vaulted concourses.
**Stage 2 built (the vaulted concourses; stairs redone the same day after the owner's walk):** paid concourses both sides of the passage, x ±(12 … 60), on the pier grid, with brick arches pier to pier (`vaults()` in `build_viaduct.py`; table `AR_BAYS` in `hub-street.ts`). Four gate lines (Hokuei and Central on each fence), a lift each side to platforms 3·4. Two platform stairs each side (`GROUPS` in `kawaminato.ts`), each one straight flight in a brick stair house: open between parapets up to a landing at +6.0, then walled up through the deck, with an arch through the house under the upper flight. The first build had mezzanines and tiled stair boxes hung under the deck; the owner rejected them (no white boxes through the vaults, no white tile against brick). The Mioya gallery ends at x 13 with its own stair down into the east concourse. The middle island's stairs are built and shut until stage 4. The ticket machines moved to a wall in the east fence south of the Central Gate. The ways through the wings at x ±31 are closed (`TUNNELS` in `build_kawaeki.py`). No shops yet (stage 5).
**Stage 3 built (the train shed and the bridge concourse):** one iron-and-glass arch over all six tracks, x −124 … 124, springing at +13 on the parapets, crown at about +32, a lattice rib every 8 m (`shed()` in `build_viaduct.py`: pieces `shed8`, `shedd8`, `shedx`, `shedscr`; laid in `hub-street.ts`). The island canopies and the wire portals are gone: the ribs carry the wire, and a lamp rail on iron standards runs down each island. The bridge concourse is a deck at +16.5 over x ±12, open to the shed, reached from the great hall's upper gallery through the Bridge Gate (橋上口, five gates at z −114.5); wings over the middle and south islands lead to a stair down each side (upper half open underneath, lower half boxed in iron), and the two lifts now serve concourse, platform and bridge. The middle-island stairs are built and shut until stage 4. No benches, kiosk or night lighting up there yet (stage 5).
**Stage 4 built (the tracks by direction):** at Kawaminato each direction has an island of its own and each service type a face of it (`fanAt` on the line in `network.ts`; `LineGeom.lateral(track, s, service)` in `sim/geometry.ts`; a train carries its service type in `TrainState.service`). Counting from the north: 1·2 not in use; 3 Local and 4 Rapid towards Kirigahara (middle island); 5 Rapid and 6 Local towards Asanagi (south island): the Rapids take the two inner tracks. The tracks fan out from the running pair 135 … 295 m either side of the station, on the old viaduct's four-track run (rails and wire: pieces `fane`, `fanw` in `build_viaduct.py`; no turnouts are modelled). Platform gates open for their own face's service only (`GatePart.service`); boards, the HUD and announcements take the number from `platformFor()`. The middle island is open: stairs from both concourses and the bridge, and a lift from the bridge only (the Central Gate stands under its place below). Owed: the voice clips for the new platform numbers and door sides are not baked (`scripts/gen-voice.ts`).
**Stage 5 built (the dress):** inside the gates, along the concourses' north wall between the piers: 駅弁 川湊軒, an Asanagi kiosk and the soba stand 高架庵 east; the bakery 麦の汽笛 and the gift shop 帆かけ屋 west; benches in the other bays. On the bridge concourse the coffee kiosk 喫茶 鉄傘 with a clock, and benches. A two-faced clock hangs in the central passage. Under the shed a large globe hangs from every second rib over both islands in use (|x| 36 … 116). Names are in `docs/worldbuilding.md`. Not done: a fare chart (there are no fares in the data to show), the great hall's wing rooms and stair halls, and the hall and bridge still look as bright at night as by day.
**Detail pass 1 (platforms and bridge, 2026-11-23):** owner asked for more detail and signs everywhere, all sign kinds, style mixed by area (enamel and brass in the hall and under the shed, modern AR boards in the concourses), as busy as a real terminal. Platforms: an enamel plate over each face on every second standard (number, service, destination), more departure boards (x ±40 and about ±88, each island its own direction), drink machines, a bin and an Asanagi kiosk booth on each island. Bridge: two sign frames (the platforms' whereabouts past the gates; the departures with a clock in the middle), a sign over each wing's mouth, planters, two more benches. Not added: printed timetable, line-strip and car-guide boards (`signs/boards.ts` reads only the Local's timetable, so they would be incomplete for AR), and a waiting shelter (no clear length of island inside x ±60).
- **Detail pass 2 (2026-11-23):** concourses and central passage dressed as a busy terminal: hanging guide signs at every turn (arrows worked out from each face), blue (3·4) and orange (5·6) floor lines from the four gate lines to the nearest stairs, live departures and a clock inside each gate, posters on the piers, notices on the stair houses, coin lockers and a hand-drawn street-level map in the alcove north of each Hokuei Gate. No timetable sheets or fare chart (rule 6).
- **Detail pass 3 (2026-11-23):** great hall dressed in 1914 style (enamel plates in brass frames): direction and floor plates in the rotunda, stair halls and both galleries, a clock facing the doors, a ground-floor map by the doors; the ticket office gets one four-window counter, a queue rail, a hand-drawn AR route map from data and ticket machines; the waiting room gets pews, live departures, a clock, posters and notices. No fares or printed times (rule 6).
