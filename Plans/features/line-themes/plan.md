# Line themes

## Goal

Each line's platforms should be recognisable without reading a sign, the way a Midōsuji platform
doesn't look like a Nagahori Tsurumi-ryokuchi one. Today a line is only a colour band; every hall
has the same ceiling, pillars, strip lights and benches.

Decisions (user, 2026-11-18):

- **Architecture too**: ceiling form, pillar shape, lighting, wall treatment, benches.
- **Line = form, station = colour**: the line sets the shapes and the kind of material; each
  station keeps its own colours and mural (`specs.ts` is not rewritten).
- **Era + name motif**: the era the line opened decides the architecture; the line's name gives a
  small recurring motif.
- **All six lines** in this pass. Platform halls only; concourses, gates and exits stay shared.

## The six themes

| Line | Opened | Idea | Ceiling | Pillars | Lighting | Walls + motif | Benches |
|---|---|---|---|---|---|---|---|
| **Y** Yanagisuji | 1933 | The first subway: pre-war civic pride | Barrel vault where the hall is open; under a concourse, cream riveted cross-beams with haunches | Square riveted steel columns, painted the station's pillar colour | Pendant globe lamps on rods, warm | Darker tile dado with a capping course; **willow** frieze of hanging leaf strands in line green | Wooden slat benches |
| **N** Nagisa | 1961 | High-growth era, built fast and plain | Flat, with concrete downstand beams every bay | Chunky square tiled columns between the tracks | Two unbroken rows of bare fluorescent battens | Two-tone tile; a stepped **shoreline** band, blue over a pale foam line | Rows of moulded shell seats on a wall rail. Elevated: scalloped canopy valance on steel posts |
| **A** Akanesuji | 1994 | Deep line of the bubble years: stone and brass | Dark coffered soffit with a raised centre cove | Fat round stone-clad columns with stacked brass collars | Indirect glow from the cove, plus small downlights | Large stone panels; **madder-dyed warp threads**, groups of thin vertical red bars of uneven length | Stone plinths with a red cushion |
| **S** Shiokaze | 2004 | Sea breeze: light, white, airy | White transverse fins whose depth rises and falls in a wave along the platform | Slim paired white steel tubes with an orange collar | Cool linear lights between the fins | Staggered horizontal **wind streaks** in orange and white | Perforated steel with a pale wood seat |
| **K** Kikyō | 2015 | Night garden | Near-black soffit | Round columns flaring into a lit bell capital | Five round downlights in a pentagon round each column (the **bellflower** star) | Dark below, pale above, with rows of small purple star studs | Round drum seats |
| **M** Sumire | 2023 | Newest: timber and soft light | Warm timber battens running lengthwise | Slim square timber-clad posts with a violet light slot | Continuous thin LED lines between the battens | Timber-slat wainscot; a sparse drift of **violet petals** | Solid timber blocks with a violet cushion |

Opening years are new worldbuilding and go in `docs/worldbuilding.md`. The docs call Akanesuji
"the newest" line; that becomes "the deepest, and the first with full-height doors".

## Approach

1. **Shared hook** (done first, by hand): `src/stations/themes/`.
   - `types.ts`: a `LineTheme` with optional hooks that `hall()` calls instead of its defaults:
     `ceiling`, `lights`, `pillar`, `wallTrim`, `bench`, `canopy` (elevated), plus `vault`.
   - `index.ts`: `themeFor(lineId)`. A line with no theme gets today's look.
   - `kit.ts`'s `hall()` delegates to the hooks; the current code becomes the defaults.
2. **One file per line** (`themes/y.ts` … `m.ts`), each written by its own subagent, so they can
   work in parallel without touching the same file.
3. Themes are **decoration only**: no new colliders beyond the pillar's existing post and the
   bench's existing box, nothing below 2.5 m over the walking area, signs and screen doors
   untouched. So the walk test should pass unchanged.
4. Existing material keys only (`tile`, `panel`, `wood`, `brick`, `concrete`, `metal`, `paint`,
   `flat`, `glass`, `glow`, `light`); no texture work in this pass.
5. The hub and interchanges pick the themes up for free, because each line's hall is built by
   `hall()` with that line's context.

## Open questions

- Sumire trains share the Shiokaze platforms from Daigaku-mae to Hanamizuki. Those halls are
  Shiokaze's, so they get the Shiokaze theme.
- Station `vault: true` (Kita-Ōdōri) is kept; the Yanagisuji theme makes the vault its default.

## Done

- Standing on any platform, you can name the line from the architecture alone.
- Stations on one line still differ from each other in colour and mural.
- `npm test`, `npm run typecheck` and `npm run build` pass; a platform of each line checked in the browser.
- `docs/station-design.md` and `docs/worldbuilding.md` updated.
