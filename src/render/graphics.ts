// Graphics settings: three presets plus per-effect switches. Pure data, no three.js, so the
// rules (preset → effects, a hand toggle → "custom", loading old saves) are unit-tested.
// See Plans/features/graphics-effects/plan.md.

export type Preset = 'low' | 'high' | 'ultra';

export interface Fx {
  /** Sun shadows above ground. */
  shadows: boolean;
  /** Ambient occlusion (contact darkening). */
  ao: boolean;
  /** Glow around lights. */
  bloom: boolean;
  /** Screen-space reflections on polished floors. */
  ssr: boolean;
  /** Colour grading (underground / outdoor / per-line tint). */
  grade: boolean;
  vignette: boolean;
  grain: boolean;
  /** Chromatic aberration near the frame edges. */
  chroma: boolean;
  /** Smudges on the lens lit by bright lights (needs bloom). */
  lensDirt: boolean;
  /** Extra detail: 2× shadow map, more AO samples, longer reflection rays. */
  hq: boolean;
  /** Highest device pixel ratio rendered. */
  scale: 1 | 1.5 | 2;
}

export type FxSwitch = Exclude<keyof Fx, 'scale'>;

export interface Graphics {
  preset: Preset | 'custom';
  fx: Fx;
}

export const PRESETS: Record<Preset, Fx> = {
  low: { shadows: false, ao: false, bloom: false, ssr: false, grade: false, vignette: false, grain: false, chroma: false, lensDirt: false, hq: false, scale: 1 },
  high: { shadows: true, ao: true, bloom: true, ssr: false, grade: true, vignette: true, grain: true, chroma: false, lensDirt: false, hq: false, scale: 1.5 },
  ultra: { shadows: true, ao: true, bloom: true, ssr: true, grade: true, vignette: true, grain: true, chroma: true, lensDirt: true, hq: true, scale: 2 },
};

export const PRESET_ORDER: Preset[] = ['low', 'high', 'ultra'];
export const SWITCHES: FxSwitch[] = ['shadows', 'ao', 'bloom', 'ssr', 'grade', 'vignette', 'grain', 'chroma', 'lensDirt', 'hq'];
const SCALES: Fx['scale'][] = [1, 1.5, 2];

export const DEFAULT_GRAPHICS: Graphics = { preset: 'high', fx: { ...PRESETS.high } };

export function fromPreset(p: Preset): Graphics {
  return { preset: p, fx: { ...PRESETS[p] } };
}

/** The preset these effects match exactly, or 'custom'. */
export function presetOf(fx: Fx): Preset | 'custom' {
  for (const p of PRESET_ORDER) {
    const ref = PRESETS[p];
    if (SWITCHES.every((k) => ref[k] === fx[k]) && ref.scale === fx.scale) return p;
  }
  return 'custom';
}

export function withFx(g: Graphics, patch: Partial<Fx>): Graphics {
  const fx = { ...g.fx, ...patch };
  return { preset: presetOf(fx), fx };
}

/** True if any effect needs the post-processing chain (otherwise the scene renders straight to screen). */
export function needsPost(fx: Fx): boolean {
  return fx.ao || fx.bloom || fx.ssr || fx.grade || fx.vignette || fx.grain || fx.chroma || (fx.lensDirt && fx.bloom);
}

export const GRAPHICS_KEY = 'kawaminato.graphics';
/** The old High/Low setting, read once to migrate. */
export const OLD_QUALITY_KEY = 'kawaminato.quality';

interface KV {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}

export function loadGraphics(store: KV | null): Graphics {
  if (!store) return fromPreset('high');
  try {
    const raw = store.getItem(GRAPHICS_KEY);
    if (raw) {
      const v = JSON.parse(raw) as { fx?: Partial<Fx> };
      const fx: Fx = { ...PRESETS.high };
      for (const k of SWITCHES) if (typeof v.fx?.[k] === 'boolean') fx[k] = v.fx[k] as boolean;
      if (SCALES.includes(v.fx?.scale as Fx['scale'])) fx.scale = v.fx!.scale as Fx['scale'];
      return { preset: presetOf(fx), fx };
    }
    const old = store.getItem(OLD_QUALITY_KEY);
    if (old === 'low') return fromPreset('low');
  } catch {
    /* unreadable or blocked storage: defaults */
  }
  return fromPreset('high');
}

export function saveGraphics(store: KV | null, g: Graphics) {
  try {
    store?.setItem(GRAPHICS_KEY, JSON.stringify({ fx: g.fx }));
  } catch {
    /* private mode: the choice just will not persist */
  }
}
