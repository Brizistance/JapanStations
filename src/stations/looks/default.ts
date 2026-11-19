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
// An interchange's spine is a long, busy corridor: both walls of the paid area are lined with a
// near-continuous run of shop fronts (at least ~70% of the free wall in every era), punctuated every
// 8-12 m by a staff door, a grille, a hose cabinet or a meter cupboard, and on old lines by the odd
// closed shutter ("Frontage" below). Every stairwell's outer walls get the
// dado and a poster or two; a room off the spine (a transfer bay) gets the dado, posters and a
// ceiling treatment of its era (`bay`). A 24 m new-line concourse gets one small island.

import { hexOf, shade } from '../themes/types';
import {
  adColumn, adPillar, atmCorner, bakery, batten, beam, bench, benchIsland, brandsOf, cableTray, cafe, conbini, cut,
  dressFace, ductRun, endDado, eraClass, eraOf, exitDado, exitHandrails, exitPipes, faceDado, facePosters, flowerStall,
  hash, hoseCabinet, infoWindow, kiosk, kioskStall, lightPanel, lockers, meterCupboard, passageDado, passagePipes,
  passageRails, photoBooth, pipeRun, placeAlong, planter, posterRow, roundPillar, serviceDoor, shopFront,
  SHOPS, sobaStand, STAFF_ROOMS, stairwellFaces, shutter, toiletX, vendingIsland, vendingRow, ventGrille, wallDado, band,
  type Brand, type DadoOpts, type EraClass, type Span, type Wall,
} from './parts';
import type { ConcInfo, Rect, RoomInfo, StationLook, Stairwell, WallFace } from './types';
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

/** An interchange's spine (rooms beyond its walls, or a structure wider than it). */
const isSpine = (i: ConcInfo) => i.rooms.length > 0 || i.footprint > i.cw + 0.5;

/** Footprints of the stairwells standing in the spine (full-height walls: ceiling runs stop at them). */
const spineWells = (i: ConcInfo): Rect[] => i.stairwells.filter((w) => w.room < 0).map((w) => w.footprint);

/** x-ranges where a run along x at z (± half its width) would meet a stairwell. */
const wellsAlongX = (i: ConcInfo, z: number, half: number): Span[] =>
  spineWells(i).filter((f) => z + half > f[1] - 0.05 && z - half < f[3] + 0.05).map((f): Span => [f[0] - 0.1, f[2] + 0.1]);

/** z-ranges where a run along z at x (± half its width) would meet a stairwell. */
const wellsAlongZ = (i: ConcInfo, x: number, half: number): Span[] =>
  spineWells(i).filter((f) => x + half > f[0] - 0.05 && x - half < f[2] + 0.05).map((f): Span => [f[1] - 0.1, f[3] + 0.1]);

/** Does the rectangle reach into (or within 0.05 of) a stairwell? */
const overWell = (i: ConcInfo, x0: number, z0: number, x1: number, z1: number) =>
  spineWells(i).some((f) => x1 > f[0] - 0.05 && x0 < f[2] + 0.05 && z1 > f[1] - 0.05 && z0 < f[3] + 0.05);

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
  // Downstand beams in the paid area, clear of the gate signs and the toilet sign, landing on
  // the stairwell walls where they meet one.
  for (const x of grid(i)) {
    if (x < i.paid[0] || x > i.paid[1] || nearGate(i, x, 4.5) || Math.abs(x - tx) < 1.5) continue;
    for (const [p, q] of cut([-i.cw, i.cw], wellsAlongZ(i, x, 0.2))) beam(i, x, 0.45, { mat: 'flat:#dcd8cc', z0: p, z1: q });
  }
  // A duct down one side and a cable tray down the other, the whole length, broken at the gates
  // and going up into the ceiling where a stairwell stands in the way.
  const gateGaps = i.ends.map((e): Span => [e.g - 4.5, e.g + 4.5]);
  const zr = 0.33 * i.cw + 0.85;
  const zd = clearOfPillars(i, -zr, 0.35), zt = clearOfPillars(i, zr, 0.2);
  ductRun(i, 'x', zd, i.x0, i.x1, top, { gaps: [...gateGaps, ...over(zd, 0.35), ...wellsAlongX(i, zd, 0.35)], rise: [false, false] });
  // (Not in a spine: its walls' pipes and the duct are busy enough, and it keeps the part count down.)
  if (!isSpine(i)) cableTray(i, 'x', zt, i.x0, i.x1, top, { gaps: [...gateGaps, ...over(zt, 0.2), ...wellsAlongX(i, zt, 0.25)] });
  // Pipes along both walls over the paid area, ducking into the ceiling over deep shop fronts
  // and stairwells.
  for (const s of [-1, 1] as const) {
    const a = i.ends.some((e) => !e.hi) ? i.paid[0] + 3.4 : i.x0;
    const c = i.ends.some((e) => e.hi) ? i.paid[1] - 3.4 : i.x1;
    if (c - a < 2) continue;
    pipeRun(i, 'x', s * (i.cw - 0.55), a, c, top, {
      n: s > 0 ? 2 : 3, gaps: [...deep[s > 0 ? 1 : 0], ...wellsAlongX(i, s * (i.cw - 0.55), 0.2)],
      rise: [a > i.x0, c < i.x1],
      mats: s > 0 ? ['paint:#8c949b', 'paint:#b8b2a3'] : ['paint:#b8b2a3', 'paint:#8c949b', 'paint:#a33b2f'],
    });
  }
}

function midCeiling(i: ConcInfo) {
  const top = i.cf + i.clear, rib = 'paint:#ecebe6';
  // Shallow coffers: ribs across on the 4 m grid and along at the edges and between the light rows.
  // The coffer stops at the stairwells (their walls run up to the ceiling).
  for (const x of grid(i)) {
    if (nearGate(i, x, 1.8)) continue;
    for (const [p, q] of cut([-(i.cw - 0.7), i.cw - 0.7], wellsAlongZ(i, x, 0.12))) i.b.deco(rib, x - 0.12, top - 0.12, p, x + 0.12, top, q);
  }
  const gaps = i.ends.map((e): Span => [e.g - 1.8, e.g + 1.8]);
  for (const z of [0.55 * i.cw, -0.55 * i.cw, i.cw - 0.7, -(i.cw - 0.7)]) {
    const zc = Math.abs(z) < i.cw - 1 ? clearOfPillars(i, z, 0.1) : z;
    for (const [p, q] of cut([i.x0 + 0.7, i.x1 - 0.7], [...gaps, ...wellsAlongX(i, zc, 0.1)])) i.b.deco(rib, p, top - 0.12, zc - 0.1, q, top, zc + 0.1);
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

/**
 * Choose and place 3–7 wall items (at a spine: its anchors, the rest is `frontage`). Returns the
 * x-ranges of deep fronts per wall ([−z, +z]).
 */
function shops(i: ConcInfo, era: EraClass): Span[][] {
  const C = catalogue(i);
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
  // At a spine the frontage fills the walls with shops: here only the anchors and a few machines.
  if (isSpine(i)) {
    if (era !== 'old') must.push(C.vending());
    pool = [C.lockers(), C.atm(), C.photo(), C.lost()];
    extra = 1;
  }
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

/**
 * Benches (and on new lines planters) in the pillar lines, midway between pillars, paid area only.
 * Not in a spine: there the lanes between the pillars and the shop fronts are walking room.
 */
function islands(i: ConcInfo, era: EraClass) {
  if (era === 'old' || isSpine(i)) return;
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
  // A kiosk island in a wide new or mid concourse.
  if (i.cw >= 10 && i.rand() < 0.45) {
    const xs = shuffle(i, Array.from({ length: Math.max(0, Math.floor(i.paid[1] - i.paid[0] - 10)) }, (_, k) => i.paid[0] + 5 + k));
    for (const x of xs) if (kiosk(i, x, 0, { w: 3, d: 1.6, brand: era === 'new' ? SHOPS.kajitsudo : SHOPS.maruhoshiKiosk, margin: 1.6 })) break;
  }
}

// ── An island in a wide concourse ────────────────────────────────────────────────────────────
//
// A 24 m new-line concourse gets one island in the paid area. It keeps a clear aisle of 3 m
// all round (pillars may stand in it) and stays off the main routes, and is placed greedily
// where it hides the most of the hall: a sight line across the hall is a line along z, so what
// counts is how much of the hall's length (x) is not yet behind an island or a pillar.

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
 * In a 24 m new-line concourse, one bench-and-planter or vending island in the paid area where
 * a 3 m aisle remains all round. (Interchanges are spines now: no islands.)
 */
function paidIslands(i: ConcInfo, era: EraClass): Box[] {
  if (i.cw < 12 || era !== 'new' || isSpine(i)) return [];
  const kinds: Kind[] = [
    { id: 'bench', sizes: [[6, 1.8], [4.8, 1.8]], cover: 0.15, w: 1.6, max: 1, build: (r) => benchIsland(i, ...r, { color: i.style.accent, tree: true }) },
    { id: 'vending', sizes: [[3 * 1.05 + 0.8, 1.52]], cover: 1, w: 0.5, max: 1, build: (r) => vendingIsland(i, ...r, { n: 3 }) },
  ];
  return placeIslands(i, kinds, i.paid, 1, 0);
}

/** An advert column in each unpaid hall, between the exits and the gates (mid and new). */
function unpaidColumns(i: ConcInfo, era: EraClass) {
  if (era === 'old' || i.cw < 10) return;
  i.ends.forEach((e, k) => adColumn(i, e.g + (e.hi ? 7.5 : -7.5), 0, { half: 0.4, margin: 2.4, mat: 'panel:#e9e8e2', trim: i.line.color, v: k * 4 }));
}

// ── Frontage: an interchange spine's shop walls ──────────────────────────────────────────────
//
// The spine is the station's shopping street now. Wherever its two long walls are free in the
// paid area they carry a near-continuous run of shop fronts, never entered, with the station's
// service elements as punctuation: about one per 8-12 m (a hose cabinet first on each wall), and
// wherever a leftover under 2.4 m is too short for a shop. The eras differ in the KIND of unit,
// not in how much wall is shop: old lines have many small units (counters, stalls, noren), a
// closed shutter at most once per 15 m, meter cupboards; mid: medium glazed units; new: long,
// clean glazed fronts and flush service doors. Shops stand out 0.3 … 1.2 m; service elements 0.12 m.

/** Kinds that trade over a counter rather than through a glazed front. */
const COUNTER_KINDS = new Set(['soba', 'bento', 'sweets', 'kiosk']);

/** Brands of the frontage by era (the anchors from `shops` bring the conbini, kiosk or big café). */
function frontBrands(era: EraClass): Brand[] {
  const S = SHOPS;
  if (era === 'old') {
    return [S.sobaKita, S.udonKawanami, S.minatoya, S.komeya, S.tsumugian, S.namima, S.ginnando, S.yanagiFlowers,
      S.bakeryKomugi, S.hibariPharmacy, S.kawasemi, S.tanpopo, S.ryubundo, S.tsubameya];
  }
  if (era === 'mid') {
    return [S.bakeryKomugi, S.hinataBakery, S.akaneCoffee, S.kajitsudo, S.hibariPharmacy, S.minamoDrug, S.ryubundo,
      S.kawaminatodo, S.sorano, S.tsumugian, S.ginnando, S.kawasemi, S.tanpopo, S.mizuha, S.hanaNoMinato, S.sobaMio];
  }
  return [S.shirasagi, S.sorano, S.kawaminatodo, S.mizuha, S.minamoDrug, S.tsubakiShobo, S.hinataBakery, S.kajitsudo,
    S.hanaNoMinato, S.kawasemi, S.ginnando];
}

/** Stretches of long wall `s` within x0 … x1 whose wall strip is still free, merged at 0.25 m. */
function wallRuns(i: ConcInfo, s: Wall, x0: number, x1: number): Span[] {
  const [za, zb] = band(i, s, 0, 0.15);
  const out: Span[] = [];
  for (let x = x0; x + 0.25 <= x1 + 1e-6; x += 0.25) {
    if (!i.free(x, za, x + 0.25, zb)) continue;
    const last = out[out.length - 1];
    if (last && Math.abs(last[1] - x) < 1e-6) last[1] = x + 0.25;
    else out.push([x, x + 0.25]);
  }
  return out.filter(([p, q]) => q - p >= 0.7);
}

/** Staff door finishes by era: painted steel on old lines, flush panels on new ones. */
const doorStyle = (era: EraClass) =>
  era === 'old' ? { color: 'paint:#b9bba9', frame: 'paint:#6f7568' } : era === 'mid' ? { color: 'paint:#c9ccd0', frame: 'metal:#8f959c' } : { color: 'paint:#dfe1e3', frame: 'metal:#c3c7cb' };

/**
 * One shop front in the frontage at x0, `w` long: a counter, stall or glazed front by kind,
 * falling back to a shallow glazed front where a deep one does not fit. Returns its depth, or 0.
 */
function frontShop(i: ConcInfo, era: EraClass, s: Wall, x0: number, w: number, brand: Brand): number {
  const x1 = x0 + w, lite = true;
  const tries: [number, () => boolean][] = [];
  const glazed = (depth: number) => () => shopFront(i, {
    s, x0, x1, brand, depth, lite, front: 'glazed', door: w >= 2.4 ? (i.rand() < 0.5 ? x0 + 0.75 : x1 - 0.75) : false,
    awning: brand.kind === 'bakery' && era !== 'new',
  });
  if (brand.kind === 'flowers') tries.push([1.2, () => shopFront(i, { s, x0, x1, brand, depth: 1.2, lite, front: 'stall', awning: '#2e6b35', clear: 1.0 })]);
  else if (COUNTER_KINDS.has(brand.kind) || brand === SHOPS.kajitsudo) {
    const soba = brand.kind === 'soba';
    tries.push([1.0, () => shopFront(i, {
      s, x0, x1, brand, depth: 1.0, lite, front: 'counter', clear: 1.0, body: soba ? 'wood:#7a5a3a' : undefined,
      awning: brand === SHOPS.namima || (era === 'old' && brand.kind === 'sweets'),
      noren: soba || brand.kind === 'bento' ? { color: brand.bg === '#f6efe0' || brand.bg === '#f4efe2' ? '#7a2a12' : brand.bg, text: /うどん/.test(brand.ja) ? 'うどん' : soba ? 'そば' : undefined, fg: '#fff' } : undefined,
    })]);
    // (Old lines keep glazed fronts shallow, so the pipes along the wall run on over them.)
  } else if (era === 'mid') tries.push([0.45, glazed(0.45)]);
  tries.push([0.3, glazed(0.3)]);
  // Opposite a pillar the lane between it and the shop must stay 2.4 m wide.
  const lane = (d: number) => i.pillars.every(([px, pz]) => Math.sign(pz) !== s || px < x0 - 0.35 || px > x1 + 0.35 || i.cw - d - (Math.abs(pz) + 0.35) >= 2.4);
  for (const [d, go] of tries) if (lane(d) && go()) return d;
  return 0;
}

/**
 * One service element at x0 on wall `s` in at most `room` m: picked by the era's weights (a
 * hose cabinet first if the wall has none yet; no closed shutter unless `shutterOk`). Returns the
 * length it took, or 0.
 */
function frontService(i: ConcInfo, era: EraClass, s: Wall, x0: number, room: number, needHose: boolean, brands: Brand[], check = true, shutterOk = true): { w: number; id: string } {
  const D = { ...doorStyle(era), check };
  const label = () => (i.rand() < (era === 'old' ? 0.5 : 0.8) ? STAFF_ROOMS[Math.floor(i.rand() * STAFF_ROOMS.length)] : null);
  const sw = Math.min(room, 2.4 + Math.floor(i.rand() * 3) * 0.6);
  const W = era === 'old' ? { shutter: 3, door: 2.5, door2: 1, meter: 1.5, hose: 1.2, vent: 1 }
    : era === 'mid' ? { shutter: 2, door: 3, door2: 1, meter: 1, hose: 1.5, vent: 1.2 }
      : { shutter: 0.8, door: 3, door2: 1.5, meter: 0.4, hose: 1.5, vent: 1.5 };
  const shut = () => {
    const r = i.rand();
    const o = era === 'old' ? (r < 0.5 ? { brand: brands[Math.floor(i.rand() * brands.length)] } : r < 0.8 ? { lease: true } : {})
      : r < 0.4 ? { brand: brands[Math.floor(i.rand() * brands.length)] } : { lease: true };
    return shutter(i, s, x0, x0 + sw, { ...o, check, body: era === 'new' ? 'flat:#f2f1ec' : undefined });
  };
  const all = [
    { id: 'shutter', w: sw, wt: W.shutter, go: shut },
    { id: 'door', w: 1.16, wt: W.door, go: () => serviceDoor(i, s, x0, { ...D, label: label() }) },
    { id: 'door', w: 1.96, wt: W.door2, go: () => serviceDoor(i, s, x0, { ...D, leaves: 2, label: label() }) },
    { id: 'meter', w: 0.9, wt: W.meter, go: () => meterCupboard(i, s, x0, { check }) },
    { id: 'hose', w: 0.75, wt: needHose ? 20 : W.hose, go: () => hoseCabinet(i, s, x0, { check }) },
    { id: 'vent', w: 1.0, wt: W.vent, go: () => ventGrille(i, s, x0, { check, y: era === 'new' ? 0.2 : 0.25, h: era === 'old' ? 0.6 : 0.45 }) },
  ];
  let list = all.filter((c) => c.w <= room + 1e-6 && (c.id !== 'shutter' || (sw >= 2.4 && shutterOk)));
  while (list.length) {
    let r = i.rand() * list.reduce((a, c) => a + c.wt, 0), k = 0;
    while (k < list.length - 1 && r >= list[k].wt) r -= list[k++].wt;
    const c = list[k];
    if (c.go()) return { w: c.w, id: c.id };
    list = list.filter((q) => q !== c);
  }
  return { w: 0, id: '' };
}

/** The floor in front of a stairwell's portal that must stay clear: 3.3 m out, a metre wider each side than the opening. */
function approach(w: Stairwell): Rect {
  const [px, pz] = w.portal.at, [nx, nz] = w.portal.n, hw = w.portal.w / 2 + 1;
  const a = nx ? px : pz, c = a + (nx || nz) * 3.3;
  return nx ? [Math.min(a, c), pz - hw, Math.max(a, c), pz + hw] : [px - hw, Math.min(a, c), px + hw, Math.max(a, c)];
}

/**
 * Stretches of long wall `s` in the paid area that `free()` refuses only for floor that does not
 * concern the wall itself: reservations round a stair's landing (a bay stairwell's clearance, the
 * floor kept round a spine stair's end, the guidance laid to its portal). The spine floor in front
 * is open. Nothing solid may go there, but flat service elements may. Kept clear of everything
 * else `free()` guards that we can see: stairwells, the floor in front of every portal, mouths and
 * doorways, gates, toilets, pillars. (Anything claimed was claimed on free floor, never on a landing.)
 */
function shadowRuns(i: ConcInfo, s: Wall): Span[] {
  const landing = (h: Rect): Rect => [h[0] - 3, h[1] - 0.9, h[2] + 3, h[3] + 0.9];
  const harmless = i.stairwells.map((w) => landing(w.stair.rect));
  const harmful = [...i.stairwells.map(approach), ...spineWells(i).map((f): Rect => [f[0] - 0.3, f[1] - 0.3, f[2] + 0.3, f[3] + 0.3])];
  const [za, zb] = band(i, s, 0, 0.8), [sa, sb] = band(i, s, 0, 0.15);
  const meets = (r: Rect, x0: number, x1: number) => x1 > r[0] && x0 < r[2] && zb > r[1] && za < r[3];
  const out: Span[] = [];
  for (let x = i.paid[0]; x + 0.25 <= i.paid[1] + 1e-6; x += 0.25) {
    const x1 = x + 0.25;
    if (i.free(x, sa, x1, sb) || !harmless.some((r) => meets(r, x, x1)) || harmful.some((r) => meets(r, x, x1))) continue;
    if (i.openings.some((o) => o.s === s && x1 > o.x0 - 0.5 && x < o.x1 + 0.5) || i.ends.some((e) => x1 > e.g - 3.8 && x < e.g + 3.8)) continue;
    if ((s < 0 && x1 > i.toilets - 1.8 && x < i.toilets + 1.8) || i.pillars.some(([px, pz]) => meets([px - 0.6, pz - 0.6, px + 0.6, pz + 0.6], x, x1))) continue;
    const last = out[out.length - 1];
    if (last && Math.abs(last[1] - x) < 1e-6) last[1] = x1;
    else out.push([x, x1]);
  }
  return out.filter(([p, q]) => q - p >= 0.8);
}

/**
 * Line both walls of a spine's paid area with shop fronts, punctuated by service elements. Adds
 * deep fronts to `deep`.
 *
 * Along each free run the units are shops back to back. A service element is put in only when
 * (a) the shops since the last one add up to 8-12 m (the first, a hose cabinet, after 3-9 m),
 * (b) what is left is too short for a shop (under 2.4 m), or (c) a shop did not fit there. A
 * shop takes up any leftover that could not hold another shop, so runs end in a shop, not a
 * stub. A closed shutter keeps at least 15 m (old lines) from the next on its wall.
 */
function frontage(i: ConcInfo, era: EraClass, deep: Span[][]) {
  const brands = shuffle(i, frontBrands(era));
  let bk = 0;
  const widths = era === 'old' ? [2.4, 3.0, 3.6, 3.6] : era === 'mid' ? [3.0, 3.6, 4.2, 4.8] : [4.8, 5.4, 6.0];
  const wMax = widths[widths.length - 1];
  const gap = era === 'old' ? 0.12 : 0.2;
  const shutterGap = era === 'old' ? 15 : era === 'mid' ? 25 : 40;
  for (const s of [-1, 1] as const) {
    let hose = 0;
    const shutters: number[] = [];
    const canShut = (x: number) => shutters.every((p) => Math.abs(p - x) >= shutterGap);
    // Shop length since the last service element, and how much puts the next one in.
    let since = 0, next = 3 + i.rand() * 6;
    const service = (u: number, room: number, check: boolean) => {
      const r = frontService(i, era, s, u, room, hose === 0, brands, check, canShut(u));
      if (r.id === 'hose') hose++;
      if (r.id === 'shutter') shutters.push(u);
      return r;
    };
    for (const [a, c] of wallRuns(i, s, i.paid[0], i.paid[1])) {
      let u = a + 0.05;
      while (c - u >= 0.75) {
        const room = c - u - 0.05;
        let used = 0;
        if (room < 2.4 || since >= next) {
          const r = service(u, room, true);
          if (r.w) {
            used = r.w;
            since = 0;
            next = 8 + i.rand() * 4;
          }
        }
        if (!used && room >= 2.4) {
          let w = Math.min(room, widths[Math.floor(i.rand() * widths.length)]);
          // Never leave a stub too short for a shop: take it, or leave room for another shop.
          if (room - w < 2.4) w = room <= w + 1.5 && room <= wMax + 1.5 ? room : Math.max(2.4, room - 2.4);
          const brand = brands[bk % brands.length];
          const d = frontShop(i, era, s, u, w, brand);
          if (d) {
            bk++;
            used = w;
            since += w;
            if (d > 0.38) deep[s > 0 ? 1 : 0].push([u - 0.15, u + w + 0.15]);
          }
        }
        if (!used) {
          // A shop did not fit: a service element in its place.
          const r = service(u, room, true);
          if (r.w) {
            used = r.w;
            since = 0;
            next = 8 + i.rand() * 4;
          }
        }
        u += used ? used + gap : 0.5;
      }
    }
    // Where `free()` refuses the floor beside a stair's landing: flat service elements only
    // (closed shutters, staff doors; nothing solid).
    for (const [a, c] of shadowRuns(i, s)) {
      let u = a + 0.1;
      while (c - u >= 0.8) {
        const r = service(u, c - u - 0.1, false);
        if (r.w) {
          const [za, zb] = band(i, s, 0, 0.15);
          i.claim(u, za, u + r.w, zb);
        }
        u += r.w ? r.w + gap : 0.5;
      }
    }
  }
}

/** Ordinary stations: a staff door and a hose cabinet on each wall, a meter cupboard on older lines. */
function serviceWalls(i: ConcInfo, era: EraClass) {
  const D = doorStyle(era);
  for (const s of [-1, 1] as const) {
    const label = STAFF_ROOMS[Math.floor(i.rand() * STAFF_ROOMS.length)];
    placeAlong(i, 1.3, (w, x) => serviceDoor(i, w, x, { ...D, label: era === 'old' && i.rand() < 0.5 ? null : label }), [i.paid], [s]);
    placeAlong(i, 0.85, (w, x) => hoseCabinet(i, w, x), [i.paid], [s]);
    if (era !== 'new' && i.rand() < 0.5) placeAlong(i, 1.0, (w, x) => meterCupboard(i, w, x), [i.paid], [s]);
  }
}

// ── Stairwells and rooms ─────────────────────────────────────────────────────────────────────

/**
 * The outer walls of every stairwell in the spine: the long walls' dado, a poster or two on the
 * long faces (kept off the portal's jambs), a framed poster on the closed end and, where the
 * floor allows, a bench against it.
 */
function dressWells(i: ConcInfo, era: EraClass, P: DadoOpts) {
  const digital = era === 'new';
  let v = i.station.id.length * 3;
  for (const w of i.stairwells) {
    if (w.room >= 0) continue;
    for (const f of stairwellFaces(i, w)) {
      const len = f.u1 - f.u0;
      faceDado(i, f, P);
      if (f.end) {
        facePosters(i, f, { pitch: 1.9, max: len >= 3.6 ? 2 : 1, v0: v++, digital });
        if (len >= 2.6) endBench(i, f, era);
      } else facePosters(i, f, { pitch: era === 'old' ? 2.6 : era === 'mid' ? 3.6 : 4.8, max: 2, v0: v++, digital, margin: 0.5 });
    }
  }
}

/** A bench along a stairwell's closed end, 0.35 m off it, if the floor there and 1.2 m in front is free. */
function endBench(i: ConcInfo, f: WallFace, era: EraClass) {
  const um = (f.u0 + f.u1) / 2, [x0, z0] = f.axis === 'x' ? [um - 0.9, f.at + f.n * 0.35] : [f.at + f.n * 0.35, um - 0.9];
  const [x1, z1] = f.axis === 'x' ? [um + 0.9, f.at + f.n * 2.05] : [f.at + f.n * 2.05, um + 0.9];
  if (!i.free(Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1))) return;
  const c = f.at + f.n * 0.6;
  bench(i, f.axis === 'x' ? um : c, f.axis === 'x' ? c : um, { axis: f.axis, len: 1.8, margin: 0, color: era === 'old' ? '#8a6a48' : i.style.accent });
}

/** Spans along face `f` (of a room) that run beside a stair opening or a portal. */
function faceGaps(f: WallFace, holes: Rect[], wells: Stairwell[]): Span[] {
  const portals = wells.map(({ portal: { fascia: p } }): Rect => {
    const a = p.at, c = p.at - p.n * 0.35;
    return p.axis === 'x' ? [p.u0, Math.min(a, c), p.u1, Math.max(a, c)] : [Math.min(a, c), p.u0, Math.max(a, c), p.u1];
  });
  const near = (r: Rect, x: number, z: number, m: number) => x > r[0] - m && x < r[2] + m && z > r[1] - m && z < r[3] + m;
  const out: Span[] = [];
  for (let u = f.u0 + 0.125; u < f.u1; u += 0.25) {
    const [x, z] = f.axis === 'x' ? [u, f.at + f.n * 0.3] : [f.at + f.n * 0.3, u];
    if (!holes.some((h) => near(h, x, z, 0.15)) && !portals.some((p) => near(p, x, z, 0.4))) continue;
    const last = out[out.length - 1];
    if (last && Math.abs(last[1] - (u - 0.125)) < 1e-6) last[1] = u + 0.125;
    else out.push([u - 0.125, u + 0.125]);
  }
  return out;
}

/** The part of a room not taken by its stairwells: the largest rectangle left beside each. */
function lobbyOf(r: RoomInfo, wells: Stairwell[]): Rect {
  let L: Rect = [...r.rect];
  for (const { footprint: f } of wells) {
    if (f[2] <= L[0] || f[0] >= L[2] || f[3] <= L[1] || f[1] >= L[3]) continue;
    const opts: Rect[] = [[L[0], L[1], f[0], L[3]], [f[2], L[1], L[2], L[3]], [L[0], L[1], L[2], f[1]], [L[0], f[3], L[2], L[3]]];
    L = opts.reduce((p, q) => (Math.max(0, q[2] - q[0]) * Math.max(0, q[3] - q[1]) > Math.max(0, p[2] - p[0]) * Math.max(0, p[3] - p[1]) ? q : p));
  }
  return L;
}

/**
 * A room's ceiling treatment over its lobby (clear of the stairwell and its fascia): old lines a
 * pipe bundle along one side and a downstand beam across; mid a coffer frame; new a light cove
 * along both long sides. The kit's own lights run down the middle.
 */
function roomCeiling(r: RoomInfo, era: EraClass, L: Rect) {
  const top = r.cf + r.clear, { b } = r;
  const ax = L[2] - L[0] >= L[3] - L[1] ? 'x' : 'z';
  const [a0, a1, c0, c1] = ax === 'x' ? [L[0], L[2], L[1], L[3]] : [L[1], L[3], L[0], L[2]];
  if (a1 - a0 < 1.5 || c1 - c0 < 1.5) return;
  const run = (mat: string, at: number, half: number, y0: number, y1: number, p = a0, q = a1) =>
    ax === 'x' ? b.deco(mat, p, y0, at - half, q, y1, at + half) : b.deco(mat, at - half, y0, p, at + half, y1, q);
  const across = (mat: string, at: number, half: number, y0: number, y1: number) =>
    ax === 'x' ? b.deco(mat, at - half, y0, c0, at + half, y1, c1) : b.deco(mat, c0, y0, at - half, c1, y1, at + half);
  if (era === 'old') {
    pipeRun(r, ax, c0 + 0.45, a0 + 0.05, a1 - 0.05, top, { n: 2, rise: [false, false], mats: ['paint:#b8b2a3', 'paint:#8c949b'] });
    if (a1 - a0 >= 3) across('flat:#dcd8cc', (a0 + a1) / 2, 0.2, top - 0.4, top);
  } else if (era === 'mid') {
    for (const at of [c0 + 0.6, c1 - 0.6]) run('paint:#ecebe6', at, 0.1, top - 0.12, top, a0 + 0.5, a1 - 0.5);
    for (const at of [a0 + 0.5, a1 - 0.5]) across('paint:#ecebe6', at, 0.1, top - 0.12, top);
  } else {
    for (const at of [c0 + 0.3, c1 - 0.3]) {
      run('paint:#e6e5e0', at, 0.1, top - 0.015, top, a0 + 0.2, a1 - 0.2);
      run('light', at, 0.06, top - 0.025, top - 0.015, a0 + 0.25, a1 - 0.25);
    }
  }
}

// ── The look ─────────────────────────────────────────────────────────────────────────────────

export const defaultLook: StationLook = {
  posters: false,
  skirting: false,

  lights(i) {
    const era = eraClass(i.era), top = i.cf + i.clear;
    const rows = lightRows(i, era);
    if (era === 'new') {
      // Continuous light slots, broken only where a pillar or a stairwell meets them.
      for (const z of rows) {
        const gaps = i.pillars.filter(([, pz]) => Math.abs(pz - z) < 0.6).map(([px]): Span => [px - 0.6, px + 0.6]);
        for (const [p, q] of cut([i.x0 + 0.6, i.x1 - 0.6], [...gaps, ...wellsAlongX(i, z, 0.11)])) {
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
        if (overWell(i, c - 1.3, z - 0.3, c + 1.3, z + 0.3)) continue;
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

    // Stairwells first (their walls get the same dado), then shops, the spine's frontage or the
    // service doors, and islands (they decide where the pipes and ducts duck), then the ceiling,
    // benches, the unpaid halls, posters.
    dressWells(i, era, P);
    const deep = shops(i, era);
    if (isSpine(i)) frontage(i, era, deep);
    else serviceWalls(i, era);
    const isl = paidIslands(i, era);
    if (era === 'old') oldCeiling(i, deep, isl);
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

  bay(r) {
    const era = eraClass(r.era), P = palette(r.style, era);
    const wells = r.conc.stairwells.filter((w) => w.room === r.index);
    const holes = r.stairs.map((s) => s.rect);
    // Dado and trim on every face, bare beside the stair opening and the portal; up to two
    // posters on the longest clear stretches.
    let left = 2, v = r.index * 3 + r.station.id.length;
    const faces = [...r.faces].sort((p, q) => q.u1 - q.u0 - (p.u1 - p.u0));
    for (const f of faces) {
      const gaps = faceGaps(f, holes, wells);
      const n = dressFace(r, f, { ...P, gaps, posters: left > 0 ? { pitch: era === 'old' ? 2.4 : 3.6, max: left, v0: v, digital: era === 'new', margin: 0.5 } : false });
      left -= n;
      v += n;
    }
    roomCeiling(r, era, lobbyOf(r, wells));
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
