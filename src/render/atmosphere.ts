// What the sky is doing at a given clock time and weather: where the sun and moon are, how
// strong and what colour the key light is, the fog, the cloud cover, how wet the ground is.
// Pure numbers, no three.js: lighting.ts, weather.ts and Scene.tsx turn them into pictures.
//
// World axes: +x east, +y up, +z south. The sun follows one fixed day (a spring day at
// Kawaminato's latitude: up a little before 06:00, down a little after 18:00); no calendar.

export type Weather = 'clear' | 'cloudy' | 'overcast' | 'rain' | 'fog';
export const WEATHERS: Weather[] = ['clear', 'cloudy', 'overcast', 'rain', 'fog'];

export type V3 = [number, number, number];

export interface Atmosphere {
  /** Unit vectors towards the sun and the moon. */
  sun: V3;
  moon: V3;
  /** The key light: the sun by day, the moon once the sun is down. */
  light: V3;
  /** Linear colour of the key light. */
  lightColor: V3;
  lightPower: number;
  /** True while the key light is the sun. */
  sunLit: boolean;
  /** 0 at night … 1 in full daylight. */
  day: number;
  /** 1 around sunrise and sunset. */
  dusk: number;
  /** 0 by day … 1 when street and window lights are fully on. */
  night: number;
  /** Cloud cover, 0…1. */
  cover: number;
  /** How much direct sun gets through the weather, 0…1. */
  direct: number;
  /** Distance fog; also the colour of the sky at the horizon. */
  fogColor: V3;
  fogNear: number;
  fogFar: number;
  /** Sunlit and shaded cloud colours. */
  cloudLit: V3;
  cloudDark: V3;
  /** Wet ground, 0…1. */
  wet: number;
  /** Falling rain, 0…1. */
  rain: number;
}

interface WeatherLook {
  cover: number;
  direct: number;
  /** How far the fog colour is pulled to grey, and how bright that grey is. */
  grey: number;
  greyLevel: number;
  fogNear: number;
  fogFar: number;
  /** How dark the cloud bases are. */
  heavy: number;
  wet: number;
  rain: number;
}

const LOOKS: Record<Weather, WeatherLook> = {
  clear: { cover: 0.16, direct: 1, grey: 0, greyLevel: 1, fogNear: 300, fogFar: 1700, heavy: 0.15, wet: 0, rain: 0 },
  cloudy: { cover: 0.56, direct: 0.72, grey: 0.3, greyLevel: 0.98, fogNear: 300, fogFar: 1600, heavy: 0.35, wet: 0, rain: 0 },
  overcast: { cover: 1, direct: 0.1, grey: 0.85, greyLevel: 0.82, fogNear: 220, fogFar: 1300, heavy: 0.55, wet: 0, rain: 0 },
  rain: { cover: 1, direct: 0.04, grey: 0.92, greyLevel: 0.56, fogNear: 50, fogFar: 620, heavy: 0.85, wet: 1, rain: 1 },
  fog: { cover: 0.7, direct: 0.22, grey: 0.85, greyLevel: 0.95, fogNear: 3, fogFar: 170, heavy: 0.3, wet: 0.25, rain: 0 },
};

const LAT = (34.7 * Math.PI) / 180;
const DECL = (6 * Math.PI) / 180;
const DAY_S = 86400;

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const mix3 = (a: V3, b: V3, k: number, out: V3): V3 => {
  out[0] = a[0] + (b[0] - a[0]) * k;
  out[1] = a[1] + (b[1] - a[1]) * k;
  out[2] = a[2] + (b[2] - a[2]) * k;
  return out;
};

/** Unit vector to a body at hour angle `h` (0 = due south, negative before) and declination `decl`. */
function body(h: number, decl: number, out: V3): V3 {
  const cd = Math.cos(decl), sd = Math.sin(decl), cl = Math.cos(LAT), sl = Math.sin(LAT);
  out[0] = -cd * Math.sin(h);
  out[1] = sl * sd + cl * cd * Math.cos(h);
  out[2] = sl * cd * Math.cos(h) - cl * sd;
  return out;
}

const FOG_DAY: V3 = [0.66, 0.78, 0.9], FOG_DUSK: V3 = [0.8, 0.5, 0.34], FOG_NIGHT: V3 = [0.02, 0.026, 0.045];
const SUN_HIGH: V3 = [1, 0.88, 0.72], SUN_LOW: V3 = [1, 0.36, 0.1], MOON: V3 = [0.5, 0.62, 1];
const SUN_POWER = 2.6, MOON_POWER = 0.2;

export function newAtmosphere(): Atmosphere {
  return {
    sun: [0, 1, 0], moon: [0, -1, 0], light: [0, 1, 0], lightColor: [1, 1, 1], lightPower: 0, sunLit: true,
    day: 1, dusk: 0, night: 0, cover: 0, direct: 1, fogColor: [0, 0, 0], fogNear: 300, fogFar: 1700,
    cloudLit: [1, 1, 1], cloudDark: [0.5, 0.5, 0.5], wet: 0, rain: 0,
  };
}

/** Fill `out` for clock time `timeS` (seconds; any day) and `weather`. */
export function atmosphereAt(timeS: number, weather: Weather, out: Atmosphere = newAtmosphere()): Atmosphere {
  const w = LOOKS[weather];
  const t = ((timeS % DAY_S) + DAY_S) % DAY_S;
  const h = (t / DAY_S - 0.5) * Math.PI * 2;
  body(h, DECL, out.sun);
  // A near-full moon: roughly opposite the sun, so it is up for most of the night.
  body(h + 2.95, -DECL - 0.1, out.moon);

  const alt = out.sun[1];
  out.day = smooth(-0.05, 0.3, alt);
  out.dusk = smooth(-0.2, 0, alt) * (1 - smooth(0.05, 0.4, alt));
  out.night = 1 - smooth(-0.12, 0.08, alt);
  out.cover = w.cover;
  out.direct = w.direct;
  out.wet = w.wet;
  out.rain = w.rain;

  // Key light. The sun fades to nothing just below the horizon before the moon takes over,
  // so the direction never jumps while the light is on.
  out.sunLit = alt > -0.04;
  if (out.sunLit) {
    out.light[0] = out.sun[0]; out.light[1] = out.sun[1]; out.light[2] = out.sun[2];
    mix3(SUN_LOW, SUN_HIGH, smooth(0, 0.4, alt), out.lightColor);
    out.lightPower = SUN_POWER * smooth(-0.02, 0.22, alt) * w.direct;
  } else {
    out.light[0] = out.moon[0]; out.light[1] = out.moon[1]; out.light[2] = out.moon[2];
    mix3(MOON, MOON, 0, out.lightColor);
    out.lightPower = MOON_POWER * smooth(0.02, 0.25, out.moon[1]) * (1 - smooth(-0.16, -0.06, alt)) * (0.25 + 0.75 * w.direct);
  }
  // Clouds scatter the colour out of the light.
  const lc = out.lightColor, lum = 0.3 * lc[0] + 0.6 * lc[1] + 0.1 * lc[2], wash = (1 - w.direct) * 0.7;
  lc[0] += (lum - lc[0]) * wash; lc[1] += (lum - lc[1]) * wash; lc[2] += (lum - lc[2]) * wash;

  // Fog and horizon.
  const f = mix3(FOG_NIGHT, FOG_DAY, out.day, out.fogColor);
  mix3(f, FOG_DUSK, out.dusk * 0.6 * (0.35 + 0.65 * w.direct), f);
  const g = (0.3 * f[0] + 0.6 * f[1] + 0.1 * f[2]) * w.greyLevel;
  f[0] += (g * 0.94 - f[0]) * w.grey; f[1] += (g * 0.97 - f[1]) * w.grey; f[2] += (g * 1.02 - f[2]) * w.grey;
  out.fogNear = w.fogNear;
  out.fogFar = w.fogFar;

  // Clouds: shaded bases take the sky's colour, lit tops the key light's.
  const sunShare = out.sunLit ? out.lightPower / SUN_POWER : (out.lightPower / MOON_POWER) * 0.05;
  for (let i = 0; i < 3; i++) {
    out.cloudDark[i] = f[i] * (0.95 - 0.5 * w.heavy);
    out.cloudLit[i] = f[i] * (1.05 - 0.3 * w.heavy) + lc[i] * sunShare * 0.85;
  }
  return out;
}
