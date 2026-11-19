// Entry areas (CLAUDE.md rule 9): every station's street entrances, stairwells and ticket hall
// are its own. A station listed in ENTRY gets
//   · a street entrance in one of the forms below, in its own colours (replaces the kit's
//     glass canopy),
//   · its own stairwell: wall cladding, a colour stripe, handrails and lamps up the stair,
//   · its own ticket-hall finishes (walls, floor, pillars, ceiling), under any the look sets.
// Hero stations with their own canopy and exit hooks keep them and are not listed here.
//
// Frame (kit.ts exit()): the stair climbs +x from x = 0 (concourse, cf) to x = run (street, gy),
// between walls at z = ext + 1.2 and ext + 4.0; the entrance sign faces +x at x = run + 0.06,
// y = gy + 2.2, z = ext + 2.6. Keep the stair mouth open to 2.3 m.

import { ENTRY, type EntrySpec } from './entry-specs';
import type { StationId } from '../data/types';
import { fillHall, floorLines } from './fill';
import { exitDado } from './looks/parts';
import type { ExitInfo, StationLook } from './looks/types';

export { ENTRY, type EntrySpec, type StreetForm } from './entry-specs';

/** The look with this station's entry area layered on (unchanged if it has none). */
export function withEntry(stationId: string, look: StationLook): StationLook {
  const spec = ENTRY[stationId as StationId];
  if (!spec) return look;
  return {
    ...look,
    finishes: { ...spec.hall, ...look.finishes },
    canopy: (e) => street(e, spec),
    concourse: (i) => {
      look.concourse?.(i);
      floorLines(i, spec.routes);
      if (spec.fill) fillHall(i, spec.fill);
    },
    exit: (e) => well(e, spec),
  };
}

// ── Stairwell ──

const stairY = (e: ExitInfo, x: number) => e.cf + ((e.gy - e.cf) * Math.max(0, Math.min(e.run, x))) / e.run;

function well(e: ExitInfo, s: EntrySpec) {
  const { b, ext, run, gy } = e, w = s.well;
  exitDado(e, { mat: w.clad, top: w.height, cap: `paint:${w.stripe}` });
  const near = ext + 1.2, far = ext + 4;
  // Handrails both sides on brackets, sloping with the stair.
  const rise = gy - e.cf;
  for (const [z, f] of [[near, 1], [far, -1]] as const) {
    b.slant(`metal:${w.rail}`, 0, e.cf + 0.85, Math.min(z + f * 0.05, z + f * 0.1), run, e.cf + 0.9, Math.max(z + f * 0.05, z + f * 0.1), rise);
    for (let x = 1; x < run; x += 2.5) {
      const y = stairY(e, x) + 0.85;
      b.deco('metal:#6f7479', x - 0.02, y - 0.05, Math.min(z + f * 0.01, z + f * 0.05), x + 0.02, y, Math.max(z + f * 0.01, z + f * 0.05));
    }
  }
  // Lamps up the stair walls, where the wall still stands above them (it ends 1 m over the street).
  const wallTop = gy + 1.0;
  if (w.lamps === 'strip') {
    // A continuous light line just over the cladding, sloping with the stair, up to where the
    // wall ends above the street.
    const y0 = e.cf + w.height + 0.12, xe = Math.min(run, ((wallTop - 0.06 - y0) * run) / rise);
    if (xe > 0.5) for (const [z, f] of [[near, 1], [far, -1]] as const) {
      b.slant('light', 0, y0, Math.min(z + f * 0.012, z + f * 0.04), xe, y0 + 0.05, Math.max(z + f * 0.012, z + f * 0.04), (rise * xe) / run);
    }
    return;
  }
  for (let x = 2; x < run - 1; x += 4) {
    const y = stairY(e, x) + 2.3;
    if (y + 0.3 > wallTop) break;
    for (const [z, f] of [[near, 1], [far, -1]] as const) {
      if (w.lamps === 'globe') {
        b.deco('metal:#3a3f45', x - 0.03, y + 0.12, Math.min(z, z + f * 0.22), x + 0.03, y + 0.16, Math.max(z, z + f * 0.22));
        b.mesh('light', 'sphere', x, y, z + f * 0.26, 0.24, 0.24, 0.24);
      } else {
        b.deco(`paint:${w.stripe}`, x - 0.3, y - 0.08, Math.min(z + f * 0.01, z + f * 0.05), x + 0.3, y + 0.16, Math.max(z + f * 0.01, z + f * 0.05));
        b.deco('light', x - 0.24, y - 0.04, Math.min(z + f * 0.05, z + f * 0.07), x + 0.24, y + 0.12, Math.max(z + f * 0.05, z + f * 0.07));
      }
    }
  }
}

// ── Street entrances ──

function street(e: ExitInfo, s: EntrySpec) {
  const { b, gy, run, ext } = e;
  const g = { X0: -0.6, X1: run + 0.7, Z0: ext + 0.6, Z1: ext + 4.6, zn: ext + 1.05, zf: ext + 4.15 };
  const F = `paint:${s.frame}`, T = `paint:${s.trim}`;
  const board = (mat = 'flat:#22262b') => b.deco(mat, run - 0.04, gy + 1.88, ext + 1.1, run + 0.05, gy + 2.52, ext + 4.1);
  const sideGlass = (y1: number, x0 = 0, x1 = run) => {
    if (x1 - x0 < 0.1) return;
    b.deco('glass', x0, gy + 1.0, ext + 1.02, x1, gy + y1, ext + 1.08);
    b.deco('glass', x0, gy + 1.0, ext + 4.12, x1, gy + y1, ext + 4.18);
  };
  const posts = (mat: string, top: number, every: number, half = 0.07, zs = [g.zn, g.zf]) => {
    const np = Math.max(1, Math.ceil(run / every));
    for (let k = 0; k <= np; k++) {
      const x = (run * k) / np;
      for (const z of zs) b.box(mat, x - half, gy, z - half, x + half, gy + top, z + half);
    }
  };

  switch (s.street) {
    case 'vault': {
      // A barrel vault of tinted glass on arched ribs.
      const n = 7, sw = (g.Z1 - g.Z0) / n;
      const h = (k: number) => 2.6 + 0.6 * Math.sin((Math.PI * (k + 0.5)) / n);
      for (let k = 0; k < n; k++) b.deco('glassTint', g.X0, gy + h(k), g.Z0 + k * sw, g.X1, gy + h(k) + 0.04, g.Z0 + (k + 1) * sw);
      const nr = Math.max(2, Math.ceil(run / 3.5));
      for (let r = 0; r <= nr; r++) {
        const x = g.X0 + 0.1 + ((g.X1 - g.X0 - 0.2) * r) / nr;
        for (let k = 0; k < n; k++) b.deco(F, x - 0.05, gy + h(k) - 0.1, g.Z0 + k * sw, x + 0.05, gy + h(k), g.Z0 + (k + 1) * sw);
      }
      posts(`metal:${s.frame}`, 2.65, 3.5, 0.06);
      b.deco(T, g.X1 - 0.02, gy + 2.52, g.Z0, g.X1, gy + 2.6, g.Z1);
      sideGlass(2.5);
      board();
      break;
    }
    case 'portal': {
      // Two white piers and a lintel banded in the accent colour; roofed only over the mouth.
      const xr = Math.max(0, run - 5);
      for (const [z0, z1] of [[ext + 0.45, ext + 1.2], [ext + 4.0, ext + 4.75]]) {
        b.box(F, run - 0.1, gy, z0, run + 0.55, gy + 3.05, z1);
        b.deco(T, run + 0.55, gy + 2.6, z0, run + 0.57, gy + 2.78, z1);
      }
      b.deco(F, run - 0.1, gy + 2.55, ext + 1.2, run + 0.55, gy + 3.05, ext + 4.0);
      b.deco(T, run + 0.55, gy + 2.6, ext + 1.2, run + 0.57, gy + 2.78, ext + 4.0);
      b.deco(F, xr, gy + 3.05, ext + 0.45, run + 0.55, gy + 3.2, ext + 4.75);
      sideGlass(2.55, xr, run - 0.1);
      // Low glass balustrades with a top rail along the rest of the opening.
      for (const z of [g.zn, g.zf]) {
        if (xr > 0.1) b.deco('glass', 0, gy + 1.0, z - 0.03, xr, gy + 1.1, z + 0.03);
        b.deco(`metal:#c3c7cb`, 0, gy + 1.1, z - 0.04, run - 0.1, gy + 1.15, z + 0.04);
      }
      board();
      break;
    }
    case 'open': {
      // No roof: railings on the parapets, a sign gantry over the mouth, lamp posts at the back.
      for (const z of [g.zn, g.zf]) {
        b.deco(T, 0, gy + 1.0, z - 0.17, run, gy + 1.05, z + 0.17);
        b.deco(F, 0, gy + 1.38, z - 0.03, run, gy + 1.43, z + 0.03);
        for (let x = 0; x <= run; x += 1.5) b.deco(F, x - 0.025, gy + 1.05, z - 0.025, x + 0.025, gy + 1.38, z + 0.025);
      }
      for (const z of [ext + 0.8, ext + 4.4]) {
        b.box(F, run + 0.2, gy, z - 0.08, run + 0.36, gy + 2.7, z + 0.08);
        b.mesh('light', 'sphere', run + 0.28, gy + 2.86, z, 0.3, 0.3, 0.3);
      }
      b.deco(F, run + 0.12, gy + 2.52, ext + 0.72, run + 0.44, gy + 2.62, ext + 4.48);
      b.deco(T, run + 0.12, gy + 2.62, ext + 0.72, run + 0.44, gy + 2.66, ext + 4.48);
      for (const z of [ext + 0.75, ext + 4.45]) {
        b.box(F, -0.48, gy, z - 0.06, -0.36, gy + 3.4, z + 0.06);
        b.mesh('light', 'sphere', -0.42, gy + 3.58, z, 0.36, 0.36, 0.36);
      }
      board();
      break;
    }
    case 'pavilion': {
      // Timber posts and beams under a stepped gable of roof tiles, ridge along the stair.
      posts(`wood:${s.frame}`, 2.6, 3, 0.09);
      for (const z of [g.zn, g.zf]) b.deco(`wood:${s.frame}`, g.X0 + 0.2, gy + 2.45, z - 0.1, g.X1 - 0.2, gy + 2.62, z + 0.1);
      const steps = 9, rise = 0.11, mid = (g.Z0 + g.Z1) / 2, half = (g.Z1 - g.Z0) / 2 + 0.3;
      for (let k = 0; k < steps; k++) {
        const d0 = half - (half * k) / steps, d1 = half - (half * (k + 1)) / steps, y = gy + 2.62 + k * rise;
        b.deco('roof', g.X0 - 0.3, y, mid - d0, g.X1 + 0.3, y + 0.14, mid - d1 + 0.05);
        b.deco('roof', g.X0 - 0.3, y, mid + d1 - 0.05, g.X1 + 0.3, y + 0.14, mid + d0);
        // Gable boards at both ends.
        for (const x of [g.X0 - 0.3, g.X1 + 0.28]) b.deco(`wood:${s.frame}`, x, gy + 2.62, mid - d1, x + 0.02, y + 0.14, mid + d1);
      }
      b.deco(`paint:${s.trim}`, g.X0 - 0.35, gy + 2.62 + steps * rise, mid - 0.15, g.X1 + 0.35, gy + 2.62 + steps * rise + 0.12, mid + 0.15);
      board(`wood:${s.trim}`);
      break;
    }
    case 'brick': {
      // A small brick house over the stair: walls above the parapets, a flat roof and cornice.
      const B = `brick:${s.frame}`;
      b.deco(B, 0, gy, g.Z0, run, gy + 2.7, ext + 1.19);
      b.deco(B, 0, gy, ext + 4.01, run, gy + 2.7, g.Z1);
      b.deco(B, g.X0, gy, g.Z0, 0, gy + 2.7, g.Z1);
      for (const [z0, z1] of [[g.Z0, ext + 1.19], [ext + 4.01, g.Z1]]) b.deco(B, run, gy, z0, run + 0.4, gy + 2.7, z1);
      b.deco('concrete', g.X0 - 0.1, gy + 2.7, g.Z0 - 0.1, g.X1, gy + 2.95, g.Z1 + 0.1);
      b.deco(`paint:${s.trim}`, g.X0 - 0.12, gy + 2.95, g.Z0 - 0.12, g.X1 + 0.02, gy + 3.05, g.Z1 + 0.12);
      b.deco('flat:#d8d2c4', run + 0.4, gy + 2.55, g.Z0, run + 0.45, gy + 2.7, g.Z1);
      // Small windows along the walls, lit from inside.
      for (let x = 2; x + 1 < run; x += 5) for (const [z, f] of [[g.Z0, -1], [g.Z1, 1]] as const) {
        b.deco('glow:#f3dcae', x, gy + 1.5, Math.min(z, z + f * 0.02), x + 0.8, gy + 2.2, Math.max(z, z + f * 0.02));
      }
      board(`paint:${s.trim}`);
      break;
    }
    case 'slab': {
      // A thin concrete slab rising towards the street, on one row of posts.
      const n = Math.max(3, Math.ceil(run / 4));
      for (let k = 0; k < n; k++) {
        const xa = g.X0 + ((g.X1 - g.X0) * k) / n, xb = g.X0 + ((g.X1 - g.X0) * (k + 1)) / n, y = gy + 2.6 + (0.45 * k) / n;
        b.deco('concrete', xa, y, g.Z0 - 0.2, xb, y + 0.16, g.Z1);
      }
      b.deco(`paint:${s.trim}`, g.X1, gy + 3.0, g.Z0 - 0.2, g.X1 + 0.03, gy + 3.2, g.Z1);
      posts('concrete', 2.6, 4, 0.12, [g.zf]);
      b.deco('glass', 0, gy + 1.0, ext + 1.02, run, gy + 1.15, ext + 1.08);
      b.deco(`metal:${s.frame}`, 0, gy + 1.15, ext + 1.0, run, gy + 1.19, ext + 1.1);
      sideGlass(2.5, 0, run);
      board();
      break;
    }
    case 'louvre': {
      // A dark steel frame with a roof of louvre fins over glass, a glowing strip under the beams.
      posts(`metal:${s.frame}`, 2.8, 3, 0.08);
      for (const z of [g.zn, g.zf]) {
        b.deco(F, g.X0, gy + 2.62, z - 0.1, g.X1, gy + 2.82, z + 0.1);
        b.deco(`glow:${s.trim}`, g.X0 + 0.1, gy + 2.6, z - 0.03, g.X1 - 0.1, gy + 2.62, z + 0.03);
      }
      for (const x of [g.X0, g.X1 - 0.2]) b.deco(F, x, gy + 2.62, g.Z0, x + 0.2, gy + 2.82, g.Z1);
      for (let x = g.X0 + 0.3; x < g.X1 - 0.2; x += 0.35) b.deco(F, x, gy + 2.82, g.Z0, x + 0.05, gy + 3.08, g.Z1);
      b.deco('glassRoof', g.X0, gy + 3.09, g.Z0, g.X1, gy + 3.12, g.Z1);
      sideGlass(2.6);
      board();
      break;
    }
    case 'glassbox': {
      // Glass walls to the roof between slim mullions, a roof with rounded eaves and an accent band.
      sideGlass(2.6);
      b.deco('glass', -0.33, gy + 1.0, ext + 1.05, -0.27, gy + 2.6, ext + 4.15);
      for (let x = 0; x <= run + 0.01; x += 1.2) for (const z of [ext + 1.05, ext + 4.15]) b.deco(F, x - 0.04, gy + 1.0, z - 0.06, x + 0.04, gy + 2.6, z + 0.06);
      for (const z of [ext + 1.05, ext + 4.15]) b.box(F, run - 0.08, gy, z - 0.08, run + 0.08, gy + 2.6, z + 0.08);
      b.deco(F, g.X0, gy + 2.6, g.Z0, g.X1, gy + 2.78, g.Z1);
      // Rounded eaves: three steps in, each a little higher.
      for (let k = 1; k <= 3; k++) b.deco(F, g.X0 + k * 0.12, gy + 2.78 + (k - 1) * 0.06, g.Z0 + k * 0.12, g.X1 - k * 0.12, gy + 2.78 + k * 0.06, g.Z1 - k * 0.12);
      b.deco(T, g.X0 - 0.01, gy + 2.64, g.Z0 - 0.01, g.X1 + 0.01, gy + 2.72, g.Z1 + 0.01);
      board();
      break;
    }
  }
}
