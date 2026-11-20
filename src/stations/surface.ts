// Street level around a station: roads, sidewalks, crossings, buildings, street furniture.
// Generated from a small spec + a seeded RNG, so each station gets a distinct but
// repeatable neighbourhood. Coordinates are station-frame metres (x along the line).

import { DEFAULT_PLOT, rng, type Builder } from '../world/builder';
import { CAR_PARK, KONBINI, konbini, type ChainId } from './konbini';
import { kerbGaps, kerbRail, poleLine, roadKit, streetLamp, type LampKind } from './roads';
import { BUILDING_MODELS } from './buildings';
import { GROUND_Y, vending } from './kit';

export type BlockStyle = 'office' | 'mixed' | 'neon' | 'apartment' | 'house' | 'oldtown' | 'godown' | 'warehouse' | 'campus' | 'park' | 'sea' | 'dome';

export interface SurfaceSpec {
  seed: number;
  /** Half-width of the main carriageway above the line. */
  roadHalf: number;
  /** x positions of cross streets. */
  cross: number[];
  /** Building style on the -z and +z sides of the main road. */
  left: BlockStyle;
  right: BlockStyle;
  trees?: boolean;
  poles?: boolean;
  /** A wide second avenue crossing at x = 0 (interchange). */
  avenue?: boolean;
  /** Replace the cross street at this x with a canal and bridge. */
  canalAt?: number;
  /** Covered shopping arcade over the cross street at this x, on the -z side. */
  arcadeAt?: number;
  arcadeName?: { ja: string; en: string };
  /** Name plate on the canal bridge (default Hyōtan-bashi). */
  canalName?: { ja: string; en: string };
  /** An old stone bridge (the model exchange_bridge, build_exchange.py) and stone banks with willows, in place of the red one. */
  canalStone?: boolean;
  /**
   * Convenience stores you can walk into (stations/konbini.ts), each on its own lot on one side of
   * the main road: `x0` is the lot's low-x edge. A 'ground' shop stands in the base of a block.
   */
  konbini?: { type: 'corner' | 'ground' | 'roadside'; chain: ChainId; side: -1 | 1; x0: number }[];
  /** Blender-built buildings on the lots (stations/buildings.ts) in place of the box ones: business blocks, old shophouses by a canal. */
  models?: boolean;
  /**
   * The road kit (roads.ts): signals at the far side of each junction that cycle, pedestrian signals,
   * road signs, lane markings, vehicles that face their lane's way, bus stops and street furniture,
   * in place of the two box signals and the box cars.
   */
  roadKit?: boolean;
  /** Strings of paper lanterns along both canal banks. */
  canalLanterns?: boolean;
  /** What a 'sea' side is: the working port with cranes and the ferry (default), or a promenade. */
  waterfront?: 'port' | 'promenade';
  /** Name on a campus gate (default Kawaminato University). */
  campusName?: { ja: string; en: string };
  /** Name on the building at a port quay (default Kawaminato Ferry Terminal). */
  quayName?: { ja: string; en: string };
  /** Name on a promenade's sign (default Yūnagi Promenade). */
  promenadeName?: { ja: string; en: string };
  /** Name on the park gate (default Midorizaka Park). */
  parkName?: { ja: string; en: string };
  /**
   * The ground falls away beyond this z on the +z side (Narukozaka): the street stops there and
   * the station's composer builds the slope and the valley below.
   */
  valleyZ?: number;
  /**
   * A lot the station's composer builds on itself (Tsumugibashi's Silk Exchange): no buildings are
   * put on x0 … x1 of that side, and the exit boards name it.
   */
  landmark?: { ja: string; en: string; side: -1 | 1; x0: number; x1: number; /** How far back from the building line it reaches. */ depth?: number };
  /** Canopy material for street and park trees (default 'leaf'); a flat pink makes cherries. */
  treeLeaf?: string;
}

export const PLOT_X = DEFAULT_PLOT.x;
export const PLOT_Z = DEFAULT_PLOT.z;
const GY = GROUND_Y;

export interface Shop {
  ja: string;
  en: string;
  bg: string;
  fg: string;
}
export const SHOPS: Shop[] = [
  { ja: 'マルホシマート', en: 'Maruhoshi Mart', bg: '#0b8f6a', fg: '#fff' },
  { ja: 'カフェ つむぎ', en: 'Café Tsumugi', bg: '#5b3a29', fg: '#f6e7c8' },
  { ja: 'らーめん 川一', en: 'Ramen Kawaichi', bg: '#c62828', fg: '#fff' },
  { ja: 'ひばり薬局', en: 'Hibari Pharmacy', bg: '#fff', fg: '#1976d2' },
  { ja: '柳文堂書店', en: 'Ryubundo Books', bg: '#1b3a5c', fg: '#fff' },
  { ja: '居酒屋 ひょうたん', en: 'Izakaya Hyotan', bg: '#2b1a12', fg: '#ffcf4a' },
  { ja: 'カラオケ うたまる', en: 'Karaoke Utamaru', bg: '#7b1fa2', fg: '#ffeb3b' },
  { ja: '川湊信用金庫', en: 'Kawaminato Shinkin Bank', bg: '#f4f4f0', fg: '#0d3b66' },
  { ja: 'みどり不動産', en: 'Midori Real Estate', bg: '#2e7d32', fg: '#fff' },
  { ja: 'たこ焼き 丸八', en: 'Takoyaki Maruhachi', bg: '#ef6c00', fg: '#fff' },
  { ja: 'ベーカリー こむぎ', en: 'Bakery Komugi', bg: '#f3e2c0', fg: '#6d3b12' },
  { ja: '湊クリーニング', en: 'Minato Cleaners', bg: '#e3f2fd', fg: '#1565c0' },
  { ja: '焼肉 牛松', en: 'Yakiniku Ushimatsu', bg: '#111', fg: '#ff5252' },
  { ja: '100円ショップ マルコ', en: '100-yen Shop Maruko', bg: '#ffeb3b', fg: '#d32f2f' },
  { ja: '学習塾 のぞみ', en: 'Nozomi Cram School', bg: '#283593', fg: '#fff' },
  { ja: '歯科クリニック', en: 'Dental Clinic', bg: '#e0f2f1', fg: '#00695c' },
  { ja: '喫茶 灯', en: 'Kissa Akari', bg: '#4e342e', fg: '#ffe0b2' },
  { ja: 'お好み焼き 千', en: 'Okonomiyaki Sen', bg: '#b71c1c', fg: '#fff8e1' },
  { ja: '和菓子 つむぎ庵', en: 'Wagashi Tsumugi-an', bg: '#6a1b3a', fg: '#fbe9d0' },
  { ja: 'お弁当 みなと屋', en: 'Bento Minatoya', bg: '#f6efe0', fg: '#8a2b18' },
  { ja: '茜珈琲', en: 'Akane Coffee', bg: '#3a1f1a', fg: '#f0b8a0' },
  { ja: 'おみやげ 川湊堂', en: 'Kawaminato-dō Gifts', bg: '#0d3b66', fg: '#fff' },
  { ja: 'そば処 きた', en: 'Soba Kita', bg: '#2f3a2c', fg: '#f4f1e6' },
  { ja: 'フラワー やなぎ', en: 'Yanagi Flowers', bg: '#e8f3e4', fg: '#2e6b35' },
];
const NEON = ['#ff3d57', '#ffcf4a', '#35e0ff', '#7cff6b', '#ff7ad9', '#ffffff', '#ff8f00'];
const NEON_WORDS = ['居酒屋', 'カラオケ', '串カツ', 'バー', 'ラーメン', '焼鳥', 'スナック', '寿司', 'たこ焼', 'ホルモン', '麻雀', '立呑み'];

const STYLE: Record<string, { w: [number, number]; d: [number, number]; floors: [number, number]; mat: string[]; shop: number }> = {
  office: { w: [18, 34], d: [22, 26], floors: [10, 24], mat: ['facade:office:#8fa6b8', 'facade:office:#6f8597', 'facade:office:#a9b7c1', 'facade:grid:#d8d5cc'], shop: 0.5 },
  mixed: { w: [9, 18], d: [16, 24], floors: [4, 11], mat: ['facade:grid:#d9d4c7', 'facade:grid:#b9b3a6', 'facade:office:#93a3ae', 'facade:grid:#c9b8a0', 'facade:apt:#d7d2c8'], shop: 1 },
  neon: { w: [6, 13], d: [14, 22], floors: [3, 8], mat: ['facade:grid:#3a3a40', 'facade:grid:#55504a', 'facade:grid:#6b6259', 'facade:grid:#2f3138'], shop: 1 },
  apartment: { w: [14, 24], d: [14, 20], floors: [5, 11], mat: ['facade:apt:#e4dfd3', 'facade:apt:#d5cbb8', 'facade:apt:#c9d0d4'], shop: 0.25 },
  house: { w: [8, 11], d: [9, 12], floors: [2, 2], mat: ['facade:house:#e9e2d2', 'facade:house:#d9cdb8', 'facade:house:#cfd6d2', 'facade:house:#e6d9c9'], shop: 0.1 },
  oldtown: { w: [5.5, 9], d: [10, 15], floors: [2, 3], mat: ['wood:#5a4636', 'wood:#6b5440', 'facade:house:#d9cdb8', 'wood:#4a3a2e'], shop: 1 },
  // Kura: white-plastered storehouses with namako-tile bases, some turned into cafés.
  godown: { w: [8, 13], d: [12, 16], floors: [2, 3], mat: ['flat:#f1eee6', 'flat:#ece7dc', 'flat:#f4f2ec'], shop: 0.45 },
  warehouse: { w: [22, 34], d: [20, 26], floors: [3, 4], mat: ['brick:#8e4a35', 'brick:#7d4030', 'brick:#99573f'], shop: 0.35 },
  campus: { w: [26, 40], d: [16, 20], floors: [4, 6], mat: ['brick:#9a5a43', 'brick:#8a4f3b'], shop: 0 },
};

export function car(b: Builder, x: number, z: number, color: string, alongX = true, taxi = false) {
  const hx = alongX ? 2.1 : 0.85, hz = alongX ? 0.85 : 2.1;
  b.box(`flat:${color}`, x - hx, 0.25, z - hz, x + hx, 0.95, z + hz);
  const cx = alongX ? 1.15 : 0.78, cz = alongX ? 0.78 : 1.15;
  b.deco('glassDark', x - cx, 0.95, z - cz, x + cx, 1.45, z + cz);
  b.deco(`flat:${color}`, x - cx * 0.96, 1.45, z - cz * 0.96, x + cx * 0.96, 1.5, z + cz * 0.96);
  b.deco('flat:#1a1a1a', x - hx * 0.98, 0.02, z - hz * 1.01, x + hx * 0.98, 0.45, z + hz * 1.01);
  if (taxi) b.deco('glow:#ffe082', x - 0.25, 1.5, z - 0.25, x + 0.25, 1.68, z + 0.25);
}

export function tree(b: Builder, x: number, z: number, h = 5.2, leaf = 'leaf') {
  b.mesh('flat:#4f4034', 'cyl', x, GY + h * 0.3, z, 0.3, h * 0.6, 0.3);
  // Canopy: one core and a ring of smaller clumps, placed from the trunk position so it is repeatable.
  const w = h * 0.5;
  b.mesh(leaf, 'sphere', x, GY + h * 0.8, z, w, h * 0.52, w);
  const seed = Math.abs(Math.round(x * 13 + z * 7));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + (seed % 7), k = 0.72 + ((seed >> i) % 3) * 0.1;
    const alt = leaf === 'leaf' ? 'leaf2' : leaf === 'leaf2' ? 'leaf' : leaf;
    b.mesh(i % 2 ? leaf : alt, 'sphere', x + Math.cos(a) * w * 0.38, GY + h * (0.68 + (i % 3) * 0.07), z + Math.sin(a) * w * 0.38, w * k, h * 0.36 * k, w * k);
  }
  b.block(x - 0.2, GY, z - 0.2, x + 0.2, GY + 2.5, z + 0.2);
}

function lamp(b: Builder, x: number, z: number, towards: number) {
  b.box('flat:#6f767d', x - 0.07, GY, z - 0.07, x + 0.07, GY + 6.2, z + 0.07);
  b.deco('flat:#6f767d', x - 0.05, GY + 6.1, Math.min(z, z + towards * 1.6), x + 0.05, GY + 6.2, Math.max(z, z + towards * 1.6));
  b.deco('light', x - 0.14, GY + 6.02, z + towards * 1.1 - 0.3, x + 0.14, GY + 6.1, z + towards * 1.1 + 0.3);
}

function utilityPole(b: Builder, x: number, z: number) {
  b.mesh('flat:#8a8479', 'cyl', x, GY + 4.6, z, 0.3, 9.2, 0.3);
  b.block(x - 0.16, GY, z - 0.16, x + 0.16, GY + 3, z + 0.16);
  b.deco('flat:#8a8479', x - 0.05, GY + 8.3, z - 0.9, x + 0.05, GY + 8.4, z + 0.9);
  b.deco('flat:#9b9b9b', x - 0.25, GY + 6.6, z + 0.15, x + 0.25, GY + 7.4, z + 0.55);
}

/** Japanese-style horizontal signal head on a mast arm reaching over the road. */
export function signal(b: Builder, x: number, z: number, armZ: number, faceX: 1 | -1, green: boolean) {
  b.box('flat:#6f767d', x - 0.1, GY, z - 0.1, x + 0.1, GY + 6, z + 0.1);
  const z1 = z + armZ;
  b.deco('flat:#6f767d', x - 0.06, GY + 5.7, Math.min(z, z1), x + 0.06, GY + 5.82, Math.max(z, z1));
  const zc = z1 - Math.sign(armZ) * 0.7;
  b.deco('flat:#2b2f33', x - 0.12, GY + 5.2, zc - 0.68, x + 0.12, GY + 5.68, zc + 0.68);
  const cols = [green ? 'glow:#19e6a0' : 'flat:#0f3b2c', 'flat:#4a3c0c', green ? 'flat:#4a1010' : 'glow:#ff3b30'];
  cols.forEach((m, i) => {
    const zz = zc + (i - 1) * 0.42 * faceX;
    b.deco(m, x + faceX * 0.12, GY + 5.3, zz - 0.15, x + faceX * 0.15, GY + 5.6, zz + 0.15);
  });
}

/** One building on a lot whose front faces -z at z = z0 (canonical; mirror for the other side). */
function building(b: Builder, r: () => number, style: BlockStyle, x0: number, x1: number, z0: number, depth: number) {
  const st = STYLE[style];
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const floors = Math.round(st.floors[0] + r() * (st.floors[1] - st.floors[0]));
  const fh = style === 'office' ? 3.8 : 3.1;
  const h = floors * fh + (style === 'house' ? 0 : 0.8);
  const mat = pick(st.mat);
  const xa = x0 + 0.2, xb = x1 - 0.2;
  const set = style === 'house' ? 2.2 : style === 'campus' ? 6 : 0;
  const zf = z0 + set;
  b.box(mat, xa, GY, zf, xb, GY + h, zf + depth);
  const w = xb - xa;
  if (style === 'house') {
    // Tiled roof with eaves, low garden wall, small car port.
    b.deco('roof', xa - 0.45, GY + h, zf - 0.5, xb + 0.45, GY + h + 0.35, zf + depth + 0.5);
    b.deco('roof', xa + 0.8, GY + h + 0.35, zf + 1.2, xb - 0.8, GY + h + 0.9, zf + depth - 1.2);
    b.box('flat:#cfcabe', xa, GY, z0 + 0.1, xb - 3, GY + 1.2, z0 + 0.3);
    if (r() < 0.5) car(b, xb - 1.4, z0 + 1.2, pick(['#e8e8e8', '#30343a', '#7a1f1f', '#c9c2a8']), false);
    b.deco('flat:#3d2f24', xa + 1.2, GY, zf - 0.04, xa + 2.2, GY + 2.1, zf);
    return;
  }
  if (style === 'godown') {
    // Namako base, black roof with a ridge, small iron-shuttered windows; a café in some.
    const base = Math.min(1.6, h * 0.25);
    b.sign({ k: 'mural', v: 'namako', color: '#2f3338' }, xa + w / 2, GY + base / 2, zf - 0.03, [0, -1], w - 0.1, base);
    b.deco('roof', xa - 0.35, GY + h, zf - 0.5, xb + 0.35, GY + h + 0.3, zf + depth + 0.5);
    b.deco('roof', xa + 0.6, GY + h + 0.3, zf + 1.4, xb - 0.6, GY + h + 1.2, zf + depth - 1.4);
    b.deco('flat:#2a2d31', xa - 0.4, GY + h + 1.2, zf + depth / 2 - 0.25, xb + 0.4, GY + h + 1.45, zf + depth / 2 + 0.25);
    for (let fx = xa + 1.6; fx < xb - 1.2; fx += 3.2) b.deco('flat:#30343a', fx, GY + h - 2.2, zf - 0.08, fx + 0.9, GY + h - 1.3, zf);
    if (r() < st.shop) {
      const s = pick(SHOPS.filter((q) => /カフェ|喫茶|珈琲|和菓子|おみやげ|そば/.test(q.ja)));
      b.deco('wood:#5a4636', xa + w / 2 - 1.8, GY, zf - 0.06, xa + w / 2 + 1.8, GY + 2.6, zf);
      b.deco('glow:#fff1d0', xa + w / 2 - 1.4, GY + 0.2, zf - 0.08, xa + w / 2 + 1.4, GY + 2.3, zf - 0.06);
      b.deco(`flat:${s.bg}`, xa + w / 2 - 1.2, GY + 1.75, zf - 0.11, xa + w / 2 + 1.2, GY + 2.5, zf - 0.09);
      b.sign({ k: 'shop', ...s }, xa + w / 2, GY + 3.25, zf - 0.08, [0, -1], Math.min(w - 1.2, 5.5), 0.75);
    } else {
      b.deco('flat:#30343a', xa + w / 2 - 1.3, GY, zf - 0.06, xa + w / 2 + 1.3, GY + 2.6, zf);
    }
    return;
  }
  if (style === 'campus') {
    b.deco('flat:#ded6c4', xa + w / 2 - 2.2, GY, zf - 1.2, xa + w / 2 + 2.2, GY + 4.2, zf);
    b.deco('glassDark', xa + w / 2 - 1.4, GY, zf - 1.24, xa + w / 2 + 1.4, GY + 3, zf - 1.2);
    return;
  }
  // Rooftop clutter.
  b.deco('flat:#9a9a94', xa + w * 0.2, GY + h, zf + depth * 0.3, xa + w * 0.2 + 2.4, GY + h + 1.6, zf + depth * 0.3 + 2.4);
  b.deco('flat:#b8b8b0', xa, GY + h, zf, xb, GY + h + 0.5, zf + 0.25);
  if (style === 'warehouse') {
    b.deco('flat:#3a3f45', xa + w / 2 - 2.2, GY, zf - 0.05, xa + w / 2 + 2.2, GY + 4.2, zf);
    if (r() < st.shop) {
      const s = pick(SHOPS);
      b.sign({ k: 'shop', ...s }, xa + w / 2, GY + 5.4, zf - 0.06, [0, -1], Math.min(8, w - 4), 1.2);
    }
    return;
  }
  // Shopfront at street level.
  if (r() < st.shop) {
    const s = pick(SHOPS);
    b.deco('glassDark', xa + 0.5, GY, zf - 0.05, xb - 0.5, GY + 2.9, zf);
    b.deco('glow:#fff3d6', xa + 0.7, GY + 2.3, zf - 0.07, xb - 0.7, GY + 2.5, zf - 0.05);
    b.sign({ k: 'shop', ...s }, xa + w / 2, GY + 3.45, zf - 0.08, [0, -1], Math.min(w - 0.8, 9), 0.95);
    b.deco(`flat:${s.bg}`, xa + 0.3, GY + 2.95, zf - 0.07, xb - 0.3, GY + 3.95, zf);
  } else {
    b.deco('glassDark', xa + w / 2 - 1.5, GY, zf - 0.05, xa + w / 2 + 1.5, GY + 2.8, zf);
    b.deco('flat:#c9c9c2', xa + w / 2 - 2.2, GY + 2.8, zf - 0.9, xa + w / 2 + 2.2, GY + 3.0, zf);
  }
  if (style === 'neon' || (style === 'mixed' && r() < 0.5)) {
    // Projecting vertical signs (袖看板), lit from inside.
    const n = style === 'neon' ? 1 + Math.floor(r() * 3) : 1;
    for (let i = 0; i < n; i++) {
      const sx = xa + 0.6 + r() * Math.max(0.1, w - 1.2);
      const sh = Math.min(h - 5, 3 + r() * 6);
      if (sh < 2) continue;
      const y0 = GY + 4.3 + r() * 1.5;
      const bg = pick(NEON), fg = bg === '#ffffff' || bg === '#ffcf4a' || bg === '#7cff6b' || bg === '#35e0ff' ? '#111' : '#fff';
      const word = pick(NEON_WORDS);
      b.deco('flat:#222', sx - 0.12, y0, zf - 1.3, sx + 0.12, y0 + sh, zf - 0.1);
      b.sign({ k: 'shop', ja: word, bg, fg, vertical: true }, sx + 0.13, y0 + sh / 2, zf - 0.7, [1, 0], 1.1, sh - 0.2);
      b.sign({ k: 'shop', ja: word, bg, fg, vertical: true }, sx - 0.13, y0 + sh / 2, zf - 0.7, [-1, 0], 1.1, sh - 0.2);
    }
  }
  if (style === 'neon' && r() < 0.6) {
    const s = pick(SHOPS);
    b.sign({ k: 'shop', ja: s.ja, en: s.en, bg: pick(NEON), fg: '#111' }, xa + w / 2, GY + h - 1.6, zf - 0.06, [0, -1], Math.min(w - 1, 7), 2.2);
  }
  if (style === 'oldtown') {
    // Deep eaves and a noren curtain.
    b.deco('roof', xa - 0.2, GY + 3.0, zf - 1.1, xb + 0.2, GY + 3.2, zf + 0.2);
    b.deco('roof', xa - 0.3, GY + h, zf - 0.6, xb + 0.3, GY + h + 0.3, zf + depth + 0.3);
    b.deco('flat:#27406b', xa + w / 2 - 1.1, GY + 1.9, zf - 0.09, xa + w / 2 + 1.1, GY + 2.7, zf - 0.07);
  }
}

export function fillLots(b: Builder, r: () => number, style: BlockStyle, xa: number, xb: number, z0: number, zMax = PLOT_Z) {
  if (style === 'park' || style === 'sea' || style === 'dome') return;
  const st = STYLE[style];
  let x = xa;
  while (xb - x > 4) {
    let w = st.w[0] + r() * (st.w[1] - st.w[0]);
    if (xb - x - w < st.w[0] * 0.8) w = xb - x;
    const depth = st.d[0] + r() * (st.d[1] - st.d[0]);
    building(b, r, style, x, x + w, z0, depth);
    x += w;
  }
  // Back row: bigger blocks that close off the view.
  const back = style === 'house' || style === 'oldtown' || style === 'godown' ? 'apartment' : style === 'campus' ? 'campus' : style === 'warehouse' ? 'warehouse' : 'mixed';
  const bs = STYLE[back];
  const zb = z0 + st.d[1] + (style === 'campus' ? 22 : 5);
  x = xa;
  while (xb - x > 6) {
    let w = 20 + r() * 22;
    if (xb - x - w < 16) w = xb - x;
    const floors = Math.round(bs.floors[0] + r() * (bs.floors[1] - bs.floors[0])) + (style === 'office' ? 6 : 2);
    const mat = bs.mat[Math.floor(r() * bs.mat.length)];
    if (zMax - 1 - zb > 6) b.box(mat, x + 0.5, GY, zb, x + w - 0.5, GY + floors * 3.3, zMax - 1);
    x += w;
  }
}

/**
 * A front row of Blender-built buildings (stations/buildings.ts) on lots facing -z at z0, for a business
 * district: mostly offices, some zakkyo buildings, one glass tower if asked for. Plain blocks behind.
 * `cornerAtStart`: the lot at xa stands on a street corner (a corner model, its second face towards -x).
 */
export function fillModelLots(b: Builder, r: () => number, xa: number, xb: number, z0: number, zMax: number, o: { tower?: boolean; cornerAtStart?: boolean; old?: boolean; noBack?: boolean } = {}): Lot[] {
  const GAP = 0.3;
  const deep: [number, number, number][] = []; // x0, x1, depth of the towers, for the back row
  const placed: Lot[] = [];
  let x = xa + (o.cornerAtStart ? GAP : 0), n = 0, last = '', towerDue = !!o.tower;
  for (;;) {
    const room = xb - x;
    const fits = BUILDING_MODELS.filter((m) => m.w <= room && z0 + m.d < zMax - 2 && `${m.kind}_${m.id}` !== last);
    // An old quarter: shophouses, a few zakkyo buildings and apartment blocks. Otherwise business blocks.
    const kinds = o.old ? ['shophouse', 'zakkyo', 'manshon'] : ['office', 'zakkyo'];
    let pool = fits.filter((m) => !!m.corner === (n === 0 && !!o.cornerAtStart) && kinds.includes(m.kind));
    if (towerDue && n >= 2) {
      const towers = fits.filter((m) => m.kind === 'tower');
      if (towers.length) pool = towers;
      towerDue = false;
    } else if (pool.length) {
      const q = r();
      const kind = o.old ? (q < 0.62 ? 'shophouse' : q < 0.85 ? 'zakkyo' : 'manshon') : q < 0.7 ? 'office' : 'zakkyo';
      const ofKind = pool.filter((m) => m.kind === kind);
      if (ofKind.length) pool = ofKind;
    }
    if (!pool.length) break;
    const m = pool[Math.floor(r() * pool.length)];
    b.block(x, GY, z0, x + m.w, GY + m.h, z0 + m.d);
    b.model(m.kind, m.id, x + m.w / 2, GY, z0, Math.floor(r() * 1000));
    placed.push([x, z0, x + m.w, z0 + m.d]);
    if (m.kind === 'tower') deep.push([x, x + m.w, m.d]);
    last = `${m.kind}_${m.id}`;
    x += m.w + GAP;
    n++;
  }
  if (xb - x > 2) {
    b.box('facade:grid:#b9b3a6', x, GY, z0 + 0.3, xb - 0.2, GY + 13, z0 + 10);
    placed.push([x, z0, xb, z0 + 10]);
  }
  if (o.noBack) return placed;
  // Back row: plain blocks that close off the view, standing clear of the towers.
  const bs = STYLE.mixed;
  x = xa;
  while (xb - x > 6) {
    let w = 20 + r() * 22;
    if (xb - x - w < 16) w = xb - x;
    // Behind an old quarter's low fronts the back row is lower and closer.
    const floors = Math.round(bs.floors[0] + r() * (bs.floors[1] - bs.floors[0])) + (o.old ? 0 : 6);
    const mat = bs.mat[Math.floor(r() * bs.mat.length)];
    const zb = Math.max(z0 + (o.old ? 15 : 26), ...deep.filter((d) => d[0] < x + w && d[1] > x).map((d) => z0 + d[2] + 3));
    if (zMax - 1 - zb > 6) b.box(mat, x + 0.5, GY, zb, x + w - 0.5, GY + floors * 3.3, zMax - 1);
    x += w;
  }
  return placed;
}

/** A building's lot in plan: [x0, z0, x1, z1]. */
type Lot = [number, number, number, number];
const lotsOverlap = (a: Lot, c: Lot, m = 0.2) => a[0] < c[2] - m && a[2] > c[0] + m && a[1] < c[3] - m && a[3] > c[1] + m;

/**
 * A row of Blender-built buildings fronting a side street or a canal bank: fronts on the line
 * x = xf facing `face` (±1 along x), from z0 to z1, no deeper than `depth`. The first `full` are
 * full models (you can walk up to them), the rest simplified copies. Lots in `taken` are kept
 * clear; the row's own lots are added to it.
 */
function sideRow(b: Builder, r: () => number, xf: number, face: 1 | -1, z0: number, z1: number, depth: number, taken: Lot[], o: { old: boolean; full: number }) {
  const kinds = o.old ? ['shophouse', 'shophouse', 'zakkyo'] : ['office', 'zakkyo'];
  const L = z1 - z0;
  let u = 0, n = 0, last = '';
  for (let guard = 0; guard < 80 && L - u > 4; guard++) {
    const kind = kinds[Math.floor(r() * kinds.length)];
    const fits = BUILDING_MODELS.filter((m) => kinds.includes(m.kind) && !m.corner && m.d <= depth && m.w <= L - u && `${m.kind}_${m.id}` !== last);
    // The kind drawn, or any kind of the row that fits (an office is too deep for a side row).
    const pool = fits.some((m) => m.kind === kind) ? fits.filter((m) => m.kind === kind) : fits;
    if (!pool.length) break;
    const m = pool[Math.floor(r() * pool.length)];
    const za = face > 0 ? z0 + u : z1 - u - m.w;
    const lot: Lot = [face > 0 ? xf - m.d : xf, za, face > 0 ? xf : xf + m.d, za + m.w];
    if (taken.some((t) => lotsOverlap(lot, t))) {
      u += 2;
      continue;
    }
    b.block(lot[0], GY, lot[1], lot[2], GY + m.h, lot[3]);
    b.with({ rot: face > 0 ? 1 : 3, t: [xf, 0, face > 0 ? z0 : z1] }, () => b.model(m.kind, n < o.full ? m.id : `${m.id}_lo`, u + m.w / 2, GY, 0, Math.floor(r() * 1000)));
    taken.push(lot);
    last = `${m.kind}_${m.id}`;
    u += m.w + 0.3;
    n++;
  }
  // Nobody walks in behind the row: one collider over its whole length, and a plain block closing whatever is left at its end.
  b.block(face > 0 ? xf - depth : xf + 0.4, GY, z0, face > 0 ? xf - 0.4 : xf + depth, GY + 6, z1);
  if (L - u > 1.2) {
    const [za, zc] = face > 0 ? [z0 + u, z1] : [z0, z1 - u];
    const lot: Lot = [face > 0 ? xf - depth + 1 : xf, za, face > 0 ? xf : xf + depth - 1, zc];
    if (!taken.some((t) => lotsOverlap(lot, t))) b.box('facade:grid:#b9b3a6', lot[0], GY, lot[1], lot[2], GY + 11, lot[3]);
  }
}

/**
 * A back row of simplified Blender-built buildings behind a front row, facing the main road:
 * apartment blocks and zakkyo buildings in an old quarter, offices and apartment blocks elsewhere.
 */
function modelBackRow(b: Builder, r: () => number, xa: number, xb: number, zb: number, zMax: number, taken: Lot[], old: boolean) {
  const kinds = old ? ['manshon', 'zakkyo', 'zakkyo'] : ['office', 'office', 'manshon'];
  let x = xa, last = '';
  for (let guard = 0; guard < 80 && xb - x > 5; guard++) {
    const kind = kinds[Math.floor(r() * kinds.length)];
    const fits = BUILDING_MODELS.filter((m) => kinds.includes(m.kind) && !m.corner && m.w <= xb - x && zb + m.d < zMax - 1 && (!old || m.h < 30) && `${m.kind}_${m.id}` !== last);
    const pool = fits.some((m) => m.kind === kind) ? fits.filter((m) => m.kind === kind) : fits;
    if (!pool.length) break;
    const m = pool[Math.floor(r() * pool.length)];
    const lot: Lot = [x, zb, x + m.w, zb + m.d];
    if (taken.some((t) => lotsOverlap(lot, t))) {
      x += 2;
      continue;
    }
    b.block(lot[0], GY, lot[1], lot[2], GY + m.h, lot[3]);
    b.model(m.kind, `${m.id}_lo`, x + m.w / 2, GY, zb, 0);
    taken.push(lot);
    last = `${m.kind}_${m.id}`;
    x += m.w + 0.4;
  }
}

/** Zebra crossing: stripes run along `alongX ? x : z`. */
export function crosswalk(b: Builder, cx: number, cz: number, len: number, width: number, stripesAlongX: boolean) {
  const n = Math.floor(len / 0.9);
  for (let i = 0; i < n; i++) {
    const o = -len / 2 + 0.25 + i * 0.9;
    if (stripesAlongX) b.deco('flat:#e9e9e4', cx - width / 2, 0.006, cz + o, cx + width / 2, 0.012, cz + o + 0.45);
    else b.deco('flat:#e9e9e4', cx + o, 0.006, cz - width / 2, cx + o + 0.45, 0.012, cz + width / 2);
  }
}

/** Depth of the row of buildings fronting a side street, and of the one fronting a canal bank (model streets). */
const SIDE_ROW = 12, CANAL_ROW = 10.5;

export function surface(b: Builder, spec: SurfaceSpec, cw: number, stationName: { ja: string; en: string }, at?: { id: string; dir: [number, number] }) {
  const r = rng(spec.seed);
  // Model streets: the backdrop city round the plot is Blender-built too, old and low towards the canal.
  if (spec.models) b.out.district = { radius: 330, old: [spec.canalAt ?? 0, 0], oldRadius: spec.canalAt !== undefined ? 150 : 0 };
  const X = PLOT_X, Z = PLOT_Z;
  const rw = spec.roadHalf;
  const swOut = cw + 5.5;
  const aveHalf = 10;
  const crossHalf = 3.5;
  const canal = spec.canalAt;
  const streets = spec.cross.filter((x) => x !== canal).map((x) => [x - crossHalf, x + crossHalf]);
  if (spec.avenue) streets.push([-aveHalf, aveHalf]);
  const holes = b.out.holes.map((h) => [...h]);
  const canalHoles: number[][] = canal !== undefined ? [[canal - 7, swOut + 1.5, canal + 7, Z], [canal - 7, -Z, canal + 7, -swOut - 1.5]] : [];
  const seaZ = 52;
  const seaHoles: number[][] = [];
  if (spec.right === 'sea') seaHoles.push([-X, seaZ, X, Z]);
  if (spec.left === 'sea') seaHoles.push([-X, -Z, X, -seaZ]);
  if (spec.valleyZ !== undefined) seaHoles.push([-X, spec.valleyZ, X, Z]);

  // ── Ground ──
  b.slab('asphalt', -X, -Z, X, Z, -0.6, 0, [...holes, ...canalHoles, ...seaHoles]);
  const roadHoles = [[-X, -rw, X, rw], ...streets.map(([a, c]) => [a, -Z, c, Z])];
  b.slab('paver', -X, -Z, X, Z, 0, GY, [...holes, ...canalHoles, ...seaHoles, ...roadHoles]);
  b.zone('street', -X, -0.3, -Z, X, 80, Z, `${stationName.ja}駅前`, `${stationName.en} — street level`);
  // Plot boundary.
  b.block(-X - 1, -1, -Z - 1, -X, 40, Z + 1);
  b.block(X, -1, -Z - 1, X + 1, 40, Z + 1);
  b.block(-X, -1, -Z - 1, X, 40, -Z);
  b.block(-X, -1, Z, X, 40, Z + 1);

  // ── Road markings ──
  const nearStreet = (x: number, m: number) => streets.some(([a, c]) => x > a - m && x < c + m) || (canal !== undefined && Math.abs(x - canal) < 2);
  for (let x = -X; x < X; x += 6) {
    if (nearStreet(x + 1.5, 9)) continue;
    b.deco('flat:#e9e9e4', x, 0.004, -rw / 2 - 0.07, x + 3, 0.01, -rw / 2 + 0.07);
    b.deco('flat:#e9e9e4', x, 0.004, rw / 2 - 0.07, x + 3, 0.01, rw / 2 + 0.07);
  }
  let seg = -X;
  for (const [a, c] of [...streets].sort((p, q) => p[0] - q[0]).concat([[X, X]])) {
    if (a - 9 > seg) b.deco('flat:#e6a700', seg, 0.004, -0.08, a - 9, 0.01, 0.08);
    seg = c + 9;
  }
  for (const [a, c] of streets) {
    const mid = (a + c) / 2, half = (c - a) / 2;
    crosswalk(b, a - 4, 0, 2 * rw - 0.6, 4, true);
    crosswalk(b, c + 4, 0, 2 * rw - 0.6, 4, true);
    crosswalk(b, mid, rw + 3.2, 2 * half - 0.4, 4, false);
    crosswalk(b, mid, -rw - 3.2, 2 * half - 0.4, 4, false);
    b.deco('flat:#e9e9e4', a - 7.2, 0.004, -rw, a - 6.8, 0.01, 0);
    b.deco('flat:#e9e9e4', c + 6.8, 0.004, 0, c + 7.2, 0.01, rw);
    if (!spec.roadKit) {
      signal(b, a - 7.5, rw + 0.7, -rw * 0.8, -1, true);
      signal(b, c + 7.5, -rw - 0.7, rw * 0.8, 1, true);
    }
    // Centre line of the cross street.
    for (const s of [-1, 1]) b.deco('flat:#e9e9e4', mid - 0.06, 0.004, s > 0 ? rw + 7 : -Z, mid + 0.06, 0.01, s > 0 ? Z : -rw - 7);
  }

  // ── Kerb-side: guard rails, lamps, trees, poles ──
  const openings = streets.map(([a, c]) => [a - 7, c + 7]);
  if (canal !== undefined) openings.push([canal - 0.01, canal + 0.01]);
  for (const s of [-1, 1]) {
    const zr = s * (rw + 0.3);
    const lo = Math.min(zr - 0.04, zr + 0.04), hi = Math.max(zr - 0.04, zr + 0.04);
    // The road kit leaves the kerb open at its bus stops and taxi stand.
    const gaps = spec.roadKit ? kerbGaps(streets.map(([a, c]) => [a, c] as [number, number])).filter((k) => k.s === s).map((k) => [k.x0, k.x1]) : [];
    const g = [...openings, ...gaps].sort((p, q) => p[0] - q[0]);
    let x = -X;
    for (const [from, to] of g.concat([[X, X]])) {
      for (let xa = x; xa < from - 0.5; xa += 2.5) {
        const xb = Math.min(xa + 2.5, from);
        b.block(xa, GY, lo, xb, GY + 0.9, hi);
        if (spec.roadKit && xb - xa > 2.45) {
          kerbRail(b, (xa + xb) / 2, zr);
          continue;
        }
        b.deco('flat:#eeeeea', xa + 0.05, GY + 0.7, lo, xb - 0.05, GY + 0.82, hi);
        b.deco('flat:#eeeeea', xa + 0.05, GY + 0.35, lo, xb - 0.05, GY + 0.45, hi);
        b.deco('flat:#eeeeea', xa, GY, lo - 0.02, xa + 0.1, GY + 0.9, hi + 0.02);
      }
      x = to;
    }
    // Street lights by what stands on this side: highway masts on avenues and by offices, shopping-street
    // lamps by shops, low lanterns by parks, campuses and the sea. Where the street has utility poles
    // and houses, the poles carry the lights. (With the road kit, the kit places them.)
    const style = s < 0 ? spec.left : spec.right;
    const lampKind: LampKind | null = spec.avenue || style === 'office' ? 'lamp_hw' : style === 'mixed' || style === 'neon' ? 'lamp_shop'
      : style === 'house' || style === 'apartment' ? (spec.poles ? null : 'lamp_hw') : 'lamp_park';
    if (!spec.roadKit && lampKind) for (let xl = -X + 12; xl < X; xl += 32) if (!nearStreet(xl, 9)) streetLamp(b, lampKind, xl, s * (rw + 0.9), [0, -s]);
    if (spec.trees) for (let xt = -X + 5; xt < X; xt += 16) if (!nearStreet(xt, 10)) tree(b, xt, s * (rw + 1.6), 5.5 + r() * 1.5, spec.treeLeaf);
    if (spec.poles) {
      poleLine(b, { axis: 'x', from: -X - 7, to: X, at: s * (swOut - 0.5), road: -s as 1 | -1, step: 30, skip: (u) => nearStreet(u, 6), drops: 0.9, cross: s > 0 ? 2 * (swOut - 0.5) - 0.6 : undefined, name: stationName });
    }
  }

  // ── Traffic ──
  const carCols = ['#e8e8e8', '#30343a', '#9c1f1f', '#1f4e8c', '#c9c2a8', '#5f6a72'];
  for (let i = 0; i < 9; i++) {
    const x = -X + 14 + r() * (2 * X - 28);
    if (nearStreet(x, 14)) continue;
    const lane = r() < 0.5 ? -1 : 1;
    const taxi = r() < 0.3;
    const cz = lane * (rw - 1.4 - (r() < 0.4 ? rw / 2 : 0)), col = taxi ? '#1d4d2b' : carCols[Math.floor(r() * carCols.length)];
    // (The road kit places its own vehicles; the draws above still happen so the street stays the same.)
    if (!spec.roadKit) car(b, x, cz, col, true, taxi);
  }
  // The kit's street lights follow the street: highway masts on an avenue or by offices, shopping-street lamps by shops; none where the utility poles carry them.
  const kitLamp: LampKind | undefined = spec.avenue || spec.left === 'office' || spec.right === 'office' ? 'lamp_hw'
    : spec.left === 'mixed' || spec.left === 'neon' || spec.right === 'mixed' || spec.right === 'neon' ? 'lamp_shop' : spec.poles ? undefined : 'lamp_hw';
  if (spec.roadKit) roadKit(b, { X, Z, rw, swOut, streets: streets.map(([a, c]) => [a, c] as [number, number]), canal, seed: spec.seed, name: stationName, at, lamp: kitLamp });

  // ── Buildings ──
  const edges = [-X + 1, ...[...streets].sort((p, q) => p[0] - q[0]).flatMap(([a, c]) => [a - 3, c + 3]), X - 1];
  if (canal !== undefined) {
    const i = edges.findIndex((e) => e > canal);
    // A stone canal has a quay walk with willows on each bank: the lots stand further back.
    // With model buildings, a row of them fronts each bank: the avenue's lots stop short of it.
    const bank = spec.canalStone ? (spec.models ? 14 + CANAL_ROW + 0.5 : 14) : 10;
    edges.splice(i, 0, canal - bank, canal + bank);
  }
  for (const side of [-1, 1] as const) {
    const style = side < 0 ? spec.left : spec.right;
    b.with({ mz: side < 0 }, () => {
      for (let i = 0; i < edges.length; i += 2) {
        const xa = edges[i], xb = edges[i + 1];
        if (xb - xa < 6) continue;
        const lm = spec.landmark;
        // Model lots: old shophouses near a canal, business blocks elsewhere, one tower on the −z side.
        const lots = (a: number, c: number): void => {
          if (!spec.models) return fillLots(b, r, style, a, c, swOut);
          // The old quarter reaches 60 m from the canal: a lot that spans its edge is filled in two parts.
          const edge = canal !== undefined ? [canal - 60, canal + 60].find((e) => e - a >= 8 && c - e >= 8) : undefined;
          if (edge !== undefined) return void (lots(a, edge), lots(edge, c));
          const old = canal !== undefined && Math.abs((a + c) / 2 - canal) < 60;
          const taken = fillModelLots(b, r, a, c, swOut, PLOT_Z, { old, tower: !old && side < 0 && c - a > 60, noBack: true });
          // Where the lot ends at a side street, a row of buildings fronts that street behind the corner.
          const onStreet = (x: number) => streets.some(([p, q]) => Math.abs(x - (p - 3)) < 0.01 || Math.abs(x - (q + 3)) < 0.01);
          let ia = a, ic = c;
          if (onStreet(c) && c - a > SIDE_ROW + 2) {
            sideRow(b, r, c, 1, swOut + 22, PLOT_Z - 2, SIDE_ROW, taken, { old, full: 2 });
            ic = c - SIDE_ROW - 1;
          }
          if (onStreet(a) && c - a > SIDE_ROW + 2) {
            sideRow(b, r, a, -1, swOut + 22, PLOT_Z - 2, SIDE_ROW, taken, { old, full: 2 });
            ia = a + SIDE_ROW + 1;
          }
          modelBackRow(b, r, ia, ic, swOut + (old ? 15 : 26), PLOT_Z, taken, old);
        };
        // Lots kept out of the ordinary fill: the composer's own, and any convenience store's.
        const kept: [number, number][] = [];
        if (lm && lm.side === side && lm.x0 < xb && lm.x1 > xa) kept.push([lm.x0, lm.x1]);
        for (const k of spec.konbini ?? []) {
          if (k.side !== side) continue;
          const kw = k.type === 'ground' ? 24 : KONBINI[k.type].w + 0.6;
          if (k.x0 < xa || k.x0 + kw > xb) continue;
          kept.push([k.x0, k.x0 + kw]);
          const xm = k.x0 + kw / 2, back = k.type === 'roadside' ? CAR_PARK : 0;
          if (k.type === 'ground') {
            // In the base of a block with a shop bay (build_city.py mid_k: 24 × 20 m, bay 12 × 10.2 × 4).
            b.block(k.x0, GY, swOut, xm - 6, GY + 36, swOut + 20);
            b.block(xm + 6, GY, swOut, k.x0 + 24, GY + 36, swOut + 20);
            b.block(xm - 6, GY, swOut + 10.2, xm + 6, GY + 36, swOut + 20);
            b.block(xm - 6, GY + 4, swOut, xm + 6, GY + 36, swOut + 10.2);
            b.model('city', 'mid_k', xm, GY, swOut, 3);
          }
          b.with({ t: [xm, 0, swOut + back] }, () => konbini(b, { type: k.type, chain: k.chain }));
        }
        if (kept.length) {
          kept.sort((p, q) => p[0] - q[0]);
          let from = xa;
          for (const [p, q] of kept) {
            if (p - from >= 6) lots(from, p);
            from = q;
          }
          if (xb - from >= 6) lots(from, xb);
          continue;
        }
        if (side < 0 && spec.arcadeAt !== undefined && Math.abs(xb + 3 + crossHalf - spec.arcadeAt) < 1) {
          fillLots(b, r, 'oldtown', xa, xb, swOut);
        } else if (style === 'park') {
          // Houses either side of the park (which spans x = -62 … 22).
          if (xa < -66) fillLots(b, r, 'house', xa, Math.min(xb, -64), swOut);
          if (xb > 28) fillLots(b, r, 'house', Math.max(xa, 24), xb, swOut);
        } else if (spec.models && (style === 'mixed' || style === 'office')) lots(xa, xb);
        else fillLots(b, r, style, xa, xb, swOut, side > 0 && spec.valleyZ !== undefined ? spec.valleyZ - 2 : PLOT_Z);
      }
      // Shophouses fronting the canal on both banks, behind anything the composer built there.
      if (canal !== undefined && spec.canalStone && spec.models) {
        const lm = spec.landmark && spec.landmark.side === side ? spec.landmark : undefined;
        for (const face of [1, -1] as const) {
          const xf = canal - face * 14;
          const [p, q] = face > 0 ? [xf - CANAL_ROW, xf] : [xf, xf + CANAL_ROW];
          const z0 = lm && lm.x0 < q && lm.x1 > p ? swOut + (lm.depth ?? 0) + 1.5 : swOut;
          sideRow(b, r, xf, face, z0, PLOT_Z - 2, CANAL_ROW, [], { old: true, full: 2 });
          // Beside the composer's building the bank is a small quay garden: a line of trees and benches.
          for (let z = swOut + 4; z < z0 - 3; z += 6.5) {
            tree(b, xf - face * 2.6, z, 5.6, 'leaf2');
            b.box('wood:#6b5440', xf - face * 2.9 - 0.25, GY, z + 2.4, xf - face * 2.9 + 0.25, GY + 0.45, z + 4.2);
          }
        }
      }
      if (style === 'park') park(b, r, swOut, spec.parkName ?? { ja: '緑坂公園', en: 'Midorizaka Park' }, spec.treeLeaf);
      if (style === 'sea') b.open(() => (spec.waterfront === 'promenade' ? promenade(b, r, swOut, seaZ, spec.treeLeaf, spec.promenadeName) : quay(b, r, swOut, seaZ, spec.quayName)));
      if (style === 'campus') campusFront(b, swOut, spec.campusName);
      if (style === 'dome') dome(b, swOut);
    });
  }

  // ── Sidewalk life near the exits ──
  for (const h of holes) {
    const zc = (h[1] + h[3]) / 2, s = Math.sign(zc);
    if (Math.abs(zc) > swOut) continue; // an opening inside a lot (a composer's own building), not an exit stair
    vending(b, h[0] - 2.2, GY, s * (swOut - 0.6), [0, -s], r() < 0.5 ? 'vending' : 'vending2');
    // Parked bicycles.
    for (let i = 0; i < 4; i++) {
      const bx = h[2] + 3 + i * 0.7;
      b.deco('flat:#3a3f45', bx, GY + 0.3, s * (swOut - 0.4) - 0.8, bx + 0.06, GY + 0.95, s * (swOut - 0.4) + 0.8);
      b.deco(`flat:${carCols[(i + 2) % carCols.length]}`, bx - 0.03, GY + 0.6, s * (swOut - 0.4) - 0.5, bx + 0.09, GY + 0.72, s * (swOut - 0.4) + 0.3);
    }
  }

  if (canal !== undefined) b.open(() => canalFeature(b, canal, swOut, Z, spec.canalName ?? { ja: '瓢箪橋', en: 'Hyōtan-bashi' }, !!spec.canalLanterns, !!spec.canalStone));
  if (spec.arcadeAt !== undefined) arcade(b, spec.arcadeAt, swOut, spec.arcadeName ?? { ja: '商店街', en: 'Shopping Arcade' });
  if (spec.avenue) {
    // The crossing avenue gets its own lane lines and trees.
    for (let z = swOut + 9; z < Z; z += 6) {
      for (const s of [-1, 1]) {
        b.deco('flat:#e9e9e4', -aveHalf / 2 - 0.07, 0.004, s * z, -aveHalf / 2 + 0.07, 0.01, s * (z + 3));
        b.deco('flat:#e9e9e4', aveHalf / 2 - 0.07, 0.004, s * z, aveHalf / 2 + 0.07, 0.01, s * (z + 3));
      }
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (let z = swOut + 12; z < Z - 4; z += 15) tree(b, sx * (aveHalf + 1.6), sz * z, 6.2, 'leaf2');
  }
}

function park(b: Builder, r: () => number, z0: number, name: { ja: string; en: string }, leaf = 'leaf') {
  // Canonical side (+z): a small neighbourhood park between x = -60 and 20.
  b.box('grass', -62, GY, z0 + 1.5, 22, GY + 0.06, z0 + 40);
  for (let i = 0; i < 16; i++) tree(b, -58 + r() * 76, z0 + 5 + r() * 32, 5 + r() * 3, leaf !== 'leaf' ? leaf : r() < 0.3 ? 'leaf2' : 'leaf');
  b.box('wood:#6b5440', -22, GY, z0 + 12, -19.5, GY + 0.45, z0 + 12.5);
  b.box('wood:#6b5440', -12, GY, z0 + 12, -9.5, GY + 0.45, z0 + 12.5);
  // Slide + swings, stylised.
  b.box('flat:#e53935', 2, GY, z0 + 18, 3.2, GY + 2.2, z0 + 19.2);
  b.deco('flat:#1e88e5', 3.2, GY + 0.2, z0 + 18.2, 6.5, GY + 0.5, z0 + 19);
  b.box('flat:#fdd835', -40, GY, z0 + 20, -39.85, GY + 2.4, z0 + 24);
  b.deco('flat:#fdd835', -40, GY + 2.3, z0 + 20, -37, GY + 2.4, z0 + 20.15);
  b.sign({ k: 'label', text: name.ja, sub: name.en, fg: '#fff', bg: '#2e7d32' }, -20, GY + 1.3, z0 + 1.6, [0, -1], 3, 0.9);
  b.box('flat:#cfcabe', -21.8, GY, z0 + 1.62, -18.2, GY + 1.9, z0 + 1.8);
}

function quay(b: Builder, r: () => number, z0: number, seaZ: number, name = { ja: '川湊港フェリーターミナル', en: 'Kawaminato Ferry Terminal' }) {
  // Waterfront promenade: railing, water, gantry cranes, a ferry terminal.
  const X = PLOT_X;
  b.box('water', -X, -1.6, seaZ, X, -1.2, PLOT_Z + 60, false);
  b.box('concrete', -X, -2, seaZ - 0.4, X, GY, seaZ);
  for (let x = -X; x < X; x += 3) {
    b.block(x, GY, seaZ - 0.5, x + 3, GY + 1.1, seaZ - 0.4);
    b.deco('flat:#e8e8e8', x, GY + 0.95, seaZ - 0.5, x + 3, GY + 1.05, seaZ - 0.42);
    b.deco('flat:#e8e8e8', x, GY, seaZ - 0.5, x + 0.1, GY + 1.05, seaZ - 0.42);
  }
  for (const cx of [-80, 60]) {
    // Gantry crane.
    for (const dx of [-7, 7]) for (const dz of [-6, 0]) b.box('flat:#d9482b', cx + dx - 0.5, GY, seaZ - 4 + dz - 0.5, cx + dx + 0.5, GY + 24, seaZ - 4 + dz + 0.5);
    b.deco('flat:#d9482b', cx - 8, GY + 24, seaZ - 11, cx + 8, GY + 26, seaZ - 3);
    b.deco('flat:#d9482b', cx - 1, GY + 26, seaZ - 14, cx + 1, GY + 27.5, seaZ + 26);
    b.deco('flat:#f4f4f0', cx - 2, GY + 21, seaZ + 6, cx + 2, GY + 24, seaZ + 9);
  }
  // Ferry terminal.
  b.box('facade:office:#9fb7c9', -30, GY, z0 + 8, 10, GY + 9, seaZ - 8);
  b.sign({ k: 'label', text: name.ja, sub: name.en, fg: '#fff', bg: '#0d3b66' }, -10, GY + 7.2, z0 + 7.94, [0, -1], 22, 2.4);
  b.deco('glassDark', -14, GY, z0 + 7.95, -6, GY + 3.2, z0 + 8);
  for (let i = 0; i < 10; i++) tree(b, -120 + i * 9 + r() * 2, z0 + 3, 4.5, 'leaf2');
  // Moored ferry.
  b.box('flat:#f4f4f0', -20, -1.4, seaZ + 6, 36, 3.2, seaZ + 18, false);
  b.deco('flat:#0d3b66', -20, 0.2, seaZ + 5.95, 36, 0.9, seaZ + 18.05);
  b.deco('flat:#f4f4f0', -8, 3.2, seaZ + 8, 22, 6.2, seaZ + 16);
  b.deco('flat:#d9482b', 6, 6.2, seaZ + 10.5, 10, 9, seaZ + 13.5);
}

function promenade(b: Builder, r: () => number, z0: number, seaZ: number, leaf = 'leaf2', name = { ja: '夕凪プロムナード', en: 'Yūnagi Promenade' }) {
  // Sunset promenade where the Mio-gawa meets the bay: a boardwalk, benches facing the water,
  // a breakwater lighthouse.
  const X = PLOT_X;
  b.box('water', -X, -1.6, seaZ, X, -1.2, PLOT_Z + 60, false);
  b.box('concrete', -X, -2, seaZ - 0.4, X, GY, seaZ);
  b.deco('wood:#8a6a4c', -X, GY, seaZ - 9, X, GY + 0.04, seaZ - 0.4);
  for (let x = -X; x < X; x += 3) {
    b.block(x, GY, seaZ - 0.5, x + 3, GY + 1.1, seaZ - 0.4);
    b.deco('wood:#6b5440', x, GY + 0.95, seaZ - 0.52, x + 3, GY + 1.1, seaZ - 0.4);
    b.deco('flat:#3a3f45', x, GY, seaZ - 0.5, x + 0.08, GY + 1.0, seaZ - 0.42);
  }
  for (let x = -X + 10; x < X - 6; x += 14) {
    b.box('wood:#6b5440', x - 1.2, GY, seaZ - 3.2, x + 1.2, GY + 0.45, seaZ - 2.7);
    b.deco('wood:#6b5440', x - 1.2, GY + 0.45, seaZ - 3.25, x + 1.2, GY + 0.95, seaZ - 3.15);
  }
  for (let i = 0; i < 14; i++) tree(b, -X + 6 + i * 18 + r() * 3, z0 + 4, 4.8 + r(), leaf);
  // Breakwater with a red lighthouse, out in the water.
  b.deco('concrete', 20, -1.6, seaZ + 34, X, GY + 0.6, seaZ + 38);
  b.mesh('flat:#d9482b', 'cyl', 96, GY + 6, seaZ + 36, 2.4, 11, 2.4);
  b.mesh('flat:#f4f4f0', 'cyl', 96, GY + 12.2, seaZ + 36, 2.0, 1.6, 2.0);
  b.deco('glow:#fff1c4', 95.4, GY + 11.6, seaZ + 35.4, 96.6, GY + 12.6, seaZ + 36.6);
  b.box('flat:#0d3b66', -3.6, GY, z0 + 8.6, 3.6, GY + 2.2, z0 + 8.9);
  b.sign({ k: 'label', text: name.ja, sub: name.en, fg: '#fff', bg: '#0d3b66' }, 0, GY + 1.4, z0 + 8.58, [0, -1], 7, 1.4);
  // River-mouth marker at the railing, like a river office's kilometre post.
  b.box('flat:#f4f4f0', -40.15, GY, seaZ - 1.6, -39.85, GY + 2.4, seaZ - 1.3);
  b.sign({ k: 'label', text: '澪川 河口', sub: 'Mio-gawa river mouth', fg: '#1b1f24', bg: '#f4f4f0' }, -40, GY + 1.9, seaZ - 1.62, [0, -1], 2.6, 0.8);
}

function dome(b: Builder, z0: number) {
  // Kawaminato Dome: a low drum and a shallow roof shell across a paved forecourt.
  const cx = -8, cz = z0 + 50, R = 37;
  b.box('paver', -PLOT_X + 1, GY, z0 + 1, PLOT_X - 1, GY + 0.04, z0 + 12);
  b.mesh('panel:#dfe3e6', 'cyl', cx, GY + 5.5, cz, 2 * R, 11, 2 * R);
  b.mesh('flat:#f1f3f4', 'sphere', cx, GY + 11, cz, 2 * R - 1, 22, 2 * R - 1);
  b.mesh('flat:#0f7a8a', 'cyl', cx, GY + 10.6, cz, 2 * R + 0.8, 0.9, 2 * R + 0.8);
  b.block(cx - R * 0.72, GY, cz - R * 0.72, cx + R * 0.72, GY + 12, cz + R * 0.72);
  b.block(cx - R, GY, cz - R * 0.35, cx + R, GY + 12, cz + R * 0.35);
  b.block(cx - R * 0.35, GY, cz - R, cx + R * 0.35, GY + 12, cz + R);
  // Gate canopy and name.
  b.box('flat:#3b4046', cx - 12, GY + 4.4, z0 + 12.2, cx + 12, GY + 5.0, z0 + 15);
  for (const px of [-11, -4, 4, 11]) b.box('flat:#8d949b', cx + px - 0.2, GY, z0 + 12.4, cx + px + 0.2, GY + 4.4, z0 + 12.8);
  b.sign({ k: 'label', text: '川湊ドーム', sub: 'Kawaminato Dome', fg: '#fff', bg: '#0f7a8a' }, cx, GY + 6.4, z0 + 12.18, [0, -1], 22, 2.6);
  b.deco('flat:#3b4046', cx - 11.2, GY + 5.0, z0 + 12.2, cx + 11.2, GY + 7.8, z0 + 12.3);
  for (const g of [-9, -6, -3, 0, 3, 6, 9]) b.box('flat:#c4c8cc', cx + g - 0.5, GY, z0 + 13.6, cx + g + 0.5, GY + 1.0, z0 + 13.9);
  // Flag poles and floodlight masts.
  const flags = ['#b7282e', '#0f7a8a', '#f1f3f4'];
  [-60, -45, 30, 45, 60].forEach((fx, i) => {
    b.box('flat:#b7bcc2', fx - 0.06, GY, z0 + 6, fx + 0.06, GY + 9, z0 + 6.12);
    b.deco(`flat:${flags[i % 3]}`, fx + 0.06, GY + 7.4, z0 + 6.03, fx + 1.9, GY + 8.8, z0 + 6.09);
  });
  for (const [mx, mz] of [[cx - R - 6, cz - 18], [cx + R + 6, cz - 18]]) {
    b.box('flat:#6f767d', mx - 0.3, GY, mz - 0.3, mx + 0.3, GY + 30, mz + 0.3);
    b.deco('light', mx - 3, GY + 30, mz - 0.4, mx + 3, GY + 33, mz + 0.4);
  }
  for (let x = -120; x < 120; x += 14) if (Math.abs(x - cx) > 16) tree(b, x, z0 + 3.5, 5.5, 'leaf2');
}

function campusFront(b: Builder, z0: number, name = { ja: '川湊大学', en: 'Kawaminato University' }) {
  // University gate, lawn and avenue of trees in front of the brick halls.
  b.box('grass', -124, GY, z0 + 1, 60, GY + 0.05, z0 + 5.5);
  for (const gx of [-5, 5]) {
    b.box('brick:#8a4f3b', gx - 0.9, GY, z0 + 0.6, gx + 0.9, GY + 3.6, z0 + 2.4);
    b.deco('flat:#ded6c4', gx - 1.05, GY + 3.6, z0 + 0.45, gx + 1.05, GY + 3.9, z0 + 2.55);
  }
  b.sign({ k: 'label', text: name.ja, sub: name.en, fg: '#f6e7c8', bg: '#3d2014' }, -5, GY + 2.2, z0 + 0.58, [0, -1], 1.5, 1.6);
  b.sign({ k: 'label', text: '正門', sub: 'Main Gate', fg: '#f6e7c8', bg: '#3d2014' }, 5, GY + 2.2, z0 + 0.58, [0, -1], 1.5, 1.6);
  for (let x = -120; x < 58; x += 9) if (Math.abs(x) > 8) tree(b, x, z0 + 3.2, 6.5, 'leaf2');
  for (let x = -100; x < 50; x += 3) if (Math.abs(x) > 6) b.box('flat:#3a3f45', x, GY, z0 + 0.9, x + 2.9, GY + 1.3, z0 + 1.0);
}

function canalFeature(b: Builder, cx: number, swOut: number, Z: number, name: { ja: string; en: string }, lanterns: boolean, stone = false) {
  if (stone) return stoneCanal(b, cx, swOut, Z, name);
  for (const s of [-1, 1]) {
    const za = s * (swOut + 1.5), zb = s * Z;
    const lo = Math.min(za, zb), hi = Math.max(za, zb);
    b.box('water', cx - 7, -3.4, lo, cx + 7, -2.8, hi, false);
    b.deco('concreteDark', cx - 7.4, -3.4, lo, cx - 7, 0, hi);
    b.deco('concreteDark', cx + 7, -3.4, lo, cx + 7.4, 0, hi);
    // Railings along both banks and across the bridge side.
    for (const ex of [cx - 7.2, cx + 7.2]) {
      b.block(ex - 0.08, GY, lo, ex + 0.08, GY + 1.1, hi);
      b.deco('flat:#7a1f1f', ex - 0.06, GY + 0.95, lo, ex + 0.06, GY + 1.08, hi);
      for (let z = lo; z < hi; z += 2) b.deco('flat:#7a1f1f', ex - 0.05, GY, z, ex + 0.05, GY + 1.0, z + 0.1);
    }
    b.block(cx - 7.2, GY, za - 0.1, cx + 7.2, GY + 1.1, za + 0.1);
    b.deco('flat:#7a1f1f', cx - 7.2, GY + 0.2, za - 0.12, cx + 7.2, GY + 1.1, za + 0.12);
    // Lanterns on the bridge parapet.
    for (let x = cx - 6; x <= cx + 6; x += 4) b.deco('glow:#ffb74d', x - 0.18, GY + 1.1, za - 0.18, x + 0.18, GY + 1.6, za + 0.18);
    // Lantern strings along both banks, on poles every 8 m.
    if (lanterns) {
      for (const ex of [cx - 8.2, cx + 8.2]) {
        for (let z = lo + 3; z < hi - 2; z += 8) {
          b.box('wood:#4a3a2e', ex - 0.07, GY, z - 0.07, ex + 0.07, GY + 3.4, z + 0.07);
          for (let k = 1; k < 4; k++) b.deco('glow:#ffb05a', ex - 0.2, GY + 2.55, z + k * 2 - 0.2, ex + 0.2, GY + 3.05, z + k * 2 + 0.2);
          b.deco('flat:#3a2f28', ex - 0.015, GY + 3.2, z, ex + 0.015, GY + 3.23, Math.min(z + 8, hi));
        }
      }
    }
    // Pleasure boat.
    b.deco('wood:#6b5440', cx - 1.6, -2.9, s * (swOut + 14) - 4, cx + 1.6, -2.3, s * (swOut + 14) + 4);
    b.deco('glow:#ff7043', cx - 1.4, -2.3, s * (swOut + 14) - 3, cx + 1.4, -0.9, s * (swOut + 14) + 3);
  }
  b.sign({ k: 'label', text: name.ja, sub: name.en, fg: '#fff', bg: '#7a1f1f' }, cx, GY + 0.65, swOut + 1.37, [0, -1], 2.4, 0.7);
}

/**
 * An old canal with stone banks and willows, crossed by a stone arch bridge with bronze lamps
 * (Tsumugibashi). The bridge is a model (exchange_bridge, tools/blender/build_exchange.py: its
 * HALF and ZA are the 7 m half width and swOut + 1.5 here); the colliders and the water are ours.
 */
function stoneCanal(b: Builder, cx: number, swOut: number, Z: number, name: { ja: string; en: string }) {
  const za0 = swOut + 1.5;
  if (Math.abs(za0 - 38) > 0.01) throw new Error('stoneCanal: the bridge model is built for parapets at z = ±38 (build_exchange.py ZA)');
  for (const s of [-1, 1]) {
    const za = s * za0, zb = s * Z;
    const lo = Math.min(za, zb), hi = Math.max(za, zb);
    b.box('water', cx - 7, -3.4, lo, cx + 7, -2.8, hi, false);
    for (const ex of [cx - 7, cx + 7]) {
      const o = ex < cx ? -1 : 1;
      // Coursed stone banks, a coping, and a low stone rail with iron bars.
      for (let k = 0; k < 6; k++) b.deco(k % 2 ? 'flat:#8d8371' : 'flat:#7d7361', Math.min(ex, ex + o * 0.4), -3.4 + k * 0.57, lo, Math.max(ex, ex + o * 0.4), -3.4 + (k + 1) * 0.57 + 0.01, hi);
      b.deco('flat:#b3a688', Math.min(ex - o * 0.08, ex + o * 0.5), GY, lo, Math.max(ex - o * 0.08, ex + o * 0.5), GY + 0.14, hi);
      const rx = ex + o * 0.2;
      b.block(rx - 0.08, GY, lo, rx + 0.08, GY + 1.1, hi);
      b.deco('metal:#2e3134', rx - 0.03, GY + 0.95, lo, rx + 0.03, GY + 1.02, hi);
      b.deco('metal:#2e3134', rx - 0.02, GY + 0.5, lo, rx + 0.02, GY + 0.54, hi);
      for (let z = lo + 0.2; z < hi; z += 3) b.deco('flat:#b3a688', rx - 0.12, GY, z - 0.12, rx + 0.12, GY + 1.12, z + 0.12);
      // Willows along both banks.
      for (let z = lo + 6; z < hi - 3; z += 11) tree(b, ex + o * 1.6, z, 6.4, 'leaf2');
    }
    // The bridge's parapet and its four name posts.
    b.block(cx - 7.6, GY, za - 0.14, cx + 7.6, GY + 1.1, za + 0.14);
    for (const x of [cx - 7.6, cx + 7.6]) b.block(x - 0.42, GY, za - 0.42, x + 0.42, GY + 3.6, za + 0.42);
    // A cargo punt moored under the bank.
    const bz = s * (swOut + 16);
    b.deco('wood:#6b5440', cx - 5.6, -2.9, bz - 3.5, cx - 3.4, -2.45, bz + 3.5);
    b.deco('wood:#4a3a2e', cx - 5.4, -2.45, bz - 3.3, cx - 3.6, -2.4, bz + 3.3);
    for (const [k, c] of ['#1f6f9d', '#b4472f', '#efe6cf'].entries()) b.deco('flat:' + c, cx - 5.2, -2.4, bz - 2.4 + k * 1.5, cx - 3.8, -2.0, bz - 1.3 + k * 1.5);
    // Name plate on the road face of the solid panel in the middle of each parapet.
    b.sign({ k: 'label', text: name.ja, sub: name.en, fg: '#2a2019', bg: '#b08d3a' }, cx, GY + 0.56, za - s * 0.11, [0, -s], 2.4, 0.6);
  }
  b.model('exchange', 'bridge', cx, GY, 0);
}

function arcade(b: Builder, cx: number, swOut: number, name: { ja: string; en: string }) {
  // Covered shotengai running away from the main road on the -z side.
  const z0 = -swOut - 1, z1 = -PLOT_Z + 2;
  for (const s of [-1, 1]) {
    for (let z = z0; z > z1; z -= 8) b.box('flat:#b9482b', cx + s * 4.2 - 0.12, GY, z - 0.12, cx + s * 4.2 + 0.12, GY + 7, z + 0.12);
    b.deco('flat:#b9482b', cx + s * 4.2 - 0.1, GY + 6.8, z1, cx + s * 4.2 + 0.1, GY + 7, z0);
  }
  // Translucent pitched roof in three facets.
  b.deco('glassRoof', cx - 4.3, GY + 7.0, z1, cx - 1.6, GY + 7.12, z0);
  b.deco('glassRoof', cx - 1.6, GY + 7.9, z1, cx + 1.6, GY + 8.02, z0);
  b.deco('glassRoof', cx + 1.6, GY + 7.0, z1, cx + 4.3, GY + 7.12, z0);
  // Gate sign and hanging lanterns.
  b.deco('flat:#b9482b', cx - 4.4, GY + 5.2, z0 - 0.1, cx + 4.4, GY + 7.2, z0 + 0.1);
  b.sign({ k: 'label', text: name.ja, sub: name.en, fg: '#fff8e1', bg: '#b9482b' }, cx, GY + 6.2, z0 + 0.12, [0, 1], 8.4, 1.8);
  for (let z = z0 - 6; z > z1; z -= 6) {
    b.deco('glow:#ffcc80', cx - 0.25, GY + 5.6, z - 0.25, cx + 0.25, GY + 6.3, z + 0.25);
    b.deco('flat:#222', cx - 0.02, GY + 6.3, z - 0.02, cx + 0.02, GY + 7.9, z + 0.02);
  }
  // Paved arcade floor over the cross street.
  b.box('floor:#d9c7a8', cx - 3.5, 0, z1, cx + 3.5, GY, z0 + 1);
}
