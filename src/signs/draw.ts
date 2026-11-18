// Canvas drawing for every sign type. All text comes from the network data.

import { LINES, OPERATOR, STATIONS, lineById, linesAt, stationById, terminusOf } from '../data/network';
import type { Dir, LineDef, StationDef } from '../data/types';
import { clock, formatClock, lineSim } from '../sim';
import { nextArrivals, nextDepartures, trainStateAt } from '../sim/timetable';
import type { Arrow, SignContent } from './content';

export const FONT = '"Hiragino Sans","Yu Gothic UI","Yu Gothic","Meiryo","Noto Sans JP",system-ui,sans-serif';
const NAVY = '#14233b';
type Ctx = CanvasRenderingContext2D;

const font = (ctx: Ctx, px: number, weight = 700) => {
  ctx.font = `${weight} ${Math.max(4, px)}px ${FONT}`;
};
/** Draw text shrunk horizontally to fit maxW. */
function text(ctx: Ctx, s: string, x: number, y: number, px: number, opts: { maxW?: number; align?: CanvasTextAlign; color?: string; weight?: number } = {}) {
  font(ctx, px, opts.weight ?? 700);
  ctx.textAlign = opts.align ?? 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = opts.color ?? '#111';
  const w = ctx.measureText(s).width;
  if (opts.maxW && w > opts.maxW) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(opts.maxW / w, 1);
    ctx.fillText(s, 0, 0);
    ctx.restore();
    return opts.maxW;
  }
  ctx.fillText(s, x, y);
  return w;
}
function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}
function arrow(ctx: Ctx, cx: number, cy: number, size: number, dir: Arrow, color: string) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate({ up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 }[dir]);
  const s = size / 2;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.lineTo(s * 0.85, -s * 0.05);
  ctx.lineTo(s * 0.3, -s * 0.05);
  ctx.lineTo(s * 0.3, s);
  ctx.lineTo(-s * 0.3, s);
  ctx.lineTo(-s * 0.3, -s * 0.05);
  ctx.lineTo(-s * 0.85, -s * 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
export function lineBadge(ctx: Ctx, cx: number, cy: number, r: number, line: LineDef) {
  ctx.fillStyle = line.color;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  text(ctx, line.id, cx, cy + r * 0.06, r * 1.25, { align: 'center', color: '#fff', weight: 800 });
}
/** Station number plate, e.g. Y over 13 in a line-coloured rounded square. */
export function numBadge(ctx: Ctx, x: number, y: number, s: number, code: string, color: string) {
  const [letter, num] = code.split('-');
  rr(ctx, x, y, s, s, s * 0.2);
  ctx.fillStyle = color;
  ctx.fill();
  rr(ctx, x + s * 0.09, y + s * 0.09, s * 0.82, s * 0.82, s * 0.13);
  ctx.fillStyle = '#fff';
  ctx.fill();
  text(ctx, letter, x + s / 2, y + s * 0.3, s * 0.34, { align: 'center', color, weight: 800 });
  text(ctx, num, x + s / 2, y + s * 0.66, s * 0.46, { align: 'center', color: '#111', weight: 800 });
}
/** Operator mark: three flowing strokes (川) in a roundel. Original design. */
export function logo(ctx: Ctx, cx: number, cy: number, r: number, bg = '#0d3b66', fg = '#fff') {
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = fg;
  ctx.lineWidth = r * 0.2;
  ctx.lineCap = 'round';
  for (const [dx, len] of [[-0.42, 0.9], [0, 1.15], [0.42, 0.9]]) {
    ctx.beginPath();
    ctx.moveTo(cx + dx * r + r * 0.1, cy - (len * r) / 2);
    ctx.bezierCurveTo(cx + dx * r - r * 0.2, cy - r * 0.1, cx + dx * r + r * 0.2, cy + r * 0.1, cx + dx * r - r * 0.1, cy + (len * r) / 2);
    ctx.stroke();
  }
}

const neighbours = (line: LineDef, st: StationDef) => {
  const i = line.stops.indexOf(st.id);
  return {
    prev: i > 0 ? stationById(line.stops[i - 1]) : null,
    next: i < line.stops.length - 1 ? stationById(line.stops[i + 1]) : null,
  };
};

function drawName(ctx: Ctx, W: number, H: number, c: Extract<SignContent, { k: 'name' }>) {
  const st = stationById(c.station), line = lineById(c.line);
  ctx.fillStyle = '#fbfbf8';
  ctx.fillRect(0, 0, W, H);
  const bandH = H * 0.24, top = H - bandH;
  // Name block.
  const bs = H * 0.3;
  font(ctx, H * 0.3, 800);
  const nameW = Math.min(W * 0.6, ctx.measureText(st.nameJa).width);
  const x0 = W / 2 - (nameW + bs * 1.25) / 2;
  numBadge(ctx, x0, H * 0.1, bs, st.numbers[line.id], line.color);
  text(ctx, st.nameJa, x0 + bs * 1.25, H * 0.25, H * 0.3, { maxW: W * 0.6, weight: 800 });
  text(ctx, st.nameKana, W / 2, H * 0.5, H * 0.1, { align: 'center', color: '#333', weight: 600, maxW: W * 0.9 });
  text(ctx, st.nameRomaji, W / 2, H * 0.65, H * 0.11, { align: 'center', color: '#111', weight: 700, maxW: W * 0.9 });
  // Line band with neighbours.
  ctx.fillStyle = line.color;
  ctx.fillRect(0, top, W, bandH);
  const { prev, next } = neighbours(line, st);
  const downRight = c.arrow !== 'left';
  const L = downRight ? prev : next, R = downRight ? next : prev;
  const mid = top + bandH / 2;
  if (L) {
    arrow(ctx, bandH * 0.5, mid, bandH * 0.6, 'left', '#fff');
    const w = text(ctx, L.nameJa, bandH * 1.0, mid, bandH * 0.5, { color: '#fff', maxW: W * 0.22 });
    text(ctx, L.nameRomaji, bandH * 1.15 + w, mid + bandH * 0.05, bandH * 0.3, { color: '#fff', weight: 600, maxW: W * 0.2 });
  }
  if (R) {
    arrow(ctx, W - bandH * 0.5, mid, bandH * 0.6, 'right', '#fff');
    font(ctx, bandH * 0.3, 600);
    const we = Math.min(W * 0.2, ctx.measureText(R.nameRomaji).width);
    text(ctx, R.nameRomaji, W - bandH * 1.0, mid + bandH * 0.05, bandH * 0.3, { color: '#fff', weight: 600, align: 'right', maxW: W * 0.2 });
    text(ctx, R.nameJa, W - bandH * 1.15 - we, mid, bandH * 0.5, { color: '#fff', align: 'right', maxW: W * 0.22 });
  }
}

const platformNo = (st: StationDef, line: LineDef, dir: Dir) => st.platforms[line.id][dir === 'down' ? 0 : 1];
const boards = (line: LineDef, st: StationDef, dir: Dir) => terminusOf(line, dir).id !== st.id;

function drawDir(ctx: Ctx, W: number, H: number, c: Extract<SignContent, { k: 'dir' }>) {
  const st = stationById(c.station), line = lineById(c.line);
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, W, H);
  const p = H * 0.12;
  let x = p;
  if (c.arrow) {
    arrow(ctx, x + H * 0.3, H / 2, H * 0.55, c.arrow, '#fff');
    x += H * 0.7;
  }
  rr(ctx, x, p, H - 2 * p, H - 2 * p, H * 0.1);
  ctx.fillStyle = line.color;
  ctx.fill();
  text(ctx, String(platformNo(st, line, c.dir)), x + (H - 2 * p) / 2, H / 2 + H * 0.03, H * 0.6, { align: 'center', color: '#fff', weight: 800 });
  x += H * 0.95;
  lineBadge(ctx, x + H * 0.25, H * 0.3, H * 0.2, line);
  text(ctx, line.nameJa, x + H * 0.55, H * 0.3, H * 0.26, { color: '#fff', maxW: W * 0.25 });
  text(ctx, line.nameEn, x, H * 0.72, H * 0.17, { color: '#c9d4e3', weight: 600, maxW: W * 0.3 });
  const tx = x + W * 0.33;
  if (boards(line, st, c.dir)) {
    const t = terminusOf(line, c.dir);
    const w = text(ctx, t.nameJa, tx, H * 0.34, H * 0.4, { color: '#fff', weight: 800, maxW: W - tx - H * 0.9 });
    text(ctx, '方面', tx + w + H * 0.1, H * 0.4, H * 0.22, { color: '#fff', weight: 600 });
    text(ctx, `for ${t.nameRomaji}`, tx, H * 0.76, H * 0.2, { color: '#c9d4e3', weight: 600, maxW: W - tx - p });
  } else {
    text(ctx, '降車専用', tx, H * 0.34, H * 0.4, { color: '#ffd23f', weight: 800, maxW: W - tx - p });
    text(ctx, 'Alighting only — this platform is for arrivals', tx, H * 0.76, H * 0.17, { color: '#c9d4e3', weight: 600, maxW: W - tx - p });
  }
}

function drawGuide(ctx: Ctx, W: number, H: number, c: Extract<SignContent, { k: 'guide' }>) {
  const bg = { navy: NAVY, white: '#fbfbf8', yellow: '#ffd100', green: '#0a7d4f' }[c.bg];
  const fg = c.bg === 'navy' || c.bg === 'green' ? '#fff' : '#111';
  const sub = c.bg === 'navy' || c.bg === 'green' ? '#c9d4e3' : '#333';
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const p = H * 0.14;
  let x0 = p, x1 = W - p;
  if (c.arrow === 'right') {
    arrow(ctx, W - H * 0.45, H / 2, H * 0.6, 'right', fg);
    x1 = W - H * 0.9;
  } else if (c.arrow) {
    arrow(ctx, H * 0.45, H / 2, H * 0.6, c.arrow, fg);
    x0 = H * 0.9;
  }
  for (const id of c.badges ?? []) {
    lineBadge(ctx, x0 + H * 0.3, H / 2, H * 0.3, lineById(id));
    x0 += H * 0.72;
  }
  if (c.num) {
    rr(ctx, x1 - H * 0.72, p, H * 0.72, H - 2 * p, H * 0.08);
    ctx.fillStyle = fg;
    ctx.fill();
    text(ctx, c.num, x1 - H * 0.36, H / 2 + H * 0.02, H * 0.5, { align: 'center', color: bg, weight: 800, maxW: H * 0.6 });
    x1 -= H * 0.85;
  }
  text(ctx, c.ja, x0, H * 0.36, H * 0.38, { color: fg, weight: 800, maxW: x1 - x0 });
  text(ctx, c.en, x0, H * 0.76, H * 0.2, { color: sub, weight: 600, maxW: x1 - x0 });
}

function drawEntrance(ctx: Ctx, W: number, H: number, c: Extract<SignContent, { k: 'entrance' }>) {
  const st = stationById(c.station);
  ctx.fillStyle = '#fbfbf8';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#0d3b66';
  ctx.fillRect(0, 0, W, H * 0.12);
  logo(ctx, H * 0.55, H * 0.56, H * 0.32);
  let x = H * 1.05;
  const w = text(ctx, `${st.nameJa}駅`, x, H * 0.46, H * 0.36, { weight: 800, maxW: W * 0.5 });
  text(ctx, `${st.nameRomaji} Sta.`, x, H * 0.8, H * 0.16, { color: '#333', weight: 600, maxW: W * 0.5 });
  x += w + H * 0.25;
  for (const l of linesAt(st.id)) {
    numBadge(ctx, x, H * 0.24, H * 0.5, st.numbers[l.id], l.color);
    x += H * 0.58;
  }
  if (c.exit) {
    ctx.fillStyle = '#ffd100';
    ctx.fillRect(W - H * 0.9, H * 0.12, H * 0.9, H * 0.88);
    text(ctx, c.exit, W - H * 0.45, H * 0.5, H * 0.48, { align: 'center', weight: 800 });
    text(ctx, '出口 Exit', W - H * 0.45, H * 0.85, H * 0.13, { align: 'center', weight: 700 });
  }
}

/** Compact network diagram, used on fare boards. */
function drawDiagram(ctx: Ctx, x: number, y: number, w: number, h: number, here?: string) {
  const xs = STATIONS.map((s) => s.diagram.x), ys = STATIONS.map((s) => s.diagram.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const sc = Math.min(w / (maxX - minX + 160), h / (maxY - minY + 90));
  const ox = x + (w - (maxX - minX) * sc) / 2 - minX * sc, oy = y + (h - (maxY - minY) * sc) / 2 - minY * sc;
  const P = (s: StationDef) => [ox + s.diagram.x * sc, oy + s.diagram.y * sc];
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (const l of LINES) {
    ctx.strokeStyle = l.color;
    ctx.lineWidth = 9 * sc;
    ctx.beginPath();
    l.stops.forEach((id, i) => {
      const [px, py] = P(stationById(id));
      if (i) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    });
    ctx.stroke();
  }
  const hereSt = here ? stationById(here) : null;
  for (const s of STATIONS) {
    const [px, py] = P(s);
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = s.id === here ? '#e02020' : '#222';
    ctx.lineWidth = 2.5 * sc;
    ctx.beginPath();
    ctx.arc(px, py, 8 * sc, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Beside the marker on a vertical stretch of line, otherwise below it.
    const side = s.diagram.label === 'right' ? 1 : s.diagram.label === 'left' ? -1 : 0;
    const align = side > 0 ? 'left' : side < 0 ? 'right' : 'center';
    const tx = px + side * 14 * sc, ty = side ? py : py + 24 * sc;
    text(ctx, s.nameJa, tx, ty, 17 * sc, { align, weight: 700, color: '#111' });
    if (hereSt && s.id !== here) {
      // Fare by rough distance, in the usual 50-yen steps: realistic-looking, deterministic.
      const d = Math.hypot(s.position.x - hereSt.position.x, s.position.y - hereSt.position.y);
      const fare = d < 900 ? 190 : d < 1800 ? 240 : d < 3000 ? 290 : d < 4500 ? 340 : 390;
      text(ctx, String(fare), tx, ty + 18 * sc, 14 * sc, { align, weight: 700, color: '#c0392b' });
    } else if (hereSt) {
      text(ctx, '当駅', tx, ty + 18 * sc, 13 * sc, { align, weight: 800, color: '#e02020' });
    }
  }
}

function drawFareMap(ctx: Ctx, W: number, H: number, c: Extract<SignContent, { k: 'faremap' }>) {
  ctx.fillStyle = '#f7f7f2';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#0d3b66';
  ctx.fillRect(0, 0, W, H * 0.13);
  logo(ctx, H * 0.09, H * 0.065, H * 0.05, '#fff', '#0d3b66');
  text(ctx, 'きっぷ運賃表', H * 0.18, H * 0.07, H * 0.075, { color: '#fff' });
  text(ctx, `Fares from ${stationById(c.station).nameRomaji}  (yen)`, W - H * 0.05, H * 0.07, H * 0.055, { color: '#dfe8f3', align: 'right', weight: 600 });
  drawDiagram(ctx, 0, H * 0.13, W, H * 0.87, c.station);
}

function drawShop(ctx: Ctx, W: number, H: number, c: Extract<SignContent, { k: 'shop' }>) {
  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, W, H);
  if (c.vertical) {
    const chars = [...c.ja];
    const size = Math.min(W * 0.72, (H * 0.94) / chars.length);
    chars.forEach((ch, i) => {
      const y = H / 2 + (i - (chars.length - 1) / 2) * size;
      if (ch === 'ー') {
        ctx.fillStyle = c.fg;
        ctx.fillRect(W / 2 - size * 0.05, y - size * 0.4, size * 0.1, size * 0.8);
      } else text(ctx, ch, W / 2, y, size * 0.92, { align: 'center', color: c.fg, weight: 800 });
    });
    return;
  }
  if (c.en) {
    text(ctx, c.ja, W / 2, H * 0.42, H * 0.5, { align: 'center', color: c.fg, weight: 800, maxW: W * 0.92 });
    text(ctx, c.en, W / 2, H * 0.82, H * 0.2, { align: 'center', color: c.fg, weight: 600, maxW: W * 0.92 });
  } else text(ctx, c.ja, W / 2, H / 2, H * 0.6, { align: 'center', color: c.fg, weight: 800, maxW: W * 0.92 });
}

const POSTERS: { bg: [string, string]; fg: string; ja: string; en: string; tag: string }[] = [
  { bg: ['#0b6fa4', '#0a2f5c'], fg: '#fff', ja: '川湊水族館', en: 'Kawaminato Aquarium', tag: '川湊港駅 徒歩5分' },
  { bg: ['#ff7aa2', '#ffd1dc'], fg: '#3a0d1e', ja: 'ICカード ミナカ', en: 'MINACA — tap and go', tag: 'チャージは券売機で' },
  { bg: ['#f2e9d0', '#e3c98a'], fg: '#5a2d0c', ja: '柳筋まつり', en: 'Yanagisuji Festival', tag: '十月 第二土曜・日曜' },
  { bg: ['#9fd8a4', '#e8f6e0'], fg: '#14401c', ja: 'ひばり野の丘に住む', en: 'Hibarino Hills Residences', tag: '雲雀野駅 徒歩8分' },
  { bg: ['#7b1e28', '#3d0f14'], fg: '#f6e7c8', ja: '川湊大学 公開講座', en: 'Kawaminato University Open Lectures', tag: '受講生募集中' },
  { bg: ['#fff7cc', '#ffe066'], fg: '#222', ja: '歩きスマホは危険です', en: 'Please do not use your phone while walking', tag: '川湊メトロ マナー向上運動' },
  { bg: ['#151515', '#3a2a00'], fg: '#ffcf4a', ja: '瓢箪堀 グルメ横丁', en: 'Hyotanbori Gourmet Alley', tag: '瓢箪堀駅 2番出口すぐ' },
  { bg: ['#1c355e', '#274b82'], fg: '#fff', ja: '港の朝市', en: 'Harbour Morning Market', tag: '毎週日曜 朝6時から' },
];

function drawPoster(ctx: Ctx, W: number, H: number, v: number) {
  const p = POSTERS[v % POSTERS.length];
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, p.bg[0]);
  g.addColorStop(1, p.bg[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = p.fg;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(W * (0.15 + 0.2 * i), H * (0.3 + 0.12 * ((i * 7 + v) % 4)), H * (0.1 + 0.03 * ((i + v) % 3)), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const portrait = H > W;
  text(ctx, p.ja, W / 2, H * (portrait ? 0.56 : 0.4), portrait ? W * 0.15 : H * 0.26, { align: 'center', color: p.fg, weight: 800, maxW: W * 0.9 });
  text(ctx, p.en, W / 2, H * (portrait ? 0.68 : 0.66), portrait ? W * 0.065 : H * 0.11, { align: 'center', color: p.fg, weight: 600, maxW: W * 0.9 });
  text(ctx, p.tag, W / 2, H * 0.9, portrait ? W * 0.06 : H * 0.09, { align: 'center', color: p.fg, weight: 600, maxW: W * 0.9 });
  ctx.strokeStyle = '#d8d8d8';
  ctx.lineWidth = Math.max(2, W * 0.012);
  ctx.strokeRect(0, 0, W, H);
}

function drawMachine(ctx: Ctx, W: number, H: number, v: string) {
  const fill = (c: string, x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = c;
    ctx.fillRect(x * W, y * H, w * W, h * H);
  };
  if (v === 'ticket' || v === 'charge') {
    fill('#d7dade', 0, 0, 1, 1);
    fill(v === 'ticket' ? '#0d3b66' : '#c2185b', 0, 0, 1, 0.12);
    text(ctx, v === 'ticket' ? 'きっぷ  Tickets' : 'チャージ  IC Charge', W / 2, H * 0.06, H * 0.055, { align: 'center', color: '#fff', maxW: W * 0.9 });
    fill('#10202f', 0.1, 0.18, 0.8, 0.3);
    fill('#2a7de1', 0.13, 0.2, 0.74, 0.26);
    for (let i = 0; i < 6; i++) fill('#fff', 0.16 + (i % 3) * 0.24, 0.24 + Math.floor(i / 3) * 0.1, 0.2, 0.07);
    fill('#30343a', 0.12, 0.55, 0.3, 0.05);
    fill('#30343a', 0.55, 0.55, 0.32, 0.03);
    fill('#ffd100', 0.55, 0.6, 0.32, 0.02);
    fill('#1b1e22', 0.2, 0.72, 0.6, 0.1);
    fill('#b9bdc2', 0, 0.9, 1, 0.1);
  } else if (v === 'vending' || v === 'vending2') {
    const body = v === 'vending' ? '#d32f2f' : '#1565c0';
    fill(body, 0, 0, 1, 1);
    fill('#f4f7fa', 0.07, 0.05, 0.86, 0.5);
    const cols = ['#e53935', '#fdd835', '#43a047', '#1e88e5', '#6d4c41', '#fb8c00', '#00acc1', '#8e24aa'];
    for (let r = 0; r < 3; r++) {
      for (let i = 0; i < 8; i++) {
        fill(cols[(i * 3 + r * 5) % cols.length], 0.1 + i * 0.1, 0.07 + r * 0.16, 0.07, 0.11);
        fill(r === 1 ? '#e53935' : '#1e88e5', 0.1 + i * 0.1, 0.185 + r * 0.16, 0.07, 0.015);
      }
    }
    fill('#111', 0.62, 0.6, 0.26, 0.1);
    fill('#222', 0.12, 0.8, 0.76, 0.12);
    text(ctx, v === 'vending' ? 'つめた〜い' : 'あったか〜い', W * 0.32, H * 0.65, H * 0.04, { align: 'center', color: '#fff' });
  } else if (v === 'locker') {
    fill('#e9e4d8', 0, 0, 1, 1);
    for (let r = 0; r < 4; r++) {
      for (let i = 0; i < 4; i++) {
        ctx.strokeStyle = '#8b8778';
        ctx.lineWidth = W * 0.008;
        ctx.strokeRect((0.02 + i * 0.245) * W, (0.03 + r * 0.24) * H, 0.225 * W, 0.22 * H);
        fill('#f57c00', 0.2 + i * 0.245, 0.12 + r * 0.24, 0.03, 0.04);
      }
    }
  } else if (v === 'elevator') {
    fill('#b9bec4', 0, 0, 1, 1);
    fill('#8f959c', 0.08, 0.14, 0.4, 0.86);
    fill('#8f959c', 0.52, 0.14, 0.4, 0.86);
    fill('#0d3b66', 0, 0, 1, 0.11);
    text(ctx, 'エレベーター  Elevator', W / 2, H * 0.055, H * 0.055, { align: 'center', color: '#fff', maxW: W * 0.9 });
  } else if (v === 'door') {
    fill('#cfd3d6', 0, 0, 1, 1);
    ctx.strokeStyle = '#8b9096';
    ctx.lineWidth = W * 0.02;
    ctx.strokeRect(W * 0.04, H * 0.03, W * 0.92, H * 0.97);
    fill('#555', 0.8, 0.5, 0.08, 0.02);
    text(ctx, '関係者以外立入禁止', W / 2, H * 0.3, H * 0.05, { align: 'center', color: '#c62828', maxW: W * 0.8 });
    text(ctx, 'Staff only', W / 2, H * 0.37, H * 0.04, { align: 'center', color: '#444', weight: 600 });
  } else {
    // Station office window.
    fill('#e8eaec', 0, 0, 1, 1);
    fill('#9fc3d6', 0.06, 0.2, 0.88, 0.5);
    fill('#0d3b66', 0, 0, 1, 0.14);
    text(ctx, '駅長室・ご案内  Station Office', W / 2, H * 0.07, H * 0.07, { align: 'center', color: '#fff', maxW: W * 0.92 });
  }
}

function drawMural(ctx: Ctx, W: number, H: number, c: Extract<SignContent, { k: 'mural' }>) {
  const col = c.color;
  if (c.v === 'weave') {
    // Tsumugi: woven kasuri stripes.
    ctx.fillStyle = '#f1e9da';
    ctx.fillRect(0, 0, W, H);
    const cols = [col, '#27344f', '#b4472f', '#d9b25a', '#5d7d6b'];
    const n = 48;
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = cols[(i * 7) % cols.length];
      ctx.globalAlpha = 0.85;
      ctx.fillRect((i / n) * W, 0, (W / n) * (0.35 + 0.5 * ((i * 13) % 5) / 5), H);
    }
    ctx.globalAlpha = 0.5;
    for (let j = 0; j < 14; j++) {
      ctx.fillStyle = j % 2 ? '#f1e9da' : '#27344f';
      ctx.fillRect(0, (j / 14) * H, W, H / 60);
    }
    ctx.globalAlpha = 1;
  } else if (c.v === 'waves') {
    // Seigaiha wave scales.
    ctx.fillStyle = '#f4f8fb';
    ctx.fillRect(0, 0, W, H);
    const r = H / 5;
    ctx.lineWidth = r * 0.09;
    for (let row = 0; row < 12; row++) {
      for (let i = -1; i < W / r + 1; i++) {
        const cx = i * r * 2 + (row % 2 ? r : 0), cy = row * r * 0.5 + r;
        for (let k = 3; k >= 1; k--) {
          ctx.fillStyle = k % 2 ? '#f4f8fb' : col;
          ctx.strokeStyle = col;
          ctx.beginPath();
          ctx.arc(cx, cy, (r * k) / 3, Math.PI, 0);
          ctx.fill();
          ctx.stroke();
        }
      }
    }
  } else if (c.v === 'gourds') {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = col;
    const s = H / 3.2;
    for (let i = 0; i < W / s + 1; i++) {
      for (let j = 0; j < 3; j++) {
        const cx = i * s + (j % 2 ? s / 2 : 0) + s * 0.3, cy = j * s * 1.05 + s * 0.6;
        ctx.beginPath();
        ctx.arc(cx, cy + s * 0.14, s * 0.2, 0, Math.PI * 2);
        ctx.arc(cx, cy - s * 0.13, s * 0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(cx - s * 0.02, cy - s * 0.32, s * 0.04, s * 0.1);
      }
    }
  } else if (c.v === 'pines') {
    ctx.fillStyle = '#efe6cf';
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 9; i++) {
      const cx = (i + 0.5) * (W / 9), cy = H * (0.55 + 0.1 * (i % 2));
      ctx.fillStyle = '#5b3a1e';
      ctx.fillRect(cx - H * 0.02, cy, H * 0.04, H * 0.4);
      ctx.fillStyle = col;
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.ellipse(cx + (k - 1) * H * 0.12, cy - k * H * 0.09 * (k === 1 ? 1.6 : 0.4), H * 0.2, H * 0.09, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.arc(W * 0.86, H * 0.25, H * 0.12, 0, Math.PI * 2);
    ctx.fill();
  } else if (c.v === 'hills') {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#bfe3f5');
    g.addColorStop(1, '#f4fbff');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ['#9ccc9c', '#6bb07a', col].forEach((cc, k) => {
      ctx.fillStyle = cc;
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += W / 40) ctx.lineTo(x, H * (0.5 + 0.13 * k) + Math.sin(x / (W * 0.08) + k * 2) * H * 0.1);
      ctx.lineTo(W, H);
      ctx.fill();
    });
  } else if (c.v === 'gulls') {
    // Gulls wheeling over a pale sea.
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#eaf4f8');
    g.addColorStop(1, '#c4dde8');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = col;
    ctx.globalAlpha = 0.35;
    ctx.fillRect(0, H * 0.82, W, H * 0.18);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = col;
    ctx.lineCap = 'round';
    for (let i = 0; i < 22; i++) {
      const x = ((i * 0.618) % 1) * W, y = H * (0.14 + 0.55 * ((i * 0.377) % 1)), s = H * (0.07 + 0.06 * ((i * 5) % 4) / 4);
      ctx.lineWidth = s * 0.14;
      ctx.beginPath();
      ctx.moveTo(x - s, y);
      ctx.quadraticCurveTo(x - s * 0.5, y - s * 0.6, x, y);
      ctx.quadraticCurveTo(x + s * 0.5, y - s * 0.6, x + s, y);
      ctx.stroke();
    }
  } else if (c.v === 'threads') {
    // Cotton skeins: long drooping threads in a few dyed colours.
    ctx.fillStyle = '#f6f1e6';
    ctx.fillRect(0, 0, W, H);
    const cols = [col, '#27344f', '#d9b25a', '#f6f1e6', col];
    for (let i = 0; i < 90; i++) {
      const x = (i / 90) * W;
      ctx.strokeStyle = cols[Math.floor(i / 6) % cols.length];
      ctx.lineWidth = H * 0.012;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + H * 0.05, H * 0.4, x - H * 0.05, H * 0.6, x + H * 0.02 * Math.sin(i), H);
      ctx.stroke();
    }
    ctx.fillStyle = '#5b4a3a';
    ctx.fillRect(0, H * 0.06, W, H * 0.035);
  } else if (c.v === 'moon') {
    // Full moon over a slope, pampas grass in front.
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#141b33');
    g.addColorStop(1, '#2c3a63');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(W * 0.72, H * 0.36, H * 0.24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0d1224';
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(0, H * 0.55);
    ctx.quadraticCurveTo(W * 0.5, H * 0.75, W, H * 0.88);
    ctx.lineTo(W, H);
    ctx.fill();
    ctx.strokeStyle = '#e9e2c8';
    ctx.lineWidth = H * 0.01;
    for (let i = 0; i < 40; i++) {
      const x = (i / 40) * W, base = H * (0.6 + 0.28 * (x / W));
      ctx.beginPath();
      ctx.moveTo(x, base + H * 0.1);
      ctx.quadraticCurveTo(x + H * 0.02, base - H * 0.1, x + H * (0.06 + 0.04 * (i % 3)), base - H * 0.2);
      ctx.stroke();
    }
  } else if (c.v === 'kerria') {
    // Yamabuki: five-petalled yellow flowers on arching green stems.
    ctx.fillStyle = '#f7f5e8';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#5d8a3a';
    ctx.lineWidth = H * 0.014;
    for (let i = 0; i < 12; i++) {
      const x = (i / 12) * W;
      ctx.beginPath();
      ctx.moveTo(x, H);
      ctx.quadraticCurveTo(x + W * 0.03, H * 0.3, x + W * 0.09, H * (0.25 + 0.2 * (i % 3)));
      ctx.stroke();
    }
    for (let i = 0; i < 46; i++) {
      const x = ((i * 0.618) % 1) * W, y = H * (0.12 + 0.72 * ((i * 0.377) % 1)), r = H * (0.045 + 0.02 * (i % 3));
      ctx.fillStyle = col;
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2 + i;
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7, r * 0.55, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#b8791a';
      ctx.beginPath();
      ctx.arc(x, y, r * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (c.v === 'sunset') {
    // Yūnagi: the evening calm. A low sun over a flat bay, its path broken into ripples.
    const g = ctx.createLinearGradient(0, 0, 0, H * 0.62);
    g.addColorStop(0, '#f7d9a8');
    g.addColorStop(1, '#f2a25c');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const sx = W * 0.62, hz = H * 0.62;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(sx, hz, H * 0.2, Math.PI, 0);
    ctx.fill();
    const sea = ctx.createLinearGradient(0, hz, 0, H);
    sea.addColorStop(0, '#5e7f99');
    sea.addColorStop(1, '#2c4660');
    ctx.fillStyle = sea;
    ctx.fillRect(0, hz, W, H - hz);
    ctx.fillStyle = '#f8c27a';
    for (let i = 0; i < 16; i++) {
      const y = hz + H * 0.03 + i * H * 0.022, w = H * (0.34 - i * 0.016) * (0.7 + 0.3 * ((i * 7) % 3) / 2);
      ctx.globalAlpha = 0.85 - i * 0.045;
      ctx.fillRect(sx - w / 2 + Math.sin(i * 2.3) * H * 0.02, y, w, H * 0.009);
    }
    ctx.globalAlpha = 1;
    // A distant breakwater and lighthouse.
    ctx.fillStyle = '#2a3442';
    ctx.fillRect(W * 0.06, hz - H * 0.012, W * 0.3, H * 0.014);
    ctx.fillRect(W * 0.33, hz - H * 0.13, H * 0.035, H * 0.13);
  } else if (c.v === 'namako') {
    // Namako-kabe: square dark tiles set on the diagonal, with raised white plaster joints.
    ctx.fillStyle = '#f3f0e8';
    ctx.fillRect(0, 0, W, H);
    const s = H / 4.2;
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(Math.PI / 4);
    const n = Math.ceil(Math.hypot(W, H) / s / 2) + 1;
    for (let i = -n; i <= n; i++) {
      for (let j = -n; j <= n; j++) {
        ctx.fillStyle = col;
        ctx.fillRect(i * s + s * 0.09, j * s + s * 0.09, s * 0.82, s * 0.82);
      }
    }
    ctx.restore();
    // Top band of white plaster, as on a storehouse wall.
    ctx.fillStyle = '#f3f0e8';
    ctx.fillRect(0, 0, W, H * 0.12);
    ctx.fillStyle = '#c9c3b5';
    ctx.fillRect(0, H * 0.12, W, H * 0.012);
  } else if (c.v === 'lanterns') {
    // Paper lanterns strung along a canal at dusk, doubled in the water.
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#241a2e');
    g.addColorStop(0.55, '#3b2a3a');
    g.addColorStop(0.56, '#1b2230');
    g.addColorStop(1, '#10151f');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const lantern = (x: number, y: number, r: number, a: number) => {
      ctx.globalAlpha = a;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(x, y, r * 0.75, r, 0, 0, Math.PI * 2);
      ctx.fill();
      if (a < 1) return; // reflections: just the glow
      ctx.fillStyle = '#2a1c18';
      ctx.fillRect(x - r * 0.45, y - r * 1.08, r * 0.9, r * 0.16);
      ctx.fillRect(x - r * 0.45, y + r * 0.92, r * 0.9, r * 0.16);
    };
    // Two strings of lanterns, sagging between posts; the water line is at 56 % of the height.
    const water = H * 0.56, r = H * 0.075, n = Math.max(6, Math.round(W / (H * 0.42)));
    for (let row = 0; row < 2; row++) {
      const top = H * (0.08 + row * 0.2);
      const sag = (x: number) => top + Math.abs(Math.sin((x / W) * Math.PI * (n / 3))) * H * 0.05;
      ctx.strokeStyle = '#6b5a50';
      ctx.lineWidth = H * 0.008;
      ctx.beginPath();
      for (let x = 0; x <= W; x += W / 120) (x ? ctx.lineTo(x, sag(x)) : ctx.moveTo(x, sag(x)));
      ctx.stroke();
      for (let i = 0; i < n; i++) {
        const x = ((i + 0.25 + row * 0.5) / n) * W, y = sag(x) + r * 1.15;
        lantern(x, y, r, 1);
        // Reflection: mirrored about the water line, squashed, faint and a little wobbly.
        const ry = water + (water - y) * 0.55;
        ctx.save();
        ctx.translate(x + Math.sin(i * 1.7) * H * 0.012, ry);
        ctx.scale(1, 0.5);
        lantern(0, 0, r, 0.42);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
  } else if (c.v === 'sakura') {
    // Cherry trees along an embankment: a pink canopy, petals falling on the water.
    ctx.fillStyle = '#eef3f6';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#9fc4d6';
    ctx.fillRect(0, H * 0.78, W, H * 0.22);
    ctx.fillStyle = '#7fa36a';
    ctx.beginPath();
    ctx.moveTo(0, H * 0.8);
    ctx.lineTo(0, H * 0.66);
    ctx.lineTo(W, H * 0.6);
    ctx.lineTo(W, H * 0.8);
    ctx.fill();
    for (let i = 0; i < 10; i++) {
      const x = (i + 0.4) * (W / 10), base = H * (0.66 - 0.06 * (x / W));
      ctx.fillStyle = '#4a3a33';
      ctx.fillRect(x - H * 0.015, base - H * 0.24, H * 0.03, H * 0.24);
      for (let k = 0; k < 7; k++) {
        const a = k * 0.9 + i;
        ctx.fillStyle = k % 2 ? col : '#f7d6df';
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * H * 0.09, base - H * 0.3 + Math.sin(a) * H * 0.07, H * (0.08 + 0.02 * (k % 3)), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = '#f7d6df';
    for (let i = 0; i < 70; i++) {
      const x = ((i * 0.618) % 1) * W, y = H * (0.45 + 0.5 * ((i * 0.377) % 1));
      ctx.fillRect(x, y, H * 0.012, H * 0.008);
    }
  } else if (c.v === 'maple') {
    // Momiji: scattered five-lobed maple leaves in autumn reds and golds on warm cream.
    ctx.fillStyle = '#f4ece0';
    ctx.fillRect(0, 0, W, H);
    const cols = [col, '#e07a2e', '#d9a441', '#9c2a22'];
    const hash = (n: number) => {
      const v = Math.sin(n * 12.9898) * 43758.5453;
      return v - Math.floor(v);
    };
    const leaf = (x: number, y: number, r: number, a: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      // Palmate: five slender pointed lobes fanning from the stalk, the lowest pair shortest.
      for (const [t, len] of [[0, 1], [-0.95, 0.85], [0.95, 0.85], [-1.85, 0.55], [1.85, 0.55]]) {
        ctx.save();
        ctx.rotate(t);
        const L = r * len, wd = r * 0.3 * len;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-wd, -L * 0.45, 0, -L);
        ctx.quadraticCurveTo(wd, -L * 0.45, 0, 0);
        ctx.fill();
        ctx.restore();
      }
      ctx.fillRect(-r * 0.035, 0, r * 0.07, r * 0.6); // stalk
      ctx.restore();
    };
    for (let i = 0; i < Math.round(W / (H * 0.16)); i++) {
      const x = hash(i + 1) * W, y = H * (0.14 + 0.72 * hash(i + 101));
      ctx.fillStyle = cols[Math.floor(hash(i + 201) * cols.length)];
      leaf(x, y, H * (0.08 + 0.05 * hash(i + 301)), (hash(i + 401) - 0.5) * 2.4);
    }
  } else if (c.v === 'stars') {
    // Night sky over the ridge: star field, a few constellation lines and the observatory dome.
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0b1230');
    g.addColorStop(1, '#27325a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    for (let i = 0; i < (W / H) * 90; i++) {
      const x = ((i * 0.618) % 1) * W, y = ((i * 0.7548) % 1) * H * 0.78;
      ctx.globalAlpha = 0.4 + 0.6 * ((i * 0.31) % 1);
      ctx.fillRect(x, y, H * 0.006, H * 0.006);
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = col;
    ctx.fillStyle = col;
    ctx.lineWidth = H * 0.006;
    for (let c0 = 0; c0 < Math.max(2, Math.round(W / (H * 1.6))); c0++) {
      const ox = (c0 + 0.3) * (W / Math.max(2, Math.round(W / (H * 1.6)))), pts: [number, number][] = [];
      for (let k = 0; k < 5; k++) pts.push([ox + (k - 2) * H * 0.14 + Math.sin(k * 2.1 + c0) * H * 0.05, H * (0.2 + 0.1 * Math.cos(k * 1.7 + c0))]);
      ctx.beginPath();
      pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
      for (const [x, y] of pts) {
        ctx.beginPath();
        ctx.arc(x, y, H * 0.014, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // The ridge and the observatory.
    ctx.fillStyle = '#060a1c';
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += W / 40) ctx.lineTo(x, H * (0.86 - 0.06 * Math.sin((x / W) * Math.PI)));
    ctx.lineTo(W, H);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(W * 0.5, H * 0.8, H * 0.07, Math.PI, 0);
    ctx.fill();
  } else if (c.v === 'dogwood') {
    // Hanamizuki: four-bracted dogwood flowers, white and pink, on a sage-green ground.
    ctx.fillStyle = '#b9cba9';
    ctx.fillRect(0, 0, W, H);
    const flower = (x: number, y: number, r: number, a: number, fill: string) => {
      ctx.fillStyle = fill;
      for (let k = 0; k < 4; k++) {
        const t = a + (k * Math.PI) / 2;
        ctx.beginPath();
        ctx.ellipse(x + Math.cos(t) * r * 0.55, y + Math.sin(t) * r * 0.55, r * 0.55, r * 0.36, t, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#7a9a3a';
      ctx.beginPath();
      ctx.arc(x, y, r * 0.18, 0, Math.PI * 2);
      ctx.fill();
    };
    const hash = (n: number) => {
      const v = Math.sin(n * 12.9898) * 43758.5453;
      return v - Math.floor(v);
    };
    // Leaves behind, then the flowers: big four-bracted heads, mostly white, some pink.
    ctx.fillStyle = '#7f9f68';
    for (let i = 0; i < Math.round(W / (H * 0.22)); i++) {
      ctx.beginPath();
      ctx.ellipse(hash(i + 1) * W, H * (0.08 + 0.84 * hash(i + 51)), H * 0.11, H * 0.045, hash(i + 91) * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < Math.round(W / (H * 0.42)); i++) {
      const x = hash(i + 501) * W, y = H * (0.2 + 0.6 * hash(i + 601));
      flower(x, y, H * (0.13 + 0.06 * hash(i + 701)), hash(i + 801) * 1.5, hash(i + 901) < 0.35 ? col : '#fbfaf6');
    }
  } else if (c.v === 'skyline') {
    // The bay new town: glass towers mirrored in the water.
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#dcebf5');
    g.addColorStop(0.62, '#f3f8fb');
    g.addColorStop(0.63, col);
    g.addColorStop(1, '#0d3f73');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const water = H * 0.62;
    for (let x = 0, i = 0; x < W; i++) {
      const w = H * (0.09 + 0.07 * ((i * 0.618) % 1)), h = H * (0.18 + 0.36 * ((i * 0.7548) % 1));
      ctx.fillStyle = i % 3 === 0 ? col : i % 3 === 1 ? '#5f87ab' : '#9fb7cc';
      ctx.fillRect(x, water - h, w - H * 0.012, h);
      // Window bands.
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      for (let y = water - h + H * 0.02; y < water - H * 0.01; y += H * 0.035) ctx.fillRect(x + H * 0.008, y, w - H * 0.028, H * 0.008);
      // Reflection.
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#fff';
      ctx.fillRect(x, water + H * 0.01, w - H * 0.012, h * 0.45);
      ctx.globalAlpha = 1;
      x += w;
    }
  } else if (c.v === 'ripples') {
    // A spring welling up: concentric rings spreading on still water.
    ctx.fillStyle = '#eaf5f5';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = col;
    const n = Math.max(3, Math.round(W / (H * 1.1)));
    for (let i = 0; i < n; i++) {
      const cx = ((i + 0.5) / n) * W + Math.sin(i * 2.3) * H * 0.2, cy = H * (0.5 + 0.18 * Math.sin(i * 1.7));
      for (let k = 1; k <= 7; k++) {
        ctx.globalAlpha = 1 - k / 8;
        ctx.lineWidth = H * (0.02 - k * 0.002);
        ctx.beginPath();
        ctx.ellipse(cx, cy, H * 0.07 * k, H * 0.035 * k, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  } else if (c.v === 'willow') {
    // Gilded willow: long gold fronds on deep green, for the hub.
    ctx.fillStyle = '#12382c';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = col;
    ctx.fillStyle = col;
    for (let i = 0; i < 60; i++) {
      const x = (i / 60) * W + W / 120, len = H * (0.55 + 0.4 * ((i * 37) % 10) / 10);
      ctx.lineWidth = H * 0.006;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.quadraticCurveTo(x + H * 0.05, len / 2, x - H * 0.015, len);
      ctx.stroke();
      for (let k = 1; k < 12; k++) {
        ctx.beginPath();
        ctx.ellipse(x + (k % 2 ? 1 : -1) * H * 0.022, (len * k) / 12, H * 0.03, H * 0.008, k % 2 ? 1.0 : -1.0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else {
    // Leaves (willow / ginkgo) scattered on a pale ground.
    ctx.fillStyle = '#f5f3ea';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = col;
    ctx.fillStyle = col;
    for (let i = 0; i < 26; i++) {
      const x = (i / 26) * W + W / 52;
      ctx.lineWidth = H * 0.008;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      const len = H * (0.5 + 0.4 * ((i * 37) % 10) / 10);
      ctx.quadraticCurveTo(x + H * 0.06, len / 2, x - H * 0.02, len);
      ctx.stroke();
      for (let k = 1; k < 9; k++) {
        ctx.beginPath();
        ctx.ellipse(x + (k % 2 ? 1 : -1) * H * 0.03, (len * k) / 9, H * 0.035, H * 0.012, k % 2 ? 0.9 : -0.9, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawClock(ctx: Ctx, W: number, H: number) {
  // Plain railway clock: white face, black batons, red second hand. Reads the sim clock.
  const t = ((clock.time % 43200) + 43200) % 43200;
  const cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2;
  ctx.fillStyle = '#1b1f24';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fbfbf8';
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.92, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#111';
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2, big = i % 5 === 0;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(a);
    ctx.fillRect(-R * (big ? 0.025 : 0.01), -R * 0.86, R * (big ? 0.05 : 0.02), R * (big ? 0.18 : 0.07));
    ctx.restore();
  }
  const hand = (frac: number, len: number, w: number, col: string) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(frac * Math.PI * 2);
    ctx.fillStyle = col;
    ctx.fillRect(-R * w / 2, -R * len, R * w, R * (len + 0.14));
    ctx.restore();
  };
  hand(t / 43200, 0.5, 0.07, '#111');
  hand((t % 3600) / 3600, 0.78, 0.05, '#111');
  hand(Math.floor(t % 60) / 60, 0.8, 0.018, '#d0211c');
  ctx.fillStyle = '#d0211c';
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.05, 0, Math.PI * 2);
  ctx.fill();
}

const AMBER = '#ffb300', LEDG = '#7CFC6A';

function drawDep(ctx: Ctx, W: number, H: number, c: Extract<SignContent, { k: 'dep' }>) {
  const st = stationById(c.station), line = lineById(c.line);
  const { tt } = lineSim(c.line);
  const stop = line.stops.indexOf(c.station);
  const now = clock.time;
  ctx.fillStyle = '#05080c';
  ctx.fillRect(0, 0, W, H);
  // Platform number block.
  ctx.fillStyle = line.color;
  ctx.fillRect(0, 0, H * 0.62, H);
  text(ctx, String(platformNo(st, line, c.dir)), H * 0.31, H * 0.42, H * 0.56, { align: 'center', color: '#fff', weight: 800 });
  text(ctx, 'のりば', H * 0.31, H * 0.84, H * 0.14, { align: 'center', color: '#fff', weight: 700 });
  const x0 = H * 0.75;
  const boarding = boards(line, st, c.dir);
  const list = boarding ? nextDepartures(tt, stop, c.dir, now, 2) : nextArrivals(tt, stop, c.dir, now, 2);
  const dest = terminusOf(line, c.dir);
  const rowH = H * 0.3;
  list.forEach((d, i) => {
    const y = H * 0.2 + i * rowH;
    text(ctx, i === 0 ? '先発' : '次発', x0, y, rowH * 0.5, { color: i === 0 ? LEDG : '#9fb3c8' });
    text(ctx, formatClock(boarding ? d.dep : d.arr), x0 + W * 0.11, y, rowH * 0.72, { color: '#fff', weight: 800 });
    if (boarding) {
      text(ctx, '普通', x0 + W * 0.29, y, rowH * 0.56, { color: AMBER });
      text(ctx, dest.nameJa, x0 + W * 0.41, y, rowH * 0.72, { color: '#fff', weight: 800, maxW: W * 0.2 });
      text(ctx, dest.nameRomaji, x0 + W * 0.63, y + rowH * 0.06, rowH * 0.42, { color: '#cfd8e3', weight: 600, maxW: W - x0 - W * 0.65 });
    } else {
      text(ctx, '当駅止まり', x0 + W * 0.29, y, rowH * 0.62, { color: AMBER, maxW: W * 0.24 });
      text(ctx, 'Terminates here', x0 + W * 0.55, y + rowH * 0.06, rowH * 0.42, { color: '#cfd8e3', weight: 600, maxW: W - x0 - W * 0.57 });
    }
  });
  // Status line, driven by the actual train.
  const first = list[0];
  let ja = '', en = '';
  if (first) {
    if (now >= first.arr) {
      ja = boarding ? '電車が停車中です' : 'この電車にはご乗車になれません';
      en = boarding ? `Now boarding — departs ${formatClock(first.dep)}` : 'Not in service — please do not board';
    } else if (first.arr - now < 45) {
      if (Math.floor(now * 2) % 2 === 0) {
        ja = 'まもなく電車がまいります';
        en = 'A train is arriving';
      }
    } else {
      const m = Math.ceil((first.arr - now) / 60);
      ja = `つぎの電車は 約${m}分後に到着します`;
      en = `Next train in about ${m} min`;
    }
  }
  text(ctx, ja, x0, H * 0.83, H * 0.17, { color: AMBER, maxW: W * 0.48 });
  text(ctx, en, W - H * 0.08, H * 0.84, H * 0.14, { color: '#cfd8e3', weight: 600, align: 'right', maxW: W * 0.34 });
}

function drawDepAll(ctx: Ctx, W: number, H: number, c: Extract<SignContent, { k: 'depAll' }>) {
  const st = stationById(c.station);
  const now = clock.time;
  ctx.fillStyle = '#0a1422';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#0d3b66';
  ctx.fillRect(0, 0, W, H * 0.14);
  text(ctx, '発車案内  Departures', H * 0.05, H * 0.075, H * 0.085, { color: '#fff' });
  text(ctx, formatClock(now), W - H * 0.05, H * 0.075, H * 0.1, { color: '#fff', align: 'right', weight: 800 });
  const rows: { line: LineDef; dir: Dir }[] = [];
  for (const l of linesAt(st.id)) for (const dir of ['down', 'up'] as Dir[]) if (boards(l, st, dir)) rows.push({ line: l, dir });
  const rh = (H * 0.84) / Math.max(rows.length, 2);
  rows.forEach((r, i) => {
    const y = H * 0.15 + rh * (i + 0.5);
    const { tt } = lineSim(r.line.id);
    const deps = nextDepartures(tt, r.line.stops.indexOf(st.id), r.dir, now, 2);
    const rr2 = Math.min(rh * 0.3, H * 0.09);
    lineBadge(ctx, H * 0.11, y, rr2, r.line);
    const t = terminusOf(r.line, r.dir);
    text(ctx, `${t.nameJa} 方面`, H * 0.24, y - rr2 * 0.45, rr2 * 1.0, { color: '#fff', maxW: W * 0.34 });
    text(ctx, `for ${t.nameRomaji}`, H * 0.24, y + rr2 * 0.65, rr2 * 0.6, { color: '#9fb3c8', weight: 600, maxW: W * 0.34 });
    text(ctx, `${platformNo(st, r.line, r.dir)}番線`, W * 0.5, y, rr2 * 0.9, { color: '#cfd8e3' });
    deps.forEach((d, k) => {
      const at = now >= d.arr;
      text(ctx, formatClock(d.dep), W * (0.66 + k * 0.17), y, rr2 * 1.25, { color: k === 0 ? (at ? LEDG : '#fff') : '#9fb3c8', weight: 800 });
    });
  });
}

function drawDest(ctx: Ctx, W: number, H: number, c: Extract<SignContent, { k: 'dest' }>) {
  ctx.fillStyle = '#060606';
  ctx.fillRect(0, 0, W, H);
  if (c.dir === 'none') {
    text(ctx, '回送', W * 0.3, H / 2, H * 0.62, { align: 'center', color: '#ff8f00' });
    text(ctx, 'Not in service', W * 0.7, H / 2, H * 0.3, { align: 'center', color: '#ff8f00', weight: 600, maxW: W * 0.5 });
    return;
  }
  const line = lineById(c.line), t = terminusOf(line, c.dir);
  ctx.fillStyle = line.color;
  ctx.fillRect(0, 0, W * 0.22, H);
  text(ctx, '普通', W * 0.11, H * 0.36, H * 0.42, { align: 'center', color: '#fff', maxW: W * 0.2 });
  text(ctx, 'Local', W * 0.11, H * 0.78, H * 0.24, { align: 'center', color: '#fff', weight: 600, maxW: W * 0.2 });
  text(ctx, t.nameJa, W * 0.61, H * 0.38, H * 0.5, { align: 'center', color: '#ffb300', maxW: W * 0.74 });
  text(ctx, t.nameRomaji, W * 0.61, H * 0.8, H * 0.22, { align: 'center', color: '#ffb300', weight: 600, maxW: W * 0.74 });
}

function drawLcd(ctx: Ctx, W: number, H: number, c: Extract<SignContent, { k: 'lcd' }>) {
  const line = lineById(c.line);
  const { tt } = lineSim(c.line);
  const st = trainStateAt(tt, c.train, clock.time);
  const p = st.phase;
  ctx.fillStyle = '#0b1220';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = line.color;
  ctx.fillRect(0, 0, W, H * 0.2);
  const inService = p.kind === 'run' ? p.inService : p.role !== 'reverse' && p.role !== 'arrival';
  const dest = terminusOf(line, p.dir);
  text(ctx, inService ? `${line.nameJa}  ${dest.nameJa} ゆき` : line.nameJa, H * 0.12, H * 0.105, H * 0.13, { color: '#fff', maxW: W * 0.55 });
  text(ctx, inService ? `${line.nameEn} for ${dest.nameRomaji}` : line.nameEn, W - H * 0.12, H * 0.105, H * 0.1, { color: '#fff', align: 'right', weight: 600, maxW: W * 0.4 });
  let label = '', ja = '', en = '', num = '';
  const stopIdx = p.kind === 'run' ? p.toStop : p.stop;
  if (stopIdx >= 0 && (p.kind === 'dwell' || p.inService)) {
    const s = stationById(line.stops[stopIdx]);
    ja = s.nameJa;
    en = s.nameRomaji;
    num = s.numbers[line.id];
    const terminating = p.kind === 'dwell' ? p.role === 'arrival' : dest.id === s.id;
    label = p.kind === 'dwell' ? (terminating ? '終点  Last stop' : 'ただいま  Now at') : terminating ? 'つぎは 終点  Next (last stop)' : 'つぎは  Next';
  } else {
    label = '';
    ja = '回送';
    en = 'Not in service';
  }
  text(ctx, label, H * 0.15, H * 0.36, H * 0.12, { color: '#9fb3c8', weight: 600 });
  let x = H * 0.15;
  if (num) {
    numBadge(ctx, x, H * 0.47, H * 0.4, num, line.color);
    x += H * 0.5;
  }
  text(ctx, ja, x, H * 0.62, H * 0.34, { color: '#fff', weight: 800, maxW: W * 0.45 });
  text(ctx, en, W - H * 0.15, H * 0.66, H * 0.17, { color: '#dfe8f3', weight: 600, align: 'right', maxW: W * 0.4 });
  if (p.kind === 'dwell' && p.doors) text(ctx, 'ドアが開きます  Doors open', W / 2, H * 0.9, H * 0.1, { color: '#ffb300', align: 'center', weight: 600 });
}

export function drawSign(ctx: Ctx, W: number, H: number, c: SignContent) {
  ctx.clearRect(0, 0, W, H);
  switch (c.k) {
    case 'name': return drawName(ctx, W, H, c);
    case 'dir': return drawDir(ctx, W, H, c);
    case 'guide': return drawGuide(ctx, W, H, c);
    case 'entrance': return drawEntrance(ctx, W, H, c);
    case 'faremap': return drawFareMap(ctx, W, H, c);
    case 'shop': return drawShop(ctx, W, H, c);
    case 'poster': return drawPoster(ctx, W, H, c.v);
    case 'machine': return drawMachine(ctx, W, H, c.v);
    case 'mural': return drawMural(ctx, W, H, c);
    case 'label':
      ctx.fillStyle = c.bg;
      ctx.fillRect(0, 0, W, H);
      text(ctx, c.text, W / 2, c.sub ? H * 0.4 : H / 2, H * (c.sub ? 0.46 : 0.6), { align: 'center', color: c.fg, weight: 800, maxW: W * 0.92 });
      if (c.sub) text(ctx, c.sub, W / 2, H * 0.8, H * 0.22, { align: 'center', color: c.fg, weight: 600, maxW: W * 0.92 });
      return;
    case 'clock': return drawClock(ctx, W, H);
    case 'dep': return drawDep(ctx, W, H, c);
    case 'depAll': return drawDepAll(ctx, W, H, c);
    case 'dest': return drawDest(ctx, W, H, c);
    case 'lcd': return drawLcd(ctx, W, H, c);
  }
}

/** Pixel size for a sign of w × h metres. */
export function signPixels(w: number, h: number): [number, number] {
  const ppm = Math.min(360, Math.max(110, 900 / Math.max(w, h)));
  const W = Math.min(1024, Math.max(64, Math.round(w * ppm)));
  return [W, Math.max(32, Math.round((W * h) / w))];
}

export { OPERATOR };
