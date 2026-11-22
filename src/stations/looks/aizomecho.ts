// Station look: Aizomechō (藍染町), the dyers' street. See Plans/features/station-looks/plan.md.
//
// The old indigo dyers' quarter, on the 1961 Nagisa Line: low, busy and dark-timbered. Indigo
// tile dado under warm plaster, kōshi lattice and a seigaiha frieze on the walls, a cream
// ceiling with timber beams and old pipes. The centrepiece is cloth: a dye yard of long indigo
// lengths drying against a spine wall between the stairwells' closed ends, ranks of shorter
// lengths hung across the spine (stopping at the stairwells) and across the platforms, cloth and kōshi on the stairwell
// walls, and in each transfer bay a noren gate with the quarter's crest inside the mouth and a
// rank of drying lengths. The spine's free wall is a shop street: a dye works with its vat yard,
// a tenugui shop, a sashiko thread counter, a furoshiki stall, a kimono fabric merchant, a tea
// shop, the udon stand, a kiosk and drink machines; staff doors, shutters and cupboards fill the
// wall beside the stairs.
//
// The crest (invented): 三つ波丸 Mitsunami-maru, three waves in a ring.

import { LINES } from '../../data/network';
import type { Builder } from '../../world/builder';
import { hallDims } from '../kit';
import { SPECS } from '../specs';
import {
  band, batten, beam, cut, exitDado, faceDado, hash, hoseCabinet, kioskStall, lantern, meterCupboard, noren, passageDado, passagePipes,
  passageRails, passageWalls, pipeRun, serviceDoor, shopFront, SHOPS, shutter, sobaStand, STAFF_ROOMS, stairwellFaces, toiletX,
  vendingRow, ventGrille, wallDado, wbox,
  type Axis, type Brand, type Span, type Wall,
} from './parts';
import type { ConcInfo, ExitInfo, PassageInfo, Rect, RoomInfo, StationLook, Stairwell, WallFace } from './types';

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
  hitohari: { ja: '刺し子糸 ひと針', en: 'Sashiko Hitohari', bg: CREAM, fg: '#1d2c50', kind: 'goods' },
  musubiya: { ja: 'ふろしき 結び屋', en: 'Furoshiki Musubiya', bg: '#1d2c50', fg: CREAM, kind: 'goods' },
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
export function cloth(b: Builder, axis: Axis, at: number, mid: number, w: number, y1: number, y0: number, k: number, face: 0 | Wall = 0) {
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
export function clothRow(b: Builder, axis: Axis, at: number, a: number, c: number, y1: number, yLow: number, k0: number, face: 0 | Wall, gap = 0.1, drop = 0.3) {
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
export function crest(b: Builder, axis: Axis, at: number, u: number, yc: number, r: number, c0: number, c1: number, simple = false) {
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
export function lattice(b: Builder, axis: Axis, at: number, f: Wall, a: number, c: number, y0: number, y1: number, pitch = 0.2) {
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

/** The floor in front of a stairwell's portal that stays clear: 3.3 m out, a metre wider each side than the opening. */
function approach(w: Stairwell): Rect {
  const [px, pz] = w.portal.at, [nx, nz] = w.portal.n, hw = w.portal.w / 2 + 1;
  const a = nx ? px : pz, c = a + (nx || nz) * 3.3;
  return nx ? [Math.min(a, c), pz - hw, Math.max(a, c), pz + hw] : [px - hw, Math.min(a, c), px + hw, Math.max(a, c)];
}

/** What wall work and overhead runs in the spine stop at: the spine's stairwells (grown 0.1) and their portal approaches. */
const keepOut = (i: ConcInfo): Rect[] =>
  i.stairwells.filter((w) => w.room < 0).flatMap((w): Rect[] => [[w.footprint[0] - 0.1, w.footprint[1] - 0.1, w.footprint[2] + 0.1, w.footprint[3] + 0.1], approach(w)]);
/** x-ranges where a run along x at z (± half) meets one of `rs`. */
const alongX = (rs: Rect[], z: number, half: number): Span[] => rs.filter((r) => z + half > r[1] && z - half < r[3]).map((r): Span => [r[0], r[2]]);
/** z-ranges where a run along z at x (± half) meets one of `rs`. */
const alongZ = (rs: Rect[], x: number, half: number): Span[] => rs.filter((r) => x + half > r[0] && x - half < r[2]).map((r): Span => [r[1], r[3]]);
/** Spans along room face `f` that run beside any of `rs` (a stair opening, a portal's approach) or a portal's fascia. */
function faceGaps(f: WallFace, rs: Rect[], wells: Stairwell[]): Span[] {
  const portals = wells.map(({ portal: { fascia: p } }): Rect => {
    const a = p.at, c = p.at - p.n * 0.35;
    return p.axis === 'x' ? [p.u0, Math.min(a, c), p.u1, Math.max(a, c)] : [Math.min(a, c), p.u0, Math.max(a, c), p.u1];
  });
  const near = (r: Rect, x: number, z: number, m: number) => x > r[0] - m && x < r[2] + m && z > r[1] - m && z < r[3] + m;
  const out: Span[] = [];
  for (let u = f.u0 + 0.125; u < f.u1; u += 0.25) {
    const [x, z] = f.axis === 'x' ? [u, f.at + f.n * 0.3] : [f.at + f.n * 0.3, u];
    if (!rs.some((h) => near(h, x, z, 0.15)) && !portals.some((p) => near(p, x, z, 0.4))) continue;
    const last = out[out.length - 1];
    if (last && Math.abs(last[1] - (u - 0.125)) < 1e-6) last[1] = u + 0.125;
    else out.push([u - 0.125, u + 0.125]);
  }
  return out;
}

/** Stretches of long wall `s` that are not wall to dress: stairwells, portal approaches, doorways and mouths. */
const wallGaps = (i: ConcInfo, s: Wall): Span[] => [
  ...alongX(keepOut(i), s * (i.cw - 0.05), 0.05),
  ...i.openings.filter((o) => o.s === s).map((o): Span => [o.x0 - 0.05, o.x1 + 0.05]),
];

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

/**
 * The dye works, `w` long: a stall of cloth bolts with a noren (w − 2.4 long, 1.4 deep), and a
 * vat yard (2.4 long, 2.4 deep, claimed) with two dye vats on a stone apron, cloth drying above.
 */
function dyeWorks(i: ConcInfo, s: Wall, x0: number, w: number): Front[] | null {
  const sw = w - 2.4, xv = x0 + sw, [za, zb] = band(i, s, 0, 2.6);
  if (sw < 3 || !i.free(x0, za, x0 + w, zb)) return null;
  if (!shopFront(i, {
    s, x0, x1: xv, brand: BRANDS.tsuyukusa, depth: 1.4, front: 'stall', body: TIMBER,
    goods: SHADES.slice(1), noren: { color: INDIGO, text: '藍染', fg: CREAM },
  })) return null;
  // Vats: solid on their apron, with the yard they stand in claimed.
  const [ca, cb] = band(i, s, 0, 2.4);
  i.claim(xv, ca, x0 + w, cb);
  const { b, cf } = i;
  wbox(i, s, 'none', xv + 0.2, xv + 2.3, cf, cf + 0.9, 0.15, 1.35, true);
  wbox(i, s, 'flat:#6d6a64', xv + 0.1, xv + 2.35, cf, cf + 0.03, 0.05, 1.5);
  for (const vx of [xv + 0.7, xv + 1.8]) {
    const vz = s * (i.cw - 0.75);
    b.mesh('wood:#2a1f17', 'cyl', vx, cf + 0.43, vz, 0.9, 0.86, 0.9);
    b.mesh('flat:#0e1528', 'cyl', vx, cf + 0.865, vz, 0.76, 0.01, 0.76);
    for (const y of [cf + 0.2, cf + 0.66]) b.mesh('metal:#5d5a55', 'cyl', vx, y, vz, 0.93, 0.04, 0.93);
  }
  // Fresh lengths drying on the wall over the vats (claimed floor, so they may hang low).
  run(b, TIMBER, 'x', s * i.cw, xv + 0.15, xv + 2.3, cf + 2.2, cf + 2.25, ...off(-s as Wall, 0, 0.05));
  clothRow(b, 'x', s * i.cw, xv + 0.25, xv + 2.25, cf + 2.2, cf + 1.0, 11, -s as Wall, 0.12, 0.2);
  return [{ s, x0, x1: xv, d: 1.4 }, { s, x0: xv, x1: x0 + w, d: 1.35 }];
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

/** One unit of frontage: the lengths it can take (longest first) and how to build it at x0. */
interface Unit { ws: number[]; place: (s: Wall, x0: number, w: number) => Front[] | null }

/** A simple shop front as a unit, `d` deep. */
const unit = (i: ConcInfo, ws: number[], d: number, o: (s: Wall, x0: number, w: number) => Parameters<typeof shopFront>[1]): Unit => ({
  ws, place: (s, x0, w) => (shopFront(i, o(s, x0, w)) ? [{ s, x0, x1: x0 + w, d }] : null),
});

/** Stretches of paid-area wall `s` whose floor is free `d` deep, at 0.25 m resolution. */
function freeRuns(i: ConcInfo, s: Wall, d: number): Span[] {
  const [za, zb] = band(i, s, 0, d), out: Span[] = [];
  for (let x = i.paid[0]; x + 0.25 <= i.paid[1] + 1e-6; x += 0.25) {
    if (!i.free(x, za, x + 0.25, zb)) continue;
    const last = out[out.length - 1];
    if (last && Math.abs(last[1] - x) < 1e-6) last[1] = x + 0.25;
    else out.push([x, x + 0.25]);
  }
  return out;
}

/**
 * The shop street. The spine's free wall comes in a few stretches (between the gates and the
 * stairwells' closed ends, between the closed ends, and beside the bay mouths), so the units go
 * in as groups, each packed side by side into the tightest stretch that takes it (its preferred
 * wall first), shrinking units to their shorter lengths (the last unit first) and then dropping
 * the last ones until it fits. The dye yard (the centrepiece) and the dye works are units like the rest.
 */
function shops(i: ConcInfo): Front[] {
  const fronts: Front[] = [];
  const GAP = 0.1;
  const runs: Record<Wall, Span[]> = { 1: freeRuns(i, 1, 2.6), [-1]: freeRuns(i, -1, 2.6) } as Record<Wall, Span[]>;
  const yard: Unit = { ws: [5.6, 5.2, 4.8, 4.4, 4.0, 3.6], place: (s, x0, w) => { const f = dyeYard(i, s, x0, x0 + w, 100); return f && [f]; } };
  const works: Unit = { ws: [6.4, 6.2, 6.0, 5.6], place: (s, x0, w) => dyeWorks(i, s, x0, w) };
  const kimono = unit(i, [4, 3.6], 1.0, (s, x0, w) => ({
    s, x0, x1: x0 + w, brand: BRANDS.itoyoshi, depth: 1.0, front: 'counter', body: TIMBER,
    goods: ['#7a1f3d', INDIGO, '#d9a400', '#e9b7c4', '#2e6b4f'], noren: { color: '#5b2238', text: '呉服', fg: CREAM },
  }));
  const tea = unit(i, [3, 2.6], 1.0, (s, x0, w) => ({
    s, x0, x1: x0 + w, brand: BRANDS.shizukuen, depth: 1.0, front: 'counter', body: TIMBER,
    goods: ['#2f4a2c', '#8bbf7a', '#c9a46a', '#e8e2d0'], noren: { color: '#2f4a2c', text: '茶', fg: CREAM },
  }));
  const tenugui = unit(i, [3.6], 0.5, (s, x0, w) => ({
    s, x0, x1: x0 + w, brand: BRANDS.namichidori, depth: 0.5, front: 'glazed', body: TIMBER, door: x0 + 0.9,
    awning: INDIGO, goods: [INDIGO, CREAM, '#8fa8ca', '#b23a3a', '#5574a8'],
  }));
  const sashiko = unit(i, [2.4, 1.8], 0.8, (s, x0, w) => ({
    s, x0, x1: x0 + w, brand: BRANDS.hitohari, depth: 0.8, front: 'counter', body: TIMBER,
    goods: [CREAM, INDIGO, '#b23a3a', '#d9a400', '#8fa8ca'], noren: { color: CREAM, text: '刺し子', fg: INDIGO },
  }));
  const furoshiki = unit(i, [3, 2.6], 1.0, (s, x0, w) => ({
    s, x0, x1: x0 + w, brand: BRANDS.musubiya, depth: 1.0, front: 'stall', body: TIMBER,
    goods: [INDIGO, '#2f4a82', '#5574a8', CREAM, '#121a30'], noren: { color: '#1d2c50', text: '風呂敷', fg: CREAM },
  }));
  const udon: Unit = { ws: [3.6], place: (s, x0, w) => (sobaStand(i, s, x0, SHOPS.udonKawanami, w) ? [{ s, x0, x1: x0 + w, d: 1.4 }] : null) };
  const kiosk: Unit = { ws: [2.4], place: (s, x0, w) => (kioskStall(i, s, x0, SHOPS.maruhoshiKiosk, w) ? [{ s, x0, x1: x0 + w, d: 1.0 }] : null) };
  const vending: Unit = { ws: [2.1], place: (s, x0) => (vendingRow(i, s, x0, 2, false) ? [{ s, x0, x1: x0 + 2.1, d: 0.75 }] : null) };
  // Largest groups first. The cloth trades (yard, tenugui, sashiko) together; the dye works
  // with its vats; food and the kiosk on the other wall.
  const groups: [Wall, Unit[]][] = [
    [1, [yard, tenugui, sashiko]],
    [1, [works]],
    [-1, [udon, kiosk]],
    [-1, [kimono, vending]],
    [-1, [tea]],
    [1, [furoshiki]],
  ];
  for (const [pref, units] of groups) {
    let placed = false;
    for (let n = units.length; n > 0 && !placed; n--) {
      const us = units.slice(0, n), pick = us.map(() => 0);
      const len = () => us.reduce((t, u, k) => t + u.ws[pick[k]], 0) + GAP * (us.length - 1);
      const best = () => {
        const all = ([pref, -pref as Wall] as const).flatMap((s) => runs[s].map((r, k) => ({ s, k, r })));
        const ok = all.filter(({ r }) => r[1] - r[0] >= len() - 1e-6);
        // Tightest stretch on the preferred wall, else on the other.
        ok.sort((p, q) => (p.s === pref ? 0 : 1) - (q.s === pref ? 0 : 1) || (p.r[1] - p.r[0]) - (q.r[1] - q.r[0]));
        return ok[0];
      };
      // Shrink units, the last first (the first unit of a group matters most), until it fits.
      let at = best();
      for (let k = us.length - 1; !at && k >= 0; ) {
        if (pick[k] < us[k].ws.length - 1) { pick[k]++; at = best(); } else k--;
      }
      if (!at) continue;
      let x = at.r[0];
      us.forEach((u, k) => {
        const w = u.ws[pick[k]], f = u.place(at.s, x, w);
        if (f) fronts.push(...f);
        x += w + GAP;
      });
      // What is left of the stretch stays for later groups.
      runs[at.s][at.k] = [x, at.r[1]];
      placed = true;
    }
  }
  // Then whatever room is left: benches.
  for (let n = 0; n < 2; n++) ([1, -1] as const).some((s) => fit(i, 1.8, 1, (x) => wallBench(i, s, x)));
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

/**
 * Service elements on the stretches of spine wall that are wall but not floor a shop could take
 * (beside a stairwell's closed end, where `free()` keeps its landing): staff doors in timber-brown
 * paint, closed shutters of the street's shops, a hose cabinet and meter cupboards. Flat (0.12
 * proud), so checked by hand rather than by `free()`; the wall strip is claimed. Runs after the
 * shops and skips their fronts (`mine`), so anything else still taken is the kit's.
 */
function services(i: ConcInfo, mine: Front[]) {
  const D = { color: 'paint:#6b5848', frame: 'wood:#3b2a1e', check: false };
  let n = 0, hose = 0;
  for (const s of [-1, 1] as const) {
    const [sa, sb] = band(i, s, 0, 0.15);
    const gaps: Span[] = [
      ...mine.filter((f) => f.s === s).map((f): Span => [f.x0 - 0.2, f.x1 + 0.2]),
      ...wallGaps(i, s).map(([p, q]): Span => [p - 0.3, q + 0.3]),
      ...i.ends.map((e): Span => [e.g - 3.9, e.g + 3.9]),
      ...i.pillars.filter(([, z]) => Math.abs(z - s * i.cw) < 1.2).map(([x]): Span => [x - 0.6, x + 0.6]),
      ...(s < 0 ? [[i.toilets - 1.8, i.toilets + 1.8] as Span] : []),
    ];
    // Wall strip cells that are taken (a stair's landing, a band), merged.
    const runs: Span[] = [];
    for (const [a, c] of cut([i.paid[0], i.paid[1]], gaps)) {
      for (let x = a; x + 0.25 <= c + 1e-6; x += 0.25) {
        if (i.free(x, sa, x + 0.25, sb)) continue;
        const last = runs[runs.length - 1];
        if (last && Math.abs(last[1] - x) < 1e-6) last[1] = x + 0.25;
        else runs.push([x, x + 0.25]);
      }
    }
    for (const [a, c] of runs) {
      let u = a + 0.1;
      while (c - u >= 0.8) {
        const room = c - u - 0.1;
        let w = 0;
        const pick = (n + (hose ? 0 : 1)) % 4;
        if (!hose && room >= 0.75 && hoseCabinet(i, s, u, { check: false })) { w = 0.75; hose++; }
        else if (pick === 0 && room >= 2.4) { w = Math.min(room, 3.0); shutter(i, s, u, u + w, { check: false, lease: n % 2 === 0, body: 'flat:#e6dfcc' }); }
        else if (pick === 2 && room >= 0.9) { w = 0.9; meterCupboard(i, s, u, { check: false }); }
        else if (pick === 3 && room >= 1.0) { w = 1.0; ventGrille(i, s, u, { check: false, h: 0.6 }); }
        else if (room >= 1.16) { w = 1.16; serviceDoor(i, s, u, { ...D, label: STAFF_ROOMS[(n + i.station.id.length) % STAFF_ROOMS.length] }); }
        else if (room >= 0.9) { w = 0.9; meterCupboard(i, s, u, { check: false }); }
        else break;
        i.claim(u, sa, u + w, sb);
        n++;
        u += w + 0.15;
      }
    }
  }
}

/**
 * The spine stairwells' outer walls: the indigo dado; kōshi and dyed lengths on a rail along the
 * long faces; on each closed end an indigo hanging with the crest, like a shop's curtain.
 */
function dressWells(i: ConcInfo) {
  const { b, cf } = i;
  let k = 0;
  for (const w of i.stairwells) {
    if (w.room >= 0) continue;
    for (const f of stairwellFaces(i, w)) {
      faceDado(i, f, { mat: TILE, top: 1.1, cap: TIMBER, skirting: 'flat:#2a2522' });
      if (f.end) {
        const um = (f.u0 + f.u1) / 2, hw = Math.min(0.9, (f.u1 - f.u0) / 2 - 0.3);
        if (hw < 0.4) continue;
        run(b, TIMBER, f.axis, f.at, um - hw - 0.08, um + hw + 0.08, cf + 2.5, cf + 2.56, ...off(f.n, 0, 0.06));
        run(b, `flat:${INDIGO}`, f.axis, f.at, um - hw, um + hw, cf + 1.25, cf + 2.5, ...off(f.n, 0.02, 0.03));
        crest(b, f.axis, f.at, um, cf + 1.95, 0.32, ...off(f.n, 0.03, 0.036));
        continue;
      }
      // Along the stair: lattice and cloth by turns, 2.4 m panels centred on the face.
      const n = Math.floor((f.u1 - f.u0 - 0.2) / 2.5);
      const u0 = (f.u0 + f.u1) / 2 - (n * 2.5) / 2;
      for (let p = 0; p < n; p++, k++) {
        const a = u0 + p * 2.5 + 0.05, c = a + 2.4;
        if (k % 2) {
          run(b, TIMBER, f.axis, f.at, a + 0.05, c - 0.05, cf + 2.3, cf + 2.36, ...off(f.n, 0, 0.05));
          clothRow(b, f.axis, f.at, a + 0.15, c - 0.1, cf + 2.3, cf + 1.0, 300 + k * 3, f.n, 0.1, 0.25);
        } else lattice(b, f.axis, f.at, f.n, a + 0.03, c - 0.03, cf + 1.15, cf + 2.36, 0.3);
      }
    }
  }
}

/** Seigaiha: white wave scallops on an indigo band along the paid-area walls, broken by shops. */
function frieze(i: ConcInfo, fronts: Front[]) {
  const { cf } = i, tx = toiletX(i);
  for (const s of [-1, 1] as const) {
    const gaps: Span[] = [...fronts.filter((f) => f.s === s).map((f): Span => [f.x0 - 0.05, f.x1 + 0.05]), ...wallGaps(i, s)];
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
  const top = i.cf + i.clear, tx = toiletX(i), ko = keepOut(i);
  // Timber beams on the 4 m grid, stopping short of the shop fascias and landing on the
  // stairwell walls (and stopping short of the portals) where they meet one.
  for (let x = i.x0 + 4; x < i.x1 - 0.5; x += 4) {
    if (x < i.paid[0] || x > i.paid[1] || nearGate(i, x, 4.5) || Math.abs(x - tx) < 1.5) continue;
    const end = (s: Wall) => {
      const f = fronts.find((q) => q.s === s && x > q.x0 - 0.3 && x < q.x1 + 0.3);
      return s * (i.cw - (f ? f.d + 0.05 : 0));
    };
    for (const [p, q] of cut([end(-1), end(1)], alongZ(ko, x, 0.15))) beam(i, x, 0.3, { mat: TIMBER, w: 0.3, z0: p, z1: q });
  }
  // Old pipes along both walls, ducking into the ceiling over shops, stairwells and mouths.
  const a = i.paid[0] + 3.4, c = i.paid[1] - 3.4;
  for (const s of [-1, 1] as const) {
    const gaps: Span[] = [
      ...fronts.filter((f) => f.s === s).map((f): Span => [f.x0 - 0.15, f.x1 + 0.15]),
      ...alongX(ko, s * (i.cw - 0.55), 0.2).map(([p, q]): Span => [p - 0.1, q + 0.1]),
      ...i.openings.filter((o) => o.s === s).map((o): Span => [o.x0 - 0.3, o.x1 + 0.3]),
    ];
    pipeRun(i, 'x', s * (i.cw - 0.55), a, c, top, {
      n: 2, gaps, mats: s > 0 ? ['paint:#8c949b', 'paint:#7a5a3a'] : ['paint:#b8b2a3', 'paint:#a33b2f'],
    });
  }
}

// ── The cloth ────────────────────────────────────────────────────────────────────────────────

/**
 * The dye yard (干し場): long lengths drying on three poles inside a timber kerb, set against a
 * spine wall (X0 … X1 on wall s; `shops` packs it between the stairwells' closed ends). The
 * floor under it is claimed and solid, so the cloth may come down to a metre; 2.4 m is kept clear
 * to the pillar line. Returns its front (for the beams and pipes), or null if the floor is taken.
 */
function dyeYard(i: ConcInfo, s: Wall, X0: number, X1: number, k0: number): Front | null {
  const { b, cf } = i;
  const pz = Math.max(0, ...i.pillars.map(([, z]) => Math.abs(z)));
  const Z0 = Math.max(pz + 0.35 + 2.45, i.cw - 2.8), Z1 = i.cw - 0.05;
  if (Z1 - Z0 < 1.4 || !i.free(X0, s > 0 ? Z0 : -Z1, X1, s > 0 ? Z1 : -Z0)) return null;
  {
    const za = s > 0 ? Z0 : -Z1, zb = s > 0 ? Z1 : -Z0;
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
  return { s, x0: X0, x1: X1, d: Z1 + 0.05 - Z0 };
}

/**
 * A rank of shorter lengths on a pole across the spine, kept 2.32 m clear over the floor. The
 * pole stops at stairwell walls, short of the portals, and at `stop` (the dye yard).
 */
function rank(i: ConcInfo, x: number, k0: number, stop: Rect[]) {
  const { b, cf } = i, top = cf + i.clear, yP = top - 0.08, zl = i.cw - 1.8;
  let k = k0;
  for (const [p, q] of cut([-zl, zl], alongZ([...keepOut(i), ...stop], x, 0.05).map(([a, c]): Span => [a - 0.3, c + 0.3]))) {
    if (q - p < 1.5) continue;
    b.deco(TIMBER, x - 0.03, yP - 0.04, p, x + 0.03, yP, q);
    for (const z of [p + 0.2, q - 0.2]) b.deco('flat:#2b2d30', x - 0.01, yP, z - 0.01, x + 0.01, top, z + 0.01);
    let z = p + 0.15;
    while (true) {
      const w = 0.6 + 0.3 * hash(k, x);
      if (z + w > q - 0.1) break;
      // Not over pillars, shops or anything else in the floor plan: those stay in view.
      if (i.free(x - 0.25, z, x + 0.25, z + w)) cloth(b, 'z', x, z + w / 2, w, yP - 0.04, cf + 2.32 + 0.1 * hash(k, 2.9), k, 0);
      z += w + 0.5;
      k++;
    }
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
    const ko = keepOut(i);
    const near = (x: number, z: number, m: number) => ko.some((r) => x > r[0] - m && x < r[2] + m && z > r[1] - m && z < r[3] + m);
    // Opal globes in the paid area, midway between beams, between the cloth ranks.
    for (const x of mids(i, false)) {
      if (x < i.paid[0] || x > i.paid[1] || nearGate(i, x, 4.5)) continue;
      for (const z of rows) {
        if (near(x, z, 0.3)) continue;
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
        for (const z of rows) for (const [p, q] of cut([Math.min(xa, xb), Math.max(xa, xb)], alongX(ko, z, 0.1))) if (q - p > 1) batten(i, 'x', z, p, q, top);
      }
    }
    // (The stair heads are lit by their portals; the bays by the kit.)
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
    // The dado along both long walls, but not inside the stairwells that stand against them.
    for (const s of [-1, 1] as const) {
      const wells = alongX(i.stairwells.filter((w) => w.room < 0).map((w) => w.footprint), s * (i.cw - 0.05), 0.05);
      for (const [p, q] of cut([i.x0, i.x1], wells)) wallDado(i, s, { mat: TILE, top: 1.1, cap: TIMBER, skirting: 'flat:#2a2522', from: p, to: q });
    }
    dressWells(i);
    // The shop street (with the dye yard, the centrepiece) takes the free wall; service doors
    // and cupboards go on the wall whose floor the kit keeps.
    const fronts = shops(i);
    services(i, fronts);
    const yard = fronts.find((f) => f.d > 2);
    pillarBenches(i);
    const stop: Rect[] = yard ? [[yard.x0, yard.s > 0 ? i.cw - yard.d : -i.cw, yard.x1, yard.s > 0 ? i.cw : -i.cw + yard.d]] : [];
    mids(i, true).forEach((x, n) => {
      if (x > i.paid[0] && x < i.paid[1] && !nearGate(i, x, 4.5)) rank(i, x, 200 + n * 40, stop);
    });
    wallDressing(i);
    frieze(i, fronts);
    ceiling(i, fronts);
  },

  bay(r) {
    const { b, cf } = r, top = cf + r.clear;
    const wells = r.conc.stairwells.filter((w) => w.room === r.index);
    const holes = r.stairs.map((s) => s.rect);
    const app = wells.map(approach);
    const mouths = r.mouths.map((m): Rect => (m.axis === 'x' ? [m.u0, m.at - 0.9, m.u1, m.at + 0.9] : [m.at - 0.9, m.u0, m.at + 0.9, m.u1]));
    // The walls: indigo dado; kōshi and dyed lengths on the clear stretches (not beside the
    // stair opening, the portal or the floor in front of it).
    let k = r.index * 7;
    for (const f of r.faces) {
      const gaps = faceGaps(f, [...holes, ...app, ...mouths], wells);
      faceDado(r, f, { mat: TILE, top: 1.1, cap: TIMBER, skirting: 'flat:#2a2522', gaps });
      for (const [a, c] of cut([f.u0 + 0.15, f.u1 - 0.15], gaps.map(([p, q]): Span => [p - 0.1, q + 0.1]))) {
        if (c - a < 1.2) continue;
        if (k++ % 2) {
          run(b, TIMBER, f.axis, f.at, a + 0.05, c - 0.05, cf + 2.3, cf + 2.36, ...off(f.n, 0, 0.05));
          clothRow(b, f.axis, f.at, a + 0.15, c - 0.1, cf + 2.3, cf + 1.0, 500 + k * 5, f.n, 0.1, 0.25);
        } else lattice(b, f.axis, f.at, f.n, a + 0.03, c - 0.03, cf + 1.15, cf + 2.36, 0.3);
      }
    }
    if (r.kind !== 'transfer bay') return;
    // The noren gate with the crest, just inside the mouth from the spine (clear above 2.3 m,
    // short of the portal's approach), and a rank of lengths drying across the bay behind it.
    const R = r.rect;
    const clearOf = (x0: number, x1: number, z: number): Span[] =>
      cut([x0, x1], alongX([...app, ...holes, ...wells.map((w) => w.footprint)], z, 0.05).map(([p, q]): Span => [p - 0.2, q + 0.2])).filter(([p, q]) => q - p >= 1.5);
    for (const m of r.mouths) {
      if (m.to !== -1 || m.axis !== 'x') continue;
      const inward = m.at > (R[1] + R[3]) / 2 ? -1 : 1;
      const zn = m.at + inward * 0.6, zr = m.at + inward * Math.min(2.6, (R[3] - R[1]) * 0.65);
      for (const [p, q] of clearOf(m.u0 + 0.1, m.u1 - 0.1, zn)) {
        noren(r, 'x', zn, p, q, top - 0.03, { color: INDIGO, h: 0.62 });
        crest(b, 'x', zn, (p + q) / 2, top - 0.07 - 0.31, 0.2, -0.017, 0.017);
      }
      for (const [p, q] of clearOf(R[0] + 0.2, R[2] - 0.2, zr)) {
        b.deco(TIMBER, p, top - 0.12, zr - 0.03, q, top - 0.08, zr + 0.03);
        for (const x of [p + 0.2, q - 0.2]) b.deco('flat:#2b2d30', x - 0.01, top - 0.08, zr - 0.01, x + 0.01, top, zr + 0.01);
        clothRow(b, 'x', zr, p + 0.15, q - 0.15, top - 0.12, cf + 2.32, 600 + r.index * 20, 0, 0.35, 0.1);
      }
    }
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

  platform(h) {
    // Short lengths drying on poles across each platform, up under the ceiling over the signs.
    const { b, pf } = h;
    for (let x = -h.P + 7, k = 0; x < h.P - 5; x += 9, k++) {
      if (h.blocked(x - 1.2, x + 1.2, 0.5)) continue;
      const top = h.ceilAt(x);
      if (top - pf < 3.9) continue;
      for (const s of h.island ? [0] : [-1, 1]) {
        const [za, zb] = h.island ? [-h.pe + 0.9, h.pe - 0.9] : s > 0 ? [h.pe + 0.9, h.wallZ - 0.3] : [-h.wallZ + 0.3, -h.pe - 0.9];
        b.deco(TIMBER, x - 0.03, top - 0.16, za, x + 0.03, top - 0.12, zb);
        for (const z of [za + 0.15, zb - 0.15]) b.deco('flat:#2b2d30', x - 0.01, top - 0.12, z - 0.01, x + 0.01, top, z + 0.01);
        clothRow(b, 'z', x, za + 0.1, zb - 0.1, top - 0.16, pf + 3.15, 800 + k * 12 + (s > 0 ? 6 : 0), 0, 0.3, 0.25);
      }
    }
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
