// What carries the track at a given chainage: tunnel, open cut, viaduct, or a station
// (which builds its own structure). Derived purely from the vertical profile.

import { HALL_HALF, TAIL_END, type LineGeom } from '../sim/geometry';

export type Structure = 'station' | 'tunnel' | 'cut' | 'viaduct';

export function structureAt(geom: LineGeom, s: number): Structure {
  if (geom.stopS.some((ss) => Math.abs(s - ss) < HALL_HALF)) return 'station';
  const y = geom.railY(s);
  return y < -5.4 ? 'tunnel' : y < 0.35 ? 'cut' : 'viaduct';
}

/** Chainage range that has track, including the turnback sidings. */
export const trackRange = (geom: LineGeom): [number, number] => [geom.firstS - TAIL_END, geom.lastS + TAIL_END];
/** Half-width of the structure gauge enclosing both tracks. */
export const halfWidth = (geom: LineGeom) => geom.def.trackOffset + 2.2;
/** Beyond the terminal stations the two tracks share one wide box for the crossover. */
export const isSiding = (geom: LineGeom, s: number) => s > geom.lastS + HALL_HALF - 1 || s < geom.firstS - HALL_HALF + 1;

/** Sample chainages for building swept geometry: regular spacing plus every station boundary. */
export function sampleChainages(geom: LineGeom, step = 4): number[] {
  const [a, b] = trackRange(geom);
  const set = new Set<number>();
  for (let s = a; s < b; s += step) set.add(Math.round(s * 100) / 100);
  set.add(b);
  for (const ss of geom.stopS) {
    set.add(Math.round((ss - HALL_HALF) * 100) / 100);
    set.add(Math.round((ss + HALL_HALF) * 100) / 100);
  }
  return [...set].sort((p, q) => p - q);
}
