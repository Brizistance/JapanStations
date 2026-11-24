// The streets of Aizomechō (藍染町), the old indigo dyers' quarter (rebuilt 2026-11; the owner's rules
// are in docs/street-design.md). After Osaka's surviving nagaya pockets: two big streets cross over the
// lines, and behind their fronts the old town carries on in lanes.
//
// Frame: +x east (along the Nagisa Line and Tsumugi-dōri), +z south; the Akanesuji Line runs under x = 0.
//
//   z −95    浅葱通 Asagi-dōri (two lanes)            z 95   縹通 Hanada-dōri (two lanes)
//   z −9 … 9 紬通 Tsumugi-dōri, over the Nagisa Line: four lanes, 10.5 m pavements with the metro's exits
//
//   x −125   伸子筋 Shinshi-suji (two lanes)          x 0    茜筋 Akane-suji, the avenue (31 m cornice)
//   x −62    藍甕筋 Aigame-suji, the dyers' street: five metres of stone setts, no cars. North of
//            Tsumugi-dōri the rinsing stream runs down its west side, the houses there reached by slabs.
//   x 62     型紙筋 Katagami-suji (one way south)     x 125  刈安筋 Kariyasu-suji (two lanes)
//
// The dyers' quarter is the block north-west of the crossing. On Aigame-suji's east side stands the
// station's headhouse (a merchant's house with the ticket hall inside: headhouse.ts), with のれん小路 Noren-kōji running
// along its north flank from the avenue, and 藍染横丁 Aizome-yokochō going north from that behind the
// houses. On the west side: the storehouses of the cotton wholesalers, the dye works つゆ草 with its
// drying yard behind (walk through the passage), and a lane to 甕守稲荷 Kamemori Inari.
// East of the avenue the blocks behind the fronts are row-house lanes (路地).
//
// Signals share one 60 s cycle (traffic/signals.ts): axis 0 every east–west street, axis 1 every
// north–south one. Models: tools/blender/build_aizome.py (the quarter), build_aizomefront.py (the fronts).

import { linesAt } from '../data/network';
import type { SignContent } from '../signs/content';
import { rng, type LanePart, type SignOpts } from '../world/builder';
import type { Anchor, AnchorPt, Anchors } from './anchors/types';
import { AIZOME } from './anchors/aizome';
import { AIZOMEFRONT } from './anchors/aizomefront';
import { KITACITY } from './anchors/kitacity';
import { GROUND_Y as GY, vending, type Ctx } from './kit';
import { KONBINI, konbini } from './konbini';
import { kerbGaps, kerbRail, mark, pedSignal, poleLine, roadKit, roadModel, roadSign, shortSignal, streetLamp, trafficLane, vehicleSignal } from './roads';
import type { SurfaceSpec } from './surface';
import { crosswalk, fillModelLots } from './surface';
import { modelTree, type TreeKind } from './trees';
import { leftovers } from './tsumugibashi-street';

type Rect = [number, number, number, number];
type Face = 'n' | 's' | 'e' | 'w';
type Named = { ja: string; en: string };

/** Half extents of Aizomechō's plot. */
export const AIZOME_PLOT = { x: 170, z: 150 };
const X = AIZOME_PLOT.x, Z = AIZOME_PLOT.z;
/** Tsumugi-dōri's half width and its building line (the exits are fitted to it). */
const RW = 9, FRONT = 19.5;
interface NS { c: number; half: number; pave: number; name: Named; way?: 1 | -1 }
const SHI: NS = { c: -125, half: 4.5, pave: 3, name: { ja: '伸子筋', en: 'Shinshi-suji' } };
const AKA: NS = { c: 0, half: 10, pave: 6, name: { ja: '茜筋', en: 'Akane-suji' } };
const KAT: NS = { c: 62, half: 3.25, pave: 1.5, name: { ja: '型紙筋', en: 'Katagami-suji' }, way: 1 };
const KAR: NS = { c: 125, half: 4.5, pave: 3, name: { ja: '刈安筋', en: 'Kariyasu-suji' } };
const WIDE = [SHI, AKA, KAR];
const ASA = { z: -95, half: 4.5, pave: 3, name: { ja: '浅葱通', en: 'Asagi-dōri' }, short: { ja: '浅葱', en: 'Asagi' } };
const HAN = { z: 95, half: 4.5, pave: 3, name: { ja: '縹通', en: 'Hanada-dōri' }, short: { ja: '縹', en: 'Hanada' } };
const BACK = ASA.z + ASA.half + ASA.pave; // −87.5: the front blocks' far edge (mirrored south)
/** Aigame-suji: its setts from AIG0 to AIG1; north of Tsumugi-dōri the stream beside them (ST0 … AIG0) and the west houses' line. */
const AIG = -62, AIG0 = -64.5, AIG1 = -59.5, ST0 = -66.1, WEST = -66.3;
const AIG_NAME: Named = { ja: '藍甕筋', en: 'Aigame-suji' };
/** The headhouse's lot (build_aizome.py EK_W × EK_D), Noren-kōji north of it, Aizome-yokochō behind the houses. */
const EK = { z0: -45.5, z1: -19.5, x1: AIG1 + 20 };
const NOREN: [number, number] = [-48.5, -45.5];
const YOKO: [number, number] = [-39.2, -36.3];
const SL = 5.2;
const WHITE = 'flat:#e9e9e4', YELLOW = 'flat:#e6a700', STONE = 'flat:#9a9488', SETT = 'tile:#77716a', LANE = 'tile:#857e73';
const FRAME: Record<Face, { rot?: 0 | 1 | 2 | 3 }> = { n: {}, s: { rot: 2 }, e: { rot: 1 }, w: { rot: 3 } };
const bl = (s: { c: number; half: number; pave: number }): [number, number] => [s.c - s.half - s.pave, s.c + s.half + s.pave];

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

// ── Names (invented; docs/worldbuilding.md) ──
type Style = 'brick' | 'tonya' | 'kanban' | 'ribbon' | 'seni' | 'kimono' | 'hotel' | 'tower';
const styleOf = (id: string) => id.split('_')[0] as Style;
const NAMES: Record<Style, [string, string][]> = {
  brick: [['藍染町綿業会館', 'Aizomechō Cotton Hall'], ['三つ波ビルヂング', 'Mitsunami Building'], ['茜筋染料ビル', 'Akanesuji Dyestuffs Bldg.']],
  tonya: [['晒問屋 しろたえ', 'Shirotae Bleached Cotton'], ['丸藍商店', 'Maruai Shōten'], ['木綿問屋 糸長', 'Itochō Cotton Wholesale'], ['浴衣地 山紺', 'Yamakon Yukata Cloth']],
  kanban: [['足袋 こはぜ屋', 'Kohazeya Tabi'], ['釦と糸 つるかめ', 'Tsurukame Buttons & Thread'], ['洋品 ミナト屋', 'Minatoya Outfitters']],
  ribbon: [['川湊染料', 'Kawaminato Dyestuffs'], ['浅葱産業', 'Asagi Sangyō']],
  seni: [['藍染町繊維センター', 'Aizomechō Textile Centre']],
  kimono: [['ゆかた すずかぜ', 'Suzukaze Yukata'], ['帯 たてわく', 'Tatewaku Obi']],
  hotel: [['ホテル 藍染町', 'Hotel Aizomechō']],
  tower: [['茜筋タワー', 'Akanesuji Tower'], ['アイゾメ スクエア', 'Aizome Square']],
};
const BOARD: Record<Style, [string, string]> = {
  brick: ['#2a2622', '#e8d9b0'], tonya: ['#f4f1e8', '#24407a'], kanban: ['#f4f1e8', '#3a2a1e'], ribbon: ['#2a2622', '#ffffff'], seni: ['#f4f1e8', '#1f3f7a'],
  kimono: ['#2a2019', '#e8d9b0'], hotel: ['#1f2023', '#ffffff'], tower: ['#1f2023', '#ffffff'],
};
/** The houses of the dyers' street. */
const DYERS: [string, string][] = [
  ['紺屋 かめのぞき', 'Kamenozoki Dyers'], ['型染 しろがた', 'Shirogata Stencil Dyeing'], ['糸染 あさぎ屋', 'Asagiya Yarn Dyers'], ['染料 すくも堂', 'Sukumodō Dyestuffs'],
  ['手拭 そめや小町', 'Someya Komachi Tenugui'], ['古布 ちぎれ雲', 'Chigiregumo Old Cloth'], ['藍茶房 みずもと', 'Mizumoto Tea Room'], ['のれん仕立 ぬの衛門', 'Nunoemon Noren Makers'],
  ['刷毛 はけ源', 'Hakegen Brushes'], ['絞り 花むら', 'Hanamura Shibori'], ['紺足袋 あいはら', 'Aihara Indigo Tabi'], ['染め直し 洗い張り 水野', 'Mizuno Re-dyeing'],
];
/** Tiny shops of the lanes: the converted row houses and the counters of Noren-kōji and Aizome-yokochō. */
const ROJI: [string, string][] = [
  ['喫茶 ろじ裏', 'Rojiura Coffee'], ['古道具 ひるね', 'Hirune Old Things'], ['おばんざい 藍', 'Obanzai Ai'], ['立呑み こん', 'Kon Standing Bar'], ['豆皿 つき', 'Tsuki Small Plates'],
  ['串かつ そめ八', 'Somehachi Kushikatsu'], ['活版 かな', 'Kana Letterpress'], ['だし巻 たまき', 'Tamaki Rolled Omelette'], ['珈琲 藍いろ', 'Aiiro Coffee'], ['手芸 ぬい', 'Nui Needlework'],
  ['酒場 かちいろ', 'Kachiiro Tavern'], ['焼菓子 はなだ', 'Hanada Bakes'], ['うどん いと', 'Ito Udon'], ['古本 つゆくさ文庫', 'Tsuyukusa Books'],
];

export function aizomeStreet(c: Ctx, spec: SurfaceSpec, cw: number, dir: [number, number]) {
  const { b } = c;
  const st = c.station;
  if (Math.abs(cw + 5.5 - FRONT) > 0.01) throw new Error(`aizomeStreet: Tsumugi-dōri's building line moved (${cw + 5.5}); the exits are fitted to ${FRONT}`);
  const seed = spec.seed;
  const r = rng(seed);
  const lines = linesAt(st.id).map((l) => l.id);
  const stName: Named = { ja: st.nameJa, en: st.nameRomaji };
  b.out.plot = { ...AIZOME_PLOT };
  const holes: Rect[] = b.out.holes.map((q) => [...q] as Rect);
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
  const BIZ = ['office', 'zakkyo', 'manshon'], SMALL = ['zakkyo', 'manshon', 'shophouse'], LOW = ['shophouse', 'machi'];
  const merged = (id: string, x: number, z: number, f: [number, number]) => {
    const d = b.dir(f);
    b.out.models.push({ kind: 'aizome', id, pos: b.pt(x, GY, z), yaw: Math.atan2(-d[0], -d[1]), seed: 0, merge: true });
  };
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

  // ═════════════════════════ Ground ═════════════════════════
  /** The stream's two open stretches (it is piped under Asagi-dōri and ends in a culvert at Tsumugi-dōri). */
  const streamSpans: [number, number][] = [[-Z, ASA.z - ASA.half - ASA.pave], [BACK, -FRONT]];
  const streamCut: Rect[] = streamSpans.map(([z0, z1]) => [ST0, z0, AIG0, z1]);
  const carriage: Rect[] = [
    [-X, -RW, X, RW],
    ...[...WIDE, KAT].map((s): Rect => [s.c - s.half, -Z, s.c + s.half, Z]),
    ...[ASA, HAN].map((s): Rect => [-X, s.z - s.half, X, s.z + s.half]),
  ];
  const wellHoles: Rect[] = holes.map(([x0, z0, x1, z1]) => [x0 - 0.05, z0 - 0.05, x1 + 0.05, z1 + 0.05]);
  b.slab('asphalt', -X, -Z, X, Z, -0.6, 0, [...wellHoles, ...streamCut]);
  b.slab('paver', -X, -Z, X, Z, 0, GY, [...wellHoles, ...streamCut, ...carriage]);
  b.zone('street', -X, -0.3, -Z, X, 80, Z, `${st.nameJa}駅前`, `${st.nameRomaji} — street level`);
  b.block(-X - 1, -1, -Z - 1, -X, 60, Z + 1);
  b.block(X, -1, -Z - 1, X + 1, 60, Z + 1);
  b.block(-X, -1, -Z - 1, X, 60, -Z);
  b.block(-X, -1, Z, X, 60, Z + 1);
  b.out.district = { radius: 520, old: [AIG, -40], oldRadius: 190, towers: 4 };

  // ═════════════════════════ Roads ═════════════════════════
  const crossingsNS: [number, number][] = [[-RW - 9, RW + 9], [ASA.z - ASA.half - 8, ASA.z + ASA.half + 8], [HAN.z - HAN.half - 8, HAN.z + HAN.half + 8]];
  const streetsX = WIDE.map((s): [number, number] => [s.c - s.half, s.c + s.half]);
  const zonesAv: [number, number][] = streetsX.map(([a, e]): [number, number] => [a - 9, e + 9]);
  const aigMouth: [number, number] = [AIG0 - 0.6, AIG1 + 0.6];
  // Tsumugi-dōri: a yellow centre line, lane lines, the wide streets' crosswalks and stop lines.
  for (let x = -X; x < X; x += 6) {
    if (!clearOf(x + 1.5, zonesAv)) continue;
    for (const z of [-RW / 2, RW / 2]) b.deco(WHITE, x, 0.004, z - 0.07, x + 3, 0.01, z + 0.07);
    if (clearOf(x + 3, [aigMouth], 2)) b.deco(YELLOW, x, 0.004, -0.08, x + 6, 0.01, 0.08);
  }
  for (const s of WIDE) {
    const [a, e] = [s.c - s.half, s.c + s.half];
    for (let z = -Z + 1; z < Z - 2; z += 6) {
      if (!clearOf(z + 1.5, crossingsNS)) continue;
      if (s.half > 5) for (const x of [s.c - s.half / 2, s.c + s.half / 2]) b.deco(WHITE, x - 0.07, 0.004, z, x + 0.07, 0.01, z + 3);
      b.deco(YELLOW, s.c - 0.08, 0.004, z, s.c + 0.08, 0.01, z + 6);
    }
    for (const x of [a - 4, e + 4]) crosswalk(b, x, 0, 2 * RW - 0.6, 4, true);
    for (const sz of [1, -1]) crosswalk(b, s.c, sz * (RW + 3.2), 2 * s.half - 0.4, 4, false);
    b.deco(WHITE, a - 7.2, 0.004, -RW, a - 6.8, 0.01, 0);
    b.deco(WHITE, e + 6.8, 0.004, 0, e + 7.2, 0.01, RW);
  }
  const lanes0 = b.out.lanes.length;
  const busX: [number, number] = [-95, 95], taxiX = 26;
  roadKit(b, {
    X, Z, rw: RW, swOut: FRONT, streets: streetsX, seed, name: stName, at: { id: st.id, dir }, shared: true, lamp: 'lamp_shop', busy: 0.65, taxi: 0.15,
    junctions: [{ ja: '藍染町西', en: 'Aizomechō-nishi' }, { ja: '藍染町', en: 'Aizomechō' }, { ja: '藍染町東', en: 'Aizomechō-higashi' }],
    roads: { main: { ja: '紬通', en: 'Tsumugi-dōri' }, cross: WIDE.map((s) => s.name) },
    flows: [0.45, 0.9, 0.45], busX, taxiX,
  });

  /** A signalled junction of a north–south street and an east–west one (as at Tsumugibashi). */
  const junction = (cx: number, hx: number, ways: (1 | -1)[], cz: number, hz: number, name: Named, ew: (1 | -1)[]) => {
    const wideNS = hx > 4.6, flat = true, style = cx === AKA.c ? 'shared' as const : 'new' as const;
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
    for (const sx of ew) {
      const lz = -sx;
      const xs = cx - sx * (hx + SL);
      b.deco(WHITE, Math.min(xs, xs - sx * 0.35), 0.004, Math.min(cz, cz + lz * (hz - 0.2)), Math.max(xs, xs - sx * 0.35), 0.01, Math.max(cz, cz + lz * (hz - 0.2)));
      vehicleSignal(b, cx + sx * (hx + 1.9), cz + lz * (hz + 1.5), [sx, 0], hz + 1.5 - hz / 2, 0, name, { style, back: ew.length > 1 });
    }
    for (const sz of ways) {
      const lx = sz;
      const zs = cz - sz * (hz + SL);
      b.deco(WHITE, Math.min(cx, cx + lx * (hx - 0.2)), 0.004, Math.min(zs, zs - sz * 0.35), Math.max(cx, cx + lx * (hx - 0.2)), 0.01, Math.max(zs, zs - sz * 0.35));
      if (wideNS) vehicleSignal(b, cx + lx * (hx + 1.6), cz + sz * (hz + 2.0), [0, sz], hx + 1.6 - hx / 2, 1, name, { style, back: ways.length > 1 });
      else shortSignal(b, cx + lx * (hx + 1.5), cz + sz * (hz + 1.9), [0, sz], 1, name);
    }
    roadModel(b, 'sigbox', cx - hx - 2.6, GY, cz - hz - 3.2, [0, 1]);
    b.block(cx - hx - 2.96, GY, cz - hz - 3.46, cx - hx - 2.24, GY + 1.56, cz - hz - 2.94);
  };
  const crossAll = [SHI, AKA, KAT, KAR].map((s) => ({ c: s.c, half: s.half }));
  const stopsX = (sx: 1 | -1, x0: number): LanePart['stops'] =>
    crossAll.map(({ c: cx, half }) => {
      const t = (cx - x0) * sx;
      return { at: t - half - SL - 0.5, axis: 0 as const, exit: t + half + SL };
    }).filter((q) => q.at > 2).sort((p, q) => p.at - q.at);
  /** The dyers' street crosses on a zebra without a signal: traffic gives way to whoever is on it. */
  const zebraYield = (sx: 1 | -1, x0: number, z: number, hz: number): LanePart['yields'] => [{ at: (AIG - x0) * sx - 5, zone: [AIG0, z - hz, AIG1, z + hz] }];
  for (const s of [ASA, HAN]) {
    for (const q of [SHI, AKA, KAT, KAR]) {
      junction(q.c, q.half, q.way ? [q.way] : [1, -1], s.z, s.half, { ja: `${s.short.ja}${q.name.ja.replace('筋', '')}`, en: `${s.short.en} ${q.name.en.replace('-suji', '')}` }, [1, -1]);
    }
    trafficLane(b, -X, s.z - 2.25, X, s.z - 2.25, { speed: 30 / 3.6, flow: 2.2, use: 'all', taxi: 0.1, halts: [], stops: stopsX(1, -X), yields: zebraYield(1, -X, s.z, s.half) });
    trafficLane(b, X, s.z + 2.25, -X, s.z + 2.25, { speed: 30 / 3.6, flow: 2.2, use: 'all', taxi: 0.1, halts: [], stops: stopsX(-1, X), yields: zebraYield(-1, X, s.z, s.half) });
    const boxes = crossAll.map(({ c: cx, half }): [number, number] => [cx - half - 8, cx + half + 8]);
    const clear = [...boxes, [AIG0 - 2, AIG1 + 2] as [number, number]];
    for (let x = -X + 1; x < X - 3; x += 6) if (clearOf(x + 1.5, clear)) b.deco(WHITE, x, 0.004, s.z - 0.07, x + 3, 0.01, s.z + 0.07);
    for (const e of [-1, 1]) {
      let from = -X;
      for (const [p, q] of [...boxes, [X + 3, X + 3] as [number, number]].sort((m, n) => m[0] - n[0])) {
        if (p - from > 1) b.deco(WHITE, from, 0.004, s.z + e * (s.half - 0.6) - 0.05, p + 3, 0.01, s.z + e * (s.half - 0.6) + 0.05);
        from = q - 3;
      }
    }
    crosswalk(b, AIG, s.z, 2 * s.half - 0.4, 3.4, true);
    for (const sx of [1, -1] as const) for (let x = -X + (sx > 0 ? 9 : 21); x < X - 6; x += 24) {
      if (clearOf(x, clear, 1.5)) streetLamp(b, 'lamp_shop', x, s.z - sx * (s.half + 0.6), [0, sx]);
    }
    for (const x of [-X + 14, X - 14]) roadSign(b, 'speed30', x, s.z + Math.sign(x) * (s.half + 0.5), [Math.sign(x), 0], 0.6);
  }
  // The kit laid the wide streets' lanes with a stop at Tsumugi-dōri only: add the back streets' signals.
  // Its own lanes along Tsumugi-dōri give way at the dyers' zebra.
  crosswalk(b, AIG, 0, 2 * RW - 0.6, 4, true);
  for (const l of b.out.lanes.slice(lanes0, b.out.lanes.length - 4)) {
    const dx = l.to[0] - l.from[0], dz = l.to[2] - l.from[2];
    if (Math.abs(dz) < 0.1 && Math.abs(dx) > 1 && Math.abs(l.from[2]) < RW) {
      const t = (AIG - l.from[0]) * Math.sign(dx) - 5.5;
      if (t > 2 && t < Math.abs(dx) - 2) l.yields = [...(l.yields ?? []), { at: t, zone: [AIG0, -RW, AIG1, RW] }];
      continue;
    }
    if (Math.abs(dx) > 0.1 || Math.abs(dz) < 1) continue;
    if (!WIDE.some((q) => Math.abs(l.from[0] - q.c) < q.half + 0.1)) continue;
    const uz = Math.sign(dz), more: LanePart['stops'] = [];
    for (const s of [ASA, HAN]) {
      const t = (s.z - l.from[2]) * uz;
      if (t - s.half - SL < 6 || t + s.half + SL > Math.abs(dz) - 4) continue;
      more.push({ at: t - s.half - SL - 0.5, axis: 1, exit: t + s.half + SL });
    }
    l.stops = [...l.stops, ...more].sort((p, q) => p.at - q.at);
  }

  // ── Katagami-suji, one way south: a lane each side of Tsumugi-dōri, joined to it by left turns ──
  {
    const l = KAT, x = l.c, LH = l.half, MED = 1.0, zs = Z + 1.5, s = l.way!;
    const minor = { speed: 6, use: 'minor' as const, taxi: 0, halts: [] };
    const sideStop = (from: number, q: { z: number; half: number }, sz: 1 | -1) => {
      const t = (q.z - from) * sz;
      return { at: t - q.half - SL - 0.5, axis: 1 as const, exit: t + q.half + SL };
    };
    trafficLane(b, x, -zs, x, -MED, { ...minor, flow: 1.6, stops: [sideStop(-zs, ASA, 1), { at: zs - RW - 1.6, axis: 1, exit: zs - MED }], dead: true });
    trafficLane(b, x, MED, x, zs, { ...minor, flow: 0, stops: [sideStop(MED, HAN, 1)] });
    const spans: [number, number][] = [[-Z, ASA.z - ASA.half - 6], [ASA.z + ASA.half + 6, -RW - 1.2], [RW + 1.2, HAN.z - HAN.half - 6], [HAN.z + HAN.half + 6, Z]];
    for (const [z0, z1] of spans) for (const e of [-1, 1]) b.deco(WHITE, x + e * (LH - 0.6) - 0.05, 0.004, z0, x + e * (LH - 0.6) + 0.05, 0.01, z1);
    const kerb = x + s * (LH + 0.5), far = x - s * (LH + 0.5), zm = -RW - 1.2;
    b.deco(WHITE, x - LH + 0.5, 0.004, zm, x + LH - 0.5, 0.01, zm + 0.3);
    mark(b, 'stop', x, zm - s * 3.4, [0, s], 2.2, 3.2);
    roadSign(b, 'stop', kerb, zm - s * 1.0, [0, -s]);
    for (const z of [-Z + 6, FRONT + 3]) {
      roadModel(b, 'signpole', far, GY, z, [0, -s]);
      b.block(far - 0.06, GY, z - 0.06, far + 0.06, GY + 2, z + 0.06);
      b.sign({ k: 'roadsign', v: s * (far - x) > 0 ? 'oneway-l' : 'oneway-r' }, far, GY + 2.72, z - s * 0.05, [0, -s], 0.9, 0.3);
      b.sign({ k: 'roadsign', v: 'back-rect' }, far, GY + 2.72, z + s * 0.05, [0, s], 0.9, 0.3);
      roadSign(b, 'speed30', kerb, z + s * 6, [0, -s], 0.6);
    }
    for (const z of [-FRONT - 4, Z - 6]) roadSign(b, 'noentry', far, z, [0, s], 0.66);
    const busyZ = (z: number) => Math.abs(z) < FRONT + 2 || Math.abs(z - ASA.z) < 12 || Math.abs(z - HAN.z) < 12;
    for (let z = -Z + 12; z < Z - 6; z += 26) if (!busyZ(z)) streetLamp(b, 'lamp_small', far, z, [x > far ? 1 : -1, 0]);
    poleLine(b, { axis: 'z', from: -Z + 6, to: Z - 6, at: far + (x > far ? -0.2 : 0.2), road: x > far ? 1 : -1, step: 26, skip: (u) => Math.abs(u) < FRONT + 4 || Math.abs(u - ASA.z) < 10 || Math.abs(u - HAN.z) < 10, drops: 0.7, name: stName });
  }

  // ── Nothing of the kit's stands in a narrow street's mouth; kerb rails along Tsumugi-dōri ──
  {
    const mouths: Rect[] = [[KAT.c - KAT.half - 1.2, KAT.c + KAT.half + 1.2], aigMouth].flatMap(([a, e]): Rect[] => [[a, RW - 0.2, e, FRONT + 0.2], [a, -FRONT - 0.2, e, -RW + 0.2]]);
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
      const open = [...zonesAv.map(([a, e]) => [a + 2, e - 2]), [KAT.c - KAT.half - 0.6, KAT.c + KAT.half + 0.6], [aigMouth[0], aigMouth[1]], ...gaps.filter((k) => k.s === s).map((k) => [k.x0, k.x1])].sort((p, q) => p[0] - q[0]);
      let x = -X;
      for (const [from, to] of open.concat([[X, X]])) {
        for (let xa = x; xa + 2.5 <= from; xa += 2.5) {
          b.block(xa, GY, zr - 0.04, xa + 2.5, GY + 0.9, zr + 0.04);
          kerbRail(b, xa + 1.25, zr);
        }
        x = Math.max(x, to);
      }
    }
    // Trees: zelkova along Tsumugi-dōri's kerbs, ginkgo down the avenue, dogwood on the two-lane streets.
    let tn = 0;
    const tree = (x: number, z: number, kind: TreeKind) => modelTree(b, kind, x, z, tn++ % 3 ? 'a' : 'b', GY, true);
    for (const s of [-1, 1] as const) {
      for (let x = -X + 8; x < X - 4; x += 12) {
        const z = s * (RW + 1.9);
        if (!clearOf(x, zonesAv, 1) || !clearOf(x, [aigMouth, [KAT.c - KAT.half, KAT.c + KAT.half]], 3) || nearHole(x, z, 3.5) || gaps.some((k) => k.s === s && x > k.x0 - 2 && x < k.x1 + 2)) continue;
        tree(x, z, 'zelkova');
      }
      // On the wide pavements: bicycle racks, benches and planters between the kerb trees and the fronts.
      for (let x = -X + 14; x < X - 6; x += 24) {
        const z = s * (RW + 4.4);
        if (!clearOf(x, zonesAv, 4) || !clearOf(x, [aigMouth, [KAT.c - KAT.half, KAT.c + KAT.half]], 6) || nearHole(x, z, 5) || nearHole(x + 4, z, 5)) continue;
        const id = Math.round(x / 24) % 3 === 0 ? 'bikerack' : 'bench_s';
        roadModel(b, id, x, GY, z, [0, s]);
        const hw = id === 'bikerack' ? 2.05 : 0.95;
        b.block(x - hw, GY, z - 0.4, x + hw, GY + (id === 'bikerack' ? 1.1 : 0.6), z + 0.4);
        roadModel(b, 'planter', x + 3.6, GY, z, [0, s]);
        b.block(x + 3.6 - 0.9, GY, z - 0.45, x + 3.6 + 0.9, GY + 0.9, z + 0.45);
      }
    }
    for (const s of WIDE) {
      const kind: TreeKind = s === AKA ? 'ginkgo' : 'dogwood';
      for (const sx of [-1, 1]) {
        const x = s.c + sx * (s.half + 1.5);
        for (let z = -Z + 10; z < Z - 5; z += 15) {
          if (Math.abs(z) < FRONT + 4 || !clearOf(z, crossingsNS, 2) || (s === AKA && sx < 0 && clearOf(z, [NOREN], 3) === false)) continue;
          tree(x, z, kind);
          if (Math.round(z / 15) % 2 === (sx > 0 ? 0 : 1) && Math.abs(z + 7) > FRONT + 4 && clearOf(z + 7, crossingsNS, 2)) streetLamp(b, s === AKA ? 'lamp_twin' : 'lamp_led', s.c + sx * (s.half + 0.9), z + 7, [-sx, 0]);
        }
      }
    }
  }

  // ═════════════════════════ The fronts on Tsumugi-dōri and Akane-suji ═════════════════════════
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
      // Nothing fits to within the slack: as many as go in.
      let rem = L;
      for (const id of order) if (W(id) <= rem) (best.push(id), (rem -= W(id)));
    }
    for (const id of best) used.set(id, (used.get(id) ?? 0) + 1);
    return best.map((id) => [id, r()] as const).sort((p, q) => p[1] - q[1]).map(([id]) => id);
  };
  const letterFront = (id: string, p: Record<string, AnchorPt>) => {
    const sty = styleOf(id), [ja, en] = nextName(sty, NAMES[sty]), [bg, fg] = BOARD[sty];
    if (p.name) label(p.name, ja, en, bg, fg);
    if (p.roof) label(p.roof, ja.split(' ').pop()!, en, '#1f3f7a', '#ffffff');
    if (p.vertical) upright(p.vertical, ja.split(' ').pop()!, '#f4f1e8', '#24407a');
  };
  /**
   * A row of pieces along a frontage: on `face`, the building line at `line`, from u0 to u1 along it.
   * `tight`: house against house, what is left over at the far end; else spread with equal gaps.
   */
  const row = (kind: string, A: Anchors, face: Face, line: number, u0: number, u1: number, ids: string[], letter: (id: string, a: Anchor) => void, tight = false): Rect[] => {
    const list = pack(A, u1 - u0, ids, tight ? 7 : 3.2, tight ? 0 : 0.3);
    const total = list.reduce((t, id) => t + A[id].w, 0);
    const gap = tight ? 0.06 : list.length ? (u1 - u0 - total) / (list.length + 1) : 0;
    let u = u0 + (tight ? 0 : gap);
    const placed: Rect[] = [];
    const alongX = face === 'n' || face === 's';
    for (const id of list) {
      const a = A[id], uc = u + a.w / 2;
      const [x, z] = alongX ? [uc, line] : [line, uc];
      piece(kind, A, id, face, x, z, (q) => letter(id, q));
      placed.push(alongX ? [u, face === 'n' ? line : line - a.d, u + a.w, face === 'n' ? line + a.d : line] : [face === 'w' ? line : line - a.d, u, face === 'w' ? line + a.d : line, u + a.w]);
      u += a.w + gap;
    }
    return placed;
  };
  const FRONT_IDS = Object.keys(AIZOMEFRONT), NO_TOWER = FRONT_IDS.filter((k) => !k.startsWith('tower_') && !k.startsWith('hotel_'));
  const fronts = (face: Face, line: number, u0: number, u1: number, ids = FRONT_IDS) => row('aizomefront', AIZOMEFRONT, face, line, u0, u1, ids, (id, a) => letterFront(id, a.pts));
  const corr: [number, number][] = [bl(SHI), [WEST, AIG1], bl(AKA), bl(KAT), bl(KAR)];
  const corrS: [number, number][] = [bl(SHI), [AIG0, AIG1], bl(AKA), bl(KAT), bl(KAR)];
  for (const north of [true, false]) {
    for (const [a, e] of between(north ? corr : corrS)) {
      let x0 = a + 0.3;
      const x1 = e - 0.3;
      // North of the street, east of the dyers' street: the headhouse has the first twenty metres, and a lane behind it.
      if (north && Math.abs(a - AIG1) < 0.1) x0 = YOKO[1] + 0.3;
      fronts(north ? 's' : 'n', north ? -FRONT : FRONT, x0, x1, e - a < 30 ? NO_TOWER : FRONT_IDS);
    }
  }
  // Along the avenue, both sides: behind the corner buildings to the back streets, and the back blocks.
  for (const sz of [-1, 1] as const) {
    for (const sx of [-1, 1] as const) {
      const line = sx * (AKA.half + AKA.pave), face: Face = sx < 0 ? 'e' : 'w';
      const first: [number, number] = sz < 0 ? [BACK + 0.3, -FRONT - 20.6] : [FRONT + 20.6, -BACK - 0.3];
      // (North-west: Noren-kōji opens off the avenue, and its little shops stand between it and the corner building.)
      if (sz < 0 && sx < 0) first[1] = NOREN[0] - 0.3;
      fronts(face, line, first[0], first[1], NO_TOWER);
      const far: [number, number] = sz < 0 ? [-Z + 0.6, ASA.z - ASA.half - ASA.pave - 0.3] : [HAN.z + HAN.half + HAN.pave + 0.3, Z - 0.6];
      fronts(face, line, far[0], far[1]);
    }
  }

  // ═════════════════════════ 藍甕筋 Aigame-suji, the dyers' street ═════════════════════════
  const MACHIYA = ['machiya_a', 'machiya_b', 'machiya_c', 'machiya_d', 'machiya_e', 'machiya_f'];
  const NAGAYA = ['nagaya_a', 'nagaya_b', 'nagaya_c', 'nagaya_d', 'nagaya_e'];
  const MISE = ['mise_a', 'mise_b', 'mise_c'];
  /** World z-ranges where a slab crosses the stream (so the rail leaves a gap there). */
  const slabs: [number, number][] = [];
  /** A stone slab over the stream, in a west-side piece's own frame (front at z = 0; the stream lies before it). */
  const slab = (x0: number, x1: number) => {
    b.box(STONE, x0, GY - 0.2, -(AIG0 - WEST) - 0.12, x1, GY, 0);
    const p = b.pt(x0, 0, 0), q = b.pt(x1, 0, 0);
    slabs.push([Math.min(p[2], q[2]), Math.max(p[2], q[2])]);
  };
  const letterHouse = (id: string, a: Anchor, west: boolean) => {
    if (id.startsWith('machiya')) {
      const [ja, en] = nextName('dyers', DYERS);
      if (a.pts.name) label(a.pts.name, ja, en, '#2a2019', '#f1ead8');
      if (west && a.pts.name) slab(a.pts.name[0] - 1.1, a.pts.name[0] + 1.1);
    } else {
      for (const k of Object.keys(a.pts)) {
        if (!k.startsWith('name')) continue;
        const [ja, en] = nextName('roji', ROJI), cream = a.pts[k][1] < 3 && k !== 'name0';
        label(a.pts[k], ja, en, cream ? '#f1ead8' : '#2a2019', cream ? '#2a2019' : '#f1ead8');
      }
      if (west) slab(-a.w / 2 + 0.6, a.w / 2 - 0.6);
    }
  };
  const A = AIZOME;
  // The setts, the street as a place.
  const aigSpans: [number, number][] = [[-Z, ASA.z - ASA.half - ASA.pave], [BACK, -FRONT], [FRONT, -BACK], [HAN.z + HAN.half + HAN.pave, Z]];
  for (const [z0, z1] of aigSpans) {
    b.deco(SETT, AIG0, GY + 0.002, z0, AIG1, GY + 0.012, z1);
    b.deco('flat:#6f6a60', AIG - 0.1, GY + 0.012, z0, AIG + 0.1, GY + 0.016, z1);
  }
  for (const [z0, z1, tag] of [[-Z + 0.5, ASA.z - ASA.half - ASA.pave, '北'], [BACK, -FRONT, ''], [FRONT, -BACK, '南'], [HAN.z + HAN.half + HAN.pave, Z - 0.5, '南']] as [number, number, string][]) {
    b.zone('street', AIG0 + 0.3, GY - 0.2, z0 + 0.3, AIG1 - 0.3, GY + 7, z1 - 0.3, `${AIG_NAME.ja}${tag ? `（${tag}）` : ''}`, `${AIG_NAME.en}${tag === '北' ? ' (north)' : tag === '南' ? ' (south)' : ' — the dyers’ street'}`, true);
    reserved.push([z0 < 0 ? ST0 : AIG0, z0, AIG1, z1]);
  }
  // Bollards where it meets the streets with traffic; its name on a stone post.
  for (const z of [-FRONT + 0.6, FRONT - 0.6, BACK - 0.6, ASA.z - ASA.half - ASA.pave + 0.6, -BACK + 0.6, HAN.z + HAN.half + HAN.pave - 0.6]) {
    for (const x of [AIG0 + 0.5, AIG, AIG1 - 0.5]) {
      roadModel(b, 'bollard', x, GY, z, [0, 1]);
      b.block(x - 0.15, GY, z - 0.15, x + 0.15, GY + 0.9, z + 0.15);
    }
  }
  for (const [z, f] of [[-FRONT - 1.2, 1], [FRONT + 1.2, -1]] as [number, 1 | -1][]) {
    b.box(STONE, AIG1 - 0.42, GY, z - 0.16, AIG1 - 0.1, GY + 1.5, z + 0.16);
    b.sign({ k: 'shop', ja: AIG_NAME.ja, bg: '#9a9488', fg: '#1f2023', vertical: true }, AIG1 - 0.26, GY + 0.85, z + f * 0.17, [0, f], 0.28, 1.1);
  }

  // ── The headhouse (the station's building: its walls, hall and gates are headhouse.ts) ──
  reserved.push([AIG1, EK.z0, EK.x1, EK.z1]);
  piece('aizome', A, 'ekisha', 'w', AIG1, (EK.z0 + EK.z1) / 2, (a) => {
    const p = a.pts, navy = '#16224a';
    label(p.name, `${st.nameJa}駅`, `${st.nameRomaji} Station`, '#2a2019', '#f1ead8');
    signAt(p.crest, { k: 'label', text: '藍', fg: '#24407a', bg: '#f1ead8' });
    for (const k of ['side_l', 'side_r']) signAt(p[k], { k: 'guide', ja: `${st.nameJa}駅`, en: `${st.nameRomaji} Sta.`, bg: 'navy', badges: lines });
    for (const k of ['post_l', 'post_r']) upright(p[k], `${st.nameJa}駅`, '#f1ead8', navy);
  }, false);
  // ── のれん小路 Noren-kōji, from the avenue to the dyers' street along the headhouse's north flank ──
  {
    const name: Named = { ja: 'のれん小路', en: 'Noren-kōji — Noren Lane' };
    const ax = -(AKA.half + AKA.pave);
    lanePave(AIG1, NOREN[0], ax, NOREN[1], name);
    for (const [face, x] of [['e', ax - 0.4], ['w', AIG1 + 0.4]] as [Face, number][]) {
      piece('aizome', A, 'gate', face, x, (NOREN[0] + NOREN[1]) / 2, (a) => {
        for (const s of [-1, 1]) b.block(s * (a.w / 2 - 0.2) - 0.16, GY, -0.16, s * (a.w / 2 - 0.2) + 0.16, GY + 4, 0.16);
        label(a.pts.name, name.ja, 'Noren-kōji', '#f1ead8', '#24407a');
        label(a.pts.back, name.ja, 'Noren-kōji', '#f1ead8', '#24407a');
      }, false);
    }
    // South side: counters between the lane and the corner building's back (the north side is the houses' and the fronts' flanks).
    row('aizome', A, 'n', NOREN[1], YOKO[1] + 0.2, ax - 0.4, MISE, (id, a) => letterHouse(id, a, false), true);
    for (let x = AIG1 + 6; x < ax - 4; x += 9) merged('cloths_c', x, (NOREN[0] + NOREN[1]) / 2, [1, 0]);
    piece('aizome', A, 'jizo', 'n', EK.x1 + 1.6, NOREN[1] - 0.95, () => b.block(-0.6, GY, 0, 0.6, GY + 1.8, 0.85), false);
  }
  // ── 藍染横丁 Aizome-yokochō, north from Noren-kōji behind the houses to Asagi-dōri ──
  {
    const name: Named = { ja: '藍染横丁', en: 'Aizome-yokochō' };
    lanePave(YOKO[0], BACK, YOKO[1], NOREN[0], name);
    row('aizome', A, 'e', YOKO[0], BACK + 0.4, NOREN[0] - 0.3, MISE, (id, a) => letterHouse(id, a, false), true);
    for (let z = BACK + 8; z < NOREN[0] - 4; z += 14) streetLamp(b, 'lamp_small', YOKO[1] - 0.25, z, [-1, 0]);
    for (let z = BACK + 5; z < NOREN[0] - 3; z += 11) bike(YOKO[1] - 0.45, z, [0, 1]);
    // (The strip between the counters' backs and the houses' backs is a service gap, boarded at both ends.)
    for (const z of [BACK + 0.2, NOREN[0] - 0.4]) b.box('flat:#2a2622', AIG1 + 12.1, GY, z, YOKO[0] - 5.55, GY + 2.1, z + 0.12);
    reserved.push([AIG1 + 12, BACK, YOKO[0] - 5.5, NOREN[0]]);
  }
  // ── East side, north of Noren-kōji: merchants' houses to Asagi-dōri ──
  row('aizome', A, 'w', AIG1, BACK + 0.3, NOREN[0] - 0.2, MACHIYA, (id, a) => letterHouse(id, a, false), true);

  // ── West side, across the stream: the storehouses, the dye works and its yard, the shrine's lane ──
  const works = { z0: -65.8, z1: -53.8 }, kura = { z0: -53.5, z1: -40.9 }, shrineLane: [number, number] = [-76.6, -73.8];
  piece('aizome', A, 'kura', 'e', WEST, (kura.z0 + kura.z1) / 2, (a) => {
    const n: Named[] = [{ ja: '壱番蔵', en: 'No. 1' }, { ja: '弐番蔵', en: 'No. 2' }, { ja: '藍と木綿の資料館', en: 'Indigo & Cotton Museum' }];
    n.forEach((q, k) => upright(a.pts[`plate${k}`], q.ja, '#f1ead8', '#1f2023'));
    b.sign({ k: 'label', text: '木綿問屋の蔵', sub: 'Cotton wholesalers’ storehouses · 1880s', fg: '#f1ead8', bg: '#2a2019' }, 0, GY + 1.3, -0.06, [0, -1], 1.6, 0.42);
    slab(-a.w / 2, a.w / 2);
  });
  piece('aizome', A, 'works', 'e', WEST, (works.z0 + works.z1) / 2, (a) => {
    const [pc, , , pw] = a.pts._pass, pa = pc - pw / 2, pe = pc + pw / 2;
    b.block(-a.w / 2, GY, 0, pa, GY + a.h, a.d);
    b.block(pe, GY, 0, a.w / 2, GY + a.h, a.d);
    b.block(pa, GY + 2.6, 0, pe, GY + a.h, a.d);
    label(a.pts.name, '藍染処 つゆ草', 'Aizome Tsuyukusa — dye works', '#24407a', '#f1ead8');
    upright(a.pts.yard, '干し場 奥へ', '#f1ead8', '#24407a');
    slab(-3.1, pe + 0.3);
    b.zone('street', pa + 0.2, GY - 0.2, 0.2, pe - 0.2, GY + 2.6, a.d - 0.2, 'つゆ草 通り庭', 'Tsuyukusa — the passage to the yard', true);
  }, false);
  piece('aizome', A, 'yard', 'e', WEST - A.works.d, (works.z0 + works.z1) / 2, (a) => {
    const w2 = a.w / 2, P = a.pts;
    for (const s of [-1, 1]) b.block(Math.min(s * w2, s * (w2 - 0.14)), GY, 0, Math.max(s * w2, s * (w2 - 0.14)), GY + 2.3, a.d);
    b.block(-w2, GY, a.d - 0.14, w2, GY + 2.3, a.d);
    const box = (q: AnchorPt, h: number) => b.block(q[0] - q[3] / 2, GY, q[2] - q[4] / 2, q[0] + q[3] / 2, GY + h, q[2] + q[4] / 2);
    box(P._shed, 0.9);
    box(P._well, 2.2);
    box(P._trough, 0.6);
    for (const z of [11.5, 14.2, 16.9, 19.6]) for (const x of [-3.2, 3.2]) b.block(x - 0.2, GY, z - 0.2, x + 0.2, GY + 7, z + 0.2);
    b.block(-4.7, GY, 11.9, -3.7, GY + 0.9, 13.7);
    b.sign({ k: 'label', text: '藍甕 さわらないで', sub: 'Indigo vats — please do not touch', fg: '#f1ead8', bg: '#24407a' }, P._shed[0] + P._shed[3] / 2 + 0.05, GY + 1.5, P._shed[2], [1, 0], 1.5, 0.4);
    b.zone('street', -w2 + 0.3, GY - 0.2, 0.3, w2 - 0.3, GY + 8, a.d - 0.3, 'つゆ草 干し場', 'Tsuyukusa — the drying yard', true);
    const p0 = b.pt(-w2, 0, 0), p1 = b.pt(w2, 0, a.d);
    reserved.push([Math.min(p0[0], p1[0]), Math.min(p0[2], p1[2]), Math.max(p0[0], p1[0]), Math.max(p0[2], p1[2])]);
  }, false);
  // Houses north of the works, either side of the shrine's lane, to Asagi-dōri.
  row('aizome', A, 'e', WEST, shrineLane[1] + 0.1, works.z0 - 0.2, MACHIYA, (id, a) => letterHouse(id, a, true), true);
  row('aizome', A, 'e', WEST, BACK + 0.3, shrineLane[0] - 0.1, MACHIYA, (id, a) => letterHouse(id, a, true), true);
  {
    // The lane and the shrine at its end, behind the houses.
    const S = A.shrine, sx = WEST - 14, name: Named = { ja: '甕守稲荷神社', en: 'Kamemori Inari Shrine' };
    lanePave(sx, shrineLane[0], WEST, shrineLane[1]);
    slabs.push(shrineLane);
    b.box(STONE, ST0 - 0.2, GY - 0.2, shrineLane[0], AIG0 + 0.12, GY, shrineLane[1]);
    piece('aizome', A, 'shrine', 'e', sx, (shrineLane[0] + shrineLane[1]) / 2, (a) => {
      const w2 = a.w / 2, d = a.d, P = a.pts;
      for (const [x0, x1] of [[-w2, -1.9], [1.9, w2]]) b.block(x0, GY, -0.1, x1, GY + 1.2, 0.2);
      for (const s of [-1, 1]) b.block(Math.min(s * w2, s * (w2 - 0.14)), GY, 0.2, Math.max(s * w2, s * (w2 - 0.14)), GY + 2, d);
      b.block(-w2, GY, d - 0.14, w2, GY + 2, d);
      for (const s of [-1, 1]) {
        b.block(s * 1.5 - 0.18, GY, 0.82, s * 1.5 + 0.18, GY + 3.6, 1.18);
        b.block(s * 1.7 - 0.34, GY, 3.26, s * 1.7 + 0.34, GY + 2, 3.94);
        b.block(s * 1.5 - 0.3, GY, 6.75, s * 1.5 + 0.3, GY + 1.5, 7.65);
      }
      b.block(-w2 + 1.05, GY, 3.9, -w2 + 2.95, GY + 2.4, 5.3);
      b.block(P._rack[0] - 0.3, GY, P._rack[2] - 2.2, P._rack[0] + 0.3, GY + 2.3, P._rack[2] + 2.2);
      b.block(-1.9, GY, P._hall[2] - 2.8, 1.9, GY + 4.4, P._hall[2] + 1.8);
      label(P.name, '甕守稲荷', undefined, '#2a2019', '#e8c66a');
      upright(P.post, name.ja, '#b9b3a4', '#1f2023');
      b.sign({ k: 'label', text: '染め上がり祈願 藍布奉納', sub: 'Votive indigo cloths, for a good dye', fg: '#1f2023', bg: '#f1ead8' }, P._rack[0] - 0.32, GY + 2.25, P._rack[2], [-1, 0], 2.4, 0.3);
      modelTree(b, 'camphor', -w2 + 2.6, d - 2.6, 'a', GY, false);
      modelTree(b, 'momiji', w2 - 2.4, 2.2, 'b', GY, false);
      b.zone('street', -w2 + 0.3, GY - 0.2, 0.4, w2 - 0.3, GY + 6, P._hall[2] - 3, name.ja, name.en, true);
      const p0 = b.pt(-w2, 0, 0), p1 = b.pt(w2, 0, d);
      reserved.push([Math.min(p0[0], p1[0]), Math.min(p0[2], p1[2]), Math.max(p0[0], p1[0]), Math.max(p0[2], p1[2])]);
    }, false);
    void S;
  }
  // North of Asagi-dōri and south of Tsumugi-dōri the street carries on between houses and row houses.
  const northFar: [number, number] = [-Z + 0.6, ASA.z - ASA.half - ASA.pave - 0.3];
  row('aizome', A, 'e', WEST, northFar[0], northFar[1], MACHIYA, (id, a) => letterHouse(id, a, true), true);
  row('aizome', A, 'w', AIG1, northFar[0], northFar[1], [...MACHIYA, ...NAGAYA], (id, a) => letterHouse(id, a, false), true);
  for (const [z0, z1] of [[FRONT + 20.6, -BACK - 0.3], [HAN.z + HAN.half + HAN.pave + 0.3, Z - 0.6]]) {
    row('aizome', A, 'e', AIG0, z0, z1, [...MACHIYA, ...NAGAYA], (id, a) => letterHouse(id, a, false), true);
    row('aizome', A, 'w', AIG1, z0, z1, [...NAGAYA, 'machiya_c', 'machiya_f'], (id, a) => letterHouse(id, a, false), true);
  }

  // ── The stream: its walls and bed, the water, the rail between the slabs ──
  for (const [z0, z1] of streamSpans) {
    const n = Math.max(1, Math.round((z1 - z0) / 6));
    for (let k = 0; k < n; k++) merged(k % 2 ? 'stream_b' : 'stream', AIG0, z0 + (k + 0.5) * ((z1 - z0) / n), [1, 0]);
    b.open(() => b.box('water', ST0 + 0.1, GY - 0.72, z0, AIG0 - 0.1, GY - 0.55, z1, false));
    // End walls where it goes into its pipe.
    for (const z of [z0, z1 - 0.2]) b.box(STONE, ST0, GY - 1, z, AIG0, GY, z + 0.2);
    let z = z0 + 0.2;
    for (const [s0, s1] of [...slabs.filter(([p, q]) => q > z0 && p < z1).sort((p, q) => p[0] - q[0]), [z1, z1] as [number, number]]) {
      const e = Math.min(s0, z1 - 0.2);
      if (e - z > 0.4) {
        // Nobody steps into the channel: the rail is a wall as high as it looks, the water is closed above.
        b.block(AIG0 - 0.16, GY, z, AIG0, GY + 0.75, e);
        b.block(ST0, GY - 1, z, AIG0 - 0.16, GY + 0.75, e);
        const m = Math.max(1, Math.round((e - z) / 2));
        for (let k = 0; k < m && (e - z) / m > 1.4; k++) merged('rail', AIG0 - 0.08, z + (k + 0.5) * ((e - z) / m), [1, 0]);
      }
      z = Math.max(z, s1);
    }
  }
  // Cloth drying across the street north of Tsumugi-dōri; lamps and a few bicycles all along.
  for (let z = BACK + 7, k = 0; z < -FRONT - 6; z += 8.5, k++) merged(k % 2 ? 'cloths_b' : 'cloths_a', (WEST + AIG1) / 2, z, [0, 1]);
  for (const [z0, z1] of aigSpans) {
    for (let z = z0 + 9, k = 0; z < z1 - 4; z += 17, k++) {
      if (Math.abs(z - ASA.z) < 9 || Math.abs(z - HAN.z) < 9 || Math.abs(z) < FRONT + 3) continue;
      if (clearOf(z, [NOREN], 2.5)) streetLamp(b, 'lamp_small', AIG1 - 0.2, z, [-1, 0]);
      if (k % 2 && clearOf(z + 5, [NOREN, [EK.z0, EK.z1]], 2)) bike(AIG1 - 0.5, z + 5, [0, 1]);
    }
  }

  // ═════════════════════════ The blocks behind the fronts ═════════════════════════
  const interiors: Rect[] = [];
  /** Row-house lanes filling a rectangle: lanes east–west, a row of houses facing each from both sides. */
  let lanes = 0;
  const roji = (x0: number, z0: number, x1: number, z1: number) => {
    const PITCH = 2 * A.nagaya_a.d + 2.6 + 0.8, n = Math.floor((z1 - z0 + 0.8) / PITCH);
    let z = z0 + (z1 - z0 - n * PITCH + 0.8) / 2;
    for (let k = 0; k < n; k++, z += PITCH) {
      const la = z + A.nagaya_a.d, le = la + 2.6, no = ++lanes;
      const name: Named = { ja: `藍染町 ${'一二三四五六'[no - 1] ?? no}番路地`, en: `Aizomechō lane ${no}` };
      lanePave(x0, la, x1, le, name);
      row('aizome', A, 's', la, x0 + 0.2, x1 - 0.2, NAGAYA, (id, a) => letterHouse(id, a, false), true);
      row('aizome', A, 'n', le, x0 + 0.2, x1 - 0.2, NAGAYA, (id, a) => letterHouse(id, a, false), true);
      for (let x = x0 + 8; x < x1 - 5; x += 16) streetLamp(b, 'lamp_small', x, le - 0.22, [0, -1]);
      for (let x = x0 + 4; x < x1 - 3; x += 13) bike(x, la + 0.4, [1, 0]);
      at('n', x1 - 1.4, le - 0.02, () => {
        b.model('aizome', 'jizo', 0, GY, -0.9, 1);
        b.block(-0.6, GY, -0.9, 0.6, GY + 1.8, -0.05);
      });
      vending(b, x0 + 1.1, GY, le - 0.4, [0, -1], no % 2 ? 'vending' : 'vending2', 'old');
    }
  };
  for (const sz of [-1, 1] as const) {
    const street = sz < 0 ? ASA : HAN;
    const [fz0, fz1] = sz < 0 ? [BACK, -FRONT] : [FRONT, -BACK]; // the front band
    const [bz0, bz1] = sz < 0 ? [-Z, street.z - street.half - street.pave] : [street.z + street.half + street.pave, Z]; // the back band
    const behind = sz < 0 ? -FRONT - 21.2 : FRONT + 21.2; // behind Tsumugi-dōri's fronts
    const [r0, r1] = sz < 0 ? [fz0 + 0.3, behind] : [behind, fz1 - 0.3];
    const backFace: Face = sz < 0 ? 's' : 'n', sideFace: Face = sz < 0 ? 'n' : 's';
    for (const [a, e] of between(sz < 0 ? corr : corrS)) {
      interiors.push([a, fz0, e, fz1], [a, bz0, e, bz1]);
      const akaW = Math.abs(e - (AKA.c - AKA.half - AKA.pave)) < 0.1, akaE = Math.abs(a - (AKA.c + AKA.half + AKA.pave)) < 0.1;
      const aigW = Math.abs(e - (sz < 0 ? WEST : AIG0)) < 0.1, aigE = Math.abs(a - AIG1) < 0.1;
      const xa = akaE ? a + 20.8 : aigE ? a + 12.6 : a + 0.3, xe = akaW ? e - 20.8 : aigW ? e - 12.6 : e - 0.3;
      // The back band: its rows face the back street.
      if (sz < 0) fillRect(xa, bz0 + 0.15, xe, bz1 - 0.3, backFace, akaW || akaE ? BIZ : SMALL);
      else fillRect(xa, bz0 + 0.3, xe, bz1 - 0.15, backFace, akaW || akaE ? BIZ : SMALL);
      // The front band.
      if (sz < 0 && (aigW || aigE)) {
        // The dyers' quarter: west of the street its houses, the yard and the shrine; a row on Shinshi-suji behind them.
        if (aigW) fillRect(a + 0.3, r0, a + 14.5, r1, 'w', LOW);
        continue;
      }
      if (a > KAT.c && e < KAR.c) {
        // East of Katagami-suji: a row on the back street, row-house lanes from street to street behind it.
        if (sz < 0) {
          fillRect(a + 0.3, r0, e - 0.3, r0 + 10.5, sideFace, LOW);
          roji(a, r0 + 11.3, e, r1);
        } else {
          fillRect(a + 0.3, r1 - 10.5, e - 0.3, r1, sideFace, LOW);
          roji(a, r0, e, r1 - 11.3);
        }
      } else if (akaE) {
        // Between the avenue's fronts and Katagami-suji: houses on that street.
        fillRect(xa + 0.4, r0, e - 0.3, r1, 'e', LOW);
      } else if (aigW || aigE) {
        // South of Tsumugi-dōri by the dyers' street: a row on Shinshi-suji; the rest is found by leftovers().
        if (aigW) fillRect(a + 0.3, r0, a + 14.5, r1, 'w', LOW);
      } else {
        // The plot's west and east ends: rows on Shinshi-suji and Kariyasu-suji.
        if (e < 0) fillRect(a + 0.6, r0, e - 0.3, r1, 'e', SMALL);
        else if (sz > 0) {
          // A convenience store on Kariyasu-suji, behind Tsumugi-dōri's fronts.
          const k = KONBINI.corner;
          at('w', a, r0 + k.w / 2, () => konbini(b, { type: 'corner', chain: 'asanagi' }));
          reserved.push([a, r0, a + k.d, r0 + k.w]);
          fillRect(a + 0.3, r0 + k.w + 0.8, e - 0.6, r1, 'w', SMALL);
        } else fillRect(a + 0.3, r0, e - 0.6, r1, 'w', SMALL);
      }
    }
  }
  // ── What is left over inside the blocks: no bare ground (coin parking, a pocket park, tiny-shop lanes, yards) ──
  leftovers(b, r, interiors, reserved, holes, { park: [{ ja: '伸子児童遊園', en: 'Shinshi Children’s Park' }, { ja: '藍甕ひろば', en: 'Aigame Square' }] }, piece);

  // ═════════════════════════ At the kerb: the metro's pylons ═════════════════════════
  {
    const P = KITACITY.pylon.pts;
    // (Only the stairs in Tsumugi-dōri's pavements: the headhouse's well is indoors.)
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
  // Every street runs on between rows of simplified buildings, with a cross street half way.
  {
    const OUT = 180, CW = 3.5;
    type Edge = { c: number; half: number; pave: number; wide: boolean; tree?: TreeKind; setts?: boolean };
    const roadOut = (alongZ: boolean, s: 1 | -1, q: Edge) => {
      const lim = alongZ ? Z : X, u0 = s > 0 ? lim : -lim - OUT, u1 = u0 + OUT;
      const R = (mat: string, v0: number, v1: number, y0: number, y1: number, a = u0, e = u1) => (alongZ ? b.deco(mat, q.c + v0, y0, a, q.c + v1, y1, e) : b.deco(mat, a, y0, q.c + v0, e, y1, q.c + v1));
      if (q.setts) {
        R(SETT, -q.half, q.half, -0.03, GY + 0.012);
        for (const k of [-1, 1]) R('paver', Math.min(k * q.half, k * (q.half + 2)), Math.max(k * q.half, k * (q.half + 2)), -0.03, GY);
        return;
      }
      R('asphalt', -q.half, q.half, -0.03, 0.004);
      for (const k of [-1, 1]) R('paver', Math.min(k * q.half, k * (q.half + q.pave)), Math.max(k * q.half, k * (q.half + q.pave)), -0.03, GY);
      if (q.wide) R(YELLOW, -0.08, 0.08, 0.004, 0.01);
      for (let u = u0 + 2; u + 3 < u1; u += 6) {
        if (q.half > 5) for (const k of [-1, 1]) R(WHITE, k * q.half / 2 - 0.07, k * q.half / 2 + 0.07, 0.004, 0.01, u, u + 3);
        else if (!q.wide) for (const k of [-1, 1]) R(WHITE, k * (q.half - 0.6) - 0.05, k * (q.half - 0.6) + 0.05, 0.004, 0.01, u, u + 3);
      }
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
    const packOut = (alongZ: boolean, s: 1 | -1, a: number, e: number, kinds: string[]) => {
      const lim = alongZ ? Z : X, mid = (a + e) / 2, CROSS = OUT / 2;
      for (const [d0, d1] of [[0.15, CROSS - CW], [CROSS + CW, OUT]]) {
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
    for (const s of [-1, 1] as const) {
      // North and south: the 筋 and the dyers' street.
      for (const q of [SHI, AKA, KAT, KAR]) roadOut(true, s, { c: q.c, half: q.half, pave: q.pave, wide: !q.way, tree: q === AKA ? 'ginkgo' : undefined });
      roadOut(true, s, { c: AIG, half: 2.5, pave: 0, wide: false, setts: true });
      for (const [a, e] of between([bl(SHI), [AIG0 - 2, AIG1 + 2], bl(AKA), bl(KAT), bl(KAR)])) {
        packOut(true, s, a, e, a > SHI.c && e < 0 ? LOW : BIZ);
        b.clearScenery(a - 9, s > 0 ? Z : -Z - OUT - 2, e + 9, s > 0 ? Z + OUT + 2 : -Z);
      }
      // East and west: Tsumugi-dōri and the two back streets.
      roadOut(false, s, { c: 0, half: RW, pave: FRONT - RW, wide: true, tree: 'zelkova' });
      for (const q of [ASA, HAN]) roadOut(false, s, { c: q.z, half: q.half, pave: q.pave, wide: true });
      for (const [a, e] of between([[ASA.z - 7.5, ASA.z + 7.5], [-FRONT, FRONT], [HAN.z - 7.5, HAN.z + 7.5]], -Z, Z)) {
        packOut(false, s, a, e, BIZ);
        b.clearScenery(s > 0 ? X : -X - OUT - 2, a - 9, s > 0 ? X + OUT + 2 : -X, e + 9);
      }
    }
  }
}
