// The Kita-Ōdōri hub: the city's central station.
//
// Four metro lines meet here (Akanesuji deep and east–west with Shiokaze and Sumire beside it,
// Yanagisuji above them and north–south). This file is the station below the street. Everything
// from the pavement up (the Mioya Terminal Building, the streets, the AR viaduct) is hub-street.ts.
//
// B1 is a set of passages, not one hall. The Central Passage (tall, unpaid) runs north–south
// from the food floor to the avenue, east of the Yanagisuji platforms. Off it: the Central Gate
// into the Yanagisuji gate hall; the North Passage; the West Passage; and Miochika Ōdōri under
// the avenue, where the Akanesuji Line has a West Gate hall and an East Gate standing as an
// island in the mall. Shiokaze and Sumire are reached from the paid transfer hall by the South
// Passage. South of the avenue Miochika goes on as a loop of streets round the Yanagisuji vault
// (`town`); north of the passages lies the Mioya Food Floor (`court`).
//
// Frame: +x east (the Akanesuji Line's direction), +z south, so north is -z.
//
//   level   y      what
//   B1      -7     passages, gate halls, Miochika, the Mioya Food Floor
//   B2     -12     Yanagisuji island platform (vaulted hall)
//   B4     -19     Akanesuji island platform; Shiokaze and Sumire beside it

import { linesAt, stationById } from '../data/network';
import { HALL_HALF, PLATFORM_HALF } from '../sim/geometry';
import type { SignContent } from '../signs/content';
import { rng, type Builder } from '../world/builder';
import { MIRROR_X, islandUnit, platformStairs, quarterTurns, type Rect } from './build';
import { CONC_RISE, GROUND_Y, SLAB, ceilingLight, exit, stairs, hall, hallDims, pillar as column, rail, ticketMachines, vending, type Ctx } from './kit';
import type { HubSpec } from './specs';
import { HALL_DOOR, HALL_STAIR, HALL_STAIR_Z, HUB_PLOT, hubStreet } from './hub-street';
import { EXIT15, exit15Run } from './kawaminato';
import { lift } from './lift';
import { MIOCHIKA } from './anchors/miochika';
import { BUILDING_MODELS } from './buildings';
import { fitting } from './fittings';
import { PLACES, place } from './places';
import { modelTree, type TreeKind } from './trees';
import { posterWall, shopAlcove, shopFits, shopPreset, shopRoom } from './shopfronts';
import { KONBINI, konbini } from './konbini';
import { kerbGaps, kerbRail, pedSignal, poleLine, roadKit, roadModel, roadSign, shortSignal, streetLamp } from './roads';
import { VEH } from '../traffic/vehicles';
import { SHOPS, crosswalk, fillModelLots, isAlleyLot, smallRoad, type Shop } from './surface';

const GY = GROUND_Y;
/** Clear height of the B1 passages and halls, and of the Central Passage. */
const H1 = 3.6, SP = 5.4;
/** Half-width (in z) of Miochika under the avenue. */
const BAR = 12;
/** West gate line; the mall runs out to ±MALL_X. */
const GATE_W = -46, MALL_X = 150;
/** The station building's front, and the south wall of the North Passage along it. */
const FRONT = -64, XP = -56;
/** Central Passage and West Passage (x ranges), and the east end of the North Passage. */
const CP: [number, number] = [15, 25], WP: [number, number] = [-62, -52], XE = 40;
/** Yanagisuji gate hall, and the Central Gate between it and the Central Passage. */
const YH = { x0: -6, x1: 13.2, z0: -46 }, GATE_Y = 14;
/** Doorway from the Yanagisuji gate hall south into the transfer hall. */
const YD: [number, number] = [4, 10];
/** Central Gate lobby just inside the gates (z range), and the corridors' west edge (x). */
const LOB: [number, number] = [-35, -23], COR = 4;
/** Outer half-width of a walled stairwell, and the walkway's east edge in the South Passage. */
const WELL = 2.35, SPE = -25;
/** South edge (z) of the doorway to exit 9, the plaza entrance off the Central Passage; exits.ts mirrors it. */
const P9 = -16;
/** South gate: its gate line and the end of the South Passage (z); exit 10's doorway (x, north edge z). exits.ts mirrors it. */
const SG = { gate: 37, end: 49, door: -14.2, z: 44.8 };
/** Doorways from Willow Court into the food hall in the west wing. */
const FOOD: [number, number][] = [[-100, -94], [-82, -76]];
/** East wall of the paid transfer hall. */
const TX = 10;
/** Foot of the Akanesuji escalator banks: the east one climbs east, the west one west. */
const EA0 = 30, WA0 = 13;
/** The East Gate, at the head of the east bank. */
const GATE_E = 57;
/** Station building: outer half-width, inner hall half-width, north wall. */
const HX = 44, IX = 24, HN = -112;
/** The well, open from the B1 floor to the glass roof. */
const VOID: Rect = [-14, -100, 14, -76];
const F2 = 7, F3 = 14, ROOF = 26;
/** Station building half-width, and the north edge of the rail decks. */
const BLDG = 112, DECK_N = -150;
/** x of each mall exit's passage (mirrored west). */
const EXITS = [76, 120];
/** Stone and brass: travertine walls over a dark dado, brass trim, dark timber shop fronts. */
const STONE = 'floor:#d6cebb';
const DADO = 'panel:#6e5f4d', TIMBER = 'wood:#4a3626', COL = 'panel:#ddd2ba', BORDER = 'floor:#5b5146', BEAM = 'paint:#ece5d3';
const TRIM = 'flat:#dfe3e6';
const HOARD = 'flat:#f4f4f0';
const GOLD = 'flat:#b08d3a';
const PANEL = 'panel:#e6dcc6';

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

/** Dark stone dado with a brass line on top, on every face of a wall segment standing on floor `y`. */
function dado(b: Builder, x0: number, y: number, z0: number, x1: number, z1: number) {
  b.deco(DADO, x0 - 0.012, y, z0 - 0.012, x1 + 0.012, y + 1.1, z1 + 0.012);
  b.deco(GOLD, x0 - 0.016, y + 1.1, z0 - 0.016, x1 + 0.016, y + 1.15, z1 + 0.016);
}
/** The runs of [a, b] left between gaps. */
function runs(a: number, b: number, gaps: number[][]): [number, number][] {
  const out: [number, number][] = [];
  let x = a;
  for (const [f, t] of [...gaps].sort((p, q) => p[0] - q[0])) {
    if (f > x) out.push([x, Math.min(f, b)]);
    x = Math.max(x, t);
  }
  if (x < b) out.push([x, b]);
  return out;
}
/** A stone wall along x with its dado. */
function stoneX(b: Builder, mat: string, xa: number, xb: number, z0: number, z1: number, y0: number, y1: number, gaps: number[][] = []) {
  b.wallX(mat, xa, xb, z0, z1, y0, y1, gaps);
  for (const [a, e] of runs(xa, xb, gaps)) dado(b, a, y0, z0, e, z1);
}
/** A stone wall along z with its dado. */
function stoneZ(b: Builder, mat: string, x0: number, x1: number, za: number, zb: number, y0: number, y1: number, gaps: number[][] = []) {
  wallZ(b, mat, x0, x1, za, zb, y0, y1, gaps);
  for (const [a, e] of runs(za, zb, gaps)) dado(b, x0, y0, a, x1, e);
}
/** A free-standing stone block with its dado. */
function stoneBox(b: Builder, mat: string, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) {
  b.box(mat, x0, y0, z0, x1, y1, z1);
  dado(b, x0, y0, z0, x1, z1);
}

/** A Blender-built prop of this station (tools/blender/build_hub.py), turned `rot` quarter turns, with a collider `half` wide. */
function prop(b: Builder, id: string, x: number, y: number, z: number, rot: 0 | 1 | 2 | 3 = 0, half: [number, number] | null = null, tall = 1) {
  b.with({ rot, t: [x, 0, z] }, () => b.model('hub', id, 0, y, 0));
  if (half) b.block(x - half[0], y, z - half[1], x + half[0], y + tall, z + half[1]);
}

/**
 * The district's own blocks and towers (tools/blender/build_city.py, which this mirrors):
 * frontage, depth, height.
 */
const CITY: Record<string, { w: number; d: number; h: number }> = {
  mid_a: { w: 28, d: 20, h: 44 }, mid_b: { w: 24, d: 18, h: 36 }, mid_c: { w: 30, d: 22, h: 52 },
  mid_d: { w: 22, d: 18, h: 32 }, mid_e: { w: 26, d: 20, h: 40 }, mid_f: { w: 20, d: 20, h: 48 },
  twr_a: { w: 40, d: 40, h: 150 }, twr_b: { w: 44, d: 36, h: 130 }, twr_c: { w: 36, d: 36, h: 112 },
  twr_d: { w: 46, d: 44, h: 96 }, twr_e: { w: 38, d: 38, h: 180 },
  twr_f: { w: 34, d: 34, h: 165 }, twr_g: { w: 44, d: 30, h: 140 }, twr_h: { w: 36, d: 36, h: 176 },
  twr_i: { w: 40, d: 30, h: 122 }, twr_j: { w: 32, d: 32, h: 156 }, twr_k: { w: 42, d: 42, h: 106 },
  super: { w: 60, d: 60, h: 322 },
};
/** The block with a shop bay in its base (build_city.py mid_k): the bay's width, depth and height. */
const MID_K = { w: 24, d: 20, h: 36, bay: [12, 10.2, 4] };
/** Where that block stands on the avenue's south side (its west edge), and the kiosk shop's middle (z) on the Central Passage's east wall. */
const SHOP_X0 = -66, KIOSK_Z = -40;
/** What a back row is filled with: the district's mid-rise blocks, and the street set's offices and apartment blocks. */
const ROW_POOL = [
  ...Object.entries(CITY).map(([id, m]) => ({ kind: 'city', id, ...m })).filter((m) => m.id.startsWith('mid')),
  ...BUILDING_MODELS.filter((m) => (m.kind === 'office' || m.kind === 'manshon') && !m.corner),
];
/** Street furniture (build_city.py), drawn merged like the road kit's. `f` is the way its front faces. */
function furniture(b: Builder, id: string, x: number, z: number, f: [number, number] = [0, -1]) {
  const d = b.dir(f);
  b.out.models.push({ kind: 'city', id, pos: b.pt(x, GY, z), yaw: Math.atan2(-d[0], -d[1]) + 0, seed: 0, merge: true });
}
/** A street tree: ginkgo and zelkova in turn by block along the avenue, or the kind given. */
function streetTree(b: Builder, x: number, z: number, n: number, kind?: TreeKind) {
  modelTree(b, kind ?? (Math.floor((x + 400) / 54) % 2 ? 'zelkova' : 'ginkgo'), x, z, n % 3 === 2 ? 'b' : 'a', GY, true);
}

/** One of the plaza's own buildings (tools/blender/build_plaza.py), its front at z facing south (`south`) or north. */
function building(b: Builder, id: string, x: number, z: number, south: boolean) {
  b.with({ rot: south ? 2 : 0, t: [x, 0, z] }, () => b.model('plaza', id, 0, GY, 0));
}
const NAME_FG = '#f3e3a0', NAME_BG = '#12382c';

/** Double-sided sign hanging across the z axis: `front` faces south (+z), `back` faces north. */
function hangZ(b: Builder, front: SignContent, back: SignContent, x: number, y: number, z: number, w: number, h: number, ceil: number) {
  b.with({ rot: 1, t: [x, 0, z] }, () => b.hang(front, 0, y, 0, w, h, { ceil, back }));
}

/** "Reserved for future line" board. Says what kind of railway, never a service or a time. */
const reserved = (ja: string, en: string): SignContent => ({
  k: 'label', text: `将来線予定地　${ja}`, sub: `Reserved for future line — ${en}`, fg: '#1b1f24', bg: '#ffd100',
});
const gateMark: SignContent = { k: 'label', text: '改札予定位置', sub: 'Future ticket gates', fg: '#1b1f24', bg: '#ffd100' };

/** Construction hoarding along x at z (facing `n`), white with a warning stripe. */
function hoardingX(b: Builder, x0: number, x1: number, y: number, z: number, n: 1 | -1, h = 2.2) {
  const za = Math.min(z, z + n * 0.12), zb = Math.max(z, z + n * 0.12);
  b.box(HOARD, x0, y, za, x1, y + h, zb);
  const zs = z + n * 0.13;
  b.deco('flat:#e8a400', x0, y + h - 0.32, Math.min(z, zs), x1, y + h - 0.12, Math.max(z, zs));
  b.deco('flat:#1b1f24', x0, y + 0.02, Math.min(z, zs), x1, y + 0.14, Math.max(z, zs));
}

/** Gilded frame at the foot of an escalator bank (foot at x = 0), with the line's colour under the lintel. */
function portal(b: Builder, pf: number, color: string) {
  for (const sz of [-1, 1]) b.deco(GOLD, -0.08, pf, Math.min(sz * 1.9, sz * 1.98), 0.08, pf + 3.2, Math.max(sz * 1.9, sz * 1.98));
  b.deco(GOLD, -0.08, pf + 3.05, -1.98, 0.08, pf + 3.2, 1.98);
  b.deco(`flat:${color}`, -0.09, pf + 2.97, -1.98, 0.09, pf + 3.05, 1.98);
}

/**
 * Brass frame at the head of a walled stair on a concourse floor `y`: posts either side, a
 * lintel in the line's colour, wall above it. The opening is `across` x or z, centred (x, z).
 */
function headPortal(b: Builder, wall: string, y: number, top: number, x: number, z: number, across: 'x' | 'z', color: string) {
  const w = 1.96, t = 0.1;
  const box = (mat: string, a0: number, y0: number, a1: number, y1: number, d = t) =>
    across === 'x' ? b.deco(mat, x + a0, y0, z - d, x + a1, y1, z + d) : b.deco(mat, x - d, y0, z + a0, x + d, y1, z + a1);
  box(GOLD, -w - 0.12, y, -w + 0.04, y + 2.62);
  box(GOLD, w - 0.04, y, w + 0.12, y + 2.62);
  box(GOLD, -w - 0.12, y + 2.62, w + 0.12, y + 2.8);
  box(`flat:${color}`, -w + 0.04, y + 2.5, w - 0.04, y + 2.62, t + 0.01);
  box(wall, -w - 0.12, y + 2.8, w + 0.12, top, t - 0.02);
}

// ───────────────────────── platforms ─────────────────────────

/** All platform halls, the deep escalators and the stairs. Returns the holes they cut in B1. */
function platforms(h: H, turns: 0 | 1 | 2 | 3): Rect[] {
  const { b, c, o, cf, pfA, pfY, wall } = h;
  const holes: Rect[] = [];
  const dA = hallDims(c.line, c.railY), dY = hallDims(o.line, o.railY);
  const runA = r2((cf - pfA) * 1.7);
  const aBlocks: [number, number][] = [[EA0, EA0 + runA], [-WA0 - runA, -WA0]];
  // Windows in the south wall look across the track into the hall next door.
  const windows: [number, number][] = [[-52, -40], [-6, 6], [40, 52]];

  // ── Akanesuji Line (frame-aligned): island platform, full-height doors ──
  hall(c, {
    ceil: [{ x0: -HALL_HALF, x1: HALL_HALF, y: pfA + 4.5, emit: true }],
    blocks: aBlocks,
    ceilHoles: aBlocks.map(([a, e]) => [a, -1.86, e, 1.86]),
    gaps: windows.map(([x0, x1]) => ({ s: 1 as const, x0, x1 })),
  });
  // Deep escalator banks, each in an open shaft. The west bank comes up inside the transfer
  // hall; the east bank stays walled in through B1 and comes out at its own gate in the mall.
  const base = pfA + 4.5 + SLAB;
  const toY: SignContent = {
    k: 'guide', ja: `${o.line.nameJa} のりかえ・出口`, en: `${o.line.nameEn} / Exit`, bg: 'white', badges: [o.line.id], arrow: 'up',
  };
  const toMall: SignContent = { k: 'guide', ja: '東改札・みおちか', en: 'East gate / Miochika', bg: 'yellow', arrow: 'up' };
  for (const s of [1, -1]) {
    const top = cf + H1;
    b.with(s > 0 ? { t: [EA0, 0, 0] } : { ...MIRROR_X, t: [-WA0, 0, 0] }, () => {
      holes.push(islandUnit(b, pfA, cf, runA, null));
      for (const sz of [-1, 1]) {
        b.box(wall, 0, base, Math.min(sz * 1.86, sz * 2.16), runA, top, Math.max(sz * 1.86, sz * 2.16));
        b.deco('light', 0.5, top - 0.3, Math.min(sz * 1.8, sz * 1.86), runA - 0.5, top - 0.18, Math.max(sz * 1.8, sz * 1.86));
        b.deco(`flat:${c.line.color}`, 0, top - 0.6, Math.min(sz * 1.84, sz * 1.86), runA, top - 0.45, Math.max(sz * 1.84, sz * 1.86));
        b.deco(GOLD, 0, top - 0.66, Math.min(sz * 1.84, sz * 1.86), runA, top - 0.62, Math.max(sz * 1.84, sz * 1.86));
      }
      b.box(wall, -0.3, base, -2.16, 0, top, 2.16);
      portal(b, pfA, c.line.color);
      b.hang(s > 0 ? toMall : toY, -1.6, pfA + 2.72, 0, 3.0, 0.44, {
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
    // Gilded rings where the low ceiling gives way to the vault.
    for (const x of [BAR + 1.2, BAR + 13, BAR + 25, BAR + 37]) {
      b.deco(GOLD, x - 0.12, pfY + 4.55, -dY.wallZ + 0.3, x + 0.12, pfY + 4.7, dY.wallZ - 0.3);
    }
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

/** The South Passage off the paid transfer hall (x range). The beside lines' shafts reach B1 in its west wall. */
const STUB: [number, number] = [-30, -22];
/** Centre-to-centre spacing of halls side by side at B4 (wall + 0.5 m structure + wall). */
const BESIDE_GAP = 15.9;
/** z of each beside hall's centre, and so of its shaft into the South Passage. */
const besideZ = (h: H) => {
  const zS = hallDims(h.c.line, h.c.railY).wallZ + 0.5 + 7.7;
  return h.m ? [zS, zS + BESIDE_GAP] : [zS];
};

/**
 * A line beside the primary: an island-platform hall centred `zc` south of the primary, sharing
 * its windows, with a stair and escalator in an enclosed shaft climbing east into the South
 * Passage off the transfer hall.
 */
function sHall(h: H, s: Ctx, zc: number, windows: [number, number][], sides: (1 | -1)[]) {
  const { b, c, cf, pfA, wall } = h;
  const run = r2((cf - pfA) * 1.7);
  const head = STUB[0], foot = head - run;
  const base = pfA + 4.5 + SLAB, top = cf + H1;
  b.with({ t: [0, 0, zc] }, () => {
    hall(s, {
      ceil: [{ x0: -HALL_HALF, x1: HALL_HALF, y: pfA + 4.5, emit: true }],
      blocks: [[foot, head]],
      ceilHoles: [[foot, -1.86, head, 1.86]],
      gaps: sides.flatMap((side) => windows.map(([x0, x1]) => ({ s: side, x0, x1 }))),
    });
    b.with({ t: [foot, 0, 0] }, () => {
      islandUnit(b, pfA, cf, run, cf);
      for (const sz of [-1, 1]) {
        b.box(wall, 0, base, Math.min(sz * 1.86, sz * 2.16), run, top, Math.max(sz * 1.86, sz * 2.16));
        b.deco('light', 0.5, top - 0.3, Math.min(sz * 1.8, sz * 1.86), run - 0.5, top - 0.18, Math.max(sz * 1.8, sz * 1.86));
        b.deco(`flat:${s.line.color}`, 0, top - 0.6, Math.min(sz * 1.84, sz * 1.86), run, top - 0.45, Math.max(sz * 1.84, sz * 1.86));
        b.deco(GOLD, 0, top - 0.66, Math.min(sz * 1.84, sz * 1.86), run, top - 0.62, Math.max(sz * 1.84, sz * 1.86));
      }
      b.box(wall, -0.3, base, -2.16, 0, top, 2.16);
      b.box('ceil', -0.3, top, -2.16, run, top + 0.5, 2.16);
      portal(b, pfA, s.line.color);
      b.hang(
        { k: 'guide', ja: `${c.line.nameJa}・${h.o.line.nameJa} のりかえ・出口`, en: 'Transfer / Exit', bg: 'white', badges: [c.line.id, h.o.line.id], arrow: 'up' },
        -1.6, pfA + 2.72, 0, 3.0, 0.44,
        { ceil: pfA + 4.5, back: { k: 'name', station: s.station.id, line: s.line.id, arrow: 'right' } },
      );
    });
  });
}

// ───────────────────────── maps, boards and small details ─────────────────────────

function details(h: H) {
  const { b, c, cf } = h;
  const id = c.station.id;
  const top = cf + H1, tall = cf + SP;
  const [c0, c1] = CP, [w0] = WP, [s0, s1] = STUB;
  const cx = (c0 + c1) / 2;
  /** A wall board in a brass frame. `n` is the way it faces. */
  const framed = (k: 'stationmap' | 'areamap' | 'exits', x: number, y: number, z: number, n: Pt, w = 2.2, hgt = 1.5) => {
    const ax = n[0] !== 0;
    const hw = w / 2 + 0.07, d = 0.012;
    if (ax) b.deco(GOLD, Math.min(x, x - n[0] * d), y - hgt / 2 - 0.07, z - hw, Math.max(x, x - n[0] * d), y + hgt / 2 + 0.07, z + hw);
    else b.deco(GOLD, x - hw, y - hgt / 2 - 0.07, Math.min(z, z - n[1] * d), x + hw, y + hgt / 2 + 0.07, Math.max(z, z - n[1] * d));
    b.sign({ k, station: id }, x + n[0] * 0.006, y, z + n[1] * 0.006, n, w, hgt);
  };
  // ── Maps and exit lists at the gates and junctions ──
  framed('stationmap', 28.2, cf + 1.6, FRONT + 0.03, [0, 1]);
  framed('areamap', 31.4, cf + 1.6, FRONT + 0.03, [0, 1]);
  framed('exits', 34.4, cf + 1.6, FRONT + 0.03, [0, 1], 2.0, 1.3);
  framed('exits', c1 - 0.03, cf + 1.6, P9 + 1.9, [-1, 0], 2.0, 1.3);
  framed('areamap', TX + 0.43, cf + 1.6, 7.2, [1, 0]);
  framed('exits', TX + 0.43, cf + 1.6, -7.6, [1, 0], 2.0, 1.3);
  framed('areamap', -48, cf + 1.6, BAR - 0.03, [0, -1]);
  framed('stationmap', 19.5, cf + 1.7, FRONT - 0.43, [0, -1]);
  framed('areamap', -14.5, cf + 1.7, FRONT - 0.43, [0, -1]);
  if (h.s) framed('areamap', s1 - 0.03, cf + 1.6, SG.gate + 4.5, [-1, 0]);

  // ── Live departure boards away from the gates ──
  const board = (x: number, y: number, z: number, n: Pt, w: number, hgt: number) => {
    const ax = n[0] !== 0, hw = w / 2 + 0.08;
    if (ax) b.deco('metal:#2b2f34', Math.min(x, x - n[0] * 0.03), y - hgt / 2 - 0.08, z - hw, Math.max(x, x - n[0] * 0.03), y + hgt / 2 + 0.08, z + hw);
    else b.deco('metal:#2b2f34', x - hw, y - hgt / 2 - 0.08, Math.min(z, z - n[1] * 0.03), x + hw, y + hgt / 2 + 0.08, Math.max(z, z - n[1] * 0.03));
    b.sign({ k: 'depAll', station: id }, x + n[0] * 0.01, y, z + n[1] * 0.01, n, w, hgt, { dynamic: true });
  };
  board(cx, cf + 4.28, -BAR - 0.43, [0, -1], 3.0, 1.3);
  board(c0 + 0.03, cf + 2.3, -40.5, [1, 0], 2.6, 1.12);
  board((HALL_DOOR[0] + HALL_DOOR[1]) / 2, cf + 5.45, FRONT - 0.43, [0, -1], 3.7, 1.6);
  board(TX - 0.03, cf + 2.1, 5.4, [-1, 0], 2.6, 1.12);

  // ── Tactile paving: guide lines down the passages, warning tiles at the gates ──
  b.deco('tactileBar', cx + 1.35, cf, XP, cx + 1.65, cf + 0.008, -BAR);
  b.deco('tactileBar', w0 + 4.85, cf, FRONT + 5.7, c1, cf + 0.008, FRONT + 6);
  b.deco('tactileBar', w0 + 4.85, cf, XP, w0 + 5.15, cf + 0.008, -BAR);
  b.deco('tactile', GATE_Y + 1.1, cf, -34, GATE_Y + 1.7, cf + 0.008, -24);
  b.deco('tactile', GATE_W - 1.7, cf, -4, GATE_W - 1.1, cf + 0.008, 4);
  b.deco('tactile', GATE_E + 1.1, cf, -3, GATE_E + 1.7, cf + 0.008, 3);

  // ── Fire cabinets (red lamp above) and an AED, bins by the columns ──
  const cabinet = (x: number, z: number, n: Pt) => {
    const ax = n[0] !== 0;
    const x1 = x + n[0] * 0.16, z1 = z + n[1] * 0.16;
    b.deco('paint:#b3261e', Math.min(x, x1) - (ax ? 0 : 0.32), cf + 0.5, Math.min(z, z1) - (ax ? 0.32 : 0), Math.max(x, x1) + (ax ? 0 : 0.32), cf + 1.5, Math.max(z, z1) + (ax ? 0.32 : 0));
    b.mesh('glow:#ff4a3a', 'sphere', x + n[0] * 0.1, cf + 1.72, z + n[1] * 0.1, 0.16, 0.16, 0.16);
    b.sign({ k: 'label', text: '消火栓', sub: 'Fire hydrant', fg: '#fff', bg: '#b3261e' }, x1 + n[0] * 0.005, cf + 1.0, z1 + n[1] * 0.005, n, 0.56, 0.3);
  };
  cabinet(w0 + 0.0, -48, [1, 0]);
  cabinet(w0 + 0.0, -20, [1, 0]);
  cabinet(c0, XP + 1.6, [1, 0]);
  cabinet(-20, -BAR, [0, 1]);
  cabinet(100, BAR, [0, -1]);
  cabinet(-100, BAR, [0, -1]);
  b.deco('paint:#f4f4f0', c0, cf + 0.9, -55.9, c0 + 0.14, cf + 1.5, -55.3);
  b.sign({ k: 'label', text: 'AED', sub: '自動体外式除細動器', fg: '#fff', bg: '#d22f27' }, c0 + 0.145, cf + 1.2, -55.6, [1, 0], 0.5, 0.5);
  for (let z = XP + 8; z < -BAR - 4; z += 12) {
    prop(b, 'bins', c1 - 0.85, cf, z, 1, [0.22, 0.5], 0.9);
  }

  // ── Hanging banners down the Central Passage, in the station's green and brass ──
  for (let z = XP + 8; z < -BAR - 4; z += 12) {
    b.deco(GOLD, cx - 0.9, tall - 0.62, z - 0.02, cx + 0.9, tall - 0.58, z + 0.02);
    for (const s of [-1, 1] as const) b.sign({ k: 'label', text: '川湊', sub: 'Kawaminato', fg: '#f3e3a0', bg: '#12382c' }, cx, tall - 1.2, z + s * 0.012, [0, s], 1.6, 1.15);
  }
}

// ───────────────────────── floor lines ─────────────────────────

type Pt = [number, number];
/** Band width, and the pitch between neighbouring bands. */
const BAND = 0.2, PITCH = 0.26;

/**
 * Inlaid floor bands along a route of axis-aligned legs, one per line, each line always in its
 * own slot across the bundle (so a band keeps its place where others peel away). Every long leg
 * carries the lines' badges with an arrow pointing along the route.
 */
function bands(h: H, y: number, pts: Pt[], who: Ctx[]) {
  const { b } = h;
  const order = [h.o, h.c, h.s, h.m];
  const dirs = pts.slice(1).map((q, i): Pt => [Math.sign(r2(q[0] - pts[i][0])), Math.sign(r2(q[1] - pts[i][1]))]);
  const nrm = dirs.map(([dx, dz]): Pt => [-dz, dx]);
  for (const x of who) {
    const off = (order.indexOf(x) - 1.5) * PITCH;
    const at = (j: number): Pt => {
      const a = nrm[Math.max(0, j - 1)], c = nrm[Math.min(nrm.length - 1, j)];
      const same = a[0] === c[0] && a[1] === c[1];
      return [pts[j][0] + off * (same ? a[0] : a[0] + c[0]), pts[j][1] + off * (same ? a[1] : a[1] + c[1])];
    };
    for (let i = 0; i < dirs.length; i++) {
      const p = at(i), q = at(i + 1), w = BAND / 2;
      b.deco(`paint:${x.line.color}`, Math.min(p[0], q[0]) - w, y + 0.004, Math.min(p[1], q[1]) - w, Math.max(p[0], q[0]) + w, y + 0.009, Math.max(p[1], q[1]) + w);
      const len = Math.abs(q[0] - p[0]) + Math.abs(q[1] - p[1]);
      if (len < 9) continue;
      for (let d = 2.4 + who.indexOf(x) * 0.95; d < len - 1.5; d += 15) {
        b.sign({ k: 'floormark', line: x.line.id, arrow: 'up' }, p[0] + dirs[i][0] * d, y + 0.012, p[1] + dirs[i][1] * d, null, 0.66, 0.66, { top: dirs[i] });
      }
    }
  }
}

/** Every route from a way in to each line's stairs, on B1 and from the station doors. */
function floorLines(h: H) {
  const { b, c, o, cf } = h;
  const all = [o, c, h.s, h.m].filter((x): x is Ctx => !!x);
  const deep = all.filter((x) => x !== o), beside = all.filter((x) => x !== o && x !== c);
  const SX = CP[0] + 2.2, GZ = -29; // the bundle's line down the Central Passage; the Central Gate's middle
  const [s0] = STUB, sx = (STUB[0] + SPE) / 2;
  const zs = besideZ(h);
  const xh = EA0 + r2((cf - h.pfA) * 1.7), wh = -WA0 - r2((cf - h.pfA) * 1.7);

  // From the foot of the stair down from the grand concourse to the food floor's door.
  bands(h, cf, [[1.2, -65.9], [0, -65.9], [0, FRONT]], all);
  // North Passage and Central Passage, in at the Central Gate.
  bands(h, cf, [[0, FRONT], [0, -60], [SX, -60], [SX, GZ], [GATE_Y + 1.9, GZ]], all);
  bands(h, cf, [[GATE_Y - 1.3, GZ], [7, GZ]], all);
  bands(h, cf, [[7, GZ], [COR + 0.3, GZ]], [o]);
  // On through the gate hall into the transfer hall: Akanesuji west, the others to the South Passage.
  bands(h, cf, [[7, GZ], [7, -5.5]], deep);
  bands(h, cf, [[7, -5.5], [wh - 2.6, -5.5], [wh - 2.6, -0.6]], [c]);
  if (beside.length) bands(h, cf, [[7, -5.5], [7, 9], [sx, 9]], beside);
  // Miochika east (exits 1–4): Akanesuji in at the East Gate, the others on to the Central Passage.
  bands(h, cf, [[MALL_X - 4, 8], [66, 8]], all);
  bands(h, cf, [[66, 8], [66, 0], [GATE_E + 1.9, 0]], [c]);
  bands(h, cf, [[GATE_E - 1.3, 0], [xh + 2.2, 0]], [c]);
  bands(h, cf, [[66, 8], [SX, 8], [SX, GZ + 0.6]], all.filter((x) => x !== c));
  // Miochika west (exits 5–8): everything in at the West Gate.
  bands(h, cf, [[-MALL_X + 4, 4], [-68, 4], [-68, 0], [GATE_W - 1.9, 0]], all);
  bands(h, cf, [[GATE_W + 1.3, 0], [-40, 0]], all);
  bands(h, cf, [[-40, 0], [wh - 2.8, 0]], [c]);
  bands(h, cf, [[-40, 0], [-40, -5.5], [-0.6, -5.5]], [o]);
  if (beside.length) bands(h, cf, [[-40, 0], [-40, 9], [sx, 9]], beside);
  // The South Passage: one trunk, each line peeling off at its shaft; and in from the South Gate.
  beside.forEach((x, i) => {
    bands(h, cf, [[sx, 9], [sx, zs[i]], [s0 + 0.8, zs[i]]], [x]);
    bands(h, cf, [[sx, SG.gate - 1], [sx, zs[i]], [s0 + 0.8, zs[i]]], [x]);
  });

  // Where each line's band ends: its badge and platform numbers, facing the way down.
  const mark = (x: Ctx, px: number, pz: number, top: Pt) =>
    b.sign({ k: 'floormark', line: x.line.id, arrow: 'up', nums: [...c.station.platforms[x.line.id]].sort((p, q) => p - q) }, px, cf + 0.012, pz, null, 1.3, 1.3, { top });
  mark(o, 3.0, -27, [-1, 0]);
  mark(o, 0, -6.4, [0, 1]);
  mark(c, wh - 1.4, 0, [1, 0]);
  mark(c, xh + 1.2, 0, [-1, 0]);
  beside.forEach((x, i) => mark(x, s0 + 1.0, zs[i] + 2.7, [-1, 0]));
}

// ───────────────────────── B1 ─────────────────────────

/** Counts the hub's fronts, to pick the shut ones. */
let shopN = 0;
/** A shop front on a wall along x at z, facing `n`, its floor at `y`. */
function shopFront(h: H, xa: number, xb: number, z: number, n: 1 | -1, s: Shop, y = h.cf, island = false) {
  const { b } = h;
  // `d` metres out from the wall face, as an ordered z range.
  const dz = (mat: string, x0: number, y0: number, d0: number, x1: number, y1: number, d1: number) =>
    b.deco(mat, x0, y0, Math.min(z + n * d0, z + n * d1), x1, y1, Math.max(z + n * d0, z + n * d1));
  // The front is the preset for the shop's kind (shopfronts.ts), standing D out from the wall;
  // about one in nine is shut behind its roller shutter.
  const D = 0.5, k = shopN++, shut = k % 9 === 5;
  // Decided once everything else stands: posters where no shop could be behind the wall (a stair,
  // a passage); else a room to walk into, a counter set back into the wall, or the plain front.
  b.later(() => {
    const f = { axis: 'x', at: z, n } as const, u0 = xa + 0.45, u1 = xb - 0.45;
    // (An island of stalls back to back in the middle of a mall is its own depth: always a shop.)
    if (!island && !shopFits(b, f, xa, xb, y)) return wallFill(h, f, xa, xb, y, k);
    for (const x of [xa + 0.3, xb - 0.45]) dz(TIMBER, x, y, 0, x + 0.15, y + 2.5, D + 0.04);
    dz(GOLD, xa + 0.2, y + 2.46, 0, xb - 0.2, y + 2.5, D + 0.05);
    dz(`flat:${s.bg}`, xa + 0.2, y + 2.5, 0, xb - 0.2, y + 3.3, D + 0.04);
    b.sign({ k: 'shop', ...s }, (xa + xb) / 2, y + 2.9, z + n * (D + 0.05), [0, n], Math.min(xb - xa - 0.9, 6.4), 0.66);
    if (!shut && (shopRoom(b, f, u0, u1, y, 2.46, D, s) || shopAlcove(b, f, u0, u1, y, 2.46, s))) return;
    shopPreset(b, f, u0, u1, y, 2.46, D, s, shut);
  });
}

/**
 * What a wall gets where no shop could be behind it (a stair or a passage is there): things that
 * need no depth, one per slot with stone left either side. Services, a lit advert box, a bench
 * alcove, a pop-up stall a metre out from the wall, or a framed mural, in turn by `k`.
 */
function wallFill(h: H, f: { axis: 'x'; at: number; n: 1 | -1 }, xa: number, xb: number, y: number, k: number) {
  const { b, c } = h, n = f.n, um = (xa + xb) / 2, w = xb - xa;
  const z = (d: number) => f.at + n * d, N: [number, number] = [0, n];
  const box = (mat: string, u0: number, u1: number, y0: number, y1: number, d0: number, d1: number) =>
    b.deco(mat, u0, y + y0, Math.min(z(d0), z(d1)), u1, y + y1, Math.max(z(d0), z(d1)));
  const solid = (u0: number, u1: number, hh: number, d0: number, d1: number) => b.block(u0, y, Math.min(z(d0), z(d1)), u1, y + hh, Math.max(z(d0), z(d1)));
  const shopsProp = (id: string, u: number, d: number) => {
    const dir = b.dir(N);
    b.out.models.push({ kind: 'shops', id, pos: b.pt(u, y, z(d)), yaw: Math.atan2(-dir[0], -dir[1]) + 0, seed: 0, merge: true });
  };
  const label = (text: string, sub: string, bg: string, u: number, yy: number, d: number, lw: number, lh = 0.3) =>
    b.sign({ k: 'label', text, sub, fg: '#fff', bg }, u, y + yy, z(d), N, lw, lh);
  if (w < 4.5) return posterWall(b, f, xa + 0.3, xb - 0.3, y, k);
  switch (k % 7) {
    case 0: {
      // Coin lockers.
      for (const u of [um - 0.8, um + 0.8]) {
        fitting(b, 'lock_mid', u, y, z(0.3), N);
        b.sign({ k: 'machine', v: 'locker', era: 'mid' }, u, y + 0.95, z(0.61), N, 1.58, 1.88);
      }
      solid(um - 1.6, um + 1.6, 1.9, 0, 0.6);
      label('コインロッカー', 'Coin lockers', '#2b4c7e', um, 2.25, 0.03, 1.8);
      break;
    }
    case 1: {
      // Drinks machines and bins.
      for (const [i, u] of [um - 1.6, um - 0.55, um + 0.5].entries()) vending(b, u, y, z(0.36), N, i % 2 ? 'vending2' : 'vending', 'mid');
      fitting(b, 'bins_mid', um + 1.75, y, z(0.25), N);
      solid(um + 1.1, um + 2.4, 0.96, 0.05, 0.45);
      break;
    }
    case 2:
    case 5: {
      // A wide lit advert box: three posters in one dark frame (case 5: a framed mural of the district).
      const hw = Math.min(2.7, w / 2 - 0.8);
      box('flat:#16181b', um - hw - 0.1, um + hw + 0.1, 0.55, 2.6, 0, 0.07);
      box('glow:#fff1d6', um - hw, um + hw, 2.5, 2.54, 0.07, 0.08);
      box(GOLD, um - hw - 0.14, um + hw + 0.14, 0.5, 0.55, 0, 0.09);
      if (k % 7 === 5) b.sign({ k: 'mural', ...c.style.mural }, um, y + 1.5, z(0.08), N, hw * 2 - 0.1, 1.8);
      else for (const i of [-1, 0, 1]) b.sign({ k: 'poster', v: Math.abs(k + i + 8) % 8 }, um + (i * hw * 2) / 3, y + 1.5, z(0.08), N, Math.min(1.25, (hw * 2) / 3 - 0.15), 1.75);
      break;
    }
    case 3: {
      // A bench alcove between two planters.
      for (const u of [um - 1.0, um + 1.0]) fitting(b, 'cbench_mid', u, y, z(0.45), N);
      solid(um - 1.9, um + 1.9, 0.45, 0.2, 0.7);
      for (const u of [um - 2.6, um + 2.6]) prop(b, 'planter', u, y, z(0.65), 0, [0.6, 0.6], 1.2);
      box(TIMBER, um - 2.0, um + 2.0, 0.9, 2.3, 0, 0.04);
      box(GOLD, um - 2.0, um + 2.0, 2.3, 2.34, 0, 0.05);
      b.sign({ k: 'poster', v: Math.abs(k) % 8 }, um, y + 1.6, z(0.05), N, 1.0, 1.3);
      break;
    }
    case 4: {
      // A pop-up stall a metre out from the wall: it needs no room behind it.
      const pick = [['cart', '季節の和菓子', 'Seasonal sweets', '#6a1b3a', 0.8, 2.1], ['lotto', '宝くじ', 'Lottery', '#c62828', 1.0, 2.3], ['bentotable', '駅弁', 'Station bento', '#8a2b18', 0.7, 2.0]] as const;
      const [id, ja, en, bg, dp, hh] = pick[Math.floor(k / 7) % 3];
      shopsProp(id, um, 1.1);
      solid(um - 0.95, um + 0.95, hh, 1.1 - dp / 2, 1.1 + dp / 2);
      if (id === 'lotto') label(ja, en, bg, um, 2.15, 1.1 + dp / 2 + 0.03, 1.2, 0.26);
      else if (id === 'cart') label(ja, en, bg, um, 1.35, 1.1 + dp / 2 + 0.01, 1.2, 0.24);
      else label(ja, en, bg, um, 1.8, 1.1 - dp / 2 + 0.06, 1.6, 0.34);
      posterWall(b, f, um - 1.2, um + 1.2, y, k);
      break;
    }
    default: {
      // Cash machines.
      box('flat:#f4f4f0', um - 1.3, um + 1.3, 0, 2.5, 0, 0.5);
      box('flat:#0d3b66', um - 1.3, um + 1.3, 2.2, 2.5, 0.5, 0.51);
      label('川湊信用金庫 ATM', 'Kawaminato Shinkin Bank', '#0d3b66', um, 2.35, 0.515, 2.2, 0.24);
      for (const u of [um - 0.7, um + 0.7]) {
        box('paint:#c9ccd0', u - 0.4, u + 0.4, 0, 1.0, 0.5, 0.95);
        box('paint:#c9ccd0', u - 0.4, u + 0.4, 1.0, 1.6, 0.5, 0.7);
        box('glow:#bfe4ff', u - 0.28, u + 0.28, 1.1, 1.45, 0.7, 0.71);
        box('flat:#3a3d41', u - 0.2, u + 0.2, 0.98, 1.0, 0.72, 0.9);
      }
      for (const u of [um - 1.3, -0.04 + um, um + 1.22]) box('flat:#d6d9dc', u, u + 0.08, 0, 2.2, 0.5, 1.0);
      solid(um - 1.3, um + 1.3, 2.5, 0, 0.95);
    }
  }
}

/**
 * More islands of stalls back to back, wherever a passage or hall on B1 is wide enough to keep 3 m
 * of walkway either side: nothing solid, no stair, no floor guide line and no hanging sign in the
 * way. Run at the end of the build (Builder.later), when all of that exists.
 */
function moreIslands(h: H) {
  const { b, cf } = h, top = cf + H1, L = 7, W = 3, side = 3.2, endGap = 3.5;
  const hit = (lo: number[], hi: number[], mn: number[], mx: number[]) => [0, 1, 2].every((a) => mn[a] < hi[a] && mx[a] > lo[a]);
  const clear = (x0: number, z0: number, x1: number, z1: number, alongX: boolean) => {
    const g: [number, number, number, number] = alongX ? [x0 - endGap, z0 - side, x1 + endGap, z1 + side] : [x0 - side, z0 - endGap, x1 + side, z1 + endGap];
    const lo = [g[0], cf - 0.005, g[1]], hi = [g[2], cf + 2.6, g[3]];
    // Solids above the floor, floor decals (guide lines, tactile paving), stairs, signs.
    if (b.out.boxes.some((q) => hit(lo, hi, q.min, q.max) && (q.solid ? q.max[1] > cf + 0.1 : q.max[1] < cf + 0.06))) return false;
    if (b.out.ramps.some((r) => r.x0 < hi[0] && r.x1 > lo[0] && r.z0 < hi[2] && r.z1 > lo[2] && r.yLow < cf + 3 && r.yHigh > cf - 1)) return false;
    if (b.out.models.some((m) => [0, 2].every((a) => m.pos[a] > lo[a] && m.pos[a] < hi[a]) && Math.abs(m.pos[1] - cf) < 3)) return false;
    return !b.out.signs.some((s) => s.pos[0] > x0 - 1 && s.pos[0] < x1 + 1 && s.pos[2] > z0 - 1 && s.pos[2] < z1 + 1 && s.pos[1] > cf - 0.1 && s.pos[1] < top + 1);
  };
  let made = 0;
  for (const zn of [...b.out.zones]) {
    if (zn.kind === 'platform' || zn.kind === 'street' || Math.abs(zn.min[1] - (cf - 0.2)) > 0.4 || made >= 8) continue;
    const dx = zn.max[0] - zn.min[0], dz = zn.max[2] - zn.min[2], alongX = dx >= dz;
    if (Math.min(dx, dz) < W + 2 * side || Math.max(dx, dz) < L + 2 * endGap) continue;
    const a0 = alongX ? zn.min[0] : zn.min[2], a1 = alongX ? zn.max[0] : zn.max[2];
    const centre = alongX ? (zn.min[2] + zn.max[2]) / 2 : (zn.min[0] + zn.max[0]) / 2, half = Math.min(dx, dz) / 2;
    // Down the middle if it is free, else to one side of it (the middle often carries the tactile path).
    const offs = [0, 4.5, -4.5, 6, -6].filter((o) => Math.abs(o) + W / 2 + side <= half);
    for (let a = a0 + endGap; a + L <= a1 - endGap && made < 8; a += 2) {
      const at = (o: number): [number, number, number, number] => (alongX ? [a, centre + o - W / 2, a + L, centre + o + W / 2] : [centre + o - W / 2, a, centre + o + W / 2, a + L]);
      const off = offs.find((o) => clear(...at(o), alongX));
      if (off === undefined) continue;
      const mid = centre + off;
      made++;
      const build = () => {
        b.box(TIMBER, 0, cf, -W / 2, L, top, W / 2);
        b.deco(BORDER, -0.5, cf, -W / 2 - 0.5, L + 0.5, cf + 0.006, W / 2 + 0.5);
        shopFront(h, 0, L, W / 2, 1, SHOPS[shopK++ % SHOPS.length], cf, true);
        shopFront(h, 0, L, -W / 2, -1, SHOPS[shopK++ % SHOPS.length], cf, true);
      };
      if (alongX) b.with({ t: [a, 0, mid] }, build);
      else b.with({ rot: 1, t: [mid, 0, a] }, build);
      a += L + 9;
    }
  }
}

/** Shop counter shared by every row, so no two neighbours repeat. */
let shopK = 0;
/** A row of shop fronts along x between x0 and x1. */
function shopsX(h: H, x0: number, x1: number, z: number, n: 1 | -1, y = h.cf) {
  const count = Math.max(1, Math.round((x1 - x0) / 8)), w = (x1 - x0) / count;
  for (let i = 0; i < count; i++) shopFront(h, x0 + i * w, x0 + (i + 1) * w, z, n, SHOPS[shopK++ % SHOPS.length], y);
}
/** A row of shop fronts on a wall along z at x, facing east (`face` 1) or west (-1). */
function shopsZ(h: H, x: number, z0: number, z1: number, face: 1 | -1, y = h.cf) {
  h.b.with({ rot: 1, t: [x, 0, 0] }, () => shopsX(h, z0, z1, 0, face > 0 ? -1 : 1, y));
}

/**
 * A ticket gate line across z at x = 0, `n` gates wide, fenced out to z0 and z1. The unpaid
 * side is +x. Unlike kit.ts gateLine it has no office block, so it fits a passage wall.
 */
function gates(h: H, n: number, z0: number, z1: number, screen = true) {
  const { b, c, cf, lines } = h;
  const first = (-(n - 1) / 2) * 1.05, edge = -first + 0.12;
  for (let i = 0; i < n; i++) {
    const z = first + i * 1.05;
    b.block(-0.8, cf, z - 0.13, 0.8, cf + 1.0, z + 0.13);
    fitting(b, 'gatecab', 0, cf, z);
    b.deco(i % 3 === 0 ? 'glow:#e53935' : 'glow:#32c86a', 0.78, cf + 0.72, z - 0.06, 0.81, cf + 0.86, z + 0.06);
  }
  for (const [a, e] of [[z0, -edge], [edge, z1]]) {
    b.box('metal:#c4c8cc', -0.05, cf, a, 0.05, cf + 1.15, e);
    b.deco('glass', -0.02, cf + 1.15, a, 0.02, cf + 1.9, e);
  }
  b.hang(
    { k: 'guide', ja: 'のりば', en: 'To trains', bg: 'navy', badges: lines, arrow: 'up' },
    0, cf + 2.6, 0, n > 5 ? 5.6 : 4.4, 0.5,
    { ceil: cf + H1, back: { k: 'guide', ja: '出口', en: 'Exit', bg: 'yellow', arrow: 'up' } },
  );
  b.protect(-0.7, cf + 2.3, -2.9, 0.7, cf + H1, 2.9);
  if (!screen) return;
  // Live departures screen facing the unpaid side.
  const sz = (z0 - edge) / 2;
  b.deco('metal:#2b2f34', 1.12, cf + 1.66, sz - 1.39, 1.3, cf + 2.94, sz + 1.39);
  b.deco('metal:#1c1f23', 1.12, cf + 2.94, sz - 1.42, 1.42, cf + 2.975, sz + 1.42);
  b.deco('flat:#050607', 1.296, cf + 1.715, sz - 1.325, 1.304, cf + 2.885, sz + 1.325);
  b.sign({ k: 'depAll', station: c.station.id }, 1.31, cf + 2.3, sz, [1, 0], 2.6, 1.12, { dynamic: true });
  b.deco('metal:#3a3f45', 1.18, cf + 2.975, sz - 0.035, 1.25, cf + H1, sz + 0.035);
}

function concourseLevel(h: H, holes: Rect[]) {
  const { b, c, o, cf, wall, floor, lines } = h;
  const top = cf + H1, tall = cf + SP;
  const st = c.station;
  const runA = r2((cf - h.pfA) * 1.7);
  const [c0, c1] = CP, [w0, w1] = WP, [s0, s1] = STUB;
  const cx = (c0 + c1) / 2;
  const xh = EA0 + runA; // head of the east escalator bank

  // ── Floors ──
  b.slab(floor, -MALL_X, -BAR, MALL_X, BAR, cf - SLAB, cf, holes);
  b.slab(floor, w0, FRONT, XE, -BAR, cf - SLAB, cf, holes);
  b.box(floor, c0, cf - SLAB, BAR, c1, cf, BAR + 5);
  b.box(STONE, -IX, cf - SLAB, HN, IX, cf, FRONT);

  // ── Ceilings: low everywhere, raised over the Central Passage ──
  b.box('ceil', -MALL_X, top, -BAR, MALL_X, top + 0.5, BAR);
  b.box('ceil', w0, top, FRONT, c0 - 0.4, top + 0.5, -BAR);
  b.box('ceil', c0 - 0.4, top, FRONT, XE, top + 0.5, XP);
  b.box('ceil', c0 - 0.4, tall, XP, c1 + 0.4, tall + 0.5, -BAR);
  b.box('ceil', c0, top, BAR, c1, top + 0.5, BAR + 5);
  // Bulkheads where the tall passage meets the low ones.
  b.box(wall, c0, top, XP, c1, tall + 0.5, XP + 0.4);
  b.box(wall, c0, top, -BAR - 0.4, c1, tall + 0.5, -BAR);
  b.box(wall, c0 - 0.4, top, YH.z0, c0, tall + 0.5, -BAR - 0.4);

  // ── Walls: Miochika ──
  const exitGaps = EXITS.flatMap((x) => [[x - 4, x], [-x, -x + 4]]);
  stoneX(b, wall, -MALL_X - 0.4, MALL_X + 0.4, -BAR - 0.4, -BAR, cf, top, [WP, YD, CP, ...exitGaps]);
  stoneX(b, wall, -MALL_X - 0.4, MALL_X + 0.4, BAR, BAR + 0.4, cf, top, [...exitGaps, [STUB[0], SPE], CP, TOWN_W, TOWN_E]);
  for (const [a, e] of exitGaps) {
    b.box(wall, a, cf + 2.7, -BAR - 0.4, e, top, -BAR);
    b.box(wall, a, cf + 2.7, BAR, e, top, BAR + 0.4);
  }
  for (const s of [-1, 1]) stoneBox(b, wall, Math.min(s * MALL_X, s * (MALL_X + 0.4)), cf, -BAR, Math.max(s * MALL_X, s * (MALL_X + 0.4)), top, BAR);

  // ── Walls: the passages and the Yanagisuji gate hall north of the mall ──
  stoneZ(b, wall, w0 - 0.4, w0, FRONT - 0.4, -BAR - 0.4, cf, top);
  stoneZ(b, wall, w1, w1 + 0.4, XP, -BAR - 0.4, cf, top);
  stoneX(b, wall, w1, XE + 0.4, XP, XP + 0.4, cf, top, [CP]);
  stoneBox(b, wall, XE, cf, FRONT, XE + 0.4, top, XP);
  stoneX(b, wall, w0 - 0.4, XE + 0.4, FRONT - 0.4, FRONT, cf, top, [HALL_DOOR]);
  const kz: [number, number] = [KIOSK_Z - KONBINI.kiosk.w / 2, KIOSK_Z + KONBINI.kiosk.w / 2];
  stoneZ(b, wall, c1, c1 + 0.4, XP + 0.4, -BAR - 0.4, cf, tall + 0.5, [kz, [P9 - 4, P9]]);
  b.box(wall, c1, cf + KONBINI.kiosk.h + 0.95, kz[0], c1 + 0.4, tall + 0.5, kz[1]);
  // A convenience store in the wall: open-fronted, facing the passage.
  b.with({ rot: 3, t: [c1 + 0.3, 0, KIOSK_Z] }, () => konbini(b, { type: 'kiosk', chain: 'asanagi', y: cf }));
  b.box(wall, c1, cf + 2.7, P9 - 4, c1 + 0.4, tall + 0.5, P9);
  stoneZ(b, wall, c0 - 0.4, c0, XP + 0.4, YH.z0, cf, tall + 0.5);
  stoneZ(b, wall, c0 - 0.4, c0, YH.z0, -BAR - 0.4, cf, top, [LOB]);

  // ── Inside the Central Gate: a lobby, the Yanagisuji landing off it, and a corridor south ──
  const yHeads = [-29.6, -24.4]; // the two stair heads facing each other across the landing
  stoneX(b, wall, COR - 0.4, c0 - 0.4, LOB[0] - 0.4, LOB[0], cf, top);
  stoneX(b, wall, TX, c0 - 0.4, LOB[1], LOB[1] + 0.4, cf, top);
  stoneZ(b, wall, COR - 0.4, COR, LOB[0], -BAR - 0.4, cf, top, [yHeads]);
  stoneZ(b, wall, TX, TX + 0.4, LOB[1] + 0.4, -BAR - 0.4, cf, top);
  stoneBox(b, wall, -WELL - 0.4, cf, yHeads[0], -WELL, top, yHeads[1]);
  // Each Yanagisuji stair in its own well: [head z, foot-end z].
  for (const [head, far] of [[yHeads[0], -38.4], [yHeads[1], -15.6], [-4.4, 4.4]]) {
    const za = Math.min(head, far), zb = Math.max(head, far);
    for (const sx of [-1, 1]) stoneBox(b, wall, Math.min(sx * 1.95, sx * WELL), cf, za, Math.max(sx * 1.95, sx * WELL), top, zb);
    stoneBox(b, wall, -WELL, cf, far < head ? far - 0.4 : far, WELL, top, far < head ? far : far + 0.4);
    headPortal(b, wall, cf, top, 0, head, 'x', o.line.color);
  }
  // Landing walls between the lobby's edge and the wells.
  for (const z of yHeads) stoneBox(b, wall, WELL, cf, z < -27 ? z - 0.4 : z, COR - 0.4, top, z < -27 ? z : z + 0.4);
  b.sign({ k: 'machine', v: 'window' }, 9, cf + 1.5, LOB[0] + 0.03, [0, 1], 5.2, 2.2);
  b.sign({ k: 'machine', v: 'door' }, 5.2, cf + 1.05, LOB[0] + 0.03, [0, 1], 1.0, 2.1);

  // ── Walls: Willow Court's basement, up to the underside of the level-1 gallery ──
  stoneZ(b, PANEL, IX, IX + 0.4, HN, FRONT - 0.4, cf, GY);
  stoneZ(b, PANEL, -IX - 0.4, -IX, HN, FRONT - 0.4, cf, GY, FOOD);
  for (const [a, e] of FOOD) b.box(PANEL, -IX - 0.4, cf + 2.8, a, -IX, GY, e);
  stoneBox(b, PANEL, -IX - 0.4, cf, HN - 0.4, IX + 0.4, GY, HN);
  b.box(PANEL, -IX, top, FRONT - 0.4, IX, GY - SLAB + 0.05, FRONT);

  // ── Inside the West Gate: a lobby at the head of the Akanesuji escalators, and three corridors ──
  // The Akanesuji corridor runs along the back rooms (north), the Shiokaze–Sumire corridor
  // along the south wall, and a link corridor joins both to the Central Gate's.
  const wh = -WA0 - runA; // head of the west escalator bank
  stoneBox(b, wall, TX, cf, -BAR, TX + 0.4, top, BAR);
  stoneBox(b, wall, GATE_W + 2, cf, -BAR, -TX, top, -7);
  b.sign({ k: 'machine', v: 'window' }, -39, cf + 1.5, -6.97, [0, 1], 5.2, 2.2);
  b.sign({ k: 'machine', v: 'door' }, -33.5, cf + 1.05, -6.97, [0, 1], 1.0, 2.1);
  b.sign({ k: 'label', text: 'お手洗い', sub: 'Toilets', fg: '#fff', bg: '#0d3b66' }, -17, cf + 2.7, -6.97, [0, 1], 3.2, 0.5);
  for (const x of [-18.2, -15.8]) b.sign({ k: 'machine', v: 'door' }, x, cf + 1.05, -6.97, [0, 1], 1.0, 2.1);
  for (const x of [-28, -24, -12.2]) {
    b.deco(GOLD, x - 0.67, cf + 0.58, -7, x + 0.67, cf + 2.42, -6.988);
    b.sign({ k: 'poster', v: Math.round(Math.abs(x)) }, x, cf + 1.5, -6.97, [0, 1], 1.2, 1.7);
  }
  // Solid blocks between the corridors: south of the shaft, and round the third Yanagisuji well.
  stoneBox(b, wall, wh, cf, 2.16, -12.7, top, 6);
  stoneBox(b, wall, -12.7, cf, -2.3, -WELL, top, 6);
  stoneBox(b, wall, -WELL, cf, 4.8, WELL, top, 6);
  stoneBox(b, wall, WELL, cf, -4.4, COR, top, 6);
  headPortal(b, wall, cf, top, wh, 0, 'z', c.line.color);
  // Akanesuji corridor: the line's colour along the shaft wall, fare adjustment machines, an information window.
  b.deco(`flat:${c.line.color}`, wh, cf + 2.5, -2.19, -12.7, cf + 2.64, -2.16);
  b.deco(GOLD, wh, cf + 2.44, -2.185, -12.7, cf + 2.48, -2.16);
  for (let x = wh + 3; x < -15; x += 3.4) {
    b.deco(GOLD, x - 0.67, cf + 0.5, -2.172, x + 0.67, cf + 2.34, -2.16);
    b.sign({ k: 'poster', v: Math.round(-x) + 11 }, x, cf + 1.42, -2.18, [0, -1], 1.2, 1.7);
  }
  b.with({ rot: 2, t: [-6.4, 0, -2.3] }, () => ticketMachines(c, cf, 0, 0, 4));
  b.sign({ k: 'label', text: 'のりこし精算', sub: 'Fare adjustment', fg: '#fff', bg: '#0d3b66' }, -8.5, cf + 3.1, -2.32, [0, -1], 3.0, 0.4);
  b.sign({ k: 'machine', v: 'window' }, COR + 0.03, cf + 1.5, 1, [1, 0], 4.0, 2.2);
  b.sign({ k: 'label', text: 'ご案内', sub: 'Information', fg: '#f3e3a0', bg: '#12382c' }, COR + 0.03, cf + 2.95, 1, [1, 0], 2.4, 0.4);
  // Shiokaze–Sumire corridor: shops inside the gates along its north wall, the lines' colours along the south.
  shopsX(h, wh + 0.6, -2.6, 6, 1);
  const smLines = [h.s, h.m].filter((x): x is Ctx => !!x);
  smLines.forEach((x, i) => {
    for (const [xa, xb] of [[wh, s0 - 0.4], [SPE + 0.4, COR]]) b.deco(`flat:${x.line.color}`, xa, cf + 2.5 + i * 0.16, BAR - 0.03, xb, cf + 2.62 + i * 0.16, BAR);
  });
  for (const x of [-19.5, -15.5, -11.5, -7.5, -3.5, 0.5]) {
    b.deco(GOLD, x - 0.67, cf + 0.5, BAR - 0.012, x + 0.67, cf + 2.34, BAR);
    b.sign({ k: 'poster', v: Math.round(-x) + 40 }, x, cf + 1.42, BAR - 0.02, [0, -1], 1.2, 1.7);
  }
  b.sign({ k: 'mural', ...c.style.mural }, TX - 0.02, cf + 1.75, -6, [-1, 0], 9, 2.6);

  // ── The East Gate: the east bank's shaft and a glazed vestibule, an island in the mall ──
  for (const s of [-1, 1]) {
    const za = Math.min(s * 5, s * 5.2), zb = Math.max(s * 5, s * 5.2);
    b.block(xh, cf, za, GATE_E, top, zb);
    b.deco(wall, xh, cf, za, GATE_E, cf + 0.9, zb);
    b.deco('glass', xh, cf + 0.9, s * 5.08, GATE_E, cf + 3.0, s * 5.12);
    b.deco(wall, xh, cf + 3.0, za, GATE_E, top, zb);
    b.deco(`flat:${c.line.color}`, xh, cf + 3.0, za - 0.01, GATE_E, cf + 3.14, zb + 0.01);
    b.box(wall, xh - 0.3, cf, Math.min(s * 2.16, s * 5.2), xh, top, Math.max(s * 2.16, s * 5.2));
    // The shaft's outer faces carry the line colour and posters.
    const zf = s * 2.17;
    b.deco(`flat:${c.line.color}`, EA0, cf + 2.5, Math.min(zf, s * 2.16), xh - 0.3, cf + 2.66, Math.max(zf, s * 2.16));
    b.deco(GOLD, EA0, cf + 2.44, Math.min(zf, s * 2.16), xh - 0.3, cf + 2.48, Math.max(zf, s * 2.16));
    for (let x = EA0 + 2; x < xh - 2; x += 3.2) b.sign({ k: 'poster', v: Math.round(x) + s }, x, cf + 1.35, s * 2.18, [0, s], 1.2, 1.7);
  }
  b.sign({ k: 'guide', ja: `${c.line.nameJa} 東改札`, en: `${c.line.nameEn} — East gate`, bg: 'navy', badges: [c.line.id], arrow: 'right' }, EA0 - 0.32, cf + 2.6, 0, [-1, 0], 4.0, 0.46);
  b.sign({ k: 'mural', ...c.style.mural }, EA0 - 0.32, cf + 1.3, 0, [-1, 0], 4.0, 1.6);

  // ── Gate lines ──
  b.with({ t: [GATE_Y, 0, -29] }, () => gates(h, 9, -6, 6, false));
  b.with({ ...MIRROR_X, t: [GATE_W, 0, 0] }, () => gates(h, 7, -BAR, BAR));
  b.with({ t: [GATE_E, 0, 0] }, () => gates(h, 5, -5, 5, false));

  // ── Lighting and pillars ──
  const lights = (x0: number, x1: number, z0: number, z1: number, y = top) => {
    for (let x = x0 + 2; x + 2.4 < x1; x += 4.8) for (let z = z0 + 3; z < z1 - 1.5; z += 6) ceilingLight(b, x, x + 2.4, z - 0.3, z + 0.3, y);
  };
  lights(-MALL_X, MALL_X, -BAR, BAR);
  lights(COR, YH.x1, LOB[0], LOB[1]);
  lights(COR - 1.4, TX + 1.4, LOB[1], -BAR);
  ceilingLight(b, -1.2, 1.2, -27.3, -26.7, top);
  lights(w0, c0 - 0.4, FRONT, XP);
  lights(c1 + 0.4, XE, FRONT, XP);
  lights(w0, w1, XP, -BAR);
  lights(c0, c1, BAR, BAR + 6);
  const pillar = (x: number, z: number, y1: number) => prop(b, y1 > top ? 'col54' : 'col36', x, cf, z, 0, [0.45, 0.45], y1 - cf);
  for (let x = 62; x < MALL_X; x += 8) for (const s of [-1, 1]) for (const z of [-6.5, 6.5]) pillar(s * x, z, top);
  for (const x of [16, 22]) for (const z of [-6.5, 6.5]) pillar(x, z, top);

  // ── Central Passage: a colonnade under a luminous coffered ceiling, trimmed in gold ──
  for (let z = XP + 5; z < -BAR - 2; z += 6) {
    if (Math.abs(z - KIOSK_Z) > 3) pillar(c1 - 1.2, z, tall);
    if (Math.abs(z + 29) > 11) pillar(c0 + 1.2, z, tall);
  }
  for (let z = XP + 0.4 + 4.3; z < -BAR - 2; z += 8.6) for (const x of [cx - 2.3, cx + 2.3]) prop(b, 'lantern', x, tall - 0.45, z + 0.175);
  // Coffers: cream beams across and along, a light panel deep in each bay.
  for (let z = XP + 0.4; z < -BAR - 0.4; z += 4.3) b.deco(BEAM, c0, tall - 0.45, z, c1, tall, z + 0.35);
  for (const x of [c0, c0 + 3.2, c1 - 3.5, c1 - 0.3]) b.deco(BEAM, x, tall - 0.45, XP + 0.4, x + 0.3, tall, -BAR - 0.4);
  for (let z = XP + 0.4; z + 4.3 < -BAR; z += 4.3) {
    b.deco('light', c0 + 3.9, tall - 0.05, z + 0.9, c1 - 3.9, tall - 0.02, z + 3.75);
    b.deco(GOLD, c0 + 3.5, tall - 0.47, z + 0.33, c1 - 3.5, tall - 0.45, z + 0.37);
  }
  for (const [xa, xb] of [[c0, c0 + 0.03], [c1 - 0.03, c1]]) {
    b.deco(GOLD, xa, cf + H1, XP + 0.4, xb, cf + H1 + 0.1, -BAR - 0.4);
    b.deco(GOLD, xa, tall - 0.16, XP + 0.4, xb, tall - 0.1, -BAR - 0.4);
  }
  b.sign({ k: 'label', text: '中央通路', sub: 'Central Passage', fg: '#f3e3a0', bg: '#12382c' }, c1 - 0.04, cf + 4.6, -36, [-1, 0], 5, 0.8);
  b.sign({ k: 'label', text: '中央改札', sub: 'Central Gate', fg: '#f3e3a0', bg: '#12382c' }, c0 - 0.04, cf + 4.5, -29, [1, 0], 9, 1.0);
  b.sign({ k: 'clock' }, cx, cf + 4.5, XP + 0.42, [0, 1], 1.5, 1.5, { dynamic: true });
  shopsZ(h, c1, XP + 1, KIOSK_Z - KONBINI.kiosk.w / 2 - 0.4, -1);
  shopsZ(h, c1, KIOSK_Z + KONBINI.kiosk.w / 2 + 0.4, P9 - 4.5, -1);
  b.with({ rot: 3, t: [c0, 0, -47.6] }, () => ticketMachines(c, cf, 0, 0, 6));

  // ── North Passage: shops both sides, the door to Willow Court in the middle ──
  shopsX(h, w1 + 1, c0 - 1, XP, -1);
  shopsX(h, w0 + 1, -IX - 1, FRONT, 1);
  shopsX(h, HALL_DOOR[1] + 1, IX, FRONT, 1);
  for (const [x, s] of [[HALL_DOOR[0], -1], [HALL_DOOR[1], 1]]) b.deco(GOLD, Math.min(x, x + s * 0.12), cf, FRONT - 0.42, Math.max(x, x + s * 0.12), top, FRONT + 0.02);
  b.deco(GOLD, HALL_DOOR[0] - 0.12, top - 0.12, FRONT - 0.42, HALL_DOOR[1] + 0.12, top, FRONT + 0.02);
  // Its east end is held for a passage to a new metro line.
  b.with({ rot: 1 }, () => hoardingX(b, FRONT, XP, cf, -(XE - 3), 1));
  b.sign(reserved('地下鉄新線 連絡通路', 'passage to a new metro line'), XE - 3.14, cf + 1.15, (FRONT + XP) / 2, [-1, 0], 6.4, 1.0);
  b.sign(gateMark, XE - 6.5, cf + 0.012, (FRONT + XP) / 2, null, 6, 1.2, { top: [1, 0] });

  // ── West Passage: coin lockers down one wall, shops down the other ──
  shopsZ(h, w1, XP + 1, -BAR - 1, -1);
  for (let z = XP + 2; z + 5 < -BAR; z += 7) {
    b.box('metal:#b9bdc2', w0, cf, z, w0 + 0.6, cf + 1.9, z + 5);
    for (let k = 1; k < 8; k++) b.deco('flat:#6b7178', w0 + 0.6, cf + 0.05, z + k * 0.625 - 0.01, w0 + 0.61, cf + 1.85, z + k * 0.625 + 0.01);
    for (const y of [0.65, 1.25]) b.deco('flat:#6b7178', w0 + 0.6, cf + y, z, w0 + 0.61, cf + y + 0.02, z + 5);
    b.sign({ k: 'label', text: 'コインロッカー', sub: 'Coin lockers', fg: '#fff', bg: '#0d3b66' }, w0 + 0.02, cf + 2.4, z + 2.5, [1, 0], 3.0, 0.5);
  }

  // ── South of the mall: a second stub held for another metro line ──
  hoardingX(b, c0, c1, cf, BAR + 4.4, -1);
  b.sign(reserved('地下鉄新線 改札・連絡通路', 'gates and passage to a new metro line'), cx, cf + 1.15, BAR + 4.26, [0, -1], 6.4, 1.0);
  b.sign(gateMark, cx, cf + 0.012, BAR + 2, null, 6, 1.2, { top: [0, 1] });
  stoneZ(b, wall, c0 - 0.4, c0, BAR + 0.4, BAR + 5.4, cf, top);
  stoneZ(b, wall, c1, c1 + 0.4, BAR + 0.4, BAR + 5.4, cf, top);
  b.box(wall, c0, cf, BAR + 5, c1, top, BAR + 5.4);

  // ── Dark stone borders along the walls, so each passage reads as a street ──
  for (const [x0, z0, x1, z1] of [
    [c0, XP, c0 + 0.6, YH.z0], [c1 - 0.6, XP, c1, -BAR], [w0, XP, w0 + 0.6, -BAR], [w1 - 0.6, XP, w1, -BAR],
    [w0, FRONT, -8, FRONT + 0.6], [8, FRONT, XE - 3, FRONT + 0.6], [w1, XP - 0.6, c0, XP], [c1, XP - 0.6, XE - 3, XP],
    [-MALL_X, -BAR, GATE_W, -BAR + 0.6], [-MALL_X, BAR - 0.6, GATE_W, BAR], [c1, -BAR, MALL_X, -BAR + 0.6], [TX + 0.4, BAR - 0.6, MALL_X, BAR],
  ]) b.deco(BORDER, x0, cf, z0, x1, cf + 0.006, z1);

  // ── Wayfinding ──
  const plat = (x: Ctx) => `${x.line.nameJa} のりば ${st.platforms[x.line.id].join('・')}`;
  const deep = [c, h.s, h.m].filter((x): x is Ctx => !!x).map((x) => x.line);
  const toA: SignContent = { k: 'guide', ja: plat(c), en: `${c.line.nameEn} platforms`, bg: 'navy', badges: [c.line.id], arrow: 'up' };
  const toDeep: SignContent = { k: 'guide', ja: `${deep.map((l) => l.nameJa).join('・')} のりば`, en: `${deep.map((l) => l.nameEn).join(' / ')} platforms`, bg: 'navy', badges: deep.map((l) => l.id), arrow: 'up' };
  const toYs: SignContent = { k: 'guide', ja: plat(o), en: `${o.line.nameEn} platforms`, bg: 'navy', badges: [o.line.id], arrow: 'up' };
  const toStation: SignContent = { k: 'guide', ja: '澪屋・大コンコース・川湊駅', en: 'Mioya / Grand Concourse / Kawaminato Sta.', bg: 'yellow', arrow: 'up' };
  const toMall: SignContent = { k: 'guide', ja: 'みおちか・出口 1–8・11–14', en: 'Miochika / Exits 1–8, 11–14', bg: 'yellow', arrow: 'up' };
  const toMetro: SignContent = { k: 'guide', ja: `地下鉄 ${st.nameJa}駅 のりば`, en: `Metro: ${st.nameRomaji} Station`, bg: 'navy', badges: lines, arrow: 'up' };
  // Central Passage, both ends.
  hangZ(b, toStation, toMetro, cx, cf + 3.0, XP + 3, 7, 0.56, tall);
  hangZ(b, toStation, toMall, cx, cf + 3.0, -BAR - 3, 7, 0.56, tall);
  // North Passage: either side of the court door, and where the West Passage leaves it.
  b.hang({ ...toStation, arrow: 'right' }, HALL_DOOR[1] + 3, cf + 2.75, (FRONT + XP) / 2, 5.6, 0.5, { ceil: top, back: { ...toMetro, arrow: 'up' } });
  b.hang({ k: 'guide', ja: '西連絡通路・出口 5–8', en: 'West Passage / Exits 5–8', bg: 'yellow', arrow: 'up' }, -11, cf + 2.75, (FRONT + XP) / 2, 5.6, 0.5, { ceil: top, back: { ...toStation, arrow: 'left' } });
  hangZ(b, { k: 'guide', ja: '澪屋・中央通路', en: 'Mioya / Central Passage', bg: 'yellow', arrow: 'up' }, toMall, (w0 + w1) / 2, cf + 2.75, XP + 2, 5.6, 0.5, top);
  hangZ(b, { k: 'guide', ja: '西連絡通路・澪屋', en: 'West Passage / Mioya', bg: 'yellow', arrow: 'up' }, toMall, (w0 + w1) / 2, cf + 2.75, -BAR - 2.5, 5.6, 0.5, top);
  // Inside the gates: one sign at each corridor mouth.
  const toSM: SignContent = smLines.length
    ? { k: 'guide', ja: `${smLines.map((x) => x.line.nameJa).join('・')} のりば`, en: `${smLines.map((x) => x.line.nameEn).join(' / ')} platforms`, bg: 'navy', badges: smLines.map((x) => x.line.id), arrow: 'up' }
    : toA;
  const outC: SignContent = { k: 'guide', ja: '中央改札・澪屋', en: 'Central gate / Mioya', bg: 'yellow', arrow: 'up' };
  const outW: SignContent = { k: 'guide', ja: '西改札・みおちか', en: 'West gate / Miochika', bg: 'yellow', arrow: 'up' };
  // Lobby → landing (Yanagisuji), lobby → corridor (the deep lines).
  b.hang(toYs, COR + 0.6, cf + 2.75, -27, 4.4, 0.46, { ceil: top, back: outC });
  hangZ(b, { ...toYs, ja: `${toYs.ja}・中央改札` }, toDeep, (COR + TX) / 2, cf + 2.75, LOB[1] + 0.9, 5.2, 0.5, top);
  // Link corridor: Akanesuji and the third Yanagisuji stair to the west, Shiokaze–Sumire further on.
  hangZ(b, outC, { ...toA, ja: `${toA.ja}・${o.line.nameJa}`, badges: [c.line.id, o.line.id], arrow: 'right' }, (COR + TX) / 2, cf + 2.75, -BAR + 1.2, 5.2, 0.5, top);
  hangZ(b, outC, { ...toSM, arrow: 'right' }, (COR + TX) / 2, cf + 2.75, 4.6, 5.2, 0.5, top);
  // West Gate lobby: the escalators ahead, a corridor either side.
  b.hang(outW, wh - 3, cf + 2.75, 0, 4.2, 0.5, { ceil: top, back: toA });
  b.hang(outW, wh + 1.2, cf + 2.75, -4.65, 4.0, 0.46, { ceil: top, back: { ...toYs, ja: `${toYs.ja}・中央改札` } });
  b.hang(outW, wh + 1.2, cf + 2.75, 9, 5.2, 0.46, { ceil: top, back: toSM });

  // ── Ticket machines outside the other gates ──
  b.with({ rot: 3, t: [TX + 0.4, 0, 3.2] }, () => ticketMachines(c, cf, 0, 0, 6));

  // ── Miochika: kiosks down the middle make two aisles of it ──
  shopsX(h, c1 + 1.5, xh - 1, -BAR, 1);
  shopsX(h, c1 + 1.5, Math.min(xh - 1, TOWN_E[0] - 0.5), BAR, -1);
  const wing = (label: string, nums: string, what: { ja: string; en: string }) => {
    ticketMachines(c, cf, 64, -BAR, 5);
    // Over each aisle: trains inward, exits outward.
    const inward: SignContent = { k: 'guide', ja: 'のりば・澪屋', en: 'Trains / Mioya', bg: 'navy', badges: lines, arrow: 'up' };
    const outward: SignContent = { k: 'guide', ja: `出口 ${nums}・${what.ja}`, en: `Exits ${nums} / ${what.en}`, bg: 'yellow', arrow: 'up' };
    for (const x of [82, 114, 130]) for (const z of [-7, 7]) b.hang(inward, x, cf + 2.75, z, 4.6, 0.46, { ceil: top, back: outward });
    for (const x of [86, 102, 118, 134]) for (const z of [-6.5, 6.5]) {
      prop(b, 'bins', x + 1.05, cf, z, 0, [0.5, 0.22], 0.9);
    }
    b.deco('tactileBar', 60, cf, -4.15, MALL_X - 4, cf + 0.008, -3.85);
    shopsX(h, 76.5, 115.5, -BAR, 1);
    shopsX(h, 120.5, MALL_X - 0.5, -BAR, 1);
    shopsX(h, TOWN_E[1] + 0.5, 71.5, BAR, -1);
    shopsX(h, 76.5, 115.5, BAR, -1);
    shopsX(h, 120.5, MALL_X - 0.5, BAR, -1);
    b.hang({ k: 'label', text: 'みおちか 北大通り', sub: `Miochika Ōdōri — ${label}`, fg: '#f3e3a0', bg: '#12382c' }, 62, cf + 2.85, 0, 9, 0.95, { ceil: top });
    b.sign({ k: 'mural', ...c.style.mural }, MALL_X - 0.02, cf + 1.75, 0, [-1, 0], 18, 2.6);
    for (const x of [72, 90, 106, 124, 140]) {
      b.box(TIMBER, x, cf, -1.5, x + 7, top, 1.5);
      b.deco(BORDER, x - 0.5, cf, -2, x + 7.5, cf + 0.006, 2);
      b.deco(GOLD, x - 0.01, cf + 3.3, -1.51, x + 7.01, cf + 3.36, 1.51);
      shopFront(h, x, x + 7, 1.5, 1, SHOPS[shopK++ % SHOPS.length], h.cf, true);
      shopFront(h, x, x + 7, -1.5, -1, SHOPS[shopK++ % SHOPS.length], h.cf, true);
    }
    prop(b, 'totem', 84.5, cf, 0, 0, [0.75, 0.2], 2.2);
    for (const s of [-1, 1] as const) b.sign({ k: 'areamap', station: st.id }, 84.5, cf + 1.31, s * 0.07, [0, s], 1.2, 1.62);
    prop(b, 'bench', 118.5, cf, -0.3, 0, [0.95, 0.5], 0.5);
    prop(b, 'bench', 118.5, cf, 0.3, 2);
    prop(b, 'planter', 135.5, cf, 0, 0, [0.6, 0.6], 1.2);
    for (const x of [72, 106, 140]) prop(b, 'planter', x - 1.1, cf, 0, 0, [0.6, 0.6], 1.2);
    vending(b, 100, cf, 0, [0, 1], 'vending');
    vending(b, 101.1, cf, 0, [0, -1], 'vending2');
  };
  b.with({}, () => wing('East', '1–4', { ja: '汐見筋・千鳥筋', en: 'Shiomi-suji / Chidori-suji' }));
  b.with(MIRROR_X, () => wing('West', '5–8', { ja: '浜手筋', en: 'Hamate-suji' }));

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
  // Exit 9, the Central entrance: up from the Central Passage to the station plaza.
  b.with({ rot: 3, t: [c1, 0, P9 - 4] }, () => exit(c, cf, '9'));
  b.sign({ k: 'label', text: '中央口', sub: 'Central entrance — Mioya east portal', fg: '#f3e3a0', bg: '#12382c' }, c1 - 0.04, cf + 3.25, P9 - 2, [-1, 0], 3.6, 0.5);

  // ── South Passage off the transfer hall: to the beside lines, or closed by a hoarding ──
  const sl = h.s?.line;
  const zs = besideZ(h);
  const beside = [h.s, h.m].filter((x): x is Ctx => !!x).map((x) => x.line);
  const end = sl ? SG.end : BAR + 6;
  const sx = (s0 + s1) / 2;
  b.box(floor, s0, cf - SLAB, BAR, s1, cf, end);
  b.box('ceil', s0 - 0.4, top, BAR, s1 + 0.4, top + 0.5, end + 0.4);
  stoneZ(b, wall, s1, s1 + 0.4, BAR + 0.4, end + 0.4, cf, top, sl ? [[SG.z, SG.z + 4]] : []);
  stoneZ(b, wall, s0 - 0.4, s0, BAR + 0.4, end + 0.4, cf, top, sl ? zs.map((z) => [z - 1.86, z + 1.86]) : []);
  stoneBox(b, wall, s0, cf, end, s1, top, end + 0.4);
  for (let z = BAR + 2; z + 2 < end; z += 5) ceilingLight(b, s0 + 1.9, s0 + 3.1, z, z + 2, top);
  if (sl) {
    const to = (l: (typeof beside)[number]): SignContent =>
      ({ k: 'guide', ja: `${l.nameJa} のりば ${st.platforms[l.id].join('・')}`, en: `${l.nameEn} platforms`, bg: 'navy', badges: [l.id], arrow: 'up' });
    beside.forEach((l, i) => b.sign(to(l), s0 + 0.02, cf + 2.75, zs[i], [1, 0], 3.6, 0.44));
    b.hang(beside.length > 1
      ? { k: 'guide', ja: beside.map((l) => l.nameJa).join('・'), en: beside.map((l) => l.nameEn).join(' / '), bg: 'navy', badges: beside.map((l) => l.id), arrow: 'up' }
      : to(sl), (s0 + SPE) / 2, cf + 2.75, BAR - 1.6, 4.4, 0.5, { ceil: top });
    b.zone('passage', s0, cf - 0.2, BAR, s1, top, SG.gate, `${beside.map((l) => l.nameJa).join('・')} 連絡通路`, `${beside.map((l) => l.nameEn).join(' / ')} passage`);
    // The walkway keeps to the shaft side; the east 3 m is a closed strip of lockers, adverts and a shop.
    const stripEnd = SG.gate - 1.5;
    stoneBox(b, wall, SPE, cf, BAR + 0.4, s1, top, stripEnd);
    b.sign({ k: 'machine', v: 'locker' }, SPE - 0.03, cf + 1.0, 19.5, [-1, 0], 4.2, 1.9);
    b.sign({ k: 'label', text: 'コインロッカー', sub: 'Coin lockers', fg: '#fff', bg: '#0d3b66' }, SPE - 0.03, cf + 2.4, 19.5, [-1, 0], 3.0, 0.5);
    for (const z of [23.6, 25.6]) {
      b.deco(GOLD, SPE - 0.012, cf + 0.5, z - 0.67, SPE, cf + 2.34, z + 0.67);
      b.sign({ k: 'poster', v: Math.round(z) + 3 }, SPE - 0.02, cf + 1.42, z, [-1, 0], 1.2, 1.7);
    }
    shopsZ(h, SPE, stripEnd - 8, stripEnd - 0.4, -1);
    // The South Gate: the beside lines' own way in, with exit 10 up to Yanagi-suji.
    b.with({ rot: 1, t: [sx, 0, SG.gate] }, () => gates(h, 5, -4, 4, false));
    b.sign({ k: 'label', text: '南改札', sub: 'South Gate', fg: '#f3e3a0', bg: '#12382c' }, s0 + 0.03, cf + 2.9, SG.gate + 3, [1, 0], 3.6, 0.5);
    b.with({ rot: 2, t: [s1 - 1.5, 0, end] }, () => ticketMachines(c, cf, 0, 0, 4));
    b.sign({ k: 'machine', v: 'window' }, s0 + 0.03, cf + 1.5, SG.gate + 7, [1, 0], 4.0, 2.2);
    b.box(floor, s1, cf - SLAB, SG.z, SG.door, cf, SG.z + 4);
    b.box('ceil', s1, top, SG.z - 0.4, SG.door, top + 0.5, SG.z + 4.4);
    stoneX(b, wall, s1 + 0.4, SG.door, SG.z - 0.4, SG.z, cf, top);
    stoneX(b, wall, s1 + 0.4, SG.door, SG.z + 4, SG.z + 4.4, cf, top);
    ceilingLight(b, s1 + 2, SG.door - 2, SG.z + 1.7, SG.z + 2.3, top);
    b.with({ rot: 3, t: [SG.door, 0, SG.z] }, () => exit(c, cf, '10'));
    b.zone('concourse', s0, cf - 0.2, SG.gate + 1, s1, top, end, '南改札口', 'South Gate lobby');
  } else {
    hoardingX(b, s0, s1, cf, BAR + 5.4, -1);
    b.sign(reserved('地下鉄新線 連絡通路', 'passage to a new metro line'), sx, cf + 1.15, BAR + 5.26, [0, -1], 6.4, 1.0);
    b.zone('passage', s0, cf - 0.2, BAR, s1, top, BAR + 5.4, '新線連絡通路（予定地）', 'Future metro line passage (reserved)');
  }

  // ── Zones and spawn ──
  b.zone('concourse', COR, cf - 0.3, LOB[0], YH.x1, top, LOB[1], '中央改札内', 'Central Gate lobby (inside the gates)');
  b.zone('concourse', -WELL, cf - 0.3, -29.6, COR, top, -24.4, `${o.line.nameJa} のりば階段前`, `${o.line.nameEn} stair landing`);
  b.zone('passage', COR, cf - 0.3, LOB[1], TX, top, BAR, 'のりかえ通路', 'Transfer corridor');
  b.zone('concourse', -TX, cf - 0.3, -BAR, COR, top, -4.4, `${o.line.nameJa} のりば階段前（南）`, `${o.line.nameEn} south stair landing`);
  b.zone('concourse', GATE_W, cf - 0.3, -7, wh, top, BAR, '西改札内', 'West Gate lobby (inside the gates)');
  b.zone('passage', wh, cf - 0.3, -7, COR, top, -2.3, `${c.line.nameJa} のりかえ通路`, `${c.line.nameEn} corridor`);
  b.zone('passage', wh, cf - 0.3, 6, COR, top, BAR, smLines.length ? `${smLines.map((x) => x.line.nameJa).join('・')} のりかえ通路` : '南のりかえ通路', smLines.length ? `${smLines.map((x) => x.line.nameEn).join(' / ')} corridor` : 'South corridor');
  b.zone('concourse', xh, cf - 0.3, -5, GATE_E, top, 5, `${c.line.nameJa} 東改札`, `${c.line.nameEn} east gate`);
  b.zone('passage', c0, cf - 0.3, XP, c1, tall, -BAR, '中央通路', 'Central Passage');
  b.zone('passage', w0, cf - 0.3, FRONT, XE - 3, top, XP, '北連絡通路', 'North Passage');
  b.zone('passage', w0, cf - 0.3, XP, w1, top, -BAR, '西連絡通路', 'West Passage');
  b.zone('passage', TX + 0.4, cf - 0.3, -BAR, MALL_X, top, BAR, 'みおちか 北大通り 東', 'Miochika Ōdōri — East');
  b.zone('passage', -MALL_X, cf - 0.3, -BAR, GATE_W, top, BAR, 'みおちか 北大通り 西', 'Miochika Ōdōri — West');
  b.setSpawn(cx, cf, XP + 6, [0, 1]);
}

// ───────────────────────── Miochika's south town ─────────────────────────

/** Miochika's streets south of the avenue: the west and east streets (x ranges), the cross street (z range), the square. */
const TOWN_W: [number, number] = [-58, -50], TOWN_E: [number, number] = [50, 58], TOWN_S: [number, number] = [62, 70];
const SQUARE: Rect = [-12, 70, 12, 82];
/** Where exits 11–14 leave the streets: the z of each doorway's north edge. exits.ts mirrors them. */
const EXIT_IN = 33, EXIT_OUT = 55;

/**
 * Miochika beyond the avenue: two streets running south from the old mall under the Gate Towers,
 * a cross street joining them, and Mio no Hiroba, the square with the water clock, at its middle.
 * The loop goes round the Yanagisuji hall, whose vault rises into this level south of the avenue.
 * Exits 11 and 12 climb north into the towers' bases; 13 and 14 to the local streets beside them.
 */
function town(h: H) {
  const { b, c, cf, wall, floor } = h;
  const st = c.station, top = cf + H1, tall = cf + SP;
  const [s0, s1] = TOWN_S, [qx0, qz0, qx1, qz1] = SQUARE;
  const xw = TOWN_W[0], xe = TOWN_E[1];
  // ── Floors and ceilings ──
  for (const [x0, x1] of [TOWN_W, TOWN_E]) {
    b.box(floor, x0, cf - SLAB, BAR, x1, cf, s0);
    b.box('ceil', x0 - 0.4, top, BAR + 0.4, x1 + 0.4, top + 0.5, s0);
  }
  b.box(floor, xw, cf - SLAB, s0, xe, cf, s1);
  b.box(floor, qx0, cf - SLAB, s1, qx1, cf, qz1);
  for (const [x0, x1] of [[xw - 0.4, qx0], [qx1, xe + 0.4]]) b.box('ceil', x0, top, s0 - 0.4, x1, top + 0.5, s1 + 0.4);
  b.box('ceil', qx0 - 0.4, tall, s0 - 0.4, qx1 + 0.4, tall + 0.5, qz1 + 0.4);
  for (const x of [qx0 - 0.4, qx1]) b.box(wall, x, top, s0, x + 0.4, tall + 0.5, s1);
  b.box(wall, qx0, top, s0 - 0.4, qx1, tall + 0.5, s0);
  // ── Walls: the two streets (doorways to the exits), the cross street, the square ──
  const door = (z: number): [number, number] => [z, z + 4];
  stoneZ(b, wall, xw - 0.4, xw, BAR + 0.4, s1 + 0.4, cf, top, [door(EXIT_OUT)]);
  stoneZ(b, wall, TOWN_W[1], TOWN_W[1] + 0.4, BAR + 0.4, s0 - 0.4, cf, top, [door(EXIT_IN)]);
  stoneZ(b, wall, TOWN_E[0] - 0.4, TOWN_E[0], BAR + 0.4, s0 - 0.4, cf, top, [door(EXIT_IN)]);
  stoneZ(b, wall, xe, xe + 0.4, BAR + 0.4, s1 + 0.4, cf, top, [door(EXIT_OUT)]);
  for (const [x, z] of [[xw - 0.4, EXIT_OUT], [TOWN_W[1], EXIT_IN], [TOWN_E[0] - 0.4, EXIT_IN], [xe, EXIT_OUT]]) b.box(wall, x, cf + 2.7, z, x + 0.4, top, z + 4);
  stoneX(b, wall, TOWN_W[1], TOWN_E[0], s0 - 0.4, s0, cf, top);
  stoneX(b, wall, xw - 0.4, xe + 0.4, s1, s1 + 0.4, cf, top, [[qx0, qx1]]);
  stoneZ(b, wall, qx0 - 0.4, qx0, s1 + 0.4, qz1 + 0.4, cf, tall + 0.5);
  stoneZ(b, wall, qx1, qx1 + 0.4, s1 + 0.4, qz1 + 0.4, cf, tall + 0.5);
  stoneX(b, wall, qx0, qx1, qz1, qz1 + 0.4, cf, tall + 0.5);
  // ── Exits ──
  b.with({ rot: 3, t: [TOWN_W[1], 0, EXIT_IN] }, () => exit(c, cf, '11'));
  b.with({ rot: 3, mz: true, t: [TOWN_E[0], 0, EXIT_IN] }, () => exit(c, cf, '12'));
  b.with({ rot: 3, mz: true, t: [xw, 0, EXIT_OUT] }, () => exit(c, cf, '13'));
  b.with({ rot: 3, t: [xe, 0, EXIT_OUT] }, () => exit(c, cf, '14'));
  // ── Shops down every wall ──
  shopsZ(h, xw, BAR + 1.5, EXIT_OUT - 0.5, 1);
  shopsZ(h, TOWN_W[1], BAR + 1.5, EXIT_IN - 0.5, -1);
  shopsZ(h, TOWN_W[1], EXIT_IN + 4.5, s0 - 1, -1);
  shopsZ(h, TOWN_E[0], BAR + 1.5, EXIT_IN - 0.5, 1);
  shopsZ(h, TOWN_E[0], EXIT_IN + 4.5, s0 - 1, 1);
  shopsZ(h, xe, BAR + 1.5, EXIT_OUT - 0.5, -1);
  shopsX(h, TOWN_W[1] + 1, -1, s0, 1);
  shopsX(h, 1, TOWN_E[0] - 1, s0, 1);
  shopsX(h, xw + 1, qx0 - 1, s1, -1);
  shopsX(h, qx1 + 1, xe - 1, s1, -1);
  shopsZ(h, qx0, s1 + 1.5, qz1 - 0.5, 1);
  shopsZ(h, qx1, s1 + 1.5, qz1 - 0.5, -1);
  b.sign({ k: 'mural', ...c.style.mural }, 0, cf + 2.4, qz1 - 0.02, [0, -1], 18, 3.4);
  // ── Light ──
  for (const [x0, x1] of [TOWN_W, TOWN_E]) for (let z = BAR + 3; z < s0 - 1; z += 6) ceilingLight(b, (x0 + x1) / 2 - 1.2, (x0 + x1) / 2 + 1.2, z - 0.3, z + 0.3, top);
  for (let x = xw + 3; x < xe - 2; x += 6) if (x < qx0 - 1 || x > qx1 + 1) ceilingLight(b, x - 1.2, x + 1.2, (s0 + s1) / 2 - 0.3, (s0 + s1) / 2 + 0.3, top);
  for (const x of [-7, 0, 7]) for (const z of [s0 + 2.5, 73, qz1 - 3]) if (x || z < 68 || z > 75) ceilingLight(b, x - 1.2, x + 1.2, z - 0.3, z + 0.3, tall);
  // ── A gateway where each street leaves the old mall; the water clock, benches round it ──
  const M = MIOCHIKA;
  const names: [number, string, string][] = [[(TOWN_W[0] + TOWN_W[1]) / 2, 'みおちか 西の町', 'Miochika — West Town'], [(TOWN_E[0] + TOWN_E[1]) / 2, 'みおちか 東の町', 'Miochika — East Town']];
  for (const [x, ja, en] of names) {
    b.model('miochika', 'gate', x, cf, BAR + 0.2, 0);
    const hw = M.gate.w / 2;
    for (const s of [-1, 1]) b.block(Math.min(s * hw, s * (hw - 0.7)) + x, cf, BAR - 0.15, Math.max(s * hw, s * (hw - 0.7)) + x, top, BAR + 0.55);
    for (const k of ['name_f', 'name_b']) {
      const p = M.gate.pts[k];
      b.sign({ k: 'label', text: ja, sub: en, fg: '#f3e3a0', bg: '#3f6a5a' }, x + p[0], cf + p[1], BAR + 0.2 + p[2], [p[5], p[6]], p[3], p[4]);
    }
  }
  const cz = (qz0 + qz1) / 2 - 1;
  b.model('miochika', 'clock', 0, cf, cz, 0);
  b.block(-M.clock.w / 2, cf, cz - M.clock.d / 2, M.clock.w / 2, cf + 0.6, cz + M.clock.d / 2);
  b.block(-1.7, cf, cz - 1.7, 1.7, cf + M.clock.h, cz + 1.7);
  for (const f of 'fblr') {
    const p = M.clock.pts[`clock_${f}`];
    b.sign({ k: 'clock' }, p[0], cf + p[1], cz + p[2], [p[5], p[6]], p[3], p[4], { dynamic: true });
  }
  for (const [x, z] of [[-8, s1 + 3], [8, s1 + 3], [-8, qz1 - 3], [8, qz1 - 3]]) {
    b.model('miochika', 'bench', x, cf, z, 0);
    b.block(x - 1.25, cf, z - 1.25, x + 1.25, cf + 0.5, z + 1.25);
  }
  b.sign({ k: 'label', text: '澪のひろば', sub: 'Mio no Hiroba — the water clock', fg: '#f3e3a0', bg: '#12382c' }, 0, cf + 4.2, s0 + 0.02, [0, 1], 7, 0.9);
  // ── Wayfinding ──
  const metro: SignContent = { k: 'guide', ja: `のりば・${st.nameJa}駅`, en: `Trains / ${st.nameRomaji} Station`, bg: 'navy', badges: h.lines, arrow: 'up' };
  const out = (ja: string, en: string): SignContent => ({ k: 'guide', ja, en, bg: 'yellow', arrow: 'up' });
  hangZ(b, out('出口 11・13・澪のひろば', 'Exits 11, 13 / Mio no Hiroba'), metro, (TOWN_W[0] + TOWN_W[1]) / 2, cf + 2.75, BAR + 4, 5.2, 0.5, top);
  hangZ(b, out('出口 12・14・澪のひろば', 'Exits 12, 14 / Mio no Hiroba'), metro, (TOWN_E[0] + TOWN_E[1]) / 2, cf + 2.75, BAR + 4, 5.2, 0.5, top);
  hangZ(b, out('澪のひろば・東の町', 'Mio no Hiroba / East Town'), metro, (TOWN_W[0] + TOWN_W[1]) / 2, cf + 2.75, s0 - 4, 5.2, 0.5, top);
  hangZ(b, out('澪のひろば・西の町', 'Mio no Hiroba / West Town'), metro, (TOWN_E[0] + TOWN_E[1]) / 2, cf + 2.75, s0 - 4, 5.2, 0.5, top);
  b.hang({ ...metro, arrow: 'left' }, -20, cf + 2.75, (s0 + s1) / 2, 5.2, 0.5, { ceil: top, back: out('澪のひろば・東の町・出口 12・14', 'Mio no Hiroba / East Town / Exits 12, 14') });
  b.hang(out('澪のひろば・西の町・出口 11・13', 'Mio no Hiroba / West Town / Exits 11, 13'), 20, cf + 2.75, (s0 + s1) / 2, 5.2, 0.5, { ceil: top, back: { ...metro, arrow: 'right' } });
  // ── Zones ──
  b.zone('passage', TOWN_W[0], cf - 0.3, BAR, TOWN_W[1], top, s0, 'みおちか 西の町', 'Miochika — West Town');
  b.zone('passage', TOWN_E[0], cf - 0.3, BAR, TOWN_E[1], top, s0, 'みおちか 東の町', 'Miochika — East Town');
  b.zone('passage', xw, cf - 0.3, s0, xe, top, s1, 'みおちか 南の町', 'Miochika — South Town');
  b.zone('concourse', qx0, cf - 0.3, s1, qx1, tall, qz1, '澪のひろば', 'Mio no Hiroba');
}

// ───────────────────────── The food floor under the terminal ─────────────────────────

/**
 * Exit 15 (EXIT15 in kawaminato.ts): from a doorway in the food floor's north wall a stair climbs north, roofed
 * under Kawaminato Station's central passage, and comes out in the south-east corner of the station building's
 * great hall. Its lift stands in the hall's south-west corner, at the end of a corridor of its own from the wall.
 */
function exit15(h: H) {
  const { b, c, cf } = h;
  const E = EXIT15, [xa, xb] = E.x, W = 0.3, rise = GY - cf, run = exit15Run(cf), head = E.foot - run, top = -0.6;
  const wall = c.style.concWall, floor = c.style.floor, xm = (xa + xb) / 2, ar = stationById('kawaminato');
  const sy = (z: number) => cf + (rise * (E.foot - z)) / run;
  const ZW = HN - 0.4; // the north wall's far face
  // The doorway and a short lobby to the stair's foot.
  b.carve(xa, cf, ZW - 0.05, xb, cf + 2.8, HN + 0.02); // (through the wall's dado and its brass line too)
  b.box(floor, xa, cf - 0.5, E.foot, xb, cf, HN);
  b.with({ rot: 3 }, () => stairs(b, { x0: -E.foot, x1: -head, z0: xa, z1: xb, yLow: cf, yHigh: GY, rails: [false, false], mat: 'flat:#aaa79f' }));
  b.hole(xa, head, xb, E.open);
  // Its side walls: to the street's underside where it is roofed, a parapet round the open well.
  for (const x of [xa - W, xb]) {
    b.box(wall, x, cf - 0.5, E.open, x + W, top, ZW);
    b.box(wall, x, cf - 0.5, head, x + W, GY + 1.0, E.open);
  }
  // The roof under the passage, stepping up with the stair; the street slab's edge where the open part begins.
  let za = ZW;
  for (const zb of [E.foot - 2, E.foot - 4, E.open + W]) { // (the last one stops at the lintel)
    const yc = Math.min(top - 0.3, sy(zb) + 2.5);
    b.box('ceil', xa, yc, zb, xb, top, za);
    b.deco('light', xm - 0.5, yc - 0.04, (za + zb) / 2 - 0.3, xm + 0.5, yc, (za + zb) / 2 + 0.3);
    za = zb;
  }
  b.box(wall, xa - W, Math.min(top - 0.3, sy(E.open) + 2.5), E.open, xb + W, GY + 1.0, E.open + W);
  // In the great hall: a portal at the stair's head with the metro's sign.
  for (const x of [xa - W, xb]) b.box('metal:#5d6a72', x + 0.06, GY, head - 0.09, x + W - 0.06, GY + 2.75, head + 0.09);
  b.box('flat:#17181b', xa - W + 0.06, GY + 2.35, head - 0.07, xb + W - 0.06, GY + 3.05, head + 0.07);
  for (const n of [-1, 1] as const) b.sign({ k: 'entrance', station: c.station.id, exit: '15' }, xm, GY + 2.7, head + n * 0.08, [0, n], xb - xa, 0.62);
  // On the food floor: the exit's number over the doorway.
  b.sign({ k: 'guide', ja: '出口', en: 'Exit', bg: 'yellow', num: '15', arrow: 'up' }, xm, cf + 3.1, HN + 0.02, [0, 1], 2.6, 0.5);
  b.sign({ k: 'label', text: `${ar.nameJa}駅（AR線）・駅前広場`, sub: `${ar.nameRomaji} Sta. (AR) / Station Square`, fg: '#1b1f24', bg: '#ffd100' }, xm, cf + 3.7, HN + 0.02, [0, 1], 3.2, 0.5);
  b.zone('passage', xa, cf - 0.2, E.foot - 2, xb, cf + 3.4, HN, '15番出口 通路', 'Exit 15 passage', false);
  b.zone('passage', xa, cf - 0.2, head, xb, GY + 2.4, E.foot - 2, '15番出口', 'Exit 15', false);

  // The lift: a corridor from a second doorway in the wall to its door, which looks east on both floors.
  const [cx0, cx1] = E.lift.hall, [lx0] = E.lift.x, zn = E.lift.z - 1.15, CH = 2.6;
  b.carve(cx0, cf, ZW - 0.05, cx1, cf + CH, HN + 0.02);
  b.box(floor, cx0, cf - 0.5, zn, cx1, cf, HN);
  b.box(wall, cx1, cf - 0.5, zn - W, cx1 + W, cf + CH + 0.5, ZW);
  b.box(wall, cx0 - W, cf - 0.5, E.lift.z + 1.15, cx0, cf + CH + 0.5, ZW);
  b.box(wall, lx0, cf - 0.5, zn - W, cx1 + W, cf + CH + 0.5, zn);
  b.box('ceil', cx0 - W, cf + CH, zn, cx1 + W, cf + CH + 0.5, ZW);
  for (let z = HN - 2; z > zn + 1; z -= 3.5) b.deco('light', (cx0 + cx1) / 2 - 0.3, cf + CH - 0.04, z - 0.5, (cx0 + cx1) / 2 + 0.3, cf + CH, z + 0.5);
  b.with({ rot: 1, t: [cx0, 0, E.lift.z] }, () => lift(b, { levels: [
    { y: cf, ja: `地下1階 地下鉄 ${c.station.nameJa}駅・澪屋 食品館`, en: `B1 Metro ${c.station.nameRomaji} Sta. / Mioya Food Floor` },
    { y: GY, ja: `1階 ${ar.nameJa}駅 大広間`, en: `1F ${ar.nameRomaji} Sta. — Great Hall` },
  ] }));
  b.sign({ k: 'label', text: `エレベーター　${ar.nameJa}駅（AR線）`, sub: `Lift to ${ar.nameRomaji} Sta. (AR)`, fg: '#ffffff', bg: '#1f5fae' }, (cx0 + cx1) / 2, cf + 3.0, HN + 0.02, [0, 1], 2.6, 0.5);
  b.zone('passage', cx0, cf - 0.2, zn, cx1, cf + CH, HN, '15番出口 エレベーター通路', 'Exit 15 — passage to the lift', false);
}


/**
 * Willow Court at B1, under the Mioya Terminal Building. It used to be the floor of an open well in
 * the old station building; since the district was rebuilt (hub-street.ts) it is closed over by the
 * street and the terminal above. Two ways climb out of it: the stair into the terminal's concourse, and Exit 15
 * (with its lift), through the north wall into Kawaminato Station's great hall (exit15()).
 */
function court(h: H) {
  const { b, c, cf, lines } = h;
  const st = c.station;
  const top = -0.6;
  // The stair up into the Mioya building's grand concourse (hub-street.ts builds the hall round its head): against
  // the front wall, its foot beside the doorway from the North Passage, climbing east along the wall.
  const SZ = HALL_STAIR_Z, sx0 = HALL_STAIR.foot, sx1 = r2(sx0 + (GY - cf) * HALL_STAIR.pitch);
  stairs(b, { x0: sx0, x1: sx1, z0: SZ[0], z1: SZ[1], yLow: cf, yHigh: GY, rails: [true, false], mat: 'floor:#cfc6b4' });
  b.hole(sx0, SZ[0], sx1, SZ[1]);
  b.slab('ceil', -IX, HN, IX, FRONT, top - 0.04, top, [[sx0, SZ[0], sx1, SZ[1]]], false);
  exit15(h);
  const up: SignContent = { k: 'guide', ja: '澪屋 大コンコース・川湊駅（AR線）', en: 'Mioya Grand Concourse / Kawaminato Sta. (AR)', bg: 'white', arrow: 'up' };
  hangZ(b, { ...up, arrow: 'right' }, { ...up, arrow: 'left' }, sx0 - 2.4, cf + 2.9, SZ[0] + 0.3, 4.4, 0.5, top - 0.04);
  shopsZ(h, IX, HN + 1, FRONT - 1, -1);
  shopsZ(h, -IX, HN + 1, FOOD[0][0] - 0.5, 1);
  shopsZ(h, -IX, FOOD[0][1] + 0.5, FOOD[1][0] - 0.5, 1);
  shopsZ(h, -IX, FOOD[1][1] + 0.5, FRONT - 1, 1);
  foodHall(h);
  b.sign({ k: 'mural', ...c.style.mural }, 0.75, cf + 2.6, HN + 0.02, [0, 1], 17.6, 4.0);
  for (let z = -108; z < FRONT - 3; z += 8) for (const x of [-20.5, -7, 6, 18]) ceilingLight(b, x, x + 2.4, z - 0.3, z + 0.3, top - 0.04);
  b.sign({ k: 'guide', ja: `地下鉄 ${st.nameJa}駅 のりば・みおちか`, en: `Metro: ${st.nameRomaji} Station / Miochika`, bg: 'navy', badges: lines, arrow: 'up' }, (HALL_DOOR[0] + HALL_DOOR[1]) / 2, cf + H1 + 0.7, FRONT - 0.42, [0, -1], 9, 0.7);

  // ── The food floor: showcase counters in rows, an aisle down the middle from the stair ──
  let k = 0;
  for (const z of [-106, -100, -94, -88, -82, -76]) {
    for (const x of [-17, -11.5, -6, 6, 11.5, 17]) {
      const id = `counter_${'abcd'[k % 4]}`, turned = k++ % 2 === 1;
      b.with({ rot: turned ? 2 : 0, t: [x, 0, z + (turned ? MIOCHIKA[id].d / 2 : -MIOCHIKA[id].d / 2)] }, () => {
        b.model('miochika', id, 0, cf, 0, k);
        b.block(-MIOCHIKA[id].w / 2, cf, 0, MIOCHIKA[id].w / 2, cf + 1.35, MIOCHIKA[id].d);
      });
    }
  }
  b.sign({ k: 'label', text: '澪屋 食品館', sub: 'Mioya Food Floor', fg: '#f3e3a0', bg: '#12382c' }, 0, cf + 4.3, HN + 0.04, [0, 1], 9, 1.1);
  prop(b, 'kiosk', -10, cf, -71.5, 0, [1.4, 1.4], 1.1);
  b.sign({ k: 'label', text: 'ご案内', sub: 'Information', fg: '#f3e3a0', bg: '#12382c' }, -10, cf + 1.2, -72.22, [0, -1], 1.1, 0.22);
  prop(b, 'totem', 8, cf, -72, 0, [0.75, 0.2], 2.2);
  b.sign({ k: 'stationmap', station: st.id }, 8, cf + 1.31, -72.07, [0, -1], 1.2, 1.62);
  b.sign({ k: 'areamap', station: st.id }, 8, cf + 1.31, -71.93, [0, 1], 1.2, 1.62);
  for (const x of [-19, 19]) for (let z = -104; z <= -72; z += 8) prop(b, 'lantern', x, top - 0.04, z);
  b.zone('concourse', -IX, cf - 0.3, HN, IX, cf + 5.4, FRONT, '澪屋 食品館（デパ地下）', 'Mioya Food Floor');
}

/**
 * Yanagi Yokochō: a low, lantern-lit food hall in the west wing at B1, entered from Willow Court.
 * Restaurant fronts down the west wall, a long counter with stools down the middle.
 */
function foodHall(h: H) {
  const { b, cf, wall } = h;
  const x0 = -HX, x1 = -IX - 0.4, z0 = -108, z1 = -68, cl = cf + 2.8;
  b.box('floor:#8d7f6c', x0, cf - SLAB, z0, x1, cf, z1);
  b.box('wood:#5a4330', x0 - 0.4, cl, z0 - 0.4, x1, cl + 0.4, z1 + 0.4);
  stoneBox(b, wall, x0 - 0.4, cf, z0 - 0.4, x0, cl, z1 + 0.4);
  stoneBox(b, wall, x0, cf, z0 - 0.4, x1, cl, z0);
  stoneBox(b, wall, x0, cf, z1, x1, cl, z1 + 0.4);
  // Timber beams across the ceiling.
  for (let z = z0 + 2; z < z1; z += 4) b.deco(TIMBER, x0, cl - 0.18, z - 0.1, x1, cl, z + 0.1);
  shopsZ(h, x0, z0 + 0.5, z1 - 0.5, 1);
  const cx = (x0 + x1) / 2;
  for (const [a, e] of [[z0 + 3, -96], [-92, -84], [-80, z1 - 3]]) {
    b.box(TIMBER, cx - 0.55, cf, a, cx + 0.55, cf + 1.02, e);
    b.deco(GOLD, cx - 0.6, cf + 1.02, a - 0.05, cx + 0.6, cf + 1.06, e + 0.05);
    b.deco('glow:#f6ead0', cx - 0.12, cf + 1.06, a + 0.3, cx + 0.12, cf + 1.3, e - 0.3);
    for (let z = a + 0.6; z < e - 0.3; z += 1.1) {
      for (const s of [-1, 1]) {
        b.mesh('flat:#b08d3a', 'cyl', cx + s * 1.05, cf + 0.3, z, 0.08, 0.6, 0.08);
        b.mesh(TIMBER, 'cyl', cx + s * 1.05, cf + 0.63, z, 0.38, 0.07, 0.38);
      }
    }
    // Paper lanterns over the counter.
    for (let z = a + 1; z < e - 0.5; z += 2.4) {
      b.deco('flat:#2b2622', cx - 0.01, cl - 0.55, z - 0.01, cx + 0.01, cl - 0.18, z + 0.01);
      b.mesh('glow:#ffb45a', 'sphere', cx, cl - 0.75, z, 0.42, 0.5, 0.42);
    }
  }
  for (const [a, e] of FOOD) {
    const zc = (a + e) / 2;
    b.deco('glow:#ffb45a', -IX - 0.4, cf + 2.72, a + 0.2, -IX, cf + 2.78, e - 0.2);
    b.sign({ k: 'label', text: 'やなぎ横丁', sub: 'Yanagi Yokochō — food hall', fg: '#f3e3a0', bg: '#4a3626' }, -IX + 0.02, cf + 3.3, zc, [1, 0], 5.2, 0.8);
  }
  for (let z = z0 + 4; z < z1 - 2; z += 4) {
    if (FOOD.some(([a, e]) => z > a - 1.2 && z < e + 1.2)) continue;
    b.sign({ k: 'poster', v: Math.round(-z) }, x1 - 0.02, cf + 1.45, z, [-1, 0], 1.2, 1.7);
  }
  b.zone('passage', x0, cf - 0.3, z0, x1, cl, z1, 'やなぎ横丁', 'Yanagi Yokochō (food hall)');
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
  court(h);
  town(h);
  floorLines(h);
  details(h);
  hubStreet(c, spec.seed, other.primaryDir, h.cf);
  b.later(() => moreIslands(h));
}
