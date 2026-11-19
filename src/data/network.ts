// The network: single source of truth for lines and stations.
// Everything (map, sim, 3D stations, signage, HUD) reads from here.
// Adding a station = add a StationDef, add it to a line's `stops`/`railY`,
// and give it a spec in src/stations/specs.ts.

import type { LineDef, LineId, Operator, Place, ServicePattern, StationDef, StationId } from './types';

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
const A_VALLEY_X = 7000; // beyond the ridge: the valley road it turns north along, to Shiondai
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

// Sumire Line. From Seiran in the north-east hills it runs WSW through Midorizaka (under Y),
// turns south and then east, diving under S and A west of the hub, and rises into its own
// hall 15.9 m south of S's (same rule as S beside A). East of the hub its curve is concentric
// with S's, 15.9 m inside it (radius 400 − 15.9), so the two never cross; it then eases onto
// S's track before Daigaku-mae and shares it to Hanamizuki, carrying straight on where S turns.
export const M_BESIDE_S = 15.9;
const M_HUB_Z = S_ODORI_Z + M_BESIDE_S;
const M_ENE: [number, number] = [-Y_NORTH_DIR[1], Y_NORTH_DIR[0]]; // across Y's north leg
const MIDORI: [number, number] = along(Y_BEND, Y_NORTH_DIR, 680);
const SEIRAN: [number, number] = along(MIDORI, M_ENE, 800);
const M_WEST: [number, number] = along(MIDORI, M_ENE, -680); // turns south here
const S_INSIDE: [number, number] = [-S_SOUTH_DIR[1], S_SOUTH_DIR[0]]; // inside S's corner
const M_INNER = (t: number) => along([S_BEND[0] + S_INSIDE[0] * M_BESIDE_S, S_BEND[1] + S_INSIDE[1] * M_BESIDE_S], S_SOUTH_DIR, t);
const M_CORNER = M_INNER((M_HUB_Z - M_INNER(0)[1]) / S_SOUTH_DIR[1]);
const M_EAST_TURN: [number, number] = along(DAIGAKU, S_SOUTH_DIR, 3300);
// Past Harunodai the Sumire Line bends 20° south of east onto the spring-flower heights.
const M_SE_TURN: [number, number] = along(M_EAST_TURN, [1, 0], 1350);
const M_ESE: [number, number] = [0.93969, 0.34202];

// Ichō Line. Deepest line yet: east from Nankōdai under the southern heights, then due north
// under Harunodai and Uminomori (crossing M and S at right angles), under the Nagisa viaduct,
// and turning NNW to end across the Kikyō Line at Shin-Hibarino.
const G_X = S_TURN[0] + 1100; // the north–south leg, through Uminomori and Harunodai
const G_SOUTH_Z = 3550; // the east–west leg, through Nankōdai
const SHIN_HIBARINO: [number, number] = along(K_HILLS, N_EAST_DIR, 1400);
// Its platforms at Shin-Hibarino lie 100 m west of the Kikyō Line's, under that line's track, so
// the transfer is a long tunnel (stations/transfer.ts).
const G_SHIN_HIBARINO: [number, number] = along(SHIN_HIBARINO, N_EAST_DIR, -100);
const G_NORTH_TURN: [number, number] = along(G_SHIN_HIBARINO, S_SOUTH_DIR, (G_X - G_SHIN_HIBARINO[0]) / S_SOUTH_DIR[0]);

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
    // runs out under the bay to the reclaimed islands, rising onto a viaduct at Shin-Kamome; in the hills it turns east along
    // the ridge road to Hoshimine. The 2008 extension leaves the tunnel on the far side of the
    // ridge, in an open cutting at Kasumidani, then climbs onto a viaduct and turns north to
    // the new town at Shiondai.
    id: 'A',
    nameEn: 'Akanesuji Line',
    nameJa: '茜筋線',
    nameKana: 'あかねすじせん',
    color: '#b7282e',
    type: 'metro',
    stops: ['shin-kamome', 'shiosai-koen', 'kamomehama', 'watayamachi', 'aizomecho', 'kita-odori', 'suzukakedori', 'tsukimizaka', 'yamabukidai', 'momijigaoka', 'seiryodai', 'hoshimine', 'kasumidani', 'shiondai'],
    railY: [5.5, -10, -15, -17, -19.5, -20.5, -18, -22, -14, -12, -11, -10, -5.2, 7.5],
    platformType: 'island',
    // The shallow park station and the old new-town terminus were built with side platforms.
    sideAt: ['shiosai-koen', 'yamabukidai'],
    platformDoors: 'full',
    trackOffset: 5.5,
    alignment: { vertices: [[-1380, 1400], [A_SUJI_X, 1400], [A_SUJI_X, A_ODORI_Z], [A_HILL_X, A_ODORI_Z], [A_HILL_X, A_RIDGE_Z], [A_VALLEY_X, A_RIDGE_Z], [A_VALLEY_X, -3700]], radius: 400 },
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
    stops: ['shiomi', 'nishi-yunagi', 'yunagihama', 'kurayashiki', 'kita-odori', 'daigaku-mae', 'tomyobori', 'sakurazutsumi', 'hanamizuki', 'shin-sakuragawa', 'uminomori', 'asanagi', 'shirasunahama'],
    railY: [-10, -11, -10, -11, -20.5, -18.5, -14, -12, -13, -12, -10, -5.2, 5.5],
    platformType: 'island',
    // Side platforms at Uminomori, where the Ichō Line's atrium opens beside them (stations/atrium.ts).
    sideAt: ['uminomori'],
    platformDoors: 'full',
    trackOffset: 5.5,
    // East of Uminomori it rises into a cutting at Asanagi and onto a viaduct by the beach.
    alignment: { vertices: [[-1380, S_ODORI_Z], S_BEND, S_TURN, along(S_TURN, [1, 0], 3200)], radius: 400 },
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
    railY: [-10, -24, -10, -11.5, -21.5, -12, -12, -10],
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
  {
    // Sixth line: through-runs on the Shiokaze Line's track from just east of the hub to
    // Hanamizuki, as an express that passes Tōmyōbori and Sakurazutsumi without stopping.
    id: 'M',
    nameEn: 'Sumire Line',
    nameJa: 'すみれ線',
    nameKana: 'すみれせん',
    color: '#c2368f',
    type: 'metro',
    stops: ['seiran', 'midorizaka', 'kita-odori', 'daigaku-mae', 'hanamizuki', 'minami-sakuragawa', 'harunodai', 'nanohanadai', 'rengeno'],
    railY: [-12, -17.5, -20.5, -18.5, -13, -12, -10, 6.5, 7.5],
    // Past Harunodai it climbs out onto the heights: side platforms at the hillside station.
    sideAt: ['nanohanadai'],
    platformType: 'island',
    platformDoors: 'full',
    trackOffset: 5.5,
    alignment: {
      vertices: [
        along(SEIRAN, M_ENE, 420), M_WEST, [M_WEST[0], M_HUB_Z], M_CORNER,
        M_INNER(270), along(S_BEND, S_SOUTH_DIR, 470), M_EAST_TURN, M_SE_TURN, along(M_SE_TURN, M_ESE, 1850),
      ],
      radius: 400 - M_BESIDE_S,
    },
    // Every other gap between Shiokaze trains (which run every 5 minutes).
    service: { ...baseService, headwayS: 600 },
    shares: { line: 'S', from: 'daigaku-mae', to: 'hanamizuki' },
    passes: ['tomyobori', 'sakurazutsumi'],
    // Under S and A where it crosses them west of the hub (at about (1325, −653)), 7.5 m below A.
    profile: [{ at: [1325, -653], y: -27.5 }],
    // Drawn beside Y into the hub, beside S out of it, and as a stripe inside S where it shares its track.
    diagramOffset: { 1: -14, 2: -14 },
    diagramShared: [3],
  },
  {
    // Seventh line, the deepest: a southern and eastern orbital that ties four line ends
    // together (Y at Nankōdai, M at Harunodai, S at Uminomori, K at Shin-Hibarino).
    id: 'G',
    nameEn: 'Ichō Line',
    nameJa: '銀杏線',
    nameKana: 'いちょうせん',
    color: '#c99a06',
    type: 'metro',
    stops: ['nankodai', 'ikarimachi', 'todai-dori', 'harunodai', 'uminomori', 'hotarugawa', 'narukozaka', 'shin-hibarino'],
    railY: [-30, -32, -30, -26, -26, -28, -28, -26],
    // Hotarugawa's tracks run one above the other (stations/stacked.ts).
    stackAt: ['hotarugawa'],
    platformType: 'island',
    platformDoors: 'full',
    // Tracks set wide: a broad island, which Ikarimachi splits into twin tubes and a central hall.
    trackOffset: 7,
    alignment: {
      vertices: [[1400, G_SOUTH_Z], [G_X, G_SOUTH_Z], G_NORTH_TURN, along(G_SHIN_HIBARINO, NNW, 420)],
      radius: 400,
    },
    service: { ...baseService, headwayS: 300 },
    // Route-map corners: below Nankōdai, before the climb to Harunodai, above Uminomori, below Shin-Hibarino.
    diagramBends: { 0: [[760, 1010]], 2: [[1160, 1010]], 4: [[1240, 790]], 6: [[1370, 530]] },
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
    diagram: { x: 760, y: 110, label: 'left' },
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
    numbers: { Y: 'Y-11', M: 'M-12' },
    position: pos(along(Y_BEND, Y_NORTH_DIR, 680)),
    diagram: { x: 760, y: 190, label: 'left', badges: 'nw' },
    district: 'North hills',
    districtJa: '北丘',
    platforms: { Y: [1, 2], M: [3, 4] },
    blurb: 'Quiet residential station on the northern slope, with a park by the exit. The Sumire Line crosses under the Yanagisuji Line here.',
  },
  {
    id: 'kita-odori',
    nameJa: '北大通',
    nameKana: 'きたおおどおり',
    nameRomaji: 'Kita-Ōdōri',
    numbers: { Y: 'Y-12', A: 'A-06', S: 'S-13', M: 'M-13' },
    position: { x: 1870, y: A_ODORI_Z },
    at: { S: { x: 1870, y: S_ODORI_Z }, M: { x: 1870, y: M_HUB_Z } },
    diagram: { x: 760, y: 280, label: 'nw', badges: 'ne' },
    district: 'Kita (north hub)',
    districtJa: 'キタ',
    platforms: { Y: [1, 2], A: [3, 4], S: [5, 6], M: [7, 8] },
    blurb: 'The city’s central station. Metro hub beneath Kawaminato Station’s glass atrium.',
  },
  {
    id: 'tsumugibashi',
    nameJa: '紬橋',
    nameKana: 'つむぎばし',
    nameRomaji: 'Tsumugibashi',
    numbers: { Y: 'Y-13', N: 'N-05', K: 'K-14' },
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
    numbers: { Y: 'Y-18', G: 'G-11' },
    position: { x: 1870, y: G_SOUTH_Z },
    diagram: { x: 760, y: 900, label: 'right' },
    district: 'South port',
    districtJa: '南港',
    platforms: { Y: [1, 2], G: [3, 4] },
    blurb: 'Southern terminus of the Yanagisuji Line on the heights above the container port; the Ichō Line starts deep below.',
  },
  // ── Nagisa Line ──
  {
    id: 'minato-center',
    nameJa: 'みなとセンター',
    nameKana: 'みなとせんたー',
    nameRomaji: 'Minato Center',
    numbers: { N: 'N-01' },
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
    numbers: { N: 'N-02' },
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
    numbers: { N: 'N-03', K: 'K-12' },
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
    numbers: { N: 'N-04', A: 'A-05' },
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
    numbers: { N: 'N-06', S: 'S-14', M: 'M-14' },
    position: pos(DAIGAKU),
    diagram: { x: 960, y: 480, label: 'se', badges: 'ne' },
    district: 'University',
    districtJa: '文教地区',
    platforms: { N: [1, 2], S: [3, 4], M: [3, 4] },
    blurb: 'Brick-lined station at the gates of Kawaminato University. Nagisa and Shiokaze lines cross here; Sumire trains share the Shiokaze platforms.',
  },
  {
    id: 'hibarino',
    nameJa: '雲雀野',
    nameKana: 'ひばりの',
    nameRomaji: 'Hibarino',
    numbers: { N: 'N-07', K: 'K-16' },
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
    numbers: { N: 'N-08' },
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
    numbers: { N: 'N-09' },
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
    numbers: { N: 'N-10' },
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
    numbers: { A: 'A-01' },
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
    numbers: { A: 'A-02' },
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
    numbers: { A: 'A-03' },
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
    numbers: { A: 'A-04', K: 'K-13' },
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
    numbers: { A: 'A-07' },
    position: { x: 2450, y: A_ODORI_Z },
    diagram: { x: 930, y: 280, label: 'se', badges: 'sw' },
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
    numbers: { A: 'A-08' },
    position: { x: A_HILL_X, y: -1300 },
    diagram: { x: 1020, y: 190, label: 'se', badges: 'nw' },
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
    numbers: { A: 'A-09' },
    position: { x: A_HILL_X, y: -2000 },
    diagram: { x: 1110, y: 100, label: 'se' },
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
    numbers: { A: 'A-10' },
    position: { x: 3800, y: A_RIDGE_Z },
    diagram: { x: 1250, y: 100 },
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
    numbers: { A: 'A-11' },
    position: { x: 4600, y: A_RIDGE_Z },
    diagram: { x: 1390, y: 100 },
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
    numbers: { A: 'A-12' },
    position: { x: 5400, y: A_RIDGE_Z },
    diagram: { x: 1530, y: 100 },
    district: 'North-east ridge',
    districtJa: '北東尾根',
    platforms: { A: [1, 2] },
    blurb: 'Ridge-top station below the city observatory.',
  },
  {
    id: 'kasumidani',
    nameJa: '霞谷',
    nameKana: 'かすみだに',
    nameRomaji: 'Kasumidani',
    numbers: { A: 'A-13' },
    position: { x: 6250, y: A_RIDGE_Z },
    diagram: { x: 1670, y: 100 },
    district: 'Kasumi valley',
    districtJa: '霞谷',
    platforms: { A: [1, 2] },
    blurb: 'Where the line leaves the ridge tunnel: an open cutting in a misty valley of terraced houses.',
  },
  {
    id: 'shiondai',
    nameJa: '紫苑台',
    nameKana: 'しおんだい',
    nameRomaji: 'Shiondai',
    numbers: { A: 'A-14' },
    position: { x: A_VALLEY_X, y: -3250 },
    diagram: { x: 1810, y: 100 },
    district: 'North-east new town',
    districtJa: '北東ニュータウン',
    platforms: { A: [1, 2] },
    blurb: 'Elevated terminus of the 1990s aster new town, with a bus terminal and a shopping centre on a pedestrian deck.',
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
    numbers: { S: 'S-17', M: 'M-15' },
    position: pos(along(DAIGAKU, S_SOUTH_DIR, 2150)),
    diagram: { x: 960, y: 850, label: 'left', badges: 'sw' },
    district: 'South-east',
    districtJa: '南東',
    platforms: { S: [1, 2], M: [1, 2] },
    blurb: 'Residential avenue lined with dogwood. Shiokaze and Sumire trains share the platforms; beyond, the lines part.',
  },
  {
    id: 'shin-sakuragawa',
    nameJa: '新桜川',
    nameKana: 'しんさくらがわ',
    nameRomaji: 'Shin-Sakuragawa',
    numbers: { S: 'S-18' },
    position: pos(along(S_TURN, [1, 0], 400)),
    diagram: { x: 1100, y: 850, label: 'ne', badges: 'nw' },
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
    numbers: { S: 'S-19', G: 'G-15' },
    position: pos(along(S_TURN, [1, 0], 1100)),
    diagram: { x: 1240, y: 850, label: 'se', badges: 'nw' },
    district: 'Bay forest',
    districtJa: '海の森',
    platforms: { S: [1, 2], G: [3, 4] },
    blurb: 'Beside the forest park planted on the old landfill; the Ichō Line crosses deep below.',
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
    numbers: { K: 'K-18', G: 'G-18' },
    position: pos(SHIN_HIBARINO),
    at: { G: pos(G_SHIN_HIBARINO) },
    diagram: { x: 1570, y: 330 },
    district: 'East new town',
    districtJa: '東部ニュータウン',
    platforms: { K: [1, 2], G: [3, 4] },
    blurb: 'Terminus of the Kikyō and Ichō lines in the newest eastern estate, laid out around a skylark meadow park.',
  },
  // ── Sumire Line ──
  {
    id: 'seiran',
    nameJa: '清嵐',
    nameKana: 'せいらん',
    nameRomaji: 'Seiran',
    numbers: { M: 'M-11' },
    position: pos(SEIRAN),
    diagram: { x: 880, y: 70, label: 'right', badges: 'ne' },
    district: 'North-east hills',
    districtJa: '北東丘',
    platforms: { M: [1, 2] },
    blurb: 'Hillside terminus in clear mountain air: a temple wood, an old tea house and a hiking trailhead.',
  },
  {
    id: 'minami-sakuragawa',
    nameJa: '南桜川',
    nameKana: 'みなみさくらがわ',
    nameRomaji: 'Minami-Sakuragawa',
    numbers: { M: 'M-16' },
    position: pos(along(DAIGAKU, S_SOUTH_DIR, 2900)),
    diagram: { x: 1040, y: 930, badges: 'ne' },
    district: 'South-east canals',
    districtJa: '南東運河',
    platforms: { M: [1, 2] },
    blurb: 'The lower Sakura-gawa: boathouses, a rowing club and a riverside market.',
  },
  {
    id: 'harunodai',
    nameJa: '春野台',
    nameKana: 'はるのだい',
    nameRomaji: 'Harunodai',
    numbers: { M: 'M-17', G: 'G-14' },
    position: { x: G_X, y: M_EAST_TURN[1] },
    diagram: { x: 1240, y: 930, label: 'se', badges: 'nw' },
    district: 'Southern heights',
    districtJa: '南台地',
    platforms: { M: [1, 2], G: [3, 4] },
    blurb: 'On the sunny southern heights, among new houses and spring meadows; the Ichō Line crosses deep below.',
  },
  // ── Shiokaze Line, east along the bay ──
  {
    id: 'asanagi',
    nameJa: '朝凪',
    nameKana: 'あさなぎ',
    nameRomaji: 'Asanagi',
    numbers: { S: 'S-20' },
    position: pos(along(S_TURN, [1, 0], 1950)),
    diagram: { x: 1380, y: 850 },
    district: 'Bay shore',
    districtJa: '湾岸',
    platforms: { S: [1, 2] },
    blurb: 'Morning-calm shore of the inner bay: fishing piers, a yacht harbour and early-opening cafés.',
  },
  {
    id: 'shirasunahama',
    nameJa: '白砂浜',
    nameKana: 'しらすなはま',
    nameRomaji: 'Shirasunahama',
    numbers: { S: 'S-21' },
    position: pos(along(S_TURN, [1, 0], 2800)),
    diagram: { x: 1520, y: 850 },
    district: 'Bay shore',
    districtJa: '湾岸',
    platforms: { S: [1, 2] },
    blurb: "Terminus beside the city's man-made white-sand beach and its summer beach huts.",
  },
  // ── Sumire Line, onto the spring-flower heights ──
  {
    id: 'nanohanadai',
    nameJa: '菜の花台',
    nameKana: 'なのはなだい',
    nameRomaji: 'Nanohanadai',
    numbers: { M: 'M-18' },
    position: pos(along(M_SE_TURN, M_ESE, 600)),
    diagram: { x: 1380, y: 930 },
    district: 'Southern heights',
    districtJa: '南台地',
    platforms: { M: [1, 2] },
    blurb: 'Hillside estate above fields of rape blossom, yellow every March.',
  },
  {
    id: 'rengeno',
    nameJa: '蓮華野',
    nameKana: 'れんげの',
    nameRomaji: 'Rengeno',
    numbers: { M: 'M-19' },
    position: pos(along(M_SE_TURN, M_ESE, 1450)),
    diagram: { x: 1520, y: 930 },
    district: 'Southern heights',
    districtJa: '南台地',
    platforms: { M: [1, 2] },
    blurb: 'Terminus among milk-vetch meadows and new houses at the far edge of the heights.',
  },
  // ── Ichō Line ──
  {
    id: 'ikarimachi',
    nameJa: '錨町',
    nameKana: 'いかりまち',
    nameRomaji: 'Ikarimachi',
    numbers: { G: 'G-12' },
    position: { x: 2900, y: G_SOUTH_Z },
    diagram: { x: 880, y: 1010 },
    district: 'South port',
    districtJa: '南港',
    platforms: { G: [1, 2] },
    blurb: "Old dockers' town below the heights: rope lofts, a seamen's bathhouse and the port union hall.",
  },
  {
    id: 'todai-dori',
    nameJa: '灯台通',
    nameKana: 'とうだいどおり',
    nameRomaji: 'Tōdai-dōri',
    numbers: { G: 'G-13' },
    position: { x: 3900, y: G_SOUTH_Z },
    diagram: { x: 1020, y: 1010 },
    district: 'Southern heights',
    districtJa: '南台地',
    platforms: { G: [1, 2] },
    blurb: 'Avenue climbing the heights to the old harbour lighthouse, now a museum and lookout.',
  },
  {
    id: 'hotarugawa',
    nameJa: '蛍川',
    nameKana: 'ほたるがわ',
    nameRomaji: 'Hotarugawa',
    numbers: { G: 'G-16' },
    position: { x: G_X, y: 1000 },
    diagram: { x: 1300, y: 730, label: 'right' },
    district: 'East fields',
    districtJa: '東部田園',
    platforms: { G: [1, 2] },
    blurb: 'A restored stream through rice fields and allotments, where fireflies come out in June.',
  },
  {
    id: 'narukozaka',
    nameJa: '鳴子坂',
    nameKana: 'なるこざか',
    nameRomaji: 'Narukozaka',
    numbers: { G: 'G-17' },
    position: { x: G_X, y: -200 },
    diagram: { x: 1370, y: 660, label: 'right' },
    district: 'East hills',
    districtJa: '東丘',
    platforms: { G: [1, 2] },
    blurb: 'Slope of terraced fields below the skylark meadows, with a farm shop and a small agricultural college.',
  },
];

// ── Akitsushima Railway (AR): the main-line railway. See docs/akitsushima-railway.md. ──
// Kept apart from LINES / STATIONS, which are the built, walkable metro: for now AR is on the
// route map and in the timetable only. Its viaduct, trains and stations are not in the 3D world yet.

export const RAIL_OPERATOR: Operator = {
  nameEn: 'Akitsushima Railway',
  nameJa: '秋津島鉄道',
  city: 'Kawaminato',
  cityJa: '川湊市',
};

// Main Line, north-east to south-west ("down"): down the Mio-gawa valley, west along the north
// side of Kita through Kawaminato Station, then south-west over the river and along the old shore.
const AR_KITA_Z = A_ODORI_Z - 150; // the viaduct, 150 m north of Kita-Ōdōri avenue
const AR_EDGE_M = 1500; // how far beyond the end stops trains run before they leave the map
const AR_E1: [number, number] = [2660, AR_KITA_Z]; // east of Higashi-Kawaminato: turns into the valley
const AR_VALLEY_DIR: [number, number] = [0.89101, 0.45399]; // 27° south of east
const AR_E2: [number, number] = along(AR_E1, AR_VALLEY_DIR, 620);
const AR_HILLS_DIR: [number, number] = [0.97237, -0.23345]; // 13.5° north of east
const AR_W1: [number, number] = [1500, AR_KITA_Z]; // west of Kawaminato: turns south-west to the river
const AR_SHORE_DIR: [number, number] = [-0.52498, 0.85112];
const AR_W2: [number, number] = along(AR_W1, AR_SHORE_DIR, 1250);
const AR_COAST_DIR: [number, number] = [0.26892, 0.96316];
const AR_FUNAMIDAI: [number, number] = along(AR_W2, AR_COAST_DIR, 3370);
const AR_UGUISUZAKA: [number, number] = along(AR_E2, AR_HILLS_DIR, 605);

export const RAIL_LINES: LineDef[] = [
  {
    id: 'AR',
    nameEn: 'AR Main Line',
    nameJa: '秋津本線',
    nameKana: 'あきつほんせん',
    color: '#0b6e6e',
    type: 'jr',
    stops: ['uguisuzaka', 'miokami', 'higashi-kawaminato', 'kawaminato', 'konyahama', 'funamidai'],
    railY: [9, 9, 9, 9, 9, 9],
    platformType: 'island',
    trackOffset: 5.5,
    alignment: {
      vertices: [along(AR_UGUISUZAKA, AR_HILLS_DIR, AR_EDGE_M + 200), AR_E2, AR_E1, AR_W1, AR_W2, along(AR_FUNAMIDAI, AR_COAST_DIR, AR_EDGE_M + 200)],
      radius: 400,
    },
    // 8-car trains at up to 100 km/h. A Local and a Rapid every 10 minutes each.
    service: { ...baseService, headwayS: 600, dwellS: 30, maxSpeed: 27.5, cars: 8 },
    services: [
      { id: 'local', nameEn: 'Local', nameJa: '普通', color: '#3b4046', skips: [] },
      { id: 'rapid', nameEn: 'Rapid', nameJa: '快速', color: '#d9541e', skips: ['higashi-kawaminato', 'konyahama'] },
    ],
    servicesMeetAt: 'kawaminato',
    beyond: {
      up: { nameJa: '霧ヶ原', nameKana: 'きりがはら', nameRomaji: 'Kirigahara' },
      down: { nameJa: '朝凪', nameKana: 'あさなぎ', nameRomaji: 'Asanagi' },
      runM: AR_EDGE_M,
      diagram: { up: [1222, 358], down: [662, 952] },
    },
    diagramBends: { 0: [[1125, 400]], 1: [[940, 215]], 3: [[700, 215], [610, 305]], 4: [[610, 434], [662, 486]] },
  },
];

const AR_PLATFORMS: Record<LineId, [number, number]> = { AR: [1, 2] };
export const RAIL_STATIONS: StationDef[] = [
  {
    id: 'uguisuzaka',
    nameJa: '鶯坂',
    nameKana: 'うぐいすざか',
    nameRomaji: 'Uguisuzaka',
    numbers: { AR: 'AR-A01' },
    position: pos(AR_UGUISUZAKA),
    diagram: { x: 1180, y: 400, label: 'below' },
    district: 'East hills',
    districtJa: '東部丘陵',
    platforms: AR_PLATFORMS,
    blurb: 'Embankment station on the slope below the skylark hills; the last stop before the line climbs out of the city.',
    transfer: 'hibarino',
  },
  {
    id: 'miokami',
    nameJa: '澪上',
    nameKana: 'みおかみ',
    nameRomaji: 'Miokami',
    numbers: { AR: 'AR-A02' },
    position: pos(along(AR_E1, AR_VALLEY_DIR, 340)),
    diagram: { x: 1040, y: 315, label: 'right' },
    district: 'University',
    districtJa: '大学地区',
    platforms: AR_PLATFORMS,
    blurb: 'The old village upstream on the Mio-gawa, older than the university across the river.',
    transfer: 'daigaku-mae',
  },
  {
    id: 'higashi-kawaminato',
    nameJa: '東川湊',
    nameKana: 'ひがしかわみなと',
    nameRomaji: 'Higashi-Kawaminato',
    numbers: { AR: 'AR-A03' },
    position: { x: 2450, y: AR_KITA_Z },
    diagram: { x: 915, y: 215, label: 'above' },
    district: 'Kita (east)',
    districtJa: 'キタ東',
    platforms: AR_PLATFORMS,
    blurb: '1930s brick-and-iron station in the east of Kita, by the civic district.',
    transfer: 'suzukakedori',
  },
  {
    id: 'kawaminato',
    nameJa: '川湊',
    nameKana: 'かわみなと',
    nameRomaji: 'Kawaminato',
    numbers: { AR: 'AR-A04' },
    position: { x: 1870, y: AR_KITA_Z },
    diagram: { x: 790, y: 215, label: 'above' },
    district: 'Kita',
    districtJa: 'キタ',
    platforms: AR_PLATFORMS,
    blurb: "The city's main station: through platforms on the viaduct above Kita, where the railway arrived in 1889.",
    transfer: 'kita-odori',
  },
  {
    id: 'konyahama',
    nameJa: '紺屋浜',
    nameKana: 'こんやはま',
    nameRomaji: "Kon'yahama",
    numbers: { AR: 'AR-A05' },
    position: pos(along(AR_W1, AR_SHORE_DIR, 880)),
    diagram: { x: 610, y: 400, label: 'left' },
    district: 'Merchant quarter',
    districtJa: '商人町',
    platforms: AR_PLATFORMS,
    blurb: 'On the old shoreline, where the indigo dyers once rinsed their cloth on the beach.',
    transfer: 'aizomecho',
  },
  {
    id: 'funamidai',
    nameJa: '舟見台',
    nameKana: 'ふなみだい',
    nameRomaji: 'Funamidai',
    numbers: { AR: 'AR-A06' },
    position: pos(AR_FUNAMIDAI),
    diagram: { x: 662, y: 900, label: 'left' },
    district: 'South port',
    districtJa: '南港',
    platforms: AR_PLATFORMS,
    blurb: 'On the bluff where people once watched the ships come in, now above the container port.',
    transfer: 'nankodai',
  },
];

/** Every line and station, built or not. LINES / STATIONS are the walkable metro only. */
export const ALL_LINES: LineDef[] = [...LINES, ...RAIL_LINES];
export const ALL_STATIONS: StationDef[] = [...STATIONS, ...RAIL_STATIONS];
/** True for a station that is on the map and in the timetable but not built in 3D yet. */
export const isUnbuilt = (id: StationId): boolean => RAIL_STATIONS.some((s) => s.id === id);

export const lineById = (id: LineId): LineDef => {
  const l = ALL_LINES.find((x) => x.id === id);
  if (!l) throw new Error(`unknown line ${id}`);
  return l;
};
export const stationById = (id: StationId): StationDef => {
  const s = ALL_STATIONS.find((x) => x.id === id);
  if (!s) throw new Error(`unknown station ${id}`);
  return s;
};
export const linesAt = (id: StationId): LineDef[] => ALL_LINES.filter((l) => l.stops.includes(id));

/** A line's platform type at one station (LineDef.sideAt overrides the line's own). */
export const platformTypeAt = (line: LineDef, id: StationId): LineDef['platformType'] =>
  line.sideAt?.includes(id) ? 'side' : line.platformType;

/** Route-map polyline for segment i of a line (stops[i] → stops[i + 1]), including any corners. */
export function diagramSegment(line: LineDef, i: number): [number, number][] {
  const a = stationById(line.stops[i]).diagram, b = stationById(line.stops[i + 1]).diagram;
  const pts: [number, number][] = [[a.x, a.y], ...(line.diagramBends?.[i] ?? []), [b.x, b.y]];
  const o = line.diagramOffset?.[i];
  if (!o) return pts;
  // Shift sideways (+ = left of travel, in screen coordinates with y down).
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
  return pts.map(([x, y]) => [x + (dy / len) * o, y - (dx / len) * o]);
}

/** Route-map pieces of a line: runs of ordinary segments, and segments on another line's track. */
export function diagramRuns(line: LineDef): { pts: [number, number][]; shared: boolean }[] {
  const runs: { pts: [number, number][]; shared: boolean }[] = [];
  for (let i = 0; i < line.stops.length - 1; i++) {
    const shared = !!line.diagramShared?.includes(i), seg = diagramSegment(line, i);
    const last = runs[runs.length - 1];
    // Joined into the previous run only if it continues it exactly (no offset jog, same kind).
    if (last && last.shared === shared && last.pts[last.pts.length - 1].every((v, k) => v === seg[0][k])) last.pts.push(...seg.slice(1));
    else runs.push({ pts: seg, shared });
  }
  return runs;
}

/** Route-map polyline for a whole line (offsets included). */
export const diagramPath = (line: LineDef): [number, number][] => diagramRuns(line).flatMap((r) => r.pts);

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

/** Where a train heading `dir` is bound for: the terminus, or the city beyond the map on a main line. */
export const destinationOf = (line: LineDef, dir: 'down' | 'up'): Place => line.beyond?.[dir] ?? terminusOf(line, dir);

/** Default spawn when pressing Start. */
export const HOME_STATION: StationId = 'tsumugibashi';
