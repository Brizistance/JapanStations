// Kawaminato-kō below ground (2026-11-24, stage 3 of the station's rebuild): the harbour, kept to the station's own
// plan (the default look's shops, islands and posters stay, atrium.ts's gallery and gates too) and dressed as the
// brick port above it. Red brick walls over a granite floor; riveted steel columns; steel girders across the
// ceiling with green enamel cargo lamps hung between them; a rope handrail along the walls on brass brackets;
// life rings; framed harbour prints; a ship model in a case in each unpaid hall; porthole lights down the exits.

import type { Builder } from '../../world/builder';
import { defaultLook } from './default';
import type { ConcInfo, ExitInfo, StationLook } from './types';

const STEEL = 'metal:#3d5560', STEEL_D = 'metal:#2e3f48', RIVET = 'metal:#566e79', ROPE = 'flat:#c9b17a', BRASS = 'flat:#b08d3a';
const ENAMEL = 'flat:#2f5a46', RED = 'flat:#c8402a', WHITE = 'flat:#f4f1e8';

/** A life ring on a wall: four segments, red and white, the wall's normal (nx, nz). */
function lifeRing(b: Builder, x: number, y: number, z: number, nx: number, nz: number) {
  const R = 0.34, T = 0.09;
  // (Drawn as the four sides of a square ring, alternate colours; a hook above.)
  const along = nx === 0 ? 'x' : 'z';
  const o = 0.03;
  const box = (mat: string, u0: number, u1: number, y0: number, y1: number) =>
    along === 'x' ? b.deco(mat, x + u0, y0, z + nz * o - 0.04, x + u1, y1, z + nz * o + 0.04) : b.deco(mat, x + nx * o - 0.04, y0, z + u0, x + nx * o + 0.04, y1, z + u1);
  box(RED, -R, R, y + R - T, y + R);
  box(RED, -R, R, y - R, y - R + T);
  box(WHITE, -R, -R + T, y - R + T, y + R - T);
  box(WHITE, R - T, R, y - R + T, y + R - T);
  box(BRASS, -0.03, 0.03, y + R, y + R + 0.12);
}

/** Lengths of wall along a long wall (z = s·cw) clear of its openings and of anything standing in front (free). */
function wallRuns(i: ConcInfo, s: 1 | -1, depth: number): [number, number][] {
  const out: [number, number][] = [];
  const z0 = s > 0 ? i.cw - depth : -i.cw, z1 = s > 0 ? i.cw : -i.cw + depth;
  let a: number | null = null;
  for (let x = i.x0 + 0.5; x <= i.x1 - 0.5; x += 0.5) {
    const ok = x + 0.5 < i.x1 && i.free(x, z0, x + 0.5, z1) && !i.openings.some((o) => o.s === s && x + 0.5 > o.x0 - 0.3 && x < o.x1 + 0.3);
    if (ok && a === null) a = x;
    if (!ok && a !== null) { if (x - a >= 2) out.push([a, x]); a = null; }
  }
  return out;
}

function harbourDress(i: ConcInfo) {
  const { b, cf } = i;
  // The rope handrail at 0.95 m on brass brackets, along both long walls where nothing stands; life rings and
  // framed harbour prints over it on the longer runs.
  for (const s of [-1, 1] as const) {
    const zw = s * i.cw, n = -s;
    let k = 0;
    for (const [a, e] of wallRuns(i, s, 0.25)) {
      b.deco(ROPE, a + 0.1, cf + 0.92, zw + n * 0.12 - 0.035, e - 0.1, cf + 0.99, zw + n * 0.12 + 0.035);
      for (let x = a + 0.4; x < e - 0.2; x += 1.8) b.deco(BRASS, x - 0.03, cf + 0.88, Math.min(zw, zw + n * 0.13), x + 0.03, cf + 0.96, Math.max(zw, zw + n * 0.13));
      for (let x = a + 3; x < e - 3; x += 9, k++) {
        if (k % 3 === 0) lifeRing(b, x, cf + 1.75, zw, 0, n);
        else {
          b.deco(STEEL_D, x - 0.75, cf + 1.3, Math.min(zw, zw + n * 0.03), x + 0.75, cf + 2.3, Math.max(zw, zw + n * 0.03));
          b.sign({ k: 'mural', v: k % 3 === 1 ? 'harbour' : 'gulls', color: '#1d3550' }, x, cf + 1.8, zw + n * 0.04, [0, n], 1.38, 0.88);
        }
      }
    }
  }
  // A ship model in a glass case in each unpaid hall: the Kawaminato-maru, the first steamer of the port's line.
  // (Off the hall's middle line, where people come in from the gates and where a player starting here stands.)
  for (const e of i.ends) {
    // (The first clear spot 6 … 14 m into the hall, either side of its middle line.)
    let x = 0, zc: number | undefined;
    for (let d = 6; d <= 14 && zc === undefined; d += 0.5) {
      x = e.g + (e.hi ? d : -d);
      zc = [4, -4, 5.5, -5.5, 3, -3].find((z) => i.free(x - 2.2, z - 0.8, x + 2.2, z + 0.8, 0.6) && Math.hypot(x - (e.g + (e.hi ? 11 : -11)), z) > 2.5);
    }
    if (zc === undefined) continue;
    const r: [number, number, number, number] = [x - 2.2, zc - 0.8, x + 2.2, zc + 0.8];
    i.claim(...r);
    // The case: a mahogany plinth, brass trim, a glass box 1.3 m tall, a light along its top.
    b.box('wood:#4a2f22', r[0], cf, r[1], r[2], cf + 0.9, r[3]);
    b.deco(BRASS, r[0] - 0.02, cf + 0.9, r[1] - 0.02, r[2] + 0.02, cf + 0.94, r[3] + 0.02);
    b.deco('glassTint', r[0] + 0.05, cf + 0.94, r[1] + 0.05, r[2] - 0.05, cf + 2.25, r[3] - 0.05);
    b.deco('light', r[0] + 0.2, cf + 2.22, zc - 0.05, r[2] - 0.2, cf + 2.25, zc + 0.05);
    b.deco('flat:#2a5a7a', r[0] + 0.15, cf + 0.94, r[1] + 0.15, r[2] - 0.15, cf + 0.98, r[3] - 0.15);
    // The steamer, 3.6 m long: a black hull narrowing to a raked bow (stepped), the red boot top, a white
    // deckhouse and bridge, two buff funnels with black tops, two masts with their stays, lifeboats.
    const L = 3.6, x0 = x - L / 2, Hy = cf + 1.0;
    const hull = (a: number, e: number, hw: number) => {
      b.deco('flat:#1f2326', a, Hy + 0.12, zc - hw, e, Hy + 0.5, zc + hw);
      b.deco('flat:#8a2a20', a, Hy, zc - hw * 0.92, e, Hy + 0.12, zc + hw * 0.92);
    };
    hull(x0 + 0.5, x0 + L - 0.6, 0.27);
    hull(x0 + 0.2, x0 + 0.5, 0.2);
    hull(x0 + L - 0.6, x0 + L - 0.3, 0.2);
    hull(x0 + L - 0.3, x0 + L - 0.05, 0.1);
    b.deco('wood:#8a6a4c', x0 + 0.3, Hy + 0.5, zc - 0.25, x0 + L - 0.3, Hy + 0.52, zc + 0.25);
    b.deco(WHITE, x0 + 1.0, Hy + 0.52, zc - 0.2, x0 + 2.6, Hy + 0.78, zc + 0.2);
    b.deco(WHITE, x0 + 2.3, Hy + 0.78, zc - 0.24, x0 + 2.6, Hy + 0.92, zc + 0.24);
    for (let k = 0; k < 6; k++) b.deco('flat:#1f2326', x0 + 1.1 + k * 0.25, Hy + 0.62, zc - 0.205, x0 + 1.2 + k * 0.25, Hy + 0.7, zc + 0.205);
    for (const fxc of [x0 + 1.45, x0 + 2.0]) {
      b.deco('flat:#d9b25a', fxc - 0.09, Hy + 0.78, zc - 0.09, fxc + 0.09, Hy + 1.2, zc + 0.09);
      b.deco('flat:#1f2326', fxc - 0.095, Hy + 1.12, zc - 0.095, fxc + 0.095, Hy + 1.22, zc + 0.095);
    }
    for (const mx of [x0 + 0.7, x0 + 3.0]) {
      b.deco(STEEL_D, mx - 0.015, Hy + 0.5, zc - 0.015, mx + 0.015, Hy + 1.2, zc + 0.015);
      b.deco(STEEL_D, mx - 0.25, Hy + 1.05, zc - 0.01, mx + 0.25, Hy + 1.07, zc + 0.01);
    }
    b.deco('flat:#6b6a66', x0 + 0.7, Hy + 1.18, zc - 0.005, x0 + 3.0, Hy + 1.19, zc + 0.005);
    for (const lx of [x0 + 1.15, x0 + 2.2]) for (const sz of [-1, 1]) b.deco(WHITE, lx - 0.15, Hy + 0.8, zc + sz * 0.17 - 0.04, lx + 0.15, Hy + 0.87, zc + sz * 0.17 + 0.04);
    b.sign({ k: 'label', text: '川湊丸 (1889)', sub: 'Kawaminato-maru · the port line’s first steamer', fg: '#2a2622', bg: '#efe6cf' }, x, cf + 0.55, zc > 0 ? r[1] - 0.01 : r[3] + 0.01, [0, zc > 0 ? -1 : 1], 1.6, 0.34);
  }
}

export const look: StationLook = {
  ...defaultLook,
  finishes: { wall: 'brick:#9a5a43', floor: 'floor:#b8b0a2', pillar: STEEL },

  /**
   * Green enamel cargo lamps on short cords (their bottom 0.7 m under the ceiling, clear of hanging signs), and in the
   * gallery round the void (atrium.ts: no stairs or openings in its strips) steel girders across its ceiling with rivets.
   * (The concourse keeps the default look's ceiling beams and services.)
   */
  lights(i) {
    const { b } = i, top = i.cf + i.clear;
    const gallery = i.stairs.length === 0 && i.openings.length === 0;
    for (let x = i.x0 + 1.5; gallery && x < i.x1 - 0.5; x += 4.5) {
      if (i.ends.some((e) => Math.abs(x - e.g) < 4.5)) continue;
      b.deco(STEEL, x - 0.15, top - 0.45, -i.cw + 0.35, x + 0.15, top, i.cw - 0.35);
      b.deco(STEEL_D, x - 0.2, top - 0.5, -i.cw + 0.35, x + 0.2, top - 0.45, i.cw - 0.35);
      for (let z = -i.cw + 0.6; z < i.cw - 0.5; z += 0.6) b.deco(RIVET, x - 0.18, top - 0.53, z - 0.03, x + 0.18, top - 0.5, z + 0.03);
    }
    for (let x = i.x0 + 3.75; x < i.x1 - 1; x += 4.5) {
      if (i.ends.some((e) => Math.abs(x - e.g) < 3.5)) continue;
      for (const z of [-i.cw / 2, i.cw / 2]) {
        if (i.stairs.some((s) => x > s.rect[0] - 0.6 && x < s.rect[2] + 0.6 && z > s.rect[1] - 0.6 && z < s.rect[3] + 0.6)) continue;
        if (i.stairwells.some((w) => x > w.footprint[0] - 0.6 && x < w.footprint[2] + 0.6 && z > w.footprint[1] - 0.6 && z < w.footprint[3] + 0.6)) continue;
        if (!i.free(x - 0.4, z - 0.4, x + 0.4, z + 0.4) || b.protects(x - 0.33, top - 0.71, z - 0.33, x + 0.33, top, z + 0.33)) continue;
        b.deco('flat:#25282b', x - 0.01, top - 0.45, z - 0.01, x + 0.01, top, z + 0.01);
        b.deco(ENAMEL, x - 0.32, top - 0.62, z - 0.32, x + 0.32, top - 0.45, z + 0.32);
        b.deco(WHITE, x - 0.3, top - 0.63, z - 0.3, x + 0.3, top - 0.62, z + 0.3);
        b.deco('light', x - 0.16, top - 0.7, z - 0.16, x + 0.16, top - 0.63, z + 0.16);
      }
    }
  },

  /** A riveted steel column: an I-section in plate, base and cap plates, rivet rows up the flanges, a rope band. */
  pillar(i, x, z, y0, y1) {
    const { b } = i;
    b.deco(STEEL, x - 0.3, y0, z - 0.3, x + 0.3, y1, z + 0.3);
    b.deco('tile:#6e6a62', x - 0.42, y0, z - 0.42, x + 0.42, y0 + 0.35, z + 0.42);
    b.deco(STEEL_D, x - 0.42, y1 - 0.3, z - 0.42, x + 0.42, y1 - 0.15, z + 0.42);
    for (const [dx, dz] of [[-0.31, 0], [0.31, 0], [0, -0.31], [0, 0.31]]) {
      for (let y = y0 + 0.6; y < y1 - 0.4; y += 0.35) b.deco(RIVET, x + dx - 0.03, y - 0.03, z + dz - 0.03, x + dx + 0.03, y + 0.03, z + dz + 0.03);
    }
    b.deco(ROPE, x - 0.33, y0 + 1.0, z - 0.33, x + 0.33, y0 + 1.25, z + 0.33);
  },

  concourse(i) {
    defaultLook.concourse?.(i);
    harbourDress(i);
  },

  /** Porthole lights down the exit corridor's long wall, and a life ring in the lobby. */
  exit(e: ExitInfo) {
    defaultLook.exit?.(e);
    const { b, cf } = e;
    for (let z = 1.2; z < e.ext + 3.4; z += 2.4) {
      b.deco(BRASS, -3.99, cf + 1.6, z - 0.28, -3.95, cf + 2.16, z + 0.28);
      b.deco('light', -3.95, cf + 1.66, z - 0.22, -3.92, cf + 2.1, z + 0.22);
    }
    lifeRing(b, -3.95, cf + 1.4, e.ext + 3.4, 1, 0);
  },
};
