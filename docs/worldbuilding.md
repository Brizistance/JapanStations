# Worldbuilding

## The city

- **Name:** **Kawaminato (川湊, かわみなと)** — "river harbour". Chosen from the candidate list; the others (Asahiura, Shiokaze, Yodomachi) are free for future use as wards or lines.
- **Feel:** an Osaka-like second city. It has a commercial "Kita" (north) hub and a nightlife and shopping "Minami" (south) hub, joined by a main north–south boulevard, Yanagi-suji (柳筋, "willow street"), and its trunk line. A river and canals, a bay to the west, residential hills to the north and east.
- **Character:** proud, a bit louder and scrappier than the capital, with merchant-city roots and good street food.

## Operators

| Operator | Type | Status |
|---|---|---|
| **Kawaminato Metro (川湊メトロ)** | Underground metro, 2 lines so far | Built |
| _TBD_ JR-style railway | Elevated or commuter loop | Later |
| _TBD_ private railway(s) | Suburban radial lines | Maybe |

Brand: navy `#0d3b66` roundel with three flowing white strokes (a stylised 川). Drawn in code (`logo()` in `src/signs/draw.ts`, `Logo` in `src/ui/MainMenu.tsx`). IC card: **MINACA (ミナカ)**.

## Lines

| Code | Name | Japanese | Colour | Role |
|---|---|---|---|---|
| **Y** | Yanagisuji Line | 柳筋線 (やなぎすじせん) | green `#1f9d55` | North–south trunk under Yanagi-suji. Osaka-style street name. |
| **N** | Nagisa Line | 渚線 (なぎさせん) | blue `#1673c9` | East–west, from the bay to the eastern hills. Nagisa = "water's edge". |

## Stations

| No. | Kanji | Kana | Romaji | District | Character |
|---|---|---|---|---|---|
| Y-11 | 緑坂 | みどりざか | Midorizaka | North hills | Quiet residential terminus, park |
| Y-12 | 北大通 | きたおおどおり | Kita-Ōdōri | Kita | Business hub, vaulted hall |
| Y-13 / N-13 | 紬橋 | つむぎばし | Tsumugibashi | Central | Interchange. Tsumugi = pongee silk: merchant-city roots |
| Y-14 | 瓢箪堀 | ひょうたんぼり | Hyōtanbori | Minami | Nightlife, "gourd canal" |
| Y-15 | 鶴松 | つるまつ | Tsurumatsu | Old town | Shōtengai arcade terminus |
| N-11 | 川湊港 | かわみなとこう | Kawaminato-kō | Bay area | Port, ferry terminal |
| N-12 | 藍染町 | あいぞめちょう | Aizomechō | Merchant quarter | Old indigo dyers' quarter |
| N-14 | 川湊大学前 | かわみなとだいがくまえ | Kawaminato-daigaku-mae | University | Brick, campus gate |
| N-15 | 雲雀野 | ひばりの | Hibarino | East hills | Elevated suburban terminus. Hibari = skylark |

Numbers start at 11 on each line (an Osaka habit), which leaves 01–10 free for extensions beyond the current first stop.

## Naming rules

- **Every station** has a kanji name, a kana reading (hiragana), and romaji (Hepburn, with macrons like Ō and ū in display text; a plain ASCII slug is fine for IDs).
- **Station names follow real Japanese patterns.** Examples:
  - a district plus a direction or feature: 〜本町 (honmachi), 〜橋 (bashi), 〜前 (mae, "in front of"), 〜口 (guchi), 〜筋 (suji), 〜丁目 (chōme)
  - landmarks: 〜城 (castle), 〜公園 (park), 〜港 (port), 〜大学前 (university)
  - nature: 〜川, 〜森, 〜坂, 〜谷
- **Don't use real station names.** Plausible and invented is the goal. A name that happens to match a tiny real place is fine, but a famous station is not. Names rejected so far for being too close to real ones: Tenjin, Kitahama, Ōgimachi, Hommachi, Minato-Motomachi, Asashiobashi, Hoshikawa, Shiomi.
- **Lines** have a kanji name (often 〜線), an English name, a letter code, and a color. The Osaka style names lines after streets (〜筋線), while the Tokyo style names them after places.
- **Station numbers** use the line letter plus a two-digit number: `Y-13`. Numbers increase from the "down" origin.

## Fictional brands (signage)

Shops and posters use invented names only, defined in `src/stations/surface.ts` (`SHOPS`) and `src/signs/draw.ts` (`POSTERS`): Maruhoshi Mart (convenience store / kiosk), Café Tsumugi, Ramen Kawaichi, Hibari Pharmacy, Ryūbundō Books, Kawaminato Shinkin Bank, Kawaminato Aquarium, Kawaminato University, and so on. Add to those lists rather than writing names inline.

## Districts

- **Kita** (north hub): business, department stores — Kita-Ōdōri
- **Central**: offices, the crossing of the two main streets — Tsumugibashi
- **Minami** (south hub): nightlife, arcades, canals — Hyōtanbori, Tsurumatsu
- **Bay**: warehouses being redeveloped, ferry pier, aquarium — Kawaminato-kō, Aizomechō on the way in
- **East hills**: university and suburbs — Kawaminato-daigaku-mae, Hibarino
- **North hills**: residential — Midorizaka
