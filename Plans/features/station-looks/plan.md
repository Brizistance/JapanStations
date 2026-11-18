# Station looks: themed concourses and tighter stations

## Goal

Away from the platforms every station is the same pale box: a 24 m wide, 3 m high concourse with
white walls and nothing in it. Two changes:

1. **Station looks.** Stations get an identity beyond the platform: finishes, a ceiling, a
   centrepiece, shops and clutter, and themed exits.
2. **Cramped where it should be.** Old lines get small, low, busy stations; new lines and the hub
   stay roomy, so the contrast tells you the line's age.

Decisions (user, 2026-11-18): a set of hero stations plus a lighter upgrade for the rest; themes
made of finishes + ceiling, a centrepiece, shops and clutter, and exits; cramped by era, by
filling the space, by tighter exit passages and by lower, busier platforms on the old lines; the
hub and the newest lines stay big.

## 1. Size by era

Concourse width becomes a setting derived from the line's opening year (a station spec can
override it). Interchange concourses cannot narrow (the transfer passages fix their width) and
the elevated stations' street-level concourses are already small; both are filled instead.

| Line (opened) | Concourse width | Feel |
|---|---|---|
| Yanagisuji (1933) | 16 m (was 24) | Narrow, beams and pipes overhead, fewer gates |
| Nagisa (1961) | 20 m (its side-platform stairs need the width) | Plain and low |
| Akanesuji (1994), Shiokaze (2004) | 20 m | Medium |
| Kikyō (2015), Sumire (2023), hub | 24 m (unchanged) | Roomy |

- **Exit passages**: the street entrances stay where they are, so a narrower concourse gets a
  longer exit corridor (4 m longer on Yanagisuji, 2 m on the 20 m stations): low ceiling, wall
  adverts. No change to the street layout.
- **Ceiling height**: the 3.0 m structure stays (signs hang in it), but old-line concourses get
  downstand beams, ducts and pipe runs down to about 2.55 m.
- **Platforms on Y and N**: a dropped ceiling at about 3.4 m under the concourse (was 4.05 m),
  with cable trays and pipes. Platform width is untouched (trains and doors depend on it). The
  Y and N line themes are adjusted to fit.

## 2. Station looks

Same pattern as line themes: `src/stations/looks/<station-id>.ts` exports a `StationLook`, a set
of optional hooks the concourse, exit and transfer-passage builders call. A station without one
gets the **default look**.

- **Default look (every non-hero station)**: a dado and trim in the station's own colours
  instead of bare wall; shop fronts and clutter along the walls chosen by seed (kiosk,
  convenience store, standing soba, bakery, coin lockers, photo booth, flower stall, advert
  pillars); beams and pipes on the old lines.
- **Shared parts** (`looks/parts.ts`): shop front, kiosk, lockers, beam, duct and pipe runs,
  advert pillar, lantern, noren, banner. Heroes and the default look both use them.
- **Hero stations** get finishes, ceiling, a centrepiece, shops and themed exits of their own:

| Station | Line(s) | Look | Centrepiece |
|---|---|---|---|
| Hyōtanbori | Y | Nightlife: black tile, gold trim, a yokochō of tiny bars | Neon alley of shop signs and red lanterns |
| Tsurumatsu | Y | Old shopping arcade carried underground: green tile, striped awnings | Arcade arch and awning-fronted stalls |
| Kurayashiki | S | Storehouse quarter: white plaster, namako tile, heavy dark timber | A kura front with timber beams across the hall |
| Kamomehama | A | Stadium station: sea-grey, wide queue lanes, match-day banners | Pennant ceiling and a dome wayfinding wall |
| Hoshimine | A | Observatory: midnight tile, brass | Star-field ceiling over the gates |
| Tōmyōbori | S, K | Lantern canal: dark timber, persimmon | Lantern-hung transfer passage |
| Aizomechō | N, A | Indigo dyers: indigo tile, timber lattice | Noren curtains and hanging dyed cloth |
| Daigaku-mae | N, S, M | Campus: brick, arches | Noticeboard court and brick arcade |

Shop and bar names are invented (no real brands) and recorded in `docs/worldbuilding.md`.
Nothing shows times or prices that are not real data.

## Approach

1. **By hand first**: the size setting, longer exits, the dropped platform ceiling, and the look
   hooks (`looks/types.ts`, `looks/index.ts`) with a `free()` helper that tells a look where it
   may build (clear of stairs, gates, exits, machines and walking routes). Looks may add solid
   objects (a kiosk is solid), so each one is checked by the walk test.
2. **Subagent round 1** (parallel): the shared parts + default look; the Y and N platform
   themes adjusted for the low ceiling.
3. **Subagent round 2** (parallel): one subagent per hero station.
4. Tests, typecheck, build, then a browser walk through an old station, a new one and the heroes.

## Open questions

- Elevated stations (Hibarino, Asahino, Takanodai, Izumigaoka) only get the default clutter in
  this pass; no hero among them yet.
- The hub is untouched.

## Done

- A Yanagisuji station feels small and busy; a Sumire one feels new and open.
- No concourse is a bare white box; the eight heroes are recognisable from the concourse alone.
- `npm test` (every zone still reachable), typecheck and build pass.
- `docs/station-design.md` and `docs/worldbuilding.md` updated.
