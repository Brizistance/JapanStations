// The streets of Aobadai (青葉台), the leafy hillside suburb at Y-10 (rebuilt 2026-11; the owner's rules
// are in docs/street-design.md, the procedure in docs/station-playbook.md). After the hillside suburbs
// of Kansai's private railways: no avenue, one narrow old prefectural road over the line, small streets
// off it, quiet back streets on the terraces, lanes between the houses, stone walls and hedges.
//
// Frame: +x east along the Yanagisuji Line and Kitaoka-dōri, +z south. Plot ±130 × ±85.
//
//   z 0       北丘通 Kitaoka-dōri: two lanes (±5, the narrowest the kit passes buses in), 2.5 m pavements, fronts at ±7.5, poles on the north side
//   z −66     上ノ段通 Kaminodan-dōri: 6.5 m, one way west, no pavement
//   z 62      下ノ段通 Shimonodan-dōri: 6.5 m, one way east, no pavement
//   x −62     楓筋 Kaede-suji: 6.5 m two way, 1.5 m pavements
//   x 40      樫筋 Kashi-suji: 6.5 m two way, 1.5 m pavements
//   x 100     石段坂 Ishidan-zaka: a 4 m footpath, no cars, between the back streets
//
// The station's quarter: the north plaza (x −57.25 … −17, z −22 … −7.5) with the exit house over Exit 1
// (x −45 … −27, z −22 … −10); the south plaza (x −57.25 … −17, z 7.5 … 24) with Exit 2's stair and the
// taxi stand; 葉月商店街 Hazuki arcade north from the plaza (walk x −23 … −17, z −62.75 … −22, shops
// 9 m deep either side); at its top, across Kaminodan-dōri, the stone stair (x −24 … −16) up to
// 丘守神社 Okamori shrine on its terrace (x −40 … 0, z −85 … −75.25, 3 m up). The pocket park is south of
// Kitaoka-dōri (x −17 … 23.25, z 19.5 … 46.75).
//
// Lot table (each block: the rows on its edges, depth): the E–W rows own the corners in the outer blocks,
// the N–S rows run full length in the station blocks. Lanes (2.5 m) cut through rows where named.
//   NW  x −130 … −66.75: Kitaoka 12, Kaminodan 12, Kaede 12; lanes x −104 (street to street), z −35 (to Kaede)
//   N-station x −57.25 … 35.25: Kaede 12 (yokochō gap z −42.25 … −39.75), the house's yard and a coin park
//       behind the house (x −45.25 … −32), arcade W shops, arcade E shops (side passage z −36.25 … −33.75),
//       konbini (x −17 … −8, z −22 … −8), Kitaoka 12, Kashi 12 (gap at z −35), Kaminodan 12, houses on lane z −35
//   NE  x 44.75 … 130: Kitaoka 12, Kashi 12, Kaminodan 12, Ishidan-zaka x 98 … 102
//   SW  x −130 … −66.75: Kitaoka 12, Shimonodan 12, Kaede 12; lane x −100
//   S-station: south plaza, Kaede 12 (gap z 34 … 36.5), plaza-edge row 10 (z 24 … 34), lane z 34 … 36.5 to the
//       park, houses on it 10.25, Kitaoka 12, Kashi 12, Shimonodan 12, pocket park
//   SE  x 44.75 … 130: as NE; lane z 31.75 … 34.25 from Kashi-suji to Ishidan-zaka
//   North of Kaminodan (z −85 … −69.25): rows 15.75 and the shrine; south of Shimonodan (z 65.25 … 85): rows 19.75
//
// Signals share one cycle (traffic/signals.ts): axis 0 every east–west street, axis 1 every north–south one.
// Models: tools/blender/build_aoba.py (the quarter), build_aobafront.py (the fronts).

import { linesAt } from '../data/network';
import type { SignContent } from '../signs/content';
import { rng, type LanePart, type SignOpts } from '../world/builder';
import type { Anchor, AnchorPt, Anchors } from './anchors/types';
import { AOBA } from './anchors/aoba';
import { AOBAFRONT } from './anchors/aobafront';
import { KITACITY } from './anchors/kitacity';
import { GROUND_Y as GY, stairs, vending, type Ctx } from './kit';
import { lift } from './lift';
import { KONBINI, konbini } from './konbini';
import { kerbGaps, kerbRail, pedSignal, poleLine, roadKit, roadModel, roadSign, shortSignal, streetLamp, trafficLane } from './roads';
import type { SurfaceSpec } from './surface';
import { crosswalk, fillModelLots } from './surface';
import { modelTree, type TreeKind } from './trees';
import { leftovers } from './tsumugibashi-street';

type Rect = [number, number, number, number];
type Face = 'n' | 's' | 'e' | 'w';
type Named = { ja: string; en: string };

/** Half extents of Aobadai's plot. */
export const AOBA_PLOT = { x: 130, z: 85 };
const X = AOBA_PLOT.x, Z = AOBA_PLOT.z;
/** Kitaoka-dōri: half width, pavement's outer edge (the fronts). The exits are fitted to cw + 5.5 = 17.5, in the plazas. */
const RW = 5, FRONT = 7.5, EXIT_LINE = 17.5;
interface NS { c: number; half: number; pave: number; name: Named }
interface EW { z: number; half: number; way: 1 | -1; name: Named; short: Named }
const KAE: NS = { c: -62, half: 3.25, pave: 1.5, name: { ja: '楓筋', en: 'Kaede-suji' } };
const KAS: NS = { c: 40, half: 3.25, pave: 1.5, name: { ja: '樫筋', en: 'Kashi-suji' } };
const NSS = [KAE, KAS];
const KAMI: EW = { z: -66, half: 3.25, way: -1, name: { ja: '上ノ段通', en: 'Kaminodan-dōri' }, short: { ja: '上ノ段', en: 'Kaminodan' } };
const SHIMO: EW = { z: 62, half: 3.25, way: 1, name: { ja: '下ノ段通', en: 'Shimonodan-dōri' }, short: { ja: '下ノ段', en: 'Shimonodan' } };
const EWS = [KAMI, SHIMO];
/** Ishidan-zaka, the footpath. */
const ISH: [number, number] = [98, 102];
const ISH_NAME: Named = { ja: '石段坂', en: 'Ishidan-zaka' };
/** Block edges. */
const KAE0 = KAE.c - KAE.half - KAE.pave, KAE1 = KAE.c + KAE.half + KAE.pave; // −66.75, −57.25
const KAS0 = KAS.c - KAS.half - KAS.pave, KAS1 = KAS.c + KAS.half + KAS.pave; // 35.25, 44.75
const KAMI0 = KAMI.z - KAMI.half, KAMI1 = KAMI.z + KAMI.half; // −69.25, −62.75
const SHIMO0 = SHIMO.z - SHIMO.half, SHIMO1 = SHIMO.z + SHIMO.half; // 58.75, 65.25
/** The station quarter. */
const PLAZA_N: Rect = [KAE1, -22, -17, -FRONT];
const PLAZA_S: Rect = [KAE1, FRONT, -17, 24];
const HOUSE: Rect = [-45, -22, -27, -10];
/** The house's lift (ticket hall, street, café): its shaft in the house's north-east corner, doors facing south. */
const LIFT: Rect = [-30.3, -21.7, -28, -19.4];
const ARC = { x0: -23, x1: -17, z0: KAMI1, z1: -22 };
const SHOP_D = 9;
const SIDE: [number, number] = [-36.25, -33.75];
const PARK: Rect = [-17, 19.5, 23.25, 46.75];
/** The shrine: stair, terrace. */
const STAIR = { x0: -24, x1: -16, z0: KAMI0 - 6, z1: KAMI0 };
const TERRACE: Rect = [-40, -Z, 0, STAIR.z0];
const RISE = 3;
const SL = 5.2;
const WHITE = 'flat:#e9e9e4', YELLOW = 'flat:#e6a700', LANE = 'tile:#857e73', PLAZA = 'flat:#b3ab9b', PLAZA_BAND = 'flat:#8f877a', STONE = 'flat:#9a948a';
const FRAME: Record<Face, { rot?: 0 | 1 | 2 | 3 }> = { n: {}, s: { rot: 2 }, e: { rot: 1 }, w: { rot: 3 } };

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

// ── Names (invented, web-checked; docs/worldbuilding.md) ──
type Style = 'pan' | 'clinic' | 'kinko' | 'manshon' | 'shoten' | 'yashiki';
const styleOf = (id: string) => id.split('_')[0] as Style;
const NAMES: Record<Style, [string, string][]> = {
  pan: [['パン工房 こむぎ坂', 'Komugizaka Bakery'], ['珈琲 木洩坂', 'Komorezaka Coffee'], ['洋菓子 るぴなす', 'Rupinasu Cakes'], ['喫茶 葉かげ', 'Hakage Kissa']],
  clinic: [['あおば内科', 'Aoba Internal Medicine'], ['北丘薬局', 'Kitaoka Pharmacy'], ['こもれび歯科', 'Komorebi Dental']],
  kinko: [['川湊北信用金庫', 'Kawaminato-Kita Shinkin']],
  manshon: [['メゾン北丘', 'Maison Kitaoka'], ['青葉台コーポ', 'Aobadai Corpo'], ['楓ハイツ', 'Kaede Heights']],
  shoten: [['乾物 やまくら', 'Yamakura Dry Goods'], ['金物 丸十', 'Marujū Hardware'], ['茶舗 葉月園', 'Hazukien Tea'], ['花 みどり舎', 'Midorisha Flowers'], ['米穀 たわら屋', 'Tawaraya Rice']],
  yashiki: [],
};
const BOARD: Record<Style, [string, string]> = {
  pan: ['#f4f1e8', '#3a2a1e'], clinic: ['#f4f1e8', '#1d6a45'], kinko: ['#f4f1e8', '#1f3f7a'], manshon: ['#f4f1e8', '#3a3d41'], shoten: ['#2a2019', '#f1ead8'], yashiki: ['#e9e2d2', '#2a2019'],
};
const FAMILIES = ['中川', '藤井', '岡本', '森田', '西村', '松尾', '吉岡', '北村', '小野', '杉本'];

export function aobaStreet(c: Ctx, spec: SurfaceSpec, cw: number, dir: [number, number], cf: number) {
  const { b } = c;
  const st = c.station;
  if (Math.abs(cw + 5.5 - EXIT_LINE) > 0.01) throw new Error(`aobaStreet: the exits' building line moved (${cw + 5.5}); the plazas are fitted to ${EXIT_LINE}`);
  const seed = spec.seed;
  const r = rng(seed);
  const lines = linesAt(st.id).map((l) => l.id);
  const stName: Named = { ja: st.nameJa, en: st.nameRomaji };
  b.out.plot = { ...AOBA_PLOT };
  const holes: Rect[] = b.out.holes.map((q) => [...q] as Rect);
  const clearOf = (u: number, spans: [number, number][], m = 0) => !spans.some(([p, q]) => u > p - m && u < q + m);

  const at = (face: Face, x: number, z: number, fn: () => void) => b.with({ ...FRAME[face], t: [x, 0, z] }, fn);
  const signAt = (p: AnchorPt, content: SignContent, o?: SignOpts, y = GY) => b.sign(content, p[0], p[1] + y, p[2], [p[5], p[6]], p[3], p[4], o);
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
  const HOMES = ['machi', 'manshon'], SMALL = ['shophouse', 'machi'];
  /** What is not a building and must stay empty: lanes, yards, precincts (leftovers() fills the rest). */
  const reserved: Rect[] = [];
  /** A walkable lane's paving, its drain down the middle, and its name as a place. */
  const lanePave = (x0: number, z0: number, x1: number, z1: number, name?: Named, mat = LANE) => {
    b.deco(mat, x0, GY + 0.002, z0, x1, GY + 0.012, z1);
    if (x1 - x0 > z1 - z0) b.deco('flat:#6f6a60', x0, GY + 0.012, (z0 + z1) / 2 - 0.08, x1, GY + 0.016, (z0 + z1) / 2 + 0.08);
    else b.deco('flat:#6f6a60', (x0 + x1) / 2 - 0.08, GY + 0.012, z0, (x0 + x1) / 2 + 0.08, GY + 0.016, z1);
    reserved.push([x0, z0, x1, z1]);
    if (name) b.zone('street', x0 + 0.3, GY - 0.2, z0 + 0.3, x1 - 0.3, GY + 6, z1 - 0.3, name.ja, name.en, true);
    // Lamps on the walls along it.
    const len = Math.max(x1 - x0, z1 - z0), alongX = x1 - x0 > z1 - z0;
    for (let u = 6; u < len - 2; u += 14) {
      if (alongX) streetLamp(b, 'lamp_small', x0 + u, z0 + 0.25, [0, 1]);
      else streetLamp(b, 'lamp_small', x0 + 0.25, z0 + u, [1, 0]);
    }
  };
  let laneNo = 0;
  const laneName = (): Named => {
    const n = ++laneNo;
    return { ja: `青葉台 ${'一二三四五六七八'[n - 1] ?? n}番路地`, en: `Aobadai lane ${n}` };
  };

  // ═════════════════════════ Ground ═════════════════════════
  const carriage: Rect[] = [
    [-X, -RW, X, RW],
    ...NSS.map((s): Rect => [s.c - s.half, -Z, s.c + s.half, Z]),
    ...EWS.map((s): Rect => [-X, s.z - s.half, X, s.z + s.half]),
  ];
  const wellHoles: Rect[] = [...holes, LIFT].map(([x0, z0, x1, z1]) => [x0 - 0.05, z0 - 0.05, x1 + 0.05, z1 + 0.05]);
  b.slab('asphalt', -X, -Z, X, Z, -0.6, 0, wellHoles);
  b.slab('paver', -X, -Z, X, Z, 0, GY, [...wellHoles, ...carriage]);
  b.zone('street', -X, -0.3, -Z, X, 80, Z, `${st.nameJa}駅前`, `${st.nameRomaji} — street level`);
  b.block(-X - 1, -1, -Z - 1, -X, 60, Z + 1);
  b.block(X, -1, -Z - 1, X + 1, 60, Z + 1);
  b.block(-X, -1, -Z - 1, X, 60, -Z);
  b.block(-X, -1, Z, X, 60, Z + 1);
  b.out.district = { radius: 420, old: [-20, -40], oldRadius: 260, towers: 0 };

  // The plazas: granite setts in bands, edged where they meet the pavement.
  // Each band is cut round the stairwells and the exit house (which has its own floor).
  const uncovered: Rect[] = [...wellHoles, HOUSE];
  for (const [x0, z0, x1, z1] of [PLAZA_N, PLAZA_S]) {
    for (let x = x0; x < x1 - 0.1; x += 3) {
      const xe = Math.min(x + 3, x1) - 0.12;
      const cuts = uncovered.filter((q) => q[0] < xe && q[2] > x && q[1] < z1 && q[3] > z0).map((q): [number, number] => [q[1], q[3]]);
      for (const [za, ze] of between(cuts, z0, z1)) {
        // Where a cut covers only part of the band's width, pave the rest of the width beside it.
        const part = uncovered.filter((q) => q[0] < xe && q[2] > x && q[1] < ze && q[3] > za);
        if (!part.length) b.deco(PLAZA, x, GY + 0.002, za, xe, GY + 0.01, ze);
      }
      for (const q of uncovered.filter((q) => q[0] < xe && q[2] > x && q[1] < z1 && q[3] > z0)) {
        const za = Math.max(q[1], z0), ze = Math.min(q[3], z1);
        // (Not where the side piece would lie inside another cut: the house round Exit 1.)
        const free = (a: number, e: number) => !uncovered.some((o) => o !== q && o[0] < e && o[2] > a && o[1] < ze && o[3] > za);
        if (q[0] > x && free(x, q[0])) b.deco(PLAZA, x, GY + 0.002, za, q[0], GY + 0.01, ze);
        if (q[2] < xe && free(q[2], xe)) b.deco(PLAZA, q[2], GY + 0.002, za, xe, GY + 0.01, ze);
      }
    }
    b.deco(PLAZA_BAND, x0, GY + 0.003, z0 < 0 ? z1 - 0.3 : z0, x1, GY + 0.011, z0 < 0 ? z1 : z0 + 0.3);
  }
  b.zone('street', PLAZA_N[0] + 0.5, GY - 0.2, PLAZA_N[1] + 0.3, PLAZA_N[2] - 0.5, GY + 8, PLAZA_N[3], '青葉台駅 北口広場', 'Aobadai Station North Plaza', true);
  b.zone('street', PLAZA_S[0] + 0.5, GY - 0.2, PLAZA_S[1], PLAZA_S[2] - 0.5, GY + 8, PLAZA_S[3] - 0.3, '青葉台駅 南口広場', 'Aobadai Station South Plaza', true);
  reserved.push(PLAZA_N, PLAZA_S);

  // ═════════════════════════ Roads ═════════════════════════
  const streetsX = NSS.map((s): [number, number] => [s.c - s.half, s.c + s.half]);
  const zonesNS: [number, number][] = streetsX.map(([a, e]): [number, number] => [a - 9, e + 9]);
  const crossingsEW: [number, number][] = [[-RW - 9, RW + 9], ...EWS.map((s): [number, number] => [s.z - s.half - 8, s.z + s.half + 8])];
  // Kitaoka-dōri: a white centre line (no overtaking on a road this narrow: yellow), lane edge lines.
  for (let x = -X; x < X; x += 6) {
    if (!clearOf(x + 1.5, zonesNS)) continue;
    b.deco(YELLOW, x, 0.004, -0.08, x + 6, 0.01, 0.08);
    for (const s of [-1, 1]) b.deco(WHITE, x, 0.004, s * (RW - 0.5) - 0.05, x + 6, 0.01, s * (RW - 0.5) + 0.05);
  }
  const lanes0 = b.out.lanes.length;
  const busX: [number, number] = [-116, 82], taxiX = -25;
  roadKit(b, {
    X, Z, rw: RW, swOut: FRONT, streets: streetsX, seed, name: stName, at: { id: st.id, dir }, old: false, busy: 0.45, taxi: 0.12,
    junctions: [{ ja: '青葉台駅前', en: 'Aobadai-ekimae' }, { ja: '北丘二丁目', en: 'Kitaoka 2-chōme' }],
    roads: { main: { ja: '北丘通', en: 'Kitaoka-dōri' }, cross: NSS.map((s) => s.name) },
    flows: [0.5, 0.4], busX, taxiX, lit: [0, 1],
  });

  /** A signalled junction of a north–south street and an east–west one, short-arm poles on both. */
  const junction = (cx: number, hx: number, cz: number, hz: number, name: Named, ew: (1 | -1)[]) => {
    const flat = true;
    for (const sz of [-1, 1] as const) {
      const zc = cz + sz * (hz + 2.6);
      crosswalk(b, cx, zc, 2 * hx - 0.4, 3, false);
      pedSignal(b, cx - hx - 0.8, zc + sz * 2.0, [1, 0], 0, { flat, button: true });
      pedSignal(b, cx + hx + 0.8, zc + sz * 2.0, [-1, 0], 0, { flat, button: true });
    }
    for (const sx of [-1, 1] as const) {
      const xc = cx + sx * (hx + 2.6);
      crosswalk(b, xc, cz, 2 * hz - 0.4, 3, true);
      pedSignal(b, xc + sx * 2.0, cz - hz - 0.8, [0, 1], 1, { flat });
      pedSignal(b, xc + sx * 2.0, cz + hz + 0.8, [0, -1], 1, { flat });
    }
    // One way along the back street: its stop line across the whole width, a head on the far left corner.
    for (const sx of ew) {
      const lz = -sx;
      const xs = cx - sx * (hx + SL);
      b.deco(WHITE, Math.min(xs, xs - sx * 0.35), 0.004, cz - hz + 0.2, Math.max(xs, xs - sx * 0.35), 0.01, cz + hz - 0.2);
      shortSignal(b, cx + sx * (hx + 1.9), cz + lz * (hz + 1.5), [sx, 0], 0, name);
    }
    for (const sz of [1, -1] as const) {
      const lx = sz;
      const zs = cz - sz * (hz + SL);
      b.deco(WHITE, Math.min(cx, cx + lx * (hx - 0.2)), 0.004, Math.min(zs, zs - sz * 0.35), Math.max(cx, cx + lx * (hx - 0.2)), 0.01, Math.max(zs, zs - sz * 0.35));
      shortSignal(b, cx + lx * (hx + 1.5), cz + sz * (hz + 1.9), [0, sz], 1, name);
    }
    roadModel(b, 'sigbox', cx - hx - 2.6, GY, cz - hz - 3.2, [0, 1]);
    b.block(cx - hx - 2.96, GY, cz - hz - 3.46, cx - hx - 2.24, GY + 1.56, cz - hz - 2.94);
  };
  const stopsX = (sx: 1 | -1, x0: number): LanePart['stops'] =>
    NSS.map(({ c: cx, half }) => {
      const t = (cx - x0) * sx;
      return { at: t - half - SL - 0.5, axis: 0 as const, exit: t + half + SL };
    }).filter((q) => q.at > 2).sort((p, q) => p.at - q.at);
  for (const s of EWS) {
    for (const q of NSS) {
      const tag = q === KAE ? { ja: '西', en: '-nishi' } : { ja: '東', en: '-higashi' };
      junction(q.c, q.half, s.z, s.half, { ja: `${s.short.ja}${tag.ja}`, en: `${s.short.en}${tag.en}` }, [s.way]);
    }
    // One way: a single lane down the middle.
    const x0 = s.way > 0 ? -X : X, x1 = -x0;
    trafficLane(b, x0, s.z, x1, s.z, { speed: 30 / 3.6, flow: 1.2, use: 'minor', taxi: 0.05, halts: [], stops: stopsX(s.way, x0) });
    const boxes = NSS.map(({ c: cx, half }): [number, number] => [cx - half - 8, cx + half + 8]);
    for (const e of [-1, 1]) {
      let from = -X;
      for (const [p, q] of [...boxes, [X + 3, X + 3] as [number, number]].sort((m, n) => m[0] - n[0])) {
        if (p - from > 1) b.deco(WHITE, from, 0.004, s.z + e * (s.half - 0.5) - 0.05, p + 3, 0.01, s.z + e * (s.half - 0.5) + 0.05);
        from = q - 3;
      }
    }
    // Where Ishidan-zaka meets it: a zebra and bollards.
    crosswalk(b, (ISH[0] + ISH[1]) / 2, s.z, 2 * s.half - 0.4, 3.2, true);
    // One-way signs at both ends; 30 km/h.
    for (const x of [-X + 10, X - 10]) roadSign(b, 'speed30', x, s.z + s.way * (s.half - 0.4), [-s.way, 0], 0.6);
    roadSign(b, 'noentry', s.way > 0 ? X - 6 : -X + 6, s.z - s.way * (s.half - 0.4), [s.way, 0], 0.66);
    // Poles along the edge with the carriageway lights on them (the back streets have no pavement).
    const pz = s.z - s.way * (s.half - 0.35);
    poleLine(b, { axis: 'x', from: -X + 6, to: X - 6, at: pz, road: s.way > 0 ? 1 : -1, step: 24, skip: (u) => !clearOf(u, boxes, 2) || !clearOf(u, [ISH], 3) || !clearOf(u, [[STAIR.x0, STAIR.x1]], 4), drops: 0.7, cross: 6.2, name: stName });
  }
  // The kit laid the 筋' lanes with a stop at Kitaoka-dōri only: add the back streets' signals.
  for (const l of b.out.lanes.slice(lanes0)) {
    const dx = l.to[0] - l.from[0], dz = l.to[2] - l.from[2];
    if (Math.abs(dx) > 0.1 || Math.abs(dz) < 1) continue;
    if (!NSS.some((q) => Math.abs(l.from[0] - q.c) < q.half + 0.1)) continue;
    const uz = Math.sign(dz), more: LanePart['stops'] = [];
    for (const s of EWS) {
      const t = (s.z - l.from[2]) * uz;
      if (t - s.half - SL < 6 || t + s.half + SL > Math.abs(dz) - 4) continue;
      more.push({ at: t - s.half - SL - 0.5, axis: 1, exit: t + s.half + SL });
    }
    l.stops = [...l.stops, ...more].sort((p, q) => p.at - q.at);
  }
  // The 筋: lane edge lines, poles on one side, a lamp now and then on the other.
  for (const q of NSS) {
    for (const [z0, z1] of between(crossingsEW, -Z, Z)) for (const e of [-1, 1]) b.deco(WHITE, q.c + e * (q.half - 0.5) - 0.05, 0.004, z0, q.c + e * (q.half - 0.5) + 0.05, 0.01, z1);
    const px = q.c - (q.half + 0.6);
    poleLine(b, { axis: 'z', from: -Z + 6, to: Z - 6, at: px, road: 1, step: 24, skip: (u) => !clearOf(u, crossingsEW, 2), drops: 0.8, cross: 7.6, name: stName });
  }

  // ── Kitaoka-dōri's pavements: nothing of the kit's in a lane's mouth; guard rails at the kerb; poles on the north side ──
  const mouthsN: [number, number][] = [[-105.25, -102.75], ISH];
  const mouthsS: [number, number][] = [[-101.25, -98.75], ISH];
  {
    const mouths: Rect[] = [...mouthsN.map(([a, e]): Rect => [a - 0.6, -FRONT - 0.2, e + 0.6, -RW + 0.2]), ...mouthsS.map(([a, e]): Rect => [a - 0.6, RW - 0.2, e + 0.6, FRONT + 0.2])];
    for (const [x0, z0, x1, z1] of mouths) {
      const inside = (v: number[]) => v[0] > x0 && v[0] < x1 && v[2] > z0 && v[2] < z1;
      b.out.models = b.out.models.filter((m) => !(inside(m.pos) && m.kind === 'road' && m.pos[1] < GY + 1));
      b.out.signs = b.out.signs.filter((sg) => !(inside(sg.pos) && sg.normal !== null && sg.pos[1] > GY + 0.3 && (sg.pos[1] < GY + 4.6 || sg.content.k === 'roadboard')));
      b.out.boxes = b.out.boxes.filter((bx) => {
        const post = bx.max[1] < GY + 7 && bx.max[0] - bx.min[0] < 2.6 && bx.max[2] - bx.min[2] < 2.6;
        return !(bx.min[1] > -0.05 && bx.max[1] > 0.3 && post && inside([(bx.min[0] + bx.max[0]) / 2, 0, (bx.min[2] + bx.max[2]) / 2]));
      });
    }
    const gaps = kerbGaps(streetsX, busX, taxiX);
    for (const s of [-1, 1] as const) {
      const zr = s * (RW + 0.3);
      const mouthGaps = (s < 0 ? mouthsN : mouthsS).map(([a, e]) => [a - 0.6, e + 0.6]);
      // The plazas: no rail in front of them except by the taxi stand's ends.
      const open = [...zonesNS.map(([a, e]) => [a + 2, e - 2]), ...mouthGaps, [PLAZA_N[0] + 2, PLAZA_N[2] - 1], ...gaps.filter((k) => k.s === s).map((k) => [k.x0, k.x1])].sort((p, q) => p[0] - q[0]);
      let x = -X;
      for (const [from, to] of open.concat([[X, X]])) {
        for (let xa = x; xa + 2.5 <= from; xa += 2.5) {
          b.block(xa, GY, zr - 0.04, xa + 2.5, GY + 0.9, zr + 0.04);
          kerbRail(b, xa + 1.25, zr);
        }
        x = Math.max(x, to);
      }
    }
    poleLine(b, {
      axis: 'x', from: -X + 6, to: X - 6, at: -(RW + 0.55), road: 1, step: 26,
      skip: (u) => !clearOf(u, zonesNS, 1) || !clearOf(u, mouthsN, 2) || (u > HOUSE[0] - 2 && u < HOUSE[2] + 2),
      drops: 0.8, cross: 2 * RW + 3.0, wall: true, name: stName,
    });
  }

  // ═════════════════════════ The fronts on Kitaoka-dōri and the plazas ═════════════════════════
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
      if (acc.length >= 10 || rem < least + min) return;
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
    const sty = styleOf(id), [bg, fg] = BOARD[sty];
    if (sty === 'yashiki') {
      if (p.plate) label(p.plate, nextName('family', FAMILIES), undefined, bg, fg);
      return;
    }
    const [ja, en] = nextName(sty, NAMES[sty]);
    if (p.name) label(p.name, ja, en, bg, fg);
    if (p.roof) label(p.roof, ja, en, '#1f3f7a', '#ffffff');
    if (p.vertical) upright(p.vertical, ja.split(' ').pop()!, '#f4f1e8', '#1d6a45');
    if (p.atm) label(p.atm, 'ATM', '24h', '#1f3f7a', '#ffffff');
  };
  /**
   * A row of pieces along a frontage: on `face`, the building line at `line`, from u0 to u1 along it,
   * spread with equal gaps. What is between them and behind them is left to the walk and leftovers().
   */
  const row = (kind: string, A: Anchors, face: Face, line: number, u0: number, u1: number, ids: string[], letter: (id: string, a: Anchor) => void): Rect[] => {
    const list = pack(A, u1 - u0, ids, 3.2, 0.3);
    const total = list.reduce((t, id) => t + A[id].w, 0);
    const gap = list.length ? (u1 - u0 - total) / (list.length + 1) : 0;
    let u = u0 + gap;
    const placed: Rect[] = [];
    const alongX = face === 'n' || face === 's';
    for (const id of list) {
      const a = A[id], uc = u + a.w / 2;
      // A piece facing 's' or 'e' is turned: its local x runs the other way along the street.
      const [x, z] = alongX ? [uc, line] : [line, uc];
      piece(kind, A, id, face, x, z, (q) => letter(id, q));
      placed.push(alongX ? [u, face === 'n' ? line : line - a.d, u + a.w, face === 'n' ? line + a.d : line] : [face === 'w' ? line : line - a.d, u, face === 'w' ? line + a.d : line, u + a.w]);
      u += a.w + gap;
    }
    return placed;
  };
  const F = AOBAFRONT;
  const ids = (pre: string[], plaza = false) => Object.keys(F).filter((k) => pre.includes(styleOf(k)) && k.endsWith('_p') === plaza);
  const SHOPS_ST = ids(['pan', 'clinic', 'kinko', 'manshon', 'shoten']);
  const HOUSES_ST = ids(['yashiki', 'shoten', 'manshon']);
  const PLAZA_IDS = ids(['pan', 'clinic', 'manshon', 'shoten'], true);
  const fronts = (face: Face, line: number, u0: number, u1: number, list: string[]) => row('aobafront', F, face, line, u0, u1, list, (id, a) => letterFront(id, a.pts));
  // North side (face 's'), west to east.
  fronts('s', -FRONT, -X + 0.3, -105.25 - 0.3, HOUSES_ST);
  fronts('s', -FRONT, -102.75 + 0.3, KAE0 - 0.3, HOUSES_ST);
  fronts('s', -FRONT, -8 + 0.3, KAS0 - 12 - 0.3, SHOPS_ST);
  fronts('s', -FRONT, KAS1 + 0.3, ISH[0] - 0.3, SHOPS_ST);
  fronts('s', -FRONT, ISH[1] + 0.3, X - 0.3, HOUSES_ST);
  // South side (face 'n').
  fronts('n', FRONT, -X + 0.3, -101.25 - 0.3, HOUSES_ST);
  fronts('n', FRONT, -98.75 + 0.3, KAE0 - 0.3, HOUSES_ST);
  fronts('n', FRONT, PLAZA_S[2] + 0.3, KAS0 - 12 - 0.3, SHOPS_ST);
  fronts('n', FRONT, KAS1 + 0.3, ISH[0] - 0.3, SHOPS_ST);
  fronts('n', FRONT, ISH[1] + 0.3, X - 0.3, HOUSES_ST);
  // The south plaza's back edge, and the lane behind it to the park.
  fronts('n', PLAZA_S[3], KAE1 + 12 + 0.3, PLAZA_S[2] - 0.3, PLAZA_IDS);

  // ═════════════════════════ The station quarter ═════════════════════════
  // ── The exit house over Exit 1 (its inside, below its ceiling: the stair comes up in it) ──
  {
    const [x0, z0, x1, z1] = HOUSE, xm = (x0 + x1) / 2;
    reserved.push(HOUSE);
    piece('aoba', AOBA, 'house', 's', xm, z1, (a) => {
      const p = a.pts;
      label(p.name, `${st.nameJa}駅`, `${st.nameRomaji} Station`, '#f4f1e8', '#2f4a2c');
      signAt(p.clock, { k: 'clock' });
    }, false);
    const T = 0.3, G = 4.2, H = 7.8, door = [xm - 6 + 0.22, xm + 6 - 0.22];
    // Walls: colliders the model's skins' thickness, their inner faces a hair inside them (no fighting the skins).
    const IN = 'flat:#ece6d6', UP = 'flat:#efe7d4', f = 0.012;
    const walls = (ya: number, yb: number, front: boolean, mat: string) => {
      b.block(x0, ya, z0, x1, yb, z0 + T);
      b.block(x0, ya, z0, x0 + T, yb, z1);
      b.block(x1 - T, ya, z0, x1, yb, z1);
      b.deco(mat, x0 + T, ya, z0 + T, x1 - T, yb, z0 + T + f);
      b.deco(mat, x0 + T, ya, z0 + T, x0 + T + f, yb, z1 - T);
      b.deco(mat, x1 - T - f, ya, z0 + T, x1 - T, yb, z1 - T);
      const spans: [number, number][] = front ? [[x0, door[0]], [door[1], x1]] : [[x0, x1]];
      for (const [a, e] of spans) {
        b.block(a, ya, z1 - T, e, yb, z1);
        b.deco(mat, Math.max(a, x0 + T), ya, z1 - T - f, Math.min(e, x1 - T), yb, z1 - T);
      }
    };
    walls(GY, GY + G, true, IN);
    walls(GY + G, GY + H - 0.2, false, UP);
    b.block(x0, GY + H - 0.2, z0, x1, GY + H, z1);

    // The stair up to the café: along the north wall, climbing east, its foot 2.7 m off the west wall.
    const run = Math.round(G * 1.72 * 100) / 100;
    const SW: Rect = [x0 + 3, z0 + T, x0 + 3 + run, z0 + T + 1.5];
    stairs(b, { x0: SW[0], x1: SW[2], z0: SW[1], z1: SW[3], yLow: GY, yHigh: GY + G, mat: 'wood:#8a6a4a' });
    // The first floor: plaster ceiling below, boards above, open over the stair and the lift.
    const cut = [SW, LIFT];
    b.slab('flat:#f1ede2', x0 + T, z0 + T, x1 - T, z1 - T, GY + G - 0.25, GY + G - 0.03, cut);
    b.slab('wood:#a07c56', x0 + T, z0 + T, x1 - T, z1 - T, GY + G - 0.03, GY + G, cut);
    for (const z of [z0 + 5, z0 + 9]) b.deco('light', x0 + 2, GY + G - 0.29, z - 0.1, x1 - 2, GY + G - 0.25, z + 0.1);
    // Tiles on the floor round the stair down, the stair up and the lift.
    for (const [hx0, hz0, hx1, hz1] of [
      [SW[2], z0 + T, LIFT[0], -16.7], [LIFT[0], LIFT[3], x1 - T, -16.7], [LIFT[2], z0 + T, x1 - T, LIFT[3]], [x0 + T, SW[3], SW[2], -16.7], [x0 + T, z0 + T, SW[0], SW[3]],
      [x0 + T, -12.5, x1 - T, z1 - T], [x0 + T, -16.7, -40.7, -12.5], [-30.3, -16.7, x1 - T, -12.5],
    ] as Rect[]) {
      b.deco('flat:#c9c2b2', hx0, GY + 0.002, hz0, hx1, GY + 0.01, hz1);
    }
    b.zone('street', x0 + 0.5, GY - 0.2, z0 + 0.5, x1 - 0.5, GY + G - 0.4, z1 - 0.5, `${st.nameJa}駅 駅舎`, `${st.nameRomaji} Station house`);
    // On the walls inside: the station's name, the line's guide over the stair, the café up the other.
    b.sign({ k: 'guide', ja: `${st.nameJa}駅`, en: `${st.nameRomaji} Sta.`, bg: 'navy', badges: lines, num: '1' }, xm, GY + 3.2, z0 + T + 0.03, [0, 1], 3.2, 0.5);
    b.sign({ k: 'label', text: '2階 喫茶あおば', sub: 'Kissa Aoba café upstairs', fg: '#f4f1e8', bg: '#5a3e2b' }, x0 + T + 0.03, GY + 2.5, (SW[3] - 16.7) / 2 + 0.6, [1, 0], 1.8, 0.42);

    // The café upstairs: under the roof, sash windows all round (seen from inside as bright panes).
    {
      const Y = GY + G, top = GY + H - 0.2;
      b.box('flat:#f1ede2', x0 + T, top - 0.2, z0 + T, x1 - T, top, z1 - T);
      for (const z of [z0 + 4, z0 + 8]) b.deco('light', x0 + 2.5, top - 0.24, z - 0.12, x1 - 2.5, top - 0.2, z + 0.12);
      const pane = (ax: number, az: number, ex: number, ez: number) => {
        b.deco('glow:#e9f0ee', ax, Y + 0.6, az, ex, Y + 2.6, ez);
        b.deco('wood:#6b4f37', ax, Y + 0.52, az, ex, Y + 0.6, ez);
      };
      for (const c of [-7.2, -4.8, 4.8, 7.2]) pane(xm + c - 0.8, z1 - T - f - 0.01, xm + c + 0.8, z1 - T - f);
      for (const z of [z0 + 3, z0 + 6, z0 + 9]) {
        pane(x0 + T + f, z - 0.7, x0 + T + f + 0.01, z + 0.7);
        pane(x1 - T - f - 0.01, z - 0.7, x1 - T - f, z + 0.7);
      }
      // A rail round the opening over the stair (its top, east end open to step off).
      b.box('metal:#6b6f73', SW[0] - 0.05, Y, SW[3], SW[2], Y + 1.0, SW[3] + 0.05);
      b.box('metal:#6b6f73', SW[0] - 0.05, Y, SW[1], SW[0], Y + 1.0, SW[3]);
      // The counter on the west wall, a shelf of cups behind it; tables by the front windows.
      b.box('wood:#6b4f37', x0 + T + 0.6, Y, -18.6, x0 + T + 1.3, Y + 1.0, -12.4);
      b.deco('wood:#c9a87c', x0 + T + 0.55, Y + 1.0, -18.65, x0 + T + 1.35, Y + 1.04, -12.35);
      b.deco('wood:#8a6a4a', x0 + T + f, Y + 1.5, -18.4, x0 + T + 0.3, Y + 1.53, -12.6);
      b.deco('flat:#d9d4c8', x0 + T + 0.05, Y + 1.53, -18.2, x0 + T + 0.25, Y + 1.65, -12.8);
      const table = (tx: number, tz: number) => {
        b.deco('wood:#8a6a4a', tx - 0.4, Y + 0.7, tz - 0.4, tx + 0.4, Y + 0.74, tz + 0.4);
        b.deco('metal:#2b2f34', tx - 0.04, Y, tz - 0.04, tx + 0.04, Y + 0.7, tz + 0.04);
        b.block(tx - 0.4, Y, tz - 0.4, tx + 0.4, Y + 0.74, tz + 0.4);
        for (const s of [-1, 1]) {
          b.box('wood:#6b4f37', tx + s * 0.75 - 0.2, Y, tz - 0.2, tx + s * 0.75 + 0.2, Y + 0.45, tz + 0.2);
          b.deco('wood:#6b4f37', tx + s * 0.95 - 0.03, Y + 0.45, tz - 0.2, tx + s * 0.95 + 0.03, Y + 0.9, tz + 0.2);
        }
      };
      for (const tx of [-40, -35.6, -31.2]) table(tx, -11.6);
      for (const tx of [-38.5, -34]) table(tx, -15.4);
      b.zone('street', x0 + 0.5, Y - 0.2, z0 + 0.5, x1 - 0.5, top - 0.3, z1 - 0.5, '喫茶あおば', 'Kissa Aoba (café)');
    }

    // The lift: ticket hall, street, café. Below, its lobby opens off Exit 1's (through.ts).
    at('s', (LIFT[0] + LIFT[2]) / 2, LIFT[3], () => lift(b, {
      mat: IN, levels: [{ y: cf, ja: '改札口', en: 'Ticket gates' }, { y: GY, ja: '駅舎 1階', en: 'Station house' }, { y: GY + G, ja: '2階 喫茶', en: 'Café, 1st floor' }],
    }));
    {
      const [lx0, , lx1, lz1] = LIFT, ze = -16.0, wall = 'tile:#eef2ea';
      b.box('floor:#cdcbc1', lx0, cf - 0.5, lz1, lx1, cf, ze);
      for (const [a, e] of [[lx0 - 0.3, lx0], [lx1, lx1 + 0.3]]) b.box(wall, a, cf, lz1 - 0.3, e, cf + 3.2, ze - 0.3);
      b.box('ceil', lx0 - 0.3, cf + 2.7, lz1, lx1 + 0.3, cf + 3.2, ze - 0.3);
      b.deco('light', lx0 + 0.6, cf + 2.66, lz1 + 0.8, lx1 - 0.6, cf + 2.7, lz1 + 1.6);
      b.zone('passage', lx0, cf - 0.2, lz1, lx1, cf + 2.5, ze, '駅舎エレベーター 乗り場', 'Station house lift (below)');
    }
  }

  // ── Hazuki arcade: the walk, its roof and gates, the shops either side ──
  {
    const name: Named = { ja: '葉月商店街', en: 'Hazuki Arcade' };
    const xm = (ARC.x0 + ARC.x1) / 2;
    b.deco('tile:#bdb39f', ARC.x0, GY + 0.002, ARC.z0, ARC.x1, GY + 0.01, ARC.z1);
    for (let z = ARC.z0 + 2; z < ARC.z1; z += 4) b.deco('flat:#8f877a', ARC.x0, GY + 0.01, z, ARC.x1, GY + 0.013, z + 0.25);
    reserved.push([ARC.x0, ARC.z0, ARC.x1, ARC.z1]);
    b.zone('street', ARC.x0 + 0.3, GY - 0.2, ARC.z0 + 0.3, ARC.x1 - 0.3, GY + 7, ARC.z1 - 0.3, name.ja, name.en, true);
    at('n', xm, ARC.z0, () => b.model('aoba', 'roof', 0, GY, 0, 1));
    for (const z of [ARC.z0 + 0.3, ARC.z1 - 0.3]) {
      piece('aoba', AOBA, 'gate', 'n', xm, z, (a) => {
        for (const s of [-1, 1]) b.block(s * 3.25 - 0.3, GY, -0.3, s * 3.25 + 0.3, GY + 6.6, 0.3);
        label(a.pts.name_f, name.ja, 'Hazuki Arcade', '#f4f1e8', '#2f6b45');
        label(a.pts.name_b, name.ja, 'Hazuki Arcade', '#f4f1e8', '#2f6b45');
      }, false);
    }
    const SH = ['s5a', 's6a', 's7a', 's5b', 's6b', 's7b', 's6c'];
    /** Shops packing [u0, u1] along the arcade on one side; what is left at the end closed by a party wall. */
    const shops = (face: Face, line: number, u0: number, u1: number) => {
      const list = pack(AOBA, u1 - u0, SH, 1.0, 0);
      let u = u0;
      for (const id of list) {
        const { w, h } = AOBA[id], hw = w / 2, d = SHOP_D;
        // Open to walk into (build_aoba.py shop): walls, the display tables either side of the way in, the back shelves, the till.
        piece('aoba', AOBA, id, face, line, u + w / 2, () => {
          for (const [a, e] of [[-hw, -hw + 0.3], [hw - 0.3, hw]]) b.block(a, GY, 0, e, GY + h, d);
          b.block(-hw, GY, d - 1.1, hw, GY + 3.4, d);
          b.block(-hw, GY + 3.4, 0, hw, GY + h, d);
          b.block(-hw + 0.4, GY, 0.3, -0.8, GY + 1.0, 1.4);
          b.block(0.8, GY, 0.3, hw - 0.4, GY + 1.0, 1.4);
          b.block(hw - 1.5, GY, 3.2, hw - 0.4, GY + 1.15, 4.4);
        }, false);
        u += w;
      }
      if (u1 - u > 0.05) {
        const [a0, a1] = face === 'e' ? [line - SHOP_D, line] : [line, line + SHOP_D];
        b.box('flat:#d8d0bc', a0, GY, u, a1, GY + 6.6, u1);
      }
    };
    shops('e', ARC.x0, ARC.z0 + 0.0, ARC.z1);
    shops('w', ARC.x1, ARC.z0, SIDE[0]);
    shops('w', ARC.x1, SIDE[1], ARC.z1);
    // The side passage through the east shops, on to the houses' lane.
    lanePave(ARC.x1, SIDE[0], ARC.x1 + SHOP_D, SIDE[1], { ja: '葉月商店街 抜け道', en: 'Hazuki Arcade side passage' });
  }
  // ── The convenience store on the corner of the plaza and Kitaoka-dōri ──
  {
    const k = KONBINI.corner;
    at('w', -17, -FRONT - 0.5 - k.w / 2, () => konbini(b, { type: 'corner', chain: 'hinode' }));
    reserved.push([-17, -FRONT - 0.5 - k.w, -17 + k.d, -FRONT - 0.5]);
  }
  // ── Okamori shrine: the torii, the stone stair, the terrace and its walls, the precinct ──
  {
    const name: Named = { ja: '丘守神社', en: 'Okamori Shrine' };
    const xm = (STAIR.x0 + STAIR.x1) / 2;
    reserved.push([TERRACE[0], -Z, TERRACE[2], KAMI0]);
    piece('aoba', AOBA, 'torii', 's', xm, KAMI0 - 0.4, (a) => {
      for (const s of [-1, 1]) b.block(s * 1.9 - 0.4, GY, -0.4, s * 1.9 + 0.4, GY + 4.6, 0.4);
      label(a.pts.name, '丘守', undefined, '#4a4440', '#e9e2d2');
    }, false);
    at('s', xm, KAMI0, () => b.model('aoba', 'stair', 0, GY, 0, 1));
    b.ramp(STAIR.x0, STAIR.z0, STAIR.x1, STAIR.z1, GY, GY + RISE, [0, -1]);
    for (const x of [STAIR.x0 - 0.35, STAIR.x1]) b.block(x, GY, STAIR.z0, x + 0.35, GY + RISE + 0.6, STAIR.z1);
    for (const [wx0, wx1] of [[TERRACE[0], STAIR.x0], [STAIR.x1, TERRACE[2]]] as [number, number][]) {
      at('s', (wx0 + wx1) / 2, KAMI0, () => b.model('aoba', 'wall', 0, GY, 0, 1));
      b.block(wx0, GY, STAIR.z0, wx1, GY + RISE, KAMI0);
      b.block(wx0, GY + RISE, KAMI0 - 0.6, wx1, GY + RISE + 1.0, KAMI0);
      b.block(wx0, GY + RISE, STAIR.z0 + 0.8, wx1, GY + RISE + 1.0, KAMI0 - 0.6);
    }
    // The terrace itself: stone to its top, its sides fenced.
    b.box('flat:#8a8478', TERRACE[0], GY, TERRACE[1], TERRACE[2], GY + RISE, TERRACE[3]);
    for (const x of [TERRACE[0], TERRACE[2] - 0.3]) {
      b.box('flat:#b3ada2', x, GY + RISE, TERRACE[1], x + 0.3, GY + RISE + 1.0, KAMI0 - 0.6);
    }
    at('s', xm, TERRACE[3], () => {
      b.model('aoba', 'precinct', 0, GY + RISE, 0, 1);
      const P = AOBA.precinct.pts, Y = GY + RISE;
      for (const k of ['_hall', '_office', '_basin']) {
        const q = P[k];
        b.block(q[0] - q[3] / 2, Y, q[2] - q[4] / 2, q[0] + q[3] / 2, Y + 4, q[2] + q[4] / 2);
      }
      for (const o of [-1, 1]) {
        b.block(o * 2.4 - 0.35, Y, 1.25, o * 2.4 + 0.35, Y + 2.1, 1.95);
        b.block(o * 2.0 - 0.35, Y, 3.1, o * 2.0 + 0.35, Y + 1.7, 4.1);
      }
      const ex = AOBA.precinct.w / 2 - 6.0;
      b.block(ex - 0.15, Y, 1.8, ex + 0.15, Y + 2.0, 5.0);
    });
    const Y = GY + RISE;
    for (const [x, z, k] of [[-37, -82, 'camphor'], [-31, -83.5, 'cedar'], [-9, -83.5, 'cedar'], [-3, -82, 'camphor'], [-36, -77, 'momiji'], [-4, -77.5, 'momiji']] as [number, number, TreeKind][]) {
      modelTree(b, k, x, z, 'a', Y, true);
    }
    // Lamps on the terrace (streetLamp stands at street level, so placed here at the terrace's height).
    for (const x of [-34, -6]) {
      roadModel(b, 'lamp_park', x, Y, -76.2, [0, 1]);
      b.block(x - 0.12, Y, -76.32, x + 0.12, Y + 3, -76.08);
    }
    b.zone('street', TERRACE[0] + 1.5, Y - 0.2, TERRACE[1] + 0.4, TERRACE[2] - 1.5, Y + 8, TERRACE[3] - 0.3, name.ja, name.en, true);
    b.zone('street', STAIR.x0 + 0.5, GY - 0.2, STAIR.z0 + 0.3, STAIR.x1 - 0.5, Y + 3, STAIR.z1 - 0.2, '丘守神社 石段', 'Okamori Shrine steps', true);
  }
  // ── The pocket park south of Kitaoka-dōri ──
  {
    const [x0, z0, x1, z1] = PARK;
    reserved.push(PARK);
    b.deco('flat:#a89c84', x0, GY + 0.002, z0, x1, GY + 0.01, z1);
    b.deco('flat:#6f8f5a', x0 + 3, GY + 0.01, z0 + 6, x1 - 8, GY + 0.014, z1 - 4);
    b.zone('street', x0 + 0.5, GY - 0.2, z0 + 0.5, x1 - 0.5, GY + 6, z1 - 0.5, 'あおば公園', 'Aoba Park', true);
    let n = 0;
    for (let x = x0 + 2; x < x1 - 1; x += 7) for (const z of [z0 + 2.5, z1 - 1.8]) modelTree(b, n++ % 3 ? 'cherry' : 'zelkova', x, z, n % 2 ? 'a' : 'b', GY, true);
    for (const x of [x0 + 9, x0 + 23]) {
      roadModel(b, 'bench_s', x, GY, z0 + 5, [0, 1]);
      b.block(x - 0.95, GY, z0 + 4.6, x + 0.95, GY + 0.6, z0 + 5.4);
    }
    for (const [x, z] of [[x0 + 4, z0 + 12], [x1 - 5, z0 + 12], [x0 + 18, z1 - 6]]) streetLamp(b, 'lamp_park', x, z, [0, 1]);
    vending(b, x1 - 1.0, GY, z0 + 1.2, [-1, 0], 'vending', 'old');
  }
  // ── Trees and lamps on the plazas; a pylon at Exit 2 ──
  {
    for (const [x, z] of [[-54, -19], [-50, -12], [-54, 20], [-22, 20], [-48, 21]]) modelTree(b, 'zelkova', x, z, 'a', GY, true);
    for (const [x, z, f] of [[-52, -15.5, 1], [-20, -13, 1], [-52, 16, -1], [-25, 12, -1]] as [number, number, 1 | -1][]) streetLamp(b, 'lamp_park', x, z, [0, f]);
    const P = KITACITY.pylon.pts;
    for (const q of holes.filter((h) => h[1] > 0)) {
      const zm = (q[1] + q[3]) / 2;
      at('e', q[2] + 1.6, zm, () => {
        b.model('kitacity', 'pylon', 0, GY, 0, 0);
        b.block(-0.62, GY, -0.16, 0.62, GY + 4.2, 0.16);
        for (const k of ['f', 'b']) {
          const p = P[k];
          b.sign({ k: 'guide', ja: `${st.nameJa}駅`, en: `${st.nameRomaji} Sta.`, bg: 'navy', badges: lines, num: '2' }, p[0], p[1] + GY + 0.95, p[2], [p[5], p[6]], p[3], 0.5);
          b.sign({ k: 'areamap', station: st.id }, p[0], p[1] + GY - 0.3, p[2], [p[5], p[6]], p[3], 1.5);
        }
      });
    }
  }

  // ═════════════════════════ Lanes ═════════════════════════
  // North: lane x −104 street to street; lane z −35 west of Kaede-suji; the yokochō to the coin park; the houses' lane.
  lanePave(-105.25, KAMI1, -102.75, -FRONT, laneName());
  lanePave(-X, -36.25, KAE0, -33.75, laneName());
  lanePave(KAE1, -42.25, -32, -39.75, { ja: '楓小路', en: 'Kaede-kōji' });
  lanePave(-8, SIDE[0], KAS0, SIDE[1], laneName());
  // South: lane x −100; the lane behind the plaza's row to the park; lane z 33 east of Kashi-suji.
  lanePave(-101.25, FRONT, -98.75, SHIMO0, laneName());
  lanePave(KAE1, 34, PARK[0], 36.5, laneName());
  lanePave(KAS1, 31.75, ISH[0], 34.25, laneName());
  // Ishidan-zaka: stone steps in flights, a handrail, from back street to back street.
  for (const [z0, z1] of [[KAMI1, -FRONT], [FRONT, SHIMO0]]) {
    b.deco(STONE, ISH[0], GY + 0.002, z0, ISH[1], GY + 0.012, z1);
    for (let z = z0 + 3; z < z1 - 1; z += 3) b.deco('flat:#7d776d', ISH[0], GY + 0.012, z, ISH[1], GY + 0.016, z + 0.12);
    reserved.push([ISH[0], z0, ISH[1], z1]);
    b.zone('street', ISH[0] + 0.3, GY - 0.2, z0 + 0.3, ISH[1] - 0.3, GY + 6, z1 - 0.3, ISH_NAME.ja, ISH_NAME.en, true);
    for (let z = z0 + 8; z < z1 - 4; z += 16) streetLamp(b, 'lamp_small', ISH[0] + 0.25, z, [1, 0]);
    for (const z of [z0 + 0.4, z1 - 0.4]) for (const x of [ISH[0] + 0.6, ISH[1] - 0.6]) {
      roadModel(b, 'bollard', x, GY, z, [0, 1]);
      b.block(x - 0.15, GY, z - 0.15, x + 0.15, GY + 0.9, z + 0.15);
    }
  }

  // ═════════════════════════ The rows behind the fronts ═════════════════════════
  const interiors: Rect[] = [];
  // ── North of Kitaoka-dōri ──
  // NW: Kaminodan row, Kaede-suji row (gap for the lane at z −35), the interior between the lanes.
  fillRect(-X + 0.3, KAMI1 + 0.15, -105.25 - 0.3, KAMI1 + 12, 'n', HOMES);
  fillRect(-102.75 + 0.3, KAMI1 + 0.15, KAE0 - 0.3, KAMI1 + 12, 'n', HOMES);
  fillRect(KAE0 - 12, KAMI1 + 12.3, KAE0 - 0.15, -36.25 - 0.3, 'e', SMALL);
  fillRect(KAE0 - 12, -33.75 + 0.3, KAE0 - 0.15, -FRONT - 12.3, 'e', SMALL);
  for (const [a, e] of [[-X + 0.3, -105.25 - 0.3], [-102.75 + 0.3, KAE0 - 12.3]]) {
    fillRect(a, KAMI1 + 12.3, e, -36.25 - 0.15, 's', HOMES);
    fillRect(a, -33.75 + 0.15, e, -FRONT - 12.3, 'n', HOMES);
  }
  interiors.push([-X, KAMI1 + 12, KAE0 - 12, -FRONT - 12]);
  // N-station: Kaede-suji row (split by the yokochō), Kaminodan row west of the arcade, the shops' backs.
  fillRect(KAE1 + 0.15, KAMI1 + 0.3, KAE1 + 12, -42.25 - 0.3, 'w', SMALL);
  fillRect(KAE1 + 0.15, -39.75 + 0.3, KAE1 + 12, PLAZA_N[1] - 0.3, 'w', SMALL);
  fillRect(KAE1 + 12.3, KAMI1 + 0.15, ARC.x0 - SHOP_D - 0.3, KAMI1 + 12, 'n', SMALL);
  interiors.push([KAE1 + 12, KAMI1 + 12, ARC.x0 - SHOP_D, HOUSE[1]]);
  // East of the arcade: Kaminodan row, Kashi-suji row (gap for the houses' lane), houses either side of that lane.
  fillRect(ARC.x1 + SHOP_D + 0.3, KAMI1 + 0.15, KAS0 - 12.3, KAMI1 + 12, 'n', HOMES);
  fillRect(KAS0 - 12, KAMI1 + 0.3, KAS0 - 0.15, SIDE[0] - 0.3, 'e', SMALL);
  fillRect(KAS0 - 12, SIDE[1] + 0.3, KAS0 - 0.15, -FRONT - 0.3, 'e', SMALL);
  fillRect(ARC.x1 + SHOP_D + 0.3, KAMI1 + 12.3, KAS0 - 12.3, SIDE[0] - 0.15, 's', HOMES);
  fillRect(ARC.x1 + SHOP_D + 0.3, SIDE[1] + 0.15, KAS0 - 12.3, -FRONT - 12.3, 'n', HOMES);
  interiors.push([ARC.x1 + SHOP_D, KAMI1 + 12, KAS0 - 12, -FRONT - 12]);
  // NE: Kaminodan row, Kashi-suji row, the interior either side of Ishidan-zaka.
  fillRect(KAS1 + 0.3, KAMI1 + 0.15, ISH[0] - 0.3, KAMI1 + 12, 'n', HOMES);
  fillRect(ISH[1] + 0.3, KAMI1 + 0.15, X - 0.3, KAMI1 + 12, 'n', HOMES);
  fillRect(KAS1 + 0.15, KAMI1 + 12.3, KAS1 + 12, -FRONT - 12.3, 'w', SMALL);
  fillRect(KAS1 + 12.3, KAMI1 + 12.3, ISH[0] - 0.15, -FRONT - 12.3, 'e', HOMES);
  fillRect(ISH[1] + 0.15, KAMI1 + 12.3, X - 0.3, -FRONT - 12.3, 'w', HOMES);
  interiors.push([KAS1 + 12, KAMI1 + 12, ISH[0], -FRONT - 12], [ISH[1], KAMI1 + 12, X, -FRONT - 12]);
  // ── South of Kitaoka-dōri ──
  fillRect(-X + 0.3, SHIMO0 - 12, -101.25 - 0.3, SHIMO0 - 0.15, 's', HOMES);
  fillRect(-98.75 + 0.3, SHIMO0 - 12, KAE0 - 0.3, SHIMO0 - 0.15, 's', HOMES);
  fillRect(KAE0 - 12, FRONT + 12.3, KAE0 - 0.15, SHIMO0 - 12.3, 'e', SMALL);
  fillRect(-X + 0.3, FRONT + 12.3, -101.25 - 0.15, SHIMO0 - 12.3, 'e', HOMES);
  fillRect(-98.75 + 0.15, FRONT + 12.3, KAE0 - 12.3, SHIMO0 - 12.3, 'w', HOMES);
  interiors.push([-X, FRONT + 12, KAE0 - 12, SHIMO0 - 12]);
  // S-station: Kaede-suji row (gap for the lane at z 34 … 36.5), houses on that lane, Shimonodan row, Kashi-suji row.
  fillRect(KAE1 + 0.15, PLAZA_S[3] + 0.3, KAE1 + 12, 34 - 0.3, 'w', SMALL);
  fillRect(KAE1 + 0.15, 36.5 + 0.3, KAE1 + 12, SHIMO0 - 0.3, 'w', SMALL);
  fillRect(KAE1 + 12.3, 36.5 + 0.15, PARK[0] - 0.3, SHIMO0 - 12.3, 'n', HOMES);
  fillRect(KAE1 + 12.3, SHIMO0 - 12, KAS0 - 12.3, SHIMO0 - 0.15, 's', HOMES);
  fillRect(KAS0 - 12, FRONT + 0.3, KAS0 - 0.15, SHIMO0 - 0.3, 'e', SMALL);
  interiors.push([KAE1 + 12, 36.5, PARK[0], SHIMO0 - 12]);
  // SE: Shimonodan row, Kashi-suji row (gap for the lane at z 33), the interior either side of Ishidan-zaka.
  fillRect(KAS1 + 0.3, SHIMO0 - 12, ISH[0] - 0.3, SHIMO0 - 0.15, 's', HOMES);
  fillRect(ISH[1] + 0.3, SHIMO0 - 12, X - 0.3, SHIMO0 - 0.15, 's', HOMES);
  fillRect(KAS1 + 0.15, FRONT + 12.3, KAS1 + 12, 31.75 - 0.3, 'w', SMALL);
  fillRect(KAS1 + 0.15, 34.25 + 0.3, KAS1 + 12, SHIMO0 - 12.3, 'w', SMALL);
  fillRect(KAS1 + 12.3, FRONT + 12.3, ISH[0] - 0.3, 31.75 - 0.15, 's', HOMES);
  fillRect(KAS1 + 12.3, 34.25 + 0.15, ISH[0] - 0.3, SHIMO0 - 12.3, 'n', HOMES);
  fillRect(ISH[1] + 0.15, FRONT + 12.3, X - 0.3, SHIMO0 - 12.3, 'w', HOMES);
  interiors.push([KAS1 + 12, FRONT + 12, ISH[0], SHIMO0 - 12], [ISH[1], FRONT + 12, X, SHIMO0 - 12]);
  // ── Beyond the back streets: rows to the plot's edge ──
  for (const [a, e] of between([[KAE0, KAE1], [TERRACE[0], TERRACE[2]], [KAS0, KAS1]])) fillRect(a + 0.3, -Z + 0.3, e - 0.3, KAMI0 - 0.15, 's', HOMES);
  for (const [a, e] of between([[KAE0, KAE1], [KAS0, KAS1]])) fillRect(a + 0.3, SHIMO1 + 0.15, e - 0.3, Z - 0.3, 'n', HOMES);

  // ── What is left over inside the blocks: no bare ground (coin parking, a pocket park, tiny-shop lanes, yards) ──
  leftovers(b, r, interiors, reserved, holes, { park: [{ ja: '北丘児童遊園', en: 'Kitaoka Children’s Park' }, { ja: '楓ひろば', en: 'Kaede Square' }] }, piece);

  // ═════════════════════════ The dress ═════════════════════════
  // What a hillside station front has: bicycle parking on both plazas, the post box and phone box by
  // the station house, the area map facing its door, benches under the plaza trees; pot plants along
  // the lanes, kerb mirrors where a lane comes out on a back street. Nothing goes where a solid already is.
  {
    /** A road-kit prop facing f, with a collider footprint hw along its front by hd deep; false if the ground is taken. */
    const prop = (id: string, x: number, z: number, f: [number, number], hw: number, hd: number, h: number, solid = true) => {
      const [ex, ez] = f[0] !== 0 ? [hd, hw] : [hw, hd];
      if (b.solidIn(x - ex, GY + 0.05, z - ez, x + ex, GY + Math.min(h, 2.2), z + ez)) return false;
      roadModel(b, id, x, GY, z, f);
      if (solid) b.block(x - ex, GY, z - ez, x + ex, GY + h, z + ez);
      return true;
    };
    const bike = (x: number, z: number, f: [number, number]) => {
      const d = b.dir(f);
      b.out.models.push({ kind: 'places', id: 'bicycle', pos: b.pt(x, GY, z), yaw: Math.atan2(-d[0], -d[1]), seed: 0, merge: true });
    };
    /** A rack along x at z, its slots towards f's side, most of its eight places taken. */
    const rack = (x: number, z: number, s: 1 | -1) => {
      const f: [number, number] = [0, s];
      if (b.solidIn(x - 2.05, GY + 0.05, Math.min(z, z + s * 2.2), x + 2.05, GY + 1.1, Math.max(z, z + s * 2.2))) return;
      roadModel(b, 'bikerack', x, GY, z, f);
      for (let k = 0; k < 8; k++) if (r() < 0.75) bike(x - 1.75 + k * 0.5, z + s * 0.95, [1, 0]);
      b.block(x - 2.05, GY, Math.min(z - s * 0.05, z + s * 1.9), x + 2.05, GY + 1.1, Math.max(z - s * 0.05, z + s * 1.9));
    };
    // North plaza: racks along its back edge west of the house, a bench by the trees.
    for (const x of [-53, -48.6]) rack(x, -21.6, 1);
    prop('bench_s', -55.8, -12.5, [1, 0], 0.95, 0.4, 0.6);
    // East of the house: post box and phone box by the pavement, the area map facing the house's door.
    prop('postbox', -26.0, -8.6, [0, 1], 0.25, 0.22, 1.4);
    prop('phonebox', -25.6, -20.6, [1, 0], 0.52, 0.52, 2.4);
    if (prop('mapstand', -25.4, -13.6, [0, 1], 0.86, 0.12, 2.1)) {
      b.sign({ k: 'areamap', station: st.id }, -25.4, GY + 1.45, -13.6 + 0.05, [0, 1], 1.46, 1.06);
    }
    // South plaza: a long rack row along its south edge, a bench facing Exit 2.
    for (const x of [-52, -47.6, -43.2, -38.8]) rack(x, 23.6, -1);
    prop('bench_s', -27.5, 19.5, [0, -1], 0.95, 0.4, 0.6);
    // The lanes: pot plants and plant shelves against the walls, every 9 m, alternate sides, clear of the ends.
    const laneRects: Rect[] = [
      [-105.25, KAMI1, -102.75, -FRONT], [-X, -36.25, KAE0, -33.75], [KAE1, -42.25, -32, -39.75], [-8, SIDE[0], KAS0, SIDE[1]],
      [-101.25, FRONT, -98.75, SHIMO0], [KAE1, 34, PARK[0], 36.5], [KAS1, 31.75, ISH[0], 34.25],
    ];
    laneRects.forEach(([x0, z0, x1, z1], li) => {
      const alongX = x1 - x0 > z1 - z0, len = alongX ? x1 - x0 : z1 - z0;
      for (let u = 4, k = li; u < len - 4; u += 9, k++) {
        const side = k % 2 ? 1 : 0, id = k % 3 === 0 ? 'potpine' : 'plantshelf';
        const [hw, hd] = id === 'potpine' ? [0.25, 0.25] : [0.6, 0.3];
        if (alongX) prop(id, x0 + u, side ? z1 - hd - 0.02 : z0 + hd + 0.02, [0, side ? -1 : 1], hw, hd, 1.1);
        else prop(id, side ? x1 - hd - 0.02 : x0 + hd + 0.02, z0 + u, [side ? -1 : 1, 0], hw, hd, 1.1);
      }
    });
    // Kerb mirrors where lanes come out on the back streets.
    prop('mirror', -102.95, KAMI1 + 0.35, [0, -1], 0.06, 0.06, 3.0);
    prop('mirror', -98.95, SHIMO0 - 0.35, [0, 1], 0.06, 0.06, 3.0);
  }

  // ═════════════════════════ Past the plot's edge ═════════════════════════
  // Every street runs on as it is inside: the same edge lines, the same poles and wires, the same
  // pavements, broken only where a back street crosses half way. The first band of houses is as
  // low as the plot's own (two-storey machiya and shophouses); the apartment blocks start beyond
  // the cross street, so the skyline steps up away from the station instead of at the plot's edge.
  {
    const OUT = 180, CW = 3.5, CROSS = OUT / 2, NEAR = ['machi', 'shophouse'];
    type Edge = { c: number; half: number; pave: number; kind: 'main' | 'suji' | 'back'; way?: 1 | -1 };
    /** The span [u0, u1] of the outer stretch on side s, and the cross street's span on it. */
    const span = (alongZ: boolean, s: 1 | -1) => {
      const lim = alongZ ? Z : X, u0 = s > 0 ? lim : -lim - OUT, uc = s > 0 ? lim + CROSS : -lim - CROSS;
      return { u0, u1: u0 + OUT, mouth: [uc - CW, uc + CW] as [number, number], near: (s > 0 ? [lim, uc] : [uc, -lim]) as [number, number] };
    };
    const roadOut = (alongZ: boolean, s: 1 | -1, q: Edge) => {
      const { u0, u1, mouth, near } = span(alongZ, s);
      const R = (mat: string, v0: number, v1: number, y0: number, y1: number, a = u0, e = u1) => (alongZ ? b.deco(mat, q.c + v0, y0, a, q.c + v1, y1, e) : b.deco(mat, a, y0, q.c + v0, e, y1, q.c + v1));
      R('asphalt', -q.half, q.half, -0.03, 0.004);
      // Pavements and edge lines, open across the cross street's mouth.
      const pieces: [number, number][] = [[u0, mouth[0]], [mouth[1], u1]];
      for (const [a, e] of pieces) {
        if (q.pave > 0) for (const k of [-1, 1]) R('paver', Math.min(k * q.half, k * (q.half + q.pave)), Math.max(k * q.half, k * (q.half + q.pave)), -0.03, GY, a, e);
        const [la, le] = [a === u0 ? a : a + 1, e === u1 ? e : e - 1];
        for (const k of [-1, 1]) R(WHITE, k * (q.half - 0.5) - 0.05, k * (q.half - 0.5) + 0.05, 0.004, 0.01, la, le);
        if (q.kind === 'main') R(YELLOW, -0.08, 0.08, 0.004, 0.01, la, le);
      }
      // Poles and wires as inside, on the near stretch; on the 筋 and the main road a small lamp now and then across from them.
      const from = near[0] + 6, to = near[1] - 6, skip = (u: number) => u > mouth[0] - 3 && u < mouth[1] + 3;
      if (q.kind === 'main') {
        poleLine(b, { axis: 'x', from, to, at: -(RW + 0.55), road: 1, step: 26, skip, drops: 0.8, cross: 2 * RW + 3.0, wall: true, name: stName });
      } else if (q.kind === 'suji') {
        poleLine(b, { axis: 'z', from, to, at: q.c - (q.half + 0.6), road: 1, step: 24, skip, drops: 0.8, cross: 7.6, name: stName });
      } else {
        const w = q.way ?? 1;
        poleLine(b, { axis: 'x', from, to, at: q.c - w * (q.half - 0.35), road: w > 0 ? 1 : -1, step: 24, skip, drops: 0.7, cross: 6.2, name: stName });
      }
      if (q.kind !== 'back') {
        const v = q.kind === 'main' ? RW + 0.6 : q.half + 0.6;
        for (let u = u0 + 12; u < u1 - 6; u += 26) {
          if (u > mouth[0] - 3 && u < mouth[1] + 3) continue;
          const [px, pz] = alongZ ? [q.c + v, u] : [u, q.c + v];
          roadModel(b, 'lamp_small', px, GY, pz, alongZ ? [-1, 0] : [0, -1]);
        }
      }
    };
    const packOut = (alongZ: boolean, s: 1 | -1, a: number, e: number) => {
      const { mouth } = span(alongZ, s), lim = alongZ ? Z : X, mid = (a + e) / 2;
      for (const [d0, d1, kinds] of [[0.15, CROSS - CW, NEAR], [CROSS + CW, OUT, HOMES]] as [number, number, string[]][]) {
        const u0 = s > 0 ? lim + d0 : -lim - d1, u1 = s > 0 ? lim + d1 : -lim - d0;
        if (alongZ) {
          fillRect(a + 0.2, u0, mid - 0.4, u1, 'w', kinds, true);
          fillRect(mid + 0.4, u0, e - 0.2, u1, 'e', kinds, true);
        } else {
          fillRect(u0, a + 0.2, u1, mid - 0.4, 'n', kinds, true);
          fillRect(u0, mid + 0.4, u1, e - 0.2, 's', kinds, true);
        }
      }
      // The cross street: from kerb to kerb of the streets either side (their pavements are open for it), its edge lines.
      const C = (mat: string, v0: number, v1: number, y0: number, y1: number) => (alongZ ? b.deco(mat, a, y0, v0, e, y1, v1) : b.deco(mat, v0, y0, a, v1, y1, e));
      C('asphalt', mouth[0], mouth[1], -0.03, 0.004);
      for (const v of [mouth[0] + 0.45, mouth[1] - 0.55]) C(WHITE, v, v + 0.1, 0.004, 0.01);
      // It gives way at both ends: a stop line across the half coming in (it runs along x when the 筋 run along z).
      const cc = (mouth[0] + mouth[1]) / 2;
      for (const [u, d] of [[e - 1.6, 1], [a + 1.6, -1]] as const) {
        const neg = (d > 0) === alongZ, v0 = neg ? mouth[0] + 0.2 : cc + 0.15, v1 = neg ? cc - 0.15 : mouth[1] - 0.2;
        const [ua, ue] = [Math.min(u, u - d * 0.35), Math.max(u, u - d * 0.35)];
        if (alongZ) b.deco(WHITE, ua, 0.004, v0, ue, 0.012, v1);
        else b.deco(WHITE, v0, 0.004, ua, v1, 0.012, ue);
      }
    };
    const bl = (s: NS): [number, number] => [s.c - s.half - s.pave, s.c + s.half + s.pave];
    for (const s of [-1, 1] as const) {
      // North and south: the two 筋.
      for (const q of NSS) roadOut(true, s, { c: q.c, half: q.half, pave: q.pave, kind: 'suji' });
      for (const [a, e] of between(NSS.map(bl))) {
        packOut(true, s, a, e);
        b.clearScenery(a - 9, s > 0 ? Z : -Z - OUT - 2, e + 9, s > 0 ? Z + OUT + 2 : -Z);
      }
      // East and west: Kitaoka-dōri and the two back streets.
      roadOut(false, s, { c: 0, half: RW, pave: FRONT - RW, kind: 'main' });
      for (const q of EWS) roadOut(false, s, { c: q.z, half: q.half, pave: 0, kind: 'back', way: q.way });
      for (const [a, e] of between([[KAMI0, KAMI1], [-FRONT, FRONT], [SHIMO0, SHIMO1]], -Z, Z)) {
        packOut(false, s, a, e);
        b.clearScenery(s > 0 ? X : -X - OUT - 2, a - 9, s > 0 ? X + OUT + 2 : -X, e + 9);
      }
    }
  }
}
