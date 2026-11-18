# Network expansion, stage 3: the Sumire Line

**Parent:** [plan.md](plan.md). **Status:** built 2026-11-18 (see "As built" at the end).

## Goal

Add the sixth line. Unlike every line so far, it **shares track**: Sumire trains run on the Shiokaze Line's tracks from just east of Kita-Ōdōri to Hanamizuki, as an express that skips Tōmyōbori and Sakurazutsumi. That is the new piece of simulation work. Most of the rest is reused.

## Decided

| Question | Answer |
|---|---|
| Name, code, colour | **Sumire Line すみれ線 (すみれせん)**, code **M**, violet-magenta **`#c2368f`** (from the draft map; distinct from Kikyō purple). Sumire = violet |
| Character | Island platforms, full-height screen doors, twin tunnels: the same as S, whose tracks it shares |
| Hub platforms | **A new B4 hall 15.9 m south of the Shiokaze hall**, same depth, parallel. Platforms 7/8. The future-railway shells are all elevated decks, so they can't take a line that merges into S underground |
| Seiran | Moved to the hills **north-east** of Midorizaka, so M reaches the hub from the west without crossing Y twice |
| Frequency | **Every 10 minutes**, one M train in every other gap between Shiokaze trains |
| Through-running | M shares S's track from just east of the hub to Hanamizuki. It stops at Daigaku-mae and Hanamizuki (using S's platforms) and passes Tōmyōbori and Sakurazutsumi without stopping |

## Route and stations

| No. | Station | Kana | Rail | Where |
|---|---|---|---|---|
| M-11 | 清嵐 Seiran | せいらん | −12 | North-east hills, 800 m ENE of Midorizaka. **Terminus** |
| M-12 | 緑坂 Midorizaka | | −17.5 | Crosses **Y** at right angles, 7.5 m below it. Interchange (Y on top, island) |
| M-13 | 北大通 Kita-Ōdōri | | −20.5 | Own hall beside S, south side |
| M-14 | 川湊大学前 Daigaku-mae | | −18.5 | **On S's track**, at S's platforms 3/4 |
| (S-15, S-16) | Tōmyōbori, Sakurazutsumi | | | Passed through on S's track, no stop |
| M-15 | 花みずき Hanamizuki | | −13 | **On S's track**, at S's platforms 1/2. M carries straight on where S turns east |
| M-16 | 南桜川 Minami-Sakuragawa | みなみさくらがわ | −12 | 750 m on, south-south-east |
| M-17 | 春野台 Harunodai | はるのだい | −10 | After a turn east, on the southern heights. **Terminus** |

The route runs as follows, with 250 m curves off the shared section:
- From Seiran, it runs WSW through Midorizaka, then turns south along x = 1250.
- It **dives under S and A** west of the hub (about 7.5 m below both) while turning east to run 15.9 m south of S. It rises into its hub hall.
- It runs east beside S, and its tunnel curves into S's SSE leg just past S's own bend. The two **become one alignment** about 270 m past the bend, well before Daigaku-mae.
- It stays on S's track to just past Hanamizuki. M carries straight on where S curves east, then turns east itself to Harunodai.

The route is about 8 km.

## Simulation: shared track

The timetable stays closed-form. The changes:

1. **Shared alignment.** Over the shared section, M's alignment is built from S's own points, so the two coincide exactly. A line can declare `shares: { line: 'S', from: 'daigaku-mae', to: 'hanamizuki' }`.
2. **Passing stations.** `LineDef.passes`: stations a line runs through without stopping (M: Tōmyōbori, Sakurazutsumi). They shape the vertical profile, so M's rail level matches S's metre for metre, but they get no dwell, no number and no departures, and they're excluded from `linesAt`.
3. **Phase.** A new `service.offsetS` shifts a line's whole timetable. The M layover is split between its two termini so that, in *both* directions, M passes through the shared section about half a headway (≈150 s) after an S train. Departure boards at Daigaku-mae and Hanamizuki merge S and M departures (they already list every line at a station).
4. **New test:** on the shared section, S and M trains are never within a train length plus a margin of each other, in either direction, over a full combined cycle (lcm of the two cycles).
5. **Existing tests:**
   - The crossing-clearance test skips a pair over its shared section.
   - The interchange test gains a "shared platform" case: same point, same direction, same depth.
   - The side-by-side test allows a chain at the hub (A | S | M, each 15.9 m from the next).

The 3D track and tunnel are drawn only once where M rides on S's track. Platform screen doors at the passed stations stay shut for M trains, since doors open only for a stopping train.

## Stations in 3D

- **Kita-Ōdōri (hub):** a new hall south of S's, built like `sHall` (shared windows into S's hall, an enclosed stair + escalator shaft). Its passage joins the existing stub passage south of the paid concourse, which grows to serve both lines. The hub spec becomes `beside: ['S', 'M']`.
- **Midorizaka:** becomes an `interchange` with Y (island) as primary and M's island crossing below.
- **Seiran, Minami-Sakuragawa, Harunodai:** new underground specs, each with its own finishes, neighbourhood and mural (a new **violet** mural at Seiran).
- **Daigaku-mae, Hanamizuki:** no new geometry; M uses S's platforms. Signs and boards list both lines.

## Route map

- Seiran moves to the upper right of Midorizaka.
- M is drawn **alongside** Y from Midorizaka to Kita-Ōdōri, and alongside S from Kita-Ōdōri down to Hanamizuki, using a new per-segment `diagramOffset`. Along S, M is drawn as a parallel line that runs past the Tōmyōbori and Sakurazutsumi markers, so the skip shows.
- From Hanamizuki it runs diagonally to Minami-Sakuragawa, then east to Harunodai.
- The same overlap check as stages 1–2 must come back empty.

## Docs

`network.md` (shared track, passes, offsets), `architecture.md` (the timetable additions), `station-design.md` (hub M hall), `worldbuilding.md`, `vision.md`, CLAUDE.md.

## Done when

- Tests, typecheck and build pass.
- On a full combined cycle, S and M trains never meet on the shared track.
- M is visible passing through Tōmyōbori without stopping.
- All new stations are walkable, and the hub links to platforms 7/8.

## As built

- **The merge east of the hub: changed from the plan.** A tighter 250 m M curve would have been crossed by S's own 400 m curve, which sweeps through the inside of its corner. M's radius is therefore **384.1 m** (400 − 15.9) everywhere, and its corner is S's corner offset 15.9 m inside, so the two curves are concentric. M then eases onto S's straight over 200 m, merging about 90 m before Daigaku-mae's level section.
- **The dive west of the hub.** M crosses S at about x = 1275 (S is near −11 there) and A's curve at about (1325, −653). The latter needs M at −27.5, which is a `profile` point. M's turn south was moved to x ≈ 998 so the climb back up to the hub stays under 2%.
- **Timetable:** the offset came out at 255 s. M runs 4 trains on a 40-minute cycle. The no-meet test runs over the full combined cycle.
- **Map:** M is drawn beside Y and beside S on the way in, then as a stripe inside S over the shared section. The canvas grew to 1640 × 1000. Making room meant moving A's north-east stations, Aobadai, Midorizaka and the south-east S labels.
- New mural: **violet** (Seiran).
