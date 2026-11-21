// Station look: Tsurumatsu (Y-15), 1933, the line's south terminus until 1961, under the
// Tsurumatsu Shōtengai.
//
// The arcade carries on underground: a Shōwa shopping street in miniature inside the 1933 box. Its
// steel shows: riveted I-beam columns on green-tiled plinths, riveted cross beams under a low
// ceiling, longitudinal girders over the column lines. Green glazed tile dado under cream walls,
// a warm terrazzo floor, vermilion trim. Just inside the gates an arcade arch carries the
// shōtengai's name; beyond it both walls are lined with awning-fronted stalls (greengrocer,
// fishmonger, croquettes, tea, tofu, old sweets, a shoe-repair booth) with price cards on their
// goods, a shuttered shop or two, crates and boxes, and Kissa Mimosa, a Shōwa coffee shop you can
// walk into where the ground behind the wall is free (red vinyl booths, a siphon counter, a case
// of plastic food samples). Overhead: opal globe lamps, strings of pennants and paper blossoms,
// and the old station's pipes. On the platform the columns are riveted steel too, the track walls
// carry crane and pine mosaics, and a plaque and a preserved buffer stop mark the old terminus.
// Each exit has its own street entrance: an arcade roof (1), a bathhouse gable with a noren (2).

import {
  band, bench, cut, endDado, exitDado, faceDado, fbox, fnormal, fpt, noren, pipeRun, shopFront, stairwellFaces, wallDado, wbox,
  type Brand, type DadoOpts, type Span, type Wall,
} from './parts';
import { groundFree, shell, type FrontFace } from '../shopfronts';
import type { HallInfo } from '../themes/types';
import type { ConcInfo, ExitInfo, Rect, Stairwell, StationLook } from './types';

// ── Palette ──────────────────────────────────────────────────────────────────────────────────

const GREEN = 'tile:#5f8f7b';
const GREEN_DK = 'tile:#3f6b58';
const CREAM = 'tile:#efe7d2';
const VERM = 'paint:#b9482b';
const WHITE = 'flat:#f4f1e6';
const DARK = 'flat:#2b2d30';
const WOOD = 'wood:#7a5a3a';
const CARD = 'flat:#b08a5a';
const GLOBE = 'glow:#fff1d0';
const BULB = 'glow:#ffd98a';
const PINK = 'flat:#f2a7bf';
const FLAGS = ['flat:#e84a6f', 'flat:#f2c14e', VERM, 'flat:#3c7dc4', 'flat:#6aa84f'];

const DADO: DadoOpts = { mat: GREEN, top: 1.2, cap: GREEN_DK, skirting: 'flat:#3b4a43', frieze: VERM, friezeY: [2.42, 2.5] };

// ── Names (invented; recorded in the report for docs/worldbuilding.md) ──────────────────────

const ARCADE = { ja: '鶴松商店街', en: 'Tsurumatsu Shōtengai' };
const B = {
  yaotatsu: { ja: '青果 八百辰', en: 'Yaotatsu Greengrocer', bg: '#f4efe2', fg: '#2e6b35', kind: 'goods' },
  uokichi: { ja: '鮮魚 魚吉', en: 'Uokichi Fish', bg: '#1f3f66', fg: '#ffffff', kind: 'goods' },
  marutsuru: { ja: 'コロッケ 丸鶴', en: 'Marutsuru Croquettes', bg: '#f2d16b', fg: '#7a2e0e', kind: 'goods' },
  matsubaen: { ja: '茶舗 松葉園', en: 'Matsubaen Tea', bg: '#2f4a2c', fg: '#f4efe2', kind: 'goods' },
  shiragiku: { ja: 'とうふ 白菊屋', en: 'Shiragikuya Tofu', bg: '#f7f5ee', fg: '#1f3f66', kind: 'goods' },
  mameya: { ja: '駄菓子 まめや', en: 'Dagashi Mameya', bg: '#e84a6f', fg: '#ffffff', kind: 'sweets' },
  tsuruya: { ja: '靴・合鍵 つるや', en: 'Tsuruya Shoes & Keys', bg: '#3a3d41', fg: '#f2c14e', kind: 'goods' },
  tsubaki: { ja: '洋品 つばき', en: 'Yōhin Tsubaki', bg: '#f4efe2', fg: '#6a1b3a', kind: 'goods' },
  hoshino: { ja: '時計・眼鏡 ほしの', en: 'Hoshino Watches', bg: '#1b3a5c', fg: '#f4efe2', kind: 'goods' },
} satisfies Record<string, Brand>;

/** Old enamel adverts on the pillars (vertical, Japanese only). */
const ENAMEL = [
  { ja: '湊印醤油', bg: '#1d3f7a', fg: '#ffffff' },
  { ja: '清酒 千鶴松', bg: '#f4efe2', fg: '#7a1f12' },
  { ja: 'みなと石鹸', bg: '#2e6b4f', fg: '#f4efe2' },
  { ja: 'ヒバリ目薬', bg: '#f2c14e', fg: '#1b1b1b' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────────────────────

/** z of a point `d` in from long wall `s`. */
const zAt = (i: ConcInfo, s: Wall, d: number) => s * (i.cw - d);

/** A mesh against long wall `s` at depth d (sizes in wall frame: along x, up, out from the wall). */
function wmesh(i: ConcInfo, s: Wall, mat: string, shape: 'cyl' | 'sphere' | 'cone', x: number, y: number, d: number, sx: number, sy: number, sd: number) {
  i.b.mesh(mat, shape, x, y, zAt(i, s, d), sx, sy, sd);
}

/** The arcade arch's x for each gate line: 5.6 m into the paid side, nudged off any pillar. */
function arches(i: ConcInfo): { x: number; dir: 1 | -1 }[] {
  return i.ends.map((e) => {
    const dir = e.hi ? -1 : 1;
    let x = e.g + dir * 5.6;
    for (let k = 0; k < 6 && i.pillars.some(([px]) => Math.abs(px - x) < 1.1); k++) x += dir * 0.5;
    return { x, dir };
  });
}

/** Unpaid end walls (the murals). */
const muralWalls = (i: ConcInfo) => i.ends.map((e) => (e.hi ? e.g + 16 : e.g - 16));

// ── Stairwells: what the overhead runs and lamps must keep clear of ─────────────────────────

/** Stairwells standing in the hall (their walls run floor to ceiling). */
const hallWells = (i: ConcInfo): Stairwell[] => i.stairwells.filter((w) => w.room < 0);

/** The floor in front of a portal that stays clear: 3 m out, a metre wider each side than the opening. */
function approach(w: Stairwell): Rect {
  const [px, pz] = w.portal.at, [nx, nz] = w.portal.n, hw = w.portal.w / 2 + 1;
  const a = nx ? px : pz, c = a + (nx || nz) * 3;
  return nx ? [Math.min(a, c), pz - hw, Math.max(a, c), pz + hw] : [px - hw, Math.min(a, c), px + hw, Math.max(a, c)];
}

const approaches = (i: ConcInfo): Rect[] => hallWells(i).map(approach);

/** Does the rectangle (grown by m) reach a stairwell footprint or a portal approach? */
const nearWell = (i: ConcInfo, x0: number, z0: number, x1: number, z1: number, m = 0) =>
  [...hallWells(i).map((w) => w.footprint), ...approaches(i)].some((r) => x1 + m > r[0] && x0 - m < r[2] && z1 + m > r[1] && z0 - m < r[3]);

/** z-spans a run along z at x must leave out where it meets a stairwell. */
const wellGapsAt = (i: ConcInfo, x: number): Span[] =>
  hallWells(i).filter((w) => x > w.footprint[0] - 0.1 && x < w.footprint[2] + 0.1).map((w): Span => [w.footprint[1] - 0.03, w.footprint[3] + 0.03]);

// ── Ceiling: globe lamps, pennants, pipes ────────────────────────────────────────────────────

/** x of each row of globe lamps (every 3 m), clear of gate signs, arches and the murals. */
function lampXs(i: ConcInfo): number[] {
  const A = arches(i), M = muralWalls(i), out: number[] = [];
  for (let x = i.x0 + 1.5; x < i.x1 - 0.8; x += 3) {
    if (i.ends.some((e) => Math.abs(x - e.g) < 2.0) || A.some((a) => Math.abs(x - a.x) < 0.7) || M.some((m) => Math.abs(x - m) < 2)) continue;
    out.push(x);
  }
  return out;
}

/** Half-span of the pennant strings: they stop short of the shop fascias and awnings. */
const stringSpan = (i: ConcInfo) => i.cw - 1.6;

function pennants(i: ConcInfo) {
  // Strung along the underside of the cross beams (beamXs), so they never cross the steel: flags
  // under one beam, paper blossoms under the next, short enough to clear the hanging signs.
  const { b, cf } = i, span = stringSpan(i), y = cf + i.clear - 0.31;
  let n = 0;
  for (const x of beamXs(i)) {
    const pieces = cut([-span, span], wellGapsAt(i, x));
    const on = (z: number, h: number) => pieces.some(([p, q]) => z - h > p && z + h < q);
    if (n++ % 2 === 0) {
      let k = 0;
      for (let z = -span + 0.4; z < span - 0.2; z += 0.8) if (on(z, 0.09)) b.deco(FLAGS[k++ % FLAGS.length], x - 0.004, y - 0.1, z - 0.07, x + 0.004, y, z + 0.07);
    } else {
      let k = 0;
      for (let z = -span + 0.35; z < span - 0.2; z += 0.7) if (on(z, 0.1)) b.mesh(k++ % 3 === 2 ? WHITE : PINK, 'sphere', x, y - 0.05, z, 0.08, 0.07, 0.08);
    }
  }
}

/** Old service pipes down both sides of the hall, broken at the gates (office) and the arches. */
function pipes(i: ConcInfo) {
  const top = i.cf + i.clear;
  const gaps: Span[] = [...i.ends.map((e): Span => [e.g - 3.4, e.g + 3.4]), ...arches(i).map((a): Span => [a.x - 0.35, a.x + 0.35])];
  for (const s of [-1, 1] as const) {
    pipeRun(i, 'x', zAt(i, s, 2.0), i.x0, i.x1, top, {
      n: s > 0 ? 2 : 3, drop: 0.04, gaps, rise: [false, false],
      mats: s > 0 ? ['paint:#8c949b', 'paint:#b8b2a3'] : ['paint:#b8b2a3', 'paint:#8c949b', 'paint:#a33b2f'],
    });
  }
}

// ── The 1933 steelwork: I-beam columns, cross beams, girders over the column lines ───────────

const STEEL = 'paint:#4a5c52';
const RIVET = 'paint:#36443d';
/** Half depth of an I-beam column across its flanges, and half the flanges' width. */
const FL = 0.2, FW = 0.24;

/**
 * A riveted I-beam column from y0 to y1 at (x, z). `along`: the axis the flanges span (they stand
 * at ±FL across the other one), with rivet lines up both edges of each flange and stepped haunches
 * under the head.
 */
function iBeamColumn(b: ConcInfo['b'], x: number, z: number, y0: number, y1: number, along: 'x' | 'z') {
  const box = (mat: string, a0: number, a1: number, ya: number, yb: number, c0: number, c1: number) =>
    along === 'x' ? b.deco(mat, x + a0, ya, z + c0, x + a1, yb, z + c1) : b.deco(mat, x + c0, ya, z + a0, x + c1, yb, z + a1);
  for (const s of [-1, 1]) {
    box(STEEL, -FW, FW, y0, y1, Math.min(s * FL, s * (FL - 0.035)), Math.max(s * FL, s * (FL - 0.035)));
    for (const e of [-1, 1]) {
      const a = e * (FW - 0.05);
      box(RIVET, a - 0.012, a + 0.012, y0 + 0.08, y1 - 0.3, Math.min(s * FL, s * (FL + 0.008)), Math.max(s * FL, s * (FL + 0.008)));
      for (let y = y0 + 0.2; y < y1 - 0.35; y += 0.42) box(RIVET, a - 0.024, a + 0.024, y, y + 0.045, Math.min(s * FL, s * (FL + 0.018)), Math.max(s * FL, s * (FL + 0.018)));
    }
    // Haunches: plates stepping out under the head, towards the girder above.
    box(STEEL, -FW - 0.08, FW + 0.08, y1 - 0.3, y1, Math.min(s * (FL - 0.035), s * (FL + 0.02)), Math.max(s * (FL - 0.035), s * (FL + 0.02)));
    box(STEEL, -FW - 0.18, FW + 0.18, y1 - 0.14, y1, Math.min(s * (FL - 0.035), s * (FL + 0.02)), Math.max(s * (FL - 0.035), s * (FL + 0.02)));
  }
  box(STEEL, -0.022, 0.022, y0, y1, -FL + 0.035, FL - 0.035);
  box(RIVET, -FW - 0.02, FW + 0.02, y0, y0 + 0.06, -FL - 0.02, FL + 0.02);
}

/** x of the riveted cross beams: half way between the lamp rows, clear of gate lines, arches and murals. */
function beamXs(i: ConcInfo): number[] {
  const A = arches(i), M = muralWalls(i);
  return lampXs(i).map((x) => x + 1.5).filter((x) =>
    x < i.x1 - 0.6 && !i.ends.some((e) => Math.abs(x - e.g) < 2.6) && !A.some((a) => Math.abs(x - a.x) < 0.7) && !M.some((m) => Math.abs(x - m) < 2)
    && !approaches(i).some((a) => x > a[0] - 0.2 && x < a[2] + 0.2));
}

function steelwork(i: ConcInfo) {
  const { b } = i, top = i.cf + i.clear;
  // Cross beams the width of the hall, stopping at stairwell walls: web, bottom flange, a rivet line.
  for (const x of beamXs(i)) {
    for (const [p, q] of cut([-i.cw, i.cw], wellGapsAt(i, x))) {
      b.deco(STEEL, x - 0.06, top - 0.26, p, x + 0.06, top, q);
      b.deco(STEEL, x - 0.13, top - 0.3, p, x + 0.13, top - 0.26, q);
      b.deco(RIVET, x - 0.02, top - 0.305, p, x + 0.02, top - 0.3, q);
    }
  }
  // Girders over each line of columns, broken at the gate lines, arches and stairwells.
  const A = arches(i);
  for (const z of [...new Set(i.pillars.map(([, pz]) => pz))]) {
    const gaps: Span[] = [
      ...i.ends.map((e): Span => [e.g - 1.6, e.g + 1.6]), ...A.map((a): Span => [a.x - 0.3, a.x + 0.3]),
      ...hallWells(i).filter((w) => z > w.footprint[1] - 0.4 && z < w.footprint[3] + 0.4).map((w): Span => [w.footprint[0] - 0.05, w.footprint[2] + 0.05]),
    ];
    for (const [p, q] of cut([i.x0, i.x1], gaps)) {
      b.deco(STEEL, p, top - 0.18, z - 0.07, q, top, z + 0.07);
      b.deco(STEEL, p, top - 0.21, z - 0.17, q, top - 0.18, z + 0.17);
      for (let x = p + 0.25; x < q - 0.1; x += 0.6) for (const e of [-1, 1]) b.deco(RIVET, x - 0.02, top - 0.215, z + e * 0.13 - 0.02, x + 0.02, top - 0.21, z + e * 0.13 + 0.02);
    }
  }
}

// ── The arcade arch ──────────────────────────────────────────────────────────────────────────

const ARCH_N = 7;
/** Underside height (above cf) of arch segment k: a shallow curve from 2.46 at the walls to 2.62. */
const archUnder = (k: number) => {
  const t = ((k + 0.5) / ARCH_N) * 2 - 1;
  return 2.4 + 0.22 * (1 - t * t);
};

/** Pine (f = face, ±1 along x) on the arch's panel at z. */
function pineEmblem(i: ConcInfo, x: number, f: number, z: number, y: number) {
  const { b } = i;
  b.mesh('flat:#e9d9a8', 'sphere', x + f * 0.165, y, z, 0.03, 0.22, 0.22);
  b.deco('wood:#5a4636', Math.min(x + f * 0.178, x + f * 0.19), y - 0.08, z - 0.012, Math.max(x + f * 0.178, x + f * 0.19), y, z + 0.012);
  for (const [dz, dy, w] of [[-0.04, 0.02, 0.13], [0.045, -0.015, 0.11], [0, 0.065, 0.1]]) {
    b.mesh('flat:#2e6b4f', 'sphere', x + f * 0.185, y + dy, z + dz, 0.02, 0.045, w);
  }
}

/** Crane (tanchō: white body, black neck, red crown) on a medallion. */
function craneEmblem(i: ConcInfo, x: number, f: number, z: number, y: number) {
  const { b } = i;
  b.mesh('flat:#e9d9a8', 'sphere', x + f * 0.165, y, z, 0.03, 0.22, 0.22);
  b.mesh('flat:#f7f5ee', 'sphere', x + f * 0.182, y - 0.02, z - 0.02, 0.02, 0.06, 0.13);
  b.deco('flat:#1b1b1b', Math.min(x + f * 0.178, x + f * 0.19), y, z + 0.03, Math.max(x + f * 0.178, x + f * 0.19), y + 0.07, z + 0.045);
  b.mesh('flat:#c62828', 'sphere', x + f * 0.188, y + 0.075, z + 0.045, 0.02, 0.03, 0.03);
}

function arch(i: ConcInfo, x: number) {
  const { b, cf, cw } = i, top = cf + i.clear, seg = (2 * cw) / ARCH_N;
  // Stepped beam: a vermilion band along the underside, a cream panel above it to the ceiling.
  for (let k = 0; k < ARCH_N; k++) {
    const z0 = -cw + k * seg, z1 = z0 + seg, u = cf + archUnder(k);
    b.deco(VERM, x - 0.18, u, z0, x + 0.18, u + 0.16, z1);
    b.deco('paint:#efe3c4', x - 0.15, u + 0.16, z0, x + 0.15, top, z1);
    // Lamp bulbs along both faces of the band, clear of the name board.
    for (let z = z0 + seg / 6; z < z1; z += seg / 3) {
      if (Math.abs(z) < 1.7) continue;
      for (const f of [-1, 1]) b.mesh(BULB, 'sphere', x + f * 0.2, u + 0.08, z, 0.07, 0.07, 0.07);
    }
  }
  // Name board on both faces, framed in vermilion; pine and crane medallions either side.
  b.deco(VERM, x - 0.2, cf + 2.64, -1.55, x + 0.2, cf + 2.98, 1.55);
  for (const f of [-1, 1] as const) {
    b.sign({ k: 'shop', ja: ARCADE.ja, en: ARCADE.en, bg: '#f4ecd6', fg: '#8a2b18' }, x + f * 0.215, cf + 2.81, 0, [f, 0], 3.0, 0.32);
    pineEmblem(i, x, f, -2.45, cf + 2.88);
    craneEmblem(i, x, f, 2.45, cf + 2.88);
  }
  // Posts against the walls, each with a round lamp on a bracket either side.
  const postTop = cf + archUnder(0);
  for (const s of [-1, 1] as const) {
    const [za, zb] = band(i, s, 0, 0.45);
    if (!i.free(x - 0.25, za, x + 0.25, zb)) continue;
    i.claim(x - 0.25, za, x + 0.25, zb);
    wbox(i, s, VERM, x - 0.25, x + 0.25, cf, postTop, 0, 0.45, true);
    wbox(i, s, 'flat:#3b4a43', x - 0.265, x + 0.265, cf, cf + 0.13, 0, 0.465);
    wbox(i, s, 'paint:#efe3c4', x - 0.262, x + 0.262, cf + 1.2, cf + 1.26, 0, 0.462);
    for (const f of [-1, 1]) {
      const xa = x + f * 0.25, xb = x + f * 0.46;
      wbox(i, s, DARK, Math.min(xa, xb), Math.max(xa, xb), cf + 2.43, cf + 2.46, 0.2, 0.24);
      wbox(i, s, DARK, x + f * 0.44 - 0.01, x + f * 0.44 + 0.01, cf + 2.4, cf + 2.43, 0.21, 0.23);
      wmesh(i, s, GLOBE, 'sphere', x + f * 0.44, cf + 2.31, 0.22, 0.18, 0.18, 0.18);
    }
  }
}

// ── Stalls ───────────────────────────────────────────────────────────────────────────────────

/** Striped canvas awning under a fascia at depth d, sloping out and down in two steps. */
function awning(i: ConcInfo, s: Wall, x0: number, x1: number, d: number, color: string) {
  const { cf } = i, col = `flat:${color}`;
  const steps: [number, number, number][] = [[0.012, 0.3, 2.3], [0.3, 0.58, 2.245]];
  const n = Math.max(3, Math.round((x1 - x0) / 0.3)), w = (x1 - x0) / n;
  for (const [da, db, yb] of steps) {
    wbox(i, s, WHITE, x0, x1, cf + yb, cf + yb + 0.035, d + da, d + db);
    for (let k = 0; k < n; k += 2) {
      const p = Math.max(x0 + 0.006, x0 + k * w), q = Math.min(x1 - 0.006, x0 + (k + 1) * w);
      wbox(i, s, col, p, q, cf + yb - 0.005, cf + yb + 0.04, d + da + 0.006, d + db + 0.006);
    }
  }
  // Valance at the front edge.
  wbox(i, s, col, x0, x1, cf + 2.21, cf + 2.28, d + 0.586, d + 0.596);
}

interface StallSpec {
  brand: Brand;
  w: number;
  depth: number;
  front: 'counter' | 'stall';
  awning: string;
  goods: string[];
  body?: string;
  noren?: { color: string; text?: string; fg?: string };
  /** Extra goods, given the stall's inner x-range and depth. */
  extra?: (i: ConcInfo, s: Wall, xa: number, xb: number, d: number) => void;
}

function stall(i: ConcInfo, s: Wall, x0: number, o: StallSpec): boolean {
  const x1 = x0 + o.w;
  if (!shopFront(i, { s, x0, x1, brand: o.brand, depth: o.depth, front: o.front, goods: o.goods, body: o.body, noren: o.noren })) return false;
  awning(i, s, x0, x1, o.depth, o.awning);
  o.extra?.(i, s, x0 + 0.2, x1 - 0.2, o.depth);
  return true;
}

// Counter tops are at cf + 1.0, the ledge running from depth d − 0.55 to d + 0.05.

/** Hand-written price cards stuck into the goods along a counter at y: white, a red price line. */
function priceCards(i: ConcInfo, s: Wall, xa: number, xb: number, y: number, d: number) {
  for (let x = xa + 0.25; x < xb - 0.1; x += 0.62) {
    wbox(i, s, WHITE, x - 0.07, x + 0.07, y, y + 0.1, d, d + 0.008);
    wbox(i, s, 'flat:#c62828', x - 0.05, x + 0.05, y + 0.03, y + 0.05, d + 0.008, d + 0.011);
    wbox(i, s, 'flat:#2b2d30', x - 0.01, x + 0.01, y - 0.12, y, d - 0.004, d + 0.004);
  }
}

const greens = (i: ConcInfo, s: Wall, xa: number, xb: number, d: number) => {
  // Cabbages and mikan heaped on the lower step of the stand.
  const n = Math.floor((xb - xa) / 0.32);
  for (let k = 0; k < n; k++) {
    const mat = k % 3 === 0 ? 'flat:#8bbf7a' : k % 3 === 1 ? 'flat:#f08a24' : 'flat:#d94f3d';
    wmesh(i, s, mat, 'sphere', xa + 0.16 + k * 0.32, i.cf + 0.84, d - 0.17, 0.2, 0.16, 0.2);
  }
  priceCards(i, s, xa, xb, i.cf + 1.0, d + 0.02);
};

const fish = (i: ConcInfo, s: Wall, xa: number, xb: number, d: number) => {
  const { cf } = i;
  // A bed of ice with fish laid on it.
  wbox(i, s, 'flat:#e8f1f4', xa + 0.1, xb - 0.1, cf + 1.0, cf + 1.06, d - 0.48, d - 0.04);
  const n = Math.floor((xb - xa - 0.3) / 0.42);
  for (let k = 0; k < n; k++) {
    const x = xa + 0.25 + k * 0.42;
    wbox(i, s, k % 3 === 1 ? 'flat:#d9614a' : 'metal:#9fb3c2', x, x + 0.34, cf + 1.06, cf + 1.1, d - 0.36 + (k % 2) * 0.12, d - 0.26 + (k % 2) * 0.12);
  }
  priceCards(i, s, xa, xb, cf + 1.14, d - 0.03);
};

const croquettes = (i: ConcInfo, s: Wall, xa: number, xb: number, d: number) => {
  const { cf } = i;
  // A warm glass case of croquettes and fried things on the counter.
  wbox(i, s, 'flat:#3a3d41', xa + 0.15, xb - 0.15, cf + 1.0, cf + 1.04, d - 0.45, d - 0.06);
  for (let k = 0; k < 3; k++) {
    const p = xa + 0.25 + (k * (xb - xa - 0.5)) / 3, q = p + (xb - xa - 0.5) / 3 - 0.06;
    wbox(i, s, k === 1 ? 'flat:#a8662f' : 'flat:#c98a3b', p, q, cf + 1.04, cf + 1.12, d - 0.38, d - 0.14);
  }
  wbox(i, s, 'glass', xa + 0.15, xb - 0.15, cf + 1.04, cf + 1.32, d - 0.08, d - 0.065);
  wbox(i, s, 'flat:#3a3d41', xa + 0.15, xb - 0.15, cf + 1.32, cf + 1.35, d - 0.45, d - 0.06);
  priceCards(i, s, xa + 0.1, xb - 0.1, cf + 1.14, d - 0.06);
};

const tofu = (i: ConcInfo, s: Wall, xa: number, xb: number, d: number) => {
  const { cf } = i;
  // A steel water tank with blocks of tofu in it.
  wbox(i, s, 'metal:#b9bdc2', xa + 0.1, xb - 0.1, cf + 1.0, cf + 1.2, d - 0.48, d - 0.03);
  wbox(i, s, 'flat:#cfe3ea', xa + 0.14, xb - 0.14, cf + 1.2, cf + 1.205, d - 0.44, d - 0.07);
  const n = Math.floor((xb - xa - 0.3) / 0.3);
  for (let k = 0; k < n; k++) {
    const x = xa + 0.2 + k * 0.3;
    wbox(i, s, 'flat:#f7f5ee', x, x + 0.18, cf + 1.13, cf + 1.24, d - 0.34, d - 0.18);
  }
};

/** Daruma: red body, pale face, at (x, depth dd) on a counter at y. */
function daruma(i: ConcInfo, s: Wall, x: number, y: number, dd: number) {
  wmesh(i, s, 'flat:#c62828', 'sphere', x, y + 0.12, dd, 0.22, 0.24, 0.2);
  wmesh(i, s, 'flat:#f4efe2', 'sphere', x, y + 0.15, dd + 0.085, 0.11, 0.09, 0.04);
}

/** Maneki-neko: white body and head, red collar, one paw raised. */
function luckyCat(i: ConcInfo, s: Wall, x: number, y: number, dd: number) {
  wmesh(i, s, 'flat:#f7f5ee', 'sphere', x, y + 0.1, dd, 0.18, 0.2, 0.16);
  wmesh(i, s, 'flat:#f7f5ee', 'sphere', x, y + 0.26, dd, 0.16, 0.14, 0.14);
  wmesh(i, s, 'flat:#c62828', 'cyl', x, y + 0.19, dd, 0.13, 0.025, 0.12);
  wmesh(i, s, 'flat:#f2c14e', 'sphere', x, y + 0.15, dd + 0.08, 0.05, 0.05, 0.03);
  wmesh(i, s, 'flat:#f7f5ee', 'sphere', x + 0.09, y + 0.27, dd + 0.02, 0.05, 0.08, 0.05);
}

const tea = (i: ConcInfo, s: Wall, xa: number, xb: number, d: number) => {
  const { cf } = i;
  // Tea tins in a row, and a daruma at the end of the counter.
  const mats = ['flat:#2f4a2c', 'flat:#1b1b1b', 'metal:#c9a227'];
  const n = Math.floor((xb - xa - 0.5) / 0.2);
  for (let k = 0; k < n; k++) wmesh(i, s, mats[k % 3], 'cyl', xa + 0.15 + k * 0.2, cf + 1.1, d - 0.28, 0.14, 0.2, 0.14);
  daruma(i, s, xb - 0.2, cf + 1.0, d - 0.25);
};

const dagashi = (i: ConcInfo, s: Wall, xa: number, xb: number, d: number) => {
  const { cf } = i;
  // Trays of little sweets in two stepped rows, and a lucky cat keeping watch.
  const cols = ['flat:#f2d16b', 'flat:#e9b7c4', 'flat:#8bbf7a', 'flat:#3c7dc4', 'flat:#e84a6f'];
  const n = Math.max(1, Math.floor((xb - xa - 0.35) / 0.3));
  for (let k = 0; k < n; k++) {
    const x = xa + 0.1 + k * 0.3;
    wbox(i, s, cols[k % cols.length], x, x + 0.26, cf + 1.0, cf + 1.06, d - 0.2, d - 0.03);
    wbox(i, s, cols[(k + 2) % cols.length], x, x + 0.26, cf + 1.0, cf + 1.16, d - 0.45, d - 0.25);
  }
  luckyCat(i, s, xb - 0.12, cf + 1.0, d - 0.3);
};

const keys = (i: ConcInfo, s: Wall, xa: number, xb: number, d: number) => {
  const { cf } = i;
  // Key blanks on a board above the shelves, and a shoe waiting on the counter.
  wbox(i, s, 'flat:#8a8f94', xa + 0.05, xb - 0.05, cf + 1.98, cf + 2.27, 0.02, 0.035);
  const n = Math.floor((xb - xa - 0.2) / 0.14);
  for (let r = 0; r < 2; r++) {
    for (let k = 0; k < n; k++) {
      const x = xa + 0.12 + k * 0.14;
      wbox(i, s, 'metal:#c9a227', x, x + 0.04, cf + 2.04 + r * 0.13, cf + 2.13 + r * 0.13, 0.035, 0.045);
    }
  }
  wbox(i, s, 'flat:#3a2a20', xa + 0.1, xa + 0.4, cf + 1.0, cf + 1.1, d - 0.3, d - 0.18);
};

// ── The stairwell's outer walls: the arcade's tile, frieze and old enamel adverts ─────────────

/** Green tile dado and vermilion frieze on every outer face of the stairwells, enamel plates on them. */
function dressWells(i: ConcInfo) {
  const { b, cf } = i;
  let k = 1;
  for (const w of hallWells(i)) {
    for (const f of stairwellFaces(i, w)) {
      faceDado(i, f, DADO);
      // Plates in vertical pairs: a white backing board on a thin frame, the enamel sign on it.
      const len = f.u1 - f.u0, n = f.end ? 1 + Math.floor((len - 1.6) / 2.4) : Math.max(1, Math.min(3, Math.floor((len - 1.6) / 2.6) + 1));
      const pitch = f.end ? 2.4 : 2.9, u0 = (f.u0 + f.u1) / 2 - ((n - 1) * pitch) / 2;
      for (let j = 0; j < n; j++) {
        const u = u0 + j * pitch, e = ENAMEL[k++ % ENAMEL.length];
        fbox(b, f, WOOD, u - 0.22, u + 0.22, cf + 1.31, cf + 2.15, 0.008, 0.02);
        fbox(b, f, 'flat:#f4f1e6', u - 0.19, u + 0.19, cf + 1.34, cf + 2.12, 0.02, 0.026);
        const [px, pz] = fpt(f, u, 0.03);
        b.sign({ k: 'shop', ja: e.ja, bg: e.bg, fg: e.fg, vertical: true }, px, cf + 1.73, pz, fnormal(f), 0.34, 0.74);
      }
    }
  }
}

// ── Clutter against the walls ────────────────────────────────────────────────────────────────

/** Stacked wooden and plastic produce crates, 1.0 long. */
function crates(i: ConcInfo, s: Wall, x0: number): boolean {
  const [za, zb] = band(i, s, 0, 0.9);
  if (!i.free(x0, za, x0 + 1.0, zb)) return false;
  i.claim(x0, za, x0 + 1.0, zb);
  const { cf } = i;
  wbox(i, s, 'wood:#9a7650', x0, x0 + 0.48, cf, cf + 0.32, 0.02, 0.6, true);
  wbox(i, s, 'flat:#f2c14e', x0 + 0.52, x0 + 1.0, cf, cf + 0.32, 0.02, 0.6, true);
  wbox(i, s, 'wood:#9a7650', x0 + 0.24, x0 + 0.76, cf + 0.325, cf + 0.64, 0.04, 0.58, true);
  wbox(i, s, 'flat:#f08a24', x0 + 0.28, x0 + 0.72, cf + 0.6, cf + 0.66, 0.08, 0.54);
  return true;
}

/** A stack of cardboard delivery boxes, 1.2 long. */
function boxes(i: ConcInfo, s: Wall, x0: number): boolean {
  const [za, zb] = band(i, s, 0, 0.95);
  if (!i.free(x0, za, x0 + 1.2, zb)) return false;
  i.claim(x0, za, x0 + 1.2, zb);
  const { cf } = i;
  wbox(i, s, CARD, x0, x0 + 0.6, cf, cf + 0.45, 0.02, 0.62, true);
  wbox(i, s, CARD, x0 + 0.64, x0 + 1.2, cf, cf + 0.38, 0.02, 0.5, true);
  wbox(i, s, 'flat:#c9a77a', x0 + 0.06, x0 + 0.52, cf + 0.455, cf + 0.8, 0.06, 0.5, true);
  wbox(i, s, CARD, x0 + 0.12, x0 + 0.46, cf + 0.805, cf + 1.02, 0.1, 0.42, true);
  // Packing tape across the tops.
  wbox(i, s, 'flat:#d9c9a3', x0 + 0.27, x0 + 0.33, cf + 0.45, cf + 0.455, 0.02, 0.62);
  wbox(i, s, 'flat:#d9c9a3', x0 + 0.89, x0 + 0.95, cf + 0.38, cf + 0.385, 0.02, 0.5);
  return true;
}

/** An old public phone: a green phone on a shelf in a tiled niche, 1.0 long. */
function phone(i: ConcInfo, s: Wall, x0: number): boolean {
  const [za, zb] = band(i, s, 0, 1.0);
  if (!i.free(x0, za, x0 + 1.0, zb)) return false;
  i.claim(x0, za, x0 + 1.0, zb);
  const { b, cf } = i, xm = x0 + 0.5;
  const [ba, bb] = band(i, s, 0, 0.4);
  b.block(x0 + 0.08, cf, ba, x0 + 0.92, cf + 0.95, bb);
  wbox(i, s, GREEN_DK, x0, x0 + 1.0, cf + 0.85, cf + 2.05, 0.008, 0.024);
  wbox(i, s, 'paint:#efe3c4', x0 + 0.06, x0 + 0.94, cf + 0.91, cf + 1.99, 0.024, 0.03);
  wbox(i, s, 'wood:#9a7650', x0 + 0.08, x0 + 0.92, cf + 0.9, cf + 0.95, 0.024, 0.4);
  wbox(i, s, 'wood:#9a7650', x0 + 0.42, x0 + 0.58, cf + 0.55, cf + 0.9, 0.03, 0.08);
  wbox(i, s, 'flat:#2f8f5b', xm - 0.14, xm + 0.14, cf + 0.95, cf + 1.27, 0.08, 0.32);
  wbox(i, s, 'flat:#1b1b1b', xm - 0.13, xm + 0.13, cf + 1.27, cf + 1.31, 0.2, 0.28);
  wbox(i, s, 'flat:#1b1b1b', xm - 0.05, xm + 0.05, cf + 1.12, cf + 1.2, 0.32, 0.326);
  b.sign({ k: 'label', text: '公衆電話', sub: 'Public telephone', fg: '#fff', bg: '#2f8f5b' }, xm, cf + 1.8, zAt(i, s, 0.035), [0, -s], 0.8, 0.24);
  return true;
}

/** The arcade's notice board: cork in a timber frame, pinned papers (blank), 1.6 long. */
function noticeBoard(i: ConcInfo, s: Wall, x0: number): boolean {
  const [za, zb] = band(i, s, 0, 0.35);
  if (!i.free(x0, za, x0 + 1.6, zb)) return false;
  const [ca, cb] = band(i, s, 0, 0.05);
  i.claim(x0, ca, x0 + 1.6, cb);
  const { b, cf } = i;
  wbox(i, s, WOOD, x0, x0 + 1.6, cf + 1.0, cf + 1.95, 0.008, 0.04);
  wbox(i, s, 'flat:#c49a64', x0 + 0.06, x0 + 1.54, cf + 1.06, cf + 1.89, 0.04, 0.046);
  const papers: [number, number, number, number, string][] = [
    [0.12, 1.42, 0.5, 1.82, WHITE], [0.58, 1.12, 0.9, 1.56, 'flat:#f6d743'], [0.98, 1.38, 1.46, 1.84, 'flat:#e9b7c4'],
    [0.16, 1.1, 0.48, 1.36, 'flat:#cfe3ea'], [1.0, 1.1, 1.44, 1.32, WHITE],
  ];
  for (const [p, y0, q, y1, mat] of papers) wbox(i, s, mat, x0 + p, x0 + q, cf + y0, cf + y1, 0.046, 0.051);
  b.sign({ k: 'label', text: '商店街からのお知らせ', sub: 'Arcade notices', fg: '#fff', bg: '#2e6b4f' }, x0 + 0.8, cf + 2.12, zAt(i, s, 0.03), [0, -s], 1.6, 0.26);
  return true;
}

/** A shop with its shutter down (the arcade's quieter side), `w` long. */
function shuttered(i: ConcInfo, s: Wall, x0: number, brand: Brand, w = 3.0): boolean {
  const x1 = x0 + w, [za, zb] = band(i, s, 0, 0.9);
  if (!i.free(x0, za, x1, zb)) return false;
  i.claim(x0, za, x1, zb);
  const { b, cf } = i, top = cf + i.clear, fy = cf + 2.35, xa = x0 + 0.12, xb = x1 - 0.12;
  wbox(i, s, 'flat:#ebe8e0', x0, x1, fy, top, 0, 0.3);
  b.sign({ k: 'shop', ja: brand.ja, en: brand.en, bg: brand.bg, fg: brand.fg }, (x0 + x1) / 2, fy + 0.34, zAt(i, s, 0.315), [0, -s], Math.min(6, Math.floor((w - 0.3) * 2) / 2), 0.5);
  wbox(i, s, 'flat:#ebe8e0', x0, xa, cf, fy, 0, 0.3, true);
  wbox(i, s, 'flat:#ebe8e0', xb, x1, cf, fy, 0, 0.3, true);
  // The shutter, its roller box, and the slat lines.
  wbox(i, s, 'metal:#a7acb1', xa, xb, cf, cf + 2.15, 0, 0.24, true);
  wbox(i, s, 'metal:#9aa0a6', xa, xb, cf + 2.15, fy, 0, 0.28);
  for (let y = cf + 0.25; y < cf + 2.1; y += 0.25) wbox(i, s, 'metal:#8c9196', xa, xb, y, y + 0.02, 0.24, 0.247);
  wbox(i, s, 'flat:#3a3d41', xb - 0.5, xb - 0.3, cf + 0.08, cf + 0.12, 0.24, 0.27);
  return true;
}

// ── Kissa Mimosa ─────────────────────────────────────────────────────────────────────────────

const MIMOSA: Brand = { ja: '純喫茶 ミモザ', en: 'Kissa Mimosa', bg: '#4a2a1f', fg: '#f2d16b', kind: 'cafe' };
/** Frontage, depth of the front out from the wall, depth of the room behind the wall. */
const KW = 6.0, KD = 0.5, KROOM = 4.6;
const RED_VINYL = 'flat:#a8231f';
const DARKWOOD = 'wood:#4a2f22';

/** A plastic food sample on a plate at (x, depth d) on a shelf at y. */
function sample(i: ConcInfo, s: Wall, k: number, x: number, y: number, d: number) {
  wmesh(i, s, 'flat:#f7f5ee', 'cyl', x, y + 0.01, d, 0.26, 0.02, 0.2);
  switch (k % 6) {
    case 0: // omurice under a stripe of ketchup
      wmesh(i, s, 'flat:#f2c94c', 'sphere', x, y + 0.05, d, 0.2, 0.08, 0.12);
      wmesh(i, s, 'flat:#c62828', 'sphere', x, y + 0.085, d, 0.12, 0.02, 0.03);
      break;
    case 1: // naporitan
      wmesh(i, s, 'flat:#e2682c', 'sphere', x, y + 0.04, d, 0.2, 0.06, 0.15);
      wmesh(i, s, 'flat:#6aa84f', 'sphere', x + 0.04, y + 0.07, d, 0.04, 0.02, 0.04);
      break;
    case 2: // cream soda: green glass, ice cream, a cherry
      wmesh(i, s, 'glow:#7ed957', 'cyl', x, y + 0.11, d, 0.08, 0.2, 0.08);
      wmesh(i, s, 'flat:#f7f5ee', 'sphere', x, y + 0.23, d, 0.08, 0.06, 0.08);
      wmesh(i, s, 'flat:#c62828', 'sphere', x + 0.02, y + 0.27, d, 0.025, 0.025, 0.025);
      break;
    case 3: // pudding with caramel
      wmesh(i, s, 'flat:#f2d16b', 'cyl', x, y + 0.05, d, 0.11, 0.08, 0.11);
      wmesh(i, s, 'flat:#7a3a12', 'cyl', x, y + 0.095, d, 0.09, 0.015, 0.09);
      break;
    case 4: // hotcakes and butter
      for (let j = 0; j < 3; j++) wmesh(i, s, 'flat:#c98a3b', 'cyl', x, y + 0.03 + j * 0.03, d, 0.17, 0.025, 0.17);
      wmesh(i, s, 'flat:#fff3b0', 'cyl', x, y + 0.115, d, 0.05, 0.015, 0.05);
      break;
    default: // curry rice
      wmesh(i, s, 'flat:#f7f5ee', 'sphere', x - 0.04, y + 0.04, d, 0.11, 0.05, 0.12);
      wmesh(i, s, 'flat:#8a5a1f', 'sphere', x + 0.05, y + 0.035, d, 0.11, 0.04, 0.13);
  }
  // Price card.
  wbox(i, s, WHITE, x - 0.06, x + 0.06, y, y + 0.05, d + 0.12, d + 0.13);
  wbox(i, s, 'flat:#c62828', x - 0.04, x + 0.04, y + 0.02, y + 0.035, d + 0.13, d + 0.132);
}

/**
 * Kissa Mimosa's front, KW long: a dark wood fascia with a mimosa-yellow line, a glass case of
 * plastic food samples, a window with a café curtain, a door near x1 under a deep red awning.
 * Whether the door leads into a room is settled when the build ends (ground behind the wall).
 */
function kissaten(i: ConcInfo, s: Wall, x0: number): boolean {
  const x1 = x0 + KW, [za, zb] = band(i, s, 0, KD + 1.3);
  if (!i.free(x0, za, x1, zb)) return false;
  const [ca, cb] = band(i, s, 0, KD + 0.7);
  i.claim(x0, ca, x1, cb);
  const { b, cf } = i, top = cf + i.clear, fy = cf + 2.35, door = x1 - 0.9;
  const sa = x0 + 0.3, sb = x0 + 2.6;
  // Fascia and sign, pilasters.
  wbox(i, s, DARKWOOD, x0, x1, fy, top, 0, KD + 0.06);
  wbox(i, s, 'flat:#f2d16b', x0, x1, fy, fy + 0.04, KD + 0.06, KD + 0.07);
  b.sign({ k: 'shop', ja: MIMOSA.ja, en: MIMOSA.en, bg: MIMOSA.bg, fg: MIMOSA.fg }, (x0 + x1) / 2, fy + 0.34, zAt(i, s, KD + 0.072), [0, -s], 5.5, 0.5);
  wbox(i, s, DARKWOOD, x0, x0 + 0.2, cf, fy, 0, KD + 0.06, true);
  wbox(i, s, DARKWOOD, x1 - 0.2, x1, cf, fy, 0, KD + 0.06, true);
  wbox(i, s, DARKWOOD, x0 + 0.2, sa, cf, fy, KD - 0.06, KD, true);
  // The sample case: a wooden plinth, two glass shelves of dishes with price cards.
  wbox(i, s, DARKWOOD, sa, sb, cf, cf + 0.75, KD - 0.5, KD, true);
  wbox(i, s, 'flat:#f4efe2', sa, sb, cf + 0.75, cf + 0.77, 0.02, KD - 0.02);
  wbox(i, s, 'glass', sa, sb, cf + 1.2, cf + 1.215, 0.02, KD - 0.02);
  wbox(i, s, 'glow:#fff1d6', sa + 0.05, sb - 0.05, cf + 1.74, cf + 1.76, 0.05, KD - 0.05);
  for (let k = 0; k < 8; k++) {
    const row = k < 4 ? 0 : 1, j = k % 4;
    sample(i, s, k, sa + 0.32 + j * 0.56, cf + (row ? 1.215 : 0.77), 0.2);
  }
  wbox(i, s, 'glass', sa, sb, cf + 0.77, cf + 1.76, KD - 0.02, KD, true);
  wbox(i, s, DARKWOOD, sa, sb, cf + 1.76, cf + 1.84, 0.02, KD);
  wbox(i, s, DARKWOOD, sb, sb + 0.08, cf, fy, KD - 0.06, KD, true);
  // Window with a café curtain on a brass rod.
  wbox(i, s, DARKWOOD, sb + 0.08, door - 0.5, cf, cf + 0.6, KD - 0.06, KD, true);
  wbox(i, s, 'glass', sb + 0.08, door - 0.5, cf + 0.6, fy, KD - 0.03, KD - 0.015, true);
  wbox(i, s, 'metal:#b8902f', sb + 0.08, door - 0.5, cf + 1.52, cf + 1.54, KD - 0.08, KD - 0.06);
  wbox(i, s, 'flat:#f4ecd6', sb + 0.1, door - 0.52, cf + 0.85, cf + 1.52, KD - 0.07, KD - 0.065);
  for (let x = sb + 0.16; x < door - 0.55; x += 0.12) wbox(i, s, 'flat:#d9ccb0', x, x + 0.02, cf + 0.9, cf + 1.52, KD - 0.066, KD - 0.062);
  for (const y of [cf + 0.9, cf + 1.42]) wbox(i, s, 'flat:#c0392b', sb + 0.1, door - 0.52, y, y + 0.05, KD - 0.066, KD - 0.06);
  wbox(i, s, 'glow:#ffd9a0', sb + 0.1, door - 0.52, cf + 1.6, cf + 2.2, KD - 0.1, KD - 0.09);
  // Door posts, transom, the glass leaf beyond the door, the awning over it all.
  for (const x of [door - 0.5, door + 0.45]) wbox(i, s, DARKWOOD, x, x + 0.05, cf, fy, KD - 0.08, KD, true);
  wbox(i, s, DARKWOOD, door - 0.45, door + 0.45, cf + 2.1, fy, KD - 0.08, KD);
  wbox(i, s, 'glass', door + 0.5, x1 - 0.2, cf, fy, KD - 0.03, KD - 0.015, true);
  awning(i, s, x0 + 0.1, x1 - 0.1, KD + 0.07, '#c0392b');
  // A sandwich board by the door: today's set.
  wbox(i, s, 'flat:#2b2d30', door + 0.55, door + 1.05, cf, cf + 0.9, KD + 0.35, KD + 0.4, true);
  b.sign({ k: 'label', text: 'モーニング', sub: 'Morning set', fg: '#f4efe2', bg: '#2b2d30' }, door + 0.8, cf + 0.62, zAt(i, s, KD + 0.405), [0, -s], 0.44, 0.3);
  b.later(() => {
    if (!mimosaRoom(i, s, x0, x1, door)) {
      // No room behind: the door's glass, a curtain drawn behind it and a warm glow.
      wbox(i, s, 'glassTint', door - 0.45, door + 0.45, cf, cf + 2.1, KD - 0.03, KD - 0.015, true);
      wbox(i, s, 'flat:#4a3428', x0 + 0.2, x1 - 0.2, cf, fy, 0, 0.02);
      wbox(i, s, 'glow:#ffd9a0', x0 + 0.4, x1 - 0.4, fy - 0.08, fy - 0.04, 0.04, 0.3);
    }
  });
  return true;
}

/** The room behind Kissa Mimosa's front: booths, the siphon counter, pendants, a menu on the wall. */
function mimosaRoom(i: ConcInfo, s: Wall, x0: number, x1: number, door: number): boolean {
  const { b, cf } = i, R = -KROOM;
  const f: FrontFace = { axis: 'x', at: s * i.cw, n: -s as 1 | -1 };
  if (!groundFree(b, f, x0, x1, cf, KROOM)) return false;
  shell(b, f, x0, x1, cf, 2.35, KROOM, 'flat:#e9dcc0', 'wood:#6b4a2e');
  // Dark wainscot round the room.
  wbox(i, s, DARKWOOD, x0, x1, cf, cf + 0.95, R, R + 0.03);
  for (const [p, q] of [[x0, x0 + 0.03], [x1 - 0.03, x1]] as [number, number][]) wbox(i, s, DARKWOOD, p, q, cf, cf + 0.95, R, 0);
  // Two booths down the left: red vinyl benches back to back, tables between, a planter on the divider.
  const bx0 = x0 + 0.15, bx1 = x0 + 2.4, tx0 = x0 + 0.45, tx1 = x0 + 2.1;
  const bench = (d0: number, d1: number, back: 1 | -1) => {
    wbox(i, s, RED_VINYL, bx0, bx1, cf + 0.2, cf + 0.45, d0, d1, true);
    wbox(i, s, DARKWOOD, bx0, bx1, cf, cf + 0.2, d0 + 0.03, d1 - 0.03, true);
    const [ba, bb] = back > 0 ? [d1 - 0.12, d1] : [d0, d0 + 0.12];
    wbox(i, s, RED_VINYL, bx0, bx1, cf + 0.45, cf + 1.1, ba, bb, true);
    wbox(i, s, DARKWOOD, bx0, bx1, cf + 1.1, cf + 1.16, ba - 0.02, bb + 0.02);
  };
  const table = (d0: number, d1: number) => {
    wbox(i, s, 'flat:#f4efe2', tx0, tx1, cf + 0.7, cf + 0.74, d0, d1);
    wbox(i, s, 'metal:#9da2a8', (tx0 + tx1) / 2 - 0.05, (tx0 + tx1) / 2 + 0.05, cf, cf + 0.7, (d0 + d1) / 2 - 0.05, (d0 + d1) / 2 + 0.05, true);
    wbox(i, s, 'none', tx0, tx1, cf, cf + 0.74, d0, d1, true);
    // Sugar pot, a menu card, a glass ashtray.
    wmesh(i, s, 'flat:#f7f5ee', 'cyl', tx0 + 0.3, cf + 0.8, (d0 + d1) / 2, 0.1, 0.12, 0.1);
    wbox(i, s, 'flat:#7a1f12', tx1 - 0.45, tx1 - 0.2, cf + 0.74, cf + 0.92, (d0 + d1) / 2 - 0.01, (d0 + d1) / 2 + 0.01);
    wmesh(i, s, 'glass', 'cyl', (tx0 + tx1) / 2 + 0.2, cf + 0.76, (d0 + d1) / 2, 0.12, 0.03, 0.12);
  };
  bench(R + 0.05, R + 0.6, -1);
  table(R + 0.8, R + 1.5);
  bench(R + 1.7, R + 2.25, 1);
  wbox(i, s, DARKWOOD, bx0, bx1, cf, cf + 1.32, R + 2.25, R + 2.3, true);
  for (let x = bx0 + 0.2; x < bx1 - 0.1; x += 0.36) wmesh(i, s, 'flat:#3f7a4a', 'sphere', x, cf + 1.42, R + 2.275, 0.2, 0.18, 0.12);
  bench(R + 2.3, R + 2.85, -1);
  table(R + 3.05, R + 3.75);
  bench(R + 3.95, R + 4.5, 1);
  // The siphon counter across the back on the right; the master's side behind it.
  const cx0 = x0 + 2.8, cx1 = x1 - 0.15, c0 = R + 0.8, c1 = R + 1.35;
  wbox(i, s, DARKWOOD, cx0, cx1, cf, cf + 1.0, c0, c1, true);
  wbox(i, s, 'wood:#a8794a', cx0 - 0.05, cx1, cf + 1.0, cf + 1.05, c0 - 0.05, c1 + 0.12);
  wbox(i, s, 'none', cx0, cx1, cf, cf + 1.6, R, c0, true);
  for (let k = 0; k < 3; k++) {
    const x = cx0 + 0.5 + k * 0.55, d = (c0 + c1) / 2;
    wmesh(i, s, 'flat:#2b2d30', 'cyl', x, cf + 1.07, d, 0.16, 0.04, 0.16);
    wmesh(i, s, 'glow:#6fa8ff', 'cyl', x, cf + 1.11, d, 0.04, 0.03, 0.04);
    wmesh(i, s, 'glass', 'sphere', x, cf + 1.24, d, 0.2, 0.2, 0.2);
    wmesh(i, s, 'flat:#3a2010', 'sphere', x, cf + 1.2, d, 0.15, 0.1, 0.15);
    wmesh(i, s, 'glass', 'cyl', x, cf + 1.46, d, 0.12, 0.26, 0.12);
    wmesh(i, s, 'metal:#9da2a8', 'cyl', x + 0.13, cf + 1.3, d, 0.02, 0.5, 0.02);
  }
  // A pink public phone on the counter's end, stools in front of it.
  wbox(i, s, 'flat:#f2a7bf', cx1 - 0.5, cx1 - 0.2, cf + 1.05, cf + 1.27, c0 + 0.05, c1 - 0.05);
  for (let k = 0; k < 4; k++) {
    const x = cx0 + 0.4 + k * 0.62;
    wmesh(i, s, RED_VINYL, 'cyl', x, cf + 0.7, c1 + 0.42, 0.36, 0.08, 0.36);
    wmesh(i, s, 'metal:#9da2a8', 'cyl', x, cf + 0.34, c1 + 0.42, 0.06, 0.66, 0.06);
  }
  // Cups and tins on the back shelf, the clock over it.
  wbox(i, s, 'wood:#a8794a', cx0, cx1, cf + 1.45, cf + 1.48, R, R + 0.25);
  for (let x = cx0 + 0.15; x < cx1 - 0.1; x += 0.2) wmesh(i, s, (Math.round(x * 5) % 3) ? 'flat:#f7f5ee' : 'metal:#c9a227', 'cyl', x, cf + 1.55, R + 0.12, 0.1, 0.12, 0.1);
  b.sign({ k: 'clock' }, (cx0 + cx1) / 2, cf + 1.92, zAt(i, s, R + 0.02), [0, -s], 0.42, 0.42);
  // Amber pendants over the tables and the counter.
  for (const [x, d] of [[(tx0 + tx1) / 2, R + 1.15], [(tx0 + tx1) / 2, R + 3.4], [cx0 + 0.8, c1 + 0.1], [cx1 - 0.9, c1 + 0.1]] as [number, number][]) {
    wmesh(i, s, DARK, 'cyl', x, cf + 2.2, d, 0.02, 0.3, 0.02);
    wmesh(i, s, 'glow:#ffc870', 'sphere', x, cf + 1.98, d, 0.3, 0.2, 0.3);
  }
  // The menu on the right wall: lettered slips with prices.
  const menu: [string, string][] = [['ブレンド', '400'], ['アメリカン', '400'], ['クリームソーダ', '550'], ['ナポリタン', '700'], ['ホットケーキ', '500'], ['プリン', '350']];
  menu.forEach(([m], k) => {
    const d = R + 1.6 + k * 0.42;
    b.sign({ k: 'shop', ja: m, bg: '#f4efe2', fg: '#4a2a1f', vertical: true }, x1 - 0.035, cf + 1.65, zAt(i, s, d), [-1, 0], 0.26, 0.72);
  });
  const [za, zb] = band(i, s, R, 0);
  b.zone('passage', x0, cf - 0.2, za, x1, cf + 2.35, zb, MIMOSA.ja, `${MIMOSA.en} (coffee shop)`);
  void door;
  return true;
}

interface Item {
  w: number;
  at: (s: Wall, x0: number) => boolean;
}

/** Fill the wall's free stretches with items, in order, each at the first place it fits. */
function fill(s: Wall, segs: Span[], items: Item[]) {
  const cur = segs.map(([a]) => a);
  for (const it of items) {
    let done = false;
    for (let k = 0; k < segs.length && !done; k++) {
      for (let x = cur[k]; x + it.w <= segs[k][1] + 1e-6; x += 0.25) {
        if (it.at(s, x)) {
          cur[k] = x + it.w + 0.25;
          done = true;
          break;
        }
      }
    }
  }
}

function wallItems(i: ConcInfo): Record<'pos' | 'neg', Item[]> {
  const S = (o: StallSpec): Item => ({ w: o.w, at: (s, x) => stall(i, s, x, o) });
  const crate: Item = { w: 1.0, at: (s, x) => crates(i, s, x) };
  const box: Item = { w: 1.2, at: (s, x) => boxes(i, s, x) };
  const notice: Item = { w: 1.6, at: (s, x) => noticeBoard(i, s, x) };
  return {
    pos: [
      S({ brand: B.yaotatsu, w: 3.2, depth: 1.1, front: 'stall', awning: '#2e6b35', goods: ['#6aa84f', '#f08a24', '#d94f3d', '#e8d36a', '#3d6b2f'], extra: greens }),
      crate,
      S({ brand: B.matsubaen, w: 2.6, depth: 1.0, front: 'counter', awning: '#2e6b35', goods: ['#2f4a2c', '#c9a46a', '#1b1b1b'], body: WOOD, extra: tea }),
      S({ brand: B.tsuruya, w: 1.6, depth: 1.0, front: 'counter', awning: '#3c7dc4', goods: ['#3a2a20', '#7a5a3a', '#1b1b1b'], extra: keys }),
      S({ brand: B.mameya, w: 2.4, depth: 1.0, front: 'counter', awning: '#e84a6f', goods: ['#f2d16b', '#e9b7c4', '#8bbf7a', '#3c7dc4'], extra: dagashi }),
      { w: 3.0, at: (s, x) => shuttered(i, s, x, B.tsubaki) },
      notice,
      box,
    ],
    neg: [
      S({
        brand: B.marutsuru, w: 2.6, depth: 1.0, front: 'counter', awning: '#b9482b', goods: ['#c98a3b', '#e8e2d0', '#a8662f'],
        noren: { color: '#b9482b', text: 'コロッケ', fg: '#fff' }, extra: croquettes,
      }),
      crate,
      S({ brand: B.shiragiku, w: 2.4, depth: 1.0, front: 'counter', awning: '#3c7dc4', goods: ['#f7f5ee', '#e8e2d0', '#c9a46a'], extra: tofu }),
      { w: 3.0, at: (s, x) => shuttered(i, s, x, B.hoshino) },
      { w: 1.0, at: (s, x) => phone(i, s, x) },
      S({ brand: B.uokichi, w: 3.4, depth: 1.0, front: 'counter', awning: '#3c7dc4', goods: ['#e8f1f4', '#9fb3c2', '#1f3f66'], body: WOOD, extra: fish }),
      box,
      notice,
    ],
  };
}

/** Benches in the pillar lines with a stall's advert on the backrest, one each side. */
function benches(i: ConcInfo) {
  const spots = i.pillars
    .filter(([x, z]) => z !== 0 && x + 4 > i.paid[0] + 3 && x + 4 < i.paid[1] - 2)
    .map(([x, z]): [number, number] => [x + 4, z])
    .filter(([x, z]) => !(z < 0 && Math.abs(x - ((i.paid[0] + i.paid[1]) / 2 + 3)) < 4))
    .sort((p, q) => q[0] - p[0]);
  const ads = [B.matsubaen, B.marutsuru];
  let last = 0, lastX = Infinity, n = 0;
  for (const [x, z] of spots) {
    if (n >= 2 || Math.sign(z) === last || Math.abs(x - lastX) < 6) continue;
    if (!bench(i, x, z, { axis: 'x', len: 1.6, color: '#b9482b' })) continue;
    const s = Math.sign(z), { b, cf } = i, zb = z + s * 0.27;
    b.deco(WOOD, x - 0.8, cf + 0.46, Math.min(zb, zb + s * 0.04), x + 0.8, cf + 0.95, Math.max(zb, zb + s * 0.04));
    for (const k of [-1, 1]) b.deco('metal:#7f858b', x + k * 0.65 - 0.02, cf + 0.4, Math.min(z + s * 0.2, zb), x + k * 0.65 + 0.02, cf + 0.48, Math.max(z + s * 0.2, zb));
    const ad = ads[n % ads.length];
    b.sign({ k: 'shop', ja: ad.ja, en: ad.en, bg: ad.bg, fg: ad.fg }, x, cf + 0.71, zb + s * 0.052, [0, s], 1.4, 0.4);
    last = s;
    lastX = x;
    n++;
  }
}

// ── The look ─────────────────────────────────────────────────────────────────────────────────

export const look: StationLook = {
  finishes: { wall: CREAM, floor: 'floor:#c9b59a', pillar: GREEN, ceil: 'paint:#efe8d6' },
  posters: false,
  skirting: false,

  lights(i) {
    // Opal globes on stems in two rows, clear of the pillars.
    // Beside a stairwell (or in front of its portal) a lamp moves out to the middle of the lane
    // between the stairwell wall and the pillar line, or goes.
    const { b } = i, top = i.cf + i.clear, zr = Math.min(2.8, i.cw * 0.35);
    const lane = hallWells(i).length ? (Math.max(...hallWells(i).map((w) => w.footprint[3])) + Math.min(...i.pillars.map(([, pz]) => Math.abs(pz))) - 0.35) / 2 : zr;
    for (const x of lampXs(i)) {
      for (const s of [-1, 1]) {
        let z = s * zr;
        if (nearWell(i, x - 0.3, z - 0.3, x + 0.3, z + 0.3, 0.3)) z = s * lane;
        if (nearWell(i, x - 0.3, z - 0.3, x + 0.3, z + 0.3, 0.1)) continue;
        if (i.pillars.some(([px, pz]) => Math.abs(px - x) < 0.7 && Math.abs(pz - z) < 0.7)) continue;
        b.deco(DARK, x - 0.012, i.cf + 2.66, z - 0.012, x + 0.012, top, z + 0.012);
        b.mesh('metal:#9da2a8', 'cyl', x, i.cf + 2.665, z, 0.12, 0.03, 0.12);
        b.mesh(GLOBE, 'sphere', x, i.cf + 2.5, z, 0.32, 0.32, 0.32);
      }
    }
  },

  pillar(i, x, z, y0, y1) {
    // A riveted steel I-beam on a green-tiled plinth: flanges facing the walkway (±z), haunches
    // at the head, an old enamel advert bolted to the flange.
    const { b } = i, h = 0.42;
    b.deco(GREEN, x - h, y0, z - h, x + h, y0 + 0.62, z + h);
    b.deco('flat:#3b4a43', x - h - 0.015, y0, z - h - 0.015, x + h + 0.015, y0 + 0.13, z + h + 0.015);
    b.deco(GREEN_DK, x - h - 0.012, y0 + 0.62, z - h - 0.012, x + h + 0.012, y0 + 0.68, z + h + 0.012);
    iBeamColumn(b, x, z, y0 + 0.68, y1, 'x');
    const e = ENAMEL[(((Math.round(x * 0.37) * 7 + (z > 0 ? 3 : 0)) % ENAMEL.length) + ENAMEL.length) % ENAMEL.length];
    if (z === 0) return;
    const n: [number, number] = [0, -Math.sign(z)];
    const f = FL + 0.012;
    b.deco('flat:#f4f1e6', x + n[0] * f - (n[0] ? 0.006 : 0.2), y0 + 1.33, z + n[1] * f - (n[1] ? 0.006 : 0.2),
      x + n[0] * f + (n[0] ? 0.006 : 0.2), y0 + 2.13, z + n[1] * f + (n[1] ? 0.006 : 0.2));
    b.sign({ k: 'shop', ja: e.ja, bg: e.bg, fg: e.fg, vertical: true }, x + n[0] * (f + 0.014), y0 + 1.73, z + n[1] * (f + 0.014), n, 0.34, 0.74);
  },

  concourse(i) {
    // Walls: green tile dado with a dark cap, vermilion frieze; the same across a paid end wall.
    for (const s of [-1, 1] as const) wallDado(i, s, DADO);
    const paidEnds = [...(i.ends.some((e) => !e.hi) ? [] : [i.x0]), ...(i.ends.some((e) => e.hi) ? [] : [i.x1])];
    for (const x of paidEnds) endDado(i, x, DADO);

    // The arch first (it claims its posts), then benches, then the stalls down both walls.
    const A = arches(i);
    for (const a of A) arch(i, a.x);
    dressWells(i);
    benches(i);
    let lo = i.paid[0] + 0.3, hi = i.paid[1] - 0.3;
    for (const a of A) {
      if (a.dir > 0) lo = Math.max(lo, a.x + 0.8);
      else hi = Math.min(hi, a.x - 0.8);
    }
    // Kissa Mimosa first, on the −z wall: the first stretch of KW clear of the arch and doorways.
    for (let x = lo; x + KW <= hi && !kissaten(i, -1, x); x += 0.5);
    const items = wallItems(i);
    for (const s of [1, -1] as const) {
      const gaps = i.pillars.filter(([, pz]) => Math.sign(pz) === s).map(([px]): Span => [px - 1.0, px + 1.0]);
      fill(s, cut([lo, hi], gaps), s > 0 ? items.pos : items.neg);
    }

    steelwork(i);
    pipes(i);
    pennants(i);

    // A pair of old posters on a blank paid end wall.
    for (const x of paidEnds) {
      const n = x <= i.x0 + 0.01 ? 1 : -1;
      for (const z of [-i.cw / 2, i.cw / 2]) {
        const r: [number, number, number, number] = [Math.min(x, x + n * 0.35), z - 0.8, Math.max(x, x + n * 0.35), z + 0.8];
        if (!i.free(...r)) continue;
        i.claim(...r);
        i.b.deco(WOOD, Math.min(x, x + n * 0.022), i.cf + 1.3, z - 0.72, Math.max(x, x + n * 0.022), i.cf + 2.3, z + 0.72);
        i.b.sign({ k: 'poster', v: (Math.round(z) + 9) & 7 }, x + n * 0.03, i.cf + 1.8, z, [n, 0], 0.66, 0.92);
      }
    }
  },

  exit(e) {
    // Exit 2 runs to the bathhouse gable: cream tile over a timber dado. The others keep the arcade's green.
    const bath = (Number(e.num) || 1) % 2 === 0;
    exitDado(e, bath ? { mat: 'tile:#b98f5e', top: 1.0, cap: 'wood:#5a3f2a', steps: Math.max(4, Math.round(e.run / 2)) }
      : { mat: GREEN, top: 1.2, cap: GREEN_DK, steps: Math.max(4, Math.round(e.run / 2)) });
    exitRails(e);
    const { b, cf, ext } = e, L = ext + 4;
    // Vermilion frieze along the corridor and lobby walls, under the low ceilings.
    b.deco(VERM, -4, cf + 2.36, 0, -3.988, cf + 2.42, L);
    b.deco(VERM, -4, cf + 2.36, L - 0.012, 0, cf + 2.42, L);
    if (ext > 0) b.deco(VERM, -0.012, cf + 2.36, 0, 0, cf + 2.42, ext);
    // An opal globe in the lobby.
    b.deco(DARK, -2.11, cf + 2.52, ext + 3.19, -2.09, cf + 2.7, ext + 3.21);
    b.mesh(GLOBE, 'sphere', -2.1, cf + 2.42, ext + 3.2, 0.24, 0.24, 0.24);
  },

  platform: platformLook,

  canopy(e) {
    if ((Number(e.num) || 1) % 2 === 0) return bathCanopy(e);
    // A little arcade roof over the stair: striped in steps, vermilion posts, round lamps.
    const { b, gy, run, ext } = e;
    const zA = ext + 0.6, zB = ext + 4.6, xa = -0.6, xb = run + 0.7;
    const prof = [2.75, 2.92, 3.0, 2.92, 2.75], sw = (zB - zA) / prof.length;
    prof.forEach((h, k) => {
      b.deco(k % 2 ? WHITE : 'flat:#b9482b', xa, gy + h, zA + k * sw, xb, gy + h + 0.06, zA + (k + 1) * sw);
      // Plain gable at the back.
      b.deco(WHITE, xa, gy + 2.6, zA + k * sw, xa + 0.02, gy + h, zA + (k + 1) * sw);
    });
    // Striped front gable down to the valance.
    const n = 10, vw = (zB - zA) / n;
    for (let k = 0; k < n; k++) {
      const z0 = zA + k * vw, h = prof[Math.min(prof.length - 1, Math.floor(((k + 0.5) * vw) / sw))];
      b.deco(k % 2 ? WHITE : 'flat:#b9482b', xb - 0.02, gy + 2.6, z0, xb, gy + h, z0 + vw);
    }
    b.sign({ k: 'shop', ja: ARCADE.ja, en: ARCADE.en, bg: '#f4ecd6', fg: '#8a2b18' }, xb + 0.012, gy + 2.8, ext + 2.6, [1, 0], 1.6, 0.24);
    // Side valances.
    for (const [z, o] of [[zA, -1], [zB, 1]] as const) {
      b.deco(VERM, xa, gy + 2.6, Math.min(z, z + o * 0.012), xb, gy + 2.75, Math.max(z, z + o * 0.012));
      b.deco(WHITE, xa, gy + 2.6, Math.min(z + o * 0.012, z + o * 0.02), xb, gy + 2.635, Math.max(z + o * 0.012, z + o * 0.02));
    }
    // Posts along both sides of the stair, and a vermilion rail on the low walls.
    const np = Math.max(1, Math.ceil(run / 5));
    for (let k = 0; k <= np; k++) {
      const x = (run * k) / np;
      for (const z of [ext + 1.05, ext + 4.15]) b.deco(VERM, x - 0.06, gy, z - 0.06, x + 0.06, gy + 2.75, z + 0.06);
    }
    for (const [z0, z1] of [[ext + 0.88, ext + 1.22], [ext + 3.98, ext + 4.32]]) b.deco(VERM, 0, gy + 1.0, z0, run, gy + 1.05, z1);
    // The board behind the entrance sign, as the kit's canopy has it.
    b.deco('flat:#22262b', run - 0.04, gy + 1.88, ext + 1.1, run + 0.05, gy + 2.52, ext + 4.1);
    // Round lamps hung under the eaves either side of the sign.
    for (const z of [zA + 0.15, zB - 0.15]) {
      b.deco(DARK, run + 0.44, gy + 2.54, z - 0.01, run + 0.46, gy + 2.75, z + 0.01);
      b.mesh(GLOBE, 'sphere', run + 0.45, gy + 2.42, z, 0.28, 0.28, 0.28);
    }
  },
};

// ── Platform: crane and pine mosaics, the old terminus ──────────────────────────────────────

/** Mosaic panels: C × R tesserae of T m. */
const T = 0.1, MC = 30, MR = 15;

/** A tanchō crane in flight on green: white wings and body, black neck and wing tips, a red crown. */
function craneCell(c: number, r: number): string {
  const x = c + 0.5, y = r + 0.5;
  if (c === 0 || r === 0 || c === MC - 1 || r === MR - 1) return '#efe7d2';
  const body = ((x - 14) / 5.5) ** 2 + ((y - 6.5) / 1.6) ** 2 < 1;
  // Wings swept up from the body, their tips black.
  const wing = y > 7 && y < 13.5 && Math.abs(x - (13 - (y - 7) * 0.35)) < 3.2 - (y - 7) * 0.25;
  const tip = wing && y > 11.2;
  // Neck reaching forward and up, the head with its red crown.
  const neck = x > 18 && x < 25 && Math.abs(y - (7 + (x - 18) * 0.55)) < 0.8;
  const head = (x - 25.3) ** 2 + (y - 11) ** 2 < 1.2;
  const legs = x > 4 && x < 9 && Math.abs(y - (6.2 - (9 - x) * 0.25)) < 0.45;
  if (head) return y > 11.4 ? '#c62828' : '#1b1b1b';
  if (neck || tip || legs) return '#1b1b1b';
  if (body || wing) return '#f7f5ee';
  return '#3f6b58';
}

/** A pine on cream: a leaning trunk, three flat tiers of needles, a red sun behind. */
function pineCell(c: number, r: number): string {
  const x = c + 0.5, y = r + 0.5;
  if (c === 0 || r === 0 || c === MC - 1 || r === MR - 1) return '#3f6b58';
  const tiers: [number, number, number, number][] = [[12, 11.5, 7, 1.6], [17, 8.5, 6, 1.5], [10, 6, 5, 1.3]];
  if (tiers.some(([cx, cy, rx, ry]) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1)) return (c + r) % 5 ? '#2e6b4f' : '#3f7a4a';
  if (Math.abs(x - (13 + (y - 1) * 0.35)) < 0.9 && y < 11) return '#5a3f2a';
  if ((x - 23) ** 2 + (y - 11.5) ** 2 < 6.5) return '#c94a2f';
  if (y < 2.5) return '#c9b59a';
  return '#efe7d2';
}

function mosaic(h: HallInfo, x: number, s: 1 | -1, cell: (c: number, r: number) => string) {
  const { b, pf, wallZ } = h, y0 = pf + 1.05, x0 = x - (MC * T) / 2;
  const zf = s * (wallZ - 0.005), zb = s * (wallZ - 0.04);
  // A vermilion frame round the panel.
  b.deco(VERM, x0 - 0.07, y0 - 0.07, Math.min(zf, s * (wallZ - 0.03)), x0 + MC * T + 0.07, y0 + MR * T + 0.07, Math.max(zf, s * (wallZ - 0.03)));
  for (let r = 0; r < MR; r++) {
    let c = 0;
    while (c < MC) {
      const col = cell(c, r);
      let e = c + 1;
      while (e < MC && cell(e, r) === col) e++;
      b.deco(`mosaic:${col}`, x0 + c * T, y0 + r * T, Math.min(zf, zb), x0 + e * T, y0 + (r + 1) * T, Math.max(zf, zb));
      c = e;
    }
  }
}

function platformLook(h: HallInfo) {
  const { b, pf } = h;
  let k = 0;
  for (const s of [-1, 1] as const) {
    for (const x of [-45.5, -32.5, 32.5, 45.5]) {
      if (!h.wallRuns(s).some(([a, c]) => x - 1.8 >= a && x + 1.8 <= c)) continue;
      mosaic(h, x, s, k++ % 2 ? pineCell : craneCell);
    }
  }
  // A preserved buffer stop from the old terminus on the island, on a stone plinth with its label.
  if (h.island && !h.blocked(-56.6, -54.6, 0.5)) {
    const bx = -55.6;
    b.box('flat:#8f877a', bx - 0.9, pf, -0.45, bx + 0.9, pf + 0.25, 0.45, true);
    for (const z of [-0.3, 0.3]) b.deco(DARK, bx - 0.08, pf + 0.25, z - 0.06, bx + 0.08, pf + 0.95, z + 0.06);
    for (let j = 0; j < 6; j++) b.deco(j % 2 ? WHITE : 'paint:#c0392b', bx - 0.12, pf + 0.95, -0.7 + j * (1.4 / 6), bx + 0.12, pf + 1.2, -0.7 + (j + 1) * (1.4 / 6));
    for (const z of [-0.55, 0.55]) b.mesh('metal:#7f858b', 'cyl', bx - 0.2, pf + 1.07, z, 0.22, 0.22, 0.22);
    b.block(bx - 0.9, pf, -0.75, bx + 0.9, pf + 1.25, 0.75);
    // The plaque on a brass stand in front of it.
    b.deco('metal:#8a6a2a', bx + 1.05, pf, -0.04, bx + 1.13, pf + 0.9, 0.04);
    b.deco('metal:#8a6a2a', bx + 1.13, pf + 0.85, -0.55, bx + 1.17, pf + 1.35, 0.55);
    b.sign({ k: 'label', text: '旧終点 鶴松 1933–1961', sub: 'Buffer stop from the line’s old terminus', fg: '#2a2019', bg: '#d9c27a' }, bx + 1.175, pf + 1.1, 0, [1, 0], 1.0, 0.42);
    b.block(bx + 1.0, pf, -0.55, bx + 1.2, pf + 1.35, 0.55);
  }
}

// ── Exits ────────────────────────────────────────────────────────────────────────────────────

/** Exit 2's street entrance: a bathhouse gable of dark tile on timber posts, a noren over the mouth, paper lamps. */
function bathCanopy(e: ExitInfo) {
  const { b, gy, run, ext } = e;
  const xa = -0.5, xb = run + 0.65, zA = ext + 0.75, zB = ext + 4.45, zm = (zA + zB) / 2;
  const TIMB = 'wood:#5a3f2a', TILE = 'flat:#3d4148';
  // Posts at the corners and along the sides, a tie beam on each side.
  const np = Math.max(1, Math.ceil(run / 4.5));
  for (let k = 0; k <= np; k++) {
    const x = xa + 0.15 + ((xb - xa - 0.3) * k) / np;
    for (const z of [zA + 0.2, zB - 0.2]) b.deco(TIMB, x - 0.08, gy, z - 0.08, x + 0.08, gy + 2.75, z + 0.08);
  }
  for (const z of [zA + 0.2, zB - 0.2]) b.deco(TIMB, xa, gy + 2.62, z - 0.1, xb, gy + 2.8, z + 0.1);
  // Roof: stepped tile slopes up to the ridge, deep eaves.
  const steps = 16, half = (zB - zA) / 2 + 0.35;
  for (let k = 0; k < steps; k++) {
    const t0 = k / steps, t1 = (k + 1) / steps, y = gy + 2.8 + t0 * 0.95;
    for (const s of [-1, 1]) {
      const z0 = zm + s * half * (1 - t0), z1 = zm + s * half * (1 - t1);
      b.deco(TILE, xa - 0.35, y, Math.min(z0, z1), xb + 0.35, y + 0.08, Math.max(z0, z1));
    }
  }
  b.deco('flat:#2c2f35', xa - 0.4, gy + 3.75, zm - 0.16, xb + 0.4, gy + 3.95, zm + 0.16);
  // The front gable: white plaster in steps under a timber bargeboard.
  for (let k = 0; k < steps; k++) {
    const t = k / steps, w = half * (1 - t) - 0.3;
    if (w <= 0.05) continue;
    b.deco('flat:#ece6d6', xb + 0.3, gy + 2.8 + t * 0.95, zm - w, xb + 0.33, gy + 2.8 + (k + 1) * 0.95 / steps, zm + w);
  }
  // Noren above the entrance sign, the dark board behind the sign as the kit has it.
  noren(e, 'z', xb + 0.36, zA + 0.5, zB - 0.5, gy + 3.05, { color: '#1f3f66', text: '地下鉄 鶴松', fg: '#ffffff', face: 1, h: 0.42 });
  b.deco('flat:#22262b', run - 0.04, gy + 1.88, ext + 1.1, run + 0.05, gy + 2.52, ext + 4.1);
  // Square paper lamps on the front posts.
  for (const z of [zA + 0.2, zB - 0.2]) {
    b.deco(TIMB, xb - 0.24, gy + 2.0, z - 0.17, xb + 0.14, gy + 2.04, z + 0.17);
    b.deco('glow:#ffe2b0', xb - 0.2, gy + 1.62, z - 0.13, xb + 0.1, gy + 2.0, z + 0.13);
  }
}

/** Vermilion handrails up both stair walls, stepped with the slope. */
function exitRails(e: ExitInfo) {
  const { b, cf, gy, ext, run } = e, n = Math.max(4, Math.round(run / 1.6));
  const sy = (x: number) => cf + ((gy - cf) * Math.max(0, Math.min(run, x))) / run;
  for (const [z, f] of [[ext + 1.2, 1], [ext + 4, -1]] as const) {
    const za = Math.min(z + f * 0.05, z + f * 0.1), zb = Math.max(z + f * 0.05, z + f * 0.1);
    for (let k = 0; k < n; k++) {
      const xa = (run * k) / n, xb = (run * (k + 1)) / n, y = sy((xa + xb) / 2) + 0.85;
      b.deco(VERM, xa, y, za, xb, y + 0.05, zb);
    }
    for (let k = 1; k < 4; k++) {
      const x = (run * k) / 4, y = sy(x) + 0.85;
      b.deco('metal:#9da2a8', x - 0.02, y - 0.04, Math.min(z, z + f * 0.08), x + 0.02, y, Math.max(z, z + f * 0.08));
    }
  }
}
