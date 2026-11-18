// Material library. Materials are looked up by string key ("tile:#24407a", "glass", …)
// so station data can name finishes without importing three.js.
//
// Manufactured finishes (tiles, panels, tactile paving, metal, glass) are procedural
// (render/textures.ts). Weathered ones (concrete, asphalt, brick, wood, grass, ballast)
// are CC0 photo-scanned sets in public/textures — see docs/references.md.

import * as THREE from 'three';
import { lit, type LitOpts } from './lit';
import { setReflective } from './ssr';
import { fbm, pattern, scan, type TexSet } from './textures';

const cache = new Map<string, THREE.Material>();

function fromSet(set: TexSet, extra: THREE.MeshStandardMaterialParameters = {}, o: LitOpts = {}) {
  return lit({
    map: set.map,
    normalMap: set.normalMap ?? null,
    roughnessMap: set.roughnessMap ?? null,
    roughness: set.roughnessMap ? 1 : 0.9,
    metalness: 0,
    ...extra,
  }, o);
}

/** Average colour of the brick / wood scans (linear), used to re-tint them. */
const SCAN_AVG: Record<string, [number, number, number]> = {
  brick: [0.33, 0.115, 0.075],
  wood: [0.2, 0.115, 0.07],
};
/** Tint a scan towards `hex` without blowing out its highlights. */
function tintFor(name: string, hex: string): THREE.Color {
  const avg = SCAN_AVG[name], c = new THREE.Color(hex);
  const k = [c.r / avg[0], c.g / avg[1], c.b / avg[2]];
  const max = Math.max(...k, 1e-3);
  const cap = Math.min(1, 2.2 / max);
  return new THREE.Color(k[0] * cap, k[1] * cap, k[2] * cap);
}

/** Track bed: ballast with concrete sleepers every 650 mm, composed from the gravel scan. */
function sleeperSet(): TexSet {
  const W = 512, H = 1024; // 1.3 m along the track × 2.6 m across
  const mk = (srgb: boolean) => {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1 / 1.3, 1 / 2.6);
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = 16;
    return { c, t, ctx: c.getContext('2d')! };
  };
  const col = mk(true), nor = mk(false);
  col.ctx.fillStyle = '#5d564e';
  col.ctx.fillRect(0, 0, W, H);
  nor.ctx.fillStyle = '#8080ff';
  nor.ctx.fillRect(0, 0, W, H);
  const sleepers = (ctx: CanvasRenderingContext2D, normal: boolean) => {
    for (const u of [0.25, 0.75]) {
      const x = u * W - 47, y = H * 0.077, w = 94, h = H * 0.846;
      if (normal) {
        ctx.fillStyle = '#8080ff';
        ctx.fillRect(x, y, w, h);
        // Chamfered long edges.
        ctx.fillStyle = '#5c80f0';
        ctx.fillRect(x, y, 5, h);
        ctx.fillStyle = '#a480f0';
        ctx.fillRect(x + w - 5, y, 5, h);
        continue;
      }
      const g = ctx.createLinearGradient(x, 0, x + w, 0);
      g.addColorStop(0, '#77736b');
      g.addColorStop(0.15, '#9a968d');
      g.addColorStop(0.85, '#959187');
      g.addColorStop(1, '#6f6b63');
      ctx.fillStyle = g;
      ctx.fillRect(x, y, w, h);
      // Rust and brake-dust staining under each rail seat, and the fastenings.
      for (const v of [0.224, 0.776]) {
        const cy = v * H;
        const s = ctx.createRadialGradient(x + w / 2, cy, 4, x + w / 2, cy, 90);
        s.addColorStop(0, 'rgba(84,52,30,0.75)');
        s.addColorStop(1, 'rgba(84,52,30,0)');
        ctx.fillStyle = s;
        ctx.fillRect(x, cy - 90, w, 180);
        ctx.fillStyle = '#3a3531';
        ctx.fillRect(x + 14, cy - 44, w - 28, 22);
        ctx.fillRect(x + 14, cy + 22, w - 28, 22);
      }
    }
  };
  const compose = (file: string, target: ReturnType<typeof mk>, normal: boolean) => {
    const img = new Image();
    img.onload = () => {
      const { ctx } = target;
      for (let y = 0; y < H; y += W) ctx.drawImage(img, 0, y, W, W);
      if (!normal) {
        // Ballast in a tunnel is dark with brake dust.
        ctx.fillStyle = 'rgba(38,30,24,0.5)';
        ctx.fillRect(0, 0, W, H);
      }
      sleepers(ctx, normal);
      target.t.needsUpdate = true;
    };
    img.src = `${import.meta.env.BASE_URL}textures/${file}.jpg`;
  };
  sleepers(col.ctx, false);
  compose('gravel_color', col, false);
  compose('gravel_normal', nor, true);
  return { map: col.t, normalMap: nor.t };
}

/** Far-city ground: asphalt-grey with a faint street grid so distant blocks read as blocks. */
function groundTexture(): THREE.Texture {
  const s = 256;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#8a8b85';
  ctx.fillRect(0, 0, s, s);
  const nz = fbm(s, 12, 12, 3, 5);
  const img = ctx.getImageData(0, 0, s, s);
  for (let i = 0; i < s * s; i++) {
    const road = i % s < s * 0.14 || i / s < s * 0.14;
    const v = (road ? 62 : 136) + (nz[i] - 0.5) * 26;
    img.data[i * 4] = v;
    img.data[i * 4 + 1] = v + 1;
    img.data[i * 4 + 2] = v + (road ? 4 : -4);
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / 40, 1 / 40);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 16;
  return t;
}

function rippleNormal(): THREE.Texture {
  const n = 256, h = fbm(n, 8, 8, 4, 33);
  const c = document.createElement('canvas');
  c.width = c.height = n;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(n, n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const dx = (h[y * n + ((x + 1) % n)] - h[y * n + ((x + n - 1) % n)]) * 6;
    const dy = (h[((y + n - 1) % n) * n + x] - h[((y + 1) % n) * n + x]) * 6;
    const inv = 1 / Math.hypot(dx, dy, 1), o = (y * n + x) * 4;
    img.data[o] = (-dx * inv * 0.5 + 0.5) * 255;
    img.data[o + 1] = (-dy * inv * 0.5 + 0.5) * 255;
    img.data[o + 2] = (inv * 0.5 + 0.5) * 255;
    img.data[o + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / 7, 1 / 7);
  return t;
}

const glass = (color: string, opacity: number, roughness = 0.04) =>
  lit({ color, transparent: true, opacity, roughness, metalness: 0, depthWrite: false, side: THREE.DoubleSide }, { glass: true, macro: 0, macroRough: 0 });

/** Self-lit colour; values above 1 feed the bloom pass. */
const emissive = (hex: string, gain: number) => new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(gain) });

function make(key: string): THREE.Material {
  const [kind, a, b] = key.split(':');
  switch (kind) {
    // ── Plain finishes ──
    case 'flat':
      return lit({ color: a, roughness: 0.62, metalness: 0 }, { macro: 0.05, macroRough: 0.1 });
    case 'paint':
      return lit({ color: a, roughness: 0.3, metalness: 0 }, { macro: 0.05, macroRough: 0.16 });
    case 'metal': {
      const set = pattern('brushed', '#ffffff');
      return lit({ color: a, map: set.map, roughnessMap: set.roughnessMap!, roughness: 1, metalness: 1 }, { macro: 0.04, macroRough: 0.1 });
    }
    case 'glow':
      return emissive(a, 1.7);
    case 'light':
      return emissive('#fff6e6', 3.4);

    // ── Station finishes (procedural) ──
    case 'tile':
      return fromSet(pattern('tile', a), {}, { macro: 0.08, macroRough: 0.12 });
    case 'panel':
      return fromSet(pattern('panel', a), {}, { macro: 0.06, macroRough: 0.14 });
    case 'floor': {
      // Polished station floors (and water) get screen-space reflections on Ultra.
      const m = fromSet(pattern('floor', a), {}, { macro: 0.12, macroRough: 0.3 });
      setReflective(m, 0.6);
      return m;
    }
    case 'ceil':
      return fromSet(pattern('ceil', '#eceae4'), {}, { macro: 0.06, macroRough: 0 });
    case 'tactile':
      return fromSet(pattern('tactile', '#f2c200'), {}, { macro: 0.12, macroRough: 0.1 });
    case 'tactileBar':
      return fromSet(pattern('tactileBar', '#f2c200'), {}, { macro: 0.12, macroRough: 0.1 });
    case 'paver':
      return fromSet(pattern('paver', '#bdb7ab'), {}, { macro: 0.2, macroRough: 0.1 });
    case 'roof':
      return fromSet(pattern('roof', '#4a4f55'), {}, { macro: 0.1, macroRough: 0.1 });
    case 'facade':
      return fromSet(pattern(`facade:${a === 'office' || a === 'apt' || a === 'house' ? a : 'grid'}`, b), {}, { macro: 0.12, macroRough: 0.04 });

    // ── Weathered finishes (CC0 scans) ──
    case 'brick':
      return fromSet(scan('brick', [0.95, 0.95]), { color: tintFor('brick', a) }, { macro: 0.18, macroRough: 0.1 });
    case 'wood': {
      const set = scan('wood', [1.1, 2.2]);
      // Boards run vertically on shopfronts and benches.
      for (const t of [set.map, set.normalMap, set.roughnessMap]) if (t) t.rotation = Math.PI / 2;
      return fromSet(set, { color: tintFor('wood', a) }, { macro: 0.14, macroRough: 0.1 });
    }
    case 'concrete':
      return fromSet(scan('concrete', [3.2, 1.6]), { color: '#e9e6df' }, { macro: 0.24, macroRough: 0.1 });
    case 'concreteDark':
      return fromSet(scan('concrete_dark', [2.6, 2.6]), { color: '#d8d4cc' }, { macro: 0.22, macroRough: 0.1 });
    case 'tunnel':
      return fromSet(scan('concrete_dark', [3.4, 3.4]), { color: '#c9c2b6', side: THREE.DoubleSide }, { macro: 0.3, macroRough: 0.1 });
    case 'viaduct':
      return fromSet(scan('concrete', [3.6, 1.8]), { color: '#e2dfd7', side: THREE.DoubleSide }, { macro: 0.26, macroRough: 0.1 });
    case 'sleeper':
      return fromSet(sleeperSet(), { roughness: 0.93, side: THREE.DoubleSide }, { macro: 0.2, macroRough: 0 });
    case 'rail':
      return lit({ color: '#77706a', roughness: 0.38, metalness: 0.85, side: THREE.DoubleSide }, { macro: 0, macroRough: 0 });
    case 'asphalt':
      return fromSet(scan('asphalt', [4, 4]), { color: '#d9d9d9' }, { macro: 0.3, macroRough: 0.12 });
    case 'grass':
      return fromSet(scan('grass', [2.6, 2.6], {}), { roughness: 0.95 }, { macro: 0.3, macroRough: 0 });
    case 'ground':
      return lit({ map: groundTexture(), roughness: 0.95, metalness: 0 }, { macro: 0.1, macroRough: 0 });
    case 'water': {
      const m = lit({ color: '#17404f', roughness: 0.07, metalness: 0, normalMap: rippleNormal(), normalScale: new THREE.Vector2(0.5, 0.5) }, { macro: 0.2, macroRough: 0 });
      setReflective(m, 0.9);
      return m;
    }

    // ── Glass ──
    case 'glass':
      return glass('#cfe6ec', 0.14);
    case 'glassDark':
      return glass('#101a22', 0.72);
    case 'glassTint':
      return glass('#9fc4cf', 0.2);
    case 'glassRoof':
      return glass('#f4f1e4', 0.5, 0.35);

    case 'leaf':
      return lit({ color: '#3f7a38', roughness: 0.9, metalness: 0 }, { macro: 0.5, macroRough: 0 });
    case 'leaf2':
      return lit({ color: '#6a9434', roughness: 0.9, metalness: 0 }, { macro: 0.5, macroRough: 0 });
    default:
      console.warn(`unknown material "${key}"`);
      return lit({ color: '#ff00ff' });
  }
}

export function getMaterial(key: string): THREE.Material {
  let m = cache.get(key);
  if (!m) {
    m = make(key);
    cache.set(key, m);
  }
  return m;
}
