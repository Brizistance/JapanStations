// Ikarimachi (錨町), the old dockers' town: a twin-tube station. Each track and its strip of
// platform lie in a bored tube of their own, lined in cream tile on navy rings like a ship's
// hull; between the tubes a lower vaulted central hall carries the stairs, the lift and the
// benches. Rows of solid pylons separate the three, opened every 6 m by cross-passages.
//
// The kit builds an ordinary wide island hall; this look stands the pylons on it (solid, clear
// of the stairs and of every hanging sign) and hangs the tube linings below its ceiling.

import type { HallInfo } from '../themes/types';
import type { StationLook } from './types';

const NAVY = '#2f3e56';
const LINING = 'tile:#ece6dd';
const RING = `paint:${NAVY}`;
const GLOW = 'light';

/** Pylon faces (|z|): the central hall side and the tube side. */
const PY_IN = 2.1, PY_OUT = 2.7;
/** Pylons every PITCH m, each 2·PY_HALF long; the gaps between are the cross-passages. */
const PITCH = 6, PY_HALF = 1.7;
/** Heights above the platform: where the tube lining springs, its crown, and the central hall's springing. */
const SPRING = 2.6, CROWN = 4.0, HALL_SPRING = 3.0;
/** Where the kit hangs signs and departure boards across the island (hall-local x). */
const SIGN_X = [-49, -38, -27, 0, 27, 38, 49];
/** Strips per tube lining (it is drawn faceted, like the kit's vaults). */
const STRIPS = 12;

/** Runs of x over [a, b] in 1 m steps where `ok` holds and the ceiling is the same height. */
function runs(h: HallInfo, a: number, b: number, ok: (x0: number, x1: number) => boolean): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (let x = a; x < b; x += 1) {
    const x1 = Math.min(b, x + 1);
    if (!ok(x, x1)) continue;
    const top = h.ceilAt((x + x1) / 2);
    const last = out[out.length - 1];
    if (last && last[1] === x && last[2] === top) last[1] = x1;
    else out.push([x, x1, top]);
  }
  return out;
}

/** Height of a half-ellipse lining across [z0, z1] that springs at `spring` and peaks at CROWN. */
const rise = (z: number, z0: number, z1: number, spring: number) => {
  const zc = (z0 + z1) / 2, a = (z1 - z0) / 2;
  return spring + (CROWN - spring) * Math.sqrt(Math.max(0, 1 - ((z - zc) / a) ** 2));
};

/** A faceted lining across [z0, z1] over x-runs, each strip filled up past the hall's ceiling. */
function lining(h: HallInfo, rs: [number, number, number][], z0: number, z1: number, spring: number, mat: string, ribs: number[]) {
  const { b, pf } = h;
  const w = (z1 - z0) / STRIPS;
  for (let k = 0; k < STRIPS; k++) {
    const za = z0 + k * w, zb = za + w, y = pf + rise((za + zb) / 2, z0, z1, spring);
    for (const [xa, xb, top] of rs) {
      b.deco(mat, xa, y, za, xb, top + 1.8, zb);
      for (const x of ribs) if (x - 0.1 >= xa && x + 0.1 <= xb) b.deco(RING, x - 0.1, y - 0.06, za, x + 0.1, y, zb);
    }
  }
}

function platform(h: HallInfo) {
  const { b, pf, wallZ, style, line } = h;
  const H = h.H, P = h.P;
  const all = runs(h, -H, H, () => true);

  // ── Pylons ──
  const pylons: number[] = [];
  for (let c = -Math.floor(P / PITCH) * PITCH; c <= P - PY_HALF; c += PITCH) {
    const x0 = c - PY_HALF, x1 = c + PY_HALF;
    if (x0 < -P) continue;
    if (SIGN_X.some((s) => Math.abs(s - c) < PY_HALF + 0.2)) continue;
    if (h.blocked(x0, x1, 0.6)) continue;
    pylons.push(c);
    const top = h.ceilAt(c);
    for (const s of [-1, 1]) {
      const [za, zb] = s > 0 ? [PY_IN, PY_OUT] : [-PY_OUT, -PY_IN];
      b.box(style.pillar, x0, pf, za, x1, top, zb);
      b.deco(style.pillar, x0, top, za, x1, top + 1.8, zb);
      // Dark plinth, and a gold band at shoulder height on both faces.
      b.deco('flat:#23262b', x0 - 0.01, pf, za - 0.01, x1 + 0.01, pf + 0.15, zb + 0.01);
      b.deco(`paint:${line.color}`, x0 - 0.01, pf + 2.15, za - 0.01, x1 + 0.01, pf + 2.27, zb + 0.01);
      // Brass corner guards where the cross-passages wear them.
      for (const x of [x0, x1 - 0.06]) b.deco('metal:#b08a3a', x - 0.005, pf + 0.15, za - 0.012, x + 0.065, pf + 1.9, zb + 0.012);
    }
  }
  // Arched heads over the cross-passages between two pylons, clear above the hanging signs.
  for (let i = 1; i < pylons.length; i++) {
    if (pylons[i] - pylons[i - 1] !== PITCH) continue;
    const xa = pylons[i - 1] + PY_HALF, xb = pylons[i] - PY_HALF, top = h.ceilAt((xa + xb) / 2);
    for (const s of [-1, 1]) {
      const [za, zb] = s > 0 ? [PY_IN, PY_OUT] : [-PY_OUT, -PY_IN];
      b.deco(LINING, xa, pf + 3.2, za, xb, top + 1.8, zb);
      b.deco(RING, xa, pf + 3.14, za, xb, pf + 3.2, zb);
    }
  }

  // ── The tubes: track and platform strip under a cream lining on navy rings ──
  const ribs: number[] = [];
  for (let x = -Math.floor(H / PITCH) * PITCH + PITCH / 2; x < H; x += PITCH) ribs.push(x);
  for (const s of [-1, 1]) {
    const [z0, z1] = s > 0 ? [PY_OUT, wallZ] : [-wallZ, -PY_OUT];
    lining(h, all, z0, z1, SPRING, LINING, ribs);
    // A lamp line along each tube, over the platform strip, and a dimmer one over the track.
    const zl = s * (PY_OUT + 1.3), zt = s * (wallZ - 2.4);
    for (const [zz, wd] of [[zl, 0.16], [zt, 0.1]] as const) {
      const y = pf + rise(zz, z0, z1, SPRING) - 0.02;
      for (const [xa, xb] of all) b.deco(GLOW, xa, y - 0.01, zz - wd, xb, y, zz + wd);
    }
    // Navy dado along the track wall, under the name boards.
    b.deco(RING, -H, pf + 0.9, s * (wallZ - 0.012) - 0.004, H, pf + 1.0, s * (wallZ - 0.012) + 0.004);
  }

  // ── The central hall: a lower vault between the pylon rows, open where stairs rise through ──
  const hall = runs(h, -H, H, (x0, x1) => !h.blocked(x0, x1, 0.4));
  lining(h, hall, -PY_IN, PY_IN, HALL_SPRING, 'flat:#f1ece0', ribs);
  for (const [xa, xb] of hall) b.deco(GLOW, xa, pf + CROWN - 0.03, -0.25, xb, pf + CROWN - 0.02, 0.25);
}

export const look: StationLook = {
  finishes: { floor: 'floor:#c9c4bb' },
  platform,
};
