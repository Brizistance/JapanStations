# References

Honest record of what was looked at. Nothing here was copied into the project.

## Assets and licensing

Signs and manufactured finishes are drawn in code at runtime (`src/render/textures.ts`, `src/signs/draw.ts`). Text uses whatever Japanese system font the browser has (Yu Gothic / Meiryo on Windows, Hiragino on macOS). All names and brands are invented. There are no models, fonts or audio files.

The only third-party files are photo-scanned textures for weathered surfaces, all from [ambientCG](https://ambientcg.com) under **CC0 1.0** (public domain, no attribution required; credited here anyway). 1K JPG, downloaded 2026-11-18, stored in `public/textures/` (about 21 MB).

| File prefix | ambientCG asset | Maps kept | Used for |
|---|---|---|---|
| `concrete` | [Concrete034](https://ambientcg.com/view?id=Concrete034) | colour, normal, roughness | Track bed slabs, platform structure, viaduct, piers |
| `concrete_dark` | [Concrete031](https://ambientcg.com/view?id=Concrete031) | colour, normal, roughness | Tunnel lining, walls below platform level, end walls |
| `asphalt` | [Asphalt010](https://ambientcg.com/view?id=Asphalt010) | colour, normal, roughness | Roads |
| `brick` | [Bricks059](https://ambientcg.com/view?id=Bricks059) | colour, normal, roughness | Brick station walls, warehouses, campus (re-tinted per colour) |
| `wood` | [Wood049](https://ambientcg.com/view?id=Wood049) | colour, normal, roughness | Old-town shopfronts, park benches (re-tinted) |
| `gravel` | [Gravel022](https://ambientcg.com/view?id=Gravel022) | colour, normal | Track ballast (sleepers are drawn over it in code) |
| `grass` | [Grass004](https://ambientcg.com/view?id=Grass004) | colour | Parks and lawns |

To add another: pick a CC0 set, keep only the maps that are needed, add a row here, and load it with `scan()` in `src/render/materials.ts`.

## Visual references actually viewed (2026-11-18)

Viewed as search-result thumbnails on Wikimedia Commons, to check general patterns only. Individual files were not opened, so no per-image credits are recorded.

| Search (Wikimedia Commons media search) | What was taken from it |
|---|---|
| [Osaka Metro platform screen doors](https://commons.wikimedia.org/w/index.php?search=Osaka+Metro+platform+screen+doors&title=Special:MediaSearch&type=image) | Half-height gates: cream/white lower panel, glass upper, line-colour top rail; yellow tactile strip directly behind; grey tile floor; long linear ceiling lights; round tiled columns. |
| [Osaka Metro station ticket gate](https://commons.wikimedia.org/w/index.php?search=Osaka+Metro+station+ticket+gate&title=Special:MediaSearch&type=image) | Rows of low grey gate cabinets with coloured IC pads; display screens hung above the gate line; staffed window to one side; pale tiled concourse floors. |
| [Osaka Metro station name sign platform](https://commons.wikimedia.org/w/index.php?search=Osaka+Metro+station+name+sign+platform&title=Special:MediaSearch&type=image) | Name board layout (large kanji, kana, romaji, number plate, neighbours below); dark departure indicators with a coloured platform-number block, "next / following" rows and amber text. |
| [Category: Umeda Station (Osaka Metro)](https://commons.wikimedia.org/wiki/Category:Umeda_Station_(Osaka_Metro)) | Thumbnails too small to be useful; only confirmed a high-ceilinged hall exists. |

Searches that returned nothing and were **not** used: "Osaka Metro Midosuji Line platform vaulted ceiling", "Osaka Metro station entrance exit stairs street", "Osaka Metro Chuo Line elevated station platform", and the category "Platform screen doors of Osaka Metro" (does not exist).

## Reference photos supplied for the visual pass (2026-11-18)

Four photos of real Tokyo stations were supplied with the request for the visual-realism pass (one surface platform, three underground platforms). They were looked at for general patterns only and are **not stored in the repo**. Nothing in them (names, signs, logos, layouts) was reproduced.

| What was taken from them |
|---|
| Floors: 300–400 mm stone-look tiles with thin dark joints, semi-gloss, ceiling lights mirrored in them. |
| Tactile paving: yellow dome tiles along the platform edge, with a dark edge coping beyond. |
| Walls: small glazed tile, or large enamel / metal panels with fine joints. Dark skirting. |
| Columns: round, clad, with a metal base ring. |
| Ceilings: pale panels with recessed strip lights over the platform; darker, exposed soffit over the tracks. |
| Screen doors: white lower panels, glass above, coloured top rail, housings between doors. |
| Light: even and bright, soft contact shadows under furniture, hanging signs that glow. |

## From general knowledge, not checked against images

Street entrances and canopies, the vaulted trunk-line hall, the elevated station, tunnel cross-sections, turnback sidings, street furniture and the train (the Blender model: exterior, cab front, bogies and interior) were built from general familiarity with Japanese railways, not from references reviewed in this session. They are the first things to check against real photos when polishing.

## Own assets

| Asset | Source |
|---|---|
| `public/models/metro-car.glb`, `assets/trains/metro-car.blend` | Original work, generated by `tools/blender/build_metro_car.py`. A generic modern aluminium metro car; not a copy of any real series. No textures. |
