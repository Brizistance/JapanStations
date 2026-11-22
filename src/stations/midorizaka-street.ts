// Midorizaka's street (緑坂): the north hills. On the −z side Midorizaka Park, open to the pavement
// where the station's pavilions stand: a pond crossed by a stone arch bridge, a wisteria trellis over
// benches, a playground, lawns, paths and trees. On the +z side the station plaza, a bus and taxi
// rotary round a planted island with a clock post, and beside it Midorizaka Ginza, a short row of
// small shops.
//
// Models: tools/blender/build_midori.py (public/models/buildings/midori.glb); BL, BW, BH, TL, TD, SL,
// CW, CH, IW, ID, GW, GD are mirrored here. This file adds colliders, water, paths, trees, names.
import type { Builder } from '../world/builder';
import { GROUND_Y } from './kit';
import type { PieceId } from './pieces';
import { roadModel, streetLamp } from './roads';
import { modelTree } from './trees';

const GY = GROUND_Y;
const BL = 9, BW = 2.4, BH = 1.6;
const TL = 8, TD = 3.2;
const SL = 4.2;
const CW = 2.4, CH = 2.0;
const IW = 16, ID = 6;
const GW = 8, GD = 9;

export const MIDORI_PIECES: PieceId[] = ['park', 'plaza', 'ginza'];

const put = (b: Builder, id: string, x: number, y: number, z: number) => b.model('midori', id, x, y, z);

/** Shops of Midorizaka Ginza, two to a building, left to right (ginza_a: glazed, open; ginza_b: open, glazed). */
const GINZA_SHOPS: { ja: string; en: string; bg: string }[] = [
  { ja: 'パン工房 ぶどうの木', en: 'Budō-no-ki Bakery', bg: '#7a4a2a' }, { ja: '花 みどり', en: 'Midori Flowers', bg: '#2e6b35' },
  { ja: '八百屋 丘の上', en: 'Oka-no-ue Greengrocer', bg: '#3c7a3a' }, { ja: 'コインランドリー', en: 'Coin Laundry', bg: '#1f5fa8' },
  { ja: '本とおもちゃ ぶんぶん', en: 'Bunbun Books & Toys', bg: '#c0392b' }, { ja: '和菓子 若葉', en: 'Wakaba Sweets', bg: '#5a7a3a' },
  { ja: 'クリーニング 白樺', en: 'Shirakaba Cleaners', bg: '#2b5f9e' }, { ja: '喫茶 ひだまり', en: 'Kissa Hidamari', bg: '#6b3a1f' },
];

/**
 * A piece on its lot, in the frame of places.ts (middle of the lot's front at the origin, lot along
 * +z). `pav`: the pavement's width in front of the lot.
 */
export function midoriPiece(b: Builder, o: { id: PieceId; ja: string; en: string }, pav: number) {
  // In a mirrored lot frame (the −z side) a model only turns: its +x is the frame's −x.
  const d1 = b.dir([1, 0]), d2 = b.dir([0, 1]), f = d1[0] * d2[1] - d1[1] * d2[0] < 0 ? -1 : 1;
  const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => b.block(Math.min(f * x0, f * x1), y0, z0, Math.max(f * x0, f * x1), y1, z1);
  const at = (id: string, x: number, z: number) => put(b, id, f * x, GY, z);
  if (o.id === 'park') park(b, o, f, blk, at);
  else if (o.id === 'plaza') plaza(b, f, blk, at, pav);
  else ginza(b, f, blk, at);
}

type Blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => void;
type At = (id: string, x: number, z: number) => void;

// ── Midorizaka Park ──────────────────────────────────────────────────────────────────────────

/** The pond: water at the lawn's level inside a rim of stones you cannot cross, the bridge over it at z = 18. */
const POND = { x0: -21, x1: -13.5, z0: 12.5, z1: 24 };

function park(b: Builder, o: { ja: string; en: string }, f: number, blk: Blk, at: At) {
  // The park runs the whole block between the cross streets, so both exit pavilions stand at its edge.
  const X = 59, D = 26;
  const deco = (mat: string, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => b.deco(mat, Math.min(f * x0, f * x1), y0, z0, Math.max(f * x0, f * x1), y1, z1);
  // Lawn over the whole lot, a low granite kerb along the pavement, paths of pale paving.
  deco('flat:#6f9a4f', -X, GY, 0.2, X, GY + 0.015, D);
  deco('flat:#a9a59a', -X, GY, 0, X, GY + 0.12, 0.2);
  const paths: [number, number, number, number][] = [
    [-2, 0.2, 2, 9], [-57, 9, 57, 11], [-30, 11, -28, 18], [-30, 17, -21.5, 19], [-12.5, 17, -4, 19], [-6, 11, -4, 17],
    [14, 11, 16, 22], [3, 17.4, 13, 19], [-50, 0.2, -47, 9], [47, 0.2, 50, 9], [36, 11, 38, 22], [-40, 11, -38, 22],
  ];
  for (const [x0, z0, x1, z1] of paths) deco('flat:#d8d0bd', x0, GY + 0.015, z0, x1, GY + 0.025, z1);
  // The pond, its stone rim, the arch bridge with ramps up and down.
  const P = POND;
  deco('water', P.x0, GY + 0.005, P.z0, P.x1, GY + 0.035, P.z1);
  for (const [x0, z0, x1, z1] of [[P.x0 - 0.5, P.z0 - 0.5, P.x1 + 0.5, P.z0], [P.x0 - 0.5, P.z1, P.x1 + 0.5, P.z1 + 0.5], [P.x0 - 0.5, P.z0, P.x0, 16.7], [P.x0 - 0.5, 19.3, P.x0, P.z1], [P.x1, P.z0, P.x1 + 0.5, 16.7], [P.x1, 19.3, P.x1 + 0.5, P.z1]]) {
    deco('flat:#8f877a', x0, GY, z0, x1, GY + 0.35, z1);
    blk(x0, GY, z0, x1, GY + 0.9, z1);
  }
  for (let k = 0; k < 9; k++) {
    const x = P.x0 + 0.6 + ((P.x1 - P.x0 - 1.2) * ((k * 5) % 9)) / 8, z = P.z0 + 1 + ((k * 7) % 9) * 1.15;
    if (Math.abs(z - 18) < 1.6) continue;
    b.mesh('flat:#c0392b', 'sphere', f * x, GY + 0.04, z, 0.22, 0.05, 0.1);
  }
  const bx = (P.x0 + P.x1) / 2;
  at('bridge', bx, 18);
  b.ramp(Math.min(f * (bx - BL / 2), f * bx), 18 - BW / 2 + 0.25, Math.max(f * (bx - BL / 2), f * bx), 18 + BW / 2 - 0.25, GY, GY + BH, [f * 1, 0] as [number, number]);
  b.ramp(Math.min(f * bx, f * (bx + BL / 2)), 18 - BW / 2 + 0.25, Math.max(f * bx, f * (bx + BL / 2)), 18 + BW / 2 - 0.25, GY, GY + BH, [-f * 1, 0] as [number, number]);
  for (const s of [-1, 1]) blk(bx - BL / 2, GY, 18 + s * (BW / 2) - 0.25, bx + BL / 2, GY + BH + 0.9, 18 + s * (BW / 2) + 0.05);
  // Wisteria trellis by the east path, benches under it.
  at('trellis', 8, 19.4);
  for (const x of [8 - TL / 2 + 0.2, 8 - TL / 6, 8 + TL / 6, 8 + TL / 2 - 0.2]) for (const z of [19.6, 19.4 + TD - 0.2]) blk(x - 0.12, GY, z - 0.12, x + 0.12, GY + 2.6, z + 0.12);
  for (const z of [19.4 + 0.75, 19.4 + TD - 0.75]) for (const [a, c] of [[8 - TL / 2 + 0.8, 7.6], [8.4, 8 + TL / 2 - 0.8]]) blk(a, GY, z - 0.22, c, GY + 0.47, z + 0.22);
  // The playground on sand: slide, jungle gym, swings.
  deco('flat:#d9c7a0', 17, GY + 0.01, 12, 30, GY + 0.025, 25);
  at('slide', 22, 16);
  blk(22 - SL / 2 - 0.1, GY, 15.6, 22 - SL / 2 + 0.9, GY + 2.5, 16.4);
  blk(22 - SL / 2 + 0.9, GY, 15.65, 22 + SL / 2, GY + 1.0, 16.35);
  at('climber', 26.5, 21.5);
  blk(26.5 - CW / 2, GY, 21.5 - CW / 2, 26.5 + CW / 2, GY + CH, 21.5 + CW / 2);
  b.model('places', 'swing', f * 20, GY, 22.5);
  blk(18.2, GY, 22.2, 21.8, GY + 2.3, 22.8);
  // Trees round the edges and by the pond, lamps on the paths, benches, the name stone at the gate.
  const trees: [number, number, 'cherry' | 'zelkova' | 'momiji' | 'camphor'][] = [
    [-29, 4, 'cherry'], [-24, 3.5, 'zelkova'], [-12, 4, 'cherry'], [-7, 5, 'momiji'], [8, 4, 'cherry'], [14, 5, 'zelkova'], [24, 4, 'cherry'], [29, 6, 'momiji'],
    [-29, 23, 'camphor'], [-10, 23.5, 'momiji'], [0, 23, 'zelkova'], [-24, 14, 'momiji'], [-9, 14, 'cherry'],
    [-56, 5, 'cherry'], [-42, 4, 'zelkova'], [-34, 6, 'cherry'], [34, 5, 'zelkova'], [42, 4, 'cherry'], [56, 6, 'momiji'],
    [-55, 18, 'camphor'], [-46, 22, 'zelkova'], [-33, 16, 'momiji'], [44, 17, 'camphor'], [52, 22, 'zelkova'], [30, 22, 'cherry'],
  ];
  trees.forEach(([x, z, k], n) => modelTree(b, k, f * x, z, n % 2 ? 'a' : 'b', GY, true));
  for (const [x, z] of [[-52, 10], [-40, 10], [-26, 10], [-12, 10], [4, 10], [18, 10], [32, 10], [44, 10], [54, 10], [-3, 4], [15, 18]] as [number, number][]) streetLamp(b, 'lamp_park', f * x, z, [0, -1]);
  for (const [x, z] of [[-44, 8.4], [-18, 8.4], [-8, 8.4], [10, 8.4], [22, 8.4], [41, 8.4], [54, 8.4]] as [number, number][]) {
    roadModel(b, 'bench_s', f * x, GY, z, [0, 1]);
    blk(x - 0.95, GY, z - 0.35, x + 0.95, GY + 0.5, z + 0.35);
  }
  b.model('places', 'namestone', f * 4, GY, 2.2);
  blk(3, GY, 1.8, 5, GY + 1.0, 2.6);
  b.sign({ k: 'label', text: o.ja, sub: o.en, fg: '#f4f1e8', bg: '#3f6b3a' }, f * 4, GY + 0.65, 1.78, [0, -1], 1.8, 0.5);
  // A hedge closes the back and the sides of the park.
  for (const [x0, z0, x1, z1] of [[-X, D - 0.6, X, D], [-X, 0.2, -X + 0.6, D], [X - 0.6, 0.2, X, D]]) {
    deco('flat:#3f6b3a', x0, GY, z0, x1, GY + 1.2, z1);
    blk(x0, GY, z0, x1, GY + 1.2, z1);
  }
  b.zone('street', -X, GY - 0.2, 0, X, GY + 8, D, o.ja, o.en, true);
}

// ── The station plaza ────────────────────────────────────────────────────────────────────────

function plaza(b: Builder, f: number, blk: Blk, at: At, pav: number) {
  const X = 17.5, ZL = 19.5, PZ = 9.5;
  const deco = (mat: string, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => b.deco(mat, Math.min(f * x0, f * x1), y0, z0, Math.max(f * x0, f * x1), y1, z1);
  // The loop road and its two mouths over the pavement to the main road; kerb lines; arrows.
  deco('asphalt', -X, GY, 0, X, GY + 0.01, ZL);
  for (const x0 of [-X, X - 5]) deco('asphalt', x0, GY - 0.13, -pav + 0.02, x0 + 5, GY + 0.01, 0);
  for (const [x0, z0, x1, z1] of [[-X + 0.3, 0.6, X - 0.3, 0.75], [-X + 0.3, ZL - 0.75, X - 0.3, ZL - 0.6], [-X + 0.3, 0.6, -X + 0.45, ZL - 0.6], [X - 0.45, 0.6, X - 0.3, ZL - 0.6]]) {
    deco('flat:#e9e9e4', x0, GY + 0.01, z0, x1, GY + 0.016, z1);
  }
  for (let x = -12; x <= 12; x += 6) deco('flat:#e9e9e4', x - 1.2, GY + 0.01, 3.4, x + 1.2, GY + 0.016, 3.55);
  // The island with its clock post: the game's clock, on both faces of the drum.
  at('island', 0, PZ);
  blk(-IW / 2, GY, PZ - ID / 2, IW / 2, GY + 0.9, PZ + ID / 2);
  for (const s of [-1, 1] as const) b.sign({ k: 'clock' }, 0, GY + 3.9, PZ + s * 0.16, [0, s], 0.9, 0.9);
  modelTree(b, 'zelkova', f * -5, PZ, 'a', GY + 0.18, true);
  modelTree(b, 'zelkova', f * 5, PZ, 'b', GY + 0.18, true);
  b.sign({ k: 'label', text: '緑坂駅前広場', sub: 'Midorizaka Station Plaza', fg: '#fff', bg: '#3f6b3a' }, 0, GY + 0.6, PZ - ID / 2 - 0.01, [0, -1], 3.0, 0.4);
  // Bus stops on a raised platform along the back, buses standing at them.
  deco('flat:#c9c4b6', -X, GY, ZL, X, GY + 0.15, ZL + 3.2);
  const stops: [number, string, string][] = [[-8, '北丘団地・緑坂循環', 'North Hills Estate / Midorizaka loop'], [8, '川湊駅・北大通', 'Kawaminato Sta. / Kita-Ōdōri']];
  stops.forEach(([x, ja, en], k) => {
    roadModel(b, 'shelter', f * x, GY + 0.15, ZL + 2.2, [0, -1]);
    blk(x - 2.5, GY + 0.15, ZL + 2.6, x + 2.5, GY + 2.4, ZL + 3.0);
    b.sign({ k: 'label', text: `バスのりば ${k + 1}　${ja}`, sub: `Bus stop ${k + 1} — ${en}`, fg: '#fff', bg: '#2f5a3c' }, f * x, GY + 2.6, ZL + 2.55, [0, -1], 5.0, 0.42);
    roadModel(b, k ? 'bus' : 'bus_c', f * (x + 1), GY, ZL - 2.2, [-f, 0]);
    blk(x - 4.5, GY, ZL - 3.5, x + 6.5, GY + 3.0, ZL - 0.9);
  });
  // The taxi stand on the front side: a sign post, taxis waiting.
  for (let k = 0; k < 3; k++) {
    const x = 9 - k * 5.4;
    roadModel(b, 'taxi', f * x, GY, 2.3, [f, 0]);
    blk(x - 2.3, GY, 1.4, x + 2.3, GY + 1.5, 3.2);
  }
  roadModel(b, 'signpole', f * 10, GY, -0.45, [0, -1]);
  b.sign({ k: 'label', text: 'タクシーのりば', sub: 'Taxi', fg: '#111', bg: '#ffd100' }, f * 10, GY + 2.3, -0.52, [0, -1], 1.4, 0.42);
  for (const [x, z] of [[-X + 0.4, ZL + 1.6], [X - 0.4, ZL + 1.6], [0, ZL + 1.6]] as [number, number][]) streetLamp(b, 'lamp_twin', f * x, z, [0, -1]);
  b.zone('street', -X, GY - 0.2, 0, X, GY + 6, ZL + 3.2, '緑坂駅前広場', 'Midorizaka Station Plaza', true);
}

// ── Midorizaka Ginza ─────────────────────────────────────────────────────────────────────────

function ginza(b: Builder, f: number, blk: Blk, at: At) {
  const n = 4;
  for (let k = 0; k < n; k++) {
    const xc = -((n - 1) * GW) / 2 + k * GW, v = k % 2 ? 'b' : 'a';
    at(`ginza_${v}`, xc, 0);
    blk(xc - GW / 2, GY, 0.6, xc + GW / 2, GY + 7.7, GD);
    for (const xp of [xc - GW / 2, xc, xc + GW / 2 - 0.18]) blk(xp, GY, -0.04, xp + 0.18, GY + 2.75, 0.6);
    // The goods stand in front of an open front.
    for (const j of [0, 1]) {
      const open = (v === 'a') === (j === 1);
      const x0 = xc - GW / 2 + j * (GW / 2) + 0.28, x1 = x0 + GW / 2 - 0.56;
      if (open) blk(x0, GY, -0.72, x1, GY + 0.8, 0.6);
      else blk(x0, GY, 0.45, x1, GY + 2.7, 0.6);
      const s = GINZA_SHOPS[(k * 2 + j) % GINZA_SHOPS.length];
      b.sign({ k: 'shop', ja: s.ja, en: s.en, bg: s.bg, fg: '#fff' }, f * (x0 + x1) / 2, GY + 3.02, -0.125, [0, -1], 3.4, 0.45);
    }
  }
  // Suzuran lamps along the kerb and the street's name on a banner pole at each end.
  for (let x = -14; x <= 14; x += 7) streetLamp(b, 'lamp_suzuran', f * x, -1.8, [0, -1]);
  for (const x of [-15.8, 15.8]) {
    b.deco('flat:#2b2d30', f * x - 0.05, GY, -1.85, f * x + 0.05, GY + 4.2, -1.75);
    b.sign({ k: 'shop', ja: '緑坂銀座', bg: '#3f6b3a', fg: '#fff', vertical: true }, f * x + 0.06, GY + 3.2, -1.8, [1, 0], 0.5, 1.8);
    b.sign({ k: 'shop', ja: '緑坂銀座', bg: '#3f6b3a', fg: '#fff', vertical: true }, f * x - 0.06, GY + 3.2, -1.8, [-1, 0], 0.5, 1.8);
    blk(x - 0.1, GY, -1.9, x + 0.1, GY + 4.2, -1.7);
  }
}
