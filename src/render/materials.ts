// Material library. Materials are looked up by string key ("tile:#24407a", "glass", …)
// so station data can name finishes without importing three.js. Textures are drawn
// procedurally to canvases — no image assets, so nothing to license.

import * as THREE from 'three';

const cache = new Map<string, THREE.Material>();

type Draw = (ctx: CanvasRenderingContext2D, s: number) => void;

function tex(px: number, sizeM: number | [number, number], draw: Draw): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = px;
  const ctx = c.getContext('2d')!;
  draw(ctx, px);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  const [sx, sy] = Array.isArray(sizeM) ? sizeM : [sizeM, sizeM];
  t.repeat.set(1 / sx, 1 / sy);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

const shade = (hex: string, k: number) => {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, 0, k);
  return `#${c.getHexString()}`;
};
/** Cheap deterministic speckle. */
function noise(ctx: CanvasRenderingContext2D, s: number, amount: number, n = 900) {
  let seed = 7;
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = r() < 0.5 ? `rgba(0,0,0,${amount * r()})` : `rgba(255,255,255,${amount * r()})`;
    const w = 1 + r() * 2;
    ctx.fillRect(r() * s, r() * s, w, w);
  }
}

function lambert(color: string, map?: THREE.Texture, extra: THREE.MeshLambertMaterialParameters = {}) {
  return new THREE.MeshLambertMaterial(map ? { color: '#ffffff', map, ...extra } : { color, ...extra });
}

function make(key: string): THREE.Material {
  const [kind, a, b] = key.split(':');
  switch (kind) {
    case 'flat':
      return lambert(a);
    case 'glow':
      return new THREE.MeshBasicMaterial({ color: a });
    case 'light':
      return new THREE.MeshBasicMaterial({ color: '#fffdf4' });
    case 'tile':
      return lambert(a, tex(128, 0.6, (c, s) => {
        c.fillStyle = shade(a, -0.12);
        c.fillRect(0, 0, s, s);
        for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
          c.fillStyle = shade(a, ((i * 2 + j) % 3) * 0.012 - 0.01);
          c.fillRect(i * (s / 2) + 2, j * (s / 2) + 2, s / 2 - 4, s / 2 - 4);
          c.fillStyle = 'rgba(255,255,255,0.10)';
          c.fillRect(i * (s / 2) + 2, j * (s / 2) + 2, s / 2 - 4, 5);
        }
      }));
    case 'panel':
      return lambert(a, tex(128, [1.2, 2.4], (c, s) => {
        c.fillStyle = a;
        c.fillRect(0, 0, s, s);
        const g = c.createLinearGradient(0, 0, s, 0);
        g.addColorStop(0, 'rgba(255,255,255,0.08)');
        g.addColorStop(1, 'rgba(0,0,0,0.05)');
        c.fillStyle = g;
        c.fillRect(0, 0, s, s);
        c.fillStyle = shade(a, -0.22);
        c.fillRect(0, 0, 2, s);
        c.fillRect(0, 0, s, 1);
      }));
    case 'brick':
      return lambert(a, tex(128, [0.46, 0.3], (c, s) => {
        c.fillStyle = shade(a, 0.18);
        c.fillRect(0, 0, s, s);
        const rows = 4, h = s / rows;
        for (let r = 0; r < rows; r++) for (let i = -1; i < 2; i++) {
          c.fillStyle = shade(a, ((r * 3 + i) % 4) * 0.02 - 0.03);
          c.fillRect(i * (s / 2) + (r % 2 ? s / 4 : 0) + 2, r * h + 2, s / 2 - 4, h - 4);
          c.fillRect(i * (s / 2) + (r % 2 ? s / 4 : 0) + 2 + s, r * h + 2, s / 2 - 4, h - 4);
        }
      }));
    case 'floor':
      return lambert(a, tex(256, 1.2, (c, s) => {
        c.fillStyle = a;
        c.fillRect(0, 0, s, s);
        noise(c, s, 0.07, 2500);
        c.strokeStyle = shade(a, -0.14);
        c.lineWidth = 2;
        for (let i = 0; i <= 2; i++) {
          c.beginPath();
          c.moveTo(i * (s / 2), 0);
          c.lineTo(i * (s / 2), s);
          c.moveTo(0, i * (s / 2));
          c.lineTo(s, i * (s / 2));
          c.stroke();
        }
      }));
    case 'ceil':
      return lambert('#fff', tex(128, [1.2, 0.6], (c, s) => {
        c.fillStyle = '#eeede8';
        c.fillRect(0, 0, s, s);
        c.fillStyle = '#c9c8c2';
        c.fillRect(0, 0, s, 2);
        c.fillRect(0, 0, 2, s);
        noise(c, s, 0.03, 300);
      }));
    case 'concrete':
      return lambert('#fff', tex(128, 2.5, (c, s) => {
        c.fillStyle = '#a9a8a2';
        c.fillRect(0, 0, s, s);
        noise(c, s, 0.08, 1800);
        c.fillStyle = 'rgba(0,0,0,0.12)';
        c.fillRect(0, 0, s, 2);
      }));
    case 'concreteDark':
      return lambert('#fff', tex(128, 2.5, (c, s) => {
        c.fillStyle = '#5c5c5a';
        c.fillRect(0, 0, s, s);
        noise(c, s, 0.1, 1800);
      }));
    case 'tunnel':
      return lambert('#fff', tex(256, [3, 3], (c, s) => {
        c.fillStyle = '#4d4c49';
        c.fillRect(0, 0, s, s);
        noise(c, s, 0.1, 3000);
        c.fillStyle = 'rgba(0,0,0,0.35)';
        c.fillRect(0, 0, 3, s);
        c.fillRect(s / 2, 0, 2, s);
        // Cable runs.
        c.fillStyle = '#1e1e1e';
        c.fillRect(0, s * 0.42, s, 4);
        c.fillRect(0, s * 0.47, s, 3);
        c.fillStyle = '#8a8a86';
        c.fillRect(0, s * 0.62, s, 2);
      }), { side: THREE.DoubleSide });
    case 'sleeper':
      return lambert('#fff', tex(128, [0.65, 2.6], (c, s) => {
        c.fillStyle = '#6b6a66';
        c.fillRect(0, 0, s, s);
        noise(c, s, 0.1, 1200);
        c.fillStyle = '#8f8d86';
        c.fillRect(s * 0.3, 0, s * 0.4, s);
        c.fillStyle = 'rgba(0,0,0,0.25)';
        c.fillRect(s * 0.3, 0, 2, s);
      }), { side: THREE.DoubleSide });
    case 'rail':
      return lambert('#8d8f93', undefined, { side: THREE.DoubleSide });
    case 'viaduct':
      return lambert('#fff', tex(128, 3, (c, s) => {
        c.fillStyle = '#b3b1aa';
        c.fillRect(0, 0, s, s);
        noise(c, s, 0.07, 1500);
        c.fillStyle = 'rgba(0,0,0,0.15)';
        c.fillRect(0, 0, 2, s);
      }), { side: THREE.DoubleSide });
    case 'asphalt':
      return lambert('#fff', tex(128, 3, (c, s) => {
        c.fillStyle = '#3d3f42';
        c.fillRect(0, 0, s, s);
        noise(c, s, 0.1, 2500);
      }));
    case 'paver':
      return lambert('#fff', tex(128, 0.8, (c, s) => {
        c.fillStyle = '#b9b3a7';
        c.fillRect(0, 0, s, s);
        for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
          c.fillStyle = shade('#b9b3a7', ((i * 5 + j * 3) % 4) * 0.02 - 0.02);
          c.fillRect(i * (s / 4) + 1, j * (s / 4) + 1, s / 4 - 2, s / 4 - 2);
        }
        noise(c, s, 0.05, 500);
      }));
    case 'grass':
      return lambert('#fff', tex(128, 2, (c, s) => {
        c.fillStyle = '#6a9a4f';
        c.fillRect(0, 0, s, s);
        noise(c, s, 0.12, 2500);
      }));
    case 'ground':
      return lambert('#fff', tex(256, 40, (c, s) => {
        c.fillStyle = '#8f9189';
        c.fillRect(0, 0, s, s);
        noise(c, s, 0.06, 2500);
        // A faint street grid so the far city reads as blocks.
        c.fillStyle = '#4b4d50';
        c.fillRect(0, 0, s, s * 0.14);
        c.fillRect(0, 0, s * 0.14, s);
      }));
    case 'water':
      return new THREE.MeshLambertMaterial({ color: '#2f6f8f', transparent: true, opacity: 0.92 });
    case 'roof':
      return lambert('#fff', tex(64, 0.4, (c, s) => {
        c.fillStyle = '#3f4449';
        c.fillRect(0, 0, s, s);
        c.fillStyle = '#2f3337';
        c.fillRect(0, 0, s, 4);
        c.fillRect(0, 0, 3, s);
      }));
    case 'wood':
      return lambert(a, tex(64, 0.5, (c, s) => {
        c.fillStyle = a;
        c.fillRect(0, 0, s, s);
        for (let i = 0; i < 4; i++) {
          c.fillStyle = shade(a, (i % 2) * 0.03 - 0.02);
          c.fillRect(i * (s / 4) + 1, 0, s / 4 - 2, s);
        }
        c.fillStyle = shade(a, -0.1);
        for (let i = 0; i < 4; i++) c.fillRect(i * (s / 4), 0, 1, s);
      }));
    case 'tactile':
      return lambert('#fff', tex(64, 0.3, (c, s) => {
        c.fillStyle = '#f2c200';
        c.fillRect(0, 0, s, s);
        c.fillStyle = '#d9a900';
        for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
          c.beginPath();
          c.arc((i + 0.5) * (s / 4), (j + 0.5) * (s / 4), s / 13, 0, Math.PI * 2);
          c.fill();
        }
      }));
    case 'facade': {
      // a = style, b = base colour. Bay width × floor height per texture tile.
      const base = b;
      if (a === 'office') {
        return lambert('#fff', tex(128, [3, 3.8], (c, s) => {
          c.fillStyle = base;
          c.fillRect(0, 0, s, s);
          const g = c.createLinearGradient(0, 0, 0, s);
          g.addColorStop(0, '#35506b');
          g.addColorStop(1, '#6f93b3');
          c.fillStyle = g;
          c.fillRect(4, s * 0.22, s / 2 - 6, s * 0.72);
          c.fillRect(s / 2 + 2, s * 0.22, s / 2 - 6, s * 0.72);
          c.fillStyle = 'rgba(255,255,255,0.18)';
          c.fillRect(4, s * 0.22, s / 2 - 6, s * 0.1);
        }));
      }
      if (a === 'apt') {
        return lambert('#fff', tex(128, [3.5, 3.1], (c, s) => {
          c.fillStyle = base;
          c.fillRect(0, 0, s, s);
          c.fillStyle = '#2f3b47';
          c.fillRect(s * 0.12, s * 0.14, s * 0.76, s * 0.5);
          c.fillStyle = '#56687a';
          c.fillRect(s * 0.14, s * 0.16, s * 0.35, s * 0.46);
          // Balcony.
          c.fillStyle = shade(base, -0.1);
          c.fillRect(0, s * 0.62, s, s * 0.3);
          c.fillStyle = shade(base, 0.05);
          c.fillRect(0, s * 0.62, s, 4);
          c.fillStyle = shade(base, -0.25);
          c.fillRect(0, 0, 2, s);
        }));
      }
      if (a === 'house') {
        return lambert('#fff', tex(128, [4, 3.1], (c, s) => {
          c.fillStyle = base;
          c.fillRect(0, 0, s, s);
          noise(c, s, 0.04, 500);
          c.fillStyle = '#3b4753';
          c.fillRect(s * 0.3, s * 0.25, s * 0.4, s * 0.38);
          c.fillStyle = '#e9e6dd';
          c.fillRect(s * 0.49, s * 0.25, 3, s * 0.38);
          c.strokeStyle = '#e9e6dd';
          c.lineWidth = 3;
          c.strokeRect(s * 0.3, s * 0.25, s * 0.4, s * 0.38);
        }));
      }
      return lambert('#fff', tex(128, [3, 3.1], (c, s) => {
        c.fillStyle = base;
        c.fillRect(0, 0, s, s);
        noise(c, s, 0.04, 400);
        c.fillStyle = '#2b3642';
        c.fillRect(s * 0.14, s * 0.2, s * 0.72, s * 0.46);
        c.fillStyle = '#51657a';
        c.fillRect(s * 0.16, s * 0.22, s * 0.33, s * 0.42);
        c.fillStyle = shade(base, -0.12);
        c.fillRect(0, s * 0.92, s, s * 0.08);
      }));
    }
    case 'glass':
      return new THREE.MeshLambertMaterial({ color: '#bfe0ea', transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide });
    case 'glassDark':
      return new THREE.MeshLambertMaterial({ color: '#16242f', transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide });
    case 'glassTint':
      return new THREE.MeshLambertMaterial({ color: '#9fc4cf', transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide });
    case 'glassRoof':
      return new THREE.MeshLambertMaterial({ color: '#f4f1e4', transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide });
    case 'leaf':
      return lambert('#4f8f46');
    case 'leaf2':
      return lambert('#7aa23e');
    default:
      console.warn(`unknown material "${key}"`);
      return lambert('#ff00ff');
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
