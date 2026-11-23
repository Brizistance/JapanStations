// Daigaku-mae: inside the University Library (build_daigaku.py `library`, outside faces only).
// Built in the piece's own frame: the tower's front at z = 0, the wings' front wall at z = zf, the
// back at z = d, the ends at x = ±w/2; the floor is GY. The portal leads into a vaulted entrance hall
// (x ±9, z zf … 13) with the circulation counter and the card catalogue; an arch at its back opens
// into the reading room, the whole width and 14.6 m high (z 13.3 … d): long oak tables with green
// lamps, shelves round the walls under an iron gallery. The front corners are the closed stacks.
// The inner walls stand just inside the model's, with openings where its windows are, so the
// windows are real: daylight by day, the dark campus at night.

import { rng, type Builder } from '../world/builder';
import { PALETTES } from './looks/parts';

const OAK = 'wood:#5a3a24', OAK_LT = 'wood:#8a6440', PARQUET = 'wood:#6e4f33';
const PLASTER = 'paint:#efe6d2', STONE = 'paint:#cdbfa4', STONE_DK = 'paint:#a89a80', COFFER = 'paint:#e4d9c3';
/** lamps.ts INDOOR_LAMP: a globe that lights the room round it at night. */
const LAMP = 'glow:#ffe6b8';
const IRON = 'metal:#26282b', BRASS = 'metal:#b08d57', GREEN = 'glow:#5fa35a', OPAL = 'glow:#fff1d2', FELT = 'flat:#2f4a3a';
const TERRAZZO = 'terrazzo:#d6ccba', PANE = 'flat:#d4dde0';
const BOOKS = [...PALETTES.books, '#7a2a12', '#2f4a3a', '#5b3a29'];

type Hole = [number, number, number, number]; // u0, u1, y0, y1

/** Python's round(): halves to even. */
const pyRound = (v: number) => {
  const f = Math.floor(v), t = v - f;
  return Math.abs(t - 0.5) < 1e-9 ? (f % 2 === 0 ? f : f + 1) : Math.round(v);
};
/** build_plaza.py rows(): n bays over a0 … a1, their centres. */
const rows = (a0: number, a1: number, bay: number) => {
  const n = Math.max(1, pyRound((a1 - a0) / bay)), w = (a1 - a0) / n;
  return Array.from({ length: n }, (_, i) => a0 + (i + 0.5) * w);
};

export interface LibraryDims {
  w: number;
  d: number;
  h: number;
  zf: number;
  door: [number, number]; // width, height
}

export function libraryInside(b: Builder, GY: number, L: LibraryDims, seed: number) {
  const { w, d, zf } = L, X = w / 2, T = 0.3;
  const [DW, DH] = L.door, dh = DW / 2;
  const r = rng(seed * 17 + 5);
  const HALL = { x: 9, z1: 13, h: GY + 8.2 }, RR = { z0: 13.3, h: GY + 14.6 };
  const band = GY + 1.15;

  /**
   * A wall along `axis` ('x': u is x, at z = c0 … c1; 'z': u is z, at x = c0 … c1) from u0 to u1,
   * y0 to y1, with openings. Oak wainscot below `band`, `upper` above.
   */
  const wall = (axis: 'x' | 'z', c0: number, c1: number, u0: number, u1: number, y0: number, y1: number, holes: Hole[], upper = PLASTER, lower = OAK) => {
    const cuts = [...new Set([u0, u1, ...holes.flatMap(([a, e]) => [a, e])])].filter((u) => u >= u0 && u <= u1).sort((p, q) => p - q);
    const put = (ua: number, ub: number, ya: number, yb: number) => {
      for (const [p, q, m] of [[ya, Math.min(yb, band), lower], [Math.max(ya, band), yb, upper]] as [number, number, string][]) {
        if (q - p < 0.005) continue;
        if (axis === 'x') b.box(m, ua, p, c0, ub, q, c1);
        else b.box(m, c0, p, ua, c1, q, ub);
      }
    };
    for (let i = 0; i + 1 < cuts.length; i++) {
      const ua = cuts[i], ub = cuts[i + 1], um = (ua + ub) / 2;
      const open = holes.filter(([a, e]) => um > a && um < e).map(([, , p, q]): [number, number] => [p, q]).sort((p, q) => p[0] - q[0]);
      let y = y0;
      for (const [p, q] of open) {
        if (p > y) put(ua, ub, y, p);
        y = Math.max(y, q);
      }
      if (y < y1) put(ua, ub, y, y1);
    }
  };
  /** Stone sills under a wall's openings that start above the floor, on the room side `s` of plane c. */
  const sills = (axis: 'x' | 'z', c: number, s: number, holes: Hole[]) => {
    for (const [a, e, y0] of holes) {
      if (y0 < GY + 0.5) continue;
      const [p, q] = [c, c + s * 0.12].sort((m, n) => m - n);
      if (axis === 'x') b.deco(STONE, a - 0.05, y0 - 0.06, p, e + 0.05, y0, q);
      else b.deco(STONE, p, y0 - 0.06, a - 0.05, q, y0, e + 0.05);
      // Frosted panes near the outer face (the model's glass is dark from inside), glazing bars over them.
      const [g, h] = [c - s * 0.24, c - s * 0.23].sort((m, n) => m - n), [g2, h2] = [c - s * 0.23, c - s * 0.21].sort((m, n) => m - n);
      const y1 = holes.find((o) => o[0] === a && o[2] === y0)![3];
      if (axis === 'x') b.deco(PANE, a, y0, g, e, y1, h);
      else b.deco(PANE, g, y0, a, h, y1, e);
      for (let y = y0 + 0.6; y < y1 - 0.2; y += 0.6) {
        if (axis === 'x') b.deco(IRON, a, y, g2, e, y + 0.04, h2);
        else b.deco(IRON, g2, y, a, h2, y + 0.04, e);
      }
      if (axis === 'x') b.deco(IRON, (a + e) / 2 - 0.02, y0, g2, (a + e) / 2 + 0.02, y1, h2);
      else b.deco(IRON, g2, y0, (a + e) / 2 - 0.02, h2, y1, (a + e) / 2 + 0.02);
    }
  };

  // ── The model's windows (build_daigaku.py library): sides every 3.75 m, back every 4.14 m ──
  const sideC = rows(zf + 1, d - 1, 4.0).filter((c) => c - 1 > RR.z0 + 0.3);
  const backC = rows(-X + 1, X - 1, 4.0);
  const sideHoles: Hole[] = sideC.flatMap((c): Hole[] => [[c - 0.8, c + 0.8, GY + 1.6, GY + 4.2], [c - 1.0, c + 1.0, GY + 6.0, GY + 9.6], [c - 0.65, c + 0.65, GY + 11.3, GY + 13.6]]);
  const backHoles: Hole[] = backC.flatMap((c): Hole[] => [[c - 0.8, c + 0.8, GY + 1.6, GY + 4.2], [c - 1.0, c + 1.0, GY + 6.0, GY + 9.6]]);

  // ── Outer walls, just inside the model's; full-height colliders on its planes ──
  for (const s of [-1, 1]) {
    const c = s * X;
    wall('z', Math.min(c, c - s * T), Math.max(c, c - s * T), zf, d, GY, RR.h, sideHoles.filter(([a]) => a > RR.z0));
    sills('z', c - s * T, -s, sideHoles);
    b.block(Math.min(c, c + s * 0.15), GY, zf, Math.max(c, c + s * 0.15), GY + L.h, d);
  }
  wall('x', d - T, d, -X + T, X - T, GY, RR.h, backHoles);
  sills('x', d - T, -1, backHoles);
  b.block(-X, GY, d, X, GY + L.h, d + 0.15);
  // The front: the tower's mass either side of the portal, the wings' wall beyond it (the stacks behind).
  for (const s of [-1, 1]) {
    const [a, e] = [s * dh, s * 7].sort((m, n) => m - n), [f, g] = [s * 7, s * X].sort((m, n) => m - n);
    b.block(a, GY, -0.05, e, GY + 28, zf);
    b.block(f, GY, zf - 0.05, g, GY + L.h, zf + 0.15);
    const [p, q] = [s * dh, s * (dh + 0.9)].sort((m, n) => m - n);
    b.block(p, GY, -1.15, q, GY + DH, 0);
  }
  b.block(-dh, GY + DH, -0.05, dh, GY + 28, zf);
  // The hall's front wall, the portal through it, its arch head in steps; the oak doors folded back.
  const arch: Hole[] = [[-dh, dh, GY, GY + DH], [-dh * 0.87, dh * 0.87, GY + DH, GY + DH + dh * 0.5], [-dh * 0.6, dh * 0.6, GY + DH + dh * 0.5, GY + DH + dh * 0.8], [-dh * 0.3, dh * 0.3, GY + DH + dh * 0.8, GY + DH + dh * 0.96]];
  wall('x', zf, zf + T, -HALL.x, HALL.x, GY, HALL.h, arch, PLASTER, STONE);
  for (const s of [-1, 1]) {
    const [a, e] = [s * dh, s * (dh + 0.12)].sort((m, n) => m - n);
    b.deco(STONE, a, GY, zf - 0.02, e, GY + DH, zf + T + 0.02);
    const [p, q] = [s * (dh + 0.12), s * (dh + 0.12 + dh)].sort((m, n) => m - n);
    b.deco(OAK, p, GY, zf + T, q, GY + DH - 0.1, zf + T + 0.08);
    for (let y = GY + 0.6; y < GY + DH - 0.6; y += 1.15) b.deco(OAK_LT, p + 0.2, y, zf + T + 0.08, q - 0.2, y + 0.85, zf + T + 0.1);
    b.deco(BRASS, s * (dh + 2.0) - 0.03, GY + 1.0, zf + T + 0.1, s * (dh + 2.0) + 0.03, GY + 1.5, zf + T + 0.14);
  }
  b.deco(TERRAZZO, -dh, GY + 0.002, -1.1, dh, GY + 0.012, zf + T);

  // ── The entrance hall: terrazzo, a stone dado, pilasters, a coffered ceiling with a laylight ──
  b.deco(TERRAZZO, -HALL.x, GY + 0.002, zf + T, HALL.x, GY + 0.012, HALL.z1);
  for (let x = -HALL.x + 1.5; x < HALL.x; x += 1.5) b.deco('flat:#8f8676', x - 0.02, GY + 0.012, zf + T, x + 0.02, GY + 0.014, HALL.z1);
  for (const s of [-1, 1]) {
    // The side walls: the stacks behind, a closed oak door each, staff only.
    const c = s * HALL.x;
    const door: Hole[] = [[7.2, 8.8, GY, GY + 2.5]];
    wall('z', Math.min(c, c + s * T), Math.max(c, c + s * T), zf + T, HALL.z1, GY, HALL.h, door, PLASTER, STONE);
    const [p, q] = [c, c + s * 0.06].sort((m, n) => m - n);
    b.box(OAK, p, GY, 7.2, q, GY + 2.5, 8.8);
    b.deco(BRASS, Math.min(c, c - s * 0.04), GY + 1.0, 8.5, Math.max(c, c - s * 0.04), GY + 1.08, 8.65);
    b.sign({ k: 'label', text: '書庫　関係者以外立入禁止', sub: 'Stacks — staff only', fg: '#2a2019', bg: '#e6dcc6' }, c - s * 0.01, GY + 2.8, 8, [-s, 0], 1.9, 0.3);
    // Pilasters on the side walls.
    for (const z of [zf + T + 0.6, 5.6, 10.4, HALL.z1 - 0.4]) {
      const [a, e] = [c, c - s * 0.25].sort((m, n) => m - n);
      b.box(STONE, a, GY, z - 0.3, e, HALL.h, z + 0.3);
      b.deco(STONE_DK, Math.min(c, c - s * 0.32), HALL.h - 0.5, z - 0.38, Math.max(c, c - s * 0.32), HALL.h - 0.3, z + 0.38);
    }
  }
  // The ceiling: beams in a grid, a glowing laylight in the middle.
  b.deco(COFFER, -HALL.x, HALL.h, zf, HALL.x, HALL.h + 0.3, HALL.z1 + T);
  for (let x = -HALL.x + 3; x < HALL.x - 0.1; x += 3) b.deco(STONE, x - 0.15, HALL.h - 0.45, zf + T, x + 0.15, HALL.h, HALL.z1);
  for (let z = zf + T + 2.7; z < HALL.z1 - 0.1; z += 2.7) b.deco(STONE, -HALL.x, HALL.h - 0.45, z - 0.15, HALL.x, HALL.h, z + 0.15);
  b.deco('glow:#d8ccb0', -3, HALL.h - 0.02, 5.2, 3, HALL.h, 10.6);
  for (const [x, z] of [[-6, 6.5], [6, 6.5], [-6, 10.5], [6, 10.5]]) {
    b.deco(IRON, x - 0.015, HALL.h - 2.4, z - 0.015, x + 0.015, HALL.h - 0.45, z + 0.015);
    b.mesh(LAMP, 'sphere', x, HALL.h - 2.65, z, 0.5, 0.5, 0.5);
  }
  // The circulation counter, east: oak, an L round the corner, a brass lamp; the sign over it.
  {
    const x0 = 4.2, x1 = 8.2, z0 = 5.4, z1 = 11.2;
    b.box(OAK, x0, GY, z0, x0 + 0.6, GY + 1.05, z1);
    b.box(OAK, x0, GY, z0, x1, GY + 1.05, z0 + 0.6);
    b.deco(OAK_LT, x0 - 0.06, GY + 1.05, z0 - 0.06, x0 + 0.66, GY + 1.1, z1 + 0.06);
    b.deco(OAK_LT, x0 - 0.06, GY + 1.05, z0 - 0.06, x1, GY + 1.1, z0 + 0.66);
    for (let z = z0 + 0.9; z < z1 - 0.3; z += 1.1) b.deco(OAK_LT, x0 - 0.01, GY + 0.15, z, x0, GY + 0.9, z + 0.8);
    b.deco(BRASS, x0 + 0.25, GY + 1.1, 8, x0 + 0.29, GY + 1.5, 8.04);
    b.deco(GREEN, x0 + 0.1, GY + 1.45, 7.85, x0 + 0.45, GY + 1.6, 8.2);
    b.deco(PARQUET, x0 + 0.6, GY + 0.012, z0 + 0.6, x1, GY + 0.02, z1);
    b.sign({ k: 'label', text: '貸出・返却', sub: 'Circulation desk', fg: '#f0e2c0', bg: '#3d2014' }, x0 - 0.01, GY + 2.9, 8.3, [-1, 0], 2.4, 0.42);
    // A book truck and a returns shelf behind it.
    b.box(OAK, x1 - 0.4, GY, z0 + 1.4, x1, GY + 1.8, z1);
    shelfBooks(x1 - 0.4, z0 + 1.4, z1, GY, 1.8, 4, -1, 'z');
  }
  // The card catalogue, west: two banks of oak drawers, brass pulls.
  for (const z0 of [5.0, 8.6]) {
    const x0 = -8.65, x1 = -7.95, z1 = z0 + 2.6;
    b.box(OAK, x0, GY, z0, x1, GY + 1.35, z1);
    b.deco(OAK_LT, x0 - 0.03, GY + 1.35, z0 - 0.03, x1 + 0.03, GY + 1.4, z1 + 0.03);
    for (let y = GY + 0.2; y < GY + 1.25; y += 0.16) for (let z = z0 + 0.06; z < z1 - 0.1; z += 0.22) b.deco(BRASS, x1, y + 0.05, z + 0.07, x1 + 0.012, y + 0.08, z + 0.14);
  }
  b.sign({ k: 'label', text: '目録カード', sub: 'Card catalogue', fg: '#f0e2c0', bg: '#3d2014' }, -HALL.x + 0.01, GY + 2.9, 4.25, [1, 0], 1.6, 0.36);
  // A bench either side of the portal, and a notice board by the counter.
  for (const s of [-1, 1]) {
    const xc = s * 6.2;
    b.box(OAK, xc - 1.2, GY + 0.4, zf + T + 0.3, xc + 1.2, GY + 0.48, zf + T + 0.75);
    b.deco(IRON, xc - 1.1, GY, zf + T + 0.4, xc - 1.0, GY + 0.4, zf + T + 0.65);
    b.deco(IRON, xc + 1.0, GY, zf + T + 0.4, xc + 1.1, GY + 0.4, zf + T + 0.65);
  }
  b.deco('flat:#b98a5c', HALL.x - 0.02, GY + 1.3, 3.4, HALL.x, GY + 2.3, 5.2);
  for (let k = 0; k < 7; k++) {
    const z = 3.5 + r() * 1.3, y = GY + 1.35 + r() * 0.65;
    b.deco(`flat:${['#f4f1e6', '#f2c14e', '#e84a6f', '#3c7dc4'][k % 4]}`, HALL.x - 0.03, y, z, HALL.x - 0.02, y + 0.28, z + 0.21);
  }
  b.zone('street', -HALL.x + 0.4, GY - 0.2, zf + T + 0.2, HALL.x - 0.4, GY + 4, HALL.z1 - 0.2, '附属図書館 玄関ホール', 'University Library — entrance hall');

  // ── Between the hall and the reading room: a wall the whole width, a round arch in the middle ──
  const big: Hole[] = [[-2.6, 2.6, GY, GY + 4.6], [-2.25, 2.25, GY + 4.6, GY + 5.6], [-1.5, 1.5, GY + 5.6, GY + 6.3], [-0.7, 0.7, GY + 6.3, GY + 6.6]];
  wall('x', HALL.z1, RR.z0, -X + T, X - T, GY, RR.h, big, PLASTER, OAK);
  for (const s of [-1, 1]) {
    const [a, e] = [s * 2.6, s * 3.1].sort((m, n) => m - n);
    for (const [p, q] of [[HALL.z1 - 0.06, HALL.z1], [RR.z0, RR.z0 + 0.06]]) b.deco(STONE, a, GY, p, e, GY + 4.6, q);
  }
  b.sign({ k: 'label', text: '閲覧室', sub: 'Reading room', fg: '#f0e2c0', bg: '#3d2014' }, 0, GY + 7.0, HALL.z1 - 0.02, [0, -1], 2.6, 0.5);
  b.sign({ k: 'label', text: '静粛に', sub: 'Silence, please', fg: '#2a2019', bg: '#e6dcc6' }, 0, GY + 7.0, RR.z0 + 0.02, [0, 1], 1.8, 0.4);

  // ── The reading room ──
  b.deco(PARQUET, -X + T, GY + 0.002, RR.z0, X - T, GY + 0.012, d - T);
  for (let x = -X + T + 0.9; x < X - T; x += 0.9) b.deco('flat:#5a3f28', x - 0.01, GY + 0.012, RR.z0, x + 0.01, GY + 0.014, d - T);
  // Shelves round the walls below the gallery, between the ground-floor windows.
  const GAL = GY + 4.6;
  const wallShelves = (axis: 'x' | 'z', c: number, s: number, u0: number, u1: number, holes: Hole[], ya: number, yb: number) => {
    const free: [number, number][] = [];
    let u = u0;
    for (const [a, e, y0, y1] of [...holes].filter(([, , y0, y1]) => y0 < yb && y1 > ya).sort((p, q) => p[0] - q[0])) {
      if (a - 0.15 - u > 0.8) free.push([u, a - 0.15]);
      u = Math.max(u, e + 0.15);
    }
    if (u1 - u > 0.8) free.push([u, u1]);
    for (const [a, e] of free) {
      const [p, q] = [c, c + s * 0.42].sort((m, n) => m - n);
      if (axis === 'z') b.box(OAK, p, ya, a, q, yb, e);
      else b.box(OAK, a, ya, p, e, yb, q);
      shelfBooks(c + s * 0.42, a, e, ya, yb - ya, Math.round((yb - ya) / 0.42), s, axis === 'z' ? 'z' : 'x');
    }
  };
  for (const s of [-1, 1]) {
    const c = s * (X - T);
    wallShelves('z', c, -s, RR.z0 + 0.1, d - T - 0.1, sideHoles, GY, GAL - 0.4);
    wallShelves('z', c, -s, RR.z0 + 0.1, d - T - 0.1, sideHoles, GAL + 0.2, GY + 10.4);
  }
  wallShelves('x', d - T, -1, -X + T + 0.1, X - T - 0.1, backHoles, GY, GAL - 0.4);
  wallShelves('x', d - T, -1, -X + T + 0.1, X - T - 0.1, backHoles, GAL + 0.2, GY + 10.4);
  for (const s of [-1, 1]) wallShelves('x', RR.z0, 1, s > 0 ? 3.3 : -X + T + 0.1, s > 0 ? X - T - 0.1 : -3.3, big, GY, GAL - 0.4);
  // The gallery: an oak deck on iron brackets round three walls, an iron rail (out of reach: no stair).
  {
    const D = 1.2, xi = X - T - 0.42 - D, zi = d - T - 0.42 - D;
    const deck = (x0: number, z0: number, x1: number, z1: number) => {
      b.deco(OAK, x0, GAL, z0, x1, GAL + 0.2, z1);
      b.deco(IRON, x0, GAL - 0.12, z0, x1, GAL, z1);
    };
    for (const s of [-1, 1]) {
      const [a, e] = [s * xi, s * (X - T - 0.42)].sort((m, n) => m - n);
      deck(a, RR.z0 + 0.1, e, zi);
    }
    deck(-xi, zi, xi, d - T - 0.42);
    const rail = (x0: number, z0: number, x1: number, z1: number) => {
      b.deco(IRON, x0, GAL + 1.0, z0, x1, GAL + 1.05, z1);
      const alongX = x1 - x0 > z1 - z0, n = Math.floor((alongX ? x1 - x0 : z1 - z0) / 0.3);
      for (let k = 0; k <= n; k++) {
        const t = k / Math.max(1, n);
        const x = alongX ? x0 + (x1 - x0) * t : x0, z = alongX ? z0 : z0 + (z1 - z0) * t;
        b.deco(IRON, x - 0.012, GAL + 0.2, z - 0.012, x + 0.012, GAL + 1.0, z + 0.012);
      }
    };
    for (const s of [-1, 1]) rail(s * xi - 0.02, RR.z0 + 0.1, s * xi + 0.02, zi);
    rail(-xi, zi - 0.02, xi, zi + 0.02);
    for (const s of [-1, 1]) for (let z = RR.z0 + 1.6; z < zi; z += 3.0) {
      const [a, e] = [s * xi, s * (X - T - 0.42)].sort((m, n) => m - n);
      b.deco(IRON, a, GAL - 0.6, z - 0.04, e, GAL - 0.12, z + 0.04);
    }
  }
  // The ceiling: deep coffers between beams, chandeliers on long rods.
  b.deco(COFFER, -X, RR.h, RR.z0 - 0.3, X, RR.h + 0.3, d);
  for (let x = -X + 4; x < X - 1; x += 4) b.deco(STONE, x - 0.2, RR.h - 0.7, RR.z0, x + 0.2, RR.h, d - T);
  for (let z = RR.z0 + 4; z < d - 1; z += 4) b.deco(STONE, -X + T, RR.h - 0.7, z - 0.2, X - T, RR.h, z + 0.2);
  b.deco(STONE_DK, -X + T, RR.h - 1.0, RR.z0, X - T, RR.h - 0.7, RR.z0 + 0.3);
  for (const x of [-18, -6, 6, 18]) for (const z of [19, 27.5]) {
    b.deco(IRON, x - 0.02, GY + 7.6, z - 0.02, x + 0.02, RR.h - 0.7, z + 0.02);
    b.mesh(BRASS, 'cyl', x, GY + 7.5, z, 1.3, 0.08, 1.3);
    b.mesh(LAMP, 'sphere', x, GY + 7.2, z, 0.5, 0.42, 0.5);
    for (let k = 0; k < 6; k++) {
      const t = (k / 6) * Math.PI * 2;
      b.mesh(OPAL, 'sphere', x + Math.cos(t) * 0.6, GY + 7.35, z + Math.sin(t) * 0.6, 0.26, 0.3, 0.26);
    }
  }
  // Long oak tables either side of the middle aisle, a green lamp to each pair of seats.
  for (const s of [-1, 1]) for (const [ta, te] of [[3, 12], [14, 23.5]]) for (let z = 17; z < d - 3; z += 3.6) {
    const [x0, x1] = [s * ta, s * te].sort((m, n) => m - n), z0 = z - 0.55, z1 = z + 0.55;
    b.box(OAK, x0, GY + 0.74, z0, x1, GY + 0.8, z1);
    b.deco(FELT, x0 + 0.1, GY + 0.8, z0 + 0.1, x1 - 0.1, GY + 0.805, z1 - 0.1);
    for (const x of [x0 + 0.2, x1 - 0.3]) b.deco(OAK, x, GY, z0 + 0.1, x + 0.1, GY + 0.74, z1 - 0.1);
    b.block(x0, GY, z0, x1, GY + 0.8, z1);
    b.deco(OAK, x0 + 0.5, GY + 0.8, z - 0.06, x1 - 0.5, GY + 1.02, z + 0.06);
    for (let x = x0 + 1.1; x < x1 - 0.6; x += 1.5) {
      b.deco(BRASS, x - 0.02, GY + 1.02, z - 0.02, x + 0.02, GY + 1.32, z + 0.02);
      b.deco(GREEN, x - 0.26, GY + 1.3, z - 0.1, x + 0.26, GY + 1.42, z + 0.1);
      // Chairs both sides; a book open here and there.
      for (const sz of [-1, 1]) {
        const zc = z + sz * 0.95;
        b.box(OAK, x - 0.22, GY + 0.44, zc - 0.22, x + 0.22, GY + 0.49, zc + 0.22);
        b.deco(OAK, x - 0.22, GY + 0.49, zc + sz * 0.2 - 0.03, x + 0.22, GY + 0.98, zc + sz * 0.2 + 0.03);
        for (const dx of [-0.18, 0.15]) for (const dz of [-0.18, 0.15]) b.deco(OAK, x + dx, GY, zc + dz, x + dx + 0.04, GY + 0.44, zc + dz + 0.04);
        if (r() < 0.3) {
          const zb = z + sz * 0.3;
          b.deco('flat:#f4efe2', x - 0.2, GY + 0.805, zb - 0.13, x + 0.2, GY + 0.82, zb + 0.13);
          b.deco(`flat:${BOOKS[Math.floor(r() * BOOKS.length)]}`, x + 0.25, GY + 0.805, zb - 0.1, x + 0.42, GY + 0.86, zb + 0.12);
        }
      }
    }
  }
  // The issue desk at the back of the middle aisle, a clock over the arch.
  b.box(OAK, -2.2, GY, d - T - 2.6, 2.2, GY + 1.0, d - T - 2.0);
  b.deco(OAK_LT, -2.26, GY + 1.0, d - T - 2.66, 2.26, GY + 1.05, d - T - 1.94);
  b.deco(GREEN, -0.2, GY + 1.25, d - T - 2.4, 0.2, GY + 1.35, d - T - 2.2);
  b.deco(BRASS, -0.02, GY + 1.05, d - T - 2.32, 0.02, GY + 1.25, d - T - 2.28);
  b.mesh('paint:#f4efe2', 'sphere', 0, GY + 8.6, RR.z0 + 0.06, 0.9, 0.9, 0.08);
  b.deco(IRON, -0.02, GY + 8.6, RR.z0 + 0.1, 0.02, GY + 8.95, RR.z0 + 0.12);
  b.deco(IRON, -0.02, GY + 8.58, RR.z0 + 0.1, 0.28, GY + 8.62, RR.z0 + 0.12);
  b.zone('street', -X + 1.5, GY - 0.2, RR.z0 + 0.4, X - 1.5, GY + 4, d - T - 3, '附属図書館 閲覧室', 'University Library — reading room');

  /** Books on `n` shelves of a unit facing `s` (its face at c), along u0 … u1, from y0 up h. */
  function shelfBooks(c: number, u0: number, u1: number, y0: number, h: number, n: number, s: number, axis: 'x' | 'z') {
    const sh = h / n;
    for (let k = 0; k < n; k++) {
      const y = y0 + 0.08 + k * sh;
      const [p, q] = [c, c + s * 0.02].sort((m, n) => m - n);
      if (axis === 'z') b.deco(OAK_LT, p, y - 0.03, u0, q, y, u1);
      else b.deco(OAK_LT, u0, y - 0.03, p, u1, y, q);
      for (let u = u0 + 0.04; u < u1 - 0.1;) {
        const run = Math.min(u1 - 0.04 - u, 0.25 + r() * 0.5), top = y + sh * (0.62 + r() * 0.25);
        const col = `flat:${BOOKS[Math.floor(r() * BOOKS.length)]}`;
        const [m, o] = [c - s * 0.3, c + s * 0.005].sort((v, w) => v - w);
        if (axis === 'z') b.deco(col, m, y, u, o, top, u + run);
        else b.deco(col, u, y, m, u + run, top, o);
        u += run + (r() < 0.15 ? 0.12 : 0.01);
      }
    }
  }
}
