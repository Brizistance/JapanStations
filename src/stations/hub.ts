// The Kita-Ōdōri hub: the city's central station.
//
// Two metro lines cross here (Akanesuji deep and east–west, Yanagisuji above it and
// north–south). On top sits Kawaminato Station: a glass-roofed atrium that drops from the
// roof to the B1 concourse, with rail decks stacked behind it. The metro part is fully
// working. The other railways are SHELLS: their space, access and gate positions are
// built and signed "reserved for future line", but they have no trains and no times.
//
// Frame: +x east (the Akanesuji Line's direction), +z south, so north is -z.
//
//   level   y      what
//   3F     +14     high-speed deck (shell) and its landing
//   2F      +7     gallery; main-line deck (shell) north, private-railway bays (shell) east
//   1F       0     atrium ring, station doors, plaza with bus and taxi ranks, the avenue
//   B1      -7     concourse: paid "T" over both lines, Yanagi Mall under the avenue
//   B2     -12     Yanagisuji island platform (vaulted hall)
//   B4     -19     Akanesuji island platform; beside it an empty box for a future metro line

import { linesAt } from '../data/network';
import { HALL_HALF, PLATFORM_HALF } from '../sim/geometry';
import type { SignContent } from '../signs/content';
import { rng, type Builder } from '../world/builder';
import { MIRROR_X, islandUnit, platformStairs, quarterTurns, type Rect } from './build';
import { CONC_RISE, GROUND_Y, SLAB, ceilingLight, exit, gateLine, hall, hallDims, pillar as column, rail, ticketMachines, vending, type Ctx } from './kit';
import type { HubSpec } from './specs';
import { SHOPS, car, crosswalk, fillLots, fillModelLots, signal, tree, type Shop } from './surface';

export const HUB_PLOT = { x: 190, z: 160 };

const GY = GROUND_Y;
/** Clear height of the B1 concourse and mall. */
const H1 = 3.6;
/** Half-width (in z) of the concourse and mall under the avenue. */
const BAR = 12;
/** East and west gate lines; the mall runs from here out to MALL_X. */
const PAID_X = 46, MALL_X = 150;
/** North gate line, and the station building's front (the atrium starts here). */
const GATE_N = -48, FRONT = -64;
/** Unpaid corridors linking the north concourse to the mall, either side of the paid area. */
const LINK0 = 50, LINK1 = 62;
/** Atrium hall: half-width and north wall. */
const HX = 44, HN = -112;
/** The void, open from the B1 floor to the glass roof. */
const VOID: Rect = [-30, -104, 30, -72];
const F2 = 7, F3 = 14, ROOF = 26;
/** Station building half-width, and the north edge of the rail decks. */
const BLDG = 112, DECK_N = -150;
/** x of each mall exit's passage (mirrored west). */
const EXITS = [76, 120];
/** Foot of each deep escalator bank on the Akanesuji platform (mirrored west). */
const EX0 = 13;
const STONE = 'floor:#e3e0d6';
const TRIM = 'flat:#dfe3e6';
const HOARD = 'flat:#f4f4f0';

const r2 = (v: number) => Math.round(v * 100) / 100;

interface H {
  c: Ctx;
  o: Ctx;
  /** The line beside the primary, in the B4 box (absent: the box is still a shell). */
  s?: Ctx;
  /** A second line beside that one, in its own hall further south (Sumire beside Shiokaze). */
  m?: Ctx;
  b: Builder;
  /** B1 floor, and the two platform levels. */
  cf: number;
  pfA: number;
  pfY: number;
  wall: string;
  floor: string;
  lines: string[];
}

/** A wall along z (thin in x) from za to zb, skipping the given [from, to] gaps. */
function wallZ(b: Builder, mat: string, x0: number, x1: number, za: number, zb: number, y0: number, y1: number, gaps: number[][] = []) {
  let z = za;
  for (const [from, to] of [...gaps].sort((p, q) => p[0] - q[0])) {
    if (from > z) b.box(mat, x0, y0, z, x1, y1, Math.min(from, zb));
    z = Math.max(z, to);
  }
  if (z < zb) b.box(mat, x0, y0, z, x1, y1, zb);
}

/** Double-sided sign hanging across the z axis: `front` faces south (+z), `back` faces north. */
function hangZ(b: Builder, front: SignContent, back: SignContent, x: number, y: number, z: number, w: number, h: number, ceil: number) {
  b.with({ rot: 1, t: [x, 0, z] }, () => b.hang(front, 0, y, 0, w, h, { ceil, back }));
}

/** "Reserved for future line" board. Says what kind of railway, never a service or a time. */
const reserved = (ja: string, en: string): SignContent => ({
  k: 'label', text: `将来線予定地　${ja}`, sub: `Reserved for future line — ${en}`, fg: '#1b1f24', bg: '#ffd100',
});

/** Construction hoarding along x at z (facing `n`), white with a warning stripe. */
function hoardingX(b: Builder, x0: number, x1: number, y: number, z: number, n: 1 | -1, h = 2.2) {
  const za = Math.min(z, z + n * 0.12), zb = Math.max(z, z + n * 0.12);
  b.box(HOARD, x0, y, za, x1, y + h, zb);
  const zs = z + n * 0.13;
  b.deco('flat:#e8a400', x0, y + h - 0.32, Math.min(z, zs), x1, y + h - 0.12, Math.max(z, zs));
  b.deco('flat:#1b1f24', x0, y + 0.02, Math.min(z, zs), x1, y + 0.14, Math.max(z, zs));
}

// ───────────────────────── platforms ─────────────────────────

/** Both platform halls, the deep escalators and the stairs. Returns the holes they cut in B1. */
function platforms(h: H, turns: 0 | 1 | 2 | 3): Rect[] {
  const { b, c, o, cf, pfA, pfY, wall } = h;
  const holes: Rect[] = [];
  const dA = hallDims(c.line, c.railY), dY = hallDims(o.line, o.railY);
  const runA = r2((cf - pfA) * 1.7);
  const aBlocks: [number, number][] = [[EX0, EX0 + runA], [-EX0 - runA, -EX0]];
  // Windows in the south wall look across the track into the empty box next door.
  const windows: [number, number][] = [[-52, -40], [-6, 6], [40, 52]];

  // ── Akanesuji Line (frame-aligned): island platform, full-height doors ──
  hall(c, {
    ceil: [{ x0: -HALL_HALF, x1: HALL_HALF, y: pfA + 4.5, emit: true }],
    blocks: aBlocks,
    ceilHoles: aBlocks.map(([a, e]) => [a, -1.86, e, 1.86]),
    gaps: windows.map(([x0, x1]) => ({ s: 1 as const, x0, x1 })),
  });
  // Deep escalator banks: straight from the platform up through an open shaft to B1.
  const base = pfA + 4.5 + SLAB, top = cf - SLAB;
  const toY: SignContent = {
    k: 'guide', ja: `${o.line.nameJa} のりかえ・出口`, en: `${o.line.nameEn} / Exit`, bg: 'white', badges: [o.line.id], arrow: 'up',
  };
  for (const s of [1, -1]) {
    b.with(s > 0 ? { t: [EX0, 0, 0] } : { ...MIRROR_X, t: [-EX0, 0, 0] }, () => {
      holes.push(islandUnit(b, pfA, cf, runA, cf));
      for (const sz of [-1, 1]) {
        b.box(wall, 0, base, Math.min(sz * 1.86, sz * 2.16), runA, top, Math.max(sz * 1.86, sz * 2.16));
        b.deco('light', 0.5, top - 0.3, Math.min(sz * 1.8, sz * 1.86), runA - 0.5, top - 0.18, Math.max(sz * 1.8, sz * 1.86));
        b.deco(`flat:${c.line.color}`, 0, top - 0.6, Math.min(sz * 1.84, sz * 1.86), runA, top - 0.45, Math.max(sz * 1.84, sz * 1.86));
      }
      b.box(wall, -0.3, base, -2.16, 0, top, 2.16);
      b.hang(toY, -1.6, pfA + 2.72, 0, 3.0, 0.44, {
        ceil: pfA + 4.5, back: { k: 'name', station: c.station.id, line: c.line.id, arrow: s > 0 ? 'left' : 'right' },
      });
    });
  }

  // ── Yanagisuji Line, turned to its own direction: the vaulted hall, kept ──
  b.with({ rot: turns }, () => {
    const st = platformStairs(o, [{ x: -16, up: -1 }, { x: -38, up: 1 }, { x: 4, up: -1 }], pfY, cf, dY.wallZ);
    holes.push(...st.holes);
    hall(o, {
      ceil: [
        { x0: -HALL_HALF, x1: BAR, y: cf - SLAB, emit: false },
        { x0: BAR, x1: BAR + 1, y: cf - SLAB, emit: true },
        { x0: BAR + 1, x1: HALL_HALF, y: pfY + 5.0, emit: true, vault: true },
      ],
      blocks: st.blocks,
    });
  });

  const z0 = dA.wallZ + 0.5, z1 = z0 + 15.4, ry = c.railY;
  if (h.s) {
    const zc = (z0 + z1) / 2;
    sHall(h, h.s, zc, windows, h.m ? [-1, 1] : [-1]);
    if (h.m) sHall(h, h.m, zc + BESIDE_GAP, windows, [-1]);
    return holes;
  }

  // ── Future metro line: a bare platform box south of the Akanesuji platforms ──
  b.deco('concreteDark', -HALL_HALF, ry - 1, z0, HALL_HALF, ry - 0.2, z1);
  b.deco('concrete', -PLATFORM_HALF, ry - 0.2, z0 + 3.7, PLATFORM_HALF, pfA, z1 - 3.7);
  b.deco('concreteDark', -HALL_HALF, pfA + 4.5, z0, HALL_HALF, pfA + 4.5 + SLAB, z1 + 0.5);
  b.deco('concreteDark', -HALL_HALF, ry - 1, z1, HALL_HALF, pfA + 4.5, z1 + 0.5);
  for (const s of [-1, 1]) b.deco('concreteDark', Math.min(s * HALL_HALF, s * (HALL_HALF + 0.5)), ry - 1, z0, Math.max(s * HALL_HALF, s * (HALL_HALF + 0.5)), pfA + 4.5, z1 + 0.5);
  for (let x = -54; x <= 54; x += 9) {
    b.deco('concrete', x - 0.3, pfA, (z0 + z1) / 2 - 0.3, x + 0.3, pfA + 4.5, (z0 + z1) / 2 + 0.3);
    if (x % 2 === 0) b.deco('glow:#fff1c4', x + 1.2, pfA + 1.5, (z0 + z1) / 2 - 0.15, x + 1.5, pfA + 1.9, (z0 + z1) / 2 + 0.15);
  }
  for (const x of [-46, 0, 46]) b.sign(reserved('地下鉄新線', 'new metro line'), x, pfA + 2.2, z1 - 0.02, [0, -1], 11, 1.7);
  b.keepOut(-HALL_HALF, ry - 1.5, z0, HALL_HALF, pfA + 4.5, z1, 'future metro platform box');
  return holes;
}

/** Where the beside lines' escalator shafts reach B1: the east wall of the stub passage. */
const STUB: [number, number] = [22, 30];
/** Centre-to-centre spacing of halls side by side at B4 (wall + 0.5 m structure + wall). */
const BESIDE_GAP = 15.9;
/** z of each beside hall's centre, and so of its shaft into the stub passage. */
const besideZ = (h: H) => {
  const zS = hallDims(h.c.line, h.c.railY).wallZ + 0.5 + 7.7;
  return h.m ? [zS, zS + BESIDE_GAP] : [zS];
};

/**
 * The line beside the primary, in what used to be the B4 shell: an island-platform hall
 * centred `zc` south of the primary, sharing its windows, with a stair and escalator in an
 * enclosed shaft climbing west into the stub passage off the paid concourse.
 */
function sHall(h: H, s: Ctx, zc: number, windows: [number, number][], sides: (1 | -1)[]) {
  const { b, c, cf, pfA, wall } = h;
  const run = r2((cf - pfA) * 1.7);
  const foot = STUB[1] + run;
  const base = pfA + 4.5 + SLAB, top = cf + H1;
  b.with({ t: [0, 0, zc] }, () => {
    hall(s, {
      ceil: [{ x0: -HALL_HALF, x1: HALL_HALF, y: pfA + 4.5, emit: true }],
      blocks: [[STUB[1], foot]],
      ceilHoles: [[STUB[1], -1.86, foot, 1.86]],
      gaps: sides.flatMap((side) => windows.map(([x0, x1]) => ({ s: side, x0, x1 }))),
    });
    b.with({ ...MIRROR_X, t: [foot, 0, 0] }, () => {
      islandUnit(b, pfA, cf, run, cf);
      for (const sz of [-1, 1]) {
        b.box(wall, 0, base, Math.min(sz * 1.86, sz * 2.16), run, top, Math.max(sz * 1.86, sz * 2.16));
        b.deco('light', 0.5, top - 0.3, Math.min(sz * 1.8, sz * 1.86), run - 0.5, top - 0.18, Math.max(sz * 1.8, sz * 1.86));
        b.deco(`flat:${s.line.color}`, 0, top - 0.6, Math.min(sz * 1.84, sz * 1.86), run, top - 0.45, Math.max(sz * 1.84, sz * 1.86));
      }
      b.box(wall, -0.3, base, -2.16, 0, top, 2.16);
      b.box('ceil', -0.3, top, -2.16, run, top + 0.5, 2.16);
      b.hang(
        { k: 'guide', ja: `${c.line.nameJa}・${h.o.line.nameJa} のりかえ・出口`, en: 'Transfer / Exit', bg: 'white', badges: [c.line.id, h.o.line.id], arrow: 'up' },
        -1.6, pfA + 2.72, 0, 3.0, 0.44,
        { ceil: pfA + 4.5, back: { k: 'name', station: s.station.id, line: s.line.id, arrow: 'left' } },
      );
    });
  });
}

// ───────────────────────── B1 ─────────────────────────

function shopFront(h: H, xa: number, xb: number, z: number, n: 1 | -1, s: Shop) {
  const { b, cf } = h;
  // `d` metres out from the wall face, as an ordered z range.
  const dz = (mat: string, x0: number, y0: number, d0: number, x1: number, y1: number, d1: number) =>
    b.deco(mat, x0, y0, Math.min(z + n * d0, z + n * d1), x1, y1, Math.max(z + n * d0, z + n * d1));
  dz('glow:#f6ead0', xa + 0.45, cf + 0.12, 0, xb - 0.45, cf + 2.5, 0.02);
  for (const y of [0.85, 1.45, 2.05]) dz('flat:#6b5a48', xa + 0.6, cf + y, 0.02, xb - 2.1, cf + y + 0.06, 0.05);
  dz('flat:#3a2f28', xb - 1.8, cf, 0.02, xb - 0.6, cf + 2.2, 0.05);
  dz('glass', xa + 0.45, cf + 0.12, 0.08, xb - 0.45, cf + 2.5, 0.1);
  for (const x of [xa + 0.3, xb - 0.45]) dz('flat:#3a3f45', x, cf, 0, x + 0.15, cf + 2.5, 0.14);
  dz(`flat:${s.bg}`, xa + 0.2, cf + 2.5, 0, xb - 0.2, cf + 3.3, 0.14);
  b.sign({ k: 'shop', ...s }, (xa + xb) / 2, cf + 2.9, z + n * 0.15, [0, n], Math.min(xb - xa - 0.9, 6.4), 0.66);
}

function concourseLevel(h: H, holes: Rect[]) {
  const { b, c, o, cf, wall, floor, lines } = h;
  const top = cf + H1;
  const st = c.station;

  // ── Floors and ceilings ──
  b.slab(floor, -MALL_X, -BAR, MALL_X, BAR, cf - SLAB, cf, holes);
  b.slab(floor, -BAR, GATE_N, BAR, -BAR, cf - SLAB, cf, holes);
  b.box(floor, -LINK1, cf - SLAB, FRONT, LINK1, cf, GATE_N);
  b.box(STONE, -HX, cf - SLAB, HN, HX, cf, FRONT);
  b.box('ceil', -MALL_X, top, -BAR, MALL_X, top + 0.5, BAR);
  b.box('ceil', -BAR, top, GATE_N, BAR, top + 0.5, -BAR);
  b.box('ceil', -LINK1, top, FRONT, LINK1, top + 0.5, GATE_N);
  for (const s of [-1, 1]) {
    const xa = Math.min(s * LINK0, s * LINK1), xb = Math.max(s * LINK0, s * LINK1);
    b.box(floor, xa, cf - SLAB, GATE_N, xb, cf, -BAR);
    b.box('ceil', xa, top, GATE_N, xb, top + 0.5, -BAR);
  }

  // ── Walls ──
  const exitGaps = EXITS.flatMap((x) => [[x - 4, x], [-x, -x + 4]]);
  const stub = STUB;
  b.wallX(wall, -MALL_X - 0.4, MALL_X + 0.4, -BAR - 0.4, -BAR, cf, top, [[-BAR, BAR], [LINK0, LINK1], [-LINK1, -LINK0], ...exitGaps]);
  b.wallX(wall, -MALL_X - 0.4, MALL_X + 0.4, BAR, BAR + 0.4, cf, top, [...exitGaps, stub]);
  for (const [a, e] of exitGaps) {
    b.box(wall, a, cf + 2.7, -BAR - 0.4, e, top, -BAR);
    b.box(wall, a, cf + 2.7, BAR, e, top, BAR + 0.4);
  }
  for (const s of [-1, 1]) {
    const side = (x: number, t: number) => [Math.min(s * x, s * (x + t)), Math.max(s * x, s * (x + t))] as const;
    const [ex0, ex1] = side(MALL_X, 0.4);
    b.box(wall, ex0, cf, -BAR, ex1, top, BAR);
    wallZ(b, wall, ...side(BAR, 0.4), GATE_N, -BAR - 0.4, cf, top);
    wallZ(b, wall, ...side(LINK0 - 0.4, 0.4), GATE_N, -BAR - 0.4, cf, top);
    wallZ(b, wall, ...side(LINK1, 0.4), FRONT - 0.4, -BAR - 0.4, cf, top);
    // South and north walls of the north concourse, either side of the gates and the atrium.
    b.box(wall, Math.min(s * BAR, s * LINK0), cf, GATE_N, Math.max(s * BAR, s * LINK0), top, GATE_N + 0.4);
    b.box(wall, Math.min(s * HX, s * (LINK1 + 0.4)), cf, FRONT - 0.4, Math.max(s * HX, s * (LINK1 + 0.4)), top, FRONT);
    // Atrium basement walls, up to the underside of the level-1 ring.
    wallZ(b, 'panel:#ebe8de', ...side(HX, 0.4), HN, FRONT - 0.4, cf, GY - SLAB);
  }
  b.box('panel:#ebe8de', -HX - 0.4, cf, HN - 0.4, HX + 0.4, GY - SLAB, HN);
  b.box(wall, -HX, top, FRONT - 0.4, HX, GY - SLAB, FRONT);

  // ── Lighting and pillars ──
  const lights = (x0: number, x1: number, z0: number, z1: number) => {
    for (let x = x0 + 2; x + 2.4 < x1; x += 4.8) for (let z = z0 + 3; z < z1 - 1.5; z += 6) ceilingLight(b, x, x + 2.4, z - 0.3, z + 0.3, top);
  };
  lights(-MALL_X, MALL_X, -BAR, BAR);
  lights(-BAR, BAR, GATE_N, -BAR);
  lights(-LINK1, LINK1, FRONT, GATE_N);
  for (const s of [-1, 1]) lights(Math.min(s * LINK0, s * LINK1), Math.max(s * LINK0, s * LINK1), GATE_N, -BAR);
  const pillar = (x: number, z: number, y1: number) => column(b, x, z, cf, y1, 0.4, c.style.pillar, c.style.accent, cf + 2.5);
  for (let x = -MALL_X + 6; x < MALL_X; x += 8) {
    if (Math.abs(Math.abs(x) - PAID_X) < 5) continue;
    for (const z of [-6.5, 6.5]) pillar(x, z, top);
  }
  for (const x of [-36, -20, 20, 36]) pillar(x, -56, top);

  // ── Gate lines: east and west onto the mall, north onto the atrium ──
  const gates = () => {
    gateLine(c, cf, BAR, lines, H1);
    b.deco(wall, -3, cf + 3.0, 5.0, 3, top, BAR);
  };
  b.with({ t: [PAID_X, 0, 0] }, gates);
  b.with({ ...MIRROR_X, t: [-PAID_X, 0, 0] }, gates);
  b.with({ rot: 3, t: [0, 0, GATE_N] }, gates);

  // ── Wayfinding ──
  const plat = (x: Ctx) => `${x.line.nameJa} のりば ${st.platforms[x.line.id].join('・')}`;
  const toA: SignContent = { k: 'guide', ja: plat(c), en: `${c.line.nameEn} platforms`, bg: 'navy', badges: [c.line.id], arrow: 'up' };
  const toYs: SignContent = { k: 'guide', ja: plat(o), en: `${o.line.nameEn} platforms`, bg: 'navy', badges: [o.line.id], arrow: 'up' };
  const mall = (ja: string, en: string): SignContent => ({ k: 'guide', ja: `${ja}・ヤナギモール`, en: `${en} / Yanagi Mall`, bg: 'yellow', arrow: 'up' });
  const runA = r2((cf - h.pfA) * 1.7);
  b.hang(toA, EX0 + runA + 3, cf + 2.75, 0, 5.2, 0.5, { ceil: top, back: mall('東改札', 'East gate') });
  b.hang(mall('西改札', 'West gate'), -EX0 - runA - 3, cf + 2.75, 0, 5.2, 0.5, { ceil: top, back: toA });
  hangZ(
    b,
    { k: 'guide', ja: '北改札・川湊駅', en: 'North gate / Kawaminato Station', bg: 'yellow', arrow: 'up' },
    { k: 'guide', ja: `${c.line.nameJa}・${o.line.nameJa} のりば`, en: 'To all platforms', bg: 'navy', badges: lines, arrow: 'up' },
    0, cf + 2.75, -BAR - 2.5, 6.4, 0.5, top,
  );
  for (const s of [-1, 1] as const) b.sign(toYs, s * (BAR - 0.02), cf + 2.6, -27, [-s, 0], 4.4, 0.46);
  // Outside the north gate: metro one way, Kawaminato Station the other.
  hangZ(
    b,
    { k: 'guide', ja: '川湊駅・駅前広場', en: 'Kawaminato Station / Plaza', bg: 'yellow', arrow: 'up' },
    { k: 'guide', ja: `地下鉄 ${st.nameJa}駅 のりば`, en: `Metro: ${st.nameRomaji} Station`, bg: 'navy', badges: lines, arrow: 'up' },
    0, cf + 2.75, FRONT + 3, 8, 0.56, top,
  );

  // ── Ticket machines ──
  b.with({ rot: 2, t: [30, 0, GATE_N] }, () => ticketMachines(c, cf, 0, 0, 5));
  b.with({ rot: 2, t: [-18, 0, GATE_N] }, () => ticketMachines(c, cf, 0, 0, 5));

  // ── Yanagi Mall: one wing east of the paid area, one west ──
  let k = 3;
  const run = (x0: number, x1: number, z: number, n: 1 | -1) => {
    const count = Math.max(1, Math.round((x1 - x0) / 8)), w = (x1 - x0) / count;
    for (let i = 0; i < count; i++) shopFront(h, x0 + i * w, x0 + (i + 1) * w, z, n, SHOPS[k++ % SHOPS.length]);
  };
  const wing = (label: string) => {
    ticketMachines(c, cf, 64, -BAR, 5);
    run(76.5, 115.5, -BAR, 1);
    run(120.5, MALL_X - 0.5, -BAR, 1);
    run(50, 71.5, BAR, -1);
    run(76.5, 115.5, BAR, -1);
    run(120.5, MALL_X - 0.5, BAR, -1);
    b.hang({ k: 'label', text: 'ヤナギモール', sub: `Yanagi Mall — ${label}`, fg: '#f3e3a0', bg: '#12382c' }, 54, cf + 2.85, 0, 9, 0.95, { ceil: top });
    b.sign({ k: 'mural', ...c.style.mural }, MALL_X - 0.02, cf + 1.75, 0, [-1, 0], 18, 2.6);
    // Planters, benches and vending down the middle.
    for (const x of [68, 92, 108, 132]) {
      b.box('flat:#4a4038', x - 1.4, cf, -0.45, x + 1.4, cf + 0.55, 0.45);
      b.mesh('leaf2', 'sphere', x, cf + 0.95, 0, 2.7, 0.95, 1.25);
      for (const s of [-1, 1]) b.box('wood:#6b5440', x - 1.2, cf, Math.min(s * 0.6, s * 1.1), x + 1.2, cf + 0.45, Math.max(s * 0.6, s * 1.1));
    }
    vending(b, 100, cf, 0, [0, 1], 'vending');
    vending(b, 101.1, cf, 0, [0, -1], 'vending2');
  };
  b.with({}, () => wing('East'));
  b.with(MIRROR_X, () => wing('West'));

  // ── Exits 1–8 up to the avenue's sidewalks ──
  let n = 1;
  for (const s of [1, -1]) {
    b.with(s > 0 ? {} : MIRROR_X, () => {
      for (const x of EXITS) {
        b.with({ mz: true, t: [x, 0, -BAR] }, () => exit(c, cf, String(n++)));
        b.with({ t: [x, 0, BAR] }, () => exit(c, cf, String(n++)));
      }
    });
  }

  // ── Stub passage south of the paid concourse: to the beside line, or closed by a hoarding ──
  const sl = h.s?.line;
  const zs = besideZ(h);
  const beside = [h.s, h.m].filter((x): x is Ctx => !!x).map((x) => x.line);
  const end = BAR + (h.m ? zs[1] + 2.4 - BAR : 6); // the passage runs south past the last shaft
  b.box(floor, stub[0], cf - SLAB, BAR, stub[1], cf, end);
  b.box('ceil', stub[0] - 0.4, top, BAR, stub[1] + 0.4, top + 0.5, end + 0.4);
  wallZ(b, wall, stub[0] - 0.4, stub[0], BAR + 0.4, end + 0.4, cf, top);
  wallZ(b, wall, stub[1], stub[1] + 0.4, BAR + 0.4, end + 0.4, cf, top, sl ? zs.map((z) => [z - 1.86, z + 1.86]) : []);
  b.box(wall, stub[0], cf, end, stub[1], top, end + 0.4);
  for (let z = BAR + 2; z + 2 < end; z += 5) ceilingLight(b, stub[0] + 2.8, stub[1] - 2.8, z, z + 2, top);
  if (sl) {
    const to = (l: (typeof beside)[number]): SignContent =>
      ({ k: 'guide', ja: `${l.nameJa} のりば ${st.platforms[l.id].join('・')}`, en: `${l.nameEn} platforms`, bg: 'navy', badges: [l.id], arrow: 'up' });
    b.sign({ k: 'mural', ...c.style.mural }, (stub[0] + stub[1]) / 2, cf + 1.6, end - 0.02, [0, -1], 7, 2.2);
    beside.forEach((l, i) => b.sign(to(l), stub[1] - 0.02, cf + 2.75, zs[i], [-1, 0], 3.6, 0.44));
    b.hang(beside.length > 1
      ? { k: 'guide', ja: beside.map((l) => l.nameJa).join('・'), en: beside.map((l) => l.nameEn).join(' / '), bg: 'navy', badges: beside.map((l) => l.id), arrow: 'up' }
      : to(sl), (stub[0] + stub[1]) / 2, cf + 2.75, BAR - 2.5, 5.2, 0.5, { ceil: top });
    b.zone('passage', stub[0], cf - 0.2, BAR, stub[1], top, end, `${beside.map((l) => l.nameJa).join('・')} 連絡通路`, `${beside.map((l) => l.nameEn).join(' / ')} passage`);
  } else {
    hoardingX(b, stub[0], stub[1], cf, BAR + 5.4, -1);
    b.sign(reserved('地下鉄新線 連絡通路', 'passage to a new metro line'), (stub[0] + stub[1]) / 2, cf + 1.15, BAR + 5.26, [0, -1], 6.4, 1.0);
    b.zone('passage', stub[0], cf - 0.2, BAR, stub[1], top, BAR + 5.4, '新線連絡通路（予定地）', 'Future metro line passage (reserved)');
  }

  // ── Zones and spawn ──
  b.zone('concourse', -PAID_X, cf - 0.3, GATE_N, PAID_X, top, BAR, '改札内コンコース', 'Concourse (inside the gates)');
  b.zone('concourse', -LINK1, cf - 0.3, FRONT, LINK1, top, GATE_N, '北口コンコース', 'North concourse');
  for (const s of [-1, 1]) {
    b.zone('passage', Math.min(s * PAID_X, s * MALL_X), cf - 0.3, -BAR, Math.max(s * PAID_X, s * MALL_X), top, BAR, s > 0 ? 'ヤナギモール 東' : 'ヤナギモール 西', `Yanagi Mall — ${s > 0 ? 'East' : 'West'}`);
  }
  b.setSpawn(0, cf, -57, [0, 1]);
}

// ───────────────────────── atrium ─────────────────────────

function atrium(h: H) {
  const { b, c, cf, lines } = h;
  const st = c.station;
  const run1 = r2((GY - cf) * 1.7), run2 = r2((F2 - GY) * 1.7), run3 = r2((F3 - F2) * 1.7);
  const PANEL = 'panel:#ebe8de';
  const [vx0, vz0, vx1, vz1] = VOID;

  // ── Floors: level-1 ring, level-2 gallery, level-3 landing ──
  b.slab(STONE, -HX, HN, HX, FRONT, GY - SLAB, GY, [VOID]);
  for (const s of [1, -1]) {
    b.with(s > 0 ? { t: [vx1 - run1, 0, -88] } : { ...MIRROR_X, t: [-(vx1 - run1), 0, -88] }, () => islandUnit(b, cf, GY, run1, null));
  }
  let hole2: Rect = [0, 0, 0, 0];
  b.with({ rot: 3, t: [40, 0, -76] }, () => (hole2 = islandUnit(b, GY, F2, run2, F2)));
  b.slab(STONE, -HX, HN, HX, FRONT, F2 - SLAB, F2, [VOID, hole2]);
  b.with({ rot: 3, t: [-40, 0, -80] }, () => islandUnit(b, F2, F3, run3, null));
  const z3 = -80 - run3;
  b.box(STONE, -HX, F3 - SLAB, vz0, -34, F3, z3);
  b.box(STONE, -HX, F3 - SLAB, HN, HX, F3, vz0);

  // ── Railings round the void ──
  const escGap = [-88 - 1.84, -88 + 1.84];
  for (const [y, gap] of [[GY, true], [F2, false]] as const) {
    rail(b, vx0, vz1, vx1, vz1 + 0.08, y);
    rail(b, vx0, vz0 - 0.08, vx1, vz0, y);
    for (const s of [-1, 1]) {
      const xa = Math.min(s * vx1, s * (vx1 + 0.08)), xb = Math.max(s * vx1, s * (vx1 + 0.08));
      if (gap) {
        rail(b, xa, vz0, xb, escGap[0], y);
        rail(b, xa, escGap[1], xb, vz1, y);
      } else rail(b, xa, vz0, xb, vz1, y);
    }
  }
  rail(b, -34.08, vz0, -34, z3, F3);
  rail(b, -HX, z3 - 0.08, -41.92, z3, F3);
  rail(b, -38.08, z3 - 0.08, -34, z3, F3);
  rail(b, -34, vz0 - 0.08, HX, vz0, F3);

  // ── Columns at the corners of the void, floor to roof ──
  for (const sx of [-1, 1]) {
    for (const z of [vz1 + 0.5, vz0 - 0.5]) {
      b.box('panel:#f1efe8', sx * vx1 + (sx > 0 ? 0.1 : -1.0), cf, z - 0.45, sx * vx1 + (sx > 0 ? 1.0 : -0.1), ROOF, z + 0.45);
    }
  }

  // ── South front: glass wall with the station doors ──
  const dw = 9, zf = FRONT - 0.3;
  for (const [xa, xb] of [[-HX, -dw], [dw, HX]]) {
    b.block(xa, GY, zf, xb, ROOF, FRONT);
    b.deco('glass', xa, GY, zf + 0.1, xb, ROOF, zf + 0.2);
  }
  b.block(-dw, GY + 3.4, zf, dw, ROOF, FRONT);
  b.deco('glass', -dw, GY + 3.4, zf + 0.1, dw, ROOF, zf + 0.2);
  for (let x = -HX; x <= HX; x += 5.5) {
    const door = Math.abs(x) < dw - 0.2;
    b.deco(TRIM, x - 0.12, door ? GY + 3.4 : GY, zf - 0.04, x + 0.12, ROOF, FRONT + 0.04);
  }
  for (const y of [GY + 3.4, F2 - SLAB, F3 - SLAB, ROOF - 0.9]) b.deco(TRIM, -HX, y, zf - 0.04, HX, y + 0.9, FRONT + 0.04);
  for (const sx of [-1, 1]) b.box(TRIM, Math.min(sx * dw, sx * (dw + 0.3)), GY, zf, Math.max(sx * dw, sx * (dw + 0.3)), GY + 3.4, FRONT);
  b.deco('flat:#0d3b66', -17, GY + 4.4, FRONT, 17, GY + 7.6, FRONT + 0.25);
  b.sign({ k: 'label', text: '川湊駅', sub: 'Kawaminato Station', fg: '#fff', bg: '#0d3b66' }, 0, GY + 6.0, FRONT + 0.27, [0, 1], 32, 3.0);
  b.sign({ k: 'clock' }, 0, 20, FRONT + 0.06, [0, 1], 4.4, 4.4, { dynamic: true });
  b.sign({ k: 'entrance', station: st.id }, 0, GY + 3.85, FRONT + 0.28, [0, 1], 8, 0.9);

  // ── Side and back walls. Glazed where a future railway will open onto the atrium. ──
  const glazed = (y0: number, fn: (mat: string | null, ya: number, yb: number) => void) => {
    fn(null, y0, y0 + 4.6);
    fn(PANEL, y0 + 4.6, y0 + 4.6 + 1.6);
  };
  // West: solid, with the willow mural.
  wallZ(b, PANEL, -HX - 0.4, -HX, HN, FRONT, GY, ROOF);
  b.sign({ k: 'mural', ...c.style.mural }, -HX + 0.02, F2 + 2.7, -84, [1, 0], 30, 4.4);
  // East: solid to level 2, then glass onto the private-railway bays.
  wallZ(b, PANEL, HX, HX + 0.4, HN, FRONT, GY, F2);
  glazed(F2, (mat, ya, yb) => {
    if (mat) wallZ(b, mat, HX, HX + 0.4, HN, FRONT, ya, yb);
    else {
      b.block(HX, ya, HN, HX + 0.4, yb, FRONT);
      b.deco('glass', HX + 0.15, ya, HN, HX + 0.25, yb, FRONT);
      for (let z = HN; z <= FRONT; z += 6) b.deco(TRIM, HX - 0.04, ya, z - 0.1, HX + 0.44, yb, z + 0.1);
    }
  });
  wallZ(b, PANEL, HX, HX + 0.4, HN, FRONT, F2 + 6.2, ROOF);
  // North: glass at level 2 (main line) and level 3 (high-speed).
  b.box(PANEL, -HX, GY, HN - 0.4, HX, F2, HN);
  for (const y0 of [F2, F3]) {
    glazed(y0, (mat, ya, yb) => {
      if (mat) b.box(mat, -HX, ya, HN - 0.4, HX, yb, HN);
      else {
        b.block(-HX, ya, HN - 0.4, HX, yb, HN);
        b.deco('glass', -HX, ya, HN - 0.25, HX, yb, HN - 0.15);
        for (let x = -HX; x <= HX; x += 5.5) b.deco(TRIM, x - 0.1, ya, HN - 0.44, x + 0.1, yb, HN + 0.04);
      }
    });
  }
  b.box(PANEL, -HX, F3 - 0.8, HN - 0.4, HX, F3, HN);
  b.box(PANEL, -HX, F3 + 6.2, HN - 0.4, HX, ROOF, HN);

  // ── Glass roof on white trusses ──
  b.deco('glassRoof', -HX - 0.4, ROOF, HN - 0.4, HX + 0.4, ROOF + 0.12, FRONT);
  for (let x = -HX; x <= HX; x += 8) b.deco('flat:#eef0f2', x - 0.2, ROOF - 1.1, HN, x + 0.2, ROOF, FRONT - 0.3);
  for (const z of [HN, -100, -88, -76, FRONT - 0.7]) b.deco('flat:#eef0f2', -HX, ROOF - 0.6, z, HX, ROOF, z + 0.4);

  // ── Future gate lines: where they will stand, closed off and signed ──
  const gateMark: SignContent = { k: 'label', text: '改札予定位置', sub: 'Future ticket gates', fg: '#1b1f24', bg: '#ffd100' };
  hoardingX(b, -14, 14, F2, HN + 0.5, 1, 1.25);
  b.sign(reserved('在来線のりば', 'main line platforms'), 0, F2 + 2.6, HN + 0.03, [0, 1], 20, 1.5);
  b.sign(gateMark, 0, F2 + 0.012, HN + 3, null, 9, 1.4, { top: [0, -1] });
  hoardingX(b, -14, 14, F3, HN + 0.5, 1, 1.25);
  b.sign(reserved('高速線のりば', 'high-speed line platforms'), 0, F3 + 2.6, HN + 0.03, [0, 1], 20, 1.5);
  b.sign(gateMark, 0, F3 + 0.012, HN + 3, null, 9, 1.4, { top: [0, -1] });
  b.box(HOARD, HX - 0.5, F2, -106, HX - 0.38, F2 + 1.25, -92);
  b.deco('flat:#e8a400', HX - 0.52, F2 + 0.93, -106, HX - 0.5, F2 + 1.13, -92);
  b.sign(reserved('私鉄線のりば', 'private railway terminal'), HX - 0.03, F2 + 2.6, -99, [-1, 0], 13, 1.5);
  b.sign(gateMark, HX - 3.2, F2 + 0.012, -99, null, 9, 1.4, { top: [1, 0] });

  // ── Level 1: way down to the metro, way out to the plaza ──
  const metro: SignContent = { k: 'guide', ja: `地下鉄 ${st.nameJa}駅`, en: `Metro: ${st.nameRomaji} Station`, bg: 'navy', badges: lines, arrow: 'up' };
  const out: SignContent = { k: 'guide', ja: '駅前広場・バス・タクシー', en: 'Station plaza / Bus / Taxi', bg: 'yellow', arrow: 'up' };
  b.hang(metro, vx1 + 2.2, GY + 2.9, -88, 5.6, 0.56, { ceil: F2 - SLAB, back: out });
  b.hang(out, -vx1 - 2.2, GY + 2.9, -88, 5.6, 0.56, { ceil: F2 - SLAB, back: metro });
  b.sign({ k: 'guide', ja: '2階・3階 将来線コンコース', en: 'Levels 2 and 3 — future railway concourses', bg: 'white', arrow: 'up' }, 40, GY + 2.6, -75.2, [0, 1], 3.6, 0.44);
  b.deco('flat:#22262b', 38.1, GY + 2.3, -75.3, 41.9, GY + 2.9, -75.22);
  for (const z of [-108, -96, -84, -70]) b.sign({ k: 'poster', v: Math.abs(z) }, -HX + 0.02, GY + 1.7, z, [1, 0], 1.6, 2.2);
  b.sign({ k: 'mural', ...c.style.mural }, 0, cf + 3.0, HN + 0.02, [0, 1], 60, 4.6);

  // ── Kin no Yanagi: the gilded willow everyone meets under ──
  const wz = -88;
  b.box('flat:#2b2e32', -2.4, cf, wz - 2.4, 2.4, cf + 0.5, wz + 2.4);
  b.mesh('flat:#c9a227', 'cyl', 0, cf + 3.9, wz, 0.7, 6.8, 0.7);
  b.block(-0.4, cf, wz - 0.4, 0.4, cf + 6, wz + 0.4);
  b.mesh('flat:#d9b43a', 'sphere', 0, cf + 8.4, wz, 6.4, 3.4, 6.4);
  b.mesh('flat:#e6c75a', 'sphere', 0, cf + 9.3, wz, 3.6, 2.4, 3.6);
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2, rad = i % 2 ? 2.9 : 2.2;
    const x = Math.cos(a) * rad, z = wz + Math.sin(a) * rad;
    b.deco('flat:#e2c04a', x - 0.035, cf + 3.2 + (i % 4) * 0.55, z - 0.035, x + 0.035, cf + 8.2, z + 0.035);
  }
  b.deco('flat:#12382c', -0.85, cf + 2.5, wz - 0.42, 0.85, cf + 4.2, wz + 0.42);
  for (const s of [-1, 1] as const) b.sign({ k: 'clock' }, 0, cf + 3.35, wz + s * 0.43, [0, s], 1.5, 1.5, { dynamic: true });
  b.box('flat:#12382c', -1.5, cf, wz + 3.3, 1.5, cf + 1.5, wz + 3.5);
  b.sign({ k: 'label', text: '金の柳', sub: 'Kin no Yanagi — meeting point', fg: '#f3e3a0', bg: '#12382c' }, 0, cf + 0.85, wz + 3.51, [0, 1], 2.9, 1.2);
  for (const [bx, bz, lx, lz] of [[0, -3.3, 1.8, 0.3], [-3.3, 0, 0.3, 1.8], [3.3, 0, 0.3, 1.8]]) b.box('wood:#6b5440', bx - lx, cf, wz + bz - lz, bx + lx, cf + 0.45, wz + bz + lz);

  // ── Zones ──
  b.zone('concourse', -HX, cf - 0.3, HN, HX, cf + 5.4, FRONT, 'アトリウム「金の柳」前', 'Atrium floor — Kin no Yanagi', true);
  b.zone('concourse', -HX, GY - 0.2, HN, HX, GY + 5, FRONT, '川湊駅 アトリウム 1階', 'Kawaminato Station — atrium, level 1');
  b.zone('concourse', -HX, F2 - 0.2, HN, HX, F2 + 5, FRONT, '2階 連絡ギャラリー', 'Level 2 gallery (future main line and private railway)');
  b.zone('concourse', -HX, F3 - 0.2, HN, HX, F3 + 5, z3, '3階 高速線コンコース予定地', 'Level 3 landing (future high-speed line)');
}

// ───────────────────────── shells ─────────────────────────

/** Bare rail on a deck: two dark strips. No sleepers, no wires: this track is not in use. */
function deadTrack(b: Builder, x0: number, x1: number, y: number, z: number) {
  for (const g of [-0.72, 0.72]) b.deco('flat:#55595e', x0, y, z + g - 0.04, x1, y + 0.14, z + g + 0.04);
}

function shells(h: H) {
  const { b } = h;
  const END = HUB_PLOT.x - 4;
  const BASE = 'facade:grid:#b9b3a6';
  const zs = HN - 0.4; // south edge of the rail decks

  // ── Main line: four tracks, two island platforms, on a viaduct behind the atrium ──
  b.box(BASE, -BLDG, GY, DECK_N, BLDG, 5.4, zs);
  b.box('concrete', -END, 5.4, DECK_N, END, 6.0, zs);
  for (const z of [-148.3, -136.9, -132.7, -121.3]) deadTrack(b, -END, END, 6.0, z);
  for (const [z0, z1] of [[-146.6, -138.6], [-131, -123]]) {
    b.deco('concrete', -100, 6.0, z0, 100, F2 - 0.06, z1);
    b.deco(STONE, -100, F2 - 0.06, z0, 100, F2, z1);
    b.deco('tactile', -100, F2, z0 + 0.5, 100, F2 + 0.008, z0 + 0.8);
    b.deco('tactile', -100, F2, z1 - 0.8, 100, F2 + 0.008, z1 - 0.5);
  }
  b.deco(STONE, -HX, F2 - SLAB, -119.4, HX, F2, zs);
  // Columns carry the high-speed deck above.
  for (let x = -180; x <= 180; x += 20) {
    b.deco('concrete', x - 0.6, 6.0, -135.4, x + 0.6, 12.4, -134.2);
    if (Math.abs(x) > BLDG) for (const z of [-144, -118]) b.box('concrete', x - 0.9, GY, z - 0.9, x + 0.9, 5.4, z + 0.9);
  }

  // ── High-speed line: stacked on top, two tracks between side platforms ──
  b.deco('concrete', -END, 12.4, DECK_N, END, 13.0, -124);
  for (const z of [-141.5, -132.5]) deadTrack(b, -END, END, 13.0, z);
  for (const [z0, z1] of [[DECK_N, -146], [-128, -124]]) {
    b.deco('concrete', -110, 13.0, z0, 110, F3 - 0.06, z1);
    b.deco(STONE, -110, F3 - 0.06, z0, 110, F3, z1);
  }
  b.deco(STONE, -HX, F3 - SLAB, -124, HX, F3, zs);
  b.deco('panel:#e4e6e8', -END, 13.0, DECK_N - 0.3, END, 15.4, DECK_N);
  b.deco('flat:#eef0f2', -112, 19.6, DECK_N - 0.5, 112, 19.9, -123.5);
  for (let x = -110; x <= 110; x += 22) {
    for (const z of [DECK_N + 0.2, -124.2]) b.deco('flat:#8d949b', x - 0.15, F3, z - 0.15, x + 0.15, 19.6, z + 0.15);
  }

  // ── Private railway: dead-end bay platforms at level 2, inside the east block ──
  const z0 = -108, z1 = -68;
  b.box('facade:grid:#d8d5cc', HX + 0.4, GY, HN, BLDG, 6.0, FRONT);
  b.box('facade:grid:#d8d5cc', HX + 0.4, F2 + 7.5, HN, BLDG, 34, FRONT);
  b.box('facade:grid:#d8d5cc', HX + 0.4, 6.0, z1, BLDG, F2 + 7.5, FRONT);
  b.box('facade:grid:#d8d5cc', HX + 0.4, 6.0, HN, BLDG, F2 + 7.5, z0);
  b.sign({ k: 'label', text: '川湊ステーションビル', sub: 'Kawaminato Station Building', fg: '#fff', bg: '#0d3b66' }, 78, 29.5, FRONT + 0.05, [0, 1], 44, 3.4);
  b.deco(STONE, HX + 0.4, F2 - SLAB, z0, 58, F2, z1);
  b.deco('concrete', 58, 5.4, z0, END, 6.0, z1);
  for (const z of [-104, -88, -72]) {
    deadTrack(b, 59.2, END, 6.0, z);
    b.deco('flat:#c62828', 58, 6.0, z - 1.1, 59.2, 7.3, z + 1.1);
    b.deco('flat:#f4f4f0', 58.9, 6.5, z - 1.1, 59.25, 6.8, z + 1.1);
  }
  for (const [pa, pb] of [[-101.5, -90.5], [-85.5, -74.5]]) {
    b.deco('concrete', 58, 6.0, pa, 172, F2 - 0.06, pb);
    b.deco(STONE, 58, F2 - 0.06, pa, 172, F2, pb);
    b.deco('flat:#eef0f2', BLDG, 11.2, pa - 0.6, 172, 11.4, pb + 0.6);
    for (let x = BLDG + 6; x < 172; x += 12) b.deco('flat:#8d949b', x - 0.12, F2, (pa + pb) / 2 - 0.12, x + 0.12, 11.2, (pa + pb) / 2 + 0.12);
  }
  for (let x = 124; x <= 184; x += 20) for (const z of [-100, -76]) b.box('concrete', x - 0.8, GY, z - 0.8, x + 0.8, 5.4, z + 0.8);

  b.keepOut(-HUB_PLOT.x, 5.4, DECK_N, HUB_PLOT.x, 25, zs, 'future main-line and high-speed decks');
  b.keepOut(HX + 0.4, 5.4, z0, HUB_PLOT.x, 14, z1, 'future private-railway bays');

  // ── Where each unfinished deck stops: a hoarded end, as left by the builders ──
  for (const s of [-1, 1]) {
    const xa = Math.min(s * END, s * (END + 0.2)), xb = Math.max(s * END, s * (END + 0.2));
    b.deco(HOARD, xa, 6.0, DECK_N, xb, 8.4, zs);
    b.deco('flat:#e8a400', xa - 0.02, 7.9, DECK_N, xb + 0.02, 8.1, zs);
    b.deco(HOARD, xa, 13.0, DECK_N, xb, 15.4, -124);
  }
  b.deco(HOARD, END, 6.0, z0, END + 0.2, 8.4, z1);
  b.deco('flat:#e8a400', END - 0.02, 7.9, z0, END + 0.22, 8.1, z1);
}

// ───────────────────────── street ─────────────────────────

function street(h: H, seed: number) {
  const { b, c } = h;
  const r = rng(seed);
  const { x: X, z: Z } = HUB_PLOT;
  const AV = 11, YS = 10, S_FRONT = 19;
  const bldg: Rect = [-BLDG, DECK_N, BLDG, FRONT];
  const bus: Rect = [56, -58, 176, -26];
  const taxi: Rect = [-176, -44, -56, -34];
  const drives: Rect[] = [[96, -26, 108, -AV], [152, -26, 164, -AV], [-108, -34, -96, -AV], [-164, -34, -152, -AV]];
  const stairs = b.out.holes.map((q) => [...q]);

  // ── Ground ──
  b.slab('asphalt', -X, -Z, X, Z, -0.6, 0, [...stairs, bldg]);
  b.slab('paver', -X, -Z, X, Z, 0, GY, [...stairs, bldg, [-X, -AV, X, AV], [-YS, AV, YS, Z], bus, taxi, ...drives]);
  b.zone('street', -X, -0.3, -Z, X, 80, Z, '川湊駅前・北大通', 'Kawaminato Station plaza and Kita-Ōdōri avenue');
  b.block(-X - 1, -1, -Z - 1, -X, 60, Z + 1);
  b.block(X, -1, -Z - 1, X + 1, 60, Z + 1);
  b.block(-X, -1, -Z - 1, X, 60, -Z);
  b.block(-X, -1, Z, X, 60, Z + 1);

  // ── Kita-Ōdōri avenue (east–west) and the head of Yanagi-suji (south) ──
  const junction = (x: number) => Math.abs(x) < YS + 9;
  for (let x = -X; x < X; x += 6) {
    if (junction(x + 1.5)) continue;
    for (const z of [-AV / 2, AV / 2]) b.deco('flat:#e9e9e4', x, 0.004, z - 0.07, x + 3, 0.01, z + 0.07);
  }
  b.deco('flat:#e6a700', -X, 0.004, -0.08, -YS - 9, 0.01, 0.08);
  b.deco('flat:#e6a700', YS + 9, 0.004, -0.08, X, 0.01, 0.08);
  for (let z = AV + 9; z < Z; z += 6) {
    for (const x of [-YS / 2, YS / 2]) b.deco('flat:#e9e9e4', x - 0.07, 0.004, z, x + 0.07, 0.01, z + 3);
  }
  b.deco('flat:#e6a700', -0.08, 0.004, AV + 9, 0.08, 0.01, Z);
  for (const x of [-YS - 4, YS + 4]) crosswalk(b, x, 0, 2 * AV - 0.6, 4, true);
  crosswalk(b, 0, AV + 3.2, 2 * YS - 0.4, 4, false);
  signal(b, -YS - 7.5, AV + 0.7, -AV * 0.8, -1, true);
  signal(b, YS + 7.5, -AV - 0.7, AV * 0.8, 1, true);
  const cols = ['#e8e8e8', '#30343a', '#9c1f1f', '#1f4e8c', '#c9c2a8', '#5f6a72'];
  for (let i = 0; i < 12; i++) {
    const x = -X + 16 + r() * (2 * X - 32);
    if (junction(x) || Math.abs(x) < 30) continue;
    const taxiCab = r() < 0.3;
    car(b, x, (r() < 0.5 ? -1 : 1) * (r() < 0.5 ? 2.8 : 8.2), taxiCab ? '#1d4d2b' : cols[Math.floor(r() * cols.length)], true, taxiCab);
  }
  for (const z of [46, 78, 120]) car(b, r() < 0.5 ? -2.8 : 6.5, z, cols[Math.floor(r() * cols.length)], false);
  for (let x = -X + 8; x < X; x += 18) {
    if (!junction(x) && !stairs.some((q) => x > q[0] - 6 && x < q[2] + 6)) tree(b, x, AV + 1.6, 6.2, 'leaf2');
  }
  for (const sx of [-1, 1]) for (let z = S_FRONT + 12; z < Z - 4; z += 15) tree(b, sx * (YS + 1.6), z, 6.5, 'leaf');

  // ── City blocks south of the avenue ──
  fillModelLots(b, r, -X + 1, -YS - 3, S_FRONT, Z, { tower: true });
  fillModelLots(b, r, YS + 3, X - 1, S_FRONT, Z, { tower: true, cornerAtStart: true });

  // ── The station plaza ──
  // Bus terminal (east): three lanes, two islands, four stops.
  for (const [z0, z1] of [[-49, -46], [-39, -36]]) b.box('paver', 66, 0, z0, 168, GY, z1);
  const stops: [number, number, string, string][] = [
    [88, -47.5, '川湊港・ベイエリア', 'Kawaminato-kō / Bay area'],
    [140, -47.5, '川湊大学・雲雀野', 'University / Hibarino'],
    [88, -37.5, '緑坂・北丘', 'Midorizaka / North hills'],
    [140, -37.5, '鶴松・下町', 'Tsurumatsu / Old town'],
  ];
  stops.forEach(([x, z, ja, en], i) => {
    for (const px of [-5, 5]) b.box('flat:#8d949b', x + px - 0.08, GY, z - 0.08, x + px + 0.08, GY + 2.7, z + 0.08);
    b.deco('flat:#eef0f2', x - 6, GY + 2.7, z - 1.2, x + 6, GY + 2.84, z + 1.2);
    b.box('flat:#3b4046', x - 3, GY, z - 0.25, x + 3, GY + 0.45, z + 0.25);
    for (const s of [-1, 1] as const) {
      b.sign({ k: 'label', text: `バスのりば ${i + 1}　${ja}`, sub: `Bus stop ${i + 1} — ${en}`, fg: '#fff', bg: '#0d3b66' }, x, GY + 2.3, z + s * 1.21, [0, s], 7, 0.62);
    }
  });
  const coach = (x: number, z: number) => {
    b.box('flat:#f2efe2', x - 5.3, 0.35, z - 1.3, x + 5.3, 3.1, z + 1.3);
    b.deco('flat:#1f9d55', x - 5.32, 0.9, z - 1.32, x + 5.32, 1.3, z + 1.32);
    b.deco('glassDark', x - 5.0, 1.5, z - 1.33, x + 5.0, 2.6, z + 1.33);
    b.deco('flat:#1a1a1a', x - 4.6, 0.02, z - 1.32, x + 4.6, 0.5, z + 1.32);
  };
  coach(84, -53.5);
  coach(128, -42.5);
  coach(104, -31);
  // Taxi rank (west).
  for (let i = 0; i < 6; i++) car(b, -66 - i * 6.2, -41.2, '#1d4d2b', true, true);
  b.box('flat:#8d949b', -62.06, GY, -33, -61.94, GY + 2.6, -32.88);
  b.sign({ k: 'label', text: 'タクシーのりば', sub: 'Taxi', fg: '#111', bg: '#ffd100' }, -62, GY + 2.3, -32.86, [0, 1], 3.2, 0.7);
  b.deco('flat:#eef0f2', -74, GY + 2.7, -33.6, -58, GY + 2.84, -31.4);
  for (const px of [-73, -59]) b.box('flat:#8d949b', px - 0.08, GY, -32.6, px + 0.08, GY + 2.7, -32.44);
  // The pedestrian middle: trees, benches, and the plaza's name.
  for (const [tx, tz] of [[-36, -30], [-24, -44], [24, -44], [36, -30], [-40, -54], [40, -54]]) tree(b, tx, tz, 6.5, 'leaf');
  for (const sx of [-1, 1]) {
    b.box('wood:#6b5440', sx * 18 - 1.3, GY, -36.3, sx * 18 + 1.3, GY + 0.45, -35.7);
    b.box('wood:#6b5440', sx * 30 - 1.3, GY, -50.3, sx * 30 + 1.3, GY + 0.45, -49.7);
  }
  b.box('flat:#0d3b66', -3.2, GY, -22.3, 3.2, GY + 2.1, -22);
  b.sign({ k: 'label', text: '川湊駅前広場', sub: 'Kawaminato Station Plaza', fg: '#fff', bg: '#0d3b66' }, 0, GY + 1.2, -21.99, [0, 1], 6.2, 1.5);
  b.sign({ k: 'guide', ja: `地下鉄 ${c.station.nameJa}駅`, en: `Metro: ${c.station.nameRomaji} Sta. — inside, down the escalators`, bg: 'navy', badges: h.lines, arrow: 'up' }, 0, GY + 1.2, -22.31, [0, -1], 6.2, 0.9);

  // ── West block: the station hotel; and a tower beyond the taxi rank ──
  b.box('facade:office:#8fa6b8', -BLDG, GY, HN, -HX - 0.4, 46, FRONT);
  b.sign({ k: 'label', text: '川湊ステーションホテル', sub: 'Kawaminato Station Hotel', fg: '#f3e3a0', bg: '#12382c' }, -78, 41, FRONT + 0.05, [0, 1], 44, 3.4);
  b.deco('glassDark', -96, GY, FRONT, -60, GY + 3.4, FRONT + 0.06);
  b.box('facade:apt:#d5cbb8', -X + 4, GY, -106, -BLDG - 8, 31, -68);
}

export function buildHub(c: Ctx, spec: HubSpec, other: { ctx: Ctx; dir: [number, number]; primaryDir: [number, number] }, beside?: Ctx, outer?: Ctx) {
  const { b, style } = c;
  const o = other.ctx;
  const pfY = hallDims(o.line, o.railY).pf;
  if (beside && beside.railY !== c.railY) throw new Error('the line beside the primary must be at its depth');
  if (outer && (!beside || outer.railY !== c.railY)) throw new Error('the outer line needs a line beside the primary, at the same depth');
  const h: H = {
    c, o, s: beside, m: outer, b, cf: pfY + CONC_RISE, pfA: hallDims(c.line, c.railY).pf, pfY,
    wall: style.concWall, floor: style.floor, lines: linesAt(c.station.id).map((l) => l.id),
  };
  b.out.plot = { ...HUB_PLOT };
  const holes = platforms(h, quarterTurns(other.primaryDir, other.dir));
  concourseLevel(h, holes);
  atrium(h);
  shells(h);
  street(h, spec.seed);
}
