// Hand-rolled character collision. No physics engine: the world is made of
// "frames" (a station, or one train car), each a rigid transform holding
// axis-aligned boxes and ramps in local coordinates. The player is a vertical
// cylinder resolved against each nearby frame in that frame's local space, which
// is what lets you stand inside a moving, turning train car without jitter.

import type { Build, BoxPart, RampPart, V3, Zone } from './builder';

export interface Pose {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
}

export interface Blocker {
  min: V3;
  max: V3;
  isOpen: () => boolean;
}

export interface ColliderSet {
  boxes: BoxPart[];
  ramps: RampPart[];
  grid: Map<number, number[]>;
}

export interface Frame extends Pose {
  id: string;
  kind: 'station' | 'car';
  colliders: ColliderSet;
  blockers: Blocker[];
  /** Bounding radius in the xz plane. */
  radius: number;
  zones: Zone[];
  /** Car interior, local AABB: a player inside is carried with the frame. */
  inside?: { min: V3; max: V3 };
  /** Pose at the previous tick (cars only). */
  prev?: Pose;
}

const CELL = 4;
const key = (ix: number, iz: number) => (ix + 2048) * 4096 + (iz + 2048);

export function makeColliders(build: Build): ColliderSet {
  const boxes = build.boxes.filter((b) => b.solid);
  const grid = new Map<number, number[]>();
  boxes.forEach((b, i) => {
    const x0 = Math.floor(b.min[0] / CELL), x1 = Math.floor(b.max[0] / CELL);
    const z0 = Math.floor(b.min[2] / CELL), z1 = Math.floor(b.max[2] / CELL);
    for (let ix = x0; ix <= x1; ix++) {
      for (let iz = z0; iz <= z1; iz++) {
        const k = key(ix, iz);
        const a = grid.get(k);
        if (a) a.push(i);
        else grid.set(k, [i]);
      }
    }
  });
  return { boxes, ramps: build.ramps, grid };
}

export function toLocal(p: Pose, w: V3, out: V3): V3 {
  const dx = w[0] - p.x, dy = w[1] - p.y, dz = w[2] - p.z;
  const c = Math.cos(p.yaw), s = Math.sin(p.yaw);
  const x1 = dx * c - dz * s, z1 = dx * s + dz * c;
  const cp = Math.cos(p.pitch), sp = Math.sin(p.pitch);
  out[0] = x1 * cp + dy * sp;
  out[1] = -x1 * sp + dy * cp;
  out[2] = z1;
  return out;
}
export function toWorld(p: Pose, l: V3, out: V3): V3 {
  const cp = Math.cos(p.pitch), sp = Math.sin(p.pitch);
  const x1 = l[0] * cp - l[1] * sp, y1 = l[0] * sp + l[1] * cp;
  const c = Math.cos(p.yaw), s = Math.sin(p.yaw);
  out[0] = p.x + x1 * c + l[2] * s;
  out[1] = p.y + y1;
  out[2] = p.z - x1 * s + l[2] * c;
  return out;
}

export function rampTop(r: RampPart, x: number, z: number): number {
  let t: number;
  if (r.up[0] !== 0) t = r.up[0] > 0 ? (x - r.x0) / (r.x1 - r.x0) : (r.x1 - x) / (r.x1 - r.x0);
  else t = r.up[1] > 0 ? (z - r.z0) / (r.z1 - r.z0) : (r.z1 - z) / (r.z1 - r.z0);
  t = Math.min(1, Math.max(0, t));
  return r.yLow + t * (r.yHigh - r.yLow);
}

export const BODY_R = 0.3;
export const BODY_H = 1.75;
const FOOT = 0.2;
const STEP = 0.36;

const seen = new Set<number>();
function nearBoxes(cs: ColliderSet, x: number, z: number, r: number, fn: (b: BoxPart) => void) {
  const x0 = Math.floor((x - r) / CELL), x1 = Math.floor((x + r) / CELL);
  const z0 = Math.floor((z - r) / CELL), z1 = Math.floor((z + r) / CELL);
  const multi = x0 !== x1 || z0 !== z1;
  if (multi) seen.clear();
  for (let ix = x0; ix <= x1; ix++) {
    for (let iz = z0; iz <= z1; iz++) {
      const a = cs.grid.get(key(ix, iz));
      if (!a) continue;
      for (const i of a) {
        if (multi) {
          if (seen.has(i)) continue;
          seen.add(i);
        }
        fn(cs.boxes[i]);
      }
    }
  }
}

/** Push a local-space cylinder out of anything solid. Mutates `l`. Returns true if moved. */
function pushOut(f: Frame, l: V3, stepH: number): boolean {
  const feet = l[1], head = l[1] + BODY_H;
  let moved = false;
  const test = (minX: number, minZ: number, maxX: number, maxZ: number) => {
    const cx = Math.min(maxX, Math.max(minX, l[0])), cz = Math.min(maxZ, Math.max(minZ, l[2]));
    const dx = l[0] - cx, dz = l[2] - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 >= BODY_R * BODY_R) return;
    if (d2 > 1e-10) {
      const d = Math.sqrt(d2), push = (BODY_R - d) / d;
      l[0] += dx * push;
      l[2] += dz * push;
    } else {
      // Centre is inside: leave by the nearest face.
      const a = l[0] - minX, b = maxX - l[0], c = l[2] - minZ, e = maxZ - l[2];
      const m = Math.min(a, b, c, e);
      if (m === a) l[0] = minX - BODY_R;
      else if (m === b) l[0] = maxX + BODY_R;
      else if (m === c) l[2] = minZ - BODY_R;
      else l[2] = maxZ + BODY_R;
    }
    moved = true;
  };
  nearBoxes(f.colliders, l[0], l[2], BODY_R, (b) => {
    if (b.max[1] <= feet + stepH || b.min[1] >= head - 0.05) return;
    test(b.min[0], b.min[2], b.max[0], b.max[2]);
  });
  for (const r of f.colliders.ramps) {
    if (l[0] < r.x0 - BODY_R || l[0] > r.x1 + BODY_R || l[2] < r.z0 - BODY_R || l[2] > r.z1 + BODY_R) continue;
    const cx = Math.min(r.x1, Math.max(r.x0, l[0])), cz = Math.min(r.z1, Math.max(r.z0, l[2]));
    if (rampTop(r, cx, cz) <= feet + stepH || r.yLow >= head) continue;
    test(r.x0, r.z0, r.x1, r.z1);
  }
  for (const k of f.blockers) {
    if (k.max[1] <= feet + stepH || k.min[1] >= head) continue;
    if (l[0] < k.min[0] - BODY_R || l[0] > k.max[0] + BODY_R || l[2] < k.min[2] - BODY_R || l[2] > k.max[2] + BODY_R) continue;
    if (k.isOpen()) continue;
    test(k.min[0], k.min[2], k.max[0], k.max[2]);
  }
  return moved;
}

interface Ground {
  y: number;
  ramp: RampPart | null;
}
const g: Ground = { y: -Infinity, ramp: null };

/** Highest walkable surface under a local point, no higher than `limit`. */
function groundAt(f: Frame, l: V3, limit: number): Ground {
  g.y = -Infinity;
  g.ramp = null;
  nearBoxes(f.colliders, l[0], l[2], FOOT, (b) => {
    if (b.max[1] > limit || b.max[1] <= g.y) return;
    if (b.min[0] < l[0] + FOOT && b.max[0] > l[0] - FOOT && b.min[2] < l[2] + FOOT && b.max[2] > l[2] - FOOT) {
      g.y = b.max[1];
      g.ramp = null;
    }
  });
  for (const r of f.colliders.ramps) {
    if (l[0] < r.x0 - FOOT || l[0] > r.x1 + FOOT || l[2] < r.z0 - FOOT || l[2] > r.z1 + FOOT) continue;
    const top = rampTop(r, Math.min(r.x1, Math.max(r.x0, l[0])), Math.min(r.z1, Math.max(r.z0, l[2])));
    if (top <= limit + 0.05 && top > g.y) {
      g.y = top;
      g.ramp = r;
    }
  }
  return g;
}

/** Lowest ceiling above a local point between two head heights, or Infinity. */
function ceilingAt(f: Frame, l: V3, from: number, to: number): number {
  let best = Infinity;
  nearBoxes(f.colliders, l[0], l[2], FOOT, (b) => {
    if (b.min[1] < from - 0.02 || b.min[1] > to || b.min[1] >= best) return;
    if (b.min[0] < l[0] + FOOT && b.max[0] > l[0] - FOOT && b.min[2] < l[2] + FOOT && b.max[2] > l[2] - FOOT) best = b.min[1];
  });
  return best;
}

export interface Body {
  pos: V3; // world, at the feet
  vy: number;
  grounded: boolean;
  /** Car frame the body is riding in, if any. */
  ride: Frame | null;
}

const GRAVITY = 20;
export const JUMP_V = 6.0;
const l: V3 = [0, 0, 0], w: V3 = [0, 0, 0];

const near = (f: Frame, p: V3) => {
  const dx = p[0] - f.x, dz = p[2] - f.z;
  return dx * dx + dz * dz < (f.radius + 2) * (f.radius + 2);
};

/**
 * Carry a body with the frame it is riding. Call once per tick after frames have moved.
 * Returns the yaw change so the camera can turn with the car.
 */
export function carry(body: Body): number {
  const f = body.ride;
  if (!f || !f.prev) return 0;
  toLocal(f.prev, body.pos, l);
  toWorld(f, l, body.pos);
  return f.yaw - f.prev.yaw;
}

/** Move a body by a horizontal displacement and integrate gravity for dt seconds. */
export function stepBody(body: Body, frames: Frame[], mx: number, mz: number, dt: number, jump: boolean) {
  const active = frames.filter((f) => near(f, body.pos));
  const p = body.pos;
  const prevY = p[1];
  if (jump && body.grounded) {
    body.vy = JUMP_V;
    body.grounded = false;
  }
  p[0] += mx;
  p[2] += mz;
  const stepH = body.grounded ? STEP : 0.12;
  for (let it = 0; it < 3; it++) {
    let any = false;
    for (const f of active) {
      toLocal(f, p, l);
      if (pushOut(f, l, stepH)) {
        toWorld(f, l, p);
        any = true;
      }
    }
    if (!any) break;
  }

  // Vertical.
  body.vy -= GRAVITY * dt;
  let newY = prevY + body.vy * dt;
  let groundY = -Infinity;
  let conveyX = 0, conveyZ = 0;
  for (const f of active) {
    toLocal(f, p, l);
    const gr = groundAt(f, l, l[1] + STEP);
    if (gr.y === -Infinity) continue;
    const ramp = gr.ramp;
    l[1] = gr.y;
    toWorld(f, l, w);
    if (w[1] > groundY) {
      groundY = w[1];
      conveyX = conveyZ = 0;
      if (ramp && ramp.convey !== 0) {
        const c = Math.cos(f.yaw), s = Math.sin(f.yaw);
        const ux = ramp.up[0] * ramp.convey, uz = ramp.up[1] * ramp.convey;
        conveyX = ux * c + uz * s;
        conveyZ = -ux * s + uz * c;
      }
    }
  }
  const stick = body.grounded && body.vy <= 0 && groundY >= prevY - 0.45;
  if (body.vy <= 0 && (newY <= groundY || stick)) {
    newY = groundY;
    body.vy = 0;
    body.grounded = true;
    p[0] += conveyX * dt;
    p[2] += conveyZ * dt;
  } else {
    body.grounded = false;
    if (body.vy > 0) {
      for (const f of active) {
        toLocal(f, p, l);
        const c = ceilingAt(f, l, l[1] + BODY_H, l[1] + BODY_H + body.vy * dt + 0.02);
        if (c < Infinity) {
          newY = Math.min(newY, prevY + (c - (l[1] + BODY_H)) - 0.01);
          body.vy = 0;
        }
      }
    }
  }
  p[1] = newY;

  // Which car (if any) are we inside?
  body.ride = null;
  for (const f of active) {
    if (!f.inside) continue;
    toLocal(f, p, l);
    const a = f.inside.min, b = f.inside.max;
    if (l[0] >= a[0] && l[0] <= b[0] && l[1] >= a[1] && l[1] <= b[1] && l[2] >= a[2] && l[2] <= b[2]) {
      body.ride = f;
      break;
    }
  }
}

/** Zone label for a world position inside a station frame, if any. */
export function zoneAt(f: Frame, pos: V3): Zone | null {
  toLocal(f, pos, l);
  let best: Zone | null = null;
  for (const z of f.zones) {
    if (l[0] >= z.min[0] && l[0] <= z.max[0] && l[1] >= z.min[1] && l[1] <= z.max[1] && l[2] >= z.min[2] && l[2] <= z.max[2]) {
      // Prefer the most specific (smallest) zone.
      if (!best || (z.max[0] - z.min[0]) * (z.max[2] - z.min[2]) < (best.max[0] - best.min[0]) * (best.max[2] - best.min[2])) best = z;
    }
  }
  return best;
}
