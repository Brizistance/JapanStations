import { describe, expect, it } from 'vitest';
import { GRAPHICS_KEY, OLD_QUALITY_KEY, PRESETS, fromPreset, loadGraphics, needsPost, presetOf, saveGraphics, withFx } from './graphics';

function mem(init: Record<string, string> = {}) {
  const m = new Map(Object.entries(init));
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
}

describe('graphics settings', () => {
  it('each preset is recognised as itself', () => {
    for (const p of ['low', 'high', 'ultra'] as const) expect(presetOf(PRESETS[p])).toBe(p);
  });

  it('a hand toggle turns the preset into custom, and toggling back restores it', () => {
    const g = withFx(fromPreset('high'), { chroma: true });
    expect(g.preset).toBe('custom');
    expect(withFx(g, { chroma: false }).preset).toBe('high');
  });

  it('low needs no post chain; any effect does', () => {
    expect(needsPost(PRESETS.low)).toBe(false);
    expect(needsPost({ ...PRESETS.low, vignette: true })).toBe(true);
    // Lens dirt is lit by bloom, so alone it does nothing.
    expect(needsPost({ ...PRESETS.low, lensDirt: true })).toBe(false);
  });

  it('migrates the old High/Low key', () => {
    expect(loadGraphics(mem({ [OLD_QUALITY_KEY]: 'low' })).preset).toBe('low');
    expect(loadGraphics(mem({ [OLD_QUALITY_KEY]: 'high' })).preset).toBe('high');
    expect(loadGraphics(mem()).preset).toBe('high');
    expect(loadGraphics(null).preset).toBe('high');
  });

  it('round-trips through storage and ignores junk', () => {
    const s = mem();
    const g = withFx(fromPreset('ultra'), { grain: false });
    saveGraphics(s, g);
    expect(loadGraphics(s)).toEqual(g);
    s.m.set(GRAPHICS_KEY, '{"fx":{"ssr":"yes","scale":7,"ao":false}}');
    const j = loadGraphics(s);
    expect(j.fx.ssr).toBe(PRESETS.high.ssr);
    expect(j.fx.scale).toBe(PRESETS.high.scale);
    expect(j.fx.ao).toBe(false);
    s.m.set(GRAPHICS_KEY, 'not json');
    expect(loadGraphics(s).preset).toBe('high');
  });
});
