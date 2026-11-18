// Network data model. See docs/network.md.

export type LineId = string; // "Y"
export type StationId = string; // slug, e.g. "tsumugibashi"

/** Direction along a line. "down" = increasing station number, "up" = decreasing. */
export type Dir = 'down' | 'up';

export interface ServicePattern {
  /** Seconds between trains in each direction. */
  headwayS: number;
  /** Scheduled dwell at intermediate stations. */
  dwellS: number;
  /** Dwell at the terminal arrival platform (everyone off). */
  terminalArrivalDwellS: number;
  /** Minimum layover at the terminal departure platform before pad is added. */
  minLayoverS: number;
  /** Time spent stationary in the turnback siding while the driver changes ends. */
  reverseS: number;
  maxSpeed: number; // m/s
  sidingSpeed: number; // m/s
  accel: number; // m/s²
  decel: number; // m/s²
  cars: number;
}

export interface LineDef {
  id: LineId;
  nameEn: string;
  nameJa: string; // 〜線
  nameKana: string;
  color: string; // hex
  type: 'metro' | 'jr' | 'private';
  /** Ordered terminus to terminus, in station-number order. */
  stops: StationId[];
  /** Rail level at each stop, metres relative to street level (negative = underground). */
  railY: number[];
  /**
   * Phase 1 simplification: every station on a line shares one platform type, so the
   * track spacing is constant along the whole line and never has to flare.
   */
  platformType: 'island' | 'side';
  /** Platform screen doors: waist-high gates (default) or full-height glass screens. */
  platformDoors?: 'half' | 'full';
  /** Distance of each track centre from the line centreline, metres. */
  trackOffset: number;
  /** Centreline in world metres (x = east, z = south). Corners are filleted with `radius`. */
  alignment: { vertices: [number, number][]; radius: number };
  service: ServicePattern;
}

export interface StationDef {
  id: StationId;
  nameJa: string; // kanji
  nameKana: string; // hiragana
  nameRomaji: string; // display, with macrons
  numbers: Record<LineId, string>; // { Y: "Y-13", N: "N-13" }
  /**
   * World position in metres (x = east, y = south). Must lie on the alignment of every
   * serving line, except a line listed in `at`.
   */
  position: { x: number; y: number };
  /**
   * Per-line platform centre, for a line that runs alongside another rather than across it
   * (the Shiokaze Line beside the Akanesuji Line at Kita-Ōdōri). Defaults to `position`.
   */
  at?: Partial<Record<LineId, { x: number; y: number }>>;
  /**
   * Schematic route-diagram coords. `label` = where the name goes (default below);
   * `badges` = which corner an interchange's number badges sit in (default left).
   */
  diagram: { x: number; y: number; label?: 'right' | 'below'; badges?: 'ne' | 'nw' };
  district: string;
  districtJa: string;
  /** Platform numbers per line: [down platform, up platform]. */
  platforms: Record<LineId, [number, number]>;
  /** One-line description shown in the map panel. */
  blurb: string;
}

export interface Operator {
  nameEn: string;
  nameJa: string;
  city: string;
  cityJa: string;
}
