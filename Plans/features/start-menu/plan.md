# Start menu makeover: title, region map, settings, city menu

Status: **built 2026-11-22**, waiting for the owner's look. Sketched 2026-11-22 from the owner's answers. Replaces the 19 Nov draft "Seikai region: title screen and region map".

## Context

The game is framed today as "Kawaminato Metro" only, and opens straight on one menu. Long term it is a **region simulator**: other cities, the AR and private railways join later. This pass builds the screens above the game and gives them one look. No new cities, lines or 3D are built.

## Flow

`title` → `region` → `menu` (Kawaminato) → `play`

The title shows on every launch. Settings opens over any of the four.

## Shared look: station signage

All screens look like the game's own signs: dark sign-panel bands, line-colour bullets, bold Japanese first with small English under, yellow exit-style accents. The existing slow station pan runs live behind every menu screen.

## Screens

### 1. Title

西海シミュレーター / Seikai Simulator, a region mark, a Start button and a Settings button, over the 3D pan.

### 2. Region map

- A schematic of Seikai over a simple drawn coast, bay and river.
- AR Main Line solid (it has a timetable). Private lines dashed with a "planned" tag.
- All four cities are selectable. A side panel shows kanji, kana, romaji, one line of character, and the operator.
- Only Kawaminato has an Enter button. The other three show 準備中 / Coming soon.

### 3. Zoom into the city

Picking Kawaminato scales the region map into its dot and cross-fades into the metro route map in the same place, so the two maps read as one. Back zooms out again.

### 4. City menu (restyled, two tabs)

- **Map** (default, where the zoom lands): route map and teleport.
- **Time and weather**: clock, time of day, weather.
- Start, Settings and Back to region stay visible on both tabs.

### 5. Settings (設定)

One screen, opened from a button on the title, region map and city menu, and in-game on a key. It replaces today's small in-game graphics overlay.

| Section | Contents |
|---|---|
| Graphics | Existing presets and per-effect switches, season (moved in) |
| Sound | **New:** master volume, mute. Existing: announcements, sound effects |
| Controls | Key list. **New:** mouse sensitivity, invert-Y, field of view |
| Language | Menus and HUD Japanese first (today) or English first. In-world signs do not change |
| Reset | One button: every setting back to default, saved values cleared |

Every setting saves between sessions, as graphics and volumes do now.

## Worldbuilding (drafts, web-checked before they go in the docs)

Geography rule (owner, 2026-11-19): Kansai-inspired in feel only. The map must **not** mirror Kansai's layout, and the cities are not one-to-one copies. The "feel" column is loose flavour, not position.

| City | Feel | Where | Status |
|---|---|---|---|
| 川湊 Kawaminato | the big port city | Mio-gawa mouth, on the bay | playable |
| 霧ヶ原 Kirigahara | cool, misty highland city: tea, temples, a university | far up the Mio-gawa valley, on a plateau to the north-east | coming soon |
| 朝凪 Asanagi | ferry and shipyard town | down the coast to the south-west, on a calm inlet behind islands | coming soon |
| 遠宮 Tōnomiya | old shrine capital | across the bay on the opposite peninsula | coming soon, new name |

| Railway | Route | On map |
|---|---|---|
| AR Main Line | Kirigahara – Kawaminato – Asanagi | solid |
| 西海電鉄 Seikai Electric Railway (Seiden) | Kawaminato – Kirigahara, by a different valley from the AR | dashed |
| 湊凪電鉄 Sōnagi Electric Railway | Kawaminato – Asanagi, along the coast | dashed |
| 遠宮急行 Tōnomiya Express (Enkyū) | Kawaminato – Tōnomiya, round the head of the bay | dashed |

Name note: 西海 read **Saikai** is a real city and national park in Nagasaki. The reading **Seikai** as a region is invented. If the web check finds a clash, the fallback is 湊津 Minatsu.

## Files

New:

- `src/data/region.ts`: `REGION`, `CITIES` (names, map x/y, character line, `playable`), `REGION_LINES` (operator, colour, `running` or `planned`, city ids). The AR entry reads its name and colour from `RAIL_LINES` in `network.ts`. `network.ts` is not touched.
- `src/ui/TitleScreen.tsx`, `src/ui/RegionMap.tsx`.
- `src/ui/Settings.tsx`: absorbs `GraphicsSettings.tsx`.

Changed:

- `src/ui/store.ts`: `mode` becomes `'title' | 'region' | 'menu' | 'play'`, starting at `'title'`; `toRegion()`, `toCity()`; settings-open flag; master volume, mute, sensitivity, invert-Y, field of view, language order, reset.
- `src/App.tsx`: switch on the four modes.
- `src/ui/MainMenu.tsx`: rebuilt as two tabs in the signage look.
- `src/ui/MetroMap.tsx`: only what the zoom needs to line the two maps up.
- `src/ui/Hud.tsx`: language order; the settings key.
- `src/audio/engine.ts`: master and mute.
- `src/player/`: sensitivity, invert-Y, field of view.
- `src/styles.css`: signage styles for all screens.
- Docs, one line each: `docs/worldbuilding.md` (region, Tōnomiya, three private operators), `docs/vision.md` (region framing), first line of `CLAUDE.md`.

## Build order

Each step leaves the game playable.

1. Signage styles and the title screen.
2. Region data and the region map.
3. Settings screen.
4. Tabbed city menu.
5. Zoom between region map and route map.

## Checks

- Web check of the name Seikai before it goes in the docs.
- `npm run typecheck` after each step. `npx vitest run` on any test near `store.ts` or the audio engine if one exists; `src/sim/` and `src/data/network.ts` are untouched, so no full suite.
- Browser: one screenshot each of title, region map, city menu and Settings, the zoom working, and a check in play that the sliders take effect.

## Not in this pass

- The other three cities, the private railways in 3D or in the timetable.
- A menu theme per city (only Kawaminato's exists).
- Rebinding keys.
