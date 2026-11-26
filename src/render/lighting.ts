// Light for the whole world: two prefiltered environments (station interior and open
// sky), the key light (sun by day, moon by night), and the visible sky dome. Nothing here
// is per-station: stations are lit by the interior environment, and `aEnv` on the geometry
// decides where daylight reaches. Everything that changes with the hour or the weather
// comes from one Atmosphere (atmosphere.ts).

import * as THREE from 'three';
import type { Atmosphere } from './atmosphere';
import { cloudNoise } from './cloud-noise';
import { shared } from './lit';
import { macroTexture } from './textures';

/** Uniforms shared by every sky material (the dome and the environment capture). */
/** The sky's share of the ambient light in calm weather (lit.ts `uEnvLevels.y`). */
const SKY_LEVEL = 1.15;
const skyU = {
  uSun: { value: new THREE.Vector3(0, 1, 0) },
  uMoon: { value: new THREE.Vector3(0, -1, 0) },
  uLight: { value: new THREE.Vector3(0, 1, 0) },
  uFog: { value: new THREE.Color(0.66, 0.78, 0.9) },
  uSunCol: { value: new THREE.Color(1, 0.88, 0.72) },
  uCloudLit: { value: new THREE.Color(1, 1, 1) },
  uCloudDark: { value: new THREE.Color(0.5, 0.5, 0.5) },
  uNight: { value: 0 },
  uCover: { value: 0.2 },
  uHaze: { value: 0 },
  uSunVis: { value: 1 },
  uTime: { value: 0 },
  /** How far the clouds have drifted: runs with `uTime`, faster in wind. */
  uDrift: { value: 0 },
  uNoise: { value: null as THREE.Data3DTexture | null },
};

const SKY_GLSL = /* glsl */ `
  uniform vec3 uSun, uMoon, uLight, uFog, uSunCol, uCloudLit, uCloudDark;
  uniform float uNight, uCover, uHaze, uSunVis, uTime, uDrift;

  float hash12( vec2 p ) {
    vec3 p3 = fract( vec3( p.xyx ) * 0.1031 );
    p3 += dot( p3, p3.yzx + 33.33 );
    return fract( ( p3.x + p3.y ) * p3.z );
  }
  float hash13( vec3 p3 ) {
    p3 = fract( p3 * 0.1031 );
    p3 += dot( p3, p3.zyx + 31.32 );
    return fract( ( p3.x + p3.y ) * p3.z );
  }
  float vnoise( vec2 p ) {
    vec2 i = floor( p ), f = fract( p );
    f = f * f * ( 3.0 - 2.0 * f );
    return mix( mix( hash12( i ), hash12( i + vec2( 1.0, 0.0 ) ), f.x ), mix( hash12( i + vec2( 0.0, 1.0 ) ), hash12( i + vec2( 1.0, 1.0 ) ), f.x ), f.y );
  }
  float fbm( vec2 p ) {
    float a = 0.5, s = 0.0;
    for ( int i = 0; i < 5; i++ ) { s += a * vnoise( p ); p = p * 2.03 + 17.1; a *= 0.5; }
    return s / 0.96875;
  }

  // Daylight: Rayleigh and Mie scattering after Preetham et al. (the model in three.js's Sky).
  const vec3 TOTAL_R = vec3( 5.804542996261093e-6, 1.3562911419845635e-5, 3.0265902468824876e-5 );
  const vec3 MIE_K = vec3( 1.8399918514433978e14, 2.7798023919660528e14, 4.0790479543861094e14 );
  float sunE( float zc ) {
    return 1000.0 * max( 0.0, 1.0 - exp( -( ( 1.6110731556870734 - acos( clamp( zc, -1.0, 1.0 ) ) ) / 1.5 ) ) );
  }
  vec3 scatter( vec3 d, vec3 sun ) {
    float e = sunE( sun.y );
    vec3 bR = TOTAL_R * 1.7;
    vec3 bM = 0.434 * ( 0.2 * mix( 3.5, 9.0, uHaze ) * 10e-18 ) * MIE_K * 0.005;
    float za = acos( clamp( d.y, 0.0, 1.0 ) );
    float inv = 1.0 / ( cos( za ) + 0.15 * pow( 93.885 - degrees( za ), -1.253 ) );
    vec3 fex = exp( -( bR * 8.4e3 * inv + bM * 1.25e3 * inv ) );
    float ct = dot( d, sun );
    float rP = 0.05968310365946075 * ( 1.0 + pow( ct * 0.5 + 0.5, 2.0 ) );
    const float g = 0.8;
    float mP = 0.07957747154594767 * ( ( 1.0 - g * g ) / pow( 1.0 - 2.0 * g * ct + g * g, 1.5 ) );
    vec3 ratio = ( bR * rP + bM * mP ) / ( bR + bM );
    vec3 lin = pow( e * ratio * ( 1.0 - fex ), vec3( 1.5 ) );
    lin *= mix( vec3( 1.0 ), pow( e * ratio * fex, vec3( 0.5 ) ), clamp( pow( 1.0 - sun.y, 5.0 ), 0.0, 1.0 ) );
    vec3 c = lin * 0.04 + vec3( 0.0, 0.0003, 0.00075 );
    return pow( c, vec3( 1.0 / 1.6 ) );
  }

  vec3 stars( vec3 d ) {
    vec3 p = d * 210.0, i = floor( p ), f = fract( p ) - 0.5;
    float h = hash13( i );
    float s = smoothstep( 0.988, 1.0, h ) * smoothstep( 0.32, 0.0, length( f ) );
    return mix( vec3( 1.0, 0.85, 0.7 ), vec3( 0.75, 0.85, 1.0 ), hash13( i + 5.0 ) ) * s * 1.6;
  }

  #ifdef CLOUDS3D
  uniform highp sampler3D uNoise;
  const float C_BASE = 1300.0, C_TOP = 2900.0;
  float cdens( vec3 p, bool cheap ) {
    float h = ( p.y - C_BASE ) / ( C_TOP - C_BASE );
    vec3 q = p * 0.00016 + vec3( uDrift * 0.004, 0.0, uDrift * 0.0015 );
    float shape = texture( uNoise, q ).r * 0.72 + texture( uNoise, q * 0.23 + 0.31 ).r * 0.28;
    float hg = smoothstep( 0.0, 0.14, h ) * smoothstep( 1.0, 0.4, h );
    float dd = shape * hg - mix( 0.76, 0.25, pow( uCover, 1.5 ) );
    if ( !cheap ) dd -= texture( uNoise, q * 4.1 ).g * 0.1;
    return clamp( dd * 3.2, 0.0, 1.0 );
  }
  vec4 clouds( vec3 d ) {
    if ( d.y < 0.03 ) return vec4( 0.0 );
    float t0 = C_BASE / d.y, t1 = C_TOP / d.y;
    const int N = 26;
    float dt = ( t1 - t0 ) / float( N );
    float jit = fract( 52.9829189 * fract( dot( gl_FragCoord.xy, vec2( 0.06711056, 0.00583715 ) ) ) );
    float t = t0 + dt * jit, T = 1.0;
    vec3 col = vec3( 0.0 );
    vec3 L = normalize( uLight + vec3( 0.0, 0.08, 0.0 ) );
    float ph = 0.75 + 1.3 * pow( max( dot( d, L ), 0.0 ), 8.0 );
    for ( int i = 0; i < N; i++ ) {
      vec3 p = d * t;
      float dn = cdens( p, false );
      if ( dn > 0.01 ) {
        float od = 0.0;
        for ( int j = 1; j <= 4; j++ ) od += cdens( p + L * ( float( j ) * 110.0 ), true );
        float lit = exp( -od * 1.1 );
        float h = ( p.y - C_BASE ) / ( C_TOP - C_BASE );
        vec3 lc = uCloudDark * mix( 0.8, 1.15, h ) + ( uCloudLit - uCloudDark ) * lit * ph * 1.4;
        float a = 1.0 - exp( -dn * dt * 0.0045 );
        col += T * a * lc;
        T *= 1.0 - a;
        if ( T < 0.03 ) break;
      }
      t += dt;
    }
    return vec4( col / max( 1.0 - T, 1e-3 ), ( 1.0 - T ) * smoothstep( 0.03, 0.14, d.y ) );
  }
  #else
  // A flat sheet of cloud overhead, shaded on the side away from the light.
  vec4 clouds( vec3 d ) {
    if ( d.y < 0.01 ) return vec4( 0.0 );
    vec2 uv = d.xz / ( d.y + 0.12 ) * 1.1 + vec2( uDrift * 0.006, uDrift * 0.0022 );
    float n = fbm( uv ) * 0.75 + fbm( uv * 2.7 + 11.0 ) * 0.25;
    float t = mix( 0.78, 0.16, uCover );
    float a = smoothstep( t, t + 0.22, n );
    if ( a <= 0.0 ) return vec4( 0.0 );
    vec2 toL = normalize( uLight.xz + vec2( 1e-4 ) ) * 0.22;
    float nL = fbm( uv + toL );
    float thick = smoothstep( t, t + 0.5, n );
    float lit = clamp( 1.0 - thick * 0.75 + ( n - nL ) * 2.5, 0.0, 1.0 );
    vec3 col = mix( uCloudDark, uCloudLit, lit );
    return vec4( col, a * smoothstep( 0.02, 0.2, d.y ) );
  }
  #endif

  // sunGain: brightness of the sun's disc. sharp: 1 for the visible dome (a real disc, stars,
  // the moon), 0 for the environment capture (a soft blob that prefilters well).
  vec3 skyColor( vec3 d, float sunGain, float sharp ) {
    vec3 c = scatter( d, uSun ) * SKY_GAIN;
    float md = max( dot( d, uMoon ), 0.0 ), sd = max( dot( d, uSun ), 0.0 );
    float moonUp = smoothstep( -0.05, 0.1, uMoon.y ) * uNight;
    c += vec3( 0.005, 0.008, 0.016 ) * moonUp * ( 0.4 + pow( md, 6.0 ) );
    if ( sharp > 0.5 ) c += stars( d ) * uNight * uNight * smoothstep( 0.02, 0.3, d.y );
    c += vec3( 1.0, 0.96, 0.88 ) * moonUp * ( smoothstep( 0.99990, 0.99994, md ) * sharp * 2.5 + pow( md, 400.0 ) * 0.12 );

    vec4 cl = clouds( d );
    c = mix( c, cl.rgb, cl.a );
    float hz = d.y > 0.0 ? exp( -d.y * mix( 9.0, 1.2, uHaze ) ) * mix( 0.8, 1.0, uHaze ) : 1.0;
    c = mix( c, uFog, hz );

    // The city's own light in the air, low over the roofs.
    c += vec3( 0.13, 0.085, 0.045 ) * ( uNight * exp( -max( d.y, 0.0 ) * 5.5 ) * ( 1.0 - uHaze * 0.4 ) );

    vec3 sc = uSunCol * uSunVis * smoothstep( -0.03, 0.02, uSun.y ) * ( 1.0 - cl.a * 0.97 ) * ( 1.0 - uHaze * 0.9 );
    float disc = mix( pow( sd, 700.0 ), smoothstep( 0.99988, 0.99995, sd ) * 3.0 + pow( sd, 1200.0 ) * 0.3, sharp );
    c += sc * ( disc * sunGain + pow( sd, 10.0 ) * 0.22 );

    if ( d.y < 0.0 ) c = mix( c, uFog * 0.45, smoothstep( 0.0, -0.12, d.y ) );
    return c;
  }
`;

function skyMaterial(sunGain: number, final: boolean, clouds3d = false): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    defines: { SKY_GAIN: '0.33', ...(clouds3d ? { CLOUDS3D: 1 } : {}) },
    uniforms: { ...skyU, sunGain: { value: sunGain } },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      #include <common>
      #include <logdepthbuf_pars_vertex>
      void main() {
        vDir = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        #include <logdepthbuf_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float sunGain;
      varying vec3 vDir;
      ${SKY_GLSL}
      #include <logdepthbuf_pars_fragment>
      void main() {
        #include <logdepthbuf_fragment>
        gl_FragColor = vec4( skyColor( normalize( vDir ), sunGain, ${final ? '1.0' : '0.0'} ), 1.0 );
        ${final ? '#include <tonemapping_fragment>\n#include <colorspace_fragment>' : ''}
      }
    `,
  });
}

/** What a platform "sees": pale surfaces and rows of ceiling light strips. */
function interiorScene(): THREE.Scene {
  const s = new THREE.Scene();
  const flatMat = (v: number, warm = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(v * warm, v, v / warm), side: THREE.BackSide });
  const room = new THREE.Mesh(new THREE.BoxGeometry(44, 4.3, 14), [
    flatMat(0.25), flatMat(0.25), // tunnel ends
    flatMat(0.5), // ceiling
    flatMat(0.8, 1.01), // floor: the main source of bounce light onto ceilings
    flatMat(0.68), flatMat(0.68), // walls
  ]);
  room.position.y = 0.55;
  s.add(room);
  const strip = new THREE.MeshBasicMaterial({ color: new THREE.Color(15, 15, 14.6) });
  const geo = new THREE.BoxGeometry(3, 0.02, 0.3);
  for (const z of [-5.2, -1.8, 1.8, 5.2]) {
    for (let x = -20; x <= 20; x += 4) {
      const m = new THREE.Mesh(geo, strip);
      m.position.set(x, 2.68, z);
      s.add(m);
    }
  }
  return s;
}

const DEG1 = Math.cos(Math.PI / 180);

export class Lighting {
  readonly sun = new THREE.DirectionalLight('#fff1dc', 2.6);
  readonly dome: THREE.Mesh;
  private pmrem: THREE.PMREMGenerator;
  private interior: THREE.WebGLRenderTarget;
  private sky: THREE.WebGLRenderTarget | null = null;
  private skyScene = new THREE.Scene();
  private flat: THREE.ShaderMaterial;
  private volume: THREE.ShaderMaterial | null = null;
  private shadowTick = 0;
  private dir = new THREE.Vector3(0, 1, 0);
  /** The sky the environment was last captured from, and how long ago. */
  private last = { sun: new THREE.Vector3(), fog: new THREE.Color(), cover: -1, age: 1 };

  constructor(renderer: THREE.WebGLRenderer, private scene: THREE.Scene) {
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.interior = this.pmrem.fromScene(interiorScene(), 0.02, 0.1, 100);
    scene.environment = this.interior.texture;
    shared.uMacro.value = macroTexture();
    this.skyScene.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), skyMaterial(40, false)));

    this.flat = skyMaterial(14, true);
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(2600, 32, 16), this.flat);
    this.dome.renderOrder = -10;
    this.dome.frustumCulled = false;
    this.dome.userData.noAO = true;
    scene.add(this.dome);

    const sh = this.sun.shadow;
    sh.mapSize.set(2048, 2048);
    sh.camera.left = sh.camera.bottom = -110;
    sh.camera.right = sh.camera.top = 110;
    sh.camera.near = 10;
    sh.camera.far = 700;
    sh.bias = -0.0006;
    sh.normalBias = 0.06;
    sh.autoUpdate = false;
    scene.add(this.sun, this.sun.target);
  }

  /** Shadow-map resolution: 4096 for extra detail, else 2048. */
  setDetail(hq: boolean) {
    const n = hq ? 4096 : 2048;
    const sh = this.sun.shadow;
    if (sh.mapSize.x === n) return;
    sh.mapSize.set(n, n);
    sh.map?.dispose();
    sh.map = null;
    sh.needsUpdate = true;
  }

  /** Volumetric clouds on the dome (Ultra) or the flat cloud sheet. */
  setClouds(volumetric: boolean) {
    if (volumetric && !this.volume) {
      skyU.uNoise.value = cloudNoise();
      this.volume = skyMaterial(14, true, true);
    }
    this.dome.material = volumetric ? this.volume! : this.flat;
  }

  /** Recapture the sky environment when the sky has visibly changed (not every frame). */
  private capture(a: Atmosphere, dt: number) {
    const l = this.last;
    l.age += dt;
    const fog = skyU.uFog.value;
    const moved = l.sun.dot(skyU.uSun.value) < DEG1 || l.cover !== a.cover
      || Math.abs(l.fog.r - fog.r) + Math.abs(l.fog.g - fog.g) + Math.abs(l.fog.b - fog.b) > 0.012;
    if (this.sky && (!moved || l.age < 0.2)) return;
    const next = this.pmrem.fromScene(this.skyScene, 0, 0.1, 100);
    this.sky?.dispose();
    this.sky = next;
    shared.envMapSky.value = next.texture;
    l.sun.copy(skyU.uSun.value);
    l.fog.copy(fog);
    l.cover = a.cover;
    l.age = 0;
  }

  /**
   * `yaw` turns the interior environment so its light rows run along the nearest
   * platform. Shadows are redrawn every few frames, and only above ground.
   */
  update(cam: THREE.Vector3, yaw: number, shadows: boolean, a: Atmosphere, dt: number) {
    skyU.uSun.value.fromArray(a.sun);
    skyU.uMoon.value.fromArray(a.moon);
    skyU.uLight.value.fromArray(a.light);
    skyU.uFog.value.fromArray(a.fogColor);
    skyU.uSunCol.value.fromArray(a.lightColor);
    skyU.uCloudLit.value.fromArray(a.cloudLit);
    skyU.uCloudDark.value.fromArray(a.cloudDark);
    skyU.uNight.value = a.night;
    skyU.uCover.value = a.cover;
    skyU.uHaze.value = Math.min(1, Math.max(0, 1 - a.fogFar / 1700));
    skyU.uSunVis.value = a.sunLit ? a.direct : 0;
    skyU.uTime.value += dt;
    skyU.uDrift.value += dt * (1 + 9 * a.wind);
    shared.uNight.value = a.night;
    shared.uClock.value = skyU.uTime.value;
    // Storm bands dim and lift the sky's light; lightning throws light on everything outdoors.
    shared.uEnvLevels.value.y = SKY_LEVEL * a.pulse;
    shared.uEnvLevels.value.z = a.night * 0.09 + a.flash * 0.55;
    this.capture(a, dt);
    // The flash itself is added after the capture, so a strike never forces a new sky environment.
    if (a.flash > 0) {
      skyU.uFog.value.addScalar(a.flash * 0.3);
      skyU.uCloudLit.value.addScalar(a.flash * 0.7);
      skyU.uCloudDark.value.addScalar(a.flash * 0.45);
    }

    this.dome.position.copy(cam);
    this.scene.environmentRotation.set(0, yaw, 0);

    // Keep the light off the horizon so the shadow box stays sane; it is nearly off there anyway.
    this.dir.fromArray(a.light);
    this.dir.y = Math.max(this.dir.y, 0.07);
    this.dir.normalize();
    this.sun.color.fromArray(a.lightColor);
    this.sun.intensity = a.lightPower;
    this.sun.visible = a.lightPower > 0.002;

    const outside = cam.y > -4;
    this.sun.castShadow = shadows && a.lightPower > 0.02;
    if (!this.sun.castShadow || !outside) {
      this.sun.position.copy(this.sun.target.position).addScaledVector(this.dir, 350);
      return;
    }
    if (this.shadowTick++ % 3 !== 0) return;
    // Snap the shadow box to its own texel grid so edges do not crawl as the player moves.
    const step = 220 / this.sun.shadow.mapSize.x * 8;
    const tx = Math.round(cam.x / step) * step, tz = Math.round(cam.z / step) * step;
    this.sun.target.position.set(tx, 0, tz);
    this.sun.position.set(tx + this.dir.x * 350, this.dir.y * 350, tz + this.dir.z * 350);
    this.sun.target.updateMatrixWorld();
    this.sun.updateMatrixWorld();
    this.sun.shadow.needsUpdate = true;
  }

  dispose() {
    this.interior.dispose();
    this.sky?.dispose();
    this.pmrem.dispose();
    this.scene.remove(this.dome, this.sun, this.sun.target);
    this.scene.environment = null;
  }
}
