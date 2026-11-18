// The lit material: MeshStandardMaterial with three additions patched into its shader.
//
// 1. Two environments. A per-vertex attribute `aEnv` = (sky, shade) says how much of a
//    surface is lit by daylight (sky environment + sun) and how much by the station's
//    own lighting (interior environment). Stairwells blend between the two; tunnels are
//    "interior, but shaded". Trains override it per car through `uEnvMod`.
// 2. Macro variation: a low-frequency texture in world metres that drifts colour and
//    gloss so tiled surfaces do not look stamped.
// 3. Glass: reflections stay visible on nearly transparent panes.

import * as THREE from 'three';

/** Uniforms shared by every lit material. Assign `.value`; never replace the objects. */
export const shared = {
  envMapSky: { value: null as THREE.Texture | null },
  /** x = interior light level, y = sky light level. */
  uEnvLevels: { value: new THREE.Vector2(0.5, 1.15) },
  uMacro: { value: null as THREE.Texture | null },
};

export interface LitOpts {
  glass?: boolean;
  /** Strength of the macro colour drift (0 = off). */
  macro?: number;
  /** Strength of the macro gloss drift. */
  macroRough?: number;
  /** Added to `aEnv`; one object per train car. */
  envMod?: { value: THREE.Vector2 };
}

const NO_MOD = { value: new THREE.Vector2(0, 0) };
const opts = new WeakMap<THREE.Material, LitOpts>();

function swap(src: string, find: string, put: string, what: string): string {
  if (!src.includes(find)) console.warn(`lit material: shader patch "${what}" did not apply (three.js changed?)`);
  return src.replace(find, put);
}

const ENV_CHUNK = (() => {
  let c = THREE.ShaderChunk.envmap_physical_pars_fragment;
  c = swap(c, '#ifdef USE_ENVMAP', '#ifdef USE_ENVMAP\n\tuniform samplerCube envMapSky;\n\tuniform vec2 uEnvLevels;', 'env uniforms');
  c = swap(
    c,
    'vec4 envMapColor = textureLod( envMap, envMapRotation * worldNormal, ENVMAP_MAX_LOD );',
    `vec3 envIn = textureLod( envMap, envMapRotation * worldNormal, ENVMAP_MAX_LOD ).rgb * ( uEnvLevels.x * ( 1.0 - vEnv.y ) );
			vec3 envSky = textureLod( envMapSky, worldNormal, ENVMAP_MAX_LOD ).rgb * uEnvLevels.y;
			vec4 envMapColor = vec4( mix( envIn, envSky, vEnv.x ), 1.0 );`,
    'env irradiance',
  );
  c = swap(
    c,
    'vec4 envMapColor = textureLod( envMap, envMapRotation * reflectVec, roughnessToMip( roughness ) );',
    `vec3 envIn = textureLod( envMap, envMapRotation * reflectVec, roughnessToMip( roughness ) ).rgb * ( uEnvLevels.x * ( 1.0 - vEnv.y ) );
			vec3 envSky = textureLod( envMapSky, reflectVec, roughnessToMip( roughness ) ).rgb * uEnvLevels.y;
			vec4 envMapColor = vec4( mix( envIn, envSky, vEnv.x ), 1.0 );`,
    'env radiance',
  );
  return c;
})();

const LIGHTS_CHUNK = (() => {
  let c = THREE.ShaderChunk.lights_fragment_begin;
  c = swap(
    c,
    'getDirectionalLightInfo( directionalLight, directLight );',
    'getDirectionalLightInfo( directionalLight, directLight );\n\t\tdirectLight.color *= vEnv.x;',
    'sun',
  );
  c = swap(
    c,
    'irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );',
    'irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal ) * vEnv.x;',
    'hemisphere',
  );
  return c;
})();

const GLASS_CHUNK = `
	diffuseColor.a = clamp( diffuseColor.a + dot( reflectedLight.indirectSpecular + reflectedLight.directSpecular, vec3( 0.4 ) ), 0.0, 1.0 );
`;

function patch(m: THREE.MeshStandardMaterial, o: LitOpts) {
  opts.set(m, o);
  const amt = new THREE.Vector2(o.macro ?? 0.16, o.macroRough ?? 0.2);
  m.onBeforeCompile = (shader) => {
    shader.uniforms.envMapSky = shared.envMapSky;
    shader.uniforms.uEnvLevels = shared.uEnvLevels;
    shader.uniforms.uMacro = shared.uMacro;
    shader.uniforms.uMacroAmt = { value: amt };
    shader.uniforms.uEnvMod = o.envMod ?? NO_MOD;

    let v = shader.vertexShader;
    v = swap(v, '#include <common>', '#include <common>\nattribute vec2 aEnv;\nuniform vec2 uEnvMod;\nvarying vec2 vEnv;\nvarying vec2 vUvM;', 'vertex pars');
    v = swap(v, '#include <begin_vertex>', '#include <begin_vertex>\n\tvEnv = clamp( aEnv + uEnvMod, 0.0, 1.0 );\n\tvUvM = uv;', 'vertex main');
    shader.vertexShader = v;

    let f = shader.fragmentShader;
    f = swap(f, '#include <common>', '#include <common>\nvarying vec2 vEnv;\nvarying vec2 vUvM;\nuniform sampler2D uMacro;\nuniform vec2 uMacroAmt;', 'fragment pars');
    f = swap(f, '#include <envmap_physical_pars_fragment>', ENV_CHUNK, 'env');
    f = swap(
      f,
      '#include <map_fragment>',
      `#include <map_fragment>
	vec2 macro = texture2D( uMacro, vUvM * 0.061 ).rg * 0.65 + texture2D( uMacro, vUvM * 0.33 + 0.37 ).gr * 0.35;
	diffuseColor.rgb *= 1.0 + ( macro.r - 0.55 ) * uMacroAmt.x;`,
      'macro colour',
    );
    f = swap(
      f,
      '#include <roughnessmap_fragment>',
      '#include <roughnessmap_fragment>\n\troughnessFactor = clamp( roughnessFactor + ( macro.g - 0.5 ) * uMacroAmt.y, 0.03, 1.0 );',
      'macro gloss',
    );
    f = swap(f, '#include <lights_fragment_begin>', LIGHTS_CHUNK, 'lights');
    if (o.glass) f = swap(f, '#include <opaque_fragment>', `${GLASS_CHUNK}\t#include <opaque_fragment>`, 'glass');
    shader.fragmentShader = f;
  };
  m.customProgramCacheKey = () => (o.glass ? 'lit-glass' : 'lit');
}

export function lit(params: THREE.MeshStandardMaterialParameters, o: LitOpts = {}): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial(params);
  patch(m, o);
  return m;
}

/** A copy of a lit material bound to its own `envMod` (non-lit materials are returned as they are). */
export function withEnvMod(m: THREE.Material, envMod: { value: THREE.Vector2 }): THREE.Material {
  const o = opts.get(m);
  if (!o) return m;
  const c = (m as THREE.MeshStandardMaterial).clone();
  patch(c, { ...o, envMod });
  return c;
}
