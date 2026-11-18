# Graphics effects: film look, colour grading, floor reflections + settings

**Status:** approved and built (2026-11-18). See "As built" at the end.

## Context
The render path already has shaders: the sky (`src/render/lighting.ts`), the patched lit material (`src/render/lit.ts`), and a High-only post chain in `src/render/post.ts` (GTAO → bloom → OutputPass). Graphics are a single High/Low switch on the main menu (`useUI.quality`, saved as `kawaminato.quality`).

This plan adds three effect groups, finer settings, and an in-game way to change them.

## Decisions (from Q&A)
- **Effects:** camera/film look, colour grading, polished-floor reflections. No stylised mode.
- **Controls:** presets plus an "Advanced" list with one switch per effect.
- **Where:** main menu and in-game (overlay on a hotkey, changes apply live).
- **Targets:** **High** has to run smoothly on a mid-range laptop. **Ultra** is for a gaming PC (RTX 5070 class).

## Presets
| Effect | Low | High (laptop) | Ultra (gaming PC) |
|---|---|---|---|
| Sun shadows | off | on | on, 2× shadow map |
| Ambient occlusion | off | on (16 samples) | on (24 samples, finer denoise) |
| Bloom | off | on | on |
| Colour grading | off | on | on |
| Vignette | off | on | on |
| Film grain | off | on (subtle) | on (subtle) |
| Chromatic aberration | off | off | on (edges only) |
| Lens dirt | off | off | on |
| Floor reflections (SSR) | off | off | on |
| Render scale (DPR cap) | 1.0 | 1.5 (as now) | 2.0 |

Turning any effect on or off in Advanced switches the preset label to **Custom**. On Low, the composer still isn't built unless an Advanced switch needs it, so Low stays as cheap as it is now.

## Effects

### 1. Colour grading (`src/render/grade.ts`, ShaderPass after OutputPass)
- Lift/gamma/gain, saturation, white-balance temperature and tint, applied in display space.
- **Two grades, blended by the same underground factor `Scene.tsx` already uses for fog:** outdoors (neutral daylight, a little warm) and underground (slightly cool fluorescent, with a touch more contrast).
- **Per-line flavour:** an optional `grade` field on the line theme (`src/stations/themes/types.ts`), so each line's platforms get a slight tint matching its era (e.g. an older line warmer and a little faded, the newest line clean and cool). It blends in on that line's platforms and stays subtle, so signage colours remain correct. Line colours on signs must stay recognisable (check the bullets after grading).
- There's no time-of-day system (the sun is fixed), so grading doesn't change with time. If one is added later, it plugs into the same uniforms.

### 2. Camera/film look (`src/render/film.ts`, one ShaderPass, last in the chain)
One pass with per-effect uniforms, so each switch only sets a strength to 0:
- **Vignette:** soft, oval.
- **Grain:** animated, luminance-weighted (heavier in shadows), very low strength.
- **Chromatic aberration:** radial, only near the frame edges, so text in the middle stays sharp.
- **Lens dirt:** a procedural dirt texture (generated on a canvas, so no new assets), lit by the bloom buffer: smudges only show around bright lights.

### 3. Polished-floor reflections (Ultra)
- three.js `SSRPass`, placed after AO and before bloom. Only **marked** surfaces reflect: add a `reflective` flag to the lit material options (`src/render/lit.ts` / `materials.ts`) and set it on glossy floor finishes (platform tiles, polished concourse stone, platform-edge strips). Glass, the sky, and transparent or rough surfaces are skipped, as AO skips them.
- Reflection strength scales with the surface's roughness, and falls off with distance and at screen edges. Where SSR misses (off-screen), the existing environment map fills in, so there are no black holes.
- If SSRPass in three r0.187 turns out to fight with the HalfFloat/MSAA target or GTAO's depth, fall back to a small custom screen-space pass that reuses the GTAO depth/normal buffers. Decide during the build and note the outcome here.

## Settings & UI
- **Store** (`src/ui/store.ts`): replace `quality` with `graphics: { preset: 'low'|'high'|'ultra'|'custom', fx: {shadows, ao, bloom, grade, vignette, grain, chroma, lensDirt, ssr, scale} }`, saved under `kawaminato.graphics`. Migrate the old `kawaminato.quality` value once. localStorage stays in try/catch, as now.
- **`Post`** (`src/render/post.ts`) takes the effect set and builds or rebuilds only the passes it needs. Cheap toggles (grade, vignette, grain, chroma, lens dirt) just change uniforms, without rebuilding.
- **Main menu:** add **Ultra** next to High/Low, plus an **Advanced ▸** expander with a bilingual switch for each effect (e.g. 色調補正 *Colour grading*) and a one-line cost hint each.
- **In-game:** the **G** key (free; M, F and R are taken) opens a small graphics overlay with the same presets and switches. It releases pointer lock while open; Esc closes it. Movement input is ignored while it's open, as with the map. Add G to the Controls tab.

## Critical files
`src/render/post.ts`, `src/render/Scene.tsx`, `src/render/lit.ts`, `src/render/materials.ts`, `src/render/lighting.ts` (shadow map size), new `src/render/grade.ts` and `src/render/film.ts`, `src/stations/themes/types.ts` and the six theme files, `src/ui/store.ts`, `src/ui/MainMenu.tsx`, `src/ui/Hud.tsx` (or a new `GraphicsPanel.tsx`), `docs/architecture.md` (render path), `docs/station-design.md` (grade per theme).

## Verification
- `npm test`, `npm run typecheck`, `npm run build`.
- Unit test for the settings logic: preset → effect set, toggle → Custom, migration from the old key.
- Dev preview, using the same fixed viewpoints as the visual-realism pass (concourse gate line, an underground platform per line, an elevated N platform, the hub atrium, the street). Before/after screenshots for Low, High and Ultra, plus a check that each Advanced switch visibly does something and turns off cleanly.
- Toggle every setting in-game while walking: no console errors, no leaked render targets (renderer.info memory stays flat after repeated toggles).
- Rough frame-time check at each preset. High shouldn't cost noticeably more than today's High.

## As built
- **Reflections use our own pass** (`src/render/ssr.ts`), not three's SSRPass, which renders the scene itself and can't sit after GTAO. It is a normals/reflectivity prepass, then a half-resolution ray march with crossing detection and binary refinement, then a 3×3 blurred additive composite. `floor:` finishes (0.6) and `water` (0.9) are marked reflective.
- **Extra detail** (`hq`) is its own switch rather than being tied to the preset, so High plus Extra detail is possible. **Render scale** is a three-way selector (1×/1.5×/2×). It caps the device pixel ratio, so it only matters on high-DPI screens.
- **Lens dirt needs Glow:** it is lit by bloom's blurred mips, and its switch greys out while Glow is off.
- Platform zones now carry `line`, and the grade uses it (or the train you're riding).
- The in-game panel is a side sheet with no dimmed backdrop, so changes can be seen live.
- Verified in the dev preview: Tsumugibashi concourse and its Yanagisuji platform at Low, High and Ultra, every switch toggled off and back on, with no console errors. Frame time was not measured on real hardware.
