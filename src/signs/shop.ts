// Shop and tenant signs.
//
// A sign with a `box` is drawn as a real one: an aluminium cabinet frame round an acrylic face lit
// from behind, the shop's emblem beside its name, the joints between face panels, and the fading and
// streaks of its age. The recurring chains get their box by name wherever they are put up, so a chain
// looks the same all over the city. Anything else stays a plain lettered plate.

import type { ShopBox, SignContent } from './content';

type Ctx = CanvasRenderingContext2D;
type Shop = Extract<SignContent, { k: 'shop' }>;

const GOTHIC = '"Hiragino Sans","Yu Gothic UI","Yu Gothic","Meiryo","Noto Sans JP",system-ui,sans-serif';
const MINCHO = '"Hiragino Mincho ProN","Yu Mincho","Noto Serif JP","MS PMincho",serif';
const FRAME = '#24272b';
const ACRYLIC = '#f2f0e9';

export const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};
const rgb = (hex: string): [number, number, number] => {
  let s = hex.replace('#', '');
  if (s.length === 3) s = [...s].map((ch) => ch + ch).join('');
  const n = parseInt(s, 16);
  return Number.isNaN(n) ? [128, 128, 128] : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
export const lum = (hex: string) => {
  const [r, g, b] = rgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
};
/** A printed colour instead of a pure screen one: pulled a little toward grey and darkened. */
export function tone(hex: string, k = 0.2): string {
  const [r, g, b] = rgb(hex), m = (r + g + b) / 3;
  const f = (v: number) => Math.round((v + (m - v) * k) * 0.93).toString(16).padStart(2, '0');
  return `#${f(r)}${f(g)}${f(b)}`;
}

/** The chains, by a part of their name: the emblem and lettering they carry everywhere. */
const CHAINS: [string, ShopBox['mark'], ShopBox['face']][] = [
  ['マルホシ', 'disc', 'gothic'],
  ['ひばり薬局', 'kaku', 'gothic'],
  ['カミナリ電機', 'hishi', 'gothic'],
  ['茜珈琲', 'maru', 'mincho'],
  ['うたまる', 'disc', 'gothic'],
  ['川一', 'maru', 'gothic'],
  ['マルコ', 'disc', 'gothic'],
  ['のぞみ', 'kaku', 'gothic'],
  ['川湊信用金庫', 'hishi', 'gothic'],
  ['みどり不動産', 'yama', 'gothic'],
  ['柳文堂', 'kaku', 'mincho'],
  ['カフェ つむぎ', 'maru', 'gothic'],
  ['ひょうたん', 'maru', 'mincho'],
  ['牛松', 'yama', 'mincho'],
];
export const isChain = (ja: string) => CHAINS.some(([key]) => ja.includes(key));

const TRADITIONAL = /[屋堂庵処亭]|居酒屋|そば|和菓子|焼|酒|寿司|おでん|小料理|喫茶|質|鍼灸|理容/;

/** The emblem and lettering of a shop: a chain's own, otherwise one that suits the trade, always the same for one name. */
export function shopStyle(ja: string): Pick<ShopBox, 'mark' | 'face'> {
  const chain = CHAINS.find(([key]) => ja.includes(key));
  if (chain) return { mark: chain[1], face: chain[2] };
  const h = hash(ja);
  if (TRADITIONAL.test(ja)) return { mark: (['maru', 'yama', 'kaku', 'none'] as const)[h % 4], face: h % 5 < 3 ? 'mincho' : 'gothic' };
  return { mark: (['disc', 'none', 'bars', 'hishi', 'none', 'kaku'] as const)[h % 6], face: 'gothic' };
}

function put(ctx: Ctx, s: string, x: number, y: number, px: number, o: { color: string; weight?: number; face?: ShopBox['face']; maxW?: number }) {
  ctx.font = `${o.weight ?? 800} ${Math.max(4, px)}px ${o.face === 'mincho' ? MINCHO : GOTHIC}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = o.color;
  const w = ctx.measureText(s).width;
  if (o.maxW && w > o.maxW) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(o.maxW / w, 1);
    ctx.fillText(s, 0, 0);
    ctx.restore();
  } else ctx.fillText(s, x, y);
}
function measure(ctx: Ctx, s: string, px: number, weight: number, face?: ShopBox['face']) {
  ctx.font = `${weight} ${Math.max(4, px)}px ${face === 'mincho' ? MINCHO : GOTHIC}`;
  return ctx.measureText(s).width;
}

/** Characters one under another between y0 and y1, as on an upright sign. */
function stack(ctx: Ctx, ja: string, cx: number, y0: number, y1: number, w: number, color: string, face?: ShopBox['face']) {
  const chars = [...ja];
  const size = Math.min(w * 0.72, ((y1 - y0) * 0.94) / chars.length);
  chars.forEach((ch, i) => {
    const y = (y0 + y1) / 2 + (i - (chars.length - 1) / 2) * size;
    if (ch === 'ー') {
      ctx.fillStyle = color;
      ctx.fillRect(cx - size * 0.05, y - size * 0.4, size * 0.1, size * 0.8);
    } else put(ctx, ch, cx, y, size * 0.92, { color, face, weight: face === 'mincho' ? 700 : 800 });
  });
}

/** The emblem: the first character of the shop's own name in a ring, under a roof, in a square, on a disc or a lozenge; or three bars. */
function mark(ctx: Ctx, kind: ShopBox['mark'], cx: number, cy: number, s: number, ink: string, ground: string, ja: string, face: ShopBox['face']) {
  const ch = [...(ja.trim().split(/[\s　]+/).pop() ?? ja)][0] ?? '';
  const r = s / 2;
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineWidth = Math.max(1, s * 0.09);
  ctx.lineJoin = 'miter';
  ctx.beginPath();
  switch (kind) {
    case 'maru':
      ctx.arc(cx, cy, r * 0.9, 0, Math.PI * 2);
      ctx.stroke();
      return put(ctx, ch, cx, cy + s * 0.02, s * 0.56, { color: ink, face });
    case 'kaku':
      ctx.strokeRect(cx - r * 0.86, cy - r * 0.86, s * 0.86, s * 0.86);
      return put(ctx, ch, cx, cy + s * 0.02, s * 0.58, { color: ink, face });
    case 'yama':
      ctx.moveTo(cx - r * 0.95, cy - r * 0.2);
      ctx.lineTo(cx, cy - r * 0.95);
      ctx.lineTo(cx + r * 0.95, cy - r * 0.2);
      ctx.stroke();
      return put(ctx, ch, cx, cy + s * 0.2, s * 0.56, { color: ink, face });
    case 'disc':
      ctx.arc(cx, cy, r * 0.95, 0, Math.PI * 2);
      ctx.fill();
      return put(ctx, ch, cx, cy + s * 0.02, s * 0.58, { color: ground, face });
    case 'hishi':
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r, cy);
      ctx.lineTo(cx, cy + r);
      ctx.lineTo(cx - r, cy);
      ctx.closePath();
      ctx.fill();
      return put(ctx, ch, cx, cy + s * 0.02, s * 0.44, { color: ground, face });
    case 'bars':
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(cx + i * s * 0.3 - s * 0.02, cy + r * 0.8);
        ctx.lineTo(cx + i * s * 0.3 + s * 0.16, cy - r * 0.8);
        ctx.lineWidth = s * 0.16;
        ctx.stroke();
      }
  }
}

function plain(ctx: Ctx, W: number, H: number, c: Shop) {
  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, W, H);
  if (c.vertical) return stack(ctx, c.ja, W / 2, 0, H, W, c.fg);
  if (c.en) {
    put(ctx, c.ja, W / 2, H * 0.42, H * 0.5, { color: c.fg, maxW: W * 0.92 });
    put(ctx, c.en, W / 2, H * 0.82, H * 0.2, { color: c.fg, weight: 600, maxW: W * 0.92 });
  } else put(ctx, c.ja, W / 2, H / 2, H * 0.6, { color: c.fg, maxW: W * 0.92 });
}

/** Sun-fading, the dirt that gathers under the top of the cabinet, and rain streaks: the same on every copy of one sign. */
function weather(ctx: Ctx, x0: number, y0: number, w: number, h: number, wear: number, seed: number) {
  if (wear <= 0.03) return;
  ctx.fillStyle = `rgba(214,208,196,${(wear * 0.2).toFixed(3)})`;
  ctx.fillRect(x0, y0, w, h);
  const top = ctx.createLinearGradient(0, y0, 0, y0 + h * 0.45);
  top.addColorStop(0, `rgba(44,36,26,${(wear * 0.34).toFixed(3)})`);
  top.addColorStop(1, 'rgba(44,36,26,0)');
  ctx.fillStyle = top;
  ctx.fillRect(x0, y0, w, h * 0.45);
  let s = seed || 1;
  const next = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  const u = Math.min(w, h);
  for (let i = Math.floor(wear * 7); i > 0; i--) {
    const x = x0 + next() * w, len = h * (0.35 + next() * 0.6), sw = Math.max(1, u * (0.02 + next() * 0.04));
    const g = ctx.createLinearGradient(0, y0, 0, y0 + len);
    g.addColorStop(0, `rgba(40,33,24,${(wear * 0.3).toFixed(3)})`);
    g.addColorStop(1, 'rgba(40,33,24,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x, y0, sw, len);
  }
}

function boxed(ctx: Ctx, W: number, H: number, c: Shop, st: ShopBox) {
  const u = Math.min(W, H);
  const f = Math.max(1, Math.round(u * 0.045));
  ctx.fillStyle = FRAME;
  ctx.fillRect(0, 0, W, H);
  const x0 = f, y0 = f, w = W - 2 * f, h = H - 2 * f;
  if (w < 4 || h < 4) return plain(ctx, W, H, c);
  // The shop's strong colour is its ground if that is not near white, otherwise its lettering.
  const strong = lum(c.bg) < 0.72 ? c.bg : c.fg;
  const face = st.ground === 'solid' ? c.bg : ACRYLIC;
  const ink = st.ground === 'solid' ? c.fg : strong;
  ctx.fillStyle = face;
  ctx.fillRect(x0, y0, w, h);

  const up = c.vertical === true;
  const tagInk = lum(ink) > 0.6 ? '#1f2023' : '#ffffff';
  if (up) {
    const hasMark = st.mark !== 'none' && st.mark !== 'bars' && h > w * 3.2;
    const m = hasMark ? w * 0.64 : 0;
    const tagH = st.tag ? Math.min(w * 0.52, h * 0.16) : 0;
    if (hasMark) mark(ctx, st.mark, x0 + w / 2, y0 + w * 0.14 + m / 2, m, ink, face, c.ja, st.face);
    stack(ctx, c.ja.replace(/[\s　]+/g, ''), x0 + w / 2, y0 + (hasMark ? m + w * 0.24 : 0), y0 + h - tagH, w, ink, st.face);
    if (st.tag) {
      ctx.fillStyle = ink;
      ctx.fillRect(x0, y0 + h - tagH, w, tagH);
      put(ctx, st.tag, x0 + w / 2, y0 + h - tagH / 2, tagH * 0.7, { color: tagInk, maxW: w * 0.84 });
    }
  } else {
    const stripe = st.ground === 'band' ? h * 0.14 : 0;
    if (stripe) {
      ctx.fillStyle = strong;
      ctx.fillRect(x0, y0 + h - stripe, w, stripe);
    }
    const th = h - stripe, pad = th * 0.12;
    const tagW = st.tag && w > h * 3.2 ? h * 0.7 : 0;
    const hasMark = st.mark !== 'none' && w - tagW > th * 2.6;
    const m = hasMark ? th * 0.64 : 0, gap = hasMark ? th * 0.16 : 0;
    const avail = w - tagW - 2 * pad - m - gap;
    const wt = st.face === 'mincho' ? 700 : 800;
    const jaPx = th * (c.en ? 0.46 : 0.56), enPx = th * 0.17;
    const tw = Math.min(avail, Math.max(measure(ctx, c.ja, jaPx, wt, st.face), c.en ? measure(ctx, c.en, enPx, 600) : 0));
    const gx = x0 + (w - tagW - (m + gap + tw)) / 2;
    if (hasMark) mark(ctx, st.mark, gx + m / 2, y0 + th / 2, m, ink, face, c.ja, st.face);
    const tx = gx + m + gap + tw / 2;
    put(ctx, c.ja, tx, y0 + th * (c.en ? 0.42 : 0.53), jaPx, { color: ink, weight: wt, face: st.face, maxW: tw });
    if (c.en) put(ctx, c.en, tx, y0 + th * 0.81, enPx, { color: ink, weight: 600, maxW: tw });
    if (tagW) {
      ctx.fillStyle = ink;
      ctx.fillRect(x0 + w - tagW, y0, tagW, h);
      put(ctx, st.tag!, x0 + w - tagW / 2, y0 + h / 2, h * 0.4, { color: tagInk, maxW: tagW * 0.8 });
    }
  }

  // The joints between the face panels, and the light inside falling off toward the long edges.
  const joint = Math.max(1, u * 0.012);
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  if (up) for (let k = 1, n = Math.round(h / (w * 2.4)); k < n; k++) ctx.fillRect(x0, y0 + (h * k) / n - joint / 2, w, joint);
  else for (let k = 1, n = Math.round(w / (h * 2.2)); k < n; k++) ctx.fillRect(x0 + (w * k) / n - joint / 2, y0, joint, h);
  const g = up ? ctx.createLinearGradient(x0, 0, x0 + w, 0) : ctx.createLinearGradient(0, y0, 0, y0 + h);
  g.addColorStop(0, 'rgba(0,0,0,0.13)');
  g.addColorStop(0.3, 'rgba(255,255,255,0.05)');
  g.addColorStop(0.7, 'rgba(255,255,255,0.05)');
  g.addColorStop(1, 'rgba(0,0,0,0.15)');
  ctx.fillStyle = g;
  ctx.fillRect(x0, y0, w, h);
  weather(ctx, x0, y0, w, h, st.wear, hash(c.ja));
}

export function drawShop(ctx: Ctx, W: number, H: number, c: Shop) {
  // A chain's sign is a box wherever it hangs, in the colours it was given there.
  const st = c.box ?? (isChain(c.ja) && Math.min(W, H) >= 24 ? { ...shopStyle(c.ja), ground: 'solid' as const, wear: 0 } : undefined);
  if (st) boxed(ctx, W, H, c, st);
  else plain(ctx, W, H, c);
}
