// The link between Umibe-shiyakusho-mae and Kawaminato-kō (2026-11-25): the 422 m of landfill between the two
// plots, walked all the way. Built in Umibe-shiyakusho-mae's world along its plot's arms (umibe-plan.ts
// UMIBE_EAST), in its frame: +x east, +z south; Kawaminato-kō's west edge is x 570, Tōsen-machi's plot is the
// corner north of z −85 from x 555.
//
// The district changes as you walk east: government offices like the city hall's own (the `civic` set) as far as
// the 筋 where the avenue narrows; beyond it shipping and trading firms on the boulevard (`minatofront`), the
// old shipping town's low shops and houses behind them (`urafront`, `tsuna`), and brick and tin warehouses with
// their yards along the north edge (`port`, `urafront`), up to the port's own first block.
//
//   Street                      Centre line     What it is
//   海辺通 Umibe-dōri            z = 0           six lanes (|z| ≤ 11, building line −18) west of Hashike-suji;
//                                               east of it Kawaminato-kō's 湊浦通 Minatoura-dōri: four lanes
//                                               (|z| ≤ 9), 10.5 m pavements, building line −19.5
//   浜千鳥通 Hamachidori-dōri    z = −84         Umibe's back street, as far as Hashike-suji
//   綱町通 Tsunamachi-dōri       z = −54         Kawaminato-kō's back street (9 m, pavements 2.5), as far as Hashike-suji
//   蔵裏小路 Kuraura-kōji        z −78.5…−75     the lane before the warehouses, Hashike-suji to x 555
//   水先筋 Mizusaki-suji         x = 232         two lanes, pavements 2 m; ends at the avenue
//   艀筋 Hashike-suji            x = 360         12 m of carriageway, pavements 3.5 m; ends at the avenue
//   纜筋 Tomozuna-suji           x = 470         two lanes, pavements 2 m; ends at the avenue
//
//   South of the avenue: 海辺緑地 the shore green (lawn, pines, a walk) and the sea-wall promenade (z 46…52),
//   unbroken from Umibe Park to Kawaminato-kō's Harbour Promenade.

import type { AnchorPt, Anchors } from './anchors/types';
import { CIVIC } from './anchors/civic';
import { MINATOFRONT } from './anchors/minatofront';
import { PORT } from './anchors/port';
import { TSUNA } from './anchors/tsuna';
import { URAFRONT } from './anchors/urafront';
import type { LanePart } from '../world/builder';
import type { Ctx } from './kit';
import { GROUND_Y, vending } from './kit';
import { konbini } from './konbini';
import { roadModel, roadName, streetLamp } from './roads';
import { crosswalk } from './surface';
import { modelTree } from './trees';
import { UMIBE_EAST as E, UMIBE_PLOT, UMIBE_STREETS } from './umibe-plan';

type Rect = [number, number, number, number];
type Named = { ja: string; en: string };
type Face = 'n' | 's' | 'e' | 'w';
type Cross = { c: number; half: number };

/** What the station's own street file lends (its closures over the builder). */
export interface EastKit {
  r: () => number;
  at: (face: Face, x: number, z: number, fn: () => void) => void;
  signAt: (p: AnchorPt, content: { k: 'label'; text: string; sub?: string; fg: string; bg: string }) => void;
  junction: (cx: number, hx: number, ns: (1 | -1)[], cz: number, hz: number, ew: (1 | -1)[], name: Named, south: boolean, skip?: 'e' | 'w' | '') => void;
  lane: (o: { speed: number; flow: number; use: LanePart['use'] }, x0: number, z0: number, x1: number, z1: number, more?: Partial<LanePart>, cross?: Cross[]) => void;
  firmAt: (face: Face, x: number, ln: number, id: string, name: Named, fg?: string, bg?: string) => void;
  gapSite: (rc: Rect, frontZ: number, kind?: 'coin' | 'bikes') => void;
  board: (x0: number, x1: number, z: number) => void;
  lampAt: (a0: number, a1: number, corr: [number, number][]) => number[];
}

const WHITE = 'flat:#e9e9e4', YELLOW = 'flat:#e6a700', STONE = 'flat:#cfcdc6', LANE = 'tile:#8f8a80', BARE = 'flat:#8d877b';
const PATH = 'tile:#cbbfa6', PLAZA = 'tile:#d6d3ca', SETTS = 'flat:#77726a';
const n = (ja: string, en: string): Named => ({ ja, en });

/** Government and port-administration offices for the civic rows, west of Hashike-suji. */
const OFFICES: Named[] = [
  n('川湊港湾合同庁舎', 'Kawaminato Port Joint Government Bldg'), n('川湊税関 本関', 'Kawaminato Customs'), n('川湊海上保安部', 'Kawaminato Coast Guard Office'),
  n('西海運輸局 川湊庁舎', 'Seikai Transport Bureau'), n('川湊検疫所', 'Kawaminato Quarantine Station'), n('西海出入国在留管理局 川湊出張所', 'Seikai Immigration Bureau, Kawaminato'),
  n('川湊植物防疫所', 'Plant Protection Station'), n('川湊海辺年金事務所', 'Umibe Pension Office'), n('川湊労働総合庁舎', 'Labour Offices'),
  n('西海地方気象台 川湊分室', 'Seikai Weather Office'), n('川湊市 港湾局', 'City Port and Harbour Bureau'), n('川湊海事代理士会館', 'Marine Procedure Agents’ Hall'),
  n('西海損害保険 川湊ビル', 'Seikai Fire & Marine Insurance'), n('川湊通関業会館', 'Customs Brokers’ Hall'), n('西海銀行 海辺支店', 'Seikai Bank, Umibe Branch'),
  n('川湊水先人会', 'Kawaminato Pilots’ Association'), n('海辺第二ビル', 'Umibe No. 2 Building'), n('川湊港湾福利厚生会館', 'Port Workers’ Welfare Hall'),
  n('西海電力 川湊営業所', 'Seikai Electric Power, Kawaminato'), n('川湊倉庫協会', 'Warehouse Association'), n('海辺中央歯科・法律事務所', 'Dental clinic · Law office'),
  n('西海ガス 海辺サービス店', 'Seikai Gas, Umibe'), n('川湊船員保険会館', 'Seamen’s Insurance Hall'), n('浜木綿商事', 'Hamayū Shōji'),
];
/** Shipping and trading firms for the boulevard fronts east of it. */
const FIRMS: Named[] = [
  n('西海汽船', 'Seikai Steamship'), n('湊浦海運', 'Minatoura Kaiun'), n('川湊港運', 'Kawaminato Harbour Transport'), n('澪標回漕店', 'Miotsukushi Shipping Agents'),
  n('艀筋倉庫', 'Hashikesuji Warehouse Co.'), n('西海通関', 'Seikai Customs Clearance'), n('川湊冷蔵', 'Kawaminato Cold Storage'), n('纜船具店', 'Tomozuna Ship Chandlers'),
  n('水先貿易', 'Mizusaki Trading'), n('川湊曳船', 'Kawaminato Tug & Tow'), n('西海船舶電機', 'Seikai Marine Electric'), n('湊浦保税倉庫', 'Minatoura Bonded Warehouse'),
  n('灯台海図店', 'Tōdai Chart Agents'), n('川湊帆布', 'Kawaminato Canvas'), n('西海燃料', 'Seikai Bunker Fuel'), n('蔵裏製綱', 'Kuraura Rope Works'),
];
/** The old shipping town's shops behind the boulevard. */
const SHOPS: Named[] = [
  n('船具 いかり屋', 'Ikariya ship fittings'), n('食堂 みなと', 'Minato lunch room'), n('喫茶 汽笛', 'Kiteki coffee'), n('酒 艀屋', 'Hashikeya liquor'),
  n('綱町理容', 'Tsunamachi barber'), n('釣具 澪', 'Mio fishing tackle'), n('中華そば 纜', 'Tomozuna ramen'), n('綱町薬局', 'Tsunamachi pharmacy'),
  n('弁当 浜千鳥', 'Hamachidori bentō'), n('作業服 水先', 'Mizusaki workwear'), n('立呑み 蔵裏', 'Kuraura standing bar'), n('自転車 灯台', 'Tōdai cycles'),
];

export function umibeEast(c: Ctx, h: EastKit) {
  const { b } = c, GY = GROUND_Y, N = UMIBE_PLOT.north;
  const { r, at, signAt } = h;
  const AV = UMIBE_STREETS.find((s) => s.en.startsWith('Umibe'))!, URA = UMIBE_STREETS.find((s) => s.en.startsWith('Hamachidori'))!;
  const X0 = E.x0, X1 = E.x1, M = E.mid, [L1, L2] = E.locals, T = E.tsu;
  const MW = M.c - M.half, ME = M.c + M.half; // Hashike-suji's kerbs
  const AVW = -(AV.half + AV.pave), AVE = -(E.av.half + E.av.pave); // the avenue's north building line west and east of it
  const URS = URA.c + URA.half + URA.pave, URN = URA.c - URA.half - URA.pave;
  const TS = T.c + T.half + T.pave, TN = T.c - T.half - T.pave; // −47, −61
  const KURA: [number, number] = [-78.5, -75];
  const clearOf = (u: number, spans: [number, number][], m = 0) => !spans.some(([p, q]) => u > p - m && u < q + m);

  // ═════════════════════════ Ground ═════════════════════════
  const carriage: Rect[] = [
    [X0, -AV.half, ME, AV.half], [ME, -E.av.half, X1, E.av.half],
    [X0, URA.c - URA.half, MW, URA.c + URA.half], [ME, T.c - T.half, X1, T.c + T.half],
    [MW, -N, ME, -AV.half], ...[L1, L2].map((s): Rect => [s.c - s.half, -N, s.c + s.half, -9]),
  ];
  // (North of z −85 the last 15 m is Tōsen-machi's plot.)
  const lands: Rect[] = [[X0, -N, E.north, 52], [E.north, -85, X1, 52]];
  for (const [x0, z0, x1, z1] of lands) {
    b.slab('asphalt', x0, z0, x1, z1, -0.6, 0, []);
    b.slab(BARE, x0, z0, x1, z1, 0, GY, carriage);
  }
  const pave = (x0: number, z0: number, x1: number, z1: number, mat = 'paver') => b.slab(mat, x0, z0, x1, z1, GY + 0.002, GY + 0.014, carriage, false);
  pave(X0, AVW, ME, -AV.half);
  pave(X0, AV.half, ME, -AVW);
  pave(ME, AVE, X1, -E.av.half);
  pave(ME, E.av.half, X1, -AVE);
  pave(X0, URN, MW, URS);
  pave(ME, TN, X1, TS);
  pave(MW - M.pave, -N, ME + M.pave, AVW);
  for (const s of [L1, L2]) pave(s.c - s.half - s.pave, -N, s.c + s.half + s.pave, s === L1 ? AVW : AVE);
  b.zone('street', X0, -0.3, -N, X1, 80, 52, '海辺通', 'Umibe-dōri — between the city hall and the port');
  // Walls: the north edge, the sea wall, and the far end either side of the streets that go on into Kawaminato-kō.
  b.block(X0, -1, -N - 1, E.north, 60, -N);
  b.block(E.north, -1, -N, E.north + 1, 60, -85);
  b.block(E.north, -1, -86, X1, 60, -85);
  b.block(X0, -1, 52, X1, 60, 53);
  for (const [z0, z1] of [[-85, TN], [TS, AVE], [-AVE, 46]]) b.block(X1, -1, z0, X1 + 1, 60, z1);

  // ═════════════════════════ Paint ═════════════════════════
  const nsCorr: [number, number][] = [[L1.c - 5.25, L1.c + 5.25], [MW - M.pave, ME + M.pave], [L2.c - 5.25, L2.c + 5.25]];
  const boxX = nsCorr.map(([p, q]): [number, number] => [p - 7, q + 7]);
  const dashX = (z: number, a: number, e: number, mat = WHITE) => {
    for (let x = a; x < e - 3; x += 6) if (clearOf(x + 1.5, boxX)) b.deco(mat, x, 0.004, z - 0.07, x + 3, 0.01, z + 0.07);
  };
  const lineX = (z: number, a: number, e: number, mat = WHITE, w = 0.06) => {
    let from = a;
    for (const [p, q] of [...boxX, [e, e] as [number, number]]) {
      if (Math.min(p, e) - from > 1) b.deco(mat, from, 0.004, z - w, Math.min(p, e), 0.01, z + w);
      from = Math.max(from, q);
    }
  };
  for (const s of [-1, 1]) {
    for (const z of [4.5, 7.75]) dashX(s * z, X0, MW);
    lineX(s * 0.18, X0, MW, YELLOW, 0.05);
    lineX(s * (AV.half - 0.4), X0, MW);
    dashX(s * 4.5, ME, X1);
    lineX(s * (E.av.half - 0.35), ME, X1);
  }
  lineX(0, ME, X1, YELLOW, 0.08);
  dashX(URA.c, X0, MW);
  dashX(T.c, ME, X1);
  const boxZ: [number, number][] = [[URN - 7, URS + 7], [TN - 7, TS + 7]];
  for (const s of [L1, M, L2]) {
    const end = s === L2 ? AVE : AVW, box = s === L1 ? [boxZ[0]] : s === L2 ? [boxZ[1]] : boxZ;
    for (let z = -N; z < end - 9; z += 6) if (clearOf(z + 1.5, box)) b.deco(s === M ? YELLOW : WHITE, s.c - 0.07, 0.004, z, s.c + 0.07, 0.01, z + (s === M ? 6 : 3));
    // (Hashike-suji: a parking strip at each kerb.)
    if (s === M) for (const e of [-1, 1]) for (let z = -N; z < AVW - 9; z += 6) if (clearOf(z + 3, box, 2)) b.deco(WHITE, s.c + e * 3.6 - 0.05, 0.004, z, s.c + e * 3.6 + 0.05, 0.01, z + 6);
  }

  // ═════════════════════════ Junctions and lanes ═════════════════════════
  h.junction(L1.c, L1.half, [1], 0, AV.half, [1, -1], n('水先筋', 'Mizusaki-suji'), false);
  h.junction(L1.c, L1.half, [1, -1], URA.c, URA.half, [1, -1], n('浜千鳥通東', 'Hamachidori-dōri-higashi 2'), true);
  h.junction(M.c, M.half, [1], 0, AV.half, [1, -1], n('税関前', 'Zeikan-mae'), false);
  h.junction(M.c, M.half, [1, -1], URA.c, URA.half, [1], n('艀筋北', 'Hashike-suji-kita'), true, 'e');
  h.junction(M.c, M.half, [1, -1], T.c, T.half, [-1], n('綱町西', 'Tsunamachi-nishi'), true, 'w');
  h.junction(L2.c, L2.half, [1], 0, E.av.half, [1, -1], n('纜筋', 'Tomozuna-suji'), false);
  h.junction(L2.c, L2.half, [1, -1], T.c, T.half, [1, -1], n('綱町', 'Tsunamachi'), true);
  // A zebra over the avenue at each 筋's foot is the way to the shore.
  for (const x of [L1.c - 9, M.c + 12, L2.c - 9]) void x;

  const mid = { speed: 40, flow: 1.6, use: 'general' as const }, small = { speed: 30, flow: 0.9, use: 'general' as const };
  const ura: Cross = URA, av: Cross = { c: 0, half: AV.half }, tsu: Cross = T;
  h.lane(small, L1.c + 1.6, -N, L1.c + 1.6, 6.5, { dead: true, closed: ['from'] }, [ura, av]);
  h.lane({ ...small, flow: 0 }, L1.c - 1.6, -1, L1.c - 1.6, -N, { closed: ['to'] }, [ura]);
  h.lane(mid, M.c + 1.75, -N, M.c + 1.75, 10, { dead: true, closed: ['from'] }, [ura, tsu, av]);
  h.lane({ ...mid, flow: 0 }, M.c - 1.75, -1, M.c - 1.75, -N, { closed: ['to'] }, [tsu, ura]);
  h.lane(small, L2.c + 1.6, -N, L2.c + 1.6, 6.5, { dead: true, closed: ['from'] }, [tsu, av]);
  h.lane({ ...small, flow: 0 }, L2.c - 1.6, -1, L2.c - 1.6, -N, { closed: ['to'] }, [tsu]);
  // Tsunamachi-dōri: one with Kawaminato-kō's lanes at the seam (eastbound on its north half).
  h.lane({ ...small, flow: 0 }, M.c - 3, T.c - E.tsuLane, X1 + 20, T.c - E.tsuLane, { closed: ['to'], hand: { station: 'kawaminato-ko', at: [X1, 0, T.c - E.tsuLane] } }, [L2]);
  h.lane(small, X1 + 20, T.c + E.tsuLane, M.c - 3, T.c + E.tsuLane, { closed: ['from'], fed: 'kawaminato-ko', dead: true }, [L2, M]);
  // (Listed between Hamachidori-dōri's two lanes, 26 m off: each lane's own opposite comes first for whoever pairs them up.)
  {
    const own = b.out.lanes.splice(b.out.lanes.length - 2, 2), k = b.out.lanes.findIndex((l) => Math.abs(l.from[2] - (URA.c + 1.6)) < 0.01 && Math.abs(l.to[2] - (URA.c + 1.6)) < 0.01);
    b.out.lanes.splice(k, 0, own[1], own[0]);
  }

  // ═════════════════════════ Lamps, trees, boards ═════════════════════════
  const carrX: [number, number][] = [[L1.c - L1.half, L1.c + L1.half], [MW, ME], [L2.c - L2.half, L2.c + L2.half]];
  h.lampAt(X0, X1, carrX).forEach((x, k) => {
    const s = k % 2 ? 1 : -1, hw = x < ME ? AV.half : E.av.half;
    streetLamp(b, x < ME ? 'lamp_led' : 'lamp_twin', x, s * (hw + 0.7), [0, -s]);
  });
  h.lampAt(X0, MW, carrX).forEach((x, k) => streetLamp(b, 'lamp_small', x, URA.c + (k % 2 ? 1 : -1) * (URA.half + 0.45), [0, k % 2 ? -1 : 1]));
  h.lampAt(ME, X1, carrX).forEach((x, k) => streetLamp(b, 'lamp_small', x, T.c + (k % 2 ? 1 : -1) * (T.half + 0.5), [0, k % 2 ? -1 : 1]));
  const carrZ: [number, number][] = [[URA.c - URA.half, URA.c + URA.half], [T.c - T.half, T.c + T.half]];
  for (const s of [L1, M, L2]) h.lampAt(-N, -AV.half, s === L1 ? [carrZ[0]] : s === L2 ? [carrZ[1]] : carrZ).forEach((z, k) => {
    const e = k % 2 ? 1 : -1;
    streetLamp(b, s === M ? 'lamp_led' : 'lamp_small', s.c + e * (s.half + 0.5), z, [-e, 0]);
  });
  for (let x = X0 + 10; x < X1 - 4; x += 18) {
    if (!clearOf(x, nsCorr, 7)) continue;
    for (const s of [-1, 1]) modelTree(b, x < ME ? 'camphor' : 'ginkgo', x, s * ((x < ME ? AV.half : E.av.half) + 1.9), 'b', GY, true);
  }
  for (let z = -N + 14; z < AVW - 6; z += 14) if (clearOf(z, [[URN, URS], [TN, TS]], 6)) for (const s of [-1, 1]) modelTree(b, 'zelkova', M.c + s * (M.half + 1.4), z, 'b', GY, true);
  roadName(b, MW - M.pave - 2, AVW + 0.6, [0, 1], n('海辺通', 'Umibe-dōri'));
  roadName(b, ME + M.pave + 2, AVE + 0.6, [0, 1], n('湊浦通', 'Minatoura-dōri'));
  roadName(b, ME + M.pave - 0.5, AVW - 8, [-1, 0], n('艀筋', 'Hashike-suji'));
  roadName(b, L1.c + 4.8, AVW - 6, [-1, 0], n('水先筋', 'Mizusaki-suji'));
  roadName(b, L2.c + 4.8, AVE - 6, [-1, 0], n('纜筋', 'Tomozuna-suji'));
  roadName(b, ME + M.pave + 2, TS - 0.4, [0, -1], n('綱町通', 'Tsunamachi-dōri'));

  // ═════════════════════════ The shore green and the promenade ═════════════════════════
  {
    const edge = (x: number) => (x < ME ? -AVW : -AVE);
    b.deco('grass', X0, GY + 0.001, -AVW, ME, GY + 0.008, 46);
    b.deco('grass', ME, GY + 0.001, -AVE, X1, GY + 0.008, 46);
    b.deco(PLAZA, X0, GY + 0.008, -AVW, ME, GY + 0.016, -AVW + 3);
    b.deco(PLAZA, ME, GY + 0.008, -AVE, X1, GY + 0.016, -AVE + 2.5);
    b.deco(PATH, X0, GY + 0.008, 46, X1, GY + 0.016, 52);
    b.box(STONE, X0, GY, 51.75, X1, GY + 0.35, 52);
    b.deco('metal:#b0b5ba', X0, GY + 1.04, 51.8, X1, GY + 1.1, 51.95);
    b.deco('metal:#b0b5ba', X0, GY + 0.68, 51.85, X1, GY + 0.72, 51.9);
    for (let x = X0 + 1; x < X1; x += 3) b.deco('metal:#b0b5ba', x - 0.04, GY + 0.35, 51.83, x + 0.04, GY + 1.04, 51.91);
    b.deco(STONE, X0, -0.03, 52, X1, GY, 54);
    // Paths down from the avenue to the promenade at each 筋's foot and half way between; a zebra over the avenue there.
    const feet = [L1.c - 9, M.c + 13, L2.c - 9];
    for (const x of [...feet, 190, 296, 416, 522]) b.deco(PATH, x - 1.5, GY + 0.008, edge(x) + 2.5, x + 1.5, GY + 0.016, 46);
    for (let x = X0 + 8, k = 0; x < X1 - 4; x += 12, k++) {
      if (k % 2 === 0) streetLamp(b, 'lamp_park', x, 46.5, [0, 1]);
      else if (k % 4 === 1) {
        roadModel(b, 'bench_s', x, GY, 50.6, [0, -1]);
        b.block(x - 0.95, GY, 50.3, x + 0.95, GY + 0.8, 50.9);
      } else modelTree(b, 'pine', x, 43, k % 8 === 3 ? 'a' : 'b');
    }
    for (let x = X0 + 16; x < X1 - 6; x += 21) if (clearOf(x, [...feet, 190, 296, 416, 522].map((f): [number, number] => [f - 3, f + 3]))) modelTree(b, (x | 0) % 3 ? 'camphor' : 'cherry', x, 26 + ((x * 7) % 12), (x | 0) % 2 ? 'a' : 'b');
    const NAMESG = [n('海辺緑地 西', 'Umibe Shore Green, west'), n('海辺緑地', 'Umibe Shore Green'), n('海辺緑地 東', 'Umibe Shore Green, east')];
    [[X0, 290], [290, 430], [430, X1]].forEach(([a, e], i) => {
      b.zone('street', a, GY - 0.2, edge(a + 80) + 3, e, GY + 8, 45.5, NAMESG[i].ja, NAMESG[i].en, true);
      b.zone('street', a, GY - 0.2, 46, e, GY + 6, 51.7, '海辺のプロムナード', `Seaside Promenade ${i + 3}`, true);
    });
    b.box('flat:#55585c', M.c + 13 - 1.6, GY, -AVE + 3.2, M.c + 13 + 1.6, GY + 0.3, -AVE + 4.0);
    b.box(STONE, M.c + 13 - 1.4, GY + 0.3, -AVE + 3.3, M.c + 13 + 1.4, GY + 1.3, -AVE + 3.9);
    b.sign({ k: 'label', text: '海辺緑地', sub: 'Umibe Shore Green · ← City Hall  Port →', fg: '#23395b', bg: '#cfcdc6' }, M.c + 13, GY + 0.8, -AVE + 3.28, [0, -1], 2.5, 0.8);
  }

  // ═════════════════════════ Rows ═════════════════════════
  /**
   * The widths that fill a … e best (0.6 m between), in a shuffled order, hard on both corners; what is left
   * over is one gap in the middle of the row: a passage where it is wide enough to walk, a board where it is not.
   */
  const pack = (a: number, e: number, A: Anchors, pool: string[]): { id: string; x: number }[] => {
    const L = e - a, GAP = 0.6;
    let best: string[] = [], used = -1;
    // (No building twice in a row while the pool can fill it without: a street of one model reads as a placeholder.)
    let step = 1;
    const go = (i: number, acc: string[], sum: number) => {
      const u = sum + GAP * Math.max(0, acc.length - 1);
      if (u > L + 0.01) return;
      if (u > used) {
        used = u;
        best = acc;
      }
      if (acc.length >= 9) return;
      for (let k = i; k < pool.length; k++) go(k + step, [...acc, pool[k]], sum + A[pool[k]].w);
    };
    go(0, [], 0);
    if (L - used > 8) {
      step = 0;
      go(0, [], 0);
    }
    const ids = best.map((id) => ({ id, o: r() })).sort((p, q) => p.o - q.o).map((q) => q.id);
    const slack = L - used, at0 = Math.floor(ids.length / 2);
    let x = a;
    return ids.map((id, i) => {
      if (i === at0) x += slack;
      const out = { id, x: x + A[id].w / 2 };
      x += A[id].w + GAP;
      return out;
    });
  };
  /** Where a packed row left its gap: [x0, x1], or null. */
  const gapOf = (row: { id: string; x: number }[], A: Anchors, a: number, e: number): [number, number] | null => {
    let x = a;
    for (const q of row) {
      const x0 = q.x - A[q.id].w / 2;
      if (x0 - x > 0.9) return [x, x0];
      x = q.x + A[q.id].w / 2 + 0.6;
    }
    return e - (x - 0.6) > 0.9 ? [x - 0.6, e] : null;
  };
  let office = 0, firm = 0, shop = 0, seed = 40;
  const BOARDS: [string, string][] = [['#f1ece0', '#27344f'], ['#27344f', '#ffffff'], ['#f4f1e8', '#3a2a1e'], ['#2a2622', '#e8d9b0'], ['#f4f1e8', '#7a1f2b'], ['#1f5fae', '#ffffff']];
  /** One building of a port set, its front's middle at (x, line), facing `face`, lettered where it has a board. */
  const piece = (kind: string, A: Anchors, face: Face, x: number, line: number, id: string, name?: Named) => at(face, x, line, () => {
    const a = A[id], [bg, fg] = BOARDS[seed % BOARDS.length];
    b.model(kind, id, 0, GY, 0, ++seed);
    b.block(-a.w / 2, GY, 0, a.w / 2, GY + a.h, a.d);
    if (!name) return;
    if (a.pts.name) signAt(a.pts.name, { k: 'label', text: name.ja, sub: name.en, fg, bg });
    if (a.pts.roof) signAt(a.pts.roof, { k: 'label', text: name.ja, sub: name.en, fg: bg, bg: fg });
    if (a.pts.vertical) signAt(a.pts.vertical, { k: 'label', text: name.ja, fg, bg });
  });
  /** A passage or a board where a row left its gap; `back`: where the passage leads (the row's far side). */
  const close = (g: [number, number] | null, line: number, depth: number, into: 1 | -1, name: Named | null) => {
    if (!g) return;
    const [x0, x1] = g, z0 = Math.min(line, line + into * depth), z1 = Math.max(line, line + into * depth);
    if (x1 - x0 >= 1.6 && name) {
      b.deco(LANE, x0, GY + 0.002, z0, x1, GY + 0.012, z1);
      b.zone('street', x0, GY - 0.2, z0, x1, GY + 6, z1, name.ja, name.en, true);
    } else {
      h.board(x0, x1, line + into * 0.3);
      h.board(x0, x1, line + into * (depth - 0.3));
    }
  };
  const CM = ['m30', 'm30b', 'm24', 'm24b', 'm24c', 'm20', 'm20b', 'm18'], CB = ['b24', 'b20', 'b18', 'b18b', 'b14', 'b14b'];
  const civicRow = (face: 'n' | 's', line: number, a: number, e: number, pool: string[], through: Named | null) => {
    const row = pack(a, e, CIVIC, pool);
    for (const q of row) h.firmAt(face, q.x, line, q.id, q.id === 'm24c' ? n('ホテル水先 川湊', 'Hotel Mizusaki Kawaminato') : OFFICES[office++ % OFFICES.length]);
    close(gapOf(row, CIVIC, a, e), line, CIVIC[pool[0]].d, face === 'n' ? 1 : -1, through);
  };
  const portRow = (kind: string, A: Anchors, face: 'n' | 's', line: number, a: number, e: number, pool: string[], names: 'firm' | 'shop' | 'none', through: Named | null = null) => {
    const row = pack(a, e, A, pool);
    for (const q of row) piece(kind, A, face, q.x, line, q.id, names === 'firm' ? FIRMS[firm++ % FIRMS.length] : names === 'shop' ? SHOPS[shop++ % SHOPS.length] : undefined);
    close(gapOf(row, A, a, e), line, Math.min(...pool.map((id) => A[id].d)), face === 'n' ? 1 : -1, through);
  };

  // ── West of Hashike-suji: the government quarter goes on (two blocks, as Umibe's own) ──
  const LN0 = AVW - 30, LN1 = URS + 26, YARD = URN - 26;
  const WEST: [number, number][] = [[X0, L1.c - 5.25], [L1.c + 5.25, MW - M.pave]];
  WEST.forEach(([a, e], i) => {
    const pass = n('通り抜け', `Passage to the service lane ${i + 2}`);
    civicRow('s', AVW, a + (i ? 0 : 0.2), e, i ? CM : CM.filter((id) => id !== 'm24c'), pass);
    civicRow('n', URS, a + (i ? 0 : 0.2), e, CB, null);
    civicRow('s', URN, a + (i ? 0 : 0.2), e, CB, null);
    // The service lane between the avenue's row and the back street's.
    b.deco(LANE, a, GY + 0.002, LN1, e, GY + 0.012, LN0);
    b.deco('flat:#6f6a60', a, GY + 0.012, (LN0 + LN1) / 2 - 0.08, e, GY + 0.016, (LN0 + LN1) / 2 + 0.08);
    const k = Math.ceil((e - a) / 36);
    for (let j = 0; j < k; j++) b.zone('street', a + ((e - a) * j) / k, GY - 0.2, LN1, a + ((e - a) * (j + 1)) / k, GY + 6, LN0, '庁舎裏小路 東', `Service lane behind the offices (link ${i + 1}.${j + 1})`, true);
    for (let x = a + 8; x < e - 3; x += 16) {
      streetLamp(b, 'lamp_small', x, LN0 - 0.3, [0, -1]);
      if (r() < 0.5) vending(b, x + 4, GY, LN0 - 0.4, [0, -1], r() < 0.5 ? 'vending' : 'vending2', 'new');
    }
    // Rear yards to the wall at the north edge.
    b.deco('flat:#8a8378', a, GY + 0.002, -N, e, GY + 0.012, YARD);
    b.box('flat:#b3ac9c', a, GY, -N, e, GY + 1.7, -N + 0.3);
    b.box('flat:#b3ac9c', a, GY, YARD - 0.15, e, GY + 1.7, YARD);
  });

  // ── East of it: shipping firms on the boulevard, the old shipping town behind, warehouses along the north edge ──
  const MF = Object.keys(MINATOFRONT);
  const TALL = MF.filter((k) => /^(ribbon|kaiun|stone|hotel)_/.test(k)), BRICK = MF.filter((k) => /^(brick|chandler|stone_b|kaiun_b)/.test(k));
  const UF1 = ['bank', 'glass', 'screen', 'scratch', 'tile70', 'bizhotel'], UF2 = ['scratch', 'tile70', 'cafe', 'kura', 'workshop', 'mansion', 'mansion_b'];
  const TS1 = ['mansion', 'mansion_b', 'tile70', 'cafe', 'workshop', 'scratch'], TS2 = Object.keys(TSUNA).filter((k) => k.startsWith('shop_'));
  const EAST: [number, number][] = [[ME + M.pave, L2.c - 5.25], [L2.c + 5.25, X1]];
  EAST.forEach(([a, e], i) => {
    // The boulevard's fronts (14 m deep); in the first block a tower holds Hashike-suji's corner.
    let a0 = a;
    if (i === 0) {
      piece('minatofront', MINATOFRONT, 's', a + MINATOFRONT.tower_a.w / 2, AVE, 'tower_a', n('西海海上ビルヂング', 'Seikai Marine Building'));
      a0 = a + MINATOFRONT.tower_a.w + 0.6;
    }
    portRow('minatofront', MINATOFRONT, 's', AVE, a0, e - (i ? 0.2 : 0), i ? BRICK : TALL, 'firm');
    // The back street's south side, back to back with them.
    portRow('urafront', URAFRONT, 'n', TS, a, e - (i ? 0.2 : 0), i ? UF2 : UF1, 'shop');
    // Its north side: the store on Hashike-suji's corner in the first block; low shops and houses.
    let s0 = a;
    if (i === 0) {
      at('s', a + 7, TN, () => konbini(b, { type: 'corner', chain: 'hinode' }));
      s0 = a + 14.6;
    }
    if (i === 0) portRow('urafront', URAFRONT, 's', TN, s0, e, TS1, 'shop');
    else portRow('tsuna', TSUNA, 's', TN, s0, e - 0.2, TS2, 'shop');
    // The lane before the warehouses, and the warehouses with their yard behind.
    const e2 = Math.min(e, E.north);
    b.deco(SETTS, a, GY + 0.002, KURA[0], e2, GY + 0.012, KURA[1]);
    const k = Math.ceil((e2 - a) / 36);
    for (let j = 0; j < k; j++) b.zone('street', a + ((e2 - a) * j) / k, GY - 0.2, KURA[0], a + ((e2 - a) * (j + 1)) / k, GY + 6, KURA[1], '蔵裏小路', `Kuraura-kōji ${i + 1}.${j + 1}`, true);
    for (let x = a + 7; x < e2 - 3; x += 15) streetLamp(b, 'lamp_small', x, KURA[1] - 0.3, [0, -1]);
    if (i === 0) portRow('urafront', URAFRONT, 's', KURA[0], a, e2, ['renga', 'uwaya'], 'firm');
    else portRow('port', PORT, 's', KURA[0], a, e2 - 0.4, ['soko_b', 'shed_b', 'soko_a'], 'none');
    const back = KURA[0] - (i === 0 ? 18 : 22) - 0.4;
    b.deco('asphalt', a, GY + 0.002, -N, e2, GY + 0.012, back);
    b.box('flat:#b3ac9c', a, GY, -N, e2, GY + 1.7, -N + 0.3);
    for (let x = a + 12, j = 0; x < e2 - 10; x += 19, j++) {
      const f: [number, number] = [0, 1];
      roadModel(b, j % 2 ? 'lorry_a' : 'lorry_b', x, GY, -N + 5 + (j % 3) * 2.5, f);
    }
    for (let x = a + 12, j = 0; x < e2 - 10; x += 19, j++) b.block(x - 1.3, GY, -N + 5 + (j % 3) * 2.5 - 3.9, x + 1.3, GY + 3, -N + 5 + (j % 3) * 2.5 + 3.9);
    b.zone('street', a, GY - 0.2, -N + 0.4, e2, GY + 6, back, '倉庫置場', `Warehouse yard ${i + 1}`, true);
    // Between the back street's north row and the lane: the houses' back gardens, hedged.
    b.box('flat:#55703f', a, GY, KURA[1] + 0.1, e2, GY + 0.5, KURA[1] + 0.6);
  });
  // (The last 15 m north of the back street's row, x 555…570: Tōsen-machi's side wall and a planted bank.)
  b.box('flat:#55703f', E.north, GY, -85, X1, GY + 0.5, TN - 14);
  void [crosswalk, YELLOW];
}
