# Worldbuilding

## The city

- **Name:** **Kawaminato (川湊, かわみなと)** — "river harbour". Chosen from the candidate list; the others (Asahiura, Shiokaze, Yodomachi) are free for future use as wards or lines.
- **Feel:** an Osaka-like second city. It has a commercial "Kita" (north) hub and a nightlife and shopping "Minami" (south) hub, joined by a main north–south boulevard, Yanagi-suji (柳筋, "willow street"), and its trunk line. A river and canals, a bay to the west, residential hills to the north and east.
- **The river:** **Mio-gawa (澪川, みおがわ)**. A *mio* is the navigable channel through shallow water, which suits a city called "river harbour". It flows west between Kita and Central (about z = −450), passing over the Yanagisuji and Akanesuji lines, and meets the bay at Yūnagihama. The Shiokaze Line follows its north bank. On the route map it is the pale band; in 3D it shows only as the river mouth at Yūnagihama. Web-searched 2026-11-18: no real river or station found.
- **Character:** proud, a bit louder and scrappier than the capital, with merchant-city roots and good street food.

## Operators

| Operator | Type | Status |
|---|---|---|
| **Kawaminato Metro (川湊メトロ)** | Underground metro, 6 lines | Built |
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
| **A** | Akanesuji Line | 茜筋線 (あかねすじせん) | madder red `#b7282e` | The deepest line, and the first with full-height platform doors: a diagonal from the south bay to the north-east hills, under Akane-suji and then Kita-Ōdōri avenue. Akane = madder dye, in keeping with Tsumugibashi (silk) and Aizomechō (indigo). |
| **S** | Shiokaze Line | 汐風線 (しおかぜせん) | sunset orange `#ee7b1a` | The fourth line: from the river mouth along the Mio-gawa's north bank, through the box at Kita-Ōdōri that was built for it, then south-east to the canals. Shiokaze = "sea breeze"; a place-style name, the first line not named after a street. |
| **M** | Sumire Line | すみれ線 (すみれせん) | violet `#c2368f` | The sixth line, and the first to through-run: from the north-east hills via Midorizaka and the hub, then on the Shiokaze Line's track as an express (passing Tōmyōbori and Sakurazutsumi) to Hanamizuki, and on to the southern heights. Sumire = violet; its mural is at Seiran. Name from the user's draft map. |
| **K** | Kikyō Line | 桔梗線 (ききょうせん) | bellflower purple `#7b4fa8` | The fifth line: a crosstown line through the south that meets every other line once, from the bay front at Shinshio to the eastern hills. Kikyō = Chinese bellflower, one of the seven autumn flowers; its mural is at Higashigaoka. Name and colour from the user's draft map. |

### When each line opened

The opening year decides a line's architecture (see "Line themes" in [station-design.md](station-design.md)). Invented, 2026-11-18.

| Line | Opened | The city at the time |
|---|---|---|
| Yanagisuji | 1933 | The first subway, built under the widened Yanagi-suji as a show of civic pride |
| Nagisa | 1961 | High-growth years: built fast and plain to reach the port and the eastern suburbs |
| Akanesuji | 1994 | Planned in the bubble years, so deep and richly finished |
| Shiokaze | 2004 | Waterfront redevelopment along the Mio-gawa and the bay |
| Kikyō | 2015 | The crosstown link the south had waited decades for |
| Sumire | 2023 | The newest line, sharing the Shiokaze Line's track |

## Shops and brands

Invented brands that appear on shop fronts in concourses (`SHOPS` in `src/stations/looks/parts.ts`). None is a real chain. Added 2026-11-18 with the station looks.

| Brand | Japanese | Kind |
|---|---|---|
| Maruhoshi Kiosk / Maruhoshi Mart | マルホシ キオスク / マルホシマート | Station kiosk, convenience store |
| Port Mart | ポートマート | Convenience store |
| Tsubameya Store | ツバメ屋ストア | Convenience store |
| Soba Kita | そば処 きた | Standing soba |
| Tachisoba Mio | 立ちそば 澪 | Standing soba |
| Udon Kawanami | うどん 川波 | Udon counter |
| Bakery Komugi | ベーカリー こむぎ | Bakery |
| Hinata Bakery | ひなたベーカリー | Bakery |
| Yanagi Flowers | フラワー やなぎ | Flower stall |
| Hana no Minato | 花の湊 | Flower stall |
| Akane Coffee | 茜珈琲 | Café |
| Nagi Café | なぎカフェ | Café |
| Kajitsudō Juice Stand | ジューススタンド 果実堂 | Juice stand |
| Taiyaki Namima | たい焼き なみま | Taiyaki counter |
| Wagashi Tsumugi-an | 和菓子 つむぎ庵 | Japanese sweets |
| Bento Minatoya | お弁当 みなと屋 | Bento counter |
| Hibari Pharmacy | ひばり薬局 | Pharmacy |
| Ryūbundō Books | 柳文堂書店 | Bookshop |
| Sorano Zakka | そらの雑貨店 | Gift shop |
| Photo Minato | フォトミナト | Photo booth |
| Kawaminato Shinkin Bank | 川湊信用金庫 | ATM corner |
| Kawaminato-dō Gifts | おみやげ 川湊堂 | Souvenirs |

The Japanese spellings in the code are the source of truth.

### Names at the hero stations

Invented with each station's look (`src/stations/looks/<station>.ts`), 2026-11-18.

| Station | Names |
|---|---|
| Hyōtanbori | Bars and eateries of the alley: 焼鳥 ひさご (Yakitori Hisago), スナック 月見草 (Snack Tsukimisō), 串カツ 金瓢 (Kushikatsu Kinpyō), おでん 小雪 (Oden Koyuki), 立呑み 堀端 (Tachinomi Horibata), バー 灯籠 (Bar Tōrō), もつ焼 ろく (Motsuyaki Roku), ラーメン 夜鳴軒 (Ramen Yonaki-ken), スナック ゆらり (Snack Yurari), 酒場 瓢六 (Sakaba Hyōroku), バー 澪標 (Bar Miotsukushi), てんぷら 小舟 (Tempura Kobune), ホルモン 堀の家 (Horumon Hori-no-ya), 小料理 ふじ乃 (Koryōri Fujino); plus 居酒屋 ひょうたん and たこ焼き 丸八 from the street above |
| Tsurumatsu | Stalls of 鶴松商店街: 青果 八百辰 (Yaotatsu), 鮮魚 魚吉 (Uokichi), コロッケ 丸鶴 (Marutsuru), 茶舗 松葉園 (Matsubaen), とうふ 白菊屋 (Shiragikuya), 駄菓子 まめや (Mameya), 靴・合鍵 つるや (Tsuruya), and the shuttered 洋品 つばき and 時計・眼鏡 ほしの. Old enamel adverts: 湊印醤油, 清酒 千鶴松, みなと石鹸, ヒバリ目薬 |
| Kurayashiki | 蔵カフェ 白壁 (Kura Café Shirakabe), 酒・醤油 かわくら屋 (Kawakuraya), 工芸 しろつち (Kōgei Shirotsuchi); sake labels 川湊 and 湊誉 (Minato-homare) |
| Kamomehama | The home team at Kawaminato Dome: **川湊ガルズ (Kawaminato Gulls)**, baseball, gull orange `#f47a20` and navy `#14284b`. ガルズ オフィシャルショップ (Gulls Official Shop), スタジアムめし かもめ亭 (Kamome-tei) |
| Hoshimine | 星の窓 (Hoshi no Mado, observatory shop), 三日月珈琲 (Mikazuki Coffee). The ceiling's constellations (Fox, Lantern, Kite, Crane) are invented and unlabelled |
| Tōmyōbori | 提灯 ひより屋 (Chōchin Hiyoriya, lantern maker), 茶房 ともしび (Sabō Tomoshibi), 立呑 かわべり (Tachinomi Kawaberi); the festival **灯明堀 万灯まつり (Tōmyōbori Mantō Matsuri)** |
| Aizomechō | 藍染処 つゆ草 (Aizome Tsuyukusa, dye works), 手ぬぐい 波千鳥 (Tenugui Namichidori), 呉服 糸よし (Gofuku Itoyoshi), 日本茶 しずく園 (Shizuku-en); the dyers' crest 三つ波丸 (Mitsunami-maru, three waves in a ring) |
| Daigaku-mae | 喫茶 れんが (Kissa Renga), 古書 文蔵 (Fumikura Old Books), めし処 はるにれ (Harunire), the university co-op 大学生協; clubs on the noticeboards: rowing, astronomy, light music, photography, rakugo, mountaineering, tea ceremony |

## Stations

| No. | Kanji | Kana | Romaji | District | Character |
|---|---|---|---|---|---|
| Y-11 | 緑坂 | みどりざか | Midorizaka | North hills | Quiet residential station, park (the old north terminus) |
| Y-12 / A-14 / S-13 | 北大通 | きたおおどおり | Kita-Ōdōri | Kita | **The central station.** Metro hub under Kawaminato Station |
| Y-13 / N-13 | 紬橋 | つむぎばし | Tsumugibashi | Central | Interchange. Tsumugi = pongee silk: merchant-city roots |
| Y-14 | 瓢箪堀 | ひょうたんぼり | Hyōtanbori | Minami | Nightlife, "gourd canal" |
| Y-15 | 鶴松 | つるまつ | Tsurumatsu | Old town | Shōtengai arcade station (the old south terminus) |
| N-11 | 川湊港 | かわみなとこう | Kawaminato-kō | Bay area | Port, ferry terminal |
| N-12 / A-13 | 藍染町 | あいぞめちょう | Aizomechō | Merchant quarter | Interchange. Old indigo dyers' quarter |
| N-14 / S-14 | 川湊大学前 | かわみなとだいがくまえ | Kawaminato-daigaku-mae | University | Brick, campus gate. Interchange |
| N-15 | 雲雀野 | ひばりの | Hibarino | East hills | Elevated; where the line comes out onto the viaduct. Hibari = skylark |
| A-11 | 鴎浜 | かもめはま | Kamomehama | South bay | Stadium station beside Kawaminato Dome. Kamome = gull |
| A-12 | 綿屋町 | わたやまち | Watayamachi | Merchant quarter (south) | Cotton wholesalers' street |
| A-15 | 鈴懸通 | すずかけどおり | Suzukakedōri | Kita (east) | Plane-tree avenue, civic and theatre district |
| A-16 | 月見坂 | つきみざか | Tsukimizaka | North-east slope | "Moon-viewing slope", quiet hillside |
| A-17 | 山吹台 | やまぶきだい | Yamabukidai | North-east hills | New town, bus rotary. Yamabuki = kerria |
| S-11 | 夕凪浜 | ゆうなぎはま | Yūnagihama | North-west waterfront | At the river mouth; sunset promenade. Yūnagi = the evening calm |
| S-12 | 蔵屋敷 | くらやしき | Kurayashiki | Riverside | Old rice-storehouse quarter; white kura turned into cafés. Named for the Edo-period domain warehouses |
| S-15 | 灯明堀 | とうみょうぼり | Tōmyōbori | South-east canals | Lantern-lit canal, small temples; Hyōtanbori's quieter cousin |
| S-16 | 桜堤 | さくらづつみ | Sakurazutsumi | South-east | By a cherry-lined embankment and park |

**Stage 1 extensions** (2026-11-18; names from the user's draft route map):

| No. | Kanji | Kana | Romaji | District | Character |
|---|---|---|---|---|---|
| Y-09 | 新緑が丘 | しんみどりがおか | Shin-Midorigaoka | North new town | Hilltop new-town terminus, terraced blocks and a park |
| Y-10 | 青葉台 | あおばだい | Aobadai | North hills | Leafy houses, small shopping street |
| Y-16 | 南堀江 | みなみほりえ | Minamihorie | Minami-Horie | Canal lanes of boutiques and cafés south of the old town |
| Y-17 | 開成町 | かいせいちょう | Kaiseichō | South residential | Meiji-era school town: red-brick school, ginkgo avenue |
| Y-18 | 南港台 | なんこうだい | Nankōdai | South port | Terminus on the heights above the container port |
| N-09 | みなとセンター | みなとせんたー | Minato Center | Bay new town | Terminus in the reclaimed-land business district |
| N-10 | 海辺市役所前 | うみべしやくしょまえ | Umibe-shiyakusho-mae | Seaside civic district | City hall, rebuilt on the waterfront |
| N-16 | 旭野 | あさひの | Asahino | East suburbs | Elevated, sunrise-facing suburbs |
| N-17 | 高野台 | たかのだい | Takanodai | East hills | Elevated, hilltop housing estate |
| N-18 | 泉ヶ丘 | いずみがおか | Izumigaoka | East new town | Elevated terminus, named for the spring at its centre |
| A-09 | 新鴎 | しんかもめ | Shin-Kamome | South bay (new island) | Terminus on the newest reclaimed island |
| A-10 | 潮騒公園 | しおさいこうえん | Shiosai-kōen | South bay | Seaside park; shiosai = the sound of the surf |
| A-18 | 紅葉ヶ丘 | もみじがおか | Momijigaoka | North-east hills | Maple hillside, scarlet in November |
| A-19 | 清涼台 | せいりょうだい | Seiryōdai | North-east plateau | Cool upland estate and research campus |
| A-20 | 星峰 | ほしみね | Hoshimine | North-east ridge | Ridge-top terminus below the city observatory |
| S-09 | 潮見 | しおみ | Shiomi | North-west waterfront | Terminus at the tip of the river-mouth landfill |
| S-10 | 西夕凪 | にしゆうなぎ | Nishi-Yūnagi | North-west waterfront | Quiet apartments west of Yūnagihama |
| S-17 | 花みずき | はなみずき | Hanamizuki | South-east | Dogwood avenue; future junction for the Sumire Line |
| S-18 | 新桜川 | しんさくらがわ | Shin-Sakuragawa | South-east canals | Newer canal quarter on the cherry-lined Sakura-gawa |
| S-19 | 海の森 | うみのもり | Uminomori | Bay forest | Terminus by the forest park on the old landfill |

**Kikyō Line** (stage 2, 2026-11-18; names from the user's draft route map):

| No. | Kanji | Kana | Romaji | District | Character |
|---|---|---|---|---|---|
| K-11 | 新潮 | しんしお | Shinshio | Bay front | Terminus on the new bay front: ferry offices, fish-market hall, new flats |
| K-12 | 川湊港 | | Kawaminato-kō | | Interchange with N |
| K-13 | 綿屋町 | | Watayamachi | | Interchange with A |
| K-14 | 紬橋 | | Tsumugibashi | | Interchange with Y and N (K beside N) |
| K-15 | 灯明堀 | | Tōmyōbori | | Interchange with S |
| K-16 | 雲雀野 | | Hibarino | | Interchange with N (K under the viaduct) |
| K-17 | 東ヶ丘 | ひがしがおか | Higashigaoka | East hills | Houses and a shrine wood above the N valley |
| K-18 | 新雲雀野 | しんひばりの | Shin-Hibarino | East new town | Terminus of the newest estate, around a skylark meadow park |

**Sumire Line** (stage 3, 2026-11-18; Seiran, Midorizaka, Kita-Ōdōri, Daigaku-mae and Hanamizuki from the user's draft map, Seiran moved to the north-east hills):

| No. | Kanji | Kana | Romaji | District | Character |
|---|---|---|---|---|---|
| M-11 | 清嵐 | せいらん | Seiran | North-east hills | Hillside terminus: temple wood, old tea house, hiking trailhead. Seiran = clear mountain air |
| M-12 | 緑坂 | | Midorizaka | | Interchange with Y |
| M-13 | 北大通 | | Kita-Ōdōri | | The hub; M's own hall south of S's |
| M-14 | 川湊大学前 | | Kawaminato-daigaku-mae | | Shares the Shiokaze platforms |
| M-15 | 花みずき | | Hanamizuki | | Shares the Shiokaze platforms |
| M-16 | 南桜川 | みなみさくらがわ | Minami-Sakuragawa | South-east canals | The lower Sakura-gawa: boathouses, rowing club, riverside market |
| M-17 | 春野台 | はるのだい | Harunodai | Southern heights | Terminus among new houses and spring meadows |

Numbers start at 11 on each line (an Osaka habit), which leaves 01–10 free for extensions beyond the current first stop.

## Naming rules

- **Every station** has a kanji name, a kana reading (hiragana), and romaji (Hepburn, with macrons like Ō and ū in display text; a plain ASCII slug is fine for IDs).
- **Station names follow real Japanese patterns.** Examples:
  - a district plus a direction or feature: 〜本町 (honmachi), 〜橋 (bashi), 〜前 (mae, "in front of"), 〜口 (guchi), 〜筋 (suji), 〜丁目 (chōme)
  - landmarks: 〜城 (castle), 〜公園 (park), 〜港 (port), 〜大学前 (university)
  - nature: 〜川, 〜森, 〜坂, 〜谷
- **Don't use real station names.** Plausible and invented is the goal. A name that happens to match a tiny real place is fine, but a famous station is not. Names rejected so far for being too close to real ones: Tenjin, Kitahama, Ōgimachi, Hommachi, Minato-Motomachi, Asashiobashi, Hoshikawa, Shiomi. The Akanesuji names were web-searched on 2026-11-18 with no real station or line found; the nearest is Suzukakedōri, which shares its tree with the real Suzukakedai (すずかけ台). Spare if it ever needs replacing: Enjudōri (槐通). The Shiokaze names (汐風線, 夕凪浜, 蔵屋敷, 灯明堀, 桜堤) and the river 澪川 were web-searched on 2026-11-18, also with nothing found. 蔵屋敷 is a historical term (Osaka's Edo-period domain warehouses), not a place name. Avoid Yodomachi (淀町) from the old candidate list: 淀 is too close to Osaka's real Yodo river.
- **Exception, by the user's choice (2026-11-18):** the stage 1 extension names come from the user's own draft route map and are kept as drawn, even where they match real stations: Aobadai, Shiomi (rejected earlier, now used for S-09), Takanodai and Izumigaoka. Treat these as common place-name words. New names should still follow the rule above.
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
- **North-west waterfront and riverside**: the Mio-gawa's mouth and north bank, storehouses and a promenade — Yūnagihama, Kurayashiki
- **South-east**: canals, temples, a cherry embankment — Tōmyōbori, Sakurazutsumi
- **South bay**: reclaimed land, the dome — Kamomehama
- **Merchant quarter**: dyers and cotton wholesalers along Akane-suji — Aizomechō, Watayamachi
- **East hills**: university and suburbs — Kawaminato-daigaku-mae (also on the Shiokaze Line), Hibarino
- **North hills**: residential — Midorizaka
- **North-east hills**: hillside housing and a new town — Tsukimizaka, Yamabukidai
