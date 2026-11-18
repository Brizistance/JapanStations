// Builds the three.js objects for a Build (station or car): merged static meshes,
// signs, and instanced sliding gates.

import * as THREE from 'three';
import type { Build, GatePart } from '../world/builder';
import { boxesToGeometry, groupBy, meshesToGeometry } from './geometry';
import { getMaterial } from './materials';
import { SignSet, type SignCache } from './sign-set';
import type { SignContent } from '../signs/content';

const geoCache = new Map<string, THREE.Group>();

/** Static geometry for a build. If `shareKey` is given the meshes are built once and cloned. */
export function staticGroup(build: Build, shareKey?: string): { group: THREE.Group; dispose: () => void } {
  if (shareKey) {
    let proto = geoCache.get(shareKey);
    if (!proto) {
      proto = makeStatic(build);
      geoCache.set(shareKey, proto);
    }
    return { group: proto.clone(), dispose: () => {} };
  }
  const group = makeStatic(build);
  return {
    group,
    dispose: () => group.traverse((o) => (o as THREE.Mesh).geometry?.dispose()),
  };
}

function makeStatic(build: Build): THREE.Group {
  const group = new THREE.Group();
  const add = (g: THREE.BufferGeometry | null, mat: string) => {
    if (!g) return;
    const m = new THREE.Mesh(g, getMaterial(mat));
    m.matrixAutoUpdate = false;
    const t = (m.material as THREE.Material).transparent;
    if (t) m.renderOrder = 2;
    group.add(m);
  };
  for (const [mat, boxes] of groupBy(build.boxes)) add(boxesToGeometry(boxes), mat);
  for (const [mat, parts] of groupBy(build.meshes)) add(meshesToGeometry(parts), mat);
  return group;
}

const unitBox = new THREE.BoxGeometry(1, 1, 1);
const m4 = new THREE.Matrix4();

/** Sliding gate leaves (platform screen doors / train doors) as one instanced mesh. */
export class GateSet {
  readonly mesh: THREE.InstancedMesh;
  readonly glass: THREE.InstancedMesh | null;
  private last: number[] = [];

  constructor(private gates: GatePart[], withWindow: boolean) {
    const mat = getMaterial(gates[0]?.mat ?? 'flat:#fff');
    this.mesh = new THREE.InstancedMesh(unitBox, mat, gates.length * 2);
    this.mesh.frustumCulled = false;
    this.glass = withWindow ? new THREE.InstancedMesh(unitBox, getMaterial('glassTint'), gates.length * 2) : null;
    if (this.glass) {
      this.glass.frustumCulled = false;
      this.glass.renderOrder = 2;
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
      const off = s * (half / 2 + open * half * 0.96);
      const x = g.pos[0] + (alongX ? off : 0), z = g.pos[2] + (alongX ? 0 : off);
      m4.makeScale(alongX ? half : g.thick, g.height, alongX ? g.thick : half);
      m4.setPosition(x, g.pos[1] + g.height / 2, z);
      this.mesh.setMatrixAt(i * 2 + k, m4);
      if (this.glass) {
        m4.makeScale(alongX ? half * 0.7 : g.thick * 1.3, g.height * 0.42, alongX ? g.thick * 1.3 : half * 0.7);
        m4.setPosition(x, g.pos[1] + g.height * 0.68, z);
        this.glass.setMatrixAt(i * 2 + k, m4);
      }
    }
  }
  private commit() {
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.glass) this.glass.instanceMatrix.needsUpdate = true;
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
    this.mesh.dispose();
    this.glass?.dispose();
  }
}

export function makeSigns(build: Build, cache: SignCache, resolve?: (c: SignContent) => SignContent): SignSet {
  return new SignSet(build.signs, cache, resolve);
}
