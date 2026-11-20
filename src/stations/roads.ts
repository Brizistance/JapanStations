// The road kit: what stands and is painted on a station's streets, for a street built by
// surface.ts with `roadKit` set.
//
// Traffic keeps left, as in Japan, and this file is the one place that says so. In the station
// frame (+x along the main road, +z across it):
//   - on the main road, traffic going +x uses the z < 0 half, traffic going −x the z > 0 half;
//   - on a road crossing it, traffic going +z uses the x > centre half, traffic going −z the other.
// Everything else follows from `left()` below: a signal's mast stands on its traffic's left kerb
// at the far side of the junction, its arm reaching right over the lanes it controls; vehicles
// face the way their lane goes; kerb lanes (bus, bicycle) are the left-hand ones.
//
// What you see is models (road.glb, tools/blender/build_road.py: masts, poles, shelters, vehicles)
// and game signs laid on them: the signal lenses (live, signs/draw.ts signalState), sign faces,
// the blue direction boards (destinations from the network) and the paint on the road.
//
// Junction kinds, by the width of the crossing road:
//   - wide (half width ≥ 5 m): signals on all four approaches, pedestrian signals on all four
//     crosswalks, a direction board on each approach along the main road;
//   - narrow: a push-button crossing. The main road has signals and the crosswalks over it have
//     pedestrian signals; the side street has 止まれ signs and paint, and kerb mirrors.

import { LINES, stationById } from '../data/network';
import type { Arrow, SignContent } from '../signs/content';
import { rng, type Builder, type V2 } from '../world/builder';
import { GROUND_Y as GY } from './kit';

export interface RoadGeo {
  /** Half extents of the plot. */
  X: number;
  Z: number;
  /** Half width of the main road, and the outer edge of its sidewalk. */
  rw: number;
  swOut: number;
  /** Roads crossing the main one, as x-ranges of their carriageways. */
  streets: [number, number][];
  canal?: number;
  seed: number;
  name: { ja: string; en: string };
  /** The station, and the main road's direction (+x) on the network map. */
  at?: { id: string; dir: [number, number] };
}

// build_road.py: arm lengths, the lens housing's place on an arm, the direction board's place.
const ARMS: [string, number][] = [['signal3', 2.6], ['signal7', 6.4], ['signal9', 8.7]];
const HEAD_Y = 5.55, HEAD_IN = 0.75;
const BOARD = { cx: -4.6, cy: 6.4, w: 3.5, h: 2.94 }; // the sign's face: 1.19 : 1, as sign 108の2-A
/** Vehicles: length, width and height by model family. */
const VEH: Record<string, [number, number, number]> = { sedan: [4.5, 1.72, 1.45], taxi: [4.5, 1.72, 1.6], kei: [3.4, 1.48, 1.72], van: [4.7, 1.72, 1.95], bus: [10.5, 2.5, 3.2] };
const CARS = ['sedan_w', 'sedan_k', 'sedan_r', 'sedan_b', 'sedan_s', 'kei_y', 'kei_w', 'kei_p', 'kei_g', 'van'];

/** The left of someone travelling in direction h (unit, frame xz). */
const left = (h: V2): V2 => [h[1], -h[0]];
/** Frame offset of a model's local point (lx, lz) when its front faces f. */
const off = (f: V2, lx: number, lz: number): V2 => [-lx * f[1] - lz * f[0], lx * f[0] - lz * f[1]];

/** A road model with its front facing f (any direction), drawn merged with the others. */
function put(b: Builder, id: string, x: number, y: number, z: number, f: V2) {
  const d = b.dir(f);
  b.out.models.push({ kind: 'road', id, pos: b.pt(x, y, z), yaw: Math.atan2(-d[0], -d[1]) + 0, seed: 0, merge: true });
}

/** Where the taxi stand begins (first cab), on the −x-bound kerb. */
const TAXI_X = 40;

/** x of the bus shelter for traffic going sx: past the first wide junction going +x, before it going −x. */
function busStopX(streets: [number, number][], sx: 1 | -1): number | null {
  const j = streets.find(([a, c]) => (c - a) / 2 >= 5) ?? streets[0];
  return j ? (sx > 0 ? j[1] + 17 : j[0] - 27) : null;
}

/**
 * Stretches of the main road's kerb left without guard rail, so people can reach a bus or a taxi:
 * `s` is the side (the sign of z), x0 … x1 the gap. surface.ts builds the rail round them.
 */
export function kerbGaps(streets: [number, number][]): { s: 1 | -1; x0: number; x1: number }[] {
  const out: { s: 1 | -1; x0: number; x1: number }[] = [];
  for (const sx of [1, -1] as const) {
    const x = busStopX([...streets].sort((p, q) => p[0] - q[0]), sx);
    if (x !== null) out.push({ s: left([sx, 0])[1] as 1 | -1, x0: Math.min(x - sx * 5.5, x + sx * 8), x1: Math.max(x - sx * 5.5, x + sx * 8) });
  }
  out.push({ s: left([-1, 0])[1] as 1 | -1, x0: TAXI_X - 3, x1: TAXI_X + 14.5 });
  return out;
}

/** One 2.5 m panel of kerb guard rail along the main road (surface.ts adds the collider). */
export function kerbRail(b: Builder, x: number, z: number) {
  put(b, 'rail', x, GY, z, [0, -1]);
}

/**
 * A vehicle signal for traffic travelling h: mast at (mx, mz) on the left kerb at the far side,
 * head `reach` m out over the lanes, facing the traffic.
 */
function vehicleSignal(b: Builder, mx: number, mz: number, h: V2, reach: number, axis: 0 | 1) {
  const f: V2 = [-h[0], -h[1]];
  const [id, arm] = ARMS.find(([, a]) => a - HEAD_IN >= reach - 0.6) ?? ARMS[ARMS.length - 1];
  put(b, id, mx, GY, mz, f);
  b.block(mx - 0.16, GY, mz - 0.16, mx + 0.16, GY + 3, mz + 0.16);
  const [ox, oz] = off(f, -(arm - HEAD_IN), -0.15);
  b.sign({ k: 'signal', v: 'car', axis }, mx + ox, GY + HEAD_Y, mz + oz, f, 1.3, 0.44);
}

/** A pedestrian signal at (x, z) facing f (towards the people crossing to it). */
function pedSignal(b: Builder, x: number, z: number, f: V2, axis: 0 | 1) {
  put(b, 'ped', x, GY, z, f);
  b.block(x - 0.1, GY, z - 0.1, x + 0.1, GY + 2.2, z + 0.1);
  const [ox, oz] = off(f, 0, -0.345);
  b.sign({ k: 'signal', v: 'ped', axis }, x + ox, GY + 2.65, z + oz, f, 0.36, 0.74);
}

type SignV = Extract<SignContent, { k: 'roadsign' }>['v'];
const BACK: Record<string, SignV> = { stop: 'back-tri', speed40: 'back-round', noparking: 'back-round', crossing: 'back-penta' };

/** A road sign on its own pole at (x, z), its face towards f. */
function roadSign(b: Builder, v: 'stop' | 'speed40' | 'noparking' | 'crossing', x: number, z: number, f: V2, size = 0.7) {
  put(b, 'signpole', x, GY, z, f);
  b.block(x - 0.06, GY, z - 0.06, x + 0.06, GY + 2, z + 0.06);
  const y = GY + 2.72;
  const [ox, oz] = off(f, 0, -0.05);
  b.sign({ k: 'roadsign', v }, x + ox, y, z + oz, f, size, size);
  b.sign({ k: 'roadsign', v: BACK[v] }, x - ox, y, z - oz, [-f[0], -f[1]], size, size);
}

/** Paint on the road at (x, z), its top towards the direction of travel h. */
function mark(b: Builder, v: Extract<SignContent, { k: 'roadmark' }>['v'], x: number, z: number, h: V2, w: number, len: number) {
  b.sign({ k: 'roadmark', v }, x, 0.016, z, null, w, len, { top: h });
}

/**
 * Where the roads lead: the nearest neighbouring station of this one in each direction of the
 * frame, from the network (never typed in). Keys: +x, −x, +z, −z.
 */
function destinations(at: RoadGeo['at']): Partial<Record<'px' | 'nx' | 'pz' | 'nz', { ja: string; en: string }>> {
  if (!at) return {};
  const here = stationById(at.id);
  const [tx, tz] = at.dir;
  const best: Partial<Record<string, { d: number; ja: string; en: string }>> = {};
  for (const line of LINES) {
    const i = line.stops.indexOf(at.id);
    if (i < 0) continue;
    for (const j of [i - 1, i + 1]) {
      const id = line.stops[j];
      if (!id) continue;
      const n = stationById(id);
      const dx = n.position.x - here.position.x, dz = n.position.y - here.position.y;
      const lx = dx * tx + dz * tz, lz = -dx * tz + dz * tx;
      const key = Math.abs(lx) >= Math.abs(lz) ? (lx > 0 ? 'px' : 'nx') : lz > 0 ? 'pz' : 'nz';
      const d = Math.hypot(lx, lz);
      if (!best[key] || d < best[key]!.d) best[key] = { d, ja: n.nameJa, en: n.nameRomaji };
    }
  }
  return best;
}

export function roadKit(b: Builder, g: RoadGeo) {
  const { X, Z, rw } = g;
  const r = rng(g.seed * 7 + 101);
  const streets = [...g.streets].sort((p, q) => p[0] - q[0]);
  const dest = destinations(g.at);
  // Lanes of the main road, per direction, by |z|: the general lane next to the centre line, the
  // bus lane, and the bicycle lane at the kerb.
  const LANE = rw / 2, GEN = LANE / 2, BUS = LANE + (rw - 1.5 - LANE) / 2, BIKE = rw - 0.75;
  /** z of a main-road lane for traffic travelling sx (+1 or −1 along x). */
  const laneZ = (sx: number, d: number) => left([sx, 0])[1] * d;

  // ── Vehicles: placed facing their lane's direction, never overlapping ──
  const parked: [number, number, number, number][] = [];
  const vehicle = (id: string, x: number, z: number, h: V2): boolean => {
    const [len, wid, hgt] = VEH[id.split('_')[0]];
    const hx = h[0] !== 0 ? len / 2 : wid / 2, hz = h[0] !== 0 ? wid / 2 : len / 2;
    const box: [number, number, number, number] = [x - hx - 0.6, z - hz - 0.3, x + hx + 0.6, z + hz + 0.3];
    if (Math.abs(x) + hx > X - 2 || Math.abs(z) + hz > Z - 2) return false;
    if (parked.some((p) => box[0] < p[2] && box[2] > p[0] && box[1] < p[3] && box[3] > p[1])) return false;
    parked.push(box);
    put(b, id, x, 0, z, h);
    b.block(x - hx, 0, z - hz, x + hx, hgt, z + hz);
    return true;
  };
  const anyCar = () => CARS[Math.floor(r() * CARS.length)];

  // ── Junctions ──
  const zones: [number, number][] = []; // x-ranges of the main road taken by a junction
  for (const [a, c] of streets) {
    const mid = (a + c) / 2, half = (c - a) / 2, wide = half >= 5;
    zones.push([a - 9, c + 9]);
    // Main road: far-side signals, heads over the general and bus lanes.
    for (const sx of [1, -1] as const) {
      const h: V2 = [sx, 0], l = left(h);
      const mx = sx > 0 ? c + 1.2 : a - 1.2, mz = l[1] * (rw + 0.7);
      vehicleSignal(b, mx, mz, h, rw + 0.7 - (GEN + LANE) / 2, 0);
      // Queue at the stop line (x = a − 7 going +x, c + 7 going −x).
      const stop = sx > 0 ? a - 7.4 : c + 7.4;
      let q = stop - sx * 2.6;
      for (let k = 0; k < 2; k++) {
        const id = anyCar();
        vehicle(id, q - sx * (VEH[id.split('_')[0]][0] / 2 - 2.25), laneZ(sx, GEN), h);
        q -= sx * 6.2;
      }
      if (r() < 0.6) vehicle(anyCar(), stop - sx * 2.9, laneZ(sx, BUS), h);
      // Arrows before the stop line: ahead or right from the general lane, ahead or left from the bus lane.
      mark(b, wide ? 'ahead-right' : 'ahead', stop - sx * 16, laneZ(sx, GEN), h, 1.3, 5);
      mark(b, 'ahead-left', stop - sx * 16, laneZ(sx, BUS), h, 1.3, 5);
      // Crosswalk warning: two diamonds, and the sign at the kerb.
      for (const d of [30, 42]) mark(b, 'diamond', stop - sx * d, laneZ(sx, GEN), h, 1.5, 5);
      roadSign(b, 'crossing', stop - sx * 14, l[1] * (rw + 0.75), [-sx, 0]);
    }
    // Pedestrian signals on the crosswalks over the main road (at a − 4 and c + 4): walk with the cross traffic.
    for (const xw of [a - 4, c + 4]) {
      const e = xw < mid ? -2.4 : 2.4;
      pedSignal(b, xw + e, -(rw + 0.8), [0, 1], 1);
      pedSignal(b, xw + e, rw + 0.8, [0, -1], 1);
      // Bollards at the crosswalk mouths.
      for (const s of [-1, 1]) for (const dx of [-1.6, 0, 1.6]) {
        put(b, 'bollard', xw + dx, GY, s * (rw + 0.35), [0, -1]);
        b.block(xw + dx - 0.08, GY, s * (rw + 0.35) - 0.08, xw + dx + 0.08, GY + 0.85, s * (rw + 0.35) + 0.08);
      }
    }
    // The crossing road.
    for (const sz of [1, -1] as const) {
      const h: V2 = [0, sz], l = left(h);
      // Its traffic's half: x from the centre line out to the kerb on its left.
      const lx = (d: number) => mid + l[0] * d;
      // Stop line before the crosswalk (which lies 1.2 … 5.2 m outside the main road's kerb).
      const stopZ = -sz * (rw + 6.4);
      b.deco('flat:#e9e9e4', Math.min(mid, lx(half - 0.2)), 0.004, stopZ - 0.2, Math.max(mid, lx(half - 0.2)), 0.01, stopZ + 0.2);
      if (wide) {
        vehicleSignal(b, lx(half + 0.7), sz * (rw + 1.2), h, half + 0.7 - half / 2, 1);
        // Two lanes each way: a queue in each.
        for (const [d, n] of [[half * 0.27, 2], [half * 0.74, 1]] as const) {
          let q = stopZ - sz * 2.8;
          for (let k = 0; k < n; k++) {
            vehicle(anyCar(), lx(d), q, h);
            q -= sz * 6.2;
          }
        }
        mark(b, 'ahead', lx(half * 0.27), stopZ - sz * 16, h, 1.3, 5);
        mark(b, 'ahead-left', lx(half * 0.74), stopZ - sz * 16, h, 1.3, 5);
        // Pedestrian signals on the crosswalk over this road: walk with the main road's traffic.
        const zc = -sz * (rw + 3.2);
        pedSignal(b, a - 0.8, zc - sz * 2.4, [1, 0], 0);
        pedSignal(b, c + 0.8, zc - sz * 2.4, [-1, 0], 0);
      } else {
        // A side street: stop sign on the left kerb, 止まれ on the road, a mirror at the far corner.
        roadSign(b, 'stop', lx(half + 0.55), stopZ - sz * 0.6, [0, -sz], 0.8);
        mark(b, 'stop', lx(half / 2), stopZ - sz * 4.6, h, 1.9, 5.6);
        put(b, 'mirror', lx(-(half + 0.7)) , GY, sz * (rw + 1.2), [0, -sz]);
        if (r() < 0.8) vehicle(r() < 0.5 ? 'kei_w' : 'kei_y', lx(half / 2), stopZ - sz * 2.4, h);
        // Utility poles along its left kerb.
        for (let d = 26; d < Z - rw - 6; d += 27) put(b, 'upole', lx(half + 0.9), GY, -sz * (rw + d), [-l[0], 0]);
      }
    }
    // Direction boards over the main road's approaches to a wide junction.
    if (wide) {
      for (const sx of [1, -1] as const) {
        const h: V2 = [sx, 0], l = left(h), f: V2 = [-sx, 0];
        const ahead = sx > 0 ? dest.px : dest.nx, toLeft = l[1] > 0 ? dest.pz : dest.nz, toRight = l[1] > 0 ? dest.nz : dest.pz;
        const rows: { ja: string; en: string; arrow: Arrow }[] = [];
        if (toLeft) rows.push({ ...toLeft, arrow: 'left' });
        if (ahead) rows.push({ ...ahead, arrow: 'up' });
        if (toRight) rows.push({ ...toRight, arrow: 'right' });
        if (!rows.length) continue;
        const mx = (sx > 0 ? a : c) - sx * 46, mz = l[1] * (rw + 0.9);
        put(b, 'gantry', mx, GY, mz, f);
        b.block(mx - 0.3, GY, mz - 0.3, mx + 0.3, GY + 3, mz + 0.3);
        const [ox, oz] = off(f, BOARD.cx, -0.16);
        b.sign({ k: 'roadboard', rows: rows.map(({ ja, en, arrow }) => ({ ja, en, arrow })) }, mx + ox, GY + BOARD.cy, mz + oz, f, BOARD.w, BOARD.h);
      }
    }
  }

  // ── Between the junctions: bus and bicycle lanes, speed limit, parking, traffic ──
  const clear = (x: number, m: number) => !zones.some(([p, q]) => x > p - m && x < q + m);
  const cuts = [-X, ...zones.flatMap(([p, q]) => [p, q]), X];
  // ── Bus stops: one each way, on the longest stretch, clear of the junctions ──
  for (const sx of [1, -1] as const) {
    const h: V2 = [sx, 0], s = left(h)[1];
    const x = busStopX(streets, sx);
    if (x === null || !clear(x, 6) || Math.abs(x) > X - 20) continue;
    const f: V2 = [0, -s]; // facing the road
    put(b, 'busstop', x + sx * 6.5, GY, s * (rw + 0.75), f);
    b.block(x + sx * 6.5 - 0.1, GY, s * (rw + 0.75) - 0.1, x + sx * 6.5 + 0.1, GY + 2.2, s * (rw + 0.75) + 0.1);
    const [ox, oz] = off(f, 0, -0.045);
    b.sign({ k: 'label', text: 'バス', sub: 'BUS', fg: '#1f2023', bg: '#f4f4f0' }, x + sx * 6.5 + ox, GY + 2.62, s * (rw + 0.75) + oz, f, 0.34, 0.34);
    b.sign({ k: 'label', text: g.name.ja, sub: `${g.name.en} · Bus stop`, fg: '#1f2023', bg: '#f4f4f0' }, x + sx * 6.5 + ox, GY + 1.5, s * (rw + 0.75) + oz, f, 0.5, 0.82);
    put(b, 'shelter', x, GY, s * (rw + 2.7), f);
    b.block(x - 1.95, GY, s * (rw + 2.7) + s * 0.6, x + 1.95, GY + 2.4, s * (rw + 2.7) + s * 0.8);
    b.block(x - 1.4, GY, s * (rw + 2.7) + s * 0.15, x + 1.4, GY + 0.5, s * (rw + 2.7) + s * 0.6);
    // The bus stands at it, pulled in to the kerb (the guard rail is left open here: kerbGaps).
    vehicle('bus', x + sx * 0.5, laneZ(sx, rw - 1.45), h);
  }
  // Taxis waiting at the kerb on the −x-bound side, behind one another.
  for (let k = 0; k < 3; k++) {
    const x = TAXI_X + k * 5.6;
    if (clear(x, 3)) vehicle('taxi', x, laneZ(-1, rw - 1.05), [-1, 0]);
  }

  for (let i = 0; i < cuts.length; i += 2) {
    const x0 = cuts[i], x1 = cuts[i + 1];
    if (x1 - x0 < 12) continue;
    for (const sx of [1, -1] as const) {
      const h: V2 = [sx, 0], l = left(h), s = l[1];
      // Bicycle lane: a blue strip at the kerb. Bus lane: a tinted band with its lettering.
      b.deco('flat:#2f6fb0', x0, 0.002, Math.min(s * (rw - 1.4), s * (rw - 0.15)), x1, 0.007, Math.max(s * (rw - 1.4), s * (rw - 0.15)));
      b.deco('flat:#e9e9e4', x0, 0.004, s * (rw - 1.5) - 0.06, x1, 0.01, s * (rw - 1.5) + 0.06);
      b.deco('flat:#6d4a40', x0, 0.002, Math.min(s * (LANE + 0.15), s * (rw - 1.62)), x1, 0.006, Math.max(s * (LANE + 0.15), s * (rw - 1.62)));
      const from = sx > 0 ? x0 : x1; // where this direction enters the stretch
      for (let d = 14; d < x1 - x0 - 26; d += 44) {
        mark(b, 'bus', from + sx * d, laneZ(sx, BUS), h, 1.9, 7.4);
        mark(b, 'bike', from + sx * (d + 14), laneZ(sx, BIKE), h, 1.0, 1.6);
      }
      if (x1 - x0 > 50) {
        mark(b, '40', from + sx * 30, laneZ(sx, GEN), h, 1.9, 4.6);
        roadSign(b, 'speed40', from + sx * 9, s * (rw + 0.75), [-sx, 0]);
        roadSign(b, 'noparking', from + sx * (x1 - x0) * 0.55, s * (rw + 0.75), [-sx, 0], 0.6);
      }
      // Moving traffic, mid-block.
      for (let k = 0; k < Math.floor((x1 - x0) / 34); k++) {
        const x = x0 + 8 + r() * (x1 - x0 - 16);
        if (clear(x, 4)) vehicle(anyCar(), x, laneZ(sx, r() < 0.7 ? GEN : BUS), h);
      }
    }
  }

}
