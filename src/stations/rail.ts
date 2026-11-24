// The AR Main Line's stations that stand on the swept trackbed (render/track.ts) in a world of their
// own: Higashi-Kawaminato on the brick viaduct and Miokami on the valley embankment. Platforms only
// for now (2026-11-23): each station's way in comes with its own entry pass, and until then its
// exits are boarded up. Kawaminato is not here: it stands in the hub's plot (kawaminato.ts).
//
// Frame: +x the down direction (towards Kawaminato and Asanagi), z the lateral (the down track at
// −trackOffset, trains keep left), y the world's.

import { lineById, stationById } from '../data/network';
import type { LineDef, StationDef } from '../data/types';
import { INDOOR_LAMP } from '../render/lamps';
import type { SignContent } from '../signs/content';
import { Builder, type Build } from '../world/builder';
import { fitting } from './fittings';
import { BED, PF_H, psd, stairs, vending, type Ctx, type StationStyle } from './kit';

/** AR's sign style (as at Kawaminato): white on dark grey; the yellow is the way out. */
const AR = (text: string, sub: string): SignContent => ({ k: 'label', text, sub, fg: '#ffffff', bg: '#2b2e33' });
const OUT = (text: string, sub: string): SignContent => ({ k: 'label', text, sub, fg: '#1b1f24', bg: '#ffd100' });
const STOP = (text: string, sub: string): SignContent => ({ k: 'label', text, sub, fg: '#ffffff', bg: '#c8102e' });
const NOTICE = (text: string, sub: string): SignContent => ({ k: 'label', text, sub, fg: '#1f2226', bg: '#f2efe6' });

const STYLE: StationStyle = { wall: 'brick:#7a4234', concWall: 'brick:#7a4234', floor: 'concrete', pillar: 'metal:#39463f', accent: '#0b6e6e', mural: { v: 'none', color: '#0b6e6e' } };

interface Site { b: Builder; line: LineDef; station: StationDef; c: Ctx; P: number; bed: number; nums: [number, number]; name: { ja: string; en: string } }
function site(id: string): Site {
  const b = new Builder(), line = lineById('AR'), station = stationById(id), stop = line.stops.indexOf(id);
  const railY = line.railY[stop];
  return {
    b, line, station, P: railY + PF_H, bed: railY - BED, nums: station.platforms[line.id],
    c: { b, line, station, stop, railY, style: STYLE },
    name: { ja: `${station.nameJa}駅`, en: `${station.nameRomaji} Sta.` },
  };
}

/** A name board between two posts, read from both sides across the platform (`posts` false: on a wall, one face along nz). */
function nameBoard({ b, line, station }: Site, x: number, y: number, z: number, mat: string, wall?: 1 | -1) {
  const w = 2.0, h = 0.56, c = (nz: number): SignContent => ({ k: 'arname', station: station.id, line: line.id, flip: nz < 0 });
  if (wall) {
    b.deco(mat, x - w / 2 - 0.06, y - h / 2 - 0.06, Math.min(z, z + wall * 0.04), x + w / 2 + 0.06, y + h / 2 + 0.06, Math.max(z, z + wall * 0.04));
    b.sign(c(wall), x, y, z + wall * 0.05, [0, wall], w, h);
    return;
  }
  for (const sx of [-1, 1]) b.box(mat, x + sx * (w / 2 + 0.1) - 0.05, y - 1.9, z - 0.05, x + sx * (w / 2 + 0.1) + 0.05, y + h / 2 + 0.14, z + 0.05);
  b.deco(mat, x - w / 2 - 0.05, y - h / 2 - 0.05, z - 0.03, x + w / 2 + 0.05, y + h / 2 + 0.05, z + 0.03);
  for (const nz of [-1, 1]) b.sign(c(nz), x, y, z + nz * 0.04, [0, nz], w, h);
}

/** A live departure board hung across the platform, read walking either way along it. */
function depBoard({ b, line, station }: Site, x: number, y: number, z: number, hangTo: number, dir?: 'down' | 'up') {
  b.deco('flat:#17181b', x - 0.06, y - 0.52, z - 1.36, x + 0.06, y + 0.52, z + 1.36);
  for (const dz of [-1, 1]) b.deco('metal:#39463f', x - 0.02, y + 0.52, z + dz - 0.02, x + 0.02, hangTo, z + dz + 0.02);
  for (const n of [-1, 1] as const) b.sign({ k: 'ardep', station: station.id, line: line.id, ...(dir ? { dir } : {}) }, x + n * 0.07, y, z, [n, 0], 2.6, 0.92, { dynamic: true });
}

/** A platform's end: a railing across it, and no way on. */
function endRail(b: Builder, x: number, P: number, z0: number, z1: number, mat: string) {
  const inward = x < 0 ? 1 : -1;
  b.block(x - 0.06, P, z0, x + 0.06, P + 1.3, z1);
  for (const y of [0.45, 0.8, 1.15]) b.deco(mat, x - 0.025, P + y - 0.025, z0, x + 0.025, P + y + 0.025, z1);
  for (let z = z0; z <= z1 + 1e-6; z += (z1 - z0) / 4) b.deco(mat, x - 0.04, P, z - 0.04, x + 0.04, P + 1.2, z + 0.04);
  b.sign(STOP('立入禁止', 'No entry beyond this point'), x + inward * 0.07, P + 0.8, (z0 + z1) / 2, [inward, 0], 1.6, 0.4);
}

// ════════════════════════════════════════════════════════════════════════════════════════════
// Higashi-Kawaminato (1934): one narrow island between the tracks on the brick viaduct. A row of
// riveted iron columns down its middle carries a butterfly roof over the middle hundred metres;
// a brick stair house stands where the stair goes down into the arches (boarded up for now).
// ════════════════════════════════════════════════════════════════════════════════════════════
export function higashiKawaminato(): Build {
  const S = site('higashi-kawaminato'), { b, line, c, P, bed, nums, name } = S;
  const H = 84, E = 2.8, CAN = 52, IRON = 'metal:#39463f', BRICK = 'brick:#7a4234', STONE = 'flat:#b9b3a6', CREAM = 'paint:#e4dcc6';
  b.out.plot = { x: H + 6, z: 12 };
  b.out.spawn = { pos: [10, P, 1.4], yaw: -Math.PI / 2 };

  // The island: brick faces under a stone coping, asphalt on top.
  b.box(BRICK, -H, bed, -E + 0.1, H, P - 0.14, E - 0.1);
  b.box('asphalt', -H, P - 0.14, -E, H, P, E);
  for (const s of [-1, 1]) b.deco(STONE, -H, P - 0.14, Math.min(s * E, s * (E - 0.34)), H, P + 0.002, Math.max(s * E, s * (E - 0.34)));
  // (Trains keep left: the down track is at −z, platform 1.)
  // No queue marks beside the stair house, the vending machine and the waiting shelter, where the island is a strip.
  const queue = (x: number) => !(x > -7.5 && x < 6.5) && !(x > 24 && x < 32);
  psd(c, -E, 1, 'down', P, [-H, H], { queue });
  psd(c, E, -1, 'up', P, [-H, H], { queue });
  for (const x of [-H, H]) endRail(b, x, P, -E, E, IRON);
  b.zone('platform', -H, P - 0.2, -E, H, P + 3.8, E, `${name.ja} ${nums.join('・')}番のりば`, `${name.en} — Platforms ${nums.join('·')}`, true, line.id);

  // The stair house: brick with a stone band, its mouth (facing down the platform) boarded.
  const HX = 5, HZ = 1.15, HH = 2.55;
  b.box(BRICK, -HX, P, -HZ, HX, P + HH, HZ);
  b.deco(STONE, -HX - 0.04, P + 1.9, -HZ - 0.04, HX + 0.04, P + 2.05, HZ + 0.04);
  b.deco(STONE, -HX - 0.06, P + HH, -HZ - 0.06, HX + 0.06, P + HH + 0.12, HZ + 0.06);
  b.deco(STONE, -HX - 0.03, P, -HZ - 0.03, HX + 0.03, P + 0.25, HZ + 0.03);
  for (const s of [-1, 1]) for (const x of [-3.2, 0, 3.2]) {
    // Blind windows with iron bars, either side.
    b.deco('flat:#2a2422', x - 0.6, P + 0.95, s * HZ - 0.02, x + 0.6, P + 1.85, s * HZ + 0.02);
    for (let k = -2; k <= 2; k++) b.deco(IRON, x + k * 0.2 - 0.012, P + 0.95, s * (HZ + 0.03) - 0.012, x + k * 0.2 + 0.012, P + 1.85, s * (HZ + 0.03) + 0.012);
    b.deco(STONE, x - 0.68, P + 0.87, s * HZ - 0.05, x + 0.68, P + 0.95, s * HZ + 0.05);
  }
  b.deco('wood:#8a6a48', HX, P + 0.25, -0.85, HX + 0.05, P + 2.05, 0.85);
  for (const z of [-0.85, -0.28, 0.28, 0.82]) b.deco('wood:#6b5138', HX + 0.05, P + 0.25, z, HX + 0.08, P + 2.05, z + 0.04);
  b.sign(OUT('出口', 'Exit'), HX + 0.07, P + 2.3, 0, [1, 0], 1.5, 0.36);
  b.sign(NOTICE('出口は工事中です', 'Way out under construction — not open yet'), HX + 0.09, P + 1.3, 0, [1, 0], 1.3, 0.5);
  b.sign({ k: 'clock' }, -HX - 0.05, P + 2.22, 0, [-1, 0], 0.5, 0.5);
  vending(b, -HX - 0.36, P, 0, [-1, 0], 'vending', 'old');

  // The canopy: an iron column every 8 m, a plate girder along the middle, arms either way under a
  // butterfly roof (low over the columns, where the gutter runs; higher at the eaves).
  const roof = P + 3.3;
  b.deco(IRON, -CAN, roof - 0.34, -0.07, CAN, roof - 0.04, 0.07);
  for (const s of [-1, 1]) {
    const zz = (a: number, e: number): [number, number] => [Math.min(s * a, s * e), Math.max(s * a, s * e)];
    for (const [a, e, up] of [[0, 1.1, 0], [1.1, 2.15, 0.14], [2.15, 3.1, 0.28]]) {
      b.deco('paint:#5f6b66', -CAN - 0.3, roof + up, zz(a, e)[0], CAN + 0.3, roof + up + 0.05, zz(a, e)[1]);
      b.deco('wood:#9a7b56', -CAN - 0.3, roof + up - 0.03, zz(a, e)[0], CAN + 0.3, roof + up, zz(a, e)[1]);
    }
    // Scalloped valance at the eaves, and at the canopy's ends.
    b.deco(CREAM, -CAN - 0.3, roof + 0.05, zz(3.07, 3.11)[0], CAN + 0.3, roof + 0.33, zz(3.07, 3.11)[1]);
  }
  for (const x of [-CAN - 0.3, CAN + 0.3]) b.deco(CREAM, x - 0.02, roof - 0.12, -3.1, x + 0.02, roof + 0.33, 3.1);
  for (let x = -48; x <= 48; x += 8) {
    for (const s of [-1, 1]) {
      // Arms: a riveted bracket curving up from the column, a tie to the eaves.
      for (const [a, e, y0, y1] of [[0.1, 0.5, -0.95, -0.04], [0.5, 0.95, -0.6, 0.02], [0.95, 1.5, -0.32, 0.1], [1.5, 3.0, 0.1, 0.24]]) {
        b.deco(IRON, x - 0.04, roof + y0, Math.min(s * a, s * e), x + 0.04, roof + y1, Math.max(s * a, s * e));
      }
    }
    if (Math.abs(x) < HX) continue; // (inside the stair house)
    // The column: two channels laced together, on a stone base.
    for (const dx of [-0.11, 0.11]) b.deco(IRON, x + dx - 0.045, P, -0.09, x + dx + 0.045, roof - 0.04, 0.09);
    for (let y = 0.5; y < 2.85; y += 0.42) b.deco(IRON, x - 0.11, P + y, -0.1, x + 0.11, P + y + 0.07, 0.1);
    b.deco(STONE, x - 0.24, P, -0.17, x + 0.24, P + 0.22, 0.17);
    b.block(x - 0.2, P, -0.15, x + 0.2, P + 2.8, 0.15);
    // A lamp in an enamel shade each side.
    for (const s of [-1, 1]) {
      b.mesh('paint:#2f4a40', 'cone', x + 2, roof - 0.2, s * 1.5, 0.5, 0.2, 0.5);
      b.mesh(INDOOR_LAMP, 'sphere', x + 2, roof - 0.34, s * 1.5, 0.16, 0.16, 0.16);
    }
  }
  // Out past the canopy: iron lamp standards down the middle, a name board by every second one.
  for (const sx of [-1, 1]) for (let k = 0; k < 4; k++) {
    const x = sx * (58 + k * 7.2);
    b.box(IRON, x - 0.06, P, -0.06, x + 0.06, P + 3.3, 0.06);
    b.deco(IRON, x - 0.03, P + 3.2, -0.9, x + 0.03, P + 3.26, 0.9);
    for (const s of [-1, 1]) {
      b.mesh('paint:#2f4a40', 'cone', x, P + 3.14, s * 0.85, 0.44, 0.18, 0.44);
      b.mesh(INDOOR_LAMP, 'sphere', x, P + 3.02, s * 0.85, 0.15, 0.15, 0.15);
    }
    if (k % 2 === 0) nameBoard(S, x + 3.6, P + 1.9, 0, IRON);
  }
  // Under the canopy: name boards, the departures, benches, and a glazed waiting shelter.
  for (const x of [-44, -28, -12, 12, 44]) nameBoard(S, x, P + 1.9, 0, IRON);
  for (const x of [-20, 20]) depBoard(S, x, roof - 0.58, 0, roof - 0.04);
  for (const x of [-36, -20.6, 20.6, 36]) {
    fitting(b, 'pbench_old', x, P, 0);
    b.block(x - 0.9, P, -0.42, x + 0.9, P + 0.45, 0.42);
  }
  {
    const x0 = 25.3, x1 = 30.7, W = 1.0;
    b.block(x0, P, -W, x1, P + 2.4, W);
    b.deco('wood:#6b5138', x0, P, -W, x1, P + 0.9, W);
    b.deco('glass', x0 + 0.04, P + 0.9, -W + 0.04, x1 - 0.04, P + 2.25, W - 0.04);
    for (const s of [-1, 1]) for (let x = x0; x <= x1 + 1e-6; x += (x1 - x0) / 4) b.deco(IRON, x - 0.035, P + 0.9, s * W - 0.035, x + 0.035, P + 2.25, s * W + 0.035);
    b.deco(IRON, x0 - 0.05, P + 2.25, -W - 0.05, x1 + 0.05, P + 2.4, W + 0.05);
    b.sign(AR('待合室', 'Waiting room'), x0 - 0.01, P + 1.7, 0, [-1, 0], 1.2, 0.3);
  }
  // The way out, from either end of the canopy.
  for (const sx of [-1, 1] as const) {
    const x = sx * 40;
    b.deco('flat:#17181b', x - 0.03, roof - 0.5, -0.95, x + 0.03, roof - 0.08, 0.95);
    b.sign(OUT(sx < 0 ? '出口 →' : '← 出口', 'Exit (not open yet)'), x + sx * -0.04, roof - 0.29, 0, [-sx, 0], 1.8, 0.36);
    b.sign(AR(`${nums[0]}番線 ${nums[1]}番線`, `Platform ${nums[0]} · Platform ${nums[1]}`), x + sx * 0.04, roof - 0.29, 0, [sx, 0], 1.8, 0.36);
  }
  return b.out;
}

// ════════════════════════════════════════════════════════════════════════════════════════════
// Miokami: two side platforms on the valley embankment, stone-faced where they stand out over its
// slopes. Old-rail steel posts along the back carry a timber-boarded roof over the middle of each;
// a roofed timber footbridge joins the two. The paths down the bank are fenced off for now.
// ════════════════════════════════════════════════════════════════════════════════════════════
export function miokami(): Build {
  const S = site('miokami'), { b, line, c, P, bed, nums, name } = S;
  const H = 124, ZI = 5.8, ZO = 10.0, CAN = 60, D = P + 4.9;
  const STEEL = 'metal:#4a5a4f', WOOD = 'wood:#6b5138', BOARD = 'wood:#9a7b56', STONE = 'flat:#9c968a', CREAM = 'paint:#e4dcc6', WIRE = 'trackside:#8f969c';
  /** x-range the footbridge and its stairs take from the canopies. */
  const BR: [number, number] = [-12, 3], SX: [number, number] = [-10.9, -1.3], SZ = 8.4;
  b.out.plot = { x: H + 6, z: 18 };
  b.out.spawn = { pos: [8, P, -7.4], yaw: -Math.PI / 2 };

  for (const s of [-1, 1] as const) {
    const zz = (a: number, e: number): [number, number] => [Math.min(s * a, s * e), Math.max(s * a, s * e)];
    const track = s < 0 ? 'down' : 'up', n = nums[s < 0 ? 0 : 1];
    // The platform: a stone-faced body down into the bank, asphalt on top.
    b.box(STONE, -H, bed - 2.4, zz(ZI + 0.1, ZO)[0], H, P - 0.14, zz(ZI + 0.1, ZO)[1]);
    b.box('asphalt', -H, P - 0.14, zz(ZI, ZO)[0], H, P, zz(ZI, ZO)[1]);
    b.deco('flat:#b9b3a6', -H, P - 0.14, zz(ZI, ZI + 0.34)[0], H, P + 0.002, zz(ZI, ZI + 0.34)[1]);
    psd(c, s * ZI, s, track, P, [-H, H]);
    for (const x of [-H, H]) endRail(b, x, P, zz(ZI, ZO)[0], zz(ZI, ZO)[1], STEEL);
    b.zone('platform', -H, P - 0.2, zz(ZI, ZO + 0.3)[0], H, P + 5.2, zz(ZI, ZO + 0.3)[1], `${name.ja} ${n}番のりば`, `${name.en} — Platform ${n}`, true, line.id);

    // The back: a boarded wall under the roof, a steel fence beyond it.
    const covered = (x: number) => Math.abs(x) <= CAN && !(x > BR[0] && x < BR[1]);
    b.block(-H, P, zz(ZO - 0.08, ZO + 0.08)[0], H, P + 1.4, zz(ZO - 0.08, ZO + 0.08)[1]);
    for (const [x0, x1] of [[-CAN, BR[0]], [BR[1], CAN]]) {
      b.deco(WOOD, x0, P, zz(ZO - 0.05, ZO + 0.05)[0], x1, P + 2.3, zz(ZO - 0.05, ZO + 0.05)[1]);
      b.deco(CREAM, x0, P + 2.3, zz(ZO - 0.06, ZO + 0.06)[0], x1, P + 2.42, zz(ZO - 0.06, ZO + 0.06)[1]);
    }
    for (const [x0, x1] of [[-H, -CAN], [BR[0], BR[1]], [CAN, H]]) {
      for (const y of [0.5, 0.85, 1.2]) b.deco(STEEL, x0, P + y - 0.025, s * ZO - 0.025, x1, P + y + 0.025, s * ZO + 0.025);
      for (let x = x0; x <= x1 + 1e-6; x += (x1 - x0) / Math.round((x1 - x0) / 2)) b.deco(STEEL, x - 0.035, P, s * ZO - 0.035, x + 0.035, P + 1.25, s * ZO + 0.035);
    }

    // The roof: a post of old rail every 6 m at the back, an arm out over the platform with a brace
    // under it, timber purlins and boarding; high at the track, low at the back.
    const tiers: [number, number, number][] = [[ZI - 0.3, 7.0, 3.55], [7.0, 8.6, 3.4], [8.6, ZO + 0.2, 3.25]];
    for (const [x0, x1] of [[-CAN, BR[0]], [BR[1], CAN]]) {
      for (const [a, e, up] of tiers) {
        b.deco('paint:#5a6660', x0 - 0.3, P + up, zz(a, e)[0], x1 + 0.3, P + up + 0.05, zz(a, e)[1]);
        b.deco(BOARD, x0 - 0.3, P + up - 0.03, zz(a, e)[0], x1 + 0.3, P + up, zz(a, e)[1]);
        b.deco(WOOD, x0 - 0.3, P + up - 0.15, zz((a + e) / 2 - 0.05, (a + e) / 2 + 0.05)[0], x1 + 0.3, P + up - 0.03, zz((a + e) / 2 - 0.05, (a + e) / 2 + 0.05)[1]);
      }
      b.deco(CREAM, x0 - 0.3, P + 3.3, zz(ZI - 0.3, ZI - 0.26)[0], x1 + 0.3, P + 3.6, zz(ZI - 0.3, ZI - 0.26)[1]);
    }
    for (let x = -CAN; x <= CAN; x += 6) {
      if (!covered(x)) continue;
      b.box(STEEL, x - 0.07, P, zz(ZO - 0.35, ZO - 0.21)[0], x + 0.07, P + 3.25, zz(ZO - 0.35, ZO - 0.21)[1]);
      b.deco(STEEL, x - 0.05, P + 3.0, zz(ZI - 0.2, ZO - 0.21)[0], x + 0.05, P + 3.12, zz(ZI - 0.2, ZO - 0.21)[1]);
      for (const [a, e, y] of [[9.3, 9.65, 2.2], [8.9, 9.3, 2.5], [8.4, 8.9, 2.75]]) b.deco(STEEL, x - 0.04, P + y, zz(a, e)[0], x + 0.04, P + y + 0.28, zz(a, e)[1]);
      if (Math.round(x / 6) % 2 === 0) {
        b.mesh('paint:#2f4a40', 'cone', x + 3, P + 3.14, s * 7.6, 0.5, 0.2, 0.5);
        b.mesh(INDOOR_LAMP, 'sphere', x + 3, P + 3.0, s * 7.6, 0.16, 0.16, 0.16);
      }
    }
    // Beyond the roof: lamp posts along the fence, a name board at every other one.
    for (const sx of [-1, 1]) for (let k = 0; k < 4; k++) {
      const x = sx * (68 + k * 15);
      b.box(STEEL, x - 0.06, P, zz(ZO - 0.3, ZO - 0.18)[0], x + 0.06, P + 3.5, zz(ZO - 0.3, ZO - 0.18)[1]);
      b.deco(STEEL, x - 0.03, P + 3.4, zz(ZO - 1.5, ZO - 0.18)[0], x + 0.03, P + 3.46, zz(ZO - 1.5, ZO - 0.18)[1]);
      b.mesh('paint:#2f4a40', 'cone', x, P + 3.34, s * (ZO - 1.4), 0.44, 0.18, 0.44);
      b.mesh(INDOOR_LAMP, 'sphere', x, P + 3.22, s * (ZO - 1.4), 0.15, 0.15, 0.15);
      if (k % 2 === 0) nameBoard(S, x + 4, P + 1.75, s * (ZO - 0.3), STEEL);
    }
    // On the boarded wall: name boards, the way to the other platform; benches under them.
    for (const x of [-51, -33, 15, 33, 51]) nameBoard(S, x, P + 1.75, s * (ZO - 0.05), 'flat:#17181b', -s as 1 | -1);
    for (const x of [-42, -24, 42]) {
      fitting(b, 'pbench_old', x, P, s * (ZO - 0.55), [0, -s]);
      b.block(x - 0.9, P, zz(ZO - 0.95, ZO - 0.08)[0], x + 0.9, P + 0.45, zz(ZO - 0.95, ZO - 0.08)[1]);
    }
    for (const x of [-27, 27]) depBoard(S, x, P + 2.72, s * 7.8, P + 3.37, track);
    b.sign(AR(`${nums[s < 0 ? 1 : 0]}番のりば　こ線橋 ${s < 0 ? '←' : '→'}`, `Platform ${nums[s < 0 ? 1 : 0]} — over the footbridge`), 9, P + 2.05, s * (ZO - 0.06), [0, -s], 2.6, 0.4);

    // The path down the bank (the way out to come): a gap in the wall, boarded.
    b.deco(CREAM, 20, P, zz(ZO - 0.09, ZO - 0.05)[0], 23, P + 2.1, zz(ZO - 0.09, ZO - 0.05)[1]);
    b.sign(OUT('出口', 'Exit'), 21.5, P + 2.26, s * (ZO - 0.1), [0, -s], 1.5, 0.3);
    b.sign(NOTICE('出口は工事中です', 'Way out under construction — not open yet'), 21.5, P + 1.35, s * (ZO - 0.1), [0, -s], 1.5, 0.55);

    // The stair up to the footbridge, along the back of the platform.
    b.with(s < 0 ? { mz: true } : {}, () => {
      stairs(b, { x0: SX[0], x1: SX[1], z0: SZ, z1: ZO - 0.08, yLow: P, yHigh: D, mat: 'wood:#7c6244' });
      // (Nobody walks in under it.)
      const k = (D - P) / (SX[1] - SX[0]);
      for (let x = SX[0] + 2.4; x < SX[1] - 0.1; x += 2.4) b.block(x, P, SZ, Math.min(x + 2.4, SX[1]), P + k * (x - SX[0]) - 0.35, ZO - 0.08);
    });
  }
  vending(b, 6, P, -(ZO - 0.45), [0, 1], 'vending', 'old');
  // A timber waiting room on platform 1, against the fence.
  {
    const x0 = 28.5, x1 = 34.5, z0 = -ZO + 0.1, z1 = -8.2;
    b.block(x0, P, z0, x1, P + 2.5, z1);
    b.deco(WOOD, x0, P, z0, x1, P + 1.0, z1);
    b.deco('glass', x0 + 0.04, P + 1.0, z0 + 0.04, x1 - 0.04, P + 2.2, z1 - 0.04);
    for (let x = x0; x <= x1 + 1e-6; x += 1.5) b.deco(WOOD, x - 0.05, P + 1.0, z1 - 0.05, x + 0.05, P + 2.2, z1 + 0.05);
    b.deco(CREAM, x0 - 0.05, P + 2.2, z0, x1 + 0.05, P + 2.5, z1 + 0.06);
    b.sign(AR('待合室', 'Waiting room'), (x0 + x1) / 2, P + 2.35, z1 + 0.07, [0, 1], 1.4, 0.24);
  }

  // The footbridge: a boarded deck over both tracks (clear of the wire), timber sides glazed above
  // the dado, a roof; lattice legs on the two platforms.
  const BX = 1.3, top = D + 2.45;
  b.box(BOARD, -BX, D - 0.22, -ZO, BX, D, ZO);
  b.deco(STEEL, -BX - 0.06, D - 0.6, -ZO, -BX + 0.06, D - 0.22, ZO);
  b.deco(STEEL, BX - 0.06, D - 0.6, -ZO, BX + 0.06, D - 0.22, ZO);
  for (const sx of [-1, 1]) {
    // (The stairs arrive through the −x side at each end.)
    for (const [z0, z1] of sx < 0 ? [[-SZ, SZ]] : [[-ZO, ZO]]) {
      b.block(sx * BX - 0.06, D, z0, sx * BX + 0.06, top, z1);
      b.deco(WOOD, sx * BX - 0.05, D, z0, sx * BX + 0.05, D + 1.05, z1);
      b.deco('glass', sx * BX - 0.02, D + 1.05, z0, sx * BX + 0.02, D + 2.1, z1);
      for (let z = z0; z <= z1 + 1e-6; z += (z1 - z0) / Math.round((z1 - z0) / 1.4)) b.deco(WOOD, sx * BX - 0.05, D + 1.05, z - 0.04, sx * BX + 0.05, D + 2.1, z + 0.04);
      b.deco(WOOD, sx * BX - 0.06, D + 2.1, z0, sx * BX + 0.06, D + 2.3, z1);
    }
  }
  for (const s of [-1, 1]) {
    b.box(WOOD, -BX, D, Math.min(s * ZO, s * (ZO - 0.08)), BX, top - 0.15, Math.max(s * ZO, s * (ZO - 0.08)));
    for (const sx of [-1, 1]) b.box(STEEL, sx * (BX - 0.1) - 0.08, P, s * (ZO - 0.22) - 0.08, sx * (BX - 0.1) + 0.08, D - 0.22, s * (ZO - 0.22) + 0.08);
    b.sign(AR(`${nums[s < 0 ? 0 : 1]}番のりば ←`, `Platform ${nums[s < 0 ? 0 : 1]} — stairs down`), 0, D + 1.75, s * (ZO - 0.09), [0, -s], 2.0, 0.36);
    b.mesh(INDOOR_LAMP, 'sphere', 0, top - 0.3, s * 5, 0.15, 0.15, 0.15);
  }
  b.deco('paint:#5a6660', -BX - 0.35, top - 0.15, -ZO - 0.3, BX + 0.35, top - 0.08, ZO + 0.3);
  b.deco(BOARD, -BX - 0.35, top - 0.19, -ZO - 0.3, BX + 0.35, top - 0.15, ZO + 0.3);
  b.zone('passage', -BX, D - 0.2, -ZO, BX, top, ZO, `${name.ja} こ線橋`, `${name.en} — footbridge`, true);

  // The wire's portals (the running line leaves the platforms to the station): a steel frame over
  // both tracks and both platforms every 48 m.
  const beam = P - PF_H + 5.57;
  for (let x = -120; x <= 120; x += 48) {
    for (const s of [-1, 1]) b.deco(WIRE, x - 0.15, bed - 3.2, s * (ZO + 0.45) - 0.15, x + 0.15, beam, s * (ZO + 0.45) + 0.15);
    b.deco(WIRE, x - 0.12, beam - 0.35, -ZO - 0.6, x + 0.12, beam, ZO + 0.6);
    for (const s of [-1, 1]) b.deco(WIRE, x - 0.04, P - PF_H + 5.05, s * line.trackOffset - 0.04, x + 0.04, beam - 0.35, s * line.trackOffset + 0.04);
  }
  return b.out;
}

// ════════════════════════════════════════════════════════════════════════════════════════════
// Kon'yahama (2026-11-23, for now): two side platforms at street level, the level crossing over
// Tsumugi-dōri just past their south end (aizomecho-street.ts). A temporary build: plain platforms,
// a short shelter on each, a chain-link fence; the way out (down the ramp to the crossing) is shut
// until the station gets its own design.
// ════════════════════════════════════════════════════════════════════════════════════════════
export function konyahama(): Build {
  const S = site('konyahama'), { b, line, c, P, nums, name } = S;
  const H = 84, ZI = 5.8, ZO = 9.2, CAN = 22;
  const STEEL = 'metal:#5b6670', FACE = 'concrete', ROOF = 'metal:#8b949b', MESH = 'trackside:#6f7a72';
  b.out.plot = { x: H + 6, z: 13 };
  b.out.spawn = { pos: [-10, P, -7.4], yaw: -Math.PI / 2 };
  for (const s of [-1, 1] as const) {
    const zz = (a: number, e: number): [number, number] => [Math.min(s * a, s * e), Math.max(s * a, s * e)];
    const track = s < 0 ? 'down' : 'up', n = nums[s < 0 ? 0 : 1];
    // The platform: a concrete body from the ground, asphalt on top, the white edge band.
    b.box(FACE, -H, 0, zz(ZI + 0.1, ZO)[0], H, P - 0.14, zz(ZI + 0.1, ZO)[1]);
    b.box('asphalt', -H, P - 0.14, zz(ZI, ZO)[0], H, P, zz(ZI, ZO)[1]);
    b.deco('flat:#e9e6dc', -H, P - 0.14, zz(ZI, ZI + 0.3)[0], H, P + 0.002, zz(ZI, ZI + 0.3)[1]);
    psd(c, s * ZI, s, track, P, [-H, H]);
    endRail(b, -H, P, zz(ZI, ZO)[0], zz(ZI, ZO)[1], STEEL);
    b.zone('platform', -H, P - 0.2, zz(ZI, ZO + 0.3)[0], H, P + 5.2, zz(ZI, ZO + 0.3)[1], `${name.ja} ${n}番のりば`, `${name.en} — Platform ${n}`, true, line.id);
    // The south end: a ramp down towards the crossing, shut by a gate for now.
    b.deco('flat:#b9b3a6', H - 0.06, P - 0.14, zz(ZI, ZO)[0], H + 4, 0.16, zz(ZI, ZO)[1]);
    endRail(b, H, P, zz(ZI, ZO)[0], zz(ZI, ZO)[1], STEEL);
    b.sign(NOTICE('出口は工事中です', 'Way out under construction — not open yet'), H - 0.08, P + 1.6, s * (ZI + ZO) / 2, [-1, 0], 1.5, 0.5);

    // The back: a chain-link fence on steel posts.
    b.block(-H, P, zz(ZO - 0.06, ZO + 0.06)[0], H, P + 1.6, zz(ZO - 0.06, ZO + 0.06)[1]);
    b.deco(MESH, -H, P, zz(ZO - 0.02, ZO + 0.02)[0], H, P + 1.5, zz(ZO - 0.02, ZO + 0.02)[1]);
    b.deco(STEEL, -H, P + 1.48, zz(ZO - 0.03, ZO + 0.03)[0], H, P + 1.54, zz(ZO - 0.03, ZO + 0.03)[1]);
    for (let x = -H; x <= H; x += 3) b.deco(STEEL, x - 0.03, P, s * ZO - 0.03, x + 0.03, P + 1.55, s * ZO + 0.03);

    // A short shelter: steel posts at the back, a mono-pitch roof out over the platform.
    for (let x = -CAN; x <= CAN; x += 5.5) {
      b.box(STEEL, x - 0.06, P, zz(ZO - 0.5, ZO - 0.38)[0], x + 0.06, P + 3.0, zz(ZO - 0.5, ZO - 0.38)[1]);
      b.deco(STEEL, x - 0.04, P + 2.8, zz(ZI + 0.2, ZO - 0.38)[0], x + 0.04, P + 2.9, zz(ZI + 0.2, ZO - 0.38)[1]);
    }
    b.deco(ROOF, -CAN - 0.4, P + 2.9, zz(ZI - 0.1, ZO)[0], CAN + 0.4, P + 2.96, zz(ZI - 0.1, ZO)[1]);
    for (const x of [-CAN + 6, CAN - 6]) {
      b.mesh(INDOOR_LAMP, 'sphere', x, P + 2.75, s * 7.2, 0.15, 0.15, 0.15);
    }
    for (const x of [-12, 4, 14]) {
      fitting(b, 'pbench_old', x, P, s * (ZO - 0.6), [0, -s]);
      b.block(x - 0.9, P, zz(ZO - 1.0, ZO - 0.08)[0], x + 0.9, P + 0.45, zz(ZO - 1.0, ZO - 0.08)[1]);
    }
    depBoard(S, 0, P + 2.25, s * 7.4, P + 2.8, track);
    // Lamp posts along the fence, a name board at every other one.
    for (const sx of [-1, 1]) for (let k = 0; k < 4; k++) {
      const x = sx * (30 + k * 15);
      b.box(STEEL, x - 0.06, P, zz(ZO - 0.3, ZO - 0.18)[0], x + 0.06, P + 3.5, zz(ZO - 0.3, ZO - 0.18)[1]);
      b.deco(STEEL, x - 0.03, P + 3.4, zz(ZO - 1.5, ZO - 0.18)[0], x + 0.03, P + 3.46, zz(ZO - 1.5, ZO - 0.18)[1]);
      b.mesh(INDOOR_LAMP, 'sphere', x, P + 3.22, s * (ZO - 1.4), 0.15, 0.15, 0.15);
      if (k % 2 === 0) nameBoard(S, x + 4, P + 1.75, s * (ZO - 0.4), STEEL);
    }
    nameBoard(S, -8, P + 1.75, s * (ZO - 0.6), STEEL);
  }
  vending(b, 9, P, -(ZO - 0.45), [0, 1], 'vending', 'old');
  return b.out;
}
