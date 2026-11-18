# Network

The single source of truth for lines and stations. The map, sim, walk-throughs, and ride-along all read from the network data. This file describes the **design** and the **data format**. The data itself will live in code (see architecture.md).

## Lines (draft, all TBD)

| Code | Name (EN) | Name (JP) | Color | Role |
|---|---|---|---|---|
| ? | _Trunk line_ | ? | ? | North–south spine linking the north and south hubs (Midōsuji-like) |
| ? | _Cross line_ | ? | ? | East–west, from the bay to the east hills |
| ? | _Loop or diagonal_ | ? | ? | Links the districts the first two lines miss |
| ? | _(optional)_ | ? | ? | |
| ? | _(optional)_ | ? | ? | |

Pick line colors that stay distinct on a diagram and avoid clashing with each other (as a reference, Osaka uses red, purple, blue, green, brown, and so on).

## Numbering

- `<LineLetter>-<NN>`, for example `M-07`. Numbering starts at one terminus and increases toward the other.
- A transfer station has **one number per line** it serves. It's a single station complex, but each line has its own platform entry.

## Data model (draft)

```ts
type LineId = string;     // "M"
type StationId = string;  // slug, e.g. "kitahama-bashi"

interface Line {
  id: LineId;
  nameEn: string;
  nameJa: string;          // 〜線
  color: string;           // hex
  stops: StationId[];      // ordered, terminus to terminus
  type: "metro" | "jr" | "private";
}

interface Station {
  id: StationId;
  nameJa: string;          // kanji
  nameKana: string;        // hiragana
  nameRomaji: string;      // display, with macrons
  numbers: Record<LineId, string>;  // { M: "M-07", Y: "Y-12" }
  position: { x: number; y: number };        // geographic-ish map coords
  diagram?: { x: number; y: number };        // schematic diagram coords (optional override)
  layout?: StationLayout;  // for 3D, e.g. "island" | "side" | "stacked"
  district?: string;
}
```

Segment data (travel times, distances) will probably be added in Phase 2. Change this model freely while it's still in draft.

## Transfers

_List transfer stations here once the lines are drawn._
