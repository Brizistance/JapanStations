// The streets of Hibarino (雲雀野), the junction town at N-07 / K-16 (rebuilt 2026-11; the owner's rules
// are in docs/street-design.md, the procedure in docs/station-playbook.md). After a Kansai suburban
// junction town grown round a viaduct station: the main road a block south of the tracks with a bus and
// taxi rotary between, tenant buildings and a manshon tower by the station, a covered shopping street
// off the main road, houses climbing north behind the viaduct to the skylark hill and its shrine.
//
// Frame: +x east along the Nagisa Line's viaduct (z ±6, its piers at z ±4.6 every 13.5 m from x −54 to
// 54), +z south; the Kikyō Line runs under x ≈ 0. Plot ±130 × ±85. The station (stage 1: as built,
// x −26 … 26, z ±9) has its front at z 9.
//
//   z 44      雲雀野通 Hibarino-dōri: four lanes (z 37 … 51), 4 m pavements, fronts at z 33 and 55 (roadKit, moved to z 44)
//   z −22     囀通 Saezuri-dōri: 6.5 m two way, 1.5 m pavements, from the west edge to Mugibatake-suji
//   z 80      穂波通 Honami-dōri: 6.5 m, one way east, a 1.75 m pavement to the plot's edge
//   x −62     野辺筋 Nobe-suji: 6.5 m two way, 1.5 m pavements, the whole plot, under the viaduct
//   x 47.25   麦畑筋 Mugibatake-suji: 7 m two way, 2.6 m pavements, the whole plot, between the piers at x 40.5 and 54
//
// The station quarter: the forecourt (x −40 … 30, z 9 … 14) before the station's front; the rotary
// (carriageway z 14 … 21 and its legs x −38 … −31 and 21 … 28, in from and out to the main road by left
// turns), its island plaza (x −31 … 21, z 21 … 33) with the skylark clock; the kōban on the corner
// east of the rotary. South of the main road ひばり野中央商店街 Hibarino Chūō arcade (walk x −26 … −20,
// z 55 … 76.75, shops 9 m deep either side), and east of it スーパー ことり屋 (x −11 … 36). Over the rotary and the
// main road the covered deck (x −6 … −2, 6 m up) from the forecourt to the supermarket's first floor.
// North of the viaduct the north plaza (x −26 … 26, z −17.25 … −9), and beyond Saezuri-dōri
// 囀八幡神社 Saezuri Hachiman (x −57.25 … −24, its approach north from the torii) and, across Nobe-suji,
// 揚雲雀の丘 Agehibari Hill park (x −130 … −66.75) with the pavilion on its top terrace.
//
// Lot table (each block: the rows on its edges, depth):
//   N1  x −130 … −66.75, z −85 … −26.75: the park (hill terraces, paths, trees), no buildings
//   N2  x −57.25 … −24,  z −85 … −26.75: the shrine precinct; a row of houses on Nobe-suji (12) north of the hall
//   N3  x −24 … 41.15,   z −85 … −26.75: Saezuri row (12), Mugibatake row (12), lane x 6 … 8.5 street to edge, rows on it
//   N4  x 53.35 … 130,   z −85 … −6:     Mugibatake row (12), the rest rows facing north and leftovers
//   V   z −17.25 … 6:    Saezuri's south side rows (11) west of Nobe-suji and either side of the north plaza; under the viaduct
//                        bicycle parking (x −54 … −30, 30 … 54) and the walk
//   S0  x −130 … −66.75 / −57.25 … −40 / 53.35 … 130, z 6 … 33: Hibarino-dōri fronts (16), leftovers behind (z 6 … 17)
//   K   x 28.5 … 41.15, z 6 … 33: the kōban on the main road, a vending corner, bicycle racks behind
//   S1  x −130 … −66.75, z 55 … 76.75: fronts (16), Nobe-suji row behind them, leftovers
//   S2  x −57.25 … −35: fronts (16) and the lane behind; x −35 … −11 the arcade; x −11 … 36 the supermarket; x 36 … 41.15 a lane
//   S3  x 53.35 … 130, z 55 … 76.75: fronts (16), lanes behind; past Honami-dōri the plot's last 1.75 m is pavement
//
// Signals share one cycle (traffic/signals.ts): axis 0 every east–west street, axis 1 every north–south one.
// Models: tools/blender/build_hibari.py (the arcade, the shrine, the pavilion), build_hibarifront.py (the fronts).

import type { SignContent } from '../signs/content';
import { rng, type LanePart, type SignOpts } from '../world/builder';
import type { Anchor, AnchorPt, Anchors } from './anchors/types';
import { HIBARI } from './anchors/hibari';
import { HIBARIFRONT } from './anchors/hibarifront';
import { ceilingLight, escalator, GROUND_Y as GY, rail, stairs, vending, type Ctx } from './kit';
import { FIT } from './konbini';
import { lift, LIFT_OUT } from './lift';
import { place, PLACES } from './places';
import { kerbRail, mark, pedSignal, poleLine, roadKit, roadModel, roadSign, shortSignal, streetLamp, trafficLane } from './roads';
import type { SurfaceSpec } from './surface';
import { crosswalk, fillModelLots } from './surface';
import { modelTree } from './trees';
import { leftovers } from './tsumugibashi-street';

type Rect = [number, number, number, number];
type Face = 'n' | 's' | 'e' | 'w';
type Named = { ja: string; en: string };

export const HIBARI_PLOT = { x: 130, z: 85 };
const X = HIBARI_PLOT.x, Z = HIBARI_PLOT.z;
/** Hibarino-dōri: centre, half width, the fronts either side. */
const MZ = 44, RW = 7, FN = 33, FS = 55;
interface NS { c: number; half: number; pave: number; name: Named }
const NOBE: NS = { c: -62, half: 3.25, pave: 1.5, name: { ja: '野辺筋', en: 'Nobe-suji' } };
const MUGI: NS = { c: 47.25, half: 3.5, pave: 2.6, name: { ja: '麦畑筋', en: 'Mugibatake-suji' } };
const NSS = [NOBE, MUGI];
const SAE = { z: -22, half: 3.25, pave: 1.5, name: { ja: '囀通', en: 'Saezuri-dōri' }, short: { ja: '囀', en: 'Saezuri' } };
const HON = { z: 80, half: 3.25, way: 1 as const, name: { ja: '穂波通', en: 'Honami-dōri' }, short: { ja: '穂波', en: 'Honami' } };
const bl = (s: NS): [number, number] => [s.c - s.half - s.pave, s.c + s.half + s.pave];
const [NOBE0, NOBE1] = bl(NOBE); // −66.75, −57.25
const [MUGI0, MUGI1] = bl(MUGI); // 41.15, 53.35
const SAE0 = SAE.z - SAE.half - SAE.pave, SAE1 = SAE.z + SAE.half + SAE.pave; // −26.75, −17.25
const HON0 = HON.z - HON.half, HON1 = HON.z + HON.half; // 76.75, 83.25
/** The viaduct's walk underneath. */
const VIA = 6;
/** The platforms' outer edges and their canopies (side platforms to z ±8.6, canopies 0.7 m beyond): nothing stands within this. */
const PLAT = 10;
/** The station quarter. */
const FORE: Rect = [-40, 9, 30, 14];
const ROT = { x0: -38, x1: 28, z0: 14, z1: 21, wl: [-38, -31] as [number, number], el: [21, 28] as [number, number] };
const ISLAND: Rect = [-31, 21, 21, FN];
/** The station building (hibarino.ts HIBARINO.bldg) and the north plaza before its north front. */
export const BLDG: Rect = [-34, -13, 26, 9];
const PLAZA_N: Rect = [-34, SAE1, 26, BLDG[1]];
/** The north front's taxi bay, cut into the plaza's kerb off Saezuri-dōri. */
const TAXI_N: Rect = [-26, SAE.z + SAE.half, -2, SAE.z + SAE.half + 2.6];
const KOBAN_X = 34.8;
/** South of the main road: the arcade and the supermarket's lot. */
const ARC = { x0: -26, x1: -20, z0: FS, z1: HON0 };
const SHOP_D = 9;
const MART: Rect = [-11, FS, 36, HON0];
/** The covered deck: its walk (x −6 … −2) at DY from the forecourt landing (to x 9.6) to the supermarket's first floor. */
const DY = GY + 6, DECK_X: [number, number] = [-6, -2], LAND: Rect = [-6, 9.8, 9.6, 13.6];
/** North: the park, the shrine. */
const PARK: Rect = [-X, -Z, NOBE0, SAE0];
const SHRINE: Rect = [NOBE1, -Z, -24, SAE0];
const SL = 5.2;
const WHITE = 'flat:#e9e9e4', YELLOW = 'flat:#e6a700', LANE = 'tile:#857e73', PLAZA = 'flat:#b9b6ad', PLAZA_BAND = 'flat:#8f8c84';
const GRASS = 'flat:#7fa063', GRAVEL = 'flat:#cfc8b6', ISHI = 'flat:#9a948a';
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

// ── Names (invented; docs/worldbuilding.md says which were web-checked) ──
type Style = 'tenant' | 'tower' | 'pachinko' | 'juku' | 'iryo' | 'tinya' | 'kominka';
const styleOf = (id: string) => id.split('_')[0] as Style;
const NAMES: Record<Style, [string, string][]> = {
  tenant: [['ドラッグ ひばりや', 'Hibariya Drugs'], ['カフェ 麦わら', 'Mugiwara Café'], ['めがねの丘', 'Oka Opticians'], ['100円ショップ ころも', 'Koromo 100-yen']],
  tower: [['ステーションコート雲雀野', 'Station Court Hibarino'], ['グランメゾン雲雀野', 'Grand Maison Hibarino']],
  pachinko: [['パーラー ひばりスター', 'Parlour Hibari Star']],
  juku: [['進学塾 あさつゆ', 'Asatsuyu Cram School'], ['そらいろ英語教室', 'Sorairo English']],
  iryo: [['雲雀野メディカルビル', 'Hibarino Medical Bldg.'], ['のぞみ調剤薬局', 'Nozomi Pharmacy']],
  tinya: [['金物 ひばり堂', 'Hibaridō Hardware'], ['青果 八百丸', 'Yaomaru Greengrocer'], ['お好み焼 ころころ', 'Korokoro Okonomiyaki'], ['理容 ナカタ', 'Nakata Barber'], ['精肉 丸善', 'Maruzen Butcher'], ['鮮魚 うおとら', 'Uotora Fish']],
  kominka: [['ベーカリー 小麦の丘', 'Komugi no Oka Bakery'], ['クリーニング 白鷺', 'Shirasagi Cleaning'], ['花 そよかぜ', 'Soyokaze Flowers']],
};
const BOARD: Record<Style, [string, string]> = {
  tenant: ['#f4f1e8', '#1f3f7a'], tower: ['#e9e2d2', '#3a3d41'], pachinko: ['#c8102e', '#ffffff'], juku: ['#f4f1e8', '#3f7fb4'],
  iryo: ['#f4f1e8', '#1d6a45'], tinya: ['#f4f1e8', '#3a2a1e'], kominka: ['#f4f1e8', '#3a2a1e'],
};
const ARC_SHOPS: [string, string][] = [
  ['乾物 ひばり屋', 'Hibariya Dry Goods'], ['和菓子 野ばら', 'Nobara Wagashi'], ['豆腐 さかい', 'Sakai Tofu'], ['靴 ミナミ', 'Minami Shoes'],
  ['茶 みどり園', 'Midorien Tea'], ['手芸 いとや', 'Itoya Craft Shop'], ['惣菜 おかん', 'Okan Deli'], ['本 ひばり書房', 'Hibari Shobō Books'],
  ['婦人服 ルナ', 'Luna Ladies'], ['時計 タカラ堂', 'Takaradō Watches'], ['布団 ねむの木', 'Nemunoki Futon'], ['喫茶 ラーク', 'Kissa Lark'],
];

export function hibarinoStreet(c: Ctx, spec: SurfaceSpec, cw: number, dir: [number, number], floorHole: Rect[]) {
  const { b } = c;
  const st = c.station;
  if (Math.abs(cw - 9) > 0.01) throw new Error(`hibarinoStreet: the concourse's front moved (z ${cw}); the forecourt is fitted to z 9`);
  const seed = spec.seed;
  const r = rng(seed);
  const stName: Named = { ja: st.nameJa, en: st.nameRomaji };
  b.out.plot = { ...HIBARI_PLOT };
  const holes: Rect[] = floorHole.map((q) => [...q] as Rect);
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
  const fillRect = (x0: number, z0: number, x1: number, z1: number, face: Face, kinds: string[], lo = false, both = false, rows = 6) => {
    if (x1 - x0 < 4.6 || z1 - z0 < 4.6) return;
    const [a, e, f0, f1] = face === 'n' ? [x0, x1, z0, z1] : face === 's' ? [-x1, -x0, -z1, -z0] : face === 'e' ? [z0, z1, -x1, -x0] : [-z1, -z0, x0, x1];
    if (e - a < 4.6 || f1 - f0 < 8) return;
    // With `both`, the last row turns round to face the rect's far side (a street or open ground there).
    const keep = both ? 10.4 : 0; // fillModelLots' plain block at a row's end is 10 m deep
    let z = f0;
    b.with(FRAME[face], () => {
      for (let k = 0; k < rows && f1 - z - keep > 8.5; k++) {
        const lots = fillModelLots(b, r, a, e, z, f1 - keep + 2.01, { noBack: true, kinds, lo, old: true, bare: k > 0 });
        if (!lots.length) break;
        z = Math.max(...lots.map((l) => l[3])) + 0.02;
      }
    });
    if (!both || f1 - z < 10.3) return;
    const back: Rect = face === 'n' ? [x0, z, x1, z1] : face === 's' ? [x0, z0, x1, -z] : face === 'e' ? [x0, z0, -z, z1] : [z, z0, x1, z1];
    fillRect(...back, ({ n: 's', s: 'n', e: 'w', w: 'e' } as const)[face], kinds, lo, false, 1);
  };
  const HOMES = ['machi', 'manshon'], SMALL = ['shophouse', 'zakkyo', 'manshon'];
  /** What is not a building and must stay empty: lanes, yards, precincts (leftovers() fills the rest). */
  const reserved: Rect[] = [];
  /** A walkable lane's paving, its drain down the middle, its lamps, and its name as a place. */
  const lanePave = (x0: number, z0: number, x1: number, z1: number, name?: Named, mat = LANE) => {
    b.deco(mat, x0, GY + 0.002, z0, x1, GY + 0.012, z1);
    if (x1 - x0 > z1 - z0) b.deco('flat:#6f6a60', x0, GY + 0.012, (z0 + z1) / 2 - 0.08, x1, GY + 0.016, (z0 + z1) / 2 + 0.08);
    else b.deco('flat:#6f6a60', (x0 + x1) / 2 - 0.08, GY + 0.012, z0, (x0 + x1) / 2 + 0.08, GY + 0.016, z1);
    reserved.push([x0, z0, x1, z1]);
    if (name) b.zone('street', x0 + 0.3, GY - 0.2, z0 + 0.3, x1 - 0.3, GY + 6, z1 - 0.3, name.ja, name.en, true);
    const len = Math.max(x1 - x0, z1 - z0), alongX = x1 - x0 > z1 - z0;
    for (let u = 6; u < len - 2; u += 14) {
      if (alongX) streetLamp(b, 'lamp_small', x0 + u, z0 + 0.25, [0, 1]);
      else streetLamp(b, 'lamp_small', x0 + 0.25, z0 + u, [1, 0]);
    }
  };
  let laneNo = 0;
  const laneName = (): Named => {
    const n = ++laneNo;
    return { ja: `雲雀野 ${'一二三四五六七八九'[n - 1] ?? n}番路地`, en: `Hibarino lane ${n}` };
  };

  // ═════════════════════════ Ground ═════════════════════════
  const carriage: Rect[] = [
    [-X, MZ - RW, X, MZ + RW],
    ...NSS.map((s): Rect => [s.c - s.half, -Z, s.c + s.half, Z]),
    [-X, SAE.z - SAE.half, MUGI.c - MUGI.half, SAE.z + SAE.half], TAXI_N,
    [-X, HON0, X, HON1],
    // The rotary: its carriageway and its two legs.
    [ROT.x0, ROT.z0, ROT.x1, ROT.z1], [ROT.wl[0], ROT.z1, ROT.wl[1], FN + 0.01], [ROT.el[0], ROT.z1, ROT.el[1], FN + 0.01],
    [ROT.wl[0], FN, ROT.wl[1], MZ - RW + 0.01], [ROT.el[0], FN, ROT.el[1], MZ - RW + 0.01],
  ];
  const wellHoles: Rect[] = holes.map(([x0, z0, x1, z1]) => [x0 - 0.05, z0 - 0.05, x1 + 0.05, z1 + 0.05]);
  const station: Rect = BLDG;
  b.slab('asphalt', -X, -Z, X, Z, -0.6, 0, wellHoles);
  b.slab('paver', -X, -Z, X, Z, 0, GY, [...wellHoles, ...carriage, station]);
  // The concourse floor's bed (the station's own floor sits on it).
  b.slab('paver', station[0], station[1], station[2], station[3], 0, 0.1, wellHoles);
  b.zone('street', -X, -0.3, -Z, X, 80, Z, `${st.nameJa}駅前`, `${st.nameRomaji} — street level`);
  b.block(-X - 1, -1, -Z - 1, -X, 60, Z + 1);
  b.block(X, -1, -Z - 1, X + 1, 60, Z + 1);
  b.block(-X, -1, -Z - 1, X, 60, -Z);
  b.block(-X, -1, Z, X, 60, Z + 1);
  b.out.district = { radius: 460, old: [-60, -60], oldRadius: 160, towers: 1 };

  // Forecourt, island plaza and north plaza: pale granite in bands, a dark edge where they meet the street.
  for (const [x0, z0, x1, z1] of [FORE, ISLAND, PLAZA_N]) {
    for (let x = x0; x < x1 - 0.1; x += 3) b.deco(PLAZA, x, GY + 0.002, z0, Math.min(x + 3, x1) - 0.12, GY + 0.01, z1);
    reserved.push([x0, z0, x1, z1]);
  }
  b.deco(PLAZA_BAND, FORE[0], GY + 0.003, FORE[3] - 0.3, FORE[2], GY + 0.011, FORE[3]);
  b.deco(PLAZA_BAND, PLAZA_N[0], GY + 0.003, PLAZA_N[1], PLAZA_N[2], GY + 0.011, PLAZA_N[1] + 0.3);
  b.zone('street', FORE[0] + 0.3, GY - 0.2, FORE[1], FORE[2] - 0.3, DY - 0.6, FORE[3], '雲雀野駅 南口', 'Hibarino Station South Exit', true);
  b.zone('street', ISLAND[0] + 0.3, GY - 0.2, ISLAND[1] + 0.3, ISLAND[2] - 0.3, DY - 0.6, ISLAND[3], '雲雀野駅前 ロータリー広場', 'Station Rotary Plaza', true);
  b.zone('street', PLAZA_N[0] + 0.3, GY - 0.2, PLAZA_N[1] + 0.3, PLAZA_N[2] - 0.3, GY + 4, PLAZA_N[3], '雲雀野駅 北口', 'Hibarino Station North Exit', true);
  // The walk under the viaduct, either side of the station.
  for (const [x0, x1] of [[-X, BLDG[0]], [BLDG[2], X]] as const) {
    reserved.push([x0, -VIA, x1, VIA]);
    b.zone('street', x0 + 0.3, GY - 0.2, -VIA + 0.3, x1 - 0.3, GY + 4.5, VIA - 0.3, '高架下', x0 < 0 ? 'Under the viaduct (west)' : 'Under the viaduct (east)', true);
  }

  // ═════════════════════════ Roads ═════════════════════════
  // Hibarino-dōri by the road kit, in a frame moved to the road's middle. Its crossing streets run
  // through the plot both ways; under the viaduct they carry no poles or wires.
  const streetsX = NSS.map((s): [number, number] => [s.c - s.half, s.c + s.half]);
  const lanes0 = b.out.lanes.length;
  // What the street builds from here on (the station's own parts come before: the clearing below leaves them alone).
  const m0 = b.out.models.length, s0 = b.out.signs.length, k0 = b.out.boxes.length;
  b.with({ t: [0, 0, MZ] }, () => roadKit(b, {
    X, Z: Z - MZ, rw: RW, swOut: RW + 4, streets: streetsX, seed, name: stName, at: { id: st.id, dir }, shared: true,
    lamp: 'lamp_shop', busy: 0.75, taxi: 0.2, lit: [0, 1], reach: [MZ + Z, Z - MZ], noPoles: [[-VIA - 2 - MZ, VIA + 2 - MZ]],
    junctions: [{ ja: '雲雀野西', en: 'Hibarino-nishi' }, { ja: '雲雀野東', en: 'Hibarino-higashi' }],
    roads: { main: { ja: '雲雀野通', en: 'Hibarino-dōri' }, cross: NSS.map((s) => s.name) },
    flows: [0.6, 0.9], busX: [-104, 96], taxiX: 76,
  }));
  const kitLanes = b.out.lanes.length;

  // Hibarino-dōri: a yellow centre line and lane lines between the junctions and the rotary's mouths.
  const zonesNS: [number, number][] = [...streetsX.map(([a, e]): [number, number] => [a - 9, e + 9]), [ROT.wl[0] - 1, ROT.wl[1] + 1], [ROT.el[0] - 1, ROT.el[1] + 1]];
  for (let x = -X; x < X; x += 6) {
    if (!clearOf(x + 1.5, zonesNS)) continue;
    b.deco(YELLOW, x, 0.004, MZ - 0.08, x + 6, 0.01, MZ + 0.08);
    for (const s of [-1, 1]) b.deco(WHITE, x, 0.004, MZ + s * RW / 2 - 0.07, x + 3, 0.01, MZ + s * RW / 2 + 0.07);
  }

  /** A signalled junction of a north–south street and an east–west one, short-arm poles on both. */
  const junction = (cx: number, hx: number, cz: number, hz: number, name: Named, ew: (1 | -1)[], tee = false) => {
    const flat = true;
    for (const sz of tee ? [1] as const : [-1, 1] as const) {
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
    for (const sx of ew) {
      const lz = -sx;
      const xs = cx - sx * (hx + SL);
      b.deco(WHITE, Math.min(xs, xs - sx * 0.35), 0.004, Math.min(cz, cz + lz * (hz - 0.2)), Math.max(xs, xs - sx * 0.35), 0.01, Math.max(cz, cz + lz * (hz - 0.2)));
      shortSignal(b, cx + sx * (hx + 1.9), cz + lz * (hz + 1.5), [sx, 0], 0, name);
    }
    for (const sz of [1, -1] as const) {
      if (tee && sz < 0) continue;
      const lx = sz;
      const zs = cz - sz * (hz + SL);
      b.deco(WHITE, Math.min(cx, cx + lx * (hx - 0.2)), 0.004, Math.min(zs, zs - sz * 0.35), Math.max(cx, cx + lx * (hx - 0.2)), 0.01, Math.max(zs, zs - sz * 0.35));
      shortSignal(b, cx + lx * (hx + 1.5), cz + sz * (hz + 1.9), [0, sz], 1, name);
    }
    roadModel(b, 'sigbox', cx - hx - 2.6, GY, cz + hz + 3.2, [0, -1]);
    b.block(cx - hx - 2.96, GY, cz + hz + 2.94, cx - hx - 2.24, GY + 1.56, cz + hz + 3.46);
  };
  const stopsAt = (sx: 1 | -1, x0: number, list: { c: number; half: number }[], hz: number): LanePart['stops'] =>
    list.map(({ c: cx, half }) => {
      const t = (cx - x0) * sx;
      return { at: t - half - SL - 0.5, axis: 0 as const, exit: t + half + SL };
    }).filter((q) => q.at > 2 && hz > 0).sort((p, q) => p.at - q.at);

  // ── Saezuri-dōri: two way from the west edge to Mugibatake-suji (a tee there), signals at both 筋 ──
  {
    const s = SAE, xEnd = MUGI.c - MUGI.half;
    junction(NOBE.c, NOBE.half, s.z, s.half, { ja: `${s.short.ja}野辺`, en: `${s.short.en} Nobe` }, [1, -1]);
    junction(MUGI.c, MUGI.half, s.z, s.half, { ja: `${s.short.ja}麦畑`, en: `${s.short.en} Mugibatake` }, [1], true);
    trafficLane(b, -X, s.z - 1.6, xEnd, s.z - 1.6, { speed: 30 / 3.6, flow: 1.1, use: 'minor', taxi: 0.05, halts: [], stops: stopsAt(1, -X, NSS, 1), dead: true });
    trafficLane(b, xEnd, s.z + 1.6, -X, s.z + 1.6, { speed: 30 / 3.6, flow: 0, use: 'minor', taxi: 0.05, halts: [], stops: stopsAt(-1, xEnd, [NOBE], 1) });
    for (const [a, e] of between([[NOBE.c - 9, NOBE.c + 9]], -X, xEnd - 9)) {
      for (const k of [-1, 1]) b.deco(WHITE, a, 0.004, s.z + k * (s.half - 0.5) - 0.05, e, 0.01, s.z + k * (s.half - 0.5) + 0.05);
      for (let x = a; x < e - 3; x += 6) b.deco(WHITE, x, 0.004, s.z - 0.06, x + 3, 0.01, s.z + 0.06);
    }
    roadSign(b, 'speed30', -X + 10, s.z - s.half - 0.5, [-1, 0], 0.6);
    poleLine(b, { axis: 'x', from: -X + 6, to: xEnd - 8, at: s.z + s.half + 0.6, road: -1, step: 24, skip: (u) => !clearOf(u, [[NOBE.c - 8, NOBE.c + 8]], 1) || (u > PLAZA_N[0] - 2 && u < PLAZA_N[2] + 2), drops: 0.7, cross: 6.8, name: stName });
    for (let x = -X + 18; x < xEnd - 10; x += 30) if (clearOf(x, [[NOBE.c - 9, NOBE.c + 9]])) streetLamp(b, 'lamp_small', x, s.z - s.half - 0.6, [0, 1]);
  }
  // ── Honami-dōri: one way east along the plot's south edge, signals at both 筋 ──
  {
    const s = HON;
    for (const q of NSS) junction(q.c, q.half, s.z, s.half, { ja: `${s.short.ja}${q.name.ja.replace('筋', '')}`, en: `${s.short.en} ${q.name.en.replace('-suji', '')}` }, [1]);
    trafficLane(b, -X, s.z, X, s.z, { speed: 30 / 3.6, flow: 1.0, use: 'minor', taxi: 0.05, halts: [], stops: stopsAt(1, -X, NSS, 1) });
    const boxes = NSS.map(({ c: cx, half }): [number, number] => [cx - half - 8, cx + half + 8]);
    for (const e of [-1, 1]) {
      let from = -X;
      for (const [p, q] of [...boxes, [X + 3, X + 3] as [number, number]].sort((m, n) => m[0] - n[0])) {
        if (p - from > 1) b.deco(WHITE, from, 0.004, s.z + e * (s.half - 0.5) - 0.05, p + 3, 0.01, s.z + e * (s.half - 0.5) + 0.05);
        from = q - 3;
      }
    }
    for (const x of [-X + 10, X - 10]) roadSign(b, 'speed30', x, s.z - (s.half - 0.4), [1, 0], 0.6);
    roadSign(b, 'noentry', X - 6, s.z + (s.half - 0.4), [1, 0], 0.66);
    poleLine(b, { axis: 'x', from: -X + 6, to: X - 6, at: HON1 + 0.5, road: -1, step: 24, skip: (u) => !clearOf(u, boxes, 2) || !clearOf(u, [[ARC.x0, ARC.x1]], 3), drops: 0.7, cross: 6.2, name: stName });
  }
  // The kit laid the 筋' lanes with a stop at Hibarino-dōri only: add Saezuri-dōri's and Honami-dōri's.
  {
    // Lanes are stored in world space: tell the 筋' lanes by their direction in the frame.
    const kit = b.out.lanes.slice(lanes0, kitLanes);
    for (const l of kit) {
      const len = Math.hypot(l.to[0] - l.from[0], l.to[2] - l.from[2]);
      const [ux, uz] = [(l.to[0] - l.from[0]) / len, (l.to[2] - l.from[2]) / len];
      // Along a 筋: the lane's direction is the frame's ±z turned to world.
      const north = b.dir([0, -1]);
      const along = ux * north[0] + uz * north[1];
      if (Math.abs(along) < 0.99) continue;
      const uzf = along > 0 ? -1 : 1; // the lane's way in the frame: −1 north, +1 south
      // Distance from the lane's start to a z in the frame: its start is at the plot's edge on the side it comes from.
      const z0 = uzf > 0 ? -Z : Z;
      const more: LanePart['stops'] = [];
      for (const s of [SAE, HON]) {
        const t = (s.z - z0) * uzf;
        if (t - s.half - SL < 6 || t + s.half + SL > len - 4) continue;
        more.push({ at: t - s.half - SL - 0.5, axis: 1, exit: t + s.half + SL });
      }
      l.stops = [...l.stops, ...more].sort((p, q) => p.at - q.at);
    }
  }
  // The 筋: lane edge lines and centre line clear of the junctions.
  const crossingsEW: [number, number][] = [[MZ - RW - 9, MZ + RW + 9], [SAE.z - SAE.half - 8, SAE.z + SAE.half + 8], [HON.z - HON.half - 8, HON.z + HON.half + 8]];
  for (const q of NSS) {
    for (const [z0, z1] of between(crossingsEW, -Z, Z)) {
      for (const e of [-1, 1]) b.deco(WHITE, q.c + e * (q.half - 0.5) - 0.05, 0.004, z0, q.c + e * (q.half - 0.5) + 0.05, 0.01, z1);
      for (let z = z0; z < z1 - 3; z += 6) b.deco(WHITE, q.c - 0.06, 0.004, z, q.c + 0.06, 0.01, z + 3);
    }
  }

  // ── Nothing of the kit's in the rotary's mouths or under the viaduct; guard rails along Hibarino-dōri ──
  {
    const clearRects: Rect[] = [
      [ROT.wl[0] - 0.6, FN - 0.2, ROT.wl[1] + 0.6, MZ - RW + 0.2], [ROT.el[0] - 0.6, FN - 0.2, ROT.el[1] + 0.6, MZ - RW + 0.2],
      [ARC.x0 - 0.6, MZ + RW - 0.2, ARC.x1 + 0.6, FS + 0.2], [-X, -VIA - 1.5, X, VIA + 1.5], [DECK_X[0] - 1, FN - 0.2, DECK_X[1] + 1, FS + 0.2],
    ];
    for (const [x0, z0, x1, z1] of clearRects) {
      const inside = (v: number[]) => {
        // World positions: take them into the frame.
        const p = toFrame(v);
        return p[0] > x0 && p[0] < x1 && p[1] > z0 && p[1] < z1;
      };
      b.out.models = b.out.models.filter((m, i) => i < m0 || !(inside(m.pos) && m.kind === 'road' && m.pos[1] < GY + 1));
      b.out.signs = b.out.signs.filter((sg, i) => i < s0 || !(inside(sg.pos) && sg.normal !== null && sg.pos[1] > GY + 0.3 && (sg.pos[1] < GY + 4.6 || sg.content.k === 'roadboard')));
      b.out.boxes = b.out.boxes.filter((bx, i) => {
        if (i < k0) return true;
        const post = bx.max[1] < GY + 7 && bx.max[0] - bx.min[0] < 2.6 && bx.max[2] - bx.min[2] < 2.6;
        return !(bx.min[1] > -0.05 && bx.max[1] > 0.3 && post && inside([(bx.min[0] + bx.max[0]) / 2, 0, (bx.min[2] + bx.max[2]) / 2]));
      });
    }
    // Kerb rails: none at the junctions, the rotary's mouths, the arcade's mouth, the bus stops and the taxi stand.
    const open: [number, number][] = [...zonesNS.map(([a, e]): [number, number] => [a + 2, e - 2]), [ARC.x0 - 1, ARC.x1 + 1], [-104 - 8, -104 + 8], [96 - 8, 96 + 8], [70, 100], [ISLAND[0] + 4, ISLAND[0] + 12], [ISLAND[2] - 12, ISLAND[2] - 4]];
    for (const s of [-1, 1] as const) {
      const zr = MZ + s * (RW + 0.3);
      let x = -X;
      for (const [from, to] of [...open].sort((p, q) => p[0] - q[0]).concat([[X, X]])) {
        for (let xa = x; xa + 2.5 <= from; xa += 2.5) {
          b.block(xa, GY, zr - 0.04, xa + 2.5, GY + 0.9, zr + 0.04);
          kerbRail(b, xa + 1.25, zr);
        }
        x = Math.max(x, to);
      }
    }
  }

  // ── The rotary: in at the west leg, out at the east leg, by left turns; buses at the station's kerb, taxis waiting on the island side ──
  {
    for (const x of [ROT.wl[0] + 0.4, ROT.el[1] - 0.4]) b.deco(WHITE, x - 0.05, 0.004, ROT.z1, x + 0.05, 0.01, MZ - RW);
    b.deco(WHITE, ROT.x0 + 0.4, 0.004, ROT.z0 + 0.35, ROT.x1 - 0.4, 0.01, ROT.z0 + 0.45);
    for (let x = ROT.wl[1] + 2; x < ROT.el[0] - 4; x += 6) b.deco(WHITE, x, 0.004, (ROT.z0 + ROT.z1) / 2 - 0.06, x + 3, 0.01, (ROT.z0 + ROT.z1) / 2 + 0.06);
    // Give-way lines where the legs meet the main road; the one-way and no-entry signs.
    b.deco(WHITE, ROT.el[0] + 0.3, 0.004, MZ - RW - 0.6, ROT.el[1] - 0.3, 0.01, MZ - RW - 0.3);
    mark(b, 'stop', ROT.el[0] + 3.5, MZ - RW - 4.6, [0, 1], 1.9, 5.6);
    roadSign(b, 'noentry', ROT.el[1] + 0.5, FN + 0.8, [0, 1], 0.66);
    roadSign(b, 'stop', ROT.el[0] - 0.5, MZ - RW - 1.0, [0, 1], 0.8);
    // Bus bays on the forecourt's kerb: a shelter per bay (open to the kerb, its bay's board along the
    // roof's edge), the stop's pole beside it; the bus pulls up with its middle at `at`.
    // (Bay 2 between the deck's columns at x −4 and 3; bay 3 clear of the deck's escalator, x 9.6 … 20.4, its run-off and the deck signpole at x 21.6.)
    const BAYS = [{ x: -27, pole: 2.7, at: -24.5 }, { x: -0.5, pole: -2.3, at: 0 }, { x: 24.5, pole: 2.7, at: 14 }];
    for (const [k, { x: bx, pole }] of BAYS.entries()) {
      const sz = ROT.z0 - 1.4;
      roadModel(b, 'shelter', bx, GY, sz, [0, 1]);
      b.block(bx - 1.95, GY, sz - 0.75, bx + 1.95, GY + 2.45, sz - 0.65);
      for (const e of [-1, 1]) b.block(bx + e * 1.9 - 0.05, GY, sz - 0.7, bx + e * 1.9 + 0.05, GY + 2.45, sz - 0.05);
      roadModel(b, 'busstop', bx + pole, GY, ROT.z0 - 0.6, [0, 1]);
      b.block(bx + pole - 0.08, GY, ROT.z0 - 0.68, bx + pole + 0.08, GY + 2.6, ROT.z0 - 0.52);
      b.sign({ k: 'label', text: `${k + 1}番のりば`, sub: ['Bus 1 — Hibarino Hills / Asahino', 'Bus 2 — Higashigaoka / Saezuri', 'Bus 3 — Kawaminato Univ.'][k], fg: '#fff', bg: '#0d3b66' }, bx, GY + 2.82, sz + 0.87, [0, 1], 2.4, 0.5);
    }
    // Moving traffic: off the main road's eastbound lane by a left turn up the west leg, east along the
    // carriageway (buses by the forecourt's kerb, taxis to the stand on the island side), down the east
    // leg and back onto the main road by a left turn. Slow, and stopping for anybody on the zebra.
    {
      const ew = b.dir([1, 0]);
      const main = b.out.lanes.slice(lanes0, kitLanes).find((l) => {
        const dx = l.to[0] - l.from[0], dz = l.to[2] - l.from[2], n = Math.hypot(dx, dz);
        return l.use === 'all' && (dx * ew[0] + dz * ew[1]) / n > 0.99;
      });
      const lz = MZ - RW / 4, wx = (ROT.wl[0] + ROT.wl[1]) / 2, ex = (ROT.el[0] + ROT.el[1]) / 2;
      const zebra: [number, number, number, number] = (() => {
        const p = b.pt(-14.9, 0, ROT.z0 - 0.5), q = b.pt(-11.1, 0, ROT.z1 + 0.5);
        return [Math.min(p[0], q[0]), Math.min(p[2], q[2]), Math.max(p[0], q[0]), Math.max(p[2], q[2])];
      })();
      const way = (z: number) => [b.pt(wx, 0, lz), b.pt(wx, 0, z), b.pt(ex, 0, z), b.pt(ex, 0, lz)];
      const yields = (z: number) => [{ at: b.pt(-16.2, 0, z), zone: zebra }];
      if (main) main.detours = [
        ...BAYS.map((bay) => ({ via: way(ROT.z0 + 1.8), r: 5, rEnds: 9, speed: 4.5, who: 'bus' as const, share: 0.35, halt: b.pt(bay.at, 0, ROT.z0 + 1.8), yields: yields(ROT.z0 + 1.8) })),
        { via: way(ROT.z1 - 1.6), r: 5, rEnds: 8, speed: 4.5, who: 'taxi' as const, share: 0.5, halt: b.pt(14, 0, ROT.z1 - 1.6), rank: 4, yields: yields(ROT.z1 - 1.6) },
      ];
    }
    roadModel(b, 'signpole', 18.5, GY, ROT.z1 + 0.6, [0, -1]);
    b.block(18.44, GY, ROT.z1 + 0.54, 18.56, GY + 2, ROT.z1 + 0.66);
    b.sign({ k: 'label', text: 'タクシーのりば', sub: 'Taxi', fg: '#111', bg: '#ffd100' }, 18.5, GY + 2.4, ROT.z1 + 0.55, [0, -1], 2.2, 0.55);
    // The zebra from the island to the forecourt, with a hump either side.
    crosswalk(b, -13, (ROT.z0 + ROT.z1) / 2, ROT.z1 - ROT.z0 - 0.4, 3.4, true);
    // Lamps on the island's edge.
    for (const x of [-27, -12, 4, 17]) streetLamp(b, 'lamp_park', x, ROT.z1 + 0.7, [0, -1]);
  }

  // ═════════════════════════ The fronts on Hibarino-dōri ═════════════════════════
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
    const [ja, en] = nextName(sty, NAMES[sty]);
    if (p.name) label(p.name, ja, en, bg, fg);
    if (p.plate) label(p.plate, ja, en, bg, fg);
    if (p.roof) label(p.roof, ja, en, '#1f3f7a', '#ffffff');
    if (p.vertical) upright(p.vertical, sty === 'tenant' ? '各階ご案内' : ja.split(' ').pop()!, '#f4f1e8', '#1f3f7a');
    for (const [k, q] of Object.entries(p)) {
      if (/^(tenant|upper|floor|shop)\d+$/.test(k)) {
        const [tj, te] = nextName('tenantfloor', TENANTS);
        label(q, tj, te, '#f4f1e8', '#2a2d31');
      }
    }
    if (p.directory) label(p.directory, '内科・歯科・眼科', 'Clinics', '#f4f1e8', '#1d6a45');
    if (p.poster) label(p.poster, '新台入替', 'New machines', '#ffd100', '#c8102e');
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
  const F = HIBARIFRONT;
  const ids = (pre: Style[]) => Object.keys(F).filter((k) => pre.includes(styleOf(k)));
  const NEAR_IDS = ids(['tenant', 'tower', 'juku', 'iryo', 'pachinko', 'tinya']);
  const FAR_IDS = ids(['tinya', 'kominka', 'iryo', 'juku']);
  const fronts = (face: Face, line: number, u0: number, u1: number, list: string[]) => row('hibarifront', F, face, line, u0, u1, list, (id, a) => letterFront(id, a.pts));
  // North side (face 's'), west to east: by the station the tenant buildings and the tower.
  fronts('s', FN, -X + 0.3, NOBE0 - 0.3, FAR_IDS);
  fronts('s', FN, NOBE1 + 0.3, ROT.wl[0] - 1.2, ids(['tenant', 'juku', 'iryo']));
  fronts('s', FN, MUGI1 + 0.3, X - 0.3, NEAR_IDS);
  // South side (face 'n').
  fronts('n', FS, -X + 0.3, NOBE0 - 0.3, FAR_IDS);
  fronts('n', FS, NOBE1 + 0.3, ARC.x0 - SHOP_D - 2.8, ids(['tenant', 'tinya', 'iryo']));
  fronts('n', FS, MUGI1 + 0.3, X - 0.3, NEAR_IDS);
  // Behind the north fronts: a lane from Nobe-suji to the rotary's west leg, its houses.
  lanePave(NOBE1, FN - 16 - 2.5, ROT.wl[0], FN - 16, laneName());

  // ═════════════════════════ The station quarter ═════════════════════════
  // ── The island plaza: the skylark clock, trees, benches; the forecourt's trees and shelter ──
  {
    // (East of the island's middle: the deck crosses at x −6 … −2.)
    const cx = 6, cz = (ISLAND[1] + ISLAND[3]) / 2 + 1;
    // The skylark clock: a granite plinth, a steel mast, a clock, a bronze skylark rising from the top.
    b.box('flat:#4a4440', cx - 1.2, GY, cz - 1.2, cx + 1.2, GY + 0.9, cz + 1.2);
    b.box('flat:#3f4a50', cx - 0.12, GY + 0.9, cz - 0.12, cx + 0.12, GY + 5.6, cz + 0.12);
    b.mesh('flat:#e9e7e0', 'cyl', cx, GY + 5.0, cz, 0.7, 0.18, 0.7);
    b.sign({ k: 'clock' }, cx, GY + 5.0, cz - 0.1, [0, -1], 0.9, 0.9);
    b.sign({ k: 'clock' }, cx, GY + 5.0, cz + 0.1, [0, 1], 0.9, 0.9);
    b.mesh('flat:#7a5a34', 'sphere', cx, GY + 6.0, cz, 0.35, 0.25, 0.6);
    b.mesh('flat:#7a5a34', 'sphere', cx, GY + 6.05, cz, 1.3, 0.06, 0.3);
    b.sign({ k: 'label', text: '揚雲雀', sub: 'Rising Skylark', fg: '#f4f1e8', bg: '#4a4440' }, cx, GY + 0.5, cz - 1.22, [0, -1], 1.6, 0.4);
    for (const [tx, tz] of [[ISLAND[0] + 4, 26], [ISLAND[0] + 10, 30], [ISLAND[2] - 4, 26], [ISLAND[2] - 10, 30], [-13, 30]]) modelTree(b, 'zelkova', tx, tz, (tx | 0) % 2 ? 'a' : 'b', GY, true);
    for (const bx of [cx - 5, cx + 5]) {
      roadModel(b, 'bench_s', bx, GY, cz + 2.2, [0, -1]);
      b.block(bx - 0.95, GY, cz + 1.8, bx + 0.95, GY + 0.6, cz + 2.6);
    }
    // Planters and bollards along the island's kerb, open at the zebra and the taxi stand.
    for (let x = ISLAND[0] + 0.8; x < ISLAND[2] - 1; x += 1.6) {
      if (Math.abs(x + 13) < 2.2 || (x > -2 && x < 20)) continue;
      roadModel(b, 'bollard', x, GY, ISLAND[1] + 0.35, [0, -1]);
      b.block(x - 0.08, GY, ISLAND[1] + 0.27, x + 0.08, GY + 0.85, ISLAND[1] + 0.43);
    }
  }
  // ── The kōban on the corner east of the rotary, a vending corner beside it ──
  {
    const { w, d } = PLACES.koban;
    at('s', KOBAN_X, FN, () => place(b, { kind: 'koban', ja: '雲雀野駅前交番', en: 'Hibarino Ekimae Kōban' }));
    reserved.push([KOBAN_X - w / 2, FN - d, KOBAN_X + w / 2, FN]);
    vending(b, MUGI0 - 0.6, GY, FN - 2, [-1, 0], 'vending');
    vending(b, MUGI0 - 0.6, GY, FN - 3.2, [-1, 0], 'vending2');
  }

  // ── The arcade: its gate on the main road, roof bays, shops either side, its gate on Honami-dōri ──
  {
    const xm = (ARC.x0 + ARC.x1) / 2;
    const A = HIBARI;
    const gate = (z: number, face: Face) => piece('hibari', A, 'gate', face, xm, z, (a) => {
      if (a.pts.name) label(a.pts.name, 'ひばり野中央商店街', 'Hibarino Chūō Shōtengai', '#f4f1e8', '#1f3f7a');
      if (a.pts.name_back) label(a.pts.name_back, 'ひばり野中央商店街', 'Hibarino Chūō Shōtengai', '#f4f1e8', '#1f3f7a');
      if (a.pts.clock) signAt(a.pts.clock, { k: 'clock' });
    }, false);
    gate(FS, 'n');
    gate(ARC.z1, 's');
    // The gate's towers stand either side of the walk: their colliders.
    for (const s of [-1, 1]) {
      const x0 = xm + s * (3.6 + 0.4);
      for (const z of [FS, ARC.z1 - 1.2]) b.block(x0 - 0.4, GY, z, x0 + 0.4, GY + 9.6, z + 1.2);
    }
    // Bays end to end from gate to gate (the model's bay is cut to fit this walk: build_hibari.py BAY).
    const span = ARC.z1 - 1.2 - (FS + 1.2), bays = Math.round(span / A.bay.d), step = span / bays;
    for (let k = 0; k < bays; k++) {
      const z = FS + 1.2 + k * step;
      piece('hibari', A, 'bay', 'n', xm, z, (a) => {
        if (a.pts.banner && k % 2 === 0) label(a.pts.banner, '雲雀まつり', 'Skylark Festival', '#5aa0d8', '#ffffff');
      }, false);
      for (const s of [-1, 1]) for (const zz of [z + 0.3, z + A.bay.d - 0.3]) b.block(xm + s * 3.15 - 0.12, GY, zz - 0.12, xm + s * 3.15 + 0.12, GY + 7.4, zz + 0.12);
    }
    b.deco('tile:#c9c2b2', ARC.x0, GY + 0.002, FS, ARC.x1, GY + 0.012, ARC.z1);
    // Light fittings hung under the roof's ridge, every 4 m: the walk is lit by them at night.
    for (let z = FS + 2; z + 1.2 < ARC.z1 - 1; z += 4) ceilingLight(b, xm - 0.6, xm + 0.6, z, z + 1.2, GY + 7.0);
    // and lamps on the shops' party walls, by turns either side, light the walk itself.
    for (let z = FS + 5, k = 0; z < ARC.z1 - 3; z += 6, k++) streetLamp(b, 'lamp_small', k % 2 ? ARC.x1 - 0.25 : ARC.x0 + 0.25, z, [k % 2 ? -1 : 1, 0]);
    reserved.push([ARC.x0, FS, ARC.x1, ARC.z1]);
    b.zone('street', ARC.x0 + 0.3, GY - 0.2, FS + 0.3, ARC.x1 - 0.3, GY + 7, ARC.z1 - 0.3, 'ひばり野中央商店街', 'Hibarino Chūō Shōtengai');
    const SHOP_IDS = Object.keys(A).filter((k) => k.startsWith('shop_'));
    let n = 0;
    const shops = (face: Face, line: number) => row('hibari', A, face, line, FS + 1.2, ARC.z1 - 1.2, SHOP_IDS, (_id, a) => {
      const [ja, en] = ARC_SHOPS[n++ % ARC_SHOPS.length];
      if (a.pts.name) label(a.pts.name, ja, en, '#f4f1e8', '#3a2a1e');
    });
    shops('e', ARC.x0);
    shops('w', ARC.x1);
    reserved.push([ARC.x0 - SHOP_D, FS, ARC.x0, ARC.z1], [ARC.x1, FS, ARC.x1 + SHOP_D, ARC.z1]);
  }
  // ── The covered deck (雲雀野駅前デッキ): from a landing over the forecourt, over the rotary and the main
  //    road to the supermarket's first floor. Light steel and glass: white posts, a glass roof, glass parapets ──
  {
    const [x0, x1] = DECK_X, y = DY;
    const STEEL = 'flat:#f2f2ee', FLOOR = 'tile:#bdb7aa', UNDER = 'flat:#e2e2dc', EDGE = 'flat:#5aa0d8';
    const W: Rect = [x0, LAND[3], x1, MART[1]];
    // The lift at the landing's east end, its doors west onto the forecourt and onto the deck.
    const LIFT: Rect = [5.1, 10.35, 5.1 + LIFT_OUT.d, 10.35 + 2 * LIFT_OUT.hw];
    b.with({ rot: 3, t: [LIFT[0], 0, (LIFT[1] + LIFT[3]) / 2] }, () => lift(b, {
      levels: [{ y: GY, ja: '地上', en: 'Street' }, { y, ja: 'デッキ', en: 'Deck' }], mat: 'metal:#dfe3e6',
    }));
    for (const [k, [a, c0, e, c1]] of [LAND, W].entries()) {
      const holes = k === 0 ? [LIFT] : [];
      b.slab(UNDER, a, c0, e, c1, y - 0.45, y - 0.02, holes);
      b.slab(FLOOR, a, c0, e, c1, y - 0.02, y, holes, false);
      // The sky-blue band along its edges (the station's fins).
      b.deco(EDGE, a - 0.03, y - 0.42, c0 - 0.03, e + 0.03, y - 0.28, c1 + 0.03);
      // The glass roof on its white frame, ribs across every 1.8 m.
      b.deco('glass', a - 0.3, y + 2.9, c0 - 0.3, e + 0.3, y + 2.94, c1 + 0.3);
      for (const [p, q, r2, t] of [[a - 0.3, c0 - 0.3, e + 0.3, c0 - 0.15], [a - 0.3, c1 + 0.15, e + 0.3, c1 + 0.3], [a - 0.3, c0 - 0.3, a - 0.15, c1 + 0.3], [e + 0.15, c0 - 0.3, e + 0.3, c1 + 0.3]]) b.deco(STEEL, p, y + 2.82, q, r2, y + 3.0, t);
      if (e - a < c1 - c0) for (let z = c0; z < c1; z += 1.8) b.deco(STEEL, a - 0.3, y + 2.84, z, e + 0.3, y + 2.9, z + 0.08);
      else for (let x = a; x < e; x += 1.8) b.deco(STEEL, x, y + 2.84, c0 - 0.3, x + 0.08, y + 2.9, c1 + 0.3);
    }
    b.zone('street', LAND[0] + 0.2, y - 0.2, LAND[1] + 0.2, LAND[2] - 0.2, y + 2.8, LAND[3], '雲雀野駅前デッキ', 'Hibarino Station Deck', true);
    b.zone('street', W[0] + 0.2, y - 0.2, W[1], W[2] - 0.2, y + 2.8, W[3] - 0.2, '雲雀野駅前デッキ', 'Hibarino Station Deck', true);
    // Glass parapets, posts along them carrying the roof.
    const post = (x: number, z: number) => b.box(STEEL, x - 0.07, y, z - 0.07, x + 0.07, y + 2.9, z + 0.07);
    rail(b, x0, LAND[1], x0 + 0.08, W[3], y);
    rail(b, x1 - 0.08, W[1], x1, W[3], y);
    rail(b, x0, LAND[1], LAND[2], LAND[1] + 0.08, y);
    rail(b, x1, LAND[3] - 0.08, LAND[2], LAND[3], y);
    rail(b, LAND[2] - 0.08, 12.4, LAND[2], LAND[3], y);
    for (let z = LAND[1] + 0.1; z < W[3] - 0.5; z += 3.6) for (const x of [x0 + 0.04, x1 - 0.04]) if (z > LAND[3] || x < x1) post(x, z);
    for (let x = x1 + 1.8; x < LAND[2]; x += 3.6) { post(x, LAND[1] + 0.04); post(x, LAND[3] - 0.04); }
    for (let z = LAND[1] + 1; z < W[3] - 1; z += 4.5) ceilingLight(b, x0 + 1.4, x1 - 1.4, z, z + 1.2, y + 2.8);
    for (let x = x1 + 1; x < LIFT[0] - 1; x += 4.5) ceilingLight(b, x, x + 1.2, LAND[1] + 1.4, LAND[3] - 1.4, y + 2.8);
    // The stair and the escalator up from the forecourt, east of the lift (rising west).
    const run = 10.8;
    b.with({ rot: 2, t: [LAND[2] + run, 0, 0] }, () => {
      stairs(b, { x0: 0, x1: run, z0: -11.3, z1: -LAND[1], yLow: GY, yHigh: y });
      escalator(b, { x0: 0, x1: run, z0: -12.4, z1: -11.4, yLow: GY, yHigh: y, dir: 1 });
    });
    // Round columns on the forecourt, the island and both pavements of the main road.
    for (const [cx, cz] of [[-4, 13.6], [3, 13.6], [-4, 23.5], [-4, 31], [-4, 34.8], [-4, 53.3]]) {
      b.mesh(STEEL, 'cyl', cx, (GY + y - 0.45) / 2, cz, 0.55, y - 0.45 - GY, 0.55);
      b.block(cx - 0.28, GY, cz - 0.28, cx + 0.28, y - 0.45, cz + 0.28);
    }
    // Where it goes, either end.
    b.sign({ k: 'label', text: 'スーパー ことり屋・穂波通', sub: 'Kotoriya Supermarket / Honami-dōri', fg: '#ffffff', bg: '#1f3f7a' }, (x0 + x1) / 2, y + 2.45, LAND[3] + 2, [0, -1], 3.2, 0.42);
    b.sign({ k: 'label', text: '雲雀野駅・バスのりば', sub: 'Hibarino Station / Buses', fg: '#ffffff', bg: '#1f3f7a' }, (x0 + x1) / 2, y + 2.45, W[3] - 2.5, [0, 1], 3.2, 0.42);
    // A sign on a post by the stair's foot for those coming along the forecourt from the east.
    roadModel(b, 'signpole', LAND[2] + run + 1.2, GY, 13.4, [1, 0]);
    b.block(LAND[2] + run + 1.14, GY, 13.34, LAND[2] + run + 1.26, GY + 2, 13.46);
    b.sign({ k: 'label', text: 'デッキ・エレベーター', sub: 'Deck / Lift', fg: '#ffffff', bg: '#1f3f7a' }, LAND[2] + run + 1.27, GY + 2.4, 13.4, [1, 0], 1.6, 0.42);
    // At night the roof's lights light the walk (glow discs: lamps.ts INDOOR_LAMP).
    for (let z = LAND[1] + 1.6; z < W[3] - 1; z += 9) b.mesh('glow:#ffe6b8', 'sphere', (x0 + x1) / 2, y + 2.78, z + 0.6, 0.6, 0.02, 0.25);
  }

  // ── スーパー ことり屋 雲雀野駅前店: the sales floor on the ground, a lobby off the deck on the first floor ──
  {
    const [x0, z0, x1, z1] = MART;
    const ix0 = x0 + 0.3, ix1 = x1 - 0.3, iz0 = z0 + 0.3, iz1 = z1 - 0.3, TOP = DY + 8;
    const WALLS = 'panel:#e8e4da', BRAND = 'flat:#2f8f4e', CREAM = 'flat:#f4f1e2', GL = 'glass';
    const ENT: [number, number] = [9, 13];
    /** The lobby on the first floor: the deck's doors, the lift and the stair down. */
    const LOB: Rect = [ix0, iz0, 2, 63];
    const STAIR: Rect = [ix0, 57, -8.9, 62], LIFTR: Rect = [-5 - LIFT_OUT.hw, 59, -5 + LIFT_OUT.hw, 59 + LIFT_OUT.d];
    reserved.push(MART);
    // Side and back walls the whole height, the roof, the closed floors above the lobby.
    b.box(WALLS, x0, GY, z0, ix0, TOP, z1);
    b.box(WALLS, ix1, GY, z0, x1, TOP, z1);
    b.box(WALLS, ix0, GY, iz1, ix1, TOP, z1);
    b.box('flat:#cfcbc2', x0, TOP, z0, x1, TOP + 0.4, z1);
    b.box('flat:#efeee9', ix0, DY + 3.5, iz0, ix1, DY + 4, iz1);
    // The front: glass on the ground floor with the doors, a band at the first floor, the lobby's glass by the deck.
    const glassRun = (a: number, e: number, ya: number, yb: number) => {
      b.block(a, ya, z0, e, yb, iz0);
      b.deco(GL, a, ya + 0.4, z0 + 0.05, e, yb - 0.3, iz0 - 0.05);
      b.deco(BRAND, a, ya, z0, e, ya + 0.4, iz0);
      b.deco(CREAM, a, yb - 0.3, z0, e, yb, iz0);
    };
    glassRun(ix0, ENT[0], GY, DY - 0.6);
    glassRun(ENT[1], ix1, GY, DY - 0.6);
    b.box(CREAM, ENT[0], GY + 2.6, z0, ENT[1], DY - 0.6, iz0);
    b.box(BRAND, x0, DY - 0.6, z0, x1, DY, iz0);
    glassRun(ix0, DECK_X[0], DY, DY + 3.5);
    glassRun(DECK_X[1], LOB[2], DY, DY + 3.5);
    b.box(CREAM, DECK_X[0], DY + 2.6, z0, DECK_X[1], DY + 3.5, iz0);
    b.box(WALLS, LOB[2], DY, z0, x1, DY + 3.5, iz0);
    b.box(WALLS, x0, DY + 3.5, z0, x1, TOP, iz0);
    for (let x = x0 + 1.5; x < x1 - 1; x += 3) b.deco('flat:#cfd6da', x, DY + 4.6, z0 - 0.04, x + 1.8, DY + 6.9, z0);
    b.sign({ k: 'shop', ja: 'スーパー ことり屋', en: 'Kotoriya', bg: '#2f8f4e', fg: '#ffffff' }, 17, DY + 5.8, z0 - 0.06, [0, -1], 12, 2.4);
    b.sign({ k: 'label', text: 'ことり屋 雲雀野駅前店', sub: 'Kotoriya — Hibarino Ekimae · 9:00–22:00', fg: '#ffffff', bg: '#2f8f4e' }, (ENT[0] + ENT[1]) / 2, GY + 3.2, z0 - 0.04, [0, -1], 3.8, 0.6);
    b.sign({ k: 'label', text: '2F デッキ入口', sub: 'Deck entrance', fg: '#ffffff', bg: '#2f8f4e' }, (DECK_X[0] + DECK_X[1]) / 2, DY + 3.0, z0 - 0.04, [0, -1], 3.4, 0.5);
    b.deco(BRAND, ENT[0] - 1, GY + 2.75, z0 - 1.4, ENT[1] + 1, GY + 2.9, z0);
    // The back on Honami-dōri: the delivery bay's shutter.
    b.deco('flat:#9aa0a4', 20, GY, z1, 26, GY + 3.2, z1 + 0.05);
    b.sign({ k: 'label', text: '搬入口', sub: 'Deliveries', fg: '#1f2023', bg: '#f4f1e2' }, 23, GY + 3.6, z1 + 0.06, [0, 1], 1.6, 0.4);

    // The first floor's slab, open over the stair and the lift.
    b.slab('flat:#d9d6cf', ix0, iz0, ix1, iz1, DY - 0.45, DY, [STAIR, LIFTR]);
    b.slab('ceil', ix0, iz0, ix1, iz1, DY - 0.47, DY - 0.45, [STAIR, LIFTR], false);
    // The lobby: its walls, ceiling and floor; the rest of the first floor is the store's offices.
    b.box(WALLS, LOB[2], DY, iz0, LOB[2] + 0.15, DY + 3.5, LOB[3] + 0.15);
    b.box(WALLS, ix0, DY, LOB[3], LOB[2], DY + 3.5, LOB[3] + 0.15);
    b.slab('floor:#d8d2c4', LOB[0], LOB[1], LOB[2], LOB[3], DY + 0.002, DY + 0.01, [STAIR, LIFTR], false);
    b.deco('ceil', LOB[0], DY + 3.2, LOB[1], LOB[2], DY + 3.25, LOB[3]);
    for (const x of [-9, -3.5, 0.5]) ceilingLight(b, x - 0.6, x + 0.6, 58, 59.2, DY + 3.2);
    b.keepOut(LOB[2] + 0.3, DY + 0.1, iz0 + 0.3, ix1 - 0.3, DY + 3.3, iz1 - 0.3, 'Kotoriya first-floor offices');
    b.keepOut(ix0 + 0.3, DY + 0.1, LOB[3] + 0.4, LOB[2], DY + 3.3, iz1 - 0.3, 'Kotoriya first-floor offices');
    b.keepOut(x0, DY + 4.1, z0, x1, TOP + 3, z1, 'Kotoriya upper floors and roof');
    rail(b, STAIR[0], STAIR[3], STAIR[2], STAIR[3] + 0.08, DY);
    rail(b, STAIR[2] - 0.08, STAIR[1], STAIR[2], STAIR[3] + 0.08, DY);
    b.zone('street', LOB[0] + 0.2, DY - 0.2, LOB[1] + 0.2, LOB[2] - 0.2, DY + 3.2, LOB[3] - 0.2, 'ことり屋 2階 デッキ入口', 'Kotoriya — deck entrance (2F)');
    b.sign({ k: 'label', text: '売場は1階です', sub: 'Shop floor downstairs', fg: '#ffffff', bg: '#2f8f4e' }, -9.8, DY + 2.6, 56.8, [0, -1], 1.8, 0.42);
    // The stair down along the west wall (rising north), the lift beside it.
    b.with({ rot: 3, t: [-9.8, 0, 67.8] }, () => stairs(b, { x0: 0, x1: 10.8, z0: -0.8, z1: 0.8, yLow: GY, yHigh: DY }));
    b.with({ t: [-5, 0, 59] }, () => lift(b, { levels: [{ y: GY, ja: '1階 売場', en: 'Shop floor' }, { y: DY, ja: '2階 デッキ', en: 'Deck' }], mat: 'metal:#dfe3e6' }));

    // The sales floor: pale floor, its lights, three columns, the fittings (konbini.ts's models).
    b.deco('floor:#e9e8e2', ix0, GY + 0.002, iz0, ix1, GY + 0.01, iz1);
    for (let x = ix0 + 2.5; x + 2.4 < ix1; x += 4.5) for (const z of [58, 62.5, 67, 71.5, 75]) {
      if (x < -7.8 && z < 69) continue;
      ceilingLight(b, x, x + 2.4, z - 0.22, z + 0.22, DY - 0.47);
    }
    for (const cx of [0, 12, 24]) b.box(CREAM, cx - 0.3, GY, 65.7, cx + 0.3, DY - 0.45, 66.3);
    const fit = (id: string, x: number, z: number, f: [number, number] = [0, -1]) => {
      const dd = b.dir(f);
      b.out.models.push({ kind: 'konbini', id, pos: b.pt(x, GY, z), yaw: Math.atan2(-dd[0], -dd[1]), seed: 0, merge: true });
      const [l, dp, hh] = FIT[id];
      const hx = f[0] !== 0 ? dp / 2 : l / 2, hz = f[0] !== 0 ? l / 2 : dp / 2;
      b.block(x - hx, GY, z - hz, x + hx, GY + hh, z + hz);
    };
    // Checkouts by the doors, the tills facing the shop.
    for (const x of [16, 19, 22, 25, 28]) fit('counter', x, 59.4, [-1, 0]);
    fit('baskets', 14.4, 56.2, [0, 1]);
    fit('baskets', 7.6, 56.2, [0, 1]);
    // Produce along the front glass, gondola runs across the floor with a cross aisle every four.
    for (let x = -1.2; x < 7; x += 2.4) fit('gondola', x, 58.2);
    for (const z of [64.5, 68, 71.5]) for (let k = 0, x = -5.2; x < ix1 - 3; k++, x += k % 4 === 0 ? 4.4 : 2.4) fit('gondola', x, z);
    // Chillers along the back, shelves along the east wall.
    for (let x = -7.4; x + 1.2 < ix1 - 0.2; x += 2.4) fit('fridge', x, iz1 - 0.375, [0, -1]);
    for (let z = 62.4; z + 1.2 < iz1 - 1.2; z += 2.4) fit('wallshelf', ix1 - 0.225, z, [-1, 0]);
    // Department boards hung from the ceiling.
    const board = (text: string, sub: string, x: number, z: number, f: [number, number]) => b.sign({ k: 'label', text, sub, fg: '#ffffff', bg: '#2f8f4e' }, x, DY - 1.3, z, f, 2.2, 0.45);
    board('青果', 'Produce', 3, 57.6, [0, 1]);
    board('レジ', 'Checkout', 22, 57.4, [0, 1]);
    board('日配・冷蔵', 'Chilled', 10, iz1 - 1.6, [0, -1]);
    board('精肉・鮮魚', 'Meat & Fish', 26, iz1 - 1.6, [0, -1]);
    board('お菓子・飲料', 'Snacks & Drinks', ix1 - 1.5, 68, [-1, 0]);
    board('日用品', 'Household', 6, 69.8, [0, -1]);
    b.zone('street', ix0 + 0.3, GY - 0.2, iz0 + 0.3, ix1 - 0.3, DY - 0.6, iz1 - 0.3, 'スーパー ことり屋 雲雀野駅前店', 'Kotoriya Supermarket');
    // The lane east of it from the main road to Honami-dōri.
    lanePave(x1, FS, MUGI0, HON0, laneName());
  }

  // ═════════════════════════ North of the tracks ═════════════════════════
  // ── Saezuri Hachiman: the torii on Saezuri-dōri, the approach north between lanterns, the hall in its grove ──
  {
    const [x0, z0, x1, z1] = SHRINE, A = HIBARI;
    const sx = (x0 + x1) / 2 + 2, hallZ = z0 + 24;
    // Gravel precinct with a stone approach down the middle, the grove round it.
    b.deco(GRAVEL, x0 + 0.3, GY + 0.002, z0 + 0.3, x1 - 0.3, GY + 0.01, z1 - 0.3);
    b.deco(ISHI, sx - 1.5, GY + 0.004, hallZ, sx + 1.5, GY + 0.014, z1);
    reserved.push(SHRINE);
    b.zone('street', x0 + 0.5, GY - 0.2, z0 + 0.5, x1 - 0.5, GY + 10, z1 - 0.3, '囀八幡神社', 'Saezuri Hachiman Shrine', true);
    piece('hibari', A, 'torii', 's', sx, z1 - 0.8, undefined, false);
    for (const s of [-1, 1]) b.block(sx + s * 3 - 0.3, GY, z1 - 1.1, sx + s * 3 + 0.3, GY + 6, z1 - 0.5);
    for (let z = z1 - 6; z > hallZ + 3; z -= 6) for (const s of [-1, 1]) {
      piece('hibari', A, 'toro', 's', sx + s * 3.2, z, undefined, false);
      b.block(sx + s * 3.2 - 0.45, GY, z - 0.45, sx + s * 3.2 + 0.45, GY + 2.4, z + 0.45);
    }
    piece('hibari', A, 'chozuya', 'e', sx - 7, hallZ + 12, undefined, false);
    b.block(sx - 8.3, GY, hallZ + 10.3, sx - 5.7, GY + 3.2, hallZ + 13.7);
    // The hall faces south onto the approach; its collider covers the worship hall and the main hall behind.
    piece('hibari', A, 'haiden', 's', sx, hallZ, (a) => {
      if (a.pts.saisen) label(a.pts.saisen, '奉納', undefined, '#2a2019', '#f1ead8');
    }, false);
    b.block(sx - 6.1, GY, hallZ - 16.6, sx + 6.1, GY + 9.6, hallZ + 0.6);
    b.block(sx - 2, GY, hallZ + 0.6, sx + 2, GY + 1.0, hallZ + 1.4);
    // The sacred camphor and the grove: tall trees round the edge, cedars behind the hall.
    modelTree(b, 'camphor', sx + 8, hallZ + 6, 'a');
    b.block(sx + 7.5, GY, hallZ + 5.5, sx + 8.5, GY + 4, hallZ + 6.5);
    for (let z = z0 + 4; z < z1 - 4; z += 7) for (const x of [x0 + 2.5, x1 - 2.5]) if (Math.abs(z - z1) > 6 || x > sx) modelTree(b, (z | 0) % 2 ? 'cedar' : 'camphor', x, z, 'b');
    for (const x of [sx - 8, sx + 8]) modelTree(b, 'cedar', x, z0 + 3, 'a');
    // The shrine's name on a stone post (社号標) beside the torii.
    b.box(ISHI, sx + 4.2, GY, z1 - 1.3, sx + 5.0, GY + 2.6, z1 - 0.5);
    b.sign({ k: 'shop', ja: '囀八幡神社', bg: '#d9d3c6', fg: '#2a2019', vertical: true }, sx + 4.6, GY + 1.45, z1 - 0.48, [0, 1], 0.7, 2.1);
    for (const s of [-1, 1]) streetLamp(b, 'lamp_park', sx + s * 4.6, z1 - 3, [-s, 0]);
  }
  // ── Agehibari Hill: two terraces of lawn up the park's middle, paths up by ramps, the pavilion on top ──
  {
    const [x0, z0, x1, z1] = PARK;
    b.deco(GRASS, x0 + 0.3, GY + 0.002, z0 + 0.3, x1 - 0.3, GY + 0.01, z1 - 0.3);
    reserved.push(PARK);
    b.zone('street', x0 + 0.5, GY - 0.2, z0 + 0.5, x1 - 0.5, GY + 12, z1 - 0.3, '揚雲雀の丘公園', 'Agehibari Hill Park', true);
    const T1: Rect = [x0 + 12, z0 + 8, x1 - 10, z0 + 40], T2: Rect = [x0 + 22, z0 + 12, x1 - 22, z0 + 30];
    const H1 = 1.8, H2 = 3.6;
    // The terraces: lawn on top, a stone edge, solid underneath.
    for (const [[a0, c0, a1, c1], h] of [[T1, H1], [T2, H2]] as [Rect, number][]) {
      b.box('flat:#8a8479', a0, GY, c0, a1, GY + h - 0.12, c1);
      b.box(GRASS, a0 + 0.15, GY + h - 0.12, c0 + 0.15, a1 - 0.15, GY + h, c1 - 0.15);
    }
    // Ramps: up to the first terrace from the south, then to the top from the east.
    const p1x = (T1[0] + T1[2]) / 2 + 10, run1 = 14;
    b.ramp(p1x - 1.5, T1[3], p1x + 1.5, T1[3] + run1, GY, GY + H1, [0, -1]);
    for (let k = 0; k < 7; k++) b.box(GRAVEL, p1x - 1.5, GY, T1[3] + run1 * k / 7, p1x + 1.5, GY + H1 * (7 - k) / 7 - 0.05, T1[3] + run1 * (k + 1) / 7, false);
    for (const s of [-1, 1]) b.block(p1x + s * 1.6 - 0.05, GY, T1[3], p1x + s * 1.6 + 0.05, GY + H1 + 0.9, T1[3] + run1);
    const p2z = (T2[1] + T2[3]) / 2, run2 = T1[2] - T2[2];
    b.ramp(T2[2], p2z - 1.5, T2[2] + run2, p2z + 1.5, GY + H1, GY + H2, [-1, 0]);
    for (let k = 0; k < 7; k++) b.box(GRAVEL, T2[2] + run2 * k / 7, GY + H1 - 0.1, p2z - 1.5, T2[2] + run2 * (k + 1) / 7, GY + H2 - (H2 - H1) * k / 7 - 0.05, p2z + 1.5, false);
    for (const s of [-1, 1]) b.block(T2[2], GY + H1, p2z + s * 1.6 - 0.05, T2[2] + run2, GY + H2 + 0.9, p2z + s * 1.6 + 0.05);
    // The pavilion and its view south over the station.
    const pv: [number, number] = [(T2[0] + T2[2]) / 2 - 4, (T2[1] + T2[3]) / 2];
    b.with({ t: [pv[0], GY + H2 - GY, pv[1]], rot: 2 }, () => {
      b.model('hibari', 'azumaya', 0, GY, 0, 1);
      for (const x of [-2.4, 2.4]) for (const z of [-2.4, 2.4]) b.block(x - 0.15, GY, z - 0.15, x + 0.15, GY + 2.6, z + 0.15);
      if (HIBARI.azumaya.pts.guide) label(HIBARI.azumaya.pts.guide, '揚雲雀の丘', 'Agehibari Hill — skylarks nest in the meadow in spring', '#f4f1e8', '#2f6b45');
    });
    for (const [tx, tz] of [[x0 + 6, z0 + 6], [x0 + 6, z1 - 8], [x1 - 6, z1 - 8], [x1 - 6, z0 + 6], [x0 + 30, z1 - 6], [x0 + 46, z1 - 6]]) modelTree(b, 'cherry', tx, tz, 'a');
    for (const [tx, tz] of [[T2[0] + 3, T2[1] + 3], [T2[2] - 3, T2[3] - 3]]) modelTree(b, 'zelkova', tx, tz, 'b', GY + H2);
    for (let x = x0 + 8; x < x1 - 4; x += 18) streetLamp(b, 'lamp_park', x, z1 - 2, [0, 1]);
    for (const z of [z0 + 20, z1 - 16]) streetLamp(b, 'lamp_park', x1 - 2, z, [-1, 0]);
    // Benches facing the hill along the south path.
    for (const bx of [x0 + 18, x0 + 34]) {
      roadModel(b, 'bench_s', bx, GY, z1 - 4, [0, -1]);
      b.block(bx - 0.95, GY, z1 - 4.4, bx + 0.95, GY + 0.6, z1 - 3.6);
    }
  }

  // ═════════════════════════ The rows behind the fronts ═════════════════════════
  const interiors: Rect[] = [];
  // ── North of Saezuri-dōri: the block between the shrine and Mugibatake-suji, a lane through it ──
  const LN: [number, number] = [6, 8.5];
  lanePave(LN[0], -Z, LN[1], SAE0, laneName());
  fillRect(-24 + 0.3, SAE0 - 12, LN[0] - 0.3, SAE0 - 0.15, 's', HOMES);
  fillRect(LN[1] + 0.3, SAE0 - 12, MUGI0 - 12.3, SAE0 - 0.15, 's', HOMES);
  fillRect(MUGI0 - 12, -Z + 0.3, MUGI0 - 0.15, SAE0 - 0.3, 'e', SMALL);
  fillRect(-24 + 0.3, -Z + 0.3, LN[0] - 0.15, SAE0 - 12.3, 'e', HOMES, false, true);
  fillRect(LN[1] + 0.15, -Z + 0.3, MUGI0 - 12.3, SAE0 - 12.3, 'w', HOMES);
  interiors.push([-24, -Z, MUGI0 - 12, SAE0 - 12]);
  // Houses on Nobe-suji north of the shrine's hall are part of the precinct's grove; nothing here.
  // ── NE: Mugibatake row, rows facing north on the edge, leftovers ──
  // The lane behind opens onto Mugibatake-suji between two of the row's buildings.
  const LE: [number, number] = [-48.5, -46];
  fillRect(MUGI1 + 0.15, -Z + 0.3, MUGI1 + 12, LE[0] - 0.15, 'w', SMALL);
  fillRect(MUGI1 + 0.15, LE[1] + 0.15, MUGI1 + 12, -VIA - 0.3, 'w', SMALL);
  lanePave(MUGI1, LE[0], X, LE[1], laneName());
  fillRect(MUGI1 + 12.3, -Z + 0.3, X - 0.3, LE[0] - 0.15, 'w', HOMES);
  fillRect(MUGI1 + 12.3, LE[1] + 0.15, X - 0.3, -PLAT - 0.3, 'n', HOMES, false, true);
  interiors.push([MUGI1 + 12, -Z, X, -VIA]);
  // ── Between Saezuri-dōri and the viaduct ──
  // (Nothing tall within reach of the platforms' edges, z ±PLAT: this strip is low ground, by leftovers().)
  interiors.push([-X, SAE1, NOBE0, -PLAT], [NOBE1, SAE1, BLDG[0], -PLAT], [PLAZA_N[2], SAE1, MUGI0, -PLAT]);
  // ── South of the viaduct, behind the main road's north fronts ──
  interiors.push([-X, PLAT, NOBE0, FN - 16], [NOBE1, PLAT, FORE[0], FN - 16 - 2.5], [MUGI1, PLAT, X, FN - 16]);
  interiors.push([FORE[2], PLAT, MUGI0, ROT.z0], [ROT.el[1], ROT.z0, MUGI0, FN - PLACES.koban.d]);
  // ── South of the main road ──
  fillRect(NOBE0 - 12, FS + 16.3, NOBE0 - 0.15, HON0 - 0.3, 'e', SMALL);
  fillRect(NOBE1 + 0.15, FS + 16.3, NOBE1 + 12, HON0 - 0.3, 'w', SMALL);
  interiors.push([-X, FS + 16, NOBE0 - 12, HON0], [NOBE1 + 12, FS + 16, ARC.x0 - SHOP_D, HON0]);
  interiors.push([ARC.x0 - SHOP_D - 2.8, FS, ARC.x0 - SHOP_D, FS + 16]);
  const LS: [number, number] = [86, 88.5];
  lanePave(LS[0], FS + 16, LS[1], HON0, laneName());
  interiors.push([MUGI1, FS + 16, LS[0], HON0], [LS[1], FS + 16, X, HON0]);
  // South of Honami-dōri: the pavement to the plot's edge.
  reserved.push([-X, HON1, X, Z]);

  // ── What is left over inside the blocks: no bare ground ──
  leftovers(b, r, interiors, reserved, holes, { park: [{ ja: '雲雀野児童遊園', en: 'Hibarino Children’s Park' }, { ja: '麦畑ひろば', en: 'Mugibatake Square' }] }, piece);

  // ═════════════════════════ The dress ═════════════════════════
  {
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
    const rack = (x: number, z: number, s: 1 | -1) => {
      const f: [number, number] = [0, s];
      if (b.solidIn(x - 2.05, GY + 0.05, Math.min(z, z + s * 2.2), x + 2.05, GY + 1.1, Math.max(z, z + s * 2.2))) return;
      roadModel(b, 'bikerack', x, GY, z, f);
      for (let k = 0; k < 8; k++) if (r() < 0.8) bike(x - 1.75 + k * 0.5, z + s * 0.95, [1, 0]);
      b.block(x - 2.05, GY, Math.min(z - s * 0.05, z + s * 1.9), x + 2.05, GY + 1.1, Math.max(z - s * 0.05, z + s * 1.9));
    };
    // Under the viaduct: long rows of racks between the piers, both sides of the station.
    for (const [a, e] of [[-54, -36], [30, 52]]) for (let x = a + 2.2; x < e - 2; x += 4.4) {
      if (!clearOf(x, [[MUGI0 - 1, MUGI1 + 1]], 2.2)) continue;
      rack(x, -3.0, 1);
    }
    // Its name board on the pier at x −40.5, on brackets.
    b.sign({ k: 'label', text: '雲雀野駅 自転車駐車場', sub: 'Bicycle parking', fg: '#fff', bg: '#2f6b45' }, -40.5, GY + 2.4, 4.6 + 0.6, [0, 1], 3.2, 0.6);
    b.deco('flat:#3a3f45', -41.9, GY + 2.05, 5.15, -39.1, GY + 2.12, 5.18);
    // The north plaza: racks along its back edge, the area map, a phone box and a post box.
    for (const x of [10.5, 14.9, 19.3]) rack(x, SAE1 + 0.4, 1);
    // (The plaza's kerb runs round the taxi bay.)
    if (prop('mapstand', 0.5, -15.2, [0, -1], 0.86, 0.12, 2.1)) b.sign({ k: 'areamap', station: st.id }, 0.5, GY + 1.45, -15.2 - 0.05, [0, -1], 1.46, 1.06);
    prop('postbox', 24, -14, [0, -1], 0.25, 0.22, 1.4);
    prop('phonebox', 23.8, -16.2, [0, -1], 0.52, 0.52, 2.4);
    modelTree(b, 'dogwood', 8, -15.4, 'b', GY, true);
    // The north front's taxi stand on Saezuri-dōri's south kerb (westbound, keeping left).
    for (let k = 0; k < 3; k++) {
      const tx = -9 - k * 5.4;
      const tz = (TAXI_N[1] + TAXI_N[3]) / 2 + 0.2;
      roadModel(b, 'taxi', tx, 0, tz, [-1, 0]);
      b.block(tx - 2.25, 0, tz - 0.86, tx + 2.25, 1.6, tz + 0.86);
    }
    b.deco(WHITE, TAXI_N[0] + 0.3, 0.004, TAXI_N[1] + 0.05, TAXI_N[2] - 0.3, 0.01, TAXI_N[1] + 0.15);
    roadModel(b, 'signpole', -3.2, GY, TAXI_N[3] + 0.4, [0, -1]);
    b.block(-3.26, GY, TAXI_N[3] + 0.34, -3.14, GY + 2, TAXI_N[3] + 0.46);
    b.sign({ k: 'label', text: 'タクシーのりば', sub: 'Taxi', fg: '#111', bg: '#ffd100' }, -3.2, GY + 2.4, TAXI_N[3] + 0.35, [0, -1], 2.2, 0.55);
    // The forecourt: benches, a mapstand by the zebra, the station's own racks at its west end.
    if (prop('mapstand', -10, 12.6, [0, -1], 0.86, 0.12, 2.1)) b.sign({ k: 'areamap', station: st.id }, -10, GY + 1.45, 12.6 - 0.05, [0, -1], 1.46, 1.06);
    for (const x of [-36.5]) rack(x, 9.6, 1);
    prop('bench_s', 29, 11.2, [0, -1], 0.95, 0.4, 0.6);
    // The lanes: pot plants and plant shelves against the walls.
    const laneRects: Rect[] = [[NOBE1, FN - 18.5, ROT.wl[0], FN - 16], [MART[2], FS, MUGI0, HON0], [LN[0], -Z, LN[1], SAE0], [MUGI1, LE[0], X, LE[1]], [LS[0], FS + 16, LS[1], HON0]];
    laneRects.forEach(([x0, z0, x1, z1], li) => {
      const alongX = x1 - x0 > z1 - z0, len = alongX ? x1 - x0 : z1 - z0;
      for (let u = 4, k = li; u < len - 4; u += 9, k++) {
        const side = k % 2 ? 1 : 0, id = k % 3 === 0 ? 'potpine' : 'plantshelf';
        const [hw, hd] = id === 'potpine' ? [0.25, 0.25] : [0.6, 0.3];
        if (alongX) prop(id, x0 + u, side ? z1 - hd - 0.02 : z0 + hd + 0.02, [0, side ? -1 : 1], hw, hd, 1.1);
        else prop(id, side ? x1 - hd - 0.02 : x0 + hd + 0.02, z0 + u, [side ? -1 : 1, 0], hw, hd, 1.1);
      }
    });
    // Curve mirrors across the street from each lane's mouth, turned to the lane.
    prop('mirror', (LN[0] + LN[1]) / 2, SAE1 - 0.35, [0, -1], 0.1, 0.1, 3.2);
    prop('mirror', MUGI0 + 0.35, (LE[0] + LE[1]) / 2, [1, 0], 0.1, 0.1, 3.2);
    prop('mirror', (LS[0] + LS[1]) / 2, HON1 + 0.4, [0, -1], 0.1, 0.1, 3.2);
    // The arcade's mouth on Hibarino-dōri: an A-board and the sale banners either side.
    prop('aboard', ARC.x0 - 2.0, FS - 1.2, [0, -1], 0.3, 0.3, 1.0);
    for (const x of [ARC.x0 - 1.0, ARC.x1 + 1.0]) prop('nobori', x, FS - 1.2, [0, -1], 0.15, 0.15, 2.6);
    // The island: planters either side of the zebra's landing.
    for (const x of [-17, -9]) prop('planter', x, ISLAND[1] + 1.3, [0, -1], 0.6, 0.35, 0.8);
  }

  // ═════════════════════════ Past the plot's edge ═════════════════════════
  {
    const OUT = 180, CW = 3.5, CROSS = OUT / 2, NEAR = ['machi', 'shophouse'];
    type Edge = { c: number; half: number; pave: number; kind: 'main' | 'suji' | 'back'; way?: 1 | -1 };
    const span = (alongZ: boolean, s: 1 | -1) => {
      const lim = alongZ ? Z : X, u0 = s > 0 ? lim : -lim - OUT, uc = s > 0 ? lim + CROSS : -lim - CROSS;
      return { u0, u1: u0 + OUT, mouth: [uc - CW, uc + CW] as [number, number], near: (s > 0 ? [lim, uc] : [uc, -lim]) as [number, number] };
    };
    const roadOut = (alongZ: boolean, s: 1 | -1, q: Edge) => {
      const { u0, u1, mouth, near } = span(alongZ, s);
      const R = (mat: string, v0: number, v1: number, y0: number, y1: number, a = u0, e = u1) => (alongZ ? b.deco(mat, q.c + v0, y0, a, q.c + v1, y1, e) : b.deco(mat, a, y0, q.c + v0, e, y1, q.c + v1));
      R('asphalt', -q.half, q.half, -0.03, 0.004);
      // Kept open by the slot closing below: the road, its pavements and the cross street's mouth.
      const w = q.half + q.pave + 0.3;
      reserved.push(alongZ ? [q.c - w, u0, q.c + w, u1] : [u0, q.c - w, u1, q.c + w]);
      for (const [a, e] of [[u0, mouth[0]], [mouth[1], u1]] as [number, number][]) {
        if (q.pave > 0) for (const k of [-1, 1]) R('paver', Math.min(k * q.half, k * (q.half + q.pave)), Math.max(k * q.half, k * (q.half + q.pave)), -0.03, GY, a, e);
        const [la, le] = [a === u0 ? a : a + 1, e === u1 ? e : e - 1];
        for (const k of [-1, 1]) R(WHITE, k * (q.half - 0.5) - 0.05, k * (q.half - 0.5) + 0.05, 0.004, 0.01, la, le);
        if (q.kind === 'main') R(YELLOW, -0.08, 0.08, 0.004, 0.01, la, le);
      }
      const from = near[0] + 6, to = near[1] - 6, skip = (u: number) => (u > mouth[0] - 3 && u < mouth[1] + 3) || (alongZ && Math.abs(u) < VIA + 3);
      if (q.kind === 'main') {
        for (let u = u0 + 12; u < u1 - 6; u += 22) if (!skip(u)) for (const k of [-1, 1]) roadModel(b, 'lamp_shop', u, GY, q.c + k * (q.half + 0.6), [0, -k]);
      } else if (q.kind === 'suji') {
        poleLine(b, { axis: 'z', from, to, at: q.c - (q.half + 0.6), road: 1, step: 24, skip, drops: 0.8, cross: 7.6, name: stName });
      } else {
        const w = q.way ?? 1;
        poleLine(b, { axis: 'x', from, to, at: q.c - w * (q.half - 0.35), road: w > 0 ? 1 : -1, step: 24, skip, drops: 0.7, cross: 6.2, name: stName });
      }
    };
    const packOut = (alongZ: boolean, s: 1 | -1, a: number, e: number) => {
      const { mouth } = span(alongZ, s), lim = alongZ ? Z : X, mid = (a + e) / 2;
      for (const [d0, d1, kinds] of [[0.15, CROSS - CW, NEAR], [CROSS + CW, OUT, HOMES]] as [number, number, string[]][]) {
        let u0 = s > 0 ? lim + d0 : -lim - d1;
        const u1 = s > 0 ? lim + d1 : -lim - d0;
        if (alongZ && s > 0 && d0 < 1) {
          // Honami-dōri's south side: a row facing it; the corners face the suji, the bigger street.
          const D = 12, sa = a > -X + 1, se = e < X - 1;
          if (sa) fillRect(a + 0.2, u0, a + D, u0 + D, 'w', kinds, true);
          if (se) fillRect(e - D, u0, e - 0.2, u0 + D, 'e', kinds, true);
          fillRect(sa ? a + D + 0.15 : a + 0.2, u0, se ? e - D - 0.15 : e - 0.2, u0 + D, 'n', kinds, true);
          u0 += D + 0.15;
        }
        if (alongZ) {
          fillRect(a + 0.2, u0, mid - 0.4, u1, 'w', kinds, true);
          fillRect(mid + 0.4, u0, e - 0.2, u1, 'e', kinds, true);
        } else {
          fillRect(u0, a + 0.2, u1, mid - 0.4, 'n', kinds, true);
          fillRect(u0, mid + 0.4, u1, e - 0.2, 's', kinds, true);
        }
      }
      const C = (mat: string, v0: number, v1: number, y0: number, y1: number) => (alongZ ? b.deco(mat, a, y0, v0, e, y1, v1) : b.deco(mat, v0, y0, a, v1, y1, e));
      reserved.push(alongZ ? [a, mouth[0], e, mouth[1]] : [mouth[0], a, mouth[1], e]);
      C('asphalt', mouth[0], mouth[1], -0.03, 0.004);
      for (const v of [mouth[0] + 0.45, mouth[1] - 0.55]) C(WHITE, v, v + 0.1, 0.004, 0.01);
    };
    for (const s of [-1, 1] as const) {
      for (const q of NSS) roadOut(true, s, { c: q.c, half: q.half, pave: q.pave, kind: 'suji' });
      for (const [a, e] of between(NSS.map(bl))) {
        packOut(true, s, a, e);
        b.clearScenery(a - 9, s > 0 ? Z : -Z - OUT - 2, e + 9, s > 0 ? Z + OUT + 2 : -Z);
      }
      // East and west: the main road, the back streets; the viaduct's strip stays clear.
      roadOut(false, s, { c: MZ, half: RW, pave: 4, kind: 'main' });
      roadOut(false, s, { c: HON.z, half: HON.half, pave: 0, kind: 'back', way: HON.way });
      if (s < 0) roadOut(false, s, { c: SAE.z, half: SAE.half, pave: SAE.pave, kind: 'back', way: 1 });
      const bands: [number, number][] = [[MZ - RW - 4, MZ + RW + 4], [HON0, HON1], [-VIA - 3, VIA + 3], ...(s < 0 ? [[SAE0, SAE1] as [number, number]] : [])];
      for (const [a, e] of between(bands, -Z, Z)) {
        packOut(false, s, a, e);
        b.clearScenery(s > 0 ? X : -X - OUT - 2, a - 9, s > 0 ? X + OUT + 2 : -X, e + 9);
      }
    }
  }

  // ═════════════════════════ No slots between buildings ═════════════════════════
  // Stock rows leave 0.3 m between neighbours and up to ~2.4 m between rows set back to back: dark
  // slits with blank walls. Close them with party walls; what stays open is a real alley (≥ 2.4 m),
  // and its walls, and a tall building's side above a low neighbour, get their utility clutter.
  {
    const PIPE = 'flat:#6f726b', GAS = 'flat:#d9b23a', AC = 'flat:#e3e1da', ACG = 'flat:#9a9890', METER = 'flat:#8d918c';
    const WIN = 'flat:#2f3a44', SILL = 'flat:#d8d3c6';
    const walls = ['flat:#c9c2b4', 'flat:#bdb6a8', 'flat:#d3cdc0'];
    const all = b.out.boxes.slice(k0);
    const blds = all.filter((q) => q.solid && q.mat === 'none' && q.min[1] < GY + 1 && q.max[1] - q.min[1] > 5 && q.max[0] - q.min[0] >= 3 && q.max[2] - q.min[2] >= 3);
    const floors = all.filter((q) => !q.solid && q.mat === 'flat:#55504a');
    const streets = b.out.zones.filter((z) => (z.kind === 'street' || z.kind === 'concourse') && (z.max[0] - z.min[0] < 60 || z.max[2] - z.min[2] < 60));
    const over = (x0: number, z0: number, x1: number, z1: number, a: number, c: number, e: number, f: number) => x0 < e - 0.01 && x1 > a + 0.01 && z0 < f - 0.01 && z1 > c + 0.01;
    const inPlot = (x: number, z: number) => Math.abs(x) <= X + 1 && Math.abs(z) <= Z + 1;
    const kept = (x0: number, z0: number, x1: number, z1: number) =>
      reserved.some((q) => over(x0, z0, x1, z1, ...q)) || holes.some((q) => over(x0, z0, x1, z1, ...q)) ||
      floors.some((q) => over(x0, z0, x1, z1, q.min[0], q.min[2], q.max[0], q.max[2])) ||
      streets.some((q) => over(x0, z0, x1, z1, q.min[0], q.min[2], q.max[0], q.max[2]));
    /** Clutter on a side wall: the wall is the plane `ax` = w, facing `s` (±1) along `ax`, from u0 to u1 along the other axis, ground to `top`, `y0` the lowest it shows. */
    const clutter = (ax: 0 | 2, w: number, s: 1 | -1, u0: number, u1: number, top: number, y0: number, lamp: boolean) => {
      const D = (mat: string, a: number, e: number, y: number, yh: number, d0: number, d1: number) => {
        const [p0, p1] = [w + s * d0, w + s * d1].sort((m, n) => m - n);
        if (ax === 0) b.deco(mat, p0, y, a, p1, yh, e);
        else b.deco(mat, a, y, p0, e, yh, p1);
      };
      const L = u1 - u0;
      // Only where the player can get: past the plot's edge the rows are backdrop.
      if (L < 2 || !inPlot(ax === 0 ? w : (u0 + u1) / 2, ax === 0 ? (u0 + u1) / 2 : w)) return;
      // A drainpipe from the roof, a gas pipe along at knee height when the wall reaches the ground.
      const pu = u0 + 0.4 + r() * Math.min(1.5, L - 0.8);
      D(PIPE, pu - 0.06, pu + 0.06, Math.max(GY, y0), top, 0.02, 0.14);
      if (y0 <= GY + 0.1) {
        D(GAS, u0 + 0.3, u1 - 0.3, GY + 0.55, GY + 0.62, 0.02, 0.09);
        const mu = u0 + L * (0.3 + r() * 0.4);
        D(METER, mu - 0.25, mu + 0.25, GY + 1.3, GY + 1.85, 0.02, 0.2);
      }
      // Small windows, a floor apart, and an air-conditioning unit under some of them.
      for (let y = Math.max(GY + 3.2, y0 + 1.2); y + 1.2 < top; y += 3) {
        for (let u = u0 + 1.4 + r() * 1.2; u < u1 - 1.2; u += 2.6 + r() * 2.4) {
          if (r() < 0.25) continue;
          D(SILL, u - 0.45, u + 0.45, y - 0.08, y + 1.0, 0.01, 0.05);
          D(WIN, u - 0.35, u + 0.35, y, y + 0.9, 0.04, 0.06);
          if (r() < 0.45) {
            D(AC, u - 0.4, u + 0.4, y - 0.75, y - 0.15, 0.02, 0.32);
            D(ACG, u - 0.3, u + 0.1, y - 0.68, y - 0.22, 0.32, 0.33);
          }
        }
      }
      if (lamp) for (let u = u0 + 3; u < u1 - 1; u += 8) {
        const [lx, lz] = ax === 0 ? [w + s * 0.25, u] : [u, w + s * 0.25];
        streetLamp(b, 'lamp_small', lx, lz, ax === 0 ? [s, 0] : [0, s]);
      }
    };
    // Roads: nothing closes within 5 m of a traffic lane's line.
    const segs = b.out.lanes.map((l) => [l.from[0], l.from[2], l.to[0], l.to[2]]);
    const nearLane = (x0: number, z0: number, x1: number, z1: number) => segs.some(([ax0, az0, ax1, az1]) => {
      for (let t = 0; t <= 1; t += 0.02) {
        const px = ax0 + (ax1 - ax0) * t, pz = az0 + (az1 - az0) * t;
        if (px > x0 - 5 && px < x1 + 5 && pz > z0 - 5 && pz < z1 + 5) return true;
      }
      return false;
    });
    const empty = (x0: number, z0: number, x1: number, z1: number) => x1 - x0 > 0.04 && z1 - z0 > 0.04 && !b.solidIn(x0 + 0.02, GY + 0.5, z0 + 0.02, x1 - 0.02, GY + 3, z1 - 0.02);
    const free = (x0: number, z0: number, x1: number, z1: number) => !kept(x0, z0, x1, z1) && !nearLane(x0, z0, x1, z1);
    const steps: [0 | 2, number, 1 | -1, number, number, number, number][] = [];
    for (let i = 0; i < blds.length; i++) for (let j = i + 1; j < blds.length; j++) {
      for (const ax of [0, 2] as const) {
        const o = 2 - ax;
        const [p, q] = blds[i].min[ax] < blds[j].min[ax] ? [blds[i], blds[j]] : [blds[j], blds[i]];
        const gap = q.min[ax] - p.max[ax];
        let v0 = Math.max(p.min[o], q.min[o]), v1 = Math.min(p.max[o], q.max[o]);
        if (gap < -0.05 || gap > 12 || v1 - v0 < 3) continue;
        const hp = p.max[1], hq = q.max[1], lo = Math.min(hp, hq);
        const R = (a: number, c: number): Rect => (ax === 0 ? [p.max[0], a, q.min[0], c] : [a, p.max[2], c, q.min[2]]);
        if (Math.abs(hp - hq) > 3.5 && gap < 2.4) steps.push(hp > hq ? [ax, p.max[ax], 1, v0, v1, hp, hq] : [ax, q.min[ax], -1, v0, v1, hq, hp]);
        if (gap <= 0.05 || !empty(...R(v0, v1)) || !free(...R(v0, v1))) continue;
        // Open at both ends and narrow: a through alley, kept and dressed (not the arcade's walk).
        const endOpen = (v: number, d: number) => empty(...R(Math.min(v, v + d), Math.max(v, v + d)));
        if (gap >= 2.4 && gap <= 4.5 && endOpen(v0, -1.5) && endOpen(v1, 1.5) && !over(...R(v0, v1), ARC.x0, FS, ARC.x1, ARC.z1)) {
          clutter(ax, p.max[ax], 1, v0, v1, hp, GY, true);
          clutter(ax, q.min[ax], -1, v0, v1, hq, GY, false);
          continue;
        }
        // Otherwise closed: out to the further face of the two where that is free (no notch between them).
        const u0 = Math.min(p.min[o], q.min[o]), u1 = Math.max(p.max[o], q.max[o]);
        if (u0 < v0 - 0.05 && v0 - u0 < 3 && empty(...R(u0, v0)) && free(...R(u0, v0))) v0 = u0;
        if (u1 > v1 + 0.05 && u1 - v1 < 3 && empty(...R(v1, u1)) && free(...R(v1, u1))) v1 = u1;
        const [x0, z0, x1, z1] = R(v0, v1);
        // A party wall a little under the lower neighbour; a wide gap gets a low back annex instead.
        const top = gap < 2.4 ? Math.max(GY + 4, lo - 0.4) : Math.max(GY + 4, Math.min(lo - 0.4, GY + 7.5));
        b.box(walls[Math.floor(r() * walls.length)], x0, GY, z0, x1, top, z1, true);
        if (!inPlot((x0 + x1) / 2, (z0 + z1) / 2)) continue;
        const [g0, g1] = ax === 0 ? [x0, x1] : [z0, z1];
        for (const [v, sd] of [[v0, -1], [v1, 1]] as const) {
          if (!endOpen(v, sd * 1.2)) continue;
          if (gap < 2.4) {
            const m = (g0 + g1) / 2;
            if (ax === 0) b.deco(PIPE, m - 0.06, GY, v + sd * 0.02, m + 0.06, top, v + sd * 0.14);
            else b.deco(PIPE, v + sd * 0.02, GY, m - 0.06, v + sd * 0.14, top, m + 0.06);
          } else clutter(o as 0 | 2, v, sd, g0, g1, top, GY, false);
        }
      }
    }
    for (const s of steps) clutter(s[0], s[1], s[2], s[3], s[4], s[5], s[6], false);
  }

  /** A world position back into this station's frame (x, z). */
  function toFrame(v: number[]): [number, number] {
    const o = b.pt(0, 0, 0), ex = b.dir([1, 0]), ez = b.dir([0, 1]);
    const dx = v[0] - o[0], dz = v[2] - o[2];
    return [dx * ex[0] + dz * ex[1], dx * ez[0] + dz * ez[1]];
  }
}

const TENANTS: [string, string][] = [
  ['学習塾 ひばりゼミ', 'Hibari Seminar'], ['歯科 そよかぜ', 'Soyokaze Dental'], ['カラオケ 丘の歌', 'Oka no Uta Karaoke'], ['整体 まつば', 'Matsuba Seitai'],
  ['英会話 LARK', 'Lark English'], ['税理士 野口事務所', 'Noguchi Tax Office'], ['美容室 ルピナ', 'Lupina Hair'], ['司法書士 北川', 'Kitagawa Scrivener'],
  ['眼科 あおぞら', 'Aozora Eye Clinic'], ['ピアノ教室 ソナタ', 'Sonata Piano'], ['居酒屋 雲雀', 'Izakaya Hibari'], ['不動産 麦穂', 'Mugiho Realty'],
];
