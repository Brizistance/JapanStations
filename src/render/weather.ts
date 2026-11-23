// Rain and snow. One draw call of streaks in a box that follows the camera, and a small top-down
// depth map of what is overhead near the player, so nothing falls through roofs, canopies,
// viaducts or train cars. The same map keeps sheltered ground dry (lit.ts, `uRainMap`).

import * as THREE from 'three';
import { WIND_DIR, type Atmosphere } from './atmosphere';
import { shared } from './lit';

const DROPS = 16000;
const BOX = new THREE.Vector3(38, 26, 38);
/** Half the side of the square the shelter map covers, and its depth range, in metres. */
const HALF = 32, RANGE = 120, MAP = 512;

const FLAKE_VEL = new THREE.Vector3(0.5, -1.3, 0.25);

function rainMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    fog: false,
    uniforms: {
      uCam: { value: new THREE.Vector3() },
      uBox: { value: BOX },
      uVel: { value: new THREE.Vector3(1.2, -11, 0.5) },
      uOff: { value: new THREE.Vector3() },
      uLen: { value: 0.05 },
      uSway: { value: 0 },
      uGust: { value: 0 },
      uWindDir: { value: new THREE.Vector2(...WIND_DIR) },
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(1, 1, 1) },
      uAmount: { value: 0 },
      uRainMap: shared.uRainMap,
      uRainBox: shared.uRainBox,
    },
    vertexShader: /* glsl */ `
      attribute float aEnd;
      attribute float aSpeed;
      uniform vec3 uCam, uBox, uVel, uOff;
      uniform float uTime, uAmount, uLen, uSway, uGust;
      uniform vec2 uWindDir;
      uniform sampler2D uRainMap;
      uniform vec4 uRainBox;
      varying float vAlpha;
      void main() {
        vec3 vel = uVel * aSpeed;
        vec3 head = position * uBox + uOff * aSpeed;
        head.xz += uSway * vec2( sin( uTime * 0.9 + position.y * 50.0 ), cos( uTime * 0.7 + position.x * 50.0 ) );
        head = mod( head - uCam, uBox ) - 0.5 * uBox + uCam;
        vec3 wp = head - vel * ( uLen * aEnd );
        float show = 1.0;
        if ( uRainBox.z > 0.0 ) {
          vec2 ruv = vec2( head.x - uRainBox.x, uRainBox.y - head.z ) / ( 2.0 * uRainBox.z ) + 0.5;
          if ( ruv.x > 0.0 && ruv.x < 1.0 && ruv.y > 0.0 && ruv.y < 1.0 ) {
            float roofY = uRainBox.w - texture2D( uRainMap, ruv ).r * ${RANGE.toFixed(1)};
            if ( head.y < roofY - 0.15 ) {
              // Under a roof: only what the wind drives in from open ground just upwind, near the edge.
              vec2 buv = ruv - vec2( uWindDir.x, -uWindDir.y ) * ( 2.2 * uGust ) / ( 2.0 * uRainBox.z );
              float upY = uRainBox.w - texture2D( uRainMap, buv ).r * ${RANGE.toFixed(1)};
              if ( uGust < 0.2 || head.y < upY - 0.15 || head.y < roofY - 3.5 ) show = 0.0;
            }
          }
        }
        float far = length( head.xz - uCam.xz ) / ( 0.5 * uBox.x );
        vAlpha = uAmount * show * ( 1.0 - smoothstep( 0.7, 1.0, far ) ) * mix( 1.0, 0.15, aEnd );
        // In a gale the rain comes in sheets: dense bands that sweep downwind with thin air between.
        float across = dot( head.xz, vec2( -uWindDir.y, uWindDir.x ) );
        float band = 0.5 + 0.5 * sin( dot( head.xz, uWindDir ) * 0.16 - uTime * 3.0 + sin( across * 0.07 + uTime * 0.4 ) * 2.5 );
        vAlpha *= mix( 1.0, 0.25 + 1.5 * band * band, uGust );
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

const SPRAY = 2600, SPRAY_BOX = new THREE.Vector3(26, 1, 26);
/** Splashes where hard rain lands: specks that jump off the ground and the roofs (found in the shelter map). */
function sprayMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    fog: false,
    uniforms: {
      uCam: { value: new THREE.Vector3() },
      uBox: { value: SPRAY_BOX },
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(1, 1, 1) },
      uAmount: { value: 0 },
      uGust: { value: 0 },
      uWindDir: { value: new THREE.Vector2(...WIND_DIR) },
      uRainMap: shared.uRainMap,
      uRainBox: shared.uRainBox,
    },
    vertexShader: /* glsl */ `
      attribute float aSeed;
      uniform vec3 uCam, uBox;
      uniform float uTime, uAmount, uGust;
      uniform vec2 uWindDir;
      uniform sampler2D uRainMap;
      uniform vec4 uRainBox;
      varying float vAlpha;
      void main() {
        // Each speck lives a fraction of a second, then lands somewhere new.
        float clock = uTime * ( 1.6 + aSeed ) + aSeed * 17.0;
        float life = fract( clock ), turn = floor( clock );
        vec2 xz = position.xz * uBox.xz + fract( sin( turn * vec2( 12.9898, 78.233 ) + aSeed * 40.0 ) * 43758.5453 ) * uBox.xz;
        xz = mod( xz - uCam.xz, uBox.xz ) - 0.5 * uBox.xz + uCam.xz;
        float show = uRainBox.z > 0.0 ? 1.0 : 0.0;
        vec2 ruv = vec2( xz.x - uRainBox.x, uRainBox.y - xz.y ) / ( 2.0 * uRainBox.z ) + 0.5;
        float ground = uRainBox.w - texture2D( uRainMap, ruv ).r * ${RANGE.toFixed(1)};
        if ( ruv.x < 0.0 || ruv.x > 1.0 || ruv.y < 0.0 || ruv.y > 1.0 ) show = 0.0;
        vec3 wp = vec3( xz.x, ground + 0.03 + life * ( 0.1 + 0.3 * uGust ) * ( 0.5 + aSeed ), xz.y );
        wp.xz += uWindDir * ( life * 0.7 * uGust );
        vec4 mv = viewMatrix * vec4( wp, 1.0 );
        float far = length( xz - uCam.xz ) / ( 0.5 * uBox.x );
        vAlpha = uAmount * show * ( 1.0 - life ) * ( 1.0 - smoothstep( 0.6, 1.0, far ) );
        gl_PointSize = clamp( 26.0 / max( 1.0, -mv.z ), 1.0, 3.5 );
        gl_Position = show > 0.5 ? projectionMatrix * mv : vec4( 2.0, 2.0, 2.0, 1.0 );
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

const DEBRIS = 260, DEBRIS_BOX = new THREE.Vector3(44, 9, 44);
/** What a gale carries: leaves torn off the trees and scraps of litter, tumbling downwind. */
function debrisMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    fog: false,
    uniforms: {
      uCam: { value: new THREE.Vector3() },
      uBox: { value: DEBRIS_BOX },
      uOff: { value: new THREE.Vector3() },
      uTime: { value: 0 },
      uLight: { value: new THREE.Color(1, 1, 1) },
      uAmount: { value: 0 },
      uRainMap: shared.uRainMap,
      uRainBox: shared.uRainBox,
    },
    vertexShader: /* glsl */ `
      attribute float aSeed;
      uniform vec3 uCam, uBox, uOff;
      uniform float uTime, uAmount;
      uniform sampler2D uRainMap;
      uniform vec4 uRainBox;
      varying float vAlpha;
      varying float vSeed;
      void main() {
        vec3 head = position * uBox + uOff * ( 0.6 + 0.8 * aSeed );
        head.y += sin( uTime * ( 1.3 + aSeed * 2.0 ) + aSeed * 60.0 ) * 0.9;
        vec3 mid = uCam + vec3( 0.0, 2.5, 0.0 );
        head = mod( head - mid, uBox ) - 0.5 * uBox + mid;
        float show = 1.0;
        if ( uRainBox.z > 0.0 ) {
          vec2 ruv = vec2( head.x - uRainBox.x, uRainBox.y - head.z ) / ( 2.0 * uRainBox.z ) + 0.5;
          if ( ruv.x > 0.0 && ruv.x < 1.0 && ruv.y > 0.0 && ruv.y < 1.0 ) {
            float roofY = uRainBox.w - texture2D( uRainMap, ruv ).r * ${RANGE.toFixed(1)};
            if ( head.y < roofY + 0.05 ) show = 0.0;
          }
        }
        vec4 mv = viewMatrix * vec4( head, 1.0 );
        float far = length( head.xz - uCam.xz ) / ( 0.5 * uBox.x );
        // Tumbling: each scrap turns edge-on and back.
        float turn = 0.35 + 0.65 * abs( sin( uTime * ( 5.0 + aSeed * 6.0 ) + aSeed * 50.0 ) );
        vAlpha = uAmount * show * ( 1.0 - smoothstep( 0.7, 1.0, far ) );
        vSeed = aSeed;
        gl_PointSize = clamp( ( 70.0 + 90.0 * aSeed ) / max( 1.0, -mv.z ), 1.5, 9.0 ) * turn;
        gl_Position = show > 0.5 ? projectionMatrix * mv : vec4( 2.0, 2.0, 2.0, 1.0 );
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uLight;
      varying float vAlpha;
      varying float vSeed;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        if ( abs( c.x ) + abs( c.y ) * 1.6 > 0.5 ) discard;
        // Mostly leaves, some paper and plastic.
        vec3 tint = vSeed < 0.7 ? mix( vec3( 0.16, 0.24, 0.08 ), vec3( 0.3, 0.2, 0.08 ), fract( vSeed * 7.0 ) ) : vec3( 0.62, 0.62, 0.58 );
        gl_FragColor = vec4( tint * uLight, vAlpha );
      }
    `,
  });
}

/** `count` points scattered through a unit box, each with a random seed. */
function scatter(count: number, seed: number): THREE.BufferGeometry {
  const pos = new Float32Array(count * 3), seeds = new Float32Array(count);
  const r = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < count; i++) {
    pos.set([r(), r(), r()], i * 3);
    seeds[i] = r();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  return g;
}

export class Rain {
  private lines: THREE.LineSegments;
  private mat = rainMaterial();
  private spray = new THREE.Points(scatter(SPRAY, 17), sprayMaterial());
  private debris = new THREE.Points(scatter(DEBRIS, 53), debrisMaterial());
  private target: THREE.WebGLRenderTarget | null = null;
  private top = new THREE.OrthographicCamera(-HALF, HALF, HALF, -HALF, 0, RANGE);
  private mask = new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide });
  private tick = 0;
  private wet = 0;
  private amount = 0;
  /** 0 rain … 1 snow, and the eased wind. */
  private flake = 0;
  private wind = 0;
  private clock = 0;

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
    for (const p of [this.spray, this.debris]) {
      p.frustumCulled = false;
      p.visible = false;
      p.renderOrder = 20;
      p.userData.noAO = true;
      scene.add(p);
    }
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
    shared.uBlow.value.set(WIND_DIR[0], WIND_DIR[1]).multiplyScalar(2.6 * Math.max(0, a.wind - 0.2));
    const k = Math.min(1, dt * 1.5);
    this.amount += (Math.max(a.rain, a.snow) - this.amount) * k;
    this.flake += ((a.snow > a.rain ? 1 : 0) - this.flake) * (this.amount < 0.02 ? 1 : k);
    this.wind += (a.wind - this.wind) * k;

    const raining = this.amount > 0.01 && outside;
    this.lines.visible = raining;
    // Splashes need hard rain; flying leaves and litter need a gale.
    const splash = outside ? Math.min(1, Math.max(0, (this.amount - 0.45) / 0.4)) * (1 - this.flake) : 0;
    const gale = outside ? Math.min(1, Math.max(0, (this.wind - 0.35) / 0.45)) : 0;
    this.spray.visible = splash > 0.01;
    this.debris.visible = gale > 0.01;
    if ((this.wet > 0.01 || gale > 0.01) && outside && (fast || this.tick++ % 6 === 0)) this.shelter(renderer, cam, [this.lines, this.spray, this.debris, ...hide]);
    this.clock += dt;
    if (this.spray.visible) {
      const s = (this.spray.material as THREE.ShaderMaterial).uniforms;
      s.uTime.value = this.clock;
      (s.uCam.value as THREE.Vector3).copy(cam);
      s.uAmount.value = splash * 0.5;
      s.uGust.value = this.wind;
      (s.uColor.value as THREE.Color).fromArray(a.fogColor).multiplyScalar(1.5).addScalar(0.08);
    }
    if (this.debris.visible) {
      const d = (this.debris.material as THREE.ShaderMaterial).uniforms;
      d.uTime.value = this.clock;
      (d.uCam.value as THREE.Vector3).copy(cam);
      d.uAmount.value = gale;
      const speed = (5 + 11 * this.wind) * (0.8 + 0.2 * Math.sin(this.clock * 0.8)) * dt, o = d.uOff.value as THREE.Vector3;
      o.set((o.x + WIND_DIR[0] * speed) % (DEBRIS_BOX.x * 64), 0, (o.z + WIND_DIR[1] * speed) % (DEBRIS_BOX.z * 64));
      const f = a.fogColor;
      (d.uLight.value as THREE.Color).setScalar(Math.min(1.6, 0.25 + 2.2 * (0.3 * f[0] + 0.6 * f[1] + 0.1 * f[2])));
    }
    if (!raining) return;
    const u = this.mat.uniforms;
    u.uTime.value += dt;
    (u.uCam.value as THREE.Vector3).copy(cam);
    // Rain: more, longer and faster streaks the harder it falls, slanted and gusting with the wind.
    // Snow: a few slow specks that drift.
    const f = this.flake, gust = this.wind * (0.85 + 0.15 * Math.sin(u.uTime.value * 0.8));
    const fall = 11 * (0.75 + 0.4 * this.amount);
    const vel = (u.uVel.value as THREE.Vector3).set(1.2 + gust * 11 * WIND_DIR[0], -fall, 0.5 + gust * 11 * WIND_DIR[1]).lerp(FLAKE_VEL, f);
    u.uGust.value = Math.min(1, this.wind * 1.4) * (1 - f);
    const off = u.uOff.value as THREE.Vector3;
    off.addScaledVector(vel, dt);
    // Kept small so the positions stay exact however long it rains.
    off.set(off.x % (BOX.x * 64), off.y % (BOX.y * 64), off.z % (BOX.z * 64));
    u.uLen.value = (0.03 + 0.03 * this.amount) * (1 - f) + 0.035 * f;
    u.uSway.value = 0.3 * f;
    this.lines.geometry.setDrawRange(0, 2 * Math.round(DROPS * Math.min(1, this.amount) * (1 - 0.55 * f)));
    u.uAmount.value = Math.min(1, this.amount * 4) * (0.42 + 0.48 * f);
    (u.uColor.value as THREE.Color).fromArray(a.fogColor).multiplyScalar(1.35 + 0.4 * f).addScalar(0.05 + 0.3 * f);
  }

  dispose() {
    this.scene.remove(this.lines);
    this.lines.geometry.dispose();
    this.mat.dispose();
    for (const p of [this.spray, this.debris]) {
      this.scene.remove(p);
      p.geometry.dispose();
      (p.material as THREE.Material).dispose();
    }
    this.mask.dispose();
    this.target?.depthTexture?.dispose();
    this.target?.dispose();
    shared.uRainMap.value = null;
    shared.uRainBox.value.set(0, 0, 0, 0);
    shared.uWet.value = 0;
    shared.uBlow.value.set(0, 0);
  }
}
