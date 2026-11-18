// 3D geometry of a line: alignment + vertical profile + track positions.
// Pure TS, shared by the sim, the track renderer and the station builder.

import type { LineDef } from '../data/types';
import { LINES, stationById } from '../data/network';
import { Alignment } from './alignment';

/** Track is level for this far either side of a station centre. */
export const FLAT_M = 150;
/** Half length of a platform; the station hall is slightly longer. */
export const PLATFORM_HALF = 58;
export const HALL_HALF = 60;
export const CAR_LENGTH = 18;
export const CAR_PITCH = 18.5;
export const BOGIE_OFFSET = 6;

/** Turnback siding geometry, measured outward from the terminus centre. */
export const XOVER_NEAR = 70;
export const XOVER_FAR = 150;
export const TAIL_STOP = 215;
export const TAIL_END = 285;

/**
 * Which rail path a train is following.
 * - down / up: the running tracks (trains keep left, so "down" is at lateral -offset).
 * - xoverEnd: leaving the siding beyond the last stop, crossing from the down track to the up track.
 * - xoverStart: leaving the siding beyond the first stop, crossing from the up track to the down track.
 */
export type Track = 'down' | 'up' | 'xoverEnd' | 'xoverStart';

export const smooth = (t: number) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

export interface Vec3Like {
  x: number;
  y: number;
  z: number;
}

export class LineGeom {
  readonly path: Alignment;
  /** Chainage of each stop along the alignment. */
  readonly stopS: number[];
  /** How far each stop's data position is from the alignment (should be ~0). */
  readonly stopError: number[];

  /**
   * Vertical profile: rail level at each point, level for `flat` metres either side. The points
   * are the stops, the stations passed without stopping, and any extra profile points.
   */
  readonly profile: { s: number; y: number; flat: number }[];

  constructor(readonly def: LineDef) {
    this.path = new Alignment(def.alignment.vertices, def.alignment.radius);
    this.stopS = [];
    this.stopError = [];
    for (const id of def.stops) {
      const st = stationById(id);
      const at = st.at?.[def.id] ?? st.position;
      const p = this.path.project(at.x, at.y);
      this.stopS.push(p.s);
      this.stopError.push(p.dist);
    }
    this.profile = this.stopS.map((s, i) => ({ s, y: def.railY[i], flat: FLAT_M }));
    for (const id of def.passes ?? []) {
      // Level with the line that stops there, whose track this one shares.
      const owner = LINES.find((l) => l.id !== def.id && l.stops.includes(id));
      if (!owner) throw new Error(`${def.id} passes ${id}, which no other line serves`);
      const st = stationById(id);
      this.profile.push({ s: this.path.project(st.position.x, st.position.y).s, y: owner.railY[owner.stops.indexOf(id)], flat: FLAT_M });
    }
    for (const q of def.profile ?? []) this.profile.push({ s: this.path.project(q.at[0], q.at[1]).s, y: q.y, flat: 40 });
    this.profile.sort((a, b) => a.s - b.s);
  }

  get firstS() {
    return this.stopS[0];
  }
  get lastS() {
    return this.stopS[this.stopS.length - 1];
  }

  /** Rail level at chainage s. */
  railY(s: number): number {
    const P = this.profile, n = P.length;
    if (s <= P[0].s) return P[0].y;
    if (s >= P[n - 1].s) return P[n - 1].y;
    let i = 0;
    while (i < n - 2 && s > P[i + 1].s) i++;
    const a = P[i].s + P[i].flat, b = P[i + 1].s - P[i + 1].flat;
    if (b <= a) return s < (a + b) / 2 ? P[i].y : P[i + 1].y;
    return P[i].y + (P[i + 1].y - P[i].y) * smooth((s - a) / (b - a));
  }

  /** Signed lateral offset (+ = right of increasing chainage) of a track at chainage s. */
  lateral(track: Track, s: number): number {
    const L = this.def.trackOffset;
    switch (track) {
      case 'down':
        return -L;
      case 'up':
        return L;
      case 'xoverEnd': {
        const q = s - this.lastS;
        return L - 2 * L * smooth((q - XOVER_NEAR) / (XOVER_FAR - XOVER_NEAR));
      }
      case 'xoverStart': {
        const q = this.firstS - s;
        return -L + 2 * L * smooth((q - XOVER_NEAR) / (XOVER_FAR - XOVER_NEAR));
      }
    }
  }

  /** World position of a point `lateral` metres right of the centreline, at rail level. */
  point(s: number, lateral: number, out: Vec3Like = { x: 0, y: 0, z: 0 }): Vec3Like {
    const p = this.path.pointAt(s);
    out.x = p.x - p.tz * lateral;
    out.z = p.z + p.tx * lateral;
    out.y = this.railY(s);
    return out;
  }

  trackPoint(track: Track, s: number, out?: Vec3Like): Vec3Like {
    return this.point(s, this.lateral(track, s), out);
  }

  /** Yaw (three.js rotation.y) that maps local +x onto the path tangent at s. */
  yawAt(s: number): number {
    const p = this.path.pointAt(s);
    return Math.atan2(-p.tz, p.tx);
  }

  /** Which side of a train the platform is on, as a sign along local +z. */
  doorSide(trackLateral: number): 1 | -1 {
    const s = trackLateral < 0 ? -1 : 1;
    return (this.def.platformType === 'island' ? -s : s) as 1 | -1;
  }
}
