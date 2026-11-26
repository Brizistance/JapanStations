// Shiomi's plan numbers (rebuilt 2026-11-25), kept free of imports so exits.ts and street-plan.ts can read them
// (shiomi.ts builds from them). Station frame: +x east along the Shiokaze Line, +z south; the river mouth's sea
// wall at z 52, the open bay's at x −319.5.

import type { StreetLine } from './street-plan';

/** Which step of the rebuild is built: 1 the station, 2 streets and landmarks, 3 filled (street-plan.ts). */
export const SHIOMI_STAGE: 1 | 2 | 3 = 3;

/**
 * The terminus: an island in an open cutting the platforms' length (x ±60), under a wave canopy that rises over
 * the street; the head house on a deck over the cutting's west end (its paid side over the platform's end, the
 * lift down to the island inside it); the east hall over the tunnel mouth. The turnback sidings run on west in a
 * covered box under the plaza.
 */
export const SHIOMI = {
  /** The cutting's open length and the half width inside its retaining walls (kit.ts hallDims wallZ). */
  cut: { x0: -60, x1: 60, z: 7.7 },
  /** The wave canopy over the open cutting, from Hamakaze-suji's deck to the east hall, and its half width. */
  canopy: { x0: -14, x1: 46, z: 9.4 },
  /** The head house: x0 (its front's ends on the plaza; the middle bows `bow` further out) … x1 (its face down the
   *  platforms), half width z; the gates; its roof (the deck is 0.3 above). */
  head: { x0: -88, x1: -46, z: 14, bow: 4, gateX: -64, roof: 6.0 },
  /** The roof deck's outside stair along the north wall (z band) and its landing at the deck's edge (x span); the lift beyond. */
  deck: { stairZ: [-16.7, -14.4] as [number, number], land: [-66, -63.6] as [number, number] },
  /** The lift from the island into the head house's paid side: its doors' line (facing +x). */
  liftX: -55.5,
  /** The east hall over the tunnel mouth: x0 … x1, half width z; the gates; its side doors' span. */
  east: { x0: 46, x1: 64, z: 11, gateX: 52, roof: 4.8, door: [55, 61] as [number, number] },
  /** The head house's front doors (half width) and its side doors' span. */
  frontDoor: 5,
  sideDoor: [-84, -78] as [number, number],
};

/**
 * The plot: x ±150, from the river mouth's sea wall at z 52 north to the landfill's north sea wall at z −295.5
 * (grown north 2026-11-25); the tip west to the open bay (an arm), the boat landing's pontoon, the marina's pontoons
 * off the north shore and the fishing pier out into the bay.
 */
export const SHIOMI_PLOT = {
  x: 150, z: 52, north: 295.5,
  // (The second arm: the market's boat landing, its gangway and pontoon out over the river mouth.)
  arms: [[-319.5, -295.5, -150, 52], [-212.2, 52, -187.8, 63.2], [-302, -317, -238, -295.5], [-367, -209, -319.5, -191], [-46, 52, -6, 171.1]] as [number, number, number, number][],
};

/**
 * The streets (stage 2; shiomi-street.ts says the same in words). Names web-checked 2026-11-25: none found in use
 * (Tokyo's real 潮見通り is avoided).
 */
export const SHIOMI_STREETS: StreetLine[] = [
  { ja: '潮見ベイ通り', en: 'Shiomi Bay-dōri (the main road)', axis: 'x', c: -29, half: 7, pave: 5, lanes: 4, a0: -135 },
  { ja: '岬筋', en: 'Misaki-suji', axis: 'z', c: -135, half: 3.25, pave: 2.5, lanes: 2, a0: -284.5, a1: 19 },
  { ja: '汐入筋', en: 'Shioiri-suji', axis: 'z', c: 80, half: 3.5, pave: 2.5, lanes: 2, a0: -284.5, a1: 19 },
  { ja: '潮見東筋', en: 'Shiomi-higashi-suji', axis: 'z', c: 116, half: 3.5, pave: 2.5, lanes: 2, a0: -284.5, a1: 19 },
  { ja: '潮見北岸通', en: 'Shiomi-hokugan-dōri (the north shore drive)', axis: 'x', c: -284.5, half: 3.5, pave: 2.5, lanes: 2 },
  { ja: '岬北通', en: 'Misaki-kita-dōri', axis: 'x', c: -128, half: 3.5, pave: 2.5, lanes: 2, a1: -135 },
  { ja: '潮見なぎさ通', en: 'Shiomi-nagisa-dōri', axis: 'x', c: -215, half: 3.25, pave: 2, lanes: 2 },
  { ja: '潮見ベイ通り 裏路地', en: 'Shiomi Bay-dōri back lane', axis: 'x', c: -66, half: 1.5, pave: 0, lanes: 0, a0: -26, a1: 80 },
  { ja: '潮見中通', en: 'Shiomi-naka-dōri', axis: 'x', c: -95, half: 3, pave: 1.5, lanes: 2, a0: -135 },
  { ja: '潮見北通', en: 'Shiomi-kita-dōri', axis: 'x', c: -150, half: 3.25, pave: 2, lanes: 2, a0: -135 },
  // (Hamakaze-suji carried on from Minato Center over 潮見大橋, the bascule bridge (stage 3, 2026-11-25), in Tōdai-kōji's place.)
  { ja: '浜風筋', en: 'Hamakaze-suji', axis: 'z', c: -26, half: 7, pave: 5, lanes: 4, a0: -284.5 },
  { ja: '浜木綿小路', en: 'Hamayū-kōji', axis: 'z', c: 20, half: 3.25, pave: 2, lanes: 2, a0: -284.5, a1: -29 },
  // (Added before the fill, 2026-11-25: the 91 m blocks between 岬筋 and 浜風筋 halved.)
  { ja: '帆布小路', en: 'Hanpu-kōji', axis: 'z', c: -85, half: 3.25, pave: 2, lanes: 2, a0: -284.5, a1: -29 },
  { ja: '水族館通り', en: 'Suizokukan-dōri', axis: 'x', c: 0, half: 3, pave: 1.5, lanes: 2, a1: -135 },
  { ja: '緑道裏通', en: 'Ryokudō-ura-dōri', axis: 'x', c: 19, half: 2.5, pave: 0, lanes: 1, a0: -135 },
];

/** Building lines and strips, z unless said. */
export const SHIOMI_LINES = {
  /** The main road's building lines. */
  bayN: -41, bayS: -17,
  /** The back street's and the north small street's. */
  nakaN: -99.5, nakaS: -90.5,
  /** The greenway: its planted strip from the service lane, the promenade along the sea wall. */
  green: 21.5, prom: 40,
  /** The tip (the arm): the shopping street's building lines, the coach road to the aquarium. */
  shopN: -4.5, shopS: 4.5,
  coach: { c: -62, half: 3.5, pave: 2.5, x0: -252 },
  /** The bay drive 潮見西岸通 along the open bay (x), from the north shore drive down to 岬北通; the tip cross street 時計筋 (x). */
  bayDrive: { c: -308.5, half: 3.5, pave: 2.5 },
  tipCross: { c: -195, half: 3.5, pave: 2.5 },
  /** The promenades on the sea walls: the north shore's (z −295.5 … −288), the bay's (x −319.5 … −312). */
  northProm: -288, westProm: -312,
  /** The tip's small streets (added before the fill): 灯台小路 (x) from the shore drive to 岬北通, 西岬通 (z) from the bay drive to 岬筋. */
  tipLane: { c: -250, half: 3.25, pave: 2 }, tipCut: { c: -172, half: 3.25, pave: 2 },
  /** The aquarium's square at the shopping street's end (x span). */
  square: [-252, -228] as [number, number],
};

/**
 * 潮見大橋, the bascule bridge carrying Hamakaze-suji over the river mouth (stage 3): its centre line (x), from Shiomi's sea
 * wall (z0) to Minato Center's plot edge (z1, its z −493: the walk goes on into its world there); the leaves' hinges, the
 * barriers either side of them, the control towers (x, z of their fronts on the deck's side).
 */
export const SHIOMI_BRIDGE = {
  c: -26, half: 7, pave: 5, z0: 52, z1: 171.1,
  hinge: [96.5, 126.5] as [number, number], gate: [90, 133] as [number, number],
  towerE: { x: -9.4, z: 93 }, towerW: { x: -42.6, z: 130 },
  key: 'shiomi-ohashi',
};

/** Where the landmarks stand. */
export const SHIOMI_SITES = {
  /** 川湊水族館: front (face e) at x −252 across z −58 … 36, 60 m deep to x −312; a walk round it to the sea walls. */
  aquarium: { line: -252, z0: -58, z1: 36, depth: 60 },
  /** The harbour market hall: front (face n) on the shopping street's south line, x −224 … −160, 31.5 m deep. */
  market: { x0: -224, x1: -160, depth: 31.5 },
  /** The bus terminal: between the main road, the back street, Misaki-suji and Tōdai-kōji's west building line. */
  bus: { x0: -129.25, x1: -96, z0: -90.5, z1: -41 },
};

export const SHIOMI_RESERVED: { r: [number, number, number, number]; en: string }[] = [
  { r: [-46, -8.1, 46, 8.1], en: "the station's open cutting" },
  { r: [46, -11, 64, 11], en: "the station's east hall" },
];
