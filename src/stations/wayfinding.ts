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
 * in the builder's root coordinates; queries are in its current frame. The bounds are one or more
 * rectangles (a spine and the rooms off it, say): a sign must lie wholly inside one of them.
 */
class Space {
  private taken: Rect[] = [];
  private bounds: Rect[];
  constructor(private b: Builder, bounds: Rect | Rect[]) {
    this.bounds = (Array.isArray(bounds[0]) ? bounds : [bounds]) as Rect[];
  }

  /** Take in everything the builder already holds that reaches into y ∈ (lo, hi) inside the bounds. */
  scan(lo: number, hi: number, signLo: number, signHi: number) {
    const inside = (r: Rect) => this.bounds.some((k) => overlaps(r, k));
    for (const p of this.b.out.boxes) {
      if (p.max[1] <= lo || p.min[1] >= hi) continue;
      const r: Rect = [p.min[0], p.min[2], p.max[0], p.max[2]];
      if (inside(r)) this.taken.push(r);
    }
    for (const s of this.b.out.signs) {
      if (s.pos[1] + s.h / 2 <= signLo || s.pos[1] - s.h / 2 >= signHi) continue;
      const r = signRect(s);
      if (r && inside(r)) this.taken.push(r);
    }
  }
  /** Block a rectangle given in the current frame. */
  block(r: Rect) {
    this.taken.push(toRoot(this.b, r));
  }
  /** Is a rectangle in the current frame inside the bounds and clear? */
  ok(r: Rect): boolean {
    const q = toRoot(this.b, r);
    if (!this.bounds.some((k) => q[0] >= k[0] && q[1] >= k[1] && q[2] <= k[2] && q[3] <= k[3])) return false;
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

/**
 * A row of flat panels centred on `c`, facing `n` (on a wall or a portal's fascia), laid out from
 * the reader's left to right, on a thin dark frame; a thin protected volume in front.
 */
function flatRow(b: Builder, segs: Seg[], c: V2, n: V2, y: number, w: number, h: number) {
  const rF: V2 = [n[1], -n[0]]; // the reader's right
  const total = w * segs.length;
  const fr = planeRect(c[0] - n[0] * 0.012, c[1] - n[1] * 0.012, n, total + 0.06, 0.008);
  b.deco(BOARD, fr[0], y - h / 2 - 0.03, fr[1], fr[2], y + h / 2 + 0.03, fr[3]);
  segs.forEach((s, k) => {
    const u = -total / 2 + w * (k + 0.5);
    b.sign(s.c, c[0] + rF[0] * u, y, c[1] + rF[1] * u, n, w - 0.04, h, s.to ? { arrow: unit(s.to) } : {});
  });
  const a = planeRect(c[0] + n[0] * 0.1, c[1] + n[1] * 0.1, n, total + 0.2, 0.12);
  b.protect(a[0], y - h / 2 - 0.08, a[1], a[2], y + h / 2 + 0.08, a[3]);
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
const exitList = (nums: string[]) => [...new Set(nums)].sort((a, b) => Number(a) - Number(b) || a.localeCompare(b));
const transferC = (line: LineDef): SignContent => ({ k: 'guide', ja: `${line.nameJa} のりかえ`, en: `Transfer: ${line.nameEn}`, bg: 'white', badges: [line.id] });

/** A stair someone can get to, the way to set off for it (`to`) and how far it is along the way. */
interface Reach {
  st: StairInfo;
  to: V2;
  d: number;
}

/**
 * Panels pointing to stairs for someone walking along `walk`: platform stairs grouped by arrow
 * (a platform sign for one platform, else the platform numbers), then one transfer panel per line.
 * Stairs behind the reader are left out.
 */
function stairSegs(station: StationDef, reach: Reach[], walk: V2): Seg[] {
  const n: V2 = [-walk[0], -walk[1]];
  type T = Reach & { p: number; a: Arrow };
  // Every stair serving each platform (transfers: each line) that is not behind.
  const all = new Map<string, T[]>();
  for (const r of reach) {
    if (r.d < 1 || behind(r.to, walk)) continue;
    const a = arrowFor(r.to, n);
    for (const p of r.st.kind === 'transfer' ? [r.st.platforms[0]] : r.st.platforms) {
      const key = r.st.kind === 'transfer' ? `T|${r.st.line.id}` : `${r.st.line.id}|${p}`;
      all.set(key, [...(all.get(key) ?? []), { ...r, p, a }]);
    }
  }
  // The nearest, and any other about as near that lies another way (stairs on both sides).
  const groups = new Map<Arrow, T[]>();
  const transfers: T[] = [];
  for (const list of all.values()) {
    list.sort((a, b) => a.d - b.d);
    for (const t of list.filter((t) => t.d <= list[0].d + 1.5)) {
      if (t.st.kind === 'transfer') {
        if (!transfers.some((u) => u.st.line.id === t.st.line.id && u.a === t.a)) transfers.push(t);
        continue;
      }
      const g = groups.get(t.a) ?? [];
      if (!g.some((u) => u.st.line.id === t.st.line.id && u.p === t.p)) groups.set(t.a, [...g, t]);
    }
  }
  const out: { seg: Seg; d: number }[] = [];
  for (const g of groups.values()) {
    g.sort((a, b) => a.d - b.d);
    const to = g[0].to, d = g[0].d;
    const keys = g.map((t) => `${t.st.line.id}|${t.p}`);
    if (g.length === 1) {
      out.push({ seg: { c: { k: 'dir', station: station.id, line: g[0].st.line.id, dir: dirOf(station, g[0].st.line, g[0].p) }, to, keys }, d });
    } else {
      const nums = g.map((t) => t.p);
      const badges = [...new Set(g.map((t) => t.st.line.id))];
      out.push({ seg: { c: { k: 'guide', ja: `のりば ${numList(nums, '・')}`, en: enPlatforms(nums), bg: 'navy', badges }, to, keys }, d });
    }
  }
  for (const t of transfers) out.push({ seg: { c: transferC(t.st.line), to: t.to, keys: [`T|${t.st.line.id}`] }, d: t.d });
  return out.sort((a, b) => a.d - b.d).map((o) => o.seg);
}

/** Panels pointing to the stairs from (x, z) in open floor (straight there) for someone walking along `walk`. */
function platformSegs(station: StationDef, stairs: StairInfo[], at: V2, walk: V2): Seg[] {
  return stairSegs(station, stairs.map((st) => {
    const to: V2 = [st.top[0] - at[0], st.top[1] - at[1]];
    return { st, to, d: Math.hypot(to[0], to[1]) };
  }), walk);
}

// ── Routes between the spine and the rooms ───────────────────────────────────────────────────

/** A way between two areas (−1 the spine, else a room index): the middle of the mouth between them. */
interface Link {
  p: V2;
  a: number;
  c: number;
}

/** Where someone is going: a point in an area. */
interface Goal {
  p: V2;
  area: number;
}

/** The ways between the spine and the rooms, one per mouth. */
function areaLinks(i: ConcInfo): Link[] {
  const out: Link[] = [];
  i.rooms.forEach((r, k) => {
    for (const m of r.mouths) {
      const p: V2 = m.axis === 'x' ? [(m.u0 + m.u1) / 2, m.at] : [m.at, (m.u0 + m.u1) / 2];
      const same = (l: Link) => ((l.a === k && l.c === m.to) || (l.a === m.to && l.c === k)) && Math.hypot(l.p[0] - p[0], l.p[1] - p[1]) < 1;
      if (!out.some(same)) out.push({ p, a: k, c: m.to });
    }
  });
  return out;
}

/**
 * The shortest way (straight lines from mouth to mouth) from `from` in area `area` to a goal:
 * the points to walk to in turn (ending at the goal), its length, and the first link used (−1 if
 * the goal is in the same area and reached straight). Null if there is no way.
 */
function route(links: Link[], from: V2, area: number, g: Goal): { pts: V2[]; d: number; first: number } | null {
  const hyp = (p: V2, q: V2) => Math.hypot(p[0] - q[0], p[1] - q[1]);
  const touches = (l: Link, a: number) => l.a === a || l.c === a;
  const n = links.length;
  const dist = new Array<number>(n).fill(Infinity), prev = new Array<number>(n).fill(-1), done = new Array<boolean>(n).fill(false);
  let best = area === g.area ? hyp(from, g.p) : Infinity, via = -1;
  links.forEach((l, k) => {
    if (touches(l, area)) dist[k] = hyp(from, l.p);
  });
  for (;;) {
    let k = -1;
    for (let j = 0; j < n; j++) if (!done[j] && dist[j] < Infinity && (k < 0 || dist[j] < dist[k])) k = j;
    if (k < 0 || dist[k] >= best) break;
    done[k] = true;
    const l = links[k];
    if (touches(l, g.area) && dist[k] + hyp(l.p, g.p) < best) (best = dist[k] + hyp(l.p, g.p)), (via = k);
    for (let j = 0; j < n; j++) {
      if (done[j] || !(touches(links[j], l.a) || touches(links[j], l.c))) continue;
      const d = dist[k] + hyp(l.p, links[j].p);
      if (d < dist[j]) (dist[j] = d), (prev[j] = k);
    }
  }
  if (best === Infinity) return null;
  const chain: number[] = [];
  for (let k = via; k >= 0; k = prev[k]) chain.unshift(k);
  return { pts: [...chain.map((k) => links[k].p), g.p], d: best, first: chain.length ? chain[0] : -1 };
}

// ── Concourse ────────────────────────────────────────────────────────────────────────────────

/** Rows (z) for signs repeated across a wide hall, about every 16 m. */
function rows(cw: number): number[] {
  if (cw < 16) return [0];
  const n = Math.max(2, Math.round((2 * cw) / 16));
  return Array.from({ length: n }, (_, k) => -cw + (2 * cw * (k + 0.5)) / n);
}

/** A wall face as `WallFace` has it (no extent): its plane, and the way it faces. */
type FaceAt = { axis: 'x' | 'z'; at: number; n: 1 | -1 };
const faceN = (f: FaceAt): V2 => (f.axis === 'x' ? [0, f.n] : [f.n, 0]);
/** The point u along face f, `off` out in front of it (behind it if negative). */
const onFace = (f: FaceAt, u: number, off: number): V2 => (f.axis === 'x' ? [u, f.at + f.n * off] : [f.at + f.n * off, u]);

/**
 * Signs in a concourse: headers on every stair portal, platform, transfer and exit directions
 * along the spine, what lies through each mouth into a room, signs in the rooms leading back,
 * exit boards, maps and pictograms.
 */
export function wayfindConcourse(i: ConcInfo): void {
  const { b, station, cf, cw } = i;
  const ceil = cf + i.clear;
  const y = cf + 2.6, h = 0.45;
  // An interchange spine over side platforms (8.9) is a full-size corridor; only the old 8 m
  // concourses get the narrower signs.
  const narrow = cw < 8.5;
  const segW = narrow ? 2.2 : 2.4;
  const maxSegs = narrow ? 3 : 4;
  const lines = linesAt(station.id).map((l) => l.id);
  const exitsOf = (end: number) => exitList(i.exits.filter((e) => e.end === end).map((e) => e.num));
  const hyp = (p: V2, q: V2) => Math.hypot(p[0] - q[0], p[1] - q[1]);
  const clamp = (v: number, lo: number, hi: number) => (lo > hi ? (lo + hi) / 2 : Math.min(Math.max(v, lo), hi));

  // Hanging signs may go in the spine or in a room, never across a wall between them.
  const sp = new Space(b, [[i.x0 + 0.3, -cw + 0.15, i.x1 - 0.3, cw - 0.15], ...i.rooms.map((r) => grow(r.rect, -0.15))]);
  sp.scan(cf + 2.2, ceil - 0.3, cf + 1.2, ceil);
  for (const r of i.holes) sp.block(grow(r, 0.15));
  for (const [x, z] of i.pillars) sp.block([x - 0.45, z - 0.45, x + 0.45, z + 0.45]);
  // Keep the view of every portal's header clear: nothing hangs just in front of it.
  for (const w of i.stairwells) {
    const f = w.portal.fascia;
    const p = onFace(f, f.u0, 0), q = onFace(f, f.u1, 3.5);
    sp.block([Math.min(p[0], q[0]), Math.min(p[1], q[1]), Math.max(p[0], q[0]), Math.max(p[1], q[1])]);
  }
  const placed: V2[] = [];
  const cap = (segs: Seg[]) => capSegs(segs, maxSegs);
  // Hanging signs keep the floor under them, so nothing solid (a shop) is built up into them.
  const claim = (r: Rect) => i.claim(r[0], r[1], r[2], r[3]);

  // ── Ways: where each stair and gate line is, and how to get there from any area ──
  const links = areaLinks(i);
  const areaOf = (p: V2): number => {
    if (p[0] >= i.x0 && p[0] <= i.x1 && Math.abs(p[1]) <= cw + 0.01) return -1;
    const k = i.rooms.findIndex((r) => p[0] >= r.rect[0] && p[0] <= r.rect[2] && p[1] >= r.rect[1] && p[1] <= r.rect[3]);
    return k;
  };
  const wellOf = (st: StairInfo) => i.stairwells.find((w) => w.stair === st);
  // A stair's goal: the floor just in front of its portal.
  const stairGoal = (st: StairInfo): Goal => {
    const w = wellOf(st);
    if (!w) return { p: st.top, area: areaOf(st.top) };
    const [px, pz] = w.portal.at, [nx, nz] = w.portal.n;
    return { p: [px + nx * 0.8, pz + nz * 0.8], area: w.room };
  };
  const goals = i.stairs.map(stairGoal);
  const gateGoals: Goal[] = i.ends.map((e) => ({ p: [e.g, 0], area: -1 }));
  /** The way to a goal: which way to set off (the first point on it at least 1.2 m away). */
  const reach = (from: V2, area: number, g: Goal) => {
    const r = route(links, from, area, g);
    if (!r) return null;
    const next = r.pts.find((p) => hyp(p, from) >= 1.2) ?? r.pts[r.pts.length - 1];
    return { to: [next[0] - from[0], next[1] - from[1]] as V2, d: r.d, first: r.first };
  };
  const stairReach = (from: V2, area: number, keep: (st: StairInfo, first: number) => boolean = () => true): Reach[] => {
    const out: Reach[] = [];
    i.stairs.forEach((st, k) => {
      const r = reach(from, area, goals[k]);
      if (r && keep(st, r.first)) out.push({ st, to: r.to, d: r.d });
    });
    return out;
  };
  /** Exit panels: gate lines grouped by the way they lie (one gate: its exits board strip). */
  const exitSegs = (gs: { k: number; to: V2; d: number }[], n: V2): Seg[] => {
    const by = new Map<Arrow, typeof gs>();
    for (const g of gs) by.set(arrowFor(g.to, n), [...(by.get(arrowFor(g.to, n)) ?? []), g]);
    return [...by.values()].map((list) => {
      list.sort((a, c) => a.d - c.d);
      const nums = exitList(list.flatMap((g) => exitsOf(g.k)));
      const keys = list.map((g) => `X|${g.k}`);
      const c: SignContent = list.length === 1
        ? { k: 'exits', station: station.id, only: nums }
        : { k: 'guide', ja: `出口 ${nums.join('・')}`, en: `Exits ${nums.join(', ')}`, bg: 'yellow' };
      return { c, to: list[0].to, keys };
    });
  };
  const gateReach = (from: V2, area: number, keep: (first: number) => boolean = () => true) => {
    const out: { k: number; to: V2; d: number }[] = [];
    i.ends.forEach((_, k) => {
      if (!exitsOf(k).length) return;
      const r = reach(from, area, gateGoals[k]);
      if (r && keep(r.first)) out.push({ k, to: r.to, d: r.d });
    });
    return out;
  };
  /** The nearest gate line ahead of someone at `at` walking along `walk`, and a panel pointing to it. */
  const gateAhead = (at: V2, area: number, walk: V2): Seg | null => {
    const gs = gateReach(at, area).filter((g) => g.d > 1 && !behind(g.to, walk)).sort((a, c) => a.d - c.d);
    return gs.length ? exitSegs([gs[0]], [-walk[0], -walk[1]])[0] : null;
  };

  // ── 1. Portal headers: on the fascia over every stair head; inside it, for people coming up ──
  /** The fascia's depth behind its front face at u (found from the box built there), or null. */
  const solidAt = (x: number, yy: number, z: number) => {
    const p = b.pt(x, yy, z);
    return b.out.boxes.some((q) => q.solid && p[0] > q.min[0] && p[0] < q.max[0] && p[1] > q.min[1] && p[1] < q.max[1] && p[2] > q.min[2] && p[2] < q.max[2]);
  };
  const fasciaDepth = (f: FaceAt, u: number, yy: number): number | null => {
    const solid = (d: number) => {
      const [x, z] = onFace(f, u, -d);
      return solidAt(x, yy, z);
    };
    if (!solid(0.01)) return null;
    let lo = 0.01, hi = 0.06;
    while (hi < 1 && solid(hi)) (lo = hi), (hi += 0.05);
    if (hi >= 1) return null;
    for (let k = 0; k < 12; k++) {
      const m = (lo + hi) / 2;
      if (solid(m)) lo = m;
      else hi = m;
    }
    return hi;
  };
  for (const w of i.stairwells) {
    const st = w.stair, f = w.portal.fascia;
    const n = faceN(f);
    const hAv = f.y1 - f.y0 - 0.1;
    if (hAv < 0.25) continue;
    const yc = (f.y0 + f.y1) / 2;
    const W = Math.min(f.u1 - f.u0 - 0.12, w.portal.w + 0.4);
    if (W < 1.2) continue;
    const pu = f.axis === 'x' ? w.portal.at[0] : w.portal.at[1];
    const uc = clamp(pu, f.u0 + W / 2 + 0.06, f.u1 - W / 2 - 0.06);
    let segs: Seg[], ph: number;
    if (st.kind === 'platform') {
      const nums = [...st.platforms].sort((a, c) => (dirOf(station, st.line, a) === 'down' ? -1 : 1) - (dirOf(station, st.line, c) === 'down' ? -1 : 1));
      // Down platforms are on the hall's −z side: lay the panels out the same way round.
      // (Panels run from the reader's left to right, and the reader's right is [n[1], −n[0]].)
      if (-n[0] < 0) nums.reverse();
      const pw = W / nums.length;
      if (pw >= 1.9) {
        // One panel per platform: number, line, "for <terminus>".
        segs = nums.map((p) => ({ c: { k: 'dir', station: station.id, line: st.line.id, dir: dirOf(station, st.line, p), ...(pw >= 2.6 ? { arrow: 'down' as const } : {}) } }));
        ph = Math.min(hAv, pw / 4.6);
      } else {
        // Too narrow for that: the line and its platform numbers.
        segs = [{ c: { k: 'guide', ja: `のりば ${numList(nums, '・')}`, en: `${st.line.nameEn} · ${enPlatforms(nums)}`, bg: 'navy', badges: [st.line.id] } }];
        ph = Math.min(hAv, W / 4.2);
      }
    } else {
      const full = W >= 2.8;
      segs = [{
        c: {
          k: 'guide', ja: full ? `${st.line.nameJa} のりかえ ${numList(st.platforms, '・')}番線` : `${st.line.nameJa} のりかえ`,
          en: full ? `Transfer: ${st.line.nameEn} · ${enPlatforms(st.platforms)}` : `Transfer: ${st.line.nameEn}`, bg: 'white', badges: [st.line.id],
        },
      }];
      ph = Math.min(hAv, W / 5);
    }
    flatRow(b, segs, onFace(f, uc, 0.02), n, yc, W / segs.length, ph);

    // Inside: read by people coming up, walking along n out of the portal: the way out, and the
    // other lines.
    const depth = fasciaDepth(f, pu, yc);
    const Wb = Math.min(w.portal.w - 0.1, 5.2);
    if (depth === null || Wb < 1.5) continue;
    const from: V2 = [w.portal.at[0] + n[0] * 0.3, w.portal.at[1] + n[1] * 0.3];
    const items: Seg[] = [];
    const ex = gateAhead(from, w.room, n);
    if (ex) items.push(ex);
    items.push(...stairSegs(station, stairReach(from, w.room, (s) => s.line.id !== st.line.id), n));
    const back = capSegs(items, Math.max(1, Math.floor((Wb + 0.05) / 1.85)));
    if (!back.length) continue;
    const bw = Math.min(Wb / back.length, 2.6);
    const bn: V2 = [-n[0], -n[1]];
    flatRow(b, sortSegs(back, bn), onFace(f, pu, -(depth + 0.02)), bn, yc, bw, Math.min(hAv, bw / 4.6));
  }

  // ── 2. The spine, inside the gates: by each gate line, which way to the platforms and
  //    transfers (coming in) and the exits through that gate (going out); then repeated along
  //    the spine about every 15–20 m, each listing the lines ahead and the exits. ──
  const hasHang = (x: number, z: number, r: number) => placed.some((p) => Math.hypot(p[0] - x, p[1] - z) < r);
  const [p0, p1] = i.paid;
  const anchors: { x: number; gate: number | null }[] = [];
  i.ends.forEach((e, k) => {
    const x = e.hi ? e.g - 5.5 : e.g + 5.5;
    if (x > p0 + 1 && x < p1 - 1) anchors.push({ x, gate: k });
  });
  {
    const lo = anchors.filter((a) => !i.ends[a.gate!].hi).map((a) => a.x);
    const hi = anchors.filter((a) => i.ends[a.gate!].hi).map((a) => a.x);
    const a = lo.length ? Math.max(...lo) : p0 + 6, c = hi.length ? Math.min(...hi) : p1 - 6;
    const L = c - a;
    if (lo.length && hi.length) {
      const m = Math.floor(L / 18);
      for (let k = 1; k <= m; k++) anchors.push({ x: a + (L * k) / (m + 1), gate: null });
    } else if (hi.length) {
      for (let x = c - 17; x >= a - 4; x -= 17) anchors.push({ x, gate: null });
    } else if (lo.length) {
      for (let x = a + 17; x <= c + 4; x += 17) anchors.push({ x, gate: null });
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
          // Walking away from the gate just passed: lines only. Towards it: its exits only.
          if (e && Math.sign(walk[0]) === (e.hi ? 1 : -1)) {
            const ex = gateAhead(at, -1, walk);
            return ex ? [ex] : [];
          }
          const segs = stairSegs(station, stairReach(at, -1), walk);
          if (!e) {
            const ex = gateAhead(at, -1, walk);
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
      // A stairwell on the axis can fill the spot: look a few metres either way along the spine.
      const cands = around(an.x, z, [0, -0.8, 0.8, -1.6, 1.6, -2.5, 2.5, -3.5, 3.5, -4.5, 4.5], [0, -1.2, 1.2, -2.4, 2.4]).filter(([x]) => inPaid(x));
      const where = placeHang(b, sp, { n: [1, 0], y, h, segW, front: [], back: [], ceil, at: facesAt, onPlace: claim }, cands);
      if (where) placed.push(where);
    }
  }

  // ── 3. Mouths into rooms: over each, seen from along the spine both ways, what lies through it ──
  /**
   * A sign hanging across the spine (or a room run along x) beside a mouth in its long wall at
   * z = wallZ (`inward` the way into the area), naming everything whose way from here starts
   * through this mouth, with arrows into it.
   */
  const mouthSign = (area: number, via: number, u0: number, u1: number, wallZ: number, inward: 1 | -1) => {
    const xm = (u0 + u1) / 2;
    const L = links.findIndex((l) => ((l.a === area && l.c === via) || (l.a === via && l.c === area)) && Math.abs(l.p[0] - xm) < 0.6);
    if (L < 0) return;
    const probe: V2 = [xm, wallZ + inward * 1.5];
    const through = (first: number) => first === L;
    // Lines: platforms of each line together, transfers one per line.
    const lineSegs: { seg: Seg; d: number }[] = [];
    const byLine = new Map<string, Reach[]>();
    for (const r of stairReach(probe, area, (_, first) => through(first))) {
      const key = `${r.st.kind}|${r.st.line.id}`;
      byLine.set(key, [...(byLine.get(key) ?? []), r]);
    }
    for (const list of byLine.values()) {
      const st = list[0].st, d = Math.min(...list.map((r) => r.d));
      if (st.kind === 'transfer') {
        lineSegs.push({ seg: { c: transferC(st.line), keys: [`T|${st.line.id}`] }, d });
        continue;
      }
      const nums = [...new Set(list.flatMap((r) => r.st.platforms))];
      const c: SignContent = nums.length === 1
        ? { k: 'dir', station: station.id, line: st.line.id, dir: dirOf(station, st.line, nums[0]) }
        : { k: 'guide', ja: `${st.line.nameJa} のりば ${numList(nums, '・')}`, en: `${st.line.nameEn} · ${enPlatforms(nums)}`, bg: 'navy', badges: [st.line.id] };
      lineSegs.push({ seg: { c, keys: nums.map((p) => `${st.line.id}|${p}`) }, d });
    }
    const ls = lineSegs.sort((a, c) => a.d - c.d).map((o) => o.seg);
    const ex = exitSegs(gateReach(probe, area, through).map((g) => ({ ...g, to: [0, -inward] as V2 })), [1, 0]);
    // Away from the gates (in a room) the way out comes first.
    const segs = capSegs(area === -1 ? [...ls, ...ex] : [...ex, ...ls], 2);
    if (!segs.length) return;
    const W = segs.length * segW;
    const half = (u1 - u0) / 2 + 1.2;
    const dxs: number[] = [0];
    for (let d = 0.4; d <= half + 1e-6; d += 0.4) dxs.push(d, -d);
    const cands: V2[] = [];
    for (const dz of [0, 0.4, 0.8]) for (const dx of dxs) cands.push([xm + dx, wallZ + inward * (0.3 + W / 2 + dz)]);
    const at = (x: number, z: number) => {
      // Into the mouth: straight across to it where the sign hangs beside it.
      const to: V2 = [clamp(x, u0 + 0.8, u1 - 0.8) - x, wallZ - z];
      const list = segs.map((s) => ({ ...s, to }));
      return { front: list, back: list };
    };
    const where = placeHang(b, sp, { n: [1, 0], y, h, segW, front: [], back: [], ceil, keepOrder: true, at, onPlace: area === -1 ? claim : undefined }, cands);
    if (where) placed.push(where);
  };
  for (const o of i.openings) if (o.kind === 'bay' && o.room !== undefined) mouthSign(-1, o.room, o.x0, o.x1, o.s * cw, o.s > 0 ? -1 : 1);
  i.rooms.forEach((r, k) => {
    if (r.kind !== 'spine') return;
    const zc = (r.rect[1] + r.rect[3]) / 2;
    for (const m of r.mouths) if (m.axis === 'x') mouthSign(k, m.to, m.u0, m.u1, m.at, m.at < zc ? 1 : -1);
  });

  // ── 4. Rooms: the way back out, and on to the other lines ──
  i.rooms.forEach((r, k) => {
    if (r.kind !== 'cross passage') return;
    // A sign hanging across the passage: each face, for people walking towards it, says what lies
    // beyond the mouth ahead of them.
    const ms = r.mouths.filter((m) => m.axis === 'x');
    const xc = (r.rect[0] + r.rect[2]) / 2, zc = (r.rect[1] + r.rect[3]) / 2;
    if (ms.length < 2 || r.rect[2] - r.rect[0] < 2.5) return;
    const face = (walk: V2): Seg[] => {
      const m = ms.filter((q) => (q.at - zc) * walk[1] > 0).sort((a, c) => Math.abs(a.at - zc) - Math.abs(c.at - zc))[0];
      if (!m) return [];
      const L = links.findIndex((l) => ((l.a === k && l.c === m.to) || (l.a === m.to && l.c === k)) && Math.abs(l.p[1] - m.at) < 0.6);
      const at: V2 = [xc, zc];
      const n: V2 = [-walk[0], -walk[1]];
      const ex = exitSegs(gateReach(at, k, (first) => first === L).filter((g) => !behind(g.to, walk)), n);
      const st = stairSegs(station, stairReach(at, k, (_, first) => first === L), walk);
      return capSegs(m.to === -1 ? [...ex, ...st] : [...st, ...ex], 2);
    };
    const pw = Math.min(segW, (r.rect[2] - r.rect[0] - 0.6) / 2);
    const at = () => ({ front: face([0, -1]), back: face([0, 1]) });
    placeHang(b, sp, { n: [0, 1], y, h, segW: pw, front: [], back: [], ceil, at }, around(xc, zc, [0, -0.3, 0.3], [0, -0.2, 0.2]));
  });
  for (const w of i.stairwells) {
    const r = i.rooms[w.room];
    if (!r || r.kind !== 'transfer bay') continue;
    // On the wall at the end of the bay's lobby, facing people coming up out of the portal.
    const f = w.portal.fascia, n = faceN(f);
    const face = r.faces
      .filter((q) => q.axis === f.axis && q.n === -f.n && (q.at - f.at) * f.n > 2 && q.u1 - q.u0 > 1.8)
      .sort((a, c) => Math.abs(a.at - f.at) - Math.abs(c.at - f.at))[0];
    if (!face) continue;
    const span = face.u1 - face.u0 - 0.3;
    const pu = f.axis === 'x' ? w.portal.at[0] : w.portal.at[1];
    const front = onFace(f, pu, 0.5), wallPt = onFace(face, clamp(pu, face.u0, face.u1), 0);
    const read: V2 = [(front[0] + wallPt[0]) / 2, (front[1] + wallPt[1]) / 2];
    const items: Seg[] = [];
    const gs = gateReach(read, w.room).sort((a, c) => a.d - c.d);
    if (gs.length) items.push(...exitSegs([gs[0]], [-n[0], -n[1]]));
    items.push(...stairSegs(station, stairReach(read, w.room, (s) => s.line.id !== w.stair.line.id), n));
    const segs = capSegs(items, Math.max(1, Math.min(3, Math.floor((span + 0.05) / 1.75))));
    if (!segs.length) continue;
    const pw = Math.min(span / segs.length, 2.6);
    const fn = faceN(face);
    flatRow(b, sortSegs(segs, fn), onFace(face, clamp(pu, face.u0 + (pw * segs.length) / 2 + 0.15, face.u1 - (pw * segs.length) / 2 - 0.15), 0.02), fn, cf + 2.55, pw, Math.min(0.45, pw / 4.4));
  }

  // ── 5. Unpaid halls: just outside the gates, which way to each exit (and back: to the trains, tickets) ──
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

  // ── 6. Boards on the walls: exits, station map and area map in each unpaid hall; exits and
  //    station map inside the gates. Only on solid wall: never across a doorway or a mouth. ──
  // (Anything standing in front of the wall up to board height; a kerb or skirting does not count.)
  const wallSolids = b.out.boxes
    .filter((p) => p.max[1] > cf + 0.15 && p.min[1] < cf + 2.4)
    .map((p): Rect => [p.min[0], p.min[2], p.max[0], p.max[2]]);
  const wallSigns = b.out.signs
    .filter((s) => s.pos[1] + s.h / 2 > cf && s.pos[1] - s.h / 2 < ceil)
    .map((s) => signRect(s, 0.1))
    .filter((r): r is Rect => !!r);
  const boards: Rect[] = [];
  const band = (f: FaceAt, ua: number, ub: number, d0: number, d1: number): Rect => {
    const p = onFace(f, ua, d0), q = onFace(f, ub, d1);
    return [Math.min(p[0], q[0]), Math.min(p[1], q[1]), Math.max(p[0], q[0]), Math.max(p[1], q[1])];
  };
  const faceOk = (f: FaceAt, u: number, w: number, paid: boolean): boolean => {
    const ua = u - w / 2, ub = u + w / 2;
    const [lo, hi] = f.axis === 'x' ? [i.x0, i.x1] : [-cw, cw];
    if (ua < lo + 0.4 - 1e-6 || ub > hi - 0.4 + 1e-6) return false;
    if (f.axis === 'x' && i.openings.some((d) => d.s === -f.n && ub > d.x0 - 0.35 && ua < d.x1 + 0.35)) return false;
    const strip = band(f, ua, ub, 0.05, 0.8);
    const face = band(f, ua - 0.15, ub + 0.15, -0.05, 0.25);
    if (wallSolids.some((r) => overlaps(r, strip))) return false;
    if (wallSigns.some((r) => overlaps(r, face) || overlaps(r, strip))) return false;
    if (boards.some((r) => overlaps(r, face))) return false;
    if (i.holes.some((r) => overlaps(grow(r, 0.3), strip))) return false;
    if (i.pillars.some(([px, pz]) => overlaps([px - 0.5, pz - 0.5, px + 0.5, pz + 0.5], strip))) return false;
    // Solid wall behind it all the way along.
    for (let s = ua; s <= ub + 1e-6; s += Math.min(0.25, w)) {
      const [x, z] = onFace(f, s, -0.06);
      if (!solidAt(x, cf + 1.5, z)) return false;
    }
    return !paid || i.free(strip[0], strip[1], strip[2], strip[3]);
  };
  const board = (c: SignContent, f: FaceAt, u: number, w: number, bh: number, yc: number) => {
    const [x, z] = onFace(f, u, 0.02);
    flat(b, c, x, yc, z, faceN(f), w, bh, true);
    const strip = band(f, u - w / 2, u + w / 2, 0, 0.8);
    i.claim(strip[0], strip[1], strip[2], strip[3]);
    boards.push(band(f, u - w / 2 - 0.3, u + w / 2 + 0.3, -0.1, 0.2));
  };
  const longWall = (s: 1 | -1): FaceAt => ({ axis: 'x', at: s * cw, n: s > 0 ? -1 : 1 });
  /** First spot along `us` (on faces `fs`) where a board fits. */
  const findWall = (us: number[], fs: FaceAt[], w: number, paid: boolean): [number, FaceAt] | null => {
    for (const u of us) for (const f of fs) if (faceOk(f, u, w, paid)) return [u, f];
    return null;
  };
  const exitsBoard: SignContent = { k: 'exits', station: station.id };
  const ew = narrow ? 1.8 : 2.0;
  i.ends.forEach((e) => {
    const hx = e.hi ? 1 : -1;
    const at = (lx: number) => e.g + hx * lx;
    // The end wall of the unpaid hall (when the hall runs right to it), beside the mural.
    const endX = e.hi ? i.x1 : i.x0;
    const end: FaceAt[] = Math.abs(endX - e.g) < 17.5 ? [{ axis: 'z', at: endX, n: e.hi ? -1 : 1 }] : [];
    const endUs = (w: number) => {
      const out: number[] = [];
      for (let d = 0; d < cw; d += 0.25) out.push(cw - 0.45 - w / 2 - d, -(cw - 0.45 - w / 2 - d));
      return out;
    };
    // Exits: by the gates on the −z wall, between the fence and the ticket machines (or, where
    // the departures screen stands in front of that, on the end wall).
    const ex = findWall([1.45, 1.6, 1.3].map(at), [longWall(-1)], ew, false) ?? findWall(endUs(ew), end, ew, false);
    if (ex) board(exitsBoard, ex[1], ex[0], ew, 1.3, cf + 1.45);
    // Maps: on the walls between the exit doorways and the end wall, where people turn to go out.
    const near = [14.5, 14.3, 14.7, 14.1, 14.9, 13.9].map(at);
    const sm = findWall(near, [longWall(-1), longWall(1)], 2.2, false) ?? findWall(endUs(2.2), end, 2.2, false);
    if (sm) board({ k: 'stationmap', station: station.id }, sm[1], sm[0], 2.2, 1.5, cf + 1.5);
    const am = findWall(near, [longWall(1), longWall(-1)], 2.2, false) ?? findWall(endUs(2.2), end, 2.2, false);
    if (am) board({ k: 'areamap', station: station.id }, am[1], am[0], 2.2, 1.5, cf + 1.5);
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
      const ex = findWall(xs, [longWall(-1), longWall(1)], 2.2, true);
      if (ex) board(exitsBoard, ex[1], ex[0], 2.2, 1.3, cf + 1.45);
      const sm = findWall(xs, ex ? [ex[1], longWall(ex[1].n > 0 ? 1 : -1)] : [longWall(-1), longWall(1)], 2.2, true);
      if (sm) board({ k: 'stationmap', station: station.id }, sm[1], sm[0], 2.2, 1.5, cf + 1.5);
    }
  }

  // ── 7. Facilities, signed at the thing itself (the kit's parts are found by their signs) ──
  const here = (s: SignPart, yc: number) =>
    Math.abs(s.pos[1] - yc) < 0.15 && s.pos[0] > i.x0 && s.pos[0] < i.x1 && Math.abs(s.pos[2]) <= cw + 0.1;
  const picto = (v: Picto): SignContent => ({ k: 'picto', v, label: true });
  const pictoSp = new Space(b, [i.x0 + 0.3, -cw - 0.5, i.x1 - 0.3, cw + 0.5]);
  pictoSp.scan(cf + 2.2, ceil - 0.05, cf + 2.0, ceil);
  {
    // Toilets (doors on the −z wall at x = i.toilets): a projecting sign beside them, seen from
    // along the spine.
    for (const dx of [1.6, -1.6, 2.2, -2.2]) {
      const x = i.toilets + dx;
      const r: Rect = [x - 0.3, -cw + 0.02, x + 0.3, -cw + 1.1];
      if (!pictoSp.ok(r) || i.holes.some((q) => overlaps(grow(q, 0.2), r))) continue;
      if (i.openings.some((o) => o.s < 0 && x + 0.5 > o.x0 && x - 0.5 < o.x1)) continue;
      projecting(b, picto('toilet'), x, cf + 2.6, -cw, 1, 0.85, 0.5);
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
  if (ext > 8) {
    // A long corridor (z = 0 … ext, 4 m wide, ceiling at cf + 2.5): halfway along, a sign hanging
    // across it, just under the ceiling and clear of its light. Going out (walking +z): the exit
    // number again. Coming in from the street (walking −z): the way to the gates and the trains.
    const z = Math.round(ext / 2), sh = 0.34, sy = cf + 2.42 - sh / 2, w = 3.0;
    b.deco(BOARD, -2 - w / 2 - 0.03, sy - sh / 2 - 0.03, z - 0.04, -2 + w / 2 + 0.03, cf + 2.5, z + 0.04);
    b.sign({ k: 'guide', ja: '出口', en: 'Exit', bg: 'yellow', num }, -2, sy, z - 0.05, [0, -1], w, sh, { arrow: [0, 1] });
    b.sign({ k: 'guide', ja: '改札・のりば', en: 'Ticket gates / Trains', bg: 'navy', badges: lines }, -2, sy, z + 0.05, [0, 1], w, sh, { arrow: [0, -1] });
    b.protect(-2 - w / 2 - 0.1, sy - sh / 2 - 0.1, z - 0.6, -2 + w / 2 + 0.1, cf + 2.5, z + 0.6);
  }
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

// ── Atrium interchange ───────────────────────────────────────────────────────────────────────

/**
 * What an atrium interchange's composer (atrium.ts) built, in the station frame, for its signs.
 * The upper line has side platforms; doorways in its +z wall open onto a balcony over the
 * void, doorways in its −z wall onto a landing with a stair down into an underpass. The
 * balcony stair and the underpass both arrive on the transfer mezzanine, from which one flight
 * goes down to the lower line's island platform and another up to the gallery round the void.
 */
export interface AtriumInfo {
  b: Builder;
  station: StationDef;
  upper: LineDef;
  lower: LineDef;
  cf: number;
  /** Upper platform level, mezzanine level. */
  pf: number;
  mz: number;
  /** Inner face of the upper hall's side walls (|z|), and their outer face. */
  wallIn: number;
  wallOut: number;
  /** Doorways in both side walls of the upper hall (x-ranges). */
  doors: [number, number][];
  /** Gallery: head of the flight down (on the gallery), the mouths from the concourse (centre on its wall line), its south wall. */
  galleryHead: V2;
  mouths: V2[];
  gallerySouth: number;
  /** The gate line off the gallery: x, its centre z, the unpaid lobby's south wall and the exits it leads to (doorway centres). */
  gate: { x: number; z: number; exits: { num: string; at: V2 }[] };
  /** Mezzanine: foot of the gallery flight, head of the flight down to the lower line. */
  mezzFoot: V2;
  lowerHead: V2;
  /** Balcony: south edge, underside (the mezzanine's ceiling there), stair head and foot, the void wall beside the stair (x). */
  balcony: { z1: number; under: number; head: V2; foot: V2; wallX: number };
  /** Underpass: x-range, mouth on the mezzanine, ceiling, south end wall, foot and head of its stair (head on the landing). */
  underpass: { x0: number; x1: number; mouth: V2; ceil: number; south: number; foot: V2; head: V2 };
}

/** Signs round an atrium interchange: platform doorways, balcony, underpass, mezzanine, gallery and harbour gates. */
export function wayfindAtrium(a: AtriumInfo): void {
  const { b, station, upper, lower, pf, mz, cf } = a;
  const [p1, p2] = station.platforms[upper.id];
  const lowerNums = station.platforms[lower.id];
  const lines = linesAt(station.id).map((l) => l.id);
  const dir = (p: number): Extract<SignContent, { k: 'dir' }> => ({ k: 'dir', station: station.id, line: upper.id, dir: dirOf(station, upper, p) });
  const transfer: Extract<SignContent, { k: 'guide' }> = { k: 'guide', ja: `${lower.nameJa} のりかえ`, en: `Transfer: ${lower.nameEn}`, bg: 'white', badges: [lower.id] };
  const lowerPf: Extract<SignContent, { k: 'guide' }> = {
    k: 'guide', ja: `${lower.nameJa} のりば ${numList(lowerNums, '・')}`, en: `${lower.nameEn} · ${enPlatforms(lowerNums)}`, bg: 'white', badges: [lower.id],
  };
  const upperNums = station.platforms[upper.id];
  const upperPf: SignContent = { k: 'guide', ja: `のりば ${numList(upperNums, '・')}`, en: enPlatforms(upperNums), bg: 'navy', badges: [upper.id] };
  const way: SignContent = { k: 'guide', ja: '出口・改札', en: 'Exit / Ticket gates', bg: 'yellow' };
  const gateNums = a.gate.exits.map((e) => e.num);
  const concNums = stationExits(station.id).map((e) => e.num).filter((n) => !gateNums.includes(n));
  const exitsVia = (only: string[]): SignContent => ({ k: 'exits', station: station.id, only });
  const to = (from: V2, t: V2): V2 => [t[0] - from[0], t[1] - from[1]];
  const hang = (x: number, z: number, n: V2, y: number, ceil: number, front: Seg[], back: Seg[], segW = 2.5) =>
    drawHang(b, x, z, { n, y, h: 0.44, segW, front, back, ceil }, Math.max(front.length, back.length) * segW);

  // 1. The doorways from the upper platforms: the transfer, inside; the platform, outside.
  for (const s of [1, -1] as const) {
    for (const [g0, g1] of a.doors) {
      const gx = (g0 + g1) / 2;
      flat(b, { ...transfer, arrow: 'up' }, gx, pf + 2.8, s * (a.wallIn - 0.03), [0, -s], 3.4, 0.44);
      flat(b, { ...dir(s > 0 ? p2 : p1), arrow: 'up' }, gx, pf + 2.8, s * (a.wallOut + 0.02), [0, s], 3.4, 0.44);
    }
  }

  // 2. Balcony: by the stair head, on the void wall beside it.
  {
    const { head, wallX } = a.balcony;
    const z = head[1] - 1.6;
    flat(b, { ...transfer, arrow: arrowFor([0, 1], [-1, 0]) }, wallX - 0.02, pf + 2.2, z, [-1, 0], 2.6, 0.44);
  }

  // 3. Mezzanine. Under the balcony's edge: the split by platform for people coming up from
  //    the lower line (front), the lower line and the way out for people arriving (back).
  {
    const { under, z1, foot } = a.balcony;
    const at: V2 = [0, z1 - 0.7];
    hang(at[0], at[1], [0, 1], mz + 2.5, under,
      [{ c: dir(p1), to: to(at, a.underpass.mouth) }, { c: dir(p2), to: to(at, foot) }],
      [{ c: lowerPf, to: to(at, a.lowerHead) }, { c: way, to: to(at, a.mezzFoot) }]);
    // A pylon beside the head of the lower flight: the same split for people stepping off it, and
    // the lower line's platforms for people walking up to it.
    const px = a.lowerHead[0] - 3.4, pz = a.lowerHead[1] - 1.4, pw = 2.4, ph = 0.42;
    b.box('flat:#3b4046', px - pw / 2 - 0.05, mz, pz - 0.08, px + pw / 2 + 0.05, mz + 2.75, pz + 0.08);
    const up: V2 = [px, pz];
    [[dir(p1), to(up, a.underpass.mouth)], [dir(p2), to(up, foot)], [way, to(up, a.mezzFoot)]].forEach(([c, t], k) =>
      b.sign(c as SignContent, px, mz + 2.45 - k * 0.5, pz + 0.09, [0, 1], pw, ph, { arrow: unit(t as V2) }));
    b.sign(lowerPf, px, mz + 2.45, pz - 0.09, [0, -1], pw, ph, { arrow: unit(to(up, a.lowerHead)) });
    b.sign({ k: 'stationmap', station: station.id }, px, mz + 1.2, pz - 0.09, [0, -1], pw, 1.5);
    b.protect(px - pw / 2 - 0.1, mz, pz - 0.4, px + pw / 2 + 0.1, mz + 2.8, pz + 0.4);
  }

  // 4. Underpass: over its mouth on the mezzanine, half way along, at the far end and at the foot
  //    of its stair; on the landing at the top, the way down.
  {
    const u = a.underpass, xc = (u.x0 + u.x1) / 2, w = u.x1 - u.x0 - 0.4;
    flat(b, { ...dir(p1), arrow: 'up' }, xc, u.ceil + 0.3, u.mouth[1] + 0.02, [0, 1], w, 0.44);
    const mid: V2 = [xc, (u.mouth[1] + u.south) / 2];
    hang(mid[0], mid[1], [0, 1], mz + 2.45, u.ceil, [{ c: dir(p1), to: [0, -1] }], [{ c: lowerPf, to: [0, 1] }, { c: way, to: [0, 1] }], 1.85);
    b.sign(dir(p1), xc, mz + 2.3, u.south + 0.02, [0, 1], w, 0.44, { arrow: unit(to([xc, u.south], u.foot)) });
    b.protect(xc - w / 2 - 0.1, mz + 2.0, u.south, xc + w / 2 + 0.1, mz + 2.6, u.south + 0.3);
    b.sign(transfer, u.x0 + 0.02, mz + 2.3, u.foot[1], [1, 0], 2.6, 0.44, { arrow: [0, 1] });
    b.protect(u.x0, mz + 2.0, u.foot[1] - 1.4, u.x0 + 0.3, mz + 2.6, u.foot[1] + 1.4);
    // The landing: on the wall beyond the stair well, facing people coming through the doorways.
    b.sign(transfer, 0, pf + 2.3, u.south + 0.02, [0, 1], 2.6, 0.44, { arrow: unit(to([0, u.south], u.head)) });
    b.protect(-1.4, pf + 2.0, u.south, 1.4, pf + 2.6, u.south + 0.3);
  }

  // 5. Gallery: over the head of the flight down, and at each mouth from the concourse.
  const ceil = cf + 3.0, y = cf + 2.6;
  {
    const h = a.galleryHead, at: V2 = [h[0], h[1] + 1.2];
    const back: Seg[] = [{ c: exitsVia(gateNums), to: to(at, [a.gate.x, a.gate.z]) }];
    if (concNums.length) {
      const m = [...a.mouths].sort((p, q) => Math.hypot(p[0] - at[0], p[1] - at[1]) - Math.hypot(q[0] - at[0], q[1] - at[1]))[0];
      back.push({ c: exitsVia(concNums), to: to(at, m) });
    }
    hang(at[0], at[1], [0, 1], y, ceil, [{ c: { ...lowerPf, arrow: 'down' } }], back);
    // Across the gallery, for people coming in through the gates (front) and going out (back).
    const g: V2 = [a.gate.x - 4.5, (h[1] + a.gallerySouth) / 2];
    const m = [...a.mouths].sort((p, q) => Math.hypot(p[0] - g[0], p[1] - g[1]) - Math.hypot(q[0] - g[0], q[1] - g[1]))[0];
    hang(g[0], g[1], [1, 0], y, ceil,
      [{ c: lowerPf, to: to(g, h) }, { c: upperPf, to: to(g, m) }],
      [{ c: exitsVia(gateNums), to: to(g, [a.gate.x, a.gate.z]) }], 2.4);
  }
  for (const m of a.mouths) {
    const at: V2 = [m[0], m[1] + 1.6];
    hang(at[0], at[1], [0, -1], y, ceil,
      [{ c: lowerPf, to: to(at, a.galleryHead) }, { c: exitsVia(gateNums), to: to(at, [a.gate.x, a.gate.z]) }],
      [{ c: upperPf, to: [0, -1] }, ...(concNums.length ? [{ c: exitsVia(concNums), to: [0, -1] as V2 }] : [])]);
  }

  // 6. The harbour gates' unpaid lobby: the way to each exit, and back to the trains and tickets.
  {
    const at: V2 = [a.gate.x + 5.5, a.gate.z];
    const fare = b.out.signs.find((s) => s.content.k === 'faremap' && s.pos[0] > a.gate.x && Math.abs(s.pos[1] - (cf + 2.46)) < 0.3);
    const back: Seg[] = [{ c: { k: 'guide', ja: 'のりば', en: 'To trains', bg: 'navy', badges: lines }, to: [-1, 0] }];
    if (fare) back.push({ c: { k: 'picto', v: 'tickets', label: true }, to: [fare.pos[0] - at[0], fare.pos[2] - at[1]] });
    hang(at[0], at[1], [-1, 0], y, ceil, a.gate.exits.map((e) => ({ c: exitsVia([e.num]), to: to(at, e.at) })), back, 2.4);
  }

  // 7. Boards on the south wall: exits, station map and area map outside the gates; exits and
  //    station map in the gallery.
  const sz = a.gallerySouth - 0.02;
  const boards: [SignContent, number, number, number][] = [
    [{ k: 'stationmap', station: station.id }, a.gate.x + 6.0, 2.2, 1.5],
    [{ k: 'areamap', station: station.id }, a.gate.x + 8.6, 2.2, 1.5],
    [{ k: 'exits', station: station.id }, a.gate.x + 11.1, 2.0, 1.3],
    [{ k: 'exits', station: station.id }, a.galleryHead[0] - 6.5, 2.0, 1.3],
    [{ k: 'stationmap', station: station.id }, a.galleryHead[0] - 9.0, 2.2, 1.5],
  ];
  for (const [c, x, w, h] of boards) flat(b, c, x, cf + 1.5, sz, [0, -1], w, h, true);
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
      const front = platformSegs(station, stairs, [x, z], [1, 0]);
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
