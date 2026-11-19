# Kawaminato-kō: the harbour atrium

**Status:** built (2026-11-18). See `docs/station-design.md` ("Atrium") for what exists. Not built: the lift, glazing on the Nagisa wall, a hero look.

## Goal

Give Kawaminato-kō (N-11 / K-12) a layout no other station has, as the pilot for re-laying-out existing stations. Today it is one of six stations built by the stock interchange composer, so walking it feels the same as Aizomechō or Daigaku-mae. The point of the change is navigation: different levels, different decisions, a different route between the two lines.

## Decided in the interview

| Question | Answer |
|---|---|
| Big idea | **Deep open atrium**: one tall void from the concourse down to the Kikyō platform, crossed by escalators and bridges |
| Transfer N ↔ K | **Inside the gates, indirect**: one paid area, but through an intermediate level, following transfer signs |
| Difficulty | **Medium**: three levels of circulation, several gate lines, signs get you there in a minute or two |
| May change | Concourse, gates, passages; platform arrangement |
| Not this pass | Street scenery and the ferry terminal; a hero look (the station keeps the default look and its blue-grey finishes) |

## Layout

Station frame as now: +x along the Nagisa Line (east), +z south towards the sea. The Kikyō Line crosses under it at right angles, running north–south.

The atrium is a void about 15 m wide and 36 m long, on the **sea side** of the Nagisa box, directly over the Kikyō island platform.

| Level | Floor (approx.) | What is there |
|---|---|---|
| Street | 0 | Exits 1–4 where they are now; new exit 5 on the sea side |
| B1 | −5.0 m | Nagisa concourse over the Nagisa platforms as now (west and east gate lines), plus a **gallery** round three sides of the atrium with a third gate line at its south end |
| B2 | −9.9 m | Nagisa side platforms 1 and 2. Platform 2 (sea side) has doorways onto a **balcony** on the atrium's north edge |
| B3 | −15.5 m | **Transfer mezzanine**: a deck bridging the atrium above the Kikyō platform. An **underpass** beneath the Nagisa tracks brings platform 1 here |
| B4 | −22.9 m | Kikyō island platform 3 and 4, full-height platform doors, open to the atrium above |

### Platform arrangement

- **Kikyō goes deeper:** rail level −18.5 → about **−24**. At today's depth the Kikyō platform is only 7.5 m below the Nagisa one, which leaves no room for a mezzanine over it or an underpass under the Nagisa tracks. At −24 the void is about 18 m from the gallery floor to the platform. The neighbours (Shinshio, Watayamachi, both −10) are far enough for the grade; `npm test` checks the crossings.
- **Nagisa keeps side platforms.** Platform type and track spacing are per line in the data, so an island here would mean splaying the tracks in the sim. Not worth it for the pilot.
- The Kikyō hall's ceiling is cut away under the atrium, so from the gallery you look down on the platform and the train roofs behind the glass screens.

### Routes

- **Street → Nagisa:** as now, through the west or east gate line and down the concourse stairs.
- **Street → Kikyō:** any gate line, then to the gallery, escalators down the void in two flights: gallery → mezzanine → platform. From the south (harbour) gate line this is the short way; from the west and east gates you walk the gallery first.
- **Nagisa platform 2 → Kikyō:** doorway to the balcony, stair down to the mezzanine, escalator down.
- **Nagisa platform 1 → Kikyō:** stair down into the underpass, under the tracks, out onto the mezzanine, escalator down.
- **Kikyō → Nagisa:** up to the mezzanine, where the route splits by platform: "1" into the underpass, "2" up the balcony stair. This split is the main decision in the station.
- **Kikyō → street:** up both flights to the gallery, then choose a gate line: harbour (exit 5), east (1, 2) or west (3, 4).

The direct stairs from the old transfer passages to the Kikyō platform go away, and so do the passages themselves.

### Gates and exits

| Gate line | Where | Exits |
|---|---|---|
| West gates (西改札) | West end of the Nagisa concourse | 3, 4 |
| East gates (東改札) | East end of the Nagisa concourse | 1, 2 |
| Harbour gates (港改札) | South-east corner of the atrium gallery | 5, towards the quay and Kawaminato Ferry Terminal |

Exit 5 needs a stair and canopy on the sea-side pavement. The street scenery itself is not redesigned; only what is needed for the exit to come up clear of the road and the quay.

## Approach

- **A new composer**, `buildAtrium` in `src/stations/atrium.ts`, with spec `kind: 'atrium'` (as the hub has `hub.ts`). It reuses the kit: `hall`, `platformStairs`, `stairs`, `escalator`, `gateLine`, `exit`, `ticketMachines`, and `concourse()` for the Nagisa part.
- **Data:** K's `railY` at Kawaminato-kō in `src/data/network.ts`; the spec in `specs.ts`.
- **Wayfinding** stays generated: the composer reports its stair heads (`ConcInfo.stairs`), exits and passages, with new entries for the mezzanine and underpass. The split-by-platform signs on the mezzanine are the one new sign placement.
- **Exits:** `exits.ts` learns the atrium kind and exit 5, so the exit boards, area map and `exits.test.ts` agree with what is built.
- **Station map (構内図):** drawn from rail levels, so it should pick up the new depth. Check that the extra level reads properly.
- **Docs:** a row in "Layouts implemented" in `docs/station-design.md`; `docs/network.md` for the rail level; the interchange row loses this station.

## Open questions

1. **Kikyō depth.** −24 is the proposal. Shallower (−22) makes a tighter mezzanine; deeper makes longer escalators.
2. **Nagisa trains seen from the atrium.** The Nagisa box forms the atrium's north wall. Glazing that wall so trains are seen passing above the Kikyō platform would be the best view in the station, but `hall()` owns its walls. Proposed as a stretch goal after the layout walks.
3. **Lift.** One lift gallery ↔ mezzanine ↔ Kikyō platform, if the kit's lift fits the void edge.
4. **Hero look.** Left for a follow-up, once the layout is right.

## Done when

- You can walk every route above, in both directions, and ride in and out on both lines.
- `npm test` passes: sim geometry with the deeper Kikyō, the walk test (every zone reachable, track beds unreachable), `exits.test.ts`, `boards.test.ts`.
- `npm run typecheck` and `npm run build` pass.
- The other five interchange stations are unchanged.
- Signs alone get a first-time visitor from each gate line to each platform, and between the lines.
