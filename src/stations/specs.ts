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
  /** Half width of the concourse; by default it follows the line's age (build.ts). */
  width?: number;
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
  /** Line running alongside the primary, in the box south of its platforms (network `at`). */
  beside?: string;
  /** A second line alongside that one, in its own hall further south (network `at`). */
  outer?: string;
  style: StationStyle;
  seed: number;
}
export type StationSpec = UndergroundSpec | InterchangeSpec | ElevatedSpec | HubSpec;

export const SPECS: Record<StationId, StationSpec> = {
  // Quiet residential station: warm brick, park outside. Yanagisuji Line above, Sumire Line
  // crossing below.
  midorizaka: {
    kind: 'interchange',
    primary: 'Y',
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
    beside: 'S',
    outer: 'M',
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
  // Old-town station (the old south terminus): green glazed tile, covered arcade outside.
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
  // Port station: cool blue-grey panels, wave mural, quay and cranes outside. Nagisa Line above,
  // Kikyō Line crossing below.
  'kawaminato-ko': {
    kind: 'interchange',
    primary: 'N',
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
  // University: brick walls, campus gate outside. Nagisa Line above, Shiokaze Line crossing below.
  'daigaku-mae': {
    kind: 'interchange',
    primary: 'N',
    style: {
      wall: 'brick:#9a5a43', concWall: 'tile:#efe9dc', floor: 'floor:#d2ccbf', pillar: 'brick:#9a5a43',
      accent: '#3d2014', mural: { v: 'leaves', color: '#c9a227' },
    },
    surface: { seed: 83, roadHalf: 8, cross: [-76, 72], left: 'apartment', right: 'campus', trees: true },
  },
  // ── Akanesuji Line ──
  // Stadium station on the south bay: pale sea-grey panels, two gate lines for match days.
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
  // Cotton wholesalers: unbleached-cotton tile with madder-red pillars. Kikyō Line above, Akanesuji
  // Line crossing below.
  watayamachi: {
    kind: 'interchange',
    primary: 'K',
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
  // New-town station (the old north-east terminus): cream panels, kerria-yellow trim.
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
  // ── Shiokaze Line ──
  // Waterfront station at the river mouth: warm sand panels, sunset mural, promenade outside.
  yunagihama: {
    kind: 'underground',
    concourse: [-20, 34],
    gates: ['hi'],
    stairs: [{ x: -2, up: 1 }],
    style: {
      wall: 'panel:#f2e6d8', concWall: 'panel:#f5eee4', floor: 'floor:#d4ccc0', pillar: 'panel:#f2e6d8',
      accent: '#2c4660', mural: { v: 'sunset', color: '#e2552a' },
    },
    surface: { seed: 151, roadHalf: 8, cross: [-74], left: 'apartment', right: 'sea', waterfront: 'promenade', trees: true, treeLeaf: 'leaf2' },
  },
  // Riverside storehouse quarter: white plaster walls, charcoal pillars, namako-wall mural.
  kurayashiki: {
    kind: 'underground',
    concourse: [-34, 22],
    gates: ['lo'],
    stairs: [{ x: 2, up: -1 }],
    style: {
      wall: 'tile:#f3f1ea', concWall: 'tile:#f5f3ee', floor: 'floor:#cfccc4', pillar: 'tile:#3a3d42',
      accent: '#3a3d42', mural: { v: 'namako', color: '#2f3338' },
    },
    surface: { seed: 157, roadHalf: 7.5, cross: [-62, 66], left: 'godown', right: 'godown', poles: true },
  },
  // Lantern canal quarter: dark wood-brown tile, persimmon pillars, lantern mural. Shiokaze Line
  // above, Kikyō Line crossing below.
  tomyobori: {
    kind: 'interchange',
    primary: 'S',
    style: {
      wall: 'tile:#3b2a24', concWall: 'tile:#efe7da', floor: 'floor:#c9c2b4', pillar: 'tile:#c4561c',
      accent: '#f0b44a', mural: { v: 'lanterns', color: '#ffb05a' },
    },
    surface: {
      seed: 163, roadHalf: 7, cross: [-64, 78], canalAt: 78, left: 'oldtown', right: 'oldtown', poles: true,
      canalName: { ja: '灯明橋', en: 'Tōmyō-bashi' }, canalLanterns: true,
    },
  },
  // Cherry-embankment station: blush panels, cherry mural, cherry trees in the park and street.
  sakurazutsumi: {
    kind: 'underground',
    concourse: [-34, 20],
    gates: ['lo'],
    stairs: [{ x: 2, up: -1 }],
    style: {
      wall: 'panel:#f6ecee', concWall: 'panel:#f7f2f2', floor: 'floor:#d6d0cc', pillar: 'panel:#f6ecee',
      accent: '#d77a8e', mural: { v: 'sakura', color: '#eaa2b6' },
    },
    surface: {
      seed: 167, roadHalf: 7, cross: [-66, 62], left: 'park', right: 'house', trees: true, poles: true,
      parkName: { ja: '桜堤公園', en: 'Sakurazutsumi Park' }, treeLeaf: 'flat:#f2bfcd',
    },
  },
  // Elevated suburban station, where the line leaves the tunnel.
  hibarino: {
    kind: 'elevated',
    style: {
      wall: 'panel:#e4e6e8', concWall: 'panel:#eef0f1', floor: 'floor:#d4d2cb', pillar: 'concrete',
      accent: '#5aa0d8', mural: { v: 'hills', color: '#3f8f4f' },
    },
    surface: { seed: 97, roadHalf: 5, cross: [72], left: 'house', right: 'apartment', trees: true, poles: true },
  },

  // ══ Network expansion, stage 1 ══
  // ── Yanagisuji Line, north ──
  // Hilltop new-town terminus: fresh spring-green panels, a park at the end of the line.
  'shin-midorigaoka': {
    kind: 'underground',
    concourse: [-20, 34],
    gates: ['hi'],
    stairs: [{ x: -2, up: 1 }],
    style: {
      wall: 'panel:#e6efdc', concWall: 'panel:#eff4ea', floor: 'floor:#d1d4c8', pillar: 'panel:#e6efdc',
      accent: '#4f9a3a', mural: { v: 'leaves', color: '#6fb24a' },
    },
    surface: {
      seed: 173, roadHalf: 8, cross: [-70, 62], left: 'apartment', right: 'park', trees: true,
      parkName: { ja: '新緑が丘公園', en: 'Shin-Midorigaoka Park' },
    },
  },
  // Leafy residential heights: sage tile, rolling-hills mural, houses and a little shop street.
  aobadai: {
    kind: 'underground',
    concourse: [-34, 22],
    gates: ['lo'],
    stairs: [{ x: 2, up: -1 }],
    style: {
      wall: 'tile:#cfdcc8', concWall: 'tile:#eef2ea', floor: 'floor:#cdcbc1', pillar: 'tile:#4e7a5a',
      accent: '#2f6b45', mural: { v: 'hills', color: '#4e8f5a' },
    },
    surface: { seed: 179, roadHalf: 7, cross: [-62, 66], left: 'house', right: 'mixed', trees: true, poles: true },
  },
  // ── Yanagisuji Line, south ──
  // Boutique canal district: pale terrazzo-white panels, teal trim, a canal and bridge outside.
  minamihorie: {
    kind: 'underground',
    concourse: [-34, 34],
    gates: ['lo', 'hi'],
    stairs: [{ x: 0, up: 1 }, { x: -2, up: -1 }],
    style: {
      wall: 'panel:#eeece6', concWall: 'panel:#f3f1ec', floor: 'floor:#cfccc5', pillar: 'tile:#2f7f7a',
      accent: '#2f7f7a', mural: { v: 'waves', color: '#2f7f7a' },
    },
    surface: {
      seed: 181, roadHalf: 7.5, cross: [-64, 78], canalAt: 78, left: 'mixed', right: 'apartment', trees: true,
      canalName: { ja: '南堀江橋', en: 'Minamihorie-bashi' },
    },
  },
  // Meiji school town: red-brick walls, pine mural, a school campus on one side.
  kaiseicho: {
    kind: 'underground',
    concourse: [-34, 22],
    gates: ['lo'],
    stairs: [{ x: 2, up: -1 }],
    style: {
      wall: 'brick:#a4553e', concWall: 'tile:#f0ebe1', floor: 'floor:#cfc8bb', pillar: 'tile:#e9e1d0',
      accent: '#1f3d2e', mural: { v: 'pines', color: '#2b5a43' },
    },
    surface: { seed: 191, roadHalf: 8, cross: [-66, 62], left: 'campus', right: 'house', trees: true, poles: true },
  },
  // Southern terminus above the container port: steel-grey panels, gulls, quay and cranes.
  nankodai: {
    kind: 'underground',
    concourse: [-34, 20],
    gates: ['lo'],
    stairs: [{ x: 2, up: -1 }],
    style: {
      wall: 'panel:#d5dbe0', concWall: 'panel:#e6eaee', floor: 'floor:#c8cdd0', pillar: 'panel:#5c6b78',
      accent: '#d9822b', mural: { v: 'gulls', color: '#33546e' },
    },
    surface: { seed: 193, roadHalf: 9, cross: [-74], left: 'warehouse', right: 'sea' },
  },
  // ── Nagisa Line, west (under the bay) ──
  // Bay business district: glass-blue panels, skyline mural, towers and a promenade.
  'minato-center': {
    kind: 'underground',
    concourse: [-20, 34],
    gates: ['hi'],
    stairs: [{ x: -2, up: 1 }],
    style: {
      wall: 'panel:#dbe6ee', concWall: 'panel:#eaf0f4', floor: 'floor:#cdd3d8', pillar: 'panel:#9fb3c2',
      accent: '#1673c9', mural: { v: 'skyline', color: '#1673c9' },
    },
    surface: { seed: 197, roadHalf: 11, cross: [-76], left: 'office', right: 'sea', waterfront: 'promenade', trees: true },
  },
  // City hall on the shore: pale granite panels, navy trim, civic plaza (park) opposite.
  'umibe-shiyakusho-mae': {
    kind: 'underground',
    concourse: [-34, 34],
    gates: ['lo', 'hi'],
    stairs: [{ x: 0, up: 1 }, { x: -2, up: -1 }],
    style: {
      wall: 'panel:#e7e6e1', concWall: 'panel:#f0efeb', floor: 'floor:#d0cfca', pillar: 'tile:#23395b',
      accent: '#23395b', mural: { v: 'waves', color: '#3a6ea5' },
    },
    surface: {
      seed: 199, roadHalf: 11, cross: [-76, 74], left: 'office', right: 'park', trees: true,
      parkName: { ja: '市役所前広場', en: 'City Hall Plaza' },
    },
  },
  // ── Nagisa Line, east (on the viaduct) ──
  // Sunrise suburbs: warm cream panels and a gold sunrise.
  asahino: {
    kind: 'elevated',
    style: {
      wall: 'panel:#f1ebdc', concWall: 'panel:#f4f0e6', floor: 'floor:#d4d0c4', pillar: 'concrete',
      accent: '#e2a400', mural: { v: 'sunset', color: '#f0a32a' },
    },
    surface: { seed: 211, roadHalf: 6, cross: [-64, 70], left: 'house', right: 'mixed', trees: true, poles: true },
  },
  // Hilltop estate: cool grey panels, hills mural, apartment blocks.
  takanodai: {
    kind: 'elevated',
    style: {
      wall: 'panel:#e2e5e8', concWall: 'panel:#edf0f1', floor: 'floor:#d0d1cd', pillar: 'concrete',
      accent: '#4a7fb0', mural: { v: 'hills', color: '#4a7fb0' },
    },
    surface: { seed: 223, roadHalf: 7, cross: [66], left: 'apartment', right: 'apartment', trees: true },
  },
  // New-town terminus named for its spring: aqua panels, ripples mural, a park.
  izumigaoka: {
    kind: 'elevated',
    style: {
      wall: 'panel:#e3eff0', concWall: 'panel:#eef5f5', floor: 'floor:#cfd5d4', pillar: 'concrete',
      accent: '#1f8f9a', mural: { v: 'ripples', color: '#1f8f9a' },
    },
    surface: {
      seed: 227, roadHalf: 6, cross: [72], left: 'park', right: 'apartment', trees: true, poles: true,
      parkName: { ja: '泉ヶ丘公園', en: 'Izumigaoka Park' },
    },
  },
  // ── Akanesuji Line, west (the reclaimed islands) ──
  // Newest island terminus: white panels, gulls, apartment towers facing the bay.
  'shin-kamome': {
    kind: 'underground',
    concourse: [-20, 34],
    gates: ['hi'],
    stairs: [{ x: -2, up: 1 }],
    style: {
      wall: 'panel:#f0f3f4', concWall: 'panel:#f5f7f8', floor: 'floor:#d0d5d7', pillar: 'panel:#f0f3f4',
      accent: '#b7282e', mural: { v: 'gulls', color: '#2c6a96' },
    },
    surface: { seed: 229, roadHalf: 9, cross: [-74], left: 'apartment', right: 'sea', waterfront: 'promenade', trees: true },
  },
  // Seaside park: sea-green tile, wave mural, the park opposite the exit.
  'shiosai-koen': {
    kind: 'underground',
    concourse: [-34, 22],
    gates: ['lo'],
    stairs: [{ x: 2, up: -1 }],
    style: {
      wall: 'tile:#cfe3df', concWall: 'tile:#eaf3f1', floor: 'floor:#cbd1cf', pillar: 'tile:#2f7a74',
      accent: '#2f7a74', mural: { v: 'waves', color: '#2f8f86' },
    },
    surface: {
      seed: 233, roadHalf: 7, cross: [-66, 62], left: 'apartment', right: 'park', trees: true,
      parkName: { ja: '潮騒公園', en: 'Shiosai Park' }, treeLeaf: 'leaf2',
    },
  },
  // ── Akanesuji Line, north-east (the ridge) ──
  // Maple hillside: deep crimson tile, maple mural, red-leaved trees in the park.
  momijigaoka: {
    kind: 'underground',
    concourse: [-34, 22],
    gates: ['lo'],
    stairs: [{ x: 2, up: -1 }],
    style: {
      wall: 'tile:#7c2b24', concWall: 'tile:#f1e9e1', floor: 'floor:#cdc6bb', pillar: 'tile:#d9a441',
      accent: '#d9a441', mural: { v: 'maple', color: '#c8452a' },
    },
    surface: {
      seed: 239, roadHalf: 6.5, cross: [-66, 62], left: 'house', right: 'park', trees: true, poles: true,
      parkName: { ja: '紅葉ヶ丘公園', en: 'Momijigaoka Park' }, treeLeaf: 'flat:#c8452a',
    },
  },
  // Cool upland estate: mint-white panels, pine mural, a research campus.
  seiryodai: {
    kind: 'underground',
    concourse: [-34, 34],
    gates: ['lo', 'hi'],
    stairs: [{ x: 0, up: 1 }, { x: -2, up: -1 }],
    style: {
      wall: 'panel:#e4efeb', concWall: 'panel:#eef5f2', floor: 'floor:#cfd3cf', pillar: 'panel:#e4efeb',
      accent: '#2e7d6b', mural: { v: 'pines', color: '#2e7d6b' },
    },
    surface: { seed: 241, roadHalf: 8, cross: [-70, 66], left: 'apartment', right: 'campus', trees: true },
  },
  // Ridge-top terminus below the observatory: midnight tile, star mural.
  hoshimine: {
    kind: 'underground',
    concourse: [-34, 20],
    gates: ['lo'],
    stairs: [{ x: 2, up: -1 }],
    style: {
      wall: 'tile:#1d2540', concWall: 'tile:#eceef4', floor: 'floor:#cbcbc8', pillar: 'tile:#1d2540',
      accent: '#f0d77a', mural: { v: 'stars', color: '#f0d77a' },
    },
    surface: {
      seed: 251, roadHalf: 6.5, cross: [-66, 62], left: 'house', right: 'park', trees: true, poles: true,
      parkName: { ja: '星峰天文台公園', en: 'Hoshimine Observatory Park' },
    },
  },
  // ── Shiokaze Line, west ──
  // Landfill tip facing the open bay: sand-white panels, waves, promenade.
  shiomi: {
    kind: 'underground',
    concourse: [-20, 34],
    gates: ['hi'],
    stairs: [{ x: -2, up: 1 }],
    style: {
      wall: 'panel:#efe9df', concWall: 'panel:#f4f0e9', floor: 'floor:#d2ccc2', pillar: 'panel:#3d5f7a',
      accent: '#ee7b1a', mural: { v: 'waves', color: '#3d7fa8' },
    },
    surface: { seed: 257, roadHalf: 8, cross: [-74], left: 'apartment', right: 'sea', waterfront: 'promenade', trees: true },
  },
  // River-mouth apartments: dusk-rose panels and a sunset like its neighbour's, but later.
  'nishi-yunagi': {
    kind: 'underground',
    concourse: [-34, 22],
    gates: ['lo'],
    stairs: [{ x: 2, up: -1 }],
    style: {
      wall: 'panel:#f0e2de', concWall: 'panel:#f5eeec', floor: 'floor:#d4ccc8', pillar: 'panel:#f0e2de',
      accent: '#7a3b52', mural: { v: 'sunset', color: '#c4456a' },
    },
    surface: { seed: 263, roadHalf: 7, cross: [-62, 66], left: 'apartment', right: 'mixed', trees: true, poles: true },
  },
  // ── Shiokaze Line, south-east ──
  // Dogwood avenue: white panels with pink trim, dogwood mural, white-blossom street trees.
  hanamizuki: {
    kind: 'underground',
    concourse: [-34, 34],
    gates: ['lo', 'hi'],
    stairs: [{ x: 0, up: 1 }, { x: -2, up: -1 }],
    style: {
      wall: 'panel:#f5f2ee', concWall: 'panel:#f8f6f3', floor: 'floor:#d5d0ca', pillar: 'tile:#d98aa0',
      accent: '#c45a78', mural: { v: 'dogwood', color: '#e9a3b6' },
    },
    surface: { seed: 269, roadHalf: 8, cross: [-70, 66], left: 'house', right: 'apartment', trees: true, treeLeaf: 'flat:#f3eee6' },
  },
  // New cherry canal: blush tile, cherry mural, canal bridge with cherry trees.
  'shin-sakuragawa': {
    kind: 'underground',
    concourse: [-34, 22],
    gates: ['lo'],
    stairs: [{ x: 2, up: -1 }],
    style: {
      wall: 'tile:#f2dfe2', concWall: 'tile:#f7eff0', floor: 'floor:#d3cbc9', pillar: 'tile:#8a4a5a',
      accent: '#8a4a5a', mural: { v: 'sakura', color: '#e28aa2' },
    },
    surface: {
      seed: 271, roadHalf: 7, cross: [-64, 78], canalAt: 78, left: 'oldtown', right: 'apartment', trees: true,
      canalName: { ja: '新桜橋', en: 'Shin-Sakura-bashi' }, treeLeaf: 'flat:#f2bfcd',
    },
  },
  // Forest-park terminus on the old landfill: moss-green tile, leaves, the forest park outside.
  uminomori: {
    kind: 'underground',
    concourse: [-34, 20],
    gates: ['lo'],
    stairs: [{ x: 2, up: -1 }],
    style: {
      wall: 'tile:#3e5f4a', concWall: 'tile:#ebf0ec', floor: 'floor:#cbccc4', pillar: 'tile:#3e5f4a',
      accent: '#9cc45a', mural: { v: 'leaves', color: '#2f7a4a' },
    },
    surface: {
      seed: 277, roadHalf: 7, cross: [-66], left: 'park', right: 'sea', waterfront: 'promenade', trees: true,
      parkName: { ja: '海の森公園', en: 'Umi-no-Mori Park' },
    },
  },

  // ══ Network expansion, stage 2: the Kikyō Line ══
  // Bay-front terminus: slate-blue tile, gulls over the fish-market quay.
  shinshio: {
    kind: 'underground',
    concourse: [-20, 34],
    gates: ['hi'],
    stairs: [{ x: -2, up: 1 }],
    style: {
      wall: 'tile:#c9d3dc', concWall: 'tile:#e8edf1', floor: 'floor:#cbcfd2', pillar: 'tile:#7b4fa8',
      accent: '#7b4fa8', mural: { v: 'gulls', color: '#4b3a78' },
    },
    surface: { seed: 281, roadHalf: 9, cross: [-74], left: 'warehouse', right: 'sea', trees: true },
  },
  // Hillside houses and a shrine wood: lilac panels, the line's own bellflower mural.
  higashigaoka: {
    kind: 'underground',
    concourse: [-34, 22],
    gates: ['lo'],
    stairs: [{ x: 2, up: -1 }],
    style: {
      wall: 'panel:#ece6f2', concWall: 'panel:#f3f0f6', floor: 'floor:#d1ced3', pillar: 'tile:#5a3a86',
      accent: '#5a3a86', mural: { v: 'bellflower', color: '#7b4fa8' },
    },
    surface: { seed: 283, roadHalf: 6.5, cross: [-66, 62], left: 'house', right: 'house', trees: true, poles: true },
  },
  // Newest eastern estate: pale wheat panels, rolling hills, the skylark meadow park.
  'shin-hibarino': {
    kind: 'underground',
    concourse: [-34, 20],
    gates: ['lo'],
    stairs: [{ x: 2, up: -1 }],
    style: {
      wall: 'panel:#f1ecdc', concWall: 'panel:#f5f2e8', floor: 'floor:#d4d0c3', pillar: 'panel:#f1ecdc',
      accent: '#7b4fa8', mural: { v: 'hills', color: '#8a9a3e' },
    },
    surface: {
      seed: 293, roadHalf: 7, cross: [-66, 62], left: 'apartment', right: 'park', trees: true,
      parkName: { ja: 'ひばり原っぱ公園', en: 'Hibari Meadow Park' },
    },
  },

  // ══ Network expansion, stage 3: the Sumire Line ══
  // Hillside terminus: pale violet panels, the line's own violet mural, a temple wood opposite.
  seiran: {
    kind: 'underground',
    concourse: [-20, 34],
    gates: ['hi'],
    stairs: [{ x: -2, up: 1 }],
    style: {
      wall: 'panel:#efe6ef', concWall: 'panel:#f5f0f5', floor: 'floor:#d2cdd2', pillar: 'tile:#8a2a66',
      accent: '#c2368f', mural: { v: 'violet', color: '#8a3fa0' },
    },
    surface: {
      seed: 307, roadHalf: 6.5, cross: [-66, 62], left: 'house', right: 'park', trees: true, poles: true,
      parkName: { ja: '清嵐寺の森', en: 'Seiran-ji Temple Wood' },
    },
  },
  // Lower Sakura-gawa: river-blue tile, waves, a canal bridge and the rowing club's bank.
  'minami-sakuragawa': {
    kind: 'underground',
    concourse: [-34, 34],
    gates: ['lo', 'hi'],
    stairs: [{ x: 0, up: 1 }, { x: -2, up: -1 }],
    style: {
      wall: 'tile:#d6e2ea', concWall: 'tile:#edf2f5', floor: 'floor:#cdd0d2', pillar: 'tile:#c2368f',
      accent: '#c2368f', mural: { v: 'sakura', color: '#d97aa6' },
    },
    surface: {
      seed: 311, roadHalf: 7, cross: [-64, 78], canalAt: 78, left: 'oldtown', right: 'mixed', trees: true,
      canalName: { ja: '南桜橋', en: 'Minami-Sakura-bashi' }, treeLeaf: 'flat:#f2bfcd',
    },
  },
  // Sunny southern heights: butter-yellow panels, spring hills, new houses.
  harunodai: {
    kind: 'underground',
    concourse: [-34, 20],
    gates: ['lo'],
    stairs: [{ x: 2, up: -1 }],
    style: {
      wall: 'panel:#f6f0d9', concWall: 'panel:#f8f5e8', floor: 'floor:#d6d2c3', pillar: 'panel:#f6f0d9',
      accent: '#c2368f', mural: { v: 'hills', color: '#9cbf4a' },
    },
    surface: { seed: 313, roadHalf: 7, cross: [-66, 62], left: 'house', right: 'apartment', trees: true, poles: true },
  },
};
