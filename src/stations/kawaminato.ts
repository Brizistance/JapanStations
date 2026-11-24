// Kawaminato Station, the AR Main Line's station on the viaduct behind the Mioya terminal and
// behind its own brick station building of 1914 (docs/akitsushima-railway.md, "Grand Kawaminato
// Station"). It stands in the hub's plot and is built in the hub's frame (+x east, +z south),
// called from hub-street.ts; it has no station world of its own.
//
// What you see of the structure is the viaduct's models (tools/blender/build_viaduct.py: the
// hollow bays ho8 he8 hl8 hs8 of the old viaduct, nh8 nc8 of the widening north of it, and the
// platforms carried over every piece). This file is the inside: floors, inner walls, stairs, the
// lift, the gates, the bridge, colliders and zones.
//
//   y  0.15  the street: the central passage and the concourse inside the gates
//      6.0   the mezzanine at the concourse's east end, the gallery along the south wall and the
//            bridge to Mioya's level 2
//     10.25  the platforms (rail 9.15)
//
//   z −119 … −106    the widening (inner face −118.1): the station building's great hall stands against it
//   z −106 … −80     the old viaduct (inner faces −105.1 and −80.9); a row of brick arches between the two
//   z −101.8 … −96.4 the middle island, platforms 3·4 towards Kirigahara (stair well −100.4 … −97.8)
//   z −89.6 … −84.2  the south island, platforms 5·6 towards Asanagi (x −125 … 127, 12 cars; stair well −88.2 … −85.6); on both, the Rapids take the inner face
//   z −85.5 … −80.9  the gallery at +6.0 from the bridge's door (x 4.5 … 7.5) east to x 13, and its stair down into the east concourse
//
//   x −12 … 12   the central passage, free: from the great hall's back through three arches, under all six
//                tracks between brick piers 8 m apart, out to Ekiura-dōri by two arches
//   x ±12        a fence each side, and two gates in each: the Hokuei Gate under the widening (z −115.6 … −107), by the
//                great hall, and the Central Gate under the middle island (z −103.4 … −94.8)
//   x ±(12 … 60) the paid concourses, to the street bridges' abutments; a lift to the south island each side (|x| 12.4 … 14.7)
//   |x| 16.6 → 36, 40.6 → 60   the platform stairs, each one straight flight in a brick stair house: up from the
//                concourse to a landing at +6.0, then through the deck to the platform (GROUPS below)
//   bridge       the bridge concourse: a deck at +16.5 over all six tracks under the train shed (the models':
//                build_viaduct.py shed()), from the great hall's upper gallery through a gate line; wings and
//                stairs down to the middle and south islands, the lifts up through the south wings, a lift from each middle wing down to its island

import { lineById, linesAt, platformFor, platformsFor, stationById } from '../data/network';
import type { Dir } from '../data/types';
import { INDOOR_LAMP } from '../render/lamps';
import type { SignContent } from '../signs/content';
import type { Builder, V3 } from '../world/builder';
import { fitting } from './fittings';
import { GROUND_Y as GY, PF_H, psd, rail, ticketMachines, vending, type Ctx, type StationStyle } from './kit';
import { LIFT_OUT, lift } from './lift';

/** The viaduct's faces (the widening's north one, the old north one between the two, the south one), and their inner sides. */
const NN = -119, N = -106, S = -80, FACE = 0.9, NNI = NN + FACE, NI = N + FACE, SI = S - FACE;
/** The islands' edges and their stairs' wells; the stair up to the mezzanine; the levels. */
const PZ: [number, number] = [-89.6, -84.2], PZM: [number, number] = [-101.8, -96.4], WELL: [number, number] = [-88.2, -85.6], WELL_M: [number, number] = [-100.4, -97.8];
const MEZZ = 6.0, SOFFIT = 8.3;
/** Along x: the passage, the concourse, the stair up to the mezzanine, the platform stairs (head, foot), the lift. */
const PASSAGE: [number, number] = [-12, 12], GATE_X = 12, CON = 60;
/** A platform stair, by distance from the passage's middle: its foot, its landing at +6.0, its well in the deck (the upper flight), the arch through its house. */
const FOOT_U = 16.64, LAND_U: [number, number] = [26.7, 28.5], WX: [number, number] = [28.5, 36], OPEN_U: [number, number] = [28.4, 34.8];
/** The stair groups, each the first one (east of the passage) turned to side `sx` and moved `dx` further out. One lift each side. */
interface Group { sx: 1 | -1; dx: number; lift: boolean }
const GROUPS: Group[] = [{ sx: 1, dx: 0, lift: true }, { sx: 1, dx: 24, lift: false }, { sx: -1, dx: 0, lift: true }, { sx: -1, dx: 24, lift: false }];
/** The pieces whose south island has no lamp standard, bench or sign frame (a stair's head and a lift come up there), and those without the bench only. */
export const AR_BARE = ['hl8', 'hw8', 'hl8w', 'hw8w', 'hsr8', 'hsl8'], AR_NO_BENCH = [...AR_BARE, 'hcr8'];
/** Every bare piece has no lamp rail either: lifts' shafts and stairs take the islands' middles there. */
const AR_NO_RAIL = AR_BARE;
/** The bridge concourse over the tracks: its floor, its half width, its wings' outer ends (where the stairs down begin), the stairs' feet. */
const UY = 16.5, UX = 12, WING = 16.5, BFOOT = Math.round((WING + (UY - 10.25) * 1.72) * 100) / 100;
const LIFT_X: [number, number] = [12.4, 14.7];
/** The bridge from Mioya, and the gallery from its door to the mezzanine. */
const BRIDGE: [number, number] = [4.5, 7.5], GAL_X = 4, GAL_Z = -85.5, GAL_E = 13, MS: [number, number] = [-85.0, -83.4];
/** Tracks' centres under which the hollow bays' brick piers stand (1 m deep, 0.35 thick at each bay end); the bays' joints. */
const PIER_Z = [-115.6, -107.0, -103.4, -94.8, -91.2, -82.6], JOINTS = Array.from({ length: 16 }, (_, i) => -60 + 8 * i), BAYS = Array.from({ length: 15 }, (_, i) => -56 + 8 * i);

const FLOOR = 'floor:#bdb7a8', TILE = 'tile:#e9e4d6', DADO = 'tile:#6f8f86', STEEL = 'metal:#5d6a72', BRICK = 'brick:#6e3a2d';

/**
 * Exit 15 of the metro (hub.ts court() builds it; hub-street.ts keeps the great hall's floor off its well). It leaves
 * Mioya's food floor by a doorway in the north wall and climbs north under the central passage into the station
 * building's great hall, in the corner behind the east arch's pier: the stair's sides, its foot, where it comes out
 * from under the passage into the open (its head is `exit15Run` north of the foot). Its lift stands in the hall's
 * other corner, the door looking east (x of the shaft, z of its middle), with a corridor of its own below (x).
 */
export const EXIT15 = { x: [10.5, 13.3] as [number, number], foot: -114, open: -120, lift: { x: [-13.45, -11.15] as [number, number], z: -121.15, hall: [-11.15, -8.9] as [number, number] } };
/** The stair's run for a concourse floor at `cf` (as every exit stair: kit.ts exit()). */
export const exit15Run = (cf: number) => Math.round((GY - cf) * 1.72 * 100) / 100;

/** Where a teleport to the station lands, in the hub's frame: on the platform east of the stairs, looking west. */
export const KAWAMINATO_SPAWN: { pos: V3; yaw: number } = { pos: [44, 10.25, -86.9], yaw: Math.PI / 2 };

/** AR's sign style: white on dark grey (its boards' teal comes from the line's colour). The yellow is the way out. */
const AR = (text: string, sub: string): SignContent => ({ k: 'label', text, sub, fg: '#ffffff', bg: '#2b2e33' });
const OUT = (text: string, sub: string): SignContent => ({ k: 'label', text, sub, fg: '#1b1f24', bg: '#ffd100' });
/** A board on a dark backing, on a wall whose face is at (x, z) and looks along `n`. */
function board(b: Builder, c: SignContent, x: number, y: number, z: number, n: [number, number], w: number, h: number, dynamic = false) {
  const ax = Math.abs(n[1]) * (w / 2 + 0.06), az = Math.abs(n[0]) * (w / 2 + 0.06);
  b.deco('flat:#17181b', Math.min(x - ax, x + n[0] * 0.04 - ax), y - h / 2 - 0.06, Math.min(z - az, z + n[1] * 0.04 - az), Math.max(x + ax, x + n[0] * 0.04 + ax), y + h / 2 + 0.06, Math.max(z + az, z + n[1] * 0.04 + az));
  b.sign(c, x + n[0] * 0.05, y, z + n[1] * 0.05, n, w, h, dynamic ? { dynamic: true } : {});
}

/**
 * What the game adds at each platform piece (hub-street.ts calls this with the piece's centre x; the models hang the
 * lamps): on the sign frame the models hang there (build_viaduct.py platforms(): 1.8 × 0.5, 2.3 m west of the
 * centre) a station name board or the way out, by turns; a live departure board instead at two of them. On the
 * lamp rail's standard an enamel name plate each way along the platform, as the old stations had. All of it on
 * both islands in use; on the widening's island, not in use, a board saying so on every other frame.
 */
export function platformPiece(b: Builder, x: number, base: string, k: number) {
  const line = lineById('AR'), station = stationById('kawaminato');
  const P = line.railY[line.stops.indexOf(station.id)] + PF_H;
  const fx = x - 2.3, fy = P + 2.65, bare = AR_BARE.includes(base);
  // (The widening's island, not in use.)
  if (k % 2 === 0) for (const n of [-1, 1] as const) b.sign({ k: 'label', text: 'このホームは使用していません', sub: 'This platform is not in use', fg: '#ffffff', bg: '#c8102e' }, fx, fy, -111.3 + n * 0.06, [0, n], 1.8, 0.5);
  for (const [zc, dir] of [[(PZ[0] + PZ[1]) / 2, 'down'], [(PZM[0] + PZM[1]) / 2, 'up']] as const) {
    // (The lamps the models hang, lit: build_viaduct.py platforms(), 0.5 m west and 3.5 m east of the piece's centre.)
    if (!AR_NO_RAIL.includes(base)) for (const dx of [-0.5, 3.5]) b.mesh(INDOOR_LAMP, 'sphere', x + dx, P + 2.87, zc, 0.15, 0.12, 0.15);
    if (bare) continue;
    for (const n of [-1, 1] as const) b.sign({ k: 'shop', ja: station.nameKana, bg: '#1f3f7a', fg: '#ffffff', vertical: true }, x + n * 0.15, P + 1.5, zc, [n, 0], 0.2, 1.0); // (between the standard's base and its collar)
    if (k % 2 === 1) {
      // An enamel plate over each face, on an arm from the standard: the platform's number, what stops there and where it goes.
      const svc = Object.entries(line.fanAt!.lateral).sort((p, q) => p[1][dir] - q[1][dir]).map(([id]) => line.services!.find((q) => q.id === id)!), dest = line.beyond![dir];
      b.deco('metal:#2f4a3c', x - 0.04, P + 3.06, zc - 2.3, x + 0.04, P + 3.12, zc + 2.3);
      svc.forEach((sv, i) => {
        // (The first is the one on the more southerly track.)
        const z = zc + (i === 0 ? 1.4 : -1.4), no = platformFor(station, line, dir, sv.id);
        b.deco('flat:#17181b', x - 0.03, P + 2.5, z - 0.9, x + 0.03, P + 3.06, z + 0.9);
        for (const n of [-1, 1] as const) b.sign({ k: 'label', text: `${no}　${sv.nameJa} ${dest.nameJa}方面`, sub: `Platform ${no} — ${sv.nameEn} for ${dest.nameRomaji}`, fg: '#ffffff', bg: '#1f3f7a' }, x + n * 0.04, P + 2.78, z, [n, 0], 1.7, 0.5);
      });
    }
    if (Math.round(x) === 40 || Math.round(x) === -40 || Math.abs(Math.abs(x) - 88) < 4) {
      // (Its underside 2.15 m over the platform, its top under the lamp rail. Each island's board lists its own direction.)
      b.deco('flat:#17181b', fx - 1.35, fy - 0.5, zc - 0.06, fx + 1.35, fy + 0.5, zc + 0.06);
      for (const n of [-1, 1] as const) b.sign({ k: 'ardep', station: station.id, line: line.id, dir }, fx, fy, zc + n * 0.07, [0, n], 2.6, 0.92, { dynamic: true });
      continue;
    }
    for (const n of [-1, 1] as const) {
      // (A board whose face looks north is read looking south: east is then on the left. The nearest stair's head is at x ±36: east of a piece between the two, west of the others.)
      const east = x > 0 ? x < WX[1] : x < -WX[1], arrow = east === n < 0 ? '←' : '→';
      const c: SignContent = k % 2 === 0 ? { k: 'arname', station: station.id, line: line.id, flip: n > 0 } : OUT(arrow === '←' ? '← 出口' : '出口 →', 'Exit — Hokuei, Central, Bridge and Mioya Gates');
      b.sign(c, fx, fy, zc + n * 0.06, [0, n], 1.8, 0.5);
    }
  }
}

export interface KawaminatoOpts {
  /** The platforms' ends along x (bay joints). */
  ends: [number, number];
  style: StationStyle;
}

/** Ticket gates in a row across z at x = 0, centred on z = 0: `n` cabinets, the unpaid side at +x. */
function fareGates(b: Builder, y: number, n: number) {
  const first = (-(n - 1) / 2) * 1.05;
  for (let i = 0; i < n; i++) {
    const z = first + i * 1.05;
    b.block(-0.8, y, z - 0.13, 0.8, y + 1.0, z + 0.13);
    fitting(b, 'gatecab', 0, y, z);
    b.deco(i % 3 === 0 ? 'glow:#e53935' : 'glow:#32c86a', 0.78, y + 0.72, z - 0.06, 0.81, y + 0.86, z + 0.06);
  }
}
/** A fence with a glazed top, along z at x. */
function fence(b: Builder, x: number, y: number, z0: number, z1: number) {
  if (z1 - z0 < 0.05) return;
  b.box('metal:#c4c8cc', x - 0.05, y, z0, x + 0.05, y + 1.15, z1);
  b.deco('glass', x - 0.02, y + 1.15, z0, x + 0.02, y + 1.9, z1);
  b.block(x - 0.05, y + 1.15, z0, x + 0.05, y + 1.9, z1);
}
/**
 * The room's side of an arch wall over its 6 m opening (the models' arch faces are one skin, seen from outside
 * only): brick stepped to the arch's curve, 0.1 thick from z = zi towards `dz`, up to `top`.
 */
function archSkin(b: Builder, c: number, zi: number, dz: 1 | -1, top = SOFFIT) {
  const z0 = Math.min(zi, zi + dz * 0.1), z1 = Math.max(zi, zi + dz * 0.1), Y0 = GY + 2.95, RISE = 2.65, STEPS = 7;
  for (let k = 0; k < STEPS; k++) {
    const y0 = Y0 + (RISE * k) / STEPS, y1 = Y0 + (RISE * (k + 1)) / STEPS;
    const half = 3 * Math.sqrt(Math.max(0, 1 - (((y0 + y1) / 2 - Y0) / RISE) ** 2));
    for (const sx of [-1, 1]) b.box(BRICK, Math.min(c + sx * half, c + sx * 3), y0, z0, Math.max(c + sx * half, c + sx * 3), y1, z1);
  }
  if (top > Y0 + RISE) b.box(BRICK, c - 3, Y0 + RISE, z0, c + 3, top, z1);
}

export function kawaminatoStation(b: Builder, o: KawaminatoOpts) {
  const line = lineById('AR'), station = stationById('kawaminato');
  const P = line.railY[line.stops.indexOf(station.id)] + PF_H;
  const [E0, E1] = o.ends;
  const name = { ja: `${station.nameJa}駅`, en: `${station.nameRomaji} Sta.` };
  /** The two islands in use, the tracks paired by direction: the south one towards Asanagi, the middle one towards Kirigahara. */
  const ISLES: { pz: [number, number]; well: [number, number]; dir: Dir; nums: number[] }[] = [
    { pz: PZ, well: WELL, dir: 'down', nums: platformsFor(station, line, 'down') }, { pz: PZM, well: WELL_M, dir: 'up', nums: platformsFor(station, line, 'up') },
  ];
  const nums = ISLES.flatMap((q) => q.nums).sort((p, q) => p - q);
  const label = (n: number[]) => ({ ja: `${n.join('・')}番のりば`, en: `Platforms ${n.join('·')}` });
  /** A direction's service types, the one on the more southerly track first (LineDef.fanAt). */
  const faces = (dir: Dir) => Object.entries(line.fanAt!.lateral).sort((p, q) => p[1][dir] - q[1][dir]).map(([id]) => id);
  const c: Ctx = { b, line, station, stop: line.stops.indexOf(station.id), railY: P - PF_H, style: o.style };
  /** A stair group's x from a to e (given for the first group east of the passage), low first. */
  const span = (g: Group, a: number, e: number): [number, number] => [Math.min(g.sx * (a + g.dx), g.sx * (e + g.dx)), Math.max(g.sx * (a + g.dx), g.sx * (e + g.dx))];
  /** −CON … CON less these stretches. */
  const less = (hs: [number, number][], a = -CON, e = CON) => {
    const out: [number, number][] = [];
    let at = a;
    for (const [h0, h1] of [...hs].sort((p, q) => p[0] - q[0])) { if (h0 > at) out.push([at, h0]); at = Math.max(at, h1); }
    if (e > at) out.push([at, e]);
    return out;
  };
  const wells = GROUPS.map((g) => span(g, WX[0], WX[1])), lifts = GROUPS.filter((g) => g.lift).map((g) => span(g, LIFT_X[0], LIFT_X[1]));

  // ═════════ The two islands in use: their floors (the models draw them), the gates at both edges, the ends ═════════
  for (const [i, isle] of ISLES.entries()) {
    const { pz, well, dir } = isle, holes = i === 0 ? [...wells, ...lifts] : wells, [south, north] = faces(dir);
    for (const [z0, z1] of [[pz[0], well[0]], [well[1], pz[1]]]) b.block(E0, P - 1.4, z0, E1, P, z1);
    for (const [x0, x1] of less(holes, E0, E1)) b.block(x0, P - 1.4, well[0], x1, P, well[1]);
    // No queue marks where the island is only a strip beside a stair or a lift; the models paint the edges.
    const queue = (x: number) => ![...wells, ...lifts, [WING, BFOOT], [-BFOOT, -WING]].some(([h0, h1]) => x > h0 - 1.4 && x < h1 + 1.4);
    // (Each face is one service type's: the gates open for its trains only.)
    psd(c, pz[1], -1, dir, P, o.ends, { queue, paint: false, service: south });
    psd(c, pz[0], 1, dir, P, o.ends, { queue, paint: false, service: north });
    for (const x of o.ends) {
      b.block(x - 0.06, P, pz[0], x + 0.06, P + 1.3, pz[1]);
      b.deco(STEEL, x - 0.04, P, pz[0], x + 0.04, P + 1.2, pz[1]);
      b.sign({ k: 'label', text: '立入禁止', sub: 'No entry beyond this point', fg: '#ffffff', bg: '#c8102e' }, x + (x < 0 ? 0.06 : -0.06), P + 0.75, (pz[0] + pz[1]) / 2, [x < 0 ? 1 : -1, 0], 1.6, 0.4);
    }
    // Rails round each stair's well (open at its head, the end further from the passage).
    for (const g of GROUPS) {
      const [w0, w1] = span(g, WX[0], WX[1]), foot = span(g, WX[0] - 0.08, WX[0]);
      rail(b, w0, well[0] - 0.08, w1, well[0], P);
      rail(b, w0, well[1], w1, well[1] + 0.08, P);
      rail(b, foot[0], well[0] - 0.08, foot[1], well[1] + 0.08, P);
    }
    b.zone('platform', E0, P - 0.2, pz[0], E1, P + 3.6, pz[1], `${name.ja} ${label(isle.nums).ja}`, `${name.en} — ${label(isle.nums).en}`, true, line.id);
  }

  // ═════════ The lifts: concourse, south island and bridge concourse, one each side of the passage, the door looking away from it ═════════
  for (const g of GROUPS) {
    if (!g.lift) continue;
    b.with({ rot: g.sx > 0 ? 1 : 3, t: [g.sx * (LIFT_X[1] + g.dx), 0, (PZ[0] + PZ[1]) / 2] }, () => lift(b, { mat: BRICK, levels: [
      { y: GY, ja: '1階 改札内', en: '1F Concourse' }, { y: P, ja: `のりば ${ISLES[0].nums.join('・')}番線`, en: label(ISLES[0].nums).en }, { y: UY, ja: '橋上コンコース', en: 'Bridge concourse' },
    ] }));
  }
  // (The middle island's: from its platform to the bridge concourse only. The Central Gate stands under it.)
  for (const sx of [-1, 1]) b.with({ rot: sx > 0 ? 1 : 3, t: [sx * LIFT_X[1], 0, (PZM[0] + PZM[1]) / 2] }, () => lift(b, { mat: BRICK, levels: [
    { y: P, ja: `のりば ${ISLES[1].nums.join('・')}番線`, en: label(ISLES[1].nums).en }, { y: UY, ja: '橋上コンコース', en: 'Bridge concourse' },
  ] }));

  // ═════════ The floor under the tracks, the piers, the arch walls ═════════
  b.box(FLOOR, -CON, GY - 0.2, NN, CON, GY + 0.012, S);
  // (A darker band down each side of the passage, and across it at the rows of arches.)
  for (const x of [PASSAGE[0] + 0.6, PASSAGE[1] - 1.0]) b.deco('flat:#8f6a52', x, GY + 0.012, NNI, x + 0.4, GY + 0.016, SI);
  // The models' brick piers under the tracks, at the bays' joints (and the arches sprung between them, which nobody reaches).
  for (const x of JOINTS) {
    const [a, e] = [x === -CON ? x : x - 0.35, x === CON ? x : x + 0.35];
    for (const z of PIER_Z) b.block(a, GY, z - 0.5, e, SOFFIT, z + 0.5);
  }
  // The three arch walls. Open arches: the passage's at both ends, and every one between the widening and the
  // old viaduct. Shut: the concourses' north ones (the station building's wings stand there) and their glazed south
  // ones; the passage's east bay south, glazed under the bridge's door.
  for (const cx of BAYS) {
    const free = Math.abs(cx) < GATE_X;
    const wall = (z0: number, z1: number, open: boolean, top = SOFFIT) => {
      if (open) for (const [a, e] of [[cx - 4, cx - 3], [cx + 3, cx + 4]]) b.block(a, GY, z0, e, SOFFIT, z1);
      else b.block(cx - 4, GY, z0, cx + 4, top, z1);
    };
    wall(NN, NNI, free);
    archSkin(b, cx, free ? NNI : NNI + 0.11, 1); // (a shut arch has a panel of its own in the first 0.1 m)
    wall(N, NI, true);
    archSkin(b, cx, NI, 1);
    const door = cx === 8;
    wall(SI, S, free && !door, door ? MEZZ - 0.3 : SOFFIT);
    archSkin(b, cx, SI, -1, door ? GY + 5.75 : SOFFIT);
  }
  // (Round the bridge's door in the passage's east bay, at the gallery's level.)
  b.block(4, MEZZ - 0.3, SI, BRIDGE[0], SOFFIT, S);
  b.block(BRIDGE[1], MEZZ - 0.3, SI, 12, SOFFIT, S);
  b.block(BRIDGE[0], MEZZ + 2.15, SI, BRIDGE[1], SOFFIT, S);
  // The concourses' ends: the street bridges' abutments stand there (hub-street.ts); a tiled dado on them.
  for (const sx of [-1, 1]) {
    b.block(Math.min(sx * CON, sx * (CON + 0.3)), GY, NN, Math.max(sx * CON, sx * (CON + 0.3)), SOFFIT, S);
    b.box(BRICK, Math.min(sx * CON, sx * (CON - 0.04)), GY + 1.2, NNI, Math.max(sx * CON, sx * (CON - 0.04)), SOFFIT, SI);
    b.deco(DADO, Math.min(sx * (CON - 0.04), sx * (CON - 0.06)), GY, NNI, Math.max(sx * (CON - 0.04), sx * (CON - 0.06)), GY + 1.2, SI);
    b.box(BRICK, Math.min(sx * CON, sx * (CON - 0.04)), GY, NNI, Math.max(sx * CON, sx * (CON - 0.04)), GY + 1.2, SI);
  }
  // Lights: strips under the deck in every bay, a row of globes hung down the passage's middle and down each concourse's north aisle.
  for (const x of BAYS) for (const z of Math.abs(x) > GATE_X ? [-111.3, -93] : [-111.3, -99.1, -86.9]) b.deco('light', x - 1.6, SOFFIT - 0.05, z - 0.12, x + 1.6, SOFFIT, z + 0.12);
  // The deck itself, over all of it but the stairs' wells and the lifts: nothing falls through from the tracks, nobody jumps up into it.
  {
    const all = less([]);
    const strips: [number, number, [number, number][]][] = [
      [NN, WELL_M[0], all], [WELL_M[0], WELL_M[1], less(wells)], [WELL_M[1], WELL[0], all], [WELL[0], WELL[1], less([...wells, ...lifts])], [WELL[1], S, all],
    ];
    for (const [z0, z1, xs] of strips) for (const [x0, x1] of xs) b.block(x0, SOFFIT, z0, x1, P - 1.4, z1);
  }
  for (const z of [-111.3, -99.1, -93, -86.9]) for (const x of [-8, 0, 8]) {
    if (x === 8 && z > GAL_Z - 2) continue; // (the gallery hangs there)
    b.deco(STEEL, x - 0.02, 6.0, z - 0.02, x + 0.02, SOFFIT, z + 0.02);
    b.mesh(INDOOR_LAMP, 'sphere', x, 5.8, z, 0.28, 0.28, 0.28);
  }
  for (const x of BAYS) if (Math.abs(x) > GATE_X) {
    b.deco(STEEL, x - 0.02, 6.0, -111.32, x + 0.02, SOFFIT, -111.28);
    b.mesh(INDOOR_LAMP, 'sphere', x, 5.8, -111.3, 0.28, 0.28, 0.28);
  }

  // ═════════ The fence along each side of the passage, and the two gates in each ═════════
  const gz = (PIER_Z[0] + PIER_Z[1]) / 2, gzc = (PIER_Z[2] + PIER_Z[3]) / 2;
  /** The ticket machines stand against the east fence south of its Central Gate, on a tiled wall of their own. */
  const TM: [number, number] = [PIER_Z[4] + 0.5, PIER_Z[5] - 0.5];
  for (const sx of [-1, 1]) {
    const reach = 3 * 1.05 + 0.13, x = sx * GATE_X;
    // (The cabinets' unpaid side is their +x: turned round on the east fence.)
    b.with({ rot: sx > 0 ? 2 : 0, t: [x, 0, gz] }, () => fareGates(b, GY, 7));
    fence(b, x, GY, PIER_Z[0] + 0.5, gz - reach);
    fence(b, x, GY, gz + reach, PIER_Z[1] - 0.5);
    fence(b, x, GY, NNI, PIER_Z[0] - 0.5);
    // (The arch wall's pier stands on the fence's line between the widening and the old viaduct.)
    fence(b, x, GY, PIER_Z[1] + 0.5, N);
    fence(b, x, GY, NI, PIER_Z[2] - 0.5);
    b.with({ rot: sx > 0 ? 2 : 0, t: [x, 0, gzc] }, () => fareGates(b, GY, 7));
    fence(b, x, GY, PIER_Z[2] + 0.5, gzc - reach);
    fence(b, x, GY, gzc + reach, PIER_Z[3] - 0.5);
    for (let i = 3; i < PIER_Z.length; i++) {
      const z0 = PIER_Z[i] + 0.5, z1 = (PIER_Z[i + 1] ?? SI + 0.5) - 0.5;
      if (sx > 0 && z0 === TM[0]) b.box(TILE, x - 0.1, GY, z0, x + 0.1, GY + 2.9, z1);
      else fence(b, x, GY, z0, z1);
    }
    b.zone('concourse', Math.min(x, sx * CON), GY - 0.2, NNI, Math.max(x, sx * CON), MEZZ - 0.2, SI, `${name.ja} 改札内コンコース（${sx > 0 ? '東' : '西'}）`, `${name.en} — ${sx > 0 ? 'east' : 'west'} concourse, inside the gates`, false);
  }
  b.zone('concourse', PASSAGE[0], GY - 0.2, NN, PASSAGE[1], MEZZ - 0.2, S, `${name.ja} 中央通路`, `${name.en} — Central Passage`, false);

  // ═════════ The platform stairs: one straight flight each, in a brick stair house between two rows of piers ═════════
  // From its foot (FOOT_U from the passage's middle) it rises away from the passage to a landing at +6.0, then on up
  // through the deck to the platform. Below the landing the stair is open between brick parapets; from the landing
  // on it is walled to the deck, and an arch goes through the house under the upper flight, aisle to aisle.
  const pf = label(nums).ja, pfEn = label(nums).en;
  const metro = stationById(station.transfer!), metroLines = linesAt(metro.id).map((l) => l.id);
  const STEP = 'flat:#cfc8b8', STONE = 'flat:#ddd6c6', BRASS = 'metal:#8a7a52', WT = 0.3, ARCH_Y = GY + 5.2;
  /** A flight along x from (xl, yl) up to (xh, yh), its treads drawn down to `bottom`, or `soffit` thick where it is open underneath. */
  const flight = (xl: number, xh: number, z0: number, z1: number, yl: number, yh: number, bottom: number, soffit = 0) => {
    const n = Math.max(2, Math.round((yh - yl) / 0.165)), dx = (xh - xl) / n, dy = (yh - yl) / n;
    b.ramp(Math.min(xl, xh), z0, Math.max(xl, xh), z1, yl, yh, [Math.sign(xh - xl), 0]);
    for (let i = 0; i < n; i++) {
      const xa = xl + i * dx, top = yl + (i + 1) * dy;
      b.deco(STEP, Math.min(xa, xa + dx), soffit ? top - dy - soffit : bottom, z0, Math.max(xa, xa + dx), top, z1);
      b.deco(BRASS, Math.min(xa, xa + dx * 0.1), top - 0.02, z0, Math.max(xa, xa + dx * 0.1), top + 0.004, z1);
    }
  };
  /** A brick parapet beside a flight, stepped with it: 1.1 m over the treads, a stone coping on each step. */
  const parapet = (xl: number, xh: number, z0: number, z1: number, yl: number, yh: number) => {
    const n = Math.max(1, Math.round(Math.abs(xh - xl) / 1.25)), dx = (xh - xl) / n;
    for (let i = 0; i < n; i++) {
      const xa = xl + i * dx, top = yl + ((yh - yl) * (i + 1)) / n + 1.1;
      b.box(BRICK, Math.min(xa, xa + dx), GY, z0, Math.max(xa, xa + dx), top, z1);
      b.deco(STONE, Math.min(xa, xa + dx), top, z0 - 0.03, Math.max(xa, xa + dx), top + 0.08, z1 + 0.03);
    }
  };
  for (const g of GROUPS) {
    const U = (u: number) => g.sx * (u + g.dx);
    const land = span(g, LAND_U[0], LAND_U[1]), solid = span(g, LAND_U[0], OPEN_U[0]), far = span(g, OPEN_U[1], WX[1] + WT), mouth = span(g, OPEN_U[0], OPEN_U[1]);
    const oc = (mouth[0] + mouth[1]) / 2, ohw = (mouth[1] - mouth[0]) / 2;
    for (const isle of ISLES) {
      const [w0, w1] = isle.well, zc = (w0 + w1) / 2, lab = label(isle.nums);
      flight(U(FOOT_U), U(LAND_U[0]), w0, w1, GY, MEZZ, GY - 0.02);
      b.box(STEP, land[0], MEZZ - 0.3, w0, land[1], MEZZ, w1);
      flight(U(LAND_U[1]), U(WX[1]), w0, w1, MEZZ, P, ARCH_Y);
      // (What is under the landing and the flight's head; the ceiling of the arch through the house.)
      b.box(BRICK, solid[0], GY, w0, solid[1], MEZZ - 0.3, w1);
      b.box(BRICK, far[0], GY, w0, far[1], SOFFIT, w1);
      b.box(BRICK, span(g, OPEN_U[0], LAND_U[1])[0], ARCH_Y, w0, span(g, OPEN_U[0], LAND_U[1])[1], MEZZ - 0.3, w1);
      b.block(mouth[0], ARCH_Y, w0, mouth[1], MEZZ, w1);
      for (const [z0, z1] of [[w0 - WT, w0], [w1, w1 + WT]]) {
        parapet(U(FOOT_U), U(LAND_U[0]), z0, z1, GY, MEZZ);
        // The house's wall: whole from the landing to the arch and beyond it, stepped to the arch's curve over it.
        b.box(BRICK, solid[0], GY, z0, solid[1], SOFFIT, z1);
        b.box(BRICK, far[0], GY, z0, far[1], SOFFIT, z1);
        const Y0 = GY + 2.6, RISE = ARCH_Y - Y0, STEPS = 7;
        for (let k = 0; k < STEPS; k++) {
          const y0 = Y0 + (RISE * k) / STEPS, y1 = Y0 + (RISE * (k + 1)) / STEPS;
          const half = ohw * Math.sqrt(Math.max(0, 1 - (((y0 + y1) / 2 - Y0) / RISE) ** 2));
          for (const s of [-1, 1]) b.box(BRICK, Math.min(oc + s * half, oc + s * ohw), y0, z0, Math.max(oc + s * half, oc + s * ohw), y1, z1);
        }
        b.box(BRICK, mouth[0], ARCH_Y, z0, mouth[1], SOFFIT, z1);
        // (Stone: the arch's imposts, a band at the landing's level.)
        for (const x of [mouth[0], mouth[1]]) b.deco(STONE, x - 0.25, Y0 - 0.2, z0 - 0.03, x + 0.25, Y0, z1 + 0.03);
        b.deco(STONE, Math.min(solid[0], far[0]), MEZZ - 0.3, z0 - 0.03, Math.max(solid[1], far[1]), MEZZ - 0.1, z1 + 0.03);
      }
      // (The house's end wall under the stair's head.)
      b.deco(STONE, far[0], MEZZ - 0.3, w0 - WT - 0.03, far[1], MEZZ - 0.1, w1 + WT + 0.03);
      b.deco('light', oc - 1.2, ARCH_Y - 0.04, zc - 0.1, oc + 1.2, ARCH_Y, zc + 0.1);
      b.deco('light', land[0] + 0.3, SOFFIT - 0.04, zc - 0.1, land[1] - 0.3, SOFFIT, zc + 0.1);
      const xf = U(FOOT_U), n: [number, number] = [-g.sx, 0];
      {
        // Over its foot, hung from the deck: where it goes.
        for (const z of [w0 + 0.1, w1 - 0.1]) b.deco(STEEL, xf - 0.02, GY + 3.5, z - 0.02, xf + 0.02, SOFFIT, z + 0.02);
        b.deco('flat:#17181b', xf - 0.04, GY + 2.95, w0, xf + 0.04, GY + 3.5, w1);
        b.sign(AR(`${lab.ja}　階段 ↑`, `${lab.en} — stairs up`), xf - g.sx * 0.05, GY + 3.22, zc, n, 2.5, 0.5);
        b.zone('concourse', Math.min(span(g, LAND_U[0] - 0.4, LAND_U[0])[0], far[0]), MEZZ - 0.2, w0, Math.max(span(g, LAND_U[0] - 0.4, LAND_U[0])[1], far[1]), P - 0.2, w1, `${name.ja} のりば階段`, `${name.en} — platform stairs`, false);
      }
    }
  }

  // ═════════ The gallery inside the south wall from the bridge's door, its stair down into the east concourse, and the bridge over Ekiura-dōri ═════════
  b.box(FLOOR, GAL_X, MEZZ - 0.3, GAL_Z, GAL_E, MEZZ, SI);
  rail(b, GAL_X, GAL_Z - 0.08, GAL_E, GAL_Z, MEZZ);
  rail(b, GAL_X - 0.08, GAL_Z - 0.08, GAL_X, SI, MEZZ);
  rail(b, GAL_E, GAL_Z - 0.08, GAL_E + 0.08, MS[0], MEZZ);
  rail(b, GAL_E, MS[1], GAL_E + 0.08, SI, MEZZ);
  {
    const foot = GAL_E + Math.round((MEZZ - GY) * 172) / 100;
    flight(foot, GAL_E, MS[0], MS[1], GY, MEZZ, GY - 0.02);
    parapet(foot, GAL_E, MS[0] - 0.2, MS[0], GY, MEZZ);
    parapet(foot, GAL_E, MS[1], MS[1] + 0.2, GY, MEZZ);
    for (const z of [MS[0] + 0.1, MS[1] - 0.1]) b.deco(STEEL, foot + 0.28, GY + 3.5, z - 0.02, foot + 0.32, SOFFIT, z + 0.02);
    b.deco('flat:#17181b', foot + 0.26, GY + 2.95, MS[0], foot + 0.34, GY + 3.5, MS[1]);
    b.sign(OUT(`澪屋口・地下鉄 ${metro.nameJa}駅 ↑`, `Mioya Gate / Metro ${metro.nameRomaji} Sta. — stairs up`), foot + 0.35, GY + 3.22, (MS[0] + MS[1]) / 2, [1, 0], 1.95, 0.5);
  }
  b.deco('light', 8 - 1.2, SOFFIT - 0.04, (GAL_Z + SI) / 2 - 0.1, 8 + 1.2, SOFFIT, (GAL_Z + SI) / 2 + 0.1);
  // The bridge: a floor, glazed sides, a roof; a stone threshold at the viaduct's face.
  const BZ = -74;
  b.box(FLOOR, BRIDGE[0], MEZZ - 0.3, SI, BRIDGE[1], MEZZ, BZ);
  b.deco('flat:#b9b3a6', BRIDGE[0], MEZZ, S - 0.1, BRIDGE[1], MEZZ + 0.07, S + 0.1);
  b.box(STEEL, BRIDGE[0] - 0.12, MEZZ - 0.55, S, BRIDGE[1] + 0.12, MEZZ - 0.3, BZ);
  for (const x of [BRIDGE[0] - 0.12, BRIDGE[1]]) {
    b.box(STEEL, x, MEZZ - 0.3, S, x + 0.12, MEZZ + 0.9, BZ);
    b.deco('glassTint', x + 0.04, MEZZ + 0.9, S, x + 0.08, MEZZ + 2.2, BZ);
    b.block(x, MEZZ + 0.9, S, x + 0.12, MEZZ + 2.2, BZ);
    for (let z = S + 0.06; z < BZ; z += 1.48) b.deco(STEEL, x, MEZZ + 0.9, z - 0.04, x + 0.12, MEZZ + 2.2, z + 0.04);
  }
  b.box(STEEL, BRIDGE[0] - 0.2, MEZZ + 2.2, S, BRIDGE[1] + 0.2, MEZZ + 2.35, BZ);
  b.deco('light', (BRIDGE[0] + BRIDGE[1]) / 2 - 0.1, MEZZ + 2.16, S + 0.6, (BRIDGE[0] + BRIDGE[1]) / 2 + 0.1, MEZZ + 2.2, BZ - 0.6);
  b.zone('passage', GAL_X, MEZZ - 0.2, GAL_Z, GAL_E + 0.4, SOFFIT, S, `${name.ja} 澪屋口 連絡通路`, `${name.en} — passage to the Mioya Gate`, false);
  b.zone('passage', BRIDGE[0], MEZZ - 0.2, S, BRIDGE[1], MEZZ + 2.2, BZ, `${name.ja} 澪屋口 連絡橋`, `${name.en} — bridge to the Mioya Gate`, true);

  // ═════════ The bridge concourse: a deck over all six tracks at +16.5, open to the train shed's roof ═════════
  // From the great hall's upper gallery (a doorway in the station building's back wall: hub-street.ts) through a gate
  // line onto the deck. Off each side, over the middle island and the south one, a wing; from each wing's end a stair
  // down to the island, away from the passage: its upper half open underneath on a trestle, its lower half boxed in
  // iron. The lifts by the gates below come up through the south wings; the middle wings' lifts go down to their island only.
  {
    const UN = -116.9, US = -82, VX = 3.5, UG = -114.5, IRON = 'metal:#2f4a3c', CREAM = 'flat:#e9e2d0', UFL = 'floor:#cfc8b8';
    const BMID = (WING + BFOOT) / 2, MIDY = (UY + P) / 2;
    const wings: { z: [number, number]; well: [number, number]; lift: boolean }[] = [{ z: [-90, -83.8], well: WELL, lift: true }, { z: [-102.2, -96], well: WELL_M, lift: true }];
    /** A glazed screen on an iron parapet, along z at x or along x at z. */
    const scrZ = (x: number, z0: number, z1: number) => {
      b.box(IRON, x - 0.06, UY, z0, x + 0.06, UY + 1.1, z1);
      b.deco('glassTint', x - 0.02, UY + 1.1, z0, x + 0.02, UY + 2.8, z1);
      b.block(x - 0.06, UY + 1.1, z0, x + 0.06, UY + 2.8, z1);
      b.deco(IRON, x - 0.07, UY + 2.8, z0, x + 0.07, UY + 2.9, z1);
      const n = Math.max(1, Math.round((z1 - z0) / 2));
      for (let i = 0; i <= n; i++) { const z = z0 + ((z1 - z0) * i) / n; b.deco(IRON, x - 0.05, UY + 1.1, Math.max(z0, z - 0.04), x + 0.05, UY + 2.8, Math.min(z1, z + 0.04)); }
    };
    const scrX = (z: number, x0: number, x1: number) => {
      b.box(IRON, x0, UY, z - 0.06, x1, UY + 1.1, z + 0.06);
      b.deco('glassTint', x0, UY + 1.1, z - 0.02, x1, UY + 2.8, z + 0.02);
      b.block(x0, UY + 1.1, z - 0.06, x1, UY + 2.8, z + 0.06);
      b.deco(IRON, x0, UY + 2.8, z - 0.07, x1, UY + 2.9, z + 0.07);
      const n = Math.max(1, Math.round((x1 - x0) / 2));
      for (let i = 0; i <= n; i++) { const x = x0 + ((x1 - x0) * i) / n; b.deco(IRON, Math.max(x0, x - 0.04), UY + 1.1, z - 0.05, Math.min(x1, x + 0.04), UY + 2.8, z + 0.05); }
    };
    // The deck, the way in from the hall's doorway, the girders and the columns standing on the three islands.
    b.box(UFL, -UX, UY - 0.3, UN - 0.4, UX, UY, US + 0.4);
    b.box(UFL, -VX, UY - 0.3, NN, VX, UY, UN - 0.4);
    for (const x of [-UX - 0.15, UX]) b.deco(IRON, x, UY - 0.8, UN - 0.4, x + 0.15, UY - 0.3, US + 0.4);
    for (const z of [UN - 0.4, -111.3, -105.2, -99.1, -93, -86.9, US + 0.4]) b.deco(IRON, -UX, UY - 0.7, z - 0.12, UX, UY - 0.3, z + 0.12);
    for (const x of [-11.9, -4, 4, 11.9]) for (const z of [-111.3, -99.1, -86.9]) {
      b.box(IRON, x - 0.15, P, z - 0.15, x + 0.15, UY - 0.7, z + 0.15);
      b.deco(IRON, x - 0.22, P, z - 0.22, x + 0.22, P + 0.4, z + 0.22);
      b.deco(IRON, x - 0.22, UY - 0.95, z - 0.22, x + 0.22, UY - 0.7, z + 0.22);
    }
    // Its sides and ends; the way in between screens as far as the gates.
    for (const sx of [-1, 1]) {
      for (const [z0, z1] of [[UN, wings[1].z[0]], [wings[1].z[1], wings[0].z[0]], [wings[0].z[1], US]]) scrZ(sx * UX, z0, z1);
      scrX(UN, Math.min(sx * VX, sx * UX), Math.max(sx * VX, sx * UX));
      scrZ(sx * VX, NN, UG);
      scrX(UG, Math.min(sx * 2.23, sx * VX), Math.max(sx * 2.23, sx * VX));
    }
    scrX(US, -UX, UX);
    // (The cabinets' unpaid side is their +x: turned to the hall.)
    b.with({ rot: 3, t: [0, 0, UG] }, () => fareGates(b, UY, 5));
    b.deco('flat:#17181b', -VX, UY + 2.9, UG - 0.07, VX, UY + 4.2, UG + 0.07);
    b.sign(AR(`${name.ja} 橋上口`, `Bridge Gate — ${line.nameEn}`), -1.75, UY + 3.55, UG - 0.08, [0, -1], 3.2, 1.0);
    b.sign({ k: 'ardep', station: station.id, line: line.id }, 1.75, UY + 3.55, UG - 0.08, [0, -1], 3.2, 1.2, { dynamic: true });
    b.sign(OUT('橋上口　大広間・駅前広場', 'Bridge Gate — Great Hall / Station Square'), 0, UY + 3.55, UG + 0.08, [0, 1], 6.4, 0.8);
    // Lamp standards down the deck.
    for (const x of [-6, 6]) for (const z of [-109, -99.1, -89.2]) {
      b.box(IRON, x - 0.06, UY, z - 0.06, x + 0.06, UY + 3.2, z + 0.06);
      b.deco(IRON, x - 0.14, UY, z - 0.14, x + 0.14, UY + 0.3, z + 0.14);
      b.mesh(INDOOR_LAMP, 'sphere', x, UY + 3.45, z, 0.34, 0.34, 0.34);
    }
    /** An iron side to a stair, stepped with it: boxed in to the platform, or open underneath. */
    const side = (xl: number, xh: number, z0: number, z1: number, yl: number, yh: number, open: boolean) => {
      const n = Math.max(1, Math.round(Math.abs(xh - xl) / 1.1)), dx = (xh - xl) / n;
      for (let i = 0; i < n; i++) {
        const xa = xl + i * dx, lo = yl + ((yh - yl) * i) / n, top = yl + ((yh - yl) * (i + 1)) / n + 1.1;
        b.box(IRON, Math.min(xa, xa + dx), open ? lo - 0.45 : P, z0, Math.max(xa, xa + dx), top, z1);
        b.deco(CREAM, Math.min(xa, xa + dx), top, z0 - 0.02, Math.max(xa, xa + dx), top + 0.05, z1 + 0.02);
      }
    };
    for (const sx of [-1, 1]) for (const w of wings) {
      const U = (u: number) => sx * u, X = (a: number, e: number): [number, number] => [Math.min(sx * a, sx * e), Math.max(sx * a, sx * e)];
      const [z0, z1] = w.z, [w0, w1] = w.well, zc = (w0 + w1) / 2, wx = X(UX, WING), lab = label(ISLES[wings.indexOf(w)].nums);
      // The wing's floor (round the lift's shaft), its screens, the opening at the stair's head.
      if (w.lift) {
        const lx = X(LIFT_X[0], LIFT_X[1]), lz = [zc - LIFT_OUT.hw, zc + LIFT_OUT.hw];
        for (const [a, e, za, zb] of [[wx[0], Math.min(lx[0], wx[1]), z0, z1], [Math.max(lx[1], wx[0]), wx[1], z0, z1], [lx[0], lx[1], z0, lz[0]], [lx[0], lx[1], lz[1], z1]]) if (e - a > 0.01) b.box(UFL, a, UY - 0.3, za, e, UY, zb);
        // (On the shaft's back, towards the deck: what is round it.)
        b.sign(AR(`${lab.ja}　エレベーター・階段`, `${lab.en} — lift and stairs, behind`), U(LIFT_X[0] - 0.03), UY + 2.0, zc, [-sx, 0], 2.1, 0.5);
      } else b.box(UFL, wx[0], UY - 0.3, z0, wx[1], UY, z1);
      b.deco(IRON, wx[0], UY - 0.7, z0, wx[1], UY - 0.3, z0 + 0.15);
      b.deco(IRON, wx[0], UY - 0.7, z1 - 0.15, wx[1], UY - 0.3, z1);
      scrX(z0, wx[0], wx[1]);
      scrX(z1, wx[0], wx[1]);
      scrZ(U(WING), z0, w0 - 0.12);
      scrZ(U(WING), w1 + 0.12, z1);
      // The stair: its upper half open underneath, its lower half boxed in; a trestle where they meet.
      flight(U(BMID), U(WING), w0, w1, MIDY, UY, 0, 0.3);
      flight(U(BFOOT), U(BMID), w0, w1, P, MIDY, P);
      for (const [za, zb] of [[w0 - 0.12, w0], [w1, w1 + 0.12]]) {
        side(U(BMID), U(WING), za, zb, MIDY, UY, true);
        side(U(BFOOT), U(BMID), za, zb, P, MIDY, false);
      }
      b.box(IRON, X(BMID - 0.1, BMID)[0], P, w0 - 0.12, X(BMID - 0.1, BMID)[1], MIDY - 0.3, w1 + 0.12);
      b.deco('light', X(WING + 1, BMID - 1)[0], MIDY - 0.75, zc - 0.08, X(WING + 1, BMID - 1)[1], MIDY - 0.71, zc + 0.08);
      {
        // Over its head, where it goes; over its foot, a frame with where it comes from.
        b.deco('flat:#17181b', U(WING) - 0.05, UY + 2.25, w0 - 0.12, U(WING) + 0.05, UY + 2.8, w1 + 0.12);
        b.sign(AR(`${lab.ja}　階段 ↓`, `${lab.en} — stairs down`), U(WING) - sx * 0.06, UY + 2.52, zc, [-sx, 0], 2.5, 0.5);
        const xf = U(BFOOT);
        for (const z of [w0 - 0.06, w1 + 0.06]) b.box(STEEL, xf - 0.05, P, z - 0.05, xf + 0.05, P + 3.5, z + 0.05);
        b.deco('flat:#17181b', xf - 0.04, P + 2.95, w0, xf + 0.04, P + 3.5, w1);
        b.sign(OUT('橋上コンコース・大広間 ↑', 'Bridge concourse / Great Hall — stairs up'), xf + sx * 0.05, P + 3.22, zc, [sx, 0], 2.5, 0.5);
        b.zone('concourse', X(WING, BFOOT)[0], P + 3.6, w0, X(WING, BFOOT)[1], UY - 0.2, w1, `${name.ja} 橋上コンコース階段`, `${name.en} — stairs to the bridge concourse`, true);
      }
    }
    b.zone('concourse', -WING, UY - 0.2, UG, WING, UY + 4, US, `${name.ja} 橋上コンコース`, `${name.en} — bridge concourse, inside the gates`, true);
    for (const sx of [-1, 1]) b.zone('concourse', Math.min(sx * VX, sx * UX), UY - 0.2, UN, Math.max(sx * VX, sx * UX), UY + 4, UG, `${name.ja} 橋上コンコース`, `${name.en} — bridge concourse, inside the gates`, true);
    b.zone('concourse', -VX, UY - 0.2, NN, VX, UY + 4, UG, `${name.ja} 橋上口`, `${name.en} — Bridge Gate`, true);
  }

  // ═════════ The dress: shops and benches inside the gates, a café on the bridge, clocks, lamps under the shed ═════════
  // (Shop names: docs/worldbuilding.md, "Shops and brands".)
  {
    const WOOD = 'flat:#6b4a34', TOP = 'flat:#d8d2c4', GOODS = ['flat:#c94f3d', 'flat:#e3b23c', 'flat:#3f7d5a', 'flat:#f0ead8', 'flat:#35557a', 'flat:#8a4f7d'];
    interface Shop { ja: string; en: string; bg: string; fg: string; kind: 'counter' | 'soba' }
    /** A stall `hw` either side of cx, from its back wall at zb to its counter's front at zf, on a floor at y. */
    const stall = (cx: number, hw: number, zb: number, zf: number, y: number, o: Shop, roof = false) => {
      const d = Math.sign(zf - zb), Z = (a: number, e: number): [number, number] => [Math.min(zb + d * a, zb + d * e), Math.max(zb + d * a, zb + d * e)];
      const depth = Math.abs(zf - zb), all = Z(0, depth), cnt = Z(depth - 0.6, depth), n: [number, number] = [0, d];
      b.block(cx - hw, y, all[0], cx + hw, y + 3.5, all[1]);
      b.deco(`flat:${o.bg}`, cx - hw, y, Z(0.12, 0.2)[0], cx + hw, y + 2.75, Z(0.12, 0.2)[1]);
      for (const sx of [-1, 1]) b.deco(WOOD, Math.min(cx + sx * hw, cx + sx * (hw - 0.1)), y, Z(0.2, depth)[0], Math.max(cx + sx * hw, cx + sx * (hw - 0.1)), y + 2.75, Z(0.2, depth)[1]);
      b.deco(WOOD, cx - hw + 0.1, y, cnt[0], cx + hw - 0.1, y + 0.95, cnt[1]);
      b.deco(TOP, cx - hw + 0.1, y + 0.95, Z(depth - 0.66, depth + 0.04)[0], cx + hw - 0.1, y + 0.99, Z(depth - 0.66, depth + 0.04)[1]);
      // Shelves on the back wall and what stands on them and on the counter.
      for (const [k, sy] of [1.3, 1.9, 2.4].entries()) {
        b.deco(TOP, cx - hw + 0.2, y + sy, Z(0.2, 0.55)[0], cx + hw - 0.2, y + sy + 0.03, Z(0.2, 0.55)[1]);
        for (let i = 0, x = cx - hw + 0.3; x < cx + hw - 0.6; i++, x += 0.5) b.deco(GOODS[(i + 2 * k) % GOODS.length], x, y + sy + 0.03, Z(0.25, 0.5)[0], x + 0.38, y + sy + 0.2 + 0.08 * ((i + k) % 3), Z(0.25, 0.5)[1]);
      }
      for (let i = 0, x = cx - hw + 0.4; x < cx + hw - 0.7; i++, x += 0.62) {
        if (o.kind === 'soba') b.deco('flat:#f4f1e8', x, y + 0.99, Z(depth - 0.42, depth - 0.18)[0], x + 0.24, y + 1.07, Z(depth - 0.42, depth - 0.18)[1]);
        else b.deco(GOODS[i % GOODS.length], x, y + 0.99, Z(depth - 0.5, depth - 0.14)[0], x + 0.44, y + 1.09 + 0.05 * (i % 2), Z(depth - 0.5, depth - 0.14)[1]);
      }
      // The fascia with the shop's name, a light under it.
      b.deco(`flat:${o.bg}`, cx - hw, y + 2.75, Z(depth - 0.2, depth + 0.05)[0], cx + hw, y + 3.5, Z(depth - 0.2, depth + 0.05)[1]);
      b.sign({ k: 'shop', ja: o.ja, en: o.en, bg: o.bg, fg: o.fg }, cx, y + 3.12, zb + d * (depth + 0.06), n, Math.min(2 * hw - 0.6, 6.4), 0.6);
      b.deco('light', cx - hw + 0.4, y + 2.7, Z(depth - 0.55, depth - 0.35)[0], cx + hw - 0.4, y + 2.75, Z(depth - 0.55, depth - 0.35)[1]);
      if (roof) b.deco('metal:#2f4a3c', cx - hw - 0.15, y + 3.5, Z(-0.05, depth + 0.3)[0], cx + hw + 0.15, y + 3.6, Z(-0.05, depth + 0.3)[1]);
      if (o.kind === 'soba') {
        // A short curtain under the fascia, stools at the counter.
        for (let x = cx - hw + 0.15; x < cx + hw - 0.5; x += 0.72) b.deco('flat:#1f2a44', x, y + 2.25, zb + d * depth - 0.01, x + 0.66, y + 2.75, zb + d * depth + 0.01);
        for (let x = cx - hw + 0.7; x < cx + hw - 0.6; x += 1.1) {
          b.box('metal:#5d6a72', x - 0.04, y, zb + d * (depth + 0.55) - 0.04, x + 0.04, y + 0.6, zb + d * (depth + 0.55) + 0.04);
          b.deco('flat:#7a1f1f', x - 0.17, y + 0.6, zb + d * (depth + 0.55) - 0.17, x + 0.17, y + 0.66, zb + d * (depth + 0.55) + 0.17);
        }
      }
    };
    /** A bench: a timber seat on iron legs. */
    const seat = (x0: number, z0: number, x1: number, z1: number, y: number) => {
      b.box(WOOD, x0, y + 0.38, z0, x1, y + 0.45, z1);
      const long = x1 - x0 > z1 - z0;
      for (const f of [0.1, 0.9]) {
        const x = x0 + (x1 - x0) * (long ? f : 0.5), z = z0 + (z1 - z0) * (long ? 0.5 : f);
        b.deco('metal:#2f4a3c', x - (long ? 0.04 : 0.2), y, z - (long ? 0.2 : 0.04), x + (long ? 0.04 : 0.2), y + 0.38, z + (long ? 0.2 : 0.04));
      }
    };
    // In the concourses, along the north wall between the piers: shops in some bays, benches in others.
    const SHOPS: Record<number, Shop> = {
      24: { ja: '駅弁 川湊軒', en: 'Kawaminato-ken — Ekiben', bg: '#7a1f1f', fg: '#f4e9d0', kind: 'counter' },
      40: { ja: 'あさなぎ 駅売店', en: 'Asanagi — Station Kiosk', bg: '#1f7a78', fg: '#f4efe0', kind: 'counter' },
      48: { ja: 'そば・うどん 高架庵', en: 'Kōka-an — Soba & Udon', bg: '#1f2a44', fg: '#ffffff', kind: 'soba' },
      [-24]: { ja: 'ベーカリー 麦の汽笛', en: 'Mugi no Kiteki — Bakery', bg: '#8a5a2b', fg: '#f6ecd6', kind: 'counter' },
      [-40]: { ja: '西海みやげ 帆かけ屋', en: 'Hokake-ya — Seikai Gifts', bg: '#2b4a6f', fg: '#ffffff', kind: 'counter' },
    };
    for (const cx of BAYS) {
      if (Math.abs(cx) < 20) continue;
      if (SHOPS[cx]) stall(cx, 3.65, NNI, PIER_Z[0] + 0.5, GY, SHOPS[cx]);
      else if (Math.abs(cx) !== 16) for (const dx of [-1.9, 1.9]) seat(cx + dx - 1.4, NNI + 0.25, cx + dx + 1.4, NNI + 0.7, GY);
    }
    // On the bridge concourse: a café kiosk at its south end with a clock over it, and benches along the sides.
    stall(0, 3, -82.1, -84.7, UY, { ja: '喫茶 鉄傘', en: 'Kissa Tessan — Coffee', bg: '#2f4a3c', fg: '#f4efe0', kind: 'counter' }, true);
    b.deco('flat:#17181b', -0.6, UY + 3.6, -84.9, 0.6, UY + 4.8, -84.7);
    b.sign({ k: 'clock' }, 0, UY + 4.2, -84.91, [0, -1], 1.0, 1.0);
    for (const sx of [-1, 1]) for (const [z0, z1] of [[-110.5, -106.5], [-94.6, -91.4]]) seat(Math.min(sx * 10.9, sx * 11.4), z0, Math.max(sx * 10.9, sx * 11.4), z1, UY);
    // A clock hung in the central passage, a face each way.
    b.deco(STEEL, -0.03, GY + 5.5, -90.03, 0.03, SOFFIT, -89.97);
    b.deco('flat:#17181b', -0.55, GY + 4.4, -90.1, 0.55, GY + 5.5, -89.9);
    for (const d of [-1, 1] as const) b.sign({ k: 'clock' }, 0, GY + 4.95, -90 + d * 0.11, [0, d], 1.0, 1.0);
    // On each island in use: drink machines back to back and a bin east of the stairs, a kiosk booth west of them.
    for (const isle of ISLES) {
      const zc = (isle.pz[0] + isle.pz[1]) / 2;
      for (const [x, v, w] of [[45, 'vending', 'vending2'], [46.1, 'vending2', 'vending']] as const) {
        vending(b, x, P, zc + 0.36, [0, 1], v, 'old');
        vending(b, x, P, zc - 0.36, [0, -1], w, 'old');
      }
      b.box('metal:#5d6a72', 47.0, P, zc - 0.3, 47.5, P + 0.9, zc + 0.3);
      b.deco('flat:#17181b', 47.05, P + 0.9, zc - 0.25, 47.45, P + 0.93, zc + 0.25);
      // The booth: a counter each side under a fascia, the keeper's place boxed in between.
      const bx: [number, number] = [-46.8, -44.2], bg = '#1f7a78';
      b.block(bx[0], P, zc - 0.65, bx[1], P + 2.6, zc + 0.65);
      b.deco('metal:#2f4a3c', bx[0], P, zc - 0.65, bx[1], P + 0.95, zc + 0.65);
      b.deco(TOP, bx[0] - 0.05, P + 0.95, zc - 0.72, bx[1] + 0.05, P + 0.99, zc + 0.72);
      for (const x of bx) for (const z of [zc - 0.6, zc + 0.6]) b.deco('metal:#2f4a3c', x - 0.05, P + 0.99, z - 0.05, x + 0.05, P + 2.1, z + 0.05);
      b.deco(`flat:${bg}`, bx[0] - 0.08, P + 2.1, zc - 0.75, bx[1] + 0.08, P + 2.6, zc + 0.75);
      b.deco('metal:#2f4a3c', bx[0] - 0.15, P + 2.6, zc - 0.85, bx[1] + 0.15, P + 2.66, zc + 0.85);
      b.deco(WOOD, bx[0] + 0.5, P + 0.99, zc - 0.2, bx[1] - 0.5, P + 1.9, zc + 0.2);
      for (const d of [-1, 1] as const) {
        for (let i = 0, x = bx[0] + 0.2; x < bx[1] - 0.45; i++, x += 0.42) b.deco(GOODS[(i + (d > 0 ? 3 : 0)) % GOODS.length], x, P + 0.99, Math.min(zc + d * 0.3, zc + d * 0.62), x + 0.32, P + 1.1 + 0.05 * (i % 2), Math.max(zc + d * 0.3, zc + d * 0.62));
        b.sign({ k: 'shop', ja: 'あさなぎ ホーム売店', en: 'Asanagi — Platform Kiosk', bg, fg: '#f4efe0' }, (bx[0] + bx[1]) / 2, P + 2.35, zc + d * 0.76, [0, d], 2.4, 0.4);
      }
    }
    // The bridge's signs stand on frames of their own or over the wings' mouths (there is no ceiling to hang them from).
    {
      const IRON = 'metal:#2f4a3c', up = line.beyond!.up, down = line.beyond!.down, mid = label(ISLES[1].nums), south = label(ISLES[0].nums);
      const frame = (x0: number, x1: number, z: number, y0: number, y1: number) => {
        for (const x of [x0, x1]) b.box(IRON, x - 0.06, UY, z - 0.06, x + 0.06, y1 + 0.1, z + 0.06);
        b.deco('flat:#17181b', x0, y0, z - 0.06, x1, y1, z + 0.06);
      };
      // Past the gates: where each pair of platforms lies; on its back, the way out.
      frame(-3.3, 3.3, -111.5, UY + 2.4, UY + 3.7);
      b.sign(AR(`${mid.ja}　${up.nameJa}方面　この先 左右`, `${mid.en} for ${up.nameRomaji} — ahead, on either side`), 0, UY + 3.36, -111.57, [0, -1], 6.2, 0.56);
      b.sign(AR(`${south.ja}　${down.nameJa}方面　奥 左右`, `${south.en} for ${down.nameRomaji} — at the far end, on either side`), 0, UY + 2.74, -111.57, [0, -1], 6.2, 0.56);
      b.sign(OUT('出口　橋上口・大広間・駅前広場 ↑', 'Exit — Bridge Gate / Great Hall / Station Square'), 0, UY + 3.05, -111.43, [0, 1], 6.2, 0.8);
      // In the deck's middle: the departures, towards the gates; on its back a clock and the way out.
      frame(-3.6, 3.6, -103.5, UY + 2.4, UY + 4.7);
      b.sign({ k: 'ardep', station: station.id, line: line.id }, 0, UY + 3.55, -103.57, [0, -1], 6.8, 2.1, { dynamic: true });
      b.sign({ k: 'clock' }, -2.6, UY + 3.75, -103.43, [0, 1], 1.5, 1.5);
      b.sign(OUT('出口　橋上口・大広間 ↑', 'Exit — Bridge Gate / Great Hall'), 1.0, UY + 3.75, -103.43, [0, 1], 4.6, 0.8);
      b.sign(AR(`${mid.ja} ←→　${south.ja} 後方`, `${mid.en} either side — ${south.en} behind you`), 1.0, UY + 2.85, -103.43, [0, 1], 4.6, 0.5);
      // Over each wing's mouth, towards the deck.
      for (const sx of [-1, 1]) for (const [z0, z1, lab, dest] of [[-90, -83.8, south, down], [-102.2, -96, mid, up]] as const) {
        b.deco('flat:#17181b', sx * UX - 0.07, UY + 2.9, z0, sx * UX + 0.07, UY + 3.5, z1);
        b.sign(AR(`${lab.ja}　${dest.nameJa}方面　階段・エレベーター`, `${lab.en} for ${dest.nameRomaji} — stairs and lift`), sx * (UX - 0.08), UY + 3.2, (z0 + z1) / 2, [-sx, 0], 5.8, 0.5);
      }
      // Planters by the benches, and two more benches beside the café.
      for (const sx of [-1, 1]) {
        for (const [z0, z1] of [[-106.2, -105.0], [-95.8, -94.8]]) {
          b.box(WOOD, Math.min(sx * 10.9, sx * 11.4), UY, z0, Math.max(sx * 10.9, sx * 11.4), UY + 0.5, z1);
          b.deco('flat:#3f7d5a', Math.min(sx * 10.95, sx * 11.35), UY + 0.5, z0 + 0.05, Math.max(sx * 10.95, sx * 11.35), UY + 1.0, z1 - 0.05);
        }
        seat(Math.min(sx * 4.8, sx * 8.6), -82.8, Math.max(sx * 4.8, sx * 8.6), -82.35, UY);
      }
    }
    // Under the shed, over both islands in use: a large globe on a long rod from every second rib, clear of the bridge.
    for (let x = 36; x <= 116; x += 16) for (const sx of [-1, 1]) for (const isle of ISLES) {
      const zc = (isle.pz[0] + isle.pz[1]) / 2, top = 13 + Math.sqrt(18.3 ** 2 - (zc + 99.5) ** 2);
      b.deco(STEEL, sx * x - 0.02, P + 7.4, zc - 0.02, sx * x + 0.02, top, zc + 0.02);
      b.mesh(INDOOR_LAMP, 'sphere', sx * x, P + 7, zc, 0.5, 0.5, 0.5);
    }
  }

  // ═════════ Detail pass 2: the concourses and the passage dressed as a busy terminal ═════════
  // Hanging guide signs at every turn, coloured lines on the floor from the gates to the stairs, posters and
  // notices, a station map and lockers in the alcove by each Hokuei Gate, live departures inside every gate line.
  {
    const mid = label(ISLES[1].nums), sou = label(ISLES[0].nums), up = line.beyond!.up, dn = line.beyond!.down;
    const live: SignContent = { k: 'ardep', station: station.id, line: line.id };
    /** The arrow a reader facing a sign whose face looks along `n` sees for the way `d` (world xz): ahead, behind, right or left. */
    const arr = (n: [number, number], d: [number, number]) => {
      const r = d[0] * n[1] - d[1] * n[0], a = -(d[0] * n[0] + d[1] * n[1]);
      return Math.abs(a) >= Math.abs(r) ? (a > 0 ? '↑' : '↓') : r > 0 ? '→' : '←';
    };
    const tx = (s: string, a: string) => (a === '←' ? `← ${s}` : `${s} ${a}`);
    type N2 = [number, number];
    const toMid = (n: N2, d: N2) => AR(tx(`${mid.ja} ${up.nameJa}方面`, arr(n, d)), `${mid.en} for ${up.nameRomaji}`);
    const toSou = (n: N2, d: N2, lift: boolean) => AR(tx(`${sou.ja} ${dn.nameJa}方面${lift ? '・エレベーター' : ''}`, arr(n, d)), `${sou.en} for ${dn.nameRomaji}${lift ? ' — stairs and lift' : ''}`);
    const toHok = (n: N2, d: N2) => OUT(tx('出口 北栄口', arr(n, d)), 'Exit — Hokuei Gate: Station Square / Buses / Taxis');
    const toCen = (n: N2, d: N2) => OUT(tx('出口 中央口', arr(n, d)), 'Exit — Central Gate: Ekiura-dōri / Mioya / Metro');
    const toOut = (n: N2, d: N2) => OUT(tx('出口 中央口・北栄口', arr(n, d)), 'Exit — Central and Hokuei Gates');
    const toMio = (n: N2, d: N2) => OUT(tx(`澪屋口・地下鉄 ${metro.nameJa}駅`, arr(n, d)), `Mioya Gate / Metro ${metro.nameRomaji} Sta. — by the gallery stairs`);
    interface Row { c: SignContent; y: number; h: number; w: number; o?: number; dyn?: boolean }
    const UPPER = GY + 3.46, LOWER = GY + 3.0;
    const row = (c: SignContent, y: number, w: number): Row => ({ c, y, h: 0.42, w });
    /**
     * A sign hung from the deck on two rods: a dark box `w` wide across `n`, face A looking along `n`, face B the other
     * way. A row's `o` moves it to its own reader's right.
     */
    const hang = (x: number, z: number, n: N2, w: number, fa: (Row | false)[], fb: (Row | false)[]) => {
      const A = fa.filter((r): r is Row => !!r), B = fb.filter((r): r is Row => !!r), all = [...A, ...B];
      const t: N2 = [n[1], -n[0]];
      const lo = Math.min(...all.map((r) => r.y - r.h / 2)) - 0.05, hi = Math.max(...all.map((r) => r.y + r.h / 2)) + 0.05;
      const ax = Math.abs(t[0]) * (w / 2) + Math.abs(n[0]) * 0.05, az = Math.abs(t[1]) * (w / 2) + Math.abs(n[1]) * 0.05;
      b.deco('flat:#17181b', x - ax, lo, z - az, x + ax, hi, z + az);
      for (const s of [-1, 1]) {
        const rx = x + t[0] * s * (w / 2 - 0.25), rz = z + t[1] * s * (w / 2 - 0.25);
        b.deco(STEEL, rx - 0.02, hi, rz - 0.02, rx + 0.02, SOFFIT, rz + 0.02);
      }
      for (const [f, list] of [[1, A], [-1, B]] as const) for (const r of list) {
        const o = (r.o ?? 0) * f;
        b.sign(r.c, x + n[0] * f * 0.055 + t[0] * o, r.y, z + n[1] * f * 0.055 + t[1] * o, [n[0] * f, n[1] * f], r.w, r.h, r.dyn ? { dynamic: true } : {});
      }
    };
    const SO: N2 = [0, 1], NO: N2 = [0, -1];

    // ── Hung in each concourse (written for the east one; `u` is the distance from the passage's middle) ──
    for (const sx of [-1, 1] as const) {
      const X = (u: number) => sx * u, east = sx > 0;
      /** Faces looking towards the passage and away from it; the ways towards the passage and away. */
      const nP: N2 = [-sx, 0], nC: N2 = [sx, 0], toP: N2 = [-sx, 0], toC: N2 = [sx, 0];
      // Inside the Hokuei Gate: the departures and the platforms (all of them south, through the arches) to those coming in; a clock and the ways out to those leaving.
      hang(X(17.5), gz, nP, 3.4,
        [{ c: live, y: GY + 4.08, h: 1.05, w: 3.0, dyn: true }, row(toMid(nP, SO), UPPER, 3.3), row(toSou(nP, SO, true), LOWER, 3.3)],
        [{ c: { k: 'clock' }, y: GY + 4.08, h: 0.95, w: 0.95 }, row(toHok(nC, toP), UPPER, 3.3), row(toCen(nC, SO), LOWER, 3.3)]);
      // Inside the Central Gate, high enough to leave the sign over the stair's foot in view: the departures; behind, a clock and the way to the Hokuei Gate (north).
      hang(X(14.6), gzc, nP, 3.4,
        [{ c: live, y: GY + 4.2, h: 1.05, w: 3.0, dyn: true }],
        [{ c: { k: 'clock' }, y: GY + 4.2, h: 0.95, w: 0.95, o: -1.15 }, { c: toHok(nC, NO), y: GY + 4.2, h: 0.5, w: 2.0, o: 0.55 }]);
      // Out along the Hokuei band, in the bay 40 arch's line: the platforms south through it; the gates back towards the passage.
      hang(X(38.5), gz, nP, 2.8,
        [row(toMid(nP, SO), UPPER, 2.75), row(toSou(nP, SO, false), LOWER, 2.75)],
        [row(toHok(nC, toP), UPPER, 2.75), row(toCen(nC, SO), LOWER, 2.75)]);
      // Between the first stair house's end and the second's foot, in the line of the aisle north of the middle island's houses.
      hang(X(38.3), -101.8, nC, 2.0,
        [row(toCen(nC, toP), UPPER, 1.95), row(toHok(nC, NO), LOWER, 1.95)],
        [row(toMid(nP, toC), UPPER, 1.95), row(toSou(nP, SO, false), LOWER, 1.95)]);
      // The same in the south island's band, in the line of the aisle south of its houses.
      hang(X(38.3), -84.2, nC, 2.0,
        [row(toOut(nC, NO), UPPER, 1.95), east && row(toMio(nC, toP), LOWER, 1.95)],
        [row(toMid(nP, NO), UPPER, 1.95), row(toSou(nP, NO, false), LOWER, 1.95)]);
      // Between the rows of piers south of the Central Gate: the south island and its lift ahead to those going south; the gates and the middle island ahead to those going north.
      hang(X(15.0), -93.5, NO, 2.8,
        [row(toSou(NO, SO, true), UPPER, 2.75), east && row(toMio(NO, toC), LOWER, 2.75)],
        [row(toOut(SO, NO), UPPER, 2.75), row(toMid(SO, NO), LOWER, 2.75)]);
      // At the mouth of the slot between the lift's shaft and the south island's stair foot.
      hang(X(15.67), -89.6, SO, 2.0,
        [row(toOut(SO, NO), UPPER, 1.95), east && row(toMio(SO, toC), LOWER, 1.95)],
        [row(toSou(NO, SO, true), UPPER, 1.95)]);
      // In the aisle north of the south island's first stair house, over the arch through it.
      hang(X(31.6), -89.6, nP, 2.0,
        [east && row(toMio(nP, SO), UPPER, 1.95), row(toSou(nP, toC, false), LOWER, 1.95)],
        [row(toOut(nC, toP), UPPER, 1.95), row(toSou(nC, toP, true), LOWER, 1.95)]);
      // East only: in the aisle south of that house, between the gallery stair's foot and the arch.
      if (east) hang(X(29.0), -84.2, nC, 2.0,
        [row(toMio(nC, toP), UPPER, 1.95), row(toOut(nC, NO), LOWER, 1.95)],
        [row(toMid(nP, NO), UPPER, 1.95), row(toSou(nP, NO, true), LOWER, 1.95)]);
    }
    // ── Hung down the central passage, over its middle lane between the piers ──
    const eitherHok = AR(`← ${name.ja} 北栄口 →`, `Hokuei Gate — ${line.nameEn}, ${pfEn}: either side`);
    const eitherCen = AR(`← ${name.ja} 中央口 →`, `Central Gate — ${line.nameEn}, ${pfEn}: either side`);
    const toSouth = AR(`澪屋・地下鉄 ${metro.nameJa}駅・駅裏通 ↑`, `Mioya / Metro ${metro.nameRomaji} Sta. / Ekiura-dōri — ahead`);
    hang(0, -116.6, NO, 6.0,
      [row(eitherHok, UPPER, 5.9), row(AR('中央口・澪屋・地下鉄・駅裏通 ↑', 'Central Gate / Mioya / Metro / Ekiura-dōri — ahead'), LOWER, 5.9)],
      [row(OUT('駅前広場・バス・タクシー ↑', 'Station Square / Buses / Taxis — ahead'), UPPER, 5.9), row(AR('大広間・橋上口 ↑', `Great Hall / Bridge Gate — ${line.nameEn}`), LOWER, 5.9)]);
    hang(0, -104.5, NO, 6.0,
      [row(eitherCen, UPPER, 5.9), row(toSouth, LOWER, 5.9)],
      [row(eitherHok, UPPER, 5.9), row(AR('大広間・駅前広場 ↑', 'Great Hall / Station Square — ahead'), LOWER, 5.9)]);
    hang(0, -94.0, NO, 6.0,
      [row(toSouth, UPPER, 5.9), row(AR(tx('きっぷうりば', arr(NO, [1, 0])), `Tickets — ${line.nameEn}`), LOWER, 5.9)],
      [row(eitherCen, UPPER, 5.9), row(AR('北栄口・大広間・駅前広場 ↑', 'Hokuei Gate / Great Hall / Station Square — ahead'), LOWER, 5.9)]);

    // ── Lines on the floor from each gate line to the nearest stair of each island: blue to the middle one, orange to the south one ──
    const ISLE_COL = ['#e8762b', '#3b7dd8'];
    const path = (col: string, top: number, pts: N2[]) => {
      for (let i = 1; i < pts.length; i++) {
        const [x0, z0] = pts[i - 1], [x1, z1] = pts[i];
        b.deco(`flat:${col}`, Math.min(x0, x1) - 0.06, GY + 0.012, Math.min(z0, z1) - 0.06, Math.max(x0, x1) + 0.06, GY + top, Math.max(z0, z1) + 0.06);
      }
    };
    const zS = (WELL[0] + WELL[1]) / 2;
    for (const sx of [-1, 1] as const) {
      const X = (u: number) => sx * u;
      // (Each starts from a gap between two cabinets, past the cabinets' ends at 12.8, with a mark saying where it goes.)
      const starts: [number, number][] = [[1, gz + 0.525], [0, gz - 0.525], [1, gzc - 0.525], [0, gzc + 2.625]];
      path(ISLE_COL[1], 0.016, [[X(13.0), gz + 0.525], [X(14.4), gz + 0.525], [X(14.4), gzc - 0.525]]);
      path(ISLE_COL[1], 0.016, [[X(13.0), gzc - 0.525], [X(16.5), gzc - 0.525]]);
      path(ISLE_COL[0], 0.017, [[X(13.0), gz - 0.525], [X(15.6), gz - 0.525], [X(15.6), zS], [X(16.5), zS]]);
      path(ISLE_COL[0], 0.017, [[X(13.0), gzc + 2.625], [X(15.6), gzc + 2.625]]);
      for (const [i, z] of starts) b.sign({ k: 'floormark', line: line.id, arrow: 'up', nums: ISLES[i].nums }, X(13.55), GY + 0.022, z, null, 0.5, 0.7, { top: [sx, 0] });
    }

    // ── Posters on the free-standing piers between the two islands' bands, both faces ──
    const POST = [0, 2, 3, 4, 6, 7];
    let pk = 0;
    for (const sx of [-1, 1]) for (const J of [20, 28, 36, 44, 52]) for (const zr of [PIER_Z[3], PIER_Z[4]]) for (const f of [-1, 1] as const) {
      const xf = sx * J + f * 0.35;
      b.deco('flat:#17181b', Math.min(xf, xf + f * 0.015), GY + 1.08, zr - 0.35, Math.max(xf, xf + f * 0.015), GY + 2.02, zr + 0.35);
      b.sign({ k: 'poster', v: POST[pk++ % POST.length] }, xf + f * 0.02, GY + 1.55, zr, [f, 0], 0.62, 0.88);
    }
    // AR's notices on the stair houses' walls beside the landings, both sides.
    const NOTICES: [string, string][] = [
      ['かけこみ乗車はおやめください', 'Please do not rush onto the train'], ['電車とホームのすき間にご注意ください', 'Mind the gap between the train and the platform'],
      ['大きなお荷物は周りにご配慮ください', 'Please take care with large luggage'], ['歩きながらのスマートフォンは危険です', 'Using a phone while walking is dangerous'],
    ];
    let nk = 0;
    for (const g of GROUPS) for (const isle of ISLES) for (const [zf, f] of [[isle.well[0] - WT, -1], [isle.well[1] + WT, 1]] as const) {
      const [a, e] = span(g, LAND_U[0], OPEN_U[0]), [ja, en] = NOTICES[nk++ % NOTICES.length];
      b.deco('flat:#17181b', a + 0.1, GY + 1.5, Math.min(zf, zf + f * 0.015), e - 0.1, GY + 2.1, Math.max(zf, zf + f * 0.015));
      b.sign({ k: 'label', text: ja, sub: en, fg: '#1b1f24', bg: '#f4f2ec' }, (a + e) / 2, GY + 1.8, zf + f * 0.02, [0, f], 1.4, 0.5);
    }

    // ── In the alcove north of each Hokuei Gate (bay ±16, nothing else there): coin lockers and a station map ──
    const GFOOT = GAL_E + Math.round((MEZZ - GY) * 172) / 100;
    for (const sx of [-1, 1] as const) {
      const X = (u: number) => sx * u, u0 = 12.45;
      b.block(Math.min(X(u0), X(u0 + 3.2)), GY, NNI, Math.max(X(u0), X(u0 + 3.2)), GY + 1.9, NNI + 0.6);
      for (const k of [0, 1]) {
        const x = X(u0 + 0.8 + 1.6 * k);
        fitting(b, 'lock_new', x, GY, NNI + 0.3, [0, 1]);
        b.sign({ k: 'machine', v: 'locker', era: 'new' }, x, GY + 0.95, NNI + 0.61, [0, 1], 1.58, 1.88);
      }
      b.sign(AR('コインロッカー', 'Coin lockers'), X(u0 + 1.6), GY + 2.15, NNI + 0.13, [0, 1], 1.6, 0.3);
      // The map: this floor drawn from the plan above, north up (the reader faces north), 1 : 50.
      // (On the shut arch's own panel, which stands 0.1 m out from the wall, and inside the arch's width.)
      const cx = X(17.4), zw = NNI + 0.1, yp = GY + 1.72, s = 0.02;
      const MX = (x: number) => cx + x * s, MY = (z: number) => yp + (-99.5 - z) * s;
      b.deco('flat:#17181b', cx - 1.4, GY + 0.95, zw, cx + 1.4, GY + 2.55, zw + 0.03);
      b.deco('flat:#f2f0ea', cx - 1.35, GY + 1.0, zw + 0.03, cx + 1.35, GY + 2.5, zw + 0.035);
      const rect = (col: string, x0: number, z0: number, x1: number, z1: number, layer: number) =>
        b.deco(`flat:${col}`, MX(Math.min(x0, x1)), MY(Math.max(z0, z1)), zw + 0.035 + 0.003 * layer, MX(Math.max(x0, x1)), MY(Math.min(z0, z1)), zw + 0.038 + 0.003 * layer);
      for (const q of [-1, 1]) rect('#d5dde2', q * GATE_X, NNI, q * CON, SI, 0);
      rect('#fff3c4', PASSAGE[0], NN, PASSAGE[1], S, 0);
      for (const q of [-1, 1]) {
        rect('#8a9096', q * GATE_X - 0.25, NNI, q * GATE_X + 0.25, SI, 1);
        for (const zg of [gz, gzc]) rect('#1b1f24', q * GATE_X - 0.6, zg - 3.3, q * GATE_X + 0.6, zg + 3.3, 2);
      }
      for (const g of GROUPS) for (const [i, isle] of ISLES.entries()) {
        const [h0, h1] = span(g, FOOT_U, WX[1] + WT);
        rect(ISLE_COL[i], h0, isle.well[0] - WT, h1, isle.well[1] + WT, 1);
        b.sign({ k: 'label', text: isle.nums.join('・'), fg: '#ffffff', bg: ISLE_COL[i] }, MX((h0 + h1) / 2), MY((isle.well[0] + isle.well[1]) / 2), zw + 0.05, [0, 1], 0.24, 0.06);
      }
      for (const L of lifts) rect('#6a4c9c', L[0], (PZ[0] + PZ[1]) / 2 - LIFT_OUT.hw, L[1], (PZ[0] + PZ[1]) / 2 + LIFT_OUT.hw, 2);
      rect('#ffd100', GAL_E, MS[0] - 0.2, GFOOT, MS[1] + 0.2, 1);
      rect('#d32f2f', X(17.4) - 0.8, -116.6, X(17.4) + 0.8, -115.0, 3);
      const tag = (ja: string, en: string, z: number) => b.sign({ k: 'label', text: ja, sub: en, fg: '#1b1f24', bg: '#fff3c4' }, MX(0), MY(z), zw + 0.05, [0, 1], 0.42, 0.09);
      tag('北栄口', 'Hokuei Gate', gz);
      tag('中央口', 'Central Gate', gzc);
      tag('中央通路', 'Central Passage', -88.5);
      b.sign(AR('構内図　1階 改札内・中央通路', 'Station map — street level: concourses and Central Passage'), cx, GY + 2.35, zw + 0.05, [0, 1], 2.6, 0.2);
      // The key, under the plan.
      const key: [string, string, string][] = [
        [ISLE_COL[1], `${mid.ja} ${up.nameJa}方面`, `${mid.en} for ${up.nameRomaji}`], [ISLE_COL[0], `${sou.ja} ${dn.nameJa}方面`, `${sou.en} for ${dn.nameRomaji}`],
        ['#6a4c9c', 'エレベーター', 'Lift'], ['#ffd100', '澪屋口への階段', 'Stairs to the Mioya Gate'], ['#d32f2f', '現在地', 'You are here'],
      ];
      key.forEach(([col, ja, en], i) => {
        const x0 = cx - 1.3 + i * 0.52;
        b.deco(`flat:${col}`, x0, GY + 1.11, zw + 0.038, x0 + 0.08, GY + 1.19, zw + 0.041);
        b.sign({ k: 'label', text: ja, sub: en, fg: '#1b1f24', bg: '#f2f0ea' }, x0 + 0.31, GY + 1.15, zw + 0.045, [0, 1], 0.42, 0.16);
      });
    }
  }

  // ═════════ Signs, boards and ticket machines (AR's own style) ═════════
  const dep: SignContent = { k: 'ardep', station: station.id, line: line.id };
  for (const sx of [-1, 1]) {
    const x = sx * GATE_X, n: [number, number] = [-sx, 0], m: [number, number] = [sx, 0];
    // Over each gate line: a beam with the gate's name towards the passage and the way out towards the paid side; the Central Gate's has the departures too.
    b.deco('flat:#17181b', x - 0.1, GY + 2.5, PIER_Z[0] + 0.5, x + 0.1, GY + 3.5, PIER_Z[1] - 0.5);
    b.sign(AR(`${name.ja} 北栄口　${pf}`, `Hokuei Gate — ${line.nameEn}, ${pfEn}`), x - sx * 0.11, GY + 3.0, gz, n, 7.2, 0.8);
    b.sign(OUT('北栄口　駅前広場・バス・タクシー', 'Hokuei Gate — Station Square / Buses / Taxis'), x + sx * 0.11, GY + 3.0, gz, m, 7.2, 0.8);
    b.deco('flat:#17181b', x - 0.06, GY + 2.3, PIER_Z[2] + 0.5, x + 0.06, GY + 3.9, PIER_Z[3] - 0.5);
    board(b, dep, x - sx * 0.06, GY + 3.1, gzc - 1.9, n, 3.6, 1.4, true);
    b.sign(AR(`${name.ja} 中央口`, `Central Gate — ${line.nameEn}`), x - sx * 0.07, GY + 3.1, gzc + 1.95, n, 3.5, 0.8);
    b.sign(OUT('中央口　駅裏通・澪屋・地下鉄', 'Central Gate — Ekiura-dōri / Mioya / Metro'), x + sx * 0.07, GY + 3.1, gzc, m, 7.2, 0.8);
    // The paid side: to the platforms.
    b.sign(AR(`${pf}　階段・エレベーター ↑`, `${pfEn} — stairs and lift, straight on`), sx * 16, 6.75, N - 0.06, [0, -1], 5.6, 0.55);
  }
  // The ticket machines, on their wall in the east fence, facing the passage.
  b.with({ rot: 1, t: [GATE_X - 0.1, 0, (TM[0] + TM[1]) / 2] }, () => {
    ticketMachines(c, GY, -2.1, 0, 4, false);
    b.sign(AR('きっぷうりば', `Tickets — ${line.nameEn}`), 0, GY + 2.4, 0.03, [0, 1], 4.6, 0.6);
  });
  // The ways on, over the passage's middle arch at each end and on the row between; the station's name outside and in the great hall.
  b.sign({ k: 'guide', ja: `地下鉄 ${metro.nameJa}駅・澪屋・駅裏通`, en: `Metro ${metro.nameRomaji} Sta. / Mioya / Ekiura-dōri`, bg: 'navy', badges: metroLines, arrow: 'up' }, 0, 6.75, SI - 0.11, [0, -1], 5.6, 0.55);
  b.sign({ k: 'guide', ja: '駅前広場・時計筋・バス・タクシー', en: 'Station Square / Tokei-suji / Buses / Taxis', bg: 'white', arrow: 'up' }, 0, 6.75, NNI + 0.11, [0, 1], 5.6, 0.55);
  b.sign(AR(`${name.ja} 中央通路`, `${station.nameRomaji} Station — Central Passage · ${line.nameEn}`), 0, 6.85, S + 0.06, [0, 1], 6.2, 0.95);
  b.sign(AR(`中央通路　${line.nameJa} のりば・澪屋・地下鉄`, `Central Passage — ${line.nameEn} / Mioya / Metro`), 0, 9.25, NN - 0.66, [0, -1], 11, 0.8);
  // The gallery: the bridge's door is in the south wall.
  b.sign(OUT(`澪屋口・地下鉄 ${metro.nameJa}駅 →`, `Mioya Gate / Metro ${metro.nameRomaji} Sta. — over the bridge`), 9.7, MEZZ + 1.5, SI - 0.02, [0, -1], 3.6, 0.5);
}

/**
 * The Mioya Gate, on the Mioya terminal's level 2 (y `deck`): AR's gates across the east third of the
 * concourse's north part, at z `zg`; behind them a paid strip to the bridge's door in the north wall
 * (at z `zBack`). The private railway's hoarding takes the rest (hub-street.ts).
 */
export const MIOYA_GATE: { x: [number, number]; door: [number, number]; doorH: number } = { x: [4, 12], door: BRIDGE, doorH: 2.15 };
export function mioyaGate(b: Builder, deck: number, zBack: number, zg: number) {
  const station = stationById('kawaminato');
  const [x0, x1] = MIOYA_GATE.x, mid = (x0 + x1) / 2;
  // The gate row runs east–west here: the kit's row turned, its unpaid side to the south.
  b.with({ rot: 1, t: [mid, 0, zg] }, () => fareGates(b, deck, 5));
  for (const [a, e] of [[x0, mid - 2.4], [mid + 2.4, x1]]) {
    b.box('metal:#c4c8cc', a, deck, zg - 0.05, e, deck + 1.15, zg + 0.05);
    b.deco('glass', a, deck + 1.15, zg - 0.02, e, deck + 1.9, zg + 0.02);
    b.block(a, deck + 1.15, zg - 0.05, e, deck + 1.9, zg + 0.05);
  }
  // A header over the gates: the gate's name and the departures towards the concourse, the way out towards the bridge.
  {
    const line = lineById('AR'), metro = stationById(station.transfer!);
    b.box('flat:#17181b', x0, deck + 2.3, zg - 0.07, x1, deck + 3.75, zg + 0.07, false);
    for (const x of [x0 + 0.06, x1 - 0.06]) b.box('flat:#17181b', x - 0.06, deck + 1.9, zg - 0.06, x + 0.06, deck + 2.3, zg + 0.06, false);
    b.sign(AR(`${station.nameJa}駅 澪屋口`, `${line.nameEn} — ${station.nameRomaji} Sta., Mioya Gate`), x0 + 2.2, deck + 3.02, zg + 0.08, [0, 1], 4.0, 1.1);
    b.sign({ k: 'ardep', station: station.id, line: line.id }, x1 - 1.85, deck + 3.02, zg + 0.08, [0, 1], 3.4, 1.3, { dynamic: true });
    b.sign(OUT(`出口　澪屋・地下鉄 ${metro.nameJa}駅`, `Exit — Mioya / Metro ${metro.nameRomaji} Sta.`), mid, deck + 3.02, zg - 0.08, [0, -1], 6.6, 0.8);
  }
  // Partitions closing the paid strip at both ends.
  for (const x of [x0 - 0.12, x1]) b.box('flat:#f4f4f0', x, deck, zBack + 0.5, x + 0.12, deck + 2.6, zg + 0.05);
  b.zone('concourse', x0, deck - 0.2, zBack + 0.5, x1, deck + 3, zg, `${station.nameJa}駅 澪屋口 改札内`, `${station.nameRomaji} Sta. — Mioya Gate, inside the gates`, false);
  b.zone('concourse', x0, deck - 0.2, zg, x1, deck + 3, zg + 4, `${station.nameJa}駅 澪屋口`, `${station.nameRomaji} Sta. — Mioya Gate`, false);
}
