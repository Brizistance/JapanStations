# Between stations: what the ride should show

A plan for later, not built yet. The owner's answers of 2026-11-20 on making the running line between stations look real from the train. When this is started, give a short plan in chat and wait for a yes, as for any feature.

## Today

`src/render/track.ts` sweeps one plain tunnel, an open cut and a viaduct along each line, with rails, sleepers, tunnel lamps and viaduct piers. Every line has the same tunnel. Nothing stands beside open-air track except what a station's own street scene shows.

## What the owner wants to see

All four: realistic tunnels, open-air stretches, special moments, and passing other trains.

## Rules

1. **Smooth ride first.** Detail is built in repeating segments and dropped at distance. Measure frame rate on a ride before and after (`__sim.perf()`), and cut detail if it falls.
2. **Tunnels match the line's era**, as the fittings inside stations do (`eraOf` in `src/stations/fittings.ts`).
3. **The city beside open-air track comes from the map**: each stretch shows the district it passes, built from the existing city models at low detail.
4. **The city band is scenery only and fades near stations.** It stops short of each station's own street scene so the two never overlap. It cannot be walked in.
5. **Only geography the map already has.** A bridge or a harbour view appears only where the existing map and `docs/worldbuilding.md` put water or a district. Anything new is proposed to the owner first and recorded there.
6. **No fake information.** Signals show what the trains are doing; nothing flashes for a train that is not there.

## Tunnels by era

| Era | Lines | Tunnel |
|---|---|---|
| Old (before 1970) | Yanagisuji, Nagisa | Shallow box tunnel, a row of columns between the tracks, bare lamps, cables on wall brackets |
| Mid (1970 to 2005) | Akanesuji, Shiokaze | Twin round bores with segment rings, a side walkway |
| New (after 2005) | Kikyō, Sumire, Ichō | One large bore, LED strips, walkway with handrail, cross-passage doors |

## Required details (not optional)

- **Working signals:** lit aspects that change with the trains.
- **Overhead wires and masts** on every open-air stretch; in tunnels, a rigid bar or third rail where that line would use one. Each line's choice is to be decided and written in `docs/network.md`.
- **Tunnel walkways and exits:** side walkway, handrail, cross-passage doors, green exit signs with distances.
- **Line-side signs:** distance posts, speed boards, gradient posts, station approach markers.

## Open-air stretches

- Along the track: wire masts and wires, noise walls, cable troughs, fences on embankments.
- Beside it: the low-detail city band by district (harbour, old town, suburbs, university and so on).

## Special moments

- **Portals:** a proper tunnel mouth with wing walls where a line comes out into daylight.
- **River and harbour crossings:** a truss or girder bridge where the map has water under a line.
- **Depots and sidings:** stabled trains and a shed by the turnback sidings that already exist at line ends.

## Passing trains

First check whether trains on the opposite track and on shared sections are already drawn while riding. If they are, add nothing; if not, make them visible from the car the player is in.

## Order of work

1. **Tunnels first** (most of the network is underground): one line per era, with ride screenshots for a go or no-go.
2. The remaining lines' tunnels.
3. Open-air trackside and the city band.
4. Portals, bridges and depots.
5. Passing trains.
6. Full test suite, and move the built parts of this file into `docs/station-design.md` or `docs/architecture.md` as they land.

## Where the work would go

- `src/render/track.ts`: tunnel profiles by era, trackside segments, portals, bridges.
- `src/sim/geometry.ts`: what structure a stretch is (tunnel, cut, viaduct); read before changing.
- A new Blender script beside `tools/blender/build_road.py` for trackside pieces (signals, masts, posts, walkway parts).
- `src/stations/fittings.ts` for the era of a line; `tools/blender/build_city.py` models for the city band.

## Built so far (2026-11-20)

**The old-era tunnel on the whole Yanagisuji Line** (`oldStretch` and the kit block in `src/render/track.ts`): every tunnel run between its ten stations, about 5.5 km, one run at a time. It began as a sample between Kita-Ōdōri and Tsumugibashi, approved by the owner on 2026-11-20. The crossover is only on that first stretch.

- One box tunnel round both tracks, 4.1 m clear, a column between the tracks every 5 m.
- Power: **third rail** on the outer side of each track under a cover board (the owner's choice for this 1933 line).
- Dim with pools of light: a warm bare bulb over each track every 18 m.
- A walkway ledge along the up side, three cable runs on brackets along the down side, a soot band under the roof.
- A refuge niche every 30 m and a relay box every 45 m.
- A scissors crossover beside Kita-Ōdōri: scenery only, no train uses it; the columns stop for its length.
- Signs as self-lit plates: green exit signs with the distance to each station, distance posts, a speed board after each station and three countdown boards before the next.
- Signals about every 150 m on each track, red within 170 m behind a train, yellow to 340 m, green beyond, read each frame from the trains' real positions (`trainStateAt`).

**The Nagisa Line from Daigaku-mae to Hibarino** (2026-11-22, `src/render/stretches.ts`, the kit in `track.ts`, the band in `world-view.ts` `cityBand`): the old box tunnel and its kit, a portal with a 渚線 1961 plate, a cutting with cable troughs and fences, the viaduct with noise walls kept under the window sills, a through-girder span over 菜種筋 with a clearance board, and a band of houses, shops and flats (two rows back to back along a lane each side) that stops at each station's plot and continuation. The whole N line has overhead wire (rigid bar under roofs, gantries every 50 m in the open).

Not built: the ventilation shaft opening; everything else in this file. The frame rate was not compared before and after (the preview used for checking was too unsteady to give a fair reading).
