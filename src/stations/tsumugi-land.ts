// Tsumugibashi's landmarks (the 2026-11-26 rebuild, stage 2b; the streets are tsumugi-canal.ts):
//   澪大橋 Mio-ōhashi, Yanagi-suji's 1932 stone bridge over the Mio-gawa, and the riverside terraces either side of it
//   川湊市公会堂 the Public Hall (1918) facing Yanagi-suji at the bridge's foot, 澪川ばら園 the rose garden across the road
//   取引所前広場 the station square before the Silk Exchange, with the Bobbin
//   綛堀船着場 the landing where 綛堀 Kase-bori meets Tsumugi-bori, and 絹蔵 the row of silk storehouses on its quay
//   紬橋歩道橋 the footbridge over the avenue, rebuilt smaller, into the Exchange's upper door
// Names are invented and web-checked (docs/worldbuilding.md). Models: tools/blender/build_exchange.py.

import type { Builder } from '../world/builder';
import { GROUND_Y as GY } from './kit';
import { bankStep, GANGI, MOUTH_K, MOUTH_T, RAIL_GAPS, SIDE_STAIRS } from './tsumugi-canal';
import { modelTree } from './trees';

type V2 = [number, number];
const STONE = 'flat:#b3a688', STONE_DK = 'flat:#7d7361', TEAL = 'flat:#3f7f86', PAVE = 'tile:#b9ab92';
const PROM = -2.0;

/** A flight of steps over a ramp, climbing towards `up` (a unit vector along x or z), with a low wall each side. */
function flight(b: Builder, x0: number, z0: number, x1: number, z1: number, yLow: number, yHigh: number, up: V2, mat = STONE, walls: [boolean, boolean] = [true, true]) {
  b.ramp(x0, z0, x1, z1, yLow, yHigh, up);
  const alongX = up[0] !== 0, run = alongX ? x1 - x0 : z1 - z0, n = Math.max(2, Math.round((yHigh - yLow) / 0.17));
  for (let i = 0; i < n; i++) {
    const top = yLow + ((i + 1) * (yHigh - yLow)) / n, t0 = (i * run) / n, t1 = ((i + 1) * run) / n;
    const pos = up[0] + up[1] > 0;
    const [a, e] = pos ? [t0, t1] : [run - t1, run - t0];
    if (alongX) b.deco(mat, x0 + a, yLow - 0.3, z0, x0 + e, top, z1);
    else b.deco(mat, x0, yLow - 0.3, z0 + a, x1, top, z0 + e);
  }
  const K = 6;
  for (let k = 0; k < K; k++) {
    const t0 = (k * run) / K, t1 = ((k + 1) * run) / K, pos = up[0] + up[1] > 0;
    const frac = pos ? (k + 1) / K : (K - k) / K, top = yLow + frac * (yHigh - yLow) + 1.0;
    walls.forEach((on, i) => {
      if (!on) return;
      if (alongX) { const z = i ? z1 : z0 - 0.12; b.block(x0 + t0, yLow, z, x0 + t1, top, z + 0.12); b.deco(mat, x0 + t0, yLow, z, x0 + t1, top, z + 0.12); }
      else { const x = i ? x1 : x0 - 0.12; b.block(x, yLow, z0 + t0, x + 0.12, top, z0 + t1); b.deco(mat, x, yLow, z0 + t0, x + 0.12, top, z0 + t1); }
    });
  }
}
const label = (b: Builder, text: string, sub: string, x: number, y: number, z: number, n: V2, w: number, h: number, fg = '#2a2019', bg = '#b08d3a') =>
  b.sign({ k: 'label', text, sub, fg, bg }, x, y, z, n, w, h);

export function canalLandmarks(b: Builder, station: string, doorX: number, f2: number, front: number) {
  b.open(() => {
    // ═══ 澪大橋: the stonework is a model; its pylons stand on the banks ═══
    const zs = (bankStep(-1) + bankStep(1)) / 2;
    b.model('exchange', 'gbridge', 0, GY, zs);
    for (const s of [-1, 1]) for (const z of [zs + 2.2, zs - 80.5 - 2.2]) b.block(Math.min(s * 16.5, s * 18.9), GY, z - 1.2, Math.max(s * 16.5, s * 18.9), GY + 5.4, z + 1.2);
    for (const s of [-1, 1]) label(b, '澪大橋', 'Mio-ōhashi', s * 17.7, GY + 2.2, zs + 3.42, [0, 1], 1.6, 0.5);

    // ═══ The lower promenade (the riverfront, 2026-11-26): a stone walk 0.8 m above the water along the whole bank,
    // 2.15 m below the river walk, in four stretches (the two bridges and the canal mouths between them) ═══
    const STRETCH: [number, number][] = [[-284, -222], [-200, -25], [25, 75], [104, 200]];
    const RAILM = 'metal:#2e3134', GLOW = 'glow:#ffdfae';
    /** A stretch cut at the bank's 25 m steps: x0, x1 and the bank's z. */
    const segs = (xa: number, xe: number) => {
      const out: [number, number, number][] = [];
      for (let x = xa; x < xe - 0.01;) { const e = Math.min(xe, -350 + (Math.floor((x + 350) / 25) + 1) * 25); out.push([x, e, bankStep(x + 0.5)]); x = e; }
      return out;
    };
    /** The rail at the water: a low stone wall with an iron rail on it, along x at z or along z at x. */
    const rail = (x0: number, z0: number, x1: number, z1: number) => {
      const ax = x1 - x0 > z1 - z0;
      const [a, c, e, g] = ax ? [x0, z0 - 0.1, x1, z0 + 0.1] : [x0 - 0.1, z0, x0 + 0.1, z1];
      b.block(a, PROM, c, e, PROM + 1.1, g);
      b.deco(STONE, a, PROM, c, e, PROM + 0.45, g);
      b.deco(GLOW, a + (ax ? 0 : 0.2), PROM + 0.38, c + (ax ? -0.02 : 0), e, PROM + 0.42, g - (ax ? 0.2 : 0));
      if (ax) { b.deco(RAILM, x0, PROM + 0.95, z0 - 0.03, x1, PROM + 1.02, z0 + 0.03); for (let u = x0 + 0.6; u < x1; u += 2.5) b.deco(RAILM, u - 0.04, PROM + 0.45, z0 - 0.04, u + 0.04, PROM + 0.95, z0 + 0.04); }
      else { b.deco(RAILM, x0 - 0.03, PROM + 0.95, z0, x0 + 0.03, PROM + 1.02, z1); for (let u = z0 + 0.6; u < z1; u += 2.5) b.deco(RAILM, x0 - 0.04, PROM + 0.45, u - 0.04, x0 + 0.04, PROM + 0.95, u + 0.04); }
    };
    /** Where the promenade's river edge is open or pushed out: the broad steps' bulges, the pier's gangway. */
    const BULGE = GANGI.map(([a, e]): [number, number] => [a - 2, e + 2]), PIER: [number, number] = [42.5, 45.5], BUS: [number, number] = [-64.5, -61.5];
    const open = [...BULGE, PIER, BUS];
    for (const [xa, xe] of STRETCH) {
      const parts = segs(xa, xe);
      parts.forEach(([x0, x1, z], k) => {
        b.box(PAVE, x0, -3.4, z - 5.4, x1, PROM, z - 0.4);
        b.deco('tile:#8f8676', x0, PROM, z - 0.9, x1, PROM + 0.004, z - 0.4);
        // The rail, in runs between the openings.
        let a = x0;
        for (const [p, q] of [...open.filter(([p, q]) => q > x0 && p < x1).sort((m, n) => m[0] - n[0]), [x1, x1] as [number, number]]) {
          if (p - a > 0.3) rail(a, z - 5.4, Math.min(p, x1), z - 5.4);
          a = Math.max(a, q);
        }
        // Where the bank steps, the promenade steps with it: a rail across the jog.
        const next = parts[k + 1];
        if (next && next[2] !== z) rail(x1, Math.min(z, next[2]) - 5.4, x1, Math.max(z, next[2]) - 5.4);
        for (let u = x0 + 6.25; u < x1 - 1; u += 12.5) if (!GANGI.some(([p, q]) => u > p - 1.5 && u < q + 1.5) && ![...SIDE_STAIRS.map(([p, q, d]) => (d > 0 ? [p, q + 7.5] : [p - 7.5, q])), [-36.5, -26], [26, 36.5]].some(([p, q]) => u > p - 0.8 && u < q + 0.8)) {
          b.model('exchange', 'lampstd', u, PROM, z - 1.0);
          b.block(u - 0.35, PROM, z - 1.35, u + 0.35, PROM + 1.2, z - 0.65);
        }
      });
      const [fa, , za] = parts[0], [, le, zl] = parts[parts.length - 1];
      rail(fa, za - 5.4, fa, za - 0.4);
      rail(le, zl - 5.4, le, zl - 0.4);
    }
    // Stone stairs along the bank up to the river walk: at the bridge's two south corners and two more (the parapet is open at their heads: RAIL_GAPS).
    const heads: [number, number, 1 | -1][] = [[RAIL_GAPS[0][0], RAIL_GAPS[0][2], -1], [RAIL_GAPS[1][0], RAIL_GAPS[1][2], 1], ...SIDE_STAIRS];
    for (const [top0, top1, d] of heads) {
      const z = bankStep((top0 + top1) / 2), foot = d < 0 ? top0 - 7 : top1 + 7;
      flight(b, Math.min(foot, d < 0 ? top0 : top1), z - 2.2, Math.max(foot, d < 0 ? top0 : top1), z - 0.4, PROM, GY, [-d as 1 | -1, 0], STONE, [true, false]);
      b.box(STONE, top0, PROM, z - 2.2, top1, GY, z - 0.4);
    }
    // 雁木 the broad steps down to the water's walk, the promenade pushed out before each; lit under the nosing of every third step.
    GANGI.forEach(([a, e], gi) => {
      const z = bankStep(a + 0.5);
      flight(b, a, z - 4.3, e, z - 0.4, PROM, GY, [0, 1], STONE, [true, true]);
      for (let k = 1; k < 4; k++) b.deco(GLOW, a + 0.2, PROM + (k * (GY - PROM)) / 4 - 0.03, z - 4.3 + (k * 3.9) / 4 - 0.02, e - 0.2, PROM + (k * (GY - PROM)) / 4, z - 4.3 + (k * 3.9) / 4);
      b.box(PAVE, a - 2, -3.4, z - 7.6, e + 2, PROM, z - 5.4);
      rail(a - 2, z - 7.6, a - 2, z - 5.4);
      rail(e + 2, z - 7.6, e + 2, z - 5.4);
      if (gi !== 1) { rail(a - 2, z - 7.6, e + 2, z - 7.6); return; }
      // ═══ 澪川水上舞台 the river stage before the Public Hall: the steps are its seats ═══
      const s0 = a + 3, s1 = e - 3, zf = z - 7.6, zb = z - 12.2, SY = PROM + 0.3;
      rail(a - 2, zf, s0, zf);
      rail(s1, zf, e + 2, zf);
      b.ramp(s0, zf - 0.6, s1, zf, PROM, SY, [0, -1]);
      b.deco(STONE, s0, PROM, zf - 0.6, s1, PROM + 0.15, zf - 0.3);
      b.box('tile:#a89a80', s0, -3.4, zb, s1, SY, zf - 0.6);
      rail(s0, zb + 0.1, s0, zf - 0.6);
      rail(s1, zb + 0.1, s1, zf - 0.6);
      for (const x of [s0 + 0.4, s1 - 0.4]) for (const zz of [zb + 0.4, zf - 1.2]) { b.box(RAILM, x - 0.09, SY, zz - 0.09, x + 0.09, SY + 3.6, zz + 0.09); }
      b.deco('flat:#5f8f7d', s0 - 0.2, SY + 3.6, zb - 0.2, s1 + 0.2, SY + 3.78, zf - 0.6);
      b.deco(GLOW, s0 + 0.5, SY + 3.56, zb + 0.5, s1 - 0.5, SY + 3.6, zb + 0.7);
      b.deco(GLOW, s0 + 0.5, SY + 3.56, zf - 1.4, s1 - 0.5, SY + 3.6, zf - 1.2);
      b.block(s0, SY, zb - 0.1, s1, SY + 1.1, zb + 0.1);
      b.deco(STONE, s0, SY, zb - 0.1, s1, SY + 0.45, zb + 0.1);
      label(b, '澪川水上舞台', 'Miogawa River Stage', (s0 + s1) / 2, SY + 3.3, zf - 0.72, [0, 1], 3.2, 0.4, '#e9e4d6', '#3d5a52');
    });
    // ═══ Boats and landings: the pleasure boats' pier by the hall, the water bus below the rose garden, skiffs at the canal mouths ═══
    const WATER_Y = -2.8;
    const pontoon = (x0: number, x1: number, gang: [number, number], text: string, sub: string) => {
      const z = bankStep((x0 + x1) / 2), PY = PROM - 0.35;
      b.box('flat:#6b6f72', x0, -3.1, z - 8.2, x1, PY, z - 5.7);
      b.ramp(gang[0], z - 6.6, gang[1], z - 5.4, PY, PROM, [0, 1]);
      b.deco('metal:#8d9399', gang[0], PY - 0.02, z - 6.6, gang[1], PY + 0.01, z - 5.4);
      for (const x of [x0 + 0.3, x1 - 0.3]) { b.mesh('flat:#3a3f44', 'cyl', x, PY + 0.2, z - 8.0, 0.3, 1.6, 0.3); }
      for (const x of gang) rail(x, z - 6.4, x, z - 5.4);
      b.box(RAILM, x1 - 0.5, PY, z - 6.0, x1 - 0.4, PY + 2.6, z - 5.9);
      for (const f of [-1, 1] as const) label(b, text, sub, x1 - 0.45, PY + 2.2, z - 5.95 + f * 0.06, [0, f], 2.0, 0.6, '#ffffff', '#1f5fae');
      return z;
    };
    {
      const z = pontoon(38.5, 49.5, PIER, '公会堂前船着場', 'Kōkaidō-mae Landing — pleasure boats');
      b.model('exchange', 'yakata', 44, WATER_Y, z - 10.0);
    }
    {
      const z = pontoon(-72, -54, BUS, '水上バス 紬橋', 'Water Bus — Tsumugibashi');
      b.model('exchange', 'waterbus', -63, WATER_Y, z - 10.5);
    }
    for (const [x, z] of [[-218.5, MOUTH_K[1] - 4], [-211.5, MOUTH_K[3] + 6], [89, MOUTH_T[1] - 4.5], [95.5, MOUTH_T[3] + 8]]) b.model('exchange', 'rowboat', x, WATER_Y, z);
    {
      // A second pleasure boat lies off the east stretch's steps.
      const z = bankStep(160);
      b.model('exchange', 'yakata', 176, WATER_Y, z - 8.2);
    }
    // ═══ The river walk's edge: stone piers along the parapet every 5 m, a bronze standard on every third ═══
    for (let x0 = -275; x0 < 200; x0 += 25) {
      const z = bankStep(x0 + 0.5);
      for (let x = x0 + 2.5, k = 0; x < x0 + 25; x += 5, k++) {
        if (Math.abs(x) < 21 || x < -284 || (x > -223.5 && x < -206.5) || (x > 78.5 && x < 105.5) || RAIL_GAPS.some((g) => x > g[0] - 0.6 && x < g[2] + 0.6)) continue;
        b.box(STONE, x - 0.32, GY, z - 0.46, x + 0.32, GY + 1.15, z + 0.18);
        b.deco(STONE_DK, x - 0.4, GY + 1.15, z - 0.54, x + 0.4, GY + 1.25, z + 0.26);
        if ((k + Math.round(x0 / 25)) % 3 === 0) b.model('exchange', 'lampstd', x, GY + 1.25, z - 0.14);
      }
    }
    // ═══ The canal mouths: the river walk crosses each on a stone footbridge; 紬堀口常夜灯 the old harbour light at Tsumugi-bori's ═══
    b.model('exchange', 'arch14', (MOUTH_K[0] + MOUTH_K[2]) / 2, GY, (MOUTH_K[1] + MOUTH_K[3]) / 2);
    b.model('exchange', 'arch24', (MOUTH_T[0] + MOUTH_T[2]) / 2, GY, (MOUTH_T[1] + MOUTH_T[3]) / 2);
    for (const [m, text, sub] of [[MOUTH_K, '綛堀口橋', 'Kasebori-guchi-bashi'], [MOUTH_T, '紬堀口橋', 'Tsumugibori-guchi-bashi']] as [number[], string, string][]) {
      label(b, text, sub, m[0] - 0.42, GY + 0.9, m[3] - 0.15, [-1, 0], 0.7, 0.4, '#e9e4d6', '#4a4f46');
      label(b, text, sub, m[2] + 0.42, GY + 0.9, m[1] + 0.15, [1, 0], 0.7, 0.4, '#e9e4d6', '#4a4f46');
    }
    {
      const x = MOUTH_T[0] - 3.2, z = MOUTH_T[3] + 2.6;
      b.model('exchange', 'joyato', x, GY, z);
      b.block(x - 1.3, GY, z - 1.3, x + 1.3, GY + 5.4, z + 1.3);
      label(b, '紬堀口常夜灯', 'Tsumugi-bori harbour light, 1871', x, GY + 0.52, z + 1.07, [0, 1], 1.4, 0.3, '#e9e4d6', '#4a4f46');
    }
    // ═══ 澪大橋 dressed: a standard at the middle of each span, stone bands across the pavements, the plates ═══
    for (const s of [-1, 1]) {
      for (const t of [13.4, 40.25, 67.1]) {
        b.model('exchange', 'lampstd', s * 14.9, GY, zs - t);
        b.block(s * 14.9 - 0.35, GY, zs - t - 0.35, s * 14.9 + 0.35, GY + 1.2, zs - t + 0.35);
      }
      for (let t = 4; t < 80; t += 8) b.deco('tile:#6f675b', Math.min(s * 10, s * 15.6), GY, zs - t - 0.2, Math.max(s * 10, s * 15.6), GY + 0.004, zs - t + 0.2);
      b.deco('tile:#6f675b', Math.min(s * 10, s * 10.4), GY, zs - 80.5, Math.max(s * 10, s * 10.4), GY + 0.005, zs);
      label(b, '澪大橋', 'Mio-ōhashi', s * 17.7, GY + 2.2, zs - 80.5 - 3.42, [0, -1], 1.6, 0.5);
      label(b, '昭和七年三月竣工', 'Completed March 1932', s * 17.7, GY + 1.45, zs + 3.42, [0, 1], 1.5, 0.34, '#2a2019', '#8a6f3a');
    }
  });

  // ═══ 川湊市公会堂: front on Yanagi-suji (x 24, facing west), the river along its north side ═══
  const PH = { x: 24, z: -385, w: 36, d: 46, h: 21 };
  b.open(() => b.with({ rot: 3, t: [PH.x, 0, PH.z] }, () => {
    b.model('exchange', 'pubhall', 0, GY, 0);
    b.block(-PH.w / 2, GY, 0, PH.w / 2, GY + PH.h, PH.d);
    b.block(-7.5, GY, -1.6, 7.5, GY + PH.h, 0);
    label(b, '川湊市公会堂', 'KAWAMINATO PUBLIC HALL', 0, GY + 5.05, -2.13, [0, -1], 9, 0.42, '#2a2622', '#d8cfbd');
    // Floodlights at the foot of the front and along the river side (the riverfront, 2026-11-26).
    for (let x = -15; x <= 15; x += 6) { b.deco('flat:#2e3134', x - 0.22, GY, -3.1, x + 0.22, GY + 0.18, -2.7); b.deco('glow:#ffdfae', x - 0.16, GY + 0.18, -3.04, x + 0.16, GY + 0.22, -2.76); }
    for (let z = 4; z <= 42; z += 7.6) { b.deco('flat:#2e3134', -PH.w / 2 - 1.0, GY, z - 0.22, -PH.w / 2 - 0.6, GY + 0.18, z + 0.22); b.deco('glow:#ffdfae', -PH.w / 2 - 0.94, GY + 0.18, z - 0.16, -PH.w / 2 - 0.66, GY + 0.22, z + 0.16); }
  }));
  // Its forecourt on the avenue: stone paving, two flagpoles, zelkovas along the riverside street.
  b.deco('tile:#c9bfa8', 16.2, GY, PH.z - 20, PH.x - 1.7, GY + 0.006, PH.z + 20);
  for (const dz of [-12, 12]) { b.mesh('metal:#c9ccd0', 'cyl', 19, GY + 5, PH.z + dz, 0.14, 10, 0.14); b.block(18.9, GY, PH.z + dz - 0.1, 19.1, GY + 10, PH.z + dz + 0.1); }
  for (let x = 30; x < 72; x += 10) modelTree(b, 'zelkova', x, PH.z + PH.w / 2 + 5, 'a', GY, true);

  // ═══ 澪川ばら園: a formal rose garden between the riverside street and the bank ═══
  {
    const G = { x0: -122, x1: -24, z0: -412, z1: -351 }, cx = (G.x0 + G.x1) / 2, cz = (G.z0 + G.z1) / 2;
    const HEDGE = 'flat:#3f6b3a', SOIL = 'flat:#5b4636', GRAVEL = 'flat:#d8ceb8', ROSES = ['#b5202e', '#e58aa5', '#f1d46b', '#f4efe6', '#d9543c'];
    b.deco(GRAVEL, G.x0, GY, G.z0, G.x1, GY + 0.008, G.z1);
    // The hedge round it, open at the middle of each side.
    const gate = 2.5;
    for (const z of [G.z0, G.z1 - 0.7]) for (const [p, q] of [[G.x0, cx - gate], [cx + gate, G.x1]]) { b.block(p, GY, z, q, GY + 1.0, z + 0.7); b.deco(HEDGE, p, GY, z, q, GY + 1.0, z + 0.7); }
    for (const x of [G.x0, G.x1 - 0.7]) for (const [p, q] of [[G.z0, cz - gate], [cz + gate, G.z1]]) { b.block(x, GY, p, x + 0.7, GY + 1.0, q); b.deco(HEDGE, x, GY, p, x + 0.7, GY + 1.0, q); }
    // Beds in four quarters, long rows with a walk between; each row one colour.
    let k = 0;
    for (const [qa, qe] of [[G.x0 + 4, cx - 7], [cx + 7, G.x1 - 4]]) for (const [pa, pe] of [[G.z0 + 4, cz - 7], [cz + 7, G.z1 - 4]]) {
      for (let z = pa; z + 3 <= pe; z += 5.2) {
        b.block(qa, GY, z, qe, GY + 0.5, z + 3);
        b.deco(STONE, qa, GY, z, qe, GY + 0.22, z + 3);
        b.deco(SOIL, qa + 0.2, GY + 0.22, z + 0.2, qe - 0.2, GY + 0.27, z + 2.8);
        const col = ROSES[k++ % ROSES.length];
        for (let x = qa + 0.9; x < qe - 0.6; x += 1.3) for (const dz of [0.9, 2.1]) {
          b.deco(HEDGE, x - 0.38, GY + 0.27, z + dz - 0.38, x + 0.38, GY + 0.8, z + dz + 0.38);
          b.deco(`flat:${col}`, x - 0.3, GY + 0.8, z + dz - 0.3, x + 0.3, GY + 0.92, z + dz + 0.3);
        }
      }
    }
    // The fountain at the crossing of the walks, a pergola along the river side, dogwoods at the corners.
    b.mesh(STONE, 'cyl', cx, GY + 0.3, cz, 8, 0.6, 8);
    b.mesh('water', 'cyl', cx, GY + 0.56, cz, 7.2, 0.1, 7.2);
    b.mesh(STONE_DK, 'cyl', cx, GY + 1.1, cz, 0.7, 1.6, 0.7);
    b.mesh(STONE, 'cyl', cx, GY + 1.95, cz, 2.2, 0.16, 2.2);
    b.block(cx - 4, GY, cz - 4, cx + 4, GY + 0.9, cz + 4);
    for (let x = G.x0 + 8; x <= G.x1 - 8; x += 4) {
      for (const z of [G.z0 + 1.6, G.z0 + 4.0]) { b.deco('wood:#4a3324', x - 0.09, GY, z - 0.09, x + 0.09, GY + 2.6, z + 0.09); }
      b.deco('wood:#4a3324', x - 0.07, GY + 2.6, G.z0 + 1.2, x + 0.07, GY + 2.74, G.z0 + 4.4);
    }
    for (const z of [G.z0 + 1.6, G.z0 + 4.0]) b.deco('wood:#4a3324', G.x0 + 7.6, GY + 2.46, z - 0.08, G.x1 - 7.6, GY + 2.6, z + 0.08);
    for (const [x, z] of [[G.x0 + 2.2, G.z1 - 2.4], [G.x1 - 2.2, G.z1 - 2.4], [cx - 9, cz - 9], [cx + 9, cz + 9], [cx - 9, cz + 9], [cx + 9, cz - 9]]) modelTree(b, 'dogwood', x, z, 'a', GY, false);
    label(b, '澪川ばら園', 'Miogawa Rose Garden', cx + gate + 2.2, GY + 0.75, G.z1 + 0.02, [0, 1], 2.6, 0.5, '#f4efe6', '#3f6b3a');
  }

  // ═══ 取引所前広場: the station square before the Exchange (x 16 … 72.5, z 16 … 36.5), the Bobbin at its heart ═══
  {
    const S = { x0: 16.2, x1: 72.3, z0: 16.1, z1: front - 0.1 };
    b.deco('tile:#c9bfa8', S.x0, GY, S.z0, S.x1, GY + 0.006, S.z1);
    for (let x = S.x0; x <= S.x1; x += 8) b.deco('tile:#8d8371', x, GY + 0.006, S.z0, x + 0.3, GY + 0.01, S.z1);
    for (const z of [S.z0, (S.z0 + S.z1) / 2 - 0.15, S.z1 - 0.3]) b.deco('tile:#8d8371', S.x0, GY + 0.006, z, S.x1, GY + 0.01, z + 0.3);
    const mx = 30, mz = 25.5;
    b.block(mx - 1.4, GY, mz - 1.4, mx + 1.4, GY + 4.6, mz + 1.4);
    b.deco('flat:#6f6453', mx - 1.8, GY, mz - 1.8, mx + 1.8, GY + 0.25, mz + 1.8);
    b.deco('flat:#6f6453', mx - 1.4, GY + 0.25, mz - 1.4, mx + 1.4, GY + 1.3, mz + 1.4);
    for (const [y, d, h] of [[1.3, 2.2, 0.22], [1.52, 0.9, 2.4], [3.92, 2.2, 0.22], [4.14, 0.35, 0.5]]) b.mesh(y === 1.52 ? 'flat:#c9962e' : 'metal:#5a4326', 'cyl', mx, GY + y + h / 2, mz, d, h, d);
    for (let j = 0; j < 9; j++) b.mesh('metal:#5a4326', 'cyl', mx, GY + 1.7 + j * 0.26, mz, 0.94, 0.03, 0.94);
    label(b, '糸巻きの像', 'The Bobbin — Exchange Square', mx, GY + 0.8, mz - 1.42, [0, -1], 1.9, 0.5);
    // The taxi bay's kerb line (the bay itself is cut from the roadway's separator: tsumugi-canal.ts), zelkovas.
    b.deco('flat:#e6a700', 22, 0.004, 15.75, 58, 0.01, 15.9);
    for (let x = 22; x <= 62; x += 10) if (Math.abs(x - mx) > 4) modelTree(b, 'zelkova', x, 18.6, 'a', GY, true);
  }

  // ═══ 綛堀船着場 and 絹蔵: stone steps into Kase-bori, five storehouses on the quay behind ═══
  b.open(() => {
    const L = RAIL_GAPS[2], wz = -150;
    flight(b, L[0], wz - 6, L[2], wz, -2.6, GY, [0, 1], STONE, [false, false]);
    b.box(STONE, L[0] - 1, -3.4, wz - 8.4, L[2] + 1, -2.6, wz - 6);
    for (const x of [L[0] - 0.5, L[2] + 0.5]) { b.mesh(STONE_DK, 'cyl', x, -2.2, wz - 7.9, 0.4, 0.8, 0.4); b.block(x - 0.25, -2.6, wz - 8.15, x + 0.25, -1.6, wz - 7.65); }
    for (const x of [L[0], L[2] - 0.3]) { b.block(x, GY, wz - 0.4, x + 0.3, GY + 1.1, wz); }
    label(b, '綛堀船着場', 'Kase-bori Landing', (L[0] + L[2]) / 2 - 10.5, GY + 0.62, wz + 0.02, [0, 1], 2.2, 0.5);
    for (let k = 0; k < 5; k++) {
      const x = 26 + k * 10.4;
      b.model('exchange', 'kura', x, GY, -146.5);
      b.block(x - 4.8, GY, -146.5, x + 4.8, GY + 8.7, -135.5);
    }
  });

  // ═══ 紬橋歩道橋: one span over the avenue from the bank's corner to the Exchange's gallery door ═══
  {
    const DECK = GY + 6.0, F2 = GY + f2, x0 = doorX - 1.5, x1 = doorX + 1.5, zN = -30, zR = 16, zD = front - 0.1;
    const GREY = 'flat:#9d9a92';
    const rail = (xa: number, za: number, xe: number, ze: number, y: number) => {
      b.block(xa, y, za, xe, y + 1.15, ze);
      b.deco(TEAL, xa, y - 0.5, za, xe, y + 0.12, ze);
      b.deco('flat:#2c5e63', xa, y + 1.06, za, xe, y + 1.14, ze);
      const alongZ = ze - za > xe - xa;
      for (let u = alongZ ? za : xa; u < (alongZ ? ze : xe); u += 1.5) {
        if (alongZ) b.deco(TEAL, xa, y, u, xe, y + 1.06, u + 0.06);
        else b.deco(TEAL, u, y, za, u + 0.06, y + 1.06, ze);
      }
    };
    // The level span, and the ramp down (1 in 14) to the gallery door.
    b.box(GREY, x0, DECK - 0.35, zN, x1, DECK, zR);
    b.ramp(x0, zR, x1, zD - 3, F2, DECK, [0, -1]);
    const N = 12;
    for (let k = 0; k < N; k++) {
      const za = zR + (k * (zD - 3 - zR)) / N, ze = zR + ((k + 1) * (zD - 3 - zR)) / N, y = DECK - ((k + 0.5) / N) * (DECK - F2);
      b.deco(GREY, x0, y - 0.3, za, x1, y, ze);
      for (const x of [x0 - 0.1, x1]) rail(x, za, x + 0.1, ze, y);
    }
    b.box(GREY, x0, F2 - 0.3, zD - 3, x1, F2, zD + 0.6);
    for (const x of [x0 - 0.1, x1]) rail(x, zD - 3, x + 0.1, zD, F2);
    // Stairs west from each end of the span, down to the pavement and to the square.
    for (const [za, ze] of [[zN, zN + 2.5], [zR - 2.5, zR]]) {
      flight(b, x0 - 13, za, x0, ze, GY, DECK, [1, 0], GREY);
      for (const u of [x0 - 8.6, x0 - 4.3]) b.deco(TEAL, u - 0.15, GY, (za + ze) / 2 - 0.15, u + 0.15, DECK - 2, (za + ze) / 2 + 0.15);
    }
    rail(x1, zN, x1 + 0.1, zR, DECK);
    rail(x0 - 0.1, zN + 2.5, x0, zR - 2.5, DECK);
    rail(x0, zN - 0.1, x1, zN, DECK);
    // Its legs in the avenue's separators.
    for (const z of [-14, 14]) for (const x of [x0 + 0.3, x1 - 0.3]) { b.block(x - 0.25, GY, z - 0.25, x + 0.25, DECK - 0.35, z + 0.25); b.deco(TEAL, x - 0.25, GY, z - 0.25, x + 0.25, DECK - 0.35, z + 0.25); }
    b.deco(TEAL, x0, DECK - 0.75, -14.2, x1, DECK - 0.35, -13.8);
    b.deco(TEAL, x0, DECK - 0.75, 13.8, x1, DECK - 0.35, 14.2);
    for (const s of [-1, 1]) b.sign({ k: 'label', text: '紬橋歩道橋', sub: 'Tsumugibashi Footbridge', fg: '#ffffff', bg: '#3f7f86' }, s < 0 ? x0 - 0.12 : x1 + 0.12, DECK + 0.1, 0, [s, 0], 5, 0.42);
    b.zone('passage', x0 - 13, DECK - 0.2, zN, x1, DECK + 3.2, zR, '紬橋歩道橋', 'Tsumugibashi Footbridge', true);
    void station;
  }
}
