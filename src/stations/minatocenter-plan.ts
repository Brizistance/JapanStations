// Minato Center's plan numbers, kept free of imports so exits.ts can read them (minatocenter-atrium.ts,
// minatocenter-street.ts build from them).

/** Rise per metre of escalator run, and street level (kit.ts GROUND_Y). */
export const MC_SLOPE = 1.72, MC_GY = 0.15;

/** The atrium's plan and levels. */
export const MCA = {
  /** The glass hall: x0 … x1 along the avenue, z0 (north) … z1 (its front, the north pavement's back edge). */
  x0: 40, x1: 76, z0: -50, z1: -18,
  /** The low hall under the avenue, from the front on south to here. */
  hallZ: 11.6,
  /** Glass roof above the street. */
  roof: 22,
  /** Deck level above the street (the pedestrian deck, stage 2). */
  deck: 7,
  /** The first escalators (Exit 2): foot x, z band. */
  e1: { x: 44, z0: -30.6, z1: -27.8 },
  /** The second escalators: foot x (they climb west), z band. */
  e2: { x: 72, z0: -35.6, z1: -32.9 },
  /** The street-level balcony along the front, and its wider east landing. */
  sb: -26, east: 61.4, eastZ: -36,
  /** The deck-level balcony: x0 … dx1, z dz0 … z1. */
  dx1: 60, dz0: -36,
  /** Doorways in the front at street level. */
  doors: [[45, 51], [65, 71]] as [number, number][],
  num: '2',
};

/** The plot: x ±150, from the sea wall at z 52 north to z −198. The Baywalk pier is walked out over the bay (an arm). */
/**
 * The peninsula (extended 2026-11-25): the walked ground west to the open sea (x −331) and north to the river mouth
 * (z −493), east to Shinshio's connector road (x 214, shinshio-street.ts), whose bay road (z −400) and Hama-dōri
 * (z −466) are carried west across it. Streets: centre line, half width, pavement.
 */
export const PEN = {
  wsh: -331, nsh: -493, ce: 207,
  sr: { c: -305, half: 7, pave: 5 },
  /** 展示場筋 Tenjijō-suji, between the convention centre and the exhibition hall, from the avenue to Hama-dōri. */
  s3: { c: -171, half: 7, pave: 5 },
  md: { c: -285, half: 4.5, pave: 3 },
  br: { c: -400, half: 9, pave: 8.5 },
  hm: { c: -466, half: 3.25, pave: 3 },
  cn: { c: 214, half: 4, pave: 3 },
  /** The shore road's building lines, the river-mouth promenade and the strip behind Hama-dōri. */
  srE: -293, srW: -317, prom: -484.5,
};

/** The plot: x ±150, from the sea wall at z 52 north to z −198; the peninsula west and north of it and the pier are arms. */
export const MC_PLOT = {
  x: 150, z: 52, north: 198,
  arms: [[-331, -493, -150, 52], [-150, -493, 207, -198], [-20, 52, -12, 100], [-28, 100, -4, 112]] as [number, number, number, number][],
};

/** Which step of the rebuild is built: 1 the station, 2 streets and landmarks, 3 filled (street-plan.ts). */
export const MC_STAGE: 1 | 2 | 3 = 3;

type R = [number, number, number, number];

/** The streets (minatocenter-street.ts says the same in words). `a0`/`a1`: a T junction's end. */
export const MC_STREETS: { ja: string; en: string; axis: 'x' | 'z'; c: number; half: number; pave: number; lanes: number; a0?: number; a1?: number }[] = [
  { ja: '海辺通', en: 'Umibe-dōri (the avenue)', axis: 'x', c: 0, half: 11, pave: 7, lanes: 6 },
  { ja: '帆柱筋', en: 'Hobashira-suji', axis: 'z', c: -60, half: 7, pave: 5, lanes: 4, a1: -11 },
  { ja: '浜風筋', en: 'Hamakaze-suji', axis: 'z', c: 96, half: 7, pave: 5, lanes: 4, a1: -11 },
  { ja: 'センター北通', en: 'Sentā-kita-dōri', axis: 'x', c: -170, half: 4.5, pave: 3, lanes: 2 },
];

/** Building lines and strips. */
export const MC_LINES = {
  avN: -18, avS: 18,
  /** みなとモール公園, the pedestrian park across the plot. */
  mallN: -115, mallS: -95,
  /** The back street's building lines. */
  kiN: -177.5, kiS: -162.5,
  /** The Baywalk along the sea wall. */
  walk: 44,
};

/** Where the landmarks stand. */
export const MC_SITES = {
  /** The tower: front (face s) at z −26 across x −44 … 80, its notch round the atrium (build_mcenter.py). */
  tower: { x: 18, line: -26 },
  /** The exhibition hall: front (face s) at z −32, x −146 … −80, its forecourt to the avenue. */
  hall: { x: -113, line: -32 },
  /** The Ferris wheel on the waterfront: front (face n) at z 20, x −145 … −75. */
  wheel: { x: -110, line: 20 },
  /** The deck from the atrium's deck level across the avenue: x0 … x1, landing to z land, stair down east to x foot. */
  deck: { x0: 52.3, x1: 57.7, land: 26, foot: 69.7 },
  /** The Baywalk's pier: the walk out x −20 … −12, the head x −28 … −4, z 100 … 112. */
  pier: { x0: -20, x1: -12, hx0: -28, hx1: -4, z0: 100, z1: 112 },
};

/** Ground no building may stand on. */
export const MC_RESERVED: { r: R; en: string }[] = [
  { r: [-150, -115, 150, -95], en: 'みなとモール公園' },
  { r: [-150, 44, 150, 52], en: 'the Baywalk' },
  { r: [-150, 18, 86, 44], en: 'the waterfront park' },
  { r: [138, 18, 150, 44], en: 'the waterfront park (east)' },
  { r: [86, 18, 138, 22], en: 'the warehouse’s terrace' },
  { r: [-146, -32, -80, -18], en: 'the exhibition hall’s forecourt' },
  { r: [-44, -26, 40, -18], en: 'the tower’s forecourt' },
];
