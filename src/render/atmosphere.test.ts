import { describe, expect, it } from 'vitest';
import { WEATHERS, atmosphereAt } from './atmosphere';

const H = 3600;
const len = (v: number[]) => Math.hypot(v[0], v[1], v[2]);

describe('atmosphereAt', () => {
  it('puts the sun in the east in the morning, high in the south at noon, west in the evening', () => {
    expect(atmosphereAt(8 * H, 'clear').sun[0]).toBeGreaterThan(0.5);
    const noon = atmosphereAt(12 * H, 'clear');
    expect(noon.sun[1]).toBeGreaterThan(0.8);
    expect(noon.sun[2]).toBeGreaterThan(0);
    expect(Math.abs(noon.sun[0])).toBeLessThan(0.01);
    expect(atmosphereAt(16 * H, 'clear').sun[0]).toBeLessThan(-0.5);
  });

  it('has sunrise near 06:00 and sunset near 18:00', () => {
    expect(atmosphereAt(5 * H, 'clear').sun[1]).toBeLessThan(0);
    expect(atmosphereAt(6.5 * H, 'clear').sun[1]).toBeGreaterThan(0);
    expect(atmosphereAt(17.5 * H, 'clear').sun[1]).toBeGreaterThan(0);
    expect(atmosphereAt(19 * H, 'clear').sun[1]).toBeLessThan(0);
  });

  it('is day at noon and night at midnight, with the moon as the key light', () => {
    const noon = atmosphereAt(12 * H, 'clear'), mid = atmosphereAt(0, 'clear');
    expect(noon.day).toBe(1);
    expect(noon.night).toBe(0);
    expect(noon.sunLit).toBe(true);
    expect(mid.night).toBe(1);
    expect(mid.day).toBe(0);
    expect(mid.sunLit).toBe(false);
    expect(mid.light[1]).toBeGreaterThan(0.2);
    expect(mid.lightPower).toBeGreaterThan(0);
    expect(mid.lightPower).toBeLessThan(noon.lightPower * 0.15);
  });

  it('never switches the key light while it is on, and always returns unit vectors', () => {
    let prev = atmosphereAt(0, 'clear').sunLit;
    for (let t = 0; t <= 24 * H; t += 60) {
      const a = atmosphereAt(t, 'clear');
      expect(len(a.sun)).toBeCloseTo(1, 5);
      expect(len(a.moon)).toBeCloseTo(1, 5);
      if (a.sunLit !== prev) expect(a.lightPower).toBeLessThan(0.01);
      if (a.lightPower > 0.01) expect(a.light[1]).toBeGreaterThan(-0.02);
      prev = a.sunLit;
    }
  });

  it('keeps counting past midnight', () => {
    expect(atmosphereAt(36 * H, 'clear').sun).toEqual(atmosphereAt(12 * H, 'clear').sun);
  });

  it('dims the sun and closes in the fog by weather', () => {
    const clear = atmosphereAt(12 * H, 'clear');
    expect(atmosphereAt(12 * H, 'overcast').lightPower).toBeLessThan(clear.lightPower * 0.2);
    expect(atmosphereAt(12 * H, 'fog').fogFar).toBeLessThan(300);
    const rain = atmosphereAt(12 * H, 'rain');
    expect(rain.wet).toBe(1);
    expect(rain.rain).toBe(1);
    expect(clear.rain).toBe(0);
    for (const w of WEATHERS) {
      const a = atmosphereAt(12 * H, w);
      expect(a.cover).toBeGreaterThanOrEqual(0);
      expect(a.cover).toBeLessThanOrEqual(1);
      for (const c of a.fogColor) expect(c).toBeGreaterThan(0);
    }
  });
});
