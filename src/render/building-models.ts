// The Blender-built street buildings (public/models/buildings/<kind>.glb, tools/blender/build_*.py).
//
// The layout of those files is described at the top of tools/blender/buildkit.py. In short: colour
// is in the vertex colours, so a building body is one 'paint' mesh plus its windows, and the
// readable faces of its sign boards are one 'signface' mesh whose texture is drawn here, from the
// board list the model carries, with invented shop names.
//
// Only what you see: the street builder adds the collider (stations/surface.ts).

import { seasonSuffix } from './season';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { SignContent } from '../signs/content';
import { drawSign } from '../signs/draw';
import { BOUTIQUE_NAMES, BOUTIQUE_WORDS, MACHI_NAMES, MACHI_WORDS, SIGN_WORDS, TOWER_NAMES, YOKOCHO_NAMES, YOKOCHO_WORDS, type BuildingKind } from '../stations/buildings';
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

const KINDS: BuildingKind[] = ['zakkyo', 'office', 'tower', 'shophouse', 'manshon', 'canalfront', 'yokocho', 'boutique', 'machi'];
/** Station props and one-off buildings built the same way (tools/blender/build_hub.py, build_plaza.py). */
const PROPS = ['hub', 'plaza', 'tsumugi', 'exchange', 'road', 'city', 'konbini', 'station', 'shops', 'places', 'trees', 'hyotan', 'horie'];
/** Of those, the ones that stand outdoors and take daylight (tools/blender/build_plaza.py). */
const OUTDOOR = ['plaza', 'exchange', 'road', 'city', 'konbini', 'places', 'trees', 'hyotan', 'horie'];
/** Kinds that also get a copy without daylight, named <kind>u_<id>, for use below the street (a station kiosk). */
const UNDER = ['konbini'];
/** Daylight of single models that differ from their file: a dome above the roofs. */
const DAYLIGHT: Record<string, number> = { tsumugi_dome: 1, hyotan_izakaya_in: 0 };
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

/**
 * Leaf cards are lit as parts of a round crown, not as flat boards: each vertex's normal points
 * out from the middle of the tree's foliage, leaning up.
 */
function roundNormals(g: THREE.BufferGeometry) {
  const pos = g.getAttribute('position'), nor = g.getAttribute('normal');
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    lo = Math.min(lo, pos.getY(i));
    hi = Math.max(hi, pos.getY(i));
  }
  const mid = (lo + hi) / 2, v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.set(pos.getX(i), (pos.getY(i) - mid) * 0.8 + 1.2, pos.getZ(i)).normalize();
    nor.setXYZ(i, v.x, v.y, v.z);
  }
}

/** Time for the leaves' sway, in seconds (Scene.tsx advances it). */
export const treeWind = { value: 0 };

function sheet(name: string): THREE.Texture {
  const t = new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}models/buildings/${name}.png`);
  t.flipY = false;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** The trees' leaves: cut-out cards from the painted leaf sheet, swaying a little above head height. */
function leafMaterial(): THREE.Material {
  const m = lit({ color: '#ffffff', vertexColors: true, map: sheet('trees_leaves'), alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.82, metalness: 0 }, { macro: 0, macroRough: 0 });
  const base = m.onBeforeCompile;
  m.onBeforeCompile = (shader, renderer) => {
    base.call(m, shader, renderer);
    shader.uniforms.uWind = treeWind;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uWind;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
	float swayAmt = clamp( ( position.y - 1.6 ) / 4.0, 0.0, 1.0 );
	transformed.x += sin( uWind * 1.1 + position.x * 0.7 + position.y * 0.9 ) * 0.06 * swayAmt;
	transformed.z += cos( uWind * 0.9 + position.z * 0.8 + position.y * 0.7 ) * 0.05 * swayAmt;`);
  };
  m.customProgramCacheKey = () => 'lit-leaf';
  m.userData.noCast = true;
  return m;
}

function collect(root: THREE.Object3D, daylight = 1): Proto {
  const proto: Proto = { pieces: [], boards: [] };
  root.traverse((o) => {
    if (typeof o.userData.signs === 'string') proto.boards = JSON.parse(o.userData.signs) as Board[];
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mat = (mesh.material as THREE.Material).name;
    // The trees' leaf cards and bark carry their own UVs into the painted sheets.
    addAttributes(mesh.geometry, mat === 'signface' || mat === 'leafcard' || mat === 'bark', daylight);
    if (mat === 'leafcard') roundNormals(mesh.geometry);
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
      m = lit({ color: '#ffffff', vertexColors: true, roughness: 0.16, metalness: 0.25 }, { macro: 0, macroRough: 0 });
      break;
    case 'leafcard':
      m = leafMaterial();
      break;
    case 'bark':
      m = lit({ color: '#ffffff', vertexColors: true, map: sheet('trees_bark'), roughness: 0.92, metalness: 0 }, { macro: 0.04, macroRough: 0.05 });
      break;
    case 'windowLit': // the same glass by day; lit from inside at night
      m = lit({ color: '#ffffff', vertexColors: true, roughness: 0.16, metalness: 0.25 }, { macro: 0, macroRough: 0, night: 0.8 });
      break;
    case 'windowDim': // a shop window at street level: matte, a soft glow at night (a big lit pane would glare)
      m = lit({ color: '#ffffff', vertexColors: true, roughness: 0.6, metalness: 0 }, { macro: 0, macroRough: 0, night: 0.3 });
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

/** The average colour (linear) of a building variant's sign boards, or null if it has none or the models are not loaded yet. */
export function signTint(kind: string, id: string): [number, number, number] | null {
  const boards = protos.get(`${kind}_${id}`)?.boards;
  if (!boards?.length) return null;
  const sum = new THREE.Color(0, 0, 0), c = new THREE.Color();
  for (const b of boards) sum.add(c.set(b.col));
  return [sum.r / boards.length, sum.g / boards.length, sum.b / boards.length];
}
/** The meshes of one model, by material, to draw it many times over (the road traffic); null until loaded. */
export function modelPieces(kind: string, id: string): { geometry: THREE.BufferGeometry; material: THREE.Material }[] | null {
  const proto = protos.get(`${kind}_${id}`);
  return proto ? proto.pieces.map((p) => ({ geometry: p.geometry, material: material(p.mat) })) : null;
}
/** True once the building models are in memory. */
export const modelsLoaded = () => protos.size > 0;

/** What one board says. Tall boards take a trade word, a tower's wide board its name, the rest a shop. */
function boardContent(kind: BuildingKind, b: Board, r: () => number): SignContent {
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const fg = luminance(b.col) > 0.3 ? '#1f2023' : '#ffffff';
  if (kind === 'boutique') return b.h > b.w * 1.4 ? { k: 'shop', ja: pick(BOUTIQUE_WORDS), bg: b.col, fg, vertical: true } : { k: 'shop', ...pick(BOUTIQUE_NAMES), bg: b.col, fg };
  if (kind === 'machi') return b.h > b.w * 1.4 ? { k: 'shop', ja: pick(MACHI_WORDS), bg: b.col, fg, vertical: true } : { k: 'shop', ...pick(MACHI_NAMES), bg: b.col, fg };
  if (kind === 'yokocho') return b.h > b.w * 1.4 ? { k: 'shop', ja: pick(YOKOCHO_WORDS), bg: b.col, fg, vertical: true } : { k: 'shop', ...pick(YOKOCHO_NAMES), bg: b.col, fg };
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
  // At night a few boards are switched off and the odd one flickers: kept in the atlas's alpha (lit.ts, `glow`).
  const state = rng(id.charCodeAt(0) * 331 + kind.length * 17 + set * 7 + 5);
  for (const b of boards) {
    const x = b.uv[0] * ATLAS_PX, y = (1 - b.uv[3]) * ATLAS_PX;
    const w = Math.max(2, Math.round((b.uv[2] - b.uv[0]) * ATLAS_PX)), h = Math.max(2, Math.round((b.uv[3] - b.uv[1]) * ATLAS_PX));
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.clip();
    drawSign(ctx, w, h, boardContent(kind, b, r));
    const s = state();
    if (s < 0.12) {
      ctx.globalCompositeOperation = 'destination-in';
      ctx.fillStyle = `rgba(0,0,0,${s < 0.08 ? 0.5 : 0.75})`;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.flipY = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  m = lit({ map: tex, roughness: 0.5, metalness: 0 }, { macro: 0, macroRough: 0, glow: 0.55 });
  materials.set(key, m);
  return m;
}

/** A new group for one placed building, or null while the models are not loaded (or the variant is unknown). */
export function buildingModel(part: ModelPart): THREE.Group | null {
  const proto = protoOf(part);
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

/** A part's model. A tree is drawn in the current season where it has seasonal versions. */
function protoOf(part: ModelPart): Proto | undefined {
  const name = `${part.kind}_${part.id}`;
  return (part.kind === 'trees' ? protos.get(`${name}_${seasonSuffix()}`) : undefined) ?? protos.get(name);
}

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
    const proto = protoOf(part);
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
    // Leaf cards are cut-outs: as shadow casters or in the ambient-occlusion pass they would count as whole boards.
    const cutout = mat.userData.noCast === true;
    mesh.castShadow = !!o.cast && litOpaque && !cutout;
    mesh.receiveShadow = litOpaque;
    if (o.noAO || cutout) mesh.userData.noAO = true;
    group.add(mesh);
  }
  return group;
}

// ── Detail by distance ───────────────────────────────────────────────────────────────────────

/** Size of a detail cell, and how near (camera to cell centre) a cell shows its full models. */
const LOD_CELL = 150, LOD_NEAR = 190;
/**
 * Every mounted detail cell: its centre in its group's frame, its simplified copies, and its full
 * models, merged only once the camera first comes near (`parts` until then).
 */
interface LodCell { group: THREE.Object3D; x: number; z: number; lo: THREE.Object3D; full: THREE.Object3D | null; parts: ModelPart[] }
const lodCells = new Set<LodCell>();
const lodV = new THREE.Vector3();

/**
 * Building parts that have both a full model and a simplified copy, wherever they stand and
 * whichever they asked for, in LOD_CELL cells: the simplified copies merged now, the full models
 * merged when the camera first comes near (updateLod), so what is near is always detailed, the rest
 * is cheap, and mounting a station stays quick. Returns the group and the parts it did not take
 * (props, trees: no simplified copy).
 */
export function lodModels(parts: ModelPart[]): { group: THREE.Group; rest: ModelPart[] } {
  const group = new THREE.Group();
  const rest: ModelPart[] = [];
  const cells = new Map<string, { cx: number; cz: number; full: ModelPart[]; lo: ModelPart[] }>();
  for (const p of parts) {
    const base = p.id.replace(/_lo$/, '');
    if (p.kind === 'trees' || !protos.has(`${p.kind}_${base}`) || !protos.has(`${p.kind}_${base}_lo`)) {
      rest.push(p);
      continue;
    }
    const cx = Math.floor(p.pos[0] / LOD_CELL), cz = Math.floor(p.pos[2] / LOD_CELL), key = `${cx},${cz}`;
    let c = cells.get(key);
    if (!c) cells.set(key, (c = { cx, cz, full: [], lo: [] }));
    c.full.push({ ...p, id: base, merge: false });
    c.lo.push({ ...p, id: `${base}_lo` });
  }
  for (const c of cells.values()) {
    const lo = mergedModels(c.lo, { noAO: true });
    group.add(lo);
    lodCells.add({ group, x: (c.cx + 0.5) * LOD_CELL, z: (c.cz + 0.5) * LOD_CELL, lo, full: null, parts: c.full });
  }
  return { group, rest };
}

/**
 * Show each detail cell's full models near the camera and its simplified copies elsewhere. A near
 * cell whose full models are not merged yet keeps its simplified copies until they are: one cell is
 * merged per frame, so walking up to a block never stalls a frame for long.
 */
export function updateLod(cam: THREE.Vector3) {
  let built = false;
  for (const c of lodCells) {
    lodV.set(c.x, 0, c.z).applyMatrix4(c.group.matrixWorld);
    let near = Math.hypot(lodV.x - cam.x, lodV.z - cam.z) < LOD_NEAR;
    if (near && !c.full) {
      if (built) near = false;
      else {
        c.full = mergedModels(c.parts, { cast: true });
        c.group.add(c.full);
        built = true;
      }
    }
    if (c.full) c.full.visible = near;
    c.lo.visible = !near;
  }
}

/** Forget the detail cells of a group being thrown away. */
export function dropLod(group: THREE.Object3D) {
  for (const c of lodCells) {
    let o: THREE.Object3D | null = c.group;
    while (o && o !== group) o = o.parent;
    if (o) lodCells.delete(c);
  }
}
