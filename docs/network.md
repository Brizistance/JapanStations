# Network

The single source of truth for lines and stations is [`src/data/network.ts`](../src/data/network.ts) (types in `src/data/types.ts`). The map, sim, 3D stations, signage and HUD all read from it. This file describes the design.

## Lines

| Code | Name (EN) | Name (JP) | Color | Platforms | Track spacing | Headway |
|---|---|---|---|---|---|---|
| Y | Yanagisuji Line | 柳筋線 | green `#1f9d55` | island | ±5.5 m (twin single-track tunnels) | 4 min, 5 trains |
| N | Nagisa Line | 渚線 | blue `#1673c9` | side | ±1.9 m (one double-track box) | 5 min, 4 trains |
| A | Akanesuji Line | 茜筋線 | madder red `#b7282e` | island, **full-height doors** | ±5.5 m (twin single-track tunnels) | 5 min, 5 trains |
| S | Shiokaze Line | 汐風線 | sunset orange `#ee7b1a` | island, **full-height doors** | ±5.5 m (twin single-track tunnels) | 5 min, 5 trains |

Y and N are about 3–3.5 km end to end, with stations 650–1100 m apart and a 20-minute round trip (cycle). A is the long one: about 5.4 km, stations 580–1310 m apart, 25-minute cycle. S is about 4.1 km, stations 680–1130 m apart, 25-minute cycle.

### Stations in order

- **Y** (north → south, "down"): Midorizaka Y-11 · Kita-Ōdōri Y-12 · **Tsumugibashi Y-13** · Hyōtanbori Y-14 · Tsurumatsu Y-15
- **N** (west → east, "down"): Kawaminato-kō N-11 · **Aizomechō N-12** · **Tsumugibashi N-13** · **Kawaminato-daigaku-mae N-14** · Hibarino N-15
- **A** (south-west → north-east, "down"): Kamomehama A-11 · Watayamachi A-12 · **Aizomechō A-13** · **Kita-Ōdōri A-14** · Suzukakedōri A-15 · Tsukimizaka A-16 · Yamabukidai A-17
- **S** (west → south-east, "down"): Yūnagihama S-11 · Kurayashiki S-12 · **Kita-Ōdōri S-13** · **Kawaminato-daigaku-mae S-14** · Tōmyōbori S-15 · Sakurazutsumi S-16

Rail level (metres below street): Y is −10, −13, −19, −14, −11. N is −11, −12, −11.5, −11, then **+6.5** at Hibarino: the line climbs out of the tunnel through an open cut onto a viaduct. A is −15, −17, −19.5, −20.5, −18, −16, −14: bored tunnel end to end, and exactly 7.5 m below the line it crosses at each interchange (the same gap Tsumugibashi uses). S is −10, −11, −20.5, −18.5, −14, −12: at A's depth at the hub, 7.5 m below N at Daigaku-mae.

The Akanesuji Line follows two streets: north–south under **Akane-suji** (x = 1070) through the merchant quarter, then east under **Kita-Ōdōri avenue** (z = −680) through the hub, then north (x = 3000) into the hills. That stair-step makes it cross each older line once, at a right angle, at a station.

The Shiokaze Line runs west–east along the north bank of the **Mio-gawa**, 15.9 m south of the Akanesuji Line (z = −664.1), from the river mouth through the hub's B4 box. East of the hub it turns 65° south (400 m radius) to cross the Nagisa Line at right angles at Daigaku-mae, then continues 25° east of south to the canals. It crosses the Akanesuji Line once **between stations**, at about (1358, −664), where A curves south: S is 7.9 m above it there.

## Numbering

- `<LineLetter>-<NN>`, for example `Y-13`. Numbers start at **11** and increase in the "down" direction, leaving 01–10 for extensions at the low end.
- A transfer station has **one number per line** it serves.
- **Platform numbers**: `[down, up]` per line, stored on the station. At an interchange the first line keeps 1/2 and each later one takes the next pair (Tsumugibashi: Y 1/2, N 3/4; Aizomechō: N 1/2, A 3/4; Daigaku-mae: N 1/2, S 3/4; Kita-Ōdōri: Y 1/2, A 3/4, S 5/6).

## Transfers

| Station | Lines | How |
|---|---|---|
| Tsumugibashi | Y ↔ N | The lines cross at right angles, N above Y. A transfer passage beside each N platform leads down a stair/escalator to the Y island platform, and up to the shared concourse. |
| Aizomechō | N ↔ A | Same pattern as Tsumugibashi: N above, A's island platform below. |
| Kawaminato-daigaku-mae | N ↔ S | Same pattern again: N above, S's island platform below. |
| Kita-Ōdōri | Y ↔ A ↔ S | The hub. Up from the Y platform to the B1 concourse, across it inside the gates, and down a long open escalator bank to the A platform. S runs **beside** A, in its own hall south of A's; its stair and escalator climb an enclosed shaft into a passage off the paid concourse. See [station-design.md](station-design.md). |

## Geometry

- World coordinates are metres: **x = east, z = south**, y up, street level = 0.
- A line's `alignment` is a polyline of `[x, z]` vertices; corners are rounded with circular arcs of `radius` (`src/sim/alignment.ts`). Y and N have one 400 m-radius bend each; A has three right-angle ones.
- A station's `position` must lie on the alignment of every line serving it. Its chainage is found by projection, so every interchange is consistent by construction. `npm test` checks this, and that lines sharing a station cross at right angles and at different depths.
- **Exception: a line beside another.** `StationDef.at` gives a line its own platform centre at a station (Kita-Ōdōri: `at: { S: … }`). The test then requires that pair to be parallel, at the same depth and exactly 15.9 m apart (`S_BESIDE_A`, which must match the hub's box). Any third line must still cross both at right angles.
- **Crossings between stations** need at least 7 m between rail levels. `npm test` sweeps every pair of lines for this.
- Stations must sit on straight, level track. The profile is level for 150 m either side of a station and eases between rail levels in between.
- Trains keep left. The "down" track is on the left of increasing chainage.

### Phase 1 simplification: one platform type per line

`platformType`, `platformDoors` and `trackOffset` are per **line**, not per station, so the two tracks stay a constant distance apart and never flare around an island platform. To mix platform types on one line later, `LineGeom.lateral()` needs to vary the offset by chainage; everything else already reads track positions through that function.

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
  diagram: { x: number; y: number;      // route-diagram coords
             label?: 'right' | 'below'; // where the name goes (default below)
             badges?: 'ne' | 'nw' };    // corner for an interchange's number badges
  district: string; districtJa: string;
  platforms: Record<LineId, [number, number]>;
  blurb: string;
}
```

What a station **looks like** (layout, finishes, neighbourhood) is separate: `src/stations/specs.ts`.
