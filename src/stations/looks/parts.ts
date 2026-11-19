// Shared parts for station looks: shop fronts, kiosks, lockers, beams, ducts and the like.
//
// Conventions (read these first):
// - Every function takes the info object first. Concourse parts take a `ConcInfo`; service runs,
//   hanging things and rails only need `{ b }`, so a ConcInfo, ExitInfo or PassageInfo will do.
// - Long walls: `s` = ±1 is the concourse wall at z = s·cw. A depth `d` is measured in from
//   that wall's face, so a part at depth d sits at z = s·(cw − d) and faces −s (into the hall).
// - Runs (pipes, ducts, trays, battens, noren, handrails) go along `axis` ('x' or 'z') at the
//   cross position `at`, from `from` to `to`, hung under a ceiling whose underside is `top`.
// - Anything standing on the floor (shops, kiosks, lockers, benches, bins, planters) checks
//   `i.free()` first: if its footprint is taken it builds nothing and returns false. Otherwise
//   it builds solid parts, claims its footprint (plus room in front to use it) and returns true.
//   Everything overhead and on walls is decoration only.
// - Wall finishes stack at small insets so nothing is coplanar: dado 0.008, trims 0.014, the
//   kit's posters and fare board 0.02, our posters 0.03.
// - Any other wall (a room's `faces`, a stairwell's outer walls from `stairwellFaces`) is dressed
//   with `faceDado` / `facePosters` / `dressFace`. Service elements (`serviceDoor`, `shutter`,
//   `ventGrille`, `hoseCabinet`, `meterCupboard`) go on a long wall or any `Face`.

import type { StationDef } from '../../data/types';
import { linesAt } from '../../data/network';
import type { Builder } from '../../world/builder';
import { vending } from '../kit';
import { SPECS } from '../specs';
import { themeFor } from '../themes';
import { hash, shade } from '../themes/types';
import type { ConcInfo, ExitInfo, PassageInfo, Rect, Stairwell, WallFace } from './types';

type Has = { b: Builder };
export type Wall = 1 | -1;
export type Axis = 'x' | 'z';
export type Span = [number, number];

// ── Era ──────────────────────────────────────────────────────────────────────────────────────

/** 'old' before 1970 (low, busy), 'mid' up to 2010, 'new' after. */
export type EraClass = 'old' | 'mid' | 'new';
export const eraClass = (era: number): EraClass => (era < 1970 ? 'old' : era < 2010 ? 'mid' : 'new');

/** Opening year of a station's primary line (exits and passages are not told it). */
export function eraOf(station: StationDef): number {
  const spec = SPECS[station.id];
  const id = spec && 'primary' in spec ? spec.primary : linesAt(station.id)[0]?.id;
  return (id && themeFor(id).opened) || 2000;
}

// ── Brands ───────────────────────────────────────────────────────────────────────────────────

export type ShopKind =
  | 'conbini' | 'kiosk' | 'soba' | 'bakery' | 'flowers' | 'cafe' | 'sweets' | 'drugstore' | 'books' | 'bento' | 'bank' | 'photo' | 'goods';

export interface Brand {
  ja: string;
  en: string;
  bg: string;
  fg: string;
  kind: ShopKind;
}

/**
 * Invented shop brands for station concourses (never real chains). Some are shared with the
 * street (`SHOPS` in ../surface.ts); record new ones in docs/worldbuilding.md.
 */
export const SHOPS = {
  maruhoshiKiosk: { ja: 'マルホシ キオスク', en: 'Maruhoshi Kiosk', bg: '#0b8f6a', fg: '#fff', kind: 'kiosk' },
  maruhoshiMart: { ja: 'マルホシマート', en: 'Maruhoshi Mart', bg: '#0b8f6a', fg: '#fff', kind: 'conbini' },
  portMart: { ja: 'ポートマート', en: 'Port Mart', bg: '#f4f2ec', fg: '#c8401e', kind: 'conbini' },
  tsubameya: { ja: 'ツバメ屋ストア', en: 'Tsubameya Store', bg: '#1d4f91', fg: '#fff', kind: 'conbini' },
  sobaKita: { ja: 'そば処 きた', en: 'Soba Kita', bg: '#2f3a2c', fg: '#f4f1e6', kind: 'soba' },
  sobaMio: { ja: '立ちそば 澪', en: 'Tachisoba Mio', bg: '#1f2a44', fg: '#f4efe2', kind: 'soba' },
  udonKawanami: { ja: 'うどん 川波', en: 'Udon Kawanami', bg: '#f6efe0', fg: '#7a2a12', kind: 'soba' },
  bakeryKomugi: { ja: 'ベーカリー こむぎ', en: 'Bakery Komugi', bg: '#f3e2c0', fg: '#6d3b12', kind: 'bakery' },
  hinataBakery: { ja: 'ひなたベーカリー', en: 'Hinata Bakery', bg: '#e9a23b', fg: '#3b1f0b', kind: 'bakery' },
  yanagiFlowers: { ja: 'フラワー やなぎ', en: 'Yanagi Flowers', bg: '#e8f3e4', fg: '#2e6b35', kind: 'flowers' },
  hanaNoMinato: { ja: '花の湊', en: 'Hana no Minato', bg: '#c2185b', fg: '#fff', kind: 'flowers' },
  akaneCoffee: { ja: '茜珈琲', en: 'Akane Coffee', bg: '#3a1f1a', fg: '#f0b8a0', kind: 'cafe' },
  nagiCafe: { ja: 'なぎカフェ', en: 'Nagi Café', bg: '#2f6f73', fg: '#fff', kind: 'cafe' },
  kajitsudo: { ja: 'ジューススタンド 果実堂', en: 'Kajitsudō Juice Stand', bg: '#ff8f1f', fg: '#fff', kind: 'cafe' },
  tsumugian: { ja: '和菓子 つむぎ庵', en: 'Wagashi Tsumugi-an', bg: '#6a1b3a', fg: '#fbe9d0', kind: 'sweets' },
  namima: { ja: 'たい焼き なみま', en: 'Taiyaki Namima', bg: '#f2d16b', fg: '#7a2e0e', kind: 'sweets' },
  hibariPharmacy: { ja: 'ひばり薬局', en: 'Hibari Pharmacy', bg: '#ffffff', fg: '#1976d2', kind: 'drugstore' },
  ryubundo: { ja: '柳文堂書店', en: 'Ryubundo Books', bg: '#1b3a5c', fg: '#fff', kind: 'books' },
  minatoya: { ja: 'お弁当 みなと屋', en: 'Bento Minatoya', bg: '#f6efe0', fg: '#8a2b18', kind: 'bento' },
  shinkin: { ja: '川湊信用金庫', en: 'Kawaminato Shinkin Bank', bg: '#f4f4f0', fg: '#0d3b66', kind: 'bank' },
  photoMinato: { ja: 'フォトミナト', en: 'Photo Minato', bg: '#ffd23f', fg: '#1b1b1b', kind: 'photo' },
  kawaminatodo: { ja: 'おみやげ 川湊堂', en: 'Kawaminato-dō Gifts', bg: '#0d3b66', fg: '#fff', kind: 'goods' },
  sorano: { ja: 'そらの雑貨店', en: 'Sorano Zakka', bg: '#f7f4ee', fg: '#3a6ea5', kind: 'goods' },
  // Island shops (default look).
  minamoDrug: { ja: 'ミナモドラッグ', en: 'Minamo Drug', bg: '#2a9d4b', fg: '#fff', kind: 'drugstore' },
  komeya: { ja: 'おむすび こめ屋', en: 'Omusubi Komeya', bg: '#f4efe2', fg: '#2f3a2c', kind: 'bento' },
  shirasagi: { ja: '白鷺茶房', en: 'Shirasagi Tea Room', bg: '#4a5d3a', fg: '#f1ead8', kind: 'cafe' },
  tsubakiShobo: { ja: 'つばき書房', en: 'Tsubaki Shobō', bg: '#7a2a32', fg: '#fbe9d0', kind: 'books' },
  // Corridor frontage (default look at interchange spines).
  kawasemi: { ja: 'くつ修理 かわせみ', en: 'Kawasemi Shoe Repair', bg: '#2b5d7c', fg: '#fff', kind: 'goods' },
  tanpopo: { ja: 'クリーニング たんぽぽ', en: 'Tanpopo Cleaning', bg: '#f6d743', fg: '#1b3a5c', kind: 'goods' },
  ginnando: { ja: 'せんべい 銀杏堂', en: 'Ginnan-dō Rice Crackers', bg: '#8a5a2b', fg: '#fbe9d0', kind: 'sweets' },
  mizuha: { ja: 'みずはモバイル', en: 'Mizuha Mobile', bg: '#00897b', fg: '#fff', kind: 'goods' },
  // Ichō Line halls (entry-specs.ts fill).
  narukoMarket: { ja: '産直市 なるこ', en: 'Naruko Farm Market', bg: '#6b8e23', fg: '#fff', kind: 'bento' },
} satisfies Record<string, Brand>;

/** All brands of one kind. */
export const brandsOf = (kind: ShopKind): Brand[] => Object.values(SHOPS).filter((s) => s.kind === kind);

// Goods on shelves: a small fixed palette per kind, so materials stay few.
const GOODS = ['#d94f3d', '#f2c14e', '#3c7dc4', '#6aa84f', '#e8e2d0', '#8e5ea2'];
const BREAD = ['#c98a4b', '#a8662f', '#e2b778', '#8a5a2b'];
const BLOOMS = ['#e84a6f', '#f6d743', '#f08a24', '#b05cc8', '#f4f4f4'];
const SWEETS = ['#f2d16b', '#e9b7c4', '#8bbf7a', '#f4efe2'];
const BOOKS = ['#1b3a5c', '#b23a3a', '#e8e2d0', '#3f6f4a', '#d9a400'];
export const PALETTES: Record<ShopKind, string[]> = {
  conbini: GOODS, kiosk: GOODS, soba: ['#e8e2d0', '#3a2a20', '#c9a46a'], bakery: BREAD, flowers: BLOOMS, cafe: ['#5b3a29', '#e8e2d0', '#a8662f'],
  sweets: SWEETS, drugstore: ['#ffffff', '#3c7dc4', '#6aa84f', '#e84a6f'], books: BOOKS, bento: ['#e8e2d0', '#b23a3a', '#6aa84f'],
  bank: ['#d6d9dc'], photo: GOODS, goods: SWEETS,
};

// ── Geometry helpers ─────────────────────────────────────────────────────────────────────────

/** Sorted [z0, z1] of the band between depths d0 and d1 in from long wall `s`. */
export function band(i: { cw: number }, s: Wall, d0: number, d1: number): Span {
  const a = s * (i.cw - d0), c = s * (i.cw - d1);
  return a < c ? [a, c] : [c, a];
}

/** A box against long wall `s`, x0 … x1 by depths d0 … d1. Decoration unless `solid`. */
export function wbox(i: ConcInfo, s: Wall, mat: string, x0: number, x1: number, y0: number, y1: number, d0: number, d1: number, solid = false) {
  const [za, zb] = band(i, s, d0, d1);
  i.b.box(mat, x0, y0, za, x1, y1, zb, solid);
}

/** A box along a run: `along` from p to q, across from at + c0 to at + c1. */
function abox(b: Builder, mat: string, axis: Axis, at: number, p: number, q: number, y0: number, y1: number, c0: number, c1: number) {
  if (axis === 'x') b.deco(mat, p, y0, at + c0, q, y1, at + c1);
  else b.deco(mat, at + c0, y0, p, at + c1, y1, q);
}

/** `span` minus the `gaps`, as sorted pieces. */
export function cut(span: Span, gaps: Span[] = []): Span[] {
  let out: Span[] = [[Math.min(...span), Math.max(...span)]];
  for (const [g0, g1] of gaps) {
    out = out.flatMap(([a, c]): Span[] => (g1 <= a || g0 >= c ? [[a, c]] : [...(g0 > a ? [[a, g0] as Span] : []), ...(g1 < c ? [[g1, c] as Span] : [])]));
  }
  return out.filter(([a, c]) => c - a > 0.05);
}

/** Every gap in the long walls (exit doorways and room mouths), as x-ranges, either wall (see ConcInfo.openings). */
export const doorways = (i: ConcInfo): Span[] => i.openings.map((o): Span => [o.x0, o.x1]);

/** Where the kit put the toilets: centred on x on the −z wall (moved off any stairwell or mouth). */
export const toiletX = (i: ConcInfo) => i.toilets;

/**
 * Try `tryAt(s, x0)` along the walls until it returns true: both walls (the first chosen by
 * seed), each range (default: the paid area) scanned in 0.5 m steps from a seeded start.
 * `w` is the item's length. Returns false if nothing fitted.
 */
export function placeAlong(i: ConcInfo, w: number, tryAt: (s: Wall, x0: number) => boolean, ranges: Span[] = [i.paid], walls?: Wall[]): boolean {
  const s0: Wall = i.rand() < 0.5 ? 1 : -1;
  for (const s of walls ?? [s0, -s0 as Wall]) {
    for (const [a, c] of ranges) {
      const n = Math.floor((c - a - w - 0.4) / 0.5);
      if (n < 0) continue;
      const k0 = Math.floor(i.rand() * (n + 1));
      for (let k = 0; k <= n; k++) if (tryAt(s, a + 0.2 + ((k0 + k) % (n + 1)) * 0.5)) return true;
    }
  }
  return false;
}

// ── Shop fronts ──────────────────────────────────────────────────────────────────────────────

/** Height of a shop fascia's underside above the floor (the fascia runs up to the ceiling). */
export const FASCIA = 2.35;

export interface ShopOpts {
  s: Wall;
  x0: number;
  x1: number;
  brand: Brand;
  /** How far the shop stands out from the wall: 0.3 flush glazed … 1.6 counter or stall. */
  depth?: number;
  /** 'glazed': shop window and door. 'counter': open counter, staff behind. 'stall': goods on a stepped stand. */
  front?: 'glazed' | 'counter' | 'stall';
  /** Glazed: x of the door's centre (default near x1), or false for none. */
  door?: number | false;
  /** Striped awning under the fascia (colour, or true for the brand colour). */
  awning?: string | boolean;
  /** Warm light inside (default true). */
  glow?: boolean;
  /** Counter fronts: a noren under the fascia, colour + text. */
  noren?: { color: string; text?: string; fg?: string };
  /** Shell finish (default pale enamel). */
  body?: string;
  /** Goods colours (default by brand kind). */
  goods?: string[];
  /** Room kept free in front, checked and claimed (default 1.2). */
  clear?: number;
  /** Fewer shelves and larger goods (long runs of shops, to keep the part count down). */
  lite?: boolean;
}

/** Fascia sign widths come from a few sizes, so sign textures are shared. */
const fasciaW = (len: number) => Math.max(1, Math.min(6, Math.floor((len - 0.3) * 2) / 2));

// ── Faces ────────────────────────────────────────────────────────────────────────────────────

/**
 * A vertical face to build against, anywhere: it runs along `axis`, its back plane is at cross
 * position `at` (z for an 'x' face, x for a 'z' face) and it faces `n` (±1 across). Positions
 * along it are `u`; depths are measured out from the back plane. Long wall `s` is
 * `wallFace(i, s)`; a shop island has a face on each side of its spine.
 */
export interface Face {
  axis: Axis;
  at: number;
  n: Wall;
}

/** The face of long wall `s` (runs along x, faces into the hall). */
export const wallFace = (i: { cw: number }, s: Wall): Face => ({ axis: 'x', at: s * i.cw, n: -s as Wall });

/** A box on face `f`: along u0 … u1, depths d0 … d1 out from its back plane. Decoration unless `solid`. */
export function fbox(b: Builder, f: Face, mat: string, u0: number, u1: number, y0: number, y1: number, d0: number, d1: number, solid = false) {
  const p = f.at + f.n * d0, q = f.at + f.n * d1;
  if (f.axis === 'x') b.box(mat, u0, y0, Math.min(p, q), u1, y1, Math.max(p, q), solid);
  else b.box(mat, Math.min(p, q), y0, u0, Math.max(p, q), y1, u1, solid);
}

/** The point at `u` along face `f`, `d` out from its back plane, as [x, z]. */
export const fpt = (f: Face, u: number, d: number): [number, number] => (f.axis === 'x' ? [u, f.at + f.n * d] : [f.at + f.n * d, u]);

/** The way face `f` faces, as a sign normal. */
export const fnormal = (f: Face): [number, number] => (f.axis === 'x' ? [0, f.n] : [f.n, 0]);

/** Shelves of goods against a face: boards at heights `ys`, coloured blocks about every `pitch` m on each. */
function shelves(b: Builder, f: Face, x0: number, x1: number, ys: number[], d0: number, d1: number, cols: string[], h = 0.3, pitch = 0.9) {
  const n = Math.max(1, Math.round((x1 - x0) / pitch));
  const w = (x1 - x0) / n;
  ys.forEach((y, r) => {
    fbox(b, f, 'flat:#d9d4c7', x0, x1, y - 0.025, y, d0, d1);
    for (let k = 0; k < n; k++) {
      const col = cols[(k + r * 2) % cols.length];
      fbox(b, f, `flat:${col}`, x0 + k * w + 0.04, x0 + (k + 1) * w - 0.04, y, y + h * (0.75 + 0.25 * hash(k + r * 7, x0)), d0 + 0.02, d1 - 0.03);
    }
  });
}

/** A shop on any face: `ShopOpts` without the wall, x0 … x1 being positions along the face. */
type FaceShop = Omit<ShopOpts, 's' | 'clear'> & {
  /** Top of the fascia (default the ceiling). Below it the sign shrinks to fit. */
  top?: number;
  /** Fewer shelves and larger goods (islands, to keep the part count down). */
  lite?: boolean;
};

/**
 * The shop itself against face `f`, no checks: fascia with the brand's sign (cf + 2.35 … top),
 * pilasters, and a glazed front with a door, an open counter, or a stall of goods. Solid over
 * x0 … x1 × depth.
 */
function shopFace(i: Has & { cf: number; clear: number }, f: Face, o: FaceShop) {
  const { b, cf } = i;
  const { x0, x1, brand } = o;
  const d = o.depth ?? 0.3, front = o.front ?? 'glazed';
  const top = o.top ?? cf + i.clear, fy = cf + FASCIA;
  const body = o.body ?? 'flat:#ebe8e0';
  const goods = o.goods ?? PALETTES[brand.kind];
  const xa = x0 + 0.12, xb = x1 - 0.12;
  const box = (mat: string, u0: number, u1: number, y0: number, y1: number, d0: number, d1: number, solid = false) => fbox(b, f, mat, u0, u1, y0, y1, d0, d1, solid);
  const lite = !!o.lite, pitch = lite ? 1.4 : 0.9;

  // Fascia and sign, a brand-colour stripe under it, pilasters at both ends.
  box(body, x0, x1, fy, top, 0, d);
  box(`flat:${brand.bg}`, x0, x1, fy, fy + 0.06, d, d + 0.01);
  const sh = o.top === undefined ? 0.5 : Math.max(0.2, Math.min(0.5, top - fy - 0.12));
  const sy = o.top === undefined ? fy + 0.34 : (fy + 0.06 + top) / 2;
  const [sx, sz] = fpt(f, (x0 + x1) / 2, d + 0.015);
  b.sign({ k: 'shop', ja: brand.ja, en: brand.en, bg: brand.bg, fg: brand.fg }, sx, sy, sz, fnormal(f), fasciaW(x1 - x0), sh);
  box(body, x0, xa, cf, fy, 0, d, true);
  box(body, xb, x1, cf, fy, 0, d, true);
  // The back wall inside, and a warm strip light under the fascia.
  box('flat:#f1ebdd', xa, xb, cf, fy, 0, 0.02);
  if (o.glow !== false) box('glow:#fff1d6', xa + 0.1, xb - 0.1, fy - 0.06, fy - 0.02, 0.02, Math.min(0.3, d - 0.06));

  if (front === 'glazed') {
    box('none', xa, xb, cf, fy, 0, d, true);
    shelves(b, f, xa + 0.1, xb - 0.1, lite ? [cf + 0.7, cf + 1.4] : [cf + 0.55, cf + 1.1, cf + 1.65], 0.02, Math.min(0.45, d - 0.06), goods, 0.3, pitch);
    const door = o.door === false ? null : (o.door ?? xb - 0.7);
    const gaps: Span[] = door === null ? [] : [[door - 0.5, door + 0.5]];
    for (const [p, q] of cut([xa, xb], gaps)) {
      box('flat:#3a3d41', p, q, cf, cf + 0.3, d - 0.05, d);
      box('glass', p, q, cf + 0.3, fy, d - 0.025, d - 0.012);
      // Mullions about every 1.6 m.
      const m = Math.round((q - p) / 1.6);
      for (let k = 1; k < m; k++) {
        const x = p + ((q - p) * k) / m;
        box('metal:#b9bdc2', x - 0.025, x + 0.025, cf + 0.3, fy, d - 0.04, d);
      }
    }
    if (door !== null) {
      box('metal:#b9bdc2', door - 0.5, door + 0.5, cf + 2.1, fy, d - 0.05, d);
      box('glassTint', door - 0.47, door + 0.47, cf, cf + 2.1, d - 0.03, d - 0.015);
      box('metal:#b9bdc2', door - 0.05, door + 0.05, cf + 0.9, cf + 1.2, d - 0.015, d + 0.03);
    }
  } else {
    // Staff space behind a counter or stall: nobody walks in there.
    const back = front === 'counter' ? 0.55 : 0.75;
    box('none', xa, xb, cf, fy, 0, d - back, true);
    shelves(b, f, xa + 0.1, xb - 0.1, lite ? [cf + 1.4] : [cf + 1.15, cf + 1.65], 0.02, Math.min(0.35, d - back - 0.05), goods, 0.3, pitch);
    if (front === 'counter') {
      box(o.body ?? 'flat:#d8d2c4', xa, xb, cf + 0.12, cf + 0.95, d - 0.5, d, true);
      box('flat:#3a3d41', xa, xb, cf, cf + 0.12, d - 0.5, d - 0.03, true);
      box('wood:#9a7650', xa, xb, cf + 0.95, cf + 1.0, d - 0.55, d + 0.05);
      // Goods on the counter's front (papers, snacks).
      if (brand.kind === 'kiosk') shelves(b, f, xa + 0.05, xb - 0.05, lite ? [cf + 0.5] : [cf + 0.35, cf + 0.65], d - 0.02, d + 0.12, goods, 0.22, pitch);
    } else {
      // Two-step stand, goods on both steps (a flower stall puts buckets on the lower one).
      box('flat:#6b5a48', xa, xb, cf, cf + 0.5, d - 0.7, d, true);
      box('flat:#6b5a48', xa, xb, cf + 0.5, cf + 0.85, d - 0.7, d - 0.35, true);
      if (brand.kind !== 'flowers') shelves(b, f, xa + 0.05, xb - 0.05, [cf + 0.5], d - 0.33, d - 0.02, goods, 0.25, pitch);
      shelves(b, f, xa + 0.05, xb - 0.05, [cf + 0.85], d - 0.68, d - 0.37, goods, 0.3, pitch);
    }
    if (o.noren) noren(i, f.axis, f.at + f.n * (d - 0.03), xa, xb, fy, { color: o.noren.color, text: o.noren.text, fg: o.noren.fg, face: f.n });
  }

  if (o.awning) {
    const col = o.awning === true ? brand.bg : o.awning;
    // Canopy at cf + 2.36 … 2.4 and a striped valance down to cf + 2.3 (white stripes in front).
    box(`flat:${col}`, x0, x1, cf + 2.36, cf + 2.4, d, d + 0.55);
    box(`flat:${col}`, x0, x1, cf + 2.3, cf + 2.4, d + 0.55, d + 0.555);
    const n = Math.max(2, Math.round((x1 - x0) / 0.5));
    for (let k = 0; k < n; k += 2) {
      const p = x0 + ((x1 - x0) * k) / n, q = x0 + ((x1 - x0) * (k + 1)) / n;
      box('flat:#f4f1e6', p, q, cf + 2.3, cf + 2.4, d + 0.555, d + 0.565);
    }
  }
}

/**
 * A shop against long wall `s`, from x0 to x1, standing `depth` out from the wall: fascia with
 * the brand's sign (cf + 2.35 … ceiling), pilasters, and a glazed front with a door, an open
 * counter, or a stall of goods. Solid over its whole footprint. Checks and claims
 * x0 … x1 × depth + clear; returns false (building nothing) if that is not free.
 */
export function shopFront(i: ConcInfo, o: ShopOpts): boolean {
  const d = o.depth ?? 0.3, clear = o.clear ?? 1.2;
  const [za, zb] = band(i, o.s, 0, d + clear);
  if (o.x1 - o.x0 < 1.2 || !i.free(o.x0, za, o.x1, zb)) return false;
  i.claim(o.x0, za, o.x1, zb);
  shopFace(i, wallFace(i, o.s), o);
  return true;
}

// ── Shop presets (all against long wall `s`, starting at x0; return false if not free) ────────

/** Convenience store: a glazed front `w` long (default 6), 0.6 deep, door near x1. */
export const conbini = (i: ConcInfo, s: Wall, x0: number, brand: Brand = SHOPS.maruhoshiMart, w = 6) =>
  shopFront(i, { s, x0, x1: x0 + w, brand, depth: 0.6, front: 'glazed', door: x0 + w - 1.0 });

/** Station kiosk against the wall: open counter with papers and snacks, 2.4 long, 1.0 deep. */
export const kioskStall = (i: ConcInfo, s: Wall, x0: number, brand: Brand = SHOPS.maruhoshiKiosk, w = 2.4) =>
  shopFront(i, { s, x0, x1: x0 + w, brand, depth: 1.0, front: 'counter' });

/** Standing soba/udon counter (立ち食い): deep counter with a noren, 3.6 long, 1.4 deep. */
export const sobaStand = (i: ConcInfo, s: Wall, x0: number, brand: Brand = SHOPS.sobaMio, w = 3.6) =>
  shopFront(i, {
    s, x0, x1: x0 + w, brand, depth: 1.4, front: 'counter', body: 'wood:#7a5a3a',
    noren: { color: brand.bg === '#f6efe0' ? '#7a2a12' : brand.bg, text: /うどん/.test(brand.ja) ? 'うどん' : 'そば', fg: '#fff' },
  });

/** Bakery: glazed front with an awning and a warm glow, 4 long, 0.8 deep. */
export const bakery = (i: ConcInfo, s: Wall, x0: number, brand: Brand = SHOPS.bakeryKomugi, w = 4) =>
  shopFront(i, { s, x0, x1: x0 + w, brand, depth: 0.8, front: 'glazed', awning: true, door: x0 + 0.9 });

/** Café or juice stand: glazed (w ≥ 4) or a counter (shorter). */
export const cafe = (i: ConcInfo, s: Wall, x0: number, brand: Brand = SHOPS.akaneCoffee, w = 4.5) =>
  w >= 4
    ? shopFront(i, { s, x0, x1: x0 + w, brand, depth: 0.8, front: 'glazed', body: 'wood:#6b4a32', door: x0 + 0.9 })
    : shopFront(i, { s, x0, x1: x0 + w, brand, depth: 1.0, front: 'counter' });

/** Flower stall: buckets on a stepped stand, 3 long, 1.4 deep, with an awning. */
export function flowerStall(i: ConcInfo, s: Wall, x0: number, brand: Brand = SHOPS.yanagiFlowers, w = 3): boolean {
  if (!shopFront(i, { s, x0, x1: x0 + w, brand, depth: 1.4, front: 'stall', awning: '#2e6b35' })) return false;
  // Buckets of cut flowers on the stand's lower step (depth 1.05 … 1.4, top cf + 0.5).
  const n = Math.floor((w - 0.4) / 0.45);
  for (let k = 0; k < n; k++) {
    const x = x0 + 0.42 + k * 0.45;
    const z = s * (i.cw - 1.22);
    i.b.mesh('metal:#9da2a8', 'cyl', x, i.cf + 0.62, z, 0.3, 0.24, 0.3);
    i.b.mesh(`flat:${BLOOMS[k % BLOOMS.length]}`, 'sphere', x, i.cf + 0.84, z, 0.36, 0.3, 0.36);
  }
  return true;
}

/** Coin lockers: `n` banks 1.6 long, 0.6 deep, 1.9 high, with a label above. */
export function lockers(i: ConcInfo, s: Wall, x0: number, n = 2): boolean {
  const w = n * 1.6, [za, zb] = band(i, s, 0, 1.6);
  if (!i.free(x0, za, x0 + w, zb)) return false;
  i.claim(x0, za, x0 + w, zb);
  const { b, cf } = i;
  wbox(i, s, 'flat:#e9e4d8', x0, x0 + w, cf, cf + 1.9, 0, 0.6, true);
  wbox(i, s, 'flat:#c9c3b4', x0 - 0.02, x0 + w + 0.02, cf + 1.9, cf + 1.96, 0, 0.62);
  for (let k = 0; k < n; k++) b.sign({ k: 'machine', v: 'locker' }, x0 + 0.8 + k * 1.6, cf + 0.95, s * (i.cw - 0.61), [0, -s], 1.58, 1.88);
  b.sign({ k: 'label', text: 'コインロッカー', sub: 'Coin lockers', fg: '#fff', bg: '#2b4c7e' }, x0 + w / 2, cf + 2.15, s * (i.cw - 0.03), [0, -s], 1.6, 0.3);
  return true;
}

/** Photo booth: 1.0 long, 1.5 deep, curtain on its +x side. */
export function photoBooth(i: ConcInfo, s: Wall, x0: number, brand: Brand = SHOPS.photoMinato): boolean {
  const [za, zb] = band(i, s, 0, 2.5);
  if (!i.free(x0, za, x0 + 1.7, zb)) return false;
  i.claim(x0, za, x0 + 1.7, zb);
  const { b, cf } = i;
  wbox(i, s, 'paint:#e3e6ea', x0, x0 + 1.0, cf, cf + 2.05, 0, 1.5, true);
  wbox(i, s, `flat:${brand.bg}`, x0 - 0.01, x0 + 1.01, cf + 1.75, cf + 2.05, 0, 1.51);
  wbox(i, s, 'flat:#2d4f8e', x0 + 1.0, x0 + 1.02, cf + 0.35, cf + 1.75, 0.2, 1.4);
  b.sign({ k: 'shop', ja: brand.ja, bg: brand.bg, fg: brand.fg }, x0 + 0.5, cf + 1.9, s * (i.cw - 1.52), [0, -s], 0.9, 0.26);
  b.sign({ k: 'shop', ja: '証明写真', bg: '#ffffff', fg: '#1b1b1b', vertical: true }, x0 + 0.5, cf + 1.05, s * (i.cw - 1.512), [0, -s], 0.42, 1.3);
  return true;
}

/** `n` drink machines (kit `vending`) with recycling bins beside them. */
export function vendingRow(i: ConcInfo, s: Wall, x0: number, n = 2, bins = true): boolean {
  const w = n * 1.05 + (bins ? 1.4 : 0), [za, zb] = band(i, s, 0, 1.9);
  if (!i.free(x0, za, x0 + w, zb)) return false;
  i.claim(x0, za, x0 + w, zb);
  for (let k = 0; k < n; k++) vending(i.b, x0 + 0.525 + k * 1.05, i.cf, s * (i.cw - 0.36), [0, -s], (k + Math.round(x0)) % 2 ? 'vending2' : 'vending');
  if (bins) binSet(i.b, i.cf, x0 + n * 1.05 + 0.75, s * (i.cw - 0.3), 'x');
  return true;
}

/** ATM corner: `n` cash machines between partitions, the bank's sign above. */
export function atmCorner(i: ConcInfo, s: Wall, x0: number, n = 2, brand: Brand = SHOPS.shinkin): boolean {
  const w = n * 0.9 + 0.3, [za, zb] = band(i, s, 0, 2.2);
  if (!i.free(x0, za, x0 + w, zb)) return false;
  i.claim(x0, za, x0 + w, zb);
  const { b, cf } = i;
  wbox(i, s, 'flat:#f1f1ee', x0, x0 + w, cf + FASCIA, cf + i.clear, 0, 1.0);
  b.sign({ k: 'shop', ja: brand.ja, en: brand.en, bg: brand.bg, fg: brand.fg }, x0 + w / 2, cf + FASCIA + 0.34, s * (i.cw - 1.015), [0, -s], fasciaW(w), 0.5);
  wbox(i, s, 'flat:#d6d9dc', x0, x0 + 0.15, cf, cf + FASCIA, 0, 1.0, true);
  wbox(i, s, 'flat:#d6d9dc', x0 + w - 0.15, x0 + w, cf, cf + FASCIA, 0, 1.0, true);
  wbox(i, s, 'flat:#e7e2d6', x0 + 0.15, x0 + w - 0.15, cf, cf + FASCIA, 0, 0.02);
  for (let k = 0; k < n; k++) {
    const p = x0 + 0.15 + k * 0.9 + 0.05, q = p + 0.8;
    wbox(i, s, 'paint:#c9ccd0', p, q, cf, cf + 1.0, 0, 0.7, true);
    wbox(i, s, 'paint:#c9ccd0', p, q, cf + 1.0, cf + 1.65, 0, 0.42);
    wbox(i, s, 'glow:#bfe4ff', p + 0.12, q - 0.12, cf + 1.1, cf + 1.45, 0.42, 0.43);
    wbox(i, s, 'flat:#3a3d41', p + 0.2, q - 0.2, cf + 0.98, cf + 1.0, 0.45, 0.65);
  }
  return true;
}

/** Lost-property (or information) window: a counter window in the wall with a label, 2.4 long. */
export function infoWindow(i: ConcInfo, s: Wall, x0: number, label = { text: '忘れ物取扱所', sub: 'Lost property' }): boolean {
  const [za, zb] = band(i, s, 0, 1.5);
  if (!i.free(x0, za, x0 + 2.4, zb)) return false;
  i.claim(x0, za, x0 + 2.4, zb);
  const { b, cf } = i;
  wbox(i, s, 'flat:#c9ccd0', x0, x0 + 2.4, cf, cf + 2.3, 0, 0.3, true);
  wbox(i, s, 'flat:#e8eaec', x0 + 0.2, x0 + 2.2, cf + 0.95, cf + 1.9, 0.3, 0.31);
  wbox(i, s, 'flat:#7d9fb3', x0 + 0.3, x0 + 2.1, cf + 1.2, cf + 1.85, 0.31, 0.315);
  wbox(i, s, 'glass', x0 + 0.3, x0 + 2.1, cf + 1.2, cf + 1.85, 0.33, 0.335);
  wbox(i, s, 'flat:#b9bdc2', x0 + 0.2, x0 + 2.2, cf + 1.0, cf + 1.05, 0.3, 0.55);
  b.sign({ k: 'label', text: label.text, sub: label.sub, fg: '#fff', bg: '#14233b' }, x0 + 1.2, cf + 2.1, s * (i.cw - 0.32), [0, -s], 2.0, 0.36);
  return true;
}

// ── Free-standing things (centred on x, z) ───────────────────────────────────────────────────

/**
 * Island kiosk, w × d (long side along x), 2.4 high, counters and signs on both long sides.
 * Needs `margin` (default 1.4) clear all round; claims footprint + 1 m.
 */
export function kiosk(i: ConcInfo, x: number, z: number, o: { w?: number; d?: number; brand?: Brand; margin?: number } = {}): boolean {
  const w = o.w ?? 3, d = o.d ?? 1.6, m = o.margin ?? 1.4, brand = o.brand ?? SHOPS.maruhoshiKiosk;
  const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2;
  if (!i.free(x0, z0, x1, z1, m)) return false;
  i.claim(x0 - 1, z0 - 1, x1 + 1, z1 + 1);
  const { b, cf } = i;
  b.box('flat:#f4f1e6', x0, cf, z0 + 0.15, x1, cf + 2.4, z1 - 0.15);
  b.deco('flat:#3a3d41', x0 - 0.02, cf, z0 + 0.13, x1 + 0.02, cf + 0.1, z1 - 0.13);
  b.deco(`flat:${brand.bg}`, x0 - 0.05, cf + 1.95, z0 - 0.05, x1 + 0.05, cf + 2.45, z1 + 0.05);
  for (const sd of [-1, 1] as const) {
    const zf = sd > 0 ? z1 : z0;
    // Counter ledge and the goods racks under it.
    b.box('wood:#9a7650', x0, cf + 0.95, Math.min(zf, zf - sd * 0.15), x1, cf + 1.0, Math.max(zf, zf - sd * 0.15));
    for (let k = 0; k < 4; k++) {
      const p = x0 + 0.1 + (k * (w - 0.2)) / 4;
      b.deco(`flat:${GOODS[(k + (sd > 0 ? 2 : 0)) % GOODS.length]}`, p + 0.03, cf + 0.3, Math.min(zf - sd * 0.15, zf - sd * 0.13), p + (w - 0.2) / 4 - 0.03, cf + 0.85, Math.max(zf - sd * 0.15, zf - sd * 0.13));
    }
    b.deco('glassDark', x0 + 0.15, cf + 1.05, Math.min(zf - sd * 0.15, zf - sd * 0.14), x1 - 0.15, cf + 1.9, Math.max(zf - sd * 0.15, zf - sd * 0.14));
    b.sign({ k: 'shop', ja: brand.ja, en: brand.en, bg: brand.bg, fg: brand.fg }, x, cf + 2.2, zf + sd * 0.06, [0, sd], fasciaW(w), 0.45);
  }
  return true;
}

/**
 * Free-standing advert column, 2·half square, floor to cf + 2.25, posters on all four faces.
 * Needs `margin` (default 1.6) clear all round.
 */
export function adColumn(i: ConcInfo, x: number, z: number, o: { half?: number; margin?: number; mat?: string; trim?: string; v?: number } = {}): boolean {
  const h = o.half ?? 0.4, m = o.margin ?? 1.6;
  if (!i.free(x - h, z - h, x + h, z + h, m)) return false;
  i.claim(x - h - 0.6, z - h - 0.6, x + h + 0.6, z + h + 0.6);
  i.b.block(x - h, i.cf, z - h, x + h, i.cf + 2.25, z + h);
  adPillar(i, x, z, i.cf, i.cf + 2.25, { half: h, mat: o.mat, trim: o.trim, v: o.v, cap: true });
  return true;
}

/** Bench `len` long (along `axis`), seat 0.45 high, solid. Needs `margin` (default 0.9) clear. */
export function bench(i: ConcInfo, x: number, z: number, o: { axis?: Axis; len?: number; color?: string; margin?: number } = {}): boolean {
  const len = o.len ?? 1.8, ax = o.axis ?? 'x', m = o.margin ?? 0.9;
  const hx = ax === 'x' ? len / 2 : 0.25, hz = ax === 'x' ? 0.25 : len / 2;
  if (!i.free(x - hx, z - hz, x + hx, z + hz, m)) return false;
  i.claim(x - hx - 0.5, z - hz - 0.5, x + hx + 0.5, z + hz + 0.5);
  const { b, cf } = i, col = o.color ?? '#7f858b';
  b.block(x - hx, cf, z - hz, x + hx, cf + 0.45, z + hz);
  b.deco(`paint:${col}`, x - hx, cf + 0.4, z - hz, x + hx, cf + 0.46, z + hz);
  for (const k of [-1, 1]) {
    const lx = ax === 'x' ? x + k * (hx - 0.15) : x, lz = ax === 'x' ? z : z + k * (hz - 0.15);
    b.deco('metal:#7f858b', lx - (ax === 'x' ? 0.03 : hx - 0.02), cf, lz - (ax === 'x' ? hz - 0.02 : 0.03), lx + (ax === 'x' ? 0.03 : hx - 0.02), cf + 0.4, lz + (ax === 'x' ? hz - 0.02 : 0.03));
  }
  return true;
}

/** Three recycling bins in a row (cans, bottles, other), no checks. */
function binSet(b: Builder, cf: number, x: number, z: number, axis: Axis) {
  const lids = ['#1565c0', '#2e7d32', '#c62828'];
  for (let k = 0; k < 3; k++) {
    const o = (k - 1) * 0.42;
    const [cx, cz] = axis === 'x' ? [x + o, z] : [x, z + o];
    b.box('flat:#9aa0a6', cx - 0.19, cf, cz - 0.19, cx + 0.19, cf + 0.9, cz + 0.19);
    b.deco(`paint:${lids[k]}`, cx - 0.2, cf + 0.9, cz - 0.2, cx + 0.2, cf + 0.96, cz + 0.2);
  }
}

/** Recycling bins (three in a row along `axis`, 1.3 × 0.4), solid. Needs 0.6 m clear. */
export function bin(i: ConcInfo, x: number, z: number, axis: Axis = 'x'): boolean {
  const hx = axis === 'x' ? 0.65 : 0.2, hz = axis === 'x' ? 0.2 : 0.65;
  if (!i.free(x - hx, z - hz, x + hx, z + hz, 0.6)) return false;
  i.claim(x - hx - 0.4, z - hz - 0.4, x + hx + 0.4, z + hz + 0.4);
  binSet(i.b, i.cf, x, z, axis);
  return true;
}

/** Planter box w × d, 0.55 high, with shrubs. Needs `margin` (default 0.9) clear. */
export function planter(i: ConcInfo, x: number, z: number, o: { w?: number; d?: number; mat?: string; margin?: number } = {}): boolean {
  const w = o.w ?? 1.2, d = o.d ?? 0.6, m = o.margin ?? 0.9;
  if (!i.free(x - w / 2, z - d / 2, x + w / 2, z + d / 2, m)) return false;
  i.claim(x - w / 2 - 0.4, z - d / 2 - 0.4, x + w / 2 + 0.4, z + d / 2 + 0.4);
  const { b, cf } = i;
  b.box(o.mat ?? 'flat:#5b5f63', x - w / 2, cf, z - d / 2, x + w / 2, cf + 0.55, z + d / 2);
  b.deco('flat:#3b2e24', x - w / 2 + 0.05, cf + 0.55, z - d / 2 + 0.05, x + w / 2 - 0.05, cf + 0.56, z + d / 2 - 0.05);
  const n = Math.max(1, Math.round(w / 0.5));
  for (let k = 0; k < n; k++) {
    const px = x - w / 2 + (k + 0.5) * (w / n);
    b.mesh(k % 2 ? 'flat:#3d6b2f' : 'flat:#4f7d3a', 'sphere', px, cf + 0.75, z, w / n + 0.1, 0.55, d + 0.05);
  }
  return true;
}

// ── Islands (free-standing blocks in the middle of the floor, on x0 … x1 × z0 … z1) ────────────
//
// Each runs along its longer side. It checks `margin` (default 1.2) clear all round, builds
// nothing and returns false if that is not free, and otherwise claims its footprint plus
// `room` (default 1.0) all round to stand at it. Keep the aisles round them (3 m or more) in
// the caller: pillars may stand in an aisle, so the margin here is only a minimum.

/** A unit of a shop island: a brand (glazed, or the island's front), or a brand with its own front. */
export type IslandUnit = Brand | { brand: Brand; front?: ShopOpts['front']; awning?: string | boolean; noren?: ShopOpts['noren']; body?: string };

export interface IslandOpts {
  /** Units along the low face (towards −z on an x island, −x on a z island), in order along it. */
  lo: IslandUnit[];
  /** Units along the high face. */
  hi: IslandUnit[];
  /** A unit across each short end (low end, high end; counters unless they say), or null for a blank end with a poster. */
  ends?: [IslandUnit | null, IslandUnit | null];
  /** Front of units that do not say (default 'glazed'). */
  front?: ShopOpts['front'];
  /** Top of the fascias above the floor (default 2.85); `clear` or more runs to the ceiling. */
  height?: number;
  /** Fill from the fascias up to the ceiling (a finish, or true for the shell's) so the block reads as built in. */
  bulkhead?: string | boolean;
  /** Shell finish: fascias, pilasters, ends (default pale enamel). */
  body?: string;
  glow?: boolean;
  margin?: number;
  room?: number;
}

const unitOf = (u: IslandUnit) => ('kind' in u ? { brand: u } : u);

/** Island footprint check and claim; returns the long axis, or null if it does not fit. */
function islandSite(i: ConcInfo, x0: number, z0: number, x1: number, z1: number, margin = 1.2, room = 1.0): Axis | null {
  if (!(x1 > x0 && z1 > z0) || !i.free(x0, z0, x1, z1, margin)) return null;
  i.claim(x0 - room, z0 - room, x1 + room, z1 + room);
  return x1 - x0 >= z1 - z0 ? 'x' : 'z';
}

/**
 * Shop island: a block of back-to-back shop units, a solid core with shop fronts (fascia and
 * sign, glazing or an open counter, pilasters, warm light, goods) along both long faces, each
 * face shared evenly by its units, and a unit or a poster panel across each short end. The
 * fascias stop at cf + `height` under a dark cap, or run to the ceiling; `bulkhead` fills
 * above them. Wants 2.4 m or more along and 1.8 m or more across.
 */
export function shopIsland(i: ConcInfo, x0: number, z0: number, x1: number, z1: number, o: IslandOpts): boolean {
  const L = Math.max(x1 - x0, z1 - z0), D = Math.min(x1 - x0, z1 - z0);
  if (L < 2.4 || D < 1.8) return false;
  const ax = islandSite(i, x0, z0, x1, z1, o.margin, o.room);
  if (!ax) return false;
  const { b, cf } = i;
  const [u0, u1, c0, c1] = ax === 'x' ? [x0, x1, z0, z1] : [z0, z1, x0, x1];
  const half = (c1 - c0) / 2, mid = (c0 + c1) / 2, across: Axis = ax === 'x' ? 'z' : 'x';
  const ceil = cf + i.clear, top = Math.min(ceil, cf + (o.height ?? 2.85));
  const body = o.body ?? 'flat:#ebe8e0';
  const endD = Math.min(1.4, L / 4);
  const e0 = o.ends?.[0] ? endD : 0, e1 = o.ends?.[1] ? endD : 0;
  // A counter or stall needs room behind it; a shallower unit is glazed.
  const frontFor = (f: ShopOpts['front'], d: number): ShopOpts['front'] => {
    const fr = f ?? o.front ?? 'glazed';
    return d < (fr === 'stall' ? 1.1 : fr === 'counter' ? 0.9 : 0) ? 'glazed' : fr;
  };
  const build = (f: Face, a: number, c: number, d: number, u: IslandUnit, door: number | false) => {
    const v = unitOf(u), front = frontFor(v.front, d);
    shopFace(i, f, {
      x0: a, x1: c, brand: v.brand, depth: d, front, top, lite: true, glow: o.glow,
      body: v.body ?? o.body, awning: v.awning, noren: v.noren, door: front === 'glazed' ? door : false,
    });
  };

  // One collider for the whole block (the units add their own inside it).
  b.block(x0, cf, z0, x1, cf + 2.3, z1);
  for (const [n, list] of [[-1, o.lo], [1, o.hi]] as const) {
    const f: Face = { axis: ax, at: mid, n };
    const len = L - e0 - e1, us = list.slice(0, Math.max(1, Math.floor(len / 1.8)));
    const w = len / Math.max(1, us.length);
    if (!us.length) {
      // A blank face: shell, skirting and a poster.
      fbox(b, f, body, u0 + e0, u1 - e1, cf, top, 0, half);
      fbox(b, f, 'flat:#4b4d50', u0 + e0, u1 - e1, cf, cf + 0.13, half, half + 0.018);
      const [px, pz] = fpt(f, (u0 + u1) / 2, half + 0.03);
      b.sign({ k: 'poster', v: Math.floor(hash(Math.round(px * 3 + pz * 7)) * 8) }, px, cf + 1.5, pz, fnormal(f), 1.25, 1.75);
      continue;
    }
    us.forEach((u, k) => {
      const a = u0 + e0 + k * w, c = a + w;
      build(f, a, c, half, u, w >= 2.2 ? (k % 2 ? c - 0.75 : a + 0.75) : false);
    });
  }
  ([[0, u0, e0, -1], [1, u1, e1, 1]] as const).forEach(([k, u, e, n]) => {
    const unit = o.ends?.[k];
    if (unit && e > 0) {
      const v = unitOf(unit);
      build({ axis: across, at: u - n * e, n }, c0, c1, e, { ...v, front: v.front ?? 'counter' }, false);
      return;
    }
    // A blank end: the shell, skirting and a framed poster.
    const f: Face = { axis: across, at: u, n };
    fbox(b, f, 'flat:#4b4d50', c0, c1, cf, cf + 0.13, 0, 0.018);
    if (c1 - c0 >= 1.5) {
      const w = Math.min(1.25, c1 - c0 - 0.5), [px, pz] = fpt(f, mid, 0.03);
      fbox(b, f, 'flat:#c9c9c4', mid - w / 2 - 0.04, mid + w / 2 + 0.04, cf + 0.56, cf + 2.04, 0.008, 0.022);
      b.sign({ k: 'poster', v: Math.floor(hash(Math.round(px * 3 + pz * 7)) * 8) }, px, cf + 1.3, pz, fnormal(f), w, 1.4);
    }
  });
  // A dark cap on the fascias, and a bulkhead above if asked.
  if (top < ceil - 0.02) {
    b.deco('flat:#3a3d41', x0 - 0.01, top - 0.04, z0 - 0.01, x1 + 0.01, top + 0.01, z1 + 0.01);
    if (o.bulkhead) b.deco(typeof o.bulkhead === 'string' ? o.bulkhead : body, x0 + 0.05, top + 0.01, z0 + 0.05, x1 - 0.05, ceil, z1 - 0.05);
  }
  return true;
}

/**
 * Vending island: `n` drink machines (kit `vending`) back to back each side of a spine wall,
 * three recycling bins across one end. Footprint n·1.05 + 0.8 along by 1.52 across.
 */
export function vendingIsland(i: ConcInfo, x0: number, z0: number, x1: number, z1: number, o: { n?: number; bins?: boolean; margin?: number; room?: number } = {}): boolean {
  const bins = o.bins ?? true;
  if (Math.min(x1 - x0, z1 - z0) < 1.5 || Math.max(x1 - x0, z1 - z0) < 1.15 + (bins ? 0.7 : 0)) return false;
  const ax = islandSite(i, x0, z0, x1, z1, o.margin ?? 0.9, o.room);
  if (!ax) return false;
  const { b, cf } = i;
  const [u0, u1, c0, c1] = ax === 'x' ? [x0, x1, z0, z1] : [z0, z1, x0, x1];
  const mid = (c0 + c1) / 2;
  const n = Math.max(1, Math.min(o.n ?? 9, Math.floor((u1 - u0 - (bins ? 0.7 : 0) - 0.1) / 1.05)));
  const ue = u0 + 0.1 + n * 1.05;
  const spine: Face = { axis: ax, at: mid, n: 1 };
  fbox(b, spine, 'paint:#cfd3d6', u0, ue, cf, cf + 2.0, -0.04, 0.04, true);
  fbox(b, spine, 'flat:#3a3d41', u0 - 0.02, ue + 0.02, cf + 2.0, cf + 2.06, -0.06, 0.06);
  for (const s of [-1, 1] as const) {
    const f: Face = { axis: ax, at: mid, n: s };
    for (let k = 0; k < n; k++) {
      const [x, z] = fpt(f, u0 + 0.05 + 0.525 + k * 1.05, 0.41);
      vending(b, x, cf, z, fnormal(f), (k + (s > 0 ? 1 : 0)) % 2 ? 'vending2' : 'vending');
    }
  }
  if (bins) {
    const [x, z] = fpt(spine, Math.min(u1 - 0.3, ue + 0.4), 0);
    binSet(b, cf, x, z, ax === 'x' ? 'z' : 'x');
  }
  return true;
}

/**
 * Bench-and-planter island: a long planter of shrubs (a small tree in it if `tree`) with a
 * backless bench along each side. Footprint at least 2.4 along by 1.8 across.
 */
export function benchIsland(i: ConcInfo, x0: number, z0: number, x1: number, z1: number, o: { color?: string; mat?: string; tree?: boolean; margin?: number; room?: number } = {}): boolean {
  const ax = islandSite(i, x0, z0, x1, z1, o.margin ?? 0.9, o.room);
  if (!ax) return false;
  const { b, cf } = i;
  const [u0, u1, c0, c1] = ax === 'x' ? [x0, x1, z0, z1] : [z0, z1, x0, x1];
  const mid = (c0 + c1) / 2, half = (c1 - c0) / 2, pw = Math.max(0.5, half * 2 - 1.1) / 2;
  const f: Face = { axis: ax, at: mid, n: 1 };
  // The planter (solid), soil, and shrubs about every 0.8 m.
  fbox(b, f, o.mat ?? 'flat:#5b5f63', u0, u1, cf, cf + 0.55, -pw, pw, true);
  fbox(b, f, 'flat:#3b2e24', u0 + 0.05, u1 - 0.05, cf + 0.55, cf + 0.56, -pw + 0.05, pw - 0.05);
  const n = Math.max(2, Math.round((u1 - u0) / 0.8));
  for (let k = 0; k < n; k++) {
    if (o.tree && k === Math.floor(n / 2)) continue;
    const [x, z] = fpt(f, u0 + (k + 0.5) * ((u1 - u0) / n), 0);
    const w = (u1 - u0) / n + 0.1;
    b.mesh(k % 2 ? 'flat:#3d6b2f' : 'flat:#4f7d3a', 'sphere', x, cf + 0.75, z, ax === 'x' ? w : pw * 2 + 0.05, 0.55, ax === 'x' ? pw * 2 + 0.05 : w);
  }
  if (o.tree) {
    const [x, z] = fpt(f, (u0 + u1) / 2, 0);
    b.mesh('wood:#6b4a32', 'cyl', x, cf + 1.2, z, 0.14, 1.3, 0.14);
    b.mesh('flat:#4f7d3a', 'sphere', x, cf + 2.05, z, 1.1, 0.75, 1.1);
  }
  // A bench each side: 0.5 deep seat at 0.45 on two end legs.
  const col = o.color ?? '#7f858b';
  for (const s of [-1, 1] as const) {
    const fs: Face = { axis: ax, at: mid, n: s };
    const d0 = pw + 0.05, d1 = Math.min(half, d0 + 0.5);
    fbox(b, fs, 'none', u0 + 0.1, u1 - 0.1, cf, cf + 0.45, d0, d1, true);
    fbox(b, fs, `paint:${col}`, u0 + 0.1, u1 - 0.1, cf + 0.4, cf + 0.46, d0, d1);
    for (const u of [u0 + 0.3, u1 - 0.3]) fbox(b, fs, 'metal:#7f858b', u - 0.03, u + 0.03, cf, cf + 0.4, d0 + 0.03, d1 - 0.03);
  }
  return true;
}

/**
 * A row of free-standing advert totems along the footprint's long side: slim stands 0.6 wide,
 * 0.3 deep and 2.1 high about every `pitch` (2.2) m, a poster on each face (`digital`: a dark
 * screen with a lit top edge).
 */
export function totemRow(i: ConcInfo, x0: number, z0: number, x1: number, z1: number, o: { pitch?: number; digital?: boolean; trim?: string; margin?: number; room?: number } = {}): boolean {
  const ax = islandSite(i, x0, z0, x1, z1, o.margin ?? 0.9, o.room ?? 0.6);
  if (!ax) return false;
  const { b, cf } = i;
  const [u0, u1, c0, c1] = ax === 'x' ? [x0, x1, z0, z1] : [z0, z1, x0, x1];
  const mid = (c0 + c1) / 2, pitch = o.pitch ?? 2.2;
  const n = Math.max(1, Math.floor((u1 - u0 - 0.6) / pitch) + 1), start = (u0 + u1) / 2 - ((n - 1) * pitch) / 2;
  const f: Face = { axis: ax, at: mid, n: 1 };
  let v = Math.floor(hash(Math.round(mid * 5 + u0)) * 8);
  for (let k = 0; k < n; k++) {
    const u = start + k * pitch;
    fbox(b, f, o.digital ? 'flat:#16181b' : 'panel:#e9e8e2', u - 0.3, u + 0.3, cf, cf + 2.1, -0.15, 0.15, true);
    fbox(b, f, 'flat:#4b4d50', u - 0.31, u + 0.31, cf, cf + 0.12, -0.16, 0.16);
    fbox(b, f, o.trim ? `paint:${o.trim}` : 'flat:#3a3d41', u - 0.31, u + 0.31, cf + 2.06, cf + 2.12, -0.16, 0.16);
    for (const s of [-1, 1] as const) {
      const fs: Face = { axis: ax, at: mid, n: s };
      const [px, pz] = fpt(fs, u, 0.16);
      b.sign({ k: 'poster', v: v++ % 8 }, px, cf + 1.2, pz, fnormal(fs), 0.5, 1.5);
      if (o.digital) fbox(b, fs, 'glow:#9fd3ff', u - 0.26, u + 0.26, cf + 1.97, cf + 2.0, 0.15, 0.155);
    }
  }
  return true;
}

/**
 * Glazed waiting room: a glass box with a slim frame and a flat roof at cf + 2.4, a doorway
 * 1.2 m wide in the middle of the `door` face (±1 across, default +1), benches along the
 * other long side inside, and a label over the door. Wants 4 m or more along by 2.6 across.
 */
export function waitingRoom(i: ConcInfo, x0: number, z0: number, x1: number, z1: number, o: { door?: Wall; frame?: string; margin?: number; room?: number } = {}): boolean {
  if (Math.max(x1 - x0, z1 - z0) < 4 || Math.min(x1 - x0, z1 - z0) < 2.6) return false;
  const ax = islandSite(i, x0, z0, x1, z1, o.margin, o.room);
  if (!ax) return false;
  const { b, cf } = i;
  const [u0, u1, c0, c1] = ax === 'x' ? [x0, x1, z0, z1] : [z0, z1, x0, x1];
  const mid = (c0 + c1) / 2, half = (c1 - c0) / 2, dn = o.door ?? 1, um = (u0 + u1) / 2;
  const frame = o.frame ?? 'metal:#9da2a8', roof = cf + 2.4;
  const f: Face = { axis: ax, at: mid, n: dn };
  const back: Face = { axis: ax, at: mid, n: -dn as Wall };
  const ends: Face = { axis: ax === 'x' ? 'z' : 'x', at: (u0 + u1) / 2, n: 1 };
  // Glass walls (solid), the door face in two pieces either side of the doorway.
  for (const [p, q] of cut([u0, u1], [[um - 0.6, um + 0.6]])) fbox(b, f, 'glass', p, q, cf, roof, half - 0.03, half, true);
  fbox(b, back, 'glass', u0, u1, cf, roof, half - 0.03, half, true);
  for (const s of [-1, 1]) fbox(b, ends, 'glass', c0, c1, cf, roof, s * ((u1 - u0) / 2 - 0.03), s * (u1 - u0) / 2, true);
  // Frame: corner posts, door posts, the roof slab and its edge.
  for (const s of [-1, 1] as const) {
    for (const u of s === dn ? [u0, u1 - 0.06, um - 0.66, um + 0.6] : [u0, u1 - 0.06]) {
      fbox(b, { axis: ax, at: mid, n: s }, frame, u, u + 0.06, cf, roof, half - 0.06, half + 0.01);
    }
  }
  fbox(b, f, 'paint:#e6e5e0', u0 - 0.05, u1 + 0.05, roof, roof + 0.12, -half - 0.05, half + 0.05);
  fbox(b, f, frame, u0 - 0.06, u1 + 0.06, roof + 0.12, roof + 0.16, -half - 0.06, half + 0.06);
  fbox(b, f, 'light', u0 + 0.4, u1 - 0.4, roof - 0.015, roof, -0.15, 0.15);
  // Benches along the back wall, inside.
  fbox(b, back, 'none', u0 + 0.3, u1 - 0.3, cf, cf + 0.45, half - 0.6, half - 0.08, true);
  fbox(b, back, 'wood:#9a7650', u0 + 0.3, u1 - 0.3, cf + 0.4, cf + 0.46, half - 0.6, half - 0.08);
  fbox(b, back, 'metal:#7f858b', u0 + 0.3, u1 - 0.3, cf, cf + 0.4, half - 0.4, half - 0.3);
  const [lx, lz] = fpt(f, um, half + 0.07);
  b.sign({ k: 'label', text: '待合室', sub: 'Waiting room', fg: '#fff', bg: '#14233b' }, lx, roof + 0.06, lz, fnormal(f), 1.4, 0.28);
  return true;
}

// ── Pillars ──────────────────────────────────────────────────────────────────────────────────

/**
 * Square cladding round a pillar (or an advert column) from y0 to y1, 2·half square (default
 * 0.45), a dark base, a trim band at y0 + 2.2, and a 0.62 × 0.88 poster on each face. Decoration.
 */
export function adPillar(
  i: Has, x: number, z: number, y0: number, y1: number,
  o: { half?: number; mat?: string; trim?: string; v?: number; faces?: 2 | 4; cap?: boolean } = {},
) {
  const { b } = i, h = o.half ?? 0.45;
  b.deco(o.mat ?? 'tile:#e9e4d8', x - h, y0, z - h, x + h, y1, z + h);
  b.deco('flat:#4b4d50', x - h - 0.012, y0, z - h - 0.012, x + h + 0.012, y0 + 0.13, z + h + 0.012);
  if (o.trim) b.deco(`paint:${o.trim}`, x - h - 0.01, y0 + 2.2, z - h - 0.01, x + h + 0.01, y0 + 2.25, z + h + 0.01);
  if (o.cap) b.deco('flat:#3a3d41', x - h - 0.02, y1 - 0.05, z - h - 0.02, x + h + 0.02, y1, z + h + 0.02);
  let v = o.v ?? Math.floor(hash(Math.round(x * 3 + z * 7)) * 8);
  const faces: [number, number][] = o.faces === 2 ? [[1, 0], [-1, 0]] : [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (const [nx, nz] of faces) {
    // Frame 0.005 … 0.02 proud, poster 0.03 proud.
    const px = x + nx * (h + 0.0125), pz = z + nz * (h + 0.0125);
    b.deco('flat:#c9c9c4', px - (nx ? 0.0075 : 0.35), y0 + 0.95, pz - (nz ? 0.0075 : 0.35), px + (nx ? 0.0075 : 0.35), y0 + 1.95, pz + (nz ? 0.0075 : 0.35));
    b.sign({ k: 'poster', v: v++ % 8 }, x + nx * (h + 0.03), y0 + 1.45, z + nz * (h + 0.03), [nx, nz], 0.62, 0.88);
  }
}

/** Round clad pillar like the kit's: cylinder, steel rings top and bottom, a colour band. Decoration. */
export function roundPillar(i: Has, x: number, z: number, y0: number, y1: number, o: { mat: string; band: string; bandY?: number; half?: number }) {
  const d = (o.half ?? 0.35) * 2.2;
  i.b.mesh(o.mat, 'cyl', x, (y0 + y1) / 2, z, d, y1 - y0, d);
  i.b.mesh('metal:#9da2a8', 'cyl', x, y0 + 0.06, z, d + 0.07, 0.12, d + 0.07);
  i.b.mesh('metal:#9da2a8', 'cyl', x, y1 - 0.04, z, d + 0.07, 0.08, d + 0.07);
  i.b.mesh(`paint:${o.band}`, 'cyl', x, o.bandY ?? y0 + 2.27, z, d + 0.025, 0.15, d + 0.025);
}

// ── Ceiling: beams and service runs ──────────────────────────────────────────────────────────

/** Downstand beam across the concourse at x, `depth` below the ceiling (default 0.45), 0.4 wide. */
export function beam(i: ConcInfo, x: number, depth = 0.45, o: { w?: number; mat?: string; z0?: number; z1?: number } = {}) {
  const w = o.w ?? 0.4, top = i.cf + i.clear;
  i.b.deco(o.mat ?? 'flat:#dcd8cc', x - w / 2, top - depth, o.z0 ?? -i.cw, x + w / 2, top, o.z1 ?? i.cw);
}

export interface RunOpts {
  /** Pieces of the run left out (the run turns up into the ceiling either side). */
  gaps?: Span[];
  /** Turn up into the ceiling at the run's start / end (default true; false where it meets a wall). */
  rise?: [boolean, boolean];
}

/** Ends of the pieces of a run, and whether each end turns up. */
function pieces(from: number, to: number, o: RunOpts): { p: number; q: number; up0: boolean; up1: boolean }[] {
  const a = Math.min(from, to), c = Math.max(from, to);
  const [r0, r1] = o.rise ?? [true, true];
  return cut([a, c], o.gaps).map(([p, q]) => ({ p, q, up0: p > a + 0.01 || r0, up1: q < c - 0.01 || r1 }));
}

/**
 * Bundle of `n` square pipes (default 2, 0.1 m) along a run, `drop` (0.12) under the ceiling,
 * with hangers every 3 m and risers into the ceiling where the run stops.
 */
export function pipeRun(
  t: Has, axis: Axis, at: number, from: number, to: number, top: number,
  o: RunOpts & { n?: number; size?: number; drop?: number; mats?: string[] } = {},
) {
  const { b } = t;
  const n = o.n ?? 2, sz = o.size ?? 0.1, gap = 0.05, drop = o.drop ?? 0.12;
  const mats = o.mats ?? ['paint:#8c949b', 'paint:#b8b2a3'];
  const y1 = top - drop, y0 = y1 - sz;
  const span = n * sz + (n - 1) * gap;
  for (const { p, q, up0, up1 } of pieces(from, to, o)) {
    for (let k = 0; k < n; k++) {
      const c0 = -span / 2 + k * (sz + gap);
      abox(b, mats[k % mats.length], axis, at, p, q, y0, y1, c0, c0 + sz);
      if (up0) abox(b, mats[k % mats.length], axis, at, p, p + sz, y1, top, c0, c0 + sz);
      if (up1) abox(b, mats[k % mats.length], axis, at, q - sz, q, y1, top, c0, c0 + sz);
    }
    for (let x = p + 2; x < q - 0.5; x += 4) {
      abox(b, 'metal:#7f858b', axis, at, x - 0.02, x + 0.02, y0 - 0.03, y0, -span / 2 - 0.03, span / 2 + 0.03);
      abox(b, 'metal:#7f858b', axis, at, x - 0.015, x + 0.015, y0 - 0.03, top, span / 2 + 0.01, span / 2 + 0.03);
    }
  }
}

/** Rectangular ventilation duct (w 0.7 × h 0.35) 0.05 under the ceiling, flanged every 3.6 m. */
export function ductRun(t: Has, axis: Axis, at: number, from: number, to: number, top: number, o: RunOpts & { w?: number; h?: number; mat?: string } = {}) {
  const { b } = t;
  const w = o.w ?? 0.7, h = o.h ?? 0.35, mat = o.mat ?? 'metal:#aeb3b8';
  const y1 = top - 0.05, y0 = y1 - h;
  for (const { p, q, up0, up1 } of pieces(from, to, o)) {
    abox(b, mat, axis, at, p, q, y0, y1, -w / 2, w / 2);
    if (up0) abox(b, mat, axis, at, p, p + w, y1, top, -w / 2, w / 2);
    if (up1) abox(b, mat, axis, at, q - w, q, y1, top, -w / 2, w / 2);
    for (let x = p + 1.8; x < q - 0.3; x += 3.6) abox(b, 'metal:#959aa0', axis, at, x - 0.025, x + 0.025, y0 - 0.025, y1, -w / 2 - 0.025, w / 2 + 0.025);
  }
}

/** Cable tray (w 0.4) `drop` (0.25) under the ceiling, with cables in it and hangers every 4 m. */
export function cableTray(t: Has, axis: Axis, at: number, from: number, to: number, top: number, o: RunOpts & { w?: number; drop?: number } = {}) {
  const { b } = t;
  const w = o.w ?? 0.4, y0 = top - (o.drop ?? 0.25);
  for (const { p, q } of pieces(from, to, o)) {
    abox(b, 'metal:#a7acb1', axis, at, p, q, y0, y0 + 0.02, -w / 2, w / 2);
    abox(b, 'metal:#a7acb1', axis, at, p, q, y0, y0 + 0.08, -w / 2, -w / 2 + 0.015);
    abox(b, 'metal:#a7acb1', axis, at, p, q, y0, y0 + 0.08, w / 2 - 0.015, w / 2);
    abox(b, 'flat:#2b2d30', axis, at, p, q, y0 + 0.02, y0 + 0.06, -w / 2 + 0.04, w / 2 - 0.04);
    for (let x = p + 2; x < q - 0.5; x += 4) {
      abox(b, 'metal:#7f858b', axis, at, x - 0.02, x + 0.02, y0 - 0.04, y0, -w / 2 - 0.05, w / 2 + 0.05);
      abox(b, 'metal:#7f858b', axis, at, x - 0.012, x + 0.012, y0 - 0.04, top, w / 2 + 0.03, w / 2 + 0.05);
    }
  }
}

/** Bare fluorescent batten on the ceiling: a white channel and a lit tube under it. */
export function batten(t: Has, axis: Axis, at: number, from: number, to: number, top: number, o: { drop?: number } = {}) {
  const { b } = t, y = top - (o.drop ?? 0);
  abox(b, 'paint:#e6e5e0', axis, at, from, to, y - 0.06, y, -0.06, 0.06);
  abox(b, 'light', axis, at, from + 0.05, to - 0.05, y - 0.095, y - 0.06, -0.025, 0.025);
  if (o.drop) for (const x of [from + 0.3, to - 0.3]) abox(b, 'metal:#8a8f94', axis, at, x - 0.01, x + 0.01, y, top, -0.01, 0.01);
}

/** Recessed light panel (w × d, along x) in a white frame, flush with the ceiling at `top`. */
export function lightPanel(t: Has, x: number, z: number, top: number, w = 1.2, d = 0.6) {
  t.b.deco('paint:#e6e5e0', x - w / 2 - 0.05, top - 0.02, z - d / 2 - 0.05, x + w / 2 + 0.05, top, z + d / 2 + 0.05);
  t.b.deco('light', x - w / 2, top - 0.03, z - d / 2, x + w / 2, top - 0.02, z + d / 2);
}

// ── Hanging things ───────────────────────────────────────────────────────────────────────────

/** Paper lantern, bottom at y: glowing body d × h, black caps, a cord up to `top`. */
export function lantern(t: Has, x: number, y: number, z: number, o: { color?: string; d?: number; h?: number; top?: number } = {}) {
  const { b } = t, d = o.d ?? 0.4, h = o.h ?? 0.6;
  b.mesh(`glow:${o.color ?? '#e5533d'}`, 'cyl', x, y + h / 2, z, d, h * 0.86, d);
  b.mesh('flat:#1b1b1b', 'cyl', x, y + 0.035, z, d * 0.7, 0.07, d * 0.7);
  b.mesh('flat:#1b1b1b', 'cyl', x, y + h - 0.035, z, d * 0.7, 0.07, d * 0.7);
  if (o.top !== undefined) b.deco('flat:#2b2d30', x - 0.01, y + h, z - 0.01, x + 0.01, o.top, z + 0.01);
}

/**
 * Noren: a short split curtain along a run from `from` to `to`, hanging `h` (0.55) from a rod at
 * y = `top`. `face` is the side (±1 across the run) its text faces.
 */
export function noren(t: Has, axis: Axis, at: number, from: number, to: number, top: number, o: { color: string; text?: string; fg?: string; h?: number; face?: Wall }) {
  const { b } = t, h = o.h ?? 0.55, face = o.face ?? 1;
  const a = Math.min(from, to), c = Math.max(from, to);
  abox(b, 'wood:#5a4636', axis, at, a - 0.05, c + 0.05, top - 0.04, top, -0.02, 0.02);
  const n = Math.max(2, Math.round((c - a) / 0.45)), w = (c - a) / n;
  for (let k = 0; k < n; k++) abox(b, `flat:${o.color}`, axis, at, a + k * w + 0.015, a + (k + 1) * w - 0.015, top - 0.04 - h, top - 0.04, -0.01, 0.01);
  if (o.text) {
    const mid = (a + c) / 2, sw = Math.min(1.6, (c - a) * 0.6);
    const [x, z] = axis === 'x' ? [mid, at + face * 0.016] : [at + face * 0.016, mid];
    b.sign({ k: 'shop', ja: o.text, bg: o.color, fg: o.fg ?? '#fff' }, x, top - 0.04 - h * 0.45, z, axis === 'x' ? [0, face] : [face, 0], sw, h * 0.5);
  }
}

/**
 * Hanging cloth banner `w` × `h` centred on `c` along a run at `at`, from a rod at `top`, vertical
 * text on both faces. Over walking areas keep top − h ≥ cf + 2.3.
 */
export function banner(t: Has, axis: Axis, at: number, c: number, top: number, o: { w?: number; h?: number; color: string; fg?: string; text?: string; ceil?: number }) {
  const { b } = t, w = o.w ?? 0.6, h = o.h ?? 0.6;
  abox(b, 'wood:#5a4636', axis, at, c - w / 2 - 0.05, c + w / 2 + 0.05, top - 0.03, top, -0.015, 0.015);
  abox(b, `flat:${o.color}`, axis, at, c - w / 2, c + w / 2, top - 0.03 - h, top - 0.03, -0.008, 0.008);
  if (o.ceil !== undefined) for (const k of [-1, 1]) abox(b, 'flat:#2b2d30', axis, at, c + k * w * 0.45 - 0.008, c + k * w * 0.45 + 0.008, top, o.ceil, -0.008, 0.008);
  if (o.text) {
    for (const f of [-1, 1]) {
      const [x, z] = axis === 'x' ? [c, at + f * 0.012] : [at + f * 0.012, c];
      b.sign({ k: 'shop', ja: o.text, bg: o.color, fg: o.fg ?? '#fff', vertical: true }, x, top - 0.03 - h / 2, z, axis === 'x' ? [0, f] : [f, 0], w * 0.9, h * 0.94);
    }
  }
}

// ── Walls ────────────────────────────────────────────────────────────────────────────────────

/**
 * A band on long wall `s` from y0 to y1 above the floor (0.008 proud, or `inset`), along the
 * paid and unpaid walls alike but skipping the exit doorways. `from`/`to` limit it in x.
 */
export function wallBand(i: ConcInfo, s: Wall, y0: number, y1: number, mat: string, o: { from?: number; to?: number; inset?: number } = {}) {
  for (const [p, q] of cut([o.from ?? i.x0, o.to ?? i.x1], doorways(i))) wbox(i, s, mat, p, q, i.cf + y0, i.cf + y1, 0, o.inset ?? 0.008);
}

export interface DadoOpts {
  /** Dado finish, e.g. a tile key. */
  mat: string;
  /** Height of the dado (default 1.0). */
  top?: number;
  /** Cap rail on top of the dado (0.05 high). */
  cap?: string;
  /** Skirting (default dark grey). */
  skirting?: string;
  /** A frieze band higher up, [y0, y1] above the floor (default 2.48 … 2.56). */
  frieze?: string;
  friezeY?: Span;
  from?: number;
  to?: number;
}

/** Skirting, dado, cap rail and an optional frieze along long wall `s`, skipping exit doorways. */
export function wallDado(i: ConcInfo, s: Wall, o: DadoOpts) {
  const top = o.top ?? 1.0, r = { from: o.from, to: o.to };
  wallBand(i, s, 0, 0.13, o.skirting ?? 'flat:#4b4d50', { ...r, inset: 0.018 });
  wallBand(i, s, 0.13, top, o.mat, r);
  if (o.cap) wallBand(i, s, top, top + 0.05, o.cap, { ...r, inset: 0.014 });
  if (o.frieze) wallBand(i, s, o.friezeY?.[0] ?? 2.48, o.friezeY?.[1] ?? 2.56, o.frieze, { ...r, inset: 0.012 });
}

/** The same dado across an end wall at x (i.x0 or i.x1), whole width. Use on paid ends only (the unpaid ends carry the mural). */
export function endDado(i: ConcInfo, x: number, o: DadoOpts) {
  const n = x <= i.x0 + 0.01 ? 1 : -1, top = o.top ?? 1.0;
  const slab = (mat: string, y0: number, y1: number, t: number) =>
    i.b.deco(mat, Math.min(x, x + n * t), i.cf + y0, -i.cw, Math.max(x, x + n * t), i.cf + y1, i.cw);
  slab(o.skirting ?? 'flat:#4b4d50', 0, 0.13, 0.018);
  slab(o.mat, 0.13, top, 0.008);
  if (o.cap) slab(o.cap, top, top + 0.05, 0.014);
  if (o.frieze) slab(o.frieze, o.friezeY?.[0] ?? 2.48, o.friezeY?.[1] ?? 2.56, 0.012);
}

/**
 * Posters along long wall `s` from x0 to x1 every `pitch` m, framed, wherever the wall is free
 * (not behind shops, machines or doorways). `digital`: dark bezel and a lit edge, for new lines.
 */
export function posterRow(i: ConcInfo, s: Wall, x0: number, x1: number, o: { pitch?: number; v0?: number; w?: number; h?: number; y?: number; digital?: boolean } = {}) {
  const pitch = o.pitch ?? 3, w = o.w ?? 1.25, h = o.h ?? 1.75, y = i.cf + (o.y ?? 1.55);
  const doors = doorways(i);
  let v = o.v0 ?? 0;
  for (let x = x0 + pitch / 2; x + w / 2 <= x1; x += pitch) {
    const [za, zb] = band(i, s, 0, 0.35);
    if (doors.some(([p, q]) => x + w / 2 > p - 0.3 && x - w / 2 < q + 0.3)) continue;
    if (!i.free(x - w / 2 - 0.1, za, x + w / 2 + 0.1, zb)) continue;
    // Claim only the wall strip: the floor in front stays free for walking.
    const [ca, cb] = band(i, s, 0, 0.05);
    i.claim(x - w / 2 - 0.1, ca, x + w / 2 + 0.1, cb);
    if (o.digital) {
      wbox(i, s, 'flat:#16181b', x - w / 2 - 0.07, x + w / 2 + 0.07, y - h / 2 - 0.07, y + h / 2 + 0.12, 0.008, 0.045);
      wbox(i, s, 'glow:#9fd3ff', x - w / 2, x + w / 2, y + h / 2 + 0.05, y + h / 2 + 0.08, 0.045, 0.05);
      i.b.sign({ k: 'poster', v: v++ % 8 }, x, y, s * (i.cw - 0.05), [0, -s], w, h);
    } else {
      wbox(i, s, 'flat:#c9c9c4', x - w / 2 - 0.04, x + w / 2 + 0.04, y - h / 2 - 0.04, y + h / 2 + 0.04, 0.008, 0.022);
      i.b.sign({ k: 'poster', v: v++ % 8 }, x, y, s * (i.cw - 0.03), [0, -s], w, h);
    }
  }
}

// ── Any wall face: dado and posters ──────────────────────────────────────────────────────────
//
// The long-wall helpers above only know the spine's two long walls. These dress any finished
// vertical face given as a `WallFace` (types.ts: `axis`, `at`, `n` as in `Face`, plus its extent
// u0 … u1 along `axis`): a room's `faces`, the outer faces of a stairwell (`stairwellFaces`), an
// end wall, the side of a kiosk. All decoration, nothing checked or claimed; the caller decides
// where. The insets stack as on the long walls: skirting 0.018, dado 0.008, cap 0.014, frieze
// 0.012, poster frames 0.008 … 0.022 and posters 0.03 proud.

/** Anything with a builder and a floor height (a ConcInfo, a RoomInfo, an ExitInfo with `cf`…). */
type Floored = Has & { cf: number };

/**
 * Skirting, dado, cap rail and an optional frieze along face `f` (as `wallDado` does on a long
 * wall), from `o.from` … `o.to` within the face, leaving out `o.gaps` (spans along the face, e.g.
 * where it runs beside a stair opening or a portal's jamb).
 */
export function faceDado(i: Floored, f: WallFace, o: DadoOpts & { gaps?: Span[] }) {
  const top = o.top ?? 1.0, { b, cf } = i;
  const a = Math.max(f.u0, o.from ?? -Infinity), c = Math.min(f.u1, o.to ?? Infinity);
  if (c - a < 0.1) return;
  for (const [p, q] of cut([a, c], o.gaps)) {
    fbox(b, f, o.skirting ?? 'flat:#4b4d50', p, q, cf, cf + 0.13, 0, 0.018);
    fbox(b, f, o.mat, p, q, cf + 0.13, cf + top, 0, 0.008);
    if (o.cap) fbox(b, f, o.cap, p, q, cf + top, cf + top + 0.05, 0, 0.014);
    if (o.frieze) fbox(b, f, o.frieze, p, q, cf + (o.friezeY?.[0] ?? 2.48), cf + (o.friezeY?.[1] ?? 2.56), 0, 0.012);
  }
}

export interface FacePosterOpts {
  /** Centre-to-centre spacing (default 3). */
  pitch?: number;
  /** Poster size (default 1.25 × 1.75) and centre height above the floor (1.55). */
  w?: number;
  h?: number;
  y?: number;
  /** Dark bezel and a lit top edge (new lines). */
  digital?: boolean;
  /** First poster design (0 … 7); the next ones follow on. */
  v0?: number;
  /** At most this many (default no limit). */
  max?: number;
  /** Spans along the face to keep clear (each grown 0.2). */
  gaps?: Span[];
  /** Keep this far in from the face's ends (default 0.3). */
  margin?: number;
}

/**
 * Framed posters along face `f`, every `pitch` m, centred as a group on the face, skipping
 * `gaps`. Returns how many were placed.
 */
export function facePosters(i: Floored, f: WallFace, o: FacePosterOpts = {}): number {
  const { b, cf } = i;
  const pitch = o.pitch ?? 3, w = o.w ?? 1.25, h = o.h ?? 1.75, y = cf + (o.y ?? 1.55), m = o.margin ?? 0.3;
  const a = f.u0 + m + w / 2, c = f.u1 - m - w / 2;
  if (c < a - 1e-6) return 0;
  const n = Math.min(o.max ?? Infinity, Math.floor((c - a) / pitch) + 1);
  const start = (a + c) / 2 - ((n - 1) * pitch) / 2;
  let v = o.v0 ?? Math.floor(hash(Math.round(f.at * 7 + f.u0 * 3)) * 8), placed = 0;
  for (let k = 0; k < n; k++) {
    const u = start + k * pitch;
    if ((o.gaps ?? []).some(([p, q]) => u + w / 2 > p - 0.2 && u - w / 2 < q + 0.2)) continue;
    const [px, pz] = fpt(f, u, o.digital ? 0.05 : 0.03);
    if (o.digital) {
      fbox(b, f, 'flat:#16181b', u - w / 2 - 0.07, u + w / 2 + 0.07, y - h / 2 - 0.07, y + h / 2 + 0.12, 0.008, 0.045);
      fbox(b, f, 'glow:#9fd3ff', u - w / 2, u + w / 2, y + h / 2 + 0.05, y + h / 2 + 0.08, 0.045, 0.05);
    } else fbox(b, f, 'flat:#c9c9c4', u - w / 2 - 0.04, u + w / 2 + 0.04, y - h / 2 - 0.04, y + h / 2 + 0.04, 0.008, 0.022);
    b.sign({ k: 'poster', v: v++ % 8 }, px, y, pz, fnormal(f), w, h);
    placed++;
  }
  return placed;
}

/**
 * Dress a whole wall face the way the station's long walls are dressed: `faceDado` with the
 * dado options, then `facePosters` unless `posters` is false. The usual call for a room's faces:
 * `for (const f of r.faces) dressFace(r, f, { ...dado, posters: { pitch: 3.5, max: 2 } })`.
 * Returns the number of posters placed.
 */
export function dressFace(i: Floored, f: WallFace, o: DadoOpts & { gaps?: Span[]; posters?: FacePosterOpts | false }): number {
  faceDado(i, f, o);
  if (o.posters === false) return 0;
  return facePosters(i, f, { ...o.posters, gaps: [...(o.posters?.gaps ?? []), ...(o.gaps ?? [])] });
}

/**
 * The outer faces of a stairwell's own walls that someone in the concourse (or its room) can
 * see: for each wall box, its face away from the stair, cut to the stretches with open floor in
 * front (not another stairwell, a stair opening, or outside the area) and kept 0.3 m clear of the
 * portal's jambs. `end` marks the closed end (across the stair); the others run along it. Empty
 * where the stairwell uses the concourse's or a room's walls. Never includes the portal or fascia.
 */
export function stairwellFaces(i: ConcInfo, w: Stairwell): (WallFace & { end: boolean })[] {
  const st = w.stair.rect, cx = (st[0] + st[2]) / 2, cz = (st[1] + st[3]) / 2;
  const alongX = Math.abs(w.stair.down[0]) > 0.5;
  const area: Rect | undefined = w.room < 0 ? [i.x0, -i.cw, i.x1, i.cw] : i.rooms[w.room]?.rect;
  if (!area) return [];
  const inside = (r: Rect, x: number, z: number, m = 0) => x > r[0] - m && x < r[2] + m && z > r[1] - m && z < r[3] + m;
  const open = (x: number, z: number) =>
    inside(area, x, z, -0.05) && !i.stairwells.some((q) => inside(q.footprint, x, z)) && !i.holes.some((h) => inside(h, x, z, 0.1));
  const out: (WallFace & { end: boolean })[] = [];
  for (const r of w.walls) {
    const axis: Axis = r[2] - r[0] >= r[3] - r[1] ? 'x' : 'z';
    const [lo, hi, mid] = axis === 'x' ? [r[1], r[3], cz] : [r[0], r[2], cx];
    const n: Wall = Math.abs(hi - mid) >= Math.abs(lo - mid) ? 1 : -1;
    const at = n > 0 ? hi : lo;
    const [a, d] = axis === 'x' ? [r[0], r[2]] : [r[1], r[3]];
    // Jambs beside this face, as spans along it, grown 0.3.
    const jam = w.portal.jambs
      .filter((j) => (axis === 'x' ? Math.min(Math.abs(j[1] - at), Math.abs(j[3] - at)) : Math.min(Math.abs(j[0] - at), Math.abs(j[2] - at))) < 0.6)
      .map((j): Span => (axis === 'x' ? [j[0] - 0.3, j[2] + 0.3] : [j[1] - 0.3, j[3] + 0.3]));
    let s0: number | null = null;
    const spans: Span[] = [];
    for (let u = a + 0.125; u < d; u += 0.25) {
      const [px, pz] = axis === 'x' ? [u, at + n * 0.2] : [at + n * 0.2, u];
      const ok = open(px, pz) && !jam.some(([p, q]) => u > p && u < q);
      if (ok && s0 === null) s0 = u - 0.125;
      if (s0 !== null && (!ok || u + 0.25 >= d)) {
        spans.push([s0, ok ? d : u - 0.125]);
        s0 = null;
      }
    }
    const end = (axis === 'x') !== alongX;
    for (const [p, q] of spans) if (q - p >= 0.8) out.push({ axis, at, n, u0: p, u1: q, end });
  }
  return out;
}

// ── Service elements: what stands between the shops on a busy wall ────────────────────────────
//
// Staff doors, closed roller shutters, ventilation grilles, fire-hose cabinets and meter
// cupboards. All decoration, 0.12 m proud at most, so they can line a corridor without narrowing
// it. Each goes on a `Face` (or long wall `s` of a ConcInfo) from `u0` along it, and returns
// false (building nothing) if it does not fit. Where the info object can say what is free (a
// ConcInfo), it checks the wall strip and `room` m in front of it (default 0.6) and claims the
// wall strip 0.15 m deep, so later parts (posters, other shops) skip it. Pass `check: false`, or
// an info object without `free` (a RoomInfo, an ExitInfo), to place it without checks.

type SvcInfo = Has & { cf: number; clear: number; cw?: number; free?: ConcInfo['free']; claim?: ConcInfo['claim'] };

export interface SvcOpts {
  /** Check `free()` and claim the strip (default true where the info object has `free`). */
  check?: boolean;
  /** Floor kept free in front, beyond the 0.12 m it stands out (default 0.6). */
  room?: number;
}

const faceOf = (i: SvcInfo, at: Face | Wall): Face | null => (typeof at === 'number' ? (i.cw === undefined ? null : wallFace({ cw: i.cw }, at)) : at);

/** Check and claim a service element's strip on face f, u0 … u1. */
function svcSpot(i: SvcInfo, f: Face, u0: number, u1: number, o: SvcOpts): boolean {
  if (o.check === false || !i.free) return true;
  const [ax, az] = fpt(f, u0, 0), [cx, cz] = fpt(f, u1, 0.12 + (o.room ?? 0.6));
  if (!i.free(Math.min(ax, cx), Math.min(az, cz), Math.max(ax, cx), Math.max(az, cz))) return false;
  const [px, pz] = fpt(f, u1, 0.15);
  i.claim?.(Math.min(ax, px), Math.min(az, pz), Math.max(ax, px), Math.max(az, pz));
  return true;
}

/** Labels for staff doors: what is behind them (no fake information: just rooms a station has). */
export const STAFF_ROOMS: { text: string; sub: string }[] = [
  { text: '機械室', sub: 'Machine room' },
  { text: '電気室', sub: 'Electrical room' },
  { text: '倉庫', sub: 'Store room' },
  { text: '清掃員控室', sub: 'Cleaning staff' },
  { text: '駅務室', sub: 'Station staff' },
  { text: '店舗搬入口', sub: 'Shop deliveries' },
];

/**
 * Staff door: a steel frame, one or two flush leaves with the 'staff only' notice (`machine:
 * 'door'` sign), and optionally a small label above naming the room. `w` is the clear width
 * (default 1.0, or 1.8 for two leaves); the whole thing is w + 0.16 long, 0.06 proud.
 */
export function serviceDoor(
  i: SvcInfo, at: Face | Wall, u0: number,
  o: SvcOpts & { w?: number; leaves?: 1 | 2; color?: string; frame?: string; label?: { text: string; sub?: string } | null } = {},
): boolean {
  const f = faceOf(i, at);
  if (!f) return false;
  const leaves = o.leaves ?? 1, w = o.w ?? (leaves === 2 ? 1.8 : 1.0), u1 = u0 + w + 0.16;
  if (!svcSpot(i, f, u0, u1, o)) return false;
  const { b, cf } = i, h = 2.1, frame = o.frame ?? 'metal:#8f959c';
  const a = u0 + 0.08, c = u1 - 0.08;
  fbox(b, f, frame, u0, a, cf, cf + h + 0.08, 0, 0.06);
  fbox(b, f, frame, c, u1, cf, cf + h + 0.08, 0, 0.06);
  fbox(b, f, frame, a, c, cf + h, cf + h + 0.08, 0, 0.06);
  fbox(b, f, o.color ?? 'paint:#c9ccd0', a, c, cf, cf + h, 0, 0.03);
  const lw = (c - a) / leaves;
  for (let k = 0; k < leaves; k++) {
    const [sx, sz] = fpt(f, a + (k + 0.5) * lw, 0.036);
    b.sign({ k: 'machine', v: 'door' }, sx, cf + h / 2, sz, fnormal(f), lw - 0.03, h - 0.02);
  }
  if (o.label) {
    const [lx, lz] = fpt(f, (u0 + u1) / 2, 0.02);
    b.sign({ k: 'label', text: o.label.text, sub: o.label.sub, fg: '#fff', bg: '#5b6168' }, lx, cf + h + 0.26, lz, fnormal(f), Math.min(1.2, u1 - u0), 0.26);
  }
  return true;
}

/**
 * Closed shop: a roller shutter pulled down, u0 … u1 (2 m or more), in a shop's opening: the
 * shutter box at the fascia's foot, ribbed slats down to a bottom bar, guide rails, pilasters,
 * and the fascia up to the ceiling (or `top`) with the brand's sign, a 'unit to let' notice
 * (`lease`), or nothing. 0.12 proud.
 */
export function shutter(
  i: SvcInfo, at: Face | Wall, u0: number, u1: number,
  o: SvcOpts & { brand?: Brand; lease?: boolean; body?: string; slat?: string; top?: number } = {},
): boolean {
  const f = faceOf(i, at);
  if (!f || u1 - u0 < 2) return false;
  if (!svcSpot(i, f, u0, u1, o)) return false;
  const { b, cf } = i, fy = cf + FASCIA, top = o.top ?? cf + i.clear;
  const body = o.body ?? 'flat:#ebe8e0', slat = o.slat ?? 'metal:#b9bdc2';
  const a = u0 + 0.12, c = u1 - 0.12;
  // Pilasters and fascia, a brand stripe under it.
  fbox(b, f, body, u0, a, cf, fy, 0, 0.12);
  fbox(b, f, body, c, u1, cf, fy, 0, 0.12);
  fbox(b, f, body, u0, u1, fy, top, 0, 0.12);
  if (o.brand) fbox(b, f, `flat:${o.brand.bg}`, u0, u1, fy, fy + 0.05, 0.12, 0.128);
  // Shutter box, curtain, ribs every 0.4 m, bottom bar, guide rails.
  fbox(b, f, 'metal:#9da2a8', a, c, fy - 0.28, fy, 0, 0.1);
  fbox(b, f, slat, a, c, cf, fy - 0.28, 0, 0.04);
  for (let y = cf + 0.4; y < fy - 0.35; y += 0.4) fbox(b, f, 'metal:#a7acb1', a, c, y, y + 0.025, 0.04, 0.05);
  fbox(b, f, 'flat:#3a3d41', a, c, cf, cf + 0.07, 0.04, 0.07);
  for (const u of [a, c - 0.06]) fbox(b, f, 'metal:#8f959c', u, u + 0.06, cf, fy - 0.28, 0.04, 0.08);
  const [sx, sz] = fpt(f, (u0 + u1) / 2, 0.135);
  const sh = Math.max(0.2, Math.min(0.5, top - fy - 0.12));
  if (o.brand) {
    b.sign({ k: 'shop', ja: o.brand.ja, en: o.brand.en, bg: o.brand.bg, fg: o.brand.fg }, sx, (fy + 0.05 + top) / 2, sz, fnormal(f), fasciaW(u1 - u0), sh);
  } else if (o.lease) {
    const [lx, lz] = fpt(f, (u0 + u1) / 2, 0.055);
    b.sign({ k: 'label', text: 'テナント募集', sub: 'Unit to let', fg: '#1b3a5c', bg: '#f4f1e6' }, lx, cf + 1.45, lz, fnormal(f), 1.1, 0.34);
  }
  return true;
}

/**
 * Ventilation grille in the wall: a frame and slats over a dark opening, `w` × `h` (default
 * 1.0 × 0.5) with its foot `y` above the floor (default 0.25; a high one sits at about 2.0).
 * 0.04 proud.
 */
export function ventGrille(i: SvcInfo, at: Face | Wall, u0: number, o: SvcOpts & { w?: number; h?: number; y?: number; mat?: string } = {}): boolean {
  const f = faceOf(i, at);
  if (!f) return false;
  const w = o.w ?? 1.0, h = o.h ?? 0.5, y0 = i.cf + (o.y ?? 0.25), mat = o.mat ?? 'metal:#a7acb1';
  if (!svcSpot(i, f, u0, u0 + w, o)) return false;
  const { b } = i;
  // The dark opening sits over any dado (0.008) and cap (0.014); the slats in front of it.
  fbox(b, f, 'flat:#2b2d30', u0 + 0.04, u0 + w - 0.04, y0 + 0.04, y0 + h - 0.04, 0, 0.018);
  fbox(b, f, mat, u0, u0 + w, y0, y0 + 0.04, 0, 0.04);
  fbox(b, f, mat, u0, u0 + w, y0 + h - 0.04, y0 + h, 0, 0.04);
  fbox(b, f, mat, u0, u0 + 0.04, y0, y0 + h, 0, 0.04);
  fbox(b, f, mat, u0 + w - 0.04, u0 + w, y0, y0 + h, 0, 0.04);
  for (let y = y0 + 0.1; y < y0 + h - 0.06; y += 0.08) fbox(b, f, mat, u0 + 0.04, u0 + w - 0.04, y, y + 0.025, 0.018, 0.034);
  return true;
}

/**
 * Fire-hose cabinet (消火栓): a red steel box `w` (0.75) wide from 0.45 to 1.55 above the floor
 * with its label, a red lamp and an alarm button above. 0.12 proud.
 */
export function hoseCabinet(i: SvcInfo, at: Face | Wall, u0: number, o: SvcOpts & { w?: number } = {}): boolean {
  const f = faceOf(i, at);
  if (!f) return false;
  const w = o.w ?? 0.75;
  if (!svcSpot(i, f, u0, u0 + w, o)) return false;
  const { b, cf } = i, um = u0 + w / 2;
  fbox(b, f, 'paint:#c62828', u0, u0 + w, cf + 0.45, cf + 1.55, 0, 0.12);
  fbox(b, f, 'metal:#9da2a8', um - 0.012, um + 0.012, cf + 0.5, cf + 1.5, 0.12, 0.125);
  fbox(b, f, 'metal:#9da2a8', u0 + w - 0.12, u0 + w - 0.08, cf + 0.9, cf + 1.1, 0.12, 0.15);
  const [sx, sz] = fpt(f, um, 0.127);
  b.sign({ k: 'label', text: '消火栓', sub: 'Fire hose', fg: '#fff', bg: '#c62828' }, sx, cf + 1.32, sz, fnormal(f), w - 0.1, 0.3);
  // The lamp and the alarm button over it.
  fbox(b, f, 'glow:#ff3b30', um - 0.07, um + 0.07, cf + 1.7, cf + 1.84, 0, 0.08);
  fbox(b, f, 'paint:#c62828', um - 0.09, um + 0.09, cf + 1.9, cf + 2.08, 0, 0.06);
  fbox(b, f, 'flat:#f4f1e6', um - 0.04, um + 0.04, cf + 1.95, cf + 2.03, 0.06, 0.065);
  return true;
}

/**
 * Meter / distribution-board cupboard: a grey steel cupboard `w` (0.9) wide from 0.2 to 1.9
 * above the floor, two doors, louvres at the foot, a handle and a small label. 0.1 proud.
 */
export function meterCupboard(i: SvcInfo, at: Face | Wall, u0: number, o: SvcOpts & { w?: number; mat?: string; label?: { text: string; sub?: string } } = {}): boolean {
  const f = faceOf(i, at);
  if (!f) return false;
  const w = o.w ?? 0.9;
  if (!svcSpot(i, f, u0, u0 + w, o)) return false;
  const { b, cf } = i, um = u0 + w / 2, mat = o.mat ?? 'paint:#c9ccd0';
  fbox(b, f, mat, u0, u0 + w, cf + 0.2, cf + 1.9, 0, 0.1);
  fbox(b, f, 'flat:#7f858b', um - 0.006, um + 0.006, cf + 0.22, cf + 1.88, 0.1, 0.104);
  for (const y of [0.32, 0.42, 0.52]) fbox(b, f, 'flat:#7f858b', u0 + 0.1, u0 + w - 0.1, cf + y, cf + y + 0.03, 0.1, 0.106);
  fbox(b, f, 'metal:#7f858b', um + 0.05, um + 0.08, cf + 1.0, cf + 1.15, 0.1, 0.13);
  const lab = o.label ?? { text: '分電盤', sub: 'Switchboard' };
  const [sx, sz] = fpt(f, um, 0.106);
  b.sign({ k: 'label', text: lab.text, sub: lab.sub, fg: '#1b1b1b', bg: '#f2d16b' }, sx, cf + 1.72, sz, fnormal(f), Math.min(0.7, w - 0.1), 0.2);
  return true;
}

// ── Exits (ExitInfo frame: corridor x −4 … 0, z 0 … ext; lobby z ext … ext + 4) ────────────────

/** Floor height on an exit's stair at x (0 … run). */
const stairY = (e: ExitInfo, x: number) => e.cf + ((e.gy - e.cf) * Math.max(0, Math.min(e.run, x))) / e.run;

/**
 * Dado (and cap) on an exit's corridor and lobby walls, and stepped along both stair walls.
 * Stays under the kit's posters (which sit 0.02 proud) and above its skirting.
 */
export function exitDado(e: ExitInfo, o: { mat: string; top?: number; cap?: string; steps?: number }) {
  const { b, cf, ext, run } = e, top = o.top ?? 1.0, L = ext + 4;
  const flat = (y0: number, y1: number, mat: string, t: number) => {
    b.deco(mat, -4, cf + y0, 0, -4 + t, cf + y1, L); // x = −4 wall, corridor and lobby
    if (ext > 0) b.deco(mat, -t, cf + y0, 0, 0, cf + y1, ext); // x = 0 corridor wall
    b.deco(mat, -t, cf + y0, ext, 0, cf + y1, ext + 0.9); // short lobby wall beside the stair
    b.deco(mat, -4, cf + y0, L - t, 0, cf + y1, L); // lobby back wall
  };
  flat(0.13, top, o.mat, 0.008);
  if (o.cap) flat(top, top + 0.05, o.cap, 0.014);
  // Stair walls, stepped up the slope: near wall (face at ext + 1.2, facing +z) and far wall
  // (face at L, facing −z). No cap here: a stepped cap reads as a staircase on the wall.
  // One sloping band per wall, its top edge parallel to the stair.
  const rise = e.gy - e.cf;
  b.slant(o.mat, 0, e.cf - 0.05, ext + 1.2, run, e.cf + top, ext + 1.208, rise);
  b.slant(o.mat, 0, e.cf - 0.05, L - 0.008, run, e.cf + top, L, rise);
}

/** Handrails along an exit's stair walls (`walls`: which; default both), stepped up the slope. */
export function exitHandrails(e: ExitInfo, walls: ('near' | 'far')[] = ['near', 'far']) {
  const { b, ext, run } = e;
  for (const w of walls) {
    const z = w === 'near' ? ext + 1.2 : ext + 4, f = w === 'near' ? 1 : -1;
    b.slant('metal:#b9bdc2', 0, e.cf + 0.85, Math.min(z + f * 0.05, z + f * 0.1), run, e.cf + 0.9, Math.max(z + f * 0.05, z + f * 0.1), e.gy - e.cf);
    for (let k = 1; k < 4; k++) {
      const x = (run * k) / 4, y = stairY(e, x) + 0.85;
      b.deco('metal:#9da2a8', x - 0.02, y - 0.04, Math.min(z, z + f * 0.08), x + 0.02, y, Math.max(z, z + f * 0.08));
    }
  }
}

/** Pipes under an exit's corridor and lobby ceilings, along the x = −4 wall. */
export function exitPipes(e: ExitInfo, o: { n?: number; mats?: string[] } = {}) {
  const { cf, ext } = e, at = -3.72;
  // The corridor ceiling is at cf + 2.5 and the lobby's at cf + 2.7: one run at corridor
  // height, hung from whichever ceiling is above.
  if (ext > 0) pipeRun(e, 'z', at, 0.05, ext, cf + 2.5, { ...o, drop: 0.03, rise: [true, false] });
  pipeRun(e, 'z', at, ext, ext + 3.99, cf + 2.7, { ...o, drop: 0.23, rise: [ext <= 0, false] });
}

// ── Transfer passages (PassageInfo frame: x −26 … 4, z zc0 … zc1) ──────────────────────────────

/** Stretches of a passage's walls free of the mural, the stair opening and (zc0) possible doorways. */
export function passageWalls(p: PassageInfo): { z: number; f: Wall; runs: Span[] }[] {
  return [
    { z: p.zc0, f: 1, runs: cut([-26, 4], [[-24.3, -19.7], [-3.3, 1.3]]) },
    { z: p.zc1, f: -1, runs: cut([-26, 4], [[-23.1, -3.9], [-1.96, 1.96]]) },
  ];
}

/** Dado (and cap) along a transfer passage's walls and its x = −26 end wall. */
export function passageDado(p: PassageInfo, o: { mat: string; top?: number; cap?: string }) {
  const { b, pf } = p, top = o.top ?? 1.0;
  for (const w of passageWalls(p)) {
    const z = (t: number): Span => (w.f > 0 ? [w.z, w.z + t] : [w.z - t, w.z]);
    for (const [a, c] of w.runs) {
      b.deco('flat:#4b4d50', a, pf, z(0.018)[0], c, pf + 0.13, z(0.018)[1]);
      b.deco(o.mat, a, pf + 0.13, z(0.008)[0], c, pf + top, z(0.008)[1]);
      if (o.cap) b.deco(o.cap, a, pf + top, z(0.014)[0], c, pf + top + 0.05, z(0.014)[1]);
    }
  }
  b.deco('flat:#4b4d50', -26, pf, p.zc0, -25.982, pf + 0.13, p.zc1);
  b.deco(o.mat, -26, pf + 0.13, p.zc0, -25.992, pf + top, p.zc1);
  if (o.cap) b.deco(o.cap, -26, pf + top, p.zc0, -25.986, pf + top + 0.05, p.zc1);
}

/** Wall handrail along a run at height y, `face` = which way it stands off the wall (±1 across). */
export function handrail(t: Has, axis: Axis, at: number, from: number, to: number, y: number, face: Wall) {
  const a = Math.min(from, to), c = Math.max(from, to);
  const o0 = face > 0 ? 0.05 : -0.1, o1 = face > 0 ? 0.1 : -0.05;
  abox(t.b, 'metal:#b9bdc2', axis, at, a, c, y, y + 0.045, o0, o1);
  for (let x = a + 0.3; x < c; x += 1.8) abox(t.b, 'metal:#9da2a8', axis, at, x - 0.02, x + 0.02, y - 0.04, y, Math.min(0, face * 0.08), Math.max(0, face * 0.08));
}

/** Handrails along both walls of a transfer passage, at pf + 0.85. */
export function passageRails(p: PassageInfo) {
  for (const w of passageWalls(p)) for (const [a, c] of w.runs) if (c - a > 1) handrail(p, 'x', w.z, a + 0.15, c - 0.15, p.pf + 0.85, w.f);
}

/** Pipes under a transfer passage's ceiling along the zc1 wall, clear of its signs. */
export function passagePipes(p: PassageInfo, o: { n?: number; mats?: string[] } = {}) {
  pipeRun(p, 'x', p.zc1 - 0.45, -25.99, -2.4, p.pf + 2.8, { ...o, rise: [false, true] });
}

export { hash, shade };
