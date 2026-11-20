# Plan: Japanese trees, and the tunnel between Kita-Ōdōri and Tsumugibashi

Not built yet. The owner's answers of 2026-11-20. Two separate pieces of work; either can be built first.

## Part 1: trees

### Why

The street trees today are three generic models (`tree_a`, `tree_b`, `tree_c` in `tools/blender/build_city.py`) and a coded `tree()` helper at other stations. The owner wants trees that are recognisably Japanese, in several kinds, with seasons.

### Reference

A 2022 survey by the National Institute for Land and Infrastructure Management counts about 6.29 million street trees in Japan. The top five are ginkgo, cherry, zelkova, flowering dogwood and trident maple (nilim.go.jp, report ks1246). The street set follows it: the owner chose trident maple over plane tree and added dogwood.

### The set (11 kinds)

| Use | Kinds | Shape to get right |
|---|---|---|
| Street | Ginkgo | narrow cone, upright branches |
| Street | Zelkova (keyaki) | vase: a short trunk fanning into a wide flat top |
| Street | Flowering dogwood | small, layered, horizontal branches |
| Street | Trident maple | medium oval crown |
| Kerb planters | Clipped azalea hedge | low box, 0.6 m |
| Parks, riversides | Somei-yoshino cherry | wide, spreading, low fork |
| Parks, shrines | Japanese maple | low dome, fine layered leaves |
| Shrines, old quarters | Black pine | trained: bent trunk, flat cloud layers |
| Shrines | Camphor (kusunoki) | very broad, heavy round crown |
| Shrines | Cedar | tall straight column |
| Yanagisuji, Willow Court | Weeping willow | drooping curtains of leaf |
| Gardens, shrine edges | Bamboo clump | many thin canes, leaf tufts at the top |

(Twelve rows: the hedge is the twelfth model.)

### Detail

A shaped trunk and branches with clustered leaf masses, about 600 to 1,200 triangles each, in two sizes per kind. No distance swap.

### Seasons

- Three versions where a tree changes: spring, summer, autumn. Cherry blooms in spring; ginkgo turns yellow and both maples red in autumn; willow and zelkova are pale green in spring; dogwood flowers white and pink in spring and reddens in autumn; azalea flowers in spring.
- Evergreens (pine, camphor, cedar, bamboo) have one version.
- **A season setting in the graphics menu**, default summer. It changes every tree at once. Only one season's trees are drawn at a time.
- The setting is a look only: it does not change the clock or anything else.

### Where they go now

Kita-Ōdōri and Tsumugibashi only. Other stations keep their current trees until their own redesign, when the trees come with the rest of the kit (to be added to `docs/station-kit.md`).

| Place | Kinds |
|---|---|
| Avenues | ginkgo and zelkova, alternating by block |
| Side streets | dogwood, trident maple |
| Kerb planters | azalea hedge |
| Yanagisuji Pocket Park | cherry, maple |
| Tsumugi Inari Shrine | camphor (the sacred tree), cedar, black pine by the hall |
| Willow Court, Yanagi-suji | weeping willow |
| Shrine and park edges | bamboo |

### How

- New `tools/blender/build_trees.py` → `public/models/buildings/trees.glb`, kind `trees` in `PROPS` and `OUTDOOR` in `src/render/building-models.ts`. Model ids `<kind>_<size>_<season>`.
- A small `src/stations/trees.ts`: `tree(b, kind, x, z, size)` places the model for the current season with a trunk collider.
- Season: a field in the graphics settings (`src/render/graphics.ts`, the menu in `src/ui/`); station builds place all three seasons' models tagged by season and the renderer shows one, or the station is rebuilt on change, whichever the existing settings code makes simpler. To be decided when reading that code.
- Replace the tree calls in `src/stations/hub.ts` (`streetTree`, Willow Court's willow), `src/stations/surface.ts` for Tsumugibashi's streets, and `src/stations/places.ts` (park and shrine).

### Checks

- Triangle counts and file size from the Blender run; frame rate before and after with `__sim.perf()`.
- Full test suite (tree colliders on pavements).
- Screenshots: each kind once, and one avenue view per season at both stations.

## Part 2: the tunnel between Kita-Ōdōri and Tsumugibashi

### Why

The first built piece of `docs/between-stations.md`, as the go or no-go sample for old-era tunnels. The stretch is on the Yanagisuji Line (opened 1933), underground.

### What goes in

- **Box tunnel** with a row of columns between the two tracks, in place of the plain tunnel on this stretch only.
- **Bare lamps** at intervals and **cables on wall brackets**.
- **Side walkway** with **green exit signs** showing the distance to each station.
- **Distance posts and speed boards.**
- **Working signals** that follow the trains: red behind a train, then yellow, then green as it moves away, read from the trains' real positions in the timetable. Nothing is lit for a train that is not there.

### Not in this step

The rest of the Yanagisuji Line, the other lines, open-air trackside, portals, bridges, depots and passing trains. They follow `docs/between-stations.md` after the owner approves this sample.

### How

- `src/render/track.ts`: an old-era tunnel profile and the repeating trackside pieces, switched on for the one stretch by its stop indices on line Y.
- Trackside pieces (signal head, column, lamp, bracket, posts, exit sign) in a new `tools/blender/build_track.py`, or as swept boxes where a model adds nothing.
- Signal state from the line's timetable (`trainStateAt` in `src/sim/timetable.ts`), block by block.
- Open question to settle while building: whether this line shows a third rail, a rigid overhead bar or wires in its tunnels; the choice is recorded in `docs/network.md`.

### Checks

- Frame rate on a ride through the stretch before and after.
- Full test suite.
- Ride screenshots: looking forward from the cab end, sideways at the columns and walkway, and a signal in each of its three states.

## Order

1. Trees: models, the season setting, placement at the two stations. Screenshots for a go or no-go.
2. Tunnel sample on the one stretch. Ride screenshots for a go or no-go.
3. Docs: tree rules into `docs/street-design.md` and `docs/station-kit.md`; the tunnel into `docs/between-stations.md`.
