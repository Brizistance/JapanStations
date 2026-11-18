// Lens effects, in linear HDR before tone mapping: chromatic aberration near the frame
// edges, and dirt on the lens that lights up around bright lights. The dirt is lit by the
// bloom pass's blurred mips, so it only shows where bloom does.

import * as THREE from 'three';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

const LensShader = {
  name: 'LensShader',
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    tGlareA: { value: null as THREE.Texture | null },
    tGlareB: { value: null as THREE.Texture | null },
    tDirt: { value: null as THREE.Texture | null },
    uChroma: { value: 0 },
    uDirt: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse, tGlareA, tGlareB, tDirt;
    uniform float uChroma, uDirt;
    varying vec2 vUv;

    void main() {
      vec4 src = texture2D( tDiffuse, vUv );
      vec3 c = src.rgb;
      if ( uChroma > 0.0 ) {
        // Grows with the square of the distance from centre: none where you look.
        vec2 d = vUv - 0.5;
        vec2 off = d * dot( d, d ) * uChroma;
        c.r = texture2D( tDiffuse, vUv - off ).r;
        c.b = texture2D( tDiffuse, vUv + off ).b;
      }
      if ( uDirt > 0.0 ) {
        vec3 glare = texture2D( tGlareA, vUv ).rgb * 0.6 + texture2D( tGlareB, vUv ).rgb * 0.4;
        c += glare * texture2D( tDirt, vUv ).r * uDirt;
      }
      gl_FragColor = vec4( c, src.a );
    }`,
};

/** Smudges, specks and a few wipe marks, as a grey canvas texture stretched over the frame. */
function dirtTexture(): THREE.Texture {
  const W = 512, H = 288;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  // Seeded so the lens is the same every load.
  let seed = 7;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const blob = (x: number, y: number, r: number, a: number) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,255,255,${a})`);
    g.addColorStop(0.6, `rgba(255,255,255,${a * 0.45})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };
  // Broad haze patches.
  for (let i = 0; i < 14; i++) blob(rnd() * W, rnd() * H, 40 + rnd() * 90, 0.06 + rnd() * 0.08);
  // Dust specks and water spots.
  for (let i = 0; i < 90; i++) blob(rnd() * W, rnd() * H, 1.5 + rnd() * 7, 0.15 + rnd() * 0.35);
  // Rings (dried drops).
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 10; i++) {
    const x = rnd() * W, y = rnd() * H, r = 4 + rnd() * 10;
    ctx.strokeStyle = `rgba(255,255,255,${0.15 + rnd() * 0.2})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  // A couple of wipe arcs.
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const cx = rnd() * W, cy = H + rnd() * H * 0.5, r = H * (0.6 + rnd() * 0.5);
    ctx.lineWidth = 6 + rnd() * 10;
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI * 1.15, Math.PI * 1.6);
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

export class LensPass extends ShaderPass {
  constructor() {
    super(LensShader);
    this.uniforms.tDirt.value = dirtTexture();
  }

  /** `glare`: two blurred bloom mips, or null when bloom is off (no dirt then). */
  set(o: { chroma: boolean; lensDirt: boolean }, glare: [THREE.Texture, THREE.Texture] | null) {
    const dirt = o.lensDirt && glare !== null;
    this.uniforms.uChroma.value = o.chroma ? 0.025 : 0;
    this.uniforms.uDirt.value = dirt ? 2.2 : 0;
    if (glare) {
      this.uniforms.tGlareA.value = glare[0];
      this.uniforms.tGlareB.value = glare[1];
    }
    this.enabled = o.chroma || dirt;
  }

  dispose() {
    (this.uniforms.tDirt.value as THREE.Texture).dispose();
    super.dispose();
  }
}
