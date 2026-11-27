// Tsumugibashi as a canal town, stage 4 (2026-11-26): signals, stop signs and paint, street and junction
// names, traffic, bus stops and the taxi stand, utility poles down the back streets, and the furniture of
// the avenue, the square, the quays and the river walk. Everything is placed from tsumugi-canal.ts's
// street table, so a street moved there takes its dress with it.
//
// Signals share the city's 60 s cycle (traffic/signals.ts): axis 0 the east–west streets, axis 1 the
// north–south ones. Every junction of two streets with a centre line is signalled; the back streets stop
// (止まれ) where they meet one.

import type { Builder, LanePart, V2 } from '../world/builder';
import { GROUND_Y as GY } from './kit';
import { mark, pedSignal, poleLine, roadModel, roadName, roadSign, shortSignal, trafficLane, vehicleSignal } from './roads';
import { modelTree } from './trees';
import { AV, BUS_STOPS, CANAL_PLOT as P, STREETS, TAXI, azaleaBed, bankStep, canalWet, poled, type St } from './tsumugi-canal';

type Rect = [number, number, number, number];
type Named = { ja: string; en: string };
const WHITE = 'flat:#e9e9e4', STONE = 'flat:#b3a688';

/** The streets with a name of their own (docs/worldbuilding.md), by axis and centre. */
const NAMES: Record<string, Named> = {
  'x0': { ja: '紬通', en: 'Tsumugi-dōri' },
  'x-95': { ja: '練絹通', en: 'Neriginu-dōri' },
  'x100': { ja: '白絹通', en: 'Shiroginu-dōri' },
  'x-340': { ja: '澪河岸通', en: 'Miogashi-dōri' },
  'z0': { ja: '柳筋', en: 'Yanagi-suji' },
  'z-290': { ja: '繭町筋', en: 'Mayumachi-suji' },
  'z125': { ja: '機場筋', en: 'Hataba-suji' },
};
/** The junctions' plates, by the east–west street's z and the north–south street's x. */
const JUNCTIONS: Record<string, Named> = {
  '0,0': { ja: '紬橋', en: 'Tsumugibashi' },
  '0,-290': { ja: '紬橋西', en: 'Tsumugibashi-nishi' },
  '0,125': { ja: '紬橋東詰', en: 'Tsumugibashi-higashizume' },
  '-95,0': { ja: '紬橋北', en: 'Tsumugibashi-kita' },
  '100,0': { ja: '紬橋南', en: 'Tsumugibashi-minami' },
  '-95,-290': { ja: '繭町北', en: 'Mayumachi-kita' },
  '100,-290': { ja: '繭町南', en: 'Mayumachi-minami' },
  '-340,0': { ja: '澪大橋南詰', en: 'Mio-ōhashi-minamizume' },
  '-340,-290': { ja: '繭見橋南詰', en: 'Mayumi-bashi-minamizume' },
  '-340,125': { ja: '機場河岸', en: 'Hataba-gashi' },
};
const nameOf = (s: St) => NAMES[`${s.ax}${s.c}`];
const SL = 4.6;

interface Junction { e: St; n: St; cx: number; cz: number; hx: number; hz: number; rz: number; W: boolean; E: boolean; N: boolean; S: boolean; name: Named }

/** `exits`: the metro's stair wells at street level, kept clear. */
export function canalDress(b: Builder, exits: Rect[], lots: { r: Rect; face: 'n' | 's' | 'e' | 'w' }[] = []) {
  const big = STREETS.filter((s) => s.kind !== 'small'), EW = big.filter((s) => s.ax === 'x'), NS = big.filter((s) => s.ax === 'z');
  const avenue = STREETS[0];
  const carr = STREETS.map((s): Rect => (s.ax === 'x' ? [s.a0, s.c - s.half, s.a1, s.c + s.half] : [s.c - s.half, s.a0, s.c + s.half, s.a1]));
  const onRoad = (x: number, z: number, m = 0) => carr.some((r) => x > r[0] - m && x < r[2] + m && z > r[1] - m && z < r[3] + m);
  const byExit = (x: number, z: number, m: number) => exits.some((r) => x > r[0] - m && x < r[2] + m && z > r[1] - m && z < r[3] + m);

  // ═════════════════════════ Junctions: signals, stop lines, the names ═════════════════════════
  const junctions: Junction[] = [];
  for (const e of EW) for (const n of NS) {
    if (n.c < e.a0 - 1 || n.c > e.a1 + 1 || e.c < n.a0 - 5 || e.c > n.a1 + 1) continue;
    const rz = e === avenue ? AV.strip : e.half;
    junctions.push({
      e, n, cx: n.c, cz: e.c, hx: n.half, hz: e.half, rz,
      W: e.a0 < n.c - n.half - 5, E: e.a1 > n.c + n.half + 5, N: n.a0 < e.c - e.half - 5, S: n.a1 > e.c + e.half + 5,
      name: JUNCTIONS[`${e.c},${n.c}`] ?? { ja: '紬橋', en: 'Tsumugibashi' },
    });
  }
  for (const j of junctions) {
    const { cx, cz, hx, hz, rz, name } = j, onAv = j.e === avenue, wideNS = hx > 4.6, wideEW = hz > 4.6;
    const px = hx + 2.3, pz = rz + 2.3;
    // The crossings (painted by tsumugi-canal.ts): pedestrian signals at both ends of each.
    for (const sz of [-1, 1] as const) {
      if (!(sz < 0 ? j.N : j.S)) continue;
      const zc = cz + sz * pz;
      pedSignal(b, cx - hx - 0.8, zc + sz * 2.0, [1, 0], 0, { flat: true, button: !wideNS, speaker: wideNS });
      pedSignal(b, cx + hx + 0.8, zc + sz * 2.0, [-1, 0], 0, { flat: true, button: !wideNS, speaker: wideNS });
    }
    for (const sx of [-1, 1] as const) {
      if (!(sx < 0 ? j.W : j.E)) continue;
      const xc = cx + sx * px;
      pedSignal(b, xc + sx * 2.0, cz - hz - 0.8, [0, 1], 1, { flat: true, speaker: wideEW });
      pedSignal(b, xc + sx * 2.0, cz + hz + 0.8, [0, -1], 1, { flat: true, speaker: wideEW });
    }
    // East–west traffic travelling sx: its stop line, and the signal on the far left corner.
    for (const sx of [-1, 1] as const) {
      if (!(sx > 0 ? j.W : j.E)) continue;
      const lz = -sx, xs = cx - sx * (hx + SL), far = sx > 0 ? j.E : j.W;
      b.deco(WHITE, Math.min(xs, xs - sx * 0.35), 0.004, Math.min(cz, cz + lz * (hz - 0.2)), Math.max(xs, xs - sx * 0.35), 0.01, Math.max(cz, cz + lz * (hz - 0.2)));
      const mx = cx + sx * (hx + (far ? 4.5 : 0.9)), mz = cz + lz * (hz + 1.5);
      if (wideEW) vehicleSignal(b, mx, mz, [sx, 0], hz + 1.5 - hz / 2, 0, name, { style: 'new', back: j.W && j.E });
      else shortSignal(b, mx, mz, [sx, 0], 0, name);
    }
    // North–south traffic travelling sz.
    for (const sz of [-1, 1] as const) {
      if (!(sz > 0 ? j.N : j.S)) continue;
      const lx = sz, zs = cz - sz * (rz + SL);
      b.deco(WHITE, Math.min(cx, cx + lx * (hx - 0.2)), 0.004, Math.min(zs, zs - sz * 0.35), Math.max(cx, cx + lx * (hx - 0.2)), 0.01, Math.max(zs, zs - sz * 0.35));
      const off = onAv ? 0.6 : 1.6, mx = cx + lx * (hx + off), mz = cz + sz * (hz + 2.0);
      if (wideNS) vehicleSignal(b, mx, mz, [0, sz], hx + off - hx / 2, 1, name, { style: 'new', back: j.N && j.S });
      else shortSignal(b, mx, mz, [0, sz], 1, name);
    }
    const bx = cx - hx - (onAv ? 5.6 : 2.6), bz = cz - hz - 3.2;
    if (!canalWet(bx, bz) && !onRoad(bx, bz, 0.5)) {
      roadModel(b, 'sigbox', bx, GY, bz, [0, 1]);
      b.block(bx - 0.36, GY, bz - 0.26, bx + 0.36, GY + 1.56, bz + 0.26);
    }
    // The two streets' names, on masts at the corners.
    const ez = cz + (j.S ? 1 : -1) * (hz + (onAv ? 3 : j.e.pave) - 0.6), nx = cx + (j.E ? 1 : -1) * (hx + j.n.pave - 0.6);
    roadName(b, cx + (j.E ? 1 : -1) * (hx + 2.2), ez, [j.E ? -1 : 1, 0], nameOf(j.e));
    roadName(b, nx, cz + (j.S ? 1 : -1) * (rz + 7.5), [0, j.S ? -1 : 1], nameOf(j.n));
  }

  // ═════════════════════════ The back streets stop at every street with a centre line ═════════════════════════
  for (const s of STREETS) {
    if (s.kind !== 'small') continue;
    for (const m of big) {
      if (m.ax === s.ax || s.c < m.a0 - 0.1 || s.c > m.a1 + 0.1) continue;
      const reach = m === avenue ? AV.strip : m.half;
      for (const k of [-1, 1] as const) {
        // The street's body lies to side k of m here: it stops before m's crossing.
        const u = m.c + k * (reach + 4.3), deep = m.c + k * (reach + 12);
        if (deep < s.a0 || deep > s.a1 || (k > 0 ? s.a0 : s.a1) * k > (m.c + k * (m.half + 0.7)) * k) continue;
        const at = (a: number, c: number): [number, number] => (s.ax === 'z' ? [c, a] : [a, c]);
        const [lx, lz] = at(u + k * 2.4, s.c + (s.ax === 'z' ? -k : k) * (s.half / 2));
        if (canalWet(lx, lz)) continue;
        const h: V2 = s.ax === 'z' ? [0, -k] : [-k, 0];
        mark(b, 'stop', lx, lz, h, 2.0, 3.0);
        const side = s.ax === 'z' ? -k : k;
        const [ax, az] = at(u, s.c), [cx2, cz2] = at(u + k * 0.3, s.c + side * (s.half - 0.6));
        b.deco(WHITE, Math.min(ax, cx2), 0.004, Math.min(az, cz2), Math.max(ax, cx2), 0.01, Math.max(az, cz2));
        const [sx, sz] = at(u + k * 0.6, s.c + side * (s.half + 0.3));
        roadSign(b, 'stop', sx, sz, [-h[0], -h[1]], 0.6);
      }
    }
  }

  // ═════════════════════════ Traffic ═════════════════════════
  /** A lane along street `s`, `off` to the left of its centre line, from u0 to u1; stops at the signals on the way. */
  const lane = (s: St, off: number, u0: number, u1: number, o: Omit<LanePart, 'from' | 'to' | 'stops'>) => {
    const d = Math.sign(u1 - u0), len = Math.abs(u1 - u0);
    const stops = junctions.filter((j) => (s.ax === 'x' ? j.e : j.n) === s).map((j) => {
      const t = ((s.ax === 'x' ? j.cx : j.cz) - u0) * d, r = (s.ax === 'x' ? j.hx : j.rz) + SL;
      return { at: t - r - 0.5, axis: (s.ax === 'x' ? 0 : 1) as 0 | 1, exit: Math.min(t + r, len) };
    }).filter((q) => q.at > 2 && q.at < len - 3).sort((p, q) => p.at - q.at);
    if (s.ax === 'x') trafficLane(b, u0, s.c - d * off, u1, s.c - d * off, { ...o, stops });
    else trafficLane(b, s.c + d * off, u0, s.c + d * off, u1, { ...o, stops });
  };
  const yanagi = NS.find((s) => s.c === 0)!, mayu = NS.find((s) => s.c === -290)!, hata = NS.find((s) => s.c === 125)!;
  const neri = EW.find((s) => s.c === -95)!, shiro = EW.find((s) => s.c === 100)!, kashi = EW.find((s) => s.c === -340)!;
  const kmh = (v: number) => v / 3.6;
  for (const d of [1, -1] as const) {
    const [a, e] = d > 0 ? [P.x0, P.x1] : [P.x1, P.x0];
    lane(avenue, 3, a, e, { speed: kmh(40), flow: 4, use: 'general', taxi: 0.3, halts: [] });
    const bus = BUS_STOPS.find((q) => q.s === -d)!;
    const halts: LanePart['halts'] = [{ at: (bus.x - a) * d + 0.5, side: 1.2 }];
    if (d < 0) halts.unshift({ at: a - (TAXI[0] + 10), side: (TAXI[1] + TAXI[3]) / 2 - 9, rank: Math.floor((TAXI[2] - TAXI[0] - 11) / 5.6) }); // (the stand's front stands clear of the footbridge's legs)
    lane(avenue, 9, a, e, { speed: kmh(40), flow: 2.4, use: 'all', taxi: 0.3, halts });
    const [n0, n1] = d > 0 ? [yanagi.a0, yanagi.a1] : [yanagi.a1, yanagi.a0];
    lane(yanagi, 2.5, n0, n1, { speed: kmh(40), flow: 3.2, use: 'general', taxi: 0.25, halts: [] });
    lane(yanagi, 7.5, n0, n1, { speed: kmh(40), flow: 2, use: 'all', taxi: 0.25, halts: [] });
    const [m0, m1] = d > 0 ? [mayu.a0, mayu.a1] : [mayu.a1, mayu.a0];
    lane(mayu, 1.75, m0, m1, { speed: kmh(30), flow: 1.6, use: 'all', taxi: 0.1, halts: [] });
  }
  const two = { speed: kmh(30), use: 'all' as const, taxi: 0.1, halts: [] };
  // The two streets behind the avenue run from the west edge to Yanagi-suji (east of it they are quiet, to the quay).
  for (const s of [neri, shiro]) {
    lane(s, 2.25, P.x0, 8, { ...two, flow: 2, dead: true });
    lane(s, 2.25, 8, P.x0, { ...two, flow: 0 });
  }
  // Miogashi-dōri along the river: from Mayumachi-suji out past the east edge. Hataba-suji ends on it.
  lane(kashi, 2.25, P.x1, mayu.c - 3, { ...two, flow: 2, dead: true });
  lane(kashi, 2.25, mayu.c - 3, P.x1, { ...two, flow: 0 });
  lane(hata, 2.25, hata.a1, kashi.c - 3.5, { ...two, flow: 1.8, dead: true });
  lane(hata, 2.25, kashi.c - 3.5, hata.a1, { ...two, flow: 0 });

  // ═════════════════════════ Bus stops on the avenue's separators; the taxi stand's sign ═════════════════════════
  for (const { x, s } of BUS_STOPS) {
    const sx = -s, f: V2 = [0, -s], zk = s * (AV.rw + 0.75), zs = s * (AV.rw + 2.7);
    roadModel(b, 'busstop', x + sx * 6.5, GY, zk, f);
    b.block(x + sx * 6.5 - 0.1, GY, zk - 0.1, x + sx * 6.5 + 0.1, GY + 2.2, zk + 0.1);
    b.sign({ k: 'label', text: 'バス', sub: 'BUS', fg: '#1f2023', bg: '#f4f4f0' }, x + sx * 6.5, GY + 2.62, zk - s * 0.045, f, 0.34, 0.34);
    b.sign({ k: 'label', text: s < 0 ? '紬橋駅前' : '紬橋西', sub: `${s < 0 ? 'Tsumugibashi-ekimae' : 'Tsumugibashi-nishi'} · Bus stop`, fg: '#1f2023', bg: '#f4f4f0' }, x + sx * 6.5, GY + 1.5, zk - s * 0.045, f, 0.5, 0.82);
    roadSign(b, 'nostopping', x - sx * 9, zk, [-sx, 0], 0.6);
    roadModel(b, 'shelter', x, GY, zs, f);
    b.block(x - 1.95, GY, zs + s * 0.6, x + 1.95, GY + 2.4, zs + s * 0.8);
    b.block(x - 1.4, GY, zs + s * 0.15, x + 1.4, GY + 0.5, zs + s * 0.6);
    mark(b, 'bus', x, s * (AV.rw - 1.6), [sx, 0], 2.0, 3.4);
  }
  {
    const x = TAXI[0] - 1.2, z = TAXI[3] + 0.9;
    b.box('metal:#5f6266', x - 0.05, GY, z - 0.05, x + 0.05, GY + 2.9, z + 0.05);
    for (const f of [-1, 1] as const) b.sign({ k: 'label', text: 'タクシーのりば', sub: 'TAXI', fg: '#ffffff', bg: '#2c6a3f' }, x + f * 0.07, GY + 2.45, z, [f, 0], 1.3, 0.7);
    for (let u = TAXI[0] + 2; u < TAXI[2] - 1; u += 4) {
      roadModel(b, 'bollard', u, GY, TAXI[3] + 0.5, [0, -1]);
      b.block(u - 0.12, GY, TAXI[3] + 0.38, u + 0.12, GY + 0.9, TAXI[3] + 0.62);
    }
  }
  for (const [x, s] of [[-330, -1], [180, 1]] as [number, 1 | -1][]) roadSign(b, 'speed40', x, s * (AV.rw + 0.6), [s, 0], 0.6);
  for (const s of [neri, shiro]) roadSign(b, 'speed30', P.x0 + 14, s.c - (s.half + 0.5), [-1, 0], 0.6);
  roadSign(b, 'speed30', P.x1 - 14, kashi.c + kashi.half + 0.5, [1, 0], 0.6);

  // ═════════════════════════ Utility poles down the back streets ═════════════════════════
  const perp = (s: St) => STREETS.filter((m) => m.ax !== s.ax && s.c > m.a0 - 8 && s.c < m.a1 + 8);
  STREETS.filter(poled).forEach((s, i) => {
    const cross = perp(s), road = (i % 2 ? 1 : -1) as 1 | -1, at = s.c - road * (s.half - 0.2);
    const pt = (u: number): [number, number] => (s.ax === 'x' ? [u, at] : [at, u]);
    poleLine(b, {
      axis: s.ax, from: s.a0 + 7, to: s.a1 - 5, at, road, step: 27, drops: 0.7, name: { ja: '紬橋', en: 'Tsumugibashi' },
      skip: (u) => cross.some((m) => Math.abs(u - m.c) < (m === avenue ? AV.front : m.half + m.pave) + 4) || canalWet(...pt(u)) || canalWet(...pt(u + 2)) || canalWet(...pt(u - 2)) || byExit(...pt(u), 2),
    });
  });

  // ═════════════════════════ Furniture ═════════════════════════
  const prop = (id: string, x: number, z: number, f: V2, hw: number, hd: number, h: number) => {
    roadModel(b, id, x, GY, z, f);
    const [ex, ez] = f[0] ? [hd, hw] : [hw, hd];
    b.block(x - ex, GY, z - ez, x + ex, GY + h, z + ez);
  };
  // The avenue's pavements: between the lamps, a bench with a planter or a bicycle rack, at the kerb strip.
  for (const s of [-1, 1] as const) {
    for (let x = P.x0 + 29, k = 0; x < P.x1 - 8; x += 30, k++) {
      const z = s * (AV.strip + 1.0);
      if (onRoad(x, z, 4.5) || onRoad(x + 3.6, z, 2) || byExit(x, z, 3.5) || (s > 0 && x > -26 && x < 76) || Math.abs(x) < 26) continue;
      if ((k + (s > 0 ? 1 : 0)) % 3 === 0) prop('bikerack', x, z, [0, s], 2.05, 0.4, 1.1);
      else {
        prop('bench_s', x, z, [0, s], 0.95, 0.4, 0.6);
        roadModel(b, 'planter', x + 3.6, GY, z, [0, s]);
      }
    }
  }
  // The station square: benches under the zelkovas, a fingerpost at each end.
  for (const x of [27, 47, 57]) prop('bench_s', x, 21.4, [0, 1], 0.95, 0.4, 0.6);
  for (const [x, z] of [[18.5, 30], [70, 30]]) roadModel(b, 'fingerpost', x, GY, z, [0, -1]);
  // The river walk west and east of the garden, the hall and the terraces: park lamps and benches at the parapet, cherries behind.
  let n = 0;
  for (const [x0, x1] of [[-280, -226], [-204, -130], [108, 196]]) {
    for (let x = x0 + 5; x < x1 - 2; x += 11, n++) {
      const z = bankStep(x) + 1.3;
      if (canalWet(x, z + 0.5) || Math.abs(x - Math.round((x + 350) / 25) * 25 + 350) < 1.5) continue;
      if (n % 2) prop('bench_s', x, z, [0, 1], 0.95, 0.4, 0.6);
      if (n % 2 === 0) modelTree(b, 'cherry', x + 5.5, z + 3.6, n % 4 ? 'a' : 'b', GY, true);
    }
  }
  // Tsumugi-bori's west quay north of Kase-bori: willows over the water, benches against the wall.
  for (let z = -322, k = 0; z < -176; z += 12, k++) {
    if (k % 2) prop('bench_s', 73.6, z, [1, 0], 0.95, 0.4, 0.6);
    else modelTree(b, 'willow', 77.6, z, k % 4 ? 'a' : 'b', GY, true);
  }
  // 繭見橋, the west bridge: name posts at its south end (the plain deck is tsumugi-canal.ts's).
  {
    const zb = bankStep(-290) + 1.2;
    for (const [x, text, sub] of [[-296.6, '繭見橋', 'Mayumi-bashi'], [-283.4, 'まゆみばし', 'Mio-gawa']] as [number, string, string][]) {
      b.box(STONE, x - 0.55, GY, zb - 0.55, x + 0.55, GY + 1.5, zb + 0.55);
      b.box('flat:#7d7361', x - 0.65, GY + 1.5, zb - 0.65, x + 0.65, GY + 1.62, zb + 0.65);
      b.sign({ k: 'label', text, sub, fg: '#e9e4d6', bg: '#4a4f46' }, x, GY + 0.95, zb + 0.56, [0, 1], 0.9, 0.5);
    }
  }

  // ═════════════════════════ The wide pavements (owner, 2026-11-26) ═════════════════════════
  // Yanagi-suji: willows at the kerb with azalea between them, the avenue's dark bands and tactile line.
  {
    const GRANITE = 'tile:#6f675b', hx = yanagi.half, out = hx + yanagi.pave;
    const lampZ = (z: number) => Math.abs(((z - (yanagi.a0 + 9)) % 30 + 30) % 30 - 15) > 12.4;
    const clearZ = (sx: number, z: number, m: number) =>
      !EW.some((e) => sx * 13 > e.a0 - 1 && sx * 13 < e.a1 + 1 && Math.abs(z - e.c) < (e === avenue ? AV.front : e.half + e.pave) + m)
      && !STREETS.some((e) => e.kind === 'small' && e.ax === 'x' && sx * 13 > e.a0 - 6.5 && sx * 13 < e.a1 + 6.5 && Math.abs(z - e.c) < e.half + m)
      && !(z > -168 - m && z < -146 + m) && Math.abs(z + 64.5) > 1.5 + m && !(sx < 0 && Math.abs(z - 63.5) < 1.5 + m)
      && z > -340 && !canalWet(sx * 13, z) && !byExit(sx * 13, z, m);
    for (const sx of [-1, 1] as const) {
      const xt = sx * (hx + 1.3);
      let last = NaN, k = 0;
      for (let z = -326; z < P.z1 - 4; z += 12, k++) {
        if (!clearZ(sx, z, 3) || lampZ(z)) continue;
        modelTree(b, 'willow', xt, z, k % 3 ? 'a' : 'b', GY, true);
        b.deco(GRANITE, Math.min(sx * hx, sx * out), GY, z - 0.2, Math.max(sx * hx, sx * out), GY + 0.004, z + 0.2);
        if (last === z - 12 && clearZ(sx, z - 6, 3)) azaleaBed(b, z - 12 + 1.8, z - 1.8, xt, 1.0, true);
        last = z;
      }
      let run: number | null = null;
      for (let z = -340; z <= P.z1; z += 1) {
        const ok = z < P.z1 && clearZ(sx, z + 0.5, 0.3);
        if (ok && run === null) run = z;
        if (!ok && run !== null) {
          b.deco('flat:#e3b21c', sx * 13.6 - 0.15, GY, run, sx * 13.6 + 0.15, GY + 0.006, z);
          b.deco(GRANITE, Math.min(sx * (out - 0.5), sx * out), GY, run, Math.max(sx * (out - 0.5), sx * out), GY + 0.005, z);
          run = null;
        }
      }
    }
  }
  // The shopfronts spill out: lively within 120 m of the Exchange (terraces under awnings, boards, menu cases,
  // banners), calmer further out (a board, a few bicycles).
  {
    const AWN = ['flat:#7a2f2a', 'flat:#2f4f3f', 'flat:#28405f', 'flat:#b89a5a'];
    lots.forEach(({ r, face }, i) => {
      const alongX = face === 'n' || face === 's';
      const [u0, u1] = alongX ? [r[0], r[2]] : [r[1], r[3]];
      // The building line, and the way out of it onto the pavement.
      const line = face === 's' ? r[3] : face === 'n' ? r[1] : face === 'e' ? r[2] : r[0], o = face === 's' || face === 'e' ? 1 : -1;
      const at = (u: number, d: number): [number, number] => (alongX ? [u, line + o * d] : [line + o * d, u]);
      const f: V2 = alongX ? [0, o] : [o, 0], uc = (u0 + u1) / 2, [cx, cz] = at(uc, 1);
      if (byExit(cx, cz, 3) || onRoad(cx, cz, 1.5) || canalWet(cx, cz) || u1 - u0 < 6) return;
      const lively = Math.hypot(cx - 36, cz) < 120;
      const put = (id: string, u: number, d: number) => { const [x, z] = at(u, d); if (!byExit(x, z, 1.5)) roadModel(b, id, x, GY, z, f); };
      const bikes = (u: number, n: number) => {
        for (let j = 0; j < n; j++) { const [x, z] = at(u + j * 0.62, 0.95); b.out.models.push({ kind: 'places', id: 'bicycle', pos: b.pt(x, GY, z), yaw: Math.atan2(-b.dir(f)[0], -b.dir(f)[1]), seed: 0, merge: true }); }
      };
      const pick = i % 3;
      if (lively && pick === 0 && u1 - u0 >= 9) {
        // A terrace: a canvas awning, tables and stools under it, a planter at each end.
        const a = u0 + 1.2, e = u1 - 1.2, mat = AWN[i % AWN.length];
        const [ax, az] = at(a, 0.02), [ex, ez] = at(e, 1.7);
        b.deco(mat, Math.min(ax, ex), GY + 2.75, Math.min(az, ez), Math.max(ax, ex), GY + 2.83, Math.max(az, ez));
        const [vx, vz] = at(a, 1.62);
        b.deco(mat, Math.min(vx, ex), GY + 2.5, Math.min(vz, ez), Math.max(vx, ex), GY + 2.75, Math.max(vz, ez));
        for (let u = a + 1.6; u < e - 1.2; u += 2.6) {
          const [x, z] = at(u, 1.0);
          b.mesh('metal:#3a3a3c', 'cyl', x, GY + 0.36, z, 0.08, 0.72, 0.08);
          b.mesh('flat:#e9e4d6', 'cyl', x, GY + 0.735, z, 0.7, 0.03, 0.7);
          for (const du of [-0.62, 0.62]) { const [qx, qz] = at(u + du, 1.0); b.mesh('flat:#5a4636', 'cyl', qx, GY + 0.225, qz, 0.34, 0.45, 0.34); }
          const [bx0, bz0] = at(u - 0.85, 0.6), [bx1, bz1] = at(u + 0.85, 1.4);
          b.block(Math.min(bx0, bx1), GY, Math.min(bz0, bz1), Math.max(bx0, bx1), GY + 0.75, Math.max(bz0, bz1));
        }
        put('planter', a + 0.2, 1.6);
        put('planter', e - 0.2, 1.6);
        put('menucase', a - 0.6, 0.5);
      } else if (lively && pick === 1) {
        put('aboard', uc - 1.5, 1.1);
        put('nobori', u0 + 0.8, 0.5);
        put('nobori', u1 - 0.8, 0.5);
        put('menucase', uc + 1.6, 0.5);
      } else if (lively) {
        bikes(u0 + 1.5, 4);
        put('planter', uc + 1.5, 0.7);
        put('aboard', u1 - 2, 1.1);
      } else if (i % 2 === 0) {
        put('aboard', uc, 1.1);
        if (i % 4 === 0) bikes(u0 + 1.5, 2 + (i % 3));
      }
    });
  }
  // A glass canopy over each of the metro's stairs on the pavements (the bank's portico covers its own).
  for (const r of exits) {
    const cx = (r[0] + r[2]) / 2, cz = (r[1] + r[3]) / 2;
    if ((cx > 29 && cx < 65 && cz < 0) || (cz > AV.sep && cx > 16 && cx < 72.5)) continue;
    const x0 = r[0] - 0.45, x1 = r[2] + 0.45, z0 = r[1] - 0.45, z1 = r[3] + 0.45, top = GY + 2.9;
    for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) b.box('metal:#3f4a4d', x - 0.07, GY, z - 0.07, x + 0.07, top, z + 0.07);
    b.deco('glass', x0 - 0.35, top + 0.06, z0 - 0.35, x1 + 0.35, top + 0.1, z1 + 0.35);
    for (const [a, c, e, g] of [[x0 - 0.35, z0 - 0.35, x1 + 0.35, z0 - 0.23], [x0 - 0.35, z1 + 0.23, x1 + 0.35, z1 + 0.35], [x0 - 0.35, z0 - 0.35, x0 - 0.23, z1 + 0.35], [x1 + 0.23, z0 - 0.35, x1 + 0.35, z1 + 0.35]]) b.deco('metal:#3f4a4d', a, top - 0.06, c, e, top + 0.12, g);
  }
  // Two kiosks on the avenue's pavements, against the building line.
  for (const [kx, s] of [[68.6, -1], [-48, 1]] as [number, 1 | -1][]) {
    let x = kx;
    while (byExit(x, s * 34.6, 3.2) || onRoad(x, s * 34.6, 2.5)) x -= 4;
    const zb = s * (AV.front - 0.25), zf = s * (AV.front - 2.25), za = s * (AV.front - 3.3);
    b.box('flat:#2c5e63', x - 1.6, GY, Math.min(zb, zf), x + 1.6, GY + 2.5, Math.max(zb, zf));
    b.deco('flat:#e9e4d6', x - 1.66, GY + 2.5, Math.min(zb, za), x + 1.66, GY + 2.62, Math.max(zb, za));
    b.deco('flat:#1c1f20', x - 1.3, GY + 0.95, zf - s * 0.02, x + 1.3, GY + 2.0, zf);
    b.deco('flat:#c9b27a', x - 1.45, GY + 0.85, zf - s * 0.32, x + 1.45, GY + 0.95, zf);
    b.sign({ k: 'label', text: '売店', sub: 'KIOSK', fg: '#ffffff', bg: '#2c5e63' }, x, GY + 2.25, zf - s * 0.03, [0, -s], 2.4, 0.42);
    for (const dx of [-1.9, 1.9]) roadModel(b, 'nobori', x + dx, GY, zf - s * 0.2, [0, -s]);
  }
}
