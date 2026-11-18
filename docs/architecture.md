# Architecture

_Mostly TBD. Fill this in as code is written, and keep it accurate. Don't describe aspirations._

## Stack

- React + TypeScript + Vite
- `@react-three/fiber`, `@react-three/drei`
- `@react-three/rapier` (likely, for walk-through collision)
- A state store such as zustand (TBD)

## Planned shape

```
src/
  data/        ← network data (lines, stations): the single source of truth
  map/         ← route diagram + geographic map views (2D, SVG or canvas)
  sim/         ← timetable + train movement logic (pure TS, no React, testable)
  stations/    ← 3D station scenes, one folder per station + shared parts
  ride/        ← ride-along view
  ui/          ← shared UI (station info panels, signage components)
```

## Principles

- **Sim logic is pure TS**, decoupled from rendering, so it can be tested without a browser.
- **Rendering reads state.** It never owns network or sim truth.
- **Shared 3D parts** (gates, signs, pillars, screen doors) live in one place and are reused across stations.
