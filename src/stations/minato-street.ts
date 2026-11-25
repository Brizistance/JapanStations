// The streets of Kawaminato-kō (川湊港), the redeveloped brick port (rebuilt 2026-11; the owner's rules are
// in docs/street-design.md, the procedure in docs/station-playbook.md). After a Meiji–Taishō port whose
// bonded warehouses and customs house now hold shops, with a ferry terminal on the quay and the old
// shipping town's lanes behind the harbour boulevard.
//
// Frame: +x east (along the Nagisa Line and the boulevard), +z south (the sea); the Kikyō Line runs under x = 0.
//
//   z −9 … 9     湊浦通 Minatoura-dōri, the harbour boulevard: four lanes, 10.5 m pavements to ±19.5 with
//                the metro's exits 1–4 (x ±42 … 50.86). Runs on east to 湊浦橋 Minatoura-bashi over the inlet.
//   z −53.25 … −46.75  綱町通 Tsunamachi-dōri, the back street (6.5 m, no pavements)
//   z 46 … 52    港のプロムナード, the quay promenade; the sea from z 52 (the quay wall)
//
//   x −78.25 … −71.75  帆柱筋 Hobashira-suji, a 6.5 m small street, from the north edge to the boulevard;
//                south of it a paved way between the warehouses to the quay
//   x 69 … 81    桟橋筋 Sanbashi-suji (two lanes, 4 m pavements to 65 / 85), from the north edge to the
//                boulevard; south of it the pier approach, setts, no cars, to the quay
//
// Lanes (3 m): x ±25 between the boulevard's fronts and the back street; x 0, ±50 north of the back street
// to the plot's edge; x 125 … 130 down the customs house's east flank (税関横丁).
//
// Lot table (each block's four edges; depths add up to the block):
//   NW   x −130 … −78.25, z −46.75 … −19.5: boulevard fronts (14) | back-street row (12.95)
//   N    x −71.75 … 65, same z, cut by the lanes at ±25: boulevard fronts (14) | back-street rows (12.95)
//   NE   x 85 … 125: the old customs house, the whole depth (27); x 125 … 130 its lane
//   far  z −85 … −53.25 (31.75), every stretch between the streets and lanes: rows facing the back street,
//        more behind them to the plot's edge; leftovers() puts the rest to use
//   S    z 19.5 … 46: warehouse No. 1 x −126 … −82 and No. 2 x −68 … −22 (z 22 … 44, the forecourt before and the
//        promenade after); 煉瓦広場 Renga Hiroba x −22 … 8, open to the quay; the ferry terminal x 8 … 62
//        (z 22 … 46; exit 5 rises inside it); the port office x 86 … 130 (z 20 … 46)
//
// Seen only: a breakwater with a red lighthouse and a container wharf with its cranes across the water.
// Signals share one 60 s cycle (traffic/signals.ts): axis 0 every east–west street, axis 1 every north–south one.
// Models: tools/blender/build_minato.py (the landmarks, the bridge), build_minatofront.py (the fronts).

import { linesAt } from '../data/network';
import type { SignContent } from '../signs/content';
import { rng, type LanePart, type SignOpts } from '../world/builder';
import type { Anchor, AnchorPt, Anchors } from './anchors/types';
import { KITACITY } from './anchors/kitacity';
import { MINATO } from './anchors/minato';
import { MINATOFRONT } from './anchors/minatofront';
import { TOSEN } from './anchors/tosen';
import { TSUNA } from './anchors/tsuna';
import { URAFRONT } from './anchors/urafront';
import { KONBINI, konbini } from './konbini';
import { GROUND_Y as GY, ceilingLight, vending, type Ctx } from './kit';
import { kerbGaps, kerbRail, pedSignal, poleLine, roadKit, roadModel, roadSign, shortSignal, streetLamp, trafficLane, vehicleSignal } from './roads';
import type { SurfaceSpec } from './surface';
import { crosswalk, fillModelLots } from './surface';
import { modelTree, type TreeKind } from './trees';
import { leftovers } from './tsumugibashi-street';
import { SHORE } from './shore';
import { AVE_X, aveX, ends as northEnds, northLanes, stopsFor, street as northStreet } from './north-roads';
import { paveSlab } from './poly';
import { terminalHall } from './terminal';
import { ATRIUM } from './exits';

type Rect = [number, number, number, number];
type Face = 'n' | 's' | 'e' | 'w';
type Named = { ja: string; en: string };

/** Half extents of the plot (as the stock street's, world/builder.ts DEFAULT_PLOT). */
export const MINATO_PLOT = { x: 130, z: 85 };
const X = MINATO_PLOT.x, Z = MINATO_PLOT.z;
/** The boulevard's half width and its building line (the exits are fitted to it). */
export const RW = 9, FRONT = 19.5;
/** The quay wall (the sea beyond: geography.ts's port landfill ends here) and the promenade's landward edge. */
export const SEA = 52, PROM = 46;
interface NS { c: number; half: number; pave: number; name: Named }
// (Re-laid 2026-11-24 after Aizomechō: Hobashira-suji two lanes with pavements, Tsunamachi-dōri a two-lane back street with pavements at z −54.)
const HOB: NS = { c: -75, half: 4.5, pave: 2.5, name: { ja: '帆柱筋', en: 'Hobashira-suji' } };
const SAN: NS = { c: 75, half: 6, pave: 4, name: { ja: '桟橋筋', en: 'Sanbashi-suji' } };
const TSU = { z: -54, half: 4.5, pave: 2.5, name: { ja: '綱町通', en: 'Tsunamachi-dōri' }, short: { ja: '綱町', en: 'Tsunamachi' } };
/** Tsunamachi-dōri's carriageway (z) and its building lines either side, past its pavements. */
const TSU_C0 = TSU.z - TSU.half, TSU_C1 = TSU.z + TSU.half; // −58.5 … −49.5
const BACK0 = TSU_C1 + TSU.pave; // −47: the front blocks' far edge
const BACK1 = TSU_C0 - TSU.pave; // −61: the north band's front
/** North of the boulevard: 唐船大路's mouth, the one break in the fronts between the cross streets (x range). */
const LANE_N: [number, number][] = [[-6, 6]];
// (The middle one is 唐船大路 Tōsen-ōji's start, 12 m wide: Tōsen-machi's food street, tosen-street.ts, from 2026-11-24.)
const LANE_F: [number, number][] = [[-52, -48], [-6, 6], [48, 52]]; // (4 m: no fronts closer, 2026-11-24)
const ZEIKAN_LANE: [number, number] = [125.2, 130];
/** The south side's lots: the warehouses, the plaza, the terminal, the port office (x0, x1). */
const RENGA1: [number, number] = [-126, -82], RENGA2: [number, number] = [-68, -22], HIROBA: [number, number] = [-22, 8];
const TERM = { x0: 8, x1: 62, z0: 22, z1: 46 };
/** The warehouses' fronts (their iron stair towers stand 2.6 m out on the forecourt, clear of the pavement). */
const RZ = 22.2;
const KOWAN: [number, number] = [86, 130];
/**
 * East along the boulevard to Minatoura-bashi (2026-11-24): the far quay and the inlet are drawn in Aizomechō's
 * frame (shore.ts), AIZ east of this one. The quay's buildings' fronts, its road and apron, the quay edge where
 * the bridge begins, and the arm's end in the middle of the bridge (Kon'yahama's world walks the rest).
 */
const AIZ = 750;
const QUAY = { front: SHORE.far - 29 + AIZ, road: SHORE.far - 27 + AIZ, apron: SHORE.far - 15 + AIZ, edge: SHORE.far + AIZ };
const ARM = 470;
/** Where the boulevard's vehicles move between this street and Aizomechō's (world x 762, on the quay past the quay road: aizomecho-street.ts HAND_X; moved from 600 for Hokage-ōdōri, 2026-11-24). */
const HAND_X = 442;
/** The bridge's carriageway half width and its deck's (konyahama-street.ts BR_RW, BR_W). */
const BR_RW = 7, BR_W = MINATO.bridge.d / 2;
const WHITE = 'flat:#e9e9e4', YELLOW = 'flat:#e6a700', SETT = 'tile:#77716a', LANE = 'tile:#857e73', BOARD = 'wood:#8a6a4c', STONE = 'flat:#9a9488';
const FRAME: Record<Face, { rot?: 0 | 1 | 2 | 3 }> = { n: {}, s: { rot: 2 }, e: { rot: 1 }, w: { rot: 3 } };
const bl = (s: NS): [number, number] => [s.c - s.half - s.pave, s.c + s.half + s.pave];
const SL = 5.2;

/** The stretches of [u0, u1] between the corridors. */
function between(corridors: [number, number][], u0 = -X, u1 = X): [number, number][] {
  const out: [number, number][] = [];
  let from = u0;
  for (const [a, e] of [...corridors].sort((p, q) => p[0] - q[0])) {
    if (a > from) out.push([from, Math.min(a, u1)]);
    from = Math.max(from, e);
  }
  if (from < u1) out.push([from, u1]);
  return out.filter(([a, e]) => e - a > 0.5);
}
/** A rectangle less another inside it, as up to four rectangles. */
function less(r: Rect, h: Rect): Rect[] {
  if (h[0] >= r[2] || h[2] <= r[0] || h[1] >= r[3] || h[3] <= r[1]) return [r];
  const out: Rect[] = [];
  if (h[1] > r[1]) out.push([r[0], r[1], r[2], h[1]]);
  if (h[3] < r[3]) out.push([r[0], h[3], r[2], r[3]]);
  const z0 = Math.max(r[1], h[1]), z1 = Math.min(r[3], h[3]);
  if (h[0] > r[0]) out.push([r[0], z0, h[0], z1]);
  if (h[2] < r[2]) out.push([h[2], z0, r[2], z1]);
  return out;
}

// ── Names (invented and web-checked; docs/worldbuilding.md) ──
type Style = 'stone' | 'brick' | 'kaiun' | 'chandler' | 'ribbon' | 'hotel' | 'tower';
const styleOf = (id: string) => id.split('_')[0] as Style;
const NAMES: Record<Style, [string, string][]> = {
  stone: [['旧川湊貿易商館', 'Old Kawaminato Trading House'], ['湊浦銀行', 'Minatoura Bank']],
  brick: [['汐見海運ビルヂング', 'Shiomi Kaiun Building'], ['帆布会館', 'Sailcloth Hall'], ['帆影倉庫 本社', 'Hokage Warehousing HQ']],
  kaiun: [['湊浦汽船', 'Minatoura Steamship'], ['鴎丸海運', 'Kamomemaru Line']],
  chandler: [['船具 いかり屋', 'Ikariya Ship Chandler'], ['ロープと帆 浜田', 'Hamada Rope & Sail'], ['海図 なみじ堂', 'Namijidō Charts'], ['船食 しおさい', 'Shiosai Ship Provisions']],
  ribbon: [['川湊港湾ビル', 'Kawaminato Harbour Bldg.'], ['湊浦トレードセンター', 'Minatoura Trade Centre']],
  hotel: [['ホテル 船乗り', 'Hotel Funanori']],
  tower: [['ハーバータワー 川湊', 'Harbour Tower Kawaminato'], ['湊浦スクエア', 'Minatoura Square']],
};
const BOARDS: Record<Style, [string, string]> = {
  stone: ['#2a2622', '#e8d9b0'], brick: ['#2a2622', '#efe6cf'], kaiun: ['#1d3550', '#ffffff'], chandler: ['#f4f1e8', '#1d3550'],
  ribbon: ['#1f2023', '#ffffff'], hotel: ['#1f2023', '#ffffff'], tower: ['#1f2023', '#ffffff'],
};

export function minatoStreet(c: Ctx, spec: SurfaceSpec, cw: number, dir: [number, number]) {
  const { b } = c;
  const st = c.station;
  if (Math.abs(cw + 5.5 - FRONT) > 0.01) throw new Error(`minatoStreet: Minatoura-dōri's building line moved (${cw + 5.5}); the exits are fitted to ${FRONT}`);
  const seed = spec.seed;
  const r = rng(seed);
  const lines = linesAt(st.id).map((l) => l.id);
  const stName: Named = { ja: st.nameJa, en: st.nameRomaji };
  // (The arm: the boulevard and its pavements out to the middle of Minatoura-bashi.)
  b.out.plot = { ...MINATO_PLOT, arms: [[X - 1, -FRONT, ARM, FRONT], [X - 1, FRONT, QUAY.front, SEA]] };
  const holes: Rect[] = b.out.holes.map((q) => [...q] as Rect);
  // (The lift's shaft from the harbour gates' lobby comes up into the ferry terminal: atrium.ts.)
  holes.push([...ATRIUM.lift]);
  const nearHole = (x: number, z: number, m: number) => holes.some((q) => x > q[0] - m && x < q[2] + m && z > q[1] - m && z < q[3] + m);
  const clearOf = (u: number, spans: [number, number][], m = 0) => !spans.some(([p, q]) => u > p - m && u < q + m);

  const at = (face: Face, x: number, z: number, fn: () => void) => b.with({ ...FRAME[face], t: [x, 0, z] }, fn);
  const signAt = (p: AnchorPt, content: SignContent, o?: SignOpts) => b.sign(content, p[0], p[1] + GY, p[2], [p[5], p[6]], p[3], p[4], o);
  const label = (p: AnchorPt, text: string, sub: string | undefined, bg: string, fg: string) => signAt(p, { k: 'label', text, sub, fg, bg });
  const upright = (p: AnchorPt, ja: string, bg: string, fg = '#ffffff') => signAt(p, { k: 'shop', ja, bg, fg, vertical: true });
  /** A one-off model with its front at (x, z) facing `face`, its collider, and whatever the game puts on it. */
  const piece = (kind: string, A: Anchors, id: string, face: Face, x: number, z: number, fn?: (a: Anchor) => void, solid = true) =>
    at(face, x, z, () => {
      const a = A[id];
      b.model(kind, id, 0, GY, 0, 1);
      if (solid) b.block(-a.w / 2, GY, 0, a.w / 2, GY + Math.max(a.h, 3), a.d);
      fn?.(a);
    });
  /** Rows of stock street models packing a rectangle, fronts on its `face` side, each further row behind the last. */
  const fillRect = (x0: number, z0: number, x1: number, z1: number, face: Face, kinds: string[], lo = false) => {
    if (x1 - x0 < 4.6 || z1 - z0 < 4.6) return;
    const [a, e, f0, f1] = face === 'n' ? [x0, x1, z0, z1] : face === 's' ? [-x1, -x0, -z1, -z0] : face === 'e' ? [z0, z1, -x1, -x0] : [-z1, -z0, x0, x1];
    if (e - a < 4.6 || f1 - f0 < 8) return;
    b.with(FRAME[face], () => {
      let z = f0;
      for (let k = 0; k < 6 && f1 - z > 8.5; k++) {
        const lots = fillModelLots(b, r, a, e, z, f1 + 2.01, { noBack: true, kinds, lo, old: true, bare: k > 0 });
        if (!lots.length) break;
        z = Math.max(...lots.map((l) => l[3])) + 0.8;
      }
    });
  };
  const BIZ = ['office', 'zakkyo', 'manshon'], SMALL = ['zakkyo', 'manshon', 'shophouse'], LOW = ['shophouse', 'machi', 'zakkyo'];
  const bike = (x: number, z: number, f: [number, number]) => {
    const d = b.dir(f);
    b.out.models.push({ kind: 'places', id: 'bicycle', pos: b.pt(x, GY, z), yaw: Math.atan2(-d[0], -d[1]), seed: 0, merge: true });
  };
  /** What is not a building and must stay empty: lanes, yards, precincts (leftovers() fills the rest). */
  const reserved: Rect[] = [];
  /** A walkable lane's paving, its drain down the middle, and its name as a place. */
  const lanePave = (x0: number, z0: number, x1: number, z1: number, name?: Named, mat = LANE) => {
    b.deco(mat, x0, GY + 0.002, z0, x1, GY + 0.012, z1);
    if (x1 - x0 > z1 - z0) b.deco('flat:#6f6a60', x0, GY + 0.012, (z0 + z1) / 2 - 0.08, x1, GY + 0.016, (z0 + z1) / 2 + 0.08);
    else b.deco('flat:#6f6a60', (x0 + x1) / 2 - 0.08, GY + 0.012, z0, (x0 + x1) / 2 + 0.08, GY + 0.016, z1);
    reserved.push([x0, z0, x1, z1]);
    if (name) b.zone('street', x0 + 0.3, GY - 0.2, z0 + 0.3, x1 - 0.3, GY + 6, z1 - 0.3, name.ja, name.en, true);
  };

  // ═════════════════════════ Ground, the quay and the sea ═════════════════════════
  const carriage: Rect[] = [
    [-X, -RW, X, RW],
    ...[HOB, SAN].map((s): Rect => [s.c - s.half, -Z, s.c + s.half, -RW]),
    [-X, TSU_C0, X, TSU_C1],
  ];
  const wellHoles: Rect[] = holes.map(([x0, z0, x1, z1]) => [x0 - 0.05, z0 - 0.05, x1 + 0.05, z1 + 0.05]);
  const sea: Rect = [-X, SEA, X, Z];
  b.slab('asphalt', -X, -Z, X, Z, -0.6, 0, [...wellHoles, sea]);
  b.slab('paver', -X, -Z, X, Z, 0, GY, [...wellHoles, sea, ...carriage]);
  b.zone('street', -X, -0.3, -Z, X, 80, SEA - 0.4, `${st.nameJa}駅前`, `${st.nameRomaji} — street level`);
  // The plot's edges: walls round the land, the quay rail along the sea (below).
  b.block(-X - 1, -1, -Z - 1, -X, 60, SEA);
  // (East: open along the boulevard, where the arm goes on, and north of it, where Kita-Hatoba's world goes on: hatoba-street.ts.)
  // (South of the boulevard the arm's park goes on east: stage B, 2026-11-24.)
  // (North: open, Tōsen-machi's plot goes on: tosen-street.ts.)
  b.out.district = { radius: 520, old: [0, -60], oldRadius: 160, towers: 4 };
  // The sea (the backdrop's is cut out of the plot: render/water.ts) and the quay wall.
  b.open(() => b.box('water', -X - 60, -1.6, SEA, X + 60, -1.2, Z + 120, false));
  b.box('concrete', -X, -2, SEA - 0.4, X, GY, SEA);
  b.block(-X, GY, SEA - 0.55, X, GY + 1.1, SEA + 4);

  // ═════════════════════════ Roads ═════════════════════════
  const streetsX: [number, number][] = [[HOB.c - HOB.half, HOB.c + HOB.half], [SAN.c - SAN.half, SAN.c + SAN.half]];
  const zonesAv: [number, number][] = streetsX.map(([a, e]): [number, number] => [a - 9, e + 9]);
  // The boulevard: a yellow centre line and lane lines (the kit paints the junctions' crosswalks and stop lines).
  for (let x = -X; x < X; x += 6) {
    if (!clearOf(x + 1.5, zonesAv)) continue;
    for (const z of [-RW / 2, RW / 2]) b.deco(WHITE, x, 0.004, z - 0.07, x + 3, 0.01, z + 0.07);
    b.deco(YELLOW, x, 0.004, -0.08, x + 6, 0.01, 0.08);
  }
  const lanes0 = b.out.lanes.length;
  // (The west stop clear of Hobashira-suji's wider mouth: a bus pulling out there met its traffic.)
  const busX: [number, number] = [-112, 100], taxiX = 14;
  roadKit(b, {
    X, Z, rw: RW, swOut: FRONT, streets: streetsX, seed, name: stName, at: { id: st.id, dir }, shared: true, lamp: 'lamp_twin', busy: 0.7, taxi: 0.2,
    tee: true, teeNorth: true,
    junctions: [{ ja: '川湊港西', en: 'Kawaminato-kō-nishi' }, { ja: '桟橋前', en: 'Sanbashi-mae' }],
    roads: { main: { ja: '湊浦通', en: 'Minatoura-dōri' }, cross: [HOB.name, SAN.name] },
    flows: [0.4, 0.9], busX, taxiX,
  });
  // East, the boulevard goes on along the arm and over Minatoura-bashi into Aizomechō's Tsumugi-dōri. Half way
  // along the arm (HAND_X) its vehicles move over to Aizomechō's street and back (traffic/street.ts): eastbound
  // they run 20 m past it (one that cannot move over yet); westbound they set out from there only while
  // Aizomechō's street is not running.
  for (const l of b.out.lanes.slice(lanes0)) {
    const dx = l.to[0] - l.from[0], z = l.from[2];
    if (Math.abs(l.to[2] - z) > 0.1 || Math.abs(z) > RW || Math.abs(dx) < 1) continue;
    if (dx > 0 && Math.abs(l.to[0] - X) < 0.5) {
      l.to = [HAND_X + 20, l.to[1], z];
      (l.closed ??= []).push('to');
      l.hand = { station: 'aizomecho', at: [HAND_X, l.to[1], z] };
    } else if (dx < 0 && Math.abs(l.from[0] - X) < 0.5) {
      const d = HAND_X + 20 - X;
      l.stops = l.stops.map((s) => ({ ...s, at: s.at + d, exit: s.exit + d }));
      l.halts = l.halts.map((s) => ({ ...s, at: s.at + d }));
      l.yields = l.yields?.map((s) => ({ ...s, at: s.at + d }));
      if (l.avoid) l.avoid = { ...l.avoid, from: l.avoid.from + d, to: l.avoid.to + d };
      l.from = [HAND_X + 20, l.from[1], z];
      (l.closed ??= []).push('from');
      l.fed = 'aizomecho';
    }
  }

  /** A signalled junction of a north–south street and the back street (as at Aizomechō). */
  const junction = (cx: number, hx: number, cz: number, hz: number, name: Named) => {
    const wideNS = hx > 4.6, flat = true;
    for (const sz of [-1, 1] as const) {
      const zc = cz + sz * (hz + 2.6);
      crosswalk(b, cx, zc, 2 * hx - 0.4, 3, false);
      pedSignal(b, cx - hx - 0.8, zc + sz * 2.0, [1, 0], 0, { flat, button: !wideNS, speaker: wideNS });
      pedSignal(b, cx + hx + 0.8, zc + sz * 2.0, [-1, 0], 0, { flat, button: !wideNS, speaker: wideNS });
    }
    for (const sx of [-1, 1] as const) {
      const xc = cx + sx * (hx + 2.6);
      crosswalk(b, xc, cz, 2 * hz - 0.4, 3, true);
      pedSignal(b, xc + sx * 2.0, cz - hz - 0.8, [0, 1], 1, { flat });
      pedSignal(b, xc + sx * 2.0, cz + hz + 0.8, [0, -1], 1, { flat });
    }
    for (const sx of [-1, 1] as const) {
      const lz = -sx;
      const xs = cx - sx * (hx + SL);
      b.deco(WHITE, Math.min(xs, xs - sx * 0.35), 0.004, Math.min(cz, cz + lz * (hz - 0.2)), Math.max(xs, xs - sx * 0.35), 0.01, Math.max(cz, cz + lz * (hz - 0.2)));
      vehicleSignal(b, cx + sx * (hx + 1.9), cz + lz * (hz + 1.5), [sx, 0], hz + 1.5 - hz / 2, 0, name, { style: 'new', back: true });
    }
    for (const sz of [1, -1] as const) {
      const lx = sz;
      const zs = cz - sz * (hz + SL);
      b.deco(WHITE, Math.min(cx, cx + lx * (hx - 0.2)), 0.004, Math.min(zs, zs - sz * 0.35), Math.max(cx, cx + lx * (hx - 0.2)), 0.01, Math.max(zs, zs - sz * 0.35));
      if (wideNS) vehicleSignal(b, cx + lx * (hx + 1.6), cz + sz * (hz + 2.0), [0, sz], hx + 1.6 - hx / 2, 1, name, { style: 'new', back: true });
      else shortSignal(b, cx + lx * (hx + 1.5), cz + sz * (hz + 1.9), [0, sz], 1, name);
    }
    // (On the cross street's pavement, clear of the corner houses.)
    roadModel(b, 'sigbox', cx - hx - 1.25, GY, cz - hz - 6, [1, 0]);
    b.block(cx - hx - 1.51, GY, cz - hz - 6.36, cx - hx - 0.99, GY + 1.56, cz - hz - 5.64);
  };
  const crossAll = [HOB, SAN].map((s) => ({ c: s.c, half: s.half }));
  const stopsX = (sx: 1 | -1, x0: number): LanePart['stops'] =>
    crossAll.map(({ c: cx, half }) => {
      const t = (cx - x0) * sx;
      return { at: t - half - SL - 0.5, axis: 0 as const, exit: t + half + SL };
    }).filter((q) => q.at > 2).sort((p, q) => p.at - q.at);
  // 綱町通, the back street: two lanes, a signal at each cross street, lane paint, lamps on poles.
  for (const q of [HOB, SAN]) junction(q.c, q.half, TSU.z, TSU.half, { ja: `${TSU.short.ja}${q.name.ja.replace('筋', '')}`, en: `${TSU.short.en} ${q.name.en.replace('-suji', '')}` });
  // (People cross at 唐船大路's zebra, x −1.5 … 1.5: the lanes give way there.)
  const zebra = (sx: 1 | -1, x0: number) => [{ at: (0 - x0) * sx - 1.5 - 5, zone: [-1.5, TSU_C0, 1.5, TSU_C1] as [number, number, number, number] }];
  trafficLane(b, -X, TSU.z - 2.25, X, TSU.z - 2.25, { speed: 30 / 3.6, flow: 1.6, use: 'all', taxi: 0.05, halts: [], stops: stopsX(1, -X), yields: zebra(1, -X) });
  trafficLane(b, X, TSU.z + 2.25, -X, TSU.z + 2.25, { speed: 30 / 3.6, flow: 1.6, use: 'all', taxi: 0.05, halts: [], stops: stopsX(-1, X), yields: zebra(-1, X) });
  crosswalk(b, 0, TSU.z, 2 * TSU.half - 0.4, 3, true);

  // ── The north-east streets (2026-11-24, north-roads.ts): Tōsen-machi's and Kita-Hatoba's streets are driven as
  // part of this street, so their cars turn to and from the boulevard. Kawaminato-kō's back street runs on
  // east to the quay road and its cross streets north to Hokushin-dōri, all as `chain` lanes (a car turned
  // onto one chooses again there); the boulevard stops for the avenue and the quay road. ──
  {
    const F = 320;
    const shift = (l: LanePart, d: number) => {
      l.stops = l.stops.map((s) => ({ ...s, at: s.at + d, exit: s.exit + d }));
      l.halts = l.halts.map((s) => ({ ...s, at: s.at + d }));
      l.yields = l.yields?.map((s) => ({ ...s, at: s.at + d }));
      if (l.avoid) l.avoid = { ...l.avoid, from: l.avoid.from + d, to: l.avoid.to + d };
    };
    const merge = (l: LanePart, extra: LanePart['stops']) => { l.stops = [...l.stops, ...extra].sort((p, q) => p.at - q.at); };
    const bv = northStreet('boulevard'), ts = northStreet('tsuna');
    for (const l of b.out.lanes.slice(lanes0)) {
      const dx = l.to[0] - l.from[0], dz = l.to[2] - l.from[2], wx0 = l.from[0] + F, wx1 = l.to[0] + F;
      if (Math.abs(dz) < 0.1 && Math.abs(l.from[2]) < RW && l.use === 'all') {
        merge(l, stopsFor(bv, dx > 0 ? 1 : -1, wx0, wx1, ['ave', 'quay', 'kamome', 'rashin']));
      } else if (Math.abs(dz) < 0.1 && Math.abs(l.from[2] - TSU.z) < TSU.half && l.use === 'all') {
        const off = TSU.z - l.from[2]; // (left of the eastbound lane is north)
        const end = northEnds(ts, dx > 0 ? off : -off)[1];
        if (dx > 0) {
          merge(l, stopsFor(ts, 1, wx0, end, ['ave', 'quay', 'kamome', 'rashin']));
          l.to = [end - F, l.to[1], l.to[2]];
          l.dead = true;
        } else {
          shift(l, end - wx0);
          l.from = [end - F, l.from[1], l.from[2]];
          l.flow = 0;
          merge(l, stopsFor(ts, -1, end, wx1, ['ave', 'quay', 'kamome', 'rashin']));
        }
        l.chain = true;
      } else if (Math.abs(dx) < 0.1 && (Math.abs(l.from[0] - HOB.c) <= HOB.half || Math.abs(l.from[0] - SAN.c) <= SAN.half)) {
        const st = northStreet(Math.abs(l.from[0] - HOB.c) <= HOB.half ? 'hob' : 'san'), north = -northEnds(st)[1];
        if (dz < 0) {
          l.to = [l.to[0], l.to[1], north];
          l.dead = true;
          merge(l, stopsFor(st, 1, -l.from[2], -north, ['hokushin']));
        } else {
          shift(l, l.from[2] - north);
          l.from = [l.from[0], l.from[1], north];
          l.flow = 0;
        }
        l.chain = true;
      }
    }
    for (const l of northLanes()) b.out.lanes.push({ ...l, from: [l.from[0] - F, l.from[1], l.from[2]], to: [l.to[0] - F, l.to[1], l.to[2]] });
    // (Vehicles out there are solid to the player too: collision/near reaches the quay's north end.)
    b.out.reach = 660;
  }
  {
    const boxes: [number, number][] = [...crossAll.map(({ c: cx, half }): [number, number] => [cx - half - 8, cx + half + 8]), [-8, 8]];
    for (let x = -X + 1; x < X - 3; x += 6) if (clearOf(x + 1.5, boxes)) b.deco(WHITE, x, 0.004, TSU.z - 0.07, x + 3, 0.01, TSU.z + 0.07);
    for (const e of [-1, 1]) for (const [x0, x1] of [[-X, -8], [8, X]]) b.deco(WHITE, x0, 0.004, TSU.z + e * (TSU.half - 0.4) - 0.05, x1, 0.01, TSU.z + e * (TSU.half - 0.4) + 0.05);
    for (const x of [-X + 14, X - 14]) roadSign(b, 'speed30', x, TSU.z + Math.sign(x) * (TSU.half + 0.4), [Math.sign(x), 0], 0.6);
    poleLine(b, { axis: 'x', from: -X + 6, to: X - 6, at: TSU_C1 + 0.4, road: -1, step: 26, skip: (u) => !clearOf(u, boxes, 2) || !clearOf(u, [...LANE_N, ...LANE_F], 2), drops: 0.7, name: stName });
    for (let x = -X + 13; x < X - 6; x += 26) if (clearOf(x, boxes, 2) && clearOf(x, [...LANE_N, ...LANE_F], 2)) streetLamp(b, 'lamp_small', x, TSU_C0 - 0.4, [0, 1]);
    // Vending machines and parked bikes along the back street's pavements, Aizomechō's way.
    for (let x = -X + 20; x < X - 10; x += 34) {
      if (!clearOf(x, boxes, 4) || !clearOf(x, LANE_F, 4) || (x > 84 && x < 131)) continue;
      vending(b, x, GY, BACK0 - 0.45, [0, -1], (x / 34) % 2 < 1 ? 'vending' : 'vending2', 'old');
      for (let k = 0; k < 3; k++) bike(x + 4 + k * 0.7, BACK1 + 0.5, [0, 1]);
    }
  }
  // Hobashira-suji: a white edge line each side, lamps and a pole line along its west side.
  {
    const s = HOB, ends: [number, number][] = [[-Z, BACK1 - 6], [BACK0 + 6, -RW - 7]];
    for (const [z0, z1] of ends) for (const e of [-1, 1]) b.deco(WHITE, s.c + e * (s.half - 0.4) - 0.05, 0.004, z0, s.c + e * (s.half - 0.4) + 0.05, 0.01, z1);
    poleLine(b, { axis: 'z', from: -Z + 6, to: -FRONT - 4, at: s.c - s.half - 0.4, road: 1, step: 26, skip: (u) => Math.abs(u - TSU.z) < 9, drops: 0.7, name: stName });
    for (let z = -Z + 12; z < -FRONT - 6; z += 26) if (Math.abs(z - TSU.z) > 12) streetLamp(b, 'lamp_small', s.c + s.half + 0.4, z, [-1, 0]);
  }
  // Sanbashi-suji: lane lines, ginkgo and lamps down its pavements.
  {
    const s = SAN;
    for (let z = -Z + 1; z < -RW - 8; z += 6) {
      if (Math.abs(z + 1.5 - TSU.z) < TSU.half + 8) continue;
      b.deco(YELLOW, s.c - 0.08, 0.004, z, s.c + 0.08, 0.01, z + 6);
    }
    for (const sx of [-1, 1]) {
      const x = s.c + sx * (s.half + 1.5);
      for (let z = -Z + 8; z < -FRONT - 4; z += 15) {
        if (Math.abs(z - TSU.z) < TSU.half + 8) continue;
        modelTree(b, 'ginkgo', x, z, 'a', GY, true);
        if (Math.abs(z + 7 - TSU.z) > TSU.half + 8 && z + 7 < -FRONT - 4) streetLamp(b, 'lamp_led', s.c + sx * (s.half + 0.9), z + 7, [-sx, 0]);
      }
    }
  }
  // The kit laid the cross streets' lanes with a stop at the boulevard only: add the back street's signals.
  for (const l of b.out.lanes.slice(lanes0)) {
    const dx = l.to[0] - l.from[0], dz = l.to[2] - l.from[2];
    if (Math.abs(dx) > 0.1 || Math.abs(dz) < 1) continue;
    if (![HOB, SAN].some((q) => Math.abs(l.from[0] - q.c) < q.half + 0.1)) continue;
    const uz = Math.sign(dz);
    const t = (TSU.z - l.from[2]) * uz;
    if (t - TSU.half - SL < 6 || t + TSU.half + SL > Math.abs(dz) - 4) continue;
    l.stops = [...l.stops, { at: t - TSU.half - SL - 0.5, axis: 1 as const, exit: t + TSU.half + SL }].sort((p, q) => p.at - q.at);
  }

  // ── Nothing of the kit's stands in a lane's or a passage's mouth; kerb rails along the boulevard ──
  // South side: the forecourts open onto the pavement where people cross to the plaza and the pier approach.
  const southOpen: [number, number][] = [[RENGA1[0] - 4, RENGA1[0]], [RENGA1[1], RENGA2[0]], [HIROBA[0], HIROBA[1]], [TERM.x1, KOWAN[0]]];
  const gaps = kerbGaps(streetsX, busX, taxiX);
  {
    const mouths: Rect[] = LANE_N.map(([a, e]): Rect => [a - 1.2, -FRONT - 0.2, e + 1.2, -RW + 0.2]);
    for (const [x0, z0, x1, z1] of mouths) {
      const inside = (v: number[]) => v[0] > x0 && v[0] < x1 && v[2] > z0 && v[2] < z1;
      b.out.models = b.out.models.filter((m) => !(inside(m.pos) && m.kind === 'road' && m.pos[1] < GY + 1));
      b.out.signs = b.out.signs.filter((sg) => !(inside(sg.pos) && sg.normal !== null && sg.pos[1] > GY + 0.3 && (sg.pos[1] < GY + 4.6 || sg.content.k === 'roadboard')));
      b.out.boxes = b.out.boxes.filter((bx) => {
        const post = bx.max[1] < GY + 7 && bx.max[0] - bx.min[0] < 2.6 && bx.max[2] - bx.min[2] < 2.6;
        return !(bx.min[1] > -0.05 && bx.max[1] > 0.3 && post && inside([(bx.min[0] + bx.max[0]) / 2, 0, (bx.min[2] + bx.max[2]) / 2]));
      });
    }
    for (const s of [-1, 1] as const) {
      const zr = s * (RW + 0.3);
      const open = [...zonesAv.map(([a, e]) => [a + 2, e - 2]), ...(s < 0 ? LANE_N : southOpen).map(([a, e]) => [a - 0.6, e + 0.6]), ...gaps.filter((k) => k.s === s).map((k) => [k.x0, k.x1])].sort((p, q) => p[0] - q[0]);
      let x = -X;
      for (const [from, to] of open.concat([[X, X]])) {
        for (let xa = x; xa + 2.5 <= from; xa += 2.5) {
          b.block(xa, GY, zr - 0.04, xa + 2.5, GY + 0.9, zr + 0.04);
          kerbRail(b, xa + 1.25, zr);
        }
        x = Math.max(x, to);
      }
    }
    // Ginkgo along both kerbs; benches, bicycle racks and planters on the wide pavements.
    let tn = 0;
    const tree = (x: number, z: number, kind: TreeKind) => modelTree(b, kind, x, z, tn++ % 3 ? 'a' : 'b', GY, true);
    for (const s of [-1, 1] as const) {
      for (let x = -X + 8; x < X - 4; x += 12) {
        const z = s * (RW + 1.9);
        if (!clearOf(x, zonesAv, 1) || (s < 0 && !clearOf(x, LANE_N, 3)) || nearHole(x, z, 3.5) || gaps.some((k) => k.s === s && x > k.x0 - 2 && x < k.x1 + 2)) continue;
        tree(x, z, 'ginkgo');
      }
      for (let x = -X + 14; x < X - 6; x += 24) {
        const z = s * (RW + 4.4);
        if (!clearOf(x, zonesAv, 4) || (s < 0 && !clearOf(x, LANE_N, 6)) || nearHole(x, z, 5) || nearHole(x + 4, z, 5)) continue;
        const id = Math.round(x / 24) % 3 === 0 ? 'bikerack' : 'bench_s';
        roadModel(b, id, x, GY, z, [0, s]);
        const hw = id === 'bikerack' ? 2.05 : 0.95;
        b.block(x - hw, GY, z - 0.4, x + hw, GY + (id === 'bikerack' ? 1.1 : 0.6), z + 0.4);
        roadModel(b, 'planter', x + 3.6, GY, z, [0, s]);
        b.block(x + 3.6 - 0.9, GY, z - 0.45, x + 3.6 + 0.9, GY + 0.9, z + 0.45);
      }
    }
  }

  // ═════════════════════════ The fronts on the boulevard's north side ═════════════════════════
  const used = new Map<string, number>();
  const nameNo = new Map<string, number>();
  const nextName = <T,>(key: string, list: T[]): T => {
    const k = nameNo.get(key) ?? 0;
    nameNo.set(key, k + 1);
    return list[k % list.length];
  };
  /** A combination of the given pieces filling a frontage of length L (to within `slack`), the least used first. */
  const pack = (A: Anchors, L: number, ids: string[], slack = 3.2, min = 0): string[] => {
    const W = (id: string) => A[id].w;
    const order = [...ids].sort((p, q) => (used.get(p) ?? 0) - (used.get(q) ?? 0) || r() - 0.5);
    const least = Math.min(...ids.map(W));
    let best: string[] = [], bestScore = Infinity, steps = 0;
    const go = (acc: string[], sum: number) => {
      if (++steps > 30000) return;
      const rem = L - sum;
      if (acc.length && rem >= min && rem <= slack) {
        const score = acc.reduce((t, id) => t + (used.get(id) ?? 0) * 4, 0) + rem + acc.length * 0.2;
        if (score < bestScore) (bestScore = score), (best = [...acc]);
      }
      if (acc.length >= 8 || rem < least + min) return;
      for (const id of order) if ((ids.length < 6 || !acc.includes(id)) && W(id) <= rem - min) {
        acc.push(id);
        go(acc, sum + W(id));
        acc.pop();
      }
    };
    go([], 0);
    if (!best.length) {
      let rem = L;
      for (const id of order) if (W(id) <= rem) (best.push(id), (rem -= W(id)));
    }
    for (const id of best) used.set(id, (used.get(id) ?? 0) + 1);
    return best.map((id) => [id, r()] as const).sort((p, q) => p[1] - q[1]).map(([id]) => id);
  };
  const letterFront = (id: string, p: Record<string, AnchorPt>) => {
    const sty = styleOf(id), [ja, en] = nextName(sty, NAMES[sty]), [bg, fg] = BOARDS[sty];
    if (p.name) label(p.name, ja, en, bg, fg);
    if (p.roof) label(p.roof, ja.split(' ').pop()!, en, '#1d3550', '#ffffff');
    if (p.vertical) upright(p.vertical, ja.split(' ').pop()!, '#f4f1e8', '#1d3550');
  };
  /** A row of pieces along a frontage: on `face`, the building line at `line`, from u0 to u1, spread with equal gaps. */
  const row = (kind: string, A: Anchors, face: Face, line: number, u0: number, u1: number, ids: string[], letter: (id: string, a: Anchor) => void): Rect[] => {
    const list = pack(A, u1 - u0, ids, 3.2, 0.3);
    const total = list.reduce((t, id) => t + A[id].w, 0);
    const gap = list.length ? (u1 - u0 - total) / (list.length + 1) : 0;
    let u = u0 + gap;
    const placed: Rect[] = [];
    for (const id of list) {
      const a = A[id], uc = u + a.w / 2;
      piece(kind, A, id, face, uc, line, (q) => letter(id, q));
      placed.push([u, face === 'n' ? line : line - a.d, u + a.w, face === 'n' ? line + a.d : line]);
      u += a.w + gap;
    }
    return placed;
  };
  const FRONT_IDS = Object.keys(MINATOFRONT), NO_TOWER = FRONT_IDS.filter((k) => !k.startsWith('tower_') && !k.startsWith('hotel_'));
  const FD = MINATOFRONT.brick_a.d; // 14: every front's depth
  const corrN: [number, number][] = [bl(HOB), ...LANE_N, bl(SAN), [SAN.c + SAN.half + SAN.pave, X]];
  const frontSpans = between(corrN);
  for (const [a, e] of frontSpans) row('minatofront', MINATOFRONT, 's', -FRONT, a + 0.3, e - 0.3, e - a < 40 ? NO_TOWER : FRONT_IDS, (id, q) => letterFront(id, q.pts));
  // Behind them, the back street's rows (stock: a back street).
  const interiors: Rect[] = [];
  /** Hobashira-suji has no pavements: rows keep 3 m off its edges, so turning traffic clears their corners. */
  const off = (u: number) => (Math.abs(u - (HOB.c - HOB.half)) < 0.01 || Math.abs(u - (HOB.c + HOB.half)) < 0.01 ? 3 : 0.3);
  for (const [a, e] of frontSpans) {
    fillRect(a + off(a), BACK0 + 0.3, e - off(e), -FRONT - FD - 0.3, 'n', a < HOB.c || e > SAN.c ? SMALL : LOW);
    interiors.push([a, BACK0, e, -FRONT]);
  }

  // ═════════════════════════ The old customs house and its lane ═════════════════════════
  {
    const Z0 = MINATO.zeikan;
    const x0 = bl(SAN)[1];
    piece('minato', MINATO, 'zeikan', 's', x0 + Z0.w / 2, -FRONT, (a) => {
      label(a.pts.name, '旧川湊税関', 'Old Kawaminato Customs House · 1934', '#2a2622', '#e8d9b0');
      if (a.pts.clock) signAt(a.pts.clock, { k: 'clock' });
    });
    reserved.push([x0, BACK0, x0 + Z0.w, -FRONT]);
    lanePave(ZEIKAN_LANE[0], BACK0, ZEIKAN_LANE[1], -FRONT, { ja: '税関横丁', en: 'Zeikan-yokochō' });
    for (let z = BACK0 + 6; z < -FRONT - 3; z += 12) streetLamp(b, 'lamp_small', ZEIKAN_LANE[1] - 0.3, z, [-1, 0]);
    for (const z of [BACK0 + 3, -FRONT - 9]) vending(b, ZEIKAN_LANE[1] - 0.5, GY, z, [-1, 0], z < -30 ? 'vending' : 'vending2', 'old');
  }

  // ═════════════════════════ 唐船大路, from the boulevard north ═════════════════════════
  // Tōsen-machi's food street sets out from the boulevard under 迎港門, its great gate on the building line, and crosses
  // Tsunamachi-dōri at a zebra (tosen-street.ts goes on north of z −85).
  {
    const [a, e] = LANE_F[1], G = TOSEN.paifang_a;
    for (const [z0, z1] of [[-Z, TSU_C0], [TSU_C1, -FRONT]] as [number, number][]) {
      lanePave(a, z0, e, z1, { ja: '唐船大路', en: 'Tōsen-ōji' }, 'tile:#9b9286');
      b.deco('tile:#8a4a3c', -1.2, GY + 0.013, z0, 1.2, GY + 0.016, z1);
    }
    at('s', 0, -FRONT - 0.3, () => {
      b.model('tosen', 'paifang_a', 0, GY, 0, 0);
      for (const sx of [-1, 1]) for (const [px, hw] of [[3.1, 0.45], [5.8, 0.35]]) b.block(sx * px - hw, GY, G.d / 2 - 0.7, sx * px + hw, GY + 5, G.d / 2 + 0.7);
      label(G.pts.name, '迎港門', 'Geikō-mon', '#7d1a14', '#f2d27a');
      label(G.pts.name_b, '唐船町', 'Tōsen-machi', '#7d1a14', '#f2d27a');
    });
    for (const [z0, z1] of [[-Z + 6, BACK1 - 3], [BACK0 + 4, -FRONT - 5]] as [number, number][]) {
      for (let z = z0; z < z1; z += 10) for (const sd of [-1, 1]) streetLamp(b, 'lamp_small', sd * (e - 0.8), z + (sd > 0 ? 5 : 0), [-sd, 0]);
    }
  }

  // ═════════════════════════ North of the back street: the old shipping town ═════════════════════════
  // On Tsunamachi-dōri, the port town's shop houses (build_tsuna.py); behind them, a row-house lane (路地) through
  // every block with a terrace facing it, to Tōsen-machi's edge; the alleys at x ±50 carry Tōsen-machi's on.
  // The bathhouse 錨湯 takes a whole lot west of the food street; a convenience store the corner east of Sanbashi-suji.
  {
    const SHOP = Object.keys(TSUNA).filter((k) => k.startsWith('shop_')), NAGA = Object.keys(TSUNA).filter((k) => k.startsWith('naga_'));
    const SD = TSUNA.shop_a.d;
    const L0 = BACK1 - SD - 0.6, L1 = L0 - 4; // the lane, z (L1 north of L0)
    const N0 = L1 - 0.3; // the terrace's front line
    const SHOPS: [string, string][] = [
      ['船具 錨屋', 'Ikariya Chandlery'], ['網元 浜吉', 'Hamakichi Nets'], ['酒 綱町', 'Tsunamachi Saké'], ['乾物 磯屋', 'Isoya Dried Fish'],
      ['理容 みなと', 'Minato Barber'], ['喫茶 灯', 'Kissa Akari'], ['居酒屋 舫', 'Izakaya Moyai'], ['魚 丸十', 'Marujū Fish'],
      ['金物 船大工', 'Funadaiku Hardware'], ['薬 綱町堂', 'Tsunamachidō Pharmacy'], ['豆腐 ささ波', 'Sazanami Tofu'], ['立呑み 汽笛', 'Tachinomi Kiteki'],
    ];
    let shopNo = 0;
    const letterShop = (_id: string, q: Anchor) => {
      const [ja, en] = SHOPS[shopNo++ % SHOPS.length];
      if (q.pts.name) label(q.pts.name, ja, en, '#f2ecd8', '#2a2019');
    };
    const LANES: Named[] = [
      { ja: '船大工横丁', en: 'Funadaiku-yokochō' }, { ja: '網干場小路', en: 'Amiboshiba-kōji' }, { ja: '帆布横丁', en: 'Hanpu-yokochō' },
      { ja: '錨小路', en: 'Ikari-kōji' }, { ja: '舫小路', en: 'Moyai-kōji' }, { ja: '魚河岸横丁', en: 'Uogashi-yokochō' },
    ];
    const corrF: [number, number][] = [bl(HOB), ...LANE_F, bl(SAN)];
    const blocks = between(corrF);
    blocks.forEach(([a, e], k) => {
      const x0 = a + 0.3, x1 = e - 0.3;
      let s0 = x0;
      const s1 = x1;
      const westOfFood = Math.abs(e - LANE_F[1][0]) < 0.01;
      // The bathhouse: the block west of the food street, a whole lot from the back street to the edge.
      if (westOfFood) {
        const sw = TSUNA.sento, sx = x0 + 3 + sw.w / 2;
        piece('tsuna', TSUNA, 'sento', 's', sx, BACK1 - 0.3, (q) => {
          label(q.pts.name, '錨湯', 'Ikari-yu bathhouse', '#2a2019', '#f2ecd8');
          if (q.pts.chimney) signAt(q.pts.chimney, { k: 'shop', ja: 'ゆ', bg: '#f4f1e8', fg: '#7a1f2b', vertical: true });
        });
        reserved.push([sx - sw.w / 2, -Z, sx + sw.w / 2, BACK1]);
        s0 = sx + sw.w / 2 + 0.6;
      }
      // The convenience store on Sanbashi-suji's corner.
      if (Math.abs(a - bl(SAN)[1]) < 0.01) {
        const kc = KONBINI.corner;
        // (Facing south onto Tsunamachi-dōri at Sanbashi-suji's corner: its 9 m depth sits inside the shop row's, clear of the lane behind.)
        at('s', a + 0.3 + kc.w / 2, BACK1 - 0.3, () => konbini(b, { type: 'corner', chain: 'hinode' }));
        reserved.push([a, BACK1 - kc.d - 0.6, a + kc.w + 0.6, BACK1]);
        s0 = a + kc.w + 0.9;
      }
      if (s1 - s0 > 5) for (const q of row('tsuna', TSUNA, 's', BACK1 - 0.3, s0, s1, SHOP, letterShop)) reserved.push(q);
      // The lane and its terrace, across the block (past the bathhouse's lot).
      const la = westOfFood ? s0 : x0;
      if (x1 - la > 8) {
        lanePave(la, L1, x1, L0, LANES[k % LANES.length]);
        for (const q of row('tsuna', TSUNA, 's', N0, la + 0.2, x1 - 0.2, NAGA, () => {})) reserved.push(q);
        for (let x = la + 6; x < x1 - 4; x += 14) streetLamp(b, 'lamp_small', x, L0 - 0.22, [0, -1]);
        for (let x = la + 3; x < x1 - 3; x += 11) bike(x, L1 + 0.4, [1, 0]);
        at('n', x1 - 1.4, L0 - 0.02, () => {
          b.model('aizome', 'jizo', 0, GY, -0.9, 1);
          b.block(-0.6, GY, -0.9, 0.6, GY + 1.8, -0.05);
        });
        vending(b, la + 1.1, GY, L0 - 0.4, [0, -1], k % 2 ? 'vending' : 'vending2', 'old');
      }
      interiors.push([a, -Z, e, BACK1]);
    });
    // The alleys at x ±50 through the north band (Tōsen-machi's 提灯小路 and 龍門小路 go on north).
    const far: Named[] = [{ ja: '提灯小路', en: 'Chōchin-kōji' }, { ja: '', en: '' }, { ja: '龍門小路', en: 'Ryūmon-kōji' }];
    LANE_F.forEach(([a, e], k) => {
      if (k === 1) return;
      lanePave(a, -Z, e, BACK1, far[k]);
      for (let z = -Z + 6; z < BACK1 - 3; z += 9) streetLamp(b, 'lamp_small', a + 0.25, z, [1, 0]);
    });
  }

  // ═════════════════════════ The south side: warehouses, plaza, terminal, port office ═════════════════════════
  // The forecourts and the pier approach: setts from the pavement to the promenade.
  {
    const forecourt = (x0: number, x1: number, z0: number, z1: number, name?: Named) => {
      b.deco(SETT, x0, GY + 0.002, z0, x1, GY + 0.012, z1);
      reserved.push([x0, z0, x1, z1]);
      if (name) b.zone('street', x0 + 0.3, GY - 0.2, z0 + 0.3, x1 - 0.3, GY + 8, z1 - 0.3, name.ja, name.en, true);
    };
    forecourt(-X, HIROBA[0], FRONT, RZ); // before the warehouses
    forecourt(-X, RENGA1[0], RZ, PROM);
    forecourt(TERM.x0, TERM.x1, FRONT, TERM.z0); // the terminal's forecourt
    forecourt(RENGA1[1], RENGA2[0], RZ, PROM, { ja: '帆柱筋（倉庫の間）', en: 'Hobashira-suji — between the warehouses' });
    forecourt(TERM.x1, KOWAN[0], FRONT, PROM, { ja: '桟橋筋（桟橋通路）', en: 'Sanbashi-suji — the pier approach' });
    // Bollards keep cars off the approach.
    for (const x of [TERM.x1 + 1, (TERM.x1 + KOWAN[0]) / 2, KOWAN[0] - 1]) {
      roadModel(b, 'bollard', x, GY, FRONT + 0.6, [0, 1]);
      b.block(x - 0.15, GY, FRONT + 0.45, x + 0.15, GY + 0.9, FRONT + 0.75);
    }
  }
  // The two warehouses: names over the doors, the house number on the roof, lamps along the forecourts.
  ([[RENGA1, 'renga_1', '一号館', 'No. 1'], [RENGA2, 'renga_2', '二号館', 'No. 2']] as const).forEach(([[x0, x1], id, ja, en]) => {
    piece('minato', MINATO, id, 'n', (x0 + x1) / 2, RZ, (a) => {
      label(a.pts.name, `川湊煉瓦倉庫 ${ja}`, `Kawaminato Brick Warehouse ${en}`, '#2a2622', '#efe6cf');
      label(a.pts.back, `川湊煉瓦倉庫 ${ja}`, `Kawaminato Brick Warehouse ${en}`, '#2a2622', '#efe6cf');
      if (a.pts.num) label(a.pts.num, ja, en, '#efe6cf', '#7a2b24');
    });
    reserved.push([x0, RZ, x1, RZ + MINATO[id].d]);
    // Iron stair towers at the ends stand on the forecourt (build_minato.py: 2.6 m out from the front).
    for (const sx of [-1, 1]) {
      const sxc = (x0 + x1) / 2 + sx * ((x1 - x0) / 2 - 2.2);
      b.block(sxc - 1.4, GY, RZ - 2.6, sxc + 1.4, GY + 13.5, RZ);
    }
  });
  // 煉瓦広場 Renga Hiroba: stone paving, rows of trees, benches, a ship's anchor on a plinth.
  {
    const [x0, x1] = HIROBA, z0 = FRONT, z1 = PROM;
    b.deco('tile:#a89a86', x0, GY + 0.003, z0, x1, GY + 0.013, z1);
    reserved.push([x0, z0, x1, z1]);
    b.zone('street', x0 + 0.3, GY - 0.2, z0 + 0.3, x1 - 0.3, GY + 10, z1 - 0.3, '煉瓦広場', 'Renga Hiroba — Brick Square', true);
    let k = 0;
    for (let x = x0 + 4; x < x1 - 2; x += 7) for (const z of [z0 + 6, z1 - 6]) modelTree(b, 'zelkova', x, z, k++ % 2 ? 'a' : 'b', GY, true);
    for (let x = x0 + 7.5; x < x1 - 4; x += 7) {
      roadModel(b, 'bench_s', x, GY, (z0 + z1) / 2 - 3, [0, 1]);
      b.block(x - 0.95, GY, (z0 + z1) / 2 - 3.4, x + 0.95, GY + 0.6, (z0 + z1) / 2 - 2.6);
    }
    const ax = (x0 + x1) / 2, az = (z0 + z1) / 2 + 3;
    b.box(STONE, ax - 1.4, GY, az - 1.0, ax + 1.4, GY + 0.8, az + 1.0);
    b.box('flat:#2e3236', ax - 0.15, GY + 0.8, az - 0.15, ax + 0.15, GY + 3.2, az + 0.15);
    b.box('flat:#2e3236', ax - 1.2, GY + 0.8, az - 0.15, ax + 1.2, GY + 1.1, az + 0.15);
    b.box('flat:#2e3236', ax - 0.7, GY + 2.9, az - 0.12, ax + 0.7, GY + 3.05, az + 0.12);
    b.sign({ k: 'label', text: '開港記念の錨', sub: 'The anchor of the port’s opening · 1889', fg: '#efe6cf', bg: '#2a2622' }, ax, GY + 0.45, az - 1.02, [0, -1], 2.2, 0.45);
    for (const x of [x0 + 2, x1 - 2]) streetLamp(b, 'lamp_twin', x, (z0 + z1) / 2, [x < ax ? 1 : -1, 0]);
    // (Stage 3, 2026-11-24.) Signal flags strung between the two lamps, as on a dressed ship: a line sagging
    // across the square, small flags in the code's colours along it.
    {
      const zc = (z0 + z1) / 2, xa = x0 + 2, xb = x1 - 2, n = Math.floor((xb - xa) / 0.7);
      const COLS = ['#c8102e', '#f2c230', '#1d3550', '#f4f1e8', '#2f6b4f', '#1673c9'];
      for (let k = 0; k < n; k++) {
        const u = (k + 0.5) / n, x = xa + (xb - xa) * u, y = GY + 4.7 - 0.9 * 4 * u * (1 - u);
        b.deco('flat:#2a2622', x - 0.36, y - 0.01, zc - 0.01, x + 0.36, y + 0.01, zc + 0.01);
        b.deco(`flat:${COLS[k % COLS.length]}`, x - 0.22, y - 0.42, zc - 0.005, x + 0.22, y, zc + 0.005);
      }
    }
  }
  // The ferry terminal (stage 1: its shell, floor, inner walls, ceiling and lights; exit 5 rises inside).
  {
    const T = MINATO.terminal, cx = (TERM.x0 + TERM.x1) / 2, z0 = TERM.z0;
    const door = T.pts._door, dx0 = cx + door[0] - door[3] / 2, dx1 = cx + door[0] + door[3] / 2, dh = door[4];
    piece('minato', MINATO, 'terminal', 'n', cx, z0, (a) => {
      label(a.pts.name, '川湊港フェリーターミナル', 'Kawaminato Ferry Terminal', '#1d3550', '#ffffff');
      if (a.pts.tower) upright(a.pts.tower, 'フェリー', '#f4f1e8', '#1d3550');
    }, false);
    reserved.push([TERM.x0, TERM.z0, TERM.x1, TERM.z1]);
    const t = 0.3, H = MINATO.terminal.h;
    // Walls (the glass is the model's; inside, a dark pane just in front of it).
    b.block(TERM.x0, GY, z0, dx0, GY + 9, z0 + t);
    b.block(dx1, GY, z0, TERM.x1, GY + 9, z0 + t);
    b.block(dx0, GY + dh, z0, dx1, GY + 9, z0 + t);
    b.block(TERM.x0, GY, z0, TERM.x0 + t, GY + 9, TERM.z1);
    b.block(TERM.x1 - t, GY, z0, TERM.x1, GY + 9, TERM.z1);
    // (The back wall: its glass doors out onto the promenade by the gangway, x cx + 10 … cx + 14.)
    const BD: [number, number] = [cx + 10, cx + 14];
    b.block(TERM.x0, GY, TERM.z1 - t, BD[0], GY + 9, TERM.z1);
    b.block(BD[1], GY, TERM.z1 - t, TERM.x1, GY + 9, TERM.z1);
    b.block(BD[0], GY + 3.0, TERM.z1 - t, BD[1], GY + 9, TERM.z1);
    for (const [x0, x1] of [[TERM.x0 + t, dx0], [dx1, TERM.x1 - t]]) b.deco('glassDark', x0, GY + 0.3, z0 + t, x1, GY + 8.8, z0 + t + 0.03);
    b.deco('glassDark', dx0, GY + dh, z0 + t, dx1, GY + 8.8, z0 + t + 0.03);
    b.deco('glassDark', TERM.x0 + t, GY + 0.3, z0 + t, TERM.x0 + t + 0.03, GY + 8.8, TERM.z1 - t);
    b.deco('glassDark', TERM.x1 - t - 0.03, GY + 0.3, z0 + t, TERM.x1 - t, GY + 8.8, TERM.z1 - t);
    for (const [x0, x1, y0] of [[TERM.x0 + t, BD[0], 0.3], [BD[1], TERM.x1 - t, 0.3], [BD[0], BD[1], 3.0]]) b.deco('glassDark', x0, GY + y0, TERM.z1 - t - 0.03, x1, GY + 8.8, TERM.z1 - t);
    b.deco('metal:#3d5560', BD[0] - 0.1, GY, TERM.z1 - t - 0.06, BD[0], GY + 3.1, TERM.z1);
    b.deco('metal:#3d5560', BD[1], GY, TERM.z1 - t - 0.06, BD[1] + 0.1, GY + 3.1, TERM.z1);
    b.deco('metal:#3d5560', BD[0], GY + 3.0, TERM.z1 - t - 0.06, BD[1], GY + 3.1, TERM.z1);
    // The lookout tower's foot stands in the hall's east end (build_minato.py: 5 × 5 from 3 m in).
    const tx = cx + T.w / 2 - 3.0;
    b.box('panel:#e3e7ea', tx - 2.5, GY, z0 + 3.0, tx + 2.5, GY + 8.9, z0 + 8.0);
    // Floor, ceiling, lights.
    // (Every opening in the hall's floor: exit 5's stair and the lift.)
    const inHall = holes.filter((q) => q[1] > z0 && q[3] < TERM.z1 + 0.01 && q[0] > TERM.x0 && q[2] < TERM.x1);
    let floorR: Rect[] = [[TERM.x0 + t, z0 + t, TERM.x1 - t, TERM.z1 - t]];
    for (const q of inHall) floorR = floorR.flatMap((r) => less(r, [q[0] - 0.05, q[1] - 0.05, q[2] + 0.05, q[3] + 0.05]));
    for (const [x0, za, x1, zb] of floorR) b.deco('floor:#d7d3cb', x0, GY + 0.004, za, x1, GY + 0.014, zb);
    b.deco('ceil', TERM.x0 + t, GY + 8.8, z0 + t, TERM.x1 - t, GY + 8.9, TERM.z1 - t);
    for (let x = TERM.x0 + 4; x + 2.4 < TERM.x1 - 6; x += 6) for (const z of [z0 + 6, z0 + 12, z0 + 18]) ceilingLight(b, x, x + 2.4, z - 0.22, z + 0.22, GY + 8.8);
    b.zone('concourse', TERM.x0 + t + 0.2, GY - 0.2, z0 + t + 0.2, TERM.x1 - t - 0.2, GY + 8.6, TERM.z1 - t - 0.2, '川湊港フェリーターミナル', 'Kawaminato Ferry Terminal');
    void H;
    terminalHall(b, cx, z0, TERM.z1, TERM.x0 + t, TERM.x1 - t, t, inHall, BD, [cx + door[0] - door[3] / 2, cx + door[0] + door[3] / 2]);
    // The gangway's legs on the promenade and in the water (build_minato.py: x ±1.4 off `gang`, z d + 3 and d + 8).
    for (const dz of [3.0, 8.0]) for (const sx of [-1, 1]) b.block(cx + 12 + sx * 1.4 - 0.15, GY, TERM.z1 + dz - 0.15, cx + 12 + sx * 1.4 + 0.15, GY + 5.2, TERM.z1 + dz + 0.15);
  }
  // The port office on the corner of the pier approach.
  {
    const K = MINATO.kowan;
    piece('minato', MINATO, 'kowan', 'n', (KOWAN[0] + KOWAN[1]) / 2, 20, (a) => label(a.pts.name, '川湊港湾事務所', 'Kawaminato Port Office', '#1d3550', '#ffffff'));
    reserved.push([KOWAN[0], 20, KOWAN[1], 20 + K.d]);
  }

  // ═════════════════════════ The promenade and the quay ═════════════════════════
  {
    b.deco(BOARD, -X, GY + 0.004, PROM, X, GY + 0.04, SEA - 0.5);
    b.zone('street', -X + 0.5, GY - 0.2, PROM + 0.2, X - 0.5, GY + 8, SEA - 0.7, '港のプロムナード', 'Harbour Promenade', true);
    reserved.push([-X, PROM, X, SEA]);
    const R = MINATO.quayrail.w;
    for (let x = -X; x + R <= X + 0.01; x += R) b.out.models.push({ kind: 'minato', id: 'quayrail', pos: b.pt(x + R / 2, GY, SEA - 0.45), yaw: 0, seed: 0, merge: true });
    for (let x = -X + 10, k = 0; x < X - 4; x += 20, k++) {
      b.out.models.push({ kind: 'port', id: 'quaylamp', pos: b.pt(x, GY, SEA - 1.0), yaw: Math.PI, seed: 0, merge: true });
      b.block(x - 0.15, GY, SEA - 1.15, x + 0.15, GY + 4, SEA - 0.85);
      if (k % 2 === 0 && clearOf(x + 8, [[(TERM.x0 + TERM.x1) / 2 + 8, (TERM.x0 + TERM.x1) / 2 + 16]], 2)) {
        roadModel(b, 'bench_s', x + 8, GY, SEA - 2.6, [0, 1]);
        b.block(x + 8 - 0.95, GY, SEA - 3.0, x + 8 + 0.95, GY + 0.6, SEA - 2.2);
      }
    }
    // (Stage 3, 2026-11-24.) The quay's working clutter on the promenade's landward edge, between the benches and
    // clear of the terminal's gangway: stacked crates, coils of rope, a life ring on its post; small boats moored
    // along the quay west of the ferry, bollards on the edge before them.
    for (let x = -X + 21, k = 0; x < X - 6; x += 40, k++) {
      if (x > TERM.x0 - 4 && x < TERM.x1 + 4) continue;
      const z = PROM + 0.9;
      for (const [dx, dy, s] of [[0, 0, 1.1], [1.15, 0, 1.0], [0.5, 1.1, 0.9]] as [number, number, number][]) {
        b.deco(k % 2 ? 'wood:#8a6a4c' : 'wood:#6b4a33', x + dx - s / 2, GY + dy, z - s / 2 + 0.2, x + dx + s / 2, GY + dy + s, z + s / 2 + 0.2);
      }
      b.block(x - 0.6, GY, z - 0.45, x + 1.7, GY + 2.0, z + 0.8);
      b.deco('flat:#c9b17a', x + 2.4, GY, z - 0.2, x + 3.4, GY + 0.28, z + 0.8);
      b.deco('flat:#a48c5c', x + 2.7, GY + 0.28, z + 0.1, x + 3.1, GY + 0.3, z + 0.5);
      b.block(x + 2.4, GY, z - 0.2, x + 3.4, GY + 0.3, z + 0.8);
      b.deco('flat:#3a3d41', x + 4.4, GY, z, x + 4.5, GY + 1.5, z + 0.1);
      b.block(x + 4.3, GY, z - 0.1, x + 4.6, GY + 1.5, z + 0.2);
      b.deco('flat:#c8402a', x + 4.1, GY + 0.75, z + 0.1, x + 4.8, GY + 0.86, z + 0.14);
      b.deco('flat:#c8402a', x + 4.1, GY + 1.3, z + 0.1, x + 4.8, GY + 1.41, z + 0.14);
      b.deco('flat:#f4f1e8', x + 4.1, GY + 0.86, z + 0.1, x + 4.2, GY + 1.3, z + 0.14);
      b.deco('flat:#f4f1e8', x + 4.7, GY + 0.86, z + 0.1, x + 4.8, GY + 1.3, z + 0.14);
    }
    for (const [id, x] of [['boat_a', -110], ['boat_b', -70], ['boat_a', -30]] as [string, number][]) {
      b.out.models.push({ kind: 'port', id, pos: b.pt(x, -1.2, SEA + 2.3), yaw: 0, seed: 0, merge: false });
      for (const dx of [-5, 5]) {
        b.out.models.push({ kind: 'port', id: 'bollard', pos: b.pt(x + dx, GY, SEA - 1.1), yaw: 0, seed: 0, merge: true });
        b.block(x + dx - 0.35, GY, SEA - 1.45, x + dx + 0.35, GY + 0.8, SEA - 0.75);
      }
    }
    // The ferry at its berth off the terminal, bollards on the quay edge before it.
    const F = MINATO.ferry;
    b.out.models.push({ kind: 'minato', id: 'ferry', pos: b.pt((TERM.x0 + TERM.x1) / 2 + 6, -1.2, SEA + 1.5 + F.d / 2), yaw: 0, seed: 0, merge: false });
  }

  // ═════════════════════════ Across the water (seen only) ═════════════════════════
  {
    const put = (kind: string, id: string, x: number, y: number, z: number, yaw: number) => b.out.models.push({ kind, id, pos: b.pt(x, y, z), yaw, seed: 0, merge: false });
    // The outer breakwater and its lighthouse.
    for (let k = 0; k < 6; k++) put('minato', 'teibo', -150 + k * 40, -1.2, 175, 0);
    put('minato', 'todai', 92, 2.0, 175, 0);
    // The container wharf beyond, with its cranes.
    b.out.models.push({ kind: 'minato', id: 'teibo', pos: b.pt(0, -1.2, 320), yaw: 0, seed: 0, merge: false });
    for (let k = 0; k < 8; k++) b.deco('concrete', -260 + k * 60, -1.4, 300, -200 + k * 60, 2.2, 340);
    for (const x of [-180, -120, -60, 30, 90]) put('port', 'crane', x, 2.2, 302, Math.PI);
  }

  // ── What is left over inside the blocks: no bare ground (coin parking, a pocket park, tiny-shop lanes, yards) ──
  leftovers(b, r, interiors, reserved, holes, { park: [{ ja: '綱町児童遊園', en: 'Tsunamachi Children’s Park' }, { ja: '船溜まり公園', en: 'Funadamari Pocket Park' }] }, piece);

  // ═════════════════════════ At the kerb: the metro's pylons ═════════════════════════
  {
    const P = KITACITY.pylon.pts;
    for (const q of holes.filter((h) => Math.abs(h[1]) < FRONT && Math.abs(h[3]) < FRONT)) {
      const xm = (q[0] + q[2]) / 2, zm = (q[1] + q[3]) / 2;
      const num = xm > 0 ? (zm < 0 ? '1' : '2') : zm < 0 ? '3' : '4';
      const [px, f]: [number, Face] = xm > 0 ? [q[0] - 1.4, 'w'] : [q[2] + 1.4, 'e'];
      at(f, px, zm, () => {
        b.model('kitacity', 'pylon', 0, GY, 0, 0);
        b.block(-0.62, GY, -0.16, 0.62, GY + 4.2, 0.16);
        for (const k of ['f', 'b']) {
          const p = P[k];
          b.sign({ k: 'guide', ja: `${st.nameJa}駅`, en: `${st.nameRomaji} Sta.`, bg: 'navy', badges: lines, num }, p[0], p[1] + GY + 0.95, p[2], [p[5], p[6]], p[3], 0.5);
          b.sign({ k: 'areamap', station: st.id }, p[0], p[1] + GY - 0.3, p[2], [p[5], p[6]], p[3], 1.5);
        }
      });
    }
  }

  // ═════════════════════════ Past the plot's edge ═════════════════════════
  // Every street runs on between rows of simplified buildings, with a cross street half way. East, the
  // boulevard runs on to Minatoura-bashi over the inlet (Kon'yahama's world draws the bridge).
  {
    const OUT = 180, CW = 3.5;
    type Edge = { c: number; half: number; pave: number; wide: boolean; tree?: TreeKind; len?: number };
    const roadOut = (alongZ: boolean, s: 1 | -1, q: Edge) => {
      const lim = alongZ ? Z : X, len = q.len ?? OUT, u0 = s > 0 ? lim : -lim - len, u1 = s > 0 ? lim + len : -lim;
      const R = (mat: string, v0: number, v1: number, y0: number, y1: number, a = u0, e = u1) =>
        e - a > 0.5 && (alongZ ? b.deco(mat, q.c + v0, y0, a, q.c + v1, y1, e) : b.deco(mat, a, y0, q.c + v0, e, y1, q.c + v1));
      R('asphalt', -q.half, q.half, -0.03, 0.004);
      for (const k of [-1, 1]) if (q.pave) R('paver', Math.min(k * q.half, k * (q.half + q.pave)), Math.max(k * q.half, k * (q.half + q.pave)), -0.03, GY);
      if (q.wide) R(YELLOW, -0.08, 0.08, 0.004, 0.01);
      for (let u = u0 + 12, k = 0; u < u1 - 6; u += 26, k++) {
        const side = k % 2 ? 1 : -1, v = side * (q.half + 0.8);
        const [px, pz] = alongZ ? [q.c + v, u] : [u, q.c + v];
        roadModel(b, q.half > 5 ? 'lamp_led' : 'lamp_small', px, GY, pz, alongZ ? [-side, 0] : [0, -side]);
        if (q.tree) for (const kk of [-1, 1]) {
          const [tx, tz] = alongZ ? [q.c + kk * (q.half + 1.5), u + 9] : [u + 9, q.c + kk * (q.half + 1.5)];
          modelTree(b, q.tree, tx, tz, 'b', GY, false);
        }
      }
    };
    const packOut = (alongZ: boolean, s: 1 | -1, a: number, e: number, kinds: string[], len = OUT) => {
      const lim = alongZ ? Z : X, mid = (a + e) / 2, CROSS = len / 2;
      for (const [d0, d1] of [[0.15, CROSS - CW], [CROSS + CW, len]]) {
        const u0 = s > 0 ? lim + d0 : -lim - d1, u1 = s > 0 ? lim + d1 : -lim - d0;
        if (alongZ) {
          fillRect(a + 0.2, u0, mid - 0.4, u1, 'w', kinds, true);
          fillRect(mid + 0.4, u0, e - 0.2, u1, 'e', kinds, true);
        } else {
          fillRect(u0, a + 0.2, u1, mid - 0.4, 'n', kinds, true);
          fillRect(u0, mid + 0.4, u1, e - 0.2, 's', kinds, true);
        }
      }
      const uc = s > 0 ? lim + CROSS : -lim - CROSS;
      if (alongZ) b.deco('asphalt', a - 20, -0.03, uc - CW, e + 20, 0.004, uc + CW);
      else b.deco('asphalt', uc - CW, -0.03, a - 20, uc + CW, 0.004, e + 20);
    };
    // (North: Tōsen-machi, a world of its own, tosen-street.ts.)
    // West: the boulevard and the back street, rows between them and north of the back street.
    roadOut(false, -1, { c: 0, half: RW, pave: FRONT - RW, wide: true, tree: 'ginkgo' });
    roadOut(false, -1, { c: TSU.z, half: TSU.half, pave: TSU.pave, wide: false });
    for (const [a, e] of [[-Z, BACK1], [BACK0, -FRONT]] as [number, number][]) {
      packOut(false, -1, a, e, BIZ);
      b.clearScenery(-X - OUT - 2, a - 9, -X, e + 9);
    }
    // (South of the boulevard, west: warehouses on the quay, seen only.)
    for (const x of [-X - 30, -X - 80, -X - 130]) b.out.models.push({ kind: 'port', id: x % 20 ? 'soko_a' : 'soko_c', pos: b.pt(x, GY, 24), yaw: 0, seed: 0, merge: false });
    b.clearScenery(-X - OUT - 2, FRONT, -X, SEA);
    // ── The arm (2026-11-24): the boulevard walked on east to the quay, across the quay road and apron and
    // out to the middle of Minatoura-bashi (ARM), where Kon'yahama's world takes over. Its rows north of the
    // boulevard run to the quay's buildings, with a cross street half way; the port's warehouses stand
    // behind a fence south of it. ──
    const E0 = X, E1 = QUAY.front, MID = X + 80;
    const side = (s: 1 | -1, a: number, e: number) => (s > 0 ? [a, e] : [-e, -a]) as [number, number];
    b.slab('asphalt', E0, -RW, QUAY.road, RW, -0.6, 0, []);
    for (const s of [-1, 1] as const) {
      const [z0, z1] = side(s, RW, FRONT);
      if (s > 0) b.slab('paver', E0, z0, E1, z1, -0.6, GY, []);
      else {
        // 帆影大通 Hokage-ōdōri's mouth (north-roads.ts): its carriageway crosses the pavement at a slant, kerbed to either side.
        const k = AVE_X.kerb / Math.cos(Math.PI / 6), w = (z: number) => aveX(z) - 320;
        const xa = w(-FRONT) - k, xb = w(-RW) + k;
        // (And Kamome-dōri's and Rashin-dōri's mouths, square across it: stage B, 2026-11-24.)
        const mouths = ['kamome', 'rashin'].map((id) => { const q = northStreet(id); return [q.ax - q.half - 320, q.ax + q.half - 320] as [number, number]; });
        let pa = E0;
        for (const [m0, m1] of mouths) {
          b.slab('paver', pa, z0, m0, z1, -0.6, GY, []);
          b.slab('asphalt', m0, z0, m1, z1, -0.6, 0, []);
          pa = m1;
        }
        b.slab('paver', pa, z0, xa, z1, -0.6, GY, []);
        b.slab('paver', xb, z0, E1, z1, -0.6, GY, []);
        b.slab('asphalt', xa, z0, xb, z1, -0.6, 0, []);
        paveSlab(b, 'paver', [[xa, -FRONT], [w(-RW) - k, -RW], [xa, -RW]], 0, GY);
        paveSlab(b, 'paver', [[w(-FRONT) + k, -FRONT], [xb, -FRONT], [xb, -RW]], 0, GY);
      }
      // The front strip along the quay's buildings, then the quay road and the apron (their paint is Kon'yahama's further on).
      const [w0, w1] = side(s, RW, FRONT);
      b.slab('paver', E1, w0, QUAY.road, w1, -0.6, 0.1, []);
      const [q0, q1] = side(s, BR_RW, FRONT);
      b.slab('asphalt', QUAY.road, q0, QUAY.apron, q1, -0.6, 0, []);
      const [a0, a1] = side(s, BR_W, FRONT);
      b.slab('flat:#b9b3a6', QUAY.apron, a0, QUAY.edge, a1, -0.6, 0, []);
      const [p0, p1] = side(s, BR_RW, BR_W);
      b.slab('paver', QUAY.apron, p0, QUAY.edge, p1, -0.6, GY, []);
      // Zebras across the quay road on both pavements' line.
      // (North of the boulevard the quay road's junction is Kita-Hatoba's, with its own zebras and signals: hatoba-street.ts.)
      if (s > 0) crosswalk(b, (QUAY.road + QUAY.apron) / 2, s * (BR_RW + FRONT) / 2, QUAY.apron - QUAY.road - 0.6, 3, false);
    }
    b.slab('asphalt', QUAY.road, -BR_RW, QUAY.edge, BR_RW, -0.6, 0, []);
    b.deco(YELLOW, E0, 0.004, -0.08, QUAY.road - 1, 0.01, 0.08);
    for (let x = E0; x < QUAY.road - 4; x += 6) for (const z of [-RW / 2, RW / 2]) b.deco(WHITE, x, 0.004, z - 0.07, x + 3, 0.01, z + 0.07);
    for (const s of [-1, 1]) b.deco(WHITE, QUAY.road - 1.8, 0.004, Math.min(0, s * (RW - 0.2)), QUAY.road - 1.45, 0.01, Math.max(0, s * (RW - 0.2)));
    // The bridge's west half: its deck is the model's (konyahama-street.ts), walked on invisible floors and kept in by its rails.
    b.block(QUAY.edge, -0.4, -BR_RW, ARM + 1, 0, BR_RW);
    for (const s of [-1, 1] as const) {
      const [p0, p1] = side(s, BR_RW, BR_W);
      b.block(QUAY.edge, -0.4, p0, ARM + 1, GY, p1);
      b.block(QUAY.edge, GY, s * (BR_W - 0.05) - 0.05, ARM + 1, GY + 1.1, s * (BR_W - 0.05) + 0.05);
      // The quay's edge either side of the bridge, behind the bollards.
      const [e0, e1] = side(s, BR_W, FRONT);
      b.block(QUAY.edge - 0.1, -0.6, e0, QUAY.edge + 0.2, 1.1, e1);
    }
    b.zone('street', E0, -0.3, -FRONT + 0.3, QUAY.edge, 6, FRONT - 0.3, '湊浦通', 'Minatoura-dōri');
    b.zone('street', QUAY.edge, -0.5, -BR_W, ARM + 1, 6, BR_W, '湊浦橋', 'Minatoura-bashi');
    // (North of the boulevard, east of the plot, is Kita-Hatoba's world: hatoba-street.ts, the avenue's mouth below.)
    // ── South: 湊浦緑地 Minatoura Ryokuchi (stage B of the re-lay, 2026-11-24), where the port's fenced warehouses
    // stood: lawns between gravel walks, pines along the water and cherries along the boulevard, the Harbour
    // Promenade carried on to the quay, and two of the old port's buildings kept: the brick warehouse (now a café)
    // and the customs shed 旧第三上屋 (now a market hall). Its walks start at the zebras opposite Kamome-dōri and
    // Rashin-dōri. Mooring bollards, rope rails and an anchor on a plinth for the harbour that was. ──
    {
      const P0 = X, P1 = QUAY.front; // x
      const KAMX = northStreet('kamome').ax - 320, RASX = northStreet('rashin').ax - 320;
      const GRAVEL = 'tile:#c9bfa6', LAWN = 'grass';
      b.slab('paver', P0, FRONT, P1, SEA, -0.6, GY, []);
      b.zone('street', P0, -0.3, FRONT, P1, 12, SEA - 0.4, '湊浦緑地', 'Minatoura Ryokuchi', true);
      // The sea wall, the rail, the water beyond (the plot's water ends at x X + 60).
      // (The backdrop's sea lies beyond, kept at the arm: render/water.ts.)
      b.box('concrete', P0, -2, SEA - 0.4, P1, GY, SEA);
      b.block(P0, GY, SEA - 0.55, P1, GY + 1.1, SEA + 4);
      const R = MINATO.quayrail.w;
      for (let x = P0; x + R <= P1 + 0.01; x += R) b.out.models.push({ kind: 'minato', id: 'quayrail', pos: b.pt(x + R / 2, GY, SEA - 0.45), yaw: 0, seed: 0, merge: true });
      // The port's fence on, from the park's end across the quay road and apron to the edge (their south is Kon'yahama's port).
      for (let x = P1 + 1; x + 1 <= QUAY.edge + 0.01; x += 2) b.out.models.push({ kind: 'places', id: 'fence', pos: b.pt(x, GY, FRONT + 0.1), yaw: 0, seed: 0, merge: true });
      b.block(P1, -0.6, FRONT, QUAY.edge, GY + 1.4, FRONT + 0.3);
      // The east edge, along the port's side of the quay road: a clipped hedge on a low wall.
      b.box('flat:#8f8a7f', P1 - 0.8, GY, FRONT + 0.3, P1, GY + 0.5, SEA - 0.6);
      b.box('flat:#3f5a3a', P1 - 0.7, GY + 0.5, FRONT + 0.3, P1 - 0.1, GY + 1.3, SEA - 0.6);
      b.block(P1 - 0.8, GY, FRONT + 0.3, P1, GY + 1.3, SEA - 0.6);
      // The promenade: boards to the rail, lamps and bollards at the edge, benches facing the water.
      b.deco(BOARD, P0, GY + 0.004, PROM, P1, GY + 0.04, SEA - 0.5);
      b.zone('street', P0 + 0.5, GY - 0.2, PROM + 0.2, P1 - 0.5, GY + 8, SEA - 0.7, '港のプロムナード', 'Harbour Promenade', true);
      for (let x = P0 + 10; x < P1 - 6; x += 24) {
        b.out.models.push({ kind: 'port', id: 'quaylamp', pos: b.pt(x, GY, SEA - 1.0), yaw: Math.PI, seed: 0, merge: true });
        b.block(x - 0.15, GY, SEA - 1.15, x + 0.15, GY + 4, SEA - 0.85);
        for (const dx of [6, 18]) {
          b.out.models.push({ kind: 'port', id: 'bollard', pos: b.pt(x + dx, GY, SEA - 1.1), yaw: 0, seed: 0, merge: true });
          b.block(x + dx - 0.35, GY, SEA - 1.45, x + dx + 0.35, GY + 0.8, SEA - 0.75);
        }
        roadModel(b, 'bench_s', x + 12, GY, PROM + 1.2, [0, 1]);
        b.block(x + 12 - 0.95, GY, PROM + 0.8, x + 12 + 0.95, GY + 0.6, PROM + 1.6);
      }
      // The walks: one along the park (z 32 … 35), one in from each zebra to the promenade.
      const WZ: [number, number] = [32, 35];
      // The two old buildings, their fronts to the boulevard 6 m back from it (the café's deck and the market's
      // forecourt before them): x ranges, and the walk the market hall's back meets.
      const U = URAFRONT;
      const OLD: [string, number, string, string, string][] = [
        ['renga', (KAMX + RASX) / 2, '湊浦赤レンガ珈琲館', 'Minatoura Red Brick Café', '1911'],
        ['uwaya', RASX + 12 + U.uwaya.w / 2, '旧第三上屋 湊浦マーケット', 'Old Shed No. 3 · Minatoura Market', '1930'],
      ];
      const builtX: [number, number][] = [];
      for (const [id, cx, ja, en, year] of OLD) {
        const A = U[id], zf = FRONT + 6.5;
        b.model('urafront', id, cx, GY, zf, 0);
        b.block(cx - A.w / 2 + 0.2, GY, zf + 0.2, cx + A.w / 2 - 0.2, GY + A.h, zf + A.d - 0.2);
        const put = (p: AnchorPt, c: SignContent) => b.sign(c, cx + p[0], GY + p[1], zf + p[2], [p[5], p[6]], p[3], p[4]);
        if (A.pts.name) put(A.pts.name, { k: 'label', text: ja, sub: `${en} · ${year}`, fg: '#efe6cf', bg: '#2a2622' });
        if (A.pts.number) put(A.pts.number, { k: 'label', text: id === 'renga' ? '五号' : '三', fg: '#efe6cf', bg: '#6e3a2d' });
        builtX.push([cx - A.w / 2 - 1, cx + A.w / 2 + 1]);
        // The forecourt before it: granite setts to the pavement.
        b.deco('tile:#a59c8e', cx - A.w / 2, GY + 0.006, FRONT, cx + A.w / 2, GY + 0.012, zf);
      }
      // (The long walk broken by the two buildings, which stand across it: it runs round them on their forecourts.)
      const walks: Rect[] = [...[KAMX, RASX].map((x): Rect => [x - 2.5, FRONT, x + 2.5, PROM])];
      {
        let x = P0;
        for (const [c0, c1] of [...builtX].sort((p, q) => p[0] - q[0])) { if (c0 > x) walks.push([x, WZ[0], c0, WZ[1]]); x = Math.max(x, c1); }
        walks.push([x, WZ[0], P1 - 0.8, WZ[1]]);
      }
      for (const [x0, z0, x1, z1] of walks) b.deco(GRAVEL, x0, GY + 0.006, z0, x1, GY + 0.012, z1);
      // Lawns between the walks, the buildings' lots and the promenade, edged with a rope rail on low posts.
      const lawnX: [number, number][] = [];
      {
        const cutsX: [number, number][] = [[KAMX - 2.5, KAMX + 2.5] as [number, number], [RASX - 2.5, RASX + 2.5] as [number, number], ...builtX].sort((p, q) => p[0] - q[0]);
        let x = P0 + 1;
        for (const [c0, c1] of cutsX) { if (c0 - x > 6) lawnX.push([x, c0 - 1]); x = Math.max(x, c1 + 1); }
        if (P1 - 2 - x > 6) lawnX.push([x, P1 - 2]);
      }
      const rope = (x0: number, z0: number, x1: number, z1: number) => {
        // Posts every 2 m along the edge and a rope between, knee high (seen); the lawn is walked on.
        const n = Math.max(1, Math.round(Math.hypot(x1 - x0, z1 - z0) / 2));
        for (let k = 0; k <= n; k++) {
          const x = x0 + ((x1 - x0) * k) / n, z = z0 + ((z1 - z0) * k) / n;
          b.deco('flat:#3a3d41', x - 0.06, GY, z - 0.06, x + 0.06, GY + 0.55, z + 0.06);
        }
        b.deco('flat:#c9b17a', Math.min(x0, x1) - 0.02, GY + 0.45, Math.min(z0, z1) - 0.02, Math.max(x0, x1) + 0.02, GY + 0.49, Math.max(z0, z1) + 0.02);
      };
      for (const [x0, x1] of lawnX) for (const [z0, z1] of [[FRONT + 1.5, WZ[0] - 1], [WZ[1] + 1, PROM - 1.2]] as [number, number][]) {
        b.deco(LAWN, x0, GY + 0.01, z0, x1, GY + 0.03, z1);
        rope(x0, z0, x1, z0);
        rope(x0, z1, x1, z1);
      }
      // Trees: cherries along the boulevard's side, black pines along the water, a camphor or two on the lawns.
      for (const [x0, x1] of lawnX) {
        for (let x = x0 + 4; x < x1 - 3; x += 11) {
          modelTree(b, 'cherry', x, FRONT + 4.5, 'b', GY, true);
          b.block(x - 0.4, GY, FRONT + 4.1, x + 0.4, GY + 4, FRONT + 4.9);
        }
        for (let x = x0 + 7; x < x1 - 3; x += 13) {
          modelTree(b, 'pine', x, PROM - 4, 'b', GY, true);
          b.block(x - 0.4, GY, PROM - 4.4, x + 0.4, GY + 4, PROM - 3.6);
        }
        if (x1 - x0 > 30) {
          const cx = (x0 + x1) / 2;
          modelTree(b, 'camphor', cx, (FRONT + WZ[0]) / 2 + 1, 'b', GY, true);
          b.block(cx - 0.5, GY, (FRONT + WZ[0]) / 2 + 0.5, cx + 0.5, GY + 4, (FRONT + WZ[0]) / 2 + 1.5);
        }
        // Benches along the walk, facing the lawn on the water's side; park lamps.
        for (let x = x0 + 9; x < x1 - 4; x += 18) {
          roadModel(b, 'bench_s', x, GY, WZ[1] + 0.6, [0, 1]);
          b.block(x - 0.95, GY, WZ[1] + 0.2, x + 0.95, GY + 0.6, WZ[1] + 1.0);
          streetLamp(b, 'lamp_park', x + 6, WZ[0] - 0.5, [0, 1]);
        }
      }
      // Where the walk from Kamome-dōri meets the long walk: the old channel buoy (旧航路標識), red with its lantern
      // cage, taken out of the harbour mouth when the channel was dredged, on a granite plinth. (Renga Hiroba has the anchor.)
      {
        const ax = KAMX, az = WZ[1] + 4.5, RED = 'flat:#b3261e', IRON = 'flat:#25282b';
        b.box('flat:#9a9488', ax - 1.6, GY, az - 1.6, ax + 1.6, GY + 0.6, az + 1.6);
        b.block(ax - 1.6, GY, az - 1.6, ax + 1.6, GY + 4.4, az + 1.6);
        b.deco(RED, ax - 1.2, GY + 0.6, az - 1.2, ax + 1.2, GY + 2.0, az + 1.2);
        b.deco('flat:#f1ead8', ax - 1.05, GY + 2.0, az - 1.05, ax + 1.05, GY + 2.25, az + 1.05);
        b.deco(RED, ax - 0.8, GY + 2.25, az - 0.8, ax + 0.8, GY + 3.0, az + 0.8);
        for (const [dx, dz] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) b.deco(IRON, ax + dx - 0.05, GY + 3.0, az + dz - 0.05, ax + dx + 0.05, GY + 4.0, az + dz + 0.05);
        b.deco(IRON, ax - 0.65, GY + 3.95, az - 0.65, ax + 0.65, GY + 4.05, az + 0.65);
        b.deco('flat:#e6a700', ax - 0.25, GY + 3.2, az - 0.25, ax + 0.25, GY + 3.7, az + 0.25);
        b.sign({ k: 'label', text: '旧航路標識', sub: 'Old channel buoy · Minatoura harbour mouth, 1931–1972', fg: '#efe6cf', bg: '#2a2622' }, ax, GY + 0.35, az - 1.62, [0, -1], 1.8, 0.4);
      }
      // Walk signs at the two entrances.
      for (const x of [KAMX, RASX]) b.sign({ k: 'label', text: '湊浦緑地', sub: 'Minatoura Ryokuchi · park', fg: '#ffffff', bg: '#2f4a2c' }, x + 3.2, GY + 1.6, FRONT + 0.4, [0, -1], 1.3, 0.4);
    }
    // Lamps and ginkgos along the arm, as inside the plot; on the north kerb a guard rail between the cross streets.
    const mouthX = ['kamome', 'rashin'].map((id) => northStreet(id).ax - 320);
    const clearMouth = (x: number, m: number) => mouthX.every((c) => Math.abs(x - c) > m) && Math.abs(x - (aveX(-RW) - 320)) > 22;
    for (let u = E0 + 12, k = 0; u < E1 - 6; u += 26, k++) {
      const s = k % 2 ? 1 : -1;
      if (clearMouth(u, 16)) roadModel(b, 'lamp_led', u, GY, s * (RW + 0.8), [0, -s]);
      for (const kk of [-1, 1]) if (clearMouth(u + 9, 16)) modelTree(b, 'ginkgo', u + 9, kk * (RW + 1.5), 'b', GY, false);
    }
    for (let x = E0 + 2; x < E1 - 4; x += 2.5) if (clearMouth(x + 1.25, 15) && Math.abs(x - (aveX(-RW) - 320)) > 30) {
      kerbRail(b, x + 1.25, -RW - 0.3);
      b.block(x, GY, -RW - 0.4, x + 2.5, GY + 0.9, -RW - 0.2);
    }
    b.clearScenery(X, BACK1 + 2, X + ARM + 2, FRONT + 6);
    b.clearScenery(X, FRONT, QUAY.front - 2, SEA);
  }
}
