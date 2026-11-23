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

/** How many outdoor night lights the shader takes at once (lamps.ts picks the nearest). */
export const LAMPS = 64;

/** Uniforms shared by every lit material. Assign `.value`; never replace the objects. */
export const shared = {
  envMapSky: { value: null as THREE.Texture | null },
  /** x = interior light level, y = sky light level, z = artificial light outdoors at night. */
  uEnvLevels: { value: new THREE.Vector3(0.5, 1.15, 0) },
  uMacro: { value: null as THREE.Texture | null },
  /** 0 by day … 1 at night: lit windows come on. */
  uNight: { value: 0 },
  /** Wet ground, 0…1. */
  uWet: { value: 0 },
  /** Top-down depth of what is overhead near the player (weather.ts), so shelter stays dry. */
  uRainMap: { value: null as THREE.Texture | null },
  /** Centre x, centre z, half size and top height of the area `uRainMap` covers; half size 0 = no map. */
  uRainBox: { value: new THREE.Vector4(0, 0, 0, 0) },
  /** How far the wind carries rain in under cover, as a world (x, z) offset in metres (weather.ts). */
  uBlow: { value: new THREE.Vector2(0, 0) },
  /** Outdoor night lights (lamps.ts): position and reach, colour, and how many are in use. */
  uLampPos: { value: Array.from({ length: LAMPS }, () => new THREE.Vector4(0, 0, 0, 1)) },
  uLampCol: { value: Array.from({ length: LAMPS }, () => new THREE.Vector3()) },
  uLampCount: { value: 0 },
  /** City light far from the camera, where no single lamp is drawn: strength, and the distances it fades in over. */
  uCity: { value: new THREE.Vector3(0, 70, 130) },
  /** Seconds, for flickering signs. */
  uClock: { value: 0 },
};

export interface LitOpts {
  glass?: boolean;
  /** Strength of the macro colour drift (0 = off). */
  macro?: number;
  /** Strength of the macro gloss drift. */
  macroRough?: number;
  /** Glows at night (lit windows): strength of the glow. */
  night?: number;
  /**
   * A sign lit from inside at night, outdoors only: its own colours times this. The texture's alpha
   * says how the sign is doing: 1 on, about 0.75 flickering, 0.5 switched off.
   */
  glow?: number;
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
  c = swap(c, '#ifdef USE_ENVMAP', '#ifdef USE_ENVMAP\n\tuniform samplerCube envMapSky;\n\tuniform vec3 uEnvLevels;', 'env uniforms');
  c = swap(
    c,
    'vec4 envMapColor = textureLod( envMap, envMapRotation * worldNormal, ENVMAP_MAX_LOD );',
    `vec3 envIn = textureLod( envMap, envMapRotation * worldNormal, ENVMAP_MAX_LOD ).rgb * ( uEnvLevels.x * ( 1.0 - vEnv.y ) );
			vec3 envSky = textureLod( envMapSky, worldNormal, ENVMAP_MAX_LOD ).rgb * uEnvLevels.y;
			vec4 envMapColor = vec4( mix( envIn, envSky, vEnv.x ) + envIn * ( vEnv.x * uEnvLevels.z ), 1.0 );`,
    'env irradiance',
  );
  c = swap(
    c,
    'vec4 envMapColor = textureLod( envMap, envMapRotation * reflectVec, roughnessToMip( roughness ) );',
    `vec3 envIn = textureLod( envMap, envMapRotation * reflectVec, roughnessToMip( roughness ) ).rgb * ( uEnvLevels.x * ( 1.0 - vEnv.y ) );
			vec3 envSky = textureLod( envMapSky, reflectVec, roughnessToMip( roughness ) ).rgb * uEnvLevels.y;
			vec3 envLamp = textureLod( envMap, envMapRotation * reflectVec, roughnessToMip( max( roughness, 0.55 ) ) ).rgb * ( uEnvLevels.x * ( 1.0 - vEnv.y ) );
			vec4 envMapColor = vec4( mix( envIn, envSky, vEnv.x ) + envLamp * ( vEnv.x * uEnvLevels.z ), 1.0 );`,
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

// Street lamps and other outdoor lights at night: no shadows, a soft wrap so walls facing
// away are not black, and a highlight on smooth (wet) ground.
const LAMP_CHUNK = `
	if ( uLampCount > 0 && vEnv.x > 0.01 ) {
		vec3 lampN = inverseTransformDirection( normal, viewMatrix );
		vec3 lampV = normalize( cameraPosition - vWPos );
		float gloss = 1.0 - material.roughness;
		float shine = mix( 8.0, 260.0, gloss * gloss );
		vec3 lampDiff = vec3( 0.0 ), lampSpec = vec3( 0.0 );
		for ( int i = 0; i < ${LAMPS}; i++ ) {
			if ( i >= uLampCount ) break;
			vec3 dl = uLampPos[ i ].xyz - vWPos;
			float d2 = dot( dl, dl ), r = uLampPos[ i ].w;
			float att = max( 1.0 - d2 / ( r * r ), 0.0 );
			if ( att <= 0.0 ) continue;
			att *= att;
			vec3 ld = dl * inversesqrt( max( d2, 1e-4 ) );
			lampDiff += uLampCol[ i ] * ( att * ( max( dot( lampN, ld ), 0.0 ) * 0.85 + 0.15 ) );
			lampSpec += uLampCol[ i ] * ( att * pow( max( dot( lampN, normalize( ld + lampV ) ), 0.0 ), shine ) );
		}
		reflectedLight.directDiffuse += lampDiff * material.diffuseColor * vEnv.x;
		reflectedLight.directSpecular += lampSpec * ( gloss * gloss * 1.6 * vEnv.x );
	}
	if ( uCity.x > 0.0 && vEnv.x > 0.01 ) {
		float cityFar = smoothstep( uCity.y, uCity.z, distance( cameraPosition, vWPos ) );
		float cityLow = ( 0.25 + 0.75 * exp( -max( vWPos.y, 0.0 ) * 0.04 ) );
		reflectedLight.directDiffuse += vec3( 1.0, 0.8, 0.56 ) * ( uCity.x * cityFar * cityLow * vEnv.x ) * material.diffuseColor;
	}
`;

// Rain: open, upward-facing surfaces darken and turn glossy, with puddles in the low spots.
const WET_CHUNK = `
	if ( uWet > 0.0 && vEnv.x > 0.02 ) {
		float open = 1.0;
		if ( uRainBox.z > 0.0 ) {
			vec2 ruv = vec2( vWPos.x - uRainBox.x, uRainBox.y - vWPos.z ) / ( 2.0 * uRainBox.z ) + 0.5;
			vec2 edge = min( ruv, 1.0 - ruv );
			float inside = smoothstep( 0.0, 0.06, min( edge.x, edge.y ) );
			float roofY = uRainBox.w - texture2D( uRainMap, ruv ).r * 120.0;
			open = mix( 1.0, smoothstep( roofY - 0.7, roofY - 0.3, vWPos.y ), inside );
			// Wind drives the rain in under canopies and down the first steps of a stairwell:
			// wet too wherever the ground upwind lies open at about this height.
			if ( dot( uBlow, uBlow ) > 0.0001 ) {
				vec2 buv = ruv - vec2( uBlow.x, -uBlow.y ) / ( 2.0 * uRainBox.z );
				float upY = uRainBox.w - texture2D( uRainMap, buv ).r * 120.0;
				float blown = smoothstep( upY - 1.2, upY - 0.4, vWPos.y ) * ( 1.0 - smoothstep( upY + 1.5, upY + 3.0, vWPos.y ) );
				open = max( open, 0.85 * blown * inside );
			}
		}
		vec3 viewUp = ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz;
		float up = dot( normal, viewUp );
		float w = uWet * vEnv.x * open;
		float film = w * ( 0.3 + 0.7 * smoothstep( 0.1, 0.8, up ) );
		float pud = w * smoothstep( 0.93, 0.99, up ) * smoothstep( 0.5, 0.68, texture2D( uMacro, vWPos.xz * 0.045 ).r * 0.7 + texture2D( uMacro, vWPos.zx * 0.21 ).g * 0.3 );
		diffuseColor.rgb *= 1.0 - 0.38 * film - 0.25 * pud;
		roughnessFactor = mix( roughnessFactor, min( roughnessFactor, 0.22 ), film * 0.8 );
		roughnessFactor = mix( roughnessFactor, 0.035, pud );
		normal = normalize( mix( normal, viewUp, pud * 0.9 ) );
	}
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
    shader.uniforms.uWet = shared.uWet;
    shader.uniforms.uRainMap = shared.uRainMap;
    shader.uniforms.uRainBox = shared.uRainBox;
    shader.uniforms.uBlow = shared.uBlow;
    shader.uniforms.uNight = shared.uNight;
    shader.uniforms.uLampPos = shared.uLampPos;
    shader.uniforms.uLampCol = shared.uLampCol;
    shader.uniforms.uLampCount = shared.uLampCount;
    shader.uniforms.uClock = shared.uClock;
    shader.uniforms.uCity = shared.uCity;

    let v = shader.vertexShader;
    v = swap(v, '#include <common>', '#include <common>\nattribute vec2 aEnv;\nuniform vec2 uEnvMod;\nvarying vec2 vEnv;\nvarying vec2 vUvM;\nvarying vec3 vWPos;', 'vertex pars');
    v = swap(
      v,
      '#include <project_vertex>',
      `vec4 wetPos = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		wetPos = batchingMatrix * wetPos;
	#endif
	#ifdef USE_INSTANCING
		wetPos = instanceMatrix * wetPos;
	#endif
	vWPos = ( modelMatrix * wetPos ).xyz;
	#include <project_vertex>`,
      'world position',
    );
    v = swap(v, '#include <begin_vertex>', '#include <begin_vertex>\n\tvEnv = clamp( aEnv + uEnvMod, 0.0, 1.0 );\n\tvUvM = uv;', 'vertex main');
    shader.vertexShader = v;

    let f = shader.fragmentShader;
    f = swap(f, '#include <common>', '#include <common>\nvarying vec2 vEnv;\nvarying vec2 vUvM;\nvarying vec3 vWPos;\nuniform sampler2D uMacro;\nuniform vec2 uMacroAmt;\nuniform float uWet;\nuniform float uNight;\nuniform sampler2D uRainMap;\nuniform vec4 uRainBox;\nuniform vec2 uBlow;\nuniform vec4 uLampPos[ ' + LAMPS + ' ];\nuniform vec3 uLampCol[ ' + LAMPS + ' ];\nuniform int uLampCount;\nuniform vec3 uCity;\nuniform float uClock;', 'fragment pars');
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
    f = swap(f, '#include <lights_physical_fragment>', `${WET_CHUNK}\t#include <lights_physical_fragment>`, 'wet');
    if (o.night) {
      f = swap(
        f,
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>\n\ttotalEmissiveRadiance += vec3( 1.0, 0.74, 0.42 ) * ( 0.55 + 0.45 * diffuseColor.rgb ) * ( uNight * ${o.night.toFixed(2)} );`,
        'night glow',
      );
    }
    if (o.glow) {
      f = swap(
        f,
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
	{
		float tick = floor( uClock * 9.0 );
		float flick = step( 0.3, fract( sin( tick * 91.7 ) * 43758.5 ) ) * ( 0.75 + 0.25 * fract( sin( tick * 17.3 ) * 9731.1 ) );
		float signOn = smoothstep( 0.55, 0.62, diffuseColor.a ) * mix( flick, 1.0, step( 0.9, diffuseColor.a ) );
		totalEmissiveRadiance += diffuseColor.rgb * ( uNight * vEnv.x * signOn * ${o.glow.toFixed(2)} );
	}`,
        'sign glow',
      );
    }
    f = swap(f, '#include <lights_fragment_begin>', `${LIGHTS_CHUNK}${o.glass ? '' : LAMP_CHUNK}`, 'lights');
    if (o.glass) f = swap(f, '#include <opaque_fragment>', `${GLASS_CHUNK}\t#include <opaque_fragment>`, 'glass');
    shader.fragmentShader = f;
  };
  m.customProgramCacheKey = () => `lit${o.glass ? '-glass' : ''}${o.night ? `-night${o.night}` : ''}${o.glow ? `-glow${o.glow}` : ''}`;
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
