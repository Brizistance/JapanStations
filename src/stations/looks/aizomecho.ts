// Station look: Aizomechō (藍染町), the dyers' street. See Plans/features/station-looks/plan.md.
//
// The old indigo dyers' quarter, on the 1961 Nagisa Line: low, busy and dark-timbered. Indigo
// tile dado under warm plaster, kōshi lattice and a seigaiha frieze on the walls, a cream
// ceiling with timber beams and old pipes. The centrepiece is cloth: a dye yard of long indigo
// lengths drying between the platform stair openings, ranks of shorter lengths hung across the
// paid area, and a noren gate with the quarter's crest over each transfer stair. Shops: a dye
// works with vats, a tenugui shop, a kimono fabric merchant, a tea shop.
//
// The crest (invented): 三つ波丸 Mitsunami-maru, three waves in a ring.

import { LINES } from '../../data/network';
import type { Builder } from '../../world/builder';
import { hallDims } from '../kit';
import { SPECS } from '../specs';
import {
  band, batten, beam, cut, exitDado, hash, kioskStall, lantern, noren, passageDado, passagePipes,
  passageRails, passageWalls, pipeRun, shopFront, SHOPS, sobaStand, toiletX, vendingRow, wallDado, wbox,
  type Axis, type Brand, type Span, type Wall,
} from './parts';
import type { ConcInfo, ExitInfo, PassageInfo, Rect, StationLook } from './types';

// ── Palette ──────────────────────────────────────────────────────────────────────────────────

const INDIGO = '#24407a';
const CREAM = '#f1ead8';
const TILE = `tile:${INDIGO}`;
const TIMBER = 'wood:#3b2a1e';
const PLASTER = 'paint:#ece4d2';
const RESIST = `flat:${CREAM}`; // the white left by resist-dyeing
const FRIEZE = 'flat:#1f3566';
const CUSHION = 'flat:#2b3f73';
/** Indigo from pale ai (kamenozoki) to near-black (kachi-iro). */
const SHADES = ['#c6d4e6', '#8fa8ca', '#5574a8', '#2f4a82', '#1d2c50', '#121a30'];

/** Invented shops of the dyers' street (never real). */
const BRANDS = {
  tsuyukusa: { ja: '藍染処 つゆ草', en: 'Aizome Tsuyukusa', bg: INDIGO, fg: CREAM, kind: 'goods' },
  namichidori: { ja: '手ぬぐい 波千鳥', en: 'Tenugui Namichidori', bg: CREAM, fg: INDIGO, kind: 'goods' },
  itoyoshi: { ja: '呉服 糸よし', en: 'Gofuku Itoyoshi', bg: '#3b2a1e', fg: CREAM, kind: 'goods' },
  shizukuen: { ja: '日本茶 しずく園', en: 'Shizuku-en Tea', bg: '#2f4a2c', fg: CREAM, kind: 'cafe' },
} satisfies Record<string, Brand>;

// ── Small helpers ────────────────────────────────────────────────────────────────────────────

/** A box along a run: `along` from p to q, across from at + c0 to at + c1. */
function run(b: Builder, mat: string, axis: Axis, at: number, p: number, q: number, y0: number, y1: number, c0: number, c1: number) {
  if (axis === 'x') b.deco(mat, p, y0, at + c0, q, y1, at + c1);
  else b.deco(mat, at + c0, y0, p, at + c1, y1, q);
}

/** Offsets d0 … d1 out from a wall line, on side f. */
const off = (f: Wall, d0: number, d1: number): [number, number] => (f > 0 ? [d0, d1] : [-d1, -d0]);

/**
 * One length of dyed cloth, `w` wide centred on `mid` along a run, from y1 down to y0. `face` 0:
 * hanging free (both faces show); ±1: flat against a wall at `at`, standing off on that side.
 * Darker lengths may carry a resist pattern (dots, stripes or kanoko squares); the marks are
 * thicker than the cloth so one box shows on both faces.
 */
function cloth(b: Builder, axis: Axis, at: number, mid: number, w: number, y1: number, y0: number, k: number, face: 0 | Wall = 0) {
  const sh = Math.floor(hash(k, 3.7) * SHADES.length);
  const [c0, c1] = face === 0 ? [-0.01, 0.01] : off(face, 0.022, 0.034);
  run(b, `flat:${SHADES[sh]}`, axis, at, mid - w / 2, mid + w / 2, y0, y1, c0, c1);
  const pat = sh < 2 ? 0 : Math.max(0, Math.floor(hash(k, 9.1) * 5) - 1);
  const rows = Math.min(2, Math.floor((y1 - y0 - 0.1) / 0.3));
  if (pat === 0 || rows < 1) return;
  const [m0, m1] = face === 0 ? [-0.017, 0.017] : off(face, 0.034, 0.041);
  const mark = (u: number, v: number, hu: number, hv: number) => run(b, RESIST, axis, at, mid + u - hu, mid + u + hu, v - hv, v + hv, m0, m1);
  for (let r = 0; r < rows; r++) {
    const v = y1 - 0.2 - r * 0.3;
    if (pat === 2) { mark(0, v, w / 2 - 0.05, 0.018); continue; }
    const cols = w > 0.75 ? 3 : 2, pitch = (w * 0.75) / cols;
    for (let c = 0; c < cols; c++) {
      const u = (c - (cols - 1) / 2) * pitch + (pat === 3 ? (r % 2 ? 0.05 : -0.05) : 0);
      mark(u, v, pat === 1 ? 0.024 : 0.045, pat === 1 ? 0.024 : 0.045);
    }
  }
}

/** Lengths of cloth side by side from a to c along a run (same `face` rules as `cloth`). */
function clothRow(b: Builder, axis: Axis, at: number, a: number, c: number, y1: number, yLow: number, k0: number, face: 0 | Wall, gap = 0.1, drop = 0.3) {
  let u = a, k = k0;
  while (true) {
    const w = 0.6 + 0.3 * hash(k, 5.3);
    if (u + w > c) break;
    cloth(b, axis, at, u + w / 2, w, y1, yLow + drop * hash(k, 7.7), k, face);
    u += w + gap;
    k++;
  }
}

/**
 * The quarter's crest, 三つ波丸 (Mitsunami-maru): a ring with three wave humps, in white, in the
 * plane of a run (u along it, centred on `u`), `c0 … c1` across.
 */
function crest(b: Builder, axis: Axis, at: number, u: number, yc: number, r: number, c0: number, c1: number, simple = false) {
  const m = (u0: number, u1: number, v0: number, v1: number) => run(b, RESIST, axis, at, u + u0 * r, u + u1 * r, yc + v0 * r, yc + v1 * r, c0, c1);
  m(-0.52, 0.52, 0.84, 1);
  m(-0.52, 0.52, -1, -0.84);
  m(-1, -0.84, -0.52, 0.52);
  m(0.84, 1, -0.52, 0.52);
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) m(sx * 0.65 - 0.15, sx * 0.65 + 0.15, sy * 0.65 - 0.15, sy * 0.65 + 0.15);
  for (const w of [0.3, -0.08, -0.46]) {
    // A hump: a wide bar with a short one on top (`simple`: the short one only, for small crests).
    if (!simple) m(-0.5, 0.5, w, w + 0.13);
    m(-0.2 - (simple ? 0.15 : 0), 0.2 + (simple ? 0.15 : 0), w + 0.13, w + 0.26);
  }
}

/** Kōshi: a panel of vertical timber slats in a frame, a … c along a wall at `at` facing f. */
function lattice(b: Builder, axis: Axis, at: number, f: Wall, a: number, c: number, y0: number, y1: number, pitch = 0.2) {
  const o = off(f, 0, 0.06);
  run(b, TIMBER, axis, at, a, c, y0, y0 + 0.06, ...o);
  run(b, TIMBER, axis, at, a, c, y1 - 0.06, y1, ...o);
  run(b, TIMBER, axis, at, a, a + 0.06, y0 + 0.06, y1 - 0.06, ...o);
  run(b, TIMBER, axis, at, c - 0.06, c, y0 + 0.06, y1 - 0.06, ...o);
  const n = Math.floor((c - a - 0.12) / pitch);
  const s0 = a + 0.06 + (c - a - 0.12 - n * pitch) / 2 + pitch / 2;
  for (let k = 0; k < n; k++) run(b, TIMBER, axis, at, s0 + k * pitch - 0.02, s0 + k * pitch + 0.02, y0 + 0.06, y1 - 0.06, ...off(f, 0.012, 0.045));
}

const nearGate = (i: ConcInfo, x: number, m: number) => i.ends.some((e) => Math.abs(x - e.g) < m);

/** Transfer-stair openings: deeper (in z) than a platform stair, and running up to a long wall. */
const transferHoles = (i: ConcInfo): Rect[] => i.holes.filter((h) => h[3] - h[1] > 3.2 && Math.max(Math.abs(h[1]), Math.abs(h[3])) > i.cw - 2);
/** Platform-stair openings: the rest. */
const platformHoles = (i: ConcInfo): Rect[] => i.holes.filter((h) => !transferHoles(i).includes(h));
/** The concourse end of a stair opening: the end further from the middle. */
const topOf = (h: Rect) => (Math.abs(h[0]) > Math.abs(h[2]) ? h[0] : h[2]);
/** x of the noren gate over each transfer stair: just past its top, on the floor side. */
const gateX = (h: Rect) => topOf(h) + Math.sign(topOf(h) || 1) * 1.4;

/** x of the 4 m structural grid: beams on it, cloth ranks and lights midway, alternately. */
function mids(i: ConcInfo, rank: boolean): number[] {
  const out: number[] = [];
  for (let k = 0; i.x0 + 4 * k + 2 < i.x1; k++) if ((k % 2 === 1) === rank) out.push(i.x0 + 4 * k + 2);
  return out;
}

// ── Shops and benches ────────────────────────────────────────────────────────────────────────

interface Front { s: Wall; x0: number; x1: number; d: number }

/** Try `at(x0)` along the paid area in 0.5 m steps, from the left (dir 1) or the right (−1). */
function fit(i: ConcInfo, w: number, dir: 1 | -1, at: (x0: number) => boolean): boolean {
  const [a, c] = i.paid;
  for (let k = 0; ; k++) {
    const x0 = dir > 0 ? a + 0.2 + k * 0.5 : c - 0.2 - w - k * 0.5;
    if (x0 < a || x0 + w > c) return false;
    if (at(x0)) return true;
  }
}

/** The dye works: a stall of cloth bolts with a noren, two dye vats beside it, cloth drying above. */
function dyeWorks(i: ConcInfo, s: Wall, x0: number, fronts: Front[]): boolean {
  const W = 6.4, [za, zb] = band(i, s, 0, 2.6);
  if (!i.free(x0, za, x0 + W, zb)) return false;
  if (!shopFront(i, {
    s, x0, x1: x0 + 4, brand: BRANDS.tsuyukusa, depth: 1.4, front: 'stall', body: TIMBER,
    goods: SHADES.slice(1), noren: { color: INDIGO, text: '藍染', fg: CREAM },
  })) return false;
  fronts.push({ s, x0, x1: x0 + 4, d: 1.4 });
  // Vats: solid, with the yard they stand in claimed.
  const [ca, cb] = band(i, s, 0, 2.2);
  i.claim(x0 + 4, ca, x0 + W, cb);
  const { b, cf } = i;
  wbox(i, s, 'none', x0 + 4.2, x0 + 6.3, cf, cf + 0.9, 0.15, 1.15, true);
  wbox(i, s, 'flat:#6d6a64', x0 + 4.1, x0 + 6.35, cf, cf + 0.03, 0.05, 1.25);
  for (const vx of [x0 + 4.7, x0 + 5.8]) {
    const vz = s * (i.cw - 0.65);
    b.mesh('wood:#2a1f17', 'cyl', vx, cf + 0.43, vz, 0.9, 0.86, 0.9);
    b.mesh('flat:#0e1528', 'cyl', vx, cf + 0.865, vz, 0.76, 0.01, 0.76);
    for (const y of [cf + 0.2, cf + 0.66]) b.mesh('metal:#5d5a55', 'cyl', vx, y, vz, 0.93, 0.04, 0.93);
  }
  // Fresh lengths drying on the wall over the vats (claimed floor, so they may hang low).
  run(b, TIMBER, 'x', s * i.cw, x0 + 4.15, x0 + 6.3, cf + 2.2, cf + 2.25, ...off(-s as Wall, 0, 0.05));
  clothRow(b, 'x', s * i.cw, x0 + 4.25, x0 + 6.25, cf + 2.2, cf + 1.0, 11, -s as Wall, 0.12, 0.2);
  return true;
}

/** A wooden bench with indigo cushions: against wall `s` from x0 (back set), or free-standing at (x, z). */
function woodBench(i: ConcInfo, x0: number, x1: number, z0: number, z1: number, back: 0 | Wall) {
  const { b, cf } = i, xm = (x0 + x1) / 2;
  b.block(x0, cf, z0, x1, cf + 0.45, z1);
  b.deco(TIMBER, x0, cf + 0.4, z0, x1, cf + 0.46, z1);
  b.deco(CUSHION, x0 + 0.05, cf + 0.46, z0 + 0.04, xm - 0.03, cf + 0.5, z1 - 0.04);
  b.deco(CUSHION, xm + 0.03, cf + 0.46, z0 + 0.04, x1 - 0.05, cf + 0.5, z1 - 0.04);
  for (const lx of [x0 + 0.15, x1 - 0.15]) b.deco(TIMBER, lx - 0.04, cf, z0 + 0.03, lx + 0.04, cf + 0.4, z1 - 0.03);
  if (back) {
    const zw = back > 0 ? z1 : z0;
    b.deco(TIMBER, x0, cf + 0.55, Math.min(zw, zw + back * 0.06), x1, cf + 0.9, Math.max(zw, zw + back * 0.06));
  }
}

function wallBench(i: ConcInfo, s: Wall, x0: number, len = 1.8): boolean {
  const [za, zb] = band(i, s, 0, 1.5);
  if (!i.free(x0 - 0.2, za, x0 + len + 0.2, zb)) return false;
  i.claim(x0 - 0.2, za, x0 + len + 0.2, zb);
  const [ba, bb] = band(i, s, 0.12, 0.62);
  woodBench(i, x0, x0 + len, ba, bb, s);
  return true;
}

function freeBench(i: ConcInfo, x: number, z: number): boolean {
  if (!i.free(x - 0.9, z - 0.25, x + 0.9, z + 0.25, 0.9)) return false;
  i.claim(x - 1.4, z - 0.75, x + 1.4, z + 0.75);
  woodBench(i, x - 0.9, x + 0.9, z - 0.25, z + 0.25, 0);
  return true;
}

function shops(i: ConcInfo): Front[] {
  const fronts: Front[] = [];
  const shop = (s: Wall, x0: number, w: number, d: number, ok: boolean) => {
    if (ok) fronts.push({ s, x0, x1: x0 + w, d });
    return ok;
  };
  // The shop street runs from the −x gates; the +x end is quieter.
  fit(i, 6.4, 1, (x) => dyeWorks(i, 1, x, fronts));
  fit(i, 4, 1, (x) => shop(1, x, 4, 1.0, shopFront(i, {
    s: 1, x0: x, x1: x + 4, brand: BRANDS.itoyoshi, depth: 1.0, front: 'counter', body: TIMBER,
    goods: ['#7a1f3d', INDIGO, '#d9a400', '#e9b7c4', '#2e6b4f'], noren: { color: '#5b2238', text: '呉服', fg: CREAM },
  })));
  fit(i, 1.8, 1, (x) => wallBench(i, 1, x));
  fit(i, 3.6, -1, (x) => shop(1, x, 3.6, 1.4, sobaStand(i, 1, x, SHOPS.udonKawanami)));
  fit(i, 1.8, -1, (x) => wallBench(i, 1, x));

  fit(i, 3.6, 1, (x) => shop(-1, x, 3.6, 0.5, shopFront(i, {
    s: -1, x0: x, x1: x + 3.6, brand: BRANDS.namichidori, depth: 0.5, front: 'glazed', body: TIMBER, door: x + 0.9,
    awning: INDIGO, goods: [INDIGO, CREAM, '#8fa8ca', '#b23a3a', '#5574a8'],
  })));
  fit(i, 3, 1, (x) => shop(-1, x, 3, 1.0, shopFront(i, {
    s: -1, x0: x, x1: x + 3, brand: BRANDS.shizukuen, depth: 1.0, front: 'counter', body: TIMBER,
    goods: ['#2f4a2c', '#8bbf7a', '#c9a46a', '#e8e2d0'], noren: { color: '#2f4a2c', text: '茶', fg: CREAM },
  })));
  fit(i, 1.8, 1, (x) => wallBench(i, -1, x));
  fit(i, 2.4, -1, (x) => shop(-1, x, 2.4, 1.0, kioskStall(i, -1, x)));
  fit(i, 3.5, -1, (x) => vendingRow(i, -1, x, 2));
  return fronts;
}

/** Benches in the pillar lines, midway between pillars, alternating sides (at most four). */
function pillarBenches(i: ConcInfo) {
  const xs = [...new Set(i.pillars.filter(([x, z]) => i.pillars.some(([x2, z2]) => z2 === z && Math.abs(x2 - x - 8) < 0.01)).map(([x]) => x + 4))].sort((p, q) => p - q);
  let n = 0;
  xs.forEach((x, k) => {
    if (n >= 4 || x < i.paid[0] + 4 || x > i.paid[1] - 4) return;
    const zs = i.pillars.filter(([px]) => Math.abs(px - x + 4) < 0.01).map(([, z]) => z).sort((p, q) => (k % 2 ? q - p : p - q));
    for (const z of zs) if (freeBench(i, x, z)) { n++; break; }
  });
}

// ── Walls ────────────────────────────────────────────────────────────────────────────────────

/** Lattice, drying cloth and the odd poster on every free stretch of paid-area wall. */
function wallDressing(i: ConcInfo) {
  const { b, cf } = i;
  for (const s of [-1, 1] as const) {
    const at = s * i.cw, f = -s as Wall;
    let k = s > 0 ? 0 : 2, x = i.paid[0];
    while (x + 2.4 <= i.paid[1]) {
      const [za, zb] = band(i, s, 0, 0.08);
      if (!i.free(x, za, x + 2.4, zb)) { x += 0.3; continue; }
      const [ca, cb] = band(i, s, 0, 0.05);
      i.claim(x, ca, x + 2.4, cb);
      const kind = k % 4;
      if (kind === 1) {
        // Dyed lengths drying on a rail, flat to the wall.
        run(b, TIMBER, 'x', at, x + 0.05, x + 2.35, cf + 2.3, cf + 2.36, ...off(f, 0, 0.05));
        clothRow(b, 'x', at, x + 0.15, x + 2.3, cf + 2.3, cf + 1.0, 40 + k * 3, f, 0.1, 0.25);
      } else if (kind === 3) {
        wbox(i, s, 'flat:#c9c9c4', x + 0.66, x + 1.74, cf + 0.91, cf + 2.39, 0.008, 0.022);
        b.sign({ k: 'poster', v: (k + i.station.id.length) % 8 }, x + 1.2, cf + 1.65, s * (i.cw - 0.03), [0, -s], 1.0, 1.4);
      } else lattice(b, 'x', at, f, x + 0.03, x + 2.37, cf + 1.15, cf + 2.36, 0.3);
      k++;
      x += 2.5;
    }
  }
}

/** Seigaiha: white wave scallops on an indigo band along the paid-area walls, broken by shops. */
function frieze(i: ConcInfo, fronts: Front[]) {
  const { cf } = i, tx = toiletX(i);
  for (const s of [-1, 1] as const) {
    const gaps: Span[] = fronts.filter((f) => f.s === s).map((f): Span => [f.x0 - 0.05, f.x1 + 0.05]);
    if (s < 0) gaps.push([tx - 1.05, tx + 1.05]);
    for (const [a, c] of cut([i.paid[0] + 3.4, i.paid[1] - 3.4], gaps)) {
      if (c - a < 1) continue;
      wbox(i, s, FRIEZE, a, c, cf + 2.42, cf + 2.74, 0, 0.012);
      wbox(i, s, RESIST, a, c, cf + 2.42, cf + 2.445, 0, 0.016);
      wbox(i, s, RESIST, a, c, cf + 2.715, cf + 2.74, 0, 0.016);
      const n = Math.floor((c - a) / 1.5), u0 = a + (c - a - n * 1.5) / 2;
      for (let k = 0; k < n; k++) {
        const u = u0 + k * 1.5 + 0.75;
        // A white mound with an indigo one inside: one wave of the pattern, two boxes.
        wbox(i, s, RESIST, u - 0.7, u + 0.7, cf + 2.445, cf + 2.62, 0, 0.016);
        wbox(i, s, FRIEZE, u - 0.6, u + 0.6, cf + 2.445, cf + 2.585, 0, 0.02);
      }
    }
  }
}

// ── Ceiling ──────────────────────────────────────────────────────────────────────────────────

function ceiling(i: ConcInfo, fronts: Front[]) {
  const top = i.cf + i.clear, tx = toiletX(i);
  const gates = transferHoles(i).map(gateX);
  // Timber beams on the 4 m grid, stopping short of the shop fascias.
  for (let x = i.x0 + 4; x < i.x1 - 0.5; x += 4) {
    if (x < i.paid[0] || x > i.paid[1] || nearGate(i, x, 4.5) || Math.abs(x - tx) < 1.5 || gates.some((g) => Math.abs(g - x) < 0.6)) continue;
    const end = (s: Wall) => {
      const f = fronts.find((q) => q.s === s && x > q.x0 - 0.3 && x < q.x1 + 0.3);
      return s * (i.cw - (f ? f.d + 0.05 : 0));
    };
    beam(i, x, 0.3, { mat: TIMBER, w: 0.3, z0: end(-1), z1: end(1) });
  }
  // Old pipes along both walls, ducking into the ceiling over shops and the noren gates.
  const a = i.paid[0] + 3.4, c = i.paid[1] - 3.4;
  for (const s of [-1, 1] as const) {
    const gaps: Span[] = [
      ...fronts.filter((f) => f.s === s).map((f): Span => [f.x0 - 0.15, f.x1 + 0.15]),
      ...gates.map((g): Span => [g - 0.3, g + 0.3]),
    ];
    pipeRun(i, 'x', s * (i.cw - 0.55), a, c, top, {
      n: 2, gaps, mats: s > 0 ? ['paint:#8c949b', 'paint:#7a5a3a'] : ['paint:#b8b2a3', 'paint:#a33b2f'],
    });
  }
}

// ── The cloth ────────────────────────────────────────────────────────────────────────────────

/**
 * The dye yard (干し場): long lengths drying on three poles between each side's pair of platform
 * stair openings, inside a timber kerb. The floor under it is claimed and solid, so the cloth may
 * come down to a metre; 2.4 m is kept clear to the pillar line and to both stair openings.
 */
function dyeYard(i: ConcInfo, s: Wall, k0: number) {
  const { b, cf } = i;
  const hs = platformHoles(i).filter((h) => Math.sign(h[1] + h[3]) === s).sort((p, q) => p[0] - q[0]);
  const pz = Math.max(0, ...i.pillars.map(([, z]) => Math.abs(z)));
  for (let n = 0; n + 1 < hs.length; n++) {
    const X0 = hs[n][2] + 3.4, X1 = hs[n + 1][0] - 3.4;
    if (X1 - X0 < 3) continue;
    const Z0 = pz + 0.42 + 2.45;
    let Z1 = Z0 + 2.3;
    const rect = (z1: number): Rect => (s > 0 ? [X0, Z0, X1, z1] : [X0, -z1, X1, -Z0]);
    while (Z1 - Z0 >= 1.4 && !i.free(...rect(Z1))) Z1 -= 0.1;
    if (Z1 - Z0 < 1.4) continue;
    const [, za, , zb] = rect(Z1);
    i.claim(X0, za, X1, zb);
    b.block(X0, cf, za, X1, cf + 2.4, zb);
    // Stone bed and timber kerb.
    b.deco('flat:#7d786f', X0 + 0.1, cf, za + 0.1, X1 - 0.1, cf + 0.03, zb - 0.1);
    b.deco(TIMBER, X0, cf, za, X1, cf + 0.2, za + 0.1);
    b.deco(TIMBER, X0, cf, zb - 0.1, X1, cf + 0.2, zb);
    b.deco(TIMBER, X0, cf, za + 0.1, X0 + 0.1, cf + 0.2, zb - 0.1);
    b.deco(TIMBER, X1 - 0.1, cf, za + 0.1, X1, cf + 0.2, zb - 0.1);
    // Three poles on posts, cloth on each, pale at the aisle and darkening towards the back.
    const rows = [Z0 + 0.35, (Z0 + Z1) / 2, Z1 - 0.35].map((z) => s * z);
    rows.forEach((z, r) => {
      for (const px of [X0 + 0.06, X1 - 0.06]) b.deco(TIMBER, px - 0.05, cf, z - 0.05, px + 0.05, cf + i.clear, z + 0.05);
      b.deco(TIMBER, X0 + 0.11, cf + 2.6, z - 0.025, X1 - 0.11, cf + 2.65, z + 0.025);
      clothRow(b, 'x', z, X0 + 0.2, X1 - 0.2, cf + 2.6, cf + 1.0, k0 + r * 10, 0, 0.08, 0.45);
    });
    // A name board at the aisle edge.
    const zf = s * (Z0 + 0.02), zback = s * (Z0 + 0.06);
    const xm = (X0 + X1) / 2;
    b.deco(TIMBER, xm - 0.62, cf + 0.32, Math.min(zf, zback), xm + 0.62, cf + 0.72, Math.max(zf, zback));
    for (const lx of [xm - 0.5, xm + 0.5]) b.deco(TIMBER, lx - 0.03, cf + 0.2, Math.min(zf, zback), lx + 0.03, cf + 0.32, Math.max(zf, zback));
    b.sign({ k: 'label', text: '藍の干し場', sub: 'Indigo drying yard', fg: CREAM, bg: INDIGO }, xm, cf + 0.52, s * (Z0 + 0.01), [0, -s], 1.1, 0.32);
  }
}

/** A rank of shorter lengths on a pole across the concourse, kept 2.32 m clear over the floor. */
function rank(i: ConcInfo, x: number, k0: number) {
  const { b, cf } = i, top = cf + i.clear, yP = top - 0.08, zl = i.cw - 1.8;
  b.deco(TIMBER, x - 0.03, yP - 0.04, -zl, x + 0.03, yP, zl);
  for (const z of [-zl + 0.2, -zl / 3, zl / 3, zl - 0.2]) b.deco('flat:#2b2d30', x - 0.01, yP, z - 0.01, x + 0.01, top, z + 0.01);
  let z = -zl + 0.15, k = k0;
  while (true) {
    const w = 0.6 + 0.3 * hash(k, x);
    if (z + w > zl - 0.1) break;
    // Not over stairs, pillars, shops or anything else in the floor plan: those stay in view.
    if (i.free(x - 0.25, z, x + 0.25, z + w)) cloth(b, 'z', x, z + w / 2, w, yP - 0.04, cf + 2.32 + 0.1 * hash(k, 2.9), k, 0);
    z += w + 0.5;
    k++;
  }
}

/** A noren gate with the crest across the top of each transfer stair. */
function norenGates(i: ConcInfo) {
  const top = i.cf + i.clear - 0.03;
  for (const h of transferHoles(i)) {
    const s: Wall = h[1] + h[3] > 0 ? 1 : -1;
    const x = gateX(h);
    const inner = s > 0 ? h[1] - 0.3 : h[3] + 0.3, outer = s * (i.cw - 0.08);
    noren(i, 'z', x, inner, outer, top, { color: INDIGO, h: 0.62 });
    crest(i.b, 'z', x, (inner + outer) / 2, top - 0.04 - 0.31, 0.2, -0.017, 0.017);
  }
}

// ── Exits ────────────────────────────────────────────────────────────────────────────────────

const stairY = (e: ExitInfo, x: number) => e.cf + ((e.gy - e.cf) * Math.max(0, Math.min(e.run, x))) / e.run;

/** Timber handrail stepped up the far stair wall. */
function woodRail(e: ExitInfo) {
  const { b, ext, run: r } = e, z = ext + 4, n = Math.max(5, Math.round(r / 2));
  for (let k = 0; k < n; k++) {
    const xa = (r * k) / n, xb = (r * (k + 1)) / n, y = stairY(e, (xa + xb) / 2) + 0.85;
    b.deco(TIMBER, xa, y, z - 0.11, xb, y + 0.06, z - 0.04);
  }
  for (let k = 1; k < 4; k++) {
    const x = (r * k) / 4, y = stairY(e, x) + 0.85;
    b.deco('metal:#5d5a55', x - 0.02, y - 0.05, z - 0.08, x + 0.02, y, z);
  }
}

// ── Passages ─────────────────────────────────────────────────────────────────────────────────

/** Doorways from a side-platform primary line into this passage (as build.ts cuts them). */
function platformDoorways(p: PassageInfo): Span[] {
  const spec = SPECS[p.station.id];
  const prim = spec && 'primary' in spec ? LINES.find((l) => l.id === spec.primary) : undefined;
  if (!prim || prim.platformType === 'island') return [];
  if (Math.abs(p.zc0 - (hallDims(prim, 0).wallZ + 0.5)) > 0.01) return [];
  return [[-24, -20], [-3, 1]];
}

// ── The look ─────────────────────────────────────────────────────────────────────────────────

export const look: StationLook = {
  finishes: { wall: PLASTER, floor: 'floor:#a7a29a', pillar: TILE, ceil: 'paint:#efe7d3' },
  posters: false,
  skirting: false,

  lights(i) {
    const { b, cf } = i, top = cf + i.clear;
    const rows = [0.33, 0.75].flatMap((k) => [k * i.cw, -k * i.cw]);
    const gates = transferHoles(i).map(gateX);
    // Opal globes in the paid area, midway between beams, between the cloth ranks.
    for (const x of mids(i, false)) {
      if (x < i.paid[0] || x > i.paid[1] || nearGate(i, x, 4.5) || gates.some((g) => Math.abs(g - x) < 0.5)) continue;
      for (const z of rows) {
        b.mesh('glow:#fff2d8', 'sphere', x, cf + 2.6, z, 0.34, 0.34, 0.34);
        b.deco('flat:#2b2d30', x - 0.01, cf + 2.8, z - 0.01, x + 0.01, top, z + 0.01);
      }
    }
    // Bare battens, brighter, at the gates (both sides, clear of the offices) and the stair tops.
    for (const e of i.ends) {
      const d = e.hi ? 1 : -1;
      const segs: [number, number][] = [[-5.6, -3.2], [3.4, 5.8], [7.0, 9.4]];
      for (const [p, q] of segs) {
        const xa = e.g + d * p, xb = e.g + d * q;
        if (Math.min(xa, xb) < i.x0 + 0.3 || Math.max(xa, xb) > i.x1 - 0.3) continue;
        for (const z of rows) batten(i, 'x', z, Math.min(xa, xb), Math.max(xa, xb), top);
      }
    }
    for (const h of i.holes) {
      const t = topOf(h), x = t + Math.sign(t || 1) * 1.0;
      batten(i, 'z', x, h[1] + 0.2, h[3] - 0.2, top);
    }
  },

  pillar(i, x, z, y0, y1) {
    const { b } = i, h = 0.42, sz = z >= 0 ? 1 : -1;
    // Indigo tile below, plaster in a timber frame above.
    b.deco(TILE, x - h, y0, z - h, x + h, y0 + 1.5, z + h);
    b.deco(PLASTER, x - h, y0 + 1.5, z - h, x + h, y1, z + h);
    b.deco(TIMBER, x - h - 0.012, y0 + 1.5, z - h - 0.012, x + h + 0.012, y0 + 1.58, z + h + 0.012);
    b.deco(TIMBER, x - h - 0.012, y1 - 0.3, z - h - 0.012, x + h + 0.012, y1, z + h + 0.012);
    // Every other paid-area pillar (the odd ones on the grid) wears an indigo banner with the crest, facing the middle aisle.
    const idx = Math.round((x - i.x0 - 4) / 8);
    if (idx % 2 === 0 || x < i.paid[0] || x > i.paid[1] || nearGate(i, x, 4)) return;
    const fz = z - sz * h; // the face towards z = 0
    const o = (d0: number, d1: number): [number, number] => [-sz * d1, -sz * d0];
    run(b, TIMBER, 'x', fz, x - 0.32, x + 0.32, y0 + 2.62, y0 + 2.66, ...o(0.005, 0.04));
    run(b, `flat:${INDIGO}`, 'x', fz, x - 0.3, x + 0.3, y0 + 1.62, y0 + 2.62, ...o(0.005, 0.02));
    crest(b, 'x', fz, x, y0 + 2.15, 0.2, ...o(0.02, 0.026), true);
  },

  concourse(i) {
    for (const s of [-1, 1] as const) wallDado(i, s, { mat: TILE, top: 1.1, cap: TIMBER, skirting: 'flat:#2a2522' });
    const fronts = shops(i);
    pillarBenches(i);
    // The cloth claims its floor before the walls take what is left.
    ([1, -1] as const).forEach((s, n) => dyeYard(i, s, 100 + n * 50));
    mids(i, true).forEach((x, n) => {
      if (x > i.paid[0] && x < i.paid[1] && !nearGate(i, x, 4.5)) rank(i, x, 200 + n * 40);
    });
    norenGates(i);
    wallDressing(i);
    frieze(i, fronts);
    ceiling(i, fronts);
  },

  exit(e) {
    const { b, cf, ext } = e;
    exitDado(e, { mat: TILE, top: 1.1, cap: TIMBER });
    woodRail(e);
    // Kōshi on the lobby's blank wall.
    lattice(b, 'z', -4, 1, ext + 0.3, ext + 3.7, cf + 1.15, cf + 2.3, 0.4);
    // A small noren at the corridor mouth, crest-less, its name facing those coming down.
    const top = cf + (ext > 0 ? 2.48 : 2.68);
    noren(e, 'x', 0.25, -3.5, -0.2, top, { color: INDIGO, h: top - cf - 0.04 - 2.22, text: '藍', fg: CREAM, face: 1 });
    // An opal globe in the lobby.
    b.mesh('glow:#fff2d8', 'sphere', -2.0, cf + 2.5, ext + 3.2, 0.3, 0.3, 0.3);
    b.deco('flat:#2b2d30', -2.01, cf + 2.65, ext + 3.19, -1.99, cf + 2.7, ext + 3.21);
  },

  canopy(e) {
    const { b, gy, run: r, ext: Z } = e;
    if (r < 4) return;
    const z0 = Z + 0.97, z1 = Z + 4.23; // outer faces of the side walls (on the kit's parapets)
    // Side walls: plaster in a timber frame, the front bay in kōshi lattice; a plaster back wall.
    const bay = r - 1.9;
    for (const [za, zb] of [[z0, Z + 1.13], [Z + 4.07, z1]]) {
      b.deco(TIMBER, 0, gy + 1.0, za - 0.01, r, gy + 1.08, zb + 0.01);
      b.deco(TIMBER, 0, gy + 2.5, za - 0.01, r, gy + 2.7, zb + 0.01);
      b.deco(PLASTER, 0.08, gy + 1.08, za, bay, gy + 2.5, zb);
      const n = Math.max(1, Math.round(bay / 4));
      for (let k = 0; k <= n; k++) {
        const px = Math.min(Math.max(0.08, (bay * k) / n), r - 0.08);
        b.deco(TIMBER, px - 0.07, gy, za - 0.02, px + 0.07, gy + 2.7, zb + 0.02);
      }
      b.deco(TIMBER, r - 0.15, gy, za - 0.02, r, gy + 2.7, zb + 0.02);
      const zc = (za + zb) / 2;
      for (let x = bay + 0.15; x < r - 0.2; x += 0.3) b.deco(TIMBER, x - 0.025, gy + 1.08, zc - 0.03, x + 0.025, gy + 2.5, zc + 0.03);
    }
    b.deco(PLASTER, -0.12, gy + 1.0, z0, 0, gy + 2.7, z1);
    // Deep stepped eave in dark tile, a timber soffit and fascia.
    b.deco('flat:#2e3238', -0.5, gy + 2.7, Z + 0.45, r + 1.1, gy + 2.82, Z + 4.75);
    b.deco('flat:#3a3f46', -0.3, gy + 2.82, Z + 0.7, r + 0.75, gy + 2.96, Z + 4.5);
    b.deco('flat:#2e3238', -0.1, gy + 2.96, Z + 0.95, r + 0.4, gy + 3.1, Z + 4.25);
    b.deco('flat:#23262a', 0, gy + 3.1, Z + 2.5, r, gy + 3.22, Z + 2.7);
    b.deco(TIMBER, r, gy + 2.66, Z + 0.5, r + 1.02, gy + 2.7, Z + 4.7);
    b.deco(TIMBER, r + 1.02, gy + 2.6, Z + 0.45, r + 1.1, gy + 2.82, Z + 4.75);
    // A timber board behind the entrance sign, and the noren across the top of the opening.
    b.deco(TIMBER, r, gy + 1.85, Z + 1.1, r + 0.045, gy + 2.55, Z + 4.1);
    noren(e, 'z', r - 0.3, Z + 1.18, Z + 4.02, gy + 2.68, { color: INDIGO, h: 0.34 });
    // The crest on an indigo hanging on the far side wall, and paper lanterns under the eave.
    b.deco(`flat:${INDIGO}`, r - 3.4, gy + 1.3, z1, r - 2.6, gy + 2.45, z1 + 0.015);
    crest(b, 'x', z1, r - 3.0, gy + 1.9, 0.3, 0.015, 0.021, true);
    for (const lz of [Z + 0.72, Z + 4.48]) lantern(e, r + 0.6, gy + 2.1, lz, { color: '#f3e6c4', d: 0.32, h: 0.46, top: gy + 2.7 });
  },

  passage(p) {
    const { b, pf, zc0, zc1 } = p;
    passageDado(p, { mat: TILE, top: 1.0, cap: TIMBER });
    passageRails(p);
    passagePipes(p, { n: 2, mats: ['paint:#b8b2a3', 'paint:#7a5a3a'] });
    const [w0, w1] = passageWalls(p);
    // The dyers' lane: lengths drying on a rail along the platform-side wall (not by the stairs).
    for (const [a, c] of w0.runs) {
      if (c > 1.5 || c - a < 1) continue;
      run(b, TIMBER, 'x', zc0, a + 0.1, c - 0.1, pf + 2.38, pf + 2.43, 0, 0.05);
      clothRow(b, 'x', zc0, a + 0.2, c - 0.2, pf + 2.38, pf + 1.1, Math.round(a * 7 + zc0), 1, 0.35, 0.2);
    }
    // Kōshi on the mural wall either side of the mural and the stairs down.
    for (const [a, c] of w1.runs) if (c - a > 1.2) lattice(b, 'x', zc1, -1, a + 0.1, c - 0.1, pf + 1.1, pf + 2.25, 0.35);
    // Three lengths on the blind end wall.
    run(b, TIMBER, 'z', -26, zc0 + 0.4, zc1 - 0.4, pf + 2.4, pf + 2.45, 0, 0.05);
    clothRow(b, 'z', -26, zc0 + 0.5, zc1 - 0.5, pf + 2.4, pf + 1.15, 77, 1, 0.25, 0.15);
    // Small noren in the doorways from the platform, inside the reveal, open to 2.2 m.
    for (const [a, c] of platformDoorways(p)) noren(p, 'x', zc0 - 0.25, a + 0.08, c - 0.08, pf + 2.47, { color: INDIGO, h: 0.22 });
  },
};
