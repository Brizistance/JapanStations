// Shiomi's fill (stage 4, 2026-11-25): every block between the streets of shiomi-street.ts, and the rows seen past the
// east edge. The owner's rules for it: no bare ground and no big empty squares (more streets were cut first); a gap
// that buildings do not fill becomes parking or green.
//
//   North shore drive (row 1): bay-view hotels facing the water (bayside hotel_a/b/c), flats behind them on なぎさ通;
//     at the tip the marina's boathouse with the seafarers' shrine beside it.
//   Rows 2 and 3 (なぎさ通 … 潮見中通): flats, back to back on the narrow blocks, perimeter blocks round gardens or
//     residents' parking on the wide ones (mcenter pb*, manshon).
//   Row 4 (the main road): the konbini on the corner, a business hotel, restaurants and shops facing the main road,
//     the old brick warehouse (a brewery now); flats behind on the back street.
//   The tip: hotels on 岬北通 and the coach road, a multi-storey car park for the aquarium, shop rows on the shopping
//     street with service yards behind, flats on the small streets.
//   East of 汐入筋 by the station: a park over the tunnel. Past the east edge: perimeter blocks, seen only.

import type { Builder } from '../world/builder';
import { rng } from '../world/builder';
import { CARS, VEH, family } from '../traffic/vehicles';
import { MCENTER as M } from './anchors/mcenter';
import { BAYSIDE as BS } from './anchors/bayside';
import { ROADSIDE } from './anchors/roadside';
import { TOWN as TN } from './anchors/town';
import type { Anchor, AnchorPt, Anchors } from './anchors/types';
import type { Rect } from './looks/types';
import { GROUND_Y } from './kit';
import { konbini } from './konbini';
import { place } from './places';
import { roadModel, streetLamp } from './roads';
import { SHIOMI_LINES as BL, SHIOMI_PLOT, SHIOMI_SITES as SITE, SHIOMI_STREETS } from './shiomi-plan';
import { fillModelLots, isAlleyLot } from './surface';
import { modelTree, type TreeKind } from './trees';

type Named = { ja: string; en: string };
type Face = 'n' | 's' | 'e' | 'w';
type Side = Face;
const FRAME: Record<Face, { rot?: 0 | 1 | 2 | 3 }> = { n: {}, s: { rot: 2 }, e: { rot: 1 }, w: { rot: 3 } };
const PAVE = 'tile:#c8c3b8', PLAZA = 'tile:#d9d4c8', LAWN = 'flat:#6d8a48', WHITE = 'flat:#e9e9e4', STEEL = 'paint:#f4f5f2';
const n2 = (ja: string, en: string): Named => ({ ja, en });
const X_EDGE = SHIOMI_PLOT.x;

/** Names given in the fill (web-checked 2026-11-25 with the street names; generic ones are not names). */
export const SHIOMI_FILL_NAMES = {
  shrine: n2('潮見船玉社', 'Shiomi Funadama Shrine'),
  brewery: n2('潮見ハーバーブルワリー', 'Shiomi Harbour Brewery'),
  eastPark: n2('潮見東口公園', 'Shiomi East Gate Park'),
  carpark: n2('水族館 駐車場', 'Aquarium car park'),
};
/** Names on the town set's boards (generic, 2026-11-25). */
const TOWN_BOARDS: Record<'off' | 'clinic' | 'juku', [Named, string, string][]> = {
  off: [[n2('潮見第一ビル', 'Shiomi Daiichi Bldg.'), '#2a2a2a', '#f4f1e8'], [n2('潮見センタービル', 'Shiomi Center Bldg.'), '#2a2a2a', '#f4f1e8'], [n2('みさきビル', 'Misaki Bldg.'), '#1f3550', '#f4f1e8']],
  clinic: [[n2('しおみ内科・小児科', 'Shiomi Internal Medicine'), '#2e7d4f', '#ffffff'], [n2('なぎさ歯科クリニック', 'Nagisa Dental Clinic'), '#2e7d4f', '#ffffff'], [n2('浜通り整形外科', 'Hamadōri Orthopaedics'), '#2e7d4f', '#ffffff']],
  juku: [[n2('潮見進学ゼミ', 'Shiomi Prep Seminar'), '#ffffff', '#1f5fa8'], [n2('学習塾 みなと', 'Minato Study Academy'), '#ffffff', '#1f5fa8']],
};
/**
 * What may stand in a bar's place, by width (the owner, 2026-11-25: "add more varieties instead of repetitive
 * apartment blocks"): Minato Center's bars, flats over shops, 1970s walk-ups, small offices, a clinic, a cram school.
 */
const TOWN_BY_W: Record<number, string[][]> = {
  16: [['fos16a', 'fos16b'], ['fos16a', 'fos16b'], ['off16'], ['clinic16']],
  20: [['fos20a', 'fos20b'], ['fos20a', 'fos20b'], ['off20'], ['juku20']],
  24: [['fos24a', 'fos24b'], ['danchi24']],
  28: [['danchi28']],
  32: [['danchi32']],
};

export function shiomiFill(b: Builder, seedBase: number) {
  const GY = GROUND_Y;
  const r = rng(seedBase);
  let seed = 200;
  const at = (face: Face, x: number, z: number, fn: () => void) => b.with({ ...FRAME[face], t: [x, 0, z] }, fn);
  const signAt = (p: AnchorPt, content: Parameters<typeof b.sign>[0]) => b.sign(content, p[0], p[1] + GY, p[2], [p[5], p[6]], p[3], p[4]);
  const label = (p0: AnchorPt | undefined, name: Named, fg = '#1f3550', bg = '#eef0ee') => { if (p0) signAt(p0, { k: 'label', text: name.ja, sub: name.en, fg, bg }); };
  const piece = (kind: string, A: Anchors, id: string, face: Face, x: number, z: number, fn?: (a: Anchor) => void) =>
    at(face, x, z, () => {
      const a = A[id];
      b.model(kind, id, 0, GY, 0, ++seed);
      b.block(-a.w / 2, GY, 0, a.w / 2, GY + Math.max(a.h, 3), a.d);
      fn?.(a);
    });
  const boards: Record<string, number> = {};
  let blockNo = 1;
  /** A town-set building, its board or block number lettered. */
  const townPiece = (id: string, face: Face, x: number, z: number) =>
    piece('town', TN, id, face, x, z, (an) => {
      if (an.pts.num) {
        signAt(an.pts.num, { k: 'label', text: `${blockNo}号棟`, sub: `Block ${blockNo}`, fg: '#2f3a45', bg: '#efe9dc' });
        blockNo++;
      }
      const k = id.startsWith('off') ? 'off' : id.startsWith('clinic') ? 'clinic' : id.startsWith('juku') ? 'juku' : null;
      if (k && an.pts.name) {
        const list = TOWN_BOARDS[k], i = (boards[k] = (boards[k] ?? -1) + 1) % list.length;
        label(an.pts.name, list[i][0], list[i][1], list[i][2]);
      }
    });
  /** An open strip put to use: paved (or planted), named so it is walked. */
  const strip = (x0: number, z0: number, x1: number, z1: number, mat: string, ja: string, en: string) => {
    if (x1 - x0 < 0.5 || z1 - z0 < 0.5) return;
    b.deco(mat, x0, GY + 0.002, z0, x1, GY + 0.012, z1);
    b.zone('street', x0, -0.3, z0, x1, 6, z1, ja, en, true);
  };
  /** A green: a raised lawn with trees and, where it is big enough, benches facing across a paved patch. */
  const garden = (x0: number, z0: number, x1: number, z1: number, name: Named, kinds: TreeKind[] = ['zelkova', 'cherry', 'camphor'], zone = true) => {
    if (x1 - x0 < 1.5 || z1 - z0 < 1.5) return;
    b.box('flat:#b9b4a8', x0, GY, z0, x1, GY + 0.35, z1);
    b.deco(LAWN, x0 + 0.15, GY + 0.35, z0 + 0.15, x1 - 0.15, GY + 0.37, z1 - 0.15);
    for (let x = x0 + 4; x < x1 - 3; x += 9) for (let z = z0 + 4; z < z1 - 3; z += 9) if (r() < 0.5) modelTree(b, kinds[Math.floor(r() * kinds.length)], x + r() * 2 - 1, z + r() * 2 - 1, 'b', GY + 0.35);
    if (x1 - x0 < 4 || z1 - z0 < 4) for (let u = 1.5; u < Math.max(x1 - x0, z1 - z0) - 1; u += 3.5) modelTree(b, 'azalea', x1 - x0 < 4 ? (x0 + x1) / 2 : x0 + u, x1 - x0 < 4 ? z0 + u : (z0 + z1) / 2, 'a', GY + 0.35);
    if (zone) b.zone('street', x0, -0.3, z0, x1, 6, z1, name.ja, name.en, true);
    if (zone && x1 - x0 > 14 && z1 - z0 > 14) {
      const xm = (x0 + x1) / 2, zm = (z0 + z1) / 2;
      b.deco('tile:#cfc9bd', xm - 3, GY + 0.37, zm - 2.6, xm + 3, GY + 0.38, zm + 2.6);
      for (const [dz, f] of [[-2.1, 1], [2.1, -1]] as [number, 1 | -1][]) {
        roadModel(b, 'bench_s', xm, GY + 0.35, zm + dz, [0, f]);
        b.block(xm - 0.9, GY + 0.35, zm + dz - 0.3, xm + 0.9, GY + 0.85, zm + dz + 0.3);
      }
    }
  };
  const cars = (x0: number, x1: number, z: number, f: [number, number], share = 0.55) => {
    for (let x = x0 + 1.3; x < x1 - 1; x += 2.6) {
      if (r() > share) continue;
      const id = CARS[Math.floor(r() * CARS.length)], [len, wd, ht] = VEH[family(id)];
      roadModel(b, id, x, GY, z, f);
      b.block(x - wd / 2, GY, z - len / 2, x + wd / 2, GY + ht, z + len / 2);
    }
  };
  /** Parking on open ground: asphalt, a kerb round it, rows of bays with wheel stops, cars, a lamp, a pay machine. */
  const parking = (x0: number, z0: number, x1: number, z1: number, name: Named, coin = true) => {
    if (x1 - x0 < 6 || z1 - z0 < 6) { garden(x0, z0, x1, z1, n2('植え込み', 'Planted strip')); return; }
    b.deco('asphalt', x0, GY + 0.002, z0, x1, GY + 0.012, z1);
    for (const [a0, c0, a1, c1] of [[x0, z0, x1, z0 + 0.3], [x0, z1 - 0.3, x1, z1], [x0, z0, x0 + 0.3, z1], [x1 - 0.3, z0, x1, z1]] as Rect[]) b.deco('flat:#b9b4a8', a0, GY, c0, a1, GY + 0.15, c1);
    const along = x1 - x0 >= z1 - z0;
    // Rows of bays 5 m deep across the long way, an aisle between each pair of rows.
    const [u0, u1, v0, v1] = along ? [x0 + 1, x1 - 1, z0 + 0.6, z1 - 0.6] : [z0 + 1, z1 - 1, x0 + 0.6, x1 - 0.6];
    for (let v = v0 + 2.5; v < v1 - 2.4; v += 11) {
      for (let u = u0; u <= u1 + 0.01; u += 2.6) along ? b.deco(WHITE, u - 0.05, GY + 0.012, v - 2.5, u + 0.05, GY + 0.018, v + 2.5) : b.deco(WHITE, v - 2.5, GY + 0.012, u - 0.05, v + 2.5, GY + 0.018, u + 0.05);
      if (along) cars(u0, u1, v, [0, 1], 0.55);
      else for (let u = u0 + 1.3; u < u1 - 1; u += 2.6) if (r() < 0.55) {
        const id = CARS[Math.floor(r() * CARS.length)], [len, wd, ht] = VEH[family(id)];
        roadModel(b, id, v, GY, u, [1, 0]);
        b.block(v - len / 2, GY, u - wd / 2, v + len / 2, GY + ht, u + wd / 2);
      }
    }
    if (coin) {
      const [px, pz] = [x0 + 0.8, z0 + 0.8];
      b.box('flat:#e6a700', px - 0.3, GY, pz - 0.2, px + 0.3, GY + 1.5, pz + 0.2);
      b.sign({ k: 'label', text: 'P 24時間', sub: name.en, fg: '#ffffff', bg: '#1f5fae' }, px, GY + 2.3, pz, [0, -1], 1.0, 0.5);
      b.box('flat:#8d949b', px - 0.04, GY, pz - 0.04, px + 0.04, GY + 2.0, pz + 0.04);
    }
    streetLamp(b, 'lamp_small', (x0 + x1) / 2, z1 - 0.5, [0, -1]);
    b.zone('street', x0, -0.3, z0, x1, 6, z1, name.ja, name.en, true);
  };

  // ── Rows of stock buildings (fillModelLots) fronting a street, a planted strip where they run out ──
  const fillRect = (x0: number, z0: number, x1: number, z1: number, face: Face, kinds: string[], signs: 0 | 1 | 2 = 0) => {
    const [a, e, f0, f1] = face === 'n' ? [x0, x1, z0, z1] : face === 's' ? [-x1, -x0, -z1, -z0] : face === 'e' ? [z0, z1, -x1, -x0] : [-z1, -z0, x0, x1];
    if (e - a < 3.5 || f1 - f0 < 8) return;
    b.with(FRAME[face], () => {
      const lots = fillModelLots(b, r, a, e, f0, f1 + 2.01, { noBack: true, kinds, signs });
      for (const l of lots.filter(isAlleyLot)) b.zone('street', l[0] + 0.1, -0.3, l[1], l[2] - 0.1, 6, l[3] - 0.3, '路地', 'Alley', true);
      const end = lots.length ? Math.max(...lots.map((l) => l[2])) : a;
      if (e - end >= 1.0) garden(end + 0.1, f0, e, f0 + Math.min(f1 - f0, 10), n2('植え込み', 'Planted strip'), ['azalea' as TreeKind]);
      // Behind the row, to the back of the lot: a paved back yard where it is narrow, parking where it is not.
      const back = lots.length ? Math.max(...lots.map((l) => l[3])) : f0;
      if (f1 - back > 6.5) parking(a, back + 0.1, e, f1, n2('裏の駐車場', 'Parking behind'), false);
      // (A narrow one, shut in behind the buildings: a raised concrete service yard, not a place to walk.)
      else if (f1 - back > 0.6) b.box('flat:#9a958b', a, GY, back + 0.1, e, GY + 0.4, f1);
    });
  };

  // ── Perimeter blocks of flats (Minato Center's pb*/pc*), a garden or parking in the courtyard ──
  const PBW = [16, 20, 24, 28, 32], PC = 14;
  const tile = (L: number): number[] => {
    const out: number[] = [];
    let left = Math.floor(L / 4) * 4;
    if (left < 16) return out;
    while (left > 0) {
      const ok = PBW.filter((w) => w === left || left - w >= 16);
      const w = ok[Math.floor(r() * ok.length)];
      out.push(w);
      left -= w;
    }
    return out;
  };
  const run = (face: Side, line: number, a: number, e: number, lvl: number) => {
    const ws = tile(e - a);
    if (!ws.length) {
      // Too short for a bar of flats: small buildings between the corners (a planted strip only if even they do not fit).
      if (e - a > 1) {
        const [x0, z0, x1, z1] = face === 'n' ? [a, line, e, line + PC] : face === 's' ? [a, line - PC, e, line] : face === 'e' ? [line - PC, a, line, e] : [line, a, line + PC, e];
        if (e - a >= 4.5) fillRect(x0, z0, x1, z1, face, ['machi', 'manshon'], 1);
        else garden(x0, z0, x1, z1, n2('植え込み', 'Planted strip'), ['azalea' as TreeKind]);
      }
      return;
    }
    const gap = (e - a - ws.reduce((s, w) => s + w, 0)) / (ws.length + 1);
    let u = a + gap, last = '';
    for (const w of ws) {
      const c = u + w / 2, [x, z] = face === 'n' || face === 's' ? [c, line] : [line, c];
      // A third Minato Center's bars, the rest the town set, never the same building twice running; heights mixed.
      let id = '';
      for (let t = 0; t < 3 && (!id || id === last); t++) {
        if (r() < 0.32 || !TOWN_BY_W[w]) id = `pb${w}${(lvl >= 2 ? r() < 0.7 : lvl === 1 ? r() < 0.35 : r() < 0.1) ? 'h' : 'l'}`;
        else {
          const g = TOWN_BY_W[w][Math.floor(r() * TOWN_BY_W[w].length)];
          id = g[Math.floor(r() * g.length)];
        }
      }
      last = id;
      if (id.startsWith('pb')) piece('mcenter', M, id, face, x, z);
      else townPiece(id, face, x, z);
      u += w + gap;
    }
  };
  const perimeter = (x0: number, z0: number, x1: number, z1: number, o: { tall?: boolean; low?: boolean; core: 'garden' | 'parking'; name: Named; seen?: boolean; front?: { side: 's'; fill: (a: number, e: number, line: number) => void }; openN?: boolean }) => {
    const lvl = o.tall ? 2 : o.low ? 0 : 1, pc = lvl >= 2 ? 'pch' : 'pcl';
    // (openN: the north side is another building's back, a hotel's: no flats there, the courtyard runs up to it.)
    if (!o.openN) {
      piece('mcenter', M, pc, 'n', x0 + PC / 2, z0);
      piece('mcenter', M, pc, 'e', x1, z0 + PC / 2);
      run('n', z0, x0 + PC, x1 - PC, lvl);
    }
    piece('mcenter', M, pc, 's', x1 - PC / 2, z1);
    piece('mcenter', M, pc, 'w', x0, z1 - PC / 2);
    if (o.front) o.front.fill(x0 + PC, x1 - PC, z1);
    else run('s', z1, x0 + PC, x1 - PC, lvl);
    const zt = o.openN ? z0 : z0 + PC;
    // The way into the courtyard: a 5 m passage through the west side, in the middle (seen-only blocks have none).
    if (!o.seen && z1 - PC - zt >= 9) {
      const mid = (zt + z1 - PC) / 2;
      run('w', x0, zt, mid - 2.5, lvl);
      run('w', x0, mid + 2.5, z1 - PC, lvl);
      strip(x0, mid - 2.5, x0 + PC + 0.2, mid + 2.5, PAVE, '中庭 通路', 'Way into the courtyard');
    } else run('w', x0, zt, z1 - PC, lvl);
    run('e', x1, zt, z1 - PC, lvl);
    const [cx0, cz0, cx1, cz1] = [x0 + PC + 0.2, o.openN ? z0 + 0.2 : z0 + PC + 0.2, x1 - PC - 0.2, z1 - PC - 0.2];
    if (cx1 - cx0 < 3 || cz1 - cz0 < 3) return;
    if (o.seen || o.core === 'garden' || cx1 - cx0 < 12 || cz1 - cz0 < 12) garden(cx0, cz0, cx1, cz1, o.name, ['zelkova', 'cherry', 'dogwood', 'camphor'], !o.seen);
    else parking(cx0, cz0, cx1, cz1, o.name, false);
  };
  /**
   * Two rows back to back across a narrow block, one facing each street: bars of flats 14 m deep (stock buildings on
   * one side where the block is too narrow for two), a corner block at each end, and what is left between them a
   * paved back alley.
   */
  const backToBack = (x0: number, z0: number, x1: number, z1: number, axis: 'x' | 'z', lvl = 1) => {
    const deep = axis === 'x' ? x1 - x0 : z1 - z0, long = axis === 'x' ? z1 - z0 : x1 - x0;
    const two = deep >= 2 * PC;
    const pc = lvl >= 2 ? 'pch' : 'pcl';
    if (axis === 'x') {
      // Corner blocks at both ends of the west row, the rest in bars; the east row the same, or stock buildings.
      piece('mcenter', M, pc, 'n', x0 + PC / 2, z0);
      piece('mcenter', M, pc, 'w', x0, z1 - PC / 2);
      run('w', x0, z0 + PC, z1 - PC, lvl);
      if (two) {
        piece('mcenter', M, pc, 'e', x1, z0 + PC / 2);
        piece('mcenter', M, pc, 's', x1 - PC / 2, z1);
        run('e', x1, z0 + PC, z1 - PC, lvl);
        if (deep - 2 * PC > 0.8) strip(x0 + PC + 0.1, z0, x1 - PC - 0.1, z1, PAVE, '裏路地', 'Back alley');
      } else fillRect(x0 + PC + 0.2, z0, x1, z1, 'e', ['manshon', 'machi'], 1);
    } else {
      piece('mcenter', M, pc, 'w', x0, z0 + PC / 2);
      piece('mcenter', M, pc, 'n', x1 - PC / 2, z0);
      run('n', z0, x0 + PC, x1 - PC, lvl);
      if (two) {
        piece('mcenter', M, pc, 's', x0 + PC / 2, z1);
        piece('mcenter', M, pc, 'e', x1, z1 - PC / 2);
        run('s', z1, x0 + PC, x1 - PC, lvl);
        if (deep - 2 * PC > 0.8) strip(x0, z0 + PC + 0.1, x1, z1 - PC - 0.1, PAVE, '裏路地', 'Back alley');
      } else fillRect(x0, z0 + PC + 0.2, x1, z1, 's', ['manshon', 'machi'], 1);
    }
    void long;
  };
  /** A bay-view hotel on the front of a block, greens either side of it, flats on the back street, its car park between. */
  const hotelBlock = (x0: number, z0: number, x1: number, z1: number, id: string, name: Named) => {
    const a = BS[id], xc = (x0 + x1) / 2;
    piece('bayside', BS, id, 'n', xc, z0, (an) => {
      label(an.pts.name, name, '#ffffff', '#1b2f4f');
      if (an.pts.roof) label(an.pts.roof, name, '#1b2f4f', '#f4f2ec');
    });
    garden(x0, z0, xc - a.w / 2 - 0.1, z0 + a.d, n2(`${name.ja} 前庭`, `${name.en} garden`), ['pine', 'camphor']);
    garden(xc + a.w / 2 + 0.1, z0, x1, z0 + a.d, n2(`${name.ja} 前庭`, `${name.en} garden`), ['pine', 'camphor']);
    perimeter(x0, z0 + a.d + 0.4, x1, z1, { core: 'parking', name: n2(`${name.ja} 駐車場`, `${name.en} car park`), openN: true });
  };
  /** Shop rows (bayside shop_8/10/12) packed along a street front, a service yard or parking behind. */
  const shopRow = (x0: number, x1: number, line: number, face: 'n' | 's') => {
    const widths: number[] = [];
    let left = x1 - x0;
    while (left >= 8) {
      const ok = [8, 10, 12].filter((w) => w <= left);
      const w = ok[Math.floor(r() * ok.length)];
      widths.push(w);
      left -= w;
    }
    let u = x0 + left / 2;
    for (const w of widths) {
      piece('bayside', BS, `shop_${w}`, face, u + w / 2, line);
      u += w;
    }
    if (left > 0.6) {
      garden(x0, face === 's' ? line - 12 : line, x0 + left / 2, face === 's' ? line : line + 12, n2('植え込み', 'Planted strip'), ['azalea' as TreeKind]);
      garden(x1 - left / 2, face === 's' ? line - 12 : line, x1, face === 's' ? line : line + 12, n2('植え込み', 'Planted strip'), ['azalea' as TreeKind]);
    }
  };

  // ═════ The plan's lines, from the street table (shiomi-plan.ts) ═════
  const S_ = (en: string) => SHIOMI_STREETS.find((q) => q.en.startsWith(en))!;
  const lo = (q: { c: number; half: number; pave: number }) => q.c - q.half - q.pave, hi = (q: { c: number; half: number; pave: number }) => q.c + q.half + q.pave;
  const SD = S_('Shiomi-hokugan'), NAG = S_('Shiomi-nagisa'), KITA = S_('Shiomi-kita'), NAKA = S_('Shiomi-naka'), BAY = S_('Shiomi Bay-dōri (');
  const MIS = S_('Misaki-suji'), HANPU = S_('Hanpu'), HK = S_('Hamakaze'), HAM = S_('Hamayū'), SHI = S_('Shioiri'), ECR = S_('Shiomi-higashi');
  const BLN = S_('Shiomi Bay-dōri back'), MKN = S_('Misaki-kita'), URA = S_('Ryokudō');
  const TL = { ...BL.tipLane }, TW = { ...BL.tipCut }, TC = BL.tipCross, BD = BL.bayDrive, CO = BL.coach;
  const sdLine = hi(SD), nagN = lo(NAG), nagS = hi(NAG), kitaN = lo(KITA), kitaS = hi(KITA), nakaN = lo(NAKA), nakaS = hi(NAKA);
  const blnN = BLN.c - BLN.half, blnS = BLN.c + BLN.half, bayN = lo(BAY), bayS = hi(BAY), uraN = URA.c - URA.half;
  const COL = { A: [hi(MIS), lo(HANPU)], B: [hi(HANPU), lo(HK)], C: [hi(HK), lo(HAM)], D: [hi(HAM), lo(SHI)], E: [hi(SHI), lo(ECR)], F: [hi(ECR), X_EDGE] } as const;
  const T1: [number, number] = [hi(BD), lo(TL)], T2: [number, number] = [hi(TL), lo(TC)], T3: [number, number] = [hi(TC), lo(MIS)];
  const twN = lo(TW), twS = hi(TW), mknN = lo(MKN), mknS = hi(MKN), coN = CO.c - CO.half - CO.pave, coS = CO.c + CO.half + CO.pave, shopN = BL.shopN;
  const m = 0.2;

  // ── Row 1: bay-view hotels on the north shore drive, a perimeter block of flats behind each round its car park ──
  hotelBlock(COL.A[0] + m, sdLine + m, COL.A[1] - m, nagN - m, 'hotel_b', n2('ホテル潮見ベイサイド', 'Hotel Shiomi Bayside'));
  hotelBlock(COL.B[0] + m, sdLine + m, COL.B[1] - m, nagN - m, 'hotel_a', n2('潮見マリンホテル', 'Shiomi Marine Hotel'));
  backToBack(COL.C[0] + m, sdLine + m, COL.C[1] - m, nagN - m, 'x', 2);
  hotelBlock(COL.D[0] + m, sdLine + m, COL.D[1] - m, nagN - m, 'hotel_c', n2('潮見リゾート ラ・メール', 'Shiomi Resort La Mer'));
  for (const c of [COL.E, COL.F]) backToBack(c[0] + m, sdLine + m, c[1] - m, nagN - m, 'x', 1);
  // The tip: the marina's boathouse (shiomi-street.ts), the seafarers' shrine beside it, flats behind round the
  // marina's car park; hotels facing the shore further east.
  {
    const bhE = -269.5;
    at('n', (bhE + T1[1]) / 2, sdLine + m, () => place(b, { kind: 'shrine', ja: SHIOMI_FILL_NAMES.shrine.ja, en: SHIOMI_FILL_NAMES.shrine.en }));
    garden(bhE + 0.2, sdLine + m, (bhE + T1[1]) / 2 - 4.6, sdLine + 14.2, n2(`${SHIOMI_FILL_NAMES.shrine.ja} 杜`, `${SHIOMI_FILL_NAMES.shrine.en} grove`), ['pine', 'camphor']);
    garden((bhE + T1[1]) / 2 + 4.6, sdLine + m, T1[1] - m, sdLine + 14.2, n2(`${SHIOMI_FILL_NAMES.shrine.ja} 杜`, `${SHIOMI_FILL_NAMES.shrine.en} grove`), ['pine', 'camphor']);
    perimeter(T1[0] + m, sdLine + 14.6, T1[1] - m, nagN - m, { core: 'parking', name: n2('マリーナ 駐車場', 'Marina car park') });
  }
  hotelBlock(T2[0] + m, sdLine + m, T2[1] - m, nagN - m, 'hotel_a', n2('ホテル岬', 'Hotel Misaki'));
  hotelBlock(T3[0] + m, sdLine + m, T3[1] - m, nagN - m, 'hotel_c', n2('潮見ベイテラス', 'Shiomi Bay Terrace'));

  // ── Rows 2 and 3: perimeter blocks of flats round residents' parking; the narrow blocks back to back ──
  for (const [z0, z1] of [[nagS, kitaN], [kitaS, nakaN]] as [number, number][]) {
    for (const c of [COL.A, COL.B, COL.D]) perimeter(c[0] + m, z0 + m, c[1] - m, z1 - m, { core: 'parking', name: n2('住民駐車場', "Residents' parking") });
    for (const c of [COL.C, COL.E, COL.F]) backToBack(c[0] + m, z0 + m, c[1] - m, z1 - m, 'x', 1);
  }
  // The tip's rows between なぎさ通, 西岬通 and 岬北通: flats back to back, facing both streets.
  for (const [z0, z1] of [[nagS, twN], [twS, mknN]] as [number, number][]) for (const c of [T1, T2, T3]) backToBack(c[0] + m, z0 + m, c[1] - m, z1 - m, 'z', 1);

  // ── Row 4: the main road and the back street ──
  // A: the bus terminal (shiomi-street.ts); the kōban on the corner by it, small buildings behind it to 帆布小路.
  at('s', COL.A[1] - 3.5, bayN - m, () => place(b, { kind: 'koban', ja: '潮見駅前交番', en: 'Shiomi Station kōban' }));
  {
    const x0 = SITE.bus.x1 + 0.2, x1 = COL.A[1] - m;
    strip(x0, nakaS + m, x1, bayN - 5.6, PAVE, 'バスターミナル 駐輪場', 'Bus terminal bicycle park');
    for (let z = nakaS + 3; z < bayN - 8; z += 3.2) {
      roadModel(b, 'bikerack', (x0 + x1) / 2, GY, z, [1, 0]);
      b.block((x0 + x1) / 2 - 0.3, GY, z - 1.25, (x0 + x1) / 2 + 0.3, GY + 0.9, z + 1.25);
    }
  }
  // B: flats on the back street (corner blocks at both ends); the konbini on the corner, the business hotel and
  // restaurants on the main road; residents' parking between.
  {
    const [x0, x1] = [COL.B[0] + m, COL.B[1] - m];
    piece('mcenter', M, 'pcl', 'n', x0 + PC / 2, nakaS + m);
    piece('mcenter', M, 'pcl', 'e', x1, nakaS + m + PC / 2);
    run('n', nakaS + m, x0 + PC, x1 - PC, 1);
    at('s', x0 + 7.2, bayN - m, () => konbini(b, { type: 'corner', chain: 'maruhoshi' }));
    piece('mcenter', M, 'bhotel', 's', x0 + 14.6 + 8, bayN - m, (an) => {
      label(an.pts.name, n2('潮見ステーションホテル', 'Shiomi Station Hotel'), '#ffffff', '#2a3a52');
      label(an.pts.roof, n2('潮見ステーションホテル', 'Shiomi Station Hotel'), '#ffffff', '#2a3a52');
    });
    fillRect(x0 + 31, bayN - m - 14, x1, bayN - m, 's', ['machi', 'zakkyo'], 2);
    parking(x0, nakaS + m + PC + 0.4, x0 + 14.2, bayN - m - 9.4, n2('住民駐車場', "Residents' parking"), false);
    parking(x0 + 14.4, nakaS + m + PC + 0.4, x1, bayN - m - 22.4, n2('住民駐車場', "Residents' parking"), false);
    parking(x0 + 30.8, bayN - m - 22.2, x1, bayN - m - 14.2, n2('住民駐車場', "Residents' parking"), false);
  }
  // C and D, split by the back lane: flats on the back street, restaurants and shops on the main road; the brewery.
  fillRect(COL.C[0] + m, nakaS + m, COL.C[1] - m, blnN - m, 'n', ['manshon', 'machi'], 1);
  fillRect(COL.C[0] + m, blnS + m, COL.C[1] - m, bayN - m, 's', ['machi', 'zakkyo'], 2);
  run('n', nakaS + m, COL.D[0] + m, COL.D[1] - m, 1);
  fillRect(COL.D[0] + m, nakaS + PC + 0.4, COL.D[1] - m, blnN - m, 'n', ['machi'], 1);
  piece('mcenter', M, 'soko', 's', (COL.D[0] + COL.D[1]) / 2, bayN - m, (a) => label(a.pts.name, SHIOMI_FILL_NAMES.brewery, '#f4efe2', '#5a2a1e'));
  strip(COL.D[0] + m, blnS + m, COL.D[1] - m, bayN - m - 18.2, 'flat:#7d7a74', `${SHIOMI_FILL_NAMES.brewery.ja} 搬入口`, `${SHIOMI_FILL_NAMES.brewery.en} yard`);
  for (const c of [COL.E, COL.F]) {
    run('n', nakaS + m, c[0] + m, c[1] - m, 1);
    fillRect(c[0] + m, bayN - m - 11.2, c[1] - m, bayN - m, 's', ['machi'], 2);
    parking(c[0] + m, nakaS + m + PC + 0.4, c[1] - m, bayN - m - 11.4, n2('住民駐車場', "Residents' parking"), false);
  }
  // South of the main road east of 汐入筋, over the tunnel: the park, a bicycle park by the east hall (shiomi-street.ts).
  for (const c of [COL.E, COL.F]) garden(c[0] + m, bayS + m, c[1] - m, uraN - m, SHIOMI_FILL_NAMES.eastPark, ['cherry', 'zelkova', 'camphor']);

  // ── The tip ──
  // 岬北通 … the coach road: the aquarium's car park and coin parking; a hotel on the coach road, flats behind.
  {
    const cx = (-252 + T2[1]) / 2, a = ROADSIDE.carpark;
    piece('roadside', ROADSIDE, 'carpark', 's', cx, coN - m, (an) => label(an.pts.name, SHIOMI_FILL_NAMES.carpark, '#ffffff', '#1f5fae'));
    parking(-252 + 0.2, mknS + m, T2[1] - m, coN - a.d - m - 0.2, n2('潮見ベイ コインパーキング', 'Shiomi Bay coin parking'));
    for (const [x0, x1] of [[-252 + 0.2, cx - a.w / 2 - 0.1], [cx + a.w / 2 + 0.1, T2[1] - m]] as [number, number][]) fillRect(x0, coN - a.d - m, x1, coN - m, 's', ['machi'], 1);
  }
  piece('bayside', BS, 'hotel_c', 's', (T3[0] + T3[1]) / 2, coN - m, (a) => label(a.pts.name, n2('ホテル アクアリウムサイド', 'Hotel Aquariumside'), '#ffffff', '#1b2f4f'));
  run('n', mknS + m, T3[0] + m, T3[1] - m, 1);
  parking(T3[0] + m, mknS + PC + 0.4, T3[1] - m, coN - 16.4, n2('ホテル 駐車場', 'Hotel car park'), false);
  // The shopping street: shop rows on its north side between the lanes and 時計筋, a row of small buildings facing
  // the coach road behind, service yards between.
  for (const [x0, x1] of [[-228, -216.5], [-213.5, lo(TC)], [hi(TC), -171.5], [-168.5, lo(MIS)]] as [number, number][]) {
    shopRow(x0 + m, x1 - m, shopN - m, 's');
    fillRect(x0 + m, coS + m, x1 - m, coS + 14, 'n', ['machi'], 1);
    parking(x0 + m, coS + 14.4, x1 - m, shopN - 12.4, n2('搬入ヤード・駐車場', 'Service yard and parking'));
  }
  garden(-228 + 0.1, 4.5 + m, -224 - 0.1, 36 - m, n2('植え込み', 'Planted strip'), ['pine']);

  // ── Past the east edge (seen, not walked): perimeter blocks of low flats between the carried-on streets ──
  for (const [z0, z1] of [[sdLine, nagN], [nagS, kitaN], [kitaS, nakaN], [nakaS, bayN]] as [number, number][]) {
    for (const [x0, x1] of [[152, 222], [228, 298]] as [number, number][]) perimeter(x0, z0 + m, x1, z1 - m, { low: true, core: 'garden', name: n2('', ''), seen: true });
  }
  for (const [x0, x1] of [[152, 222], [228, 298]] as [number, number][]) garden(x0, bayS + m, x1, uraN - m, n2('', ''), ['cherry', 'zelkova'], false);
}
