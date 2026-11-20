// Station look: Minamihorie (南堀江), Yanagisuji Line, 1933. A pre-war shopping arcade underground.
//
// The ticket hall is a 1930s Art Deco arcade: cream terrazzo underfoot with brass sunburst inlays,
// cream glazed tile over a black dado with brass bands, three railed light wells down onto the
// platform under a frosted glass barrel, big Deco clocks over the gates, a round brass information
// kiosk, a ceiling of stepped coffers each holding a frosted glass lamp, teal
// columns with stepped cream capitals and chrome flutes, and a row of small boutique windows down
// both walls of the paid area (hats, watches, pâtisserie, flowers, opticians, a kissaten), one of
// which, Horie-dō Books & Stationery, you can walk into where the ground behind the wall is free.
// The platform gets teal column casings and chrome-and-teal sunburst mosaics; every exit has its
// own Deco street entrance: chrome speed lines, cream faience, a glass fan canopy, a stone sunburst.

import type { HallInfo } from '../themes/types';
import {
  batten, bench, endDado, exitDado, exitHandrails, passageDado, passageRails, shopFront, wallDado,
  type Brand, type DadoOpts, type Wall,
} from './parts';
import type { ConcInfo, ExitInfo, StationLook } from './types';

const TEAL = '#2f7f7a';
const BRASS = 'metal:#b8902f';
const CREAM = 'paint:#efe6d2';
const CREAM_DK = 'paint:#d9ccb0';
const IRON = 'flat:#26292b';
const FROST = 'glow:#fff3dc';

/** Walls: a teal tile dado with a chrome cap, chrome lines high up. */
const P: DadoOpts = { mat: 'tile:#141416', top: 1.05, cap: BRASS, skirting: 'flat:#1f2a2a', frieze: BRASS, friezeY: [2.42, 2.45] };

/** The arcade's boutiques (invented; docs/worldbuilding.md), in the order they go up the walls. */
const BOUTIQUES: { brand: Brand; w: number; door?: boolean }[] = [
  { brand: { ja: '帽子 マロン', en: 'Chapeau Marron Hats', bg: '#5a3a29', fg: '#f6e7c8', kind: 'goods' }, w: 3.2 },
  { brand: { ja: '文具と本 ほりえ堂', en: 'Horie-dō Books & Stationery', bg: '#1f3a4a', fg: '#efe6d2', kind: 'books' }, w: 6.2 },
  { brand: { ja: '時計店 秒針堂', en: 'Byōshin-dō Watches', bg: '#1a1a1c', fg: '#d9c27a', kind: 'goods' }, w: 3.0 },
  { brand: { ja: '洋菓子 ルミエール', en: 'Pâtisserie Lumière', bg: '#f4e9e2', fg: '#8a3a4a', kind: 'sweets' }, w: 3.6 },
  { brand: { ja: '喫茶 ドーム', en: 'Kissa Dōmu', bg: TEAL, fg: '#fff', kind: 'cafe' }, w: 4.0 },
  { brand: { ja: '花 ほりえ', en: 'Hana Horie Flowers', bg: '#e8f0e4', fg: '#2e6b35', kind: 'flowers' }, w: 3.0 },
  { brand: { ja: '眼鏡 レンズ堂', en: 'Lens-dō Opticians', bg: '#f4f1e8', fg: '#1f3a4a', kind: 'goods' }, w: 3.0 },
  { brand: { ja: '雑貨 ルナ', en: 'Luna Zakka', bg: '#2a2f4a', fg: '#e8d9a0', kind: 'goods' }, w: 3.4 },
  { brand: { ja: '洋品店 銀杏', en: 'Ichō Haberdashery', bg: '#d9c27a', fg: '#2a2019', kind: 'goods' }, w: 3.2 },
  { brand: { ja: '紅茶 アールグレイ', en: 'Earl Grey Tea Room', bg: '#3a2a3a', fg: '#f4e9e2', kind: 'cafe' }, w: 3.6 },
];

const spineWells = (i: ConcInfo) => i.stairwells.filter((w) => w.room < 0);
/** True if a ceiling fitting x0 … x1 × z0 … z1 would hang over a stairwell, a gate line or an exit doorway. */
function overBusy(i: ConcInfo, x0: number, z0: number, x1: number, z1: number) {
  return spineWells(i).some((w) => w.footprint[0] < x1 + 0.4 && w.footprint[2] > x0 - 0.4 && w.footprint[1] < z1 + 0.4 && w.footprint[3] > z0 - 0.4)
    || i.ends.some((e) => Math.abs(e.g - (x0 + x1) / 2) < 3.8);
}

/** A stepped Deco coffer in the ceiling with a frosted lamp in it, w × d, centred on (x, z). */
function coffer(i: ConcInfo, x: number, z: number, w: number, d: number) {
  const { b } = i, top = i.cf + i.clear;
  for (const [k, mat] of [[0, CREAM_DK], [1, CREAM], [2, BRASS]] as [number, string][]) {
    const iw = w / 2 - k * 0.18, id = d / 2 - k * 0.14, y = top - 0.06 - k * 0.05;
    for (const [ax0, az0, ax1, az1] of [[-iw, -id, iw, -id + 0.1], [-iw, id - 0.1, iw, id], [-iw, -id, -iw + 0.1, id], [iw - 0.1, -id, iw, id]]) {
      b.deco(mat, x + ax0, y, z + az0, x + ax1, top, z + az1);
    }
  }
  b.deco(FROST, x - w / 2 + 0.62, top - 0.04, z - d / 2 + 0.5, x + w / 2 - 0.62, top - 0.02, z + d / 2 - 0.5);
  b.deco('light', x - w / 2 + 0.7, top - 0.045, z - 0.02, x + w / 2 - 0.7, top - 0.04, z + 0.02);
}

/** The arcade: boutique windows up both walls of the paid area, a bench between the columns. */
function arcade(i: ConcInfo) {
  let n = 0;
  for (const s of [-1, 1] as Wall[]) {
    let x = i.paid[0] + 0.4;
    while (x < i.paid[1] - 2.5 && n < BOUTIQUES.length * 2) {
      const shop = BOUTIQUES[n % BOUTIQUES.length];
      // The bookshop only once (it may become a room); later passes skip it.
      if (n >= BOUTIQUES.length && shop.brand.kind === 'books') {
        n++;
        continue;
      }
      const x1 = Math.min(x + shop.w, i.paid[1] - 0.4);
      if (x1 - x >= 2.4 && shopFront(i, { s, x0: x, x1, brand: shop.brand, front: 'glazed', depth: 0.45, clear: 1.3, body: CREAM, awning: false })) {
        // Chrome speed lines on the fascia's ends.
        n++;
        x = x1 + 0.3;
      } else x += 0.5;
    }
  }
  for (const [px] of i.pillars.filter(([, pz]) => pz > 0)) bench(i, px + 2.4, 0, { axis: 'x', len: 1.8, color: TEAL });
}

// ── Light wells, the glass barrel, inlays, clocks, the kiosk ─────────────────────────────────

/** The light wells in the arcade floor, as specs.ts `voids` (keep the two in step). */
const VOIDS: [number, number, number, number][] = [[-4.6, -1.4, -1.8, 1.4], [-1.0, -1.4, 1.0, 1.4], [1.8, -1.4, 4.6, 1.4]];
const BLACK = 'paint:#141416';

/** Brass caps and black kick plates on the wells' glass rails, a brass frame in the floor round each. */
function wellTrim(i: ConcInfo) {
  const { b, cf } = i;
  for (const [x0, z0, x1, z1] of VOIDS) {
    const t = 0.08;
    for (const [a, c, d, e] of [[x0 - t, z0 - t, x1 + t, z0], [x0 - t, z1, x1 + t, z1 + t], [x0 - t, z0, x0, z1], [x1, z0, x1 + t, z1]]) {
      b.deco(BRASS, a - 0.035, cf + 1.08, c - 0.035, d + 0.035, cf + 1.13, e + 0.035);
      b.deco(BLACK, a - 0.01, cf, c - 0.01, d + 0.01, cf + 0.12, e + 0.01);
    }
    for (const [a, c, d, e] of [[x0 - 0.45, z0 - 0.45, x1 + 0.45, z0 - 0.4], [x0 - 0.45, z1 + 0.4, x1 + 0.45, z1 + 0.45], [x0 - 0.45, z0 - 0.4, x0 - 0.4, z1 + 0.4], [x1 + 0.4, z0 - 0.4, x1 + 0.45, z1 + 0.4]]) {
      b.deco(BRASS, a, cf + 0.002, c, d, cf + 0.006, e);
    }
  }
}

/** A brass sunburst inlaid in the terrazzo: rays of small brass squares round a disc, radius r. */
function inlay(i: ConcInfo, cx: number, cz: number, r: number, half = false) {
  const { b, cf } = i, y = cf + 0.003;
  b.mesh(BRASS, 'cyl', cx, y + 0.001, cz, 0.5, 0.004, 0.5);
  const n = 24;
  for (let k = 0; k < n; k++) {
    const t = (k / n) * Math.PI * 2;
    if (half && Math.sin(t) < -0.01) continue;
    for (let j = 3; j <= Math.round(r / 0.12); j++) {
      const d = j * 0.12, s = k % 2 ? 0.035 : 0.05;
      if (k % 2 && d > r * 0.7) break;
      b.deco(BRASS, cx + Math.cos(t) * d - s, y, cz + Math.sin(t) * d - s, cx + Math.cos(t) * d + s, y + 0.004, cz + Math.sin(t) * d + s);
    }
  }
}

/**
 * The glass barrel down the middle of the arcade over the wells: frosted panels in strips rising
 * from 0.38 m under the ceiling at z = ±W to the ceiling on the centre line, brass ribs every 1.2 m
 * and a brass stringer along each edge.
 */
function barrel(i: ConcInfo, x0: number, x1: number) {
  const { b, cf } = i, top = cf + i.clear, W = 2.2, N = 12, DROP = 0.38;
  const y = (z: number) => top - 0.04 - DROP * (z / W) ** 2;
  for (let k = 0; k < N; k++) {
    const za = -W + (2 * W * k) / N, zb = -W + (2 * W * (k + 1)) / N, zm = (za + zb) / 2;
    b.deco(FROST, x0, y(zm) - 0.012, za, x1, y(zm), zb);
    b.deco(BLACK, x0, y(zm), za, x1, top, zb);
  }
  for (let x = x0; x <= x1 + 0.01; x += 1.2) {
    for (let k = 0; k < N; k++) {
      const za = -W + (2 * W * k) / N, zb = -W + (2 * W * (k + 1)) / N, zm = (za + zb) / 2;
      b.deco(BRASS, x - 0.025, y(zm) - 0.05, za, x + 0.025, y(zm), zb);
    }
  }
  for (const s of [-1, 1]) b.deco(BRASS, x0, y(W) - 0.12, s * W - 0.04, x1, top, s * W + 0.04);
  b.deco('light', x0 + 0.2, top - 0.05, -0.04, x1 - 0.2, top - 0.045, 0.04);
}

/** A big Deco clock hanging over the paid side of a gate line: a face each way in a brass sunburst. */
function gateClock(i: ConcInfo, x: number, z: number) {
  const { b, cf } = i, top = cf + i.clear, y = cf + 2.62, R = 0.36;
  b.deco(BLACK, x - 0.07, y - R - 0.04, z - R - 0.04, x + 0.07, y + R + 0.04, z + R + 0.04);
  for (const f of [-1, 1]) b.sign({ k: 'clock' }, x + f * 0.072, y, z, [f, 0], 2 * R, 2 * R);
  for (let k = 0; k < 16; k++) {
    const t = (k / 16) * Math.PI * 2, l = k % 2 ? 0.2 : 0.32;
    for (let j = 0; j < 3; j++) {
      const d = R + 0.05 + (l * (j + 0.5)) / 3, yy = y + Math.sin(t) * d, zz = z + Math.cos(t) * d;
      if (yy > top - 0.05) continue;
      b.deco(BRASS, x - 0.03, yy - 0.025, zz - 0.025, x + 0.03, yy + 0.025, zz + 0.025);
    }
  }
  for (const dz of [-0.2, 0.2]) b.deco(BRASS, x - 0.012, y + R + 0.04, z + dz - 0.012, x + 0.012, top, z + dz + 0.012);
}

/** A round information kiosk of black, brass and glass on the unpaid side of a gate line. */
function infoKiosk(i: ConcInfo, e: { g: number; hi: boolean }): boolean {
  const { b, cf } = i, R = 0.85;
  const us = [8, 7, 9, 6, 10, 5.5, 11, 12];
  const zs = [-2.5, 2.5, -3.2, 3.2, -1.8, 1.8, 0];
  for (const u of us) {
    for (const z of zs) {
      const x = e.hi ? e.g + u : e.g - u;
      if (!i.free(x - R, z - R, x + R, z + R, 0.4)) continue;
      i.claim(x - R - 0.3, z - R - 0.3, x + R + 0.3, z + R + 0.3);
      b.block(x - R * 0.8, cf, z - R * 0.8, x + R * 0.8, cf + 2.45, z + R * 0.8);
      b.mesh(BLACK, 'cyl', x, cf + 0.5, z, 2 * R, 1.0, 2 * R);
      b.mesh(BRASS, 'cyl', x, cf + 1.02, z, 2 * R + 0.1, 0.05, 2 * R + 0.1);
      b.mesh('glassTint', 'cyl', x, cf + 1.6, z, 2 * R - 0.1, 1.1, 2 * R - 0.1);
      b.mesh('glow:#fff1d6', 'cyl', x, cf + 1.6, z, 2 * R - 0.5, 1.0, 2 * R - 0.5);
      b.mesh(BRASS, 'cyl', x, cf + 2.2, z, 2 * R + 0.14, 0.12, 2 * R + 0.14);
      b.mesh(BLACK, 'cyl', x, cf + 2.36, z, 2 * R - 0.2, 0.2, 2 * R - 0.2);
      b.mesh(BRASS, 'sphere', x, cf + 2.52, z, 0.22, 0.22, 0.22);
      for (const [nx, nz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as [number, number][]) {
        b.sign({ k: 'label', text: 'ご案内', sub: 'Information', fg: '#efe6d2', bg: '#141416' }, x + nx * (R + 0.075), cf + 2.2, z + nz * (R + 0.075), [nx, nz], 0.9, 0.11);
      }
      return true;
    }
  }
  return false;
}

/** x-range of the glass barrel: over the wells, short of the stairwells. */
const BX: [number, number] = [-5.0, 5.0];

// ── Platform ─────────────────────────────────────────────────────────────────────────────────

/** The sunburst: rays alternating teal and cream round a chrome sun, 30 × 15 tesserae of 0.1 m. */
function sunCell(c: number, r: number): string {
  const x = c + 0.5 - 15, y = r + 0.5;
  const rr = Math.hypot(x, y) / 15, a = Math.atan2(y, x);
  if (rr > 1) return '#1f3a4a';
  if (rr > 0.94) return 'chrome';
  if (rr < 0.22) return rr > 0.18 ? '#1f3a4a' : 'chrome';
  return Math.floor(a / (Math.PI / 14)) % 2 ? TEAL : '#efe6d2';
}
function sunburst(h: HallInfo, x: number, s: 1 | -1) {
  const { b, pf, wallZ } = h, T = 0.1, C = 30, R = 15, y0 = pf + 1.1, x0 = x - (C * T) / 2;
  const zf = s * (wallZ - 0.005), zb = s * (wallZ - 0.04);
  b.deco(BRASS, x0 - 0.06, y0 - 0.06, Math.min(zf, s * (wallZ - 0.03)), x0 + C * T + 0.06, y0 + R * T + 0.06, Math.max(zf, s * (wallZ - 0.03)));
  for (let r = 0; r < R; r++) {
    let c = 0;
    while (c < C) {
      const col = sunCell(c, r);
      let e = c + 1;
      while (e < C && sunCell(e, r) === col) e++;
      b.deco(col === 'chrome' ? BRASS : `mosaic:${col}`, x0 + c * T, y0 + r * T, Math.min(zf, zb), x0 + e * T, y0 + (r + 1) * T, Math.max(zf, zb));
      c = e;
    }
  }
}
function decoColumn(h: HallInfo, x: number, z: number, y0: number, y1: number) {
  const { b } = h, d = 0.62;
  b.mesh(`tile:${TEAL}`, 'cyl', x, (y0 + y1) / 2, z, d, y1 - y0, d);
  b.mesh(BRASS, 'cyl', x, y0 + 0.08, z, d + 0.06, 0.16, d + 0.06);
  for (const y of [y0 + 1.9, y0 + 2.0]) b.mesh(BRASS, 'cyl', x, y, z, d + 0.03, 0.03, d + 0.03);
  b.mesh(CREAM, 'cyl', x, y1 - 0.38, z, 0.72, 0.1, 0.72);
  b.mesh(CREAM, 'cyl', x, y1 - 0.22, z, 0.8, 0.12, 0.8);
  b.mesh(CREAM_DK, 'cyl', x, y1 - 0.06, z, 0.86, 0.12, 0.86);
}
function platformLook(h: HallInfo) {
  // Brass frames round the light wells where they open in the platform's ceiling.
  for (const [x0, z0, x1, z1] of VOIDS) {
    const y = h.ceilAt((x0 + x1) / 2);
    for (const [a, c, d, e] of [[x0 - 0.12, z0 - 0.12, x1 + 0.12, z0], [x0 - 0.12, z1, x1 + 0.12, z1 + 0.12], [x0 - 0.12, z0, x0, z1], [x1, z0, x1 + 0.12, z1]]) {
      h.b.deco(BRASS, a, y - 0.16, c, d, y + 0.02, e);
    }
  }
  const blocked = (x: number, m: number) => h.o.blocks.some(([a, c]) => x > a - m && x < c + m);
  if (h.island) {
    for (let x = -54; x <= 54; x += 6) {
      const seg = h.o.ceil.find((g) => x >= g.x0 && x <= g.x1);
      if (seg?.vault || blocked(x, 0.6)) continue;
      for (const z of [-2.05, 2.05]) decoColumn(h, x, z, h.pf, h.ceilAt(x));
    }
  }
  for (const s of [-1, 1] as const) {
    for (const x of [-45.5, -32.5, -6.5, 6.5, 32.5, 45.5]) {
      if (!h.wallRuns(s).some(([a, c]) => x - 1.7 >= a && x + 1.7 <= c)) continue;
      sunburst(h, x, s);
    }
  }
}

// ── Street entrances ─────────────────────────────────────────────────────────────────────────

function signBoard(e: ExitInfo, trim: string) {
  const { b, gy, ext, run } = e;
  b.deco(IRON, run - 0.04, gy + 1.84, ext + 1.05, run + 0.05, gy + 2.56, ext + 4.15);
  for (const [y0, y1] of [[gy + 2.52, gy + 2.56], [gy + 1.84, gy + 1.88]]) b.deco(trim, run - 0.04, y0, ext + 1.05, run + 0.065, y1, ext + 4.15);
}

function canopy(e: ExitInfo) {
  const { b, gy, ext, run } = e;
  const z0 = ext + 0.6, z1 = ext + 4.6, xr = run + 0.7, R = gy + 2.62, zm = ext + 2.6;
  const style = (Number(e.num) || 1) % 4;
  const posts = (mat: string, half = 0.07) => {
    for (const [px, pz] of [[0.07, ext + 1.05], [0.07, ext + 4.15], [run - 0.07, ext + 1.05], [run - 0.07, ext + 4.15]]) b.deco(mat, px - half, gy, pz - half, px + half, R, pz + half);
  };
  if (style === 1) {
    // Exit 1: teal fascia in three steps with chrome speed lines, a flat glass roof.
    posts(BRASS);
    b.deco('glassTint', -0.6, R + 0.05, z0, xr, R + 0.08, z1);
    for (let k = 0; k < 3; k++) {
      const inset = k * 0.12;
      b.deco(`paint:${TEAL}`, -0.6 + inset, R + 0.08 + k * 0.16, z0 + inset, xr - inset, R + 0.24 + k * 0.16, z1 - inset);
      b.deco(BRASS, xr - inset, R + 0.13 + k * 0.16, z0 + inset, xr - inset + 0.01, R + 0.17 + k * 0.16, z1 - inset);
    }
    signBoard(e, BRASS);
    return;
  }
  if (style === 2) {
    // Exit 2: a cream faience frame with a stepped (ziggurat) head and teal inlay, globe lamps.
    for (const [a, c] of [[z0, ext + 1.0], [ext + 4.2, z1]]) {
      b.deco(CREAM, run + 0.05, gy, a, run + 0.45, R + 0.3, c);
      b.deco(`paint:${TEAL}`, run + 0.45, gy + 0.3, (a + c) / 2 - 0.05, run + 0.46, R, (a + c) / 2 + 0.05);
      b.mesh('glow:#ffe9c0', 'sphere', run + 0.6, gy + 2.2, (a + c) / 2, 0.3, 0.3, 0.3);
    }
    for (let k = 0; k < 3; k++) b.deco(k === 1 ? `paint:${TEAL}` : CREAM, run + 0.05, R + 0.3 + k * 0.22, z0 + 0.5 * k, run + 0.45, R + 0.52 + k * 0.22, z1 - 0.5 * k);
    signBoard(e, BRASS);
    return;
  }
  if (style === 3) {
    // Exit 3: a glass canopy on thin steel posts, its ribs fanning out from the head of the stair.
    const xa = run * 0.5;
    for (const [px, pz] of [[xa, ext + 1.05], [xa, ext + 4.15], [run - 0.07, ext + 1.05], [run - 0.07, ext + 4.15]]) b.deco(BRASS, px - 0.05, gy, pz - 0.05, px + 0.05, R, pz + 0.05);
    b.deco('glassRoof', xa - 0.3, R, z0, xr + 0.4, R + 0.03, z1);
    // Ribs fanning out from a hub over the stair to the canopy's curved front.
    for (let k = 0; k <= 10; k++) {
      const t = (k / 10) * Math.PI, ex = xr + 0.4 + Math.sin(t) * 0.0, ez = zm - Math.cos(t) * (z1 - z0) / 2;
      const n = 8;
      for (let j = 0; j < n; j++) {
        const f0 = j / n, f1 = (j + 1) / n;
        const xA = xa + (ex - xa) * f0, zA = zm + (ez - zm) * f0, xB = xa + (ex - xa) * f1, zB = zm + (ez - zm) * f1;
        b.deco(BRASS, Math.min(xA, xB) - 0.02, R + 0.03, Math.min(zA, zB) - 0.02, Math.max(xA, xB) + 0.02, R + 0.07, Math.max(zA, zB) + 0.02);
      }
    }
    b.deco(BRASS, xr + 0.36, R - 0.12, z0, xr + 0.4, R + 0.07, z1);
    b.deco('light', xr + 0.4, R - 0.1, z0 + 0.1, xr + 0.42, R - 0.06, z1 - 0.1);
    signBoard(e, BRASS);
    return;
  }
  // Exit 4: a granite portal with a sunburst in relief over the lintel.
  const STONE = 'flat:#b9b09c', STONE_DK = 'flat:#8f877a';
  for (const [a, c] of [[z0, ext + 1.0], [ext + 4.2, z1]]) b.deco(STONE_DK, run + 0.05, gy, a, run + 0.55, R + 1.1, c);
  b.deco(STONE, run + 0.05, R, ext + 1.0, run + 0.55, R + 0.3, ext + 4.2);
  // A dark half-disc on the lintel, chrome rays fanning over it, a chrome sun at the foot.
  const len = 1.25, base = R + 0.3;
  for (let j = 0; j < 12; j++) {
    const y = base + (len * j) / 12, w = Math.sqrt(Math.max(0, 1 - (j / 12) ** 2)) * len;
    b.deco('flat:#1f3a4a', run + 0.55, y, zm - w, run + 0.57, y + len / 12, zm + w);
  }
  for (let k = 0; k <= 12; k++) {
    const t = (k / 12) * Math.PI;
    for (let j = 2; j <= 12; j++) {
      const rz = zm + Math.cos(t) * len * (j / 12), ry = base + Math.sin(t) * len * (j / 12);
      b.deco(k % 2 ? BRASS : `paint:${TEAL}`, run + 0.57, ry - 0.035, rz - 0.035, run + 0.6, ry + 0.035, rz + 0.035);
    }
  }
  b.mesh(BRASS, 'sphere', run + 0.58, base + 0.05, zm, 0.12, 0.34, 0.34);
  b.deco(STONE, run + 0.05, R + 1.55, z0 - 0.05, run + 0.6, R + 1.65, z1 + 0.05);
  for (const [a, c] of [[z0, ext + 1.0], [ext + 4.2, z1]]) b.deco(STONE_DK, run + 0.05, R + 1.1, a, run + 0.55, R + 1.55, c);
  signBoard(e, BRASS);
}

// ── The look ─────────────────────────────────────────────────────────────────────────────────

export const look: StationLook = {
  finishes: { wall: 'tile:#efe6d2', floor: 'terrazzo:#d8cfbe', pillar: 'tile:#141416', ceil: 'paint:#f1ead8' },
  posters: false,
  skirting: false,

  lights(i) {
    const { cf } = i, top = cf + i.clear;
    // Coffers down the middle and along both sides of the hall, every 4.8 m.
    for (let x = i.x0 + 3; x <= i.x1 - 3; x += 4.8) {
      for (const z of [-0.55 * i.cw, 0, 0.55 * i.cw]) {
        if (overBusy(i, x - 1.2, z - 0.8, x + 1.2, z + 0.8)) continue;
        if (Math.abs(z) < 2.6 && x > BX[0] - 1.3 && x < BX[1] + 1.3) continue;
        coffer(i, x, z, 2.4, 1.6);
      }
    }
    barrel(i, BX[0], BX[1]);
    for (const e of i.ends) gateClock(i, e.hi ? e.g - 1.6 : e.g + 1.6, 0.5 * i.cw);
    // Gate lines: white battens either side, as the kit has.
    const oz = i.cw < 9 ? 3.7 : 5.0;
    for (const e of i.ends) for (const dx of [-3.0, 3.0]) batten(i, 'z', e.g + dx, -i.cw + 0.7, oz - 0.4, top);
    // Stairwells: a batten beyond each portal.
    for (const w of spineWells(i)) {
      const [px, pz] = w.portal.at, [nx, nz] = w.portal.n, hw = w.portal.w / 2 - 0.3;
      if (nx) batten(i, 'z', px + nx * 3.2, pz - hw, pz + hw, top);
      else batten(i, 'x', pz + nz * 3.2, px - hw, px + hw, top);
    }
    void cf;
  },

  pillar(i, x, z, y0, y1) {
    const { b } = i, h = 0.36;
    // Teal tile with chrome flutes at the corners, a chrome base, a stepped cream capital.
    b.deco(i.pillar, x - h, y0, z - h, x + h, y1, z + h);
    b.deco(BRASS, x - h - 0.02, y0, z - h - 0.02, x + h + 0.02, y0 + 0.16, z + h + 0.02);
    for (const cx of [x - h, x + h]) for (const cz of [z - h, z + h]) b.deco(BRASS, cx - 0.025, y0 + 0.16, cz - 0.025, cx + 0.025, y1 - 0.5, cz + 0.025);
    for (const [k, mat] of [[0, CREAM], [1, CREAM_DK], [2, CREAM]] as [number, string][]) {
      const g = 0.04 + k * 0.07;
      b.deco(mat, x - h - g, y1 - 0.5 + k * 0.16, z - h - g, x + h + g, y1 - 0.34 + k * 0.16, z + h + g);
    }
  },

  concourse(i) {
    for (const s of [-1, 1] as const) wallDado(i, s, P);
    const paidEnds = [...(i.ends.some((e) => !e.hi) ? [] : [i.x0]), ...(i.ends.some((e) => e.hi) ? [] : [i.x1])];
    for (const x of paidEnds) endDado(i, x, P);
    arcade(i);
    wellTrim(i);
    // Brass sunbursts in the floor: between the wells and the stairs, and inside each gate line.
    for (const x of [BX[0] - 0.55, BX[1] + 0.55]) if (i.free(x - 0.4, -1.2, x + 0.4, 1.2, 0)) inlay(i, x, 0, 1.0);
    for (const e of i.ends) inlay(i, e.hi ? e.g + 4.5 : e.g - 4.5, 0, 1.4);
    for (const e of i.ends) infoKiosk(i, e);
  },

  exit(e) {
    const { b, cf, ext } = e, L = ext + 4;
    const tone = ['#c9a227', TEAL, '#efe6d2', '#1f3a4a'][(Number(e.num) || 1) % 4];
    exitDado(e, { mat: `tile:${tone}`, top: 1.05, cap: BRASS, steps: 5 });
    exitHandrails(e, ['near']);
    b.deco(BRASS, -4, cf + 2.36, 0, -3.988, cf + 2.39, L);
    b.deco(BRASS, -4, cf + 2.36, L - 0.012, 0, cf + 2.39, L);
    b.mesh(FROST, 'sphere', -2, cf + 2.4, ext + 2, 0.4, 0.22, 0.4);
  },

  canopy,

  passage(p) {
    passageDado(p, { mat: `tile:${TEAL}`, top: 1.05, cap: BRASS });
    passageRails(p);
  },

  platform: platformLook,
};
