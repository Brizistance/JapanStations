// Turns Builder part lists into merged three.js geometry: one mesh per material.

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { BoxPart, MeshPart } from '../world/builder';

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
export function boxesToGeometry(boxes: BoxPart[]): THREE.BufferGeometry {
  const n = boxes.length;
  const pos = new Float32Array(n * 72), nor = new Float32Array(n * 72), uv = new Float32Array(n * 48);
  const idx = new Uint32Array(n * 36);
  let p = 0, t = 0, i = 0, v = 0;
  for (const b of boxes) {
    const m = [b.min, b.max];
    for (const f of FACES) {
      for (const c of f.c) {
        const x = m[c[0]][0], y = m[c[1]][1], z = m[c[2]][2];
        pos[p] = x; pos[p + 1] = y; pos[p + 2] = z;
        nor[p] = f.n[0]; nor[p + 1] = f.n[1]; nor[p + 2] = f.n[2];
        p += 3;
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
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeBoundingSphere();
  return g;
}

const unit = {
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 12),
  cone: new THREE.ConeGeometry(0.5, 1, 12),
  sphere: new THREE.SphereGeometry(0.5, 14, 10),
};

export function meshesToGeometry(parts: MeshPart[]): THREE.BufferGeometry | null {
  if (parts.length === 0) return null;
  const m = new THREE.Matrix4();
  const gs = parts.map((p) => {
    const g = unit[p.shape].clone();
    m.makeScale(p.size[0], p.size[1], p.size[2]).setPosition(p.pos[0], p.pos[1], p.pos[2]);
    g.applyMatrix4(m);
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
