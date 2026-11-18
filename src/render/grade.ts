// Colour grading, vignette and film grain: one pass in display space, after tone mapping.
//
// Two base grades, outdoors and underground, blend by the same "under" factor as the fog.
// On a line's platforms (or riding its trains) underground, the line's own grade from its
// theme (`LineTheme.grade`) takes over, so each era has a slight look of its own.
// Grades stay subtle: line colours on signs must still read as themselves.

import * as THREE from 'three';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { themeFor } from '../stations/themes';

export interface Grade {
  /** White balance: + warmer (amber), − cooler (blue). About −1…1. */
  warmth: number;
  /** + magenta, − green. About −1…1. */
  tint: number;
  /** Saturation multiplier (1 = unchanged). */
  sat: number;
  /** S-curve contrast: + punchier, − flatter. About −0.5…0.5. */
  contrast: number;
  /** Lifted blacks, as on old film (0…0.1). */
  fade: number;
  /** Colour added to the shadows (linear, small: ±0.03). */
  shadow: [number, number, number];
  /** Brightness multiplier. */
  exposure: number;
}

export const NEUTRAL: Grade = { warmth: 0, tint: 0, sat: 1, contrast: 0, fade: 0, shadow: [0, 0, 0], exposure: 1 };

/** Daylight: a touch warm and rich. */
export const OUTDOOR: Grade = { warmth: 0.25, tint: 0, sat: 1.06, contrast: 0.08, fade: 0, shadow: [0, 0.002, 0.008], exposure: 1 };
/** Generic underground: cool fluorescent, a little more contrast. */
export const UNDERGROUND: Grade = { warmth: -0.3, tint: -0.1, sat: 0.97, contrast: 0.14, fade: 0.008, shadow: [0, 0.004, 0.01], exposure: 1 };

const lineGrades = new Map<string, Grade>();
/** The underground grade on line `id`'s platforms and trains. */
export function lineGrade(id: string): Grade {
  let g = lineGrades.get(id);
  if (!g) {
    g = { ...UNDERGROUND, ...themeFor(id).grade };
    lineGrades.set(id, g);
  }
  return g;
}

export function lerpGrade(a: Grade, b: Grade, k: number, out: Grade): Grade {
  const l = (x: number, y: number) => x + (y - x) * k;
  out.warmth = l(a.warmth, b.warmth);
  out.tint = l(a.tint, b.tint);
  out.sat = l(a.sat, b.sat);
  out.contrast = l(a.contrast, b.contrast);
  out.fade = l(a.fade, b.fade);
  out.exposure = l(a.exposure, b.exposure);
  out.shadow = [l(a.shadow[0], b.shadow[0]), l(a.shadow[1], b.shadow[1]), l(a.shadow[2], b.shadow[2])];
  return out;
}

const FinishShader = {
  name: 'FinishShader',
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uGrade: { value: 1 },
    uWarm: { value: 0 },
    uTint: { value: 0 },
    uSat: { value: 1 },
    uContrast: { value: 0 },
    uFade: { value: 0 },
    uShadow: { value: new THREE.Vector3() },
    uExposure: { value: 1 },
    uVignette: { value: 0 },
    uGrain: { value: 0 },
    uTime: { value: 0 },
    uAspect: { value: 1 },
    uRes: { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uGrade, uWarm, uTint, uSat, uContrast, uFade, uExposure;
    uniform vec3 uShadow;
    uniform float uVignette, uGrain, uTime, uAspect;
    uniform vec2 uRes;
    varying vec2 vUv;

    const vec3 LUMA = vec3( 0.2126, 0.7152, 0.0722 );

    float hash( vec3 p ) {
      p = fract( p * 0.1031 );
      p += dot( p, p.zyx + 31.32 );
      return fract( ( p.x + p.y ) * p.z );
    }

    void main() {
      vec4 src = texture2D( tDiffuse, vUv );
      vec3 c = src.rgb;

      if ( uGrade > 0.0 ) {
        vec3 g = c * uExposure;
        g *= vec3( 1.0 + uWarm * 0.07, 1.0 - uTint * 0.05, 1.0 - uWarm * 0.07 );
        float l = dot( g, LUMA );
        g += uShadow * ( 1.0 - smoothstep( 0.0, 0.45, l ) );
        g = clamp( g, 0.0, 1.0 );
        g = mix( g, g * g * ( 3.0 - 2.0 * g ), uContrast );
        l = dot( g, LUMA );
        g = mix( vec3( l ), g, uSat );
        g = g * ( 1.0 - uFade ) + uFade;
        c = mix( c, g, uGrade );
      }

      if ( uVignette > 0.0 ) {
        vec2 d = ( vUv - 0.5 ) * vec2( uAspect, 1.0 );
        float v = smoothstep( 0.35, 1.05, length( d ) * 1.15 );
        c *= 1.0 - v * uVignette;
      }

      // Grain, heavier in the shadows; always a tiny bit of dither against banding.
      float n = hash( vec3( vUv * uRes, floor( uTime * 24.0 ) ) ) - 0.5;
      float l = dot( c, LUMA );
      c += n * ( uGrain * ( 1.0 - 0.7 * l ) + 1.0 / 255.0 );

      gl_FragColor = vec4( c, src.a );
    }`,
};

export class FinishPass extends ShaderPass {
  private cur: Grade = { ...NEUTRAL, shadow: [0, 0, 0] };

  constructor() {
    super(FinishShader);
  }

  set(o: { grade: boolean; vignette: boolean; grain: boolean }) {
    const u = this.uniforms;
    u.uGrade.value = o.grade ? 1 : 0;
    u.uVignette.value = o.vignette ? 0.32 : 0;
    u.uGrain.value = o.grain ? 0.045 : 0;
  }

  /** Ease towards `target` (call every frame). */
  update(target: Grade, dt: number, time: number) {
    lerpGrade(this.cur, target, Math.min(1, dt * 2.5), this.cur);
    const u = this.uniforms, g = this.cur;
    u.uWarm.value = g.warmth;
    u.uTint.value = g.tint;
    u.uSat.value = g.sat;
    u.uContrast.value = g.contrast;
    u.uFade.value = g.fade;
    u.uExposure.value = g.exposure;
    (u.uShadow.value as THREE.Vector3).set(g.shadow[0], g.shadow[1], g.shadow[2]);
    u.uTime.value = time;
  }

  setSize(w: number, h: number) {
    this.uniforms.uAspect.value = w / Math.max(1, h);
    (this.uniforms.uRes.value as THREE.Vector2).set(w, h);
  }
}
