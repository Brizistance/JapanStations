// Builds the three.js objects for a Build (station or car): merged static meshes,
// signs, and instanced sliding gates.

import * as THREE from 'three';
import type { Build, GatePart } from '../world/builder';
import { boxesToGeometry, groupBy, meshesToGeometry, skyAt, type EnvMode } from './geometry';
import { isLo, mergedModels } from './building-models';
import { getMaterial } from './materials';
import { SignSet, type SignCache } from './sign-set';
import { separateCoplanar } from './zfight';
import type { SignContent } from '../signs/content';

const geoCache = new Map<string, THREE.Group>();

/** Static geometry for a build. If `shareKey` is given the meshes are built once and cloned. */
export function staticGroup(build: Build, mode: EnvMode, shareKey?: string): { group: THREE.Group; dispose: () => void } {
  if (shareKey) {
    let proto = geoCache.get(shareKey);
    if (!proto) {
      proto = makeStatic(build, mode);
      geoCache.set(shareKey, proto);
    }
    return { group: proto.clone(), dispose: () => {} };
  }
  const group = makeStatic(build, mode);
  return {
    group,
    dispose: () => group.traverse((o) => {
      if (!o.userData.shared) (o as THREE.Mesh).geometry?.dispose();
    }),
  };
}

/**
 * Which part of a station something belongs to, for leaving out what cannot be seen
 * (WorldView.update): 'surface' is wholly at or above the street, or open to the sky; 'deep' is
 * wholly below the street's slab; 'both' reaches from one to the other (an exit stair's walls)
 * and is always drawn.
 */
export type Layer = 'surface' | 'deep' | 'both';
/** Underside of the street's build-up (surface.ts lays asphalt from −0.6 to 0). */
const STREET_Y = -0.6;
export const layerOf = (y0: number, y1: number, open = false): Layer => (y0 >= STREET_Y - 0.1 ? 'surface' : y1 <= STREET_Y ? (open ? 'both' : 'deep') : 'both');

function makeStatic(build: Build, mode: EnvMode): THREE.Group {
  const group = new THREE.Group();
  // A station's parts go in three groups by layer; anything else (a train car) in one.
  const station = mode.kind === 'station';
  const layers = new Map<Layer, THREE.Group>();
  const into = (l: Layer): THREE.Group => {
    let g = layers.get(l);
    if (!g) {
      g = new THREE.Group();
      g.userData.layer = l;
      g.matrixAutoUpdate = false;
      layers.set(l, g);
      group.add(g);
    }
    return g;
  };
  const add = (g: THREE.BufferGeometry | null, mat: string, layer: Layer) => {
    if (!g) return;
    const material = getMaterial(mat);
    const m = new THREE.Mesh(g, material);
    m.matrixAutoUpdate = false;
    if (material.transparent) m.renderOrder = 2;
    // Only lit, opaque surfaces take part in sun shadows, and nothing below the street casts one.
    const litOpaque = !material.transparent && (material as THREE.MeshStandardMaterial).isMeshStandardMaterial === true;
    m.castShadow = litOpaque && layer !== 'deep';
    m.receiveShadow = litOpaque;
    into(layer).add(m);
  };
  const boxLayer = (b: Build['boxes'][number]): Layer => (station ? layerOf(b.min[1], b.max[1], b.open) : 'both');
  for (const layer of ['surface', 'deep', 'both'] as const) {
    const boxes = build.boxes.filter((b) => boxLayer(b) === layer);
    for (const [mat, list] of groupBy(separateCoplanar(boxes))) add(boxesToGeometry(list, mode), mat, layer);
    const meshes = build.meshes.filter((p) => (station ? layerOf(p.pos[1] - p.size[1] / 2, p.pos[1] + p.size[1] / 2, p.open) : 'both') === layer);
    for (const [mat, parts] of groupBy(meshes)) add(meshesToGeometry(parts, mode), mat, layer);
  }
  // Blender-built models, merged: one mesh per material for the full models (they cast shadows),
  // one for the simplified copies (too far back for contact shading or their shadows to show).
  // A model standing below the street (a rotunda's shell) reaches up through it: 'both'.
  const below = (p: Build['models'][number]) => station && p.pos[1] < STREET_Y - 0.1;
  const full = build.models.filter((p) => !isLo(p) && !below(p)), lo = build.models.filter((p) => isLo(p) && !below(p)), under = build.models.filter(below);
  if (full.length) into(station ? 'surface' : 'both').add(mergedModels(full, { cast: true }));
  if (lo.length) into(station ? 'surface' : 'both').add(mergedModels(lo, { noAO: true }));
  if (under.length) into('both').add(mergedModels(under, { cast: true }));
  return group;
}

/** One instanced layer of a gate leaf, as a fraction of the leaf: [u0, v0, u1, v1], and how far it stands proud. */
interface LeafLayer {
  mat: string;
  rect: [number, number, number, number];
  proud: number;
}

const unitBox = (() => {
  const g = new THREE.BoxGeometry(1, 1, 1);
  g.setAttribute('aEnv', new THREE.BufferAttribute(new Float32Array(g.getAttribute('position').count * 2), 2));
  return g;
})();
const m4 = new THREE.Matrix4();

/**
 * Sliding gate leaves (platform screen doors / train doors) as instanced meshes:
 * the leaf itself plus optional layers (window, colour band) that move with it.
 */
export class GateSet {
  readonly meshes: THREE.InstancedMesh[] = [];
  private last: number[] = [];
  private layers: LeafLayer[];

  constructor(private gates: GatePart[], layers: LeafLayer[], mapMat: (m: THREE.Material) => THREE.Material = (m) => m) {
    this.layers = [{ mat: gates[0]?.mat ?? 'flat:#fff', rect: [0, 0, 1, 1], proud: 0 }, ...layers];
    // Daylit if the gates stand above street level (elevated stations).
    const sky = gates.length ? skyAt(gates[0].pos[1]) : 0;
    for (const l of this.layers) {
      const mat = mapMat(getMaterial(l.mat));
      const geo = sky > 0 ? unitBox.clone() : unitBox;
      if (sky > 0) {
        const a = geo.getAttribute('aEnv') as THREE.BufferAttribute;
        for (let k = 0; k < a.count; k++) a.setX(k, sky);
      }
      const im = new THREE.InstancedMesh(geo, mat, gates.length * 2);
      im.frustumCulled = false;
      if (mat.transparent) im.renderOrder = 2;
      else im.castShadow = im.receiveShadow = true;
      this.meshes.push(im);
    }
    gates.forEach((_, i) => this.set(i, 0));
    this.commit();
  }

  private set(i: number, open: number) {
    const g = this.gates[i];
    this.last[i] = open;
    const half = g.width / 2;
    const alongX = g.along[0] !== 0;
    for (let k = 0; k < 2; k++) {
      const s = k === 0 ? -1 : 1;
      const centre = s * (half / 2 + open * half * 0.96);
      this.layers.forEach((l, li) => {
        const [u0, v0, u1, v1] = l.rect;
        // u runs from the meeting edge outwards, so both leaves mirror each other.
        const along = centre + s * ((u0 + u1) / 2 - 0.5) * half;
        const w = (u1 - u0) * half, h = (v1 - v0) * g.height, t = g.thick + l.proud * 2;
        m4.makeScale(alongX ? w : t, h, alongX ? t : w);
        m4.setPosition(g.pos[0] + (alongX ? along : 0), g.pos[1] + ((v0 + v1) / 2) * g.height, g.pos[2] + (alongX ? 0 : along));
        this.meshes[li].setMatrixAt(i * 2 + k, m4);
      });
    }
  }
  private commit() {
    for (const m of this.meshes) m.instanceMatrix.needsUpdate = true;
  }

  /** `openOf(gate)` → 0…1. Only touches the GPU buffers when something moved. */
  update(openOf: (g: GatePart) => number) {
    let dirty = false;
    this.gates.forEach((g, i) => {
      const o = openOf(g);
      if (Math.abs(o - this.last[i]) > 1e-4) {
        this.set(i, o);
        dirty = true;
      }
    });
    if (dirty) this.commit();
  }
  dispose() {
    for (const m of this.meshes) m.dispose();
  }
}

/** A build's signs. `layered`: sorted into 'surface' and 'deep' sub-groups, as the static geometry is (a station). */
export function makeSigns(build: Build, cache: SignCache, resolve?: (c: SignContent) => SignContent, layered = false): SignSet {
  return new SignSet(build.signs, cache, resolve, layered ? (p) => (layerOf(p.pos[1], p.pos[1]) === 'surface' ? 'surface' : 'deep') : undefined);
}
