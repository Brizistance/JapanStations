// Per-station 3D design: which composer builds it, its finishes, and its neighbourhood.
// Network facts (names, numbers, lines) live in src/data/network.ts; this file only
// holds what the station looks like.

import type { StationId } from '../data/types';
import type { StationStyle } from './kit';
import type { SurfaceSpec } from './surface';
import type { ExitPlan } from './exits';

export interface UndergroundSpec {
  kind: 'underground';
  /** x-range of the concourse above the platforms. */
  concourse: [number, number];
  /** Which ends of the concourse have a gate line and exits. */
  gates: ('lo' | 'hi')[];
  /** Platform ↔ concourse stairs: x of the foot, and direction of ascent. */
  stairs: { x: number; up: 1 | -1 }[];
  /** Where each gate end's exits are (same order as `gates`); default both walls, 9 m out. */
  exits?: ExitPlan[];
  /**
   * Two separate ticket halls, one per gate end, not joined over the platforms: no concourse
   * over this x-range. Every platform stair must come up inside one of the halls.
   */
  split?: [number, number];
  /** Half width of the concourse; by default it follows the line's age (build.ts). */
  width?: number;
  /** Railed openings in the concourse floor looking down onto an island platform, [x0, z0, x1, z1]. */
  voids?: [number, number, number, number][];
  /** A walled-off siding behind the +z platform, seen through a long railed opening (an old terminus). */
  stub?: true;
  /**
   * A mined cavern (Tōdai-dōri): the hall outside the concourse is vaulted this high above the
   * platform, and the concourse crosses it like a bridge. The look draws the cavern's own arch.
   */
  cavern?: number;
  /** Tracks one above the other (LineDef.stackAt), built by stacked.ts; `stairs` is not used. */
  stacked?: true;
  /** A level tunnel from the paid concourse out to a valley entrance (Narukozaka, adit.ts). */
  adit?: true;
  /**
   * A second line crossing further along (StationDef.at), reached by a long transfer tunnel with
   * moving walkways from the paid concourse (Shin-Hibarino, transfer.ts).
   */
  transfer?: true;
  style: StationStyle;
  surface: SurfaceSpec;
}
export interface InterchangeSpec {
  kind: 'interchange';
  /** Exits at the +x gate end, then the −x one (default both walls, 9 m out). */
  exits?: [ExitPlan, ExitPlan];
  /** Line whose direction the station frame follows. */
  primary: string;
  /**
   * Escalator wells (Nankōdai): each transfer stair to the deeper line runs down a tall, wide,
   * lit well with an escalator either side, instead of a narrow enclosed shaft.
   */
  well?: true;
  /** A domed entrance hall under its own station building, off the +z exit of the +x gate end (Tsumugibashi, rotunda.ts). */
  rotunda?: true;
  /** A shared ticket hall halfway between the two lines, stairs up to one and down to the other (Harunodai, midlevel.ts). */
  mid?: true;
  /**
   * The −x gate end is in a station building at street level instead (Aizomechō, headhouse.ts): the
   * concourse has gates at its +x end only, and a paid corridor and stair lead up to the building.
   */
  headhouse?: true;
  style: StationStyle;
  surface: SurfaceSpec;
}
/**
 * Two lines crossing at right angles with a deep atrium between them (Kawaminato-kō, atrium.ts):
 * the primary's concourse opens onto a gallery round a void over the crossing line's island
 * platform, with a transfer mezzanine bridging the void.
 */
export interface AtriumSpec {
  kind: 'atrium';
  /** Exits 1… at the +x gate end, then the −x one; exit 5 stays. */
  exits?: [ExitPlan, ExitPlan];
  /** Line whose direction the station frame follows (the upper one). */
  primary: string;
  style: StationStyle;
  surface: SurfaceSpec;
}
export interface ElevatedSpec {
  kind: 'elevated';
  /**
   * Default layout only: half width of the street-level concourse (default 9). Wide side
   * platforms put their stairs further out, and the stairs must rise inside the concourse.
   */
  width?: number;
  /**
   * Open-air layouts of their own (open-air.ts). Default: the viaduct station with a concourse
   * under the deck and a stair to each side platform. 'cutting': an island in an open cutting
   * with a station building bridging it at street level (Kasumidani). 'terminus': a viaduct
   * terminus under one barrel vault, its hall under the platform end, a pedestrian deck to the
   * plaza (Shiondai). 'seaside': a viaduct terminus under gull-wing canopies, its hall at ground
   * level under the middle of the viaduct, opening onto a boardwalk by the sea (Shin-Kamome).
   * Nagisa Line east (nagisa-east.ts), side platforms: 'arcade': a gate hall per direction under
   * the viaduct, a free passage between them, shops in the arches (Asahino). 'hillside': the
   * viaduct runs into a ridge; a station building level with the platforms on the ridge, an
   * underpass to the far platform and the valley entrance (Takanodai). 'railhead': a temporary
   * terminus with a concourse bridging the tracks past the platform ends and a deck to the
   * new-town plaza (Izumigaoka).
   */
  layout?: 'cutting' | 'terminus' | 'seaside' | 'arcade' | 'hillside' | 'railhead';
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
export type StationSpec = UndergroundSpec | InterchangeSpec | AtriumSpec | ElevatedSpec | HubSpec;

export const SPECS: Record<StationId, StationSpec> = {
  // Quiet residential station: warm brick, park outside. Yanagisuji Line above, Sumire Line
  // crossing below.
  midorizaka: {
    kind: 'interchange',
    primary: 'Y',
    // Both exits come up in pavilions on the park side (no stairs on the pavement opposite).
    exits: [{ at: 6.2, sides: [-1] }, { sides: [-1], at: 10.4 }],
    style: {
      wall: 'brick:#b98a66', concWall: 'tile:#efe7d6', floor: 'floor:#cfc8b8', pillar: 'tile:#e9dfc9',
      accent: '#7a9a4a', mural: { v: 'leaves', color: '#3f8f4f' },
    },
    // Outside: Midorizaka Park on the −z side with the station's two pavilions at its edge; across the
    // road the station plaza (bus and taxi rotary) and Midorizaka Ginza; quiet houses on small streets.
    surface: {
      seed: 11, roadHalf: 6.5, cross: [-70, 62], left: 'mixed', right: 'mixed', poles: true, models: true, roadKit: true, oldTown: true,
      smallStreets: true, smallSignals: 0.5, treeKinds: ['zelkova', 'cherry'], pavilions: true,
      parkName: { ja: '緑坂公園', en: 'Midorizaka Park' },
      pieces: [
        { id: 'park', side: -1, x0: -63.5, ja: '緑坂公園', en: 'Midorizaka Park' },
        { id: 'plaza', side: 1, x0: -22, ja: '緑坂駅前広場', en: 'Midorizaka Station Plaza' },
        { id: 'ginza', side: 1, x0: 15, ja: '緑坂銀座', en: 'Midorizaka Ginza' },
      ],
    },
  },
  // The central station. Stone and brass above the platforms (white enamel on them); the Yanagisuji platforms keep
  // their vaulted hall, and everything else is built by the hub composer (hub.ts).
  'kita-odori': {
    kind: 'hub',
    primary: 'A',
    beside: 'S',
    outer: 'M',
    style: {
      wall: 'panel:#f1efe8', concWall: 'panel:#d9cdb4', floor: 'floor:#cfc7b6', pillar: 'panel:#f1efe8',
      accent: '#b08d3c', mural: { v: 'willow', color: '#d9b43a' }, vault: true,
    },
    seed: 23,
  },
  // Central interchange: woven-textile mural, three lines, four exits, and the rotunda under the Silk Exchange.
  tsumugibashi: {
    kind: 'interchange',
    primary: 'N',
    style: {
      wall: 'tile:#ece8df', concWall: 'tile:#f2efe8', floor: 'floor:#d5d2ca', pillar: 'tile:#e6e1d6',
      accent: '#b4472f', mural: { v: 'weave', color: '#1f6f9d' },
    },
    rotunda: true,
    surface: {
      seed: 37, roadHalf: 12, cross: [-92, 92], left: 'mixed', right: 'mixed', trees: true, avenue: true, models: true, roadKit: true,
      // The avenue carries on north as a boulevard to Kita-Ōdōri's plot (680 m away, its plot reaching 160 m south).
      // And south to Hyōtanbori's plot (650 m away, reaching 85 m north).
      boulevard: { to: -520, south: 565 },
      smallStreets: true,
      roadNames: { main: { ja: '紬通', en: 'Tsumugi-dōri' }, cross: [{ ja: '絹屋町筋', en: 'Kinuyamachi-suji' }, { ja: '紬堀筋', en: 'Tsumugibori-suji' }] },
      junctions: [{ ja: '紬橋西', en: 'Tsumugibashi-nishi' }, { ja: '紬橋東詰', en: 'Tsumugibashi-higashizume' }],
      canalAt: 92, canalName: { ja: '紬橋', en: 'Tsumugi-bashi' }, canalStone: true,
      landmark: { ja: '紬橋絹取引所', en: 'Tsumugibashi Silk Exchange', side: 1, x0: 26, x1: 73, depth: 28 },
      // A corner shop by the side street and a shop in the base of an avenue block.
      konbini: [{ type: 'corner', chain: 'hinode', side: 1, x0: -85.5 }, { type: 'ground', chain: 'maruhoshi', side: -1, x0: -44 }],
      treeKinds: ['zelkova', 'ginkgo', 'tokaede'],
      // A shrine and the police box on the north side, a vending corner on the south.
      places: [
        { kind: 'shrine', side: -1, x0: 34, ja: '紬稲荷神社', en: 'Tsumugi Inari Shrine' },
        { kind: 'koban', side: -1, x0: 18, ja: '紬橋交番', en: 'Tsumugibashi' },
        { kind: 'vending', side: 1, x0: -62, ja: 'ドリンクコーナー', en: 'Drinks corner' },
      ],
    },
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
    // Minami's canal street: zakkyo buildings of bars, the grand vermilion Hyōtan-bashi just past exits 3 and 4,
    // Hyōtan Kaikan with its giant gourd on the canal corner, an arcade up the side street, a lane of bars.
    surface: {
      seed: 41, roadHalf: 9, cross: [-64, 62], canalAt: 62, left: 'neon', right: 'neon', models: true, roadKit: true, canalGrand: true, tee: true, smallStreets: true,
      roadNames: { main: { ja: '柳筋', en: 'Yanagi-suji' }, cross: [{ ja: '灯籠町通', en: 'Tōrōmachi-dōri' }, { ja: '瓢箪橋通', en: 'Hyōtanbashi-dōri' }] },
      junctions: [{ ja: '灯籠町', en: 'Tōrōmachi' }, { ja: '瓢箪橋東', en: 'Hyōtanbashi-higashi' }],
      arcadeAt: -64, arcadeName: { ja: '瓢箪堀商店街', en: 'Hyōtanbori Shōtengai' },
      landmark: { ja: '瓢箪会館', en: 'Hyōtan Kaikan', side: 1, x0: 35, x1: 47.6, depth: 16 },
      konbini: [{ type: 'corner', chain: 'asanagi', side: -1, x0: -33 }],
      pieces: [
        { id: 'kaikan', side: 1, x0: 35, ja: '瓢箪会館', en: 'Hyōtan Kaikan' },
        { id: 'yokocho', side: -1, x0: 6, ja: '瓢箪横丁', en: 'Hyōtan Yokochō' },
        { id: 'takoyaki', side: 1, x0: -34, ja: 'たこ焼き 丸八', en: 'Takoyaki Maruhachi' },
        { id: 'izakaya', side: 1, x0: -28.4, ja: '居酒屋 ひょうたん', en: 'Izakaya Hyōtan' },
      ],
    },
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
    // Outside: an old quarter of shophouses on model streets, the Tsurumatsu Shōtengai under its glazed
    // roof up the side street at x = −60 behind a crane-crested gate, Tsuru-no-yu bath on its corner.
    surface: {
      seed: 53, roadHalf: 7, cross: [-60, 64], left: 'mixed', right: 'mixed', poles: true, models: true, roadKit: true, tee: true, oldTown: true, smallStreets: true, smallSignals: 0.75,
      arcadeAt: -60, arcadeModel: true, arcadeName: { ja: '鶴松商店街', en: 'Tsurumatsu Shōtengai' },
      konbini: [{ type: 'corner', chain: 'asanagi', side: 1, x0: 30 }],
      pieces: [{ id: 'sento', side: -1, x0: -53, ja: '鶴の湯', en: 'Tsuru-no-yu Bathhouse' }],
    },
  },
  // Port station: cool blue-grey panels, wave mural, quay and cranes outside. Nagisa Line above,
  // Kikyō Line crossing deep below, under an atrium (atrium.ts).
  'kawaminato-ko': {
    kind: 'atrium',
    primary: 'N',
    style: {
      wall: 'panel:#cfdbe3', concWall: 'panel:#e3ebf0', floor: 'floor:#c9d0d4', pillar: 'panel:#cfdbe3',
      accent: '#0d6fa4', mural: { v: 'waves', color: '#1673c9' },
    },
    surface: { seed: 61, roadHalf: 8, cross: [-74], left: 'warehouse', right: 'sea' },
  },
  // Merchant quarter: deep indigo tile. Nagisa Line above, Akanesuji Line crossing below. The west gates are
  // in the headhouse on the dyers' street (headhouse.ts); the streets are aizomecho-street.ts.
  aizomecho: {
    kind: 'interchange',
    primary: 'N',
    headhouse: true,
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
    surface: { seed: 101, roadHalf: 9, cross: [-74], left: 'dome', right: 'sea', trees: true,
      quayName: { ja: '鴎浜桟橋', en: 'Kamomehama Pier' },
    },
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
  // Deep under the slope: a tall vault over most of the island, moon phases hung in it, and the
  // concourse only at the uphill (+x) end.
  tsukimizaka: {
    kind: 'underground',
    concourse: [20, 60],
    gates: ['hi'],
    stairs: [{ x: 24, up: 1 }],
    style: {
      wall: 'tile:#27324d', concWall: 'tile:#eceef3', floor: 'floor:#cfcdc8', pillar: 'tile:#27324d',
      accent: '#e8c65a', mural: { v: 'moon', color: '#f0d77a' }, vault: true,
    },
    surface: { seed: 131, roadHalf: 6.5, cross: [-66, 62], left: 'house', right: 'apartment', trees: true, poles: true },
  },
  // New-town station (the old north-east terminus): cream panels, kerria-yellow trim. Side
  // platforms under a long central concourse; the old terminus's siding behind the +z platform.
  yamabukidai: {
    kind: 'underground',
    concourse: [-40, 40],
    gates: ['lo', 'hi'],
    stairs: [{ x: -6, up: -1 }, { x: 6, up: 1 }],
    width: 12,
    stub: true,
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
  // Boutique canal district: a 1930s Art Deco shopping arcade below; outside a quiet canal under
  // cherries with the teal Minamihorie-bashi just past exits 3 and 4, the clock tower on its plaza.
  minamihorie: {
    kind: 'underground',
    concourse: [-34, 34],
    gates: ['lo', 'hi'],
    // The stairs stand out towards the gates so the middle of the arcade opens onto the platform: three light wells.
    stairs: [{ x: 5.4, up: 1 }, { x: -5.4, up: -1 }],
    voids: [[-4.6, -1.4, -1.8, 1.4], [-1.0, -1.4, 1.0, 1.4], [1.8, -1.4, 4.6, 1.4]],
    style: {
      wall: 'panel:#eeece6', concWall: 'panel:#f3f1ec', floor: 'floor:#cfccc5', pillar: 'tile:#2f7f7a',
      accent: '#2f7f7a', mural: { v: 'waves', color: '#2f7f7a' },
    },
    surface: {
      seed: 181, roadHalf: 7.5, cross: [-64, 60], canalAt: 60, left: 'mixed', right: 'mixed', models: true, roadKit: true, canalQuiet: true, smallStreets: true,
      roadNames: { main: { ja: '柳筋', en: 'Yanagi-suji' }, cross: [{ ja: '白椿通', en: 'Shirotsubaki-dōri' }, { ja: '水面通', en: 'Minamo-dōri' }] },
      junctions: [{ ja: '南堀江西', en: 'Minamihorie-nishi' }, { ja: '水面橋', en: 'Minamobashi' }],
      treeKinds: ['zelkova', 'dogwood', 'tokaede'],
      canalName: { ja: '南堀江橋', en: 'Minamihorie-bashi' },
      konbini: [{ type: 'corner', chain: 'hinode', side: -1, x0: -33 }],
      pieces: [
        { id: 'tower', side: -1, x0: 34, ja: '南堀江 時計台', en: 'Minamihorie Clock Tower' },
        { id: 'cafe', side: 1, x0: 34, ja: 'カフェ ほりえ', en: 'Café Horie' },
        { id: 'zakka', side: 1, x0: -20, ja: '家具と雑貨 木の葉', en: 'Kinoha Furniture & Zakka' },
      ],
    },
  },
  // Meiji school town: below, a red-brick school hall; outside a ginkgo avenue, the 1902 Kawaminato
  // Daiichi High School behind its wall across from the station, quiet old streets, Gakurindō stationery.
  kaiseicho: {
    kind: 'underground',
    concourse: [-34, 22],
    gates: ['lo'],
    stairs: [{ x: 2, up: -1 }],
    style: {
      wall: 'brick:#a4553e', concWall: 'tile:#f0ebe1', floor: 'floor:#cfc8bb', pillar: 'tile:#e9e1d0',
      accent: '#1f3d2e', mural: { v: 'pines', color: '#2b5a43' },
    },
    surface: {
      seed: 191, roadHalf: 8, cross: [-66, 62], left: 'mixed', right: 'mixed', poles: true, models: true, roadKit: true, oldTown: true,
      smallStreets: true, smallSignals: 0.6, treeKinds: ['ginkgo'],
      konbini: [{ type: 'corner', chain: 'hinode', side: 1, x0: 34 }],
      pieces: [
        { id: 'school', side: -1, x0: -9.3, ja: '川湊第一高等学校', en: 'Kawaminato Daiichi High School' },
        { id: 'bunbo', side: 1, x0: -24, ja: '文具 学林堂', en: 'Gakurindō Stationery' },
      ],
    },
  },
  // Southern terminus above the container port; the Ichō Line deep below, reached down two
  // escalator wells (build.ts wellDress). Steel-grey panels, gulls, quay and cranes.
  nankodai: {
    kind: 'interchange',
    primary: 'Y',
    well: true,
    exits: [{ at: 11.8 }, { sides: [-1] }],
    style: {
      wall: 'panel:#d5dbe0', concWall: 'panel:#e6eaee', floor: 'floor:#c8cdd0', pillar: 'panel:#5c6b78',
      accent: '#d9822b', mural: { v: 'gulls', color: '#33546e' },
    },
    surface: { seed: 193, roadHalf: 9, cross: [-74], left: 'warehouse', right: 'sea',
      quayName: { ja: '南港ふ頭', en: 'Nankō Wharf' },
    },
  },
  // ── Nagisa Line, west (under the bay) ──
  // The line's western terminus. Bay business district: glass-blue panels, skyline mural; the
  // unpaid hall is the Minato Center tower's basement (looks/minato-center.ts), so it runs wide.
  'minato-center': {
    kind: 'underground',
    concourse: [-20, 34],
    width: 12,
    gates: ['hi'],
    stairs: [{ x: -2, up: 1 }],
    style: {
      wall: 'panel:#dbe6ee', concWall: 'panel:#eaf0f4', floor: 'floor:#cdd3d8', pillar: 'panel:#9fb3c2',
      accent: '#1673c9', mural: { v: 'skyline', color: '#1673c9' },
    },
    surface: { seed: 197, roadHalf: 11, cross: [-76], left: 'office', right: 'sea', waterfront: 'promenade', trees: true,
      promenadeName: { ja: 'みなとベイウォーク', en: 'Minato Baywalk' },
    },
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
  // Sunrise suburbs: warm cream panels and a gold sunrise. A gate hall per direction (nagisa-east.ts).
  asahino: {
    kind: 'elevated',
    layout: 'arcade',
    style: {
      wall: 'panel:#f1ebdc', concWall: 'panel:#f4f0e6', floor: 'floor:#d4d0c4', pillar: 'concrete',
      accent: '#e2a400', mural: { v: 'sunset', color: '#f0a32a' },
    },
    surface: { seed: 211, roadHalf: 6, cross: [-64, 70], left: 'house', right: 'mixed', trees: true, poles: true },
  },
  // Hilltop estate: cool grey panels, hills mural. Ridge-level building, underpass to the valley (nagisa-east.ts).
  takanodai: {
    kind: 'elevated',
    layout: 'hillside',
    style: {
      wall: 'panel:#e2e5e8', concWall: 'panel:#edf0f1', floor: 'floor:#d0d1cd', pillar: 'concrete',
      accent: '#4a7fb0', mural: { v: 'hills', color: '#4a7fb0' },
    },
    surface: { seed: 223, roadHalf: 7, cross: [66], left: 'apartment', right: 'apartment', trees: true },
  },
  // New-town terminus (for now) named for its spring: aqua panels, ripples mural. Concourse over the tracks, decks to the park (nagisa-east.ts).
  izumigaoka: {
    kind: 'elevated',
    layout: 'railhead',
    style: {
      wall: 'panel:#e3eff0', concWall: 'panel:#eef5f5', floor: 'floor:#cfd5d4', pillar: 'concrete',
      accent: '#1f8f9a', mural: { v: 'ripples', color: '#1f8f9a' },
    },
    surface: {
      seed: 227, roadHalf: 6, cross: [72], left: 'park', right: 'apartment', trees: true, poles: true,
      parkName: { ja: '泉ヶ丘公園', en: 'Izumigaoka Park' },
    },
  },
  // ── Akanesuji Line, the 2008 extension ──
  // Where the line leaves the ridge tunnel: an island in an open cutting, a glazed bridge
  // building over it, a sawtooth canopy. Mist greys and slate, a layered-ridges mural.
  kasumidani: {
    kind: 'elevated',
    layout: 'cutting',
    style: {
      wall: 'panel:#dfe5ea', concWall: 'panel:#e9eef1', floor: 'floor:#c9cdd0', pillar: 'paint:#5b6a78',
      accent: '#5b6a78', mural: { v: 'mist', color: '#5b6a78' },
    },
    surface: { seed: 241, roadHalf: 5, cross: [], left: 'house', right: 'house', trees: true, poles: true },
  },
  // New-town terminus: one barrel vault over the viaduct, lilac steel, an aster mural, a bus
  // terminal and a shopping centre reached by a pedestrian deck.
  shiondai: {
    kind: 'elevated',
    layout: 'terminus',
    style: {
      wall: 'panel:#ebe8f1', concWall: 'panel:#f2f0f6', floor: 'floor:#d3d0d8', pillar: 'paint:#8a7fb8',
      accent: '#8a7fb8', mural: { v: 'aster', color: '#8a7fb8' },
    },
    surface: { seed: 251, roadHalf: 8, cross: [], left: 'apartment', right: 'apartment', trees: true },
  },
  // ── Akanesuji Line, west (the reclaimed islands) ──
  // Newest island terminus: white panels, gulls, apartment towers facing the bay.
  // The line comes up out of the bay onto a viaduct across the island: gull-wing canopies.
  'shin-kamome': {
    kind: 'elevated',
    layout: 'seaside',
    style: {
      wall: 'panel:#f0f3f4', concWall: 'panel:#f5f7f8', floor: 'floor:#d0d5d7', pillar: 'panel:#f0f3f4',
      accent: '#b7282e', mural: { v: 'gulls', color: '#2c6a96' },
    },
    surface: { seed: 229, roadHalf: 9, cross: [-74], left: 'apartment', right: 'sea', waterfront: 'promenade', trees: true,
      promenadeName: { ja: '新鴎シーサイドデッキ', en: 'Shin-Kamome Seaside Deck' },
    },
  },
  // Seaside park: sea-green tile, wave mural, the park opposite the exit. Shallow, side
  // platforms, and a small concourse over the west end only.
  'shiosai-koen': {
    kind: 'underground',
    concourse: [-60, -24],
    gates: ['lo'],
    stairs: [{ x: -25, up: -1 }],
    width: 12,
    style: {
      wall: 'tile:#cfe3df', concWall: 'tile:#eaf3f1', floor: 'floor:#cbd1cf', pillar: 'tile:#2f7a74',
      accent: '#2f7a74', mural: { v: 'waves', color: '#2f8f86' },
    },
    surface: {
      seed: 233, roadHalf: 7, cross: [-74, 62], left: 'apartment', right: 'park', trees: true,
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
  // Cool upland estate: mint-white panels, pine mural, a research campus. A full-length
  // concourse with two railed voids down onto the island between its stairs.
  seiryodai: {
    kind: 'underground',
    concourse: [-56, 56],
    gates: ['lo', 'hi'],
    stairs: [{ x: -16, up: -1 }, { x: 16, up: 1 }],
    voids: [[-13, -1.4, -3, 1.4], [3, -1.4, 13, 1.4]],
    style: {
      wall: 'panel:#e4efeb', concWall: 'panel:#eef5f2', floor: 'floor:#cfd3cf', pillar: 'panel:#e4efeb',
      accent: '#2e7d6b', mural: { v: 'pines', color: '#2e7d6b' },
    },
    surface: { seed: 241, roadHalf: 8, cross: [-70, 66], left: 'apartment', right: 'campus', trees: true,
      campusName: { ja: '川湊工科大学', en: 'Kawaminato Institute of Technology' },
    },
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
    surface: { seed: 257, roadHalf: 8, cross: [-74], left: 'apartment', right: 'sea', waterfront: 'promenade', trees: true,
      promenadeName: { ja: '潮見海浜緑道', en: 'Shiomi Seaside Greenway' },
    },
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
    // One gate end, a shorter hall, both exits climbing back over it.
    concourse: [-26, 30],
    gates: ['hi'],
    stairs: [{ x: -6, up: 1 }],
    exits: [{ climb: 'back' }],
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
  // Forest-park station on the old landfill, the Ichō Line deep below: Kawaminato-kō's atrium
  // (atrium.ts), the void opening on the sea side. Moss-green tile, leaves, the forest park outside.
  uminomori: {
    kind: 'atrium',
    primary: 'S',
    exits: [{ at: 4.6 }, { at: 11.8 }],
    style: {
      wall: 'tile:#3e5f4a', concWall: 'tile:#ebf0ec', floor: 'floor:#cbccc4', pillar: 'tile:#3e5f4a',
      accent: '#9cc45a', mural: { v: 'leaves', color: '#2f7a4a' },
    },
    surface: {
      seed: 277, roadHalf: 7, cross: [-66], left: 'park', right: 'sea', waterfront: 'promenade', trees: true,
      parkName: { ja: '海の森公園', en: 'Umi-no-Mori Park' },
      promenadeName: { ja: '海の森海岸遊歩道', en: 'Umi-no-Mori Shore Walk' },
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
    surface: { seed: 281, roadHalf: 9, cross: [-74], left: 'warehouse', right: 'sea', trees: true,
      quayName: { ja: '新潮魚市場', en: 'Shinshio Fish Market' },
    },
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
  // Newest eastern estate: the Kikyō Line's terminus, the Ichō Line's 100 m west, joined by a long
  // transfer tunnel with moving walkways (transfer.ts). Pale wheat panels, the skylark meadow park.
  'shin-hibarino': {
    kind: 'underground',
    concourse: [-30, 30],
    gates: ['hi'],
    stairs: [{ x: -6, up: 1 }],
    exits: [{ at: 4.6, climb: 'back' }],
    transfer: true,
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
    // −z: far corner, climbing back; +z (the temple wood): right by the gates.
    exits: [{ at: [11.8, 4.6], climb: ['back', 'out'] }],
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
    // The hall shifted west towards the old town, the east exit on the −z side only.
    concourse: [-40, 28],
    gates: ['lo', 'hi'],
    stairs: [{ x: -8, up: 1 }, { x: -10, up: -1 }],
    exits: [{}, { sides: [-1], at: 11.8 }],
    style: {
      wall: 'tile:#d6e2ea', concWall: 'tile:#edf2f5', floor: 'floor:#cdd0d2', pillar: 'tile:#c2368f',
      accent: '#c2368f', mural: { v: 'sakura', color: '#d97aa6' },
    },
    surface: {
      seed: 311, roadHalf: 7, cross: [-64, 78], canalAt: 78, left: 'oldtown', right: 'mixed', trees: true,
      canalName: { ja: '南桜橋', en: 'Minami-Sakura-bashi' }, treeLeaf: 'flat:#f2bfcd',
    },
  },
  // Sunny southern heights, the Ichō Line crossing deep below: one ticket hall halfway between
  // the two lines (midlevel.ts). Butter-yellow panels, spring hills, new houses.
  harunodai: {
    kind: 'interchange',
    primary: 'M',
    mid: true,
    exits: [{ sides: [1], climb: 'back' }, { sides: [-1], climb: 'back' }],
    style: {
      wall: 'panel:#f6f0d9', concWall: 'panel:#f8f5e8', floor: 'floor:#d6d2c3', pillar: 'panel:#f6f0d9',
      accent: '#c2368f', mural: { v: 'hills', color: '#9cbf4a' },
    },
    surface: { seed: 313, roadHalf: 7, cross: [-66, 62], left: 'house', right: 'apartment', trees: true, poles: true },
  },

  // ══ Network expansion, stage 4: the Ichō Line, and S and M extensions ══
  // Old dockers' town: tarred-rope brown tile, navy gulls, warehouses and the port union hall.
  ikarimachi: {
    kind: 'underground',
    concourse: [-34, 34],
    gates: ['lo', 'hi'],
    // Two separate halls: the west one with a single exit climbing back over the station.
    split: [-4, 4],
    stairs: [{ x: -4.5, up: -1 }, { x: 4.5, up: 1 }],
    // Any stair climbing out of the east hall would come up in the side street at x = 70.
    exits: [{ sides: [1], climb: 'back' }, { sides: [-1], at: 4.6, climb: 'back' }],
    style: {
      wall: 'tile:#6b4f3a', concWall: 'tile:#ece6dd', floor: 'floor:#c9c4bb', pillar: 'tile:#2f3e56',
      accent: '#c99a06', mural: { v: 'gulls', color: '#2f3e56' },
    },
    surface: { seed: 401, roadHalf: 7, cross: [-66, 70], left: 'godown', right: 'oldtown', poles: true },
  },
  // Lighthouse avenue on the heights: a mined cavern crossed by the concourse bridge (looks/todai-dori.ts).
  // White enamel, harbour-blue trim, sea mist.
  'todai-dori': {
    kind: 'underground',
    // A short hall: the cavern opens up again past the stairs.
    concourse: [-22, 16],
    gates: ['lo'],
    stairs: [{ x: 12, up: -1 }],
    exits: [{ at: 11.5, climb: 'back' }],
    cavern: 11.5,
    style: {
      wall: 'panel:#f3f4f2', concWall: 'panel:#f7f8f6', floor: 'floor:#cfd2d0', pillar: 'panel:#2d5f8a',
      accent: '#2d5f8a', mural: { v: 'mist', color: '#5d8bb0' },
    },
    surface: { seed: 409, roadHalf: 10, cross: [-80, 72], left: 'apartment', right: 'mixed', trees: true, avenue: true },
  },
  // Firefly stream: stacked platforms (stacked.ts). Deep night-green tile, firefly lights, rice fields and a stream.
  hotarugawa: {
    kind: 'underground',
    concourse: [-22, 34],
    // A through hall: gates at both ends, the stair between them.
    gates: ['lo', 'hi'],
    stairs: [],
    // The east +z exit climbs back: out, it would come up on the Hotaru-bashi bridge.
    exits: [{}, { at: [4.6, 11.8], climb: ['out', 'back'] }],
    stacked: true,
    style: {
      wall: 'tile:#1f3a32', concWall: 'tile:#e8eee9', floor: 'floor:#c8cbc4', pillar: 'tile:#1f3a32',
      accent: '#d6e86a', mural: { v: 'leaves', color: '#b9d24a' },
    },
    surface: {
      seed: 419, roadHalf: 6, cross: [-62, 60], canalAt: 60, left: 'house', right: 'park', trees: true, poles: true,
      canalName: { ja: '蛍橋', en: 'Hotaru-bashi' },
    },
  },
  // Terraced-field slope: a hillside adit (adit.ts) from the concourse out to the valley's rice
  // fields, besides the exits up to the hilltop. Straw-gold panels, rolling hills, the college.
  narukozaka: {
    kind: 'underground',
    // Ends just past the valley tunnel's doorway.
    concourse: [-34, 28],
    gates: ['lo'],
    stairs: [{ x: 4, up: -1 }],
    exits: [{ sides: [-1] }],
    adit: true,
    style: {
      wall: 'panel:#efe2bf', concWall: 'panel:#f4eedc', floor: 'floor:#d3cdbd', pillar: 'tile:#8a6a2e',
      accent: '#c99a06', mural: { v: 'hills', color: '#a4882e' },
    },
    surface: {
      seed: 421, roadHalf: 6.5, cross: [], left: 'campus', right: 'house', trees: true, valleyZ: 44,
      campusName: { ja: '川湊農業短期大学', en: 'Kawaminato Agricultural College' },
    },
  },
  // Morning-calm shore: the line comes up from Uminomori into an open cutting. Kasumidani's
  // arrangement (open-air.ts 'cutting'): island under a sawtooth canopy, a glazed building
  // bridging the cutting. Dawn-pink panels, sea mist, the yacht harbour beside it.
  asanagi: {
    kind: 'elevated',
    layout: 'cutting',
    style: {
      wall: 'panel:#f0dcd2', concWall: 'panel:#f6ede8', floor: 'floor:#d0cac6', pillar: 'paint:#ee7b1a',
      accent: '#ee7b1a', mural: { v: 'mist', color: '#e39a7a' },
    },
    surface: { seed: 431, roadHalf: 6, cross: [], left: 'apartment', right: 'park', trees: true, poles: true },
  },
  // White-sand beach terminus on a viaduct by the sea. Shin-Kamome's arrangement (open-air.ts
  // 'seaside'): gull-wing canopies, a glazed hall under the viaduct, a boardwalk. Sand and turquoise.
  shirasunahama: {
    kind: 'elevated',
    layout: 'seaside',
    style: {
      wall: 'panel:#f4efe2', concWall: 'panel:#f8f5ec', floor: 'floor:#d8d2c2', pillar: 'paint:#2a9d9a',
      accent: '#2a9d9a', mural: { v: 'gulls', color: '#2a9d9a' },
    },
    surface: {
      seed: 433, roadHalf: 8, cross: [-70], left: 'park', right: 'sea', waterfront: 'promenade', trees: true,
      promenadeName: { ja: '白砂浜ビーチデッキ', en: 'Shirasunahama Beach Deck' },
    },
  },
  // Rape-blossom hillside on the viaduct. Hibarino's arrangement (build.ts buildElevated): side
  // platforms, the concourse under the deck. Bright yellow panels, yellow-leaved trees.
  nanohanadai: {
    kind: 'elevated',
    // Side platforms: their stairs come up 11.3 m out, so the hall under the viaduct is wider.
    width: 12,
    style: {
      wall: 'panel:#f7e27a', concWall: 'panel:#faf3d2', floor: 'floor:#d6d0bd', pillar: 'concrete',
      accent: '#c2368f', mural: { v: 'hills', color: '#e3c22a' },
    },
    surface: { seed: 439, roadHalf: 6.5, cross: [66], left: 'house', right: 'house', trees: true, poles: true, treeLeaf: 'flat:#f2df6a' },
  },
  // Milk-vetch meadow terminus on the viaduct. Shiondai's arrangement (open-air.ts 'terminus'):
  // one barrel vault, the hall under the platform end, a deck to the meadow park. Pink-lilac steel.
  rengeno: {
    kind: 'elevated',
    layout: 'terminus',
    style: {
      wall: 'panel:#efd7e6', concWall: 'panel:#f6edf2', floor: 'floor:#d4ccd1', pillar: 'paint:#b0569a',
      accent: '#c2368f', mural: { v: 'aster', color: '#b0569a' },
    },
    surface: { seed: 443, roadHalf: 7, cross: [], left: 'apartment', right: 'park', trees: true },
  },
};
