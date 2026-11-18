// Post-processing chain, built from the graphics settings (render/graphics.ts):
//
//   scene → ambient occlusion → floor reflections → bloom → lens (chroma, dirt)
//         → tone mapping (OutputPass) → grade + vignette + grain
//
// AO draws the dark line where walls meet floors and under furniture; bloom makes light
// strips and LED boards glow. Passes are created the first time they are switched on and
// then only enabled/disabled, so toggling is instant. With every effect off (Low) this file
// is not used at all and the scene renders straight to the screen.

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import type { Pass } from 'three/examples/jsm/postprocessing/Pass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { LensPass } from './film';
import { FinishPass, type Grade } from './grade';
import type { Fx } from './graphics';
import { ReflectionPass } from './ssr';

/** GTAO, but glass and the sky do not occlude or receive occlusion. */
class StationAO extends GTAOPass {
  private hidden: THREE.Object3D[] = [];
  _overrideVisibility() {
    this.scene.traverse((o) => {
      if (!o.visible) return;
      const mesh = o as THREE.Mesh;
      const mat = mesh.material as THREE.Material | undefined;
      const skip = (o as THREE.Points).isPoints || (o as THREE.Line).isLine || o.userData.noAO === true || (mesh.isMesh && mat && !Array.isArray(mat) && mat.transparent);
      if (skip) {
        o.visible = false;
        this.hidden.push(o);
      }
    });
  }
  _restoreVisibility() {
    for (const o of this.hidden) o.visible = true;
    this.hidden.length = 0;
  }
}

export class Post {
  private composer: EffectComposer;
  private scenePass: RenderPass;
  private output = new OutputPass();
  private lens = new LensPass();
  private finish = new FinishPass();
  private ao: StationAO | null = null;
  private aoHq: boolean | null = null;
  private ssr: ReflectionPass | null = null;
  private ssrHq: boolean | null = null;
  private bloom: UnrealBloomPass | null = null;
  private w: number;
  private h: number;

  constructor(private renderer: THREE.WebGLRenderer, private scene: THREE.Scene, private camera: THREE.PerspectiveCamera, w: number, h: number, fx: Fx) {
    this.w = w;
    this.h = h;
    const target = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(renderer, target);
    this.scenePass = new RenderPass(scene, camera);
    this.apply(fx);
  }

  /** Match the chain to `fx`: create passes on first use, enable or skip the rest. */
  apply(fx: Fx) {
    const pw = Math.round(this.w * this.renderer.getPixelRatio()), ph = Math.round(this.h * this.renderer.getPixelRatio());
    if (fx.ao && (!this.ao || this.aoHq !== fx.hq)) {
      this.ao ??= new StationAO(this.scene, this.camera, pw, ph);
      this.ao.updateGtaoMaterial({ radius: 1.0, distanceExponent: 1.0, thickness: 1.0, scale: 1.9, samples: fx.hq ? 24 : 16 });
      this.ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: fx.hq ? 12 : 10, rings: fx.hq ? 3 : 2, samples: fx.hq ? 24 : 16 });
      this.ao.blendIntensity = 1.0;
      this.aoHq = fx.hq;
    }
    if (fx.ssr && (!this.ssr || this.ssrHq !== fx.hq)) {
      this.ssr?.dispose();
      this.ssr = new ReflectionPass(this.scene, this.camera, pw, ph, fx.hq);
      this.ssrHq = fx.hq;
    }
    if (fx.bloom && !this.bloom) this.bloom = new UnrealBloomPass(new THREE.Vector2(pw, ph), 0.2, 0.5, 1.25);

    const glare = fx.bloom && this.bloom ? ([this.bloom.renderTargetsVertical[2].texture, this.bloom.renderTargetsVertical[3].texture] as [THREE.Texture, THREE.Texture]) : null;
    this.lens.set(fx, glare);
    this.finish.set(fx);
    this.finish.enabled = fx.grade || fx.vignette || fx.grain;

    const passes: (Pass | null)[] = [
      this.scenePass,
      fx.ao ? this.ao : null,
      fx.ssr ? this.ssr : null,
      fx.bloom ? this.bloom : null,
      this.lens.enabled ? this.lens : null,
      this.output,
      this.finish.enabled ? this.finish : null,
    ];
    this.composer.passes = passes.filter((p): p is Pass => p !== null);
    this.setSize(this.w, this.h);
  }

  setSize(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(w, h);
  }

  render(grade: Grade, dt: number, time: number) {
    this.finish.update(grade, dt, time);
    this.composer.render(dt);
  }

  dispose() {
    this.composer.dispose();
    this.ao?.dispose();
    this.ssr?.dispose();
    this.bloom?.dispose();
    this.lens.dispose();
    this.finish.dispose();
    this.output.dispose();
  }
}
