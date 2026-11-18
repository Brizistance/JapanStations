// Station looks: what a station is like away from its platforms.
//
// A line's theme (../themes) shapes the platform hall. A station's look shapes the concourse,
// the exits and (at interchanges) the transfer passages: finishes, ceiling, a centrepiece, shops
// and clutter. The composers in build.ts and kit.ts build the structure, gates, machines, signs
// and zones, then call the hooks below. A station without a look of its own gets the default
// look (default.ts).
//
// Unlike line themes, a look may add solid things (`b.box`): a kiosk should be solid. Anything
// solid must sit on a rectangle for which `free()` is true, and must leave every zone reachable
// (walk.test.ts checks that).

import type { LineDef, StationDef } from '../../data/types';
import type { Builder } from '../../world/builder';
import type { StationStyle } from '../kit';

/** [x0, z0, x1, z1] */
export type Rect = [number, number, number, number];

/** A stair or escalator opening in the concourse floor, and where it leads. */
export interface StairInfo {
  /** The line it leads to. */
  line: LineDef;
  /** 'platform': straight down to that line's platform. 'transfer': down to a passage that leads to it. */
  kind: 'platform' | 'transfer';
  /** Platform numbers it serves. */
  platforms: number[];
  /** The opening. */
  rect: Rect;
  /** Where you stand at the top, just clear of the opening, and the direction you then walk down. */
  top: [number, number];
  down: [number, number];
}

/** An exit doorway in a long wall of the concourse. */
export interface ExitDoor {
  num: string;
  /** Wall: z = s·cw. */
  s: 1 | -1;
  /** Doorway along the wall. */
  x0: number;
  x1: number;
  /** Gate line (index into `ends`) whose unpaid hall it opens off. */
  end: number;
}

/** Finishes a look can override in the concourse, exits and transfer passages (material keys). */
export interface Finishes {
  wall?: string;
  floor?: string;
  pillar?: string;
  /** Ceiling finish (default 'ceil'). */
  ceil?: string;
}

/**
 * The concourse as a look sees it. Coordinates are the station frame: +x along the primary
 * line, the concourse is x0 … x1 by −cw … +cw, floor at `cf`, ceiling underside at `cf + clear`.
 */
export interface ConcInfo {
  b: Builder;
  station: StationDef;
  /** The station's primary line. */
  line: LineDef;
  /** Year that line opened: older means smaller, lower, busier. */
  era: number;
  style: StationStyle;
  /** Finishes in force (the look's overrides over the station's style). */
  wall: string;
  floor: string;
  pillar: string;
  ceil: string;
  cf: number;
  /** Half width: 8 (old), 10 or 12 (new) at ordinary stations, 14+ at interchanges. */
  cw: number;
  /** Clear height, floor to ceiling (3.0). */
  clear: number;
  x0: number;
  x1: number;
  /**
   * Gate lines. Each runs across the full width at x = g. `hi`: the unpaid side is x > g and
   * runs 16 m to the end wall, with ticket machines on the −z wall, lockers on the +z wall, the
   * exit doorways at g + 9 … g + 13 on both walls, and the mural on the end wall. `hi` false:
   * the same, mirrored (unpaid side is x < g).
   */
  ends: { g: number; hi: boolean }[];
  /** x-range inside the gates. */
  paid: [number, number];
  /** Stair and escalator openings in the floor. */
  holes: Rect[];
  /** The same openings with where each leads (every hole has one). */
  stairs: StairInfo[];
  /** Exit doorways. */
  exits: ExitDoor[];
  /** Centres of the concourse pillars (0.7 m square colliders). */
  pillars: [number, number][];
  /**
   * True if the rectangle, grown by `margin`, is inside the concourse and clear of everything
   * already there: stair openings and their landings, the gate lines and offices, machines,
   * lockers, exit doorways, toilets, the mural, pillars, lifts, and anything `claim`ed.
   */
  free(x0: number, z0: number, x1: number, z1: number, margin?: number): boolean;
  /** Mark a rectangle as taken, so later parts avoid it. */
  claim(x0: number, z0: number, x1: number, z1: number): void;
  /** Deterministic 0…1 random number, seeded per station. */
  rand(): number;
}

/**
 * One exit, in its own canonical frame: the concourse wall line is z = 0 (concourse at z < 0).
 * A corridor 4 m wide (x = −4 … 0) runs from z = 0 to z = `ext` under a 2.5 m ceiling (ext is 0
 * at the widest stations), then a 4 × 4 m lobby (z = ext … ext + 4) under a 2.7 m ceiling. The
 * stair climbs along +x from x = 0 to x = `run`, between z = ext + 1.2 and ext + 4.0, up to the
 * street at y = `gy`. Walls: x = −4 (faces +x), x = 0 from z = 0 … ext + 0.9 (faces −x), and
 * z = ext + 4 (faces −z; a poster hangs there at x = −2).
 */
export interface ExitInfo {
  b: Builder;
  station: StationDef;
  style: StationStyle;
  wall: string;
  floor: string;
  cf: number;
  /** Street level. */
  gy: number;
  num: string;
  ext: number;
  run: number;
}

/**
 * One transfer passage at an interchange, in a frame where the passage runs along x from −26 to
 * 4 between z = zc0 and zc1 (4.3 m wide), floor at `pf`, ceiling 2.8 m above. The zc0 wall has
 * doorways from the platform at some stations; the zc1 wall carries the mural (x = −23 … −4,
 * pf + 0.4 … 2.3) and the opening to the stairs down (x = −1.86 … 1.86). Stairs up to the
 * concourse start at x = 4.
 */
export interface PassageInfo {
  b: Builder;
  station: StationDef;
  style: StationStyle;
  wall: string;
  floor: string;
  pf: number;
  zc0: number;
  zc1: number;
  /** The line the passage leads to. */
  other: LineDef;
}

export interface StationLook {
  finishes?: Finishes;
  /** Set false to leave the kit's posters off the paid-area walls (when shops go there). */
  posters?: false;
  /** Set false to leave off the kit's accent rail and skirting on the long walls. */
  skirting?: false;
  /** Everything a look adds to the concourse. Runs last, after the kit has placed its parts. */
  concourse?(i: ConcInfo): void;
  /** All concourse ceiling lighting. Replaces the kit's strip lights. */
  lights?(i: ConcInfo): void;
  /** One concourse pillar from y0 to y1, centred on (x, z). The 0.7 m collider is the kit's. */
  pillar?(i: ConcInfo, x: number, z: number, y0: number, y1: number): void;
  /** Decoration for one exit corridor, lobby and stair (decoration only). */
  exit?(e: ExitInfo): void;
  /**
   * The street-level entrance over the stair. Replaces the kit's glass canopy, its four posts
   * and the dark board behind the entrance sign (the sign itself stays, facing +x at
   * x = run + 0.06, y = gy + 2.2, z = ext + 2.6, 2.9 × 0.6 m). Decoration only, and keep the
   * stair mouth (x = 0 … run, z = ext + 1.2 … ext + 4.0) open to 2.3 m.
   */
  canopy?(e: ExitInfo): void;
  /** Decoration for one transfer passage (decoration only). */
  passage?(p: PassageInfo): void;
}
