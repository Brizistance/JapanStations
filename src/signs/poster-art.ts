// The posters the game paints itself: eight designs for places and campaigns of Kawaminato, each
// with its own illustration, lettering and layout. Each one lays itself out upright (a poster case)
// or wide (an outdoor screen, a platform board): the picture at a focal point, the words in a block.

type Ctx = CanvasRenderingContext2D;
type Face = 'gothic' | 'mincho';
interface Box { x: number; y: number; w: number; h: number }
/** Where things go: the picture round (cx, cy) within r, the words in T. u: the short side. */
interface Lay { W: number; H: number; u: number; tall: boolean; cx: number; cy: number; r: number; T: Box }

const GOTHIC = '"Hiragino Sans","Yu Gothic UI","Yu Gothic","Meiryo","Noto Sans JP",system-ui,sans-serif';
const MINCHO = '"Hiragino Mincho ProN","Yu Mincho","Noto Serif JP","MS PMincho",serif';

function lay(W: number, H: number): Lay {
  const tall = H > W * 1.1, u = Math.min(W, H);
  return tall
    ? { W, H, u, tall, cx: W / 2, cy: H * 0.34, r: W * 0.36, T: { x: W * 0.07, y: H * 0.6, w: W * 0.86, h: H * 0.33 } }
    : { W, H, u, tall, cx: W * 0.27, cy: H * 0.5, r: H * 0.36, T: { x: W * 0.53, y: H * 0.12, w: W * 0.42, h: H * 0.76 } };
}

function put(ctx: Ctx, s: string, x: number, y: number, px: number, o: { color: string; weight?: number; face?: Face; align?: CanvasTextAlign; maxW?: number }) {
  ctx.font = `${o.weight ?? 800} ${Math.max(4, px)}px ${o.face === 'mincho' ? MINCHO : GOTHIC}`;
  ctx.textAlign = o.align ?? 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = o.color;
  const w = ctx.measureText(s).width;
  if (o.maxW && w > o.maxW) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(o.maxW / w, 1);
    ctx.fillText(s, 0, 0);
    ctx.restore();
    return o.maxW;
  }
  ctx.fillText(s, x, y);
  return w;
}

/** A row of the words: text, size as a share of the block's height, colour; or a pill (a rounded label). */
type Row = { s: string; k: number; color: string; weight?: number; face?: Face; pill?: string; gap?: number };
/** The rows one under another, centred in the block. */
function words(ctx: Ctx, T: Box, rows: Row[]) {
  const hs = rows.map((r) => T.h * r.k * (r.pill ? 1.9 : 1.22) + T.h * (r.gap ?? 0));
  let y = T.y + (T.h - hs.reduce((a, v) => a + v, 0)) / 2;
  rows.forEach((r, i) => {
    const px = T.h * r.k, cy = y + T.h * (r.gap ?? 0) + (hs[i] - T.h * (r.gap ?? 0)) / 2, cx = T.x + T.w / 2;
    if (r.pill) {
      ctx.font = `800 ${px}px ${GOTHIC}`;
      const w = Math.min(T.w, ctx.measureText(r.s).width + px * 1.8), h = px * 1.7;
      ctx.fillStyle = r.pill;
      ctx.beginPath();
      ctx.roundRect(cx - w / 2, cy - h / 2, w, h, h / 2);
      ctx.fill();
      put(ctx, r.s, cx, cy + px * 0.04, px, { color: r.color, maxW: w - px * 1.2 });
    } else put(ctx, r.s, cx, cy, px, { color: r.color, weight: r.weight, face: r.face, maxW: T.w });
    y += hs[i];
  });
}
/** Latin small capitals, spaced out, as under a Japanese title. */
const spaced = (s: string) => s.toUpperCase().split('').join(' ');

const grad = (ctx: Ctx, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]) => {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [t, c] of stops) g.addColorStop(t, c);
  return g;
};
const glow = (ctx: Ctx, x: number, y: number, r: number, c: string) => {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, c);
  g.addColorStop(1, c.replace(/[\d.]+\)$/, '0)')); // (the same colour, clear: fading to black would grey the edge)
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
};
const rnd = (seed: number) => {
  let s = seed >>> 0 || 1;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) + 0.5) / 4294967296;
};
const disc = (ctx: Ctx, x: number, y: number, r: number, c: string) => {
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
};

/** A fish seen from the side, nose towards `dir`. */
function fish(ctx: Ctx, x: number, y: number, len: number, c: string, dir: 1 | -1 = 1, fat = 0.3) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.moveTo(len * 0.5, 0);
  ctx.bezierCurveTo(len * 0.25, -len * fat, -len * 0.2, -len * fat * 0.8, -len * 0.36, 0);
  ctx.bezierCurveTo(-len * 0.2, len * fat * 0.8, len * 0.25, len * fat, len * 0.5, 0);
  ctx.moveTo(-len * 0.3, 0);
  ctx.lineTo(-len * 0.55, -len * 0.22);
  ctx.lineTo(-len * 0.47, 0);
  ctx.lineTo(-len * 0.55, len * 0.22);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ── 1. Kawaminato Aquarium: a whale shark in the big tank ──────────────────────────────────────
function aquarium(ctx: Ctx, L: Lay) {
  const { W, H, u, cx, cy, r } = L, q = rnd(11);
  ctx.fillStyle = grad(ctx, 0, 0, 0, H, [[0, '#35b6e6'], [0.45, '#0e5fa6'], [1, '#04193a']]);
  ctx.fillRect(0, 0, W, H);
  // Shafts of light from the surface.
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  for (let i = 0; i < 6; i++) {
    const x = W * (0.05 + i * 0.18) + q() * W * 0.05, w = W * (0.04 + q() * 0.06);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + w, 0);
    ctx.lineTo(x + w * 2.4 - W * 0.12, H * 0.8);
    ctx.lineTo(x - W * 0.16, H * 0.8);
    ctx.fill();
  }
  // The school, then the whale shark over it.
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 1.5 + 2.2, d = r * (1.05 + q() * 0.4);
    fish(ctx, cx + Math.cos(a) * d * 1.25, cy + Math.sin(a) * d * 0.7, u * (0.035 + q() * 0.02), i % 3 ? '#bfe9f7' : '#ffd66b', -1);
  }
  fish(ctx, cx, cy, r * 2.0, '#0b2c52', 1, 0.2);
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx + r * 0.1, cy + r * 0.2, r * 0.75, r * 0.14, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(200,225,240,0.5)';
  ctx.fill();
  ctx.restore();
  for (let i = 0; i < 40; i++) disc(ctx, cx - r * 0.5 + q() * r * 1.2, cy - r * 0.22 + q() * r * 0.26, u * 0.006, 'rgba(235,245,255,0.75)');
  disc(ctx, cx + r * 0.78, cy - r * 0.05, u * 0.012, '#eaf6ff');
  // Jellyfish and bubbles.
  for (const [jx, jy, js] of [[0.84, 0.16, 1], [0.1, 0.5, 0.7]] as const) {
    const x = W * jx, y = H * jy, s = u * 0.06 * js;
    ctx.fillStyle = 'rgba(255,200,230,0.55)';
    ctx.beginPath();
    ctx.arc(x, y, s, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,220,240,0.5)';
    ctx.lineWidth = Math.max(1, s * 0.07);
    for (let k = -2; k <= 2; k++) {
      ctx.beginPath();
      ctx.moveTo(x + k * s * 0.35, y);
      ctx.quadraticCurveTo(x + k * s * 0.5 + s * 0.2, y + s, x + k * s * 0.3, y + s * 1.9);
      ctx.stroke();
    }
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = Math.max(1, u * 0.004);
  for (let i = 0; i < 16; i++) {
    ctx.beginPath();
    ctx.arc(q() * W, q() * H, u * (0.006 + q() * 0.014), 0, Math.PI * 2);
    ctx.stroke();
  }
  words(ctx, L.T, [
    { s: 'ひかりの海へ、もぐろう。', k: 0.1, color: '#cfeeff', weight: 600 },
    { s: '川湊水族館', k: 0.26, color: '#ffffff', gap: 0.03 },
    { s: spaced('Kawaminato Aquarium'), k: 0.07, color: '#9fd8f2', weight: 600 },
    { s: '川湊港駅 徒歩5分', k: 0.085, color: '#0a3f7a', pill: '#ffffff', gap: 0.06 },
  ]);
}

// ── 2. MINACA, the IC card ─────────────────────────────────────────────────────────────────────
function minaca(ctx: Ctx, L: Lay) {
  const { W, H, u, cx, cy, r } = L;
  ctx.fillStyle = '#fff6f9';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#ff7aa2';
  ctx.beginPath();
  if (L.tall) { ctx.moveTo(0, 0); ctx.lineTo(W, 0); ctx.lineTo(W, H * 0.42); ctx.lineTo(0, H * 0.6); }
  else { ctx.moveTo(0, 0); ctx.lineTo(W * 0.58, 0); ctx.lineTo(W * 0.46, H); ctx.lineTo(0, H); }
  ctx.fill();
  disc(ctx, cx - r * 0.9, cy - r * 0.8, r * 0.5, 'rgba(255,255,255,0.16)');
  disc(ctx, cx + r * 0.9, cy + r * 0.7, r * 0.34, 'rgba(255,255,255,0.14)');
  // The card, tilted, with the ripple of a touch above its corner.
  const cw = r * 1.75, ch = cw * 0.63;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.2);
  ctx.fillStyle = 'rgba(90,10,40,0.28)';
  ctx.beginPath();
  ctx.roundRect(-cw / 2 + u * 0.02, -ch / 2 + u * 0.03, cw, ch, ch * 0.09);
  ctx.fill();
  ctx.fillStyle = grad(ctx, -cw / 2, -ch / 2, cw / 2, ch / 2, [[0, '#ffffff'], [1, '#ffe3ec']]);
  ctx.beginPath();
  ctx.roundRect(-cw / 2, -ch / 2, cw, ch, ch * 0.09);
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = '#ff5d8f';
  ctx.lineWidth = ch * 0.1;
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    ctx.globalAlpha = 1 - i * 0.28;
    ctx.beginPath();
    ctx.moveTo(-cw * 0.6, ch * (0.05 + i * 0.17));
    ctx.bezierCurveTo(-cw * 0.2, -ch * (0.25 - i * 0.17), cw * 0.1, ch * (0.4 + i * 0.17), cw * 0.6, ch * (-0.05 + i * 0.17));
    ctx.stroke();
  }
  ctx.restore();
  put(ctx, 'MINACA', -cw * 0.42, -ch * 0.27, ch * 0.2, { color: '#d81b60', align: 'left', weight: 900 });
  put(ctx, 'ミナカ', cw * 0.42, -ch * 0.27, ch * 0.1, { color: '#d81b60', align: 'right', weight: 700 });
  ctx.restore();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(1.5, u * 0.012);
  ctx.lineCap = 'round';
  for (let i = 1; i <= 3; i++) {
    ctx.globalAlpha = 1 - i * 0.22;
    ctx.beginPath();
    ctx.arc(cx + cw * 0.36, cy - ch * 0.62, u * 0.04 * i, -Math.PI * 0.85, -Math.PI * 0.15);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  words(ctx, L.T, [
    { s: 'ピッと、ひとつで。', k: 0.2, color: '#3a0d1e' },
    { s: 'ICカード ミナカ', k: 0.13, color: '#d81b60', gap: 0.04 },
    { s: spaced('Minaca — tap and go'), k: 0.065, color: '#8a4a5e', weight: 600 },
    { s: 'チャージは券売機で', k: 0.08, color: '#ffffff', pill: '#d81b60', gap: 0.06 },
  ]);
}

// ── 3. Yanagisuji Festival: lanterns under the willows at dusk ─────────────────────────────────
function lantern(ctx: Ctx, x: number, y: number, s: number, paper: string, ch?: string) {
  glow(ctx, x, y, s * 2.2, 'rgba(255,190,90,0.35)');
  ctx.fillStyle = paper;
  ctx.beginPath();
  ctx.ellipse(x, y, s * 0.72, s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(60,20,10,0.22)';
  ctx.lineWidth = Math.max(1, s * 0.03);
  for (let k = -3; k <= 3; k++) {
    ctx.beginPath();
    ctx.ellipse(x, y + k * s * 0.24, s * 0.72 * Math.sqrt(Math.max(0.05, 1 - (k * 0.24) ** 2)), s * 0.05, 0, 0, Math.PI);
    ctx.stroke();
  }
  ctx.fillStyle = '#231815';
  ctx.fillRect(x - s * 0.34, y - s * 1.1, s * 0.68, s * 0.16);
  ctx.fillRect(x - s * 0.34, y + s * 0.94, s * 0.68, s * 0.16);
  if (ch) put(ctx, ch, x, y + s * 0.04, s * 0.8, { color: '#231815', face: 'mincho', weight: 900 });
}
function festival(ctx: Ctx, L: Lay) {
  const { W, H, u, cx, cy, r } = L, q = rnd(31);
  ctx.fillStyle = grad(ctx, 0, 0, 0, H, [[0, '#141a45'], [0.55, '#3c2459'], [0.85, '#a8473a'], [1, '#e08a4a']]);
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 50; i++) disc(ctx, q() * W, q() * H * 0.5, u * 0.003 * (0.5 + q()), 'rgba(255,255,255,0.7)');
  // Willow strands hanging from the top.
  ctx.lineCap = 'round';
  for (let i = 0; i < 26; i++) {
    const x = W * (i / 25) + (q() - 0.5) * W * 0.04, len = H * (0.18 + q() * 0.3), sway = (q() - 0.5) * W * 0.08;
    ctx.strokeStyle = `rgba(${150 + Math.floor(q() * 40)},${190 + Math.floor(q() * 30)},110,0.75)`;
    ctx.lineWidth = Math.max(1, u * 0.004);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.quadraticCurveTo(x + sway, len * 0.5, x + sway * 0.4, len);
    ctx.stroke();
    for (let t = 0.15; t < 1; t += 0.09) {
      const lx = x + sway * (1.6 * t * (1 - t) + 0.4 * t * t) * 1.0, ly = len * t;
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(lx + u * 0.012 * (q() < 0.5 ? 1 : -1), ly + u * 0.016);
      ctx.stroke();
    }
  }
  // Strings of small lanterns, and the big one.
  for (const [y0, sag] of [[cy - r * 1.05, 0.1], [cy + r * 0.95, 0.07]] as const) {
    ctx.strokeStyle = '#231815';
    ctx.lineWidth = Math.max(1, u * 0.004);
    ctx.beginPath();
    ctx.moveTo(0, y0);
    ctx.quadraticCurveTo(W / 2, y0 + H * sag * 2, W, y0);
    ctx.stroke();
    const n = L.tall ? 7 : 12;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      lantern(ctx, W * t, y0 + H * sag * 4 * t * (1 - t) + u * 0.035, u * 0.028, i % 2 ? '#f7ecd2' : '#e23b2e');
    }
  }
  lantern(ctx, cx, cy, r * 0.62, '#f7ecd2', '祭');
  words(ctx, L.T, [
    { s: '柳の下、灯りがともる。', k: 0.085, color: '#f2d9b0', weight: 600, face: 'mincho' },
    { s: '柳筋まつり', k: 0.27, color: '#f7ecd2', face: 'mincho', weight: 900, gap: 0.03 },
    { s: spaced('Yanagisuji Festival'), k: 0.065, color: '#f2c38a', weight: 600 },
    { s: '十月 第二土曜・日曜', k: 0.085, color: '#ffffff', pill: '#c8241c', gap: 0.06 },
    { s: '柳筋通り一帯 ・ 屋台 ・ 山車巡行', k: 0.06, color: '#f7ecd2', weight: 600, gap: 0.03 },
  ]);
}

// ── 4. Hibarino Hills Residences: flats on a green hill ────────────────────────────────────────
function residences(ctx: Ctx, L: Lay) {
  const { W, H, u, cx, cy, r, T } = L;
  ctx.fillStyle = grad(ctx, 0, 0, 0, H, [[0, '#8fd0f2'], [0.6, '#dff3fb'], [1, '#f3faf2']]);
  ctx.fillRect(0, 0, W, H);
  glow(ctx, cx + r * 0.9, cy - r * 0.9, r * 0.9, 'rgba(255,250,210,0.9)');
  for (const [x, y, s] of [[0.2, 0.1, 1], [0.7, 0.18, 0.7]] as const) for (const k of [-1, 0, 1]) disc(ctx, W * x + k * u * 0.05 * s, H * y + Math.abs(k) * u * 0.012, u * 0.045 * s, 'rgba(255,255,255,0.85)');
  const ground = cy + r * 0.75;
  const hill = (c: string, y: number, amp: number, ph: number) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(0, y);
    for (let x = 0; x <= W; x += W / 24) ctx.lineTo(x, y - Math.sin((x / W) * Math.PI * 2 + ph) * amp);
    ctx.lineTo(W, H);
    ctx.fill();
  };
  hill('#a9dba0', ground - r * 0.12, r * 0.14, 0.6);
  // Three blocks of flats: balconies in rows, a stair core, the middle one tallest.
  for (const [dx, hgt, wid] of [[-0.62, 0.95, 0.42], [0, 1.35, 0.5], [0.6, 1.05, 0.42]] as const) {
    const bw = r * wid, bh = r * hgt, x0 = cx + r * dx - bw / 2, y0 = ground - bh;
    ctx.fillStyle = '#f7f2e7';
    ctx.fillRect(x0, y0, bw, bh);
    ctx.fillStyle = '#d9cfbd';
    ctx.fillRect(x0 + bw * 0.44, y0 - r * 0.05, bw * 0.12, bh + r * 0.05);
    const rows = Math.round(bh / (r * 0.085));
    for (let k = 0; k < rows; k++) {
      const y = y0 + (bh * (k + 0.2)) / rows, h = (bh / rows) * 0.5;
      ctx.fillStyle = '#9cc7dd';
      ctx.fillRect(x0 + bw * 0.06, y, bw * 0.34, h);
      ctx.fillRect(x0 + bw * 0.6, y, bw * 0.34, h);
      ctx.fillStyle = '#c9bfae';
      ctx.fillRect(x0 + bw * 0.04, y + h, bw * 0.38, h * 0.22);
      ctx.fillRect(x0 + bw * 0.58, y + h, bw * 0.38, h * 0.22);
    }
  }
  hill('#6dba72', ground + r * 0.06, r * 0.07, 2.2);
  for (let i = 0; i < 9; i++) {
    const x = cx - r * 1.15 + i * r * 0.29, y = ground + r * 0.02 + Math.sin(i * 1.7) * r * 0.03;
    disc(ctx, x, y - r * 0.09, r * 0.09, i % 2 ? '#3f8f4d' : '#4fa35a');
  }
  // Skylarks.
  ctx.strokeStyle = '#5a4a3a';
  ctx.lineWidth = Math.max(1, u * 0.005);
  for (const [x, y, s] of [[-0.8, -1.0, 1], [-0.45, -1.2, 0.7], [0.3, -1.15, 0.8]] as const) {
    ctx.beginPath();
    ctx.moveTo(cx + r * x - u * 0.03 * s, cy + r * y);
    ctx.quadraticCurveTo(cx + r * x - u * 0.012 * s, cy + r * y - u * 0.02 * s, cx + r * x, cy + r * y);
    ctx.quadraticCurveTo(cx + r * x + u * 0.012 * s, cy + r * y - u * 0.02 * s, cx + r * x + u * 0.03 * s, cy + r * y);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.roundRect(T.x - u * 0.02, T.y - u * 0.01, T.w + u * 0.04, T.h + u * 0.02, u * 0.02);
  ctx.fill();
  words(ctx, T, [
    { s: '新築分譲マンション', k: 0.075, color: '#2f7d3b', weight: 700 },
    { s: 'ひばり野の丘に住む', k: 0.19, color: '#14401c', face: 'mincho', weight: 900, gap: 0.03 },
    { s: spaced('Hibarino Hills Residences'), k: 0.06, color: '#5b7f61', weight: 600 },
    { s: '雲雀野駅 徒歩8分', k: 0.08, color: '#ffffff', pill: '#2f7d3b', gap: 0.06 },
    { s: '全戸南向き ・ 緑地に隣接 ・ モデルルーム公開中', k: 0.055, color: '#3c5a41', weight: 600, gap: 0.03 },
  ]);
}

// ── 5. Kawaminato University open lectures: the brick hall and its clock tower ─────────────────
function lectures(ctx: Ctx, L: Lay) {
  const { W, H, u, cx, cy, r, T } = L;
  ctx.fillStyle = '#f4ecd9';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#7b1e28';
  if (L.tall) ctx.fillRect(0, 0, W, H * 0.56);
  else ctx.fillRect(0, 0, W * 0.5, H);
  glow(ctx, cx, cy, r * 1.5, 'rgba(255,220,170,0.22)');
  const ground = cy + r * 0.8, brick = '#b5553c', stone = '#f1e6cf';
  ctx.fillStyle = brick;
  ctx.fillRect(cx - r * 1.05, ground - r * 0.75, r * 2.1, r * 0.75);
  ctx.fillRect(cx - r * 0.24, ground - r * 1.55, r * 0.48, r * 1.55);
  ctx.fillStyle = '#3a2a2a';
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.3, ground - r * 1.55);
  ctx.lineTo(cx, ground - r * 1.95);
  ctx.lineTo(cx + r * 0.3, ground - r * 1.55);
  ctx.fill();
  ctx.fillRect(cx - r * 1.1, ground - r * 0.8, r * 2.2, r * 0.07);
  disc(ctx, cx, ground - r * 1.28, r * 0.16, stone);
  ctx.strokeStyle = '#3a2a2a';
  ctx.lineWidth = Math.max(1, r * 0.025);
  ctx.beginPath();
  ctx.moveTo(cx, ground - r * 1.28);
  ctx.lineTo(cx, ground - r * 1.4);
  ctx.moveTo(cx, ground - r * 1.28);
  ctx.lineTo(cx + r * 0.08, ground - r * 1.24);
  ctx.stroke();
  ctx.fillStyle = stone;
  for (let i = 0; i < 8; i++) {
    if (i === 3 || i === 4) continue;
    const x = cx - r * 0.96 + i * r * 0.25;
    for (const y of [ground - r * 0.62, ground - r * 0.3]) {
      ctx.beginPath();
      ctx.roundRect(x, y, r * 0.14, r * 0.22, [r * 0.07, r * 0.07, 0, 0]);
      ctx.fill();
    }
  }
  ctx.beginPath();
  ctx.roundRect(cx - r * 0.12, ground - r * 0.42, r * 0.24, r * 0.42, [r * 0.12, r * 0.12, 0, 0]);
  ctx.fill();
  ctx.fillStyle = '#d8ccb4';
  ctx.fillRect(cx - r * 1.2, ground, r * 2.4, r * 0.06);
  for (const dx of [-1.15, 1.15]) {
    ctx.fillStyle = '#4a3426';
    ctx.fillRect(cx + r * dx - r * 0.02, ground - r * 0.3, r * 0.04, r * 0.3);
    disc(ctx, cx + r * dx, ground - r * 0.42, r * 0.2, '#e3b83a');
  }
  words(ctx, T, [
    { s: spaced('Kawaminato University'), k: 0.06, color: '#7b1e28', weight: 700 },
    { s: '公開講座', k: 0.27, color: '#3d0f14', face: 'mincho', weight: 900, gap: 0.02 },
    { s: '川湊大学 2027年度 前期', k: 0.085, color: '#7b1e28', weight: 700 },
    { s: '港町の歴史を読む ／ 海と気候の科学 ／ ことばと社会', k: 0.055, color: '#4a3a30', weight: 600, gap: 0.05 },
    { s: '受講生募集中', k: 0.085, color: '#ffffff', pill: '#7b1e28', gap: 0.05 },
  ]);
  ctx.fillStyle = '#7b1e28';
  ctx.fillRect(T.x, T.y + T.h + u * 0.012, T.w, Math.max(1, u * 0.004));
}

// ── 6. Manner poster: don't walk with your phone ───────────────────────────────────────────────
function manner(ctx: Ctx, L: Lay) {
  const { W, H, cx, cy, r, T } = L;
  ctx.fillStyle = '#ffdf3d';
  ctx.fillRect(0, 0, W, H);
  const band = H * 0.055;
  for (const y of [0, H - band * 2.3]) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, y, W, band);
    ctx.clip();
    ctx.fillStyle = '#1b1b1b';
    for (let x = -band * 2; x < W + band; x += band * 1.6) {
      ctx.beginPath();
      ctx.moveTo(x, y + band);
      ctx.lineTo(x + band, y);
      ctx.lineTo(x + band * 1.8, y);
      ctx.lineTo(x + band * 0.8, y + band);
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.fillStyle = '#1b1b1b';
  ctx.fillRect(0, H - band * 1.3, W, band * 1.3);
  put(ctx, '川湊メトロ マナー向上運動', W / 2, H - band * 0.62, band * 0.62, { color: '#ffffff', weight: 700, maxW: W * 0.9 });
  // The figure: head down over a lit phone, mid-stride, in a prohibition ring.
  const R = r * 0.92;
  disc(ctx, cx, cy, R, '#ffffff');
  const k = R / 100, px = (x: number) => cx + x * k, py = (y: number) => cy + y * k;
  ctx.fillStyle = '#1b1b1b';
  ctx.strokeStyle = '#1b1b1b';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  disc(ctx, px(6), py(-52), 13 * k, '#1b1b1b');
  ctx.lineWidth = 22 * k;
  ctx.beginPath();
  ctx.moveTo(px(-2), py(-30));
  ctx.lineTo(px(-8), py(12));
  ctx.stroke();
  ctx.lineWidth = 13 * k;
  ctx.beginPath();
  ctx.moveTo(px(-8), py(14));
  ctx.lineTo(px(-26), py(40));
  ctx.lineTo(px(-34), py(62));
  ctx.moveTo(px(-8), py(14));
  ctx.lineTo(px(10), py(38));
  ctx.lineTo(px(14), py(62));
  ctx.stroke();
  ctx.lineWidth = 10 * k;
  ctx.beginPath();
  ctx.moveTo(px(0), py(-26));
  ctx.lineTo(px(16), py(-8));
  ctx.lineTo(px(32), py(-18));
  ctx.stroke();
  ctx.fillStyle = '#1b1b1b';
  ctx.save();
  ctx.translate(px(36), py(-26));
  ctx.rotate(-0.5);
  ctx.fillRect(-5 * k, -11 * k, 10 * k, 22 * k);
  ctx.fillStyle = '#5bc8ff';
  ctx.fillRect(-3.4 * k, -9 * k, 6.8 * k, 16 * k);
  ctx.restore();
  ctx.strokeStyle = '#e02020';
  ctx.lineWidth = R * 0.13;
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.93, 0, Math.PI * 2);
  ctx.moveTo(cx - R * 0.66, cy - R * 0.66);
  ctx.lineTo(cx + R * 0.66, cy + R * 0.66);
  ctx.stroke();
  words(ctx, { x: T.x, y: T.y, w: T.w, h: T.h - (L.tall ? band * 1.4 : 0) }, [
    { s: '歩きスマホは', k: 0.2, color: '#1b1b1b', weight: 900 },
    { s: '危険です', k: 0.3, color: '#e02020', weight: 900 },
    { s: 'Please do not use your phone while walking', k: 0.06, color: '#1b1b1b', weight: 700, gap: 0.03 },
    { s: 'ホーム・階段では、立ち止まって。', k: 0.075, color: '#1b1b1b', weight: 700, gap: 0.04 },
  ]);
}

// ── 7. Hyōtanbori Gourmet Alley: a neon gourd over the lanterns ────────────────────────────────
function gourmet(ctx: Ctx, L: Lay) {
  const { W, H, u, cx, cy, r, T } = L;
  ctx.fillStyle = '#0f0d10';
  ctx.fillRect(0, 0, W, H);
  // A dark brick wall behind.
  ctx.strokeStyle = 'rgba(255,255,255,0.035)';
  ctx.lineWidth = 1;
  const bh = u * 0.035;
  for (let y = 0, k = 0; y < H; y += bh, k++) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    for (let x = (k % 2) * bh; x < W; x += bh * 2) {
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + bh);
    }
    ctx.stroke();
  }
  glow(ctx, cx, cy, r * 1.7, 'rgba(255,170,60,0.22)');
  const neon = (c: string, lw: number, draw: () => void) => {
    ctx.save();
    ctx.strokeStyle = c;
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    ctx.shadowColor = c;
    ctx.shadowBlur = lw * 3.2;
    ctx.beginPath();
    draw();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = lw * 0.3;
    ctx.shadowBlur = 0;
    ctx.stroke();
    ctx.restore();
  };
  const lw = Math.max(2, r * 0.05);
  neon('#ffcf4a', lw, () => {
    ctx.arc(cx, cy + r * 0.34, r * 0.56, -Math.PI * 0.36, Math.PI * 1.36);
    ctx.arc(cx, cy - r * 0.42, r * 0.34, Math.PI * 0.68, Math.PI * 2.32);
  });
  neon('#ff4f8b', lw * 0.8, () => {
    ctx.moveTo(cx - r * 0.3, cy - r * 0.12);
    ctx.lineTo(cx + r * 0.3, cy - r * 0.12);
    ctx.moveTo(cx + r * 0.2, cy - r * 0.12);
    ctx.quadraticCurveTo(cx + r * 0.5, cy + r * 0.1, cx + r * 0.36, cy + r * 0.3);
  });
  neon('#7cff6b', lw * 0.8, () => {
    ctx.moveTo(cx, cy - r * 0.76);
    ctx.quadraticCurveTo(cx + r * 0.05, cy - r * 0.95, cx + r * 0.22, cy - r * 0.98);
  });
  // A row of red lanterns along the top edge of the wording.
  const chars = [...'串焼酒肴麺鮨'], n = L.tall ? 6 : 5, y = T.y + u * 0.035;
  for (let i = 0; i < n; i++) lantern(ctx, T.x + (T.w * (i + 0.5)) / n, y, u * 0.03, '#d7362b', chars[i]);
  ctx.save();
  ctx.shadowColor = 'rgba(255,190,70,0.8)';
  ctx.shadowBlur = u * 0.025;
  words(ctx, { x: T.x, y: T.y + u * 0.09, w: T.w, h: T.h - u * 0.09 }, [
    { s: '瓢箪堀', k: 0.3, color: '#ffe08a', weight: 900 },
    { s: 'グルメ横丁', k: 0.19, color: '#ff8fb5', weight: 900 },
    { s: spaced('Hyotanbori Gourmet Alley'), k: 0.06, color: '#7fe8ff', weight: 600, gap: 0.03 },
    { s: '瓢箪堀駅 2番出口すぐ', k: 0.085, color: '#1b1205', pill: '#ffcf4a', gap: 0.05 },
  ]);
  ctx.restore();
}

// ── 8. Harbour Morning Market: a boat coming in at sunrise ─────────────────────────────────────
function market(ctx: Ctx, L: Lay) {
  const { W, H, u, cx, cy, r, T } = L, q = rnd(81);
  const hz = cy + r * 0.25;
  ctx.fillStyle = grad(ctx, 0, 0, 0, hz, [[0, '#23457c'], [0.55, '#e9794a'], [1, '#ffd98a']]);
  ctx.fillRect(0, 0, W, hz);
  glow(ctx, cx, hz, r * 1.6, 'rgba(255,240,190,0.75)');
  // Rays, then the sun on the horizon.
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, hz);
  ctx.clip();
  ctx.fillStyle = 'rgba(255,235,170,0.16)';
  for (let i = 0; i < 12; i++) {
    const a = Math.PI + (i / 12) * Math.PI, b = a + 0.09;
    ctx.beginPath();
    ctx.moveTo(cx, hz);
    ctx.lineTo(cx + Math.cos(a) * W * 1.5, hz + Math.sin(a) * W * 1.5);
    ctx.lineTo(cx + Math.cos(b) * W * 1.5, hz + Math.sin(b) * W * 1.5);
    ctx.fill();
  }
  disc(ctx, cx, hz, r * 0.5, '#fff3c4');
  ctx.restore();
  ctx.fillStyle = grad(ctx, 0, hz, 0, H, [[0, '#2f77a8'], [1, '#0f2f55']]);
  ctx.fillRect(0, hz, W, H - hz);
  for (let i = 0; i < 26; i++) {
    const t = i / 26, y = hz + (H - hz) * t * t + u * 0.006, w = r * (0.5 + t * 1.6) * (0.5 + q() * 0.5);
    ctx.fillStyle = `rgba(255,225,150,${(0.5 - t * 0.4).toFixed(2)})`;
    ctx.fillRect(cx - w / 2 + (q() - 0.5) * r * 0.3, y, w, Math.max(1, u * 0.006));
  }
  // The fishing boat, dark against the light, and gulls.
  const bx = cx + r * 0.75, by = hz + r * 0.16, s = r * 0.5;
  ctx.fillStyle = '#16233a';
  ctx.beginPath();
  ctx.moveTo(bx - s, by - s * 0.2);
  ctx.lineTo(bx + s * 1.1, by - s * 0.28);
  ctx.lineTo(bx + s * 0.8, by + s * 0.12);
  ctx.lineTo(bx - s * 0.8, by + s * 0.12);
  ctx.fill();
  ctx.fillRect(bx - s * 0.5, by - s * 0.55, s * 0.6, s * 0.36);
  ctx.fillRect(bx - s * 0.08, by - s * 1.05, s * 0.05, s * 0.8);
  ctx.fillRect(bx + s * 0.5, by - s * 0.75, s * 0.04, s * 0.5);
  ctx.strokeStyle = '#16233a';
  ctx.lineWidth = Math.max(1, u * 0.004);
  ctx.beginPath();
  ctx.moveTo(bx - s * 0.06, by - s * 1.03);
  ctx.lineTo(bx + s * 0.52, by - s * 0.73);
  ctx.lineTo(bx + s * 1.05, by - s * 0.3);
  ctx.stroke();
  ctx.strokeStyle = '#1b2b45';
  for (const [x, y, k] of [[-0.9, -0.9, 1], [-0.5, -1.15, 0.7], [0.5, -1.2, 0.8], [1.2, -0.8, 0.6]] as const) {
    ctx.beginPath();
    ctx.moveTo(cx + r * x - u * 0.03 * k, hz + r * y);
    ctx.quadraticCurveTo(cx + r * x - u * 0.012 * k, hz + r * y - u * 0.02 * k, cx + r * x, hz + r * y);
    ctx.quadraticCurveTo(cx + r * x + u * 0.012 * k, hz + r * y - u * 0.02 * k, cx + r * x + u * 0.03 * k, hz + r * y);
    ctx.stroke();
  }
  ctx.save();
  ctx.shadowColor = 'rgba(8,20,40,0.75)';
  ctx.shadowBlur = u * 0.025;
  words(ctx, T, [
    { s: 'とれたて、朝いちばん。', k: 0.09, color: '#fff3d6', weight: 700 },
    { s: '港の朝市', k: 0.3, color: '#ffffff', weight: 900, gap: 0.02 },
    { s: spaced('Harbour Morning Market'), k: 0.065, color: '#ffe2a8', weight: 600 },
    { s: '毎週日曜 朝6時から', k: 0.085, color: '#16233a', pill: '#ffffff', gap: 0.06 },
    { s: '鮮魚 ・ 野菜 ・ 朝ごはん', k: 0.06, color: '#fff3d6', weight: 600, gap: 0.03 },
  ]);
  ctx.restore();
}

const ART = [aquarium, minaca, festival, residences, lectures, manner, gourmet, market];
/** How many painted posters there are. */
export const ART_COUNT = ART.length;

/** Painted poster `v` (taken round the set), filling W × H. */
export function drawArtPoster(ctx: Ctx, W: number, H: number, v: number) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.clip();
  ART[((Math.round(v) % ART.length) + ART.length) % ART.length](ctx, lay(W, H));
  ctx.restore();
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = Math.max(1, W * 0.006);
  ctx.strokeRect(0, 0, W, H);
}
