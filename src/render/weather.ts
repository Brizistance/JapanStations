// Rain. One draw call of streaks in a box that follows the camera, and a small top-down
// depth map of what is overhead near the player, so nothing falls through roofs, canopies,
// viaducts or train cars. The same map keeps sheltered ground dry (lit.ts, `uRainMap`).

import * as THREE from 'three';
import type { Atmosphere } from './atmosphere';
import { shared } from './lit';

const DROPS = 9000;
const BOX = new THREE.Vector3(38, 26, 38);
/** Half the side of the square the shelter map covers, and its depth range, in metres. */
const HALF = 32, RANGE = 120, MAP = 512;

function rainMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    fog: false,
    uniforms: {
      uCam: { value: new THREE.Vector3() },
      uBox: { value: BOX },
      uVel: { value: new THREE.Vector3(1.2, -11, 0.5) },
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(1, 1, 1) },
      uAmount: { value: 0 },
      uRainMap: shared.uRainMap,
      uRainBox: shared.uRainBox,
    },
    vertexShader: /* glsl */ `
      attribute float aEnd;
      attribute float aSpeed;
      uniform vec3 uCam, uBox, uVel;
      uniform float uTime, uAmount;
      uniform sampler2D uRainMap;
      uniform vec4 uRainBox;
      varying float vAlpha;
      void main() {
        vec3 vel = uVel * aSpeed;
        vec3 head = position * uBox + vel * uTime;
        head = mod( head - uCam, uBox ) - 0.5 * uBox + uCam;
        vec3 wp = head - vel * ( 0.05 * aEnd );
        float show = 1.0;
        if ( uRainBox.z > 0.0 ) {
          vec2 ruv = vec2( head.x - uRainBox.x, uRainBox.y - head.z ) / ( 2.0 * uRainBox.z ) + 0.5;
          if ( ruv.x > 0.0 && ruv.x < 1.0 && ruv.y > 0.0 && ruv.y < 1.0 ) {
            float roofY = uRainBox.w - texture2D( uRainMap, ruv ).r * ${RANGE.toFixed(1)};
            if ( head.y < roofY - 0.15 ) show = 0.0;
          }
        }
        float far = length( head.xz - uCam.xz ) / ( 0.5 * uBox.x );
        vAlpha = uAmount * show * ( 1.0 - smoothstep( 0.7, 1.0, far ) ) * mix( 1.0, 0.15, aEnd );
        gl_Position = show > 0.5 ? projectionMatrix * viewMatrix * vec4( wp, 1.0 ) : vec4( 2.0, 2.0, 2.0, 1.0 );
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying float vAlpha;
      void main() {
        gl_FragColor = vec4( uColor, vAlpha );
      }
    `,
  });
}

export class Rain {
  private lines: THREE.LineSegments;
  private mat = rainMaterial();
  private target: THREE.WebGLRenderTarget | null = null;
  private top = new THREE.OrthographicCamera(-HALF, HALF, HALF, -HALF, 0, RANGE);
  private mask = new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide });
  private tick = 0;
  private wet = 0;
  private amount = 0;

  constructor(private scene: THREE.Scene) {
    const pos = new Float32Array(DROPS * 6), end = new Float32Array(DROPS * 2), speed = new Float32Array(DROPS * 2);
    let seed = 91;
    const r = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < DROPS; i++) {
      const x = r(), y = r(), z = r(), s = 0.8 + r() * 0.45;
      pos.set([x, y, z, x, y, z], i * 6);
      end.set([0, 1], i * 2);
      speed.set([s, s], i * 2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
    g.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1));
    this.lines = new THREE.LineSegments(g, this.mat);
    this.lines.frustumCulled = false;
    this.lines.visible = false;
    this.lines.renderOrder = 20;
    this.lines.userData.noAO = true;
    scene.add(this.lines);
    this.top.up.set(0, 0, -1);
  }

  /** Redraw what is overhead around `cam`. */
  private shelter(renderer: THREE.WebGLRenderer, cam: THREE.Vector3, hide: THREE.Object3D[]) {
    this.target ??= new THREE.WebGLRenderTarget(MAP, MAP, { depthTexture: new THREE.DepthTexture(MAP, MAP) });
    const cx = Math.round(cam.x), cz = Math.round(cam.z), top = Math.round(cam.y) + RANGE / 2;
    this.top.position.set(cx, top, cz);
    this.top.lookAt(cx, top - 1, cz);
    this.top.updateMatrixWorld();

    const was = hide.map((o) => o.visible);
    for (const o of hide) o.visible = false;
    const prevTarget = renderer.getRenderTarget(), prevOverride = this.scene.overrideMaterial, bg = this.scene.background;
    const shadowAuto = renderer.shadowMap.autoUpdate, shadowNeeds = renderer.shadowMap.needsUpdate;
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = false;
    this.scene.overrideMaterial = this.mask;
    this.scene.background = null;
    renderer.setRenderTarget(this.target);
    renderer.clear();
    renderer.render(this.scene, this.top);
    renderer.setRenderTarget(prevTarget);
    this.scene.overrideMaterial = prevOverride;
    this.scene.background = bg;
    renderer.shadowMap.autoUpdate = shadowAuto;
    renderer.shadowMap.needsUpdate = shadowNeeds;
    hide.forEach((o, i) => (o.visible = was[i]));

    shared.uRainMap.value = this.target.depthTexture;
    shared.uRainBox.value.set(cx, cz, HALF, top);
  }

  /**
   * `outside`: the camera can see the open air. `fast`: the shelter is moving with the camera
   * (riding a train), so the map is redrawn every frame. `hide`: objects kept out of the map.
   */
  update(renderer: THREE.WebGLRenderer, cam: THREE.Vector3, a: Atmosphere, dt: number, outside: boolean, fast: boolean, hide: THREE.Object3D[]) {
    // Ground wets within seconds and dries slowly.
    this.wet += (a.wet - this.wet) * Math.min(1, dt * (a.wet > this.wet ? 0.5 : 0.08));
    if (Math.abs(a.wet - this.wet) < 0.002) this.wet = a.wet;
    shared.uWet.value = this.wet;
    this.amount += (a.rain - this.amount) * Math.min(1, dt * 1.5);

    const raining = this.amount > 0.01 && outside;
    this.lines.visible = raining;
    if (this.wet > 0.01 && outside && (fast || this.tick++ % 6 === 0)) this.shelter(renderer, cam, [this.lines, ...hide]);
    if (!raining) return;
    const u = this.mat.uniforms;
    u.uTime.value += dt;
    (u.uCam.value as THREE.Vector3).copy(cam);
    u.uAmount.value = this.amount * 0.42;
    (u.uColor.value as THREE.Color).fromArray(a.fogColor).multiplyScalar(1.35).addScalar(0.05);
  }

  dispose() {
    this.scene.remove(this.lines);
    this.lines.geometry.dispose();
    this.mat.dispose();
    this.mask.dispose();
    this.target?.depthTexture?.dispose();
    this.target?.dispose();
    shared.uRainMap.value = null;
    shared.uRainBox.value.set(0, 0, 0, 0);
    shared.uWet.value = 0;
  }
}
