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
  ui/         store, TitleScreen, RegionMap, MainMenu (city menu), Settings, MetroMap (search, line highlight, hover card; names every station only when zoomed in; a diagram view from `diagram` coords and a geographic view from world positions and line alignments, whose coast and river are drawn by hand in `MetroMap.tsx`; route finder = earliest arrival over the timetable in `src/sim/route.ts`, with a 2 min change and 5 min walk allowance), Hud, Bi (two-language text)
              Hud (sign-look station name sign, clock with speed 0/1/6, departures), Notices (arrival card, train and place notices from the timetable, exits and lifts), PauseMenu (Esc or mouse release; clock stops)
              Guide (step card and alerts from sim/guide.ts: next step from where the player really is, on foot or on a given train; also feeds the on-board stop strip)
              Compass.tsx (round mini-map turned to the player's facing, from the station's zones, ramps, lifts and exits; rim markers are straight-line directions, not paths), Wheel (quick menu ring on Z), PauseMenu tabs (game, route map, guide, settings, controls)
              In game the mouse is captured; Tab frees it without pausing (store `freeMouse`) so the name board, departures rows, plan and compass markers can be clicked; releasing it any other way pauses
              A picked destination (map click, search, board row) is a preview first (`preview` in the store): its route shows on the map and guidance starts on Confirm; Guide.tsx also draws the journey strip, the step banner with its chime, the marker projected into the view (`dom.camera`) and the arrival summary
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
- **What cannot be seen is not drawn.** A station's static parts and signs are sorted into layers (`Layer` in `render/part-view.ts`: surface, deep, both). At a station whose only openings between street and underground are its exits (`Build.sealed`, set by `buildInterchange`), `WorldView.cull()` leaves out the street and the backdrop while you are indoors underground, and the halls, tunnels and tunnel trains while you are on the street, unless you are within 30 m of an opening. Track is drawn in 400 m chunks and not beyond the fog. Models are merged per material (`mergedModels()`), signs that share a texture are instanced (`SignSet`). `__sim.perf()` reports draw calls, triangles and frame time; the preview pane itself is capped near 33 fps, so use those, not fps.
- **Street buildings can be models too.** `Builder.model()` records a `ModelPart` (kind, variant, position, yaw) and the street builder adds an invisible collider for the lot (`fillModelLots()` in `stations/surface.ts`, footprints in `stations/buildings.ts`). `render/building-models.ts` loads `public/models/buildings/*.glb` (built by `tools/blender/build_*.py`, layout described in `buildkit.py`), shades them from vertex colours and draws each variant's sign texture with invented shop names. Kita-Ōdōri and Tsumugibashi (the rotunda, `stations/rotunda.ts`; its street with `models: true` in the surface spec) use them; the simplified `_lo` copies (a `ModelPart` id ending `_lo`) are drawn merged, one mesh per material (`mergedModels()`): Tsumugibashi's back rows and, through `Build.district`, the backdrop city within 330 m of it (`backdropModels()` in `render/world-view.ts`).

## The frame tick (`render/Scene.tsx`)

1. `clock.advance(dt)`
2. `updateTrains(clock.time)` — every train's state and every car's pose
3. `tickPlayer(dt)` — carry with the car being ridden, then move and collide; then camera, then `tickStationAudio()` (`audio/`): Osaka-style platform PA (line jingle → voice, per-station departure melody → doors closing, chime → notices) played from a row of filtered speakers along each track's platform edge, positional train/door/tunnel-wind sounds, ambience loops, platform-door chimes and footsteps, plus in-car announcements and speed-driven running noise (`audio/car.ts`) while riding, all timed from the timetable; echo is code-generated and sized to the current room. Clips are pre-baked ElevenLabs mp3s in `public/audio/`; after changing stations, wording or prompts run `npm run voice` / `npm run sfx` (key in `.env.local`; inbound = female, outbound = male, safety male, etiquette female).
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

The hour and the weather decide everything above ground: `render/atmosphere.ts` (pure, tested) turns the sim clock and the menu's weather choice into sun and moon position, light, fog, cloud cover and wetness; `lighting.ts` (sky dome, key light, sky environment recaptured as the sun moves), `weather.ts` (rain and the shelter map that keeps covered ground dry) and `Scene.tsx` (fog, grade) only read it. Underground is unaffected.

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
