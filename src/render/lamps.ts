// Outdoor lights at night: street lamps, station entrances, shopfronts, parked cars and
// train headlights. None is a real three.js light. Their positions are read from each
// station's build, the nearest few to the camera go to the lit material as uniforms
// (lit.ts, `uLampPos`), and the shader brightens surfaces around them. No shadows.

import * as THREE from 'three';
import { WORLDS } from '../stations';
import { GROUND_Y } from '../stations/kit';
import { toWorld } from '../world/collision';
import { modelsLoaded, signTint } from './building-models';
import { BUILDING_MODELS } from '../stations/buildings';
import { LAMPS, shared } from './lit';

type RGB = [number, number, number];
interface Lamp {
  x: number; y: number; z: number;
  /** Reach in metres. */
  r: number;
  c: RGB;
  /** A street lamp (drawn as a dot from far away). */
  street?: boolean;
}

/** Height of the lantern, how far it hangs out over the road, reach and colour, by street-light model. */
const STREET: Record<string, { h: number; out: number; r: number; c: RGB }> = {
  lamp_hw: { h: 8.2, out: 1.8, r: 22, c: [1.5, 1.6, 1.7] },
  lamp_shop: { h: 4.2, out: 0.3, r: 12, c: [1.7, 1.3, 0.85] },
  lamp_park: { h: 3.2, out: 0, r: 10, c: [1.5, 1.2, 0.8] },
  lamp_led: { h: 7.6, out: 1.9, r: 22, c: [1.6, 1.65, 1.7] },
  lamp_suzuran: { h: 4.4, out: 0, r: 13, c: [1.8, 1.35, 0.85] },
  lamp_small: { h: 4.55, out: 0.8, r: 12, c: [0.85, 0.9, 0.9] },
  // The street light on a utility pole (build_road.py upole: its LED head 1.25 m out, 5.25 m up).
  upole: { h: 5.2, out: 1.25, r: 12, c: [0.9, 0.95, 0.95] },
  upole_l: { h: 5.2, out: 1.25, r: 12, c: [0.9, 0.95, 0.95] },
  // Twin arms along the model's front and back, 3 m out each (handled in collect).
  lamp_twin: { h: 9.9, out: 3.05, r: 24, c: [1.6, 1.65, 1.7] },
  // The strip light under a vending nook's roof.
  vendroof: { h: 2.4, out: 0.45, r: 7, c: [0.9, 0.95, 1.0] },
};
const ENTRANCE: RGB = [1.25, 1.35, 1.4], SHOP: RGB = [0.8, 0.64, 0.42], CAR: RGB = [1.3, 1.25, 1.05];
/** A konbini's ceiling lights, as one light over its counter; and a shop's hanging lamp or lantern. */
const KONBINI: RGB = [1.15, 1.2, 1.2], PENDANT: RGB = [1.2, 0.9, 0.55];
/** An alley's bracket lamp: warm, short reach. */
const ALLEY: RGB = [1.1, 0.85, 0.55];
/** Building kinds with a back door and its bracket lamp (tools/blender/buildkit.py backs, back=True). */
const BACK_DOOR = new Set(['machi', 'zakkyo', 'office', 'boutique', 'canalfront']);
/** A vending machine's face: cold white. */
const VEND: RGB = [0.75, 0.82, 0.9];
/** Buildings with shops at street level. */
const SHOPFRONTS = new Set(['zakkyo', 'shophouse']);
const CARS = /^(sedan|taxi|kei|van|truck|bus$)/;
/** A globe or chandelier that lights the room or porch round it at night (looks and streets use this colour for it). */
export const INDOOR_LAMP = 'glow:#ffe6b8';
const RANGE = 130, RANGE_FAR = 260;

let fixed: Lamp[] | null = null;
let pending: Lamp[] | null = null, wait = 0;

function collect(): Lamp[] {
  const out: Lamp[] = [];
  const p: [number, number, number] = [0, 0, 0];
  for (const w of WORLDS) {
    const add = (lx: number, ly: number, lz: number, r: number, c: RGB, street = false) => {
      // Street level and above only: shops in the halls below are lit by the station.
      if (ly < GROUND_Y + 0.3) return;
      toWorld(w.frame, [lx, ly, lz], p);
      out.push({ x: p[0], y: p[1], z: p[2], r, c, street });
    };
    for (const m of w.build.models) {
      // The model's front (local −z) turned by its yaw.
      const fx = -Math.sin(m.yaw), fz = -Math.cos(m.yaw);
      const s = m.kind === 'road' ? STREET[m.id] : undefined;
      if (s) {
        add(m.pos[0] + fx * s.out, m.pos[1] + s.h, m.pos[2] + fz * s.out, s.r, s.c, true);
        if (m.id === 'lamp_twin') add(m.pos[0] - fx * s.out, m.pos[1] + s.h, m.pos[2] - fz * s.out, s.r, s.c, true);
      }
      else if (m.kind === 'road' && CARS.test(m.id)) add(m.pos[0] + fx * 4, m.pos[1] + 0.7, m.pos[2] + fz * 4, 7, CAR);
      // A vending machine's lit face.
      else if (m.kind === 'station' && m.id.startsWith('vend_')) add(m.pos[0] + fx * 0.7, m.pos[1] + 1.1, m.pos[2] + fz * 0.7, 4.5, VEND);
      else if (m.kind === 'konbini' && m.id === 'counter') add(m.pos[0], m.pos[1] + 2.5, m.pos[2], 13, KONBINI);
      else if (m.kind === 'shops' && (m.id === 'pendant' || m.id === 'lantern')) add(m.pos[0], m.pos[1] + 1.9, m.pos[2], 5, PENDANT);
      if (BACK_DOOR.has(m.kind) && !m.id.endsWith('_lo')) {
        // The lamp over the back door: local (−w/2 + 0.95, 2.55, d + 0.3), the model's front being local −z.
        const bm = BUILDING_MODELS.find((q) => q.kind === m.kind && q.id === m.id);
        if (bm) {
          const lx = -bm.w / 2 + 0.95, lz = bm.d + 0.3, c = Math.cos(m.yaw), sn = Math.sin(m.yaw);
          add(m.pos[0] + lx * c + lz * sn, m.pos[1] + 2.45, m.pos[2] - lx * sn + lz * c, 8, ALLEY);
        }
      }
      // Daigaku-mae's bookshops, eateries and kissaten: their lit fronts.
      if (m.kind === 'daigakufront' && /^(kosho|mise|kissa)/.test(m.id)) add(m.pos[0] + fx * 1.6, m.pos[1] + 2.6, m.pos[2] + fz * 1.6, 9, SHOP);
      if (SHOPFRONTS.has(m.kind)) {
        // The colour of the building's sign boards, spilling onto the street in front of it.
        const tint = signTint(m.kind, m.id);
        if (tint) {
          const top = Math.max(tint[0], tint[1], tint[2], 0.05), g = 1.5 / top;
          add(m.pos[0] + fx * 3, m.pos[1] + 5.5, m.pos[2] + fz * 3, 12, [tint[0] * g * 0.35 + 0.18, tint[1] * g * 0.35 + 0.18, tint[2] * g * 0.35 + 0.18]);
        }
        add(m.pos[0] + fx * 1.6, m.pos[1] + 2.6, m.pos[2] + fz * 1.6, 9, SHOP);
      }
    }
    // The small bracket lamps of the alleys and back lanes (warm glowing globes, surface.ts backGap / alley).
    for (const m of w.build.meshes) {
      if (m.mat === 'glow:#ffd9a0' && m.shape === 'sphere' && m.pos[1] > GROUND_Y + 2 && m.pos[1] < GROUND_Y + 4.5) add(m.pos[0], m.pos[1] - 0.2, m.pos[2], 8, ALLEY);
      // Rooms and porches at street level and above: a warm globe (`INDOOR_LAMP`) lights round it, its reach by its size.
      else if (m.mat === INDOOR_LAMP && m.pos[1] > GROUND_Y + 1) add(m.pos[0], m.pos[1] - 0.3, m.pos[2], Math.min(16, 6 + m.size[0] * 12), PENDANT);
    }
    // Stairwell mouths: the light of the station coming up out of the ground.
    for (const [x0, z0, x1, z1] of w.build.holes) add((x0 + x1) / 2, GROUND_Y + 2.3, (z0 + z1) / 2, 10, ENTRANCE);
  }
  return out;
}

/** Lights that move: filled by the train views each frame (world-view.ts). */
export const headlights: { x: number; y: number; z: number }[] = [];
const HEAD: RGB = [2.0, 1.9, 1.6];
/** Level crossings' lit warning lamps: filled by the station views each frame (world-view.ts). */
export const xingLights: { x: number; y: number; z: number }[] = [];
const XING_RED: RGB = [2.4, 0.12, 0.06];
/** Headlights of the road traffic: filled by the traffic view each frame (traffic-view.ts). */
export const carLights: { x: number; y: number; z: number }[] = [];

const near: { l: Lamp; d: number }[] = [];
const moving: Lamp[] = [];
let reach = RANGE;

/**
 * Send the `max` lights nearest `cam` to the lit material. `night`: 0 by day (no lights) … 1.
 * Beyond the furthest light kept, an even city-light level takes over (lit.ts, `uCity`), so far
 * streets are lit too without a pool each.
 */
export function updateLamps(cam: THREE.Vector3, night: number, max: number, dt: number) {
  if (night < 0.02) {
    shared.uLampCount.value = 0;
    shared.uCity.value.x = 0;
    return;
  }
  // Sign colours come with the building models: until those have loaded, collect afresh every few frames.
  const list0 = fixed ?? (wait++ % 20 === 0 || !pending ? (pending = collect()) : pending);
  if (!fixed && modelsLoaded()) fixed = collect();
  const range = max > 32 ? RANGE_FAR : RANGE;
  near.length = 0;
  moving.length = 0;
  for (const h of headlights) moving.push({ x: h.x, y: h.y, z: h.z, r: 18, c: HEAD });
  for (const h of carLights) moving.push({ x: h.x, y: h.y, z: h.z, r: 8, c: CAR });
  for (const h of xingLights) moving.push({ x: h.x, y: h.y, z: h.z, r: 9, c: XING_RED });
  for (const list of [fixed ?? list0, moving]) {
    for (const l of list) {
      const dx = l.x - cam.x, dz = l.z - cam.z;
      if (Math.abs(dx) > range || Math.abs(dz) > range) continue;
      const d = Math.hypot(dx, l.y - cam.y, dz);
      if (d < range) near.push({ l, d });
    }
  }
  near.sort((a, b) => a.d - b.d);
  // Lights fade out towards the furthest one kept, so none pops as the player moves.
  const cut = near.length > max ? near[max].d : range;
  const n = Math.min(max, near.length);
  for (let i = 0; i < n; i++) {
    const { l, d } = near[i];
    const t = Math.min(1, Math.max(0, (d / cut - 0.7) / 0.3));
    const k = night * 0.95 * (1 - t * t * (3 - 2 * t));
    shared.uLampPos.value[i].set(l.x, l.y, l.z, l.r);
    shared.uLampCol.value[i].set(l.c[0] * k, l.c[1] * k, l.c[2] * k);
  }
  shared.uLampCount.value = n;
  reach += (cut - reach) * Math.min(1, dt * 2);
  shared.uCity.value.set(night * 0.45, reach * 0.55, reach * 1.05);
}

/** Every street lamp as a small bright dot, so lit streets read from far away. One draw call. */
export class LampDots {
  readonly points: THREE.Points;
  private mat = new THREE.PointsMaterial({ size: 3.2, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: true });
  private built = false;

  constructor() {
    this.points = new THREE.Points(new THREE.BufferGeometry(), this.mat);
    this.points.frustumCulled = false;
    this.points.visible = false;
    this.points.userData.noAO = true;
  }

  update(night: number) {
    if (!this.built && fixed) {
      const lamps = fixed.filter((l) => l.street);
      const pos = new Float32Array(lamps.length * 3), col = new Float32Array(lamps.length * 3);
      lamps.forEach((l, i) => {
        pos.set([l.x, l.y, l.z], i * 3);
        col.set([l.c[0] * 1.3, l.c[1] * 1.3, l.c[2] * 1.3], i * 3);
      });
      this.points.geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      this.points.geometry.setAttribute('color', new THREE.BufferAttribute(col, 3));
      this.built = true;
    }
    this.points.visible = this.built && night > 0.02;
    this.mat.opacity = night;
  }

  dispose() {
    this.points.geometry.dispose();
    this.mat.dispose();
  }
}
