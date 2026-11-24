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
import { fitting, icPost } from './fittings';
import { KONYA } from './anchors/konya';
import { LIFT_OUT, lift } from './lift';
import { streetLamp } from './roads';
import { inAizome, konyaStreet } from './konyahama-street';
import { BED, GROUND_Y as GY, PF_H, psd, stairs, vending, type Ctx, type StationStyle } from './kit';

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
// Kon'yahama (rebuilt 2026-11-24): two side platforms at street level on the old shore, the level
// crossing over Tsumugi-dōri past their south end. The 1930s timber station house stands behind
// platform 1 by the crossing (its rooms: konyaHouse, below); a green steel footbridge with a lift at
// each end joins the platforms; platform 2 has a small wicket of its own, down a ramp to the lane
// along the line. Timber posts and rust-red iron roofs over the middle of the platforms.
// The shore west of the line: konyahama-street.ts.
//
// Frame (the line's): +x south, +z west. Aizomechō frame z = x − 136, x = −185 − z.
// ════════════════════════════════════════════════════════════════════════════════════════════
/** Kon'yahama's openings, in the line's frame (x along it). */
const KON = {
  H: 84, ZI: 5.8, ZO: 9.2,
  /** The footbridge's middle, and the stairs up to it on each platform (x range). */
  FB: 64, STAIR: [53.0, 62.7] as [number, number], SZ: 7.7,
  /** The station house behind platform 1 (x range), and its doorway onto the platform. */
  HOUSE: [70, 100] as [number, number], DOOR: [78, 82] as [number, number],
  /** Platform 2's wicket through the fence, and the ramp down the lane from it. */
  WICKET: [76, 80] as [number, number], RAMP: [80, 96] as [number, number],
  /** The roofs over the platforms. */
  CAN: [-36, 50] as [number, number],
};

export function konyahama(): Build {
  const S = site('konyahama'), { b, line, c, P, nums, name } = S;
  const { H, ZI, ZO, FB, STAIR, SZ, HOUSE, DOOR, WICKET, RAMP, CAN } = KON;
  const D = P + 4.9, BX = 1.3, LZ = ZO + 0.2;
  const STEEL = 'metal:#5b6670', GREEN = 'metal:#3f5a4c', FACE = 'concrete', ROOF = 'metal:#7a4a3a', TIMBER = 'wood:#5b4433', CREAM = 'paint:#e9dfc6', WIRE = 'trackside:#8f969c';
  // The plot takes in the shore west of the line (konyahama-street.ts) and the house east of it: +x is south, +z west.
  b.out.plot = { x: 156, z: 72, north: 36 };
  // (The spawn is in the station house's ticket hall: konyaHouse.)
  const gapsOf = (s: -1 | 1): [number, number][] => (s < 0 ? [[FB - 0.6, FB + 0.6], [HOUSE[0], H]] : [[FB - 0.6, FB + 0.6], WICKET]);
  const fenceRuns = (s: -1 | 1): [number, number][] => {
    const out: [number, number][] = [];
    let from = -H;
    for (const [a, e] of gapsOf(s)) {
      if (a > from) out.push([from, a]);
      from = e;
    }
    if (from < H) out.push([from, H]);
    return out;
  };

  for (const s of [-1, 1] as const) {
    const zz = (a: number, e: number): [number, number] => [Math.min(s * a, s * e), Math.max(s * a, s * e)];
    const track = s < 0 ? 'down' : 'up', n = nums[s < 0 ? 0 : 1], other = nums[s < 0 ? 1 : 0];
    // The platform: a concrete body from the ground, asphalt on top, the white edge band, tactile line.
    b.box(FACE, -H, 0, zz(ZI + 0.1, ZO)[0], H, P - 0.14, zz(ZI + 0.1, ZO)[1]);
    b.box('asphalt', -H, P - 0.14, zz(ZI, ZO)[0], H, P, zz(ZI, ZO)[1]);
    b.deco('flat:#e9e6dc', -H, P - 0.14, zz(ZI, ZI + 0.3)[0], H, P + 0.002, zz(ZI, ZI + 0.3)[1]);
    b.deco('flat:#e3b800', -H, P, zz(ZI + 0.85, ZI + 1.15)[0], H, P + 0.006, zz(ZI + 0.85, ZI + 1.15)[1]);
    psd(c, s * ZI, s, track, P, [-H, H]);
    for (const x of [-H, H]) endRail(b, x, P, zz(ZI, ZO)[0], zz(ZI, ZO)[1], STEEL);
    b.zone('platform', -H, P - 0.2, zz(ZI, ZO + 0.3)[0], H, P + 5.2, zz(ZI, ZO + 0.3)[1], `${name.ja} ${n}番のりば`, `${name.en} — Platform ${n}`, true, line.id);

    // The back: a low timber fence on posts (the station house is platform 1's back by its south end).
    for (const [x0, x1] of fenceRuns(s)) {
      b.block(x0, P, zz(ZO - 0.06, ZO + 0.06)[0], x1, P + 1.5, zz(ZO - 0.06, ZO + 0.06)[1]);
      b.deco(TIMBER, x0, P, zz(ZO - 0.03, ZO + 0.03)[0], x1, P + 0.9, zz(ZO - 0.03, ZO + 0.03)[1]);
      b.deco(CREAM, x0, P + 0.9, zz(ZO - 0.04, ZO + 0.04)[0], x1, P + 0.98, zz(ZO - 0.04, ZO + 0.04)[1]);
      for (const y of [1.15, 1.4]) b.deco(STEEL, x0, P + y - 0.02, zz(ZO - 0.02, ZO + 0.02)[0], x1, P + y + 0.02, zz(ZO - 0.02, ZO + 0.02)[1]);
      for (let x = x0; x <= x1 + 1e-6; x += Math.max(1, (x1 - x0) / Math.max(1, Math.round((x1 - x0) / 2.4)))) b.deco(TIMBER, x - 0.05, P, s * ZO - 0.05, x + 0.05, P + 1.48, s * ZO + 0.05);
    }
    if (s < 0) b.box('asphalt', HOUSE[0], P - 0.14, -ZO - 0.2, H, P, -ZO); // (up to the house's wall)

    // The roof: round timber posts at the back, an iron roof out over the platform, lamps under it.
    for (let x = CAN[0]; x <= CAN[1] + 1e-6; x += 5.375) {
      b.box(TIMBER, x - 0.11, P, zz(ZO - 0.62, ZO - 0.4)[0], x + 0.11, P + 3.15, zz(ZO - 0.62, ZO - 0.4)[1]);
      b.deco(TIMBER, x - 0.07, P + 2.95, zz(ZI + 0.1, ZO - 0.4)[0], x + 0.07, P + 3.1, zz(ZI + 0.1, ZO - 0.4)[1]);
      b.deco(TIMBER, x - 0.05, P + 2.35, zz(ZO - 1.6, ZO - 0.62)[0], x + 0.05, P + 2.47, zz(ZO - 1.6, ZO - 0.62)[1]);
    }
    for (const [a, e, y] of [[ZI - 0.35, 7.5, 3.25], [7.5, ZO + 0.15, 3.1]] as [number, number, number][]) {
      b.deco(ROOF, CAN[0] - 0.5, P + y, zz(a, e)[0], CAN[1] + 0.5, P + y + 0.05, zz(a, e)[1]);
    }
    b.deco(CREAM, CAN[0] - 0.5, P + 3.05, zz(ZI - 0.37, ZI - 0.33)[0], CAN[1] + 0.5, P + 3.32, zz(ZI - 0.37, ZI - 0.33)[1]);
    for (let x = CAN[0] + 5; x < CAN[1]; x += 10.75) b.mesh(INDOOR_LAMP, 'sphere', x, P + 2.85, s * 7.3, 0.16, 0.16, 0.16);
    // Beyond the roof: lamp posts along the fence.
    for (const x of [-80, -66, -52, 72]) {
      if (s < 0 && x >= HOUSE[0]) continue;
      b.box(STEEL, x - 0.06, P, zz(ZO - 0.3, ZO - 0.18)[0], x + 0.06, P + 3.5, zz(ZO - 0.3, ZO - 0.18)[1]);
      b.deco(STEEL, x - 0.03, P + 3.4, zz(ZO - 1.5, ZO - 0.18)[0], x + 0.03, P + 3.46, zz(ZO - 1.5, ZO - 0.18)[1]);
      b.mesh(INDOOR_LAMP, 'sphere', x, P + 3.22, s * (ZO - 1.4), 0.15, 0.15, 0.15);
    }
    // Name boards, the departure board, benches, signs to the way out and the other platform.
    for (const x of [-60, -22.5, 20]) nameBoard(S, x, P + 1.75, s * (ZO - 0.45), STEEL);
    nameBoard(S, -45, P + 1.75, s * (ZO - 0.45), TIMBER);
    for (const x of [-28, -6, 9.7, 31.4]) {
      fitting(b, 'pbench_old', x, P, s * (ZO - 0.95), [0, -s]);
      b.block(x - 0.9, P, zz(ZO - 1.35, ZO - 0.5)[0], x + 0.9, P + 0.45, zz(ZO - 1.35, ZO - 0.5)[1]);
    }
    depBoard(S, 2, P + 2.25, s * 7.4, P + 2.95, track);
    // Signs along the fence stand on two posts of their own (the fence is too low to carry them).
    const posted = (content: Parameters<typeof b.sign>[0], x: number, w: number) => {
      b.sign(content, x, P + 2.3, s * (ZO - 0.46), [0, -s], w, 0.38);
      for (const e of [x - w / 2 + 0.25, x + w / 2 - 0.25]) b.box(STEEL, e - 0.04, P, s * (ZO - 0.4) - 0.04, e + 0.04, P + 2.49, s * (ZO - 0.4) + 0.04);
    };
    posted(AR(`${other}番のりば　こ線橋`, `Platform ${other} — over the footbridge`), STAIR[0] - 5.5, 2.4);
    // (The way-out signs stand clear of the lift's doors, FB ± 1.2.)
    if (s < 0) {
      posted(OUT('出口1　改札 →', 'Exit 1 — gates, Tsumugi-dōri →'), 67.6, 2.6);
      b.sign(OUT('出口1', 'Exit 1'), (DOOR[0] + DOOR[1]) / 2, P + 3.0, -ZO - 0.24, [0, 1], 1.6, 0.3);
    } else {
      posted(OUT('出口2　浜通方面 →', 'Exit 2 — Hama-dōri side →'), 68, 2.6);
    }
    vending(b, -2, P, s * (ZO - 0.45), [0, -s], s < 0 ? 'vending' : 'vending2', 'old');

    // The stair up to the footbridge, along the back of the platform, up towards the south.
    b.with(s < 0 ? { mz: true } : {}, () => {
      stairs(b, { x0: STAIR[0], x1: STAIR[1], z0: SZ, z1: ZO - 0.08, yLow: P, yHigh: D, mat: 'metal:#6a7a6e' });
      const k = (D - P) / (STAIR[1] - STAIR[0]);
      for (let x = STAIR[0] + 2.4; x < STAIR[1] - 0.1; x += 2.4) b.block(x, P, SZ, Math.min(x + 2.4, STAIR[1]), P + k * (x - STAIR[0]) - 0.35, ZO - 0.08);
    });
  }

  // The footbridge: a deck over both tracks (clear of the wire), green steel lattice sides, an iron
  // roof; lattice legs on the platforms; a lift at each end, standing in the lane behind the fence.
  {
    const top = D + 2.5;
    b.box('floor:#8d9094', FB - BX, D - 0.22, -LZ, FB + BX, D, LZ);
    for (const sx of [-1, 1]) {
      const x = FB + sx * BX;
      // (The stairs come up through the −x side over each platform.)
      for (const [z0, z1] of sx < 0 ? [[-SZ, SZ]] : [[-LZ, LZ]]) {
        b.block(x - 0.06, D, z0, x + 0.06, top, z1);
        b.deco(GREEN, x - 0.04, D, z0, x + 0.04, D + 0.1, z1);
        b.deco(GREEN, x - 0.04, D + 1.15, z0, x + 0.04, D + 1.25, z1);
        b.deco('glass', x - 0.015, D + 1.25, z0, x + 0.015, D + 2.2, z1);
        for (let z = z0; z < z1 - 0.1; z += 0.9) b.deco(GREEN, x - 0.03, D + 0.1, z, x + 0.03, D + 1.15, z + 0.06);
        b.deco(GREEN, x - 0.03, D + 0.6, z0, x + 0.03, D + 0.66, z1);
        b.deco(GREEN, x - 0.06, D + 2.2, z0, x + 0.06, D + 2.4, z1);
      }
    }
    b.deco(ROOF, FB - BX - 0.4, top - 0.1, -LZ - 0.3, FB + BX + 0.4, top - 0.05, LZ + 0.3);
    b.deco(GREEN, FB - BX - 0.1, D - 0.6, -LZ, FB - BX + 0.06, D - 0.22, LZ);
    b.deco(GREEN, FB + BX - 0.06, D - 0.6, -LZ, FB + BX + 0.1, D - 0.22, LZ);
    for (const s of [-1, 1]) {
      for (const sx of [-1, 1]) b.box(GREEN, FB + sx * (BX - 0.12) - 0.1, P, s * (ZI + 0.9) - 0.1, FB + sx * (BX - 0.12) + 0.1, D - 0.22, s * (ZI + 0.9) + 0.1);
      b.sign(AR(`${nums[s < 0 ? 0 : 1]}番のりば`, `Platform ${nums[s < 0 ? 0 : 1]}`), FB, D + 2.0, s * (ZO - 1.0), [s < 0 ? -1 : 1, 0], 1.6, 0.32);
      b.mesh(INDOOR_LAMP, 'sphere', FB, top - 0.35, s * 4.5, 0.15, 0.15, 0.15);
      // The lift: its doors to the platform below and onto the deck above.
      // (On a concrete plinth from the lane: the shaft starts at the platform's level.)
      b.with(s < 0 ? { rot: 2, t: [FB, 0, -LZ] } : { t: [FB, 0, LZ] }, () => {
        b.box(FACE, -LIFT_OUT.hw - 0.05, -0.6, 0, LIFT_OUT.hw + 0.05, P - 0.2, LIFT_OUT.d + 0.05);
        lift(b, { levels: [{ y: P, ja: 'ホーム', en: 'Platform' }, { y: D, ja: 'こ線橋', en: 'Footbridge' }], mat: 'metal:#5f7766' });
      });
    }
    b.zone('passage', FB - BX, D - 0.2, -LZ, FB + BX, top, LZ, `${name.ja} こ線橋`, `${name.en} — footbridge`, true);
  }

  // Platform 2's wicket: a gap in the fence, IC posts and a ticket machine on a landing under a little
  // roof, and a ramp down the lane to the south.
  {
    const [w0, w1] = WICKET, z0 = ZO + 0.2, z1 = ZO + 1.8;
    b.box(FACE, w0, 0, z0, w1, P - 0.1, z1);
    b.box('asphalt', w0, P - 0.1, z0 - 0.2, w1, P, z1);
    b.block(w0 - 0.1, P, z0, w0, P + 1.5, z1);
    b.block(w0, P, z1, w1, P + 1.2, z1 + 0.08);
    icPost(b, 'in', w0 + 1.6, P, z1 - 0.3, [0, -1]);
    icPost(b, 'out', w0 + 2.6, P, z1 - 0.3, [0, -1]);
    fitting(b, 'tix_old', w0 + 0.55, P, z1 - 0.3, [0, -1]);
    b.block(w0 + 0.05, P, z1 - 0.6, w0 + 1.05, P + 1.9, z1);
    b.sign({ k: 'machine', v: 'ticket', era: 'old' }, w0 + 0.55, P + 1.0, z1 - 0.61, [0, -1], 0.98, 1.8);
    for (const x of [w0 + 0.1, w1 - 0.1]) b.box(TIMBER, x - 0.08, P, z1 - 0.12, x + 0.08, P + 2.8, z1 + 0.04);
    b.deco(ROOF, w0 - 0.4, P + 2.8, ZO - 0.6, w1 + 0.4, P + 2.86, z1 + 0.5);
    b.mesh(INDOOR_LAMP, 'sphere', (w0 + w1) / 2, P + 2.65, (z0 + z1) / 2, 0.14, 0.14, 0.14);
    b.sign(OUT(`${name.ja} 出口2`, `${name.en} — Exit 2`), (w0 + w1) / 2, P + 2.55, z1 + 0.06, [0, 1], 2.4, 0.36);
    b.sign(NOTICE('乗車券は券売機またはICカードで', 'Buy a ticket from the machine or touch your IC card'), w0 - 1.4, P + 1.0, ZO + 0.07, [0, 1], 1.1, 0.5);
    b.zone('concourse', w0, P - 0.2, z0, w1, P + 3, z1, `${name.ja} 出口2改札`, `${name.en} — Exit 2 wicket`, true);
    // The ramp: down 1:12 to the lane, a rail on its open side, nobody under it.
    const [r0, r1] = RAMP, len = r1 - r0;
    b.ramp(r0, z0, r1, z1, 0, P, [-1, 0]);
    b.slant('concrete', r0, -0.4, z0, r1, P - 0.02, z1, -P);
    b.slant('asphalt', r0, P - 0.02, z0, r1, P, z1, -P);
    for (let x = r0; x < r1 - 0.5; x += 2) {
      const y = P * (1 - (x + 2 - r0) / len) - 0.3;
      if (y > 0.1) b.block(x, 0, z0, x + 2, y, z1);
    }
    b.block(r0, 0, z1, r1, P + 1.0, z1 + 0.08);
    b.slant(STEEL, r0, P + 0.85, z1 + 0.01, r1, P + 0.9, z1 + 0.06, -P);
    for (let x = r0; x <= r1 + 1e-6; x += 4) b.deco(STEEL, x - 0.03, P * (1 - (x - r0) / len), z1 + 0.01, x + 0.03, P * (1 - (x - r0) / len) + 0.9, z1 + 0.06);
    b.zone('street', r1, -0.3, ZO + 0.2, r1 + 4, 5, ZO + 5.6, `${name.ja} 出口2`, 'Exit 2', true);
  }

  // The wire's portals: masts in the lanes behind the fences, a beam over both tracks.
  const beam = P - PF_H + 5.57;
  for (const x of [-76, -28, 20, 46]) {
    for (const s of [-1, 1]) {
      b.deco(WIRE, x - 0.15, 0, s * (ZO + 0.5) - 0.15, x + 0.15, beam, s * (ZO + 0.5) + 0.15);
      b.block(x - 0.18, 0, s * (ZO + 0.5) - 0.18, x + 0.18, 3, s * (ZO + 0.5) + 0.18);
    }
    b.deco(WIRE, x - 0.12, beam - 0.35, -ZO - 0.7, x + 0.12, beam, ZO + 0.7);
    for (const s of [-1, 1]) b.deco(WIRE, x - 0.04, P - PF_H + 5.05, s * line.trackOffset - 0.04, x + 0.04, beam - 0.35, s * line.trackOffset + 0.04);
  }
  // The trackbed is solid under the ballast's top, the length of the plot and out under the fences' feet:
  // off a platform's edge, or past the fence by the crossing, you land on the ballast, not out of the world.
  b.block(-99.3, -0.6, -ZO - 0.6, 155.5, P - PF_H - 0.2, ZO + 0.6);
  konyaStreet(b);
  konyaHouse(S);
  return b.out;
}

/**
 * Kon'yahama's station house (tools/blender/build_konya.py `ekisha`): built in Aizomechō's frame, its
 * front on Tsumugi-dōri's side at z −36, the house behind to z −66 and from the platform's fence at
 * x −175.6 east to −155. In the model's frame (front at z 0 facing south, +x west): the street door
 * and porch steps in the middle of the front, the ramp up the east side to a side door, the ticket
 * hall to z 11, the gates, the waiting room behind them and the doorway onto platform 1.
 */
function konyaHouse(S: Site) {
  const { b, name, line, station } = S;
  inAizome(b, () => {
    const A = KONYA.ekisha, w2 = A.w / 2, d = A.d, FL = GY + 1.2, CL = FL + 3.5, P = A.pts;
    const WALL = 'paint:#efe6d0', WOOD = 'wood:#6b5138', FLOOR = 'tile:#9a958a', STEEL_K = 'metal:#5b6670', T = 0.2;
    // The forecourt and the alley up the east side, walked in this world (Aizomechō's paving under them).
    b.block(-175.6, -0.6, -66.5, -149.7, GY, -19.5);
    b.deco('flat:#8f8a80', -175.6, GY + 0.004, -36, -155.2, GY + 0.01, -19.5);
    b.block(-175.9, -1, -36, -175.6, 60, -19.5);
    b.block(-155, -1, -66.8, -149.7, 60, -66.5);
    b.zone('street', -175.3, -0.3, -35.6, -150, 8, -19.8, `${station.nameJa}駅前`, 'Exit 1', true);
    b.zone('street', -154.8, -0.3, -65.8, -150, 6, -37, `${name.ja} 駐輪場`, `${name.en} — bicycle parking`, true);
    for (let z = -62; z < -40; z += 1.1) {
      const d0 = b.dir([1, 0]);
      b.out.models.push({ kind: 'places', id: 'bicycle', pos: b.pt(-150.6, GY, z), yaw: Math.atan2(-d0[0], -d0[1]), seed: 0, merge: true });
    }
    streetLamp(b, 'lamp_small', -150.3, -50, [-1, 0]);
    streetLamp(b, 'lamp_shop', -158, -21, [0, -1]);

    b.with({ rot: 2, t: [-165.3, 0, -36] }, () => {
      b.model('konya', 'ekisha', 0, GY, 0, 1);
      // A teleport here lands in the ticket hall, inside the street door, facing the gates.
      const look = b.dir([0, 1]);
      b.out.spawn = { pos: b.pt(0, FL, 3), yaw: Math.atan2(-look[0], -look[1]) };
      // ── Outside: the walls, the porch steps and landing, the side ramp ──
      const [sd0, sd1] = [7.0, 8.7], [pf0, pf1] = [18.0, 22.0], [fd0, fd1] = [-2.6, 2.6];
      b.block(-w2 - 0.1, -1, -0.1, fd0, CL + 1, 0.15);
      b.block(fd1, -1, -0.1, w2 + 0.1, CL + 1, 0.15);
      b.block(-w2 - 0.1, -1, d - 0.15, w2 + 0.1, CL + 1, d + 0.1);
      b.block(-w2 - 0.1, -1, 0, -w2 + 0.15, CL + 1, sd0);
      b.block(-w2 - 0.1, -1, sd1, -w2 + 0.15, CL + 1, d);
      b.block(w2 - 0.15, -1, 0, w2 + 0.1, CL + 1, pf0);
      b.block(w2 - 0.15, -1, pf1, w2 + 0.1, CL + 1, d);
      b.block(-w2 - 0.1, -1, 0, w2 + 0.1, FL, d);
      b.ramp(-4.0, -4.5, 4.0, -2.1, GY, FL, [0, 1]);
      b.block(-4.4, -0.6, -2.1, 4.4, FL, 0.05);
      for (const x of [-4.2, 4.2]) b.block(x - 0.15, GY, -4.4, x + 0.15, FL + 3.3, -4.1);
      for (const x of [-2.0, 2.0]) b.block(x - 0.04, GY, -4.5, x + 0.04, FL + 1.0, -2.1);
      b.ramp(-w2 - 1.7, sd0 - 14.4, -w2 - 0.1, sd0, GY, FL, [0, 1]);
      b.block(-w2 - 1.7, -0.6, sd0, -w2 - 0.1, FL, sd1 + 0.3);
      b.block(-w2 - 1.8, GY, sd0 - 14.4, -w2 - 1.7, FL + 1.0, sd1 + 0.3);
      b.block(-w2 - 1.7, GY, sd1 + 0.3, -w2 - 0.1, FL + 1.0, sd1 + 0.4);
      // ── Inside: floor, walls just inside the model's, ceiling, lights ──
      const x0 = -w2 + T, x1 = w2 - T, z0 = T, z1 = d - T;
      // (A centimetre over the model's stone base, whose top is the floor: they flickered.)
      b.deco(FLOOR, x0, FL, z0, x1, FL + 0.012, z1);
      b.deco(WOOD, x0, CL, z0, x1, CL + 0.05, z1);
      const inner = (ax0: number, az0: number, ax1: number, az1: number) => b.deco(WALL, ax0, FL, az0, ax1, CL, az1);
      inner(x0 - 0.02, z0 - 0.02, fd0, z0);
      inner(fd1, z0 - 0.02, x1 + 0.02, z0);
      b.deco(WALL, fd0, FL + 2.8, z0 - 0.02, fd1, CL, z0);
      inner(x0 - 0.02, z1, x1 + 0.02, z1 + 0.02);
      inner(x0 - 0.02, z0, x0, sd0);
      inner(x0 - 0.02, sd1, x0, z1);
      inner(x1, z0, x1 + 0.02, pf0);
      inner(x1, pf1, x1 + 0.02, z1);
      // The wainscot, stopping at the side door and the doorway onto the platform.
      for (const [a, e] of [[z0, sd0], [sd1, z1]]) b.deco(WOOD, x0 - 0.01, FL, a, x0 + 0.01, FL + 1.0, e);
      for (const [a, e] of [[z0, pf0], [pf1, z1]]) b.deco(WOOD, x1 - 0.01, FL, a, x1 + 0.01, FL + 1.0, e);
      for (const [a, e] of [[fd0, fd1]] as [number, number][]) b.deco(WOOD, a, FL + 2.8, -0.1, e, CL, z0);
      b.deco(WOOD, x0 - 0.1, FL + 2.4, sd0, x0 + 0.02, CL, sd1);
      b.deco(WOOD, x1 - 0.02, FL + 2.6, pf0, x1 + 0.1, CL, pf1);
      for (let z = 3; z < d - 1; z += 6) for (const x of [-4.5, 4.5]) {
        b.deco('light', x - 0.6, CL - 0.06, z - 0.12, x + 0.6, CL - 0.01, z + 0.12);
      }

      // ── The ticket hall: the office on the east, ticket machines, the gates across at z 11 ──
      const GZ = 11;
      b.box(WOOD, x0, FL, 9, -5, CL, 20);
      b.sign({ k: 'machine', v: 'window' }, -7.6, FL + 1.45, 8.98, [0, -1], 3.6, 1.9);
      b.sign({ k: 'machine', v: 'door' }, -4.98, FL + 1.05, 16, [1, 0], 1.0, 2.1);
      for (let i = 0; i < 6; i++) {
        const gx = -4.87 + i * 1.05;
        b.block(gx - 0.13, FL, GZ - 0.8, gx + 0.13, FL + 1.0, GZ + 0.8);
        fitting(b, 'gatecab', gx, FL, GZ, [1, 0]);
        b.deco(i % 3 === 0 ? 'glow:#e53935' : 'glow:#32c86a', gx - 0.06, FL + 0.72, GZ - 0.81, gx + 0.06, FL + 0.86, GZ - 0.78);
      }
      b.box('metal:#c4c8cc', 0.51, FL, GZ - 0.05, x1, FL + 1.15, GZ + 0.05);
      b.deco('glass', 0.51, FL + 1.15, GZ - 0.02, x1, FL + 1.9, GZ + 0.02);
      // (The sign's front looks into the paid side.)
      b.with({ rot: 1, t: [-2.2, 0, GZ] }, () => b.hang({ k: 'guide', ja: '出口', en: 'Exit', bg: 'yellow', arrow: 'up' }, 0, FL + 2.7, 0, 4.2, 0.5,
        { ceil: CL, back: { k: 'guide', ja: 'のりば', en: 'To trains', bg: 'navy', badges: [line.id], arrow: 'up' } }));
      // Ticket machines against the gate fence, facing the doors; the fare chart above them.
      b.block(3.3, FL, GZ - 0.65, 6.9, FL + 1.95, GZ - 0.05);
      for (const [i, id] of [[0, 'tix_old'], [1, 'tix_old'], [2, 'tixic_old']] as [number, string][]) {
        fitting(b, id, 3.85 + i * 1.05, FL, GZ - 0.35, [0, -1]);
        b.sign({ k: 'machine', v: id === 'tixic_old' ? 'charge' : 'ticket', era: 'old' }, 3.85 + i * 1.05, FL + 1.0, GZ - 0.66, [0, -1], 0.98, 1.8);
      }
      b.sign(AR(`運賃表　${line.nameJa}`, `Fares — ${line.nameEn}`), 5.1, FL + 2.5, GZ - 0.06, [0, -1], 3.4, 0.6);
      for (const x of [3.6, 6.6]) b.deco(STEEL_K, x - 0.02, FL + 2.8, GZ - 0.08, x + 0.02, CL, GZ - 0.04);
      b.sign({ k: 'clock' }, -3, FL + 2.9, d - T - 0.02, [0, -1], 0.6, 0.6);
      // Benches along the west wall of the hall, a notice board, the timetable.
      for (const z of [2.5, 6.0]) {
        fitting(b, 'pbench_old', x1 - 0.5, FL, z, [-1, 0]);
        b.block(x1 - 0.9, FL, z - 0.9, x1 - 0.05, FL + 0.45, z + 0.9);
      }
      b.sign(NOTICE(`時刻表　${name.ja}`, `Timetable — ${station.nameRomaji}`), x1 - 0.03, FL + 1.8, 4.3, [-1, 0], 1.6, 0.9);
      b.zone('concourse', x0, FL - 0.2, z0, x1, CL, GZ, `${name.ja} 改札外`, `${name.en} — ticket hall`, true);

      // ── Inside the gates: the waiting room, the doorway to platform 1, toilets at the back ──
      b.box(WALL, 3.5, FL, 24.5, x1, CL, z1);
      b.sign(AR('お手洗い', 'Toilets'), 6.2, FL + 2.4, 24.48, [0, -1], 1.6, 0.3);
      for (const z of [22, 26]) {
        fitting(b, 'pbench_old', x0 + 0.5, FL, z, [1, 0]);
        b.block(x0 + 0.05, FL, z - 0.9, x0 + 0.9, FL + 0.45, z + 0.9);
      }
      b.sign(OUT(`${S.nums[0]}番のりば →`, `Platform ${S.nums[0]} →`), x1 - 0.03, FL + 3.0, (pf0 + pf1) / 2 - 2.6, [-1, 0], 1.6, 0.3);
      b.sign(AR(`${S.nums[1]}番のりば　こ線橋`, `Platform ${S.nums[1]} — over the footbridge`), 0, FL + 2.4, z1 - 0.02, [0, -1], 2.4, 0.38);
      b.zone('concourse', x0, FL - 0.2, GZ, x1, CL, z1, `${name.ja} 改札内`, `${name.en} — inside the gates`, true);

      // ── The names: on the porch gable, the platform side; the clock over the porch ──
      const at = (p: number[]) => [p[0], p[1] + GY, p[2]] as const;
      const [nx, ny, nz] = at(P.name);
      b.sign({ k: 'label', text: `${name.ja}`, sub: name.en, fg: '#1f2023', bg: '#f4efe0' }, nx, ny, nz, [P.name[5], P.name[6]], P.name[3], P.name[4]);
      const [sx, sy, sz] = at(P.side);
      b.sign({ k: 'label', text: station.nameJa, sub: station.nameRomaji, fg: '#1f2023', bg: '#f4efe0' }, sx, sy, sz, [P.side[5], P.side[6]], P.side[3], P.side[4]);
      const [cx, cy, cz] = at(P._clock);
      b.sign({ k: 'clock' }, cx, cy, cz, [0, -1], 0.5, 0.5);
    });
  });
}
