// The Kita-Ōdōri hub: the city's central station.
//
// Four metro lines meet here (Akanesuji deep and east–west with Shiokaze and Sumire beside it,
// Yanagisuji above them and north–south). On top sits Kawaminato Station: a tight glass-roofed
// well, Willow Court, with enclosed galleries round it and rail decks stacked behind. The metro
// part is fully working. The other railways are SHELLS: their space, access and gate positions
// are built and signed "reserved for future line", but they have no trains and no times.
//
// B1 is a set of passages, not one hall. The Central Passage (tall, unpaid) runs north–south
// from the court to the avenue, east of the Yanagisuji platforms. Off it: the Central Gate into
// the Yanagisuji gate hall; the North Passage along the station building's front; the West
// Passage; and Yanagi Mall under the avenue, where the Akanesuji Line has a West Gate hall and
// an East Gate standing as an island in the mall. Shiokaze and Sumire are reached from the paid
// transfer hall by the South Passage.
//
// Frame: +x east (the Akanesuji Line's direction), +z south, so north is -z.
//
//   level   y      what
//   3F     +14     high-speed deck (shell) and its landing
//   2F      +7     gallery; main-line gate hall (shell) north, private-railway concourse (shell) east
//   1F       0     entrance hall and gallery, station doors, plaza with bus and taxi ranks, the avenue
//   B1      -7     passages, gate halls, Yanagi Mall under the avenue, the floor of Willow Court
//   B2     -12     Yanagisuji island platform (vaulted hall)
//   B4     -19     Akanesuji island platform; Shiokaze and Sumire beside it

import { linesAt } from '../data/network';
import { HALL_HALF, PLATFORM_HALF } from '../sim/geometry';
import type { SignContent } from '../signs/content';
import { rng, type Builder } from '../world/builder';
import { MIRROR_X, islandUnit, platformStairs, quarterTurns, type Rect } from './build';
import { CONC_RISE, GROUND_Y, SLAB, ceilingLight, exit, stairs, hall, hallDims, pillar as column, rail, ticketMachines, vending, type Ctx } from './kit';
import type { HubSpec } from './specs';
import { BUILDING_MODELS } from './buildings';
import { fitting } from './fittings';
import { PLACES, place } from './places';
import { posterWall, shopAlcove, shopFits, shopPreset, shopRoom } from './shopfronts';
import { KONBINI, konbini } from './konbini';
import { kerbGaps, kerbRail, poleLine, roadKit, roadModel, streetLamp } from './roads';
import { SHOPS, crosswalk, fillModelLots, type Shop } from './surface';

export const HUB_PLOT = { x: 190, z: 160 };
/**
 * The avenue's landmark buildings (tools/blender/build_plaza.py; exits.ts lists them too): west
 * edge of the lot, frontage, depth, height, name. They face north across the avenue.
 */
export const LANDMARKS = {
  hq: { x0: -118, w: 44, d: 44, h: 120, ja: '秋津島生命ビル', en: 'Akitsushima Life Building' },
  bank: { x0: -39.4, w: 26, d: 30, h: 16, ja: '川湊信用金庫 本店', en: 'Kawaminato Shinkin Bank — Head Office' },
  depato: { x0: 13.3, w: 40, d: 40, h: 38, ja: '澪屋百貨店', en: 'Mioya Department Store' },
};

const GY = GROUND_Y;
/** Clear height of the B1 passages and halls, and of the Central Passage. */
const H1 = 3.6, SP = 5.4;
/** Half-width (in z) of Yanagi Mall under the avenue. */
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
};
/** The block with a shop bay in its base (build_city.py mid_k): the bay's width, depth and height. */
const MID_K = { w: 24, d: 20, h: 36, bay: [12, 10.2, 4] };
/** Where that block stands on the avenue's south side (its west edge), and the kiosk shop's middle (z) on the Central Passage's east wall. */
const SHOP_X0 = -72, KIOSK_Z = -40;
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
const TREES = ['tree_a', 'tree_b', 'tree_c'];
function streetTree(b: Builder, x: number, z: number, n: number) {
  furniture(b, TREES[Math.abs(Math.round(n)) % TREES.length], x, z, n % 2 ? [1, 0] : [0, -1]);
  b.block(x - 0.2, GY, z - 0.2, x + 0.2, GY + 3, z + 0.2);
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
  const toMall: SignContent = { k: 'guide', ja: '東改札・ヤナギモール・バスのりば', en: 'East gate / Yanagi Mall / Buses', bg: 'yellow', arrow: 'up' };
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
  framed('stationmap', 14.5, cf + 1.7, FRONT - 0.43, [0, -1]);
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
  board(0, cf + 5.45, FRONT - 0.43, [0, -1], 3.7, 1.6);
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

  // Station doors, down the east bank into Willow Court, round the willow to the court door.
  bands(h, GY, [[0, FRONT - 0.5], [0, -72], [10.5, -72], [10.5, VOID[3] + 0.6]], all);
  bands(h, cf, [[10.5, -90.4], [16.6, -90.4], [16.6, -68], [0, -68], [0, FRONT]], all);
  // North Passage and Central Passage, in at the Central Gate.
  bands(h, cf, [[0, FRONT], [0, -60], [SX, -60], [SX, GZ], [GATE_Y + 1.9, GZ]], all);
  bands(h, cf, [[GATE_Y - 1.3, GZ], [7, GZ]], all);
  bands(h, cf, [[7, GZ], [COR + 0.3, GZ]], [o]);
  // On through the gate hall into the transfer hall: Akanesuji west, the others to the South Passage.
  bands(h, cf, [[7, GZ], [7, -5.5]], deep);
  bands(h, cf, [[7, -5.5], [wh - 2.6, -5.5], [wh - 2.6, -0.6]], [c]);
  if (beside.length) bands(h, cf, [[7, -5.5], [7, 9], [sx, 9]], beside);
  // Yanagi Mall east (exits 1–4): Akanesuji in at the East Gate, the others on to the Central Passage.
  bands(h, cf, [[MALL_X - 4, 8], [66, 8]], all);
  bands(h, cf, [[66, 8], [66, 0], [GATE_E + 1.9, 0]], [c]);
  bands(h, cf, [[GATE_E - 1.3, 0], [xh + 2.2, 0]], [c]);
  bands(h, cf, [[66, 8], [SX, 8], [SX, GZ + 0.6]], all.filter((x) => x !== c));
  // Yanagi Mall west (exits 5–8): everything in at the West Gate.
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

  // ── Walls: Yanagi Mall ──
  const exitGaps = EXITS.flatMap((x) => [[x - 4, x], [-x, -x + 4]]);
  stoneX(b, wall, -MALL_X - 0.4, MALL_X + 0.4, -BAR - 0.4, -BAR, cf, top, [WP, YD, CP, ...exitGaps]);
  stoneX(b, wall, -MALL_X - 0.4, MALL_X + 0.4, BAR, BAR + 0.4, cf, top, [...exitGaps, [STUB[0], SPE], CP]);
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
  stoneX(b, wall, w0 - 0.4, XE + 0.4, FRONT - 0.4, FRONT, cf, top, [[-8, 8]]);
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
  b.box(PANEL, -IX, top, FRONT - 0.4, IX, GY - SLAB, FRONT);

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
  shopsX(h, 9, IX, FRONT, 1);
  for (const s of [-1, 1]) b.deco(GOLD, Math.min(s * 8, s * 8.12), cf, FRONT - 0.42, Math.max(s * 8, s * 8.12), top, FRONT + 0.02);
  b.deco(GOLD, -8.12, top - 0.12, FRONT - 0.42, 8.12, top, FRONT + 0.02);
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
  const toStation: SignContent = { k: 'guide', ja: '川湊駅・金の柳・駅前広場', en: 'Kawaminato Station / Kin no Yanagi / Plaza', bg: 'yellow', arrow: 'up' };
  const toMall: SignContent = { k: 'guide', ja: 'ヤナギモール・出口 1–8', en: 'Yanagi Mall / Exits 1–8', bg: 'yellow', arrow: 'up' };
  const toMetro: SignContent = { k: 'guide', ja: `地下鉄 ${st.nameJa}駅 のりば`, en: `Metro: ${st.nameRomaji} Station`, bg: 'navy', badges: lines, arrow: 'up' };
  // Central Passage, both ends.
  hangZ(b, toStation, toMetro, cx, cf + 3.0, XP + 3, 7, 0.56, tall);
  hangZ(b, toStation, toMall, cx, cf + 3.0, -BAR - 3, 7, 0.56, tall);
  // North Passage: either side of the court door, and where the West Passage leaves it.
  b.hang({ ...toStation, arrow: 'right' }, 11, cf + 2.75, (FRONT + XP) / 2, 5.6, 0.5, { ceil: top, back: { ...toMetro, arrow: 'up' } });
  b.hang({ k: 'guide', ja: '西連絡通路・出口 5–8・タクシー', en: 'West Passage / Exits 5–8 / Taxi', bg: 'yellow', arrow: 'up' }, -11, cf + 2.75, (FRONT + XP) / 2, 5.6, 0.5, { ceil: top, back: { ...toStation, arrow: 'left' } });
  hangZ(b, { k: 'guide', ja: '川湊駅・中央通路', en: 'Kawaminato Station / Central Passage', bg: 'yellow', arrow: 'up' }, toMall, (w0 + w1) / 2, cf + 2.75, XP + 2, 5.6, 0.5, top);
  hangZ(b, { k: 'guide', ja: '西連絡通路・川湊駅', en: 'West Passage / Kawaminato Station', bg: 'yellow', arrow: 'up' }, toMall, (w0 + w1) / 2, cf + 2.75, -BAR - 2.5, 5.6, 0.5, top);
  // Inside the gates: one sign at each corridor mouth.
  const toSM: SignContent = smLines.length
    ? { k: 'guide', ja: `${smLines.map((x) => x.line.nameJa).join('・')} のりば`, en: `${smLines.map((x) => x.line.nameEn).join(' / ')} platforms`, bg: 'navy', badges: smLines.map((x) => x.line.id), arrow: 'up' }
    : toA;
  const outC: SignContent = { k: 'guide', ja: '中央改札・川湊駅', en: 'Central gate / Kawaminato Station', bg: 'yellow', arrow: 'up' };
  const outW: SignContent = { k: 'guide', ja: '西改札・ヤナギモール', en: 'West gate / Yanagi Mall', bg: 'yellow', arrow: 'up' };
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

  // ── Yanagi Mall: kiosks down the middle make two aisles of it ──
  shopsX(h, c1 + 1.5, xh - 1, -BAR, 1);
  shopsX(h, c1 + 1.5, xh - 1, BAR, -1);
  const wing = (label: string, nums: string, what: { ja: string; en: string }) => {
    ticketMachines(c, cf, 64, -BAR, 5);
    // Over each aisle: trains inward, exits outward.
    const inward: SignContent = { k: 'guide', ja: 'のりば・川湊駅', en: 'Trains / Kawaminato Station', bg: 'navy', badges: lines, arrow: 'up' };
    const outward: SignContent = { k: 'guide', ja: `出口 ${nums}・${what.ja}`, en: `Exits ${nums} / ${what.en}`, bg: 'yellow', arrow: 'up' };
    for (const x of [82, 114, 130]) for (const z of [-7, 7]) b.hang(inward, x, cf + 2.75, z, 4.6, 0.46, { ceil: top, back: outward });
    for (const x of [86, 102, 118, 134]) for (const z of [-6.5, 6.5]) {
      prop(b, 'bins', x + 1.05, cf, z, 0, [0.5, 0.22], 0.9);
    }
    b.deco('tactileBar', 60, cf, -4.15, MALL_X - 4, cf + 0.008, -3.85);
    shopsX(h, 76.5, 115.5, -BAR, 1);
    shopsX(h, 120.5, MALL_X - 0.5, -BAR, 1);
    shopsX(h, 50, 71.5, BAR, -1);
    shopsX(h, 76.5, 115.5, BAR, -1);
    shopsX(h, 120.5, MALL_X - 0.5, BAR, -1);
    b.hang({ k: 'label', text: 'ヤナギモール', sub: `Yanagi Mall — ${label}`, fg: '#f3e3a0', bg: '#12382c' }, 62, cf + 2.85, 0, 9, 0.95, { ceil: top });
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
  b.with({}, () => wing('East', '1–4', { ja: 'バスのりば', en: 'Bus terminal' }));
  b.with(MIRROR_X, () => wing('West', '5–8', { ja: 'タクシーのりば', en: 'Taxi rank' }));

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
  b.sign({ k: 'label', text: '中央口', sub: 'Central entrance — Station plaza', fg: '#f3e3a0', bg: '#12382c' }, c1 - 0.04, cf + 3.25, P9 - 2, [-1, 0], 3.6, 0.5);

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
  b.zone('passage', TX + 0.4, cf - 0.3, -BAR, MALL_X, top, BAR, 'ヤナギモール 東', 'Yanagi Mall — East');
  b.zone('passage', -MALL_X, cf - 0.3, -BAR, GATE_W, top, BAR, 'ヤナギモール 西', 'Yanagi Mall — West');
  b.setSpawn(cx, cf, XP + 6, [0, 1]);
}

// ───────────────────────── Willow Court and the station building ─────────────────────────

function atrium(h: H) {
  const { b, c, cf, lines } = h;
  const st = c.station;
  const run1 = r2((GY - cf) * 1.7), run2 = r2((F2 - GY) * 1.7), run3 = r2((F3 - F2) * 1.7);
  const [vx0, vz0, vx1, vz1] = VOID;
  /** x of the two escalator banks in the well, and of the two in the galleries. */
  const EU = 10.5, GU = 20.5;

  // ── Floors: level-1 gallery, level-2 gallery, level-3 landing ──
  // In the well, one bank climbs south to the doors and one north towards the rail decks.
  b.with({ rot: 1, t: [EU, 0, vz1 - run1] }, () => islandUnit(b, cf, GY, run1, null));
  b.with({ rot: 3, t: [-EU, 0, vz0 + run1] }, () => islandUnit(b, cf, GY, run1, null));
  b.slab(STONE, -IX, HN, IX, FRONT, GY - SLAB, GY, [VOID]);
  let hole2: Rect = [0, 0, 0, 0];
  b.with({ rot: 3, t: [-GU, 0, vz1] }, () => (hole2 = islandUnit(b, GY, F2, run2, F2)));
  b.slab(STONE, -IX, HN, IX, FRONT, F2 - SLAB, F2, [VOID, hole2]);
  b.with({ rot: 3, t: [GU, 0, vz0 + run3] }, () => islandUnit(b, F2, F3, run3, null));
  b.box(STONE, -IX, F3 - SLAB, HN, IX, F3, vz0);

  // ── Railings round the well ──
  rail(b, vx0, vz1, EU - 1.9, vz1 + 0.08, GY);
  rail(b, EU + 1.9, vz1, vx1, vz1 + 0.08, GY);
  rail(b, vx0, vz0 - 0.08, -EU - 1.9, vz0, GY);
  rail(b, -EU + 1.9, vz0 - 0.08, vx1, vz0, GY);
  rail(b, vx0, vz1, vx1, vz1 + 0.08, F2);
  rail(b, vx0, vz0 - 0.08, vx1, vz0, F2);
  for (const y of [GY, F2]) {
    rail(b, vx1, vz0, vx1 + 0.08, vz1, y);
    rail(b, vx0 - 0.08, vz0, vx0, vz1, y);
  }
  rail(b, -IX, vz0, GU - 1.9, vz0 + 0.08, F3);
  rail(b, GU + 1.9, vz0, IX, vz0 + 0.08, F3);

  // ── Columns at the corners of the well, floor to roof, banded in gold ──
  for (const sx of [-1, 1]) {
    for (const z of [vz1 + 0.5, vz0 - 0.5]) {
      const xa = sx * vx1 + (sx > 0 ? 0.1 : -1.0), xb = sx * vx1 + (sx > 0 ? 1.0 : -0.1);
      b.box(COL, xa, cf, z - 0.45, xb, ROOF, z + 0.45);
      for (const y of [GY, F2, F3]) b.deco(GOLD, xa - 0.02, y - SLAB - 0.14, z - 0.47, xb + 0.02, y - SLAB, z + 0.47);
    }
  }

  // ── South front: the modelled stone front, glazed in the middle, open at the station doors ──
  const dw = 9, zf = FRONT - 0.3;
  for (const [xa, xb] of [[-HX, -dw], [dw, HX]]) b.block(xa, GY, zf, xb, ROOF, FRONT);
  b.block(-dw, GY + 3.4, zf, dw, ROOF, FRONT);
  building(b, 'front', 0, FRONT, true);
  b.sign({ k: 'label', text: '川湊駅　KAWAMINATO STATION', fg: NAME_FG, bg: NAME_BG }, 0, GY + 23.9, FRONT + 0.68, [0, 1], 33, 1.8);
  b.sign({ k: 'clock' }, 0, GY + 16, FRONT + 0.99, [0, 1], 4.9, 4.9, { dynamic: true });
  b.sign({ k: 'entrance', station: st.id }, 0, GY + 4.5, FRONT + 3.52, [0, 1], 8, 0.9);

  // ── The wings either side of the inner hall: solid, but for the private-railway concourse ──
  const MASS = 'panel:#e4e0d4';
  const [pz0, pz1] = [-104, -72];
  b.box(MASS, -HX, GY, HN, -IX - 0.4, ROOF, zf);
  b.box(MASS, IX + 0.4, GY, HN, HX, F2 - SLAB, zf);
  b.box(STONE, IX + 0.4, F2 - SLAB, pz0, HX, F2, pz1);
  b.box(MASS, IX + 0.4, F2 - SLAB, HN, HX, ROOF, pz0);
  b.box(MASS, IX + 0.4, F2 - SLAB, pz1, HX, ROOF, zf);
  b.box(MASS, IX + 0.4, F2 + 4.6, pz0, HX, ROOF, pz1);

  // ── Inner hall walls. Glazed where a future railway will open onto the galleries. ──
  stoneZ(b, PANEL, -IX - 0.4, -IX, HN, FRONT, GY, ROOF);
  b.sign({ k: 'mural', ...c.style.mural }, -IX + 0.02, F2 + 2.7, -88, [1, 0], 26, 4.4);
  stoneZ(b, PANEL, IX, IX + 0.4, HN, FRONT, GY, F2);
  stoneZ(b, PANEL, IX, IX + 0.4, HN, FRONT, F2, F2 + 4.6, [[-86, -74]]);
  wallZ(b, PANEL, IX, IX + 0.4, HN, FRONT, F2 + 4.6, ROOF);
  for (const z of [-86.06, -74.06]) b.deco(GOLD, IX - 0.02, F2, z, IX + 0.42, F2 + 4.6, z + 0.12);
  // Outer east wall: glass onto the private-railway bays.
  wallZ(b, PANEL, HX, HX + 0.4, HN, FRONT, GY, F2);
  wallZ(b, PANEL, HX, HX + 0.4, HN, FRONT, F2, F2 + 4.6, [[pz0, pz1]]);
  wallZ(b, PANEL, HX, HX + 0.4, HN, FRONT, F2 + 4.6, ROOF);
  b.block(HX, F2, pz0, HX + 0.4, F2 + 4.6, pz1);
  b.deco('glass', HX + 0.15, F2, pz0, HX + 0.25, F2 + 4.6, pz1);
  for (let z = pz0; z <= pz1; z += 6.4) b.deco(TRIM, HX - 0.04, F2, z - 0.1, HX + 0.44, F2 + 4.6, z + 0.1);
  // North: glass at level 2 (main line) and level 3 (high-speed).
  b.box(PANEL, -IX, GY, HN - 0.4, IX, F2, HN);
  for (const y0 of [F2, F3]) {
    b.block(-IX, y0, HN - 0.4, IX, y0 + 4.6, HN);
    b.deco('glass', -IX, y0, HN - 0.25, IX, y0 + 4.6, HN - 0.15);
    for (let x = -IX; x <= IX; x += 6) b.deco(TRIM, x - 0.1, y0, HN - 0.44, x + 0.1, y0 + 4.6, HN + 0.04);
    b.box(PANEL, -IX, y0 + 4.6, HN - 0.4, IX, y0 + 6.2, HN);
  }
  b.box(PANEL, -IX, F3 - 0.8, HN - 0.4, IX, F3, HN);
  b.box(PANEL, -IX, F3 + 6.2, HN - 0.4, IX, ROOF, HN);

  // ── Glass roof on white trusses ──
  b.deco('glassRoof', -IX - 0.4, ROOF, HN - 0.4, IX + 0.4, ROOF + 0.12, FRONT);
  for (let x = -IX; x <= IX; x += 8) b.deco('flat:#eef0f2', x - 0.2, ROOF - 1.1, HN, x + 0.2, ROOF, FRONT - 0.3);
  for (const z of [HN, -100, -88, -76, FRONT - 0.7]) b.deco('flat:#eef0f2', -IX, ROOF - 0.6, z, IX, ROOF, z + 0.4);

  // ── Level 2 north: the main line's gate hall, closed off and signed ──
  hoardingX(b, -14, 14, F2, HN + 0.5, 1, 1.25);
  b.sign(reserved('在来線のりば', 'main line platforms'), 0, F2 + 2.6, HN + 0.07, [0, 1], 20, 1.5);
  b.sign(gateMark, 0, F2 + 0.012, HN + 3.4, null, 9, 1.4, { top: [0, -1] });
  for (const s of [-1, 1]) {
    // Shuttered ticket offices either side of where the gates will stand.
    const xa = Math.min(s * 16, s * 23), xb = Math.max(s * 16, s * 23);
    b.box(HOARD, xa, F2, HN, xb, F2 + 2.6, HN + 0.5);
    for (let y = 0.2; y < 2.5; y += 0.22) b.deco('flat:#c9ccd0', xa + 0.2, F2 + y, HN + 0.5, xb - 0.2, F2 + y + 0.03, HN + 0.52);
  }
  // ── Level 3 north: the high-speed line's ──
  hoardingX(b, -14, 14, F3, HN + 0.5, 1, 1.25);
  b.sign(reserved('高速線のりば', 'high-speed line platforms'), 0, F3 + 2.6, HN + 0.07, [0, 1], 20, 1.5);
  b.sign(gateMark, 0, F3 + 0.012, HN + 3.4, null, 9, 1.4, { top: [0, -1] });
  // ── Level 2 east: the private railway's terminal concourse ──
  b.box(HOARD, HX - 0.5, F2, -96, HX - 0.38, F2 + 1.25, -80);
  b.deco('flat:#e8a400', HX - 0.52, F2 + 0.93, -96, HX - 0.5, F2 + 1.13, -80);
  b.sign(reserved('私鉄線のりば', 'private railway terminal'), HX - 0.07, F2 + 2.6, -88, [-1, 0], 13, 1.5);
  b.sign(gateMark, HX - 4, F2 + 0.012, -88, null, 9, 1.4, { top: [1, 0] });
  b.sign(reserved('私鉄線コンコース', 'private railway concourse'), IX - 0.02, F2 + 3.9, -80, [-1, 0], 9, 0.9);
  for (let x = IX + 4; x + 2.4 < HX; x += 6) for (const z of [-96, -88, -80]) ceilingLight(b, x, x + 2.4, z - 0.3, z + 0.3, F2 + 4.6);

  // ── Level 1: entrance hall, way down to the metro, way out to the plaza ──
  const metro: SignContent = { k: 'guide', ja: `地下鉄 ${st.nameJa}駅・金の柳`, en: `Metro: ${st.nameRomaji} Station / Kin no Yanagi`, bg: 'navy', badges: lines, arrow: 'right' };
  const out: SignContent = { k: 'guide', ja: '駅前広場・バス・タクシー', en: 'Station plaza / Bus / Taxi', bg: 'yellow', arrow: 'up' };
  hangZ(b, metro, out, 0, GY + 2.9, -70, 7, 0.56, F2 - SLAB);
  b.sign({ k: 'guide', ja: '2階・3階 将来線コンコース', en: 'Levels 2 and 3 — future railway concourses', bg: 'white', arrow: 'up' }, -IX + 0.02, GY + 2.6, -70, [1, 0], 4.4, 0.46);
  shopsZ(h, IX, HN + 1, FRONT - 1, -1, GY);
  shopsZ(h, -IX, HN + 1, -90, 1, GY);
  for (let z = -108; z < FRONT - 3; z += 8) for (const x of [-19, 17]) ceilingLight(b, x, x + 2.4, z - 0.3, z + 0.3, F2 - SLAB);
  for (let x = -11; x < 12; x += 8) for (const z of [-106, -70]) ceilingLight(b, x, x + 2.4, z - 0.3, z + 0.3, F2 - SLAB);
  b.sign({ k: 'guide', ja: '3階 将来線コンコース', en: 'Level 3 — future railway concourse', bg: 'white', arrow: 'up' }, IX - 0.02, F2 + 2.6, -92, [-1, 0], 4.4, 0.46);

  // ── B1: the court floor, shops under the gallery on three sides ──
  shopsZ(h, IX, HN + 1, FRONT - 1, -1);
  shopsZ(h, -IX, HN + 1, FOOD[0][0] - 0.5, 1);
  shopsZ(h, -IX, FOOD[0][1] + 0.5, FOOD[1][0] - 0.5, 1);
  shopsZ(h, -IX, FOOD[1][1] + 0.5, FRONT - 1, 1);
  foodHall(h);
  b.sign({ k: 'mural', ...c.style.mural }, 0, cf + 2.6, HN + 0.02, [0, 1], 40, 4.0);
  for (let z = -108; z < FRONT - 3; z += 8) for (const x of [-20.5, 18]) ceilingLight(b, x, x + 2.4, z - 0.3, z + 0.3, GY - SLAB);
  for (let x = -11; x < 12; x += 8) for (const z of [-106, -70]) ceilingLight(b, x, x + 2.4, z - 0.3, z + 0.3, GY - SLAB);
  b.sign({ k: 'guide', ja: `地下鉄 ${st.nameJa}駅 のりば・ヤナギモール`, en: `Metro: ${st.nameRomaji} Station / Yanagi Mall`, bg: 'navy', badges: lines, arrow: 'up' }, 0, cf + H1 + 0.7, FRONT - 0.42, [0, -1], 9, 0.7);

  // ── Kin no Yanagi: the gilded willow everyone meets under ──
  const wz = -88;
  prop(b, 'willow', 0, cf, wz, 0, [2.5, 2.5], 0.5);
  b.block(-0.5, cf, wz - 0.5, 0.5, cf + 6, wz + 0.5);
  // Up-lighting in the planter.
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    b.mesh('glow:#ffd98a', 'sphere', Math.cos(a) * 1.5, cf + 0.98, wz + Math.sin(a) * 1.5, 0.22, 0.1, 0.22);
  }
  b.deco('flat:#12382c', -0.85, cf + 2.5, wz - 0.42, 0.85, cf + 4.2, wz + 0.42);
  for (const s of [-1, 1] as const) b.sign({ k: 'clock' }, 0, cf + 3.35, wz + s * 0.43, [0, s], 1.5, 1.5, { dynamic: true });
  b.box('flat:#12382c', -1.5, cf, wz + 3.3, 1.5, cf + 1.5, wz + 3.5);
  b.sign({ k: 'label', text: '金の柳', sub: 'Kin no Yanagi — meeting point', fg: '#f3e3a0', bg: '#12382c' }, 0, cf + 0.85, wz + 3.51, [0, 1], 2.9, 1.2);
  // Information desks, a standing map, lanterns under the galleries.
  prop(b, 'kiosk', -10, cf, -71.5, 0, [1.4, 1.4], 1.1);
  b.sign({ k: 'label', text: 'ご案内', sub: 'Information', fg: '#f3e3a0', bg: '#12382c' }, -10, cf + 1.2, -72.22, [0, -1], 1.1, 0.22);
  prop(b, 'kiosk', -9, GY, -70, 0, [1.4, 1.4], 1.1);
  b.sign({ k: 'label', text: 'ご案内', sub: 'Information', fg: '#f3e3a0', bg: '#12382c' }, -9, GY + 1.2, -69.28, [0, 1], 1.1, 0.22);
  prop(b, 'totem', 8, cf, -72, 0, [0.75, 0.2], 2.2);
  b.sign({ k: 'stationmap', station: st.id }, 8, cf + 1.31, -72.07, [0, -1], 1.2, 1.62);
  b.sign({ k: 'areamap', station: st.id }, 8, cf + 1.31, -71.93, [0, 1], 1.2, 1.62);
  for (const x of [-19, 19]) for (let z = -104; z <= -72; z += 8) prop(b, 'lantern', x, GY - SLAB, z);
  for (const x of [-9, 9]) for (const z of [-67, -73]) prop(b, 'lantern', x, F2 - SLAB, z);
  for (const x of [-6, 6]) prop(b, 'planter', x, cf, -66.2, 0, [0.6, 0.6], 1.2);

  // ── Zones ──
  b.zone('concourse', -IX, cf - 0.3, HN, IX, cf + 5.4, FRONT, 'ウィローコート「金の柳」前', 'Willow Court — Kin no Yanagi', true);
  b.zone('concourse', -IX, GY - 0.2, HN, IX, GY + 5, FRONT, '川湊駅 1階 エントランスホール', 'Kawaminato Station — entrance hall, level 1');
  b.zone('concourse', -IX, F2 - 0.2, HN, IX, F2 + 5, FRONT, '2階 ギャラリー・在来線改札予定地', 'Level 2 gallery (future main line gates)');
  b.zone('concourse', IX + 0.4, F2 - 0.2, pz0, HX, F2 + 4.6, pz1, '2階 私鉄線コンコース予定地', 'Level 2 — future private railway concourse');
  b.zone('concourse', -IX, F3 - 0.2, HN, IX, F3 + 5, vz0, '3階 高速線コンコース予定地', 'Level 3 landing (future high-speed line)');
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
  building(b, 'stationbldg', (HX + 0.4 + BLDG) / 2, FRONT, true);
  b.sign({ k: 'label', text: '川湊ステーションビル', sub: 'Kawaminato Station Building', fg: NAME_FG, bg: NAME_BG }, 82.2, GY + 32.6, FRONT + 0.32, [0, 1], 42, 3.2);
  b.sign({ k: 'shop', ja: '川湊ステーションビル', bg: NAME_BG, fg: NAME_FG, vertical: true }, 48, GY + 19.5, FRONT + 1.52, [0, 1], 2.6, 20);
  b.sign({ k: 'label', text: '川湊ステーションビル', sub: 'Station Building — shops', fg: NAME_FG, bg: NAME_BG }, 78.2, GY + 4.0, FRONT + 0.58, [0, 1], 6, 1.4);
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

function street(h: H, seed: number, dir: [number, number]) {
  const { b, c } = h;
  const r = rng(seed);
  const { x: X, z: Z } = HUB_PLOT;
  const AV = 11, YS = 10, S_FRONT = 19;
  const bldg: Rect = [-BLDG, DECK_N, BLDG, FRONT];
  const bus: Rect = [56, -58, 176, -26];
  const taxi: Rect = [-176, -44, -56, -34];
  const drives: Rect[] = [[96, -26, 108, -AV], [152, -26, 164, -AV], [-108, -34, -96, -AV], [-164, -34, -152, -AV]];
  const stairs0 = b.out.holes.map((q) => [...q]);
  const nearHole = (x: number, z: number, m: number) => stairs0.some((q) => x > q[0] - m && x < q[2] + m && z > q[1] - m && z < q[3] + m);
  /** The footbridge over the avenue (x range). */
  const FB: [number, number] = [64, 67];

  // ── Ground ──
  b.slab('asphalt', -X, -Z, X, Z, -0.6, 0, [...stairs0, bldg]);
  b.slab('paver', -X, -Z, X, Z, 0, GY, [...stairs0, bldg, [-X, -AV, X, AV], [-YS, AV, YS, Z], bus, taxi, ...drives]);
  b.zone('street', -X, -0.3, -Z, X, 80, Z, '川湊駅前・北大通', 'Kawaminato Station plaza and Kita-Ōdōri avenue');
  b.block(-X - 1, -1, -Z - 1, -X, 60, Z + 1);
  b.block(X, -1, -Z - 1, X + 1, 60, Z + 1);
  b.block(-X, -1, -Z - 1, X, 60, -Z);
  b.block(-X, -1, Z, X, 60, Z + 1);

  // ── Kita-Ōdōri avenue (east–west) and the head of Yanagi-suji (south): paint, then the road kit ──
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
  b.deco('flat:#e9e9e4', -YS - 7.2, 0.004, -AV, -YS - 6.8, 0.01, 0);
  b.deco('flat:#e9e9e4', YS + 6.8, 0.004, 0, YS + 7.2, 0.01, AV);
  const cross: [number, number][] = [[-YS, YS]];
  roadKit(b, { X, Z, rw: AV, swOut: S_FRONT, streets: cross, seed, name: { ja: c.station.nameJa, en: c.station.nameRomaji }, at: { id: c.station.id, dir }, tee: true, lamp: 'lamp_hw', junctions: [{ ja: '川湊駅前', en: 'Kawaminato Sta.' }] });
  // The backdrop city round the hub is Blender-built too: business blocks, no plain boxes.
  b.out.district = { radius: 620, old: [0, 0], oldRadius: 0 };
  // Kerb guard rail, open at the junction, the kit's bus stops and taxi stand, and the plaza's drives.
  for (const s of [-1, 1] as const) {
    const zr = s * (AV + 0.3);
    const open = [[-YS - 7, YS + 7], ...kerbGaps(cross).filter((k) => k.s === s).map((k) => [k.x0, k.x1]), ...(s < 0 ? drives.map((d) => [d[0] - 1, d[2] + 1]) : [])].sort((p, q) => p[0] - q[0]);
    let x = -X;
    for (const [from, to] of open.concat([[X, X]])) {
      for (let xa = x; xa + 2.5 <= from; xa += 2.5) {
        b.block(xa, GY, zr - 0.04, xa + 2.5, GY + 0.9, zr + 0.04);
        kerbRail(b, xa + 1.25, zr);
      }
      x = Math.max(x, to);
    }
  }
  // More traffic: vehicles down Yanagi-suji (keeping left).
  const VEH: Record<string, [number, number, number]> = { sedan: [4.5, 1.72, 1.45], taxi: [4.5, 1.72, 1.6], kei: [3.4, 1.48, 1.72], van: [4.7, 1.72, 1.95], bus: [10.5, 2.5, 3.2] };
  const vehicle = (id: string, x: number, z: number, f: [number, number]) => {
    const [len, wid, hgt] = VEH[id.split('_')[0]];
    const hx = f[0] !== 0 ? len / 2 : wid / 2, hz = f[0] !== 0 ? wid / 2 : len / 2;
    roadModel(b, id, x, 0, z, f);
    b.block(x - hx, 0, z - hz, x + hx, hgt, z + hz);
  };
  vehicle('sedan_s', 2.7, 58, [0, 1]);
  vehicle('van', 7.2, 71, [0, 1]);
  vehicle('kei_w', 2.7, 104, [0, 1]);
  vehicle('taxi', -2.7, 86, [0, -1]);
  vehicle('sedan_b', -7.2, 121, [0, -1]);
  vehicle('kei_g', -2.7, 137, [0, -1]);

  // ── Street trees, lamps and furniture along the kerbs and the building fronts ──
  const kerbClear = (x: number, s: number, m: number) =>
    !junction(x) && !nearHole(x, s * (AV + 2), 5) && !kerbGaps(cross).some((k) => k.s === s && x > k.x0 - m && x < k.x1 + m) &&
    !(s < 0 && drives.some((d) => x > d[0] - m && x < d[2] + m)) && !(x > FB[0] - 11 && x < FB[1] + 2);
  let n = 0;
  for (const s of [-1, 1]) {
    for (let x = -X + 8; x < X; x += 18) if (kerbClear(x, s, 2)) streetTree(b, x, s * (AV + 1.7), n++);
  }
  for (const sx of [-1, 1]) {
    for (let z = S_FRONT + 12; z < Z - 4; z += 15) {
      const x = sx * (YS + 1.6);
      if (!nearHole(x, z, 4)) streetTree(b, x, z, n++);
      if (z % 2 === 1 && !nearHole(x, z + 7, 3)) streetLamp(b, 'lamp_hw', sx * (YS + 0.9), z + 7, [-sx, 0]);
    }
  }

  // ── City blocks south of the avenue ──
  // Front row: three landmarks on fixed lots (the old bank and the department store on the
  // corners facing the station, the life-insurance tower further west), street models between.
  const landmark = (id: string, x0: number, w: number, d: number, hgt: number) => {
    b.block(x0, GY, S_FRONT, x0 + w, GY + hgt, S_FRONT + d);
    building(b, id, x0 + w / 2, S_FRONT, false);
  };
  const [bk, hq, dp] = [LANDMARKS.bank, LANDMARKS.hq, LANDMARKS.depato];
  // West of the tower: a pocket park, the police box and a vending corner on lots of their own.
  let pe = hq.x0 - 1.5;
  for (const p of [
    { kind: 'koban', ja: '北大通交番', en: 'Kita-Ōdōri' }, { kind: 'park', ja: '柳筋ポケットパーク', en: 'Yanagisuji Pocket Park' },
    { kind: 'vending', ja: 'ドリンクコーナー', en: 'Drinks corner' },
  ] as const) {
    const pw = PLACES[p.kind].w;
    if (pe - pw < -X + 40) break;
    b.with({ t: [pe - pw / 2, 0, S_FRONT] }, () => place(b, p));
    pe -= pw + 0.8;
  }
  fillModelLots(b, r, -X + 1, pe - 0.5, S_FRONT, Z, { tower: true, noBack: true });
  landmark('hq', hq.x0, hq.w, hq.d, hq.h);
  // A block with a convenience store you can walk into in its base.
  {
    const xm = SHOP_X0 + MID_K.w / 2, [bw, bd, bh] = MID_K.bay;
    b.block(SHOP_X0, GY, S_FRONT, xm - bw / 2, GY + MID_K.h, S_FRONT + MID_K.d);
    b.block(xm + bw / 2, GY, S_FRONT, SHOP_X0 + MID_K.w, GY + MID_K.h, S_FRONT + MID_K.d);
    b.block(xm - bw / 2, GY, S_FRONT + bd, xm + bw / 2, GY + MID_K.h, S_FRONT + MID_K.d);
    b.block(xm - bw / 2, GY + bh, S_FRONT, xm + bw / 2, GY + MID_K.h, S_FRONT + bd);
    b.model('city', 'mid_k', xm, GY, S_FRONT, 7);
    b.with({ t: [xm, 0, S_FRONT] }, () => konbini(b, { type: 'ground', chain: 'maruhoshi' }));
  }
  fillModelLots(b, r, hq.x0 + hq.w + 0.5, SHOP_X0 - 1, S_FRONT, Z, { noBack: true });
  fillModelLots(b, r, SHOP_X0 + MID_K.w + 0.6, bk.x0 - 1, S_FRONT, Z, { noBack: true });
  landmark('bank', bk.x0, bk.w, bk.d, bk.h);
  landmark('depato', dp.x0, dp.w, dp.d, dp.h);
  fillModelLots(b, r, dp.x0 + dp.w + 1, X - 1, S_FRONT, Z, { tower: true, noBack: true });
  const mid = (q: { x0: number; w: number }) => q.x0 + q.w / 2;
  b.sign({ k: 'label', text: hq.ja, sub: hq.en, fg: NAME_FG, bg: NAME_BG }, mid(hq), GY + 9.5, S_FRONT - 0.57, [0, -1], 6.2, 0.9);
  b.sign({ k: 'label', text: bk.ja, sub: bk.en, fg: NAME_FG, bg: NAME_BG }, mid(bk), GY + 5.87, S_FRONT + 0.39, [0, -1], 2.9, 0.6);
  b.sign({ k: 'clock' }, mid(bk), GY + 13.75, S_FRONT - 1.47, [0, -1], 1.7, 1.7, { dynamic: true });
  b.sign({ k: 'label', text: dp.ja, sub: dp.en, fg: NAME_FG, bg: NAME_BG }, dp.x0 + 30, GY + 41.5, S_FRONT + 4.78, [0, -1], 17.5, 4.0);
  // A big screen board on the department store's front, facing the plaza: three static panels.
  b.deco('flat:#15171a', dp.x0 + 13.4, GY + 12.6, S_FRONT - 0.5, dp.x0 + 34.6, GY + 23.4, S_FRONT - 0.18);
  b.deco('glow:#cfe6ff', dp.x0 + 13.3, GY + 12.5, S_FRONT - 0.46, dp.x0 + 34.7, GY + 12.6, S_FRONT - 0.18);
  for (let i = 0; i < 3; i++) b.sign({ k: 'poster', v: 31 + i * 7 }, dp.x0 + 17.2 + i * 6.8, GY + 18, S_FRONT - 0.52, [0, -1], 6.5, 9.6);

  /**
   * A row of blocks from xa to xb with their fronts at z0: the towers given stand where they
   * are told, and the rest is filled from the pool with whatever fits (depth up to `deep`).
   * `south`: the row faces south and runs back to the north.
   */
  const row = (xa: number, xb: number, z0: number, deep: number, fixed: [string, number][] = [], south = false) => {
    const place = (kind: string, id: string, x0: number, m: { w: number; d: number; h: number }) => {
      b.block(x0, GY, south ? z0 - m.d : z0, x0 + m.w, GY + m.h, south ? z0 : z0 + m.d);
      b.with({ rot: south ? 2 : 0, t: [x0 + m.w / 2, 0, z0] }, () => b.model(kind, id, 0, GY, 0, Math.floor(r() * 1000)));
    };
    let x = xa, last = '';
    for (const [id, x0] of [...fixed, ['', xb] as [string, number]].sort((p, q) => p[1] - q[1])) {
      for (;;) {
        const fits = ROW_POOL.filter((m) => m.w <= x0 - x - 0.6 && m.d <= deep && m.id + m.kind !== last);
        if (!fits.length) break;
        const m = fits[Math.floor(r() * fits.length)];
        place(m.kind, m.id, x, m);
        last = m.id + m.kind;
        x += m.w + 1.2;
      }
      if (id) {
        place('city', id, x0, CITY[id]);
        x = x0 + CITY[id].w + 1.2;
      }
    }
  };
  // Second row: the tower cluster south and east of the junction. Third row: blocks closing the view.
  const R2 = 70, R3 = 117;
  row(YS + 3, X - 2, R2, 44, [['twr_a', 16], ['twr_c', 72], ['twr_e', 124]]);
  row(-X + 2, -YS - 3, R2, 44, [['twr_d', -150], ['twr_b', -60]]);
  row(YS + 3, X - 2, R3, 42);
  row(-X + 2, -YS - 3, R3, 42);
  // The back lane between the first two rows keeps its wires overhead: the avenue's are buried.
  for (const sx of [-1, 1]) poleLine(b, { axis: 'x', from: sx * (YS + 4), to: sx * (X - 4), at: R2 - 2.4, road: 1, drops: 2.2, name: { ja: c.station.nameJa, en: c.station.nameRomaji } });
  // North-west, beyond the taxi rank: blocks facing the plaza.
  row(-X + 4, -BLDG - 6, -68, 38, [], true);

  // ── Along the south sidewalk's building fronts: benches, drinks machines, bicycles ──
  const sideClear = (x: number) =>
    !junction(x) && !nearHole(x, 15, 4) && !(x > bk.x0 - 2 && x < bk.x0 + bk.w + 2) && Math.abs(x - mid(hq)) > 7 && !(x > dp.x0 - 2 && x < dp.x0 + 8) && !(x > FB[0] - 12 && x < FB[1] + 2);
  const kinds = ['bench', 'vend', 'bikes', 'bench'];
  let k = 0;
  for (let x = -X + 14; x < X - 6; x += 21) {
    if (!sideClear(x)) continue;
    const id = kinds[k++ % kinds.length];
    const z = id === 'vend' ? S_FRONT - 0.85 : id === 'bikes' ? S_FRONT - 1.6 : S_FRONT - 0.9;
    furniture(b, id, x, z, id === 'bench' ? [0, -1] : [0, -1]);
    b.block(x - (id === 'bikes' ? 1.7 : 1.1), GY, z - 0.4, x + (id === 'bikes' ? 1.7 : 1.1), GY + (id === 'vend' ? 1.83 : 0.9), z + 0.6);
    if (id === 'vend') for (const [dx, v] of [[-0.55, 'vending'], [0.55, 'vending2']] as const) b.sign({ k: 'machine', v }, x + dx, GY + 0.915, z - 0.02, [0, -1], 0.98, 1.8);
  }

  // ── Footbridge over the avenue, plaza to the department store's block ──
  const DECK = 5.3, runF = 9.4;
  b.box('flat:#d9cdb4', FB[0], DECK - 0.5, -17.5, FB[1], DECK, 17.5);
  b.deco(GOLD, FB[0] - 0.02, DECK - 0.5, -17.52, FB[1] + 0.02, DECK - 0.42, 17.52);
  b.deco(GOLD, FB[0] - 0.02, DECK - 0.08, -17.52, FB[1] + 0.02, DECK, 17.52);
  for (const s of [-1, 1]) {
    stairs(b, { x0: FB[0] - runF, x1: FB[0], z0: Math.min(s * 14.5, s * 17.5), z1: Math.max(s * 14.5, s * 17.5), yLow: GY, yHigh: DECK, mat: 'flat:#cfc6b4' });
    rail(b, FB[0], s * 17.5 - (s > 0 ? 0 : 0.08), FB[1], s * 17.5 + (s > 0 ? 0.08 : 0), DECK);
    for (const x of [FB[0] + 0.4, FB[1] - 0.4]) {
      b.box('flat:#cfc6b4', x - 0.35, GY, s * 12.6 - 0.35, x + 0.35, DECK - 0.5, s * 12.6 + 0.35);
      b.deco(GOLD, x - 0.37, DECK - 0.75, s * 12.6 - 0.37, x + 0.37, DECK - 0.5, s * 12.6 + 0.37);
    }
  }
  rail(b, FB[0] - 0.08, -14.5, FB[0], 14.5, DECK);
  rail(b, FB[1], -17.5, FB[1] + 0.08, 17.5, DECK);
  b.sign({ k: 'label', text: '北大通歩道橋', sub: 'Kita-Ōdōri footbridge', fg: NAME_FG, bg: NAME_BG }, FB[0] - 0.1, DECK - 0.25, 0, [-1, 0], 9, 0.4);
  b.sign({ k: 'label', text: '北大通歩道橋', sub: 'Kita-Ōdōri footbridge', fg: NAME_FG, bg: NAME_BG }, FB[1] + 0.1, DECK - 0.25, 0, [1, 0], 9, 0.4);
  b.zone('passage', FB[0], DECK - 0.2, -17.5, FB[1], DECK + 3, 17.5, '北大通歩道橋', 'Kita-Ōdōri footbridge', true);

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
    building(b, 'busshelter', x, z - 1.2, false);
    b.block(x - 5.9, GY, z + 0.85, x + 5.9, GY + 2.3, z + 1.15);
    for (const s of [-1, 1] as const) {
      b.sign({ k: 'label', text: `バスのりば ${i + 1}　${ja}`, sub: `Bus stop ${i + 1} — ${en}`, fg: NAME_FG, bg: NAME_BG }, x, GY + 2.3, z + s * 1.26, [0, s], 6.8, 0.48);
    }
  });
  for (const [x, z, f] of [[84, -53.5, 1], [150, -53.5, 1], [128, -42.5, -1], [100, -42.5, -1], [104, -31, 1], [146, -31, 1]] as const) vehicle('bus', x, z, [f, 0]);
  // Covered walk from the station doors along the Station Building to the buses; a kiosk on the plaza.
  building(b, 'buscanopy', 75, -58.5, true);
  building(b, 'kiosk', -14, -46, true);
  b.block(-16.1, GY, -49.1, -11.9, GY + 3, -46);
  b.sign({ k: 'label', text: 'きっぷ・ご案内', sub: 'Tickets / Information', fg: NAME_FG, bg: NAME_BG }, -14, GY + 2.6, -45.94, [0, 1], 3.0, 0.36);
  // Taxi rank (west).
  for (let i = 0; i < 9; i++) vehicle('taxi', -62 - i * 5.6, -41.2, [1, 0]);
  for (let i = 0; i < 4; i++) vehicle('taxi', -112 - i * 5.6, -37, [1, 0]);
  building(b, 'taxishelter', -66, -33.6, false);
  b.block(-73.9, GY, -31.6, -58.1, GY + 2.3, -31.35);
  b.sign({ k: 'label', text: 'タクシーのりば', sub: 'Taxi', fg: '#111', bg: '#ffd100' }, -66, GY + 2.3, -33.66, [0, -1], 10.8, 0.48);
  b.sign({ k: 'label', text: 'タクシーのりば', sub: 'Taxi', fg: '#111', bg: '#ffd100' }, -66, GY + 2.3, -31.34, [0, 1], 10.8, 0.48);
  // The pedestrian middle: trees, benches, and the plaza's name.
  [[-36, -30], [-24, -44], [24, -44], [36, -30], [-40, -54], [40, -54], [-48, -22], [48, -22], [-10, -34], [10, -34]].forEach(([tx, tz], i) => streetTree(b, tx, tz, i));
  for (const [bx, bz] of [[-18, -36], [18, -36], [-30, -50], [30, -50], [-6, -28], [6, -28]]) {
    furniture(b, 'bench', bx, bz, [0, 1]);
    b.block(bx - 0.95, GY, bz - 0.3, bx + 0.95, GY + 0.5, bz + 0.3);
  }
  for (const [lx, lz] of [[-30, -26], [30, -26], [-22, -56], [22, -56], [0, -40]]) {
    streetLamp(b, 'lamp_park', lx, lz, [0, 1]);
  }
  b.box('flat:#0d3b66', -3.2, GY, -22.3, 3.2, GY + 2.1, -22);
  b.sign({ k: 'label', text: '川湊駅前広場', sub: 'Kawaminato Station Plaza', fg: '#fff', bg: '#0d3b66' }, 0, GY + 1.2, -21.99, [0, 1], 6.2, 1.5);
  b.sign({ k: 'guide', ja: `地下鉄 ${c.station.nameJa}駅`, en: `Metro: ${c.station.nameRomaji} Sta. — inside, down the escalators`, bg: 'navy', badges: h.lines, arrow: 'up' }, 0, GY + 1.2, -22.31, [0, -1], 6.2, 0.9);

  // ── West block: the station hotel; and a tower beyond the taxi rank ──
  const hx = -(HX + 0.4 + BLDG) / 2;
  b.block(-BLDG, GY, HN, -HX - 0.4, 46, FRONT);
  building(b, 'hotel', hx, FRONT, true);
  for (const sx of [-8.6, -3.2, 3.2, 8.6]) b.block(hx + sx - 0.4, GY, FRONT + 6.0, hx + sx + 0.4, GY + 4.9, FRONT + 6.8);
  b.sign({ k: 'label', text: '川湊ステーションホテル', sub: 'Kawaminato Station Hotel', fg: NAME_FG, bg: NAME_BG }, hx, GY + 48.6, FRONT - 2.78, [0, 1], 32, 3.4);
  b.sign({ k: 'label', text: '川湊ステーションホテル', sub: 'Kawaminato Station Hotel', fg: NAME_FG, bg: NAME_BG }, hx, GY + 5.2, FRONT + 7.22, [0, 1], 12, 0.55);
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
  floorLines(h);
  details(h);
  shells(h);
  street(h, spec.seed, other.primaryDir);
  b.later(() => moreIslands(h));
}
