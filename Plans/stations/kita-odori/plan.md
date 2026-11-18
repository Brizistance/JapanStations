# Kita-Ōdōri hub (Kawaminato Station complex)

**Status:** built (2026-11-18). See `docs/station-design.md` for what exists.
**Companion plan:** [the Akanesuji Line](../../features/akanesuji-line/plan.md).

## Goal

Grow Kita-Ōdōri from a single-line station into the city's big central station: a really large, multi-level complex where the Yanagisuji and Akanesuji lines meet, with space already shaped for four more railways to plug in later.

## Decided in the interview

| Question | Answer |
|---|---|
| Name | **Split names, one complex.** Metro platforms stay **Kita-Ōdōri (北大通)**. The main-line building is **Kawaminato Station (川湊駅)**. Signs point between the two, as at Osaka/Umeda. No existing data is renamed. |
| Signature space | **Glass-roofed grand atrium**: daylight falls through several levels, bridges and escalators cross the void |
| Arrangement | **Stacked**: rail decks above, metro below |
| Future rail to allow for | More metro lines, a JR-style main line, a private-railway terminal, a high-speed line |
| Scope this pass | **Working core + shells.** Metro platforms and concourse fully working; future areas are walkable empty space with "future" signs. No fake trains or times. |
| Extras | Underground shopping street, landmark meeting spot, station plaza with bus and taxi ranks |

## Layout

Two streets cross at the station: **Yanagi-suji** (north–south, Yanagisuji Line below) and **Kita-Ōdōri avenue** (east–west, Akanesuji Line below). The station building stands on the north side of the avenue, with the plaza in front of it and the rail viaduct running east–west behind and through it.

| Level | Height | What is there | This pass |
|---|---|---|---|
| 3F | +14 m | High-speed deck: long viaduct level with its own concourse landing | Shell |
| 2F | +7 m | Main-line through platforms on the viaduct. Private-railway bay platforms (dead-end, buffer stops) in the east block. A gallery and bridges across the atrium link them. | Gallery and bridges built; platforms are shells |
| 1F | 0 | Atrium ground floor, station facade, **south plaza** with bus bays, taxi rank and a pedestrian crossing to the avenue | Built |
| B1 | −7 m | **Grand concourse** on the atrium floor: both metro gate lines, ticket machines, the meeting spot, and the **underground shopping street** running under the avenue to the far exits | Built |
| B2 | −12 m | Yanagisuji island platform in its existing white vaulted hall | Kept as it is |
| B4 | −19 m | Akanesuji island platform, full-height platform doors | Built |
| B4 | −19 m | One empty platform box beside the Akanesuji platforms for a future metro line, reached by a stub passage from B1 | Shell |

The glass roof sits at about +26 m, so the atrium void is roughly 33 m tall from the concourse floor.

### The moves that make it feel big

- **One void, seen from everywhere.** Standing at the meeting spot on B1 you look up past the street, the 2F gallery and the 3F landing to the glass roof.
- **The deep escalator bank.** The Akanesuji platform is 12 m below the concourse and sticks out either side of the Yanagisuji box above it. Long escalators run straight from the atrium floor down to it in an open shaft, which is the "newest, deepest line" moment.
- **The old hall as a wing.** The existing vaulted Yanagisuji hall is untouched. You step from the new atrium into it.
- **Long sightlines.** The shopping street runs the length of the plot under the avenue, so the complex takes a real minute or two to cross.

### Transfers

- **Y ↔ A:** up from the Yanagisuji platform to the grand concourse, across the atrium floor inside the paid area, down the deep escalators to the Akanesuji platform. One shared paid area, so no gates in between.
- **Metro ↔ future railways:** escalators from B1 up through 1F to the 2F gallery. Each future operator's gate line position is marked on the floor and closed off.

### Named features (proposals)

- **Meeting spot:** *Kin no Yanagi* (金の柳), a gilded willow sculpture with a clock, at the centre of the atrium floor. Named for Yanagi-suji.
- **Shopping street:** *Yanagi Mall* (ヤナギモール). Shops come from the existing invented-brand lists (Maruhoshi Mart, Café Tsumugi, Ramen Kawaichi and so on), with a few new ones added to those lists.
- **Platforms:** Yanagisuji 1/2 (unchanged), Akanesuji 3/4.
- **Exits:** numbered 1–8, on yellow signs, with the far ones reached through Yanagi Mall.

## How "expandable" works

Each future railway has its volume, its access route from the concourse and its gate position built now, then closed with hoardings.

| Future railway | Reserved now | To open it later |
|---|---|---|
| 4th metro line | Empty island-platform box at B4 and a stub passage from B1 | Add the line to the network data, remove the hoarding |
| Main line (JR-style) | 2F viaduct deck for through platforms, gate position on the gallery | New operator and line `type: 'jr'`, a viaduct alignment through the deck |
| Private railway | 2F bay-platform hall in the east block, with a department-store frontage zone left blank | Line `type: 'private'` terminating here; needs terminus-in-station turnback (no siding beyond the buffers) |
| High-speed line | 3F deck and landing | New line type and longer trains |

Hoardings and signs say only **将来線予定地 / Reserved for future line**, with the type of railway. The future operators are not named yet. Shells have no departure boards, and the map shows nothing for them, so the "no fake information" rule holds.

## What changes in the code

1. **A new composer**, `buildHub`, and a `HubSpec` in `src/stations/specs.ts`. It reuses the kit's hall, gate line, stairs, escalators and exits, and adds the atrium, galleries, long escalator bank, shopping street and shells.
2. **Per-station plot size.** Every station currently shares one 260 × 170 m plot. The hub needs roughly 400 × 320 m, so the plot becomes a property of the station, read by the street generator, the backdrop, the collision frame and the streaming distance.
3. **Kit additions:** glass roof and steel truss material, a shopfront run for the mall, a hoarding part, the willow clock, bus bay and taxi rank parts for the plaza.
4. **Signs:** a "to Kawaminato Station / to Kita-Ōdōri" direction sign and the "reserved for future line" hoarding sign, as new `SignContent` variants.
5. **Tests:** the walk test must reach every built zone including the shells' public side, and must not reach the track or the inside of a closed shell.
6. **Performance check:** this will be the largest station mesh by far, so frame rate is checked in the browser when it lands.

## Done means

- [x] Walkable from the plaza, through the atrium, down to both metro lines, and along the full shopping street to every exit (walk test).
- [x] Y ↔ A transfer works on foot inside the paid area.
- [x] From the meeting spot you can see the glass roof and the upper galleries.
- [x] All four future areas are visible and signed, and none shows a train or a time. The walk test confirms none can be entered.
- [x] The Yanagisuji hall keeps its vault and finishes. **Changed:** the vault now covers the southern 47 m instead of 76 m, because the concourse sits over the rest.
- [x] `npm test` passes; frame rate in the hub matched Tsumugibashi in the preview pane (about 38 fps in both, so the pane was the limit).
- [x] `docs/station-design.md` describes the hub composer and what is real versus shell.

## Differences from the plan

- No new hoarding or direction sign types were needed: the existing `guide` and `label` signs cover them. The one new sign type is a live `clock`.
- The department-store frontage was not built (it was not picked in the interview); the east block is a plain facade.
- The future metro box is seen through windows in the Akanesuji platform wall, as well as being signed from the stub passage on B1.

## Open questions (left at their defaults; say if you want any changed)

1. Are *Kin no Yanagi* and *Yanagi Mall* good names, or do you want others?
2. Should the future operators stay unnamed on the hoardings, or do you want to name them now (worldbuilding.md still lists them as TBD)?
3. The plaza is on the south side facing the avenue. Say if you would rather it face north or east.
