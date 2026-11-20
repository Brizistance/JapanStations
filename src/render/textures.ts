// Procedural PBR texture sets for manufactured finishes (tiles, panels, tactile paving…).
// Each pattern is computed once as float fields (tone, mask, height, roughness); the
// normal and roughness maps are shared by every colour of that pattern, and only the
// colour map is redrawn per tint. Weathered surfaces use scanned sets instead (`scan`).

import * as THREE from 'three';

type F = Float32Array;

export interface TexSet {
  map: THREE.Texture;
  normalMap?: THREE.Texture;
  roughnessMap?: THREE.Texture;
  normalScale?: number;
}

interface Fields {
  n: number;
  /** Real-world size of one repeat, metres. */
  size: [number, number];
  /** Brightness multiplier applied to the tint. */
  tone: F;
  /** 1 = tinted surface, 0 = joint colour. */
  mask: F;
  height: F;
  rough: F;
  /** Height → normal gain. */
  bump: number;
  /** Joint colour: a fixed hex, or a multiplier on the tint (grout that follows the tile colour). */
  joint: string | number;
}

function hash(x: number, y: number, s: number): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 1013904223);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** Tileable value noise with `cx` × `cy` lattice cells across the texture. */
function vnoise(n: number, cx: number, cy: number, seed: number, out: F, amp: number) {
  const kx = cx / n, ky = cy / n;
  for (let y = 0; y < n; y++) {
    const fy = y * ky, y0 = Math.floor(fy), ty = fy - y0, sy = ty * ty * (3 - 2 * ty);
    const ya = y0 % cy, yb = (y0 + 1) % cy;
    for (let x = 0; x < n; x++) {
      const fx = x * kx, x0 = Math.floor(fx), tx = fx - x0, sx = tx * tx * (3 - 2 * tx);
      const xa = x0 % cx, xb = (x0 + 1) % cx;
      const a = hash(xa, ya, seed), b = hash(xb, ya, seed), c = hash(xa, yb, seed), d = hash(xb, yb, seed);
      out[y * n + x] += (a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy) * amp;
    }
  }
}

/** Fractal noise in 0…1. */
export function fbm(n: number, cx: number, cy: number, octaves: number, seed: number): F {
  const out = new Float32Array(n * n);
  let amp = 0.5, total = 0;
  for (let o = 0; o < octaves; o++) {
    vnoise(n, cx << o, cy << o, seed + o * 17, out, amp);
    total += amp;
    amp *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

// Result of `cell()`: which tile a pixel is in and how far it is from the joint.
const C = { col: 0, row: 0, fu: 0, fv: 0, d: 0 };
function cell(x: number, y: number, n: number, cols: number, rows: number, bond: boolean) {
  const v = (y / n) * rows, row = Math.floor(v);
  const u = (x / n) * cols + (bond && row % 2 ? 0.5 : 0), col = Math.floor(u);
  C.col = col % cols;
  C.row = row;
  C.fu = u - col;
  C.fv = v - row;
  C.d = Math.min(Math.min(C.fu, 1 - C.fu) * (n / cols), Math.min(C.fv, 1 - C.fv) * (n / rows));
}

function blank(n: number, size: [number, number], bump: number, joint: string | number): Fields {
  const f = () => new Float32Array(n * n);
  return { n, size, tone: f(), mask: f(), height: f(), rough: f(), bump, joint };
}

// ── Patterns ──

/** Stone-look floor tile, 400 mm, semi-gloss with duller wear patches. */
function floorTile(): Fields {
  const n = 1024, o = blank(n, [2.4, 2.4], 2.2, 0.55);
  const mott = fbm(n, 10, 10, 3, 11), wear = fbm(n, 3, 3, 3, 23);
  for (let y = 0, i = 0; y < n; y++) for (let x = 0; x < n; x++, i++) {
    cell(x, y, n, 6, 6, false);
    const t = hash(C.col, C.row, 5);
    const sp = hash(x, y, 77), sp2 = hash(x >> 1, y >> 1, 78);
    const speck = (sp < 0.05 ? -0.2 * hash(x, y, 79) : sp > 0.955 ? 0.045 : 0) + (sp2 < 0.012 ? -0.1 : 0);
    o.mask[i] = smooth(0.8, 2.2, C.d);
    o.tone[i] = 0.9 + t * 0.07 + (mott[i] - 0.5) * 0.09 + speck;
    o.height[i] = smooth(0.4, 3.4, C.d) + (mott[i] - 0.5) * 0.04;
    o.rough[i] = mix(0.9, 0.15 + wear[i] * 0.28 + t * 0.04, o.mask[i]);
  }
  return o;
}

/** Glazed wall tile, 150 mm, pillowed edges and a slight tilt per tile. */
function wallTile(): Fields {
  const n = 512, o = blank(n, [1.2, 1.2], 3.2, 0.8);
  for (let y = 0, i = 0; y < n; y++) for (let x = 0; x < n; x++, i++) {
    cell(x, y, n, 8, 8, false);
    const t = hash(C.col, C.row, 9), tx = hash(C.col, C.row, 10) - 0.5, ty = hash(C.col, C.row, 12) - 0.5;
    o.mask[i] = smooth(1.0, 2.4, C.d);
    o.tone[i] = 0.93 + t * 0.07 - (1 - smooth(2, 8, C.d)) * 0.05;
    o.height[i] = smooth(0.8, 6, C.d) * (1 + ((C.fu - 0.5) * tx + (C.fv - 0.5) * ty) * 0.9);
    o.rough[i] = mix(0.85, 0.12 + t * 0.08, o.mask[i]);
  }
  return o;
}

/** Enamelled steel wall panels, 900 × 1200 mm, with a faint ripple. */
function panel(): Fields {
  const n = 512, o = blank(n, [1.8, 2.4], 2.4, '#3d4043');
  const rip = fbm(n, 4, 4, 3, 31);
  for (let y = 0, i = 0; y < n; y++) for (let x = 0; x < n; x++, i++) {
    cell(x, y, n, 2, 2, false);
    o.mask[i] = smooth(0.6, 1.8, C.d);
    o.tone[i] = 0.95 + hash(C.col, C.row, 3) * 0.04;
    o.height[i] = smooth(0.4, 3, C.d) * 0.9 + rip[i] * 1.3;
    o.rough[i] = mix(0.7, 0.24 + (rip[i] - 0.5) * 0.1, o.mask[i]);
  }
  return o;
}

/** Suspended ceiling panels, 1200 × 600 mm, perforated. */
function ceilPanel(): Fields {
  const n = 512, o = blank(n, [1.2, 1.2], 1.6, '#b9b8b2');
  for (let y = 0, i = 0; y < n; y++) for (let x = 0; x < n; x++, i++) {
    cell(x, y, n, 1, 2, false);
    const gx = (x % 10) - 4.5, gy = (y % 10) - 4.5;
    const dot = C.d > 16 && gx * gx + gy * gy < 4.2;
    o.mask[i] = smooth(0.5, 2, C.d);
    o.tone[i] = dot ? 0.5 : 0.97 + hash(C.col, C.row, 2) * 0.03;
    o.height[i] = dot ? 0 : smooth(0, 3, C.d);
    o.rough[i] = 0.88;
  }
  return o;
}

/** Tactile paving, 300 mm. `bars` = guidance blocks, otherwise warning domes. */
function tactile(bars: boolean): Fields {
  const n = 512, o = blank(n, [0.6, 0.6], 4.5, '#8f7610');
  const grime = fbm(n, 6, 6, 3, 51);
  for (let y = 0, i = 0; y < n; y++) for (let x = 0; x < n; x++, i++) {
    cell(x, y, n, 2, 2, false);
    let up: number;
    if (bars) {
      const du = Math.abs(((C.fu * 4) % 1) - 0.5);
      up = (1 - smooth(0.16, 0.27, du)) * (1 - smooth(0.4, 0.45, Math.abs(C.fv - 0.5)));
    } else {
      const du = ((C.fu * 5) % 1) - 0.5, dv = ((C.fv * 5) % 1) - 0.5;
      up = 1 - smooth(0.2, 0.31, Math.hypot(du, dv));
    }
    o.mask[i] = smooth(0.6, 1.8, C.d);
    o.tone[i] = 0.8 + up * 0.2 - (grime[i] - 0.4) * 0.16;
    o.height[i] = up;
    o.rough[i] = 0.62 - up * 0.12 + grime[i] * 0.15;
  }
  return o;
}

/** Concrete sidewalk pavers, 300 mm, in a half-bond. */
function paver(): Fields {
  const n = 512, o = blank(n, [1.2, 1.2], 2.6, '#6f6b64');
  const nz = fbm(n, 24, 24, 3, 61), big = fbm(n, 3, 3, 2, 62);
  for (let y = 0, i = 0; y < n; y++) for (let x = 0; x < n; x++, i++) {
    cell(x, y, n, 4, 4, true);
    const t = hash(C.col + (C.row % 2) * 7, C.row, 4);
    o.mask[i] = smooth(1.2, 2.8, C.d);
    o.tone[i] = 0.84 + t * 0.12 + (nz[i] - 0.5) * 0.14 + (big[i] - 0.5) * 0.1;
    o.height[i] = smooth(1, 5, C.d) + (nz[i] - 0.5) * 0.25;
    o.rough[i] = mix(0.95, 0.8 + nz[i] * 0.12, o.mask[i]);
  }
  return o;
}

/** Japanese pan tiles (kawara) for house roofs. */
function roofTile(): Fields {
  const n = 256, o = blank(n, [1.0, 0.9], 3, '#24272a');
  for (let y = 0, i = 0; y < n; y++) for (let x = 0; x < n; x++, i++) {
    cell(x, y, n, 4, 3, false);
    const t = hash(C.col, C.row, 8);
    o.mask[i] = 1;
    o.tone[i] = 0.85 + t * 0.15 - C.fv * 0.25;
    o.height[i] = (0.5 + 0.5 * Math.cos(C.fu * Math.PI * 2)) * 0.8 + (1 - C.fv) * 0.7;
    o.rough[i] = 0.38 + t * 0.1;
  }
  return o;
}

/** Brushed stainless: fine streaks along u. */
function brushed(): Fields {
  const n = 256, o = blank(n, [0.4, 0.4], 0.5, '#000');
  const st = fbm(n, 2, 96, 3, 71);
  for (let i = 0; i < n * n; i++) {
    o.mask[i] = 1;
    o.tone[i] = 0.94 + st[i] * 0.08;
    o.height[i] = st[i];
    o.rough[i] = 0.28 + st[i] * 0.16;
  }
  return o;
}

/** Building facade: bays of windows with spandrels. Windows are glossy so they pick up the sky. */
function facade(style: string): Fields {
  const n = 512;
  const cols = 4, rows = 4;
  const size: [number, number] = style === 'office' ? [12, 15.2] : style === 'apt' ? [14, 12.4] : style === 'house' ? [16, 12.4] : [12, 12.4];
  const o = blank(n, size, 2, '#20262d');
  const nz = fbm(n, 16, 16, 3, 81), streak = fbm(n, 24, 2, 2, 82);
  for (let y = 0, i = 0; y < n; y++) for (let x = 0; x < n; x++, i++) {
    cell(x, y, n, cols, rows, false);
    const fu = C.fu, fv = 1 - C.fv; // fv up
    const r = hash(C.col, C.row, 6);
    let win = 0, frame = 0, wall = 1, balc = 0;
    if (style === 'office') {
      win = fu > 0.04 && fu < 0.96 && fv > 0.26 && fv < 0.96 ? 1 : 0;
      frame = win && (Math.abs(fu - 0.5) < 0.012 || fv < 0.28 || fv > 0.94) ? 1 : 0;
    } else if (style === 'apt') {
      win = fu > 0.12 && fu < 0.88 && fv > 0.34 && fv < 0.86 ? 1 : 0;
      frame = win && (Math.abs(fu - 0.5) < 0.015 || fu < 0.14 || fu > 0.86) ? 1 : 0;
      balc = fv < 0.36 ? 1 : 0;
    } else if (style === 'house') {
      win = fu > 0.3 && fu < 0.7 && fv > 0.36 && fv < 0.76 && (C.row + C.col) % 2 === 0 ? 1 : 0;
      frame = win && (Math.abs(fu - 0.5) < 0.012 || fu < 0.315 || fu > 0.685 || fv < 0.375 || fv > 0.745) ? 1 : 0;
    } else {
      win = fu > 0.14 && fu < 0.86 && fv > 0.32 && fv < 0.82 ? 1 : 0;
      frame = win && (Math.abs(fu - 0.5) < 0.014 || fu < 0.155 || fu > 0.845 || fv < 0.335 || fv > 0.805) ? 1 : 0;
    }
    if (win && !frame) wall = 0;
    // Some windows have blinds drawn or a light on.
    const blind = wall === 0 && r < 0.3 && fv > 0.55 ? 1 : 0;
    const lit = wall === 0 && r > 0.86 ? 1 : 0;
    o.mask[i] = wall || blind ? 1 : lit ? 0.75 : 0;
    const grime = (nz[i] - 0.5) * 0.1 - streak[i] * 0.1 * (1 - fv);
    o.tone[i] = blind ? 1.08 : lit ? 1.25 : frame ? 0.55 : balc ? 0.88 + grime : 0.96 + grime;
    o.height[i] = wall ? (frame ? 0.75 : balc ? 1.4 : 1) : 0.2;
    o.rough[i] = wall ? (frame ? 0.45 : 0.82 + nz[i] * 0.1) : blind ? 0.6 : 0.07;
  }
  return o;
}


/**
 * Pre-war terrazzo: a polished ground with marble chips of three tones in it, laid in 0.9 m bays
 * divided by brass strips (lighter lines). Hyōtanbori.
 */
function terrazzo(): Fields {
  const n = 1024, o = blank(n, [1.8, 1.8], 1.2, 1.25);
  const mott = fbm(n, 6, 6, 3, 31);
  for (let y = 0, i = 0; y < n; y++) for (let x = 0; x < n; x++, i++) {
    // Chips: a jittered grid of small round stones, some skipped.
    cell(x, y, n, 110, 110, false);
    const h = hash(C.col, C.row, 41), jx = hash(C.col, C.row, 42) - 0.5, jy = hash(C.col, C.row, 43) - 0.5;
    const r = 0.22 + 0.25 * hash(C.col, C.row, 44);
    const inChip = h < 0.62 && Math.hypot(C.fu - 0.5 - jx * 0.3, C.fv - 0.5 - jy * 0.3) < r;
    const kind = hash(C.col, C.row, 45);
    const chip = inChip ? (kind < 0.4 ? 0.62 : kind < 0.75 ? 1.12 : 0.86) : 1;
    // Brass strips every 0.9 m.
    const sx = x % (n / 2), sy = y % (n / 2);
    const strip = sx < 2 || sy < 2;
    o.mask[i] = 1;
    o.tone[i] = strip ? 1.45 : (0.94 + (mott[i] - 0.5) * 0.08) * chip;
    o.height[i] = strip ? 0.6 : 0.5;
    o.rough[i] = strip ? 0.25 : 0.12 + mott[i] * 0.1;
  }
  return o;
}

/** Small square glass mosaic, 25 mm tesserae with pale grout, each a little off in tone. */
function mosaic(): Fields {
  const n = 512, o = blank(n, [0.6, 0.6], 2.6, 1.6);
  for (let y = 0, i = 0; y < n; y++) for (let x = 0; x < n; x++, i++) {
    cell(x, y, n, 24, 24, false);
    const t = hash(C.col, C.row, 51);
    o.mask[i] = smooth(0.6, 1.4, C.d);
    o.tone[i] = 0.82 + t * 0.3;
    o.height[i] = smooth(0.5, 3, C.d);
    o.rough[i] = mix(0.9, 0.1 + t * 0.06, o.mask[i]);
  }
  return o;
}

const builders: Record<string, () => Fields> = {
  floor: floorTile,
  terrazzo,
  mosaic,
  tile: wallTile,
  panel,
  ceil: ceilPanel,
  tactile: () => tactile(false),
  tactileBar: () => tactile(true),
  paver,
  roof: roofTile,
  brushed,
  'facade:office': () => facade('office'),
  'facade:apt': () => facade('apt'),
  'facade:house': () => facade('house'),
  'facade:grid': () => facade('grid'),
};

// ── Fields → textures ──

function finish(t: THREE.Texture, size: [number, number], srgb: boolean) {
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / size[0], 1 / size[1]);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 16;
  return t;
}

function canvasTex(n: number, size: [number, number], srgb: boolean, fill: (px: Uint8ClampedArray) => void): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = n;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(n, n);
  fill(img.data);
  ctx.putImageData(img, 0, 0);
  return finish(new THREE.CanvasTexture(c), size, srgb) as THREE.CanvasTexture;
}

function normalFromHeight(f: Fields): THREE.Texture {
  const { n, height: h, bump } = f;
  return canvasTex(n, f.size, false, (px) => {
    for (let y = 0; y < n; y++) {
      const yu = ((y + n - 1) % n) * n, yd = ((y + 1) % n) * n;
      for (let x = 0; x < n; x++) {
        const xl = (x + n - 1) % n, xr = (x + 1) % n;
        const dx = (h[y * n + xr] - h[y * n + xl]) * bump;
        // Canvas rows run downwards, texture v runs upwards.
        const dy = (h[yu + x] - h[yd + x]) * bump;
        const inv = 1 / Math.hypot(dx, dy, 1);
        const o = (y * n + x) * 4;
        px[o] = (-dx * inv * 0.5 + 0.5) * 255;
        px[o + 1] = (-dy * inv * 0.5 + 0.5) * 255;
        px[o + 2] = (inv * 0.5 + 0.5) * 255;
        px[o + 3] = 255;
      }
    }
  });
}

function roughTex(f: Fields): THREE.Texture {
  return canvasTex(f.n, f.size, false, (px) => {
    for (let i = 0; i < f.n * f.n; i++) {
      const v = Math.min(1, Math.max(0.04, f.rough[i])) * 255;
      px[i * 4] = px[i * 4 + 1] = px[i * 4 + 2] = v;
      px[i * 4 + 3] = 255;
    }
  });
}

function colourTex(f: Fields, tint: string): THREE.Texture {
  // Mix in display (sRGB) space: these are painted values, not physical ones.
  const t = new THREE.Color(tint).getHex();
  const tr = t >> 16, tg = (t >> 8) & 255, tb = t & 255;
  let jr: number, jg: number, jb: number;
  if (typeof f.joint === 'number') {
    // Grey the grout slightly: it is never as saturated as the glaze.
    const grey = (tr + tg + tb) / 3;
    jr = (tr * 0.6 + grey * 0.4) * f.joint;
    jg = (tg * 0.6 + grey * 0.4) * f.joint;
    jb = (tb * 0.6 + grey * 0.4) * f.joint;
  } else {
    const j = new THREE.Color(f.joint).getHex();
    jr = j >> 16;
    jg = (j >> 8) & 255;
    jb = j & 255;
  }
  return canvasTex(f.n, f.size, true, (px) => {
    for (let i = 0; i < f.n * f.n; i++) {
      const m = f.mask[i], k = f.tone[i];
      px[i * 4] = jr + (tr * k - jr) * m;
      px[i * 4 + 1] = jg + (tg * k - jg) * m;
      px[i * 4 + 2] = jb + (tb * k - jb) * m;
      px[i * 4 + 3] = 255;
    }
  });
}

const fieldCache = new Map<string, { f: Fields; normal: THREE.Texture; rough: THREE.Texture }>();

/** A procedural set: `pattern` picks the relief and gloss, `tint` the colour. */
export function pattern(name: string, tint: string): TexSet {
  let e = fieldCache.get(name);
  if (!e) {
    const f = builders[name]();
    e = { f, normal: normalFromHeight(f), rough: roughTex(f) };
    fieldCache.set(name, e);
  }
  return { map: colourTex(e.f, tint), normalMap: e.normal, roughnessMap: e.rough };
}

const loader = new THREE.TextureLoader();
const scanCache = new Map<string, THREE.Texture>();

function load(file: string, size: [number, number], srgb: boolean): THREE.Texture {
  const key = `${file}|${size[0]}|${size[1]}`;
  let t = scanCache.get(key);
  if (!t) {
    t = finish(loader.load(`${import.meta.env.BASE_URL}textures/${file}.jpg`), size, srgb);
    scanCache.set(key, t);
  }
  return t;
}

/** A scanned CC0 set from public/textures (see docs/references.md for sources). */
export function scan(name: string, size: [number, number], maps: { normal?: boolean; rough?: boolean } = { normal: true, rough: true }): TexSet {
  return {
    map: load(`${name}_color`, size, true),
    normalMap: maps.normal ? load(`${name}_normal`, size, false) : undefined,
    roughnessMap: maps.rough ? load(`${name}_rough`, size, false) : undefined,
  };
}

/** Large-scale variation, sampled in world metres by every lit material to hide tiling. */
export function macroTexture(): THREE.Texture {
  const n = 256;
  const a = fbm(n, 4, 4, 4, 91), b = fbm(n, 7, 7, 3, 92);
  return canvasTex(n, [1, 1], false, (px) => {
    for (let i = 0; i < n * n; i++) {
      px[i * 4] = a[i] * 255;
      px[i * 4 + 1] = b[i] * 255;
      px[i * 4 + 2] = 0;
      px[i * 4 + 3] = 255;
    }
  });
}
