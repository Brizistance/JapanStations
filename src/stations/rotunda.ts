// Tsumugibashi's rotunda: a domed entrance hall under the old Silk Exchange (紬橋絹取引所).
//
// The avenue runs straight above the lines, so the station building stands on the lot south of
// it, east of the crossing, and the rotunda is under that lot. From the concourse you reach it
// through exit 2's passage and lobby, whose end wall is open (through.ts):
//
//   lobby → 取引所通り Exchange Passage → 紬橋ロトンダ the rotunda (floor at concourse level, drum
//   and dome rising through the street into the building) → 大階段 the Grand Stair (a stair between
//   two escalators, climbing east) → 取引所ホール the Exchange Hall at street level → the door onto
//   the avenue's south pavement.
//
// What you see of the round hall is a Blender model (tools/blender/build_tsumugi.py: the shell
// with its columns, the dome, the Great Loom, the furniture). What you bump into is here: boxes
// stepped round the circle, one per column, and ordinary walls for everything square.
//
// Station frame. The dimensions the model shares are R, COLS and the heights below.

import { linesAt } from '../data/network';
import { ceilingLight, escalator, GROUND_Y, stairs, type Ctx } from './kit';
import { lookFor } from './looks';
import type { Brand } from './looks/parts';
import { THROUGH_EXITS } from './through';

/** Inner radius of the rotunda. */
export const R = 11;
/** The eight columns: radius of their ring, and their angles (from +x towards +z). */
const COL_R = 9.9;
const COL_A = Array.from({ length: 8 }, (_, k) => ((22.5 + 45 * k) * Math.PI) / 180);
/** Underside of the entablature the columns carry, and the ceiling of the stair hall and the Exchange Hall. */
const ENT = 8.6, HALL = 9.6;
/** Half widths: the passage, and the opening to the Grand Stair between the two east columns. */
const PW = 1.75, SH = 3.5;
/** The lot (surface.ts keeps it clear: specs.ts `landmark`) and the building's eaves. */
const LOT = { x0: 26.5, x1: 72.5, depth: 28, h: 9.2 }; // 46 × 28 m, eaves at 9.2: build_exchange.py W, D, EAVES
const STONE = 'flat:#c4b89f', STONE_DK = 'flat:#7d7361';
/** The rotunda's own shops (invented; docs/worldbuilding.md). None repeats a shop of the concourse. */
const SHOPS = {
  obisei: { ja: '帯 おび清', en: 'Obisei Obi Sashes', bg: '#f6f3ea', fg: '#7a1f2b', kind: 'goods' },
  tanmonoya: { ja: '反物 たんもの屋', en: 'Tanmonoya Cloth Bolts', bg: '#2a2019', fg: '#e8d9b0', kind: 'goods' },
  musubi: { ja: '組紐 むすび', en: 'Musubi Braided Cords', bg: '#b4472f', fg: '#ffffff', kind: 'goods' },
  mawataya: { ja: '真綿ふとん まわた屋', en: 'Mawataya Silk Floss Bedding', bg: '#2a2019', fg: '#e8d9b0', kind: 'goods' },
  katazome: { ja: '型染工房 かたぞめ', en: 'Katazome Stencil Dye Studio', bg: '#f6f3ea', fg: '#2b3a67', kind: 'goods' },
  itoguruma: { ja: '刺繍糸 いとぐるま', en: 'Itoguruma Embroidery Thread', bg: '#b4472f', fg: '#ffffff', kind: 'goods' },
} satisfies Record<string, Brand>;

export function buildRotunda(c: Ctx, cf: number, sw: number, outer: number, doorX: number) {
  const { b, station, style } = c;
  const t = THROUGH_EXITS[station.id];
  if (!t) throw new Error(`${station.id}: a rotunda needs a through exit (through.ts)`);
  const look = lookFor(station.id).finishes ?? {};
  const wall = look.wall ?? style.concWall, floor = look.floor ?? style.floor, ceil = look.ceil ?? 'ceil';
  const GY = GROUND_Y;
  const lines = linesAt(station.id).map((l) => l.id);

  // ── Where things are ──
  const CX = doorX + (t.x0 + t.x1) / 2;
  const Z0 = outer + 4.3; // outer face of the lobby's end wall
  const CZ = Z0 + 4 + R;
  const ZF = outer + 5.5; // the building line (surface.ts swOut)
  const zp = CZ - Math.sqrt(R * R - PW * PW); // where the passage meets the circle
  const top = cf + HALL;
  const rise = GY - cf, run = Math.round(rise * 1.72 * 100) / 100;
  const XS = CX + R + 0.4, XT = XS + run, XH = XT + 8.8;
  if (XH + 2 > LOT.x1 || CX - R - 1 < LOT.x0) throw new Error(`${station.id}: the rotunda does not fit its lot`);

  // ── Exchange Passage ──
  b.box(floor, CX - R - 0.6, cf - 0.7, Z0, XS + 0.1, cf, CZ + R + 0.6);
  for (const s of [-1, 1]) b.box(wall, Math.min(CX + s * PW, CX + s * (PW + 0.3)), cf, Z0, Math.max(CX + s * PW, CX + s * (PW + 0.3)), cf + 3.2, zp);
  b.box(ceil, CX - PW - 0.3, cf + 3.2, Z0, CX + PW + 0.3, cf + 3.7, CZ - R);
  ceilingLight(b, CX - 0.25, CX + 0.25, Z0 + 0.5, zp - 0.3, cf + 3.2);
  for (const s of [-1, 1]) b.deco(STONE_DK, CX + s * PW - 0.012, cf, Z0, CX + s * PW + 0.012, cf + 1.1, zp);
  b.zone('passage', CX - PW, cf - 0.2, Z0, CX + PW, cf + 3.2, zp, '取引所通り', 'Exchange Passage');

  // ── The round hall: colliders stepped round the circle ──
  const yTop = GY + 16;
  const step = 0.5;
  for (let z = -R; z < R - 1e-6; z += step) {
    const zm = z + step / 2;
    let h = Math.sqrt(Math.max(0, R * R - zm * zm));
    if (zm < 0) h = Math.max(h, PW); // the passage comes in at the north
    b.block(CX - R - 0.6, cf, CZ + z, CX - h, yTop, CZ + z + step);
    if (Math.abs(zm) > SH) b.block(CX + h, cf, CZ + z, CX + R + 0.6, yTop, CZ + z + step);
  }
  b.block(CX - R - 0.6, cf, CZ + R, CX + R + 0.6, yTop, CZ + R + 0.6);
  // Above the passage mouth and the stair opening the wall is closed.
  b.block(CX - PW, cf + 3.2, CZ - R - 0.4, CX + PW, yTop, zp + 0.4);
  b.block(CX + R - 0.8, top, CZ - SH, CX + R + 0.6, yTop, CZ + SH);
  for (const a of COL_A) {
    const x = CX + COL_R * Math.cos(a), z = CZ + COL_R * Math.sin(a);
    b.block(x - 0.6, cf, z - 0.6, x + 0.6, cf + ENT, z + 0.6);
  }
  b.model('tsumugi', 'rotunda', CX, cf, CZ);
  b.model('tsumugi', 'dome', CX, cf, CZ);
  b.hole(CX - R, CZ - R, CX + R, CZ + R);
  b.zone('concourse', CX - R, cf - 0.2, CZ - R, CX + R, cf + 22, CZ + R, '紬橋ロトンダ', 'Tsumugi Rotunda');

  // The Great Loom (紬の大機) at the centre: the meeting point. Its warp rises to the oculus.
  b.block(CX - 1.9, cf, CZ - 1.3, CX + 1.9, cf + 2.8, CZ + 1.3);
  b.model('tsumugi', 'loom', CX, cf, CZ);
  b.sign({ k: 'label', text: '紬の大機', sub: 'The Great Loom · Meeting point', fg: '#f3ead2', bg: '#3a2a1e' }, CX, cf + 0.34, CZ - 1.32, [0, -1], 1.5, 0.3);
  b.sign({ k: 'label', text: '紬の大機', sub: 'The Great Loom · Meeting point', fg: '#f3ead2', bg: '#3a2a1e' }, CX, cf + 0.34, CZ + 1.32, [0, 1], 1.5, 0.3);

  // Shops of the silk quarter in six bays of the wall (a 4.4 m front is a chord of the circle),
  // each turned to face the loom; their names are the game's, on the model's plain board.
  const at = (deg: number, r: number): [number, number] => [CX + r * Math.cos((deg * Math.PI) / 180), CZ + r * Math.sin((deg * Math.PI) / 180)];
  const base = b.dir([0, -1]), right = b.dir([1, 0]);
  const BAYS: [number, string, Brand][] = [
    [45, 'shop_timber', SHOPS.tanmonoya], [90, 'shop_glass', SHOPS.obisei], [135, 'shop_enamel', SHOPS.musubi],
    [180, 'shop_timber', SHOPS.mawataya], [225, 'shop_glass', SHOPS.katazome], [315, 'shop_enamel', SHOPS.itoguruma],
  ];
  for (const [deg, id, brand] of BAYS) {
    const a = (deg * Math.PI) / 180, f: [number, number] = [-Math.cos(a), -Math.sin(a)]; // the way the front faces
    const [x, z] = at(deg, R - 0.95);
    // Builder.model() only knows quarter turns: place this one by hand, turned to face the centre.
    const fw: [number, number] = [right[0] * f[0] - base[0] * f[1], right[1] * f[0] - base[1] * f[1]];
    b.out.models.push({ kind: 'tsumugi', id, pos: b.pt(x, cf, z), yaw: Math.atan2(-fw[0], -fw[1]), seed: 0 });
    // Its collider: square blocks along the chord.
    for (const u of [-1.5, 0, 1.5]) {
      const px = CX + (R - 0.5) * Math.cos(a) - u * Math.sin(a), pz = CZ + (R - 0.5) * Math.sin(a) + u * Math.cos(a);
      b.block(px - 0.75, cf, pz - 0.75, px + 0.75, cf + 3.1, pz + 0.75);
    }
    const [sx, sz] = at(deg, R - 1.06);
    b.sign({ k: 'shop', ja: brand.ja, en: brand.en, bg: brand.bg, fg: brand.fg }, sx, cf + 2.7, sz, f, 4.0, 0.5);
  }
  // Furniture: round benches and planters on a ring between the loom and the shops, lamps nearer the loom.
  for (const deg of [45, 135, 225, 315]) {
    const [x, z] = at(deg, 6.4);
    b.block(x - 0.75, cf, z - 0.75, x + 0.75, cf + 0.9, z + 0.75);
    b.model('tsumugi', 'seat', x, cf, z);
  }
  for (const deg of [90, 180]) {
    const [x, z] = at(deg, 6.4);
    b.block(x - 0.5, cf, z - 0.5, x + 0.5, cf + 1.6, z + 0.5);
    b.model('tsumugi', 'planter', x, cf, z);
  }
  for (const deg of [30, 90, 150, 210, 270, 330]) {
    const [x, z] = at(deg, 4.2);
    b.block(x - 0.22, cf, z - 0.22, x + 0.22, cf + 3.6, z + 0.22);
    b.model('tsumugi', 'lamp', x, cf, z);
  }
  // Wayfinding: the way back to the gates over the passage mouth, the way out over the stair.
  b.sign({ k: 'guide', ja: '改札・のりば', en: 'Ticket gates / Trains', bg: 'navy', badges: lines, arrow: 'up' }, CX, cf + 3.75, zp + 0.52, [0, 1], 3.4, 0.5);
  b.deco('flat:#22262b', CX - 1.76, cf + 3.46, zp + 0.42, CX + 1.76, cf + 4.04, zp + 0.5);
  b.sign({ k: 'guide', ja: '出口', en: 'Exit', bg: 'yellow', num: t.num, arrow: 'up' }, CX, cf + 4.32, zp + 0.52, [0, 1], 3.4, 0.5);
  b.deco('flat:#22262b', CX - 1.76, cf + 4.04, zp + 0.42, CX + 1.76, cf + 4.6, zp + 0.5);
  b.hang(
    { k: 'guide', ja: '改札・のりば', en: 'Ticket gates / Trains', bg: 'navy', badges: lines, arrow: 'up' },
    CX + R - 0.9, cf + 4.4, CZ, 5.2, 0.6,
    { ceil: cf + ENT, back: { k: 'guide', ja: '絹取引所口', en: 'Silk Exchange Exit', bg: 'yellow', arrow: 'up' } },
  );

  // ── Grand Stair: a 4 m stair between two escalators, climbing east to the street ──
  stairs(b, { x0: XS, x1: XT, z0: CZ - 2, z1: CZ + 2, yLow: cf, yHigh: GY, mat: 'flat:#cfc6b2' });
  escalator(b, { x0: XS, x1: XT, z0: CZ - 3.4, z1: CZ - 2.2, yLow: cf, yHigh: GY, dir: 1 });
  escalator(b, { x0: XS, x1: XT, z0: CZ + 2.2, z1: CZ + 3.4, yLow: cf, yHigh: GY, dir: -1 });
  for (const s of [-1, 1]) {
    const z0 = Math.min(CZ + s * SH, CZ + s * (SH + 0.4)), z1 = Math.max(CZ + s * SH, CZ + s * (SH + 0.4));
    b.box(STONE, CX + R - 0.8, cf - 0.7, z0, XT, top, z1);
    // A dark stone dado and a brass handrail line climbing with the flight.
    const zi = CZ + s * SH;
    for (let k = 0; k < 12; k++) {
      const xa = XS + (run * k) / 12, xb = XS + (run * (k + 1)) / 12, y = cf + (rise * (k + 0.5)) / 12;
      b.deco(STONE_DK, xa, cf, zi - 0.012, xb, y + 1.3, zi + 0.012);
      b.deco('metal:#b08d3a', xa, y + 1.3, zi - 0.02, xb, y + 1.36, zi + 0.02);
    }
  }
  b.box(ceil, CX + R - 0.8, top, CZ - SH - 0.4, XT, top + 0.4, CZ + SH + 0.4);
  for (let x = XS + 0.6; x + 1.6 < XT; x += 2.4) ceilingLight(b, x, x + 1.6, CZ - 1.2, CZ + 1.2, top);
  b.hole(CX + R, CZ - SH, XT, CZ + SH);
  b.zone('passage', CX + R, cf - 0.2, CZ - SH, XT, top, CZ + SH, '大階段', 'Grand Stair');

  // ── Exchange Hall, at street level: from the stair head north to the door on the avenue ──
  const hz0 = ZF + 0.4, hz1 = CZ + 7;
  b.deco('floor:#d9d0bd', XT, GY, hz0, XH, GY + 0.012, hz1);
  b.deco('floor:#8d8371', XT + 0.6, GY + 0.012, hz0 + 0.6, XH - 0.6, GY + 0.016, hz0 + 0.75);
  b.box(STONE, XT - 0.4, GY, hz0, XT, top, CZ - SH - 0.4);
  b.box(STONE, XT - 0.4, GY, CZ + SH + 0.4, XT, top, hz1);
  b.box(STONE, XT - 0.4, GY, hz1, XH + 0.4, top, hz1 + 0.4);
  b.box(STONE, XH, GY, hz0, XH + 0.4, top, hz1);
  b.box(ceil, XT - 0.4, top, hz0, XH + 0.4, top + 0.4, hz1 + 0.4);
  for (let z = hz0 + 1.5; z + 2 < hz1; z += 3.4) ceilingLight(b, XT + 2.6, XH - 2.6, z, z + 0.5, top);
  // (Not across the stair head.)
  const sides: [number, number, number][] = [[XH - 0.012, hz0, hz1], [XT + 0.012, hz0, CZ - SH - 0.4], [XT + 0.012, CZ + SH + 0.4, hz1]];
  for (const [x, za, zc] of sides) b.deco(STONE_DK, x - 0.012, GY, za, x + 0.012, GY + 1.1, zc);
  // A balcony rail where the stair comes up, and the way down signed for people coming in.
  b.hang(
    { k: 'guide', ja: 'のりば', en: 'To trains', bg: 'navy', badges: lines, arrow: 'up' },
    XT + 0.5, GY + 3.1, CZ, 5.2, 0.5,
    { ceil: top, back: { k: 'guide', ja: '出口・取引所ホール', en: 'Exit / Exchange Hall', bg: 'yellow', arrow: 'up' } },
  );
  b.sign({ k: 'faremap', station: station.id }, XH - 0.02, GY + 1.7, CZ, [-1, 0], 3.2, 1.8);
  // Timber panelling over the dado, bronze lamps down both sides, benches, the building's name and year.
  for (const [x, za, zc] of sides) b.deco('wood:#4a3324', x - 0.02, GY + 1.1, za, x + 0.02, GY + 1.22, zc);
  for (let z = hz0 + 2.2; z < hz1 - 1; z += 4.4) {
    if (Math.abs(z - CZ) < SH + 1.2) continue;
    for (const x of [XT + 0.9, XH - 0.9]) {
      b.block(x - 0.22, GY, z - 0.22, x + 0.22, GY + 3.6, z + 0.22);
      b.model('tsumugi', 'lamp', x, GY, z);
    }
  }
  for (const z of [CZ - 5.6, CZ + 5.6]) {
    b.block(XH - 2.35, GY, z - 0.75, XH - 0.85, GY + 0.9, z + 0.75);
    b.model('tsumugi', 'seat', XH - 1.6, GY, z);
  }
  b.sign({ k: 'label', text: '紬橋絹取引所', sub: 'Tsumugibashi Silk Exchange · 1926', fg: '#e8dcc0', bg: '#4a3324' }, (XT + XH) / 2, GY + 2.6, hz1 - 0.02, [0, -1], 4.6, 0.9);
  b.zone('concourse', XT, GY - 0.2, hz0, XH, top, hz1, '取引所ホール', 'Exchange Hall');

  // ── The building: the Silk Exchange's outside is a model (tools/blender/build_exchange.py, its
  // W, D, EAVES and DOOR are LOT and dx0 … dx1 here). These walls, just inside it, are what you
  // bump into and what you see from inside the hall; the roof slab is ours, the drum stands through it.
  const dx0 = XT + 2.4, dx1 = XH - 2.4; // the door
  const zb = ZF + LOT.depth, roof = GY + LOT.h, e = 0.05;
  b.open(() => {
    b.wallX(STONE, LOT.x0 + e, LOT.x1 - e, ZF + e, ZF + 0.4, GY, roof, [[dx0, dx1]]);
    b.box(STONE, dx0, GY + 3.2, ZF + e, dx1, roof, ZF + 0.4);
    b.box(STONE, LOT.x0 + e, GY, zb - 0.4, LOT.x1 - e, roof, zb - e);
    b.box(STONE, LOT.x0 + e, GY, ZF + 0.4, LOT.x0 + 0.4, roof, zb - 0.4);
    b.box(STONE, LOT.x1 - 0.4, GY, ZF + 0.4, LOT.x1 - e, roof, zb - 0.4);
    b.slab(STONE_DK, LOT.x0 + e, ZF + e, LOT.x1 - e, zb - e, roof, roof + 0.3, [[CX - R - 0.3, CZ - R - 0.3, CX + R + 0.3, CZ + R + 0.3]]);
    b.model('exchange', 'hall', (LOT.x0 + LOT.x1) / 2, GY, ZF);
    // The portal's column plinths and lamp bases stand on the pavement.
    for (const s of [-1, 1]) {
      const xc = (dx0 + dx1) / 2 + s * 3.55;
      b.block(xc - 1.0, GY, ZF - 1.15, xc + 1.0, GY + 6, ZF);
      b.block((dx0 + dx1) / 2 + s * 3.9 - 0.3, GY, ZF - 1.9, (dx0 + dx1) / 2 + s * 3.9 + 0.3, GY + 3, ZF - 1.3);
    }
    b.sign({ k: 'label', text: '紬橋絹取引所', sub: 'Tsumugibashi Silk Exchange', fg: '#e8dcc0', bg: '#231f1c' }, (dx0 + dx1) / 2, GY + 5.41, ZF - 0.04, [0, -1], 6.0, 1.1);
    b.sign({ k: 'entrance', station: station.id }, (dx0 + dx1) / 2, GY + 3.76, ZF - 0.04, [0, -1], dx1 - dx0, 0.8);
  });
  if (Math.abs((dx0 + dx1) / 2 - (LOT.x0 + LOT.x1) / 2 - 16.57) > 0.05) throw new Error(`${station.id}: the Silk Exchange model's door (build_exchange.py DOOR) no longer matches the hall`);
}
