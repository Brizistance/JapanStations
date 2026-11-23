// Kawaminato's climate: an invented city with normals modelled on Osaka's. Hot humid summers,
// a rainy season in June, typhoon risk in September, mild dry sunny winters with rare snow.
// Pure numbers: the calendar, each day's weather, and the outdoor temperature at any moment.
// Everything that shows weather or temperature reads it from here, so every surface agrees.

export type Weather = 'clear' | 'cloudy' | 'overcast' | 'drizzle' | 'rain' | 'downpour' | 'haze' | 'typhoon' | 'snow' | 'fog';
export const WEATHERS: Weather[] = ['clear', 'cloudy', 'overcast', 'drizzle', 'rain', 'downpour', 'haze', 'typhoon', 'snow', 'fog'];
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

interface MonthClimate {
  /** Mean daily high and low, °C. */
  high: number;
  low: number;
  /** Relative odds of each weather on a day of this month. */
  odds: Partial<Record<Weather, number>>;
}

export const MONTHS: MonthClimate[] = [
  { high: 9.7, low: 3.0, odds: { clear: 46, cloudy: 30, overcast: 12, drizzle: 5, rain: 3, snow: 3, fog: 1 } },
  { high: 10.5, low: 3.2, odds: { clear: 42, cloudy: 30, overcast: 13, drizzle: 6, rain: 5, snow: 3, fog: 1 } },
  { high: 14.2, low: 6.0, odds: { clear: 36, cloudy: 30, overcast: 14, drizzle: 8, rain: 10, fog: 2 } },
  { high: 19.9, low: 10.9, odds: { clear: 36, cloudy: 30, overcast: 13, drizzle: 7, rain: 11, downpour: 1, fog: 2 } },
  { high: 24.9, low: 16.0, odds: { clear: 36, cloudy: 29, overcast: 13, drizzle: 6, rain: 12, downpour: 2, haze: 2 } },
  { high: 28.0, low: 20.3, odds: { clear: 14, cloudy: 22, overcast: 22, drizzle: 14, rain: 18, downpour: 6, haze: 4 } },
  { high: 31.8, low: 24.6, odds: { clear: 22, cloudy: 22, overcast: 10, drizzle: 4, rain: 10, downpour: 7, haze: 24, typhoon: 1 } },
  { high: 33.7, low: 25.8, odds: { clear: 28, cloudy: 20, overcast: 6, drizzle: 2, rain: 6, downpour: 6, haze: 30, typhoon: 2 } },
  { high: 29.5, low: 21.9, odds: { clear: 26, cloudy: 26, overcast: 14, drizzle: 6, rain: 12, downpour: 6, haze: 6, typhoon: 4 } },
  { high: 23.7, low: 16.0, odds: { clear: 36, cloudy: 28, overcast: 14, drizzle: 6, rain: 11, downpour: 2, typhoon: 1, fog: 2 } },
  { high: 17.8, low: 10.2, odds: { clear: 42, cloudy: 30, overcast: 13, drizzle: 6, rain: 7, fog: 2 } },
  { high: 12.3, low: 5.3, odds: { clear: 46, cloudy: 30, overcast: 13, drizzle: 5, rain: 4, snow: 1, fog: 1 } },
];

/** How each weather moves the day's high and low, °C. */
const SHIFT: Record<Weather, [number, number]> = {
  clear: [1, -1], cloudy: [0, 0], overcast: [-2, 1], drizzle: [-3, 0.5], rain: [-3.5, 0], downpour: [-4, 0],
  haze: [2, 1.5], typhoon: [-4, 0], snow: [-5, -2], fog: [-1.5, 0],
};

// The calendar: a 365-day year, days counted 1…365.
export const YEAR_DAYS = 365;
const DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const START = DAYS.reduce<number[]>((a, d, i) => (a.push(i ? a[i - 1] + DAYS[i - 1] : 0), a), []);
const DAY_S = 86400;

export const wrapDoy = (doy: number) => ((((Math.floor(doy) - 1) % YEAR_DAYS) + YEAR_DAYS) % YEAR_DAYS) + 1;
/** Month 1…12 of day-of-year `doy`. */
export function monthOf(doy: number): number {
  const d = wrapDoy(doy) - 1;
  let m = 11;
  while (START[m] > d) m--;
  return m + 1;
}
export const dayOfMonth = (doy: number) => wrapDoy(doy) - START[monthOf(doy) - 1];
export const daysIn = (month: number) => DAYS[month - 1];
export const doyOf = (month: number, day: number) => START[month - 1] + Math.min(Math.max(1, day), DAYS[month - 1]);

export function seasonOf(month: number): Season {
  return month >= 3 && month <= 5 ? 'spring' : month >= 6 && month <= 8 ? 'summer' : month >= 9 && month <= 11 ? 'autumn' : 'winter';
}

/** The sun's declination on `doy`, radians: what makes June days long and December days short. */
export const declOf = (doy: number) => -0.4091 * Math.cos((2 * Math.PI * (wrapDoy(doy) + 10)) / YEAR_DAYS);

/** A fixed pseudo-random number 0…1 for a day. */
function roll(year: number, doy: number, salt: number): number {
  let h = (Math.imul(year | 0, 0x9e3779b1) ^ Math.imul(wrapDoy(doy), 0x85ebca6b) ^ Math.imul(salt, 0xc2b2ae35)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** The weather of day `doy` of year `year`: always the same for the same date. */
export function weatherOn(doy: number, year = 0): Weather {
  const odds = MONTHS[monthOf(doy) - 1].odds;
  let total = 0;
  for (const w of WEATHERS) total += odds[w] ?? 0;
  let r = roll(year, doy, 1) * total;
  for (const w of WEATHERS) {
    r -= odds[w] ?? 0;
    if (r < 0) return w;
  }
  return 'cloudy';
}

/** The normal high and low on `doy`, eased between mid-month values so no month starts with a jump. */
function normals(doy: number): [number, number] {
  const d = wrapDoy(doy), m = monthOf(d) - 1;
  const mid = START[m] + DAYS[m] / 2;
  const o = d - 0.5 < mid ? (m + 11) % 12 : (m + 1) % 12;
  const span = (DAYS[m] + DAYS[o]) / 2;
  const k = Math.abs(d - 0.5 - mid) / span;
  return [MONTHS[m].high + (MONTHS[o].high - MONTHS[m].high) * k, MONTHS[m].low + (MONTHS[o].low - MONTHS[m].low) * k];
}

const LOW_H = 5.5, HIGH_H = 14;
/** 0 at the coldest hour (before sunrise) … 1 at the warmest (early afternoon). */
function dayCurve(hours: number): number {
  const t = hours < LOW_H ? hours + 24 : hours;
  return t <= HIGH_H ? 0.5 - 0.5 * Math.cos((Math.PI * (t - LOW_H)) / (HIGH_H - LOW_H)) : 0.5 + 0.5 * Math.cos((Math.PI * (t - HIGH_H)) / (24 + LOW_H - HIGH_H));
}

/** Outdoor temperature in °C at clock time `timeS` (seconds; any day) on `doy` in `weather`. */
export function temperatureAt(timeS: number, doy: number, weather: Weather, year = 0): number {
  const t = ((timeS % DAY_S) + DAY_S) % DAY_S;
  const [hi, lo] = normals(doy), [dh, dl] = SHIFT[weather];
  // Some days run warm, some cool; eased through the day so midnight is seamless.
  const a = roll(year, doy, 2), b = roll(wrapDoy(doy + 1) === 1 ? year + 1 : year, doy + 1, 2);
  const off = ((a + (b - a) * (t / DAY_S)) - 0.5) * 5;
  return lo + dl + (hi + dh - lo - dl) * dayCurve(t / 3600) + off;
}

/**
 * How far a typhoon has come at clock time `timeS`, 0 … 1: it builds through the morning, is at
 * full strength from late morning to mid-afternoon, and has passed by evening. 0 in other weather.
 */
export function stormAt(timeS: number, weather: Weather): number {
  if (weather !== 'typhoon') return 0;
  const h = (((timeS % DAY_S) + DAY_S) % DAY_S) / 3600;
  const ease = (a: number, b: number) => {
    const t = Math.min(1, Math.max(0, (h - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  return ease(2, 11.5) * (1 - ease(15.5, 19.5));
}
/** The hour a typhoon starts to ease: before it the sky is closing in, after it clearing. */
export const STORM_TURN_H = 15.5;

/** The date and weather in force. The store keeps it current; signs and the HUD read it. */
export const today = { doy: 202, year: 1, weather: 'clear' as Weather };
/** The outdoor temperature right now, whole °C: the one figure every display shows. */
export const temperatureNow = (timeS: number) => Math.round(temperatureAt(timeS, today.doy, today.weather, today.year));

/** The day's expected high and low, whole °C. */
export function dayRange(doy: number, weather: Weather, year = 0): { high: number; low: number } {
  return { high: Math.round(temperatureAt(HIGH_H * 3600, doy, weather, year)), low: Math.round(temperatureAt(LOW_H * 3600, doy, weather, year)) };
}
