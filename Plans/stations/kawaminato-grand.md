# Kawaminato Station, made grand (sketch, 2026-11-23)

A sketch to argue with, not an agreed plan. Nothing is built. Coordinates are in the hub's frame (+x east, +z south).

## Decided (owner, 2026-11-23)

These replace the sketch below where they differ.

- **Site A, the north front.**
- **Six tracks, three islands:** one new island north of today's two, platforms 1 to 6. The viaduct's north face moves from z −106 to about z −119, so the building stands at about z −145 … −119, the square at z −205 … −145, and the plot's north edge at about z −285.
- **Local and Rapid are split:** each on its own island, four tracks live. The third island is marked not in use.
- **The arcade keeps its two ends,** opening onto the square.
- **Long separate canopies,** one per island.
- **Still open:** the names (square, avenue, gates), the building's year and story, and where the streets at x ±66 go. These belong to the interview at stage 0.

## Stage 0: interview and grid (2026-11-23, waiting for the owner's yes)

**Answers**

- **Model place:** Tokyo Station's Marunouchi side (brick building, square, avenue on its axis). No real name is copied.
- **Story:** the second station on the site, opened 1914. Its domes and top floor burned in 1945; it stood with flat roofs until it was restored to its first form in 2014.
- **Avenue:** Tokei-suji (時計筋), after the station's clock. Web check owed before it goes in.
- **Streets:** Mioya Nishi-dōri and Higashi-dōri (x ±66) end south of the tracks. A new east–west street along the square's north edge takes Kōka-dōri's traffic.
- **Below ground:** a new numbered exit from the north end of Kita-Ōdōri's concourse (floor −7, z −112) up into the central passage, with stairs, escalators and a lift.

**Measured**

- The Yanagisuji Line runs under the site from (x 0, z −104) to (x −29, z −300), rail at −12.5 … −13. Nothing else crosses it.
- The back quarter's lanes are at x −64, −32, 0, 32, 64 (z −160 … −120). The arcade is x −94 … 97, z −144.5 … −138.5: **all of it lies inside the building's footprint.**
- Walkways under the viaduct today: x −129, −32, 0, 32, 85, 131.

**Grid (hub frame)**

| What | x | z | Notes |
|---|---|---|---|
| Viaduct | −190 … 190 | −119 … −80 | North face moves 13 m north. Tracks at z −115.6, −107.0, −103.4, −94.8, −91.2, −82.6 |
| Platforms 1·2 (new) | −125 … 127 | centre −111.3 | Not in use |
| Platforms 3·4 | −125 … 127 | centre −99.1 | Rapid |
| Platforms 5·6 (today's 3·4) | −125 … 127 | centre −86.9 | Local |
| Central passage | −12 … 12 | −119 … −80 | Street level, free, about 7 m high. Gates off both sides |
| Station building | −100 … 100 | −145 … −119 | Three storeys. Great hall x −14 … 14; end halls x ±(72 … 92) |
| Station square | −100 … 100 | −205 … −145 | Bus loop west, taxi loop east |
| Ekimae-dōri (new) | −190 … 190 | centre −212, half 4.5, pavement 3 | Joins Hamate-suji, Shiomi-suji, Chidori-suji and Nishi-kōji, which all run on north |
| Tokei-suji (new) | centre 0, half 10, pavement 6 | −285 … −219 | Runs on 200 m past the edge. 31 m cornice either side |
| Plot's north edge | | −285 | Was −160 |

- **Gates** (as built in stage 4b the Hokuei Gate stands just behind the great hall, in the passage's fence, not in the hall): Hokuei Gate (北栄口) in the great hall, Central Gate off the passage, Mioya Gate (as today).
- **The arcade.** Since none of it lies outside the building, "keep its two ends" becomes: two short covered arcades re-laid from its kit, running east and west from the square's sides at about z −175 (x −190 … −105 and 105 … 190). This differs from what was agreed and needs the owner's yes.
- **Engineering to settle with the auditor:** the plot is a symmetric half extent today (x 190, z 160); growing only north needs a plot with its own north edge. The service split needs each type its own track pair at this station and a track fan inside the plain run either side (x 190 … 310).

## Corrections after the auditor (plan mode, 2026-11-23: FAIL, 6 blocks, 8 risks)

These replace the grid above where they differ. Item 7 changes what the owner agreed and waits for a yes.

1. **Building and square are x −94 … 96.5** (190.5 m), not ±100: Hamate-suji takes x −116 … −94 and Shiomi-suji 96.5 … 113.5.
2. **The two arcades are x −190 … −116 and 113.5 … 190,** with gaps where Nishi-kōji's line and Chidori-suji (144 … 166) cross.
3. **Kōka-dōri is removed along its whole length** (x ±190 and its 200 m run-on, three junctions, its bus stops), not only between ±100. Outside the building the back quarter's building line moves to z −122, with a 3 m service pavement along the viaduct's new face.
4. **The Mioya Gate keeps a gallery at +6.0** inside the viaduct's south wall, crossing the central passage as a bridge, with its own stairs to the islands. The passage is about 5.6 m clear under that bridge and 7 m elsewhere.
5. **The plot gets an optional north reach** (not a symmetric 285, which would swallow Tsumugibashi's boulevard end). Readers to change: `stations/index.ts` (frame radius, rail corridors), `builder.ts`, `Scene.tsx`, `world-view.ts`, and every use of `Z` in `hub-street.ts`.
6. **Ekimae-dōri meets Hamate-suji, Shiomi-suji and Chidori-suji** and runs on past both edges. Nishi-kōji is not carried north (it does not exist north of the viaduct today).
7. **Platforms by direction, not by type** (owner's yes, 2026-11-23). Putting Rapids on one island and Locals on another makes the Rapid cross the Local's opposite track on the flat at both ends. Pairing by direction avoids every crossing and is how JR West's four-track stations work: platform 3 Rapid and 4 Local towards Asanagi on one island, 5 Rapid and 6 Local towards Kirigahara on the other, so you change between Local and Rapid across the platform. Platforms 1·2 stay not in use.
8. **The service split is a shared change,** not only the sim: one platform pair per line in `types.ts`, track geometry without a service in `geometry.ts` and `sim/index.ts`, platform gates, the `ardep` board, `departures.ts`, the AR phrases, and about 15 readers after them. Full test suite; `platform.test.ts` pins Rapid up at platform 4 today.
9. **The track fans are modelled** as new viaduct pieces in `build_viaduct.py` (today every piece bakes straight rails), from the platform ends out to the end of the hub's plain run (about 185 m each side).
10. **Walkways under the viaduct:** x ±32 and 85 become side doors into the building's ground floor; x −129 and 131 stay open to the back quarter. Their signs lose the arcade and Kōka-dōri.
11. **The central passage needs a new 24 m bay** in the viaduct models, or 12 piers stand in it. Every viaduct piece grows from 26 m to 39 m deep.
12. **The new metro exit is Exit 15** (as built it goes through the north wall at x 10.5 … 13.3 and comes up in the great hall's south-east corner). It rises through the north wall of Willow Court's food floor (slab, counters and a mural stand there today), needs its own zone and `exits.ts` entry, and its lift stands at x 8 or more, clear of the Yanagisuji tunnel's crown.
13. **Tests to expect work in:** `traffic.test.ts` (every hub junction, ten minutes), `exits.test.ts`, `walk.test.ts`, `platform.test.ts`.

Not checked by the auditor: Midorizaka's plot extents, the AR car's width against the islands. Nothing was run.

## What the owner asked for

- A station in the manner of Tokyo Station: a **station building**, a **square and avenue**, **more platforms and tracks**, and a **grand inside**.
- Style: **red brick, 1910s**, an invented design.
- Site: for me to propose.
- Everything that stands today may change, including the platforms and viaduct built this week.

## What stands today (measured)

| z (north → south) | What |
|---|---|
| −160 … −120 | Back quarter: Hokuei-dōri arcade (z −144.5 … −138.5) and rows of small buildings |
| −117 … −108 | Kōka-dōri, along the viaduct's north face |
| −106 … −80 | The viaduct: 4 tracks, 2 islands, rail at +9.15. Only the south island (platforms 3·4, x −125 … 127) is open |
| −80 … −74 | Ekiura-dōri, a service lane. Central Gate hall under the arches at x 4 … 28 |
| −74 … −19 | Mioya Terminal Building, x ±59. Mioya Gate on its level 2 |
| −11 … 11 | Kita-Ōdōri avenue |

- The hub's plot is x ±190, z ±160. Streets cross the viaduct at x −155, −105, −66, 66, 105 and 155.
- **North of the plot is free.** The nearest station that way is Midorizaka, about 860 m off. East and west the AR line itself runs on.
- South of the viaduct there is no room: the lane is 6 m wide and Mioya starts at once.

## Three sites

| | Site | What it gives | What it costs |
|---|---|---|---|
| **A** | **North front** (recommended). The brick building stands along the viaduct's north side and faces a new square and avenue running north. | The two-sided station Tokyo has: old brick front on one side, the commercial terminal (Mioya) on the other. Room for everything asked. Mioya and the metro below are not touched. | The middle of the back quarter and of the arcade goes. The plot grows north. |
| B | South front. The building takes Mioya's place and faces the avenue and Yanagi-suji. | The front is on the city's main axis, seen on arrival from the metro. | Mioya is demolished: the grand concourse, the stair from Willow Court and the metro's way up all hang on it. The largest and riskiest job in the project. No room for more platforms. |
| C | Above the tracks. A building bridges the viaduct, with fronts both ways. | Smallest footprint. | It reads as a modern over-track station, not a 1910s brick one. No square. |

## Sketch of site A

```
 north
   z −300   ┆        avenue (new, on the x 0 axis)        ┆
   z −220   ┌──────────────── station square ──────────────┐   taxi and bus loops,
            │                                              │   trees, a clear view
   z −158   ├──────────── STATION BUILDING ────────────────┤   of the whole front
            │ dome hall     great hall (dome)    dome hall │   x −100 … 100, 3 storeys
   z −132   ╞══════════════════════════════════════════════╡
            │  platforms 1·2      (new island)             │
            │  platforms 3·4      (new island)             │   viaduct widened north
            │  platforms 5·6      (today's north island)   │   by 26 m: 8 tracks,
            │  platforms 7·8      (today's south island)   │   4 islands
   z −80    ╞══════════════════════════════════════════════╡
            │ Ekiura-dōri │  central passage ↕ at street level, under all tracks
   z −74    └──────── Mioya Terminal (unchanged) ──────────┘
 south
```

- **Building.** About 200 m long and 26 m deep, three storeys of red brick with pale stone bands and a slate roof. A domed great hall in the middle on the x 0 axis and a smaller domed hall near each end, with a clock over the main door. Modelled in Blender, like Mioya and the viaduct.
- **Square and avenue.** A paved square about 200 × 60 m with taxi and bus loops at its sides, and a new avenue running north from its centre. The plot's north edge moves from z −160 to about z −300.
- **Platforms.** Two new islands north of today's two, so four islands and eight tracks, each 12 cars long. Kōka-dōri is lost between x −100 and 100.
- **Inside.** A free central passage at street level under all eight tracks, about 24 m wide and 7 m high, from the great hall to Ekiura-dōri and Mioya. Gate lines open off it, with stairs, escalators and a lift to every island. It replaces today's Central Gate hall and mezzanine. The Mioya Gate stays.
- **What stays as it is.** The Mioya Terminal, the metro station below, the avenue and the front quarter.

## The hard question: what runs on eight tracks

The timetable has two services (Local and Rapid) on one pair of tracks. A platform with no trains must say so; boards never show invented times. Three ways:

1. **Build eight, use two** (cheapest). Six platforms carry "not in use" boards, as the north island does today. Honest, but a quiet terminal.
2. **Split the services** (recommended). Rapids use one island and Locals another, so four tracks are live and trains overtake here. This needs the sim to give each service its own track pair at this one station, and a track fan either side. It is the riskiest single piece.
3. **New services** for the other islands: the Bay branch or a terminating service from `docs/akitsushima-railway.md`. This means new lines in the data and is a project of its own. Until then those islands are reserved.

## Stages

Each ends in something that runs, and is walked by the owner before the next.

0. **Interview and checks** through the `new-station` skill: names (square, avenue, gates), the building's invented opening year, which streets close. Auditor on the plan.
1. **Ground.** Grow the plot north, clear the middle of the back quarter, cut the arcade back to its two ends, lay the square, the avenue and the loops. Full test suite.
2. **Viaduct.** Widen it to eight tracks in `build_viaduct.py` and add the two islands. Platforms are renumbered 1 to 8.
3. **Building shell.** The brick front, roofs and domes, seen from the square. Not yet entered.
4. **Inside.** Great hall, central passage, gates, and the ways up to each island. The old gate hall and mezzanine are removed.
5. **Platform dress.** Long canopies of their own design (not Higashi-Kawaminato's iron butterfly roof), signs, boards.
6. **Track use.** Option 2 above, if chosen.
7. **Upkeep.** Platform-number announcements re-made, map, docs.

## Costs and risks

- **Size.** This is the largest single build so far: at a guess six to eight sessions, most of them in Blender scripts and `hub-street.ts` (82 KB).
- **This week's work.** `kawaminato.ts` is mostly rewritten. The platform floor, gates and signs carry over; the mezzanine, stairs and gate hall do not.
- **Renumbering.** Today's platforms 3·4 become 7·8, so about 20 AR voice clips are generated again.
- **The arcade.** Its middle third is lost. Its ends can stay as two short arcades either side of the square.
- **Frame rate.** The hub is already the heaviest place in the game, and this adds a 200 m building.
- **Not measured yet:** the metro tunnels under the new square, and where the local streets at x ±66 go once the building stands across them.

## Open questions for the owner

1. Site A, or one of the others?
2. Eight tracks, or is six (three islands) grand enough? Six saves 13 m and half the track-fan work.
3. Which answer to "what runs on eight tracks"?
4. Does the arcade keep its two ends, or move somewhere else whole?
5. Should the platforms have a great arched train shed over all tracks (grander, less like Tokyo) or long separate canopies (like Tokyo)?
6. The building's year and its story: AR's first line here dates from 1889, so a building of about 1912 would be the second station on the site.
