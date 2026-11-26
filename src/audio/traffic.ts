// The sound of the street's traffic (render/traffic-view.ts `passing`):
//   - a few loops that follow the nearest moving vehicles: tyres and engine for cars, a lower
//     rumble for buses and trucks, a buzz for scooters;
//   - an engine idling at the nearest vehicle standing close by (a queue at a red light);
//   - the hiss of tyres on a wet road when it rains;
//   - a bus's air brake as it pulls up;
//   - the calls of the pedestrian signals with speakers (the avenues' crossings), while they
//     show green: "piyo" across the side roads, "kakkō" across the main road.
// Silent when the listener is below ground. The sounds are made in the engine until recordings
// of the same names exist (audio/sfx.ts ROAD_SFX, scripts/gen-sfx.ts).

import type { V3 } from '../world/builder';
import { passing, type Passing } from '../render/traffic-view';
import { signalState } from '../traffic/signals';
import { streets } from '../traffic/street';
import type { StationWorld } from '../stations';
import { toWorld } from '../world/collision';
import { RAIL_LINES } from '../data/network';
import { BASCULE_LINE, crossingActive } from '../signs/departures';
import { audioLive, loopAt, playAt, type PosLoopHandle } from './engine';

const VOICES = 3, REACH = 70;
type Loop = 'road-car' | 'road-heavy' | 'road-scooter';

/** One sound source that follows a place: its loops by name, made when first wanted. */
class Source {
  at: V3 = [0, 0, 0];
  /** `ref`: how near it must be to be heard at full level (a crossing bell carries much further than a car). */
  constructor(private ref = 10) {}
  private loops = new Map<string, PosLoopHandle>();
  /** Play `name` here at this rate, level and cutoff; every other loop of this source falls silent. */
  play(name: string | null, rate = 1, gain = 0, cutoff = 18000) {
    if (name && gain > 0 && !this.loops.has(name) && audioLive()) this.loops.set(name, loopAt(name, () => this.at, true, this.ref));
    for (const [k, loop] of this.loops) loop.set(k === name ? rate : 1, k === name ? gain : 0, cutoff);
  }
}

/** Every level crossing, where its bells hang (on the masts, over the road's centre line here). */
const XINGS = RAIL_LINES.flatMap((l) => (l.crossings ?? []).map((c) => ({ line: l.id, station: c.key ?? c.station, at: [c.at[0], 2.6, c.at[1]] as V3 })));
const bells = XINGS.map(() => new Source(28));
/** A bascule bridge's bells (the level-crossing bell, at each barrier), found from its warning lamps (Build.xingLamps). */
const bascule = new WeakMap<StationWorld, { at: V3; key: string; src: Source }[]>();
function basculeBells(w: StationWorld) {
  let list = bascule.get(w);
  if (!list) {
    const byGate = new Map<string, { at: V3; key: string }>();
    for (const l of w.build.xingLamps ?? []) {
      if (l.line !== BASCULE_LINE) continue;
      const k = `${l.key}:${Math.round(l.pos[2] / 10)}`;
      if (!byGate.has(k)) {
        const at: V3 = [0, 0, 0];
        toWorld(w.frame, l.pos, at);
        byGate.set(k, { at, key: l.key });
      }
    }
    list = [...byGate.values()].map((g) => {
      const src = new Source(28);
      src.at = g.at;
      return { ...g, src };
    });
    bascule.set(w, list);
  }
  return list;
}

const voices = Array.from({ length: VOICES }, () => ({ src: new Source(), on: null as Passing | null }));
const idle = new Source(), wetRoad = new Source(), calls = [new Source(), new Source()];
const lastSpeed = new WeakMap<object, number>();

/** The pedestrian-signal speakers of a station, in world space, with the road whose green they call. */
const speakers = new WeakMap<StationWorld, { at: V3; axis: 0 | 1 | 2 | 3 }[]>();
function speakersOf(w: StationWorld) {
  let list = speakers.get(w);
  if (!list) {
    list = w.build.models.filter((m) => m.kind === 'road' && m.id === 'speaker').map((m) => {
      const at: V3 = [0, 0, 0];
      toWorld(w.frame, m.pos, at);
      // A head facing along the main road stands on a crossing over a side road: it walks with the main road's green.
      return { at, axis: (Math.abs(Math.sin(m.yaw)) > 0.7 ? 0 : 1) as 0 | 1 };
    });
    speakers.set(w, list);
  }
  return list;
}

/** `under`: the listener is below the street. `wet`: it is raining. `time`: sim time, for the signals. */
export function tickTrafficAudio(cam: { x: number; y: number; z: number }, under: boolean, wet: boolean, time: number) {
  const dist = (p: { x: number; y: number; z: number }) => Math.hypot(p.x - cam.x, p.y - cam.y, p.z - cam.z);

  // A bus pulling up lets off its air brake.
  for (const p of passing) {
    const was = lastSpeed.get(p.key) ?? 0;
    if (p.kind === 'bus' && was >= 0.4 && p.speed < 0.4 && !under && dist(p) < 45 && audioLive()) {
      const at: V3 = [p.x, p.y + 0.6, p.z];
      playAt('bus-brake', () => at, { gain: 0.8, road: true });
    }
    lastSpeed.set(p.key, p.speed);
  }

  for (const v of voices) {
    // A voice stays with its vehicle until that one has gone, stopped or driven out of earshot.
    const now = v.on ? passing.find((p) => p.key === v.on!.key) : undefined;
    v.on = now && now.speed > 0.5 && dist(now) < REACH ? now : null;
  }
  for (const v of voices) {
    if (!v.on && !under) {
      let best: Passing | null = null, bd = REACH * 0.8;
      for (const p of passing) {
        if (p.speed < 1 || voices.some((o) => o.on?.key === p.key)) continue;
        const d = dist(p);
        if (d < bd) {
          bd = d;
          best = p;
        }
      }
      v.on = best;
    }
    if (!v.on || under) {
      v.src.play(null);
      continue;
    }
    v.src.at[0] = v.on.x; v.src.at[1] = v.on.y + 0.5; v.src.at[2] = v.on.z;
    const k = Math.min(1, v.on.speed / 11), heavy = v.on.heavy, scooter = v.on.kind === 'scooter';
    const name: Loop = heavy ? 'road-heavy' : scooter ? 'road-scooter' : 'road-car';
    v.src.play(name, (heavy ? 0.7 : scooter ? 0.8 : 0.85) + 0.45 * k, k ** 1.4 * (heavy ? 1.5 : scooter ? 0.6 : 0.8), (heavy ? 600 : 900) + (heavy ? 1800 : 3200) * k);
  }

  // Tyres on a wet road: with the nearest moving vehicle.
  const lead = voices.map((v) => v.on).filter((p): p is Passing => p !== null).sort((a, b) => dist(a) - dist(b))[0];
  if (lead && wet && !under) {
    wetRoad.at[0] = lead.x; wetRoad.at[1] = lead.y + 0.2; wetRoad.at[2] = lead.z;
    wetRoad.play('road-wet', 0.9 + 0.3 * Math.min(1, lead.speed / 11), 0.7 * Math.min(1, lead.speed / 9) ** 1.3, 9000);
  } else wetRoad.play(null);

  // An engine idling in the queue beside you.
  let near: Passing | null = null, nd = 14;
  if (!under) {
    for (const p of passing) {
      if (p.speed > 0.3 || p.kind === 'scooter') continue;
      const d = dist(p);
      if (d < nd) {
        nd = d;
        near = p;
      }
    }
  }
  if (near) {
    idle.at[0] = near.x; idle.at[1] = near.y + 0.5; idle.at[2] = near.z;
    idle.play('road-idle', near.heavy ? 0.8 : 1, near.heavy ? 0.5 : 0.3, 1400);
  } else idle.play(null);

  // The pedestrian signals' calls: the two nearest speakers.
  const heard: { at: V3; axis: 0 | 1 | 2 | 3; d: number }[] = [];
  if (!under) {
    for (const s of streets) {
      for (const sp of speakersOf(s.world)) {
        const d = Math.hypot(sp.at[0] - cam.x, sp.at[1] - cam.y, sp.at[2] - cam.z);
        if (d < 40) heard.push({ ...sp, d });
      }
    }
    heard.sort((a, b) => a.d - b.d);
  }
  // The level crossings' bells, while the gates are down (LineDef.crossings; signs/departures.ts).
  for (const [i, x] of XINGS.entries()) {
    const d = Math.hypot(x.at[0] - cam.x, x.at[1] - cam.y, x.at[2] - cam.z);
    if (under || d > 260 || !crossingActive(x.line, x.station, time)) bells[i].play(null);
    else {
      bells[i].at = x.at;
      bells[i].play('xing-bell', 1, 2.0);
    }
  }

  const seen = new Set<StationWorld>();
  for (const s of streets) {
    if (seen.has(s.world)) continue;
    seen.add(s.world);
    for (const g of basculeBells(s.world)) {
      const d = Math.hypot(g.at[0] - cam.x, g.at[1] - cam.y, g.at[2] - cam.z);
      if (under || d > 260 || !crossingActive(BASCULE_LINE, g.key, time)) g.src.play(null);
      else {
        g.src.play('xing-bell', 1, 2.0);
      }
    }
  }

  calls.forEach((c, i) => {
    const sp = heard[i];
    if (!sp || signalState(sp.axis, time).walk !== 'go') return c.play(null);
    c.at[0] = sp.at[0]; c.at[1] = sp.at[1]; c.at[2] = sp.at[2];
    c.play(sp.axis % 2 === 0 ? 'signal-piyo' : 'signal-kakko', 1, 0.5);
  });
}
