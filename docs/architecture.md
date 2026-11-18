# Architecture

Describes what exists. Keep it accurate; don't describe aspirations.

## Stack

- React 19 + TypeScript (strict) + Vite
- three.js through `@react-three/fiber`
- zustand (UI state only), vitest
- **Not used:** drei and rapier. The scene is built imperatively from part lists, and collision is hand-written (see below), so neither was needed. No image, model or audio assets: every texture and sign is drawn to a canvas at runtime.

## Layout

```
src/
  data/       network.ts, types.ts    ← lines + stations: the single source of truth
  sim/        alignment, geometry, timetable, index (clock)   ← pure TS, tested
  world/      builder (part lists), collision (character controller), structure
  signs/      content (sign types as data), draw (canvas rendering)
  stations/   kit (reusable parts), surface (street generator), build (composers),
              specs (per-station design), index (registry + collision frames)
  trains/     car (rolling stock as parts), system (live train state)
  render/     materials, geometry, part-view, sign-set, track, world-view, Scene.tsx
  player/     player.ts (state + movement)
  ui/         store, MainMenu, MetroMap, Hud
```

## Data flow

```
data/network.ts ──► sim (geometry + timetable) ──► trains/system (per-tick state)
       │                    │                              │
       │                    └──► signs/draw (departure boards, in-car displays)
       ├──► stations/build (+ specs) ──► Build { boxes, ramps, signs, gates, zones }
       │                                   ├──► world/collision frames
       │                                   └──► render/* meshes
       └──► ui (map, panels, HUD)
```

- **Sim is pure TS.** `trainStateAt(timetable, train, time)` returns where a train is. Nothing integrates over time, so there is no drift and the sim can be tested without a browser.
- **Rendering reads state.** It never owns network or sim truth.
- **One part list, two consumers.** Stations and train cars are built with `Builder` into plain data (boxes, ramps, signs, gates). The renderer merges the boxes into one mesh per material; the collision world uses the same boxes. What you see is what you bump into.

## The frame tick (`render/Scene.tsx`)

1. `clock.advance(dt)`
2. `updateTrains(clock.time)` — every train's state and every car's pose
3. `tickPlayer(dt)` — carry with the car being ridden, then move and collide
4. camera follows the player
5. `WorldView.update()` — mount/unmount stations by distance (≤ 1 per frame), move train meshes, slide doors and platform gates, redraw live signs twice a second

## Collision (`world/collision.ts`)

No physics engine. The world is a set of **frames**: each station, and each train car, is a rigid transform holding axis-aligned boxes and ramps in local coordinates.

- The player is a vertical cylinder. Each tick it is resolved against every nearby frame **in that frame's local space**. That is why a station can sit at any angle, and why standing in a moving, turning, climbing car is stable.
- **Riding:** if the player is inside a car's interior box, they are moved by the car's change in pose before their own movement is applied, and the camera turns with the car.
- **Stairs** are ramps (smooth to walk); the visible steps are decoration. **Escalators** are ramps with a conveyor speed.
- **Doors and platform gates** are blockers with an `isOpen()` read from the timetable.
- Each station has a walkable plot bounded by invisible walls. Falling out of the world respawns you at the last station.

## Rendering notes

- **Stations** are streamed: mounted within ~520 m of the camera, disposed beyond ~680 m. Collision for all stations is always loaded (it is small).
- **Track** (`render/track.ts`) is swept along the alignment: twin or double tunnels, an open cut, a viaduct with piers, rails and sleepers, crossovers at both ends. What structure carries the track is derived from the rail level (`world/structure.ts`).
- **Backdrop**: a ground plane with holes for station plots and the open cut, and low-detail buildings near anything visible from the surface.
- **Signs** are `SignContent` data drawn to canvas textures. Live ones (`dep`, `depAll`, `lcd`) are redrawn from the timetable.
- Fog fades to black underground and to sky above ground.

## Tests

- `src/sim/sim.test.ts` — network data sanity, timetable continuity, speed limits, train separation, departures match trains at platforms with doors open.
- `src/stations/walk.test.ts` — flood-fills each station from its spawn with the real character controller: every platform, concourse, passage and street must be reachable, and the track bed must not be.

## Not verified automatically

Things only checked by eye in the browser: visual quality, signage legibility, boarding through open doors, riding stability, pointer-lock mouse look.
