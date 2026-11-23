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
- **Kon'yahama** is about 90 m from Aizomechō (transfer set there). Its place and the line's course there now cross Aizomechō's rebuilt dyers' quarter (the dye yard and the headhouse): settle which moves before building AR in 3D.
- **Not done:** the AR train model (20 m, 4 doors) and anything in 3D. Trains exist as timetable entries and live dots on the map.

## Pass 2 decisions (interview, 2026-11-23)

- **First physical stretch:** Kawaminato → Higashi-Kawaminato → Miokami. Kawaminato in full, with gates both under the arches on Ekiura-dōri and at deck level into the Mioya terminal; the other two get platforms only, entries later. Miokami gets its own design (this replaces decision 6 of 2026-11-19 for it).
- **Alignment as built in the data:** through Kita the Main Line uses the viaduct's **south island (platforms 3·4)**, 86.9 m north of the avenue, track offset 4.3 m; the north island (1·2) is kept for later lines. The valley and shore bends stay where the draft put them, so the valley run is 504 m at about 21° south of east. Miokami is at 250 m along it, rail level +6.5 m.
- **Miokami ↔ Kawaminato-daigaku-mae** stays a long walking transfer (about 545 m); the riverside walk and footbridge come in a later pass. Closer was not possible without AR crossing the Nagisa Line twice.
- **Trackbed:** brick-arch viaduct to Higashi-Kawaminato, then an earth embankment up the valley. **Line ends:** track stubs past Miokami and Kawaminato, fade and return.
- **Rapid** skipping Higashi-Kawaminato is confirmed.

- **AR car (built 2026-11-23):** `LineDef.car` gives a line its own car size and doors (AR: 20 m pitch, four doors; the metro's 18 m car is the default). Model `public/models/ar-car.glb`, from `build_metro_car.py -- --stock ar`. Local and Rapid run as separate train sets. Not visible in the game until the line joins the 3D world (trackbed stage).

- **Trackbed (built 2026-11-23):** AR is in the 3D world from Miokami to Kawaminato plus 320 m stubs (`LineDef.built`, `WORLD_NET`); trains beyond the stubs are not drawn. Through Kita the hub's viaduct models carry it (`built.modelled`); east of them `track.ts` sweeps a two-track brick viaduct (`deckAt` 'brick', rail level 8.8 m and up) and then a grassed embankment ('bank'). The viaduct models' rail head and contact wire now sit at the game's levels. The viaduct runs along the north edge of Suzukakedōri's plot, whose back row is cut back for it (`clearRailCorridors` in `stations/index.ts`). The four-track viaduct narrows to two tracks where the hub's models end (x 2360); the north pair simply stops there. No AR station is built yet: trains stop in mid-air at Higashi-Kawaminato and Miokami, nobody can board, and the fade-and-return waits for the stations.

## Kawaminato Station (interview and plan, 2026-11-23)

- **Model place:** a brick-arch under-viaduct station (Shimbashi / Yūrakuchō, Kobe's Motomachi). **Platforms:** the south island, 12 cars (hub x −125 … 127), over four street bridges, with half-height platform gates. The north island stays closed.
- **Layout (hub frame):** a mezzanine at +6.0 over the central walkway (x −4 … 4); two stairs up to the platform (x ±2.5 → ±10); one stair down east to the Central Gate hall under the arches (bays x 4 … 28: paid side x 4 … 20 with the lift to the platform, gate line at x 20, a free through hall x 20 … 28 between Ekiura-dōri and Kōka-dōri). The Mioya Gate is on Mioya's level 2, east third of the north wall (x 4 … 12), with a paid bridge over Ekiura-dōri (x 4.5 … 7.5) and a gallery inside the viaduct's south wall to the mezzanine. The lift serves gate hall and platform only.
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
