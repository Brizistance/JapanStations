// Station look: Kurayashiki (蔵屋敷, S-12). Inside a kura.
//
// The riverside storehouse quarter as a 2004 designer saw it: white plaster walls over a namako
// dado (dark square tiles, raised white joints), a dark slate floor, and a storehouse's
// post-and-beam frame of dark timber across the concourse, lit low and warm by square andon
// lamps. The centrepiece is a full kura front on one long wall, now a café and gallery: namako
// base, white plaster, a black stepped door frame with its heavy doors folded open, barred
// windows, and a short tiled eave under the ceiling. A sake and soy-sauce merchant, a craft
// shop and a hand-cart of rice bales carry the theme; the exits come up in little kura
// gatehouses.

import type { Builder } from '../../world/builder';
import {
  band, cut, doorways, lightPanel, noren, passageWalls, placeAlong, shopFront, stairwellFaces, toiletX, vendingRow, wbox,
  type Axis, type Brand, type Span, type Wall,
} from './parts';
import type { ConcInfo, ExitInfo, StationLook } from './types';

// ── Palette ──────────────────────────────────────────────────────────────────────────────────

const PLASTER = 'flat:#f2efe7';
const PLASTER2 = 'flat:#e3ded3'; // a shade darker, so stepped plaster reads
const CHAR = 'flat:#3a3d42';
const BLACK = 'flat:#1e1f22';
const NAMAKO = 'flat:#33363b';
const JOINT = 'flat:#f3f1eb';
const TIMBER = 'wood:#3b2c22';
const TIMBER2 = 'wood:#5a4332';
const STONE = 'flat:#8d8a84';
const IRON = 'metal:#3a3c40';
const ANDON = 'glow:#ffe3b0';
const WARM = 'glow:#f3d29a';
const SKIRT = 'flat:#4b4d50';
const CORD = 'flat:#2b2d30';

/** Beam underside above the floor. */
const BEAM = 2.55;

// Invented names (record in docs/worldbuilding.md).
const CAFE: Brand = { ja: '蔵カフェ 白壁', en: 'Kura Café Shirakabe', bg: '#2b231d', fg: '#efe3c8', kind: 'cafe' };
const SAKE: Brand = { ja: '酒・醤油 かわくら屋', en: 'Kawakuraya Sake & Shōyu', bg: '#2a211b', fg: '#efe3c8', kind: 'goods' };
const CRAFT: Brand = { ja: '工芸 しろつち', en: 'Kōgei Shirotsuchi', bg: '#e9e1d0', fg: '#3a2d22', kind: 'goods' };

// ── Helpers ──────────────────────────────────────────────────────────────────────────────────

/** A box along a run: `along` from p to q, across from at + c0 to at + c1 (either order). */
function ab(b: Builder, mat: string, axis: Axis, at: number, p: number, q: number, y0: number, y1: number, c0: number, c1: number) {
  if (axis === 'x') b.deco(mat, p, y0, at + c0, q, y1, at + c1);
  else b.deco(mat, at + c0, y0, p, at + c1, y1, q);
}

/**
 * Namako wall on a wall plane at `at` (facing f = ±1 across the run), from `from` to `to`
 * along the run and y0 … y1: dark tiles in a square grid with raised white joints (the straight
 * imo-meji bond; diagonal joints would cost hundreds of parts).
 */
function namako(b: Builder, axis: Axis, at: number, f: number, from: number, to: number, y0: number, y1: number, tile = 0.45) {
  if (to - from < 0.3) return;
  ab(b, NAMAKO, axis, at, from, to, y0, y1, 0, f * 0.012);
  const rows = Math.max(1, Math.round((y1 - y0) / tile)), ty = (y1 - y0) / rows;
  for (let j = 0; j <= rows; j++) {
    const y = y0 + j * ty;
    ab(b, JOINT, axis, at, from, to, Math.max(y0, y - 0.022), Math.min(y1, y + 0.022), f * 0.012, f * 0.032);
  }
  const cols = Math.max(1, Math.round((to - from) / tile)), tx = (to - from) / cols;
  for (let k = 0; k <= cols; k++) {
    const x = from + k * tx;
    ab(b, JOINT, axis, at, Math.max(from, x - 0.022), Math.min(to, x + 0.022), y0, y1, f * 0.012, f * 0.034);
  }
}

/** Namako dado (skirting, tiles, a plaster coping) on a run, skipping pieces under 0.4 m. */
function namakoDado(b: Builder, axis: Axis, at: number, f: number, runs: Span[], y: number, skirting = true) {
  for (const [p, q] of runs) {
    if (q - p < 0.4) continue;
    if (skirting) ab(b, SKIRT, axis, at, p, q, y, y + 0.13, 0, f * 0.018);
    namako(b, axis, at, f, p, q, y + 0.13, y + 1.03);
    ab(b, PLASTER, axis, at, p, q, y + 1.03, y + 1.09, 0, f * 0.04);
  }
}

/** Square paper andon hanging with its bottom at y: timber caps and band round a glowing box. */
function andon(b: Builder, x: number, y: number, z: number, top: number) {
  b.deco(TIMBER, x - 0.2, y, z - 0.2, x + 0.2, y + 0.04, z + 0.2);
  b.deco(ANDON, x - 0.17, y + 0.04, z - 0.17, x + 0.17, y + 0.42, z + 0.17);
  b.deco(TIMBER, x - 0.185, y + 0.22, z - 0.185, x + 0.185, y + 0.25, z + 0.185);
  b.deco(TIMBER, x - 0.2, y + 0.42, z - 0.2, x + 0.2, y + 0.46, z + 0.2);
  b.deco(CORD, x - 0.01, y + 0.46, z - 0.01, x + 0.01, top, z + 0.01);
}

const wi = (s: Wall) => (s > 0 ? 1 : 0);
const hit = (spans: Span[], a: number, c: number) => spans.some(([p, q]) => c > p && a < q);
const nearGate = (i: ConcInfo, x: number, m: number) => i.ends.some((e) => Math.abs(x - e.g) < m);

/** x of the 4 m timber frame; andons hang midway between. */
function grid(i: ConcInfo): number[] {
  const xs: number[] = [];
  for (let x = i.x0 + 4; x < i.x1 - 0.5; x += 4) xs.push(x);
  return xs;
}

/**
 * Wall stretches already spoken for, per long wall ([−z, +z]). W: where the frame may not meet
 * the wall up high (signs, offices, fascias). D: where the dado stops (machines, doors, shops).
 */
function kitSpans(i: ConcInfo): { W: Span[][]; D: Span[][] } {
  const W: Span[][] = [[], []], D: Span[][] = [[], []];
  for (const d of doorways(i)) for (const k of [0, 1]) { W[k].push([d[0] - 0.3, d[1] + 0.3]); D[k].push(d); }
  const tx = toiletX(i);
  W[0].push([tx - 1.1, tx + 1.1]);
  D[0].push([tx - 1.1, tx + 1.1]);
  for (const e of i.ends) {
    const U = (a: number, c: number): Span => (e.hi ? [e.g + a, e.g + c] : [e.g - c, e.g - a]);
    W[0].push(U(3.0, 8.3)); // fare board over the ticket machines
    D[0].push(U(2.7, 8.55)); // the machines themselves
    D[1].push(U(3.1, 8.1)); // lockers and drinks machine
    W[1].push(U(-3.2, 3.2)); // station office
    D[1].push(U(-3.05, 3.05));
  }
  return { W, D };
}

// ── The kura front (centrepiece) ─────────────────────────────────────────────────────────────

/** A converted storehouse front on long wall `s`, F0 … F1 (at least 9.8 m), 0.55 m deep. */
function kuraFront(i: ConcInfo, s: Wall, F0: number, F1: number) {
  const { b, cf } = i;
  const Fc = (F0 + F1) / 2, D = 0.55, nrm: [number, number] = [0, -s];
  const zAt = (d: number) => s * (i.cw - d);
  const w = (mat: string, x0: number, x1: number, y0: number, y1: number, d0: number, d1: number) => wbox(i, s, mat, x0, x1, cf + y0, cf + y1, d0, d1);

  // Solid: the body, and the door with its folded-open leaves.
  const [za, zb] = band(i, s, 0, D), [zc, zd] = band(i, s, 0, 0.92);
  b.block(F0, cf, za, F1, cf + 2.42, zb);
  b.block(Fc - 2.3, cf, zc, Fc + 2.3, cf + 2.3, zd);

  // Plaster body, the doorway recessed into it, a lit café inside.
  w(PLASTER, F0, Fc - 0.85, 0, 2.42, 0, D);
  w(PLASTER, Fc + 0.85, F1, 0, 2.42, 0, D);
  w(PLASTER, Fc - 0.85, Fc + 0.85, 2.05, 2.42, 0, D);
  w('wood:#6b4f38', Fc - 0.85, Fc + 0.85, 0, 2.05, 0, 0.2);
  w(WARM, Fc - 0.5, Fc + 0.5, 1.15, 1.9, 0.2, 0.21);
  // Modern glazed door set back in the opening.
  w('glassTint', Fc - 0.78, Fc + 0.78, 0, 1.98, 0.3, 0.31);
  w(TIMBER2, Fc - 0.85, Fc - 0.78, 0, 2.05, 0.27, 0.34);
  w(TIMBER2, Fc + 0.78, Fc + 0.85, 0, 2.05, 0.27, 0.34);
  w(TIMBER2, Fc - 0.78, Fc + 0.78, 1.98, 2.05, 0.27, 0.34);
  w(TIMBER2, Fc - 0.025, Fc + 0.025, 0, 1.98, 0.28, 0.33);
  noren(i, 'x', zAt(0.66), Fc - 0.8, Fc + 0.8, cf + 1.98, { color: '#26324f', text: '白壁', fg: '#f4f1e6', face: -s as Wall });

  // Black door frame in two steps.
  w(BLACK, Fc - 1.05, Fc - 0.85, 0, 2.25, D, 0.8);
  w(BLACK, Fc + 0.85, Fc + 1.05, 0, 2.25, D, 0.8);
  w(BLACK, Fc - 1.05, Fc + 1.05, 2.05, 2.25, D, 0.8);
  w('flat:#2c2e32', Fc - 1.25, Fc - 1.05, 0, 2.38, D, 0.68);
  w('flat:#2c2e32', Fc + 1.05, Fc + 1.25, 0, 2.38, D, 0.68);
  w('flat:#2c2e32', Fc - 1.25, Fc + 1.25, 2.25, 2.38, D, 0.68);
  // The heavy doors, folded back against the front: stepped panels, strap hinges, a ring pull.
  for (const k of [-1, 1]) {
    const xa = Math.min(Fc + k * 1.3, Fc + k * 2.2), xb = Math.max(Fc + k * 1.3, Fc + k * 2.2);
    w(BLACK, xa, xb, 0.03, 2.25, D, 0.72);
    w('flat:#2a2c30', xa + 0.1, xb - 0.1, 0.15, 2.13, 0.72, 0.76);
    w(BLACK, xa + 0.2, xb - 0.2, 0.3, 1.98, 0.76, 0.79);
    const h0 = Math.min(Fc + k * 1.3, Fc + k * 1.75), h1 = Math.max(Fc + k * 1.3, Fc + k * 1.75);
    for (const y of [0.42, 1.78]) w(IRON, h0, h1, y, y + 0.08, 0.72, 0.8);
    w(IRON, Fc + k * 2.05 - 0.04, Fc + k * 2.05 + 0.04, 1.0, 1.14, 0.72, 0.8);
  }

  // Namako base up to 1.2 m (behind the folded doors there is nothing to see), stone plinth,
  // plaster coping, charcoal on the short ends.
  w(STONE, F0 - 0.05, F1 + 0.05, 0, 0.1, 0, D + 0.05);
  for (const [p, q] of [[F0, Fc - 2.2], [Fc + 2.2, F1]]) namako(b, 'x', zAt(D), -s, p, q, cf + 0.1, cf + 1.2, 0.367);
  w(PLASTER, F0, Fc - 1.25, 1.2, 1.26, 0, D + 0.045);
  w(PLASTER, Fc + 1.25, F1, 1.2, 1.26, 0, D + 0.045);
  w(CHAR, F0 - 0.012, F0, 0, 1.2, 0, D);
  w(CHAR, F1, F1 + 0.012, 0, 1.2, 0, D);

  // Two small barred windows with stepped white surrounds and their shutters open.
  for (const k of [-1, 1]) {
    const wx = Fc + k * 3.8, c = 1.85;
    const sq = (mat: string, h: number, d0: number, d1: number) => w(mat, wx - h, wx + h, c - h, c + h, d0, d1);
    sq(PLASTER2, 0.5, D, D + 0.05);
    sq(PLASTER, 0.42, D + 0.05, D + 0.1);
    sq(PLASTER2, 0.34, D + 0.1, D + 0.15);
    sq(WARM, 0.27, D + 0.15, D + 0.155);
    for (const o of [-0.18, -0.06, 0.06, 0.18]) w(IRON, wx + o - 0.017, wx + o + 0.017, c - 0.27, c + 0.27, D + 0.155, D + 0.18);
    for (const m of [-1, 1]) {
      w(PLASTER, Math.min(wx + m * 0.52, wx + m * 0.9), Math.max(wx + m * 0.52, wx + m * 0.9), c - 0.45, c + 0.45, D, D + 0.12);
      w(PLASTER2, Math.min(wx + m * 0.58, wx + m * 0.84), Math.max(wx + m * 0.58, wx + m * 0.84), c - 0.38, c + 0.38, D + 0.12, D + 0.15);
    }
  }

  // Signboards: two upright boards beside the door, a hanging one under the eave.
  for (const [k, ja] of [[1, '珈琲・甘味'], [-1, '蔵ギャラリー']] as const) {
    const kx = Fc + k * 2.55;
    w(TIMBER, kx - 0.22, kx + 0.22, 0.9, 2.28, D + 0.035, D + 0.075);
    b.sign({ k: 'shop', ja, bg: CAFE.bg, fg: CAFE.fg, vertical: true }, kx, cf + 1.59, zAt(D + 0.08), nrm, 0.38, 1.3);
  }
  w(TIMBER, Fc - 0.95, Fc + 0.95, 2.25, 2.58, 1.0, 1.04);
  for (const k of [-1, 1]) w(IRON, Fc + k * 0.8 - 0.01, Fc + k * 0.8 + 0.01, 2.58, 2.64, 1.01, 1.03);
  b.sign({ k: 'shop', ja: CAFE.ja, en: CAFE.en, bg: CAFE.bg, fg: CAFE.fg }, Fc, cf + 2.415, zAt(1.045), nrm, 1.8, 0.29);

  // Stepped plaster cornice, then a short tiled eave and the roof up to the ceiling.
  w(PLASTER, F0 - 0.04, F1 + 0.04, 2.42, 2.5, 0, 0.65);
  w(PLASTER2, F0 - 0.08, F1 + 0.08, 2.5, 2.58, 0, 0.78);
  w(PLASTER, F0 - 0.12, F1 + 0.12, 2.58, 2.64, 0, 0.9);
  w('roof', F0 - 0.3, F1 + 0.3, 2.64, 2.76, 0, 1.15);
  w(CHAR, F0 - 0.3, F1 + 0.3, 2.6, 2.66, 1.1, 1.18);
  for (let x = F0 - 0.15; x <= F1 + 0.15; x += 0.35) w('flat:#2b2e32', x - 0.08, x + 0.08, 2.585, 2.675, 1.18, 1.21);
  w('roof', F0 - 0.2, F1 + 0.2, 2.76, 2.88, 0, 0.95);
  w(CHAR, F0 - 0.1, F1 + 0.1, 2.88, i.clear, 0, 0.6);
}

/** The kura front, as near the middle of the paid area as it fits (a long wall, ideally +z). */
function placeFront(i: ConcInfo, W: Span[][], D: Span[][]): boolean {
  const mid = (i.paid[0] + i.paid[1]) / 2;
  for (const L of [11, 10]) {
    for (const s of [1, -1] as Wall[]) {
      const [za, zb] = band(i, s, 0, 2.0);
      for (let k = 0; k < 60; k++) {
        const Fc = mid + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.5;
        const F0 = Fc - L / 2, F1 = Fc + L / 2;
        if (!i.free(F0 - 0.4, za, F1 + 0.4, zb)) continue;
        i.claim(F0 - 0.4, za, F1 + 0.4, zb);
        kuraFront(i, s, F0, F1);
        W[wi(s)].push([F0 - 0.45, F1 + 0.45]);
        D[wi(s)].push([F0 - 0.05, F1 + 0.05]);
        return true;
      }
    }
  }
  return false;
}

// ── Shops and clutter ────────────────────────────────────────────────────────────────────────

/** Komodaru: a straw-wrapped sake barrel 0.55 across, standing at (x, y, z), label towards −s. */
function komodaru(i: ConcInfo, x: number, y: number, z: number, s: Wall, k: number) {
  const { b } = i;
  b.mesh('flat:#e4d9b8', 'cyl', x, y + 0.275, z, 0.55, 0.55, 0.55);
  for (const h of [0.1, 0.45]) b.mesh('flat:#5a3d2a', 'cyl', x, y + h, z, 0.565, 0.05, 0.565);
  b.mesh('wood:#9a7650', 'cyl', x, y + 0.556, z, 0.46, 0.012, 0.46);
  b.sign({ k: 'shop', ja: k % 2 ? '湊誉' : '川湊', bg: '#f4efe2', fg: '#8a1c1c', vertical: true }, x, y + 0.29, z - s * 0.285, [0, -s], 0.2, 0.26);
}

/** Sake and soy-sauce merchant: a stack of sake barrels under a cedar ball, then the counter. 5.4 long. */
function sakeShop(i: ConcInfo, s: Wall, x0: number): boolean {
  const w = 5.4, [za, zb] = band(i, s, 0, 2.6);
  if (!i.free(x0, za, x0 + w, zb)) return false;
  if (!shopFront(i, {
    s, x0: x0 + 1.3, x1: x0 + w, brand: SAKE, depth: 1.4, front: 'counter', body: TIMBER,
    goods: ['#2f4a3a', '#6b3a1f', '#e8e2d0', '#1d1e20', '#9a7650'],
    noren: { color: '#26324f', text: '酒', fg: '#f4f1e6' },
  })) return false;
  const { b, cf } = i;
  const [ca, cb] = band(i, s, 0, 1.5), [ba, bb] = band(i, s, 0, 1.25);
  i.claim(x0, ca, x0 + 1.3, cb);
  b.block(x0 + 0.05, cf, ba, x0 + 1.25, cf + 1.15, bb);
  const zd = (d: number) => s * (i.cw - d);
  ([[0.35, 0.33, 0], [0.95, 0.33, 0], [0.65, 0.93, 0], [0.65, 0.33, 0.565]] as const).forEach(([dx, d, y], k) => komodaru(i, x0 + dx, cf + y, zd(d), s, k));
  // Sugidama (cedar ball) on a bracket from the wall, over the barrels.
  const sx = x0 + 0.65;
  wbox(i, s, TIMBER, sx - 0.04, sx + 0.04, cf + 2.74, cf + 2.8, 0, 0.97);
  wbox(i, s, CORD, sx - 0.008, sx + 0.008, cf + 2.68, cf + 2.74, 0.922, 0.938);
  b.mesh('flat:#7a5a36', 'sphere', sx, cf + 2.46, zd(0.93), 0.46, 0.46, 0.46);
  return true;
}

/** Craft shop: a glazed front with pottery and lacquer, 4.2 long. */
const craftShop = (i: ConcInfo, s: Wall, x0: number) => shopFront(i, {
  s, x0, x1: x0 + 4.2, brand: CRAFT, depth: 0.6, front: 'glazed', body: 'wood:#4a3828', door: x0 + 0.9,
  goods: ['#e8e2d0', '#8a5a3b', '#3a4a5a', '#b8a58a', '#5f6b4e'],
});

function shops(i: ConcInfo, W: Span[][], D: Span[][]) {
  const items: { w: number; high: boolean; at: (s: Wall, x: number) => boolean }[] = [
    { w: 5.4, high: true, at: (s, x) => sakeShop(i, s, x) },
    { w: 4.2, high: true, at: (s, x) => craftShop(i, s, x) },
    { w: 3.5, high: false, at: (s, x) => vendingRow(i, s, x, 2) },
  ];
  for (const it of items) {
    placeAlong(i, it.w, (s, x) => {
      if (!it.at(s, x)) return false;
      D[wi(s)].push([x - 0.05, x + it.w + 0.05]);
      if (it.high) W[wi(s)].push([x - 0.35, x + it.w + 0.35]);
      return true;
    });
  }
}

/** Wooden bench 1.8 long along x. Needs 0.9 m clear. */
function woodBench(i: ConcInfo, x: number, z: number): boolean {
  const hx = 0.9, hz = 0.22;
  if (!i.free(x - hx, z - hz, x + hx, z + hz, 0.9)) return false;
  i.claim(x - hx - 0.5, z - hz - 0.5, x + hx + 0.5, z + hz + 0.5);
  const { b, cf } = i;
  b.block(x - hx, cf, z - hz, x + hx, cf + 0.45, z + hz);
  b.deco(TIMBER2, x - hx, cf + 0.38, z - hz, x + hx, cf + 0.45, z + hz);
  for (const k of [-1, 1]) {
    const lx = x + k * (hx - 0.12);
    b.deco(TIMBER, lx - 0.07, cf, z - hz + 0.03, lx + 0.07, cf + 0.38, z + hz - 0.03);
  }
  return true;
}

/** Tawara (rice bale), standing upright on y. */
function tawara(b: Builder, x: number, y: number, z: number) {
  b.mesh('flat:#cdb57a', 'cyl', x, y + 0.31, z, 0.42, 0.62, 0.42);
  for (const h of [0.14, 0.48]) b.mesh('flat:#8f7746', 'cyl', x, y + h, z, 0.43, 0.035, 0.43);
  b.mesh('flat:#b89d62', 'cyl', x, y + 0.635, z, 0.3, 0.03, 0.3);
}

/** A daihachi hand-cart loaded with rice bales and crates, shafts towards +x. About 2.9 × 1.3. */
function handCart(i: ConcInfo, x: number, z: number): boolean {
  if (!i.free(x - 1.45, z - 0.7, x + 1.45, z + 0.7, 0.8)) return false;
  i.claim(x - 1.9, z - 1.2, x + 1.9, z + 1.2);
  const { b, cf } = i;
  b.block(x - 1.4, cf, z - 0.66, x + 1.42, cf + 1.25, z + 0.66);
  b.deco('wood:#8a6a48', x - 1.0, cf + 0.55, z - 0.5, x + 0.6, cf + 0.62, z + 0.5);
  // Two big wheels (octagons of three boxes), an axle and hubs.
  const xw = x - 0.2;
  for (const k of [-1, 1]) {
    const z0 = z + k * 0.53, z1 = z + k * 0.59;
    b.deco(TIMBER, xw - 0.45, cf + 0.26, z0, xw + 0.45, cf + 0.64, z1);
    b.deco(TIMBER, xw - 0.19, cf, z0, xw + 0.19, cf + 0.9, z1);
    b.deco(TIMBER, xw - 0.32, cf + 0.13, z0, xw + 0.32, cf + 0.77, z1);
    b.deco(IRON, xw - 0.06, cf + 0.39, z1, xw + 0.06, cf + 0.51, z + k * 0.63);
  }
  b.deco(IRON, xw - 0.03, cf + 0.42, z - 0.6, xw + 0.03, cf + 0.48, z + 0.6);
  // Shafts, crossbar and a prop.
  for (const k of [-1, 1]) b.deco(TIMBER2, x + 0.6, cf + 0.56, z + k * 0.36, x + 1.4, cf + 0.62, z + k * 0.42);
  b.deco(TIMBER2, x + 1.34, cf + 0.56, z - 0.42, x + 1.4, cf + 0.62, z + 0.42);
  b.deco(TIMBER2, x + 1.34, cf, z - 0.03, x + 1.4, cf + 0.56, z + 0.03);
  // Load: two upright rice bales and three crates.
  for (const k of [-1, 1]) tawara(b, x - 0.65, cf + 0.62, z + k * 0.23);
  b.deco('wood:#a07f56', x - 0.3, cf + 0.62, z - 0.45, x + 0.25, cf + 0.92, z - 0.02);
  b.deco('wood:#a07f56', x - 0.25, cf + 0.62, z + 0.03, x + 0.2, cf + 0.88, z + 0.43);
  b.deco('wood:#b8956a', x - 0.25, cf + 0.92, z - 0.4, x + 0.2, cf + 1.15, z - 0.07);
  return true;
}

// ── The timber frame ─────────────────────────────────────────────────────────────────────────

/** z-spans of the stairwell walls a beam at x (half width hw) would run into. */
function wellSpans(i: ConcInfo, x: number, hw: number): Span[] {
  const out: Span[] = [];
  for (const w of i.stairwells) {
    const ws = w.walls.filter((r) => x + hw > r[0] && x - hw < r[2]);
    if (ws.length) out.push([Math.min(...ws.map((r) => r[1])), Math.max(...ws.map((r) => r[3]))]);
  }
  return out;
}

/**
 * The stairwells' outer walls dressed as kura walls: a namako base, plaster above, a timber
 * plate under the ceiling, a timber pilaster under each beam end, framed posters between them.
 */
function dressWells(i: ConcInfo) {
  const { b, cf } = i, top = cf + i.clear;
  const beams = grid(i);
  let v = i.station.id.length + 3;
  for (const w of i.stairwells) {
    if (w.room >= 0) continue;
    for (const f of stairwellFaces(i, w)) {
      const { axis, at, n, u0, u1 } = f;
      namakoDado(b, axis, at, n, [[u0, u1]], cf);
      ab(b, TIMBER, axis, at, u0, u1, cf + 2.75, top, 0, n * 0.2);
      const bx = f.end ? [] : beams.filter((x) => x > u0 + 0.13 && x < u1 - 0.13);
      for (const x of bx) ab(b, TIMBER, axis, at, x - 0.12, x + 0.12, cf + 1.09, cf + BEAM, 0, n * 0.07);
      // Poster centres: midway between beams on a long face, in the middle of the closed end.
      const edges = [u0, ...bx, u1];
      const centres = f.end ? [(u0 + u1) / 2] : edges.slice(1).map((e, k) => (e + edges[k]) / 2).filter((c, k) => edges[k + 1] - edges[k] >= 2.2 && c > u0 + 0.6 && c < u1 - 0.6);
      for (const c of centres) {
        ab(b, TIMBER, axis, at, c - 0.5, c + 0.5, cf + 1.14, cf + 2.46, n * 0.008, n * 0.026);
        const [px, pz] = axis === 'x' ? [c, at + n * 0.032] : [at + n * 0.032, c];
        b.sign({ k: 'poster', v: v++ % 8 }, px, cf + 1.8, pz, axis === 'x' ? [0, n] : [n, 0], 0.9, 1.25);
      }
    }
  }
}

/**
 * Beams across the concourse every 4 m. Each end meets the wall (on a timber post if there is
 * floor for one, else on a corbel) or, where the wall is spoken for, rests on a pillar and
 * runs just past it, or on the long beam over the pillar line. A beam with nowhere to rest is
 * left out. Wall plates along the tops of the long walls tie it together.
 */
function frame(i: ConcInfo, W: Span[][]) {
  const { b, cf, cw } = i, top = cf + i.clear;
  // Long beams over the pillar lines, broken at the gate lines (their signs and screens).
  const gaps = i.ends.map((e): Span => [e.g - 2.6, e.g + 2.6]);
  const lines = [...new Set(i.pillars.map(([, pz]) => pz))].filter((z) => Math.abs(z) > 0.5);
  // ...and at every full-height wall block the kit built in the hall (the gate office).
  const blocks = i.b.out.boxes.filter((p) => p.solid && p.mat !== 'none' && p.min[1] <= cf + 0.05 && p.max[1] >= top - 0.05
    && p.min[2] < cw - 0.01 && p.max[2] > -cw + 0.01 && (p.max[0] - p.min[0] > 1 || p.max[2] - p.min[2] > 1));
  for (const z of lines) {
    const hit = blocks.filter((p) => p.min[2] < z + 0.15 && p.max[2] > z - 0.15).map((p): Span => [p.min[0] - 0.02, p.max[0] + 0.02]);
    for (const [p, q] of cut([i.x0, i.x1], [...gaps, ...hit])) b.deco(TIMBER, p, cf + 2.65, z - 0.15, q, top, z + 0.15);
  }
  for (const x of grid(i)) {
    if (nearGate(i, x, 2.4)) continue;
    const ends: number[] = [], wall: Wall[] = [];
    for (const s of [-1, 1] as Wall[]) {
      const p = i.pillars.find(([px, pz]) => Math.abs(px - x) < 0.01 && Math.sign(pz) === s);
      const line = hit(gaps, x - 0.2, x + 0.2) ? undefined : lines.find((z) => Math.sign(z) === s);
      if (!hit(W[wi(s)], x - 0.3, x + 0.3)) { ends.push(s * cw); wall.push(s); }
      else if (p) ends.push(p[1] + s * 0.55);
      else if (line !== undefined) ends.push(line + s * 0.25);
    }
    if (ends.length < 2) continue;
    // Across a stairwell the beam stops at its walls and rests on a corbel there, one each side.
    let hw = 0.16;
    for (const w of i.stairwells) for (const j of w.portal.jambs) if (x > j[2] && x - hw < j[2]) hw = Math.max(0.1, x - j[2] - 0.005);
    const gap = wellSpans(i, x, hw);
    for (const [p, q] of cut([Math.min(...ends), Math.max(...ends)], gap)) {
      if (q - p < 0.3) continue;
      b.deco(TIMBER, x - hw, cf + BEAM, p, x + hw, top, q);
      for (const [g0, g1] of gap) {
        if (Math.abs(q - g0) < 0.01) b.deco(TIMBER2, x - hw + 0.01, cf + 2.33, g0 - 0.45, x + hw - 0.01, cf + BEAM, g0);
        if (Math.abs(p - g1) < 0.01) b.deco(TIMBER2, x - hw + 0.01, cf + 2.33, g1, x + hw - 0.01, cf + BEAM, g1 + 0.45);
      }
    }
    for (const s of wall) {
      const [pa, pb] = band(i, s, 0, 0.35);
      if (i.free(x - 0.21, pa, x + 0.21, pb)) {
        i.claim(x - 0.21, pa, x + 0.21, pb);
        wbox(i, s, STONE, x - 0.21, x + 0.21, cf, cf + 0.1, 0, 0.33, true);
        wbox(i, s, TIMBER, x - 0.17, x + 0.17, cf + 0.1, cf + BEAM, 0, 0.28, true);
        wbox(i, s, TIMBER2, x - 0.14, x + 0.14, cf + 2.49, cf + BEAM, 0.28, 0.5);
        // A small andon on the post (within 0.6 m of the wall, so it may come down to 2.2).
        wbox(i, s, TIMBER, x - 0.13, x + 0.13, cf + 2.22, cf + 2.25, 0.28, 0.52);
        wbox(i, s, ANDON, x - 0.11, x + 0.11, cf + 2.25, cf + 2.45, 0.3, 0.5);
        wbox(i, s, TIMBER, x - 0.13, x + 0.13, cf + 2.45, cf + 2.48, 0.28, 0.52);
      } else wbox(i, s, TIMBER2, x - 0.14, x + 0.14, cf + 2.33, cf + BEAM, 0, 0.45);
    }
  }
  for (const s of [-1, 1] as Wall[]) {
    for (const [p, q] of cut([i.x0, i.x1], W[wi(s)])) wbox(i, s, TIMBER, p, q, cf + 2.75, top, 0, 0.2);
  }
}

// ── The look ─────────────────────────────────────────────────────────────────────────────────

const stairY = (e: ExitInfo, x: number) => e.cf + ((e.gy - e.cf) * Math.max(0, Math.min(e.run, x))) / e.run;

export const look: StationLook = {
  finishes: { wall: PLASTER, floor: 'floor:#5f5d5a', pillar: TIMBER, ceil: 'flat:#ece8de' },
  posters: false,
  skirting: false,

  lights(i) {
    const { b, cf, cw } = i, top = cf + i.clear;
    // Andons in two rows, midway between the beams, clear of the gate signs.
    for (let c = i.x0 + 2; c < i.x1 - 1; c += 4) {
      if (nearGate(i, c, 2.6)) continue;
      for (const z of [-0.32 * cw, 0.32 * cw]) andon(b, c, cf + 2.36, z, top);
    }
    // Plain white light where people need to see: either side of each gate line, over the stairs.
    for (const e of i.ends) for (const dx of [-3, 3]) for (const z of [-1.6, 1.6]) lightPanel(i, e.g + dx, z, top, 1.2, 0.5);
    // The stairwells are walled: their light panels go in the lanes beside them, and one panel
    // in front of each portal, flush with the ceiling, so the descent is lit.
    for (const w of i.stairwells) {
      const f = w.footprint;
      for (let c = i.x0 + 2; c < i.x1 - 1; c += 4) {
        if (nearGate(i, c, 2.6) || c < f[0] - 3.3 || c > f[2] + 3) continue;
        const inside = c > f[0] - 0.8 && c < f[2] + 0.8;
        if (inside) for (const s of [-1, 1]) lightPanel(i, c, s * (f[3] + 1.65), top, 1.6, 0.5);
        else lightPanel(i, c, (f[1] + f[3]) / 2, top, 1.6, 0.5);
      }
    }
  },

  pillar(i, x, z, y0, y1) {
    // A dark timber post on a stone, an iron shoe, brackets under the beams it carries.
    const { b } = i, h = 0.37;
    b.deco(STONE, x - 0.45, y0, z - 0.45, x + 0.45, y0 + 0.12, z + 0.45);
    b.deco(TIMBER, x - h, y0 + 0.12, z - h, x + h, y1, z + h);
    b.deco(IRON, x - h - 0.01, y0 + 0.12, z - h - 0.01, x + h + 0.01, y0 + 0.2, z + h + 0.01);
    b.deco(TIMBER2, x - 0.2, y0 + 2.42, z - 0.62, x + 0.2, y0 + BEAM, z + 0.62);
    b.deco(TIMBER2, x - 0.62, y0 + 2.5, z - 0.2, x + 0.62, y0 + 2.65, z + 0.2);
    // An andon on the face towards the middle of the paid area.
    const f = x < (i.paid[0] + i.paid[1]) / 2 ? 1 : -1, xf = x + f * h;
    b.deco(TIMBER, xf, y0 + 2.3, z - 0.14, xf + f * 0.26, y0 + 2.33, z + 0.14);
    b.deco(ANDON, xf + f * 0.02, y0 + 2.33, z - 0.12, xf + f * 0.24, y0 + 2.46, z + 0.12);
    b.deco(TIMBER, xf, y0 + 2.46, z - 0.14, xf + f * 0.26, y0 + 2.49, z + 0.14);
  },

  concourse(i) {
    const { b, cf, cw } = i;
    const { W, D } = kitSpans(i);
    placeFront(i, W, D);
    shops(i, W, D);
    frame(i, W);

    // Namako dado along both long walls wherever the wall is bare.
    for (const s of [-1, 1] as Wall[]) namakoDado(b, 'x', s * cw, -s, cut([i.x0, i.x1], D[wi(s)]), cf);

    // Posters in timber frames between the posts, above the dado.
    let v = i.station.id.length;
    for (const s of [-1, 1] as Wall[]) {
      for (let c = i.x0 + 2; c < i.x1 - 1; c += 4) {
        if (c < i.paid[0] + 3 || c > i.paid[1] - 1.5) continue;
        const [za, zb] = band(i, s, 0, 0.35);
        if (!i.free(c - 0.6, za, c + 0.6, zb)) continue;
        const [ca, cb] = band(i, s, 0, 0.05);
        i.claim(c - 0.6, ca, c + 0.6, cb);
        wbox(i, s, TIMBER, c - 0.5, c + 0.5, cf + 1.14, cf + 2.46, 0.008, 0.026);
        b.sign({ k: 'poster', v: v++ % 8 }, c, cf + 1.8, s * (cw - 0.032), [0, -s], 0.9, 1.25);
      }
    }

    // Wooden benches in the pillar lines, midway between pillars, in the paid area.
    const spots = i.pillars
      .filter(([x, z]) => i.pillars.some(([x2, z2]) => z2 === z && Math.abs(x2 - x - 8) < 0.01))
      .map(([x, z]): [number, number] => [x + 4, z])
      .filter(([x]) => x > i.paid[0] + 4 && x < i.paid[1] - 4);
    let n = 4;
    for (const [x, z] of spots) if (n > 0 && woodBench(i, x, z)) n--;

    // The hand-cart in the first unpaid hall, between the exits and the gates.
    // The floor guidance runs down the middle of the hall, so it stands to one side, on floor
    // `free()` allows, as near the middle of the hall as there is room.
    const e0 = i.ends[0];
    if (e0) {
      const xc = e0.g + (e0.hi ? 7.5 : -7.5);
      search: for (const dx of [0, 0.5, -0.5, 1, -1, 1.5, -1.5, 2, -2, 2.5, -2.5, 3, -3, 4, -4]) {
        for (const z of [2.6, -2.6, 3.2, -3.2, 3.8, -3.8, 4.4, -4.4, 5, -5, 5.6, -5.6, 6.4, -6.4]) {
          if (handCart(i, xc + dx, z)) break search;
        }
      }
    }
    dressWells(i);

    // A paid end wall: namako dado and a pair of big framed posters.
    const paidEnds = [...(i.ends.some((e) => !e.hi) ? [] : [i.x0]), ...(i.ends.some((e) => e.hi) ? [] : [i.x1])];
    for (const x of paidEnds) {
      const f = x <= i.x0 + 0.01 ? 1 : -1;
      namakoDado(b, 'z', x, f, [[-cw, cw]], cf);
      for (const z of [-cw / 2, cw / 2]) {
        const r: [number, number, number, number] = [Math.min(x, x + f * 0.35), z - 1.1, Math.max(x, x + f * 0.35), z + 1.1];
        if (!i.free(...r)) continue;
        i.claim(...r);
        b.deco(TIMBER, Math.min(x, x + f * 0.024), cf + 1.15, z - 0.96, Math.max(x, x + f * 0.024), cf + 2.45, z + 0.96);
        b.sign({ k: 'poster', v: Math.round(z) & 7 }, x + f * 0.03, cf + 1.8, z, [f, 0], 1.8, 1.2);
      }
    }
  },

  exit(e) {
    const { b, cf, ext, run } = e, L = ext + 4, top = cf + 2.7;
    // Namako dado on the corridor and lobby walls, round the kit's posters.
    const pc: Span[] = [];
    for (let z = 1.2; z + 0.8 <= ext; z += 2) pc.push([z - 0.7, z + 0.7]);
    namakoDado(b, 'z', -4, 1, cut([0, L], pc), cf, false);
    if (ext > 0) namakoDado(b, 'z', 0, -1, cut([0, ext], pc), cf, false);
    namakoDado(b, 'z', 0, -1, [[ext, ext + 0.9]], cf, false);
    namakoDado(b, 'x', L, -1, cut([-4, 0], [[-2.7, -1.3]]), cf, false);
    b.deco(SKIRT, -4, cf, ext, -3.982, cf + 0.13, L - 0.025);
    b.deco(SKIRT, -0.018, cf, ext, 0, cf + 0.13, ext + 0.9);
    // A dark band stepped up both stair walls, and a timber handrail on the far one.
    const n = Math.max(4, Math.round(run / 3));
    for (let k = 0; k < n; k++) {
      const xa = (run * k) / n, xb = (run * (k + 1)) / n, y0 = stairY(e, xa) - 0.05, y1 = stairY(e, xb) + 0.95;
      b.deco(NAMAKO, xa, y0, ext + 1.2, xb, y1, ext + 1.208);
      b.deco(NAMAKO, xa, y0, L - 0.008, xb, y1, L);
    }
    const m = Math.max(6, Math.round(run / 1.6));
    for (let k = 0; k < m; k++) {
      const xa = (run * k) / m, xb = (run * (k + 1)) / m, y = stairY(e, (xa + xb) / 2) + 0.85;
      b.deco(TIMBER2, xa, y, L - 0.1, xb, y + 0.06, L - 0.05);
    }
    for (let k = 1; k < 4; k++) {
      const x = (run * k) / 4, y = stairY(e, x) + 0.85;
      b.deco(IRON, x - 0.02, y - 0.05, L - 0.08, x + 0.02, y, L);
    }
    // Timber frame in the lobby: corner posts, a wall plate, two beams, a lintel at the corridor.
    b.deco(TIMBER, -4, cf, ext + 0.02, -3.76, top, ext + 0.24);
    b.deco(TIMBER, -4, cf, L - 0.22, -3.76, top, L);
    b.deco(TIMBER, -4, top - 0.2, ext, -3.8, top, L);
    for (const z of [ext + 1.4, ext + 2.8]) b.deco(TIMBER, -3.8, top - 0.2, z - 0.1, -0.3, top, z + 0.1);
    if (ext > 0) b.deco(TIMBER, -4, cf + 2.34, ext - 0.22, 0, cf + 2.5, ext);
    // A wall andon.
    const za = ext + 2.1;
    b.deco(TIMBER, -4, cf + 2.22, za - 0.13, -3.74, cf + 2.25, za + 0.13);
    b.deco(ANDON, -3.98, cf + 2.25, za - 0.11, -3.76, cf + 2.45, za + 0.11);
    b.deco(TIMBER, -4, cf + 2.45, za - 0.13, -3.74, cf + 2.48, za + 0.13);
  },

  canopy(e) {
    // A little kura gatehouse over the stair: timber posts on the parapets, white walls, a
    // stepped tiled gable roof, namako on the parapets by the street end.
    const { b, gy: G, ext, run } = e;
    const zA = ext + 1.05, zB = ext + 4.15, zc = ext + 2.6;
    for (const px of [0.12, run / 2, run - 0.12]) for (const pz of [zA, zB]) b.deco(TIMBER, px - 0.11, G + 1.0, pz - 0.11, px + 0.11, G + 2.52, pz + 0.11);
    for (const pz of [zA, zB]) {
      b.deco(PLASTER, 0.01, G + 1.0, pz - 0.05, run - 0.01, G + 2.52, pz + 0.05);
      b.deco(TIMBER, 0, G + 1.0, pz - 0.07, run, G + 1.08, pz + 0.07);
      b.deco(TIMBER, 0, G + 2.42, pz - 0.07, run, G + 2.52, pz + 0.07);
    }
    b.deco(PLASTER, -0.2, G + 1.0, zA, 0, G + 2.52, zB);
    // Roof: tiers of tile narrowing to a ridge, white stepped gables at both ends.
    [2.05, 1.65, 1.25, 0.85, 0.45].forEach((h, k) => {
      const y0 = G + 2.52 + k * 0.12;
      b.deco('roof', -0.6, y0, zc - h, run + 0.7, y0 + 0.12, zc + h);
      for (const [x0, x1] of [[run + 0.7, run + 0.73], [-0.63, -0.6]]) b.deco(PLASTER, x0, y0, zc - (h - 0.25), x1, y0 + 0.12, zc + (h - 0.25));
    });
    b.deco(CHAR, -0.7, G + 3.12, zc - 0.15, run + 0.8, G + 3.24, zc + 0.15);
    b.deco(CHAR, run + 0.73, G + 3.0, zc - 0.2, run + 0.86, G + 3.36, zc + 0.2);
    b.deco(CHAR, -0.76, G + 3.0, zc - 0.2, -0.63, G + 3.36, zc + 0.2);
    for (const k of [-1, 1]) b.deco(CHAR, -0.6, G + 2.47, zc + k * 2.02, run + 0.7, G + 2.57, zc + k * 2.1);
    // Board behind the entrance sign.
    b.deco(TIMBER, run - 0.04, G + 1.85, ext + 1.1, run + 0.05, G + 2.52, ext + 4.1);
    // A barred window in each side wall, facing the street.
    const wx = run * 0.28, wy = G + 1.75;
    for (const [pz, f] of [[zA - 0.05, -1], [zB + 0.05, 1]]) {
      b.deco(PLASTER2, wx - 0.4, wy - 0.4, pz, wx + 0.4, wy + 0.4, pz + f * 0.04);
      b.deco(PLASTER, wx - 0.32, wy - 0.32, pz, wx + 0.32, wy + 0.32, pz + f * 0.08);
      b.deco('flat:#1d1e20', wx - 0.24, wy - 0.24, pz, wx + 0.24, wy + 0.24, pz + f * 0.085);
      for (const o of [-0.12, 0, 0.12]) b.deco(IRON, wx + o - 0.015, wy - 0.24, pz + f * 0.085, wx + o + 0.015, wy + 0.24, pz + f * 0.105);
    }
    // Namako on the outer faces of the parapets, the last few metres before the street end.
    const n0 = Math.max(0.2, run - 2.7);
    for (const [at, f] of [[ext + 0.9, -1], [ext + 4.3, 1]]) {
      namako(b, 'x', at, f, n0, run, G + 0.08, G + 0.95);
      ab(b, PLASTER, 'x', at, n0, run, G + 0.95, G + 1.0, 0, f * 0.04);
    }
  },

  passage(p) {
    // (Kurayashiki has no transfer passage; this is here should it ever get one.)
    for (const w of passageWalls(p)) {
      namakoDado(p.b, 'x', w.z, w.f, w.runs, p.pf);
      for (const [a, c] of w.runs) if (c - a > 1) ab(p.b, TIMBER2, 'x', w.z, a + 0.15, c - 0.15, p.pf + 0.85, p.pf + 0.9, w.f * 0.05, w.f * 0.1);
    }
  },
};
