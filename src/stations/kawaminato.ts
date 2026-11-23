// Kawaminato Station, the AR Main Line's station on the viaduct behind the Mioya terminal: a
// brick-arch under-viaduct station in the manner of Shimbashi or Kobe's Motomachi (plan agreed
// 2026-11-23, docs/akitsushima-railway.md). It stands in the hub's plot and is built in the hub's
// frame (+x east, +z south), called from hub-street.ts; it has no station world of its own.
//
// What you see of the structure is the viaduct's models (tools/blender/build_viaduct.py: the
// hollow bays hw8 hm8 he8 hl8 ho8, and the platforms carried over every piece). This file is the
// inside: floors, inner walls, stairs, the lift, the gates, the bridge, colliders and zones.
//
//   y  0.15  the street, and the Central Gate hall under the arches
//      6.0   the mezzanine over the middle walkway, the gallery and the bridge to Mioya's level 2
//     10.25  the platform (rail 9.15)
//
//   z −106 … −80     the viaduct (inner faces −105.1 and −80.9)
//   z −89.6 … −84.2  the south island, platforms 3·4 (x −125 … 127, 12 cars)
//   z −88.2 … −85.6  the two platform stairs, down the island's middle (x ±2.5 at the mezzanine → ±10)
//   z −94.3 … −91.7  the stair from the mezzanine down east to the hall (x 4 → 14.4), between two piers
//
//   x −12 … −4   hw8: arch shops below, the west platform stair's well above them
//   x −4 … 4     hm8: the public walkway below, the mezzanine above
//   x 4 … 20     he8, hl8: the paid side of the hall; the lift to the platform at x 12.4 … 14.7
//   x 20         the gate line
//   x 20 … 28    ho8: the free hall, an open arch to Ekiura-dōri and to Kōka-dōri
//   x 4.5 … 7.5  the bridge over Ekiura-dōri (z −80 … −74) from Mioya's level 2, where the Mioya Gate is

import { lineById, linesAt, stationById } from '../data/network';
import { INDOOR_LAMP } from '../render/lamps';
import type { SignContent } from '../signs/content';
import type { Builder, V3 } from '../world/builder';
import { fitting } from './fittings';
import { GROUND_Y as GY, PF_H, psd, rail, stairs, ticketMachines, type Ctx, type StationStyle } from './kit';
import { lift } from './lift';

/** The viaduct's faces, the island's edges, the stairs' wells, the levels. */
const N = -106, S = -80, FACE = 0.9, NI = N + FACE, SI = S - FACE;
const PZ: [number, number] = [-89.6, -84.2], WELL: [number, number] = [-88.2, -85.6], LOW: [number, number] = [-94.3, -91.7];
const MEZZ = 6.0, SOFFIT = 8.3, MX = 4, WX: [number, number] = [2.5, 10], LOW_X = 14.4;
const LIFT_X: [number, number] = [12.4, 14.7];
/** The hall's bays (centres), the gate line, the bridge. */
const HALL: [number, number] = [4, 28], GATE_X = 20, BRIDGE: [number, number] = [4.5, 7.5], GAL_X = 7.9, GAL_Z = -84.2;
/** Tracks' centres under which the hollow bays' brick piers stand (1 m square in plan, 0.35 at each bay end). */
const PIER_Z = [-103.4, -94.8, -91.2, -82.6];

const FLOOR = 'floor:#bdb7a8', TILE = 'tile:#e9e4d6', DADO = 'tile:#6f8f86', STEEL = 'metal:#5d6a72', BRICK = 'brick:#6e3a2d';

/** Where a teleport to the station lands, in the hub's frame: on the platform east of the lift, looking west. */
export const KAWAMINATO_SPAWN: { pos: V3; yaw: number } = { pos: [21, 10.25, -86.9], yaw: Math.PI / 2 };

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
 * What the game adds at each platform piece (hub-street.ts calls this with the piece's centre x): a lamp under the
 * canopy, and on the sign frame the models hang there (build_viaduct.py platforms(): 1.8 × 0.5, 2.3 m west of the
 * centre) a station name board or the way out, by turns; a live departure board instead at two of them.
 */
export function platformPiece(b: Builder, x: number, base: string, k: number) {
  const line = lineById('AR'), station = stationById('kawaminato');
  const P = line.railY[line.stops.indexOf(station.id)] + PF_H, zc = (PZ[0] + PZ[1]) / 2;
  b.mesh(INDOOR_LAMP, 'sphere', x, P + 3.05, zc, 0.16, 0.16, 0.16);
  if (base === 'hw8' || base === 'he8' || base === 'hl8') return;
  const fx = x - 2.3, fy = P + 2.65;
  if (Math.round(x) === 24 || Math.round(x) === -16) {
    // (Its underside 2.15 m over the platform, its top under the canopy's beam.)
    b.deco('flat:#17181b', fx - 1.35, fy - 0.5, zc - 0.06, fx + 1.35, fy + 0.5, zc + 0.06);
    for (const n of [-1, 1] as const) b.sign({ k: 'ardep', station: station.id, line: line.id }, fx, fy, zc + n * 0.07, [0, n], 2.6, 0.92, { dynamic: true });
    return;
  }
  for (const n of [-1, 1] as const) {
    // (A board whose face looks north is read looking south: east is then on the left.)
    const east = x < 0, arrow = east === n < 0 ? '←' : '→';
    const c: SignContent = k % 2 === 0 ? { k: 'arname', station: station.id, line: line.id, flip: n > 0 } : OUT(arrow === '←' ? '← 出口' : '出口 →', 'Exit — Central Gate / Mioya Gate');
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

export function kawaminatoStation(b: Builder, o: KawaminatoOpts) {
  const line = lineById('AR'), station = stationById('kawaminato');
  const P = line.railY[line.stops.indexOf(station.id)] + PF_H;
  const [E0, E1] = o.ends;
  const name = { ja: `${station.nameJa}駅`, en: `${station.nameRomaji} Sta.` };
  const nums = station.platforms[line.id];

  // ═════════ The platform: its floor (the models draw it), the gates at both edges, the ends ═════════
  for (const [z0, z1] of [[PZ[0], WELL[0]], [WELL[1], PZ[1]]]) b.block(E0, P - 1.4, z0, E1, P, z1);
  for (const [x0, x1] of [[E0, -WX[1]], [-WX[0], WX[0]], [WX[1], LIFT_X[0]], [LIFT_X[1], E1]]) b.block(x0, P - 1.4, WELL[0], x1, P, WELL[1]);
  {
    const c: Ctx = { b, line, station, stop: line.stops.indexOf(station.id), railY: P - PF_H, style: o.style };
    // (Trains keep left and chainage runs west here: the down track is the south one.)
    // No queue marks where the island is only a strip beside a stair well or the lift; the models paint the edges.
    const queue = (x: number) => !(Math.abs(x) > WX[0] - 1.4 && Math.abs(x) < WX[1] + 1.4) && !(x > LIFT_X[0] - 1.4 && x < LIFT_X[1] + 1.4);
    psd(c, PZ[1], -1, 'down', P, o.ends, { queue, paint: false });
    psd(c, PZ[0], 1, 'up', P, o.ends, { queue, paint: false });
    for (const x of o.ends) {
      b.block(x - 0.06, P, PZ[0], x + 0.06, P + 1.3, PZ[1]);
      b.deco(STEEL, x - 0.04, P, PZ[0], x + 0.04, P + 1.2, PZ[1]);
      b.sign({ k: 'label', text: '立入禁止', sub: 'No entry beyond this point', fg: '#ffffff', bg: '#c8102e' }, x + (x < 0 ? 0.06 : -0.06), P + 0.75, (PZ[0] + PZ[1]) / 2, [x < 0 ? 1 : -1, 0], 1.6, 0.4);
    }
  }
  // Rails round the stairs' wells (open at the stairs' heads).
  for (const sx of [-1, 1]) {
    const a = Math.min(sx * WX[0], sx * WX[1]), e = Math.max(sx * WX[0], sx * WX[1]);
    rail(b, a, WELL[0] - 0.08, e, WELL[0], P);
    rail(b, a, WELL[1], e, WELL[1] + 0.08, P);
    rail(b, Math.min(sx * WX[0], sx * (WX[0] - 0.08)), WELL[0] - 0.08, Math.max(sx * WX[0], sx * (WX[0] - 0.08)), WELL[1] + 0.08, P);
  }
  b.zone('platform', E0, P - 0.2, PZ[0], E1, P + 3.6, PZ[1], `${name.ja} ${nums.join('・')}番のりば`, `${name.en} — Platforms ${nums.join('·')}`, true, line.id);

  // ═════════ The lift: gate hall (paid side) and platform, its door facing west ═════════
  b.with({ rot: 3, t: [LIFT_X[0], 0, (PZ[0] + PZ[1]) / 2] }, () => lift(b, { levels: [
    { y: GY, ja: '1階 中央口', en: '1F Central Gate' }, { y: P, ja: `のりば ${nums.join('・')}番線`, en: `Platforms ${nums.join('·')}` },
  ] }));

  // ═════════ The mezzanine, over the middle walkway ═════════
  const MN = -95.5;
  b.box(FLOOR, -MX, MEZZ - 0.15, MN, MX, MEZZ, SI);
  b.box(TILE, -MX, MEZZ, MN - 0.15, MX, SOFFIT, MN);
  // West end: a wall either side of the stair up; the stair runs on between its own walls over the arch shops.
  for (const [z0, z1] of [[MN, WELL[0] - 0.08], [WELL[1] + 0.08, SI]]) b.box(TILE, -MX - 0.12, MEZZ, z0, -MX, SOFFIT, z1);
  for (const z of [WELL[0] - 0.2, WELL[1] + 0.08]) b.box(TILE, -12, MEZZ - 0.15, z, -MX, SOFFIT, z + 0.12);
  b.box(TILE, -12.1, MEZZ - 0.15, WELL[0] - 0.2, -12, SOFFIT, WELL[1] + 0.2);
  // East edge, open to the hall below: a rail, but for the stair down and the gallery.
  b.box(TILE, MX, MEZZ, MN, MX + 0.12, SOFFIT, LOW[0] - 0.08);
  rail(b, MX, LOW[1] + 0.08, MX + 0.08, WELL[0] - 0.08, MEZZ);
  rail(b, MX, WELL[1] + 0.08, MX + 0.08, GAL_Z, MEZZ);
  // Inner faces of the two arch walls at this level (the models' faces are one skin).
  for (const [z0, z1] of [[SI, SI + 0.1]]) b.box(TILE, -MX, MEZZ, z0, MX, SOFFIT, z1);
  for (const x of [-2, 2]) b.deco('light', x - 0.6, SOFFIT - 0.04, MN + 1.5, x + 0.6, SOFFIT, SI - 1.5);
  b.zone('concourse', -MX, MEZZ - 0.2, MN, MX, SOFFIT, SI, `${name.ja} 中2階`, `${name.en} — mezzanine`, false);

  // The two stairs up to the platform, and the one down east to the hall.
  stairs(b, { x0: WX[0], x1: WX[1], z0: WELL[0], z1: WELL[1], yLow: MEZZ, yHigh: P, mat: 'flat:#b7b2a4' });
  b.with({ rot: 2 }, () => stairs(b, { x0: WX[0], x1: WX[1], z0: -WELL[1], z1: -WELL[0], yLow: MEZZ, yHigh: P, mat: 'flat:#b7b2a4' }));
  b.with({ rot: 2 }, () => stairs(b, { x0: -LOW_X, x1: -MX, z0: -LOW[1], z1: -LOW[0], yLow: GY, yHigh: MEZZ, mat: 'flat:#b7b2a4' }));

  // ═════════ The gallery inside the south wall, and the bridge over Ekiura-dōri ═════════
  b.box(FLOOR, MX, MEZZ - 0.3, GAL_Z, GAL_X, MEZZ, SI);
  rail(b, MX + 0.08, GAL_Z - 0.08, GAL_X, GAL_Z, MEZZ);
  rail(b, GAL_X, GAL_Z - 0.08, GAL_X + 0.08, SI, MEZZ);
  // (Its south wall's inner face, round the bridge's doorway.)
  b.box(TILE, MX, MEZZ, SI, BRIDGE[0], SOFFIT, SI + 0.1);
  b.box(TILE, BRIDGE[1], MEZZ, SI, GAL_X + 0.08, SOFFIT, SI + 0.1);
  b.box(TILE, BRIDGE[0], MEZZ + 2.15, SI, BRIDGE[1], SOFFIT, SI + 0.1);
  for (const x of [BRIDGE[0] - 0.5, BRIDGE[1]]) b.block(x, MEZZ, SI, x + 0.5, SOFFIT, S);
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
  b.zone('passage', MX, MEZZ - 0.2, GAL_Z, GAL_X, SOFFIT, S, `${name.ja} 澪屋口 連絡通路`, `${name.en} — passage to the Mioya Gate`, false);
  b.zone('passage', BRIDGE[0], MEZZ - 0.2, S, BRIDGE[1], MEZZ + 2.2, BZ, `${name.ja} 澪屋口 連絡橋`, `${name.en} — bridge to the Mioya Gate`, true);

  // ═════════ The Central Gate hall under the arches ═════════
  b.box(FLOOR, HALL[0], GY - 0.2, N, HALL[1], GY + 0.012, S);
  // The models' brick piers under the tracks, at the bays' joints.
  for (const x of [4, 12, 20, 28]) {
    const [a, e] = [x === 4 ? x : x - 0.35, x === 28 ? x : x + 0.35];
    for (const z of PIER_Z) b.block(a, GY, z - 0.5, e, SOFFIT, z + 0.5);
  }
  // The arch walls: piers either side of each arch; the glazed arches closed, the free hall's two open.
  // Inside, the wall over each arch (the models' faces are one skin), stepped to the arch's curve.
  for (const c of [8, 16, 24]) {
    const open = c > GATE_X;
    for (const [z0, z1, zi] of [[N, NI, NI], [SI, S, SI - 0.1]] as const) {
      const south = z0 === SI, door = south && c === 8;
      if (open) for (const [a, e] of [[c - 4, c - 3], [c + 3, c + 4]]) b.block(a, GY, z0, e, SOFFIT, z1);
      else b.block(c - 4, GY, z0, c + 4, door ? MEZZ - 0.3 : SOFFIT, z1);
      for (const [y0, y1, half] of [[4.75, 5.35, 2.35], [5.35, 5.9, 1.57]] as const) {
        for (const sx of [-1, 1]) b.box(BRICK, Math.min(c + sx * half, c + sx * 3), y0, zi, Math.max(c + sx * half, c + sx * 3), y1, zi + 0.1);
      }
      if (!door) b.box(BRICK, c - 4, 5.9, zi, c + 4, SOFFIT, zi + 0.1);
      else b.box(BRICK, GAL_X + 0.08, 5.9, zi, c + 4, SOFFIT, zi + 0.1);
    }
  }
  // A tiled dado round the paid side's walls and piers, lights under the deck.
  for (const x of [8, 16, 24]) for (const z of [-99.1, -86.9]) b.deco('light', x - 1.6, SOFFIT - 0.05, z - 0.12, x + 1.6, SOFFIT, z + 0.12);
  b.deco(DADO, HALL[0] + 0.001, GY, NI, HALL[0] + 0.02, GY + 1.2, SI);
  b.deco(DADO, HALL[1] - 0.02, GY, NI, HALL[1] - 0.001, GY + 1.2, SI);
  // The gate line along x = 20, between the piers under tracks 1 and 2; fences across the rest.
  {
    const mid = (PIER_Z[0] + PIER_Z[1]) / 2, reach = 3 * 1.05 + 0.13;
    b.with({ t: [GATE_X, 0, mid] }, () => fareGates(b, GY, 7));
    fence(b, GATE_X, GY, PIER_Z[0] + 0.5, mid - reach);
    fence(b, GATE_X, GY, mid + reach, PIER_Z[1] - 0.5);
  }
  fence(b, GATE_X, GY, NI, PIER_Z[0] - 0.5);
  for (let i = 1; i < PIER_Z.length; i++) fence(b, GATE_X, GY, PIER_Z[i] + 0.5, (PIER_Z[i + 1] ?? SI + 0.5) - 0.5);
  b.zone('concourse', GATE_X, GY - 0.2, N, HALL[1], GY + 5.4, S, `${name.ja} 中央口`, `${name.en} — Central Gate`, false);
  b.zone('concourse', HALL[0], GY - 0.2, NI, GATE_X, GY + 5.4, SI, `${name.ja} 中央口 改札内`, `${name.en} — Central Gate, inside the gates`, false);

  // ═════════ Signs, boards and ticket machines (AR's own style) ═════════
  const pf = `${nums.join('・')}番のりば`, pfEn = `Platforms ${nums.join('·')}`;
  const metro = stationById(station.transfer!), metroLines = linesAt(metro.id).map((l) => l.id);
  const dep: SignContent = { k: 'ardep', station: station.id, line: line.id };
  const gz = (PIER_Z[0] + PIER_Z[1]) / 2;
  // Over the gate line: a beam with the gate's name towards the free hall and the way out towards the paid side; the departures beside it.
  b.deco('flat:#17181b', GATE_X - 0.1, GY + 2.5, PIER_Z[0] + 0.5, GATE_X + 0.1, GY + 3.5, PIER_Z[1] - 0.5);
  b.sign(AR(`${name.ja} 中央口　${pf}`, `Central Gate — ${line.nameEn}, ${pfEn}`), GATE_X + 0.11, GY + 3.0, gz, [1, 0], 7.2, 0.8);
  b.sign(OUT('出口　駅裏通・高架通・澪屋', 'Exit — Ekiura-dōri / Kōka-dōri / Mioya'), GATE_X - 0.11, GY + 3.0, gz, [-1, 0], 7.2, 0.8);
  board(b, dep, GATE_X + 0.06, GY + 3.1, -87.0, [1, 0], 3.6, 1.4, true);
  b.deco('flat:#17181b', GATE_X - 0.06, GY + 2.3, -89.0, GATE_X + 0.06, GY + 3.9, -85.0);
  // The free hall: ticket machines and the fare chart on its east wall; the ways on over each arch; the station's name outside.
  {
    const c: Ctx = { b, line, station, stop: line.stops.indexOf(station.id), railY: P - PF_H, style: o.style };
    b.with({ rot: 1, t: [HALL[1], 0, gz] }, () => {
      ticketMachines(c, GY, -2.1, 0, 4, false);
      b.sign(AR('きっぷうりば', `Tickets — ${line.nameEn}`), 0, GY + 2.4, 0.03, [0, 1], 4.6, 0.6);
    });
  }
  b.sign({ k: 'guide', ja: `地下鉄 ${metro.nameJa}駅・澪屋`, en: `Metro ${metro.nameRomaji} Sta. / Mioya`, bg: 'navy', badges: metroLines, arrow: 'up' }, 24, 6.75, SI - 0.11, [0, -1], 5.6, 0.55);
  b.sign({ k: 'guide', ja: '高架通・北栄通商店街・バスのりば', en: 'Kōka-dōri / Hokuei-dōri arcade / Buses', bg: 'white', arrow: 'up' }, 24, 6.75, NI + 0.11, [0, 1], 5.6, 0.55);
  for (const [z, n] of [[S + 0.06, 1], [N - 0.06, -1]] as const) b.sign(AR(`${name.ja} 中央口`, `${station.nameRomaji} Station — Central Gate · ${line.nameEn}`), 24, 6.85, z, [0, n], 6.2, 0.95);
  // The paid side: to the platforms, on the walkway's wall beside the stair.
  b.sign(AR(`${pf}・澪屋口　階段 ↑`, `${pfEn} / Mioya Gate — stairs up`), HALL[0] + 0.03, GY + 2.7, -97.6, [1, 0], 4.6, 0.6);
  b.sign(AR(`${pf}　エレベーター（正面）`, `${pfEn} — lift, straight ahead`), HALL[0] + 0.03, GY + 2.7, -86.9, [1, 0], 4.2, 0.6);
  // The mezzanine: departures on its north wall, the platforms and the Central Gate either side; the Mioya Gate on the south wall.
  board(b, dep, 0, MEZZ + 1.3, MN, [0, 1], 3.0, 1.15, true);
  b.sign(AR(`← ${pf} →`, `${pfEn} — stairs up, either side`), 0, MEZZ + 2.12, MN + 0.02, [0, 1], 3.6, 0.3);
  b.sign(OUT('中央口　階段 →', 'Central Gate — stairs down'), 2.75, MEZZ + 1.3, MN + 0.02, [0, 1], 2.1, 0.5);
  b.sign(OUT(`← 澪屋口・地下鉄 ${metro.nameJa}駅`, `Mioya Gate / Metro ${metro.nameRomaji} Sta.`), 1.2, MEZZ + 1.6, SI - 0.02, [0, -1], 4.6, 0.55);
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
