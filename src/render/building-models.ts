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
import { isChain, lum, shopStyle, tone } from '../signs/shop';
import { BOUTIQUE_NAMES, BOUTIQUE_WORDS, MACHI_NAMES, MACHI_WORDS, SIGN_WORDS, TOWER_NAMES, TOSEN_NAMES, TOSEN_WORDS, YOKOCHO_NAMES, YOKOCHO_WORDS, type BuildingKind } from '../stations/buildings';
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
const PROPS = ['hub', 'plaza', 'tsumugi', 'exchange', 'road', 'city', 'konbini', 'station', 'shops', 'places', 'trees', 'hyotan', 'horie', 'tsuru', 'kaisei', 'midori', 'kitafront', 'mioya', 'gate', 'viaduct', 'kawaeki', 'tokei', 'ring', 'kitaarcade', 'kitacity', 'miochika', 'tsumugifront', 'tsumugikit', 'aizome', 'aizomefront', 'aoba', 'aobafront', 'daigaku', 'daigakufront', 'hibari', 'hibarifront', 'konya', 'port', 'minato', 'minatofront', 'tosen', 'hatoba', 'tsuna', 'urafront', 'kamome', 'watacentre', 'wata', 'wholesale'];
/** Of those, the ones that stand outdoors and take daylight (tools/blender/build_plaza.py). */
const OUTDOOR = ['plaza', 'exchange', 'road', 'city', 'konbini', 'places', 'trees', 'hyotan', 'horie', 'tsuru', 'kaisei', 'midori', 'kitafront', 'mioya', 'gate', 'viaduct', 'kawaeki', 'tokei', 'ring', 'kitaarcade', 'kitacity', 'aizome', 'aizomefront', 'aoba', 'aobafront', 'daigaku', 'daigakufront', 'hibari', 'hibarifront', 'konya', 'port', 'minato', 'minatofront', 'tosen', 'hatoba', 'tsuna', 'urafront', 'kamome', 'watacentre', 'wata', 'wholesale'];
/** Kinds that also get a copy without daylight, named <kind>u_<id>, for use below the street (a station kiosk). */
const UNDER = ['konbini'];
/** Daylight of single models that differ from their file: a dome above the roofs. */
const DAYLIGHT: Record<string, number> = { tsumugi_dome: 1, hyotan_izakaya_in: 0, mioya_hall: 0.45, exchange_inside: 0.45 };
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

/** The clock of the leaves' sway, in seconds: Scene.tsx advances it, faster in wind. */
export const treeWind = { value: 0 };
/** The wind on the trees: x, y = the way it blows (world x, z), z = how hard, 0 … 1 (Scene.tsx). */
export const treeGust = { value: new THREE.Vector3(1, 0, 0) };

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
    shader.uniforms.uGust = treeGust;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uWind;\nuniform vec3 uGust;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
	float swayAmt = clamp( ( position.y - 1.6 ) / 4.0, 0.0, 1.0 );
	// A gale shakes the leaves several times harder and pushes the crown downwind (worked out
	// in the tree's own space, so every tree leans the same way whichever way it was planted).
	float shake = 1.0 + 5.0 * uGust.z;
	transformed.x += sin( uWind * 1.1 + position.x * 0.7 + position.y * 0.9 ) * 0.06 * swayAmt * shake;
	transformed.z += cos( uWind * 0.9 + position.z * 0.8 + position.y * 0.7 ) * 0.05 * swayAmt * shake;
	mat3 toWorld = mat3( modelMatrix );
	#ifdef USE_INSTANCING
		toWorld = toWorld * mat3( instanceMatrix );
	#endif
	vec3 lean = inverse( toWorld ) * vec3( uGust.x, 0.0, uGust.y );
	transformed += lean * ( swayAmt * swayAmt * uGust.z * ( 0.38 + 0.12 * sin( uWind * 0.5 + position.y ) ) );`);
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

/** How worn a kind of building's signs are, from its best kept to its worst: old mixed-use blocks carry old signs. */
const WEAR: Record<string, [number, number]> = { zakkyo: [0.2, 0.8], shophouse: [0.3, 0.85], yokocho: [0.35, 0.9], machi: [0.25, 0.8], canalfront: [0.1, 0.5], manshon: [0.05, 0.3], office: [0, 0.12], tower: [0, 0.08], boutique: [0, 0.15] };
/** Sign-maker's colours for the cells of a shared upright sign. */
const INKS = ['#b3261e', '#1f4e8c', '#1f6b45', '#d9861a', '#3a2a22', '#6a2c70', '#0f7f86', '#c2185b', '#222429', '#0d3b66'];
const CHAIN_SHOPS = SHOPS.filter((s) => isChain(s.ja));
/** The tenants of an ordinary block: enough of them that a big building does not run out and start again. */
const EVERYONE: { ja: string; en?: string; bg?: string; fg?: string }[] = [...SHOPS, ...MACHI_NAMES, ...BOUTIQUE_NAMES];

interface Named { ja: string; en?: string; bg?: string; fg?: string }
interface Cell { x: number; y: number; w: number; h: number; c: SignContent }

/**
 * What one building's boards say. Every tenant is on the building once. A long fascia is shared by
 * two or three tenants, a high upright sign is a stack of them with their floors, a big square
 * board advertises a chain, a tower's wide board carries its name, and the rest take one shop each.
 */
function tenants(kind: BuildingKind, r: () => number, tier: number) {
  const quiet = tier === 1, busy = tier === 2;
  const bag = <T,>(src: T[]) => {
    let left: T[] = [];
    return () => {
      if (!left.length) {
        left = src.slice();
        for (let i = left.length - 1; i > 0; i--) {
          const j = Math.floor(r() * (i + 1));
          [left[i], left[j]] = [left[j], left[i]];
        }
      }
      return left.pop()!;
    };
  };
  const name = bag<Named>(kind === 'boutique' ? BOUTIQUE_NAMES : kind === 'machi' ? MACHI_NAMES : kind === 'yokocho' ? YOKOCHO_NAMES : (kind as string) === 'tosen' ? TOSEN_NAMES : EVERYONE);
  const word = bag(kind === 'boutique' ? BOUTIQUE_WORDS : kind === 'machi' ? MACHI_WORDS : kind === 'yokocho' ? YOKOCHO_WORDS : (kind as string) === 'tosen' ? TOSEN_WORDS : SIGN_WORDS);
  const chain = bag<Named>(CHAIN_SHOPS), tower = bag<Named>(TOWER_NAMES);
  const own = kind === 'boutique' || kind === 'machi' || kind === 'yokocho' || (kind as string) === 'tosen';
  const [lo, hi] = WEAR[kind] ?? [0.05, 0.3];
  const age = lo + r() * (hi - lo);
  const wear = (k = 1) => Math.min(1, Math.max(0, age + (r() - 0.5) * 0.3)) * k;
  const ink = (bg: string) => (lum(bg) > 0.5 ? '#1f2023' : '#ffffff');
  let ads = 0;

  const shop = (n: Named, col: string): SignContent => {
    const bg = n.bg ?? tone(col), fg = n.fg ?? ink(bg), known = isChain(n.ja), g = r();
    // A quiet street's signs are mostly white with coloured lettering, a busy one's mostly coloured.
    const ground = known ? (lum(bg) > 0.72 ? 'white' : 'solid') : g < (quiet ? 0.75 : busy ? 0.25 : 0.45) ? 'white' : g < (quiet ? 0.9 : busy ? 0.4 : 0.6) ? 'band' : 'solid';
    return { k: 'shop', ja: n.ja, en: n.en, bg, fg, box: { ...shopStyle(n.ja), ground, wear: wear(known ? 0.5 : 1) } };
  };

  return (b: Board, W: number, H: number): Cell[] => {
    if (b.h > b.w * 1.4) {
      const n = b.h > b.w * 5 ? Math.min(busy ? 6 : 5, Math.max(2, Math.round(b.h / (b.w * (quiet ? 3.6 : busy ? 2.2 : 2.8))))) : 1;
      return Array.from({ length: n }, (_, k) => {
        const ja = word(), bg = n > 1 ? INKS[Math.floor(r() * INKS.length)] : tone(b.col);
        const y = Math.round((H * k) / n);
        return { x: 0, y, w: W, h: Math.round((H * (k + 1)) / n) - y, c: { k: 'shop', ja, bg, fg: ink(bg), vertical: true, box: { mark: 'none', face: shopStyle(ja).face, ground: n > 1 && r() < 0.5 ? 'white' : 'solid', wear: wear(), tag: n > 1 ? `${n - k + 1}F` : undefined } } };
      });
    }
    const one = (c: SignContent): Cell[] => [{ x: 0, y: 0, w: W, h: H, c }];
    if (kind === 'tower' && b.w > 8) {
      const bg = tone(b.col);
      return one({ k: 'shop', ...tower(), bg, fg: ink(bg), box: { mark: 'none', face: 'gothic', ground: 'solid', wear: wear() } });
    }
    // (At most two chain advertisements on a building: the rest of its big boards are tenants'.)
    if (!own && b.h >= 2.4 && b.w >= 5 && b.w < b.h * 4 && ads++ < 2) return one(shop(chain(), b.col));
    if (!quiet && b.w > b.h * 7 && b.w > 9 && (busy || r() > 0.25)) {
      const n = (r() < 0.55 ? 2 : 3) + (busy && b.w > 14 ? 1 : 0), share = Array.from({ length: n }, () => 0.7 + r() * 0.7), sum = share.reduce((a, v) => a + v, 0);
      let at = 0;
      return share.map((v, k) => {
        const x = Math.round(at);
        at += (W * v) / sum;
        const vacant = age > 0.4 && r() < (busy ? 0.04 : 0.12);
        const c: SignContent = vacant
          ? { k: 'shop', ja: 'テナント募集', en: 'For Lease', bg: '#f2f0e9', fg: '#b3261e', box: { mark: 'none', face: 'gothic', ground: 'solid', wear: wear() } }
          : shop(name(), k === 0 ? b.col : INKS[Math.floor(r() * INKS.length)]);
        return { x, y: 0, w: (k === n - 1 ? W : Math.round(at)) - x, h: H, c };
      });
    }
    // On a quiet street some boards have no tenant: a blank face, gone grey.
    if (quiet && r() < 0.25) return one({ k: 'shop', ja: '', bg: '#e6e3da', fg: '#1f2023', box: { mark: 'none', face: 'gothic', ground: 'solid', wear: Math.min(1, wear() + 0.3) } });
    return one(shop(name(), b.col));
  };
}

/** How thick with signs a building's street is, from the thousands of its seed (stations/surface.ts): 0 ordinary, 1 quiet, 2 busy. */
const signTier = (seed: number) => Math.floor(seed / 1000) % 3;
const signKey = (kind: string, id: string, seed: number) => `signface:${kind}_${id}:${seed % NAME_SETS}:${signTier(seed)}`;

/** The texture for all sign boards of one model variant, in one of a few sets of names, for one kind of street. */
function signMaterial(kind: BuildingKind, id: string, seed: number, boards: Board[]): THREE.Material {
  const set = seed % NAME_SETS, tier = signTier(seed);
  const key = signKey(kind, id, seed);
  let m = materials.get(key);
  if (m) return m;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = ATLAS_PX;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, ATLAS_PX, ATLAS_PX);
  const cells = tenants(kind, rng(id.charCodeAt(0) * 7919 + kind.length * 104729 + set * 31), tier);
  // At night a few boards are switched off and the odd one flickers: kept in the atlas's alpha (lit.ts, `glow`).
  const state = rng(id.charCodeAt(0) * 331 + kind.length * 17 + set * 7 + 5);
  for (const b of boards) {
    const x = Math.round(b.uv[0] * ATLAS_PX), y = Math.round((1 - b.uv[3]) * ATLAS_PX);
    const w = Math.max(2, Math.round((b.uv[2] - b.uv[0]) * ATLAS_PX)), h = Math.max(2, Math.round((b.uv[3] - b.uv[1]) * ATLAS_PX));
    for (const cell of cells(b, w, h)) {
      ctx.save();
      ctx.translate(x + cell.x, y + cell.y);
      ctx.beginPath();
      ctx.rect(0, 0, cell.w, cell.h);
      ctx.clip();
      drawSign(ctx, cell.w, cell.h, cell.c);
      ctx.restore();
    }
    const s = state();
    if (s < 0.12) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      ctx.globalCompositeOperation = 'destination-in';
      ctx.fillStyle = `rgba(0,0,0,${s < 0.08 ? 0.5 : 0.75})`;
      ctx.fillRect(x, y, w, h);
      ctx.restore();
    }
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
    const mat = p.mat === 'signface' ? signMaterial(kind, part.id, part.seed, proto.boards) : material(p.mat);
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
      const key = sign ? signKey(part.kind, part.id, part.seed) : p.mat;
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
      if (!e) byMat.set(key, (e = { mat: sign ? signMaterial(part.kind as BuildingKind, part.id, part.seed, proto.boards) : material(p.mat), list: [] }));
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

/**
 * `mergedModels`, but one group per `size` m grid cell, so what is behind the camera or beyond the
 * fog can be skipped (a city-wide merged mesh is always on screen somewhere, so it is always drawn
 * whole). Each cell group carries `userData.cell = { x, z, r }`: its centre and a radius that
 * covers its buildings.
 */
export function cellMergedModels(parts: ModelPart[], size: number, o: { cast?: boolean; noAO?: boolean } = {}): THREE.Group {
  const group = new THREE.Group();
  const cells = new Map<string, { cx: number; cz: number; list: ModelPart[] }>();
  for (const p of parts) {
    const cx = Math.floor(p.pos[0] / size), cz = Math.floor(p.pos[2] / size), key = `${cx},${cz}`;
    let c = cells.get(key);
    if (!c) cells.set(key, (c = { cx, cz, list: [] }));
    c.list.push(p);
  }
  for (const c of cells.values()) {
    const g = mergedModels(c.list, o);
    if (!g.children.length) continue;
    // Half the cell's diagonal plus room for a building standing on its edge.
    g.userData.cell = { x: (c.cx + 0.5) * size, z: (c.cz + 0.5) * size, r: size * 0.71 + 40 };
    group.add(g);
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
