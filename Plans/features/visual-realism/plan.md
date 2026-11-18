# Visual realism pass

**Status:** approved and built (2026-11-18), with CC0 scans for weathered surfaces. See "What was built" at the end for where it differs from the plan.

## Goal

Make stations read as "somewhat realistic": the look of the reference photos supplied with the request (a busy surface platform with tiled floor and yellow signage; three underground platforms with glossy floors, screen doors, panel walls and recessed ceiling lights). Function, layout, collision and the sim do not change.

## Why it looks bad now

Checked in the browser at Tsumugibashi (concourse, both platforms, street):

1. **Lighting is flat.** One ambient + hemisphere + a sun that shines straight through the ground. No shadows, no contact darkening, so every surface is the same brightness and nothing looks grounded.
2. **Materials have no surface response.** Everything is `MeshLambertMaterial`: no gloss, no reflections. The references are dominated by ceiling lights reflecting in the floor, glazed tile and enamel panels.
3. **Textures are 64–256 px colour-only canvases** with heavy uniform grid lines. No normal or roughness detail, and visible repetition.
4. **Tone mapping is off** (`<Canvas flat>`), so whites clip and colours look like a diagram.
5. **Geometry is bare boxes**: square pillars, slab ceilings with no fixtures, featureless screen-door panels, no skirting or trims.

Textures alone will not fix it. Roughly: lighting and material response are half the gain, textures a third, geometry trims the rest. The order below follows that.

## Approach

Four phases, each one shippable and judged by before/after screenshots from the same fixed viewpoints (concourse gate line, N platform, Y platform, exit stair, street).

### Phase 1 — Light and renderer

- ACES tone mapping; drop `flat`.
- `MeshLambertMaterial` → `MeshStandardMaterial` with per-finish roughness/metalness.
- **Image-based lighting.** Two environment maps built at runtime with `PMREMGenerator`: an *interior* one (rows of light strips in a dark box) and a *sky* one. Cross-faded by the same underground test the fog already uses. This is what puts the ceiling lights into the floor.
- Sun and sky light only above ground (scaled by that same test), so platforms are lit by their own fixtures.
- **Ambient occlusion + bloom** as post-processing (`GTAOPass`, `UnrealBloomPass`, `OutputPass` from `three/examples`, no new dependency). AO gives the dark line where walls meet floors and under benches; bloom makes light strips and LED boards glow.
- Sun shadows outdoors only (one shadow map following the player).
- A **quality toggle** in the menu (High / Low) that switches post-processing and shadows off.

### Phase 2 — Materials and textures

Rebuild `render/materials.ts` as PBR sets: colour + normal + roughness, 512–1024 px, mipmapped, anisotropy 16. Keys stay the same (`tile:#24407a`, `floor:#…`), so station specs and the kit do not change.

| Finish | Target (from the references) |
|---|---|
| Floor | 300–400 mm stone-look tiles, thin dark grout, speckle, per-tile tone variation, semi-gloss, duller wear lanes |
| Tactile paving | 300 mm tiles with real dome / bar relief in the normal map; warning vs guidance variants |
| Glazed tile | Small tiles with bevelled edges, glossy, slight per-tile colour drift |
| Enamel / steel panel | Large panels with joint lines and a faint ripple so reflections wobble |
| Brushed stainless | Gate cabinets, handrails, screen-door housings, train bodies |
| Ceiling | Perforated / slatted panels, recessed light troughs |
| Glass | Reflective, for screen doors, canopies and train windows |
| Concrete, tunnel lining, sleepers, asphalt, pavers, brick, wood, grass | Weathered, with stains and large-scale variation |
| Facades | Windows that reflect the sky (roughness map), mullions, floor bands |

Repetition is broken with a second low-frequency grime layer at a different scale.

**Texture source — the one real decision (see open questions):**

- *Recommended: hybrid.* Manufactured finishes (tiles, panels, tactile, metal, ceiling, glass) stay procedural: they are regular patterns, they must be tinted per station, and code does them crisply. Weathered surfaces (concrete, tunnel lining, asphalt, brick, wood, grass, ballast) use **CC0** photo-scanned sets from ambientCG / Poly Haven, about 8 sets at 1K, roughly 10–15 MB in `public/textures/`. Each recorded in `docs/references.md`.
- *Alternative: procedural only.* Keeps the "no third-party assets" rule. Clean finishes will look just as good; concrete, asphalt and tunnel walls will look noticeably more synthetic.

### Phase 3 — Kit detail (decoration only, no collision changes)

- Round tiled pillars with a base ring and line-colour band.
- Screen doors: proper housings, framed glass, door leaves with windows, car/door number plates.
- Ceilings: recessed light troughs, service gaps, hanging sign boxes with lit faces, cameras, speakers, emergency-exit lights.
- Skirting along every wall, stair nosings and handrails, bench seats that are not slabs, gate cabinets with rounded ends.
- Trains: body panels, window frames, door rubbers, underfloor boxes.

### Phase 4 — Outdoors

Sky gradient, sun shadows, kerb and road wear, better trees, building facades with depth at street level. Lower priority than underground: the stations are the point.

## Constraints

- `sim/`, `world/`, `stations/` stay free of three.js; the walk and sim tests must keep passing untouched.
- All timetable-driven signs keep reading the timetable (rule 7). Nothing here touches sign content.
- Fictional rule holds: finishes are drawn *in the style of* the references; no real signage, names or logos are reproduced.
- Target 60 fps at 1080p on a mid-range laptop GPU with High; Low must match today's frame rate.

## Open questions

1. **Allow CC0 scanned textures for weathered surfaces, or stay fully procedural?** This reverses a rule written into `docs/architecture.md` and `docs/references.md`, and means downloading files into the repo.
2. Is planar floor reflection (a true mirror of the hall in the floor, rendered a second time) worth its cost later? Not in this plan; the environment map approximates it.

## Done means

- [x] Before/after checked from the five fixed viewpoints at Tsumugibashi, plus Hyōtanbori (dark tile) and Hibarino (elevated).
- [x] `npm test`, `npm run typecheck` and `npm run build` pass.
- [ ] High holds the frame-rate target; Low is no slower than today. **Not measured**: the preview pane throttles the page, so there is no trustworthy number yet.
- [x] `docs/architecture.md`, `docs/station-design.md` and `docs/references.md` updated to match what was built.

## What was built, and where it differs

- **Phase 1** as planned, with one change of approach: instead of cross-fading the environment by camera position, daylight vs station light is stored per vertex (`aEnv`), so a stairwell is lit correctly from both ends at once and trains carry their own value.
- **Phase 2** as planned. Scans used: concrete ×2, asphalt, brick, wood, gravel, grass (7 sets, 21 MB — more than the 10–15 MB estimated). Pavers stayed procedural: the scanned candidates were European cobbles.
- **Phase 3** partly: round columns, screen doors, light housings, dark soffit over tracks, skirting, platform edge, benches, stainless gates and rails. **Not done:** cameras, speakers, exit lights, door number plates, rounded gate cabinets, train exterior detail.
- **Phase 4** partly: sky dome, sun shadows, reflective facade windows, clustered tree canopies. **Not done:** kerb and road wear, street-level facade depth.
- Sloped handrails on exit stairs were tried and removed: the Builder only makes axis-aligned boxes, so they came out as stepped dashes.

## Next, if wanted

1. Measure frame rate on real hardware; tune AO samples and shadow size from that.
2. The rest of Phase 3 and 4 above.
3. A sloped-box (or swept) part in the Builder, for handrails and escalator balustrades.
4. Planar floor reflections (open question 2).
