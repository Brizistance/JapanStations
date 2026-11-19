// Station sound, driven by the timetable (the same state the departure boards show): for the
// platform the player is on, both tracks' next train gets its approach jingle and
// announcement, braking-in, doors, idling, departure melody, doors closing and pulling out.
// Between trains, now and then, the chime and a general notice. Plus the player's footsteps.

import type { Dir, LineDef } from '../data/types';
import { lineById } from '../data/network';
import { clock } from '../sim';
import { input, player, where } from '../player/player';
import { platformNo, platformTrains, statusOf, type Status } from '../signs/departures';
import { trains } from '../trains/system';
import { announce, hushVoice, paIdle, playAt, playStep, tickListener, type Hearing, type SoundHandle } from './engine';
import { announcement, NOTICES, type Event } from './phrases';
import { approachSfx, departSfx, STEP_COUNT } from './sfx';

/** The announcement a status change calls for, if any. Doors closing is timed separately. */
export function edge(prev: Status | undefined, next: Status): Event | null {
  if (prev === undefined || prev === next) return null;
  if (next === 'approach') return 'approach'; // also right after the last train left
  if (next === 'boarding' && (prev === 'approach' || prev === 'wait')) return 'arrive';
  if (next === 'terminating' && (prev === 'approach' || prev === 'wait')) return 'terminating';
  return null;
}

/** Seconds of the arrival recording before the train stops. */
const ARRIVE_LEAD = 8.5;
/** Departure melody starts this long before departure, then "doors closing". */
const MELODY_LEAD = 14;
/** Door timings from the sim (timetable.ts): open 1.5 s after arrival, start closing 5.5 s before departure. */
const DOORS_OPEN_AFTER = 1.5, DOORS_CLOSE_BEFORE = 5.5;

interface Tracked {
  arr: number;
  dep: number;
  train: number;
  line: LineDef;
  boarding: boolean;
  status: Status;
  braking: boolean;
  open: boolean;
  melody: boolean;
  closing: boolean;
  idle: SoundHandle | null;
}

let here: string | null = null;
const tracks = new Map<Dir, Tracked>();
let nextNotice = 0, noticeIdx = Math.floor(Math.random() * NOTICES.length);
let stepT = 0, lastStep = 0;

const voice = (keys: { key: string }[]) => keys.map((c) => `voice/${c.key}`);

function trainPos(line: string, index: number): () => [number, number, number] | null {
  const t = trains.find((r) => r.sim.geom.def.id === line && r.index === index);
  return () => {
    if (!t?.cars.length) return null;
    const c = t.cars[t.cars.length >> 1];
    return [c.x, c.y + 1.4, c.z];
  };
}

function reset() {
  for (const t of tracks.values()) t.idle?.stop(0.3);
  tracks.clear();
  hushVoice();
}

function hearing(under: boolean): Hearing {
  const z = where.zone, tr = where.train;
  if (tr) return { level: tr.state.doorOpen > 0.3 ? 0.4 : 0, muffled: true, under };
  if (z?.kind === 'platform') return { level: 1, muffled: false, under };
  if (z?.kind === 'concourse' || z?.kind === 'passage') return { level: 0.3, muffled: true, under };
  return { level: 0, muffled: true, under };
}

export function tickStationAudio(dt: number, playing: boolean, cam: { x: number; y: number; z: number }, yaw: number) {
  const now = clock.time;
  const zone = where.zone, st = where.station?.def;
  const under = cam.y < -1.2 && !zone?.sky;
  const h = playing ? hearing(under) : { level: 0, muffled: true, under: false };
  tickListener(cam.x, cam.y, cam.z, yaw, h);
  if (playing) tickSteps(dt);

  // Which platform's sound we follow: the one stood on, else the station's main line.
  const lineId = !playing || !st || clock.scale !== 1 ? undefined : zone?.kind === 'platform' && zone.line ? zone.line : where.station!.primary;
  const key = st && lineId && st.platforms[lineId] && h.level > 0 ? `${st.id}:${lineId}` : null;
  if (key !== here) {
    here = key;
    reset();
    nextNotice = performance.now() + 20000 + Math.random() * 30000;
  }
  if (!key) return;
  const pl = lineById(lineId!);

  let quiet = true;
  for (const dir of ['down', 'up'] as Dir[]) {
    const d = platformTrains(pl, st!, dir, now, 1)[0];
    if (!d) continue;
    const status = statusOf(d, now);
    if (status !== 'wait' && status !== 'none') quiet = false;
    const tag = `${key}:${dir}`, track = platformNo(st!, pl, dir);
    let t = tracks.get(dir);
    // On first sight the previous status is the current one, so nothing fires late.
    let prev: Status = t?.status ?? status;

    if (t && t.arr !== d.arr) {
      // That train has gone (or is laying over): pull out.
      t.idle?.stop(1.2);
      if (t.boarding && t.open) playAt('train-depart', trainPos(t.line.id, t.train));
      t = undefined;
    }
    if (!t) {
      // Everything already past counts as done.
      const dwelling = now >= d.arr + DOORS_OPEN_AFTER && now < d.dep - DOORS_CLOSE_BEFORE;
      t = {
        arr: d.arr, dep: d.dep, train: d.train, line: d.line, boarding: d.boarding, status: prev,
        braking: now > d.arr - ARRIVE_LEAD, open: now >= d.arr + DOORS_OPEN_AFTER,
        melody: now >= d.dep - MELODY_LEAD, closing: now >= d.dep - DOORS_CLOSE_BEFORE,
        idle: dwelling ? playAt('train-idle', trainPos(d.line.id, d.train), { loop: true, gain: 0.6 }) : null,
      };
      tracks.set(dir, t);
    }
    prev = t.status;

    const ev = edge(prev, status);
    t.status = status;
    if (ev) {
      const clips = voice(announcement(ev, st!, d.line, dir, track));
      announce(tag, ev === 'approach' ? [`sfx/${approachSfx(pl.id)}`, ...clips] : clips);
    }
    const pos = trainPos(d.line.id, d.train);
    if (!t.braking && now >= d.arr - ARRIVE_LEAD) {
      t.braking = true;
      playAt('train-arrive', pos);
    }
    if (!t.open && now >= d.arr + DOORS_OPEN_AFTER) {
      t.open = true;
      playAt('doors-open', pos, { gain: 0.8 });
      t.idle = playAt('train-idle', pos, { loop: true, gain: 0.6 });
    }
    if (d.boarding && !t.melody && now >= d.dep - MELODY_LEAD) {
      t.melody = true;
      announce(tag, [`sfx/${departSfx(pl.id)}`, ...voice(announcement('closing', st!, d.line, dir, track))], true);
    }
    if (d.boarding && !t.closing && now >= d.dep - DOORS_CLOSE_BEFORE) {
      t.closing = true;
      playAt('doors-close', pos, { gain: 0.8 });
    }
  }

  // General notice between trains.
  if (quiet && paIdle() && performance.now() >= nextNotice) {
    nextNotice = performance.now() + 100000 + Math.random() * 100000;
    noticeIdx = (noticeIdx + 1) % NOTICES.length;
    announce(`${key}:notice`, ['sfx/chime', ...voice(NOTICES[noticeIdx])]);
  }
}

function tickSteps(dt: number) {
  const moving = (input.fwd || input.back || input.left || input.right) && player.body.grounded;
  if (!moving) {
    stepT = 0.15; // first step comes quickly
    return;
  }
  stepT -= dt;
  if (stepT > 0) return;
  stepT = input.sprint ? 0.34 : 0.52;
  let n = 1 + Math.floor(Math.random() * STEP_COUNT);
  if (n === lastStep) n = (n % STEP_COUNT) + 1;
  lastStep = n;
  playStep(`step-${n}`);
}
