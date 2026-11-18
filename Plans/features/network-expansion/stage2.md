# Network expansion, stage 2: the Kikyō Line

**Parent:** [plan.md](plan.md). **Builds on:** the route reserved in [stage1.md](stage1.md). **Status:** built 2026-11-18 (see "As built" at the end).

## Goal

Add the fifth Kawaminato Metro line. It's an outer loop-ish crosstown line through the south of the city that touches every other line. It adds three new stations and five interchanges, one of them Tsumugibashi, which becomes a three-line station.

## The line

| Item | Proposal |
|---|---|
| Name | **Kikyō Line 桔梗線 (ききょうせん)**, code **K**. Kikyō = Chinese bellflower |
| Colour | bellflower purple **`#7b4fa8`**, taken from the draft map (distinct from Sumire magenta) |
| Character | Built after Akanesuji/Shiokaze, so the same style: island platforms, full-height screen doors, twin tunnels (±5.5 m) |
| Curves | 250 m radius (tighter than the 400 m lines, so it can weave between the older lines) |
| Service | 5-minute headway, 6 cars. Train count is worked out by the timetable code (expect about 7) |
| Direction | "down" = Shinshio → Shin-Hibarino (K-11 → K-18) |

### Stations

| No. | Station | Kana | Rail | Where | New? |
|---|---|---|---|---|---|
| K-11 | 新潮 Shinshio | しんしお | −10 | (−350, −400): reclaimed bay front between the river mouth and the port. **Terminus** | new |
| K-12 | 川湊港 Kawaminato-kō | | −18.5 | Crosses **N** at right angles, 7.5 m below it | interchange |
| K-13 | 綿屋町 Watayamachi | | −10 | Crosses **A** at right angles, **above** it (A is at −17) | interchange |
| K-14 | 紬橋 Tsumugibashi | | −11.5 | Runs **beside N**, same depth, south of it; Y crosses under both | 3-line interchange |
| K-15 | 灯明堀 Tōmyōbori | | −21.5 | Crosses **S** at right angles, 7.5 m below it | interchange |
| K-16 | 雲雀野 Hibarino | | −12 | Crosses under **N's viaduct** at right angles | interchange |
| K-17 | 東ヶ丘 Higashigaoka | ひがしがおか | −12 | East hills, 500 m north of the N line and parallel to it | new |
| K-18 | 新雲雀野 Shin-Hibarino | しんひばりの | −10 | East new town. **Terminus** | new |

The route is the one reserved in stage 1. It turns at (320, −400), (320, 800), (1380, 800), (1560, 16.8), (2150, 16.8), (2508, 777), (4049, 58) and (3520, −1074) (to be fine-tuned so the tests pass). It's about 8 km long. Between stations it crosses no other line, which the existing clearance test will confirm.

Platform numbers:
- Kawaminato-kō: N 1/2, K 3/4.
- Watayamachi: A 1/2, K 3/4.
- Tsumugibashi: Y 1/2, N 3/4, K 5/6.
- Tōmyōbori: S 1/2, K 3/4.
- Hibarino: N 1/2, K 3/4.

## Stations in 3D

| Station | How it's built |
|---|---|
| Shinshio, Higashigaoka, Shin-Hibarino | New `underground` specs, each with its own finishes, mural and neighbourhood |
| Kawaminato-kō, Tōmyōbori | Switch to the existing **interchange** composer: the older line is primary and on top, and K's island platform crosses below. Both already have a concourse style and surface; they gain the second line's transfer passages |
| Watayamachi | Interchange composer with **K as primary** (on top), and A's island platform crossing below. This is the first interchange with an island-platform primary. The composer already supports it on paper; this tests it for real |
| **Hibarino** | **New composer: elevated + underground.** N stays on the viaduct, with its street-level concourse under it. K's island platform runs below the street, and its stair and escalator rise into the paid side of that same ground-floor concourse. One gate line serves both |
| **Tsumugibashi** | **Rebuilt as a three-line station** (an extension of the interchange composer). N stays primary, with the concourse over it. K's hall sits **beside N on the south side**, 16.78 m away (N's side-platform wall 8.58 + 0.5 structure + K's island hall 7.7). Transfers:<br>- K ↔ Y: a stair and escalator drop straight from mid-K-platform to the Y island below, Tokyo style.<br>- K ↔ N: the concourse widens south over the K hall, and K's own stairs rise into it.<br>- N ↔ Y: the north transfer passage stays as it is. The south one is removed, because the K hall now occupies that space. |

## Code changes

- **Data:** the K `LineDef`, 3 new `StationDef`s, and K numbers and platforms on the 5 shared stations. Tsumugibashi gets `at: { K: … }`.
- **"Beside" generalised:** the `S_BESIDE_A` constant becomes a function of the two halls (`besideGap(a, b)`, computed with `hallDims`). The interchange test and the hub-box test use it, and so does a new check that K sits beside N at Tsumugibashi.
- **Tests:** add the 5 K interchanges to the expected list, and expect `LINES.length` to be 5. Walkability covers the rebuilt stations automatically.
- **Route map:** K's reserved schematic positions from stage 1. The map currently draws a line only through its stations, but K needs two corners (below Kawaminato-kō, and above Hibarino). Lines gain an optional `diagramBends` (corner points per segment), used by the map lines, the live train dots and the fare-chart diagram.
- **Docs:** network.md (line table, station lists, transfers, platform numbers), worldbuilding.md (line, new stations, the bellflower name), station-design.md (the two new composers), vision.md, CLAUDE.md status.

## Open questions

1. Colour `#7b4fa8` and the island + full-height-doors style: OK?
2. Watayamachi with **K above A** (K's concourse is the station's main one). The alternative puts K below A at −24.5, which would make Tsumugibashi's level hard to reach.
3. Names: Shinshio 新潮 / Higashigaoka 東ヶ丘 / Shin-Hibarino 新雲雀野, readings as above.

## Done when

- `npm test`, typecheck and build pass.
- K runs end to end on the map and in 3D.
- All 5 interchanges are walkable, with signed transfers.
- Departure boards at every K station read the timetable.

## As built

- **Tsumugibashi, K ↔ Y: changed from the plan.** The direct stair from mid-K-platform down to Y wasn't possible. K's hall sits on Y's roof (0.6 m between them), and a stair that lands on Y's platform has to run along Y, which is *across* K's 8 m-wide island, so it would have cut the K platform in two. Instead, K's island stairs rise into the shared concourse (widened to ±31 m over both halls), and the south N ↔ Y transfer passage moved out past K's far wall rather than being dropped. K ↔ Y is one flight up and one down, all inside the gates.
- **Island primary at Watayamachi and Tōmyōbori.** The interchange composer used to cut doorways from the upper platform into the transfer passages. With an island on top, those doorways opened onto the trackbed (the walkability test caught it). They are now skipped for island primaries; the passages are reached from the concourse.
- **Hibarino:** as planned. The mezzanine is at −4.2. The K flight rises 6.7 m, and the second flight 4.4 m into the paid concourse.
- **Map:** to keep every label off K's lines, K got three corners (`diagramBends`), the east end of the map moved 60 units right, Hyōtanbori, Watayamachi, Tōmyōbori and Daigaku-mae changed label side, and the bottom of S moved down 10.
- New mural: **bellflower** (Higashigaoka).
