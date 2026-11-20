// A tiling 3D noise texture for the volumetric clouds (Ultra). R: the cloud shapes (smooth
// noise mixed with cellular "cauliflower" noise); G: finer cellular noise that erodes edges.
// Built once on the CPU the first time volumetric clouds are switched on.

import * as THREE from 'three';

const N = 64;

function rand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

/** Smooth value noise that repeats every `p` cells. */
function valueNoise(p: number, r: () => number) {
  const lat = new Float32Array(p * p * p);
  for (let i = 0; i < lat.length; i++) lat[i] = r();
  const at = (x: number, y: number, z: number) => lat[((z % p) * p + (y % p)) * p + (x % p)];
  const s = (t: number) => t * t * (3 - 2 * t);
  return (u: number, v: number, w: number) => {
    const x = u * p, y = v * p, z = w * p;
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const fx = s(x - xi), fy = s(y - yi), fz = s(z - zi);
    const l = (a: number, b: number, t: number) => a + (b - a) * t;
    return l(
      l(l(at(xi, yi, zi), at(xi + 1, yi, zi), fx), l(at(xi, yi + 1, zi), at(xi + 1, yi + 1, zi), fx), fy),
      l(l(at(xi, yi, zi + 1), at(xi + 1, yi, zi + 1), fx), l(at(xi, yi + 1, zi + 1), at(xi + 1, yi + 1, zi + 1), fx), fy),
      fz,
    );
  };
}

/** Cellular noise repeating every `c` cells: 1 at a feature point, 0 a cell away. */
function worley(c: number, r: () => number) {
  const pts = new Float32Array(c * c * c * 3);
  for (let i = 0; i < pts.length; i++) pts[i] = r();
  return (u: number, v: number, w: number) => {
    const x = u * c, y = v * c, z = w * c;
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    let best = 4;
    for (let dz = -1; dz <= 1; dz++) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const cx = xi + dx, cy = yi + dy, cz = zi + dz;
      const k = ((((cz + c) % c) * c + ((cy + c) % c)) * c + ((cx + c) % c)) * 3;
      const ex = cx + pts[k] - x, ey = cy + pts[k + 1] - y, ez = cz + pts[k + 2] - z;
      const d = ex * ex + ey * ey + ez * ez;
      if (d < best) best = d;
    }
    return 1 - Math.min(1, Math.sqrt(best));
  };
}

export function cloudNoise(): THREE.Data3DTexture {
  const r = rand(4211);
  const v4 = valueNoise(4, r), v8 = valueNoise(8, r), v16 = valueNoise(16, r);
  const w4 = worley(4, r), w8 = worley(8, r), w12 = worley(12, r);
  const data = new Uint8Array(N * N * N * 2);
  let o = 0;
  for (let z = 0; z < N; z++) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = x / N, v = y / N, w = z / N;
    const smoothN = v4(u, v, w) * 0.55 + v8(u, v, w) * 0.3 + v16(u, v, w) * 0.15;
    const cells = w4(u, v, w) * 0.65 + w8(u, v, w) * 0.35;
    data[o++] = Math.max(0, Math.min(255, (smoothN * 0.55 + cells * 0.6) * 255));
    data[o++] = Math.max(0, Math.min(255, w12(u, v, w) * 255));
  }
  const t = new THREE.Data3DTexture(data, N, N, N);
  t.format = THREE.RGFormat;
  t.type = THREE.UnsignedByteType;
  t.minFilter = t.magFilter = THREE.LinearFilter;
  t.wrapS = t.wrapT = t.wrapR = THREE.RepeatWrapping;
  t.unpackAlignment = 1;
  t.needsUpdate = true;
  return t;
}
