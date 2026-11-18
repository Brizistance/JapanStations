// Renders SignParts as textured planes. Textures are cached per owner (a station or a
// train) and live signs (departure boards, in-car displays) are redrawn on a timer.

import * as THREE from 'three';
import { signKey, type SignContent } from '../signs/content';
import { drawSign, signPixels } from '../signs/draw';
import type { SignPart } from '../world/builder';
import { skyAt } from './geometry';
import { lit } from './lit';

interface Entry {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  tex: THREE.CanvasTexture;
  mat: THREE.Material;
  content: SignContent;
  live: boolean;
}
export type SignCache = Map<string, Entry>;

const LIVE = new Set(['dep', 'depAll', 'lcd']);
/** Printed or physical things (posters, murals, machine fronts, doors): lit by the room, not self-lit. */
const PRINTED = new Set(['poster', 'mural', 'machine', 'faremap']);

function planeWith(sky: number): THREE.PlaneGeometry {
  const g = new THREE.PlaneGeometry(1, 1);
  const env = new Float32Array(g.getAttribute('position').count * 2);
  for (let i = 0; i < env.length; i += 2) env[i] = sky;
  g.setAttribute('aEnv', new THREE.BufferAttribute(env, 2));
  return g;
}
const planeIn = planeWith(0), planeOut = planeWith(1);

function entry(cache: SignCache, c: SignContent, w: number, h: number): Entry {
  const k = signKey(c, w, h);
  let e = cache.get(k);
  if (!e) {
    const [W, H] = signPixels(w, h);
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    drawSign(ctx, W, H, c);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 16;
    // Signs are light boxes: self-lit, and LED boards are bright enough to bloom a little.
    const mat = PRINTED.has(c.k)
      ? lit({ map: tex, roughness: c.k === 'machine' ? 0.35 : 0.55, metalness: 0 }, { macro: 0, macroRough: 0 })
      : new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color().setScalar(LIVE.has(c.k) ? 1.5 : 1.12) });
    e = { canvas, ctx, tex, mat, content: c, live: LIVE.has(c.k) };
    cache.set(k, e);
  }
  return e;
}

/** Redraw every live sign in a cache from the current sim state. */
export function redrawLive(cache: SignCache) {
  for (const e of cache.values()) {
    if (!e.live) continue;
    drawSign(e.ctx, e.canvas.width, e.canvas.height, e.content);
    e.tex.needsUpdate = true;
  }
}
export function disposeCache(cache: SignCache) {
  for (const e of cache.values()) {
    e.tex.dispose();
    e.mat.dispose();
  }
  cache.clear();
}

export class SignSet {
  readonly group = new THREE.Group();
  private items: { mesh: THREE.Mesh; part: SignPart; key: string }[] = [];

  constructor(
    parts: SignPart[],
    private cache: SignCache,
    /** Lets an owner rewrite content, e.g. to bind a car's display to its train. */
    private resolve: (c: SignContent) => SignContent = (c) => c,
  ) {
    for (const part of parts) {
      const c = this.resolve(part.content);
      const e = entry(cache, c, part.w, part.h);
      const mesh = new THREE.Mesh(skyAt(part.pos[1]) > 0.5 ? planeOut : planeIn, e.mat);
      mesh.receiveShadow = true;
      mesh.scale.set(part.w, part.h, 1);
      mesh.position.set(part.pos[0], part.pos[1], part.pos[2]);
      if (part.normal) mesh.rotation.y = Math.atan2(part.normal[0], part.normal[1]);
      else {
        mesh.rotation.order = 'YXZ';
        mesh.rotation.x = -Math.PI / 2;
        mesh.rotation.y = Math.atan2(-part.top[0], -part.top[1]);
      }
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      this.group.add(mesh);
      this.items.push({ mesh, part, key: signKey(c, part.w, part.h) });
    }
  }

  /** Re-resolve dynamic signs whose content may have changed (e.g. destination after a reversal). */
  refresh() {
    for (const it of this.items) {
      if (!it.part.dynamic) continue;
      const c = this.resolve(it.part.content);
      const k = signKey(c, it.part.w, it.part.h);
      if (k !== it.key) {
        it.key = k;
        it.mesh.material = entry(this.cache, c, it.part.w, it.part.h).mat;
      }
    }
  }
}
