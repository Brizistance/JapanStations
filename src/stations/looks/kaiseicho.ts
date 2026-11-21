// Station look: Kaiseichō (開成町, Y-17), Yanagisuji Line. The station under the Meiji school town.
//
// The ticket hall is dressed as a Meiji school hall: red brick walls over an oak wainscot with a
// white stone cap, white stone bands, square brick piers with stone quoins and caps, a timber
// coffered ceiling with green enamel school lamps, a big wooden-cased school clock hung by the
// gates, notice boards of club posters and a chalk timetable board, wooden school benches, and
// Kaiseidō Stationery & Old Books, which you can walk into where the ground behind the wall is free
// (bookshelves, a counter with a case of fountain pens, a reading bench). On the platform: ginkgo
// leaf mosaics in gold on green and cream, and the school's crest. Each exit its own: a brick arch
// with a stone keystone (1), stone school gateposts under a copper roof (2).

import { groundFree, shell, type FrontFace } from '../shopfronts';
import type { HallInfo } from '../themes/types';
import {
  band, bench, cut, endDado, exitDado, exitHandrails, passageDado, passageRails, wallDado, wbox,
  type Brand, type DadoOpts, type Span, type Wall,
} from './parts';
import type { ConcInfo, ExitInfo, Rect, Stairwell, StationLook } from './types';

// ── Palette ──────────────────────────────────────────────────────────────────────────────────

const BRICK = 'brick:#a4553e';
const BRICK_DK = 'brick:#8a4532';
const STONE = 'paint:#e4dccb';
const STONE_DK = 'paint:#bcb3a1';
const OAK = 'wood:#8a6440';
const OAK_DK = 'wood:#5a3f2a';
const SCHOOL_GREEN = 'paint:#1f3d2e';
const IRON = 'flat:#26292b';
const GLOW = 'glow:#fff1d0';
const WHITE = 'flat:#f4f1e6';

const DADO: DadoOpts = { mat: OAK, top: 1.1, cap: STONE, skirting: OAK_DK, frieze: STONE, friezeY: [2.3, 2.4] };

// ── Helpers ──────────────────────────────────────────────────────────────────────────────────

const zAt = (i: ConcInfo, s: Wall, d: number) => s * (i.cw - d);
function wmesh(i: ConcInfo, s: Wall, mat: string, shape: 'cyl' | 'sphere' | 'cone', x: number, y: number, d: number, sx: number, sy: number, sd: number) {
  i.b.mesh(mat, shape, x, y, zAt(i, s, d), sx, sy, sd);
}
const hallWells = (i: ConcInfo): Stairwell[] => i.stairwells.filter((w) => w.room < 0);
function approach(w: Stairwell): Rect {
  const [px, pz] = w.portal.at, [nx, nz] = w.portal.n, hw = w.portal.w / 2 + 1;
  const a = nx ? px : pz, c = a + (nx || nz) * 3;
  return nx ? [Math.min(a, c), pz - hw, Math.max(a, c), pz + hw] : [px - hw, Math.min(a, c), px + hw, Math.max(a, c)];
}
const nearWell = (i: ConcInfo, x0: number, z0: number, x1: number, z1: number, m = 0) =>
  [...hallWells(i).map((w) => w.footprint), ...hallWells(i).map(approach)].some((r) => x1 + m > r[0] && x0 - m < r[2] && z1 + m > r[1] && z0 - m < r[3]);
const wellGapsAt = (i: ConcInfo, x: number): Span[] =>
  hallWells(i).filter((w) => x > w.footprint[0] - 0.1 && x < w.footprint[2] + 0.1).map((w): Span => [w.footprint[1] - 0.03, w.footprint[3] + 0.03]);
const wellGapsAlong = (i: ConcInfo, z: number): Span[] =>
  hallWells(i).filter((w) => z > w.footprint[1] - 0.1 && z < w.footprint[3] + 0.1).map((w): Span => [w.footprint[0] - 0.03, w.footprint[2] + 0.03]);

// ── Ceiling: timber coffers and school lamps ─────────────────────────────────────────────────

/** Coffer grid pitch along x, and the z lines of the beams. */
const PITCH = 2.4;
const beamZs = (i: ConcInfo) => [-i.cw, -i.cw / 3, i.cw / 3, i.cw].map((z) => Math.max(-i.cw + 0.1, Math.min(i.cw - 0.1, z)));

function coffers(i: ConcInfo) {
  const { b } = i, top = i.cf + i.clear;
  const gateGaps: Span[] = i.ends.map((e): Span => [e.g - 1.2, e.g + 1.2]);
  // Beams across the hall every PITCH, and along it on the third lines, stopping at the stairwells.
  for (let x = i.x0 + PITCH; x < i.x1 - 0.3; x += PITCH) {
    if (i.ends.some((e) => Math.abs(x - e.g) < 1.2)) continue;
    for (const [p, q] of cut([-i.cw, i.cw], wellGapsAt(i, x))) {
      b.deco(OAK_DK, x - 0.09, top - 0.2, p, x + 0.09, top, q);
      b.deco(OAK, x - 0.12, top - 0.24, p, x + 0.12, top - 0.2, q);
    }
  }
  for (const z of beamZs(i).slice(1, -1)) {
    for (const [p, q] of cut([i.x0, i.x1], [...wellGapsAlong(i, z), ...gateGaps])) {
      b.deco(OAK_DK, p, top - 0.2, z - 0.09, q, top, z + 0.09);
      b.deco(OAK, p, top - 0.24, z - 0.12, q, top - 0.2, z + 0.12);
    }
  }
}

/** x of the lamp rows: the middle of each coffer, clear of the gates and the hung clocks. */
function lampXs(i: ConcInfo): number[] {
  const out: number[] = [];
  for (let x = i.x0 + PITCH * 1.5; x < i.x1 - 0.8; x += PITCH) {
    if (i.ends.some((e) => Math.abs(x - e.g) < 2.2 || Math.abs(x - (e.hi ? e.g - 1.6 : e.g + 1.6)) < 1.0)) continue;
    out.push(x);
  }
  return out;
}

/** A green enamel school lamp on a stem: a shallow cone shade over a frosted bulb. */
function schoolLamp(i: ConcInfo, x: number, z: number) {
  const { b, cf } = i, top = cf + i.clear;
  b.deco(IRON, x - 0.012, cf + 2.62, z - 0.012, x + 0.012, top - 0.2, z + 0.012);
  b.mesh(SCHOOL_GREEN, 'cone', x, cf + 2.55, z, 0.5, 0.18, 0.5);
  b.mesh(WHITE, 'cyl', x, cf + 2.47, z, 0.46, 0.02, 0.46);
  b.mesh(GLOW, 'sphere', x, cf + 2.43, z, 0.2, 0.16, 0.2);
}

/** The school clock hung by a gate line: an octagonal wooden case, faces both ways, a pendulum box. */
function schoolClock(i: ConcInfo, x: number, z: number) {
  const { b, cf } = i, top = cf + i.clear;
  for (const dz of [-0.35, 0.35]) b.deco(IRON, x - 0.01, cf + 2.68, z + dz - 0.01, x + 0.01, top, z + dz + 0.01);
  b.deco(OAK_DK, x - 0.09, cf + 2.04, z - 0.42, x + 0.09, cf + 2.7, z + 0.42);
  b.deco(OAK_DK, x - 0.09, cf + 2.12, z - 0.48, x + 0.09, cf + 2.62, z + 0.48);
  b.deco(OAK, x - 0.07, cf + 1.62, z - 0.2, x + 0.07, cf + 2.04, z + 0.2);
  b.deco('metal:#c9a227', x - 0.075, cf + 1.7, z - 0.03, x + 0.075, cf + 1.95, z + 0.03);
  for (const f of [-1, 1] as const) b.sign({ k: 'clock' }, x + f * 0.095, cf + 2.37, z, [f, 0], 0.56, 0.56);
}

// ── Notice boards ────────────────────────────────────────────────────────────────────────────

/** Club posters (blank papers in bright colours) on cork in an oak frame, 1.8 long. */
function clubBoard(i: ConcInfo, s: Wall, x0: number): boolean {
  const [za, zb] = band(i, s, 0, 0.35);
  if (!i.free(x0, za, x0 + 1.8, zb)) return false;
  const [ca, cb] = band(i, s, 0, 0.05);
  i.claim(x0, ca, x0 + 1.8, cb);
  const { b, cf } = i;
  wbox(i, s, OAK_DK, x0, x0 + 1.8, cf + 1.2, cf + 2.15, 0.008, 0.045);
  wbox(i, s, 'flat:#c49a64', x0 + 0.06, x0 + 1.74, cf + 1.26, cf + 2.09, 0.045, 0.05);
  const papers: [number, number, number, number, string][] = [
    [0.12, 1.6, 0.52, 2.04, 'flat:#e84a6f'], [0.6, 1.32, 0.98, 1.84, 'flat:#3c7dc4'], [1.06, 1.58, 1.62, 2.02, 'flat:#f2c14e'],
    [0.14, 1.3, 0.5, 1.54, WHITE], [1.08, 1.3, 1.62, 1.52, 'flat:#6aa84f'], [0.62, 1.9, 0.96, 2.05, WHITE],
  ];
  for (const [p, y0, q, y1, mat] of papers) wbox(i, s, mat, x0 + p, x0 + q, cf + y0, cf + y1, 0.05, 0.055);
  b.sign({ k: 'label', text: '部活動のお知らせ', sub: 'Club notices', fg: '#fff', bg: '#1f3d2e' }, x0 + 0.9, cf + 2.3, zAt(i, s, 0.03), [0, -s], 1.8, 0.26);
  return true;
}

/** A blackboard of chalk lines in an oak frame, the class timetable of the school above, 2.0 long. */
function chalkBoard(i: ConcInfo, s: Wall, x0: number): boolean {
  const [za, zb] = band(i, s, 0, 0.35);
  if (!i.free(x0, za, x0 + 2.0, zb)) return false;
  const [ca, cb] = band(i, s, 0, 0.12);
  i.claim(x0, ca, x0 + 2.0, cb);
  const { b, cf } = i;
  wbox(i, s, OAK_DK, x0, x0 + 2.0, cf + 1.05, cf + 2.1, 0.008, 0.05);
  wbox(i, s, 'flat:#2f4a3a', x0 + 0.07, x0 + 1.93, cf + 1.12, cf + 2.03, 0.05, 0.055);
  for (let r = 0; r < 6; r++) {
    const y = cf + 1.9 - r * 0.13;
    wbox(i, s, 'flat:#d9dcd6', x0 + 0.15, x0 + 0.3, y, y + 0.025, 0.055, 0.058);
    wbox(i, s, 'flat:#d9dcd6', x0 + 0.45, x0 + 0.45 + 0.6 + ((r * 37) % 7) * 0.12, y, y + 0.02, 0.055, 0.058);
  }
  wbox(i, s, OAK, x0 + 0.05, x0 + 1.95, cf + 1.04, cf + 1.08, 0.05, 0.12);
  wbox(i, s, WHITE, x0 + 0.4, x0 + 0.5, cf + 1.08, cf + 1.1, 0.07, 0.09);
  b.sign({ k: 'label', text: '開成町 町内のお知らせ', sub: 'Neighbourhood notices', fg: '#fff', bg: '#5a3f2a' }, x0 + 1.0, cf + 2.26, zAt(i, s, 0.03), [0, -s], 2.0, 0.26);
  return true;
}

// ── Kaiseidō ─────────────────────────────────────────────────────────────────────────────────

const KAISEIDO: Brand = { ja: '文具と古書 開成堂', en: 'Kaiseidō Stationery & Old Books', bg: '#1f3d2e', fg: '#efe3c4', kind: 'books' };
const SW = 6.4, SD = 0.45, SROOM = 4.4;
const SPINES = ['flat:#7a2e0e', 'flat:#1f3f66', 'flat:#2f4a2c', 'flat:#c9a46a', 'flat:#3a3d41', 'flat:#8a2b18', 'flat:#d9cfb8'];

/** Book spines on a shelf from x0 to x1 at depth d0 … d1 (wall frame), y up from y0, h tall. */
function books(i: ConcInfo, s: Wall, x0: number, x1: number, y0: number, h: number, d0: number, d1: number, seed: number) {
  let x = x0, k = seed;
  while (x < x1 - 0.06) {
    const w = 0.04 + ((k * 13) % 5) * 0.012, hh = h * (0.7 + ((k * 7) % 4) * 0.08);
    wbox(i, s, SPINES[k % SPINES.length], x, Math.min(x1, x + w), y0, y0 + hh, d0, d1);
    x += w + 0.004;
    k++;
  }
}

/** Kaiseidō's front, SW long: an oak shop front with small panes, a door near x1, a green fascia. */
function kaiseido(i: ConcInfo, s: Wall, x0: number): boolean {
  const x1 = x0 + SW, [za, zb] = band(i, s, 0, SD + 1.3);
  if (!i.free(x0, za, x1, zb)) return false;
  const [ca, cb] = band(i, s, 0, SD + 0.5);
  i.claim(x0, ca, x1, cb);
  const { b, cf } = i, top = cf + i.clear, fy = cf + 2.35, door = x1 - 1.0;
  wbox(i, s, SCHOOL_GREEN, x0, x1, fy, top, 0, SD + 0.06);
  wbox(i, s, 'metal:#c9a227', x0, x1, fy, fy + 0.03, SD + 0.06, SD + 0.07);
  b.sign({ k: 'shop', ja: KAISEIDO.ja, en: KAISEIDO.en, bg: KAISEIDO.bg, fg: KAISEIDO.fg }, (x0 + x1) / 2, fy + 0.2, zAt(i, s, SD + 0.072), [0, -s], 5.5, 0.34);
  for (const [p, q] of [[x0, x0 + 0.2], [x1 - 0.2, x1]] as [number, number][]) wbox(i, s, OAK_DK, p, q, cf, fy, 0, SD + 0.06, true);
  // The windows: an oak stall riser, small panes on glazing bars, books stood in the window.
  const wa = x0 + 0.2, wb = door - 0.65;
  wbox(i, s, OAK_DK, wa, wb, cf, cf + 0.7, SD - 0.08, SD, true);
  wbox(i, s, 'glass', wa, wb, cf + 0.7, fy, SD - 0.03, SD - 0.015, true);
  for (let x = wa + 0.6; x < wb - 0.1; x += 0.6) wbox(i, s, OAK_DK, x - 0.025, x + 0.025, cf + 0.7, fy, SD - 0.05, SD - 0.01);
  for (const y of [cf + 1.35, cf + 1.85]) wbox(i, s, OAK_DK, wa, wb, y - 0.02, y + 0.02, SD - 0.05, SD - 0.01);
  wbox(i, s, OAK, wa, wb, cf + 0.7, cf + 0.74, 0.05, SD - 0.05);
  books(i, s, wa + 0.1, wb - 0.1, cf + 0.74, 0.3, 0.15, 0.3, 3);
  for (const x of [door - 0.65, door + 0.6]) wbox(i, s, OAK_DK, x, x + 0.05, cf, fy, SD - 0.08, SD, true);
  wbox(i, s, OAK_DK, door - 0.6, door + 0.6, cf + 2.1, fy, SD - 0.08, SD);
  wbox(i, s, 'glass', door + 0.65, x1 - 0.2, cf, fy, SD - 0.03, SD - 0.015, true);
  // A barrow of ¥100 paperbacks out front.
  wbox(i, s, OAK, wa + 0.3, wa + 1.5, cf + 0.6, cf + 0.65, SD + 0.15, SD + 0.65, true);
  for (const dx of [0.35, 1.45]) wbox(i, s, OAK_DK, wa + dx - 0.04, wa + dx + 0.04, cf, cf + 0.6, SD + 0.2, SD + 0.6, true);
  books(i, s, wa + 0.35, wa + 1.45, cf + 0.65, 0.18, SD + 0.25, SD + 0.55, 11);
  b.sign({ k: 'label', text: '文庫 一冊百円', sub: 'Paperbacks ¥100', fg: '#1f2023', bg: '#f4efe2' }, wa + 0.9, cf + 0.5, zAt(i, s, SD + 0.655), [0, -s], 0.6, 0.2);
  b.later(() => {
    if (!kaiseidoRoom(i, s, x0, x1)) {
      wbox(i, s, 'glassTint', door - 0.6, door + 0.6, cf, cf + 2.1, SD - 0.03, SD - 0.015, true);
      wbox(i, s, OAK_DK, x0 + 0.2, x1 - 0.2, cf, fy, 0, 0.02);
      books(i, s, x0 + 0.3, x1 - 0.3, cf + 0.9, 0.3, 0.02, 0.2, 21);
      books(i, s, x0 + 0.3, x1 - 0.3, cf + 1.4, 0.3, 0.02, 0.2, 27);
    }
  });
  return true;
}

/** The shop behind the front: shelves to the ceiling, the counter and its pen case, a reading bench. */
function kaiseidoRoom(i: ConcInfo, s: Wall, x0: number, x1: number): boolean {
  const { b, cf } = i, R = -SROOM;
  const f: FrontFace = { axis: 'x', at: s * i.cw, n: -s as 1 | -1 };
  if (!groundFree(b, f, x0, x1, cf, SROOM)) return false;
  shell(b, f, x0, x1, cf, 2.35, SROOM, 'flat:#efe6d2', 'wood:#7a5a3a');
  // Shelves on the back wall and the left wall, five shelves of books each.
  const shelf = (u0: number, u1: number, d0: number, d1: number, seed: number) => {
    wbox(i, s, OAK_DK, u0, u1, cf, cf + 2.3, d0, d1, true);
    for (let k = 0; k < 5; k++) {
      const y = cf + 0.12 + k * 0.44;
      wbox(i, s, OAK, u0, u1, y, y + 0.03, d1, d1 + 0.02);
      books(i, s, u0 + 0.04, u1 - 0.04, y + 0.03, 0.34, d1 + 0.005, d1 + 0.2, seed + k * 5);
    }
  };
  shelf(x0 + 0.05, x1 - 0.05, R, R + 0.32, 1);
  // A free-standing double shelf down the middle of the room, books both sides.
  const mx0 = x0 + 1.6, mx1 = x0 + 3.6, md0 = R + 1.5, md1 = R + 1.9;
  wbox(i, s, OAK_DK, mx0, mx1, cf, cf + 1.6, md0, md1, true);
  for (let k = 0; k < 3; k++) {
    const y = cf + 0.12 + k * 0.5;
    books(i, s, mx0 + 0.04, mx1 - 0.04, y, 0.36, md1, md1 + 0.16, 40 + k * 3);
    books(i, s, mx0 + 0.04, mx1 - 0.04, y, 0.36, md0 - 0.16, md0, 50 + k * 3);
  }
  // The counter on the right with its glass case of fountain pens; the till; the master's stool.
  const cx0 = x1 - 1.9, cx1 = x1 - 0.1, c0 = R + 0.9, c1 = R + 1.5;
  wbox(i, s, OAK_DK, cx0, cx1, cf, cf + 0.92, c0, c1, true);
  wbox(i, s, 'glass', cx0 + 0.05, cx1 - 0.05, cf + 0.92, cf + 1.12, c0 + 0.05, c1 - 0.05);
  wbox(i, s, 'flat:#5a1f2a', cx0 + 0.08, cx1 - 0.08, cf + 0.92, cf + 0.94, c0 + 0.08, c1 - 0.08);
  for (let k = 0; k < 7; k++) {
    const x = cx0 + 0.2 + k * 0.22;
    wbox(i, s, ['flat:#1b1b1b', 'flat:#7a1f12', 'flat:#1f3f66'][k % 3], x, x + 0.03, cf + 0.945, cf + 0.96, c0 + 0.15, c0 + 0.45);
    wbox(i, s, 'metal:#c9a227', x, x + 0.03, cf + 0.945, cf + 0.962, c0 + 0.12, c0 + 0.15);
  }
  wbox(i, s, 'metal:#8a8d90', cx0 + 0.2, cx0 + 0.6, cf + 1.12, cf + 1.35, c0 + 0.1, c0 + 0.45);
  wbox(i, s, 'none', cx0, cx1, cf, cf + 1.6, R + 0.32, c0, true);
  // A reading bench by the window with a lamp over it.
  wbox(i, s, OAK, x0 + 0.3, x0 + 1.5, cf + 0.42, cf + 0.46, -0.9, -0.45, true);
  wbox(i, s, OAK_DK, x0 + 0.3, x0 + 1.5, cf, cf + 0.42, -0.85, -0.5, true);
  for (const [x, d] of [[(mx0 + mx1) / 2, R + 0.9], [(mx0 + mx1) / 2, R + 2.8], [(cx0 + cx1) / 2, c1 + 0.2], [x0 + 0.9, -1.1]] as [number, number][]) {
    wmesh(i, s, IRON, 'cyl', x, cf + 2.2, d, 0.02, 0.3, 0.02);
    wmesh(i, s, SCHOOL_GREEN, 'cone', x, cf + 2.03, d, 0.36, 0.14, 0.36);
    wmesh(i, s, GLOW, 'sphere', x, cf + 1.96, d, 0.14, 0.1, 0.14);
  }
  b.sign({ k: 'label', text: '萬年筆 修理承ります', sub: 'Fountain pens repaired', fg: '#efe3c4', bg: '#1f3d2e' }, (cx0 + cx1) / 2, cf + 0.6, zAt(i, s, c1 + 0.006), [0, -s], 1.4, 0.24);
  const [za, zb] = band(i, s, R, 0);
  b.zone('passage', x0, cf - 0.2, za, x1, cf + 2.35, zb, KAISEIDO.ja, `${KAISEIDO.en} (shop)`);
  return true;
}

// ── Wall fill ────────────────────────────────────────────────────────────────────────────────

interface Item {
  w: number;
  at: (s: Wall, x0: number) => boolean;
}

function fill(s: Wall, segs: Span[], items: Item[]) {
  const cur = segs.map(([a]) => a);
  for (const it of items) {
    let done = false;
    for (let k = 0; k < segs.length && !done; k++) {
      for (let x = cur[k]; x + it.w <= segs[k][1] + 1e-6; x += 0.25) {
        if (it.at(s, x)) {
          cur[k] = x + it.w + 0.6;
          done = true;
          break;
        }
      }
    }
  }
}

// ── Platform: ginkgo mosaics and the crest ───────────────────────────────────────────────────

const T = 0.1, MC = 30, MR = 15;

/** A ginkgo leaf, gold, fanned up from a stem, on a ground of the given colour with a gold border. */
function leafCell(ground: string) {
  return (c: number, r: number): string => {
    const x = c + 0.5, y = r + 0.5;
    if (c === 0 || r === 0 || c === MC - 1 || r === MR - 1) return '#c9a227';
    const dx = x - 15, dy = y - 2.5, rr = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
    // The fan: between 25° and 155°, out to 10.5, with a notch in the middle of its edge.
    const notch = Math.abs(a - Math.PI / 2) < 0.12 && rr > 8;
    if (rr > 3 && rr < 10.5 && a > 0.44 && a < 2.7 && !notch) return (Math.floor(rr * 1.4) + c) % 7 ? '#e8b923' : '#d9a21a';
    if (Math.abs(dx) < 0.6 && dy > -1.5 && dy < 3.2) return '#8a6a2a';
    return ground;
  };
}

/** The crest: three ginkgo leaves in a ring round 高, white on school green. */
function crestCell(c: number, r: number): string {
  const x = c + 0.5, y = r + 0.5, dx = x - 15, dy = y - 7.5, rr = Math.hypot(dx, dy);
  if (c === 0 || r === 0 || c === MC - 1 || r === MR - 1) return '#c9a227';
  if (rr > 6 && rr < 6.8) return '#f4f1e6';
  for (let k = 0; k < 3; k++) {
    const a = Math.PI / 2 + (k * 2 * Math.PI) / 3, lx = 15 + Math.cos(a) * 3.6, ly = 7.5 + Math.sin(a) * 3.6;
    if (Math.hypot(x - lx, y - ly) < 1.9) return '#e8b923';
  }
  if (rr < 1.4) return '#f4f1e6';
  return '#1f3d2e';
}

function mosaic(h: HallInfo, x: number, s: 1 | -1, cell: (c: number, r: number) => string) {
  const { b, pf, wallZ } = h, y0 = pf + 1.05, x0 = x - (MC * T) / 2;
  const zf = s * (wallZ - 0.005), zb = s * (wallZ - 0.04);
  b.deco(BRICK, x0 - 0.2, y0 - 0.2, Math.min(zf, s * (wallZ - 0.03)), x0 + MC * T + 0.2, y0 + MR * T + 0.2, Math.max(zf, s * (wallZ - 0.03)));
  b.deco(STONE, x0 - 0.3, y0 + MR * T + 0.2, Math.min(zf, s * (wallZ - 0.06)), x0 + MC * T + 0.3, y0 + MR * T + 0.32, Math.max(zf, s * (wallZ - 0.06)));
  for (let r = 0; r < MR; r++) {
    let c = 0;
    while (c < MC) {
      const col = cell(c, r);
      let e = c + 1;
      while (e < MC && cell(e, r) === col) e++;
      b.deco(`mosaic:${col}`, x0 + c * T, y0 + r * T, Math.min(zf, zb), x0 + e * T, y0 + (r + 1) * T, Math.max(zf, zb));
      c = e;
    }
  }
}

function platformLook(h: HallInfo) {
  const cells = [leafCell('#1f3d2e'), leafCell('#efe6d2'), crestCell, leafCell('#efe6d2')];
  let k = 0;
  for (const s of [-1, 1] as const) {
    for (const x of [-45.5, -32.5, 32.5, 45.5]) {
      if (!h.wallRuns(s).some(([a, c]) => x - 1.9 >= a && x + 1.9 <= c)) continue;
      mosaic(h, x, s, cells[k++ % cells.length]);
    }
  }
}

// ── Street entrances ─────────────────────────────────────────────────────────────────────────

/** Exit 1: a brick arch with a stone keystone over the stair's mouth, low brick walls, iron lamps. */
function archCanopy(e: ExitInfo) {
  const { b, gy, run, ext } = e;
  const xf = run + 0.45, zA = ext + 0.75, zB = ext + 4.45, zm = (zA + zB) / 2, half = (zB - zA) / 2 - 0.5;
  // The piers.
  for (const z of [zA, zB]) {
    b.box(BRICK, xf - 0.3, gy, z - 0.3, xf + 0.3, gy + 2.9, z + 0.3, true);
    b.deco(STONE, xf - 0.34, gy, z - 0.34, xf + 0.34, gy + 0.35, z + 0.34);
    b.deco(STONE, xf - 0.36, gy + 2.6, z - 0.36, xf + 0.36, gy + 2.75, z + 0.36);
    // An iron lamp on a bracket on the street face.
    b.deco(IRON, xf + 0.3, gy + 2.2, z - 0.02, xf + 0.6, gy + 2.24, z + 0.02);
    b.deco(GLOW, xf + 0.47, gy + 1.88, z - 0.12, xf + 0.73, gy + 2.2, z + 0.12);
    b.deco(IRON, xf + 0.45, gy + 2.2, z - 0.14, xf + 0.75, gy + 2.26, z + 0.14);
  }
  // The arch: a brick ring in voussoir steps, rising from 2.75 at the piers to 3.35 at the crown.
  const n = 14;
  for (let k = 0; k < n; k++) {
    const t0 = -1 + (2 * k) / n, t1 = -1 + (2 * (k + 1)) / n, tm = (t0 + t1) / 2;
    const y = gy + 2.75 + 0.6 * Math.sqrt(Math.max(0, 1 - tm * tm));
    b.deco(k % 2 ? BRICK : BRICK_DK, xf - 0.3, y, zm + t0 * half, xf + 0.3, y + 0.42, zm + t1 * half);
    b.deco(BRICK, xf - 0.3, gy + 2.75, zm + t0 * half, xf + 0.3, y, zm + t1 * half);
  }
  b.deco(STONE, xf - 0.33, gy + 3.2, zm - 0.18, xf + 0.33, gy + 3.85, zm + 0.18);
  b.deco(STONE, xf - 0.36, gy + 3.77, zA - 0.36, xf + 0.36, gy + 3.9, zB + 0.36);
  // A glazed roof on iron posts over the stair, behind the arch.
  const np = Math.max(1, Math.ceil(run / 4));
  for (let k = 0; k <= np; k++) {
    const x = -0.2 + ((xf - 0.5) * k) / np;
    for (const z of [ext + 1.0, ext + 4.2]) b.deco(IRON, x - 0.05, gy + 1.08, z - 0.05, x + 0.05, gy + 2.9, z + 0.05);
  }
  b.deco(IRON, -0.4, gy + 2.85, ext + 0.9, xf - 0.3, gy + 2.95, ext + 4.3);
  b.deco('glass', -0.4, gy + 2.95, ext + 0.85, xf - 0.3, gy + 2.97, ext + 4.35);
  for (let x = 0.6; x < xf - 0.4; x += 1.2) b.deco(IRON, x - 0.02, gy + 2.95, ext + 0.85, x + 0.02, gy + 3.0, ext + 4.35);
  // Low brick walls with a stone coping down both sides of the stair.
  for (const [z0, z1] of [[ext + 0.85, ext + 1.2], [ext + 4.0, ext + 4.35]]) {
    b.box(BRICK, -0.3, gy, z0, xf - 0.3, gy + 1.0, z1, true);
    b.deco(STONE, -0.32, gy + 1.0, z0 - 0.03, xf - 0.3, gy + 1.08, z1 + 0.03);
  }
  b.deco('flat:#22262b', run - 0.04, gy + 1.88, ext + 1.1, run + 0.05, gy + 2.52, ext + 4.1);
}

/** Exit 2: stone school gateposts with lamps and a nameplate, under a copper roof on oak posts, hedges. */
function gateCanopy(e: ExitInfo) {
  const { b, gy, run, ext } = e;
  const xa = -0.5, xb = run + 0.6, zA = ext + 0.8, zB = ext + 4.4;
  // Oak posts and a flat copper roof with a stone-coloured fascia.
  const np = Math.max(1, Math.ceil((xb - xa) / 4.5));
  for (let k = 0; k <= np; k++) {
    const x = xa + 0.1 + ((xb - xa - 0.2) * k) / np;
    for (const z of [zA, zB]) b.deco(OAK_DK, x - 0.08, gy, z - 0.08, x + 0.08, gy + 2.8, z + 0.08);
  }
  b.deco('flat:#5f8f7d', xa - 0.3, gy + 2.8, zA - 0.45, xb + 0.5, gy + 2.92, zB + 0.45);
  b.deco(STONE, xa - 0.32, gy + 2.7, zA - 0.47, xb + 0.52, gy + 2.82, zB + 0.47);
  // The gateposts at the mouth, with lamps on their caps and the station's name cut in one.
  const gx = xb - 0.1;
  for (const z of [zA - 0.05, zB + 0.05]) {
    b.box(STONE, gx - 0.3, gy, z - 0.3, gx + 0.3, gy + 2.2, z + 0.3, true);
    b.deco(STONE_DK, gx - 0.35, gy + 2.2, z - 0.35, gx + 0.35, gy + 2.32, z + 0.35);
    b.deco(GLOW, gx - 0.17, gy + 2.32, z - 0.17, gx + 0.17, gy + 2.62, z + 0.17);
    b.deco(IRON, gx - 0.19, gy + 2.62, z - 0.19, gx + 0.19, gy + 2.68, z + 0.19);
  }
  b.sign({ k: 'shop', ja: '地下鉄 開成町駅', bg: '#f4f1e6', fg: '#1f2023', vertical: true }, gx + 0.305, gy + 1.15, zB + 0.05, [1, 0], 0.4, 1.5);
  // Clipped hedges along both sides of the stair.
  for (const [z0, z1] of [[ext + 0.7, ext + 1.18], [ext + 4.02, ext + 4.5]]) b.box('flat:#3f6b3a', -0.3, gy, z0, gx - 0.35, gy + 0.95, z1, true);
  b.deco('flat:#22262b', run - 0.04, gy + 1.88, ext + 1.1, run + 0.05, gy + 2.52, ext + 4.1);
}

// ── The look ─────────────────────────────────────────────────────────────────────────────────

export const look: StationLook = {
  finishes: { wall: BRICK, floor: 'terrazzo:#d2c7b4', pillar: BRICK, ceil: 'paint:#efe6d2' },
  posters: false,
  skirting: false,

  lights(i) {
    coffers(i);
    const zr = i.cw * 0.6;
    for (const x of lampXs(i)) {
      for (const z of [-zr, 0, zr]) {
        if (nearWell(i, x - 0.4, z - 0.4, x + 0.4, z + 0.4, 0.2)) continue;
        if (i.pillars.some(([px, pz]) => Math.abs(px - x) < 0.8 && Math.abs(pz - z) < 0.8)) continue;
        schoolLamp(i, x, z);
      }
    }
    for (const e of i.ends) schoolClock(i, e.hi ? e.g - 1.6 : e.g + 1.6, -0.5 * i.cw);
  },

  pillar(i, x, z, y0, y1) {
    // A square brick pier: stone plinth, stone quoins at the corners, a stone cap and impost.
    const { b } = i, h = 0.4;
    b.deco(BRICK, x - h, y0, z - h, x + h, y1, z + h);
    b.deco(STONE_DK, x - h - 0.04, y0, z - h - 0.04, x + h + 0.04, y0 + 0.4, z + h + 0.04);
    for (let y = y0 + 0.4, k = 0; y < y1 - 0.6; y += 0.32, k++) {
      const w = k % 2 ? 0.16 : 0.26;
      for (const [cx, cz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        b.deco(STONE, x + cx * h - (cx < 0 ? 0.012 : w - 0.012) * 1, y, z + cz * h - (cz < 0 ? 0.012 : 0.17), x + cx * h + (cx < 0 ? w - 0.012 : 0.012), y + 0.2, z + cz * h + (cz < 0 ? 0.17 : 0.012));
      }
    }
    b.deco(STONE, x - h - 0.06, y1 - 0.45, z - h - 0.06, x + h + 0.06, y1 - 0.3, z + h + 0.06);
    b.deco(STONE_DK, x - h - 0.1, y1 - 0.3, z - h - 0.1, x + h + 0.1, y1 - 0.22, z + h + 0.1);
  },

  concourse(i) {
    for (const s of [-1, 1] as const) wallDado(i, s, DADO);
    const paidEnds = [...(i.ends.some((e) => !e.hi) ? [] : [i.x0]), ...(i.ends.some((e) => e.hi) ? [] : [i.x1])];
    for (const x of paidEnds) endDado(i, x, DADO);
    const lo = i.paid[0] + 0.4, hi = i.paid[1] - 0.4;
    // Kaiseidō on the +z wall, the first stretch of SW that is free.
    for (let x = lo; x + SW <= hi && !kaiseido(i, 1, x); x += 0.5);
    // School benches between the pillars, notice boards on the walls.
    for (const [px, pz] of i.pillars) if (px + 3 < hi) bench(i, px + 3, pz, { axis: 'x', len: 1.8, color: '#8a6440' });
    for (const s of [-1, 1] as const) {
      const gaps = i.pillars.filter(([, pz]) => Math.sign(pz) === s).map(([px]): Span => [px - 1.0, px + 1.0]);
      const items: Item[] = s < 0
        ? [{ w: 1.8, at: (w, x) => clubBoard(i, w, x) }, { w: 2.0, at: (w, x) => chalkBoard(i, w, x) }, { w: 1.8, at: (w, x) => clubBoard(i, w, x) }]
        : [{ w: 1.8, at: (w, x) => clubBoard(i, w, x) }];
      fill(s, cut([lo, hi], gaps), items);
    }
  },

  exit(e) {
    exitDado(e, { mat: OAK, top: 1.1, cap: STONE, steps: Math.max(4, Math.round(e.run / 2)) });
    exitHandrails(e);
    const { b, cf, ext } = e, L = ext + 4;
    b.deco(STONE, -4, cf + 2.3, 0, -3.988, cf + 2.4, L);
    b.deco(STONE, -4, cf + 2.3, L - 0.012, 0, cf + 2.4, L);
    // The kit's sign at the stair foot sits up in the soffit here: one hung lower, under it.
    b.deco(IRON, -0.42, cf + 2.62, ext + 2.0, -0.4, cf + 2.75, ext + 2.02);
    b.deco(IRON, -0.42, cf + 2.62, ext + 3.2, -0.4, cf + 2.75, ext + 3.22);
    b.sign({ k: 'guide', ja: '出口', en: 'Exit', bg: 'yellow', num: e.num, arrow: 'up' }, -0.45, cf + 2.4, ext + 2.6, [-1, 0], 2.3, 0.42);
    b.mesh(SCHOOL_GREEN, 'cone', -2, cf + 2.5, ext + 2, 0.5, 0.18, 0.5);
    b.mesh(GLOW, 'sphere', -2, cf + 2.38, ext + 2, 0.2, 0.16, 0.2);
  },

  canopy(e) {
    if ((Number(e.num) || 1) % 2 === 0) gateCanopy(e);
    else archCanopy(e);
  },

  passage(p) {
    passageDado(p, { mat: OAK, top: 1.1, cap: STONE });
    passageRails(p);
  },

  platform: platformLook,
};
