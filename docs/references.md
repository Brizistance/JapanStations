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
| `public/models/buildings/zakkyo.glb`, `assets/buildings/zakkyo.blend` | Original work, generated by `tools/blender/build_zakkyo.py` (shared helpers in `buildkit.py`). Seven zakkyo variants (one a corner building), each with a detailed and a simplified mesh. All building glbs share one layout (vertex colours, window and sign materials, sign metadata) described at the top of `tools/blender/buildkit.py`. Not in the game yet. Proportions and details (stacked projecting signs, tenant boards, rooftop tank and units) checked against Wikimedia Commons photos, nothing copied: [Building雑居ビル9274351.jpg](https://commons.wikimedia.org/wiki/File:Building雑居ビル9274351.jpg) (溜池ゴロー, CC BY-SA 3.0), [Osaka Neon - OsakaNeon6674.jpg](https://commons.wikimedia.org/wiki/File:Osaka_Neon_-_OsakaNeon6674.jpg) (lumoplank, CC0). |
| `public/models/buildings/office.glb`, `shophouse.glb`, `manshon.glb` (and `.blend` in `assets/buildings/`) | Original work, generated by `tools/blender/build_office.py`, `build_shophouse.py` (seven shop-houses, one arcade bay, one arcade gate) and `build_manshon.py`. Not in the game yet. Checked against Wikimedia Commons photos, nothing copied: [Sakaisuji-Hommachi Center Building.jpg](https://commons.wikimedia.org/wiki/File:Sakaisuji-Hommachi_Center_Building.jpg) (Tokumeigakarinoaoshima, CC BY-SA 4.0) for ribbon-window offices with a ground-floor shop; [Tenjinbashisuji shopping street - panoramio (24).jpg](https://commons.wikimedia.org/wiki/File:Tenjinbashisuji_shopping_street_-_panoramio_(24).jpg) (DVMG, CC BY 3.0) for the arcade roof, hanging banners and pendant lights; [Anabuki Surpass Joto at Osaka.jpg](https://commons.wikimedia.org/wiki/File:Anabuki_Surpass_Joto_at_Osaka.jpg) (Mr.ちゅらさん, CC0) for apartment balconies and rooftop. |
| `public/models/buildings/tower.glb`, `assets/buildings/tower.blend` | Original work, generated by `tools/blender/build_tower.py`. Five glass towers (roughly 150 to 200 m) on podiums. Not in the game yet. Checked against [Nakanoshima Festival Tower and West in 201705 001.jpg](https://commons.wikimedia.org/wiki/File:Nakanoshima_Festival_Tower_and_West_in_201705_001.jpg) (Mc681, CC BY-SA 4.0) for podium, dense vertical fins and proportions; nothing copied. |
| `public/models/buildings/exchange.glb`, `assets/buildings/exchange.blend` | Original work, generated by `tools/blender/build_exchange.py`. The Silk Exchange's outside and the stone bridge Tsumugi-bashi. Built from general familiarity with 1920s Japanese bank and exchange buildings and stone canal bridges, not from references reviewed in this session. |
| Blue direction boards (`drawRoadBoard` in `src/signs/draw.ts`) | Layout follows Japan's sign 108の2-A (方面及び方向), checked against [Japanese Road sign 108-2-A.svg](https://commons.wikimedia.org/wiki/File:Japanese_Road_sign_108-2-A.svg) and [Japanese Road sign 108-A.svg](https://commons.wikimedia.org/wiki/File:Japanese_Road_sign_108-A.svg) (Monaneko, public domain; source: 道路標識、区画線及び道路標示に関する命令 別表第2). Redrawn in canvas with our own place names from the network; no artwork copied. |
| `public/models/buildings/road.glb`, `assets/buildings/road.blend` | Original work, generated by `tools/blender/build_road.py`. Signal masts, sign poles, a direction-board gantry, bus stop and shelter, kerb mirror, bollard, guard rail, utility pole, and generic vehicles (sedan, kei car, van, taxi, bus; no real makes). Built from general familiarity with Japanese streets, not from references reviewed in this session. |
| `public/models/buildings/tsumugi.glb`, `assets/buildings/tsumugi.blend` | Original work, generated by `tools/blender/build_tsumugi.py`. Tsumugibashi's rotunda shell and dome, the Great Loom, three shopfronts, a stall and furniture. Built from general familiarity with domed exchange halls, not from references reviewed in this session. |
