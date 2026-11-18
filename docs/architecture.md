# Architecture

Describes what exists. Keep it accurate; don't describe aspirations.

## Stack

- React 19 + TypeScript (strict) + Vite
- three.js through `@react-three/fiber`
- zustand (UI state only), vitest
- **Not used:** drei and rapier. The scene is built imperatively from part lists, and collision is hand-written (see below), so neither was needed. Post-processing uses the passes that ship with three.js (`three/examples`), not a separate library.
- **Assets:** signs and manufactured finishes (tiles, panels, tactile paving, metal, glass, facades) are drawn to canvases at runtime. Weathered surfaces (concrete, asphalt, brick, wood, grass, ballast) are CC0 photo-scanned textures in `public/textures/` — see [references.md](references.md). No models or audio.

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
  render/     materials, textures (procedural PBR sets), lit (the shader patch),
              lighting (environments, sun, sky), post (AO + bloom), geometry,
              part-view, sign-set, track, world-view, Scene.tsx
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
6. `Lighting.update()` — sky dome follows the camera, sun shadow map is refreshed (High, above ground only)
7. render: through the post chain on High, straight to the canvas on Low. The frame callback has priority 1, so R3F does not render on its own.

## Collision (`world/collision.ts`)

No physics engine. The world is a set of **frames**: each station, and each train car, is a rigid transform holding axis-aligned boxes and ramps in local coordinates.

- The player is a vertical cylinder. Each tick it is resolved against every nearby frame **in that frame's local space**. That is why a station can sit at any angle, and why standing in a moving, turning, climbing car is stable.
- **Riding:** if the player is inside a car's interior box, they are moved by the car's change in pose before their own movement is applied, and the camera turns with the car.
- **Stairs** are ramps (smooth to walk); the visible steps are decoration. **Escalators** are ramps with a conveyor speed.
- **Doors and platform gates** are blockers with an `isOpen()` read from the timetable.
- Each station has a walkable plot bounded by invisible walls. Falling out of the world respawns you at the last station.

## Lighting and materials

There are no per-station lights. Everything is lit by two prefiltered environment maps built at start-up (`render/lighting.ts`): an **interior** one (pale room with rows of ceiling light strips) and a **sky** one. Which one a surface sees is data on the geometry:

- Every vertex carries `aEnv = (sky, shade)`. `sky` is how much daylight reaches it; `shade` dims the interior light (tunnels).
- **Stations:** `sky` comes from height — 1 above street level, fading to 0 one metre below it — so exit stairwells blend from daylight to station light on their own. Parts that are open to the sky below street level (canal, sea) are wrapped in `Builder.open()`.
- **Track:** from the structure type at each chainage. Tunnel lamps lower `shade` around them, which gives pools of light on the walls.
- **Trains:** faces inside the saloon are always interior-lit. The exterior follows the car through a per-car uniform (tunnel → station → open air).
- The sun is a directional light scaled by `sky`, so it never reaches a platform, shadows or not.

All of this lives in one shader patch on `MeshStandardMaterial` (`render/lit.ts`), which also adds a low-frequency "macro" variation in world metres to hide texture tiling, and keeps reflections visible on glass. The patch replaces named chunks of three.js's shader and warns in the console if a chunk no longer matches — check it when upgrading three.

Materials are PBR sets (colour, normal, roughness). Procedural patterns are computed once as float fields and re-tinted per colour (`render/textures.ts`), so `tile:#24407a` and `tile:#ece8df` share their normal and roughness maps.

**Quality setting** (menu, stored in `localStorage`): *High* adds ambient occlusion (GTAO), bloom and sun shadows through `render/post.ts`; *Low* renders directly with none of them.

## Rendering notes

- **Stations** are streamed: mounted within ~520 m of the camera, disposed beyond ~680 m. Collision for all stations is always loaded (it is small).
- **Track** (`render/track.ts`) is swept along the alignment: twin or double tunnels, an open cut, a viaduct with piers, rails and sleepers, crossovers at both ends. What structure carries the track is derived from the rail level (`world/structure.ts`).
- **Backdrop**: a ground plane with holes for station plots and the open cut, and low-detail buildings near anything visible from the surface.
- **Signs** are `SignContent` data drawn to canvas textures. Live ones (`dep`, `depAll`, `lcd`) are redrawn from the timetable.
- Fog fades to black underground and to the horizon colour above ground. The sky is a dome that follows the camera.
- Signs: light boxes and LED boards are self-lit (and bloom slightly); posters, murals and machine fronts are lit by the room like any other surface.

## Tests

- `src/sim/sim.test.ts` — network data sanity, timetable continuity, speed limits, train separation, departures match trains at platforms with doors open.
- `src/stations/walk.test.ts` — flood-fills each station from its spawn with the real character controller: every platform, concourse, passage and street must be reachable, and the track bed must not be.

## Not verified automatically

Things only checked by eye in the browser: visual quality, signage legibility, boarding through open doors, riding stability, pointer-lock mouse look. Frame rate has not been measured on real hardware since the visual pass.
