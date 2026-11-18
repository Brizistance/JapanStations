# Shiokaze Line (fourth line)

**Status:** built 2026-11-18, all three stages (see "Progress" at the end).
**Builds on:** the empty B4 box at [Kita-Ōdōri](../../stations/kita-odori/plan.md), which was built for this line.

## Goal

Add a fourth Kawaminato Metro line. It opens the hub's waiting metro box, puts the city's river on the map, and reaches two parts of the city that have no service yet: a north-west waterfront and a south-east canal district.

## Decided in the interview

| Question | Answer |
|---|---|
| Route | River line: west along the river to a new waterfront, east through the hub, then south-east |
| Name | **Shiokaze Line 汐風線 (しおかぜせん)**, "sea breeze". Code **S** |
| Character | Newest line, Akanesuji style: island platforms, full-height screen doors, modern finishes, the same train model in a new colour |

Proposed colour: **sunset orange `#ee7b1a`**. It is the most distinct option from Y green, N blue and A red, and it suits a line that ends at a west-facing bay. Teal was the other candidate (see open questions).

## The fixed point: the hub box

The box at Kita-Ōdōri lies **directly south of the Akanesuji platforms and parallel to them**. Its geometry is in `platforms()` in `src/stations/hub.ts`:
- **Size:** 15.4 m wide, built for an island platform with tracks at ±5.5 m.
- **Position:** its centreline is **15.9 m south of A's centreline**, so z = −664.1.
- **Depth:** it is at A's depth, rail −20.5.

Through the hub, then, S runs east–west beside A, not across it. This is the first interchange where two lines run side by side, and it drives most of the code changes below.

## Route

```
                    Kita-Ōdōri S-13 (beside A-14, under Y-12)
 Yūnagihama ─── Kurayashiki ═══╪═══╗   ← parallel to A for ~350 m, then splits south
   S-11            S-12        │   ║
   (river mouth)  ╲ A curves   │   ║
                   south       │   ╚══ Kawaminato-daigaku-mae S-14 / N-14
                                           │
                                       Tōmyōbori S-15
                                           │
                                       Sakurazutsumi S-16
```

"Down" runs west → south-east (S-11 → S-16), matching N's west → east and A's south-west → north-east.

### Stations (names provisional, each to be web-checked at build as for Akanesuji)

| No. | Kanji | Kana | Romaji | District | Character | Rail |
|---|---|---|---|---|---|---|
| S-11 | 夕凪浜 | ゆうなぎはま | Yūnagihama | North-west waterfront (new) | **Terminus at the river mouth.** Redeveloped waterfront, sunset promenade over the bay | −10 |
| S-12 | 蔵屋敷 | くらやしき | Kurayashiki | Riverside (new) | Old rice-storehouse quarter on the river's north bank: white-plaster godowns turned into cafés | −11 |
| S-13 | 北大通 | きたおおどおり | Kita-Ōdōri | Kita | **The hub.** Opens the B4 box | −20.5 |
| S-14 / N-14 | 川湊大学前 | かわみなとだいがくまえ | Kawaminato-daigaku-mae | University | **Interchange** with the Nagisa Line. Existing station, rebuilt as an interchange | −18.5 |
| S-15 | 灯明堀 | とうみょうぼり | Tōmyōbori | South-east canals (new) | "Lantern canal": canal-side lantern festival, small temples; Hyōtanbori's quieter cousin | −14 |
| S-16 | 桜堤 | さくらづつみ | Sakurazutsumi | South-east (new) | Terminus by a cherry-lined river embankment and park | −12 |

That gives six stations, four of them new, and about **4.1 km** of route.
- **Platform numbers:** Kita-Ōdōri becomes Y 1/2, A 3/4, S 5/6; Daigaku-mae becomes N 1/2, S 3/4.
- **Nearest real names:** "Kurayashiki" is a historical term, not a known station. Yodomachi stays unused because 淀 is too close to Osaka's real Yodo river.

### Geometry (approximate; tuned at build so the tests pass)

- **Alignment** `[x, z]`: `(130, −664.1) → (2498, −664.1) → (3470, 1420)`, with radius 400 m (to be tuned).
  - **West:** a straight line along a riverside street.
  - **East:** one 65° bend that turns S onto a heading 25° east of south. That makes it cross the Nagisa Line at right angles exactly at Daigaku-mae, `(2735.3, −156.4)`.
- **Station positions:**
  - Yūnagihama `(420, −664.1)`
  - Kurayashiki `(1100, −664.1)`
  - Kita-Ōdōri `(1870, −664.1)`
  - Daigaku-mae (existing point)
  - Tōmyōbori ≈ `(3052, 523)`
  - Sakurazutsumi ≈ `(3349, 1157)`
- **Spacing:** about 680 · 770 · 1150 · 750 · 700 m.
- **Clearances from the other lines:**
  - **The Akanesuji Line, once, between stations.** West of the hub, A curves south towards Akane-suji and crosses the path of S at about x = 1358. S has to be **at least 7.5 m above A** there. Kurayashiki at −11 lets the profile rise enough: about −12.4 for S against A's −20.2. If the eased profile falls short, add an optional intermediate profile point to `LineDef`.
  - **Y and N** are passed under at stations: Y at the hub and N at Daigaku-mae, both 7.5 m below. Nothing else crosses.
  - **Beside A east of the hub:** S runs next to A for about 350 m before splitting south. It passes south of Suzukakedōri's station box, roughly 30–60 m away, which must be checked at build.

### Service

5-minute headway, 6-car trains and the standard speed and acceleration figures. The timetable code works out the cycle and the number of trains (expect about 5). Both termini get the usual 290 m turnback siding.

## The river

Worldbuilding mentions a river that isn't on the map yet; this plan places it. It flows west at about z ≈ −450, between Kita and Central, passing over Y and A in their long gaps (which answers Akanesuji open question 2). Near the bay it turns north-west to meet the sea beside Yūnagihama.

It appears in three places:
- on the route diagram, as a pale band;
- in Yūnagihama's surface, as a river-mouth quay and promenade (reusing the `quay` feature);
- in Tōmyōbori's surface as a canal (reusing the canal and bridge feature).

It is not modelled anywhere else. The river needs a name (see open questions).

## What changes in the code

1. **Data model: side-by-side interchanges.** Add an optional per-line position to `StationDef`: `at?: Partial<Record<LineId, { x: number; y: number }>>`. When it is set, a line's platforms are centred there instead of at `position`.
   - `LineGeom` (`src/sim/geometry.ts:55`) projects that point.
   - The tests accept two kinds of interchange:
     - **crossing:** the same point, at right angles and different depths (as now);
     - **parallel:** parallel alignments, the same depth, offset by exactly the hub box's 15.9 m. The test checks that number against `hallDims`.
   - Kita-Ōdōri gets `at: { S: { x: 1870, y: −664.1 } }`.
2. **New test:** any two lines that cross *between* stations must be at least 7.5 m apart vertically at the crossing. This guards the S/A crossing and any future ones.
3. **Network data** (`src/data/network.ts`): line S, four new stations, S numbers and platforms added to Kita-Ōdōri and Daigaku-mae, and diagram positions.
4. **Hub** (`src/stations/hub.ts`): open the shell, following the recipe in station-design.md.
   - **Platforms:** replace the bare box with a real `hall()` for S, with full-height doors, live boards and name boards.
   - **Access:** stairs and an escalator from the S island up into the stub passage. The passage's hoarding becomes the way through, inside the paid area, so A/Y ↔ S transfers need no gates.
   - **Clean-up:** remove both `keepOut`s and the "reserved" signs.
   - **Windows:** the windows in A's south wall now look across at S trains.
   - `buildHub` takes a third line context.
5. **Daigaku-mae** becomes `kind: 'interchange'` and keeps its brick. N's side platforms stay above, and the S island goes below at 90°, the same pattern as Aizomechō.
6. **Four station specs** using the underground composer. Each gets a new mural:
   - Yūnagihama: sunset waves
   - Kurayashiki: storehouse namako-wall pattern
   - Tōmyōbori: lanterns
   - Sakurazutsumi: cherry blossom

   Surface features: the river-mouth quay, godown-style buildings, the canal and a riverside park.
7. **Map** (`src/ui/MetroMap.tsx`): the fourth line and the river band.
8. **Tunnels:** for about 350 m either side of the hub, the S and A tunnels run with track centres about 5 m apart. Check from the cab that the swept tunnels in `src/render/track.ts` don't show each other's walls. If they do, draw one shared double box under the avenue where the lines run side by side.
9. **Docs:** update network.md, worldbuilding.md (line, stations, river, districts), station-design.md (the hub's B4 is no longer a shell), vision.md and CLAUDE.md status.

## Build order

Each stage ends with `npm test` and `npm run typecheck` passing and a check in the browser.

1. **Line running.** Data-model change and tests, alignment and profile, orange trains, map. The hub gets its S hall with a plain stair to the stub passage; all six stops exist, with the new stations on default specs.
2. **Stations.** The Daigaku-mae interchange, then the four new station specs with their murals and surface features.
3. **Polish.** The river on the map and at the riverside stations, the hub's proper escalators into the passage, name web-checks, docs.

## Done means

- [ ] `npm test` passes: the parallel interchange at Kita-Ōdōri, the crossing interchange at Daigaku-mae, S/A crossing clearance, and walkability of all 18 stations.
- [ ] S trains run to timetable. Departure boards, HUD, in-car displays and map all read the same timetable.
- [ ] You can transfer on foot S ↔ A/Y at Kita-Ōdōri and S ↔ N at Daigaku-mae (walk test).
- [ ] Riding S end to end in the browser: no tunnel walls clipping beside A, and trains visible through the hub windows.
- [ ] Docs describe what was built.

## Open questions (defaults in bold; say if you want any changed)

1. **Colour:** **sunset orange `#ee7b1a`**, or teal (on theme for "sea breeze", but close to Y's green on the map)?
2. **Station names:** the four new names are my picks and still need web-checking. Change any you don't like.
3. **River name:** I'll propose a few names, web-checked, in stage 3, unless you have one in mind.
4. **Interchange at Daigaku-mae** rather than adding a new Nagisa station between N-13 and N-14. Adding one would mean renumbering N-14 and N-15, so the default is **reuse Daigaku-mae**.

## Progress

**Stage 1 (2026-11-18): line running.**
- **Data:** line S and four new stations are in the network data. `StationDef.at` holds per-line platform centres; Kita-Ōdōri uses it for S. The alignment came out as planned: S crosses A at (1358, −664) with 7.9 m between rail levels, and runs 5 trains on a 25-minute cycle.
- **Hub:** the B4 box is now a working S hall with full-height doors, live boards and windows shared with the Akanesuji hall. A stair and escalator climb through an enclosed shaft into the old stub passage, which opens off the paid concourse. With no beside line, `buildHub` still draws the shell.
- **Daigaku-mae** became an interchange in this stage rather than stage 2, because it was only a spec change.
- **Placeholder specs** for the four new stations: colours and surfaces are chosen, but murals reuse existing ones.
- **Tests:**
  - parallel interchanges;
  - a check that the hub box fits the beside line;
  - a clearance test for lines crossing between stations.
  - The walk test's grid key now rounds consistently at cell edges. Before, a point against a wall and the first step through a doorway could share a cell, which stopped the flood at the new shaft.
- **Checked in the browser:** the route map; the S platform, signage and full-height doors at the hub; an S train boarding at platform 5 with the doors aligned; the tunnel beside A east of the hub (no clipping); the S platform at Daigaku-mae. No console errors.
- **Not yet done:** docs (stage 3), new murals and features (stage 2), and riding the line end to end.

**Stage 2 (2026-11-18): stations.**
- **New murals** in `signs/draw.ts`:
  - `sunset` for Yūnagihama;
  - `namako` for Kurayashiki, also used as the base of the storehouse walls;
  - `lanterns` for Tōmyōbori;
  - `sakura` for Sakurazutsumi.
- **New surface options** in `stations/surface.ts`:
  - a `godown` block style: white kura storehouses with namako bases, black roofs and some cafés;
  - `waterfront: 'promenade'`: a boardwalk, benches and a breakwater lighthouse, instead of the port with cranes and the ferry;
  - `canalName` and `canalLanterns`;
  - `parkName`;
  - `treeLeaf`, for cherry trees.
- **Fixes found on the way:** the canal bridge and park gate used to hard-code "Hyōtan-bashi" and "Midorizaka Park". Both are parameters now, defaulting to the old names, so Hyōtanbori and Midorizaka are unchanged.
- **Checked in the browser:** street level at all four stations, and the lantern mural in Tōmyōbori's concourse.
- **Noticed, not fixed:** the generic city backdrop shows buildings across the water at Yūnagihama, where open bay would be better. Kawaminato-kō has the same backdrop.

**Stage 3 (2026-11-18): river, names, docs.**
- **River name:** 澪川 Mio-gawa (*mio* = a navigable channel). It is labelled on the route map's river band, between Yūnagihama and Kurayashiki, and has a 澪川 河口 marker at the Yūnagihama promenade.
- **Name checks:** 汐風線, 夕凪浜, 蔵屋敷, 灯明堀, 桜堤 and 澪川 were each web-searched; no real station, line or river came up. 蔵屋敷 is only the Edo-period warehouse term.
- **Docs updated:** network.md, worldbuilding.md, station-design.md, conventions.md, vision.md, CLAUDE.md and README.md.
- The hub's escalator into the passage was already built in stage 1.

**Open questions, answered by default:**
1. Colour: orange.
2. Station names: kept.
3. River name: Mio-gawa.
4. Interchange: reused Daigaku-mae.

Say if any should change.

**Still not checked by eye:** riding the whole line end to end, and the in-car displays on a Shiokaze train.
