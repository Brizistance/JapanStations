# Akanesuji Line (third line)

**Status:** built (2026-11-18), all three stages.
**Companion plan:** [the Kita-Ōdōri hub](../../stations/kita-odori/plan.md).

## Goal

A third Kawaminato Metro line that cuts diagonally across the grid from the south-west bay to the north-east hills, giving the network a triangle of interchanges and turning Kita-Ōdōri into the city's big central station.

## Decided in the interview

| Question | Answer |
|---|---|
| Hub site | Grow Kita-Ōdōri |
| Line shape | Diagonal, south-west bay ↔ north-east, as a stair-step along the street grid |
| Second interchange | Aizomechō (with the Nagisa Line) |
| Name / colour | **Akanesuji Line 茜筋線 (あかねすじせん)**, code **A**, madder red `#b7282e` |
| Character | The newest and deepest line: full-height platform screen doors, modern finishes, 7 stations |
| New district asked for | Stadium / dome |

Note: the interview option showed the kanji as 茨筋線 by mistake. The intended name is **茜筋線** (茜 = akane, madder dye), which fits the textile theme of Tsumugibashi (silk) and Aizomechō (indigo).

## Route

The line follows two streets. South of the centre it runs north–south under **Akane-suji (茜筋)**, the dyers' street through the merchant quarter. North of the centre it turns east under **Kita-Ōdōri avenue (北大通)**, the avenue the hub is already named after, then turns north into the hills.

```
                                              Yamabukidai A-17
   Midorizaka Y-11                                 │
         \                                    Tsukimizaka A-16
          Kita-Ōdōri ═══ Suzukakedōri ────────────╯
   ╭───── Y-12 / A-14        A-15
   │          │
 Kō ── Aizomechō ── Tsumugibashi ── Daigaku-mae ── Hibarino
       N-12 / A-13      │
   │                Hyōtanbori
 Watayamachi A-12       │
   │                Tsurumatsu
 Kamomehama ─╯
   A-11
```

"Down" is south-west → north-east (A-11 → A-17), matching the Nagisa Line's west → east.

### Stations

| No. | Kanji | Kana | Romaji | District | Character | Rail level |
|---|---|---|---|---|---|---|
| A-11 | 鴎浜 | かもめはま | Kamomehama | South bay | **Stadium terminus.** Kawaminato Dome on reclaimed land; wide concourse with two gate lines for match-day crowds | −15 |
| A-12 | 綿屋町 | わたやまち | Watayamachi | Merchant quarter (south) | Cotton wholesalers' street, noren and shophouses | −17 |
| A-13 / N-12 | 藍染町 | あいぞめちょう | Aizomechō | Merchant quarter | **Interchange** with the Nagisa Line (existing station, rebuilt as an interchange) | −19.5 |
| A-14 / Y-12 | 北大通 | きたおおどおり | Kita-Ōdōri | Kita | **The hub.** See the station plan | −20.5 |
| A-15 | 鈴懸通 | すずかけどおり | Suzukakedōri | Kita (east) | Plane-tree avenue, civic and theatre district | −18 |
| A-16 | 月見坂 | つきみざか | Tsukimizaka | North-east slope | Quiet hillside neighbourhood, moon motif | −16 |
| A-17 | 山吹台 | やまぶきだい | Yamabukidai | North-east hills | New-town terminus, bus rotary, kerria-flower motif | −14 |

Name check: none of the five new names, nor 茜筋線, turned up as a real station or line in a web search on 2026-11-18. Suzukakedōri is the closest call: a real Tōkyū station is called Suzukakedai (すずかけ台). Different name, same tree. See open questions.

### Geometry (approximate; tuned at build so the tests pass)

- Alignment vertices `[x, z]`: `(150, 1400) → (1070, 1400) → (1070, −680) → (3000, −680) → (3000, −2300)`, 400 m radius corners. Three right-angle bends, each on plain track between stations.
- Station positions: Kamomehama `(440, 1400)`, Watayamachi `(1070, 800)`, Aizomechō `(1070, 0)`, Kita-Ōdōri `(1870, −680)`, Suzukakedōri `(2450, −680)`, Tsukimizaka `(3000, −1300)`, Yamabukidai `(3000, −2000)`.
- Station spacing: 1058 · 800 · 1308 · 580 · 998 · 700 m. Total about **5.4 km**, the longest line in the network (the others are 3–3.5 km).
- It crosses each existing line exactly once, at right angles, at a station. That is what the interchange code needs.
- It runs 7.5 m below the line it crosses at both interchanges, the same separation Tsumugibashi already uses. Bored tunnel the whole way: no open cut or viaduct.
- **Island platforms**, twin single-track tunnels (±5.5 m), same as the Yanagisuji Line. This lets Aizomechō reuse the Tsumugibashi pattern (side-platform line above, island-platform line below).

### Service

5-minute headway, 6-car trains, same acceleration and speed limits as the other lines. The timetable code works out the cycle and the number of trains (expect about 6).

## What changes in the code

1. **Data** (`src/data/network.ts`): the `A` line, five new stations, `A` numbers and platforms 3/4 added to Aizomechō and Kita-Ōdōri, diagram positions for the map.
2. **Full-height platform doors**: a per-line `platformDoors: 'half' | 'full'` field, and a full-height variant in the kit's screen-door part.
3. **Aizomechō** becomes `kind: 'interchange'`, keeping its indigo tile. Its Nagisa platforms stay where they are; an A island platform is added underneath.
4. **Five station specs** using the existing underground composer, with new mural variants (gulls, thread, plane leaves, moon, kerria) and one new surface feature (the dome at Kamomehama).
5. **Map**: third line on the route diagram and in the menu.
6. **Tests**: generalise the "interchange has both lines at the same point" test to every shared station; the walk test picks up the new stations automatically.
7. **Docs**: network.md, worldbuilding.md, station-design.md, vision.md and CLAUDE.md status updated when each stage lands.

The hub's own changes are in its station plan.

## Build order

Each stage ends with `npm test` and `npm run typecheck` passing and a look in the browser.

1. **Line running.** Data, alignment, red trains, map. All seven stops exist; the five new stations and Aizomechō are complete. Kita-Ōdōri gets its A platform with a plain, temporary connection to the existing concourse.
2. **Hub core.** The atrium, grand concourse, A-line escalator shaft, shopping street, meeting spot and plaza.
3. **Hub shells.** Reserved space for the future metro line, main line, private railway and high-speed line.

## Done means

- [x] `npm test` passes, including every interchange and the walkability of all 14 stations.
- [x] Trains run the full Akanesuji Line to timetable (5 trains, 25-minute cycle); boards, HUD and map read the same timetable.
- [x] You can transfer on foot A ↔ N at Aizomechō and A ↔ Y at Kita-Ōdōri (walk test).
- [x] Platform doors on the A line are full height and open with the trains (seen in the browser at Kita-Ōdōri).
- [x] Docs describe what was built.

Not checked by eye: riding the whole line end to end, and the in-car displays on an Akanesuji train.

## Open questions (left at their defaults; say if you want any changed)

1. **Suzukakedōri** is close to the real Suzukakedai. Keep it, or swap for another tree-avenue name (for example Enjudōri 槐通, "pagoda-tree avenue")?
2. **A river.** The 1.3 km run between Aizomechō and Kita-Ōdōri is the longest gap on the network. Worldbuilding mentions a river that isn't on the map yet. Should the line pass under it there, putting the river between the merchant quarter and Kita?
3. The four station names other than the stadium were my picks, since only the stadium was chosen in the interview. Change any you don't like.
