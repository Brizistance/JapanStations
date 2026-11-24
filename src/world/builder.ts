import type { SigAxis } from '../traffic/signals';
// Builder: collects the parts that make up a station or a train car.
// Pure data, no three.js. The same part list feeds both the renderer and the collision
// world, so what you see is what you bump into.
//
// Coordinates are frame-local metres: +x along the track (increasing chainage),
// +y up, +z to the right of +x. Transforms are limited to translation, 90° turns
// about y and a z-mirror, so every box stays axis-aligned inside its frame.

import type { SignContent } from '../signs/content';

export type V3 = [number, number, number];
export type V2 = [number, number];

export interface BoxPart {
  mat: string;
  min: V3;
  max: V3;
  solid: boolean;
  /** Set on parts that are open to the sky although they sit below street level (canals, the sea). */
  open?: boolean;
  /**
   * Render-only shear for slopes (stair ceilings, cladding, handrails): every vertex is raised by
   * (its coordinate on `axis` − `from`) · k. min/max are the unsheared box. Decoration only.
   */
  slope?: { axis: 0 | 2; from: number; k: number };
}

export interface RampPart {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  /** Unit, axis-aligned direction of ascent. */
  up: V2;
  yLow: number;
  yHigh: number;
  /** Conveyor speed along `up` (escalators), m/s. */
  convey: number;
}

export interface SignPart {
  content: SignContent;
  pos: V3;
  /** Outward normal in the xz plane, or null for a floor decal facing up. */
  normal: V2 | null;
  /** For floor decals: direction of the top of the image. */
  top: V2;
  w: number;
  h: number;
  dynamic: boolean;
}

/** A sliding gate pair: platform screen door or train door. */
export interface GatePart {
  pos: V3; // centre of the opening, at floor level
  along: V2; // direction the leaves slide in
  width: number;
  height: number;
  thick: number;
  mat: string;
  /** Glazed leaf (train doors, full-height platform screens). */
  window?: boolean;
  /** What controls it. Platform gates: line/stop/track. Car doors: side (+1 = local +z). */
  line?: string;
  stop?: number;
  track?: 'down' | 'up';
  side?: 1 | -1;
}

export interface Zone {
  kind: 'concourse' | 'platform' | 'street' | 'passage';
  min: V3;
  max: V3;
  ja: string;
  en: string;
  /** Below street level but open to daylight (an atrium): keep the sky, not tunnel darkness. */
  sky?: boolean;
  /** Line id of a platform zone (picks the line's colour grade). */
  line?: string;
}

export interface Plot { x: number; z: number; north?: number }
/** How far a plot reaches north (−z) of its middle. */
export const plotNorth = (p: Plot): number => p.north ?? p.z;
/** Is a frame-local point inside a plot, or within `m` of it? */
export const inPlot = (p: Plot, lx: number, lz: number, m = 0): boolean => Math.abs(lx) < p.x + m && lz < p.z + m && lz > -plotNorth(p) - m;

/** Half extents of the walkable plot around an ordinary station, metres. */
export const DEFAULT_PLOT = { x: 130, z: 85 };

export interface MeshPart {
  mat: string;
  shape: 'cyl' | 'sphere' | 'cone';
  pos: V3; // centre
  size: V3; // full extents
  open?: boolean;
}

/** A Blender-built model placed in the scene (render/building-models.ts). Visual only. */
export interface ModelPart {
  kind: string;
  id: string;
  /** Origin: the middle of the frontage, on the ground. */
  pos: V3;
  /** Rotation about y that turns the model's front (local -z) to face the street. */
  yaw: number;
  /** Picks which set of shop names the signs carry. */
  seed: number;
  /** Drawn merged with the other such parts, one mesh per material: for many small or simple models (no shop signs). */
  merge?: boolean;
}

/** One straight traffic lane (traffic/system.ts drives vehicles along it, `from` → `to`). */
export interface LanePart {
  from: V3;
  to: V3;
  /** Speed limit, m/s. */
  speed: number;
  /** Vehicles a minute entering at the busiest hour. */
  flow: number;
  /** A bus lane takes buses, taxis and scooters only; `all` is a general lane that buses use too; `cycle` is the bicycle lane at the kerb; `minor` a small street's single lane (scooters, bicycles, kei trucks, the odd small car). */
  use: 'general' | 'bus' | 'all' | 'cycle' | 'minor';
  /** A stretch (metres from `from`) its traffic goes round, `side` metres to the right: the bicycle lane past a taxi stand. */
  avoid?: { from: number; to: number; side: number };
  /** Share of taxis among the cars (more at big stations). */
  taxi: number;
  /**
   * Signal stop lines, as metres from `from`: the stop line, the signal's road (signs/draw.ts
   * `axis`) and the far side of the junction, which must be free before a vehicle drives in.
   */
  stops: { at: number; axis: SigAxis; exit: number }[];
  /**
   * Places to pull in at the kerb, `at` metres from `from` and `side` metres to the left of the lane
   * (0: stop in the lane). A bus stop, where buses wait a while; or with `rank` a taxi stand of that
   * many places, whose front is at `at`: taxis queue there and leave one by one.
   */
  halts: { at: number; side: number; rank?: number }[];
  /** Zebra crossings without a signal: stop `at` metres from `from` while somebody on foot is inside `zone` (x0, z0, x1, z1). */
  yields?: { at: number; zone: [number, number, number, number] }[];
  /** Level crossings: stop `at` metres from `from` while that line's crossing at the station is closed. */
  gates?: { at: number; line: string; station: string }[];
  /** The lane ends inside the plot (a side street meeting a main road): everybody turns off it at its last junction. */
  dead?: boolean;
  /**
   * Ways off the lane and back onto it further along (a station's rotary): out at the first `via` point
   * and back in at the last (both on the lane), through the others, corners rounded to `r` (`rEnds` off and onto the lane), at `speed`
   * off the lane. A `share` of `who` take it; they stop with their middle at `halt` (a point on the way),
   * a taxi stand of `rank` places there, and stop short of a zebra (`yields`: a point on the way, the zone).
   */
  detours?: { via: V3[]; r: number; rEnds?: number; speed: number; who: 'bus' | 'taxi'; share: number; halt?: V3; rank?: number; yields?: { at: V3; zone: [number, number, number, number] }[] }[];
}

/** A lift's car in plan (frame x and z) and the floor heights it serves, lowest first (world/lifts.ts). */
export interface LiftPart {
  min: V2;
  max: V2;
  levels: number[];
}

export interface Build {
  boxes: BoxPart[];
  lifts: LiftPart[];
  models: ModelPart[];
  lanes: LanePart[];
  ramps: RampPart[];
  signs: SignPart[];
  gates: GatePart[];
  zones: Zone[];
  meshes: MeshPart[];
  /** Openings in the street surface, as [x0, z0, x1, z1]. */
  holes: [number, number, number, number][];
  spawn: { pos: V3; yaw: number };
  /** Half extents of the walkable plot (frame-local x and z); `north` where it reaches further to −z than to +z. */
  plot: Plot;
  /** Volumes nobody may be able to walk into (track beds, closed-off shells). Checked by the walk test. */
  keepOut: { min: V3; max: V3; en: string }[];
  /**
   * The backdrop city within `radius` of the station is Blender-built (simplified copies) instead of
   * plain blocks: low and old within `oldRadius` of the frame point `old`, business blocks beyond.
   */
  district?: { radius: number; old: [number, number]; oldRadius: number; towers?: number };
  /**
   * The only ways to see between the street and the levels below it are the openings in `holes`
   * (exit stairs and the like). The renderer then leaves out whichever of the two cannot be seen
   * from where the player is (render/world-view.ts). Set by composers for which that is true.
   */
  sealed?: boolean;
  /** Areas outside the plot (frame x0, z0, x1, z1) the backdrop city keeps off (a valley's hillsides). */
  clear?: [number, number, number, number][];
}

export interface Xf {
  rot?: 0 | 1 | 2 | 3;
  mz?: boolean;
  t?: V3;
}
interface M {
  // 2x2 integer matrix for xz plus translation.
  a: number; b: number; c: number; d: number;
  t: V3;
}
const ROT: [number, number, number, number][] = [
  [1, 0, 0, 1],
  [0, -1, 1, 0],
  [-1, 0, 0, -1],
  [0, 1, -1, 0],
];
function toM(x: Xf): M {
  const r = ROT[x.rot ?? 0];
  const s = x.mz ? -1 : 1;
  return { a: r[0], b: r[1] * s, c: r[2], d: r[3] * s, t: x.t ?? [0, 0, 0] };
}
const mul = (p: M, c: M): M => ({
  a: p.a * c.a + p.b * c.c,
  b: p.a * c.b + p.b * c.d,
  c: p.c * c.a + p.d * c.c,
  d: p.c * c.b + p.d * c.d,
  t: [p.a * c.t[0] + p.b * c.t[2] + p.t[0], c.t[1] + p.t[1], p.c * c.t[0] + p.d * c.t[2] + p.t[2]],
});

export interface SignOpts {
  /** Direction (local xz) the sign's arrow should point; resolved to left/right/up/down for the viewer. */
  arrow?: V2;
  dynamic?: boolean;
  top?: V2;
}

export class Builder {
  readonly out: Build = {
    boxes: [], ramps: [], signs: [], gates: [], zones: [], meshes: [], models: [], lanes: [], holes: [], lifts: [],
    spawn: { pos: [0, 0, 0], yaw: 0 },
    plot: { ...DEFAULT_PLOT },
    keepOut: [],
  };
  private m: M = toM({});
  private isOpen = false;
  /** Volumes that decoration must stay out of (round wayfinding signs), in builder coords. */
  private kept: { min: V3; max: V3 }[] = [];

  /** Keep this volume clear of decoration added inside a later `guard`. */
  protect(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) {
    const p = this.pt(x0, y0, z0), q = this.pt(x1, y1, z1);
    this.kept.push({
      min: [Math.min(p[0], q[0]), Math.min(p[1], q[1]), Math.min(p[2], q[2])],
      max: [Math.max(p[0], q[0]), Math.max(p[1], q[1]), Math.max(p[2], q[2])],
    });
  }

  /**
   * Run `fn`, then cut whatever decoration it added back from every protected volume: boxes
   * are trimmed to the part outside, meshes that reach in are dropped. Solid parts are left
   * alone. This is how signs stay readable whatever a station's look hangs from the ceiling.
   */
  guard(fn: () => void) {
    const nb = this.out.boxes.length, nm = this.out.meshes.length;
    fn();
    if (!this.kept.length) return;
    const hit = (a: V3, b: V3, k: { min: V3; max: V3 }) =>
      a[0] < k.max[0] && b[0] > k.min[0] && a[1] < k.max[1] && b[1] > k.min[1] && a[2] < k.max[2] && b[2] > k.min[2];
    let added = this.out.boxes.splice(nb);
    for (const k of this.kept) {
      const next: BoxPart[] = [];
      for (const part of added) {
        if (part.solid || part.mat === 'none' || !hit(part.min, part.max, k)) {
          next.push(part);
          continue;
        }
        // Slice off the pieces outside the volume, one axis at a time.
        const lo: V3 = [...part.min], hi: V3 = [...part.max];
        for (const ax of [0, 1, 2] as const) {
          if (lo[ax] < k.min[ax]) {
            const mx: V3 = [...hi];
            mx[ax] = k.min[ax];
            next.push({ ...part, min: [...lo], max: mx });
            lo[ax] = k.min[ax];
          }
          if (hi[ax] > k.max[ax]) {
            const mn: V3 = [...lo];
            mn[ax] = k.max[ax];
            next.push({ ...part, min: mn, max: [...hi] });
            hi[ax] = k.max[ax];
          }
        }
      }
      added = next;
    }
    this.out.boxes.push(...added.filter((q) => q.max[0] - q.min[0] > 1e-4 && q.max[1] - q.min[1] > 1e-4 && q.max[2] - q.min[2] > 1e-4));
    const meshes = this.out.meshes.splice(nm);
    this.out.meshes.push(...meshes.filter((q) => {
      const a: V3 = [q.pos[0] - q.size[0] / 2, q.pos[1] - q.size[1] / 2, q.pos[2] - q.size[2] / 2];
      const b: V3 = [q.pos[0] + q.size[0] / 2, q.pos[1] + q.size[1] / 2, q.pos[2] + q.size[2] / 2];
      return !this.kept.some((k) => hit(a, b, k));
    }));
  }

  private queued: { m: M; open: boolean; fn: () => void }[] = [];
  /** Run `fn` at the end of the build (finish()), in the frame that is current now. */
  later(fn: () => void) {
    this.queued.push({ m: this.m, open: this.isOpen, fn });
  }
  /** Run everything put off with later(), then hand back the build. */
  finish(): Build {
    for (let i = 0; i < this.queued.length; i++) {
      const q = this.queued[i], pm = this.m, po = this.isOpen;
      this.m = q.m;
      this.isOpen = q.open;
      q.fn();
      this.m = pm;
      this.isOpen = po;
    }
    this.queued = [];
    return this.out;
  }
  private world(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): { min: V3; max: V3 } {
    const p = this.pt(x0, y0, z0), q = this.pt(x1, y1, z1);
    return { min: [Math.min(p[0], q[0]), Math.min(p[1], q[1]), Math.min(p[2], q[2])], max: [Math.max(p[0], q[0]), Math.max(p[1], q[1]), Math.max(p[2], q[2])] };
  }
  /** Whether any solid box built so far reaches into the volume. */
  solidIn(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): boolean {
    const k = this.world(x0, y0, z0, x1, y1, z1);
    return this.out.boxes.some((q) => q.solid && [0, 1, 2].every((a) => q.min[a] < k.max[a] - 0.01 && q.max[a] > k.min[a] + 0.01));
  }
  /**
   * Cut the volume out of every box built so far, solid or not (a doorway through a finished
   * wall), and take down the signs that hung in it.
   */
  carve(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) {
    const k = this.world(x0, y0, z0, x1, y1, z1);
    const next: BoxPart[] = [];
    for (const part of this.out.boxes) {
      if (![0, 1, 2].every((a) => part.min[a] < k.max[a] && part.max[a] > k.min[a])) {
        next.push(part);
        continue;
      }
      const lo: V3 = [...part.min], hi: V3 = [...part.max];
      for (const ax of [0, 1, 2] as const) {
        if (lo[ax] < k.min[ax]) {
          const mx: V3 = [...hi];
          mx[ax] = k.min[ax];
          next.push({ ...part, min: [...lo], max: mx });
          lo[ax] = k.min[ax];
        }
        if (hi[ax] > k.max[ax]) {
          const mn: V3 = [...lo];
          mn[ax] = k.max[ax];
          next.push({ ...part, min: mn, max: [...hi] });
          hi[ax] = k.max[ax];
        }
      }
    }
    this.out.boxes = next.filter((q) => q.max[0] - q.min[0] > 1e-4 && q.max[1] - q.min[1] > 1e-4 && q.max[2] - q.min[2] > 1e-4);
    this.out.signs = this.out.signs.filter((s) => ![0, 1, 2].every((a) => s.pos[a] > k.min[a] && s.pos[a] < k.max[a]));
  }

  /** Parts added inside `fn` are daylit even below street level. */
  open(fn: () => void) {
    const prev = this.isOpen;
    this.isOpen = true;
    fn();
    this.isOpen = prev;
  }

  /** Run `fn` with an extra transform applied. */
  with(x: Xf, fn: () => void) {
    const prev = this.m;
    this.m = mul(prev, toM(x));
    fn();
    this.m = prev;
  }

  pt(x: number, y: number, z: number): V3 {
    const m = this.m;
    return [m.a * x + m.b * z + m.t[0], y + m.t[1], m.c * x + m.d * z + m.t[2]];
  }
  dir(v: V2): V2 {
    const m = this.m;
    // `+ 0` normalises -0.
    return [m.a * v[0] + m.b * v[1] + 0, m.c * v[0] + m.d * v[1] + 0];
  }

  box(mat: string, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, solid = true) {
    const p = this.pt(x0, y0, z0), q = this.pt(x1, y1, z1);
    const min: V3 = [Math.min(p[0], q[0]), Math.min(p[1], q[1]), Math.min(p[2], q[2])];
    const max: V3 = [Math.max(p[0], q[0]), Math.max(p[1], q[1]), Math.max(p[2], q[2])];
    if (max[0] - min[0] < 1e-6 || max[1] - min[1] < 1e-6 || max[2] - min[2] < 1e-6) return;
    const part: BoxPart = { mat, min, max, solid: solid && mat !== 'deco' };
    if (this.isOpen) part.open = true;
    this.out.boxes.push(part);
  }
  /** Visual only. */
  deco(mat: string, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) {
    this.box(mat, x0, y0, z0, x1, y1, z1, false);
  }
  /**
   * Visual only: a box laid on a slope, its heights given at the x0 end and rising by `rise`
   * over x0 … x1 (local x), as along a stair.
   */
  slant(mat: string, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, rise: number) {
    const n = this.out.boxes.length;
    this.box(mat, x0, y0, z0, x1, y1, z1, false);
    if (this.out.boxes.length === n || Math.abs(x1 - x0) < 1e-6) return;
    const d = this.dir([1, 0]), axis = d[0] !== 0 ? 0 : 2, s = d[0] !== 0 ? d[0] : d[1];
    this.out.boxes[n].slope = { axis, from: this.pt(x0, 0, z0)[axis], k: (rise / (x1 - x0)) * s };
  }
  /** A lift's car, x0 … x1 by z0 … z1 in the current frame, serving these floor heights. */
  lift(x0: number, z0: number, x1: number, z1: number, levels: number[]) {
    const p = this.pt(x0, 0, z0), q = this.pt(x1, 0, z1);
    this.out.lifts.push({ min: [Math.min(p[0], q[0]), Math.min(p[2], q[2])], max: [Math.max(p[0], q[0]), Math.max(p[2], q[2])], levels: levels.map((y) => this.pt(0, y, 0)[1]) });
  }
  /** Invisible collider. */
  block(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) {
    this.box('none', x0, y0, z0, x1, y1, z1, true);
  }

  ramp(x0: number, z0: number, x1: number, z1: number, yLow: number, yHigh: number, up: V2, convey = 0) {
    const p = this.pt(x0, yLow, z0), q = this.pt(x1, yHigh, z1);
    this.out.ramps.push({
      x0: Math.min(p[0], q[0]), x1: Math.max(p[0], q[0]),
      z0: Math.min(p[2], q[2]), z1: Math.max(p[2], q[2]),
      up: this.dir(up), yLow: p[1], yHigh: q[1], convey,
    });
  }

  /** A flat sign. `normal` is the direction it faces; null = floor decal. */
  sign(content: SignContent, x: number, y: number, z: number, normal: V2 | null, w: number, h: number, o: SignOpts = {}) {
    const n = normal ? this.dir(normal) : null;
    let c = content;
    if (o.arrow && n) {
      const a = this.dir(o.arrow);
      const right = a[0] * n[1] - a[1] * n[0];
      const toward = a[0] * n[0] + a[1] * n[1];
      const arrow = right > 0.5 ? 'right' : right < -0.5 ? 'left' : toward > 0.5 ? 'down' : 'up';
      c = { ...content, arrow } as SignContent;
    }
    this.out.signs.push({
      content: c, pos: this.pt(x, y, z), normal: n, top: this.dir(o.top ?? [0, -1]), w, h, dynamic: !!o.dynamic,
    });
  }

  /** Double-sided sign hanging across the x axis (faces ±x), with a thin backing box. */
  hang(content: SignContent, x: number, y: number, z: number, w: number, h: number, o: SignOpts & { ceil?: number; back?: SignContent; backArrow?: V2 } = {}) {
    this.deco('flat:#22262b', x - 0.04, y - h / 2 - 0.03, z - w / 2 - 0.03, x + 0.04, y + h / 2 + 0.03, z + w / 2 + 0.03);
    this.sign(content, x + 0.05, y, z, [1, 0], w, h, o);
    this.sign(o.back ?? content, x - 0.05, y, z, [-1, 0], w, h, { ...o, arrow: o.backArrow ?? o.arrow });
    if (o.ceil !== undefined) {
      for (const dz of [-w / 2 + 0.2, w / 2 - 0.2]) {
        this.deco('flat:#555a60', x - 0.02, y + h / 2, z + dz - 0.02, x + 0.02, o.ceil, z + dz + 0.02);
      }
    }
  }

  /**
   * Electronic board hanging across the x axis (faces ±x): a deep metal case with a black
   * bezel round each face, a hood over the top and two stout drop rods. Unlike a printed
   * sign's thin backing, it reads as a piece of equipment. `ceil` = height of the rods' top.
   */
  screen(content: SignContent, x: number, y: number, z: number, w: number, h: number, o: SignOpts & { ceil?: number; back?: SignContent } = {}) {
    const d = 0.11, rim = 0.07;
    const y0 = y - h / 2 - rim, y1 = y + h / 2 + rim, z0 = z - w / 2 - rim, z1 = z + w / 2 + rim;
    this.deco('metal:#2b2f34', x - d, y0, z0, x + d, y1, z1);
    this.deco('metal:#1c1f23', x - d - 0.09, y1, z0 - 0.03, x + d + 0.09, y1 + 0.035, z1 + 0.03);
    for (const s of [-1, 1]) this.deco('flat:#050607', x + s * d - 0.004, y - h / 2 - 0.025, z - w / 2 - 0.025, x + s * d + 0.004, y + h / 2 + 0.025, z + w / 2 + 0.025);
    this.sign(content, x + d + 0.008, y, z, [1, 0], w, h, o);
    this.sign(o.back ?? content, x - d - 0.008, y, z, [-1, 0], w, h, o);
    if (o.ceil !== undefined) {
      for (const dz of [-w / 2 + 0.35, w / 2 - 0.35]) {
        this.deco('metal:#3a3f45', x - 0.035, y1 + 0.035, z + dz - 0.035, x + 0.035, o.ceil, z + dz + 0.035);
      }
    }
  }

  gate(g: Omit<GatePart, 'pos' | 'along'> & { x: number; y: number; z: number; along: V2 }) {
    const { x, y, z, along, ...rest } = g;
    this.out.gates.push({ ...rest, pos: this.pt(x, y, z), along: this.dir(along) });
  }

  zone(kind: Zone['kind'], x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, ja: string, en: string, sky = false, line?: string) {
    const p = this.pt(x0, y0, z0), q = this.pt(x1, y1, z1);
    this.out.zones.push({
      kind, ja, en, sky, line,
      min: [Math.min(p[0], q[0]), Math.min(p[1], q[1]), Math.min(p[2], q[2])],
      max: [Math.max(p[0], q[0]), Math.max(p[1], q[1]), Math.max(p[2], q[2])],
    });
  }

  /** Declare a volume that must not be reachable on foot. */
  /** Keep the backdrop city off this area (it is the station's own scenery). */
  clearScenery(x0: number, z0: number, x1: number, z1: number) {
    const p = this.pt(x0, 0, z0), q = this.pt(x1, 0, z1);
    (this.out.clear ??= []).push([Math.min(p[0], q[0]), Math.min(p[2], q[2]), Math.max(p[0], q[0]), Math.max(p[2], q[2])]);
  }
  keepOut(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, en: string) {
    const p = this.pt(x0, y0, z0), q = this.pt(x1, y1, z1);
    this.out.keepOut.push({
      en,
      min: [Math.min(p[0], q[0]), Math.min(p[1], q[1]), Math.min(p[2], q[2])],
      max: [Math.max(p[0], q[0]), Math.max(p[1], q[1]), Math.max(p[2], q[2])],
    });
  }

  /** A Blender-built model with its front (local -z) along this frame's -z. Mirrored frames turn it, never flip it. */
  model(kind: string, id: string, x: number, y: number, z: number, seed = 0) {
    const n = this.dir([0, -1]);
    this.out.models.push({ kind, id, pos: this.pt(x, y, z), yaw: Math.atan2(-n[0], -n[1]) + 0, seed });
  }

  mesh(mat: string, shape: MeshPart['shape'], x: number, y: number, z: number, sx: number, sy: number, sz: number) {
    const r = this.dir([sx, sz]);
    const part: MeshPart = { mat, shape, pos: this.pt(x, y, z), size: [Math.abs(r[0]), sy, Math.abs(r[1])] };
    if (this.isOpen) part.open = true;
    this.out.meshes.push(part);
  }

  hole(x0: number, z0: number, x1: number, z1: number) {
    const p = this.pt(x0, 0, z0), q = this.pt(x1, 0, z1);
    this.out.holes.push([Math.min(p[0], q[0]), Math.min(p[2], q[2]), Math.max(p[0], q[0]), Math.max(p[2], q[2])]);
  }

  setSpawn(x: number, y: number, z: number, facing: V2) {
    const f = this.dir(facing);
    // Camera yaw: 0 looks down -z; positive turns left.
    this.out.spawn = { pos: this.pt(x, y, z), yaw: Math.atan2(-f[0], -f[1]) };
  }

  /**
   * A horizontal slab with rectangular holes, decomposed into boxes.
   * Holes are [x0, z0, x1, z1] in the current local coords.
   */
  slab(mat: string, x0: number, z0: number, x1: number, z1: number, y0: number, y1: number, holes: number[][], solid = true) {
    const xs = new Set<number>([x0, x1]), zs = new Set<number>([z0, z1]);
    for (const h of holes) {
      if (h[0] > x0 && h[0] < x1) xs.add(h[0]);
      if (h[2] > x0 && h[2] < x1) xs.add(h[2]);
      if (h[1] > z0 && h[1] < z1) zs.add(h[1]);
      if (h[3] > z0 && h[3] < z1) zs.add(h[3]);
    }
    const X = [...xs].sort((a, b) => a - b), Z = [...zs].sort((a, b) => a - b);
    const inHole = (cx: number, cz: number) => holes.some((h) => cx > h[0] && cx < h[2] && cz > h[1] && cz < h[3]);
    for (let j = 0; j < Z.length - 1; j++) {
      let start = -1;
      for (let i = 0; i <= X.length - 1; i++) {
        const open = i < X.length - 1 && !inHole((X[i] + X[i + 1]) / 2, (Z[j] + Z[j + 1]) / 2);
        if (open && start < 0) start = i;
        if (!open && start >= 0) {
          this.box(mat, X[start], y0, Z[j], X[i], y1, Z[j + 1], solid);
          start = -1;
        }
      }
    }
  }

  /** A wall along x (thin in z) from xa to xb, skipping the given [from, to] gaps. */
  wallX(mat: string, xa: number, xb: number, z0: number, z1: number, y0: number, y1: number, gaps: number[][] = []) {
    const g = [...gaps].sort((p, q) => p[0] - q[0]);
    let x = xa;
    for (const [from, to] of g) {
      if (from > x) this.box(mat, x, y0, z0, Math.min(from, xb), y1, z1);
      x = Math.max(x, to);
    }
    if (x < xb) this.box(mat, x, y0, z0, xb, y1, z1);
  }
}

/** Small deterministic RNG so generated streets are the same on every load. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
