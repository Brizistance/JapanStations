// Umibe-shiyakusho-mae's fixed measurements, shared by its street (umibe-street.ts), the street rules
// (street-plan.ts) and the exit boards (exits.ts). Station frame: +x east along the Nagisa Line, +z south.
// Numbers only: nothing is imported here, so anything may import it.

/**
 * The plot. South of the avenue the landfill ends 52 m out except for the point the park stands on
 * (data/geography.ts: x ±150, out to z 140): the plot takes the whole point, 2 m short of its sea walls.
 * North, the Shinshio dock begins 160 m out; the plot stops at the back of the row behind the back street.
 */
export const UMIBE_PLOT = { x: 148, z: 138, north: 120, arms: [[147, -120, 555, 52], [554, -85, 570, 52]] as [number, number, number, number][] };

/**
 * The link east to Kawaminato-kō (umibe-east.ts, 2026-11-25): the plot's arms above, walked all the way.
 * Kawaminato-kō's west edge is x 570 here (its frame is this one moved 700 m east); Tōsen-machi's plot
 * takes the corner north of z −85 from x 555. `mid`: the 筋 where the avenue narrows and the two back
 * streets end; `tsu`: Kawaminato-kō's back street, carried on west as far as it.
 */
export const UMIBE_EAST = {
  x0: 148, x1: 570, north: 555,
  mid: { c: 360, half: 6, pave: 3.5 },
  locals: [{ c: 232, half: 3.25, pave: 2 }, { c: 470, half: 3.25, pave: 2 }],
  /** East of `mid` the avenue is Kawaminato-kō's boulevard: 18 m of carriageway, 10.5 m pavements. */
  av: { half: 9, pave: 10.5 },
  tsu: { c: -54, half: 4.5, pave: 2.5 },
  /** Kawaminato-kō's driven lanes at the seam (its minato-street.ts). */
  lane: 2.25, tsuLane: 2.25,
};

/** Which stage of the rebuild is built: street-plan.ts runs the checks that stage can pass. */
export const UMIBE_STAGE: 1 | 2 | 3 = 3;

type R = [number, number, number, number];

/**
 * The streets (the head comment of umibe-street.ts is the same table in words). The three 筋 end at the
 * avenue: south of it is the park. `a1`: where a street stops short of the plot's far edge.
 */
export const UMIBE_STREETS: { ja: string; en: string; axis: 'x' | 'z'; c: number; half: number; pave: number; lanes: number; a1?: number }[] = [
  { ja: '海辺通', en: 'Umibe-dōri (the avenue)', axis: 'x', c: 0, half: 11, pave: 7, lanes: 6 },
  { ja: '浜木綿筋', en: 'Hamayū-suji (the boulevard)', axis: 'z', c: 0, half: 9, pave: 5, lanes: 4, a1: -11 },
  { ja: '浜千鳥通', en: 'Hamachidori-dōri', axis: 'x', c: -84, half: 3.25, pave: 2, lanes: 2 },
  { ja: '澪標筋', en: 'Miotsukushi-suji', axis: 'z', c: -96, half: 3.25, pave: 2, lanes: 2, a1: -11 },
  { ja: '灯台筋', en: 'Tōdai-suji', axis: 'z', c: 96, half: 3.25, pave: 2, lanes: 2, a1: -11 },
];

/** The park's parts (all south of the avenue's building line at z 18). */
export const UMIBE_PARK = {
  /** The central mall on the boulevard's axis, from the avenue to the sea terrace. */
  mall: 8, mallEnd: 96,
  /** The round sea terrace and its monument. */
  terrace: { x: 0, z: 112, r: 18 },
  /** The fountain basin half way down the mall. */
  fountain: { x: 0, z: 62, r: 6 },
  /** The promenade round the point's three sea walls. */
  prom: 6,
};

/** Ground no building may stand on. */
export const UMIBE_RESERVED: { r: R; en: string }[] = [
  // (The park, round its rest house at x 75…89, z 27…35.)
  { r: [-148, 18, 74.9, 138], en: 'Umibe Park' },
  { r: [89.1, 18, 148, 138], en: 'Umibe Park' },
  { r: [74.9, 35.1, 89.1, 138], en: 'Umibe Park' },
  { r: [74.9, 18, 89.1, 26.9], en: 'Umibe Park' },
  { r: [-148, -120, 148, -115.25], en: 'the rear yards along the north edge' },
  { r: [-148, -52.75, -14, -48], en: 'the service lane behind the avenue (west)' },
  { r: [101.25, -52.75, 148, -48], en: 'the service lane behind the avenue (east)' },
];
