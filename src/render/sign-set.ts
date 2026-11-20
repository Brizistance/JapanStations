// Renders SignParts as textured planes. Textures are cached per owner (a station or a
// train) and live signs (departure boards, in-car displays) are redrawn on a timer.

import * as THREE from 'three';
import { signKey, type SignContent } from '../signs/content';
import { drawSign, isLed, signSize } from '../signs/draw';
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
  /** Departure boards: redrawn often near the player so tickers scroll smoothly. */
  fast: boolean;
}
export type SignCache = Map<string, Entry>;

const LIVE = new Set(['dep', 'depAll', 'lcd', 'clock', 'signal']);
const FAST = new Set(['dep', 'depAll']);
/** Printed or physical things (posters, murals, machine fronts, doors): lit by the room, not self-lit. */
const PRINTED = new Set(['poster', 'mural', 'machine', 'faremap', 'floormark', 'roadsign', 'roadboard', 'roadmark']);
/** Drawn on a transparent canvas and cut out to their shape (a round sign, paint on the road). */
const CUTOUT = new Set(['roadsign', 'roadmark']);

function planeWith(sky: number): THREE.PlaneGeometry {
  const g = new THREE.PlaneGeometry(1, 1);
  const env = new Float32Array(g.getAttribute('position').count * 2);
  for (let i = 0; i < env.length; i += 2) env[i] = sky;
  g.setAttribute('aEnv', new THREE.BufferAttribute(env, 2));
  return g;
}
const planeIn = planeWith(0), planeOut = planeWith(1);

/**
 * A dot-matrix LED board: one texel per LED, drawn as a round dot. Lit dots are bright enough
 * to bloom; unlit ones stay faintly visible, as on a real board. Far away, where a dot is
 * smaller than a couple of pixels, the mask fades to its average so it doesn't shimmer.
 */
function ledMaterial(tex: THREE.CanvasTexture, W: number, H: number): THREE.Material {
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  const mat = new THREE.MeshBasicMaterial({ map: tex });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uGrid = { value: new THREE.Vector2(W, H) };
    sh.fragmentShader = 'uniform vec2 uGrid;\n' + sh.fragmentShader.replace('#include <map_fragment>', /* glsl */ `
      vec4 texel = texture2D(map, vMapUv);
      vec2 g = vMapUv * uGrid;
      float dotMask = 1.0 - smoothstep(0.3, 0.44, length(fract(g) - 0.5));
      vec2 fw = fwidth(g);
      dotMask = mix(dotMask, 0.45, clamp(max(fw.x, fw.y) * 2.0 - 0.6, 0.0, 1.0));
      float lit = step(0.05, max(texel.r, max(texel.g, texel.b)));
      diffuseColor.rgb = mix(vec3(0.035, 0.032, 0.03), texel.rgb * 2.4, lit) * dotMask;
    `);
  };
  mat.customProgramCacheKey = () => 'led-dots';
  return mat;
}

function entry(cache: SignCache, c: SignContent, w: number, h: number): Entry {
  const k = signKey(c, w, h);
  let e = cache.get(k);
  if (!e) {
    const [W, H] = signSize(c, w, h);
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    drawSign(ctx, W, H, c);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 16;
    // Signs are light boxes: self-lit, and LED boards are bright enough to bloom a little.
    // LCD boards glow less than LED dots but more than the printed signs, which stay below bloom.
    const mat = isLed(c) ? ledMaterial(tex, W, H) : PRINTED.has(c.k)
      ? lit({ map: tex, roughness: c.k === 'machine' ? 0.35 : 0.55, metalness: 0 }, { macro: 0, macroRough: 0 })
      : new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color().setScalar(FAST.has(c.k) ? 1.35 : LIVE.has(c.k) ? 1.5 : 1.12) });
    if (CUTOUT.has(c.k)) mat.alphaTest = 0.5;
    e = { canvas, ctx, tex, mat, content: c, live: LIVE.has(c.k), fast: FAST.has(c.k) };
    cache.set(k, e);
  }
  return e;
}

/** Redraw every live sign in a cache from the current sim state (only departure boards if `fastOnly`). */
export function redrawLive(cache: SignCache, fastOnly = false) {
  for (const e of cache.values()) {
    if (!e.live || (fastOnly && !e.fast)) continue;
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

const dummy = new THREE.Object3D();
/** Where a sign stands and which way it faces, as a matrix (a wall sign by its normal, a floor decal by its top). */
function signMatrix(part: SignPart): THREE.Matrix4 {
  dummy.rotation.order = 'YXZ';
  dummy.scale.set(part.w, part.h, 1);
  dummy.position.set(part.pos[0], part.pos[1], part.pos[2]);
  if (part.normal) dummy.rotation.set(0, Math.atan2(part.normal[0], part.normal[1]), 0);
  else dummy.rotation.set(-Math.PI / 2, Math.atan2(-part.top[0], -part.top[1]), 0);
  dummy.updateMatrix();
  return dummy.matrix;
}

export class SignSet {
  readonly group = new THREE.Group();
  /** Dynamic signs only: the ones whose content may be re-resolved. */
  private items: { mesh: THREE.Mesh; part: SignPart; key: string }[] = [];

  constructor(
    parts: SignPart[],
    private cache: SignCache,
    /** Lets an owner rewrite content, e.g. to bind a car's display to its train. */
    private resolve: (c: SignContent) => SignContent = (c) => c,
    /**
     * Sorts the signs into sub-groups (tagged `userData.layer`) so a station can leave out the
     * ones that cannot be seen. Without it they all go straight into `group`.
     */
    layerOf?: (part: SignPart) => string,
  ) {
    const layers = new Map<string, THREE.Group>();
    const into = (part: SignPart): THREE.Group => {
      if (!layerOf) return this.group;
      const l = layerOf(part);
      let g = layers.get(l);
      if (!g) {
        g = new THREE.Group();
        g.userData.layer = l;
        g.matrixAutoUpdate = false;
        layers.set(l, g);
        this.group.add(g);
      }
      return g;
    };
    // Signs that share a texture, a plane and a layer are one instanced mesh: a row of posters,
    // the paint along a road and every signal head of a phase cost one draw call each.
    const batches = new Map<string, { parent: THREE.Group; geo: THREE.PlaneGeometry; mat: THREE.Material; parts: SignPart[] }>();
    for (const part of parts) {
      const c = this.resolve(part.content);
      const e = entry(cache, c, part.w, part.h);
      const geo = skyAt(part.pos[1]) > 0.5 ? planeOut : planeIn;
      const parent = into(part);
      if (part.dynamic) {
        const mesh = new THREE.Mesh(geo, e.mat);
        mesh.receiveShadow = true;
        mesh.matrixAutoUpdate = false;
        mesh.matrix.copy(signMatrix(part));
        parent.add(mesh);
        this.items.push({ mesh, part, key: signKey(c, part.w, part.h) });
        continue;
      }
      const k = `${signKey(c, part.w, part.h)}|${geo === planeOut ? 'o' : 'i'}|${parent.id}`;
      const b = batches.get(k);
      if (b) b.parts.push(part);
      else batches.set(k, { parent, geo, mat: e.mat, parts: [part] });
    }
    for (const b of batches.values()) {
      const mesh = new THREE.InstancedMesh(b.geo, b.mat, b.parts.length);
      b.parts.forEach((part, n) => mesh.setMatrixAt(n, signMatrix(part)));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false;
      b.parent.add(mesh);
    }
  }

  /** Re-resolve dynamic signs whose content may have changed (e.g. destination after a reversal). */
  refresh() {
    for (const it of this.items) {
      const c = this.resolve(it.part.content);
      const k = signKey(c, it.part.w, it.part.h);
      if (k !== it.key) {
        it.key = k;
        it.mesh.material = entry(this.cache, c, it.part.w, it.part.h).mat;
      }
    }
  }
}
