// Station look: Tōmyōbori (灯明堀), the lantern canal at dusk. See Plans/features/station-looks/plan.md.
//
// Dark timber, persimmon and hundreds of warm paper lanterns:
// - concourse: dark boarded walls with a timber wainscot and persimmon rails, a dark ceiling on
//   timber beams, and a "canal of light" down the centreline (a dark glossy inlay between low
//   stone kerbs) wherever it is clear of stairs and gates, crossed by little persimmon bridges
//   (Tōmyō-bashi) as overhead portals, with lantern strings along both banks;
// - shops: a lantern maker, a tea house, a wagashi shop, a standing bar; stone lanterns (tōrō);
// - pillars: dark timber posts with a persimmon band and a bracket lantern;
// - transfer passages: a tunnel of lanterns (the centrepiece);
// - exits: timber dado, lanterns up the stair, and a timber gateway with a tiled roof at street level.

import type { StationDef } from '../../data/types';
import { LINES, linesAt } from '../../data/network';
import { SPECS } from '../specs';
import {
  doorways, exitDado, lightPanel, passageWalls, placeAlong, posterRow, shopFront, SHOPS, toiletX, vendingRow, wallBand, wallDado,
  band, type Brand, type Span, type Wall,
} from './parts';
import type { Builder } from '../../world/builder';
import type { ConcInfo, ExitInfo, StationLook } from './types';

// ── Palette (kept small: each key is a material) ─────────────────────────────────────────────

const PERSIMMON = 'paint:#c4561c';
const TIMBER = 'wood:#3a281c';
const TIMBER_DK = 'wood:#2a1c14';
const WAINSCOT = 'wood:#2c1e15';
const SEAT = 'wood:#7a5634';
const IRON = 'flat:#1b1612';
const STONE = 'flat:#8a8478';
const STONE_DK = 'flat:#6f6a61';
const KERB = 'floor:#8a8174';
const WATER = 'metal:#13263a';
const PAPER = 'flat:#efe6d2';
const ROOF = 'flat:#33373b';
// Lantern glows: the mural's amber, a deeper persimmon red, and a pale one for variety.
const AMBER = 'glow:#ffb05a';
const RED = 'glow:#e8643a';
const PALE = 'glow:#ffe2b0';
const glowOf = (k: number) => (k % 5 === 2 ? RED : k % 7 === 4 ? PALE : AMBER);

/** Invented names for this station (none real). */
const BRANDS = {
  hiyoriya: { ja: '提灯 ひより屋', en: 'Chōchin Hiyoriya', bg: '#efe3c8', fg: '#3a2416', kind: 'goods' },
  tomoshibi: { ja: '茶房 ともしび', en: 'Sabō Tomoshibi', bg: '#2f2a22', fg: '#f3e3c3', kind: 'cafe' },
  kawaberi: { ja: '立呑 かわべり', en: 'Tachinomi Kawaberi', bg: '#7a1f14', fg: '#fff3dc', kind: 'soba' },
} satisfies Record<string, Brand>;
const BRIDGE = { text: '灯明橋', sub: 'Tōmyō-bashi' };
const FESTIVAL = { text: '灯明堀 万灯まつり', sub: 'Tōmyōbori Mantō Matsuri' };

// ── Lanterns ─────────────────────────────────────────────────────────────────────────────────

/**
 * Paper lantern whose body runs from y0 up `h`, hung from `hang` above (a dark cap that doubles
 * as the cord). Round: a sphere. Oblong: a short cylinder, with a dark bottom ring if `ring`.
 */
function chochin(b: Builder, x: number, y0: number, z: number, o: { d: number; h: number; hang: number; round?: boolean; mat?: string; ring?: boolean }) {
  const { d, h } = o, mat = o.mat ?? AMBER;
  if (o.round) b.mesh(mat, 'sphere', x, y0 + h / 2, z, d, h, d);
  else b.mesh(mat, 'cyl', x, y0 + h / 2, z, d, h * 0.9, d);
  const c0 = y0 + h - 0.04;
  if (o.hang > c0) b.mesh(IRON, 'cyl', x, (c0 + o.hang) / 2, z, d * 0.45, o.hang - c0, d * 0.45);
  if (o.ring && !o.round) b.mesh(IRON, 'cyl', x, y0 + 0.03, z, d * 0.72, 0.06, d * 0.72);
}

// ── Concourse layout shared by lights() and concourse() ──────────────────────────────────────

/** Half width of the claimed canal strip; the water is ±WATER_H, the kerbs out to ±KERB_H. */
const STRIP = 1.3, WATER_H = 0.95, KERB_H = 1.15;

/** Stretches of the centreline (z ±STRIP) clear of stairs, landings, gates and the kiosk, 5 m or more. */
function canalRuns(i: ConcInfo): Span[] {
  const st = 0.25, runs: Span[] = [];
  let a: number | null = null;
  let x = i.x0 + 0.5;
  for (; x + st <= i.x1 - 0.5; x += st) {
    const ok = i.free(x, -STRIP, x + st, STRIP);
    if (ok && a === null) a = x;
    if (!ok && a !== null) {
      runs.push([a, x]);
      a = null;
    }
  }
  if (a !== null) runs.push([a, x]);
  return runs.filter(([p, q]) => q - p >= 5);
}

const inPaid = (i: ConcInfo, [p, q]: Span) => p >= i.paid[0] - 0.01 && q <= i.paid[1] + 0.01;
/** Paid runs get a stone lantern at their inner end (nearer the middle of the concourse). */
const innerAtStart = ([p, q]: Span) => Math.abs(p) < Math.abs(q);

/** Water extent and bridge position for each run. */
function canalPlan(i: ConcInfo) {
  return canalRuns(i).map((r) => {
    const toro = inPaid(i, r);
    const wa = toro && innerAtStart(r) ? r[0] + 1.5 : r[0] + 0.3;
    const wb = toro && !innerAtStart(r) ? r[1] - 1.5 : r[1] - 0.3;
    return { r, toro, wa, wb, xb: wb - wa >= 5 ? (wa + wb) / 2 : null };
  });
}

// ── Concourse pieces ─────────────────────────────────────────────────────────────────────────

/** Stone lantern (tōrō): base, shaft, platform, a glowing fire box, stepped roof, finial. Solid. */
function toro(i: ConcInfo, x: number, z: number): boolean {
  const h = 0.42;
  if (!i.free(x - h, z - h, x + h, z + h, 0.3)) return false;
  i.claim(x - h - 0.3, z - h - 0.3, x + h + 0.3, z + h + 0.3);
  const { b, cf } = i;
  b.block(x - h, cf, z - h, x + h, cf + 1.55, z + h);
  b.deco(STONE_DK, x - 0.36, cf, z - 0.36, x + 0.36, cf + 0.2, z + 0.36);
  b.deco(STONE, x - 0.13, cf + 0.2, z - 0.13, x + 0.13, cf + 0.92, z + 0.13);
  b.deco(STONE_DK, x - 0.28, cf + 0.92, z - 0.28, x + 0.28, cf + 1.03, z + 0.28);
  b.deco(AMBER, x - 0.16, cf + 1.03, z - 0.16, x + 0.16, cf + 1.31, z + 0.16);
  for (const [dx, dz] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
    b.deco(STONE, x + dx * 0.135 - 0.04, cf + 1.03, z + dz * 0.135 - 0.04, x + dx * 0.135 + 0.04, cf + 1.31, z + dz * 0.135 + 0.04);
  }
  b.deco(STONE_DK, x - h, cf + 1.31, z - h, x + h, cf + 1.4, z + h);
  b.deco(STONE_DK, x - 0.27, cf + 1.4, z - 0.27, x + 0.27, cf + 1.48, z + 0.27);
  b.mesh(STONE, 'sphere', x, cf + 1.56, z, 0.18, 0.18, 0.18);
  return true;
}

/**
 * Tōmyō-bashi over the canal at xb: four persimmon posts on the banks (solid, slim) carrying a
 * stepped arch above 2.4 m, a timber deck on top, brass finials, the bridge's name on one face
 * and the festival's on the other, and big named lanterns at both bridge ends.
 */
function bridge(i: ConcInfo, xb: number): boolean {
  const { b, cf } = i, px = 0.9, pz = 1.5, ph = 0.12;
  const posts: [number, number][] = [[xb - px, -pz], [xb - px, pz], [xb + px, -pz], [xb + px, pz]];
  if (!posts.every(([x, z]) => i.free(x - ph, z - ph, x + ph, z + ph, 0.3))) return false;
  for (const [x, z] of posts) {
    i.claim(x - ph - 0.3, z - ph - 0.3, x + ph + 0.3, z + ph + 0.3);
    b.box(PERSIMMON, x - ph, cf, z - ph, x + ph, cf + 2.42, z + ph);
    b.deco(IRON, x - ph - 0.015, cf, z - ph - 0.015, x + ph + 0.015, cf + 0.12, z + ph + 0.015);
  }
  for (const dx of [-px, px]) {
    const x = xb + dx;
    b.deco(PERSIMMON, x - 0.1, cf + 2.42, -1.65, x + 0.1, cf + 2.52, 1.65);
    b.deco(PERSIMMON, x - 0.1, cf + 2.52, -1.15, x + 0.1, cf + 2.62, 1.15);
    b.deco(PERSIMMON, x - 0.1, cf + 2.62, -0.85, x + 0.1, cf + 2.72, 0.85);
    for (const z of [-1.45, 1.45]) b.mesh('metal:#c9a227', 'sphere', x, cf + 2.6, z, 0.15, 0.15, 0.15);
  }
  b.deco(TIMBER_DK, xb - px - 0.1, cf + 2.72, -0.95, xb + px + 0.1, cf + 2.77, 0.95);
  const plaque = { fg: '#ffd9a0', bg: '#2a1d15' };
  b.sign({ k: 'label', ...BRIDGE, ...plaque }, xb + px + 0.112, cf + 2.58, 0, [1, 0], 1.6, 0.24);
  b.sign({ k: 'label', ...FESTIVAL, ...plaque }, xb - px - 0.112, cf + 2.58, 0, [-1, 0], 1.6, 0.24);
  // Big lanterns at the bridge ends, the festival's name on them.
  for (const z of [-2.35, 2.35]) {
    chochin(b, xb, cf + 2.33, z, { d: 0.5, h: 0.62, hang: cf + i.clear, mat: AMBER, ring: true });
    for (const f of [-1, 1] as const) {
      b.sign({ k: 'shop', ja: '万灯', bg: '#ffb05a', fg: '#5a1a0a', vertical: true }, xb + f * 0.26, cf + 2.64, z, [f, 0], 0.22, 0.4);
    }
  }
  return true;
}

/** The canal of light: dark glossy water inlay, stone kerbs, glints of lantern light, bridges, tōrō. */
function canal(i: ConcInfo) {
  const { b, cf } = i;
  for (const { r, toro: wantToro, wa, wb, xb } of canalPlan(i)) {
    if (wantToro) toro(i, innerAtStart(r) ? r[0] + 0.8 : r[1] - 0.8, 0);
    if (xb !== null) bridge(i, xb);
    i.claim(wa - 0.1, -STRIP, wb + 0.1, STRIP);
    b.deco(WATER, wa, cf, -WATER_H, wb, cf + 0.006, WATER_H);
    for (const s of [-1, 1]) b.deco(KERB, wa - 0.2, cf, s * WATER_H, wb + 0.2, cf + 0.04, s * KERB_H);
    for (const x of [wa - 0.2, wb]) b.deco(KERB, x, cf, -WATER_H, x + 0.2, cf + 0.04, WATER_H);
    // Reflections of the lantern strings on the water.
    let k = 0;
    for (let x = wa + 0.7; x + 0.6 < wb; x += 1.3, k++) {
      const z = (k % 3 - 1) * 0.4;
      b.deco(k % 4 === 1 ? RED : AMBER, x, cf + 0.006, z - 0.02, x + 0.45 + (k % 2) * 0.2, cf + 0.012, z + 0.02);
    }
  }
}

/** Wooden bench, 1.8 long along x, solid. */
function woodBench(i: ConcInfo, x: number, z: number): boolean {
  const hx = 0.9, hz = 0.24;
  if (!i.free(x - hx, z - hz, x + hx, z + hz, 0.9)) return false;
  i.claim(x - hx - 0.5, z - hz - 0.5, x + hx + 0.5, z + hz + 0.5);
  const { b, cf } = i;
  b.block(x - hx, cf, z - hz, x + hx, cf + 0.45, z + hz);
  b.deco(SEAT, x - hx, cf + 0.4, z - hz, x + hx, cf + 0.46, z + hz);
  for (const k of [-1, 1]) b.deco(TIMBER_DK, x + k * (hx - 0.15) - 0.05, cf, z - hz + 0.03, x + k * (hx - 0.15) + 0.05, cf + 0.4, z + hz - 0.03);
  return true;
}

/** Shops on the long walls of the paid area. */
function shops(i: ConcInfo) {
  const { b, cf } = i;
  const at = (s: Wall, d: number) => s * (i.cw - d);
  const items: { w: number; at: (s: Wall, x0: number) => boolean }[] = [
    {
      // Lantern maker: unpainted paper lanterns on the counter, finished ones lit inside.
      w: 3.6,
      at: (s, x0) => {
        const x1 = x0 + 3.6;
        if (!shopFront(i, { s, x0, x1, brand: BRANDS.hiyoriya, depth: 1.0, front: 'counter', body: 'wood:#5a3d28', goods: ['#efe6d2', '#e3d5b8', '#f4ecdc'] })) return false;
        for (let k = 0; k < 4; k++) {
          const x = x0 + 0.6 + k * 0.8;
          if (k % 2) b.mesh(PAPER, 'cyl', x, cf + 1.17, at(s, 0.75), 0.26, 0.34, 0.26);
          else b.mesh(PAPER, 'sphere', x, cf + 1.14, at(s, 0.75), 0.28, 0.28, 0.28);
        }
        for (let k = 0; k < 3; k++) chochin(b, x0 + 0.75 + k * 1.05, cf + 1.98, at(s, 0.25), { d: 0.26, h: 0.32, hang: cf + 2.35, round: k === 1, mat: glowOf(k + 1) });
        return true;
      },
    },
    {
      w: 3.6,
      at: (s, x0) => shopFront(i, {
        s, x0, x1: x0 + 3.6, brand: BRANDS.tomoshibi, depth: 1.4, front: 'counter', body: 'wood:#4a3324',
        goods: ['#3f5a32', '#e8e2d0', '#8a5a2b'], noren: { color: '#2f3b2b', text: 'お茶', fg: '#f3e3c3' },
      }),
    },
    {
      // Riverside standing bar: a dark noren and a pair of red lanterns at the fascia corners.
      w: 3.6,
      at: (s, x0) => {
        const x1 = x0 + 3.6;
        if (!shopFront(i, {
          s, x0, x1, brand: BRANDS.kawaberi, depth: 1.4, front: 'counter', body: TIMBER,
          goods: ['#2f5a3a', '#8a5a2b', '#e8e2d0'], noren: { color: '#1f1a17', text: '立呑', fg: '#ffd9a0' },
        })) return false;
        for (const x of [x0 + 0.14, x1 - 0.14]) {
          const [za, zb] = band(i, s, 1.38, 1.62);
          b.deco(IRON, x - 0.015, cf + 2.66, za, x + 0.015, cf + 2.7, zb);
          chochin(b, x, cf + 2.22, at(s, 1.6), { d: 0.3, h: 0.42, hang: cf + 2.7, mat: RED, ring: true });
        }
        return true;
      },
    },
    {
      w: 2.4,
      at: (s, x0) => shopFront(i, {
        s, x0, x1: x0 + 2.4, brand: SHOPS.tsumugian, depth: 1.0, front: 'counter', body: 'wood:#5a3d28',
        noren: { color: '#6a1b3a', text: '和菓子', fg: '#fbe9d0' },
      }),
    },
    { w: 3.5, at: (s, x0) => vendingRow(i, s, x0, 2) },
  ];
  for (const it of items) placeAlong(i, it.w, it.at);
}

/** Benches midway between pillars in the pillar lines, paid area only. */
function benches(i: ConcInfo) {
  let n = 4;
  for (const [x, z] of i.pillars) {
    if (n <= 0) break;
    if (!i.pillars.some(([x2, z2]) => z2 === z && Math.abs(x2 - x - 8) < 0.01)) continue;
    if (x + 4 < i.paid[0] + 4 || x + 4 > i.paid[1] - 4) continue;
    if (woodBench(i, x + 4, z)) n--;
  }
}

// ── Passages ─────────────────────────────────────────────────────────────────────────────────

/** True if the station's primary line has side platforms (doorways into the transfer passages). */
function sideDoors(st: StationDef): boolean {
  const spec = SPECS[st.id];
  const id = spec && 'primary' in spec ? spec.primary : linesAt(st.id)[0]?.id;
  return LINES.find((l) => l.id === id)?.platformType !== 'island';
}

const stairY = (e: ExitInfo, x: number) => e.cf + ((e.gy - e.cf) * Math.max(0, Math.min(e.run, x))) / e.run;

// ── The look ─────────────────────────────────────────────────────────────────────────────────

export const look: StationLook = {
  finishes: { wall: 'wood:#4a3226', floor: 'floor:#b9ad9a', pillar: TIMBER, ceil: 'paint:#2a201b' },
  posters: false,
  skirting: false,

  lights(i) {
    const { b } = i, top = i.cf + i.clear;
    const nearGate = (x: number, m: number) => i.ends.some((e) => Math.abs(x - e.g) < m);
    // Neutral panels either side of each gate line, and at both ends of every stair opening.
    for (const e of i.ends) {
      for (const dx of [-2.8, 2.8]) for (const z of [-8, -4, 0, 4]) if (Math.abs(z) < i.cw - 2) lightPanel(i, e.g + dx, z, top, 1.8, 0.5);
    }
    for (const h of i.holes) {
      for (const x of [h[0] - 1.4, h[2] + 1.4]) if (x > i.x0 + 1 && x < i.x1 - 1 && !nearGate(x, 3.8)) lightPanel(i, x, (h[1] + h[3]) / 2, top, 1.2, 0.6);
    }

    // Lantern strings along both banks of the canal (and over the stair openings beside it).
    const bridges = canalPlan(i).flatMap((c) => (c.xb === null ? [] : [c.xb]));
    const rodY = top - 0.29;
    let k = 0;
    for (const z of [-1.8, 1.8]) {
      const xs: number[] = [];
      for (let x = i.x0 + 1.2; x < i.x1 - 1.2; x += 2.1) {
        if (nearGate(x, 4) || bridges.some((xb) => Math.abs(x - xb) < 1.4)) continue;
        const over = i.holes.some((h) => x > h[0] && x < h[2] && z > h[1] - 0.5 && z < h[3] + 0.5);
        if (over || i.free(x - 0.05, z - 0.05, x + 0.05, z + 0.05)) xs.push(x);
      }
      // One rod per unbroken run of lanterns, with hangers up into the ceiling at its ends.
      let s0 = 0;
      for (let n = 1; n <= xs.length; n++) {
        if (n < xs.length && xs[n] - xs[n - 1] < 2.2) continue;
        const a = xs[s0] - 0.5, c = xs[n - 1] + 0.5;
        b.deco(IRON, a, rodY, z - 0.008, c, rodY + 0.015, z + 0.008);
        for (const x of [a, c]) b.deco(IRON, x - 0.008, rodY, z - 0.008, x + 0.008, top, z + 0.008);
        s0 = n;
      }
      for (const x of xs) {
        const round = k % 2 === 0;
        chochin(b, x, round ? rodY - 0.36 : rodY - 0.38, z, { d: round ? 0.3 : 0.26, h: round ? 0.3 : 0.32, hang: rodY, round, mat: glowOf(k) });
        k++;
      }
    }

    // A row of bigger lanterns down each side of the hall, clear of gates, doors, stairs and the toilet sign.
    const doors = doorways(i), tx = toiletX(i);
    for (const s of [-1, 1] as const) {
      const z = s * (i.cw - 2.6);
      for (let x = i.x0 + 1.8; x < i.x1 - 1.2; x += 4.4) {
        if (nearGate(x, 4.2)) continue;
        if (doors.some(([p, q]) => x > p - 1.5 && x < q + 1.5)) continue;
        if (i.holes.some((h) => x > h[0] - 1.5 && x < h[2] + 1.5 && z > h[1] - 1.5 && z < h[3] + 1.5)) continue;
        if (s < 0 && Math.abs(x - tx) < 1.8) continue;
        chochin(b, x, top - 0.62, z, { d: 0.34, h: 0.42, hang: top, mat: glowOf(k++), ring: true });
      }
    }
  },

  pillar(i, x, z, y0, y1) {
    const { b } = i, h = 0.4;
    b.deco(i.pillar, x - h, y0, z - h, x + h, y1, z + h);
    b.deco(IRON, x - h - 0.012, y0, z - h - 0.012, x + h + 0.012, y0 + 0.15, z + h + 0.012);
    b.deco(PERSIMMON, x - h - 0.01, y0 + 2.02, z - h - 0.01, x + h + 0.01, y0 + 2.2, z + h + 0.01);
    b.deco(TIMBER_DK, x - h - 0.02, y1 - 0.12, z - h - 0.02, x + h + 0.02, y1, z + h + 0.02);
    // A bracket lantern on the face toward the middle of the hall.
    const f = z > 0 ? -1 : 1, zf = z + f * h;
    b.deco(TIMBER_DK, x - 0.03, y0 + 2.6, Math.min(zf, zf + f * 0.34), x + 0.03, y0 + 2.66, Math.max(zf, zf + f * 0.34));
    chochin(b, x, y0 + 2.32, zf + f * 0.27, { d: 0.22, h: 0.26, hang: y0 + 2.6, round: true, mat: AMBER });
  },

  concourse(i) {
    const { b } = i, top = i.cf + i.clear;
    // Walls: dark timber wainscot with a persimmon cap, a persimmon frieze, a timber lintel band.
    for (const s of [-1, 1] as const) {
      wallDado(i, s, { mat: WAINSCOT, top: 1.1, cap: PERSIMMON, skirting: IRON, frieze: PERSIMMON, friezeY: [2.42, 2.5] });
      wallBand(i, s, 2.5, i.clear, TIMBER_DK, { inset: 0.02 });
    }
    // Dark timber beams across the ceiling, clear of the gate signs, the toilets and the light panels.
    const panelXs = i.holes.flatMap((h) => [h[0] - 1.4, h[2] + 1.4]);
    const tx = toiletX(i);
    for (let x = i.x0 + 3; x < i.x1 - 1; x += 6) {
      if (i.ends.some((e) => Math.abs(x - e.g) < 4.5) || Math.abs(x - tx) < 1.5 || panelXs.some((p) => Math.abs(x - p) < 1.3)) continue;
      b.deco(TIMBER_DK, x - 0.14, top - 0.2, -i.cw, x + 0.14, top, i.cw);
    }

    // The centrepiece runs first so shops and benches keep off it.
    canal(i);
    shops(i);
    for (const s of [-1, 1] as const) posterRow(i, s, i.paid[0] + 3.6, i.paid[1] - 3.6, { pitch: 4.5, v0: s > 0 ? 1 : 5 });
    benches(i);
  },

  exit(e) {
    const { b, cf, ext, run, gy } = e, L = ext + 4;
    exitDado(e, { mat: WAINSCOT, top: 1.1, cap: PERSIMMON });
    // Persimmon handrail stepped up the near stair wall.
    const n = Math.max(6, Math.round(run / 0.9)), zr = ext + 1.2;
    for (let k = 0; k < n; k++) {
      const xa = (run * k) / n, xb = (run * (k + 1)) / n, y = stairY(e, (xa + xb) / 2) + 0.85;
      b.deco(PERSIMMON, xa, y, zr + 0.05, xb, y + 0.05, zr + 0.1);
    }
    // A row of bracket lanterns up the far stair wall (z = L, facing −z), under its coping.
    const m = Math.max(4, Math.round(run / 1.8));
    for (let k = 0; k < m; k++) {
      const x = (run * (k + 0.5)) / m, y0 = stairY(e, x) + 2.35;
      if (y0 + 0.4 > gy + 0.9) continue;
      b.deco(TIMBER_DK, x - 0.025, y0 + 0.32, L - 0.34, x + 0.025, y0 + 0.37, L);
      chochin(b, x, y0, L - 0.26, { d: 0.24, h: 0.28, hang: y0 + 0.32, round: k % 2 === 0, mat: glowOf(k) });
    }
    // Two lanterns hung in the lobby, either side of the poster.
    for (const x of [-3.4, -1.0]) chochin(b, x, cf + 2.33, L - 0.5, { d: 0.3, h: 0.3, hang: cf + 2.7, round: true, mat: AMBER });
  },

  canopy(e) {
    const { b, gy, ext, run } = e;
    const zA = ext + 0.8, zB = ext + 4.4, xg = run + 0.15;
    // Timber posts along both sides of the stair, the gateway pair at the street end.
    const xs = run > 6 ? [0.15, run / 2, xg] : [0.15, xg];
    for (const x of xs) for (const z of [zA, zB]) b.deco(TIMBER, x - 0.12, gy, z - 0.12, x + 0.12, gy + 2.95, z + 0.12);
    for (const z of [zA, zB]) b.deco(TIMBER_DK, -0.1, gy + 2.83, z - 0.13, run + 0.4, gy + 2.95, z + 0.13);
    // Gateway: a persimmon tie beam over the entrance sign, a timber lintel above.
    b.deco(PERSIMMON, xg - 0.08, gy + 2.6, zA, xg + 0.08, gy + 2.7, zB);
    b.deco(TIMBER_DK, run, gy + 2.95, ext + 0.3, run + 0.3, gy + 3.07, ext + 4.9);
    // Stepped tiled roof, ridge along the stair.
    b.deco(ROOF, -0.6, gy + 3.07, ext + 0.2, run + 0.7, gy + 3.15, ext + 5.0);
    b.deco(ROOF, -0.5, gy + 3.15, ext + 0.65, run + 0.6, gy + 3.25, ext + 4.55);
    b.deco(ROOF, -0.4, gy + 3.25, ext + 1.15, run + 0.5, gy + 3.35, ext + 4.05);
    b.deco(ROOF, -0.3, gy + 3.35, ext + 2.35, run + 0.4, gy + 3.47, ext + 2.85);
    // Two large lanterns hung in front of the gateway posts, the quarter's name on them.
    for (const z of [zA, zB]) {
      b.deco(TIMBER_DK, xg + 0.1, gy + 2.95, z - 0.03, xg + 0.45, gy + 3.0, z + 0.03);
      chochin(b, xg + 0.4, gy + 2.3, z, { d: 0.5, h: 0.6, hang: gy + 2.95, mat: AMBER, ring: true });
      b.sign({ k: 'shop', ja: '灯明', bg: '#ffb05a', fg: '#5a1a0a', vertical: true }, xg + 0.66, gy + 2.6, z, [1, 0], 0.22, 0.4);
    }
  },

  passage(p) {
    const { b, pf, zc0, zc1 } = p, top = pf + 2.8, zm = (zc0 + zc1) / 2;
    const doors = sideDoors(p.station);
    const kit = passageWalls(p);
    // Wall runs: the zc0 wall is whole unless side-platform doorways open in it.
    const walls = [{ ...kit[0], runs: doors ? kit[0].runs : ([[-26, 4]] as Span[]) }, kit[1]];
    const doorGaps: Span[] = doors ? [[-24.3, -19.7], [-3.3, 1.3]] : [];
    const zOff = (w: { z: number; f: Wall }, t0: number, t1: number): Span => [w.z + w.f * t0, w.z + w.f * t1].sort((a, c) => a - c) as Span;

    // Timber wainscot with a persimmon cap, and a persimmon handrail.
    for (const w of walls) {
      for (const [a, c] of w.runs) {
        b.deco(IRON, a, pf, zOff(w, 0, 0.018)[0], c, pf + 0.13, zOff(w, 0, 0.018)[1]);
        b.deco(WAINSCOT, a, pf + 0.13, zOff(w, 0, 0.008)[0], c, pf + 1.1, zOff(w, 0, 0.008)[1]);
        b.deco(PERSIMMON, a, pf + 1.1, zOff(w, 0, 0.014)[0], c, pf + 1.15, zOff(w, 0, 0.014)[1]);
        if (c - a > 1) {
          const ra = a + 0.15, rc = Math.min(c, 3.7) - 0.15;
          b.deco(PERSIMMON, ra, pf + 0.85, zOff(w, 0.05, 0.1)[0], rc, pf + 0.9, zOff(w, 0.05, 0.1)[1]);
          for (let x = ra + 0.3; x < rc; x += 2.4) b.deco(IRON, x - 0.02, pf + 0.81, zOff(w, 0, 0.08)[0], x + 0.02, pf + 0.85, zOff(w, 0, 0.08)[1]);
        }
      }
    }
    b.deco(IRON, -26, pf, zc0, -25.982, pf + 0.13, zc1);
    b.deco(WAINSCOT, -26, pf + 0.13, zc0, -25.992, pf + 1.1, zc1);
    b.deco(PERSIMMON, -26, pf + 1.1, zc0, -25.986, pf + 1.15, zc1);

    // Timber surround for the mural (x −23 … −4, pf + 0.4 … 2.3 on the zc1 wall), with a little hood.
    b.deco(IRON, -23.1, pf, zc1 - 0.018, -3.9, pf + 0.28, zc1);
    b.deco(TIMBER_DK, -23.16, pf + 0.28, zc1 - 0.05, -3.84, pf + 0.4, zc1);
    b.deco(TIMBER_DK, -23.16, pf + 2.3, zc1 - 0.12, -3.84, pf + 2.42, zc1);
    for (const x of [-23.16, -4]) b.deco(TIMBER_DK, x, pf + 0.4, zc1 - 0.05, x + 0.16, pf + 2.3, zc1);
    b.deco(PERSIMMON, -23.2, pf + 2.42, zc1 - 0.14, -3.8, pf + 2.46, zc1);

    // Dark timber ceiling either side of the kit's light strip, and a stone runner on the floor.
    b.deco(TIMBER_DK, -26, top - 0.012, zc0, 3.7, top - 0.005, zc0 + 1.8);
    b.deco(TIMBER_DK, -26, top - 0.012, zc0 + 2.5, 3.7, top - 0.005, zc1);
    b.deco('floor:#7a6a58', -25.6, pf, zm - 0.6, 3.6, pf + 0.006, zm + 0.6);

    let k = 0;
    // Lanterns strung across the passage in the gaps between the ceiling lights.
    const across = [-25.0, -20.2, -15.2, -10.2, -5.2];
    for (const x of across) {
      const rod = top - 0.07;
      b.deco(IRON, x - 0.01, rod, zc0 + 0.3, x + 0.01, rod + 0.015, zc1 - 0.3);
      for (const z of [zc0 + 0.3, zc1 - 0.3]) b.deco(IRON, x - 0.008, rod, z - 0.008, x + 0.008, top - 0.012, z + 0.008);
      for (const z of [zc0 + 1.25, zm, zc1 - 1.25]) {
        if (z < zm && doorGaps.some(([a, c]) => x > a - 0.4 && x < c + 0.4)) continue;
        chochin(b, x, rod - 0.4, z, { d: 0.32, h: 0.36, hang: rod, mat: glowOf(k++) });
      }
    }
    // Rows of lanterns down both sides, hung from the ceiling, round and oblong in turn.
    for (const [z, skip] of [[zc0 + 0.5, doorGaps], [zc1 - 0.5, [[-2.6, 2.6]]]] as [number, Span[]][]) {
      for (let x = -25.3; x <= 2.2; x += 1.7) {
        if (skip.some(([a, c]) => x > a - 0.3 && x < c + 0.3) || across.some((xa) => Math.abs(x - xa) < 0.35)) continue;
        const round = k % 2 === 0;
        chochin(b, x, round ? top - 0.4 : top - 0.46, z, { d: round ? 0.34 : 0.28, h: round ? 0.34 : 0.4, hang: top - 0.012, round, mat: glowOf(k++) });
      }
    }
    // Small box lanterns on the walls at a constant height, wherever the mural and openings are not.
    for (const w of walls) {
      for (const [a, c0] of w.runs) {
        const c = Math.min(c0, 2.2);
        if (c - a < 0.8) continue;
        const n = Math.max(1, Math.floor((c - a) / 2.5));
        for (let j = 0; j < n; j++) {
          const x = a + ((c - a) * (j + 0.5)) / n;
          const [za, zb] = zOff(w, 0.06, 0.2), [ca, cb] = zOff(w, 0, 0.22);
          b.deco(PALE, x - 0.09, pf + 2.0, za, x + 0.09, pf + 2.24, zb);
          b.deco(TIMBER_DK, x - 0.11, pf + 2.24, ca, x + 0.11, pf + 2.29, cb);
        }
      }
    }
  },
};
