// Station look: Tōmyōbori (灯明堀), the lantern canal at dusk. See Plans/features/station-looks/plan.md
// and, for the re-fit to the spine layout, Plans/features/station-layouts/refit-brief.md.
//
// Dark timber, persimmon and hundreds of warm paper lanterns:
// - spine: dark boarded walls with a timber wainscot and persimmon rails, a dark ceiling on timber
//   beams, and the "canal of light" (the centrepiece) overhead: a dark glossy strip of water down
//   the middle of the ceiling between timber banks, glinting with lantern light, with a string of
//   lanterns along each bank. It runs in three stretches, between the gates and the stairwells and
//   between the two stairwells, and stops where a stairwell's walls rise to the ceiling.
// - Tōmyō-bashi: little persimmon bridges, now gateway frames across the spine (posts against the
//   long walls, a stepped arch above 2.4 m, the bridge's and the festival's name on the arch, big
//   lanterns at the bridge ends), one over each stretch of the canal; stone lanterns (tōrō) beside
//   them where the floor allows;
// - frontage: both long walls are a lantern-lit shopping street: the quarter's own shops (a lantern
//   maker, a tea house, a standing bar, wagashi, candles, eel, brushes, a sake bar, lantern
//   painters, tenugui, sweets, yuba) in counters with noren, lattice fronts and glazed fronts, a few
//   station brands and a vending pair, with a staff door, cupboard or grille between every
//   few shops and bare lantern-lit timber where nothing fits;
// - stairwells: the wainscot carried round their outer walls, box lanterns along them, the
//   festival's name on their closed ends;
// - pillars: dark timber posts with a persimmon band and a bracket lantern;
// - transfer bays: a foretaste of the lantern passage below (wainscot, a timber ceiling, lanterns);
// - transfer passages: a tunnel of lanterns;
// - exits: timber dado, lanterns along the corridor and up the stair, and a timber gateway with a
//   tiled roof at street level.

import type { StationDef } from '../../data/types';
import { LINES, linesAt } from '../../data/network';
import { SPECS } from '../specs';
import {
  cut, exitDado, faceDado, FASCIA, fbox, fnormal, fpt, hoseCabinet, lightPanel, meterCupboard, noren, passageWalls, posterRow, serviceDoor,
  shopFront, SHOPS, STAFF_ROOMS, stairwellFaces, vendingRow, ventGrille, wallBand, wallDado, wallFace, band,
  type Brand, type Span, type Wall,
} from './parts';
import type { Builder } from '../../world/builder';
import type { ConcInfo, ExitInfo, Rect, RoomInfo, StationLook, Stairwell, WallFace } from './types';

// ── Palette (kept small: each key is a material) ─────────────────────────────────────────────

const PERSIMMON = 'paint:#c4561c';
const TIMBER = 'wood:#3a281c';
const TIMBER_DK = 'wood:#2a1c14';
const WAINSCOT = 'wood:#2c1e15';
const SEAT = 'wood:#7a5634';
const IRON = 'flat:#1b1612';
const STONE = 'flat:#8a8478';
const STONE_DK = 'flat:#6f6a61';
const WATER = 'metal:#13263a';
const PAPER = 'flat:#efe6d2';
const ROOF = 'flat:#33373b';
// Lantern glows: the mural's amber, a deeper persimmon red, and a pale one for variety.
const AMBER = 'glow:#ffb05a';
const RED = 'glow:#e8643a';
const PALE = 'glow:#ffe2b0';
const glowOf = (k: number) => (k % 5 === 2 ? RED : k % 7 === 4 ? PALE : AMBER);

/** Invented names for this station (none real). */
const BRANDS = {
  hiyoriya: { ja: '提灯 ひより屋', en: 'Chōchin Hiyoriya', bg: '#efe3c8', fg: '#3a2416', kind: 'goods' },
  tomoshibi: { ja: '茶房 ともしび', en: 'Sabō Tomoshibi', bg: '#2f2a22', fg: '#f3e3c3', kind: 'cafe' },
  kawaberi: { ja: '立呑 かわべり', en: 'Tachinomi Kawaberi', bg: '#7a1f14', fg: '#fff3dc', kind: 'soba' },
  toshindo: { ja: '和ろうそく 灯芯堂', en: 'Warōsoku Tōshindō', bg: '#2a1d15', fg: '#ffd9a0', kind: 'goods' },
  suzuriya: { ja: '筆墨 すずり屋', en: 'Hitsuboku Suzuriya', bg: '#efe6d2', fg: '#1b1612', kind: 'books' },
  hotaru: { ja: '酒房 ほたる', en: 'Shubō Hotaru', bg: '#24324a', fg: '#f3e3c3', kind: 'cafe' },
  horibata: { ja: 'うなぎ 堀端', en: 'Unagi Horibata', bg: '#3a2416', fg: '#ffd9a0', kind: 'bento' },
  akari: { ja: '灯絵工房 あかり', en: 'Tōe Kōbō Akari', bg: '#c4561c', fg: '#fff3dc', kind: 'goods' },
  yunagi: { ja: '甘味処 ゆうなぎ', en: 'Kanmidokoro Yūnagi', bg: '#7a1f14', fg: '#fff3dc', kind: 'sweets' },
  kawazome: { ja: '手ぬぐい 川染', en: 'Tenugui Kawazome', bg: '#24324a', fg: '#efe6d2', kind: 'goods' },
  kawagiri: { ja: '湯葉 かわぎり', en: 'Yuba Kawagiri', bg: '#efe3c8', fg: '#3a2416', kind: 'bento' },
} satisfies Record<string, Brand>;
const BRIDGE = { text: '灯明橋', sub: 'Tōmyō-bashi' };
const FESTIVAL = { text: '灯明堀 万灯まつり', sub: 'Tōmyōbori Mantō Matsuri' };
const PLAQUE = { fg: '#ffd9a0', bg: '#2a1d15' };

// ── Lanterns ─────────────────────────────────────────────────────────────────────────────────

/**
 * Paper lantern whose body runs from y0 up `h`, hung from `hang` above (a dark cap that doubles
 * as the cord). Round: a sphere. Oblong: a short cylinder, with a dark bottom ring if `ring`.
 */
function chochin(b: Builder, x: number, y0: number, z: number, o: { d: number; h: number; hang: number; round?: boolean; mat?: string; ring?: boolean }) {
  const { d, h } = o, mat = o.mat ?? AMBER;
  if (o.round) b.mesh(mat, 'sphere', x, y0 + h / 2, z, d, h, d);
  else b.mesh(mat, 'cyl', x, y0 + h / 2, z, d, h * 0.9, d);
  const c0 = y0 + h - 0.04;
  if (o.hang > c0) b.mesh(IRON, 'cyl', x, (c0 + o.hang) / 2, z, d * 0.45, o.hang - c0, d * 0.45);
  if (o.ring && !o.round) b.mesh(IRON, 'cyl', x, y0 + 0.03, z, d * 0.72, 0.06, d * 0.72);
}

/** Small box lantern on a wall face at u, with a timber hood (pf/cf + 2.0 … 2.29). */
function boxLantern(b: Builder, f: { axis: 'x' | 'z'; at: number; n: Wall }, u: number, y: number, mat = PALE) {
  fbox(b, f, mat, u - 0.09, u + 0.09, y, y + 0.24, 0.06, 0.2);
  fbox(b, f, TIMBER_DK, u - 0.11, u + 0.11, y + 0.24, y + 0.29, 0, 0.22);
}

// ── Spine layout shared by lights() and concourse() ──────────────────────────────────────────

/** The stairwells standing in the spine. */
const spineWells = (i: ConcInfo): Stairwell[] => i.stairwells.filter((w) => w.room < 0);

/** The floor (and the air above it) in front of a portal that must stay clear: 3.3 m out, 1 m wider each side. */
function approach(w: Stairwell): Rect {
  const [px, pz] = w.portal.at, [nx, nz] = w.portal.n, hw = w.portal.w / 2 + 1;
  const a = nx ? px : pz, c = a + (nx || nz) * 3.3;
  return nx ? [Math.min(a, c), pz - hw, Math.max(a, c), pz + hw] : [px - hw, Math.min(a, c), px + hw, Math.max(a, c)];
}

/** Rectangles an overhead run must stop at: stairwells (walls to the ceiling) and portal approaches. */
const overheadStops = (i: ConcInfo): Rect[] => spineWells(i).flatMap((w): Rect[] => {
  const f = w.footprint;
  return [[f[0] - 0.1, f[1] - 0.1, f[2] + 0.1, f[3] + 0.1], approach(w)];
});

/** x-ranges where a run along x at z (± half) meets a stop. */
const stopsAlongX = (i: ConcInfo, z: number, half: number): Span[] =>
  overheadStops(i).filter((r) => z + half > r[1] && z - half < r[3]).map((r): Span => [r[0], r[2]]);

/** z-ranges where a run along z at x (± half) meets a stop. */
const stopsAlongZ = (i: ConcInfo, x: number, half: number): Span[] =>
  overheadStops(i).filter((r) => x + half > r[0] && x - half < r[2]).map((r): Span => [r[1], r[3]]);

const gateGaps = (i: ConcInfo, m: number): Span[] => i.ends.map((e): Span => [e.g - m, e.g + m]);

/** Half width of the canal on the ceiling: water to ±WATER_H, timber banks to ±BANK_H. */
const WATER_H = 0.85, BANK_H = 1.1;

/** Stretches of the ceiling canal: the paid area clear of the gates, the stairwells and their approaches, 4 m or more. */
const canalRuns = (i: ConcInfo): Span[] =>
  cut([i.paid[0], i.paid[1]], [...gateGaps(i, 4.5), ...stopsAlongX(i, 0, BANK_H)]).filter(([p, q]) => q - p >= 4);

const plans = new WeakMap<ConcInfo, number[]>();

/** Post positions of a Tōmyō-bashi at xb (both walls, a pair each), as floor rectangles. */
function bridgePosts(i: ConcInfo, xb: number): Rect[] {
  const out: Rect[] = [];
  for (const s of [-1, 1] as const) {
    const [za, zb] = band(i, s, 0.02, 0.3);
    for (const dx of [-0.9, 0.9]) out.push([xb + dx - 0.12, za, xb + dx + 0.12, zb]);
  }
  return out;
}

/**
 * Where the bridges go: one over each canal stretch, near its middle, with its arch clear of the
 * pillars and its posts on free floor against the walls. Computed once (before anything of ours is
 * claimed), so lights() and concourse() agree.
 */
function bridgeXs(i: ConcInfo): number[] {
  const got = plans.get(i);
  if (got) return got;
  const out: number[] = [];
  for (const [p, q] of canalRuns(i)) {
    const m = (p + q) / 2;
    for (const d of [0, 0.5, -0.5, 1, -1, 1.5, -1.5, 2, -2, 2.5, -2.5]) {
      const xb = m + d;
      if (xb - 1.2 < p || xb + 1.2 > q) continue;
      if (i.pillars.some(([px]) => Math.abs(px - xb) < 1.3)) continue;
      if (!bridgePosts(i, xb).every((r) => i.free(r[0] - 0.1, r[1], r[2] + 0.1, r[3]))) continue;
      out.push(xb);
      break;
    }
  }
  plans.set(i, out);
  return out;
}

// ── Spine pieces ─────────────────────────────────────────────────────────────────────────────

/** Stone lantern (tōrō): base, shaft, platform, a glowing fire box, stepped roof, finial. Solid. */
function toro(i: ConcInfo, x: number, z: number): boolean {
  const h = 0.42;
  if (!i.free(x - h, z - h, x + h, z + h, 0.3)) return false;
  i.claim(x - h - 0.3, z - h - 0.3, x + h + 0.3, z + h + 0.3);
  const { b, cf } = i;
  b.block(x - h, cf, z - h, x + h, cf + 1.55, z + h);
  b.deco(STONE_DK, x - 0.36, cf, z - 0.36, x + 0.36, cf + 0.2, z + 0.36);
  b.deco(STONE, x - 0.13, cf + 0.2, z - 0.13, x + 0.13, cf + 0.92, z + 0.13);
  b.deco(STONE_DK, x - 0.28, cf + 0.92, z - 0.28, x + 0.28, cf + 1.03, z + 0.28);
  b.deco(AMBER, x - 0.16, cf + 1.03, z - 0.16, x + 0.16, cf + 1.31, z + 0.16);
  for (const [dx, dz] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
    b.deco(STONE, x + dx * 0.135 - 0.04, cf + 1.03, z + dz * 0.135 - 0.04, x + dx * 0.135 + 0.04, cf + 1.31, z + dz * 0.135 + 0.04);
  }
  b.deco(STONE_DK, x - h, cf + 1.31, z - h, x + h, cf + 1.4, z + h);
  b.deco(STONE_DK, x - 0.27, cf + 1.4, z - 0.27, x + 0.27, cf + 1.48, z + 0.27);
  b.mesh(STONE, 'sphere', x, cf + 1.56, z, 0.18, 0.18, 0.18);
  return true;
}

/**
 * Tōmyō-bashi at xb, a gateway frame across the spine: two persimmon posts against each long wall
 * (solid, slim), a stepped persimmon arch across above 2.42 m, a timber deck on top, brass finials,
 * the bridge's name on one face and the festival's on the other, and a big named lantern at each
 * bridge end (by the walls). Claims the wall strip either side so the frontage leaves it bare.
 */
function bridge(i: ConcInfo, xb: number): boolean {
  const { b, cf, cw } = i, px = 0.9;
  const posts = bridgePosts(i, xb);
  if (!posts.every((r) => i.free(r[0] - 0.1, r[1], r[2] + 0.1, r[3]))) return false;
  for (const s of [-1, 1] as const) {
    const [za, zb] = band(i, s, 0, 1.0);
    i.claim(xb - 1.15, za, xb + 1.15, zb);
  }
  for (const r of posts) {
    b.box(PERSIMMON, r[0], cf, r[1], r[2], cf + 2.42, r[3]);
    b.deco(IRON, r[0] - 0.015, cf, r[1] - 0.015, r[2] + 0.015, cf + 0.12, r[3] + 0.015);
  }
  for (const dx of [-px, px]) {
    const x = xb + dx;
    b.deco(PERSIMMON, x - 0.1, cf + 2.42, -cw, x + 0.1, cf + 2.52, cw);
    b.deco(PERSIMMON, x - 0.1, cf + 2.52, -(cw - 1.4), x + 0.1, cf + 2.62, cw - 1.4);
    b.deco(PERSIMMON, x - 0.1, cf + 2.62, -(cw - 2.8), x + 0.1, cf + 2.72, cw - 2.8);
    for (const z of [-(cw - 0.5), cw - 0.5]) b.mesh('metal:#c9a227', 'sphere', x, cf + 2.6, z, 0.15, 0.15, 0.15);
  }
  b.deco(TIMBER_DK, xb - px - 0.1, cf + 2.72, -(cw - 2.9), xb + px + 0.1, cf + 2.77, cw - 2.9);
  b.sign({ k: 'label', ...BRIDGE, ...PLAQUE }, xb + px + 0.112, cf + 2.58, 0, [1, 0], 1.6, 0.24);
  b.sign({ k: 'label', ...FESTIVAL, ...PLAQUE }, xb - px - 0.112, cf + 2.58, 0, [-1, 0], 1.6, 0.24);
  // Big lanterns at the bridge ends, by the walls, the festival's name on them.
  for (const z of [-(cw - 0.6), cw - 0.6]) {
    chochin(b, xb, cf + 2.33, z, { d: 0.5, h: 0.62, hang: cf + i.clear, mat: AMBER, ring: true });
    for (const f of [-1, 1] as const) {
      b.sign({ k: 'shop', ja: '万灯', bg: '#ffb05a', fg: '#5a1a0a', vertical: true }, xb + f * 0.26, cf + 2.64, z, [f, 0], 0.22, 0.4);
    }
  }
  return true;
}

/**
 * The canal of light on the ceiling: dark glossy water between timber banks, with glints of the
 * lantern strings on it, in each stretch (`canalRuns`).
 */
function canal(i: ConcInfo) {
  const { b } = i, top = i.cf + i.clear;
  for (const [p, q] of canalRuns(i)) {
    const wa = p + 0.3, wb = q - 0.3;
    b.deco(WATER, wa, top - 0.012, -WATER_H, wb, top, WATER_H);
    for (const s of [-1, 1]) {
      const [za, zb] = s < 0 ? [-BANK_H, -WATER_H] : [WATER_H, BANK_H];
      b.deco(TIMBER_DK, wa - 0.2, top - 0.1, za, wb + 0.2, top, zb);
    }
    for (const x of [wa - 0.2, wb]) b.deco(TIMBER_DK, x, top - 0.1, -WATER_H, x + 0.2, top, WATER_H);
    // Reflections of the lantern strings on the water.
    let k = 0;
    for (let x = wa + 0.7; x + 0.6 < wb; x += 1.3, k++) {
      const z = (k % 3 - 1) * 0.35;
      b.deco(k % 4 === 1 ? RED : AMBER, x, top - 0.016, z - 0.02, x + 0.45 + (k % 2) * 0.2, top - 0.012, z + 0.02);
    }
  }
}

/** Wooden bench, 1.8 long along x, solid. */
function woodBench(i: ConcInfo, x: number, z: number): boolean {
  const hx = 0.9, hz = 0.24;
  if (!i.free(x - hx, z - hz, x + hx, z + hz, 0.9)) return false;
  i.claim(x - hx - 0.5, z - hz - 0.5, x + hx + 0.5, z + hz + 0.5);
  const { b, cf } = i;
  b.block(x - hx, cf, z - hz, x + hx, cf + 0.45, z + hz);
  b.deco(SEAT, x - hx, cf + 0.4, z - hz, x + hx, cf + 0.46, z + hz);
  for (const k of [-1, 1]) b.deco(TIMBER_DK, x + k * (hx - 0.15) - 0.05, cf, z - hz + 0.03, x + k * (hx - 0.15) + 0.05, cf + 0.4, z + hz - 0.03);
  return true;
}

/**
 * A front of `depth` at x0 … x1 on wall s is fine opposite a pillar only if it is 1.0 m deep or
 * less (the pillar rows stand at |z| ≈ 4.9; people pass either side of them).
 */
const laneOk = (i: ConcInfo, s: Wall, x0: number, x1: number, depth: number) =>
  depth <= 1.0 + 1e-6 || i.pillars.every(([px, pz]) => Math.sign(pz) !== s || px < x0 - 0.85 || px > x1 + 0.85);

/** What the look has put on each long wall, as x-spans ([−z wall, +z wall]); wall lanterns keep off them. */
type Used = [Span[], Span[]];
const wi = (s: Wall) => (s > 0 ? 1 : 0);

/** The red lanterns of the standing bar, hung at its fascia corners `d` out from the wall. */
function barLanterns(i: ConcInfo, s: Wall, x0: number, x1: number, d: number) {
  const { b, cf } = i;
  for (const x of [x0 + 0.14, x1 - 0.14]) {
    const [za, zb] = band(i, s, d - 0.22, d + 0.02);
    b.deco(IRON, x - 0.015, cf + 2.66, za, x + 0.015, cf + 2.7, zb);
    chochin(b, x, cf + 2.22, s * (i.cw - d), { d: 0.3, h: 0.42, hang: cf + 2.7, mat: RED, ring: true });
  }
}

/**
 * A closed, lattice-fronted shop (a sake bar, a sweet house): dark timber fascia with the name,
 * a lit paper screen behind vertical timber slats (koshi-gōshi), and a lit doorway near x1 with a
 * noren across it. 0.35 m deep, solid; checks and claims 1.2 m in front as `shopFront` does.
 */
function latticeFront(i: ConcInfo, s: Wall, x0: number, x1: number, brand: Brand, nr: { color: string; text: string; fg: string }): boolean {
  const d = 0.35, [za, zb] = band(i, s, 0, d + 1.2);
  if (x1 - x0 < 2.4 || !i.free(x0, za, x1, zb)) return false;
  i.claim(x0, za, x1, zb);
  const { b, cf } = i, top = cf + i.clear, fy = cf + FASCIA, f = wallFace(i, s);
  const [ca, cb] = band(i, s, 0, d);
  b.block(x0, cf, ca, x1, fy, cb);
  fbox(b, f, TIMBER_DK, x0, x1, fy, top, 0, d);
  fbox(b, f, `flat:${brand.bg}`, x0, x1, fy, fy + 0.05, d, d + 0.01);
  const [sx, sz] = fpt(f, (x0 + x1) / 2, d + 0.015);
  b.sign({ k: 'shop', ja: brand.ja, en: brand.en, bg: brand.bg, fg: brand.fg }, sx, fy + 0.34, sz, fnormal(f), Math.max(1, Math.min(6, Math.floor((x1 - x0 - 0.3) * 2) / 2)), 0.5);
  for (const u of [x0, x1 - 0.12]) fbox(b, f, TIMBER_DK, u, u + 0.12, cf, fy, 0, d);
  const door = x1 - 0.75, da = door - 0.48, dc = door + 0.48;
  // The screen: a stone sill, the lit paper behind, slats in front.
  const xa = x0 + 0.12;
  fbox(b, f, STONE_DK, xa, da, cf, cf + 0.3, 0, d - 0.02);
  fbox(b, f, PALE, xa, da, cf + 0.3, fy - 0.12, d - 0.1, d - 0.08);
  fbox(b, f, TIMBER, xa, da, fy - 0.12, fy, 0, d);
  for (let u = xa + 0.06; u + 0.04 < da; u += 0.13) fbox(b, f, TIMBER, u, u + 0.04, cf + 0.3, fy - 0.12, d - 0.06, d);
  // The doorway: a warm lit interior, a timber frame, a short noren.
  fbox(b, f, AMBER, da, dc, cf, fy - 0.12, 0, 0.04);
  fbox(b, f, TIMBER, da - 0.06, da, cf, fy, 0, d);
  fbox(b, f, TIMBER, dc - 0.06, dc, cf, fy, 0, d);
  noren(i, 'x', s * (i.cw - (d - 0.03)), da, dc - 0.06, fy - 0.1, { color: nr.color, text: nr.text, fg: nr.fg, h: 0.45, face: -s as Wall });
  return true;
}

/** One unit of the frontage: preferred and shortest length, depth (and a shallower one for beside a pillar). */
interface Unit {
  w: number;
  min: number;
  d: number;
  shallow?: number;
  /** Builds it at x0 … x1, `d` deep; false (building nothing) if it did not fit. */
  at: (s: Wall, x0: number, x1: number, d: number) => boolean;
  /** A shop front (else a station unit: drink machines). */
  shop: boolean;
  /** Must be placed (the quarter's own shops). */
  keep?: boolean;
}

/**
 * The shopping street: the quarter's own shops (lantern maker, tea house, standing bar, wagashi,
 * candles, eel, brushes, sake bar, lantern painters, tenugui, sweets, yuba), a few station brands
 * (a convenience store, a kiosk, bento, rice crackers, taiyaki, gifts, udon), a vending pair and
 * in this order of preference, on whatever free wall is left after the bridges.
 */
function units(i: ConcInfo): Unit[] {
  const { b, cf } = i;
  const at = (s: Wall, d: number) => s * (i.cw - d);
  const W = 'wood:#5a3d28', W2 = 'wood:#4a3324';
  const counter = (brand: Brand, body: string, noren?: { color: string; text?: string; fg?: string }, goods?: string[], lite = false) =>
    (s: Wall, x0: number, x1: number, d: number) => shopFront(i, { s, x0, x1, brand, depth: d, front: 'counter', body, noren, goods, lite });
  const glazed = (brand: Brand, body: string, door: 'lo' | 'hi' | false, goods?: string[], lite = true) =>
    (s: Wall, x0: number, x1: number, d: number) =>
      shopFront(i, { s, x0, x1, brand, depth: d, front: 'glazed', body, goods, lite, door: door === false ? false : door === 'lo' ? x0 + 0.85 : x1 - 0.85 });
  return [
    {
      // Lantern maker: unpainted paper lanterns on the counter, finished ones lit inside.
      w: 3.6, min: 3.0, d: 1.0, shop: true, keep: true,
      at: (s, x0, x1, d) => {
        if (!shopFront(i, { s, x0, x1, brand: BRANDS.hiyoriya, depth: d, front: 'counter', body: W, goods: ['#efe6d2', '#e3d5b8', '#f4ecdc'] })) return false;
        const n = Math.floor((x1 - x0 - 0.4) / 0.8);
        for (let k = 0; k < n; k++) {
          const x = x0 + 0.6 + k * 0.8;
          if (k % 2) b.mesh(PAPER, 'cyl', x, cf + 1.17, at(s, d - 0.25), 0.26, 0.34, 0.26);
          else b.mesh(PAPER, 'sphere', x, cf + 1.14, at(s, d - 0.25), 0.28, 0.28, 0.28);
        }
        for (let k = 0; k < 3; k++) chochin(b, x0 + 0.75 + (k * (x1 - x0 - 1.5)) / 2, cf + 1.98, at(s, 0.25), { d: 0.26, h: 0.32, hang: cf + 2.35, round: k === 1, mat: glowOf(k + 1) });
        return true;
      },
    },
    { w: 4.8, min: 4.2, d: 0.6, shop: true, at: glazed(SHOPS.maruhoshiMart, 'flat:#ebe8e0', 'hi', undefined) },
    {
      // Riverside standing bar: a dark noren and a pair of red lanterns at the fascia corners.
      w: 3.6, min: 3.0, d: 1.0, shop: true, keep: true,
      at: (s, x0, x1, d) => {
        if (!counter(BRANDS.kawaberi, TIMBER, { color: '#1f1a17', text: '立呑', fg: '#ffd9a0' }, ['#2f5a3a', '#8a5a2b', '#e8e2d0'])(s, x0, x1, d)) return false;
        barLanterns(i, s, x0, x1, d + 0.2);
        return true;
      },
    },
    { w: 3.0, min: 2.6, d: 0.6, shop: true, at: glazed(BRANDS.toshindo, W2, 'lo', ['#f4ecdc', '#c4561c', '#8a2b18', '#e8c98a']) },
    {
      w: 3.6, min: 3.0, d: 1.4, shallow: 1.0, shop: true, keep: true,
      at: counter(BRANDS.tomoshibi, W2, { color: '#2f3b2b', text: 'お茶', fg: '#f3e3c3' }, ['#3f5a32', '#e8e2d0', '#8a5a2b']),
    },
    { w: 3.0, min: 2.6, d: 0.6, shop: true, at: glazed(BRANDS.suzuriya, W, 'hi', ['#f4ecdc', '#1b1612', '#7a1f14', '#e3d5b8']) },
    { w: 3.0, min: 2.6, d: 0.35, shop: true, at: (s, x0, x1) => latticeFront(i, s, x0, x1, BRANDS.hotaru, { color: '#24324a', text: '酒', fg: '#f3e3c3' }) },
    {
      w: 2.4, min: 2.2, d: 1.0, shop: true, keep: true,
      at: counter(SHOPS.tsumugian, W, { color: '#6a1b3a', text: '和菓子', fg: '#fbe9d0' }),
    },
    { w: 3.6, min: 3.0, d: 1.0, shop: true, at: counter(BRANDS.horibata, TIMBER, { color: '#3a2416', text: 'うなぎ', fg: '#ffd9a0' }, ['#5a3a1c', '#e8e2d0', '#2f3a2c'], true) },
    { w: 2.4, min: 2.2, d: 1.0, shop: true, at: counter(SHOPS.maruhoshiKiosk, 'flat:#d8d2c4', undefined, undefined, true) },
    {
      // Lantern painters' workshop window: half-painted lanterns hung lit behind the glass.
      w: 3.6, min: 3.0, d: 0.6, shop: true,
      at: (s, x0, x1, d) => {
        if (!shopFront(i, { s, x0, x1, brand: BRANDS.akari, depth: d, front: 'glazed', body: W2, door: false, lite: true, goods: ['#efe6d2', '#c4561c'] })) return false;
        const n = Math.floor((x1 - x0 - 0.6) / 0.75);
        for (let k = 0; k < n; k++) chochin(b, x0 + 0.5 + k * 0.75, cf + 1.72, at(s, d - 0.2), { d: 0.24, h: 0.3, hang: cf + 2.25, round: k % 2 === 1, mat: k % 3 ? PALE : RED });
        return true;
      },
    },
    { w: 3.6, min: 3.0, d: 0.35, shop: true, at: (s, x0, x1) => latticeFront(i, s, x0, x1, BRANDS.yunagi, { color: '#7a1f14', text: '甘味', fg: '#fff3dc' }) },
    {
      w: 3.0, min: 2.6, d: 1.0, shop: true,
      at: (s, x0, x1, d) => shopFront(i, { s, x0, x1, brand: BRANDS.kawazome, depth: d, front: 'stall', body: W2, goods: ['#24324a', '#c4561c', '#efe6d2', '#6a1b3a'], lite: true }),
    },
    { w: 3.0, min: 2.6, d: 0.6, shop: true, at: glazed(SHOPS.minatoya, W, 'lo') },
    { w: 2.4, min: 2.2, d: 1.0, shop: true, at: counter(SHOPS.ginnando, W, { color: '#8a5a2b', text: 'せんべい', fg: '#fbe9d0' }, undefined, true) },
    { w: 3.6, min: 3.0, d: 0.6, shop: true, at: glazed(SHOPS.kawaminatodo, W2, 'hi') },
    { w: 3.0, min: 2.6, d: 1.0, shop: true, at: counter(BRANDS.kawagiri, W, { color: '#efe3c8', text: 'ゆば', fg: '#3a2416' }, ['#efe3c8', '#e3d5b8', '#8a5a2b'], true) },
    { w: 2.4, min: 2.2, d: 1.0, shop: true, at: counter(SHOPS.namima, W, { color: '#7a2e0e', text: 'たい焼', fg: '#f2d16b' }, undefined, true) },
    // Drink machines in short stretches where no shop fits.
    { w: 1.05, min: 1.05, d: 0.9, shop: false, at: (s, x0) => vendingRow(i, s, x0, 1, false) },
    { w: 1.05, min: 1.05, d: 0.9, shop: false, at: (s, x0) => vendingRow(i, s, x0, 1, false) },
    { w: 3.6, min: 3.0, d: 1.0, shop: true, at: counter(SHOPS.udonKawanami, TIMBER, { color: '#7a2a12', text: 'うどん', fg: '#fff' }, undefined, true) },
  ];
}

/** Stretches of long wall `s` within the paid area whose wall strip is still free, merged at 0.25 m. */
function wallRuns(i: ConcInfo, s: Wall): Span[] {
  const [za, zb] = band(i, s, 0, 0.15);
  const out: Span[] = [];
  for (let x = i.paid[0]; x + 0.25 <= i.paid[1] + 1e-6; x += 0.25) {
    if (!i.free(x, za, x + 0.25, zb)) continue;
    const last = out[out.length - 1];
    if (last && Math.abs(last[1] - x) < 1e-6) last[1] = x + 0.25;
    else out.push([x, x + 0.25]);
  }
  return out.filter(([p, q]) => q - p >= 0.8);
}

/**
 * One flat service element at u on wall s (0.12 m proud at most, `free()`-checked): a hose cabinet
 * first on each wall, then staff doors in dark paint, meter cupboards and grilles in turn. Returns
 * its length, or 0.
 */
function service(i: ConcInfo, s: Wall, u: number, room: number, first: boolean, k: number): number {
  const door = { color: 'paint:#4a3a2e', frame: IRON, room: 0 };
  if (first && room >= 0.75 && hoseCabinet(i, s, u, { room: 0 })) return 0.75;
  const pick = (['door', 'meter', 'door2', 'vent'] as const)[k % 4];
  if (pick === 'door2' && room >= 1.96 && serviceDoor(i, s, u, { ...door, leaves: 2, label: STAFF_ROOMS[k % STAFF_ROOMS.length] })) return 1.96;
  if (pick === 'meter' && room >= 0.9 && meterCupboard(i, s, u, { room: 0, mat: 'paint:#4a3a2e' })) return 0.9;
  if (pick === 'vent' && room >= 1.0 && ventGrille(i, s, u, { room: 0, y: 0.25, h: 0.5, mat: IRON })) return 1.0;
  if (room >= 1.16 && serviceDoor(i, s, u, { ...door, label: k % 3 ? STAFF_ROOMS[k % STAFF_ROOMS.length] : null })) return 1.16;
  if (room >= 0.75 && meterCupboard(i, s, u, { room: 0, w: 0.75, mat: 'paint:#4a3a2e' })) return 0.75;
  return 0;
}

/**
 * Both long walls of the paid area, as a shopping street: shop fronts (`units`, in order of
 * preference, each used once) along every free stretch, broken every 18 m or so by a bridge's
 * posts; service elements where no shop fits, and whatever is left (short ends) bare timber for
 * the wall lanterns.
 * Returns the units that found no room.
 */
function frontage(i: ConcInfo, used: Used): Unit[] {
  const queue = units(i);
  let k = 0;
  for (const s of [-1, 1] as const) {
    let hose = true;
    for (const [a, c] of wallRuns(i, s)) {
      let u = a + 0.05;
      while (c - u >= 0.8) {
        const room = c - u - 0.05;
        let w = 0;
        for (let q = 0; q < queue.length && !w; q++) {
          const it = queue[q];
          if (room < it.min) continue;
          let len = Math.min(it.w, room);
          if (room - len < 0.9) len = Math.min(room, it.w + 1.5);
          const d = laneOk(i, s, u, u + len, it.d) ? it.d : it.shallow !== undefined && laneOk(i, s, u, u + len, it.shallow) ? it.shallow : -1;
          if (d < 0 || !it.at(s, u, u + len, d)) continue;
          w = it.shop ? len : it.w;
          queue.splice(q, 1);
        }
        // Where no shop fits: a hose cabinet (one per wall), staff doors, cupboards, grilles.
        if (!w) {
          w = service(i, s, u, room, hose, k++);
          if (w) hose = false;
        }
        if (w) used[wi(s)].push([u, u + w]);
        u += w ? w + 0.1 : 0.25;
      }
    }
  }
  return queue;
}

/**
 * Box lanterns high on the long walls (over the frieze, on the timber band) wherever the wall is
 * otherwise bare: no shop front, service element or bridge there, clear of openings, gates and the toilets.
 */
function wallLanterns(i: ConcInfo, used: Used) {
  const { b, cf } = i;
  let k = 0;
  for (const s of [-1, 1] as const) {
    const f = { axis: 'x' as const, at: s * i.cw, n: -s as Wall };
    const gaps: Span[] = [
      ...used[wi(s)].map(([p, q]): Span => [p - 0.3, q + 0.3]),
      ...i.openings.filter((o) => o.s === s).map((o): Span => [o.x0 - 0.5, o.x1 + 0.5]),
      ...gateGaps(i, 4),
      ...(s < 0 ? [[i.toilets - 1.5, i.toilets + 1.5] as Span] : []),
    ];
    for (const [p, q] of cut([i.paid[0], i.paid[1]], gaps)) {
      if (q - p < 0.6) continue;
      const n = Math.max(1, Math.floor((q - p) / 2.6));
      for (let j = 0; j < n; j++) boxLantern(b, f, p + ((q - p) * (j + 0.5)) / n, cf + 2.56, glowOf(k++));
    }
  }
}

/** Benches midway between pillars in the pillar lines, paid area only. */
function benches(i: ConcInfo) {
  let n = 4;
  for (const [x, z] of i.pillars) {
    if (n <= 0) break;
    if (!i.pillars.some(([x2, z2]) => z2 === z && Math.abs(x2 - x - 8) < 0.01)) continue;
    if (x + 4 < i.paid[0] + 4 || x + 4 > i.paid[1] - 4) continue;
    if (woodBench(i, x + 4, z)) n--;
  }
}

/**
 * Every spine stairwell's outer walls: the wainscot, cap and frieze of the long walls, small box
 * lanterns along the long faces, and on the closed end the festival's name.
 */
function dressWells(i: ConcInfo) {
  const { b, cf } = i;
  for (const w of spineWells(i)) {
    for (const f of stairwellFaces(i, w)) {
      faceDado(i, f, { mat: WAINSCOT, top: 1.1, cap: PERSIMMON, skirting: IRON, frieze: PERSIMMON, friezeY: [2.42, 2.5] });
      const len = f.u1 - f.u0;
      if (f.end) {
        if (len < 2) continue;
        const [x, z] = fpt(f, (f.u0 + f.u1) / 2, 0.03);
        fbox(b, f, TIMBER_DK, (f.u0 + f.u1) / 2 - 0.9, (f.u0 + f.u1) / 2 + 0.9, cf + 1.82, cf + 2.18, 0, 0.02);
        b.sign({ k: 'label', ...FESTIVAL, ...PLAQUE }, x, cf + 2.0, z, fnormal(f), 1.6, 0.24);
        for (const u of [f.u0 + 0.4, f.u1 - 0.4]) boxLantern(b, f, u, cf + 2.0, AMBER);
      } else {
        const n = Math.floor((len - 0.6) / 2.2);
        for (let k = 0; k < n; k++) boxLantern(b, f, f.u0 + 0.3 + ((len - 0.6) * (k + 0.5)) / n, cf + 2.0, glowOf(k));
      }
    }
  }
}

// ── Transfer bays ────────────────────────────────────────────────────────────────────────────

/** Spans along face `f` (of a room) that run beside a stair opening or a portal. */
function faceGaps(f: WallFace, holes: Rect[], wells: Stairwell[]): Span[] {
  const portals = wells.map(({ portal: { fascia: p } }): Rect => {
    const a = p.at, c = p.at - p.n * 0.35;
    return p.axis === 'x' ? [p.u0, Math.min(a, c), p.u1, Math.max(a, c)] : [Math.min(a, c), p.u0, Math.max(a, c), p.u1];
  });
  const near = (r: Rect, x: number, z: number, m: number) => x > r[0] - m && x < r[2] + m && z > r[1] - m && z < r[3] + m;
  const out: Span[] = [];
  for (let u = f.u0 + 0.125; u < f.u1; u += 0.25) {
    const [x, z] = f.axis === 'x' ? [u, f.at + f.n * 0.3] : [f.at + f.n * 0.3, u];
    if (!holes.some((h) => near(h, x, z, 0.15)) && !portals.some((p) => near(p, x, z, 0.4))) continue;
    const last = out[out.length - 1];
    if (last && Math.abs(last[1] - (u - 0.125)) < 1e-6) last[1] = u + 0.125;
    else out.push([u - 0.125, u + 0.125]);
  }
  return out;
}

/** The part of a room not taken by its stairwells: the largest rectangle left beside each. */
function lobbyOf(r: RoomInfo, wells: Stairwell[]): Rect {
  let L: Rect = [...r.rect];
  for (const { footprint: f } of wells) {
    if (f[2] <= L[0] || f[0] >= L[2] || f[3] <= L[1] || f[1] >= L[3]) continue;
    const opts: Rect[] = [[L[0], L[1], f[0], L[3]], [f[2], L[1], L[2], L[3]], [L[0], L[1], L[2], f[1]], [L[0], f[3], L[2], L[3]]];
    L = opts.reduce((p, q) => (Math.max(0, q[2] - q[0]) * Math.max(0, q[3] - q[1]) > Math.max(0, p[2] - p[0]) * Math.max(0, p[3] - p[1]) ? q : p));
  }
  return L;
}

// ── Passages ─────────────────────────────────────────────────────────────────────────────────

/** True if the station's primary line has side platforms (doorways into the transfer passages). */
function sideDoors(st: StationDef): boolean {
  const spec = SPECS[st.id];
  const id = spec && 'primary' in spec ? spec.primary : linesAt(st.id)[0]?.id;
  return LINES.find((l) => l.id === id)?.platformType !== 'island';
}

const stairY = (e: ExitInfo, x: number) => e.cf + ((e.gy - e.cf) * Math.max(0, Math.min(e.run, x))) / e.run;

// ── The look ─────────────────────────────────────────────────────────────────────────────────

export const look: StationLook = {
  finishes: { wall: 'wood:#4a3226', floor: 'floor:#b9ad9a', pillar: TIMBER, ceil: 'paint:#2a201b' },
  posters: false,
  skirting: false,

  lights(i) {
    const { b } = i, top = i.cf + i.clear;
    const nearGate = (x: number, m: number) => i.ends.some((e) => Math.abs(x - e.g) < m);
    // Neutral panels either side of each gate line, and in front of every stair portal.
    for (const e of i.ends) {
      for (const dx of [-2.8, 2.8]) for (const z of [-8, -4, 0, 4]) if (Math.abs(z) < i.cw - 2) lightPanel(i, e.g + dx, z, top, 1.8, 0.5);
    }
    for (const w of spineWells(i)) {
      const [px, pz] = w.portal.at, [nx, nz] = w.portal.n;
      lightPanel(i, px + nx * 1.8, pz + nz * 1.8, top, nx ? 1.0 : 1.6, nx ? 1.6 : 1.0);
    }

    // Lantern strings along both banks of the canal, stopping at stairwells, portal approaches and bridges.
    const bridges = bridgeXs(i);
    const rodY = top - 0.29;
    let k = 0;
    for (const z of [-1.8, 1.8]) {
      const runs = cut([i.x0 + 1.2, i.x1 - 1.2], [...gateGaps(i, 4), ...stopsAlongX(i, z, 0.3), ...bridges.map((xb): Span => [xb - 1.3, xb + 1.3])]);
      for (const [p, q] of runs) {
        const n = Math.floor((q - p - 1.0) / 2.1) + 1;
        if (q - p < 2) continue;
        const x0 = (p + q) / 2 - ((n - 1) * 2.1) / 2;
        const a = x0 - 0.5, c = x0 + (n - 1) * 2.1 + 0.5;
        b.deco(IRON, a, rodY, z - 0.008, c, rodY + 0.015, z + 0.008);
        for (const x of [a, c]) b.deco(IRON, x - 0.008, rodY, z - 0.008, x + 0.008, top, z + 0.008);
        for (let j = 0; j < n; j++) {
          const x = x0 + j * 2.1, round = k % 2 === 0;
          chochin(b, x, round ? rodY - 0.36 : rodY - 0.38, z, { d: round ? 0.3 : 0.26, h: round ? 0.3 : 0.32, hang: rodY, round, mat: glowOf(k) });
          k++;
        }
      }
    }

    // A row of bigger lanterns down each side of the spine, clear of gates, openings, pillars,
    // bridges, stairwells and the toilet sign.
    for (const s of [-1, 1] as const) {
      const z = s * (i.cw - 2.6);
      for (let x = i.x0 + 1.8; x < i.x1 - 1.2; x += 4.4) {
        if (nearGate(x, 4.2)) continue;
        if (i.openings.some((o) => x > o.x0 - 1.5 && x < o.x1 + 1.5)) continue;
        if (stopsAlongX(i, z, 0.3).some(([p, q]) => x > p - 0.3 && x < q + 0.3)) continue;
        if (bridges.some((xb) => Math.abs(x - xb) < 1.4) || i.pillars.some(([px, pz]) => Math.abs(px - x) < 0.8 && Math.abs(pz - z) < 0.8)) continue;
        if (s < 0 && Math.abs(x - i.toilets) < 1.8) continue;
        chochin(b, x, top - 0.62, z, { d: 0.34, h: 0.42, hang: top, mat: glowOf(k++), ring: true });
      }
    }
  },

  pillar(i, x, z, y0, y1) {
    const { b } = i, h = 0.4;
    b.deco(i.pillar, x - h, y0, z - h, x + h, y1, z + h);
    b.deco(IRON, x - h - 0.012, y0, z - h - 0.012, x + h + 0.012, y0 + 0.15, z + h + 0.012);
    b.deco(PERSIMMON, x - h - 0.01, y0 + 2.02, z - h - 0.01, x + h + 0.01, y0 + 2.2, z + h + 0.01);
    b.deco(TIMBER_DK, x - h - 0.02, y1 - 0.12, z - h - 0.02, x + h + 0.02, y1, z + h + 0.02);
    // A bracket lantern on the face toward the middle of the spine.
    const f = z > 0 ? -1 : 1, zf = z + f * h;
    b.deco(TIMBER_DK, x - 0.03, y0 + 2.6, Math.min(zf, zf + f * 0.34), x + 0.03, y0 + 2.66, Math.max(zf, zf + f * 0.34));
    chochin(b, x, y0 + 2.32, zf + f * 0.27, { d: 0.22, h: 0.26, hang: y0 + 2.6, round: true, mat: AMBER });
  },

  concourse(i) {
    const { b } = i, top = i.cf + i.clear;
    // Walls: dark timber wainscot with a persimmon cap, a persimmon frieze, a timber lintel band.
    for (const s of [-1, 1] as const) {
      wallDado(i, s, { mat: WAINSCOT, top: 1.1, cap: PERSIMMON, skirting: IRON, frieze: PERSIMMON, friezeY: [2.42, 2.5] });
      wallBand(i, s, 2.5, i.clear, TIMBER_DK, { inset: 0.02 });
    }
    dressWells(i);

    // The canal overhead, the bridges and their stone lanterns first, so the frontage keeps off them.
    canal(i);
    const runs = canalRuns(i);
    let nToro = 0;
    for (const xb of bridgeXs(i)) {
      if (!bridge(i, xb)) continue;
      const run = runs.find(([p, q]) => xb > p && xb < q);
      for (const dx of [-2.2, 2.2]) {
        if (nToro >= 4 || !run || xb + dx - 0.8 < run[0] || xb + dx + 0.8 > run[1]) continue;
        for (const z of [0, 2.7, -2.7]) if (toro(i, xb + dx, z)) { nToro++; break; }
      }
    }

    // Dark timber beams across the ceiling, stopping at stairwells, portal approaches and the canal's
    // banks, clear of the gate signs, the toilets and the light panels.
    const canalAt = (x: number) => runs.some(([p, q]) => x > p - 0.1 && x < q + 0.1);
    for (let x = i.x0 + 3; x < i.x1 - 1; x += 6) {
      if (i.ends.some((e) => Math.abs(x - e.g) < 4.5) || Math.abs(x - i.toilets) < 1.5) continue;
      if (bridgeXs(i).some((xb) => Math.abs(x - xb) < 1.3)) continue;
      const gaps = [...stopsAlongZ(i, x, 0.14), ...(canalAt(x) ? [[-BANK_H, BANK_H] as Span] : [])];
      for (const [p, q] of cut([-i.cw, i.cw], gaps)) b.deco(TIMBER_DK, x - 0.14, top - 0.2, p, x + 0.14, top, q);
    }

    const used: Used = [[], []];
    for (const xb of bridgeXs(i)) for (const s of [0, 1]) used[s].push([xb - 1.15, xb + 1.15]);
    frontage(i, used);
    for (const s of [-1, 1] as const) posterRow(i, s, i.paid[0] + 3.6, i.paid[1] - 3.6, { pitch: 4.5, v0: s > 0 ? 1 : 5 });
    wallLanterns(i, used);
    benches(i);
  },

  bay(r) {
    const { b, cf } = r, top = cf + r.clear;
    const wells = r.conc.stairwells.filter((w) => w.room === r.index);
    const holes = r.stairs.map((s) => s.rect);
    // Wainscot, cap and frieze on every face, bare beside the stair and the portal; box lanterns
    // along the clear stretches, as in the passage below.
    for (const f of r.faces) {
      const gaps = faceGaps(f, holes, wells);
      faceDado(r, f, { mat: WAINSCOT, top: 1.1, cap: PERSIMMON, skirting: IRON, frieze: PERSIMMON, friezeY: [2.42, 2.5], gaps });
      for (const [p, q] of cut([f.u0, f.u1], gaps)) {
        const len = q - p - 0.6;
        if (len < 1) continue;
        const n = Math.max(1, Math.floor(len / 2.2));
        for (let k = 0; k < n; k++) boxLantern(b, f, p + 0.3 + (len * (k + 0.5)) / n, cf + 2.0, glowOf(k + r.index));
      }
    }
    // Over the lobby (beyond the portal's approach): a dark timber ceiling and lanterns strung across.
    const L = lobbyOf(r, wells);
    const clear = wells.map(approach);
    const [x0, z0, x1, z1] = L;
    if (x1 - x0 < 1.5 || z1 - z0 < 1.5) return;
    const alongX = x1 - x0 >= z1 - z0;
    const [a0, a1, c0, c1] = alongX ? [x0, x1, z0, z1] : [z0, z1, x0, x1];
    b.deco(TIMBER_DK, x0 + 0.05, top - 0.012, z0 + 0.05, x1 - 0.05, top - 0.004, z1 - 0.05);
    let k = r.index * 3;
    for (let a = a0 + 0.8; a < a1 - 0.5; a += 1.6) {
      const inApproach = (x: number, z: number) => clear.some((q) => x > q[0] - 0.3 && x < q[2] + 0.3 && z > q[1] - 0.3 && z < q[3] + 0.3);
      const pts: [number, number][] = [];
      for (let c = c0 + 0.6; c < c1 - 0.4; c += 1.2) {
        const [x, z] = alongX ? [a, c] : [c, a];
        if (!inApproach(x, z)) pts.push([x, z]);
      }
      if (pts.length < 2) continue;
      const rod = top - 0.07, [fx, fz] = pts[0], [lx, lz] = pts[pts.length - 1];
      b.deco(IRON, Math.min(fx, lx) - 0.01, rod, Math.min(fz, lz) - 0.01, Math.max(fx, lx) + 0.01, rod + 0.015, Math.max(fz, lz) + 0.01);
      for (const [x, z] of pts) chochin(b, x, rod - 0.4, z, { d: 0.32, h: 0.36, hang: rod, round: k % 2 === 0, mat: glowOf(k++) });
    }
  },

  exit(e) {
    const { b, cf, ext, run, gy } = e, L = ext + 4;
    exitDado(e, { mat: WAINSCOT, top: 1.1, cap: PERSIMMON });
    // Box lanterns along the corridor wall (x = −4, facing +x).
    if (ext >= 2) {
      const n = Math.max(1, Math.floor((ext - 0.6) / 2.2));
      for (let k = 0; k < n; k++) boxLantern(b, { axis: 'z', at: -4, n: 1 }, 0.3 + ((ext - 0.6) * (k + 0.5)) / n, cf + 1.9, glowOf(k));
    }
    // Persimmon handrail stepped up the near stair wall.
    const n = Math.max(6, Math.round(run / 0.9)), zr = ext + 1.2;
    for (let k = 0; k < n; k++) {
      const xa = (run * k) / n, xb = (run * (k + 1)) / n, y = stairY(e, (xa + xb) / 2) + 0.85;
      b.deco(PERSIMMON, xa, y, zr + 0.05, xb, y + 0.05, zr + 0.1);
    }
    // A row of bracket lanterns up the far stair wall (z = L, facing −z), under its coping.
    const m = Math.max(4, Math.round(run / 1.8));
    for (let k = 0; k < m; k++) {
      const x = (run * (k + 0.5)) / m, y0 = stairY(e, x) + 2.35;
      if (y0 + 0.4 > gy + 0.9) continue;
      b.deco(TIMBER_DK, x - 0.025, y0 + 0.32, L - 0.34, x + 0.025, y0 + 0.37, L);
      chochin(b, x, y0, L - 0.26, { d: 0.24, h: 0.28, hang: y0 + 0.32, round: k % 2 === 0, mat: glowOf(k) });
    }
    // Two lanterns hung in the lobby, either side of the poster.
    for (const x of [-3.4, -1.0]) chochin(b, x, cf + 2.33, L - 0.5, { d: 0.3, h: 0.3, hang: cf + 2.7, round: true, mat: AMBER });
  },

  canopy(e) {
    const { b, gy, ext, run } = e;
    const zA = ext + 0.8, zB = ext + 4.4, xg = run + 0.15;
    // Timber posts along both sides of the stair, the gateway pair at the street end.
    const xs = run > 6 ? [0.15, run / 2, xg] : [0.15, xg];
    for (const x of xs) for (const z of [zA, zB]) b.deco(TIMBER, x - 0.12, gy, z - 0.12, x + 0.12, gy + 2.95, z + 0.12);
    for (const z of [zA, zB]) b.deco(TIMBER_DK, -0.1, gy + 2.83, z - 0.13, run + 0.4, gy + 2.95, z + 0.13);
    // Gateway: a persimmon tie beam over the entrance sign, a timber lintel above.
    b.deco(PERSIMMON, xg - 0.08, gy + 2.6, zA, xg + 0.08, gy + 2.7, zB);
    b.deco(TIMBER_DK, run, gy + 2.95, ext + 0.3, run + 0.3, gy + 3.07, ext + 4.9);
    // Stepped tiled roof, ridge along the stair.
    b.deco(ROOF, -0.6, gy + 3.07, ext + 0.2, run + 0.7, gy + 3.15, ext + 5.0);
    b.deco(ROOF, -0.5, gy + 3.15, ext + 0.65, run + 0.6, gy + 3.25, ext + 4.55);
    b.deco(ROOF, -0.4, gy + 3.25, ext + 1.15, run + 0.5, gy + 3.35, ext + 4.05);
    b.deco(ROOF, -0.3, gy + 3.35, ext + 2.35, run + 0.4, gy + 3.47, ext + 2.85);
    // Two large lanterns hung in front of the gateway posts, the quarter's name on them.
    for (const z of [zA, zB]) {
      b.deco(TIMBER_DK, xg + 0.1, gy + 2.95, z - 0.03, xg + 0.45, gy + 3.0, z + 0.03);
      chochin(b, xg + 0.4, gy + 2.3, z, { d: 0.5, h: 0.6, hang: gy + 2.95, mat: AMBER, ring: true });
      b.sign({ k: 'shop', ja: '灯明', bg: '#ffb05a', fg: '#5a1a0a', vertical: true }, xg + 0.66, gy + 2.6, z, [1, 0], 0.22, 0.4);
    }
  },

  passage(p) {
    const { b, pf, zc0, zc1 } = p, top = pf + 2.8, zm = (zc0 + zc1) / 2;
    const doors = sideDoors(p.station);
    const kit = passageWalls(p);
    // Wall runs: the zc0 wall is whole unless side-platform doorways open in it.
    const walls = [{ ...kit[0], runs: doors ? kit[0].runs : ([[-26, 4]] as Span[]) }, kit[1]];
    const doorGaps: Span[] = doors ? [[-24.3, -19.7], [-3.3, 1.3]] : [];
    const zOff = (w: { z: number; f: Wall }, t0: number, t1: number): Span => [w.z + w.f * t0, w.z + w.f * t1].sort((a, c) => a - c) as Span;

    // Timber wainscot with a persimmon cap, and a persimmon handrail.
    for (const w of walls) {
      for (const [a, c] of w.runs) {
        b.deco(IRON, a, pf, zOff(w, 0, 0.018)[0], c, pf + 0.13, zOff(w, 0, 0.018)[1]);
        b.deco(WAINSCOT, a, pf + 0.13, zOff(w, 0, 0.008)[0], c, pf + 1.1, zOff(w, 0, 0.008)[1]);
        b.deco(PERSIMMON, a, pf + 1.1, zOff(w, 0, 0.014)[0], c, pf + 1.15, zOff(w, 0, 0.014)[1]);
        if (c - a > 1) {
          const ra = a + 0.15, rc = Math.min(c, 3.7) - 0.15;
          b.deco(PERSIMMON, ra, pf + 0.85, zOff(w, 0.05, 0.1)[0], rc, pf + 0.9, zOff(w, 0.05, 0.1)[1]);
          for (let x = ra + 0.3; x < rc; x += 2.4) b.deco(IRON, x - 0.02, pf + 0.81, zOff(w, 0, 0.08)[0], x + 0.02, pf + 0.85, zOff(w, 0, 0.08)[1]);
        }
      }
    }
    b.deco(IRON, -26, pf, zc0, -25.982, pf + 0.13, zc1);
    b.deco(WAINSCOT, -26, pf + 0.13, zc0, -25.992, pf + 1.1, zc1);
    b.deco(PERSIMMON, -26, pf + 1.1, zc0, -25.986, pf + 1.15, zc1);

    // Timber surround for the mural (x −23 … −4, pf + 0.4 … 2.3 on the zc1 wall), with a little hood.
    b.deco(IRON, -23.1, pf, zc1 - 0.018, -3.9, pf + 0.28, zc1);
    b.deco(TIMBER_DK, -23.16, pf + 0.28, zc1 - 0.05, -3.84, pf + 0.4, zc1);
    b.deco(TIMBER_DK, -23.16, pf + 2.3, zc1 - 0.12, -3.84, pf + 2.42, zc1);
    for (const x of [-23.16, -4]) b.deco(TIMBER_DK, x, pf + 0.4, zc1 - 0.05, x + 0.16, pf + 2.3, zc1);
    b.deco(PERSIMMON, -23.2, pf + 2.42, zc1 - 0.14, -3.8, pf + 2.46, zc1);

    // Dark timber ceiling either side of the kit's light strip, and a stone runner on the floor.
    b.deco(TIMBER_DK, -26, top - 0.012, zc0, 3.7, top - 0.005, zc0 + 1.8);
    b.deco(TIMBER_DK, -26, top - 0.012, zc0 + 2.5, 3.7, top - 0.005, zc1);
    b.deco('floor:#7a6a58', -25.6, pf, zm - 0.6, 3.6, pf + 0.006, zm + 0.6);

    let k = 0;
    // Lanterns strung across the passage in the gaps between the ceiling lights.
    const across = [-25.0, -20.2, -15.2, -10.2, -5.2];
    for (const x of across) {
      const rod = top - 0.07;
      b.deco(IRON, x - 0.01, rod, zc0 + 0.3, x + 0.01, rod + 0.015, zc1 - 0.3);
      for (const z of [zc0 + 0.3, zc1 - 0.3]) b.deco(IRON, x - 0.008, rod, z - 0.008, x + 0.008, top - 0.012, z + 0.008);
      for (const z of [zc0 + 1.25, zm, zc1 - 1.25]) {
        if (z < zm && doorGaps.some(([a, c]) => x > a - 0.4 && x < c + 0.4)) continue;
        chochin(b, x, rod - 0.4, z, { d: 0.32, h: 0.36, hang: rod, mat: glowOf(k++) });
      }
    }
    // Rows of lanterns down both sides, hung from the ceiling, round and oblong in turn.
    for (const [z, skip] of [[zc0 + 0.5, doorGaps], [zc1 - 0.5, [[-2.6, 2.6]]]] as [number, Span[]][]) {
      for (let x = -25.3; x <= 2.2; x += 1.7) {
        if (skip.some(([a, c]) => x > a - 0.3 && x < c + 0.3) || across.some((xa) => Math.abs(x - xa) < 0.35)) continue;
        const round = k % 2 === 0;
        chochin(b, x, round ? top - 0.4 : top - 0.46, z, { d: round ? 0.34 : 0.28, h: round ? 0.34 : 0.4, hang: top - 0.012, round, mat: glowOf(k++) });
      }
    }
    // Small box lanterns on the walls at a constant height, wherever the mural and openings are not.
    for (const w of walls) {
      for (const [a, c0] of w.runs) {
        const c = Math.min(c0, 2.2);
        if (c - a < 0.8) continue;
        const n = Math.max(1, Math.floor((c - a) / 2.5));
        for (let j = 0; j < n; j++) {
          const x = a + ((c - a) * (j + 0.5)) / n;
          const [za, zb] = zOff(w, 0.06, 0.2), [ca, cb] = zOff(w, 0, 0.22);
          b.deco(PALE, x - 0.09, pf + 2.0, za, x + 0.09, pf + 2.24, zb);
          b.deco(TIMBER_DK, x - 0.11, pf + 2.24, ca, x + 0.11, pf + 2.29, cb);
        }
      }
    }
  },
};
