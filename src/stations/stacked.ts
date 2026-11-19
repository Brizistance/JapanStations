// Hotarugawa (蛍川): stacked platforms. Under the narrow lane by the firefly stream there was no
// room for two tracks side by side, so they run one above the other (LineDef.stackAt; the
// tracks converge and climb apart between stations, sim/geometry.ts). Each level is a single
// track with its platform on the −z side, the up track's directly over the down track's.
// Stairs at both ends join the two platforms; one stair climbs from the upper platform to the
// concourse. Night-green tile, and on the lower level a ceiling of tiny lights like fireflies.
//
// Frame: +x along the line, both tracks at z = +STACK_LATERAL; platforms z ∈ [−W, pe].

import { HALL_HALF, PLATFORM_HALF, STACK_DY, STACK_LATERAL } from '../sim/geometry';
import { BED, CONC_RISE, PF_H, SLAB, ceilingLight, psd, rail, stairs, type Ctx } from './kit';
import { STREET_CW, concourse, stairInfo, type Rect } from './build';
import type { UndergroundSpec } from './specs';
import { surface } from './surface';

/** Side walls (|z|), platform edge, and the inter-level stair's run. */
const W = STACK_LATERAL + 2.2;
const PE = STACK_LATERAL - 1.48;
/** Stairs and their rails against the −z wall. */
const SZ0 = -W + 0.1, SZ1 = -W + 2.6;

export function buildStacked(c: Ctx, spec: UndergroundSpec) {
  const { b, line, station, railY, style } = c;
  const H = HALL_HALF, P = PLATFORM_HALF;
  const nums = station.platforms[line.id];
  const lo = { rail: railY, pf: railY + PF_H, track: 'down' as const, num: nums[0] };
  const hi = { rail: railY + STACK_DY, pf: railY + STACK_DY + PF_H, track: 'up' as const, num: nums[1] };
  const loCeil = lo.pf + 4.2;
  const cf = hi.pf + CONC_RISE, hiCeil = cf - SLAB;
  const top = cf;
  const [cx0, cx1] = spec.concourse;

  // Inter-level stairs at both ends, climbing +x on the lower platform.
  const run = Math.round((hi.pf - lo.pf) * 1.7 * 100) / 100;
  const links: Rect[] = [[-52, SZ0, -52 + run, SZ1], [52 - run, SZ0, 52, SZ1]];
  // The stair to the concourse, on the upper platform.
  const crun = Math.round(CONC_RISE * 1.7 * 100) / 100;
  const up: Rect = [4, SZ0, 4 + crun, SZ1];

  // ── Structure ──
  // Side walls, floor to the concourse slab.
  for (const s of [-1, 1]) b.box(style.wall, -H, lo.rail - 1, s > 0 ? W : -W - 0.5, H, top, s > 0 ? W + 0.5 : -W);
  // Lower level: platform and track bed.
  b.box('concreteDark', -H, lo.rail - 1, -W, H, lo.pf, PE);
  b.box('concreteDark', -H, lo.rail - 1, PE, H, lo.rail - BED - 0.05, W);
  // The upper level's floor: platform slab over the lower platform (with the stair wells), and
  // the upper track bed over the lower track.
  b.slab('concreteDark', -H, -W, H, PE, loCeil, hi.pf, links);
  b.box('concreteDark', -H, loCeil, PE, H, hi.rail - BED - 0.05, W);
  // Upper level ceiling outside the concourse (under it, the concourse floor is the ceiling).
  if (cx0 > -H) b.box('concreteDark', -H, hiCeil, -W - 0.5, cx0, top, W + 0.5);
  if (cx1 < H) b.box('concreteDark', cx1, hiCeil, -W - 0.5, H, top, W + 0.5);
  // End walls, with a tunnel mouth for each level's track.
  for (const s of [-1, 1]) {
    const xa = s > 0 ? H : -H - 0.5, xb = xa + 0.5, m0 = STACK_LATERAL - 2.2;
    b.box('concreteDark', xa, lo.rail - 1, -W - 0.5, xb, top, m0);
    b.box('concreteDark', xa, lo.rail - 1, W, xb, top, W + 0.5);
    b.box('concreteDark', xa, lo.rail + 4.65, m0, xb, hi.rail - BED, W);
    b.box('concreteDark', xa, hi.rail + 4.65, m0, xb, top, W);
  }

  // ── Each level ──
  for (const L of [lo, hi]) {
    const isLo = L === lo, ceil = isLo ? loCeil : hiCeil;
    // Floor finish, screen doors and end barriers.
    b.slab(style.floor, -P, -W, P, PE, L.pf - 0.02, L.pf, isLo ? [] : links);
    psd(c, PE, -1, L.track, L.pf);
    for (const s of [-1, 1]) b.box('panel:#d5d8db', s > 0 ? P - 0.15 : -P, L.pf, -W, s > 0 ? P : -P + 0.15, L.pf + 2.4, PE);
    // Ceiling over the platform; a dark soffit over the track.
    b.deco('flat:#26282b', -H, ceil - 0.02, PE, H, ceil, W);
    // Wall finish on the platform side: green tile, a gold stripe; the track wall darker.
    const wz = -W + 0.02;
    b.deco('flat:#4b4d50', -P, L.pf, -W, P, L.pf + 0.13, wz);
    b.deco(`paint:${line.color}`, -H, L.pf + 2.62, -W, H, L.pf + 2.8, wz);
    b.deco(`paint:${style.accent}`, -H, L.pf + 2.56, -W, H, L.pf + 2.62, wz);
    b.deco(`paint:${line.color}`, -H, L.pf + 2.62, W - 0.02, H, L.pf + 2.8, W);
    // Lights along the platform.
    for (let x = -P + 2; x + 3 <= P; x += 5) {
      if (isLo) continue;
      if (x + 3 > up[0] - 0.5 && x < up[2] + 0.5) continue;
      ceilingLight(b, x, x + 3, -1.6, -1.4, ceil);
    }
    // Name boards on the track wall, posters and boards on the platform wall.
    for (let x = -52; x <= 52; x += 13) {
      b.sign({ k: 'name', station: station.id, line: line.id }, x, L.pf + 1.75, W - 0.03, [0, -1], 2.7, 0.9, { arrow: [1, 0] });
    }
    // Signs and departure boards hung over the platform, clear of the stairs.
    const stairsHere = isLo ? links : [...links, up];
    const clear = (x: number, m: number) => !stairsHere.some((r) => x > r[0] - m && x < r[2] + m);
    for (const x of [-30, 30]) if (clear(x, 2)) b.hang({ k: 'dir', station: station.id, line: line.id, dir: L.track }, x, L.pf + 2.72, -0.6, 3.3, 0.46, { ceil });
    for (const x of [-20, 20]) if (clear(x, 2)) b.screen({ k: 'dep', station: station.id, line: line.id, dir: L.track }, x, L.pf + 2.45, -0.6, 3.0, 0.72, { ceil, dynamic: true });
    // Benches against the wall.
    for (let x = -42; x <= 42; x += 12) {
      if (!clear(x, 1.5)) continue;
      const z = -W + 0.45;
      b.block(x - 0.9, L.pf, z - 0.28, x + 0.9, L.pf + 0.4, z + 0.28);
      b.deco('metal:#7f858b', x - 0.9, L.pf, z - 0.28, x + 0.9, L.pf + 0.4, z + 0.28);
      b.deco(`paint:${style.accent}`, x - 0.92, L.pf + 0.4, z - 0.3, x + 0.92, L.pf + 0.46, z + 0.3);
    }
    b.keepOut(-H, L.rail - 1.5, PE + 0.3, H, L.pf - 0.3, W, `${line.nameEn} track`);
    b.zone('platform', -P, L.pf - 0.5, -W, P, L.pf + 3, PE, `${line.nameJa} ${L.num}番線ホーム`, `${line.nameEn} platform ${L.num}`, false, line.id);
  }

  // ── Fireflies: the lower level's ceiling, deep green, scattered with tiny warm lights ──
  b.deco('flat:#16261f', -H, loCeil - 0.03, -W, H, loCeil - 0.01, PE);
  let seed = 977;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 260; i++) {
    const x = -P + rnd() * 2 * P, z = -W + 0.3 + rnd() * (PE - (-W) - 0.6), drop = rnd() * 0.5;
    if (links.some((r) => x > r[0] - 0.3 && x < r[2] + 0.3 && z < r[3] + 0.3)) continue;
    const d = 0.04 + rnd() * 0.05;
    b.deco(rnd() < 0.7 ? 'glow:#d8f06a' : 'glow:#fff2a8', x - d, loCeil - 0.05 - drop, z - d, x + d, loCeil - 0.05 - drop + 2 * d, z + d);
    if (drop > 0.05) b.deco('flat:#2a2c2a', x - 0.004, loCeil - 0.05 - drop + 2 * d, z - 0.004, x + 0.004, loCeil - 0.03, z + 0.004);
  }
  // A soft cove light along the lower level's wall, so the platform is not dark.
  b.deco('light', -P, loCeil - 0.4, -W + 0.02, P, loCeil - 0.36, -W + 0.2);
  b.deco('light', -P, lo.pf + 0.6, PE - 0.5, P, lo.pf + 0.62, PE - 0.3);

  // ── Stairs ──
  for (const r of links) {
    stairs(b, { x0: r[0], x1: r[2], z0: r[1], z1: r[3], yLow: lo.pf, yHigh: hi.pf, rails: [true, false] });
    // On the upper level: rails round the well, open at the top end.
    rail(b, r[0] - 0.1, r[3], r[2] - 1.4, r[3] + 0.08, hi.pf);
    rail(b, r[0] - 0.1, r[1], r[0] - 0.02, r[3] + 0.08, hi.pf);
    b.sign({ k: 'guide', ja: `${lo.num}番線`, en: `Platform ${lo.num}`, bg: 'yellow', arrow: 'down' }, r[2] + 0.6, hi.pf + 2.4, -2.0, [1, 0], 2.0, 0.42);
    b.sign({ k: 'guide', ja: `${hi.num}番線`, en: `Platform ${hi.num}`, bg: 'yellow', arrow: 'up' }, r[0] - 0.6, lo.pf + 2.4, -2.0, [-1, 0], 2.0, 0.42);
  }
  stairs(b, { x0: up[0], x1: up[2], z0: up[1], z1: up[3], yLow: hi.pf, yHigh: cf, rails: [true, false] });
  rail(b, up[0] - 0.1, up[3], up[2] - 1.4, up[3] + 0.08, cf);
  rail(b, up[0] - 0.1, up[1], up[0] - 0.02, up[3] + 0.08, cf);
  b.sign({ k: 'guide', ja: '出口', en: 'Exit', bg: 'yellow', arrow: 'up' }, up[0] - 0.6, hi.pf + 2.4, -2.0, [-1, 0], 2.3, 0.42);
  const info = stairInfo(b, line, 'platform', [...nums], up, up[2] + 0.8, (up[1] + up[3]) / 2, [-1, 0]);

  // ── Concourse and street ──
  const ends = spec.gates.map((g, i) => ({
    g: g === 'hi' ? cx1 - 16 : cx0 + 16,
    hi: g === 'hi',
    nums: [String(i * 2 + 1), String(i * 2 + 2)] as [string, string],
  }));
  const cw = spec.width ?? STREET_CW;
  concourse(c, { cf, cw, x0: cx0, x1: cx1, holes: [up], ends, pillarZ: 3.4, ext: STREET_CW - cw, solids: [], stairs: [info] });
  surface(b, spec.surface, STREET_CW, { ja: station.nameJa, en: station.nameRomaji });
}
