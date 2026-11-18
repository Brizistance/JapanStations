# Network expansion: extensions + Kikyō and Sumire lines

**Status:** all three stages built 2026-11-18: [stage1.md](stage1.md), [stage2.md](stage2.md), [stage3.md](stage3.md). Each has an "As built" note where it differs from this plan.

## Context
The user drew a target route map: all four lines extended at both ends, plus two new Metro lines, Kikyō **K** (purple) and Sumire **M** (magenta). The network grows from 18 stations to about 55. Every new station gets a full walk-through, like the current ones. The work is staged so that each stage ships playable. Per CLAUDE.md rule 4, the first implementation step is to commit this as `Plans/features/network-expansion/plan.md`, with a short per-stage plan written before each stage starts.

## Decisions (from Q&A)
- **Staged:** (1) extend Y/N/A/S → (2) Kikyō Line → (3) Sumire Line. Each stage is its own branch and plan doc.
- **Full per-station 3D.** Each station gets a spec in `src/stations/specs.ts` with its own neighbourhood and finishes.
- **Names exactly as on the map.** This includes ones that match real stations (Aobadai, Shiomi, Takanodai, Izumigaoka). Record this exception in `docs/worldbuilding.md`.
- The stray map dots (a second A-12, a second M-16) are **glitches**. Watayamachi stays A-12; Harunodai is M-17.
- **K and M are Kawaminato Metro** lines (`type: 'metro'`).
- The K "spurs" are map shorthand: in the real geography, **K crosses N under Kawaminato-kō (K-12) and Hibarino (K-16)**.
- **Tsumugibashi becomes Y/N/K:** K runs **beside N** (parallel, 15.9 m, same depth), using the existing `StationDef.at` "beside" pattern (as S does beside A at the hub). The Tsumugibashi station is rebuilt.
- **M through-runs on S tracks** from just east of Kita-Ōdōri to Hanamizuki. Along that stretch it stops at Daigaku-mae and Hanamizuki and **skips Tōmyōbori**. M gets its **own platforms at the hub**, opening a future-railway shell.

## Stage 1: extensions (20 stations, numbers already reserved)
| Line | Low end | High end |
|---|---|---|
| Y | Shin-Midorigaoka 新緑が丘 Y-09, Aobadai 青葉台 Y-10 | Minamihorie 南堀江 Y-16, Kaiseichō 開成町 Y-17, Nankōdai 南港台 Y-18 |
| N | Minato Center みなとセンター N-09, Umibe-shiyakusho-mae 海辺市役所前 N-10 | Asahino 旭野 N-16, Takanodai 高野台 N-17, Izumigaoka 泉ヶ丘 N-18 |
| A | Shin-Kamome 新鴎 A-09, Shiosai-kōen 潮騒公園 A-10 | Momijigaoka 紅葉ヶ丘 A-18, Seiryōdai 清涼台 A-19, Hoshimine 星峰 A-20 |
| S | Shiomi 潮見 S-09, Nishi-Yūnagi 西夕凪 S-10 | Hanamizuki 花みずき S-17, Shin-Sakuragawa 新桜川 S-18, Uminomori 海の森 S-19 |

- `src/data/network.ts`: extend `stops`, `railY` and `alignment` vertices, and add `StationDef`s (kanji, kana, romaji, district, blurb, diagram coords taken from the map image). Existing numbers are unchanged.
- N east of Hibarino stays on the viaduct (+6.5 m), which makes the N-16 to N-18 stations elevated.
- Make the new route stretches long enough that the A/N/S lines can later reach the K/M crossings at right angles and 7.5 m apart. Lay out those crossings in Stage 1 so Stage 2 doesn't need to move stations.
- Timetable: add trains via `headwayS` (count is recomputed). Check the cycle lengths.
- **Route-map redesign.** The user's image is a draft, so treat it as a guide to topology rather than to coordinates. Redo the diagram layout so the map is easier to read at ~55 stations:
  - Octilinear only (0/45/90°), with even station spacing along each line and as few bends as possible.
  - No shorthand spurs. Where K passes under an N station (Kawaminato-kō, Hibarino), draw K through that station as a single interchange marker.
  - Interchanges get one shared marker. Number badges sit in a consistent corner, and no label or badge overlaps a line, another label, or the legend.
  - Show the S/M shared section as two parallel colours, with M's skip at Tōmyōbori visible.
  - Keep the river and bay backdrop and the legend. Labels stay readable at the menu's size: test hover/selection hit areas at the new density, and if needed add zoom/pan, or a highlight that dims every other line when you hover one.
  - Lay out the whole final network (K and M included) in Stage 1, so later stages only reveal lines and never shuffle existing coordinates.
- Docs: `docs/network.md` (station lists, rail levels), `docs/worldbuilding.md` (districts).

## Stage 2: Kikyō Line
Shinshio K-11 · Kawaminato-kō K-12 (under N) · Watayamachi K-13 (crosses A) · Tsumugibashi K-14 (beside N) · Tōmyōbori K-15 (crosses S) · Hibarino K-16 (under N's viaduct) · Higashigaoka K-17 · Shin-Hibarino K-18.
- Pick a colour (purple), platform type and depth. Clear every between-station crossing by at least 7 m (the test sweeps this).
- Generalise the walk/geometry test from S-only (`S_BESIDE_A`) to any "beside" pair, and rebuild Tsumugibashi as a three-line station.

## Stage 3: Sumire Line
Seiran M-11 · Midorizaka M-12 (crosses Y) · Kita-Ōdōri M-13 (own platforms in a hub shell) · Daigaku-mae M-14 · Hanamizuki M-15 (on S tracks) · Minami-Sakuragawa M-16 · Harunodai M-17.
- Sim work: **shared track sections**. Today each line owns its tracks and runs a closed-form cycle. Add junction chainage mapping so M trains run on S's geometry over the shared segment, and offset M's phase against S headways so no two trains occupy the same block. Departure boards at shared stations (Daigaku-mae, Hanamizuki) merge both services.
- Hub: replace one shell's hoarding with gates and platforms (see station-design.md "To open a shell").

## Critical files
`src/data/network.ts`, `src/data/types.ts`, `src/sim/timetable.ts`, `src/sim/alignment.ts`, `src/stations/specs.ts`, `src/stations/hub.ts`, the station walk/geometry tests, `docs/network.md`, `docs/worldbuilding.md`, `docs/station-design.md`, `docs/vision.md`.

## Verification (each stage)
- `npm test`: station-on-alignment, right-angle crossing, 7 m crossing clearance, and walkability flood-fill for every new station.
- `npm run typecheck` and `npm run build`.
- `npm run dev` preview: the route map is readable and matches the network, teleport into every new station, ride each extended or new line end to end, and check that departure boards read the timetable (and at shared S/M stations, show both services).
