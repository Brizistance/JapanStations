# Network

The single source of truth for lines and stations is [`src/data/network.ts`](../src/data/network.ts) (types in `src/data/types.ts`). The map, sim, 3D stations, signage and HUD all read from it. This file describes the design.

## Lines

| Code | Name (EN) | Name (JP) | Color | Platforms | Track spacing | Headway |
|---|---|---|---|---|---|---|
| Y | Yanagisuji Line | 柳筋線 | green `#1f9d55` | island | ±5.5 m (twin single-track tunnels) | 4 min, 5 trains |
| N | Nagisa Line | 渚線 | blue `#1673c9` | side | ±1.9 m (one double-track box) | 5 min, 4 trains |

Each line is about 3–3.5 km end to end, with stations 650–1100 m apart. A full round trip (cycle) is 20 minutes on both lines.

### Stations in order

- **Y** (north → south, "down"): Midorizaka Y-11 · Kita-Ōdōri Y-12 · **Tsumugibashi Y-13** · Hyōtanbori Y-14 · Tsurumatsu Y-15
- **N** (west → east, "down"): Kawaminato-kō N-11 · Aizomechō N-12 · **Tsumugibashi N-13** · Kawaminato-daigaku-mae N-14 · Hibarino N-15

Rail level (metres below street): Y is −10, −13, −19, −14, −11. N is −11, −12, −11.5, −11, then **+6.5** at Hibarino: the line climbs out of the tunnel through an open cut onto a viaduct.

## Numbering

- `<LineLetter>-<NN>`, for example `Y-13`. Numbers start at **11** and increase in the "down" direction, leaving 01–10 for extensions at the low end.
- A transfer station has **one number per line** it serves.
- **Platform numbers**: `[down, up]` per line, stored on the station. Tsumugibashi uses 1/2 for Y and 3/4 for N.

## Transfers

| Station | Lines | How |
|---|---|---|
| Tsumugibashi | Y ↔ N | The lines cross at right angles, N above Y. A transfer passage beside each N platform leads down a stair/escalator to the Y island platform, and up to the shared concourse. |

## Geometry

- World coordinates are metres: **x = east, z = south**, y up, street level = 0.
- A line's `alignment` is a polyline of `[x, z]` vertices; corners are rounded with circular arcs of `radius` (`src/sim/alignment.ts`). Both lines currently have one 400 m-radius bend.
- A station's `position` must lie on the alignment of every line serving it. Its chainage is found by projection, so the interchange is consistent by construction. `npm test` checks this.
- Stations must sit on straight, level track. The profile is level for 150 m either side of a station and eases between rail levels in between.
- Trains keep left. The "down" track is on the left of increasing chainage.

### Phase 1 simplification: one platform type per line

`platformType` and `trackOffset` are per **line**, not per station, so the two tracks stay a constant distance apart and never flare around an island platform. To mix platform types on one line later, `LineGeom.lateral()` needs to vary the offset by chainage; everything else already reads track positions through that function.

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
  trackOffset: number;
  alignment: { vertices: [number, number][]; radius: number };
  service: ServicePattern;       // headway, dwell, speeds…
}
interface StationDef {
  id: StationId; nameJa: string; nameKana: string; nameRomaji: string;
  numbers: Record<LineId, string>;
  position: { x: number; y: number };   // world metres (y = south)
  diagram: { x: number; y: number };    // route-diagram coords
  district: string; districtJa: string;
  platforms: Record<LineId, [number, number]>;
  blurb: string;
}
```

What a station **looks like** (layout, finishes, neighbourhood) is separate: `src/stations/specs.ts`.
