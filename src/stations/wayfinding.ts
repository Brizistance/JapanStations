// Wayfinding: the signs that guide a passenger between the street, the gates and the platforms.
//
// Everything here is generated from the network data and from what the composers built (which
// stair leads where, which exit is which), never typed in per station. Each function runs after
// the kit has placed its own parts and before the station's look adds its decoration; the space
// round every sign placed here should be `b.protect`ed so that decoration is cut back from it.
//
// Arrows are never typed as left/right: a sign is given the direction (in its own frame) of the
// thing it points at, seen from where its reader stands, and `Builder.sign` turns that into an
// arrow for the face it is drawn on. Where the space a sign needs is taken (a stair opening, a
// pillar, another sign, the kit's own parts), the sign moves a little or is left out; it is never
// put somewhere its arrows would be wrong.

import { linesAt } from '../data/network';
import type { LineDef, StationDef } from '../data/types';
import type { Arrow, Picto, SignContent } from '../signs/content';
import type { Builder, SignPart, V2 } from '../world/builder';
import { stationExits } from './exits';
import type { StationStyle } from './kit';
import type { ConcInfo, ExitInfo, PassageInfo, Rect, StairInfo } from './looks/types';

/** What a transfer passage's builder knows beyond `PassageInfo`. */
export interface PassageCtx {
  /** The line whose platforms the passage runs beside. */
  primary: LineDef;
  /** Doorways from that line's platform into the passage, as x-ranges on the zc0 wall. */
  doorways: [number, number][];
}

/**
 * The street-level concourse of an elevated station: x0 … x1 by −cw … +cw, floor at `fl`,
 * underside of the viaduct deck at `top`. The gate line runs across at x = `gateX`; the unpaid
 * side is x < gateX, with ticket machines on the −z wall. Stairs climb along +x from `x` to
 * each side platform.
 */
export interface ElevInfo {
  b: Builder;
  station: StationDef;
  line: LineDef;
  style: StationStyle;
  fl: number;
  top: number;
  cw: number;
  x0: number;
  x1: number;
  gateX: number;
  /** Foot of each platform stair (x, z), the platform it reaches and that platform's direction. */
  stairs: { x: number; z: number; platform: number; dir: 'down' | 'up' }[];
  /** A line crossing underneath, reached by the stair opening `hole` in the paid area. */
  under?: { line: LineDef; platforms: number[]; hole: Rect };
  /** Street entrances: centre, outward normal and width of each opening. */
  entrances: { x: number; z: number; n: [number, number]; w: number }[];
}

// ── Geometry helpers ─────────────────────────────────────────────────────────────────────────

const unit = (v: V2): V2 => {
  const l = Math.hypot(v[0], v[1]);
  return l < 1e-9 ? [0, 0] : [v[0] / l, v[1] / l];
};
const grow = (r: Rect, m: number): Rect => [r[0] - m, r[1] - m, r[2] + m, r[3] + m];
const overlaps = (a: Rect, q: Rect) => a[0] < q[2] && a[2] > q[0] && a[1] < q[3] && a[3] > q[1];

/** The arrow `Builder.sign` draws for direction `a` on a sign facing `n` (the same rule). */
function arrowFor(a: V2, n: V2): Arrow {
  const u = unit(a);
  const right = u[0] * n[1] - u[1] * n[0];
  const toward = u[0] * n[0] + u[1] * n[1];
  return right > 0.5 ? 'right' : right < -0.5 ? 'left' : toward > 0.5 ? 'down' : 'up';
}
const ARROW_ORDER: Record<Arrow, number> = { left: 0, up: 1, down: 2, right: 3 };
/** More than 120° off the way someone is walking: not worth a sign; they will meet another. */
const behind = (to: V2, walk: V2) => {
  const u = unit(to);
  return u[0] * walk[0] + u[1] * walk[1] < -0.5;
};

/** The footprint of a sign standing in the plane through (x, z) with normal `n`, `w` wide. */
function planeRect(x: number, z: number, n: V2, w: number, depth: number): Rect {
  return Math.abs(n[0]) > 0.5 ? [x - depth, z - w / 2, x + depth, z + w / 2] : [x - w / 2, z - depth, x + w / 2, z + depth];
}

/** A rectangle in the builder's current frame, in its root coordinates (where `b.out` lives). */
function toRoot(b: Builder, r: Rect): Rect {
  const p = b.pt(r[0], 0, r[1]), q = b.pt(r[2], 0, r[3]);
  return [Math.min(p[0], q[0]), Math.min(p[2], q[2]), Math.max(p[0], q[0]), Math.max(p[2], q[2])];
}

/** The footprint of a placed sign (root coordinates), thin in its normal. */
function signRect(s: SignPart, depth = 0.1): Rect | null {
  if (!s.normal) return null;
  return planeRect(s.pos[0], s.pos[2], s.normal, s.w, depth);
}

/**
 * Free space for hanging signs at one level: what is already there between `lo` and `hi`
 * (solid or decoration, and other signs), plus whatever is blocked by hand. Rectangles are kept
 * in the builder's root coordinates; queries are in its current frame.
 */
class Space {
  private taken: Rect[] = [];
  constructor(private b: Builder, private bounds: Rect) {}

  /** Take in everything the builder already holds that reaches into y ∈ (lo, hi) inside the bounds. */
  scan(lo: number, hi: number, signLo: number, signHi: number) {
    const k = this.bounds;
    for (const p of this.b.out.boxes) {
      if (p.max[1] <= lo || p.min[1] >= hi) continue;
      const r: Rect = [p.min[0], p.min[2], p.max[0], p.max[2]];
      if (overlaps(r, k)) this.taken.push(r);
    }
    for (const s of this.b.out.signs) {
      if (s.pos[1] + s.h / 2 <= signLo || s.pos[1] - s.h / 2 >= signHi) continue;
      const r = signRect(s);
      if (r && overlaps(r, k)) this.taken.push(r);
    }
  }
  /** Block a rectangle given in the current frame. */
  block(r: Rect) {
    this.taken.push(toRoot(this.b, r));
  }
  /** Is a rectangle in the current frame inside the bounds and clear? */
  ok(r: Rect): boolean {
    const q = toRoot(this.b, r), k = this.bounds;
    if (q[0] < k[0] || q[1] < k[1] || q[2] > k[2] || q[3] > k[3]) return false;
    return !this.taken.some((t) => overlaps(q, t));
  }
}

// ── Hanging signs ────────────────────────────────────────────────────────────────────────────

/** One panel of a hanging sign; `to` is the direction (current frame) its arrow points. */
interface Seg {
  c: SignContent;
  to?: V2;
  /** What it leads to (platforms), so a sign short of room keeps one panel for each. */
  keys?: string[];
}

/** At most `max` panels, in order, preferring ones that lead somewhere no earlier panel does. */
function capSegs(segs: Seg[], max: number): Seg[] {
  if (segs.length <= max) return segs;
  const seen = new Set<string>(), keep = new Set<number>();
  segs.forEach((s, k) => {
    if (keep.size < max && (s.keys ?? [`#${k}`]).some((key) => !seen.has(key))) {
      keep.add(k);
      for (const key of s.keys ?? []) seen.add(key);
    }
  });
  segs.forEach((_, k) => keep.size < max && keep.add(k));
  return segs.filter((_, k) => keep.has(k));
}

interface HangReq {
  /** Normal of the front face: the front is read by people walking along −n. */
  n: V2;
  y: number;
  h: number;
  /** Width of one panel. */
  segW: number;
  front: Seg[];
  back: Seg[];
  /** Ceiling the hangers reach up to. */
  ceil: number;
  /** Keep panels in the order given (otherwise sorted by arrow, left to right). */
  keepOrder?: boolean;
  /** Panels worked out for the centre actually used (replaces front/back), so arrows are exact. */
  at?: (x: number, z: number) => { front: Seg[]; back: Seg[] };
  /** Called with the footprint (current frame) once the sign is placed. */
  onPlace?: (r: Rect) => void;
}

const SEG_MAX = 3.0;
const BOARD = 'flat:#22262b';

function sortSegs(segs: Seg[], n: V2): Seg[] {
  const key = (s: Seg) => (s.to ? ARROW_ORDER[arrowFor(s.to, n)] : 1);
  return segs.map((s, i) => ({ s, i })).sort((a, b) => key(a.s) - key(b.s) || a.i - b.i).map((e) => e.s);
}

/** Draw a double-sided hanging sign of total width `W` centred on (x, z). */
function drawHang(b: Builder, x: number, z: number, r: HangReq, W: number) {
  const { n, y, h } = r;
  const rF: V2 = [n[1], -n[0]]; // the front reader's right
  const at = (u: number, d: number): [number, number] => [x + rF[0] * u + n[0] * d, z + rF[1] * u + n[1] * d];
  const slab = (mat: string, u0: number, u1: number, y0: number, y1: number, t: number) => {
    const a = at(u0, -t), c = at(u1, t);
    b.deco(mat, Math.min(a[0], c[0]), y0, Math.min(a[1], c[1]), Math.max(a[0], c[0]), y1, Math.max(a[1], c[1]));
  };
  const half = W / 2;
  slab(BOARD, -half - 0.03, half + 0.03, y - h / 2 - 0.03, y + h / 2 + 0.03, 0.04);
  if (r.ceil > y + h / 2 + 0.05) {
    for (const u of [-half + 0.25, half - 0.25]) slab('flat:#555a60', u - 0.02, u + 0.02, y + h / 2 + 0.03, r.ceil, 0.02);
  }
  const side = (segs: Seg[], nn: V2, sgn: 1 | -1) => {
    if (!segs.length) return;
    const list = r.keepOrder ? segs : sortSegs(segs, nn);
    const w = Math.min(W / list.length, SEG_MAX), total = w * list.length;
    list.forEach((s, k) => {
      const u = sgn * (-total / 2 + w * (k + 0.5));
      const [px, pz] = at(u, sgn * 0.05);
      b.sign(s.c, px, y, pz, nn, w - 0.05, h, s.to ? { arrow: unit(s.to) } : {});
    });
  };
  side(r.front, n, 1);
  side(r.back, [-n[0], -n[1]], -1);
  // Keep the look's decoration out of the sign, the space in front of both faces and the hangers.
  const a = at(-half - 0.1, -0.55), c = at(half + 0.1, 0.55);
  b.protect(Math.min(a[0], c[0]), y - h / 2 - 0.1, Math.min(a[1], c[1]), Math.max(a[0], c[0]), Math.max(r.ceil, y + h / 2 + 0.1), Math.max(a[1], c[1]));
}

/**
 * Hang a sign at the first candidate centre where it fits (narrowing it a little if need be).
 * Returns where it went, or null if it fits nowhere.
 */
function placeHang(b: Builder, sp: Space, r: HangReq, cands: V2[]): V2 | null {
  for (const shrink of [1, 0.85, 0.7]) {
    if (r.segW * shrink < 1.5) break;
    for (const [x, z] of cands) {
      const s = r.at ? { ...r, ...r.at(x, z) } : r;
      const n = Math.max(s.front.length, s.back.length);
      if (!n) continue;
      const W = n * r.segW * shrink;
      if (!sp.ok(planeRect(x, z, r.n, W + 0.2, 0.6))) continue;
      drawHang(b, x, z, s, W);
      // Keep other hanging signs well clear, so two never hang one behind the other.
      sp.block(planeRect(x, z, r.n, W + 0.6, 1.8));
      r.onPlace?.(planeRect(x, z, r.n, W, 0.3));
      return [x, z];
    }
  }
  return null;
}

/** Candidate centres round (x, z): small steps along each axis, nearest first. */
function around(x: number, z: number, dxs: number[], dzs: number[]): V2[] {
  const out: V2[] = [];
  for (const dz of dzs) for (const dx of dxs) out.push([x + dx, z + dz]);
  return out.sort((p, q) => Math.hypot(p[0] - x, p[1] - z) - Math.hypot(q[0] - x, q[1] - z));
}

/** A projecting sign: double-sided, sticking out from a wall, the same content on both faces. */
function projecting(b: Builder, c: SignContent, x: number, y: number, wallZ: number, out: 1 | -1, w: number, h: number) {
  const z = wallZ + out * (0.12 + w / 2);
  b.deco(BOARD, x - 0.04, y - h / 2 - 0.03, z - w / 2 - 0.03, x + 0.04, y + h / 2 + 0.03, z + w / 2 + 0.03);
  b.deco('flat:#555a60', x - 0.02, y + h / 2 + 0.03, Math.min(wallZ, z), x + 0.02, y + h / 2 + 0.07, Math.max(wallZ, z + out * (w / 2)));
  b.sign(c, x + 0.05, y, z, [1, 0], w - 0.04, h);
  b.sign(c, x - 0.05, y, z, [-1, 0], w - 0.04, h);
  b.protect(x - 0.55, y - h / 2 - 0.1, Math.min(wallZ, z - w / 2 - 0.1), x + 0.55, y + h / 2 + 0.15, Math.max(wallZ, z + w / 2 + 0.1));
}

/** A flat sign on a wall face, with its protected space in front. `n` is the way it faces. */
function flat(b: Builder, c: SignContent, x: number, y: number, z: number, n: V2, w: number, h: number, frame = false) {
  if (frame) {
    const r = planeRect(x - n[0] * 0.012, z - n[1] * 0.012, n, w + 0.08, 0.012);
    b.deco('flat:#3b4046', r[0], y - h / 2 - 0.04, r[1], r[2], y + h / 2 + 0.04, r[3]);
  }
  b.sign(c, x, y, z, n, w, h);
  const a = planeRect(x + n[0] * 0.125, z + n[1] * 0.125, n, w + 0.2, 0.15);
  b.protect(a[0], y - h / 2 - 0.1, a[1], a[2], y + h / 2 + 0.1, a[3]);
}

// ── What signs say ───────────────────────────────────────────────────────────────────────────

const dirOf = (st: StationDef, line: LineDef, p: number): 'down' | 'up' => (st.platforms[line.id]?.[0] === p ? 'down' : 'up');
const numList = (nums: number[], sep: string) => [...new Set(nums)].sort((a, b) => a - b).join(sep);
const enPlatforms = (nums: number[]) => `${new Set(nums).size > 1 ? 'Platforms' : 'Platform'} ${numList(nums, ', ')}`;

/** Panels pointing to the stairs from (x, z) for someone walking along `walk`: grouped by arrow. */
function platformSegs(station: StationDef, stairs: StairInfo[], at: V2, walk: V2, mode: 'board' | 'transfer', skip?: string): Seg[] {
  const n: V2 = [-walk[0], -walk[1]];
  // Every stair serving each platform (or, for transfers, each line) that is not behind.
  type T = { st: StairInfo; p: number; to: V2; d: number; a: Arrow };
  const all = new Map<string, T[]>();
  for (const st of stairs) {
    if (st.line.id === skip) continue;
    const to: V2 = [st.top[0] - at[0], st.top[1] - at[1]];
    const d = Math.hypot(to[0], to[1]);
    const a = arrowFor(to, n);
    if (d < 1 || behind(to, walk)) continue;
    for (const p of mode === 'transfer' ? [st.platforms[0]] : st.platforms) {
      const key = mode === 'transfer' ? st.line.id : `${st.line.id}|${p}`;
      all.set(key, [...(all.get(key) ?? []), { st, p, to, d, a }]);
    }
  }
  // The nearest, and any other about as near that lies another way (stairs on both sides).
  const groups = new Map<Arrow, T[]>();
  for (const list of all.values()) {
    list.sort((a, b) => a.d - b.d);
    const near = list.filter((t) => t.d <= list[0].d + 1.5);
    for (const t of near) {
      const g = groups.get(t.a) ?? [];
      if (!g.some((u) => u.st.line.id === t.st.line.id && u.p === t.p)) groups.set(t.a, [...g, t]);
    }
  }
  if (mode === 'transfer') {
    const out: T[] = [];
    for (const g of groups.values()) out.push(...g);
    return out.sort((a, b) => a.d - b.d).map(({ st, to }) => ({
      c: { k: 'guide', ja: `${st.line.nameJa} のりかえ`, en: `Transfer: ${st.line.nameEn}`, bg: 'white', badges: [st.line.id] },
      to,
      keys: [st.line.id],
    }));
  }
  const out: { seg: Seg; d: number }[] = [];
  for (const g of groups.values()) {
    g.sort((a, b) => a.d - b.d);
    const to = g[0].to, d = g[0].d;
    const keys = g.map((t) => `${t.st.line.id}|${t.p}`);
    if (g.length === 1 && g[0].st.kind === 'platform') {
      out.push({ seg: { c: { k: 'dir', station: station.id, line: g[0].st.line.id, dir: dirOf(station, g[0].st.line, g[0].p) }, to, keys }, d });
    } else {
      const nums = g.map((t) => t.p);
      const badges = [...new Set(g.map((t) => t.st.line.id))];
      out.push({ seg: { c: { k: 'guide', ja: `のりば ${numList(nums, '・')}`, en: enPlatforms(nums), bg: 'navy', badges }, to, keys }, d });
    }
  }
  return out.sort((a, b) => a.d - b.d).map((o) => o.seg);
}

// ── Concourse ────────────────────────────────────────────────────────────────────────────────

/** Rows (z) for signs repeated across a wide hall, about every 16 m. */
function rows(cw: number): number[] {
  if (cw < 16) return [0];
  const n = Math.max(2, Math.round((2 * cw) / 16));
  return Array.from({ length: n }, (_, k) => -cw + (2 * cw * (k + 0.5)) / n);
}

/** Signs in a concourse: platform, transfer and exit directions, exit boards, maps, pictograms. */
export function wayfindConcourse(i: ConcInfo): void {
  const { b, station, cf, cw } = i;
  const ceil = cf + i.clear;
  const y = cf + 2.6, h = 0.45;
  const narrow = cw < 9;
  const segW = narrow ? 2.2 : 2.5;
  const maxSegs = narrow ? 2 : cw >= 16 ? 4 : 3;
  const lines = linesAt(station.id).map((l) => l.id);
  const exitsOf = (end: number) => i.exits.filter((e) => e.end === end).map((e) => e.num).sort();

  const sp = new Space(b, [i.x0 + 0.3, -cw + 0.15, i.x1 - 0.3, cw - 0.15]);
  sp.scan(cf + 2.2, ceil - 0.3, cf + 1.2, ceil);
  for (const r of i.holes) sp.block(grow(r, 0.15));
  for (const [x, z] of i.pillars) sp.block([x - 0.45, z - 0.45, x + 0.45, z + 0.45]);
  const placed: V2[] = [];

  /** The nearest gate line ahead of someone at x walking along walk, and a panel pointing to it. */
  const gateAhead = (at: V2, walk: V2): Seg | null => {
    if (Math.abs(walk[0]) < 0.7) return null;
    let best = -1, bd = Infinity;
    i.ends.forEach((e, k) => {
      const d = (e.g - at[0]) * Math.sign(walk[0]);
      if (d > 1 && d < bd) (best = k), (bd = d);
    });
    if (best < 0) return null;
    const only = exitsOf(best);
    if (!only.length) return null;
    return { c: { k: 'exits', station: station.id, only }, to: [Math.sign(walk[0]), 0] };
  };
  const cap = (segs: Seg[]) => capSegs(segs, maxSegs);
  // Hanging signs keep the floor under them, so nothing solid (a shop) is built up into them.
  const claim = (r: Rect) => i.claim(r[0], r[1], r[2], r[3]);

  // 1. Over the top of every stair: where it goes (front), the way out and transfers (back).
  //    Transfer stairs first: they sit beside the primary's and have the narrower signs.
  for (const st of [...i.stairs].sort((a, c) => (a.kind === 'transfer' ? 0 : 1) - (c.kind === 'transfer' ? 0 : 1))) {
    const d = unit(st.down);
    const n: V2 = [-d[0], -d[1]];
    const alongX = Math.abs(d[0]) > 0.5;
    const cx = alongX ? st.top[0] : (st.rect[0] + st.rect[2]) / 2;
    const cz = alongX ? (st.rect[1] + st.rect[3]) / 2 : st.top[1];
    let front: Seg[];
    if (st.kind === 'platform') {
      const nums = [...st.platforms].sort((a, b) => (dirOf(station, st.line, a) === 'down' ? -1 : 1) - (dirOf(station, st.line, b) === 'down' ? -1 : 1));
      // Down platforms are on the hall's −z side: lay the panels out the same way round.
      const rF: V2 = [n[1], -n[0]];
      if (rF[1] < 0) nums.reverse();
      front = nums.map((p) => ({ c: { k: 'dir', station: station.id, line: st.line.id, dir: dirOf(station, st.line, p), arrow: 'down' } }));
    } else {
      const nums = st.platforms;
      front = [{
        c: {
          k: 'guide', ja: `${st.line.nameJa} のりかえ ${numList(nums, '・')}番線`, en: `Transfer: ${st.line.nameEn} · ${enPlatforms(nums)}`,
          bg: 'white', badges: [st.line.id], arrow: 'down',
        },
      }];
    }
    // Back: read by people coming up, walking along n: the exits ahead, and transfers.
    const backAt = (x: number, z: number): Seg[] => {
      const at: V2 = [x, z];
      const out: Seg[] = [];
      const ex = gateAhead(at, n);
      if (ex) out.push(ex);
      out.push(...platformSegs(station, i.stairs, at, n, 'transfer', st.line.id));
      return capSegs(out, Math.min(maxSegs, 3));
    };
    const w = st.kind === 'transfer' && backAt(cx, cz).length <= 1 ? 3.0 : segW;
    // Candidates step back from the opening (along n, never over it) and a little to the side.
    const rF: V2 = [n[1], -n[0]];
    const cands: V2[] = [];
    for (const s of [0, -0.4, 0.4, -0.8, 0.8, -1.2, 1.2]) for (const off of [0, 0.4, 0.8, 1.2]) cands.push([cx + n[0] * off + rF[0] * s, cz + n[1] * off + rF[1] * s]);
    const where = placeHang(b, sp, { n, y, h, segW: w, front, back: [], ceil, at: (x, z) => ({ front, back: backAt(x, z) }), onPlace: claim }, cands);
    if (where) placed.push(where);
  }

  // 2. Paid area: by each gate line, which way to the platforms (for people coming in) and the
  //    exits through that gate (for people going out); then repeated along the hall.
  const hasHang = (x: number, z: number, r: number) => placed.some((p) => Math.hypot(p[0] - x, p[1] - z) < r);
  const [p0, p1] = i.paid;
  const anchors: { x: number; gate: number | null }[] = [];
  i.ends.forEach((e, k) => {
    const x = e.hi ? e.g - 5.5 : e.g + 5.5;
    if (x > p0 + 1 && x < p1 - 1) anchors.push({ x, gate: k });
  });
  {
    // Fill the hall between them (or between a gate and the far wall) about every 18 m.
    const lo = anchors.filter((a) => !i.ends[a.gate!].hi).map((a) => a.x);
    const hi = anchors.filter((a) => i.ends[a.gate!].hi).map((a) => a.x);
    const a = lo.length ? Math.max(...lo) : p0 + 6, c = hi.length ? Math.min(...hi) : p1 - 6;
    const L = c - a;
    if (lo.length && hi.length) {
      const m = Math.floor(L / 18);
      for (let k = 1; k <= m; k++) anchors.push({ x: a + (L * k) / (m + 1), gate: null });
    } else if (hi.length) {
      for (let x = c - 18; x >= a - 4; x -= 18) anchors.push({ x, gate: null });
    } else if (lo.length) {
      for (let x = a + 18; x <= c + 4; x += 18) anchors.push({ x, gate: null });
    }
  }
  const inPaid = (x: number) => x > p0 + 1.2 && x < p1 - 1.2;
  for (const an of anchors) {
    for (const z of rows(cw)) {
      if (an.gate === null && hasHang(an.x, z, 5)) continue;
      const e = an.gate !== null ? i.ends[an.gate] : null;
      // Front faces +x, so it is read by people walking −x.
      const facesAt = (x: number, z: number) => {
        const faces = ([[-1, 0], [1, 0]] as V2[]).map((walk) => {
          const at: V2 = [x, z];
          // Walking away from the gate just passed: platforms only. Towards it: its exits only.
          if (e && Math.sign(walk[0]) === (e.hi ? 1 : -1)) {
            const ex = gateAhead(at, walk);
            return ex ? [ex] : [];
          }
          const segs = platformSegs(station, i.stairs, at, walk, 'board');
          if (!e) {
            const ex = gateAhead(at, walk);
            if (ex) segs.unshift(ex);
          }
          return cap(segs);
        });
        let [front, back] = faces;
        // By a gate, both faces must say something; elsewhere a face with nothing ahead repeats
        // the other (its arrows then point back the way the reader came).
        if (e && !faces.every((f) => f.length)) return { front: [], back: [] };
        if (!front.length) front = back;
        if (!back.length) back = front;
        return { front, back };
      };
      const cands = around(an.x, z, [0, -0.8, 0.8, -1.6, 1.6, -2.5, 2.5], [0, -1.2, 1.2, -2.4, 2.4]).filter(([x]) => inPaid(x));
      const where = placeHang(b, sp, { n: [1, 0], y, h, segW, front: [], back: [], ceil, at: facesAt, onPlace: claim }, cands);
      if (where) placed.push(where);
    }
  }

  // 3. Unpaid halls: just outside the gates, which way to each exit (and back: to the trains, tickets).
  const fares = b.out.signs.filter((s) => s.content.k === 'faremap' && Math.abs(s.pos[1] - (cf + 2.46)) < 0.3);
  i.ends.forEach((e, k) => {
    const hx = e.hi ? 1 : -1;
    const x = e.g + hx * 5.5;
    const doors = i.exits.filter((d) => d.end === k);
    const fare = fares.find((s) => (s.pos[0] - e.g) * hx > 0 && Math.abs(s.pos[0] - e.g) < 12 && Math.abs(s.pos[2]) < cw + 0.5);
    const facesAt = (x: number, z: number) => {
      const front: Seg[] = doors.map((d) => ({ c: { k: 'exits', station: station.id, only: [d.num] }, to: [(d.x0 + d.x1) / 2 - x, d.s * cw - z] }));
      const back: Seg[] = [{ c: { k: 'guide', ja: 'のりば', en: 'To trains', bg: 'navy', badges: lines }, to: [-hx, 0] }];
      if (fare) back.push({ c: { k: 'picto', v: 'tickets', label: true }, to: [fare.pos[0] - x, fare.pos[2] - z] });
      return { front, back };
    };
    const cands = around(x, 0, [0, 0.8, -0.8, 1.6], [0, -1.2, 1.2]).filter(([cx]) => (cx - e.g) * hx > 3.5 && (cx - e.g) * hx < 8.5);
    if (doors.length) placeHang(b, sp, { n: [-hx, 0], y, h, segW: narrow ? 2.1 : 2.4, front: [], back: [], ceil, at: facesAt, onPlace: claim }, cands);
  });

  // 4. Boards on the walls: exits, station map and area map in each unpaid hall; exits and
  //    station map inside the gates.
  const wallSolids = b.out.boxes
    .filter((p) => p.max[1] > cf + 0.05 && p.min[1] < cf + 2.4)
    .map((p): Rect => [p.min[0], p.min[2], p.max[0], p.max[2]]);
  const wallSigns = b.out.signs
    .filter((s) => s.pos[1] + s.h / 2 > cf && s.pos[1] - s.h / 2 < ceil)
    .map((s) => signRect(s, 0.1))
    .filter((r): r is Rect => !!r);
  const boards: Rect[] = [];
  const wallOk = (x: number, s: 1 | -1, w: number, paid: boolean): boolean => {
    const xa = x - w / 2, xb = x + w / 2;
    if (xa < i.x0 + 0.4 || xb > i.x1 - 0.4) return false;
    if (i.exits.some((d) => d.s === s && xb > d.x0 - 0.4 && xa < d.x1 + 0.4)) return false;
    const strip: Rect = s > 0 ? [xa, cw - 0.8, xb, cw - 0.05] : [xa, -cw + 0.05, xb, -cw + 0.8];
    const face: Rect = s > 0 ? [xa - 0.15, cw - 0.25, xb + 0.15, cw + 0.05] : [xa - 0.15, -cw - 0.05, xb + 0.15, -cw + 0.25];
    if (wallSolids.some((r) => overlaps(r, strip))) return false;
    if (wallSigns.some((r) => overlaps(r, face) || overlaps(r, strip))) return false;
    if (boards.some((r) => overlaps(r, face))) return false;
    if (i.holes.some((r) => overlaps(grow(r, 0.3), strip))) return false;
    if (i.pillars.some(([px, pz]) => overlaps([px - 0.5, pz - 0.5, px + 0.5, pz + 0.5], strip))) return false;
    return !paid || i.free(strip[0], strip[1], strip[2], strip[3]);
  };
  const board = (c: SignContent, x: number, s: 1 | -1, w: number, bh: number, yc: number) => {
    flat(b, c, x, yc, s * (cw - 0.02), [0, -s], w, bh, true);
    const strip: Rect = s > 0 ? [x - w / 2, cw - 0.8, x + w / 2, cw] : [x - w / 2, -cw, x + w / 2, -cw + 0.8];
    i.claim(strip[0], strip[1], strip[2], strip[3]);
    boards.push(s > 0 ? [x - w / 2 - 0.3, cw - 0.3, x + w / 2 + 0.3, cw + 0.1] : [x - w / 2 - 0.3, -cw - 0.1, x + w / 2 + 0.3, -cw + 0.3]);
  };
  /** First spot along `xs` (on walls `ss`) where a board fits. */
  const findWall = (xs: number[], ss: (1 | -1)[], w: number, paid: boolean): [number, 1 | -1] | null => {
    for (const x of xs) for (const s of ss) if (wallOk(x, s, w, paid)) return [x, s];
    return null;
  };
  const exitsBoard: SignContent = { k: 'exits', station: station.id };
  const ew = narrow ? 1.8 : 2.0;
  i.ends.forEach((e) => {
    const hx = e.hi ? 1 : -1;
    const at = (lx: number) => e.g + hx * lx;
    // Exits: by the gates on the −z wall, between the fence and the ticket machines.
    const ex = findWall([1.45, 1.6, 1.3].map(at), [-1], ew, false);
    if (ex) board(exitsBoard, ex[0], ex[1], ew, 1.3, cf + 1.45);
    // Maps: on the walls between the exit doorways and the end wall, where people turn to go out.
    const sm = findWall([14.5, 14.3, 14.7].map(at), [-1, 1], 2.2, false);
    if (sm) board({ k: 'stationmap', station: station.id }, sm[0], sm[1], 2.2, 1.5, cf + 1.5);
    const am = findWall([14.5, 14.3, 14.7].map(at), [1, -1], 2.2, false);
    if (am) board({ k: 'areamap', station: station.id }, am[0], am[1], 2.2, 1.5, cf + 1.5);
  });
  {
    // Inside the gates: an exits board and a station map on the walls near the main gate line.
    const e = i.ends[0];
    if (e) {
      const hx = e.hi ? 1 : -1;
      const xs: number[] = [];
      for (let d = 5; d < p1 - p0; d += 0.5) {
        const x = e.g - hx * d;
        if (inPaid(x)) xs.push(x);
      }
      const ex = findWall(xs, [-1, 1], 2.2, true);
      if (ex) board(exitsBoard, ex[0], ex[1], 2.2, 1.3, cf + 1.45);
      const sm = findWall(xs, ex ? [ex[1], -ex[1] as 1 | -1] : [-1, 1], 2.2, true);
      if (sm) board({ k: 'stationmap', station: station.id }, sm[0], sm[1], 2.2, 1.5, cf + 1.5);
    }
  }

  // 5. Facilities, signed at the thing itself (the kit's parts are found by their signs).
  const here = (s: SignPart, yc: number) =>
    Math.abs(s.pos[1] - yc) < 0.15 && s.pos[0] > i.x0 && s.pos[0] < i.x1 && Math.abs(s.pos[2]) <= cw + 0.1;
  const picto = (v: Picto): SignContent => ({ k: 'picto', v, label: true });
  const pictoSp = new Space(b, [i.x0 + 0.3, -cw - 0.5, i.x1 - 0.3, cw + 0.5]);
  pictoSp.scan(cf + 2.2, ceil - 0.05, cf + 2.0, ceil);
  for (const s of b.out.signs.filter((s) => s.content.k === 'label' && s.content.text === 'お手洗い' && here(s, cf + 2.55))) {
    // Toilets: a projecting sign beside the doors, seen from along the hall.
    const n = s.normal!;
    if (Math.abs(n[1]) < 0.5) continue;
    const wallZ = Math.round((s.pos[2] - n[1] * 0.03) * 1000) / 1000;
    for (const dx of [1.6, -1.6, 2.2, -2.2]) {
      const x = s.pos[0] + dx;
      const za = wallZ + n[1] * 0.02, zb = wallZ + n[1] * 1.1;
      const r: Rect = [x - 0.3, Math.min(za, zb), x + 0.3, Math.max(za, zb)];
      if (!pictoSp.ok(r) || i.holes.some((q) => overlaps(grow(q, 0.2), r))) continue;
      projecting(b, picto('toilet'), x, cf + 2.6, wallZ, n[1] > 0 ? 1 : -1, 0.85, 0.5);
      pictoSp.block(grow(r, 0.4));
      break;
    }
  }
  for (const s of b.out.signs) {
    if (s.content.k !== 'machine' || !s.normal) continue;
    const n = s.normal;
    if (s.content.v === 'door' && Math.abs(n[0]) > 0.5 && here(s, cf + 1.05) && i.ends.some((e) => Math.abs(Math.abs(s.pos[0] - e.g) - 3.02) < 0.1)) {
      // The station office door, on the office's unpaid-side face.
      flat(b, picto('office'), s.pos[0] + n[0] * 0.01, cf + 2.42, s.pos[2], n, 0.8, 0.4);
    } else if (s.content.v === 'locker' && here(s, cf + 0.95)) {
      // Lockers: on the wall above them.
      const wz = Math.sign(-n[1]) * cw;
      flat(b, picto('locker'), s.pos[0], cf + 2.3, wz + n[1] * 0.02, n, 0.8, 0.4);
    } else if (s.content.v === 'elevator' && here(s, cf + 1.15)) {
      // Lift: over the door.
      flat(b, picto('lift'), s.pos[0] + n[0] * 0.01, cf + 2.55, s.pos[2] + n[1] * 0.01, n, 0.8, 0.4);
    }
  }
}

// ── Exits ────────────────────────────────────────────────────────────────────────────────────

/** Signs in one exit corridor, lobby and stair. */
export function wayfindExit(e: ExitInfo): void {
  const { b, station, cf, ext, num } = e;
  // Lobby: what is near this exit, on the end wall people face as they arrive from the concourse
  // (beside the poster at x = −2).
  flat(b, { k: 'exits', station: station.id, only: [num] }, -3.3, cf + 1.55, ext + 3.98, [0, -1], 1.1, 0.9, true);
  // Foot of the stair, facing people coming down: the way to the gates, with this station's lines.
  // On the stair face of the bulkhead above the stair foot (the kit's exit sign is on its back).
  const lines = linesAt(station.id).map((l) => l.id);
  b.sign({ k: 'guide', ja: '改札・のりば', en: 'Ticket gates / Trains', bg: 'navy', badges: lines }, 0.02, cf + 2.95, ext + 2.6, [1, 0], 2.4, 0.42, { arrow: [0, -1] });
  b.protect(0, cf + 2.65, ext + 1.25, 0.6, cf + 3.25, ext + 3.95);
}

// ── Transfer passages ────────────────────────────────────────────────────────────────────────

/** Signs in one transfer passage. */
export function wayfindPassage(p: PassageInfo, c: PassageCtx): void {
  const { b, station, pf, zc0, zc1, other } = p;
  const zm = (zc0 + zc1) / 2;
  const ceil = pf + 2.8;
  // Where things are, in the passage frame.
  const opening: V2 = [0, zc1]; // stairs down to the other line
  const up: V2 = [4, zc0 + 1.9]; // stairs up to the concourse and the gates
  const transfer: SignContent = { k: 'guide', ja: `${other.nameJa} のりかえ`, en: `Transfer: ${other.nameEn}`, bg: 'white', badges: [other.id] };
  const exitC: SignContent = { k: 'guide', ja: '出口・改札', en: 'Exit / Ticket gates', bg: 'yellow' };
  // The doorways open onto the primary's platform on this side of its hall: the up platform on
  // the hall's +z side, the down platform on its −z side (the passage frame may be mirrored).
  const primary: SignContent = { k: 'dir', station: station.id, line: c.primary.id, dir: b.pt(0, 0, zc0)[2] > 0 ? 'up' : 'down' };

  const sp = new Space(b, toRoot(b, [-25.8, zc0 + 0.05, 3.0, zc1 - 0.05]));
  sp.scan(pf + 2.15, ceil - 0.01, pf + 1.5, ceil);
  sp.block([2.2, zc0, 4.2, zc1]); // the kit's transfer sign at x = 3

  // Overhead signs along the passage. Front (faces +x) is read walking −x, back walking +x.
  for (const x0 of [-8, -18]) {
    const face = (walk: V2, at: V2): Seg[] => {
      // In walking order of priority: the other line, the way out, the primary's platform.
      const items: Seg[] = [];
      const ahead = (t: V2) => !behind([t[0] - at[0], t[1] - at[1]], walk);
      if (ahead(opening)) items.push({ c: transfer, to: [opening[0] - at[0], opening[1] - at[1]] });
      if (ahead(up)) items.push({ c: exitC, to: [up[0] - at[0], up[1] - at[1]] });
      const door = c.doorways
        .map(([g0, g1]): V2 => [(g0 + g1) / 2, zc0])
        .filter(ahead)
        .sort((a, q) => Math.abs(a[0] - at[0]) - Math.abs(q[0] - at[0]))[0];
      if (door) items.push({ c: primary, to: [door[0] - at[0], door[1] - at[1]] });
      return items.slice(0, 2);
    };
    const facesAt = (x: number, z: number) => {
      let front = face([-1, 0], [x, z]), back = face([1, 0], [x, z]);
      if (!front.length) front = back;
      if (!back.length) back = front;
      return { front, back };
    };
    placeHang(b, sp, { n: [1, 0], y: pf + 2.5, h: 0.44, segW: 1.95, front: [], back: [], ceil, at: facesAt }, around(x0, zm, [0, -1, 1, -2, 2], [0]));
  }

  // By each doorway from the primary line's platform: on the far wall, facing people stepping in.
  const spans: [number, number][] = [[-25.7, -2.1], [2.1, 3.75]];
  for (const [g0, g1] of c.doorways) {
    const gx = (g0 + g1) / 2;
    const at: V2 = [gx, zc0];
    const segs: Seg[] = [];
    // Straight ahead is the kit's sign over the stairs down; otherwise point the way to them.
    if (Math.abs(gx - opening[0]) > 2.5) segs.push({ c: transfer, to: [opening[0] - gx, opening[1] - zc0] });
    segs.push({ c: exitC, to: [up[0] - gx, up[1] - zc0] });
    const list = sortSegs(segs, [0, -1]);
    const w = 2.4, W = w * list.length;
    let cx: number | null = null;
    for (const [s0, s1] of spans) {
      if (s1 - s0 < W) continue;
      const x = Math.min(Math.max(gx, s0 + W / 2), s1 - W / 2);
      if (cx === null || Math.abs(x - gx) < Math.abs(cx - gx)) cx = x;
    }
    if (cx === null) continue;
    list.forEach((s, k) => {
      // Facing −z, the reader's right is −x: lay panels out from +x (their left) to −x.
      const x = cx! + W / 2 - w * (k + 0.5);
      b.sign(s.c, x, pf + 2.55, zc1 - 0.02, [0, -1], w - 0.05, 0.44, s.to ? { arrow: unit(s.to) } : {});
    });
    b.protect(cx - W / 2 - 0.1, pf + 2.2, zc1 - 0.3, cx + W / 2 + 0.1, ceil, zc1);
  }
}

// ── Elevated stations ────────────────────────────────────────────────────────────────────────

/** Signs in an elevated station's street-level concourse. */
export function wayfindElevated(v: ElevInfo): void {
  const { b, station, fl, top, cw, gateX } = v;
  const y = fl + 3.0, h = 0.5;
  const lines = [v.line.id, ...(v.under ? [v.under.line.id] : [])];
  const sp = new Space(b, [v.x0 + 0.3, -cw + 0.4, v.x1 - 0.3, cw - 0.4]);
  // Everything that reaches into the sign band (piers, their cross-beams, the kit's signs).
  sp.scan(fl + 2.6, top - 0.3, fl + 1.6, top);
  if (v.under) sp.block(grow(v.under.hole, 0.2));

  // Stairs: the foot of each platform stair (its own sign is the kit's), and the line underneath.
  const stairs: StairInfo[] = v.stairs.map((s) => ({
    line: v.line, kind: 'platform', platforms: [s.platform], rect: [s.x, s.z - 1.2, s.x + 1, s.z + 1.2], top: [s.x - 0.6, s.z], down: [1, 0],
  }));
  for (const s of v.stairs) sp.block([s.x - 0.3, s.z - 1.3, v.x1, s.z + 1.3]);
  const under = v.under;
  const underTop: V2 | null = under ? [under.hole[2] + 0.8, (under.hole[1] + under.hole[3]) / 2] : null;

  // 1. Paid area, a few metres in from the gates: platforms and the line underneath ahead;
  //    on the back, the exit.
  {
    const facesAt = (x: number, z: number) => {
      const front = platformSegs(station, stairs, [x, z], [1, 0], 'board');
      if (under && underTop) {
        front.push({
          c: { k: 'guide', ja: `${under.line.nameJa} のりかえ`, en: `Transfer: ${under.line.nameEn}`, bg: 'white', badges: [under.line.id] },
          to: [underTop[0] - x, underTop[1] - z],
        });
      }
      const back: Seg[] = [{ c: { k: 'guide', ja: '出口・改札', en: 'Exit / Ticket gates', bg: 'yellow' }, to: [-1, 0] }];
      return { front, back };
    };
    const x = gateX + 5;
    const cands = around(x, 0, [0, 0.8, 1.6, 2.4, 3.2, -0.6], [0, -1, 1]).filter(([cx]) => cx > gateX + 3.5);
    placeHang(b, sp, { n: [-1, 0], y, h, segW: 2.4, front: [], back: [], ceil: top, at: facesAt }, cands);
  }

  // 2. Unpaid side: which way to the trains and tickets (coming in), to each entrance (going out).
  const fare = b.out.signs.find((s) => s.content.k === 'faremap' && s.pos[0] < gateX && Math.abs(s.pos[1] - (fl + 2.46)) < 0.3);
  {
    const facesAt = (x: number, z: number) => {
      const back: Seg[] = [{ c: { k: 'guide', ja: 'のりば', en: 'To trains', bg: 'navy', badges: lines }, to: [1, 0] }];
      if (fare) back.push({ c: { k: 'picto', v: 'tickets', label: true }, to: [fare.pos[0] - x, fare.pos[2] - z] });
      // One exit panel per direction (two entrances the same way share it).
      const byArrow = new Map<Arrow, V2>();
      for (const en of v.entrances) {
        const to: V2 = [en.x - x, en.z - z];
        const a = arrowFor(to, [1, 0]);
        if (!byArrow.has(a)) byArrow.set(a, to);
      }
      const front: Seg[] = [...byArrow.values()].map((to) => ({ c: { k: 'guide', ja: '出口', en: 'Exit', bg: 'yellow' }, to }));
      return { front, back };
    };
    const x = (v.x0 + gateX) / 2 + 2;
    const cands = around(x, 0, [0, 1, -1, 2, -2, 3, -3], [0, -1, 1]).filter(([cx]) => cx < gateX - 3 && cx > v.x0 + 4);
    if (v.entrances.length) placeHang(b, sp, { n: [1, 0], y, h, segW: 2.4, front: [], back: [], ceil: top, at: facesAt }, cands);
  }

  // 3. Boards on the −z wall of the unpaid side: station map, area map, exits (if it has any).
  let face = -cw;
  for (const p of b.out.boxes) {
    if (p.solid && p.min[2] <= -cw + 0.001 && p.max[2] < -cw + 0.5 && p.min[0] < gateX && p.max[0] > v.x0 && p.max[1] > fl + 2.5) face = Math.max(face, p.max[2]);
  }
  const solids = b.out.boxes
    .filter((p) => p.max[1] > fl + 0.05 && p.min[1] < fl + 2.4 && p.max[2] > face + 0.01)
    .map((p): Rect => [p.min[0], p.min[2], p.max[0], p.max[2]]);
  const signs = b.out.signs.map((s) => signRect(s, 0.1)).filter((r): r is Rect => !!r);
  const used: Rect[] = [];
  const boards: SignContent[] = [{ k: 'stationmap', station: station.id }, { k: 'areamap', station: station.id }];
  if (stationExits(station.id).length) boards.push({ k: 'exits', station: station.id });
  let x = gateX - 3.2;
  for (const c of boards) {
    const w = c.k === 'exits' ? 2.0 : 2.2;
    for (; x - w > v.x0 + 0.5; x -= 0.25) {
      const strip: Rect = [x - w, face, x, face + 0.8];
      const wall: Rect = [x - w - 0.15, face - 0.05, x + 0.15, face + 0.9];
      if (solids.some((r) => overlaps(r, strip)) || signs.some((r) => overlaps(r, wall)) || used.some((r) => overlaps(r, wall))) continue;
      const cx = x - w / 2;
      flat(b, c, cx, fl + 1.5, face + 0.02, [0, 1], w, c.k === 'exits' ? 1.3 : 1.5, true);
      used.push([x - w - 0.3, face - 0.05, x + 0.3, face + 0.9]);
      x -= w + 0.6;
      break;
    }
  }

  // 4. The station office door.
  for (const s of b.out.signs) {
    if (s.content.k !== 'machine' || s.content.v !== 'door' || !s.normal || Math.abs(s.normal[0]) < 0.5) continue;
    if (Math.abs(s.pos[1] - (fl + 1.05)) > 0.15 || Math.abs(Math.abs(s.pos[0] - gateX) - 3.02) > 0.1) continue;
    flat(b, { k: 'picto', v: 'office', label: true }, s.pos[0] + s.normal[0] * 0.01, fl + 2.42, s.pos[2], s.normal, 0.8, 0.4);
  }
}
