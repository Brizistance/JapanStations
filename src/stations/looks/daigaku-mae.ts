// Station look: Daigaku-mae (川湊大学前). The campus undercroft: brick arcades, cream plaster and
// the paper chaos of student life. See Plans/features/station-looks/plan.md.
//
// - Walls: the station brick on a dark-brick base with a stone cap, a dark picture rail, cream
//   plaster above. Brick piers stand out of both long walls of the paid spine on the pillar grid
//   (and at the ends of each stretch of wall the stairwells and bay mouths leave), with stepped
//   round-headed arches between them; at three grid lines a cross-arch spans the spine from wall
//   pier (or stairwell wall) to pillar to pillar, so the corridor walks like a cloister.
// - Stairwells and transfer bays: the same brick and plaster, with blind arcading (brick
//   pilasters and arches over plaster panels pasted with flyers) and cork boards on closed ends.
// - Ceiling: cream, stone ribs on the pillar grid, a shallow stepped coffer in each bay and a
//   brass-and-opal globe hanging in it; old pipes along one pillar line.
// - Shop fronts fill the stretches of wall the corridor leaves free, one arcade bay each with a
//   pier between neighbours, signs painted in the arch above: a café, a second-hand bookshop
//   with a bargain cart, a set-meal canteen, the co-op's stationery and copy shop, a cheap curry
//   counter, a second-hand record and instrument shop; a bay of drink machines, a bay of benches.
//   The noticeboard court faces itself across the spine at the west end: a pinned cork wall on
//   one side, a row of tatekan on the other, club banners above. Staff doors, a hose cabinet,
//   meter cupboards and flyers fill what is left of the free wall.
// - The exits on the campus side are the university's own: in the lobby at the stair foot, the
//   library's basement entrance (oak doors, the stacks seen through the glass); at the top, the
//   stair comes up into a brick forecourt under the campus trees, with the library gate post.

import type { Builder } from '../../world/builder';
import {
  band, bench, cut, exitDado, fbox, fnormal, fpt, hash, hoseCabinet, lockers, meterCupboard, noren, PALETTES, passagePipes,
  passageWalls, pipeRun, serviceDoor, stairwellFaces, vendingRow, wallBand, wbox,
  type Axis, type Brand, type Span, type Wall,
} from './parts';
import type { ConcInfo, ExitInfo, Rect, RoomInfo, Stairwell, StationLook, WallFace } from './types';
import { KIND, stationExits } from '../exits';

/** True for an exit that comes up on the campus side of the road (the university nearest). */
const campusExit = (e: ExitInfo) =>
  stationExits(e.station.id).find((x) => x.num === e.num)?.near[0]?.en === KIND.campus.en;

/** The university library's basement entrance on the lobby's −x wall (x = −4, facing +x). */
function libraryDoor(e: ExitInfo) {
  const { b, cf, ext } = e, zc = ext + 2, w = 1.1;
  // Brick surround and a stone lintel carrying the name.
  b.deco(BRICK, -3.99, cf, zc - w - 0.45, -3.94, cf + 2.62, zc + w + 0.45);
  b.deco(STONE, -3.94, cf + 2.22, zc - w - 0.5, -3.9, cf + 2.62, zc + w + 0.5);
  // Behind the glass: dim reading-room light and the stacks.
  b.deco('flat:#2a1e16', -3.94, cf + 0.05, zc - w, -3.93, cf + 2.18, zc + w);
  const r = seeded(e.num.charCodeAt(0) * 31 + 7);
  for (const y0 of [cf + 0.3, cf + 0.85, cf + 1.4]) {
    b.deco(OAK, -3.93, y0 - 0.04, zc - w + 0.1, -3.925, y0, zc + w - 0.1);
    for (let z = zc - w + 0.12; z < zc + w - 0.14;) {
      const t = 0.03 + r() * 0.05;
      b.deco(`flat:${BOOKS[Math.floor(r() * BOOKS.length)]}`, -3.928, y0, z, -3.922, y0 + 0.32 + r() * 0.12, z + t);
      z += t + 0.006;
    }
  }
  b.deco('glow:#ffe2a8', -3.93, cf + 1.95, zc - w + 0.1, -3.925, cf + 2.05, zc + w - 0.1);
  b.deco('glass', -3.92, cf + 0.05, zc - w, -3.91, cf + 2.18, zc + w);
  // Oak frame, the meeting stile, brass pulls.
  for (const z of [zc - w - 0.08, zc + w]) b.deco(OAK, -3.94, cf, z, -3.88, cf + 2.22, z + 0.08);
  b.deco(OAK, -3.94, cf + 2.14, zc - w, -3.88, cf + 2.22, zc + w);
  b.deco(OAK, -3.92, cf, zc - 0.03, -3.88, cf + 2.18, zc + 0.03);
  for (const dz of [-0.14, 0.1]) b.deco(BRASS, -3.88, cf + 0.85, zc + dz, -3.84, cf + 1.25, zc + dz + 0.04);
  b.deco(BRASS, -3.92, cf, zc - w, -3.88, cf + 0.12, zc + w);
  b.sign({ k: 'label', text: '川湊大学附属図書館 地下入口', sub: 'Kawaminato University Library — basement entrance', fg: '#f0e2c0', bg: '#3d2014' },
    -3.89, cf + 2.42, zc, [1, 0], 2.9, 0.34);
}

/** At street level on the campus side: a brick forecourt round the stair mouth, the library gate post. */
function campusForecourt(e: ExitInfo) {
  const { b, gy, ext, run } = e, z0 = ext + 1.2, z1 = ext + 4.0;
  // Brick paving beyond the parapets and in front of the mouth.
  b.deco(BRICK, -1.2, gy + 0.004, z0 - 2.2, run + 3.2, gy + 0.01, z1 + 2.2);
  for (let x = -1.2; x < run + 3.2; x += 1.2) b.deco(STONE, x, gy + 0.01, z0 - 2.2, x + 0.04, gy + 0.012, z1 + 2.2);
  // Low brick planters along both sides with a cherry tree in each, benches on their fronts.
  for (const [a, c] of [[z0 - 2.2, z0 - 1.2], [z1 + 1.2, z1 + 2.2]]) {
    b.deco(BRICK, 0, gy, a, run - 0.8, gy + 0.5, c);
    b.deco(STONE, -0.04, gy + 0.5, a - 0.04, run - 0.76, gy + 0.56, c + 0.04);
    b.deco('flat:#4a3b2c', 0.1, gy + 0.56, a + 0.1, run - 0.9, gy + 0.58, c - 0.1);
    const tx = (run - 0.8) / 2, tz = (a + c) / 2;
    b.mesh('wood:#4a3424', 'cyl', tx, gy + 1.9, tz, 0.22, 2.7, 0.22);
    b.mesh('flat:#f2c9d4', 'sphere', tx, gy + 3.7, tz, 3.0, 1.8, 2.4);
    b.mesh('flat:#e8b3c2', 'sphere', tx + 0.6, gy + 3.4, tz + 0.3, 1.8, 1.2, 1.6);
  }
  // The library gate post at the forecourt's street corner.
  const px = run + 2.4, pz = z1 + 1.7;
  b.deco(BRICK, px - 0.35, gy, pz - 0.35, px + 0.35, gy + 2.4, pz + 0.35);
  b.deco(STONE, px - 0.42, gy + 2.4, pz - 0.42, px + 0.42, gy + 2.55, pz + 0.42);
  b.mesh(OPAL, 'sphere', px, gy + 2.78, pz, 0.36, 0.36, 0.36);
  b.sign({ k: 'label', text: '川湊大学 図書館口', sub: 'University — Library Gate', fg: '#f0e2c0', bg: '#3d2014' }, px + 0.36, gy + 1.6, pz, [1, 0], 0.66, 1.2);
}

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
  kusunoki: { ja: 'カレー くすのき', en: 'Curry Kusunoki', bg: '#c98a2b', fg: '#3d2014', kind: 'bento' },
  otonoha: { ja: '中古レコード 音の葉', en: 'Oto-no-Ha Records & Instruments', bg: '#1b1b1b', fg: '#f2d16b', kind: 'goods' },
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

// ── Layout: what the corridor leaves ─────────────────────────────────────────────────────────

/** Half width of a wall pier. */
const PH = 0.3;
/** Wall finishes start this far above the floor, clear of the floor guidance laid against walls. */
const FOOT = 0.016;

const spineWells = (i: ConcInfo) => i.stairwells.filter((w) => w.room < 0);

const meets = (r: Rect, x0: number, z0: number, x1: number, z1: number) => x1 > r[0] && x0 < r[2] && z1 > r[1] && z0 < r[3];

/** x-ranges where a spine stairwell stands against long wall `s` (its footprint runs to the wall). */
const wellGaps = (i: ConcInfo, s: Wall): Span[] =>
  spineWells(i).filter(({ footprint: f }) => (s > 0 ? f[3] > i.cw - 0.3 : f[1] < -i.cw + 0.3)).map(({ footprint: f }): Span => [f[0], f[2]]);

/** z-ranges where a run across the spine at x (± half) would meet a spine stairwell. */
const wellsAlongZ = (i: ConcInfo, x: number, half: number): Span[] =>
  spineWells(i).filter(({ footprint: f }) => x + half > f[0] - 0.05 && x - half < f[2] + 0.05).map(({ footprint: f }): Span => [f[1] - 0.05, f[3] + 0.05]);

/** The floor kept clear in front of each portal: 3.3 m out, 0.6 m wider each side than the opening. */
function approaches(wells: Stairwell[]): Rect[] {
  return wells.map(({ portal: p }): Rect => {
    const [px, pz] = p.at, [nx, nz] = p.n, hw = p.w / 2 + 0.6;
    if (Math.abs(nx) > 0.5) {
      const c = px + nx * 3.3;
      return [Math.min(px, c), pz - hw, Math.max(px, c), pz + hw];
    }
    const c = pz + nz * 3.3;
    return [px - hw, Math.min(pz, c), px + hw, Math.max(pz, c)];
  });
}

/** x-ranges of long wall `s` beside a portal's approach: nothing stands out from the wall there. */
function approachGaps(i: ConcInfo, s: Wall): Span[] {
  const [za, zb] = band(i, s, 0, 0.6);
  return approaches(i.stairwells).filter((r) => meets(r, r[0], za, r[2], zb)).map((r): Span => [r[0], r[2]]);
}

/** Stretches of long wall `s` in the paid area the arcade stands on: clear of the gates, stairwells, mouths and toilets. */
function arcadeRuns(i: ConcInfo, s: Wall): Span[] {
  const gaps = [...wellGaps(i, s), ...i.openings.filter((o) => o.s === s).map((o): Span => [o.x0, o.x1])];
  if (s < 0) gaps.push([i.toilets - 1.9, i.toilets + 1.9]);
  return cut([i.paid[0] + 3.5, i.paid[1] - 3.5], gaps).filter(([a, c]) => c - a >= 1.6);
}

/** Free floor along wall `s` from a to c, `depth` out from it, as spans. */
function freeSpans(i: ConcInfo, s: Wall, a: number, c: number, depth: number): Span[] {
  const [za, zb] = band(i, s, 0, depth), out: Span[] = [];
  let p: number | null = null;
  for (let x = a; x < c - 1e-6; x += 0.25) {
    const ok = i.free(x, za, Math.min(c, x + 0.25), zb);
    if (ok && p === null) p = x;
    if (!ok && p !== null) {
      out.push([p, x]);
      p = null;
    }
  }
  if (p !== null) out.push([p, c]);
  return out;
}

/** Spans along face `f` whose floor 0.3 m in front lies in one of `rects` (grown `m`). */
function spansAlong(f: WallFace, rects: Rect[], m: number): Span[] {
  const out: Span[] = [];
  for (let u = f.u0 + 0.125; u < f.u1; u += 0.25) {
    const [x, z] = fpt(f, u, 0.3);
    if (!rects.some((r) => x > r[0] - m && x < r[2] + m && z > r[1] - m && z < r[3] + m)) continue;
    const last = out[out.length - 1];
    if (last && Math.abs(last[1] - (u - 0.125)) < 1e-6) last[1] = u + 0.125;
    else out.push([u - 0.125, u + 0.125]);
  }
  return out;
}

// ── Concourse: walls, arcade, ceiling ────────────────────────────────────────────────────────

/** Brick on a dark-brick base with a stone cap, a picture rail, cream plaster above (skips doorways and stairwells). */
function walls(i: ConcInfo, s: Wall) {
  for (const [from, to] of cut([i.x0, i.x1], wellGaps(i, s))) {
    wallBand(i, s, FOOT, 0.45, BRICK_DARK, { inset: 0.018, from, to });
    wallBand(i, s, 0.45, 0.52, STONE, { inset: 0.022, from, to });
    // Rail 0.006 behind the kit's toilet sign (0.03 proud), which it passes behind.
    wallBand(i, s, 2.27, 2.33, RAIL, { inset: 0.024, from, to });
    wallBand(i, s, 2.33, i.clear, PLASTER, { inset: 0.008, from, to });
  }
}

/**
 * The same finishes on any wall face (a stairwell's outer walls, a transfer bay's walls), left
 * off `gaps`; with `arcade`, blind arcading over the stretches clear of `quiet`: brick pilasters
 * and stepped arches over cream plaster panels, flyers pasted in each.
 */
function brickFace(t: { b: Builder; cf: number; clear: number }, f: WallFace, r: () => number, o: { arcade: boolean; gaps?: Span[]; quiet?: Span[] }) {
  const { b, cf } = t, top = cf + t.clear;
  for (const [a, c] of cut([f.u0, f.u1], o.gaps)) {
    fbox(b, f, BRICK_DARK, a, c, cf + FOOT, cf + 0.45, 0, 0.018);
    fbox(b, f, STONE, a, c, cf + 0.45, cf + 0.52, 0, 0.022);
    fbox(b, f, RAIL, a, c, cf + 2.27, cf + 2.33, 0, 0.024);
    fbox(b, f, PLASTER, a, c, cf + 2.33, top, 0, 0.008);
  }
  if (!o.arcade) return;
  const [t0, t1] = [f.at + f.n * 0.004, f.at + f.n * 0.04];
  for (const [a, c] of cut([f.u0, f.u1], [...(o.gaps ?? []), ...(o.quiet ?? [])])) {
    if (c - a < 1.8) continue;
    const n = Math.max(1, Math.round((c - a) / 2.6)), pitch = (c - a) / n;
    for (let k = 0; k <= n; k++) {
      const u = a + k * pitch, pa = Math.max(a, u - 0.15), pb = Math.min(c, u + 0.15);
      fbox(b, f, BRICK, pa, pb, cf + 0.52, cf + 1.72, 0, 0.04);
      fbox(b, f, STONE, Math.max(a, pa - 0.03), Math.min(c, pb + 0.03), cf + 1.72, cf + 1.78, 0, 0.05);
    }
    for (let k = 0; k < n; k++) {
      const oa = a + k * pitch + 0.15, oc = a + (k + 1) * pitch - 0.15;
      fbox(b, f, PLASTER, oa, oc, cf + 0.52, cf + 2.27, 0, 0.006);
      arch(b, BRICK, f.axis, Math.min(t0, t1), Math.max(t0, t1), oa, oc, cf + 1.78, cf + 2.1, cf + 2.27, U_SMALL);
      flyers(r, oa + 0.12, oc - 0.12, cf + 0.95, cf + 1.7, (mat, fa, fc, ya, yb) => fbox(b, f, mat, fa, fc, ya, yb, 0.01, 0.012), 0.7);
    }
  }
}

/** A framed cork board on face `f`, u0 … u1, densely pinned, a poster pinned over the flyers. */
function corkFace(t: { b: Builder; cf: number }, f: WallFace, u0: number, u1: number, r: () => number, v: number) {
  const { b, cf } = t, y0 = cf + 0.72, y1 = cf + 2.18;
  fbox(b, f, CORK, u0, u1, y0, y1, 0.008, 0.022);
  for (const [p, q, a, c] of [[u0, u1, y0 - 0.05, y0], [u0, u1, y1, y1 + 0.05], [u0 - 0.05, u0, y0 - 0.05, y1 + 0.05], [u1, u1 + 0.05, y0 - 0.05, y1 + 0.05]]) {
    fbox(b, f, RAIL, p, q, a, c, 0.008, 0.034);
  }
  flyers(r, u0 + 0.05, u1 - 0.05, y0 + 0.05, y1 - 0.05, (mat, a, c, ya, yb) => fbox(b, f, mat, a, c, ya, yb, 0.028, 0.03));
  if (u1 - u0 < 1.2) return;
  const [px, pz] = fpt(f, (u0 + u1) / 2, 0.036);
  b.sign({ k: 'poster', v: v % 8 }, px, cf + 1.45, pz, fnormal(f), 0.62, 0.88);
}

/** x of the pillar grid in the paid area, clear of the gate lines. */
function grid(i: ConcInfo): number[] {
  const xs = [...new Set(i.pillars.map(([x]) => x))].sort((p, q) => p - q);
  return xs.filter((x) => x > i.paid[0] + 2 && x < i.paid[1] - 2 && !i.ends.some((e) => Math.abs(x - e.g) < 3.5));
}

const pillarZ = (i: ConcInfo) => (i.pillars.length ? Math.min(...i.pillars.map(([, z]) => Math.abs(z))) : 0);

/** Brick pier 0.6 wide standing `d` out of long wall `s`, stone base and impost (solid when it stands 0.3 out). */
function wallPier(i: ConcInfo, s: Wall, x: number, d: number) {
  const { cf } = i;
  wbox(i, s, BRICK, x - PH, x + PH, cf + FOOT, cf + SPRING, 0, d, d > 0.1);
  wbox(i, s, STONE, x - PH - 0.03, x + PH + 0.03, cf + FOOT, cf + 0.3, 0, d + 0.03);
  wbox(i, s, STONE, x - PH - 0.04, x + PH + 0.04, cf + 2.3, cf + SPRING, 0, d + 0.04);
}

interface Bay { s: Wall; x0: number; x1: number }
interface Pier { x: number; d: number }
/** A shop or the like planned on wall `s`, x0 … x1. */
interface Placed { s: Wall; x0: number; x1: number; kind: Kind }
interface Kind {
  id: string;
  /** Floor it takes, out from the wall (checked, and claimed unless `self`). */
  depth: number;
  min: number;
  max: number;
  /** It checks and claims its own floor when built (lockers, machines, benches). */
  self?: boolean;
  build: (i: ConcInfo, p: Placed, bay: Bay | undefined) => void;
}

/** Width of the brick pier the arcade sets between two neighbouring fronts. */
const SEP = 2 * PH;

/**
 * Plan the fronts, one arcade bay each: the stretches of free wall (1 m deep, clear of the
 * arcade's end piers) are taken in order along the wall, and each is packed with the next
 * units in the wall's list that still fit (a pier's width between neighbours, each at least its
 * `min`); what is left over widens them in turn up to their `max`, and the rest is left to the
 * service bays. A unit whose own depth is not free there is skipped. Claims each footprint.
 */
function planFronts(i: ConcInfo, kinds: Record<string, Kind[]>): Placed[] {
  const out: Placed[] = [];
  for (const s of WALLS) {
    const queue = [...kinds[String(s)]];
    for (const [a, c] of arcadeRuns(i, s)) {
      for (const [p, q] of freeSpans(i, s, a + 2 * PH + 0.1, c - 2 * PH - 0.1, 1.0)) {
        const fit = (ks: Kind[]) => q - p >= ks.reduce((t, k) => t + k.min, 0) + SEP * (ks.length - 1);
        const take: Kind[] = [];
        for (const k of [...queue]) {
          if (!fit([...take, k])) continue;
          take.push(k);
          queue.splice(queue.indexOf(k), 1);
        }
        if (!take.length) continue;
        let spare = q - p - take.reduce((t, k) => t + k.min, 0) - SEP * (take.length - 1);
        const ws = take.map((k) => {
          const w = Math.min(k.max, k.min + spare);
          spare -= w - k.min;
          return w;
        });
        let x = p;
        take.forEach((k, n) => {
          const x0 = x, x1 = x + ws[n], [za, zb] = band(i, s, 0, k.depth);
          x = x1 + SEP;
          if (!i.free(x0, za, x1, zb)) return;
          if (!k.self) i.claim(x0, za, x1, zb);
          out.push({ s, x0, x1, kind: k });
        });
      }
    }
  }
  return out;
}

/**
 * Piers and arches along both long walls of the paid spine: a pier at each end of every stretch
 * of wall, one between each pair of neighbouring fronts, and on the pillar grid elsewhere (none
 * inside a front), a flat pilaster instead where the floor is not free. Returns the bays between
 * piers and the piers.
 */
function arcade(i: ConcInfo, G: number[], items: Placed[]): { bays: Bay[]; piers: Record<string, Pier[]> } {
  const { cf } = i, top = cf + i.clear, bays: Bay[] = [], piers: Record<string, Pier[]> = { '1': [], '-1': [] };
  for (const s of WALLS) {
    const mine = items.filter((q) => q.s === s).sort((p, q) => p.x0 - q.x0);
    const shops = mine.map((q): Span => [q.x0 - 0.05, q.x1 + 0.05]), near = approachGaps(i, s);
    const hit = (x: number, gs: Span[], m = 0) => gs.some(([p, q]) => x + PH + m > p && x - PH - m < q);
    // Between neighbouring fronts (planned a pier's width apart).
    const seps = mine.slice(1).filter((q, k) => q.x0 - mine[k].x1 < SEP + 0.05).map((q, k) => (mine[mine.indexOf(q) - 1].x1 + q.x0) / 2);
    for (const [a, c] of arcadeRuns(i, s)) {
      const own = seps.filter((x) => x > a + 1 && x < c - 1);
      const xs = [a + PH + 0.06, ...G.filter((x) => x - a >= 1.6 && c - x >= 1.6 && !hit(x, shops) && !own.some((y) => Math.abs(y - x) < 1.6)), ...own, c - PH - 0.06].sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k++) {
        const mid = (xs[k] + xs[k + 1]) / 2;
        if (xs[k + 1] - xs[k] > 9 && !hit(mid, shops)) xs.splice(k + 1, 0, mid);
      }
      const [za, zb] = band(i, s, 0, 0.3);
      const ps = xs.map((x): Pier => {
        const solid = !hit(x, near, 0.1) && i.free(x - PH, za, x + PH, zb);
        if (solid) i.claim(x - PH, za, x + PH, zb);
        wallPier(i, s, x, solid ? 0.3 : 0.06);
        return { x, d: solid ? 0.3 : 0.06 };
      });
      piers[String(s)].push(...ps);
      for (let k = 0; k + 1 < ps.length; k++) {
        const p = ps[k], q = ps[k + 1];
        const d = near.some(([g0, g1]) => q.x > g0 && p.x < g1) ? 0.06 : Math.min(p.d, q.d);
        const [ta, tb] = band(i, s, 0, d);
        arch(i.b, BRICK, 'x', ta, tb, p.x + PH, q.x - PH, cf + SPRING, cf + CROWN, top, U_BIG);
        bays.push({ s, x0: p.x + PH, x1: q.x - PH });
      }
    }
  }
  return { bays, piers };
}

/** Where a cross-arch at x lands on side `side`: a spine stairwell's wall face, or a wall pier. */
function crossEdge(i: ConcInfo, x: number, side: Wall, piers: Record<string, Pier[]>): { z: number; well: boolean } | null {
  let best: number | null = null;
  for (const w of spineWells(i)) {
    for (const r of w.walls) {
      if (r[0] > x - 0.4 || r[2] < x + 0.4) continue;
      const z = side > 0 ? r[1] : r[3];
      if (side * z > 0 && Math.abs(z) < i.cw - 0.5 && (best === null || Math.abs(z) < Math.abs(best))) best = z;
    }
  }
  if (best !== null) return { z: best, well: true };
  const p = piers[String(side)].find((q) => Math.abs(q.x - x) < 0.6);
  return p ? { z: side * (i.cw - p.d), well: false } : null;
}

/** Cross-arches at three grid lines, stone ribs on the rest, stepped coffers between. Returns the arch x's. */
function ceiling(i: ConcInfo, G: number[], piers: Record<string, Pier[]>): number[] {
  const { b, cf, cw } = i, top = cf + i.clear, pz = pillarZ(i);
  const apps = approaches(i.stairwells), mid = (i.paid[0] + i.paid[1]) / 2;
  const ok = (x: number) =>
    crossEdge(i, x, -1, piers) && crossEdge(i, x, 1, piers) && i.pillars.some(([px]) => px === x)
    && !apps.some((r) => x + 0.35 > r[0] && x - 0.35 < r[2]) && !i.openings.some((o) => x + 0.35 > o.x0 - 0.5 && x - 0.35 < o.x1 + 0.5);
  const arches = G.filter(ok).sort((p, q) => Math.abs(p - mid) - Math.abs(q - mid)).slice(0, 3).sort((p, q) => p - q);
  for (const x of G) {
    if (!arches.includes(x)) {
      for (const [p, q] of cut([-cw, cw], wellsAlongZ(i, x, 0.2))) b.deco(STONE, x - 0.2, top - 0.15, p, x + 0.2, top, q);
      continue;
    }
    const zs = i.pillars.filter(([px]) => px === x).map(([, z]) => z).sort((p, q) => p - q);
    const lo = crossEdge(i, x, -1, piers)!, hi = crossEdge(i, x, 1, piers)!;
    // Openings: wall pier (or stairwell wall) → pillar faces → wall pier.
    const edges = [lo.z, ...zs.flatMap((z) => [z - 0.42, z + 0.42]), hi.z];
    for (let j = 0; j + 1 < edges.length; j += 2) {
      const a = edges[j], c = edges[j + 1];
      if (c - a < 1) continue;
      arch(b, BRICK, 'z', x - 0.3, x + 0.3, a, c, cf + SPRING, cf + 2.86, top, U_BIG);
      b.deco(STONE, x - 0.32, cf + 2.79, (a + c) / 2 - 0.14, x + 0.32, top, (a + c) / 2 + 0.14);
    }
    // Where it springs from a stairwell's wall: a brick pilaster with a stone base and impost.
    for (const [e, side] of [[lo, -1], [hi, 1]] as const) {
      if (!e.well) continue;
      const f: WallFace = { axis: 'x', at: e.z, n: -side as Wall, u0: x - 0.4, u1: x + 0.4 };
      fbox(b, f, BRICK, x - 0.3, x + 0.3, cf + FOOT, cf + SPRING, 0, 0.07);
      fbox(b, f, STONE, x - 0.33, x + 0.33, cf + FOOT, cf + 0.3, 0, 0.1);
      fbox(b, f, STONE, x - 0.34, x + 0.34, cf + 2.3, cf + SPRING, 0, 0.11);
    }
  }
  if (G.length < 2) return arches;
  if (pz > 0) for (const z of [-pz, pz]) b.deco(STONE, G[0], top - 0.15, z - 0.2, G[G.length - 1], top, z + 0.2);
  // A shallow coffer in each bay, stepping up from the ribs, cut short at the stairwells.
  const coffer = (x0: number, z0: number, x1: number, z1: number, inset: number, depth: number) => {
    for (const { footprint: f } of spineWells(i)) {
      if (!meets(f, x0 - 0.1, z0 - 0.1, x1 + 0.1, z1 + 0.1)) continue;
      if (z0 >= 0) z1 = Math.min(z1, f[1] - 0.1);
      else if (z1 <= 0) z0 = Math.max(z0, f[3] + 0.1);
    }
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

/** The outer walls of the spine's stairwells: brick and plaster, blind arcading along, a cork board on each closed end. */
function dressWells(i: ConcInfo) {
  let v = 5;
  for (const w of spineWells(i)) {
    for (const f of stairwellFaces(i, w)) {
      brickFace(i, f, i.rand, { arcade: !f.end });
      if (f.end && f.u1 - f.u0 >= 1.6) corkFace(i, f, f.u0 + 0.3, f.u1 - 0.3, i.rand, v++);
    }
  }
}

// ── Concourse: the shops and the court ───────────────────────────────────────────────────────

/** A shop's sign painted in the arch above its bay, on a dark green board. */
function archSign(i: ConcInfo, bay: Bay | undefined, brand: Brand) {
  if (!bay || bay.x1 - bay.x0 < 2.2) return;
  const { s, x0, x1 } = bay, xm = (x0 + x1) / 2, w = Math.min(3, (x1 - x0) / 2 - 0.25), cf = i.cf;
  wbox(i, s, GREEN, xm - w / 2 - 0.05, xm + w / 2 + 0.05, cf + 2.41, cf + 2.81, 0.014, 0.024);
  i.b.sign({ k: 'shop', ja: brand.ja, en: brand.en, bg: brand.bg, fg: brand.fg }, xm, cf + 2.62, s * (i.cw - 0.03), [0, -s], w, 0.34);
}

/** A club banner hung on a rod in the arch above a bay. */
function clubBanner(i: ConcInfo, bay: Bay | undefined, club: Club) {
  if (!bay || bay.x1 - bay.x0 < 2.2) return;
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
  noren?: { color: string; text: string };
}

/** A shop front x0 … x1 on wall `s`, standing `depth` out: glazed with a door, or an open counter (its floor already claimed). */
function front(i: ConcInfo, s: Wall, x0: number, x1: number, o: FrontOpts) {
  const d = o.depth, { cf } = i, fy = cf + FY, xa = x0 + 0.15, xb = x1 - 0.15;
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
}

/** Kissa Renga: a glazed café front. */
const CAFE: Kind = {
  id: 'cafe', depth: 2.0, min: 2.4, max: 4.5,
  build(i, p, bay) {
    front(i, p.s, p.x0, p.x1, { depth: 0.8, kind: 'glazed', goods: PALETTES.cafe, door: p.x0 + 1.0 });
    archSign(i, bay, BRANDS.renga);
  },
};

/** Harunire: a set-meal counter with a noren, a board for the day's set and stools. */
const CANTEEN: Kind = {
  id: 'canteen', depth: 2.6, min: 2.4, max: 4.5,
  build(i, { s, x0, x1 }, bay) {
    const d = 1.2;
    front(i, s, x0, x1, { depth: d, kind: 'counter', goods: ['#e8e2d0', '#b23a3a', '#6aa84f'], noren: { color: '#1f2a44', text: '定食' } });
    archSign(i, bay, BRANDS.harunire);
    const { b, cf } = i, xm = (x0 + x1) / 2;
    b.sign({ k: 'label', text: '日替わり定食', sub: 'Daily set meal', fg: '#fff', bg: '#1f2a44' }, xm, cf + 2.02, s * (i.cw - 0.045), [0, -s], Math.min(1.6, x1 - x0 - 0.5), 0.28);
    stools(i, s, x0, x1, d, 'paint:#7a2a12');
  },
};

/** Stools along a counter `d` out from wall `s` (inside the claimed footprint). */
function stools(i: ConcInfo, s: Wall, x0: number, x1: number, d: number, seat: string) {
  const { b, cf } = i, n = Math.floor((x1 - x0 - 1) / 1.2);
  for (let k = 0; k < n; k++) {
    const x = x0 + 0.5 + (x1 - x0 - 1) * ((k + 0.5) / n), z = s * (i.cw - d - 0.35);
    b.block(x - 0.18, cf, z - 0.18, x + 0.18, cf + 0.71, z + 0.18);
    b.mesh(seat, 'cyl', x, cf + 0.68, z, 0.34, 0.06, 0.34);
    b.mesh(IRON, 'cyl', x, cf + 0.33, z, 0.06, 0.65, 0.06);
    b.mesh(IRON, 'cyl', x, cf + 0.015, z, 0.3, 0.03, 0.3);
  }
}

/** Kusunoki: a cheap curry counter, a noren, the day's price board, two stools. */
const CURRY: Kind = {
  id: 'curry', depth: 2.2, min: 2.3, max: 3.2,
  build(i, { s, x0, x1 }, bay) {
    const d = 1.0;
    front(i, s, x0, x1, { depth: d, kind: 'counter', goods: ['#c98a2b', '#f4efe2', '#7a2a12'], noren: { color: '#c98a2b', text: 'カレー' } });
    archSign(i, bay, BRANDS.kusunoki);
    i.b.sign({ k: 'label', text: '学生カレー 大盛無料', sub: 'Student curry, large free', fg: '#3d2014', bg: '#f2d16b' }, (x0 + x1) / 2, i.cf + 2.02, s * (i.cw - 0.045), [0, -s], Math.min(1.6, x1 - x0 - 0.5), 0.28);
    stools(i, s, x0, x1, d, 'paint:#c98a2b');
  },
};

/** Oto-no-Ha: second-hand records and instruments, a glazed front, a crate of LPs and a guitar stand outside. */
const RECORDS: Kind = {
  id: 'records', depth: 1.6, min: 2.2, max: 3.4,
  build(i, { s, x0, x1 }, bay) {
    const d = 0.7, { cf } = i;
    front(i, s, x0, x1, { depth: d, kind: 'glazed', goods: ['#1b1b1b', '#e84a6f', '#3c7dc4', '#f2c14e', '#1b1b1b', '#f4f1e6'], door: x1 - 0.85 });
    archSign(i, bay, BRANDS.otonoha);
    // The crate of LPs on its trestle, inside the claimed footprint.
    const ca = x0 + 0.3, cc = ca + 0.9, d0 = d + 0.2, d1 = d + 0.7;
    wbox(i, s, 'wood:#7a5a3a', ca, cc, cf + 0.45, cf + 0.75, d0, d1, true);
    wbox(i, s, 'none', ca, cc, cf, cf + 0.45, d0, d1, true);
    for (const x of [ca + 0.05, cc - 0.09]) wbox(i, s, IRON, x, x + 0.04, cf, cf + 0.45, d0 + 0.05, d1 - 0.05);
    for (let x = ca + 0.06; x < cc - 0.05; x += 0.045) {
      wbox(i, s, `flat:${FLYERS[Math.floor(i.rand() * FLYERS.length)]}`, x, x + 0.03, cf + 0.75, cf + 1.05, d0 + 0.08, d1 - 0.08);
    }
    i.b.sign({ k: 'label', text: '中古盤 100円〜', sub: 'Used records', fg: '#fff', bg: '#1b1b1b' }, (ca + cc) / 2, cf + 0.6, s * (i.cw - d1 - 0.006), [0, -s], 0.8, 0.24);
  },
};

/** Two drink machines and their recycling bins in a bay of their own (they check and claim their floor). */
const MACHINES: Kind = {
  id: 'machines', depth: 1.9, min: 2.1, max: 3.5, self: true,
  build(i, { s, x0, x1 }) {
    if (x1 - x0 >= 3.5) vendingRow(i, s, x0, 2, true);
    else vendingRow(i, s, (x0 + x1) / 2 - 1.05, 2, false);
  },
};

/** Coin lockers (they check and claim their floor). */
const LOCKERS: Kind = {
  id: 'lockers', depth: 1.6, min: 1.6, max: 3.2, self: true,
  build(i, { s, x0, x1 }) {
    const n = x1 - x0 >= 3.2 ? 2 : 1;
    lockers(i, s, (x0 + x1) / 2 - n * 0.8, n);
  },
};

/** One or two wooden benches against the wall (a globe lamp between two), the light-music club's banner above. */
const BENCHES: Kind = {
  id: 'benches', depth: 1.6, min: 2.2, max: 4.8, self: true,
  build(i, { s, x0, x1 }, bay) {
    const z = s * (i.cw - 0.75), xm = (x0 + x1) / 2;
    if (x1 - x0 >= 4.6) {
      bench(i, xm - 1.3, z, { axis: 'x', len: 1.8, color: '#2f4a3a', margin: 0.1 });
      bench(i, xm + 1.3, z, { axis: 'x', len: 1.8, color: '#2f4a3a', margin: 0.1 });
      lampStd(i, xm, s * (i.cw - 0.7));
    } else bench(i, xm, z, { axis: 'x', len: 1.8, color: '#2f4a3a', margin: 0.1 });
    clubBanner(i, bay, CLUBS[2]);
  },
};

/** The co-op: a glazed stationery shop with two self-service copiers standing in front. */
const COOP: Kind = {
  id: 'coop', depth: 1.9, min: 3.4, max: 4.5,
  build(i, { s, x0, x1 }, bay) {
    const d = 0.6;
    front(i, s, x0, x1, { depth: d, kind: 'glazed', goods: PALETTES.conbini, door: x0 + 1.0 });
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
  },
};

/** Fumikura: open shelves packed with spines, a table of piles, a bargain cart outside. */
const BOOKS_SHOP: Kind = {
  id: 'books', depth: 2.7, min: 4, max: 5,
  build(i, { s, x0, x1 }, bay) {
    const D = 1.3, { b, cf } = i, xa = x0 + 0.15, xb = x1 - 0.15;
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
  },
};

/**
 * The noticeboard court, wall side: a long cork wall, framed and densely pinned, headed 'club
 * notices', a poster or two over the flyers, the rowing club's banner in the arch above. The
 * strip in front is claimed so people can stop and read.
 */
const COURT: Kind = {
  id: 'court', depth: 1.0, min: 2.4, max: 5.6,
  build(i, { s, x0, x1: xe }, bay) {
    // Wide enough: two tatekan stand at its far end, against the wall.
    const x1 = xe - x0 >= 3.6 ? xe - 2.3 : xe;
    if (x1 < xe) for (let k = 0; k < 2; k++) tatekan(i, s, x1 + 0.1 + k * 1.1, CLUBS[(k + 4) % CLUBS.length]);
    const { cf } = i, u0 = x0 + 0.2, u1 = x1 - 0.2, y0 = cf + 0.72, y1 = cf + 2.18;
    wbox(i, s, CORK, u0, u1, y0, y1, 0.008, 0.022);
    for (const [p, q, a, c] of [[u0, u1, y0 - 0.05, y0], [u0, u1, y1, y1 + 0.05], [u0 - 0.05, u0, y0 - 0.05, y1 + 0.05], [u1, u1 + 0.05, y0 - 0.05, y1 + 0.05]]) {
      wbox(i, s, RAIL, p, q, a, c, 0.008, 0.034);
    }
    // Header board along the top of the cork.
    const xm = (u0 + u1) / 2;
    wbox(i, s, GREEN, u0, u1, y1 - 0.2, y1, 0.022, 0.03);
    i.b.sign({ k: 'label', text: 'サークル掲示板', sub: 'Club notices', fg: '#f4efe2', bg: '#2f4a3a' }, xm, y1 - 0.1, s * (i.cw - 0.032), [0, -s], Math.min(1.8, u1 - u0 - 0.2), 0.16);
    flyers(i.rand, u0 + 0.05, u1 - 0.05, y0 + 0.05, y1 - 0.25, (mat, a, c, ya, yb) => wbox(i, s, mat, a, c, ya, yb, 0.028, 0.03));
    const xs = u1 - u0 > 4 ? [u0 + 1.2, u1 - 1.2] : u1 - u0 > 1.4 ? [xm] : [];
    xs.forEach((x, k) => i.b.sign({ k: 'poster', v: 2 + k }, x, cf + 1.4, s * (i.cw - 0.036), [0, -s], 0.62, 0.88));
    clubBanner(i, bay, CLUBS[0]);
  },
};

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
const TATEKAN: Kind = {
  id: 'tatekan', depth: 0.95, min: 2.3, max: 6.9,
  build(i, { s, x0, x1 }, bay) {
    const n = Math.min(6, Math.floor((x1 - x0 + 0.02) / 1.12));
    const span = n * 0.8 + (n - 1) * 0.32, start = (x0 + x1) / 2 - span / 2;
    for (let k = 0; k < n; k++) tatekan(i, s, start + k * 1.12, CLUBS[(k + 1) % CLUBS.length]);
    flyers(i.rand, x0 + 0.2, x1 - 0.2, i.cf + 1.99, i.cf + 2.25, (mat, a, c, ya, yb) => wbox(i, s, mat, a, c, ya, yb, 0.008, 0.01), 0.8);
    clubBanner(i, bay, CLUBS[1]);
  },
};

/**
 * The bays nothing stands in: staff doors, a hose cabinet, meter cupboards and pasted flyers
 * along the wall (all flat), kept off the shops and the stretches beside a portal's approach.
 */
function wallBays(i: ConcInfo, bays: Bay[], items: Placed[]) {
  const hoses = new Set<number>();
  let k = 0;
  for (const bay of bays) {
    const { s } = bay, gaps = [...items.filter((q) => q.s === s).map((q): Span => [q.x0 - 0.15, q.x1 + 0.15]), ...approachGaps(i, s).map(([p, q]): Span => [p - 0.3, q + 0.3])];
    for (const [a, c] of cut([bay.x0 + 0.1, bay.x1 - 0.1], gaps)) {
      if (c - a < 1.0) continue;
      let u = a;
      if (!hoses.has(s) && c - u >= 0.95 && hoseCabinet(i, s, u + 0.1, { check: false })) {
        hoses.add(s);
        u += 1.0;
      }
      if (c - u >= 1.4 && k % 3 !== 2) {
        if (serviceDoor(i, s, u + 0.1, { check: false, color: 'paint:#2f4a3a', frame: 'metal:#3d3f42', label: null })) u += 1.36;
      } else if (c - u >= 1.1 && k % 3 === 2) {
        if (meterCupboard(i, s, u + 0.1, { check: false, mat: 'paint:#b9b2a2' })) u += 1.1;
      }
      k++;
      // Flyers pasted over whatever brick is left.
      if (c - u >= 0.8) flyers(i.rand, u + 0.15, c - 0.15, i.cf + 1.0, i.cf + 2.05, (mat, p, q, ya, yb) => wbox(i, s, mat, p, q, ya, yb, 0.01, 0.012), 0.55);
    }
  }
}

// ── The look ─────────────────────────────────────────────────────────────────────────────────

export const look: StationLook = {
  finishes: { wall: BRICK, floor: 'floor:#b9a284', pillar: BRICK, ceil: PLASTER },
  posters: false,
  skirting: false,

  lights(i) {
    const { b, cf } = i, top = cf + i.clear, G = grid(i), pz = pillarZ(i), bottom = cf + 2.42;
    const overWell = (x: number, z: number) => spineWells(i).some(({ footprint: f }) => meets(f, x - 0.5, z - 0.5, x + 0.5, z + 0.5));
    // One globe in each side coffer (none over a stairwell), two down the middle aisle.
    for (let k = 0; k + 1 < G.length; k++) {
      if (G[k + 1] - G[k] > 12) continue;
      const xm = (G[k] + G[k + 1]) / 2;
      if (pz > 0) for (const s of WALLS) if (!overWell(xm, (s * (pz + i.cw)) / 2)) pendant(b, xm, (s * (pz + i.cw)) / 2, top, bottom);
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
    if (!G.length) for (let x = i.paid[0] + 4; x < i.paid[1] - 3; x += 6) for (const z of [-i.cw / 2, i.cw / 2]) if (!overWell(x, z)) pendant(b, x, z, top, bottom);
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
    dressWells(i);
    const G = grid(i);

    // The shops go first, each in the stretch of free wall that fits it best; then the arcade is
    // laid round them, then the ceiling springs from its piers and the stairwells' walls.
    // In order along each wall (−x first): the court's cork wall faces its row of tatekan across
    // the spine at the west end.
    const items = planFronts(i, {
      '1': [BOOKS_SHOP, COURT, CAFE, CURRY, RECORDS, MACHINES, LOCKERS],
      '-1': [CANTEEN, TATEKAN, COOP, BENCHES, LOCKERS],
    });
    const { bays, piers } = arcade(i, G, items);
    const arches = ceiling(i, G, piers);
    for (const p of items) p.kind.build(i, p, bays.find((b) => b.s === p.s && (p.x0 + p.x1) / 2 > b.x0 && (p.x0 + p.x1) / 2 < b.x1));
    wallBays(i, bays, items);

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

  bay(r: RoomInfo) {
    // A transfer bay: the brick and plaster carried in, blind arcading with flyers along its walls
    // (clear of the stair and the portal's approach), a cork board on its end wall, globes over
    // the lobby.
    const wells = r.conc.stairwells.filter((w) => w.room === r.index);
    const fps = wells.map((w): Rect => w.footprint), apps = approaches(wells);
    const rr = seeded(r.index * 31 + r.station.id.length * 7);
    let v = r.index * 3 + 1;
    for (const f of r.faces) {
      const gaps = spansAlong(f, fps, 0.3), quiet = spansAlong(f, apps, 0);
      brickFace(r, f, rr, { arcade: f.axis === 'x', gaps, quiet });
      if (f.axis === 'z') {
        for (const [a, c] of cut([f.u0, f.u1], [...gaps, ...quiet])) if (c - a >= 1.6) corkFace(r, f, a + 0.3, c - 0.3, rr, v++);
      }
    }
    const top = r.cf + r.clear, [x0, z0, x1, z1] = r.rect, along = x1 - x0 >= z1 - z0;
    const [a0, a1] = along ? [x0, x1] : [z0, z1], cm = along ? (z0 + z1) / 2 : (x0 + x1) / 2;
    for (let u = a0 + 1.5; u <= a1 - 1.5; u += 3) {
      const [x, z] = along ? [u, cm] : [cm, u];
      if (fps.some((f) => meets(f, x - 0.6, z - 0.6, x + 0.6, z + 0.6)) || apps.some((q) => meets(q, x - 0.3, z - 0.3, x + 0.3, z + 0.3))) continue;
      pendant(r.b, x, z, top, r.cf + 2.42);
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
    if (campusExit(e)) libraryDoor(e);
    else flyers(r, ext + 0.4, L - 0.4, cf + 1.3, cf + 2.1, (mat, a, c, ya, yb) => b.deco(mat, -3.986, ya, a, -3.984, yb, c), 0.5);
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
    if (campusExit(e)) campusForecourt(e);
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
