// Shin-Hibarino (新雲雀野): a long transfer tunnel. The Kikyō Line's terminus has the concourse;
// the Ichō Line crosses 100 m further west, deep under the Kikyō tail tracks (StationDef.at).
// From the paid concourse a broad tunnel runs out west at concourse level, with a moving walkway
// each way down it, a lit ceiling and the two lines' colours along its walls, to the head of one
// long flight (stair between two escalators' worth of width) down onto the Ichō island.
//
// Frame: the Kikyō Line's (+x along it). The Ichō platform's centre is at x = gx, along z.

import { HALL_HALF } from '../sim/geometry';
import { islandUnit, quarterTurns, stairInfo, type Rect } from './build';
import { CONC_CLEAR, SLAB, ceilingLight, escalator, hall, hallDims, type Ctx } from './kit';

/** The tunnel's doorway in the concourse's +z wall (x range), and its width. */
export const TUNNEL_DOOR: [number, number] = [-26, -22];
const TW = 5.2;

type Other = { ctx: Ctx; dir: [number, number]; primaryDir: [number, number]; x: number };

export function buildTransfer(c: Ctx, cf: number, cw: number, other: Other): { stairs: ReturnType<typeof stairInfo>[] } {
  const { b, station, style, line } = c;
  const o = other.ctx, gx = other.x;
  if (gx > -40) throw new Error(`${station.id}: transfer.ts expects the other line well to the west (x = ${gx})`);
  const dL = hallDims(o.line, o.railY), pfL = dL.pf;
  const run = Math.round((cf - pfL) * 1.7 * 100) / 100;
  const z0 = cw, z1 = cw + TW, top = cf + CONC_CLEAR;
  const xE = TUNNEL_DOOR[1], xW = gx - 3;
  const wall = style.concWall, floor = style.floor;
  if (z1 + run > 58 - 4) throw new Error(`${station.id}: the flight down (${run} m) does not land on the platform`);

  // ── The tunnel ──
  b.box(floor, xW, cf - 0.5, z0, xE, cf, z1);
  b.box(wall, xW - 0.3, cf, z0 - 0.3, xW, top, z1 + 0.3);
  b.box(wall, xE, cf, z0, xE + 0.3, top, z1 + 0.3);
  // South wall (beside the concourse): solid past the concourse's west end.
  const cx0 = TUNNEL_DOOR[0] - 4;
  b.box(wall, xW, cf, z0 - 0.3, cx0, top, z0);
  // North wall, with the opening to the flight down at x = gx.
  b.box(wall, xW, cf, z1, gx - 3.8, top, z1 + 0.3);
  b.box(wall, gx + 2.2, cf, z1, xE, top, z1 + 0.3);
  b.box(wall, gx - 3.8, cf + 2.4, z1, gx + 2.2, top, z1 + 0.3);
  b.box('ceil', xW - 0.3, top, z0 - 0.3, xE + 0.3, top + 0.4, z1 + 0.3);
  // A lit ceiling: a continuous light line down each side, panels between.
  for (const zl of [z0 + 1.0, z1 - 1.0]) b.deco('light', xW + 0.5, top - 0.03, zl - 0.12, xE - 0.5, top - 0.01, zl + 0.12);
  for (let x = xW + 2; x + 2 < xE; x += 4) ceilingLight(b, x, x + 2, (z0 + z1) / 2 - 0.3, (z0 + z1) / 2 + 0.3, top);
  // The two lines' colours along the walls, the Kikyō purple fading out west into Ichō gold.
  const n = 16;
  for (let k = 0; k < n; k++) {
    const xa = xE - ((xE - xW) * k) / n, xb = xE - ((xE - xW) * (k + 1)) / n;
    const col = k < n / 2 ? line.color : o.line.color;
    for (const [za, zb] of [[z0, z0 + 0.03], [z1 - 0.03, z1]]) {
      if (za === z0 && xb > cx0) continue;
      b.deco(`paint:${col}`, Math.min(xa, xb), cf + 1.2, za, Math.max(xa, xb), cf + 1.4, zb);
    }
  }
  // Skylark meadow panels on the north wall: pale sky over green hills, between the light boxes.
  for (let x = xW + 6; x + 6 < xE - 2; x += 10) {
    if (Math.abs(x + 3 - gx) < 6) continue;
    b.deco('flat:#dfeef6', x, cf + 1.5, z1 - 0.04, x + 6, cf + 2.6, z1 - 0.02);
    b.deco('flat:#9cbf4a', x, cf + 1.5, z1 - 0.05, x + 6, cf + 1.85, z1 - 0.03);
    b.deco('flat:#3a3a3a', x + 2.4, cf + 2.2, z1 - 0.06, x + 2.7, cf + 2.27, z1 - 0.04);
    b.deco('flat:#3a3a3a', x + 4.1, cf + 2.35, z1 - 0.06, x + 4.35, cf + 2.41, z1 - 0.04);
  }
  // Moving walkways, one each way, with low dark balustrades (decoration: you may step off).
  const mw0 = gx + 6, mw1 = xE - 3;
  for (const [za, zb, dir] of [[z0 + 0.9, z0 + 2.1, -1], [z1 - 2.1, z1 - 0.9, 1]] as const) {
    b.ramp(mw0, za, mw1, zb, cf, cf, [dir, 0], 0.7);
    b.deco('flat:#3b3f44', mw0, cf, za, mw1, cf + 0.03, zb);
    for (let x = mw0; x < mw1; x += 0.8) b.deco('flat:#55595e', x, cf + 0.03, za + 0.05, x + 0.05, cf + 0.035, zb - 0.05);
    for (const zr of [za - 0.08, zb]) {
      b.deco('metal:#b4b9be', mw0, cf, zr, mw1, cf + 0.9, zr + 0.08);
      b.deco('flat:#2b2e33', mw0, cf + 0.9, zr - 0.02, mw1, cf + 0.98, zr + 0.1);
    }
    // Comb plates at both ends, yellow-edged.
    for (const x of [mw0, mw1 - 0.4]) b.deco('flat:#e2b100', x, cf + 0.03, za, x + 0.4, cf + 0.04, zb);
  }
  b.hang({ k: 'guide', ja: `${o.line.nameJa} のりかえ`, en: `Transfer: ${o.line.nameEn}`, bg: 'white', badges: [o.line.id], arrow: 'left' }, xE - 5, cf + 2.5, (z0 + z1) / 2, 3.8, 0.44, {
    ceil: top, back: { k: 'guide', ja: '出口・改札', en: 'Exit / Ticket gates', bg: 'yellow', arrow: 'up' },
  });
  b.hang({ k: 'guide', ja: `${line.nameJa} のりば・出口`, en: `${line.nameEn} / Exit`, bg: 'white', badges: [line.id], arrow: 'left' }, gx + 4, cf + 2.5, (z0 + z1) / 2, 3.8, 0.44, { ceil: top });
  b.zone('passage', xW, cf - 0.3, z0, xE, top, z1, `${o.line.nameJa} のりかえ通路`, `Transfer tunnel: ${o.line.nameEn}`);

  // ── The flight down to the Ichō island, under its own shaft ──
  let hole: Rect = [0, 0, 0, 0];
  let info: ReturnType<typeof stairInfo> | null = null;
  b.with({ rot: 3, t: [gx, 0, z1 + run] }, () => {
    hole = islandUnit(b, pfL, cf, run, null);
    info = stairInfo(b, o.line, 'platform', [...station.platforms[o.line.id]], hole, run + 0.8, 0, [-1, 0]);
    // A down escalator beside the stair.
    escalator(b, { x0: 0, x1: run, z0: -3.4, z1: -2.0, yLow: pfL, yHigh: cf, dir: -1 });
  });
  const roof = pfL + 4.5 + SLAB;
  for (const s of [-1, 1]) b.box(wall, s > 0 ? gx + 1.9 : gx - 3.8, roof, z1 + 0.3, s > 0 ? gx + 2.2 : gx - 3.5, top, z1 + run);
  b.box(wall, gx - 3.8, roof, z1 + run, gx + 2.2, top, z1 + run + 0.3);
  b.box('ceil', gx - 3.8, top, z1, gx + 2.2, top + 0.4, z1 + run + 0.3);
  b.deco('light', gx - 0.8, top - 0.03, z1 + 1, gx + 0.2, top - 0.01, z1 + run - 1);

  // ── The Ichō hall, turned to its own direction ──
  // Which way its own x runs in this frame decides which side of its centre the flight lands.
  b.with({ t: [gx, 0, 0] }, () => {
    const turns = quarterTurns(other.primaryDir, other.dir);
    b.with({ rot: turns }, () => {
      const p0 = b.pt(0, 0, 0), p1 = b.pt(1, 0, 0);
      const sx = Math.sign(p1[2] - p0[2]) || 1;
      const [a, e] = sx > 0 ? [z1, z1 + run] : [-(z1 + run), -z1];
      // The escalator stands on the stair's −x side in this frame; cut the ceiling for both.
      const zx = Math.sign(b.pt(0, 0, 1)[0] - p0[0]) || 1;
      const [c0, c1] = zx > 0 ? [-3.8, 2.2] : [-2.2, 3.8];
      hall(o, {
        ceil: [{ x0: -HALL_HALF, x1: HALL_HALF, y: pfL + 4.5, emit: true }],
        blocks: [[a, e]],
        ceilHoles: [[a, c0, e, c1]],
      });
    });
  });
  return { stairs: info ? [info] : [] };
}

