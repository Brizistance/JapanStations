// Station posters: the owner's finished designs (public/posters/pNN.jpg), put up by station.
//
// Every poster case asks for poster number `v` at a station. Each station has its own running
// order of the whole set, weighted so that what belongs near it comes up first (the university's
// posters at Daigaku-mae, the harbour festival by the sea) and manner posters are common everywhere.
// A wide board holds two upright posters side by side, as a platform board does.
//
// To add a poster: put the image in public/posters and add a line to POSTERS.

import { drawArtPoster } from './poster-art';

type Ctx = CanvasRenderingContext2D;
type Kind = 'anime' | 'idol' | 'drink' | 'food' | 'goods' | 'travel' | 'festival' | 'shopping' | 'school' | 'manner';

const FUN = ['kita-odori', 'hyotanbori', 'daigaku-mae', 'tsurumatsu', 'kawaminato'];
const WATER = ['hyotanbori', 'tsumugibashi', 'minamihorie', 'kurayashiki', 'tomyobori'];
const SEA = ['kawaminato-ko', 'minato-center', 'umibe-shiyakusho-mae', 'shiomi', 'kamomehama', 'shin-kamome', 'shiosai-koen', 'yunagihama', 'nishi-yunagi', 'shirasunahama', 'asanagi', 'uminomori'];
const UNI = ['daigaku-mae', 'kaiseicho'];
const SAKURA = ['sakurazutsumi', 'hanamizuki', 'shin-sakuragawa', 'minami-sakuragawa'];
const SHOPS = ['kita-odori', 'suzukakedori', 'tsurumatsu', 'kawaminato'];

/** [file number (100 and up: one the game paints, signs/poster-art.ts), width, height, kind, the stations it belongs near]. */
const POSTERS: [number, number, number, Kind, string[]?][] = [
  [0, 936, 1024, 'manner'], // queue in line, keep the doors clear
  [2, 768, 1024, 'idol', FUN], // Lumière new single
  [3, 819, 1024, 'travel', WATER], // Kawaminato's waterside at night
  [4, 936, 1024, 'drink'], // Midori-no-cha green tea
  [5, 725, 1024, 'travel'], // a small trip at the weekend
  [6, 936, 1024, 'food'], // seasonal sushi
  [7, 936, 1024, 'food'], // tonkotsu ramen
  [8, 725, 1024, 'drink'], // Aozora ramune
  [9, 936, 1024, 'drink'], // Fruit Sparkle
  [10, 936, 1024, 'anime', FUN], // TV anime, school comedy
  [11, 725, 1024, 'shopping', SHOPS], // autumn shopping fair
  [12, 819, 1024, 'festival', WATER], // Kawaminato Riverside
  [13, 936, 1024, 'goods'], // Soranote earphones
  [14, 910, 1024, 'school', UNI], // Kawaminato University
  [15, 927, 1024, 'drink'], // Sorairo Spark
  [16, 936, 1024, 'food'], // katsu sandwich
  [17, 683, 1024, 'festival', ['tomyobori', 'kurayashiki']], // lantern festival
  [18, 1024, 576, 'festival', SEA], // Kawaminato Minato summer festival (wide)
  [19, 725, 1024, 'manner'], // phones on silent
  [20, 725, 1024, 'anime', FUN], // animated film
  [21, 936, 1024, 'food'], // soufflé pancakes
  [23, 723, 1024, 'festival', SEA], // summer fireworks
  [24, 768, 1024, 'shopping', SHOPS], // spring collection
  [25, 936, 1024, 'manner'], // watch for bicycles
  [26, 725, 1024, 'festival', SAKURA], // cherry blossom festival
  [27, 768, 1024, 'school', UNI], // Kawaminato University open campus
  [28, 723, 1024, 'anime', FUN], // TV anime, mecha
  [29, 768, 1024, 'idol', FUN], // first single
  [30, 819, 1024, 'festival', SEA], // Minato festival 2027
  [31, 936, 1024, 'manner'], // a clean town
  [32, 768, 1024, 'anime', FUN], // TV anime, fantasy
  [34, 725, 1024, 'anime', FUN], // culture festival
  [35, 936, 1024, 'idol', FUN], // idol goods
  [100, 707, 1000, 'travel', SEA], // Kawaminato Aquarium
  [101, 707, 1000, 'goods'], // MINACA, the IC card
  [102, 707, 1000, 'festival', ['kita-odori', 'tsumugibashi', 'hyotanbori', 'midorizaka', 'tsurumatsu']], // Yanagisuji Festival
  [103, 707, 1000, 'goods', ['hibarino', 'shin-hibarino', 'asahino']], // Hibarino Hills Residences
  [104, 707, 1000, 'school', UNI], // Kawaminato University open lectures
  [105, 707, 1000, 'manner'], // don't walk with your phone
  [106, 707, 1000, 'food', ['hyotanbori', 'tsumugibashi', 'tsurumatsu']], // Hyotanbori Gourmet Alley
  [107, 707, 1000, 'festival', SEA], // Harbour Morning Market
];
const painted = (i: number) => POSTERS[i][0] >= 100;
const wide = (i: number) => POSTERS[i][1] > POSTERS[i][2];

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

const orders = new Map<string, number[]>();
/** A station's running order of the set: a weighted shuffle, the same every time. */
function order(at: string): number[] {
  let o = orders.get(at);
  if (!o) {
    let s = hash(at) || 1;
    const r = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) + 0.5) / 4294967296;
    o = POSTERS.map((p, i) => ({ i, key: -Math.log(r()) / ((p[3] === 'manner' ? 2 : 1) * (p[4]?.includes(at) ? 5 : 1)) }))
      .sort((a, b) => a.key - b.key).map((e) => e.i);
    orders.set(at, o);
  }
  return o;
}
/** Poster number `v` at a station (indices into POSTERS); `upright`: skipping the wide ones. */
function pick(at: string, v: number, upright: boolean): number {
  const o = upright ? order(at).filter((i) => !wide(i)) : order(at);
  return o[Math.abs(Math.round(v)) % o.length];
}
/** What hangs in a case of this shape: one poster, or two upright ones on a wide board. */
function hung(v: number, at: string, aspect: number): number[] {
  if (aspect < 1.25) return [pick(at, v, true)];
  const one = pick(at, v, false);
  return wide(one) ? [one] : [pick(at, v * 2, true), pick(at, v * 2 + 1, true)];
}

const images = new Map<number, { img: HTMLImageElement; matte: string; waiting: (() => void)[] }>();
function image(i: number) {
  let e = images.get(i);
  if (!e && painted(i)) images.set(i, (e = { img: new Image(), matte: '#eceae4', waiting: [] }));
  if (!e) {
    const img = new Image();
    const made = (e = { img, matte: '', waiting: [] as (() => void)[] });
    images.set(i, made);
    img.onload = () => {
      // (The white backing board shows round a poster that does not fill its case.)
      made.matte = '#eceae4';
      for (const cb of made.waiting.splice(0)) cb();
    };
    img.src = `${import.meta.env.BASE_URL}posters/p${String(POSTERS[i][0]).padStart(2, '0')}.jpg`;
  }
  return e;
}

/** Call `again` once when the next image this case is still waiting for has arrived (never, if it has them all). */
export function awaitPoster(v: number, at: string | undefined, aspect: number, again: () => void) {
  const missing = hung(v, at ?? '', aspect).map(image).find((e) => !e.matte);
  if (missing) missing.waiting.push(again);
}

function place(ctx: Ctx, i: number, x: number, y: number, w: number, h: number) {
  if (painted(i)) {
    ctx.save();
    ctx.translate(x, y);
    drawArtPoster(ctx, w, h, POSTERS[i][0] - 100);
    ctx.restore();
    return;
  }
  const { img, matte } = image(i);
  ctx.fillStyle = matte;
  ctx.fillRect(x, y, w, h);
  const ia = img.width / img.height, a = w / h;
  if (Math.abs(ia / a - 1) < 0.08) {
    // Nearly the case's shape: fill it, trimming a sliver.
    const sw = ia > a ? img.height * a : img.width, sh = ia > a ? img.height : img.width / a;
    ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
  } else {
    const s = Math.min(w / img.width, h / img.height), dw = img.width * s, dh = img.height * s;
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = Math.max(1, w * 0.006);
  ctx.strokeRect(x, y, w, h);
}

/** Draw the case's posters. False while an image is still on its way (nothing drawn). */
export function drawPosterAt(ctx: Ctx, W: number, H: number, v: number, at = ''): boolean {
  const set = hung(v, at, W / H);
  if (set.some((i) => !image(i).matte)) return false;
  if (set.length === 1) {
    place(ctx, set[0], 0, 0, W, H);
    return true;
  }
  // Two upright posters on a backing board.
  ctx.fillStyle = '#d8d5cb';
  ctx.fillRect(0, 0, W, H);
  const m = H * 0.04, h = H - 2 * m, w = Math.min(h * 0.707, (W - 3 * m) / 2), gap = (W - 2 * w) / 3;
  set.forEach((i, k) => place(ctx, i, gap + k * (w + gap), m + (h - Math.min(h, w / 0.707)) / 2, w, Math.min(h, w / 0.707)));
  return true;
}
