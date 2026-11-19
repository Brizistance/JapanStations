# Network

The single source of truth for lines and stations is [`src/data/network.ts`](../src/data/network.ts) (types in `src/data/types.ts`). The map, sim, 3D stations, signage and HUD all read from it. This file describes the design.

## Lines

| Code | Name (EN) | Name (JP) | Color | Platforms | Track spacing | Headway |
|---|---|---|---|---|---|---|
| Y | Yanagisuji Line | 柳筋線 | green `#1f9d55` | island | ±5.5 m (twin single-track tunnels) | 4 min, 8 trains |
| N | Nagisa Line | 渚線 | blue `#1673c9` | side | ±1.9 m (one double-track box) | 5 min, 7 trains |
| A | Akanesuji Line | 茜筋線 | madder red `#b7282e` | island, **full-height doors** | ±5.5 m (twin single-track tunnels) | 5 min, 9 trains |
| S | Shiokaze Line | 汐風線 | sunset orange `#ee7b1a` | island, **full-height doors** | ±5.5 m (twin single-track tunnels) | 5 min, 8 trains |
| K | Kikyō Line | 桔梗線 | bellflower purple `#7b4fa8` | island, **full-height doors** | ±5.5 m (twin single-track tunnels) | 5 min, 7 trains |
| M | Sumire Line | すみれ線 | violet `#c2368f` | island, **full-height doors** (S's own, where it shares S's track) | ±5.5 m | 10 min, 4 trains |

After the stage 1 extensions (see [Plans/features/network-expansion](../Plans/features/network-expansion/plan.md)) every line has 10–12 stations, mostly 650–900 m apart (the inner sections keep their old 580–1310 m spacing). End to end, Y is 6.5 km (32-minute round trip), N 7.1 km (35 min), A 9.6 km (45 min) and S 7.6 km (40 min). The Kikyō Line (stage 2) is 8.8 km with 8 stations (35 min). The Sumire Line (stage 3) is 7.9 km with 7 stops (40 min) and runs on the Shiokaze Line's track for part of the way (see below). The timetable code works out each cycle and train count from the headway: 43 trains in all.

### Stations in order

- **Y** (north → south, "down"): Shin-Midorigaoka Y-09 · Aobadai Y-10 · Midorizaka Y-11 · **Kita-Ōdōri Y-12** · **Tsumugibashi Y-13** · Hyōtanbori Y-14 · Tsurumatsu Y-15 · Minamihorie Y-16 · Kaiseichō Y-17 · Nankōdai Y-18
- **N** (west → east, "down"): Minato Center N-01 · Umibe-shiyakusho-mae N-02 · Kawaminato-kō N-03 · **Aizomechō N-04** · **Tsumugibashi N-05** · **Kawaminato-daigaku-mae N-06** · Hibarino N-07 · Asahino N-08 · Takanodai N-09 · Izumigaoka N-10
- **A** (south-west → north-east, "down"): Shin-Kamome A-01 · Shiosai-kōen A-02 · Kamomehama A-03 · Watayamachi A-04 · **Aizomechō A-05** · **Kita-Ōdōri A-06** · Suzukakedōri A-07 · Tsukimizaka A-08 · Yamabukidai A-09 · Momijigaoka A-10 · Seiryōdai A-11 · Hoshimine A-12 · Kasumidani A-13 · Shiondai A-14 (2008 extension, open air)
- **S** (west → south-east, "down"): Shiomi S-09 · Nishi-Yūnagi S-10 · Yūnagihama S-11 · Kurayashiki S-12 · **Kita-Ōdōri S-13** · **Kawaminato-daigaku-mae S-14** · Tōmyōbori S-15 · Sakurazutsumi S-16 · Hanamizuki S-17 · Shin-Sakuragawa S-18 · Uminomori S-19
- **K** (west → east, "down"): Shinshio K-11 · **Kawaminato-kō K-12** · **Watayamachi K-13** · **Tsumugibashi K-14** · **Tōmyōbori K-15** · **Hibarino K-16** · Higashigaoka K-17 · Shin-Hibarino K-18
- **M** (north-east → south-east, "down"): Seiran M-11 · **Midorizaka M-12** · **Kita-Ōdōri M-13** · **Kawaminato-daigaku-mae M-14** · (passes Tōmyōbori, Sakurazutsumi) · **Hanamizuki M-15** · Minami-Sakuragawa M-16 · Harunodai M-17

Rail level (metres below street), in station order:

| Line | Levels | Notes |
|---|---|---|
| Y | −10, −11, −10, −13, −19, −14, −11, −12, −11, −10 | |
| N | −16, −15, −11, −12, −11.5, −11, **+6.5**, +6.5, +6.5, +6.5 | The west end runs out under the bay to reclaimed land. After Daigaku-mae the line climbs through an open cut onto a viaduct, and stays on it to Izumigaoka. |
| A | −14, −16, −15, −17, −19.5, −20.5, −18, −16, −14, −12, −11, −10 | Bored tunnel end to end, and exactly 7.5 m below the line it crosses at each interchange (the same gap Tsumugibashi uses). |
| S | −10, −11, −10, −11, −20.5, −18.5, −14, −12, −13, −12, −10 | At A's depth at the hub, and 7.5 m below N at Daigaku-mae. |
| K | −10, **−24**, −10, −11.5, −21.5, −12, −12, −10 | 13 m below N at Kawaminato-kō (room for the atrium's mezzanine and underpass between them), 7 m **above** A at Watayamachi, level with N (beside it) at Tsumugibashi, 7.5 m below S at Tōmyōbori, and under N's viaduct at Hibarino. |
| M | −12, −17.5, −20.5, −18.5, −13, −12, −10 | 7.5 m below Y at Midorizaka. Dives to **−27.5** at (1325, −653), 7.5 m under A and well under S where it crosses them west of the hub (a `profile` point), then rises into its hall beside S. On S's track it takes S's levels, including at the two stations it passes (`passes`). |

The Akanesuji Line follows streets in a stair-step:
- east along z = 1400 from the reclaimed islands to Kamomehama;
- north under **Akane-suji** (x = 1070) through the merchant quarter;
- east under **Kita-Ōdōri avenue** (z = −680) through the hub;
- north (x = 3000) into the hills;
- east along the ridge road (z = −2500) to Hoshimine.

That stair-step makes it cross each older line once, at a right angle, at a station.

The Shiokaze Line runs west–east along the north bank of the **Mio-gawa**, 15.9 m south of the Akanesuji Line (z = −664.1), from the landfill at Shiomi through the hub's B4 box.
- East of the hub it turns 65° south (400 m radius) to cross the Nagisa Line at right angles at Daigaku-mae, then continues 25° east of south to the canals.
- Past Hanamizuki it turns 65° back to due east along the bay shore.
- It crosses the Akanesuji Line once **between stations**, at about (1358, −664), where A curves south. S is 7.9 m above A there.

The stage 1 extensions add **no new crossings between stations**.

The Kikyō Line weaves between the older lines on 250 m curves and crosses each one exactly once, at a station:
- west from Shinshio, then south down x = 320 under Kawaminato-kō (N);
- east along z = 800 over Watayamachi (A);
- north-east to run 16.78 m south of N through Tsumugibashi, where it crosses Y;
- south-east, then east-north-east under Tōmyōbori (S);
- north-north-west under Hibarino (N's viaduct);
- east-north-east, parallel to N and 500 m north of it, to Shin-Hibarino.

It crosses nothing between stations. See [stage2.md](../Plans/features/network-expansion/stage2.md).

## Numbering

- `<LineLetter>-<NN>`, for example `Y-13`. Numbers increase in the "down" direction. N and A start at **01** (open water bounds their low end); Y, S, K and M start higher (09–11), leaving room to extend.
- A transfer station has **one number per line** it serves.
- **Platform numbers**: `[down, up]` per line, stored on the station. At an interchange the first line keeps 1/2 and each later one takes the next pair (Tsumugibashi: Y 1/2, N 3/4, K 5/6; Aizomechō: N 1/2, A 3/4; Daigaku-mae: N 1/2, S 3/4; Kita-Ōdōri: Y 1/2, A 3/4, S 5/6; Kawaminato-kō: N 1/2, K 3/4; Watayamachi: A 1/2, K 3/4; Tōmyōbori: S 1/2, K 3/4; Hibarino: N 1/2, K 3/4; Midorizaka: Y 1/2, M 3/4; Kita-Ōdōri M 7/8). A line on another's track uses that line's platform numbers (M at Daigaku-mae: 3/4, at Hanamizuki: 1/2).

## Transfers

| Station | Lines | How |
|---|---|---|
| Tsumugibashi | Y ↔ N | The lines cross at right angles, N above Y. A transfer passage beside each N platform leads down a stair/escalator to the Y island platform, and up to the shared concourse. |
| Aizomechō | N ↔ A | Same pattern as Tsumugibashi: N above, A's island platform below. |
| Kawaminato-daigaku-mae | N ↔ S | Same pattern again: N above, S's island platform below. |
| Kawaminato-kō | N ↔ K | N above, K's island platform deep below under an **atrium** (`atrium.ts`): from N platform 2 by a balcony and stair, from platform 1 by an underpass under the N tracks, both to a mezzanine over the void, then down to K. A gallery round the void opens off the concourse, with a third gate line and exit 5 to the quay. |
| Watayamachi | K ↔ A | Same pattern with an **island** line on top (K). An island hall has track along its walls, so the transfer passages are reached from the concourse, not through doorways off the platform. |
| Tōmyōbori | S ↔ K | As Watayamachi: S's island on top, K's island below. |
| Tsumugibashi | Y ↔ N ↔ K | K runs **beside** N in its own hall on the south side; its stairs rise into the shared concourse, which is widened over both halls. Y is reached by the north transfer passage beside N, or the south one beyond K's hall. |
| Midorizaka | Y ↔ M | Y (island) on top, M's island below; passages reached from the concourse, as at Watayamachi. |
| Kita-Ōdōri (M) | + M | M has its own hall **south of S's**, 15.9 m from it (A \| S \| M side by side at B4), with windows into S's hall. Its stair and escalator climb a shaft into the stub passage south of the paid concourse, which now runs on to serve both S and M. |
| Daigaku-mae, Hanamizuki | S ↔ M | **Same platform**: M trains stop at the Shiokaze platforms, and the screen doors open for either line's trains. |
| Hibarino | N ↔ K | N on the viaduct, K's island platform under the street. From mid-K-platform a stair and escalator climb to a small paid mezzanine (B1), and a second flight rises into the paid side of the street-level concourse. One gate line serves both. |
| Kita-Ōdōri | Y ↔ A ↔ S | The hub. Up from the Y platform to the B1 concourse, across it inside the gates, and down a long open escalator bank to the A platform. S runs **beside** A, in its own hall south of A's; its stair and escalator climb an enclosed shaft into a passage off the paid concourse. See [station-design.md](station-design.md). |

## Geometry

- World coordinates are metres: **x = east, z = south**, y up, street level = 0.
- A line's `alignment` is a polyline of `[x, z]` vertices; corners are rounded with circular arcs of `radius` (`src/sim/alignment.ts`). Y and N have one 400 m-radius bend each, A has four right-angle ones, and S has two 65° ones.
- A station's `position` must lie on the alignment of every line serving it. Its chainage is found by projection, so every interchange is consistent by construction. `npm test` checks this, and that lines sharing a station cross at right angles and at different depths.
- **Exception: a line beside another.** `StationDef.at` gives a line its own platform centre at a station (Kita-Ōdōri: `at: { S: … }`; Tsumugibashi: `at: { K: … }`). The test then requires that pair to be parallel, at the same depth, and exactly one hall wall + 0.5 m of structure + the other hall wall apart (`hallDims`). That gives 15.9 m for A/S (`S_BESIDE_A`, which must match the hub's box) and 16.78 m for N/K (`K_BESIDE_N`). Any third line must still cross both at right angles.
- **Map corners.** `LineDef.diagramBends` adds route-map corners that are not stations (K has three). `diagramOffset` draws a segment alongside another line (M beside Y and S); `diagramShared` draws it as a thin stripe inside the line whose track it uses.

## Shared track (through-running)

The Sumire Line runs on the Shiokaze Line's track from just before Daigaku-mae to just past Hanamizuki (`LineDef.shares`).
- **Geometry.** East of the hub, M's 384.1 m curve is concentric with S's 400 m one, 15.9 m inside it, so the two tunnels never cross. M then eases onto S's straight over 200 m, well before Daigaku-mae. From there M's alignment lies exactly on S's (tested to 5 cm), until M carries straight on where S turns east past Hanamizuki.
- **Profile.** M passes Tōmyōbori and Sakurazutsumi (`passes`). They are points in M's profile at S's levels, so the rail is the same metre for metre, but M has no dwell, number or departure there.
- **Timetable.** M runs every 10 minutes, a whole multiple of S's 5. `sim/index.ts` shifts M's whole timetable (`offset`) so M enters the shared section half an S headway after an S train going down. It then splits M's layover between its two termini (`padEnd`) so the same holds going up.
  - M skips two stops and gains about 90 s, so it arrives about 35 s after the S train ahead has left.
  - A test checks every second of the combined cycle: no M train comes within a train length of an S train on the same track.
- **Drawing.** The track renderer skips spans where M is on S's track (`onHostTrack`). The screen doors at a shared platform open for either line's trains (`gateOpen`), and its departure boards list both lines' trains in arrival order (`platformTrains`); a guest train shows its line's name where the service type would be.
- **Crossings between stations** need at least 7 m between rail levels. `npm test` sweeps every pair of lines for this.
- Stations must sit on straight, level track. The profile is level for 150 m either side of a station and eases between rail levels in between.
- Trains keep left. The "down" track is on the left of increasing chainage.

### Phase 1 simplification: one platform type per line

`platformType`, `platformDoors` and `trackOffset` are per **line**, not per station, so the two tracks stay a constant distance apart and never flare around an island platform. To mix platform types on one line later, `LineGeom.lateral()` needs to vary the offset by chainage; everything else already reads track positions through that function. Exception without flaring: `sideAt` lists stations where an island line has side platforms outside its usual track spacing (Akanesuji at Shiosai-kōen and Yamabukidai).

## Timetable

Built by `src/sim/timetable.ts` from each line's `service` block (headway, dwell, speeds, acceleration).

- Every train on a line runs the same repeating **cycle**: down the line → turn back → up the line → turn back. Trains are spaced one headway apart.
- **Running**: trapezoidal speed profile (0.9 m/s² up, 1.0 m/s² down, 70 km/h max). Run times are rounded up to 5 s; the cruise speed is then solved so the train arrives exactly on schedule. Typical run: 60–80 s.
- **Dwell**: 25 s at intermediate stations. Doors open 1.5 s after stopping and are closed 3 s before departure.
- **Terminal turnback**: the train arrives at the arrival platform (alighting only, 30 s), runs forward into a siding beyond the station, waits 40 s while the driver changes ends, then comes back over a crossover into the departure platform and lays over until its departure time. Layover is padded so the cycle is a whole number of headways.
- A train's position is a **closed-form function of the clock**, so it cannot drift, and departure boards computed from the same phases are always right.
- The clock starts at 10:00 and counts up. Service does not change by time of day yet.

To change frequency, edit `headwayS`; the number of trains and the layovers are recomputed.

## Data model (as implemented)

```ts
interface LineDef {
  id: LineId; nameEn: string; nameJa: string; nameKana: string; color: string;
  type: 'metro' | 'jr' | 'private';
  stops: StationId[];            // ordered, terminus to terminus
  railY: number[];               // rail level at each stop
  platformType: 'island' | 'side';
  platformDoors?: 'half' | 'full'; // default half
  trackOffset: number;
  alignment: { vertices: [number, number][]; radius: number };
  service: ServicePattern;       // headway, dwell, speeds…
}
interface StationDef {
  id: StationId; nameJa: string; nameKana: string; nameRomaji: string;
  numbers: Record<LineId, string>;
  position: { x: number; y: number };   // world metres (y = south)
  at?: Partial<Record<LineId, { x: number; y: number }>>; // per-line platform centre (a line beside another)
  diagram: { x: number; y: number;      // route-diagram coords (1640 × 940 octilinear grid)
             label?: 'right' | 'left' | 'below' | 'se' | 'ne' | 'nw'; // where the name goes
             badges?: 'ne' | 'nw' | 'sw' };  // corner for the number badges
  district: string; districtJa: string;
  platforms: Record<LineId, [number, number]>;
  blurb: string;
}
```

What a station **looks like** (layout, finishes, neighbourhood) is separate: `src/stations/specs.ts`.
