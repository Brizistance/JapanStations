# Kita-Ōdōri, phase 2: theme, wayfinding, models, new places

Status: built 2026-11-19 (see `docs/station-design.md`, the hub section). Not done: per-line departure boards at stair heads, real light sources, the wide plaza stair (exit 9 is an ordinary exit stair). Phase 1 (the new layout of passages and gate halls) is built in `src/stations/hub.ts` and passes all tests.

Decisions from the owner (2026-11-19):

| Question | Answer |
|---|---|
| Theme | Grand terminal: stone and brass |
| Theme reach | B1 and the station building. Platforms keep their line themes |
| Floor lines | One per metro line, as inlaid bands with badges |
| Signage | Overhead signs, area maps and exit lists, departure boards, adverts and small details |
| Blender models | The gilded willow, station furniture, Central Passage columns and lamps |
| New places | Plaza entrance to the spine, South gate for S and M, food hall off Willow Court |
| Life | Lighting moods only. No figures, no sound |

Frame used below: +x east, +z south. B1 floor is y = −7. Positions are from phase 1.

---

## 1. Theme: stone and brass

The story: Kawaminato Station is the city's old terminus, rebuilt underground in stages. The metro levels were refitted in stone and brass to match the old station hall.

### Palette

| Use | Material | Colour |
|---|---|---|
| Walls, main | `panel:` | Travertine `#d9cdb4` |
| Dado (floor to 1.1 m) | `panel:` | Dark stone `#6e5f4d` |
| Trim lines, frames, handrail caps | `flat:` | Brass `#b08d3a` (replaces today's brighter gold `#c9a227`) |
| Floors | `floor:` | Warm grey stone `#cfc7b6` |
| Floor border (0.6 m along walls) | `floor:` | Dark stone `#5b5146` |
| Shopfronts, kiosks | `wood:` | Dark timber `#4a3626` |
| Ceilings, passages | `ceil` with coffers | Cream `#ece5d3` coffer frames |
| Willow Court walls | `panel:` | Paler stone `#e6dcc6`, so the well stays bright |
| Signs' house colour | label signs | Deep green `#12382c` with brass lettering `#f3e3a0` (already used for Yanagi Mall) |

### Where each finish goes

- **Central Passage.** Stone walls with a dark dado, brass lines at dado top and at the springing of the ceiling. The flat luminous panels become deep coffers: a cream grid of beams with a light panel in each bay. Columns become the modelled fluted ones (section 4).
- **North and West Passages.** Same stone and dado, lower and plainer. Timber shopfronts. Lockers get a timber surround.
- **Yanagi Mall.** Stone walls, timber kiosks with brass name bands. Dark floor border round each kiosk so they read as buildings in a street.
- **Gate halls and transfer hall.** Stone walls; the back rooms get a timber-and-glass office front. Gate fences get a brass top rail.
- **Willow Court and levels 1 to 3.** Paler stone, brass bands on the well's columns at each floor (already there in gold), brass handrail caps on the glass railings. The wings' inner faces get stone pilasters every 8 m so they are not flat walls.
- **Platforms.** Unchanged, apart from the portals and shaft trims moving from gold to brass.

### How it is done

- The hub takes its wall and floor from the station style (`style.concWall`, `style.floor`) for kita-odori. I will set those for this station and replace the hard-coded `PANEL`, `STONE`, `GOLD` constants in `hub.ts` with the palette above.
- One helper, `stoneWall(...)`, draws wall + dado + brass line, so every passage is consistent.
- Risk: the look tests (`plans.test.ts`, `entry.test.ts`, `fill.test.ts`) compare stations for uniqueness. A new palette should only help, but they are run.

---

## 2. Floor lines

One inlaid band per metro line, in the line's colour from `network.ts`: Yanagisuji (Y), Akanesuji (A), Shiokaze (S), Sumire (M).

- **Band:** 0.2 m wide, set flush in the floor, bands 0.06 m apart, so four together are about 1 m wide.
- **Badges:** every 15 m, and at every junction, a `floormark` sign with the line badge and an arrow. The sign kind already exists.
- **Position:** 1.2 m off the right-hand wall of each passage (walking towards the trains), clear of the tactile paving.

### Routes

Every route starts at a way in and ends at the stairs or escalators of its line.

| From | Path | Lines carried |
|---|---|---|
| Station doors (1F) | Entrance hall → east escalator bank down into Willow Court → court door | Y A S M |
| Willow Court door | North Passage east → Central Passage | Y A S M |
| New plaza entrance | Foot of the stair in the Central Passage | Y A S M |
| Central Passage | South to the Central Gate | Y A S M, all turn in at the gate |
| Central Gate → Yanagisuji stairs | Inside the gate hall, to both stair heads | Y |
| Central Gate → transfer hall | Through the south doorway, then A to the west escalators, S and M on to the South Passage | A S M |
| South Passage | S peels off at the first shaft, M at the second | S M |
| Central Passage → mall east | South end, turn east to the East Gate | A |
| Exits 1–4 (mall east) | Along the mall west to the East Gate (A) and on to the Central Passage (Y S M) | Y A S M |
| Exits 5–8 (mall west) | Along the mall east to the West Gate | Y A S M |
| West Gate | A to the west escalators, Y to the stair by the transfer hall, S and M to the South Passage | Y A S M |
| New South gate | Up the South Passage to S and M shafts, on to A and Y | Y A S M |

### How it is done

- A small route table in `hub.ts`: each route is a list of points and the lines it carries. One function lays the bands along the points, mitres the corners and drops a badge at each corner and every 15 m.
- Where routes split, the leaving band turns away and the rest close up, so the bundle always sits tight.
- Colours and letters come from the network data, not hard-coded.

---

## 3. Signage and details

### Overhead direction signs

- At every junction: both ends of the Central Passage, the court door, both ends of the West Passage, the Central Gate, the East Gate, the West Gate, the South Passage mouth, and the two new entrances.
- Along long runs, one every 25 m: the mall wings (currently one sign in 90 m) and the Central Passage.
- Each board: line badges for trains, yellow for exits with numbers, white for Kawaminato Station and the future railways.
- Exit numbers on boards are grouped as in the mall: 1–4 east (bus terminal), 5–8 west (taxi), plus the two new ones.

### Area maps and exit lists

- `stationmap` and `areamap` boards (existing sign kinds) on the wall beside each gate and at the court door, in a brass frame.
- A yellow `exits` board at each mall junction listing what is near each exit. This reads `exits.ts`, so the two new exits must be added there first (section 5).
- Standing map totems (modelled, section 4) in Willow Court and the middle of each mall wing.

### Departure boards

- `depAll` boards (live, from the timetable) in three new places: a large one on the Central Passage's south bulkhead, one in Willow Court facing the court door, one in the transfer hall.
- Per-line `dep` boards at the head of each bank of stairs or escalators inside the gates, so you see the next two trains before you go down.
- No invented times: both kinds read the timetable.

### Adverts and small details

- Lit advert panels on the faces of the Central Passage columns and the mall kiosk ends.
- Poster frames in brass along the North and West Passages.
- Tactile paving: a guide line down each passage and warning blocks at stair heads and gates.
- Bins, fire cabinets with a red lamp, AED box, wall clocks at each gate, a lost-property and information window at the Central Gate.
- Benches in Willow Court and the mall (modelled).
- Skirting and expansion joints in the floor every 8 m, so big floors do not read as one sheet.

---

## 4. Blender models

Built by scripts in `tools/blender/` like the buildings and the train car, exported to `public/models/hub/*.glb`, with a catalogue entry so the builder can place them by name.

| Model | What | Where |
|---|---|---|
| `willow` | Kin no Yanagi: twisted brass trunk about 7 m, a crown of drooping gold fronds reaching up through the well, a stone base ring with seats and the four-faced clock | Willow Court, replacing the cylinder and spheres |
| `column` | Fluted stone column with a brass base and capital, in 3.6 m and 5.4 m heights | Central Passage, court door, mall |
| `lantern` | Brass hanging lantern with a glowing glass body | Central Passage (down the middle), Willow Court gallery, entrance hall |
| `bench` | Timber slat bench on brass legs | Court, mall, transfer hall |
| `info-kiosk` | Round information desk with a brass canopy | Entrance hall, Central Passage north end |
| `map-totem` | Standing map with a brass frame; the map face is a normal sign so it stays data-driven | Court, mall wings |
| `bin`, `planter` | Paired bins; a stone planter with a small tree | Throughout |

### How it is done

- **Loader.** Today only street buildings and the train car load models. Station props need a small loader on the render side (same pattern as `building-models.ts`), and collision boxes placed by the builder since models carry none.
- **Budget.** Each prop under about 3,000 triangles, the willow under about 20,000, shared materials. Columns and lanterns are instanced.
- **Fallback.** If a model fails to load, the builder's plain geometry stays in place, so the station is never broken by a missing file.
- **Dependency.** Blender must be running with its connector. If it is not reachable I stop and say so; the rest of the phase does not depend on it.

---

## 5. New places

### 5a. Plaza entrance to the Central Passage (Exit 9, "Central entrance")

- A wide stair with an up escalator from the plaza straight down into the north part of the Central Passage, landing near z = −50 and facing south.
- At street level: a glass and brass canopy on the plaza, east of the station doors, with the station name.
- The Central Passage's ceiling is cut for it, so daylight falls into the spine.
- Needs: a hole in the plaza slab, a new entry in `exits.ts` (the hub's exit list is hard-coded there) and in the exit signs. The ticket machines on the west wall move a few metres south.

### 5b. South gate for Shiokaze and Sumire (Exit 10, "South gate")

- The South Passage (x −30…−22) is extended south past the Sumire shaft to a small gate hall with five gates, two ticket machines and an office window.
- Beyond the gates, a stair up to the west sidewalk of Yanagi-suji, south of the avenue.
- This gives S and M their own way in, which phase 1 could not.
- Needs: checking the stair's path against the Shiokaze and Sumire halls below and the city blocks above (the block fill must leave the sidewalk opening clear), plus the same `exits.ts` work as 5a.

### 5c. Food hall off Willow Court ("Yanagi Yokochō")

- In the west wing at B1 (x −44…−24, z −108…−68), entered through two openings in the court's west wall.
- Low timber ceiling (2.8 m), two rows of counters with stools, lantern light, shop signs from the worldbuilding list. Names are checked against `docs/worldbuilding.md` first.
- About 20 × 40 m. It is the dense, warm counterpart to the tall court.

---

## 6. Lighting moods

The station renderer has glowing materials but, as far as I have seen, no per-room light sources. I will confirm in `src/render/lighting.ts` before building. Plan either way:

- **Warm pools:** amber glow at shopfronts, the food hall and under the willow; brass lanterns glow warm.
- **Cool passages:** the ceiling light panels in the plain passages stay neutral white, so warm places stand out.
- **Willow Court:** keeps daylight (`sky` zone); the willow gets up-lighting strips in its base.
- **Haze fix:** the far ends of the Central Passage and transfer hall wash out to white today. I will look at whether a per-zone fog setting can be turned down for the hub.
- If real light sources are possible cheaply (lanterns that light the floor), I will say what it costs before adding them.

---

## 7. Order of work and checks

1. Theme (palette, `stoneWall`, coffers). Screenshot for a go or no-go on the colours before anything else is built on it.
2. New places (5a, 5b, 5c), because floor lines and signs depend on the final layout.
3. Floor lines.
4. Signage and details.
5. Blender models and the prop loader.
6. Lighting moods.

After each of steps 1, 2 and 5: `npm run typecheck` and the full test suite (the walk test must reach every new zone). At the end: the station-checker once, fixes, then screenshots.

Docs to touch: the hub section of `docs/station-design.md`, the exit count in `docs/network.md` if it lists them, and `docs/worldbuilding.md` for the food hall's shop names.

## 8. What is not in this phase

- Passengers, queues and sound (declined for now).
- Restyling the four platform halls or the street front (theme stops at B1 and the building).
- Opening any of the reserved shells (AR Main Line, private railway, high-speed, new metro lines).

## 9. Open points

- Exit numbers 9 and 10 for the two new entrances, or names only ("Central entrance", "South gate")?
- The plaza entrance takes plaza space east of the doors, near the bus terminal walkway. If it crowds the bus stops it moves west of the doors instead.
- Usage: this is roughly twice the size of phase 1. Steps 1 to 4 are worth doing even if 5 and 6 wait.
