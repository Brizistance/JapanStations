import { describe, expect, it } from 'vitest';
import { WEATHERS, atmosphereAt, lightning } from './atmosphere';
import { declOf, doyOf } from '../sim/climate';

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

  it('has long days in June and short days in December', () => {
    const june = declOf(doyOf(6, 21)), dec = declOf(doyOf(12, 21));
    expect(atmosphereAt(18.5 * H, 'clear', undefined, june).sun[1]).toBeGreaterThan(0);
    expect(atmosphereAt(17.5 * H, 'clear', undefined, dec).sun[1]).toBeLessThan(0);
    expect(atmosphereAt(5.5 * H, 'clear', undefined, june).sun[1]).toBeGreaterThan(0);
    expect(atmosphereAt(6.5 * H, 'clear', undefined, dec).sun[1]).toBeLessThan(0);
    expect(atmosphereAt(12 * H, 'clear', undefined, june).sun[1]).toBeGreaterThan(atmosphereAt(12 * H, 'clear', undefined, dec).sun[1] + 0.3);
  });

  it('builds a typhoon through the day and clears after it', () => {
    const at = (h: number) => atmosphereAt(h * H, 'typhoon');
    expect(at(1).rain).toBe(0);
    expect(at(1).storm).toBe(0);
    expect(at(8).wind).toBeGreaterThan(at(5).wind);
    expect(at(14).storm).toBe(1);
    expect(at(14).rain).toBe(1);
    expect(at(17.5).wind).toBeLessThan(1);
    const after = at(20);
    expect(after.rain).toBe(0);
    expect(after.wind).toBe(0);
    expect(after.cover).toBeLessThan(0.3);
    expect(atmosphereAt(14 * H, 'rain').storm).toBe(0);
    for (let t = 0; t < 86400; t += 600) {
      const a = atmosphereAt(t, 'typhoon');
      expect(a.pulse).toBeGreaterThan(0.7);
      expect(a.pulse).toBeLessThan(1.3);
    }
  });

  it('strikes lightning only in a strong storm, in short flashes', () => {
    let lit = 0, peak = 0;
    for (let t = 0; t < 600; t += 0.02) {
      expect(lightning(t, 0.4)).toBe(0);
      const f = lightning(t, 1);
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThanOrEqual(1);
      if (f > 0.05) lit++;
      peak = Math.max(peak, f);
    }
    expect(peak).toBeGreaterThan(0.7);
    expect(lit * 0.02).toBeGreaterThan(2);
    expect(lit * 0.02).toBeLessThan(40);
  });

  it('dims the sun and closes in the fog by weather', () => {
    const clear = atmosphereAt(12 * H, 'clear');
    expect(atmosphereAt(12 * H, 'overcast').lightPower).toBeLessThan(clear.lightPower * 0.2);
    expect(atmosphereAt(12 * H, 'fog').fogFar).toBeLessThan(300);
    const rain = atmosphereAt(12 * H, 'rain');
    expect(rain.wet).toBe(1);
    expect(rain.rain).toBeGreaterThan(0.5);
    expect(atmosphereAt(12 * H, 'drizzle').rain).toBeLessThan(rain.rain);
    expect(atmosphereAt(12 * H, 'downpour').rain).toBe(1);
    expect(atmosphereAt(12 * H, 'typhoon').wind).toBe(1);
    expect(atmosphereAt(12 * H, 'snow').snow).toBe(1);
    expect(atmosphereAt(12 * H, 'snow').rain).toBe(0);
    expect(atmosphereAt(12 * H, 'haze').fogFar).toBeLessThan(clear.fogFar);
    expect(clear.rain).toBe(0);
    for (const w of WEATHERS) {
      const a = atmosphereAt(12 * H, w);
      expect(a.cover).toBeGreaterThanOrEqual(0);
      expect(a.cover).toBeLessThanOrEqual(1);
      for (const c of a.fogColor) expect(c).toBeGreaterThan(0);
    }
  });
});
