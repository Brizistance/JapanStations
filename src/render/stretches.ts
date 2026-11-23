// Stretches between two stations that get their own trackside and city band (docs/between-stations.md).
// track.ts draws their tunnel kit, portal, wires, fences, noise walls and road bridges;
// world-view.ts lays the band of buildings beside their open-air track.

import type { BuildingKind } from '../stations/buildings';
import type { LineId, StationId } from '../data/types';
import type { LineGeom } from '../sim/geometry';

export interface Stretch {
  line: LineId;
  from: StationId;
  to: StationId;
  /** Building kinds beside the open-air track: the mix near `from`, and near `to` (blended between). */
  band: { from: BuildingKind[]; to: BuildingKind[] };
  /** Streets crossing under the viaduct, `at` metres from `from`: a girder span carries the line over each (the street itself is the station continuation's; only the strip under the viaduct is paved here). */
  roads: { at: number; ja: string; en: string; half: number }[];
  /** The plate over the tunnel portal: the line's name and the year it opened (docs/worldbuilding.md). */
  plaque: string[];
}

export const STRETCHES: Stretch[] = [
  {
    // Out of the university district under Kawaminato's old Nagisa tunnel, up through a portal and a
    // cutting, and onto the viaduct over Hibarino's houses (built 2026-11-22).
    line: 'N',
    from: 'daigaku-mae',
    to: 'hibarino',
    band: { from: ['manshon', 'shophouse', 'machi', 'machi'], to: ['machi', 'machi', 'machi', 'shophouse', 'manshon'] },
    plaque: ['渚線', '1961'],
    // Hibarino's west continuation already has this cross street (hibarino-street.ts, 220 m west of the station).
    roads: [{ at: 880, ja: '菜種筋', en: 'Natane-suji', half: 3.5 }],
  },
];

export const stretchesOf = (geom: LineGeom) => STRETCHES.filter((s) => s.line === geom.def.id);

/** Chainage range of a stretch on its line, low end first, and the chainage of its `from` station. */
export function stretchRange(geom: LineGeom, st: Stretch): { s0: number; s1: number; sFrom: number; dir: 1 | -1 } {
  const a = geom.stopS[geom.def.stops.indexOf(st.from)], b = geom.stopS[geom.def.stops.indexOf(st.to)];
  return { s0: Math.min(a, b), s1: Math.max(a, b), sFrom: a, dir: b > a ? 1 : -1 };
}
