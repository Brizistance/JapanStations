// Tsumugibashi as a canal town (the 2026-11-26 rebuild, stage 2a: ground, water, streets, plain bridge
// decks, the edges; docs/street-design.md). Waterside layout: the streets follow the water and the
// bridges set where the cross streets fall.
//
// Frame: +x east (Tsumugi-dōri over the Nagisa Line), +z south. Fixed: the avenue (z ±36.5 between
// building lines), Yanagi-suji (x ±16), Tsumugi-bori (x 80 … 104) and its stone bridge.
//
//   The Mio-gawa's south bank slants (z −414 at x 200, −444 at x −350): the bank is stepped every 25 m and
//   the plot reaches a little way into the river, so there is no dead wedge between street and water.
//   The branch canal leaves Tsumugi-bori at z −164 … −150, runs west under Yanagi-suji to x −147 … −133,
//   north to z −272 … −258, west to x −222 … −208 and north to the river: an island quarter inside it.
//   Yanagi-suji crosses the river on a deck out to Kita-Ōdōri's plot (an arm); so does the two-lane
//   street at x −290, which lines up with a cross street beyond Kita-Ōdōri's west edge.
//
// tsumugibashi-street.ts still builds Tsumugi-bori between z ±150 (walks, stairs, the stone bridge), the
// Exchange's and the bank's pieces; this builds everything else at street level.

import type { Builder } from '../world/builder';
import { GROUND_Y as GY } from './kit';
import { roadModel } from './roads';
import { modelTree } from './trees';

type Rect = [number, number, number, number];
/** A street: 'x' runs east–west at z = c, 'z' north–south at x = c; carriageway half width, pavement, its ends. */
export interface St { ax: 'x' | 'z'; c: number; half: number; pave: number; a0: number; a1: number; kind: 'wide' | 'two' | 'small'; out?: (1 | -1)[] }

/** The plot: the rectangle, and how far north its two parts reach (into the river). */
export const CANAL_PLOT = { x0: -350, x1: 200, z1: 150, north: 432, northWest: 446, step: -200 };
/** The river decks: Yanagi-suji's and the west street's, out to Kita-Ōdōri's side. */
const DECK_Y: Rect = [-16, -520, 16, -432], DECK_W: Rect = [-296, -519, -284, -446];
export const AV = { rw: 12, sep: 16, svc: 23.5, strip: 27.5, front: 36.5 };
const CANAL = { x0: 80, x1: 104, w0: 85, w1: 99, prom: -2.0 };
const WHITE = 'flat:#e9e9e4', YELLOW = 'flat:#e6a700', STONE = 'flat:#b3a688', STONE_DK = 'flat:#7d7361';

/** The Mio-gawa's south bank (data/geography.ts, in this frame). */
const bankAt = (x: number) => (x >= 0 ? -422 + 0.0395 * x : x >= -220 ? -422 + 0.0364 * x : -430 + 0.1055 * (x + 220));

export const STREETS: St[] = [
  // East–west.
  { ax: 'x', c: 0, half: AV.rw, pave: AV.front - AV.rw, a0: -350, a1: 200, kind: 'wide', out: [-1, 1] },
  { ax: 'x', c: -95, half: 4.5, pave: 3, a0: -350, a1: 72.5, kind: 'two', out: [-1] },
  { ax: 'x', c: 100, half: 4.5, pave: 3, a0: -350, a1: 72.5, kind: 'two', out: [-1] },
  { ax: 'x', c: -340, half: 4.5, pave: 3, a0: -290, a1: 200, kind: 'two', out: [1] },
  { ax: 'x', c: -167.25, half: 3.25, pave: 0, a0: -133, a1: 72.5, kind: 'small' }, // the quay street
  { ax: 'x', c: -150, half: 3.25, pave: 0, a0: -290, a1: -150, kind: 'small' },
  { ax: 'x', c: -205, half: 3.25, pave: 0, a0: -290, a1: -10, kind: 'small' },
  { ax: 'x', c: -250, half: 3.25, pave: 0, a0: -126.5, a1: -10, kind: 'small' },
  { ax: 'x', c: -292, half: 3.25, pave: 0, a0: -126.5, a1: -10, kind: 'small' },
  { ax: 'x', c: -198, half: 3.25, pave: 0, a0: 10, a1: 72.5, kind: 'small' },
  { ax: 'x', c: -235, half: 3.25, pave: 0, a0: 10, a1: 72.5, kind: 'small' },
  { ax: 'x', c: -285, half: 3.25, pave: 0, a0: 10, a1: 72.5, kind: 'small' },
  { ax: 'x', c: -110, half: 3.25, pave: 0, a0: 125, a1: 200, kind: 'small', out: [1] },
  { ax: 'x', c: -165, half: 3.25, pave: 0, a0: 125, a1: 200, kind: 'small', out: [1] },
  { ax: 'x', c: -228, half: 3.25, pave: 0, a0: 125, a1: 200, kind: 'small', out: [1] },
  { ax: 'x', c: -288, half: 3.25, pave: 0, a0: 125, a1: 200, kind: 'small', out: [1] },
  { ax: 'x', c: 80, half: 3.25, pave: 0, a0: 125, a1: 200, kind: 'small', out: [1] },
  // North–south.
  { ax: 'z', c: 0, half: 10, pave: 6, a0: -520, a1: 150, kind: 'wide', out: [1] },
  { ax: 'z', c: -290, half: 3.5, pave: 2.5, a0: -519, a1: 150, kind: 'two', out: [1] },
  { ax: 'z', c: 125, half: 4.5, pave: 3, a0: -344.5, a1: 150, kind: 'two', out: [1] },
  { ax: 'z', c: -320, half: 2.75, pave: 0, a0: -99.5, a1: -AV.rw, kind: 'small' },
  { ax: 'z', c: -320, half: 2.75, pave: 0, a0: AV.rw, a1: 150, kind: 'small', out: [1] },
  { ax: 'z', c: -185, half: 3.25, pave: 0, a0: -344.5, a1: -AV.rw, kind: 'small' },
  { ax: 'z', c: -185, half: 3.25, pave: 0, a0: AV.rw, a1: 150, kind: 'small', out: [1] },
  { ax: 'z', c: -75, half: 3.25, pave: 0, a0: -147, a1: -AV.rw, kind: 'small' },
  { ax: 'z', c: -75, half: 3.25, pave: 0, a0: AV.rw, a1: 150, kind: 'small', out: [1] },
  { ax: 'z', c: -129.75, half: 3.25, pave: 0, a0: -344.5, a1: -164, kind: 'small' }, // the quay street, north leg
  { ax: 'z', c: 45, half: 2.75, pave: 0, a0: -344.5, a1: -170.5, kind: 'small' },
  { ax: 'z', c: 170, half: 3.25, pave: 0, a0: -344.5, a1: -AV.rw, kind: 'small' },
  { ax: 'z', c: 170, half: 3.25, pave: 0, a0: AV.rw, a1: 150, kind: 'small', out: [1] },
];
/** Paved lanes without cars (a darker band in the paving): through the deep blocks, and across the island. */
const LANES: Rect[] = [
  [-283.5, -66, 30, -63], [64, -66, 72.5, -63], [-283.5, 62, -16, 65], [-77, -336, -73, -170.5], [117.5, -71.5, 200, -68.5], [117.5, 113.5, 200, 116.5],
];
/** The branch canal's water, leg by leg, and the decks over it and over Tsumugi-bori (plain in stage 2a). */
const WATER: Rect[] = [[-147, -164, 80, -150], [-147, -272, -133, -164], [-222, -272, -147, -258], [-222, -432, -208, -272]];

/** The stepped bank's z at x (the bank is cut every 25 m). */
const P0 = -350;
/** (Between x −200 and −125 the bank stands 3 m back, so the lower promenade fits inside the plot: the riverfront, 2026-11-26.) */
export const bankStep = (x: number) => Math.round(bankAt(P0 + Math.floor((x - P0) / 25) * 25 + 12.5)) + (x >= -200 && x < -125 ? 3 : 0);
/** The river walk's footbridges over the two canal mouths, 4 m wide (their stonework is a model: tsumugi-land.ts). */
export const MOUTH_K: Rect = [-222, bankStep(-215) + 0.6, -208, bankStep(-215) + 4.6];
export const MOUTH_T: Rect = [CANAL.x0, Math.round(bankAt(92)) - 1 + 0.6, CANAL.x1, Math.round(bankAt(92)) - 1 + 4.6];
const DECKS: Rect[] = [
  [-16, -164, 16, -150], [-77, -164, -73, -150], [-147, -208.25, -133, -201.75], [-189.5, -272, -180.5, -258], [-222, -347.5, -208, -332.5],
  [CANAL.x0, -347.5, CANAL.x1, -332.5], MOUTH_K, MOUTH_T,
];
/** Broad stone steps from the river walk down to the lower promenade (x0, x1; each inside one 25 m step of the bank); the second is the river stage's seating. */
export const GANGI: [number, number][] = [[-262, -252], [51, 69], [154, 166]];
/** Stairs along the bank down to the promenade besides the two at the bridge: the head's x0, x1, and which way the foot lies. */
export const SIDE_STAIRS: [number, number, 1 | -1][] = [[-199, -196.8, 1], [106, 108.2, 1]];
/**
 * Where the water's parapet is left open (tsumugi-land.ts): the heads of the two terrace stairs at the
 * bridge's south corners, and the landing's steps on Kase-bori's south quay.
 */
export const RAIL_GAPS: Rect[] = [
  [-29, bankStep(-30) - 0.6, -26.8, bankStep(-30) + 0.6], [26.8, bankStep(30) - 0.6, 29, bankStep(30) + 0.6], [40, -150.6, 56, -149.4],
  ...[...GANGI, ...SIDE_STAIRS].map(([a, e]): Rect => [a, bankStep(a + 0.5) - 0.6, e, bankStep(a + 0.5) + 0.6]),
];
/** The taxi bay before the Exchange, cut from the avenue's south separator. */
/** How far Tsumugi-dōri is carried on east of the plot: to 25 m short of Daigaku-mae's own carried-on streets (its plot's west edge is x 735 here). */
export const AV_EAST = 380;
export const TAXI: Rect = [38.5, AV.rw, 68, AV.sep];
/** The avenue's bus stops (tsumugi-dress.ts), on the separators: x of the shelter, and the side (−1 north, eastbound). */
export const BUS_STOPS: { x: number; s: 1 | -1 }[] = [{ x: 46, s: -1 }, { x: -60, s: 1 }];
/** The back streets carry utility poles with their own lights (tsumugi-dress.ts); the two quay streets keep lamps. */
export const poled = (s: St) => s.kind === 'small' && s.c !== -167.25 && s.c !== -129.75;
/** Water at street level (the canals and the river inside the stepped bank), decks apart. */
export const canalWet = (x: number, z: number) =>
  !DECKS.some((r) => inR(r, x, z, 0.01)) && (WATER.some((r) => inR(r, x, z)) || inR([CANAL.x0, -460, CANAL.x1, 150], x, z) || (z < bankStep(x) && Math.abs(x) > 16 && Math.abs(x + 290) > 6));

const carriageOf = (s: St): Rect => (s.ax === 'x' ? [s.a0, s.c - s.half, s.a1, s.c + s.half] : [s.c - s.half, s.a0, s.c + s.half, s.a1]);
const inR = (r: Rect, x: number, z: number, m = 0) => x > r[0] - m && x < r[2] + m && z > r[1] - m && z < r[3] + m;
/** `r` less `c`: up to four rectangles. */
function minus(r: Rect, c: Rect): Rect[] {
  if (c[0] >= r[2] || c[2] <= r[0] || c[1] >= r[3] || c[3] <= r[1]) return [r];
  const out: Rect[] = [];
  if (c[1] > r[1]) out.push([r[0], r[1], r[2], c[1]]);
  if (c[3] < r[3]) out.push([r[0], c[3], r[2], r[3]]);
  const z0 = Math.max(r[1], c[1]), z1 = Math.min(r[3], c[3]);
  if (c[0] > r[0]) out.push([r[0], z0, c[0], z1]);
  if (c[2] < r[2]) out.push([c[2], z0, r[2], z1]);
  return out;
}
const less = (rs: Rect[], cs: Rect[]) => cs.reduce((acc, c) => acc.flatMap((r) => minus(r, c)), rs);
/** Runs of a … e (step 1 m) where `ok` holds. */
function runs(a: number, e: number, ok: (u: number) => boolean): [number, number][] {
  const out: [number, number][] = [];
  let s: number | null = null;
  for (let u = a; u < e - 1e-6; u += 1) {
    const good = ok(Math.min(u + 0.5, e));
    if (good && s === null) s = u;
    if (!good && s !== null) { out.push([s, u]); s = null; }
  }
  if (s !== null) out.push([s, e]);
  return out;
}

/**
 * What the fill (tsumugibashi-street.ts, stage 3) builds round: every street with its pavements, the lanes,
 * the avenue's whole section, the water with its quays, and the streets that run on past the edge.
 */
export const CANAL_GEOM = {
  x0: CANAL_PLOT.x0, x1: CANAL_PLOT.x1,
  roads: [
    ...STREETS.map((s): Rect => { const p = s.pave > 0 ? s.pave : 0.3, [x0, z0, x1, z1] = carriageOf(s); return s.ax === 'x' ? [x0, z0 - p, x1, z1 + p] : [x0 - p, z0, x1 + p, z1]; }),
    ...LANES,
  ] as Rect[],
  water: [...WATER.map(([x0, z0, x1, z1]): Rect => [x0 - 3.2, z0 - 3.2, x1 + 3.2, z1 + 3.2]), [72.5, -CANAL_PLOT.northWest, CANAL.x1 + 0.5, CANAL_PLOT.z1]] as Rect[],
  runOn: STREETS.flatMap((s) => (s.out ?? []).map((k) => ({ ax: s.ax, c: s.c, half: s.half, pave: s === STREETS[0] ? s.pave : Math.max(s.pave, 1.5), k, kind: s.kind }))),
};

/**
 * An azalea bed with a stone kerb, from u0 to u1 along x at z (or along z at x = c with `alongZ`): the planting
 * under the avenues' trees (owner, 2026-11-26).
 */
export function azaleaBed(b: Builder, u0: number, u1: number, c: number, w = 1.5, alongZ = false) {
  const R = (mat: string, a: number, e: number, hw: number, y0: number, y1: number) => (alongZ ? b.deco(mat, c - hw, y0, a, c + hw, y1, e) : b.deco(mat, a, y0, c - hw, e, y1, c + hw));
  R(STONE_DK, u0, u1, w / 2, GY, GY + 0.14);
  R('flat:#4a3f33', u0 + 0.12, u1 - 0.12, w / 2 - 0.12, GY + 0.14, GY + 0.16);
  const n = Math.max(1, Math.floor((u1 - u0 - 0.3) / 1.8));
  for (let i = 0; i < n; i++) {
    const u = (u0 + u1) / 2 + (i - (n - 1) / 2) * 1.8;
    if (alongZ) b.with({ rot: 1, t: [c, 0, u] }, () => modelTree(b, 'azalea', 0, 0, i % 2 ? 'a' : 'b', GY + 0.1));
    else modelTree(b, 'azalea', u, c, i % 2 ? 'a' : 'b', GY + 0.1);
  }
}
const GRANITE = 'tile:#6f675b', TACTILE = 'flat:#e3b21c';

/** `extra`: holes the caller's pieces need in the ground (exit wells, Tsumugi-bori between z ±150, its stairs). */
export function canalTown(b: Builder, name: { ja: string; en: string }, extra: Rect[]) {
  const P = CANAL_PLOT;
  b.out.plot = { x: P.x1, z: P.z1, north: P.north, arms: [[P.x0, -P.northWest, -P.x1, P.z1], DECK_Y, DECK_W] };
  const plotN = (x: number) => (x < P.step ? -P.northWest : -P.north);

  // ── The river inside the plot: the bank stepped every 25 m ──
  const bank: { x0: number; x1: number; z: number }[] = [];
  for (let x = P.x0; x < P.x1; x += 25) bank.push({ x0: x, x1: x + 25, z: bankStep(x + 12.5) });
  const river: Rect[] = bank.map((s) => [s.x0, -P.northWest, s.x1, s.z]);
  const tsumugiN: Rect = [CANAL.x0, Math.round(bankAt(92)) - 1, CANAL.x1, -150];
  const water: Rect[] = [...WATER, tsumugiN, ...river];
  const wet = (x: number, z: number) => water.some((r) => inR(r, x, z)) || (inR([CANAL.x0, -150, CANAL.x1, 150], x, z) && Math.abs(z) > 38);
  const decks = [...DECKS, [DECK_Y[0], -P.northWest, DECK_Y[2], -400] as Rect, [DECK_W[0], -P.northWest, DECK_W[2], -400] as Rect];
  const onDeck = (x: number, z: number) => decks.some((r) => inR(r, x, z, 0.01)) || RAIL_GAPS.some((r) => inR(r, x, z));
  const holes = less(water, decks);

  // ── The avenue's side lanes (none at the wide crossings, the bridge or the station square), and the gaps into them ──
  const sideCuts: Record<1 | -1, [number, number][]> = { [-1]: [[-302.5, -277.5], [-24, 24], [69.5, 138.5]], 1: [[-302.5, -277.5], [-24, 138.5]] } as Record<1 | -1, [number, number][]>;
  const side: Rect[] = [], merges: Rect[] = [], sideSpans: Record<1 | -1, [number, number][]> = { [-1]: [], 1: [] } as Record<1 | -1, [number, number][]>;
  for (const s of [-1, 1] as const) {
    let a = P.x0;
    for (const [c0, c1] of [...sideCuts[s], [P.x1, P.x1] as [number, number]]) {
      if (c0 - a > 14) {
        const x0 = a === P.x0 ? a : a + 1.5, x1 = c0 === P.x1 ? c0 : c0 - 1.5;
        side.push(s > 0 ? [x0, AV.sep, x1, AV.svc] : [x0, -AV.svc, x1, -AV.sep]);
        sideSpans[s].push([x0, x1]);
        if (a !== P.x0) merges.push(s > 0 ? [x0, AV.rw, x0 + 8, AV.sep] : [x0, -AV.sep, x0 + 8, -AV.rw]);
        if (c0 !== P.x1) merges.push(s > 0 ? [x1 - 8, AV.rw, x1, AV.sep] : [x1 - 8, -AV.sep, x1, -AV.rw]);
      }
      a = c1;
    }
  }
  const carr: Rect[] = [...STREETS.map(carriageOf), ...side, ...merges, TAXI];
  const onRoad = (x: number, z: number, m = 0) => carr.some((r) => inR(r, x, z, m));

  // ── Ground ──
  const all: Rect = [P.x0, -P.northWest, P.x1, P.z1], offPlot: Rect = [P.step, -P.northWest, P.x1, -P.north];
  const cut = [...extra, ...holes, offPlot];
  b.slab('asphalt', all[0], all[1], all[2], all[3], -0.6, 0, cut);
  b.slab('paver', all[0], all[1], all[2], all[3], 0, GY, [...cut, ...carr]);
  for (const d of [DECK_Y, DECK_W]) {
    const z1 = d === DECK_Y ? -P.north : -P.northWest, half = d === DECK_Y ? 10 : 3.5, xc = (d[0] + d[2]) / 2;
    b.slab('asphalt', d[0], d[1], d[2], z1, -0.9, 0, []);
    b.slab('paver', d[0], d[1], d[2], z1, 0, GY, [[xc - half, d[1], xc + half, z1]]);
  }
  b.zone('street', P.x0, -0.3, DECK_Y[1], P.x1, 80, P.z1, `${name.ja}駅前`, `${name.en} — street level`);
  // The plot's edge.
  b.block(P.x0 - 1, -4, -P.northWest - 1, P.x0, 60, P.z1 + 1);
  b.block(P.x0, -4, P.z1, P.x1, 60, P.z1 + 1);
  b.block(P.x1, -4, -P.north - 1, P.x1 + 1, 60, P.z1 + 1);
  for (const [x0, x1] of [[P.x0, DECK_W[0]], [DECK_W[2], P.step]]) b.block(x0, -4, -P.northWest - 1, x1, 60, -P.northWest);
  b.block(P.step - 1, -4, -P.northWest, P.step, 60, -P.north);
  for (const [x0, x1] of [[P.step, DECK_Y[0]], [DECK_Y[2], P.x1]]) b.block(x0, -4, -P.north - 1, x1, 60, -P.north);
  b.block(DECK_W[0], -4, DECK_W[1] - 0.6, DECK_W[2], 60, DECK_W[1]);

  b.open(() => {
    // ── Water: the branch canal, Tsumugi-bori's north reach with its walks, the river ──
    for (const r of [...WATER, ...river.map((r, k): Rect => [r[0], plotN(bank[k].x0 + 1), r[2], r[3]])]) b.box('water', r[0], -3.4, r[1], r[2], -2.8, r[3], false);
    for (const d of [DECK_Y, DECK_W]) {
      const xc = (d[0] + d[2]) / 2, north = bankAt(xc) - 80;
      b.box('water', d[0], -3.4, north, d[2], -2.8, d === DECK_Y ? -P.north : -P.northWest, false);
      b.box(STONE_DK, d[0], -3.4, d[1], d[2], -0.9, north);
      // Plain piers, and the parapets (the plot's edge along the deck).
      // (Yanagi-suji's bridge is 澪大橋: its stonework is a model, tsumugi-land.ts, and it is walked through to Kita-Ōdōri.)
      const grand = d === DECK_Y;
      if (!grand) for (const t of [0.3, 0.62]) b.box(STONE_DK, d[0], -3.4, bankAt(xc) - 80 * t - 1.2, d[2], -0.9, bankAt(xc) - 80 * t + 1.2);
      for (const x of [d[0], d[2] - 0.4]) {
        b.block(x - 0.3, -1, d[1], x + 0.7, GY + 1.2, bankAt(xc));
        if (!grand) b.deco(STONE, x, GY, d[1], x + 0.4, GY + 1.0, Math.round(bankAt(xc)));
        else b.deco(STONE, x, GY, d[1], x + 0.4, GY + 1.0, bankAt(xc) - 80.5 - 3.4);
      }
      if (grand) continue;
      b.block(d[0], GY, d[1], d[2], GY + 1.2, d[1] + 0.4);
      b.deco(STONE, d[0], GY, d[1], d[2], GY + 1.0, d[1] + 0.4);
    }
    {
      const [x0, z0, x1, z1] = tsumugiN;
      b.box('water', CANAL.w0, -3.4, -P.north, CANAL.w1, -2.8, z1, false);
      for (const [xa, xc] of [[x0, CANAL.w0], [CANAL.w1, x1]]) b.box('tile:#b9ab92', xa, CANAL.prom - 0.4, z0, xc, CANAL.prom, z1);
      for (const ex of [CANAL.w0, CANAL.w1]) b.block(ex - 0.06, CANAL.prom, z0, ex + 0.06, CANAL.prom + 1.1, z1);
      for (const [xa, xc] of [[x0, CANAL.w0], [CANAL.w1, x1]]) b.block(xa, CANAL.prom, z0 - 0.1, xc, CANAL.prom + 1.1, z0 + 0.1);
      // The west wall leaves the branch canal's mouth open; no rail across the riverside street's deck.
      b.box(STONE_DK, x0 - 0.4, CANAL.prom - 0.4, z0, x0 + 0.02, GY, -164);
      b.box(STONE_DK, x1 - 0.02, CANAL.prom - 0.4, z0, x1 + 0.4, GY, z1);
      for (const [xa, xc, zs] of [[x0 - 0.4, x0 + 0.02, [[z0, MOUTH_T[1]], [MOUTH_T[3], -347.5], [-332.5, -164]]], [x1 - 0.02, x1 + 0.4, [[z0, MOUTH_T[1]], [MOUTH_T[3], -347.5], [-332.5, z1]]]] as [number, number, [number, number][]][]) {
        for (const [p, q] of zs) {
          b.block(xa, GY, p, xc, GY + 1.1, q);
          b.deco(STONE, xa, GY, p, xc, GY + 1.0, q);
        }
      }
    }
    // Quay walls wherever water meets ground, a stone parapet on top except under a deck; parapets along the decks.
    const wall = (r: Rect, withRail: boolean) => {
      b.box(STONE_DK, r[0], -3.4, r[1], r[2], GY, r[3]);
      if (!withRail) return;
      b.block(r[0], GY, r[1], r[2], GY + 1.1, r[3]);
      b.deco(STONE, r[0], GY, r[1], r[2], GY + 0.75, r[3]);
    };
    const T = 0.4;
    for (const r of [...WATER, ...river]) {
      for (const [z, o] of [[r[1], -1], [r[3], 1]] as [number, 1 | -1][]) {
        for (const rail of [true, false]) for (const [p, q] of runs(r[0], r[2], (x) => !wet(x, z + o * 0.3) && z + o * 0.3 > plotN(x) && onDeck(x, z - o * 0.3) !== rail)) wall([p, Math.min(z, z - o * T), q, Math.max(z, z - o * T)], rail);
      }
      for (const [x, o] of [[r[0], -1], [r[2], 1]] as [number, 1 | -1][]) {
        if (x <= P.x0 || x >= P.x1) continue;
        for (const rail of [true, false]) for (const [p, q] of runs(r[1], r[3], (z) => !wet(x + o * 0.3, z) && z > plotN(x + o * 0.3) && onDeck(x - o * 0.3, z) !== rail)) wall([Math.min(x, x - o * T), p, Math.max(x, x - o * T), q], rail);
      }
    }
    for (const d of DECKS) {
      // (A deck over a leg that runs east–west has its parapets on its west and east sides; over a north–south leg, north and south.)
      const overEW = WATER.some((w) => w[2] - w[0] > w[3] - w[1] && inR(w, (d[0] + d[2]) / 2, (d[1] + d[3]) / 2, 0.5));
      if (d === MOUTH_K || d === MOUTH_T) { for (const z of [d[1], d[3] - 0.3]) b.block(d[0], GY, z, d[2], GY + 1.1, z + 0.3); continue; }
      if (overEW) for (const x of [d[0], d[2] - 0.3]) { b.block(x, GY, d[1], x + 0.3, GY + 1.1, d[3]); b.deco(STONE, x, GY, d[1], x + 0.3, GY + 1.0, d[3]); }
      else for (const z of [d[1], d[3] - 0.3]) { b.block(d[0], GY, z, d[2], GY + 1.1, z + 0.3); b.deco(STONE, d[0], GY, z, d[2], GY + 1.0, z + 0.3); }
    }
  });

  // ── Paint: centre lines, side lines, building-line marks, the avenue's lanes, crosswalks ──
  const others = (s: St) => carr.filter((r) => r !== carr[STREETS.indexOf(s)]);
  const lineAlong = (s: St, off: number, w: number, mat: string, dash: boolean, clear: number, y = 0.004) => {
    const rest = others(s);
    for (let u = s.a0; u < s.a1 - 0.5; u += dash ? 6 : 2) {
      const e = Math.min(s.a1, u + (dash ? 3 : 2)), m = (u + e) / 2;
      const [x, z] = s.ax === 'x' ? [m, s.c + off] : [s.c + off, m];
      if (rest.some((r) => inR(r, x, z, clear)) || (y > 0.1 && (onRoad(x, z) || wet(x, z)))) continue;
      if (s.ax === 'x') b.deco(mat, u, y, z - w / 2, e, y + 0.006, z + w / 2);
      else b.deco(mat, x - w / 2, y, u, x + w / 2, y + 0.006, e);
    }
  };
  for (const s of STREETS) {
    if (s.kind === 'small') for (const k of [-1, 1]) lineAlong(s, k * (s.half - 0.5), 0.1, WHITE, false, 0.3);
    else if (s.kind === 'two') lineAlong(s, 0, 0.14, WHITE, true, 3);
    else {
      lineAlong(s, 0, 0.16, YELLOW, false, 6);
      for (const k of [-1, 1]) lineAlong(s, (k * s.half) / 2, 0.14, WHITE, true, 6);
    }
    // Where the buildings will stand: a fine line at the back of the pavement (stage 2a only; the fill covers it).
    if (s.pave > 0) for (const k of [-1, 1]) lineAlong(s, k * (s.half + s.pave), 0.12, 'flat:#8e877a', false, 0.2, GY);
  }
  for (const s of [-1, 1] as const) {
    for (const [x0, x1] of sideSpans[s]) for (let x = x0; x < x1; x += 2) {
      const z = s * (AV.sep + 0.5);
      if (!merges.some((r) => inR(r, x + 1, z, 0.5))) b.deco(WHITE, x, 0.004, z - 0.05, Math.min(x1, x + 2), 0.01, z + 0.05);
    }
  }
  for (const [x0, z0, x1, z1] of LANES) {
    for (const [p, q] of x1 - x0 > z1 - z0 ? runs(x0, x1, (x) => !onRoad(x, (z0 + z1) / 2) && !wet(x, (z0 + z1) / 2)) : runs(z0, z1, (z) => !onRoad((x0 + x1) / 2, z) && !wet((x0 + x1) / 2, z))) {
      if (x1 - x0 > z1 - z0) b.deco('tile:#a89f8d', p, GY, z0, q, GY + 0.006, z1);
      else b.deco('tile:#a89f8d', x0, GY, p, x1, GY + 0.006, q);
    }
  }
  // Crosswalks: across every street where it meets a two-lane or wide one, in line with that one's pavement.
  for (const a of STREETS) for (const m of STREETS) {
    const reach = m === STREETS[0] ? AV.strip : m.half;
    if (a.ax === m.ax || m.kind === 'small' || m.c < a.a0 - reach - 1 || m.c > a.a1 + reach + 1 || a.c < m.a0 - 0.1 || a.c > m.a1 + 0.1) continue;
    for (const k of [-1, 1]) {
      const u0 = m.c + k * (reach + 0.8), u1 = m.c + k * (reach + 3.8), lo = Math.min(u0, u1), hi = Math.max(u0, u1);
      if (lo < a.a0 || hi > a.a1) continue;
      const mid: [number, number] = a.ax === 'x' ? [(lo + hi) / 2, a.c] : [a.c, (lo + hi) / 2];
      if (wet(mid[0], mid[1])) continue;
      for (let v = -a.half + 0.4; v + 0.45 <= a.half - 0.3; v += 0.9) {
        if (a.ax === 'x') b.deco(WHITE, lo, 0.004, a.c + v, hi, 0.011, a.c + v + 0.45);
        else b.deco(WHITE, a.c + v, 0.004, lo, a.c + v + 0.45, 0.011, hi);
      }
    }
  }

  // ── Lamps down every street; ginkgo in two rows down each side of the avenue ──
  for (const s of STREETS) {
    const big = s.kind !== 'small', off = s.half + (s.pave > 0 ? 0.8 : 0.45);
    for (let u = s.a0 + 9, k = 0; u < s.a1 - 4; u += big ? 30 : 26, k++) {
      const sd = k % 2 ? 1 : -1, [x, z] = s.ax === 'x' ? [u, s.c + sd * off] : [s.c + sd * off, u];
      if (s === STREETS[0] || poled(s) || onRoad(x, z, 1.2) || wet(x, z) || !inPlotRect(x, z) || extra.some((r) => inR(r, x, z, 0.8))) continue;
      if (decks.some((r) => inR(r, x, z, 1))) continue;
      roadModel(b, big ? 'lamp_led' : 'lamp_small', x, GY, z, s.ax === 'x' ? [0, -sd] : [-sd, 0]);
    }
  }
  function inPlotRect(x: number, z: number) { return x > P.x0 + 1 && x < P.x1 - 1 && z < P.z1 - 1 && z > bankAt(x) + 2; }
  let tn = 0;
  for (const s of [-1, 1] as const) {
    const last = new Map<boolean, number>();
    for (let x = P.x0 + 5; x < P.x1 - 3; x += 9) {
      for (const [z, lane] of [[s * (AV.rw + AV.sep) / 2, true], [s * (AV.svc + AV.strip) / 2, false]] as [number, boolean][]) {
        const free = sideSpans[s].some(([p, q]) => x > p + (lane ? 10 : 2) && x < q - (lane ? 10 : 2));
        if (!free || onRoad(x, z, 1.5) || extra.some((r) => inR(r, x, z, 2)) || (lane && BUS_STOPS.some((q) => q.s === s && Math.abs(x - q.x) < 9.5))) continue;
        modelTree(b, 'ginkgo', x, z, tn++ % 3 ? 'a' : 'b', GY, true);
        // Azalea between two trees of a row (not where an exit, a crossing or a bus stop breaks the row).
        if (last.get(lane) === x - 9 && !extra.some((r) => inR(r, x - 4.5, z, 4))) azaleaBed(b, x - 9 + 1.6, x - 1.6, z);
        last.set(lane, x);
      }
    }
    // The pavement's stone: a dark band at every tree bay, a dark strip along the building line, the tactile line.
    const sq = (x: number) => s > 0 && x > 16 && x < 72.5;
    const clear = (x: number, z: number, m: number) => !onRoad(x, z, m) && !wet(x, z) && !sq(x) && !extra.some((r) => inR(r, x, z, 0.4));
    for (let x = P.x0 + 5; x < P.x1 - 3; x += 9) if (clear(x, s * 32, 0.6) && clear(x, s * 29, 0.6) && clear(x, s * 35.5, 0.6)) b.deco(GRANITE, x - 0.2, GY, Math.min(s * AV.strip, s * AV.front), x + 0.2, GY + 0.004, Math.max(s * AV.strip, s * AV.front));
    for (const [p, q] of runs(P.x0, P.x1, (x) => clear(x, s * (AV.front - 0.3), 0.2))) b.deco(GRANITE, p, GY, Math.min(s * (AV.front - 0.6), s * AV.front), q, GY + 0.005, Math.max(s * (AV.front - 0.6), s * AV.front));
    for (const [p, q] of runs(P.x0, P.x1, (x) => clear(x, s * 32, 0.2))) b.deco(TACTILE, p, GY, s * 32 - 0.15, q, GY + 0.006, s * 32 + 0.15);
    for (let x = P.x0 + 14; x < P.x1 - 6; x += 30) {
      const z = s * (AV.strip + 0.7);
      if (sideSpans[s].some(([p, q]) => x > p + 3 && x < q - 3) && !onRoad(x, z, 1.5) && !extra.some((r) => inR(r, x, z, 2.5))) roadModel(b, 'lamp_shop', x, GY, z, [0, -s]);
    }
  }

  // ── Past the edge: every street that reaches it runs on 150 m (kerbs, paint, lamps; the rows are stage 3) ──
  const m0 = b.out.models.length;
  for (const s of STREETS) for (const k of s.out ?? []) {
    const OUT = s === STREETS[0] && k > 0 ? AV_EAST : 150;
    const lim = s.ax === 'x' ? (k > 0 ? P.x1 : P.x0) : P.z1, u0 = k > 0 ? lim : lim - OUT, u1 = u0 + OUT;
    const R = (mat: string, v0: number, v1: number, y0: number, y1: number, a = u0, e = u1) => (s.ax === 'z' ? b.deco(mat, s.c + v0, y0, a, s.c + v1, y1, e) : b.deco(mat, a, y0, s.c + v0, e, y1, s.c + v1));
    R('asphalt', -s.half, s.half, -0.03, 0.004);
    const pave = Math.max(s.pave, 1.5);
    const av = s === STREETS[0];
    if (!av) for (const q of [-1, 1]) R('paver', Math.min(q * s.half, q * (s.half + pave)), Math.max(q * s.half, q * (s.half + pave)), -0.03, GY);
    else for (const q of [-1, 1]) {
      // The avenue keeps its whole section past the edge: separator, side lane, tree strip, pavement, with the
      // ginkgo in two rows, the azalea under them and the pavement's bands (owner, 2026-11-26).
      const V = (mat: string, a: number, e: number, y0: number, y1: number, ua = u0, ue = u1) => R(mat, Math.min(q * a, q * e), Math.max(q * a, q * e), y0, y1, ua, ue);
      V('paver', AV.rw, AV.sep, -0.03, GY);
      V('asphalt', AV.sep, AV.svc, -0.03, 0.004);
      V(WHITE, AV.sep + 0.45, AV.sep + 0.55, 0.004, 0.01);
      V('paver', AV.svc, AV.front, -0.03, GY);
      V(GRANITE, AV.front - 0.6, AV.front, GY, GY + 0.005);
      b.deco(TACTILE, u0, GY, q * 32 - 0.15, u1, GY + 0.006, q * 32 + 0.15);
      for (let u = u0 + 6, j = 0; u < u1 - 3; u += 9, j++) {
        V(GRANITE, AV.strip, AV.front, GY, GY + 0.004, u - 0.2, u + 0.2);
        for (const z of [q * (AV.rw + AV.sep) / 2, q * (AV.svc + AV.strip) / 2]) {
          modelTree(b, 'ginkgo', u, z, j % 3 ? 'a' : 'b', GY, true);
          if (j) azaleaBed(b, u - 9 + 1.6, u - 1.6, z);
        }
      }
    }
    if (s.kind === 'wide') R(YELLOW, -0.08, 0.08, 0.004, 0.01);
    for (let u = u0 + 2; u + 3 < u1; u += 6) {
      if (s.kind === 'wide') for (const q of [-1, 1]) R(WHITE, (q * s.half) / 2 - 0.07, (q * s.half) / 2 + 0.07, 0.004, 0.01, u, u + 3);
      else if (s.kind === 'two') R(WHITE, -0.07, 0.07, 0.004, 0.01, u, u + 3);
    }
    if (s.kind === 'small') for (const q of [-1, 1]) R(WHITE, q * (s.half - 0.5) - 0.05, q * (s.half - 0.5) + 0.05, 0.004, 0.01);
    for (let u = u0 + 12, j = 0; u < u1 - 6; u += 28, j++) {
      const sd = j % 2 ? 1 : -1, v = sd * (s.half + 0.8);
      const [x, z] = s.ax === 'z' ? [s.c + v, u] : [u, s.c + v];
      roadModel(b, s.kind === 'small' ? 'lamp_small' : 'lamp_led', x, GY, z, s.ax === 'z' ? [-sd, 0] : [0, -sd]);
    }
    const w = s.half + pave + 2;
    if (s.ax === 'z') b.clearScenery(s.c - w, u0, s.c + w, u1);
    else b.clearScenery(u0, s.c - w, u1, s.c + w);
  }
  for (let k = m0; k < b.out.models.length; k++) if (b.out.models[k].kind === 'road') b.out.models[k].merge = true;
}
