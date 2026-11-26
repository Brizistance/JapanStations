// Street level around a station: roads, sidewalks, crossings, buildings, street furniture.
// Generated from a small spec + a seeded RNG, so each station gets a distinct but
// repeatable neighbourhood. Coordinates are station-frame metres (x along the line).

import { DEFAULT_PLOT, rng, type Builder, type LanePart, type V3 } from '../world/builder';
import { CAR_PARK, KONBINI, konbini, type ChainId } from './konbini';
import { PLACES, place, type PlaceKind } from './places';
import { PIECES, type PieceId } from './pieces';
import { grandCanal, piece } from './hyotanbori-street';
import { HORIE_PIECES, horiePiece, quietCanal } from './minamihorie-street';
import { TSURU_PIECES, tsuruArcade, tsuruPiece } from './tsurumatsu-street';
import { KAISEI_PIECES, kaiseiPiece } from './kaiseicho-street';
import { MIDORI_PIECES, midoriPiece } from './midorizaka-street';
import { modelTree, type TreeKind } from './trees';
import { kerbGaps, kerbRail, mark, pedSignal, poleLine, roadKit, roadModel, roadSign, shortSignal, streetLamp, trafficLane, type LampKind } from './roads';
import { BUILDING_MODELS, type BuildingModel } from './buildings';
import { GROUND_Y, vending } from './kit';

export type BlockStyle = 'office' | 'mixed' | 'neon' | 'apartment' | 'house' | 'oldtown' | 'godown' | 'warehouse' | 'campus' | 'park' | 'sea' | 'dome';
/** How much traffic a street of each kind carries (1: an ordinary shopping street). */
const BUSY: Record<BlockStyle, number> = { office: 1.2, mixed: 1.1, neon: 1.1, apartment: 0.7, house: 0.5, oldtown: 0.5, godown: 0.5, warehouse: 0.65, campus: 0.6, park: 0.6, sea: 0.6, dome: 0.85 };

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
  /** Hyōtan-bashi made grand (hyotanbori-street.ts): the vermilion bridge with corner gates, walks on both banks, the pier. */
  canalGrand?: boolean;
  /** A quiet canal (minamihorie-street.ts): stone walks under cherries, the teal bridge, steps to the water. */
  canalQuiet?: boolean;
  /** The arcade built from models (tsurumatsu-street.ts): gate, glazed roof bays, shop rows down both sides. */
  arcadeModel?: boolean;
  /** An old quarter all through (model streets): shophouses and small blocks, not only near a canal. */
  oldTown?: boolean;
  /** Central-Osaka small streets through the model blocks: 6.5 m streets back from the main road and one parallel to it, poles and wires, traffic both ways. */
  smallStreets?: boolean;
  /** The exits rise in pavilions that run on past the stair head (looks/midorizaka.ts): no bicycles or vending machines there. */
  pavilions?: boolean;
  /** Share of small streets with a signal where they cross the parallel one (default 0.4). */
  smallSignals?: number;
  /** Road names for the blue boards (docs/worldbuilding.md): the main road, the crossing roads west to east. */
  roadNames?: { main: { ja: string; en: string }; cross: { ja: string; en: string }[] };
  /** Junction names west to east, for the plates on the signals (default: the area and a chōme). */
  junctions?: { ja: string; en: string }[];
  /** Carry the crossing avenue (x = 0) on along −z as a boulevard to local z = `to`, where the next station's plot begins. */
  boulevard?: { to: number; south?: number };
  /** The cross streets run only to the +z side (roads.ts `tee`): on −z an arcade or a lane takes their place. */
  tee?: boolean;
  /** The station's one-off pieces (pieces.ts), each on its own lot like `places`: `x0` is the lot's low-x edge. */
  pieces?: { id: PieceId; side: -1 | 1; x0: number; ja: string; en: string }[];
  /**
   * Convenience stores you can walk into (stations/konbini.ts), each on its own lot on one side of
   * the main road: `x0` is the lot's low-x edge. A 'ground' shop stands in the base of a block.
   */
  konbini?: { type: 'corner' | 'ground' | 'roadside'; chain: ChainId; side: -1 | 1; x0: number }[];
  /** Small street places (stations/places.ts), each on its own lot on one side of the main road: `x0` is the lot's low-x edge. */
  places?: { kind: PlaceKind; side: -1 | 1; x0: number; ja: string; en: string }[];
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
  /** Model trees (stations/trees.ts) along the main road in place of the plain ones: the kinds, used in turn by block. */
  treeKinds?: TreeKind[];
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
export function fillModelLots(b: Builder, r: () => number, xa: number, xb: number, z0: number, zMax: number, o: { tower?: boolean; cornerAtStart?: boolean; old?: boolean; night?: boolean; noBack?: boolean; lo?: boolean; kinds?: string[]; open?: boolean; /** How thick with shop signs: 0 ordinary, 1 quiet, 2 busy (default: busy at night spots, quiet in old quarters). */ signs?: 0 | 1 | 2; /** No standing signs at the doors (a row with no street in front). */ bare?: boolean } = {}): Lot[] {
  const GAP = 0.3;
  const tier = o.signs ?? (o.night ? 2 : o.old ? 1 : 0);
  const deep: [number, number, number][] = []; // x0, x1, depth of the towers, for the back row
  const placed: Lot[] = [];
  let x = xa + (o.cornerAtStart ? GAP : 0), n = 0, last = '', towerDue = !!o.tower;
  for (;;) {
    const room = xb - x;
    const fits = BUILDING_MODELS.filter((m) => m.w <= room && z0 + m.d < zMax - 2 && `${m.kind}_${m.id}` !== last);
    // An old quarter: shophouses, a few zakkyo buildings and apartment blocks. Otherwise business blocks.
    // A nightlife street: narrow zakkyo buildings of bars, a few old shophouses between them.
    const kinds = o.kinds ?? (o.night ? ['zakkyo', 'shophouse'] : o.old ? ['shophouse', 'zakkyo', 'manshon'] : ['office', 'zakkyo']);
    let pool = fits.filter((m) => !!m.corner === (n === 0 && !!o.cornerAtStart) && kinds.includes(m.kind));
    if (towerDue && n >= 2) {
      const towers = fits.filter((m) => m.kind === 'tower');
      if (towers.length) pool = towers;
      towerDue = false;
    } else if (pool.length) {
      const q = r();
      const kind = o.kinds ? o.kinds[Math.floor(q * o.kinds.length)] : o.night ? (q < 0.75 ? 'zakkyo' : 'shophouse') : o.old ? (q < 0.62 ? 'shophouse' : q < 0.85 ? 'zakkyo' : 'manshon') : q < 0.7 ? 'office' : 'zakkyo';
      const ofKind = pool.filter((m) => m.kind === kind);
      if (ofKind.length) pool = ofKind;
    }
    if (!pool.length) break;
    const m = pool[Math.floor(r() * pool.length)];
    b.block(x, GY, z0, x + m.w, GY + m.h, z0 + m.d);
    // (The thousands of the seed tell the sign painter what kind of street this is: render/building-models.ts.)
    b.model(m.kind, o.lo ? `${m.id}_lo` : m.id, x + m.w / 2, GY, z0, Math.floor(r() * 1000) + tier * 1000);
    if (!o.lo && !o.bare) frontSigns(b, m, x, z0, tier);
    placed.push([x, z0, x + m.w, z0 + m.d]);
    if (m.kind === 'tower') deep.push([x, x + m.w, m.d]);
    last = `${m.kind}_${m.id}`;
    x += m.w + GAP;
    n++;
  }
  // What is left at the end of the row: an alley if it is narrow, a plain block if it is wide.
  if (xb - x >= 1.6 && xb - x <= 9) {
    alley(b, r, x + 0.1, xb - 0.1, z0, 10, o.open);
    const lot: Lot = [x, z0, xb, z0 + 10];
    ALLEY_LOTS.add(lot);
    placed.push(lot);
  } else if (xb - x > 2) {
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

const STAND_INKS = ['#b3261e', '#1f4e8c', '#1f6b45', '#d9861a', '#2a2d32', '#6a2c70', '#0f7f86'];
const CABINET = 'flat:#24272b';

/**
 * A building's own signs on the pavement at its front (facing −z at z0, from x): a standing lightbox
 * end-on to the pavement, a plate of the tenants by floor at the door of a multi-tenant building,
 * and on a busy street a banner flag. More of them the busier the street (`tier`, as in fillModelLots).
 * Placed from the lot's position, not from the street's random stream, so nothing else moves.
 */
function frontSigns(b: Builder, m: BuildingModel, x: number, z0: number, tier: number) {
  if (!['zakkyo', 'shophouse', 'office', 'machi', 'yokocho', 'ichiba'].includes(m.kind) || m.w < 4.5) return;
  const q = rng(Math.abs(Math.round(x * 131 + z0 * 17 + m.w * 7)) + 3);
  const shops = m.kind !== 'office';
  const wear = shops ? 0.15 + q() * 0.5 : 0.05;
  if (shops && q() < [0.35, 0.15, 0.7][tier]) {
    const sx = x + m.w - 0.7, zc = z0 - 0.42;
    const ja = NEON_WORDS[Math.floor(q() * NEON_WORDS.length)], bg = STAND_INKS[Math.floor(q() * STAND_INKS.length)], white = q() < 0.4;
    b.deco(CABINET, sx - 0.2, GY, zc - 0.26, sx + 0.2, GY + 0.06, zc + 0.26);
    b.deco(CABINET, sx - 0.07, GY + 0.06, zc - 0.24, sx + 0.07, GY + 1.5, zc + 0.24);
    b.block(sx - 0.2, GY, zc - 0.26, sx + 0.2, GY + 1.5, zc + 0.26);
    for (const s of [1, -1]) b.sign({ k: 'shop', ja, bg, fg: '#ffffff', vertical: true, box: { mark: 'none', face: 'gothic', ground: white ? 'white' : 'solid', wear } }, sx + s * 0.075, GY + 0.8, zc, [s, 0], 0.44, 1.32);
  }
  if ((m.kind === 'zakkyo' || m.kind === 'office') && q() < [0.4, 0.25, 0.6][tier]) {
    const px = x + 0.65, zf = z0 - 0.3, n = Math.min(5, Math.max(3, Math.floor(m.h / 3.3) - 1)), from = Math.floor(q() * SHOPS.length);
    b.deco(CABINET, px - 0.32, GY, zf - 0.05, px + 0.32, GY + 0.62 + n * 0.19, zf + 0.05);
    b.block(px - 0.32, GY, zf - 0.08, px + 0.32, GY + 0.62 + n * 0.19, zf + 0.08);
    for (let k = 0; k < n; k++) {
      const s = SHOPS[(from + k * 5) % SHOPS.length];
      b.sign({ k: 'shop', ja: s.ja, bg: s.bg, fg: s.fg, box: { mark: 'none', face: 'gothic', ground: 'white', wear: wear * 0.6, tag: `${k + 2}F` } }, px, GY + 0.62 + k * 0.19, zf - 0.055, [0, -1], 0.58, 0.17);
    }
  }
  if (shops && tier === 2 && q() < 0.3) {
    const f = NOBORI[Math.floor(q() * NOBORI.length)], px = x + m.w * 0.5, pz = z0 - 0.5, d = b.dir([0, -1]);
    b.out.models.push({ kind: 'road', id: 'nobori', pos: b.pt(px, GY, pz), yaw: Math.atan2(-d[0], -d[1]), seed: 0, merge: true });
    b.block(px - 0.2, GY, pz - 0.2, px + 0.2, GY + 2.6, pz + 0.2);
    for (const s of [1, -1]) b.sign({ k: 'shop', ja: f.ja, bg: f.bg, fg: f.fg, vertical: true }, px + 0.13, GY + 1.85, pz - s * 0.012, [0, -s], 0.42, 1.65);
  }
}

/** A building's lot in plan: [x0, z0, x1, z1]. */
type Lot = [number, number, number, number];
/** Lots that are alleys, not buildings: no front to put doorstep life against. */
const ALLEY_LOTS = new WeakSet<Lot>();
/** Whether a lot fillModelLots returned is the alley it left at a row's end (no building on it). */
export const isAlleyLot = (l: Lot) => ALLEY_LOTS.has(l);
const lotsOverlap = (a: Lot, c: Lot, m = 0.2) => a[0] < c[2] - m && a[2] > c[0] + m && a[1] < c[3] - m && a[3] > c[1] + m;

/**
 * A row of Blender-built buildings fronting a side street or a canal bank: fronts on the line
 * x = xf facing `face` (±1 along x), from z0 to z1, no deeper than `depth`. The first `full` are
 * full models (you can walk up to them), the rest simplified copies. Lots in `taken` are kept
 * clear; the row's own lots are added to it.
 */
function sideRow(b: Builder, r: () => number, xf: number, face: 1 | -1, z0: number, z1: number, depth: number, taken: Lot[], o: { old: boolean; full: number; kinds?: string[]; open?: boolean }) {
  const kinds = o.kinds ?? (o.old ? ['shophouse', 'shophouse', 'zakkyo'] : ['office', 'zakkyo']);
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
  if (!o.open) b.block(face > 0 ? xf - depth : xf + 0.4, GY, z0, face > 0 ? xf - 0.4 : xf + depth, GY + 6, z1);
  if (L - u > 1.2) {
    const [za, zc] = face > 0 ? [z0 + u, z1] : [z0, z1 - u];
    const lot: Lot = [face > 0 ? xf - depth + 1 : xf, za, face > 0 ? xf : xf + depth - 1, zc];
    if (!taken.some((t) => lotsOverlap(lot, t))) {
      // A narrow gap reads as an alley off the side street; a wide one stays a plain block.
      if (zc - za <= 9) b.with({ rot: face > 0 ? 1 : 3, t: [xf, 0, face > 0 ? za : zc] }, () => alley(b, r, 0.1, zc - za - 0.1, 0, Math.min(depth, 10), o.open));
      else b.box('facade:grid:#b9b3a6', lot[0], GY, lot[1], lot[2], GY + 11, lot[3]);
    }
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
  if (spec.models) b.out.district = { radius: 450, old: [spec.canalAt ?? 0, 0], oldRadius: spec.canalAt !== undefined ? 150 : 0 };
  const X = PLOT_X, Z = PLOT_Z;
  const rw = spec.roadHalf;
  const swOut = cw + 5.5;
  const aveHalf = 10;
  const crossHalf = 3.5;
  const canal = spec.canalAt;
  /** Distance from a canal's middle to the building line on its banks, where it has a quay walk. */
  const quayAt = spec.canalStone || spec.canalQuiet ? 14 : spec.canalGrand ? 11 : undefined;
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
    if (spec.treeKinds) {
      const kinds = spec.treeKinds;
      for (let xt = -X + 5; xt < X; xt += 16) if (!nearStreet(xt, 10)) modelTree(b, kinds[Math.floor((xt + 400) / 48) % kinds.length], xt, s * (rw + 1.6), Math.round(xt) % 3 ? 'a' : 'b', GY, true);
    } else if (spec.trees) for (let xt = -X + 5; xt < X; xt += 16) if (!nearStreet(xt, 10)) tree(b, xt, s * (rw + 1.6), 5.5 + r() * 1.5, spec.treeLeaf);
    if (spec.poles) {
      poleLine(b, { axis: 'x', from: -X - 7, to: X, at: s * (swOut - 0.5), road: -s as 1 | -1, step: 30, skip: (u) => nearStreet(u, 6), drops: 0.9, cross: s > 0 ? 2 * (swOut - 0.5) - 0.6 : undefined, name: stationName });
    }
  }

  // ── Traffic ──
  // (It moves now, traffic/system.ts; the draws of the parked box cars stay so the street keeps its look.)
  const carCols = ['#e8e8e8', '#30343a', '#9c1f1f', '#1f4e8c', '#c9c2a8', '#5f6a72'];
  for (let i = 0; i < 9; i++) {
    const x = -X + 14 + r() * (2 * X - 28);
    if (nearStreet(x, 14)) continue;
    r();
    if (!(r() < 0.3)) r();
    r();
  }
  // How busy the street is follows what stands along it.
  const busy = ((BUSY[spec.left] + BUSY[spec.right]) / 2) * (spec.avenue ? 1.2 : 1);
  if (!spec.roadKit) {
    // No signals here: traffic flows through, one lane each way, two on a wide road. It keeps left.
    for (const sx of [1, -1] as const) {
      // The zebra crossings over the main road have no signal: vehicles stop for somebody on one, or about to step onto it.
      const yields = streets.flatMap(([a, c]) => [a - 4, c + 4]).map((xw) => ({ at: (sx > 0 ? xw + X : X - xw) - 3, zone: [xw - 2.5, -(rw + 5), xw + 2.5, rw + 5] as [number, number, number, number] })).sort((p, q) => p.at - q.at);
      for (const [d, share] of rw >= 7 ? [[rw / 4, 1], [(3 * rw) / 4, 0.55]] : [[rw / 2, 1]]) {
        trafficLane(b, -sx * X, -sx * d, sx * X, -sx * d, { speed: (rw >= 8 ? 40 : 30) / 3.6, flow: (rw >= 8 ? 13 : 9) * busy * share, use: rw >= 7 ? 'all' : 'general', taxi: 0.12, stops: [], halts: [], yields });
      }
    }
  }
  // The kit's street lights follow the street: highway masts on an avenue or by offices, shopping-street lamps by shops; none where the utility poles carry them.
  // Modern LED poles by offices, lily-of-the-valley lamps in a nightlife quarter.
  const kitLamp: LampKind | undefined = spec.avenue ? 'lamp_hw' : spec.left === 'office' || spec.right === 'office' ? 'lamp_led'
    : spec.left === 'neon' || spec.right === 'neon' ? 'lamp_suzuran' : spec.left === 'mixed' || spec.right === 'mixed' ? 'lamp_shop' : spec.poles ? undefined : 'lamp_hw';
  if (spec.roadKit) roadKit(b, { X, Z, rw, swOut, streets: streets.map(([a, c]) => [a, c] as [number, number]), canal, seed: spec.seed, name: stationName, at, lamp: kitLamp, tee: spec.tee, busy, roads: spec.roadNames, junctions: spec.junctions, old: !!spec.oldTown || spec.left === 'oldtown' || spec.right === 'oldtown' || spec.left === 'neon' || spec.right === 'neon' });

  // ── Buildings ──
  const edges = [-X + 1, ...[...streets].sort((p, q) => p[0] - q[0]).flatMap(([a, c]) => [a - 3, c + 3]), X - 1];
  if (canal !== undefined) {
    const i = edges.findIndex((e) => e > canal);
    // A stone canal has a quay walk with willows on each bank: the lots stand further back.
    // With model buildings, a row of them fronts each bank: the avenue's lots stop short of it.
    const bank = quayAt !== undefined ? (spec.models ? quayAt + CANAL_ROW + 0.5 : quayAt) : 10;
    edges.splice(i, 0, canal - bank, canal + bank);
  }
  /** The mouths of the lanes where they cross the pavement (world corners), cleared of rails, lamps and trees below. */
  const mouths: [V3, V3][] = [];
  /** World x of the lanes given traffic so far (the other side's included). */
  const laneXs: number[] = [];
  for (const side of [-1, 1] as const) {
    const style = side < 0 ? spec.left : spec.right;
    b.with({ mz: side < 0 }, () => {
      /**
       * Central-Osaka small streets over one segment of the main road (xa … xb, between side streets,
       * canal banks and the plot's ends), kept lots (`kept`: the composer's, konbini, places, pieces)
       * standing in its front row. Small streets back from the main road, shifted clear of kept lots
       * and exit stairs; a front row on the main road and a row behind it facing the parallel street;
       * the parallel street right through, out onto the side streets; low rows behind it.
       */
      const smallSegment = (xa: number, xb: number, kept: [number, number, number][]) => {
        const night = style === 'neon';
        const P0 = swOut + SMALL_P, P1 = P0 + SMALL_W;
        const isOld = (x: number) => !!spec.oldTown || (canal !== undefined && Math.abs(x - canal) < 60);
        const onStreet = (x: number) => streets.some(([p, q]) => Math.abs(x - (p - 3)) < 0.01 || Math.abs(x - (q + 3)) < 0.01);
        const exitAt = (x0: number, x1: number) => {
          const mp = b.pt(x0 - 1.6, 0, rw - 0.2), mq = b.pt(x1 + 1.6, 0, P1 + 0.5);
          const [mx0, mx1, mz0, mz1] = [Math.min(mp[0], mq[0]), Math.max(mp[0], mq[0]), Math.min(mp[2], mq[2]), Math.max(mp[2], mq[2])];
          return b.out.holes.some((h) => h[0] < mx1 && h[2] > mx0 && h[1] < mz1 && h[3] > mz0);
        };
        const deep = kept.filter(([, , d]) => swOut + d > P0 - 1);
        // Bus stops and taxi stands on this kerb: no small street opens onto one.
        const bays = spec.roadKit ? kerbGaps(streets.map(([p, q]) => [p, q] as [number, number])).filter((g) => g.s === side) : [];
        // Where the small streets go: evenly spaced, shifted clear of kept lots and exit stairs, or left out.
        const n = xb - xa >= 36 ? Math.max(2, Math.round((xb - xa) / (night || isOld((xa + xb) / 2) ? 40 : 55))) : 1;
        const cuts: number[] = [];
        for (let k = 1; k < n; k++) {
          const want = xa + ((xb - xa) * k) / n - SMALL_W / 2;
          for (const dx of [0, 3, -3, 6, -6, 9, -9, 12, -12, 15, -15]) {
            const x0 = want + dx, x1 = x0 + SMALL_W, prev = cuts.length ? cuts[cuts.length - 1] + SMALL_W : xa;
            if (x0 - prev < 14 || xb - x1 < 14) continue;
            if (kept.some(([p, q]) => x0 < q + 0.5 && x1 > p - 0.5) || exitAt(x0, x1) || bays.some((g) => x0 < g.x1 + 8 && x1 > g.x0 - 8)) continue;
            cuts.push(x0);
            break;
          }
        }
        const blocks: [number, number][] = [];
        /** Blocks given their vending cluster. */
        const vended = new Set<number>();
        let from = xa;
        for (const x0 of cuts) {
          blocks.push([from, x0]);
          from = x0 + SMALL_W;
        }
        blocks.push([from, xb]);
        blocks.forEach(([fa, fb], k) => {
          const old = isOld((fa + fb) / 2), dense = old || night, kinds = smallKinds(night, dense);
          // The front row on the main road, kept lots standing in it; behind each part, a row facing the parallel street.
          const spans: [number, number, number][] = [];
          let x = fa;
          for (const [p, q, d] of kept.filter(([p, q]) => p < fb && q > fa).sort((u, v) => u[0] - v[0])) {
            if (p - x >= 1.6) spans.push([x, p, -1]);
            spans.push([Math.max(p, fa), Math.min(q, fb), d]);
            x = Math.max(x, q);
          }
          if (fb - x >= 1.6) spans.push([x, fb, -1]);
          for (const [p, q, d] of spans) {
            let back = swOut + d;
            if (d < 0) {
              const lots = fillModelLots(b, r, p, q, swOut, swOut + 16, { old: old && !night, night, noBack: true, open: true });
              back = Math.max(swOut + 6, ...lots.map((l) => l[3]));
              // A vending cluster on the pavement once a block (clear of exit stairs), doorstep life along the other fronts.
              let vx = NaN;
              if (q - p > 12 && !vended.has(k)) {
                const x = p + 2 + r() * (q - p - 9), [h0, h1] = [b.pt(x - 1, 0, swOut - 2.5), b.pt(x + 6, 0, swOut)];
                const [hx0, hx1, hz0, hz1] = [Math.min(h0[0], h1[0]), Math.max(h0[0], h1[0]), Math.min(h0[2], h1[2]), Math.max(h0[2], h1[2])];
                if (!b.out.holes.some((h) => h[0] < hx1 && h[2] > hx0 && h[1] < hz1 && h[3] > hz0)) {
                  vendCluster(b, r, x, swOut);
                  vended.add(k);
                  vx = x;
                }
              }
              for (const l of lots) if (!ALLEY_LOTS.has(l) && (Number.isNaN(vx) || l[2] < vx - 0.5 || l[0] > vx + 5.2)) doorstep(b, r, l[0], swOut, 1, 0, 0, -1, l[2] - l[0], dense);
            }
            if (back > P0 - 1) continue;
            const room = P0 - 0.6 - back;
            let backRow = P0 - 0.3;
            if (room >= 9.2 && q - p >= 4.6) {
              b.with({ rot: 2, t: [0, 0, P0 - 0.3] }, () => {
                for (const l of fillModelLots(b, r, -q, -p, 0, Math.min(room - 1.2, 11.5) + 2, { kinds, noBack: true, open: true })) {
                  const [lx0, lz0, lx1, lz1] = l;
                  if (!ALLEY_LOTS.has(l)) doorstep(b, r, lx0, lz0, 1, 0, 0, -1, lx1 - lx0, dense);
                  backRow = Math.min(backRow, P0 - 0.3 - lz1);
                }
              });
            }
            // Between the two rows' backs: a back lane you can walk (in from the small streets at its ends), or a sliver closed off.
            if (backRow - back >= 1.2) backGap(b, r, 'x', p, q, back + 0.05, backRow - 0.05);
            else if (backRow - back > 0.05) b.block(p, GY, back, q, GY + 6, backRow);
          }
          // Behind the parallel street: low rows, broken where a deep kept lot reaches past it.
          let u = fa;
          const behind = deep.filter(([p, q]) => p < fb && q > fa).sort((u1, v) => u1[0] - v[0]);
          for (const [p, q, d] of [...behind, [fb, fb, 0] as [number, number, number]]) {
            if (p - u >= 6) smallBlock(b, r, u, p, P1, u === fa && (k > 0 || onStreet(xa)), p === fb && (k < blocks.length - 1 || onStreet(xb)), dense, night);
            if (q > p && PLOT_Z - 1.5 - (swOut + d + 1) > 9.5) stackRows(b, r, Math.max(p, fa), Math.min(q, fb), swOut + d + 1, kinds);
            u = Math.max(u, q);
          }
          if (k < blocks.length - 1) {
            const s0 = fb;
            const bay = spec.roadKit && kerbGaps(streets.map(([p, q]) => [p, q] as [number, number])).some((g) => g.s === side && g.x0 < s0 + SMALL_W + 4 && g.x1 > s0 - 4);
            const junction = streets.some(([p, q]) => s0 + SMALL_W > p - 35 && s0 < q + 35);
            const wx = (b.pt(s0, 0, 0)[0] + b.pt(s0 + SMALL_W, 0, 0)[0]) / 2;
            const facing = laneXs.some((lx) => Math.abs(lx - wx) < 14);
            const traffic = !bay && !junction && !facing;
            if (traffic) laneXs.push(wx);
            smallStreet(b, r, s0, s0 + SMALL_W, rw, swOut, P0, P1, traffic, stationName, dense, spec.smallSignals);
            mouths.push([b.pt(s0 - 1.6, 0, rw - 0.2), b.pt(s0 + SMALL_W + 1.6, 0, swOut + 0.2)]);
          }
        });
        // The parallel street, right through the segment (broken only by a deep kept lot), out across
        // the pavement onto a side street at either end, or on out of sight at the plot's end.
        const parts: [number, number][] = [];
        let u0 = xa;
        for (const [p, q] of [...deep].sort((u1, v) => u1[0] - v[0])) {
          if (p - u0 > 4) parts.push([u0, p]);
          u0 = Math.max(u0, q);
        }
        if (xb - u0 > 4) parts.push([u0, xb]);
        for (const [pa, pb] of parts) {
          smallRoad(b, r, 'x', pa, pb, P0, P1);
          for (const [end, out] of [[pa, -1], [pb, 1]] as [number, number][]) {
            if ((end === xa || end === xb) && onStreet(end)) {
              const [e0, e1] = out < 0 ? [end - 3, end] : [end, end + 3];
              smallRoad(b, r, 'x', e0, e1, P0, P1, false);
              mouths.push([b.pt(e0 - 0.2, 0, P0 - 0.6), b.pt(e1 + 0.2, 0, P1 + 0.6)]);
            } else if ((end === xa || end === xb) && Math.abs(end) > PLOT_X - 3) {
              smallRoad(b, r, 'x', out < 0 ? -PLOT_X : end, out < 0 ? end : PLOT_X, P0, P1);
            }
          }
          poleLine(b, { axis: 'x', from: pa + 2, to: pb - 2, at: P1 - 0.3, road: -1, step: 22, skip: (x) => cuts.some((c) => x > c - 2.5 && x < c + SMALL_W + 2.5), drops: 0.9, name: stationName });
          for (let x = pa + 24; x < pb - 4; x += 22) if (!cuts.some((c) => x > c - 1.5 && x < c + SMALL_W + 1.5)) streetLamp(b, 'lamp_small', x, P0 + 0.3, [0, 1]);
        }
        // A garbage station or a bike rack against the back row now and then.
        for (const [fa, fb] of blocks) {
          if (fb - fa < 14 || deep.some(([p, q]) => p < fb && q > fa)) continue;
          const gx = fa + 4 + r() * (fb - fa - 10), id = r() < 0.65 ? 'gomist' : 'bikerack', w = id === 'gomist' ? 2.0 : 4.1;
          roadModel(b, id, gx, GY, P0 + (id === 'gomist' ? 0.6 : 0.1), id === 'gomist' ? [0, 1] : [0, -1]);
          b.block(gx - w / 2, GY, P0, gx + w / 2, GY + 1.1, P0 + 1.15);
        }
      };
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
          const old = !!spec.oldTown || (canal !== undefined && Math.abs((a + c) / 2 - canal) < 60);
          const night = style === 'neon';
          const taken: Lot[] = [];
          // Where the lot ends at a side street, a row of buildings fronts that street behind the corner.
          const onStreet = (x: number) => streets.some(([p, q]) => Math.abs(x - (p - 3)) < 0.01 || Math.abs(x - (q + 3)) < 0.01);
          let ia = a, ic = c;
          if (!spec.smallStreets && onStreet(c) && c - a > SIDE_ROW + 2) {
            sideRow(b, r, c, 1, swOut + 22, PLOT_Z - 2, SIDE_ROW, taken, { old: old || night, full: 2 });
            ic = c - SIDE_ROW - 1;
          }
          if (!spec.smallStreets && onStreet(a) && c - a > SIDE_ROW + 2) {
            sideRow(b, r, a, -1, swOut + 22, PLOT_Z - 2, SIDE_ROW, taken, { old: old || night, full: 2 });
            ia = a + SIDE_ROW + 1;
          }
          // Rule 7: blocks cut by lanes running back from the pavement (closer in old and nightlife
          // quarters, wider apart among offices); each block a front row on the main road and rows of
          // small buildings on the lanes behind it.
          const dense = old || night;
          const S = dense ? 30 : style === 'office' ? 60 : 42, LW = 3;
          // At least one lane through any block long enough, so the rows behind can be reached.
          const n = c - a >= 24 ? Math.max(2, Math.round((c - a) / S)) : 1, bw = (c - a) / n;
          for (let k = 0; k < n; k++) {
            const fa = a + k * bw + (k ? LW / 2 : 0), fb = a + (k + 1) * bw - (k < n - 1 ? LW / 2 : 0);
            fillModelLots(b, r, fa, fb, swOut, swOut + 22, { old: old && !night, night, tower: !old && !night && side < 0 && fb - fa > 60, noBack: true });
            rearRows(b, r, Math.max(fa, ia), Math.min(fb, ic), swOut + 21, dense, night, stationName, n > 1);
            if (k < n - 1) {
              // No traffic out of a lane that opens onto a bus stop or a taxi stand (standing vehicles there).
              const bay = spec.roadKit && kerbGaps(streets.map(([p, q]) => [p, q] as [number, number])).some((g) => g.s === side && g.x0 < fb + LW + 4 && g.x1 > fb - 4);
              // Nor out of one near a signalled junction (its queue stands across the mouth half the time),
              // nor where an exit stair stands on the pavement in front of it.
              const junction = streets.some(([p, q]) => fb + LW > p - 35 && fb < q + 35);
              const mp = b.pt(fb - 1.6, 0, rw - 0.2), mq = b.pt(fb + LW + 1.6, 0, swOut + 0.2);
              const [mx0, mx1, mz0, mz1] = [Math.min(mp[0], mq[0]), Math.max(mp[0], mq[0]), Math.min(mp[2], mq[2]), Math.max(mp[2], mq[2])];
              const exit = b.out.holes.some((h) => h[0] < mx1 && h[2] > mx0 && h[1] < mz1 && h[3] > mz0);
              // Two lanes facing each other across the road would wait on each other's turns: one of them only.
              const wx = (b.pt(fb, 0, 0)[0] + b.pt(fb + LW, 0, 0)[0]) / 2;
              const facing = laneXs.some((x) => Math.abs(x - wx) < 14);
              const traffic = !bay && !junction && !exit && !facing;
              if (traffic) laneXs.push(wx);
              crossLane(b, r, fb, fb + LW, swOut, PLOT_Z - 1, rw, traffic);
              if (!exit) mouths.push([mp, mq]);
            }
          }
          void taken;
        };
        // Lots kept out of the ordinary fill: the composer's own, and any convenience store's.
        const kept: [number, number, number][] = [];
        if (lm && lm.side === side && lm.x0 < xb && lm.x1 > xa) kept.push([lm.x0, lm.x1, lm.depth ?? 20]);
        for (const k of spec.konbini ?? []) {
          if (k.side !== side) continue;
          const kw = k.type === 'ground' ? 24 : KONBINI[k.type].w + 0.6;
          if (k.x0 < xa || k.x0 + kw > xb) continue;
          kept.push([k.x0, k.x0 + kw, k.type === 'ground' ? 20 : KONBINI[k.type].d + (k.type === 'roadside' ? CAR_PARK : 0)]);
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
        for (const k of spec.places ?? []) {
          const kw = PLACES[k.kind].w + 0.6;
          if (k.side !== side || k.x0 < xa || k.x0 + kw > xb) continue;
          kept.push([k.x0, k.x0 + kw, PLACES[k.kind].d]);
          b.with({ t: [k.x0 + kw / 2, 0, swOut] }, () => place(b, k));
        }
        for (const k of spec.pieces ?? []) {
          const kw = PIECES[k.id].w + 0.6;
          // A piece may run on past the segment's end, onto a corner the canal rows leave open (Hyōtan Kaikan).
          if (k.side !== side || k.x0 < xa || k.x0 >= xb) continue;
          kept.push([k.x0, k.x0 + kw, PIECES[k.id].d]);
          b.with({ t: [k.x0 + kw / 2, 0, swOut] }, () => MIDORI_PIECES.includes(k.id) ? midoriPiece(b, k, swOut - rw) : (HORIE_PIECES.includes(k.id) ? horiePiece : TSURU_PIECES.includes(k.id) ? tsuruPiece : KAISEI_PIECES.includes(k.id) ? kaiseiPiece : piece)(b, k));
        }
        if (spec.smallStreets && spec.models && (style === 'mixed' || style === 'office' || style === 'neon')) {
          smallSegment(xa, xb, kept);
          continue;
        }
        if (kept.length) {
          kept.sort((p, q) => p[0] - q[0]);
          let from = xa;
          for (const [p, q, d] of kept) {
            if (p - from >= 6) lots(from, p);
            from = q;
            // Behind a kept lot the block goes on too (not where a canal's own rows stand).
            const nearCanal = canal !== undefined && Math.abs((p + q) / 2 - canal) < (quayAt ?? 10) + CANAL_ROW + 8;
            if (spec.models && !nearCanal) {
              const old = !!spec.oldTown || (canal !== undefined && Math.abs((p + q) / 2 - canal) < 60);
              // Lined up with the neighbouring blocks' lanes where the kept lot is shallow enough (then reachable through them).
              const z0 = Math.max(swOut + 21, swOut + d + 1);
              rearRows(b, r, Math.max(p, xa), Math.min(q, xb), z0, old || style === 'neon', style === 'neon', stationName, z0 === swOut + 21);
            }
          }
          if (xb - from >= 6) lots(from, xb);
          continue;
        }
        if (!spec.models && side < 0 && spec.arcadeAt !== undefined && Math.abs(xb + 3 + crossHalf - spec.arcadeAt) < 1) {
          fillLots(b, r, 'oldtown', xa, xb, swOut);
        } else if (style === 'park') {
          // Houses either side of the park (which spans x = -62 … 22).
          if (xa < -66) fillLots(b, r, 'house', xa, Math.min(xb, -64), swOut);
          if (xb > 28) fillLots(b, r, 'house', Math.max(xa, 24), xb, swOut);
        } else if (spec.models && (style === 'mixed' || style === 'office' || style === 'neon')) lots(xa, xb);
        else fillLots(b, r, style, xa, xb, swOut, side > 0 && spec.valleyZ !== undefined ? spec.valleyZ - 2 : PLOT_Z);
      }
      // Shophouses fronting the canal on both banks, behind anything the composer built there.
      if (canal !== undefined && quayAt !== undefined && spec.models) {
        const lm = spec.landmark && spec.landmark.side === side ? spec.landmark : undefined;
        for (const face of [1, -1] as const) {
          const xf = canal - face * quayAt;
          const [p, q] = face > 0 ? [xf - CANAL_ROW, xf] : [xf, xf + CANAL_ROW];
          let z0 = lm && lm.x0 < q && lm.x1 > p ? swOut + (lm.depth ?? 0) + 1.5 : swOut;
          // The row stands back behind any of the station's pieces on its corner.
          for (const k of spec.pieces ?? []) if (k.side === side && k.x0 < q && k.x0 + PIECES[k.id].w > p) z0 = Math.max(z0, swOut + PIECES[k.id].d + 1.5);
          // By the grand canal the row's end would show a bare gable to the main road: a front-row building closes the corner.
          if (spec.canalGrand && z0 === swOut) {
            const t = fillModelLots(b, r, p, q, swOut, swOut + 14, { night: style === 'neon', noBack: true });
            z0 = Math.max(swOut, ...t.map((l) => l[3])) + 1;
          }
          // The grand canal is lined with neon canal fronts, the quiet one with boutiques: all full models, seen close from the walks.
          const rowKinds = spec.canalGrand ? { old: true, full: 99, kinds: ['canalfront'] } : spec.canalQuiet ? { old: true, full: 99, kinds: ['boutique'] } : { old: true, full: 2 };
          if (spec.smallStreets && spec.models && z0 < swOut + SMALL_P - 4) {
            // The parallel small street runs on through the row to the quay walk.
            const P0 = swOut + SMALL_P, P1 = P0 + SMALL_W;
            sideRow(b, r, xf, face, z0, P0 - 0.3, CANAL_ROW, [], rowKinds);
            sideRow(b, r, xf, face, P1 + 0.3, PLOT_Z - 2, CANAL_ROW, [], rowKinds);
            smallRoad(b, r, 'x', face > 0 ? p - 0.6 : p, face > 0 ? q : q + 0.6, P0, P1, false);
          } else sideRow(b, r, xf, face, z0, PLOT_Z - 2, CANAL_ROW, [], rowKinds);
          // Beside the composer's building the bank is a small quay garden: a line of trees and benches.
          for (let z = swOut + 4; lm && lm.x0 < q && lm.x1 > p && z < z0 - 3; z += 6.5) {
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

  // Lane mouths: nothing on the pavement where the small streets' traffic comes out.
  for (const [p, q] of mouths) {
    const x0 = Math.min(p[0], q[0]), x1 = Math.max(p[0], q[0]), z0 = Math.min(p[2], q[2]), z1 = Math.max(p[2], q[2]);
    const inside = (v: V3) => v[0] > x0 && v[0] < x1 && v[2] > z0 && v[2] < z1;
    b.out.models = b.out.models.filter((m) => !(inside(m.pos) && (m.kind === 'road' || m.kind === 'trees' || m.kind === 'places')));
    // The signs those poles carried (a bus stop's, a road sign's) go with them; paint on the ground stays.
    b.out.signs = b.out.signs.filter((sg) => !(inside(sg.pos) && sg.normal !== null && sg.pos[1] > GY + 0.3));
    // Only low street things (kerb rails, bollards): never a wall.
    b.out.boxes = b.out.boxes.filter((bx) => {
      const low = bx.max[1] < GY + 1.25 && bx.max[0] - bx.min[0] < 6 && bx.max[2] - bx.min[2] < 3;
      const post = bx.max[1] < GY + 7 && bx.max[0] - bx.min[0] < 0.6 && bx.max[2] - bx.min[2] < 0.6;
      return !(bx.min[1] > -0.05 && (low || post) && inside([(bx.min[0] + bx.max[0]) / 2, 0, (bx.min[2] + bx.max[2]) / 2]));
    });
  }

  // ── Sidewalk life near the exits ──
  for (const h of holes) {
    const zc = (h[1] + h[3]) / 2, s = Math.sign(zc);
    if (Math.abs(zc) > swOut) continue; // an opening inside a lot (a composer's own building), not an exit stair
    // (Keep the draw so the street's other choices stay as they were.)
    const vk = r() < 0.5 ? 'vending' : 'vending2';
    if (!spec.pavilions) vending(b, h[0] - 2.2, GY, s * (swOut - 0.6), [0, -s], vk);
    // Parked bicycles.
    for (let i = 0; i < (spec.pavilions ? 0 : 4); i++) {
      const bx = h[2] + 3 + i * 0.7;
      if (spec.models) {
        const f = b.dir([0, -s]);
        b.out.models.push({ kind: 'places', id: 'bicycle', pos: b.pt(bx, GY, s * (swOut - 0.4)), yaw: Math.atan2(-f[0], -f[1]) + 0, seed: 0, merge: true });
        b.block(bx - 0.15, GY, s * (swOut - 0.4) - 0.8, bx + 0.15, GY + 1.0, s * (swOut - 0.4) + 0.8);
        continue;
      }
      b.deco('flat:#3a3f45', bx, GY + 0.3, s * (swOut - 0.4) - 0.8, bx + 0.06, GY + 0.95, s * (swOut - 0.4) + 0.8);
      b.deco(`flat:${carCols[(i + 2) % carCols.length]}`, bx - 0.03, GY + 0.6, s * (swOut - 0.4) - 0.5, bx + 0.09, GY + 0.72, s * (swOut - 0.4) + 0.3);
    }
  }

  if (canal !== undefined && spec.canalQuiet) quietCanal(b, canal, swOut, Z, spec.canalName ?? { ja: '南堀江橋', en: 'Minamihorie-bashi' });
  else if (canal !== undefined && spec.canalGrand) grandCanal(b, canal, swOut, Z, spec.canalName ?? { ja: '瓢箪橋', en: 'Hyōtan-bashi' });
  else if (canal !== undefined) b.open(() => canalFeature(b, canal, swOut, Z, spec.canalName ?? { ja: '瓢箪橋', en: 'Hyōtan-bashi' }, !!spec.canalLanterns, !!spec.canalStone));
  if (spec.arcadeAt !== undefined && spec.arcadeModel) {
    // The roof stops short of a piece on the arcade's +x corner (the bath at Tsurumatsu).
    const a = spec.arcadeAt, corner = (spec.pieces ?? []).filter((k) => k.side < 0 && k.x0 > a && k.x0 < a + 10).map((k) => PIECES[k.id].d);
    tsuruArcade(b, a, swOut, PLOT_Z, spec.arcadeName ?? { ja: '商店街', en: 'Shopping Arcade' }, Math.max(0, ...corner),
      spec.smallStreets ? [SMALL_P, SMALL_P + SMALL_W] : undefined);
  } else if (spec.arcadeAt !== undefined) arcade(b, spec.arcadeAt, swOut, spec.arcadeName ?? { ja: '商店街', en: 'Shopping Arcade' });
  // Model streets carry on past the plot, with side streets, so the edge of the map reads as a city.
  // (Everything past the plot is drawn merged: it is seen, never walked, and would cost thousands of draw calls.)
  const merged0 = b.out.models.length;
  if (spec.models) continuation(b, spec, rw, swOut, kitLamp);
  // The plot's side streets carry on past its edge too (the avenue has its boulevard; a tee only runs one way).
  if (spec.models) for (const [a, c] of streets) {
    const xc = (a + c) / 2;
    if (spec.avenue && Math.abs(xc) < 1) continue;
    for (const sz of [-1, 1] as const) if (!(spec.tee && sz < 0 && spec.arcadeAt === undefined)) sideStreetOut(b, spec, xc, sz, kitLamp);
  }
  if (spec.boulevard) {
    boulevard(b, spec, swOut, spec.boulevard, true);
    // The other way (+z), mirrored: to the next station's plot on that side, without the landmark corners.
    const south = spec.boulevard.south;
    if (south !== undefined) b.with({ mz: true }, () => boulevard(b, spec, swOut, { to: -south }, false));
  }
  for (let k = merged0; k < b.out.models.length; k++) b.out.models[k].merge = true;
  if (spec.avenue) {
    // The crossing avenue gets its own lane lines and trees.
    for (let z = swOut + 9; z < Z; z += 6) {
      for (const s of [-1, 1]) {
        b.deco('flat:#e9e9e4', -aveHalf / 2 - 0.07, 0.004, s * z, -aveHalf / 2 + 0.07, 0.01, s * (z + 3));
        b.deco('flat:#e9e9e4', aveHalf / 2 - 0.07, 0.004, s * z, aveHalf / 2 + 0.07, 0.01, s * (z + 3));
      }
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (let z = swOut + 12; z < Z - 4; z += 15) modelTree(b, Math.round(z / 15) % 2 ? 'zelkova' : 'ginkgo', sx * (aveHalf + 1.6), sz * z, 'a', GY, true);
  }
}

/** How far the main road carries on past each end of the plot, and where its side streets cross it (from the plot's end). */
export const CONTINUE = { len: 210, cross: [62, 132, 196], crossHalf: 3.5, depth: 46 };

/**
 * The main road carried on past both ends of a model street's plot, as far as the eye reads it:
 * asphalt with its lane paint, pavements with kerb rails and lamps, side streets crossing it with
 * zebra crossings, and a front row of Blender-built buildings on both sides between them, simplified
 * copies behind. Beyond the plot's walls, so no colliders matter; the backdrop city keeps off it.
 */
function continuation(b: Builder, spec: SurfaceSpec, rw: number, swOut: number, lamp: LampKind | undefined) {
  const r = rng(spec.seed * 7 + 3);
  const X = PLOT_X, { len, cross, crossHalf: ch, depth } = CONTINUE;
  for (const e of [-1, 1]) {
    const xA = e * X, xB = e * (X + len), lo = Math.min(xA, xB), hi = Math.max(xA, xB);
    const streets = cross.map((u) => e * (X + u)).map((c) => [c - ch, c + ch] as [number, number]);
    const near = (x: number, m: number) => streets.some(([a, c]) => x > a - m && x < c + m);
    b.clearScenery(lo, -(swOut + 90), hi, swOut + 90);
    // Road, lane paint, pavements (open at the side streets), the side streets themselves.
    b.deco('asphalt', lo, -0.03, -rw, hi, 0.0, rw);
    for (let x = lo; x < hi - 3; x += 6) {
      if (near(x + 1.5, 9)) continue;
      for (const s of [-1, 1]) b.deco('flat:#e9e9e4', x, 0.004, s * rw / 2 - 0.07, x + 3, 0.01, s * rw / 2 + 0.07);
      b.deco('flat:#e6a700', x, 0.004, -0.08, x + 6, 0.01, 0.08);
    }
    for (const s of [-1, 1]) {
      let from = lo;
      for (const [a, c] of [...streets].sort((p, q) => p[0] - q[0]).concat([[hi, hi]])) {
        if (a - from > 0.5) b.deco('paver', from, 0, Math.min(s * rw, s * swOut), a, GY, Math.max(s * rw, s * swOut));
        from = c;
      }
    }
    for (const [a, c] of streets) {
      const mid = (a + c) / 2;
      for (const s of [-1, 1]) {
        b.clearScenery(a - 4, Math.min(s * swOut, s * (swOut + 90)), c + 4, Math.max(s * swOut, s * (swOut + 90)));
        b.deco('asphalt', a, -0.03, Math.min(s * rw, s * (swOut + 90)), c, 0.0, Math.max(s * rw, s * (swOut + 90)));
        b.deco('flat:#e9e9e4', mid - 0.06, 0.004, Math.min(s * (rw + 7), s * (swOut + 90)), mid + 0.06, 0.01, Math.max(s * (rw + 7), s * (swOut + 90)));
        crosswalk(b, mid, s * (rw + 3.2), c - a - 0.4, 4, false);
      }
      crosswalk(b, a - 4, 0, 2 * rw - 0.6, 4, true);
      crosswalk(b, c + 4, 0, 2 * rw - 0.6, 4, true);
      for (const s of [-1, 1]) b.deco('flat:#e9e9e4', s > 0 ? c + 6.8 : a - 7.2, 0.004, s > 0 ? 0 : -rw, s > 0 ? c + 7.2 : a - 6.8, 0.01, s > 0 ? rw : 0);
    }
    // Kerb rails and lamps.
    for (const s of [-1, 1]) {
      for (let x = lo + 1.25; x < hi - 1; x += 2.5) if (!near(x, 7)) kerbRail(b, x, s * (rw + 0.3));
      if (lamp) for (let x = lo + 10; x < hi - 4; x += 32) if (!near(x, 9)) streetLamp(b, lamp, x, s * (rw + 0.9), [0, -s]);
    }
    // Buildings: a front row of full models between the side streets, simplified copies behind.
    const edges = [lo, ...[...streets].sort((p, q) => p[0] - q[0]).flatMap(([a, c]) => [a - 3, c + 3]), hi];
    for (const side of [-1, 1] as const) {
      const style = side < 0 ? spec.left : spec.right;
      const night = style === 'neon';
      b.with({ mz: side < 0 }, () => {
        for (let k = 0; k < edges.length; k += 2) {
          const a = edges[k], c = edges[k + 1];
          if (c - a < 8) continue;
          const old = spec.canalAt !== undefined && Math.abs((a + c) / 2 - spec.canalAt) < 60;
          // Full models on the first block past the plot, simplified copies further out (frame rate).
          const lo = Math.min(Math.abs(a), Math.abs(c)) > X + cross[0] + 4;
          const taken = fillModelLots(b, r, a, c, swOut, swOut + depth, { old: old && !night, night, noBack: true, lo });
          // A row of buildings faces each side street behind the corner, as on the plot.
          const onStreet = (x: number) => streets.some(([p, q]) => Math.abs(x - (p - 3)) < 0.01 || Math.abs(x - (q + 3)) < 0.01);
          let ia = a, ic = c;
          if (onStreet(c) && c - a > SIDE_ROW + 2) {
            sideRow(b, r, c, 1, swOut + 22, swOut + 88, SIDE_ROW, taken, { old: old || night, full: lo ? 0 : 2 });
            ic = c - SIDE_ROW - 1;
          }
          if (onStreet(a) && c - a > SIDE_ROW + 2) {
            sideRow(b, r, a, -1, swOut + 22, swOut + 88, SIDE_ROW, taken, { old: old || night, full: lo ? 0 : 2 });
            ia = a + SIDE_ROW + 1;
          }
          modelBackRow(b, r, ia, ic, swOut + (old || night ? 15 : 26), swOut + depth + 30, taken, old || night);
        }
      });
    }
  }
}

/**
 * A boulevard carrying the plot's crossing avenue (x = 0) on to the next station along −z, as far
 * as `to` (local z, where that station's plot begins): a planted median, wide pavements with street
 * trees, tall lamps, side streets every ~70 m, and a continuous frontage of offices and banks that
 * grows taller block by block towards the far end, simplified copies behind; three landmark corners.
 */
export function boulevard(b: Builder, spec: SurfaceSpec, swOut: number, o: { to: number; /** Where it starts (default the plot's edge). */ from?: number; /** Its building line (default 18). */ P?: number }, landmarks: boolean) {
  const r = rng(spec.seed * 13 + 5);
  const A = 10, P = o.P ?? 18, z0 = o.from ?? -PLOT_Z, z1 = o.to, L = z0 - z1, ch = 3.5;
  const crossAt = [40, 110, 180, 250, 320, 390].filter((u) => u < L - 20).map((u) => z0 - u);
  const streets = crossAt.map((c) => [c - ch, c + ch] as [number, number]);
  const near = (z: number, m: number) => streets.some(([a, c]) => z > a - m && z < c + m);
  b.clearScenery(-(P + 70), z1, P + 70, z0);
  // Roadway, a planted median, lane paint, pavements open at the side streets.
  b.deco('asphalt', -A, -0.03, z1, A, 0.0, z0);
  for (let z = z1; z < z0 - 1; z += 0.01 + 0) {
    const zb = Math.min(z0, z + 20);
    if (!near((z + zb) / 2, 12)) b.box('paver', -0.8, 0, z, 0.8, GY, zb, false);
    z = zb;
  }
  // Twin-arm lights down the median, between its trees.
  for (let z = z1 + 8; z < z0 - 4; z += 36) if (!near(z, 10)) streetLamp(b, 'lamp_twin', 0, z, [1, 0]);
  for (let z = z1 + 2; z < z0 - 2; z += 12) if (!near(z, 10)) modelTree(b, ['zelkova', 'ginkgo'][Math.round(-z / 12) % 2] as TreeKind, 0, z, 'a', GY, true);
  for (let z = z1; z < z0 - 3; z += 6) {
    if (near(z + 1.5, 9)) continue;
    for (const s of [-1, 1]) b.deco('flat:#e9e9e4', s * A / 2 - 0.07, 0.004, z, s * A / 2 + 0.07, 0.01, z + 3);
  }
  for (const s of [-1, 1]) {
    let from = z1;
    for (const [a, c] of [...streets].sort((p, q) => p[0] - q[0]).concat([[z0, z0]])) {
      if (a - from > 0.5) b.deco('paver', Math.min(s * A, s * P), 0, from, Math.max(s * A, s * P), GY, a);
      from = c;
    }
    for (let z = z1 + 6; z < z0 - 4; z += 14) if (!near(z, 8)) modelTree(b, ['ginkgo', 'zelkova'][Math.round(-z / 14) % 2] as TreeKind, s * (A + 1.8), z, 'a', GY, true);
    for (let z = z1 + 12; z < z0 - 6; z += 30) if (!near(z, 9)) streetLamp(b, 'lamp_led', s * (A + 0.9), z, [-s, 0]);
    for (let z = z1 + 1.25; z < z0 - 1; z += 2.5) if (!near(z, 7)) b.with({ rot: 1, t: [s * (A + 0.3), 0, z] }, () => kerbRail(b, 0, 0));
  }
  // Side streets with their crossings.
  for (const [a, c] of streets) {
    const mid = (a + c) / 2;
    for (const s of [-1, 1]) {
      b.clearScenery(Math.min(s * A, s * (P + 90)), a - 4, Math.max(s * A, s * (P + 90)), c + 4);
      b.deco('asphalt', Math.min(s * A, s * (P + 90)), -0.03, a, Math.max(s * A, s * (P + 90)), 0.0, c);
      b.deco('flat:#e9e9e4', Math.min(s * (A + 7), s * (P + 90)), 0.004, mid - 0.06, Math.max(s * (A + 7), s * (P + 90)), 0.01, mid + 0.06);
      crosswalk(b, s * (A + 3.2), mid, c - a - 0.4, 4, true);
    }
    crosswalk(b, 0, a - 4, 2 * A - 0.6, 4, false);
    crosswalk(b, 0, c + 4, 2 * A - 0.6, 4, false);
  }
  // Frontage: blocks between the side streets, taller towards the far end; a row along each side street.
  const edges = [z1, ...[...streets].sort((p, q) => p[0] - q[0]).flatMap(([a, c]) => [a - 3, c + 3]), z0];
  const LANDMARKS = [
    { at: 1, ja: 'つむぎ百貨店', en: 'Tsumugi Department Store', kind: 'store' },
    { at: 3, ja: '時計の辻', en: 'Clock Corner', kind: 'clock' },
    { at: 5, ja: 'ホテル 柳筋', en: 'Hotel Yanagisuji', kind: 'hotel' },
  ];
  for (let k = 0; k < edges.length; k += 2) {
    const za = edges[k], zc = edges[k + 1];
    if (zc - za < 8) continue;
    // 0 by Tsumugibashi … 1 by the far station.
    const t = Math.min(1, Math.max(0, (z0 - (za + zc) / 2) / L));
    const hMax = 32 + t * 30, hMin = 12 + t * 26;
    const lm = landmarks ? LANDMARKS.find((l) => l.at === k / 2) : undefined;
    // West side (front x = −P, facing +x) and east side (x = P, facing −x); a second row 26 m back.
    for (const [xf, face] of [[-P, 1], [P, -1]] as [number, 1 | -1][]) {
      const taken: Lot[] = [];
      if (lm && face > 0) taken.push(landmarkCorner(b, lm, xf, zc));
      frontRow(b, r, xf, face, za, zc, 22, taken, (m) => (m.kind === 'office' || m.kind === 'zakkyo') && m.h >= hMin && m.h <= hMax + 4, true);
      // Towers on the last block before the far station, offices and flats elsewhere.
      if (t > 0.85) frontRow(b, r, xf - face * 26, face, za, zc, 50, taken, (m) => m.kind === 'tower', false);
      else frontRow(b, r, xf - face * 26, face, za, zc, 22, taken, (m) => (m.kind === 'office' || m.kind === 'manshon') && m.h <= hMax + 15, false);
      // A third row closes the strip up to the backdrop's blocks.
      if (t <= 0.85) frontRow(b, r, xf - face * 50, face, za, zc, 20, taken, (m) => (m.kind === 'office' || m.kind === 'manshon' || m.kind === 'zakkyo') && m.h <= hMax + 20, false);
    }
  }
  void swOut;
}

/**
 * Buildings along the line x = xf facing `face` (±1 along x), from z0 to z1, no deeper than
 * `depth`, chosen by `ok`: full models where `full`, simplified copies otherwise. Lots in `taken`
 * are kept clear and added to.
 */
function frontRow(b: Builder, r: () => number, xf: number, face: 1 | -1, z0: number, z1: number, depth: number, taken: Lot[], ok: (m: BuildingModel) => boolean, full: boolean) {
  const L = z1 - z0;
  let u = 0, last = '';
  for (let guard = 0; guard < 60 && L - u > 5; guard++) {
    const fits = BUILDING_MODELS.filter((m) => ok(m) && !m.corner && m.d <= depth && m.w <= L - u && `${m.kind}_${m.id}` !== last);
    if (!fits.length) break;
    const m = fits[Math.floor(r() * fits.length)];
    const za = face > 0 ? z0 + u : z1 - u - m.w;
    const lot: Lot = [face > 0 ? xf - m.d : xf, za, face > 0 ? xf : xf + m.d, za + m.w];
    if (taken.some((t) => lotsOverlap(lot, t))) {
      u += 2;
      continue;
    }
    b.with({ rot: face > 0 ? 1 : 3, t: [xf, 0, face > 0 ? z0 : z1] }, () => b.model(m.kind, full ? m.id : `${m.id}_lo`, u + m.w / 2, GY, 0, Math.floor(r() * 1000)));
    taken.push(lot);
    last = `${m.kind}_${m.id}`;
    u += m.w + 0.4;
  }
}

/**
 * One of the boulevard's landmark corners: a tall office block on the west side at the side-street
 * end of its block (front x = xf facing +x, its lot ending 0.3 m short of z1), with its own sign:
 * a department store's tall blade sign, a clock on the roof corner, or a hotel's rooftop board.
 * Returns the lot it took.
 */
function landmarkCorner(b: Builder, lm: { ja: string; en: string; kind: string }, xf: number, z1: number): Lot {
  const m = BUILDING_MODELS.find((q) => q.kind === 'office' && q.id === 'b')!;
  const za = z1 - 0.3 - m.w, top = GY + m.h;
  b.with({ rot: 1, t: [xf, 0, za] }, () => b.model('office', m.id, m.w / 2, GY, 0, 11));
  const zs = z1 - 1.4;
  if (lm.kind === 'store') {
    // A blade sign standing out over the pavement, read from up and down the boulevard.
    b.deco('flat:#7a1f2a', xf, GY + 6, zs - 0.12, xf + 1.5, top - 4, zs + 0.12);
    for (const f of [-1, 1]) b.sign({ k: 'shop', ja: lm.ja, bg: '#7a1f2a', fg: '#fff3d6', vertical: true }, xf + 0.75, (GY + 6 + top - 4) / 2, zs + f * 0.13, [0, f], 1.3, top - GY - 11);
  } else if (lm.kind === 'hotel') {
    b.deco('flat:#1b2b44', xf - 1.2, top, za + 1, xf - 1.0, top + 3.4, z1 - 1.3);
    b.sign({ k: 'shop', ja: lm.ja, en: lm.en, bg: '#1b2b44', fg: '#f4e9c8' }, xf - 0.988, top + 1.7, (za + z1) / 2, [1, 0], m.w - 3, 2.6);
  } else {
    b.deco('flat:#3a3d41', xf - 3.2, top, z1 - 3.6, xf - 0.4, top + 7, z1 - 0.8);
    for (const [n, x, z] of [[[1, 0], xf - 0.388, z1 - 2.2], [[0, 1], xf - 1.8, z1 - 0.788]] as [[number, number], number, number][]) {
      b.sign({ k: 'clock' }, x, top + 4.4, z, n, 2.2, 2.2);
      b.sign({ k: 'label', text: lm.ja, sub: lm.en, fg: '#fff', bg: '#3a3d41' }, x, top + 1.6, z, n, 2.4, 0.8);
    }
  }
  return [xf - m.d, za, xf, za + m.w];
}

/**
 * A narrow alley in a gap between buildings, x0 … x1 along the street, running back from the
 * pavement at z0 for `depth`: worn paving, a wall closing its far end, plain walls where no building
 * stands beside it, and its clutter: pipes and air-conditioning units on the walls, bins, crates,
 * a drinks crate stack, a small lamp on a bracket, wires overhead. Colliders for the walls and the
 * clutter, so it can be walked into where nothing else blocks it.
 */
function alley(b: Builder, r: () => number, x0: number, x1: number, z0: number, depth: number, open = false) {
  const w = x1 - x0, z1 = z0 + depth, H = 7.5;
  b.deco('flat:#55504a', x0, GY, z0, x1, GY + 0.015, z1);
  b.deco('flat:#3f3b37', x0 + w / 2 - 0.08, GY + 0.015, z0, x0 + w / 2 + 0.08, GY + 0.02, z1);
  // The far wall and plain side walls (behind the neighbours' own sides; seen where those stop short).
  // A concrete-block wall with a cap closes the far end (and the sides where no building stands): low, as in Japan.
  const block = (ax: number, az: number, cx: number, cz: number) => {
    b.box('flat:#a49e92', ax, GY, az, cx, GY + 1.9, cz);
    b.deco('flat:#8a8478', ax - 0.03, GY + 1.9, az - 0.03, cx + 0.03, GY + 2.0, cz + 0.03);
    for (let u = 0.45; u < 1.9; u += 0.45) b.deco('flat:#958f84', ax - 0.005, GY + u, az - 0.005, cx + 0.005, GY + u + 0.015, cz + 0.005);
  };
  // An open alley runs on through to the lane behind: no walls, the back lane's life along it.
  if (open) backGap(b, r, 'z', z0 + 0.2, z1, x0, x1);
  else {
    block(x0, z1, x1, z1 + 0.2);
    for (const [a, c] of [[x0 - 0.2, x0], [x1, x1 + 0.2]]) block(a, z0 + 0.4, c, z1);
  }
  // An open alley's walls are its neighbours', with their own pipes, AC units and lamps (buildkit.py backs).
  if (open) return;
  void H;
  // Pipes up both walls, air-conditioning units, a small lamp on a bracket, wires across.
  for (const [x, s] of [[x0 + 0.08, 1], [x1 - 0.08, -1]] as [number, number][]) {
    b.mesh('flat:#6f726b', 'cyl', x, GY + H / 2, z0 + 1.2 + r() * 2, 0.1, H, 0.1);
    for (let z = z0 + 2.5; z < z1 - 1; z += 3 + r() * 2) {
      if (r() < 0.6) {
        const ay = GY + 2.6 + r() * 2.5;
        b.deco('flat:#c9c8c0', Math.min(x, x + s * 0.32), ay, z, Math.max(x, x + s * 0.32), ay + 0.6, z + 0.75);
      }
    }
  }
  b.deco('flat:#26292b', x0, GY + 3.4, z0 + depth * 0.4 - 0.02, x1, GY + 3.45, z0 + depth * 0.4 + 0.02);
  b.deco('flat:#5f6266', x0, GY + 3.3, z0 + depth * 0.4 - 0.02, x0 + 0.37, GY + 3.34, z0 + depth * 0.4 + 0.02);
  b.mesh('flat:#3a3d42', 'cone', x0 + 0.37, GY + 3.28, z0 + depth * 0.4, 0.32, 0.12, 0.32);
  b.mesh('glow:#ffd9a0', 'sphere', x0 + 0.37, GY + 3.12, z0 + depth * 0.4, 0.16, 0.16, 0.16);
  for (let k = 0; k < 2; k++) {
    const z = z0 + 2 + k * (depth - 4);
    b.deco('flat:#1b1b1b', x0, GY + 5.2 + k * 0.6, z, x1, GY + 5.22 + k * 0.6, z + 0.02);
  }
  // Bins and crates against one wall, clear of the middle.
  if (w >= 1.8) {
    const sx = r() < 0.5 ? x0 + 0.05 : x1 - 0.65;
    for (let k = 0; k < 2; k++) {
      const z = z0 + 3 + k * 0.75;
      b.box(['flat:#2e5a3a', 'flat:#3a4a6a'][k], sx, GY, z, sx + 0.6, GY + 0.95, z + 0.65);
    }
    b.box('flat:#d6a21a', sx, GY, z0 + depth - 2.2, sx + 0.55, GY + 0.3, z0 + depth - 1.7);
    b.box('flat:#b3261e', sx, GY + 0.3, z0 + depth - 2.2, sx + 0.55, GY + 0.6, z0 + depth - 1.7);
  }
}

/**
 * The back lane behind a front row, along x0 … x1, against the back row whose fronts stand at z = zb:
 * darker paving with a drain channel, and along the back row's side the lane's life: bins, parked
 * bicycles, stacked crates, a drinks machine, a laundry pole; small lamps on poles, wires across.
 */
function backLane(b: Builder, r: () => number, x0: number, x1: number, zb: number) {
  if (x1 - x0 < 8) return;
  b.deco('flat:#6a655c', x0, GY, zb - 6, x1, GY + 0.012, zb);
  b.deco('flat:#3f3b37', x0, GY + 0.012, zb - 0.75, x1, GY + 0.016, zb - 0.45);
  const putModel = (kind: string, id: string, x: number, z: number, f: [number, number]) => {
    const d = b.dir(f);
    b.out.models.push({ kind, id, pos: b.pt(x, GY, z), yaw: Math.atan2(-d[0], -d[1]) + 0, seed: 0, merge: true });
  };
  let k = Math.floor(r() * 5);
  for (let x = x0 + 3; x < x1 - 3; x += 6 + r() * 3, k++) {
    const z = zb - 0.5;
    switch (k % 5) {
      case 0: // bins
        for (let j = 0; j < 2; j++) b.box(['flat:#2e5a3a', 'flat:#3a4a6a'][j], x + j * 0.7, GY, z - 0.65, x + j * 0.7 + 0.6, GY + 0.95, z);
        break;
      case 1: // bicycles
        for (let j = 0; j < 2; j++) putModel('places', 'bicycle', x + j * 0.7, z - 0.5, [0, -1]);
        b.block(x - 0.2, GY, z - 1.4, x + 0.9, GY + 1.0, z);
        break;
      case 2: // crates of empty bottles
        b.box('flat:#d6a21a', x, GY, z - 0.5, x + 0.55, GY + 0.3, z);
        b.box('flat:#b3261e', x, GY + 0.3, z - 0.5, x + 0.55, GY + 0.6, z);
        b.box('flat:#d6a21a', x + 0.6, GY, z - 0.5, x + 1.15, GY + 0.3, z);
        break;
      case 3: // a drinks machine facing the lane
        vending(b, x + 0.5, GY, z - 0.4, [0, -1], r() < 0.5 ? 'vending' : 'vending2');
        break;
      default: // a laundry pole
        for (const dx of [0, 2.2]) b.box('flat:#9aa0a6', x + dx - 0.03, GY, z - 0.33, x + dx + 0.03, GY + 2.3, z - 0.27);
        b.deco('flat:#9aa0a6', x, GY + 2.25, z - 0.32, x + 2.2, GY + 2.28, z - 0.28);
        for (let j = 0; j < 4; j++) b.deco(['flat:#e8e4dc', 'flat:#3a5a9a', 'flat:#c0392b', 'flat:#d9c27a'][j], x + 0.2 + j * 0.5, GY + 1.85, z - 0.31, x + 0.55 + j * 0.5, GY + 2.25, z - 0.29);
    }
  }
  for (let x = x0 + 8; x < x1 - 4; x += 18) {
    b.box('flat:#5f6266', x - 0.05, GY, zb - 0.25, x + 0.05, GY + 3.4, zb - 0.15);
    b.deco('flat:#5f6266', x - 0.03, GY + 3.35, zb - 0.9, x + 0.03, GY + 3.4, zb - 0.2);
    b.mesh('glow:#ffd9a0', 'sphere', x, GY + 3.25, zb - 0.9, 0.24, 0.2, 0.24);
  }
  for (let x = x0 + 5; x < x1 - 2; x += 12) b.deco('flat:#1b1b1b', x, GY + 5.6, zb - 9, x + 0.02, GY + 5.62, zb);
}

/**
 * A side street of the plot carried on past its edge on side s (±1 along z): asphalt, pavements,
 * kerb lamps, a cross street halfway, and rows of buildings facing it on both sides (detail cells
 * show them full when near), kept clear of the backdrop. Beyond the plot's walls: seen, not walked.
 */
function sideStreetOut(b: Builder, spec: SurfaceSpec, xc: number, s: 1 | -1, lamp: LampKind | undefined) {
  const r = rng(spec.seed * 17 + Math.round(xc) * 3 + (s > 0 ? 1 : 0));
  const Z = PLOT_Z, LEN = 170, h = 3.5, P = 8, crossAt = Z + 88;
  const za = s > 0 ? Z : -(Z + LEN), zc = s > 0 ? Z + LEN : -Z;
  b.clearScenery(xc - 70, za, xc + 70, zc);
  b.deco('asphalt', xc - h, -0.03, za, xc + h, 0.0, zc);
  for (let z = za; z < zc - 3; z += 6) b.deco('flat:#e9e9e4', xc - 0.06, 0.004, z, xc + 0.06, 0.01, z + 3);
  const cz = s * crossAt, [ca, cb] = [cz - 3.5, cz + 3.5];
  for (const side of [-1, 1]) {
    b.deco('paver', Math.min(xc + side * h, xc + side * P), 0, za, Math.max(xc + side * h, xc + side * P), GY, ca);
    b.deco('paver', Math.min(xc + side * h, xc + side * P), 0, cb, Math.max(xc + side * h, xc + side * P), GY, zc);
    if (lamp) for (let z = za + 10; z < zc - 4; z += 30) if (Math.abs(z - cz) > 9) streetLamp(b, lamp, xc + side * (h + 0.6), z, [-side, 0]);
    b.deco('asphalt', Math.min(xc + side * h, xc + side * 70), -0.03, ca, Math.max(xc + side * h, xc + side * 70), 0.0, cb);
  }
  crosswalk(b, xc, ca - 3.5, 2 * h - 0.4, 3, false);
  crosswalk(b, xc, cb + 3.5, 2 * h - 0.4, 3, false);
  const night = spec.left === 'neon' || spec.right === 'neon';
  const ok = (m: BuildingModel) => (night ? m.kind === 'zakkyo' || m.kind === 'shophouse' : m.kind === 'office' || m.kind === 'zakkyo' || m.kind === 'manshon');
  for (const [a, c] of [[za, ca - 3], [cb + 3, zc]] as [number, number][]) {
    for (const [xf, face] of [[xc - P, 1], [xc + P, -1]] as [number, 1 | -1][]) {
      const taken: Lot[] = [];
      frontRow(b, r, xf, face, a, c, 18, taken, ok, false);
      frontRow(b, r, xf - face * 22, face, a, c, 18, taken, ok, false);
    }
  }
}

// ── Blocks of lanes (rule 7: every walkable space filled, alleys and small streets all round) ──

/** Invented names for the small shrines the lanes turn up, one picked per station by its seed. */
const LANE_SHRINES = [
  { ja: '路地稲荷', en: 'Roji Inari' }, { ja: '福徳稲荷', en: 'Fukutoku Inari' }, { ja: '水神社', en: 'Suijin Shrine' },
  { ja: '横丁地蔵', en: 'Yokochō Jizō' }, { ja: '辻の祠', en: 'Tsuji Shrine' },
];

/**
 * The part of a block behind its front row, from z0 back to the plot's edge, between x0 and x1:
 * a lane parallel to the main road, a row of small buildings facing it (shophouses, zakkyo bars,
 * flats), and where there is room a second lane and row. Doorstep life in front of the rows;
 * now and then a lot becomes a small surprise (a shrine, a pocket park, a vending corner, coin
 * parking). `dense`: an old or nightlife quarter (more small shops, fewer flats).
 */
function rearRows(b: Builder, r: () => number, x0: number, x1: number, z0: number, dense: boolean, night: boolean, name: { ja: string; en: string }, surprises = true) {
  if (x1 - x0 < 7) return;
  const zEnd = PLOT_Z - 1;
  let z = z0;
  for (let row = 0; row < 3 && zEnd - z > 13; row++) {
    const lane = z + 4;
    backLane(b, r, x0, x1, lane);
    const depthMax = Math.min(18, zEnd - lane - 1);
    // A surprise in some rows: one lot given over to a small place.
    let a = x0;
    if (surprises && r() < 0.35 && x1 - x0 > 16) {
      const kinds: { kind: PlaceKind | 'parking'; w: number; d: number }[] = [
        { kind: 'shrine' as const, w: PLACES.shrine.w + 0.6, d: PLACES.shrine.d }, { kind: 'park' as const, w: PLACES.park.w + 0.6, d: PLACES.park.d },
        { kind: 'vending' as const, w: PLACES.vending.w + 0.6, d: PLACES.vending.d }, { kind: 'parking' as const, w: 12, d: 13 },
      ].filter((k) => k.d <= depthMax && k.w <= x1 - x0 - 6);
      if (kinds.length) {
        const k = kinds[Math.floor(r() * kinds.length)];
        const px = x0 + Math.floor(r() * Math.max(1, x1 - x0 - k.w - 4));
        if (k.kind === 'parking') coinParking(b, px, lane, k.w, k.d);
        else {
          const shrine = LANE_SHRINES[Math.abs(Math.round(x0 * 7 + z0)) % LANE_SHRINES.length];
          const label = k.kind === 'shrine' ? { ja: name.ja + shrine.ja, en: `${name.en} ${shrine.en}` }
            : k.kind === 'park' ? { ja: `${name.ja}ポケットパーク`, en: `${name.en} Pocket Park` } : { ja: 'ドリンクコーナー', en: 'Drinks corner' };
          b.with({ t: [px + k.w / 2, 0, lane] }, () => place(b, { kind: k.kind as PlaceKind, ...label }));
        }
        if (px - a >= 5) rowOf(b, r, a, px, lane, depthMax, dense, night);
        a = px + k.w;
      }
    }
    if (x1 - a >= 5) rowOf(b, r, a, x1, lane, depthMax, dense, night);
    z = lane + depthMax + 1;
  }
}

/** One row of small buildings facing a lane at z = lane, with doorstep life in front of them. */
function rowOf(b: Builder, r: () => number, x0: number, x1: number, lane: number, depthMax: number, dense: boolean, night: boolean) {
  const placed = fillModelLots(b, r, x0, x1, lane, lane + depthMax + 2, { old: !night, night, noBack: true, lo: false });
  for (const l of placed) {
    const [a, , c] = l, w = c - a;
    if (w < 3 || ALLEY_LOTS.has(l)) continue;
    // Potted plants by the door, a mailbox, now and then a parked bicycle or a scooter.
    const x = a + 0.6 + r() * Math.max(0.1, w - 2.4);
    for (let k = 0; k < 2 + Math.floor(r() * 3); k++) {
      const px = x + k * 0.42, s = 0.22 + r() * 0.12;
      b.mesh('flat:#9a5a3a', 'cyl', px, GY + 0.15, lane - 0.3, s, 0.3, s);
      b.mesh(['flat:#4f8f45', 'flat:#3f7a3a', 'flat:#6aa84f'][k % 3], 'sphere', px, GY + 0.45, lane - 0.3, s * 1.6, s * 1.5, s * 1.6);
    }
    b.box('flat:#c0392b', x + 1.4, GY + 0.9, lane - 0.12, x + 1.7, GY + 1.25, lane);
    if (!dense || r() < 0.4) {
      const d = b.dir([0, -1]);
      b.out.models.push({ kind: 'places', id: 'bicycle', pos: b.pt(x - 0.6, GY, lane - 0.6), yaw: Math.atan2(-d[0], -d[1]) + 0, seed: 0, merge: true });
      b.block(x - 0.8, GY, lane - 1.4, x - 0.4, GY + 1.0, lane);
    }
  }
}

/** Coin parking on a lot w × d behind its front line at z = lane: asphalt, white bays, a pay machine, its sign. */
function coinParking(b: Builder, x0: number, lane: number, w: number, d: number) {
  b.deco('asphalt', x0, GY, lane, x0 + w, GY + 0.01, lane + d);
  for (let x = x0 + 0.5; x <= x0 + w - 2.4; x += 2.6) {
    b.deco('flat:#e9e9e4', x, GY + 0.01, lane + d - 5.5, x + 0.1, GY + 0.014, lane + d - 0.5);
    b.deco('flat:#d6a21a', x + 0.4, GY + 0.01, lane + d - 1.4, x + 2.2, GY + 0.1, lane + d - 1.2);
  }
  b.box('flat:#f2c230', x0 + 0.4, GY, lane + 0.6, x0 + 1.0, GY + 1.4, lane + 1.1);
  b.box('flat:#5f6266', x0 + w - 0.6, GY, lane + 0.4, x0 + w - 0.5, GY + 2.6, lane + 0.5);
  b.sign({ k: 'label', text: 'P', sub: '24h コインパーキング', fg: '#fff', bg: '#1f5fa8' }, x0 + w - 0.55, GY + 2.2, lane + 0.38, [0, -1], 0.9, 0.8);
  b.box('flat:#26292b', x0, GY, lane + d, x0 + w, GY + 1.2, lane + d + 0.1);
}

/** A lane running back from the pavement between two blocks, x0 … x1, z0 … z1: paving, wires, a lamp. */
function crossLane(b: Builder, r: () => number, x0: number, x1: number, z0: number, z1: number, rw: number, traffic = true) {
  // Its traffic: one way out to the main road, from just past the plot's back (where the lane runs on
  // out of sight); a stop line before the pavement, then a turn onto the main road while its own
  // traffic flows (its phase, so there are gaps to slip into, never a standing queue to wait behind).
  // Scooters, bicycles, kei trucks, the odd small car (traffic/system.ts 'minor').
  const xc = (x0 + x1) / 2, zFrom = PLOT_Z + 1.5;
  if (traffic) b.out.lanes.push({ from: b.pt(xc, 0, zFrom), to: b.pt(xc, 0, -rw), speed: 6, flow: 1.6, use: 'minor', taxi: 0, stops: [{ at: zFrom - z0, axis: 0, exit: zFrom + rw }], halts: [], dead: true });
  b.deco('flat:#e9e9e4', x0 + 0.1, GY + 0.016, z0 + 0.4, x1 - 0.1, GY + 0.022, z0 + 0.55);
  // The lane mouth across the pavement: a dropped kerb, paved as the lane.
  b.deco('flat:#5d5852', x0, GY + 0.001, rw, x1, GY + 0.012, z0);
  b.deco('flat:#5d5852', x0, GY, z0, x1, GY + 0.012, z1);
  b.deco('flat:#3f3b37', (x0 + x1) / 2 - 0.08, GY + 0.012, z0, (x0 + x1) / 2 + 0.08, GY + 0.016, z1);
  for (let z = z0 + 6; z < z1 - 2; z += 9) {
    const wy = GY + 5.4 + r() * 0.8;
    b.deco('flat:#1b1b1b', x0, wy, z, x1, wy + 0.02, z + 0.02);
  }
  for (let z = z0 + 10; z < z1 - 4; z += 16) {
    b.mesh('glow:#ffd9a0', 'sphere', x0 + 0.3, GY + 3.2, z, 0.22, 0.2, 0.22);
    b.deco('flat:#5f6266', x0, GY + 3.25, z - 0.02, x0 + 0.35, GY + 3.3, z + 0.02);
  }
}

// ── Small streets (central Osaka: 6.5 m streets through the blocks, poles and wires, traffic both ways) ──

/** Width of a small street: a 5 m roadway between white edge lines, a 0.75 m walking strip each side. */
const SMALL_W = 6.5;
/** How far back from the pavement the parallel small street runs (a front row, then a row facing it). */
const SMALL_P = 28;
/** Building kinds on the small streets: low and mixed; no balconied flats (the poles stand close). */
const smallKinds = (night: boolean, dense: boolean) => (night ? ['machi', 'zakkyo', 'zakkyo', 'shophouse'] : dense ? ['machi', 'machi', 'shophouse', 'zakkyo'] : ['machi', 'machi', 'machi', 'shophouse']);

/**
 * A back lane between rows of buildings: along `axis` from u0 to u1, across at0 … at1. Worn
 * concrete with a drain down the middle, bins, crates and a bicycle against one side, a bracket
 * lamp, wires overhead. Narrow ones only get the paving and the lamp.
 */
function backGap(b: Builder, r: () => number, axis: 'x' | 'z', u0: number, u1: number, at0: number, at1: number) {
  if (u1 - u0 < 2 || at1 - at0 < 1) return;
  const box = (mat: string, a: number, c: number, p: number, q: number, y0: number, y1: number, solid = false) => {
    const [x0, z0, x1, z1] = axis === 'x' ? [a, p, c, q] : [p, a, q, c];
    if (solid) b.box(mat, x0, GY + y0, z0, x1, GY + y1, z1);
    else b.deco(mat, x0, GY + y0, z0, x1, GY + y1, z1);
  };
  const w = at1 - at0, mid = (at0 + at1) / 2;
  box('flat:#8d877c', u0, u1, at0, at1, 0.001, 0.012);
  box('flat:#5f5a52', u0, u1, mid - 0.1, mid + 0.1, 0.012, 0.016);
  if (w < 1.7) return;
  // Clutter against the side away from the lamps, leaving 1.1 m to walk.
  const side = Math.min(0.6, w - 1.1), s0 = at1 - side;
  for (let u = u0 + 2 + r() * 3; u < u1 - 2; u += 5 + r() * 6) {
    const k = r();
    if (k < 0.4) {
      box('flat:#2e5a3a', u, u + 0.6, s0, at1 - 0.02, 0, 0.95, true);
      box('flat:#3a4a6a', u + 0.7, u + 1.3, s0, at1 - 0.02, 0, 0.95, true);
    } else if (k < 0.65) {
      box('flat:#d6a21a', u, u + 0.55, s0, at1 - 0.02, 0, 0.3, true);
      box('flat:#b3261e', u, u + 0.55, s0, at1 - 0.02, 0.3, 0.6, true);
    } else if (k < 0.85) {
      box('flat:#b8bab6', u, u + 0.9, s0, at1 - 0.02, 0, 0.7, true);
      box('flat:#6f726b', u + 0.1, u + 0.8, s0 - 0.01, at1, 0.15, 0.55);
    } else {
      const [x, z] = axis === 'x' ? [u + 0.9, at1 - side / 2] : [at1 - side / 2, u + 0.9];
      const d = b.dir(axis === 'x' ? [1, 0] : [0, 1]);
      b.out.models.push({ kind: 'places', id: 'bicycle', pos: b.pt(x, GY, z), yaw: Math.atan2(-d[0], -d[1]), seed: 0, merge: true });
      const [p, q] = axis === 'x' ? [[u, s0], [u + 1.8, at1]] : [[s0, u], [at1, u + 1.8]];
      b.block(p[0], GY, p[1], q[0], GY + 1, q[1]);
    }
  }
}

/** Rows of low buildings one behind another from z0 to the plot's back, x0 … x1 (seen over the roofs, never walked to). */
function stackRows(b: Builder, r: () => number, x0: number, x1: number, z0: number, kinds: string[]) {
  const z1 = PLOT_Z - 1.5;
  let z = z0;
  for (let guard = 0; guard < 4 && z1 - z > 9.5 && x1 - x0 >= 4.6; guard++) {
    const row = fillModelLots(b, r, x0, x1, z, z1, { kinds, noBack: true });
    if (!row.length) break;
    z = Math.max(...row.map((l) => l[3])) + 0.3;
  }
}

/** Asphalt between u0 and u1 along `axis`, across at0 … at1, with white edge lines and a manhole cover now and then. */
export function smallRoad(b: Builder, r: () => number, axis: 'x' | 'z', u0: number, u1: number, at0: number, at1: number, lines = true) {
  if (u1 - u0 < 0.2) return;
  const box = (mat: string, a: number, c: number, p: number, q: number, y0: number, y1: number) =>
    axis === 'z' ? b.deco(mat, p, y0, a, q, y1, c) : b.deco(mat, a, y0, p, c, y1, q);
  box('asphalt', u0, u1, at0, at1, GY + 0.002, GY + 0.013);
  if (!lines) return;
  for (const e of [at0 + 0.75, at1 - 0.75]) box('flat:#e9e9e4', u0, u1, e - 0.06, e + 0.06, GY + 0.013, GY + 0.018);
  for (let u = u0 + 6 + r() * 6; u < u1 - 3; u += 16 + r() * 10) {
    const c = (at0 + at1) / 2 + (r() - 0.5) * 1.5;
    const [x, z] = axis === 'z' ? [c, u] : [u, c];
    b.mesh('flat:#55585c', 'cyl', x, GY + 0.016, z, 0.62, 0.008, 0.62);
  }
}

/** Whether the current frame is mirrored (the −z side of the street is built in one). */
function mirrored(b: Builder): boolean {
  const d1 = b.dir([1, 0]), d2 = b.dir([0, 1]);
  return d1[0] * d2[1] - d1[1] * d2[0] < 0;
}

/** Menu words for the A-boards (invented, no prices). */
const MENU: { ja: string; en: string }[] = [
  { ja: '本日のランチ', en: "Today's lunch" }, { ja: '生ビール', en: 'Draught beer' }, { ja: '日替わり定食', en: 'Daily set meal' },
  { ja: '焼き鳥', en: 'Yakitori' }, { ja: 'コーヒー', en: 'Coffee' }, { ja: 'お好み焼き', en: 'Okonomiyaki' }, { ja: '営業中', en: 'Open' },
  { ja: 'テイクアウト', en: 'Take-out' }, { ja: '焼きたてパン', en: 'Fresh bread' }, { ja: 'ラーメン', en: 'Ramen' },
];
/** Words for the banner flags (のぼり), with their colours. */
const NOBORI: { ja: string; bg: string; fg: string }[] = [
  { ja: '営業中', bg: '#c8241c', fg: '#ffffff' }, { ja: 'ランチ', bg: '#f2f2ee', fg: '#c8241c' }, { ja: '生ビール', bg: '#1f5fae', fg: '#ffffff' },
  { ja: 'たこ焼き', bg: '#e8a020', fg: '#1f2023' }, { ja: '焼き鳥', bg: '#2a2d32', fg: '#ffffff' }, { ja: '新規オープン', bg: '#e8c020', fg: '#c8241c' },
  { ja: 'からあげ', bg: '#e86a1c', fg: '#ffffff' }, { ja: '珈琲', bg: '#4a3426', fg: '#f2efe6' },
];

/**
 * A row of 2–4 drink machines with a recycling bin at each end, backed against a front at z = zf
 * (fronts facing −z), from x: lit faces, and sometimes a corrugated roof over them and a bench.
 */
function vendCluster(b: Builder, r: () => number, x: number, zf: number) {
  const n = 2 + Math.floor(r() * 3), roof = r() < 0.45;
  if (roof) {
    roadModel(b, 'vendroof', x + 1.8, GY, zf - 0.5, [0, -1]);
    for (const px of [x + 0.05, x + 3.55]) b.block(px - 0.05, GY, zf - 1.5, px + 0.05, GY + 2.4, zf - 1.4);
    b.block(x + 3.65, GY, zf - 1.1, x + 4.65, GY + 0.46, zf - 0.7);
  }
  roadModel(b, 'recycle', x + 0.25, GY, zf - 0.35, [0, -1]);
  b.block(x, GY, zf - 0.6, x + 0.5, GY + 0.8, zf);
  let px = x + 0.55;
  for (let k = 0; k < (roof ? Math.min(n, 3) : n); k++) {
    vending(b, px + 0.5, GY, zf - 0.45, [0, -1], r() < 0.5 ? 'vending' : 'vending2', 'new');
    px += 1.03;
  }
  roadModel(b, 'recycle', px + 0.25, GY, zf - 0.35, [0, -1]);
  b.block(px, GY, zf - 0.6, px + 0.5, GY + 0.8, zf);
}

/**
 * Doorstep life along one front: from (x, z), `w` along (ax, az), outwards (ox, oz). Potted plants,
 * a mailbox and a gas meter on the wall, now and then a bicycle parked along it or a shop's A-board,
 * all within 0.9 m of the front (the small streets' traffic passes close).
 */
function doorstep(b: Builder, r: () => number, x: number, z: number, ax: number, az: number, ox: number, oz: number, w: number, rich = true) {
  if (w < 3) return;
  const at = (u: number, v: number): [number, number] => [x + ax * u + ox * v, z + az * u + oz * v];
  const box = (mat: string, u0: number, v0: number, u1: number, v1: number, y0: number, y1: number, solid = false) => {
    const [p, q] = [at(u0, v0), at(u1, v1)];
    (solid ? b.box : b.deco).call(b, mat, Math.min(p[0], q[0]), GY + y0, Math.min(p[1], q[1]), Math.max(p[0], q[0]), GY + y1, Math.max(p[1], q[1]));
  };
  const u = 0.6 + r() * Math.max(0.1, w - 2.6);
  for (let k = 0; k < 2 + Math.floor(r() * 3); k++) {
    const [px, pz] = at(u + k * 0.42, 0.3), s = 0.2 + r() * 0.12;
    b.mesh('flat:#9a5a3a', 'cyl', px, GY + 0.15, pz, s, 0.3, s);
    b.mesh(['flat:#4f8f45', 'flat:#3f7a3a', 'flat:#6aa84f'][k % 3], 'sphere', px, GY + 0.45, pz, s * 1.6, s * 1.5, s * 1.6);
  }
  box('flat:#c0392b', u + 1.4, 0, u + 1.7, 0.12, 0.9, 1.25);
  box('flat:#b8bab6', u + 2.0, 0, u + 2.35, 0.18, 1.1, 1.5);
  if (r() < 0.5 && w > 4) {
    const [px, pz] = at(Math.min(w - 1, u + 2.9), 0.36), d = b.dir([ax, az]);
    b.out.models.push({ kind: 'places', id: 'bicycle', pos: b.pt(px, GY, pz), yaw: Math.atan2(-d[0], -d[1]), seed: 0, merge: true });
    const [q0, q1] = [at(Math.min(w - 1, u + 2.9) - 0.9, 0.05), at(Math.min(w - 1, u + 2.9) + 0.9, 0.6)];
    b.block(Math.min(q0[0], q1[0]), GY, Math.min(q0[1], q1[1]), Math.max(q0[0], q1[0]), GY + 1, Math.max(q0[1], q1[1]));
  } else if (r() < 0.15) {
    const [px, pz] = at(Math.max(0.3, u - 0.35), 0.12);
    roadModel(b, 'barberpole', px, GY + 0.95, pz, [ox, oz]);
  } else if (r() < 0.55) {
    // An A-board with the day's menu, readable from both sides of the pavement.
    const [px, pz] = at(u - 0.3, 0.45), d = b.dir([ax, az]);
    b.out.models.push({ kind: 'road', id: 'aboard', pos: b.pt(px, GY, pz), yaw: Math.atan2(-d[0], -d[1]), seed: 0, merge: true });
    const [q0, q1] = [at(u - 0.65, 0.12), at(u + 0.05, 0.78)];
    b.block(Math.min(q0[0], q1[0]), GY, Math.min(q0[1], q1[1]), Math.max(q0[0], q1[0]), GY + 0.95, Math.max(q0[1], q1[1]));
    const m = MENU[Math.floor(r() * MENU.length)];
    for (const s of [1, -1]) b.sign({ k: 'label', text: m.ja, sub: m.en, fg: '#f2efe6', bg: '#2b2f2c' }, px + ax * s * 0.17, GY + 0.5, pz + az * s * 0.17, [ax * s, az * s], 0.5, 0.72);
  }
  // Plants: herb boxes, a potted pine or a shelf of pots; now and then a green curtain up a window.
  if (r() < (rich ? 0.6 : 0.2) && w > 3.5) {
    const k = r(), id = k < 0.4 ? 'herbbox' : k < 0.7 ? 'potpine' : 'plantshelf', uu = Math.max(0.6, Math.min(w - 0.8, u + 3.4));
    const [px, pz] = at(uu, 0.32);
    roadModel(b, id, px, GY, pz, [ox, oz]);
    const [q0, q1] = [at(uu - 0.6, 0.02), at(uu + 0.6, 0.62)];
    b.block(Math.min(q0[0], q1[0]), GY, Math.min(q0[1], q1[1]), Math.max(q0[0], q1[0]), GY + 0.9, Math.max(q0[1], q1[1]));
  }
  if (rich && r() < 0.14 && w > 5) {
    const uu = w - 1.4, [px, pz] = at(uu, 0.12);
    roadModel(b, 'greencurtain', px, GY, pz, [ox, oz]);
    const [q0, q1] = [at(uu - 0.8, 0.02), at(uu + 0.8, 0.4)];
    b.block(Math.min(q0[0], q1[0]), GY, Math.min(q0[1], q1[1]), Math.max(q0[0], q1[0]), GY + 2.2, Math.max(q0[1], q1[1]));
  }
  // A food-sample case or banner flags by a shop door.
  if (rich && r() < 0.12 && w > 4.5) {
    const [px, pz] = at(1.0, 0.3);
    roadModel(b, 'menucase', px, GY, pz, [ox, oz]);
    const [q0, q1] = [at(0.38, 0.02), at(1.62, 0.6)];
    b.block(Math.min(q0[0], q1[0]), GY, Math.min(q0[1], q1[1]), Math.max(q0[0], q1[0]), GY + 1.5, Math.max(q0[1], q1[1]));
  } else if (r() < (rich ? 0.3 : 0.12)) {
    const f = NOBORI[Math.floor(r() * NOBORI.length)];
    for (const uu of r() < 0.5 ? [0.35] : [0.35, w - 0.35]) {
      const [px, pz] = at(uu, 0.5), d = b.dir([ox, oz]);
      b.out.models.push({ kind: 'road', id: 'nobori', pos: b.pt(px, GY, pz), yaw: Math.atan2(-d[0], -d[1]), seed: 0, merge: true });
      b.block(px - 0.2, GY, pz - 0.2, px + 0.2, GY + 2.6, pz + 0.2);
      for (const s of [1, -1]) b.sign({ k: 'shop', ja: f.ja, bg: f.bg, fg: f.fg, vertical: true }, px + ax * 0.13 + ox * s * 0.012, GY + 1.85, pz + az * 0.13 + oz * s * 0.012, [ox * s, oz * s], 0.42, 1.65);
    }
  }
}

/**
 * A small street running back from the main road between x0 and x1 (x1 − x0 = SMALL_W), from the
 * main road's kerb (z = rw) through the plot to its back, where it runs on out of sight; crossed by
 * the parallel small street at p0 … p1. 止まれ and a stop line before the pavement, a stop sign and
 * a kerb mirror at its mouth, a 30 sign for the way in, utility poles down one side. With `traffic`:
 * a lane out (stop line, then left onto the main road) and a lane in (left turns off the main road).
 */
export function smallStreet(b: Builder, r: () => number, x0: number, x1: number, rw: number, swOut: number, p0: number, p1: number, traffic: boolean, name: { ja: string; en: string }, heavy = true, signals = 0.4, plotZ = PLOT_Z, mouthAxis: 0 | 1 = 0) {
  const z1 = plotZ - 1, xc = (x0 + x1) / 2, m = mirrored(b) ? -1 : 1;
  // The lane out keeps left: towards x0 in a plain frame, x1 in a mirrored one.
  const outX = xc - m * 1.1, kerbX = m > 0 ? x0 + 0.4 : x1 - 0.4, farX = m > 0 ? x1 - 0.4 : x0 + 0.4;
  smallRoad(b, r, 'z', rw, swOut, x0, x1, false);
  smallRoad(b, r, 'z', swOut, p0, x0, x1);
  smallRoad(b, r, 'z', p0, p1, x0, x1, false);
  smallRoad(b, r, 'z', p1, z1, x0, x1);
  // Stop line and 止まれ across the lane out, a stop sign at its kerb, the mirror opposite.
  b.deco('flat:#e9e9e4', Math.min(outX - 1.2, xc), GY + 0.018, swOut + 0.5, Math.max(outX + 1.2, xc), GY + 0.024, swOut + 0.8);
  mark(b, 'stop', outX, swOut + 3.2, [0, -1], 2.2, 3.2);
  roadSign(b, 'stop', kerbX, swOut + 1.1, [0, 1]);
  roadSign(b, 'speed30', farX, swOut + 5, [0, -1], 0.6);
  roadModel(b, 'mirror', farX, GY, swOut + 0.6, [0, 1]);
  b.block(farX - 0.08, GY, swOut + 0.52, farX + 0.08, GY + 2.6, swOut + 0.68);
  poleLine(b, { axis: 'z', from: swOut + 4, to: z1 - 1, at: x0 + 0.3, road: 1, step: 22, skip: (u) => u > p0 - 3.6 && u < p1 + 3.6, drops: 0.9, name });
  for (let z = swOut + 26; z < z1 - 4; z += 22) if (z < p0 - 3 || z > p1 + 3) streetLamp(b, 'lamp_small', x1 - 0.3, z, [-1, 0]);
  // On the pavement beside its mouth: one of the street's things, backed against the corner building.
  {
    const k = Math.floor(r() * 6), [id, w] = ([['postbox', 0.5], ['phonebox', 1.05], ['bikerack', 4.1], ['planter', 1.8], ['bench_s', 1.9], ['postbox', 0.5]] as [string, number][])[k];
    const px = x1 + 2.2 + w / 2, pz = swOut - (id === 'bikerack' ? 0.15 : id === 'phonebox' ? 0.6 : 0.4);
    roadModel(b, id, px, GY, pz, [0, -1]);
    b.block(px - w / 2, GY, pz - (id === 'phonebox' ? 0.5 : 0.35), px + w / 2, GY + (id === 'phonebox' ? 2.4 : 1.1), Math.min(swOut, pz + 0.5));
  }
  if (!traffic) return;
  const zFrom = plotZ + 1.5;
  // (mouthAxis 1: out on the main road's red, as the side roads do, where the main road is too busy for gaps.)
  const stops: LanePart['stops'] = [{ at: zFrom - swOut, axis: mouthAxis, exit: zFrom + rw }];
  // Now and then a signal where it crosses the parallel street (like the narrow junctions' short-arm
  // pole): a crosswalk over the small street, a stop line, pedestrian heads at both ends.
  if (r() < signals) {
    const zc = p1 + 0.8, zs = p1 + 4.3;
    for (let x = x0 + 0.95; x < x1 - 0.9; x += 0.9) b.deco('flat:#e9e9e4', x, GY + 0.018, zc, x + 0.45, GY + 0.024, zc + 3);
    b.deco('flat:#e9e9e4', Math.min(outX - 1.2, xc), GY + 0.018, zs, Math.max(outX + 1.2, xc), GY + 0.024, zs + 0.3);
    const KANJI = ['一', '二', '三', '四', '五'], n = Math.floor(r() * KANJI.length);
    const jn = { ja: `${name.ja}${KANJI[n]}丁目`, en: `${name.en} ${n + 1}` };
    shortSignal(b, kerbX, p0 - 0.6, [0, -1], 0, jn);
    pedSignal(b, x0 + 0.35, zc + 1.5, [1, 0], 1, { button: true });
    pedSignal(b, x1 - 0.35, zc + 1.5, [-1, 0], 1, { button: true });
    // The same on the main road's side of the junction: a head for traffic coming in from the main
    // road on the far corner, a crosswalk and its pedestrian heads, a stop line on the lane in.
    const zc2 = p0 - 3.8, zs2 = p0 - 4.6, inX = xc + m * 1.1;
    for (let x = x0 + 0.95; x < x1 - 0.9; x += 0.9) b.deco('flat:#e9e9e4', x, GY + 0.018, zc2, x + 0.45, GY + 0.024, zc2 + 3);
    b.deco('flat:#e9e9e4', Math.min(inX - 1.2, xc), GY + 0.018, zs2, Math.max(inX + 1.2, xc), GY + 0.024, zs2 + 0.3);
    shortSignal(b, farX, p1 + 0.6, [0, 1], 0, jn);
    pedSignal(b, x0 + 0.35, zc2 + 1.5, [1, 0], 1, { button: true });
    pedSignal(b, x1 - 0.35, zc2 + 1.5, [-1, 0], 1, { button: true });
    stops.unshift({ at: zFrom - zs, axis: 0, exit: zFrom - (p0 - 1) });
  }
  b.out.lanes.push({ from: b.pt(outX, 0, zFrom), to: b.pt(outX, 0, -rw), speed: 6, flow: 1.6, use: 'minor', taxi: 0, stops, halts: [], dead: true });
  b.out.lanes.push({ from: b.pt(xc + m * 1.1, 0, -rw), to: b.pt(xc + m * 1.1, 0, zFrom), speed: 6, flow: 0, use: 'minor', taxi: 0, stops: [], halts: [] });
}

/**
 * The part of a block behind the parallel small street (z ≥ z0), x0 … x1: rows of low buildings
 * fronting the small streets either side where there is one (`left`, `right`), and between them
 * a row fronting the parallel street, each with its doorstep life.
 */
function smallBlock(b: Builder, r: () => number, x0: number, x1: number, z0: number, left: boolean, right: boolean, dense: boolean, night: boolean) {
  const DEPTH = 11, z1 = PLOT_Z - 1.5;
  const kinds = smallKinds(night, dense);
  const taken: Lot[] = [];
  let a = x0, c = x1;
  for (const [on, xf, face] of [[left, x0, -1], [right, x1, 1]] as [boolean, number, 1 | -1][]) {
    if (!on || x1 - x0 < DEPTH + 8) continue;
    const n0 = taken.length;
    sideRow(b, r, xf, face, z0 + 0.4, z1, DEPTH, taken, { old: true, full: 99, kinds, open: true });
    const mine = taken.slice(n0);
    for (const [lx0, lz0, lx1, lz1] of mine) doorstep(b, r, face > 0 ? lx1 : lx0, lz0, 0, 1, face, 0, lz1 - lz0, dense);
    // Behind the row a lane runs back from the parallel street, between its backs and the middle rows.
    const rowBack = mine.length ? (face < 0 ? Math.max(...mine.map((l) => l[2])) : Math.min(...mine.map((l) => l[0]))) : face < 0 ? x0 + 1 : x1 - 1;
    if (face < 0) {
      a = rowBack + 1.8;
      backGap(b, r, 'z', z0 + 0.4, z1, rowBack + 0.05, a - 0.05);
    } else {
      c = rowBack - 1.8;
      backGap(b, r, 'z', z0 + 0.4, z1, c + 0.05, rowBack - 0.05);
    }
  }
  if (c - a < 1.6) return;
  // The row facing the parallel street, now and then with a small place in it: a shrine, a pocket
  // park, a drinks corner or coin parking.
  const parts: [number, number][] = [];
  if (r() < 0.4 && c - a > 16) {
    const options = [
      { kind: 'shrine' as const, w: PLACES.shrine.w + 0.6, d: PLACES.shrine.d }, { kind: 'park' as const, w: PLACES.park.w + 0.6, d: PLACES.park.d },
      { kind: 'vending' as const, w: PLACES.vending.w + 0.6, d: PLACES.vending.d }, { kind: 'parking' as const, w: 12, d: 13 },
    ].filter((o) => o.w <= c - a - 5 && o.d < z1 - z0 - 2);
    if (options.length) {
      const o = options[Math.floor(r() * options.length)];
      const px = a + 1 + Math.floor(r() * Math.max(1, c - a - o.w - 2));
      if (o.kind === 'parking') coinParking(b, px, z0 + 0.3, o.w, o.d);
      else b.with({ t: [px + o.w / 2, 0, z0 + 0.3] }, () => place(b, { kind: o.kind as PlaceKind, ja: o.kind === 'shrine' ? '稲荷社' : o.kind === 'park' ? 'ポケットパーク' : 'ドリンクコーナー', en: o.kind === 'shrine' ? 'Inari shrine' : o.kind === 'park' ? 'Pocket park' : 'Drinks corner' }));
      if (px - a >= 1.6) parts.push([a, px]);
      if (c - (px + o.w) >= 1.6) parts.push([px + o.w, c]);
      stackRows(b, r, px, px + o.w, z0 + 0.3 + o.d + 0.6, kinds);
    } else parts.push([a, c]);
  } else parts.push([a, c]);
  for (const [p, q] of parts) {
    const placed = fillModelLots(b, r, p, q, z0 + 0.3, z1, { kinds, noBack: true, open: true });
    for (const l of placed) if (!ALLEY_LOTS.has(l)) doorstep(b, r, l[0], l[1], 1, 0, 0, -1, l[2] - l[0], dense);
    stackRows(b, r, p, q, Math.max(z0 + 6, ...placed.map((l) => l[3])) + 0.3, kinds);
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
