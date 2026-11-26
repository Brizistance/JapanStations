// Shiomi (潮見), the Shiokaze Line's west terminus at the tip of the river-mouth landfill (rebuilt 2026-11-25,
// open-air.ts 'headhouse'; numbers in shiomi-plan.ts; the buildings are models, tools/blender/build_shiomi.py).
//
// The line comes up out of its tunnel into a short open cutting, the platforms' length, and ends there. An island
// under a white wave canopy edged in navy that rises over the street, a crest of blue glass. The head house on a
// deck over the cutting's west end, in the aquarium's manner: a front of tall deep-blue glass bowed out onto the
// plaza, navy fish-scale cladding behind the gates, and a public deck on its roof (an outside stair and a lift on
// the north side). The stair and escalator climb straight up into its paid side from the island's end, and a lift
// beside them. A small east hall in the same glass over the tunnel mouth. (The trains reverse in sidings beyond
// the platforms, as at every metro terminus: here in a covered box under the plaza.)
//
// Stage 1: the station and bare ground round it (the streets are stage 2's).

import { HALL_HALF } from '../sim/geometry';
import { GROUND_Y, ceilingLight, gateLine, hall, hallDims, rail, stairs, ticketMachines, vending, type Ctx } from './kit';
import { MIRROR_X, islandUnit, type Rect } from './build';
import type { ElevatedSpec } from './specs';
import { lift } from './lift';
import { wayfindElevated } from './wayfinding';
import { SHIOMI as S, SHIOMI_BRIDGE as BR } from './shiomi-plan';
import { shiomiStreet } from './shiomi-street';
import { shiomiFill } from './shiomi-fill';
import { shiomiExtras } from './shiomi-extras';

const WHITE = 'flat:#f6f3ec', UNDER = 'flat:#e7e2d8', NAVY = 'paint:#1b2f4f', NAVY_F = 'flat:#1b2f4f';
const CREST = 'seaglass:#2a6f9c', RIPPLE = 'flat:#a9d3dc', COVE = 'glow:#7fd0d6';

/** The models' frames: 'w' fronts face −x, their bodies run +x; the models' +x is the station's −z (north). */
const W_FRAME = { rot: 3 } as const;
/** Hamakaze-suji's building lines, where its deck crosses the cutting (shiomi-street.ts). */
const AV_W = BR.c - BR.half - BR.pave, AV_E = BR.c + BR.half + BR.pave;

export function buildShiomi(c: Ctx, spec: ElevatedSpec) {
  const { b, line, station, railY, style } = c;
  const d = hallDims(line, railY);
  const pf = d.pf, wz = d.wallZ, fl = 0.2, GY = GROUND_Y, H = HALL_HALF, L = line.trackOffset;
  const run = Math.round((fl - pf) * 1.7 * 100) / 100;
  const hd = S.head, ea = S.east;
  const wFoot = hd.x1 + run, eFoot = ea.x0 - run;
  const roofY = fl + hd.roof, eRoof = fl + ea.roof, DY = roofY + 0.3;
  const purlinY = pf + 3.3;
  if (Math.abs(wz - S.cut.z) > 0.01) throw new Error(`shiomi: the cutting's walls moved (${wz})`);
  /** The head house's front, bowed out onto the plaza: its x at z. */
  const bowX = (z: number) => hd.x0 - hd.bow * (1 - (z / hd.z) ** 2);
  /** 1 m strips across the head house's width, for what follows the bow (floor, colliders, ground). */
  const strips: [number, number][] = [];
  // (25 strips, not 28: no strip edge on z = 0, the shopping street's centre line, where the street checks probe the ground.)
  for (let k = 0, w = (2 * hd.z) / 25; k < 25; k++) strips.push([-hd.z + k * w, -hd.z + (k + 1) * w]);
  const bowSpan = (z0: number, z1: number): [number, number] => [Math.min(bowX(z0), bowX(z1)), Math.max(bowX(z0), bowX(z1))];

  // ── The platform in its cutting ──
  hall(c, {
    ceil: [{ x0: -H, x1: H, y: purlinY, emit: false }],
    blocks: [[-58, wFoot], [eFoot, 58]],
    elevated: true,
    cutting: true,
    roof: false,
  });
  // The stairs and escalators up from the island's ends: west into the head house, east into the east hall.
  b.with({ ...MIRROR_X, t: [wFoot, 0, 0] }, () => islandUnit(b, pf, fl, run, null));
  b.with({ t: [eFoot, 0, 0] }, () => islandUnit(b, pf, fl, run, null));
  b.hang({ k: 'guide', ja: '出口・改札', en: 'Exit / Ticket gates', bg: 'yellow', arrow: 'up' }, wFoot + 2.4, pf + 2.6, 0, 3.3, 0.46,
    { ceil: purlinY, back: { k: 'guide', ja: '出口・改札', en: 'Exit / Ticket gates', bg: 'yellow', arrow: 'up' } });
  b.hang({ k: 'guide', ja: '東口', en: 'East exit', bg: 'yellow', arrow: 'up' }, eFoot - 2.4, pf + 2.6, 0, 3.3, 0.46,
    { ceil: purlinY, back: { k: 'guide', ja: '東口', en: 'East exit', bg: 'yellow', arrow: 'up' } });

  // Purlins on the hall's posts carry the lights and the hanging signs; above them the canopy's own posts.
  for (const z of [-3.02, -2.6, -2.05, 2.05, 2.6, 3.02]) b.deco(NAVY, wFoot + 0.5, purlinY, z - 0.06, eFoot - 0.5, purlinY + 0.14, z + 0.06);
  for (let x = wFoot + 1.5; x + 3 <= eFoot - 1; x += 5) for (const z of [-2.6, 2.6]) ceilingLight(b, x, x + 3, z - 0.1, z + 0.1, purlinY);
  // Under the head house's and the east hall's decks: lit soffits over the platform's ends.
  for (const [xa, xb] of [[-57, hd.x1 - 0.5], [ea.x0 + 0.5, 57]] as [number, number][]) {
    for (let x = xa; x + 2.4 <= xb; x += 3.6) for (const z of [-2.6, 2.6, -6.2, 6.2]) ceilingLight(b, x, x + 2.4, z - 0.12, z + 0.12, fl - 0.6);
  }

  // ── The wave canopy: a white shell over the cutting, a crest of blue glass, navy edges, rising over the street ──
  const CZ = S.canopy.z;
  const cy = (x: number, z: number) => GY + 2.7 + 1.6 * (1 - (z / CZ) ** 2) + 0.45 * Math.sin((2 * Math.PI * (x - S.canopy.x0)) / 23);
  const NZ = 16, dz = (2 * CZ) / NZ;
  for (let x = S.canopy.x0; x < S.canopy.x1 - 0.01; x += 2) {
    const xm = x + 1;
    for (let k = 0; k < NZ; k++) {
      const z0 = -CZ + k * dz, zm = z0 + dz / 2, y = cy(xm, zm);
      b.deco(Math.abs(zm) < 1.3 ? CREST : WHITE, x, y, z0, x + 2, y + 0.14, z0 + dz);
      if (Math.abs(zm) >= 1.3) b.deco(UNDER, x, y - 0.02, z0, x + 2, y, z0 + dz);
    }
    for (const s of [-1, 1]) b.deco(NAVY_F, x, cy(xm, s * CZ) - 0.22, Math.min(s * CZ, s * (CZ + 0.08)), x + 2, cy(xm, s * CZ) + 0.16, Math.max(s * CZ, s * (CZ + 0.08)));
  }
  // Posts: on the island from the purlins up to the shell, and along both kerbs of the cutting from the street.
  for (let x = -12; x <= 36; x += 12) {
    for (const z of [-2.05, 2.05]) b.deco(NAVY, x - 0.09, purlinY, z - 0.09, x + 0.09, cy(x, z), z + 0.09);
    for (const s of [-1, 1]) {
      const z = s * (CZ - 0.7);
      b.box(NAVY, x - 0.12, GY, z - 0.12, x + 0.12, cy(x, z), z + 0.12);
      // A short arm under the shell, tied back towards the crest.
      b.deco(NAVY, x - 0.06, cy(x, z) - 0.5, Math.min(z, z - s * 2.4), x + 0.06, cy(x, z) - 0.38, Math.max(z, z - s * 2.4));
    }
  }
  // Fences along the top of the cutting between the two buildings.
  for (const s of [-1, 1]) {
    const za = s * wz, zb = s * (wz + 0.08), lo = Math.min(za, zb), hi = Math.max(za, zb);
    // (Open where Hamakaze-suji's deck crosses the cutting: its own parapets close it there.)
    for (const [xa, xb] of [[hd.x1 + 0.2, AV_W], [AV_E, ea.x0 - 0.2]] as [number, number][]) {
      b.block(xa, GY, lo, xb, GY + 1.3, hi);
      b.deco('metal:#6f7880', xa, GY + 1.24, lo - 0.02, xb, GY + 1.3, hi + 0.02);
      b.deco('metal:#6f7880', xa, GY, lo, xb, GY + 0.06, hi);
      for (let x = xa; x < xb; x += 2.5) b.deco('metal:#6f7880', x, GY, lo, x + 0.06, GY + 1.3, hi);
      b.deco('glass', xa, GY + 0.1, lo + 0.02, xb, GY + 1.2, hi - 0.02);
    }
  }

  // ── Tunnel mouths at both ends of the cutting, under the two decks ──
  const mouthTop = railY + 4.65, deckUnder = fl - 0.6;
  for (const s of [-1, 1]) {
    const x0 = s > 0 ? S.cut.x1 : S.cut.x0 - 0.5, x1 = x0 + 0.5;
    b.box('concreteDark', x0, railY - 1, -(L - 2.2), x1, deckUnder, L - 2.2);
    b.box('concreteDark', x0, mouthTop, -wz, x1, deckUnder, -(L - 2.2));
    b.box('concreteDark', x0, mouthTop, L - 2.2, x1, deckUnder, wz);
  }

  // ═════ The head house (model shiomi/headhouse) ═════
  b.with({ ...W_FRAME, t: [hd.x0, 0, 0] }, () => b.model('shiomi', 'headhouse', 0, 0, 0, 0));
  // The floor, out under the bow.
  const liftHole: Rect = [S.liftX - 2.35, -1.2, S.liftX + 0.05, 1.2];
  b.slab(style.floor, hd.x0, -hd.z, hd.x1, hd.z, fl - 0.6, fl, [liftHole]);
  for (const [z0, z1] of strips) b.slab(style.floor, bowSpan(z0, z1)[0], z0, hd.x0, z1, fl - 0.6, fl, []);
  b.with({ rot: 1, t: [S.liftX, 0, 0] }, () => lift(b, {
    levels: [{ y: pf, ja: 'ホーム', en: 'Platforms' }, { y: fl, ja: '改札', en: 'Ticket gates' }],
    mat: 'panel:#efe9df',
  }));
  // Colliders where the model has walls: the bow (open at the doors), the sides (open at the side doors), the
  // rounded back corners, the face down the platforms (open where the stair comes up).
  const fd = S.frontDoor, [sd0, sd1] = S.sideDoor, R = 3;
  for (const [z0, z1] of strips) {
    const [xa, xb] = bowSpan(z0, z1);
    const door = Math.abs((z0 + z1) / 2) < fd;
    b.block(xa - 0.12, door ? fl + 2.9 : fl, z0, xb + 0.12, roofY, z1);
  }
  for (const s of [-1, 1] as const) {
    const za = Math.min(s * hd.z, s * (hd.z + 0.25)), zb = Math.max(s * hd.z, s * (hd.z + 0.25));
    b.block(hd.x0, fl, za, sd0, roofY, zb);
    b.block(sd0, fl + 2.8, za, sd1, roofY, zb);
    b.block(sd1, fl, za, hd.x1 - R, roofY, zb);
    for (let k = 0; k < 6; k++) {
      const t0 = (Math.PI / 2) * k / 6, t1 = (Math.PI / 2) * (k + 1) / 6;
      const p0 = [hd.x1 - R + R * Math.sin(t0), s * (hd.z - R + R * Math.cos(t0))], p1 = [hd.x1 - R + R * Math.sin(t1), s * (hd.z - R + R * Math.cos(t1))];
      b.block(Math.min(p0[0], p1[0]) - 0.1, fl, Math.min(p0[1], p1[1]) - 0.1, Math.max(p0[0], p1[0]) + 0.1, roofY, Math.max(p0[1], p1[1]) + 0.1);
    }
  }
  b.block(hd.x1 - 0.1, fl, -hd.z + R, hd.x1 + 0.1, roofY, -1.96);
  b.block(hd.x1 - 0.1, fl, 1.96, hd.x1 + 0.1, roofY, hd.z - R);
  b.block(hd.x1 - 0.1, fl + 2.4, -1.96, hd.x1 + 0.1, roofY, 1.96);
  rail(b, hd.x1 - 0.1, -1.96, hd.x1 + 0.1, -1.88, fl);
  rail(b, hd.x1 - 0.1, 1.88, hd.x1 + 0.1, 1.96, fl);
  // Signs at the doors: the name over the front, the side exits' names.
  b.sign({ k: 'entrance', station: station.id }, bowX(0) - 0.4, fl + 3.4, 0, [-1, 0], 8, 1.1);
  for (const s of [-1, 1] as const) {
    const z = s * hd.z;
    b.sign({ k: 'entrance', station: station.id }, (sd0 + sd1) / 2, fl + 3.4, z + s * 0.3, [0, s], 5, 0.7);
    b.sign({ k: 'guide', ja: s < 0 ? '北口' : '南口', en: s < 0 ? 'North exit' : 'South exit', bg: 'yellow', arrow: 'up' }, (sd0 + sd1) / 2, fl + 2.45, z - s * 0.1, [0, -s], 3, 0.42);
  }
  for (let x = hd.x0 + 1.8; x + 2.2 <= hd.x1 - 1; x += 4.2) for (let z = -hd.z + 2; z < hd.z - 1; z += 4.5) ceilingLight(b, x, x + 2.2, z - 0.2, z + 0.2, roofY - 0.04);
  // Blue-green light along the tops of the long walls; ripples inlaid in the floor of the hall.
  for (const s of [-1, 1]) b.deco(COVE, hd.x0 + 0.5, roofY - 0.42, Math.min(s * 13.7, s * 13.8), hd.x1 - R, roofY - 0.36, Math.max(s * 13.7, s * 13.8));
  for (let k = 0; k < 5; k++) {
    const zc = -10 + k * 5;
    for (let x = bowX(zc) + 1.5; x < hd.gateX - 2; x += 0.5) {
      const z = zc + 0.7 * Math.sin((2 * Math.PI * x) / 7.5 + k);
      b.deco(RIPPLE, x, fl + 0.002, z - 0.06, x + 0.5, fl + 0.005, z + 0.06);
    }
  }

  // Inside: the gates across the hall, ticket machines, a map stand, the waves on the north wall behind the gates.
  b.with({ ...MIRROR_X, t: [hd.gateX, 0, 0] }, () => gateLine(c, fl, hd.z, [line.id], roofY - fl));
  ticketMachines(c, fl, sd1 + 1, -hd.z + 0.1, 5);
  {
    const mx = -72, mz0 = 7.4, mz1 = 12.6;
    b.box('flat:#22262b', mx - 0.08, fl, mz0, mx + 0.08, fl + 2.4, mz1);
    b.sign({ k: 'stationmap', station: station.id }, mx - 0.1, fl + 1.5, 8.7, [-1, 0], 2.2, 1.6);
    b.sign({ k: 'areamap', station: station.id }, mx - 0.1, fl + 1.5, 11.2, [-1, 0], 2.2, 1.6);
    b.sign({ k: 'exits', station: station.id }, mx + 0.1, fl + 1.5, 10, [1, 0], 2.0, 1.6);
  }
  vending(b, -77, fl, hd.z - 0.5, [0, -1], 'vending');
  vending(b, -75.9, fl, hd.z - 0.5, [0, -1], 'vending2');
  b.sign({ k: 'mural', ...style.mural }, (hd.gateX + hd.x1 - R) / 2, fl + 3.1, -hd.z + 0.2, [0, 1], 14, 3.6);
  b.zone('concourse', hd.x0 - hd.bow, 0, -hd.z, hd.x1, roofY, hd.z, '駅舎', 'Station building');
  const nums = station.platforms[line.id];
  wayfindElevated({
    b, station, line, style, fl, top: roofY, cw: hd.z, x0: hd.x0, x1: hd.x1, gateX: hd.gateX,
    stairs: [{ x: hd.x1 - 1.6, z: -0.9, platform: nums[0], dir: 'down' }, { x: hd.x1 - 1.6, z: 0.9, platform: nums[1], dir: 'up' }],
    entrances: [
      { x: hd.x0, z: 0, n: [-1, 0], w: 2 * fd },
      { x: (sd0 + sd1) / 2, z: -hd.z, n: [0, -1], w: sd1 - sd0 },
      { x: (sd0 + sd1) / 2, z: hd.z, n: [0, 1], w: sd1 - sd0 },
    ],
  });
  b.setSpawn(hd.x0 + 6, fl, 0, [1, 0]);

  // ── The roof deck: open to all, by the outside stair and the lift on the north side ──
  for (const [z0, z1] of strips) b.block(bowSpan(z0, z1)[0], roofY, z0, hd.x1 - (Math.abs(z0 + 0.5) > hd.z - R ? R : 0), DY, z1);
  // Its balustrade (the model's glass): round the bow, the sides (open at the stair's landing), the back.
  const dk = S.deck;
  for (const [z0, z1] of strips) {
    const [xa, xb] = bowSpan(z0, z1);
    b.block(xa, DY, z0, xb + 0.2, DY + 1.1, z1);
  }
  for (const s of [-1, 1] as const) {
    const za = Math.min(s * (hd.z - 0.25), s * hd.z), zb = Math.max(s * (hd.z - 0.25), s * hd.z);
    if (s < 0) {
      b.block(hd.x0, DY, za, dk.land[0], DY + 1.1, zb);
      b.block(dk.land[1], DY, za, hd.x1 - R, DY + 1.1, zb);
    } else b.block(hd.x0, DY, za, hd.x1 - R, DY + 1.1, zb);
  }
  b.block(hd.x1 - R, DY, -hd.z, hd.x1, DY + 1.1, hd.z);
  b.zone('street', hd.x0 - hd.bow, DY - 0.3, -hd.z, hd.x1, DY + 6, hd.z, '潮見駅 屋上デッキ', 'Shiomi Station roof deck');
  // The outside stair along the north wall, its landing at the deck's edge, the lift beyond.
  const [sz0, sz1] = dk.stairZ, sRun = Math.round((DY - GY) * 1.7 * 100) / 100;
  stairs(b, { x0: dk.land[0] - sRun, x1: dk.land[0], z0: sz0, z1: sz1, yLow: GY, yHigh: DY, mat: 'flat:#c9c4b8' });
  b.box('flat:#c9c4b8', dk.land[0], DY - 0.3, sz0, dk.land[1], DY, -hd.z + 0.1);
  rail(b, dk.land[0], sz0 - 0.08, dk.land[1], sz0, DY);
  for (const x of [dk.land[0] + 0.3, dk.land[1] - 0.3]) b.box(NAVY, x - 0.12, GY, sz0 + 0.1, x + 0.12, DY - 0.3, sz0 + 0.34);
  b.with({ ...W_FRAME, t: [dk.land[1], 0, (sz0 + sz1) / 2] }, () => lift(b, {
    levels: [{ y: GY, ja: '地上', en: 'Street' }, { y: DY, ja: '屋上デッキ', en: 'Roof deck' }],
    mat: 'panel:#1b2f4f',
  }));
  b.sign({ k: 'label', text: '屋上デッキ', sub: 'Roof deck — the bay and Minato Center', fg: '#ffffff', bg: '#1b2f4f' }, dk.land[0] - sRun - 0.1, GY + 2.2, (sz0 + sz1) / 2, [-1, 0], 2.2, 0.6);

  // ═════ The east hall over the tunnel mouth (model shiomi/easthall) ═════
  b.with({ ...W_FRAME, t: [ea.x0, 0, 0] }, () => b.model('shiomi', 'easthall', 0, 0, 0, 0));
  b.slab(style.floor, ea.x0, -ea.z, ea.x1, ea.z, fl - 0.6, fl, []);
  const [ed0, ed1] = ea.door;
  for (const s of [-1, 1] as const) {
    const za = Math.min(s * ea.z, s * (ea.z + 0.2)), zb = Math.max(s * ea.z, s * (ea.z + 0.2));
    b.block(ea.x0, fl, za, ed0, eRoof, zb);
    b.block(ed0, fl + 2.7, za, ed1, eRoof, zb);
    for (let k = 0; k < 6; k++) {
      const t0 = (Math.PI / 2) * k / 6, t1 = (Math.PI / 2) * (k + 1) / 6;
      const p0 = [ed1 + R * Math.sin(t0), s * (ea.z - R + R * Math.cos(t0))], p1 = [ed1 + R * Math.sin(t1), s * (ea.z - R + R * Math.cos(t1))];
      b.block(Math.min(p0[0], p1[0]) - 0.1, fl, Math.min(p0[1], p1[1]) - 0.1, Math.max(p0[0], p1[0]) + 0.1, eRoof, Math.max(p0[1], p1[1]) + 0.1);
    }
    b.sign({ k: 'entrance', station: station.id }, (ed0 + ed1) / 2, fl + 3.2, s * (ea.z + 0.3), [0, s], 4.6, 0.66);
    b.sign({ k: 'guide', ja: s < 0 ? '東口（北）' : '東口（南）', en: s < 0 ? 'East exit (north)' : 'East exit (south)', bg: 'yellow', arrow: 'up' }, (ed0 + ed1) / 2, fl + 2.35, s * (ea.z - 0.1), [0, -s], 3.2, 0.42);
  }
  b.block(ea.x1 - 0.3, fl, -ea.z + R, ea.x1, eRoof, ea.z - R);
  b.block(ea.x0 - 0.1, fl, -ea.z, ea.x0 + 0.1, eRoof, -1.96);
  b.block(ea.x0 - 0.1, fl, 1.96, ea.x0 + 0.1, eRoof, ea.z);
  b.block(ea.x0 - 0.1, fl + 2.4, -1.96, ea.x0 + 0.1, eRoof, 1.96);
  rail(b, ea.x0 - 0.1, -1.96, ea.x0 + 0.1, -1.88, fl);
  rail(b, ea.x0 - 0.1, 1.88, ea.x0 + 0.1, 1.96, fl);
  b.block(ea.x0 - 0.2, eRoof, -ea.z - 0.2, ea.x1, eRoof + 0.4, ea.z + 0.2);
  for (let x = ea.x0 + 1.5; x + 2.2 <= ea.x1 - 1; x += 4) for (const z of [-6, 0, 6]) ceilingLight(b, x, x + 2.2, z - 0.2, z + 0.2, eRoof - 0.04);
  for (const s of [-1, 1]) b.deco(COVE, ea.x0 + 0.3, eRoof - 0.4, Math.min(s * (ea.z - 0.3), s * (ea.z - 0.2)), ed0 - 0.3, eRoof - 0.34, Math.max(s * (ea.z - 0.3), s * (ea.z - 0.2)));
  b.with({ t: [ea.gateX, 0, 0] }, () => gateLine(c, fl, ea.z, [line.id], eRoof - fl));
  ticketMachines(c, fl, ed1 + 0.2, -ea.z + R + 0.1, 2, false);
  b.hang({ k: 'guide', ja: 'のりば 1・2番線', en: 'Platforms 1 & 2', bg: 'navy', badges: [line.id], arrow: 'down' }, ea.x0 + 1.6, fl + 2.6, 0, 3.4, 0.46,
    { ceil: eRoof, back: { k: 'guide', ja: '出口', en: 'Exit', bg: 'yellow', arrow: 'up' } });
  b.hang({ k: 'guide', ja: '北口・南口', en: 'North / South exits', bg: 'yellow', arrow: 'up' }, ea.x1 - 3, fl + 2.6, 0, 3.4, 0.46,
    { ceil: eRoof, back: { k: 'guide', ja: 'のりば', en: 'To trains', bg: 'navy', badges: [line.id] } });
  b.zone('concourse', ea.x0, 0, -ea.z, ea.x1, eRoof, ea.z, '東口', 'East hall');

  // ── The streets round it (shiomi-street.ts): the station's cutting, buildings and the bow are holes in its ground ──
  const wells: Rect[] = [
    [hd.x1 - 0.01, -wz, ea.x0 + 0.01, wz], [hd.x0, -hd.z, hd.x1, hd.z], [ea.x0, -ea.z, ea.x1, ea.z],
    ...strips.map(([z0, z1]): Rect => [bowSpan(z0, z1)[0], z0, hd.x0, z1]),
  ];
  shiomiStreet(c, wells);
  shiomiFill(b, spec.surface.seed);
  shiomiExtras(b, spec.surface.seed);
}
