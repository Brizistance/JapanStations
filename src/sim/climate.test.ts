import { describe, expect, it } from 'vitest';
import { WEATHERS, dayOfMonth, dayRange, declOf, doyOf, monthOf, seasonOf, temperatureAt, weatherOn, type Weather } from './climate';

const H = 3600;
const WET: Weather[] = ['drizzle', 'rain', 'downpour', 'typhoon', 'snow'];

/** Share of each weather in `month` over many years. */
function shares(month: number) {
  const n: Partial<Record<Weather, number>> = {};
  let total = 0;
  for (let year = 0; year < 200; year++) {
    for (let d = doyOf(month, 1); monthOf(d) === month && d <= 365; d++) {
      const w = weatherOn(d, year);
      n[w] = (n[w] ?? 0) + 1;
      total++;
    }
  }
  const share = (ws: Weather[]) => ws.reduce((s, w) => s + (n[w] ?? 0), 0) / total;
  return { n, share };
}

describe('calendar', () => {
  it('maps days of the year to months and back', () => {
    expect([monthOf(1), dayOfMonth(1)]).toEqual([1, 1]);
    expect([monthOf(59), dayOfMonth(59)]).toEqual([2, 28]);
    expect([monthOf(60), dayOfMonth(60)]).toEqual([3, 1]);
    expect([monthOf(365), dayOfMonth(365)]).toEqual([12, 31]);
    expect(monthOf(366)).toBe(1);
    expect(doyOf(2, 31)).toBe(59);
    for (let d = 1; d <= 365; d++) expect(doyOf(monthOf(d), dayOfMonth(d))).toBe(d);
  });

  it('knows the seasons and the sun', () => {
    expect([1, 4, 7, 10].map(seasonOf)).toEqual(['winter', 'spring', 'summer', 'autumn']);
    expect(declOf(doyOf(6, 21))).toBeGreaterThan(0.4);
    expect(declOf(doyOf(12, 21))).toBeLessThan(-0.4);
    expect(Math.abs(declOf(doyOf(3, 21)))).toBeLessThan(0.03);
  });
});

describe('weatherOn', () => {
  it('gives the same weather for the same date', () => {
    for (let d = 1; d <= 365; d += 7) expect(weatherOn(d, 3)).toBe(weatherOn(d, 3));
    expect(WEATHERS).toContain(weatherOn(100, 1));
  });

  it('differs from year to year', () => {
    const years = new Set(Array.from({ length: 30 }, (_, y) => weatherOn(doyOf(6, 15), y)));
    expect(years.size).toBeGreaterThan(2);
  });

  it('follows an Osaka-like year', () => {
    const wet = Array.from({ length: 12 }, (_, i) => shares(i + 1).share(WET));
    expect(wet.indexOf(Math.max(...wet))).toBe(5); // June
    expect(wet[0]).toBeLessThan(wet[5] * 0.5);
    expect(shares(1).share(['clear'])).toBeGreaterThan(shares(6).share(['clear']) * 2);
    expect(shares(8).share(['haze'])).toBeGreaterThan(0.2);
    for (let m = 1; m <= 12; m++) {
      const s = shares(m);
      if (m > 2 && m < 12) expect(s.n.snow ?? 0).toBe(0);
      if (m < 7 || m > 10) expect(s.n.typhoon ?? 0).toBe(0);
    }
    expect(shares(9).n.typhoon ?? 0).toBeGreaterThan(0);
  });
});

describe('temperatureAt', () => {
  it('is cold in January and hot in August', () => {
    const jan = dayRange(doyOf(1, 15), 'clear'), aug = dayRange(doyOf(8, 15), 'clear');
    expect(jan.high).toBeLessThan(16);
    expect(jan.low).toBeGreaterThan(-4);
    expect(aug.high).toBeGreaterThan(30);
    expect(aug.high).toBeLessThan(40);
    expect(aug.low).toBeGreaterThan(21);
  });

  it('peaks in the afternoon and bottoms out before sunrise', () => {
    const d = doyOf(4, 10);
    const at = (h: number) => temperatureAt(h * H, d, 'clear');
    expect(at(14)).toBeGreaterThan(at(9));
    expect(at(14)).toBeGreaterThan(at(20));
    expect(at(5.5)).toBeLessThan(at(1));
    expect(at(5.5)).toBeLessThan(at(8));
  });

  it('has no jump at midnight or at the turn of a month or year', () => {
    for (const d of [10, 31, 59, 181, 365]) {
      const before = temperatureAt(24 * H - 1, d, 'cloudy', 4);
      const after = temperatureAt(0, d + 1, 'cloudy', d === 365 ? 5 : 4);
      expect(Math.abs(after - before)).toBeLessThan(0.5);
    }
  });

  it('is cooler in rain than in sun', () => {
    const d = doyOf(7, 20);
    expect(temperatureAt(14 * H, d, 'rain')).toBeLessThan(temperatureAt(14 * H, d, 'clear') - 2);
    expect(temperatureAt(14 * H, d, 'haze')).toBeGreaterThan(temperatureAt(14 * H, d, 'clear'));
  });
});
