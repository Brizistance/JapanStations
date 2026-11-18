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
// A wide (interchange) concourse also gets islands down the middle, in the same spirit: kiosks,
// stalls and vending on old lines, shop blocks on mid ones, large glazed blocks, a bench and
// planter island and advert totems on new ones (see "Islands" below).

import { hexOf, shade } from '../themes/types';
import {
  adColumn, adPillar, atmCorner, bakery, batten, beam, bench, benchIsland, brandsOf, cableTray, cafe, conbini, cut,
  ductRun, endDado, eraClass, eraOf, exitDado, exitHandrails, exitPipes, flowerStall, hash, infoWindow, kiosk, kioskStall,
  lightPanel, lockers, passageDado, passagePipes, passageRails, photoBooth, pipeRun, placeAlong, planter, posterRow,
  roundPillar, shopFront, shopIsland, SHOPS, sobaStand, toiletX, totemRow, vendingIsland, vendingRow, waitingRoom, wallDado,
  type Brand, type DadoOpts, type EraClass, type IslandUnit, type Span, type Wall,
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

function oldCeiling(i: ConcInfo, deep: Span[][], isl: Box[] = []) {
  const top = i.cf + i.clear, tx = toiletX(i);
  // Islands run up to the ceiling: a run along x stops at one and goes up into the ceiling.
  const over = (z: number, half: number) => isl.filter((r) => z + half > r[1] - 0.1 && z - half < r[3] + 0.1).map((r): Span => [r[0] - 0.15, r[2] + 0.15]);
  // Downstand beams in the paid area, clear of the gate signs and the toilet sign.
  for (const x of grid(i)) {
    if (x < i.paid[0] || x > i.paid[1] || nearGate(i, x, 4.5) || Math.abs(x - tx) < 1.5) continue;
    beam(i, x, 0.45, { mat: 'flat:#dcd8cc' });
  }
  // A duct down one side and a cable tray down the other, the whole length, broken at the gates.
  const gateGaps = i.ends.map((e): Span => [e.g - 4.5, e.g + 4.5]);
  const zr = 0.33 * i.cw + 0.85;
  const zd = clearOfPillars(i, -zr, 0.35), zt = clearOfPillars(i, zr, 0.2);
  ductRun(i, 'x', zd, i.x0, i.x1, top, { gaps: [...gateGaps, ...over(zd, 0.35)], rise: [false, false] });
  cableTray(i, 'x', zt, i.x0, i.x1, top, { gaps: [...gateGaps, ...over(zt, 0.2)] });
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

// ── Islands down the middle of a wide concourse ──────────────────────────────────────────────
//
// An interchange concourse is 28 m or more wide. Blocks of shops (and vending machines,
// benches, advert totems) stand in the lanes between the pillar rows so that the hall is no
// longer one open floor, while every island keeps a clear aisle of 3 m all round (pillars may
// stand in it) and stays off the main routes. They are placed greedily, each where it hides
// the most of the hall: a sight line across the hall is a line along z, so what counts is how
// much of the hall's length (x) is not yet behind an island or a pillar.

/** Clear aisle round every island, and the half width of a main route. */
const AISLE = 3.0, ROUTE = 2.0;
type Box = [number, number, number, number];
const grow = (r: Box, m: number): Box => [r[0] - m, r[1] - m, r[2] + m, r[3] + m];
const meets = (a: Box, c: Box) => a[0] < c[2] && a[2] > c[0] && a[1] < c[3] && a[3] > c[1];

/**
 * What already stands on the floor, seen at 0.25 m, as a test: is anything in this rectangle
 * (outside the hall counts)? Anything is a solid between knee and head height (shops, machines,
 * gates, the office) or a stair opening. Pillars do not count (an aisle may run past a pillar),
 * nor does floor that is only claimed (standing room, the floor under a hanging sign).
 */
function obstacles(i: ConcInfo): (r: Box) => boolean {
  const S = 0.25, nx = Math.ceil((i.x1 - i.x0) / S), nz = Math.ceil((2 * i.cw) / S), W = nz + 1;
  const pil = i.pillars.map(([x, z]): Box => [x - 0.65, z - 0.65, x + 0.65, z + 0.65]);
  const bad = new Uint8Array(nx * nz);
  const mark = (r: Box) => {
    const a0 = Math.max(0, Math.floor((r[0] - i.x0) / S + 1e-6)), a1 = Math.min(nx, Math.ceil((r[2] - i.x0) / S - 1e-6));
    const c0 = Math.max(0, Math.floor((r[1] + i.cw) / S + 1e-6)), c1 = Math.min(nz, Math.ceil((r[3] + i.cw) / S - 1e-6));
    for (let a = a0; a < a1; a++) for (let c = c0; c < c1; c++) bad[a * nz + c] = 1;
  };
  const p0 = i.b.pt(0, 0, 0), p1 = i.b.pt(1, 0, 1);
  if (p0.every((v) => v === 0) && p1[0] === 1 && p1[2] === 1) {
    // The parts are in the concourse's own frame: read the solids themselves.
    for (const p of i.b.out.boxes) {
      if (!p.solid || p.max[1] <= i.cf + 0.1 || p.min[1] >= i.cf + 2.0) continue;
      if (p.max[0] <= i.x0 || p.min[0] >= i.x1 || p.max[2] <= -i.cw || p.min[2] >= i.cw) continue;
      const r: Box = [p.min[0], p.min[2], p.max[0], p.max[2]];
      if (pil.some((q) => r[0] >= q[0] && r[2] <= q[2] && r[1] >= q[1] && r[3] <= q[3])) continue;
      mark(r);
    }
  } else {
    // Otherwise go by what is taken, less the pillars and the stair landings.
    const land = i.holes.map((h): Box => [h[0] - 3.05, h[1] - 0.95, h[2] + 3.05, h[3] + 0.95]);
    for (let a = 0; a < nx; a++) {
      for (let c = 0; c < nz; c++) {
        const x = i.x0 + a * S, z = -i.cw + c * S;
        const cell: Box = [x + 0.01, z + 0.01, Math.min(i.x1, x + S) - 0.01, Math.min(i.cw, z + S) - 0.01];
        if (!i.free(...cell) && !pil.some((p) => meets(cell, p)) && !land.some((p) => meets(cell, p))) bad[a * nz + c] = 1;
      }
    }
  }
  for (const h of i.holes) mark(h);
  // Summed-area table of obstructed cells.
  const sum = new Int32Array((nx + 1) * W);
  for (let a = 0; a < nx; a++) {
    for (let c = 0; c < nz; c++) sum[(a + 1) * W + c + 1] = bad[a * nz + c] + sum[a * W + c + 1] + sum[(a + 1) * W + c] - sum[a * W + c];
  }
  return (r) => {
    if (r[0] < i.x0 || r[2] > i.x1 || r[1] < -i.cw || r[3] > i.cw) return true;
    const a0 = Math.max(0, Math.floor((r[0] - i.x0) / S)), a1 = Math.min(nx, Math.ceil((r[2] - i.x0) / S));
    const c0 = Math.max(0, Math.floor((r[1] + i.cw) / S)), c1 = Math.min(nz, Math.ceil((r[3] + i.cw) / S));
    return sum[a1 * W + c1] - sum[a0 * W + c1] - sum[a1 * W + c0] + sum[a0 * W + c0] > 0;
  };
}

/**
 * Floor that stays open: main routes 4 m wide along the hall through the gates; from the top
 * of every stair (and 5 m in front of it) straight across to that route, so every stair is
 * reached from every gate line and from every other stair; to the toilets; and in each unpaid
 * hall from the gates to every exit doorway, both along the hall and on the direct line.
 */
function routes(i: ConcInfo): Box[] {
  const gz = (i.cw < 9 ? 2.22 : 3.27) + 0.15;
  const out: Box[] = [[i.x0, -gz, i.x1, gz]];
  for (const st of i.stairs) {
    const [tx, tz] = st.top, [dx, dz] = st.down;
    const px = tx - 5 * dx, pz = tz - 5 * dz;
    const a: Box = dx !== 0 ? [Math.min(tx, px), tz - ROUTE, Math.max(tx, px), tz + ROUTE] : [tx - ROUTE, Math.min(tz, pz), tx + ROUTE, Math.max(tz, pz)];
    out.push(a, [a[0], Math.min(pz, 0), a[2], Math.max(pz, 0)]);
  }
  const tx = toiletX(i);
  out.push([tx - ROUTE, -i.cw, tx + ROUTE, 0]);
  for (const d of i.exits) {
    const e = i.ends[d.end];
    if (!e) continue;
    const zw = d.s * i.cw;
    out.push([d.x0, Math.min(0, zw), d.x1, Math.max(0, zw)]);
    // The direct line from the gates to the doorway, as a chain of squares.
    const ax = e.g + (e.hi ? 3.8 : -3.8), az = d.s * gz, bx = (d.x0 + d.x1) / 2, bz = d.s * (i.cw - 1);
    const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.5);
    for (let k = 0; k <= n; k++) {
      const x = ax + ((bx - ax) * k) / n, z = az + ((bz - az) * k) / n;
      out.push([x - ROUTE, z - ROUTE, x + ROUTE, z + ROUTE]);
    }
  }
  return out;
}

interface Kind {
  id: string;
  /** Footprints, [along, across]; tried both ways round. */
  sizes: [number, number][];
  /** Share of its length that hides the hall at eye height (a shop block 1, a bench 0). */
  cover: number;
  /** Preference (an island is worth 3 m of hidden hall per unit). */
  w: number;
  max: number;
  build: (r: Box) => boolean;
}

/** The islands an era builds: old lines kiosks, stalls and vending; then shop blocks; new lines large glazed blocks, benches and totems. */
function islandKinds(i: ConcInfo, era: EraClass): Kind[] {
  const pick = <T>(a: T[]): T => a[Math.floor(i.rand() * a.length)];
  const vend = (n: number): [number, number] => [n * 1.05 + 0.8, 1.52];
  const vending = (sizes: [number, number][], w: number, max: number): Kind => ({
    id: 'vending', sizes, cover: 1, w, max,
    build: (r) => vendingIsland(i, ...r, { n: Math.round((Math.max(r[2] - r[0], r[3] - r[1]) - 0.8) / 1.05) }),
  });
  const counter = (brand: Brand, extra: Partial<Exclude<IslandUnit, Brand>> = {}): IslandUnit => ({ brand, front: 'counter', ...extra });
  const soba = () => {
    const brand = pick(brandsOf('soba'));
    return counter(brand, { noren: { color: brand.bg === '#f6efe0' ? '#7a2a12' : brand.bg, text: /うどん/.test(brand.ja) ? 'うどん' : 'そば', fg: '#fff' } });
  };
  if (era === 'old') {
    const body = 'flat:#e3ddd0', height = i.clear;
    return [
      {
        id: 'kiosk', sizes: [[3.6, 2.0], [4.4, 2.2], [5.2, 2.4]], cover: 1, w: 1, max: 3,
        build: (r) => shopIsland(i, ...r, {
          body, height,
          lo: [counter(SHOPS.maruhoshiKiosk)],
          hi: [pick([counter(SHOPS.tsumugian), counter(SHOPS.namima, { awning: true }), counter(SHOPS.minatoya), counter(SHOPS.komeya)])],
        }),
      },
      {
        id: 'stalls', sizes: [[6.4, 2.6]], cover: 1, w: 0.9, max: 2,
        build: (r) => shopIsland(i, ...r, {
          body, height,
          lo: [{ brand: pick(brandsOf('flowers')), front: 'stall', awning: '#2e6b35' }, counter(pick(brandsOf('sweets')))],
          hi: [soba(), counter(pick([SHOPS.maruhoshiKiosk, SHOPS.komeya]))],
        }),
      },
      vending([vend(3), vend(4)], 0.7, 2),
    ];
  }
  if (era === 'mid') {
    return [
      {
        id: 'block', sizes: [[8, 2.8], [9.6, 3.0]], cover: 1, w: 1, max: 3,
        build: (r) => shopIsland(i, ...r, {
          height: 2.85,
          lo: [pick(brandsOf('bakery')), pick([SHOPS.akaneCoffee, SHOPS.nagiCafe, SHOPS.shirasagi])],
          hi: [pick(brandsOf('drugstore')), pick(brandsOf('books'))],
          ends: [i.rand() < 0.5 ? counter(SHOPS.kajitsudo) : null, null],
        }),
      },
      {
        id: 'small', sizes: [[4.4, 2.4], [5.6, 2.6]], cover: 1, w: 0.8, max: 2,
        build: (r) => shopIsland(i, ...r, {
          height: 2.85,
          lo: [pick(brandsOf('conbini'))],
          hi: [pick([counter(pick(brandsOf('sweets'))), { brand: pick(brandsOf('flowers')), front: 'stall' as const, awning: '#2e6b35' }, pick(brandsOf('goods'))])],
        }),
      },
      vending([vend(3)], 0.5, 1),
    ];
  }
  const glass = { height: 2.9, bulkhead: 'panel:#e9e8e2', body: 'flat:#f2f1ec' };
  return [
    {
      id: 'glass', sizes: [[9, 3.0], [10.4, 3.2]], cover: 1, w: 1, max: 3,
      build: (r) => shopIsland(i, ...r, {
        ...glass,
        lo: [pick([SHOPS.shirasagi, SHOPS.nagiCafe, SHOPS.akaneCoffee]), pick(brandsOf('goods'))],
        hi: [pick(brandsOf('drugstore')), pick(brandsOf('books'))],
      }),
    },
    {
      id: 'glass6', sizes: [[5.2, 2.8], [6.4, 3.0]], cover: 1, w: 0.85, max: 2,
      build: (r) => shopIsland(i, ...r, {
        ...glass,
        lo: [pick([...brandsOf('bakery'), SHOPS.nagiCafe])],
        hi: [pick(brandsOf('conbini'))],
        ends: [null, counter(SHOPS.kajitsudo)],
      }),
    },
    {
      id: 'bench', sizes: [[6, 1.8], [4.8, 1.8]], cover: 0.15, w: 1.6, max: 1,
      build: (r) => benchIsland(i, ...r, { color: i.style.accent, tree: true }),
    },
    {
      id: 'totem', sizes: [[4.9, 0.3]], cover: 0.3, w: 0.3, max: 1,
      build: (r) => totemRow(i, ...r, { digital: true, trim: i.line.color }),
    },
    // The waiting room's door faces the middle of the hall.
    ...(i.rand() < 0.5 ? [{
      id: 'waiting', sizes: [[6, 3.0]], cover: 0.1, w: 0.5, max: 1,
      build: (r: Box) => waitingRoom(i, ...r, { door: (r[2] - r[0] >= r[3] - r[1] ? r[1] + r[3] : r[0] + r[2] - i.paid[0] - i.paid[1]) > 0 ? -1 : 1 }),
    } as Kind] : []),
  ];
}

/** Spans merged where they overlap, sorted. */
function union(spans: Span[]): Span[] {
  const out: Span[] = [];
  for (const [p, q] of [...spans].sort((a, c) => a[0] - c[0])) {
    const last = out[out.length - 1];
    if (last && p <= last[1]) last[1] = Math.max(last[1], q);
    else out.push([p, q]);
  }
  return out;
}

/** Lane centres: midway between neighbouring pillar rows. */
function laneMids(i: ConcInfo): number[] {
  const rows = [...new Set(i.pillars.map(([, z]) => Math.round(z * 10) / 10))].sort((a, b) => a - b);
  return rows.slice(1).map((z, k) => (z + rows[k]) / 2);
}

/**
 * Place up to `n` islands of the given kinds inside the x-range `range`, greedily: each where
 * it hides the most hall not yet hidden (at least `minGain` m for a blocking kind once `nMin`
 * are built), preferring the middle of a lane, with a seeded jitter. Returns the footprints built.
 */
function placeIslands(i: ConcInfo, kinds: Kind[], range: Span, n: number, minGain: number, nMin = 0): Box[] {
  if (!kinds.length || n <= 0) return [];
  const blocked = obstacles(i);
  const keep = routes(i).filter((r) => r[2] > range[0] && r[0] < range[1]);
  const mids = laneMids(i);
  // What of the hall's length is already hidden, as sorted, separate spans.
  let cover = union(i.pillars.map(([x]): Span => [x - 0.35, x + 0.35]));
  const placed: Box[] = [], built: Box[] = [];
  const used = new Map<string, number>();
  // Every site that fits before any island is placed: on a 0.5 m grid, and centred in each
  // lane. An island claims only 1 m round itself, so a site 3 m clear of the islands placed
  // since stays free: only that has to be checked again at each step.
  const sites: { ki: number; r: Box; lane: number; key: number }[] = [];
  kinds.forEach((k, ki) => {
    for (const [L, D] of k.sizes) {
      for (const [w, d] of L === D ? [[L, D]] : [[L, D], [D, L]]) {
        const zs = mids.map((m) => m - d / 2);
        for (let z = Math.ceil(-i.cw * 2) / 2; z + d <= i.cw; z += 0.5) zs.push(z);
        for (let x = Math.ceil(range[0] * 2) / 2; x + w <= range[1]; x += 0.5) {
          for (const z of zs) {
            if (z < -i.cw || z + d > i.cw) continue;
            const r: Box = [x, z, x + w, z + d];
            // (A hair over the parts' own 1.2 m margin, so rounding cannot fail them later.)
            if (blocked(grow(r, AISLE)) || keep.some((q) => meets(r, q)) || !i.free(...r, 1.21)) continue;
            let lane = mids.length ? Infinity : 0;
            for (const m of mids) lane = Math.min(lane, Math.abs(m - (z + d / 2)));
            sites.push({ ki, r, lane, key: ki * 7919 + Math.round(x * 2) * 131 + Math.round(z * 2) });
          }
        }
      }
    }
  });
  for (let step = 0; step < n && sites.length; step++) {
    const salt = i.rand() * 100, floor = built.length < nMin ? 0 : minGain;
    let best: { r: Box; k: Kind; score: number } | null = null;
    for (const s of sites) {
      const k = kinds[s.ki], nu = used.get(k.id) ?? 0;
      if (nu >= k.max) continue;
      let gain = s.r[2] - s.r[0];
      for (const [p, q] of cover) gain -= Math.max(0, Math.min(q, s.r[2]) - Math.max(p, s.r[0]));
      gain = k.cover * Math.max(0, gain);
      if (k.cover >= 0.5 && gain < floor) continue;
      const score = gain + 3 * k.w - 2.5 * nu - 0.4 * s.lane + 0.8 * hash(s.key, salt);
      if (best && score <= best.score) continue;
      const g = grow(s.r, AISLE);
      if (placed.some((p) => meets(g, p))) continue;
      best = { r: s.r, k, score };
    }
    if (!best) break;
    placed.push(best.r);
    if (!best.k.build(best.r)) continue;
    built.push(best.r);
    used.set(best.k.id, (used.get(best.k.id) ?? 0) + 1);
    if (best.k.cover >= 0.5) cover = union([...cover, [best.r[0], best.r[2]]]);
  }
  return built;
}

/**
 * Islands in the paid area: 4–10 in an interchange concourse (more in a bigger one), and in a
 * 24 m new-line concourse one bench or vending island where a 3 m aisle remains all round.
 */
function paidIslands(i: ConcInfo, era: EraClass): Box[] {
  if (i.cw >= 14) {
    const n = Math.max(4, Math.min(10, Math.round((2 * i.cw * (i.paid[1] - i.paid[0])) / 230)));
    return placeIslands(i, islandKinds(i, era), i.paid, n, 1.5, n);
  }
  if (i.cw >= 12 && era === 'new') {
    const kinds = islandKinds(i, era).filter((k) => k.id === 'bench');
    kinds.push({ id: 'vending', sizes: [[3 * 1.05 + 0.8, 1.52]], cover: 1, w: 0.5, max: 1, build: (r) => vendingIsland(i, ...r, { n: 3 }) });
    return placeIslands(i, kinds, i.paid, 1, 0);
  }
  return [];
}

/** One small island in each unpaid hall of an interchange, off the routes from the gates to the exits. */
function unpaidIslands(i: ConcInfo, era: EraClass) {
  if (i.cw < 14) return;
  const kinds: Kind[] = era === 'old'
    ? [{ id: 'vending', sizes: [[2 * 1.05 + 0.8, 1.52]], cover: 1, w: 1, max: 1, build: (r) => vendingIsland(i, ...r, { n: 2 }) }]
    : [
      { id: 'bench', sizes: [[4.2, 1.8]], cover: 0, w: 1, max: 1, build: (r) => benchIsland(i, ...r, { color: i.style.accent }) },
      { id: 'totem', sizes: [[4.9, 0.3]], cover: 0, w: 0.8, max: 1, build: (r) => totemRow(i, ...r, { digital: era === 'new', trim: i.line.color }) },
    ];
  for (const e of i.ends) placeIslands(i, kinds, e.hi ? [e.g, i.x1] : [i.x0, e.g], 1, 0);
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

    // Shops and islands first (they decide where the pipes and ducts duck), then the ceiling,
    // benches, the unpaid halls, posters.
    const deep = shops(i, era);
    const isl = paidIslands(i, era);
    if (era === 'old') oldCeiling(i, deep, isl);
    else if (era === 'mid') midCeiling(i);
    islands(i, era);
    unpaidColumns(i, era);
    unpaidIslands(i, era);

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
