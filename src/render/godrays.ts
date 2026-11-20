// Sun shafts (Ultra): the brightest part of the frame (the sun and the sky around it) is
// smeared away from the sun's place on screen at half resolution, then added back. Whatever
// stands in front of the sun is darker than it, so it cuts gaps into the shafts by itself.
// Runs in linear HDR before bloom, and only while the sun is up and in front of the camera.

import * as THREE from 'three';
import { FullScreenQuad, Pass } from 'three/examples/jsm/postprocessing/Pass.js';

const VS = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4( position.xy, 0.0, 1.0 );
  }`;

const RAYS_FS = /* glsl */ `
  uniform sampler2D tColor;
  uniform vec2 uSun;
  uniform float uAspect, uThreshold;
  varying vec2 vUv;
  const int N = 44;
  void main() {
    vec2 dir = uSun - vUv;
    float dist = length( dir * vec2( uAspect, 1.0 ) );
    vec2 stp = dir * ( 0.92 / float( N ) );
    float jit = fract( 52.9829189 * fract( dot( gl_FragCoord.xy, vec2( 0.06711056, 0.00583715 ) ) ) );
    vec2 uv = vUv + stp * jit;
    vec3 acc = vec3( 0.0 );
    float decay = 1.0;
    for ( int i = 0; i < N; i++ ) {
      vec3 s = min( texture2D( tColor, clamp( uv, 0.0, 1.0 ) ).rgb, vec3( 8.0 ) );
      float l = dot( s, vec3( 0.2126, 0.7152, 0.0722 ) );
      acc += s * smoothstep( uThreshold, uThreshold * 2.2, l ) * decay;
      decay *= 0.97;
      uv += stp;
    }
    gl_FragColor = vec4( acc / float( N ) * ( 1.0 - smoothstep( 0.1, 1.5, dist ) ), 1.0 );
  }`;

const ADD_FS = /* glsl */ `
  uniform sampler2D tColor, tRays;
  uniform float uStrength;
  varying vec2 vUv;
  void main() {
    vec4 c = texture2D( tColor, vUv );
    gl_FragColor = vec4( c.rgb + texture2D( tRays, vUv ).rgb * uStrength, c.a );
  }`;

export class GodRaysPass extends Pass {
  private rays: THREE.WebGLRenderTarget;
  private raysMat: THREE.ShaderMaterial;
  private addMat: THREE.ShaderMaterial;
  private raysQuad: FullScreenQuad;
  private addQuad: FullScreenQuad;
  private p = new THREE.Vector3();
  private fwd = new THREE.Vector3();

  constructor(private camera: THREE.PerspectiveCamera, w: number, h: number) {
    super();
    this.rays = new THREE.WebGLRenderTarget(Math.max(1, w >> 1), Math.max(1, h >> 1), { type: THREE.HalfFloatType });
    this.raysMat = new THREE.ShaderMaterial({
      name: 'godrays',
      uniforms: { tColor: { value: null }, uSun: { value: new THREE.Vector2(0.5, 0.5) }, uAspect: { value: 1 }, uThreshold: { value: 1.5 } },
      vertexShader: VS,
      fragmentShader: RAYS_FS,
      depthTest: false,
      depthWrite: false,
    });
    this.addMat = new THREE.ShaderMaterial({
      name: 'godrays-add',
      uniforms: { tColor: { value: null }, tRays: { value: this.rays.texture }, uStrength: { value: 0 } },
      vertexShader: VS,
      fragmentShader: ADD_FS,
      depthTest: false,
      depthWrite: false,
    });
    this.raysQuad = new FullScreenQuad(this.raysMat);
    this.addQuad = new FullScreenQuad(this.addMat);
    this.enabled = false;
  }

  setSize(w: number, h: number) {
    this.rays.setSize(Math.max(1, w >> 1), Math.max(1, h >> 1));
    this.raysMat.uniforms.uAspect.value = w / Math.max(1, h);
  }

  /** Aim at the sun (`dir`: unit vector towards it). The pass switches itself off when there is nothing to draw. */
  aim(dir: THREE.Vector3, strength: number) {
    const cam = this.camera;
    cam.getWorldDirection(this.fwd);
    const facing = this.fwd.dot(dir);
    const k = strength * Math.min(1, Math.max(0, (facing - 0.15) / 0.35));
    this.enabled = k > 0.01;
    if (!this.enabled) return;
    this.p.copy(cam.position).addScaledVector(dir, 1000).project(cam);
    (this.raysMat.uniforms.uSun.value as THREE.Vector2).set(this.p.x * 0.5 + 0.5, this.p.y * 0.5 + 0.5);
    this.addMat.uniforms.uStrength.value = k;
  }

  render(renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget) {
    this.raysMat.uniforms.tColor.value = readBuffer.texture;
    renderer.setRenderTarget(this.rays);
    this.raysQuad.render(renderer);
    this.addMat.uniforms.tColor.value = readBuffer.texture;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.addQuad.render(renderer);
  }

  dispose() {
    this.rays.dispose();
    this.raysMat.dispose();
    this.addMat.dispose();
    this.raysQuad.dispose();
    this.addQuad.dispose();
  }
}
