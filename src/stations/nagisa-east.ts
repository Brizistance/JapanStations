// The Nagisa Line's viaduct stations east of Hibarino, each one a layout of its own. Side
// platforms throughout (the line's own arrangement); what differs is how you get up to them.
//
// Asahino (arcade): two gate halls under the viaduct, one per direction, as at many suburban
//   stations that grew up one platform at a time. A free passage under the tracks runs between
//   them, and the arches either side are let as shops.
// Takanodai (hillside): the viaduct runs into the side of a ridge. The station building stands on
//   the ridge, level with platform 1: you walk straight in from the estate. Platform 2 and the
//   valley entrance are reached by an underpass beneath the tracks.
// Izumigaoka (railhead): the line's terminus for now. The tracks carry on past the platforms
//   towards the planned extension, under a concourse that bridges them; decks either side step
//   down to the bus terminal and the estate.

import { HALL_HALF } from '../sim/geometry';
import type { SignContent } from '../signs/content';
import type { Builder } from '../world/builder';
import { GROUND_Y, ceilingLight, gateLine, hall, hallDims, rail, stairs, ticketMachines, vending, type Ctx } from './kit';
import { MIRROR_X, type Rect } from './build';
import type { ElevatedSpec } from './specs';
import { OPEN_AIR, type OpenAirPlan } from './exits';
import { car, tree, PLOT_X, PLOT_Z } from './surface';
import { wayfindElevated } from './wayfinding';
import { glazed, plotWalls, seeded } from './open-air';

const GY = GROUND_Y;
const X = PLOT_X, Z = PLOT_Z;
const stairRun = (rise: number) => Math.round(rise * 1.7 * 100) / 100;

export function buildNagisaEast(c: Ctx, spec: ElevatedSpec) {
  if (spec.layout === 'arcade') buildArcade(c, spec);
  else if (spec.layout === 'hillside') buildHillside(c, spec);
  else buildRailhead(c, spec);
}

// ── Shared pieces ────────────────────────────────────────────────────────────────────────────

/** Viaduct piers and cross-beams under the hall. */
function piers(b: Builder, deckUnder: number, skip: (x: number) => boolean = () => false) {
  for (let x = -54; x <= 54; x += 13.5) {
    if (skip(x)) continue;
    for (const z of [-4.6, 4.6]) b.box('concrete', x - 0.55, 0, z - 0.55, x + 0.55, deckUnder, z + 0.55);
    b.deco('concrete', x - 0.7, deckUnder - 0.9, -9, x + 0.7, deckUnder, 9);
  }
}

/** The opening a side-platform stair (foot at sx0, climbing +x) needs in platform `s`'s slab. */
function sideHole(s: 1 | -1, sx0: number, run: number, wallZ: number): number[] {
  const z0 = wallZ - 2.62, z1 = wallZ + 0.01;
  return s > 0 ? [sx0, z0, sx0 + run, z1] : [sx0, -z1, sx0 + run, -z0];
}

/** A stair from y0 up through the deck to side platform `s`, climbing +x from sx0, with its rails up top. */
function sideStair(c: Ctx, s: 1 | -1, sx0: number, y0: number, pf: number, wallZ: number, signY: number) {
  const { b, station, line } = c;
  const run = stairRun(pf - y0), sx1 = sx0 + run, holeZ0 = wallZ - 2.62;
  b.with({ mz: s < 0 }, () => {
    stairs(b, { x0: sx0, x1: sx1, z0: wallZ - 2.5, z1: wallZ - 0.1, yLow: y0, yHigh: pf });
    rail(b, sx0 - 0.1, holeZ0 - 0.08, sx1 - 1.5, holeZ0, pf);
    rail(b, sx0 - 0.1, holeZ0 - 0.08, sx0 - 0.02, wallZ, pf);
    b.sign({ k: 'dir', station: station.id, line: line.id, dir: s > 0 ? 'up' : 'down', arrow: 'up' }, sx0 - 0.6, signY, wallZ - 1.3, [-1, 0], 4.2, 0.5);
    b.sign({ k: 'guide', ja: '出口・改札', en: 'Exit / Ticket gates', bg: 'yellow', arrow: 'up' }, sx1 + 0.4, pf + 2.6, wallZ - 1.3, [1, 0], 2.4, 0.42);
  });
}

/** Ground: asphalt base, paved everywhere but the roads and the given floors. */
function ground(b: Builder, plan: OpenAirPlan, floors: Rect[], z0 = -Z) {
  const roads = plan.areas.filter((a) => a.fill === 'road').map((a) => a.r as Rect);
  b.slab('asphalt', -X, z0, X, Z, -0.6, 0, []);
  b.slab('paver', -X, z0, X, Z, 0, GY, [...roads, ...floors]);
  for (const r of roads) for (let x = -X; x < X; x += 6) b.deco('flat:#e9e9e4', x, 0.004, (r[1] + r[3]) / 2 - 0.07, x + 3, 0.01, (r[1] + r[3]) / 2 + 0.07);
}

/** A floor at fl over street level (paver to 0.1, then the finish). */
function floorAt(b: Builder, mat: string, r: Rect, fl: number, holes: Rect[] = []) {
  b.slab('paver', r[0], r[1], r[2], r[3], 0, 0.1, holes);
  b.slab(mat, r[0], r[1], r[2], r[3], 0.1, fl, holes);
}

/** A row of detached houses on terraced lots along x, between z0 and z1, standing at y. */
function houses(b: Builder, r: () => number, z0: number, z1: number, y: number, skip: (x: number) => boolean = () => false) {
  const mats = ['facade:house:#e9e2d2', 'facade:house:#d9cdb8', 'facade:house:#cfd6d2', 'facade:house:#e6d9c9'];
  for (let x = -126; x < 124;) {
    const w = 8 + r() * 3;
    if (!skip(x) && !skip(x + w)) {
      b.box(mats[Math.floor(r() * 4)], x, y, z0 + 0.6, x + w, y + 6.2, z1 - 0.6);
      b.deco('roof', x - 0.4, y + 6.2, z0 + 0.2, x + w + 0.4, y + 6.55, z1 - 0.2);
      b.deco('roof', x + 0.8, y + 6.55, z0 + 1, x + w - 0.8, y + 7.1, z1 - 1);
    }
    x += w + 1.6;
  }
}

/** A row of slab blocks between z0 and z1 from x0 to x1, standing at y. */
function blocks(b: Builder, r: () => number, x0: number, x1: number, z0: number, z1: number, y: number, mats: string[], floors: [number, number]) {
  for (let x = x0; x < x1 - 8;) {
    const w = 18 + r() * 10;
    b.box(mats[Math.floor(r() * mats.length)], x, y, z0, Math.min(x + w, x1), y + (floors[0] + Math.floor(r() * (floors[1] - floors[0]))) * 3.1, z1);
    x += w + 4;
  }
}

/** Utility poles along z = zp, and the wire between them. */
function poles(b: Builder, zp: number, y: number) {
  for (let x = -120; x < 124; x += 30) {
    b.mesh('flat:#8a8479', 'cyl', x, y + 4.6, zp, 0.3, 9.2, 0.3);
    b.block(x - 0.16, y, zp - 0.16, x + 0.16, y + 3, zp + 0.16);
  }
  b.deco('flat:#222', -X, y + 8.25, zp - 0.02, X, y + 8.28, zp + 0.02);
}

/** A bus shelter facing the road at z = face (the road on the n side). */
function busShelter(b: Builder, x: number, z: number, n: 1 | -1, y: number, label: string, sub: string, accent: string) {
  const zb = z - n * 1.2;
  for (const px of [x - 4, x + 4]) b.box('flat:#8d949b', px - 0.08, y, zb - 0.08, px + 0.08, y + 2.6, zb + 0.08);
  b.deco('flat:#eef0f2', x - 4.6, y + 2.6, Math.min(z - n * 2, z + n * 0.6), x + 4.6, y + 2.72, Math.max(z - n * 2, z + n * 0.6));
  b.deco(`flat:${accent}`, x - 4.6, y + 2.5, z + n * 0.55, x + 4.6, y + 2.6, z + n * 0.65);
  b.box('flat:#3b4046', x - 2.6, y, zb - n * 0.4, x + 2.6, y + 0.45, zb);
  b.sign({ k: 'label', text: label, sub, fg: '#fff', bg: '#0d3b66' }, x, y + 2.25, z + n * 0.62, [0, n], 4.6, 0.6);
}

/** A double-sided hanging sign across the z axis: `front` faces +z, `back` faces −z. */
function hangZ(b: Builder, front: SignContent, back: SignContent, x: number, y: number, z: number, w: number, h: number, ceil: number) {
  b.with({ rot: 1, t: [x, 0, z] }, () => b.hang(front, 0, y, 0, w, h, { ceil, back }));
}

/** Hills on the horizon (outside the plot). */
function horizon(b: Builder, hills: [number, number, number, number][]) {
  for (const [hx, hz, hw, hh] of hills) b.mesh('leaf', 'sphere', hx, -6, hz, hw, hh * 2, hw * 0.6);
}

// ── Asahino: a gate hall per direction, a free passage between, shops in the arches ─────────

const ASAHINO_SHOPS = [
  { ja: 'やきとり 旭', en: 'Yakitori Asahi', bg: '#7a1f1f', fg: '#fff3d6' },
  { ja: 'パン工房 ひので', en: 'Hinode Bakery', bg: '#f3e2b8', fg: '#6b3a12' },
  { ja: 'あさひ薬局', en: 'Asahi Pharmacy', bg: '#1f6f8b', fg: '#fff' },
  { ja: '喫茶 朝凪', en: 'Kissa Asanagi', bg: '#3a2f28', fg: '#f2d38a' },
  { ja: 'クリーニング 白鳩', en: 'Shirobato Cleaners', bg: '#ffffff', fg: '#1f4e8c' },
  { ja: '旭野書店', en: 'Asahino Books', bg: '#2f4a3a', fg: '#f4efe2' },
];

function buildArcade(c: Ctx, spec: ElevatedSpec) {
  const { b, line, station, railY, style } = c;
  const d = hallDims(line, railY);
  const pf = d.pf, fl = 0.2, deckUnder = railY - 1.3, W = d.wallZ;
  const A = OPEN_AIR.arcade;
  const run = stairRun(pf - fl);
  const cw = 9;
  const nums = station.platforms[line.id];
  const halls = [
    { x0: -34, x1: -6, gateX: -24, sx0: -21, s: -1 as const, front: [-32, -26] as const, platform: nums[0] },
    { x0: 6, x1: 40, gateX: 20, sx0: 24.5, s: 1 as const, front: [8, 18] as const, platform: nums[1] },
  ];

  hall(c, {
    ceil: [{ x0: -HALL_HALF, x1: HALL_HALF, y: pf + 3.3, emit: false }],
    blocks: halls.map((h) => [h.sx0, h.sx0 + run] as [number, number]),
    elevated: true,
    platHoles: halls.map((h) => sideHole(h.s, h.sx0, run, W)),
  });
  piers(b, deckUnder);

  for (const h of halls) {
    const { x0, x1, gateX } = h;
    floorAt(b, style.floor, [x0, -cw, x1, cw], fl);
    // Glazed front onto the plaza (+z), a doorway into the unpaid side.
    glazed(b, 'flat:#dfe2e5', x0, cw - 0.15, h.front[0], cw, fl, deckUnder);
    glazed(b, 'flat:#dfe2e5', h.front[1], cw - 0.15, x1, cw, fl, deckUnder);
    b.deco('flat:#dfe2e5', h.front[0], fl + 3.0, cw - 0.15, h.front[1], deckUnder, cw);
    b.sign({ k: 'entrance', station: station.id }, (h.front[0] + h.front[1]) / 2, fl + 3.7, cw + 0.02, [0, 1], 6, 0.9);
    // Back wall onto the lane (−z), the far end wall, and the near end with a second doorway.
    b.box(style.concWall, x0, fl, -cw, x1, deckUnder, -cw + 0.15);
    b.box(style.concWall, x1, fl, -cw, x1 + 0.15, deckUnder, cw);
    // (Hall A's is mid-wall; hall B's, onto the passage, keeps to the lane side clear of the pier.)
    const [ez0, ez1] = h.s < 0 ? [-3, 3] : [-8, -3];
    b.box(style.concWall, x0 - 0.15, fl, -cw, x0, deckUnder, ez0);
    b.box(style.concWall, x0 - 0.15, fl, ez1, x0, deckUnder, cw);
    b.deco('flat:#dfe2e5', x0 - 0.15, fl + 3.0, ez0, x0, deckUnder, ez1);
    b.sign({ k: 'entrance', station: station.id }, x0 - 0.17, fl + 3.6, (ez0 + ez1) / 2, [-1, 0], ez1 - ez0 - 0.6, 0.9);
    // The hall's own number in the accent colour over the front doorway, inside.
    b.deco(`paint:${style.accent}`, x0, deckUnder - 0.35, cw - 0.3, x1, deckUnder - 0.15, cw - 0.15);
    for (let x = x0 + 2; x + 2.4 < x1; x += 4.5) for (const z of [-5, 0, 5]) ceilingLight(b, x, x + 2.4, z - 0.22, z + 0.22, deckUnder);
    b.with({ ...MIRROR_X, t: [gateX, 0, 0] }, () => gateLine(c, fl, cw, [line.id], deckUnder - fl));
    ticketMachines(c, fl, x0 + 2, -cw + 0.15, gateX - x0 > 12 ? 4 : 3);
    vending(b, x0 + 0.5, fl, 5.2, [1, 0], 'vending');
    vending(b, x0 + 0.5, fl, 6.4, [1, 0], 'vending2');
    b.sign({ k: 'mural', ...style.mural }, x1 - 0.02, fl + 2.3, 0, [-1, 0], 10, 2.6);
    sideStair(c, h.s, h.sx0, fl, pf, W, fl + 3.3);
    const dirEn = h.s > 0 ? 'for Izumigaoka' : 'for Minato-Center';
    b.zone('concourse', x0, 0, -cw, x1, deckUnder, cw, `${h.platform}番線 改札口`, `Platform ${h.platform} gates (${dirEn})`);
    wayfindElevated({
      b, station, line, style, fl, top: deckUnder, cw, x0, x1, gateX,
      stairs: [{ x: h.sx0, z: h.s * (W - 1.3), platform: h.platform, dir: h.s > 0 ? 'up' : 'down' }],
      entrances: [{ x: (h.front[0] + h.front[1]) / 2, z: cw, n: [0, 1], w: h.front[1] - h.front[0] }, { x: x0, z: h.s < 0 ? 0 : -5.5, n: [-1, 0], w: h.s < 0 ? 6 : 5 }],
    });
  }
  b.setSpawn(9, fl, 2, [1, 0]);

  // The free passage under the tracks between the two halls.
  b.sign({ k: 'label', text: '旭野ガード下通路', sub: 'Asahino underpass — public footpath', fg: '#fff', bg: '#3b4652' }, -5.83, 3.4, -4, [1, 0], 4.2, 0.7);
  hangZ(b, { k: 'guide', ja: `${nums[1]}番線 改札口`, en: `Platform ${nums[1]} gates`, bg: 'navy', badges: [line.id], arrow: 'right' },
    { k: 'guide', ja: '駅前広場・バスのりば', en: 'Station plaza / Buses', bg: 'yellow', arrow: 'up' }, -3, 3.4, 7.2, 3.6, 0.46, deckUnder);
  for (const z of [-7, 7]) ceilingLight(b, -4, 4, z - 0.2, z + 0.2, deckUnder);
  for (const x of [-5.4, 5.4]) for (const z of [-8.4, 8.4]) b.box('flat:#d8a400', x - 0.12, GY, z - 0.12, x + 0.12, GY + 0.9, z + 0.12);

  // Shops in the arches, their fronts on the plaza side.
  let k = 0;
  for (const [ax0, ax1] of [[-58, -36], [42, 58]] as const) {
    const n = 3, w = (ax1 - ax0) / n;
    for (let i = 0; i < n; i++) {
      const sx = ax0 + i * w, shop = ASAHINO_SHOPS[k++ % ASAHINO_SHOPS.length];
      b.box(style.concWall, sx + 0.1, GY, -8, sx + w - 0.1, deckUnder - 0.2, 7.2);
      b.deco('glassDark', sx + 0.6, GY + 0.2, 7.2, sx + w - 0.6, GY + 2.6, 7.24);
      b.deco('glow:#fff6e0', sx + 0.6, GY + 2.6, 7.2, sx + w - 0.6, GY + 2.75, 7.26);
      b.deco(`flat:${shop.bg}`, sx + 0.3, GY + 2.9, 7.2, sx + w - 0.3, GY + 3.7, 7.3);
      b.sign({ k: 'shop', ...shop }, sx + w / 2, GY + 3.3, 7.32, [0, 1], w - 1.2, 0.7);
      // Awning.
      b.deco(`flat:${shop.bg}`, sx + 0.4, GY + 2.75, 7.3, sx + w - 0.4, GY + 2.85, 8.4);
    }
  }
  b.sign({ k: 'label', text: 'あさひの高架下商店街', sub: 'Asahino Under-the-Tracks Shops', fg: '#3a2f00', bg: '#fff1c2' }, -36.6, deckUnder - 0.6, 7.6, [0, 1], 5, 0.6);

  // ── Surroundings: the plaza and main road (+z), a lane and houses (−z) ──
  ground(b, A, halls.map((h) => [h.x0, -cw, h.x1, cw] as Rect));
  b.zone('street', -X, -0.3, -Z, X, 80, Z, `${station.nameJa}駅前`, `${station.nameRomaji} — station plaza`);
  plotWalls(b);
  const [bx, bz] = A.bus;
  busShelter(b, bx, bz, 1, GY, 'バスのりば', 'Bus — Asahino Danchi / Hibarino', line.color);
  const [tx, tz] = A.taxi!;
  b.box('flat:#8d949b', tx - 0.06, GY, tz, tx + 0.06, GY + 2.1, tz + 0.12);
  b.sign({ k: 'label', text: 'タクシーのりば', sub: 'Taxi', fg: '#111', bg: '#ffd100' }, tx, GY + 2.4, tz + 0.13, [0, 1], 2.6, 0.6);
  car(b, tx - 4, 24.5, '#1d4d2b', true, true);
  car(b, tx + 2, 24.5, '#1d4d2b', true, true);
  // A sunrise clock on a post in the plaza, the station's landmark.
  b.mesh('metal:#6f7880', 'cyl', -2, GY + 1.9, 15, 0.16, 3.8, 0.16);
  b.mesh(`paint:${style.accent}`, 'cyl', -2, GY + 4.0, 15, 1.1, 1.1, 0.12);
  b.mesh('glow:#fff8e1', 'cyl', -2, GY + 4.0, 15.07, 0.9, 0.9, 0.04);
  for (const x of [-30, -18, 24, 34]) tree(b, x, 16, 5.5, 'leaf2');
  for (const x of [-12, 4, 30]) b.box('wood:#8a6a48', x - 1.2, GY, 18.6, x + 1.2, GY + 0.45, 19.1);
  const r = seeded(spec.surface.seed);
  blocks(b, r, -126, 124, 34, 52, GY, ['facade:apt:#e4dfd3', 'facade:apt:#d5cbb8', 'facade:apt:#f1ebdc'], [3, 7]);
  for (const [z0, z1] of [[-17, -9.5], [-36, -25.5], [-50, -39], [-64, -53]] as const) houses(b, r, z0, z1, GY, (x) => z0 === -17 && x > -36 && x < 36);
  for (let x = -120; x < 124; x += 17) tree(b, x, -21, 4.5, 'leaf');
  poles(b, 31.5, GY);
  // Bicycles parked along the lane side of the passage and the halls.
  for (let x = -5; x < 5; x += 0.8) {
    b.deco('flat:#3a3f45', x, GY + 0.3, -16.4, x + 0.06, GY + 0.95, -14.8);
    b.deco(`flat:${['#3a3f45', '#9c1f1f', '#1f4e8c', '#c9c2a8'][Math.abs(Math.round(x * 5)) % 4]}`, x - 0.03, GY + 0.6, -16.1, x + 0.09, GY + 0.72, -15.3);
  }
  horizon(b, [[-90, -150, 220, 46], [40, -170, 260, 62], [150, -140, 200, 40], [-40, 175, 240, 50]]);
}

// ── Takanodai: the viaduct meets the ridge ───────────────────────────────────────────────────

function buildHillside(c: Ctx, spec: ElevatedSpec) {
  const { b, line, station, railY, style } = c;
  const d = hallDims(line, railY);
  const pf = d.pf, fl = 0.2, deckUnder = railY - 1.3, W = d.wallZ;
  const H = OPEN_AIR.hillside;
  const run = stairRun(pf - fl);
  // Station building on the ridge, level with the platforms. Its gates face the estate (−z).
  const [bx0, rz, bx1] = H.box; // rz: the building's front on the ridge
  const gz = -15.5;
  // Underpass corridor (x = 3 … 7) from under the building to the valley hall; stair D down
  // into it from the building, stair U up from it to platform 2.
  const cx0 = 3, cx1 = 7, ux0 = cx1, ux1 = ux0 + run;
  const dz0 = -13.3, dz1 = -11.0;
  const vx0 = -4, vx1 = 14, vz0 = 9.4, vz1 = H.box[3], vgz = 13.5;
  const cut: Rect = [-44, -21.3, -40, -W]; // public stair down the ridge, west of the station
  const holeD: Rect = [ux0, dz0, ux1, dz1];
  const nums = station.platforms[line.id];

  hall(c, {
    ceil: [{ x0: -HALL_HALF, x1: HALL_HALF, y: pf + 3.3, emit: false }],
    blocks: [[ux0, ux1], [-7, 5]],
    elevated: true,
    platHoles: [sideHole(1, ux0, run, W)],
    gaps: [{ s: -1, x0: -6, x1: 4 }],
  });
  piers(b, deckUnder);

  // ── The ridge: solid up to platform level everywhere −z of the viaduct, except the hollows ──
  const body = (x0: number, z0: number, x1: number, z1: number) => b.box('concreteDark', x0, 0, z0, x1, pf - 0.6, z1);
  body(-X, -Z, cut[0], -W);
  body(cut[0], -Z, cut[2], cut[1]);
  body(cut[2], -Z, cx0, -W);
  body(cx0, -Z, ux1, -13.5);
  body(cx1, -10.8, ux1, -W);
  body(ux1, -Z, X, -W);
  b.slab('paver', -X, -Z, X, -W, pf - 0.6, pf, [cut, [bx0, rz, bx1, -W]]);
  // Its face under the viaduct, board-marked, with the line colour along its top.
  b.deco('concrete', -X, 0, -W - 0.02, X, pf - 0.6, -W);
  b.deco(`paint:${line.color}`, -X, pf - 0.9, -W + 0.001, X, pf - 0.7, -W + 0.02);
  // A fence along the ridge edge past the platform ends, where the track bed is below.
  for (const [xa, xb] of [[-X, -56.5], [56.5, X]]) {
    b.block(xa, pf, -W - 0.25, xb, pf + 1.4, -W - 0.05);
    b.deco('metal:#6f7880', xa, pf + 1.3, -W - 0.22, xb, pf + 1.4, -W - 0.08);
    for (let x = xa; x < xb; x += 2.5) b.deco('metal:#6f7880', x, pf, -W - 0.2, x + 0.06, pf + 1.4, -W - 0.1);
    b.deco('flat:#9aa4ab', xa, pf + 0.1, -W - 0.17, xb, pf + 1.25, -W - 0.13);
  }
  // Public stair down the ridge face, between the estate road and the valley.
  b.with({ rot: 3, t: [(cut[0] + cut[2]) / 2, 0, -W] }, () => stairs(b, { x0: 0, x1: stairRun(pf - GY), z0: -2, z1: 2, yLow: GY, yHigh: pf }));
  rail(b, cut[0] - 0.1, cut[1], cut[0], -W, pf);
  rail(b, cut[2], cut[1], cut[2] + 0.1, -W, pf);
  b.sign({ k: 'label', text: '高野台の坂段', sub: 'Takanodai Steps — to the valley', fg: '#fff', bg: '#3b4652' }, (cut[0] + cut[2]) / 2, pf + 2.0, cut[1] - 0.6, [0, -1], 3.6, 0.6);
  b.box('metal:#6f7880', (cut[0] + cut[2]) / 2 - 0.05, pf, cut[1] - 0.66, (cut[0] + cut[2]) / 2 + 0.05, pf + 1.7, cut[1] - 0.56);

  // ── Station building on the ridge ──
  const roofY = pf + 3.6;
  b.slab(style.floor, bx0, rz, bx1, -W, pf - 0.6, pf, [holeD]);
  const front: [number, number] = [H.exits[0].rect[0], H.exits[0].rect[2]];
  glazed(b, style.concWall, bx0, rz - 0.2, front[0], rz, pf, roofY);
  glazed(b, style.concWall, front[1], rz - 0.2, bx1, rz, pf, roofY);
  b.box(style.concWall, front[0], pf + 2.8, rz - 0.2, front[1], roofY, rz);
  b.sign({ k: 'entrance', station: station.id }, (front[0] + front[1]) / 2, pf + 3.2, rz - 0.22, [0, -1], 7, 0.7);
  b.box(style.concWall, bx0 - 0.2, pf, rz, bx0, roofY, -W);
  b.box(style.concWall, bx1, pf, rz, bx1 + 0.2, roofY, -W);
  // Roof: a deep flat eave over the front, in the accent colour underneath.
  b.box('flat:#e2e5e8', bx0 - 0.4, roofY, rz - 3, bx1 + 0.4, roofY + 0.35, -W);
  b.deco(`paint:${style.accent}`, bx0 - 0.4, roofY - 0.02, rz - 3, bx1 + 0.4, roofY, rz);
  for (const x of [front[0] - 0.3, front[1] + 0.1]) b.box(`paint:${style.accent}`, x, pf, rz - 2.9, x + 0.2, roofY, rz - 2.7);
  for (let x = bx0 + 1.5; x + 2.4 < bx1; x += 4.5) for (const z of [rz + 2, -18.5, -12, -10]) ceilingLight(b, x, x + 2.4, z - 0.2, z + 0.2, roofY);
  // Gates over the west half (office at the west wall), a glazed fence across the rest.
  const gHalf = 10, gx = bx0 + gHalf;
  b.with({ rot: 3, mz: true, t: [gx, 0, gz] }, () => gateLine(c, pf, gHalf, [line.id], roofY - pf));
  b.box('metal:#c4c8cc', gx + gHalf, pf, gz - 0.05, bx1, pf + 1.15, gz + 0.05);
  b.deco('glass', gx + gHalf, pf + 1.15, gz - 0.02, bx1, pf + 1.9, gz + 0.02);
  ticketMachines(c, pf, bx1 - 6.5, rz + 0.15, 4);
  vending(b, bx1 - 0.5, pf, -17.5, [-1, 0], 'vending');
  b.sign({ k: 'mural', ...style.mural }, bx0 + 0.02, pf + 1.9, (rz + gz) / 2, [1, 0], 5.6, 2.4);
  b.sign({ k: 'stationmap', station: station.id }, front[1] + 1.4, pf + 1.5, rz + 0.02, [0, 1], 2.2, 1.5);
  b.sign({ k: 'areamap', station: station.id }, front[0] - 1.4, pf + 1.5, rz + 0.02, [0, 1], 2.2, 1.5);
  b.sign({ k: 'exits', station: station.id }, front[0] - 4.2, pf + 1.5, rz + 0.02, [0, 1], 2.0, 1.3);
  // Rails round stair D's opening (open at its top, +x).
  rail(b, ux0, dz0 - 0.08, ux1 - 1.4, dz0, pf);
  rail(b, ux0, dz1, ux1 - 1.4, dz1 + 0.08, pf);
  rail(b, ux0 - 0.08, dz0 - 0.08, ux0, dz1 + 0.08, pf);
  // Signs inside the gates: platform 1 straight ahead through the doorway, platform 2 down the stair.
  const exitSign: SignContent = { k: 'guide', ja: '出口・改札', en: 'Exit / Ticket gates', bg: 'yellow', arrow: 'up' };
  hangZ(b, exitSign, { k: 'guide', ja: `${nums[0]}番線 のりば`, en: `Platform ${nums[0]}`, bg: 'navy', badges: [line.id], arrow: 'up' }, -1, pf + 2.6, -11, 3.2, 0.46, roofY);
  hangZ(b, exitSign, { k: 'guide', ja: `${nums[1]}番線 のりば（地下道）`, en: `Platform ${nums[1]} (via underpass)`, bg: 'navy', badges: [line.id], arrow: 'left' }, 14, pf + 2.6, -14.3, 3.8, 0.46, roofY);
  b.hang({ k: 'guide', ja: `${nums[1]}番線 のりば（地下道）`, en: `Platform ${nums[1]} (via underpass)`, bg: 'navy', badges: [line.id], arrow: 'down' }, ux1 + 1.4, pf + 2.6, (dz0 + dz1) / 2, 3.6, 0.46,
    { ceil: roofY, back: { k: 'guide', ja: '出口・改札', en: 'Exit / Ticket gates', bg: 'yellow', arrow: 'up' } });
  b.sign({ k: 'dir', station: station.id, line: line.id, dir: 'down', arrow: 'up' }, -1, pf + 2.9, -W - 0.25, [0, -1], 4, 0.5);
  b.hang({ k: 'guide', ja: '出口・改札', en: 'Exit / Ticket gates', bg: 'yellow', arrow: 'right' }, -1, pf + 2.6, -5.4, 3.2, 0.42, { ceil: pf + 3.3, back: { k: 'guide', ja: '出口・改札', en: 'Exit / Ticket gates', bg: 'yellow', arrow: 'left' } });
  b.zone('concourse', bx0, pf - 0.3, rz, bx1, roofY, -W, '尾根口 駅舎', 'Station building (ridge entrance)');
  b.setSpawn((front[0] + front[1]) / 2, pf, rz + 2.5, [0, 1]);

  // ── Stair D and the underpass ──
  stairs(b, { x0: ux0, x1: ux1, z0: dz0, z1: dz1, yLow: fl, yHigh: pf });
  const corridor: Rect = [cx0, -13.5, cx1, vz0];
  floorAt(b, style.floor, corridor, fl);
  const cTop = 3.4;
  b.deco('ceil', cx0, cTop, -13.5, cx1, cTop + 0.15, vz0);
  for (let z = -12.5; z + 2.4 < vz0; z += 4) ceilingLight(b, (cx0 + cx1) / 2 - 0.2, (cx0 + cx1) / 2 + 0.2, z, z + 2.4, cTop);
  // Walls under the viaduct (under the ridge, the ridge itself walls it in).
  b.box(style.wall, cx0 - 0.15, fl, -W, cx0, cTop, vz0);
  b.box(style.wall, cx1, fl, -W, cx1 + 0.15, cTop, 5.9);
  b.box(style.wall, cx1, fl, 8.6, cx1 + 0.15, cTop, vz0);
  b.deco(`paint:${style.accent}`, cx0, fl + 1.0, -13.5, cx0 + 0.02, fl + 1.12, vz0);
  b.sign({ k: 'mural', ...style.mural }, cx0 + 0.02, fl + 1.7, -2, [1, 0], 7, 1.6);
  // Stair U's well, up through the deck to platform 2.
  b.box(style.wall, ux0, 0, 5.75, ux1, deckUnder, 5.9);
  b.box(style.wall, ux0, 0, 8.6, ux1, deckUnder, 8.75);
  b.box(style.wall, ux1, 0, 5.75, ux1 + 0.15, deckUnder, 8.75);
  sideStair(c, 1, ux0, fl, pf, W, fl + 2.8);
  b.zone('passage', cx0, 0, -13.5, cx1, cTop, vz0, '地下道', 'Underpass');

  // ── Valley hall ──
  const vroof = fl + 3.6;
  floorAt(b, style.floor, [vx0, vz0, vx1, vz1], fl);
  b.box(style.concWall, vx0 - 0.15, fl, vz0, vx0, vroof, vz1);
  b.box(style.concWall, vx1, fl, vz0, vx1 + 0.15, vroof, vz1);
  b.box(style.concWall, vx0, fl, vz0 - 0.15, cx0 - 0.15, vroof, vz0);
  b.box(style.concWall, cx1 + 0.15, fl, vz0 - 0.15, vx1, vroof, vz0);
  const vdoor: [number, number] = [H.exits[1].rect[0], H.exits[1].rect[2]];
  glazed(b, 'flat:#dfe2e5', vx0, vz1, vdoor[0], vz1 + 0.15, fl, vroof);
  glazed(b, 'flat:#dfe2e5', vdoor[1], vz1, vx1, vz1 + 0.15, fl, vroof);
  b.box('flat:#dfe2e5', vdoor[0], fl + 2.8, vz1, vdoor[1], vroof, vz1 + 0.15);
  b.box('flat:#e2e5e8', vx0 - 0.4, vroof, vz0 - 0.2, vx1 + 0.4, vroof + 0.3, vz1 + 2);
  b.deco(`paint:${style.accent}`, vx0 - 0.4, vroof - 0.02, vz1 + 0.15, vx1 + 0.4, vroof, vz1 + 2);
  b.sign({ k: 'entrance', station: station.id }, (vdoor[0] + vdoor[1]) / 2, fl + 3.2, vz1 + 0.17, [0, 1], 6, 0.7);
  for (let x = vx0 + 1; x + 2.4 < vx1; x += 4) for (const z of [11, 17.5]) ceilingLight(b, x, x + 2.4, z - 0.2, z + 0.2, vroof);
  b.with({ rot: 1, t: [(vx0 + vx1) / 2, 0, vgz] }, () => gateLine(c, fl, (vx1 - vx0) / 2, [line.id], vroof - fl));
  const valleyExit: SignContent = { k: 'guide', ja: '谷戸口', en: 'Valley exit', bg: 'yellow', arrow: 'up' };
  hangZ(b, { k: 'guide', ja: `のりば ${nums.join('・')}番線`, en: `Platforms ${nums.join(' & ')}`, bg: 'navy', badges: [line.id], arrow: 'up' }, valleyExit, 5, fl + 2.6, 16.5, 3.4, 0.46, vroof);
  hangZ(b, { k: 'guide', ja: `${nums[1]}番線・尾根口`, en: `Platform ${nums[1]} / Ridge exit`, bg: 'navy', badges: [line.id], arrow: 'up' }, valleyExit, 5, fl + 2.5, 10.6, 4.2, 0.46, vroof);
  b.zone('concourse', vx0, 0, vz0, vx1, vroof, vz1, '谷戸口', 'Valley entrance');

  // ── The valley (+z) ──
  const vRoads = H.areas.filter((a) => a.fill === 'road' && a.r[1] > 0).map((a) => a.r as Rect);
  b.slab('asphalt', -X, -W, X, Z, -0.6, 0, []);
  b.slab('paver', -X, -W, X, Z, 0, GY, [...vRoads, [vx0, vz0, vx1, vz1], corridor]);
  for (const r of vRoads) for (let x = -X; x < X; x += 6) b.deco('flat:#e9e9e4', x, 0.004, (r[1] + r[3]) / 2 - 0.07, x + 3, 0.01, (r[1] + r[3]) / 2 + 0.07);
  b.zone('street', -X, -0.3, -Z, X, 80, Z, `${station.nameJa}駅前`, `${station.nameRomaji} — ridge and valley`);
  plotWalls(b);
  const r = seeded(spec.surface.seed);
  houses(b, r, 36, 46, GY);
  houses(b, r, 50, 60, GY + 0.6);
  houses(b, r, 64, 74, GY + 1.4);
  for (const [z0, z1, h] of [[50, 60, 0.6], [64, 74, 1.4]] as const) b.box('flat:#8f8a80', -126, GY, z0 - 1.4, 124, GY + h, z1);
  for (let x = -110; x < 124; x += 19) tree(b, x, 22 + (Math.abs(x) % 3), 4.6, 'leaf');
  poles(b, 33.2, GY);
  // Bicycles under the viaduct by the valley hall.
  for (let x = -26; x < -6; x += 0.8) {
    b.deco('flat:#3a3f45', x, GY + 0.3, 6.4, x + 0.06, GY + 0.95, 8);
    b.deco(`flat:${['#3a3f45', '#9c1f1f', '#1f4e8c', '#c9c2a8'][Math.abs(Math.round(x * 5)) % 4]}`, x - 0.03, GY + 0.6, 6.7, x + 0.09, GY + 0.72, 7.5);
  }

  // ── The ridge (−z), level with the platforms ──
  b.deco('asphalt', -X, pf, -32, X, pf + 0.01, -26);
  for (let x = -X; x < X; x += 6) b.deco('flat:#e9e9e4', x, pf + 0.012, -29.07, x + 3, pf + 0.016, -28.93);
  const [bsx, bsz] = H.bus;
  busShelter(b, bsx, bsz + 3.2, -1, pf, 'バスのりば', 'Bus — Takanodai Estate loop', line.color);
  blocks(b, r, -126, 124, -60, -40, pf, ['facade:apt:#e2e5e8', 'facade:apt:#d6dadd', 'facade:apt:#e8e4dc'], [4, 9]);
  blocks(b, r, -126, 124, -80, -66, pf, ['facade:apt:#e2e5e8', 'facade:apt:#d6dadd'], [5, 11]);
  for (let x = -120; x < 124; x += 15) if (x < -48 || x > 30) tree(b, x, -23.5, 5.5, 'leaf');
  for (const x of [-30, -18, 32, 40]) b.mesh('leaf2', 'sphere', x, pf + 0.6, -14, 3, 1.4, 3);
  poles(b, -33.5, pf);
  horizon(b, [[-60, -190, 260, 60], [120, -180, 220, 50], [-40, 180, 280, 90], [140, 170, 200, 70]]);
}

// ── Izumigaoka: temporary terminus, concourse bridging the tracks ───────────────────────────

function buildRailhead(c: Ctx, spec: ElevatedSpec) {
  const { b, line, station, railY, style } = c;
  const d = hallDims(line, railY);
  const pf = d.pf, deckUnder = railY - 1.3, W = d.wallZ, pe = d.pe;
  const R = OPEN_AIR.railhead;
  const [cx0, , cx1, cz] = R.box;
  const CF = pf + 4.0, roofY = CF + 3.4, gateX = 60;
  const run = stairRun(CF - pf), sx0 = cx0 - run;
  const nums = station.platforms[line.id];
  const P = 58;

  hall(c, {
    ceil: [{ x0: -HALL_HALF, x1: HALL_HALF, y: pf + 3.3, emit: false }],
    blocks: [[sx0, cx0 + 4]],
    elevated: true,
    roof: false,
  });
  piers(b, deckUnder);

  // Canopies stop short of the stairs up to the concourse; past them, the concourse is the roof.
  for (const s of [-1, 1]) {
    const c0 = s * (pe - 0.7), c1 = s * (W + 0.7), lo = Math.min(c0, c1), hi = Math.max(c0, c1);
    b.deco('flat:#eef0f2', -P - 1, pf + 3.3, lo, sx0 - 0.6, pf + 3.45, hi);
    b.deco(`flat:${line.color}`, -P - 1, pf + 3.1, c0 - 0.04, sx0 - 0.6, pf + 3.3, c0 + 0.04);
    for (let x = -P + 2; x + 3 <= sx0 - 1; x += 5) ceilingLight(b, x, x + 3, s * (W - 1.3) - 0.1, s * (W - 1.3) + 0.1, pf + 3.3);
    // Under the concourse: lights on its soffit.
    for (let x = cx0 + 0.5; x + 2 <= P; x += 2.5) ceilingLight(b, x, x + 2, s * (W - 1.3) - 0.1, s * (W - 1.3) + 0.1, CF - 0.5);
  }
  // Stairs up from each platform's +x end into the concourse.
  for (const s of [1, -1] as const) {
    b.with({ mz: s < 0 }, () => {
      stairs(b, { x0: sx0, x1: cx0, z0: W - 2.5, z1: W - 0.1, yLow: pf, yHigh: CF });
      b.sign({ k: 'dir', station: station.id, line: line.id, dir: s > 0 ? 'up' : 'down', arrow: 'down' }, cx0 + 0.6, CF + 2.75, W - 1.3, [1, 0], 3.2, 0.46);
    });
    b.hang({ k: 'guide', ja: '出口・改札', en: 'Exit / Ticket gates', bg: 'yellow', arrow: 'up' }, sx0 - 2, pf + 2.6, s * (W - 1.3), 2.4, 0.42, { ceil: pf + 3.3 });
  }
  // Where the line will carry on: a notice on each platform's end barrier.
  for (const s of [-1, 1]) {
    b.hang({ k: 'label', text: 'この先 延伸予定区間', sub: 'Nagisa Line extension — planned beyond this point', fg: '#fff', bg: '#1f8f9a' }, P - 1.2, pf + 2.75, s * (pe + W) / 2, 3.2, 0.5, { ceil: CF - 0.5 });
  }

  // ── The concourse over the tracks ──
  b.slab(style.floor, cx0, -cz, cx1, cz, CF - 0.5, CF, []);
  b.deco('concrete', cx0, CF - 0.5, -cz, cx1, CF - 0.48, cz);
  // Platform-side wall: glazed, looking down the platforms, open at the two stair heads.
  const sz0 = W - 2.6, sz1 = W + 0.1;
  for (const [za, zb] of [[-cz, -sz1], [-sz0, sz0], [sz1, cz]]) glazed(b, 'flat:#dfe2e5', cx0 - 0.15, za, cx0, zb, CF, roofY);
  for (const s of [-1, 1]) b.box('flat:#dfe2e5', cx0 - 0.15, CF + 2.5, Math.min(s * sz0, s * sz1), cx0, roofY, Math.max(s * sz0, s * sz1));
  // End wall (+x), where the extension will break through one day.
  b.box(style.concWall, cx1, CF, -cz, cx1 + 0.2, roofY, cz);
  // Side walls with doorways onto the decks.
  const door: [number, number] = [R.exits[0].rect[0], R.exits[0].rect[2]];
  for (const s of [-1, 1] as const) {
    const za = s * cz, zb = s * (cz + 0.2), lo = Math.min(za, zb), hi = Math.max(za, zb);
    glazed(b, style.concWall, cx0, lo, door[0], hi, CF, roofY);
    glazed(b, style.concWall, door[1], lo, cx1, hi, CF, roofY);
    b.box(style.concWall, door[0], CF + 2.6, lo, door[1], roofY, hi);
    b.sign({ k: 'entrance', station: station.id }, (door[0] + door[1]) / 2, CF + 3.0, s * (cz + 0.22), [0, s], 5.4, 0.7);
  }
  // Roof: a shallow aqua-trimmed box with a long rooflight down the middle.
  b.box('flat:#e3eff0', cx0 - 0.6, roofY, -cz - 0.6, cx1 + 0.6, roofY + 0.4, cz + 0.6);
  b.deco(`paint:${style.accent}`, cx0 - 0.62, roofY + 0.1, -cz - 0.62, cx1 + 0.62, roofY + 0.3, cz + 0.62);
  b.deco('glass', cx0 + 2, roofY + 0.4, -2, cx1 - 2, roofY + 0.5, 2);
  for (let x = cx0 + 1; x + 2.4 < cx1; x += 3.5) for (const z of [-9, -4.5, 4.5, 9]) ceilingLight(b, x, x + 2.4, z - 0.2, z + 0.2, roofY);
  // Columns down to the ground, clear of the tracks.
  for (const x of [cx0 + 1, cx1 - 1]) for (const s of [-1, 1]) {
    b.box('concrete', x - 0.5, 0, s * 12.4 - 0.5, x + 0.5, CF - 0.5, s * 12.4 + 0.5);
  }
  b.with({ t: [gateX, 0, 0] }, () => gateLine(c, CF, cz, [line.id], roofY - CF));
  b.with({ rot: 1, t: [cx1, 0, 0] }, () => ticketMachines(c, CF, -12.5, 0.2, 4));
  b.sign({ k: 'mural', ...style.mural }, cx1 - 0.02, CF + 1.9, 6, [-1, 0], 9, 2.4);
  b.sign({ k: 'label', text: '渚線 延伸計画', sub: 'Nagisa Line extension: planned through this wall, onward to the eastern hills', fg: '#fff', bg: '#1f8f9a' }, cx1 - 0.03, CF + 2.75, -3.3, [-1, 0], 4.2, 0.7);
  b.sign({ k: 'stationmap', station: station.id }, cx1 - 1, CF + 1.5, -cz + 0.02, [0, 1], 1.8, 1.3);
  b.sign({ k: 'areamap', station: station.id }, cx1 - 1, CF + 1.5, cz - 0.02, [0, -1], 1.8, 1.3);
  b.sign({ k: 'exits', station: station.id }, cx1 - 0.03, CF + 1.4, 0.4, [-1, 0], 2.0, 1.3);
  vending(b, cx1 - 0.5, CF, -5, [-1, 0], 'vending');
  // Wayfinding: platforms behind the gates, the two decks in front.
  b.hang({ k: 'guide', ja: `のりば ${nums.join('・')}番線`, en: `Platforms ${nums.join(' & ')}`, bg: 'navy', badges: [line.id], arrow: 'up' }, gateX - 3, CF + 2.6, 0, 3.4, 0.46,
    { ceil: roofY, back: { k: 'guide', ja: '出口', en: 'Exit', bg: 'yellow', arrow: 'up' } });
  const toTrains: SignContent = { k: 'guide', ja: 'のりば', en: 'To trains', bg: 'navy', badges: [line.id], arrow: 'up' };
  b.hang(toTrains, 64, CF + 2.6, 4, 4.2, 0.44, { ceil: roofY, back: { k: 'guide', ja: 'バスターミナル・泉ヶ丘公園', en: 'Bus terminal / Izumigaoka Park', bg: 'yellow', arrow: 'right' } });
  b.hang(toTrains, 64, CF + 2.6, -4, 3.2, 0.44, { ceil: roofY, back: { k: 'guide', ja: '泉ヶ丘団地', en: 'Izumigaoka Estate', bg: 'yellow', arrow: 'left' } });
  b.zone('concourse', cx0, CF - 0.3, -cz, cx1, roofY, cz, '橋上コンコース', 'Concourse (over the tracks)');
  b.setSpawn(66, CF, 9, [0, -1]);

  // ── Decks either side, each stepping down to the ground in two flights ──
  const deckEnd = 22, Ym = (CF + GY) / 2, fRun = stairRun(CF - Ym), land = deckEnd + fRun;
  const [dx0, dx1] = door, dm = (dx0 + dx1) / 2;
  for (const s of [1, -1] as const) {
    b.with({ mz: s < 0 }, () => {
      b.box('concrete', dx0, CF - 0.7, cz + 0.2, dx1, CF - 0.04, deckEnd);
      b.box(style.floor, dx0, CF - 0.04, cz + 0.2, dx1, CF, deckEnd);
      rail(b, dx0 - 0.1, cz + 0.2, dx0, deckEnd, CF);
      rail(b, dx1, cz + 0.2, dx1 + 0.1, deckEnd, CF);
      rail(b, dx1 - 3, deckEnd - 0.1, dx1, deckEnd, CF);
      // Flight A down (+z) on the west half, landing, flight B back down (−z) on the east half.
      b.with({ rot: 3, t: [dx0 + 1.5, 0, land] }, () => stairs(b, { x0: 0, x1: fRun, z0: -1.5, z1: 1.5, yLow: Ym, yHigh: CF }));
      b.box('concrete', dx0, Ym - 0.5, land, dx1, Ym - 0.04, land + 3);
      b.box(style.floor, dx0, Ym - 0.04, land, dx1, Ym, land + 3);
      rail(b, dx0 - 0.1, land, dx0, land + 3.1, Ym);
      rail(b, dx1, land, dx1 + 0.1, land + 3.1, Ym);
      rail(b, dx0, land + 3, dx1, land + 3.1, Ym);
      b.with({ rot: 1, t: [dx1 - 1.5, 0, deckEnd] }, () => stairs(b, { x0: 0, x1: fRun, z0: -1.5, z1: 1.5, yLow: GY, yHigh: Ym }));
      for (const x of [dx0 + 0.3, dx1 - 0.3]) b.box(`paint:${style.accent}`, x - 0.25, 0, land + 2.5, x + 0.25, Ym - 0.5, land + 3);
      // Glass roof over the deck on aqua posts.
      for (let z = cz + 1; z < deckEnd; z += 3.5) for (const x of [dx0 + 0.05, dx1 - 0.2]) b.box(`paint:${style.accent}`, x, CF, z - 0.08, x + 0.15, CF + 2.8, z + 0.08);
      b.deco('glass', dx0 - 0.3, CF + 2.8, cz + 0.2, dx1 + 0.3, CF + 2.9, deckEnd);
      // A lift tower beside the stairs.
      b.box('flat:#e3eff0', dx1 + 0.6, 0, deckEnd - 3.2, dx1 + 3.2, CF + 3.2, deckEnd - 0.4);
      b.deco('glass', dx1 + 0.58, 0.4, deckEnd - 3, dx1 + 0.6, CF + 3, deckEnd - 0.6);
      b.deco(`paint:${style.accent}`, dx1 + 0.55, CF + 2.9, deckEnd - 3.25, dx1 + 3.25, CF + 3.2, deckEnd - 0.35);
    });
    b.zone('street', dx0, Ym - 0.3, s > 0 ? cz : -land - 3, dx1, CF + 3, s > 0 ? land + 3 : -cz, 'ペデストリアンデッキ', s > 0 ? 'Pedestrian deck (bus terminal side)' : 'Pedestrian deck (estate side)');
  }
  b.sign({ k: 'label', text: '泉ヶ丘デッキ', sub: 'Izumigaoka Deck', fg: '#fff', bg: '#1f8f9a' }, dm, CF + 2.4, deckEnd - 0.05, [0, -1], 4.6, 0.6);

  // ── The new town ──
  ground(b, R, []);
  b.zone('street', -X, -0.3, -Z, X, 80, Z, `${station.nameJa}駅前`, `${station.nameRomaji} — new-town plaza`);
  plotWalls(b);
  // Bus terminal: three shelters along the road.
  const dests = ['Izumigaoka Loop', 'Spring Hill Estate', 'Hibarino / Daigaku-mae'];
  [24, 44, 104].forEach((x, i) => {
    busShelter(b, x, 34.8, -1, GY, `${i + 1}番のりば`, `Stop ${i + 1} — ${dests[i]}`, style.accent);
    b.box('flat:#f4f2ee', x - 5.5, GY, 37.5, x + 5.5, GY + 3.0, 40);
    b.deco('glassDark', x - 5.2, GY + 1.3, 37.48, x + 5.2, GY + 2.5, 40.02);
    b.deco(`flat:${style.accent}`, x - 5.5, GY + 0.7, 37.47, x + 5.5, GY + 1.0, 40.03);
  });
  const [tx, tz] = R.taxi!;
  car(b, tx - 3, tz + 1.5, '#1d4d2b', true, true);
  car(b, tx + 3, tz + 1.5, '#1d4d2b', true, true);
  b.box('flat:#8d949b', tx - 0.06, GY, 34.6, tx + 0.06, GY + 2.1, 34.72);
  b.sign({ k: 'label', text: 'タクシーのりば', sub: 'Taxi', fg: '#111', bg: '#ffd100' }, tx, GY + 2.4, 34.58, [0, -1], 2.6, 0.6);
  // The park, round its spring.
  const park = R.areas.find((a) => a.fill === 'green')!.r;
  b.box('grass', park[0], GY, park[1], park[2], GY + 0.05, park[3]);
  for (let x = park[0] + 5; x < park[2]; x += 10) for (let z = park[1] + 6; z < park[3]; z += 9) if (Math.hypot(x - 40, z - 64) > 10) tree(b, x + ((z * 3) % 4), z, 6, (x + z) % 2 ? 'leaf' : 'leaf2');
  b.mesh('water', 'cyl', 40, GY + 0.06, 64, 14, 0.1, 10);
  b.mesh('flat:#9aa3a8', 'cyl', 40, GY + 0.03, 64, 15, 0.08, 11);
  b.sign({ k: 'label', text: '泉ヶ丘公園', sub: 'Izumigaoka Park — the spring', fg: '#fff', bg: '#2f6b45' }, park[0] + 6, GY + 2.2, park[1] - 0.6, [0, -1], 4.4, 0.7);
  b.box('metal:#6f7880', park[0] + 5.95, GY, park[1] - 0.66, park[0] + 6.05, GY + 1.9, park[1] - 0.56);
  // Izumigaoka Centre: the new town's shops and offices.
  const [mx0, mz0, mx1, mz1] = R.areas.find((a) => a.fill === 'shop')!.r;
  b.box('flat:#e8eeee', mx0, GY, mz0, mx1, GY + 14, mz1);
  for (const y of [GY + 0.4, GY + 5, GY + 9.4]) b.deco('glassDark', mx0 + 1, y, mz0 - 0.03, mx1 - 1, y + 3, mz0);
  b.deco(`paint:${style.accent}`, mx0, GY + 13.2, mz0 - 0.05, mx1, GY + 14, mz0);
  b.sign({ k: 'shop', ja: '泉ヶ丘センター', en: 'Izumigaoka Centre', bg: '#1f8f9a', fg: '#fff' }, (mx0 + mx1) / 2, GY + 11.4, mz0 - 0.06, [0, -1], 20, 1.5);
  // The estate (−z): long slab blocks on the slope.
  const r = seeded(spec.surface.seed);
  blocks(b, r, -126, 124, -66, -48, GY, ['facade:apt:#e3eff0', 'facade:apt:#dde6e6', 'facade:apt:#e8e4dc'], [5, 11]);
  blocks(b, r, -126, 124, -82, -70, GY + 1, ['facade:apt:#e3eff0', 'facade:apt:#dde6e6'], [6, 12]);
  for (let x = -120; x < 124; x += 14) tree(b, x, -30, 5, 'leaf');
  for (let x = -120; x < 0; x += 14) tree(b, x, 22, 5, 'leaf2');
  poles(b, -36.5, GY);
  horizon(b, [[-120, -170, 240, 50], [80, -180, 260, 64], [-80, 175, 220, 46], [160, 175, 240, 58]]);
}
