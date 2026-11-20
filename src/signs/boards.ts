// Printed boards on the platforms: the timetable, the line's strip map, the car position guide, and
// the women-only car notice. Every time and minute is read from the timetable (never invented).
import { LINES, linesAt, stationById } from '../data/network';
import type { LineDef, StationDef } from '../data/types';
import { clock, lineSim } from '../sim';
import { nextArrivals, nextDepartures } from '../sim/timetable';
type Dir = 'down' | 'up';
import type { SignContent } from './content';
import { platformTrains } from './departures';
import { lineBadge, text } from './draw';

type Ctx = CanvasRenderingContext2D;
const PINK = '#e85a9b', INK = '#1b1e22', PAPER = '#f7f5ee';
const lineOf = (id: string): LineDef => LINES.find((l) => l.id === id)!;
const hm = (s: number) => `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}`;
/** The last stop in a direction. */
const terminus = (line: LineDef, dir: Dir): StationDef => stationById(dir === 'down' ? line.stops[line.stops.length - 1] : line.stops[0]);

function header(ctx: Ctx, W: number, H: number, line: LineDef, ja: string, en: string): number {
  const hh = H * 0.15;
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = line.color;
  ctx.fillRect(0, 0, W, hh);
  lineBadge(ctx, hh * 0.62, hh / 2, hh * 0.36, line);
  text(ctx, ja, hh * 1.2, hh * 0.38, hh * 0.42, { color: '#fff', maxW: W - hh * 1.4 });
  text(ctx, en, hh * 1.2, hh * 0.78, hh * 0.22, { color: '#fff', weight: 500, maxW: W - hh * 1.4 });
  return hh;
}

/** Departures from one platform, hour by hour from 5 to 23, as the minutes past each hour. */
export function drawTimetable(ctx: Ctx, W: number, H: number, c: Extract<SignContent, { k: 'timetable' }>) {
  const line = lineOf(c.line), st = stationById(c.station), to = terminus(line, c.dir);
  const top = header(ctx, W, H, line, `${line.nameJa} ${to.nameJa}方面 時刻表`, `Timetable — for ${to.nameRomaji}`);
  const first = 5, last = 23, rows = last - first + 1;
  const all = platformTrains(line, st, c.dir, first * 3600, 1200).filter((d) => d.boarding && d.dep < (last + 1) * 3600);
  const rh = (H - top - H * 0.04) / rows, hw = W * 0.09;
  for (let r = 0; r < rows; r++) {
    const y = top + H * 0.02 + r * rh, hour = first + r;
    ctx.fillStyle = r % 2 ? '#ecebe3' : PAPER;
    ctx.fillRect(0, y, W, rh);
    ctx.fillStyle = line.color;
    ctx.fillRect(W * 0.02, y + rh * 0.08, hw, rh * 0.84);
    text(ctx, String(hour), W * 0.02 + hw / 2, y + rh / 2, rh * 0.62, { align: 'center', color: '#fff' });
    const mins = all.filter((d) => Math.floor(d.dep / 3600) === hour).map((d) => Math.floor((d.dep % 3600) / 60));
    const step = Math.min(W * 0.055, (W * 0.84) / Math.max(1, mins.length));
    mins.forEach((m, i) => text(ctx, String(m).padStart(2, '0'), W * 0.14 + i * step, y + rh / 2, rh * 0.56, { color: INK, weight: 600 }));
  }
}

/** Minutes from this station to each stop ahead, for the train that leaves next after 10:00. */
function minutesAhead(line: LineDef, from: number, dir: Dir): Map<number, number> {
  const { tt } = lineSim(line.id), out = new Map<number, number>();
  const d = nextDepartures(tt, from, dir, 10 * 3600, 1)[0];
  if (!d) return out;
  const sg = dir === 'down' ? 1 : -1;
  for (let j = from + sg; j >= 0 && j < line.stops.length; j += sg) {
    const hits = [...nextDepartures(tt, j, dir, d.dep, tt.trainCount + 2), ...nextArrivals(tt, j, dir, d.dep, tt.trainCount + 2)].filter((q) => q.train === d.train && q.arr > d.dep);
    if (hits.length) out.set(j, Math.round((Math.min(...hits.map((q) => q.arr)) - d.dep) / 60));
  }
  return out;
}

/** The line as a strip: every station in order, this one marked, minutes to those ahead, transfers. */
export function drawStrip(ctx: Ctx, W: number, H: number, c: Extract<SignContent, { k: 'strip' }>) {
  const line = lineOf(c.line), to = terminus(line, c.dir), here = line.stops.indexOf(c.station);
  const top = header(ctx, W, H, line, `${line.nameJa} 路線図`, `${to.nameRomaji} direction →`);
  const n = line.stops.length, mins = minutesAhead(line, here, c.dir);
  // Drawn so that trains on this platform run left to right.
  const order = c.dir === 'down' ? line.stops.map((_, i) => i) : line.stops.map((_, i) => n - 1 - i);
  const x0 = W * 0.06, x1 = W * 0.94, y = top + (H - top) * 0.36, r = Math.min(H * 0.045, (x1 - x0) / n / 2.6);
  ctx.strokeStyle = line.color;
  ctx.lineWidth = r * 0.9;
  ctx.beginPath();
  ctx.moveTo(x0, y);
  ctx.lineTo(x1, y);
  ctx.stroke();
  order.forEach((si, k) => {
    const x = x0 + ((x1 - x0) * k) / Math.max(1, n - 1), st = stationById(line.stops[si]), cur = si === here;
    ctx.fillStyle = cur ? '#d32f2f' : '#fff';
    ctx.strokeStyle = cur ? '#d32f2f' : line.color;
    ctx.lineWidth = r * 0.45;
    ctx.beginPath();
    ctx.arc(x, y, cur ? r * 1.35 : r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    const m = mins.get(si);
    if (m !== undefined) text(ctx, `${m}分`, x, y - r * 2.6, r * 1.5, { align: 'center', color: INK, weight: 600 });
    else if (cur) text(ctx, '当駅', x, y - r * 2.6, r * 1.5, { align: 'center', color: '#d32f2f' });
    // The name reads downwards, a character per line.
    const chars = [...st.nameJa].slice(0, 7), ch = Math.min(r * 2.0, ((H - y) * 0.72) / Math.max(4, chars.length));
    chars.forEach((s, i) => text(ctx, s === 'ー' ? '｜' : s, x, y + r * 2.4 + ch * (i + 0.5), ch * 0.92, { align: 'center', color: cur ? '#d32f2f' : INK, weight: cur ? 700 : 600 }));
    // Other lines here, as dots in their colours.
    const others = linesAt(st.id).filter((l) => l.id !== line.id);
    others.slice(0, 3).forEach((l, i) => {
      ctx.fillStyle = l.color;
      ctx.beginPath();
      ctx.arc(x + (i - (Math.min(3, others.length) - 1) / 2) * r * 1.3, H - r * 1.4, r * 0.55, 0, Math.PI * 2);
      ctx.fill();
    });
  });
}

/** The train, car by car, with the cars that stop by a stair at this station and the women-only car. */
export function drawCarGuide(ctx: Ctx, W: number, H: number, c: Extract<SignContent, { k: 'carguide' }>) {
  const line = lineOf(c.line), st = stationById(c.station), cars = line.service.cars, wo = line.service.womenOnly;
  const top = header(ctx, W, H, line, `${st.nameJa}駅 乗車位置案内`, 'Which car for the stairs');
  const x0 = W * 0.05, cw = (W * 0.9) / cars, y0 = top + (H - top) * 0.3, ch = (H - top) * 0.26;
  for (let k = 0; k < cars; k++) {
    const x = x0 + k * cw, women = wo?.car === k + 1;
    ctx.fillStyle = women ? PINK : '#d9dcdf';
    ctx.fillRect(x + cw * 0.04, y0, cw * 0.92, ch);
    ctx.fillStyle = line.color;
    ctx.fillRect(x + cw * 0.04, y0 + ch * 0.78, cw * 0.92, ch * 0.1);
    text(ctx, String(k + 1), x + cw / 2, y0 + ch * 0.42, ch * 0.5, { align: 'center', color: women ? '#fff' : INK });
    for (const d of [0.2, 0.5, 0.8]) {
      ctx.fillStyle = '#8f959c';
      ctx.fillRect(x + cw * d - cw * 0.04, y0 + ch * 0.9, cw * 0.08, ch * 0.1);
    }
    if (women) text(ctx, '女性専用車', x + cw / 2, y0 - ch * 0.22, ch * 0.24, { align: 'center', color: PINK, maxW: cw * 1.6 });
    if (c.stairs.includes(k + 1)) {
      const sy = y0 + ch * 1.25;
      ctx.fillStyle = '#14233b';
      ctx.fillRect(x + cw * 0.12, sy, cw * 0.76, ch * 0.62);
      text(ctx, '階段', x + cw / 2, sy + ch * 0.22, ch * 0.26, { align: 'center', color: '#fff', maxW: cw * 0.7 });
      text(ctx, 'Stairs', x + cw / 2, sy + ch * 0.46, ch * 0.16, { align: 'center', color: '#fff', weight: 500, maxW: cw * 0.7 });
    }
  }
}

/** Whether a line's women-only car rule is in force at sim time t (its hours, every day: the clock has no weekday). */
export function womenOnlyNow(line: LineDef, t: number): boolean {
  const w = line.service.womenOnly, s = ((t % 86400) + 86400) % 86400;
  return !!w && s >= w.fromS && s < w.toS;
}

/** The women-only car notice: its hours, and whether it is in force now (live). */
export function drawWomenOnly(ctx: Ctx, W: number, H: number, c: Extract<SignContent, { k: 'womenonly' }>) {
  const line = lineOf(c.line), w = line.service.womenOnly, on = womenOnlyNow(line, clock.time);
  ctx.fillStyle = PINK;
  ctx.fillRect(0, 0, W, H);
  text(ctx, '女性専用車', W * 0.03, H * 0.3, H * 0.36, { color: '#fff', maxW: W * 0.5 });
  text(ctx, 'Women only', W * 0.03, H * 0.72, H * 0.22, { color: '#fff', weight: 500, maxW: W * 0.5 });
  if (w) text(ctx, `平日 ${hm(w.fromS)}〜${hm(w.toS)}`, W * 0.97, H * 0.28, H * 0.24, { color: '#fff', align: 'right', maxW: W * 0.44 });
  ctx.fillStyle = on ? '#ffffff' : '#b8497c';
  ctx.fillRect(W * 0.55, H * 0.5, W * 0.42, H * 0.4);
  text(ctx, on ? 'ただいま実施中 In force' : '現在は対象外 Not now', W * 0.76, H * 0.7, H * 0.2, { color: on ? PINK : '#f6d9e6', align: 'center', maxW: W * 0.4 });
}
