// Station composers: assemble kit parts into complete stations.
// Three layouts so far — generic underground, the two-line interchange, and elevated.

import { linesAt, lineById } from '../data/network';
import type { LineDef, StationDef } from '../data/types';
import { HALL_HALF } from '../sim/geometry';
import { Builder, type Build } from '../world/builder';
import type { SignContent } from '../signs/content';
import {
  CONC_CLEAR, CONC_RISE, GROUND_Y, SLAB, STAIR_RUN,
  ceilingLight, escalator, exit, gateLine, hall, hallDims, pillar, rail, stairs, ticketMachines, vending,
  type CeilSeg, type Ctx, type StationStyle,
} from './kit';
import type { ElevatedSpec, InterchangeSpec, StationSpec, UndergroundSpec } from './specs';
import { car, surface, tree, PLOT_X, PLOT_Z } from './surface';

type Rect = [number, number, number, number];
const rect = (b: Builder, x0: number, z0: number, x1: number, z1: number): Rect => {
  const p = b.pt(x0, 0, z0), q = b.pt(x1, 0, z1);
  return [Math.min(p[0], q[0]), Math.min(p[2], q[2]), Math.max(p[0], q[0]), Math.max(p[2], q[2])];
};
/** Mirror in x about the origin (keeps z). */
const MIRROR_X = { rot: 2, mz: true } as const;

/** Island platform stair + up escalator, foot at x = 0 climbing +x. Returns the floor opening above. */
function islandUnit(b: Builder, yLow: number, yHigh: number, run: number, railsAt: number | null): Rect {
  stairs(b, { x0: 0, x1: run, z0: -1.7, z1: 0.1, yLow, yHigh });
  escalator(b, { x0: 0, x1: run, z0: 0.3, z1: 1.7, yLow, yHigh, dir: 1 });
  if (railsAt !== null) {
    rail(b, -0.1, -1.92, run - 1.4, -1.84, railsAt);
    rail(b, -0.1, 1.84, run - 1.4, 1.92, railsAt);
    rail(b, -0.1, -1.92, -0.02, 1.92, railsAt);
  }
  return rect(b, 0, -1.84, run, 1.84);
}

/** Side platform stair against the +z wall, foot at x = 0 climbing +x. */
function sideUnit(b: Builder, yLow: number, yHigh: number, wallZ: number, railsAt: number): Rect {
  stairs(b, { x0: 0, x1: STAIR_RUN, z0: wallZ - 2.5, z1: wallZ - 0.1, yLow, yHigh, rails: [true, false] });
  rail(b, -0.1, wallZ - 2.66, STAIR_RUN - 1.4, wallZ - 2.58, railsAt);
  rail(b, -0.1, wallZ - 2.66, -0.02, wallZ + 0.1, railsAt);
  rail(b, -0.1, wallZ + 0.02, STAIR_RUN, wallZ + 0.1, railsAt);
  return rect(b, 0, wallZ - 2.58, STAIR_RUN, wallZ + 0.02);
}

interface StairSet {
  holes: Rect[];
  blocks: [number, number][];
}

/** Platform ↔ concourse stairs for either platform type. */
function platformStairs(c: Ctx, units: { x: number; up: 1 | -1 }[], pf: number, cf: number, wallZ: number): StairSet {
  const { b, line, station } = c;
  const out: StairSet = { holes: [], blocks: [] };
  for (const u of units) {
    const xf = u.up > 0 ? { t: [u.x, 0, 0] as [number, number, number] } : { ...MIRROR_X, t: [u.x, 0, 0] as [number, number, number] };
    out.blocks.push([Math.min(u.x, u.x + u.up * STAIR_RUN), Math.max(u.x, u.x + u.up * STAIR_RUN)]);
    if (line.platformType === 'island') {
      b.with(xf, () => {
        out.holes.push(islandUnit(b, pf, cf, STAIR_RUN, cf));
        b.hang(
          { k: 'guide', ja: '出口', en: 'Exit', bg: 'yellow', arrow: 'up' }, -1.6, pf + 2.72, 0, 3.0, 0.44,
          { ceil: cf - SLAB, back: { k: 'name', station: station.id, line: line.id, arrow: u.up > 0 ? 'left' : 'right' } },
        );
      });
    } else {
      for (const s of [1, -1]) {
        b.with({ mz: s < 0 }, () =>
          b.with(xf, () => {
            out.holes.push(sideUnit(b, pf, cf, wallZ, cf));
            b.sign({ k: 'guide', ja: '出口', en: 'Exit', bg: 'yellow', arrow: 'up' }, -0.2, pf + 2.75, wallZ - 1.3, [-1, 0], 2.3, 0.42);
          }),
        );
      }
    }
  }
  return out;
}

interface GateEnd {
  g: number;
  hi: boolean;
  nums: [string, string];
}

/** Unpaid end of a concourse. Canonical: gate line at x = 0, unpaid area x ∈ [0, 16]. */
function unpaidEnd(c: Ctx, cf: number, cw: number, nums: [string, string], lines: string[]) {
  const { b, style } = c;
  gateLine(c, cf, cw, lines);
  ticketMachines(c, cf, 3, -cw, 5);
  b.box('flat:#e9e4d8', 3.2, cf, cw - 0.6, 6.4, cf + 1.9, cw);
  b.sign({ k: 'machine', v: 'locker' }, 4.8, cf + 0.95, cw - 0.61, [0, -1], 3.2, 1.9);
  vending(b, 7.5, cf, cw - 0.36, [0, -1], 'vending2');
  b.sign({ k: 'mural', ...style.mural }, 15.98, cf + 1.55, 0, [-1, 0], Math.min(2 * cw - 6, 16), 2.1);
  b.box('flat:#3b4046', 15.4, cf, -3, 15.9, cf + 0.42, 3);
  b.with({ t: [13, 0, cw] }, () => exit(c, cf, nums[1]));
  b.with({ mz: true, t: [13, 0, -cw] }, () => exit(c, cf, nums[0]));
}

interface ShellOpts {
  cf: number;
  cw: number;
  x0: number;
  x1: number;
  holes: Rect[];
  ends: GateEnd[];
  pillarZ: number;
  floorY?: number;
}

/** Concourse level: slab, walls, ceiling, lighting, gate ends and exits. */
function concourse(c: Ctx, o: ShellOpts) {
  const { b, style, station } = c;
  const { cf, cw, x0, x1 } = o;
  const lines = linesAt(station.id).map((l) => l.id);
  b.slab(style.floor, x0, -cw, x1, cw, cf - SLAB, cf, o.holes);
  b.box('ceil', x0 - 0.4, cf + CONC_CLEAR, -cw - 0.4, x1 + 0.4, cf + CONC_CLEAR + 0.5, cw + 0.4);
  const gaps = o.ends.map((e) => (e.hi ? [e.g + 9, e.g + 13] : [e.g - 13, e.g - 9]));
  b.wallX(style.concWall, x0 - 0.4, x1 + 0.4, cw, cw + 0.4, cf, cf + CONC_CLEAR, gaps);
  b.wallX(style.concWall, x0 - 0.4, x1 + 0.4, -cw - 0.4, -cw, cf, cf + CONC_CLEAR, gaps);
  b.box(style.concWall, x0 - 0.4, cf, -cw, x0, cf + CONC_CLEAR, cw);
  b.box(style.concWall, x1, cf, -cw, x1 + 0.4, cf + CONC_CLEAR, cw);
  // Accent skirting.
  for (const s of [-1, 1]) {
    b.deco(`paint:${style.accent}`, x0, cf + 0.9, s * cw - 0.015, x1, cf + 1.0, s * cw + 0.015);
    b.deco('flat:#4b4d50', x0, cf, s * cw - 0.02, x1, cf + 0.13, s * cw + 0.02);
  }

  for (let x = x0 + 2; x + 2.4 < x1; x += 4.2) {
    for (const z of [-cw + 3, -cw / 3, cw / 3, cw - 3]) ceilingLight(b, x, x + 2.4, z - 0.22, z + 0.22, cf + CONC_CLEAR);
  }
  const paid0 = Math.max(x0, ...o.ends.filter((e) => !e.hi).map((e) => e.g));
  const paid1 = Math.min(x1, ...o.ends.filter((e) => e.hi).map((e) => e.g));
  const inHole = (x: number, z: number) => o.holes.some((h) => x > h[0] - 0.8 && x < h[2] + 0.8 && z > h[1] - 0.8 && z < h[3] + 0.8);
  for (let x = x0 + 4; x < x1 - 2; x += 8) {
    if (o.ends.some((e) => Math.abs(x - e.g) < 4)) continue;
    for (const s of [-1, 1]) {
      const z = s * o.pillarZ;
      if (inHole(x, z)) continue;
      pillar(b, x, z, cf, cf + CONC_CLEAR, 0.35, style.pillar, c.line.color, cf + 2.27);
    }
  }
  // Paid area: posters and the toilets.
  let v = station.id.length;
  for (let x = paid0 + 4; x < paid1 - 3; x += 6) {
    for (const s of [-1, 1] as const) {
      if (o.ends.some((e) => Math.abs(x - e.g) < 5)) continue;
      b.sign({ k: 'poster', v: v++ }, x, cf + 1.55, s * (cw - 0.02), [0, -s], 1.25, 1.75);
    }
  }
  const tx = (paid0 + paid1) / 2 + 3;
  b.sign({ k: 'label', text: 'お手洗い', sub: 'Toilets', fg: '#fff', bg: '#14233b' }, tx, cf + 2.55, -cw + 0.03, [0, 1], 1.8, 0.5);
  b.sign({ k: 'machine', v: 'door' }, tx - 0.6, cf + 1.05, -cw + 0.03, [0, 1], 1.0, 2.1);
  b.sign({ k: 'machine', v: 'door' }, tx + 0.6, cf + 1.05, -cw + 0.03, [0, 1], 1.0, 2.1);

  for (const e of o.ends) {
    b.with(e.hi ? { t: [e.g, 0, 0] } : { ...MIRROR_X, t: [e.g, 0, 0] }, () => unpaidEnd(c, cf, cw, e.nums, lines));
  }
  b.zone('concourse', x0, cf - 0.3, -cw, x1, cf + CONC_CLEAR, cw, '改札階コンコース', 'Concourse');
  const first = o.ends[0];
  b.setSpawn(first.g + (first.hi ? 11 : -11), cf, 0, [first.hi ? -1 : 1, 0]);
}

function buildUnderground(c: Ctx, spec: UndergroundSpec) {
  const { b, line, station, railY, style } = c;
  const d = hallDims(line, railY);
  const cf = d.pf + CONC_RISE;
  const cw = 12;
  const [cx0, cx1] = spec.concourse;
  const open = style.vault ? d.pf + 5.0 : d.pf + 4.2;
  const ceil: CeilSeg[] = [];
  if (cx0 > -HALL_HALF) ceil.push({ x0: -HALL_HALF, x1: cx0, y: open, emit: true, vault: style.vault });
  ceil.push({ x0: cx0, x1: cx1, y: cf - SLAB, emit: false });
  if (cx1 < HALL_HALF) ceil.push({ x0: cx1, x1: HALL_HALF, y: open, emit: true, vault: style.vault });

  const st = platformStairs(c, spec.stairs, d.pf, cf, d.wallZ);
  if (d.island) {
    // Lift shaft (not operable) beside the stairs.
    const ex = Math.max(...st.blocks.map((q) => q[1])) + 3;
    if (ex + 2.2 < cx1 - 18) {
      b.box('flat:#b9bec4', ex, d.pf, -1.1, ex + 2.2, cf + CONC_CLEAR, 1.1);
      for (const y of [d.pf, cf]) {
        b.sign({ k: 'machine', v: 'elevator' }, ex + 2.22, y + 1.15, 0, [1, 0], 1.8, 2.3);
      }
      st.blocks.push([ex, ex + 2.2]);
    }
  }
  hall(c, { ceil, blocks: st.blocks });

  const ends = spec.gates.map((g, i) => ({
    g: g === 'hi' ? cx1 - 16 : cx0 + 16,
    hi: g === 'hi',
    nums: [String(i * 2 + 1), String(i * 2 + 2)] as [string, string],
  }));
  concourse(c, { cf, cw, x0: cx0, x1: cx1, holes: st.holes, ends, pillarZ: d.island ? 6 : 3.4 });
  surface(b, spec.surface, cw, { ja: station.nameJa, en: station.nameRomaji });
}

/** Quarter turns from the frame's +x to another line's direction. */
function quarterTurns(from: [number, number], to: [number, number]): 0 | 1 | 2 | 3 {
  const cos = from[0] * to[0] + from[1] * to[1], sin = from[0] * to[1] - from[1] * to[0];
  const k = Math.round(Math.atan2(sin, cos) / (Math.PI / 2));
  if (Math.abs(Math.atan2(sin, cos) - (k * Math.PI) / 2) > 0.01) throw new Error('interchange lines must cross at right angles');
  return (((k % 4) + 4) % 4) as 0 | 1 | 2 | 3;
}

function buildInterchange(c: Ctx, spec: InterchangeSpec, other: { ctx: Ctx; dir: [number, number]; primaryDir: [number, number] }) {
  const { b, line, station, railY, style } = c;
  const dN = hallDims(line, railY);
  const pfN = dN.pf, cf = pfN + CONC_RISE, cw = 14;
  const cx0 = -45, cx1 = 45;
  const o = other.ctx;
  const dY = hallDims(o.line, o.railY);
  const pfY = dY.pf;
  const runY = Math.round((pfN - pfY) * 1.7 * 100) / 100;
  const zc0 = dN.wallZ + 0.5, zc1 = zc0 + 4.3;

  // ── Primary line hall + stairs to the concourse ──
  const st = platformStairs(c, [{ x: 6, up: 1 }, { x: -6, up: -1 }], pfN, cf, dN.wallZ);
  const gapXs: [number, number][] = [[-24, -20], [-3, 1]];
  hall(c, {
    ceil: [
      { x0: -HALL_HALF, x1: cx0, y: pfN + 4.2, emit: true },
      { x0: cx0, x1: cx1, y: cf - SLAB, emit: false },
      { x0: cx1, x1: HALL_HALF, y: pfN + 4.2, emit: true },
    ],
    blocks: [...st.blocks, ...gapXs],
    gaps: ([1, -1] as const).flatMap((s) => gapXs.map(([x0, x1]) => ({ s, x0, x1 }))),
  });

  // ── Transfer corridors, one outside each side wall, with stairs down to the deeper line ──
  const holes = [...st.holes];
  for (const s of [1, -1] as const) {
    b.with({ mz: s < 0 }, () => {
      const wall = style.concWall;
      b.box(style.floor, -26, pfN - SLAB, zc0, 4, pfN, zc1);
      b.box(wall, -26.3, pfN, zc0, -26, pfN + 2.8, zc1 + 0.3);
      b.wallX(wall, -26, 4, zc1, zc1 + 0.3, pfN, pfN + 2.8, [[-1.86, 1.86]]);
      b.box(wall, -1.86, pfN + 2.3, zc1, 1.86, pfN + 2.8, zc1 + 0.3);
      b.box('ceil', -26.3, pfN + 2.8, zc0, 4, pfN + 3.3, zc1 + 0.3);
      b.box(wall, 3.7, pfN + 2.8, zc0, 4, cf - SLAB, zc1 + 0.3);
      for (let x = -24; x < 2; x += 5) ceilingLight(b, x, x + 2.6, zc0 + 1.9, zc0 + 2.4, pfN + 2.8);
      // Stairs + escalator up to the concourse.
      b.with({ t: [4, 0, 0] }, () => {
        stairs(b, { x0: 0, x1: STAIR_RUN, z0: zc0 + 0.2, z1: zc0 + 2.1, yLow: pfN, yHigh: cf });
        escalator(b, { x0: 0, x1: STAIR_RUN, z0: zc0 + 2.3, z1: zc0 + 3.6, yLow: pfN, yHigh: cf, dir: 1 });
      });
      b.box(wall, 4, pfN - SLAB, zc0 + 3.7, 4 + STAIR_RUN, cf - SLAB, zc1 + 0.3);
      b.box(wall, 4 + STAIR_RUN, pfN - SLAB, zc0, 4 + STAIR_RUN + 0.3, cf - SLAB, zc1 + 0.3);
      rail(b, 3.92, zc0 + 0.02, 4.0, zc0 + 3.78, cf);
      rail(b, 4, zc0 + 3.7, 4 + STAIR_RUN - 1.4, zc0 + 3.78, cf);
      rail(b, 4, zc0 + 0.02, 4 + STAIR_RUN - 1.4, zc0 + 0.1, cf);
      holes.push(rect(b, 4, zc0 + 0.1, 4 + STAIR_RUN, zc0 + 3.7));
      // Stairs + escalator down to the other line's island platform.
      b.with({ rot: 3, t: [0, 0, zc1 + runY] }, () => islandUnit(b, pfY, pfN, runY, null));
      const shaftTop = pfN + 2.8, shaftBase = pfY + 4.5 + SLAB;
      for (const sx of [-1, 1]) b.box(wall, Math.min(sx * 1.86, sx * 2.16), shaftBase, zc1 + 0.3, Math.max(sx * 1.86, sx * 2.16), shaftTop, zc1 + runY);
      b.box(wall, -2.16, shaftBase, zc1 + runY, 2.16, shaftTop, zc1 + runY + 0.3);
      b.box('ceil', -2.16, shaftTop, zc1 + 0.3, 2.16, shaftTop + 0.5, zc1 + runY + 0.3);
      ceilingLight(b, -0.3, 0.3, zc1 + 2, zc1 + runY - 2, shaftTop);
      // Wayfinding.
      const yName = `${o.line.nameJa} のりば ${o.station.platforms[o.line.id].join('・')}`;
      b.sign({ k: 'guide', ja: yName, en: `${o.line.nameEn} platforms`, bg: 'white', badges: [o.line.id], arrow: 'up' }, 0, pfN + 2.55, zc1 - 0.02, [0, -1], 3.6, 0.44);
      b.hang(
        { k: 'guide', ja: `${o.line.nameJa} のりかえ`, en: `Transfer: ${o.line.nameEn}`, bg: 'white', badges: [o.line.id], arrow: 'up' },
        3.0, pfN + 2.5, (zc0 + zc1) / 2, 3.8, 0.44,
        { back: { k: 'guide', ja: '出口・改札', en: 'Exit / Ticket gates', bg: 'yellow', arrow: 'up' } },
      );
      for (const [g0, g1] of gapXs) {
        b.sign({ k: 'guide', ja: `${o.line.nameJa} のりかえ`, en: `Transfer / Exit`, bg: 'white', badges: [o.line.id], arrow: 'up' }, (g0 + g1) / 2, pfN + 2.8, dN.wallZ - 0.03, [0, -1], 3.6, 0.44);
        b.sign({ k: 'guide', ja: `${line.nameJa} のりば`, en: `${line.nameEn} platform`, bg: 'white', badges: [line.id], arrow: 'up' }, (g0 + g1) / 2, pfN + 2.55, zc0 + 0.02, [0, 1], 3.4, 0.4);
      }
      b.sign({ k: 'mural', ...style.mural }, -13.5, pfN + 1.35, zc1 - 0.02, [0, -1], 19, 1.9);
      b.zone('passage', -26, pfN - 0.3, zc0, 4 + STAIR_RUN, pfN + 2.8, zc1, 'のりかえ通路', 'Transfer passage');
    });
  }

  // ── The crossing line's hall, turned to its own direction ──
  const turns = quarterTurns(other.primaryDir, other.dir);
  const yBlocks: [number, number][] = [[zc1, zc1 + runY], [-zc1 - runY, -zc1]];
  b.with({ rot: turns }, () => {
    hall(o, {
      ceil: [{ x0: -HALL_HALF, x1: HALL_HALF, y: pfY + 4.5, emit: true }],
      blocks: yBlocks,
      ceilHoles: yBlocks.map(([a, e]) => [a, -1.86, e, 1.86]),
    });
    const guide: SignContent = { k: 'guide', ja: `${line.nameJa} のりかえ・出口`, en: `${line.nameEn} / Exit`, bg: 'white', badges: [line.id], arrow: 'up' };
    const name = { k: 'name', station: station.id, line: o.line.id, arrow: 'right' } as const;
    const xs = zc1 + runY + 1.6;
    b.hang(guide, xs, pfY + 2.72, 0, 3.3, 0.44, { ceil: pfY + 4.5, back: { ...name, arrow: 'left' } });
    b.hang({ ...name, arrow: 'left' }, -xs, pfY + 2.72, 0, 3.3, 0.44, { ceil: pfY + 4.5, back: guide });
  });

  // ── Concourse ──
  concourse(c, {
    cf, cw, x0: cx0, x1: cx1, holes, pillarZ: 3.2,
    ends: [
      { g: 29, hi: true, nums: ['1', '2'] },
      { g: -29, hi: false, nums: ['3', '4'] },
    ],
  });
  // Kiosk in the paid area.
  b.box('flat:#f4f1e6', -2.4, cf, -1.4, 2.4, cf + 2.5, 1.4);
  for (const s of [-1, 1] as const) {
    b.sign({ k: 'shop', ja: 'マルホシ キオスク', en: 'Maruhoshi Kiosk', bg: '#0b8f6a', fg: '#fff' }, 0, cf + 2.2, s * 1.42, [0, s], 4.6, 0.55);
    b.deco('glassDark', -2.2, cf + 0.9, s * 1.41, 2.2, cf + 1.9, s * 1.43);
  }
  surface(b, spec.surface, cw, { ja: station.nameJa, en: station.nameRomaji });
}

function buildElevated(c: Ctx, spec: ElevatedSpec) {
  const { b, line, station, railY, style } = c;
  const d = hallDims(line, railY);
  const pf = d.pf;
  const fl = 0.2; // concourse floor
  const deckUnder = railY - 1.3;
  const run = Math.round((pf - fl) * 1.7 * 100) / 100;
  const sx0 = 8, sx1 = sx0 + run;
  const holeZ0 = d.wallZ - 2.62;
  const lines = [line.id];

  hall(c, {
    ceil: [{ x0: -HALL_HALF, x1: HALL_HALF, y: pf + 3.3, emit: false }],
    blocks: [[sx0, sx1]],
    elevated: true,
    platHoles: [[sx0, holeZ0, sx1, d.wallZ + 0.01], [sx0, -d.wallZ - 0.01, sx1, -holeZ0]],
  });

  // Viaduct piers.
  for (let x = -54; x <= 54; x += 13.5) {
    for (const z of [-4.6, 4.6]) b.box('concrete', x - 0.55, 0, z - 0.55, x + 0.55, deckUnder, z + 0.55);
    b.deco('concrete', x - 0.7, deckUnder - 0.9, -9, x + 0.7, deckUnder, 9);
  }

  // Ground-level concourse under the viaduct.
  const cx0 = -26, cx1 = 26, cw = 9;
  b.box(style.floor, cx0, 0.1, -cw, cx1, fl, cw);
  const glassWall = (x0: number, x1: number, z0: number, z1: number) => {
    b.block(x0, fl, z0, x1, deckUnder, z1);
    b.deco('glass', x0, fl + 0.5, z0 + 0.04, x1, deckUnder - 0.6, z1 - 0.04);
    b.deco('flat:#dfe2e5', x0, fl, z0, x1, fl + 0.5, z1);
    b.deco('flat:#dfe2e5', x0, deckUnder - 0.6, z0, x1, deckUnder, z1);
  };
  // South front: wide entrance to the unpaid side.
  glassWall(cx0, -22, cw - 0.15, cw);
  glassWall(-9, cx1, cw - 0.15, cw);
  b.deco('flat:#dfe2e5', -22, fl + 3.0, cw - 0.15, -9, deckUnder, cw);
  b.sign({ k: 'entrance', station: station.id }, -15.5, fl + 3.7, cw + 0.02, [0, 1], 9, 1.1);
  b.box(style.concWall, cx0, fl, -cw, cx1, deckUnder, -cw + 0.15);
  b.box(style.concWall, cx1, fl, -cw, cx1 + 0.15, deckUnder, cw);
  // West end: second entrance.
  b.box(style.concWall, cx0 - 0.15, fl, -cw, cx0, deckUnder, -3);
  b.box(style.concWall, cx0 - 0.15, fl, 3, cx0, deckUnder, cw);
  b.deco('flat:#dfe2e5', cx0 - 0.15, fl + 3.0, -3, cx0, deckUnder, 3);
  b.sign({ k: 'entrance', station: station.id }, cx0 - 0.17, fl + 3.6, 0, [-1, 0], 5.4, 0.9);
  for (let x = cx0 + 2; x + 2.4 < cx1; x += 4.5) for (const z of [-5, 0, 5]) ceilingLight(b, x, x + 2.4, z - 0.22, z + 0.22, deckUnder);

  // Gates (unpaid side is west, -x), machines, departures.
  b.with({ ...MIRROR_X, t: [-4, 0, 0] }, () => gateLine(c, fl, cw, lines, deckUnder - fl));
  ticketMachines(c, fl, -21, -cw + 0.15, 5);
  vending(b, -24.5, fl, 6, [1, 0], 'vending');
  vending(b, -24.5, fl, 7.2, [1, 0], 'vending2');
  b.sign({ k: 'mural', ...style.mural }, cx1 - 0.02, fl + 2.3, 0, [-1, 0], 14, 3);

  // Stairs up to each platform, through the deck.
  for (const s of [1, -1] as const) {
    b.with({ mz: s < 0 }, () => {
      stairs(b, { x0: sx0, x1: sx1, z0: d.wallZ - 2.5, z1: d.wallZ - 0.1, yLow: fl, yHigh: pf });
      rail(b, sx0 - 0.1, holeZ0 - 0.08, sx1 - 1.5, holeZ0, pf);
      rail(b, sx0 - 0.1, holeZ0 - 0.08, sx0 - 0.02, d.wallZ, pf);
      b.sign({ k: 'dir', station: station.id, line: line.id, dir: s > 0 ? 'up' : 'down', arrow: 'up' }, sx0 - 0.6, fl + 3.3, d.wallZ - 1.3, [-1, 0], 4.2, 0.5);
      b.deco('flat:#22262b', sx0 - 0.58, fl + 3.02, d.wallZ - 3.45, sx0 - 0.5, fl + 3.58, d.wallZ + 0.85);
      b.sign({ k: 'guide', ja: '出口・改札', en: 'Exit / Ticket gates', bg: 'yellow', arrow: 'up' }, sx1 + 0.4, pf + 2.6, d.wallZ - 1.3, [1, 0], 2.4, 0.42);
    });
  }
  b.zone('concourse', cx0, 0, -cw, cx1, deckUnder, cw, '改札階コンコース', 'Concourse (street level)');
  b.setSpawn(-17, fl, 2, [1, 0]);

  // ── Suburban surroundings ──
  const X = PLOT_X, Z = PLOT_Z, GY = GROUND_Y;
  const road = [-X, 26, X, 36], crossSt = [68.5, 36, 75.5, Z], back = [-X, -24, X, -18];
  b.box('asphalt', -X, -0.6, -Z, X, 0, Z);
  b.slab('paver', -X, -Z, X, Z, 0, GY, [road, crossSt, back, [cx0, -cw, cx1, cw]]);
  b.box('paver', cx0, 0, -cw, cx1, 0.1, cw);
  b.zone('street', -X, -0.3, -Z, X, 80, Z, `${station.nameJa}駅前`, `${station.nameRomaji} — station plaza`);
  b.block(-X - 1, -1, -Z - 1, -X, 40, Z + 1);
  b.block(X, -1, -Z - 1, X + 1, 40, Z + 1);
  b.block(-X, -1, -Z - 1, X, 40, -Z);
  b.block(-X, -1, Z, X, 40, Z + 1);
  for (let x = -X; x < X; x += 6) b.deco('flat:#e9e9e4', x, 0.004, 30.93, x + 3, 0.01, 31.07);
  // Plaza: bus stop, taxi rank, trees, convenience store.
  b.box('flat:#8d949b', -2, GY, 23.6, -1.85, GY + 2.6, 23.75);
  b.box('flat:#8d949b', 8, GY, 23.6, 8.15, GY + 2.6, 23.75);
  b.deco('flat:#eef0f2', -2.6, GY + 2.6, 22.4, 8.8, GY + 2.72, 24.4);
  b.box('flat:#3b4046', 0, GY, 23.2, 6, GY + 0.45, 23.7);
  b.sign({ k: 'label', text: 'バスのりば 1', sub: 'Bus stop 1 — for Hibarino Hills', fg: '#fff', bg: '#0d3b66' }, 3.2, GY + 2.25, 22.38, [0, -1], 4, 0.6);
  b.box('flat:#f4f4f0', -1.5, 0.3, 27.2, 9.5, 3.1, 29.7);
  b.deco('glassDark', -1.2, 1.5, 27.15, 9.2, 2.6, 29.75);
  b.deco(`flat:${line.color}`, -1.5, 0.9, 27.17, 9.5, 1.2, 29.73);
  car(b, -14, 27.4, '#1d4d2b', true, true);
  car(b, -20, 27.4, '#1d4d2b', true, true);
  b.sign({ k: 'label', text: 'タクシーのりば', sub: 'Taxi', fg: '#111', bg: '#ffd100' }, -17, GY + 2.4, 24.6, [0, -1], 2.6, 0.6);
  b.box('flat:#8d949b', -17.06, GY, 24.6, -16.94, GY + 2.1, 24.72);
  for (const tx of [-40, -30, 16, 24, 34]) tree(b, tx, 15 + ((tx * 7) % 5), 5.5, 'leaf2');
  // Convenience store on the plaza.
  b.box('flat:#f2f2ee', 34, GY, 11, 52, GY + 3.6, 22);
  b.deco('glassDark', 34.6, GY + 0.3, 21.97, 51.4, GY + 2.6, 22.03);
  b.deco('glow:#fff8e1', 34.6, GY + 2.6, 22.0, 51.4, GY + 2.75, 22.05);
  b.sign({ k: 'shop', ja: 'マルホシマート', en: 'Maruhoshi Mart — 24h', bg: '#0b8f6a', fg: '#fff' }, 43, GY + 3.15, 22.04, [0, 1], 17, 0.85);
  vending(b, 32.9, GY, 20.6, [0, 1], 'vending');
  // Bicycle parking under the viaduct.
  for (const [x0, x1] of [[-58, -30], [30, 58]]) {
    for (let x = x0; x < x1; x += 0.8) {
      const col = ['#3a3f45', '#9c1f1f', '#1f4e8c', '#c9c2a8'][Math.abs(Math.round(x * 5)) % 4];
      b.deco('flat:#3a3f45', x, GY + 0.3, -3.2, x + 0.06, GY + 0.95, -1.6);
      b.deco(`flat:${col}`, x - 0.03, GY + 0.6, -2.9, x + 0.09, GY + 0.72, -2.1);
    }
    b.box('flat:#b7bcc2', x0 - 0.5, GY, -4.0, x1 + 0.5, GY + 1.0, -3.9);
  }
  suburb(b, spec);
}

function suburb(b: Builder, spec: ElevatedSpec) {
  const GY = GROUND_Y;
  // Deterministic rows of apartments (south) and houses (north).
  let s = spec.surface.seed;
  const r = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const aptMats = ['facade:apt:#e4dfd3', 'facade:apt:#d5cbb8', 'facade:apt:#c9d0d4'];
  for (let x = -126; x < 60; ) {
    const w = 16 + r() * 10;
    const h = (5 + Math.floor(r() * 6)) * 3.1;
    b.box(aptMats[Math.floor(r() * 3)], x, GY, 40, Math.min(x + w, 66), GY + h, 58);
    x += w + 2.5;
  }
  for (let x = 78; x < 124; ) {
    const w = 18 + r() * 8;
    b.box(aptMats[Math.floor(r() * 3)], x, GY, 40, Math.min(x + w, 127), GY + (6 + Math.floor(r() * 5)) * 3.1, 58);
    x += w + 2.5;
  }
  const houseMats = ['facade:house:#e9e2d2', 'facade:house:#d9cdb8', 'facade:house:#cfd6d2', 'facade:house:#e6d9c9'];
  for (const [z0, z1] of [[-17, -9.5], [-36, -25.5], [-50, -39], [-64, -53]] as const) {
    for (let x = -126; x < 124; ) {
      const w = 8 + r() * 3;
      const lo = Math.min(z0, z1) + 0.6, hi = Math.max(z0, z1) - 0.6;
      if (!(z0 === -17 && x > -30 && x < 30)) {
        b.box(houseMats[Math.floor(r() * 4)], x, GY, lo, x + w, GY + 6.2, hi);
        b.deco('roof', x - 0.4, GY + 6.2, lo - 0.4, x + w + 0.4, GY + 6.55, hi + 0.4);
        b.deco('roof', x + 0.8, GY + 6.55, lo + 1, x + w - 0.8, GY + 7.1, hi - 1);
      }
      x += w + 1.6;
    }
  }
  for (let x = -120; x < 124; x += 17) tree(b, x, -21 + 0, 4.5, 'leaf');
  for (let x = -120; x < 124; x += 30) {
    b.mesh('flat:#8a8479', 'cyl', x, GY + 4.6, 24.8, 0.3, 9.2, 0.3);
    b.block(x - 0.16, GY, 24.64, x + 0.16, GY + 3, 24.96);
  }
  b.deco('flat:#222', -PLOT_X, GY + 8.25, 24.78, PLOT_X, GY + 8.28, 24.82);
  // Hills behind the houses (outside the walkable plot).
  for (const [hx, hz, hw, hh] of [[-90, -150, 220, 46], [40, -170, 260, 62], [150, -140, 200, 40], [-200, -120, 180, 34]]) {
    b.mesh('leaf', 'sphere', hx, -6, hz, hw, hh * 2, hw * 0.6);
  }
}

export interface StationBuildInput {
  station: StationDef;
  spec: StationSpec;
  /** Lines at this station with their stop index and rail level. */
  lines: { line: LineDef; stop: number; railY: number; dir: [number, number] }[];
}

export function buildStation(input: StationBuildInput): { build: Build; primary: string } {
  const b = new Builder();
  const { station, spec } = input;
  const style: StationStyle = spec.style;
  const mk = (l: StationBuildInput['lines'][number]): Ctx => ({ b, line: l.line, station, stop: l.stop, railY: l.railY, style });
  if (spec.kind === 'interchange') {
    const p = input.lines.find((l) => l.line.id === spec.primary)!;
    const o = input.lines.find((l) => l.line.id !== spec.primary)!;
    buildInterchange(mk(p), spec, { ctx: mk(o), dir: o.dir, primaryDir: p.dir });
    return { build: b.out, primary: p.line.id };
  }
  const l = input.lines[0];
  if (spec.kind === 'elevated') buildElevated(mk(l), spec);
  else buildUnderground(mk(l), spec);
  return { build: b.out, primary: l.line.id };
}

export { lineById };
