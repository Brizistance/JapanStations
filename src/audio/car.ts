// Inside the train the player rides: running noise steered by the train's real speed, and
// in-car announcements, Tokyo/Osaka Metro style. Announcements: the
// next stop just after departure, "arriving soon" with transfers and door side before the
// stop, "doors closing" at the end of the dwell, and now and then a manners notice on a
// longer run. Everything is read from the train's timetabled phase.

import { hasPlatform } from '../data/network';
import { clock } from '../sim';
import { where } from '../player/player';
import { trains, type TrainRuntime } from '../trains/system';
import { announce, CAR, carLoop, hushCar, playCar, type LoopHandle } from './engine';
import { MOTOR_OF } from './sfx';
import { CAR_DOORS_CLOSING, CAR_NOTICES, carAnnouncement, doorSideOf } from './phrases';

/** Door timing from the sim: doors start closing 3 s before the dwell ends. */
const DOOR_CLOSE_BEFORE = 3;
/** "Next stop" this long after pulling out, if the run is long enough to fit both. */
const NEXT_AFTER = 4, NEXT_MIN_RUN = 50;
/** "Arriving soon" this long before the stop. */
const SOON_BEFORE = 24;
const NOTICE_MIN_RUN = 90;

let train: string | null = null, phase = -1;
let fired = { next: false, soon: false, notice: false, closing: false };
let noticeIdx = Math.floor(Math.random() * CAR_NOTICES.length), runs = 0;

const paths = (cs: { key: string }[]) => cs.map((c) => `voice/${c.key}`);

export function tickCarAudio() {
  const t = where.train;
  if (!t || clock.scale !== 1) {
    if (train) hushCar();
    train = null;
    return;
  }
  const s = t.state, p = s.phase;
  const firstSight = train !== t.id;
  if (firstSight || phase !== s.phaseIndex) {
    train = t.id;
    phase = s.phaseIndex;
    fired = { next: false, soon: false, notice: false, closing: false };
    if (p.kind === 'run') runs++;
    if (firstSight && p.kind === 'run') fired.next = s.tau - p.t0 > NEXT_AFTER + 6; // boarded mid-run: skip the late "next"
  }
  const line = t.sim.geom.def;

  if (p.kind === 'run') {
    if (!p.inService || p.toStop < 0) return;
    const len = p.t1 - p.t0, el = s.tau - p.t0, left = p.t1 - s.tau;
    if (!fired.next && el >= NEXT_AFTER && len >= NEXT_MIN_RUN && left > SOON_BEFORE + 8) {
      fired.next = true;
      announce(CAR, 'next', paths(carAnnouncement('next', line, p.dir, p.toStop, doorSideOf(line, p.dir))));
    }
    if (!fired.soon && left <= SOON_BEFORE && el >= 3) {
      fired.soon = true;
      announce(CAR, 'soon', paths(carAnnouncement('soon', line, p.dir, p.toStop, doorSideOf(line, p.dir))));
    }
    if (!fired.notice && runs % 2 === 0 && len >= NOTICE_MIN_RUN && el >= len * 0.45 && left > SOON_BEFORE + 12) {
      fired.notice = true;
      noticeIdx = (noticeIdx + 1) % CAR_NOTICES.length;
      announce(CAR, 'notice', paths(CAR_NOTICES[noticeIdx]));
    }
  } else if (p.doors && p.stop >= 0 && p.role !== 'arrival' && hasPlatform(t.sim.geom.def, p.stop)) {
    if (!fired.closing && s.tau >= p.t1 - DOOR_CLOSE_BEFORE - 2.5) {
      fired.closing = true;
      if (s.tau < p.t1 - DOOR_CLOSE_BEFORE) announce(CAR, 'closing', paths(CAR_DOORS_CLOSING), { priority: true });
    }
  }
}

// ── Running noise ──

interface Layers {
  train: string;
  motor: LoopHandle;
  tunnel: LoopHandle;
  open: LoopHandle;
  joints: LoopHandle;
  squeal: LoopHandle;
  ac: LoopHandle;
  creak: LoopHandle;
}
let layers: Layers | null = null;
let lastSpeed = 0, lastTime = 0, accel = 0, lastDoor = 0;
const passed = new Map<string, number>();
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

function stopLayers() {
  if (!layers) return;
  for (const k of ['motor', 'tunnel', 'open', 'joints', 'squeal', 'ac', 'creak'] as const) layers[k].stop();
  layers = null;
}

/** 1/radius of the track around chainage s, from the tangent turn over ±6 m. */
function curvature(t: TrainRuntime): number {
  const path = t.sim.geom.path, s = t.state.s;
  const a = path.pointAt(s - 6), b = path.pointAt(s + 6);
  const dot = Math.min(1, Math.max(-1, a.tx * b.tx + a.tz * b.tz));
  return Math.acos(dot) / 12;
}

function centre(t: TrainRuntime) {
  const c = t.cars[t.cars.length >> 1];
  return c ? { x: c.x, z: c.z } : null;
}

export function tickCarNoise() {
  const t = where.train;
  if (!t || clock.scale !== 1) {
    stopLayers();
    return;
  }
  const def = t.sim.geom.def, sv = def.service;
  if (!layers || layers.train !== t.id) {
    stopLayers();
    layers = {
      train: t.id, motor: carLoop(MOTOR_OF[def.id] ?? 'motor-modern'), tunnel: carLoop('roll-tunnel'), open: carLoop('roll-open'),
      joints: carLoop('rail-joints'), squeal: carLoop('curve-squeal'), ac: carLoop('car-ac'), creak: carLoop('car-creak'),
    };
    lastSpeed = t.state.speed;
    lastTime = clock.time;
    lastDoor = t.state.doorOpen;
  }
  const st = t.state, speed = Math.abs(st.speed);
  const dt = clock.time - lastTime;
  if (dt > 0) {
    // Smoothed acceleration: how hard the motors are working (powering or braking).
    accel += ((speed - lastSpeed) / dt - accel) * Math.min(1, dt * 4);
    lastSpeed = speed;
    lastTime = clock.time;
  }
  const v = clamp01(speed / sv.maxSpeed);
  const effort = clamp01(Math.abs(accel) / Math.max(sv.accel, sv.decel));
  const moving = speed > 0.3;
  const tunnel = t.sim.geom.railY(st.s) < -1;

  // Motor: whine climbs with speed while powering, falls away under braking; near silent coasting.
  layers.motor.set(0.5 + 1.1 * v, moving ? 0.1 + 0.8 * effort * (0.4 + 0.6 * Math.min(1, v * 3)) : 0);
  const roll = moving ? Math.min(1, 0.15 + v * 1.1) : 0;
  layers.tunnel.set(0.75 + 0.45 * v, tunnel ? roll * 0.9 : 0);
  layers.open.set(0.75 + 0.45 * v, tunnel ? 0 : roll * 0.6);
  layers.joints.set(0.35 + 1.2 * v, v > 0.08 ? 0.35 * Math.min(1, v * 2) : 0);
  const k = curvature(t);
  layers.squeal.set(0.95 + 0.1 * v, k > 1 / 260 && v > 0.1 ? Math.min(0.45, (260 * k - 1) * 0.5) * Math.min(1, v * 3) : 0);
  layers.ac.set(1, moving ? 0.18 : 0.35);
  layers.creak.set(1, 0.08 + 0.25 * Math.min(1, v * 2));

  // The car's own door chime, from inside.
  if (lastDoor <= 0.02 && st.doorOpen > 0.02) playCar('car-door-open', 0.8);
  if (lastDoor >= 0.98 && st.doorOpen < 0.98) playCar('car-door-close', 0.8);
  lastDoor = st.doorOpen;

  // A train on the other track going the other way: a whoosh as it passes.
  const me = centre(t);
  if (me && moving) {
    for (const o of trains) {
      if (o === t || o.sim !== t.sim || o.state.heading === st.heading || Math.abs(o.state.speed) < 2) continue;
      const c = centre(o);
      if (!c) continue;
      const d = Math.hypot(c.x - me.x, c.z - me.z);
      if (d < 45 && clock.time - (passed.get(o.id) ?? -99) > 15) {
        passed.set(o.id, clock.time);
        playCar('pass-whoosh', tunnel ? 0.9 : 0.6);
      }
    }
  }
}
