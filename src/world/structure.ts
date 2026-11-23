// What carries the track at a given chainage: tunnel, open cut, viaduct, or a station
// (which builds its own structure). Derived purely from the vertical profile.

import { HALL_HALF, TAIL_END, type LineGeom } from '../sim/geometry';
import { lineSim } from '../sim';

export type Structure = 'station' | 'tunnel' | 'cut' | 'viaduct';

export function structureAt(geom: LineGeom, s: number): Structure {
  // (A line built in part has no station that builds its own structure yet: the trackbed runs through.)
  if (!geom.def.built && geom.stopS.some((ss) => Math.abs(s - ss) < HALL_HALF)) return 'station';
  const y = geom.railY(s);
  return y < -5.4 ? 'tunnel' : y < 0.35 ? 'cut' : 'viaduct';
}

/**
 * Is a through-running line on its host's track here (Sumire on the Shiokaze Line)? The host
 * already draws that tunnel and track, so the guest draws nothing there.
 */
export function onHostTrack(geom: LineGeom, s: number): boolean {
  const sh = geom.def.shares;
  if (!sh) return false;
  const p = geom.path.pointAt(s);
  const host = lineSim(sh.line).geom;
  const q = host.path.project(p.x, p.z);
  return q.dist < 0.3 && q.s > 0 && q.s < host.path.length;
}

/** What a viaduct stretch is made of: the metro's concrete deck on piers, or a main line's brick arches or earth embankment. */
export type Deck = 'concrete' | 'brick' | 'bank';
export function deckAt(geom: LineGeom, s: number): Deck {
  if (geom.def.type !== 'jr') return 'concrete';
  return geom.railY(s) >= 8.8 ? 'brick' : 'bank';
}

const stopAt = (geom: LineGeom, id: string) => geom.stopS[geom.def.stops.indexOf(id)];
/** Chainage range of a line built in 3D only in part (LineDef.built), or null. */
export function builtRange(geom: LineGeom): [number, number] | null {
  const b = geom.def.built;
  if (!b) return null;
  const a = stopAt(geom, b.from), e = stopAt(geom, b.to);
  return [Math.min(a, e) - b.stubM, Math.max(a, e) + b.stubM];
}
/** Is the line's structure, track and wire drawn by a station's own models here (LineDef.built.modelled)? */
export const modelled = (geom: LineGeom, s: number): boolean =>
  (geom.def.built?.modelled ?? []).some((m) => s > stopAt(geom, m.station) - m.before && s < stopAt(geom, m.station) + m.after);

/** Beside platforms that a station builds on the swept trackbed (LineDef.built.platformHalf)? */
export const atOwnPlatform = (geom: LineGeom, s: number): boolean =>
  Object.entries(geom.def.built?.platformHalf ?? {}).some(([id, h]) => Math.abs(s - stopAt(geom, id)) < h + 2);

/** Chainage range that has track, including the turnback sidings. */
export const trackRange = (geom: LineGeom): [number, number] => builtRange(geom) ?? [geom.firstS - TAIL_END, geom.lastS + TAIL_END];
/** Half-width of the structure gauge enclosing both tracks. */
export const halfWidth = (geom: LineGeom) => geom.def.trackOffset + 2.2;
/** Beyond the terminal stations the two tracks share one wide box for the crossover. */
export const isSiding = (geom: LineGeom, s: number) => !geom.def.beyond && (s > geom.lastS + HALL_HALF - 1 || s < geom.firstS - HALL_HALF + 1);

/** Sample chainages for building swept geometry: regular spacing plus every station boundary. */
export function sampleChainages(geom: LineGeom, step = 4): number[] {
  const [a, b] = trackRange(geom);
  const set = new Set<number>();
  for (let s = a; s < b; s += step) set.add(Math.round(s * 100) / 100);
  set.add(b);
  // (The ends of what a station's models carry: the swept trackbed meets them exactly.)
  for (const m of geom.def.built?.modelled ?? []) {
    for (const e of [stopAt(geom, m.station) - m.before, stopAt(geom, m.station) + m.after]) if (e > a && e < b) set.add(Math.round(e * 100) / 100);
  }
  for (const ss of geom.stopS) {
    set.add(Math.round((ss - HALL_HALF) * 100) / 100);
    set.add(Math.round((ss + HALL_HALF) * 100) / 100);
  }
  return [...set].sort((p, q) => p - q);
}
