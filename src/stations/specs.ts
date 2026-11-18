// Per-station 3D design: which composer builds it, its finishes, and its neighbourhood.
// Network facts (names, numbers, lines) live in src/data/network.ts; this file only
// holds what the station looks like.

import type { StationId } from '../data/types';
import type { StationStyle } from './kit';
import type { SurfaceSpec } from './surface';

export interface UndergroundSpec {
  kind: 'underground';
  /** x-range of the concourse above the platforms. */
  concourse: [number, number];
  /** Which ends of the concourse have a gate line and exits. */
  gates: ('lo' | 'hi')[];
  /** Platform ↔ concourse stairs: x of the foot, and direction of ascent. */
  stairs: { x: number; up: 1 | -1 }[];
  style: StationStyle;
  surface: SurfaceSpec;
}
export interface InterchangeSpec {
  kind: 'interchange';
  /** Line whose direction the station frame follows. */
  primary: string;
  style: StationStyle;
  surface: SurfaceSpec;
}
export interface ElevatedSpec {
  kind: 'elevated';
  style: StationStyle;
  surface: SurfaceSpec;
}
export type StationSpec = UndergroundSpec | InterchangeSpec | ElevatedSpec;

export const SPECS: Record<StationId, StationSpec> = {
  // Quiet residential terminus: warm brick, one small gate line, park outside.
  midorizaka: {
    kind: 'underground',
    concourse: [-20, 34],
    gates: ['hi'],
    stairs: [{ x: -2, up: 1 }],
    style: {
      wall: 'brick:#b98a66', concWall: 'tile:#efe7d6', floor: 'floor:#cfc8b8', pillar: 'tile:#e9dfc9',
      accent: '#7a9a4a', mural: { v: 'leaves', color: '#3f8f4f' },
    },
    surface: { seed: 11, roadHalf: 6.5, cross: [-70, 62], left: 'park', right: 'house', trees: true, poles: true },
  },
  // Business hub: white enamel panels and a vaulted hall with hanging lights.
  'kita-odori': {
    kind: 'underground',
    concourse: [-60, -16],
    gates: ['lo'],
    stairs: [{ x: -16, up: -1 }, { x: -38, up: 1 }],
    style: {
      wall: 'panel:#f1efe8', concWall: 'panel:#f4f2ec', floor: 'floor:#d9d7d0', pillar: 'panel:#f1efe8',
      accent: '#b08d3c', mural: { v: 'leaves', color: '#b08d3c' }, vault: true,
    },
    surface: { seed: 23, roadHalf: 11, cross: [-78, 70], left: 'office', right: 'office', trees: true },
  },
  // Central interchange: woven-textile mural, two lines, four exits.
  tsumugibashi: {
    kind: 'interchange',
    primary: 'N',
    style: {
      wall: 'tile:#ece8df', concWall: 'tile:#f2efe8', floor: 'floor:#d5d2ca', pillar: 'tile:#e6e1d6',
      accent: '#b4472f', mural: { v: 'weave', color: '#1f6f9d' },
    },
    surface: { seed: 37, roadHalf: 12, cross: [-92, 92], left: 'mixed', right: 'mixed', trees: true, avenue: true },
  },
  // Nightlife: black and gold tile, neon street, canal with a red bridge.
  hyotanbori: {
    kind: 'underground',
    concourse: [-34, 34],
    gates: ['lo', 'hi'],
    stairs: [{ x: 0, up: 1 }, { x: -2, up: -1 }],
    style: {
      wall: 'tile:#26262b', concWall: 'tile:#2f2f35', floor: 'floor:#b9b4a8', pillar: 'tile:#c9a227',
      accent: '#c9a227', mural: { v: 'gourds', color: '#c9a227' },
    },
    surface: { seed: 41, roadHalf: 9, cross: [-64, 78], canalAt: 78, left: 'neon', right: 'neon' },
  },
  // Old-town terminus: green glazed tile, covered arcade outside.
  tsurumatsu: {
    kind: 'underground',
    concourse: [-34, 20],
    gates: ['lo'],
    stairs: [{ x: 2, up: -1 }],
    style: {
      wall: 'tile:#5f8f7b', concWall: 'tile:#e7eee9', floor: 'floor:#cfcabd', pillar: 'tile:#5f8f7b',
      accent: '#b9482b', mural: { v: 'pines', color: '#2e6b4f' },
    },
    surface: {
      seed: 53, roadHalf: 7, cross: [-60, 64], left: 'oldtown', right: 'oldtown', poles: true,
      arcadeAt: -60, arcadeName: { ja: '鶴松商店街', en: 'Tsurumatsu Shōtengai' },
    },
  },
  // Bay terminus: cool blue-grey panels, wave mural, quay and cranes outside.
  'kawaminato-ko': {
    kind: 'underground',
    concourse: [-22, 34],
    gates: ['hi'],
    stairs: [{ x: -2, up: 1 }],
    style: {
      wall: 'panel:#cfdbe3', concWall: 'panel:#e3ebf0', floor: 'floor:#c9d0d4', pillar: 'panel:#cfdbe3',
      accent: '#0d6fa4', mural: { v: 'waves', color: '#1673c9' },
    },
    surface: { seed: 61, roadHalf: 8, cross: [-74], left: 'warehouse', right: 'sea' },
  },
  // Merchant quarter: deep indigo tile.
  aizomecho: {
    kind: 'underground',
    concourse: [-34, 22],
    gates: ['lo'],
    stairs: [{ x: 2, up: -1 }],
    style: {
      wall: 'tile:#24407a', concWall: 'tile:#e9ecf3', floor: 'floor:#cdccc8', pillar: 'tile:#24407a',
      accent: '#f1ead8', mural: { v: 'waves', color: '#24407a' },
    },
    surface: { seed: 73, roadHalf: 8, cross: [-58, 66], left: 'oldtown', right: 'mixed', poles: true },
  },
  // University: brick walls, campus gate outside.
  'daigaku-mae': {
    kind: 'underground',
    concourse: [-22, 34],
    gates: ['hi'],
    stairs: [{ x: -2, up: 1 }],
    style: {
      wall: 'brick:#9a5a43', concWall: 'tile:#efe9dc', floor: 'floor:#d2ccbf', pillar: 'brick:#9a5a43',
      accent: '#3d2014', mural: { v: 'leaves', color: '#c9a227' },
    },
    surface: { seed: 83, roadHalf: 8, cross: [-76, 72], left: 'apartment', right: 'campus', trees: true },
  },
  // Elevated suburban terminus.
  hibarino: {
    kind: 'elevated',
    style: {
      wall: 'panel:#e4e6e8', concWall: 'panel:#eef0f1', floor: 'floor:#d4d2cb', pillar: 'concrete',
      accent: '#5aa0d8', mural: { v: 'hills', color: '#3f8f4f' },
    },
    surface: { seed: 97, roadHalf: 5, cross: [72], left: 'house', right: 'apartment', trees: true, poles: true },
  },
};
