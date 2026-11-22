// The Silk Exchange opened up (紬橋絹取引所; stage 2 of the 2026-11 rebuild of Tsumugibashi).
//
// Inside the 1926 building, east of the rotunda's drum (squared off by rotunda.ts's colliders):
//   取引所ホール, the old trading floor (立会場), a double-height hall: brokers' booths in two rows,
//   an info desk, a café corner, the restored price board on the back wall, a clock over the
//   door. The Grand Stair comes up from the rotunda through an arch in the drum's face, in a well
//   in the floor.
//   2階 回廊・絹の資料室, the gallery: round three sides of the hall on columns, and on round the
//   drum (the front, west and back strips), with the silk museum's cases on its walls. A stair
//   and a lift from the hall; the footbridge's arm ramps down into its door in the front
//   (tsumugibashi-street.ts).
//
// What you see is a model (tools/blender/build_exchange.py, `inside`, sharing the numbers in EXCH);
// what you bump into is here. Everything in the building's own frame: origin mid-frontage on the
// pavement, +z into the lot.

import { linesAt } from '../data/network';
import { GROUND_Y as GY, stairs, type Ctx } from './kit';
import { lift } from './lift';

/** Shared with build_exchange.py (inside). x0, x1, z0, z1 rectangles in the building's frame. */
export const EXCH = {
  /** The gallery floor and the ceiling, above the pavement. */
  F2: 4.6, CEIL: 8.9,
  /** The drum's squared core (rotunda.ts colliders, CX ± R + 0.6). */
  CORE: [-20.55, 2.65, 2.2, 25.4],
  /** The hall's open middle. */
  VOID: [2.65, 19.1, 3.4, 24.6],
  /** The Grand Stair's well (rotunda.ts XS … XT, CZ ± SH). */
  WELL: [2.45, 12.17, 10.3, 17.3],
  /** The second-floor door in the front (x), for the footbridge's link. */
  DOOR2: [-16.05, -13.65],
  /** The stair up to the gallery, climbing +x. */
  STAIR2: [10.5, 19.1, 21.8, 24.2],
  /** The lift: the middle of its doors (x, z); it faces +z. */
  LIFT: [21.4, 2.7],
  COLS: [[6.0, 3.4], [10.0, 3.4], [6.0, 24.6], [10.0, 24.6], [19.1, 8.5], [19.1, 13.0], [19.1, 17.5], [19.1, 3.4]],
} as const;

export function exchangeHall(c: Ctx, o: { x0: number; x1: number; zf: number; door: [number, number]; well: [number, number, number, number] }) {
  const { b, station } = c;
  const lines = linesAt(station.id).map((l) => l.id);
  const MX = (o.x0 + o.x1) / 2, MZ = o.zf;
  const { F2, CEIL } = EXCH;
  const [cx0, cx1, cz0, cz1] = EXCH.CORE, [vx0, vx1, vz0, vz1] = EXCH.VOID, [w0, w1, wz0, wz1] = EXCH.WELL, [s0, s1, s2, s3] = EXCH.STAIR2, [e0, e1] = EXCH.DOOR2;
  const well = [o.well[0] - MX, o.well[1] - MZ, o.well[2] - MX, o.well[3] - MZ];
  if ([w0 - well[0], wz0 - well[1], w1 - well[2], wz1 - well[3]].some((d) => Math.abs(d) > 0.05)) throw new Error(`${station.id}: the Grand Stair's well moved; build_exchange.py WELL (and EXCH) must follow it`);
  const top = GY + 9.2, f2 = GY + F2;
  b.with({ t: [MX, 0, MZ] }, () => {
    const d0 = o.door[0] - MX, d1 = o.door[1] - MX;
    b.model('exchange', 'inside', 0, GY, 0);

    // ── The outer walls (the models draw both faces), with the door on the avenue and the gallery's door ──
    for (const [a, e, ya, yb] of [[-22.95, e0, GY, top], [e0, e1, GY, f2], [e0, e1, f2 + 2.2, top], [e1, d0, GY, top], [d0, d1, GY + 3.2, top], [d1, 22.95, GY, top]]) b.block(a, ya, 0.05, e, yb, 0.5);
    // (The gallery's doorway has a floor through the wall's depth, from the footbridge's link.)
    b.block(e0, f2 - 0.3, 0.05, e1, f2, 0.5);
    b.block(-22.95, GY, 27.5, 22.95, top, 27.95);
    b.block(22.5, GY, 0.05, 22.95, top, 27.95);
    b.block(-22.95, GY, 0.05, -22.5, top, 27.95);

    // ── The trading floor ──
    b.slab('floor:#d9d0bd', cx1, 0.5, 22.5, 27.5, GY, GY + 0.012, [[w0, wz0, w1, wz1]], false);
    for (let x = cx1 + 1; x < 22; x += 3) b.deco('floor:#8d8371', x, GY + 0.012, 0.5, x + 0.08, GY + 0.016, 27.5);
    // The ring round the drum is closed at street level (staff doors).
    for (const [za, zb] of [[0.5, cz0], [cz1, 27.5]]) b.block(cx1, GY, za, cx1 + 0.1, f2 - 0.3, zb);
    // A stone balustrade on the stair walls either side of the well.
    for (const [za, zb] of [[wz0 - 0.4, wz0], [wz1, wz1 + 0.4]]) {
      b.block(cx1, GY, za, w1, GY + 1.1, zb);
      b.deco('flat:#c4b89f', cx1, GY, za, w1, GY + 0.9, zb);
      b.deco('metal:#b08d3a', cx1, GY + 0.9, za - 0.03, w1, GY + 0.98, zb + 0.03);
    }
    // Brokers' booths north of the well, the café's tables south-west of it, the info desk and the café's counter
    // against the east wall: the way in from the door and up from the Grand Stair stays clear.
    for (const xb of [3.2, 5.6, 8.0, 10.4]) b.block(xb, GY, 4.2, xb + 2.0, GY + 1.1, 5.4);
    b.block(21.0, GY, 8.0, 22.05, GY + 1.12, 12.0);
    for (const xt of [4.4, 7.4]) for (const zt of [20.0, 22.8]) b.block(xt - 0.8, GY, zt - 0.45, xt + 0.8, GY + 0.8, zt + 0.45);
    b.block(20.2, GY, 13.0, 22.4, GY + 1.12, 18.5);
    for (const [x, z] of EXCH.COLS) b.block(x - 0.42, GY, z - 0.42, x + 0.42, f2 - 0.3, z + 0.42);
    b.zone('concourse', cx1, GY - 0.2, 0.5, 22.5, f2 - 0.3, 27.5, '取引所ホール（旧立会場）', 'Exchange Hall — the old trading floor');

    // ── The gallery: its floor (the lift's shaft left out), its balustrade round the void ──
    const slabs = [[-22.5, cx1, 0.5, cz0], [cx1, 20.2, 0.5, vz0], [20.2, 22.5, 2.75, vz0], [-22.5, cx0, cz0, cz1], [-22.5, cx1, cz1, 27.5], [cx1, 22.5, vz1, 27.5], [vx1, 22.5, vz0, vz1]];
    for (const [a, e, za, zb] of slabs) {
      b.block(a, f2 - 0.3, za, e, f2, zb);
      b.deco('floor:#cdbfa6', a, f2, za, e, f2 + 0.008, zb);
    }
    b.block(vx0, f2, vz0 - 0.15, vx1, f2 + 1.1, vz0 + 0.15);
    b.block(vx0, f2, vz1 - 0.15, vx1, f2 + 1.1, vz1 + 0.15);
    b.block(vx1 - 0.15, f2, vz0, vx1 + 0.15, f2 + 1.1, s2);
    b.block(vx1 - 0.15, f2, s3, vx1 + 0.15, f2 + 1.1, vz1);
    // The museum's cases on its walls.
    b.block(-22.5, f2, cz0 + 0.5, -21.9, f2 + 2.2, cz1 - 0.5);
    b.block(-21.5, f2, 26.9, cx1 - 0.5, f2 + 2.2, 27.5);
    b.block(4.0, f2, 26.9, 17.0, f2 + 2.2, 27.5);
    b.block(21.9, f2, vz0 + 0.8, 22.5, f2 + 2.2, s2 - 0.6);
    b.zone('concourse', -22.5, f2 - 0.2, 0.5, 22.5, GY + CEIL, 27.5, '2階 回廊・絹の資料室', 'Gallery (2F) — Silk Museum');

    // ── Up to it: a stair from the hall, and a lift in the north-east corner ──
    // Stone steps, a bronze balustrade on both sides (the gallery's own).
    stairs(b, { x0: s0, x1: s1, z0: s2, z1: s3, yLow: GY, yHigh: f2, mat: 'floor:#cfc6b2', rails: [false, false] });
    {
      const n = 28, run = (s1 - s0) / n, rise = F2 / n;
      for (let i = 0; i < n; i++) {
        const xa = s0 + i * run, y = GY + (i + 1) * rise;
        for (const [za, zc] of [[s2 - 0.08, s2], [s3, s3 + 0.08]]) {
          b.block(xa, y, za, xa + run, y + 1.0, zc);
          b.deco('flat:#5a4630', xa, y + 0.95, za - 0.02, xa + run + 0.01, y + 1.03, zc + 0.02);
          b.deco('flat:#5a4630', xa + run / 2 - 0.02, y, (za + zc) / 2 - 0.02, xa + run / 2 + 0.02, y + 0.95, (za + zc) / 2 + 0.02);
        }
      }
    }
    b.with({ rot: 2, t: [EXCH.LIFT[0], 0, EXCH.LIFT[1]] }, () => lift(b, { levels: [
      { y: GY, ja: '1階 取引所ホール', en: '1F Exchange Hall' }, { y: f2, ja: '2階 回廊・絹の資料室', en: '2F Gallery / Silk Museum' },
    ] }));

    // ── Signs: the clock, the price board's title, the building's name over the arch, the museum, the ways ──
    b.sign({ k: 'clock' }, (d0 + d1) / 2, GY + 6.7, 0.6, [0, 1], 1.3, 1.3, { dynamic: true });
    b.sign({ k: 'label', text: '生糸相場表　大正十五年（復元）', sub: 'Raw silk prices, 1926 — the board restored', fg: '#e8dcc0', bg: '#2a2019' }, 10.5, GY + 8.3, 27.33, [0, -1], 9, 0.32);
    b.sign({ k: 'label', text: '紬橋絹取引所', sub: 'Tsumugibashi Silk Exchange · 1926', fg: '#e8dcc0', bg: '#4a3324' }, cx1 + 0.12, GY + 5.6, (wz0 + wz1) / 2, [1, 0], 5, 0.9);
    for (const [z, n] of [[cz0 - 0.12, -1], [cz1 + 0.12, 1]] as const) {
      b.sign({ k: 'label', text: '絹の資料室', sub: 'Silk Museum — the silks and looms of Tsumugibashi', fg: '#f3e3c0', bg: '#2a2019' }, -9, f2 + 2.6, z, [0, n], 4.6, 0.6);
    }
    b.sign({ k: 'guide', ja: '紬橋歩道橋・紬通', en: 'Footbridge / Tsumugi-dōri', bg: 'white', arrow: 'up' }, (e0 + e1) / 2, f2 + 2.55, 0.56, [0, 1], 3.2, 0.42);
    b.sign({ k: 'guide', ja: '出口　紬通', en: 'Exit — Tsumugi-dōri', bg: 'yellow', arrow: 'up' }, (d0 + d1) / 2, GY + 3.6, 0.56, [0, 1], 3.6, 0.42);
    b.hang(
      { k: 'guide', ja: 'のりば', en: 'To trains', bg: 'navy', badges: lines, arrow: 'up' },
      w1 + 0.5, GY + 3.1, (wz0 + wz1) / 2, 5.2, 0.5,
      { ceil: GY + CEIL, back: { k: 'guide', ja: '出口・取引所ホール', en: 'Exit / Exchange Hall', bg: 'yellow', arrow: 'up' } },
    );
    // On the east wall, between its windows: the fare map, the info desk's board, the café's board.
    b.sign({ k: 'faremap', station: station.id }, 22.48, GY + 1.75, 5.6, [-1, 0], 3.0, 1.7);
    b.sign({ k: 'label', text: '案内所', sub: 'Information', fg: '#f3e3c0', bg: '#4a3324' }, 22.47, GY + 1.55, 10.0, [-1, 0], 1.6, 0.36);
    b.sign({ k: 'label', text: '喫茶 立会場', sub: 'Café Tachiaiba', fg: '#f3e3c0', bg: '#4a3324' }, 22.47, GY + 2.4, 16.4, [-1, 0], 2.4, 0.5);
    // Opposite the gallery's door from the footbridge: which way the hall and the museum lie.
    b.sign({ k: 'guide', ja: '取引所ホール・絹の資料室', en: 'Exchange Hall / Silk Museum', bg: 'white', arrow: 'left' }, (e0 + e1) / 2, f2 + 3.95, cz0 - 0.22, [0, -1], 4.4, 0.42);
    // Bronze lamps by the info desk.
    for (const z of [7.4, 12.6]) {
      b.block(21.3, GY, z - 0.22, 21.74, GY + 3.6, z + 0.22);
      b.model('tsumugi', 'lamp', 21.52, GY, z);
    }
  });
}
