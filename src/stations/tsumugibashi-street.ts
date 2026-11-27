// The streets of Tsumugibashi (紬橋), the central interchange: an old merchant quarter in the
// Senba / Kitahama manner (rebuilt 2026-11; docs/street-design.md has the owner's rules).
//
// Frame: +x east (along the Nagisa Line and Tsumugi-dōri), +z south. A grid of 筋 (north–south)
// and 通 (east–west), the canal Tsumugi-bori running north–south through its east part:
//
//   z −150 … −97.5   the back blocks, fronting Neriginu-dōri
//   z −90            練絹通 Neriginu-dōri (two lanes, cars west of Yanagi-suji, a paved walk east of it)
//   z −82.5 … −36.5  the front blocks: purpose-built fronts on Tsumugi-dōri and Yanagi-suji; the
//                    wholesalers' lane 絹問屋横丁 runs north from Tsumugi-dōri east of Yanagi-suji
//   z −12 … 12       紬通 Tsumugi-dōri, the avenue, crossing Tsumugi-bori on the stone bridge. Either side,
//                    as on the city's old great boulevard: a ginkgo separator, a side lane (側道), a planted
//                    strip with a second ginkgo row, a 9 m pavement with the metro's exits
//   z 36.5 … 82.5    the front blocks of the south side; the Silk Exchange (rotunda.ts) east of Yanagi-suji
//   z 90             白絹通 Shiroginu-dōri, as Neriginu-dōri
//
//   x −160  桑町筋 Kuwamachi-suji (one way north)      x −100  絹屋町筋 Kinuyamachi-suji (4 lanes)
//   x −66   機場筋 Hataba-suji (one way south)         x 0     柳筋 Yanagi-suji (the boulevard)
//   x 72.5 … 104  Tsumugi-bori: the west quay walk at street level, the riverside walk 紬堀 川辺の道
//                 on both banks 2.15 m down, the water between (85 … 99)
//   x 104 … 117.5 the east bank's buildings, backs on the water with terraces (紬堀テラス) at the second floor
//   x 125   紬堀筋 Tsumugibori-suji (2 lanes)          x 165   繭町筋 Mayumachi-suji (one way south)
//
// Over the junction of Tsumugi-dōri and Yanagi-suji stands the old painted-steel footbridge
// 紬橋歩道橋, a square with a stair at three corners, lifts at two, and an arm towards the Silk
// Exchange (joined to its upper floor in stage 2 of the rebuild).
//
// Signals share one 60 s cycle (traffic/signals.ts): axis 0 every east–west street, axis 1 every
// north–south one. The one-way streets join the avenue by left turns only, waiting at its kerb for
// the cross phase, when the traffic coming off the last signal has passed.
//
// Models: tools/blender/build_tsumugifront.py (the fronts), build_tsumugikit.py (the wholesalers,
// the lane gate, the terraces, the footbridge), build_exchange.py (the stone bridge, the Exchange).

import { linesAt } from '../data/network';
import type { SignContent } from '../signs/content';
import { rng, type Builder, type LanePart, type SignOpts, type V2 } from '../world/builder';
import type { Anchor, AnchorPt, Anchors } from './anchors/types';
import { KITAARCADE } from './anchors/kitaarcade';
import { KITACITY } from './anchors/kitacity';
import { TSUMUGIFRONT } from './anchors/tsumugifront';
import { TSUMUGIKIT } from './anchors/tsumugikit';
import { GROUND_Y as GY, stairs, vending, type Ctx } from './kit';
import { KONBINI, konbini } from './konbini';
import { lift } from './lift';
import { CARS, VEH } from '../traffic/vehicles';
import { PLACES, place } from './places';
import { kerbGaps, kerbRail, mark, pedSignal, poleLine, roadKit, roadModel, roadSign, shortSignal, streetLamp, trafficLane, vehicleSignal } from './roads';
import type { SurfaceSpec } from './surface';
import { boulevard, crosswalk, fillModelLots } from './surface';
import { EXCH } from './exchange';
import { AV_EAST, CANAL_GEOM, canalTown } from './tsumugi-canal';
import { canalLandmarks } from './tsumugi-land';
import { canalDress } from './tsumugi-dress';
import { LOT as TSUMUGI_EXCHANGE } from './rotunda';
import { modelTree, type TreeKind } from './trees';

type Rect = [number, number, number, number];
type Face = 'n' | 's' | 'e' | 'w';
type Named = { ja: string; en: string };

/** Half extents of Tsumugibashi's plot. */
export const TSUMUGI_PLOT = { x: 200, z: 150 };
const X = TSUMUGI_PLOT.x, Z = TSUMUGI_PLOT.z;
/**
 * The 2026-11-26 rebuild, stage 1: the outside is wiped to bare ground over the new, larger plot (north to
 * the Mio-gawa's bank, west towards Aizomechō), with only the exits, the canal and its bridge and the station's
 * buildings standing. The old streets below are switched off, kept for what stage 2 takes from them.
 */
const BARE = true;
/** The old bank (build_exchange.py BANK_W, BANK_D, BANK_H + attic, PORT, BANK_COLS). */
const BANK = { w: 34, d: 26, h: 15.2, port: 6, cols: [-12.5, -7.5, -2.5, 2.5, 7.5, 12.5] };
/** The new plot: how far north the main rectangle goes (the bank is at −414 at its east end), and the west arm (the bank is at −429 … −444 there). */
const NORTH = 410, ARM: Rect = [-350, -428, -TSUMUGI_PLOT.x, TSUMUGI_PLOT.z];
/** The avenue's half width and its building line (the exits and the Exchange are fitted to it: rotunda.ts ZF). */
const RW = 12, FRONT = 36.5;
/** Across each half of the avenue: the planted separator (RW … SEP), the side lane (SEP … SVC), the planting strip (SVC … STRIP), the pavement (STRIP … FRONT). */
const SEP = 16, SVC = 23.5, STRIP = 27.5;
/** A street running north–south: centre, carriageway half width, pavement; one way (−1 north, +1 south) or both. */
interface NS { c: number; half: number; pave: number; name: Named; way?: 1 | -1 }
const KUW: NS = { c: -160, half: 3.25, pave: 1.5, name: { ja: '桑町筋', en: 'Kuwamachi-suji' }, way: -1 };
const KIN: NS = { c: -100, half: 7, pave: 4, name: { ja: '絹屋町筋', en: 'Kinuyamachi-suji' } };
const HAT: NS = { c: -66, half: 3.25, pave: 1.5, name: { ja: '機場筋', en: 'Hataba-suji' }, way: 1 };
const YAN: NS = { c: 0, half: 10, pave: 6, name: { ja: '柳筋', en: 'Yanagi-suji' } };
const TSB: NS = { c: 125, half: 4.5, pave: 3, name: { ja: '紬堀筋', en: 'Tsumugibori-suji' } };
const MAY: NS = { c: 165, half: 3.25, pave: 1.5, name: { ja: '繭町筋', en: 'Mayumachi-suji' }, way: 1 };
const WIDE = [KIN, YAN, TSB];
const LOCALS = [KUW, HAT, MAY];
/** The east–west streets either side of the avenue: centre z, half width, pavement. Cars run west of Yanagi-suji only. */
const NEW = { z: -90, half: 4.5, pave: 3, name: { ja: '練絹通', en: 'Neriginu-dōri' } };
const SEW = { z: 90, half: 4.5, pave: 3, name: { ja: '白絹通', en: 'Shiroginu-dōri' } };
const BACK = NEW.z + NEW.half + NEW.pave; // −82.5: the front blocks' far edge (mirrored south)
/** The canal: its middle, the water's half width, the riverside walks' outer edges, the quay and the east bank. */
const CX = 92, WH = 7, WEST_WALL = 80, EAST_WALL = 104, QUAY = 72.5, EAST_BL = 104.5;
/** The riverside walk's level, and where it stops short of the bridge (its parapets stand at z = ±38). */
const PROM = -2.0, BRIDGE_Z = 38.4;
/** The wholesalers' lane (x), north of the avenue only. */
const LANE: [number, number] = [56, 61];
/** The footbridge: walking level, deck width, the square's inner edge. */
const DECK = GY + 6.0, DW = 3.6, FB = 16;
const SL = 5.2;
const WHITE = 'flat:#e9e9e4', YELLOW = 'flat:#e6a700', STONE = 'flat:#b3a688', STONE_DK = 'flat:#7d7361', TEAL = 'flat:#3f7f86';
const FRAME: Record<Face, { rot?: 0 | 1 | 2 | 3 }> = { n: {}, s: { rot: 2 }, e: { rot: 1 }, w: { rot: 3 } };

const bl = (s: { c: number; half: number; pave: number }): [number, number] => [s.c - s.half - s.pave, s.c + s.half + s.pave];
/** Intervals of u left between the given corridors. */
function between(corridors: [number, number][], u0 = -X, u1 = X): [number, number][] {
  const out: [number, number][] = [];
  let from = u0;
  for (const [a, c] of [...corridors].sort((p, q) => p[0] - q[0])) {
    if (a - from > 1) out.push([from, a]);
    from = Math.max(from, c);
  }
  if (u1 - from > 1) out.push([from, u1]);
  return out;
}

// ── Names the game letters on the fronts (invented; docs/worldbuilding.md) ──
type Style = 'stone' | 'brick' | 'ribbon' | 'seni' | 'tower' | 'kimono' | 'hotel';
const CANAL_STYLE: Record<string, Style> = { canal_a: 'stone', canal_b: 'brick', canal_c: 'ribbon', canal_d: 'brick', canal_e: 'kimono', canal_f: 'stone' };
const styleOf = (id: string): Style => CANAL_STYLE[id] ?? (id.split('_')[0] as Style);
const NAMES: Record<Style, [string, string][]> = {
  stone: [['紬橋銀行 本店', 'TSUMUGIBASHI BANK — HEAD OFFICE'], ['川湊信託銀行', 'KAWAMINATO TRUST BANK'], ['絹糸取引会館', 'Silk Yarn Trading Hall'], ['堀端銀行 紬橋支店', 'Horibata Bank — Tsumugibashi'], ['川湊証券 本社', 'KAWAMINATO SECURITIES'], ['紬橋商工会議所', 'Tsumugibashi Chamber of Commerce'], ['綾錦商事 旧本館', 'Ayanishiki Shōji — Old Head Office']],
  brick: [['紬橋ビルヂング', 'TSUMUGIBASHI BUILDING'], ['堀端ビルヂング', 'HORIBATA BUILDING'], ['絹屋町ビルヂング', 'KINUYAMACHI BUILDING'], ['柳筋ビルヂング', 'YANAGI-SUJI BUILDING'], ['大綛ビルヂング', 'ŌKASE BUILDING'], ['練絹ビルヂング', 'NERIGINU BUILDING'], ['杼屋ビルヂング', 'HIYA BUILDING']],
  ribbon: [['綾錦商事', 'AYANISHIKI SHŌJI'], ['紬橋繊維', 'TSUMUGIBASHI SEN-I'], ['川湊織物', 'KAWAMINATO ORIMONO'], ['丸紬商店', 'MARUTSUMUGI & CO.'], ['杼屋産業', 'HIYA SANGYŌ'], ['白絹商事', 'SHIROGINU SHŌJI']],
  seni: [['川湊繊維会館', 'Kawaminato Textile Hall'], ['紬橋織物会館', 'Tsumugibashi Weavers’ Hall'], ['絹業会館', 'Silk Trade Hall']],
  tower: [['紬橋センタービル', 'TSUMUGIBASHI CENTER BUILDING'], ['川湊生命 紬橋ビル', 'Kawaminato Life Tsumugibashi Building'], ['綾錦タワー', 'AYANISHIKI TOWER'], ['柳筋スクエア', 'YANAGI-SUJI SQUARE']],
  kimono: [['呉服 糸善', 'Gofuku Itozen'], ['きもの 丸紬', 'Kimono Marutsumugi'], ['帯 綾川', 'Obi Ayakawa'], ['呉服 絹屋', 'Gofuku Kinuya'], ['和装小物 くみひも堂', 'Kumihimodō'], ['ゆかた 白絹', 'Yukata Shiroginu']],
  hotel: [['東雲イン 紬橋', 'Shinonome Inn Tsumugibashi'], ['ホテル 紬堀', 'Hotel Tsumugibori'], ['ホテル 柳筋', 'Hotel Yanagi-suji']],
};
const ROOF: Record<string, [string, string][]> = {
  ribbon: [['綾錦', 'AYANISHIKI'], ['紬橋繊維', 'TSUMUGIBASHI SEN-I'], ['川湊織物', 'KAWAMINATO ORIMONO'], ['丸紬', 'MARUTSUMUGI'], ['杼屋', 'HIYA'], ['白絹', 'SHIROGINU']],
  seni: [['繊維会館', 'TEXTILE HALL'], ['織物会館', 'WEAVERS’ HALL'], ['絹業会館', 'SILK TRADE HALL']],
};
const BOARD: Record<Style, [string, string]> = {
  stone: ['#2a2622', '#e8dcc0'], brick: ['#2a2622', '#e8dcc0'], ribbon: ['#f4f1e8', '#1f2023'], seni: ['#1f2023', '#f4f1e8'],
  tower: ['#20262b', '#ffffff'], kimono: ['#2a2019', '#e8d9b0'], hotel: ['#1f2023', '#ffffff'],
};
/** The terraces' restaurants and the cafés on the riverside walk (invented). */
const TERRACES: [string, string][] = [
  ['川床料理 堀端', 'Horibata — Riverside Dining'], ['うなぎ 杼屋', 'Unagi Hiya'], ['天ぷら 綾', 'Tempura Aya'], ['ワインバー 生糸', 'Wine Bar Kiito'],
  ['串かつ 紬堀', 'Kushikatsu Tsumugibori'], ['おばんざい 綿の家', 'Obanzai Wata-no-ie'], ['ビストロ 絹の道', 'Bistro Kinu-no-michi'], ['鉄板焼 はし本', 'Teppanyaki Hashimoto'],
];
const CAFES: [string, string, string][] = [
  ['カフェ 川辺', 'Café Kawabe', '#2a2019'], ['喫茶 しずく', 'Kissa Shizuku', '#7a1f2b'], ['甘味処 糸桜', 'Kanmi Itozakura', '#3f6f4a'], ['珈琲 舟屋', 'Coffee Funaya', '#1f3f7a'],
  ['ベーカリー 堀', 'Bakery Hori', '#b35a1c'], ['ジェラート 水面', 'Gelato Minamo', '#1f6f9d'],
];
/** The boat landing on the west bank (z of its middle). */
const LANDING = { z: 60 };
/** The wholesalers (invented). */
const TONYA: [string, string, string][] = [
  ['綿布卸 大綛商店', 'Ōkase Cotton Cloth', '#1f3f7a'], ['絹織物卸 綾川', 'Ayakawa Silks', '#7a1f2b'], ['裏地問屋 丸平', 'Maruhei Linings', '#3f6f4a'],
  ['帯地卸 錦糸堂', 'Kinshidō Obi Cloth', '#2b3a67'], ['呉服卸 絹善', 'Kinuzen Kimono', '#7a1f2b'], ['繊維卸 川湊テキスタイル', 'Kawaminato Textile', '#1f6f9d'],
  ['寝装品卸 ふとん丸', 'Futonmaru Bedding', '#b35a1c'], ['タオル卸 白絹', 'Shiroginu Towels', '#1f3f7a'], ['ニット卸 杼屋', 'Hiya Knits', '#3f6f4a'],
  ['既製服卸 ミナト衣料', 'Minato Clothing', '#2b3a67'], ['生地 はぎれ市', 'Hagire-ichi Remnants', '#b4472f'], ['ボタン・付属 糸巻', 'Itomaki Buttons & Trims', '#6b4a32'],
];

export function tsumugiStreet(c: Ctx, spec: SurfaceSpec, cw: number, dir: [number, number]) {
  const { b } = c;
  const st = c.station;
  if (Math.abs(cw + 5.5 - FRONT) > 0.01) throw new Error(`tsumugiStreet: the avenue's building line moved (${cw + 5.5}); the Exchange and the exits are fitted to ${FRONT}`);
  const seed = spec.seed;
  const r = rng(seed);
  const lines = linesAt(st.id).map((l) => l.id);
  b.out.plot = { ...TSUMUGI_PLOT };
  const holes: Rect[] = b.out.holes.map((q) => [...q] as Rect);
  /** The exits' stairs on the avenue's pavements (the rotunda's stair inside the Exchange is not one). */
  const exits = holes.filter((q) => Math.abs(q[1]) < FRONT && Math.abs(q[3]) < FRONT);
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
    if (x1 - x0 < 4.6 || z1 - z0 < 8) return;
    const [a, e, f0, f1] = face === 'n' ? [x0, x1, z0, z1] : face === 's' ? [-x1, -x0, -z1, -z0] : face === 'e' ? [z0, z1, -x1, -x0] : [-z1, -z0, x0, x1];
    b.with(FRAME[face], () => {
      let z = f0;
      for (let k = 0; k < 6 && f1 - z > 8.5; k++) {
        const lots = fillModelLots(b, r, a, e, z, f1 + 2.01, { noBack: true, kinds, lo, bare: k > 0 });
        if (!lots.length) break;
        z = Math.max(...lots.map((l) => l[3])) + 0.8;
      }
    });
  };
  const BIZ = ['office', 'zakkyo', 'manshon'], SMALL = ['zakkyo', 'manshon', 'shophouse'], LOW = ['shophouse', 'machi'];

  // (The purpose-built fronts' helpers: used by the old streets below and by the 2026-11-26 fill.)
  const used = new Map<string, number>();
  const nameNo = new Map<Style, number>();
  /** A combination of the given fronts filling a frontage of length L (0.3 … 3 m to spare), the least used first. */
  const packFront = (L: number, ids: string[]): string[] => {
    const W = (id: string) => TSUMUGIFRONT[id].w;
    const order = [...ids].sort((p, q) => (used.get(p) ?? 0) - (used.get(q) ?? 0) || r() - 0.5);
    let best: string[] = [], bestScore = Infinity, steps = 0;
    const go = (acc: string[], sum: number) => {
      if (++steps > 30000) return;
      const rem = L - sum;
      if (acc.length && rem >= 0.3 && rem <= 3.2) {
        const score = acc.reduce((t, id) => t + (used.get(id) ?? 0) * 4, 0) + rem + acc.length * 0.2;
        if (score < bestScore) (bestScore = score), (best = [...acc]);
      }
      if (acc.length >= 6 || rem < 7.8) return;
      for (const id of order) if (!acc.includes(id) && W(id) <= rem - 0.3) {
        acc.push(id);
        go(acc, sum + W(id));
        acc.pop();
      }
    };
    go([], 0);
    for (const id of best) used.set(id, (used.get(id) ?? 0) + 1);
    // (Mixed up, so the towers do not all stand at one end.)
    return best.map((id) => [id, r()] as const).sort((p, q) => p[1] - q[1]).map(([id]) => id);
  };
  const letter = (id: string, p: Record<string, AnchorPt>) => {
    const sty = styleOf(id), k = nameNo.get(sty) ?? 0;
    nameNo.set(sty, k + 1);
    const [ja, en] = NAMES[sty][k % NAMES[sty].length], [bg, fg] = BOARD[sty];
    if (p.name) label(p.name, ja, en, bg, fg);
    if (p.roof) {
      const [rj, re] = ROOF[sty]?.[k % ROOF[sty].length] ?? [ja, en];
      label(p.roof, rj, re, sty === 'seni' ? '#1f3f7a' : '#f4f1e8', sty === 'seni' ? '#ffffff' : '#1f2023');
    }
    if (p.vertical) upright(p.vertical, ja.split(' ')[0], '#f4f1e8', '#1f3f7a');
  };
  /** Fronts along a frontage: on `face`, the building line at `line`, from u0 to u1 along it. Returns their depth's far edge per piece. */
  const fronts = (face: Face, line: number, u0: number, u1: number, ids: string[]) => {
    const row = packFront(u1 - u0, ids);
    const total = row.reduce((t, id) => t + TSUMUGIFRONT[id].w, 0);
    const gap = row.length ? (u1 - u0 - total) / (row.length + 1) : 0;
    let u = u0 + gap;
    const placed: Rect[] = [];
    for (const id of row) {
      const a = TSUMUGIFRONT[id], uc = u + a.w / 2;
      const alongX = face === 'n' || face === 's';
      const [x, z] = alongX ? [uc, line] : [line, uc];
      piece('tsumugifront', TSUMUGIFRONT, id, face, x, z, (q) => letter(id, q.pts));
      const d = a.d;
      placed.push(alongX ? [u, face === 'n' ? line : line - d, u + a.w, face === 'n' ? line + d : line] : [face === 'w' ? line : line - d, u, face === 'w' ? line + d : line, u + a.w]);
      u += a.w + gap;
    }
    return placed;
  };
  const FRONT_IDS = Object.keys(TSUMUGIFRONT).filter((k) => !k.startsWith('canal_'));
  const SHALLOW = Object.keys(TSUMUGIFRONT).filter((k) => k.startsWith('canal_'));
  const NO_TOWER = FRONT_IDS.filter((k) => !k.startsWith('tower_'));

  // ═════════════════════════ Ground ═════════════════════════
  // The canal and its riverside walks are cut out of the street; the bridge carries the avenue over.
  const canalCut: Rect[] = [];
  for (const s of [-1, 1]) {
    const [z0, z1] = s > 0 ? [BRIDGE_Z, Z] : [-Z, -BRIDGE_Z];
    canalCut.push([WEST_WALL, z0, EAST_WALL, z1]);
  }
  // Stairs down to the riverside walk: notches in the west quay, the bridge-foot plazas and the passages on the east bank.
  const PASS_Z = 95.5, PASS_W = 2.4; // the passage between the east bank's buildings (±), its half width
  const stairWells: { x0: number; x1: number; z0: number; z1: number; up: 'w' | 'e' }[] = [];
  for (const s of [-1, 1]) {
    for (const zc of [44, 100, 141]) stairWells.push({ x0: 76.2, x1: WEST_WALL, z0: s * zc - 1.3, z1: s * zc + 1.3, up: 'w' });
    for (const zc of [40, PASS_Z]) stairWells.push({ x0: EAST_WALL, x1: EAST_WALL + 3.8, z0: s * zc - 1.3, z1: s * zc + 1.3, up: 'e' });
  }
  const wells: Rect[] = stairWells.map((w) => [w.x0, Math.min(w.z0, w.z1), w.x1, Math.max(w.z0, w.z1)]);
  // The avenue's side lanes, block by block from street to street. None by the footbridge, on the bridge,
  // before the Silk Exchange (its forecourt, with the taxis) or across the wholesalers' lane's mouth.
  const sideLanes: { s: 1 | -1; x0: number; x1: number }[] = [], merges: { s: 1 | -1; x0: number; x1: number }[] = [];
  const localEdge = (x: number) => LOCALS.some((q) => Math.abs(x - (q.c - q.half)) < 0.01 || Math.abs(x - (q.c + q.half)) < 0.01);
  for (const s of [-1, 1] as const) {
    const cuts: [number, number][] = [
      ...WIDE.map((q): [number, number] => [q.c - q.half - 9, q.c + q.half + 9]), ...LOCALS.map((q): [number, number] => [q.c - q.half, q.c + q.half]),
      [-FB - DW - 4.5, FB + DW + 4.5], [QUAY - 3, EAST_WALL + 3], s > 0 ? [FB, QUAY] : [LANE[0] - 1.5, LANE[1] + 1.5],
    ];
    for (const [a, e] of between(cuts)) {
      if (e - a <= 14) continue;
      // Into a one-way street or off the plot: straight on. Anywhere else: through the separator to the main road.
      const openA = a <= -X + 1 || localEdge(a), openE = e >= X - 1 || localEdge(e);
      const x0 = openA ? a : a + 1.5, x1 = openE ? e : e - 1.5;
      sideLanes.push({ s, x0, x1 });
      if (!openA) merges.push({ s, x0, x1: x0 + 8 });
      if (!openE) merges.push({ s, x0: x1 - 8, x1 });
    }
  }
  const carriage: Rect[] = [
    ...sideLanes.map((l): Rect => [l.x0, l.s > 0 ? SEP : -SVC, l.x1, l.s > 0 ? SVC : -SEP]),
    ...merges.map((m): Rect => [m.x0, m.s > 0 ? RW : -SEP, m.x1, m.s > 0 ? SEP : -RW]),
    [-X, -RW, X, RW],
    ...WIDE.map((s): Rect => [s.c - s.half, -Z, s.c + s.half, Z]),
    ...LOCALS.map((s): Rect => [s.c - s.half, -Z, s.c + s.half, Z]),
    ...[NEW, SEW].map((s): Rect => [-X, s.z - s.half, 0, s.z + s.half]),
  ];
  // (The slabs stand back 5 cm from the exits' wells, so their edges never share a plane with the well walls.)
  const wellHoles: Rect[] = holes.map(([x0, z0, x1, z1]) => [x0 - 0.05, z0 - 0.05, x1 + 0.05, z1 + 0.05]);
  if (BARE) {
    // Stage 2a: ground, water, streets, decks and edges (tsumugi-canal.ts). Tsumugi-bori between z ±Z stays here.
    canalTown(b, { ja: st.nameJa, en: st.nameRomaji }, [...wellHoles, ...canalCut, ...wells]);
    // Stage 2b: the landmarks (tsumugi-land.ts). The footbridge is back, into the Exchange's second-floor door.
    canalLandmarks(b, st.id, (TSUMUGI_EXCHANGE.x0 + TSUMUGI_EXCHANGE.x1) / 2 + (EXCH.DOOR2[0] + EXCH.DOOR2[1]) / 2, EXCH.F2, FRONT);
    // The old bank across the avenue from the Exchange, the station's second entrance: its portico stands
    // forward over the pavement and exit 4's stair rises under it (build_exchange.py bank(): BANK).
    {
      const well = exits.find((q) => q[0] > 0 && q[1] < 0);
      if (!well) throw new Error('tsumugiStreet: no north-east exit for the bank\'s portico');
      const xc = (well[0] + well[2]) / 2;
      if (well[3] > -FRONT + BANK.port - 1.6 || Math.abs(well[2] - well[0]) > 2 * (BANK.cols[4] - 0.7)) throw new Error('tsumugiStreet: the exit\'s well does not fit under the bank\'s portico');
      b.open(() => at('s', xc, -FRONT, () => {
        b.model('exchange', 'bank', 0, GY, 0);
        b.block(-BANK.w / 2, GY, 0, BANK.w / 2, GY + BANK.h, BANK.d);
        for (const x of BANK.cols) b.block(x - 0.75, GY, -BANK.port + 0.15, x + 0.75, GY + 10, -BANK.port + 1.65);
        b.sign({ k: 'label', text: '紬橋銀行 本店', sub: 'TSUMUGIBASHI BANK — Head Office', fg: '#2a2622', bg: '#d8cfbd' }, 0, GY + 11.7, -BANK.port - 0.03, [0, -1], 11, 0.7);
        b.sign({ k: 'entrance', station: st.id }, 0, GY + 10.85, -BANK.port - 0.03, [0, -1], 4.4, 0.8);
      }));
    }
    const frontLots: { r: Rect; face: Face }[] = [];
    // ═════════════════════════ Stage 3: the fill ═════════════════════════
    // Purpose-built fronts on Tsumugi-dōri and Yanagi-suji; every other block in rows of the stock sets, two rows
    // back to back, tall and commercial by the station, low houses and workshops on the island and at the edges.
    {
      const G = CANAL_GEOM, NZ = -347.5;
      const reserved: Rect[] = [[16, RW, QUAY, 92.5], [29, -63, 65, -30], [20, -147.4, QUAY, -135], ...holes.map(([x0, z0, x1, z1]): Rect => [x0 - 1.5, z0 - 1.5, x1 + 1.5, z1 + 1.5])];
      const hit = (rs: Rect[], x: number, z: number) => rs.some((q) => x > q[0] && x < q[2] && z > q[1] && z < q[3]);
      const street = (x: number, z: number) => hit(G.roads, x, z);
      const free = (x: number, z: number) => x > G.x0 + 0.2 && x < G.x1 - 0.2 && z < Z - 0.2 && z > NZ && !street(x, z) && !hit(G.water, x, z) && !hit(reserved, x, z);
      const runsOf = (a: number, e: number, ok: (u: number) => boolean): [number, number][] => {
        const out: [number, number][] = [];
        let s0: number | null = null;
        for (let u = a; u <= e; u += 0.5) {
          const good = u < e && ok(u + 0.25);
          if (good && s0 === null) s0 = u;
          if (!good && s0 !== null) { out.push([s0, u]); s0 = null; }
        }
        return out;
      };
      // Fronts: the avenue's two sides, then Yanagi-suji's (the corners belong to the avenue's).
      for (const s of [-1, 1] as const) for (const [p, q] of runsOf(G.x0, G.x1, (x) => free(x, s * (FRONT + 1)) && free(x, s * (FRONT + 19)))) if (q - p >= 11.5) { const got = fronts(s < 0 ? 's' : 'n', s * FRONT, p + 0.3, q - 0.3, FRONT_IDS); reserved.push(...got); frontLots.push(...got.map((rc) => ({ r: rc, face: (s < 0 ? 's' : 'n') as Face }))); }
      const YL = YAN.half + YAN.pave;
      for (const s of [-1, 1] as const) for (const [p, q] of runsOf(NZ, Z, (z) => free(s * (YL + 1), z) && free(s * (YL + 19), z))) if (q - p >= 11.5) { const got = fronts(s < 0 ? 'e' : 'w', s * YL, p + 0.3, q - 0.3, NO_TOWER); reserved.push(...got); frontLots.push(...got.map((rc) => ({ r: rc, face: (s < 0 ? 'e' : 'w') as Face }))); }
      // The blocks: what is left, cut into rectangles.
      const cutsX = [...new Set([G.x0, G.x1, ...[...G.roads, ...G.water, ...reserved].flatMap((q) => [q[0], q[2]])].filter((v) => v >= G.x0 && v <= G.x1).map((v) => Math.round(v * 100) / 100))].sort((m, n) => m - n);
      const cutsZ = [...new Set([NZ, Z, ...[...G.roads, ...G.water, ...reserved].flatMap((q) => [q[1], q[3]])].filter((v) => v >= NZ && v <= Z).map((v) => Math.round(v * 100) / 100))].sort((m, n) => m - n);
      let open: Rect[] = [];
      const blocks: Rect[] = [];
      for (let j = 0; j + 1 < cutsZ.length; j++) {
        const z0 = cutsZ[j], z1 = cutsZ[j + 1], row: [number, number][] = [];
        for (let i = 0; i + 1 < cutsX.length; i++) {
          if (!free((cutsX[i] + cutsX[i + 1]) / 2, (z0 + z1) / 2)) continue;
          if (row.length && Math.abs(row[row.length - 1][1] - cutsX[i]) < 0.01) row[row.length - 1][1] = cutsX[i + 1];
          else row.push([cutsX[i], cutsX[i + 1]]);
        }
        const next: Rect[] = [];
        for (const [a, e] of row) {
          const up = open.find((q) => Math.abs(q[0] - a) < 0.01 && Math.abs(q[2] - e) < 0.01 && Math.abs(q[3] - z0) < 0.01);
          if (up) { up[3] = z1; next.push(up); } else { const q: Rect = [a, z0, e, z1]; blocks.push(q); next.push(q); }
        }
        open = next;
      }
      const kindsAt = (x: number, z: number): string[] => {
        const island = z < -170 && x > -133 && x < QUAY;
        if (island) return Math.abs(x) < 45 ? SMALL : LOW;
        if (Math.abs(z) < 105 && x > -240 && x < 170) return BIZ;
        if (x < -290 || z < -215 || z > 108 || x > 130) return LOW;
        return SMALL;
      };
      const M = 0.35;
      for (const [x0, z0, x1, z1] of blocks) {
        const W = x1 - x0, D = z1 - z0, xc = (x0 + x1) / 2, zc = (z0 + z1) / 2;
        if (Math.min(W, D) < 8.4 || Math.max(W, D) < 9) continue;
        const kinds = kindsAt(xc, zc);
        const st = (x: number, z: number) => street(x, z) || (x > G.x1 - 0.3 || x < G.x0 + 0.3 ? false : false);
        const sN = [0.25, 0.5, 0.75].some((t) => st(x0 + W * t, z0 - 1.2)), sS = [0.25, 0.5, 0.75].some((t) => st(x0 + W * t, z1 + 1.2));
        const sW = [0.25, 0.5, 0.75].some((t) => st(x0 - 1.2, z0 + D * t)), sE = [0.25, 0.5, 0.75].some((t) => st(x1 + 1.2, z0 + D * t));
        const ns = W >= D ? (sN || sS) || !(sW || sE) : (sN || sS) && !(sW || sE);
        if (ns) {
          if (sN && sS && D > 17.5) { fillRect(x0 + M, z0 + M, x1 - M, zc - 0.4, 'n', kinds); fillRect(x0 + M, zc + 0.4, x1 - M, z1 - M, 's', kinds); }
          else fillRect(x0 + M, z0 + M, x1 - M, z1 - M, sS && !sN ? 's' : 'n', kinds);
        } else if (sW && sE && W > 17.5) { fillRect(x0 + M, z0 + M, xc - 0.4, z1 - M, 'w', kinds); fillRect(xc + 0.4, z0 + M, x1 - M, z1 - M, 'e', kinds); }
        else fillRect(x0 + M, z0 + M, x1 - M, z1 - M, sE && !sW ? 'e' : 'w', kinds);
      }
      // North of the riverside street: a row on the street, a lane, a row on the river walk (the garden and the hall apart).
      for (const [a, e, zn] of [[-283, -223, -420], [-206.5, -126, -414], [105, 199.5, -404]]) {
        fillRect(a, -372.5, e, NZ - 0.6, 's', SMALL);
        fillRect(a, zn, e, -378.5, 'n', LOW);
      }
      // Past the edge: a row each side of every street that runs on, as deep as the next street allows.
      const m1 = b.out.models.length;
      for (const q of G.runOn) {
        if ((q.ax as string) === 'z' || q.k > 0) continue; // (east and south are whole blocks: below)
        const others = G.runOn.filter((o) => o !== q && o.ax === q.ax && o.k === q.k).map((o) => [o.c - o.half - o.pave, o.c + o.half + o.pave]);
        for (const sd of [-1, 1] as const) {
          const line = q.c + sd * (q.half + q.pave + 0.2);
          const room = Math.min(13.5, ...others.filter(([p, e]) => (sd > 0 ? p > line : e < line)).map(([p, e]) => (sd > 0 ? p - line : line - e) / 2 - 0.4));
          if (room < 9) continue;
          const [u0, u1] = q.ax === 'z' ? [Z + 0.4, Z + 150] : q.k > 0 ? [G.x1 + 0.4, G.x1 + 150] : [G.x0 - 150, G.x0 - 0.4];
          const kinds = q.kind === 'small' ? LOW : q.kind === 'wide' ? BIZ : SMALL;
          const [v0, v1] = sd > 0 ? [line, line + room] : [line - room, line];
          if (q.ax === 'z') { fillRect(v0, u0, v1, u1, sd > 0 ? 'w' : 'e', kinds, true); b.clearScenery(v0 - 2, u0, v1 + 2, u1); }
          else { fillRect(u0, v0, u1, v1, sd > 0 ? 'n' : 's', kinds, true); b.clearScenery(u0, v0 - 2, u1, v1 + 2); }
        }
      }
      // East and south (2026-11-26): whole blocks for 150 m between the carried-on streets, not one row a street. A
      // row on each street, a back lane with a row or two between them where the block is deep, a cross lane half
      // way out, and paving under all of it; one step lower in the far half (the merchant town fading out).
      const lower = (kinds: string[]) => (kinds === BIZ ? SMALL : LOW);
      const band = (ax: 'x' | 'z', u0: number, u1: number, lim0: number, lim1: number, extra: { lo: number; hi: number; kinds: string[] }[] = []) => {
        const um = (u0 + u1) / 2;
        const sts = [
          ...G.runOn.filter((q) => q.ax === ax && q.k > 0).map((q) => ({ lo: q.c - q.half - q.pave - 0.2, hi: q.c + q.half + q.pave + 0.2, kinds: q.kind === 'small' ? LOW : q.kind === 'wide' ? BIZ : SMALL })),
          ...extra,
        ].sort((m, n) => m.lo - n.lo);
        const rect = (ua: number, v0: number, ue: number, v1: number): Rect => (ax === 'x' ? [ua, v0, ue, v1] : [v0, ua, v1, ue]);
        /** A row between v0 and v1 whose street (or lane) lies at its low or its high side. */
        const row = (v0: number, v1: number, at: 'lo' | 'hi', kinds: string[]) => {
          if (v1 - v0 < 8.6) return;
          const face: Face = ax === 'x' ? (at === 'lo' ? 'n' : 's') : at === 'lo' ? 'w' : 'e';
          for (const [ua, ue, ks] of [[u0, um - 3, kinds], [um + 3, u1, lower(kinds)]] as [number, number, string[]][]) {
            const [x0, z0, x1, z1] = rect(ua, v0, ue, v1);
            fillRect(x0, z0, x1, z1, face, ks, true);
          }
        };
        const lane = (v0: number, v1: number) => { const [x0, z0, x1, z1] = rect(u0, v0, u1, v1); b.deco('tile:#a89f8d', x0, GY - 0.004, z0, x1, GY + 0.002, z1); };
        const middle = (m0: number, m1: number) => {
          const R = m1 - m0;
          if (R < 12.6) return;
          if (R < 22) { lane(m0, m0 + 4); row(m0 + 4, Math.min(m1, m0 + 17.5), 'lo', LOW); return; }
          const c = (m0 + m1) / 2;
          lane(c - 2, c + 2);
          row(Math.max(m0, c - 15.5), c - 2, 'hi', LOW);
          row(c + 2, Math.min(m1, c + 15.5), 'lo', LOW);
        };
        const gaps: { v0: number; v1: number; a?: string[]; e?: string[] }[] = [];
        let v = lim0, prev: string[] | undefined;
        for (const q of sts) { if (q.lo - v > 1) gaps.push({ v0: v, v1: q.lo, a: prev, e: q.kinds }); v = Math.max(v, q.hi); prev = q.kinds; }
        if (lim1 - v > 1) gaps.push({ v0: v, v1: lim1, a: prev });
        for (const g of gaps) {
          const D = g.v1 - g.v0, [x0, z0, x1, z1] = rect(u0 - 0.4, g.v0, u1, g.v1);
          b.deco('paver', x0, -0.05, z0, x1, GY - 0.004, z1);
          { const [cx0, cz0, cx1, cz1] = rect(um - 3, g.v0, um + 3, g.v1); b.deco('asphalt', cx0, GY - 0.004, cz0, cx1, GY + 0.001, cz1); }
          b.clearScenery(x0 - 2, z0 - 2, x1 + 2, z1 + 2);
          if (g.a && g.e) {
            if (D <= 27.8) { if (D >= 17.6) { row(g.v0, g.v0 + D / 2 - 0.3, 'lo', g.a); row(g.v1 - D / 2 + 0.3, g.v1, 'hi', g.e); } else row(g.v0, g.v1, 'lo', g.a); }
            else { row(g.v0, g.v0 + 13.5, 'lo', g.a); row(g.v1 - 13.5, g.v1, 'hi', g.e); middle(g.v0 + 13.9, g.v1 - 13.9); }
          } else if (g.a) { row(g.v0, g.v0 + Math.min(D, 13.5), 'lo', g.a); middle(g.v0 + 13.9, g.v1); }
          else if (g.e) { row(g.v1 - Math.min(D, 13.5), g.v1, 'hi', g.e); middle(g.v0, g.v1 - 13.9); }
        }
      };
      band('x', G.x1 + 0.4, G.x1 + 150, -400, Z);
      // (Tsumugi-bori runs on south between its quays: no block stands over it.)
      band('z', Z + 0.4, Z + 150, G.x0, G.x1, [{ lo: QUAY - 0.2, hi: 104.7, kinds: SMALL }]);
      // Tsumugi-dōri carried on towards Daigaku-mae (owner, 2026-11-26): mixed-use fronts each side, a back lane
      // and a low row behind, for as far as the road goes (tsumugi-canal.ts AV_EAST).
      {
        const xa = G.x1 + 150.4, xe = G.x1 + AV_EAST, F = FRONT + 0.2;
        for (const sd of [-1, 1] as const) {
          const z = (d: number) => sd * (F + d);
          b.deco('paver', xa - 0.4, -0.05, Math.min(z(0), z(34)), xe, GY - 0.004, Math.max(z(0), z(34)));
          b.deco('tile:#a89f8d', xa - 0.4, GY - 0.004, Math.min(z(13.9), z(17.9)), xe, GY + 0.002, Math.max(z(13.9), z(17.9)));
          b.clearScenery(xa - 2, Math.min(z(-2), z(36)), xe + 2, Math.max(z(-2), z(36)));
          for (const [p, q] of [[xa, (xa + xe) / 2 - 3], [(xa + xe) / 2 + 3, xe]]) {
            fillRect(p, Math.min(z(0), z(13.5)), q, Math.max(z(0), z(13.5)), sd > 0 ? 'n' : 's', SMALL, true);
            fillRect(p, Math.min(z(17.9), z(31.4)), q, Math.max(z(17.9), z(31.4)), sd > 0 ? 'n' : 's', LOW, true);
          }
        }
      }
      void m1;
      // ═════════════════════════ Stage 4: what is left inside the blocks, then the streets' dress ═════════════════════════
      leftovers(b, r, blocks.map(([x0, z0, x1, z1]): Rect => [x0 + 0.3, z0 + 0.3, x1 - 0.3, z1 - 0.3]), reserved, holes, { park: [] }, piece);
    }
    canalDress(b, exits, frontLots);
  } else {
  b.slab('asphalt', -X, -Z, X, Z, -0.6, 0, [...wellHoles, ...canalCut, ...wells]);
    b.slab('paver', -X, -Z, X, Z, 0, GY, [...wellHoles, ...canalCut, ...wells, ...carriage]);
    b.zone('street', -X, -0.3, -Z, X, 80, Z, `${st.nameJa}駅前`, `${st.nameRomaji} — street level`);
    b.block(-X - 1, -1, -Z - 1, -X, 60, Z + 1);
    b.block(X, -1, -Z - 1, X + 1, 60, Z + 1);
    b.block(-X, -1, -Z - 1, X, 60, -Z);
    b.block(-X, -1, Z, X, 60, Z + 1);
}
  b.out.district = { radius: 560, old: [CX, 0], oldRadius: 170, towers: 10 };

  if (!BARE) {
  // ═════════════════════════ Roads ═════════════════════════
  /** Where a north–south street's own paint stops for a crossing. */
  const crossingsNS: [number, number][] = [[-RW - 9, RW + 9], [NEW.z - NEW.half - 8, NEW.z + NEW.half + 8], [SEW.z - SEW.half - 8, SEW.z + SEW.half + 8]];
  const streetsX = WIDE.map((s): [number, number] => [s.c - s.half, s.c + s.half]);
  // The avenue: lane lines, the blue cycle-lane strip at each kerb, the wide streets' crosswalks and stop lines.
  for (let x = -X; x < X; x += 6) {
    if (streetsX.some(([a, e]) => x + 1.5 > a - 9 && x + 1.5 < e + 9) || Math.abs(x + 1.5 - CX) < 9) continue;
    for (const z of [-RW / 2, RW / 2]) b.deco(WHITE, x, 0.004, z - 0.07, x + 3, 0.01, z + 0.07);
  }
  {
    let from = -X;
    for (const [a, e] of [...streetsX, [X + 9, X + 9] as [number, number]]) {
      if (a - 9 - from > 2) for (const s of [-1, 1]) {
        b.deco(WHITE, from, 0.004, s * (RW - 1.55) - 0.06, a - 9, 0.01, s * (RW - 1.55) + 0.06);
        b.deco('flat:#3f74b5', from, 0.003, Math.min(s * (RW - 1.5), s * (RW - 0.2)), a - 9, 0.006, Math.max(s * (RW - 1.5), s * (RW - 0.2)));
      }
      from = e + 9;
    }
  }
  for (const s of WIDE) {
    const [a, e] = [s.c - s.half, s.c + s.half];
    for (let z = -Z + 1; z < Z - 2; z += 6) {
      if (!clearOf(z + 1.5, s === TSB ? [crossingsNS[0]] : crossingsNS)) continue;
      if (s.half > 5) for (const x of [s.c - s.half / 2, s.c + s.half / 2]) b.deco(WHITE, x - 0.07, 0.004, z, x + 0.07, 0.01, z + 3);
      b.deco(YELLOW, s.c - 0.08, 0.004, z, s.c + 0.08, 0.01, z + 6);
    }
    for (const x of [a - 4, e + 4]) crosswalk(b, x, 0, 2 * RW - 0.6, 4, true);
    for (const sz of [1, -1]) crosswalk(b, s.c, sz * (RW + 3.2), 2 * s.half - 0.4, 4, false);
    b.deco(WHITE, a - 7.2, 0.004, -RW, a - 6.8, 0.01, 0);
    b.deco(WHITE, e + 6.8, 0.004, 0, e + 7.2, 0.01, RW);
  }
  const lanes0 = b.out.lanes.length;
  roadKit(b, {
    X, Z, rw: RW, swOut: FRONT, streets: streetsX, seed, name: { ja: st.nameJa, en: st.nameRomaji }, at: { id: st.id, dir }, shared: true, lamp: 'lamp_hw', busy: 0.75, taxi: 0.25,
    junctions: [{ ja: '紬橋西', en: 'Tsumugibashi-nishi' }, { ja: '紬橋', en: 'Tsumugibashi' }, { ja: '紬橋東詰', en: 'Tsumugibashi-higashizume' }],
    roads: { main: { ja: '紬通', en: 'Tsumugi-dōri' }, cross: WIDE.map((s) => s.name) },
    flows: [0.6, 0.8, 0.4],
  });

  // ── Neriginu-dōri and Shiroginu-dōri: two lanes from the plot's edge to Yanagi-suji, a signal at every street ──
  /**
   * A signalled junction of a north–south street (centre cx, half width hx; `ways` its traffic's
   * headings, +1 south) and an east–west one (centre cz, half width hz; `ew` its traffic's headings,
   * +1 east). Crosswalks on all four arms, stop lines, a signal beyond the junction on the left for
   * each way in, pedestrian heads, the corners cut off.
   */
  const junction = (cx: number, hx: number, ways: (1 | -1)[], cz: number, hz: number, name: Named, ew: (1 | -1)[]) => {
    const wideNS = hx > 4.6, flat = true, style = cx === YAN.c ? 'shared' as const : 'new' as const;
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
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      for (let k = 0; k < 4; k++) {
        const u = 1.6 - k * 0.4, v = (k + 1) * 0.4;
        b.deco('asphalt', Math.min(cx + sx * hx, cx + sx * (hx + u)), GY, Math.min(cz + sz * (hz + v - 0.4), cz + sz * (hz + v)), Math.max(cx + sx * hx, cx + sx * (hx + u)), GY + 0.004, Math.max(cz + sz * (hz + v - 0.4), cz + sz * (hz + v)));
      }
    }
    roadModel(b, 'sigbox', cx - hx - 2.6, GY, cz - hz - 3.2, [0, 1]);
    b.block(cx - hx - 2.96, GY, cz - hz - 3.46, cx - hx - 2.24, GY + 1.56, cz - hz - 2.94);
  };
  const sideCross = [KUW, KIN, HAT].map((s) => ({ c: s.c, half: s.half }));
  /** Stops along an east–west lane heading sx (from x0) for the streets crossing it. */
  const stopsX = (sx: 1 | -1, x0: number, cross: { c: number; half: number }[]): LanePart['stops'] =>
    cross.map(({ c: cx, half }) => {
      const t = (cx - x0) * sx;
      return { at: t - half - SL - 0.5, axis: 0 as const, exit: t + half + SL };
    }).filter((q) => q.at > 2).sort((p, q) => p.at - q.at);
  for (const s of [NEW, SEW]) {
    const short = s === NEW ? { ja: '練絹', en: 'Neriginu' } : { ja: '白絹', en: 'Shiroginu' };
    for (const q of [KUW, KIN, HAT]) junction(q.c, q.half, q.way ? [q.way] : [1, -1], s.z, s.half, { ja: `${short.ja}${q.name.ja.replace('筋', '')}`, en: `${short.en} ${q.name.en.replace('-suji', '')}` }, [1, -1]);
    // At Yanagi-suji it ends for cars (a walk carries on east to the canal): traffic only comes in from the west.
    junction(YAN.c, YAN.half, [1, -1], s.z, s.half, { ja: `${short.ja}柳筋`, en: `${short.en} Yanagi-suji` }, [1]);
    const end = YAN.c - YAN.half - 1.0;
    // Eastbound keeps to the north half: from the plot's edge to Yanagi-suji, where it turns.
    trafficLane(b, -X, s.z - 2.25, end, s.z - 2.25, {
      speed: 30 / 3.6, flow: 2.4, use: 'all', taxi: 0.2, halts: [], dead: true,
      stops: [...stopsX(1, -X, sideCross), { at: YAN.c + X - YAN.half - SL - 0.5, axis: 0 as const, exit: end + X }],
    });
    // Westbound from Yanagi-suji (fed by its turns) to the edge.
    trafficLane(b, end, s.z + 2.25, -X, s.z + 2.25, { speed: 30 / 3.6, flow: 0, use: 'all', taxi: 0.2, halts: [], stops: stopsX(-1, end, sideCross) });
    // Paint: the centre line and edge lines between the crossings, lamps on alternate sides.
    const boxes = [...sideCross, { c: YAN.c, half: YAN.half }].map(({ c: cx, half }): [number, number] => [cx - half - 8, cx + half + 8]);
    for (let x = -X + 1; x < -2; x += 6) if (clearOf(x + 1.5, boxes)) b.deco(WHITE, x, 0.004, s.z - 0.07, x + 3, 0.01, s.z + 0.07);
    for (const e of [-1, 1]) {
      let from = -X;
      for (const [p, q] of [...boxes].sort((m, n) => m[0] - n[0])) {
        if (p - from > 1) b.deco(WHITE, from, 0.004, s.z + e * (s.half - 0.6) - 0.05, p + 3, 0.01, s.z + e * (s.half - 0.6) + 0.05);
        from = q - 3;
      }
    }
    for (const sx of [1, -1] as const) for (let x = -X + (sx > 0 ? 9 : 21); x < -YAN.half - 10; x += 24) {
      if (clearOf(x, boxes, 1)) streetLamp(b, 'lamp_shop', x, s.z - sx * (s.half + 0.6), [0, sx]);
    }
    roadSign(b, 'speed30', -X + 14, s.z - (s.half + 0.5), [-1, 0], 0.6);
    // East of Yanagi-suji: a paved walk to the canal, bollards where it leaves the street.
    const w0 = YAN.c + YAN.half + YAN.pave;
    b.deco('tile:#b9ab92', w0, GY + 0.002, s.z - s.half, QUAY, GY + 0.012, s.z + s.half);
    for (let x = w0 + 2; x < QUAY - 1; x += 4) b.deco('tile:#8f8370', x, GY + 0.012, s.z - s.half, x + 0.3, GY + 0.016, s.z + s.half);
    for (let z = s.z - s.half + 0.6; z <= s.z + s.half - 0.5; z += 1.6) {
      roadModel(b, 'bollard', w0 + 0.6, GY, z, [1, 0]);
      b.block(w0 + 0.45, GY, z - 0.15, w0 + 0.75, GY + 0.9, z + 0.15);
    }
    for (let x = w0 + 8; x < QUAY - 4; x += 16) streetLamp(b, 'lamp_park', x, s.z + s.half - 0.4, [0, -1]);
    b.zone('street', w0, GY - 0.2, s.z - s.half, QUAY, GY + 8, s.z + s.half, `${s.name.ja}（歩行者専用）`, `${s.name.en} (pedestrians only)`, true);
  }

  // The kit laid the wide streets' lanes with a stop at the avenue only: add the side streets' signals.
  for (const l of b.out.lanes.slice(lanes0)) {
    const dz = l.to[2] - l.from[2];
    if (Math.abs(l.to[0] - l.from[0]) > 0.1 || Math.abs(dz) < 1) continue;
    if (!(Math.abs(l.from[0] - KIN.c) < KIN.half + 0.1 || Math.abs(l.from[0] - YAN.c) < YAN.half + 0.1)) continue;
    const uz = Math.sign(dz), more: LanePart['stops'] = [];
    for (const s of [NEW, SEW]) {
      const t = (s.z - l.from[2]) * uz;
      if (t - s.half - SL < 6 || t + s.half + SL > Math.abs(dz) - 4) continue;
      more.push({ at: t - s.half - SL - 0.5, axis: 1, exit: t + s.half + SL });
    }
    l.stops = [...l.stops, ...more].sort((p, q) => p.at - q.at);
  }

  // ── The one-way streets: a lane each, joining the avenue by left turns ──
  for (const l of LOCALS) {
    const x = l.c, north = l.way! < 0, LH = l.half, MED = 1.0;
    const zs = Z + 1.5;
    const minor = { speed: 6, use: 'minor' as const, taxi: 0, halts: [] };
    const sideStop = (from: number, s: { z: number; half: number }, sz: 1 | -1) => {
      const t = (s.z - from) * sz;
      return { at: t - s.half - SL - 0.5, axis: 1 as const, exit: t + s.half + SL };
    };
    const signalled = l !== MAY;
    if (north) {
      // South half: in from the plot's edge, a signal at Shiroginu-dōri, out onto the avenue (a left turn).
      trafficLane(b, x, zs, x, MED, { ...minor, flow: 1.6, stops: [...(signalled ? [sideStop(zs, SEW, -1)] : []), { at: zs - RW - 1.6, axis: 1, exit: zs - MED }], dead: true });
      // North half: fed by left turns off the avenue, a signal at Neriginu-dōri, out at the edge.
      trafficLane(b, x, -MED, x, -zs, { ...minor, flow: 0, stops: signalled ? [sideStop(-MED, NEW, -1)] : [] });
    } else {
      trafficLane(b, x, -zs, x, -MED, { ...minor, flow: 1.6, stops: [...(signalled ? [sideStop(-zs, NEW, 1)] : []), { at: zs - RW - 1.6, axis: 1, exit: zs - MED }], dead: true });
      trafficLane(b, x, MED, x, zs, { ...minor, flow: 0, stops: signalled ? [sideStop(MED, SEW, 1)] : [] });
    }
    // Edge lines, 止まれ and a stop sign facing the avenue, one-way boards, lamps on the far side.
    const spans: [number, number][] = signalled ? [[-Z, NEW.z - NEW.half - 6], [NEW.z + NEW.half + 6, -RW - 1.2], [RW + 1.2, SEW.z - SEW.half - 6], [SEW.z + SEW.half + 6, Z]] : [[-Z, -RW - 1.2], [RW + 1.2, Z]];
    for (const [z0, z1] of spans) for (const e of [-1, 1]) if (z1 - z0 > 1) b.deco(WHITE, x + e * (LH - 0.6) - 0.05, 0.004, z0, x + e * (LH - 0.6) + 0.05, 0.01, z1);
    const s = l.way!, kerb = x + s * (LH + 0.5), far = x - s * (LH + 0.5);
    const zm = north ? RW + 1.2 : -RW - 1.2;
    b.deco(WHITE, x - LH + 0.5, 0.004, Math.min(zm, zm + s * 0.3), x + LH - 0.5, 0.01, Math.max(zm, zm + s * 0.3));
    mark(b, 'stop', x, zm - s * 3.4, [0, s], 2.2, 3.2);
    roadSign(b, 'stop', kerb, zm - s * 1.0, [0, -s]);
    const inZ = north ? [Z - 6, -FRONT - 3] : [-Z + 6, FRONT + 3], outZ = north ? [FRONT + 4, -Z + 6] : [-FRONT - 4, Z - 6];
    for (const z of inZ) {
      roadModel(b, 'signpole', far, GY, z, [0, -s]);
      b.block(far - 0.06, GY, z - 0.06, far + 0.06, GY + 2, z + 0.06);
      b.sign({ k: 'roadsign', v: s * (far - x) > 0 ? 'oneway-l' : 'oneway-r' }, far, GY + 2.72, z - s * 0.05, [0, -s], 0.9, 0.3);
      b.sign({ k: 'roadsign', v: 'back-rect' }, far, GY + 2.72, z + s * 0.05, [0, s], 0.9, 0.3);
      roadSign(b, 'speed30', kerb, z + s * 6, [0, -s], 0.6);
    }
    for (const z of outZ) roadSign(b, 'noentry', far, z, [0, s], 0.66);
    for (let z = -Z + 12; z < Z - 6; z += 26) {
      if (Math.abs(z) < FRONT + 2 || (signalled && (Math.abs(z - NEW.z) < 12 || Math.abs(z - SEW.z) < 12))) continue;
      streetLamp(b, 'lamp_small', far, z, [x > far ? 1 : -1, 0]);
    }
    // Wires on poles down the far side (narrow streets keep them).
    poleLine(b, { axis: 'z', from: -Z + 6, to: Z - 6, at: far + (x > far ? -0.2 : 0.2), road: x > far ? 1 : -1, step: 26, skip: (u) => Math.abs(u) < FRONT + 4 || (signalled && (Math.abs(u - NEW.z) < 10 || Math.abs(u - SEW.z) < 10)), drops: 0.7, name: { ja: st.nameJa, en: st.nameRomaji } });
  }

  // ── Nothing of the kit's stands in a local street's mouth; the avenue's median; its kerb rails ──
  {
    const mouths: Rect[] = [
      ...LOCALS.flatMap((l): Rect[] => [[l.c - l.half - 1.2, RW - 0.2, l.c + l.half + 1.2, FRONT + 0.2], [l.c - l.half - 1.2, -FRONT - 0.2, l.c + l.half + 1.2, -RW + 0.2]]),
      ...merges.map((m): Rect => [m.x0 - 0.5, m.s > 0 ? RW - 0.2 : -SEP - 0.2, m.x1 + 0.5, m.s > 0 ? SEP + 0.2 : -RW + 0.2]),
    ];
    for (const [x0, z0, x1, z1] of mouths) {
      const inside = (v: number[]) => v[0] > x0 && v[0] < x1 && v[2] > z0 && v[2] < z1;
      b.out.models = b.out.models.filter((m) => !(inside(m.pos) && m.kind === 'road' && m.pos[1] < GY + 1));
      b.out.signs = b.out.signs.filter((sg) => !(inside(sg.pos) && sg.normal !== null && sg.pos[1] > GY + 0.3 && (sg.pos[1] < GY + 4.6 || sg.content.k === 'roadboard')));
      b.out.boxes = b.out.boxes.filter((bx) => {
        const post = bx.max[1] < GY + 7 && bx.max[0] - bx.min[0] < 2.6 && bx.max[2] - bx.min[2] < 2.6;
        return !(bx.min[1] > -0.05 && bx.max[1] > 0.3 && post && inside([(bx.min[0] + bx.max[0]) / 2, 0, (bx.min[2] + bx.max[2]) / 2]));
      });
    }
  }
  const zonesAv: [number, number][] = [...streetsX.map(([a, e]): [number, number] => [a - 9, e + 9]), [CX - 9, CX + 9]];
  {
    // A low granite median with clipped azaleas between the junctions (not on the bridge).
    let from = -X;
    for (const [p, q] of [...zonesAv, [X, X] as [number, number]].sort((m, n) => m[0] - n[0])) {
      if (p - 3 - (from + 3) >= 6) {
        b.box('flat:#8d8f8c', from + 3, 0, -0.8, p - 3, 0.3, 0.8);
        b.deco('flat:#3f6b3a', from + 3.2, 0.3, -0.6, p - 3.2, 0.85, 0.6);
        b.block(from + 3, 0, -0.8, p - 3, 1.1, 0.8);
      }
      from = q - 3;
    }
  }
  const gaps = kerbGaps(streetsX);
  for (const s of [-1, 1] as const) {
    const zr = s * (RW + 0.3);
    const open = [...zonesAv.map(([a, e]) => [a + 2, e - 2]), ...LOCALS.map((l) => [l.c - l.half - 0.6, l.c + l.half + 0.6]), ...gaps.filter((k) => k.s === s).map((k) => [k.x0, k.x1]), ...merges.filter((m) => m.s === s).map((m) => [m.x0 - 0.3, m.x1 + 0.3])].sort((p, q) => p[0] - q[0]);
    let x = -X;
    for (const [from, to] of open.concat([[X, X]])) {
      for (let xa = x; xa + 2.5 <= from; xa += 2.5) {
        b.block(xa, GY, zr - 0.04, xa + 2.5, GY + 0.9, zr + 0.04);
        kerbRail(b, xa + 1.25, zr);
      }
      x = Math.max(x, to);
    }
  }

  // ── Trees: ginkgo in two rows down the avenue's pavements (as on the city's great boulevard), willows on
  // Yanagi-suji, zelkova on Kinuyamachi-suji, cherries on Tsumugibori-suji. Benches and planters between the rows. ──
  let tn = 0;
  const tree = (x: number, z: number, kind: TreeKind) => modelTree(b, kind, x, z, tn++ % 3 ? 'a' : 'b', GY, true);
  const nearLocal = (x: number, m: number) => LOCALS.some((l) => Math.abs(x - l.c) < l.half + m);
  const footbridgeZone = (x: number, z: number) => Math.abs(x) < FB + DW + 30 && Math.abs(z) < FB + DW + 13;
  for (const s of [-1, 1] as const) {
    // The separator's row, all along.
    for (let x = -X + 8; x < X - 4; x += 12) {
      if (!clearOf(x, zonesAv, 1) || nearLocal(x, 2.5)) continue;
      const z = s * (RW + 1.9);
      if (nearHole(x, z, 3.5) || footbridgeZone(x, z) || gaps.some((k) => k.s === s && x > k.x0 - 2 && x < k.x1 + 2) || merges.some((m) => m.s === s && x > m.x0 - 2 && x < m.x1 + 2)) continue;
      tree(x, z, 'ginkgo');
    }
  }
  for (const l of sideLanes) {
    const s = l.s, hx = -s as 1 | -1; // north side eastbound, south side westbound (left-hand traffic)
    const zBay = s * (SEP + 2.5), zMid = s * (SEP + 2.5 + (SVC - SEP - 2.5) / 2);
    // Parking bays along the separator, an edge line, arrows; vans and cars standing in some bays.
    b.deco(WHITE, l.x0, 0.004, Math.min(zBay, zBay + s * 0.12), l.x1, 0.01, Math.max(zBay, zBay + s * 0.12));
    for (let x = l.x0 + 1; x + 6 <= l.x1 - 1; x += 6) {
      b.deco(WHITE, x, 0.004, Math.min(s * SEP, zBay), x + 0.12, 0.01, Math.max(s * SEP, zBay));
      if (r() < 0.5) {
        const id = r() < 0.35 ? 'van' : CARS[Math.floor(r() * CARS.length)], [len, wid, hgt] = VEH[id.split('_')[0]];
        const zc = s * (SEP + 1.25);
        roadModel(b, id, x + 3, 0, zc, [hx, 0]);
        b.block(x + 3 - len / 2, 0, zc - wid / 2, x + 3 + len / 2, hgt, zc + wid / 2);
      }
    }
    for (let x = l.x0 + 12; x < l.x1 - 8; x += 40) mark(b, 'ahead', x, zMid, [hx, 0], 1.2, 4.4);
    // The planting strip: clipped azaleas with a gap every 24 m to cross to the cars, the second ginkgo row.
    const za = s * SVC, zc = s * STRIP, zt = s * (SVC + (STRIP - SVC) / 2);
    let from = l.x0;
    for (let x = l.x0 + 21; ; x += 24) {
      const to = Math.min(x, l.x1);
      if (to - from > 2) {
        b.deco('flat:#8d8f8c', from, GY, Math.min(za, zc) + 0.15, to, GY + 0.3, Math.max(za, zc) - 0.15);
        b.deco('flat:#3f6b3a', from + 0.2, GY + 0.3, Math.min(za, zc) + 0.35, to - 0.2, GY + 0.85, Math.max(za, zc) - 0.35);
        b.block(from, GY, Math.min(za, zc) + 0.15, to, GY + 0.9, Math.max(za, zc) - 0.15);
        for (let xt = from + 4; xt < to - 3; xt += 12) if (!nearHole(xt, zt, 3)) tree(xt, zt, 'ginkgo');
      }
      if (x >= l.x1) break;
      from = x + 3;
    }
  }
  // On the pavement by the strip: benches, bicycle racks, planters, now and then.
  for (const s of [-1, 1] as const) {
    for (let x = -X + 14; x < X - 6; x += 24) {
      const z = s * (STRIP + 0.9);
      if (!sideLanes.some((l) => l.s === s && x > l.x0 + 3 && x < l.x1 - 6) || nearHole(x, z, 5) || nearHole(x + 4, z, 5)) continue;
      const id = Math.round(x / 24) % 3 === 0 ? 'bikerack' : 'bench_s';
      roadModel(b, id, x, GY, z, [0, s]);
      const hw = id === 'bikerack' ? 2.05 : 0.95;
      b.block(x - hw, GY, z - 0.4, x + hw, GY + (id === 'bikerack' ? 1.1 : 0.6), z + 0.4);
      roadModel(b, 'planter', x + 3.6, GY, z, [0, s]);
      b.block(x + 3.6 - 0.9, GY, z - 0.45, x + 3.6 + 0.9, GY + 0.9, z + 0.45);
    }
  }
  for (const s of [YAN, KIN, TSB]) {
    const kind: TreeKind = s === YAN ? 'willow' : s === KIN ? 'zelkova' : 'cherry';
    const lamp = s === YAN ? 'lamp_twin' : 'lamp_led';
    for (const sx of [-1, 1]) {
      const x = s.c + sx * (s.half + 1.5);
      for (let z = -Z + 10; z < Z - 5; z += 15) {
        if (Math.abs(z) < FRONT + 4 || !clearOf(z, crossingsNS, 2) || nearHole(x, z, 4)) continue;
        tree(x, z, kind);
        if (Math.round(z / 15) % 2 === (sx > 0 ? 0 : 1) && Math.abs(z + 7) > FRONT + 4 && clearOf(z + 7, crossingsNS, 2)) streetLamp(b, lamp, s.c + sx * (s.half + 0.9), z + 7, [-sx, 0]);
      }
    }
  }

  }
  // ═════════════════════════ Tsumugi-bori: the bridge, the quay, the riverside walk ═════════════════════════
  // (All of it open air: below the street, but never hidden as the station's underground is.)
  b.open(() => {
    const bridgeName: Named = { ja: '紬橋', en: 'Tsumugi-bashi' };
    const walk: Named = { ja: '紬堀 川辺の道', en: 'Tsumugibori Riverside Walk' };
    for (const s of [-1, 1] as const) {
      const [z0, z1] = s > 0 ? [BRIDGE_Z, Z] : [-Z, -BRIDGE_Z];
      // The water, its coursed stone banks up to the walk, the walks' paving.
      b.box('water', CX - WH, -3.4, z0, CX + WH, -2.8, z1, false);
      for (const ex of [CX - WH, CX + WH]) {
        const o = ex < CX ? -1 : 1;
        for (let k = 0; k < 3; k++) b.deco(k % 2 ? 'flat:#8d8371' : STONE_DK, Math.min(ex, ex + o * 0.4), -3.4 + k * 0.47, z0, Math.max(ex, ex + o * 0.4), -3.4 + (k + 1) * 0.47 + 0.01, z1);
        b.box(STONE, Math.min(ex, ex + o * 0.5), PROM - 0.05, z0, Math.max(ex, ex + o * 0.5), PROM + 0.12, z1);
        // An iron rail along the water's edge, on stone posts.
        const rx = ex + o * 0.25;
        const railOpen: [number, number][] = s > 0 && o < 0 ? [[LANDING.z - 1.2, LANDING.z + 1.2]] : [];
        for (const [p, q] of between(railOpen, z0, z1)) {
          b.block(rx - 0.06, PROM, p, rx + 0.06, PROM + 1.1, q);
          b.deco('metal:#2e3134', rx - 0.03, PROM + 0.95, p, rx + 0.03, PROM + 1.02, q);
          b.deco('metal:#2e3134', rx - 0.02, PROM + 0.5, p, rx + 0.02, PROM + 0.54, q);
          for (let z = p + 0.4; z < q; z += 2.5) b.deco(STONE, rx - 0.1, PROM, z - 0.1, rx + 0.1, PROM + 1.12, z + 0.1);
        }
      }
      for (const [xa, xc] of [[WEST_WALL, CX - WH], [CX + WH, EAST_WALL]]) {
        b.box('tile:#b9ab92', xa, PROM - 0.4, z0, xc, PROM, z1);
        for (let z = z0 + 1; z < z1; z += 3) b.deco('tile:#9d907a', xa, PROM, z, xc, PROM + 0.006, z + 0.12);
      }
      // The retaining walls up to the street, and the bridge-end walls closing the walks.
      // (On the east bank the buildings' walk storeys are its face: the east bank's block below draws the wall between them.)
      for (const [xa, xc, up] of [[WEST_WALL - 0.4, WEST_WALL + 0.02, 'w'], [EAST_WALL - 0.02, EAST_WALL + 0.5, 'e']] as const) {
        const cuts = stairWells.filter((w) => w.up === up && Math.sign(w.z0) === s).map((w): [number, number] => [Math.min(w.z0, w.z1), Math.max(w.z0, w.z1)]);
        for (const [p, q] of between(cuts, z0, z1)) (up === 'w' ? b.box(STONE_DK, xa, PROM - 0.4, p, xc, GY, q) : b.block(xa, PROM - 0.4, p, xc, GY, q));
      }
      const ze = s * BRIDGE_Z;
      for (const [xa, xc] of [[WEST_WALL, CX - WH], [CX + WH, EAST_WALL]]) b.box(STONE_DK, xa, PROM - 0.4, Math.min(ze + s * 0.02, ze - s * 0.3), xc, GY, Math.max(ze + s * 0.02, ze - s * 0.3));
      // The bridge's parapet (carried on over the walks' ends), its name posts and plates.
      b.block(WEST_WALL, GY, ze - 0.14, EAST_WALL, GY + 1.1, ze + 0.14);
      for (const [xa, xc] of [[WEST_WALL, CX - WH - 0.6], [CX + WH + 0.6, EAST_WALL]]) {
        b.deco(STONE, xa, GY, ze - 0.14, xc, GY + 1.0, ze + 0.14);
        b.deco(STONE_DK, xa, GY + 1.0, ze - 0.18, xc, GY + 1.12, ze + 0.18);
      }
      for (const x of [CX - WH - 0.6, CX + WH + 0.6]) b.block(x - 0.42, GY, ze - 0.42, x + 0.42, GY + 3.6, ze + 0.42);
      b.sign({ k: 'label', text: bridgeName.ja, sub: bridgeName.en, fg: '#2a2019', bg: '#b08d3a' }, CX, GY + 0.56, ze - s * 0.11, [0, -s], 2.4, 0.6);
      // The quay's edge: a stone rail with iron bars, willows, bronze lamps and benches on the quay walk.
      const qx = WEST_WALL - 0.2;
      const quayOpen = stairWells.filter((w) => w.up === 'w' && Math.sign(w.z0) === s).map((w): [number, number] => [Math.min(w.z0, w.z1), Math.max(w.z0, w.z1)]);
      let zf = z0;
      for (const [p, q] of [...quayOpen, [z1, z1] as [number, number]].sort((m, n) => m[0] - n[0])) {
        if (p - zf > 0.3) {
          b.block(qx - 0.1, GY, zf, qx + 0.1, GY + 1.1, p);
          b.deco(STONE, qx - 0.12, GY, zf, qx + 0.12, GY + 0.35, p);
          b.deco('metal:#2e3134', qx - 0.03, GY + 0.95, zf, qx + 0.03, GY + 1.02, p);
          for (let z = zf + 0.3; z < p; z += 2.5) b.deco(STONE, qx - 0.12, GY, z - 0.12, qx + 0.12, GY + 1.12, z + 0.12);
        }
        zf = q;
      }
      for (let z = z0 + 6; z < z1 - 3; z += 11) {
        if (quayOpen.some(([p, q]) => z > p - 3 && z < q + 3) || Math.abs(Math.abs(z) - 90) < 6) continue;
        modelTree(b, 'willow', WEST_WALL - 1.6, z, 'a', GY, true);
      }
      for (let z = z0 + 11.5; z < z1 - 3; z += 22) {
        if (Math.abs(Math.abs(z) - 90) < 6 || quayOpen.some(([p, q]) => z + 5 > p - 2.5 && z + 5 < q + 2.5)) continue;
        b.model('tsumugi', 'lamp', QUAY + 1.2, GY, z);
        b.block(QUAY + 1.0, GY, z - 0.22, QUAY + 1.44, GY + 3.6, z + 0.22);
        roadModel(b, 'bench_s', QUAY + 2.6, GY, z + 5, [1, 0]);
        b.block(QUAY + 2.2, GY, z + 4.05, QUAY + 3.0, GY + 0.6, z + 5.95);
      }
      // (Open over the stairs down: wells.)
      b.slab('tile:#b9ab92', QUAY, z0, WEST_WALL - 0.4, z1, GY + 0.002, GY + 0.01, wells, false);
      b.zone('street', QUAY, GY - 0.2, z0, WEST_WALL, GY + 8, z1, '紬堀 西河岸', 'Tsumugi-bori west quay', true);
      // Lamps down the riverside walk, against the retaining walls; a moored cargo punt.
      for (const xw of [WEST_WALL + 0.5, EAST_WALL - 0.5]) for (let z = z0 + 8; z < z1 - 3; z += 16) {
        if (stairWells.some((w) => z > Math.min(w.z0, w.z1) - 2 && z < Math.max(w.z0, w.z1) + 2)) continue;
        b.model('tsumugi', 'lamp', xw, PROM, z);
        b.block(xw - 0.22, PROM, z - 0.22, xw + 0.22, PROM + 3.6, z + 0.22);
      }
      // Cargo punts moored under the banks, mooring posts in the water.
      for (const [bx, bz] of s > 0 ? [[CX + 4.5, 82], [CX - 4.5, 122]] : [[CX - 4.5, -66], [CX + 4.5, -112], [CX - 4.5, -138]]) {
        b.deco('wood:#6b5440', bx - 1.1, -2.9, bz - 3.5, bx + 1.1, -2.45, bz + 3.5);
        b.deco('wood:#4a3a2e', bx - 0.9, -2.45, bz - 3.3, bx + 0.9, -2.4, bz + 3.3);
        for (const [k, col] of ['#1f6f9d', '#b4472f', '#efe6cf'].entries()) b.deco('flat:' + col, bx - 0.7, -2.4, bz - 2.4 + k * 1.5, bx + 0.7, -2.0, bz - 1.3 + k * 1.5);
        for (const dz of [-4.6, 4.6]) b.deco('wood:#4a3a2e', bx - 0.12, -3.4, bz + dz - 0.12, bx + 0.12, -1.2, bz + dz + 0.12);
      }
      b.zone('passage', WEST_WALL, PROM - 0.2, z0, EAST_WALL, PROM + 4, z1, walk.ja, walk.en, true);
    }
    b.model('exchange', 'bridge', CX, GY, 0);
    // The boat landing: a pontoon level with the walk on the west bank, a sightseeing boat alongside.
    {
      const K = TSUMUGIKIT, P = K.pontoon, B = K.boat, x0 = CX - WH + 0.05;
      b.with({ rot: 3, t: [x0, 0, LANDING.z] }, () => {
        b.model('tsumugikit', 'pontoon', 0, PROM, 0, 0);
        const p = P.pts.name;
        b.sign({ k: 'label', text: '紬堀 船着場', sub: 'Tsumugibori Landing', fg: '#1f2023', bg: '#f4f1e8' }, p[0], p[1] + PROM, p[2], [p[5], p[6]], p[3], p[4]);
      });
      b.block(x0, PROM - 0.4, LANDING.z - P.w / 2, x0 + P.d, PROM, LANDING.z + P.w / 2);
      b.block(x0 + P.d - 0.1, PROM, LANDING.z - P.w / 2, x0 + P.d, PROM + 1.1, LANDING.z + P.w / 2);
      for (const e of [-1, 1]) b.block(x0, PROM, LANDING.z + e * P.w / 2 - 0.05, x0 + P.d, PROM + 1.1, LANDING.z + e * P.w / 2 + 0.05);
      const bx = x0 + P.d + 0.25;
      b.with({ rot: 3, t: [bx, 0, LANDING.z + 1] }, () => {
        b.model('tsumugikit', 'boat', 0, -2.8, 0, 0);
        for (const k of ['name', 'name_b']) {
          const p = B.pts[k];
          b.sign({ k: 'label', text: '紬堀めぐり', sub: 'Tsumugibori Cruise', fg: '#1f3f7a', bg: '#f2f1ec' }, p[0], p[1] - 2.8, p[2], [p[5], p[6]], p[3], p[4]);
        }
      });
      b.block(bx, -3.3, LANDING.z + 1 - B.w / 2, bx + B.d, -0.6, LANDING.z + 1 + B.w / 2);
    }
    // The stairs down: from the west quay, the bridge-foot plazas and the east bank's passages.
    for (const w of stairWells) {
      const [za, zc] = [Math.min(w.z0, w.z1), Math.max(w.z0, w.z1)];
      // Stone steps between stone walls; an iron handrail on each wall; a low stone parapet along both
      // sides of the well up on the street, with an iron rail.
      const so = { yLow: PROM, yHigh: GY, mat: 'tile:#b9ab92', rails: [false, false] as [boolean, boolean] };
      if (w.up === 'w') b.with({ rot: 2 }, () => stairs(b, { ...so, x0: -w.x1, x1: -w.x0, z0: -zc, z1: -za }));
      else stairs(b, { ...so, x0: w.x0, x1: w.x1, z0: za, z1: zc });
      b.box(STONE_DK, w.x0, PROM - 0.4, za - 0.3, w.x1, GY, za + 0.02);
      b.box(STONE_DK, w.x0, PROM - 0.4, zc - 0.02, w.x1, GY, zc + 0.3);
      const n = 8, low = w.up === 'w' ? w.x1 : w.x0, high = w.up === 'w' ? w.x0 : w.x1;
      for (let k = 0; k < n; k++) {
        const xa = low + ((high - low) * k) / n, xb = low + ((high - low) * (k + 1)) / n, y = PROM + ((GY - PROM) * (k + 0.5)) / n + 0.85;
        for (const z of [za + 0.06, zc - 0.06]) b.deco('metal:#2e3134', Math.min(xa, xb), y - 0.03, z - 0.03, Math.max(xa, xb), y + 0.03, z + 0.03);
      }
      for (const [z0, z1] of [[za - 0.3, za], [zc, zc + 0.3]]) {
        b.block(w.x0, GY, z0, w.x1, GY + 1.1, z1);
        b.deco(STONE, w.x0, GY, z0, w.x1, GY + 0.7, z1);
        b.deco(STONE_DK, w.x0 - 0.03, GY + 0.7, z0 - 0.03, w.x1 + 0.03, GY + 0.78, z1 + 0.03);
        b.deco('metal:#2e3134', w.x0, GY + 1.02, (z0 + z1) / 2 - 0.03, w.x1, GY + 1.08, (z0 + z1) / 2 + 0.03);
        for (const x of [w.x0 + 0.1, w.x1 - 0.1]) b.deco('metal:#2e3134', x - 0.03, GY + 0.78, (z0 + z1) / 2 - 0.03, x + 0.03, GY + 1.05, (z0 + z1) / 2 + 0.03);
      }
      // Its sign on a post beside the stair's mouth, clear of the way in.
      const px = w.up === 'w' ? w.x0 + 0.5 : w.x1 - 0.5, pzc = zc + 0.75;
      b.box('metal:#5f6266', px - 0.06, GY, pzc - 0.06, px + 0.06, GY + 2.9, pzc + 0.06);
      b.sign({ k: 'label', text: walk.ja, sub: walk.en, fg: '#ffffff', bg: '#3f5a4a' }, px + (w.up === 'w' ? -0.08 : 0.08), GY + 2.5, pzc, [w.up === 'w' ? -1 : 1, 0], 1.9, 0.42);
    }
    // The bridge-foot plazas on the east bank: paving, a rail along the drop, a noticeboard.
    for (const s of [-1, 1] as const) {
      const [za, zc] = s > 0 ? [FRONT, 42] : [-42, -FRONT];
      b.slab('tile:#b9ab92', EAST_WALL, Math.min(za, zc), TSB.c - TSB.half - TSB.pave, Math.max(za, zc), GY + 0.002, GY + 0.01, wells, false);
      // A stone rail along the east bank's edge, from the bridge to the plot's edge, open at its stairs.
      const open = stairWells.filter((q) => q.up === 'e' && Math.sign(q.z0) === s).map((q): [number, number] => [Math.min(q.z0, q.z1), Math.max(q.z0, q.z1)]);
      let zf = s > 0 ? BRIDGE_Z : -Z;
      for (const [p, q] of [...open, (s > 0 ? [Z, Z] : [-BRIDGE_Z, -BRIDGE_Z]) as [number, number]].sort((m, n) => m[0] - n[0])) {
        if (p - zf > 0.3) {
          b.block(EAST_WALL + 0.1, GY, zf, EAST_WALL + 0.4, GY + 1.1, p);
          b.deco(STONE, EAST_WALL + 0.05, GY, zf, EAST_WALL + 0.45, GY + 0.35, p);
          b.deco('metal:#2e3134', EAST_WALL + 0.22, GY + 0.95, zf, EAST_WALL + 0.28, GY + 1.02, p);
        }
        zf = q;
      }
      b.zone('street', EAST_WALL, GY - 0.2, Math.min(za, zc), TSB.c - TSB.half - TSB.pave, GY + 8, Math.max(za, zc), '紬橋東詰 橋詰広場', 'Tsumugi-bashi east foot', true);
    }
  });

  if (!BARE) {
  // ═════════════════════════ The footbridge 紬橋歩道橋 ═════════════════════════
  {
    const K = TSUMUGIKIT, way: Named = { ja: '紬橋歩道橋', en: 'Tsumugibashi Footbridge' };
    const SPX = K.span.w, I = FB, O = FB + DW, deckBox = (x0: number, z0: number, x1: number, z1: number) => b.block(x0, DECK - 0.25, z0, x1, DECK, z1);
    // The square: decks across Yanagi-suji north and south of the avenue, and across the avenue east and west of it.
    for (const s of [-1, 1] as const) {
      // Over Yanagi-suji (along x), z from s·I to s·O.
      const zEdge = s > 0 ? I : -O;
      deckBox(-I, zEdge, I, zEdge + DW);
      for (let x = -I + SPX / 2; x < I; x += SPX) b.model('tsumugikit', 'span', x, GY, zEdge, 0);
      for (const x of [-YAN.half - 1.5, YAN.half + 1.5]) b.model('tsumugikit', 'pier', x, GY, zEdge, 0), b.block(x - 0.25, GY, zEdge + 0.25, x + 0.25, DECK - 1.1, zEdge + DW - 0.25);
      // Over the avenue (along z), x from s·I to s·O.
      const xEdge = s > 0 ? O : -I;
      deckBox(Math.min(s * I, s * O), -I, Math.max(s * I, s * O), I);
      for (let z = -I + SPX / 2; z < I; z += SPX) b.with({ rot: 1, t: [xEdge, 0, z] }, () => b.model('tsumugikit', 'span', 0, GY, 0, 0));
      for (const z of [-RW - 1.2, RW + 1.2]) b.with({ rot: 1, t: [xEdge, 0, z] }, () => b.model('tsumugikit', 'pier', 0, GY, 0, 0)), b.block(Math.min(s * I, s * O) + 0.25, GY, z - 0.25, Math.max(s * I, s * O) - 0.25, DECK - 1.1, z + 0.25);
      // Its name on the deck's fascia, facing the traffic each way.
      for (const n of [-1, 1] as const) {
        b.sign({ k: 'label', text: way.ja, sub: way.en, fg: '#ffffff', bg: '#2c5e63' }, 0, DECK - 0.6, zEdge + (n > 0 ? DW + 0.22 : -0.22), [0, n], 7, 0.5);
        b.sign({ k: 'label', text: way.ja, sub: way.en, fg: '#ffffff', bg: '#2c5e63' }, s * (I + DW / 2) + n * (DW / 2 + 0.22), DECK - 0.6, 0, [n, 0], 7, 0.5);
      }
    }
    // The corners; the arm east towards the Exchange from the south-east one.
    const ARM = O + 2 * SPX;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const x0 = sx > 0 ? I : -O, z0 = sz > 0 ? I : -O;
      deckBox(x0, z0, x0 + DW, z0 + DW);
      b.model('tsumugikit', 'cap', x0 + DW / 2, GY, z0, 0);
      for (const lx of [x0 + 0.4, x0 + DW - 0.4]) for (const lz of [z0 + 0.4, z0 + DW - 0.4]) b.block(lx - 0.22, GY, lz - 0.22, lx + 0.22, DECK - 1.05, lz + 0.22);
    }
    deckBox(O, I, ARM, O);
    for (let x = O + 3.2; x < ARM; x += 6.4) b.model('tsumugikit', 'span', Math.min(x, ARM - 3.2), GY, I, 0);
    deckBox(ARM, I, ARM + DW, O);
    b.model('tsumugikit', 'cap', ARM + DW / 2, GY, I, 0);
    for (const lx of [ARM + 0.4, ARM + DW - 0.4]) for (const lz of [I + 0.4, O - 0.4]) b.block(lx - 0.22, GY, lz - 0.22, lx + 0.22, DECK - 1.05, lz + 0.22);
    // Stairs: north from the two north corners, south from the south-west one, east from the arm's end.
    const RUN = 11;
    /** An open steel flight climbing +x in the current frame: treads on teal stringers, a solid panel and a rail each side. */
    const steelStair = (o: { x0: number; x1: number; z0: number; z1: number }) => {
      const rise = DECK - GY, n = Math.max(2, Math.round(rise / 0.165)), tread = (o.x1 - o.x0) / n, riser = rise / n;
      b.ramp(o.x0, o.z0, o.x1, o.z1, GY, DECK, [1, 0]);
      for (let i = 0; i < n; i++) {
        const xa = o.x0 + i * tread, top = GY + (i + 1) * riser;
        b.deco('flat:#9d9a92', xa, top - 0.06, o.z0, xa + tread + 0.02, top, o.z1);
        b.deco('flat:#d9a400', xa + tread - 0.04, top - 0.01, o.z0, xa + tread, top + 0.004, o.z1);
        for (const [za, zc] of [[o.z0 - 0.12, o.z0], [o.z1, o.z1 + 0.12]]) {
          b.deco(TEAL, xa, top - 0.5, za, xa + tread + 0.01, top + 0.62, zc);
          b.deco('flat:#2c5e63', xa, top + 1.06, za, xa + tread + 0.01, top + 1.12, zc);
          b.block(xa, top, za, xa + tread, top + 1.1, zc);
        }
      }
      // A post under the middle of each stringer.
      const xm = (o.x0 + o.x1) / 2, ym = GY + rise / 2 - 0.5;
      for (const z of [o.z0 - 0.06, o.z1 + 0.06]) {
        b.deco(TEAL, xm - 0.12, GY, z - 0.12, xm + 0.12, ym, z + 0.12);
        b.block(xm - 0.12, GY, z - 0.12, xm + 0.12, ym, z + 0.12);
      }
    };
    b.with({ rot: 1 }, () => steelStair({ x0: -O - RUN, x1: -O, z0: I + 0.3, z1: O - 0.3 })); // north-west
    b.with({ rot: 1 }, () => steelStair({ x0: -O - RUN, x1: -O, z0: -O + 0.3, z1: -I - 0.3 })); // north-east
    b.with({ rot: 3 }, () => steelStair({ x0: -O - RUN, x1: -O, z0: -O + 0.3, z1: -I - 0.3 })); // south-west
    b.with({ rot: 2 }, () => steelStair({ x0: -(ARM + DW + RUN), x1: -(ARM + DW), z0: -O + 0.3, z1: -I - 0.3 })); // the arm
    // Parapets on the open sides (colliders; the models draw the spans' own), rails round the corners.
    const rail = (x0: number, z0: number, x1: number, z1: number) => {
      b.block(x0, DECK, z0, x1, DECK + 1.15, z1);
      b.deco(TEAL, x0, DECK, z0, x1, DECK + 0.6, z1);
      b.deco('flat:#2c5e63', x0, DECK + 1.08, z0, x1, DECK + 1.16, z1);
    };
    for (const s of [-1, 1] as const) {
      // Along each deck's two long sides (the inner side runs between the corners; the outer the same).
      for (const z of s > 0 ? [I, O] : [-O, -I]) b.block(-I, DECK, z - 0.06, I, DECK + 1.15, z + 0.06);
      for (const x of s > 0 ? [I, O] : [-O, -I]) b.block(x - 0.06, DECK, -I, x + 0.06, DECK + 1.15, I);
    }
    const LZ = I + DW / 2, LH = 1.15; // the lifts' middle along the deck edge, their shafts' half width
    rail(-O - 0.08, -O, -O, -I); // north-west: the west side; beside its stair
    rail(-O, -O - 0.08, -O + 0.3, -O);
    rail(-I - 0.3, -O - 0.08, -I, -O);
    rail(I, -O - 0.08, I + 0.3, -O); // north-east: beside its stair; beside its lift
    rail(O - 0.3, -O - 0.08, O, -O);
    rail(O, -O, O + 0.08, -LZ - LH);
    rail(O, -LZ + LH, O + 0.08, -I);
    rail(-O, O, -O + 0.3, O + 0.08); // south-west: beside its stair; beside its lift
    rail(-I - 0.3, O, -I, O + 0.08);
    rail(-O - 0.08, I, -O, LZ - LH);
    rail(-O - 0.08, LZ + LH, -O, O);
    rail(I, O, ARM, O + 0.08); // south-east and the arm: the south side (the ramp leaves the arm's corner), the north side
    rail(O, I - 0.08, ARM + DW, I);
    rail(ARM + DW, I, ARM + DW + 0.08, I + 0.3); // beside the arm's stair
    rail(ARM + DW, O - 0.3, ARM + DW + 0.08, O);
    // Lifts: outside the north-east corner (doors west) and the south-west one (doors east).
    const levels = [{ y: GY, ja: '地上', en: 'Street' }, { y: DECK, ja: '歩道橋', en: 'Footbridge' }];
    for (const [face, x, z] of [['w', O, -LZ], ['e', -O, LZ]] as [Face, number, number][]) {
      at(face, x, z, () => {
        b.model('tsumugikit', 'lift', 0, GY, 0, 0);
        lift(b, { bare: true, levels });
        signAt(K.lift.pts.sign, { k: 'label', text: 'エレベーター', sub: 'Lift', fg: '#ffffff', bg: '#1f5fae' });
      });
    }
    b.zone('passage', -O, DECK - 0.2, -O, ARM + DW, DECK + 3.4, O, way.ja, way.en, true);

    // ── On from the arm's corner: a ramp south (1 in 11) down to the Silk Exchange's gallery floor, and a
    // glazed link into its second-floor door (exchange.ts EXCH.F2, DOOR2) ──
    {
      const F2 = GY + EXCH.F2, RX0 = ARM, RX1 = ARM + DW, RZ0 = O, RZ1 = FRONT - 1.9;
      const doorX = (TSUMUGI_EXCHANGE.x0 + TSUMUGI_EXCHANGE.x1) / 2;
      if (RX0 > doorX + EXCH.DOOR2[0] || RX1 < doorX + EXCH.DOOR2[1]) throw new Error('tsumugiStreet: the footbridge ramp misses the Exchange\'s second-floor door');
      b.ramp(RX0 + 0.1, RZ0, RX1 - 0.1, RZ1, F2, DECK, [0, -1]);
      const N = Math.ceil((RZ1 - RZ0) / 0.5);
      for (let k = 0; k < N; k++) {
        const za = RZ0 + (k * (RZ1 - RZ0)) / N, zc = RZ0 + ((k + 1) * (RZ1 - RZ0)) / N, y = DECK - ((k + 0.5) / N) * (DECK - F2);
        b.deco('flat:#9d9a92', RX0, y - 0.25, za, RX1, y, zc);
        for (const x of [RX0, RX1]) {
          b.deco(TEAL, x - 0.12, y - 1.05, za, x + 0.12, y - 0.25, zc);
          b.deco(TEAL, x - 0.04, y, za, x + 0.04, y + 0.6, zc);
          b.deco('flat:#2c5e63', x - 0.05, y + 1.06, za, x + 0.05, y + 1.14, zc);
          b.block(x - 0.06, y, za, x + 0.06, y + 1.15, zc);
        }
      }
      for (const z of [RZ0 + 6, RZ0 + 12]) for (const x of [RX0 + 0.4, RX1 - 0.4]) {
        const y = DECK - ((z - RZ0) / (RZ1 - RZ0)) * (DECK - F2) - 1.05;
        b.deco(TEAL, x - 0.2, GY, z - 0.2, x + 0.2, y, z + 0.2);
        b.block(x - 0.2, GY, z - 0.2, x + 0.2, y, z + 0.2);
      }
      // The link: a landing in glass under a teal roof, against the front.
      b.box('flat:#9d9a92', RX0, F2 - 0.25, RZ1, RX1, F2, FRONT);
      for (const x of [RX0, RX1]) {
        b.deco('glassTint', x - 0.03, F2, RZ1, x + 0.03, F2 + 2.5, FRONT);
        b.block(x - 0.06, F2, RZ1, x + 0.06, F2 + 2.5, FRONT);
        for (const z of [RZ1, FRONT - 0.06]) b.deco(TEAL, x - 0.06, F2, z, x + 0.06, F2 + 2.5, z + 0.06);
      }
      b.deco(TEAL, RX0 - 0.1, F2 + 2.5, RZ1 - 0.2, RX1 + 0.1, F2 + 2.65, FRONT);
      b.deco('glassTint', RX0, F2 + 2.45, RZ1, RX1, F2 + 2.5, FRONT);
      b.sign({ k: 'label', text: '紬橋絹取引所 2階', sub: 'Silk Exchange 2F — Gallery / Silk Museum', fg: '#ffffff', bg: '#2c5e63' }, (RX0 + RX1) / 2, F2 + 2.75, RZ1 - 0.22, [0, -1], 3.4, 0.36);
      b.zone('passage', RX0, F2 - 0.2, RZ0, RX1, DECK + 3.4, FRONT, '取引所連絡通路', 'Footbridge link to the Silk Exchange', true);
    }
  }

  // ═════════════════════════ The fronts on Tsumugi-dōri and Yanagi-suji ═════════════════════════
  const takenFront: Rect[] = [];
  // Along the avenue: every block's frontage, west to east; the wholesalers' lane opens off the north side.
  const avenueCorr = (north: boolean): [number, number][] => [bl(KUW), bl(KIN), bl(HAT), bl(YAN), ...(north ? [LANE] : []), [QUAY, TSB.c - TSB.half - TSB.pave], bl(TSB), bl(MAY)];
  for (const north of [true, false]) {
    for (const [a, e] of between(avenueCorr(north))) {
      let x0 = a + 0.3, x1 = e - 0.3;
      if (!north && a >= YAN.c + YAN.half + YAN.pave - 0.1 && e <= QUAY + 0.1) x1 = 26.2; // the Silk Exchange (rotunda.ts) has the rest
      if (north && Math.abs(e - (YAN.c - YAN.half - YAN.pave)) < 0.1) {
        // The police box on the corner of Yanagi-suji.
        const k = PLACES.koban;
        at('s', x1 - k.w / 2, -FRONT, () => place(b, { kind: 'koban', ja: '紬橋交番', en: 'Tsumugibashi' }));
        takenFront.push([x1 - k.w, -FRONT - k.d, x1, -FRONT]);
        x1 -= k.w + 0.6;
      }
      takenFront.push(...fronts(north ? 's' : 'n', north ? -FRONT : FRONT, x0, x1, FRONT_IDS));
    }
  }
  // Along Yanagi-suji, both sides, north and south of the avenue: between the corners' fronts and the side streets.
  for (const sz of [-1, 1] as const) {
    for (const sx of [-1, 1] as const) {
      const line = sx * (YAN.c + YAN.half + YAN.pave), face: Face = sx < 0 ? 'e' : 'w';
      const spans: [number, number, string[]][] = [];
      const first: [number, number] = sz < 0 ? [BACK + 0.3, -FRONT - 20.6] : [FRONT + 20.6, -BACK - 0.3];
      // (South-east: the Exchange stands to z 64.5; north-east: the lane's shops leave 13 m, so the shallow fronts.)
      if (sz > 0 && sx > 0) first[0] = 65.2;
      spans.push([first[0], first[1], sz < 0 && sx > 0 ? SHALLOW : NO_TOWER]);
      spans.push(sz < 0 ? [-Z + 0.6, NEW.z - NEW.half - NEW.pave - 0.3, FRONT_IDS] : [SEW.z + SEW.half + SEW.pave + 0.3, Z - 0.6, FRONT_IDS]);
      for (const [u0, u1, ids] of spans) takenFront.push(...fronts(face, line, u0, u1, ids));
    }
  }

  // ═════════════════════════ 絹問屋横丁, the wholesalers' lane ═════════════════════════
  const reserved: Rect[] = [[26.5, FRONT, 72.5, FRONT + 28]]; // the Silk Exchange (rotunda.ts LOT)
  {
    const K = TSUMUGIKIT, lane: Named = { ja: '絹問屋横丁', en: 'Kinudon’ya Yokochō — Silk Wholesalers’ Lane' };
    const [la, le] = LANE, z0 = -FRONT, z1 = BACK;
    b.deco('tile:#a39a8a', la, GY + 0.002, z1, le, GY + 0.012, z0);
    b.deco('flat:#6f6a60', (la + le) / 2 - 0.1, GY + 0.012, z1, (la + le) / 2 + 0.1, GY + 0.016, z0);
    // The shops from behind the avenue's fronts to Neriginu-dōri, both sides.
    const ids = ['tonya_a', 'tonya_b', 'tonya_c', 'tonya_d', 'tonya_e', 'tonya_f'];
    let n = 0;
    const startZ = -FRONT - 20.6;
    for (const [xf, face] of [[la, 'e'], [le, 'w']] as [number, Face][]) {
      let z = startZ;
      for (let k = 0; ; k++) {
        const id = ids[(k * 5 + (face === 'e' ? 0 : 3)) % ids.length], w = K[id].w;
        if (z - w < z1 + 0.3) break;
        const [ja, en, col] = TONYA[n++ % TONYA.length];
        piece('tsumugikit', K, id, face, xf, z - w / 2, (q) => {
          if (q.pts.name) label(q.pts.name, ja, en, '#f4f1e8', col);
          if (q.pts.vertical) upright(q.pts.vertical, ja.split(' ')[1] ?? ja, col);
        });
        reserved.push(face === 'e' ? [xf - K[id].d, z - w, xf, z] : [xf, z - w, xf + K[id].d, z]);
        z -= w + 0.05;
      }
    }
    // Delivery bicycles and hand trucks on the lane, cartons, a string of banners overhead.
    for (let z = startZ - 3; z > z1 + 3; z -= 7) {
      const x = r() < 0.5 ? la + 0.5 : le - 0.5;
      b.out.models.push({ kind: 'places', id: 'bicycle', pos: b.pt(x, GY, z), yaw: 0, seed: 0, merge: true });
      b.box('flat:#b08a5a', x - 0.3, GY, z + 1.2, x + 0.3, GY + 0.5, z + 1.8);
    }
    for (let z = z0 - 4; z > z1 + 2; z -= 5) {
      b.deco('flat:#1f1f1f', la, GY + 4.8, z - 0.01, le, GY + 4.82, z + 0.01);
      for (let x = la + 0.5; x < le - 0.3; x += 0.9) b.deco('flat:' + ['#7a1f2b', '#1f3f7a', '#efe6cf', '#c9962e'][Math.floor(r() * 4)], x, GY + 4.25, z - 0.01, x + 0.5, GY + 4.8, z + 0.01);
    }
    // A gate at each end.
    for (const [z, f] of [[z0 - 0.4, 'n'], [z1 + 0.4, 's']] as [number, Face][]) {
      piece('tsumugikit', K, 'lanegate', f, (la + le) / 2, z, (q) => {
        label(q.pts.name_f, lane.ja, lane.en, '#f4f1e8', '#2c5e63');
        label(q.pts.name_b, lane.ja, lane.en, '#f4f1e8', '#2c5e63');
      }, false);
      for (const sx of [-1, 1]) b.block((la + le) / 2 + sx * 2.8 - 0.15, GY, z - 0.15, (la + le) / 2 + sx * 2.8 + 0.15, GY + 5.6, z + 0.15);
    }
    reserved.push([la, z1, le, z0]);
    b.zone('street', la, GY - 0.2, z1, le, GY + 9, z0, '絹問屋横丁', 'Kinudon’ya Yokochō', true);
  }

  // ═════════════════════════ The east bank: canal-backed buildings with terraces and cafés ═════════════════════════
  {
    const K = TSUMUGIKIT, line = TSB.c - TSB.half - TSB.pave, terrace: Named = { ja: '紬堀テラス', en: 'Tsumugibori Terrace' };
    let ny = 0, nc = 0;
    for (const s of [-1, 1] as const) {
      const runs: [number, number][] = s > 0 ? [[42.3, PASS_Z - PASS_W], [PASS_Z + PASS_W, Z - 0.6]] : [[-Z + 0.6, -PASS_Z - PASS_W], [-PASS_Z + PASS_W, -42.3]];
      const wallGaps: [number, number][] = [];
      for (const [u0, u1] of runs) {
        const row = packFront(u1 - u0, SHALLOW);
        const total = row.reduce((t, id) => t + TSUMUGIFRONT[id].w, 0);
        const gap = row.length ? (u1 - u0 - total) / (row.length + 1) : 0;
        let u = u0 + gap;
        wallGaps.push([u0, u]);
        for (const id of row) {
          const a = TSUMUGIFRONT[id], zc = u + a.w / 2;
          const [tja, ten] = TERRACES[ny++ % TERRACES.length], [cja, cen, cbg] = CAFES[nc++ % CAFES.length];
          piece('tsumugifront', TSUMUGIFRONT, id, 'e', line, zc, (q) => {
            letter(id, q.pts);
            if (q.pts.cafe) label(q.pts.cafe, cja, cen, '#2a2019', '#f3e3c0');
            // The terrace off its back at the second floor, over the riverside walk.
            const tp = q.pts.terrace, yid = a.w >= 19 ? 'yuka_l' : a.w >= 14 ? 'yuka' : 'yuka_s', Y = K[yid];
            b.with({ rot: 2, t: [0, 0, tp[2]] }, () => {
              b.model('tsumugikit', yid, 0, GY + tp[1], 0, 0);
              b.block(-Y.w / 2, GY + tp[1] - 0.3, Y.pts.name[2] + 0.1, Y.w / 2, GY + tp[1], 0);
              const p = Y.pts.name;
              b.sign({ k: 'label', text: tja, sub: ten, fg: '#f3e3c0', bg: '#2a2019' }, p[0], p[1] + GY + tp[1], p[2], [p[5], p[6]], p[3], p[4]);
            });
            void cbg;
          });
          // The café's seats out on the walk.
          b.with({ rot: 3, t: [EAST_WALL, 0, zc] }, () => {
            b.model('tsumugikit', nc % 2 ? 'walkseat' : 'walkseat_b', a.w / 4, PROM, 0, 0);
            b.block(a.w / 4 - 1.3, PROM, -1.3, a.w / 4 + 1.8, PROM + 0.8, -0.2);
          });
          takenFront.push([line - a.d, u, line, u + a.w]);
          u += a.w + gap;
          wallGaps.push([u - gap, u]);
        }
      }
      // The old bank's face where no walk storey covers it (between the buildings).
      b.open(() => { for (const [p, q] of wallGaps) if (q - p > 0.05) b.deco(STONE_DK, EAST_WALL - 0.02, PROM - 0.4, p, EAST_WALL + 0.5, GY, q); });
      // The passage down to the riverside walk: a gate, paving, lanterns overhead, planters.
      const pz: [number, number] = [s * PASS_Z - PASS_W, s * PASS_Z + PASS_W];
      const [pa, pc] = [Math.min(...pz), Math.max(...pz)];
      b.deco('tile:#a39a8a', EAST_WALL + 3.8, GY + 0.002, pa, line, GY + 0.012, pc);
      b.deco('flat:#6f6a60', EAST_WALL + 3.8, GY + 0.012, s * PASS_Z - 0.1, line, GY + 0.016, s * PASS_Z + 0.1);
      piece('tsumugikit', K, 'passgate', 'e', line - 0.3, s * PASS_Z, (q) => {
        label(q.pts.name_f, terrace.ja, `${terrace.en} · Riverside Walk`, '#2a2019', '#f3e3c0');
        label(q.pts.name_b, terrace.ja, `${terrace.en} · Riverside Walk`, '#2a2019', '#f3e3c0');
      }, false);
      for (const z of [pa + 0.15, pc - 0.15]) b.block(line - 0.45, GY, z - 0.15, line - 0.15, GY + 3.6, z + 0.15);
      for (let x = EAST_WALL + 5; x < line - 1.5; x += 2.2) {
        b.deco('flat:#1f1f1f', x - 0.01, GY + 3.4, pa + 0.2, x + 0.01, GY + 3.42, pc - 0.2);
        b.mesh('flat:#c8102e', 'cyl', x, GY + 3.1, s * PASS_Z, 0.16, 0.36, 0.16);
      }
      for (const z of [pa + 0.45, pc - 0.45]) for (const x of [EAST_WALL + 5.5, line - 2.5]) {
        roadModel(b, 'planter', x, GY, z, [0, 1]);
        b.block(x - 0.9, GY, z - 0.4, x + 0.9, GY + 0.9, z + 0.4);
      }
      b.zone('street', EAST_WALL, GY - 0.2, pa, line, GY + 8, pc, '紬堀への路地', 'Lane to the riverside walk', true);
    }
  }

  // ═════════════════════════ Behind the fronts: stock rows, places, what is left over ═════════════════════════
  const interiors: Rect[] = [];
  {
    const westBlocks = between([bl(KUW), bl(KIN), bl(HAT), bl(YAN)], -X, YAN.c);
    const eastBlocks: [number, number][] = [[YAN.c + YAN.half + YAN.pave, QUAY]];
    for (const sz of [-1, 1] as const) {
      const fz0 = sz < 0 ? BACK : FRONT, fz1 = sz < 0 ? -FRONT : -BACK; // the front band
      const bz0 = sz < 0 ? -Z : SEW.z + SEW.half + SEW.pave, bz1 = sz < 0 ? NEW.z - NEW.half - NEW.pave : Z; // the back band
      const sideFace: Face = sz < 0 ? 'n' : 's', backFace: Face = sz < 0 ? 's' : 'n';
      for (const [a, e] of [...westBlocks, ...eastBlocks]) {
        interiors.push([a, fz0, e, fz1], [a, bz0, e, bz1]);
        const yanW = Math.abs(e - (YAN.c - YAN.half - YAN.pave)) < 0.1, yanE = Math.abs(a - (YAN.c + YAN.half + YAN.pave)) < 0.1;
        const xa = yanE ? a + (sz < 0 ? 13.8 : 20.8) : a + 0.3, xe = yanW ? e - 20.8 : e - 0.3;
        // The side street's own row behind the avenue's fronts, and the back band's rows.
        let from = xa;
        if (sz > 0 && Math.abs(a - KIN.c - KIN.half - KIN.pave) < 0.1) {
          // A convenience store on the corner of Kinuyamachi-suji and Shiroginu-dōri.
          const k = KONBINI.corner;
          at('s', from + k.w / 2, SEW.z - SEW.half - SEW.pave, () => konbini(b, { type: 'corner', chain: 'hinode' }));
          reserved.push([from, SEW.z - SEW.half - SEW.pave - k.d, from + k.w, SEW.z - SEW.half - SEW.pave]);
          from += k.w + 0.8;
        }
        if (sz > 0 && Math.abs(e - (YAN.c - YAN.half - YAN.pave)) < 0.1) {
          // Tsumugi Inari, on Shiroginu-dōri.
          const p = PLACES.shrine;
          at('s', xe - p.w / 2 - 0.5, SEW.z - SEW.half - SEW.pave, () => place(b, { kind: 'shrine', ja: '紬稲荷神社', en: 'Tsumugi Inari Shrine' }));
          reserved.push([xe - p.w - 0.5, SEW.z - SEW.half - SEW.pave - p.d, xe - 0.5, SEW.z - SEW.half - SEW.pave]);
        }
        const isLaneBlock = sz < 0 && yanE;
        if (!isLaneBlock && !(sz > 0 && yanE)) {
          const zFar = sz < 0 ? -FRONT - 21.2 : FRONT + 21.2;
          const [r0, r1] = sz < 0 ? [fz0 + 0.3, zFar] : [zFar, fz1 - 0.3];
          // Half the band's depth for the side street's row; the leftover filler takes the middle.
          const mid = (r0 + r1) / 2;
          if (sz < 0) fillRect(from, r0, xe, mid - 0.4, sideFace, SMALL);
          else fillRect(from, mid + 0.4, sz > 0 && yanW ? xe - PLACES.shrine.w - 1.2 : xe, r1, sideFace, SMALL);
        } else if (sz > 0 && yanE) {
          // Behind the Silk Exchange: the side street's row.
          fillRect(a + 21.2, 65.2, e - 0.3, fz1 - 0.3, sideFace, SMALL);
        } else {
          // The lane's block: the strips behind its shops face Neriginu-dōri.
          fillRect(LANE[1] + TSUMUGIKIT.tonya_a.d + 0.4, fz0 + 0.3, e - 0.3, -FRONT - 21.2, sideFace, LOW);
        }
        const [ba, be] = [yanE ? a + 20.8 : a + 0.3, yanW ? e - 20.8 : e - 0.3];
        if (sz < 0) fillRect(ba, bz0 + 0.15, be, bz1 - 0.3, backFace, BIZ);
        else fillRect(ba, bz0 + 0.3, be, bz1 - 0.15, backFace, BIZ);
      }
    }
    // East of the canal: rows on Tsumugibori-suji and Mayumachi-suji behind the avenue's fronts.
    for (const [a, e] of between([bl(TSB), bl(MAY)], TSB.c - TSB.half - TSB.pave, X)) {
      for (const sz of [-1, 1] as const) {
        const [z0, z1] = sz < 0 ? [-Z + 0.15, -FRONT - 21.2] : [FRONT + 21.2, Z - 0.15];
        interiors.push([a, Math.min(z0, z1), e, Math.max(z0, z1)]);
        fillRect(a + 0.3, z0, a + (e - a) / 2 - 0.4, z1, 'w', BIZ);
        if (e < X - 1) fillRect(a + (e - a) / 2 + 0.4, z0, e - 0.3, z1, 'e', SMALL);
        else fillRect(a + (e - a) / 2 + 0.4, z0, e - 0.6, z1, 'w', SMALL);
      }
    }
  }

  // ── What is left over inside the blocks: no bare ground. Big: a coin car park, a pocket park; middling:
  // a row of tiny shops with a lane, a bicycle park, a service yard; narrow: a dressed back lane. ──
  leftovers(b, r, interiors, reserved, holes, { park: [{ ja: '絹屋町児童遊園', en: 'Kinuyamachi Children’s Park' }, { ja: '紬堀ひろば', en: 'Tsumugibori Square' }] }, piece);

  // ═════════════════════════ At the kerb: the metro's pylons, drinks machines ═════════════════════════
  {
    const P = KITACITY.pylon.pts;
    for (const q of exits) {
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
    // Drinks machines along the quay walk's back and on the lane.
    for (const z of [-60, 70, 120]) for (let k = 0; k < 2; k++) vending(b, QUAY + 0.5, GY, z + k * 1.05, [1, 0], k ? 'vending2' : 'vending', 'new');
  }

  // ═════════════════════════ Past the plot's edge ═════════════════════════
  pastEdge(b, r, fillRect, spec);
  }
  void SL;
}

/**
 * Every free patch inside the blocks, found after the buildings are placed, put to the use a
 * Japanese city would make of it (as at Kita-Ōdōri, hub-street.ts).
 */
export function leftovers(
  b: Builder, r: () => number, interiors: Rect[], reserved: Rect[], holes: Rect[], names: { park: Named[] },
  piece: (kind: string, A: Anchors, id: string, face: Face, x: number, z: number, fn?: (a: Anchor) => void, solid?: boolean) => void,
) {
  const solid = b.out.boxes.filter((q) => q.solid && q.min[1] < GY + 1.2 && q.max[1] > GY + 0.4);
  let n = 0, parks = 0;
  const laneDress = (x0: number, z0: number, w: number, d: number) => {
    const alongX = w >= d, len = alongX ? w : d, wid = alongX ? d : w;
    const P = (u: number, v: number): V2 => (alongX ? [x0 + u, z0 + v] : [x0 + v, z0 + u]);
    const R = (mat: string, u0: number, v0: number, u1: number, v1: number, y0: number, y1: number, hard = false) => {
      const [ax, az] = P(u0, v0), [cx, cz] = P(u1, v1);
      (hard ? b.box : b.deco).call(b, mat, Math.min(ax, cx), y0, Math.min(az, cz), Math.max(ax, cx), y1, Math.max(az, cz));
    };
    R('flat:#5d5852', 0, 0, len, wid, GY + 0.002, GY + 0.011);
    R('flat:#3f3b37', 0, wid / 2 - 0.08, len, wid / 2 + 0.08, GY + 0.011, GY + 0.015);
    for (let u = 3; u < len - 2; u += 7) {
      const k = Math.floor(r() * 4);
      if (k === 0) R('flat:#c8b23a', u, 0.15, u + 0.9, 0.5, GY, GY + 0.3 + Math.floor(r() * 3) * 0.3, true);
      else if (k === 1) R('flat:#c9c8c0', u, 0.1, u + 0.9, 0.45, GY, GY + 0.7, true);
      else if (k === 2) R('flat:#4f7a8a', u, wid - 0.75, u + 1.2, wid - 0.15, GY, GY + 1.0, true);
      else {
        const [px, pz] = P(u, wid - 0.4), dd = b.dir(alongX ? [1, 0] : [0, 1]);
        b.out.models.push({ kind: 'places', id: 'bicycle', pos: b.pt(px, GY, pz), yaw: Math.atan2(-dd[0], -dd[1]), seed: 0, merge: true });
      }
    }
    for (let u = 5; u < len - 3; u += 14) {
      const [px, pz] = P(u, 0.25);
      streetLamp(b, 'lamp_small', px, pz, alongX ? [0, 1] : [1, 0]);
    }
  };
  const coinPark = (x0: number, z0: number, w: number, d: number) => {
    b.deco('asphalt', x0, GY, z0, x0 + w, GY + 0.012, z0 + d);
    b.deco('flat:#e9e9e4', x0, GY + 0.012, z0, x0 + w, GY + 0.016, z0 + 0.12);
    const rows = d >= 17 ? 2 : 1;
    for (let k = 0; k < rows; k++) {
      const zb = k ? z0 + 0.4 : z0 + d - 5.6, zt = zb + 5.2;
      for (let x = x0 + 0.5; x + 2.5 <= x0 + w - 0.4; x += 2.6) {
        for (const xl of [x, x + 2.5]) b.deco('flat:#e9e9e4', xl, GY + 0.012, zb, xl + 0.1, GY + 0.016, zt);
        b.deco('flat:#d6a21a', x + 0.5, GY + 0.012, (k ? zb + 1.1 : zt - 1.3), x + 2.1, GY + 0.12, (k ? zb + 1.3 : zt - 1.1));
        if (r() < 0.45) {
          const id = CARS[Math.floor(r() * CARS.length)], [len, wid, hgt] = VEH[id.split('_')[0]];
          const zc = (zb + zt) / 2;
          roadModel(b, id, x + 1.3, GY, zc, [0, k ? -1 : 1]);
          b.block(x + 1.3 - wid / 2, GY, zc - len / 2, x + 1.3 + wid / 2, GY + hgt, zc + len / 2);
        }
      }
    }
    b.box('flat:#f2c230', x0 + 0.3, GY, z0 + 0.3, x0 + 0.9, GY + 1.4, z0 + 0.8);
    b.box('flat:#5f6266', x0 + 1.2, GY, z0 + 0.3, x0 + 1.3, GY + 3.2, z0 + 0.4);
    for (const f of [-1, 1] as const) b.sign({ k: 'label', text: 'P', sub: '24h コインパーキング', fg: '#fff', bg: '#1f5fa8' }, x0 + 1.25, GY + 2.7, z0 + 0.35 + f * 0.06, [0, f], 1.1, 0.9);
    if (w > 9) vending(b, x0 + 2.4, GY, z0 + 0.5, [0, 1], 'vending2', 'new');
  };
  const bikeYard = (x0: number, z0: number, w: number, d: number) => {
    const alongX = w >= d, len = alongX ? w : d, wid = alongX ? d : w;
    b.deco('flat:#8f8a80', x0, GY + 0.002, z0, x0 + w, GY + 0.011, z0 + d);
    const dd = b.dir(alongX ? [0, 1] : [1, 0]);
    for (const v of wid > 6.5 ? [1.2, wid - 1.2] : [1.2]) {
      for (let u = 1; u < len - 0.8 && u < 30; u += 0.62) {
        if (r() < 0.25) continue;
        const [px, pz] = alongX ? [x0 + u, z0 + v] : [x0 + v, z0 + u];
        b.out.models.push({ kind: 'places', id: 'bicycle', pos: b.pt(px, GY, pz), yaw: Math.atan2(-dd[0], -dd[1]), seed: 0, merge: true });
      }
      const [ax, az] = alongX ? [x0 + 0.8, z0 + v - 0.9] : [x0 + v - 0.9, z0 + 0.8], [cx, cz] = alongX ? [x0 + Math.min(len, 30) - 0.6, z0 + v + 0.9] : [x0 + v + 0.9, z0 + Math.min(len, 30) - 0.6];
      b.block(ax, GY, az, cx, GY + 1.0, cz);
    }
    b.box('flat:#5f6266', x0 + 0.3, GY, z0 + 0.3, x0 + 0.4, GY + 2.6, z0 + 0.4);
    for (const f of [-1, 1] as const) b.sign({ k: 'label', text: '駐輪場', sub: 'Bicycle parking', fg: '#fff', bg: '#1f5fa8' }, x0 + 0.35, GY + 2.2, z0 + 0.35 + f * 0.06, [0, f], 1.2, 0.6);
  };
  const yard = (x0: number, z0: number, w: number, d: number) => {
    b.deco('flat:#8f8a80', x0, GY + 0.002, z0, x0 + w, GY + 0.011, z0 + d);
    const alongX = w >= d;
    const [len, wid, hgt] = VEH.van;
    if (alongX) {
      roadModel(b, 'van', x0 + 3.2, GY, z0 + d / 2, [1, 0]);
      b.block(x0 + 3.2 - len / 2, GY, z0 + d / 2 - wid / 2, x0 + 3.2 + len / 2, GY + hgt, z0 + d / 2 + wid / 2);
      b.box('metal:#8d9399', x0 + 0.2, GY, z0 + d - 0.12, x0 + w - 0.2, GY + 1.8, z0 + d - 0.06);
      for (let x = x0 + 7; x < x0 + w - 1.4 && x < x0 + 16; x += 1.4) b.box(['flat:#4f7a8a', 'flat:#3f6b3a', 'flat:#6b6f72'][Math.floor(r() * 3)], x, GY, z0 + 0.2, x + 1.2, GY + 1.0, z0 + 0.85);
    } else {
      roadModel(b, 'van', x0 + w / 2, GY, z0 + 3.2, [0, 1]);
      b.block(x0 + w / 2 - wid / 2, GY, z0 + 3.2 - len / 2, x0 + w / 2 + wid / 2, GY + hgt, z0 + 3.2 + len / 2);
      b.box('metal:#8d9399', x0 + w - 0.12, GY, z0 + 0.2, x0 + w - 0.06, GY + 1.8, z0 + d - 0.2);
      for (let z = z0 + 7; z < z0 + d - 1.4 && z < z0 + 16; z += 1.4) b.box(['flat:#4f7a8a', 'flat:#3f6b3a', 'flat:#6b6f72'][Math.floor(r() * 3)], x0 + 0.2, GY, z, x0 + 0.85, GY + 1.0, z + 1.2);
    }
  };
  const shopLane = (x0: number, z0: number, w: number, d: number) => {
    const SD = KITAARCADE.sa.d, SW = KITAARCADE.sa.w;
    if (w >= d) {
      for (let x = x0 + 0.2, k = n; x + SW <= x0 + w - 0.2; x += SW + 0.05, k++) piece('kitaarcade', KITAARCADE, `s${'abcde'[k % 5]}`, 's', x + SW / 2, z0 + SD);
      laneDress(x0, z0 + SD, w, d - SD);
    } else {
      for (let z = z0 + 0.2, k = n; z + SW <= z0 + d - 0.2; z += SW + 0.05, k++) piece('kitaarcade', KITAARCADE, `s${'abcde'[k % 5]}`, 'e', x0 + SD, z + SW / 2);
      laneDress(x0 + SD, z0, w - SD, d);
    }
  };
  const FR: Record<Face, { rot?: 0 | 1 | 2 | 3 }> = { n: {}, s: { rot: 2 }, e: { rot: 1 }, w: { rot: 3 } };
  for (const [bx0, bz0, bx1, bz1] of interiors) {
    const W = Math.floor(bx1 - bx0), D = Math.floor(bz1 - bz0);
    if (W < 3 || D < 3) continue;
    const occ = new Uint8Array(W * D);
    const fill = (x0: number, z0: number, x1: number, z1: number) => {
      for (let j = Math.max(0, Math.floor(z0 - bz0)); j < Math.min(D, Math.ceil(z1 - bz0)); j++) {
        for (let i = Math.max(0, Math.floor(x0 - bx0)); i < Math.min(W, Math.ceil(x1 - bx0)); i++) occ[j * W + i] = 1;
      }
    };
    for (const q of solid) if (q.max[0] > bx0 && q.min[0] < bx1 && q.max[2] > bz0 && q.min[2] < bz1) fill(q.min[0] - 0.2, q.min[2] - 0.2, q.max[0] + 0.2, q.max[2] + 0.2);
    for (const q of reserved) fill(q[0], q[1], q[2], q[3]);
    for (const q of holes) fill(q[0] - 3, q[1] - 3, q[2] + 3, q[3] + 3);
    for (let iter = 0; iter < 16; iter++) {
      const hgt = new Int32Array(W);
      let best = { a: 0, x: 0, z: 0, w: 0, d: 0 };
      for (let j = 0; j < D; j++) {
        for (let i = 0; i < W; i++) hgt[i] = occ[j * W + i] ? 0 : hgt[i] + 1;
        const stack: number[] = [];
        for (let i = 0; i <= W; i++) {
          const cur = i < W ? hgt[i] : 0;
          while (stack.length && hgt[stack[stack.length - 1]] >= cur) {
            const top = stack.pop()!, left = stack.length ? stack[stack.length - 1] + 1 : 0, w = i - left, d = hgt[top];
            const score = w * d * (Math.min(w, d) >= 3 ? 1 : 0) + Math.min(w, d);
            if (Math.min(w, d) >= 3 && score > best.a) best = { a: score, x: left, z: j - d + 1, w, d };
          }
          stack.push(i);
        }
      }
      if (best.w * best.d < 18) break;
      let { w, d } = best;
      const x0 = bx0 + best.x, z0 = bz0 + best.z, short = Math.min(w, d), long = Math.max(w, d);
      if (short >= 12 && long >= 14) {
        if (parks < names.park.length && w >= PLACES.park.w + 1 && d >= PLACES.park.d + 1 && n % 3 === 1) {
          ({ w, d } = PLACES.park);
          b.with({ ...FR.n, t: [x0 + w / 2, 0, z0] }, () => place(b, { kind: 'park', ...names.park[parks] }));
          parks++;
        } else {
          w = Math.min(w, 24);
          d = Math.min(d, 22);
          coinPark(x0 + 0.3, z0 + 0.3, w - 0.6, d - 0.6);
        }
      } else if (short >= 9.5) shopLane(x0, z0, w, d);
      else if (short >= 5) (n % 2 ? bikeYard : yard)(x0 + 0.2, z0 + 0.2, w - 0.4, d - 0.4);
      else laneDress(x0, z0, w, d);
      fill(x0, z0, x0 + w, z0 + d);
      n++;
    }
  }
}

/**
 * Past the plot's edge every street runs on between rows of simplified buildings, with a cross
 * street half way; Yanagi-suji is the boulevard to Kita-Ōdōri and Hyōtanbori (surface.ts), and the
 * canal runs on with its banks and walks. North and south only 150 m: the neighbours' own streets
 * come the other way.
 */
function pastEdge(b: Builder, r: () => number, fillRect: (x0: number, z0: number, x1: number, z1: number, face: Face, kinds: string[], lo?: boolean) => void, spec: SurfaceSpec) {
  void r;
  const BIZ = ['office', 'zakkyo', 'manshon'];
  const OUT_NS = 150, OUT_EW = 200, CW = 3.5;
  type Edge = { c: number; half: number; pave: number; wide: boolean; tree?: TreeKind; oneWay?: boolean };
  const roadOut = (alongZ: boolean, s: 1 | -1, q: Edge, OUT: number) => {
    const lim = alongZ ? Z : X, u0 = s > 0 ? lim : -lim - OUT, u1 = u0 + OUT;
    const R = (mat: string, v0: number, v1: number, y0: number, y1: number, a = u0, e = u1) => (alongZ ? b.deco(mat, q.c + v0, y0, a, q.c + v1, y1, e) : b.deco(mat, a, y0, q.c + v0, e, y1, q.c + v1));
    R('asphalt', -q.half, q.half, -0.03, 0.004);
    for (const k of [-1, 1]) R('paver', Math.min(k * q.half, k * (q.half + q.pave)), Math.max(k * q.half, k * (q.half + q.pave)), -0.03, GY);
    if (q.wide) R('flat:#e6a700', -0.08, 0.08, 0.004, 0.01);
    for (let u = u0 + 2; u + 3 < u1; u += 6) {
      if (q.wide) for (const k of [-1, 1]) R('flat:#e9e9e4', k * q.half / 2 - 0.07, k * q.half / 2 + 0.07, 0.004, 0.01, u, u + 3);
      else if (!q.oneWay) R('flat:#e9e9e4', -0.07, 0.07, 0.004, 0.01, u, u + 3);
    }
    // A one-way street keeps its edge lines across the edge, as inside.
    if (q.oneWay) for (const k of [-1, 1]) R('flat:#e9e9e4', k * (q.half - 0.6) - 0.05, k * (q.half - 0.6) + 0.05, 0.004, 0.01);
    for (let u = u0 + 12, k = 0; u < u1 - 6; u += 26, k++) {
      const side = k % 2 ? 1 : -1, v = side * (q.half + 0.8);
      const [px, pz] = alongZ ? [q.c + v, u] : [u, q.c + v];
      roadModel(b, q.wide ? 'lamp_led' : 'lamp_small', px, GY, pz, alongZ ? [-side, 0] : [0, -side]);
      if (q.tree) for (const kk of [-1, 1]) {
        const [tx, tz] = alongZ ? [q.c + kk * (q.half + 1.5), u + 9] : [u + 9, q.c + kk * (q.half + 1.5)];
        modelTree(b, q.tree, tx, tz, 'b', GY, false);
      }
    }
  };
  const pack = (alongZ: boolean, s: 1 | -1, a: number, e: number, OUT: number) => {
    const lim = alongZ ? Z : X, mid = (a + e) / 2, CROSS = OUT / 2;
    for (const [d0, d1] of [[0.15, CROSS - CW], [CROSS + CW, OUT]]) {
      const u0 = s > 0 ? lim + d0 : -lim - d1, u1 = s > 0 ? lim + d1 : -lim - d0;
      if (alongZ) {
        fillRect(a + 0.2, u0, mid - 0.4, u1, 'w', BIZ, true);
        fillRect(mid + 0.4, u0, e - 0.2, u1, 'e', BIZ, true);
      } else {
        fillRect(u0, a + 0.2, u1, mid - 0.4, 'n', BIZ, true);
        fillRect(u0, mid + 0.4, u1, e - 0.2, 's', BIZ, true);
      }
    }
    const uc = s > 0 ? lim + CROSS : -lim - CROSS;
    if (alongZ) b.deco('asphalt', a - 20, -0.03, uc - CW, e + 20, 0.004, uc + CW);
    else b.deco('asphalt', uc - CW, -0.03, a - 20, uc + CW, 0.004, e + 20);
  };
  const m0 = b.out.models.length;
  // North and south: the streets west of Kinuyamachi-suji's corridor and east of the canal; the boulevard between.
  for (const s of [-1, 1] as const) {
    for (const q of [KUW, KIN, HAT, TSB, MAY]) roadOut(true, s, { c: q.c, half: q.half, pave: q.pave, wide: !q.way, oneWay: !!q.way, tree: q === KIN ? 'zelkova' : q === TSB ? 'cherry' : undefined }, OUT_NS);
    const corr: [number, number][] = [bl(KUW), bl(KIN), [KIN.c + KIN.half + KIN.pave, EAST_WALL], bl(TSB), bl(MAY)];
    for (const [a, e] of between(corr)) {
      if (a > KIN.c && e < EAST_WALL + 1) continue;
      if (Math.abs(a - EAST_WALL) < 0.1) {
        // The east bank's strip is only 13.5 m deep: one row, facing Tsumugibori-suji, either side of the cross street.
        for (const [d0, d1] of [[0.5, OUT_NS / 2 - 3.5], [OUT_NS / 2 + 3.5, OUT_NS]]) fillRect(a + 0.2, s > 0 ? Z + d0 : -Z - d1, e - 0.2, s > 0 ? Z + d1 : -Z - d0, 'e', BIZ, true);
        continue;
      }
      pack(true, s, a, e, OUT_NS);
      b.clearScenery(a - 9, s > 0 ? Z : -Z - OUT_NS - 2, e + 9, s > 0 ? Z + OUT_NS + 2 : -Z);
    }
    // The canal runs on: water, walks, quay; the east bank's row of buildings, the west quay's.
    const [u0, u1] = s > 0 ? [Z, Z + OUT_NS] : [-Z - OUT_NS, -Z];
    b.clearScenery(QUAY - 2, u0, EAST_WALL + 2, u1);
    b.open(() => {
    b.deco('water', CX - WH, -2.8, u0, CX + WH, -2.79, u1);
    for (const [xa, xc] of [[WEST_WALL, CX - WH], [CX + WH, EAST_WALL]]) b.deco('tile:#b9ab92', xa, PROM - 0.4, u0, xc, PROM, u1);
    for (const x of [WEST_WALL - 0.4, EAST_WALL]) b.deco(STONE_DK, x, PROM - 0.4, u0, x + 0.4, GY, u1);
    b.deco('tile:#b9ab92', QUAY, -0.03, u0, WEST_WALL - 0.4, GY, u1);
    for (let u = u0 + 6; u < u1 - 3; u += 12) modelTree(b, 'willow', WEST_WALL - 1.6, u, 'b', GY, false);
    });
  }
  // The boulevard along Yanagi-suji, north to Kita-Ōdōri's plot and south to Hyōtanbori's; nothing of it on the canal.
  const mb = b.out.models.length;
  if (spec.boulevard) {
    boulevard(b, spec, FRONT, { to: spec.boulevard.to, from: -Z, P: YAN.half + YAN.pave }, true);
    const south = spec.boulevard.south;
    if (south !== undefined) b.with({ mz: true }, () => boulevard(b, spec, FRONT, { to: -south, from: -Z, P: YAN.half + YAN.pave }, false));
  }
  // (East of Yanagi-suji only its first row stays: the rest would stand in the canal. Rows facing the
  // west quay take their place, between the boulevard's side streets, 40 and 110 m out.)
  b.out.models = b.out.models.filter((m, i) => i < mb || !(m.pos[0] > 30 && Math.abs(m.pos[2]) > Z));
  for (const s of [-1, 1] as const) {
    for (const [d0, d1] of [[0.5, 33.5], [46.5, 103.5], [116.5, OUT_NS]]) fillRect(YAN.c + YAN.half + YAN.pave + 22.4, s > 0 ? Z + d0 : -Z - d1, QUAY - 0.2, s > 0 ? Z + d1 : -Z - d0, 'e', BIZ, true);
  }
  /** The avenue past the edge: the same cross-section as inside, drawn simply. */
  const avenueOut = (s: 1 | -1) => {
    const u0 = s > 0 ? X : -X - OUT_EW, u1 = u0 + OUT_EW;
    const R = (mat: string, z0: number, z1: number, y0: number, y1: number) => b.deco(mat, u0, y0, Math.min(z0, z1), u1, y1, Math.max(z0, z1));
    R('asphalt', -RW, RW, -0.03, 0.004);
    R('flat:#e6a700', -0.08, 0.08, 0.004, 0.01);
    for (let u = u0 + 2; u + 3 < u1; u += 6) for (const k of [-1, 1]) b.deco('flat:#e9e9e4', u, 0.004, k * RW / 2 - 0.07, u + 3, 0.01, k * RW / 2 + 0.07);
    for (const k of [-1, 1]) {
      R('paver', k * RW, k * SEP, -0.03, GY);
      R('asphalt', k * SEP, k * SVC, -0.03, 0.004);
      R('flat:#8d8f8c', k * SVC, k * STRIP, -0.03, GY + 0.3);
      R('flat:#3f6b3a', k * (SVC + 0.2), k * (STRIP - 0.2), GY + 0.3, GY + 0.85);
      R('paver', k * STRIP, k * FRONT, -0.03, GY);
      for (let u = u0 + 6; u < u1 - 4; u += 12) {
        modelTree(b, 'ginkgo', u, k * (RW + 1.9), 'b', GY, false);
        modelTree(b, 'ginkgo', u + 6, k * (SVC + 2), 'b', GY, false);
      }
      for (let u = u0 + 12; u < u1 - 6; u += 26) roadModel(b, 'lamp_hw', u, GY, k * (RW + 0.8), [0, -k]);
    }
  };
  // East and west: the avenue and the two side streets.
  const ew: Edge[] = [
    { c: 0, half: RW, pave: FRONT - RW, wide: true, tree: 'ginkgo' },
    { c: NEW.z, half: NEW.half, pave: NEW.pave, wide: false }, { c: SEW.z, half: SEW.half, pave: SEW.pave, wide: false },
  ];
  const corrEW: [number, number][] = [[-FRONT, FRONT], [NEW.z - NEW.half - NEW.pave, NEW.z + NEW.half + NEW.pave], [SEW.z - SEW.half - SEW.pave, SEW.z + SEW.half + SEW.pave]];
  for (const s of [-1, 1] as const) {
    for (const q of ew) if (q.c === 0) avenueOut(s);
    else if (s < 0) roadOut(false, s, q, OUT_EW);
    // (East of the canal the side streets do not run: one long block each side.)
    const bands = s > 0 ? between([[-FRONT, FRONT]], -Z, Z) : between(corrEW, -Z, Z);
    for (const [a, e] of bands) pack(false, s, a, e, OUT_EW);
    b.clearScenery(s > 0 ? X : -X - OUT_EW - 2, -Z, s > 0 ? X + OUT_EW + 2 : -X, Z);
  }
  for (let k = m0; k < b.out.models.length; k++) if (b.out.models[k].kind === 'road' || b.out.models[k].kind === 'trees') b.out.models[k].merge = true;
}
