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
const along = (o: [number, number], d: [number, number], t: number): [number, number] => [
  o[0] + d[0] * t,
  o[1] + d[1] * t,
];
const pos = (p: [number, number]) => ({ x: p[0], y: p[1] });

export const LINES: LineDef[] = [
  {
    id: 'Y',
    nameEn: 'Yanagisuji Line',
    nameJa: '柳筋線',
    nameKana: 'やなぎすじせん',
    color: '#1f9d55',
    type: 'metro',
    stops: ['midorizaka', 'kita-odori', 'tsumugibashi', 'hyotanbori', 'tsurumatsu'],
    railY: [-10, -13, -19, -14, -11],
    platformType: 'island',
    trackOffset: 5.5,
    alignment: { vertices: [along(Y_BEND, Y_NORTH_DIR, 1100), Y_BEND, [1870, 1800]], radius: 400 },
    service: { ...baseService, headwayS: 240 },
  },
  {
    id: 'N',
    nameEn: 'Nagisa Line',
    nameJa: '渚線',
    nameKana: 'なぎさせん',
    color: '#1673c9',
    type: 'metro',
    stops: ['kawaminato-ko', 'aizomecho', 'tsumugibashi', 'daigaku-mae', 'hibarino'],
    railY: [-11, -12, -11.5, -11, 6.5],
    platformType: 'side',
    trackOffset: 1.9,
    alignment: { vertices: [[0, 0], N_BEND, along(N_BEND, N_EAST_DIR, 1900)], radius: 400 },
    service: { ...baseService, headwayS: 300 },
  },
];

export const STATIONS: StationDef[] = [
  // ── Yanagisuji Line ──
  {
    id: 'midorizaka',
    nameJa: '緑坂',
    nameKana: 'みどりざか',
    nameRomaji: 'Midorizaka',
    numbers: { Y: 'Y-11' },
    position: pos(along(Y_BEND, Y_NORTH_DIR, 680)),
    diagram: { x: 520, y: 70 },
    district: 'North hills',
    districtJa: '北丘',
    platforms: { Y: [1, 2] },
    blurb: 'Quiet residential terminus on the northern slope.',
  },
  {
    id: 'kita-odori',
    nameJa: '北大通',
    nameKana: 'きたおおどおり',
    nameRomaji: 'Kita-Ōdōri',
    numbers: { Y: 'Y-12' },
    position: { x: 1870, y: -680 },
    diagram: { x: 560, y: 170 },
    district: 'Kita (north hub)',
    districtJa: 'キタ',
    platforms: { Y: [1, 2] },
    blurb: 'Business district hub with a vaulted platform hall.',
  },
  {
    id: 'tsumugibashi',
    nameJa: '紬橋',
    nameKana: 'つむぎばし',
    nameRomaji: 'Tsumugibashi',
    numbers: { Y: 'Y-13', N: 'N-13' },
    position: { x: 1870, y: 0 },
    diagram: { x: 560, y: 290 },
    district: 'Central',
    districtJa: '中央',
    platforms: { Y: [1, 2], N: [3, 4] },
    blurb: 'The central interchange. Yanagisuji and Nagisa lines cross here.',
  },
  {
    id: 'hyotanbori',
    nameJa: '瓢箪堀',
    nameKana: 'ひょうたんぼり',
    nameRomaji: 'Hyōtanbori',
    numbers: { Y: 'Y-14' },
    position: { x: 1870, y: 650 },
    diagram: { x: 560, y: 400 },
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
    diagram: { x: 560, y: 510 },
    district: 'Old town',
    districtJa: '下町',
    platforms: { Y: [1, 2] },
    blurb: 'Old-town terminus beside a covered shopping arcade.',
  },
  // ── Nagisa Line ──
  {
    id: 'kawaminato-ko',
    nameJa: '川湊港',
    nameKana: 'かわみなとこう',
    nameRomaji: 'Kawaminato-kō',
    numbers: { N: 'N-11' },
    position: { x: 320, y: 0 },
    diagram: { x: 120, y: 290 },
    district: 'Bay area',
    districtJa: 'ベイエリア',
    platforms: { N: [1, 2] },
    blurb: 'Redeveloped port: brick warehouses and the ferry pier.',
  },
  {
    id: 'aizomecho',
    nameJa: '藍染町',
    nameKana: 'あいぞめちょう',
    nameRomaji: 'Aizomechō',
    numbers: { N: 'N-12' },
    position: { x: 1070, y: 0 },
    diagram: { x: 340, y: 290 },
    district: 'Merchant quarter',
    districtJa: '問屋街',
    platforms: { N: [1, 2] },
    blurb: 'The old indigo dyers’ quarter.',
  },
  {
    id: 'daigaku-mae',
    nameJa: '川湊大学前',
    nameKana: 'かわみなとだいがくまえ',
    nameRomaji: 'Kawaminato-daigaku-mae',
    numbers: { N: 'N-14' },
    position: pos(along(N_BEND, N_EAST_DIR, 370)),
    diagram: { x: 780, y: 290 },
    district: 'University',
    districtJa: '文教地区',
    platforms: { N: [1, 2] },
    blurb: 'Brick-lined station at the gates of Kawaminato University.',
  },
  {
    id: 'hibarino',
    nameJa: '雲雀野',
    nameKana: 'ひばりの',
    nameRomaji: 'Hibarino',
    numbers: { N: 'N-15' },
    position: pos(along(N_BEND, N_EAST_DIR, 1470)),
    diagram: { x: 960, y: 200 },
    district: 'East hills',
    districtJa: '東丘',
    platforms: { N: [1, 2] },
    blurb: 'Elevated suburban terminus in the eastern hills.',
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

/** Terminus a train heading `dir` on `line` is bound for. */
export const terminusOf = (line: LineDef, dir: 'down' | 'up'): StationDef =>
  stationById(dir === 'down' ? line.stops[line.stops.length - 1] : line.stops[0]);

/** Default spawn when pressing Start. */
export const HOME_STATION: StationId = 'tsumugibashi';
