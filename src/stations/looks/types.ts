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

/**
 * A gap in one of the spine's two long walls (z = s·cw): an exit doorway, or the mouth of a room
 * beyond the wall (a transfer bay, or at Tsumugibashi a cross passage to the Kikyō spine).
 * Nothing may be built in front of one: `free()` already refuses the floor 2.5 m in front of a
 * room mouth and the exit doorways' landings.
 */
export interface WallOpening {
  /** Wall: z = s·cw. */
  s: 1 | -1;
  /** The gap along the wall. */
  x0: number;
  x1: number;
  /** 'exit': an exit doorway (`num` is set). 'bay': the mouth of a room (`room` is set). */
  kind: 'exit' | 'bay';
  /** Exit number (kind 'exit'). */
  num?: string;
  /** Index into `ConcInfo.rooms` of the room it opens into (kind 'bay'). */
  room?: number;
}

/**
 * A finished vertical wall face, as `Face` in parts.ts (`axis`, `at`, `n`) plus its extent: it runs
 * along `axis` from u0 to u1, its surface is at cross position `at` (z for an 'x' face, x for a
 * 'z' face), and it faces `n` (±1 across, into the room). Floor to ceiling (cf … cf + clear).
 * A face may run along a stair opening (behind its glass rail): check `stairs` before standing
 * anything solid against it.
 */
export interface WallFace {
  axis: 'x' | 'z';
  at: number;
  n: 1 | -1;
  u0: number;
  u1: number;
}

/**
 * An opening from a room into a neighbouring walkable area: a gap in a wall (or, between two
 * rooms that touch, simply where they meet). It lies in the plane `at` (z for axis 'x', x for
 * axis 'z'), from u0 to u1 along `axis`, at the room's own edge.
 */
export interface Mouth {
  axis: 'x' | 'z';
  at: number;
  u0: number;
  u1: number;
  /** Index into `ConcInfo.rooms` of the area on the other side, or −1 for the spine. */
  to: number;
}

/**
 * A walkable room on the concourse level outside the spine (−cw … +cw). At interchanges the
 * stairs that do not fit in the spine each sit in a room of their own; at Tsumugibashi a second
 * spine over the Kikyō Line and the cross passages to it are rooms too. Each room is walled on
 * every edge except its mouths, floored, ceiled at cf + clear and lit by the kit, and has a zone.
 */
export interface ConcRoom {
  /**
   * 'transfer bay': a stair and escalator down to a transfer passage, plus a small lobby at its
   *   head; the bay's walls are that stair's stairwell (its `stairwells` entry has no walls of its
   *   own, only the portal).
   * 'spine': a second corridor (Tsumugibashi's Kikyō concourse), closed at both ends, with its
   *   own stairs walled as in the spine.
   * 'cross passage': a short passage joining two spines.
   */
  kind: 'transfer bay' | 'spine' | 'cross passage';
  rect: Rect;
  /** The room's zone name. */
  ja: string;
  en: string;
  /** Every way in or out, in this room's own edges. */
  mouths: Mouth[];
  /** The stair openings inside it (also listed in `ConcInfo.stairs`). */
  stairs: StairInfo[];
  /** Its finished wall faces (inner faces of its walls, mouths left out), for a look to dress. */
  faces: WallFace[];
}

/**
 * The walls round one stair opening and the portal at its head. Every stair in the concourse
 * level has one (`stair` is the same object as in `ConcInfo.stairs`). Coordinates: station frame.
 */
export interface Stairwell {
  stair: StairInfo;
  /**
   * Plan footprints of the full-height walls built for it (solid, floor to ceiling): both long
   * sides and the closed far end. Empty where a concourse or room wall serves instead (a side
   * platform's stair against the spine wall uses that wall; a transfer bay's walls are its own).
   * Where a stair runs close to a concourse wall, the strip between is closed off inside the
   * stairwell (the closed end and the portal's jamb run on to that wall).
   */
  walls: Rect[];
  /** Everything the stairwell occupies (opening, walls, jambs, closed-off strips). */
  footprint: Rect;
  /** Room index (`ConcInfo.rooms`) it stands in, or −1 for the spine. */
  room: number;
  portal: {
    /** Centre of the opening at the stair head, at floor level, [x, z]. */
    at: [number, number];
    /** The way the portal faces: towards someone about to go down (−down). */
    n: [number, number];
    /** Clear width between the jambs. The opening is clear up to `fascia.y0` (cf + 2.35). */
    w: number;
    /** Plan footprints of the two jambs (solid). */
    jambs: Rect[];
    /**
     * The fascia band across the head, cf + 2.35 up to the ceiling, as a face: its front surface
     * is at `at` facing `n`, running u0 … u1, y0 … y1 (absolute heights). In the line's colour for
     * a platform stair; white with a line-colour stripe along its foot for a transfer stair.
     * Meant to carry the stair's header sign (wayfinding mounts it there).
     */
    fascia: WallFace & { y0: number; y1: number };
  };
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
 *
 * At interchanges the walkable concourse is a **spine** (−cw … +cw, the same shape as an ordinary
 * station's concourse) plus **rooms** outside its long walls, entered through gaps in them
 * (`openings`, `rooms`). Everything else up to the old outer wall (`footprint`) is solid structure
 * nobody can see or reach. Every stair opening has walls and a portal (`stairwells`).
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
  /**
   * Half width of the spine: the long walls' inner faces are at z = ±cw. 8 (old), 10 or 12 (new)
   * at ordinary stations; at interchanges 8 (island primary) or 8.9 (side-platform primary). It
   * is no longer the old outer wall at interchanges: that is `footprint`.
   */
  cw: number;
  /**
   * Half width of the structural box the concourse level sits in (the old outer wall, where the
   * exits come up): `cw` at ordinary stations, 14 at interchanges, about 31 at Tsumugibashi.
   * The exit corridors (`ExitInfo.ext` long) bridge cw … footprint.
   */
  footprint: number;
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
  /**
   * Every gap in the spine's two long walls, sorted by x: the exit doorways (the same as `exits`)
   * and the mouths of rooms. The long walls are solid everywhere else.
   */
  openings: WallOpening[];
  /** Walkable rooms outside the spine (empty at ordinary stations). Indices are used by `openings`, `Mouth.to` and `Stairwell.room`. */
  rooms: ConcRoom[];
  /** The walls and portal of every stair opening, in the order of `stairs`. */
  stairwells: Stairwell[];
  /** x of the centre of the toilet doors on the −cw wall (moved off any stairwell). */
  toilets: number;
  /** Centres of the concourse pillars (0.7 m square colliders). */
  pillars: [number, number][];
  /**
   * True if the rectangle, grown by `margin`, is inside the spine and clear of everything
   * already there: stair openings, their stairwell walls and landings, the gate lines and offices,
   * machines, lockers, exit doorways, room mouths, toilets, the mural, pillars, lifts, and anything
   * `claim`ed. Rooms are never free (decorate them with `StationLook.bay`).
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

/**
 * One room outside the spine (see `ConcRoom`), as the look's `bay` hook sees it, after the kit has
 * built its floor, walls, ceiling, lights, zone and any stair portal in it. Same frame as ConcInfo.
 */
export interface RoomInfo extends ConcRoom {
  b: Builder;
  station: StationDef;
  /** The station's primary line. */
  line: LineDef;
  era: number;
  style: StationStyle;
  /** Finishes in force (the look's overrides over the station's style). */
  wall: string;
  floor: string;
  ceil: string;
  cf: number;
  clear: number;
  /** Index into `ConcInfo.rooms`. */
  index: number;
  /** The concourse it belongs to (for anything a room needs to know about the rest). */
  conc: ConcInfo;
}

export interface StationLook {
  finishes?: Finishes;
  /** Set false to leave the kit's posters off the paid-area walls (when shops go there). */
  posters?: false;
  /** Set false to leave off the kit's accent rail and skirting on the long walls. */
  skirting?: false;
  /** Everything a look adds to the concourse. Runs last, after the kit has placed its parts. */
  concourse?(i: ConcInfo): void;
  /**
   * Decoration for one room outside the spine (a transfer bay, a second spine, a cross passage).
   * Called once per room, after `concourse`, inside the same `Builder.guard`. Decoration only:
   * the room's walls, mouths, stair openings and portals must stay as the kit built them.
   */
  bay?(r: RoomInfo): void;
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
