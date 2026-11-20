// Small street places: a pocket park, a neighbourhood shrine, a vending corner and a police box.
//
// Each stands on its own lot on a street front, built in a frame with the middle of the lot's
// front at the origin and the lot running back along +z (the pavement is at z < 0). The pieces are
// Blender models (tools/blender/build_places.py → public/models/buildings/places.glb); this file
// lays them out and adds the ground, colliders, zones and name signs. Names are invented.
import type { Builder } from '../world/builder';
import { fitting } from './fittings';
import { GROUND_Y, vending } from './kit';

export type PlaceKind = 'park' | 'shrine' | 'vending' | 'koban';
/** Frontage and depth of each kind's lot. */
export const PLACES: Record<PlaceKind, { w: number; d: number }> = {
  park: { w: 14, d: 12 }, shrine: { w: 9, d: 14 }, vending: { w: 6.2, d: 2.4 }, koban: { w: 6.6, d: 5.2 },
};
export interface PlaceOpts {
  kind: PlaceKind;
  ja: string;
  en: string;
}

const GY = GROUND_Y;

export function place(b: Builder, o: PlaceOpts) {
  const { w, d } = PLACES[o.kind], X = w / 2;
  const put = (id: string, x: number, z: number, f: [number, number] = [0, -1], y = GY) => {
    const dir = b.dir(f);
    b.out.models.push({ kind: 'places', id, pos: b.pt(x, y, z), yaw: Math.atan2(-dir[0], -dir[1]) + 0, seed: 0, merge: true });
  };
  const solid = (x0: number, z0: number, x1: number, z1: number, h: number) => b.block(x0, GY, z0, x1, GY + h, z1);
  /** Low fence along the two sides and the back, in 2 m panels. */
  const fenced = () => {
    for (let z = 1; z + 1 <= d; z += 2) for (const s of [-1, 1]) put('fence', s * (X - 0.1), z, [1, 0]);
    for (let x = -X + 1; x + 1 <= X + 0.01; x += 2) put('fence', x, d - 0.1);
    for (const s of [-1, 1]) solid(s * X - 0.12, 0, s * X + 0.12, d, 0.8);
    solid(-X, d - 0.2, X, d, 0.8);
  };

  if (o.kind === 'park') {
    b.deco('flat:#b9b08f', -X, GY, 0, X, GY + 0.02, d);
    b.deco('flat:#6f9a5a', -X + 0.4, GY + 0.02, d - 4.2, X - 0.4, GY + 0.03, d - 0.4);
    fenced();
    put('namestone', -X + 1.3, 0.5);
    solid(-X + 0.5, 0.25, -X + 2.1, 0.75, 0.9);
    b.sign({ k: 'label', text: o.ja, sub: o.en, fg: '#2b2e33', bg: '#a9a69c' }, -X + 1.3, GY + 0.52, 0.33, [0, -1], 1.25, 0.6);
    put('clockpost', X - 1.6, 1.4);
    solid(X - 1.8, 1.2, X - 1.4, 1.6, 3);
    put('fountain', X - 3.4, 3.2);
    solid(X - 3.65, 2.95, X - 3.15, 3.45, 0.9);
    put('shelter', 2.6, d - 2.6);
    for (const sx of [-1.3, 1.3]) for (const sz of [-1.3, 1.3]) solid(2.6 + sx - 0.1, d - 2.6 + sz - 0.1, 2.6 + sx + 0.1, d - 2.6 + sz + 0.1, 2.3);
    solid(1.4, d - 1.8, 3.8, d - 1.3, 0.45);
    put('swing', -3.6, d - 3.2);
    solid(-4.9, d - 3.9, -2.3, d - 2.5, 0.5);
    for (const [x, z] of [[-X + 1.6, d - 1.4], [-0.8, d - 1.3], [X - 1.4, d - 5.2]]) {
      put('tree', x, z);
      solid(x - 0.2, z - 0.2, x + 0.2, z + 0.2, 3);
    }
    for (const x of [-2.4, 0.4]) {
      fitting(b, 'cbench_new', x, GY, 4.6, [0, -1]);
      solid(x - 0.9, 4.35, x + 0.9, 4.85, 0.45);
    }
    b.zone('street', -X, GY - 0.2, 0, X, GY + 3, d, o.ja, o.en, true);
    return;
  }

  if (o.kind === 'shrine') {
    b.deco('flat:#c9c4b4', -X, GY, 0, X, GY + 0.02, d);
    b.deco('flat:#a9a69c', -0.9, GY + 0.02, 0, 0.9, GY + 0.03, d - 4.6);
    // Low stone fence down both sides and across the back.
    for (const s of [-1, 1]) b.box('flat:#a9a69c', Math.min(s * X, s * (X - 0.25)), GY, 0.2, Math.max(s * X, s * (X - 0.25)), GY + 0.7, d);
    b.box('flat:#a9a69c', -X, GY, d - 0.25, X, GY + 0.7, d);
    put('torii', 0, 0.9);
    for (const sx of [-1.6, 1.6]) solid(sx - 0.24, 0.66, sx + 0.24, 1.14, 4);
    b.sign({ k: 'label', text: o.ja.replace(/神社$/, ''), fg: '#1d1f22', bg: '#c9a23a' }, 0, GY + 3.51, 0.79, [0, -1], 0.5, 0.32);
    put('notice', -X + 1.3, 1.6);
    solid(-X + 0.6, 1.5, -X + 2.0, 1.7, 1.9);
    b.sign({ k: 'label', text: o.ja, sub: o.en, fg: '#2b2e33', bg: '#f1f0ea' }, -X + 1.05, GY + 1.25, 1.56, [0, -1], 0.42, 0.6);
    for (const sx of [-1.7, 1.7]) {
      put('lantern', sx, 4.2);
      solid(sx - 0.3, 3.9, sx + 0.3, 4.5, 1.8);
    }
    put('basin', X - 1.7, 6.2, [-1, 0]);
    solid(X - 2.5, 5.2, X - 0.9, 7.2, 2.2);
    put('sacredtree', -X + 1.8, 7.0);
    solid(-X + 1.45, 6.65, -X + 2.15, 7.35, 3);
    put('hall', 0, d - 2.3);
    solid(-2.1, d - 4.9, 2.1, d - 0.6, 3);
    b.zone('street', -X, GY - 0.2, 0, X, GY + 3, d, o.ja, o.en, true);
    return;
  }

  if (o.kind === 'vending') {
    b.deco('flat:#b9b6ac', -X, GY, 0, X, GY + 0.02, d);
    put('canopy', 0, 1.15);
    solid(-2.9, 1.82, 2.9, 1.95, 2.5);
    [-2.0, -0.9, 0.2, 1.3].forEach((x, i) => vending(b, x, GY, 1.45, [0, -1], i % 2 ? 'vending2' : 'vending', 'new'));
    fitting(b, 'bins_new', 2.35, GY, 1.55, [0, -1]);
    solid(1.7, 1.35, 3.0, 1.75, 0.96);
    b.sign({ k: 'label', text: o.ja, sub: o.en, fg: '#fff', bg: '#2f6fb0' }, 0, GY + 2.58, 0.17, [0, -1], 2.6, 0.14);
    return;
  }

  // Kōban: the box itself, its name on the blue band, the district map board and a patrol bicycle.
  b.deco('flat:#b9b6ac', -X, GY, 0, X, GY + 0.02, d);
  put('koban', 0, 0.95);
  solid(-2.8, 0.95, 2.8, 5.15, 6.2);
  b.sign({ k: 'label', text: o.ja, sub: `KOBAN  ${o.en}`, fg: '#fff', bg: '#1d3a6a' }, 0, GY + 3.4, 0.915, [0, -1], 3.6, 0.6);
  put('mapboard', -2.3, 0.3);
  solid(-3.1, 0.22, -1.5, 0.38, 1.9);
  b.sign({ k: 'label', text: '周辺案内図', sub: 'Area map', fg: '#fff', bg: '#2b2f33' }, -2.3, GY + 1.35, 0.245, [0, -1], 1.5, 1.0);
  put('bicycle', 2.5, 0.45);
  solid(1.7, 0.3, 3.3, 0.6, 1.0);
}
