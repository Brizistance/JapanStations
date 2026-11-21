// Kaiseichō's street (開成町): the Meiji school town. The red-brick Kawaminato Daiichi High School
// behind its wall and stone gateposts, a gravel forecourt with ginkgos you can walk into up to the
// porch, a clock tower keeping the game's time; across the road Gakurindō, an old stationery shop.
//
// Models: tools/blender/build_kaisei.py (public/models/buildings/kaisei.glb); SCW, SCD, GATE, BZ0, BZ1,
// BW, BH, TW, CLK, CLK_W, SW, SD, SDOOR are mirrored here. This file adds colliders, trees and names.
import type { Builder } from '../world/builder';
import { GROUND_Y } from './kit';
import type { PieceId } from './pieces';
import { modelTree } from './trees';

const GY = GROUND_Y;
const SCW = 40, SCD = 26, GATE = 2.6;
const BZ0 = 10, BZ1 = 23, BW = 34, BH = 9.4;
const TW = 4.4, CLK = 14.2, CLK_W = 2.0;
const SW = 7, SD = 10, SDOOR = 2.0;

export const KAISEI_PIECES: PieceId[] = ['school', 'bunbo'];

const put = (b: Builder, id: string, x: number, y: number, z: number) => b.model('kaisei', id, x, y, z);

/** A piece on its lot, in the frame of places.ts (middle of the lot's front at the origin, lot along +z). */
export function kaiseiPiece(b: Builder, o: { id: PieceId; ja: string; en: string }) {
  // In a mirrored lot frame (the −z side) the model only turns: its +x is the frame's −x.
  const d1 = b.dir([1, 0]), d2 = b.dir([0, 1]), f = d1[0] * d2[1] - d1[1] * d2[0] < 0 ? -1 : 1;
  const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => b.block(Math.min(f * x0, f * x1), y0, z0, Math.max(f * x0, f * x1), y1, z1);

  if (o.id === 'school') {
    const X = SCW / 2;
    put(b, 'school', 0, GY, 0);
    // The front wall either side of the gateway, the gateposts, the side walls.
    for (const s of [-1, 1]) {
      blk(s * (GATE + 0.45), GY, -0.1, s * X, GY + 2.2, 0.45);
      blk(s * GATE - 0.46, GY, -0.46, s * GATE + 0.46, GY + 3.8, 0.46);
      blk(s * (X - 0.35), GY, 0, s * X, GY + 2.0, SCD);
    }
    // The building, its porch (a floor you can step up onto by the steps), the columns and the door.
    blk(-BW / 2, GY, BZ0, BW / 2, GY + BH + 6, BZ1);
    blk(-3.4, GY, BZ0 - 1.4, 3.4, GY + BH + 1, BZ0);
    b.ramp(-2.9, BZ0 - 4.9, 2.9, BZ0 - 4.2, GY, GY + 0.45, [0, 1]);
    blk(-3.4, GY, BZ0 - 4.2, 3.4, GY + 0.45, BZ0 - 1.4);
    for (const x of [-3.0, -1.2, 1.2, 3.0]) blk(x - 0.24, GY + 0.45, BZ0 - 4.14, x + 0.24, GY + 4.0, BZ0 - 3.66);
    // The game's clock on all four faces of the tower.
    const tz = BZ0 + 0.8, r = TW / 2 + 0.17, cy = GY + CLK;
    b.sign({ k: 'clock' }, 0, cy, tz - r, [0, -1], CLK_W, CLK_W);
    b.sign({ k: 'clock' }, 0, cy, tz + r, [0, 1], CLK_W, CLK_W);
    b.sign({ k: 'clock' }, -r, cy, tz, [-1, 0], CLK_W, CLK_W);
    b.sign({ k: 'clock' }, r, cy, tz, [1, 0], CLK_W, CLK_W);
    // Name plates on the gateposts: the school's name, and its founding.
    b.sign({ k: 'shop', ja: o.ja, bg: '#f4f1e8', fg: '#1f2023', vertical: true }, f * -GATE, GY + 1.8, -0.43, [0, -1], 0.5, 1.5);
    b.sign({ k: 'shop', ja: '創立 明治三十五年', bg: '#f4f1e8', fg: '#1f2023', vertical: true }, f * GATE, GY + 1.8, -0.43, [0, -1], 0.5, 1.5);
    b.sign({ k: 'label', text: o.ja, sub: o.en, fg: '#f4f1e8', bg: '#1f3d2e' }, 0, GY + 4.3, BZ0 - 4.34, [0, -1], 3.6, 0.5);
    // Ginkgos in the forecourt, and the forecourt as a place.
    for (const x of [-12, -6.5, 6.5, 12]) modelTree(b, 'ginkgo', x, 5, Math.round(x) % 2 ? 'a' : 'b', GY, true);
    b.zone('street', -X + 0.4, GY - 0.2, 0.4, X - 0.4, GY + 6, BZ0 - 0.2, o.ja, `${o.en} (forecourt)`, true);
    return;
  }

  // Gakurindō: a timber shop front (shut), the copper-clad floor above, a hanging sign at the corner.
  const X = SW / 2;
  put(b, 'shop', 0, GY, 0);
  blk(-X, GY, 0, X, GY + 7.8, SD);
  b.sign({ k: 'shop', ja: o.ja, en: o.en, bg: '#5a3f2a', fg: '#f4efe2' }, 0, GY + 2.97, -0.05, [0, -1], 5.5, 0.6);
  for (const s of [1, -1] as const) {
    b.sign({ k: 'shop', ja: '萬年筆', bg: '#f4efe2', fg: '#5a3f2a', vertical: true }, f * (X - 0.425) + s * 0.046, GY + 3.6, -0.6, [s, 0], 0.5, 1.1);
  }
  b.sign({ k: 'label', text: '本日営業', sub: 'Open today', fg: '#5a3f2a', bg: '#f4efe2' }, f * SDOOR, GY + 1.6, 0.25, [0, -1], 0.5, 0.25);
}
