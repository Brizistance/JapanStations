// Weather names and pictograms, shared by the menus, the HUD and the drawn signs.
// Each icon is one stroked path in a 24 × 24 box, usable as an SVG `d` and as a canvas Path2D.

import { STORM_TURN_H, stormAt, today, type Weather } from '../sim/climate';

export const WEATHER_NAME: Record<Weather, [string, string]> = {
  clear: ['晴れ', 'Clear'],
  cloudy: ['くもり', 'Cloudy'],
  overcast: ['曇天', 'Overcast'],
  drizzle: ['霧雨', 'Drizzle'],
  rain: ['雨', 'Rain'],
  downpour: ['豪雨', 'Downpour'],
  haze: ['猛暑', 'Haze'],
  typhoon: ['台風', 'Typhoon'],
  snow: ['雪', 'Snow'],
  fog: ['霧', 'Fog'],
};

/**
 * The typhoon notice in force at clock time `timeS`, as [Japanese, English], or nothing. It says
 * only what is true: the storm is coming or going, and the trains run to the timetable.
 */
export function typhoonNotice(timeS: number): [string, string] | [] {
  if (stormAt(timeS, today.weather) < 0.1) return [];
  const h = (((timeS % 86400) + 86400) % 86400) / 3600;
  return h < STORM_TURN_H
    ? ['台風が接近しています。強風と大雨にご注意ください。電車は平常どおり運転しています。', 'A typhoon is approaching. Please take care in strong wind and heavy rain. Trains are running normally.']
    : ['台風は遠ざかっています。引き続き強風にご注意ください。電車は平常どおり運転しています。', 'The typhoon is moving away. Please continue to take care in strong wind. Trains are running normally.'];
}

const CLOUD = 'M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 9.5 4.3 4.3 0 0 0 7 18z';
const CLOUD_UP = 'M7 14h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 5.5 4.3 4.3 0 0 0 7 14z';
const SUN = 'M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1l2.1-2.1M17 7l2.1-2.1';
const MOON = 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z';

const ICON: Record<Weather, string> = {
  clear: SUN,
  cloudy: `M7.5 7a4 4 0 0 1 7.6-1M11 .8v1.6M5.2 2.8l1.2 1.2M16.8 2.8l-1.2 1.2M7 21h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 12.5 4.3 4.3 0 0 0 7 21z`,
  overcast: `${CLOUD}M10.5 5.6A5 5 0 0 1 19 7.2a3.6 3.6 0 0 1 3 3.6`,
  drizzle: `${CLOUD_UP}M8 17.5v1M12 19.5v1M16 17.5v1`,
  rain: `${CLOUD_UP}M8 17l-1 3.5M12 17l-1 3.5M16 17l-1 3.5`,
  downpour: `${CLOUD_UP}M7 16.5l-2 6M11 16.5l-2 6M15 16.5l-2 6M19 16.5l-2 6`,
  haze: 'M12 5a3.5 3.5 0 1 0 0 7a3.5 3.5 0 1 0 0-7M12 1v2M5.5 8.5h-2M20.5 8.5h-2M6.7 3.2l1.4 1.4M17.3 3.2l-1.4 1.4M4 16.5h16M6.5 20.5h11',
  typhoon: 'M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6M12 9c0-4.5 4-6.5 8.5-5M12 15c0 4.5-4 6.5-8.5 5',
  snow: 'M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 3.8l2.5 2 2.5-2M9.5 20.2l2.5-2 2.5 2',
  fog: 'M4 7h16M4 11.5h16M4 16h16M7 20.5h10',
};

/** The icon path for `weather` at clock time `timeS`: a clear night shows the moon. */
export function weatherIcon(weather: Weather, timeS: number): string {
  const h = (((timeS % 86400) + 86400) % 86400) / 3600;
  return weather === 'clear' && (h < 5 || h >= 19) ? MOON : ICON[weather];
}

/** Stroke the icon with its top-left corner at (x, y), `size` pixels square. */
export function drawWeatherIcon(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, weather: Weather, timeS: number, x: number, y: number, size: number, color: string) {
  if (typeof Path2D === 'undefined') return; // no canvas paths outside a browser (tests)
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 24, size / 24);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.9;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke(new Path2D(weatherIcon(weather, timeS)));
  ctx.restore();
}
