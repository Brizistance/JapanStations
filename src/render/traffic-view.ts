// Draws the moving road traffic (traffic/street.ts). Bodies: one instanced mesh per vehicle model
// and material, so a street full of vehicles costs a handful of draw calls. Wheels: one tyre and
// one rim, instanced for every wheel on the road, turning with the distance driven and steering
// in a bend. Lamps: one small bright box, instanced for every lamp that is lit (tail lamps and
// headlamps at night, brake lamps when slowing, blinkers before and in a turn, a taxi's roof lamp).

import * as THREE from 'three';
import { streets } from '../traffic/street';
import type { Vehicle } from '../traffic/system';
import { MOVING, QUIET, RIG, family } from '../traffic/vehicles';
import { toWorld } from '../world/collision';
import { modelPieces } from './building-models';
import { carLights } from './lamps';
import { getMaterial } from './materials';

/** Most vehicles of one model, wheels and lit lamps drawn at once. */
const MAX = 48, MAX_WHEELS = 640, MAX_LAMPS = 1400;
/** Metres from a route's end over which a vehicle shrinks away (out of sight, where its road runs on past the plot). */
const FADE = 7;

/** A moving vehicle in world space, for the sound (audio/traffic.ts). */
export interface Passing {
  key: object;
  x: number;
  y: number;
  z: number;
  speed: number;
  heavy: boolean;
  /** A bus (its air brake is heard when it stops), a scooter, or anything else. */
  kind: 'bus' | 'scooter' | 'other';
}
/** The vehicles drawn this frame that can be heard. */
export const passing: Passing[] = [];

type RGB = [number, number, number];
const HEAD: RGB = [2.4, 2.3, 2.0], TAIL: RGB = [0.9, 0.02, 0.015], BRAKE: RGB = [1.6, 0, 0.03], BLINK: RGB = [3.2, 1.7, 0.12], ROOF: RGB = [1.7, 1.6, 1.1];

/** A unit wheel on the x axis: radius 1, width 1. `sides`: few, so that a rim is seen to turn. */
function wheel(radius: number, width: number, sides: number): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(radius, radius, width, sides);
  g.rotateZ(Math.PI / 2);
  const env = new Float32Array(g.getAttribute('position').count * 2);
  for (let i = 0; i < env.length; i += 2) env[i] = 1;
  g.setAttribute('aEnv', new THREE.BufferAttribute(env, 2));
  return g;
}

export class TrafficView {
  readonly root = new THREE.Group();
  private bodies = new Map<string, THREE.InstancedMesh[]>();
  private counts = new Map<string, number>();
  private tyres: THREE.InstancedMesh;
  private rims: THREE.InstancedMesh;
  private lamps: THREE.InstancedMesh;
  private nWheels = 0;
  private nLamps = 0;
  /** Each vehicle's pitch and roll, eased. */
  private lean = new WeakMap<Vehicle, { pitch: number; roll: number }>();
  private body = new THREE.Matrix4();
  private flat = new THREE.Matrix4();
  private m4 = new THREE.Matrix4();
  private part = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private e = new THREE.Euler(0, 0, 0, 'YXZ');
  private p = new THREE.Vector3();
  private size = new THREE.Vector3(1, 1, 1);
  private col = new THREE.Color();
  private w: [number, number, number] = [0, 0, 0];

  constructor() {
    const add = (mesh: THREE.InstancedMesh, shadow: boolean) => {
      mesh.frustumCulled = false;
      mesh.count = 0;
      mesh.castShadow = shadow;
      mesh.receiveShadow = shadow;
      this.root.add(mesh);
      return mesh;
    };
    this.tyres = add(new THREE.InstancedMesh(wheel(1, 1, 14), getMaterial('flat:#1c1c1e'), MAX_WHEELS), true);
    this.rims = add(new THREE.InstancedMesh(wheel(0.6, 1.06, 5), getMaterial('flat:#b9bdc2'), MAX_WHEELS), false);
    this.lamps = add(new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }), MAX_LAMPS), false);
    this.lamps.userData.noAO = true;
    this.lamps.setColorAt(0, this.col.setRGB(0, 0, 0));
  }

  private model(id: string): THREE.InstancedMesh[] | null {
    let list = this.bodies.get(id);
    if (list) return list;
    // The copy built without wheels, where there is one: the wheels are drawn here.
    const pieces = modelPieces('road', `${id}_body`) ?? modelPieces('road', id);
    if (!pieces) return null;
    list = pieces.map(({ geometry, material }) => {
      const mesh = new THREE.InstancedMesh(geometry, material, MAX);
      mesh.userData.shared = true; // the geometry belongs to the loaded model
      mesh.frustumCulled = false;
      mesh.count = 0;
      const litOpaque = !material.transparent && (material as THREE.MeshStandardMaterial).isMeshStandardMaterial === true;
      mesh.castShadow = litOpaque;
      mesh.receiveShadow = litOpaque;
      if (material.transparent) mesh.renderOrder = 2;
      this.root.add(mesh);
      return mesh;
    });
    this.bodies.set(id, list);
    return list;
  }

  /** A lit lamp at (x, y, z) of the vehicle whose matrix is `this.body`. */
  private lamp(x: number, y: number, z: number, sx: number, sy: number, c: RGB, k = 1) {
    if (this.nLamps >= MAX_LAMPS) return;
    this.part.makeTranslation(x, y, z).scale(this.size.set(sx, sy, 0.05));
    this.lamps.setMatrixAt(this.nLamps, this.m4.multiplyMatrices(this.body, this.part));
    this.lamps.setColorAt(this.nLamps++, this.col.setRGB(c[0] * k, c[1] * k, c[2] * k));
  }

  /**
   * Place every vehicle. `show`: the street can be seen from where the camera is. `night`: 0 … 1.
   * `dt`: seconds since the last frame. `time`: seconds, for the blinkers.
   */
  update(show: boolean, night: number, dt: number, time: number) {
    passing.length = 0;
    carLights.length = 0;
    this.root.visible = show;
    this.nWheels = 0;
    this.nLamps = 0;
    for (const id of MOVING) this.counts.set(id, 0);
    const blinkOn = Math.floor(time * 2.6) % 2 === 0, ease = Math.min(1, dt * 6);
    if (show) {
      for (const s of streets) {
        const f = s.world.frame;
        for (const v of s.sim.list) {
          const fam = family(v.model), rig = RIG[fam], single = rig.wheels.half === 0, quiet = QUIET.has(fam);
          // The model's nose is its local −z.
          const yaw = Math.atan2(-v.hx, -v.hz) + f.yaw;
          toWorld(f, [v.x, v.y, v.z], this.w);
          const [x, y, z] = this.w;
          if (!quiet) passing.push({ key: v, x, y, z, speed: v.v, heavy: v.heavy, kind: fam === 'bus' ? 'bus' : fam === 'scooter' ? 'scooter' : 'other' });
          // Headlights on the road ahead.
          if (night > 0.02 && !quiet) carLights.push({ x: x - Math.sin(yaw) * (v.len / 2 + 3.5), y: y + 0.7, z: z - Math.cos(yaw) * (v.len / 2 + 3.5) });
          const list = this.model(v.model);
          const n = this.counts.get(v.model) ?? 0;
          if (!list || n >= MAX) continue;
          // Entering and leaving at the far end of its road, a vehicle grows from and shrinks to nothing.
          const edge = Math.min(v.s + v.len / 2, v.route.len - v.s + v.len / 2) / FADE;
          const k = edge >= 1 ? 1 : Math.max(0.001, edge * edge * (3 - 2 * edge));
          // The body dips under braking and leans out of a bend; a two-wheeler leans into it.
          let lean = this.lean.get(v);
          if (!lean) this.lean.set(v, (lean = { pitch: 0, roll: 0 }));
          const pull = v.bend * v.v * v.v;
          const roll = single ? Math.max(-0.32, Math.min(0.32, -pull * 0.07)) : Math.max(-0.045, Math.min(0.045, pull * 0.014));
          lean.pitch += (Math.max(-0.035, Math.min(0.028, v.acc * 0.011)) - lean.pitch) * ease;
          lean.roll += (roll - lean.roll) * ease;
          this.p.set(x, y, z);
          this.size.set(k, k, k);
          this.flat.compose(this.p, this.q.setFromEuler(this.e.set(0, yaw, single ? lean.roll : 0)), this.size);
          this.body.compose(this.p, this.q.setFromEuler(this.e.set(single ? 0 : lean.pitch, yaw, lean.roll)), this.size);
          for (const mesh of list) mesh.setMatrixAt(n, this.body);
          this.counts.set(v.model, n + 1);

          // Wheels: they turn with the distance driven; the front ones steer in a bend.
          const wh = rig.wheels, steer = Math.atan(-v.bend * (wh.zs[wh.zs.length - 1] - wh.zs[0]));
          for (let a = 0; a < wh.zs.length; a++) {
            for (const side of single ? [0] : [-1, 1]) {
              if (this.nWheels >= MAX_WHEELS) break;
              this.q.setFromEuler(this.e.set(-v.s / wh.r, a === 0 ? steer : 0, 0));
              this.part.compose(this.p.set(side * wh.half, wh.r, wh.zs[a]), this.q, this.size.set(wh.w, wh.r, wh.r));
              this.m4.multiplyMatrices(this.flat, this.part);
              this.tyres.setMatrixAt(this.nWheels, this.m4);
              this.rims.setMatrixAt(this.nWheels++, this.m4);
            }
          }

          // Lamps.
          const L = rig.lamps;
          for (const side of single ? [0] : [-1, 1]) {
            if (night > 0.05) {
              this.lamp(side * L.x, L.y, L.zf - 0.03, L.wide, 0.12, HEAD, night);
              this.lamp(side * L.x, L.y + 0.09, L.zr + 0.03, L.wide, 0.14, TAIL, night);
            }
            if (v.braking && fam !== 'cycle') this.lamp(side * L.x, L.y + 0.09, L.zr + 0.035, L.wide + 0.02, 0.16, BRAKE);
          }
          if (v.blink && blinkOn && fam !== 'cycle') {
            const bx = v.blink * (single ? 0.13 : L.x + L.wide / 2 + 0.04);
            this.lamp(bx, L.y, L.zf - 0.03, 0.13, 0.1, BLINK);
            this.lamp(bx, L.y + 0.19, L.zr + 0.035, 0.13, 0.1, BLINK);
          }
          if (v.model === 'taxi' && night > 0.05) this.lamp(0, 1.51, -0.15, 0.42, 0.15, ROOF, night);
        }
      }
    }
    for (const [id, list] of this.bodies) {
      const n = this.counts.get(id) ?? 0;
      for (const mesh of list) {
        mesh.count = n;
        mesh.instanceMatrix.needsUpdate = true;
      }
    }
    for (const mesh of [this.tyres, this.rims]) {
      mesh.count = this.nWheels;
      mesh.instanceMatrix.needsUpdate = true;
    }
    this.lamps.count = this.nLamps;
    this.lamps.instanceMatrix.needsUpdate = true;
    if (this.lamps.instanceColor) this.lamps.instanceColor.needsUpdate = true;
  }

  dispose() {
    for (const list of this.bodies.values()) for (const mesh of list) mesh.dispose();
    this.bodies.clear();
    for (const mesh of [this.tyres, this.rims, this.lamps]) {
      mesh.geometry.dispose();
      mesh.dispose();
    }
    (this.lamps.material as THREE.Material).dispose();
  }
}
