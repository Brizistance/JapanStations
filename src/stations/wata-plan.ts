// Watayamachi's fixed measurements, shared by the station (wata-centre.ts), its street
// (watayamachi-street.ts) and the exit boards (exits.ts). Station frame: +x east along the Kikyō
// Line, +z south. Numbers only: nothing is imported here, so anything may import it.

/**
 * The plot: Senba's 72 m blocks need more ground than an ordinary station's. Its north edge is the south
 * bank of Hyōtan-bori (data/geography.ts: the canal runs east–west at z −115…−101 here), 100 m north of
 * the avenue's middle; the canal is seen from the plot, not walked. One arm reaches west along Kase-dōri over
 * the AR Main Line's level crossing, 15 m beyond the west edge (WATA_ARM).
 */
export const WATA_ARM: [number, number, number, number] = [-204, 90, -170, 102];
export const WATA_PLOT = { x: 170, z: 150, north: 100, arms: [WATA_ARM] };

/** [x0, z0, x1, z1] */
type R = [number, number, number, number];

export const WATA = {
  /** The avenue's middle strip, which the wholesale centre fills under the expressway. */
  z0: -9, z1: 9,
  /**
   * The centre's halls, numbered from the east as their boards are (1号館 …), each a model of
   * tools/blender/build_watacentre.py. `walk`: the two by the crossing, walked into, each with a
   * stair down to the concourse.
   */
  halls: [
    { id: 'hall_far', x0: 89, x1: 161, num: 1, walk: false },
    { id: 'hall_e', x0: 14, x1: 83, num: 2, walk: true },
    { id: 'hall_w', x0: -83, x1: -42, num: 3, walk: true },
    { id: 'hall_far', x0: -161, x1: -89, num: 4, walk: false },
  ],
  /** Portal piers under the deck where no hall carries it (either side of Akane-suji). */
  piers: [-12.5, 12.5],
  /** The deck's spans: 20 m each, edge to edge of the plot. */
  span: 20,
  /**
   * A stair hall, as built at the east end (the west one is its mirror in x): the lobby beyond the
   * concourse's end wall runs from `lobby` to `foot`, where the flights start climbing away from
   * the station between z = well[0] and well[1]; the doorway in the end wall is `door` (z range).
   */
  lobby: 45.4, foot: 48.4, well: [-4.9, -0.3] as [number, number], door: [-4.4, 0.5] as [number, number],
  /** The lift beside the east stair (its shaft, which rises through the hall floor), opening north. */
  lift: { x: 46.9, z: 0.8, shaft: [45.75, 0.8, 48.05, 3.1] as R },
  /** Exit numbers of the two stair halls (1 and 2 are the east gates' pavement exits). */
  east: '3', west: '4',
};

/** Length of a stair hall's flights for a concourse floor at `cf` (the street is at 0.15). */
export const wataRun = (cf: number) => Math.round((0.15 - cf) * 1.72 * 100) / 100;

/** The opening of a stair hall's well in the hall floor: the exit's place in the street. */
export const wataWell = (cf: number, east: boolean): R =>
  east ? [WATA.foot, WATA.well[0], WATA.foot + wataRun(cf), WATA.well[1]] : [-WATA.foot - wataRun(cf), WATA.well[0], -WATA.foot, WATA.well[1]];

/** Which stage of the rebuild is built (docs/station-playbook.md): street-plan.ts runs the checks that stage can pass. */
export const WATA_STAGE: 1 | 2 | 3 = 3;

/**
 * The streets, as agreed with the owner (the head comment of watayamachi-street.ts is the same table in words).
 * The names were web-searched on 2026-11-24 with nothing real found (docs/worldbuilding.md).
 */
export const WATA_STREETS: { ja: string; en: string; axis: 'x' | 'z'; c: number; half: number; mid?: number; pave: number; lanes: number }[] = [
  { ja: '木綿大通', en: 'Momen-ōdōri (the avenue)', axis: 'x', c: 0, half: 14.4, mid: 9, pave: 5.6, lanes: 4 },
  { ja: '茜筋', en: 'Akane-suji', axis: 'z', c: 0, half: 6, pave: 5, lanes: 4 },
  { ja: '晒通', en: 'Sarashi-dōri (the canal bank)', axis: 'x', c: -96, half: 4, pave: 0, lanes: 1 },
  { ja: '綛通', en: 'Kase-dōri', axis: 'x', c: 96, half: 4, pave: 0, lanes: 1 },
  { ja: '紡錘筋', en: 'Tsumu-suji', axis: 'z', c: -164, half: 3, pave: 0, lanes: 0 },
  { ja: '糸巻筋', en: 'Itomaki-suji', axis: 'z', c: -86, half: 3, pave: 0, lanes: 1 },
  { ja: '筬筋', en: 'Osa-suji', axis: 'z', c: 86, half: 3, pave: 0, lanes: 1 },
  { ja: '綿打筋', en: 'Watauchi-suji', axis: 'z', c: 164, half: 3, pave: 0, lanes: 0 },
];

/** Ground no building may stand on: the old drain line down the middle of each block. (The AR Main Line was moved off the plot on 2026-11-25: no strip is kept for it.) */
export const WATA_RESERVED: { r: R; en: string }[] = [
  ...[-56, 56, 136].map((z) => ({ r: [-WATA_PLOT.x, z - 0.9, WATA_PLOT.x, z + 0.9] as R, en: `the drain alley at z ${z}` })),
  // The 3 m verges between the two outer streets and the plot's edge: a wall and planting.
  { r: [-WATA_PLOT.x, -WATA_PLOT.north, -167, WATA_PLOT.z] as R, en: 'the west verge' },
  { r: [167, -WATA_PLOT.north, WATA_PLOT.x, WATA_PLOT.z] as R, en: 'the east verge' },
  // Behind the low shop-houses on the last strip: their back yards, against the wall at the south edge.
  { r: [-WATA_PLOT.x, WATA_PLOT.z - 2, WATA_PLOT.x, WATA_PLOT.z] as R, en: 'the back yards by the south edge' },
];
