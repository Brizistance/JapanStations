// Shinshio's fixed measurements, shared by its street (shinshio-street.ts), the street rules (street-plan.ts)
// and the exit boards (exits.ts). Station frame: +x east along the Kikyō Line, +z south. Numbers only.

/**
 * The plot: the port landfill between the river mouth (its sea wall at z −92) and the Shinshio dock (its quay
 * wall at z 52, x ±150), 0.5 m short of both walls. Land goes on east and west; nothing past it is walked.
 */
export const SHINSHIO_PLOT = { x: 150, z: 51.5, north: 91.5 };

/** Which step of the rebuild is built: 2 streets and landmarks, 3 filled (street-plan.ts runs what it can). */
export const SHINSHIO_STAGE: 1 | 2 | 3 = 3;

type R = [number, number, number, number];

/** The streets (the head comment of shinshio-street.ts says the same in words). `a0`/`a1`: a T junction's end. */
export const SHINSHIO_STREETS: { ja: string; en: string; axis: 'x' | 'z'; c: number; half: number; pave: number; lanes: number; a0?: number; a1?: number }[] = [
  { ja: '新潮臨港通', en: 'Shinshio-rinkō-dōri (the bay road)', axis: 'x', c: 0, half: 9, pave: 8.5, lanes: 4 },
  { ja: '浜通', en: 'Hama-dōri', axis: 'x', c: -66, half: 3.25, pave: 3, lanes: 2 },
  { ja: '場外筋', en: 'Jōgai-suji', axis: 'z', c: -45, half: 3.5, pave: 3, lanes: 2, a0: -62.75, a1: -9 },
  { ja: '冷蔵庫筋', en: 'Reizōko-suji', axis: 'z', c: 100, half: 4, pave: 3, lanes: 2, a0: -62.75, a1: 44 },
];

/** Building lines. */
export const SHINSHIO_LINES = { avN: -17.5, avS: 17.5, haN: -72.25, haS: -59.75, quay: 44, prom: -84.5 };

/** The outer market's lanes: the covered alley through both blocks and the alleys off it. */
export const SHINSHIO_LANES = {
  /** 場外横丁, the covered alley: z −39 … −35.5 (behind the bay road's 18 m row), either side of Jōgai-suji. */
  alley: { z0: -39, z1: -35.5, runs: [[-150, -51.5], [-38.5, 93]] as [number, number][] },
  /** North–south alleys, 3 m: x0, x1, z0, z1 (the one at x 50 is a dead end at the backs of Hama-dōri's row). */
  cuts: [[-101.5, -98.5, -59.75, -17.5], [-1.5, 1.5, -59.75, -17.5], [48.5, 51.5, -49.5, -39]] as R[],
};

/** Where the landmarks stand. */
export const SHINSHIO_SITES = {
  /** The market hall, front (face n) at z 24, x −95 … 55; its truck forecourt from the building line. */
  hall: { x: -20, line: 24, w: 150, d: 20 },
  /** The ferry terminal, front (face s) on Hama-dōri's north building line, looking down Jōgai-suji. */
  terminal: { x: -45, line: -72.25 },
  /** The pontoon's gangway leaves the sea wall here. */
  pontoon: { x: -45, line: -91.5 },
  /** The harbour shrine on the dock's east corner, its torii at the quay (face s). */
  shrine: { x: 124, line: 44 },
};

/** Ground no building may stand on. */
export const SHINSHIO_RESERVED: { r: R; en: string }[] = [
  { r: [-95, 17.5, 93, 24], en: 'the market hall’s truck bays' },
  { r: [55, 24, 56.7, 44], en: 'the cold store’s yard' },
  { r: [81.3, 24, 93, 44], en: 'the cold store’s yard' },
  { r: [56.7, 42.3, 81.3, 44], en: 'the cold store’s yard' },
  { r: [107, 17.5, 115, 44], en: 'the shrine’s approach' },
  { r: [115, 17.5, 133, 22], en: 'the shrine’s grove' },
  { r: [-150, 44, 150, 51.5], en: 'Shinshio Quay' },
  { r: [-150, -91.5, 150, -84.5], en: 'the sea-wall promenade' },
  { r: [-150, -39, -51.5, -35.5], en: 'the covered alley (west)' },
  { r: [-38.5, -39, 93, -35.5], en: 'the covered alley (east)' },
  { r: [-101.5, -59.75, -98.5, -17.5], en: 'an alley' },
  { r: [-1.5, -59.75, 1.5, -17.5], en: 'an alley' },
  { r: [48.5, -49.5, 51.5, -39], en: 'a dead-end alley' },
  { r: [-61.7, -35.5, -51.5, -17.5], en: 'the bicycle park by Exit 1' },
  { r: [-81.4, -84.5, -65.4, -72.25], en: 'the ferry terminal’s car park' },
];
