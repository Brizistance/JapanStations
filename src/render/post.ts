// High-quality render path: scene → ambient occlusion → bloom → tone mapping.
// AO draws the dark line where walls meet floors and under furniture; bloom makes
// light strips and LED boards glow. The Low setting skips this file entirely.

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

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
  private ao: StationAO;
  private bloom: UnrealBloomPass;

  constructor(private renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, w: number, h: number) {
    const target = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(renderer, target);
    this.composer.addPass(new RenderPass(scene, camera));
    this.ao = new StationAO(scene, camera, w, h);
    this.ao.updateGtaoMaterial({ radius: 1.0, distanceExponent: 1.0, thickness: 1.0, scale: 1.9, samples: 16 });
    this.ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 10, rings: 2, samples: 16 });
    this.ao.blendIntensity = 1.0;
    this.composer.addPass(this.ao);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.2, 0.5, 1.25);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.setSize(w, h);
  }

  setSize(w: number, h: number) {
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(w, h);
  }

  render() {
    this.composer.render();
  }

  dispose() {
    this.composer.dispose();
  }
}
