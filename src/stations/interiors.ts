// Rooms walked into in the north districts (2026-11-24, stage 4): the restaurant 海龍飯店 in Tōsen-machi, the nave of
// 川湊天主堂 and the Harrington House museum on Kamome-ga-oka. Each building's model is a hollow shell with a real
// door (build_tosen.py `hanten`, build_kamome.py `church`, `harrington`): its walls are drawn by the model and made
// solid here, the floors, furniture and lights are drawn here.
//
// Every function works in the building's own frame (the street code's `at`): its front middle at the origin, the
// front facing −z, the body running back along +z; `g` is the floor's height in that frame.

import type { Builder } from '../world/builder';
import { ceilingLight, stairs } from './kit';

const WOOD = 'wood:#5a3a26', WOOD_D = 'wood:#3e281b', WOOD_L = 'wood:#8a6a4c', BRASS = 'flat:#b08d3a', CLOTH_W = 'flat:#efe8da';

/** Solid walls round a hollow storey (x0 … x1, z0 … z1, thickness t), the door's gap in the front (x range, height). */
function walls(b: Builder, x0: number, x1: number, z0: number, z1: number, y0: number, y1: number, t: number, door?: [number, number, number]) {
  if (door) {
    b.block(x0, y0, z0, door[0], y1, z0 + t);
    b.block(door[1], y0, z0, x1, y1, z0 + t);
    b.block(door[0], y0 + door[2], z0, door[1], y1, z0 + t);
  } else b.block(x0, y0, z0, x1, y1, z0 + t);
  b.block(x0, y0, z1 - t, x1, y1, z1);
  b.block(x0, y0, z0, x0 + t, y1, z1);
  b.block(x1 - t, y0, z0, x1, y1, z1);
}
/** A piece of furniture: drawn and solid. */
function piece(b: Builder, mat: string, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) {
  b.box(mat, x0, y0, z0, x1, y1, z1, true);
}

/**
 * 海龍飯店 Hairyū Hanten, Tōsen-machi's big restaurant (16 × 14 m, the dining room 4.2 m high): red lacquer
 * columns, round tables with white cloths and lazy Susans, red lanterns, the cashier by the door, the kitchen's
 * pass at the back with the cooks' fire behind it, a gilded screen.
 */
export function hantenInside(b: Builder, g: number, w: number, d: number) {
  const x0 = -w / 2 + 0.3, x1 = w / 2 - 0.3, z0 = 0.9, z1 = d - 0.3, H = 4.2;
  walls(b, -w / 2, w / 2, 0.6, d, g, g + H, 0.3, [-1.3, 1.3, 3.0]);
  // (An indoor zone: the renderer keeps the street's haze out of the room, render/Scene.tsx.)
  b.zone('concourse', x0, g - 0.3, z0 - 0.3, x1, g + H, z1, '海龍飯店', 'Hairyū Hanten');
  // Floor: red carpet with a gold border; the ceiling coffered in red and gold.
  b.deco('flat:#7d1a14', x0, g + 0.002, z0, x1, g + 0.012, z1);
  b.deco('flat:#c99a2e', x0 + 0.5, g + 0.012, z0 + 0.5, x1 - 0.5, g + 0.016, z1 - 0.5);
  b.deco('flat:#8f1d16', x0 + 0.7, g + 0.016, z0 + 0.7, x1 - 0.7, g + 0.02, z1 - 0.7);
  for (let x = x0 + 2; x < x1 - 1; x += 3) b.deco('flat:#c99a2e', x - 0.06, g + H - 0.12, z0, x + 0.06, g + H - 0.02, z1);
  // Four red columns with gold capitals.
  for (const cx of [-3.6, 3.6]) for (const cz of [5.0, 9.6]) {
    piece(b, 'flat:#b3261e', cx - 0.25, g, cz - 0.25, cx + 0.25, g + H, cz + 0.25);
    b.deco('flat:#d4a537', cx - 0.32, g + H - 0.5, cz - 0.32, cx + 0.32, g + H - 0.3, cz + 0.32);
  }
  // The tables: round (eight-sided boxes), a white cloth, a lazy Susan, eight stools.
  const table = (cx: number, cz: number, r: number) => {
    piece(b, CLOTH_W, cx - r, g + 0.72, cz - r * 0.42, cx + r, g + 0.78, cz + r * 0.42);
    b.deco(CLOTH_W, cx - r * 0.42, g + 0.72, cz - r, cx + r * 0.42, g + 0.78, cz + r);
    b.deco(CLOTH_W, cx - r * 0.75, g + 0.72, cz - r * 0.75, cx + r * 0.75, g + 0.78, cz + r * 0.75);
    b.deco(CLOTH_W, cx - r, g + 0.4, cz - r * 0.42, cx + r, g + 0.72, cz + r * 0.42);
    b.deco(CLOTH_W, cx - r * 0.42, g + 0.4, cz - r, cx + r * 0.42, g + 0.72, cz + r);
    b.block(cx - r * 0.8, g, cz - r * 0.8, cx + r * 0.8, g + 0.78, cz + r * 0.8);
    b.deco('flat:#2a2019', cx - r * 0.4, g + 0.78, cz - r * 0.4, cx + r * 0.4, g + 0.82, cz + r * 0.4);
    b.deco('flat:#e8e0cf', cx - 0.15, g + 0.82, cz - 0.15, cx + 0.15, g + 0.88, cz + 0.15);
    for (let k = 0; k < 8; k++) {
      const a = (2 * Math.PI * k) / 8, sx = cx + Math.cos(a) * (r + 0.45), sz = cz + Math.sin(a) * (r + 0.45);
      b.deco('flat:#7d1a14', sx - 0.2, g + 0.44, sz - 0.2, sx + 0.2, g + 0.5, sz + 0.2);
      b.deco(WOOD_D, sx - 0.16, g, sz - 0.16, sx + 0.16, g + 0.44, sz + 0.16);
    }
  };
  for (const [cx, cz] of [[-5.6, 3.6], [0, 7.2], [5.6, 3.6], [-5.6, 10.6], [5.6, 10.6]] as [number, number][]) table(cx, cz, 0.9);
  // The cashier's counter by the door, a lucky cat on it; a gilded screen behind.
  piece(b, WOOD_D, 3.2, g, 1.3, 6.4, g + 1.05, 2.0);
  b.deco('flat:#c99a2e', 3.2, g + 1.05, 1.25, 6.4, g + 1.1, 2.05);
  b.deco('flat:#f4f1e8', 5.6, g + 1.1, 1.5, 5.9, g + 1.45, 1.75);
  piece(b, 'flat:#c99a2e', -6.8, g, 1.2, -3.2, g + 2.4, 1.35);
  b.deco('flat:#7d1a14', -6.6, g + 0.2, 1.18, -3.4, g + 2.2, 1.2);
  // The back wall: the kitchen's pass (a stainless counter and a lit hatch), a round moon door to the kitchen (shut).
  // The walls: red lacquer panels in gold frames over a dark wood dado, all round the room.
  for (const sx of [-1, 1]) {
    const xw = sx * (w / 2 - 0.3), n = -sx;
    b.deco(WOOD_D, Math.min(xw, xw + n * 0.04), g, z0, Math.max(xw, xw + n * 0.04), g + 1.0, z1);
    b.deco('flat:#8f1d16', Math.min(xw, xw + n * 0.03), g + 1.0, z0, Math.max(xw, xw + n * 0.03), g + H, z1);
    for (let z = z0 + 0.6; z + 2.0 <= z1 - 0.2; z += 2.6) b.deco('flat:#c99a2e', Math.min(xw, xw + n * 0.05), g + 1.3, z, Math.max(xw, xw + n * 0.05), g + 3.4, z + 2.0);
    for (let z = z0 + 0.7; z + 1.9 <= z1 - 0.2; z += 2.6) b.deco('flat:#7d1a14', Math.min(xw, xw + n * 0.06), g + 1.4, z + 0.1, Math.max(xw, xw + n * 0.06), g + 3.3, z + 1.8);
  }
  b.deco(WOOD_D, x0, g, z1 - 0.04, x1, g + 1.0, z1);
  b.deco('flat:#8f1d16', x0, g + 1.0, z1 - 0.03, x1, g + H, z1);
  // (The front wall either side of the door and over it.)
  for (const [a, e, y0] of [[x0, -1.3, 1.0], [1.3, x1, 1.0], [-1.3, 1.3, 3.0]] as [number, number, number][]) b.deco('flat:#8f1d16', a, g + y0, z0 + 0.01, e, g + H, z0 + 0.04);
  b.deco('flat:#6b5a40', x0, g + H - 0.04, z0, x1, g + H - 0.02, z1);
  piece(b, 'metal:#b9bdc2', -3.0, g, z1 - 0.7, 3.0, g + 1.02, z1);
  b.deco('flat:#f0d9a0', -2.8, g + 1.3, z1 - 0.05, 2.8, g + 2.3, z1 - 0.03);
  b.deco('flat:#e36b2c', -2.0, g + 1.32, z1 - 0.07, -1.2, g + 1.7, z1 - 0.055);
  for (const sx of [-1, 1]) {
    b.deco('flat:#2a2019', sx * 5.2 - 0.9, g, z1 - 0.08, sx * 5.2 + 0.9, g + 2.2, z1 - 0.05);
    b.deco('flat:#c99a2e', sx * 5.2 - 1.0, g + 2.2, z1 - 0.09, sx * 5.2 + 1.0, g + 2.35, z1 - 0.05);
  }
  // Red lanterns hung on the beams; lights between.
  for (let x = x0 + 1.5; x < x1 - 1; x += 3) for (const z of [3.4, 7.2, 11.0]) {
    b.deco('flat:#2a2019', x - 0.01, g + H - 0.6, z - 0.01, x + 0.01, g + H - 0.1, z + 0.01);
    b.deco('flat:#d8261b', x - 0.22, g + H - 1.15, z - 0.22, x + 0.22, g + H - 0.6, z + 0.22);
    b.deco('flat:#d4a537', x - 0.24, g + H - 0.65, z - 0.24, x + 0.24, g + H - 0.6, z + 0.24);
  }
  ceilingLight(b, -1, 1, 3, 11.5, g + H - 0.15);
  // A fish tank by the door (the day's catch), on a stand.
  piece(b, WOOD_D, -7.4, g, 2.4, -5.8, g + 0.8, 5.0);
  b.deco('flat:#3f7f8f', -7.3, g + 0.8, 2.5, -5.9, g + 1.7, 4.9);
}

/**
 * The nave of 川湊天主堂 (the church's model is 14 m wide inside its 0.6 m walls, the tower and porch 7 m deep in
 * front, the nave from z 7 to 36): a red runner up the aisle between dark pews, the sanctuary two steps up at the
 * east end under the apse window, the altar and a gilded cross, the organ loft over the door with its pipes, lamps
 * hung down the nave. The stained glass is the model's.
 */
export function churchInside(b: Builder, g: number, w: number, d: number, h: number) {
  const T = 7, t = 0.6, x0 = -w / 2 + t, x1 = w / 2 - t;
  // The nave's walls (the model's), the tower's porch sides, the door through into the nave.
  walls(b, -w / 2, w / 2, T, d, g, g + h + 6, t, [-1.2, 1.2, 4.6]);
  b.zone('concourse', x0, g - 0.3, T + t, x1, g + h + 6, d - t, '川湊天主堂 聖堂', 'Kawaminato Cathedral · nave');
  b.deco('tile:#b9b0a0', x0, g + 0.002, T + t, x1, g + 0.012, d - t);
  b.deco('tile:#a59c8e', -1.2, g + 0.002, 0, 1.2, g + 0.012, T + t);
  b.deco('flat:#7d1a14', -0.8, g + 0.012, T + t, 0.8, g + 0.018, d - 4.6);
  // Pews: two blocks of rows either side of the aisle.
  for (let z = T + 4.0; z < d - 7.5; z += 1.05) for (const s of [-1, 1]) {
    const a = s < 0 ? x0 + 0.6 : 1.1, e = s < 0 ? -1.1 : x1 - 0.6;
    piece(b, WOOD_D, a, g, z, e, g + 0.45, z + 0.45);
    b.deco(WOOD_D, a, g + 0.45, z + 0.4, e, g + 0.95, z + 0.5);
    b.deco(WOOD, a, g, z - 0.05, a + 0.08, g + 1.0, z + 0.5);
    b.deco(WOOD, e - 0.08, g, z - 0.05, e, g + 1.0, z + 0.5);
  }
  // The sanctuary: two steps up, a rail, the altar, the cross, candlesticks.
  const zs = d - 6.0;
  b.box('tile:#d9d2c0', x0, g, zs, x1, g + 0.18, d - t);
  b.box('tile:#d9d2c0', x0, g, zs + 0.5, x1, g + 0.36, d - t);
  b.ramp(-0.8, zs - 0.5, 0.8, zs + 0.5, g, g + 0.36, [0, 1]);
  for (const s of [-1, 1]) {
    b.deco(WOOD_L, s < 0 ? x0 : 0.8, g + 0.36, zs + 0.55, s < 0 ? -0.8 : x1, g + 1.2, zs + 0.65);
    b.block(s < 0 ? x0 : 0.8, g + 0.36, zs + 0.5, s < 0 ? -0.8 : x1, g + 1.3, zs + 0.7);
  }
  piece(b, 'flat:#e8e4da', -1.6, g + 0.36, d - 3.2, 1.6, g + 1.36, d - 2.2);
  b.deco('flat:#d4a537', -1.6, g + 1.36, d - 3.2, 1.6, g + 1.4, d - 2.2);
  b.deco('flat:#d4a537', -0.08, g + 1.4, d - 2.8, 0.08, g + 3.4, d - 2.6);
  b.deco('flat:#d4a537', -0.6, g + 2.7, d - 2.8, 0.6, g + 2.86, d - 2.6);
  for (const sx of [-1.2, 1.2]) b.deco(BRASS, sx - 0.04, g + 1.4, d - 2.75, sx + 0.04, g + 2.0, d - 2.65);
  // The pulpit to one side, a font by the door.
  piece(b, WOOD_L, x1 - 1.8, g + 0.36, zs + 0.9, x1 - 0.6, g + 1.6, zs + 2.0);
  piece(b, 'tile:#d9d2c0', -2.6, g, T + 1.4, -1.8, g + 1.0, T + 2.2);
  // The organ loft over the door: a gallery on two columns, a rail, the pipes in a row against the west wall.
  const yl = g + 4.8, zl = T + t + 3.2;
  b.deco(WOOD_D, x0, yl - 0.3, T + t, x1, yl, zl);
  b.deco(WOOD_L, x0, yl, zl - 0.1, x1, yl + 1.0, zl);
  for (const cx of [-3.5, 3.5]) piece(b, 'tile:#b9b0a0', cx - 0.25, g, zl - 0.35, cx + 0.25, yl - 0.3, zl + 0.15);
  for (let k = 0; k < 15; k++) {
    const px = -3.5 + k * 0.5, ph = 1.6 + (7 - Math.abs(k - 7)) * 0.22;
    b.deco('metal:#c9ced2', px - 0.12, yl, T + t + 0.3, px + 0.12, yl + ph, T + t + 0.55);
  }
  // Lamps hung down the nave on long rods.
  for (let z = T + 6; z < d - 6; z += 6) for (const sx of [-3.2, 3.2]) {
    b.deco('flat:#25282b', sx - 0.01, g + 5.6, z - 0.01, sx + 0.01, g + h + 2, z + 0.01);
    b.deco('light', sx - 0.25, g + 5.0, z - 0.25, sx + 0.25, g + 5.6, z + 0.25);
    b.deco(BRASS, sx - 0.3, g + 5.6, z - 0.3, sx + 0.3, g + 5.68, z + 0.3);
  }
}

/**
 * The Harrington House, a museum (16 × 13 m, two storeys of 4.2 m): downstairs, the hall with the stairs, the
 * parlour (a fireplace, a sofa and armchairs, a piano) and the dining room (a long table laid, a sideboard);
 * upstairs, the study with display cases and the glazed veranda, the sun room, with wicker chairs and plants.
 */
export function harringtonInside(b: Builder, g: number, w: number, d: number, h: number) {
  const t = 0.3, h1 = 4.2, x0 = -w / 2 + t, x1 = w / 2 - t, z0 = t, z1 = d - t, up = g + h1 + 0.25;
  walls(b, -w / 2, w / 2, 0, d, g, g + h1, t, [-0.75, 0.75, 2.6]);
  b.zone('concourse', x0, g - 0.3, z0, x1, g + h + 1, z1, '旧ハリントン邸', 'Harrington House · museum');
  b.zone('concourse', -w / 2 + 0.6, up - 0.3, -2.6, w / 2 - 4.4, up + 3, 0, '旧ハリントン邸 サンルーム', 'Harrington House · sun room');
  walls(b, -w / 2, w / 2, 0, d, up, g + h + 2, t, [-1.0, 1.0, 2.3]);
  // The floor between (the model's slab), solid but for the stairwell at the back of the −x side.
  b.block(-w / 2, g + h1, 0, w / 2, up, 5.5);
  b.block(-w / 2 + 1.6, g + h1, 5.5, w / 2, up, d);
  // Floors: boards downstairs and up; rugs.
  for (const y of [g, up]) b.deco('wood:#9a6a3c', x0, y + 0.002, z0, x1, y + 0.012, z1);
  // The walls dressed: wainscot to 1 m, wallpaper above (sage green downstairs, old gold upstairs), a cornice, and
  // framed prints of the merchant's ships along the long walls. (Doors left clear: front x ±0.75 / ±1.0.)
  const paper = (y0: number, y1: number, col: string, door: number) => {
    const runs: [string, number, number, number, number][] = [];
    // (Each face: its axis, where it stands, its inward normal, and its run.)
    runs.push(['x', z0, 1, x0, -door], ['x', z0, 1, door, x1], ['x', z1, -1, x0, x1], ['z', x0, 1, z0, z1], ['z', x1, -1, z0, z1]);
    for (const [ax, at, n, a, e] of runs) {
      const box = (mat: string, ya: number, yb: number, o0: number, o1: number) => ax === 'x'
        ? b.deco(mat, a, ya, Math.min(at + n * o0, at + n * o1), e, yb, Math.max(at + n * o0, at + n * o1))
        : b.deco(mat, Math.min(at + n * o0, at + n * o1), ya, a, Math.max(at + n * o0, at + n * o1), yb, e);
      box('wood:#5a3a26', y0, y0 + 1.0, 0.005, 0.04);
      box('wood:#3e281b', y0 + 0.98, y0 + 1.06, 0.005, 0.06);
      box(col, y0 + 1.06, y1 - 0.2, 0.005, 0.02);
      box('flat:#efe6cf', y1 - 0.2, y1, 0.005, 0.08);
      if (e - a > 3 && ax === 'z' && n < 0 && y0 === g) for (let u = a + 1.6; u < e - 1.2; u += 3.2) {
        const pz0 = u - 0.45, pz1 = u + 0.45;
        b.deco('flat:#c99a2e', Math.min(at + n * 0.02, at + n * 0.05), y0 + 1.5, pz0, Math.max(at + n * 0.02, at + n * 0.05), y0 + 2.2, pz1);
        b.sign({ k: 'mural', v: 'harbour', color: '#1d4f7a' }, at + n * 0.055, y0 + 1.85, u, [n, 0], 0.8, 0.6);
      }
    }
  };
  paper(g, g + h1, 'flat:#5f7f6a', 0.75);
  paper(up, g + h - 0.1, 'flat:#b89a60', 1.0);
  b.deco('flat:#7a2e2e', -6.5, g + 0.012, 1.6, -1.5, g + 0.018, 6.0);
  b.deco('flat:#2f4a6a', 1.5, up + 0.012, 1.4, 6.0, up + 0.018, 5.0);
  // The partition between the parlour (−x, front) and the dining room (+x), a wide opening in it.
  piece(b, 'flat:#e8e0cf', 1.0, g, z0, 1.2, g + h1, 2.4);
  piece(b, 'flat:#e8e0cf', 1.0, g, 5.0, 1.2, g + h1, 8.0);
  b.deco('flat:#e8e0cf', 1.0, g + 2.6, 2.4, 1.2, g + h1, 5.0);
  // The parlour: the fireplace on the −x wall, a sofa and two armchairs round a low table, a piano.
  piece(b, 'tile:#b9b0a0', x0, g, 3.0, x0 + 0.6, g + 1.3, 5.0);
  b.deco('flat:#1a1c1f', x0 + 0.58, g + 0.15, 3.5, x0 + 0.62, g + 0.9, 4.5);
  b.deco(WOOD_D, x0, g + 1.3, 2.8, x0 + 0.75, g + 1.42, 5.2);
  b.deco('flat:#d4a537', x0 + 0.05, g + 1.6, 3.6, x0 + 0.1, g + 2.6, 4.4);
  piece(b, 'flat:#6a2e3a', -5.5, g, 6.2, -2.3, g + 0.85, 7.0);
  b.deco('flat:#6a2e3a', -5.5, g + 0.85, 6.7, -2.3, g + 1.2, 7.0);
  for (const cx of [-6.0, -1.8]) piece(b, 'flat:#6a2e3a', cx - 0.45, g, 3.8, cx + 0.45, g + 0.9, 4.7);
  piece(b, WOOD, -4.6, g, 4.0, -3.2, g + 0.45, 5.0);
  piece(b, 'flat:#141414', -6.1, g, 9.4, -4.5, g + 1.0, 11.0);
  b.deco('flat:#f4f1e8', -6.05, g + 0.72, 9.35, -4.55, g + 0.76, 9.5);
  // The dining room: a long table laid for eight, its chairs, a sideboard, a chandelier.
  piece(b, WOOD, 2.6, g, 3.6, 6.4, g + 0.76, 5.2);
  b.deco(CLOTH_W, 2.6, g + 0.76, 3.6, 6.4, g + 0.78, 5.2);
  // Chairs: a seat on four legs, a tall back away from the table, solid only at the seat.
  for (let x = 3.0; x < 6.2; x += 1.0) for (const [z, sz] of [[3.1, -1], [5.7, 1]] as [number, number][]) {
    for (const [dx, dz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) b.deco(WOOD_D, x + dx - 0.025, g, z + dz - 0.025, x + dx + 0.025, g + 0.45, z + dz + 0.025);
    b.deco('flat:#6a2e3a', x - 0.22, g + 0.45, z - 0.22, x + 0.22, g + 0.52, z + 0.22);
    b.deco(WOOD_D, x - 0.22, g + 0.52, z + sz * 0.2 - 0.03, x + 0.22, g + 1.05, z + sz * 0.2 + 0.03);
    b.block(x - 0.22, g, z - 0.22, x + 0.22, g + 0.52, z + 0.22);
  }
  for (let x = 3.0; x < 6.2; x += 1.0) for (const z of [3.9, 4.9]) b.deco('flat:#f4f1e8', x - 0.12, g + 0.78, z - 0.12, x + 0.12, g + 0.8, z + 0.12);
  piece(b, WOOD_D, 3.0, g, z1 - 0.55, 6.6, g + 1.02, z1);
  b.deco(BRASS, 4.3, g + h1 - 1.0, 4.2, 4.7, g + h1 - 0.6, 4.6);
  b.deco('light', 3.9, g + h1 - 1.15, 3.8, 5.1, g + h1 - 1.0, 5.0);
  // The hall: the stairs up the −x wall at the back (to the stairwell), a hat stand, a ticket table by the door.
  // (A landing at the top against the back wall: off it, east onto the upper floor.)
  b.with({ rot: 1 }, () => stairs(b, { x0: 5.5, x1: z1 - 1.3, z0: -(-w / 2 + 1.6), z1: -x0, yLow: g, yHigh: up, mat: WOOD_L, rails: [true, false] }));
  piece(b, WOOD_L, -w / 2 + t, g, z1 - 1.3, -w / 2 + 1.6, up, z1);
  piece(b, WOOD_D, 1.6, g, 0.6, 3.0, g + 0.8, 1.2);
  b.deco('flat:#f4f1e8', 1.7, g + 0.8, 0.7, 2.9, g + 0.82, 1.1);
  // Upstairs: a rail round the stairwell; the study (display cases of the merchant's papers, a desk); the sun room.
  b.deco(WOOD_D, -w / 2 + 1.6, up, 5.5, -w / 2 + 1.7, up + 1.0, z1);
  b.block(-w / 2 + 1.6, up, 5.5, -w / 2 + 1.7, up + 1.0, z1 - 1.2);
  b.deco(WOOD_D, x0, up, 5.45, -w / 2 + 1.7, up + 1.0, 5.55);
  b.block(x0, up, 5.4, -w / 2 + 1.7, up + 1.0, 5.6);
  for (const cx of [-2.5, 1.0, 4.5]) {
    piece(b, WOOD_D, cx - 1.0, up, 9.0, cx + 1.0, up + 0.9, 9.8);
    b.deco('glassTint', cx - 1.0, up + 0.9, 9.0, cx + 1.0, up + 1.4, 9.8);
  }
  piece(b, WOOD, 4.6, up, 1.6, 6.4, up + 0.76, 2.6);
  b.deco(WOOD_D, 5.2, up, 2.8, 5.8, up + 1.0, 3.3);
  piece(b, WOOD_D, x1 - 0.5, up, 5.0, x1, up + 2.4, 8.5);
  ceilingLight(b, -1, 1, 4, 8, g + h1 - 0.02);
  ceilingLight(b, -1, 1, 4, 8, g + h - 0.05);
  // The sun room on the veranda (the model's floor and glazing, x −7.4 … 3.6, z −2.6 … 0): walked, kept in.
  const vx0 = -w / 2 + 0.6, vx1 = w / 2 - 4.4;
  // (Its deck downstairs, before the door: 0.28 m, a step.)
  b.block(vx0, g, -2.6, vx1, g + 0.28, 0);
  b.block(vx0, up - 0.25, -2.6, vx1, up, 0);
  b.block(vx0, up, -2.75, vx1, up + 2.6, -2.5);
  b.block(vx0 - 0.2, up, -2.6, vx0, up + 2.6, 0);
  b.block(vx1, up, -2.6, vx1 + 0.2, up + 2.6, 0);
  for (const cx of [-5.6, -3.2]) {
    piece(b, 'flat:#c9b17a', cx - 0.4, up, -1.8, cx + 0.4, up + 0.8, -1.0);
    b.deco('flat:#c9b17a', cx - 0.4, up + 0.45, -1.0, cx + 0.4, up + 1.0, -0.9);
  }
  piece(b, 'flat:#c9b17a', -4.7, up, -1.7, -4.1, up + 0.55, -1.1);
  for (const cx of [0.5, 2.6]) {
    piece(b, 'flat:#7a4a3a', cx - 0.25, up, -1.6, cx + 0.25, up + 0.5, -1.1);
    b.deco('flat:#3f6f4a', cx - 0.45, up + 0.5, -1.8, cx + 0.45, up + 1.4, -0.9);
  }
}
