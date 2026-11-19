// Station look: Minato Center (N-01), the Nagisa Line's western terminus under the bay business
// district. Outside the gates the concourse is the basement of the Minato Center tower: a polished
// stone floor, gold-banded ceiling, a row of basement shops and a food hall on both walls, the
// tower's lift lobby, and a sunken garden whose skylight lets daylight down through the plaza.
// On the platforms, the end of the line is marked at the buffer end.

import { defaultLook } from './default';
import type { ConcInfo, StationLook } from './types';

const STONE = 'floor:#e6e1d6';
const GOLD = 'metal:#b8963e';
const SHOPS = [
  { ja: 'ベイサイド ベーカリー', en: 'Bayside Bakery', bg: '#f3e2b8', fg: '#6b3a12' },
  { ja: '港寿司', en: 'Minato Sushi', bg: '#1d2a3a', fg: '#f4efe2' },
  { ja: 'カフェ 汐見', en: 'Café Shiomi', bg: '#2f4a3a', fg: '#f2d38a' },
  { ja: 'みなと書房', en: 'Minato Books', bg: '#7a2a12', fg: '#fff3d6' },
  { ja: 'デリ タワーキッチン', en: 'Tower Kitchen Deli', bg: '#ffffff', fg: '#1673c9' },
  { ja: 'ドラッグ ベイ', en: 'Drug Bay', bg: '#1f6f8b', fg: '#fff' },
  { ja: 'ラーメン 灯台', en: 'Ramen Tōdai', bg: '#c0392b', fg: '#fff' },
  { ja: '花の店 しおかぜ', en: 'Shiokaze Florist', bg: '#e9f2e4', fg: '#2e6b35' },
];

/** The tower basement: everything on the unpaid side of one gate line. */
function basement(i: ConcInfo, g: number, n: 1 | -1) {
  const { b, cf, cw, clear } = i;
  const top = cf + clear;
  const xa = Math.min(g, g + 16 * n), xb = Math.max(g, g + 16 * n);
  // Polished stone floor with a gold inlay line where the tower begins.
  b.deco(STONE, xa, cf + 0.003, -cw, xb, cf + 0.006, cw);
  b.deco(GOLD, g + n * 1.2 - 0.04, cf + 0.006, -cw, g + n * 1.2 + 0.04, cf + 0.009, cw);
  // Gold bands across the ceiling.
  for (let x = xa + 1; x < xb; x += 2) b.deco(GOLD, x - 0.05, top - 0.08, -cw, x + 0.05, top, cw);

  // The tower's lift lobby: the first wall stretch with room, nearest the end wall.
  let lifts = false;
  for (const s of [1, -1] as const) {
    if (lifts) break;
    for (let k = 15.2; k >= 4 && !lifts; k -= 0.4) {
      const x0 = Math.min(g + n * k, g + n * (k - 4.4)), x1 = x0 + 4.4;
      const r: [number, number, number, number] = [x0, s > 0 ? cw - 0.5 : -cw, x1, s > 0 ? cw : -cw + 0.5];
      if (!i.free(...r)) continue;
      i.claim(...r);
      const z = s * (cw - 0.02);
      b.deco('panel:#2a2f36', x0, cf, Math.min(z, s * cw), x1, top - 0.1, Math.max(z, s * cw));
      for (const dx of [1.1, 3.3]) {
        b.deco('metal:#c9ccd0', x0 + dx - 0.55, cf, Math.min(s * (cw - 0.05), z), x0 + dx + 0.55, cf + 2.2, Math.max(s * (cw - 0.05), z));
        b.deco('metal:#8e9399', x0 + dx - 0.01, cf, Math.min(s * (cw - 0.06), z), x0 + dx + 0.01, cf + 2.2, Math.max(s * (cw - 0.06), z));
        b.deco('glow:#ffd98a', x0 + dx - 0.12, cf + 2.32, Math.min(s * (cw - 0.06), z), x0 + dx + 0.12, cf + 2.42, Math.max(s * (cw - 0.06), z));
      }
      b.sign({ k: 'label', text: 'ミナトセンタータワー エレベーター 1F–42F', sub: 'Minato Center Tower — lifts to the lobby and offices', fg: '#f4e7c2', bg: '#1d2a3a' },
        (x0 + x1) / 2, cf + 2.62, s * (cw - 0.07), [0, -s], 4.2, 0.36);
      lifts = true;
    }
  }

  // Basement shops on both walls wherever there is room.
  let k = 0;
  for (const s of [1, -1] as const) {
    for (let d = 1.6; d + 3.1 <= 16; d += 0.4) {
      const x0 = Math.min(g + n * d, g + n * (d + 3.1)), x1 = x0 + 3.1;
      const r: [number, number, number, number] = [x0, s > 0 ? cw - 0.6 : -cw, x1, s > 0 ? cw : -cw + 0.6];
      if (!i.free(...r, 0.05)) continue;
      i.claim(...r);
      const shop = SHOPS[(k++ + (s > 0 ? 0 : 3)) % SHOPS.length];
      const z = s * (cw - 0.03), lo = (a: number) => Math.min(a, s * cw), hi = (a: number) => Math.max(a, s * cw);
      b.deco('glassDark', x0 + 0.15, cf + 0.1, lo(z), x1 - 0.15, cf + 2.3, hi(z));
      b.deco('glow:#fff4dc', x0 + 0.15, cf + 2.3, lo(s * (cw - 0.04)), x1 - 0.15, cf + 2.4, hi(s * (cw - 0.04)));
      b.deco(`flat:${shop.bg}`, x0, cf + 2.4, lo(s * (cw - 0.05)), x1, top - 0.1, hi(s * (cw - 0.05)));
      b.sign({ k: 'shop', ...shop }, (x0 + x1) / 2, cf + 2.68, s * (cw - 0.06), [0, -s], 2.8, 0.42);
      for (const x of [x0, x1 - 0.08]) b.deco(GOLD, x, cf, lo(s * (cw - 0.05)), x + 0.08, top - 0.1, hi(s * (cw - 0.05)));
      // A display counter inside the glass.
      b.deco('wood:#a07a52', x0 + 0.3, cf, lo(s * (cw - 0.02)), x1 - 0.3, cf + 0.9, hi(s * (cw - 0.02)));
      d += 3.1;
    }
  }

  // The sunken garden: a planter under the skylight, mid-hall, if there is room.
  for (const off of [8, 7, 9, 6, 10]) {
    const xc = g + n * off, zc = 0;
    if (!i.free(xc - 1.6, zc - 1.6, xc + 1.6, zc + 1.6, 0.6)) continue;
    i.claim(xc - 1.6, zc - 1.6, xc + 1.6, zc + 1.6);
    b.box('floor:#5b5f66', xc - 1.6, cf, zc - 1.6, xc + 1.6, cf + 0.45, zc + 1.6);
    b.deco('flat:#4a3b2c', xc - 1.45, cf + 0.45, zc - 1.45, xc + 1.45, cf + 0.48, zc + 1.45);
    for (let q = 0; q < 18; q++) {
      const a = q * 2.1, rr = 0.25 + (q % 5) * 0.22, px = xc + Math.cos(a) * rr, pz = zc + Math.sin(a) * rr, h = 1.6 + (q % 4) * 0.25;
      b.deco('flat:#6f8f3a', px - 0.03, cf + 0.48, pz - 0.03, px + 0.03, cf + 0.48 + h, pz + 0.03);
      b.deco('leaf2', px - 0.2, cf + 0.48 + h - 0.5, pz - 0.2, px + 0.2, cf + 0.48 + h, pz + 0.2);
    }
    // Skylight: a deep daylit well in the ceiling, gold-rimmed.
    b.deco('glow:#eef6ff', xc - 1.8, top - 0.02, zc - 1.8, xc + 1.8, top, zc + 1.8);
    for (const [p, q, r2, t] of [[xc - 1.9, zc - 1.9, xc + 1.9, zc - 1.8], [xc - 1.9, zc + 1.8, xc + 1.9, zc + 1.9], [xc - 1.9, zc - 1.8, xc - 1.8, zc + 1.8], [xc + 1.8, zc - 1.8, xc + 1.9, zc + 1.8]]) {
      b.deco(GOLD, p, top - 0.3, q, r2, top, t);
    }
    b.sign({ k: 'label', text: 'サンクンガーデン', sub: 'Sunken garden — open to the plaza above', fg: '#1d2a3a', bg: '#f4efe2' }, xc, cf + 0.25, zc - 1.62, [0, -1], 2.4, 0.32);
    break;
  }
}

export const look: StationLook = {
  ...defaultLook,

  concourse(i) {
    defaultLook.concourse?.(i);
    for (const e of i.ends) basement(i, e.g, e.hi ? 1 : -1);
  },

  platform(h) {
    // The buffer end (−x, where the line ends): a name board over each platform's end barrier.
    const x = -h.P + 1.6;
    for (const s of [-1, 1]) {
      const z = h.island ? 0 : (s * (h.pe + h.wallZ)) / 2;
      h.b.hang({ k: 'label', text: '渚線 終点 みなとセンター', sub: 'Minato Center — end of the Nagisa Line', fg: '#fff', bg: '#1673c9' },
        x, h.pf + 2.6, z, 3.6, 0.52, { ceil: h.ceilAt(x) });
      if (h.island) break;
    }
  },
};
