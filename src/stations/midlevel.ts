// Harunodai (春野台): a shared mid-level concourse. The Sumire Line runs east–west near the
// surface, the Ichō Line north–south deep below; the one ticket hall sits between them, halfway
// down. From it two stairs climb up through its ceiling to the Sumire island, and two flights
// go down through its floor to the Ichō island, so a transfer is one flight up or down from a
// single hall. The exits climb from the hall's long walls to the street.
//
// Frame: +x along the Sumire Line (the primary), the Ichō Line along z.
//
//   level  y      what
//   B1     pfU    Sumire island platform
//   B2     cf     the ticket hall: gates east and west, exits 1–4, both lines' stairs
//   B3     pfL    Ichō island platform

import { HALL_HALF } from '../sim/geometry';
import { MIRROR_X, concourse, islandUnit, quarterTurns, stairInfo, type Rect } from './build';
import { MID, midCf } from './exits';
import { CONC_CLEAR, SLAB, hall, hallDims, type Ctx } from './kit';
import type { InterchangeSpec } from './specs';
import { surface } from './surface';

/** Each flight's top stands this far from the crossing point. */
const NEAR = 5.5;

type Other = { ctx: Ctx; dir: [number, number]; primaryDir: [number, number] };

export function buildMidLevel(c: Ctx, spec: InterchangeSpec, other: Other) {
  const { b, line, station, style } = c;
  const o = other.ctx;
  const dU = hallDims(line, c.railY), dL = hallDims(o.line, o.railY);
  const pfU = dU.pf, pfL = dL.pf, cf = midCf(pfU, pfL), top = cf + CONC_CLEAR;
  const runU = Math.round((pfU - cf) * 1.7 * 100) / 100, runL = Math.round((cf - pfL) * 1.7 * 100) / 100;
  const lRoof = pfL + 4.5 + SLAB;
  if (top + 0.5 > c.railY - 1) throw new Error(`${station.id}: the hall's roof (${top + 0.5}) must pass under the ${line.nameEn} (${c.railY - 1})`);
  if (cf - SLAB < lRoof + 0.3) throw new Error(`${station.id}: the hall's floor (${cf - SLAB}) must clear the ${o.line.nameEn} roof (${lRoof})`);
  const wall = style.concWall;

  // ── Upper line: its island, with stairs arriving from below at both ends of the crossing ──
  const up: { x: number; dir: 1 | -1 }[] = [{ x: -(NEAR + runU), dir: 1 }, { x: NEAR + runU, dir: -1 }];
  const upHoles: Rect[] = [], upBlocks: [number, number][] = [];
  for (const u of up) {
    const xf = u.dir > 0 ? { t: [u.x, 0, 0] as [number, number, number] } : { ...MIRROR_X, t: [u.x, 0, 0] as [number, number, number] };
    b.with(xf, () => upHoles.push(islandUnit(b, cf, pfU, runU, pfU)));
    upBlocks.push([Math.min(u.x, u.x + u.dir * runU), Math.max(u.x, u.x + u.dir * runU)]);
  }
  hall(c, {
    ceil: [{ x0: -HALL_HALF, x1: HALL_HALF, y: pfU + 4.2, emit: true }],
    blocks: upBlocks,
    platHoles: upHoles.map((r) => [...r]),
  });
  // Each stair's shaft between the hall's ceiling and the platform, closed at its foot end.
  for (const [i, r] of upHoles.entries()) {
    for (const s of [-1, 1]) b.box(wall, r[0], top, s > 0 ? r[3] + 0.08 : r[1] - 0.38, r[2], pfU - 0.01, s > 0 ? r[3] + 0.38 : r[1] - 0.08);
    const foot = up[i].dir > 0 ? r[0] : r[2];
    b.box(wall, foot - 0.15, top, r[1] - 0.38, foot + 0.15, pfU - 0.01, r[3] + 0.38);
    // Line-colour fascia over the foot of the flight, and the way up signed from the hall.
    const n = -up[i].dir;
    b.deco(`paint:${line.color}`, foot + n * 0.16, top - 0.5, r[1] - 0.38, foot + n * 0.2, top, r[3] + 0.38);
    b.hang(
      { k: 'guide', ja: `${line.nameJa} のりば ${station.platforms[line.id].join('・')}`, en: `${line.nameEn} platforms`, bg: 'white', badges: [line.id], arrow: 'up' },
      foot + n * 2.2, cf + 2.5, 0, 3.6, 0.44, { ceil: top },
    );
  }

  // ── Lower line: its island, turned to its own direction, with flights down from the hall ──
  const turns = quarterTurns(other.primaryDir, other.dir);
  const downHoles: Rect[] = [];
  const downInfo = [] as ReturnType<typeof stairInfo>[];
  const lowBlocks: [number, number][] = [];
  const lowNums = [...station.platforms[o.line.id]];
  b.with({ rot: turns }, () => {
    for (const u of [{ x: -(NEAR + runL), dir: 1 as const }, { x: NEAR + runL, dir: -1 as const }]) {
      const xf = u.dir > 0 ? { t: [u.x, 0, 0] as [number, number, number] } : { ...MIRROR_X, t: [u.x, 0, 0] as [number, number, number] };
      b.with(xf, () => {
        const r = islandUnit(b, pfL, cf, runL, cf);
        downHoles.push(r);
        downInfo.push(stairInfo(b, o.line, 'platform', lowNums, r, runL + 0.8, 0, [-1, 0]));
        // Shaft walls between the lower hall's roof and the concourse floor.
        for (const s of [-1, 1]) b.box(wall, 0, lRoof, s > 0 ? 1.92 : -2.22, runL, cf - SLAB, s > 0 ? 2.22 : -1.92);
        b.box(wall, -0.3, lRoof, -2.22, 0, cf - SLAB, 2.22);
      });
      lowBlocks.push([Math.min(u.x, u.x + u.dir * runL), Math.max(u.x, u.x + u.dir * runL)]);
    }
    hall(o, {
      ceil: [{ x0: -HALL_HALF, x1: HALL_HALF, y: pfL + 4.5, emit: true }],
      blocks: lowBlocks,
      ceilHoles: lowBlocks.map(([a, e]) => [a, -1.86, e, 1.86]),
    });
  });

  // ── The ticket hall ──
  // A meadow-green inlay where the two lines' flights meet, and a lantern hung over it.
  b.deco('flat:#9cbf4a', -NEAR + 0.3, cf, -NEAR + 0.3, NEAR - 0.3, cf + 0.006, NEAR - 0.3);
  b.deco(`paint:${line.color}`, -NEAR + 0.3, cf + 0.006, -0.08, NEAR - 0.3, cf + 0.01, 0.08);
  b.deco(`paint:${o.line.color}`, -0.08, cf + 0.006, -NEAR + 0.3, 0.08, cf + 0.01, NEAR - 0.3);
  b.mesh('metal:#2b2e33', 'cyl', 0, top - 0.3, 0, 0.05, 0.6, 0.05);
  b.mesh('glass', 'sphere', 0, top - 1.0, 0, 0.9, 0.9, 0.9);
  b.mesh('light', 'sphere', 0, top - 1.0, 0, 0.5, 0.5, 0.5);
  const upFoot = (r: Rect, d: 1 | -1): Rect => (d > 0 ? [r[0] - 2.5, r[1] - 0.4, r[2], r[3] + 0.4] : [r[0], r[1] - 0.4, r[2] + 2.5, r[3] + 0.4]);
  concourse(c, {
    cf, cw: MID.cw, x0: MID.x0, x1: MID.x1, holes: downHoles, ceilHoles: upHoles,
    pillarZ: 8, ext: 0, footprint: MID.cw,
    // The upper line's flights stand in the hall: keep them and their feet clear.
    solids: upHoles.map((r, i) => upFoot(r, up[i].dir)),
    stairs: downInfo,
    ends: [
      { g: MID.g, hi: true, nums: ['1', '2'] },
      { g: -MID.g, hi: false, nums: ['3', '4'] },
    ],
  });
  surface(b, spec.surface, MID.cw, { ja: station.nameJa, en: station.nameRomaji });
}
