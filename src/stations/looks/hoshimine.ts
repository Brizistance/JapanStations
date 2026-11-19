// Station look: Hoshimine (星峰), the Akanesuji Line's ridge-top station below the city
// observatory (its terminus until the 2008 extension). See Plans/features/station-looks/plan.md.
//
// "Under the night sky": a quiet station that feels like a planetarium foyer. Midnight-blue
// tile, a blue-black ceiling full of stars (denser over the unpaid hall and the gates, a Milky
// Way band, a few invented figures picked out in brass), a brass horizon line with the ridge
// and the observatory dome in silhouette along one wall and the phases of the moon along the
// other. An orrery stands in the unpaid hall; a meteorite in a lit case and a planisphere close
// the paid area. The street entrances are small domed pavilions.

import { rng, type Builder } from '../../world/builder';
import {
  band, bench, cut, doorways, endDado, exitDado, faceDado, fbox, kioskStall, passageDado, passageRails, passageWalls,
  placeAlong, posterRow, shopFront, SHOPS, stairwellFaces, toiletX, vendingRow, wallDado, wbox,
  type Brand, type DadoOpts, type Span, type Wall,
} from './parts';
import type { ConcInfo, StationLook } from './types';

// ── Palette ──────────────────────────────────────────────────────────────────────────────────

const NAVY = '#1d2540';
const GOLD = '#f0d77a';
const WALL = `tile:${NAVY}`;
const DADO = 'tile:#141a2e';
const FLOOR = 'floor:#454e66';
const PATH = 'floor:#7d879e';
const PILLAR = 'tile:#161c30';
const CEIL = 'paint:#0b0f1c';
/** Silhouettes, the dark of the moon, the night inside the orrery's rings. */
const NIGHT = 'flat:#0d1120';
const PLINTH = 'flat:#161c30';
const SKIRT = 'flat:#0e1220';
const BRASS = 'metal:#c9a64a';
const GOLD_GLOW = `glow:${GOLD}`;
const MOON = 'glow:#efe6c8';
const LAMP = 'glow:#fff1d6';
const BULB = 'glow:#ffe6b0';
const STARS = ['light', 'glow:#ffe3a3', 'glow:#b9cdff'];
const FAINT = ['glow:#5d6894', 'glow:#8a95c0'];
const HAZE = 'glow:#1f2748';

const DADO_OPTS: DadoOpts = { mat: DADO, top: 1.1, cap: BRASS, skirting: SKIRT, frieze: BRASS, friezeY: [2.27, 2.31] };

// Invented for this station (record in docs/worldbuilding.md).
const HOSHI_NO_MADO: Brand = { ja: '星の窓', en: 'Hoshi no Mado', bg: NAVY, fg: GOLD, kind: 'goods' };
const MIKAZUKI: Brand = { ja: '三日月珈琲', en: 'Mikazuki Coffee', bg: '#14182b', fg: GOLD, kind: 'cafe' };

// ── Helpers ──────────────────────────────────────────────────────────────────────────────────

/** Each unpaid hall as an x-range (gate line to end wall). */
const halls = (i: ConcInfo): Span[] => i.ends.map((e): Span => (e.hi ? [e.g, Math.min(i.x1, e.g + 16)] : [Math.max(i.x0, e.g - 16), e.g]));

/** True under a station office (the kit's box runs up to the ceiling there). */
const inOffice = (i: ConcInfo, x: number, z: number) => i.ends.some((e) => Math.abs(x - e.g) < 3.1 && z > (i.cw < 9 ? 3.7 : 5.0) - 0.1);

/** True within `m` of a stairwell (walls, portal and all): the ceiling over it is behind walls. */
const inWell = (i: ConcInfo, x: number, z: number, m = 0) =>
  i.stairwells.some(({ footprint: f }) => x > f[0] - m && x < f[2] + m && z > f[1] - m && z < f[3] + m);

/** Sorted pair. */
const pair = (a: number, c: number): Span => (a < c ? [a, c] : [c, a]);

/** A small star on a ceiling whose underside is `top` (6 mm clear of any haze above it). */
function ceilStar(b: Builder, mat: string, x: number, z: number, top: number, s: number) {
  b.deco(mat, x - s / 2, top - 0.012, z - s / 2, x + s / 2, top - 0.007, z + s / 2);
}

/** A star picked from three sizes and three tints. */
function randomStar(b: Builder, R: () => number, x: number, z: number, top: number) {
  const r = R(), t = R();
  ceilStar(b, STARS[t < 0.5 ? 0 : t < 0.75 ? 1 : 2], x, z, top, r < 0.6 ? 0.035 : r < 0.9 ? 0.055 : 0.08);
}

// ── Constellations (invented figures; never labelled) ───────────────────────────────────────

interface Figure {
  /** Stars, in metres about the figure's centre: [along x, along z]. The first is the brightest. */
  pts: [number, number][];
  lines: [number, number][];
}

const FIGURES: Figure[] = [
  // The Fox: head, ears, back, legs and a long tail.
  {
    pts: [[1.9, 0.4], [1.7, 1.1], [2.3, 1.0], [0.9, 0.5], [-0.4, 0.5], [0.9, -0.6], [-0.4, -0.6], [-1.3, 1.1], [-2.1, 0.5]],
    lines: [[0, 1], [1, 2], [2, 0], [0, 3], [3, 4], [3, 5], [4, 6], [4, 7], [7, 8]],
  },
  // The Lantern: a paper lantern on its cord.
  {
    pts: [[0, 1.1], [0, -1.6], [0, -1.1], [0.7, -0.6], [0.8, 0.4], [-0.8, 0.4], [-0.7, -0.6]],
    lines: [[1, 2], [2, 3], [3, 4], [4, 0], [0, 5], [5, 6], [6, 2]],
  },
  // The Kite: a diamond with a trailing tail.
  {
    pts: [[0, 1.3], [0.9, 0], [0, -1.3], [-0.9, 0], [0.3, -2.0], [-0.2, -2.6]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 0], [2, 4], [4, 5]],
  },
  // The Crane: beak, neck, body, two wing tips and a tail.
  {
    pts: [[0, 0], [2.0, 0.2], [1.5, 0.3], [0.8, 0], [-0.3, 1.4], [-0.2, -1.4], [-1.2, 0.1]],
    lines: [[1, 2], [2, 3], [3, 0], [0, 4], [0, 5], [0, 6]],
  },
];

/** A brass line between two stars: one bar if it runs nearly square to the grid, else dashes. */
function starLine(b: Builder, top: number, a: [number, number], c: [number, number]) {
  const dx = c[0] - a[0], dz = c[1] - a[1], len = Math.hypot(dx, dz);
  if (len < 0.35) return;
  const t0 = 0.11 / len, t1 = 1 - t0, w = 0.011, y0 = top - 0.014, y1 = top - 0.009;
  const at = (t: number): [number, number] => [a[0] + dx * t, a[1] + dz * t];
  const alongX = Math.abs(dx) >= Math.abs(dz);
  if ((alongX ? Math.abs(dz) : Math.abs(dx)) < 0.04) {
    const [p, q] = [at(t0), at(t1)];
    const [xa, xb] = pair(p[0], q[0]), [za, zb] = pair(p[1], q[1]);
    b.deco(BRASS, xa - (alongX ? 0 : w), y0, za - (alongX ? w : 0), xb + (alongX ? 0 : w), y1, zb + (alongX ? w : 0));
    return;
  }
  const n = Math.max(2, Math.round(((t1 - t0) * len) / 0.26));
  for (let k = 0; k < n; k++) {
    const [x, z] = at(t0 + ((t1 - t0) * (k + 0.5)) / n);
    const hx = alongX ? 0.065 : w, hz = alongX ? w : 0.065;
    b.deco(BRASS, x - hx, y0, z - hz, x + hx, y1, z + hz);
  }
}

/** A figure centred on (cx, cz), mirrored in x when `flip` is −1. Skipped if it does not fit. */
function figure(i: ConcInfo, f: Figure, cx: number, cz: number, flip: number, top: number) {
  const pts = f.pts.map(([u, v]): [number, number] => [cx + flip * u, cz + v]);
  const xs = pts.map((p) => p[0]), zs = pts.map((p) => p[1]);
  if (Math.min(...xs) < i.x0 + 0.4 || Math.max(...xs) > i.x1 - 0.4) return;
  if (Math.min(...zs) < -i.cw + 0.4 || Math.max(...zs) > i.cw - 0.4) return;
  if (pts.some(([x, z]) => inOffice(i, x, z))) return;
  // Nothing over a stairwell: its ceiling is behind walls (check along the lines too).
  if (pts.some(([x, z]) => inWell(i, x, z, 0.3))) return;
  for (const [p, q] of f.lines) {
    for (let t = 0.1; t < 1; t += 0.1) if (inWell(i, pts[p][0] + (pts[q][0] - pts[p][0]) * t, pts[p][1] + (pts[q][1] - pts[p][1]) * t, 0.3)) return;
  }
  pts.forEach(([x, z], k) => {
    const d = k === 0 ? 0.13 : k % 2 ? 0.09 : 0.07;
    i.b.mesh(k === 0 ? STARS[1] : 'light', 'sphere', x, top - 0.032, z, d, 0.04, d);
  });
  for (const [p, q] of f.lines) starLine(i.b, top, pts[p], pts[q]);
}

// ── Concourse parts ─────────────────────────────────────────────────────────────────────────

/** The orrery: sun on a brass column over three nested orbit rings, planets on rods, round plinth. */
function orrery(i: ConcInfo, x: number, z: number): boolean {
  const { b, cf } = i, h = 1.25;
  if (!i.free(x - h, z - h, x + h, z + h, 2.4)) return false;
  i.claim(x - h - 0.6, z - h - 0.6, x + h + 0.6, z + h + 0.6);
  b.block(x - h, cf, z - h, x + h, cf + 1.25, z + h);

  // Floor inlay: a brass ring round a pale disc, standing proud of the path.
  b.mesh(BRASS, 'cyl', x, cf + 0.006, z, 4.7, 0.012, 4.7);
  b.mesh(PATH, 'cyl', x, cf + 0.009, z, 4.56, 0.018, 4.56);

  // Plinth, brass bands, a stepped top and the column.
  b.mesh(PLINTH, 'cyl', x, cf + 0.45, z, 1.8, 0.9, 1.8);
  b.mesh(BRASS, 'cyl', x, cf + 0.06, z, 1.86, 0.12, 1.86);
  b.mesh(BRASS, 'cyl', x, cf + 0.88, z, 1.88, 0.04, 1.88);
  b.mesh(PLINTH, 'cyl', x, cf + 0.96, z, 1.1, 0.12, 1.1);
  b.mesh(BRASS, 'cyl', x, cf + 1.32, z, 0.12, 0.6, 0.12);

  // Name plaques on the plinth, both ends.
  for (const n of [-1, 1]) {
    const [xa, xb] = pair(x + n * 0.84, x + n * 0.905);
    b.deco(BRASS, xa, cf + 0.4, z - 0.33, xb, cf + 0.7, z + 0.33);
    b.sign({ k: 'label', text: '太陽系儀', sub: 'Orrery', fg: GOLD, bg: '#161c30' }, x + n * 0.912, cf + 0.55, z, [n, 0], 0.6, 0.24);
  }

  // Orbit rings: brass discs each topped by a slightly smaller dark disc, stepping up inwards,
  // so from eye height they read as three brass rings on the night.
  const rings = [2.4, 1.75, 1.1];
  const ringTop = (k: number) => cf + 1.17 + k * 0.012 + 0.012;
  rings.forEach((d, k) => {
    const y = cf + 1.17 + k * 0.012;
    b.mesh(BRASS, 'cyl', x, y, z, d, 0.024, d);
    b.mesh('flat:#0b0f1c', 'cyl', x, y + 0.004, z, d - 0.1, 0.024, d - 0.1);
  });

  // Planets on brass rods standing on the rings: [ring, angle, diameter, colour, height].
  const planets: [number, number, number, string, number][] = [
    [2, 0.6, 0.09, '#b8b0a0', 0.2],
    [1, 2.4, 0.13, '#3c7dc4', 0.26],
    [1, 5.3, 0.11, '#c0583a', 0.18],
    [0, 4.2, 0.2, '#d9b77a', 0.34],
  ];
  for (const [k, a, d, col, ht] of planets) {
    const r = (rings[k] - 0.05) / 2, px = x + r * Math.cos(a), pz = z + r * Math.sin(a);
    const y0 = ringTop(k), py = y0 + ht;
    b.deco(BRASS, px - 0.008, y0, pz - 0.008, px + 0.008, py - d / 2, pz + 0.008);
    b.mesh(`flat:${col}`, 'sphere', px, py, pz, d, d, d);
    if (k === 0) b.mesh(BRASS, 'cyl', px, py, pz, d * 2.2, 0.008, d * 2.2); // a ringed planet
    if (k === 1 && col === '#3c7dc4') {
      // The earth's moon on a short arm.
      b.deco(BRASS, px, py - 0.006, pz - 0.006, px + 0.2, py + 0.006, pz + 0.006);
      b.mesh('flat:#d8d8d0', 'sphere', px + 0.22, py, pz, 0.05, 0.05, 0.05);
    }
  }

  // The sun, and a gold point above it.
  b.mesh('glow:#ffcf5a', 'sphere', x, cf + 1.78, z, 0.38, 0.38, 0.38);
  b.mesh(BRASS, 'cyl', x, cf + 2.02, z, 0.02, 0.1, 0.02);
  b.mesh(GOLD_GLOW, 'sphere', x, cf + 2.1, z, 0.06, 0.06, 0.06);
  return true;
}

/** A meteorite in a lit glass case on a dark plinth, 0.9 m square. */
function meteorite(i: ConcInfo, x: number, z: number): boolean {
  const { b, cf } = i, h = 0.45;
  if (!i.free(x - h, z - h, x + h, z + h, 1.6)) return false;
  i.claim(x - h - 0.7, z - h - 0.7, x + h + 0.7, z + h + 0.7);
  b.box(PLINTH, x - 0.42, cf, z - 0.42, x + 0.42, cf + 0.95, z + 0.42);
  b.deco(BRASS, x - 0.44, cf, z - 0.44, x + 0.44, cf + 0.1, z + 0.44);
  b.deco(BRASS, x - 0.44, cf + 0.95, z - 0.44, x + 0.44, cf + 0.99, z + 0.44);
  // Glass case with a light in its lid.
  b.block(x - 0.4, cf + 0.99, z - 0.4, x + 0.4, cf + 1.67, z + 0.4);
  b.deco('glass', x - 0.38, cf + 1.0, z - 0.38, x + 0.38, cf + 1.61, z + 0.38);
  b.deco(BRASS, x - 0.4, cf + 1.61, z - 0.4, x + 0.4, cf + 1.67, z + 0.4);
  b.deco('light', x - 0.28, cf + 1.595, z - 0.28, x + 0.28, cf + 1.603, z + 0.28);
  // The stone: a dark, lumpy stack on a small brass stand.
  b.mesh(BRASS, 'cyl', x, cf + 1.02, z, 0.22, 0.06, 0.22);
  const lumps: [number, number, number, number, number, number, string][] = [
    [-0.13, 1.05, -0.09, 0.1, 1.18, 0.08, '#2b2622'],
    [-0.07, 1.16, -0.1, 0.14, 1.27, 0.05, '#3b332b'],
    [-0.16, 1.12, -0.02, -0.02, 1.22, 0.11, '#3b332b'],
    [0.04, 1.08, 0.0, 0.16, 1.19, 0.12, '#2b2622'],
    [-0.04, 1.25, -0.05, 0.07, 1.32, 0.04, '#2b2622'],
  ];
  for (const [a, y0, c, d, y1, e, col] of lumps) b.deco(`flat:${col}`, x + a, cf + y0, z + c, x + d, cf + y1, z + e);
  b.mesh('flat:#2b2622', 'sphere', x - 0.02, cf + 1.2, z + 0.02, 0.26, 0.2, 0.22);
  for (const n of [-1, 1]) {
    b.sign({ k: 'label', text: '隕石', sub: 'Meteorite', fg: GOLD, bg: '#161c30' }, x + n * 0.43, cf + 0.62, z, [n, 0], 0.6, 0.22);
  }
  return true;
}

/** The observatory's notice board on long wall `s`, 2.2 long: header and pinned sheets only. */
function noticeBoard(i: ConcInfo, s: Wall, x0: number): boolean {
  const { b, cf, cw } = i, w = 2.2;
  const [za, zb] = band(i, s, 0, 0.5);
  if (!i.free(x0 - 0.1, za, x0 + w + 0.1, zb)) return false;
  const [ca, cb] = band(i, s, 0, 0.08);
  i.claim(x0 - 0.1, ca, x0 + w + 0.1, cb);
  const xc = x0 + w / 2;
  wbox(i, s, 'wood:#3a2a1e', x0, x0 + w, cf + 0.95, cf + 2.15, 0.008, 0.04);
  wbox(i, s, 'flat:#24304f', x0 + 0.06, x0 + w - 0.06, cf + 1.01, cf + 2.09, 0.04, 0.046);
  b.sign({ k: 'label', text: '星峰天文台', sub: 'Hoshimine Observatory', fg: GOLD, bg: NAVY }, xc, cf + 1.96, s * (cw - 0.058), [0, -s], 1.8, 0.22);
  b.sign({ k: 'label', text: '観望会のおしらせ', sub: 'Stargazing evenings', fg: NAVY, bg: '#f4efe2' }, x0 + 0.6, cf + 1.55, s * (cw - 0.058), [0, -s], 0.9, 0.42);
  b.sign({ k: 'label', text: '今月の星空', sub: "This month's sky", fg: GOLD, bg: '#1a2036' }, x0 + 1.6, cf + 1.55, s * (cw - 0.058), [0, -s], 0.8, 0.42);
  wbox(i, s, 'flat:#dfe8f5', x0 + 0.2, x0 + 0.75, cf + 1.06, cf + 1.3, 0.046, 0.052);
  wbox(i, s, 'flat:#f4efe2', x0 + 1.3, x0 + 1.95, cf + 1.08, cf + 1.32, 0.046, 0.052);
  return true;
}

/** The observatory shop: a dark glazed front with a globe in the window. */
function giftShop(i: ConcInfo, s: Wall, x0: number, w: number): boolean {
  const ok = shopFront(i, {
    s, x0, x1: x0 + w, brand: HOSHI_NO_MADO, depth: 0.6, front: 'glazed', body: 'flat:#232b48',
    goods: [GOLD, '#3c5aa6', '#e8e2d0', '#7a5ea8', '#c94f3d'],
  });
  if (!ok) return false;
  const { b, cf, cw } = i, gx = x0 + 0.7, gz = s * (cw - 0.3);
  b.mesh(BRASS, 'cyl', gx, cf + 1.97, gz, 0.02, 0.04, 0.02);
  b.mesh('flat:#3c5aa6', 'sphere', gx, cf + 2.1, gz, 0.22, 0.22, 0.22);
  b.mesh(BRASS, 'cyl', gx, cf + 2.1, gz, 0.28, 0.01, 0.28);
  return true;
}

/** The café, with a crescent moon on a blade sign standing out from its fascia. */
function cafeMikazuki(i: ConcInfo, s: Wall, x0: number, w: number): boolean {
  const d = 0.8;
  if (!shopFront(i, { s, x0, x1: x0 + w, brand: MIKAZUKI, depth: d, front: 'glazed', body: 'wood:#4a3424', door: x0 + 0.9 })) return false;
  const { b, cf, cw } = i, bx = x0 + w - 0.3;
  wbox(i, s, 'flat:#14182b', bx - 0.02, bx + 0.02, cf + 2.4, cf + 2.9, d, d + 0.7);
  wbox(i, s, BRASS, bx - 0.015, bx + 0.015, cf + 2.9, cf + 2.93, d, d + 0.72);
  // The lit disc, and a dark one over most of it: the crescent shows on both faces.
  b.mesh('glow:#f6dc7a', 'sphere', bx, cf + 2.65, s * (cw - d - 0.42), 0.06, 0.34, 0.34);
  b.mesh('flat:#14182b', 'sphere', bx, cf + 2.69, s * (cw - d - 0.34), 0.075, 0.3, 0.3);
  return true;
}

/** One moon-phase roundel on long wall `s` at x: brass rim, dark disc, lit part in strips. */
function moon(i: ConcInfo, s: Wall, x: number, phase: number) {
  const { b, cf, cw } = i, D = 0.44, y = cf + 2.62;
  b.mesh(BRASS, 'sphere', x, y, s * (cw - 0.007), D + 0.06, D + 0.06, 0.012);
  b.mesh(NIGHT, 'sphere', x, y, s * (cw - 0.013), D, D, 0.014);
  const p = ((phase % 8) + 8) % 8;
  if (p === 0) return;
  const r = D / 2 - 0.01;
  if (p === 4) {
    b.mesh(MOON, 'sphere', x, y, s * (cw - 0.022), 2 * r, 2 * r, 0.016);
    return;
  }
  // Terminator: lit from t·w to w (waxing) or −w to −t·w (waning), w the half-chord at each row.
  const t = Math.cos((Math.PI * p) / 4), N = 8, hh = r / N;
  for (let k = 0; k < N; k++) {
    const yc = -r + (2 * k + 1) * hh, w = Math.sqrt(r * r - yc * yc);
    const [u0, u1] = p < 4 ? [t * w, w] : [-w, -t * w];
    if (u1 - u0 < 0.01) continue;
    wbox(i, s, MOON, x + u0, x + u1, y + yc - hh, y + yc + hh, 0.026, 0.03);
  }
}

/** The ridge in silhouette above the horizon line on long wall `s`, with the observatory dome at dx. */
function skyline(i: ConcInfo, s: Wall, runs: Span[], dx: number | null, R: () => number) {
  const { b, cf } = i, base = cf + 2.31;
  for (const [p, q] of runs) {
    let x = p;
    while (x < q - 0.05) {
      const x2 = Math.min(q, x + 0.5 + R() * 1.1), xm = (x + x2) / 2;
      const near = dx !== null && Math.abs(xm - dx) < 1.5;
      let h = 0.06 + 0.03 * Math.sin(xm * 0.7) + (dx === null ? 0.08 : 0.16 * Math.exp(-(((xm - dx) / 7) ** 2)));
      const house = !near && R() < 0.35;
      if (house) h += 0.05 + R() * 0.09;
      h = Math.min(0.48, Math.max(0.04, h));
      wbox(i, s, NIGHT, x, x2, base, base + h, 0.002, 0.02);
      if (house && h > 0.14 && x2 - x > 0.3) wbox(i, s, 'glow:#ffd98a', xm - 0.03, xm + 0.03, base + h - 0.09, base + h - 0.05, 0.02, 0.026);
      x = x2;
    }
    // Stars on the wall above the ridge.
    for (let x3 = p + 0.4 + R() * 1.2; x3 < q - 0.2; x3 += 1.2 + R() * 1.4) {
      if (dx !== null && Math.abs(x3 - dx) < 0.7) continue;
      const y = cf + 2.62 + R() * 0.3, sz = R() < 0.7 ? 0.03 : 0.045;
      wbox(i, s, R() < 0.5 ? STARS[0] : STARS[1], x3 - sz / 2, x3 + sz / 2, y - sz / 2, y + sz / 2, 0.002, 0.008);
    }
  }
  if (dx === null) return;
  // The observatory: a drum, the pale dome, its shutter slit, and a gold star off to one side.
  const top = base + 0.28, rd = 0.32;
  wbox(i, s, NIGHT, dx - 0.34, dx + 0.34, base, top, 0.002, 0.034);
  b.mesh('metal:#d6dae0', 'sphere', dx, top, s * (i.cw - 0.019), 2 * rd, 2 * rd, 0.026);
  wbox(i, s, NIGHT, dx - 0.025, dx + 0.025, top + 0.04, top + 0.26, 0.034, 0.038);
  wbox(i, s, GOLD_GLOW, dx + 0.6, dx + 0.62, cf + 2.72, cf + 2.84, 0.002, 0.008);
  wbox(i, s, GOLD_GLOW, dx + 0.55, dx + 0.67, cf + 2.77, cf + 2.79, 0.002, 0.008);
}

/** A planisphere on a paid end wall at x: brass rim, dark disc, stars and the ecliptic. */
function planisphere(i: ConcInfo, x: number, R: () => number) {
  const { b, cf } = i, n = x <= i.x0 + 0.01 ? 1 : -1, y = cf + 1.65;
  const [ra, rb] = pair(x, x + n * 0.35);
  if (!i.free(ra, -1.3, rb, 1.3)) return;
  i.claim(ra, -1.3, rb, 1.3);
  b.mesh(BRASS, 'sphere', x + n * 0.03, y, 0, 0.012, 2.08, 2.08);
  b.mesh(NIGHT, 'sphere', x + n * 0.044, y, 0, 0.012, 2.0, 2.0);
  const [sa, sb] = pair(x + n * 0.056, x + n * 0.06);
  b.deco(BRASS, sa, y - 0.008, -0.97, sb, y + 0.008, 0.97);
  for (let k = 0; k < 18; k++) {
    const a = R() * Math.PI * 2, r = Math.sqrt(R()) * 0.88, s = R() < 0.7 ? 0.025 : 0.045;
    const z = r * Math.cos(a), yy = y + r * Math.sin(a);
    b.deco(STARS[k % 3], sa, yy - s / 2, z - s / 2, sb, yy + s / 2, z + s / 2);
  }
  b.sign({ k: 'label', text: '星座早見盤', sub: 'Planisphere', fg: GOLD, bg: NAVY }, x + n * 0.03, cf + 0.45, 0, [n, 0], 0.9, 0.2);
}

/** Brass frame round the kit's mural on an unpaid end wall at x, skirting and the horizon line either side. */
function muralFrame(i: ConcInfo, x: number) {
  const { b, cf, cw } = i, n = x <= i.x0 + 0.01 ? 1 : -1, mw = Math.min(2 * cw - 6, 16) / 2;
  const [xa, xb] = pair(x + n * 0.004, x + n * 0.016);
  b.deco(BRASS, xa, cf + 2.6, -mw - 0.06, xb, cf + 2.66, mw + 0.06);
  b.deco(BRASS, xa, cf + 0.44, -mw - 0.06, xb, cf + 0.5, mw + 0.06);
  for (const k of [-1, 1]) {
    const [za, zb] = pair(k * mw, k * (mw + 0.06));
    b.deco(BRASS, xa, cf + 0.5, za, xb, cf + 2.6, zb);
  }
  const [sa, sb] = pair(x, x + n * 0.018);
  b.deco(SKIRT, sa, cf, -cw, sb, cf + 0.13, cw);
  const [ha, hb] = pair(x, x + n * 0.012);
  for (const k of [-1, 1]) {
    if (cw - mw < 0.4) continue;
    const [za, zb] = pair(k * (mw + 0.15), k * cw);
    b.deco(BRASS, ha, cf + 2.27, za, hb, cf + 2.31, zb);
  }
}

/**
 * Brass four-point stars set into the floor of the paid area, in the lanes either side of the
 * route (the bands and the tactile path own the middle). Only where the floor is free.
 */
function floorStars(i: ConcInfo) {
  const { b, cf } = i;
  for (let x = i.paid[0] + 2.5; x < i.paid[1] - 1.5; x += 4.5) {
    for (const z of [-4, 4]) {
      if (!i.free(x - 0.4, z - 0.4, x + 0.4, z + 0.4, 0.8)) continue;
      b.deco(BRASS, x - 0.28, cf, z - 0.03, x + 0.28, cf + 0.012, z + 0.03);
      b.deco(BRASS, x - 0.03, cf, z - 0.28, x + 0.03, cf + 0.012, z + 0.28);
    }
  }
}

/**
 * The stairwells' outer walls: midnight tile with the dark dado, the brass horizon line (as on
 * the long walls), a few stars above and below it and, on the long stretches, a lit brass star.
 */
function dressWells(i: ConcInfo, R: () => number) {
  const { b, cf } = i;
  for (const w of i.stairwells) {
    for (const f of stairwellFaces(i, w)) {
      faceDado(i, f, DADO_OPTS);
      for (let u = f.u0 + 0.35 + R() * 0.5; u < f.u1 - 0.2; u += 0.8 + R() * 1.1) {
        const sz = R() < 0.7 ? 0.03 : 0.045, y = cf + (R() < 0.55 ? 1.45 + R() * 0.7 : 2.45 + R() * 0.4);
        fbox(b, f, STARS[R() < 0.5 ? 0 : 1], u - sz / 2, u + sz / 2, y - sz / 2, y + sz / 2, 0.002, 0.008);
      }
      if (f.u1 - f.u0 >= 2.2) {
        const um = (f.u0 + f.u1) / 2, y = cf + 1.75;
        fbox(b, f, GOLD_GLOW, um - 0.2, um + 0.2, y - 0.012, y + 0.012, 0.002, 0.01);
        fbox(b, f, GOLD_GLOW, um - 0.012, um + 0.012, y - 0.2, y + 0.2, 0.002, 0.01);
        for (const k of [-1, 1]) fbox(b, f, STARS[0], um + k * 0.5 - 0.02, um + k * 0.5 + 0.02, y - 0.02, y + 0.02, 0.002, 0.008);
      }
    }
  }
}

// ── The look ─────────────────────────────────────────────────────────────────────────────────

export const look: StationLook = {
  finishes: { wall: WALL, floor: FLOOR, pillar: PILLAR, ceil: CEIL },
  posters: false,
  skirting: false,

  lights(i) {
    const { b, cw } = i, top = i.cf + i.clear, R = rng(0x5717);
    const H = halls(i);
    const inside = (x: number, z: number, m = 0.2) => x > i.x0 + m && x < i.x1 - m && Math.abs(z) < cw - m && !inOffice(i, x, z) && !inWell(i, x, z, m + 0.1);

    // The Milky Way across each unpaid hall: faint haze patches and a dense band of faint stars.
    for (const [p, q] of H) {
      const a: [number, number] = [p, -cw * 0.85], c: [number, number] = [q, cw * 0.85];
      const ln = Math.hypot(c[0] - a[0], c[1] - a[1]), nx = -(c[1] - a[1]) / ln, nz = (c[0] - a[0]) / ln;
      const on = (t: number, off: number): [number, number] => [a[0] + (c[0] - a[0]) * t + nx * off, a[1] + (c[1] - a[1]) * t + nz * off];
      for (let k = 0; k < 8; k++) {
        const [x, z] = on((k + 0.5) / 8, (R() - 0.5) * 0.6), s = 0.35 + R() * 0.3;
        if (!inside(x, z, s + 0.1)) continue;
        b.deco(HAZE, x - s, top - 0.006, z - s * 0.8, x + s, top - 0.005, z + s * 0.8);
      }
      for (let k = 0; k < 45; k++) {
        const [x, z] = on(R(), (R() + R() + R() - 1.5) * 1.1);
        if (inside(x, z)) ceilStar(b, FAINT[R() < 0.7 ? 0 : 1], x, z, top, R() < 0.7 ? 0.025 : 0.035);
      }
    }

    // The star field: thick over the unpaid halls and the gates, thinning out over the paid area.
    const dense = (x: number) => H.some(([p, q]) => x > p - 4 && x < q + 4);
    for (let k = 0; k < 210; k++) {
      const x = i.x0 + 0.3 + R() * (i.x1 - i.x0 - 0.6), z = (R() * 2 - 1) * (cw - 0.3);
      if (R() > (dense(x) ? 1 : 0.22) || !inside(x, z)) continue;
      randomStar(b, R, x, z, top);
    }

    // Figures: two over each unpaid hall, two over the paid area.
    i.ends.forEach((e, k) => {
      const [p, q] = H[k], hc = (p + q) / 2, f = e.hi ? -1 : 1;
      figure(i, FIGURES[0], hc - f * 2.5, -cw * 0.5, f, top);
      figure(i, FIGURES[1], hc + f * 3, cw * 0.45, f, top);
    });
    const pm = (i.paid[0] + i.paid[1]) / 2;
    figure(i, FIGURES[2], pm + 6, cw * 0.5, 1, top);
    figure(i, FIGURES[3], pm - 6, -cw * 0.5, 1, top);

    // Discreet warm downlights: two rows down the middle, two near the walls, and a row each
    // side of every gate line so the gates are well lit.
    const lamp = (x: number, z: number) => {
      if (inside(x, z, 0.3)) b.mesh(LAMP, 'cyl', x, top - 0.012, z, 0.2, 0.016, 0.2);
    };
    const gates = i.ends.map((e) => e.g);
    for (const zf of [0.3, -0.3]) for (let x = i.x0 + 2; x < i.x1 - 1; x += 3.2) if (!gates.some((g) => Math.abs(x - g) < 2.2)) lamp(x, zf * cw);
    for (const zf of [0.8, -0.8]) for (let x = i.x0 + 2.8; x < i.x1 - 1; x += 4.8) if (!gates.some((g) => Math.abs(x - g) < 2.2)) lamp(x, zf * cw);
    for (const g of gates) for (const dx of [-1.6, 1.6]) for (let z = -(cw - 3); z <= cw - 3 + 0.01; z += 2) lamp(g + dx, z);
  },

  pillar(i, x, z, y0, y1) {
    const { b } = i, D = 0.8;
    b.mesh(i.pillar, 'cyl', x, (y0 + y1) / 2, z, D, y1 - y0, D);
    b.mesh(BRASS, 'cyl', x, y0 + 0.07, z, D + 0.06, 0.14, D + 0.06);
    b.mesh(BRASS, 'cyl', x, y0 + 2.29, z, D + 0.03, 0.04, D + 0.03);
    // Capital: a dark collar with a brass ring under it.
    b.mesh(NIGHT, 'cyl', x, y1 - 0.102, z, D + 0.14, 0.2, D + 0.14);
    b.mesh(BRASS, 'cyl', x, y1 - 0.217, z, D + 0.18, 0.03, D + 0.18);
    // A small lit star on the faces seen along the hall.
    const ys = y0 + 2.47;
    for (const nx of [-1, 1]) {
      const [xa, xb] = pair(x + nx * (D / 2 + 0.004), x + nx * (D / 2 + 0.02));
      b.deco(GOLD_GLOW, xa, ys - 0.012, z - 0.11, xb, ys + 0.012, z + 0.11);
      b.deco(GOLD_GLOW, xa, ys - 0.11, z - 0.012, xb, ys + 0.11, z + 0.012);
    }
    // A brass-shaded lamp on the side facing the middle of the hall.
    const f = Math.abs(z) > 0.3 ? -Math.sign(z) : 1, lz = z + f * 0.66;
    const [za, zb] = pair(z + f * 0.38, lz);
    b.deco(BRASS, x - 0.015, y0 + 2.66, za, x + 0.015, y0 + 2.69, zb);
    b.deco(BRASS, x - 0.01, y0 + 2.62, lz - 0.01, x + 0.01, y0 + 2.66, lz + 0.01);
    b.mesh(BRASS, 'cone', x, y0 + 2.52, lz, 0.32, 0.2, 0.32);
    b.mesh(BULB, 'sphere', x, y0 + 2.42, lz, 0.15, 0.09, 0.15);
  },

  concourse(i) {
    const { cw } = i, R = rng(0x9137);
    // Walls: dark dado, brass cap and the brass horizon line.
    for (const s of [-1, 1] as const) wallDado(i, s, DADO_OPTS);
    const paidEnds = [...(i.ends.some((e) => !e.hi) ? [] : [i.x0]), ...(i.ends.some((e) => e.hi) ? [] : [i.x1])];
    for (const x of paidEnds) endDado(i, x, DADO_OPTS);
    for (const e of i.ends) muralFrame(i, e.hi ? i.x1 : i.x0);

    // Stairwell walls first (before anything else takes the floor beside them).
    dressWells(i, rng(0x4401));

    // Centrepiece: the orrery wants 2.4 m of free floor all round. The hall is crossed by the
    // floor guidance now, so it stands in the paid area, at the far end beyond the stairs.
    const cands: [number, number][] = [];
    for (const [p, q] of halls(i)) for (const d of [0, -1, 1, -2, 2, -3, 3]) cands.push([(p + q) / 2 + d, 0]);
    for (let x = i.paid[1] - 5.5; x > i.paid[0] + 6; x -= 0.5) for (const z of [0, 2, -2]) cands.push([x, z]);
    for (const [x, z] of cands) if (orrery(i, x, z)) break;

    // Shops along the paid-area walls, recording their fronts so the friezes skip them.
    const fronts: Span[][] = [[], []];
    const put = (w: number, at: (s: Wall, x0: number) => boolean) =>
      placeAlong(i, w, (s, x0) => {
        if (!at(s, x0)) return false;
        fronts[s > 0 ? 1 : 0].push([x0 - 0.05, x0 + w + 0.05]);
        return true;
      });
    put(5, (s, x0) => giftShop(i, s, x0, 5));
    put(4.5, (s, x0) => cafeMikazuki(i, s, x0, 4.5));
    put(2.4, (s, x0) => kioskStall(i, s, x0, SHOPS.maruhoshiKiosk));
    put(2 * 1.05 + 1.4, (s, x0) => vendingRow(i, s, x0, 2));
    placeAlong(i, 2.4, (s, x0) => noticeBoard(i, s, x0));

    // The meteorite towards the far end of the paid area; a planisphere on a paid end wall.
    for (const x of paidEnds) planisphere(i, x, R);
    const mc: [number, number][] = [];
    const far = paidEnds.includes(i.x1) ? -1 : 1;
    const xs = far < 0 ? i.paid[1] - 4 : i.paid[0] + 4;
    for (let k = 0; k < i.paid[1] - i.paid[0] - 8; k++) for (const z of [5, -5, 3.5, -3.5]) mc.push([xs + far * k, z]);
    for (const [x, z] of mc) if (meteorite(i, x, z)) break;

    // Benches midway between pillars, in the pillar lines.
    const spots = i.pillars
      .filter(([x, z]) => i.pillars.some(([x2, z2]) => z2 === z && Math.abs(x2 - x - 8) < 0.01))
      .map(([x, z]): [number, number] => [x + 4, z]);
    let nb = 4;
    for (const [x, z] of spots) if (nb > 0 && bench(i, x, z, { axis: 'x', color: '#8a6a3e' })) nb--;

    floorStars(i);

    // Wall friezes: the ridge and the dome on +z, the moon's phases on −z.
    const doors = doorways(i).map(([p, q]): Span => [p - 0.3, q + 0.3]);
    const office = i.ends.map((e): Span => [e.g - 3.05, e.g + 3.05]);
    const ridgeRuns = cut([i.x0 + 0.1, i.x1 - 0.1], [...doors, ...fronts[1], ...office]);
    const e0 = i.ends[0];
    let dx: number | null = e0 ? e0.g + (e0.hi ? 6 : -6) : null;
    if (dx === null || !ridgeRuns.some(([p, q]) => dx! > p + 0.6 && dx! < q - 0.6)) {
      const best = [...ridgeRuns].sort((p, q) => q[1] - q[0] - (p[1] - p[0]))[0];
      dx = best && best[1] - best[0] > 1.4 ? (best[0] + best[1]) / 2 : null;
    }
    skyline(i, 1, ridgeRuns, dx, R);

    const fare = i.ends.map((e): Span => (e.hi ? [e.g + 2.6, e.g + 8.65] : [e.g - 8.65, e.g - 2.6]));
    const tx = toiletX(i);
    let phase = 0;
    for (const [p, q] of cut([i.x0 + 0.5, i.x1 - 0.5], [...doors, ...fronts[0], ...fare, [tx - 1.2, tx + 1.2]])) {
      const n = Math.floor((q - p) / 2.4);
      for (let k = 0; k < n; k++) moon(i, -1, p + ((q - p) * (k + 0.5)) / n, phase++);
    }

    // A few posters on what is left of the paid-area walls, below the horizon line.
    for (const s of [-1, 1] as const) {
      const a = i.ends.some((e) => !e.hi) ? i.paid[0] + 3.6 : i.paid[0] + 0.5;
      const c = i.ends.some((e) => e.hi) ? i.paid[1] - 3.6 : i.paid[1] - 0.5;
      posterRow(i, s, a, c, { pitch: 5, h: 1.4, y: 1.45, v0: (s > 0 ? 0 : 4) + cw });
    }
  },

  exit(e) {
    const { b, cf, gy, ext, run } = e, L = ext + 4, R = rng(e.num.charCodeAt(0) * 131 + 17);
    exitDado(e, { mat: DADO, top: 1.1, cap: BRASS });
    // The horizon line, above the kit's posters.
    const y0 = cf + 2.38, y1 = cf + 2.42;
    b.deco(BRASS, -4, y0, 0, -3.988, y1, L);
    if (ext > 0) b.deco(BRASS, -0.012, y0, 0, 0, y1, ext);
    b.deco(BRASS, -0.012, y0, ext, 0, y1, ext + 0.9);
    b.deco(BRASS, -4, y0, L - 0.012, 0, y1, L);

    // Brass handrails up both stair walls.
    const stairY = (x: number) => cf + ((gy - cf) * Math.max(0, Math.min(run, x))) / run;
    const n = Math.max(5, Math.round(run / 1.2));
    for (const [z, f] of [[ext + 1.2, 1], [L, -1]] as const) {
      const [za, zb] = pair(z + f * 0.05, z + f * 0.1);
      for (let k = 0; k < n; k++) {
        const xa = (run * k) / n, xb = (run * (k + 1)) / n, y = stairY((xa + xb) / 2) + 0.85;
        b.deco(BRASS, xa, y, za, xb, y + 0.05, zb);
      }
      const [ba, bb] = pair(z, z + f * 0.08);
      for (let k = 1; k < 4; k++) {
        const x = (run * k) / 4, y = stairY(x) + 0.85;
        b.deco(BRASS, x - 0.02, y - 0.04, ba, x + 0.02, y, bb);
      }
      // Stars scattered up the wall above the handrail, below the top of the wall.
      const [sa, sb] = pair(z + f * 0.014, z + f * 0.02);
      for (let k = 0; k < 6; k++) {
        const x = 0.4 + R() * (run - 0.8), y = stairY(x) + 1.3 + R() * 1.1, s = R() < 0.6 ? 0.03 : 0.045;
        if (y + s > gy + 0.9) continue;
        b.deco(STARS[k % 3], x - s / 2, y - s / 2, sa, x + s / 2, y + s / 2, sb);
      }
    }

    // Stars on the corridor and lobby ceilings, clear of the kit's light panels.
    const lit = (x: number, z: number) =>
      (x > -2.4 && x < -1.6 && z > 0.35 && z < ext - 0.15) || (x > -3.35 && x < -0.85 && z > ext + 1.45 && z < ext + 2.35);
    for (let k = 0; k < Math.round(ext * 3); k++) {
      const x = -3.8 + R() * 3.6, z = 0.2 + R() * Math.max(0, ext - 0.4);
      if (!lit(x, z)) randomStar(b, R, x, z, cf + 2.5);
    }
    for (let k = 0; k < 16; k++) {
      const x = -3.8 + R() * 3.3, z = ext + 0.2 + R() * 3.6;
      if (!lit(x, z)) randomStar(b, R, x, z, cf + 2.7);
    }
  },

  canopy(e) {
    const { b, gy, ext, run } = e, R = rng(e.num.charCodeAt(0) * 71 + 5);
    const roofY = gy + 2.6, zc = ext + 2.6;
    // A dark drum over the stair: side walls above the kit's parapets, a back wall, a flat roof
    // with a brass edge, stars on its underside.
    b.deco(WALL, 0, gy + 1.0, ext + 0.95, run, roofY, ext + 1.12);
    b.deco(WALL, 0, gy + 1.0, ext + 4.08, run, roofY, ext + 4.25);
    b.deco(WALL, -0.3, gy + 1.0, ext + 0.95, 0, roofY, ext + 4.25);
    b.deco(NIGHT, -0.45, roofY, ext + 0.75, run + 0.45, roofY + 0.14, ext + 4.45);
    b.deco(BRASS, -0.47, roofY + 0.03, ext + 0.73, run + 0.47, roofY + 0.11, ext + 4.47);
    for (const [za, zb] of [[ext + 0.92, ext + 1.14], [ext + 4.06, ext + 4.28]]) b.deco(BRASS, 0, gy + 2.42, za, run, gy + 2.46, zb);
    for (let k = 0; k < 14; k++) {
      const x = 0.3 + R() * (run - 0.6), z = ext + 1.35 + R() * 2.5;
      ceilStar(b, STARS[k % 3], x, z, roofY + 0.005, R() < 0.7 ? 0.035 : 0.055);
    }

    // The dome, echoing the observatory: drum, brass ring, pale dome, a stepped shutter slit
    // facing the street, and a gold star on top.
    if (run > 3.2) {
      const D = 2.5, dx = Math.min(Math.max(run * 0.55, 1.5), run - 1.5), yb = roofY + 0.14, yc = yb + 0.9, hh = 0.8;
      b.mesh('flat:#1a2036', 'cyl', dx, yb + 0.45, zc, D + 0.08, 0.9, D + 0.08);
      b.mesh(BRASS, 'cyl', dx, yc, zc, D + 0.16, 0.06, D + 0.16);
      b.mesh('metal:#d6dae0', 'sphere', dx, yc, zc, D, 2 * hh, D);
      const surf = (dy: number) => (D / 2) * Math.sqrt(Math.max(0, 1 - (dy / hh) ** 2));
      for (let k = 0; k < 8; k++) {
        const ya = 0.03 + k * 0.085, yt = ya + 0.085;
        if (yt > hh - 0.02) break;
        b.deco(NIGHT, dx + surf(yt) - 0.02, yc + ya, zc - 0.13, dx + surf(ya) + 0.012, yc + yt, zc + 0.13);
      }
      for (let k = 0; k < 8; k++) {
        const a = (k * Math.PI) / 4, r = (D + 0.08) / 2 + 0.01;
        const x = dx + r * Math.cos(a), z = zc + r * Math.sin(a);
        b.deco(GOLD_GLOW, x - 0.025, yb + 0.55, z - 0.025, x + 0.025, yb + 0.6, z + 0.025);
      }
      b.mesh(BRASS, 'cyl', dx, yc + hh + 0.06, zc, 0.03, 0.14, 0.03);
      b.mesh(GOLD_GLOW, 'sphere', dx, yc + hh + 0.17, zc, 0.14, 0.14, 0.14);
    }

    // The street front: two posts with brass feet and lamps, and the dark board behind the sign.
    for (const pz of [ext + 1.05, ext + 4.15]) {
      b.deco('flat:#1a2036', run - 0.08, gy, pz - 0.08, run + 0.08, roofY, pz + 0.08);
      b.deco(BRASS, run - 0.1, gy, pz - 0.1, run + 0.1, gy + 0.12, pz + 0.1);
      b.deco(BRASS, run + 0.08, gy + 2.4, pz - 0.015, run + 0.26, gy + 2.43, pz + 0.015);
      b.mesh(BRASS, 'cone', run + 0.26, gy + 2.3, pz, 0.22, 0.14, 0.22);
      b.mesh(BULB, 'sphere', run + 0.26, gy + 2.21, pz, 0.12, 0.08, 0.12);
    }
    b.deco(NIGHT, run - 0.04, gy + 1.88, ext + 1.1, run + 0.05, gy + 2.52, ext + 4.1);
    b.deco(BRASS, run - 0.04, gy + 2.52, ext + 1.1, run + 0.05, roofY, ext + 4.1);
  },

  passage(p) {
    const { b, pf } = p, R = rng(p.other.id.charCodeAt(0) * 37 + 3);
    passageDado(p, { mat: DADO, top: 1.1, cap: BRASS });
    passageRails(p);
    for (const w of passageWalls(p)) {
      const [za, zb] = pair(w.z, w.z + w.f * 0.012);
      for (const [a, c] of w.runs) b.deco(BRASS, a, pf + 2.2, za, c, pf + 2.24, zb);
    }
    for (let k = 0; k < 45; k++) {
      const x = -25.7 + R() * 29.4, z = p.zc0 + 0.2 + R() * (p.zc1 - p.zc0 - 0.4);
      randomStar(b, R, x, z, pf + 2.8);
    }
  },
};

