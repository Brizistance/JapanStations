// Street level around a station: roads, sidewalks, crossings, buildings, street furniture.
// Generated from a small spec + a seeded RNG, so each station gets a distinct but
// repeatable neighbourhood. Coordinates are station-frame metres (x along the line).

import { rng, type Builder } from '../world/builder';
import { GROUND_Y, vending } from './kit';

export type BlockStyle = 'office' | 'mixed' | 'neon' | 'apartment' | 'house' | 'oldtown' | 'warehouse' | 'campus' | 'park' | 'sea';

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
}

export const PLOT_X = 130;
export const PLOT_Z = 85;
const GY = GROUND_Y;

interface Shop {
  ja: string;
  en: string;
  bg: string;
  fg: string;
}
const SHOPS: Shop[] = [
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
  b.mesh('flat:#5b4a3a', 'cyl', x, GY + h * 0.3, z, 0.32, h * 0.6, 0.32);
  b.mesh(leaf, 'sphere', x, GY + h * 0.78, z, h * 0.62, h * 0.6, h * 0.62);
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
function signal(b: Builder, x: number, z: number, armZ: number, faceX: 1 | -1, green: boolean) {
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

function fillLots(b: Builder, r: () => number, style: BlockStyle, xa: number, xb: number, z0: number) {
  if (style === 'park' || style === 'sea') return;
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
  const back = style === 'house' || style === 'oldtown' ? 'apartment' : style === 'campus' ? 'campus' : style === 'warehouse' ? 'warehouse' : 'mixed';
  const bs = STYLE[back];
  const zb = z0 + st.d[1] + (style === 'campus' ? 22 : 5);
  x = xa;
  while (xb - x > 6) {
    let w = 20 + r() * 22;
    if (xb - x - w < 16) w = xb - x;
    const floors = Math.round(bs.floors[0] + r() * (bs.floors[1] - bs.floors[0])) + (style === 'office' ? 6 : 2);
    const mat = bs.mat[Math.floor(r() * bs.mat.length)];
    if (PLOT_Z - 1 - zb > 6) b.box(mat, x + 0.5, GY, zb, x + w - 0.5, GY + floors * 3.3, PLOT_Z - 1);
    x += w;
  }
}

/** Zebra crossing: stripes run along `alongX ? x : z`. */
function crosswalk(b: Builder, cx: number, cz: number, len: number, width: number, stripesAlongX: boolean) {
  const n = Math.floor(len / 0.9);
  for (let i = 0; i < n; i++) {
    const o = -len / 2 + 0.25 + i * 0.9;
    if (stripesAlongX) b.deco('flat:#e9e9e4', cx - width / 2, 0.006, cz + o, cx + width / 2, 0.012, cz + o + 0.45);
    else b.deco('flat:#e9e9e4', cx + o, 0.006, cz - width / 2, cx + o + 0.45, 0.012, cz + width / 2);
  }
}

export function surface(b: Builder, spec: SurfaceSpec, cw: number, stationName: { ja: string; en: string }) {
  const r = rng(spec.seed);
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
    signal(b, a - 7.5, rw + 0.7, -rw * 0.8, -1, true);
    signal(b, c + 7.5, -rw - 0.7, rw * 0.8, 1, true);
    // Centre line of the cross street.
    for (const s of [-1, 1]) b.deco('flat:#e9e9e4', mid - 0.06, 0.004, s > 0 ? rw + 7 : -Z, mid + 0.06, 0.01, s > 0 ? Z : -rw - 7);
  }

  // ── Kerb-side: guard rails, lamps, trees, poles ──
  const openings = streets.map(([a, c]) => [a - 7, c + 7]);
  if (canal !== undefined) openings.push([canal - 0.01, canal + 0.01]);
  for (const s of [-1, 1]) {
    const zr = s * (rw + 0.3);
    const lo = Math.min(zr - 0.04, zr + 0.04), hi = Math.max(zr - 0.04, zr + 0.04);
    const g = [...openings].sort((p, q) => p[0] - q[0]);
    let x = -X;
    for (const [from, to] of g.concat([[X, X]])) {
      for (let xa = x; xa < from - 0.5; xa += 2.5) {
        const xb = Math.min(xa + 2.5, from);
        b.block(xa, GY, lo, xb, GY + 0.9, hi);
        b.deco('flat:#eeeeea', xa + 0.05, GY + 0.7, lo, xb - 0.05, GY + 0.82, hi);
        b.deco('flat:#eeeeea', xa + 0.05, GY + 0.35, lo, xb - 0.05, GY + 0.45, hi);
        b.deco('flat:#eeeeea', xa, GY, lo - 0.02, xa + 0.1, GY + 0.9, hi + 0.02);
      }
      x = to;
    }
    for (let xl = -X + 12; xl < X; xl += 32) if (!nearStreet(xl, 9)) lamp(b, xl, s * (rw + 0.9), -s);
    if (spec.trees) for (let xt = -X + 5; xt < X; xt += 16) if (!nearStreet(xt, 10)) tree(b, xt, s * (rw + 1.6), 5.5 + r() * 1.5);
    if (spec.poles) {
      for (let xp = -X + 8; xp < X; xp += 30) if (!nearStreet(xp, 6)) utilityPole(b, xp, s * (swOut - 0.5));
      b.deco('flat:#222', -X, GY + 8.25, s * (swOut - 0.5) - 0.02, X, GY + 8.28, s * (swOut - 0.5) + 0.02);
      b.deco('flat:#222', -X, GY + 7.6, s * (swOut - 0.5) + 0.3, X, GY + 7.63, s * (swOut - 0.5) + 0.34);
    }
  }

  // ── Traffic ──
  const carCols = ['#e8e8e8', '#30343a', '#9c1f1f', '#1f4e8c', '#c9c2a8', '#5f6a72'];
  for (let i = 0; i < 9; i++) {
    const x = -X + 14 + r() * (2 * X - 28);
    if (nearStreet(x, 14)) continue;
    const lane = r() < 0.5 ? -1 : 1;
    const taxi = r() < 0.3;
    car(b, x, lane * (rw - 1.4 - (r() < 0.4 ? rw / 2 : 0)), taxi ? '#1d4d2b' : carCols[Math.floor(r() * carCols.length)], true, taxi);
  }

  // ── Buildings ──
  const edges = [-X + 1, ...[...streets].sort((p, q) => p[0] - q[0]).flatMap(([a, c]) => [a - 3, c + 3]), X - 1];
  if (canal !== undefined) {
    const i = edges.findIndex((e) => e > canal);
    edges.splice(i, 0, canal - 10, canal + 10);
  }
  for (const side of [-1, 1] as const) {
    const style = side < 0 ? spec.left : spec.right;
    b.with({ mz: side < 0 }, () => {
      for (let i = 0; i < edges.length; i += 2) {
        const xa = edges[i], xb = edges[i + 1];
        if (xb - xa < 6) continue;
        if (side < 0 && spec.arcadeAt !== undefined && Math.abs(xb + 3 + crossHalf - spec.arcadeAt) < 1) {
          fillLots(b, r, 'oldtown', xa, xb, swOut);
        } else if (style === 'park') {
          // Houses either side of the park (which spans x = -62 … 22).
          if (xa < -66) fillLots(b, r, 'house', xa, Math.min(xb, -64), swOut);
          if (xb > 28) fillLots(b, r, 'house', Math.max(xa, 24), xb, swOut);
        } else fillLots(b, r, style, xa, xb, swOut);
      }
      if (style === 'park') park(b, r, swOut);
      if (style === 'sea') quay(b, r, swOut, seaZ);
      if (style === 'campus') campusFront(b, swOut);
    });
  }

  // ── Sidewalk life near the exits ──
  for (const h of holes) {
    const zc = (h[1] + h[3]) / 2, s = Math.sign(zc);
    vending(b, h[0] - 2.2, GY, s * (swOut - 0.6), [0, -s], r() < 0.5 ? 'vending' : 'vending2');
    // Parked bicycles.
    for (let i = 0; i < 4; i++) {
      const bx = h[2] + 3 + i * 0.7;
      b.deco('flat:#3a3f45', bx, GY + 0.3, s * (swOut - 0.4) - 0.8, bx + 0.06, GY + 0.95, s * (swOut - 0.4) + 0.8);
      b.deco(`flat:${carCols[(i + 2) % carCols.length]}`, bx - 0.03, GY + 0.6, s * (swOut - 0.4) - 0.5, bx + 0.09, GY + 0.72, s * (swOut - 0.4) + 0.3);
    }
  }

  if (canal !== undefined) canalFeature(b, canal, swOut, Z);
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

function park(b: Builder, r: () => number, z0: number) {
  // Canonical side (+z): a small neighbourhood park between x = -60 and 20.
  b.box('grass', -62, GY, z0 + 1.5, 22, GY + 0.06, z0 + 40);
  for (let i = 0; i < 16; i++) tree(b, -58 + r() * 76, z0 + 5 + r() * 32, 5 + r() * 3, r() < 0.3 ? 'leaf2' : 'leaf');
  b.box('wood:#6b5440', -22, GY, z0 + 12, -19.5, GY + 0.45, z0 + 12.5);
  b.box('wood:#6b5440', -12, GY, z0 + 12, -9.5, GY + 0.45, z0 + 12.5);
  // Slide + swings, stylised.
  b.box('flat:#e53935', 2, GY, z0 + 18, 3.2, GY + 2.2, z0 + 19.2);
  b.deco('flat:#1e88e5', 3.2, GY + 0.2, z0 + 18.2, 6.5, GY + 0.5, z0 + 19);
  b.box('flat:#fdd835', -40, GY, z0 + 20, -39.85, GY + 2.4, z0 + 24);
  b.deco('flat:#fdd835', -40, GY + 2.3, z0 + 20, -37, GY + 2.4, z0 + 20.15);
  b.sign({ k: 'label', text: '緑坂公園', sub: 'Midorizaka Park', fg: '#fff', bg: '#2e7d32' }, -20, GY + 1.3, z0 + 1.6, [0, -1], 3, 0.9);
  b.box('flat:#cfcabe', -21.8, GY, z0 + 1.62, -18.2, GY + 1.9, z0 + 1.8);
}

function quay(b: Builder, r: () => number, z0: number, seaZ: number) {
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
  b.sign({ k: 'label', text: '川湊港フェリーターミナル', sub: 'Kawaminato Ferry Terminal', fg: '#fff', bg: '#0d3b66' }, -10, GY + 7.2, z0 + 7.94, [0, -1], 22, 2.4);
  b.deco('glassDark', -14, GY, z0 + 7.95, -6, GY + 3.2, z0 + 8);
  for (let i = 0; i < 10; i++) tree(b, -120 + i * 9 + r() * 2, z0 + 3, 4.5, 'leaf2');
  // Moored ferry.
  b.box('flat:#f4f4f0', -20, -1.4, seaZ + 6, 36, 3.2, seaZ + 18, false);
  b.deco('flat:#0d3b66', -20, 0.2, seaZ + 5.95, 36, 0.9, seaZ + 18.05);
  b.deco('flat:#f4f4f0', -8, 3.2, seaZ + 8, 22, 6.2, seaZ + 16);
  b.deco('flat:#d9482b', 6, 6.2, seaZ + 10.5, 10, 9, seaZ + 13.5);
}

function campusFront(b: Builder, z0: number) {
  // University gate, lawn and avenue of trees in front of the brick halls.
  b.box('grass', -124, GY, z0 + 1, 60, GY + 0.05, z0 + 5.5);
  for (const gx of [-5, 5]) {
    b.box('brick:#8a4f3b', gx - 0.9, GY, z0 + 0.6, gx + 0.9, GY + 3.6, z0 + 2.4);
    b.deco('flat:#ded6c4', gx - 1.05, GY + 3.6, z0 + 0.45, gx + 1.05, GY + 3.9, z0 + 2.55);
  }
  b.sign({ k: 'label', text: '川湊大学', sub: 'Kawaminato University', fg: '#f6e7c8', bg: '#3d2014' }, -5, GY + 2.2, z0 + 0.58, [0, -1], 1.5, 1.6);
  b.sign({ k: 'label', text: '正門', sub: 'Main Gate', fg: '#f6e7c8', bg: '#3d2014' }, 5, GY + 2.2, z0 + 0.58, [0, -1], 1.5, 1.6);
  for (let x = -120; x < 58; x += 9) if (Math.abs(x) > 8) tree(b, x, z0 + 3.2, 6.5, 'leaf2');
  for (let x = -100; x < 50; x += 3) if (Math.abs(x) > 6) b.box('flat:#3a3f45', x, GY, z0 + 0.9, x + 2.9, GY + 1.3, z0 + 1.0);
}

function canalFeature(b: Builder, cx: number, swOut: number, Z: number) {
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
    // Pleasure boat.
    b.deco('wood:#6b5440', cx - 1.6, -2.9, s * (swOut + 14) - 4, cx + 1.6, -2.3, s * (swOut + 14) + 4);
    b.deco('glow:#ff7043', cx - 1.4, -2.3, s * (swOut + 14) - 3, cx + 1.4, -0.9, s * (swOut + 14) + 3);
  }
  b.sign({ k: 'label', text: '瓢箪橋', sub: 'Hyōtan-bashi', fg: '#fff', bg: '#7a1f1f' }, cx, GY + 0.65, swOut + 1.37, [0, -1], 2.4, 0.7);
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
