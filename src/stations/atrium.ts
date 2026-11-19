// Kawaminato-kō: the harbour atrium (Plans/stations/kawaminato-ko/plan.md).
//
// The Nagisa Line (side platforms) runs east–west near the surface; the Kikyō Line (island
// platform, full-height doors) crosses deep below it at right angles. On the sea side (+z) of the
// Nagisa box a void drops from the concourse ceiling to the Kikyō platform, the width of the
// Kikyō hall, whose ceiling is cut away under it. Transfers go through a mezzanine bridging the
// north end of the void: from Nagisa platform 2 by a balcony and a stair, from platform 1 by an
// underpass beneath the Nagisa tracks; from the mezzanine one flight goes down to Kikyō and
// another up to the gallery round the void, which opens off the Nagisa concourse and has a
// third gate line (the harbour gates) and exit 5 at its south-east corner.
//
// Frame: +x along the Nagisa Line (east), +z to its right (south, the sea).
//
//   level  y        what
//   B1     cf       Nagisa concourse (gates west and east, exits 1–4); gallery round the void,
//                   harbour gates, exit 5
//   B2     pfN      Nagisa platforms 1 (−z) and 2 (+z); the balcony; the platform-1 landing
//   B3     mezzY    transfer mezzanine; the underpass under the Nagisa tracks
//   B4     pfK      Kikyō island platform, open to the void

import { linesAt } from '../data/network';
import { HALL_HALF } from '../sim/geometry';
import type { SignContent } from '../signs/content';
import { rng, type V2 } from '../world/builder';
import { concStyle, concourse, islandUnit, platformStairs, quarterTurns, type Rect } from './build';
import { ATRIUM } from './exits';
import {
  CONC_CLEAR, CONC_RISE, SLAB, ceilingLight, exit, gateLine, hall, hallDims, pillar, rail, stairs, ticketMachines,
  type Ctx, type StationStyle,
} from './kit';
import { lookFor } from './looks';
import type { ConcInfo, StairInfo } from './looks/types';
import type { AtriumSpec } from './specs';
import { surface } from './surface';
import { themeFor } from './themes';
import { wayfindAtrium } from './wayfinding';

const r2 = (v: number) => Math.round(v * 100) / 100;
/** Concourse half width (as at the stock interchange, so exits 1–4 stay where they were). */
const CW = 14;
/** Width of the gallery round the void. */
const GW = 6;
/** South edge of the mezzanine deck: both flights leave it southwards. */
const MEZZ_S = 27;
/** Centre line (x) of the mezzanine ↔ gallery flight, beside the flight down to Kikyō at x = 0. */
const XG = 5.5;
/** Doorways in both side walls of the Nagisa hall, clear of its platform stairs (|x| ≥ 6). */
const DOORS: [number, number][] = [[-5, -2], [2, 5]];
/** Balcony depth beyond the Nagisa hall wall, and the x-range of its stair down. */
const BAL_D = 2.92;
const BAL_X: [number, number] = [4.9, 7.6];
/** Underpass x-range; the platform-1 stair hall: east end, depth, landing depth, stair head x. */
const UP_X: [number, number] = [-7.6, -3.6];
const SH_X1 = 7.2, SH_D = 4.42, LAND_D = 2.22, STAIR_TOP = 5.2;
/** Harbour gate line (x), east end of its unpaid lobby, and the south wall (the quay wall is at 51.6). */
const HG = 17.7, HX1 = 31.7, GZ1 = 51.1;
/** Gallery pillars at the void's edge (|x|), and where along it (z). */
const PIL_X = 8.3, PIL_Z = [18, 26, 34, 42];

type Other = { ctx: Ctx; dir: [number, number]; primaryDir: [number, number] };

/** Double-sided hanging sign across the x axis with a content (and arrow) per face. */
function hangPair(c: Ctx, x: number, y: number, z: number, w: number, h: number, ceil: number, pos: [SignContent, V2?], neg: [SignContent, V2?]) {
  const { b } = c;
  b.deco('flat:#22262b', x - 0.04, y - h / 2 - 0.03, z - w / 2 - 0.03, x + 0.04, y + h / 2 + 0.03, z + w / 2 + 0.03);
  b.sign(pos[0], x + 0.05, y, z, [1, 0], w, h, pos[1] ? { arrow: pos[1] } : {});
  b.sign(neg[0], x - 0.05, y, z, [-1, 0], w, h, neg[1] ? { arrow: neg[1] } : {});
  for (const dz of [-w / 2 + 0.2, w / 2 - 0.2]) b.deco('flat:#555a60', x - 0.02, y + h / 2, z + dz - 0.02, x + 0.02, ceil, z + dz + 0.02);
}

/**
 * A stretch of gallery as the station's look sees a concourse (its own frame: x0 … x1 by
 * −cw … cw), so the look's lights and pillars dress it like the concourse.
 */
function galleryInfo(c: Ctx, style: StationStyle, ceil: string, cf: number, x0: number, x1: number, cw: number, ends: { g: number; hi: boolean }[], pillars: [number, number][]): ConcInfo {
  const taken: Rect[] = pillars.map(([x, z]): Rect => [x - 0.6, z - 0.6, x + 0.6, z + 0.6]);
  const lo = ends.filter((e) => !e.hi).map((e) => e.g), hi = ends.filter((e) => e.hi).map((e) => e.g);
  let seed = 7;
  for (const ch of c.station.id) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  return {
    b: c.b, station: c.station, line: c.line, era: themeFor(c.line.id).opened ?? 2000, style,
    wall: style.concWall, floor: style.floor, pillar: style.pillar, ceil,
    cf, cw, footprint: cw, clear: CONC_CLEAR, x0, x1, ends, paid: [Math.max(x0, ...lo), Math.min(x1, ...hi)], holes: [], pillars,
    // No stairs, doorways, rooms or toilets in the gallery itself.
    stairs: [], exits: [], openings: [], rooms: [], stairwells: [], toilets: NaN,
    free: (a, z0, d, z1, m = 0) =>
      a - m >= x0 && d + m <= x1 && z0 - m >= -cw && z1 + m <= cw && !taken.some((q) => d + m > q[0] && a - m < q[2] && z1 + m > q[1] && z0 - m < q[3]),
    claim: (a, z0, d, z1) => void taken.push([a, z0, d, z1]),
    rand: rng(seed),
  };
}

export function buildAtrium(c: Ctx, spec: AtriumSpec, other: Other) {
  const { b, line, station } = c;
  const o = other.ctx;
  const look = lookFor(station.id);
  const cs = concStyle(c), cc: Ctx = { ...c, style: cs };
  const wall = cs.concWall, floor = cs.floor, ceilMat = look.finishes?.ceil ?? 'ceil';
  const lines = linesAt(station.id).map((l) => l.id);
  const [p1, p2] = station.platforms[line.id];

  // ── Levels and the void ──
  const dN = hallDims(line, c.railY), dK = hallDims(o.line, o.railY);
  const pfN = dN.pf, pfK = dK.pf, cf = pfN + CONC_RISE, mz = ATRIUM.mezzY;
  const runK = r2((mz - pfK) * 1.7), runG = r2((cf - mz) * 1.7), runS = r2((pfN - mz) * 1.7);
  /** Void: the Kikyō hall's width, from the Nagisa hall's outer wall to the head of the gallery flight. */
  const VX = dK.wallZ, VZ0 = dN.wallZ + 0.5, VZ1 = MEZZ_S + runG;
  const GX = VX + GW;
  const HZ0 = ATRIUM.exit5.wallZ;
  const kTop = pfK + 4.5 + SLAB; // top of the Kikyō hall's roof slab
  const upTop = mz + 2.8; // underpass ceiling
  const shTop = pfN + 2.8; // platform-1 stair hall ceiling
  const footK = MEZZ_S + runK; // foot of the flight on the Kikyō platform
  // The levels must nest: say which way they do not, rather than build something else.
  const fits: [boolean, string][] = [
    [mz - SLAB > kTop + 0.3, `mezzanine slab (${mz - SLAB}) must clear the Kikyō roof (${kTop})`],
    [upTop + 0.5 <= c.railY - 1, `underpass roof (${upTop + 0.5}) must pass under the Nagisa box (${c.railY - 1})`],
    [pfN - SLAB > upTop + 0.5 && mz + 2.6 < pfN - SLAB, 'balcony must stand clear above the mezzanine'],
    [VZ1 + GW <= GZ1 && HZ0 < VZ1, `gallery (to ${VZ1 + GW}) must fit north of the quay wall (${GZ1})`],
    [footK < 58 - 3, `Kikyō flight foot (${footK}) must land on the platform`],
  ];
  for (const [ok, why] of fits) if (!ok) throw new Error(`${station.id}: ${why}`);

  // ── Nagisa hall: side platforms, stairs to the concourse, doorways in both walls ──
  const st = platformStairs(c, [{ x: 6, up: 1 }, { x: -6, up: -1 }], pfN, cf, dN.wallZ);
  hall(c, {
    ceil: [
      { x0: -HALL_HALF, x1: -45, y: pfN + 4.2, emit: true },
      { x0: -45, x1: 45, y: cf - SLAB, emit: false },
      { x0: 45, x1: HALL_HALF, y: pfN + 4.2, emit: true },
    ],
    blocks: [...st.blocks, ...DOORS],
    gaps: ([1, -1] as const).flatMap((s) => DOORS.map(([x0, x1]) => ({ s, x0, x1 }))),
  });

  // ── Kikyō hall, turned to its own direction, its ceiling cut away under the void ──
  const turns = quarterTurns(other.primaryDir, other.dir);
  if (turns % 2 === 0) throw new Error(`${station.id}: the atrium's lines must cross`);
  /** Station z → the Kikyō hall's own x. */
  const kx = (z: number) => (turns === 1 ? z : -z);
  const voidK: [number, number] = [Math.min(kx(VZ0), kx(VZ1)), Math.max(kx(VZ0), kx(VZ1))];
  b.with({ rot: turns }, () => {
    hall(o, {
      ceil: [{ x0: -HALL_HALF, x1: HALL_HALF, y: pfK + 4.5, emit: true }],
      blocks: [voidK],
      ceilHoles: [[voidK[0], -dK.wallZ - 0.5, voidK[1], dK.wallZ + 0.5]],
    });
    // Under the ceiling either side of the void: the way to the Nagisa Line and out.
    const toN: SignContent = { k: 'guide', ja: `${line.nameJa} のりかえ・出口`, en: `${line.nameEn} / Exit`, bg: 'white', badges: [line.id] };
    const name: SignContent = { k: 'name', station: station.id, line: o.line.id };
    for (const z of [VZ1 + 1.8, VZ0 - 1.8]) {
      const sx = kx(z), r = Math.sign(sx - kx(footK)) as 1 | -1, arrow: V2 = [-r, 0];
      const toward: [SignContent, V2] = [toN, arrow], away: [SignContent] = [name];
      hangPair(o, sx, pfK + 2.72, 0, 3.3, 0.44, pfK + 4.5, r > 0 ? toward : away, r > 0 ? away : toward);
    }
  });

  // ── Concourse: a wide hall (not a spine: its +z wall is left out onto the gallery) ──
  // The Nagisa stairs get their stairwells as anywhere; the void's north end is a bare hole in
  // the floor (balustraded below), and the gallery's mouths are reported as the way to the Kikyō
  // Line (`ways`: no hole, so no stairwell).
  const ways = ([-1, 1] as const).map((s): StairInfo => {
    const xc = s * (VX + GW / 2);
    return { line: o.line, kind: 'transfer', platforms: [...station.platforms[o.line.id]], rect: [xc - GW / 2, CW, xc + GW / 2, CW + 0.5], top: [xc, CW - 0.8], down: [0, 1] };
  });
  concourse(c, {
    cf, cw: CW, x0: -45, x1: 45, holes: [...st.holes, [-VX, VZ0, VX, CW]], pillarZ: 3.2, stairs: st.info, ways,
    ends: [
      { g: 29, hi: true, nums: ['1', '2'] },
      { g: -29, hi: false, nums: ['3', '4'] },
    ],
    wallGaps: [{ s: 1, x0: -GX, x1: GX }],
    claims: [[-GX, 4, GX, CW]],
  });

  // ── The void: walls from the Kikyō roof up to the gallery floor ──
  const under = cf - SLAB;
  for (const s of [-1, 1]) b.box(wall, Math.min(s * VX, s * (VX + 0.5)), kTop, VZ0, Math.max(s * VX, s * (VX + 0.5)), under, VZ1 + 0.5);
  b.box(wall, -VX - 0.5, kTop, VZ1, VX + 0.5, under, VZ1 + 0.5);
  // North: under the Nagisa box, round the underpass mouth, up to the balcony.
  const [ux0, ux1] = UP_X;
  b.box(wall, -VX - 0.5, kTop, VZ0 - 0.4, VX + 0.5, mz, VZ0);
  b.wallX(wall, -VX - 0.5, VX + 0.5, VZ0 - 0.4, VZ0, mz, upTop, [[ux0, ux1]]);
  b.box(wall, -VX - 0.5, upTop, VZ0 - 0.4, VX + 0.5, pfN - SLAB, VZ0);
  for (const s of [-1, 1]) {
    for (let z = VZ0 + 3; z < VZ1 - 1; z += 4.5) {
      // Wall washers down both long walls of the void, at the gallery and mezzanine levels.
      for (const y of [under - 0.4, mz + 3.4]) b.deco('light', Math.min(s * (VX - 0.04), s * VX), y, z, Math.max(s * (VX - 0.04), s * VX), y + 0.08, z + 2.4);
    }
  }

  // ── B3: the transfer mezzanine and its two flights ──
  b.slab(floor, -VX, VZ0, VX, MEZZ_S, mz - SLAB, mz, []);
  b.with({ rot: 3, t: [0, 0, footK] }, () => islandUnit(b, pfK, mz, runK, null));
  b.with({ rot: 1, t: [XG, 0, MEZZ_S] }, () => islandUnit(b, mz, cf, runG, null));
  const E = 1.78; // half width of a flight over its balustrades
  rail(b, -VX, MEZZ_S - 0.08, -E, MEZZ_S, mz);
  rail(b, E, MEZZ_S - 0.08, XG - E, MEZZ_S, mz);
  rail(b, XG + E, MEZZ_S - 0.08, VX, MEZZ_S, mz);
  b.zone('passage', -VX, mz - 0.3, VZ0, VX, upTop, MEZZ_S, 'のりかえ中間階', 'Transfer mezzanine');

  // ── B2: the balcony off platform 2, and its stair down ──
  const BZ1 = VZ0 + BAL_D;
  b.slab(floor, -VX, VZ0, VX, BZ1, pfN - SLAB, pfN, []);
  b.with({ rot: 3, t: [0, 0, BZ1 + runS] }, () => stairs(b, { x0: 0, x1: runS, z0: BAL_X[0], z1: BAL_X[1], yLow: mz, yHigh: pfN }));
  rail(b, -VX, BZ1 - 0.08, BAL_X[0] - 0.08, BZ1, pfN);
  // The stair's underside, closed in (the ramp itself keeps people out from under it).
  for (let k = 1; k < 6; k++) {
    const za = BZ1 + (runS * (k - 1)) / 6, zb = BZ1 + (runS * k) / 6, y = pfN - ((pfN - mz) * k) / 6 - 0.2;
    if (y > mz + 0.05) b.deco(wall, BAL_X[0], mz, za, BAL_X[1], y, zb);
  }
  for (let x = -VX + 1.5; x + 2.4 < VX; x += 4.5) ceilingLight(b, x, x + 2.4, VZ0 + 1.2, VZ0 + 1.6, pfN - SLAB);
  b.zone('passage', -VX, pfN - 0.3, VZ0, VX, pfN + 2.8, BZ1, `${line.nameJa} ${p2}番線 バルコニー`, `${line.nameEn} platform ${p2} balcony`);

  // ── B2 → B3: the landing off platform 1, its stair, and the underpass ──
  const SZ0 = -(VZ0 + SH_D), LZ = -(VZ0 + LAND_D);
  b.slab(floor, ux0, SZ0, ux1, VZ0, mz - SLAB, mz, []);
  b.box(floor, ux1, mz - SLAB, SZ0, STAIR_TOP, mz, LZ);
  b.box(floor, ux0, pfN - SLAB, LZ, SH_X1, pfN, -VZ0);
  b.box(floor, STAIR_TOP, pfN - SLAB, SZ0, SH_X1, pfN, LZ);
  stairs(b, { x0: STAIR_TOP - runS, x1: STAIR_TOP, z0: SZ0 + 0.1, z1: LZ - 0.1, yLow: mz, yHigh: pfN });
  rail(b, ux0, LZ, STAIR_TOP - 1.4, LZ + 0.08, pfN);
  b.box(wall, ux0 - 0.3, mz, SZ0 - 0.4, SH_X1 + 0.3, shTop, SZ0);
  b.box(wall, ux0 - 0.3, mz, SZ0, ux0, shTop, -VZ0);
  b.box(wall, SH_X1, pfN, SZ0, SH_X1 + 0.3, shTop, -VZ0);
  b.box(wall, STAIR_TOP, mz, SZ0, SH_X1 + 0.3, pfN - SLAB, LZ);
  b.box(wall, ux1, mz, LZ, SH_X1 + 0.3, pfN - SLAB, -VZ0);
  b.box(ceilMat, ux0 - 0.3, shTop, SZ0 - 0.4, SH_X1 + 0.3, shTop + 0.5, -VZ0);
  b.box(wall, ux0, upTop, -VZ0 - 0.3, ux1, pfN - SLAB, -VZ0);
  // Under the Nagisa tracks.
  b.box(wall, ux0 - 0.3, mz, -VZ0, ux0, upTop, VZ0 - 0.4);
  b.box(wall, ux1, mz, -VZ0, ux1 + 0.3, upTop, VZ0 - 0.4);
  b.box(ceilMat, ux0 - 0.3, upTop, -VZ0, ux1 + 0.3, upTop + 0.5, VZ0 - 0.4);
  const uxc = (ux0 + ux1) / 2;
  for (let z = -VZ0 + 1; z + 2.4 < VZ0 - 0.4; z += 4) ceilingLight(b, uxc - 0.22, uxc + 0.22, z, z + 2.4, upTop);
  for (let x = ux0 + 1; x + 2.4 < SH_X1; x += 4) ceilingLight(b, x, x + 2.4, -VZ0 - 1.2, -VZ0 - 0.8, shTop);
  b.zone('passage', ux0, mz - 0.3, LZ, ux1, upTop, VZ0, 'のりかえ地下道', 'Transfer underpass');
  b.zone('passage', ux0, pfN - 0.3, LZ, SH_X1, shTop, -VZ0, `${line.nameJa} ${p1}番線 のりかえ口`, `${line.nameEn} platform ${p1} transfer landing`);

  // ── B1: the gallery round the void, the harbour gates and exit 5 ──
  b.slab(floor, -GX, CW, HX1, GZ1, cf - SLAB, cf, [[-VX, CW, VX, VZ1], [GX, CW, HX1, HZ0]]);
  const top = cf + CONC_CLEAR;
  b.box(ceilMat, -GX - 0.4, top, CW, -VX, top + 0.5, GZ1 + 0.4);
  b.box(ceilMat, VX, top, CW, GX + 0.4, top + 0.5, HZ0);
  b.box(ceilMat, -VX, top, VZ0, VX, top + 0.5, GZ1 + 0.4);
  b.box(ceilMat, VX, top, HZ0 - 0.4, HX1 + 0.4, top + 0.5, GZ1 + 0.4);
  b.box(wall, -GX - 0.4, cf, CW, -GX, top, GZ1 + 0.4);
  b.box(wall, -GX, cf, GZ1, HX1 + 0.4, top, GZ1 + 0.4);
  b.box(wall, GX, cf, CW, GX + 0.4, top, HZ0 - 0.4);
  b.wallX(wall, GX, HX1 + 0.4, HZ0 - 0.4, HZ0, cf, top, [[ATRIUM.exit5.door - 4, ATRIUM.exit5.door]]);
  b.box(wall, HX1, cf, HZ0, HX1 + 0.4, top, GZ1);
  // Balustrades round the void, on the concourse and the gallery.
  for (const s of [-1, 1]) rail(b, Math.min(s * VX, s * (VX + 0.08)), VZ0, Math.max(s * VX, s * (VX + 0.08)), VZ1 + 0.08, cf);
  rail(b, -VX - 0.08, VZ0 - 0.08, VX + 0.08, VZ0, cf);
  rail(b, -VX, VZ1, XG - E, VZ1 + 0.08, cf);
  rail(b, XG + E, VZ1, VX, VZ1 + 0.08, cf);
  // Harbour gates, their unpaid lobby with ticket machines, and exit 5 off its north wall.
  const hzc = (HZ0 + GZ1) / 2, hcw = (GZ1 - HZ0) / 2;
  b.with({ t: [HG, 0, hzc] }, () => gateLine(cc, cf, hcw, lines));
  ticketMachines(cc, cf, ATRIUM.exit5.door + 1, HZ0, 4);
  b.with({ mz: true, t: [ATRIUM.exit5.door, 0, HZ0] }, () => exit(cc, cf, ATRIUM.exit5.num));
  b.zone('concourse', -GX, cf - 0.3, CW, HG, top, GZ1, 'アトリウム ギャラリー', 'Atrium gallery');
  b.zone('concourse', HG, cf - 0.3, HZ0, HX1, top, GZ1, '港改札 改札外', 'Harbour gates (outside)');

  // ── Signs, generated from what was built ──
  wayfindAtrium({
    b, station, upper: line, lower: o.line, cf, pf: pfN, mz,
    wallIn: dN.wallZ, wallOut: VZ0, doors: DOORS,
    galleryHead: [XG, VZ1], mouths: [[-(VX + GW / 2), CW], [VX + GW / 2, CW]], gallerySouth: GZ1,
    gate: { x: HG, z: hzc, exits: [{ num: ATRIUM.exit5.num, at: [ATRIUM.exit5.door - 2, HZ0] }] },
    mezzFoot: [XG, MEZZ_S], lowerHead: [0, MEZZ_S],
    balcony: { z1: BZ1, under: pfN - SLAB, head: [(BAL_X[0] + BAL_X[1]) / 2, BZ1], foot: [(BAL_X[0] + BAL_X[1]) / 2, BZ1 + runS], wallX: VX },
    underpass: { x0: ux0, x1: ux1, mouth: [uxc, VZ0], ceil: upTop, south: SZ0, foot: [STAIR_TOP - runS, (SZ0 + LZ) / 2], head: [STAIR_TOP, (SZ0 + LZ) / 2] },
  });

  // ── The look: lights and pillars in the gallery, as in the concourse ──
  b.guard(() => {
    const strips: { xf: Parameters<typeof b.with>[0]; i: ConcInfo }[] = [
      // West and east galleries, in frames running along them (x = station z).
      { xf: { rot: 1, t: [-(VX + GW / 2), 0, 0] }, i: galleryInfo(c, cs, ceilMat, cf, CW, GZ1, GW / 2, [], PIL_Z.map((z): [number, number] => [z, PIL_X - VX - GW / 2])) },
      { xf: { rot: 1, t: [VX + GW / 2, 0, 0] }, i: galleryInfo(c, cs, ceilMat, cf, CW, HZ0, GW / 2, [], PIL_Z.filter((z) => z < HZ0 - 2).map((z): [number, number] => [z, -(PIL_X - VX - GW / 2)])) },
      // South of the void, and the harbour gates' hall.
      { xf: { t: [0, 0, (VZ1 + GZ1) / 2] }, i: galleryInfo(c, cs, ceilMat, cf, -VX, VX, (GZ1 - VZ1) / 2, [], []) },
      { xf: { t: [0, 0, hzc] }, i: galleryInfo(c, cs, ceilMat, cf, VX, HX1, hcw, [{ g: HG, hi: true }], []) },
    ];
    for (const { xf, i } of strips) {
      b.with(xf, () => {
        if (look.lights) look.lights(i);
        else for (let x = i.x0 + 2; x + 2.4 < i.x1; x += 4.2) for (const z of [-i.cw / 2, i.cw / 2]) ceilingLight(b, x, x + 2.4, z - 0.22, z + 0.22, top);
        for (const [x, z] of i.pillars) {
          if (look.pillar) {
            b.block(x - 0.35, cf, z - 0.35, x + 0.35, top, z + 0.35);
            look.pillar(i, x, z, cf, top);
          } else pillar(b, x, z, cf, top, 0.35, cs.pillar, line.color, cf + 2.27);
        }
      });
    }
    // The atrium's roof over the void.
    for (let z = CW + 1.5; z + 2.4 < VZ1; z += 4.5) for (const x of [-VX / 2, VX / 2]) ceilingLight(b, x - 0.22, x + 0.22, z, z + 2.4, top);
  });

  surface(b, spec.surface, CW, { ja: station.nameJa, en: station.nameRomaji });
}
