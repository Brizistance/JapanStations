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
  | { k: 'lcd'; line: LineId; train: number }
  /**
   * Floor decal (stations/floor.ts): an arrow and a line badge, and on a big mark the platform
   * numbers that way (`nums`, のりば / Platforms) or, with `transfer`, のりかえ / Transfer. With
   * neither, a small badge repeated along a line band. `text` / `sub` are free text instead.
   */
  | { k: 'floormark'; arrow?: Arrow; line?: LineId; text?: string; sub?: string; nums?: number[]; transfer?: boolean }
  /**
   * The lenses of a traffic signal (stations/roads.ts), live from the sim clock: a horizontal
   * vehicle head (green, yellow, red from the left) or a pedestrian head (red man over green man).
   * `axis` is the road whose traffic it goes with: 0 the main road, 1 the roads crossing it. A
   * pedestrian head has the axis of the traffic that runs parallel to its crosswalk.
   */
  | { k: 'signal'; v: 'car' | 'ped'; axis: 0 | 1 }
  /** A road sign's face (the `back-…` ones are the grey backs of the three shapes). Cut out to its shape. */
  | { k: 'roadsign'; v: 'stop' | 'speed40' | 'speed30' | 'noparking' | 'nostopping' | 'crossing' | 'school' | 'hydrant' | 'back-tri' | 'back-round' | 'back-penta' | 'back-diamond' }
  /**
   * Level crossing (踏切), live: the pair of warning lamps, or the gate arm on a square face with its
   * pivot at the bottom-left (bottom-right when `flip`, for the face seen from behind). Both follow
   * the trains of `line` at `station` (signs/departures.ts crossingActive).
   */
  | { k: 'crossing'; v: 'lamps' | 'arm'; line: LineId; station: StationId; flip?: boolean }
  /** Address plate on a pole or wall (街区表示板): green, the town and chōme written downwards. */
  | { k: 'address'; ja: string; en: string }
  /** Blue overhead direction board: what lies ahead, to the left and to the right. */
  | { k: 'roadboard'; rows: { ja: string; en: string; arrow: Arrow }[] }
  /** A junction's name plate on a signal arm: white, blue border, kanji over romaji. */
  | { k: 'junction'; ja: string; en: string }
  /** Paint on the road, cut out, its top towards the direction of travel. */
  | { k: 'roadmark'; v: 'ahead' | 'ahead-left' | 'ahead-right' | 'stop' | '40' | 'diamond' | 'bus' | 'bike' };

export const signKey = (c: SignContent, w: number, h: number) => `${JSON.stringify(c)}|${w.toFixed(2)}x${h.toFixed(2)}`;
