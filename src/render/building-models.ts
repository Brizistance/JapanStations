// The Blender-built street buildings (public/models/buildings/<kind>.glb, tools/blender/build_*.py).
//
// The layout of those files is described at the top of tools/blender/buildkit.py. In short: colour
// is in the vertex colours, so a building body is one 'paint' mesh plus its windows, and the
// readable faces of its sign boards are one 'signface' mesh whose texture is drawn here, from the
// board list the model carries, with invented shop names.
//
// Only what you see: the street builder adds the collider (stations/surface.ts).

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { SignContent } from '../signs/content';
import { drawSign } from '../signs/draw';
import { SIGN_WORDS, TOWER_NAMES, type BuildingKind } from '../stations/buildings';
import { SHOPS } from '../stations/surface';
import { rng, type ModelPart } from '../world/builder';
import { lit } from './lit';
import { getMaterial } from './materials';

interface Board {
  /** Atlas rect [u0, v0, u1, v1] with v up (Blender); glTF UVs are 1 - v. */
  uv: [number, number, number, number];
  w: number;
  h: number;
  col: string;
}
interface Proto {
  pieces: { geometry: THREE.BufferGeometry; mat: string }[];
  boards: Board[];
}

const KINDS: BuildingKind[] = ['zakkyo', 'office', 'tower', 'shophouse', 'manshon'];
/** Station props and one-off buildings built the same way (tools/blender/build_hub.py, build_plaza.py). */
const PROPS = ['hub', 'plaza', 'tsumugi', 'exchange', 'road', 'city', 'konbini', 'station', 'shops', 'places'];
/** Of those, the ones that stand outdoors and take daylight (tools/blender/build_plaza.py). */
const OUTDOOR = ['plaza', 'exchange', 'road', 'city', 'konbini', 'places'];
/** Kinds that also get a copy without daylight, named <kind>u_<id>, for use below the street (a station kiosk). */
const UNDER = ['konbini'];
/** Daylight of single models that differ from their file: a dome above the roofs. */
const DAYLIGHT: Record<string, number> = { tsumugi_dome: 1 };
/** How many different sets of shop names one model variant can carry. */
const NAME_SETS = 3;
const ATLAS_PX = 1024;

const protos = new Map<string, Proto>();
const materials = new Map<string, THREE.Material>();
let loading: Promise<void> | null = null;

/** Daylight on every vertex; box-projected UVs in metres for the macro texture (sign faces keep their atlas UVs). */
function addAttributes(g: THREE.BufferGeometry, keepUv: boolean, daylight = 1) {
  const pos = g.getAttribute('position'), nor = g.getAttribute('normal');
  const env = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) env[i * 2] = daylight;
  g.setAttribute('aEnv', new THREE.BufferAttribute(env, 2));
  if (!keepUv) {
    const uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      const ax = Math.abs(nor.getX(i)), ay = Math.abs(nor.getY(i)), az = Math.abs(nor.getZ(i));
      uv[i * 2] = ax >= ay && ax >= az ? pos.getZ(i) : pos.getX(i);
      uv[i * 2 + 1] = ay > ax && ay >= az ? pos.getZ(i) : pos.getY(i);
    }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  }
  g.computeBoundingSphere();
}

function collect(root: THREE.Object3D, daylight = 1): Proto {
  const proto: Proto = { pieces: [], boards: [] };
  root.traverse((o) => {
    if (typeof o.userData.signs === 'string') proto.boards = JSON.parse(o.userData.signs) as Board[];
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mat = (mesh.material as THREE.Material).name;
    addAttributes(mesh.geometry, mat === 'signface', daylight);
    proto.pieces.push({ geometry: mesh.geometry, mat });
  });
  return proto;
}

/** Start loading the models (once). Rejects if a file is missing or broken. */
export function loadBuildingModels(): Promise<void> {
  loading ??= Promise.all([...KINDS, ...PROPS].map((kind) => new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}models/buildings/${kind}.glb`).then((gltf) => {
    const daylight = PROPS.includes(kind) && !OUTDOOR.includes(kind) ? 0 : 1;
    // The simplified copies (<kind>_<id>_lo) are kept too: a ModelPart asks for one with the id '<id>_lo'.
    for (const root of gltf.scene.children) {
      if (!root.name.startsWith(`${kind}_`)) continue;
      if (UNDER.includes(kind)) {
        const copy = root.clone(true);
        copy.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.isMesh) m.geometry = m.geometry.clone();
        });
        protos.set(root.name.replace(`${kind}_`, `${kind}u_`), collect(copy, 0));
      }
      protos.set(root.name, collect(root, DAYLIGHT[root.name] ?? daylight));
    }
  }))).then(() => undefined);
  return loading;
}

function material(name: string): THREE.Material {
  let m = materials.get(name);
  if (m) return m;
  switch (name) {
    case 'paint':
      m = lit({ color: '#ffffff', vertexColors: true, roughness: 0.68, metalness: 0 }, { macro: 0.05, macroRough: 0.1 });
      break;
    case 'window':
    case 'windowLit': // lit windows wait for a night mode; by day both are the same glass
      m = lit({ color: '#ffffff', vertexColors: true, roughness: 0.16, metalness: 0.25 }, { macro: 0, macroRough: 0 });
      break;
    case 'beacon':
      m = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff2a1a').multiplyScalar(2.2) });
      break;
    default:
      m = getMaterial(name); // 'light', 'glassTint'
  }
  materials.set(name, m);
  return m;
}

const luminance = (hex: string) => {
  const c = new THREE.Color(hex);
  return 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
};

/** What one board says. Tall boards take a trade word, a tower's wide board its name, the rest a shop. */
function boardContent(kind: BuildingKind, b: Board, r: () => number): SignContent {
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const fg = luminance(b.col) > 0.3 ? '#1f2023' : '#ffffff';
  if (b.h > b.w * 1.4) return { k: 'shop', ja: pick(SIGN_WORDS), bg: b.col, fg, vertical: true };
  if (kind === 'tower' && b.w > 8) return { k: 'shop', ...pick(TOWER_NAMES), bg: b.col, fg };
  const s = pick(SHOPS);
  return { k: 'shop', ja: s.ja, en: s.en, bg: b.col, fg };
}

/** The texture for all sign boards of one model variant, in one of a few sets of names. */
function signMaterial(kind: BuildingKind, id: string, set: number, boards: Board[]): THREE.Material {
  const key = `signface:${kind}_${id}:${set}`;
  let m = materials.get(key);
  if (m) return m;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = ATLAS_PX;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, ATLAS_PX, ATLAS_PX);
  const r = rng(id.charCodeAt(0) * 7919 + kind.length * 104729 + set * 31);
  for (const b of boards) {
    const x = b.uv[0] * ATLAS_PX, y = (1 - b.uv[3]) * ATLAS_PX;
    const w = Math.max(2, Math.round((b.uv[2] - b.uv[0]) * ATLAS_PX)), h = Math.max(2, Math.round((b.uv[3] - b.uv[1]) * ATLAS_PX));
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.clip();
    drawSign(ctx, w, h, boardContent(kind, b, r));
    ctx.restore();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.flipY = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  m = lit({ map: tex, roughness: 0.5, metalness: 0 }, { macro: 0, macroRough: 0 });
  materials.set(key, m);
  return m;
}

/** A new group for one placed building, or null while the models are not loaded (or the variant is unknown). */
export function buildingModel(part: ModelPart): THREE.Group | null {
  const proto = protos.get(`${part.kind}_${part.id}`);
  if (!proto) return null;
  const kind = part.kind as BuildingKind;
  const group = new THREE.Group();
  for (const p of proto.pieces) {
    const mat = p.mat === 'signface' ? signMaterial(kind, part.id, part.seed % NAME_SETS, proto.boards) : material(p.mat);
    const m = new THREE.Mesh(p.geometry, mat);
    m.matrixAutoUpdate = false;
    m.userData.shared = true; // geometry belongs to the loaded model, not to the station that shows it
    if (mat.transparent) m.renderOrder = 2;
    const litOpaque = !mat.transparent && (mat as THREE.MeshStandardMaterial).isMeshStandardMaterial === true;
    m.castShadow = litOpaque;
    m.receiveShadow = litOpaque;
    group.add(m);
  }
  group.position.set(part.pos[0], part.pos[1], part.pos[2]);
  group.rotation.y = part.yaw;
  group.updateMatrix();
  group.matrixAutoUpdate = false;
  return group;
}

/** True for a part that asks for a simplified copy or to be drawn without shop signs. */
export const isLo = (part: ModelPart) => part.merge === true || part.id.endsWith('_lo');

const MERGE_ATTRS = ['position', 'normal', 'color', 'uv', 'aEnv'];

/**
 * Many placed models as one mesh per material: a street of them costs a few draw calls instead
 * of several per building in every pass. Sign faces merge per model variant and name set (each
 * has its own texture). Parts whose model is not loaded are left out. The geometry is new (not
 * shared): whoever mounts the group disposes of it.
 * `cast`: opaque lit surfaces cast sun shadows. `noAO`: left out of the ambient-occlusion pass
 * (for buildings too far away for contact shading to show).
 */
export function mergedModels(parts: ModelPart[], o: { cast?: boolean; noAO?: boolean } = {}): THREE.Group {
  const group = new THREE.Group();
  const byMat = new Map<string, { mat: THREE.Material; list: THREE.BufferGeometry[] }>();
  const m4 = new THREE.Matrix4(), rot = new THREE.Matrix4();
  for (const part of parts) {
    const proto = protos.get(`${part.kind}_${part.id}`);
    if (!proto) continue;
    m4.makeTranslation(part.pos[0], part.pos[1], part.pos[2]).multiply(rot.makeRotationY(part.yaw));
    for (const p of proto.pieces) {
      const sign = p.mat === 'signface';
      const set = part.seed % NAME_SETS;
      const key = sign ? `signface:${part.kind}_${part.id}:${set}` : p.mat;
      const src = p.geometry.index ? p.geometry.toNonIndexed() : p.geometry;
      if (!src.getAttribute('position') || !src.getAttribute('normal')) continue;
      // Only the attributes every model has, so the pieces always merge.
      const g = new THREE.BufferGeometry();
      const n = src.getAttribute('position').count;
      for (const a of MERGE_ATTRS) {
        const at = src.getAttribute(a);
        g.setAttribute(a, at ? at.clone() : new THREE.BufferAttribute(new Float32Array(n * (a === 'color' ? 3 : 2)).fill(a === 'color' ? 1 : 0), a === 'color' ? 3 : 2));
      }
      g.applyMatrix4(m4);
      let e = byMat.get(key);
      if (!e) byMat.set(key, (e = { mat: sign ? signMaterial(part.kind as BuildingKind, part.id, set, proto.boards) : material(p.mat), list: [] }));
      e.list.push(g);
    }
  }
  for (const { mat, list } of byMat.values()) {
    // Vertex colours come as RGB or RGBA depending on the file: bring a mixed set to one size.
    const size = Math.min(...list.map((g) => g.getAttribute('color').itemSize));
    for (const g of list) {
      const c = g.getAttribute('color');
      if (c.itemSize === size) continue;
      const out = new Float32Array(c.count * size);
      for (let k = 0; k < c.count; k++) for (let j = 0; j < size; j++) out[k * size + j] = c.getComponent(k, j);
      g.setAttribute('color', new THREE.BufferAttribute(out, size));
    }
    const merged = mergeGeometries(list, false);
    for (const g of list) g.dispose();
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, mat);
    mesh.matrixAutoUpdate = false;
    if (mat.transparent) mesh.renderOrder = 2;
    const litOpaque = !mat.transparent && (mat as THREE.MeshStandardMaterial).isMeshStandardMaterial === true;
    mesh.castShadow = !!o.cast && litOpaque;
    mesh.receiveShadow = litOpaque;
    if (o.noAO) mesh.userData.noAO = true;
    group.add(mesh);
  }
  return group;
}
