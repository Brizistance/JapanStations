// Station sound, driven by the timetable (the same state the departure boards show): for the
// platform the player is on, both tracks' next train gets its approach jingle and
// announcement, braking-in, doors, idling, departure melody, doors closing and pulling out.
// Each track's PA comes from speakers along its own platform edge. Between trains, now and
// then, the chime and a general notice. Plus ambience, room-sized echo and footsteps.

import type { Dir, LineDef } from '../data/types';
import type { StationWorld } from '../stations';
import { toWorld } from '../world/collision';
import { lineById } from '../data/network';
import { clock } from '../sim';
import { input, nearestStation, player, where } from '../player/player';
import { platformNo, platformTrains, statusOf, type Status } from '../signs/departures';
import { trains } from '../trains/system';
import { announce, hushVoice, loopAt, paIdle, playAt, playSeqAt, type PosLoopHandle, playStep, setAmbience, setRoom, setSpeakers, tickListener, type Ambience, type Hearing, type SoundHandle } from './engine';
import { announcement, NOTICES, PLATFORM_DOOR, type Event } from './phrases';
import { tickCarAudio, tickCarNoise } from './car';
import { approachSfx, melodySeconds, melodySfx, STEP_COUNT } from './sfx';

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
/** After the departure melody: the doors-closing announcement, about this long. */
const CLOSING_VOICE_S = 5;
/** Tunnel wind starts this long before the train stops (underground only). */
const WIND_LEAD = 16;
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
  wind: boolean;
  run: boolean;
  pdOpen: boolean;
  pdClose: boolean;
  melody: boolean;
  closing: boolean;
  idle: SoundHandle | null;
}

let here: string | null = null;
const tracks = new Map<Dir, Tracked>();
let nextNotice = 0, noticeIdx = Math.floor(Math.random() * NOTICES.length);
let stepT = 0, lastStep = 0;
type V3 = [number, number, number];
/** Each track's row of PA speakers, world coordinates. */
let rows: Record<Dir, V3[]> = { down: [], up: [] };
/**
 * PA channel per track. An island platform is one platform: both tracks share its speakers
 * and one queue. Side platforms each have their own.
 */
let chan: Record<Dir, string> = { down: 'down', up: 'up' };

const voice = (keys: { key: string }[]) => keys.map((c) => `voice/${c.key}`);

function trainPos(line: string, index: number): () => [number, number, number] | null {
  const t = trains.find((r) => r.sim.geom.def.id === line && r.index === index);
  return () => {
    if (!t?.cars.length) return null;
    const c = t.cars[t.cars.length >> 1];
    return [c.x, c.y + 1.4, c.z];
  };
}

// ── A train running in or out: rolling and motor loops that follow it until it's gone ──

interface Running {
  line: string;
  index: number;
  dir: Dir;
  left: boolean;
  motor: PosLoopHandle;
  roll: PosLoopHandle;
}
const running: Running[] = [];
/** Seconds before arrival the running sound starts. */
const RUN_LEAD = 30;

function startRun(line: string, index: number, dir: Dir) {
  const pos = trainPos(line, index);
  running.push({ line, index, dir, left: false, motor: loopAt('ext-motor', pos), roll: loopAt('ext-roll', pos) });
}

/** Metres a point lies beyond either end of a track's platform (0 alongside it). */
function beyondPlatform(dir: Dir, p: V3): number {
  const r = rows[dir].length ? rows[dir] : rows[dir === 'down' ? 'up' : 'down'];
  if (r.length < 2) return 0;
  const a = r[0], b = r[r.length - 1];
  const ab = [b[0] - a[0], b[2] - a[2]], len = Math.hypot(ab[0], ab[1]);
  const u = ((p[0] - a[0]) * ab[0] + (p[2] - a[2]) * ab[1]) / len;
  return Math.max(0, -u - 6, u - len - 6); // rows stop short of the platform ends
}

function tickRunning(under: boolean) {
  for (let i = running.length - 1; i >= 0; i--) {
    const r = running[i];
    const t = trains.find((x) => x.sim.geom.def.id === r.line && x.index === r.index);
    const pos = t ? trainPos(r.line, r.index)() : null;
    if (!t || !pos) {
      r.motor.stop();
      r.roll.stop();
      running.splice(i, 1);
      continue;
    }
    const sv = t.sim.geom.def.service, speed = Math.abs(t.state.speed), v = Math.min(1, speed / sv.maxSpeed);
    const out = beyondPlatform(r.dir, pos);
    // Into the tunnel the sound dulls and dies away quickly; in the open it carries further.
    const fade = Math.max(0, 1 - out / (under ? 150 : 280));
    const cutoff = under ? 800 + 15000 * Math.exp(-out / 40) : 3000 + 13000 * Math.exp(-out / 120);
    const moving = speed > 0.3 ? 1 : 0;
    r.roll.set(0.75 + 0.45 * v, Math.min(1, 0.2 + v * 1.1) * fade * moving, cutoff);
    r.motor.set(0.5 + 1.1 * v, (0.25 + 0.5 * v) * fade * moving, cutoff);
    if (r.left && fade === 0) {
      r.motor.stop();
      r.roll.stop();
      running.splice(i, 1);
    }
  }
}

function reset() {
  for (const r of running.splice(0)) {
    r.motor.stop(0.3);
    r.roll.stop(0.3);
  }
  for (const t of tracks.values()) t.idle?.stop(0.3);
  tracks.clear();
  hushVoice();
}

function hearing(under: boolean): Hearing {
  const z = where.zone, tr = where.train;
  if (tr) {
    // Inside the car: through open doors the platform is clearly there, a little quieter and
    // duller (the car body blocks the direct sound); with doors shut, only a faint thud of it.
    const d = tr.state.doorOpen;
    return { level: 0.06 + 0.5 * d, muffled: true, cutoff: 500 + 3300 * d, under };
  }
  if (z?.kind === 'platform') return { level: 1, muffled: false, under };
  // Distance already quietens the PA; the stairwell dulls it.
  if (z?.kind === 'concourse' || z?.kind === 'passage') return { level: 0.7, muffled: true, under };
  return { level: 0, muffled: true, under };
}

/** Bounding box (frame-local) of a line's platform zones at a station. */
function platformBox(w: StationWorld, line: string) {
  const zs = w.frame.zones.filter((z) => z.kind === 'platform' && z.line === line);
  if (!zs.length) return null;
  const min = [0, 1, 2].map((i) => Math.min(...zs.map((z) => z.min[i])));
  const max = [0, 1, 2].map((i) => Math.max(...zs.map((z) => z.max[i])));
  return { min, max };
}

/**
 * PA speakers hang over each platform edge, every ~14 m. Platforms run along the box's long
 * axis; the down track is on the low side of the short axis, the up track on the high side.
 */
export function speakerRows(min: number[], max: number[]): Record<Dir, V3[]> {
  const long = max[0] - min[0] >= max[2] - min[2] ? 0 : 2, side = 2 - long;
  const len = max[long] - min[long], n = Math.max(3, Math.min(10, Math.round(len / 14)));
  const y = min[1] + 3.6;
  const row = (sideAt: number): V3[] =>
    Array.from({ length: n }, (_, i) => {
      const p: V3 = [0, y, 0];
      p[long] = min[long] + 4 + ((len - 8) * (i + 0.5)) / n;
      p[side] = sideAt;
      return p;
    });
  return { down: row(min[side] + 0.8), up: row(max[side] - 0.8) };
}

function placeRows(w: StationWorld, line: string) {
  const b = platformBox(w, line);
  const local = b ? speakerRows(b.min, b.max) : { down: [], up: [] };
  const world = (ps: V3[]) => ps.map((p) => toWorld(w.frame, p, [0, 0, 0]) as V3);
  rows = { down: world(local.down), up: world(local.up) };
  const island = lineById(line).platformType === 'island';
  chan = island ? { down: 'shared', up: 'shared' } : { down: 'down', up: 'up' };
  setSpeakers('shared', island ? [...rows.down, ...rows.up] : []);
  setSpeakers('down', island ? [] : rows.down);
  setSpeakers('up', island ? [] : rows.up);
}

/** Echo from the size of the room the player is in: big halls ring longer. */
function room(under: boolean, w: StationWorld | null, line: string | undefined) {
  if (!under || !w) return { decay: 0.7, wet: 0.08 };
  const z = where.zone;
  const box = (z?.kind === 'platform' || where.train) && line ? platformBox(w, line) : z ? { min: z.min, max: z.max } : null;
  if (!box) return { decay: 1.6, wet: 0.3 };
  const [dx, dy, dz] = [0, 1, 2].map((i) => box.max[i] - box.min[i]);
  const volume = dx * Math.max(dy, 4) * dz;
  const decay = Math.min(3.8, Math.max(1.1, 0.7 + Math.cbrt(volume) / 11));
  return { decay, wet: 0.25 + (decay - 1.1) * 0.08 };
}

let atStation = false;
function stationAround(x: number, z: number): StationWorld | null {
  const n = nearestStation(x, z);
  return n.dist < n.world.frame.radius ? n.world : null;
}

function ambience(playing: boolean, under: boolean): Ambience {
  const z = where.zone;
  if (!playing) return null;
  // On a train: the platform drifts in through open doors.
  if (where.train) return where.train.state.speed === 0 && atStation ? (under ? 'amb-platform' : 'amb-outdoor') : null;
  if (!under) return 'amb-outdoor';
  return z?.kind === 'platform' ? 'amb-platform' : 'amb-concourse';
}

/** The platform door nearest the player on a track's edge, at door-speaker height. */
let listenerAt: V3 = [0, 0, 0];
function doorPos(dir: Dir): V3 | null {
  const r = rows[dir];
  if (r.length < 2) return null;
  const a = r[0], b = r[r.length - 1], p = listenerAt;
  const ab = [b[0] - a[0], b[2] - a[2]], L2 = ab[0] ** 2 + ab[1] ** 2;
  const k = Math.max(0, Math.min(1, ((p[0] - a[0]) * ab[0] + (p[2] - a[2]) * ab[1]) / L2));
  return [a[0] + ab[0] * k, a[1] - 2.4, a[2] + ab[1] * k];
}

/** The end of a track's speaker row nearest a point: the tunnel mouth a train comes out of. */
function nearEnd(dir: Dir, p: V3 | null): () => V3 | null {
  const r = rows[dir];
  if (!r.length || !p) return () => null;
  const a = r[0], b = r[r.length - 1];
  const da = Math.hypot(a[0] - p[0], a[2] - p[2]), db = Math.hypot(b[0] - p[0], b[2] - p[2]);
  const end = da < db ? a : b;
  return () => end;
}

export function tickStationAudio(dt: number, playing: boolean, cam: { x: number; y: number; z: number }, yaw: number) {
  const now = clock.time;
  const zone = where.zone;
  // Riding, you're in the car, not in any station zone: use the station the train is at.
  const stw = where.station ?? (where.train ? stationAround(cam.x, cam.z) : null), st = stw?.def;
  atStation = !!stw;
  const under = cam.y < -1.2 && !zone?.sky;
  const h = playing ? hearing(under) : { level: 0, muffled: true, under: false };
  tickListener(cam.x, cam.y, cam.z, yaw, h);
  listenerAt = [cam.x, cam.y, cam.z];
  if (playing) tickCarAudio();
  tickCarNoise();
  const amb = ambience(playing, under);
  setAmbience(amb, where.train ? 0.06 + 0.45 * where.train.state.doorOpen : amb === 'amb-outdoor' && zone?.kind === 'street' ? 0.6 : 1);
  if (playing) tickSteps(dt);

  // Which platform's sound we follow: the one stood on, else the station's main line.
  // Which platform's sound we follow: the one stood on, the riding train's line, else the station's main line.
  const ride = where.train?.sim.geom.def;
  const rideLine = ride && st?.platforms[ride.shares?.line ?? ride.id] ? ride.shares?.line ?? ride.id : undefined;
  const lineId = !playing || !st || clock.scale !== 1 ? undefined : zone?.kind === 'platform' && zone.line ? zone.line : rideLine ?? stw!.primary;
  // On a train, keep following the platform while stopped there, doors open or not, so the
  // melody and doors-closing call aren't cut off as the doors shut.
  const key = st && lineId && st.platforms[lineId] && (h.level > 0 || where.train) ? `${st.id}:${lineId}` : null;
  if (playing) {
    const r = room(under, stw, lineId);
    // From inside the car the station's echo is heard but further off.
    setRoom(where.train ? { decay: r.decay, wet: r.wet * 0.6 } : r);
  }
  if (key !== here) {
    here = key;
    reset();
    if (key) placeRows(stw!, lineId!);
    nextNotice = performance.now() + 20000 + Math.random() * 30000;
  }
  if (!key) return;
  const pl = lineById(lineId!);
  const melodyS = melodySeconds(st!.id);

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
      if (t.boarding && t.open) playAt('train-depart', trainPos(t.line.id, t.train), { gain: 0.6 });
      for (const r of running) if (r.line === t.line.id && r.index === t.train) r.left = true;
      t = undefined;
    }
    if (!t) {
      // Everything already past counts as done.
      const dwelling = now >= d.arr + DOORS_OPEN_AFTER && now < d.dep - DOORS_CLOSE_BEFORE;
      t = {
        arr: d.arr, dep: d.dep, train: d.train, line: d.line, boarding: d.boarding, status: prev,
        braking: now > d.arr - ARRIVE_LEAD, open: now >= d.arr + DOORS_OPEN_AFTER,
        wind: now > d.arr - WIND_LEAD, run: false, pdOpen: now >= d.arr + 1, pdClose: now >= d.dep - DOORS_CLOSE_BEFORE - 1, melody: now >= d.dep - melodyS - CLOSING_VOICE_S, closing: now >= d.dep - DOORS_CLOSE_BEFORE,
        idle: dwelling ? playAt('train-idle', trainPos(d.line.id, d.train), { loop: true, gain: 0.6 }) : null,
      };
      tracks.set(dir, t);
    }
    prev = t.status;

    const ev = edge(prev, status);
    t.status = status;
    if (ev) {
      const clips = voice(announcement(ev, st!, d.line, dir, track));
      // If it has to wait behind the other track's, it plays just the Japanese line.
      announce(chan[dir], tag, ev === 'approach' ? [`sfx/${approachSfx(pl.id)}`, ...clips] : clips, { short: clips.slice(0, 1) });
    }
    const pos = trainPos(d.line.id, d.train);
    if (!t.wind && now >= d.arr - WIND_LEAD) {
      t.wind = true;
      if (under) playAt('tunnel-wind', nearEnd(dir, pos()), { gain: 1.1 });
    }
    if (!t.run && now >= d.arr - RUN_LEAD && now < d.dep) {
      t.run = true;
      startRun(d.line.id, d.train, dir);
    }
    if (!t.braking && now >= d.arr - ARRIVE_LEAD) {
      t.braking = true;
      playAt('train-arrive', pos, { gain: 0.6 });
    }
    if (!t.open && now >= d.arr + DOORS_OPEN_AFTER) {
      t.open = true;
      playAt('doors-open', pos, { gain: 0.8 });
      t.idle = playAt('train-idle', pos, { loop: true, gain: 0.6 });
    }
    if (d.boarding && !t.melody && now >= d.dep - melodyS - CLOSING_VOICE_S) {
      t.melody = true;
      announce(chan[dir], tag, [`sfx/${melodySfx(st!.id)}`, ...voice(announcement('closing', st!, d.line, dir, track))], { priority: true });
    }
    // The platform doors' own little speakers: a chime as they open; chime and voice as they close.
    if (!t.pdOpen && now >= d.arr + 1) {
      t.pdOpen = true;
      const at = doorPos(dir);
      if (at) playSeqAt(['sfx/pd-chime'], at, 0.7);
    }
    if (d.boarding && !t.pdClose && now >= d.dep - DOORS_CLOSE_BEFORE - 1) {
      t.pdClose = true;
      const at = doorPos(dir);
      if (at) playSeqAt(['sfx/pd-chime', ...voice(PLATFORM_DOOR)], at, 0.8);
    }
    if (d.boarding && !t.closing && now >= d.dep - DOORS_CLOSE_BEFORE) {
      t.closing = true;
      playAt('doors-close', pos, { gain: 0.8 });
    }
  }

  tickRunning(under);

  // General notice between trains.
  if (quiet && paIdle() && performance.now() >= nextNotice) {
    nextNotice = performance.now() + 100000 + Math.random() * 100000;
    noticeIdx = (noticeIdx + 1) % NOTICES.length;
    // Same notice on every platform of this line.
    for (const c of new Set(Object.values(chan))) announce(c, `${key}:notice`, ['sfx/chime', ...voice(NOTICES[noticeIdx])]);
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
