# Model library, by theme

Every building set in `assets/buildings/<set>.blend` (built by `tools/blender/build_<set>.py`), grouped by the theme it suits. **Check this before making any new model** for a station; add a line when a set is made. Files stay where they are (decided 2026-11-24).

Written from each script's head comment, not from looking at the models: open the script for the pieces and sizes.

**Rule for new sets:** regular buildings are generic. Name and build them by theme (a shopping-street set, a harbour-warehouse set), with no station name and no station-specific signs in the model. Only landmarks are station-specific.

## Generic sets (use anywhere the theme fits)

| Set | Theme | What it holds |
|---|---|---|
| `machi` | Small central streets | Low mixed buildings, two to five floors |
| `shophouse` | Shōtengai | Shop-houses (four variants) and the arcade roof |
| `zakkyo` | Nightlife, station fronts | Narrow multi-tenant blocks with stacked signs (three variants) |
| `office` | Business street | Plain 8 to 12 floor mid-rises (three variants) |
| `manshon` | Residential | Apartment blocks, balconies to the street (three variants) |
| `tower` | Business centre | 130 to 185 m glass towers on a podium (three variants) |
| `wholesale` | Textile or other wholesale quarter | Wholesalers' buildings on 34 m deep lots, 9 to 27 m wide, in the styles of Aizomechō's fronts (tiled wholesaler blocks, brick offices, ribbon-window trading offices, finned textile halls, a signboard shop-house): eight main-street variants of 26 to 31 m (`m*`), nine back-street ones of 11 to 23 m (`b*`). Each has a second front down both sides (entrance, shutter, boards), so any of them can stand on a corner |
| `civic` | Government and office district (官庁街) | Joint government offices, finned bureau offices, a telephone exchange with its tower, a stone bank, glass and ribbon-window offices, a business hotel, a low 1960s survivor: eight avenue variants of 18 to 30 m at 27 to 31 m high (`m*`, 30 m deep), six back-street ones of 11 to 24 m (`b*`, 26 m deep). Dressed on all four sides |
| `places` | Any small street | Pocket park, neighbourhood shrine, vending corner and the like |
| `konbini` | Any | Fittings of a walk-in convenience store |
| `road` | Any | Signals, sign furniture, vehicles, street furniture |
| `trees` | Any | Twelve kinds of street, park and shrine trees |

## Station sets, by theme (reuse the regular buildings; landmarks stay at their station)

| Theme | Set | Station | What it holds |
|---|---|---|---|
| Old merchant and craft quarter | `aizome`, `aizomefront` | Aizomechō | Dyers' quarter pieces; fronts of its two big streets |
| | `tsuna` | Kawaminato-kō | Old shipping town shop houses |
| | `tsuru` | Tsurumatsu | Old town covered shopping street |
| | `hibari`, `hibarifront` | Hibarino | Covered shopping street; main-road fronts |
| Prewar business district | `tsumugifront`, `tsumugikit`, `tsumugi`, `exchange` | Tsumugibashi | Senba / Kitahama-style fronts and street pieces; Silk Exchange and rotunda (landmarks) |
| Textile wholesale grid | `watacentre` | Watayamachi | Wholesale centre halls under an expressway (landmark), the expressway's deck span and portal pier |
| | `wata` | Watayamachi | Landmarks: courtyard tenant building, cotton merchant's house and kura, weavers' shrine precinct, canal landing steps |
| Terminal and big-city centre | `city`, `kitacity`, `kitafront`, `gate`, `mioya`, `plaza`, `tokei` | Kita-Ōdōri, Kawaminato Station | City blocks and towers, avenue fronts, Gate Towers, terminal department store, plaza buildings |
| | `kitaarcade` | Kita-Ōdōri | Arcade behind the viaduct |
| Civic axis | `umibe` | Umibe-shiyakusho-mae | Landmarks: the city hall (tower with a walk-in lobby, assembly wing, forecourt pieces), and the park's sail monument, open-air stage, flower-bed crest and rest house |
| Harbour and port | `minato`, `minatofront`, `urafront` | Kawaminato-kō | Red-brick port pieces; harbour boulevard fronts |
| | `port`, `konya` | Kon'yahama | East quay brick sheds; shore pieces |
| | `hatoba` | Kawaminato-kō | Landmarks of the diagonal avenue |
| Foreign quarter, Chinatown | `kamome`, `tosen` | Kawaminato-kō | Bluff foreign quarter; Chinatown |
| Canal side, nightlife | `hyotan`, `canalfront`, `yokocho` | Hyōtanbori | Set pieces; narrow bar and restaurant blocks; lane of tiny bars |
| Canal side, boutiques | `horie`, `boutique` | Minamihorie | Set pieces; converted low buildings as boutiques |
| University town | `daigaku`, `daigakufront` | Daigaku-mae | Brick campus side; town side of the street |
| School town (Meiji) | `kaisei` | Kaiseichō | Street-level set pieces |
| Hill suburb, new town | `aoba`, `aobafront` | Aobadai | Exit house and quarter; station street and plaza fronts |
| | `midori` | Midorizaka | Park, station plaza, shopping street |

## Not street buildings

`hub`, `miochika`, `ring`, `viaduct`, `kawaeki` (Kita-Ōdōri hub props, underground town, footbridge ring, AR viaduct, Kawaminato Station building), `station`, `shops` (fittings inside stations).
