// The network: single source of truth for lines and stations.
// Everything (map, sim, 3D stations, signage, HUD) reads from here.
// Adding a station = add a StationDef, add it to a line's `stops`/`railY`,
// and give it a spec in src/stations/specs.ts.

import type { LineDef, LineId, Operator, ServicePattern, StationDef, StationId } from './types';

export const OPERATOR: Operator = {
  nameEn: 'Kawaminato Metro',
  nameJa: '川湊メトロ',
  city: 'Kawaminato',
  cityJa: '川湊市',
};

const baseService: ServicePattern = {
  headwayS: 300,
  dwellS: 25,
  terminalArrivalDwellS: 30,
  minLayoverS: 40,
  reverseS: 40,
  maxSpeed: 19.5, // ~70 km/h
  sidingSpeed: 8, // ~30 km/h
  accel: 0.9, // ~3.2 km/h/s
  decel: 1.0, // ~3.6 km/h/s
  cars: 6,
};

// Bend geometry helpers (kept here so station positions stay readable).
const Y_BEND: [number, number] = [1870, -900];
const Y_NORTH_DIR: [number, number] = [-0.34202, -0.93969]; // 20° west of north
const N_BEND: [number, number] = [2400, 0];
const N_EAST_DIR: [number, number] = [0.90631, -0.42262]; // 25° north of east
// Akanesuji Line: the two streets it follows, and the north–south leg into the hills.
const A_SUJI_X = 1070; // Akane-suji, through Aizomechō
const A_ODORI_Z = -680; // Kita-Ōdōri avenue, through the hub
const A_HILL_X = 3000;
const A_RIDGE_Z = -2500; // the ridge road it follows east, out to Hoshimine
const along = (o: [number, number], d: [number, number], t: number): [number, number] => [
  o[0] + d[0] * t,
  o[1] + d[1] * t,
];
const pos = (p: [number, number]) => ({ x: p[0], y: p[1] });
// Shiokaze Line. At the hub it runs beside the Akanesuji Line, in the box built for it:
// 15.9 m south of A's centreline (A's hall wall 7.7 + 0.5 structure + half the 15.4 m box).
export const S_BESIDE_A = 15.9;
const S_ODORI_Z = A_ODORI_Z + S_BESIDE_A;
const DAIGAKU: [number, number] = along(N_BEND, N_EAST_DIR, 370);
// South of the hub it crosses the Nagisa Line at right angles at Daigaku-mae.
const S_SOUTH_DIR: [number, number] = [-N_EAST_DIR[1], N_EAST_DIR[0]]; // 25° east of south
const S_BEND: [number, number] = along(DAIGAKU, S_SOUTH_DIR, (S_ODORI_Z - DAIGAKU[1]) / S_SOUTH_DIR[1]);
// Past Hanamizuki it turns due east along the bay shore.
const S_TURN: [number, number] = along(DAIGAKU, S_SOUTH_DIR, 2550);

// Kikyō Line. It weaves between the older lines on tighter (250 m) curves, crossing each
// one at a station: N under Kawaminato-kō, A over Watayamachi, beside N through
// Tsumugibashi (crossing Y there), S under Tōmyōbori and N again under Hibarino.
// Beside N at Tsumugibashi: N's side-platform hall wall 8.58 + 0.5 structure + K's island
// hall wall 7.7 (the same rule that puts S 15.9 m from A at the hub).
export const K_BESIDE_N = 16.78;
const K_PORT_X = 320; // north–south through Kawaminato-kō
const K_COTTON_Z = 800; // east–west through Watayamachi
const TOMYOBORI: [number, number] = along(DAIGAKU, S_SOUTH_DIR, 750);
const HIBARINO: [number, number] = along(N_BEND, N_EAST_DIR, 1470);
const NNW: [number, number] = [-S_SOUTH_DIR[0], -S_SOUTH_DIR[1]]; // across N's east leg
// The corner between Tōmyōbori (heading along N_EAST_DIR) and Hibarino (heading NNW).
const K_EAST: [number, number] = (() => {
  // Solve TOMYOBORI + u·N_EAST = HIBARINO − t·NNW for u.
  const [ax, az] = TOMYOBORI, [bx, bz] = HIBARINO, [dx, dz] = N_EAST_DIR, [ex, ez] = S_SOUTH_DIR;
  const det = dx * -ez + ex * dz;
  const u = ((bx - ax) * -ez + ex * (bz - az)) / det;
  return along(TOMYOBORI, N_EAST_DIR, u);
})();
// North of Hibarino it turns to run parallel to N, 500 m north of it, into the east hills.
const K_HILLS: [number, number] = along(HIBARINO, NNW, 500);

export const LINES: LineDef[] = [
  {
    id: 'Y',
    nameEn: 'Yanagisuji Line',
    nameJa: '柳筋線',
    nameKana: 'やなぎすじせん',
    color: '#1f9d55',
    type: 'metro',
    stops: ['shin-midorigaoka', 'aobadai', 'midorizaka', 'kita-odori', 'tsumugibashi', 'hyotanbori', 'tsurumatsu', 'minamihorie', 'kaiseicho', 'nankodai'],
    railY: [-10, -11, -10, -13, -19, -14, -11, -12, -11, -10],
    platformType: 'island',
    trackOffset: 5.5,
    alignment: { vertices: [along(Y_BEND, Y_NORTH_DIR, 2520), Y_BEND, [1870, 3970]], radius: 400 },
    service: { ...baseService, headwayS: 240 },
  },
  {
    id: 'N',
    nameEn: 'Nagisa Line',
    nameJa: '渚線',
    nameKana: 'なぎさせん',
    color: '#1673c9',
    type: 'metro',
    stops: ['minato-center', 'umibe-shiyakusho-mae', 'kawaminato-ko', 'aizomecho', 'tsumugibashi', 'daigaku-mae', 'hibarino', 'asahino', 'takanodai', 'izumigaoka'],
    railY: [-16, -15, -11, -12, -11.5, -11, 6.5, 6.5, 6.5, 6.5],
    platformType: 'side',
    trackOffset: 1.9,
    alignment: { vertices: [[-1520, 0], N_BEND, along(N_BEND, N_EAST_DIR, 3990)], radius: 400 },
    service: { ...baseService, headwayS: 300 },
  },
  {
    // The newest, deepest line. South half under Akane-suji (north–south), then east
    // under Kita-Ōdōri avenue, then north into the hills: a stair-step diagonal that
    // crosses each older line once, at right angles, 7.5 m below it. West of Kamomehama it
    // runs out under the bay to the reclaimed islands; in the hills it turns east along
    // the ridge road to Hoshimine.
    id: 'A',
    nameEn: 'Akanesuji Line',
    nameJa: '茜筋線',
    nameKana: 'あかねすじせん',
    color: '#b7282e',
    type: 'metro',
    stops: ['shin-kamome', 'shiosai-koen', 'kamomehama', 'watayamachi', 'aizomecho', 'kita-odori', 'suzukakedori', 'tsukimizaka', 'yamabukidai', 'momijigaoka', 'seiryodai', 'hoshimine'],
    railY: [-14, -16, -15, -17, -19.5, -20.5, -18, -16, -14, -12, -11, -10],
    platformType: 'island',
    platformDoors: 'full',
    trackOffset: 5.5,
    alignment: { vertices: [[-1380, 1400], [A_SUJI_X, 1400], [A_SUJI_X, A_ODORI_Z], [A_HILL_X, A_ODORI_Z], [A_HILL_X, A_RIDGE_Z], [5820, A_RIDGE_Z]], radius: 400 },
    service: { ...baseService, headwayS: 300 },
  },
  {
    // Fourth line. West along the river's north bank from the bay, through the hub's B4 box
    // beside the Akanesuji Line, then south-east across the Nagisa Line to the canals,
    // and east along the bay shore past Hanamizuki.
    // Passes over the Akanesuji Line once, between Kurayashiki and Kita-Ōdōri.
    id: 'S',
    nameEn: 'Shiokaze Line',
    nameJa: '汐風線',
    nameKana: 'しおかぜせん',
    color: '#ee7b1a',
    type: 'metro',
    stops: ['shiomi', 'nishi-yunagi', 'yunagihama', 'kurayashiki', 'kita-odori', 'daigaku-mae', 'tomyobori', 'sakurazutsumi', 'hanamizuki', 'shin-sakuragawa', 'uminomori'],
    railY: [-10, -11, -10, -11, -20.5, -18.5, -14, -12, -13, -12, -10],
    platformType: 'island',
    platformDoors: 'full',
    trackOffset: 5.5,
    alignment: { vertices: [[-1380, S_ODORI_Z], S_BEND, S_TURN, along(S_TURN, [1, 0], 1500)], radius: 400 },
    service: { ...baseService, headwayS: 300 },
  },
  {
    // Fifth line: a crosstown line through the south of the city that meets every other
    // line once. Same generation as A and S: island platforms behind full-height doors.
    id: 'K',
    nameEn: 'Kikyō Line',
    nameJa: '桔梗線',
    nameKana: 'ききょうせん',
    color: '#7b4fa8',
    type: 'metro',
    stops: ['shinshio', 'kawaminato-ko', 'watayamachi', 'tsumugibashi', 'tomyobori', 'hibarino', 'higashigaoka', 'shin-hibarino'],
    railY: [-10, -18.5, -10, -11.5, -21.5, -12, -12, -10],
    platformType: 'island',
    platformDoors: 'full',
    trackOffset: 5.5,
    alignment: {
      vertices: [
        [-700, -400], [K_PORT_X, -400], [K_PORT_X, K_COTTON_Z], [1380, K_COTTON_Z],
        [1560, K_BESIDE_N], [2150, K_BESIDE_N], along(TOMYOBORI, N_EAST_DIR, -600),
        K_EAST, K_HILLS, along(K_HILLS, N_EAST_DIR, 1820),
      ],
      radius: 250,
    },
    service: { ...baseService, headwayS: 300 },
    // Route-map corners between stations: below Kawaminato-kō, east of Tōmyōbori, above Hibarino.
    diagramBends: { 1: [[420, 680]], 4: [[1020, 680]], 5: [[1370, 330]] },
  },
];

export const STATIONS: StationDef[] = [
  // ── Yanagisuji Line ──
  {
    id: 'shin-midorigaoka',
    nameJa: '新緑が丘',
    nameKana: 'しんみどりがおか',
    nameRomaji: 'Shin-Midorigaoka',
    numbers: { Y: 'Y-09' },
    position: pos(along(Y_BEND, Y_NORTH_DIR, 2100)),
    diagram: { x: 760, y: 30, label: 'right' },
    district: 'North new town',
    districtJa: '北部ニュータウン',
    platforms: { Y: [1, 2] },
    blurb: 'Hilltop new-town terminus: terraced apartment blocks and a park at the end of the line.',
  },
  {
    id: 'aobadai',
    nameJa: '青葉台',
    nameKana: 'あおばだい',
    nameRomaji: 'Aobadai',
    numbers: { Y: 'Y-10' },
    position: pos(along(Y_BEND, Y_NORTH_DIR, 1400)),
    diagram: { x: 760, y: 110, label: 'right' },
    district: 'North hills',
    districtJa: '北丘',
    platforms: { Y: [1, 2] },
    blurb: 'Leafy residential heights with a small shopping street by the station.',
  },
  {
    id: 'midorizaka',
    nameJa: '緑坂',
    nameKana: 'みどりざか',
    nameRomaji: 'Midorizaka',
    numbers: { Y: 'Y-11' },
    position: pos(along(Y_BEND, Y_NORTH_DIR, 680)),
    diagram: { x: 760, y: 190, label: 'right' },
    district: 'North hills',
    districtJa: '北丘',
    platforms: { Y: [1, 2] },
    blurb: 'Quiet residential station on the northern slope, with a park by the exit.',
  },
  {
    id: 'kita-odori',
    nameJa: '北大通',
    nameKana: 'きたおおどおり',
    nameRomaji: 'Kita-Ōdōri',
    numbers: { Y: 'Y-12', A: 'A-14', S: 'S-13' },
    position: { x: 1870, y: A_ODORI_Z },
    at: { S: { x: 1870, y: S_ODORI_Z } },
    diagram: { x: 760, y: 280, label: 'nw', badges: 'ne' },
    district: 'Kita (north hub)',
    districtJa: 'キタ',
    platforms: { Y: [1, 2], A: [3, 4], S: [5, 6] },
    blurb: 'The city’s central station. Metro hub beneath Kawaminato Station’s glass atrium.',
  },
  {
    id: 'tsumugibashi',
    nameJa: '紬橋',
    nameKana: 'つむぎばし',
    nameRomaji: 'Tsumugibashi',
    numbers: { Y: 'Y-13', N: 'N-13', K: 'K-14' },
    position: { x: 1870, y: 0 },
    at: { K: { x: 1870, y: K_BESIDE_N } },
    diagram: { x: 760, y: 480, label: 'ne', badges: 'nw' },
    district: 'Central',
    districtJa: '中央',
    platforms: { Y: [1, 2], N: [3, 4], K: [5, 6] },
    blurb: 'The central interchange. The Yanagisuji Line crosses under the Nagisa and Kikyō lines, which run side by side.',
  },
  {
    id: 'hyotanbori',
    nameJa: '瓢箪堀',
    nameKana: 'ひょうたんぼり',
    nameRomaji: 'Hyōtanbori',
    numbers: { Y: 'Y-14' },
    position: { x: 1870, y: 650 },
    diagram: { x: 760, y: 610, label: 'left' },
    district: 'Minami (south hub)',
    districtJa: 'ミナミ',
    platforms: { Y: [1, 2] },
    blurb: 'Neon, canals and late-night food.',
  },
  {
    id: 'tsurumatsu',
    nameJa: '鶴松',
    nameKana: 'つるまつ',
    nameRomaji: 'Tsurumatsu',
    numbers: { Y: 'Y-15' },
    position: { x: 1870, y: 1450 },
    diagram: { x: 760, y: 660, label: 'right' },
    district: 'Old town',
    districtJa: '下町',
    platforms: { Y: [1, 2] },
    blurb: 'Old-town station beside a covered shopping arcade.',
  },
  {
    id: 'minamihorie',
    nameJa: '南堀江',
    nameKana: 'みなみほりえ',
    nameRomaji: 'Minamihorie',
    numbers: { Y: 'Y-16' },
    position: { x: 1870, y: 2150 },
    diagram: { x: 760, y: 740, label: 'right' },
    district: 'Minami-Horie',
    districtJa: '南堀江',
    platforms: { Y: [1, 2] },
    blurb: 'Canal-side lanes of boutiques, cafés and furniture shops south of the old town.',
  },
  {
    id: 'kaiseicho',
    nameJa: '開成町',
    nameKana: 'かいせいちょう',
    nameRomaji: 'Kaiseichō',
    numbers: { Y: 'Y-17' },
    position: { x: 1870, y: 2850 },
    diagram: { x: 760, y: 820, label: 'right' },
    district: 'South residential',
    districtJa: '南部住宅地',
    platforms: { Y: [1, 2] },
    blurb: 'Meiji-era school town: a red-brick high school, a ginkgo avenue and quiet houses.',
  },
  {
    id: 'nankodai',
    nameJa: '南港台',
    nameKana: 'なんこうだい',
    nameRomaji: 'Nankōdai',
    numbers: { Y: 'Y-18' },
    position: { x: 1870, y: 3550 },
    diagram: { x: 760, y: 900, label: 'right' },
    district: 'South port',
    districtJa: '南港',
    platforms: { Y: [1, 2] },
    blurb: 'Southern terminus on the heights above the container port.',
  },
  // ── Nagisa Line ──
  {
    id: 'minato-center',
    nameJa: 'みなとセンター',
    nameKana: 'みなとせんたー',
    nameRomaji: 'Minato Center',
    numbers: { N: 'N-09' },
    position: { x: -1100, y: 0 },
    diagram: { x: 140, y: 480 },
    district: 'Bay new town',
    districtJa: 'ベイエリア新都心',
    platforms: { N: [1, 2] },
    blurb: 'Terminus in the bay-side business district on reclaimed land: glass towers and a waterfront promenade.',
  },
  {
    id: 'umibe-shiyakusho-mae',
    nameJa: '海辺市役所前',
    nameKana: 'うみべしやくしょまえ',
    nameRomaji: 'Umibe-shiyakusho-mae',
    numbers: { N: 'N-10' },
    position: { x: -380, y: 0 },
    diagram: { x: 280, y: 480 },
    district: 'Seaside civic district',
    districtJa: '海辺',
    platforms: { N: [1, 2] },
    blurb: 'Kawaminato City Hall, rebuilt on the waterfront, and its civic plaza.',
  },
  {
    id: 'kawaminato-ko',
    nameJa: '川湊港',
    nameKana: 'かわみなとこう',
    nameRomaji: 'Kawaminato-kō',
    numbers: { N: 'N-11', K: 'K-12' },
    position: { x: 320, y: 0 },
    diagram: { x: 420, y: 480, label: 'se' },
    district: 'Bay area',
    districtJa: 'ベイエリア',
    platforms: { N: [1, 2], K: [3, 4] },
    blurb: 'Redeveloped port: brick warehouses and the ferry pier. Nagisa and Kikyō lines cross here.',
  },
  {
    id: 'aizomecho',
    nameJa: '藍染町',
    nameKana: 'あいぞめちょう',
    nameRomaji: 'Aizomechō',
    numbers: { N: 'N-12', A: 'A-13' },
    position: { x: A_SUJI_X, y: 0 },
    diagram: { x: 560, y: 480, label: 'se', badges: 'nw' },
    district: 'Merchant quarter',
    districtJa: '問屋街',
    platforms: { N: [1, 2], A: [3, 4] },
    blurb: 'The old indigo dyers’ quarter. Nagisa and Akanesuji lines cross here.',
  },
  {
    id: 'daigaku-mae',
    nameJa: '川湊大学前',
    nameKana: 'かわみなとだいがくまえ',
    nameRomaji: 'Kawaminato-daigaku-mae',
    numbers: { N: 'N-14', S: 'S-14' },
    position: pos(DAIGAKU),
    diagram: { x: 960, y: 480, label: 'se', badges: 'ne' },
    district: 'University',
    districtJa: '文教地区',
    platforms: { N: [1, 2], S: [3, 4] },
    blurb: 'Brick-lined station at the gates of Kawaminato University. Nagisa and Shiokaze lines cross here.',
  },
  {
    id: 'hibarino',
    nameJa: '雲雀野',
    nameKana: 'ひばりの',
    nameRomaji: 'Hibarino',
    numbers: { N: 'N-15', K: 'K-16' },
    position: pos(along(N_BEND, N_EAST_DIR, 1470)),
    diagram: { x: 1220, y: 480, label: 'se', badges: 'nw' },
    district: 'East hills',
    districtJa: '東丘',
    platforms: { N: [1, 2], K: [3, 4] },
    blurb: 'Suburban station where the Nagisa Line comes out onto its viaduct; the Kikyō Line crosses underneath.',
  },
  {
    id: 'asahino',
    nameJa: '旭野',
    nameKana: 'あさひの',
    nameRomaji: 'Asahino',
    numbers: { N: 'N-16' },
    position: pos(along(N_BEND, N_EAST_DIR, 2170)),
    diagram: { x: 1340, y: 480 },
    district: 'East suburbs',
    districtJa: '東郊外',
    platforms: { N: [1, 2] },
    blurb: 'Elevated station among sunrise-facing suburbs, with bicycle parking under the tracks.',
  },
  {
    id: 'takanodai',
    nameJa: '高野台',
    nameKana: 'たかのだい',
    nameRomaji: 'Takanodai',
    numbers: { N: 'N-17' },
    position: pos(along(N_BEND, N_EAST_DIR, 2870)),
    diagram: { x: 1460, y: 480 },
    district: 'East hills',
    districtJa: '東丘',
    platforms: { N: [1, 2] },
    blurb: 'Hilltop housing estate looking down on the viaduct.',
  },
  {
    id: 'izumigaoka',
    nameJa: '泉ヶ丘',
    nameKana: 'いずみがおか',
    nameRomaji: 'Izumigaoka',
    numbers: { N: 'N-18' },
    position: pos(along(N_BEND, N_EAST_DIR, 3570)),
    diagram: { x: 1580, y: 480 },
    district: 'East new town',
    districtJa: '東部ニュータウン',
    platforms: { N: [1, 2] },
    blurb: 'Elevated terminus of the eastern new town, named for the spring at its centre.',
  },
  // ── Akanesuji Line ──
  {
    id: 'shin-kamome',
    nameJa: '新鴎',
    nameKana: 'しんかもめ',
    nameRomaji: 'Shin-Kamome',
    numbers: { A: 'A-09' },
    position: { x: -960, y: 1400 },
    diagram: { x: 160, y: 800 },
    district: 'South bay (new island)',
    districtJa: '南ベイ',
    platforms: { A: [1, 2] },
    blurb: 'Terminus on the newest reclaimed island, its apartment towers looking back at the city.',
  },
  {
    id: 'shiosai-koen',
    nameJa: '潮騒公園',
    nameKana: 'しおさいこうえん',
    nameRomaji: 'Shiosai-kōen',
    numbers: { A: 'A-10' },
    position: { x: -260, y: 1400 },
    diagram: { x: 300, y: 800 },
    district: 'South bay',
    districtJa: '南ベイ',
    platforms: { A: [1, 2] },
    blurb: 'Seaside park where you can hear the waves from the station exits.',
  },
  {
    id: 'kamomehama',
    nameJa: '鴎浜',
    nameKana: 'かもめはま',
    nameRomaji: 'Kamomehama',
    numbers: { A: 'A-11' },
    position: { x: 440, y: 1400 },
    diagram: { x: 440, y: 800, badges: 'nw' },
    district: 'South bay',
    districtJa: '南ベイ',
    platforms: { A: [1, 2] },
    blurb: 'Stadium station on reclaimed land, beside Kawaminato Dome.',
  },
  {
    id: 'watayamachi',
    nameJa: '綿屋町',
    nameKana: 'わたやまち',
    nameRomaji: 'Watayamachi',
    numbers: { A: 'A-12', K: 'K-13' },
    position: { x: A_SUJI_X, y: 800 },
    diagram: { x: 560, y: 680, label: 'se', badges: 'nw' },
    district: 'Merchant quarter (south)',
    districtJa: '問屋街',
    platforms: { A: [1, 2], K: [3, 4] },
    blurb: 'The cotton wholesalers’ street, all noren and shophouses. Kikyō and Akanesuji lines cross here.',
  },
  {
    id: 'suzukakedori',
    nameJa: '鈴懸通',
    nameKana: 'すずかけどおり',
    nameRomaji: 'Suzukakedōri',
    numbers: { A: 'A-15' },
    position: { x: 2450, y: A_ODORI_Z },
    diagram: { x: 900, y: 280, label: 'se', badges: 'sw' },
    district: 'Kita (east)',
    districtJa: 'キタ',
    platforms: { A: [1, 2] },
    blurb: 'Plane-tree avenue through the civic and theatre district.',
  },
  {
    id: 'tsukimizaka',
    nameJa: '月見坂',
    nameKana: 'つきみざか',
    nameRomaji: 'Tsukimizaka',
    numbers: { A: 'A-16' },
    position: { x: A_HILL_X, y: -1300 },
    diagram: { x: 990, y: 190, label: 'se', badges: 'nw' },
    district: 'North-east slope',
    districtJa: '北東丘',
    platforms: { A: [1, 2] },
    blurb: 'Quiet hillside neighbourhood named for its moon-viewing slope.',
  },
  {
    id: 'yamabukidai',
    nameJa: '山吹台',
    nameKana: 'やまぶきだい',
    nameRomaji: 'Yamabukidai',
    numbers: { A: 'A-17' },
    position: { x: A_HILL_X, y: -2000 },
    diagram: { x: 1080, y: 100, label: 'se' },
    district: 'North-east hills',
    districtJa: '北東丘',
    platforms: { A: [1, 2] },
    blurb: 'New-town station with a bus rotary, in the north-eastern hills.',
  },
  {
    id: 'momijigaoka',
    nameJa: '紅葉ヶ丘',
    nameKana: 'もみじがおか',
    nameRomaji: 'Momijigaoka',
    numbers: { A: 'A-18' },
    position: { x: 3800, y: A_RIDGE_Z },
    diagram: { x: 1220, y: 100 },
    district: 'North-east hills',
    districtJa: '北東丘',
    platforms: { A: [1, 2] },
    blurb: 'Maple-covered hillside of older houses, scarlet every November.',
  },
  {
    id: 'seiryodai',
    nameJa: '清涼台',
    nameKana: 'せいりょうだい',
    nameRomaji: 'Seiryōdai',
    numbers: { A: 'A-19' },
    position: { x: 4600, y: A_RIDGE_Z },
    diagram: { x: 1360, y: 100 },
    district: 'North-east plateau',
    districtJa: '北東台地',
    platforms: { A: [1, 2] },
    blurb: 'Cool upland estate of apartment blocks around a research campus.',
  },
  {
    id: 'hoshimine',
    nameJa: '星峰',
    nameKana: 'ほしみね',
    nameRomaji: 'Hoshimine',
    numbers: { A: 'A-20' },
    position: { x: 5400, y: A_RIDGE_Z },
    diagram: { x: 1500, y: 100 },
    district: 'North-east ridge',
    districtJa: '北東尾根',
    platforms: { A: [1, 2] },
    blurb: 'Ridge-top terminus below the city observatory.',
  },
  // ── Shiokaze Line ──
  {
    id: 'shiomi',
    nameJa: '潮見',
    nameKana: 'しおみ',
    nameRomaji: 'Shiomi',
    numbers: { S: 'S-09' },
    position: { x: -960, y: S_ODORI_Z },
    diagram: { x: 180, y: 280 },
    district: 'North-west waterfront',
    districtJa: '北西ウォーターフロント',
    platforms: { S: [1, 2] },
    blurb: 'Terminus at the tip of the river-mouth landfill, facing the open bay.',
  },
  {
    id: 'nishi-yunagi',
    nameJa: '西夕凪',
    nameKana: 'にしゆうなぎ',
    nameRomaji: 'Nishi-Yūnagi',
    numbers: { S: 'S-10' },
    position: { x: -260, y: S_ODORI_Z },
    diagram: { x: 320, y: 280 },
    district: 'North-west waterfront',
    districtJa: '北西ウォーターフロント',
    platforms: { S: [1, 2] },
    blurb: 'Quiet apartments along the river mouth, west of Yūnagihama.',
  },
  {
    id: 'yunagihama',
    nameJa: '夕凪浜',
    nameKana: 'ゆうなぎはま',
    nameRomaji: 'Yūnagihama',
    numbers: { S: 'S-11' },
    position: { x: 420, y: S_ODORI_Z },
    diagram: { x: 460, y: 280 },
    district: 'North-west waterfront',
    districtJa: '北西ウォーターフロント',
    platforms: { S: [1, 2] },
    blurb: 'Waterfront station at the river mouth, with a sunset promenade over the bay.',
  },
  {
    id: 'kurayashiki',
    nameJa: '蔵屋敷',
    nameKana: 'くらやしき',
    nameRomaji: 'Kurayashiki',
    numbers: { S: 'S-12' },
    position: { x: 1100, y: S_ODORI_Z },
    diagram: { x: 600, y: 280 },
    district: 'Riverside',
    districtJa: '川沿い',
    platforms: { S: [1, 2] },
    blurb: 'Old rice-storehouse quarter on the river’s north bank, its white godowns now cafés.',
  },
  {
    id: 'tomyobori',
    nameJa: '灯明堀',
    nameKana: 'とうみょうぼり',
    nameRomaji: 'Tōmyōbori',
    numbers: { S: 'S-15', K: 'K-15' },
    position: pos(along(DAIGAKU, S_SOUTH_DIR, 750)),
    diagram: { x: 960, y: 680, label: 'se', badges: 'sw' },
    district: 'South-east canals',
    districtJa: '南東運河',
    platforms: { S: [1, 2], K: [3, 4] },
    blurb: 'Lantern-lit canal quarter of small temples and teahouses. Shiokaze and Kikyō lines cross here.',
  },
  {
    id: 'sakurazutsumi',
    nameJa: '桜堤',
    nameKana: 'さくらづつみ',
    nameRomaji: 'Sakurazutsumi',
    numbers: { S: 'S-16' },
    position: pos(along(DAIGAKU, S_SOUTH_DIR, 1450)),
    diagram: { x: 960, y: 770, label: 'right' },
    district: 'South-east',
    districtJa: '南東',
    platforms: { S: [1, 2] },
    blurb: 'Station beside a cherry-lined river embankment and park.',
  },
  {
    id: 'hanamizuki',
    nameJa: '花みずき',
    nameKana: 'はなみずき',
    nameRomaji: 'Hanamizuki',
    numbers: { S: 'S-17' },
    position: pos(along(DAIGAKU, S_SOUTH_DIR, 2150)),
    diagram: { x: 960, y: 850, label: 'left', badges: 'sw' },
    district: 'South-east',
    districtJa: '南東',
    platforms: { S: [1, 2] },
    blurb: 'Residential avenue lined with dogwood, white and pink in spring.',
  },
  {
    id: 'shin-sakuragawa',
    nameJa: '新桜川',
    nameKana: 'しんさくらがわ',
    nameRomaji: 'Shin-Sakuragawa',
    numbers: { S: 'S-18' },
    position: pos(along(S_TURN, [1, 0], 400)),
    diagram: { x: 1100, y: 850 },
    district: 'South-east canals',
    districtJa: '南東運河',
    platforms: { S: [1, 2] },
    blurb: 'Newer canal quarter along the cherry-lined Sakura-gawa.',
  },
  {
    id: 'uminomori',
    nameJa: '海の森',
    nameKana: 'うみのもり',
    nameRomaji: 'Uminomori',
    numbers: { S: 'S-19' },
    position: pos(along(S_TURN, [1, 0], 1100)),
    diagram: { x: 1240, y: 850 },
    district: 'Bay forest',
    districtJa: '海の森',
    platforms: { S: [1, 2] },
    blurb: 'Terminus beside the forest park planted on the old landfill.',
  },
  // ── Kikyō Line ──
  {
    id: 'shinshio',
    nameJa: '新潮',
    nameKana: 'しんしお',
    nameRomaji: 'Shinshio',
    numbers: { K: 'K-11' },
    position: { x: -350, y: -400 },
    diagram: { x: 420, y: 380, label: 'right' },
    district: 'Bay front',
    districtJa: 'ベイフロント',
    platforms: { K: [1, 2] },
    blurb: 'Terminus on the new bay front between the river mouth and the port: ferry offices, a fish market hall and new flats.',
  },
  {
    id: 'higashigaoka',
    nameJa: '東ヶ丘',
    nameKana: 'ひがしがおか',
    nameRomaji: 'Higashigaoka',
    numbers: { K: 'K-17' },
    position: pos(along(K_HILLS, N_EAST_DIR, 700)),
    diagram: { x: 1440, y: 330 },
    district: 'East hills',
    districtJa: '東丘',
    platforms: { K: [1, 2] },
    blurb: 'Hillside streets of houses and a shrine wood, above the Nagisa Line valley.',
  },
  {
    id: 'shin-hibarino',
    nameJa: '新雲雀野',
    nameKana: 'しんひばりの',
    nameRomaji: 'Shin-Hibarino',
    numbers: { K: 'K-18' },
    position: pos(along(K_HILLS, N_EAST_DIR, 1400)),
    diagram: { x: 1570, y: 330 },
    district: 'East new town',
    districtJa: '東部ニュータウン',
    platforms: { K: [1, 2] },
    blurb: 'Terminus of the newest eastern estate, laid out around a skylark meadow park.',
  },
];

export const lineById = (id: LineId): LineDef => {
  const l = LINES.find((x) => x.id === id);
  if (!l) throw new Error(`unknown line ${id}`);
  return l;
};
export const stationById = (id: StationId): StationDef => {
  const s = STATIONS.find((x) => x.id === id);
  if (!s) throw new Error(`unknown station ${id}`);
  return s;
};
export const linesAt = (id: StationId): LineDef[] => LINES.filter((l) => l.stops.includes(id));

/** Route-map polyline for segment i of a line (stops[i] → stops[i + 1]), including any corners. */
export function diagramSegment(line: LineDef, i: number): [number, number][] {
  const a = stationById(line.stops[i]).diagram, b = stationById(line.stops[i + 1]).diagram;
  return [[a.x, a.y], ...(line.diagramBends?.[i] ?? []), [b.x, b.y]];
}

/** Route-map polyline for a whole line. */
export const diagramPath = (line: LineDef): [number, number][] =>
  line.stops.slice(0, -1).flatMap((_, i) => diagramSegment(line, i).slice(i ? 1 : 0));

/** Point a fraction f (may run slightly past 0..1) along a polyline, and the direction there. */
export function alongPolyline(pts: [number, number][], f: number): { x: number; y: number; dx: number; dy: number } {
  const lens = pts.slice(1).map((p, k) => Math.hypot(p[0] - pts[k][0], p[1] - pts[k][1]));
  const total = lens.reduce((s, l) => s + l, 0);
  let d = f * total, k = 0;
  while (k < lens.length - 1 && d > lens[k]) d -= lens[k++];
  const [ax, ay] = pts[k], [bx, by] = pts[k + 1];
  const dx = (bx - ax) / lens[k], dy = (by - ay) / lens[k];
  return { x: ax + dx * d, y: ay + dy * d, dx, dy };
}

/** Terminus a train heading `dir` on `line` is bound for. */
export const terminusOf = (line: LineDef, dir: 'down' | 'up'): StationDef =>
  stationById(dir === 'down' ? line.stops[line.stops.length - 1] : line.stops[0]);

/** Default spawn when pressing Start. */
export const HOME_STATION: StationId = 'tsumugibashi';
