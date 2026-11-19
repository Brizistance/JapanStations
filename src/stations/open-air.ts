// Open-air layouts of the Akanesuji Line's 2008 extension, each one a station of its own.
// (The Nagisa Line's viaduct stations are build.ts buildElevated.)
//
// Kasumidani (cutting): the line leaves the ridge tunnel into an open cutting. An island under a
//   sawtooth canopy, and a glazed station building bridging the cutting at street level, with
//   the stair down to the island from inside the gates and a free passage from one side of
//   the valley to the other.
// Shiondai (terminus): an island on the viaduct under one barrel vault. The concourse is under
//   the platform's far end, its stair climbing back onto the island; a broad stair at the front
//   door rises to a pedestrian deck over the bus terminal to the shopping centre.

import { HALL_HALF } from '../sim/geometry';
import type { Builder } from '../world/builder';
import { GROUND_Y, ceilingLight, gateLine, hall, hallDims, rail, stairs, ticketMachines, vending, type Ctx } from './kit';
import { MIRROR_X, islandUnit, type Rect } from './build';
import type { ElevatedSpec } from './specs';
import { OPEN_AIR } from './exits';
import { car, tree, PLOT_X, PLOT_Z } from './surface';
import { wayfindElevated } from './wayfinding';

export function buildOpenAir(c: Ctx, spec: ElevatedSpec) {
  if (spec.layout === 'cutting') c.b.open(() => buildCutting(c, spec));
  else buildTerminus(c, spec);
}

/** A seeded 0…1 generator. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Walls round the walkable plot. */
function plotWalls(b: Builder) {
  const X = PLOT_X, Z = PLOT_Z;
  b.block(-X - 1, -1, -Z - 1, -X, 40, Z + 1);
  b.block(X, -1, -Z - 1, X + 1, 40, Z + 1);
  b.block(-X, -1, -Z - 1, X, 40, -Z);
  b.block(-X, -1, Z, X, 40, Z + 1);
}

/** A glazed wall: solid sill, glass, solid head. */
function glazed(b: Builder, mat: string, x0: number, z0: number, x1: number, z1: number, y0: number, y1: number) {
  b.block(x0, y0, z0, x1, y1, z1);
  b.deco(mat, x0, y0, z0, x1, y0 + 0.9, z1);
  b.deco('glass', x0, y0 + 0.9, z0, x1, y1 - 0.5, z1);
  b.deco(mat, x0, y1 - 0.5, z0, x1, y1, z1);
}

// ── Kasumidani: island in an open cutting, bridge building over it ──────────────────────────

function buildCutting(c: Ctx, spec: ElevatedSpec) {
  const { b, line, station, railY, style } = c;
  const d = hallDims(line, railY);
  const pf = d.pf, pe = d.pe, fl = 0.2, GY = GROUND_Y;
  const K = OPEN_AIR.cutting;
  const [bx0, bz0, bx1, bz1] = K.box;
  const roofY = fl + 3.4;
  const cutZ = d.wallZ + 0.4;
  const slate = style.accent;
  // Stair from the island up into the bridge: foot in the open, head inside the gates.
  const run = Math.round((fl - pf) * 1.7 * 100) / 100;
  const top = bx0 + 3, sx0 = top - run;
  const hole: Rect = [bx0, -1.92, top, 1.92];

  hall(c, {
    ceil: [{ x0: -HALL_HALF, x1: HALL_HALF, y: pf + 3.3, emit: false }],
    blocks: [[sx0, bx1]],
    elevated: true,
    cutting: true,
    roof: false,
  });
  b.with({ t: [sx0, 0, 0] }, () => islandUnit(b, pf, fl, run, null));
  rail(b, bx0, -1.96, top, -1.88, fl);
  rail(b, bx0, 1.88, top, 1.96, fl);

  // Sawtooth canopy over the island: each 4 m bay slopes up to a glazed light at its +x end.
  const cz = pe + 0.4;
  const segs: [number, number][] = [[-56, sx0 - 1], [bx1 + 0.5, 56]];
  for (const [xa, xb] of segs) {
    b.deco('flat:#e9edf0', xa, pf + 3.3, -cz, xb, pf + 3.42, cz);
    for (const s of [-1, 1]) b.deco(`paint:${line.color}`, xa, pf + 3.18, s * cz - 0.05, xb, pf + 3.42, s * cz + 0.05);
    for (let x = xa; x + 4 <= xb + 0.01; x += 4) {
      for (let k = 0; k < 5; k++) {
        b.deco(`flat:${slate}`, x + k * 0.8, pf + 3.42 + k * 0.18, -cz, x + (k + 1) * 0.8, pf + 3.6 + k * 0.18, cz);
      }
      b.deco('glass', x + 3.94, pf + 3.42, -cz, x + 4, pf + 4.32, cz);
    }
    for (let x = xa + 1; x + 2.5 <= xb; x += 4) for (const z of [-2.6, 2.6]) ceilingLight(b, x, x + 2.5, z - 0.1, z + 0.1, pf + 3.3);
  }
  // On the island at the stair foot: the way out.
  b.hang({ k: 'guide', ja: '出口・改札', en: 'Exit / Ticket gates', bg: 'yellow', arrow: 'up' }, sx0 - 2.4, pf + 2.6, 0, 3.3, 0.46,
    { ceil: pf + 3.3, back: { k: 'guide', ja: '出口・改札', en: 'Exit / Ticket gates', bg: 'yellow', arrow: 'up' } });

  // ── The bridge building ──
  b.slab(style.floor, bx0, bz0, bx1, bz1, fl - 0.6, fl, [hole]);
  const W = style.concWall;
  // West face looks down the platforms; open where the stair comes up.
  glazed(b, W, bx0 - 0.2, bz0, bx0, -1.96, fl, roofY);
  glazed(b, W, bx0 - 0.2, 1.96, bx0, bz1, fl, roofY);
  b.box(W, bx0 - 0.2, fl + 2.4, -1.96, bx0, roofY, 1.96);
  glazed(b, W, bx1, bz0, bx1 + 0.2, bz1, fl, roofY);
  // End walls with a doorway each onto the valley: the plaza (−z) and the lane (+z).
  const [dx0, dx1] = [K.exits[0].rect[0], K.exits[0].rect[2]];
  for (const s of [-1, 1] as const) {
    const z = s < 0 ? bz0 : bz1, za = Math.min(z, z + s * 0.2), zb = Math.max(z, z + s * 0.2);
    glazed(b, W, bx0 - 0.2, za, dx0, zb, fl, roofY);
    glazed(b, W, dx1, za, bx1 + 0.2, zb, fl, roofY);
    b.box(W, dx0, fl + 2.6, za, dx1, roofY, zb);
    b.sign({ k: 'entrance', station: station.id }, (dx0 + dx1) / 2, fl + 3.0, z + s * 0.22, [0, s], 5, 0.7);
    b.sign({ k: 'guide', ja: s < 0 ? '南口' : '北口', en: s < 0 ? 'South exit' : 'North exit', bg: 'yellow', arrow: 'up' },
      (dx0 + dx1) / 2, fl + 2.95, z - s * 0.03, [0, -s], 3, 0.42);
    // Canopy over the doorway.
    b.deco('flat:#e7ebee', dx0 - 1, fl + 2.7, Math.min(z, z + s * 3), dx1 + 1, fl + 2.85, Math.max(z, z + s * 3));
    b.deco(`flat:${slate}`, dx0 - 1, fl + 2.55, z + s * 3 - 0.05, dx1 + 1, fl + 2.85, z + s * 3 + 0.05);
  }
  // Roof: a shallow slate gable with deep eaves, a line-colour band under them.
  b.box('flat:#e7ebee', bx0 - 0.6, roofY, bz0 - 0.6, bx1 + 0.6, roofY + 0.3, bz1 + 0.6);
  for (let k = 0; k < 4; k++) {
    const inset = k * 1.8;
    b.deco(`flat:${slate}`, bx0 - 0.8 + inset, roofY + 0.3 + k * 0.32, bz0 - 0.8, bx1 + 0.8 - inset, roofY + 0.62 + k * 0.32, bz1 + 0.8);
  }
  b.deco(`paint:${line.color}`, bx0 - 0.62, roofY - 0.2, bz0 - 0.62, bx1 + 0.62, roofY, bz1 + 0.62);
  for (let x = bx0 + 1.5; x + 2.2 <= bx1; x += 4.2) for (let z = bz0 + 2; z < bz1 - 1; z += 4.5) ceilingLight(b, x, x + 2.2, z - 0.2, z + 0.2, roofY);

  // Paid area round the stair head (x < 8, |z| < 6); the gates face the free passage.
  const gateX = 8, pw = 6;
  for (const s of [-1, 1]) {
    const z = s * pw;
    b.block(bx0, fl, z - 0.05, s < 0 ? gateX : 5, fl + 2.1, z + 0.05);
    b.deco('glass', bx0, fl + 0.1, z - 0.02, s < 0 ? gateX : 5, fl + 2.0, z + 0.02);
    b.deco('metal:#b0b5ba', bx0, fl + 2.0, z - 0.05, s < 0 ? gateX : 5, fl + 2.1, z + 0.05);
  }
  b.with({ t: [gateX, 0, 0] }, () => gateLine(c, fl, pw, [line.id], roofY - fl));
  b.hang({ k: 'guide', ja: 'のりば 1・2番線', en: 'Platforms 1 & 2', bg: 'navy', badges: [line.id], arrow: 'down' }, top + 1.6, fl + 2.6, 0, 3.4, 0.46,
    { ceil: roofY, back: { k: 'guide', ja: '出口', en: 'Exit', bg: 'yellow', arrow: 'up' } });
  ticketMachines(c, fl, bx0 + 1, bz0, 5);
  vending(b, bx1 - 0.5, fl, 10, [-1, 0], 'vending');
  vending(b, bx1 - 0.5, fl, 11.1, [-1, 0], 'vending2');
  // The centrepiece: the misty-ridges mural on the passage wall, facing the gates.
  b.sign({ k: 'mural', ...style.mural }, bx1 - 0.02, fl + 1.9, 1.5, [-1, 0], 9, 2.4);
  b.sign({ k: 'stationmap', station: station.id }, bx1 - 0.03, fl + 1.5, -12.6, [-1, 0], 2.2, 1.6);
  b.sign({ k: 'areamap', station: station.id }, bx1 - 0.03, fl + 1.5, -10.2, [-1, 0], 2.2, 1.6);
  b.sign({ k: 'exits', station: station.id }, bx1 - 0.03, fl + 1.5, -7.9, [-1, 0], 2.0, 1.6);
  b.zone('concourse', bx0, 0, bz0, bx1, roofY, bz1, '橋上駅舎', 'Station building (over the tracks)');
  b.setSpawn((dx0 + dx1) / 2, fl, -11, [0, 1]);

  // ── The valley ──
  const X = PLOT_X, Z = PLOT_Z;
  const cut1: Rect = [-X, -cutZ, bx0, cutZ], cut2: Rect = [bx1, -cutZ, X, cutZ];
  const roads = K.areas.filter((a) => a.fill === 'road').map((a) => a.r as Rect);
  b.slab('asphalt', -X, -Z, X, Z, -0.6, 0, [cut1, cut2, [bx0, bz0, bx1, bz1]]);
  b.slab('paver', -X, -Z, X, Z, 0, GY, [cut1, cut2, ...roads, [bx0, bz0, bx1, bz1]]);
  b.zone('street', -X, -0.3, -Z, X, 80, Z, `${station.nameJa}駅前`, `${station.nameRomaji} — the valley`);
  plotWalls(b);
  // Fences along the top of the cutting.
  for (const s of [-1, 1]) {
    for (const [xa, xb] of [[-X, bx0 - 0.2], [bx1 + 0.2, X]]) {
      const za = s * cutZ, zb = s * (cutZ + 0.08);
      b.box('metal:#6f7880', xa, GY, Math.min(za, zb), xb, GY + 0.06, Math.max(za, zb));
      b.block(xa, GY, Math.min(za, zb), xb, GY + 1.3, Math.max(za, zb));
      b.deco('metal:#6f7880', xa, GY + 1.24, Math.min(za, zb) - 0.02, xb, GY + 1.3, Math.max(za, zb) + 0.02);
      for (let x = xa; x < xb; x += 2.5) b.deco('metal:#6f7880', x, GY, Math.min(za, zb), x + 0.06, GY + 1.3, Math.max(za, zb));
      b.deco('flat:#9aa4ab', xa, GY + 0.1, Math.min(za, zb) + 0.02, xb, GY + 1.2, Math.max(za, zb) - 0.02);
    }
  }
  // The tunnel portal at the −x end, under the toe of the ridge.
  const px1 = -X + 14;
  b.box('concreteDark', -X, railY + 4.65, -cutZ - 0.5, px1, GY + 3.2, cutZ + 0.5);
  b.box('concrete', px1, railY + 4.65, -cutZ - 0.6, px1 + 0.6, GY + 3.8, cutZ + 0.6);
  b.deco('flat:#0b0c0e', -X, railY - 0.4, -cutZ, -X + 0.1, railY + 4.65, cutZ);
  b.sign({ k: 'label', text: '霞谷トンネル', sub: 'Kasumidani Tunnel', fg: '#fff', bg: '#3b4652' }, px1 + 0.62, GY + 2.1, 0, [1, 0], 4.4, 0.9);
  b.mesh('leaf', 'sphere', -X - 80, -12, 0, 160, 80, 220);

  // Station-front plaza and bus stop (−z).
  const [bsx, bsz] = K.bus;
  b.box('flat:#8d949b', bsx - 4, GY, bsz - 1.2, bsx - 3.85, GY + 2.6, bsz - 1.05);
  b.box('flat:#8d949b', bsx + 4, GY, bsz - 1.2, bsx + 4.15, GY + 2.6, bsz - 1.05);
  b.deco('flat:#eef0f2', bsx - 4.6, GY + 2.6, bsz - 2.4, bsx + 4.8, GY + 2.72, bsz + 0.6);
  b.box('flat:#3b4046', bsx - 2.6, GY, bsz - 1.6, bsx + 2.6, GY + 0.45, bsz - 1.1);
  b.sign({ k: 'label', text: 'バスのりば', sub: 'Bus — for the valley villages and Hoshimine Observatory', fg: '#fff', bg: '#3b4652' }, bsx, GY + 2.25, bsz + 0.62, [0, 1], 4.6, 0.6);
  for (const tx of [-4, 22, 24]) tree(b, tx, -18 - (tx % 5), 5, 'leaf2');

  // Houses stepping up the valley sides on stone terraces, both sides of the cutting.
  const r = seeded(spec.surface.seed);
  const houseMats = ['facade:house:#e9e2d2', 'facade:house:#dcd6cc', 'facade:house:#cfd6d6', 'facade:house:#e3dbd0'];
  const rows: [number, number, number][] = [
    [-50, -42, 0.4], [-62, -54, 1.2], [-74, -66, 2.0],
    [24, 32, 0.4], [36, 44, 1.2], [48, 56, 2.0], [60, 68, 2.8], [72, 80, 3.6],
  ];
  for (const [z0, z1, h] of rows) {
    // The terrace: a stone retaining wall along its downhill edge.
    const wallZ = z0 < 0 ? z1 + 1 : z0 - 1;
    b.box('flat:#8f8a80', -126, GY, wallZ - 0.4, 124, GY + h, wallZ + 0.4);
    for (let x = -126; x < 124;) {
      const w = 7 + r() * 3;
      if (!(x < -108 && Math.abs(z0) < 40)) {
        b.box('flat:#8f8a80', x, GY, z0, x + w, GY + h, z1);
        b.box(houseMats[Math.floor(r() * 4)], x + 0.4, GY + h, z0 + 0.6, x + w - 0.4, GY + h + 5.6, z1 - 0.6);
        b.deco('roof', x, GY + h + 5.6, z0 + 0.2, x + w, GY + h + 5.95, z1 - 0.2);
        b.deco('roof', x + 0.8, GY + h + 5.95, z0 + 1, x + w - 0.8, GY + h + 6.5, z1 - 1);
      }
      x += w + 1.4;
    }
  }
  for (let x = -110; x < 124; x += 19) {
    tree(b, x, 12 + (Math.abs(x) % 3), 4.6, 'leaf');
    tree(b, x + 9, -12 - (Math.abs(x) % 3), 4.2, 'leaf2');
  }
  for (let x = -120; x < 124; x += 30) {
    b.mesh('flat:#8a8479', 'cyl', x, GY + 4.6, -39, 0.3, 9.2, 0.3);
    b.block(x - 0.16, GY, -39.16, x + 0.16, GY + 3, -38.84);
  }
  // Ridges all round, fading back into the mist.
  for (const [hx, hz, hw, hh] of [[-60, -170, 260, 70], [120, -160, 220, 56], [-40, 170, 280, 80], [140, 160, 200, 60]]) {
    b.mesh('leaf', 'sphere', hx, -8, hz, hw, hh * 2, hw * 0.6);
  }
}

// ── Shiondai: viaduct terminus under a barrel vault ─────────────────────────────────────────

function buildTerminus(c: Ctx, spec: ElevatedSpec) {
  const { b, line, station, railY, style } = c;
  const d = hallDims(line, railY);
  const pf = d.pf, fl = 0.2, GY = GROUND_Y;
  const T = OPEN_AIR.terminus;
  const [cx0, , cx1, cw] = T.box;
  const deckUnder = railY - 1.3;
  const lilac = style.accent;
  // The stair: foot near the concourse's far end, climbing back (−x) onto the island.
  const run = Math.round((pf - fl) * 1.7 * 100) / 100;
  const foot = cx1 - 4, top = foot - run;
  const gateX = 38;

  hall(c, {
    ceil: [{ x0: -HALL_HALF, x1: HALL_HALF, y: pf + 3.3, emit: false }],
    blocks: [[top, foot + 1]],
    elevated: true,
    roof: false,
    platHoles: [[top, -1.84, foot, 1.84]],
  });
  b.with({ ...MIRROR_X, t: [foot, 0, 0] }, () => islandUnit(b, fl, pf, run, pf));
  b.hang({ k: 'guide', ja: '出口・改札', en: 'Exit / Ticket gates', bg: 'yellow', arrow: 'up' }, top - 1.6, pf + 2.6, 0, 3.3, 0.46,
    { ceil: pf + 3.3, back: { k: 'guide', ja: '出口・改札', en: 'Exit / Ticket gates', bg: 'yellow', arrow: 'up' } });

  // The barrel vault: lilac steel ribs every 7.5 m, panels, and a glazed crown.
  const R = d.wallZ + 0.2, spring = pf + 3.3, rise = 4.6, n = 14, w = (2 * R) / n;
  const arc = (zc: number) => spring + rise * Math.sqrt(Math.max(0, 1 - (zc / R) ** 2));
  for (let k = 0; k < n; k++) {
    const zc = -R + (k + 0.5) * w;
    b.deco(Math.abs(zc) < R * 0.3 ? 'glass' : 'panel:#f2f0f6', -HALL_HALF, arc(zc), zc - w / 2, HALL_HALF, arc(zc) + 0.12, zc + w / 2);
  }
  for (let x = -HALL_HALF; x <= HALL_HALF + 0.01; x += 7.5) {
    const t = Math.abs(x) > HALL_HALF - 0.1 ? 0.3 : 0.15;
    for (let k = 0; k < n; k++) {
      const zc = -R + (k + 0.5) * w;
      b.deco(`paint:${lilac}`, x - t, arc(zc) - 0.35, zc - w / 2, x + t, arc(zc), zc + w / 2);
    }
    b.deco('metal:#9a94b8', x - 0.04, spring - 0.04, -R, x + 0.04, spring + 0.04, R);
  }
  // Purlins at canopy height carry the lights and the hanging signs.
  for (const z of [-2.6, -2.05, 2.05, 2.6]) b.deco('metal:#8f8aa8', -58, spring, z - 0.07, 58, spring + 0.12, z + 0.07);
  for (let x = -56; x + 3 <= 56; x += 5) for (const z of [-2.6, 2.6]) ceilingLight(b, x, x + 3, z - 0.1, z + 0.1, spring);

  // Viaduct piers and cross-beams.
  for (let x = -54; x <= 54; x += 13.5) {
    for (const z of [-4.6, 4.6]) b.box('concrete', x - 0.55, 0, z - 0.55, x + 0.55, deckUnder, z + 0.55);
    b.deco('concrete', x - 0.7, deckUnder - 0.9, -9, x + 0.7, deckUnder, 9);
  }

  // ── Concourse under the platform's end ──
  b.slab(style.floor, cx0, -cw, cx1, cw, 0.1, fl, []);
  const front: [number, number] = [T.exits[0].rect[0], T.exits[0].rect[2]];
  glazed(b, 'flat:#dfe2e5', cx0, cw - 0.15, front[0], cw, fl, deckUnder);
  glazed(b, 'flat:#dfe2e5', front[1], cw - 0.15, cx1, cw, fl, deckUnder);
  b.deco('flat:#dfe2e5', front[0], fl + 3.0, cw - 0.15, front[1], deckUnder, cw);
  b.sign({ k: 'entrance', station: station.id }, (front[0] + front[1]) / 2, fl + 3.7, cw + 0.02, [0, 1], 7, 1.0);
  b.box(style.concWall, cx0, fl, -cw, cx1, deckUnder, -cw + 0.15);
  b.box(style.concWall, cx1, fl, -cw, cx1 + 0.15, deckUnder, cw);
  b.box(style.concWall, cx0 - 0.15, fl, -cw, cx0, deckUnder, -3);
  b.box(style.concWall, cx0 - 0.15, fl, 3, cx0, deckUnder, cw);
  b.deco('flat:#dfe2e5', cx0 - 0.15, fl + 3.0, -3, cx0, deckUnder, 3);
  b.sign({ k: 'entrance', station: station.id }, cx0 - 0.17, fl + 3.6, 0, [-1, 0], 5.4, 0.9);
  for (let x = cx0 + 2; x + 2.4 < cx1; x += 4.5) for (const z of [-5, 0, 5]) ceilingLight(b, x, x + 2.4, z - 0.22, z + 0.22, deckUnder);
  b.with({ ...MIRROR_X, t: [gateX, 0, 0] }, () => gateLine(c, fl, cw, [line.id], deckUnder - fl));
  ticketMachines(c, fl, cx0 + 1.2, -cw + 0.15, 5);
  vending(b, cx0 + 0.5, fl, 5.2, [1, 0], 'vending');
  vending(b, cx0 + 0.5, fl, 6.4, [1, 0], 'vending2');
  // The centrepiece: the line ends at the aster wall.
  b.sign({ k: 'mural', ...style.mural }, cx1 - 0.02, fl + 2.6, 0, [-1, 0], 14, 3.4);
  b.zone('concourse', cx0, 0, -cw, cx1, deckUnder, cw, '改札階コンコース', 'Concourse (street level)');
  const nums = station.platforms[line.id];
  wayfindElevated({
    b, station, line, style, fl, top: deckUnder, cw, x0: cx0, x1: cx1, gateX,
    stairs: [{ x: foot - 2, z: -0.9, platform: nums[0], dir: 'down' }, { x: foot - 2, z: 0.9, platform: nums[1], dir: 'up' }],
    entrances: [{ x: (front[0] + front[1]) / 2, z: cw, n: [0, 1], w: front[1] - front[0] }, { x: cx0, z: 0, n: [-1, 0], w: 6 }],
  });
  b.setSpawn(cx0 + 5, fl, 3, [1, 0]);

  // ── The new town ──
  const X = PLOT_X, Z = PLOT_Z;
  const roads = T.areas.filter((a) => a.fill === 'road').map((a) => a.r as Rect);
  b.slab('asphalt', -X, -Z, X, Z, -0.6, 0, []);
  b.slab('paver', -X, -Z, X, Z, 0, GY, [...roads, [cx0, -cw, cx1, cw]]);
  b.slab('paver', cx0, -cw, cx1, cw, 0, 0.1, []);
  b.zone('street', -X, -0.3, -Z, X, 80, Z, `${station.nameJa}駅前`, `${station.nameRomaji} — station plaza`);
  plotWalls(b);
  for (let x = -X; x < X; x += 6) b.deco('flat:#e9e9e4', x, 0.004, 32.93, x + 3, 0.01, 33.07);

  // Bus terminal: a long island with three lilac shelters, buses waiting beyond it.
  const busZ: [number, number] = [29.5, 33.5];
  b.deco('flat:#d8d4cc', -54, 0, busZ[0], 14, 0.17, busZ[1]);
  const dests = ['Shiondai Loop', 'Aster Hills', 'Hoshimine Observatory'];
  [-45, -25, -5].forEach((x, i) => {
    for (const px of [x - 5, x + 5]) b.box(`paint:${lilac}`, px - 0.1, 0.17, busZ[0] + 1.9, px + 0.1, 3.1, busZ[0] + 2.1);
    b.deco('flat:#f2f0f6', x - 6, 3.1, busZ[0] + 0.2, x + 6, 3.25, busZ[1] - 0.2);
    b.deco(`paint:${lilac}`, x - 6, 2.95, busZ[0] + 0.15, x + 6, 3.1, busZ[0] + 0.25);
    b.box('flat:#3b4046', x - 3, 0.17, busZ[0] + 2.3, x + 3, 0.62, busZ[0] + 2.8);
    b.sign({ k: 'label', text: `${i + 1}番のりば`, sub: `Stop ${i + 1} — ${dests[i]}`, fg: '#fff', bg: '#4b3f7a' }, x, 2.6, busZ[0] - 0.02, [0, -1], 3.6, 0.6);
    // A bus at the stop.
    const bx = x - 5.5;
    b.box('flat:#f4f2ee', bx, GY, 34.2, bx + 11, GY + 3.0, 36.7);
    b.deco('glassDark', bx + 0.3, GY + 1.3, 34.18, bx + 10.7, GY + 2.5, 36.72);
    b.deco(`flat:${lilac}`, bx, GY + 0.7, 34.17, bx + 11, GY + 1.0, 36.73);
  });
  b.box('flat:#8d949b', 52.94, GY, 25.5, 53.06, GY + 2.1, 25.62);
  b.sign({ k: 'label', text: 'タクシーのりば', sub: 'Taxi', fg: '#111', bg: '#ffd100' }, 53, GY + 2.4, 25.5, [0, -1], 2.6, 0.6);
  car(b, 50, 27.4, '#1d4d2b', true, true);
  car(b, 56, 27.4, '#1d4d2b', true, true);

  // Pedestrian deck: a broad stair at the front door, over the bus terminal to the mall's
  // first floor.
  const [dkx0, dkz0, dkx1, dkz1] = T.areas.find((a) => a.fill === 'deck')!.r;
  const deckY = 5.4, sRun = Math.round((deckY - GY) * 1.7 * 100) / 100;
  const dmx = (dkx0 + dkx1) / 2, half = (dkx1 - dkx0) / 2;
  b.with({ rot: 1, t: [dmx, 0, dkz0] }, () => stairs(b, { x0: 0, x1: sRun, z0: -half, z1: half, yLow: GY, yHigh: deckY }));
  const deck0 = dkz0 + sRun;
  b.box('concrete', dkx0, deckY - 0.7, deck0, dkx1, deckY - 0.04, dkz1);
  b.box(style.floor, dkx0, deckY - 0.04, deck0, dkx1, deckY, dkz1);
  rail(b, dkx0 - 0.1, deck0, dkx0, dkz1, deckY);
  rail(b, dkx1, deck0, dkx1 + 0.1, dkz1, deckY);
  for (const z of [deck0 + 3, 36, 46]) {
    b.mesh(`paint:${lilac}`, 'cyl', dmx, (deckY - 0.7) / 2, z, 0.8, deckY - 0.7, 0.8);
    b.block(dmx - 0.4, 0, z - 0.4, dmx + 0.4, deckY - 0.7, z + 0.4);
  }
  // Its glass roof on lilac posts.
  for (let z = deck0 + 1; z < dkz1; z += 6) for (const x of [dkx0 + 0.05, dkx1 - 0.2]) b.box(`paint:${lilac}`, x, deckY, z - 0.08, x + 0.15, deckY + 3.0, z + 0.08);
  b.deco('glass', dkx0 - 0.4, deckY + 3.0, deck0, dkx1 + 0.4, deckY + 3.1, dkz1);
  for (const x of [dkx0 - 0.4, dkx1 + 0.3]) b.deco(`paint:${lilac}`, x, deckY + 2.9, deck0, x + 0.1, deckY + 3.15, dkz1);
  for (let z = deck0 + 2; z + 2 < dkz1; z += 5) ceilingLight(b, dmx - 0.8, dmx + 0.8, z, z + 0.3, deckY + 3.0);
  b.zone('street', dkx0, deckY - 0.3, deck0, dkx1, deckY + 3, dkz1, 'ペデストリアンデッキ', 'Pedestrian deck');

  // Shopping centre, its first-floor doors on the deck.
  const [mx0, mz0, mx1, mz1] = T.areas.find((a) => a.fill === 'shop')!.r;
  b.box('flat:#ece8e0', mx0, GY, mz0, mx1, GY + 16, mz1);
  for (const y of [GY + 0.4, deckY + 0.2, deckY + 5.2]) b.deco('glassDark', mx0 + 1, y, mz0 - 0.03, mx1 - 1, y + 3, mz0);
  b.deco('glow:#fff8e1', dkx0 + 0.5, deckY + 0.1, mz0 - 0.05, dkx1 - 0.5, deckY + 2.8, mz0 - 0.02);
  b.deco(`paint:${lilac}`, mx0, GY + 15.2, mz0 - 0.05, mx1, GY + 16, mz0);
  b.sign({ k: 'shop', ja: '紫苑台タウンプラザ', en: 'Shiondai Town Plaza', bg: '#4b3f7a', fg: '#fff' }, (mx0 + mx1) / 2 + 18, GY + 13, mz0 - 0.06, [0, -1], 24, 1.6);
  // The park beside it.
  const park = T.areas.find((a) => a.fill === 'green')!.r;
  for (let x = park[0] + 6; x < park[2]; x += 11) for (let z = park[1] + 6; z < park[3]; z += 10) tree(b, x + ((z * 3) % 4), z, 6, (x + z) % 2 ? 'leaf' : 'leaf2');
  b.sign({ k: 'label', text: '紫苑台中央公園', sub: 'Shiondai Central Park', fg: '#fff', bg: '#2f6b45' }, park[2] - 4, 2.2, park[1] - 0.6, [0, -1], 4.4, 0.7);

  // New-town slab blocks across the back road.
  const r = seeded(spec.surface.seed);
  const aptMats = ['facade:apt:#e8e4ec', 'facade:apt:#dcd8e2', 'facade:apt:#e4dfd3'];
  for (const [z0, z1] of [[-60, -46], [-80, -66]] as const) {
    for (let x = -126; x < 124;) {
      const w = 24 + r() * 10;
      b.box(aptMats[Math.floor(r() * 3)], x, GY, z0, Math.min(x + w, 124), GY + (8 + Math.floor(r() * 7)) * 3.1, z1);
      x += w + 6;
    }
  }
  for (let x = -120; x < 124; x += 15) tree(b, x, -30, 5.5, 'leaf');
  // Bicycle parking under the viaduct, west of the concourse.
  for (let x = -50; x < 16; x += 0.8) {
    const col = ['#3a3f45', '#9c1f1f', '#1f4e8c', '#c9c2a8'][Math.abs(Math.round(x * 5)) % 4];
    b.deco('flat:#3a3f45', x, GY + 0.3, -3.2, x + 0.06, GY + 0.95, -1.6);
    b.deco(`flat:${col}`, x - 0.03, GY + 0.6, -2.9, x + 0.09, GY + 0.72, -2.1);
  }
  b.box('flat:#b7bcc2', -50.5, GY, -4.0, 16.5, GY + 1.0, -3.9);
  for (const [hx, hz, hw, hh] of [[-90, -170, 240, 50], [60, -180, 260, 64], [-120, 170, 220, 46], [110, 175, 240, 58]]) {
    b.mesh('leaf', 'sphere', hx, -6, hz, hw, hh * 2, hw * 0.6);
  }
}
