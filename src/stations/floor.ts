// Floor guidance: what is painted and laid on the floor to lead a passenger from the gates to
// their line, and on along a transfer.
//
// - Line bands: a 0.3 m band in each line's colour, white-edged so it reads on any floor, from
//   just inside each gate line to that line's stairwell portals (or through a transfer bay's mouth
//   to its portal), ending in an arrowhead. One lane per band; bands only ever cross at right
//   angles, and the crossing one is broken where it passes.
// - Tactile paths (誘導ブロック): guidance blocks from each exit doorway through one gate to every
//   stair head, with warning blocks (点状ブロック) at every turn and junction, both sides of the
//   gate, and across each stair head.
// - Floor marks (the `floormark` sign): a big arrow with the line badge and platform numbers (or
//   のりかえ) just inside each gate line, in front of each room mouth and at each portal; the
//   line's badge repeated along its band at every turn and every 9 m or so.
//
// Routing: the concourse floor (spine, rooms, and the floor across their mouths) is cut into a
// 0.6 m grid of lanes, each lane wide enough for one band or one tactile path. Every path is a
// shortest route through the lanes (A*, with a cost for each turn), kept clear of everything
// solid: walls, stairwells, gates, pillars, machines, and whatever the kit has taken for itself
// (`ConcInfo.free`). The tactile paths are laid first; each band then takes lanes of its own,
// crossing others only straight across. A line's band from one gate grows as a tree: later
// branches leave the earlier ones at right angles. The guidance keeps to the middle of a corridor:
// along each long wall of the spine (and of a second spine) a frontage zone 2.8 m deep is kept for
// shop fronts, which a path may only cross straight towards the wall, to a room mouth or an exit
// doorway, or to the portal of a stair that stands against the wall (`frontageZones`). Everything
// comes from ConcInfo, ExitInfo and PassageInfo; nothing is typed in per station. Decoration only
// (`deco` and floor decals), kept within 15 mm of the floor: bands 2–5 mm, tactile 6–12 mm, marks
// at 13 mm. What is laid is `claim`ed (its footprint plus 0.15 m), so a look does not put its
// kiosk on it. A band or mark that cannot be routed is left out rather than drawn through a wall.

import type { LineDef } from '../data/types';
import type { Arrow, SignContent } from '../signs/content';
import type { Builder, V2 } from '../world/builder';
import type { ConcInfo, ExitInfo, PassageInfo, Rect, StairInfo, Stairwell } from './looks/types';
import type { PassageCtx } from './wayfinding';

// ── Sizes and heights (above the floor) ─────────────────────────────────────────────────────

/** Half widths: line band, its white edging, tactile path, warning square. */
const BAND = 0.15, EDGED = 0.18, TAC = 0.15, SQ = 0.3;
const Y_BAND0 = 0.002, Y_EDGE1 = 0.004, Y_BAND1 = 0.005;
const Y_TAC0 = 0.006, Y_BAR1 = 0.01, Y_RIDGE0 = 0.009, Y_RIDGE1 = 0.012, Y_DOT1 = 0.011;
const Y_MARK = 0.013;
const WHITE = 'paint:#f4f3ee', RIDGE = 'flat:#f2c200', RIDGE_BASE = 'flat:#d4a90d';
/** In front of a portal, as distances from its threshold along its facing. */
const STRIP: [number, number] = [0.3, 0.6], HEAD: [number, number] = [0.75, 1.15];
const MARK_AT = 1.95, APPR = 2.75;
/** Big marks: across × along the way you walk (long, so they read at a glance down the floor). */
const MARK_W = 0.9, MARK_H = 1.5, BADGE = 0.5;
/** A band's badge at least this often. */
const BADGE_EVERY = 9;

// ── The lane grid ───────────────────────────────────────────────────────────────────────────

/** Lane pitch, and the centre of lane 0 (on the tactile blocks' 0.3 m grid, so their texture lines up). */
const P = 0.6, C0 = 0.15;
const snapC = (v: number) => C0 + Math.round((v - C0) / P) * P;
/** Half the footprint a path takes in its lane; clearance from solids; extra from walls. */
const FOOT = 0.2, CLR = 0.06, WALL = 0.2;
/** Route costs (metres): a turn, crossing another path. */
const TURN = 1.5, CROSS = 2.5;
/**
 * Frontage zone: the strip along each long wall of a corridor (the spine, a second spine) that is
 * kept for shop fronts. A run's edge stays at least ZONE from the wall, less (never under
 * ZONE_MIN) only where the corridor cannot otherwise fit a lane per line plus the tactile path.
 * Inside it a path may only go straight across, towards the wall, and that costs ZONE_IN a lane
 * unless it is heading for something on the wall (a room mouth; an exit doorway, tactile only).
 * Running along the wall there is not allowed (ZONE_ALONG a lane in the last-resort pass).
 */
const ZONE = 2.8, ZONE_MIN = 1.8, ZONE_IN = 2.5, ZONE_ALONG = 6;
/** Room kept round what is laid when it is claimed. */
const CLAIM_M = 0.15;
/** Directions: +x, −x, +z, −z. A direction's reverse is d ^ 1. */
const DX = [1, -1, 0, 0], DZ = [0, 0, 1, -1];
const bit = (d: number) => (d < 2 ? 1 : 2);
const dirOf = (v: V2): number => (Math.abs(v[0]) >= Math.abs(v[1]) ? (v[0] > 0 ? 0 : 1) : v[1] > 0 ? 2 : 3);
const vecOf = (d: number): V2 => [DX[d], DZ[d]];
/** Owner of tactile lanes (bands are owned by their line's index). */
const TACT = 99;

const F_FLOOR = 1, F_SOLID = 2, F_PAID = 4, F_KEEP = 8;

const grow = (r: Rect, m: number): Rect => [r[0] - m, r[1] - m, r[2] + m, r[3] + m];
const inside = (r: Rect, x: number, z: number) => x > r[0] && x < r[2] && z > r[1] && z < r[3];
const overlaps = (a: Rect, c: Rect) => a[0] < c[2] && a[2] > c[0] && a[1] < c[3] && a[3] > c[1];
const rectOf = (x0: number, z0: number, x1: number, z1: number): Rect => [Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1)];

class Grid {
  readonly nx: number;
  readonly nz: number;
  private readonly k0: number;
  private readonly m0: number;
  /** F_* flags. */
  readonly f: Uint8Array;
  /** Who has the lane: −1 nobody, a line index, or TACT. */
  readonly own: Int16Array;
  /** Which way the owner runs through it: 1 along x, 2 along z, 3 both (a turn or a junction). */
  readonly ax: Uint8Array;
  /** Another path already crosses here. */
  readonly crossed: Uint8Array;
  /** Index of the owner's path. */
  readonly path: Int32Array;
  /** Extra cost of using the lane. */
  readonly cost: Float32Array;
  /** In a frontage zone: the `bit` of the direction along its wall (0 not in one). */
  readonly zone: Uint8Array;
  /** Frontage zone lanes that lead straight to something on the wall: 1 for anyone, 2 tactile only. */
  readonly win: Uint8Array;
  readonly best: Float64Array;
  readonly prev: Int32Array;

  constructor(r: Rect) {
    this.k0 = Math.ceil((r[0] - C0) / P);
    this.m0 = Math.ceil((r[1] - C0) / P);
    this.nx = Math.max(1, Math.floor((r[2] - C0) / P) - this.k0 + 1);
    this.nz = Math.max(1, Math.floor((r[3] - C0) / P) - this.m0 + 1);
    const n = this.nx * this.nz;
    this.f = new Uint8Array(n);
    this.own = new Int16Array(n).fill(-1);
    this.ax = new Uint8Array(n);
    this.crossed = new Uint8Array(n);
    this.path = new Int32Array(n).fill(-1);
    this.cost = new Float32Array(n);
    this.zone = new Uint8Array(n);
    this.win = new Uint8Array(n);
    this.best = new Float64Array(n * 4);
    this.prev = new Int32Array(n * 4);
  }
  x(c: number) {
    return C0 + ((c % this.nx) + this.k0) * P;
  }
  z(c: number) {
    return C0 + (Math.floor(c / this.nx) + this.m0) * P;
  }
  /** The cell whose centre is nearest (x, z), or −1 off the grid. */
  at(x: number, z: number): number {
    const a = Math.round((x - C0) / P) - this.k0, m = Math.round((z - C0) / P) - this.m0;
    return a < 0 || m < 0 || a >= this.nx || m >= this.nz ? -1 : m * this.nx + a;
  }
  step(c: number, d: number): number {
    const a = (c % this.nx) + DX[d], m = Math.floor(c / this.nx) + DZ[d];
    return a < 0 || m < 0 || a >= this.nx || m >= this.nz ? -1 : m * this.nx + a;
  }
  /** Every cell whose centre lies strictly inside r. */
  each(r: Rect, fn: (c: number) => void) {
    const a0 = Math.max(0, Math.floor((r[0] - C0) / P + 1e-9) + 1 - this.k0), a1 = Math.min(this.nx - 1, Math.ceil((r[2] - C0) / P - 1e-9) - 1 - this.k0);
    const m0 = Math.max(0, Math.floor((r[1] - C0) / P + 1e-9) + 1 - this.m0), m1 = Math.min(this.nz - 1, Math.ceil((r[3] - C0) / P - 1e-9) - 1 - this.m0);
    for (let m = m0; m <= m1; m++) for (let a = a0; a <= a1; a++) fn(m * this.nx + a);
  }
  straight(c: number) {
    return this.ax[c] === 1 || this.ax[c] === 2;
  }
}

/** Binary min-heap of (key, value). */
class Heap {
  private k: number[] = [];
  private v: number[] = [];
  get size() {
    return this.k.length;
  }
  push(key: number, val: number) {
    const { k, v } = this;
    let i = k.length;
    k.push(key);
    v.push(val);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (k[p] <= key) break;
      k[i] = k[p];
      v[i] = v[p];
      i = p;
    }
    k[i] = key;
    v[i] = val;
  }
  pop(): number {
    const { k, v } = this;
    const top = v[0];
    const lk = k.pop()!, lv = v.pop()!;
    const n = k.length;
    if (n) {
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        if (l >= n) break;
        const c = l + 1 < n && k[l + 1] < k[l] ? l + 1 : l;
        if (k[c] >= lk) break;
        k[i] = k[c];
        v[i] = v[c];
        i = c;
      }
      k[i] = lk;
      v[i] = lv;
    }
    return top;
  }
}

interface Start {
  c: number;
  d: number;
  cost: number;
}

/**
 * Cheapest lane route for `owner` from any start to a cell `goal` accepts (arriving in direction
 * d). Paths may cross another owner's lane only straight across a straight stretch, and may not
 * turn there. In a frontage zone a path only goes straight across (`strict`: never along the
 * wall; otherwise at a high cost). Returns the states (cell·4 + direction) from start to goal.
 */
function search(g: Grid, owner: number, pass: (c: number) => boolean, starts: Start[], goal: (c: number, d: number) => boolean, hx: number, hz: number, strict = true): number[] | null {
  const wm = owner === TACT ? 3 : 1;
  g.best.fill(Infinity);
  g.prev.fill(-1);
  const heap = new Heap();
  const h = (c: number) => Math.abs(g.x(c) - hx) + Math.abs(g.z(c) - hz);
  const first = new Set<number>();
  for (const s of starts) {
    const id = s.c * 4 + s.d;
    if (s.cost >= g.best[id]) continue;
    g.best[id] = s.cost;
    first.add(id);
    heap.push(s.cost + h(s.c), id);
  }
  let pops = 0;
  while (heap.size && pops++ < 400000) {
    const id = heap.pop();
    const c = id >> 2, d = id & 3, gc = g.best[id];
    if (!first.has(id) && goal(c, d)) {
      const out: number[] = [];
      for (let s = id; s >= 0; s = g.prev[s]) out.push(s);
      return out.reverse();
    }
    const crossing = g.own[c] !== -1 && g.own[c] !== owner;
    for (let nd = 0; nd < 4; nd++) {
      if (nd === (d ^ 1)) continue;
      const turn = nd !== d;
      if (turn && crossing) continue;
      const nc = g.step(c, nd);
      if (nc < 0 || !pass(nc)) continue;
      const o = g.own[nc];
      let cost = P + g.cost[nc] + (turn ? TURN : 0);
      const zb = g.zone[nc];
      if (zb) {
        if (bit(nd) === zb) {
          if (strict) continue;
          cost += ZONE_ALONG;
        } else if (!(g.win[nc] & wm)) cost += ZONE_IN;
      }
      if (o === owner) {
        if (!goal(nc, nd)) continue;
      } else if (o !== -1) {
        if (g.crossed[nc] || g.ax[nc] !== (nd < 2 ? 2 : 1)) continue;
        cost += CROSS;
      }
      const nid = nc * 4 + nd, ng = gc + cost;
      if (ng < g.best[nid] - 1e-9) {
        g.best[nid] = ng;
        g.prev[nid] = id;
        heap.push(ng + h(nc), nid);
      }
    }
  }
  return null;
}

// ── Drawing ─────────────────────────────────────────────────────────────────────────────────

/** A run along local axis `ax` from a to c (a < c), centred on cross coordinate v, at floor y. */
type Run = { ax: 'x' | 'z'; v: number; a: number; c: number };

/** Box for a run's plan, `hw` either side of v. */
function runRect(r: Run, hw: number, a = r.a, c = r.c): Rect {
  return r.ax === 'x' ? [a, r.v - hw, c, r.v + hw] : [r.v - hw, a, r.v + hw, c];
}
function decoRect(b: Builder, mat: string, r: Rect, y0: number, y1: number) {
  b.deco(mat, r[0], y0, r[1], r[2], y1, r[3]);
}

/**
 * A tactile guidance run, 0.3 m wide. The blocks' bars must run the way you walk: the
 * `tactileBar` texture's bars run along the station frame's z (its UVs are world x, z), so a run
 * along z uses it, lined up with the texture's 0.3 m grid; a run along x is built from four
 * raised bars over a yellow base instead.
 */
function tacRun(b: Builder, y: number, r: Run): Rect | null {
  if (r.c - r.a < 0.02) return null;
  const along = b.dir(r.ax === 'x' ? [1, 0] : [0, 1]);
  const bar = (mat: string, v0: number, v1: number, y0: number, y1: number) => decoRect(b, mat, runRect({ ...r, v: (v0 + v1) / 2 }, (v1 - v0) / 2), y + y0, y + y1);
  if (Math.abs(along[1]) > 0.5) {
    // Line the strip up with the blocks' grid (station x ≡ 0.15 mod 0.3 at its centre).
    const across = b.dir(r.ax === 'x' ? [0, 1] : [1, 0])[0];
    const sx = b.pt(r.ax === 'z' ? r.v : r.a, 0, r.ax === 'z' ? r.a : r.v)[0];
    const v = r.v + (Math.floor(sx / 0.3) * 0.3 + 0.15 - sx) * across;
    bar('tactileBar', v - TAC, v + TAC, Y_TAC0, Y_BAR1);
    return runRect({ ...r, v }, TAC);
  }
  bar(RIDGE_BASE, r.v - TAC, r.v + TAC, Y_TAC0, Y_RIDGE0);
  for (const o of [-0.1125, -0.0375, 0.0375, 0.1125]) bar(RIDGE, r.v + o - 0.014, r.v + o + 0.014, Y_RIDGE0, Y_RIDGE1);
  return runRect(r, TAC);
}

/** Warning blocks (dots) over a plan rectangle. */
function dots(b: Builder, y: number, r: Rect): Rect {
  decoRect(b, 'tactile', r, y + Y_TAC0, y + Y_DOT1);
  return r;
}

/** Merge runs on the same line into as few as possible. */
function mergeRuns(runs: Run[]): Run[] {
  const by = new Map<string, Run[]>();
  for (const r of runs) {
    if (r.c - r.a < 1e-4) continue;
    const k = `${r.ax}|${r.v.toFixed(4)}`;
    by.set(k, [...(by.get(k) ?? []), r]);
  }
  const out: Run[] = [];
  for (const list of by.values()) {
    list.sort((p, q) => p.a - q.a);
    let cur = { ...list[0] };
    for (const r of list.slice(1)) {
      if (r.a <= cur.c + 1e-4) cur.c = Math.max(cur.c, r.c);
      else {
        out.push(cur);
        cur = { ...r };
      }
    }
    out.push(cur);
  }
  return out;
}

/** Take the intervals covered by `cuts` (along the run, where they cover its centre line) out of a run. */
function cutRun(r: Run, cuts: Rect[]): Run[] {
  let parts: [number, number][] = [[r.a, r.c]];
  for (const q of cuts) {
    const [v0, v1, u0, u1] = r.ax === 'x' ? [q[1], q[3], q[0], q[2]] : [q[0], q[2], q[1], q[3]];
    if (r.v <= v0 || r.v >= v1) continue;
    parts = parts.flatMap(([a, c]): [number, number][] => (u1 <= a || u0 >= c ? [[a, c]] : [...(u0 > a ? [[a, u0] as [number, number]] : []), ...(u1 < c ? [[u1, c] as [number, number]] : [])]));
  }
  return parts.filter(([a, c]) => c - a > 0.02).map(([a, c]) => ({ ...r, a, c }));
}

/** A floor decal, its top towards `top` (the way its reader walks). */
function decal(b: Builder, c: SignContent, x: number, y: number, z: number, w: number, h: number, top: V2): Rect {
  b.sign(c, x, y + Y_MARK, z, null, w, h, { top });
  const along = Math.abs(top[0]) > 0.5;
  return along ? [x - h / 2, z - w / 2, x + h / 2, z + w / 2] : [x - w / 2, z - h / 2, x + w / 2, z + h / 2];
}

/** Which way `to` points on a floor decal whose top is `top` (both local; resolved in the station frame). */
function arrowOn(b: Builder, top: V2, to: V2): Arrow {
  const t = b.dir(top), d = b.dir(to);
  const right: V2 = [-t[1], t[0]];
  const r = d[0] * right[0] + d[1] * right[1], u = d[0] * t[0] + d[1] * t[1];
  return Math.abs(r) > Math.abs(u) ? (r > 0 ? 'right' : 'left') : u >= 0 ? 'up' : 'down';
}

/** The big mark for a stair: its line, and its platform numbers or のりかえ. */
function stairMark(line: LineDef, kind: StairInfo['kind'], nums: number[], arrow: Arrow = 'up'): SignContent {
  return { k: 'floormark', line: line.id, arrow, nums: [...nums].sort((a, c) => a - c), ...(kind === 'transfer' ? { transfer: true } : {}) };
}

// ── The concourse ───────────────────────────────────────────────────────────────────────────

/** A stairwell portal as a destination: where bands and the tactile path arrive in front of it. */
interface Target {
  k: number;
  well: Stairwell;
  st: StairInfo;
  /** Its facing is along x (else z); facing sign; head position along it and across. */
  alongX: boolean;
  nu: number;
  au: number;
  av: number;
  half: number;
  /** Arrival direction (−facing). */
  arr: number;
  keep: Rect;
  /** How far in front of it is kept clear (less than APPR where something stands close in front). */
  reserve: number;
  band: number;
  bandV: number;
  tac: number;
  tacV: number;
  /** It stands against a corridor's long wall, facing along it (a side platform's stair): its tactile path may come in from the side. */
  wall: boolean;
}

interface GateInfo {
  e: number;
  g: number;
  /** Unpaid side: +1 is x > g. */
  h: 1 | -1;
  /** Directions into the paid side, and from the unpaid side towards the gates. */
  inDir: number;
  toGate: number;
  /** Tactile lane through the gates (NaN if none fits), its nodes either side, and the first lanes beyond. */
  zt: number;
  xi: number;
  xo: number;
  tacIn: number;
  tacOut: number;
  targets: Target[];
  /** Per line: its mark just inside the gates and the lane its band starts in. */
  marks: Map<string, { rect: Rect; x: number; z: number; root: number; edge: number }>;
}

interface PathRec {
  owner: number;
  group: string;
  target: number;
  ids: number[];
  /** Explicit first and last points (else the first / last cell's centre). */
  start: V2 | null;
  end: V2 | null;
}

/**
 * Mark the frontage zone along both long walls of each corridor: the spine (its paid area, clear
 * of the gate lines) and any second spine. A lane is in the zone if a run in it would come within
 * ZONE of the wall; where a stretch of corridor cannot then fit a lane per line plus the tactile
 * path beside its solids, the zone is made shallower there (down to ZONE_MIN). Room mouths and
 * exit doorways open windows in the zone (lanes straight to them), and in front of a stair that
 * stands against the wall facing along it (side platforms) there is no zone as far as its band and
 * tactile path need to turn in: its portal is there, and its tactile path may come in from the side.
 */
function frontageZones(i: ConcInfo, g: Grid, targets: Target[], nLines: number, [p0, p1]: [number, number]) {
  type Corr = { r: Rect; ax: 'x' | 'z'; a0: number; a1: number; need: number; room: number };
  const corrs: Corr[] = [{ r: [i.x0, -i.cw, i.x1, i.cw], ax: 'x', a0: p0 + 3.8, a1: p1 - 3.8, need: nLines + 1, room: -1 }];
  i.rooms.forEach((rm, k) => {
    if (rm.kind !== 'spine') return;
    const q = rm.rect, ax = q[2] - q[0] >= q[3] - q[1] ? 'x' : 'z';
    // The lines whose bands run in it: its own stairs', and those of the rooms off it.
    const lines = new Set(targets.filter((t) => t.well.room === k || (t.well.room >= 0 && i.rooms[t.well.room].mouths.some((m) => m.to === k))).map((t) => t.st.line.id));
    corrs.push({ r: q, ax, a0: ax === 'x' ? q[0] : q[1], a1: ax === 'x' ? q[2] : q[3], need: lines.size + 1, room: k });
  });
  for (const C of corrs) {
    const X = C.ax === 'x', along = X ? 1 : 2;
    const [lo, hi] = X ? [C.r[1], C.r[3]] : [C.r[0], C.r[2]];
    const mid = (lo + hi) / 2;
    const uOf = (c: number) => (X ? g.x(c) : g.z(c)), vOf = (c: number) => (X ? g.z(c) : g.x(c));
    // Its lanes, column by column along it, each with a run's edge distance from the nearer wall.
    const cols = new Map<number, { c: number; d: number }[]>();
    for (let c = 0; c < g.f.length; c++) {
      if (!(g.f[c] & F_FLOOR) || g.zone[c]) continue;
      const u = uOf(c), v = vOf(c);
      if (u < C.a0 || u > C.a1 || !inside(C.r, g.x(c), g.z(c))) continue;
      const key = Math.round((u - C0) / P);
      (cols.get(key) ?? cols.set(key, []).get(key)!).push({ c, d: Math.min(v - lo, hi - v) - EDGED });
    }
    // The deepest zone that leaves enough lanes clear of solids across the column...
    const depth = new Map<number, number>();
    for (const [key, list] of cols) {
      const open = list.filter((q) => !(g.f[q.c] & F_SOLID));
      let D = ZONE;
      while (D > ZONE_MIN + 1e-6 && open.filter((q) => q.d >= D - 1e-6).length < C.need) D -= 0.1;
      depth.set(key, Math.max(ZONE_MIN, D));
    }
    // ... and over a stretch no deeper than its shallowest column within 1.2 m.
    for (const [key, list] of cols) {
      let D = Infinity;
      for (let k = key - 2; k <= key + 2; k++) D = Math.min(D, depth.get(k) ?? Infinity);
      for (const q of list) if (q.d < D - 1e-6) g.zone[q.c] = along;
    }
    // Windows: the lanes straight to a room mouth (anyone) or an exit doorway (tactile only).
    const holes: { at: number; u0: number; u1: number; w: number }[] = C.room < 0
      ? i.openings.map((o) => ({ at: o.s * i.cw, u0: o.x0, u1: o.x1, w: o.kind === 'exit' ? 2 : 1 }))
      : i.rooms[C.room].mouths.filter((m) => m.axis === C.ax).map((m) => ({ at: m.at, u0: m.u0, u1: m.u1, w: 1 }));
    for (const list of cols.values()) {
      for (const { c } of list) {
        if (!g.zone[c]) continue;
        const u = uOf(c), v = vOf(c);
        for (const h of holes) if (u > h.u0 && u < h.u1 && (h.at - mid) * (v - mid) > 0) g.win[c] |= h.w;
      }
    }
    // In front of a stair against the wall, facing along it: no zone as far as its paths turn in.
    for (const t of targets) {
      if (t.well.room !== C.room || t.alongX !== X || Math.min(t.av - lo, hi - t.av) > ZONE + 1.5) continue;
      t.wall = true;
      const ua = t.au, ub = t.au + t.nu * (t.reserve + FOOT + P + 0.35);
      const [va, vb] = t.av > mid ? [mid, hi] : [lo, mid];
      g.each(X ? rectOf(ua, va, ub, vb) : rectOf(va, ua, vb, ub), (c) => (g.zone[c] = 0));
    }
  }
}

/** Line bands, tactile paths and floor arrows in a concourse (spine and rooms). */
export function floorConcourse(i: ConcInfo): void {
  const { b } = i;
  const nb = b.out.boxes.length, ns = b.out.signs.length;
  let claims: Rect[];
  try {
    claims = guideConcourse(i);
  } catch {
    // Never break a station over its floor markings: leave them all out.
    b.out.boxes.length = nb;
    b.out.signs.length = ns;
    claims = [];
  }
  for (const r of claims) i.claim(r[0] - CLAIM_M, r[1] - CLAIM_M, r[2] + CLAIM_M, r[3] + CLAIM_M);
}

function guideConcourse(i: ConcInfo): Rect[] {
  const { b, cf, cw } = i;
  const claims: Rect[] = [];

  // ── Where the floor is: the spine, the rooms, and across their mouths ──
  const areas: { r: Rect; mid: number | null }[] = [{ r: [i.x0, -cw, i.x1, cw], mid: 0 }];
  for (const r of i.rooms) {
    const q = r.rect;
    areas.push({ r: q, mid: r.kind === 'spine' && q[2] - q[0] >= q[3] - q[1] ? (q[1] + q[3]) / 2 : null });
  }
  const areaAt = (x: number, z: number) => areas.findIndex((a) => x >= a.r[0] && x <= a.r[2] && z >= a.r[1] && z <= a.r[3]);
  const bridges: { r: Rect; ax: 'x' | 'z' }[] = [];
  for (const room of i.rooms) {
    for (const m of room.mouths) {
      const mid = (m.u0 + m.u1) / 2;
      let lo = m.at - 1.7, hi = m.at + 1.7, ok = true;
      for (const s of [-1, 1]) {
        const k = m.axis === 'x' ? areaAt(mid, m.at + s * 0.6) : areaAt(m.at + s * 0.6, mid);
        if (k < 0) ok = false;
        else {
          const ar = areas[k].r;
          if (s < 0) lo = Math.max(lo, m.axis === 'x' ? ar[1] : ar[0]);
          else hi = Math.min(hi, m.axis === 'x' ? ar[3] : ar[2]);
        }
      }
      if (ok) bridges.push({ r: m.axis === 'x' ? [m.u0, lo, m.u1, hi] : [lo, m.u0, hi, m.u1], ax: m.axis });
    }
  }
  const reg = [...areas.map((a) => a.r), ...bridges.map((q) => q.r)].reduce((a, r): Rect => [Math.min(a[0], r[0]), Math.min(a[1], r[1]), Math.max(a[2], r[2]), Math.max(a[3], r[3])]);
  const g = new Grid(reg);
  const IN = FOOT + WALL;
  for (const a of areas) g.each([a.r[0] + IN, a.r[1] + IN, a.r[2] - IN, a.r[3] - IN], (c) => (g.f[c] |= F_FLOOR));
  for (const q of bridges) {
    const r: Rect = q.ax === 'x' ? [q.r[0] + IN, q.r[1], q.r[2] - IN, q.r[3]] : [q.r[0], q.r[1] + IN, q.r[2], q.r[3] - IN];
    g.each(r, (c) => (g.f[c] |= F_FLOOR));
  }

  // ── What is in the way: everything solid at floor level, the stairs and their wells, pillars ──
  const solids: Rect[] = [];
  for (const p of b.out.boxes) {
    if (!p.solid || p.max[1] <= cf + 0.05 || p.min[1] >= cf + 1.6) continue;
    if (p.max[0] < reg[0] || p.min[0] > reg[2] || p.max[2] < reg[1] || p.min[2] > reg[3]) continue;
    solids.push([p.min[0], p.min[2], p.max[0], p.max[2]]);
  }
  solids.push(...i.holes, ...i.stairwells.map((w) => w.footprint), ...i.pillars.map(([x, z]): Rect => [x - 0.35, z - 0.35, x + 0.35, z + 0.35]));
  for (const r of solids) g.each(grow(r, FOOT + CLR), (c) => (g.f[c] |= F_SOLID));
  // Whatever the kit has taken in the paid spine that is not one of the above (or the room the
  // kit keeps round them) is something still to be built there, such as a kiosk: keep off it.
  const [p0, p1] = i.paid;
  const known: Rect[] = [
    ...i.holes.map((h): Rect => [h[0] - 3.05, h[1] - 0.95, h[2] + 3.05, h[3] + 0.95]),
    ...i.stairwells.map((w) => grow(w.footprint, 0.35)),
    ...i.openings.filter((o) => o.kind === 'bay').map((o): Rect => [o.x0 - 0.35, o.s > 0 ? cw - 2.55 : -cw, o.x1 + 0.35, o.s > 0 ? cw : -cw + 2.55]),
    ...i.pillars.map(([x, z]): Rect => [x - 0.65, z - 0.65, x + 0.65, z + 0.65]),
    [i.toilets - 1.65, -cw, i.toilets + 1.65, -cw + 1.65],
    // The floor under a hanging sign (kept clear of tall things, but walked under).
    ...b.out.signs.filter((s) => s.normal && s.pos[1] - s.h / 2 > cf + 1.9 && s.pos[1] < cf + 4).map((s): Rect => {
      const [nx, nz] = s.normal!;
      const hw = s.w / 2 + 0.7;
      return Math.abs(nx) > 0.5 ? [s.pos[0] - 0.8, s.pos[2] - hw, s.pos[0] + 0.8, s.pos[2] + hw] : [s.pos[0] - hw, s.pos[2] - 0.8, s.pos[0] + hw, s.pos[2] + 0.8];
    }),
  ];
  for (let c = 0; c < g.f.length; c++) {
    if (!(g.f[c] & F_FLOOR)) continue;
    const x = g.x(c), z = g.z(c);
    if (x > p0 && x < p1) g.f[c] |= F_PAID;
    if (Math.abs(z) >= cw - 0.9 || x <= p0 || x >= p1 || i.ends.some((e) => Math.abs(x - e.g) < 3.9)) continue;
    if (!i.free(x, z, x, z) && !known.some((r) => inside(r, x, z))) g.f[c] |= F_SOLID;
  }

  // ── Stairwell portals: the floor in front of each is kept for its own band and path ──
  /** Lane centres across a portal's opening, nearest its middle first. */
  const lanesIn = (av: number, half: number) => {
    const vs: number[] = [];
    for (let m = Math.ceil((av - half - C0) / P); C0 + m * P <= av + half; m++) {
      const v = C0 + m * P;
      if (Math.abs(v - av) <= half - 0.3) vs.push(v);
    }
    return vs.sort((p, q) => Math.abs(p - av) - Math.abs(q - av));
  };
  /** The first lane in line v beyond `reserve` from a portal's threshold. */
  const cellAt = (alongX: boolean, nu: number, au: number, reserve: number, v: number) => {
    const du = reserve + FOOT + 1e-6;
    const u = nu > 0 ? C0 + Math.ceil((au + du - C0) / P) * P : C0 + Math.floor((au - du - C0) / P) * P;
    return alongX ? g.at(u, v) : g.at(v, u);
  };
  const targets: Target[] = i.stairwells.map((well, k): Target => {
    const n = well.portal.n, alongX = Math.abs(n[0]) > 0.5;
    const nu = Math.sign(alongX ? n[0] : n[1]);
    const au = alongX ? well.portal.at[0] : well.portal.at[1], av = alongX ? well.portal.at[1] : well.portal.at[0];
    const half = well.portal.w / 2;
    // Room for a straight run in, under its mark? Else (something stands just in front, such as
    // a lift shaft) only the arrowhead's length is kept, and the band may come in from the side.
    const open = (reserve: number) => lanesIn(av, half).some((v) => {
      const c = cellAt(alongX, nu, au, reserve, v);
      return c >= 0 && (g.f[c] & (F_FLOOR | F_SOLID)) === F_FLOOR;
    });
    const reserve = open(APPR) ? APPR : HEAD[1] + 0.05;
    const u0 = au + nu * 0.05, u1 = au + nu * reserve, v0 = av - half - (reserve === APPR ? 0.55 : 0.1), v1 = av + half + (reserve === APPR ? 0.55 : 0.1);
    const keep = alongX ? rectOf(u0, v0, u1, v1) : rectOf(v0, u0, v1, u1);
    return { k, well, st: well.stair, alongX, nu, au, av, half, arr: dirOf([-n[0], -n[1]]), keep, reserve, band: -1, bandV: NaN, tac: -1, tacV: NaN, wall: false };
  });
  const tp = (t: Target, d: number, v: number): V2 => (t.alongX ? [t.au + t.nu * d, v] : [v, t.au + t.nu * d]);
  /** Arriving at a portal's lane: straight in, or (where little is kept in front) from either side. */
  let loose = false;
  const arrives = (t: Target, d: number, tac = false) => d === t.arr || ((loose || t.reserve < APPR || (tac && t.wall)) && d !== (t.arr ^ 1));
  for (const t of targets) g.each(grow(t.keep, FOOT), (c) => (g.f[c] |= F_KEEP));

  const bandOk = (c: number) => (g.f[c] & (F_FLOOR | F_SOLID | F_PAID | F_KEEP)) === (F_FLOOR | F_PAID);
  const tacOk = (c: number) => (g.f[c] & (F_FLOOR | F_SOLID | F_KEEP)) === F_FLOOR;
  const solidIn = (r: Rect) => solids.some((s) => overlaps(s, r));

  // ── Gate lines: the tactile lane through them, kept strips either side ──
  const gates: GateInfo[] = i.ends.map((e, k): GateInfo => {
    const h: 1 | -1 = e.hi ? 1 : -1;
    // The lane between two gates with most room either side of a 0.3 m path.
    let zt = NaN, best = 0.08;
    for (let m = -5; m <= 5; m++) {
      const z = C0 + m * P;
      if (Math.abs(z) > 2.6) continue;
      const strip: Rect = [e.g - 1.5, z - TAC, e.g + 1.5, z + TAC];
      let clr = 1;
      for (const s of solids) {
        if (s[2] <= strip[0] || s[0] >= strip[2]) continue;
        clr = Math.min(clr, s[1] >= strip[3] ? s[1] - strip[3] : s[3] <= strip[1] ? strip[1] - s[3] : -1);
      }
      if (clr > best + 1e-6 || (Math.abs(clr - best) < 1e-6 && Math.abs(z) < Math.abs(zt))) [zt, best] = [z, clr];
    }
    const xi = e.g - h * 1.15, xo = e.g + h * 1.15;
    g.each([e.g - 1.65, reg[1], e.g + 1.65, reg[3]], (c) => (g.f[c] |= F_KEEP));
    const beyond = (s: number, from: number) => {
      // First lane centre at least `from` from the gate line on side s (in units of h).
      const x = e.g + s * h * from;
      return s * h > 0 ? C0 + Math.ceil((x - C0) / P - 1e-9) * P : C0 + Math.floor((x - C0) / P + 1e-9) * P;
    };
    const tacIn = Number.isNaN(zt) ? -1 : g.at(beyond(-1, 1.65), zt), tacOut = Number.isNaN(zt) ? -1 : g.at(beyond(1, 1.65), zt);
    return {
      e: k, g: e.g, h, inDir: h > 0 ? 1 : 0, toGate: h > 0 ? 1 : 0, zt, xi, xo,
      tacIn: tacIn >= 0 && tacOk(tacIn) ? tacIn : -1, tacOut: tacOut >= 0 && tacOk(tacOut) ? tacOut : -1,
      targets: [], marks: new Map(),
    };
  });

  // ── Which portals each gate leads to: for every platform of every line, the nearest portal that
  //    serves it (one facing away costs the walk round it), and every portal from somewhere ──
  const est = (G: GateInfo, t: Target) => {
    const [ax, az] = tp(t, APPR + 0.3, t.av);
    const rx = G.g - G.h * 3;
    let d = Math.abs(ax - rx) + Math.abs(az);
    if (t.alongX && (G.g - t.au) * t.nu < 0) d += 2 * (t.well.footprint[2] - t.well.footprint[0]) + 4;
    return d;
  };
  const lineIds = [...new Set(i.stairs.map((s) => s.line.id))];
  const lineOf = (id: string) => i.stairs.find((s) => s.line.id === id)!.line;
  for (const G of gates) {
    for (const id of lineIds) {
      const mine = targets.filter((t) => t.st.line.id === id);
      for (const p of new Set(mine.flatMap((t) => t.st.platforms))) {
        const t = mine.filter((q) => q.st.platforms.includes(p)).sort((q, r) => est(G, q) - est(G, r))[0];
        if (t && !G.targets.includes(t)) G.targets.push(t);
      }
    }
  }
  for (const t of targets) {
    if (gates.some((G) => G.targets.includes(t)) || !gates.length) continue;
    [...gates].sort((p, q) => est(p, t) - est(q, t))[0].targets.push(t);
  }
  for (const G of gates) G.targets.sort((p, q) => est(G, p) - est(G, q));

  // ── Marks just inside each gate line, one per line, in lanes of their own beside the tactile path ──
  for (const G of gates) {
    const ids = lineIds.filter((id) => G.targets.some((t) => t.st.line.id === id));
    const meanZ = (id: string) => {
      const ts = G.targets.filter((t) => t.st.line.id === id);
      return ts.reduce((s, t) => s + t.well.portal.at[1], 0) / ts.length;
    };
    ids.sort((p, q) => meanZ(p) - meanZ(q));
    const slots: { z: number; rect: Rect; root: number; x: number; edge: number }[] = [];
    const lo = 1.0, hi = 1.0 + MARK_H;
    const rows: number[] = [];
    for (let m = -12; m <= 12; m++) rows.push(C0 + m * P);
    rows.sort((p, q) => Math.abs(p) - Math.abs(q));
    for (const z of rows) {
      if (slots.length >= ids.length) break;
      if (!Number.isNaN(G.zt) && Math.abs(z - G.zt) < MARK_W / 2 + SQ + 0.05) continue;
      if (slots.some((s) => Math.abs(s.z - z) < MARK_W + 0.2)) continue;
      if (Math.abs(z) + MARK_W / 2 > cw - 0.3) continue;
      const rect = rectOf(G.g - G.h * lo, z - MARK_W / 2, G.g - G.h * hi, z + MARK_W / 2);
      if (solidIn(grow(rect, 0.05))) continue;
      const x = G.g - G.h * hi, rx = G.h > 0 ? C0 + Math.floor((x - FOOT - 0.05 - C0) / P) * P : C0 + Math.ceil((x + FOOT + 0.05 - C0) / P) * P;
      const root = g.at(rx, z);
      if (root < 0 || !bandOk(root)) continue;
      slots.push({ z, rect, root, x: G.g - G.h * (lo + hi) / 2, edge: x });
    }
    slots.sort((p, q) => p.z - q.z);
    if (slots.length < ids.length) ids.length = slots.length;
    ids.forEach((id, k) => {
      const s = slots[k];
      G.marks.set(id, { rect: s.rect, x: s.x, z: s.z, root: s.root, edge: s.edge });
      g.each(grow(s.rect, FOOT), (c) => (g.f[c] |= F_KEEP));
    });
  }

  // ── The lanes each portal's band and tactile path arrive in ──
  for (const t of targets) {
    const vs = lanesIn(t.av, t.half);
    const cell = (v: number) => cellAt(t.alongX, t.nu, t.au, t.reserve, v);
    // The tactile lane two lanes over (one at a pinch), on the side towards the area's axis.
    const area = areas[Math.max(0, areaAt(...tp(t, APPR, t.av)))];
    const axis = t.alongX ? area.mid ?? (area.r[1] + area.r[3]) / 2 : (area.r[0] + area.r[2]) / 2;
    for (const bv of vs) {
      const bc = cell(bv);
      if (bc < 0 || !bandOk(bc)) continue;
      t.band = bc;
      t.bandV = bv;
      const towards = Math.sign(axis - bv) || -1;
      for (const dv of [2 * P * towards, -2 * P * towards, P * towards, -P * towards]) {
        const tv = bv + dv;
        if (Math.abs(tv - t.av) > t.half - TAC - 0.05) continue;
        const tc = cell(tv);
        if (tc >= 0 && tacOk(tc)) {
          t.tac = tc;
          t.tacV = tv;
          break;
        }
      }
      break;
    }
    if (t.band < 0) {
      // No band lane: a tactile lane alone.
      for (const v of vs) {
        const tc = cell(v);
        if (tc >= 0 && tacOk(tc)) {
          t.tac = tc;
          t.tacV = v;
          break;
        }
      }
    }
  }

  // ── Frontage zones along the long walls of the spine and of any second spine ──
  frontageZones(i, g, targets, lineIds.length, [p0, p1]);

  // Each portal's arrival lanes are its own. (A path comes in straight if it can, else from the side.)
  const resv = new Int16Array(g.f.length).fill(-1);
  for (const t of targets) {
    for (const [c, o] of [[t.band, lineIds.indexOf(t.st.line.id)], [t.tac, TACT]]) {
      if (c < 0) continue;
      resv[c] = o;
    }
  }
  // (A band's arrival lane may be crossed once its band is laid: the tactile paths come after.)
  const tacPass = (c: number) => tacOk(c) && (resv[c] === -1 || resv[c] === TACT || g.own[c] !== -1);
  const bandPass = (li: number) => (c: number) => bandOk(c) && (resv[c] === -1 || resv[c] === li);

  // ── Routing ──
  const paths: PathRec[] = [];
  const cellsOf = new Map<string, number[]>();
  const reach = new Map<string, Set<number>>();
  const parent = new Map<string, string>();
  const find = (k: string): string => {
    let r = k;
    while (parent.has(r)) r = parent.get(r)!;
    return r;
  };
  const getReach = (k: string) => reach.get(k) ?? reach.set(k, new Set()).get(k)!;
  const getCells = (k: string) => cellsOf.get(k) ?? cellsOf.set(k, []).get(k)!;
  const groupOf = (c: number) => (g.path[c] >= 0 ? paths[g.path[c]].group : '');

  /** Record a found route as `owner`'s. */
  const record = (ids: number[], owner: number, group: string, target: number, start: V2 | null, end: V2 | null) => {
    const pi = paths.length;
    paths.push({ owner, group, target, ids, start, end });
    const cells = getCells(group);
    ids.forEach((id, k) => {
      const c = id >> 2, d = id & 3;
      if (g.own[c] !== -1 && g.own[c] !== owner) {
        g.crossed[c] = 1;
        return;
      }
      let bits = bit(d);
      if (k + 1 < ids.length) bits |= bit(ids[k + 1] & 3);
      // The last lane turns if the path goes on to an end point off its line (a side arrival).
      else if (end && Math.abs(end[0] - g.x(c)) + Math.abs(end[1] - g.z(c)) > 1e-6) bits |= bit(dirOf([end[0] - g.x(c), end[1] - g.z(c)]));
      if (g.own[c] === -1) {
        g.own[c] = owner;
        g.path[c] = pi;
        cells.push(c);
      }
      g.ax[c] |= bits;
    });
    return pi;
  };
  /** Branch off a group's straight stretches at right angles. */
  const branches = (group: string, ok: (c: number) => boolean): Start[] =>
    (cellsOf.get(group) ?? []).filter((c) => g.straight(c) && !g.crossed[c] && resv[c] === -1 && ok(c))
      .flatMap((c) => (g.ax[c] === 1 ? [2, 3] : [0, 1]).map((d) => ({ c, d, cost: TURN })));

  // Line bands, gate by gate and line by line: a tree from the gate mark to each portal, or
  // joining the band another gate already runs to that portal.
  for (const G of gates) {
    for (const [id, mk] of G.marks) {
      const li = lineIds.indexOf(id);
      const group = `${id}|${G.e}`;
      for (const t of G.targets) {
        if (t.st.line.id !== id || t.band < 0 || getReach(group).has(t.k)) continue;
        const starts = getCells(group).length ? branches(group, () => true) : [{ c: mk.root, d: G.inDir, cost: 0 }];
        const goal = (c: number, d: number) =>
          (c === t.band && arrives(t, d)) ||
          (g.own[c] === li && g.path[c] >= 0 && paths[g.path[c]].target === t.k && paths[g.path[c]].group !== group && g.straight(c) && bit(d) !== g.ax[c]);
        const route = (strict = true) => search(g, li, bandPass(li), starts, goal, g.x(t.band), g.z(t.band), strict);
        const ids = route() ?? ((loose = true), route()) ?? route(false);
        loose = false;
        if (!ids) continue;
        const first = getCells(group).length === 0;
        const last = ids[ids.length - 1] >> 2;
        const joined = g.own[last] === li;
        record(ids, li, group, t.k, first ? [mk.edge, mk.z] : null, joined ? null : tp(t, HEAD[1], t.bandV));
        getReach(group).add(t.k);
      }
    }
  }

  // Tactile paths in the paid area, gate by gate: a tree from the gate to each portal it leads to,
  // which may instead join another gate's tree (the network is one; you can walk it either way).
  // Laid after the bands: it may cross them, where they may not run alongside each other.
  for (const G of gates) {
    if (G.tacIn < 0) continue;
    const own = `T${G.e}`;
    for (const t of G.targets) {
      if (t.tac < 0) continue;
      const me = find(own);
      if (getReach(me).has(t.k)) continue;
      const starts = getCells(me).length ? branches(me, () => true) : [{ c: G.tacIn, d: G.inDir, cost: 0 }];
      const goal = (c: number, d: number) =>
        (c === t.tac && arrives(t, d, true)) ||
        (g.own[c] === TACT && find(groupOf(c)) !== me && getReach(find(groupOf(c))).has(t.k) && g.straight(c) && bit(d) !== g.ax[c]);
      const route = (strict = true) => search(g, TACT, tacPass, starts, goal, g.x(t.tac), g.z(t.tac), strict);
      const ids = route() ?? ((loose = true), route()) ?? route(false);
      loose = false;
      if (!ids) continue;
      const last = ids[ids.length - 1] >> 2;
      const joined = g.own[last] === TACT ? find(groupOf(last)) : null;
      record(ids, TACT, me, t.k, null, joined ? null : tp(t, STRIP[1], t.tacV));
      getReach(me).add(t.k);
      if (joined && joined !== me) {
        parent.set(joined, me);
        for (const k of getReach(joined)) getReach(me).add(k);
        getCells(me).push(...getCells(joined));
      }
    }
  }

  // Tactile paths in each unpaid hall: from every exit doorway to the lane through the gates.
  for (const G of gates) {
    if (G.tacOut < 0) continue;
    const own = `U${G.e}`;
    for (const door of i.exits.filter((d) => d.end === G.e)) {
      const mid = (door.x0 + door.x1) / 2, x = snapC(mid);
      if (Math.abs(x - mid) > (door.x1 - door.x0) / 2 - 0.5) continue;
      let src = -1;
      for (let m = 0; m < 6 && src < 0; m++) {
        const z = door.s > 0 ? C0 + Math.floor((door.s * cw - C0) / P - 1e-9 - m) * P : C0 + Math.ceil((door.s * cw - C0) / P + 1e-9 + m) * P;
        const c = g.at(x, z);
        if (c >= 0 && Math.abs(g.z(c) - z) < 1e-6 && tacOk(c) && g.own[c] === -1) src = c;
      }
      if (src < 0) continue;
      const din = door.s > 0 ? 3 : 2;
      const goal = (c: number, d: number) => (c === G.tacOut && d === G.toGate) || (g.own[c] === TACT && groupOf(c) === own && g.straight(c) && bit(d) !== g.ax[c]);
      const go = (strict: boolean) => search(g, TACT, tacPass, [{ c: src, d: din, cost: 0 }], goal, g.x(G.tacOut), g.z(G.tacOut), strict);
      const ids = go(true) ?? go(false);
      if (!ids) continue;
      // From the doorway, or from just past anything low in it (a kerb along the wall).
      let z0 = door.s * cw;
      const lane: Rect = rectOf(x - TAC, z0, x + TAC, g.z(src));
      for (const s of solids) if (overlaps(s, lane)) z0 = door.s > 0 ? Math.min(z0, s[1] - 0.02) : Math.max(z0, s[3] + 0.02);
      record(ids, TACT, own, -1, [x, z0], null);
    }
  }

  // ── Bands: runs with their corners filled, broken where they cross another band ──
  const bandRuns = new Map<number, { col: Run[]; edge: Run[] }>();
  const heads: { li: number; t: Target }[] = [];
  const centre = (c: number): V2 => [g.x(c), g.z(c)];
  for (const p of paths) {
    if (p.owner === TACT) continue;
    const runs = bandRuns.get(p.owner) ?? bandRuns.set(p.owner, { col: [], edge: [] }).get(p.owner)!;
    const n = p.ids.length;
    // Vertices: the start, every corner, the end.
    const pts: { at: V2; corner: boolean }[] = [{ at: p.start ?? centre(p.ids[0] >> 2), corner: false }];
    for (let k = 0; k < n - 1; k++) if ((p.ids[k + 1] & 3) !== (p.ids[k] & 3)) pts.push({ at: centre(p.ids[k] >> 2), corner: true });
    if (p.end) {
      const [lx, lz] = centre(p.ids[n - 1] >> 2);
      if (dirOf([p.end[0] - lx, p.end[1] - lz]) !== (p.ids[n - 1] & 3)) pts.push({ at: [lx, lz], corner: true });
    }
    pts.push({ at: p.end ?? centre(p.ids[n - 1] >> 2), corner: false });
    const gaps = p.ids.map((id) => id >> 2).filter((c) => g.own[c] !== p.owner && g.own[c] !== TACT && g.own[c] !== -1);
    for (let k = 0; k + 1 < pts.length; k++) {
      const A = pts[k], B = pts[k + 1];
      const ax: 'x' | 'z' = Math.abs(B.at[0] - A.at[0]) >= Math.abs(B.at[1] - A.at[1]) ? 'x' : 'z';
      const ua = ax === 'x' ? A.at[0] : A.at[1], ub = ax === 'x' ? B.at[0] : B.at[1], v = ax === 'x' ? A.at[1] : A.at[0];
      const lo = Math.min(ua, ub), hi = Math.max(ua, ub);
      const eLo = (ua < ub ? A : B).corner, eHi = (ua < ub ? B : A).corner;
      const cuts: Rect[] = gaps.map((c) => grow([g.x(c), g.z(c), g.x(c), g.z(c)], EDGED + 0.06));
      for (const [ext, list] of [[BAND, runs.col], [EDGED, runs.edge]] as const) {
        const r: Run = { ax, v, a: lo - (eLo ? ext : 0), c: hi + (eHi ? ext : 0) };
        list.push(...cutRun(r, cuts));
      }
    }
    if (p.end && p.target >= 0) heads.push({ li: p.owner, t: targets[p.target] });
  }
  for (const [li, runs] of bandRuns) {
    const mat = `paint:${lineOf(lineIds[li]).color}`;
    for (const r of mergeRuns(runs.edge)) {
      const q = runRect(r, EDGED);
      decoRect(b, WHITE, q, cf + Y_BAND0, cf + Y_EDGE1);
      claims.push(q);
    }
    for (const r of mergeRuns(runs.col)) decoRect(b, mat, runRect(r, BAND), cf + Y_BAND0, cf + Y_BAND1);
  }
  // Arrowheads: stepped, from the end of the band to just short of the warning blocks.
  for (const { li, t } of heads) {
    const mat = `paint:${lineOf(lineIds[li]).color}`;
    const steps = 5, len = (HEAD[1] - HEAD[0]) / steps;
    for (let s = 0; s < steps; s++) {
      const hw = 0.33 - s * 0.065;
      const a = HEAD[1] - s * len, c = HEAD[1] - (s + 1) * len;
      const [x0, z0] = tp(t, a, t.bandV - hw), [x1, z1] = tp(t, c, t.bandV + hw);
      decoRect(b, mat, rectOf(x0, z0, x1, z1), cf + Y_BAND0, cf + Y_BAND1);
    }
    const [x0, z0] = tp(t, HEAD[1], t.bandV - 0.33), [x1, z1] = tp(t, HEAD[0], t.bandV + 0.33);
    claims.push(rectOf(x0, z0, x1, z1));
  }

  // ── Tactile: runs between nodes, warning blocks at nodes, across each stair head ──
  const tacRuns: Run[] = [];
  const squares: Rect[] = [];
  const sqAt = (x: number, z: number): Rect => [x - SQ, z - SQ, x + SQ, z + SQ];
  const tacEnds: Target[] = [];
  for (const p of paths) {
    if (p.owner !== TACT) continue;
    const cs = p.ids.map((id) => id >> 2);
    const pts: V2[] = [p.start ?? centre(cs[0]), ...cs.map(centre), ...(p.end ? [p.end] : [])];
    for (let k = 0; k + 1 < pts.length; k++) {
      const [A, B] = [pts[k], pts[k + 1]];
      const ax: 'x' | 'z' = Math.abs(B[0] - A[0]) >= Math.abs(B[1] - A[1]) ? 'x' : 'z';
      const ua = ax === 'x' ? A[0] : A[1], ub = ax === 'x' ? B[0] : B[1];
      tacRuns.push({ ax, v: ax === 'x' ? A[1] : A[0], a: Math.min(ua, ub), c: Math.max(ua, ub) });
    }
    if (p.end && p.target >= 0) tacEnds.push(targets[p.target]);
  }
  for (let c = 0; c < g.own.length; c++) if (g.own[c] === TACT && g.ax[c] === 3) squares.push(sqAt(g.x(c), g.z(c)));
  for (const G of gates) {
    if (G.tacIn < 0) continue;
    const hasPaid = paths.some((p) => p.owner === TACT && p.ids.some((id) => id >> 2 === G.tacIn));
    const hasUnpaid = paths.some((p) => p.owner === TACT && p.ids.some((id) => id >> 2 === G.tacOut));
    if (!hasPaid && !hasUnpaid) continue;
    const [a, c] = [hasPaid ? g.x(G.tacIn) : G.xi, hasUnpaid ? g.x(G.tacOut) : G.xo].sort((p, q) => p - q);
    tacRuns.push({ ax: 'x', v: G.zt, a, c });
    squares.push(sqAt(G.xi, G.zt), sqAt(G.xo, G.zt));
  }
  const tacRects: Rect[] = [];
  for (const r of mergeRuns(tacRuns)) {
    for (const piece of cutRun(r, squares)) {
      const q = tacRun(b, cf, piece);
      if (q) tacRects.push(q);
    }
  }
  for (const q of squares) tacRects.push(dots(b, cf, q));
  for (const t of new Set(tacEnds)) {
    const [x0, z0] = tp(t, STRIP[0], t.av - t.half), [x1, z1] = tp(t, STRIP[1], t.av + t.half);
    tacRects.push(dots(b, cf, rectOf(x0, z0, x1, z1)));
  }
  claims.push(...tacRects);

  // ── Floor marks ──
  const marks: Rect[] = [];
  const free = (r: Rect) => !marks.some((m) => overlaps(m, r)) && !tacRects.some((q) => overlaps(q, r));
  const reached = (t: Target) => paths.some((p) => p.owner !== TACT && p.target === t.k);
  const contentFor = (t: Target, arrow: Arrow = 'up') => stairMark(t.st.line, t.st.kind, t.st.platforms, arrow);
  // At each portal, on its band.
  for (const t of targets) {
    if (t.band < 0 || !reached(t)) continue;
    const [x, z] = tp(t, MARK_AT, t.bandV);
    const top = vecOf(t.arr);
    const w = Math.abs(t.tacV - t.bandV) < 2 * P - 1e-6 ? 2 * (P - TAC) - 0.02 : MARK_W;
    if (t.reserve < APPR) {
      // Not kept for it: only where nothing else runs and nothing stands.
      const r: Rect = Math.abs(top[0]) > 0.5 ? [x - MARK_H / 2, z - w / 2, x + MARK_H / 2, z + w / 2] : [x - w / 2, z - MARK_H / 2, x + w / 2, z + MARK_H / 2];
      let clash = !free(grow(r, 0.03)) || solidIn(grow(r, 0.05));
      g.each(grow(r, BAND), (c) => {
        if (g.own[c] !== -1 && g.own[c] !== lineIds.indexOf(t.st.line.id)) clash = true;
      });
      if (clash) continue;
    }
    marks.push(decal(b, contentFor(t), x, cf, z, w, MARK_H, top));
  }
  // Inside each gate line: the line and every platform (or transfer) its band leads to from here.
  for (const G of gates) {
    for (const [id, mk] of G.marks) {
      const li = lineIds.indexOf(id);
      if (!paths.some((p) => p.owner === li && p.group === `${id}|${G.e}`)) continue;
      const ts = G.targets.filter((t) => t.st.line.id === id && reached(t));
      if (!ts.length) continue;
      const nums = [...new Set(ts.flatMap((t) => t.st.platforms))];
      const kind = ts.every((t) => t.st.kind === 'transfer') ? 'transfer' : 'platform';
      marks.push(decal(b, stairMark(lineOf(id), kind, nums), mk.x, cf, mk.z, MARK_W, MARK_H, vecOf(G.inDir)));
    }
  }
  // In front of each room mouth a band passes through: on the band, before it goes in.
  const atMouth = new Set<string>();
  const markOn = (p: PathRec, from: number, step: number, stop: number, li: number): boolean => {
    for (let k = from; step > 0 ? k <= stop : k >= stop; k += step) {
      const run = [k - 1, k, k + 1];
      if (run.some((q) => q < 0 || q >= p.ids.length)) continue;
      const cs = run.map((q) => p.ids[q] >> 2), ds = run.map((q) => p.ids[q] & 3);
      if (ds.some((d) => d !== ds[1]) || (k + 2 < p.ids.length && (p.ids[k + 2] & 3) !== ds[1])) continue;
      if (cs.some((c) => g.own[c] !== li || g.crossed[c] || !g.straight(c))) continue;
      const [x, z] = centre(cs[1]);
      const top = vecOf(ds[1]);
      const r: Rect = Math.abs(top[0]) > 0.5 ? [x - MARK_H / 2, z - MARK_W / 2, x + MARK_H / 2, z + MARK_W / 2] : [x - MARK_W / 2, z - MARK_H / 2, x + MARK_W / 2, z + MARK_H / 2];
      if (!free(grow(r, 0.03))) continue;
      let clash = false;
      g.each(grow(r, BAND), (c) => {
        if (g.own[c] !== -1 && g.own[c] !== li) clash = true;
      });
      if (clash) continue;
      const t = targets[p.target];
      marks.push(decal(b, contentFor(t), x, cf, z, MARK_W, MARK_H, top));
      return true;
    }
    return false;
  };
  for (const p of paths) {
    if (p.owner === TACT || p.target < 0) continue;
    let prev = areaAt(...centre(p.ids[0] >> 2));
    for (let k = 1; k < p.ids.length; k++) {
      const a = areaAt(...centre(p.ids[k] >> 2));
      if (a < 0 || a === prev) continue;
      const key = `${p.owner}|${Math.min(a, prev)}|${Math.max(a, prev)}`;
      if (prev >= 0 && !atMouth.has(key) && (markOn(p, k - 2, -1, Math.max(1, k - 8), p.owner) || markOn(p, k + 1, 1, Math.min(p.ids.length - 2, k + 7), p.owner))) atMouth.add(key);
      prev = a;
    }
  }
  // Badges along each band: at every turn, and at least every 9 m.
  for (const p of paths) {
    if (p.owner === TACT) continue;
    const line = lineOf(lineIds[p.owner]);
    let run = p.start ? 0 : BADGE_EVERY / 2;
    for (let k = 1; k < p.ids.length; k++) {
      const c = p.ids[k] >> 2, d = p.ids[k] & 3;
      const nd = k + 1 < p.ids.length ? p.ids[k + 1] & 3 : d;
      run += P;
      const turn = nd !== d;
      if (!turn && run < BADGE_EVERY) continue;
      if (g.own[c] !== p.owner || g.crossed[c] || (!turn && !g.straight(c))) continue;
      const [x, z] = centre(c);
      const r: Rect = [x - BADGE / 2, z - BADGE / 2, x + BADGE / 2, z + BADGE / 2];
      if (!free(grow(r, 0.02))) continue;
      marks.push(decal(b, { k: 'floormark', line: line.id, arrow: 'up' }, x, cf, z, BADGE, BADGE, vecOf(nd)));
      run = 0;
    }
  }
  claims.push(...marks);
  return claims;
}

// ── Exits ───────────────────────────────────────────────────────────────────────────────────

/** Tactile path along one exit corridor and lobby, to the foot of its stair. */
export function floorExit(e: ExitInfo): void {
  const { b, cf, ext } = e;
  // The lane the concourse's path comes in on: the station grid's, nearest mid-corridor.
  const along = b.dir([1, 0])[0];
  if (Math.abs(along) < 0.5) return;
  const sx = b.pt(-2, 0, 0)[0];
  const xc = -2 + (snapC(sx) - sx) * along;
  if (xc < -3.4 || xc > -0.9) return;
  // Along the corridor and into the lobby, then across to the stair (z ext + 1.2 … ext + 4.0).
  const zr = ext + 2.6;
  // Start past anything low across the doorway (a kerb left by the hall below).
  let z0 = 0;
  for (const p of b.out.boxes) {
    if (!p.solid || p.max[1] <= cf + 0.05 || p.min[1] >= cf + 1.6) continue;
    for (let z = z0; z < 1; z += 0.05) {
      const q = b.pt(xc, 0, z + 0.025);
      if (q[0] > p.min[0] && q[0] < p.max[0] && q[2] > p.min[2] && q[2] < p.max[2]) z0 = z + 0.07;
    }
  }
  tacRun(b, cf, { ax: 'z', v: xc, a: z0, c: zr - SQ });
  dots(b, cf, [xc - SQ, zr - SQ, xc + SQ, zr + SQ]);
  tacRun(b, cf, { ax: 'x', v: zr, a: xc + SQ, c: -STRIP[1] });
  dots(b, cf, [-STRIP[1], ext + 1.2, -STRIP[0], ext + 4.0]);
}

// ── Transfer passages ───────────────────────────────────────────────────────────────────────

/** Line band, tactile path and arrows along one transfer passage. */
export function floorPassage(p: PassageInfo, c: PassageCtx): void {
  const { b, pf, zc0, zc1, other, station } = p;
  const nb = b.out.boxes.length, ns = b.out.signs.length;
  try {
    // Lanes: the tactile path in front of the stairs up (z zc0 + 0.2 … 2.1), the band in front of
    // the escalator beside them. The stairs down (x −1.7 … 0.1) and their escalator (0.3 … 1.7)
    // open in the zc1 wall at x −1.86 … 1.86, going down towards +z.
    const zt = zc0 + 1.15, zb = zc0 + 2.2, xt = -0.8, xb = 0.75, up = 4;
    // Tactile: along the passage from the stairs up, a branch to each platform doorway and one to the stairs down.
    const cols = c.doorways.map(([g0, g1]) => (xt > g0 + 0.5 && xt < g1 - 0.5 ? xt : (g0 + g1) / 2));
    const nodes = [...new Set([xt, ...cols])].sort((a, q) => a - q);
    const runs: Run[] = [{ ax: 'x', v: zt, a: nodes[0], c: up - STRIP[1] }];
    const sq: Rect[] = nodes.map((x) => [x - SQ, zt - SQ, x + SQ, zt + SQ]);
    for (const x of cols) runs.push({ ax: 'z', v: x, a: zc0, c: zt });
    runs.push({ ax: 'z', v: xt, a: zt, c: zc1 - STRIP[1] });
    for (const r of runs) for (const piece of cutRun(r, sq)) tacRun(b, pf, piece);
    for (const q of sq) dots(b, pf, q);
    dots(b, pf, [up - STRIP[1], zc0 + 0.2, up - STRIP[0], zc0 + 2.1]);
    dots(b, pf, [-1.86, zc1 - STRIP[1], 1.86, zc1 - STRIP[0]]);

    // The band, in the colour of the line the passage leads to: from the foot of the stairs up to
    // the stairs down, with its arrowhead.
    const mat = `paint:${other.color}`;
    const seg = (r: Run, e0: boolean, e1: boolean) => {
      decoRect(b, WHITE, runRect({ ...r, a: r.a - (e0 ? EDGED : 0), c: r.c + (e1 ? EDGED : 0) }, EDGED), pf + Y_BAND0, pf + Y_EDGE1);
      decoRect(b, mat, runRect({ ...r, a: r.a - (e0 ? BAND : 0), c: r.c + (e1 ? BAND : 0) }, BAND), pf + Y_BAND0, pf + Y_BAND1);
    };
    seg({ ax: 'x', v: zb, a: xb, c: up - 0.7 }, true, false);
    seg({ ax: 'z', v: xb, a: zb, c: zc1 - HEAD[1] }, true, false);
    const steps = 5, len = (HEAD[1] - HEAD[0]) / steps;
    for (let s = 0; s < steps; s++) {
      const hw = 0.33 - s * 0.065;
      decoRect(b, mat, [xb - hw, zc1 - HEAD[1] + s * len, xb + hw, zc1 - HEAD[1] + (s + 1) * len], pf + Y_BAND0, pf + Y_BAND1);
    }
    // Marks: before the stairs down, and at each doorway in from the platform (pointing at them).
    const nums = station.platforms[other.id] ?? [];
    decal(b, stairMark(other, 'transfer', nums), xb, pf, zc1 - MARK_AT, MARK_W, MARK_H, [0, 1]);
    c.doorways.forEach(([g0, g1], k) => {
      const x = cols[k];
      // Beside the tactile branch, on the side towards the stairs down if the doorway has room there.
      const sides = [Math.sign(xt - x) || 1, -(Math.sign(xt - x) || 1)];
      for (const s of sides) {
        const mx = x + s * (TAC + 0.15 + MARK_W / 2);
        if (mx - MARK_W / 2 < g0 + 0.1 || mx + MARK_W / 2 > g1 - 0.1) continue;
        if (nodes.some((n) => Math.abs(n - mx) < SQ + MARK_W / 2 + 0.05 && n !== x) && mx + MARK_W / 2 > xt - SQ && mx - MARK_W / 2 < xt + SQ) continue;
        const depth = zt - SQ - 0.05 - (zc0 + 0.1);
        decal(b, stairMark(other, 'transfer', nums, arrowOn(b, [0, 1], [Math.sign(xt - mx) || 1, 0])), mx, pf, zc0 + 0.1 + depth / 2, MARK_W, depth, [0, 1]);
        break;
      }
    });
  } catch {
    b.out.boxes.length = nb;
    b.out.signs.length = ns;
  }
}
