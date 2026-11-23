// Menu music: an original, endless koto-and-shakuhachi piece made in code (no audio files).
//
//   koto (plucked strings, Karplus–Strong) ─┐
//   shakuhachi (breathy flute)             ─┼→ mix ─┬────────────→ fade → music bus (engine)
//   drone (low D and A)                    ─┘       └→ hall echo ─┘
//
// Miyako-bushi scale on D (D E♭ G A B♭). The koto plays two-bar phrases in sections of
// four (theme, its variation, a contrasting phrase, the theme again), then a bar of silence.
// The flute joins from the second section. Themes change every two sections, so it never
// quite repeats. `fade` brings it in on the menus and takes it out in the 3D world.
// The other styles, city pop and station melodies, are in cityPop.ts and stationMelody.ts; each style has its own bus, crossfaded on a switch.

import { makeCityPop, type CityPop } from './cityPop';
import { makeStationMelodies, type StationMelodies } from './stationMelody';
import { whenMusicReady } from './engine';

export type MusicStyle = 'traditional' | 'citypop' | 'melody';

const ROOT = 50; // D3
const SCALE = [0, 1, 5, 7, 8];
const BEAT = 60 / 64;
/** Scale degree (any integer, 5 per octave) → MIDI note. */
const midiOf = (d: number) => ROOT + 12 * Math.floor(d / 5) + SCALE[((d % 5) + 5) % 5];
const hz = (m: number) => 440 * 2 ** ((m - 69) / 12);
const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(Math.random() * xs.length)];
const chance = (p: number) => Math.random() < p;

interface Note { at: number; deg: number; len: number; bend?: boolean; grace?: boolean }
type Phrase = Note[];

/** Two-bar rhythms (beats); the last note rings into the next phrase. */
const RHYTHMS = [
  [1, 1, 2, 2, 2],
  [0.5, 0.5, 1, 2, 1, 3],
  [1.5, 0.5, 2, 1, 1, 2],
  [2, 1, 1, 4],
  [1, 0.5, 0.5, 1, 1, 4],
  [1, 1, 1, 1, 4],
] as const;

function makePhrase(start: number, end: number): Phrase {
  const rhythm = pick(RHYTHMS), out: Phrase = [];
  let at = 0, deg = start;
  rhythm.forEach((len, i) => {
    const last = i === rhythm.length - 1;
    if (last) deg = end;
    else if (i > 0) {
      // Koto lines drift downward toward the end of a phrase.
      const late = i >= rhythm.length - 3;
      deg = Math.min(10, Math.max(2, deg + pick(late ? [-2, -1, -1, 1] : [-2, -1, 1, 1, 2, 0])));
    }
    out.push({ at, deg, len, bend: !last && len >= 2 && chance(0.4), grace: i > 0 && chance(0.2) });
    at += len;
  });
  return out;
}

/** The same phrase with a few notes moved, so a repeat does not sound copied. */
const vary = (p: Phrase): Phrase =>
  p.map((n, i) => (i === p.length - 1 || !chance(0.3) ? { ...n } : { ...n, deg: Math.min(10, Math.max(2, n.deg + pick([-1, 1]))) }));

// ── Sound ──

let c: AudioContext, mix: GainNode, popMix: GainNode, fade: GainNode, noise: AudioBuffer, pop: CityPop;
let melMix: GainNode, mel: StationMelodies;
let style: MusicStyle = 'melody';
const strings = new Map<number, AudioBuffer>();
let want = false, built = false, timer = 0;
let nextAt = 0, section = 0, phraseIdx = 0, theme: Phrase = [], bridge: Phrase = [];

/** One koto string, plucked: Karplus–Strong into a buffer, cached per note. */
function kotoString(m: number): AudioBuffer {
  const have = strings.get(m);
  if (have) return have;
  const sr = c.sampleRate, f = hz(m);
  const t60 = Math.max(1.4, 3.4 - (m - 50) * 0.07);
  const len = Math.floor(sr * t60 * 1.1), buf = c.createBuffer(1, len, sr), y = buf.getChannelData(0);
  const N = sr / f - 0.5, Ni = Math.floor(N), fr = N - Ni;
  const rho = 0.001 ** (1 / (f * t60));
  let lp = 0;
  for (let i = 0; i <= Ni + 1 && i < len; i++) y[i] = lp += 0.55 * (Math.random() * 2 - 1 - lp);
  for (let i = Ni + 2; i < len; i++) {
    const a = (1 - fr) * y[i - Ni] + fr * y[i - Ni - 1];
    const b = (1 - fr) * y[i - Ni - 1] + fr * y[i - Ni - 2];
    y[i] = rho * 0.5 * (a + b);
  }
  let peak = 0;
  for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(y[i]));
  const k = 0.8 / (peak || 1), tail = Math.floor(sr * 0.05);
  for (let i = 0; i < len; i++) y[i] *= k * Math.min(1, (len - i) / tail);
  strings.set(m, buf);
  return buf;
}

function koto(t: number, deg: number, gain: number, bendAt?: number) {
  const m = midiOf(deg), src = c.createBufferSource(), g = c.createGain(), pan = c.createStereoPanner();
  src.buffer = kotoString(m);
  pan.pan.value = Math.max(-0.6, Math.min(0.6, (m - 62) / 20));
  g.gain.value = gain;
  if (bendAt !== undefined) {
    // Oshide: press the string behind the bridge, up to the next note of the scale.
    src.playbackRate.setValueAtTime(1, t + bendAt);
    src.playbackRate.linearRampToValueAtTime(2 ** ((midiOf(deg + 1) - m) / 12), t + bendAt + 0.18);
  }
  src.connect(g).connect(pan).connect(mix);
  src.start(t);
}

function shakuhachi(t: number, deg: number, dur: number, gain: number) {
  const f = hz(midiOf(deg)), env = c.createGain(), tone = c.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 2000;
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(gain, t + 0.4);
  env.gain.setValueAtTime(gain, t + dur);
  env.gain.setTargetAtTime(0, t + dur, 0.25);
  const end = t + dur + 1.5;
  const lfo = c.createOscillator(), depth = c.createGain();
  lfo.frequency.value = 5;
  depth.gain.setValueAtTime(0, t);
  depth.gain.setValueAtTime(0, t + dur * 0.4);
  depth.gain.linearRampToValueAtTime(16, t + dur);
  lfo.connect(depth);
  for (const [type, level] of [['sine', 1], ['triangle', 0.3]] as const) {
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.value = f;
    // Meri: the note is reached from below.
    o.detune.setValueAtTime(-80, t);
    o.detune.linearRampToValueAtTime(0, t + 0.35);
    depth.connect(o.detune);
    g.gain.value = level;
    o.connect(g).connect(tone);
    o.start(t);
    o.stop(end);
  }
  const breath = c.createBufferSource(), band = c.createBiquadFilter(), bg = c.createGain();
  breath.buffer = noise;
  breath.loop = true;
  band.type = 'bandpass';
  band.frequency.value = f * 2;
  band.Q.value = 1.5;
  bg.gain.value = 0.35;
  breath.connect(band).connect(bg).connect(tone);
  breath.start(t, Math.random());
  breath.stop(end);
  lfo.start(t);
  lfo.stop(end);
  const pan = c.createStereoPanner();
  pan.pan.value = -0.25;
  tone.connect(env).connect(pan).connect(mix);
}

function hall(seconds: number): AudioBuffer {
  const n = Math.floor(c.sampleRate * seconds), buf = c.createBuffer(2, n, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < n; i++) d[i] = (lp += 0.35 * (Math.random() * 2 - 1 - lp)) * Math.exp((-6.9 * i) / n);
  }
  return buf;
}

function build(ctx: AudioContext, bus: GainNode) {
  c = ctx;
  built = true;
  fade = c.createGain();
  fade.gain.value = 0;
  fade.connect(bus);
  mix = c.createGain();
  mix.connect(fade);
  const verb = c.createConvolver(), send = c.createGain();
  verb.buffer = hall(3.5);
  send.gain.value = 0.45;
  mix.connect(send).connect(verb).connect(fade);
  popMix = c.createGain();
  popMix.connect(fade);
  const popSend = c.createGain();
  popSend.gain.value = 0.12;
  popMix.connect(popSend).connect(verb);
  mix.gain.value = style === 'traditional' ? 1 : 0;
  popMix.gain.value = style === 'citypop' ? 1 : 0;
  melMix = c.createGain();
  melMix.connect(fade);
  melMix.gain.value = style === 'melody' ? 1 : 0;
  noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
  const nd = noise.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  pop = makeCityPop(c, popMix, noise);
  mel = makeStationMelodies(c, melMix, noise);
  // Drone: low D and A, breathing slowly.
  const droneTone = c.createBiquadFilter(), droneGain = c.createGain(), sway = c.createOscillator(), swayDepth = c.createGain();
  droneTone.type = 'lowpass';
  droneTone.frequency.value = 380;
  droneGain.gain.value = 0.05;
  sway.frequency.value = 0.06;
  swayDepth.gain.value = 0.025;
  sway.connect(swayDepth).connect(droneGain.gain);
  for (const [m, type] of [[38, 'sine'], [45, 'triangle']] as const) {
    const o = c.createOscillator();
    o.type = type;
    o.frequency.value = hz(m);
    o.connect(droneTone);
    o.start();
  }
  droneTone.connect(droneGain).connect(mix);
  sway.start();
  apply();
}

function schedulePhrase(t: number): number {
  if (phraseIdx === 0) {
    if (section % 2 === 0 || theme.length === 0) theme = makePhrase(pick([5, 6, 7]), pick([3, 5]));
    bridge = makePhrase(pick([7, 8, 9]), pick([5, 8]));
  }
  const p = phraseIdx === 0 ? theme : phraseIdx === 1 ? vary(theme) : phraseIdx === 2 ? bridge : [...vary(theme).slice(0, -1), { ...theme[theme.length - 1], deg: 5 }];
  koto(t, phraseIdx === 2 ? -2 : -5, 0.4);
  for (const n of p) {
    const at = t + n.at * BEAT + (Math.random() - 0.5) * 0.03;
    if (n.grace) koto(at - 0.08, n.deg + 1, 0.15);
    koto(at, n.deg, 0.32 + Math.random() * 0.06, n.bend ? n.len * BEAT * 0.45 : undefined);
  }
  if (section > 0 && (phraseIdx === 2 || (phraseIdx === 3 && chance(0.5)))) {
    let at = t + BEAT * 0.5;
    const line = phraseIdx === 2 ? [[pick([8, 9, 10]), 3], [pick([7, 8]), 1.5], [pick([5, 8]), 3]] : [[pick([7, 8]), 3], [5, 4]];
    for (const [deg, len] of line) {
      shakuhachi(at, deg, len * BEAT * 0.95, 0.09);
      at += len * BEAT;
    }
  }
  const length = 8 + (phraseIdx === 3 ? 4 : 0);
  phraseIdx = (phraseIdx + 1) % 4;
  if (phraseIdx === 0) section++;
  return t + length * BEAT;
}

function tick() {
  if (!want) return;
  while (nextAt < c.currentTime + 1.5) nextAt = style === 'citypop' ? pop.bar(nextAt) : style === 'melody' ? mel.bar(nextAt) : schedulePhrase(nextAt);
}

function apply() {
  if (!built) return;
  const t = c.currentTime;
  fade.gain.cancelScheduledValues(t);
  fade.gain.setValueAtTime(fade.gain.value, t);
  fade.gain.setTargetAtTime(want ? 1 : 0, t, want ? 0.8 : 0.4);
  if (want && !timer) {
    // Start a fresh section after a short breath.
    nextAt = t + 0.4;
    phraseIdx = 0;
    pop.reset();
    mel.reset();
    timer = window.setInterval(tick, 200);
    tick();
  } else if (!want && timer) {
    window.clearInterval(timer);
    timer = 0;
  }
}

/** Menus on (true) or in the 3D world (false). Music starts once the browser allows sound. */
export function setMenuMusic(on: boolean) {
  if (on === want) return;
  want = on;
  if (built) apply();
  else if (on) whenMusicReady((ctx, bus) => !built && build(ctx, bus));
}

/** Switch style; while playing, the old one fades out and the new one starts from its top. */
export function setMusicStyle(s: MusicStyle) {
  if (s === style) return;
  style = s;
  if (!built) return;
  const t = c.currentTime;
  for (const [bus, on] of [[mix, s === 'traditional'], [popMix, s === 'citypop'], [melMix, s === 'melody']] as const) {
    bus.gain.cancelScheduledValues(t);
    bus.gain.setValueAtTime(bus.gain.value, t);
    // The new style's bus opens once the old one's notes are gone.
    if (on) bus.gain.setValueAtTime(1, t + 0.35);
    else bus.gain.setTargetAtTime(0, t, 0.1);
  }
  nextAt = t + 0.4;
  phraseIdx = 0;
  pop.reset();
  mel.reset();
}
