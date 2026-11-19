// Station look: Hyōtanbori (瓢箪堀), Yanagisuji Line, 1933. See Plans/features/station-looks/plan.md.
//
// A yokochō carried underground. The paid concourse reads as a narrow drinking alley at night:
// near-black glazed tile, a dark ceiling, a warm dark floor and gold trim; along both walls a
// continuous run of tiny bars and eateries (counters with noren, or lit lattice doors), each with
// a lit fascia sign, a projecting vertical sign and a red lantern; strings of chōchin across the
// alley, rows of gold gourd charms on wires along the stairwell walls, bare bulbs, and old pipes
// everywhere. The stair openings are walled stairwells now: their long outer walls are part of the
// alley (black tile, gold line, framed bills, neon, and the doors of the bars that did not fit
// along the real walls), lit by battens down the lane beside them. The gate lines and the
// stairwell portals keep white light so wayfinding still works.

import type { Builder } from '../../world/builder';
import {
  band, batten, cut, endDado, exitDado, exitHandrails, exitPipes, faceDado, fbox, fnormal, fpt, lantern, lockers, noren,
  passageDado, passagePipes, passageRails, passageWalls, pipeRun, stairwellFaces, wallDado, wbox,
  type DadoOpts, type Span, type Wall,
} from './parts';
import type { ConcInfo, StationLook, WallFace } from './types';

type Has = { b: Builder };

const GOLD = 'metal:#c9a227';
const STEEL = 'paint:#141416';
const INK = 'flat:#121214';
const TIMBER = 'wood:#3b2a1e';
const TIMBER_LIGHT = 'wood:#6b4a2e';
const DADO = 'tile:#101013';
const PIPES = ['paint:#3a3d41', 'paint:#5b4636', 'paint:#7a2a1e'];
const PAPER = 'glow:#f2c88a';
const WARM_BACK = 'glow:#6e3416';
const BOTTLES = ['flat:#2f5a35', 'flat:#7a3b1a', 'flat:#d9c27a'];

const NEON = { red: '#ff3d57', pink: '#ff5fa2', amber: '#ffb300', cyan: '#35e0ff' };
/** Walls: a black dado with a gold cap, a gold line at cf + 2.3, a black skirting. */
const P: DadoOpts = { mat: DADO, top: 1.0, cap: GOLD, skirting: 'flat:#0a0a0c', frieze: GOLD, friezeY: [2.3, 2.33] };
const NOREN = { navy: '#1f2a44', maroon: '#7a1f1f', umber: '#2b1a12', white: '#f4efe2' };

interface Bar {
  ja: string;
  en: string;
  bg: string;
  fg: string;
  /** Genre word for the projecting sign and the noren. */
  word: string;
  neon: string;
  /** 'counter': open counter, stools outside. 'door': closed front with a lit lattice door. */
  front: 'counter' | 'door';
  noren: string;
}

// Invented bars and eateries (never real). The last two are shared with the street (../surface.ts).
const BARS: Bar[] = [
  { ja: '焼鳥 ひさご', en: 'Yakitori Hisago', bg: '#1a1410', fg: '#ffcf4a', word: '焼鳥', neon: NEON.red, front: 'counter', noren: NOREN.navy },
  { ja: 'スナック 月見草', en: 'Snack Tsukimisō', bg: '#3a0f2e', fg: '#ff9bd2', word: 'スナック', neon: NEON.pink, front: 'door', noren: NOREN.maroon },
  { ja: '串カツ 金瓢', en: 'Kushikatsu Kinpyō', bg: '#c9a227', fg: '#1a1a1a', word: '串カツ', neon: NEON.amber, front: 'counter', noren: NOREN.umber },
  { ja: 'おでん 小雪', en: 'Oden Koyuki', bg: '#f4efe2', fg: '#7a2a12', word: 'おでん', neon: NEON.amber, front: 'counter', noren: NOREN.white },
  { ja: '立呑み 堀端', en: 'Tachinomi Horibata', bg: '#14233b', fg: '#f4efe2', word: '立呑み', neon: NEON.cyan, front: 'counter', noren: NOREN.navy },
  { ja: 'バー 灯籠', en: 'Bar Tōrō', bg: '#0f0f12', fg: '#35e0ff', word: 'バー', neon: NEON.cyan, front: 'door', noren: NOREN.umber },
  { ja: 'もつ焼 ろく', en: 'Motsuyaki Roku', bg: '#b3261e', fg: '#ffffff', word: 'もつ焼', neon: NEON.red, front: 'counter', noren: NOREN.maroon },
  { ja: 'ラーメン 夜鳴軒', en: 'Ramen Yonaki-ken', bg: '#c62828', fg: '#fff8e1', word: 'ラーメン', neon: NEON.red, front: 'counter', noren: NOREN.maroon },
  { ja: 'スナック ゆらり', en: 'Snack Yurari', bg: '#5b1a4a', fg: '#ffd1f0', word: 'スナック', neon: NEON.pink, front: 'door', noren: NOREN.maroon },
  { ja: '酒場 瓢六', en: 'Sakaba Hyōroku', bg: '#2b1a12', fg: '#ffcf4a', word: '酒場', neon: NEON.amber, front: 'door', noren: NOREN.umber },
  { ja: 'バー 澪標', en: 'Bar Miotsukushi', bg: '#102a2e', fg: '#9fe8ff', word: '洋酒', neon: NEON.cyan, front: 'door', noren: NOREN.navy },
  { ja: 'てんぷら 小舟', en: 'Tempura Kobune', bg: '#f6efe0', fg: '#1f2a44', word: '天ぷら', neon: NEON.amber, front: 'counter', noren: NOREN.white },
  { ja: 'ホルモン 堀の家', en: 'Horumon Hori-no-ya', bg: '#3b1f14', fg: '#ffb37a', word: 'ホルモン', neon: NEON.red, front: 'counter', noren: NOREN.maroon },
  { ja: '小料理 ふじ乃', en: 'Koryōri Fujino', bg: '#f4efe2', fg: '#4a2a5a', word: '小料理', neon: NEON.pink, front: 'door', noren: NOREN.white },
  { ja: '居酒屋 ひょうたん', en: 'Izakaya Hyotan', bg: '#2b1a12', fg: '#ffcf4a', word: '居酒屋', neon: NEON.red, front: 'door', noren: NOREN.umber },
  { ja: 'たこ焼き 丸八', en: 'Takoyaki Maruhachi', bg: '#ef6c00', fg: '#ffffff', word: 'たこ焼', neon: NEON.amber, front: 'counter', noren: NOREN.navy },
];

/** How far a bar front stands out from the wall, and the room kept in front of it. */
const DEPTH = 0.75, CLEAR = 0.9;
/** Underside of the bar fascias above the floor. */
const FY = 2.38;

function shuffle<T>(i: ConcInfo, a: T[]): T[] {
  const out = [...a];
  for (let k = out.length - 1; k > 0; k--) {
    const j = Math.floor(i.rand() * (k + 1));
    [out[k], out[j]] = [out[j], out[k]];
  }
  return out;
}

/** Fascia sign widths from a few sizes, so sign textures are shared, and clear of the lantern. */
const signW = (len: number) => Math.max(1, Math.min(1.5, Math.floor((len - 1.4) * 2) / 2));

/**
 * x of the lantern strings across the alley: midway between pillar pairs in the paid area (so
 * they never meet a pillar), or every 6 m if there are no pillars.
 */
function stringXs(i: ConcInfo): number[] {
  const lo = i.paid[0] + 3.5, hi = i.paid[1] - 3.5;
  const px = [...new Set(i.pillars.map(([x]) => x))].sort((a, c) => a - c);
  const out: number[] = [];
  for (let k = 0; k + 1 < px.length; k++) {
    const m = (px[k] + px[k + 1]) / 2;
    if (m > lo && m < hi) out.push(m);
  }
  if (!out.length) for (let x = lo + 2; x < hi; x += 6) out.push(x);
  return out;
}

// ── Small hanging things ─────────────────────────────────────────────────────────────────────

/** A small chōchin on a string, bottom at cf + 2.32, cap up to the wire at cf + 2.70. */
function chochin(t: Has, x: number, z: number, cf: number, color = '#e5533d') {
  t.b.mesh(`glow:${color}`, 'cyl', x, cf + 2.47, z, 0.26, 0.3, 0.26);
  t.b.mesh('flat:#1b1b1b', 'cyl', x, cf + 2.66, z, 0.15, 0.08, 0.15);
}

/** A bare bulb under a small black shade on a cord from the ceiling; bottom at cf + 2.37. */
function bulb(t: Has, x: number, z: number, cf: number, top: number) {
  t.b.deco('flat:#1b1b1b', x - 0.006, cf + 2.54, z - 0.006, x + 0.006, top, z + 0.006);
  t.b.mesh('flat:#1b1b1b', 'cyl', x, cf + 2.52, z, 0.24, 0.04, 0.24);
  t.b.mesh('glow:#ffd08a', 'sphere', x, cf + 2.44, z, 0.12, 0.14, 0.12);
}

/**
 * A gold gourd (hyōtan): two stacked flattened spheres and a stem, bottom of the lower bulb at
 * y − 0.17. `n` is the axis it is flattened along ('x' or 'z'), for gourds on a face.
 */
function gourd(t: Has, x: number, y: number, z: number, n: 'x' | 'z' | null, scale = 1) {
  const f = (w: number, th: number): [number, number] => (n === 'x' ? [th, w] : n === 'z' ? [w, th] : [w, w]);
  const [ax, az] = f(0.3 * scale, 0.09 * scale), [bx, bz] = f(0.2 * scale, 0.07 * scale);
  t.b.mesh(GOLD, 'sphere', x, y, z, ax, 0.34 * scale, az);
  t.b.mesh(GOLD, 'sphere', x, y + 0.26 * scale, z, bx, 0.24 * scale, bz);
  t.b.mesh(GOLD, 'cyl', x, y + 0.42 * scale, z, 0.04 * scale, 0.08 * scale, 0.04 * scale);
}

// ── The alley: bar fronts ────────────────────────────────────────────────────────────────────

/**
 * One tiny bar or eatery against long wall `s`, x0 … x1, DEPTH out from the wall: a black fascia
 * (cf + 2.38 up to the ceiling) with a gold edge, a neon tube and the lit name sign; timber
 * pilasters; a counter with noren and stools, or a closed front with a lit lattice door; a
 * projecting vertical sign and a red lantern. Checks and claims the front plus CLEAR in front.
 * `avoid`: x of the lantern strings, which projecting signs and lanterns must miss.
 */
function barFront(i: ConcInfo, s: Wall, x0: number, x1: number, bar: Bar, avoid: number[]): boolean {
  const { b, cf } = i;
  const d = DEPTH, [za, zb] = band(i, s, 0, d + CLEAR);
  if (x1 - x0 < 2 || !i.free(x0, za, x1, zb)) return false;
  i.claim(x0, za, x1, zb);
  const top = cf + i.clear, fy = cf + FY;
  const xa = x0 + 0.1, xb = x1 - 0.1;
  const near = (x: number, m: number) => avoid.some((a) => Math.abs(a - x) < m);
  const at = (dd: number) => s * (i.cw - dd);
  const face: Wall = -s as Wall;
  const norenFg = bar.noren === NOREN.white ? bar.fg : '#ffffff';

  // Fascia: black board, gold lower edge, a neon tube along the top, the name sign.
  wbox(i, s, INK, x0, x1, fy, top, 0, d + 0.05);
  wbox(i, s, GOLD, x0, x1, fy, fy + 0.04, d + 0.05, d + 0.062);
  wbox(i, s, `glow:${bar.neon}`, x0 + 0.1, x1 - 0.1, top - 0.1, top - 0.075, d + 0.05, d + 0.07);
  b.sign({ k: 'shop', ja: bar.ja, en: bar.en, bg: bar.bg, fg: bar.fg }, (x0 + x1) / 2, fy + 0.28, at(d + 0.066), [0, face], signW(x1 - x0), 0.34);
  // Timber pilasters at both ends.
  wbox(i, s, TIMBER, x0, xa, cf, fy, 0, d, true);
  wbox(i, s, TIMBER, xb, x1, cf, fy, 0, d, true);

  if (bar.front === 'counter') {
    // Staff space, a warm-lit back wall with a bottle shelf, the counter, a noren over it.
    wbox(i, s, 'none', xa, xb, cf, fy, 0, d - 0.45, true);
    wbox(i, s, WARM_BACK, xa, xb, cf + 1.0, fy, 0, 0.02);
    wbox(i, s, 'glow:#ffcf8a', xa + 0.1, xb - 0.1, fy - 0.05, fy - 0.02, 0.04, 0.3);
    wbox(i, s, TIMBER, xa + 0.1, xb - 0.1, cf + 1.52, cf + 1.55, 0.02, 0.24);
    const n = Math.min(4, Math.floor((xb - xa - 0.2) / 0.32));
    for (let k = 0; k < n; k++) {
      const x = xa + 0.1 + ((k + 0.5) * (xb - xa - 0.2)) / n;
      b.mesh(BOTTLES[(k + Math.abs(Math.round(x0))) % 3], 'cyl', x, cf + 1.68, at(0.13), 0.08, 0.26, 0.08);
    }
    wbox(i, s, 'wood:#5a3a22', xa, xb, cf, cf + 0.98, d - 0.45, d, true);
    wbox(i, s, 'wood:#a8794a', xa, xb, cf + 0.98, cf + 1.03, d - 0.5, d + 0.1);
    noren(i, 'x', at(d - 0.08), xa, xb, fy, { color: bar.noren, text: bar.word, fg: norenFg, face, h: 0.5 });
    // Stools at the counter (decoration: people may brush past them).
    const m = 2;
    for (let k = 0; k < m; k++) {
      const x = x0 + ((k + 0.5) * (x1 - x0)) / m;
      b.mesh('flat:#9e1b1b', 'cyl', x, cf + 0.68, at(d + 0.3), 0.34, 0.06, 0.34);
      b.mesh('metal:#7f858b', 'cyl', x, cf + 0.33, at(d + 0.3), 0.06, 0.66, 0.06);
    }
  } else {
    // Closed front, recessed 0.12 behind the pilasters: a lit sliding door and a lit window,
    // both behind timber lattice (kōshi), a short noren on the door, beer crates outside.
    wbox(i, s, 'none', xa, xb, cf, fy, 0, d - 0.12, true);
    wbox(i, s, TIMBER, xa, xb, cf, fy, d - 0.16, d - 0.12);
    const xd0 = xa + 0.15, xd1 = xd0 + 0.85;
    wbox(i, s, PAPER, xd0, xd1, cf + 0.08, cf + 1.95, d - 0.12, d - 0.105);
    wbox(i, s, TIMBER, xd0 - 0.04, xd1 + 0.04, cf + 1.95, cf + 2.03, d - 0.12, d - 0.08);
    wbox(i, s, TIMBER, xd0, xd1, cf + 0.99, cf + 1.03, d - 0.105, d - 0.085);
    for (let k = 1; k < 4; k++) {
      const x = xd0 + (k * (xd1 - xd0)) / 4;
      wbox(i, s, TIMBER, x - 0.015, x + 0.015, cf + 0.08, cf + 1.95, d - 0.105, d - 0.085);
    }
    const xw0 = xd1 + 0.15, xw1 = xb - 0.15;
    if (xw1 - xw0 > 0.4) {
      wbox(i, s, PAPER, xw0, xw1, cf + 0.95, cf + 1.85, d - 0.12, d - 0.105);
      wbox(i, s, TIMBER, xw0 - 0.03, xw1 + 0.03, cf + 0.9, cf + 0.95, d - 0.12, d - 0.07);
      const n = Math.max(1, Math.round((xw1 - xw0) / 0.18) - 1);
      for (let k = 1; k <= n; k++) {
        const x = xw0 + (k * (xw1 - xw0)) / (n + 1);
        wbox(i, s, TIMBER, x - 0.012, x + 0.012, cf + 0.95, cf + 1.85, d - 0.105, d - 0.085);
      }
    }
    noren(i, 'x', at(d - 0.055), xd0 + 0.05, xd1 - 0.05, cf + 2.0, { color: bar.noren, text: bar.word, fg: norenFg, face, h: 0.42 });
    // Beer crates stacked by the window, inside the claimed room in front.
    const [ca, cb] = band(i, s, d, d + 0.4);
    b.box('flat:#d6a21a', x1 - 0.62, cf, ca, x1 - 0.18, cf + 0.3, cb);
    b.box('flat:#b3261e', x1 - 0.62, cf + 0.3, ca, x1 - 0.18, cf + 0.6, cb);
    const [ta, tb] = band(i, s, d + 0.03, d + 0.37);
    b.deco('flat:#2a1d14', x1 - 0.59, cf + 0.6, ta, x1 - 0.21, cf + 0.62, tb);
  }

  // Projecting vertical sign on both faces, edged in neon, cf + 2.32 … 2.94.
  const xp = x0 + 0.32;
  if (!near(xp, 0.4)) {
    const [pa, pb] = band(i, s, d + 0.05, d + 0.55);
    b.deco(INK, xp - 0.02, cf + 2.34, pa, xp + 0.02, cf + 2.94, pb);
    for (const f of [-1, 1]) {
      b.sign({ k: 'shop', ja: bar.word, bg: bar.bg, fg: bar.fg, vertical: true }, xp + f * 0.026, cf + 2.64, at(d + 0.3), [f, 0], 0.42, 0.54);
    }
    const [ea, eb] = band(i, s, d + 0.55, d + 0.57);
    b.deco(`glow:${bar.neon}`, xp - 0.022, cf + 2.32, ea, xp + 0.022, cf + 2.94, eb);
    const [ga, gb] = band(i, s, d + 0.05, d + 0.57);
    b.deco(`glow:${bar.neon}`, xp - 0.022, cf + 2.32, ga, xp + 0.022, cf + 2.34, gb);
  }
  // Red lantern (akachōchin) in front of the fascia.
  if (!near(x1 - 0.45, 0.5)) lantern(i, x1 - 0.45, cf + 2.3, at(d + 0.26), { d: 0.32, h: 0.5, top });
  return true;
}

/** A pair of old snack-and-sake vending cabinets, 2.0 long, 0.72 deep. */
function cabinets(i: ConcInfo, s: Wall, x0: number): boolean {
  const d = 0.72, [za, zb] = band(i, s, 0, d + 1.0);
  if (!i.free(x0, za, x0 + 2.0, zb)) return false;
  i.claim(x0, za, x0 + 2.0, zb);
  const { b, cf } = i;
  const at = (dd: number) => s * (i.cw - dd);
  const kinds = [
    { body: 'paint:#6d1a1a', ja: 'おつまみ', en: 'Snacks' },
    { body: 'paint:#2b3f5c', ja: 'お酒', en: 'Sake' },
  ];
  kinds.forEach((k, n) => {
    const p = x0 + n * 1.02, q = p + 0.98;
    wbox(i, s, k.body, p, q, cf, cf + 1.85, 0, d, true);
    wbox(i, s, 'glow:#fff1d6', p + 0.08, q - 0.08, cf + 1.1, cf + 1.66, d, d + 0.01);
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 4; c++) {
        const x = p + 0.16 + c * 0.2;
        wbox(i, s, BOTTLES[(c + r + n) % 3], x - 0.06, x + 0.06, cf + 1.18 + r * 0.26, cf + 1.36 + r * 0.26, d + 0.01, d + 0.025);
      }
    }
    wbox(i, s, 'glow:#ffb300', p + 0.08, q - 0.08, cf + 1.03, cf + 1.06, d, d + 0.012);
    wbox(i, s, 'flat:#1b1b1b', p + 0.62, q - 0.12, cf + 0.72, cf + 0.95, d, d + 0.012);
    wbox(i, s, 'flat:#1b1b1b', p + 0.15, q - 0.15, cf + 0.22, cf + 0.4, d, d + 0.03);
    b.sign({ k: 'shop', ja: k.ja, en: k.en, bg: '#1b1b1b', fg: '#ffcf4a' }, (p + q) / 2, cf + 1.76, at(d + 0.012), [0, -s], 0.8, 0.14);
  });
  return true;
}

/** Framed bills for bars and shows on whatever paid wall is left, each lit from above. */
function bills(i: ConcInfo, s: Wall, x0: number, x1: number, v0: number) {
  const w = 0.9, h = 1.3, pitch = 1.3, y = i.cf + 1.5;
  let v = v0;
  for (let x = x0 + pitch / 2; x + w / 2 <= x1 - 0.1; x += pitch) {
    const [za, zb] = band(i, s, 0, 0.35);
    if (!i.free(x - w / 2 - 0.1, za, x + w / 2 + 0.1, zb)) continue;
    const [ca, cb] = band(i, s, 0, 0.05);
    i.claim(x - w / 2 - 0.1, ca, x + w / 2 + 0.1, cb);
    wbox(i, s, 'flat:#0c0c0e', x - w / 2 - 0.05, x + w / 2 + 0.05, y - h / 2 - 0.05, y + h / 2 + 0.05, 0.008, 0.022);
    wbox(i, s, GOLD, x - w / 2 - 0.05, x + w / 2 + 0.05, y + h / 2 + 0.05, y + h / 2 + 0.075, 0.008, 0.026);
    wbox(i, s, 'glow:#ffcf8a', x - 0.2, x + 0.2, y + h / 2 + 0.14, y + h / 2 + 0.16, 0.02, 0.14);
    i.b.sign({ k: 'poster', v: v++ % 8 }, x, y, s * (i.cw - 0.03), [0, -s], w, h);
  }
}

type Slot = 'bar' | 'cabinets' | 'lockers' | 'gap';

/** Walk along wall `s` through the paid area, placing the plan's items one after another. */
function fillWall(i: ConcInfo, s: Wall, plan: Slot[], bars: { peek: () => Bar; take: () => void }, avoid: number[]) {
  let x = i.paid[0], k = 0;
  while (k < plan.length && x < i.paid[1] - 1.5) {
    const slot = plan[k];
    let w = 0;
    if (slot === 'gap') w = 1.4;
    else if (slot === 'bar') {
      const want = 2.4 + Math.floor(i.rand() * 3) * 0.3;
      for (const ww of want > 2.4 ? [want, 2.4] : [2.4]) {
        if (barFront(i, s, x, x + ww, bars.peek(), avoid)) {
          bars.take();
          w = ww;
          break;
        }
      }
    } else if (slot === 'cabinets') {
      if (cabinets(i, s, x)) w = 2.0;
    } else if (lockers(i, s, x, 1)) w = 1.6;
    if (w) {
      x += w;
      k++;
    } else x += 0.25;
  }
}

// ── Overhead ─────────────────────────────────────────────────────────────────────────────────

/** Pipes and conduit: two conduits the whole length (broken at the gates), pipes along the bars. */
function services(i: ConcInfo) {
  const top = i.cf + i.clear;
  const gateGaps = i.ends.map((e): Span => [e.g - 4.5, e.g + 4.5]);
  const zc = i.pillars.length ? Math.min(...i.pillars.map(([, z]) => Math.abs(z))) - 1.2 : 0.4 * i.cw;
  for (const s of [-1, 1]) {
    pipeRun(i, 'x', s * zc, i.x0, i.x1, top, { n: 2, size: 0.08, drop: 0.04, gaps: gateGaps, rise: [false, false], mats: ['paint:#3a3d41', 'paint:#5b4636'] });
  }
  for (const s of [-1, 1] as const) {
    const a = i.ends.some((e) => !e.hi) ? i.paid[0] + 4 : i.x0;
    const c = i.ends.some((e) => e.hi) ? i.paid[1] - 4 : i.x1;
    if (c - a < 2) continue;
    pipeRun(i, 'x', s * (i.cw - 1.55), a, c, top, { n: 3, rise: [a > i.x0, c < i.x1], mats: s > 0 ? PIPES : [PIPES[1], PIPES[0], PIPES[2]] });
  }
}

/** The stairwells that stand in the spine (full-height walls: nothing runs through them). */
const spineWells = (i: ConcInfo) => i.stairwells.filter((w) => w.room < 0);

/**
 * How far from the axis the stairwell walls reach on side `s` at x (the outer face of a wall or a
 * portal jamb there), or 0 where none stands: where a string across the alley must stop.
 */
function wellEdge(i: ConcInfo, x: number, s: Wall): number {
  let e = 0;
  for (const w of spineWells(i)) {
    for (const r of [...w.walls, ...w.portal.jambs]) {
      if (x > r[0] - 0.02 && x < r[2] + 0.02 && (s > 0 ? r[3] > 0 : r[1] < 0)) e = Math.max(e, s > 0 ? r[3] : -r[1]);
    }
  }
  return e;
}

/**
 * Strings of chōchin across the alley, on a wire at cf + 2.71. Where a stairwell stands the wire
 * is hooked to its wall on each side and runs on from there, and no lantern hangs over it.
 */
function lanternStrings(i: ConcInfo, xs: number[], reach: number) {
  const { b, cf } = i, wy = cf + 2.71;
  for (const x of xs) {
    const e = { '-1': wellEdge(i, x, -1), '1': wellEdge(i, x, 1) };
    const wire = (z0: number, z1: number) => {
      if (z1 - z0 > 0.1) b.deco('flat:#1b1b1b', x - 0.01, wy - 0.01, z0, x + 0.01, wy + 0.01, z1);
    };
    if (e['-1'] || e['1']) {
      wire(-reach, -e['-1']);
      wire(e['1'], reach);
    } else wire(-reach, reach);
    let k = 0;
    for (let z = 0.9; z <= Math.min(reach, i.cw - 1.3); z += 1.12, k++) {
      for (const s of [-1, 1] as const) {
        if (z < e[String(s) as '-1' | '1'] + 0.45) continue;
        chochin(i, x, s * z, cf, k % 4 === 3 ? '#f2c88a' : '#e5533d');
      }
    }
  }
}

// ── The stairwells ───────────────────────────────────────────────────────────────────────────

/**
 * The long outer faces of the stairwells in the spine, one run per side: back to back stairwells
 * (and the closed-off strip between them) read as one wall, so their faces are joined.
 */
function wellFaces(i: ConcInfo): WallFace[] {
  const all = spineWells(i).flatMap((w) => stairwellFaces(i, w)).filter((f) => f.axis === 'x' && !f.end);
  const out: WallFace[] = [];
  const inWell = (x: number, z: number) => spineWells(i).some(({ footprint: f }) => x > f[0] && x < f[2] && z > f[1] && z < f[3]);
  for (const f of all.sort((p, q) => p.at - q.at || p.n - q.n || p.u0 - q.u0)) {
    const last = out[out.length - 1];
    const gap = last ? f.u0 - last.u1 : Infinity;
    if (last && last.at === f.at && last.n === f.n && gap < 1.6 && (gap < 0.01 || inWell((last.u1 + f.u0) / 2, f.at - f.n * 0.05))) last.u1 = f.u1;
    else out.push({ axis: f.axis, at: f.at, n: f.n, u0: f.u0, u1: f.u1 });
  }
  return out;
}

/** Framed bills for bars and shows along face `f` from u0 to u1, centred as a group, each lit from above. */
function faceBills(i: ConcInfo, f: WallFace, u0: number, u1: number, v0: number): number {
  const { b, cf } = i, w = 0.9, h = 1.3, pitch = 1.45, y = cf + 1.5;
  const m = Math.floor((u1 - u0 - w - 0.3) / pitch) + 1;
  let v = v0;
  if (m < 1) return v;
  const start = (u0 + u1) / 2 - ((m - 1) * pitch) / 2;
  for (let k = 0; k < m; k++) {
    const u = start + k * pitch;
    fbox(b, f, 'flat:#0c0c0e', u - w / 2 - 0.05, u + w / 2 + 0.05, y - h / 2 - 0.05, y + h / 2 + 0.05, 0.008, 0.022);
    fbox(b, f, GOLD, u - w / 2 - 0.05, u + w / 2 + 0.05, y + h / 2 + 0.05, y + h / 2 + 0.075, 0.008, 0.026);
    fbox(b, f, 'glow:#ffcf8a', u - 0.2, u + 0.2, y + h / 2 + 0.14, y + h / 2 + 0.16, 0.02, 0.14);
    const [px, pz] = fpt(f, u, 0.03);
    b.sign({ k: 'poster', v: v++ % 8 }, px, y, pz, fnormal(f), w, h);
  }
  return v;
}

/** Neon tubes on black mounts high on face `f` from u0 to u1, in pieces of up to 2.6 m, colours in turn. */
function faceNeon(i: ConcInfo, f: WallFace, u0: number, u1: number, k0: number): number {
  const { b, cf } = i, colours = Object.values(NEON);
  let k = k0;
  const room = u1 - u0 - 0.6;
  const n = Math.ceil((room + 0.4) / 3.0);
  if (room < 0.8 || n < 1) return k;
  const len = Math.min(2.6, (room - (n - 1) * 0.4) / n);
  if (len < 0.8) return k;
  const start = (u0 + u1) / 2 - (n * len + (n - 1) * 0.4) / 2;
  for (let j = 0; j < n; j++) {
    const p = start + j * (len + 0.4);
    fbox(b, f, INK, p, p + len, cf + 2.49, cf + 2.58, 0.004, 0.02);
    fbox(b, f, `glow:${colours[k++ % colours.length]}`, p + 0.05, p + len - 0.05, cf + 2.52, cf + 2.55, 0.02, 0.04);
  }
  return k;
}

/**
 * The front of one of the bars that did not fit along the real walls, flat against a stairwell
 * wall, 2.4 m wide round `c`: a black fascia with the lit name sign and a neon line, timber
 * pilasters, a lit lattice door and window, a short noren, a projecting vertical sign and a red
 * lantern (both above head height). Stands out 0.12 m at most. `avoid`: x of the lantern strings.
 */
function flatBar(i: ConcInfo, f: WallFace, c: number, bar: Bar, avoid: number[]) {
  const { b, cf } = i, top = cf + i.clear, fy = cf + FY, n = f.n;
  const x0 = c - 1.2, x1 = c + 1.2, xa = x0 + 0.1, xb = x1 - 0.1;
  const bx = (mat: string, u0: number, u1: number, y0: number, y1: number, d0: number, d1: number) => fbox(b, f, mat, u0, u1, y0, y1, d0, d1);
  const zAt = (d: number) => f.at + n * d;
  const zr = (d0: number, d1: number): Span => (n > 0 ? [zAt(d0), zAt(d1)] : [zAt(d1), zAt(d0)]);
  const norenFg = bar.noren === NOREN.white ? bar.fg : '#ffffff';
  // Fascia, gold edge, neon tube, name sign; pilasters.
  bx(INK, x0, x1, fy, top, 0, 0.05);
  bx(GOLD, x0, x1, fy, fy + 0.04, 0.05, 0.062);
  bx(`glow:${bar.neon}`, x0 + 0.1, x1 - 0.1, top - 0.1, top - 0.075, 0.05, 0.07);
  b.sign({ k: 'shop', ja: bar.ja, en: bar.en, bg: bar.bg, fg: bar.fg }, c, fy + 0.28, zAt(0.066), [0, n], signW(x1 - x0), 0.34);
  bx(TIMBER, x0, xa, cf, fy, 0, 0.12);
  bx(TIMBER, xb, x1, cf, fy, 0, 0.12);
  // Closed front: a timber board, a lit sliding door and a lit window behind lattice.
  bx(TIMBER, xa, xb, cf, fy, 0.004, 0.02);
  const xd0 = xa + 0.15, xd1 = xd0 + 0.85;
  bx(PAPER, xd0, xd1, cf + 0.08, cf + 1.95, 0.02, 0.032);
  bx(TIMBER, xd0 - 0.04, xd1 + 0.04, cf + 1.95, cf + 2.03, 0.02, 0.07);
  bx(TIMBER, xd0, xd1, cf + 0.99, cf + 1.03, 0.032, 0.05);
  for (let k = 1; k < 4; k++) {
    const x = xd0 + (k * (xd1 - xd0)) / 4;
    bx(TIMBER, x - 0.015, x + 0.015, cf + 0.08, cf + 1.95, 0.032, 0.05);
  }
  const xw0 = xd1 + 0.15, xw1 = xb - 0.15;
  if (xw1 - xw0 > 0.4) {
    bx(PAPER, xw0, xw1, cf + 0.95, cf + 1.85, 0.02, 0.032);
    bx(TIMBER, xw0 - 0.03, xw1 + 0.03, cf + 0.9, cf + 0.95, 0.02, 0.07);
    const m = Math.max(1, Math.round((xw1 - xw0) / 0.18) - 1);
    for (let k = 1; k <= m; k++) {
      const x = xw0 + (k * (xw1 - xw0)) / (m + 1);
      bx(TIMBER, x - 0.012, x + 0.012, cf + 0.95, cf + 1.85, 0.032, 0.05);
    }
  }
  noren(i, 'x', zAt(0.075), xd0 + 0.05, xd1 - 0.05, cf + 2.0, { color: bar.noren, text: bar.word, fg: norenFg, face: n, h: 0.42 });
  // Projecting vertical sign, edged in neon, cf + 2.32 … 2.94; a red lantern.
  const near = (x: number, m: number) => avoid.some((a) => Math.abs(a - x) < m);
  const xp = x0 + 0.32;
  if (!near(xp, 0.4)) {
    const [pa, pb] = zr(0.05, 0.55);
    b.deco(INK, xp - 0.02, cf + 2.34, pa, xp + 0.02, cf + 2.94, pb);
    for (const side of [-1, 1]) {
      b.sign({ k: 'shop', ja: bar.word, bg: bar.bg, fg: bar.fg, vertical: true }, xp + side * 0.026, cf + 2.64, zAt(0.3), [side, 0], 0.42, 0.54);
    }
    const [ea, eb] = zr(0.55, 0.57), [ga, gb] = zr(0.05, 0.57);
    b.deco(`glow:${bar.neon}`, xp - 0.022, cf + 2.32, ea, xp + 0.022, cf + 2.94, eb);
    b.deco(`glow:${bar.neon}`, xp - 0.022, cf + 2.32, ga, xp + 0.022, cf + 2.34, gb);
  }
  if (!near(x1 - 0.45, 0.5)) lantern(i, x1 - 0.45, cf + 2.3, zAt(0.32), { d: 0.32, h: 0.5, top });
}

/** A row of gold gourd charms on a wire along face `f`, 0.9 m out from it, above head height. */
function faceCharms(i: ConcInfo, f: WallFace, avoid: number[]) {
  const { b, cf } = i, top = cf + i.clear, wy = cf + 2.86;
  const a = f.u0 + 0.5, c = f.u1 - 0.5;
  if (c - a < 2) return;
  const zc = f.at + f.n * 0.9, z0 = zc - 0.008, z1 = zc + 0.008;
  b.deco(INK, a, wy, z0, c, wy + 0.015, z1);
  for (const x of [a, c]) b.deco(INK, x - 0.008, wy, z0, x + 0.008, top, z1);
  for (let x = a + 0.6; x <= c - 0.6; x += 1.5) {
    if (avoid.some((q) => Math.abs(q - x) < 0.45)) continue;
    b.deco(GOLD, x - 0.005, cf + 2.66, zc - 0.005, x + 0.005, wy, zc + 0.005);
    gourd(i, x, cf + 2.49, zc, null, 0.62);
  }
}

/**
 * Dress the long outer walls of the stairwells as part of the alley: the black dado and gold line,
 * the doors of the `spare` bars (the names the real walls had no room for), framed bills and neon
 * between them, and the gourd charms on a wire along each. Nothing stands on the floor.
 */
function dressWells(i: ConcInfo, spare: Bar[], avoid: number[]) {
  const faces = wellFaces(i);
  if (!faces.length) return;
  const mine = faces.map(() => [] as Bar[]);
  spare.forEach((bar, k) => mine[k % faces.length].push(bar));
  let v = 0, k = 0;
  faces.forEach((f, fi) => {
    const L = f.u1 - f.u0, m = mine[fi].length, lo = f.u0 + 1.7, hi = f.u1 - 1.7;
    // Bar doors: spread along the face, nudged clear of the lantern strings' hooks.
    const slots: { c: number; bar: Bar }[] = [];
    mine[fi].forEach((bar, j) => {
      const want = f.u0 + L * (m === 1 ? 0.42 + 0.16 * fi : (j + 0.5) / m);
      for (let d = 0; d < 6; d += 0.1) {
        const c = [want + d, want - d].find((q) => q > lo && q < hi && avoid.every((a) => Math.abs(a - q) > 1.8) && slots.every((o) => Math.abs(o.c - q) > 3.2));
        if (c !== undefined) {
          slots.push({ c, bar });
          break;
        }
      }
    });
    slots.sort((p, q) => p.c - q.c);
    const gaps = slots.map((o): Span => [o.c - 1.2, o.c + 1.2]);
    faceDado(i, f, { ...P, gaps });
    for (const o of slots) flatBar(i, f, o.c, o.bar, avoid);
    for (const [p, q] of cut([f.u0 + 0.3, f.u1 - 0.3], gaps.map(([a, c]): Span => [a - 0.25, c + 0.25]))) {
      v = faceBills(i, f, p, q, v);
      k = faceNeon(i, f, p, q, k);
    }
    faceCharms(i, f, avoid);
  });
}

/** The x-runs of the joined stairwells, and the middle of the lane between their walls and the pillar rows. */
function wellRuns(i: ConcInfo): { runs: Span[]; z: number } {
  const fps = spineWells(i).map((w) => w.footprint).sort((p, q) => p[0] - q[0]);
  const runs: Span[] = [];
  for (const f of fps) {
    const last = runs[runs.length - 1];
    if (last && f[0] <= last[1] + 0.5) last[1] = Math.max(last[1], f[2]);
    else runs.push([f[0], f[2]]);
  }
  const edge = Math.max(0, ...fps.map((f) => Math.max(f[3], -f[1])));
  const pil = i.pillars.length ? Math.min(...i.pillars.map(([, z]) => Math.abs(z))) - 0.35 : edge + 2.2;
  return { runs, z: (edge + pil) / 2 };
}

/** The unpaid halls: neon tubes high on the walls, one lantern string across. */
function unpaidHalls(i: ConcInfo) {
  const { cf } = i;
  for (const e of i.ends) {
    const ux = (u: number) => (e.hi ? e.g + u : e.g - u);
    const span = (u0: number, u1: number): Span => [Math.min(ux(u0), ux(u1)), Math.max(ux(u0), ux(u1))];
    const [a1, c1] = span(3.3, 8.7);
    wbox(i, 1, `glow:${NEON.pink}`, a1, c1, cf + 2.62, cf + 2.645, 0.01, 0.03);
    const [a2, c2] = span(13.3, 15.6);
    wbox(i, 1, `glow:${NEON.amber}`, a2, c2, cf + 2.62, cf + 2.645, 0.01, 0.03);
    wbox(i, -1, `glow:${NEON.cyan}`, a2, c2, cf + 2.62, cf + 2.645, 0.01, 0.03);
    const u = [6, 7, 5, 8].find((q) => !i.pillars.some(([px]) => Math.abs(px - ux(q)) < 1.5));
    // Short of the walls: the fare board and the lockers are there.
    if (u !== undefined) lanternStrings(i, [ux(u)], i.cw - 0.7);
  }
}

// ── The look ─────────────────────────────────────────────────────────────────────────────────

export const look: StationLook = {
  finishes: { wall: 'tile:#1d1c22', floor: 'floor:#6e5d4b', pillar: 'tile:#141417', ceil: 'paint:#1c1b1f' },
  posters: false,
  skirting: false,

  lights(i) {
    const { cf } = i, top = cf + i.clear;
    // Stairwells: white battens down the lane beside each wall, and one across the alley just
    // beyond the 3 m in front of each portal.
    const { runs, z: zl } = wellRuns(i);
    for (const [a, c] of runs) for (const s of [-1, 1]) if (c - a > 1.4) batten(i, 'x', s * zl, a + 0.3, c - 0.3, top);
    for (const w of spineWells(i)) {
      const [px, pz] = w.portal.at, [nx, nz] = w.portal.n, hw = w.portal.w / 2 - 0.3;
      if (nx) batten(i, 'z', px + nx * 3.4, pz - hw, pz + hw, top);
      else batten(i, 'x', pz + nz * 3.4, px - hw, px + hw, top);
    }
    // Gate lines: white battens across the hall either side of the gates, short of the office.
    const oz = i.cw < 9 ? 3.7 : 5.0;
    for (const e of i.ends) for (const dx of [-3.4, -2.4, 2.4, 3.4]) batten(i, 'z', e.g + dx, -i.cw + 0.7, oz - 0.4, top);
    // Unpaid halls: white battens along the hall, in three pieces.
    for (const e of i.ends) {
      for (const [u0, u1] of [[4.5, 6.9], [8.1, 10.5], [11.7, 14.1]]) {
        const a = e.hi ? e.g + u0 : e.g - u1, c = e.hi ? e.g + u1 : e.g - u0;
        for (const z of [-0.33 * i.cw, 0.33 * i.cw]) batten(i, 'x', z, a, c, top);
      }
    }
    // The alley: bare bulbs down both walkways, between the lantern strings.
    const sx = stringXs(i), zb = i.cw - 2.2;
    for (const s of [-1, 1]) {
      for (let x = i.paid[0] + 4.5; x <= i.paid[1] - 4.5; x += 2.4) {
        if (sx.some((q) => Math.abs(q - x) < 0.7)) continue;
        bulb(i, x, s * zb, cf, top);
      }
    }
  },

  pillar(i, x, z, y0, y1) {
    const { b } = i, h = 0.42, g = 0.012;
    // Black tile, gold base and band, gold corner beads.
    b.deco(i.pillar, x - h, y0, z - h, x + h, y1, z + h);
    b.deco(GOLD, x - h - g, y0, z - h - g, x + h + g, y0 + 0.14, z + h + g);
    b.deco(GOLD, x - h - g, y0 + 2.2, z - h - g, x + h + g, y0 + 2.26, z + h + g);
    for (const cx of [x - h, x + h]) for (const cz of [z - h, z + h]) b.deco(GOLD, cx - 0.02, y0 + 0.14, cz - 0.02, cx + 0.02, y0 + 2.2, cz + 0.02);
    // A gold gourd on the two faces across the alley.
    for (const nz of [-1, 1]) gourd(i, x, y0 + 1.4, z + nz * (h + 0.012), 'z');
    // Bills on the two faces along the alley (paid area only).
    if (x > i.paid[0] && x < i.paid[1]) {
      let v = Math.abs(Math.round(x * 3 + z)) % 8;
      for (const nx of [-1, 1]) {
        b.deco('flat:#0c0c0e', Math.min(x + nx * h, x + nx * (h + 0.02)), y0 + 0.95, z - 0.35, Math.max(x + nx * h, x + nx * (h + 0.02)), y0 + 1.95, z + 0.35);
        b.sign({ k: 'poster', v: v++ % 8 }, x + nx * (h + 0.03), y0 + 1.45, z, [nx, 0], 0.62, 0.88);
      }
    }
  },

  concourse(i) {
    // Walls: black dado with a gold cap, a gold line at cf + 2.3, a black skirting.
    for (const s of [-1, 1] as const) wallDado(i, s, P);
    const paidEnds = [...(i.ends.some((e) => !e.hi) ? [] : [i.x0]), ...(i.ends.some((e) => e.hi) ? [] : [i.x1])];
    for (const x of paidEnds) endDado(i, x, P);

    // The alley: bars along both walls, with a vending pair on one and lockers on the other.
    const avoid = stringXs(i);
    const list = shuffle(i, BARS);
    let n = 0;
    const bars = { peek: () => list[n % list.length], take: () => void n++ };
    const first: Wall = i.rand() < 0.5 ? 1 : -1;
    fillWall(i, first, ['bar', 'bar', 'gap', 'bar', 'cabinets', 'bar', 'bar', 'gap', 'bar', 'bar'], bars, avoid);
    fillWall(i, -first as Wall, ['bar', 'bar', 'lockers', 'bar', 'gap', 'bar', 'bar', 'bar', 'bar', 'bar', 'bar'], bars, avoid);
    for (const s of [-1, 1] as const) bills(i, s, i.paid[0], i.paid[1], s > 0 ? 0 : 4);

    // The stairwells' outer walls are part of the alley: the bars that did not fit (the names not
    // yet used) get flat doors there, between bills and neon; the gourd charms hang along them.
    const used = Math.min(n, list.length);
    dressWells(i, list.slice(used, used + 4), avoid);

    // Overhead: pipes, lantern strings; the unpaid halls.
    services(i);
    lanternStrings(i, avoid, i.cw - 0.02);
    unpaidHalls(i);
  },

  exit(e) {
    const { b, cf, ext } = e, L = ext + 4;
    exitDado(e, { mat: DADO, top: 1.0, cap: GOLD, steps: 5 });
    exitPipes(e, { n: 2, mats: [PIPES[0], PIPES[2]] });
    exitHandrails(e, ['near']);
    // A gold line high on the corridor and lobby walls, above the posters.
    b.deco(GOLD, -4, cf + 2.36, 0, -3.988, cf + 2.39, L);
    b.deco(GOLD, -4, cf + 2.36, L - 0.012, 0, cf + 2.39, L);
    if (ext > 0) b.deco(GOLD, -0.012, cf + 2.36, 0, 0, cf + 2.39, ext);
    // A pink neon tube under the corridor ceiling, red lanterns in the lobby.
    if (ext > 0.6) b.deco(`glow:${NEON.pink}`, -0.03, cf + 2.44, 0.3, -0.012, cf + 2.465, ext - 0.3);
    lantern(e, -1.0, cf + 2.3, ext + 0.7, { d: 0.3, h: 0.36, top: cf + 2.7 });
    lantern(e, -3.0, cf + 2.3, ext + 3.3, { d: 0.3, h: 0.36, top: cf + 2.7 });
  },

  canopy(e) {
    const { b, gy, ext, run } = e;
    const z0 = ext + 0.6, z1 = ext + 4.6, xr = run + 0.7, R = gy + 2.62;
    // Black steel posts on the stair walls.
    for (const [px, pz] of [[0.07, ext + 1.05], [0.07, ext + 4.15], [run - 0.07, ext + 1.05], [run - 0.07, ext + 4.15]]) {
      b.deco(STEEL, px - 0.07, gy, pz - 0.07, px + 0.07, R, pz + 0.07);
    }
    // Low steel roof with a timber soffit.
    b.deco(STEEL, -0.6, R, z0, xr, R + 0.12, z1);
    b.deco(TIMBER_LIGHT, -0.55, R - 0.02, z0 + 0.05, xr - 0.05, R, z1 - 0.05);
    // Fascia on three sides, edged in gold top and bottom.
    b.deco(STEEL, -0.6, R - 0.04, z0 - 0.05, xr + 0.05, R + 0.26, z0);
    b.deco(STEEL, -0.6, R - 0.04, z1, xr + 0.05, R + 0.26, z1 + 0.05);
    b.deco(STEEL, xr, R - 0.04, z0 - 0.05, xr + 0.05, R + 0.26, z1 + 0.05);
    for (const [y0, y1] of [[R - 0.065, R - 0.04], [R + 0.26, R + 0.285]]) {
      b.deco(GOLD, -0.6, y0, z0 - 0.056, xr + 0.056, y1, z0);
      b.deco(GOLD, -0.6, y0, z1, xr + 0.056, y1, z1 + 0.056);
      b.deco(GOLD, xr, y0, z0 - 0.056, xr + 0.056, y1, z1 + 0.056);
    }
    // Dark glass side screens with timber fins outside.
    for (const [g0, g1, f0, f1] of [[ext + 1.02, ext + 1.08, ext + 0.97, ext + 1.02], [ext + 4.12, ext + 4.18, ext + 4.18, ext + 4.23]]) {
      b.deco('glassDark', 0, gy + 1.0, g0, run, R - 0.02, g1);
      for (let k = 0; k < 5; k++) {
        const x = (run * (k + 0.5)) / 5;
        b.deco(TIMBER_LIGHT, x - 0.04, gy + 1.0, f0, x + 0.04, R - 0.02, f1);
      }
    }
    // Black board behind the entrance sign, framed in gold outside the sign.
    b.deco(STEEL, run - 0.04, gy + 1.84, ext + 1.05, run + 0.05, gy + 2.56, ext + 4.15);
    b.deco(GOLD, run - 0.04, gy + 2.52, ext + 1.05, run + 0.065, gy + 2.56, ext + 4.15);
    b.deco(GOLD, run - 0.04, gy + 1.84, ext + 1.05, run + 0.065, gy + 1.88, ext + 4.15);
    b.deco(GOLD, run - 0.04, gy + 1.88, ext + 1.05, run + 0.065, gy + 2.52, ext + 1.1);
    b.deco(GOLD, run - 0.04, gy + 1.88, ext + 4.1, run + 0.065, gy + 2.52, ext + 4.15);
    // A red lantern each side of the way out.
    for (const z of [ext + 0.8, ext + 4.4]) lantern(e, run + 0.35, gy + 1.8, z, { d: 0.36, h: 0.55, top: R });
  },

  passage(p) {
    passageDado(p, { mat: DADO, top: 1.0, cap: GOLD });
    passageRails(p);
    passagePipes(p, { n: 3, mats: PIPES });
    // A gold line along both walls under the ceiling.
    for (const w of passageWalls(p)) {
      const [za, zb] = w.f > 0 ? [w.z, w.z + 0.012] : [w.z - 0.012, w.z];
      for (const [a, c] of w.runs) p.b.deco(GOLD, a, p.pf + 2.36, za, c, p.pf + 2.39, zb);
    }
  },
};
