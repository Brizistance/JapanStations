// Station look: Tsumugibashi (紬橋), where the Nagisa, Kikyō and Yanagisuji lines meet.
//
// Tsumugibashi Chikagai (紬橋地下街): the silk-weaving district's underground shopping street.
// The concourse is a set of corridors, and the corridors are the streets, each named from the
// weaving trade on plates at its corners (where it meets another):
// - 経糸通り Tateito-dōri (Warp Street): the Nagisa spine (1961). Low and busy: timber fascias,
//   counters with noren, shutters and staff doors between the shops, downstand beams and pipes.
// - 綾織通り Ayaori-dōri (Twill Street): the Kikyō spine (2015). Clean and glazed: bright panel
//   fronts with metal pilasters, flush staff doors, digital posters, and a woven tapestry facing
//   the middle cross passage.
// - The three cross passages are weft lanes: 筬小路 Osa-kōji (west), 緯糸小路 Yokoito-kōji
//   (Weft Lane, middle), 綜絖小路 Sōkō-kōji (east).
// - The transfer bays: 糸屋横丁 Itoya-yokochō (off Tateito-dōri), 真綿小路 Mawata-kōji (off
//   Ayaori-dōri). The exit corridors are streets too, named on the lobby wall at their far end.
// - 杼の辻 Hi-no-tsuji (Shuttle Crossing): a remnant stall stands in Tateito-dōri on free floor as
//   near as it fits to where Yokoito-kōji comes in, with a 2.4 m lane each side. The loom that
//   stood here is now the Great Loom (紬の大機) in the rotunda (../rotunda.ts), reached through
//   exit 2's passage.
//
// The walls carry the shops: solid 1 m units where the spine's floor is free, shallow shop
// windows (decoration) everywhere else, interleaved with shutters and service doors. Ceilings:
// cloth on a loom, thin warp bands in the four thread colours along each corridor, weft bands
// across, alternately below and above, all stopping at stairwell and room walls. Pillars: cream
// tile, a madder base and a woven band. Exits: a woven-stripe dado, textile samples between the
// kit's posters, a shop window at the foot of the stair. Passages: as before.
//
// Everything is derived from the concourse info (rooms, mouths, stairwells, signs already hung);
// anything that does not fit is left out.

import { posterWall, shopFits, shopInset, shopPreset, shopRoom, showWindow, showWindowFor } from '../shopfronts';
import type { Builder } from '../../world/builder';
import {
  cut, exitDado, exitHandrails, faceDado, facePosters, FASCIA, fbox, fnormal, fpt, hash, hoseCabinet, kiosk, meterCupboard,
  PALETTES, passageDado, passageRails, passageWalls, pipeRun, serviceDoor, SHOPS, shutter, STAFF_ROOMS, stairwellFaces, ventGrille,
  type Brand, type Face, type Span, type Wall,
} from './parts';
import type { ConcInfo, Rect, RoomInfo, Stairwell, StationLook, WallFace } from './types';

// ── Palette ──────────────────────────────────────────────────────────────────────────────────

const BLUE = '#1f6f9d', MADDER = '#b4472f', CREAM = '#efe6cf', INDIGO = '#2b3a67';
/** The four thread colours. */
const THREADS = [BLUE, MADDER, CREAM, INDIGO];
const TILE = 'tile:#efe6cf';
const TIMBER = 'wood:#4a3324';
const STEEL = 'metal:#5d6166';
const CLOTH = [BLUE, MADDER, INDIGO, '#d8c8a0', '#6b4a32', '#3f6f4a', '#7a1f2b', '#c9962e'];

type Era = 'old' | 'mid' | 'new';
/** Shop finishes by age: timber and tile (Tateito-dōri), enamel (the lanes), bright panels (Ayaori-dōri). */
const STYLE: Record<Era, { body: string; fascia: string; pilaster: string; counter: string }> = {
  old: { body: 'tile:#e4dccb', fascia: 'wood:#5a3d2b', pilaster: 'wood:#6b4a32', counter: 'wood:#7a5a3a' },
  mid: { body: 'panel:#ebe5d8', fascia: 'panel:#f4efe2', pilaster: `paint:${MADDER}`, counter: 'flat:#d8d2c4' },
  new: { body: 'panel:#f4f2ee', fascia: 'panel:#fbfaf7', pilaster: 'metal:#c3c7cb', counter: 'flat:#e3e1dc' },
};
/** Wall dado by age. */
const DADO = {
  old: { mat: 'tile:#e6dcc4', top: 1.2, cap: `paint:${MADDER}`, frieze: `flat:${BLUE}`, friezeY: [2.42, 2.48] as [number, number] },
  mid: { mat: `panel:${CREAM}`, top: 1.0, cap: `paint:${MADDER}`, frieze: `flat:${BLUE}`, friezeY: [2.42, 2.46] as [number, number] },
  new: { mat: 'panel:#e9e6df', top: 1.0, cap: 'metal:#c3c7cb', skirting: 'metal:#9da2a8' },
};
const DOORS: Record<Era, { color: string; frame: string }> = {
  old: { color: 'paint:#b9bba9', frame: 'paint:#6f7568' },
  mid: { color: 'paint:#c9ccd0', frame: 'metal:#8f959c' },
  new: { color: 'paint:#dfe1e3', frame: 'metal:#c3c7cb' },
};

// ── Shops ────────────────────────────────────────────────────────────────────────────────────

/** District shops of the silk quarter (invented; to be recorded in docs/worldbuilding.md). */
export const DISTRICT = {
  hataya: { ja: '紬織物 はたや', en: 'Hataya Tsumugi Silks', bg: '#3b2a4a', fg: '#f1e4c8', kind: 'goods' },
  yoriito: { ja: '糸屋 よりいと', en: 'Yoriito Yarn & Thread', bg: '#f1e4c8', fg: '#b4472f', kind: 'goods' },
  ayaginu: { ja: 'きもの 綾衣', en: 'Kimono Ayaginu', bg: '#7a1f2b', fg: '#f6e7c8', kind: 'goods' },
  tsutsumiya: { ja: 'ふろしき 包み屋', en: 'Tsutsumiya Furoshiki', bg: BLUE, fg: '#ffffff', kind: 'goods' },
  someiro: { ja: '染め見本 そめいろ', en: 'Someiro Dye Bar', bg: INDIGO, fg: '#f2c14e', kind: 'cafe' },
} satisfies Record<string, Brand>;

type Front = 'glazed' | 'counter' | 'stall';
type Special = 'bolts' | 'cones' | 'kimono' | 'furoshiki' | 'swatches';
interface Shop {
  brand: Brand;
  front: Front;
  special?: Special;
  /** Noren colour under the fascia (counters). */
  noren?: string;
}

/** Shop queues by street. Units take the next shop in turn; queues cycle (brand signs are reused). */
const QUEUES: Record<'old' | 'silk' | 'mid' | 'new', Shop[]> = {
  old: [
    { brand: DISTRICT.hataya, front: 'glazed', special: 'bolts' },
    { brand: SHOPS.udonKawanami, front: 'counter', noren: '#7a2a12' },
    { brand: DISTRICT.ayaginu, front: 'glazed', special: 'kimono' },
    { brand: SHOPS.tsumugian, front: 'counter' },
    { brand: SHOPS.sobaKita, front: 'counter', noren: '#2f3a2c' },
    { brand: SHOPS.ryubundo, front: 'glazed' },
    { brand: SHOPS.namima, front: 'counter' },
    { brand: SHOPS.minatoya, front: 'counter', noren: '#8a2b18' },
    { brand: SHOPS.akaneCoffee, front: 'glazed' },
    { brand: SHOPS.yanagiFlowers, front: 'stall' },
    { brand: SHOPS.kawaminatodo, front: 'glazed' },
    { brand: SHOPS.bakeryKomugi, front: 'glazed' },
  ],
  // The silk quarter's own shops first.
  silk: [
    { brand: DISTRICT.yoriito, front: 'glazed', special: 'cones' },
    { brand: DISTRICT.someiro, front: 'counter', special: 'swatches' },
    { brand: DISTRICT.tsutsumiya, front: 'stall', special: 'furoshiki' },
    { brand: DISTRICT.hataya, front: 'glazed', special: 'bolts' },
    { brand: SHOPS.sobaMio, front: 'counter', noren: '#1f2a44' },
    { brand: DISTRICT.ayaginu, front: 'glazed', special: 'kimono' },
    { brand: SHOPS.hibariPharmacy, front: 'glazed' },
  ],
  mid: [
    { brand: DISTRICT.tsutsumiya, front: 'glazed', special: 'furoshiki' },
    { brand: DISTRICT.yoriito, front: 'glazed', special: 'cones' },
    { brand: DISTRICT.someiro, front: 'glazed', special: 'swatches' },
    { brand: DISTRICT.hataya, front: 'glazed', special: 'bolts' },
    { brand: DISTRICT.ayaginu, front: 'glazed', special: 'kimono' },
    { brand: SHOPS.kawaminatodo, front: 'glazed' },
  ],
  new: [
    { brand: SHOPS.maruhoshiMart, front: 'glazed' },
    { brand: DISTRICT.ayaginu, front: 'glazed', special: 'kimono' },
    { brand: SHOPS.hinataBakery, front: 'glazed' },
    { brand: SHOPS.sorano, front: 'glazed' },
    { brand: DISTRICT.hataya, front: 'glazed', special: 'bolts' },
    { brand: SHOPS.nagiCafe, front: 'glazed' },
    { brand: SHOPS.hanaNoMinato, front: 'glazed' },
    { brand: DISTRICT.yoriito, front: 'glazed', special: 'cones' },
    { brand: SHOPS.tsubameya, front: 'glazed' },
    { brand: SHOPS.hibariPharmacy, front: 'glazed' },
    { brand: SHOPS.ryubundo, front: 'glazed' },
  ],
};

/** Brands on the closed shutters between the shops. */
const SHUTTER_BRANDS: Brand[] = [SHOPS.ginnando, SHOPS.kawasemi, SHOPS.tanpopo, DISTRICT.tsutsumiya, SHOPS.komeya, DISTRICT.yoriito];

// ── Streets ──────────────────────────────────────────────────────────────────────────────────

interface Street { ja: string; en: string; color: string; fg: string }
const ST = {
  tateito: { ja: '経糸通り', en: 'Tateito-dōri', color: BLUE, fg: '#ffffff' },
  ayaori: { ja: '綾織通り', en: 'Ayaori-dōri', color: INDIGO, fg: '#ffffff' },
  osa: { ja: '筬小路', en: 'Osa-kōji', color: '#c75b7a', fg: '#ffffff' },
  yokoito: { ja: '緯糸小路', en: 'Yokoito-kōji', color: '#5f8a3a', fg: '#ffffff' },
  soko: { ja: '綜絖小路', en: 'Sōkō-kōji', color: '#8a5a3c', fg: '#ffffff' },
  itoya: { ja: '糸屋横丁', en: 'Itoya-yokochō', color: '#d9b13a', fg: '#2b2216' },
  mawata: { ja: '真綿小路', en: 'Mawata-kōji', color: '#4fa3c7', fg: '#ffffff' },
  hinotsuji: { ja: '杼の辻', en: 'Hi-no-tsuji', color: '#4a3324', fg: '#f4efe2' },
} satisfies Record<string, Street>;
/** The exit corridors, by exit number. */
const EXIT_STREETS: Record<string, Street> = {
  1: { ja: '糸巻通り', en: 'Itomaki-dōri', color: '#e07b39', fg: '#ffffff' },
  2: { ja: '綛通り', en: 'Kase-dōri', color: '#7b4f9e', fg: '#ffffff' },
  3: { ja: '平織通り', en: 'Hiraori-dōri', color: MADDER, fg: '#ffffff' },
  4: { ja: '絣小路', en: 'Kasuri-kōji', color: '#9a6fb0', fg: '#ffffff' },
};
/** District shop in the window at the foot of each exit's stair. */
const EXIT_SHOPS: Shop[] = [QUEUES.silk[3], QUEUES.silk[0], QUEUES.silk[5], QUEUES.silk[2]];

/** The street a room is (by its kind and place). */
function streetOf(i: ConcInfo, room: number): Street | null {
  const r = i.rooms[room];
  if (!r) return null;
  if (r.kind === 'spine') return ST.ayaori;
  if (r.kind === 'transfer bay') return r.mouths.some((m) => m.to === -1) ? ST.itoya : ST.mawata;
  const xs = i.rooms.filter((q) => q.kind === 'cross passage').map((q) => (q.rect[0] + q.rect[2]) / 2).sort((a, c) => a - c);
  const k = xs.indexOf((r.rect[0] + r.rect[2]) / 2);
  if (xs.length === 1) return ST.yokoito;
  if (k === 0) return ST.osa;
  if (k === xs.length - 1) return ST.soko;
  return ST.yokoito;
}

/** The middle cross passage (nearest the middle of the paid area). */
function middlePassage(i: ConcInfo): number {
  const mid = (i.paid[0] + i.paid[1]) / 2;
  let best = -1, d = Infinity;
  i.rooms.forEach((r, k) => {
    if (r.kind !== 'cross passage') return;
    const e = Math.abs((r.rect[0] + r.rect[2]) / 2 - mid);
    if (e < d) [best, d] = [k, e];
  });
  return best;
}

// ── Geometry helpers ─────────────────────────────────────────────────────────────────────────

type T = { b: Builder; cf: number; clear: number };
const overlaps = (a: Rect, c: Rect, m = 0) => a[0] < c[2] + m && a[2] > c[0] - m && a[1] < c[3] + m && a[3] > c[1] - m;
const grow = (r: Rect, m: number): Rect => [r[0] - m, r[1] - m, r[2] + m, r[3] + m];
const rng = (seed: number) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;

/** The floor in front of a stairwell's portal that stays clear: 3.3 m out, a metre wider each side. */
function approach(w: Stairwell): Rect {
  const [px, pz] = w.portal.at, [nx, nz] = w.portal.n, hw = w.portal.w / 2 + 1;
  const a = nx ? px : pz, c = a + (nx || nz) * 3.3;
  return nx ? [Math.min(a, c), pz - hw, Math.max(a, c), pz + hw] : [px - hw, Math.min(a, c), px + hw, Math.max(a, c)];
}

/** Where overhead runs stop: stairwells (walls and fascia) and the floor in front of their portals. */
const wellBlocks = (wells: Stairwell[]): Rect[] => wells.flatMap((w) => [grow(w.footprint, 0.1), approach(w)]);

/** The spans along a run (axis, at ± half) that meet any of `rs`. */
function spansOn(rs: Rect[], axis: 'x' | 'z', at: number, half: number, m = 0): Span[] {
  return rs
    .filter((r) => (axis === 'x' ? at + half > r[1] - m && at - half < r[3] + m : at + half > r[0] - m && at - half < r[2] + m))
    .map((r): Span => (axis === 'x' ? [r[0] - m, r[2] + m] : [r[1] - m, r[3] + m]));
}

type Vol = { min: number[]; max: number[] };
/** Volumes kept clear for signs (the kit's and the wayfinding's), when the builder has no transform. */
function kept(b: Builder): Vol[] {
  const p0 = b.pt(0, 0, 0), p1 = b.pt(1, 0, 1);
  if (p0.some((v) => v !== 0) || p1[0] !== 1 || p1[2] !== 1) return [];
  return (b as unknown as { kept?: Vol[] }).kept ?? [];
}

/**
 * Spans along face `f` taken within `reach` of it, between y0 and y1: sign volumes, signs on the
 * wall and solid boxes standing against it (an office, a stairwell's end), grown by `m`.
 */
function takenOn(t: T, f: WallFace | Face, y0: number, y1: number, reach = 0.5, m = 0.15): Span[] {
  const { b } = t, ax = f.axis === 'x' ? 0 : 2, cr = f.axis === 'x' ? 2 : 0;
  const out: Span[] = [];
  const near = (lo: number, hi: number) => {
    const a = (lo - f.at) * f.n, c = (hi - f.at) * f.n;
    return Math.max(a, c) > 0.001 && Math.min(a, c) < reach;
  };
  for (const k of kept(b)) if (k.max[1] > y0 && k.min[1] < y1 && near(k.min[cr], k.max[cr])) out.push([k.min[ax] - m, k.max[ax] + m]);
  for (const p of b.out.boxes) {
    if (!p.solid || p.max[1] < y0 + 0.5 || p.min[1] > y1 - 0.05 || !near(p.min[cr], p.max[cr])) continue;
    out.push([p.min[ax] - m, p.max[ax] + m]);
  }
  for (const s of b.out.signs) {
    if (!s.normal || s.pos[1] + s.h / 2 < y0 || s.pos[1] - s.h / 2 > y1) continue;
    const d = (s.pos[cr] - f.at) * f.n;
    if (d < -0.05 || d > reach) continue;
    const flat = Math.abs(s.normal[cr === 2 ? 1 : 0]) > 0.5;
    const hw = flat ? s.w / 2 : 0.05;
    out.push([s.pos[ax] - hw - m, s.pos[ax] + hw + m]);
  }
  return out;
}

/** Spans merged where they overlap or lie closer than `tol` (so no slivers of dado are left between them). */
function merge(spans: Span[], tol = 0.6): Span[] {
  const out: Span[] = [];
  for (const [p, q] of [...spans].sort((a, c) => a[0] - c[0])) {
    const last = out[out.length - 1];
    if (last && p <= last[1] + tol) last[1] = Math.max(last[1], q);
    else out.push([p, q]);
  }
  return out;
}

/** Merge 0.25 m cells into runs at least `min` long. */
function runsOf(a: number, c: number, ok: (u0: number, u1: number) => boolean, min = 0.75): Span[] {
  const out: Span[] = [];
  for (let u = a; u + 0.25 <= c + 1e-6; u += 0.25) {
    if (!ok(u, u + 0.25)) continue;
    const last = out[out.length - 1];
    if (last && Math.abs(last[1] - u) < 1e-6) last[1] = u + 0.25;
    else out.push([u, u + 0.25]);
  }
  return out.filter(([p, q]) => q - p >= min);
}

const signW = (w: number) => Math.max(1, Math.min(3.5, Math.floor((w - 0.5) * 2) / 2));

// ── Shop fronts on a wall face (d measured out from the wall) ────────────────────────────────

/** Shelves of goods against the back of a shop, between wall distances d0 and d1. */
function shelves(b: Builder, f: Face, u0: number, u1: number, ys: number[], d0: number, d1: number, cols: string[], h = 0.3, per = 2) {
  const n = Math.max(1, Math.min(per, Math.round((u1 - u0) / 1.5))), w = (u1 - u0) / n;
  ys.forEach((y, r) => {
    fbox(b, f, 'flat:#d9d4c7', u0, u1, y - 0.025, y, d0, d1);
    for (let k = 0; k < n; k++) fbox(b, f, `flat:${cols[(k + r * 2) % cols.length]}`, u0 + k * w + 0.06, u0 + (k + 1) * w - 0.06, y, y + h, d0 + 0.01, d1 - 0.02);
  });
}

/** The silk quarter's own goods, in a shop window from wall distance d0 (back) to d1 (glass). */
function districtGoods(t: T, f: Face, a: number, c: number, sp: Special, d0: number, d1: number) {
  const { b, cf } = t, w = c - a, D = d1 - d0, um = (a + c) / 2;
  const deep = D > 0.5;
  if (sp === 'bolts') {
    // Bolts of tsumugi standing in a rack (and, in a deep shop, two laid on a table in the window).
    const n = Math.max(1, Math.min(deep ? 10 : 6, Math.floor((w - (deep ? 1.8 : 0.2)) / (deep ? 0.3 : 0.22))));
    fbox(b, f, TIMBER, a + 0.1, a + 0.2 + n * (deep ? 0.3 : 0.22), cf, cf + 0.12, d0, d0 + Math.min(0.38, D - 0.02));
    for (let k = 0; k < n; k++) {
      const h = 1.15 + 0.3 * hash(k, w);
      if (deep) {
        const [x, z] = fpt(f, a + 0.35 + k * 0.3, d0 + 0.2);
        b.mesh(`flat:${CLOTH[k % CLOTH.length]}`, 'cyl', x, cf + 0.12 + h / 2, z, 0.24, h, 0.24);
      } else fbox(b, f, `flat:${CLOTH[k % CLOTH.length]}`, a + 0.2 + k * 0.22, a + 0.37 + k * 0.22, cf + 0.12, cf + 0.12 + h, d0 + 0.01, d0 + Math.min(0.1, D - 0.02));
    }
    if (deep && w >= 2.6) {
      fbox(b, f, TIMBER, c - 1.6, c - 0.2, cf, cf + 0.7, d1 - 0.75, d1 - 0.3);
      fbox(b, f, `flat:${INDIGO}`, c - 1.5, c - 0.9, cf + 0.7, cf + 0.8, d1 - 0.68, d1 - 0.38);
      fbox(b, f, `flat:${MADDER}`, c - 0.85, c - 0.3, cf + 0.7, cf + 0.78, d1 - 0.68, d1 - 0.38);
    }
  } else if (sp === 'cones') {
    // Cones of thread on two shelves, skeins hanging below.
    const n = Math.max(1, Math.min(deep ? 8 : 5, Math.floor((w - 0.4) / 0.34)));
    const cols = [BLUE, MADDER, CREAM, INDIGO, '#c9962e', '#6b8f3a', '#c75b7a'];
    const sd = Math.min(0.3, D - 0.03);
    for (const [r, y] of [cf + 1.0, cf + 1.55].entries()) {
      fbox(b, f, 'wood:#9a7650', a + 0.1, a + 0.2 + n * 0.34, y - 0.03, y, d0, d0 + sd);
      for (let k = 0; k < n; k++) {
        const [x, z] = fpt(f, a + 0.3 + k * 0.34, d0 + sd / 2);
        const s = Math.min(0.15, sd - 0.02);
        b.mesh(`flat:${cols[(k + r * 3) % cols.length]}`, 'cone', x, y + 0.11, z, s, 0.22, s);
      }
    }
    for (let k = 0; k < Math.min(4, n); k++) fbox(b, f, `flat:${cols[(k + 5) % cols.length]}`, a + 0.25 + k * 0.5, a + 0.5 + k * 0.5, cf + 0.4, cf + 0.78, d0 + 0.005, d0 + 0.04);
  } else if (sp === 'kimono') {
    // Kimono on T-stands in the window.
    const n = w >= 4 ? 2 : 1;
    const dd = deep ? 0.45 : Math.min(0.05, D / 2);
    for (let k = 0; k < n; k++) {
      const u = a + ((k + 1) * w) / (n + 1);
      const robe = k ? `flat:${INDIGO}` : 'flat:#7a1f2b';
      fbox(b, f, robe, u - 0.3, u + 0.3, cf + 0.45, cf + 1.8, d0 + dd, d0 + dd + 0.02);
      const sl = Math.min(0.66, w / (2 * n) - 0.05);
      fbox(b, f, robe, u - sl, u + sl, cf + 1.32, cf + 1.8, d0 + dd + 0.002, d0 + dd + 0.018);
      fbox(b, f, k ? 'flat:#c9962e' : `flat:${CREAM}`, u - 0.31, u + 0.31, cf + 1.02, cf + 1.22, d0 + dd - 0.004, d0 + dd + 0.024);
      fbox(b, f, 'metal:#9da2a8', u - 0.2, u + 0.2, cf, cf + 0.45, d0 + dd + 0.004, d0 + dd + 0.016);
    }
  } else if (sp === 'furoshiki') {
    // Folded cloths on a low shelf, three open on the back wall.
    const n = Math.min(6, Math.floor((w - 0.4) / 0.5));
    const sd = Math.min(0.3, D - 0.03);
    fbox(b, f, 'wood:#9a7650', a + 0.15, c - 0.15, cf + 0.47, cf + 0.5, d0, d0 + sd);
    for (let k = 0; k < n; k++) fbox(b, f, `flat:${CLOTH[k % CLOTH.length]}`, a + 0.25 + k * 0.5, a + 0.6 + k * 0.5, cf + 0.5, cf + 0.58, d0 + 0.01, d0 + sd - 0.01);
    for (let k = 0; k < 3; k++) {
      const u = a + ((k + 1) * w) / 4;
      fbox(b, f, `flat:${[MADDER, BLUE, '#c9962e'][k]}`, u - 0.27, u + 0.27, cf + 1.45, cf + 1.99, d0 + 0.002, d0 + 0.008);
    }
  } else {
    // A wall of dyed swatches: indigo vat shades over madder and kariyasu.
    const n = Math.max(1, Math.min(6, Math.floor((w - 0.4) / 0.3)));
    const rowsC = [['#0f1f3d', '#1b3560', '#2b4f86', '#3f6fa8', '#6f98c4', '#a9c4de'], ['#6e1f14', '#8f2d1d', MADDER, '#d06a3c', '#d9a63a', '#e8cf7a']];
    rowsC.forEach((rc, r) => {
      for (let k = 0; k < n; k++) {
        const u = um - (n * 0.3) / 2 + k * 0.3;
        fbox(b, f, `flat:${rc[k]}`, u + 0.03, u + 0.27, cf + 1.1 + r * 0.5, cf + 1.52 + r * 0.5, d0 + 0.002, d0 + 0.01);
      }
    });
    if (deep) {
      for (let k = 0; k < 4; k++) {
        const [x, z] = fpt(f, a + 0.5 + k * ((w - 1) / 3), d1 - 0.25);
        b.mesh('glass', 'cyl', x, cf + 1.08, z, 0.14, 0.16, 0.14);
      }
    }
  }
}

/**
 * A solid shop unit 1 m deep against face `f`, u0 … u1: shell to the ceiling with its fascia
 * sign, the front by kind (glazed with a door, an open counter with noren, a stall), and the
 * district shops' own displays. Solid over its footprint (the caller has checked and claimed it).
 */
function deepShop(t: T, f: Face, u0: number, u1: number, s: Shop, era: Era) {
  const { b, cf } = t;
  // Settled when the build ends (every stair and passage stands): a blank wall with posters where no
  // shop could be behind it, else the unit, whose front is the preset for what it sells (shopfronts.ts).
  b.later(() => b.guard(() => {
    if (shopFits(b, f, u0, u1, cf)) return deepShopNow(t, f, u0, u1, s, era);
    fbox(b, f, STYLE[era].fascia, u0, u1, cf, cf + t.clear, 0, 1.0, true);
    posterWall(b, { ...f, at: f.at + f.n * 1.0 }, u0 + 0.2, u1 - 0.2, cf, Math.round(u0));
  }));
}
function deepShopNow(t: T, f: Face, u0: number, u1: number, s: Shop, era: Era) {
  const { b, cf } = t, top = cf + t.clear, fy = cf + FASCIA, D = 1.0, st = STYLE[era];
  const box = (mat: string, a: number, c: number, y0: number, y1: number, d0: number, d1: number) => fbox(b, f, mat, a, c, y0, y1, Math.max(0.004, d0), d1);
  const w = u1 - u0, a = u0 + 0.12, c = u1 - 0.12;
  box(st.fascia, u0, u1, fy, top, 0, D);
  box(st.pilaster, u0, a, cf, fy, 0, D);
  box(st.pilaster, c, u1, cf, fy, 0, D);
  box('flat:#f1ebdd', a, c, cf, fy, 0, 0.02);
  const [sx, sz] = fpt(f, (u0 + u1) / 2, D + 0.016);
  b.sign({ k: 'shop', ja: s.brand.ja, en: s.brand.en, bg: s.brand.bg, fg: s.brand.fg }, sx, fy + 0.33, sz, fnormal(f), signW(w), 0.48);
  // A wide front with free ground behind becomes a room to walk into; otherwise the 1 m unit.
  if (shopRoom(b, f, a, c, cf, FASCIA, D, s.brand)) {
    fbox(b, f, 'none', u0, a, cf, fy, 0, D, true);
    fbox(b, f, 'none', c, u1, cf, fy, 0, D, true);
    return;
  }
  fbox(b, f, 'none', u0, u1, cf, fy, 0, D, true);
  shopPreset(b, f, a, c, cf, FASCIA, D, s.brand);
}

/**
 * A shop window on a wall, decoration only, `o.depth` (0.16) proud at most: pilasters, a fascia
 * with the brand's sign (cf + 2.35 up to `o.top`, default the ceiling), the window with its
 * goods behind glass, and a door (a shop front) or none (a show window). `o.k` lifts it all off
 * the wall (over a dado). `lite` keeps the goods to one shelf.
 */
function showcase(t: T, f: Face, u0: number, u1: number, s: Shop, era: Era, o: { door?: boolean; top?: number; k?: number; lite?: boolean; depth?: number } = {}) {
  const { b, cf } = t;
  // Like the deep units: posters instead where there is no room for a shop behind the wall.
  b.later(() => b.guard(() => {
    if (shopFits(b, f, u0, u1, cf)) showcaseNow(t, f, u0, u1, s, era, o);
    else posterWall(b, { ...f, at: f.at + f.n * (o.k ?? 0) }, u0 + 0.1, u1 - 0.1, cf, Math.round(u0));
  }));
}
function showcaseNow(t: T, f: Face, u0: number, u1: number, s: Shop, era: Era, o: { door?: boolean; top?: number; k?: number; lite?: boolean; depth?: number } = {}) {
  const { b, cf } = t, fy = cf + FASCIA, top = o.top ?? cf + t.clear, k = o.k ?? 0, st = STYLE[era], P = o.depth ?? 0.14;
  const box = (mat: string, a: number, c: number, y0: number, y1: number, d0: number, d1: number) => fbox(b, f, mat, a, c, y0, y1, k + d0, k + d1);
  const a = u0 + 0.1, c = u1 - 0.1;
  box(st.fascia, u0, u1, fy, top, 0, P);
  const [sx, sz] = fpt(f, (u0 + u1) / 2, k + P + 0.016);
  b.sign({ k: 'shop', ja: s.brand.ja, en: s.brand.en, bg: s.brand.bg, fg: s.brand.fg }, sx, (fy + top) / 2, sz, fnormal(f), signW(u1 - u0), Math.max(0.2, Math.min(0.48, top - fy - 0.14)));
  box(st.pilaster, u0, a, cf, fy, 0, P);
  box(st.pilaster, c, u1, cf, fy, 0, P);
  // A front wide enough for a door is a real shop: a room to walk into, or its front set into the wall.
  if (!k && o.door && c - a >= 2.4 && (shopRoom(b, f, a, c, cf, FASCIA, P, s.brand) || shopInset(b, f, a, c, cf, FASCIA, s.brand))) return;
  box('flat:#f1ebdd', a, c, cf + 0.3, fy, 0, 0.006);
  if (!o.lite) box('glow:#fff1d6', a + 0.05, c - 0.05, fy - 0.05, fy - 0.02, 0.01, P - 0.04);
  const door = o.door && c - a >= 2.2 ? c - 0.55 : null;
  const gaps: Span[] = door === null ? [] : [[door - 0.5, door + 0.5]];
  const open = s.front === 'stall' && !o.lite;
  for (const [p, q] of cut([a, c], gaps)) {
    box(open ? 'flat:#6b5a48' : 'flat:#3a3d41', p, q, cf, cf + 0.3, 0, P - 0.01);
    if (!open) box('glass', p, q, cf + 0.3, fy - 0.05, P - 0.028, P - 0.018);
  }
  if (door !== null) {
    box(st.pilaster, door - 0.5, door + 0.5, cf + 2.1, fy, 0, P);
    box('flat:#5b5148', door - 0.47, door + 0.47, cf, cf + 2.1, 0, 0.004);
    box('glassTint', door - 0.47, door + 0.47, cf, cf + 2.1, P - 0.03, P - 0.018);
  }
  const wc = door === null ? c : door - 0.55;
  if (wc - a < 0.6) return;
  // The silk quarter's trades show their goods as modelled window displays, a metre each.
  if (s.special && showWindow(b, f, a, wc, cf, s.special, k + 0.006)) return;
  if (s.special) districtGoods(t, f, a + 0.05, wc - 0.05, s.special, k + 0.006, k + P - 0.03);
  else if (showWindowFor(b, f, a, wc, cf, s.brand, k + 0.006)) return;
  else {
    const goods = PALETTES[s.brand.kind];
    const food = s.brand.kind === 'soba' || s.brand.kind === 'bento';
    const ys = o.lite ? [cf + 1.1] : [cf + 0.95, cf + 1.55];
    if (food) {
      // Food samples on two shelves.
      ys.forEach((y, r) => {
        fbox(b, f, 'flat:#d9d4c7', a + 0.05, wc - 0.05, y - 0.025, y, k + 0.006, k + P - 0.04);
        const n = Math.max(1, Math.min(4, Math.floor((wc - a) / 0.5)));
        for (let j = 0; j < n; j++) {
          const [x, z] = fpt(f, a + 0.3 + j * 0.5, k + (P - 0.03) / 2);
          const sz = Math.min(0.09, P - 0.05);
          b.mesh(`flat:${goods[(j + r) % goods.length]}`, 'cyl', x, y + 0.05, z, sz, 0.1, sz);
        }
      });
    } else shelves(b, f, a + 0.05, wc - 0.05, ys, k + 0.006, k + P - 0.04, goods, 0.3, o.lite ? 1 : 2);
  }
  if (s.noren) {
    const n = Math.max(2, Math.round((wc - a) / 0.6)), nw = (wc - a) / n;
    for (let j = 0; j < n; j++) box(`flat:${s.noren}`, a + j * nw + 0.015, a + (j + 1) * nw - 0.015, fy - 0.5, fy - 0.06, P - 0.014, P - 0.006);
  }
}

/** Advance a queue. */
const nextShop = (q: Shop[], at: { k: number }): Shop => q[at.k++ % q.length];

// ── Service elements and small wall things ───────────────────────────────────────────────────

type SvcKind = 'shutter' | 'door' | 'door2' | 'meter' | 'hose' | 'vent' | 'poster' | 'samples';
const SVC_WEIGHTS: Record<Era, Record<SvcKind, number>> = {
  old: { shutter: 3, door: 2.5, door2: 1, meter: 1.5, hose: 1.2, vent: 1, poster: 1, samples: 1.2 },
  mid: { shutter: 1.5, door: 2, door2: 0.6, meter: 0.8, hose: 1.2, vent: 0.8, poster: 1, samples: 2 },
  new: { shutter: 0.8, door: 3, door2: 1.5, meter: 0.4, hose: 1.5, vent: 1.2, poster: 2, samples: 0.6 },
};

/** Framed textile samples on a wall: `n` frames 0.6 wide, 0.8 apart, centred at u. */
function samples(t: T, f: Face, u: number, n: number, y = 1.25, k = 0) {
  const { b, cf } = t;
  for (let j = 0; j < n; j++) {
    const x = u + (j - (n - 1) / 2) * 0.8, col = CLOTH[(j + Math.round(u * 3)) & 7];
    fbox(b, f, TIMBER, x - 0.3, x + 0.3, cf + y, cf + y + 0.7, k, k + 0.03);
    fbox(b, f, `flat:${col}`, x - 0.24, x + 0.24, cf + y + 0.06, cf + y + 0.64, k + 0.03, k + 0.04);
    fbox(b, f, `flat:${THREADS[(j + 1) & 3]}`, x - 0.24, x + 0.24, cf + y + 0.3, cf + y + 0.38, k + 0.04, k + 0.045);
  }
}

/** A framed poster at u. */
function poster(t: T, f: Face, u: number, v: number, era: Era) {
  const { b, cf } = t, y = cf + 1.55;
  if (era === 'new') {
    fbox(b, f, 'flat:#16181b', u - 0.7, u + 0.7, y - 0.95, y + 1.0, 0.008, 0.045);
    fbox(b, f, 'glow:#9fd3ff', u - 0.62, u + 0.62, y + 0.93, y + 0.96, 0.045, 0.05);
  } else fbox(b, f, 'flat:#c9c9c4', u - 0.66, u + 0.66, y - 0.91, y + 0.91, 0.008, 0.022);
  const [x, z] = fpt(f, u, era === 'new' ? 0.05 : 0.03);
  b.sign({ k: 'poster', v: v & 7 }, x, y, z, fnormal(f), 1.25, 1.75);
}

interface Frontage {
  era: Era;
  queue: Shop[];
  at: { k: number };
  rand: () => number;
  /** Unit widths to pick from. */
  widths: number[];
  /** Chance of a service element after a shop. */
  svcP: number;
  gap: number;
  /** Shop windows get a door (shop fronts) or not (show windows). */
  door: boolean;
  lite?: boolean;
  /** How far shop windows stand out (default 0.14). */
  depth?: number;
  /** Service kinds allowed here. */
  svc: SvcKind[];
  /** A solid shop at u0 … u1, if the floor allows (checks and claims; true if it may be built). */
  deep?: (u0: number, u1: number) => boolean;
  /** Hose cabinets placed so far on this street. */
  hoses: { n: number };
  /** Spans under a name plate: only low service elements there. */
  low?: Span[];
}

/** Service elements that stay under a name plate (cf + 2.3). */
const LOW: SvcKind[] = ['door', 'meter', 'hose', 'vent', 'samples'];

/** One service element at u in at most `room` m. Returns the length used and whether the dado stays behind it. */
function service(t: T, f: Face, u: number, room: number, o: Frontage, low: boolean, last: string): { w: number; dado: boolean; id: string } {
  const W = SVC_WEIGHTS[o.era], D = { ...DOORS[o.era], check: false };
  const label = () => (!low && o.rand() < 0.6 ? STAFF_ROOMS[Math.floor(o.rand() * STAFF_ROOMS.length)] : null);
  const sw = Math.min(room, 2.4 + Math.floor(o.rand() * 3) * 0.6);
  const all: { id: SvcKind; w: number; dado: boolean; go: () => boolean }[] = [
    {
      id: 'shutter', w: sw, dado: false, go: () => shutter(t, f, u, u + sw, {
        check: false, body: o.era === 'new' ? 'flat:#f2f1ec' : undefined,
        ...(o.rand() < 0.5 ? { brand: SHUTTER_BRANDS[Math.floor(o.rand() * SHUTTER_BRANDS.length)] } : { lease: true }),
      }),
    },
    { id: 'door', w: 1.16, dado: true, go: () => serviceDoor(t, f, u, { ...D, label: label() }) },
    { id: 'door2', w: 1.96, dado: true, go: () => serviceDoor(t, f, u, { ...D, leaves: 2, label: label() }) },
    { id: 'meter', w: 0.9, dado: true, go: () => meterCupboard(t, f, u, { check: false }) },
    { id: 'hose', w: 0.75, dado: true, go: () => hoseCabinet(t, f, u, { check: false }) },
    { id: 'vent', w: 1.0, dado: true, go: () => ventGrille(t, f, u, { check: false, h: o.era === 'old' ? 0.6 : 0.45 }) },
    { id: 'poster', w: 1.5, dado: true, go: () => (poster(t, f, u + 0.75, Math.floor(o.rand() * 8), o.era), true) },
    { id: 'samples', w: 1.7, dado: true, go: () => (samples(t, f, u + 0.85, 2), true) },
  ];
  let list = all.filter((c) => (c.id !== 'hose' || o.hoses.n < 2) && o.svc.includes(c.id) && (!low || LOW.includes(c.id)) && c.id !== last && c.w <= room + 1e-6 && (c.id !== 'shutter' || sw >= 2.4));
  while (list.length) {
    // One hose cabinet per street for certain, a second at most.
    const wt = (c: (typeof list)[number]) => (c.id !== 'hose' ? W[c.id] : o.hoses.n === 0 ? 12 : 0.4);
    let r = o.rand() * list.reduce((s, c) => s + wt(c), 0), j = 0;
    while (j < list.length - 1 && r >= wt(list[j])) r -= wt(list[j++]);
    const c = list[j];
    if (c.go()) {
      if (c.id === 'hose') o.hoses.n++;
      return { w: c.w, dado: c.dado, id: c.id };
    }
    list = list.filter((q) => q !== c);
  }
  return { w: 0, dado: true, id: '' };
}

/**
 * Line face `f` from a to c with shops and service elements. Returns the spans the dado must
 * leave out (shops and shutters stand over it).
 */
function lineRun(t: T, f: Face, a: number, c: number, o: Frontage): Span[] {
  const covered: Span[] = [], low = o.low ?? [];
  let u = a + 0.05, last = '';
  while (c - u >= 0.75) {
    const room = c - u - 0.05;
    // Up to the next name plate, anything; under one, only low service elements.
    const inLow = low.some(([p, q]) => u < q && u + 0.75 > p);
    const free = Math.min(c, ...low.filter(([p]) => p >= u).map(([p]) => p)) - u - 0.05;
    let used = 0;
    if (!inLow && free >= 1.6 && !(last === 'shop' && o.rand() < o.svcP)) {
      let w = Math.min(free, o.widths[Math.floor(o.rand() * o.widths.length)]);
      if (free - w < 0.8) w = free;
      const s = nextShop(o.queue, o.at);
      if (w >= 2.4 && o.deep?.(u, u + w)) deepShop(t, f, u, u + w, s, o.era);
      else showcase(t, f, u, u + w, s, o.era, { door: o.door, lite: o.lite, depth: o.depth });
      covered.push([u, u + w]);
      used = w;
      last = 'shop';
    }
    if (!used) {
      const lowOnly = inLow || free < 0.75;
      const r = service(t, f, u, lowOnly ? room : free, o, lowOnly, last);
      used = r.w;
      if (used && !r.dado) covered.push([u, u + used]);
      last = r.id;
    }
    u += used ? used + o.gap : 0.5;
  }
  return covered;
}

/** A street name plate on a wall at u (timber backing, the label), centred y above the floor, h tall. */
function plate(t: T, f: Face, u: number, s: Street, y = 2.52, k = 0, h = 0.36) {
  const { b, cf } = t;
  fbox(b, f, TIMBER, u - 0.5, u + 0.5, cf + y - h / 2, cf + y + h / 2, k + 0.004, k + 0.016);
  const [x, z] = fpt(f, u, k + 0.02);
  b.sign({ k: 'label', text: s.ja, sub: s.en, fg: s.fg, bg: s.color }, x, cf + y, z, fnormal(f), 0.95, h - 0.06);
}

/**
 * Plates either side of a junction on face `f`: `left` at the u0 side of the opening u0 … u1,
 * `right` at the u1 side, each moved out until it is clear of `taken` (and within `within`);
 * a plate with no room on its own side goes beside the other one. Returns the spans used.
 */
function cornerPlates(t: T, f: Face, u0: number, u1: number, left: Street | null, right: Street | null, taken: Span[], within: Span[]): Span[] {
  const used: Span[] = [];
  const fits = (u: number) => within.some(([p, q]) => u - 0.55 >= p && u + 0.55 <= q) && ![...taken, ...used].some(([p, q]) => u + 0.6 > p && u - 0.6 < q);
  const put = (st: Street, dir: number) => {
    for (let d = 0; d <= 2.8; d += 0.2) {
      const x = (dir < 0 ? u0 - 0.7 : u1 + 0.7) + dir * d;
      if (!fits(x)) continue;
      plate(t, f, x, st);
      used.push([x - 0.6, x + 0.6]);
      return true;
    }
    return false;
  };
  for (const [st, dir] of [[left, -1], [right, 1]] as [Street | null, number][]) if (st && !put(st, dir)) put(st, -dir);
  return used;
}

// ── Ceilings: cloth on a loom ────────────────────────────────────────────────────────────────

/**
 * Warp bands along `axis` at cross positions `vs` from u0 to u1, and weft bands across at `us`
 * from v0 to v1, alternately under and over; each cut where it meets `blocks` (or `lights`).
 */
function weave(t: T, axis: 'x' | 'z', u0: number, u1: number, vs: number[], v0: number, v1: number, us: number[], blocks: Rect[], lights: Rect[] = [], weftCol = BLUE) {
  const { b } = t, top = t.cf + t.clear, other = axis === 'x' ? 'z' : 'x';
  const run = (mat: string, ax: 'x' | 'z', at: number, p: number, q: number, y0: number, y1: number, w: number) => {
    for (const [s, e] of cut([p, q], [...spansOn(blocks, ax, at, w / 2), ...spansOn(lights, ax, at, w / 2, 0.08)])) {
      if (e - s < 0.4) continue;
      if (ax === 'x') b.deco(mat, s, y0, at - w / 2, e, y1, at + w / 2);
      else b.deco(mat, at - w / 2, y0, s, at + w / 2, y1, e);
    }
  };
  vs.forEach((v, k) => run(`flat:${THREADS[k % 4]}`, axis, v, u0, u1, top - 0.2, top - 0.17, 0.1));
  us.forEach((u, k) => {
    const y = k % 2 ? top - 0.15 : top - 0.26;
    run(`flat:${k % 2 ? CREAM : weftCol}`, other, u, v0, v1, y, y + 0.03, 0.14);
  });
}

/** Ceiling lights the kit hung in a rectangle (flush with the ceiling), as plan rectangles. */
function kitLights(t: T, r: Rect): Rect[] {
  const top = t.cf + t.clear;
  return t.b.out.boxes
    .filter((p) => !p.solid && p.min[1] >= top - 0.12 && p.max[1] <= top + 0.02 && p.min[0] >= r[0] - 0.01 && p.max[0] <= r[2] + 0.01 && p.min[2] >= r[1] - 0.01 && p.max[2] <= r[3] + 0.01)
    .map((p): Rect => [p.min[0], p.min[2], p.max[0], p.max[2]]);
}

// ── The loom ─────────────────────────────────────────────────────────────────────────────────

const LX = 1.85, LZ = 1.6, LANE = 2.4;

/**
 * Where the loom stands in the spine: free floor (its rail and a 2.4 m lane on both long sides
 * clear of walls, stairwells, pillars and anything solid), as near as possible to where the
 * middle cross passage comes in.
 */
function loomSpot(i: ConcInfo): [number, number] | null {
  const mp = middlePassage(i), op = i.openings.find((o) => o.kind === 'bay' && o.room === mp);
  const tx = op ? (op.x0 + op.x1) / 2 : (i.paid[0] + i.paid[1]) / 2, tz = op ? op.s * i.cw : 0;
  const top = i.cf + 2.0;
  const solids: Rect[] = [
    ...i.stairwells.filter((w) => w.room < 0).map((w) => w.footprint),
    ...i.pillars.map(([x, z]): Rect => [x - 0.35, z - 0.35, x + 0.35, z + 0.35]),
    ...i.b.out.boxes.filter((p) => p.solid && p.max[1] > i.cf + 0.3 && p.min[1] < top).map((p): Rect => [p.min[0], p.min[2], p.max[0], p.max[2]]),
  ];
  let best: [number, number] | null = null, bd = Infinity;
  for (let x = i.paid[0] + 4; x <= i.paid[1] - 4; x += 0.25) {
    for (let z = -i.cw + LANE; z <= i.cw - LANE; z += 0.25) {
      const d = Math.hypot(x - tx, z - tz);
      if (d >= bd) continue;
      const r: Rect = [x - LX, z - LZ, x + LX, z + LZ];
      if (r[1] - LANE < -i.cw || r[3] + LANE > i.cw || !i.free(...r)) continue;
      const lanes: Rect[] = [[r[0], r[3], r[2], r[3] + LANE], [r[0], r[1] - LANE, r[2], r[1]]];
      if (lanes.some((l) => solids.some((s) => overlaps(l, s)))) continue;
      best = [x, z];
      bd = d;
    }
  }
  return best;
}

/**
 * The remnant stall at Shuttle Crossing (the hand loom that stood here is now the Great Loom in
 * the rotunda): a Blender model (tools/blender/build_tsumugi.py) with a collider under it.
 */
function remnantStall(i: ConcInfo, x: number, z: number) {
  const { b, cf } = i;
  i.claim(x - LX, z - LZ, x + LX, z + LZ);
  b.block(x - 1.3, cf, z - 0.65, x + 1.3, cf + 2.2, z + 0.65);
  b.model('tsumugi', 'stall', x, cf, z);
  b.sign({ k: 'shop', ja: 'はぎれ市', en: 'Remnant Market', bg: INDIGO, fg: '#f1e4c8' }, x, cf + 2.62, z - 0.83, [0, -1], 2.2, 0.3);
  b.deco(TIMBER, x - 1.14, cf + 2.45, z - 0.82, x + 1.14, cf + 2.79, z - 0.79);
}

/**
 * The twill tapestry (綾織の紬): a woven hanging on a wall, warp stripes under weft bands that go
 * over and under, in a timber frame, with its label. Decoration, 0.05 proud.
 */
function tapestry(t: T, f: Face, u: number, w = 4.0) {
  const { b, cf } = t, y0 = cf + 0.55, y1 = cf + 2.25, a = u - w / 2, c = u + w / 2;
  fbox(b, f, TIMBER, a - 0.08, c + 0.08, y0 - 0.08, y1 + 0.08, 0, 0.03);
  const n = 8, sw = w / n;
  for (let k = 0; k < n; k++) fbox(b, f, `flat:${THREADS[k % 4]}`, a + k * sw, a + (k + 1) * sw, y0, y1, 0.03, 0.04);
  // Wefts: each band passes over every other warp stripe (a twill steps one stripe per band).
  for (let r = 0; r < 4; r++) {
    const y = y0 + 0.16 + r * 0.4;
    for (let k = r % 2; k < n; k += 2) fbox(b, f, `flat:${r % 2 ? CREAM : MADDER}`, a + k * sw, a + (k + 1) * sw, y, y + 0.14, 0.04, 0.05);
  }
  const [x, z] = fpt(f, u, 0.035);
  b.sign({ k: 'label', text: '綾織の紬', sub: 'Tsumugi twill', fg: '#f4efe2', bg: '#4a3324' }, x, cf + 0.35, z, fnormal(f), 1.1, 0.26);
}

// ── Tateito-dōri: the Nagisa spine ───────────────────────────────────────────────────────────

/** Face of long wall s, over its whole length. */
const longFace = (i: ConcInfo, s: Wall): WallFace => ({ axis: 'x', at: s * i.cw, n: -s as Wall, u0: i.x0, u1: i.x1 });

/** Spans of long wall s that a stairwell in the spine stands against. */
const wellsOn = (i: ConcInfo, s: Wall, m = 0): Span[] =>
  i.stairwells.filter((w) => w.room < 0 && (s > 0 ? w.footprint[3] > i.cw - 0.5 : w.footprint[1] < -i.cw + 0.5)).map((w): Span => [w.footprint[0] - m, w.footprint[2] + m]);

/** Spans of long wall s that the approach to a portal in the spine reaches. */
const approachesOn = (i: ConcInfo, s: Wall): Span[] =>
  i.stairwells.filter((w) => w.room < 0).map(approach).filter((r) => (s > 0 ? r[3] > i.cw - 0.3 : r[1] < -i.cw + 0.3)).map((r): Span => [r[0], r[2]]);

/**
 * Stretches of long wall s in the paid area where shops and service elements may go: off the
 * stairwells and their portals' approaches, the doorways and mouths, the gate lines, the
 * toilets, signs and anything solid against the wall.
 */
function wallRuns(i: ConcInfo, s: Wall): Span[] {
  const f = longFace(i, s), top = i.cf + i.clear;
  const taken = takenOn(i, f, i.cf, top, 0.6);
  const strip = (x0: number, x1: number): Rect => (s > 0 ? [x0, i.cw - 0.3, x1, i.cw] : [x0, -i.cw, x1, -i.cw + 0.3]);
  const blocks = i.stairwells.filter((w) => w.room < 0).flatMap((w) => [grow(w.footprint, 0.3), approach(w)]);
  return runsOf(i.paid[0], i.paid[1], (x0, x1) =>
    !blocks.some((r) => overlaps(strip(x0, x1), r))
    && !i.openings.some((o) => o.s === s && x1 > o.x0 - 0.4 && x0 < o.x1 + 0.4)
    && !i.ends.some((e) => x1 > e.g - 3.9 && x0 < e.g + 3.9)
    && !(s < 0 && x1 > i.toilets - 1.8 && x0 < i.toilets + 1.8)
    && !taken.some(([p, q]) => x1 > p && x0 < q));
}

/** The long walls: plates at the junctions, shops and service elements, dado and trim. */
function spineWalls(i: ConcInfo, rand: () => number) {
  const top = i.cf + i.clear, ptr = { silk: { k: 0 }, old: { k: 0 } };
  const hoses = { n: 0 };
  for (const s of [-1, 1] as const) {
    const f = longFace(i, s);
    // (Where the wall is free, before the plates go up: under a plate low service elements may go.)
    const runs = wallRuns(i, s);
    // Corner plates beside each mouth: this street on one side, the other on the other.
    const within = runsOf(i.paid[0], i.paid[1], (x0, x1) => !i.openings.some((o) => o.s === s && x1 > o.x0 && x0 < o.x1)
      && ![...wellsOn(i, s, 0.3), ...approachesOn(i, s)].some(([p, q]) => x1 > p && x0 < q) && !i.ends.some((e) => x1 > e.g - 3.9 && x0 < e.g + 3.9), 1.1);
    const taken = takenOn(i, f, i.cf + 2.2, i.cf + 2.8, 0.6, 0.05);
    const used: Span[] = [];
    for (const o of i.openings) {
      if (o.s !== s || o.kind !== 'bay' || o.room === undefined) continue;
      const other = streetOf(i, o.room);
      // The other street's name first (it is what you want to know here), then this one's.
      const first = s > 0 ? 1 : -1;
      used.push(...cornerPlates(i, f, o.x0, o.x1, first < 0 ? other : null, first > 0 ? other : null, [...taken, ...used], within));
      used.push(...cornerPlates(i, f, o.x0, o.x1, first > 0 ? ST.tateito : null, first < 0 ? ST.tateito : null, [...taken, ...used], within));
    }
    // Shops: solid 1 m units where the floor allows, shop windows elsewhere.
    const fr: Frontage = {
      era: 'old', queue: s < 0 ? QUEUES.silk : QUEUES.old, at: s < 0 ? ptr.silk : ptr.old, rand,
      widths: [2.6, 3.0, 3.6, 4.2], svcP: 0.55, gap: 0.12, door: true, hoses,
      svc: ['shutter', 'door', 'door2', 'meter', 'hose', 'vent', 'samples'], low: used,
      deep: (u0, u1) => {
        const [za, zb] = s > 0 ? [i.cw - 2.0, i.cw] : [-i.cw, -i.cw + 2.0];
        if (!i.free(u0, za, u1, zb)) return false;
        i.claim(u0, za, u1, zb);
        return true;
      },
    };
    const covered: Span[] = [];
    for (const [a, c] of runs) covered.push(...lineRun(i, f, a, c, fr));
    // Dado and trim the whole length, round everything standing against the wall to the ceiling.
    const solidGaps = i.b.out.boxes.filter((p) => p.solid && p.mat !== 'none' && p.max[1] >= top - 0.05 && p.min[1] <= i.cf + 0.05)
      .filter((p) => (s > 0 ? p.min[2] < i.cw + 0.01 && p.max[2] > i.cw - 0.5 : p.max[2] > -i.cw - 0.01 && p.min[2] < -i.cw + 0.5))
      .filter((p) => (s > 0 ? p.min[2] < i.cw - 0.001 : p.max[2] > -i.cw + 0.001))
      .map((p): Span => [p.min[0], p.max[0]]);
    // (Bare wall beside a portal's approach and behind the gate lines.)
    const dadoGaps = [
      ...i.openings.filter((o) => o.s === s).map((o): Span => [o.x0, o.x1]), ...wellsOn(i, s), ...approachesOn(i, s), ...solidGaps, ...covered,
      ...i.ends.map((e): Span => [e.g - 3.9, e.g + 3.9]),
    ];
    faceDado(i, f, { ...DADO.old, gaps: merge(dadoGaps) });
    for (const [p, q] of cut([i.x0, i.x1], merge(dadoGaps))) fbox(i.b, f, `flat:${MADDER}`, p, q, i.cf + 2.52, i.cf + 2.55, 0, 0.012);
  }
}

/** The outer walls of the spine's stairwells: shop windows of the silk quarter on the long sides, samples on the ends. */
function spineWells(i: ConcInfo, rand: () => number) {
  const top = i.cf + i.clear, at = { k: 2 }, hoses = { n: 1 };
  for (const w of i.stairwells) {
    if (w.room >= 0) continue;
    for (const f of stairwellFaces(i, w)) {
      const taken = takenOn(i, f, i.cf, top, 0.3);
      // Keep within the jambs' depth where the stairwell's footprint stands proud of the face.
      const fp = w.footprint, edge = f.axis === 'x' ? (f.n > 0 ? fp[3] : fp[1]) : (f.n > 0 ? fp[2] : fp[0]);
      const room = (edge - f.at) * f.n, depth = room > 0.05 ? Math.min(0.14, room - 0.02) : 0.14;
      const runs = runsOf(f.u0 + 0.15, f.u1 - 0.15, (a, c) => !taken.some(([p, q]) => c > p && a < q), 0.75);
      const covered: Span[] = [];
      if (!f.end) {
        const fr: Frontage = { era: 'old', queue: QUEUES.silk, at, rand, widths: [2.6, 3.0, 3.4], svcP: 0.6, gap: 0.15, door: false, hoses, depth, svc: depth < 0.13 ? ['vent', 'samples'] : ['hose', 'meter', 'vent', 'samples'] };
        for (const [a, c] of runs) covered.push(...lineRun(i, f, a, c, fr));
      } else {
        for (const [a, c] of runs) {
          const n = Math.min(3, Math.floor((c - a - 0.2) / 0.8));
          if (n > 0) samples(i, f, (a + c) / 2, n, 1.3, 0.008);
        }
      }
      faceDado(i, f, { ...DADO.old, gaps: merge(covered) });
    }
  }
}

/** Tateito-dōri's ceiling: warps and wefts, downstand beams on the pillar lines, two pipe runs. */
function spineCeiling(i: ConcInfo) {
  const top = i.cf + i.clear, wells = i.stairwells.filter((w) => w.room < 0);
  const blocks = [...wellBlocks(wells), ...i.pillars.map(([x, z]): Rect => [x - 0.42, z - 0.42, x + 0.42, z + 0.42])];
  // Mouths and doorways: runs across stop short of the wall there.
  const mouthR = i.openings.map((o): Rect => (o.s > 0 ? [o.x0 - 0.3, i.cw - 0.6, o.x1 + 0.3, i.cw] : [o.x0 - 0.3, -i.cw, o.x1 + 0.3, -i.cw + 0.6]));
  const x0 = i.paid[0] + 3.9, x1 = i.paid[1] - 3.9;
  const cols = [...new Set(i.pillars.map(([x]) => x))].filter((x) => x > x0 && x < x1).sort((a, c) => a - c);
  const mids = cols.slice(1).map((c, k) => (c + cols[k]) / 2);
  const vs = [-0.45, -0.1, 0.1, 0.45].map((k) => k * 2 * i.cw * 0.55);
  weave(i, 'x', x0, x1, vs, -i.cw + 0.2, i.cw - 0.2, mids, [...blocks, ...mouthR]);
  // Downstand beams across on the pillar lines (low and heavy: the 1961 concourse).
  for (const x of cols) for (const [p, q] of cut([-i.cw, i.cw], spansOn([...wellBlocks(wells), ...mouthR], 'z', x, 0.15))) i.b.deco('flat:#d6cdb8', x - 0.15, top - 0.4, p, x + 0.15, top, q);
  // Pipes along both sides, clear of the stairwells, rising into the ceiling where they stop.
  for (const s of [-1, 1] as const) {
    const z = s * (i.cw * 0.58);
    pipeRun(i, 'x', z, x0, x1, top, { n: s > 0 ? 2 : 3, gaps: spansOn(blocks, 'x', z, 0.2, 0.1), mats: ['paint:#8c949b', 'paint:#a33b2f', 'paint:#b8b2a3'] });
  }
}

// ── The unpaid halls ─────────────────────────────────────────────────────────────────────────

/** Information counter (long side along z, signs facing ±x). */
function infoCounter(i: ConcInfo, x: number, z: number): boolean {
  const { b, cf } = i, hx = 0.45, hz = 1.2;
  if (!i.free(x - hx, z - hz, x + hx, z + hz, 1.0)) return false;
  i.claim(x - hx - 0.8, z - hz - 0.8, x + hx + 0.8, z + hz + 0.8);
  b.box(TILE, x - hx, cf, z - hz, x + hx, cf + 1.05, z + hz);
  b.deco(TIMBER, x - hx - 0.03, cf + 1.05, z - hz - 0.03, x + hx + 0.03, cf + 1.1, z + hz + 0.03);
  b.deco(`flat:${BLUE}`, x - hx - 0.006, cf + 0.7, z - hz - 0.006, x + hx + 0.006, cf + 0.76, z + hz + 0.006);
  b.deco(`flat:${MADDER}`, x - hx - 0.006, cf + 0.8, z - hz - 0.006, x + hx + 0.006, cf + 0.83, z + hz + 0.006);
  b.deco(STEEL, x - 0.03, cf + 1.1, z - 0.03, x + 0.03, cf + 1.75, z + 0.03);
  b.deco('flat:#2b3a67', x - 0.03, cf + 1.75, z - 0.7, x + 0.03, cf + 2.15, z + 0.7);
  for (const s of [-1, 1] as const) b.sign({ k: 'label', text: 'ご案内', sub: 'Information', fg: '#ffffff', bg: INDIGO }, x + s * 0.035, cf + 1.95, z, [s, 0], 1.3, 0.36);
  return true;
}

/** An information counter in the first unpaid hall and kiosks in both, wherever they fit. */
function unpaidHalls(i: ConcInfo) {
  i.ends.forEach((e, k) => {
    const dir = e.hi ? 1 : -1;
    // Between the gates and the exit doorways, not in front of a doorway.
    const spots: [number, number][] = [];
    for (let d = 5.5; d <= 13.5; d += 0.5) for (const z of [i.cw - 3.6, i.cw - 4.2, i.cw - 4.8, i.cw - 5.4]) spots.push([e.g + dir * d, z]);
    const clearOf = (x: number, s: Wall) => !i.exits.some((o) => o.s === s && x > o.x0 - 1.5 && x < o.x1 + 1.5);
    const place = (fn: (x: number, z: number) => boolean, s: Wall) => spots.some(([x, z]) => clearOf(x, s) && fn(x, s * z));
    if (k === 0) {
      place((x, z) => infoCounter(i, x, z), 1);
      place((x, z) => kiosk(i, x, z, { w: 3, d: 1.6, brand: SHOPS.hinataBakery, margin: 0.3 }), -1);
    } else {
      place((x, z) => kiosk(i, x, z, { w: 3, d: 1.6, brand: SHOPS.hanaNoMinato, margin: 0.3 }), 1);
      place((x, z) => kiosk(i, x, z, { w: 3, d: 1.6, brand: SHOPS.kajitsudo, margin: 0.3 }), -1);
    }
  });
}

// ── Rooms: Ayaori-dōri, the lanes and the transfer bays ──────────────────────────────────────

/** Spans of face `f` (of a room) inside a stairwell (in a transfer bay its walls are the room's), at a jamb, or along a portal's approach. */
function wellGaps(f: WallFace, wells: Stairwell[]): Span[] {
  const rs = wells.flatMap((w) => [grow(w.footprint, 0.05), ...w.portal.jambs.map((j) => grow(j, 0.2)), approach(w)]);
  return runsOf(f.u0 - 0.25, f.u1 + 0.25, (a, c) => {
    const [x, z] = fpt(f, (a + c) / 2, 0.3);
    return rs.some((r) => x > r[0] && x < r[2] && z > r[1] && z < r[3]);
  }, 0);
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

/** Spans of face `f` that are a mouth's edge (the end of the face meets a mouth), grown by m. */
function mouthEnds(r: RoomInfo, f: WallFace, m: number): Span[] {
  const out: Span[] = [];
  for (const mo of r.mouths) {
    if (mo.axis !== f.axis) {
      // A mouth across the face's end (a short lane's two ends).
      if (f.at > mo.u0 - 0.05 && f.at < mo.u1 + 0.05 && mo.at > f.u0 - 0.05 && mo.at < f.u1 + 0.05) out.push([mo.at - m, mo.at + m]);
      continue;
    }
    if (Math.abs(mo.at - f.at) > 0.5) continue;
    for (const u of [mo.u0, mo.u1]) if (Math.abs(u - f.u0) < 0.05 || Math.abs(u - f.u1) < 0.05) out.push([u - m, u + m]);
  }
  return out;
}

/** Ayaori-dōri: clean glazed shop fronts, flush service doors, the tapestry, plates at the mouths. */
function ayaori(r: RoomInfo) {
  const i = r.conc, top = r.cf + r.clear, rand = rng(r.index * 7919 + 17);
  const wells = i.stairwells.filter((w) => w.room === r.index);
  const reserved = new Map<WallFace, Span[]>();
  const res = (f: WallFace) => reserved.get(f) ?? (reserved.set(f, []), reserved.get(f)!);
  const plates = new Map<WallFace, Span[]>();
  const pl = (f: WallFace) => plates.get(f) ?? (plates.set(f, []), plates.get(f)!);
  const sideTaken = (f: WallFace) => takenOn(r, f, r.cf, top, 0.17);
  // (What stands at each face before the plates go up: under a plate low service elements may go.)
  const before = new Map(r.faces.map((f) => [f, sideTaken(f)]));
  // The tapestry opposite the middle cross passage.
  const mp = middlePassage(i), mm = r.mouths.find((m) => m.to === mp);
  if (mm) {
    const u = (mm.u0 + mm.u1) / 2;
    const f = r.faces.find((q) => q.axis === mm.axis && Math.abs(q.at - mm.at) > 1 && q.u0 <= u - 2.4 && q.u1 >= u + 2.4);
    if (f && !sideTaken(f).some(([p, q]) => u + 2.3 > p && u - 2.3 < q)) {
      tapestry(r, f, u);
      res(f).push([u - 2.3, u + 2.3]);
    }
  }
  // Plates beside every mouth: Ayaori-dōri on one side, the other street on the other.
  for (const m of r.mouths) {
    const other = m.to >= 0 ? streetOf(i, m.to) : ST.tateito;
    const lf = r.faces.find((q) => q.axis === m.axis && Math.abs(q.at - m.at) < 0.05 && Math.abs(q.u1 - m.u0) < 0.05);
    const rf = r.faces.find((q) => q.axis === m.axis && Math.abs(q.at - m.at) < 0.05 && Math.abs(q.u0 - m.u1) < 0.05);
    // Both plates on one face if the other side has no wall (or no room).
    const sides: [WallFace | undefined, Street | null, number][] = [[lf, ST.ayaori, -1], [rf, other, 1]];
    const homeless: Street[] = [];
    for (const [f, st, dir] of sides) {
      if (!st) continue;
      if (!f) { homeless.push(st); continue; }
      const used = cornerPlates(r, f, m.u0, m.u1, dir < 0 ? st : null, dir > 0 ? st : null, [...takenOn(r, f, r.cf + 2.2, r.cf + 2.8, 0.6, 0.05), ...res(f), ...pl(f)], [[f.u0 + 0.1, f.u1 - 0.1]]);
      if (!used.length) homeless.push(st);
      pl(f).push(...used);
    }
    for (const st of homeless) {
      const f = lf ?? rf;
      if (!f) continue;
      const dir = f === lf ? -1 : 1;
      pl(f).push(...cornerPlates(r, f, m.u0, m.u1, dir < 0 ? st : null, dir > 0 ? st : null, [...takenOn(r, f, r.cf + 2.2, r.cf + 2.8, 0.6, 0.05), ...res(f), ...pl(f)], [[f.u0 + 0.1, f.u1 - 0.1]]));
    }
  }
  // Shop fronts along the long faces; the end walls get panels and digital posters.
  const fr: Frontage = {
    era: 'new', queue: QUEUES.new, at: { k: 0 }, rand, widths: [6.0, 6.6, 7.2], svcP: 0.5, gap: 0.2, door: true, lite: true, hoses: { n: 0 },
    svc: ['door', 'door2', 'hose', 'vent', 'poster', 'shutter'],
  };
  for (const f of r.faces) {
    const len = f.u1 - f.u0;
    const taken = [...(before.get(f) ?? []), ...res(f), ...mouthEnds(r, f, 0.5)];
    const avail = runsOf(f.u0 + 0.2, f.u1 - 0.2, (a, c) => !taken.some(([p, q]) => c > p && a < q), 0.75);
    const covered: Span[] = [...res(f)];
    const isEnd = f.axis !== (r.rect[2] - r.rect[0] >= r.rect[3] - r.rect[1] ? 'x' : 'z');
    if (isEnd || len < 3) {
      for (const [a, c] of avail) if (c - a >= 1.6 && !pl(f).some(([p, q]) => c > p && a < q)) poster(r, f, (a + c) / 2, Math.round(f.at), 'new');
    } else for (const [a, c] of avail) covered.push(...lineRun(r, f, a, c, { ...fr, low: pl(f) }));
    faceDado(r, f, { ...DADO.new, gaps: merge(covered) });
  }
  // Its stairwells: a digital poster on each long side (their walls are the street's pale panels already).
  for (const w of wells) {
    for (const f of stairwellFaces(i, w)) {
      if (!f.end) facePosters(r, f, { pitch: 4.8, max: 1, digital: true, margin: 0.8, gaps: takenOn(r, f, r.cf, top, 0.6) });
    }
  }
  // Ceiling: warps the length of the street, wefts across every 6 m.
  const R = r.rect, W = R[3] - R[1];
  const vs = [0.2, 0.4, 0.6, 0.8].map((k) => R[1] + k * W);
  const us: number[] = [];
  for (let x = R[0] + 3; x < R[2] - 2.5; x += 6) us.push(x);
  weave(r, 'x', R[0] + 0.3, R[2] - 0.3, vs, R[1] + 0.6, R[3] - 0.6, us, wellBlocks(wells), kitLights(r, R), INDIGO);
}

/** A cross passage: a show window of the silk quarter on each side wall, warps overhead. */
function lane(r: RoomInfo) {
  const top = r.cf + r.clear, rand = rng(r.index * 131 + 7);
  const at = { k: r.index * 2 };
  for (const f of r.faces) {
    // (Short lanes: keep half a metre clear of each mouth, so the window may be a narrow one.)
    const taken = [...takenOn(r, f, r.cf, top, 0.17), ...mouthEnds(r, f, 0.55)];
    const avail = cut([f.u0, f.u1], taken).filter(([a, c]) => c - a >= 0.75);
    const covered: Span[] = [];
    for (const [a, c] of avail) {
      if (c - a >= 1.0) {
        showcase(r, f, a, c, nextShop(QUEUES.mid, at), 'mid', { door: false });
        covered.push([a, c]);
      } else if (rand() < 0.5) hoseCabinet(r, f, (a + c) / 2 - 0.375, { check: false });
    }
    faceDado(r, f, { ...DADO.mid, gaps: covered });
  }
  // Warps along the lane (the light across its middle stays clear), stopping short of both mouths.
  const R = r.rect, along: 'x' | 'z' = r.mouths[0]?.axis === 'z' ? 'x' : 'z';
  const [a0, a1, c0, c1] = along === 'z' ? [R[1], R[3], R[0], R[2]] : [R[0], R[2], R[1], R[3]];
  const w = c1 - c0, vs = [0.1, 0.2, 0.8, 0.9].map((k) => c0 + k * w);
  weave(r, along, a0 + 0.6, a1 - 0.6, vs, c0, c1, [], [], kitLights(r, R));
}

/** A transfer bay: the street's dado, textile samples facing the portal, warps over the lobby. */
function bay(r: RoomInfo) {
  const i = r.conc;
  const era: Era = r.mouths.some((m) => m.to === -1) ? 'old' : 'new';
  const wells = i.stairwells.filter((w) => w.room === r.index);
  let best: { f: WallFace; a: number; c: number } | null = null;
  for (const f of r.faces) {
    const gaps = wellGaps(f, wells);
    faceDado(r, f, { ...(era === 'old' ? DADO.old : DADO.new), gaps });
    const taken = [...gaps, ...takenOn(r, f, r.cf + 1.0, r.cf + 2.2, 0.6), ...mouthEnds(r, f, 0.4)];
    for (const [a, c] of runsOf(f.u0 + 0.2, f.u1 - 0.2, (p, q) => !taken.some(([s, e]) => q > s && p < e), 1.6)) {
      if (!best || c - a > best.c - best.a) best = { f, a, c };
    }
  }
  if (best) samples(r, best.f, (best.a + best.c) / 2, Math.min(4, Math.floor((best.c - best.a - 0.2) / 0.8)), 1.25, era === 'old' ? 0.014 : 0.008);
  // Warps along the lobby, clear of the portal's approach and the mouth.
  const L = lobbyOf(r, wells), along: 'x' | 'z' = L[2] - L[0] >= L[3] - L[1] ? 'x' : 'z';
  const [a0, a1, c0, c1] = along === 'x' ? [L[0], L[2], L[1], L[3]] : [L[1], L[3], L[0], L[2]];
  if (a1 - a0 < 2 || c1 - c0 < 1.5) return;
  const mouthR = r.mouths.map((m): Rect => (m.axis === 'x' ? [m.u0, m.at - 0.6, m.u1, m.at + 0.6] : [m.at - 0.6, m.u0, m.at + 0.6, m.u1]));
  weave(r, along, a0 + 0.3, a1 - 0.3, [c0 + 0.5, c0 + 0.8, c1 - 0.8, c1 - 0.5], c0, c1, [], [...wellBlocks(wells), ...mouthR], kitLights(r, r.rect));
}

// ── The look ─────────────────────────────────────────────────────────────────────────────────

/**
 * The ticket halls' ceiling (2026-11-26, the station made grander): coved and coffered, 折上格天井, as in
 * the best room of a merchant's house. Four steps up from the low 1961 ceiling, a timber rail and a
 * strip of light at each, to a lattice of timber over lit paper panels.
 */
function hallVault(b: Builder, [x0, z0, x1, z1]: Rect, ceil: number, room: number) {
  const N = 4, STEP = Math.min(0.4, (room - 0.2) / N), IN = 0.85, top = ceil + N * STEP;
  const PLASTER = 'paint:#ece4d2', PAPER = 'flat:#f6efdc';
  for (let k = 1; k < N; k++) b.slab(PLASTER, x0 - 0.3, z0 - 0.3, x1 + 0.3, z1 + 0.3, ceil + k * STEP, ceil + (k + 1) * STEP, [[x0 + k * IN, z0 + k * IN, x1 - k * IN, z1 - k * IN]]);
  b.box(PLASTER, x0 - 0.3, top, z0 - 0.3, x1 + 0.3, top + 0.2, z1 + 0.3);
  for (let k = 0; k < N; k++) {
    const a = x0 + k * IN, c = x1 - k * IN, p = z0 + k * IN, q = z1 - k * IN, y = ceil + k * STEP;
    // The riser's face (the ceiling slab's own edge is the first), a timber rail at its head, light at its foot.
    for (const [ra, rp, rc, rq] of [[a, p, c, p + 0.03], [a, q - 0.03, c, q], [a, p, a + 0.03, q], [c - 0.03, p, c, q]] as Rect[]) b.deco(PLASTER, ra, y, rp, rc, y + STEP, rq);
    for (const [ra, rp, rc, rq] of [[a, p, c, p + 0.09], [a, q - 0.09, c, q], [a, p, a + 0.09, q], [c - 0.09, p, c, q]] as Rect[]) b.deco(TIMBER, ra, y + STEP - 0.1, rp, rc, y + STEP, rq);
    if (k > 0) for (const [ra, rp, rc, rq] of [[a - 0.5, p - 0.5, c + 0.5, p - 0.36], [a - 0.5, q + 0.36, c + 0.5, q + 0.5], [a - 0.5, p - 0.5, a - 0.36, q + 0.5], [c + 0.36, p - 0.5, c + 0.5, q + 0.5]] as Rect[]) b.deco('light', ra, y - 0.025, rp, rc, y, rq);
  }
  // The lattice: timber ribs both ways over paper panels, every third panel a light.
  const a = x0 + (N - 1) * IN, c = x1 - (N - 1) * IN, p = z0 + (N - 1) * IN, q = z1 - (N - 1) * IN;
  const nx = Math.max(2, Math.round((c - a) / 1.25)), nz = Math.max(2, Math.round((q - p) / 1.25));
  b.deco(PAPER, a, top - 0.012, p, c, top, q);
  for (let i = 0; i <= nx; i++) b.deco(TIMBER, a + ((c - a) * i) / nx - 0.045, top - 0.1, p, a + ((c - a) * i) / nx + 0.045, top, q);
  for (let j = 0; j <= nz; j++) b.deco(TIMBER, a, top - 0.1, p + ((q - p) * j) / nz - 0.045, c, top, p + ((q - p) * j) / nz + 0.045);
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    if ((i + 2 * j) % 3) continue;
    const u = a + ((c - a) * (i + 0.5)) / nx, v = p + ((q - p) * (j + 0.5)) / nz, hx = (c - a) / nx / 2 - 0.1, hz = (q - p) / nz / 2 - 0.1;
    b.deco('light', u - hx, top - 0.03, v - hz, u + hx, top - 0.012, v + hz);
  }
  return (x: number, z: number) => ceil + STEP * Math.min(N, 1 + Math.max(0, Math.floor(Math.min(x - x0, x1 - x, z - z0, z1 - z) / IN)));
}

export const look: StationLook = {
  hallVault,
  finishes: { wall: 'tile:#f2ece0', floor: 'floor:#d3ccbe', pillar: TILE, ceil: 'paint:#ddd6c6' },
  posters: false,
  skirting: false,

  lights(i) {
    const top = i.cf + i.clear, wells = i.stairwells.filter((w) => w.room < 0);
    const blocks = [...wellBlocks(wells), ...i.pillars.map(([x, z]): Rect => [x - 0.45, z - 0.45, x + 0.45, z + 0.45])];
    const lit = (z: number, p: number, q: number, w: number) => {
      for (const [a, c] of cut([p, q], spansOn(blocks, 'x', z, w / 2))) if (c - a > 0.8) i.b.deco('light', a, top - 0.02, z - w / 2, c, top, z + w / 2);
    };
    // Tateito-dōri: strips between the warp bands, and along the walls between the stairwells.
    const x0 = i.paid[0] + 3.9, x1 = i.paid[1] - 3.9;
    for (const k of [-0.62, -0.18, 0.18, 0.62]) lit(k * i.cw, x0, x1, 0.12);
    // Unpaid halls: strips along the hall.
    for (const e of i.ends) {
      const [p, q] = e.hi ? [e.g + 4.5, i.x1 - 2] : [i.x0 + 2, e.g - 4.5];
      for (const z of [-0.66, -0.22, 0.22, 0.66].map((k) => k * i.cw)) lit(z, p, q, 0.16);
    }
  },

  pillar(i, x, z, y0, y1) {
    const { b } = i, h = 0.4;
    b.deco(TILE, x - h, y0, z - h, x + h, y1, z + h);
    b.deco(`flat:${MADDER}`, x - h - 0.012, y0, z - h - 0.012, x + h + 0.012, y0 + 0.15, z + h + 0.012);
    if (x <= i.paid[0] || x >= i.paid[1]) return;
    // Woven band: a blue thread under madder bars, an indigo thread over them.
    b.deco(`flat:${BLUE}`, x - h - 0.006, y0 + 2.04, z - h - 0.006, x + h + 0.006, y0 + 2.1, z + h + 0.006);
    b.deco(`flat:${MADDER}`, x - h - 0.012, y0 + 1.96, z - 0.05, x + h + 0.012, y0 + 2.2, z + 0.05);
    b.deco(`flat:${MADDER}`, x - 0.05, y0 + 1.96, z - h - 0.012, x + 0.05, y0 + 2.2, z + h + 0.012);
    b.deco(`flat:${INDIGO}`, x - h - 0.018, y0 + 2.13, z - h - 0.018, x + h + 0.018, y0 + 2.17, z + h + 0.018);
  },

  concourse(i) {
    const rand = () => i.rand();
    // The remnant stall first (it wants the best free floor), then the walls, the stairwells, the
    // ceiling, the unpaid halls.
    const spot = loomSpot(i);
    if (spot) remnantStall(i, spot[0], spot[1]);
    spineWalls(i, rand);
    spineWells(i, rand);
    spineCeiling(i);
    unpaidHalls(i);
  },

  bay(r) {
    if (r.kind === 'spine') ayaori(r);
    else if (r.kind === 'cross passage') lane(r);
    else bay(r);
  },

  exit(e) {
    const { b, cf, ext } = e, L = ext + 4, t: T = { b, cf, clear: 2.7 };
    exitDado(e, { mat: TILE, top: 1.1, steps: 4 });
    // Woven stripe above the dado on both corridor walls and round the lobby.
    THREADS.forEach((c, k) => {
      const y = cf + 1.16 + k * 0.05;
      b.deco(`flat:${c}`, -4, y, 0, -3.988, y + 0.03, L);
      if (ext > 0) b.deco(`flat:${c}`, -0.012, y, 0, 0, y + 0.03, ext);
      b.deco(`flat:${c}`, -4, y, L - 0.012, 0, y + 0.03, L);
    });
    if (ext >= 4) {
      // The corridor is a street: warps under its ceiling, wefts across every 3 m (round the
      // light down the middle), and textile samples between the posters, one wall then the other.
      const top = cf + 2.5;
      for (const [k, x] of [-3.4, -0.6].entries()) b.deco(`flat:${THREADS[k * 2]}`, x - 0.05, top - 0.08, 0.6, x + 0.05, top - 0.05, ext - 0.2);
      for (let z = 1.5, k = 0; z < ext - 0.5; z += 3.5, k++) {
        const y = k % 2 ? top - 0.045 : top - 0.1;
        for (const [p, q] of [[-3.8, -2.4], [-1.6, -0.2]]) b.deco(`flat:${k % 2 ? CREAM : MADDER}`, p, y, z - 0.06, q, y + 0.03, z + 0.06);
      }
      const wl: Face = { axis: 'z', at: -4, n: 1 }, wr: Face = { axis: 'z', at: 0, n: -1 };
      for (let z = 2.2, k = 0; z + 0.4 <= ext - 0.2; z += 2, k++) {
        if (k % 2) continue;
        samples(t, (k / 2) % 2 ? wr : wl, z, 1, 1.2, 0.014);
      }
    }
    // The lobby: a shop window facing the stair, and the street's name on the back wall.
    const shop = EXIT_SHOPS[(parseInt(e.num, 10) || 0) % EXIT_SHOPS.length];
    if (!e.through) showcase(t, { axis: 'z', at: -4, n: 1 }, ext + 0.3, ext + 3.7, shop, 'old', { top: cf + 2.7, k: 0.016 });
    const st = EXIT_STREETS[e.num];
    if (st && !e.through) plate(t, { axis: 'x', at: L, n: -1 }, -2, st, 2.53, 0.004, 0.3);
    exitHandrails(e, ['far']);
  },

  canopy(e) {
    const { b, ext, run, gy } = e;
    const z0 = ext + 0.6, z1 = ext + 4.6, x0 = -0.6, x1 = run + 0.7, ry = gy + 2.5;
    // Steel posts and a glass roof in a steel frame.
    for (const [px, pz] of [[0, ext + 1.05], [0, ext + 4.15], [run, ext + 1.05], [run, ext + 4.15]]) b.deco(STEEL, px - 0.06, gy, pz - 0.06, px + 0.06, ry, pz + 0.06);
    b.deco('glassTint', x0, ry + 0.04, z0, x1, ry + 0.08, z1);
    b.deco(STEEL, x0, ry, z0, x1, ry + 0.12, z0 + 0.1);
    b.deco(STEEL, x0, ry, z1 - 0.1, x1, ry + 0.12, z1);
    b.deco(STEEL, x0, ry, z0, x0 + 0.1, ry + 0.12, z1);
    // Madder fascia round the front and sides.
    b.deco(`paint:${MADDER}`, x1 - 0.06, ry + 0.12, z0 - 0.02, x1, ry + 0.42, z1 + 0.02);
    b.deco(`paint:${MADDER}`, x0, ry + 0.12, z0 - 0.02, x1, ry + 0.42, z0 + 0.04);
    b.deco(`paint:${MADDER}`, x0, ry + 0.12, z1 - 0.04, x1, ry + 0.42, z1 + 0.02);
    // Board behind the entrance sign.
    b.deco('flat:#22262b', run - 0.04, gy + 1.88, ext + 1.1, run + 0.05, gy + 2.52, ext + 4.1);
    // Woven screens on both side walls: horizontal slats behind, vertical slats in front.
    for (const [zc, s] of [[ext + 1.05, -1], [ext + 4.15, 1]] as [number, number][]) {
      THREADS.slice(0, 3).forEach((c, k) => {
        const y = gy + 1.25 + k * 0.42;
        b.deco(`flat:${c}`, 0.1, y, zc - 0.015, run - 0.1, y + 0.1, zc + 0.015);
      });
      const n = Math.max(3, Math.round(run / 2.2));
      for (let k = 0; k <= n; k++) {
        const x = 0.1 + ((run - 0.3) * k) / n;
        b.deco(`flat:${THREADS[(k + 1) % 4]}`, x, gy + 1.05, zc + s * 0.02, x + 0.08, gy + 2.4, zc + s * 0.05);
      }
    }
  },

  passage(p) {
    const { b, pf, zc0, zc1 } = p, top = pf + 2.8;
    passageDado(p, { mat: TILE, top: 1.0, cap: `paint:${MADDER}` });
    // Woven stripes along the dado, continuing the mural's pattern.
    for (const w of passageWalls(p)) {
      for (const [a, c] of w.runs) {
        if (c - a < 1.5) continue;
        [BLUE, MADDER, INDIGO].forEach((col, k) => {
          const y = pf + 0.5 + k * 0.14, z = w.f > 0 ? [w.z, w.z + 0.012] : [w.z - 0.012, w.z];
          b.deco(`flat:${col}`, a, y, z[0], c, y + 0.06, z[1]);
        });
      }
    }
    passageRails(p);
    // Warp bands along the ceiling, wefts across every 3 m.
    [zc0 + 0.5, zc0 + 1.1, zc1 - 1.1, zc1 - 0.5].forEach((z, k) => b.deco(`flat:${THREADS[k]}`, -25.9, top - 0.13, z - 0.05, 3.9, top - 0.1, z + 0.05));
    for (let x = -24.5, k = 0; x < 3; x += 3, k++) {
      const y = k % 2 ? top - 0.09 : top - 0.17;
      b.deco(`flat:${k % 2 ? CREAM : BLUE}`, x - 0.07, y, zc0 + 0.2, x + 0.07, y + 0.03, zc1 - 0.2);
    }
    // Framed textile samples on the long zc0 wall between the doorways.
    for (const w of passageWalls(p).filter((q) => q.f > 0)) {
      for (const [a, c] of w.runs) {
        if (c - a < 6) continue;
        const n = Math.floor((c - a - 2) / 3.2);
        for (let k = 0; k < n; k++) {
          const x = a + (c - a) / 2 + (k - (n - 1) / 2) * 3.2, col = CLOTH[k % CLOTH.length];
          b.deco(TIMBER, x - 0.36, pf + 1.3, w.z, x + 0.36, pf + 2.0, w.z + 0.03);
          b.deco(`flat:${col}`, x - 0.3, pf + 1.36, w.z + 0.03, x + 0.3, pf + 1.94, w.z + 0.04);
          b.deco(`flat:${THREADS[(k + 1) % 4]}`, x - 0.3, pf + 1.58, w.z + 0.04, x + 0.3, pf + 1.66, w.z + 0.045);
        }
      }
    }
  },
};
