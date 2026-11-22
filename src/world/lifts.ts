// Lifts. A lift is a shaft with a floor at each level it serves (Build.lifts, stations/lift.ts).
// There is no moving car: whoever stands in the shaft at one level for a moment is carried to
// the next, straight through the floors between, as if the car were round them. It goes up until
// the top, then down; stay in to go on, step out and in again to call it.

import type { LiftPart, V3 } from './builder';
import { toLocal, toWorld, type Body, type Pose } from './collision';

/** Metres a second, and the seconds the doors take before it leaves. */
export const LIFT_SPEED = 1.8, LIFT_DWELL = 1.4;
/** Seconds it waits at a level before going on with someone who stayed in. */
const LIFT_STAY = 3.5;

interface State {
  dir: 1 | -1;
  dwell: number;
  /** False just after arriving: the wait is longer, so there is time to step out. */
  fresh: boolean;
  to: number | null;
}
const states = new WeakMap<LiftPart, State>();
const l: V3 = [0, 0, 0];

export interface LiftHost {
  frame: Pose & { radius: number };
  build: { lifts: LiftPart[] };
}

/**
 * Carry the body if it is riding a lift. Returns true while it is being carried: the caller
 * then leaves the body alone for this tick (no walking, no gravity).
 */
export function rideLifts(body: Body, dt: number, hosts: LiftHost[]): boolean {
  for (const h of hosts) {
    if (!h.build.lifts.length) continue;
    const dx = body.pos[0] - h.frame.x, dz = body.pos[2] - h.frame.z;
    if (dx * dx + dz * dz > h.frame.radius * h.frame.radius) continue;
    toLocal(h.frame, body.pos, l);
    for (const lift of h.build.lifts) {
      let st = states.get(lift);
      if (!st) states.set(lift, (st = { dir: 1, dwell: 0, fresh: true, to: null }));
      const inside = l[0] > lift.min[0] && l[0] < lift.max[0] && l[2] > lift.min[1] && l[2] < lift.max[1];
      if (st.to !== null && inside) {
        // Travelling: straight up or down at the lift's speed, held inside the shaft.
        const step = LIFT_SPEED * dt, d = st.to - l[1];
        l[1] = Math.abs(d) <= step ? st.to : l[1] + Math.sign(d) * step;
        if (l[1] === st.to) {
          st.to = null;
          st.dwell = 0;
          st.fresh = false;
        }
        toWorld(h.frame, l, body.pos);
        body.vy = 0;
        body.grounded = true;
        return true;
      }
      st.to = null;
      const i = inside ? lift.levels.findIndex((y) => Math.abs(l[1] - y) < 0.4) : -1;
      if (i < 0) {
        st.dwell = 0;
        st.fresh = true;
        continue;
      }
      st.dwell += dt;
      if (st.dwell < (st.fresh ? LIFT_DWELL : LIFT_STAY)) continue;
      if (i === lift.levels.length - 1) st.dir = -1;
      if (i === 0) st.dir = 1;
      st.to = lift.levels[i + st.dir];
    }
  }
  return false;
}
