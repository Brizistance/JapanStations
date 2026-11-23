// Menu music, city-pop style: an original, endless late-night 80s groove made in code.
//
//   electric piano (FM), pad (detuned saws), synth bass, lead ─┐
//   drum machine (kick, gated snare, hats) ────────────────────┴→ out
//
// E♭ major, 104 bpm, eight-bar sections. The progressions are the stock J-pop ones
// (IV–V–iii–vi, and ii–V–iii–VI) in rootless seventh voicings. The first section is keys
// and bass alone; drums come in halfway; the lead plays call-and-answer from the second.

const KEY = 51; // E♭3
const BEAT = 60 / 104;
const PENTA = [0, 2, 4, 7, 9];
const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(Math.random() * xs.length)];
const chance = (p: number) => Math.random() < p;
const hz = (m: number) => 440 * 2 ** ((m - 69) / 12);

type Quality = 'maj7' | 'dom7' | 'm7';
interface Chord { deg: number; q: Quality }
const PROGS: Chord[][] = [
  [{ deg: 5, q: 'maj7' }, { deg: 7, q: 'dom7' }, { deg: 4, q: 'm7' }, { deg: 9, q: 'm7' }],
  [{ deg: 2, q: 'm7' }, { deg: 7, q: 'dom7' }, { deg: 4, q: 'm7' }, { deg: 9, q: 'dom7' }],
];
/** Rootless voicings (3rd, 5th or 13th, 7th, 9th). */
const VOICING: Record<Quality, number[]> = { maj7: [4, 7, 11, 14], dom7: [4, 9, 10, 14], m7: [3, 7, 10, 14] };
const TONES: Record<Quality, number[]> = { maj7: [0, 4, 7, 11], dom7: [0, 4, 7, 10], m7: [0, 3, 7, 10] };
/** Keyboard comping, [beat, length] per bar. */
const COMPS = [
  [[0, 1.4], [1.5, 0.4], [2.5, 1.4]],
  [[0, 0.7], [0.75, 0.6], [2, 0.4], [3, 0.9]],
  [[0, 2.4], [2.5, 0.4], [3.5, 0.4]],
] as const;
/** Bass, [beat, which note, length]: r root, o octave, f fifth, a approach to the next root. */
const BASS = [
  [[0, 'r', 0.45], [0.75, 'o', 0.2], [1.5, 'r', 0.4], [2, 'f', 0.4], [2.75, 'o', 0.2], [3.25, 'r', 0.2], [3.75, 'a', 0.2]],
  [[0, 'r', 0.7], [1, 'o', 0.2], [1.5, 'r', 0.2], [2.5, 'r', 0.45], [3, 'f', 0.2], [3.5, 'o', 0.4]],
] as const;
/** Lead rhythms for one bar, [beat, length]. */
const LEAD = [
  [[0, 0.5], [0.5, 0.5], [1, 1], [2.5, 1.5]],
  [[0.5, 0.5], [1, 0.5], [1.5, 1], [3, 0.5], [3.5, 0.5]],
  [[0, 1.5], [1.5, 0.5], [2, 2]],
  [[0.75, 0.25], [1, 0.5], [1.5, 0.5], [2, 0.75], [3, 1]],
] as const;

interface LeadNote { at: number; m: number; len: number }

export interface CityPop {
  reset: () => void;
  /** Schedules one bar starting at `t`; returns when the next bar starts. */
  bar: (t: number) => number;
}

export function makeCityPop(c: AudioContext, out: AudioNode, noise: AudioBuffer): CityPop {
  let barIdx = 0, section = 0, motif: LeadNote[][] = [];

  // Gated reverb for the snare: a flat burst cut off short, the 80s sound.
  const gate = c.createConvolver(), gateSend = c.createGain();
  const gn = Math.floor(c.sampleRate * 0.28), gbuf = c.createBuffer(2, gn, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = gbuf.getChannelData(ch);
    for (let i = 0; i < gn; i++) d[i] = (Math.random() * 2 - 1) * 0.25 * (i > gn - 200 ? (gn - i) / 200 : 1);
  }
  gate.buffer = gbuf;
  gateSend.gain.value = 0.6;
  gateSend.connect(gate).connect(out);
  // A slow stereo chorus for keys and pad.
  const chorusIn = c.createGain(), dl = c.createDelay(0.05), dr = c.createDelay(0.05), lfo = c.createOscillator(), lfoL = c.createGain(), lfoR = c.createGain();
  const merge = c.createChannelMerger(2);
  dl.delayTime.value = dr.delayTime.value = 0.012;
  lfo.frequency.value = 0.6;
  lfoL.gain.value = 0.003;
  lfoR.gain.value = -0.003;
  lfo.connect(lfoL).connect(dl.delayTime);
  lfo.connect(lfoR).connect(dr.delayTime);
  lfo.start();
  chorusIn.connect(dl).connect(merge, 0, 0);
  chorusIn.connect(dr).connect(merge, 0, 1);
  const chorusOut = c.createGain();
  chorusOut.gain.value = 0.7;
  merge.connect(chorusOut).connect(out);
  const keys = c.createGain();
  keys.connect(out);
  keys.connect(chorusIn);

  const env = (g: GainNode, t: number, peak: number, attack: number, hold: number, release: number) => {
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.setTargetAtTime(peak * 0.55, t + attack, 0.3);
    g.gain.setTargetAtTime(0, t + hold, release);
  };

  /** Electric piano: two-operator FM, the bright bell fading fast. */
  function ep(t: number, m: number, len: number, gain: number) {
    const f = hz(m), car = c.createOscillator(), mod = c.createOscillator(), idx = c.createGain(), g = c.createGain();
    car.frequency.value = f;
    mod.frequency.value = f;
    idx.gain.setValueAtTime(f * 2.2, t);
    idx.gain.setTargetAtTime(f * 0.4, t, 0.12);
    mod.connect(idx).connect(car.frequency);
    env(g, t, gain, 0.004, len, 0.12);
    car.connect(g).connect(keys);
    const end = t + len + 0.8;
    car.start(t); mod.start(t);
    car.stop(end); mod.stop(end);
  }

  function pad(t: number, ms: number[], len: number) {
    const lp = c.createBiquadFilter(), g = c.createGain();
    lp.type = 'lowpass';
    lp.frequency.value = 1100;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.022, t + 0.5);
    g.gain.setTargetAtTime(0, t + len, 0.25);
    lp.connect(g).connect(chorusIn);
    for (const m of ms) for (const cents of [-8, 8]) {
      const o = c.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = hz(m);
      o.detune.value = cents;
      o.connect(lp);
      o.start(t);
      o.stop(t + len + 1.2);
    }
  }

  function bass(t: number, m: number, len: number) {
    const sq = c.createOscillator(), sub = c.createOscillator(), lp = c.createBiquadFilter(), g = c.createGain();
    sq.type = 'square';
    sq.frequency.value = sub.frequency.value = hz(m);
    lp.type = 'lowpass';
    lp.Q.value = 4;
    lp.frequency.setValueAtTime(1600, t);
    lp.frequency.setTargetAtTime(260, t, 0.06);
    const sg = c.createGain();
    sg.gain.value = 0.35;
    sq.connect(sg).connect(lp);
    sub.connect(lp);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.32, t + 0.005);
    g.gain.setTargetAtTime(0.2, t + 0.01, 0.1);
    g.gain.setTargetAtTime(0, t + len, 0.03);
    lp.connect(g).connect(out);
    sq.start(t); sub.start(t);
    sq.stop(t + len + 0.3); sub.stop(t + len + 0.3);
  }

  function lead(t: number, m: number, len: number) {
    const lp = c.createBiquadFilter(), g = c.createGain(), vib = c.createOscillator(), vd = c.createGain();
    lp.type = 'lowpass';
    lp.frequency.value = 2600;
    vib.frequency.value = 5.5;
    vd.gain.setValueAtTime(0, t);
    vd.gain.linearRampToValueAtTime(len > 0.6 ? 14 : 0, t + len);
    vib.connect(vd);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.06, t + 0.02);
    g.gain.setTargetAtTime(0.045, t + 0.02, 0.2);
    g.gain.setTargetAtTime(0, t + len, 0.08);
    lp.connect(g);
    g.connect(out);
    g.connect(chorusIn);
    for (const [type, cents, lvl] of [['sawtooth', -6, 0.5], ['square', 6, 0.35]] as const) {
      const o = c.createOscillator(), og = c.createGain();
      o.type = type;
      o.frequency.value = hz(m);
      o.detune.value = cents;
      vd.connect(o.detune);
      og.gain.value = lvl;
      o.connect(og).connect(lp);
      o.start(t);
      o.stop(t + len + 0.6);
    }
    vib.start(t);
    vib.stop(t + len + 0.6);
  }

  function kick(t: number) {
    const o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(130, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(0.55, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.4);
  }

  function snare(t: number) {
    const n = c.createBufferSource(), hp = c.createBiquadFilter(), g = c.createGain(), o = c.createOscillator(), og = c.createGain();
    n.buffer = noise;
    hp.type = 'highpass';
    hp.frequency.value = 1200;
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    n.connect(hp).connect(g);
    o.type = 'triangle';
    o.frequency.value = 190;
    og.gain.setValueAtTime(0.18, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    o.connect(og);
    for (const node of [g, og]) {
      node.connect(out);
      node.connect(gateSend);
    }
    n.start(t, Math.random());
    n.stop(t + 0.25);
    o.start(t);
    o.stop(t + 0.15);
  }

  function hat(t: number, open = false, gain = 0.05) {
    const n = c.createBufferSource(), hp = c.createBiquadFilter(), g = c.createGain();
    n.buffer = noise;
    hp.type = 'highpass';
    hp.frequency.value = 7500;
    const len = open ? 0.25 : 0.04;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + len);
    n.connect(hp).connect(g).connect(out);
    n.start(t, Math.random());
    n.stop(t + len + 0.02);
  }

  /** A bar of lead melody over `chord`, from the major pentatonic, chord tones on the beat. */
  function makeLeadBar(chord: Chord, from: number): LeadNote[] {
    const tones = TONES[chord.q].map((x) => (x + chord.deg) % 12);
    let m = from;
    return pick(LEAD).map(([at, len]) => {
      const steps: number[] = [];
      for (let x = 63; x <= 84; x++) if (PENTA.includes((x - KEY + 120) % 12) || (Number.isInteger(at) && tones.includes((x - KEY + 120) % 12))) steps.push(x);
      const near = steps.filter((x) => Math.abs(x - m) <= 5 && x !== m);
      const onBeat = Number.isInteger(at) ? near.filter((x) => tones.includes((x - KEY + 120) % 12)) : [];
      m = pick(onBeat.length ? onBeat : near.length ? near : steps);
      return { at, m, len };
    });
  }

  function bar(t: number): number {
    const prog = PROGS[section % 3 === 2 ? 1 : 0];
    const i = barIdx % 8, chord = prog[i % 4], next = prog[(i + 1) % 4];
    const root = KEY + chord.deg;
    // Keys: rootless voicing around E4, with a comping rhythm.
    const centre = 64, voice = VOICING[chord.q].map((v) => root + v);
    const shift = 12 * Math.round((centre - voice.reduce((a, b) => a + b, 0) / voice.length) / 12);
    const notes = voice.map((m) => m + shift);
    const comp = pick(COMPS);
    for (const [at, len] of comp) for (const m of notes) ep(t + at * BEAT, m, len * BEAT, 0.05);
    pad(t, [notes[0] - 12, notes[2] - 12, notes[3]], 4 * BEAT);
    // Bass, in E♭1–D2.
    const br = 39 + ((chord.deg + 12) % 12), nr = 39 + ((next.deg + 12) % 12);
    for (const [at, which, len] of pick(BASS)) {
      const m = which === 'r' ? br : which === 'o' ? br + 12 : which === 'f' ? br + 7 : nr - 1;
      bass(t + at * BEAT, m - (m > 52 ? 12 : 0), len * BEAT);
    }
    // Drums from bar 4 of the first section.
    if (section > 0 || i >= 4) {
      kick(t);
      kick(t + 1.75 * BEAT);
      if (chance(0.5)) kick(t + 2.5 * BEAT);
      snare(t + BEAT);
      snare(t + 3 * BEAT);
      for (let h = 0; h < 8; h++) hat(t + h * 0.5 * BEAT, h === 7 && i % 2 === 1, h % 2 ? 0.035 : 0.05);
    }
    // Lead from the second section: a two-bar call, answered by new bars, repeated with change.
    if (section > 0 && section % 2 === 1) {
      if (i === 0) motif = [makeLeadBar(chord, 72), makeLeadBar(prog[1], 72)];
      const line = i < 2 ? motif[i] : i === 4 || i === 5 ? motif[i - 4].map((n, k, a) => (k === a.length - 1 ? { ...n, m: n.m + pick([-2, 0, 3]) } : n)) : i === 2 || i === 6 ? makeLeadBar(chord, 72) : [];
      for (const n of line) lead(t + n.at * BEAT, n.m, n.len * BEAT * 0.9);
    }
    barIdx++;
    if (barIdx % 8 === 0) section++;
    return t + 4 * BEAT;
  }

  return {
    reset: () => {
      barIdx = 0;
      section = 0;
    },
    bar,
  };
}
