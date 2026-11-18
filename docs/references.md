# References

Honest record of what was looked at. Nothing here was copied into the project.

## Assets and licensing

The project ships **no third-party assets**: no photos, textures, models, fonts or audio. Every texture and sign is drawn in code at runtime (`src/render/materials.ts`, `src/signs/draw.ts`). Text uses whatever Japanese system font the browser has (Yu Gothic / Meiryo on Windows, Hiragino on macOS). All names and brands are invented.

## Visual references actually viewed (2026-11-18)

Viewed as search-result thumbnails on Wikimedia Commons, to check general patterns only. Individual files were not opened, so no per-image credits are recorded.

| Search (Wikimedia Commons media search) | What was taken from it |
|---|---|
| [Osaka Metro platform screen doors](https://commons.wikimedia.org/w/index.php?search=Osaka+Metro+platform+screen+doors&title=Special:MediaSearch&type=image) | Half-height gates: cream/white lower panel, glass upper, line-colour top rail; yellow tactile strip directly behind; grey tile floor; long linear ceiling lights; round tiled columns. |
| [Osaka Metro station ticket gate](https://commons.wikimedia.org/w/index.php?search=Osaka+Metro+station+ticket+gate&title=Special:MediaSearch&type=image) | Rows of low grey gate cabinets with coloured IC pads; display screens hung above the gate line; staffed window to one side; pale tiled concourse floors. |
| [Osaka Metro station name sign platform](https://commons.wikimedia.org/w/index.php?search=Osaka+Metro+station+name+sign+platform&title=Special:MediaSearch&type=image) | Name board layout (large kanji, kana, romaji, number plate, neighbours below); dark departure indicators with a coloured platform-number block, "next / following" rows and amber text. |
| [Category: Umeda Station (Osaka Metro)](https://commons.wikimedia.org/wiki/Category:Umeda_Station_(Osaka_Metro)) | Thumbnails too small to be useful; only confirmed a high-ceilinged hall exists. |

Searches that returned nothing and were **not** used: "Osaka Metro Midosuji Line platform vaulted ceiling", "Osaka Metro station entrance exit stairs street", "Osaka Metro Chuo Line elevated station platform", and the category "Platform screen doors of Osaka Metro" (does not exist).

## From general knowledge, not checked against images

Street entrances and canopies, the vaulted trunk-line hall, the elevated station, tunnel cross-sections, turnback sidings, street furniture and the train interior were built from general familiarity with Japanese railways, not from references reviewed in this session. They are the first things to check against real photos when polishing.
