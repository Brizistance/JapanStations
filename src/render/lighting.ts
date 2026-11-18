// Light for the whole world: two prefiltered environments (station interior and open
// sky), the sun, and the visible sky dome. Nothing here is per-station: stations are lit
// by the interior environment, and `aEnv` on the geometry decides where daylight reaches.

import * as THREE from 'three';
import { shared } from './lit';
import { macroTexture } from './textures';

export const SUN_DIR = new THREE.Vector3(0.46, 0.74, 0.36).normalize();
/** Horizon colour (linear); distance fog above ground fades to this. */
export const HORIZON = new THREE.Color(0.66, 0.78, 0.9);

const SKY_GLSL = /* glsl */ `
  vec3 skyColor( vec3 d, vec3 sunDir, vec3 horizon, float sunGain ) {
    vec3 zenith = vec3( 0.16, 0.36, 0.78 );
    vec3 ground = vec3( 0.30, 0.29, 0.27 );
    float h = d.y;
    vec3 c = h > 0.0 ? mix( horizon, zenith, pow( h, 0.5 ) ) : mix( horizon, ground, smoothstep( 0.0, -0.12, h ) );
    float s = max( dot( d, sunDir ), 0.0 );
    c += vec3( 1.0, 0.92, 0.78 ) * ( pow( s, 700.0 ) * sunGain + pow( s, 10.0 ) * 0.22 );
    return c;
  }
`;

function skyMaterial(sunGain: number, final: boolean): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { sunDir: { value: SUN_DIR }, horizon: { value: HORIZON }, sunGain: { value: sunGain } },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 sunDir;
      uniform vec3 horizon;
      uniform float sunGain;
      varying vec3 vDir;
      ${SKY_GLSL}
      void main() {
        gl_FragColor = vec4( skyColor( normalize( vDir ), sunDir, horizon, sunGain ), 1.0 );
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

function skyScene(): THREE.Scene {
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), skyMaterial(40, false)));
  return s;
}

export class Lighting {
  readonly sun = new THREE.DirectionalLight('#fff1dc', 2.6);
  readonly dome: THREE.Mesh;
  private targets: THREE.WebGLRenderTarget[] = [];
  private shadowTick = 0;

  constructor(renderer: THREE.WebGLRenderer, private scene: THREE.Scene) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const interior = pmrem.fromScene(interiorScene(), 0.02, 0.1, 100);
    const sky = pmrem.fromScene(skyScene(), 0, 0.1, 100);
    pmrem.dispose();
    this.targets.push(interior, sky);
    scene.environment = interior.texture;
    shared.envMapSky.value = sky.texture;
    shared.uMacro.value = macroTexture();

    this.dome = new THREE.Mesh(new THREE.SphereGeometry(2600, 32, 16), skyMaterial(14, true));
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
    this.sun.position.copy(SUN_DIR).multiplyScalar(350);
    scene.add(this.sun, this.sun.target);
  }

  /**
   * `yaw` turns the interior environment so its light rows run along the nearest
   * platform. Shadows are redrawn every few frames, and only above ground.
   */
  update(cam: THREE.Vector3, yaw: number, shadows: boolean) {
    this.dome.position.copy(cam);
    this.scene.environmentRotation.set(0, yaw, 0);

    const outside = cam.y > -4;
    this.sun.castShadow = shadows;
    if (!shadows || !outside) return;
    if (this.shadowTick++ % 3 !== 0) return;
    // Snap the shadow box to its own texel grid so edges do not crawl as the player moves.
    const step = 220 / 2048 * 8;
    const tx = Math.round(cam.x / step) * step, tz = Math.round(cam.z / step) * step;
    this.sun.target.position.set(tx, 0, tz);
    this.sun.position.set(tx + SUN_DIR.x * 350, SUN_DIR.y * 350, tz + SUN_DIR.z * 350);
    this.sun.target.updateMatrixWorld();
    this.sun.updateMatrixWorld();
    this.sun.shadow.needsUpdate = true;
  }

  dispose() {
    for (const t of this.targets) t.dispose();
    this.scene.remove(this.dome, this.sun, this.sun.target);
    this.scene.environment = null;
  }
}
