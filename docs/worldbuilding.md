# Worldbuilding

## The region

**Seikai (西海, せいかい)**, decided 2026-11-19, on screen since 2026-11-22 (`src/data/region.ts`). Four cities: Kawaminato (playable), **Kirigahara 霧ヶ原** (misty plateau city far up the Mio-gawa), **Asanagi 朝凪** (ferry and shipyard town down the coast, behind islands) and **Tōnomiya 遠宮 とおのみや** (old shrine capital across the bay). Three private railways, named only: **Seikai Electric Railway 西海電鉄 (Seiden)** to Kirigahara by its own valley, **Sōnagi Electric Railway 湊凪電鉄** along the coast to Asanagi, **Tōnomiya Express 遠宮急行 (Enkyū)** round the head of the bay. Kansai in feel only: the map must never mirror Kansai's layout. Web-checked 2026-11-22 with one search each: 西海 is real as *Saikai* (Nagasaki) and *Nishiumi* (Ehime), the reading *Seikai* was not found as a place; nothing found for Tōnomiya or the three railways.

## The city

- **Name:** **Kawaminato (川湊, かわみなと)** — "river harbour". Chosen from the candidate list; the others (Asahiura, Shiokaze, Yodomachi) are free for future use as wards or lines.
- **Feel:** an Osaka-like second city. It has a commercial "Kita" (north) hub and a nightlife and shopping "Minami" (south) hub, joined by a main north–south boulevard, Yanagi-suji (柳筋, "willow street"), and its trunk line. A river and canals, a bay to the west, residential hills to the north and east.
- **The river:** **Mio-gawa (澪川, みおがわ)**. A *mio* is the navigable channel through shallow water, which suits a city called "river harbour". It flows west between Kita and Central (about z = −450), passing over the Yanagisuji and Akanesuji lines, and meets the bay at Yūnagihama. The Shiokaze Line follows its north bank. On the route map it is the pale band; in 3D it shows only as the river mouth at Yūnagihama. Web-searched 2026-11-18: no real river or station found. **Water as data (2026-11-24):** coast, landfills, the river and the canals (紬堀, 瓢箪堀, 灯明堀, 桜川, 蛍川, 南堀, 南桜堀) and the inner bay 朝凪湾 are in `src/data/geography.ts`; the old coast is Kon'yahama's sea wall (x ≈ 812). Built in 3D beyond the stations by `src/render/water.ts`: sea and docks at −1.2, river and canals at −2.8 (the stations' canal level), stone embankments, gates where canals meet the sea. 碇堀/朝凪湾/南堀 web-checked: no real canal or bay found.
- **Character:** proud, a bit louder and scrappier than the capital, with merchant-city roots and good street food.

## Operators

| Operator | Type | Status |
|---|---|---|
| **Kawaminato Metro (川湊メトロ)** | Underground metro, 6 lines | Built |
| **Akitsushima Railway (秋津島鉄道, AR)** | JR-style main line: through platforms on the viaduct at Kawaminato Station | Named 2026-11-18, not built. Plans: [akitsushima-railway.md](akitsushima-railway.md) |
| _TBD_ private railway | Dead-end terminal in the Mioya Terminal Building (Hankyu style): its concourse is on the deck level at the north end of the grand concourse | Not named; gate line hoarded, no platforms yet |
| _TBD_ high-speed line | Not at Kawaminato Station any more (dropped from the site, 2026-11-21); its station is undecided | Not named |

The other two future operators are deliberately unnamed. Their space at the hub is signed only **将来線予定地 / Reserved for future line** plus the kind of railway. Name them when one is actually built.

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
| Sumire | 2023 | Sharing the Shiokaze Line's track |
| Ichō | 2026 | The newest and deepest: a southern and eastern orbital tying four line ends together |

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
| Mioya Department Store | 澪屋百貨店 | The terminal department store over the Kita-Ōdōri platforms: the Mioya Terminal Building (澪屋ターミナルビル), with ホテル澪屋 Hotel Mioya beside it (from the Mio-gawa). Web-checked 2026-11-21 |
| Akitsushima Life Building | 秋津島生命ビル | Head office tower on Kita-Ōdōri, west of the station |
| Asanagi | あさなぎ | Convenience store chain (teal and cream), named after the Asanagi shore. Not web-checked yet |
| Hinode Stop | ひのでストップ | Convenience store chain (magenta and navy). Not web-checked yet |
| Kawaminato-ken | 駅弁 川湊軒 | Ekiben stall inside the gates at Kawaminato Station (AR), east concourse. Web-checked 2026-11-23: no real maker by this name found |
| Kōka-an | そば・うどん 高架庵 | Standing soba stand under the viaduct, Kawaminato Station east concourse (高架 = viaduct). Web-checked 2026-11-23: none found |
| Mugi no Kiteki | ベーカリー 麦の汽笛 | Bakery, Kawaminato Station west concourse ("the wheat's steam whistle"). Web-checked 2026-11-23: none found |
| Hokake-ya | 西海みやげ 帆かけ屋 | Seikai souvenir shop, Kawaminato Station west concourse. Web-checked 2026-11-23: none found |
| Kissa Tessan | 喫茶 鉄傘 | Coffee kiosk on Kawaminato Station's bridge concourse (鉄傘 = an iron train shed). Web-checked 2026-11-23: none found |
| Kawaminato-dō Gifts | おみやげ 川湊堂 | Souvenirs |
| Minamo Drug | ミナモドラッグ | Drugstore |
| Omusubi Komeya | おむすび こめ屋 | Rice balls and bento |
| Shirasagi Tea Room | 白鷺茶房 | Café |
| Tsubaki Shobō | つばき書房 | Bookshop |
| Kawasemi Shoe Repair | くつ修理 かわせみ | Shoe repair |
| Tanpopo Cleaning | クリーニング たんぽぽ | Dry cleaner |
| Ginnan-dō Rice Crackers | せんべい 銀杏堂 | Rice crackers |
| Mizuha Mobile | みずはモバイル | Mobile phone shop |
| Naruko Farm Market | 産直市 なるこ | Farm produce stall (Narukozaka) |

The Japanese spellings in the code are the source of truth.

### Named places at street level

Each station's street spec names its own campus, quay and promenade (`campusName`, `quayName`, `promenadeName` in `specs.ts`, alongside `parkName`, `arcadeName`, `canalName`). The street signs, exit boards and area maps all read them. Invented 2026-11-18; before that every campus was "Kawaminato University" and so on.

| Station | Place |
|---|---|
| Daigaku-mae | 川湊大学 Kawaminato University (the default) |
| Daigaku-mae (street) | Rebuilt 2026-11-22, Hongō style (`daigaku-street.ts`). Streets: 学府通 Gakufu-dōri, 文庫通 Bunko-dōri, 桐筋 Kiri-suji, 梓筋 Azusa-suji, 蛍雪横丁 Keisetsu-yokochō, 下宿小路 Geshuku-kōji, 湯屋小路 Yuya-kōji, 書肆裏小路 (back lane); junctions 大学前西/東, 文庫桐, 文庫梓, crossing 大学正門前. Campus: 正門, 西通用門, 守衛所, 附属図書館 (clock 1925), 法文一号館, 理学部二号館, 第一食堂, 銀杏並木, 欅の森, 大講堂 (Grand Auditorium, clock tower), 心字池 (pond garden), 初代総長像, 運動部 部室棟. Town: 珈琲 振子 Coffee Furiko (was 鳩時計: a real café uses it), bookshops 雁書房, 一草堂書店, 紙魚堂, 青灯書林, 星霜堂, 木犀書店, 夜学舎, 洋書 ルーペ; 定食 ことぶき, めし処 学府, とんかつ 坂上, 文具 けやき堂, 白紙舎, たばこ 珈琲 灯台, 純喫茶 ノート, 活字舎, 画材 青墨; 梓ビルヂング, 学府会館, 文庫マンション; lodgings 松風荘, 若葉荘, 青雲寮, あけぼの荘, 白樺, 螢荘; 雀湯 Suzume-yu; 文庫児童遊園, 蛍雪ひろば. Web-checked 2026-11-22 (one search each, nothing found): 学府通, 蛍雪横丁, 雀湯, 振子 (café), 雁書房/紙魚堂/青灯書林, 文庫通/梓筋/桐筋; 2026-11-22 stage 3: 一草堂書店/星霜堂/木犀書店, 夜学舎/活字舎/白紙舎, 純喫茶 ノート/画材 青墨/洋書 ルーペ/珈琲 灯台 (nothing matching; 星霜軒 is a real dealer, so keep 星霜堂 as is). Not checked: the eateries, buildings, lodgings and parks (generic names). Crossing 大学正門前; club boards 写真部, 軽音楽部, 文芸部, 自治会, 山岳部, 落語研究会 (generic) |
| Tsumugibashi | 紬橋絹取引所 Tsumugibashi Silk Exchange (1926; `landmark` in `specs.ts`), the station building on the avenue's south side, a brick and stone front with a copper dome. East of it the avenue crosses 紬堀 Tsumugi-bori (the old silk merchants' canal) on 紬橋 Tsumugi-bashi, the stone arch bridge the station is named after. Under its dome: 紬橋ロトンダ the Tsumugi Rotunda, with 紬の大機 the Great Loom as the meeting point; 取引所通り Exchange Passage, 大階段 the Grand Stair, 取引所ホール the Exchange Hall. Rotunda shops (`SHOPS` in `rotunda.ts`): たんもの屋, おび清, むすび, まわた屋, かたぞめ, いとぐるま. Invented 2026-11-19 |
| Kita-Ōdōri (street) | Rebuilt 2026-11-21, Umeda style (names web-checked that day). Streets: 北大通 avenue; 筋 浜手筋 Hamate-suji, 柳筋 Yanagi-suji, 汐見筋 Shiomi-suji, 千鳥筋 Chidori-suji; 通 南一番通 Minami-ichiban-dōri, 南二番通 Minami-niban-dōri, 駅裏通 Ekiura-dōri; local 西小路, 澪屋西通, 澪屋東通 (高架通 Kōka-dōri, the 北栄通商店街 Hokuei-dōri arcade and the 北栄横丁 alleys went with the grand station, see the row below). Landmarks: 北大通ゲートタワー Kita-Ōdōri Gate Towers (twin, sky lobby over Yanagi-suji), カミナリ電機 Kaminari Denki, 川湊座 Kawaminato-za, 澪標銀行 Miotsukushi Bank, キタモード Kita Mode, 川湊新報 Kawaminato Shinpō, 東雲イン Shinonome Inn, 北大通センタービル, 浜手ビルヂング, 北栄ビル, 千鳥スクエア, カプセル&サウナ 湯けむり, カラオケ 歌舟, パーラー 七福, ゲーム ポンポン, 柳森稲荷 Yanagimori Inari, 汐見ポケットパーク. On Yanagi-suji (not web-checked): 澪標銀行 柳筋支店, 柳テラス Yanagi Terrace, 川湊海上ビル, 柳筋会館, 北大通証券, 楊柳堂 本店 Yōryūdō, 川湊ガスビル, みお生命 柳筋ビル; small places 千鳥児童遊園, 浜手ひろば, 北栄稲荷. The Sky Crown, the expressway, the scramble and the old plaza are gone |
| Kawaminato Station, north side | Laid 2026-11-23 (stage 1 of `Plans/stations/kawaminato-grand.md`). 時計筋 Tokei-suji (the avenue north from the square; web-checked 2026-11-23, no real street of that name found), 駅前通 Ekimae-dōri and 川湊駅前広場 Kawaminato Station Square (generic names, not checked). 高架通 Kōka-dōri and 北栄通商店街 Hokuei-dōri arcade were removed. Stage 3b (2026-11-23): what is left of the arcade is 北栄西商店街 Hokuei Nishi and 北栄東商店街 Hokuei Higashi, either side of the square. Fronts facing the station: 秋津島鉄道 本社 (Akitsushima Railway head office), 川湊中央郵便局, みお生命 本館, 川湊商工会議所; on Tokei-suji: 時計筋ビルヂング, 川湊倶楽部, 川湊商船ビル, 北栄会館. All are names already recorded here plus a generic noun, so none was web-checked. Stage 4b: the station's gates are 北栄口 Hokuei Gate, 中央口 Central Gate and 澪屋口 Mioya Gate; the metro's way up into it is Exit 15. |
| Midorizaka | 緑坂公園 Midorizaka Park, 緑坂駅前広場 Midorizaka Station Plaza (buses 北丘団地・緑坂循環, 川湊駅・北大通), 緑坂銀座 Midorizaka Ginza: パン工房 ぶどうの木 Budō-no-ki Bakery, 花 みどり Midori Flowers, 八百屋 丘の上, コインランドリー, 本とおもちゃ ぶんぶん, 和菓子 若葉, クリーニング 白樺, 喫茶 ひだまり; in the exit 1 pavilion 喫茶 緑の窓 Midori-no-Mado Coffee |
| Kaiseichō | 川湊第一高等学校 Kawaminato Daiichi High School (founded 1902, 明治三十五年); street: 文具 学林堂 Gakurindō Stationery; station: 文具と古書 開成堂 Kaiseidō Stationery & Old Books (walk-in) |
| Seiryōdai | 川湊工科大学 Kawaminato Institute of Technology |
| Kawaminato-kō | 川湊港フェリーターミナル Kawaminato Ferry Terminal (the default) |
| Kamomehama | 鴎浜桟橋 Kamomehama Pier |
| Nankōdai | 南港ふ頭 Nankō Wharf |
| Shinshio | Rebuilt 2026-11-25 as a fish-market town (theme-notes "Fish market town"). 新潮魚市場 Shinshio Fish Market (the hall on the dock quay), 新潮フェリーターミナル Shinshio Ferry Terminal, 潮守恵比須神社 Shiomori Ebisu Shrine, 新潮場外横丁 the covered alley, 新潮岸壁 the quay. Streets: 新潮臨港通 Shinshio-rinkō-dōri, 浜通 Hama-dōri, 場外筋 Jōgai-suji, 冷蔵庫筋 Reizōko-suji; junctions 新潮駅前, 魚市場前, フェリーのりば前, 冷蔵庫筋北. Fill (step 2): 新潮漁業協同組合 the co-op and its bank, うしお薬局・新潮みなと診療所, 新潮郵便局, 新潮港交番, 潮見ポケットパーク, market shops in `ICHIBA_NAMES` (buildings.ts). Generic names, not web-checked yet (the shrine's name is owed a check) |
| Minato Center (rebuild) | Rebuilt from 2026-11-25 as a bay new town after Minato Mirai (theme-notes "Bay new town"). Stage 1: みなとセンター アトリウム (Exit 2); the low hall's shops reuse the old basement names (not web-checked) plus マルホシ ミニ. Stage 2: streets 海辺通 (Umibe's avenue carried on), 帆柱筋 Hobashira-suji, 浜風筋 Hamakaze-suji, センター北通, みなとモール公園; landmarks みなとセンタータワー, 川湊国際展示場, 渚の大観覧車 Nagisa Great Wheel, みなとベイウォーク and ベイウォーク桟橋, みなとデッキ, みなと臨海公園. Web-checked 2026-11-25 (one search each for 渚の大観覧車, 帆柱筋/浜風筋, みなとモール公園/みなとセンタータワー): none found in use. Junction names (展示場前, 帆柱筋北 …) are generic, not checked. Stage 3: ホテル渚テラス Hotel Nagisa Terrace, ホテル港灯り Hotel Minato-akari (both web-checked 2026-11-25, none found), 川湊ベイフロントビル, みなとセンター レジデンス, みなとセンター診療所・ベイ薬局, みなとセンター駅前交番, 旧七号倉庫 ハーバーホール (No. 7, not No. 2: 旧二号倉庫 turned up Yokohama's red-brick warehouse), カフェ ベイフロント (generic, not checked). Peninsula (2026-11-25): 西浜通 Nishihama-dōri, 西浜プロムナード, 渚の岬公園 and 岬の展望灯台, みなとコンベンションセンター, ホテル汐路リゾート, みなと中通, 河口プロムナード, みなとマリーナ and its clubhouse, みなとセンター 水上バスのりば; Shinshio's 新潮臨港通 and 浜通 carried west. Web-checked 2026-11-25 (ホテル汐路, 渚の岬公園, みなとマリーナ, 西浜プロムナード): none found in use. Peninsula fill (2026-11-25, not web-checked): 西浜レジデンス, カフェ 汐見, 川湊市立みなと小学校, 帆柱公園, ベイサイドコート みなと, ホテル みなとグランドベイ, ハーバーテラス川湊 and ハーバーシネマ, みなとマリーナ ボートヤード, 汐守神社 (the fishing village's shrine), シオサイ石油 |
| Yūnagihama | 夕凪プロムナード Yūnagi Promenade (the default) |
| Minato Center | みなとベイウォーク Minato Baywalk |
| Shin-Kamome | 新鴎シーサイドデッキ Shin-Kamome Seaside Deck |
| Shiomi | Rebuilt from 2026-11-25 as a leisure waterfront at the landfill tip (Tempozan-like): an open-cut island terminus under a white wave canopy, a head house facing the plaza, 川湊水族館 Kawaminato Aquarium at the tip (the posters' name), a harbour market hall, the Hamakaze-suji road bridge to Minato Center (planned, stage 3). Streets (web-checked 2026-11-25, none in use; Tokyo's real 潮見通り avoided): 潮見ベイ通り Shiomi Bay-dōri, 岬筋 Misaki-suji, 汐入筋 Shioiri-suji, 潮見中通 Shiomi-naka-dōri, 潮見北通 Shiomi-kita-dōri, 灯台小路 Tōdai-kōji, 浜木綿小路 Hamayū-kōji, 水族館通り Suizokukan-dōri, 緑道裏通 Ryokudō-ura-dōri, 水族館北通, and (grown north to the north shore, web-checked) 潮見北岸通 Shiomi-hokugan-dōri, 潮見西岸通 Shiomi-seigan-dōri, 岬北通 Misaki-kita-dōri, 時計筋 Tokei-suji, 潮見東筋 Shiomi-higashi-suji, 潮見なぎさ通 Shiomi-nagisa-dōri, 潮見北岸プロムナード, 潮見ベイ釣り桟橋 Shiomi Bay Fishing Pier, 潮見北岸マリーナ Shiomi North Shore Marina, 潮見大橋 Shiomi Ōhashi (the bascule bridge; web-checked) with 浜風筋 carried on from Minato Center in 灯台小路's place, small streets 帆布小路 Hanpu-kōji, 灯台小路 Tōdai-kōji (moved to the tip), 西岬通 Nishi-misaki-dōri (web-checked), junctions 潮見駅西, 浜風筋潮見中通, 浜風筋なぎさ, 浜風筋北岸, and at Minato Center 潮見大橋南詰; the fill (stage 4, web-checked): ホテル潮見ベイサイド, 潮見マリンホテル, ホテル北岸, 潮見リゾート ラ・メール, ホテル岬, 潮見ベイテラス, ホテル アクアリウムサイド, 潮見ステーションホテル, 潮見ハーバーブルワリー (the old brick warehouse), 潮見船玉社 Shiomi Funadama Shrine, 潮見東口公園, 潮見駅前交番; 潮見海浜緑道 Shiomi Seaside Greenway; 潮見ハーバーマーケット Shiomi Harbour Market (web-checked), 水族館マリンテラス, 潮見ベイ西公園 Shiomi Bay West Park, カフェ 潮だまり Café Shiodamari, 水族館カフェ うみのまど, 潮見ハーバー桟橋 (web-checked; ミナモカフェ is real, avoided), 潮見駅バスターミナル, junctions 潮見駅前, 潮見駅東, 岬筋中通, 汐入筋中通, 水族館通り口; stage 5 (not web-checked): 潮見防波堤灯台 Shiomi Breakwater Lighthouse, 潮見ベイ サイクリングロード Shiomi Bay cycle path (on to Minato Center over 潮見大橋), summer festival stalls on the greenway's promenade (July–August 17:00–22:00); the town set's boards (generic): 潮見第一ビル, 潮見センタービル, みさきビル, しおみ内科・小児科, なぎさ歯科クリニック, 浜通り整形外科, 潮見進学ゼミ, 学習塾 みなと |
| Umi-no-Mori | 海の森海岸遊歩道 Umi-no-Mori Shore Walk |

Only the name changes: a quay still has the same building, cranes and moored ferry whatever it is called.

### Names at the hero stations

Invented with each station's look (`src/stations/looks/<station>.ts`), 2026-11-18.

| Station | Names |
|---|---|
| Hyōtanbori | Bars and eateries of the alley: 焼鳥 ひさご (Yakitori Hisago), スナック 月見草 (Snack Tsukimisō), 串カツ 金瓢 (Kushikatsu Kinpyō), おでん 小雪 (Oden Koyuki), 立呑み 堀端 (Tachinomi Horibata), バー 灯籠 (Bar Tōrō), もつ焼 ろく (Motsuyaki Roku), ラーメン 夜鳴軒 (Ramen Yonaki-ken), スナック ゆらり (Snack Yurari), 酒場 瓢六 (Sakaba Hyōroku), バー 澪標 (Bar Miotsukushi), てんぷら 小舟 (Tempura Kobune), ホルモン 堀の家 (Horumon Hori-no-ya), 小料理 ふじ乃 (Koryōri Fujino); plus 居酒屋 ひょうたん and たこ焼き 丸八 from the street above |
| Hyōtanbori (street) | 瓢箪会館 Hyōtan Kaikan (landmark, giant gourd on the roof), 瓢箪横丁 Hyōtan Yokochō (walk-in bar 酒処 ひさご屋 Bar Hisago-ya at the bend; boards also もつ煮 丸吉, スナック 珊瑚, 居酒屋 縁, ラーメン 夜鳴, カラオケ 歌姫) with 焼鳥 とり平, スナック 茜, おでん 松の家, バー 月光, 串焼 ひょう吉, 小料理 志乃, 立呑み 千鳥, 餃子 一番星, 酒場 堀の灯, スナック 蘭, ホルモン 鉄, バー 夜舟; 瓢箪堀商店街 Hyōtanbori Shōtengai; 瓢箪堀 遊覧船のりば (canal cruise pier) |
| Minamihorie | Canal boutiques: カフェ 水面, 古着 ポラリス, 器と暮らし 白椿, 照明 ともしび, 椅子工房 クレール, パン工房 麦の穂, 帆布 かもめ, 花と緑 そよ風, 紅茶 リバーサイド, 古書 堀川文庫, 革小物 ノット, ジェラート 凪. Street: 南堀江 時計台 Minamihorie Clock Tower, カフェ ほりえ Café Horie, 家具と雑貨 木の葉 Kinoha Furniture & Zakka, 南堀江橋 Minamihorie-bashi. Station arcade: 帽子 マロン Chapeau Marron Hats, 文具と本 ほりえ堂 Horie-dō Books & Stationery, 時計店 秒針堂 Byōshin-dō Watches, 洋菓子 ルミエール Pâtisserie Lumière, 喫茶 ドーム Kissa Dōmu, 花 ほりえ Hana Horie Flowers, 眼鏡 レンズ堂 Lens-dō Opticians, 雑貨 ルナ Luna Zakka, 洋品店 銀杏 Ichō Haberdashery, 紅茶 アールグレイ Earl Grey Tea Room |
| Tsurumatsu | Stalls of 鶴松商店街: 青果 八百辰 (Yaotatsu), 鮮魚 魚吉 (Uokichi), コロッケ 丸鶴 (Marutsuru), 茶舗 松葉園 (Matsubaen), とうふ 白菊屋 (Shiragikuya), 駄菓子 まめや (Mameya), 靴・合鍵 つるや (Tsuruya), and the shuttered 洋品 つばき and 時計・眼鏡 ほしの. Old enamel adverts: 湊印醤油, 清酒 千鶴松, みなと石鹸, ヒバリ目薬. Walk-in: 純喫茶 ミモザ Kissa Mimosa. Street: 鶴の湯 Tsuru-no-yu (bathhouse); arcade shops 八百屋 青木, 果物 みつば, 乾物 丸十, 呉服 松乃屋, 文具 鶴文堂, 時計 正確堂, 精肉 大黒, 煎餅 鶴焼本舗, 惣菜 おふくろ, 金物 山中, 写真 フジタ, 畳 たなか, 化粧品 ローズ, 洋品 マダム, 鶴松薬局, 鮮魚 魚辰, 和菓子 松風, 茶舗 一服. Terminus of the line 1933–1961 |
| Kurayashiki | 蔵カフェ 白壁 (Kura Café Shirakabe), 酒・醤油 かわくら屋 (Kawakuraya), 工芸 しろつち (Kōgei Shirotsuchi); sake labels 川湊 and 湊誉 (Minato-homare) |
| Kamomehama | The home team at Kawaminato Dome: **川湊ガルズ (Kawaminato Gulls)**, baseball, gull orange `#f47a20` and navy `#14284b`. ガルズ オフィシャルショップ (Gulls Official Shop), スタジアムめし かもめ亭 (Kamome-tei) |
| Hoshimine | 星の窓 (Hoshi no Mado, observatory shop), 三日月珈琲 (Mikazuki Coffee). The ceiling's constellations (Fox, Lantern, Kite, Crane) are invented and unlabelled |
| Tōmyōbori | 提灯 ひより屋 (Chōchin Hiyoriya, lantern maker), 茶房 ともしび (Sabō Tomoshibi), 立呑 かわべり (Tachinomi Kawaberi); the festival **灯明堀 万灯まつり (Tōmyōbori Mantō Matsuri)**. Added with the spine frontage: 和ろうそく 灯芯堂 (Warōsoku Tōshindō, candles and incense), 筆墨 すずり屋 (Hitsuboku Suzuriya, paper and brushes), 酒房 ほたる (Shubō Hotaru, sake bar), うなぎ 堀端 (Unagi Horibata, eel counter), 灯絵工房 あかり (Tōe Kōbō Akari, lantern-painting workshop), 甘味処 ゆうなぎ (Kanmidokoro Yūnagi, sweet house), 手ぬぐい 川染 (Tenugui Kawazome), 湯葉 かわぎり (Yuba Kawagiri) |
| Aizomechō | 藍染処 つゆ草 (Aizome Tsuyukusa, dye works), 手ぬぐい 波千鳥 (Tenugui Namichidori), 呉服 糸よし (Gofuku Itoyoshi), 日本茶 しずく園 (Shizuku-en); the dyers' crest 三つ波丸 (Mitsunami-maru, three waves in a ring). Added with the spine frontage: 刺し子糸 ひと針 (Sashiko Hitohari, sashiko thread), ふろしき 結び屋 (Furoshiki Musubiya, indigo furoshiki and bags) |
| Tsumugibashi | The streets of **紬橋地下街 (Tsumugibashi Chikagai)**, which are its corridors, named on plates at their corners. Spines: 経糸通り Tateito-dōri (Warp Street, the Nagisa spine, gate to gate), 綾織通り Ayaori-dōri (Twill Street, the Kikyō spine). Cross passages: 筬小路 Osa-kōji (Reed Lane, west), 緯糸小路 Yokoito-kōji (Weft Lane, middle), 綜絖小路 Sōkō-kōji (Heddle Lane, east). Transfer bays: 糸屋横丁 Itoya-yokochō (off Tateito-dōri), 真綿小路 Mawata-kōji (off Ayaori-dōri). Exit corridors: 糸巻通り Itomaki-dōri (Bobbin Street, exit 1), 綛通り Kase-dōri (Skein Street, exit 2), 平織通り Hiraori-dōri (Plain-weave Street, exit 3), 絣小路 Kasuri-kōji (Ikat Lane, exit 4). 杼の辻 Hi-no-tsuji (Shuttle Crossing) is where the loom 紬の機 (The Tsumugi Loom) stands in Tateito-dōri; the tapestry facing the middle cross passage is labelled 綾織の紬 (Tsumugi twill). Shops: 紬織物 はたや (Hataya Tsumugi Silks), 糸屋 よりいと (Yoriito Yarn & Thread), きもの 綾衣 (Kimono Ayaginu), ふろしき 包み屋 (Tsutsumiya Furoshiki), 染め見本 そめいろ (Someiro Dye Bar) |
| Kawaminato-kō (street, 2026-11-24) | Streets: 湊浦通 Minatoura-dōri (the harbour boulevard) and 湊浦橋 Minatoura-bashi (its bridge over the inlet to Kon'yahama), 桟橋筋 Sanbashi-suji, 帆柱筋 Hobashira-suji, 綱町通 Tsunamachi-dōri; lanes 錨小路 Ikari-kōji, 舫小路 Moyai-kōji, 税関横丁 Zeikan-yokochō, 船大工横丁 Funadaiku-yokochō, 網干場小路 Amiboshiba-kōji, 帆布横丁 Hanpu-yokochō; junctions 川湊港西, 桟橋前, 綱町帆柱, 綱町桟橋; 紺屋浜陸閘 (Kon'yahama flood gate). Landmarks: 川湊煉瓦倉庫 一号館・二号館 (Kawaminato Brick Warehouses), 旧川湊税関 (Old Kawaminato Customs House, 1934), 川湊港フェリーターミナル, 川湊港湾事務所 (Port Office), 煉瓦広場 Renga Hiroba with 開港記念の錨 (1889). Fronts: 旧川湊貿易商館, 湊浦銀行, 汐見海運ビルヂング, 帆布会館, 帆影倉庫, 湊浦汽船, 鴎丸海運, 船具 いかり屋, ロープと帆 浜田, 海図 なみじ堂, 船食 しおさい, 川湊港湾ビル, 湊浦トレードセンター, ホテル 船乗り, ハーバータワー 川湊, 湊浦スクエア; parks 綱町児童遊園, 船溜まり公園. Web-checked: 湊浦通/橋, 帆柱筋, 綱町通, 桟橋筋, the four lane names, 汐見海運, 鴎丸海運 (no matches); 西海汽船 was a real company (1940s), so it became 湊浦汽船. Not checked: the rest. North side re-laid 2026-11-24 (Aizomechō pattern): 綱町通 at z −54 with pavements, 唐船大路 from the boulevard under 迎港門, the bathhouse 錨湯 Ikari-yu, lanes 船大工横丁, 網干場小路, 帆布横丁, 錨小路, 舫小路, 魚河岸横丁; shops 船具 錨屋, 網元 浜吉, 乾物 磯屋, 喫茶 灯, 居酒屋 舫, 魚 丸十 and others (not web-checked). Stage B 2026-11-24: 鴎通 carried south to the boulevard, 羅針通 Rashin-dōri, 汐路通 Shioji-dōri, lanes 浮標小路 Fuhyō-kōji and 舵小路 Kaji-kōji (all lanes 4 m+); the park 湊浦緑地 Minatoura Ryokuchi with 湊浦赤レンガ珈琲館 (warehouse 五号), 旧第三上屋 湊浦マーケット and the 旧航路標識 buoy; fronts 海商銀行, 湊浦貯蓄銀行, 汐路汽船, ホテル湊浦イン, 浦島商会, 湊浦ポートビル, 喫茶 港灯, 浦野マリンエンジン and others (not web-checked). Below ground (station stage 3, 2026-11-24): the harbour look (looks/kawaminato-ko.ts), the mural 'harbour' (川湊港 明治の港) and the ship model 川湊丸 (1889) |
| Kamome-ga-oka (district, 2026-11-24) | 鴎ヶ丘, the foreign quarter on the bluff (the old islet): lanes 港見通 Minatomi-dōri, 異人館通 Ijinkan-dōri, 鐘楼通 Shōrō-dōri; ways up 鴎坂 Kamome-zaka, 天主堂坂 Tenshudō-zaka, 浜見坂 Hamami-zaka and 北岸の石段; 川湊天主堂 (1879), 鴎ヶ丘女学院 (1925), 鴎ヶ丘公園; houses 旧ウォルシュ邸, 旧デンマーク領事館, 旧ブラント邸, 旧ハリントン邸 (museum), 旧ロッシ邸, 旧ヘイデン邸. Tōsen-machi: 海龍飯店 Hairyū Hanten (walked into). Not web-checked |
| Kita-Hatoba inner blocks (2026-11-24) | Lanes 艫綱小路 Tomozuna-kōji, 汽笛横丁 Kiteki-yokochō (izakaya alley), 帆桁小路 Hogeta-kōji, 船溜小路 Funadamari-kōji, 舵輪小路 Darin-kōji; firms 北辰汽船, 波止場倉庫, 帆影海上火災, 湊浦通運, 鴎商事, 羅針海運, 岸壁信用金庫 and others; ferry terminal kiosk 喫茶 みなと; ferry routes 新鴎島, 南港, 紺屋浜 (no times shown). Not web-checked |
| Daigaku-mae | 喫茶 れんが (Kissa Renga), 古書 文蔵 (Fumikura Old Books), めし処 はるにれ (Harunire), the university co-op 大学生協; clubs on the noticeboards: rowing, astronomy, light music, photography, rakugo, mountaineering, tea ceremony. Added with the spine frontage: カレー くすのき (Curry Kusunoki), 中古レコード 音の葉 (Oto-no-Ha Records & Instruments) |

## Stations

| No. | Kanji | Kana | Romaji | District | Character |
|---|---|---|---|---|---|
| Y-11 | 緑坂 | みどりざか | Midorizaka | North hills | Quiet residential station, park (the old north terminus) |
| Y-12 / A-06 / S-13 | 北大通 | きたおおどおり | Kita-Ōdōri | Kita | **The central station.** Metro hub under Kawaminato Station |
| Y-13 / N-05 | 紬橋 | つむぎばし | Tsumugibashi | Central | Interchange. Tsumugi = pongee silk: merchant-city roots |
| Y-14 | 瓢箪堀 | ひょうたんぼり | Hyōtanbori | Minami | Nightlife, "gourd canal" |
| Y-15 | 鶴松 | つるまつ | Tsurumatsu | Old town | Shōtengai arcade station (the old south terminus) |
| N-03 | 川湊港 | かわみなとこう | Kawaminato-kō | Bay area | Port, ferry terminal |
| N-04 / A-05 | 藍染町 | あいぞめちょう | Aizomechō | Merchant quarter | Interchange. Old indigo dyers' quarter |
| N-06 / S-14 | 川湊大学前 | かわみなとだいがくまえ | Kawaminato-daigaku-mae | University | Brick, campus gate. Interchange |
| N-07 | 雲雀野 | ひばりの | Hibarino | East hills | Elevated; where the line comes out onto the viaduct. Hibari = skylark |
| A-03 | 鴎浜 | かもめはま | Kamomehama | South bay | Stadium station beside Kawaminato Dome. Kamome = gull |
| A-04 | 綿屋町 | わたやまち | Watayamachi | Merchant quarter (south) | Cotton wholesalers' street |
| A-07 | 鈴懸通 | すずかけどおり | Suzukakedōri | Kita (east) | Plane-tree avenue, civic and theatre district |
| A-08 | 月見坂 | つきみざか | Tsukimizaka | North-east slope | "Moon-viewing slope", quiet hillside |
| A-09 | 山吹台 | やまぶきだい | Yamabukidai | North-east hills | New town, bus rotary. Yamabuki = kerria |
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
| N-01 | みなとセンター | みなとせんたー | Minato Center | Bay new town | Terminus in the reclaimed-land business district |
| N-02 | 海辺市役所前 | うみべしやくしょまえ | Umibe-shiyakusho-mae | Seaside civic district | City hall, rebuilt on the waterfront. Theme: civic axis, after Kobe's city hall quarter; landmarks the city hall tower and Umibe Park |
| N-08 | 旭野 | あさひの | Asahino | East suburbs | Elevated, sunrise-facing suburbs |
| N-09 | 高野台 | たかのだい | Takanodai | East hills | Elevated, hilltop housing estate |
| N-10 | 泉ヶ丘 | いずみがおか | Izumigaoka | East new town | Elevated terminus, named for the spring at its centre |
| A-01 | 新鴎 | しんかもめ | Shin-Kamome | South bay (new island) | Terminus on the newest reclaimed island |
| A-02 | 潮騒公園 | しおさいこうえん | Shiosai-kōen | South bay | Seaside park; shiosai = the sound of the surf |
| A-10 | 紅葉ヶ丘 | もみじがおか | Momijigaoka | North-east hills | Maple hillside, scarlet in November |
| A-11 | 清涼台 | せいりょうだい | Seiryōdai | North-east plateau | Cool upland estate and research campus |
| A-12 | 星峰 | ほしみね | Hoshimine | North-east ridge | Ridge-top station below the city observatory |
| A-13 | 霞谷 | かすみだに | Kasumidani | Kasumi valley | Open cutting where the line leaves the ridge tunnel (2008); names web-searched 2026-11-18, no real station |
| A-14 | 紫苑台 | しおんだい | Shiondai | North-east new town | Elevated terminus of the 1990s aster new town, bus terminal and shopping centre (2008) |
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

Osaka/Umeda style. The **metro** station is **Kita-Ōdōri (北大通)**: that is the name on platforms, exits and the map. Above it stand the **Mioya Terminal Building** (the department store, with the private railway's terminal inside) and, on the viaduct behind, **Kawaminato Station (川湊駅)**, the AR Main Line's station. Nothing in the network data is called Kawaminato Station yet, because no railway serves it.

| Thing | Name |
|---|---|
| Meeting spot | **Mio no Hiroba (澪のひろば)**: the square with the water clock in Miochika's South Town. (Kin no Yanagi, the gilded willow, went with the old atrium in 2026-11.) |
| Underground shopping street | **Miochika (みおちか, 澪地下街)**: Miochika Ōdōri under the avenue (east and west), West Town (西の町), East Town (東の町), South Town (南の町); the Mioya Food Floor (澪屋 食品館) under the terminal |
| Terminal building | Mioya Terminal Building (澪屋ターミナルビル): Mioya Department Store, a street arcade and the public Mioya Terrace (澪屋テラス) over it |
| Footbridge | Kita-Ōdōri footbridge (北大通歩道橋): a ring over the avenue and Yanagi-suji, joined to the terrace |
| Hotel | Hotel Mioya (ホテル澪屋), west of the terminal building |
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

- Tsumugibashi rebuild (2026-11-21; web-checked: 綾錦商事, 練絹通, 白絹通, 機場筋, 繭町筋, 絹問屋横丁, 紬堀テラス, 紬橋銀行; the rest owed): streets 練絹通 Neriginu-dōri, 白絹通 Shiroginu-dōri, 桑町筋 Kuwamachi-suji, 機場筋 Hataba-suji, 繭町筋 Mayumachi-suji; 絹問屋横丁 Kinudon'ya Yokochō, 紬堀 川辺の道 (riverside walk), 紬堀テラス, 紬橋歩道橋; the fronts' and wholesalers' names are `NAMES` and `TONYA` in `src/stations/tsumugibashi-street.ts`. Inside the Silk Exchange (stage 2, not web-checked): 取引所ホール（旧立会場） the old trading floor, 2階 回廊・絹の資料室 the gallery and Silk Museum, 喫茶 立会場 Café Tachiaiba, 取引所連絡通路 the footbridge link.
- Street places (2026-11-20, names not web-checked): 柳筋ポケットパーク Yanagisuji Pocket Park (Kita-Ōdōri), 紬稲荷神社 Tsumugi Inari Shrine (Tsumugibashi), 北大通交番 and 紬橋交番 police boxes.
- Aizomechō's streets (2026-11-22): the Nagisa Line's road is still 紬通 Tsumugi-dōri here, crossed by 茜筋 Akane-suji. New: 藍甕筋 Aigame-suji (the dyers' street, indigo-vat street), 伸子筋 Shinshi-suji, 型紙筋 Katagami-suji, 刈安筋 Kariyasu-suji, 浅葱通 Asagi-dōri, 縹通 Hanada-dōri (dyers' tools and indigo shades), the lanes のれん小路 Noren-kōji and 藍染横丁 Aizome-yokochō, the shrine 甕守稲荷神社 Kamemori Inari, the parks 伸子児童遊園 and 藍甕ひろば. These were web-searched on 2026-11-22 with nothing real found. Not web-checked: the shop and building names in `aizomecho-street.ts` (`NAMES`, `DYERS`, `ROJI`).
- Kon'yahama's shore (2026-11-24): 浜通 Hama-dōri (the sea-wall street), the lanes 網干小路 Amiboshi-kōji, 舟入小路 Funairi-kōji, 浅葱小路 Asagi-kōji, 藍玉小路 Aidama-kōji and the alley 裏路地 Ura-roji, the bathhouse 紺屋湯 Kon'ya-yu, the shrine 浜恵比須社 Hama-Ebisu Shrine, the steps 紺屋浜 洗い場跡, junctions 紺屋浜 and 縹浜 Hanada-hama. Web-searched 2026-11-24 (紺屋湯, 浜恵比須社, the three lane names): nothing real found. Hama-dōri, Ura-roji and the junction names are generic and not checked.
- Watayamachi's theme (2026-11-24): a textile wholesale grid after Osaka's Senba (docs/theme-notes.md). Landmarks: 綿屋町センター街 Watayamachi Centre, the 1970 wholesale centre in four halls (1号館–4号館) under the expressway, whose basement is the station's concourse (web-searched 2026-11-24: nothing real by that name); to come in stage 2, not yet named: the courtyard tenant building, the cotton merchant's house and kura, the weavers' shrine. The centre's stalls and boards carry trades, not names (`TRADES` in `src/stations/wata-centre.ts`).
- Watayamachi's streets (stage 2, 2026-11-25): 木綿大通 Momen-ōdōri (the avenue under the expressway), crossed by 茜筋 Akane-suji; 晒通 Sarashi-dōri (the bank street along Hyōtan-bori), 綛通 Kase-dōri; 紡錘筋 Tsumu-suji, 糸巻筋 Itomaki-suji, 筬筋 Osa-suji, 綿打筋 Watauchi-suji (cloth-making tools and steps: spindle, bobbin, reed, cotton beating); the bridge 晒橋 Sarashi-bashi; landmarks 綿屋町ビルヂング Watayamachi Building (1925 courtyard tenant building), 木綿問屋 枡綿商店 Masuwata Cotton Merchants (the last merchant's house and kura), 綿守神社 Watamori Shrine, 晒の雁木 Sarashi Landing Steps; 綿屋町交番. Web-searched 2026-11-24/25 with nothing real found: the seven new street names, 綿守神社, 枡綿商店, 綿屋町ビルヂング. Not checked (generic or built from the town's name): the junction names 綿屋町 / 綿屋町西 / 東 / 南 and 晒橋南詰, 晒橋, 晒の雁木, 綿屋町交番.
- Watayamachi's level crossings on the AR Main Line (2026-11-25, named after their streets, not web-checked): 晒通踏切 Sarashi-dōri Crossing, 木綿大通踏切 Momen-ōdōri Crossing, 綛通踏切 Kase-dōri Crossing.
- Watayamachi's expressway and waterfront (the owner's choices, 2026-11-25): the expressway over 木綿大通 is a spur into the city. East of the town it comes down on a ramp into the avenue's middle strip and ends, 180 m past the plot; west it crosses the railway and leaves the shore on piers, curving north-west over the bay towards the port. Between the railway and the bay there are no mid-rises: a quay along the water, low sheds and brick warehouses facing it (the `port` set), yards behind. Not named yet.
- Watayamachi's fill (stage 3, 2026-11-25): twenty wholesalers named from the town's own invented streets and places with a trade (`FIRMS` in `src/stations/watayamachi-street.ts`: 綿屋町繊維, 茜筋服地, 晒通タオル, 綛通ボタン, 糸巻産業 …), so not web-checked; 紬橋銀行 綿屋町支店 (the existing bank brand), 綿屋町郵便局, 調剤薬局 わたや with a clinic over it, 立ち食いそば わた庵, 純喫茶 かせ. The last three shop names are new and were not web-checked.
- Aobadai's streets (2026-11-22, a Kansai private-railway hillside suburb): 北丘通 Kitaoka-dōri, 楓筋 Kaede-suji, 樫筋 Kashi-suji, 上ノ段通 Kaminodan-dōri, 下ノ段通 Shimonodan-dōri, the footpath 石段坂 Ishidan-zaka, 葉月商店街 Hazuki Arcade, 丘守神社 Okamori Shrine; also 楓小路 Kaede-kōji, あおば公園 Aoba Park. The first eight were web-searched on 2026-11-22 with nothing real found. The shop names in `aobadai-street.ts` (`NAMES`), the parks 北丘児童遊園 and 楓ひろば, and the café 喫茶あおば were web-searched on 2026-11-22 (stage 3) with nothing real found, except 珈琲 丘の上 (close to a real 丘の上珈琲), renamed 珈琲 木洩坂.
- Hibarino's streets (2026-11-22, a Kansai suburban junction town; web-checked 2026-11-22: no real street, shrine, park, arcade, shop or building found by these names; nearest real place names are 雲雀丘 (Takarazuka) and ひばりヶ丘 (Nishitokyo), both different): 雲雀野通 Hibarino-dōri, 囀通 Saezuri-dōri, 穂波通 Honami-dōri, 野辺筋 Nobe-suji, 麦畑筋 Mugibatake-suji; ひばり野中央商店街 Hibarino Chūō Shōtengai, 囀八幡神社 Saezuri Hachiman, 揚雲雀の丘公園 Agehibari Hill Park, the 揚雲雀 clock, 雲雀野駅前交番, スーパー ことり屋 Kotoriya (supermarket); junctions 雲雀野西/東; shop and tenant names in hibarino-street.ts NAMES, ARC_SHOPS, TENANTS. 菜種筋 Natane-suji (2026-11-22, web-checked: no clash) is the cross street of Hibarino's west continuation, under the Nagisa viaduct's girder span.
- Road names (2026-11-20, not web-checked; north–south roads are 筋 -suji, east–west 通 -dōri, as in Osaka): 柳筋 Yanagi-suji is the main road at Hyōtanbori and Minamihorie. Its cross streets are 灯籠町通 Tōrōmachi-dōri and 瓢箪橋通 Hyōtanbashi-dōri at Hyōtanbori, and 白椿通 Shirotsubaki-dōri and 水面通 Minamo-dōri at Minamihorie. At Tsumugibashi the main road is 紬通 Tsumugi-dōri, crossed by 絹屋町筋 Kinuyamachi-suji and 紬堀筋 Tsumugibori-suji. Junction plates: 灯籠町, 瓢箪橋東, 南堀江西, 水面橋, 紬橋西, 紬橋東詰. The names are in `roadNames` and `junctions` in `specs.ts`.
- Umibe-shiyakusho-mae (2026-11-25, **not web-checked**): streets 海辺通 Umibe-dōri, 浜木綿筋 Hamayū-suji, 浜千鳥通 Hamachidori-dōri, 澪標筋 Miotsukushi-suji, 灯台筋 Tōdai-suji; junctions 市役所前, 市役所北, 海辺公園西/東; 川湊市役所 and 川湊市議会, 海辺公園 Umibe Park (帆のモニュメント, 海の広場, 野外ステージ, パークカフェ はまゆう), 海辺交番, 浜恵比寿神社 Hama-Ebisu Shrine, 浜千鳥児童遊園; tenants in `umibe-street.ts` (西海電信電話, 西海生命, 西海新報, 西海信用金庫, 西海海運, ホテル海辺 川湊, 食堂 浜千鳥, はまゆう薬局, 海辺印刷 and the 会館 of the professions).
- The link between Umibe-shiyakusho-mae and Kawaminato-kō (2026-11-25, `umibe-east.ts`, **not web-checked**): 水先筋 Mizusaki-suji, 艀筋 Hashike-suji, 纜筋 Tomozuna-suji, 蔵裏小路 Kuraura-kōji, 海辺緑地 Umibe Shore Green; junctions 税関前, 艀筋北, 綱町西, 綱町; 西海海上ビルヂング; the offices, shipping firms and shops in its `OFFICES`, `FIRMS` and `SHOPS` lists.
