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
/** The central station: two metro lines under a glass-roofed atrium, with shells for future railways. */
export interface HubSpec {
  kind: 'hub';
  /** Line whose direction the station frame follows (the deeper, east–west one). */
  primary: string;
  style: StationStyle;
  seed: number;
}
export type StationSpec = UndergroundSpec | InterchangeSpec | ElevatedSpec | HubSpec;

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
  // The central station. White enamel panels and gold trim; the Yanagisuji platforms keep
  // their vaulted hall, and everything else is built by the hub composer (hub.ts).
  'kita-odori': {
    kind: 'hub',
    primary: 'A',
    style: {
      wall: 'panel:#f1efe8', concWall: 'panel:#f4f2ec', floor: 'floor:#d9d7d0', pillar: 'panel:#f1efe8',
      accent: '#b08d3c', mural: { v: 'willow', color: '#d9b43a' }, vault: true,
    },
    seed: 23,
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
  // Merchant quarter: deep indigo tile. Nagisa Line above, Akanesuji Line crossing below.
  aizomecho: {
    kind: 'interchange',
    primary: 'N',
    style: {
      wall: 'tile:#24407a', concWall: 'tile:#e9ecf3', floor: 'floor:#cdccc8', pillar: 'tile:#24407a',
      accent: '#f1ead8', mural: { v: 'waves', color: '#24407a' },
    },
    surface: { seed: 73, roadHalf: 9, cross: [-88, 88], left: 'oldtown', right: 'mixed', poles: true, avenue: true },
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
  // ── Akanesuji Line ──
  // Stadium terminus on the south bay: pale sea-grey panels, two gate lines for match days.
  kamomehama: {
    kind: 'underground',
    concourse: [-34, 34],
    gates: ['lo', 'hi'],
    stairs: [{ x: 0, up: 1 }, { x: -2, up: -1 }],
    style: {
      wall: 'panel:#e3eaee', concWall: 'panel:#eef2f4', floor: 'floor:#cdd3d6', pillar: 'panel:#e3eaee',
      accent: '#0f7a8a', mural: { v: 'gulls', color: '#1d5f8a' },
    },
    surface: { seed: 101, roadHalf: 9, cross: [-74], left: 'dome', right: 'sea', trees: true },
  },
  // Cotton wholesalers: unbleached-cotton tile with madder-red pillars.
  watayamachi: {
    kind: 'underground',
    concourse: [-34, 22],
    gates: ['lo'],
    stairs: [{ x: 2, up: -1 }],
    style: {
      wall: 'tile:#f1ece0', concWall: 'tile:#f4f0e6', floor: 'floor:#cfc9bb', pillar: 'tile:#9c2a30',
      accent: '#27344f', mural: { v: 'threads', color: '#b7282e' },
    },
    surface: { seed: 113, roadHalf: 7.5, cross: [-62, 66], left: 'oldtown', right: 'oldtown', poles: true },
  },
  // Civic and theatre district: pale stone panels, plane-leaf mural.
  suzukakedori: {
    kind: 'underground',
    concourse: [-22, 34],
    gates: ['hi'],
    stairs: [{ x: -2, up: 1 }],
    style: {
      wall: 'panel:#e9e5d8', concWall: 'panel:#f0ede3', floor: 'floor:#d3cfc3', pillar: 'tile:#c8bfa6',
      accent: '#6b7f3a', mural: { v: 'leaves', color: '#6b7f3a' },
    },
    surface: { seed: 127, roadHalf: 11, cross: [-76, 74], left: 'office', right: 'mixed', trees: true },
  },
  // Hillside neighbourhood: night-blue tile and a moon mural.
  tsukimizaka: {
    kind: 'underground',
    concourse: [-34, 20],
    gates: ['lo'],
    stairs: [{ x: 2, up: -1 }],
    style: {
      wall: 'tile:#27324d', concWall: 'tile:#eceef3', floor: 'floor:#cfcdc8', pillar: 'tile:#27324d',
      accent: '#e8c65a', mural: { v: 'moon', color: '#f0d77a' },
    },
    surface: { seed: 131, roadHalf: 6.5, cross: [-66, 62], left: 'house', right: 'apartment', trees: true, poles: true },
  },
  // New-town terminus: cream panels, kerria-yellow trim.
  yamabukidai: {
    kind: 'underground',
    concourse: [-20, 34],
    gates: ['hi'],
    stairs: [{ x: -2, up: 1 }],
    style: {
      wall: 'panel:#f3f0e2', concWall: 'panel:#f6f4ea', floor: 'floor:#d6d2c4', pillar: 'panel:#f3f0e2',
      accent: '#e2a400', mural: { v: 'kerria', color: '#e8b200' },
    },
    surface: { seed: 137, roadHalf: 8, cross: [-70, 62], left: 'apartment', right: 'house', trees: true },
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
