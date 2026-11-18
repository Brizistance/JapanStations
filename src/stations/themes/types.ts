// Line themes: the architecture a line gives its platform halls.
//
// The line decides the forms (ceiling, pillars, lights, wall trim, benches) and the kind of
// material; the station still decides the colours, through `style` (specs.ts). `hall()` in
// kit.ts builds the structure, colliders, screen doors, signs and zones itself, and calls the
// hooks below for the parts a theme may restyle. A hook left out keeps the default look.
//
// Hooks draw decoration only: use `b.deco` and `b.mesh`, never `b.box`/`b.block`/`b.slab`
// (the kit owns every collider, so the walk test is unaffected by themes).

import type { LineDef, StationDef } from '../../data/types';
import type { Builder } from '../../world/builder';
import type { Grade } from '../../render/grade';
import type { CeilSeg, HallOpts, StationStyle } from '../kit';

/** What a hook is told about the hall. Coordinates are hall-local: +x along the track, +y up. */
export interface HallInfo {
  b: Builder;
  line: LineDef;
  station: StationDef;
  style: StationStyle;
  o: HallOpts;
  /** Platform floor level. */
  pf: number;
  /** |z| of the platform edge. Island: the platform is |z| < pe. Side: platforms are pe < |z| < wallZ. */
  pe: number;
  /** |z| of the side walls' inner face. */
  wallZ: number;
  island: boolean;
  /** Half length of the platform (58 m) and of the hall. */
  P: number;
  H: number;
  /** Ceiling underside at x. */
  ceilAt(x: number): number;
  /** True if [x0, x1] overlaps a stair, lift or shaft: hang nothing from the ceiling there. */
  blocked(x0: number, x1: number, margin?: number): boolean;
  /** Stretches of side wall `s` (±1 = the wall at z = s·wallZ) without a doorway, as [x0, x1]. */
  wallRuns(s: 1 | -1): [number, number][];
}

export interface LineTheme {
  /** Year the line opened. */
  opened: number;
  /**
   * Colour grade on this line's underground platforms and trains, over the generic underground
   * grade (render/grade.ts). Keep it subtle: line colours on signs must still read true.
   */
  grade?: Partial<Grade>;
  /** Barrel-vault the open parts of ordinary underground halls (stations may also ask for one). */
  vault?: boolean;
  /** Finish of flat ceilings (default 'ceil'). */
  ceilMat?: string;
  /** Finish of a vault's underside (default 'flat:#f3f1ea'). */
  vaultMat?: string;
  /** Soffit over the tracks beside a flat ceiling (default 'flat:#26282b'); null for none. */
  soffitMat?: string | null;
  /**
   * Height above the platform of the hung ceiling under a concourse (the slab is at 4.1 m). Old
   * lines set about 3.4 for a low, busy platform; hanging signs need 3.15. Hooks get the
   * dropped height as `y`, and `ceilAt` follows it.
   */
  lowCeil?: number;
  /** Half width of the island-platform pillar collider (default 0.27, at most 0.42). */
  pillarHalf?: number;

  /**
   * Extra ceiling decoration for one segment (underground only): beams, coffers, fins, battens.
   * `y` is the visible underside. On a vault segment (`seg.vault`) the underside rises
   * 1.6·sqrt(1 − (z/wallZ)²) above `y`, and this hook replaces the default ribs.
   */
  ceiling?(h: HallInfo, seg: CeilSeg, y: number): void;
  /** All platform lighting for one segment (underground only). Replaces the strip lights. */
  lights?(h: HallInfo, seg: CeilSeg, y: number): void;
  /** One island-platform pillar from y0 (floor) to y1 (ceiling), centred on (x, z). The collider is the kit's. */
  pillar?(h: HallInfo, x: number, z: number, y0: number, y1: number): void;
  /** One column between the tracks of a side-platform hall, centred on (x, 0). Replaces the bare concrete post. */
  trackColumn?(h: HallInfo, x: number, y0: number, y1: number): void;
  /** Trim on side wall `s`. Replaces the line-colour and accent stripes at pf + 2.56 … 2.8. */
  wallTrim?(h: HallInfo, s: 1 | -1): void;
  /**
   * One bench with its feet at (x, y, z). `s` = 0: island bench, back to back, inside a
   * 1.8 × 1.0 m, 0.46 m high collider. `s` = ±1: bench against side wall `s`, inside a
   * 1.8 × 0.56 m, 0.4 m high collider (the wall is on the `s` side).
   */
  bench?(h: HallInfo, x: number, y: number, z: number, s: 0 | 1 | -1): void;
  /** Extras for an elevated (viaduct) hall, drawn after the default canopies. Canopy underside is pf + 3.3. */
  elevated?(h: HallInfo): void;
}

/** Colour of a material key ('tile:#24407a' → '#24407a'); plain keys such as 'concrete' give `fallback`. */
export function hexOf(key: string, fallback = '#cfcac0'): string {
  const m = /#[0-9a-fA-F]{6}\b/.exec(key);
  return m ? m[0] : fallback;
}

/** Mix a colour towards white (k > 0) or black (k < 0); |k| ≤ 1. */
export function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const t = k > 0 ? 255 : 0, a = Math.abs(k);
  const ch = (v: number) => Math.round(v + (t - v) * a);
  const r = ch((n >> 16) & 255), g = ch((n >> 8) & 255), bl = ch(n & 255);
  return `#${((r << 16) | (g << 8) | bl).toString(16).padStart(6, '0')}`;
}

/** Deterministic 0…1 noise from an integer, for uneven patterns that are the same on every load. */
export function hash(i: number, seed = 0): number {
  const v = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453;
  return v - Math.floor(v);
}
