// Shiokaze Line theme (2004): sea breeze. Bright white halls, slim steel, and a ceiling of
// transverse fins whose depth ripples along the platform like wind over water.
// See Plans/features/line-themes/plan.md.

import type { HallInfo, LineTheme } from './types';
import { hash, hexOf, shade } from './types';

const WHITE = 'paint:#f4f5f3';
const FIN = 'flat:#f2f3f1';
const STEEL = 'metal:#c9ced2';
const SHOE = 'metal:#b4b9be';
const WOOD = 'wood:#d8c3a0';

/** Fin depth below the ceiling: a slow sine swell along the platform. */
const finDepth = (x: number) => 0.275 + 0.175 * Math.sin((2 * Math.PI * x) / 18);

/** Height of the faceted vault's underside above `y` at z (the kit builds 9 flat strips). */
function vaultRise(h: HallInfo, z: number): number {
  const n = 9, w = (2 * h.wallZ) / n;
  const k = Math.min(n - 1, Math.max(0, Math.floor((z + h.wallZ) / w)));
  const zc = -h.wallZ + (k + 0.5) * w;
  return 1.6 * Math.sqrt(Math.max(0, 1 - (zc / h.wallZ) ** 2));
}

/** z-spans the fins and ribs cover: the island platform, or the whole box of a side-platform hall. */
const finSpan = (h: HallInfo): [number, number] => (h.island ? [-(h.pe - 0.1), h.pe - 0.1] : [-(h.wallZ - 0.1), h.wallZ - 0.1]);

export const theme: LineTheme = {
  opened: 2004,
  // Pale grey instead of the near-black default, so the hall reads bright end to end.
  soffitMat: 'flat:#c9cdd0',

  ceiling(h, seg, y) {
    const { b, pf, wallZ } = h;
    if (seg.vault) {
      // Slim white ribs every 3 m, one piece under each vault facet.
      const n = 9, w = (2 * wallZ) / n;
      for (let x = seg.x0 + 1.5; x <= seg.x1 - 0.04; x += 3) {
        if (h.blocked(x - 0.04, x + 0.04)) continue;
        for (let k = 0; k < n; k++) {
          const z0 = -wallZ + k * w, r = vaultRise(h, z0 + w / 2);
          b.deco(FIN, x - 0.035, y + r - 0.11, z0, x + 0.035, y + r + 0.005, z0 + w);
        }
      }
      return;
    }
    // Room left above the hanging signs (pf + 3.1) and the pf + 3.0 floor for anything hung.
    const room = y - pf - 3.2;
    if (room < 0.06) return;
    const [za, zb] = finSpan(h);
    // Fins on the half metre, so they fall between pillars (every 6 m on the whole metre).
    for (let x = Math.ceil(seg.x0 - 0.5) + 0.5; x <= seg.x1 - 0.025; x += 1) {
      if (x - 0.025 < seg.x0 || h.blocked(x - 0.025, x + 0.025)) continue;
      const d = Math.min(finDepth(x), room);
      b.deco(FIN, x - 0.0225, y - d, za, x + 0.0225, y + 0.005, zb);
    }
  },

  lights(h, seg, y) {
    // Two continuous cool strips flush with the ceiling, running between the fins.
    const { b } = h;
    const rows = h.island ? [-2.9, 2.9] : [-(h.pe + 2.2), h.pe + 2.2];
    for (const z of rows) {
      const top = seg.vault ? y + Math.min(vaultRise(h, z - 0.1), vaultRise(h, z + 0.1)) : y;
      b.deco('paint:#e6e7e6', seg.x0, top - 0.025, z - 0.1, seg.x1, top + 0.005, z + 0.1);
      b.deco('light', seg.x0, top - 0.032, z - 0.06, seg.x1, top - 0.02, z + 0.06);
    }
  },

  pillar(h, x, z, y0, y1) {
    // Paired white steel tubes along x, tied by plates, with an orange collar on each.
    const { b } = h;
    const plate = `flat:${shade(hexOf(h.style.pillar), 0.45)}`;
    for (const dx of [-0.14, 0.14]) {
      b.mesh(WHITE, 'cyl', x + dx, (y0 + y1) / 2, z, 0.16, y1 - y0, 0.16);
      b.mesh(`paint:${h.line.color}`, 'cyl', x + dx, y0 + 1.98, z, 0.2, 0.08, 0.2);
    }
    for (const py of [y0 + 0.35, (y0 + y1) / 2, y1 - 0.4]) b.deco(plate, x - 0.14, py - 0.06, z - 0.035, x + 0.14, py + 0.06, z + 0.035);
    // Low stainless shoe round both tube feet, and a thin head plate under the ceiling.
    b.deco(SHOE, x - 0.25, y0, z - 0.11, x + 0.25, y0 + 0.1, z + 0.11);
    b.deco(WHITE, x - 0.3, y1 - 0.03, z - 0.15, x + 0.3, y1 - 0.002, z + 0.15);
  },

  wallTrim(h, s) {
    const { b, pf, wallZ, H, line } = h;
    // Faces sit 0.02–0.03 m proud of the wall, backs buried 0.01 m in it.
    const zi = s * (wallZ - 0.03), zo = s * (wallZ + 0.01);
    const z0 = Math.min(zi, zo), z1 = Math.max(zi, zo);
    const tint = `paint:${shade(line.color, 0.45)}`;
    // One long orange line holds the drift together.
    b.deco(`paint:${line.color}`, -H, pf + 2.6, Math.min(s * (wallZ - 0.02), zo), H, pf + 2.63, Math.max(s * (wallZ - 0.02), zo));
    // Wind streaks: four staggered rows of short bars; the lowest row keeps to the wall runs (doorways).
    const rows = [pf + 2.42, pf + 2.78, pf + 3.0, pf + 3.2];
    const runs = h.wallRuns(s);
    const seed = s > 0 ? 7 : 19;
    let i = 0;
    rows.forEach((base, r) => {
      let x = -H + hash(r, seed) * 4;
      while (x < H) {
        i++;
        const len = 0.8 + 2.7 * hash(i, seed + 1);
        const t = 0.03 + 0.03 * hash(i, seed + 2);
        const yb = base + (hash(i, seed + 3) - 0.5) * (r === 0 ? 0.04 : 0.06);
        const xa = x, xb = Math.min(H, x + len);
        x = xb + 1.8 + 4 * hash(i, seed + 4);
        if (yb + t > h.ceilAt((xa + xb) / 2) - 0.05) continue;
        if (r === 0 && !runs.some(([a, c]) => xa >= a && xb <= c)) continue;
        const c = hash(i, seed + 5);
        const mat = c < 0.62 ? `paint:${line.color}` : c < 0.85 ? WHITE : tint;
        b.deco(mat, xa, yb, z0, xb, yb + t, z1);
      }
    });
  },

  bench(h, x, y, z, s) {
    const { b } = h;
    const cap = `paint:${h.line.color}`;
    if (s === 0) {
      // Back to back: two pale wood seats on a slim steel frame, one shared thin back.
      b.deco(STEEL, x - 0.85, y + 0.3, z - 0.025, x + 0.85, y + 0.82, z + 0.025);
      for (const k of [-1, 1]) {
        b.deco(STEEL, x - 0.85, y + 0.36, z + Math.min(k * 0.1, k * 0.42), x + 0.85, y + 0.39, z + Math.max(k * 0.1, k * 0.42));
        b.deco(WOOD, x - 0.84, y + 0.39, z + Math.min(k * 0.05, k * 0.47), x + 0.84, y + 0.43, z + Math.max(k * 0.05, k * 0.47));
      }
      for (const lx of [-0.65, 0.65]) {
        b.deco(STEEL, x + lx - 0.015, y + 0.03, z - 0.4, x + lx + 0.015, y + 0.36, z + 0.4);
        b.deco(SHOE, x + lx - 0.035, y, z - 0.44, x + lx + 0.035, y + 0.03, z + 0.44);
      }
      // Orange end caps tie it to the line.
      for (const ex of [-1, 1]) b.deco(cap, x + ex * 0.85 - 0.025, y + 0.3, z - 0.47, x + ex * 0.85 + 0.025, y + 0.6, z + 0.47);
      return;
    }
    // Against a side wall: single seat, thin back toward the wall (on the +s side).
    const zz = (a: number, c: number): [number, number] => [z + Math.min(s * a, s * c), z + Math.max(s * a, s * c)];
    const [sa, sb] = zz(-0.26, 0.16), [ra, rb] = zz(-0.2, 0.16), [ba, bb] = zz(0.18, 0.21), [fa, fb] = zz(-0.24, 0.24);
    b.deco(STEEL, x - 0.85, y + 0.33, ra, x + 0.85, y + 0.36, rb);
    b.deco(WOOD, x - 0.84, y + 0.36, sa, x + 0.84, y + 0.4, sb);
    b.deco(STEEL, x - 0.85, y + 0.3, ba, x + 0.85, y + 0.85, bb);
    for (const lx of [-0.65, 0.65]) {
      b.deco(STEEL, x + lx - 0.015, y + 0.03, fa, x + lx + 0.015, y + 0.33, fb);
      b.deco(SHOE, x + lx - 0.035, y, fa, x + lx + 0.035, y + 0.03, fb);
    }
    const [ca, cb] = zz(-0.27, 0.22);
    for (const ex of [-1, 1]) b.deco(cap, x + ex * 0.86 - 0.025, y + 0.3, ca, x + ex * 0.86 + 0.025, y + 0.6, cb);
  },
};
