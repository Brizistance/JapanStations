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
  /** The women-only car: which car (1 = the first car at the low-x end of the platform) and its hours, seconds of the day. */
  womenOnly?: { car: number; fromS: number; toS: number };
}

/** A named place: a station, or a city beyond the edge of the map. */
export interface Place {
  nameJa: string;
  nameKana: string;
  nameRomaji: string;
}

/** A stopping pattern on a line (Local, Rapid…). A line's trains are split between its service types. */
export interface ServiceType {
  id: string;
  nameEn: string;
  nameJa: string;
  /** Colour of the type on boards and train displays. */
  color: string;
  /** Stations passed without stopping. Never the first or last stop. */
  skips: StationId[];
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
  /**
   * Stations where an island line has side platforms instead. The tracks keep the line's
   * spacing; the platforms sit outside them, with a wide track bed between (platformTypeAt).
   */
  sideAt?: StationId[];
  /** Platform screen doors: waist-high gates (default) or full-height glass screens. */
  platformDoors?: 'half' | 'full';
  /** Inbound (上り) direction: female platform voice; the other way gets the male voice. Default 'up'. */
  inbound?: Dir;
  /** Distance of each track centre from the line centreline, metres. */
  trackOffset: number;
  /**
   * Stations where the two tracks run one above the other (Hotarugawa): both at lateral
   * STACK_LATERAL, the up track STACK_DY above the down track, easing back to side by side
   * between stations (sim/geometry.ts).
   */
  stackAt?: StationId[];
  /** Centreline in world metres (x = east, z = south). Corners are filleted with `radius`. */
  alignment: { vertices: [number, number][]; radius: number };
  service: ServicePattern;
  /**
   * Route-map corners that are not stations, keyed by segment (i = from stops[i] to
   * stops[i + 1]). Without one, the map draws a segment as a straight line.
   */
  diagramBends?: Record<number, [number, number][]>;
  /** Route-map offset (px, + = left of travel) for segments drawn alongside another line. */
  diagramOffset?: Record<number, number>;
  /** Route-map segments where this line runs on another line's track: drawn as a stripe inside it. */
  diagramShared?: number[];
  /**
   * Through-running: this line runs on another line's track between two stations it serves
   * (Sumire on the Shiokaze Line). Over that section the two alignments coincide, and the
   * timetable is phased so the two lines' trains never meet.
   */
  shares?: { line: LineId; from: StationId; to: StationId };
  /**
   * Stations the line runs through without stopping (on a shared line's track). They shape the
   * vertical profile, so the rail matches the other line's, but get no dwell, number or departures.
   */
  passes?: StationId[];
  /** Extra rail levels between stations, at points on the alignment (e.g. to dive under other lines). */
  profile?: { at: [number, number]; y: number }[];
  /**
   * Service types, each with its own trains every `service.headwayS`. The first is the base
   * timetable; the others are phased half a headway behind it at `servicesMeetAt`.
   */
  services?: ServiceType[];
  servicesMeetAt?: StationId;
  /**
   * A main line that runs on past both end stops to cities off the map. Trains do not turn back at
   * the end stops: they run `runM` metres further to the map edge, and come back as the next train
   * from that city. `up` is the city beyond the first stop, `down` the one beyond the last.
   * `diagram` = where the route map draws the two stubs to.
   */
  beyond?: { up: Place; down: Place; runM: number; diagram: { up: [number, number]; down: [number, number] } };
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
   * (the Shiokaze Line beside the Akanesuji Line at Kita-Ōdōri), or that crosses it further
   * along (the Ichō Line at Shin-Hibarino, reached by a transfer tunnel). Defaults to `position`.
   */
  at?: Partial<Record<LineId, { x: number; y: number }>>;
  /**
   * Schematic route-diagram coords on the octilinear map grid. `label` = where the name goes
   * (default below, or below-right `se` at an interchange); `badges` = which corner the number
   * badges sit in (default: left of a right-hand label, otherwise above).
   */
  diagram: {
    x: number;
    y: number;
    label?: 'right' | 'left' | 'below' | 'above' | 'se' | 'sw' | 'ne' | 'nw';
    badges?: 'ne' | 'nw' | 'sw';
  };
  district: string;
  districtJa: string;
  /** Platform numbers per line: [down platform, up platform]. */
  platforms: Record<LineId, [number, number]>;
  /** One-line description shown in the map panel. */
  blurb: string;
  /** A separate station a short walk away, outside the gates (AR Kawaminato ↔ Kita-Ōdōri). */
  transfer?: StationId;
}

export interface Operator {
  nameEn: string;
  nameJa: string;
  city: string;
  cityJa: string;
}
