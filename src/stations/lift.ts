// A passenger lift you can ride (world/lifts.ts carries whoever stands in it).
//
// Built in the current frame: the doors are in the front, z = 0, facing −z; the car is LIFT_IN
// square behind them, centred on x = 0. Wrap in Builder.with to place and turn it. The shaft
// runs from the lowest level to above the highest, with a floor, a lit ceiling and a doorway at
// every level; between levels it is a closed shaft.

import type { Builder } from '../world/builder';

/** Inside width and depth of the car, wall thickness, doorway width and height. */
export const LIFT_IN = 2.0, LIFT_WALL = 0.15, LIFT_DOOR = 1.1, LIFT_DOOR_H = 2.1;
/** Outside half width and depth of the shaft. */
export const LIFT_OUT = { hw: LIFT_IN / 2 + LIFT_WALL, d: LIFT_IN + 2 * LIFT_WALL };

export interface LiftOpts {
  /** The floors served, lowest first, each with what the board calls it. */
  levels: { y: number; ja: string; en: string }[];
  /** Only the colliders, floors and doors' signs: a model draws the shaft (the footbridge's glazed towers). */
  bare?: boolean;
  /** Walls' finish outside. */
  mat?: string;
}

export function lift(b: Builder, o: LiftOpts) {
  const ys = o.levels.map((q) => q.y), y0 = ys[0], y1 = ys[ys.length - 1] + 2.6;
  const hw = LIFT_IN / 2, T = LIFT_WALL, D = LIFT_IN, dh = LIFT_DOOR / 2;
  const out = o.mat ?? 'metal:#c4c8cc', inner = 'metal:#d7dadc';
  const wall = (x0: number, z0: number, x1: number, z1: number, ya: number, yb: number) => (o.bare ? b.block(x0, ya, z0, x1, yb, z1) : b.box(out, x0, ya, z0, x1, yb, z1));
  // Sides and back, the whole height; the front between and beside the doorways.
  wall(-hw - T, 0, -hw, D + 2 * T, y0, y1);
  wall(hw, 0, hw + T, D + 2 * T, y0, y1);
  wall(-hw, D + T, hw, D + 2 * T, y0, y1);
  wall(-hw, 0, -dh, T, y0, y1);
  wall(dh, 0, hw, T, y0, y1);
  ys.forEach((y, i) => {
    const next = ys[i + 1] ?? y1;
    wall(-dh, 0, dh, T, y + LIFT_DOOR_H, next);
    // The floor (reaching out under the doorway), the car's lining, ceiling and light.
    b.box('floor:#b9b6ae', -hw, y - 0.2, i > 0 ? 0 : -0.45, hw, y + 0.004, D + T);
    if (!o.bare) {
      for (const [x0, z0, x1, z1] of [[-hw, T, -hw + 0.02, D + T], [hw - 0.02, T, hw, D + T], [-hw, D + T - 0.02, hw, D + T]]) b.deco(inner, x0, y, z0, x1, y + 2.4, z1);
      b.deco('metal:#8d9399', -hw, y + 0.95, D + T - 0.06, hw, y + 1.0, D + T - 0.02);
    }
    b.deco('ceil', -hw, y + 2.4, T, hw, y + 2.44, D + T);
    b.deco('light', -0.5, y + 2.37, T + D / 2 - 0.3, 0.5, y + 2.4, T + D / 2 + 0.3);
    // The door frame, the board over it, and inside the car what it serves and how it works.
    if (!o.bare) {
      for (const s of [-1, 1]) b.deco('metal:#8d9399', Math.min(s * dh, s * (dh + 0.08)), y, -0.02, Math.max(s * dh, s * (dh + 0.08)), y + LIFT_DOOR_H + 0.08, 0);
      b.deco('metal:#8d9399', -dh - 0.08, y + LIFT_DOOR_H, -0.02, dh + 0.08, y + LIFT_DOOR_H + 0.08, 0);
      b.sign({ k: 'label', text: `エレベーター　${o.levels[i].ja}`, sub: `Lift — ${o.levels[i].en}`, fg: '#ffffff', bg: '#1f5fae' }, 0, y + LIFT_DOOR_H + 0.3, -0.03, [0, -1], 1.9, 0.34);
    }
    const others = o.levels.filter((_, k) => k !== i);
    b.sign({ k: 'label', text: others.map((q) => q.ja).join('・'), sub: `To ${others.map((q) => q.en).join(' / ')} — stand inside, it leaves by itself`, fg: '#1f2023', bg: '#f4f4f0' }, 0, y + 1.6, D + T - 0.03, [0, -1], 1.6, 0.5);
  });
  // (Builder.lift takes the footprint in this frame: the car, a little inside its walls.)
  b.lift(-hw + 0.05, T + 0.05, hw - 0.05, D + T - 0.05, ys);
}
