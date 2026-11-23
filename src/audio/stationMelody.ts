// Menu music, station-melody style: a chiptune medley of departure melodies (発車メロディ),
// one original melody per metro line, made in code.
//
//   lead (25% pulse) + harmony (12.5%) + arpeggio (12.5%) + bass (triangle) + noise drums → echo → out
//
// Each line's melody is generated from a seed made of its id and name, so a line always has
// the same tune (and could later play on its platforms). A melody is four bars ending on the
// key note, the way a real one ends just as the doors close. Each plays twice (the second time
// with harmony and drums), then a two-note door chime hands over to the next line, in a new key.

import { LINES } from '../data/network';

const BEAT = 60 / 128;
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const hz = (m: number) => 440 * 2 ** ((m - 69) / 12);

/** A small seeded random generator, so each line's melody is fixed. */
function seeded(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let x = Math.imul(h ^ (h >>> 15), 1 | h);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

interface Chord { deg: number; minor: boolean }
interface Note { at: number; m: number; len: number }
interface Song { lineId: string; key: number; chords: Chord[]; bars: Note[][] }

const C = (deg: number, minor = false): Chord => ({ deg, minor });
const PROGS = [
  [C(0), C(5), C(7), C(0)],
  [C(0), C(9, true), C(7), C(0)],
  [C(5), C(7), C(4, true), C(0)],
  [C(0), C(7), C(5), C(0)],
  [C(9, true), C(5), C(7), C(0)],
];
/** One bar of melody rhythm, [beat, length], on an eighth-note grid. */
const RHYTHMS = [
  [[0, 0.5], [0.5, 0.5], [1, 0.5], [1.5, 0.5], [2, 1], [3, 1]],
  [[0, 1], [1, 0.5], [1.5, 0.5], [2, 1.5], [3.5, 0.5]],
  [[0, 0.5], [0.5, 1], [1.5, 0.5], [2, 0.5], [2.5, 0.5], [3, 1]],
  [[0, 1.5], [1.5, 0.5], [2, 0.5], [2.5, 0.5], [3, 0.5], [3.5, 0.5]],
] as const;
const CADENCES = [
  [[0, 0.5], [0.5, 0.5], [1, 3]],
  [[0, 0.5], [0.5, 0.25], [0.75, 0.25], [1, 3]],
  [[0, 1], [1, 0.5], [1.5, 2.5]],
] as const;
const KEYS = [60, 62, 63, 65, 67, 64, 61];

const tones = (key: number, ch: Chord) => [0, ch.minor ? 3 : 4, 7].map((x) => (key + ch.deg + x) % 12);
const inScale = (key: number, m: number) => MAJOR.includes((((m - key) % 12) + 12) % 12);

function makeSong(lineId: string, name: string, i: number): Song {
  const r = seeded(`${lineId}:${name}`);
  const pickR = <T,>(xs: readonly T[]): T => xs[Math.floor(r() * xs.length)];
  const key = KEYS[i % KEYS.length];
  const chords = pickR(PROGS);
  const lo = key + 7, hi = key + 24;
  let m = key + 12 + pickR([0, 4, 7]);
  const bars: Note[][] = [];
  for (let b = 0; b < 4; b++) {
    const ct = tones(key, chords[b]), last = b === 3;
    const rhythm = last ? pickR(CADENCES) : pickR(RHYTHMS);
    bars.push(rhythm.map(([at, len], k) => {
      const final = last && k === rhythm.length - 1;
      if (final) {
        // Land on the key note nearest where the tune is.
        m = [key + 12, key + 24].reduce((a, x) => (Math.abs(x - m) < Math.abs(a - m) ? x : a));
      } else {
        const pool: number[] = [];
        for (let x = lo; x <= hi; x++) {
          if (x === m || Math.abs(x - m) > (Number.isInteger(at) ? 7 : 4)) continue;
          if (Number.isInteger(at) ? ct.includes(x % 12) : inScale(key, x)) pool.push(x);
        }
        // Departure melodies like to climb: lean upward.
        const up = pool.filter((x) => x > m);
        m = pickR(r() < 0.6 && up.length ? up : pool.length ? pool : [m]);
      }
      return { at, m, len };
    }));
  }
  return { lineId, key, chords, bars };
}

export interface StationMelodies {
  reset: () => void;
  bar: (t: number) => number;
}

export function makeStationMelodies(c: AudioContext, out: AudioNode, noise: AudioBuffer): StationMelodies {
  const songs = LINES.map((l, i) => makeSong(l.id, l.nameEn, i));
  let songIdx = 0, barIdx = 0;

  const pulses = new Map<number, PeriodicWave>();
  const pulse = (duty: number) => {
    let w = pulses.get(duty);
    if (!w) {
      const n = 48, re = new Float32Array(n), im = new Float32Array(n);
      for (let k = 1; k < n; k++) re[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
      w = c.createPeriodicWave(re, im);
      pulses.set(duty, w);
    }
    return w;
  };

  // A short echo, three sixteenths behind, for the lead.
  const echo = c.createDelay(1), fb = c.createGain(), wet = c.createGain();
  echo.delayTime.value = BEAT * 0.75;
  fb.gain.value = 0.28;
  wet.gain.value = 0.35;
  echo.connect(fb).connect(echo);
  echo.connect(wet).connect(out);

  function tone(t: number, m: number, len: number, wave: PeriodicWave | 'triangle', gain: number, opts: { echo?: boolean; vib?: boolean; decay?: number } = {}) {
    const o = c.createOscillator(), g = c.createGain();
    if (wave === 'triangle') o.type = 'triangle';
    else o.setPeriodicWave(wave);
    o.frequency.value = hz(m);
    g.gain.setValueAtTime(gain, t);
    if (opts.decay) g.gain.setTargetAtTime(gain * 0.25, t, opts.decay);
    else g.gain.setTargetAtTime(gain * 0.75, t, 0.25);
    g.gain.setTargetAtTime(0, t + len - 0.01, 0.015);
    if (opts.vib && len > BEAT) {
      const lfo = c.createOscillator(), d = c.createGain();
      lfo.frequency.value = 6;
      d.gain.setValueAtTime(0, t);
      d.gain.setValueAtTime(0, t + BEAT * 0.6);
      d.gain.linearRampToValueAtTime(25, t + len);
      lfo.connect(d).connect(o.detune);
      lfo.start(t);
      lfo.stop(t + len + 0.1);
    }
    o.connect(g).connect(out);
    if (opts.echo) g.connect(echo);
    o.start(t);
    o.stop(t + len + 0.1);
  }

  function hit(t: number, len: number, gain: number, from: number) {
    const n = c.createBufferSource(), hp = c.createBiquadFilter(), g = c.createGain();
    n.buffer = noise;
    hp.type = 'highpass';
    hp.frequency.value = from;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + len);
    n.connect(hp).connect(g).connect(out);
    n.start(t, Math.random());
    n.stop(t + len + 0.02);
  }

  function kick(t: number) {
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(180, t);
    o.frequency.exponentialRampToValueAtTime(50, t + 0.08);
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.2);
  }

  function bar(t: number): number {
    const song = songs[songIdx], key = song.key;
    if (barIdx === 8) {
      // Door chime: two soft bell notes, then on to the next line.
      tone(t, key + 28, BEAT * 1.4, pulse(0.5), 0.05, { decay: 0.35, echo: true });
      tone(t + BEAT * 1.5, key + 24, BEAT * 2.2, pulse(0.5), 0.05, { decay: 0.45, echo: true });
      tone(t, key - 12, BEAT * 3.5, 'triangle', 0.1);
      barIdx = 0;
      songIdx = (songIdx + 1) % songs.length;
      return t + 4 * BEAT;
    }
    const b = barIdx % 4, second = barIdx >= 4, chord = song.chords[b], ct = tones(key, chord);
    const root = key - 24 + chord.deg;
    // Lead, and in the second pass a harmony on the chord tone below.
    for (const n of song.bars[b]) {
      tone(t + n.at * BEAT, n.m, n.len * BEAT * 0.92, pulse(0.25), 0.055, { echo: true, vib: true });
      if (second) {
        let h = n.m - 3;
        while (h > n.m - 10 && !ct.includes(((h % 12) + 12) % 12)) h--;
        tone(t + n.at * BEAT, h, n.len * BEAT * 0.92, pulse(0.125), 0.03);
      }
    }
    // Bass: octave bounce on eighths; the cadence bar holds.
    if (b === 3) tone(t, root, BEAT * 3.5, 'triangle', 0.13);
    else for (let k = 0; k < 8; k++) tone(t + k * 0.5 * BEAT, root + (k % 2 ? 12 : 0), BEAT * 0.45, 'triangle', 0.13);
    // Fast chip arpeggio of the chord, quiet, in the second pass.
    if (second && b < 3) {
      const arp = [0, chord.minor ? 3 : 4, 7, 12].map((x) => key + chord.deg + x);
      for (let k = 0; k < 16; k++) tone(t + k * 0.25 * BEAT, arp[k % 4], BEAT * 0.22, pulse(0.125), 0.018);
    }
    // Drums: hats from the start, kick and snare in the second pass.
    for (let k = 0; k < 8; k++) if (second || k % 2) hit(t + k * 0.5 * BEAT, 0.03, 0.03, 8000);
    if (second && b < 3) {
      kick(t);
      kick(t + 2 * BEAT);
      if (b === 2) kick(t + 2.5 * BEAT);
      hit(t + BEAT, 0.12, 0.09, 1500);
      hit(t + 3 * BEAT, 0.12, 0.09, 1500);
    }
    barIdx++;
    return t + 4 * BEAT;
  }

  return {
    reset: () => {
      barIdx = 0;
    },
    bar,
  };
}
