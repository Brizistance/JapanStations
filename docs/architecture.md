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
              hub (the central station's composer), specs (per-station design),
              index (registry + collision frames)
  trains/     car (rolling stock as parts: collision, doors, signs), system (live train state)
  render/     materials, textures (procedural PBR sets), lit (the shader patch),
              lighting (environments, sun, sky), post (the effect chain), graphics
              (presets + switches), ssr, grade, film, geometry, part-view, sign-set,
              track, world-view, Scene.tsx
  player/     player.ts (state + movement)
  ui/         store, MainMenu, MetroMap, Hud, GraphicsSettings
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
- **Shared track** is handled by phasing, not signalling. A line that runs on another's track (`shares`) gets a whole-timetable `offset` and a layover split (`padEnd`), chosen in `sim/index.ts` so its trains always enter the shared section half a host headway after a host train, in both directions. The vertical profile (`LineGeom.profile`) is built from the stops, the stations passed without stopping, and extra profile points, so a guest line's rails match its host's. See network.md.
- **Rendering reads state.** It never owns network or sim truth.
- **One part list, two consumers.** Stations and train cars are built with `Builder` into plain data (boxes, ramps, signs, gates). The renderer merges the boxes into one mesh per material; the collision world uses the same boxes. What you see is what you bump into.
- **Trains are the one exception.** The car's part list (`trains/car.ts`) is still its collision, its sliding doors and its live signs, but what you see is a Blender model (`public/models/metro-car.glb`, loaded by `render/car-model.ts`) built to the same dimensions. The model's materials are named with our material keys, so it goes through `getMaterial()` and the lit shader like everything else. If the file fails to load, the boxes are drawn instead.

## The frame tick (`render/Scene.tsx`)

1. `clock.advance(dt)`
2. `updateTrains(clock.time)` — every train's state and every car's pose
3. `tickPlayer(dt)` — carry with the car being ridden, then move and collide; then `tickPlatformVoice()` (`audio/`) announces departure-board status changes on the player's platform. Clips are pre-baked ElevenLabs mp3s in `public/audio/voice/`; after changing stations or wording run `npm run voice` (key in `.env.local`; inbound = female, outbound = male, safety male, etiquette female).
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
- Each station has a walkable plot bounded by invisible walls. Its size is part of the build (`Build.plot`): 260 × 170 m by default, 380 × 320 m for the hub. Falling out of the world respawns you at the last station.

## Lighting and materials

There are no per-station lights. Everything is lit by two prefiltered environment maps built at start-up (`render/lighting.ts`): an **interior** one (pale room with rows of ceiling light strips) and a **sky** one. Which one a surface sees is data on the geometry:

- Every vertex carries `aEnv = (sky, shade)`. `sky` is how much daylight reaches it; `shade` dims the interior light (tunnels).
- **Stations:** `sky` comes from height — 1 above street level, fading to 0 one metre below it — so exit stairwells blend from daylight to station light on their own. Parts that are open to the sky below street level (canal, sea) are wrapped in `Builder.open()`.
- **Track:** from the structure type at each chainage. Tunnel lamps lower `shade` around them, which gives pools of light on the walls.
- **Trains:** faces inside the saloon are always interior-lit. The exterior follows the car through a per-car uniform (tunnel → station → open air).
- The sun is a directional light scaled by `sky`, so it never reaches a platform, shadows or not.

All of this lives in one shader patch on `MeshStandardMaterial` (`render/lit.ts`), which also adds a low-frequency "macro" variation in world metres to hide texture tiling, and keeps reflections visible on glass. The patch replaces named chunks of three.js's shader and warns in the console if a chunk no longer matches — check it when upgrading three.

Materials are PBR sets (colour, normal, roughness). Procedural patterns are computed once as float fields and re-tinted per colour (`render/textures.ts`), so `tile:#24407a` and `tile:#ece8df` share their normal and roughness maps.

**Graphics settings** (`render/graphics.ts`, stored in `localStorage` as `kawaminato.graphics`). There are three presets: *Low* (no effects), *High* (made for a laptop) and *Ultra* (made for a gaming GPU). Under them is a switch for each effect; changing one by hand turns the preset into *Custom*. They can be changed on the main menu (Advanced) or in game with **G**, and apply live. The effect chain in `render/post.ts`:

```
scene → GTAO → floor reflections (ssr.ts) → bloom → lens: chroma + dirt (film.ts)
      → tone mapping (OutputPass) → grade + vignette + grain (grade.ts)
```

- A pass is created the first time it is switched on, then only skipped or kept, so toggles are instant. With every effect off, the composer is not built and the scene renders straight to the screen.
- **Floor reflections** are our own pass, not three's SSRPass: that one renders the scene itself and would have to replace the RenderPass, ahead of GTAO. A prepass draws view-space normals, with the material's `userData.ssr` reflectivity in alpha (set with `setReflective`, currently on `floor:` and `water`). The rays are traced at half resolution, then blurred and added on. Where a ray misses, the lit material's own env-map reflection stays.
- **Colour grading** eases between an outdoor and an underground grade, using the same "under" test as the fog. On a line's platforms (zones carry `line`) or on its trains underground, the line's own `LineTheme.grade` takes over.
- **Lens dirt** is lit by bloom's blurred mips, so it needs Glow.
- *Extra detail* doubles the sun shadow map (4096), raises the GTAO samples and lengthens the reflection rays. *Render scale* caps the device pixel ratio (1, 1.5 or 2).

## Rendering notes

- **Stations** are streamed: mounted within ~520 m of the camera, disposed beyond ~680 m (further for a station with a bigger plot). Collision for all stations is always loaded (it is small).
- **Track** (`render/track.ts`) is swept along the alignment: twin or double tunnels, an open cut, a viaduct with piers, rails and sleepers, crossovers at both ends. What structure carries the track is derived from the rail level (`world/structure.ts`).
- **Backdrop**: a ground plane with holes for station plots and the open cut, and low-detail buildings near anything visible from the surface.
- **Signs** are `SignContent` data drawn to canvas textures. Live ones (`dep`, `depAll`, `lcd`) are redrawn from the timetable.
- Fog fades to black underground and to the horizon colour above ground. The sky is a dome that follows the camera. A zone flagged `sky` (the hub's atrium floor) keeps the daylight fog even though it is below street level.
- Signs: light boxes and LED boards are self-lit (and bloom slightly); posters, murals and machine fronts are lit by the room like any other surface.
- Platform gates are instanced, one set per line. A gate marked `window` (the Akanesuji Line's full-height screens) is glazed almost top to bottom.

## Tests

- `src/sim/sim.test.ts` — network data sanity, every interchange crossing squarely at different depths (or side by side, or sharing a platform), timetable continuity, speed limits, train separation, departures match trains at platforms with doors open, a through-running line lying exactly on its host's track, and its trains never meeting the host's over a full combined cycle.
- `src/stations/walk.test.ts` — flood-fills each station from its spawn with the real character controller: every platform, concourse, passage and street must be reachable, and no keep-out volume may be (the track beds of every line, and the hub's closed shells). It explores as far as each station's zones reach, so a bigger station is covered without special cases.

## Not verified automatically

Things only checked by eye in the browser: visual quality, signage legibility, boarding through open doors, riding stability, pointer-lock mouse look. Frame rate has not been measured on real hardware since the visual pass.
