// Shiomi, stage 5 (2026-11-25): the everyday things on the streets, the waterfront's benches and buoys, the cycle path
// round the three promenades and over 潮見大橋, the breakwater and its lighthouse, the summer festival stalls on the
// greenway's promenade, and the boats that pass when the bridge opens (world-view.ts draws the moving and timed ones).
//
// A bay new town: its cables are underground, so there are no utility poles here (unlike the older districts).

import type { Builder, V2 } from '../world/builder';
import { rng } from '../world/builder';
import { SHIOMI as SA } from './anchors/shiomi';
import { GROUND_Y, vending } from './kit';
import { roadModel } from './roads';
import { SHIOMI_BRIDGE as BRG, SHIOMI_LINES as BL, SHIOMI_PLOT, SHIOMI_RESERVED, SHIOMI_SITES as SITE, SHIOMI_STREETS } from './shiomi-plan';
import type { Rect } from './looks/types';

const X = SHIOMI_PLOT.x, Z = SHIOMI_PLOT.z, N = SHIOMI_PLOT.north;
const SEA = -1.2;
/** The cycle path's paint and the names on its signs. */
export const CYCLE = { mat: 'paint:#2f6fb0', ja: '潮見ベイ サイクリングロード', en: 'Shiomi Bay cycle path' };
/** The cycle lanes on 潮見大橋's footways, out from its centre line (also painted on the leaves: shiomi-street.ts). */
export const BRIDGE_LANE: [number, number] = [7.4, 9.2];
export const LIGHTHOUSE = { ja: '潮見防波堤灯台', en: 'Shiomi Breakwater Lighthouse', x: -258, z: -342 };

export function shiomiExtras(b: Builder, seedBase: number) {
  const GY = GROUND_Y;
  const r = rng(seedBase + 77);
  const overlaps = (a: Rect, q: Rect) => a[0] < q[2] && a[2] > q[0] && a[1] < q[3] && a[3] > q[1];
  const free = (q: Rect) => !b.solidIn(q[0], GY + 0.1, q[1], q[2], GY + 1.6, q[3]);
  const pp = (id: string, x: number, z: number, f: V2, hw: number, hd: number, h: number) => {
    roadModel(b, id, x, GY, z, f);
    const [ax, az] = f[0] !== 0 ? [hd, hw] : [hw, hd];
    b.block(x - ax, GY, z - az, x + ax, GY + h, z + az);
  };
  const pmc = (id: string, x: number, z: number, f: V2, hw: number, hd: number, h: number) => {
    const rot = f[1] < 0 ? 0 : f[1] > 0 ? 2 : f[0] > 0 ? 1 : 3;
    b.with({ rot: rot as 0 | 1 | 2 | 3, t: [x, 0, z] }, () => b.model('mcenter', id, 0, GY, 0, 1));
    const [ax, az] = f[0] !== 0 ? [hd, hw] : [hw, hd];
    b.block(x - ax, GY, z - az, x + ax, GY + h, z + az);
  };

  // ═════ The streets: drinks machines and bins, parked bicycles, garbage stations, plants by doors, post boxes ═════
  {
    const keepOff: Rect[] = [
      ...SHIOMI_RESERVED.map((q) => q.r),
      [SITE.bus.x0 - 4, SITE.bus.z0 - 4, SITE.bus.x1 + 4, SITE.bus.z1 + 4],
      [-135, BL.bayS - 1, 80, 22],           // the station plaza, the strips by the cutting, the east forecourt
      [BRG.c - 14, Z - 14, BRG.c + 14, Z],
    ];
    let posts = 0, phones = 0;
    for (const st of SHIOMI_STREETS) {
      if (st.pave < 1.5) continue;
      const cross = SHIOMI_STREETS.filter((o) => o.axis !== st.axis);
      const lo = st.axis === 'x' ? -150 : -N, hi = st.axis === 'x' ? X : Z;
      const a0 = Math.max(lo, st.a0 ?? lo) + 8, a1 = Math.min(hi, st.a1 ?? hi) - 8;
      const main = st.half >= 7;
      for (const k of [-1, 1] as const) {
        const edge = st.c + k * (st.half + st.pave);
        const f: V2 = st.axis === 'x' ? [0, -k] : [-k, 0];
        for (let u = a0 + r() * 8; u < a1; u += 10 + r() * 14) {
          if (r() > 0.6) continue;
          const roll = r();
          const kind = main
            ? (roll < 0.35 ? 'vend' : roll < 0.55 ? 'bikes' : roll < 0.75 ? 'plants' : roll < 0.9 ? 'nobori' : 'post')
            : (roll < 0.3 ? 'vend' : roll < 0.55 ? 'bikes' : roll < 0.72 ? 'gomi' : roll < 0.9 ? 'plants' : 'post');
          const len = { vend: 2.8, bikes: 4.2, gomi: 1.4, plants: 1.8, nobori: 2.4, post: 1.0 }[kind];
          if (cross.some((o) => Math.abs(u + len / 2 - o.c) < o.half + o.pave + 5 && (o.a0 ?? -1e9) - 6 < st.c && (o.a1 ?? 1e9) + 6 > st.c)) continue;
          const d0 = edge - k * 1.0, d1 = edge - k * 0.08;
          const q: Rect = st.axis === 'x' ? [u, Math.min(d0, d1), u + len, Math.max(d0, d1)] : [Math.min(d0, d1), u, Math.max(d0, d1), u + len];
          if (keepOff.some((o) => overlaps(o, q)) || !free(q)) continue;
          // (A point `t` along the cluster, `n` in from the building line.)
          const P = (t: number, n: number): [number, number] => (st.axis === 'x' ? [u + t, edge - k * n] : [edge - k * n, u + t]);
          if (kind === 'vend') {
            const two = r() < 0.6;
            for (let i = 0; i < (two ? 2 : 1); i++) {
              const [x, z] = P(0.55 + i * 1.05, 0.42);
              vending(b, x, GY, z, f, r() < 0.5 ? 'vending' : 'vending2', 'new');
            }
            const [x, z] = P(two ? 2.45 : 1.4, 0.35);
            pp('recycle', x, z, f, 0.3, 0.25, 1.0);
          } else if (kind === 'bikes') {
            for (let t = 0.5; t < len - 0.3; t += 0.65) {
              if (r() < 0.25) continue;
              const [x, z] = P(t, 0.55);
              const yaw = st.axis === 'x' ? 0 : Math.PI / 2;
              b.out.models.push({ kind: 'places', id: 'bicycle', pos: b.pt(x, GY, z), yaw: yaw + (r() - 0.5) * 0.2, seed: 0, merge: true });
            }
            b.block(...(st.axis === 'x' ? [u, GY, Math.min(edge - k * 1.0, edge), u + len, GY + 1.0, Math.max(edge - k * 1.0, edge)] as const : [Math.min(edge - k * 1.0, edge), GY, u, Math.max(edge - k * 1.0, edge), GY + 1.0, u + len] as const));
          } else if (kind === 'gomi') {
            const [x, z] = P(0.7, 0.5);
            pp('gomist', x, z, f, 0.6, 0.45, 1.2);
          } else if (kind === 'plants') {
            const [x, z] = P(0.4, 0.3);
            pp('potpine', x, z, f, 0.3, 0.3, 1.2);
            const [x2, z2] = P(1.3, 0.3);
            pp(r() < 0.5 ? 'herbbox' : 'plantshelf', x2, z2, f, 0.4, 0.25, 0.9);
          } else if (kind === 'nobori') {
            for (const t of [0.4, 1.4, 2.2]) {
              const [x, z] = P(t, 0.2);
              pp('nobori', x, z, f, 0.1, 0.1, 2.6);
            }
          } else {
            if (posts < 4) {
              const [x, z] = P(0.5, 0.35);
              pp('postbox', x, z, f, 0.3, 0.3, 1.3);
              posts++;
            } else if (phones < 2 && st.pave >= 2.5) {
              const [x, z] = P(0.5, 0.55);
              pp('phonebox', x, z, f, 0.5, 0.5, 2.3);
              phones++;
            }
          }
        }
      }
    }
  }

  // ═════ The waterfront: benches facing the sea, lifebuoys on the sea wall, telescopes ═════
  const wallN = -N, wallW = SHIOMI_PLOT.arms[0][0];
  for (let x = wallW + 10; x < X - 4; x += 24) {
    if (x > -278 && x < -260) continue; // the marina's gangway
    if (free([x - 0.9, wallN + 0.7, x + 0.9, wallN + 1.5])) pp('bench_s', x, wallN + 1.1, [0, -1], 0.9, 0.3, 0.9);
    const bx = x + 12;
    if (Math.round((x - wallW) / 24) % 2 === 0 && bx < X - 4 && !(bx > -278 && bx < -260) && free([bx - 0.4, wallN + 0.6, bx + 0.4, wallN + 1.0])) pmc('buoy', bx, wallN + 0.75, [0, 1], 0.45, 0.15, 2.1);
  }
  for (const x of [-210, -90, 40]) if (free([x - 0.3, wallN + 1.8, x + 0.3, wallN + 2.5])) pmc('scope', x, wallN + 2.1, [0, -1], 0.25, 0.4, 1.5);
  for (let z = wallN + 14; z < -130; z += 24) {
    if (Math.abs(z + 200) < 6) continue; // the fishing pier
    if (free([wallW + 0.7, z - 0.9, wallW + 1.4, z + 0.9])) pp('bench_s', wallW + 1.05, z, [-1, 0], 0.9, 0.3, 0.9);
  }
  for (let x = -136; x < X - 4; x += 24) {
    if (x > BRG.c - 16 && x < BRG.c + 16) continue;
    if (free([x - 0.9, Z - 1.6, x + 0.9, Z - 0.8])) pp('bench_s', x, Z - 1.2, [0, 1], 0.9, 0.3, 0.9);
    const bx = x + 12;
    if (Math.round((x + 136) / 24) % 2 === 0 && !(bx > BRG.c - 16 && bx < BRG.c + 16) && free([bx - 0.4, Z - 1.0, bx + 0.4, Z - 0.6])) pmc('buoy', bx, Z - 0.75, [0, -1], 0.45, 0.15, 2.1);
  }

  // ═════ The cycle path: blue, edge lines, a dashed white centre; signs where it starts and along it ═════
  const PAINT_Y = GY + 0.016;
  const path = (axis: 'x' | 'z', c0: number, c1: number, a: number, e: number) => {
    const [p0, p1] = [Math.min(c0, c1), Math.max(c0, c1)], mid = (p0 + p1) / 2;
    if (axis === 'x') {
      b.deco(CYCLE.mat, a, PAINT_Y, p0, e, PAINT_Y + 0.006, p1);
      for (const zz of [p0 + 0.06, p1 - 0.06]) b.deco('paint:#f4f4f0', a, PAINT_Y + 0.006, zz - 0.05, e, PAINT_Y + 0.009, zz + 0.05);
      for (let u = a + 1; u < e - 1; u += 4) b.deco('paint:#f4f4f0', u, PAINT_Y + 0.006, mid - 0.04, u + 2, PAINT_Y + 0.009, mid + 0.04);
    } else {
      b.deco(CYCLE.mat, p0, PAINT_Y, a, p1, PAINT_Y + 0.006, e);
      for (const xx of [p0 + 0.06, p1 - 0.06]) b.deco('paint:#f4f4f0', xx - 0.05, PAINT_Y + 0.006, a, xx + 0.05, PAINT_Y + 0.009, e);
      for (let u = a + 1; u < e - 1; u += 4) b.deco('paint:#f4f4f0', mid - 0.04, PAINT_Y + 0.006, u, mid + 0.04, PAINT_Y + 0.009, u + 2);
    }
  };
  const cycleSign = (x: number, z: number, f: V2, sub = CYCLE.en) => {
    if (!free([x - 0.2, z - 0.2, x + 0.2, z + 0.2])) return;
    b.box('flat:#8d949b', x - 0.04, GY, z - 0.04, x + 0.04, GY + 2.0, z + 0.04);
    b.sign({ k: 'label', text: '自転車道', sub, fg: '#ffffff', bg: '#1f5fa8' }, x + f[0] * 0.05, GY + 2.3, z + f[1] * 0.05, f, 0.9, 0.5);
  };
  // North promenade (between its pines and lamps), the bay's (between the sea wall's benches and its pines), the
  // greenway's promenade on the river mouth, east and west of the bridge's avenue.
  const nz: [number, number] = [-290.9, -289.1], wx: [number, number] = [wallW + 1.7, wallW + 3.2], sz: [number, number] = [47.2, 49.0];
  path('x', nz[0], nz[1], wx[0], X);
  path('z', wx[0], wx[1], nz[1], -126);
  const xW = BRG.c - BRG.half - BRG.pave, xE = BRG.c + BRG.half + BRG.pave;
  path('x', sz[0], sz[1], -138, BRG.c - BRIDGE_LANE[0]);
  path('x', sz[0], sz[1], BRG.c + BRIDGE_LANE[0], X);
  // Up the bridge's footways (the leaves carry their own paint), on the land and the fixed spans.
  for (const k of [-1, 1]) {
    const [p0, p1] = [BRG.c + k * BRIDGE_LANE[0], BRG.c + k * BRIDGE_LANE[1]];
    for (const [a, e, y] of [[sz[0], Z, PAINT_Y], [Z, BRG.hinge[0], GY + 0.002], [BRG.hinge[1], BRG.z1, GY + 0.002]] as [number, number, number][]) {
      b.deco(CYCLE.mat, Math.min(p0, p1), y, a, Math.max(p0, p1), y + 0.006, e);
    }
  }
  void xW;
  void xE;
  cycleSign(wx[1] + 0.4, -127, [0, 1], `${CYCLE.en} — walk your bike past the aquarium`);
  cycleSign(-138.5, sz[1] + 0.4, [-1, 0], `${CYCLE.en} — walk your bike past the aquarium`);
  cycleSign(wx[1] + 0.4, nz[1] + 1.0, [1, 0]);
  for (const x of [-180, -60, 60]) cycleSign(x, nz[1] + 0.35, [0, 1]);
  for (const x of [-100, 60]) cycleSign(x, sz[0] - 0.35, [0, -1]);
  b.zone('street', -138, -0.3, sz[0], X, 6, sz[1], CYCLE.ja, CYCLE.en, true);

  // ═════ The breakwater off the marina and its lighthouse ═════
  {
    const W0 = wallW - 4.5, W1 = wallW - 0.5, Z0 = -344, Z1 = -340, END = LIGHTHOUSE.x + 4;
    const top = 1.2, CONC = 'flat:#b9b4a8', TET = 'flat:#a29e94';
    b.box(CONC, W0, SEA - 3, Z0, W1, top, wallN);
    b.box(CONC, W1, SEA - 3, Z0, END, top, Z1);
    b.box('flat:#cfcac0', W0 + 0.3, top, Z0 + 0.3, W1 - 0.3, top + 0.8, wallN - 0.2);
    b.box('flat:#cfcac0', W1 - 0.3, top, Z0 + 0.3, END - 0.3, top + 0.8, Z0 + 1.1);
    // Tetrapods heaped along the seaward faces.
    for (let z = Z0 - 1; z < wallN - 2; z += 1.6) for (const dx of [-1.4, -2.6]) {
      const s2 = 0.5 + r() * 0.35, x = W0 + dx + r() * 0.5, y = SEA - 0.4 + r() * 1.2;
      b.box(TET, x - s2, y - s2, z - s2, x + s2, y + s2, z + s2);
    }
    for (let x = W0 - 2; x < END + 2; x += 1.6) for (const dz of [-1.4, -2.6]) {
      const s2 = 0.5 + r() * 0.35, z = Z0 + dz + r() * 0.5, y = SEA - 0.4 + r() * 1.2;
      b.box(TET, x - s2, y - s2, z - s2, x + s2, y + s2, z + s2);
    }
    b.block(W0 - 3, -5, Z0 - 3, W1, 30, wallN);
    b.block(W1, -5, Z0 - 3, END + 3, 30, Z1 + 0.1);
    // The lighthouse at its end, round on a pad.
    b.box(CONC, END - 9, SEA - 3, Z0 - 1.5, END, top, Z1 + 1.5);
    b.with({ t: [LIGHTHOUSE.x, 0, LIGHTHOUSE.z] }, () => b.model('shiomi', 'lighthouse', 0, top, 0, 1));
    const lamp = SA.lighthouse?.pts.lamp;
    if (lamp) (b.out.flashers ?? (b.out.flashers = [])).push({ pos: b.pt(LIGHTHOUSE.x + lamp[0], top + lamp[1], LIGHTHOUSE.z + lamp[2]), period: 5, on: 0.6, r: 0.55, col: '#fff3d0' });
  }

  // ═════ The summer festival stalls (July–August evenings, world/timed.ts) on the greenway's promenade ═════
  {
    const stalls = b.out.stalls ?? (b.out.stalls = []);
    let kind = 0;
    for (const [a, e] of [[-112, -62], [12, 74]] as [number, number][]) {
      for (let x = a; x + 3.6 <= e; x += 4.4) {
        const front = sz[0] - 0.5;
        if (!free([x, front - 2.4, x + 3.6, front])) continue;
        stalls.push({ pos: b.pt(x + 1.8, GY, front), face: b.dir([0, 1]), w: 3.6, kind: kind++, when: 'festival' });
      }
    }
  }

  // ═════ The boats through 潮見大橋 when it opens (world-view.ts), mid-channel between its bascule piers ═════
  {
    const zc = (BRG.hinge[0] + BRG.hinge[1]) / 2;
    (b.out.boats ?? (b.out.boats = [])).push({ key: BRG.key, from: [-380, zc], to: [200, zc], y: SEA, ids: [['shiomi', 'tallship'], ['shiomi', 'cruiser'], ['shiomi', 'coaster']] });
  }
}
