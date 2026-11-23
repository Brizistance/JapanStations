// The sound of the weather: rain falling, wind (a low roar, and a howl once it is a gale), and
// thunder a moment after each lightning strike. Heard in full in the open air; below ground and
// inside a train it comes through as a dull rumble that fades with depth. The sounds are made in
// the engine until recordings of the same names exist (audio/sfx.ts STORM_SFX).

import type { Atmosphere } from '../render/atmosphere';
import { audioLive, playSky, skyLoop, type PosLoopHandle } from './engine';

const loops = new Map<string, PosLoopHandle>();
function loop(name: string, rate: number, gain: number, cutoff: number) {
  if (!loops.has(name)) {
    if (gain <= 0 || !audioLive()) return;
    loops.set(name, skyLoop(name));
  }
  loops.get(name)!.set(rate, Math.max(0, gain), cutoff);
}

let lastBolt = 0, strikes = 0;

/**
 * `cam`: the listener. `playing`: in the game (not a menu). `under`: below the street.
 * `inCar`: riding a train. `bolt`: lightning brightness now (render/atmosphere.ts `lightning`).
 * `t`: real time, seconds.
 */
export function tickStormAudio(cam: { y: number }, playing: boolean, under: boolean, inCar: boolean, a: Atmosphere, bolt: number, t: number) {
  // How much of the outside reaches the ear, and how dull it is by then.
  const depth = Math.min(1, Math.max(0, (-cam.y - 1.2) / 12));
  const open = !playing ? 0 : under ? 0.3 - 0.24 * depth : inCar ? 0.3 : 1;
  const cutoff = under ? 420 - 240 * depth : inCar ? 700 : 18000;

  // Gusts: two slow swells that never quite line up.
  const gust = 0.5 + 0.3 * Math.sin(t * 0.8) + 0.2 * Math.sin(t * 0.31 + 1.7);
  const wind = a.wind ** 1.4;
  loop('storm-wind', 0.75 + 0.45 * gust * a.wind, open * wind * (0.55 + 0.6 * gust), Math.min(cutoff, 2400));
  loop('storm-howl', 0.8 + 0.5 * gust, open * Math.max(0, a.wind - 0.4) * 1.5 * gust * gust * (under || inCar ? 0.4 : 1), cutoff);
  // Rain is mostly hiss, so little of it gets below ground.
  loop('storm-rain', 0.9 + 0.25 * a.rain, open * a.rain * (under ? 0.5 : 0.85), cutoff);

  // Thunder: the strike's sound arrives a moment after its light.
  if (bolt > 0.5 && lastBolt <= 0.5 && playing && audioLive()) {
    strikes++;
    const far = (Math.sin(strikes * 12.9898) * 43758.5453) % 1, away = Math.abs(far);
    playSky('thunder', (1.1 - 0.5 * away) * (under ? 0.45 - 0.3 * depth : inCar ? 0.6 : 1), under ? 260 : inCar ? 600 : 18000, 0.4 + 2.8 * away, 0.85 + 0.3 * away);
  }
  lastBolt = bolt;
}
