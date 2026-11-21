// Tsurumatsu's street (鶴松): the old town's covered shopping street. A vermilion-and-cream gate at
// the arcade mouth with a crane on its crest, an arched glazed roof on steel ribs running back from
// the main road, small shop fronts under striped awnings down both sides, and Tsuru-no-yu, the
// public bath with its karahafu porch and tall chimney, on the corner beside the arcade mouth.
//
// Models: tools/blender/build_tsuru.py (public/models/buildings/tsuru.glb); GX, GH, GB0, GB1, BAY,
// RX, ROW, ROW_D, SW, SD, SDOOR_Z, CH_X, CH_Z, CH_H are mirrored here. This file adds colliders and names.
import type { Builder } from '../world/builder';
import { GROUND_Y } from './kit';
import type { PieceId } from './pieces';

const GY = GROUND_Y;
const GX = 6.3, GH = 9.2, GB0 = 7.0, GB1 = 8.7;
const BAY = 8, RX = 6.0;
const ROW = 8, ROW_D = 0.45;
const SW = 14, SD = 18, SDOOR_Z = 2.0;
const CH_X = 4.6, CH_Z = 15.6, CH_H = 22;
/** Half the width between the shop fronts' back planes (the lot edges either side of the old cross street). */
const BACK = 6.5;

export const TSURU_PIECES: PieceId[] = ['sento'];

const put = (b: Builder, id: string, x: number, y: number, z: number) => b.model('tsuru', id, x, y, z);

/** Fascia names for the row variants' two shops (build_tsuru.py ROWS), with the board colour each was built with. */
const ROW_SHOPS: Record<'a' | 'b' | 'c', { bg: string; fg: string; names: [string, string][] }[]> = {
  a: [
    { bg: '#2f4a2c', fg: '#f4efe2', names: [['八百屋 青木', 'Aoki Greengrocer'], ['果物 みつば', 'Mitsuba Fruit'], ['乾物 丸十', 'Maruju Dried Goods']] },
    { bg: '#1f3f66', fg: '#f4efe2', names: [['呉服 松乃屋', 'Matsunoya Kimono'], ['文具 鶴文堂', 'Kakubundō Stationery'], ['時計 正確堂', 'Seikakudō Clocks']] },
  ],
  b: [
    { bg: '#7a2e0e', fg: '#f6e7c8', names: [['精肉 大黒', 'Daikoku Butcher'], ['煎餅 鶴焼本舗', 'Tsuruyaki Senbei'], ['惣菜 おふくろ', 'Ofukuro Deli']] },
    { bg: '#3a3d41', fg: '#f2c14e', names: [['金物 山中', 'Yamanaka Hardware'], ['写真 フジタ', 'Fujita Photo'], ['畳 たなか', 'Tanaka Tatami']] },
  ],
  c: [
    { bg: '#6a1b3a', fg: '#f4e9e2', names: [['化粧品 ローズ', 'Rose Cosmetics'], ['洋品 マダム', 'Madame Boutique'], ['鶴松薬局', 'Tsurumatsu Pharmacy']] },
    { bg: '#1b3a5c', fg: '#f4efe2', names: [['鮮魚 魚辰', 'Uotatsu Fish'], ['和菓子 松風', 'Matsukaze Sweets'], ['茶舗 一服', 'Ippuku Tea']] },
  ],
};

/** A piece on its lot, in the frame of places.ts (middle of the lot's front at the origin, lot along +z). */
export function tsuruPiece(b: Builder, o: { id: PieceId; ja: string; en: string }) {
  // Tsuru-no-yu: the hall behind its forecourt wall, the porch out front, the boiler house at the back.
  // On the −z side the lot's frame is mirrored but the model only turned: its +x is then the frame's −x.
  const d1 = b.dir([1, 0]), d2 = b.dir([0, 1]), f = d1[0] * d2[1] - d1[1] * d2[0] < 0 ? -1 : 1;
  const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => b.block(Math.min(f * x0, f * x1), y0, z0, Math.max(f * x0, f * x1), y1, z1);
  const X = SW / 2 - 0.5;
  put(b, 'sento', 0, GY, 0);
  blk(-X, GY, SDOOR_Z, X, GY + 5.4, SD - 0.5);
  blk(CH_X - 2.0, GY, CH_Z - 2.4, X + 0.3, GY + 3.6, SD - 0.2);
  blk(CH_X - 0.9, GY, CH_Z - 0.9, CH_X + 0.9, GY + CH_H, CH_Z + 0.9);
  for (const s of [-1, 1]) {
    const [lo, hi] = s < 0 ? [-(SW / 2 - 0.2), -3.0] : [3.0, SW / 2 - 0.2];
    blk(lo, GY, -0.3, hi, GY + 1.2, 0.1);
    blk((lo + hi) / 2 - 0.4, GY, 0.5, (lo + hi) / 2 + 0.4, GY + 1.6, 1.3);
    // Porch posts.
    blk(s * 2.3 - 0.22, GY, -1.18, s * 2.3 + 0.22, GY + 3.5, -0.74);
  }
  // The doors stay shut: the porch is as far as you go.
  blk(-2.6, GY, SDOOR_Z - 0.1, 2.6, GY + 3.3, SDOOR_Z);
  b.sign({ k: 'label', text: o.ja, sub: o.en, fg: '#f4ecd6', bg: '#5a3f2a' }, 0, GY + 6.4, SDOOR_Z - 0.79, [0, -1], 3.2, 1.05);
  b.sign({ k: 'shop', ja: 'ゆ', bg: '#1f3f66', fg: '#ffffff' }, 0, GY + 2.75, -0.97, [0, -1], 0.9, 0.9);
  b.sign({ k: 'shop', ja: o.ja, bg: '#8e4a35', fg: '#f4f1e6', vertical: true }, f * CH_X, GY + 15, CH_Z - 0.87, [0, -1], 0.9, 4.2);
  b.sign({ k: 'label', text: '営業 15:00–24:00 定休 月曜', sub: 'Open 15:00–24:00, closed Mondays', fg: '#2a2019', bg: '#efe3c4' }, f * -4.9, GY + 2.2, SDOOR_Z - 0.02, [0, -1], 1.4, 0.4);
}

/**
 * The covered shopping street on the −z side of the main road at x = cx, from the pavement's back
 * edge to the plot's end: the gate, roof bays every BAY, shop rows down both sides. The first bays
 * on the +x side are left open where a station piece (the bath) stands on the corner, and the rows
 * open where `cross` (distances back from the pavement) brings a small street through the arcade.
 */
export function tsuruArcade(b: Builder, cx: number, swOut: number, plotZ: number, name: { ja: string; en: string }, cornerDepth = 0, cross?: [number, number]) {
  const len = plotZ - 2 - swOut - 1, n = Math.floor(len / BAY);
  // rot 2: local +z runs away from the main road (world −z), local +x is world −x.
  b.with({ t: [cx, 0, -swOut - 1], rot: 2 }, () => {
    put(b, 'gate', 0, GY, 0);
    for (const x of [-GX, GX]) b.block(x - 0.42, GY, -0.42, x + 0.42, GY + GH, 0.42);
    for (const [z, nz] of [[-0.36, -1], [0.36, 1]] as const) {
      b.sign({ k: 'label', text: name.ja, sub: name.en, fg: '#8a2b18', bg: '#efe3c4' }, 0, GY + (GB0 + GB1) / 2, z, [0, nz], 11.4, 1.25);
    }
    let shop = 0;
    for (let k = 0; k < n; k++) {
      const z0 = 0.6 + k * BAY;
      put(b, 'roof', 0, GY, z0);
      for (const x of [-RX, RX]) b.block(x - 0.18, GY, z0 - 0.18, x + 0.18, GY + 7.2, z0 + 0.18);
      // Shop rows: local +x side faces −x (rot 3), local −x side faces +x (rot 1). World +x is local −x.
      for (const side of [1, -1] as const) {
        if (side < 0 && z0 < cornerDepth + 1) continue;
        if (cross && z0 + 1 < cross[1] && z0 + 1 + BAY > cross[0]) continue;
        const v = (['a', 'b', 'c'] as const)[(k + (side > 0 ? 0 : 1)) % 3];
        b.with({ t: [side * (BACK - ROW_D), 0, z0 + BAY / 2], rot: side > 0 ? 3 : 1 }, () => {
          put(b, `row_${v}`, 0, GY, 0);
          // Goods stands and awning posts: keep to the walk in front.
          b.block(-ROW / 2, GY, -0.8, ROW / 2, GY + 1.0, ROW_D);
          b.block(-ROW / 2, GY, 0, ROW / 2, GY + 7.3, ROW_D);
          ROW_SHOPS[v].forEach((s, j) => {
            const [ja, en] = s.names[(shop++ * 7 + k) % s.names.length];
            b.sign({ k: 'shop', ja, en, bg: s.bg, fg: s.fg }, -ROW / 4 + (j * ROW) / 2, GY + 3.125, -0.152, [0, -1], 3.4, 0.6);
          });
        });
      }
    }
  });
  // Paved floor down the old cross street, under the roof.
  b.box('floor:#d9c7a8', cx - 3.5, 0, -swOut - 1 - n * BAY - 0.6, cx + 3.5, GY, -swOut);
}
