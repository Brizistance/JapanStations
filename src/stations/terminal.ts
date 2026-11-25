// Inside 川湊港フェリーターミナル (2026-11-24, stage 2 of Kawaminato-kō's rebuild): the waiting hall of the ferry
// terminal on the quay. The ticket windows along the west wall, the route board by the door (routes only: the
// timetable is the shipping line's, so no times are shown), rows of benches facing the harbour windows, a kiosk
// café, coin lockers, the glass doors out to the gangway; the lift from the harbour gates below comes up by the
// back wall (atrium.ts). Station frame (the street's), floor at GROUND_Y.

import type { Builder } from '../world/builder';
import { GROUND_Y as GY, ceilingLight } from './kit';

type Rect = [number, number, number, number];

/**
 * The hall's fittings. x0 … x1 the inside faces of the end walls, z0 the front wall (outside face), z1 the back wall's
 * outside face, t the walls' thickness; `holes` the openings in its floor (exit 5's stair, the lift), `back` the back
 * doors' x range, `front` the front doors'.
 */
export function terminalHall(b: Builder, cx: number, z0: number, z1: number, x0: number, x1: number, t: number, holes: Rect[], back: [number, number], front: [number, number]) {
  const zi0 = z0 + t, zi1 = z1 - t;
  // What must stay clear: each opening with 1.5 m round it (2.5 m before the lift's doors on its −x side), the
  // aprons inside both sets of doors, the lookout tower's foot.
  const keep: Rect[] = [
    ...holes.map((q): Rect => [q[0] - 2.5, q[1] - 1.5, q[2] + 1.5, q[3] + 1.5]),
    [front[0] - 1, zi0, front[1] + 1, zi0 + 5],
    [back[0] - 1.5, zi1 - 5, back[1] + 1.5, zi1],
    [cx + 27 - 3 - 3.2, z0 + 2.5, x1, z0 + 8.5],
  ];
  // (The kiosk's corner and the lockers, kept before the benches go down.)
  keep.push([back[1] + 2, zi1 - 8.5, x1, zi1], [x1 - 2.5, z0 + 9, x1, z0 + 17]);
  const clear = (r: Rect) => !keep.some((q) => r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1]);
  const solid = (mat: string, x0b: number, y0: number, z0b: number, x1b: number, y1: number, z1b: number) => b.box(mat, x0b, y0, z0b, x1b, y1, z1b, true);

  // ── The ticket windows along the west wall: a counter, the clerks' screen and windows, the board over them ──
  {
    const cz0 = zi0 + 6, cz1 = Math.min(zi1 - 6, cz0 + 12), cxx = x0 + 2.4;
    solid('wood:#5a3a26', cxx, GY, cz0, cxx + 0.7, GY + 1.05, cz1);
    b.deco('flat:#e8e4da', cxx - 0.05, GY + 1.05, cz0, cxx + 0.8, GY + 1.1, cz1);
    // The glass over the counter, the windows' numbers, the clerks' room behind (closed at both ends).
    b.deco('glassTint', cxx + 0.3, GY + 1.1, cz0, cxx + 0.34, GY + 2.4, cz1);
    b.deco('flat:#1d3550', cxx + 0.25, GY + 2.4, cz0, cxx + 0.4, GY + 2.8, cz1);
    for (const z of [cz0, cz1 - 0.2]) solid('panel:#e3e7ea', x0, GY, z, cxx + 0.7, GY + 2.8, z + 0.2);
    for (let k = 0; k < 4; k++) {
      const z = cz0 + 1.5 + k * ((cz1 - cz0 - 3) / 3);
      b.sign({ k: 'label', text: `${k + 1}`, sub: k < 3 ? '乗船券 Tickets' : '団体 Groups', fg: '#ffffff', bg: '#1d3550' }, cxx + 0.42, GY + 2.6, z, [1, 0], 0.9, 0.34);
      b.deco('flat:#c9b17a', cxx + 0.72, GY + 1.1, z - 0.3, cxx + 0.8, GY + 1.14, z + 0.3);
    }
    b.sign({ k: 'label', text: '乗船券うりば', sub: 'Ferry tickets', fg: '#ffffff', bg: '#1d3550' }, x0 + 0.06, GY + 4.0, (cz0 + cz1) / 2, [1, 0], 5, 0.8);
    keep.push([x0, cz0 - 1, cxx + 3.5, cz1 + 1]);
  }

  // ── The route board by the front doors: where the line sails (no times: ask at the windows) ──
  {
    const bx = front[0] - 4.5, bz = zi0 + 3.2;
    solid('metal:#3d5560', bx - 0.06, GY, bz - 0.06, bx + 0.06, GY + 3.2, bz + 0.06);
    solid('metal:#3d5560', bx + 2.94, GY, bz - 0.06, bx + 3.06, GY + 3.2, bz + 0.06);
    b.deco('flat:#1d3550', bx, GY + 1.2, bz - 0.04, bx + 3, GY + 3.2, bz + 0.04);
    b.block(bx, GY, bz - 0.1, bx + 3, GY + 3.2, bz + 0.1);
    b.sign({ k: 'label', text: '航路のご案内', sub: 'Routes · 新鴎島 Shin-Kamome-jima · 南港 Nankō · 紺屋浜 Kon’yahama', fg: '#ffffff', bg: '#1d3550' }, bx + 1.5, GY + 2.6, bz + 0.05, [0, 1], 2.8, 0.7);
    b.sign({ k: 'label', text: '出航時刻は窓口でご確認ください', sub: 'Ask at the ticket windows for sailing times', fg: '#1d3550', bg: '#f4f1e8' }, bx + 1.5, GY + 1.6, bz + 0.05, [0, 1], 2.8, 0.5);
    keep.push([bx - 0.5, bz - 0.8, bx + 3.5, bz + 1.6]);
  }

  // ── The waiting benches: rows facing the harbour (south), aisles between ──
  for (let z = zi0 + 9; z < zi1 - 5.5; z += 2.6) {
    for (let x = x0 + 9; x < x1 - 7; x += 5.2) {
      const r: Rect = [x, z, x + 4.2, z + 0.7];
      if (!clear([r[0] - 0.6, r[1] - 0.8, r[2] + 0.6, r[3] + 0.8])) continue;
      for (const lx of [x + 0.2, x + 4.0]) b.deco('metal:#8d9399', lx - 0.05, GY, z + 0.1, lx + 0.05, GY + 0.44, z + 0.6);
      b.deco('flat:#1f5fae', x, GY + 0.42, z + 0.05, x + 4.2, GY + 0.5, z + 0.65);
      b.deco('flat:#1f5fae', x, GY + 0.5, z, x + 4.2, GY + 0.95, z + 0.08);
      b.block(x, GY, z, x + 4.2, GY + 0.5, z + 0.7);
    }
  }

  // ── The kiosk café in the south-east corner: a counter, the coffee machine, shelves, two high tables ──
  {
    const kx0 = back[1] + 3, kx1 = Math.min(x1 - 1, kx0 + 8), kz0 = zi1 - 5, kz1 = zi1;
    if (kx1 - kx0 > 5) {
      solid('wood:#8a6a4c', kx0, GY, kz0, kx1, GY + 1.05, kz0 + 0.7);
      b.deco('flat:#2f5a46', kx0, GY + 1.05, kz0 - 0.05, kx1, GY + 1.1, kz0 + 0.75);
      solid('wood:#8a6a4c', kx0, GY, kz0, kx0 + 0.7, GY + 1.05, kz1);
      solid('metal:#b9bdc2', kx0 + 1.5, GY, kz1 - 0.7, kx1, GY + 0.95, kz1);
      b.deco('flat:#1f2326', kx0 + 2, GY + 0.95, kz1 - 0.6, kx0 + 2.8, GY + 1.6, kz1 - 0.1);
      for (let y = 1.3; y < 2.8; y += 0.5) b.deco('wood:#5a3a26', kx0 + 3.2, GY + y, kz1 - 0.35, kx1 - 0.2, GY + y + 0.04, kz1 - 0.05);
      b.sign({ k: 'label', text: '喫茶 みなと', sub: 'Kissa Minato · coffee & ekiben', fg: '#f4f1e8', bg: '#2f5a46' }, (kx0 + kx1) / 2, GY + 3.0, kz0 - 0.02, [0, -1], 3.2, 0.5);
      for (const tx of [kx0 + 1.5, kx0 + 4.5]) {
        const tz = kz0 - 2.2;
        solid('metal:#3d5560', tx - 0.06, GY, tz - 0.06, tx + 0.06, GY + 1.05, tz + 0.06);
        b.deco('wood:#8a6a4c', tx - 0.4, GY + 1.05, tz - 0.4, tx + 0.4, GY + 1.1, tz + 0.4);
      }
      keep.push([kx0 - 1, kz0 - 3, kx1, kz1]);
    }
  }

  // ── Coin lockers along the east wall, a hanging boarding sign over the back doors, the lights ──
  {
    const lz0 = z0 + 10, lz1 = Math.min(zi1 - 6, lz0 + 6);
    solid('metal:#c9ced2', x1 - 0.6, GY, lz0, x1, GY + 1.9, lz1);
    for (let z = lz0 + 0.5; z < lz1; z += 0.5) for (let y = 0.2; y < 1.8; y += 0.45) b.deco('metal:#8d9399', x1 - 0.62, GY + y, z - 0.2, x1 - 0.6, GY + y + 0.38, z + 0.2);
    b.sign({ k: 'label', text: 'コインロッカー', sub: 'Coin lockers', fg: '#1d3550', bg: '#f4f1e8' }, x1 - 0.63, GY + 2.2, (lz0 + lz1) / 2, [-1, 0], 1.8, 0.4);
    const bc = (back[0] + back[1]) / 2;
    b.deco('flat:#25282b', bc - 0.02, GY + 3.6, zi1 - 1.02, bc + 0.02, GY + 8.8, zi1 - 0.98);
    b.sign({ k: 'label', text: 'のりば　乗船口', sub: 'Boarding · to the ferry', fg: '#ffffff', bg: '#1f5fae' }, bc, GY + 3.3, zi1 - 1.06, [0, -1], 3.2, 0.6);
    b.sign({ k: 'label', text: 'のりば　乗船口', sub: 'Boarding · to the ferry', fg: '#ffffff', bg: '#1f5fae' }, bc, GY + 3.3, zi1 - 0.94, [0, 1], 3.2, 0.6);
    // A large map of the line's routes on the west end wall, over the windows' room.
    b.sign({ k: 'mural', v: 'harbour', color: '#1d4f7a' }, x0 + 0.06, GY + 6.2, (zi0 + zi1) / 2, [1, 0], 12, 3.6);
    for (let x = x0 + 6; x < x1 - 6; x += 6) ceilingLight(b, x, x + 2.4, zi1 - 4.22, zi1 - 3.78, GY + 8.8);
  }
}
