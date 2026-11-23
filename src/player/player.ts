// Player state and per-tick movement. Plain module state (not React): the render
// loop mutates it every frame and the HUD samples it a few times a second.

import { STATION_WORLDS, stationWorld } from '../stations';
import { trainOfFrame, trains, type TrainRuntime } from '../trains/system';
import { carry, stepBody, zoneAt, type Body, type Frame } from '../world/collision';
import { rideLifts } from '../world/lifts';
import type { Zone } from '../world/builder';
import { HOME_STATION } from '../data/network';
import type { StationWorld } from '../stations';

export const EYE = 1.62;
const WALK = 3.4, RUN = 6.4;

export const player = {
  body: { pos: [0, 0, 0], vy: 0, grounded: false, ride: null } as Body,
  yaw: 0,
  pitch: 0,
  /** Smoothed feet height, so stairs do not judder the camera. */
  eyeY: 0,
  lastStation: HOME_STATION as string,
};

/**
 * A gale on the player, set by the scene: `power` 0 … 1 in the open, 0 under cover; (`x`, `z`) is
 * the way it blows. It slows walking into it and unsteadies the view; it never moves the player.
 */
export const gale = { x: 0.93, z: 0.37, power: 0 };
let galeT = 0;

export const input = {
  fwd: false, back: false, left: false, right: false,
  sprint: false, jump: false,
  turnL: false, turnR: false, lookU: false, lookD: false,
};
export function clearInput() {
  for (const k of Object.keys(input) as (keyof typeof input)[]) input[k] = false;
}

/** What the HUD shows. Updated by the tick. */
export const where = {
  station: null as StationWorld | null,
  zone: null as Zone | null,
  train: null as TrainRuntime | null,
};

export function teleport(stationId: string) {
  const w = stationWorld(stationId);
  const b = player.body;
  b.pos = [w.spawn.pos[0], w.spawn.pos[1] + 0.05, w.spawn.pos[2]];
  b.vy = 0;
  b.grounded = false;
  b.ride = null;
  player.yaw = w.spawn.yaw;
  player.pitch = 0;
  player.eyeY = b.pos[1];
  player.lastStation = stationId;
}

let frames: Frame[] | null = null;
function allFrames(): Frame[] {
  if (!frames || frames.length !== STATION_WORLDS.length + trains.length * (trains[0]?.cars.length ?? 0)) {
    frames = [...STATION_WORLDS.map((s) => s.frame), ...trains.flatMap((t) => t.cars)];
  }
  return frames;
}

export function nearestStation(x: number, z: number): { world: StationWorld; dist: number } {
  let best = STATION_WORLDS[0], bd = Infinity;
  for (const s of STATION_WORLDS) {
    const d = Math.hypot(s.frame.x - x, s.frame.z - z);
    if (d < bd) {
      bd = d;
      best = s;
    }
  }
  return { world: best, dist: bd };
}

export function tickPlayer(dt: number) {
  const b = player.body;
  // Ride with the car we are standing in (trains have already moved this tick).
  let dyaw = carry(b);
  if (dyaw > Math.PI) dyaw -= 2 * Math.PI;
  if (dyaw < -Math.PI) dyaw += 2 * Math.PI;
  player.yaw += dyaw;

  // Keyboard look (fallback when the mouse is not captured).
  const turn = (input.turnL ? 1 : 0) - (input.turnR ? 1 : 0);
  player.yaw += turn * 1.9 * dt;
  player.pitch = Math.max(-1.45, Math.min(1.45, player.pitch + ((input.lookU ? 1 : 0) - (input.lookD ? 1 : 0)) * 1.2 * dt));

  const f = (input.fwd ? 1 : 0) - (input.back ? 1 : 0), s = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const len = Math.hypot(f, s) || 1;
  const sin = Math.sin(player.yaw), cos = Math.cos(player.yaw);
  const dx = (-sin * f + cos * s) / len, dz = (-cos * f - sin * s) / len;
  // Into a gale you lean and slow; with it behind you, you are hurried along a little.
  const along = dx * gale.x + dz * gale.z;
  const speed = (input.sprint ? RUN : WALK) * (1 + gale.power * (along < 0 ? 0.4 * along : 0.1 * along));
  const vx = dx * speed, vz = dz * speed;
  // Gusts push at the head: a slight, slow unsteadiness, stronger while walking.
  if (gale.power > 0) {
    galeT += dt;
    const push = gale.power * (f || s ? 1 : 0.5) * dt;
    player.yaw += push * 0.03 * (Math.sin(galeT * 1.7) + 0.6 * Math.sin(galeT * 4.1 + 1));
    player.pitch += push * 0.015 * Math.sin(galeT * 2.3 + 2);
  }

  const all = allFrames();
  const steps = Math.max(1, Math.ceil(dt / 0.02));
  const h = dt / steps;
  let jump = input.jump;
  // (A lift carries whoever stands in it: no walking or falling meanwhile.)
  const lifted = rideLifts(b, dt, STATION_WORLDS);
  for (let i = 0; i < steps && !lifted; i++) {
    stepBody(b, all, vx * h, vz * h, h, jump);
    jump = false;
  }

  // Camera height: follow steps smoothly while on the ground.
  const k = b.grounded ? Math.min(1, dt * 16) : 1;
  player.eyeY += (b.pos[1] - player.eyeY) * k;
  if (Math.abs(b.pos[1] - player.eyeY) > 1.2) player.eyeY = b.pos[1];

  // Where are we?
  where.train = b.ride ? trainOfFrame(b.ride) : null;
  const near = nearestStation(b.pos[0], b.pos[2]);
  where.station = null;
  where.zone = null;
  if (near.dist < near.world.frame.radius) {
    const z = zoneAt(near.world.frame, b.pos);
    if (z) {
      where.station = near.world;
      where.zone = z;
      if (!where.train) player.lastStation = near.world.def.id;
    }
  }
  // Safety net: fell out of the world.
  if (b.pos[1] < -60) teleport(player.lastStation);
}
