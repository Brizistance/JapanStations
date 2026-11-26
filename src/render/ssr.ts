// Screen-space reflections on polished floors (Ultra).
//
// three's own SSRPass renders the scene itself and replaces the RenderPass, so it cannot sit
// after GTAO in our chain. This one is small and slots in anywhere after the scene render:
//   1. Prepass: every opaque mesh draws its view-space normal, and its material's reflectivity
//      (`material.userData.ssr`, 0 = none) into alpha, with a depth texture.
//   2. Trace (half resolution): from each reflective pixel, march the reflected ray through
//      the depth buffer, refine the hit, and fetch the lit colour there. Faded by Fresnel,
//      ray length and screen edges, so misses fall back smoothly to the env-map reflection
//      the lit material already has.
//   3. Composite: a small blur (floors are polished, not mirrors) added onto the frame.

import * as THREE from 'three';
import { FullScreenQuad, Pass } from 'three/examples/jsm/postprocessing/Pass.js';

/** Mark a material as reflective for SSR (0…1). */
export function setReflective(m: THREE.Material, amount: number) {
  m.userData.ssr = amount;
}

/** True while the ground is wet: materials marked with `setWetReflective` reflect too. */
export const ssrWet = { on: false };

/** Mark a material as reflective for SSR only when it is wet (streets, paving). */
export function setWetReflective(m: THREE.Material, amount: number) {
  m.userData.ssrWet = amount;
}

const QUAD_VS = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4( position.xy, 0.0, 1.0 );
  }`;

function prepassMaterial(reflect: number, side: THREE.Side): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    name: 'ssr-prepass',
    uniforms: { uReflect: { value: reflect } },
    side,
    vertexShader: /* glsl */ `
      #include <common>
      varying vec3 vN;
      #include <logdepthbuf_pars_vertex>
      void main() {
        #include <beginnormal_vertex>
        #include <defaultnormal_vertex>
        #include <begin_vertex>
        #include <project_vertex>
        #include <logdepthbuf_vertex>
        vN = transformedNormal;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uReflect;
      varying vec3 vN;
      #include <logdepthbuf_pars_fragment>
      void main() {
        #include <logdepthbuf_fragment>
        vec3 n = normalize( vN );
        #ifdef DOUBLE_SIDED
          n *= gl_FrontFacing ? 1.0 : -1.0;
        #endif
        gl_FragColor = vec4( n, uReflect );
      }`,
  });
}

const TRACE_FS = /* glsl */ `
  #include <packing>
  uniform sampler2D tDepth, tNormal, tColor;
  uniform mat4 uProj, uInvProj;
  uniform float uNear, uFar, uMaxDist;
  varying vec2 vUv;

  // The renderer keeps a logarithmic depth buffer (Scene.tsx): read it back as ordinary perspective depth, so the
  // trace's projection maths is unchanged. depth = log2(1 + w) / log2(far + 1).
  float depthAt( vec2 uv ) {
    float d = texture2D( tDepth, uv ).r;
    if ( d >= 1.0 ) return 1.0;
    float vz = -( exp2( d * log2( uFar + 1.0 ) ) - 1.0 );
    return ( ( uNear + vz ) * uFar ) / ( ( uFar - uNear ) * vz );
  }
  float viewZ( vec2 uv ) {
    return perspectiveDepthToViewZ( depthAt( uv ), uNear, uFar );
  }
  vec2 project( vec3 p ) {
    vec4 c = uProj * vec4( p, 1.0 );
    return c.xy / c.w * 0.5 + 0.5;
  }
  float ign( vec2 px ) {
    return fract( 52.9829189 * fract( dot( px, vec2( 0.06711056, 0.00583715 ) ) ) );
  }

  void main() {
    vec4 nr = texture2D( tNormal, vUv );
    float d = depthAt( vUv );
    if ( nr.a <= 0.0 || d >= 1.0 ) { gl_FragColor = vec4( 0.0 ); return; }

    vec4 pp = uInvProj * vec4( vec3( vUv, d ) * 2.0 - 1.0, 1.0 );
    vec3 P = pp.xyz / pp.w;
    vec3 N = normalize( nr.xyz );
    vec3 V = normalize( P );
    vec3 R = normalize( reflect( V, N ) );
    // Polished stone and lacquered tile: a higher base reflectance than plain dielectrics.
    float fres = mix( 0.15, 1.0, pow( 1.0 - clamp( dot( -V, N ), 0.0, 1.0 ), 5.0 ) );

    vec3 start = P + N * 0.03;
    float jitter = ign( gl_FragCoord.xy );
    float prevT = 0.0, prevDiff = -1.0, hitT = -1.0;
    for ( int i = 1; i <= STEPS; i ++ ) {
      float s = ( float( i ) - jitter ) / float( STEPS );
      float t = s * s * uMaxDist;
      vec3 q = start + R * t;
      if ( q.z > -uNear ) break;
      vec2 uv = project( q );
      if ( uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0 ) break;
      float diff = viewZ( uv ) - q.z;
      // A hit: the ray is just behind the depth buffer, or crossed behind it since the last step.
      if ( diff > 0.0 && ( diff < 0.15 + t * 0.05 || ( prevDiff < 0.0 && diff < 0.4 + t * 0.15 ) ) ) {
        float a = prevT, b = t;
        for ( int j = 0; j < 6; j ++ ) {
          float m = ( a + b ) * 0.5;
          vec3 qm = start + R * m;
          if ( viewZ( project( qm ) ) - qm.z > 0.0 ) b = m; else a = m;
        }
        vec3 qb = start + R * b;
        // Passing behind a thin object (a pole) is not a hit on it.
        if ( viewZ( project( qb ) ) - qb.z < 0.25 + b * 0.04 ) hitT = b;
        break;
      }
      prevT = t;
      prevDiff = diff;
    }
    if ( hitT < 0.0 ) { gl_FragColor = vec4( 0.0 ); return; }

    vec2 huv = project( start + R * hitT );
    if ( depthAt( huv ) >= 1.0 ) { gl_FragColor = vec4( 0.0 ); return; }
    vec3 col = min( texture2D( tColor, huv ).rgb, vec3( 6.0 ) );
    vec2 e = smoothstep( 0.0, 0.1, huv ) * smoothstep( 0.0, 0.1, 1.0 - huv );
    float w = e.x * e.y;
    w *= 1.0 - smoothstep( 0.55, 1.0, hitT / uMaxDist );
    // Rays turning back towards the camera find mostly hidden surfaces.
    w *= 1.0 - smoothstep( 0.0, 0.45, R.z );
    w *= fres * nr.a;
    gl_FragColor = vec4( col * w, w );
  }`;

const COMPOSITE_FS = /* glsl */ `
  uniform sampler2D tColor, tTrace, tNormal;
  uniform vec2 uTexel;
  varying vec2 vUv;
  void main() {
    vec4 c = texture2D( tColor, vUv );
    if ( texture2D( tNormal, vUv ).a > 0.0 ) {
      vec4 r = vec4( 0.0 );
      float wsum = 0.0;
      for ( int y = -1; y <= 1; y ++ ) for ( int x = -1; x <= 1; x ++ ) {
        float w = ( x == 0 ? 2.0 : 1.0 ) * ( y == 0 ? 2.0 : 1.0 );
        r += texture2D( tTrace, vUv + vec2( x, y ) * uTexel * 1.5 ) * w;
        wsum += w;
      }
      c.rgb += r.rgb / wsum * 1.4;
    }
    gl_FragColor = c;
  }`;

export class ReflectionPass extends Pass {
  private pre: THREE.WebGLRenderTarget;
  private trace: THREE.WebGLRenderTarget;
  private traceQuad: FullScreenQuad;
  private compQuad: FullScreenQuad;
  private traceMat: THREE.ShaderMaterial;
  private compMat: THREE.ShaderMaterial;
  private preMats = new Map<string, THREE.ShaderMaterial>();
  private swapped: [THREE.Mesh, THREE.Material | THREE.Material[]][] = [];
  private hidden: THREE.Object3D[] = [];
  private clearColor = new THREE.Color();

  constructor(private scene: THREE.Scene, private camera: THREE.PerspectiveCamera, w: number, h: number, hq: boolean) {
    super();
    this.pre = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, depthTexture: new THREE.DepthTexture(w, h) });
    this.trace = new THREE.WebGLRenderTarget(Math.max(1, w >> 1), Math.max(1, h >> 1), { type: THREE.HalfFloatType });
    this.traceMat = new THREE.ShaderMaterial({
      name: 'ssr-trace',
      defines: { STEPS: hq ? 56 : 36 },
      uniforms: {
        tDepth: { value: this.pre.depthTexture },
        tNormal: { value: this.pre.texture },
        tColor: { value: null },
        uProj: { value: new THREE.Matrix4() },
        uInvProj: { value: new THREE.Matrix4() },
        uNear: { value: 0.1 },
        uFar: { value: 1000 },
        uMaxDist: { value: hq ? 45 : 28 },
      },
      vertexShader: QUAD_VS,
      fragmentShader: TRACE_FS,
      depthTest: false,
      depthWrite: false,
    });
    this.compMat = new THREE.ShaderMaterial({
      name: 'ssr-composite',
      uniforms: {
        tColor: { value: null },
        tTrace: { value: this.trace.texture },
        tNormal: { value: this.pre.texture },
        uTexel: { value: new THREE.Vector2() },
      },
      vertexShader: QUAD_VS,
      fragmentShader: COMPOSITE_FS,
      depthTest: false,
      depthWrite: false,
    });
    this.traceQuad = new FullScreenQuad(this.traceMat);
    this.compQuad = new FullScreenQuad(this.compMat);
    this.setSize(w, h);
  }

  setSize(w: number, h: number) {
    this.pre.setSize(w, h);
    const hw = Math.max(1, w >> 1), hh = Math.max(1, h >> 1);
    this.trace.setSize(hw, hh);
    (this.compMat.uniforms.uTexel.value as THREE.Vector2).set(1 / hw, 1 / hh);
  }

  private preMat(src: THREE.Material): THREE.ShaderMaterial {
    const r = Math.max((src.userData.ssr as number | undefined) ?? 0, ssrWet.on ? ((src.userData.ssrWet as number | undefined) ?? 0) : 0);
    const key = `${r}:${src.side}`;
    let m = this.preMats.get(key);
    if (!m) {
      m = prepassMaterial(r, src.side);
      this.preMats.set(key, m);
    }
    return m;
  }

  /** Swap every opaque mesh to its prepass material; hide everything else. */
  private override() {
    this.scene.traverseVisible((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) {
        if ((o as THREE.Line).isLine || (o as THREE.Points).isPoints || (o as THREE.Sprite).isSprite) this.hidden.push(o);
        return;
      }
      const mat = mesh.material;
      if (Array.isArray(mat) || mat.transparent || o.userData.noAO === true) {
        this.hidden.push(o);
        return;
      }
      this.swapped.push([mesh, mat]);
      mesh.material = this.preMat(mat);
    });
    for (const o of this.hidden) o.visible = false;
  }

  private restore() {
    for (const [m, mat] of this.swapped) m.material = mat;
    for (const o of this.hidden) o.visible = true;
    this.swapped.length = 0;
    this.hidden.length = 0;
  }

  render(renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget) {
    renderer.getClearColor(this.clearColor);
    const clearAlpha = renderer.getClearAlpha();
    const autoClear = renderer.autoClear;
    const shadowAuto = renderer.shadowMap.autoUpdate;
    renderer.autoClear = false;
    renderer.shadowMap.autoUpdate = false;

    // 1. Normals + reflectivity + depth.
    const bg = this.scene.background;
    this.scene.background = null;
    this.override();
    renderer.setClearColor(0x000000, 0);
    renderer.setRenderTarget(this.pre);
    renderer.clear();
    renderer.render(this.scene, this.camera);
    this.restore();
    this.scene.background = bg;

    // 2. Trace.
    const cam = this.camera, u = this.traceMat.uniforms;
    (u.uProj.value as THREE.Matrix4).copy(cam.projectionMatrix);
    (u.uInvProj.value as THREE.Matrix4).copy(cam.projectionMatrixInverse);
    u.uNear.value = cam.near;
    u.uFar.value = cam.far;
    u.tColor.value = readBuffer.texture;
    renderer.setRenderTarget(this.trace);
    renderer.clear();
    this.traceQuad.render(renderer);

    // 3. Composite.
    this.compMat.uniforms.tColor.value = readBuffer.texture;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    if (this.clear) renderer.clear();
    this.compQuad.render(renderer);

    renderer.setClearColor(this.clearColor, clearAlpha);
    renderer.autoClear = autoClear;
    renderer.shadowMap.autoUpdate = shadowAuto;
  }

  dispose() {
    this.pre.depthTexture?.dispose();
    this.pre.dispose();
    this.trace.dispose();
    this.traceMat.dispose();
    this.compMat.dispose();
    for (const m of this.preMats.values()) m.dispose();
    this.traceQuad.dispose();
    this.compQuad.dispose();
  }
}
