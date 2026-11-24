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
//   z −101.8 … −96.4 the middle island (stair well −100.4 … −97.8): not in use until the tracks are re-laid by direction
//   z −89.6 … −84.2  the south island, platforms 3·4 (x −125 … 127, 12 cars; stair well −88.2 … −85.6)
//   z −94.3 … −91.7  the stair from the concourse up east to the mezzanine (x 13.5 → 23.9), between two rows of piers
//   z −85.5 … −80.9  the gallery at +6.0 from the bridge's door (x 4.5 … 7.5) east to the mezzanine
//
//   x −12 … 12   the central passage, free: from the great hall's back through three arches, under all six
//                tracks between brick piers 8 m apart, out to Ekiura-dōri by two arches
//   x 12         the fence, and two gates in it: the Hokuei Gate under the widening (z −115.6 … −107), by the
//                great hall, and the Central Gate under the middle island (z −103.4 … −94.8)
//   x 12 … 28    the concourse inside the gates; the lift to the south island at x 12.4 … 14.7
//   x 16.4 … 23.9  the two platform stairs, from the mezzanine up west
//   x 23.9 … 28  the mezzanine

import { lineById, linesAt, stationById } from '../data/network';
import { INDOOR_LAMP } from '../render/lamps';
import type { SignContent } from '../signs/content';
import type { Builder, V3 } from '../world/builder';
import { fitting } from './fittings';
import { GROUND_Y as GY, PF_H, psd, rail, stairs, ticketMachines, type Ctx, type StationStyle } from './kit';
import { lift } from './lift';

/** The viaduct's faces (the widening's north one, the old north one between the two, the south one), and their inner sides. */
const NN = -119, N = -106, S = -80, FACE = 0.9, NNI = NN + FACE, NI = N + FACE, SI = S - FACE;
/** The islands' edges and their stairs' wells; the stair up to the mezzanine; the levels. */
const PZ: [number, number] = [-89.6, -84.2], WELL: [number, number] = [-88.2, -85.6], WELL_M: [number, number] = [-100.4, -97.8], LOW: [number, number] = [-94.3, -91.7];
const MEZZ = 6.0, SOFFIT = 8.3;
/** Along x: the passage, the concourse, the stair up to the mezzanine, the platform stairs (head, foot), the lift. */
const PASSAGE: [number, number] = [-12, 12], GATE_X = 12, EAST = 28, LOW_X: [number, number] = [13.5, 23.9], WX: [number, number] = [16.4, 23.9];
const LIFT_X: [number, number] = [12.4, 14.7];
/** The bridge from Mioya, and the gallery from its door to the mezzanine. */
const BRIDGE: [number, number] = [4.5, 7.5], GAL_X = 4, GAL_Z = -85.5;
/** Tracks' centres under which the hollow bays' brick piers stand (1 m deep, 0.35 thick at each bay end); the bays' joints. */
const PIER_Z = [-115.6, -107.0, -103.4, -94.8, -91.2, -82.6], JOINTS = [-12, -4, 4, 12, 20, 28], BAYS = [-8, 0, 8, 16, 24];

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
export const KAWAMINATO_SPAWN: { pos: V3; yaw: number } = { pos: [31, 10.25, -86.9], yaw: Math.PI / 2 };

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
 * canopy's column an enamel name plate each way along the platform, as the old stations had. On the two islands
 * not in use, a board saying so on every other frame.
 */
export function platformPiece(b: Builder, x: number, base: string, k: number) {
  const line = lineById('AR'), station = stationById('kawaminato');
  const P = line.railY[line.stops.indexOf(station.id)] + PF_H, zc = (PZ[0] + PZ[1]) / 2;
  const fx = x - 2.3, fy = P + 2.65;
  // (The lamps the models hang, lit: build_viaduct.py platforms(), 0.5 m west and 3.5 m east of the piece's centre.)
  for (const dx of [-0.5, 3.5]) b.mesh(INDOOR_LAMP, 'sphere', x + dx, P + 2.87, zc, 0.15, 0.12, 0.15);
  // (The middle island's centre and the widening's; the middle one has no frame over the lift's bay.)
  if (k % 2 === 0) for (const z of base === 'hl8' ? [-111.3] : [(WELL_M[0] + WELL_M[1]) / 2, -111.3]) {
    for (const n of [-1, 1] as const) b.sign({ k: 'label', text: 'このホームは使用していません', sub: 'This platform is not in use', fg: '#ffffff', bg: '#c8102e' }, fx, fy, z + n * 0.06, [0, n], 1.8, 0.5);
  }
  if (base === 'hl8') return;
  for (const n of [-1, 1] as const) b.sign({ k: 'shop', ja: station.nameKana, bg: '#1f3f7a', fg: '#ffffff', vertical: true }, x + n * 0.15, P + 1.5, zc, [n, 0], 0.2, 1.0); // (between the column's base and its collar)
  if (Math.round(x) === 32 || Math.round(x) === -16) {
    // (Its underside 2.15 m over the platform, its top under the canopy's beam.)
    b.deco('flat:#17181b', fx - 1.35, fy - 0.5, zc - 0.06, fx + 1.35, fy + 0.5, zc + 0.06);
    for (const n of [-1, 1] as const) b.sign({ k: 'ardep', station: station.id, line: line.id }, fx, fy, zc + n * 0.07, [0, n], 2.6, 0.92, { dynamic: true });
    return;
  }
  for (const n of [-1, 1] as const) {
    // (A board whose face looks north is read looking south: east is then on the left. The stairs' head is at x 16.4.)
    const east = x < WX[0], arrow = east === n < 0 ? '←' : '→';
    const c: SignContent = k % 2 === 0 ? { k: 'arname', station: station.id, line: line.id, flip: n > 0 } : OUT(arrow === '←' ? '← 出口' : '出口 →', 'Exit — Hokuei, Central and Mioya Gates');
    b.sign(c, fx, fy, zc + n * 0.06, [0, n], 1.8, 0.5);
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
  const nums = station.platforms[line.id];
  const c: Ctx = { b, line, station, stop: line.stops.indexOf(station.id), railY: P - PF_H, style: o.style };

  // ═════════ The south island: its floor (the models draw it), the gates at both edges, the ends ═════════
  for (const [z0, z1] of [[PZ[0], WELL[0]], [WELL[1], PZ[1]]]) b.block(E0, P - 1.4, z0, E1, P, z1);
  for (const [x0, x1] of [[E0, LIFT_X[0]], [LIFT_X[1], WX[0]], [WX[1], E1]]) b.block(x0, P - 1.4, WELL[0], x1, P, WELL[1]);
  {
    // (Trains keep left and chainage runs west here: the down track is the south one.)
    // No queue marks where the island is only a strip beside the stair well or the lift; the models paint the edges.
    const queue = (x: number) => !(x > LIFT_X[0] - 1.4 && x < WX[1] + 1.4);
    psd(c, PZ[1], -1, 'down', P, o.ends, { queue, paint: false });
    psd(c, PZ[0], 1, 'up', P, o.ends, { queue, paint: false });
    for (const x of o.ends) {
      b.block(x - 0.06, P, PZ[0], x + 0.06, P + 1.3, PZ[1]);
      b.deco(STEEL, x - 0.04, P, PZ[0], x + 0.04, P + 1.2, PZ[1]);
      b.sign({ k: 'label', text: '立入禁止', sub: 'No entry beyond this point', fg: '#ffffff', bg: '#c8102e' }, x + (x < 0 ? 0.06 : -0.06), P + 0.75, (PZ[0] + PZ[1]) / 2, [x < 0 ? 1 : -1, 0], 1.6, 0.4);
    }
  }
  // Rails round the stair's well (open at its head, the west end).
  rail(b, WX[0], WELL[0] - 0.08, WX[1], WELL[0], P);
  rail(b, WX[0], WELL[1], WX[1], WELL[1] + 0.08, P);
  rail(b, WX[1], WELL[0] - 0.08, WX[1] + 0.08, WELL[1] + 0.08, P);
  b.zone('platform', E0, P - 0.2, PZ[0], E1, P + 3.6, PZ[1], `${name.ja} ${nums.join('・')}番のりば`, `${name.en} — Platforms ${nums.join('·')}`, true, line.id);

  // ═════════ The lift: concourse and south island, its door facing east ═════════
  b.with({ rot: 1, t: [LIFT_X[1], 0, (PZ[0] + PZ[1]) / 2] }, () => lift(b, { levels: [
    { y: GY, ja: '1階 改札内', en: '1F Concourse' }, { y: P, ja: `のりば ${nums.join('・')}番線`, en: `Platforms ${nums.join('·')}` },
  ] }));

  // ═════════ The floor under the tracks, the piers, the arch walls ═════════
  b.box(FLOOR, PASSAGE[0], GY - 0.2, NN, EAST, GY + 0.012, S);
  // (A darker band down each side of the passage, and across it at the rows of arches.)
  for (const x of [PASSAGE[0] + 0.6, PASSAGE[1] - 1.0]) b.deco('flat:#8f6a52', x, GY + 0.012, NNI, x + 0.4, GY + 0.016, SI);
  // The models' brick piers under the tracks, at the bays' joints.
  for (const x of JOINTS) {
    const [a, e] = [x === PASSAGE[0] ? x : x - 0.35, x === EAST ? x : x + 0.35];
    for (const z of PIER_Z) b.block(a, GY, z - 0.5, e, SOFFIT, z + 0.5);
  }
  // The three arch walls. Open arches: the passage's at both ends, and every one between the widening and the
  // old viaduct. Shut: the concourse's north ones (the station building's wing stands there) and its glazed south
  // ones; the passage's east bay south, glazed under the bridge's door.
  for (const cx of BAYS) {
    const free = cx < GATE_X;
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
  // Lights: strips under the deck in every bay, and a row of globes hung down the passage's middle.
  for (const x of BAYS) for (const z of x > GATE_X ? [-111.3, -93] : [-111.3, -99.1, -86.9]) b.deco('light', x - 1.6, SOFFIT - 0.05, z - 0.12, x + 1.6, SOFFIT, z + 0.12);
  // The deck itself, over all of it but the stairs' wells and the lift: nothing falls through from the tracks, nobody jumps up into it.
  {
    const all: [number, number][] = [[PASSAGE[0], EAST]];
    const strips: [number, number, [number, number][]][] = [
      [NN, WELL_M[0], all], [WELL_M[0], WELL_M[1], [[PASSAGE[0], WX[0]], [WX[1], EAST]]], [WELL_M[1], WELL[0], all],
      [WELL[0], WELL[1], [[PASSAGE[0], LIFT_X[0]], [LIFT_X[1], WX[0]], [WX[1], EAST]]], [WELL[1], S, all],
    ];
    for (const [z0, z1, xs] of strips) for (const [x0, x1] of xs) b.block(x0, SOFFIT, z0, x1, P - 1.4, z1);
  }
  for (const z of [-111.3, -99.1, -93, -86.9]) for (const x of [-8, 0, 8]) {
    if (x === 8 && z > GAL_Z - 2) continue; // (the gallery hangs there)
    b.deco(STEEL, x - 0.02, 6.0, z - 0.02, x + 0.02, SOFFIT, z + 0.02);
    b.mesh(INDOOR_LAMP, 'sphere', x, 5.8, z, 0.28, 0.28, 0.28);
  }
  // A tiled dado on the passage's west wall and the concourse's east one.
  b.deco(DADO, PASSAGE[0] + 0.001, GY, NNI, PASSAGE[0] + 0.02, GY + 1.2, SI);
  b.deco(DADO, EAST - 0.02, GY, NNI, EAST - 0.001, GY + 1.2, SI);

  // ═════════ The fence along the passage's east side, and the two gates in it ═════════
  const gz = (PIER_Z[0] + PIER_Z[1]) / 2, gzc = (PIER_Z[2] + PIER_Z[3]) / 2;
  {
    const reach = 3 * 1.05 + 0.13;
    b.with({ rot: 2, t: [GATE_X, 0, gz] }, () => fareGates(b, GY, 7));
    fence(b, GATE_X, GY, PIER_Z[0] + 0.5, gz - reach);
    fence(b, GATE_X, GY, gz + reach, PIER_Z[1] - 0.5);
    fence(b, GATE_X, GY, NNI, PIER_Z[0] - 0.5);
    // (The arch wall's pier stands on the fence's line between the widening and the old viaduct.)
    fence(b, GATE_X, GY, PIER_Z[1] + 0.5, N);
    fence(b, GATE_X, GY, NI, PIER_Z[2] - 0.5);
    b.with({ rot: 2, t: [GATE_X, 0, gzc] }, () => fareGates(b, GY, 7));
    fence(b, GATE_X, GY, PIER_Z[2] + 0.5, gzc - reach);
    fence(b, GATE_X, GY, gzc + reach, PIER_Z[3] - 0.5);
    for (let i = 3; i < PIER_Z.length; i++) fence(b, GATE_X, GY, PIER_Z[i] + 0.5, (PIER_Z[i + 1] ?? SI + 0.5) - 0.5);
  }
  b.zone('concourse', PASSAGE[0], GY - 0.2, NN, PASSAGE[1], MEZZ - 0.2, S, `${name.ja} 中央通路`, `${name.en} — Central Passage`, false);
  b.zone('concourse', GATE_X, GY - 0.2, NNI, EAST, MEZZ - 0.2, SI, `${name.ja} 改札内コンコース`, `${name.en} — concourse, inside the gates`, false);

  // ═════════ The mezzanine at the concourse's east end, and the stairs ═════════
  const MZ0 = WELL_M[0], MX = WX[1];
  b.box(FLOOR, MX, MEZZ - 0.3, MZ0, EAST, MEZZ, SI);
  b.box(TILE, MX, MEZZ, MZ0 - 0.12, EAST, SOFFIT, MZ0);
  // Its west edge: open at the three stairs and the gallery, a rail between them.
  for (const [z0, z1] of [[WELL_M[1], LOW[0]], [LOW[1], WELL[0]], [WELL[1], GAL_Z]]) rail(b, MX - 0.08, z0, MX, z1, MEZZ);
  for (const z of [-97, -90, -84]) b.deco('light', MX + 0.8, SOFFIT - 0.04, z - 0.6, EAST - 0.8, SOFFIT, z + 0.6);
  b.zone('concourse', MX, MEZZ - 0.2, MZ0, EAST, SOFFIT, SI, `${name.ja} 中2階`, `${name.en} — mezzanine`, false);
  // (The south island's stair above the mezzanine's own height. The lift's ride stays in the street's zone: the walk test cannot reach inside a shaft.)
  for (const [w0, w1] of [WELL]) b.zone('concourse', WX[0], MEZZ - 0.2, w0, MX, P - 0.2, w1, `${name.ja} のりば階段`, `${name.en} — platform stairs`, false);
  // Up from the concourse, east; then up west to each island, between walls of its own.
  stairs(b, { x0: LOW_X[0], x1: LOW_X[1], z0: LOW[0] + 0.02, z1: LOW[1] - 0.02, yLow: GY, yHigh: MEZZ, mat: 'flat:#b7b2a4' });
  for (const [w0, w1] of [WELL, WELL_M]) {
    b.with({ rot: 2 }, () => stairs(b, { x0: -WX[1], x1: -WX[0], z0: -w1, z1: -w0, yLow: MEZZ, yHigh: P, mat: 'flat:#b7b2a4', rails: [false, false] }));
    for (const z of [w0 - 0.12, w1]) b.box(TILE, WX[0], MEZZ - 0.3, z, WX[1], SOFFIT, z + 0.12);
    b.box(TILE, WX[0] - 0.12, MEZZ - 0.3, w0 - 0.12, WX[0], SOFFIT, w1 + 0.12);
  }
  // The middle island is not in use yet: its stair is shut at the foot.
  b.box(STEEL, MX - 0.06, MEZZ, WELL_M[0], MX + 0.06, MEZZ + 1.2, WELL_M[1]);
  b.block(MX - 0.06, MEZZ + 1.2, WELL_M[0], MX + 0.06, MEZZ + 2.3, WELL_M[1]);
  b.sign({ k: 'label', text: 'このホームは使用していません', sub: 'This platform is not in use', fg: '#ffffff', bg: '#c8102e' }, MX + 0.07, MEZZ + 0.75, (WELL_M[0] + WELL_M[1]) / 2, [1, 0], 2.3, 0.45);

  // ═════════ The gallery inside the south wall, and the bridge over Ekiura-dōri ═════════
  b.box(FLOOR, GAL_X, MEZZ - 0.3, GAL_Z, MX, MEZZ, SI);
  rail(b, GAL_X, GAL_Z - 0.08, WX[0] - 0.12, GAL_Z, MEZZ);
  rail(b, GAL_X - 0.08, GAL_Z - 0.08, GAL_X, SI, MEZZ);
  for (const x of [8, 16]) b.deco('light', x - 1.2, SOFFIT - 0.04, (GAL_Z + SI) / 2 - 0.1, x + 1.2, SOFFIT, (GAL_Z + SI) / 2 + 0.1);
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
  b.zone('passage', GAL_X, MEZZ - 0.2, GAL_Z, MX, SOFFIT, S, `${name.ja} 澪屋口 連絡通路`, `${name.en} — passage to the Mioya Gate`, false);
  b.zone('passage', BRIDGE[0], MEZZ - 0.2, S, BRIDGE[1], MEZZ + 2.2, BZ, `${name.ja} 澪屋口 連絡橋`, `${name.en} — bridge to the Mioya Gate`, true);

  // ═════════ Signs, boards and ticket machines (AR's own style) ═════════
  const pf = `${nums.join('・')}番のりば`, pfEn = `Platforms ${nums.join('·')}`;
  const metro = stationById(station.transfer!), metroLines = linesAt(metro.id).map((l) => l.id);
  const dep: SignContent = { k: 'ardep', station: station.id, line: line.id };
  // Over the gate line: a beam with the gate's name towards the passage and the way out towards the paid side; the departures beside it, over the fence.
  b.deco('flat:#17181b', GATE_X - 0.1, GY + 2.5, PIER_Z[0] + 0.5, GATE_X + 0.1, GY + 3.5, PIER_Z[1] - 0.5);
  b.sign(AR(`${name.ja} 北栄口　${pf}`, `Hokuei Gate — ${line.nameEn}, ${pfEn}`), GATE_X - 0.11, GY + 3.0, gz, [-1, 0], 7.2, 0.8);
  b.sign(OUT('北栄口　駅前広場・バス・タクシー', 'Hokuei Gate — Station Square / Buses / Taxis'), GATE_X + 0.11, GY + 3.0, gz, [1, 0], 7.2, 0.8);
  // The Central Gate's: the departures and its name towards the passage, the way out towards the paid side.
  b.deco('flat:#17181b', GATE_X - 0.06, GY + 2.3, PIER_Z[2] + 0.5, GATE_X + 0.06, GY + 3.9, PIER_Z[3] - 0.5);
  board(b, dep, GATE_X - 0.06, GY + 3.1, gzc - 1.9, [-1, 0], 3.6, 1.4, true);
  b.sign(AR(`${name.ja} 中央口`, `Central Gate — ${line.nameEn}`), GATE_X - 0.07, GY + 3.1, gzc + 1.95, [-1, 0], 3.5, 0.8);
  b.sign(OUT('中央口　駅裏通・澪屋・地下鉄', 'Central Gate — Ekiura-dōri / Mioya / Metro'), GATE_X + 0.07, GY + 3.1, gzc, [1, 0], 7.2, 0.8);
  // Opposite the gates, on the passage's west wall: ticket machines and the fare chart.
  b.with({ rot: 3, t: [PASSAGE[0], 0, gz] }, () => {
    ticketMachines(c, GY, -2.1, 0, 4, false);
    b.sign(AR('きっぷうりば', `Tickets — ${line.nameEn}`), 0, GY + 2.4, 0.03, [0, 1], 4.6, 0.6);
  });
  // The ways on, over the passage's middle arch at each end and on the row between; the station's name outside and in the great hall.
  b.sign({ k: 'guide', ja: `地下鉄 ${metro.nameJa}駅・澪屋・駅裏通`, en: `Metro ${metro.nameRomaji} Sta. / Mioya / Ekiura-dōri`, bg: 'navy', badges: metroLines, arrow: 'up' }, 0, 6.75, SI - 0.11, [0, -1], 5.6, 0.55);
  b.sign({ k: 'guide', ja: '駅前広場・時計筋・バス・タクシー', en: 'Station Square / Tokei-suji / Buses / Taxis', bg: 'white', arrow: 'up' }, 0, 6.75, NNI + 0.11, [0, 1], 5.6, 0.55);
  b.sign(AR(`${name.ja} 中央通路`, `${station.nameRomaji} Station — Central Passage · ${line.nameEn}`), 0, 6.85, S + 0.06, [0, 1], 6.2, 0.95);
  b.sign(AR(`中央通路　${line.nameJa} のりば・澪屋・地下鉄`, `Central Passage — ${line.nameEn} / Mioya / Metro`), 0, 9.25, NN - 0.66, [0, -1], 11, 0.8);
  // The paid side: to the platforms.
  b.sign(AR(`${pf}・澪屋口　階段・エレベーター ↑`, `${pfEn} / Mioya Gate — stairs and lift, straight on`), 16, 6.75, N - 0.06, [0, -1], 5.6, 0.55);
  // The mezzanine: on its east wall, between the piers, the departures, the platforms and the way down; the Mioya Gate over the gallery's mouth.
  board(b, dep, EAST, MEZZ + 1.35, -88.9, [-1, 0], 3.0, 1.15, true);
  // (On its north wall, read facing north: the stairs are all to the west, on the left. On its south wall: the gallery is to the west, on the right.)
  b.sign(AR(`← ${pf}　階段`, `${pfEn} — stairs up`), (MX + EAST) / 2, MEZZ + 1.75, MZ0 + 0.02, [0, 1], 3.2, 0.5);
  b.sign(OUT('← 北栄口・中央口　階段', 'Hokuei Gate / Central Gate — stairs down'), (MX + EAST) / 2, MEZZ + 1.15, MZ0 + 0.02, [0, 1], 3.2, 0.5);
  b.sign(OUT(`澪屋口・地下鉄 ${metro.nameJa}駅 →`, `Mioya Gate / Metro ${metro.nameRomaji} Sta.`), (MX + EAST) / 2, MEZZ + 1.5, SI - 0.12, [0, -1], 3.4, 0.5);
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
