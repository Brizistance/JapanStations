// Turns Builder part lists into merged three.js geometry: one mesh per material.
// Besides position / normal / uv, every vertex carries `aEnv` = (sky, shade), which the
// lit material uses to pick daylight or station lighting (see render/lit.ts).

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { BoxPart, MeshPart, V3 } from '../world/builder';

/** How a build is lit. */
export type EnvMode =
  /** Station: daylight above street level, fading out over the first metre below it. */
  | { kind: 'station' }
  /** Everything fully outdoors. */
  | { kind: 'sky' }
  /** Train car: faces inside this box are always lit by the car's own lights. */
  | { kind: 'car'; min: V3; max: V3 };

/** Daylight reaching height `y` in a station frame (street level is 0). */
export const skyAt = (y: number) => Math.min(1, Math.max(0, y + 1));

// Face table: normal, then 4 corners as (x,y,z) selectors (0 = min, 1 = max), and which axes give u and v.
const FACES: { n: [number, number, number]; c: [number, number, number][]; u: 0 | 2; v: 1 | 2 }[] = [
  { n: [1, 0, 0], c: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], u: 2, v: 1 },
  { n: [-1, 0, 0], c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], u: 2, v: 1 },
  { n: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], u: 0, v: 2 },
  { n: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], u: 0, v: 2 },
  { n: [0, 0, 1], c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], u: 0, v: 1 },
  { n: [0, 0, -1], c: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], u: 0, v: 1 },
];

/** Merge boxes into one geometry. UVs are in metres so textures tile at real-world scale. */
export function boxesToGeometry(boxes: BoxPart[], mode: EnvMode): THREE.BufferGeometry {
  const n = boxes.length;
  const pos = new Float32Array(n * 72), nor = new Float32Array(n * 72), uv = new Float32Array(n * 48), env = new Float32Array(n * 48);
  const idx = new Uint32Array(n * 36);
  let p = 0, t = 0, i = 0, v = 0;
  for (const b of boxes) {
    const m = [b.min, b.max];
    for (const f of FACES) {
      let inside = false;
      if (mode.kind === 'car') {
        // Probe just in front of the face: is that point inside the saloon?
        inside = true;
        for (let k = 0; k < 3; k++) {
          const c = f.n[k] !== 0 ? (f.n[k] > 0 ? b.max[k] : b.min[k]) + f.n[k] * 0.05 : (b.min[k] + b.max[k]) / 2;
          if (c < mode.min[k] || c > mode.max[k]) inside = false;
        }
      }
      for (const c of f.c) {
        const x = m[c[0]][0], y = m[c[1]][1], z = m[c[2]][2];
        pos[p] = x; pos[p + 1] = y; pos[p + 2] = z;
        nor[p] = f.n[0]; nor[p + 1] = f.n[1]; nor[p + 2] = f.n[2];
        p += 3;
        env[t] = mode.kind === 'sky' || b.open ? 1 : mode.kind === 'station' ? skyAt(y) : inside ? -1 : 0;
        env[t + 1] = inside ? -1 : 0;
        uv[t++] = f.u === 0 ? x : z;
        uv[t++] = f.v === 1 ? y : z;
      }
      idx[i++] = v; idx[i++] = v + 1; idx[i++] = v + 2;
      idx[i++] = v; idx[i++] = v + 2; idx[i++] = v + 3;
      v += 4;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('aEnv', new THREE.BufferAttribute(env, 2));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeBoundingSphere();
  return g;
}

const unit = {
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 20),
  cone: new THREE.ConeGeometry(0.5, 1, 14),
  sphere: new THREE.SphereGeometry(0.5, 16, 12),
};

export function meshesToGeometry(parts: MeshPart[], mode: EnvMode): THREE.BufferGeometry | null {
  if (parts.length === 0) return null;
  const m = new THREE.Matrix4();
  const gs = parts.map((p) => {
    const g = unit[p.shape].clone();
    // UVs in metres, like the boxes: u around the girth, v up.
    const uvs = g.getAttribute('uv') as THREE.BufferAttribute;
    const girth = (Math.PI * (p.size[0] + p.size[2])) / 2;
    for (let k = 0; k < uvs.count; k++) uvs.setXY(k, uvs.getX(k) * girth, uvs.getY(k) * p.size[1]);
    m.makeScale(p.size[0], p.size[1], p.size[2]).setPosition(p.pos[0], p.pos[1], p.pos[2]);
    g.applyMatrix4(m);
    const pos = g.getAttribute('position');
    const env = new Float32Array(pos.count * 2);
    for (let k = 0; k < pos.count; k++) env[k * 2] = mode.kind === 'sky' || p.open ? 1 : mode.kind === 'station' ? skyAt(pos.getY(k)) : 0;
    g.setAttribute('aEnv', new THREE.BufferAttribute(env, 2));
    return g;
  });
  const out = mergeGeometries(gs, false);
  gs.forEach((g) => g.dispose());
  return out;
}

export function groupBy<T extends { mat: string }>(items: T[]): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const it of items) {
    if (it.mat === 'none') continue;
    const a = out.get(it.mat);
    if (a) a.push(it);
    else out.set(it.mat, [it]);
  }
  return out;
}
