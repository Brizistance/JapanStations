// Hyōtanbori's street (瓢箪堀, Minami): the vermilion Hyōtan-bashi over the gourd canal with a
// gate at each corner, the canal walks, the tour-boat pier, and the station's own pieces: Hyōtan
// Kaikan with the giant gourd on its roof (the landmark), Hyōtan Yokochō, a takoyaki stand and
// Izakaya Hyōtan, which you can walk into.
//
// The models are tools/blender/build_hyotan.py (public/models/buildings/hyotan.glb); its HALF, ZA,
// KERB, KW/KD/KH, YW/YD/LW, IW/ID and DOOR are mirrored here. This file adds the colliders, zones,
// glowing parts (lanterns, the gourd) and every name. Names are invented (docs/worldbuilding.md).
import type { Builder } from '../world/builder';
import { GROUND_Y } from './kit';
import { lantern, noren } from './looks/parts';
import { PIECES, type PieceId } from './pieces';
import { modelTree } from './trees';

const GY = GROUND_Y;
const HALF = 7, ZA = 19, KERB = 9.9;
const KH = 22;
const DOOR: [number, number] = [-1.0, 0.8];
const RED = '#d8352a', AMBER = '#f2a63a', PAPER = '#f2c88a';

const put = (b: Builder, id: string, x: number, y: number, z: number) => b.model('hyotan', id, x, y, z);
const hang = (b: Builder, x: number, y: number, z: number, color = RED, top?: number, d = 0.4, h = 0.6) => lantern({ b }, x, y, z, { color, top, d, h });

export interface PieceOpts {
  id: PieceId;
  ja: string;
  en: string;
}

/**
 * One piece on its lot, in a frame with the middle of the lot's front at the origin and the lot
 * running back along +z (the pavement at z < 0), as places.ts.
 */
export function piece(b: Builder, o: PieceOpts) {
  const { w, d } = PIECES[o.id], X = w / 2;
  if (o.id === 'kaikan') {
    put(b, 'kaikan', 0, GY, 0);
    b.block(-X, GY, 0.3, X, GY + KH + 1, d);
    // The glazed bay on the canal corner and the vertical name board stand proud of the front.
    b.block(X - 3.4, GY + 4.4, -0.6, X + 0.3, GY + KH + 3, 0.3);
    b.sign({ k: 'shop', ja: o.ja, bg: '#1a1716', fg: '#ffcf4a', vertical: true }, -X + 0.675, GY + 13, -1.112, [0, -1], 0.8, 14.8);
    b.sign({ k: 'shop', ja: o.ja, en: o.en, bg: '#1a1716', fg: '#ffcf4a' }, -X + 3.5, GY + 4.7, -1.62, [0, -1], 5.5, 0.55);
    // The gourd: gilded and lit, a red sash at its waist, a stem and a leaf; on the roof stand, at z = 8.
    // Raised 3 m above the stand on a steel pedestal, so it clears the parapet seen from the pavement.
    const zc = 8, stand = GY + KH + 3.82, top = stand + 3, k = 1.35;
    b.mesh('flat:#3d4146', 'cyl', 0, (stand + top + 0.6) / 2, zc, 0.8, top + 0.6 - stand, 0.8);
    b.mesh('flat:#3d4146', 'cyl', 0, stand + 0.15, zc, 2.4, 0.3, 2.4);
    b.mesh('glow:#e9a92e', 'sphere', 0, top + 3.0 * k, zc, 6.2 * k, 6.0 * k, 6.2 * k);
    b.mesh('glow:#d2281e', 'cyl', 0, top + 6.2 * k, zc, 2.9 * k, 0.9 * k, 2.9 * k);
    b.mesh('glow:#e9a92e', 'sphere', 0, top + 8.3 * k, zc, 4.4 * k, 4.4 * k, 4.4 * k);
    b.mesh('flat:#5a3a1a', 'cyl', 0, top + 10.9 * k, zc, 0.6 * k, 1.4 * k, 0.6 * k);
    b.mesh('flat:#3f6a2a', 'sphere', 0.9 * k, top + 11.0 * k, zc, 1.6 * k, 0.25 * k, 0.9 * k);
    // Neon outlines on the canal side: three bands of red down the corner bay.
    for (const y of [8, 13, 18]) b.deco('glow:#ff3d57', X + 0.32, GY + y, -0.62, X + 0.36, GY + y + 0.12, 0.3);
    return;
  }

  if (o.id === 'yokocho') {
    yokocho(b, o);
    return;
  }

  if (o.id === 'takoyaki') {
    put(b, 'takoyaki', 0, GY, 0);
    b.block(-X, GY, 0, X, GY + 3.6, d);
    b.sign({ k: 'shop', ja: o.ja, en: o.en, bg: '#ef6c00', fg: '#fff' }, 0, GY + 3.5, -0.062, [0, -1], 4.6, 0.75);
    for (const x of [-X - 0.35, X + 0.35]) hang(b, x, GY + 2.0, -0.6, RED, GY + 2.9, 0.42, 0.62);
    return;
  }

  // Izakaya Hyōtan: the shell's colliders, a floor and a ceiling, the fittings, lanterns inside.
  put(b, 'izakaya', 0, GY, 0);
  put(b, 'izakaya_in', 0, GY, 0);
  const GF = 3.2;
  for (const s of [-1, 1]) b.block(Math.min(s * X, s * (X + 0.2)), GY, 0, Math.max(s * X, s * (X + 0.2)), GY + 6.4, d + 0.2);
  b.block(-X, GY, d, X, GY + 6.4, d + 0.2);
  b.block(-X, GY, -0.1, DOOR[0], GY + GF, 0.15);
  b.block(DOOR[1], GY, -0.1, X, GY + GF, 0.15);
  b.block(DOOR[0], GY + 2.3, -0.1, DOOR[1], GY + GF, 0.15);
  b.box('wood:#6b4a2e', -X, GY - 0.1, 0.15, X, GY + 0.02, d);
  b.box('wood:#3b2a1e', -X, GY + GF, 0, X, GY + GF + 0.2, d);
  // Fittings (izakaya_in): counter, stools, worktops, the tatami room and its tables.
  b.block(-X + 1.5, GY, 1.5, -X + 2.3, GY + 1.08, 7.7);
  b.block(-X + 1.5, GY, 7.0, -X + 4.3, GY + 1.08, 7.7);
  b.block(-X + 0.2, GY, 1.2, -X + 0.9, GY + 0.9, 8.6);
  b.block(-X + 0.2, GY, 8.6, -X + 4.4, GY + 0.9, d);
  for (const z of [2.2, 3.2, 4.2, 5.2, 6.2]) b.block(-X + 2.55, GY, z - 0.2, -X + 2.95, GY + 0.7, z + 0.2);
  for (const x of [-X + 2.8, -X + 3.7]) b.block(x - 0.2, GY, 8.0, x + 0.2, GY + 0.7, 8.4);
  b.block(X - 3.4, GY, 2.0, X - 0.2, GY + 0.44, d);
  for (const zc of [4.0, 7.6]) b.block(X - 2.45, GY + 0.44, zc - 0.75, X - 1.15, GY + 0.82, zc + 0.75);
  for (const z of [2.5, 5.0, 7.5]) hang(b, 0, GY + 2.5, z, PAPER, GY + GF, 0.36, 0.48);
  hang(b, X - 1.8, GY + 2.55, 5.8, RED, GY + GF, 0.32, 0.42);
  // Menu slips over the counter (blank strips on izakaya_in).
  const MENU = ['焼鳥', 'おでん', '枝豆', '冷奴', '唐揚', '刺身', '熱燗', '生ビール', 'ハイボール', '焼酎', '梅酒', '茶漬', '漬物', '肉じゃが', '出汁巻', '塩辛'];
  MENU.forEach((m, k) => b.sign({ k: 'shop', ja: m, bg: '#f4efe2', fg: '#1a1716', vertical: true }, -X + 2.252, GY + 2.475, 1.82 + k * 0.32, [1, 0], 0.22, 0.5));
  // Outside: the name board, a navy noren, a red lantern by the door.
  b.sign({ k: 'shop', ja: o.ja, en: o.en, bg: '#2b1a12', fg: '#ffcf4a' }, 0, GY + 4.1, -0.162, [0, -1], 6.0, 0.6);
  noren({ b }, 'x', -0.19, DOOR[0], DOOR[1], GY + 2.24, { color: '#1f2a44', text: 'ひょうたん', face: -1 });
  hang(b, DOOR[1] + 0.55, GY + 1.75, -0.4, RED, GY + 3.2, 0.45, 0.7);
  b.zone('passage', -X, GY - 0.2, 0, X, GY + GF, d, o.ja, `${o.en} (izakaya)`, true);
}

/**
 * The gourd canal under Hyōtan-bashi at x = cx: stone-faced banks with a walk 4 m wide on each
 * side at street level, red railings, lantern strings, willows, the vermilion bridge and its gates,
 * a tour-boat pier on the +z side reached by a stair, and two boats.
 */
export function grandCanal(b: Builder, cx: number, swOut: number, Z: number, name: { ja: string; en: string }) {
  const za0 = swOut + 1.5;
  if (Math.abs(za0 - ZA) > 0.01) throw new Error('grandCanal: the bridge model is built for parapets at z = ±19 (build_hyotan.py ZA)');
  // From the bridge outwards along the west bank on the +z side: a landing off the walk, the stair
  // down the bank face, then the pontoon.
  const STAIR = { x0: cx - HALF, x1: cx - HALF + 1.4, land: za0 + 0.6, run: 6 };
  const PIER = { x: cx - HALF, z0: STAIR.land + 1.6 + STAIR.run, L: 14, y: -2.7 };
  for (const s of [-1, 1]) {
    const za = s * za0, zb = s * Z;
    const lo = Math.min(za, zb), hi = Math.max(za, zb);
    b.box('water', cx - HALF, -3.4, lo, cx + HALF, -2.8, hi, false);
    for (const ex of [cx - HALF, cx + HALF]) {
      const o = ex < cx ? -1 : 1;
      // Dark granite banks in courses, a pale coping, and the walk's kerb.
      for (let k = 0; k < 6; k++) b.deco(k % 2 ? 'flat:#5f5a52' : 'flat:#6a655c', Math.min(ex, ex + o * 0.4), -3.4 + k * 0.57, lo, Math.max(ex, ex + o * 0.4), -3.4 + (k + 1) * 0.57 + 0.01, hi);
      b.deco('flat:#b8b2a4', Math.min(ex - o * 0.08, ex + o * 0.5), GY, lo, Math.max(ex - o * 0.08, ex + o * 0.5), GY + 0.12, hi);
      // A vermilion railing, open at the pier stair.
      const rx = ex + o * 0.2;
      const gaps: [number, number][] = s > 0 && o < 0 ? [[STAIR.land - 0.05, STAIR.land + 1.65]] : [];
      let from = lo;
      for (const [g0, g1] of [...gaps, [hi, hi] as [number, number]]) {
        if (g0 - from > 0.2) {
          b.block(rx - 0.08, GY, from, rx + 0.08, GY + 1.1, g0);
          b.deco('flat:#c23b22', rx - 0.06, GY + 0.95, from, rx + 0.06, GY + 1.07, g0);
          b.deco('flat:#c23b22', rx - 0.04, GY + 0.5, from, rx + 0.04, GY + 0.56, g0);
          for (let z = from + 0.1; z < g0; z += 1.8) b.deco('flat:#c23b22', rx - 0.07, GY, z - 0.07, rx + 0.07, GY + 1.12, z + 0.07);
        }
        from = g1;
      }
      // Lantern strings on posts along the walk, and willows between them.
      for (let z = lo + 4; z < hi - 3; z += 8) {
        if (gaps.some(([g0, g1]) => z > g0 - 1 && z < g1 + 1)) continue;
        const px = ex + o * 0.55;
        b.box('wood:#2f2219', px - 0.07, GY, z - 0.07, px + 0.07, GY + 3.4, z + 0.07);
        b.deco('flat:#3a2f28', px - 0.015, GY + 3.25, z, px + 0.015, GY + 3.28, Math.min(z + 8, hi));
        for (let k = 1; k < 4; k++) hang(b, px, GY + 2.55, z + k * 2, k % 2 ? RED : AMBER, GY + 3.25, 0.36, 0.5);
      }
      for (let z = lo + 9; z < hi - 4; z += 16) modelTree(b, 'willow', ex + o * 3.3, z, 'a');
    }
  }

  // The canal runs on under the next street: a stone end wall with a dark culvert.
  for (const s of [-1, 1]) {
    const z = s * (Z - 0.3), zo = s * (Z - 0.32);
    b.deco('flat:#5f5a52', cx - HALF - 0.4, -3.4, Math.min(z, s * Z), cx + HALF + 0.4, GY + 0.2, Math.max(z, s * Z));
    b.deco('flat:#b8b2a4', cx - HALF - 0.4, GY + 0.2, Math.min(z, s * Z), cx + HALF + 0.4, GY + 0.35, Math.max(z, s * Z));
    for (let k = 0; k < 9; k++) {
      const xa = cx - 4.5 + k, h = 1.6 * Math.sqrt(Math.max(0, 1 - ((xa + 0.5 - cx) / 4.6) ** 2));
      b.deco('flat:#121110', xa, -2.8, Math.min(zo, zo - s * 0.02), xa + 1, -2.0 + h, Math.max(zo, zo - s * 0.02));
    }
  }

  // ── Hyōtan-bashi ──
  put(b, 'bridge', cx, GY, 0);
  const L = HALF + 0.6;
  for (const s of [-1, 1]) {
    b.block(cx - L, GY, s * ZA - 0.22, cx + L, GY + 1.15, s * ZA + 0.22);
    for (const x of [cx - L, cx + L]) {
      for (const z of [s * KERB, s * (ZA + 0.05)]) b.block(x - 0.38, GY, z - 0.38, x + 0.38, GY + 5.4, z + 0.38);
      // Name plaques on both faces of the gate's middle post, and two lanterns under the tie beam.
      const zm = s * (KERB + ZA) / 2;
      for (const f of [-1, 1]) b.sign({ k: 'label', text: name.ja, sub: name.en, fg: '#ffcf4a', bg: '#1a1716' }, x + f * 0.132, GY + 4.79, zm, [f, 0], 1.8, 0.48);
      for (const f of [0.3, 0.7]) hang(b, x, GY + 2.95, s * (KERB + (ZA - KERB) * f), RED, GY + 3.7, 0.5, 0.75);
    }
  }

  // ── The pier and its stair (+z side, west bank) ──
  b.open(() => {
    put(b, 'pier', PIER.x, PIER.y, PIER.z0);
    b.block(PIER.x, PIER.y - 0.5, PIER.z0, PIER.x + 3.2, PIER.y + 0.05, PIER.z0 + PIER.L);
    b.block(PIER.x + 3.06, PIER.y, PIER.z0, PIER.x + 3.2, PIER.y + 1.1, PIER.z0 + PIER.L);
    b.block(PIER.x + 0.2, PIER.y, PIER.z0 + PIER.L - 2.6, PIER.x + 2.5, PIER.y + 2.4, PIER.z0 + PIER.L - 0.3);
    b.sign({ k: 'label', text: '瓢箪堀 遊覧船のりば', sub: 'Canal cruises', fg: '#fff', bg: '#c23b22' }, PIER.x + 2.212, PIER.y + 2.15, PIER.z0 + PIER.L - 1.45, [1, 0], 1.6, 0.4);
    for (const z of [3.0, 6.5, 10.0]) for (const x of [0.3, 2.8]) b.block(PIER.x + x - 0.06, PIER.y, PIER.z0 + z - 0.06, PIER.x + x + 0.06, PIER.y + 2.6, PIER.z0 + z + 0.06);
    // The stair: down the bank face from the walk to the pontoon's far end, a wall on the water side.
    const { x0, x1, land, run } = STAIR, top = GY, low = PIER.y + 0.05, z0 = land + 1.6;
    b.block(x0, -3.4, land, x1, top, z0);
    b.deco('flat:#8f8a80', x0, top - 0.02, land, x1, top, z0);
    b.ramp(x0, z0, x1, z0 + run, low, top, [0, -1]);
    const n = Math.round((top - low) / 0.18);
    for (let k = 0; k < n; k++) b.deco('flat:#8f8a80', x0, -3.4, z0 + (k * run) / n, x1, top - (k * (top - low)) / n, z0 + ((k + 1) * run) / n);
    b.box('flat:#6a655c', x1, -3.4, land, x1 + 0.2, top + 1.0, z0 + run);
    b.deco('flat:#c23b22', x1, top + 0.95, land, x1 + 0.2, top + 1.07, z0 + run);
    // A boat at the pier, another under way on the far side of the bridge.
    put(b, 'boat', PIER.x + 4.7, -2.85, PIER.z0 + 7);
    b.with({ t: [cx + 1.5, 0, -swOut - 30], rot: 2 }, () => put(b, 'boat', 0, -2.85, 0));
  });
  b.zone('street', PIER.x, PIER.y - 0.2, PIER.z0, PIER.x + 3.2, PIER.y + 3, PIER.z0 + PIER.L, '瓢箪堀 遊覧船のりば', 'Hyōtanbori canal cruise pier', true);
}

// ── Hyōtan Yokochō (build_yokocho.py: LA0…LBE, RX0…RZ1, DOOR and the unit widths are mirrored here) ──

const YK = { LA0: -6.6, LA1: -3.4, LB0: 20, LB1: 23.2, LBE: 6, RX0: -2, RX1: 4, RZ1: 29.4, DOOR: [0, 1] as const, X0: -9, X1: 9, D: 30, GF: 2.6 };
const NOREN_COLS = ['#3a5a9a', '#c2457a', '#f1e7d0', '#4a5ab0', '#c0392b', '#2e6aa8', '#b8873a', '#8a4ac0', '#e8e2d4', '#2a8a7a'];

/** The units of one front, as build_yokocho.py run_fronts() lays them out. */
function units(u0: number, u1: number, widths: number[], k0: number): { u0: number; u1: number; k: number }[] {
  const out: { u0: number; u1: number; k: number }[] = [];
  let u = u0, i = 0;
  while (u1 - u > 1.6) {
    let w = widths[i % widths.length];
    if (u1 - u - w < 1.6) w = u1 - u;
    out.push({ u0: u, u1: u + w, k: k0 + i });
    u += w;
    i++;
  }
  return out;
}

function yokocho(b: Builder, o: PieceOpts) {
  b.model('yokocho', 'a', 0, GY, 0);
  // The model turns (never flips) in a mirrored frame: its x runs the other way.
  const d1 = b.dir([1, 0]), d2 = b.dir([0, 1]);
  const flip = d1[0] * d2[1] - d1[1] * d2[0] < 0;
  const X = (x: number) => (flip ? -x : x);
  const blk = (x0: number, z0: number, x1: number, z1: number, y0: number, y1: number) => b.block(Math.min(X(x0), X(x1)), GY + y0, z0, Math.max(X(x0), X(x1)), GY + y1, z1);
  const { LA0, LA1, LB0, LB1, LBE, RX0, RX1, RZ1, DOOR, X0, X1, D, GF } = YK;
  // Masses, standing 0.3 into the lanes where the fronts' sills, ledges and posts are.
  blk(X0, 0, LA0 + 0.3, D, 0, 8);
  blk(LA1 - 0.3, 0, X1, LB0 + 0.3, 0, 8);
  blk(LBE - 0.3, LB0, X1, LB1, 0, 8);
  blk(LA0, LB1 - 0.3, RX0, D, 0, 8);
  blk(RX1, LB1 - 0.3, X1, D, 0, 8);
  blk(RX0, RZ1, RX1, D, 0, 8);
  // Outside stairs up two of the fronts.
  blk(LA0, 8.5, LA0 + 0.75, 11.4, 0, GF);
  blk(LA1 - 0.75, 3.2, LA1, 5.7, 0, GF);
  // Bar Hisago-ya: its front either side of the door, the lintel, the counter, the stools, the ceiling.
  blk(RX0, LB1 - 0.3, DOOR[0], LB1, 0, 2.7);
  blk(DOOR[1], LB1 - 0.3, RX1, LB1, 0, 2.7);
  blk(DOOR[0], LB1 - 0.3, DOOR[1], LB1, 2.2, 2.7);
  blk(RX0 + 0.35, 26.45, RX1 - 0.25, 27.25, 0, 1.06);
  blk(RX0, 28.2, RX1, RZ1, 0, 0.9);
  for (let i = 0; i < 7; i++) {
    const x = RX0 + 0.85 + i * 0.75;
    blk(x - 0.2, 25.85, x + 0.2, 26.25, 0, 0.7);
  }
  blk(RX0, LB1, RX1, RZ1, 2.7, 3.0);
  const mid = (RX0 + RX1) / 2;
  b.sign({ k: 'shop', ja: '酒処 ひさご屋', en: 'Bar Hisago-ya', bg: '#2b1a12', fg: '#ffcf4a' }, X(mid), GY + 3.15, LB1 - 0.112, [0, -1], RX1 - RX0 - 1.0, 0.5);
  noren({ b }, 'x', LB1 - 0.15, X(DOOR[0]), X(DOOR[1]), GY + 2.2, { color: '#1f2a44', text: 'ひさご', face: -1 });
  hang(b, X(DOOR[1] + 0.5), GY + 1.8, LB1 - 0.45, RED, GY + 2.7, 0.42, 0.62);
  hang(b, X(0.5), GY + 2.32, 25.3, PAPER, GY + 2.7, 0.3, 0.3);
  hang(b, X(2.6), GY + 2.36, 26.2, RED, GY + 2.7, 0.26, 0.26);
  for (const z of [24.6, 26.0, 28.4]) b.deco('light', Math.min(X(RX0 + 0.5), X(RX1 - 0.5)), GY + 2.67, z - 0.06, Math.max(X(RX0 + 0.5), X(RX1 - 0.5)), GY + 2.69, z + 0.06);
  ['焼鳥', 'おでん', '枝豆', '冷奴', '唐揚', '刺身', '熱燗', '生ビール', '焼酎', '梅酒', 'ハイボール', '漬物'].forEach((m, k) => {
    const x = RX0 + 0.4 + k * 0.45 + 0.125;
    b.sign({ k: 'shop', ja: m, bg: '#f4efe2', fg: '#1a1716', vertical: true }, X(x), GY + 2.275, RZ1 - 0.026, [0, -1], 0.24, 0.53);
  });
  b.zone('passage', Math.min(X(RX0), X(RX1)), GY - 0.2, LB1, Math.max(X(RX0), X(RX1)), GY + 2.7, RZ1, '酒処 ひさご屋', 'Bar Hisago-ya', true);

  // The lane gate at the street, its name, two lanterns.
  for (const x of [LA0 + 0.12, LA1 - 0.12]) b.box('flat:#1a1716', X(x) - 0.12, GY, -0.45, X(x) + 0.12, GY + 4.2, -0.21);
  b.deco('flat:#1a1716', Math.min(X(LA0 - 0.3), X(LA1 + 0.3)), GY + 4.2, -0.5, Math.max(X(LA0 - 0.3), X(LA1 + 0.3)), GY + 4.42, -0.16);
  b.deco('flat:#33373a', Math.min(X(LA0 - 0.6), X(LA1 + 0.6)), GY + 4.42, -0.9, Math.max(X(LA0 - 0.6), X(LA1 + 0.6)), GY + 4.52, 0.2);
  b.deco('flat:#241a13', Math.min(X(LA0 + 0.2), X(LA1 - 0.2)), GY + 3.35, -0.46, Math.max(X(LA0 + 0.2), X(LA1 - 0.2)), GY + 4.2, -0.36);
  b.sign({ k: 'label', text: o.ja, sub: o.en, fg: '#ffcf4a', bg: '#2a1a10' }, X((LA0 + LA1) / 2), GY + 3.78, -0.472, [0, -1], 2.9, 0.75);
  for (const x of [LA0 + 0.55, LA1 - 0.55]) hang(b, X(x), GY + 2.65, -0.33, RED, GY + 3.35, 0.45, 0.65);

  // A lantern by every bar and a noren at its door (the door units), as the model lays them out.
  const fronts: { axis: 'z' | 'x'; at: number; n: 1 | -1; list: { u0: number; u1: number; k: number }[] }[] = [
    { axis: 'z', at: LA0, n: 1, list: units(0.4, LB1, [2.6, 3.1, 2.4, 2.9], 0) },
    { axis: 'z', at: LA1, n: -1, list: units(0.4, LB0, [2.8, 2.5, 3.2, 2.6], 5) },
    { axis: 'x', at: LB0, n: 1, list: units(LA1 + 0.3, LBE, [3.0, 2.6, 3.2], 11) },
    { axis: 'x', at: LB1, n: -1, list: units(LA0, RX0 - 0.2, [2.3, 2.3], 14) },
  ];
  for (const f of fronts) {
    for (const u of f.list) {
      const um = u.u0 + (u.u1 - u.u0) * 0.45;
      const col = NOREN_COLS[u.k % NOREN_COLS.length];
      const fg = ['#f1e7d0', '#e8e2d4'].includes(col) ? '#2b1a12' : '#fff';
      const word = ['焼鳥', 'おでん', '酒', 'スナック', '串', '呑'][u.k % 6];
      if (f.axis === 'z') {
        hang(b, X(f.at + f.n * 0.55), GY + 1.85, u.u1 - 0.35, u.k % 2 ? AMBER : RED, GY + 2.55, 0.36, 0.52);
        if (u.k % 3 !== 1) noren({ b }, 'z', X(f.at + f.n * 0.2), u.u0 + 0.2, um - 0.05, GY + 2.18, { color: col, fg, text: word, face: (flip ? -f.n : f.n) as 1 | -1, h: 0.5 });
      } else {
        hang(b, X(u.u1 - 0.35), GY + 1.85, f.at + f.n * 0.55, u.k % 2 ? AMBER : RED, GY + 2.55, 0.36, 0.52);
        if (u.k % 3 !== 1) noren({ b }, 'x', f.at + f.n * 0.2, X(u.u0 + 0.2), X(um - 0.05), GY + 2.18, { color: col, fg, text: word, face: f.n, h: 0.5 });
      }
    }
  }
  // Lantern strings across both legs of the lane.
  const string = (ax: 'x' | 'z', at: number, a: number, c: number) => {
    for (let u = a + 0.35; u < c - 0.2; u += 0.55) {
      const [x, z] = ax === 'x' ? [X(u), at] : [X(at), u];
      const m = (Math.round(u * 10) & 1) ? `glow:${RED}` : `glow:${PAPER}`;
      b.mesh(m, 'cyl', x, GY + 3.56, z, 0.28, 0.34, 0.28);
      b.mesh('flat:#1b1b1b', 'cyl', x, GY + 3.37, z, 0.18, 0.05, 0.18);
      b.mesh('flat:#1b1b1b', 'cyl', x, GY + 3.75, z, 0.18, 0.05, 0.18);
      b.deco('flat:#2a2622', x - 0.012, GY + 3.77, z - 0.012, x + 0.012, GY + 3.9, z + 0.012);
    }
    if (ax === 'x') b.deco('flat:#1b1b1b', Math.min(X(a), X(c)), GY + 3.89, at - 0.02, Math.max(X(a), X(c)), GY + 3.93, at + 0.02);
    else b.deco('flat:#1b1b1b', X(at) - 0.02, GY + 3.89, a, X(at) + 0.02, GY + 3.93, c);
  };
  for (const z of [4.5, 10.5, 16.5]) string('x', z, LA0, LA1);
  for (const x of [-1.2, 3.2]) string('z', x, LB0, LB1);
  b.zone('street', Math.min(X(LA0), X(LA1)), GY - 0.2, 0, Math.max(X(LA0), X(LA1)), GY + 4, LB1, o.ja, o.en, true);
  b.zone('street', Math.min(X(LA1), X(LBE)), GY - 0.2, LB0, Math.max(X(LA1), X(LBE)), GY + 4, LB1, o.ja, `${o.en} (the bend)`, true);
}
