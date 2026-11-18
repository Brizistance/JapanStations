// What a sign shows. Signs are described as data and drawn to canvas textures (see draw.ts),
// so every sign in every station comes from the network data rather than hand-made images.

import type { Dir, LineId, StationId } from '../data/types';

export type Arrow = 'left' | 'right' | 'up' | 'down';
export type Picto = 'toilet' | 'lift' | 'locker' | 'tickets' | 'office' | 'info' | 'stairs' | 'escalator' | 'bus' | 'taxi';

export type SignContent =
  /** Station name board. `arrow` = which side the down-direction neighbour is on. */
  | { k: 'name'; station: StationId; line: LineId; arrow?: Arrow }
  /** Platform header: platform number, line, "for <terminus>". */
  | { k: 'dir'; station: StationId; line: LineId; dir: Dir; arrow?: Arrow }
  /** Generic wayfinding strip. */
  | { k: 'guide'; ja: string; en: string; bg: 'navy' | 'white' | 'yellow' | 'green'; badges?: LineId[]; num?: string; arrow?: Arrow }
  | { k: 'entrance'; station: StationId; exit?: string }
  | { k: 'faremap'; station: StationId }
  | { k: 'shop'; ja: string; en?: string; bg: string; fg: string; vertical?: boolean }
  | { k: 'poster'; v: number }
  | { k: 'machine'; v: 'ticket' | 'vending' | 'vending2' | 'locker' | 'charge' | 'elevator' | 'door' | 'window' }
  | { k: 'mural'; v: string; color: string }
  | { k: 'label'; text: string; sub?: string; fg: string; bg: string }
  /**
   * Yellow exit board (出口案内): exit numbers with what is near each, from stations/exits.ts.
   * `only` limits it to some exits (a sign pointing one way); `arrow` adds a direction.
   */
  | { k: 'exits'; station: StationId; only?: string[]; arrow?: Arrow }
  /** Facility pictogram, optionally with its caption and an arrow. */
  | { k: 'picto'; v: Picto; label?: boolean; arrow?: Arrow }
  /** Station map (構内図): the station's levels, lines, platform numbers and exits. */
  | { k: 'stationmap'; station: StationId }
  /** Area map (周辺図): schematic of the streets above, with the exits marked. */
  | { k: 'areamap'; station: StationId }
  /** Live platform departure indicator. */
  | { k: 'dep'; station: StationId; line: LineId; dir: Dir }
  /** Live concourse departure summary for all lines at the station. */
  | { k: 'depAll'; station: StationId }
  /** Live station clock (analogue face), showing the sim time. */
  | { k: 'clock' }
  /** Train destination LED. */
  | { k: 'dest'; line: LineId; dir: Dir | 'none' }
  /** Live in-car information display. */
  | { k: 'lcd'; line: LineId; train: number };

export const signKey = (c: SignContent, w: number, h: number) => `${JSON.stringify(c)}|${w.toFixed(2)}x${h.toFixed(2)}`;
