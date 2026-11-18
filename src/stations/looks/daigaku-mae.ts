// Station look: Daigaku-mae (川湊大学前). The campus undercroft: brick arcades, cream plaster and
// the paper chaos of student life. See Plans/features/station-looks/plan.md.
//
// - Walls: the station brick on a dark-brick base with a stone cap, a dark picture rail, cream
//   plaster above. Brick piers stand out of both long walls of the paid area on the pillar grid,
//   with stepped round-headed arches between them; at every other grid line a cross-arch spans
//   the concourse from wall pier to pillar to pillar, so the paid area walks like a cloister.
// - Ceiling: cream, stone ribs on the pillar grid, a shallow stepped coffer in each bay and a
//   brass-and-opal globe hanging in it; a pair of old pipes along each pillar line.
// - Bays: each arcade bay holds one thing, its sign painted in the arch above: a café, a
//   second-hand bookshop with a bargain cart, a set-meal canteen, the co-op's stationery and copy
//   shop, lockers, benches. The noticeboard court faces itself across one bay: a pinned wall and
//   two free-standing boards on one side, a row of tatekan on the other, club banners above.

import type { Builder } from '../../world/builder';
import {
  band, bench, exitDado, hash, lockers, noren, PALETTES, passagePipes, passageWalls, pipeRun, vendingRow, wallBand, wbox,
  type Axis, type Brand, type Wall,
} from './parts';
import type { ConcInfo, StationLook } from './types';

// ── Palette ──────────────────────────────────────────────────────────────────────────────────

const BRICK = 'brick:#9a5a43';
const BRICK_DARK = 'brick:#6b3a2c';
const STONE = 'paint:#cdbfa4';
const PLASTER = 'paint:#efe6d2';
const COFFER = 'paint:#e4d9c3';
const RAIL = 'wood:#3d2014';
const GREEN = 'paint:#2f4a3a';
const BRASS = 'metal:#b08d57';
const IRON = 'metal:#26282b';
const OPAL = 'glow:#fff1d2';
const CORK = 'flat:#b98a5c';
const OAK = 'wood:#5a3a24';
const PLY = 'wood:#c8a878';
const FLYERS = ['#f2c14e', '#e84a6f', '#3c7dc4', '#6aa84f', '#f4f1e6', '#f08a24', '#b05cc8', '#7fd1c7'];
const BOOKS = [...PALETTES.books, '#7a2a12', '#2f4a3a'];
const WALLS: Wall[] = [1, -1];

/** Invented names (recorded in the report for docs/worldbuilding.md). */
const BRANDS = {
  renga: { ja: '喫茶 れんが', en: 'Kissa Renga', bg: '#2f4a3a', fg: '#e9d9a8', kind: 'cafe' },
  fumikura: { ja: '古書 文蔵', en: 'Fumikura Old Books', bg: '#3d2014', fg: '#f0e2c0', kind: 'books' },
  harunire: { ja: 'めし処 はるにれ', en: 'Harunire Set Meals', bg: '#f4efe2', fg: '#7a2a12', kind: 'bento' },
  coop: { ja: '大学生協 文具・コピー', en: 'Univ. Co-op Stationery & Copy', bg: '#2e6b35', fg: '#fff', kind: 'goods' },
} satisfies Record<string, Brand>;

interface Club { ja: string; en: string; bg: string; fg: string; banner: string; bannerEn: string }
const CLUBS: Club[] = [
  { ja: '漕艇部', en: 'Rowing Club', bg: '#1d3f6e', fg: '#ffffff', banner: '漕艇部 新入部員募集', bannerEn: 'Rowing Club: new members welcome' },
  { ja: '天文同好会', en: 'Astronomy Society', bg: '#1b2440', fg: '#f2d16b', banner: '天文同好会 星空観望会', bannerEn: 'Astronomy Society: stargazing night' },
  { ja: '軽音楽部', en: 'Light Music Club', bg: '#8a1f2b', fg: '#ffffff', banner: '軽音楽部 新歓ライブ', bannerEn: 'Light Music Club: welcome gig' },
  { ja: '写真部', en: 'Photography Club', bg: '#f4efe2', fg: '#1b1b1b', banner: '写真部 部員募集', bannerEn: 'Photography Club' },
  { ja: '落語研究会', en: 'Rakugo Society', bg: '#f2d16b', fg: '#3d2014', banner: '落語研究会', bannerEn: 'Rakugo Society' },
  { ja: '山岳部', en: 'Mountaineering Club', bg: '#2e6b35', fg: '#ffffff', banner: '山岳部', bannerEn: 'Mountaineering Club' },
  { ja: '茶道部', en: 'Tea Ceremony Club', bg: '#6a1b3a', fg: '#fbe9d0', banner: '茶道部', bannerEn: 'Tea Ceremony Club' },
];

// Heights above the concourse floor.
const SPRING = 2.4; // arches spring here (the brief's minimum soffit)
const CROWN = 2.83; // wall-arch crown soffit: the arch signs (2.45 … 2.79) fit under it
const FY = 2.2; // shop fascia underside (allowed within 1.7 m of the wall)

// ── Small helpers ────────────────────────────────────────────────────────────────────────────

/** A seeded 0…1 sequence for hooks that are not given `rand` (exits, passages). */
function seeded(seed: number): () => number {
  let n = 0;
  return () => hash(n++, seed);
}

// Arch steps as fractions of the half span (0 at the springing … the crown step from the last).
const U_BIG = [0, 0.1, 0.25, 0.5];
const U_SMALL = [0, 0.2, 0.5];
const circ = (u: number) => Math.sqrt(1 - (1 - u) ** 2);

/**
 * A round-headed arch over the opening a … c along `axis`, t0 … t1 across, as stepped boxes:
 * soffit at ys at the springing rising on a quarter circle to yc at the crown. Each step fills up
 * to `top`, or (with `ring`) only that far above its soffit, so a thin ring reads as an arch.
 */
function arch(b: Builder, mat: string, axis: Axis, t0: number, t1: number, a: number, c: number, ys: number, yc: number, top: number, us: number[], ring?: number) {
  const R = (c - a) / 2, last = us.length - 1, k0 = circ(us[last]);
  const h = (u: number) => ys + ((yc - ys) * circ(u)) / k0;
  const put = (p: number, q: number, y: number) => {
    const y1 = ring === undefined ? top : Math.min(top, y + ring);
    if (axis === 'x') b.deco(mat, p, y, Math.min(t0, t1), q, y1, Math.max(t0, t1));
    else b.deco(mat, Math.min(t0, t1), y, p, Math.max(t0, t1), y1, q);
  };
  for (let k = 0; k < last; k++) {
    put(a + R * us[k], a + R * us[k + 1], h(us[k]));
    put(c - R * us[k + 1], c - R * us[k], h(us[k]));
  }
  put(a + R * us[last], c - R * us[last], yc);
}

/**
 * Flyers pinned edge to edge over u0 … u1 by v0 … v1, one to a cell, sizes and colours varied.
 * `draw` places one (its along-range and heights); `density` is the share of cells filled.
 */
function flyers(r: () => number, u0: number, u1: number, v0: number, v1: number, draw: (mat: string, a: number, c: number, y0: number, y1: number) => void, density = 0.85) {
  const cols = Math.max(1, Math.floor((u1 - u0) / 0.34)), rows = Math.max(1, Math.floor((v1 - v0) / 0.4));
  const cw = (u1 - u0) / cols, rh = (v1 - v0) / rows;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (r() > density) continue;
      const w = Math.min(cw * 0.94, 0.19 + r() * 0.12), hh = Math.min(rh * 0.94, 0.25 + r() * 0.14);
      const cu = u0 + (col + 0.5) * cw + (r() - 0.5) * (cw - w), cv = v0 + (row + 0.5) * rh + (r() - 0.5) * (rh - hh);
      draw(`flat:${FLYERS[Math.floor(r() * FLYERS.length)]}`, cu - w / 2, cu + w / 2, cv - hh / 2, cv + hh / 2);
    }
  }
}

/** Brass-and-opal pendant globe, its bottom at `bottom`, hung from the ceiling at `top`. */
function pendant(b: Builder, x: number, z: number, top: number, bottom: number, d = 0.3) {
  b.mesh(OPAL, 'sphere', x, bottom + d / 2, z, d, d, d);
  b.mesh(BRASS, 'cyl', x, bottom + d - 0.01, z, d * 0.55, 0.06, d * 0.55);
  b.deco(BRASS, x - 0.012, bottom + d + 0.02, z - 0.012, x + 0.012, top, z + 0.012);
}

/** Free-standing globe lamp standard (solid, claimed). */
function lampStd(i: ConcInfo, x: number, z: number): boolean {
  if (!i.free(x - 0.22, z - 0.22, x + 0.22, z + 0.22, 0.3)) return false;
  i.claim(x - 0.6, z - 0.6, x + 0.6, z + 0.6);
  const { b, cf } = i;
  b.block(x - 0.22, cf, z - 0.22, x + 0.22, cf + 2.35, z + 0.22);
  b.mesh(IRON, 'cyl', x, cf + 0.15, z, 0.44, 0.3, 0.44);
  b.mesh(IRON, 'cyl', x, cf + 1.33, z, 0.1, 2.06, 0.1);
  b.mesh(BRASS, 'cyl', x, cf + 2.4, z, 0.18, 0.08, 0.18);
  b.mesh(OPAL, 'sphere', x, cf + 2.62, z, 0.4, 0.4, 0.4);
  return true;
}

// ── Concourse: walls, arcade, ceiling ────────────────────────────────────────────────────────

/** Brick on a dark-brick base with a stone cap, a picture rail, cream plaster above (skips exit doorways). */
function walls(i: ConcInfo, s: Wall) {
  wallBand(i, s, 0, 0.45, BRICK_DARK, { inset: 0.018 });
  wallBand(i, s, 0.45, 0.52, STONE, { inset: 0.022 });
  // Rail 0.006 behind the kit's toilet sign (0.03 proud), which it passes behind.
  wallBand(i, s, 2.27, 2.33, RAIL, { inset: 0.024 });
  wallBand(i, s, 2.33, i.clear, PLASTER, { inset: 0.008 });
}

/** x of the pillar grid in the paid area, clear of the gate lines. */
function grid(i: ConcInfo): number[] {
  const xs = [...new Set(i.pillars.map(([x]) => x))].sort((p, q) => p - q);
  return xs.filter((x) => x > i.paid[0] + 2 && x < i.paid[1] - 2 && !i.ends.some((e) => Math.abs(x - e.g) < 3.5));
}

const pillarZ = (i: ConcInfo) => (i.pillars.length ? Math.min(...i.pillars.map(([, z]) => Math.abs(z))) : 0);

/** Brick pier 0.8 wide standing 0.3 out of long wall `s`, stone base and impost (solid). */
function wallPier(i: ConcInfo, s: Wall, x: number) {
  const { cf } = i;
  wbox(i, s, BRICK, x - 0.4, x + 0.4, cf, cf + SPRING, 0, 0.3, true);
  wbox(i, s, STONE, x - 0.43, x + 0.43, cf, cf + 0.3, 0, 0.33);
  wbox(i, s, STONE, x - 0.44, x + 0.44, cf + 2.3, cf + SPRING, 0, 0.34);
}

interface Bay { s: Wall; x0: number; x1: number }

/** Piers and arches along both long walls of the paid area. Returns the bays between piers. */
function arcade(i: ConcInfo, G: number[], built: Set<string>): Bay[] {
  const { cf } = i, top = cf + i.clear, bays: Bay[] = [];
  for (const s of WALLS) {
    for (const x of G) {
      const [za, zb] = band(i, s, 0, 0.3);
      if (!i.free(x - 0.4, za, x + 0.4, zb)) continue;
      i.claim(x - 0.4, za, x + 0.4, zb);
      wallPier(i, s, x);
      built.add(`${s}:${x}`);
    }
    for (let k = 0; k + 1 < G.length; k++) {
      const p = G[k], q = G[k + 1];
      if (q - p > 12 || !built.has(`${s}:${p}`) || !built.has(`${s}:${q}`)) continue;
      const [za, zb] = band(i, s, 0, 0.3);
      arch(i.b, BRICK, 'x', za, zb, p + 0.4, q - 0.4, cf + SPRING, cf + CROWN, top, U_BIG);
      bays.push({ s, x0: p + 0.4, x1: q - 0.4 });
    }
  }
  return bays;
}

/** Cross-arches at every other grid line, stone ribs on the rest, stepped coffers between. Returns the arch x's. */
function ceiling(i: ConcInfo, G: number[], built: Set<string>): number[] {
  const { b, cf, cw } = i, top = cf + i.clear, pz = pillarZ(i);
  const arches: number[] = [];
  G.forEach((x, k) => {
    const zs = i.pillars.filter(([px]) => px === x).map(([, z]) => z).sort((p, q) => p - q);
    if (k % 2 === 1 && zs.length) {
      arches.push(x);
      // Openings: wall pier (or wall) → pillar faces → wall pier.
      const edges = [-cw + (built.has(`-1:${x}`) ? 0.3 : 0), ...zs.flatMap((z) => [z - 0.42, z + 0.42]), cw - (built.has(`1:${x}`) ? 0.3 : 0)];
      for (let j = 0; j + 1 < edges.length; j += 2) {
        const a = edges[j], c = edges[j + 1];
        if (c - a < 1) continue;
        arch(b, BRICK, 'z', x - 0.3, x + 0.3, a, c, cf + SPRING, cf + 2.86, top, U_BIG);
        b.deco(STONE, x - 0.32, cf + 2.79, (a + c) / 2 - 0.14, x + 0.32, top, (a + c) / 2 + 0.14);
      }
    } else b.deco(STONE, x - 0.2, top - 0.15, -cw, x + 0.2, top, cw);
  });
  if (G.length < 2) return arches;
  if (pz > 0) for (const z of [-pz, pz]) b.deco(STONE, G[0], top - 0.15, z - 0.2, G[G.length - 1], top, z + 0.2);
  // A shallow coffer in each bay, stepping up from the ribs.
  const coffer = (x0: number, z0: number, x1: number, z1: number, inset: number, depth: number) => {
    const a = x0 + inset, c = x1 - inset, p = z0 + inset, q = z1 - inset, w = 0.3, y = top - depth;
    if (c - a < 1 || q - p < 1) return;
    b.deco(COFFER, a, y, p, c, top, p + w);
    b.deco(COFFER, a, y, q - w, c, top, q);
    b.deco(COFFER, a, y, p + w, a + w, top, q - w);
    b.deco(COFFER, c - w, y, p + w, c, top, q - w);
  };
  for (let k = 0; k + 1 < G.length; k++) {
    if (G[k + 1] - G[k] > 12) continue;
    const x0 = G[k] + 0.3, x1 = G[k + 1] - 0.3;
    const panels: [number, number][] = pz > 0 ? [[-cw + 0.3, -pz - 0.2], [-pz + 0.2, pz - 0.2], [pz + 0.2, cw - 0.3]] : [[-cw + 0.3, cw - 0.3]];
    panels.forEach(([z0, z1], j) => {
      coffer(x0, z0, x1, z1, 0.15, j === 1 ? 0.09 : 0.07);
    });
  }
  return arches;
}

// ── Concourse: the bays ──────────────────────────────────────────────────────────────────────

/** A shop's sign painted in the arch above its bay, on a dark green board. */
function archSign(i: ConcInfo, bay: Bay, brand: Brand) {
  const { s, x0, x1 } = bay, xm = (x0 + x1) / 2, w = Math.min(3, (x1 - x0) / 2 - 0.25), cf = i.cf;
  wbox(i, s, GREEN, xm - w / 2 - 0.05, xm + w / 2 + 0.05, cf + 2.41, cf + 2.81, 0.014, 0.024);
  i.b.sign({ k: 'shop', ja: brand.ja, en: brand.en, bg: brand.bg, fg: brand.fg }, xm, cf + 2.62, s * (i.cw - 0.03), [0, -s], w, 0.34);
}

/** A club banner hung on a rod in the arch above a bay. */
function clubBanner(i: ConcInfo, bay: Bay, club: Club) {
  const { s, x0, x1 } = bay, xm = (x0 + x1) / 2, w = Math.min(3, (x1 - x0) / 2 - 0.3), cf = i.cf;
  wbox(i, s, 'wood:#5a4636', xm - w / 2 - 0.08, xm + w / 2 + 0.08, cf + 2.79, cf + 2.81, 0.014, 0.05);
  wbox(i, s, `flat:${club.bg}`, xm - w / 2 - 0.04, xm + w / 2 + 0.04, cf + 2.43, cf + 2.79, 0.014, 0.022);
  i.b.sign({ k: 'label', text: club.banner, sub: club.bannerEn, fg: club.fg, bg: club.bg }, xm, cf + 2.61, s * (i.cw - 0.028), [0, -s], w, 0.32);
}

/** Dark green shopfront frame: pilasters (solid), a fascia under the arch, a brass line. */
function frame(i: ConcInfo, s: Wall, x0: number, x1: number, d: number) {
  const { cf } = i, fy = cf + FY;
  wbox(i, s, GREEN, x0, x0 + 0.15, cf, cf + SPRING, 0, d, true);
  wbox(i, s, GREEN, x1 - 0.15, x1, cf, cf + SPRING, 0, d, true);
  wbox(i, s, GREEN, x0 + 0.15, x1 - 0.15, fy, cf + SPRING, 0, d);
  wbox(i, s, BRASS, x0, x1, fy + 0.03, fy + 0.05, d, d + 0.012);
  wbox(i, s, 'glow:#fff1d6', x0 + 0.3, x1 - 0.3, fy - 0.05, fy - 0.02, 0.05, Math.min(0.3, d - 0.08));
}

/** Shelves of goods inside a front: boards at heights ys, coloured blocks on each. */
function rows(i: ConcInfo, s: Wall, x0: number, x1: number, ys: number[], d0: number, d1: number, cols: string[], h = 0.3) {
  const n = Math.max(1, Math.round((x1 - x0) / 0.9)), w = (x1 - x0) / n;
  ys.forEach((y, r) => {
    wbox(i, s, 'flat:#d9d4c7', x0, x1, y - 0.025, y, d0, d1);
    for (let k = 0; k < n; k++) {
      wbox(i, s, `flat:${cols[(k + r * 2) % cols.length]}`, x0 + k * w + 0.04, x0 + (k + 1) * w - 0.04, y, y + h * (0.75 + 0.25 * i.rand()), d0 + 0.02, d1 - 0.03);
    }
  });
}

interface FrontOpts {
  depth: number;
  kind: 'glazed' | 'counter';
  goods: string[];
  door?: number;
  clear?: number;
  noren?: { color: string; text: string };
}

/** A shop in a bay, x0 … x1, standing `depth` out: glazed with a door, or an open counter. Checks and claims its footprint. */
function front(i: ConcInfo, s: Wall, x0: number, x1: number, o: FrontOpts): boolean {
  const d = o.depth, [za, zb] = band(i, s, 0, d + (o.clear ?? 1.2));
  if (x1 - x0 < 2 || !i.free(x0, za, x1, zb)) return false;
  i.claim(x0, za, x1, zb);
  const { cf } = i, fy = cf + FY, xa = x0 + 0.15, xb = x1 - 0.15;
  frame(i, s, x0, x1, d);
  wbox(i, s, 'flat:#f1ebdd', xa, xb, cf, fy, 0.03, 0.04);
  if (o.kind === 'glazed') {
    wbox(i, s, 'none', xa, xb, cf, fy, 0, d, true);
    rows(i, s, xa + 0.1, xb - 0.1, [cf + 0.8, cf + 1.4], 0.05, Math.min(0.42, d - 0.1), o.goods);
    const door = o.door ?? xb - 0.7;
    for (const [p, q] of [[xa, door - 0.5], [door + 0.5, xb]]) {
      if (q - p < 0.1) continue;
      wbox(i, s, GREEN, p, q, cf, cf + 0.45, d - 0.06, d);
      wbox(i, s, 'glass', p, q, cf + 0.45, fy, d - 0.03, d - 0.018);
      const m = Math.round((q - p) / 1.6);
      for (let k = 1; k < m; k++) {
        const x = p + ((q - p) * k) / m;
        wbox(i, s, GREEN, x - 0.03, x + 0.03, cf + 0.45, fy, d - 0.045, d);
      }
    }
    wbox(i, s, GREEN, door - 0.5, door + 0.5, cf + 2.1, fy, d - 0.05, d);
    wbox(i, s, 'glassTint', door - 0.47, door + 0.47, cf, cf + 2.1, d - 0.03, d - 0.018);
    wbox(i, s, BRASS, door + 0.3, door + 0.34, cf + 0.85, cf + 1.25, d - 0.018, d + 0.03);
  } else {
    // Staff space behind a counter: nobody walks in there.
    const back = 0.55;
    wbox(i, s, 'none', xa, xb, cf, fy, 0, d - back, true);
    rows(i, s, xa + 0.1, xb - 0.1, [cf + 1.0, cf + 1.45], 0.05, Math.min(0.35, d - back - 0.05), o.goods);
    wbox(i, s, 'wood:#6b4a32', xa, xb, cf + 0.12, cf + 0.95, d - 0.5, d, true);
    wbox(i, s, 'flat:#3a3d41', xa, xb, cf, cf + 0.12, d - 0.5, d - 0.03, true);
    wbox(i, s, 'wood:#9a7650', xa, xb, cf + 0.95, cf + 1.0, d - 0.55, d + 0.05);
    if (o.noren) noren(i, 'x', s * (i.cw - d + 0.03), xa, xb, fy, { color: o.noren.color, text: o.noren.text, fg: '#fff', face: -s as Wall, h: 0.45 });
  }
  return true;
}

/** Kissa Renga: a glazed café front. */
function cafeBay(i: ConcInfo, bay: Bay): boolean {
  if (!front(i, bay.s, bay.x0, bay.x1, { depth: 0.8, kind: 'glazed', goods: PALETTES.cafe, door: bay.x0 + 1.0 })) return false;
  archSign(i, bay, BRANDS.renga);
  return true;
}

/** Harunire: a set-meal counter with a noren, a board for the day's set and stools. */
function canteenBay(i: ConcInfo, bay: Bay): boolean {
  const { s, x0, x1 } = bay, d = 1.2;
  if (!front(i, s, x0, x1, { depth: d, kind: 'counter', goods: ['#e8e2d0', '#b23a3a', '#6aa84f'], clear: 1.4, noren: { color: '#1f2a44', text: '定食' } })) return false;
  archSign(i, bay, BRANDS.harunire);
  const { b, cf } = i, xm = (x0 + x1) / 2;
  b.sign({ k: 'label', text: '日替わり定食', sub: 'Daily set meal', fg: '#fff', bg: '#1f2a44' }, xm, cf + 2.02, s * (i.cw - 0.045), [0, -s], 1.6, 0.28);
  // Stools along the counter (inside the claimed footprint).
  const n = Math.floor((x1 - x0 - 1) / 1.2);
  for (let k = 0; k < n; k++) {
    const x = x0 + 0.5 + (x1 - x0 - 1) * ((k + 0.5) / n), z = s * (i.cw - d - 0.35);
    b.block(x - 0.18, cf, z - 0.18, x + 0.18, cf + 0.71, z + 0.18);
    b.mesh('paint:#7a2a12', 'cyl', x, cf + 0.68, z, 0.34, 0.06, 0.34);
    b.mesh(IRON, 'cyl', x, cf + 0.33, z, 0.06, 0.65, 0.06);
    b.mesh(IRON, 'cyl', x, cf + 0.015, z, 0.3, 0.03, 0.3);
  }
  return true;
}

/** The co-op: a glazed stationery shop with two self-service copiers standing in front. */
function coopBay(i: ConcInfo, bay: Bay): boolean {
  const { s, x0, x1 } = bay, d = 0.6;
  if (!front(i, s, x0, x1, { depth: d, kind: 'glazed', goods: PALETTES.conbini, door: x0 + 1.0, clear: 1.3 })) return false;
  archSign(i, bay, BRANDS.coop);
  const { b, cf } = i;
  for (let k = 0; k < 2; k++) {
    const p = x1 - 1.9 + k * 0.85, q = p + 0.78;
    wbox(i, s, 'flat:#e3e3df', p, q, cf, cf + 0.95, d + 0.05, d + 0.65, true);
    wbox(i, s, 'flat:#5a5f66', p, q, cf + 0.95, cf + 1.0, d + 0.05, d + 0.65);
    wbox(i, s, 'glow:#bfe4ff', p + 0.45, p + 0.7, cf + 0.96, cf + 1.02, d + 0.5, d + 0.6);
  }
  const xm = x1 - 1.9 + 0.82;
  wbox(i, s, GREEN, xm - 0.8, xm + 0.8, cf + 1.15, cf + 1.5, d + 0.05, d + 0.08);
  b.sign({ k: 'label', text: 'セルフコピー', sub: 'Self-service copies', fg: '#fff', bg: '#2e6b35' }, xm, cf + 1.325, s * (i.cw - d - 0.085), [0, -s], 1.5, 0.3);
  return true;
}

/** Fumikura: open shelves packed with spines, a table of piles, a bargain cart outside. */
function bookBay(i: ConcInfo, bay: Bay): boolean {
  const { s, x0, x1 } = bay, D = 1.3;
  const [za, zb] = band(i, s, 0, D + 1.4);
  if (x1 - x0 < 4 || !i.free(x0, za, x1, zb)) return false;
  i.claim(x0, za, x1, zb);
  const { b, cf } = i, xa = x0 + 0.15, xb = x1 - 0.15;
  frame(i, s, x0, x1, D);
  archSign(i, bay, BRANDS.fumikura);
  wbox(i, s, 'none', xa, xb, cf, cf + FY, 0, D, true);
  wbox(i, s, OAK, xa, xb, cf, cf + 2.0, 0.03, 0.05);
  wbox(i, s, OAK, xa, xb, cf + 1.95, cf + 1.99, 0.05, 0.45);
  for (const y of [cf + 0.15, cf + 0.75, cf + 1.35]) {
    wbox(i, s, OAK, xa, xb, y - 0.04, y, 0.05, 0.45);
    for (let x = xa + 0.03; x < xb - 0.2;) {
      const q = Math.min(xb - 0.03, x + 0.3 + i.rand() * 0.35);
      wbox(i, s, `flat:${BOOKS[Math.floor(i.rand() * BOOKS.length)]}`, x, q - 0.012, y, y + 0.36 + i.rand() * 0.14, 0.07, 0.38 + i.rand() * 0.04);
      x = q;
    }
  }
  // The table of piles.
  wbox(i, s, OAK, xa + 0.2, xb - 0.2, cf + 0.7, cf + 0.76, 0.72, D - 0.02);
  wbox(i, s, 'flat:#3a2a20', xa + 0.3, xb - 0.3, cf, cf + 0.7, 0.78, D - 0.08);
  const n = Math.floor((xb - xa - 0.5) / 0.65);
  for (let k = 0; k < n; k++) {
    const x = xa + 0.5 + k * 0.65, h1 = 0.08 + i.rand() * 0.1, h2 = 0.05 + i.rand() * 0.1;
    wbox(i, s, `flat:${BOOKS[k % BOOKS.length]}`, x - 0.16, x + 0.16, cf + 0.76, cf + 0.76 + h1, 0.88, 1.12);
    wbox(i, s, `flat:${BOOKS[(k + 3) % BOOKS.length]}`, x - 0.13, x + 0.15, cf + 0.76 + h1, cf + 0.76 + h1 + h2, 0.9, 1.1);
  }
  // Bargain cart outside the door, inside the claimed footprint.
  const ca = xa + 0.4, cc = ca + 1.1, d0 = D + 0.3, d1 = D + 0.85;
  wbox(i, s, 'wood:#7a5a3a', ca, cc, cf + 0.25, cf + 0.72, d0, d1, true);
  wbox(i, s, 'none', ca - 0.05, cc + 0.3, cf, cf + 0.25, d0, d1, true);
  for (const x of [ca + 0.05, cc - 0.13]) for (const dd of [d0 + 0.03, d1 - 0.11]) wbox(i, s, IRON, x, x + 0.08, cf, cf + 0.25, dd, dd + 0.08);
  for (let x = ca + 0.04; x < cc - 0.12; x += 0.15) {
    wbox(i, s, `flat:${BOOKS[Math.floor(i.rand() * BOOKS.length)]}`, x, x + 0.14, cf + 0.72, cf + 0.92 + i.rand() * 0.08, d0 + 0.08, d1 - 0.12);
  }
  wbox(i, s, IRON, cc, cc + 0.03, cf + 0.6, cf + 0.98, d0 + 0.1, d0 + 0.13);
  wbox(i, s, IRON, cc, cc + 0.03, cf + 0.6, cf + 0.98, d1 - 0.13, d1 - 0.1);
  wbox(i, s, IRON, cc + 0.03, cc + 0.28, cf + 0.95, cf + 0.98, d0 + 0.1, d1 - 0.1);
  b.sign({ k: 'label', text: '見切り本', sub: 'Bargain books', fg: '#3d2014', bg: '#f2d16b' }, (ca + cc) / 2, cf + 0.48, s * (i.cw - d1 - 0.006), [0, -s], 0.9, 0.3);
  return true;
}

/** A cork noticeboard on the wall, framed, densely pinned, a poster or two over the flyers. */
function corkWall(i: ConcInfo, s: Wall, x0: number, x1: number, v: number) {
  const { cf } = i, y0 = cf + 0.72, y1 = cf + 2.18;
  wbox(i, s, CORK, x0, x1, y0, y1, 0.008, 0.022);
  for (const [p, q, a, c] of [[x0, x1, y0 - 0.05, y0], [x0, x1, y1, y1 + 0.05], [x0 - 0.05, x0, y0 - 0.05, y1 + 0.05], [x1, x1 + 0.05, y0 - 0.05, y1 + 0.05]]) {
    wbox(i, s, RAIL, p, q, a, c, 0.008, 0.034);
  }
  flyers(i.rand, x0 + 0.05, x1 - 0.05, y0 + 0.05, y1 - 0.05, (mat, a, c, ya, yb) => wbox(i, s, mat, a, c, ya, yb, 0.028, 0.03));
  const xs = x1 - x0 > 5 ? [x0 + 1.4, x1 - 2.2] : [(x0 + x1) / 2];
  xs.forEach((x, k) => i.b.sign({ k: 'poster', v: v + k }, x, cf + 1.45, s * (i.cw - 0.036), [0, -s], 0.62, 0.88));
}

/** A free-standing double-sided noticeboard on legs, 2.6 m long along x (solid, claimed). */
function standBoard(i: ConcInfo, xc: number, zc: number): boolean {
  if (!i.free(xc - 1.3, zc - 0.3, xc + 1.3, zc + 0.3)) return false;
  i.claim(xc - 1.5, zc - 0.6, xc + 1.5, zc + 0.6);
  const { b, cf } = i;
  b.block(xc - 1.3, cf, zc - 0.3, xc + 1.3, cf + 2.16, zc + 0.3);
  b.deco(RAIL, xc - 1.3, cf + 0.5, zc - 0.04, xc + 1.3, cf + 2.0, zc + 0.04);
  b.deco(GREEN, xc - 1.3, cf + 2.0, zc - 0.04, xc + 1.3, cf + 2.16, zc + 0.04);
  for (const x of [xc - 1.2, xc + 1.2]) {
    b.deco(RAIL, x - 0.04, cf, zc - 0.04, x + 0.04, cf + 0.5, zc + 0.04);
    b.deco(RAIL, x - 0.04, cf, zc - 0.3, x + 0.04, cf + 0.06, zc + 0.3);
  }
  for (const f of [-1, 1]) {
    const face = zc + f * 0.04;
    b.deco(CORK, xc - 1.24, cf + 0.56, Math.min(face, face + f * 0.006), xc + 1.24, cf + 1.94, Math.max(face, face + f * 0.006));
    flyers(i.rand, xc - 1.2, xc + 1.2, cf + 0.6, cf + 1.9, (mat, a, c, ya, yb) => {
      const z0 = face + f * 0.012, z1 = face + f * 0.014;
      b.deco(mat, a, ya, Math.min(z0, z1), c, yb, Math.max(z0, z1));
    }, 0.6);
    b.sign({ k: 'label', text: 'サークル掲示板', sub: 'Club notices', fg: '#f4efe2', bg: '#2f4a3a' }, xc, cf + 2.08, zc + f * 0.046, [0, f], 1.6, 0.14);
  }
  return true;
}

/** The noticeboard court, wall side: a pinned wall, two free-standing boards, the rowing club's banner. */
function courtBay(i: ConcInfo, bay: Bay): boolean {
  const { s, x0, x1 } = bay, [wa, wb] = band(i, s, 0, 0.1);
  if (x1 - x0 < 4 || !i.free(x0, wa, x1, wb)) return false;
  i.claim(x0, wa, x1, wb);
  corkWall(i, s, x0 + 0.2, x1 - 0.2, 2);
  clubBanner(i, bay, CLUBS[0]);
  // The boards stand 2.4 m out, leaving a reading nook behind and the way past in front.
  const xm = (x0 + x1) / 2, zc = s * (i.cw - 2.4);
  for (const xc of [xm - 1.65, xm + 1.65]) standBoard(i, xc, zc);
  return true;
}

/** One tatekan: a painted plywood board on two posts and feet, standing 0.3 m off the wall (solid). */
function tatekan(i: ConcInfo, s: Wall, x: number, club: Club) {
  const { cf } = i;
  wbox(i, s, 'none', x, x + 0.8, cf, cf + 1.95, 0.1, 0.6, true);
  for (const p of [x + 0.06, x + 0.69]) {
    wbox(i, s, 'wood:#5a4636', p, p + 0.05, cf, cf + 1.95, 0.25, 0.3);
    wbox(i, s, 'wood:#5a4636', p, p + 0.05, cf, cf + 0.06, 0.1, 0.58);
  }
  wbox(i, s, PLY, x, x + 0.8, cf + 0.3, cf + 1.95, 0.3, 0.33);
  i.b.sign({ k: 'shop', ja: `${club.ja} 部員募集`, bg: club.bg, fg: club.fg, vertical: true }, x + 0.4, cf + 1.12, s * (i.cw - 0.335), [0, -s], 0.66, 1.5);
}

/** The noticeboard court, tatekan side: a row of club signboards, flyers pasted above, a banner. */
function tatekanBay(i: ConcInfo, bay: Bay): boolean {
  const { s, x0, x1 } = bay, n = Math.min(6, Math.floor((x1 - x0 - 0.3) / 1.12));
  const [za, zb] = band(i, s, 0, 0.95);
  if (n < 2 || !i.free(x0, za, x1, zb)) return false;
  i.claim(x0, za, x1, zb);
  const span = n * 0.8 + (n - 1) * 0.32, start = (x0 + x1) / 2 - span / 2;
  for (let k = 0; k < n; k++) tatekan(i, s, start + k * 1.12, CLUBS[(k + 1) % CLUBS.length]);
  flyers(i.rand, x0 + 0.2, x1 - 0.2, i.cf + 1.99, i.cf + 2.25, (mat, a, c, ya, yb) => wbox(i, s, mat, a, c, ya, yb, 0.008, 0.01), 0.8);
  clubBanner(i, bay, CLUBS[1]);
  return true;
}

/** Lockers and drink machines with their recycling bins. */
function lockerBay(i: ConcInfo, bay: Bay): boolean {
  if (!lockers(i, bay.s, bay.x0 + 0.1, 2)) return false;
  vendingRow(i, bay.s, bay.x0 + 3.5, 2, true);
  return true;
}

/** Two wooden benches against the wall, a globe lamp between them, the light-music club's banner. */
function restBay(i: ConcInfo, bay: Bay): boolean {
  const { s, x0, x1 } = bay, z = s * (i.cw - 0.75);
  const a = bench(i, x0 + 1.2, z, { axis: 'x', len: 1.8, color: '#2f4a3a', margin: 0.25 });
  const c = bench(i, x1 - 1.2, z, { axis: 'x', len: 1.8, color: '#2f4a3a', margin: 0.25 });
  if (!a && !c) return false;
  lampStd(i, (x0 + x1) / 2, s * (i.cw - 0.7));
  clubBanner(i, bay, CLUBS[2]);
  return true;
}

/** A bay nothing else fits (over the transfer stairs): two old framed posters, if the wall is free. */
function posterBay(i: ConcInfo, bay: Bay, v: number) {
  const { s, x0, x1 } = bay, cf = i.cf, [wa, wb] = band(i, s, 0, 0.1);
  for (const x of [(x0 + x1) / 2 - 1.8, (x0 + x1) / 2 + 1.8]) {
    if (!i.free(x - 0.55, wa, x + 0.55, wb)) continue;
    i.claim(x - 0.55, wa, x + 0.55, wb);
    wbox(i, s, RAIL, x - 0.55, x + 0.55, cf + 0.65, cf + 2.15, 0.008, 0.028);
    i.b.sign({ k: 'poster', v: v++ % 8 }, x, cf + 1.4, s * (i.cw - 0.033), [0, -s], 1.0, 1.4);
  }
}

// ── The look ─────────────────────────────────────────────────────────────────────────────────

export const look: StationLook = {
  finishes: { wall: BRICK, floor: 'floor:#b9a284', pillar: BRICK, ceil: PLASTER },
  posters: false,
  skirting: false,

  lights(i) {
    const { b, cf } = i, top = cf + i.clear, G = grid(i), pz = pillarZ(i), bottom = cf + 2.42;
    // One globe in each side coffer, two down the middle aisle (none over the kiosk).
    for (let k = 0; k + 1 < G.length; k++) {
      if (G[k + 1] - G[k] > 12) continue;
      const xm = (G[k] + G[k + 1]) / 2;
      if (pz > 0) for (const s of WALLS) pendant(b, xm, s * (pz + i.cw) / 2, top, bottom);
      for (const x of [xm - 2, xm + 2]) if (i.free(x - 0.2, -0.2, x + 0.2, 0.2)) pendant(b, x, 0, top, bottom);
    }
    // Between each gate line and the grid, and in the unpaid halls.
    for (const e of i.ends) {
      const dir = e.hi ? 1 : -1;
      const near = G.length ? (e.hi ? G[G.length - 1] : G[0]) : e.g - dir * 8;
      const xg = (e.g + near) / 2;
      if (Math.abs(xg - e.g) > 1.5) pendant(b, xg, 0, top, bottom);
      for (const d of [6, 11.5]) for (const z of [-5.5, 5.5]) pendant(b, e.g + dir * d, z, top, bottom);
    }
    if (!G.length) for (let x = i.paid[0] + 4; x < i.paid[1] - 3; x += 6) for (const z of [-i.cw / 2, i.cw / 2]) pendant(b, x, z, top, bottom);
  },

  pillar(i, x, z, y0, y1) {
    const { b } = i;
    b.deco(BRICK, x - 0.42, y0, z - 0.42, x + 0.42, y1, z + 0.42);
    b.deco(STONE, x - 0.47, y0, z - 0.47, x + 0.47, y0 + 0.45, z + 0.47);
    b.deco(STONE, x - 0.47, y0 + 2.25, z - 0.47, x + 0.47, y0 + SPRING, z + 0.47);
    b.deco(GREEN, x - 0.425, y0 + 2.1, z - 0.425, x + 0.425, y0 + 2.14, z + 0.425);
  },

  concourse(i) {
    const { cf } = i, top = cf + i.clear;
    for (const s of WALLS) walls(i, s);
    const G = grid(i), built = new Set<string>();
    const bays = arcade(i, G, built);
    const arches = ceiling(i, G, built);

    // Fill each bay with the first thing on its wall's list that fits there.
    const plans: Record<string, ((bay: Bay) => boolean)[]> = {
      '1': [(q) => cafeBay(i, q), (q) => courtBay(i, q), (q) => bookBay(i, q), (q) => lockerBay(i, q)],
      '-1': [(q) => canteenBay(i, q), (q) => tatekanBay(i, q), (q) => coopBay(i, q), (q) => restBay(i, q)],
    };
    let v = 3;
    for (const bay of bays) {
      const plan = plans[String(bay.s)];
      const k = plan.findIndex((tryIt) => tryIt(bay));
      if (k >= 0) plan.splice(k, 1);
      else posterBay(i, bay, v++);
    }

    // Benches and globe lamps in the pillar lines, midway between pillars, alternating sides.
    const pz = pillarZ(i);
    if (pz > 0) {
      for (let k = 0; k + 1 < G.length; k++) {
        const xm = (G[k] + G[k + 1]) / 2, s: Wall = k % 2 ? 1 : -1;
        if (k % 2 || !bench(i, xm, s * pz, { axis: 'x', len: 1.8, color: '#2f4a3a' })) lampStd(i, xm, s * pz);
      }
    }
    // A lamp standard in each unpaid hall, between the gates and the exits.
    for (const e of i.ends) lampStd(i, e.g + (e.hi ? 8 : -8), 0);

    // Old pipes along one pillar line, ducking into the ceiling at the cross-arches.
    if (G.length >= 2 && pz > 0) {
      const gaps = arches.map((x): [number, number] => [x - 0.35, x + 0.35]);
      pipeRun(i, 'x', -(pz + 0.9), G[0] - 0.4, G[G.length - 1] + 0.4, top, { n: 3, drop: 0.22, gaps, mats: ['paint:#b8b2a3', 'paint:#8c949b', 'paint:#a33b2f'] });
    }
  },

  exit(e) {
    const { b, cf, ext, run } = e, L = ext + 4, r = seeded(e.num.charCodeAt(0) * 13 + e.station.id.length);
    exitDado(e, { mat: BRICK_DARK, top: 1.1, cap: STONE });
    // Cream plaster above the dado, up to each ceiling (corridor 2.5, lobby 2.7).
    if (ext > 0) {
      b.deco(PLASTER, -4, cf + 1.15, 0, -3.992, cf + 2.5, ext);
      b.deco(PLASTER, -0.008, cf + 1.15, 0, 0, cf + 2.5, ext);
    }
    b.deco(PLASTER, -4, cf + 1.15, ext, -3.992, cf + 2.7, L);
    b.deco(PLASTER, -0.008, cf + 1.15, ext, 0, cf + 2.7, ext + 0.9);
    b.deco(PLASTER, -4, cf + 1.15, L - 0.008, 0, cf + 2.7, L);
    // Flyers pasted on the lobby walls (clear of the kit's poster at x = −2 on the back wall).
    flyers(r, ext + 0.4, L - 0.4, cf + 1.3, cf + 2.1, (mat, a, c, ya, yb) => b.deco(mat, -3.986, ya, a, -3.984, yb, c), 0.5);
    for (const [p, q] of [[-3.8, -2.75], [-1.25, -0.2]]) {
      flyers(r, p, q, cf + 1.25, cf + 2.1, (mat, a, c, ya, yb) => b.deco(mat, a, ya, L - 0.016, c, yb, L - 0.014), 0.7);
    }
    // Dark iron handrails up both stair walls.
    const stairY = (x: number) => cf + ((e.gy - cf) * Math.max(0, Math.min(run, x))) / run;
    const n = Math.max(5, Math.round(run / 1.2));
    for (const [z, f] of [[ext + 1.2, 1], [L, -1]] as const) {
      for (let k = 0; k < n; k++) {
        const xa = (run * k) / n, xb = (run * (k + 1)) / n, y = stairY((xa + xb) / 2) + 0.85;
        b.deco(IRON, xa, y, Math.min(z + f * 0.05, z + f * 0.1), xb, y + 0.045, Math.max(z + f * 0.05, z + f * 0.1));
      }
      for (let k = 1; k < 4; k++) {
        const x = (run * k) / 4, y = stairY(x) + 0.85;
        b.deco(IRON, x - 0.02, y - 0.05, Math.min(z, z + f * 0.08), x + 0.02, y, Math.max(z, z + f * 0.08));
      }
    }
    pendant(b, -2, ext + 0.7, cf + 2.7, cf + 2.33, 0.24);
  },

  canopy(e) {
    const { b, gy, ext, run } = e, X = run, z0 = ext + 1.2, z1 = ext + 4.0, zc = (z0 + z1) / 2;
    // Brick piers either side of the stair mouth at its street end, on stone bases.
    for (const [p, q] of [[z0 - 0.6, z0], [z1, z1 + 0.6]]) {
      b.deco(BRICK, X - 0.6, gy, p, X, gy + 2.55, q);
      b.deco(STONE, X - 0.64, gy, p - 0.04, X + 0.04, gy + 0.35, q + 0.04);
    }
    // Stone lintel over the entrance sign, and a dark board behind the sign.
    b.deco(STONE, X - 0.64, gy + 2.55, z0 - 0.64, X + 0.04, gy + 2.8, z1 + 0.64);
    b.deco(IRON, X - 0.03, gy + 1.88, z0 - 0.1, X + 0.04, gy + 2.52, z1 + 0.1);
    // Wrought-iron arch on the lintel: a stepped half-ellipse, spindles, a brass medallion.
    const xa = X - 0.32, xb = X - 0.28, y0 = gy + 2.8, rise = 0.75, R = (z1 - z0) / 2 + 0.05, N = 5;
    const pts = Array.from({ length: N + 1 }, (_, k) => {
      const t = (k / N) * (Math.PI / 2);
      return [R * Math.cos(t), y0 + rise * Math.sin(t)] as const;
    });
    for (const sd of [-1, 1]) {
      for (let k = 0; k < N; k++) {
        const [r0, h0] = pts[k], [r1, h1] = pts[k + 1];
        const za = zc + sd * r0, zb = zc + sd * r1;
        b.deco(IRON, xa, h0, za - 0.018, xb, h1 + 0.018, za + 0.018);
        b.deco(IRON, xa, h1 - 0.018, Math.min(za, zb), xb, h1 + 0.018, Math.max(za, zb));
      }
    }
    for (let j = -2; j <= 2; j++) {
      const z = zc + (j * R) / 3, h = y0 + rise * Math.sqrt(1 - ((j / 3) ** 2));
      b.deco(IRON, xa + 0.005, y0, z - 0.012, xb - 0.005, h, z + 0.012);
    }
    b.mesh(BRASS, 'sphere', X - 0.3, y0 + rise * 0.55, zc, 0.07, 0.28, 0.28);
    // A lamp on each pier.
    for (const z of [z0 - 0.3, z1 + 0.3]) {
      b.mesh(IRON, 'cyl', X - 0.3, gy + 2.86, z, 0.16, 0.12, 0.16);
      b.mesh(OPAL, 'sphere', X - 0.3, gy + 3.09, z, 0.34, 0.34, 0.34);
      b.mesh(IRON, 'cyl', X - 0.3, gy + 3.28, z, 0.12, 0.05, 0.12);
    }
    // Stone coping on the parapets round the stair, an iron railing on top.
    const rails: [number, number, number, number][] = [[0, z0 - 0.34, X - 0.6, z0], [0, z1, X - 0.6, z1 + 0.34], [-0.34, z0 - 0.34, 0, z1 + 0.34]];
    for (const [p, a, q, c] of rails) b.deco(STONE, p, gy + 1.0, a, q, gy + 1.06, c);
    for (const z of [z0 - 0.15, z1 + 0.15]) {
      b.deco(IRON, 0, gy + 1.56, z - 0.02, X - 0.6, gy + 1.6, z + 0.02);
      for (let x = 0.2; x < X - 0.7; x += 1.8) b.deco(IRON, x - 0.018, gy + 1.06, z - 0.018, x + 0.018, gy + 1.56, z + 0.018);
    }
    b.deco(IRON, -0.17, gy + 1.56, z0 - 0.15, -0.13, gy + 1.6, z1 + 0.15);
  },

  passage(p) {
    const { b, pf } = p, r = seeded(p.other.id.charCodeAt(0) * 7 + p.station.id.length);
    for (const w of passageWalls(p)) {
      // Depths d0 … d1 out from this wall's face.
      const zz = (d0: number, d1: number): [number, number] => (w.f > 0 ? [w.z + d0, w.z + d1] : [w.z - d1, w.z - d0]);
      const put = (mat: string, a: number, c: number, y0: number, y1: number, d0: number, d1: number) => {
        const [za, zb] = zz(d0, d1);
        b.deco(mat, a, pf + y0, za, c, pf + y1, zb);
      };
      for (const [a, c] of w.runs) {
        // Brick wainscot with a stone cap, cream plaster above.
        put(BRICK_DARK, a, c, 0, 0.3, 0, 0.018);
        put(STONE, a, c, 1.2, 1.26, 0, 0.022);
        put(PLASTER, a, c, 1.26, 2.8, 0, 0.008);
        // Brass handrail.
        if (c - a > 1) {
          put(BRASS, a + 0.15, c - 0.15, 0.85, 0.895, 0.05, 0.095);
          for (let x = a + 0.4; x < c - 0.2; x += 2.4) put(BRASS, x - 0.02, x + 0.02, 0.81, 0.85, 0, 0.07);
        }
        if (w.f > 0 && c - a >= 1.8) {
          // Blind arcading on the wall without the mural: brick pilasters and stepped arch rings
          // over plaster, flyers pasted in the arches.
          const n = Math.max(1, Math.round((c - a) / 2.6)), pitch = (c - a) / n;
          for (let k = 0; k <= n; k++) {
            const x = a + k * pitch, pa = Math.max(a, x - 0.15), pb = Math.min(c, x + 0.15);
            put(BRICK, pa, pb, 0.3, 1.92, 0, 0.04);
            put(STONE, Math.max(a, pa - 0.03), Math.min(c, pb + 0.03), 1.92, 1.98, 0, 0.05);
          }
          const [ta, tb] = zz(0, 0.04);
          for (let k = 0; k < n; k++) {
            const oa = a + k * pitch + 0.15, oc = a + (k + 1) * pitch - 0.15;
            arch(b, BRICK, 'x', ta, tb, oa, oc, pf + 1.98, pf + 2.32, pf + 2.8, U_SMALL, 0.17);
            flyers(r, oa + 0.15, oc - 0.15, 1.36, 1.84, (mat, fa, fc, ya, yb) => put(mat, fa, fc, ya, yb, 0.014, 0.016), 0.7);
          }
        } else if (w.f < 0 && c - a >= 1.5) {
          flyers(r, a + 0.2, c - 0.2, 1.36, 2.2, (mat, fa, fc, ya, yb) => put(mat, fa, fc, ya, yb, 0.014, 0.016), 0.6);
        }
      }
      // Plaster above the mural (it ends at pf + 2.3).
      if (w.f < 0) put(PLASTER, -23.1, -3.9, 2.33, 2.8, 0, 0.008);
    }
    // The end wall.
    b.deco(BRICK_DARK, -26, pf, p.zc0, -25.982, pf + 0.3, p.zc1);
    b.deco(STONE, -26, pf + 1.2, p.zc0, -25.978, pf + 1.26, p.zc1);
    b.deco(PLASTER, -26, pf + 1.26, p.zc0, -25.992, pf + 2.8, p.zc1);
    // Globes down the passage on the mural side of the kit's strip lights, and the old pipes.
    for (const x of [-21.5, -13.5, -5.5]) pendant(b, x, p.zc0 + 3.2, pf + 2.8, pf + 2.38, 0.26);
    passagePipes(p, { n: 2, mats: ['paint:#b8b2a3', 'paint:#a33b2f'] });
  },
};
