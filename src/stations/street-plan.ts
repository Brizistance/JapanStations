// A rebuilt station's street as a table, and the checks run against what is really built
// (docs/station-playbook.md "Street-rule tests"). The table is the plan the owner agreed to: the
// street file builds from it, street-rules.test.ts holds the build to it, and the dev command
// __sim.plan(id) (src/dev/plan.ts) draws both from above.
//
// Station frame throughout: +x east along the primary line, +z south. Not imported by any station
// module (it reads the built worlds): only by the tests and the dev tools.

import { modelSize } from '../render/city-plan';
import type { Build, ModelPart, Plot } from '../world/builder';
import { plotNorth } from '../world/builder';
import { GROUND_Y } from './kit';
import { WATA_PLOT, WATA_STAGE, WATA_STREETS, WATA_RESERVED } from './wata-plan';
import { UMIBE_PLOT, UMIBE_STAGE, UMIBE_STREETS, UMIBE_RESERVED } from './umibe-plan';
import { SHINSHIO_PLOT, SHINSHIO_STAGE, SHINSHIO_STREETS, SHINSHIO_RESERVED } from './shinshio-plan';
import { MC_PLOT, MC_STAGE, MC_STREETS, MC_RESERVED } from './minatocenter-plan';
import { SHIOMI_PLOT, SHIOMI_STAGE, SHIOMI_STREETS, SHIOMI_RESERVED } from './shiomi-plan';

export type Rect = [number, number, number, number];

/** One straight street right across the plot. */
export interface StreetLine {
  ja: string;
  en: string;
  /** 'x': it runs east–west along z = c. 'z': north–south along x = c. */
  axis: 'x' | 'z';
  c: number;
  /** Half the width between kerbs (or between the painted side lines). */
  half: number;
  /** Half the width of a built-up middle strip that splits the carriageway in two (the avenue's, under the expressway). */
  mid?: number;
  /** Width of each raised pavement; 0 for a small street with painted side strips. */
  pave: number;
  /** Traffic lanes in all. 0: nobody drives it. */
  lanes: number;
  /** Where the street stops short of the plot's edges (a T junction): from a0 (default the near edge) to a1 (default the far one). */
  a0?: number;
  a1?: number;
}

export interface StreetPlan {
  /** 1: the station only (bare ground). 2: streets and landmarks, other lots bare. 3: filled. Checks that need more than is built wait for their stage. */
  stage: 1 | 2 | 3;
  plot: Plot;
  streets: StreetLine[];
  /** Ground that is meant to stay free of buildings (lanes, yards, precincts, a reserved strip), with what it is. */
  reserved: { r: Rect; en: string }[];
  /** Models that stand over other things on purpose (`kind/id`): a deck, its piers. Left out of the overlap checks. */
  overhead: string[];
  /** Buildings and lots you walk into (`kind/id`): an exit may rise inside one, and its doorways, yard or precinct are not walls. */
  walkIn: string[];
}

export const STREET_PLANS: Record<string, StreetPlan> = {
  watayamachi: {
    stage: WATA_STAGE, plot: WATA_PLOT, streets: WATA_STREETS, reserved: WATA_RESERVED,
    overhead: [], walkIn: ['watacentre/hall_e', 'watacentre/hall_w', 'wata/court', 'wata/yashiro', 'wata/tonya'],
  },
  'umibe-shiyakusho-mae': {
    stage: UMIBE_STAGE, plot: UMIBE_PLOT, streets: UMIBE_STREETS, reserved: UMIBE_RESERVED,
    overhead: [], walkIn: ['umibe/shiyakusho', 'umibe/renga'],
  },
  shinshio: {
    stage: SHINSHIO_STAGE, plot: SHINSHIO_PLOT, streets: SHINSHIO_STREETS, reserved: SHINSHIO_RESERVED,
    overhead: [], walkIn: ['shinshio/ichiba', 'shinshio/terminal', 'shinshio/jinja'],
  },
  'minato-center': {
    stage: MC_STAGE, plot: MC_PLOT, streets: MC_STREETS, reserved: MC_RESERVED,
    overhead: [], walkIn: ['mcenter/wheel', 'mcenter/tower'],
  },
  shiomi: {
    stage: SHIOMI_STAGE, plot: SHIOMI_PLOT, streets: SHIOMI_STREETS, reserved: SHIOMI_RESERVED,
    overhead: [], walkIn: [],
  },
};

const GY = GROUND_Y;
const hit = (a: Rect, b: Rect, m = 0) => a[0] < b[2] - m && a[2] > b[0] + m && a[1] < b[3] - m && a[3] > b[1] + m;
const inside = (a: Rect, b: Rect, m = 0) => a[0] >= b[0] - m && a[2] <= b[2] + m && a[1] >= b[1] - m && a[3] <= b[3] + m;
const fmt = (r: Rect) => `[${r.map((v) => v.toFixed(1)).join(', ')}]`;

/** The plot as a rectangle. */
export const plotRect = (p: Plot): Rect => [-p.x, -plotNorth(p), p.x, p.z];

/** Where a street runs along its own axis: the plot's edges, or its own ends where it stops at a T. */
export function streetSpan(p: StreetPlan, s: StreetLine): [number, number] {
  const r = plotRect(p.plot);
  return s.axis === 'x' ? [s.a0 ?? r[0], s.a1 ?? r[2]] : [s.a0 ?? r[1], s.a1 ?? r[3]];
}

/** A street's carriageways and pavements, clipped to the plot. */
export function streetRects(p: StreetPlan, s: StreetLine): { road: Rect[]; pave: Rect[] } {
  const [X0, Z0, X1, Z1] = plotRect(p.plot);
  const [u0, u1] = streetSpan(p, s);
  const band = (a: number, e: number): Rect => (s.axis === 'x' ? [u0, s.c + a, u1, s.c + e] : [s.c + a, u0, s.c + e, u1]);
  void [X0, Z0, X1, Z1];
  const road = s.mid ? [band(-s.half, -s.mid), band(s.mid, s.half)] : [band(-s.half, s.half)];
  const pave = s.pave ? [band(-s.half - s.pave, -s.half), band(s.half, s.half + s.pave)] : [];
  return { road, pave };
}

export interface Footprint { key: string; m: ModelPart; r: Rect; h: number }

/** The ground each building model stands on (its frontage's middle at `pos`, w wide, d deep behind it), as a box round it. */
export function footprints(build: Build): Footprint[] {
  const out: Footprint[] = [];
  for (const m of build.models) {
    const a = modelSize(m.kind, m.id);
    if (!a) continue;
    const c = Math.cos(m.yaw), s = Math.sin(m.yaw);
    const xs: number[] = [], zs: number[] = [];
    for (const [lx, lz] of [[-a.w / 2, 0], [a.w / 2, 0], [a.w / 2, a.d], [-a.w / 2, a.d]]) {
      xs.push(m.pos[0] + lx * c + lz * s);
      zs.push(m.pos[2] - lx * s + lz * c);
    }
    out.push({ key: `${m.kind}/${m.id}`, m, r: [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)], h: a.h });
  }
  return out;
}

/** Is the point, a metre above the street, inside something solid? */
const solidAt = (build: Build, x: number, z: number) =>
  build.boxes.some((b) => b.solid && b.min[1] < GY + 1 && b.max[1] > GY + 1 && x > b.min[0] && x < b.max[0] && z > b.min[2] && z < b.max[2]);

/** The exits' wells in the street, each with its number where an `Exit n` zone names it. */
export function exitHoles(build: Build): { r: Rect; num: string }[] {
  return build.holes.map((h) => {
    const z = build.zones.find((q) => /^Exit \d+$/.test(q.en) && q.min[0] < h[2] && q.max[0] > h[0] && q.min[2] < h[3] && q.max[2] > h[1]);
    return { r: [h[0], h[1], h[2], h[3]] as Rect, num: z ? z.en.slice(5) : '' };
  });
}

/** Every broken rule, as a plain sentence. Empty: the build keeps to its plan as far as its stage goes. */
export function streetProblems(id: string, p: StreetPlan, build: Build): string[] {
  const out: string[] = [];
  const plot = plotRect(p.plot);
  const fps = footprints(build).filter((f) => hit(f.r, plot));
  const ground = fps.filter((f) => !p.overhead.includes(f.key));
  const roads = p.streets.flatMap((s) => streetRects(p, s).road.map((r) => ({ s, r })));
  const paves = p.streets.flatMap((s) => streetRects(p, s).pave);
  const holes = exitHoles(build);

  // 1. No building on another.
  for (let i = 0; i < ground.length; i++) for (let j = i + 1; j < ground.length; j++) {
    if (hit(ground[i].r, ground[j].r, 0.3)) out.push(`${ground[i].key} at ${fmt(ground[i].r)} stands on ${ground[j].key} at ${fmt(ground[j].r)}`);
  }
  // 2. No building on a carriageway.
  for (const f of ground) for (const { s, r } of roads) if (hit(f.r, r, 0.3)) out.push(`${f.key} at ${fmt(f.r)} stands on the carriageway of ${s.en}`);
  // 3. No building on an exit, unless the exit rises inside it.
  for (const f of ground) for (const h of holes) {
    if (hit(f.r, h.r, 0.05) && !(p.walkIn.includes(f.key) && inside(h.r, f.r))) out.push(`${f.key} at ${fmt(f.r)} stands on exit ${h.num} at ${fmt(h.r)}`);
  }
  // 4. Every building has a collider: most of the way round its walls there is something solid.
  for (const f of ground) {
    const [x0, z0, x1, z1] = f.r, pts: [number, number][] = [];
    for (let k = 1; k < 8; k++) {
      const u = k / 8;
      pts.push([x0 + (x1 - x0) * u, z0 + 0.15], [x0 + (x1 - x0) * u, z1 - 0.15], [x0 + 0.15, z0 + (z1 - z0) * u], [x1 - 0.15, z0 + (z1 - z0) * u]);
    }
    const share = pts.filter(([x, z]) => solidAt(build, x, z)).length / pts.length;
    // (A building you walk into, or a lot with an open yard or precinct, is fenced rather than walled.)
    if (share < (p.walkIn.includes(f.key) ? 0.25 : 0.6)) out.push(`${f.key} at ${fmt(f.r)} has no collider round ${Math.round((1 - share) * 100)}% of its walls`);
  }
  // 5. Every exit rises in a pavement, or inside a building you walk into.
  for (const h of holes) {
    const ok = paves.some((r) => inside(h.r, r, 0.3)) || ground.some((f) => p.walkIn.includes(f.key) && inside(h.r, f.r));
    if (!ok) out.push(`exit ${h.num || '?'} at ${fmt(h.r)} rises in no pavement and in no walk-in building`);
  }
  // 6. Nothing but ground in what the plan keeps free.
  for (const f of ground) for (const q of p.reserved) if (hit(f.r, q.r, 0.3)) out.push(`${f.key} at ${fmt(f.r)} stands in ${q.en}`);
  if (p.stage < 2) return out;

  // ── From stage 2: the streets themselves ──
  const top = (x: number, z: number) => {
    let best: { y: number; mat: string } | null = null;
    for (const b of build.boxes) {
      if (b.mat === 'none' || b.max[1] > GY + 0.05 || b.max[1] < -0.1) continue;
      if (x > b.min[0] && x < b.max[0] && z > b.min[2] && z < b.max[2] && (!best || b.max[1] > best.y)) best = { y: b.max[1], mat: b.mat };
    }
    return best;
  };
  const lamps = build.models.filter((m) => /lamp|light/.test(m.id));
  for (const s of p.streets) {
    const [a0, a1] = streetSpan(p, s);
    const at = (u: number, off: number): [number, number] => (s.axis === 'x' ? [u, s.c + off] : [s.c + off, u]);
    const off = s.mid ? (s.mid + s.half) / 2 : 0;
    // 7. The carriageway runs to both edges of the plot.
    for (const u of [a0 + 1, a1 - 1]) {
      const t = top(...at(u, off));
      if (!t || t.y > 0.05) out.push(`${s.en} stops short of the plot's edge: no carriageway at ${at(u, off).map((v) => v.toFixed(0))}`);
    }
    // 8. A lamp at least every 30 m.
    const reach = s.half + s.pave + 2.5;
    const us = lamps.filter((m) => Math.abs((s.axis === 'x' ? m.pos[2] : m.pos[0]) - s.c) < reach).map((m) => (s.axis === 'x' ? m.pos[0] : m.pos[2])).filter((u) => u > a0 && u < a1).sort((a, b) => a - b);
    const marks = [a0, ...us, a1];
    for (let k = 1; k < marks.length; k++) if (marks[k] - marks[k - 1] > 30.5) out.push(`${s.en} has no lamp from ${marks[k - 1].toFixed(0)} to ${marks[k].toFixed(0)}`);
  }
  // 9. Where two streets with traffic cross, every lane through the junction has a stop before it.
  const driven = p.streets.filter((s) => s.lanes > 0);
  for (const a of driven.filter((s) => s.axis === 'x')) for (const c of driven.filter((s) => s.axis === 'z')) {
    const j: Rect = [c.c - c.half, a.c - a.half, c.c + c.half, a.c + a.half];
    if (!hit(j, plot)) continue;
    // (A street that stops short of the other at a T has no junction with it here.)
    const [c0, c1] = streetSpan(p, c), [e0, e1] = streetSpan(p, a);
    if (a.c <= c0 || a.c >= c1 || c.c <= e0 || c.c >= e1) continue;
    for (const l of build.lanes) {
      const dx = l.to[0] - l.from[0], dz = l.to[2] - l.from[2], len = Math.hypot(dx, dz);
      let enter = -1;
      for (let t = 0; t <= len; t += 0.5) {
        const x = l.from[0] + (dx * t) / len, z = l.from[2] + (dz * t) / len;
        if (x > j[0] && x < j[2] && z > j[1] && z < j[3]) {
          enter = t;
          break;
        }
      }
      // (A lane that starts inside the junction, at the plot's edge, still needs its stop: it is kept before the
      // lane's start and moves out with the lane's run-on past the edge.)
      if (enter < 0) continue;
      if (!l.stops.some((q) => q.at > enter - 30 && q.at < enter + 1)) out.push(`a lane crosses ${a.en} × ${c.en} at ${fmt(j)} with no stop before it`);
    }
  }
  // 10. Every named lane or place is wide enough to walk.
  for (const z of build.zones) {
    if (z.kind !== 'street' || z.max[0] - z.min[0] > 2 * p.plot.x - 1) continue;
    const w = Math.min(z.max[0] - z.min[0], z.max[2] - z.min[2]);
    if (w < 1.2) out.push(`${z.en} is ${w.toFixed(2)} m wide: too narrow to walk`);
  }
  if (p.stage < 3) return out;

  // ── Stage 3: no bare ground inside a block (a free 3 × 6 m, or 4.3 m square: over 18 m²) ──
  const W = Math.round(plot[2] - plot[0]), H = Math.round(plot[3] - plot[1]);
  const full = new Uint8Array(W * H);
  const mark = (r: Rect) => {
    for (let z = Math.max(0, Math.floor(r[1] - plot[1])); z < Math.min(H, Math.ceil(r[3] - plot[1])); z++) {
      for (let x = Math.max(0, Math.floor(r[0] - plot[0])); x < Math.min(W, Math.ceil(r[2] - plot[0])); x++) full[z * W + x] = 1;
    }
  };
  for (const s of p.streets) {
    const q = streetRects(p, s);
    [...q.road, ...q.pave].forEach(mark);
    if (s.mid) mark(s.axis === 'x' ? [plot[0], s.c - s.mid, plot[2], s.c + s.mid] : [s.c - s.mid, plot[1], s.c + s.mid, plot[3]]);
  }
  fps.forEach((f) => mark(f.r));
  p.reserved.forEach((q) => mark(q.r));
  for (const z of build.zones) if (z.kind === 'street' && z.max[0] - z.min[0] < 2 * p.plot.x - 1) mark([z.min[0] - 0.5, z.min[2] - 0.5, z.max[0] + 0.5, z.max[2] + 0.5]);
  for (const b of build.boxes) if (b.solid && b.max[1] > GY + 0.3 && b.min[1] < GY + 2) mark([b.min[0], b.min[2], b.max[0], b.max[2]]);
  const sum = new Int32Array((W + 1) * (H + 1));
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) sum[(z + 1) * (W + 1) + x + 1] = full[z * W + x] + sum[z * (W + 1) + x + 1] + sum[(z + 1) * (W + 1) + x] - sum[z * (W + 1) + x];
  const empty = (x: number, z: number, w: number, h: number) => sum[(z + h) * (W + 1) + x + w] - sum[z * (W + 1) + x + w] - sum[(z + h) * (W + 1) + x] + sum[z * (W + 1) + x] === 0;
  // (One report a neighbourhood: a free window within 12 m of one already reported is the same patch.)
  const told: [number, number][] = [];
  let bare = 0;
  for (let z = 0; z < H && bare < 12; z += 2) for (let x = 0; x < W && bare < 12; x += 2) {
    if (told.some(([tx, tz]) => Math.abs(tx - x) < 12 && Math.abs(tz - z) < 12)) continue;
    for (const [w, h] of [[3, 7], [7, 3], [5, 5]]) {
      if (x + w <= W && z + h <= H && empty(x, z, w, h)) {
        told.push([x, z]);
        out.push(`bare ground inside a block at ${fmt([plot[0] + x, plot[1] + z, plot[0] + x + w, plot[1] + z + h])}`);
        bare++;
        break;
      }
    }
  }
  void id;
  return out;
}

/**
 * Streets of two neighbouring plans that reach the edge they share must meet: the same centre line,
 * width, pavements and lanes. `at`: each station's place in the world (x, z); both frames square to
 * the world (yaw 0), which is all this handles.
 */
export function edgeProblems(a: { id: string; at: [number, number]; plan: StreetPlan }, b: { id: string; at: [number, number]; plan: StreetPlan }): string[] {
  const out: string[] = [];
  const world = (q: typeof a): Rect => {
    const r = plotRect(q.plan.plot);
    return [r[0] + q.at[0], r[1] + q.at[1], r[2] + q.at[0], r[3] + q.at[1]];
  };
  const ra = world(a), rb = world(b), GAP = 30;
  // The edge they share: a's east or west against b, or its north or south.
  const ew = (ra[2] <= rb[0] + 1 && rb[0] - ra[2] < GAP) || (rb[2] <= ra[0] + 1 && ra[0] - rb[2] < GAP);
  const ns = (ra[3] <= rb[1] + 1 && rb[1] - ra[3] < GAP) || (rb[3] <= ra[1] + 1 && ra[1] - rb[3] < GAP);
  if (!ew && !ns) return out;
  const axis = ew ? 'x' : 'z', k = ew ? 1 : 0; // streets along `axis` cross the edge; their place along it is world coordinate k
  const lo = Math.max(ra[ew ? 1 : 0], rb[ew ? 1 : 0]), hi = Math.min(ra[ew ? 3 : 2], rb[ew ? 3 : 2]);
  const reach = (q: typeof a) => q.plan.streets.filter((s) => s.axis === axis).map((s) => ({ s, w: s.c + q.at[k] })).filter(({ w }) => w > lo && w < hi);
  const sa = reach(a), sb = reach(b);
  for (const p of sa) {
    const m = sb.find((q) => Math.abs(q.w - p.w) < 0.05);
    if (!m) out.push(`${a.id}'s ${p.s.en} reaches the edge shared with ${b.id} and meets no street there`);
    else if (m.s.half !== p.s.half || m.s.pave !== p.s.pave || m.s.lanes !== p.s.lanes) out.push(`${a.id}'s ${p.s.en} and ${b.id}'s ${m.s.en} meet with different widths, pavements or lanes`);
  }
  for (const q of sb) if (!sa.some((p) => Math.abs(q.w - p.w) < 0.05)) out.push(`${b.id}'s ${q.s.en} reaches the edge shared with ${a.id} and meets no street there`);
  return out;
}
