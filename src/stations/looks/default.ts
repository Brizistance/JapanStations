// The default look: what a station gets when it has no look of its own.
//
// It follows the primary line's age, the concourse width and a per-station seed, so two
// stations on one line are alike but not the same:
// - old (Yanagisuji 1933, Nagisa 1961): a dado of the platform walls' tile up to 1.2 m,
//   downstand beams every 4 m, a duct, a cable tray and pipes, bare battens, square tiled
//   pillars wrapped in adverts; a kiosk counter, a soba stand, lockers, vending machines and
//   posters on every free stretch of wall.
// - mid (Akanesuji 1994, Shiokaze 2004): enamel dado, a shallow coffered ceiling with recessed
//   panels; a convenience store, a bakery or café, an ATM corner and the like.
// - new (Kikyō 2015, Sumire 2023): pale panels, continuous light slots, fewer and larger
//   glazed fronts, digital advert panels, benches and planters along the pillar lines.

import { hexOf, shade } from '../themes/types';
import {
  adColumn, adPillar, atmCorner, bakery, batten, beam, bench, brandsOf, cableTray, cafe, conbini, cut,
  ductRun, endDado, eraClass, eraOf, exitDado, exitHandrails, exitPipes, flowerStall, infoWindow, kiosk, kioskStall,
  lightPanel, lockers, passageDado, passagePipes, passageRails, photoBooth, pipeRun, placeAlong, planter, posterRow,
  roundPillar, shopFront, SHOPS, sobaStand, toiletX, vendingRow, wallDado,
  type Brand, type DadoOpts, type EraClass, type Span, type Wall,
} from './parts';
import type { ConcInfo, StationLook } from './types';
import type { StationStyle } from '../kit';

const luma = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
};

/** Wall finishes from the station's own colours: the platform wall's colour carried up into the concourse. */
function palette(style: StationStyle, era: EraClass): DadoOpts {
  const w = hexOf(style.wall), acc = style.accent;
  // A pale platform wall would give a pale dado: borrow the accent instead.
  const base = luma(w) > 0.75 ? shade(acc, 0.2) : w;
  if (era === 'old') {
    const dark = `tile:${shade(base, -0.35)}`;
    return { mat: `tile:${base}`, top: 1.2, cap: dark, frieze: dark };
  }
  if (era === 'mid') return { mat: `panel:${shade(base, 0.3)}`, top: 1.0, cap: `paint:${acc}`, frieze: `paint:${acc}`, friezeY: [2.5, 2.54] };
  return { mat: `panel:${shade(base, 0.65)}`, top: 1.0, cap: 'metal:#c3c7cb', skirting: 'metal:#9da2a8' };
}

const nearGate = (i: ConcInfo, x: number, m: number) => i.ends.some((e) => Math.abs(x - e.g) < m);

/** x of the 4 m structural grid (beams, coffers); lights sit midway between. */
function grid(i: ConcInfo): number[] {
  const xs: number[] = [];
  for (let x = i.x0 + 4; x < i.x1 - 0.5; x += 4) xs.push(x);
  return xs;
}

/** Light rows across the concourse, as |z| fractions that miss the pillars and the gate signs. */
const lightRows = (i: ConcInfo, era: EraClass): number[] => {
  const f = era === 'new' ? [0.4, 0.8] : [0.33, 0.75];
  return f.flatMap((k) => [k * i.cw, -k * i.cw]);
};

/** A z for a run along x near `want` that keeps clear of every pillar (0.35 half + the run's half width). */
function clearOfPillars(i: ConcInfo, want: number, half: number): number {
  const hits = (z: number) => i.pillars.some(([, pz]) => Math.abs(pz - z) < 0.4 + half);
  if (!hits(want)) return want;
  const s = Math.sign(want) || 1;
  for (let d = 0.1; d < 3; d += 0.1) {
    for (const z of [want + s * d, want - s * d]) if (Math.abs(z) < i.cw - 1 && !hits(z)) return z;
  }
  return want;
}

// ── Ceilings ─────────────────────────────────────────────────────────────────────────────────

function oldCeiling(i: ConcInfo, deep: Span[][]) {
  const top = i.cf + i.clear, tx = toiletX(i);
  // Downstand beams in the paid area, clear of the gate signs and the toilet sign.
  for (const x of grid(i)) {
    if (x < i.paid[0] || x > i.paid[1] || nearGate(i, x, 4.5) || Math.abs(x - tx) < 1.5) continue;
    beam(i, x, 0.45, { mat: 'flat:#dcd8cc' });
  }
  // A duct down one side and a cable tray down the other, the whole length, broken at the gates.
  const gateGaps = i.ends.map((e): Span => [e.g - 4.5, e.g + 4.5]);
  const zr = 0.33 * i.cw + 0.85;
  const zd = clearOfPillars(i, -zr, 0.35), zt = clearOfPillars(i, zr, 0.2);
  ductRun(i, 'x', zd, i.x0, i.x1, top, { gaps: gateGaps, rise: [false, false] });
  cableTray(i, 'x', zt, i.x0, i.x1, top, { gaps: gateGaps });
  // Pipes along both walls over the paid area, ducking into the ceiling over deep shop fronts.
  for (const s of [-1, 1] as const) {
    const a = i.ends.some((e) => !e.hi) ? i.paid[0] + 3.4 : i.x0;
    const c = i.ends.some((e) => e.hi) ? i.paid[1] - 3.4 : i.x1;
    if (c - a < 2) continue;
    pipeRun(i, 'x', s * (i.cw - 0.55), a, c, top, {
      n: s > 0 ? 2 : 3, gaps: deep[s > 0 ? 1 : 0],
      rise: [a > i.x0, c < i.x1],
      mats: s > 0 ? ['paint:#8c949b', 'paint:#b8b2a3'] : ['paint:#b8b2a3', 'paint:#8c949b', 'paint:#a33b2f'],
    });
  }
}

function midCeiling(i: ConcInfo) {
  const top = i.cf + i.clear, rib = 'paint:#ecebe6';
  // Shallow coffers: ribs across on the 4 m grid and along at the edges and between the light rows.
  for (const x of grid(i)) {
    if (nearGate(i, x, 1.8)) continue;
    i.b.deco(rib, x - 0.12, top - 0.12, -(i.cw - 0.7), x + 0.12, top, i.cw - 0.7);
  }
  const gaps = i.ends.map((e): Span => [e.g - 1.8, e.g + 1.8]);
  for (const z of [0.55 * i.cw, -0.55 * i.cw, i.cw - 0.7, -(i.cw - 0.7)]) {
    const zc = Math.abs(z) < i.cw - 1 ? clearOfPillars(i, z, 0.1) : z;
    for (const [p, q] of cut([i.x0 + 0.7, i.x1 - 0.7], gaps)) i.b.deco(rib, p, top - 0.12, zc - 0.1, q, top, zc + 0.1);
  }
}

// ── Shops and clutter ────────────────────────────────────────────────────────────────────────

interface Item {
  w: number;
  /** Stands out more than 0.5 m (old-line pipes duck into the ceiling over it). */
  deep?: boolean;
  at: (s: Wall, x0: number) => boolean;
}

function catalogue(i: ConcInfo) {
  const pick = <T>(a: T[]): T => a[Math.floor(i.rand() * a.length)];
  const counter = (b: Brand, w = 2.4) => (s: Wall, x0: number) => shopFront(i, { s, x0, x1: x0 + w, brand: b, depth: 1.0, front: 'counter' });
  const glazed = (b: Brand, w: number, depth = 0.5) => (s: Wall, x0: number) =>
    shopFront(i, { s, x0, x1: x0 + w, brand: b, depth, front: 'glazed', door: x0 + w / 2 });
  return {
    kiosk: (): Item => ({ w: 2.4, deep: true, at: (s, x) => kioskStall(i, s, x) }),
    soba: (): Item => { const b = pick(brandsOf('soba')); return { w: 3.6, deep: true, at: (s, x) => sobaStand(i, s, x, b) }; },
    lockers: (): Item => { const n = i.rand() < 0.4 ? 3 : 2; return { w: n * 1.6, at: (s, x) => lockers(i, s, x, n) }; },
    vending: (): Item => { const n = 2 + Math.floor(i.rand() * 2); return { w: n * 1.05 + 1.4, at: (s, x) => vendingRow(i, s, x, n) }; },
    photo: (): Item => ({ w: 1.7, deep: true, at: (s, x) => photoBooth(i, s, x) }),
    flowers: (): Item => { const b = pick(brandsOf('flowers')); return { w: 3, deep: true, at: (s, x) => flowerStall(i, s, x, b) }; },
    sweets: (): Item => { const b = pick(brandsOf('sweets')); return { w: 2.4, deep: true, at: counter(b) }; },
    bento: (): Item => ({ w: 2.4, deep: true, at: counter(SHOPS.minatoya) }),
    lost: (): Item => ({ w: 2.4, at: (s, x) => infoWindow(i, s, x) }),
    bakery: (): Item => { const b = pick(brandsOf('bakery')); return { w: 4, deep: true, at: (s, x) => bakery(i, s, x, b) }; },
    // Glazed cafés are coffee shops; the juice stand stays a counter or an island.
    cafe: (w = 4.5): Item => { const b = pick([SHOPS.akaneCoffee, SHOPS.nagiCafe]); return { w, deep: true, at: (s, x) => cafe(i, s, x, b, w) }; },
    conbini: (w = 6): Item => { const b = pick(brandsOf('conbini')); return { w, deep: true, at: (s, x) => conbini(i, s, x, b, w) }; },
    atm: (): Item => ({ w: 2.1, deep: true, at: (s, x) => atmCorner(i, s, x, 2) }),
    drugstore: (): Item => ({ w: 4, deep: true, at: glazed(SHOPS.hibariPharmacy, 4, 0.4) }),
    books: (): Item => ({ w: 4, deep: true, at: glazed(SHOPS.ryubundo, 4, 0.4) }),
    goods: (w = 5): Item => { const b = pick(brandsOf('goods')); return { w, deep: true, at: glazed(b, w, 0.6) }; },
  };
}

function shuffle<T>(i: ConcInfo, a: T[]): T[] {
  const out = [...a];
  for (let k = out.length - 1; k > 0; k--) {
    const j = Math.floor(i.rand() * (k + 1));
    [out[k], out[j]] = [out[j], out[k]];
  }
  return out;
}

/** Choose and place 3–7 wall items. Returns the x-ranges of deep fronts per wall ([−z, +z]). */
function shops(i: ConcInfo, era: EraClass): Span[][] {
  const C = catalogue(i);
  const big = i.cw >= 14;
  let must: Item[], pool: Item[], extra: number;
  if (era === 'old') {
    must = [C.kiosk(), C.vending()];
    pool = [C.soba(), C.lockers(), C.photo(), C.vending(), C.flowers(), C.sweets(), C.lost(), C.bento()];
    extra = 3 + Math.floor(i.rand() * 3);
  } else if (era === 'mid') {
    must = [C.conbini()];
    pool = [C.bakery(), C.cafe(), C.atm(), C.lockers(), C.vending(), C.photo(), C.kiosk(), C.drugstore(), C.sweets(), C.books()];
    extra = 3 + Math.floor(i.rand() * 3);
  } else {
    must = [C.cafe(6)];
    pool = [C.conbini(7), C.goods(5), C.lockers(), C.vending(), C.bakery()];
    extra = 2 + Math.floor(i.rand() * 2);
  }
  if (big) extra += 2;
  const items = [...must, ...shuffle(i, pool).slice(0, extra)].sort((p, q) => q.w - p.w);
  const deep: Span[][] = [[], []];
  for (const it of items) {
    placeAlong(i, it.w, (s, x0) => {
      if (!it.at(s, x0)) return false;
      if (it.deep) deep[s > 0 ? 1 : 0].push([x0 - 0.15, x0 + it.w + 0.15]);
      return true;
    });
  }
  return deep;
}

/** Benches (and on new lines planters) in the pillar lines, midway between pillars, paid area only. */
function islands(i: ConcInfo, era: EraClass) {
  if (era === 'old') return;
  const spots = i.pillars
    .filter(([x, z]) => i.pillars.some(([x2, z2]) => z2 === z && Math.abs(x2 - x - 8) < 0.01))
    .map(([x, z]): [number, number] => [x + 4, z])
    .filter(([x]) => x > i.paid[0] + 4 && x < i.paid[1] - 4);
  let n = era === 'new' ? 3 : 2;
  for (const [x, z] of shuffle(i, spots)) {
    if (n <= 0) break;
    if (!bench(i, x, z, { axis: 'x', color: i.style.accent })) continue;
    n--;
    if (era === 'new') for (const k of [-1, 1]) planter(i, x + k * 2.0, z, { w: 0.9, d: 0.5, margin: 0.1 });
  }
  // A kiosk island in a wide new or mid concourse (interchanges have one already).
  if (i.cw >= 10 && i.cw < 14 && i.rand() < 0.45) {
    const xs = shuffle(i, Array.from({ length: Math.max(0, Math.floor(i.paid[1] - i.paid[0] - 10)) }, (_, k) => i.paid[0] + 5 + k));
    for (const x of xs) if (kiosk(i, x, 0, { w: 3, d: 1.6, brand: era === 'new' ? SHOPS.kajitsudo : SHOPS.maruhoshiKiosk, margin: 1.6 })) break;
  }
}

/** An advert column in each unpaid hall, between the exits and the gates (mid and new). */
function unpaidColumns(i: ConcInfo, era: EraClass) {
  if (era === 'old' || i.cw < 10) return;
  i.ends.forEach((e, k) => adColumn(i, e.g + (e.hi ? 7.5 : -7.5), 0, { half: 0.4, margin: 2.4, mat: 'panel:#e9e8e2', trim: i.line.color, v: k * 4 }));
}

// ── The look ─────────────────────────────────────────────────────────────────────────────────

export const defaultLook: StationLook = {
  posters: false,
  skirting: false,

  lights(i) {
    const era = eraClass(i.era), top = i.cf + i.clear;
    const rows = lightRows(i, era);
    if (era === 'new') {
      // Continuous light slots, broken only where a pillar meets them.
      for (const z of rows) {
        const gaps = i.pillars.filter(([, pz]) => Math.abs(pz - z) < 0.6).map(([px]): Span => [px - 0.6, px + 0.6]);
        for (const [p, q] of cut([i.x0 + 0.6, i.x1 - 0.6], gaps)) {
          i.b.deco('paint:#e6e5e0', p, top - 0.015, z - 0.11, q, top, z + 0.11);
          i.b.deco('light', p, top - 0.025, z - 0.07, q, top - 0.015, z + 0.07);
        }
      }
      return;
    }
    // Midway between the grid lines (beams or coffer ribs), clear of the gate sign and of the
    // departures screen's pole (g ± 1.25, up to the ceiling) that a 1.8 m panel could swallow.
    for (let c = i.x0 + 2; c + 1.2 < i.x1 - 0.3; c += 4) {
      if (nearGate(i, c, era === 'old' ? 1.8 : 2.6)) continue;
      for (const z of rows) {
        if (era === 'old') batten(i, 'x', z, c - 1.2, c + 1.2, top);
        else lightPanel(i, c, z, top, 1.8, 0.5);
      }
    }
  },

  pillar(i, x, z, y0, y1) {
    if (eraClass(i.era) === 'old') {
      adPillar(i, x, z, y0, y1, { half: 0.42, mat: i.pillar.startsWith('tile:') ? i.pillar : 'tile:#e9e4d8', trim: i.style.accent, faces: 2 });
    } else roundPillar(i, x, z, y0, y1, { mat: i.pillar, band: i.line.color, bandY: i.cf + 2.27 });
  },

  concourse(i) {
    const era = eraClass(i.era);
    const P = palette(i.style, era);
    // Walls: dado, cap and frieze along both long walls and across any paid end wall.
    for (const s of [-1, 1] as const) wallDado(i, s, P);
    const paidEnds = [...(i.ends.some((e) => !e.hi) ? [] : [i.x0]), ...(i.ends.some((e) => e.hi) ? [] : [i.x1])];
    for (const x of paidEnds) endDado(i, x, P);

    // Shops first (they decide where the pipes duck), then the ceiling, islands, posters.
    const deep = shops(i, era);
    if (era === 'old') oldCeiling(i, deep);
    else if (era === 'mid') midCeiling(i);
    islands(i, era);
    unpaidColumns(i, era);

    // Posters on whatever wall is left in the paid area.
    const pitch = era === 'old' ? 2.0 : era === 'mid' ? 3.5 : 5;
    for (const s of [-1, 1] as const) {
      posterRow(i, s, i.paid[0] + 3.6, i.paid[1] - 3.6, { pitch, v0: (s > 0 ? 0 : 4) + i.station.id.length, digital: era === 'new' });
    }
    // A pair of big posters on a blank paid end wall.
    for (const x of paidEnds) {
      const n = x <= i.x0 + 0.01 ? 1 : -1;
      for (const z of [-i.cw / 2, i.cw / 2]) {
        const r: [number, number, number, number] = [Math.min(x, x + n * 0.35), z - 1.1, Math.max(x, x + n * 0.35), z + 1.1];
        if (!i.free(...r)) continue;
        i.claim(r[0], r[1], r[2], r[3]);
        i.b.deco(era === 'new' ? 'flat:#16181b' : 'flat:#c9c9c4', Math.min(x, x + n * 0.022), i.cf + 0.9, z - 0.96, Math.max(x, x + n * 0.022), i.cf + 2.2, z + 0.96);
        i.b.sign({ k: 'poster', v: Math.round(z) & 7 }, x + n * 0.03, i.cf + 1.55, z, [n, 0], 1.8, 1.2);
      }
    }
  },

  exit(e) {
    const era = eraClass(eraOf(e.station)), P = palette(e.style, era);
    exitDado(e, { mat: P.mat, top: P.top, cap: P.cap });
    if (era === 'old') {
      exitPipes(e, { n: 2 });
      exitHandrails(e, ['near', 'far']);
    } else if (era === 'mid') exitHandrails(e, ['near']);
  },

  passage(p) {
    const era = eraClass(eraOf(p.station)), P = palette(p.style, era);
    passageDado(p, { mat: P.mat, top: P.top, cap: P.cap });
    passageRails(p);
    if (era === 'old') passagePipes(p, { n: 3, mats: ['paint:#b8b2a3', 'paint:#8c949b', 'paint:#a33b2f'] });
  },
};
