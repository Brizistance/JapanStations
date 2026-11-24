// The ground and the water beyond the stations (data/geography.ts): the land at street level, the sea and
// the docks at SEA_Y, the river and canals at CHANNEL_Y, and a stone embankment with a coping wherever land
// meets water (a gate face where a canal meets the sea). The station plots, and the track's open cuts, are
// cut out of all of it: the stations draw their own ground and water.

import * as THREE from 'three';
import { BASINS, BEACHES, CHANNELS, CHANNEL_Y, LAND, SEA_Y, VISTAS, inPoly, isSea, isWater, type Pt } from '../data/geography';
import { getMaterial } from './materials';

type Poly = Pt[];

const GROUND_Y = -0.03, COPE_Y = 0.35, COPE_W = 0.6;

const area = (p: Poly) => {
  let a = 0;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) a += p[j][0] * p[i][1] - p[i][0] * p[j][1];
  return a / 2;
};
const ccw = (p: Poly) => (area(p) < 0 ? [...p].reverse() : p);

/** The part of a convex polygon on the left of a → b (or the right). */
function clip(p: Poly, a: Pt, b: Pt, left: boolean): Poly {
  const side = (q: Pt) => ((b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0])) * (left ? 1 : -1);
  const out: Poly = [];
  for (let i = 0; i < p.length; i++) {
    const c = p[i], d = p[(i + 1) % p.length], sc = side(c), sd = side(d);
    if (sc >= 0) out.push(c);
    if ((sc >= 0) !== (sd >= 0)) {
      const t = sc / (sc - sd);
      out.push([c[0] + (d[0] - c[0]) * t, c[1] + (d[1] - c[1]) * t]);
    }
  }
  return out;
}

interface Cutter { pts: Poly; x0: number; z0: number; x1: number; z1: number }
const cutter = (p: Poly): Cutter => {
  const pts = ccw(p);
  return { pts, x0: Math.min(...pts.map((q) => q[0])), z0: Math.min(...pts.map((q) => q[1])), x1: Math.max(...pts.map((q) => q[0])), z1: Math.max(...pts.map((q) => q[1])) };
};

/** Convex pieces less every cutter (each convex). */
function subtract(pieces: Poly[], cutters: Cutter[]): Poly[] {
  for (const c of cutters) {
    const next: Poly[] = [];
    for (const p of pieces) {
      let px0 = Infinity, pz0 = Infinity, px1 = -Infinity, pz1 = -Infinity;
      for (const [x, z] of p) { px0 = Math.min(px0, x); px1 = Math.max(px1, x); pz0 = Math.min(pz0, z); pz1 = Math.max(pz1, z); }
      if (px1 <= c.x0 || px0 >= c.x1 || pz1 <= c.z0 || pz0 >= c.z1) { next.push(p); continue; }
      let rest = p;
      for (let i = 0; i < c.pts.length && rest.length >= 3; i++) {
        const a = c.pts[i], b = c.pts[(i + 1) % c.pts.length];
        const out = clip(rest, a, b, false);
        if (out.length >= 3 && Math.abs(area(out)) > 1e-3) next.push(out);
        rest = clip(rest, a, b, true);
      }
    }
    pieces = next;
  }
  return pieces;
}

/** Triangles of a polygon with holes, as convex pieces. */
function triangulate(outer: Poly, holes: Poly[] = []): Poly[] {
  const v = (p: Poly) => p.map(([x, z]) => new THREE.Vector2(x, z));
  const all = [outer, ...holes].flat();
  return THREE.ShapeUtils.triangulateShape(v(outer), holes.map(v)).map(([a, b, c]) => [all[a], all[b], all[c]]);
}

/** A channel's water: a quad along each stretch and an octagon at each bend. */
function channelPieces(pts: Pt[], w: number): Poly[] {
  const out: Poly[] = [];
  for (let i = 1; i < pts.length; i++) {
    const [ax, az] = pts[i - 1], [bx, bz] = pts[i], L = Math.hypot(bx - ax, bz - az);
    const nx = (-(bz - az) / L) * (w / 2), nz = ((bx - ax) / L) * (w / 2);
    out.push([[ax + nx, az + nz], [bx + nx, bz + nz], [bx - nx, bz - nz], [ax - nx, az - nz]]);
  }
  for (let i = 1; i < pts.length - 1; i++) {
    const oct: Poly = [];
    for (let k = 0; k < 8; k++) oct.push([pts[i][0] + Math.cos((k * Math.PI) / 4) * (w / 2) * 1.08, pts[i][1] + Math.sin((k * Math.PI) / 4) * (w / 2) * 1.08]);
    out.push(oct);
  }
  return out;
}

/** Flat convex pieces at a height, facing up. */
function flatGeometry(pieces: Poly[], y: number): THREE.BufferGeometry {
  const pos: number[] = [], uv: number[] = [];
  for (const p of pieces) {
    const q = area(p) > 0 ? [...p].reverse() : p; // (x, z) clockwise faces up
    for (let i = 1; i < q.length - 1; i++) for (const [x, z] of [q[0], q[i], q[i + 1]]) { pos.push(x, y, z); uv.push(x, -z); }
  }
  return finish(pos, uv);
}

function finish(pos: number[], uv: number[]): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('aEnv', new THREE.BufferAttribute(new Float32Array((pos.length / 3) * 2).fill(1), 2));
  g.computeVertexNormals();
  return g;
}

/**
 * The ground, the water and the embankments. `plots` are the station plots (convex, world x/z),
 * `cuts` the track's open cuts: neither gets ground or water.
 */
export function buildLandAndWater(plots: Poly[], cuts: Poly[]): THREE.Object3D[] {
  const plotCut = plots.map(cutter);
  const channels = CHANNELS.flatMap((c) => channelPieces(c.pts, c.width));
  const pinPlot = (x: number, z: number) => plotCut.some((c) => x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1 && inPoly(c.pts, x, z));

  // The land: each shore polygon less its docks, then less the channels, the plots and the cuts.
  let ground: Poly[] = [];
  for (const l of LAND) ground.push(...triangulate(l.pts, BASINS.filter((b) => b.pts.every(([x, z]) => inPoly(l.pts, x, z))).map((b) => b.pts)));
  ground = subtract(ground, [...channels.map(cutter), ...plotCut, ...cuts.map(cutter)]);

  // The sea: a sheet out to the map's far edges less the land, the docks, then the channels; less the plots.
  const sea = subtract([...triangulate([[-5000, -8000], [14000, -8000], [14000, 10000], [-5000, 10000]], LAND.map((l) => l.pts)), ...BASINS.flatMap((b) => triangulate(b.pts))], plotCut);
  const chan = subtract(channels, plotCut);

  // Embankments: along every shore, dock and channel side, where water lies on one side and land on the other.
  const wall: number[] = [], wallUv: number[] = [];
  const quad = (a: Pt, b: Pt, ya: number, yb: number, d: Pt) => {
    // A vertical face from a to b between heights ya < yb, facing d.
    const n = (b[0] - a[0]) * d[1] - (b[1] - a[1]) * d[0] > 0;
    const [p, q] = n ? [a, b] : [b, a];
    const L = Math.hypot(q[0] - p[0], q[1] - p[1]);
    for (const [x, y, z, u] of [[p[0], ya, p[1], 0], [q[0], ya, q[1], L], [q[0], yb, q[1], L], [p[0], ya, p[1], 0], [q[0], yb, q[1], L], [p[0], yb, p[1], 0]] as const) {
      wall.push(x, y, z);
      wallUv.push(u, y);
    }
  };
  const top = (a: Pt, b: Pt, d: Pt, y: number) => {
    const a2: Pt = [a[0] - d[0] * COPE_W, a[1] - d[1] * COPE_W], b2: Pt = [b[0] - d[0] * COPE_W, b[1] - d[1] * COPE_W];
    const g = flatGeometry([[a, b, b2, a2]], y);
    const p = g.getAttribute('position').array as Float32Array;
    for (let i = 0; i < p.length; i += 3) { wall.push(p[i], p[i + 1], p[i + 2]); wallUv.push(p[i], p[i + 2]); }
  };
  const levelAt = (x: number, z: number) => (isSea(x, z) ? SEA_Y : CHANNEL_Y);
  const beach = (x: number, z: number) => BEACHES.some((b) => inPoly(b, x, z));
  const edge = (a: Pt, b: Pt) => {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / 5));
    const tx = (b[0] - a[0]) / L, tz = (b[1] - a[1]) / L;
    for (let i = 0; i < n; i++) {
      const p: Pt = [a[0] + (b[0] - a[0]) * (i / n), a[1] + (b[1] - a[1]) * (i / n)];
      const q: Pt = [a[0] + (b[0] - a[0]) * ((i + 1) / n), a[1] + (b[1] - a[1]) * ((i + 1) / n)];
      const m: Pt = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      if (pinPlot(m[0], m[1]) || beach(m[0], m[1])) continue;
      const left: Pt = [m[0] - tz * 1.2, m[1] + tx * 1.2], right: Pt = [m[0] + tz * 1.2, m[1] - tx * 1.2];
      const wl = isWater(...left), wr = isWater(...right);
      if (wl && wr) {
        // A gate: the sea on one side, a canal lower on the other.
        const yl = levelAt(...left), yr = levelAt(...right);
        if (Math.abs(yl - yr) > 0.1) {
          quad(p, q, Math.min(yl, yr) - 0.2, Math.max(yl, yr), [-tz, tx]);
          quad(p, q, Math.min(yl, yr) - 0.2, Math.max(yl, yr), [tz, -tx]);
        }
        continue;
      }
      if (!wl && !wr) continue;
      const d: Pt = wl ? [-tz, tx] : [tz, -tx];
      const y = levelAt(m[0] + d[0] * 1.2, m[1] + d[1] * 1.2);
      quad(p, q, y - 0.3, COPE_Y, d);
      top(p, q, d, COPE_Y);
      const back: Pt[] = [[p[0] - d[0] * COPE_W, p[1] - d[1] * COPE_W], [q[0] - d[0] * COPE_W, q[1] - d[1] * COPE_W]];
      quad(back[0], back[1], GROUND_Y, COPE_Y, [-d[0], -d[1]]);
    }
  };
  for (const s of [...LAND.map((l) => l.pts), ...BASINS.map((b) => b.pts)]) for (let i = 0; i < s.length; i++) edge(s[i], s[(i + 1) % s.length]);
  for (const c of CHANNELS) {
    for (let i = 1; i < c.pts.length; i++) {
      const [ax, az] = c.pts[i - 1], [bx, bz] = c.pts[i], L = Math.hypot(bx - ax, bz - az);
      const nx = (-(bz - az) / L) * (c.width / 2), nz = ((bx - ax) / L) * (c.width / 2);
      edge([ax + nx, az + nz], [bx + nx, bz + nz]);
      edge([ax - nx, az - nz], [bx - nx, bz - nz]);
    }
  }

  // Riverside walks: paving along each channel side inside a vista (from the coping back WALK m), a lamp every 25 m.
  const WALK = 8;
  const walk: Poly[] = [], lamps: Pt[] = [];
  for (const c of CHANNELS) {
    for (let i = 1; i < c.pts.length; i++) {
      const [ax, az] = c.pts[i - 1], [bx, bz] = c.pts[i], L = Math.hypot(bx - ax, bz - az);
      const tx = (bx - ax) / L, tz = (bz - az) / L, n = Math.max(1, Math.round(L / 5));
      for (const sg of [-1, 1]) {
        const o0 = c.width / 2 + COPE_W, o1 = o0 + WALK;
        for (let k = 0; k < n; k++) {
          const u0 = (k / n) * L, u1 = ((k + 1) / n) * L, um = (u0 + u1) / 2;
          const P = (u: number, o: number): Pt => [ax + tx * u - tz * o * sg, az + tz * u + tx * o * sg];
          const m = P(um, (o0 + o1) / 2);
          if (!inVista(m[0], m[1], 0) || pinPlot(m[0], m[1]) || isWater(m[0], m[1])) continue;
          walk.push([P(u0, o0), P(u1, o0), P(u1, o1), P(u0, o1)]);
          if (Math.round(um) % 25 < 5) lamps.push(P(um, o0 + 0.6));
        }
      }
    }
  }
  const lampParts: number[] = [], lampUv: number[] = [];
  for (const [x, z] of lamps) {
    // A plain riverside lamp: a post with a lantern on top (a box each side).
    for (const [r, y0, y1] of [[0.07, GROUND_Y, 3.6], [0.22, 3.6, 4.1]] as const) {
      for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]] as Pt[]) {
        const a: Pt = [x + d[0] * r - d[1] * r, z + d[1] * r + d[0] * r], b: Pt = [x + d[0] * r + d[1] * r, z + d[1] * r - d[0] * r];
        const before = wall.length;
        quad(a, b, y0, y1, d);
        for (let i = before; i < wall.length; i++) lampParts.push(wall[i]);
        lampUv.push(...wallUv.slice((before / 3) * 2));
        wall.length = before;
        wallUv.length = (before / 3) * 2;
      }
    }
  }

  const mesh = (g: THREE.BufferGeometry, mat: string) => {
    const m = new THREE.Mesh(g, getMaterial(mat));
    m.matrixAutoUpdate = false;
    m.receiveShadow = true;
    m.userData.noAO = true;
    return m;
  };
  return [
    mesh(flatGeometry(ground, GROUND_Y), 'ground'),
    mesh(flatGeometry(sea, SEA_Y), 'water'),
    mesh(flatGeometry(chan, CHANNEL_Y), 'water'),
    mesh(finish(wall, wallUv), 'flat:#8d887e'),
    mesh(flatGeometry(walk, 0.0), 'paver'),
    mesh(finish(lampParts, lampUv), 'flat:#3d4a48'),
  ];
}

/** Is there water at or within m of this point (the centre and four corners)? */
export const wetNear = (x: number, z: number, m: number) =>
  isWater(x, z) || isWater(x - m, z - m) || isWater(x + m, z - m) || isWater(x - m, z + m) || isWater(x + m, z + m);

/** Inside a kept-open view (data/geography.ts VISTAS), or within m of one? */
export const inVista = (x: number, z: number, m: number) =>
  VISTAS.some((v) => inPoly(v.pts, x, z) || (m > 0 && (inPoly(v.pts, x - m, z - m) || inPoly(v.pts, x + m, z - m) || inPoly(v.pts, x - m, z + m) || inPoly(v.pts, x + m, z + m))));
