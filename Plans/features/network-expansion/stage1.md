# Network expansion, stage 1: extend Y, N, A and S

**Parent:** [plan.md](plan.md). **Status:** built 2026-11-18.

Twenty new stations, all on numbers already reserved for extensions (Y-09/10 and Y-16–18, and so on). No new lines and no new interchanges. The route map is redrawn for the final 6-line network.

## World geometry (x = east, z = south, metres)

Every extension continues the line's existing direction or adds one bend, and stations stay 650–800 m apart. **None of the new route crosses another line between stations**, so the crossing-clearance test has nothing new to check.

| Line | New stations (position) | Alignment change |
|---|---|---|
| Y north | Aobadai Y-10 (t = 1400), Shin-Midorigaoka Y-09 (t = 2100), both along the 20°-west-of-north leg from the bend | north end moves to t = 2520 |
| Y south | Minamihorie Y-16 (1870, 2150), Kaiseichō Y-17 (1870, 2850), Nankōdai Y-18 (1870, 3550) | south end to z = 3970 |
| N west | Umibe-shiyakusho-mae N-10 (−380, 0), Minato Center N-09 (−1100, 0): reclaimed bay land, under the water | west end to x = −1520 |
| N east | Asahino N-16, Takanodai N-17, Izumigaoka N-18 at 700 m steps along the 25° leg, **on the viaduct** (+6.5) | end to t = 3990 |
| A west | Shiosai-kōen A-10 (−260, 1400), Shin-Kamome A-09 (−960, 1400) | west end to x = −1380 |
| A north-east | Bend east at (3000, −2500). Momijigaoka A-18 (3800, −2500), Seiryōdai A-19 (4600, −2500), Hoshimine A-20 (5400, −2500) | end (5820, −2500) |
| S west | Nishi-Yūnagi S-10 (−260, −664.1), Shiomi S-09 (−960, −664.1) | west end to x = −1380 |
| S south-east | Hanamizuki S-17 (t = 2150 from Daigaku-mae), then bend east at t = 2550. Shin-Sakuragawa S-18 and Uminomori S-19 at 700 m steps | end 400 m past Uminomori |

Rail levels:
- Y: −11, −10 (north); −12, −11, −10 (south).
- N: −15, −16 under the bay; +6.5 on the viaduct.
- A: −16, −14 (west); −12, −11, −10 (hills). A stays in bored tunnel, so it's always below −6.
- S: −11, −10 (west); −13, −12, −10 (south-east).

### Reserved for stage 2 (Kikyō Line, radius 250 m)
Shinshio (−350, −400). The line runs east, then turns south at x = 320 to cross N **at Kawaminato-kō**. It turns east at z = 800 to cross A **at Watayamachi**, then climbs north-east to run **15.9 m south of N through Tsumugibashi** (crossing Y there). It turns south-east, then east-north-east to cross S **at Tōmyōbori**, then north-north-west to cross N **at Hibarino**. Finally it runs parallel to N, 500 m north of it: Higashigaoka, Shin-Hibarino.

Nothing in stage 1 sits on that path. The Sumire Line only needs Midorizaka to stay where it is; its geometry is designed in stage 3.

## Route map
Redrawn on a larger 1640 × 940 canvas, with **zoom and pan** (wheel, drag, +/− buttons) so labels stay legible.
- Octilinear layout. Y is the spine at x = 760. The S row is y = 280, the N row y = 480, the K row y = 680 (reserved), and A's bay row y = 800.
- Positions for the future K and M stations are reserved now, so stages 2 and 3 only add lines and don't move existing ones.
- Each station picks its label side (`right/left/below/se/ne/nw`) and badge corner, so nothing overlaps a line.
- The river and bay backdrop is redrawn to fit.

## Stations (3D)
Each new station gets its own spec: wall and pillar finish, a mural, and a neighbourhood. Five new mural designs: maple (Momijigaoka), stars (Hoshimine), dogwood (Hanamizuki), bay skyline (Minato Center) and spring ripples (Izumigaoka). Asahino, Takanodai and Izumigaoka are elevated. The low-detail backdrop city grows to cover the new ends of the network.

## Done when
`npm test`, `npm run typecheck` and `npm run build` pass. The map shows 38 stations with nothing overlapping. Every new station can be teleported into and walked, and trains run end to end on each line.
