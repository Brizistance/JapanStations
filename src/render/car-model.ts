// The modelled train cars: public/models/metro-car.glb (tools/blender/build_metro_car.py) and
// ar-car.glb (build_ar_car.py). A line names its model in its car spec (LineDef.car).
//
// The model is only what you see. Collision, doors, live signs and lamps still come from
// the part list in trains/car.ts, so the model must keep to that car's dimensions.
//
// Its materials are named with our material keys and resolved through getMaterial(), so
// the model is lit exactly like everything else. Two names are placeholders for the line
// colour: LINE (bands) and SEAT (moquette). Meshes under a node ending `_int` are the
// saloon (always lit by the car); `_ext` follows tunnel / station / daylight.

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { CarKind } from '../trains/car';
import { getMaterial } from './materials';

interface Piece {
  geometry: THREE.BufferGeometry;
  /** Material key, or a placeholder. */
  mat: string;
}

const pieces = new Map<string, { mid: Piece[]; cab: Piece[] }>();
const loading = new Map<string, Promise<void>>();

/** Box-projected UVs in metres, like the part-list geometry, for the brushed and macro textures. */
function addAttributes(g: THREE.BufferGeometry, interior: boolean) {
  const pos = g.getAttribute('position'), nor = g.getAttribute('normal');
  const uv = new Float32Array(pos.count * 2), env = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const ax = Math.abs(nor.getX(i)), ay = Math.abs(nor.getY(i)), az = Math.abs(nor.getZ(i));
    if (ax >= ay && ax >= az) {
      uv[i * 2] = pos.getZ(i);
      uv[i * 2 + 1] = pos.getY(i);
    } else if (ay >= az) {
      uv[i * 2] = pos.getX(i);
      uv[i * 2 + 1] = pos.getZ(i);
    } else {
      uv[i * 2] = pos.getX(i);
      uv[i * 2 + 1] = pos.getY(i);
    }
    // Same values the part list gives saloon faces: immune to the car's exterior lighting.
    env[i * 2] = env[i * 2 + 1] = interior ? -1 : 0;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('aEnv', new THREE.BufferAttribute(env, 2));
  g.computeBoundingSphere();
}

function collect(root: THREE.Object3D): Piece[] {
  const out: Piece[] = [];
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    let interior = false;
    for (let p: THREE.Object3D | null = mesh; p && p !== root; p = p.parent) if (p.name.includes('_int')) interior = true;
    addAttributes(mesh.geometry, interior);
    out.push({ geometry: mesh.geometry, mat: (mesh.material as THREE.Material).name });
  });
  // One piece per material: a car is then a handful of draw calls, not one per seat and handle.
  const byMat = new Map<string, THREE.BufferGeometry[]>();
  for (const p of out) {
    const src = p.geometry.index ? p.geometry.toNonIndexed() : p.geometry;
    const g = new THREE.BufferGeometry();
    for (const a of ['position', 'normal', 'uv', 'aEnv']) g.setAttribute(a, src.getAttribute(a));
    (byMat.get(p.mat) ?? byMat.set(p.mat, []).get(p.mat)!).push(g);
  }
  const merged: Piece[] = [];
  for (const [mat, list] of byMat) {
    const g = list.length === 1 ? list[0] : mergeGeometries(list, false);
    if (!g) return out; // pieces that will not merge: keep them as they were
    g.computeBoundingSphere();
    merged.push({ geometry: g, mat });
  }
  return merged;
}

/** Start loading a model (once). Resolves when `carModel` can return it; rejects if the file is missing or broken. */
export function loadCarModel(model: string): Promise<void> {
  let p = loading.get(model);
  if (!p) {
    p = new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}models/${model}.glb`).then((gltf) => {
      const mid = gltf.scene.getObjectByName('car_mid'), cab = gltf.scene.getObjectByName('car_cab');
      if (!mid || !cab) throw new Error(`${model}.glb: car_mid / car_cab not found`);
      pieces.set(model, { mid: collect(mid), cab: collect(cab) });
    });
    loading.set(model, p);
  }
  return p;
}

/** A new group for one car in the line's colours, or null while the model is not loaded. */
export function carModel(model: string, lineColor: string, kind: CarKind): THREE.Group | null {
  const set = pieces.get(model);
  if (!set) return null;
  const group = new THREE.Group();
  for (const p of kind === 'mid' ? set.mid : set.cab) {
    const key = p.mat === 'LINE' ? `paint:${lineColor}` : p.mat === 'SEAT' ? `flat:${lineColor}` : p.mat;
    const material = getMaterial(key);
    const m = new THREE.Mesh(p.geometry, material);
    m.matrixAutoUpdate = false;
    if (material.transparent) m.renderOrder = 2;
    const litOpaque = !material.transparent && (material as THREE.MeshStandardMaterial).isMeshStandardMaterial === true;
    m.castShadow = litOpaque;
    m.receiveShadow = litOpaque;
    group.add(m);
  }
  // The model's cab is at +x; the low-end cab car is the same car turned round.
  if (kind === 'cabLow') group.rotation.y = Math.PI;
  return group;
}
