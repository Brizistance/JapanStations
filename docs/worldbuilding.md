# Worldbuilding

## The city

- **Name:** **Kawaminato (川湊, かわみなと)** — "river harbour". Chosen from the candidate list; the others (Asahiura, Shiokaze, Yodomachi) are free for future use as wards or lines.
- **Feel:** an Osaka-like second city. It has a commercial "Kita" (north) hub and a nightlife and shopping "Minami" (south) hub, joined by a main north–south boulevard, Yanagi-suji (柳筋, "willow street"), and its trunk line. A river and canals, a bay to the west, residential hills to the north and east.
- **Character:** proud, a bit louder and scrappier than the capital, with merchant-city roots and good street food.

## Operators

| Operator | Type | Status |
|---|---|---|
| **Kawaminato Metro (川湊メトロ)** | Underground metro, 3 lines so far | Built |
| _TBD_ JR-style main line | Through platforms on the viaduct at Kawaminato Station | Space reserved, not named |
| _TBD_ private railway | Dead-end terminal in the Kawaminato Station Building | Space reserved, not named |
| _TBD_ high-speed line | Top deck at Kawaminato Station | Space reserved, not named |

The three future operators are deliberately unnamed. Their space at the hub is signed only **将来線予定地 / Reserved for future line** plus the kind of railway. Name them when one is actually built.

Brand: navy `#0d3b66` roundel with three flowing white strokes (a stylised 川). Drawn in code (`logo()` in `src/signs/draw.ts`, `Logo` in `src/ui/MainMenu.tsx`). IC card: **MINACA (ミナカ)**.

## Lines

| Code | Name | Japanese | Colour | Role |
|---|---|---|---|---|
| **Y** | Yanagisuji Line | 柳筋線 (やなぎすじせん) | green `#1f9d55` | North–south trunk under Yanagi-suji. Osaka-style street name. |
| **N** | Nagisa Line | 渚線 (なぎさせん) | blue `#1673c9` | East–west, from the bay to the eastern hills. Nagisa = "water's edge". |
| **A** | Akanesuji Line | 茜筋線 (あかねすじせん) | madder red `#b7282e` | The newest, deepest line: a diagonal from the south bay to the north-east hills, under Akane-suji and then Kita-Ōdōri avenue. Akane = madder dye, in keeping with Tsumugibashi (silk) and Aizomechō (indigo). |

## Stations

| No. | Kanji | Kana | Romaji | District | Character |
|---|---|---|---|---|---|
| Y-11 | 緑坂 | みどりざか | Midorizaka | North hills | Quiet residential terminus, park |
| Y-12 / A-14 | 北大通 | きたおおどおり | Kita-Ōdōri | Kita | **The central station.** Metro hub under Kawaminato Station |
| Y-13 / N-13 | 紬橋 | つむぎばし | Tsumugibashi | Central | Interchange. Tsumugi = pongee silk: merchant-city roots |
| Y-14 | 瓢箪堀 | ひょうたんぼり | Hyōtanbori | Minami | Nightlife, "gourd canal" |
| Y-15 | 鶴松 | つるまつ | Tsurumatsu | Old town | Shōtengai arcade terminus |
| N-11 | 川湊港 | かわみなとこう | Kawaminato-kō | Bay area | Port, ferry terminal |
| N-12 / A-13 | 藍染町 | あいぞめちょう | Aizomechō | Merchant quarter | Interchange. Old indigo dyers' quarter |
| N-14 | 川湊大学前 | かわみなとだいがくまえ | Kawaminato-daigaku-mae | University | Brick, campus gate |
| N-15 | 雲雀野 | ひばりの | Hibarino | East hills | Elevated suburban terminus. Hibari = skylark |
| A-11 | 鴎浜 | かもめはま | Kamomehama | South bay | Stadium terminus beside Kawaminato Dome. Kamome = gull |
| A-12 | 綿屋町 | わたやまち | Watayamachi | Merchant quarter (south) | Cotton wholesalers' street |
| A-15 | 鈴懸通 | すずかけどおり | Suzukakedōri | Kita (east) | Plane-tree avenue, civic and theatre district |
| A-16 | 月見坂 | つきみざか | Tsukimizaka | North-east slope | "Moon-viewing slope", quiet hillside |
| A-17 | 山吹台 | やまぶきだい | Yamabukidai | North-east hills | New-town terminus. Yamabuki = kerria |

Numbers start at 11 on each line (an Osaka habit), which leaves 01–10 free for extensions beyond the current first stop.

## Naming rules

- **Every station** has a kanji name, a kana reading (hiragana), and romaji (Hepburn, with macrons like Ō and ū in display text; a plain ASCII slug is fine for IDs).
- **Station names follow real Japanese patterns.** Examples:
  - a district plus a direction or feature: 〜本町 (honmachi), 〜橋 (bashi), 〜前 (mae, "in front of"), 〜口 (guchi), 〜筋 (suji), 〜丁目 (chōme)
  - landmarks: 〜城 (castle), 〜公園 (park), 〜港 (port), 〜大学前 (university)
  - nature: 〜川, 〜森, 〜坂, 〜谷
- **Don't use real station names.** Plausible and invented is the goal. A name that happens to match a tiny real place is fine, but a famous station is not. Names rejected so far for being too close to real ones: Tenjin, Kitahama, Ōgimachi, Hommachi, Minato-Motomachi, Asashiobashi, Hoshikawa, Shiomi. The Akanesuji names were web-searched on 2026-11-18 with no real station or line found; the nearest is Suzukakedōri, which shares its tree with the real Suzukakedai (すずかけ台). Spare if it ever needs replacing: Enjudōri (槐通).
- **Lines** have a kanji name (often 〜線), an English name, a letter code, and a color. The Osaka style names lines after streets (〜筋線), while the Tokyo style names them after places.
- **Station numbers** use the line letter plus a two-digit number: `Y-13`. Numbers increase from the "down" origin.

## The hub: one complex, two names

Osaka/Umeda style. The **metro** station is **Kita-Ōdōri (北大通)**: that is the name on platforms, exits and the map. The **railway building** above it is **Kawaminato Station (川湊駅)**: that is the name on the facade and on signs pointing up from the concourse. Nothing in the network data is called Kawaminato Station yet, because no railway serves it.

| Thing | Name |
|---|---|
| Meeting spot | **Kin no Yanagi (金の柳)**: a gilded willow with a working clock, on the atrium floor. Named for Yanagi-suji. |
| Underground shopping street | **Yanagi Mall (ヤナギモール)**, east and west wings under Kita-Ōdōri avenue |
| Forecourt | Kawaminato Station Plaza (川湊駅前広場) |
| East block | Kawaminato Station Building (川湊ステーションビル) |
| West block | Kawaminato Station Hotel (川湊ステーションホテル) |
| Stadium at Kamomehama | Kawaminato Dome (川湊ドーム) |

## Fictional brands (signage)

Shops and posters use invented names only, defined in `src/stations/surface.ts` (`SHOPS`) and `src/signs/draw.ts` (`POSTERS`): Maruhoshi Mart (convenience store / kiosk), Café Tsumugi, Ramen Kawaichi, Hibari Pharmacy, Ryūbundō Books, Kawaminato Shinkin Bank, Kawaminato Aquarium, Kawaminato University, Wagashi Tsumugi-an, Akane Coffee, Bento Minatoya, and so on. Add to those lists rather than writing names inline.

## Districts

- **Kita** (north hub): business, department stores, the main railway station — Kita-Ōdōri, Suzukakedōri
- **Central**: offices, the crossing of the two main streets — Tsumugibashi
- **Minami** (south hub): nightlife, arcades, canals — Hyōtanbori, Tsurumatsu
- **Bay**: warehouses being redeveloped, ferry pier, aquarium — Kawaminato-kō, Aizomechō on the way in
- **South bay**: reclaimed land, the dome — Kamomehama
- **Merchant quarter**: dyers and cotton wholesalers along Akane-suji — Aizomechō, Watayamachi
- **East hills**: university and suburbs — Kawaminato-daigaku-mae, Hibarino
- **North hills**: residential — Midorizaka
- **North-east hills**: hillside housing and a new town — Tsukimizaka, Yamabukidai
