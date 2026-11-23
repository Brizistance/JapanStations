// Audio output. One AudioContext (unlocked on the first click or key, as browsers require).
//
//   PA channel (one per track) → speaker tone → speakers along that track's platform edge ─┐
//   trains, doors, tunnel wind (positional) ───────────────────────────────────────────────┴→ hearing → muffle ─┬→ out
//                                                                                                               └→ echo → out
//   ambience loops (crossfaded by place) ──────────────────────────────────────────────────────────────────────┬→ out
//   footsteps ─────────────────────────────────────────────────────────────────────────────────────────────────┴→ echo
//
// Everything in the station is positional, so far sounds fade with distance and both tracks
// can speak at once. "Hearing" dulls the station's sound away from the platform. The echo is
// a code-made impulse response sized to the room the player is in.

const BASE = `${import.meta.env.BASE_URL}audio/`;
const CLIP_GAP_S = 0.3, GROUP_GAP_S = 0.8;
/** Voice sits a little under the jingles. */
const VOICE_GAIN = 0.8;
/** An announcement still waiting after this long is out of date: drop it. */
const STALE_MS = 15000;
/** An announcement that waited longer than this in the queue plays its short form. */
const SHORT_AFTER_MS = 3000;
const SOUND_SPEED = 343;

type V3 = [number, number, number];

let ctx: AudioContext | null = null;
let trainBus: GainNode, carBus: GainNode, roadBus: GainNode, stepBus: GainNode, ambBus: GainNode, hearing: GainNode, muffle: BiquadFilterNode, out: AudioNode;
let echoIn: GainNode, stepEcho: GainNode, ambEcho: GainNode, musicBus: GainNode;
const vol = { voice: 0.8, sfx: 0.8, music: 0.6, master: 1, muted: false, musicMuted: false };
const unlockWaiters: ((c: AudioContext, bus: GainNode) => void)[] = [];
/** Master volume, or silence when muted. */
const master = () => (vol.muted ? 0 : vol.master);

// ── Echo: two convolvers, crossfaded when the room changes ──

export interface Room {
  /** Seconds for the tail to die away. */
  decay: number;
  /** How much of the station's sound goes into the echo. */
  wet: number;
}
const echo: { conv: ConvolverNode; gain: GainNode }[] = [];
let echoActive = 0, echoDecay = 0;

function impulse(c: AudioContext, seconds: number): AudioBuffer {
  const n = Math.floor(c.sampleRate * seconds), buf = c.createBuffer(2, n, c.sampleRate);
  const k = 6.9 / seconds; // −60 dB at the end
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < n; i++) {
      const t = i / c.sampleRate;
      // A short gap, sparse hard early reflections off tile, then a diffuse tail.
      const early = t > 0.01 && t < 0.03 + seconds * 0.04 && Math.random() < 0.004 ? 0.7 * (Math.random() < 0.5 ? -1 : 1) : 0;
      d[i] = t < 0.01 ? 0 : (Math.random() * 2 - 1) * Math.exp(-t * k) * 0.5 + early;
    }
  }
  return buf;
}

export function setRoom(r: Room) {
  if (!live()) return;
  const c = ctx!, t = c.currentTime;
  echoIn.gain.setTargetAtTime(r.wet, t, 0.4);
  if (Math.abs(r.decay - echoDecay) < 0.25) return;
  echoDecay = r.decay;
  const next = 1 - echoActive;
  echo[next].conv.buffer = impulse(c, r.decay);
  echo[next].gain.gain.setTargetAtTime(1, t, 0.3);
  echo[echoActive].gain.gain.setTargetAtTime(0, t, 0.3);
  echoActive = next;
}

// ── Setup ──

function unlock() {
  if (!ctx) {
    const c = (ctx = new AudioContext());
    const comp = c.createDynamicsCompressor();
    comp.connect(c.destination);
    out = comp;
    echoIn = c.createGain();
    echoIn.gain.value = 0.4;
    for (let i = 0; i < 2; i++) {
      const conv = c.createConvolver(), gain = c.createGain();
      gain.gain.value = i === 0 ? 1 : 0;
      conv.buffer = impulse(c, 2);
      echoIn.connect(conv).connect(gain).connect(out);
      echo.push({ conv, gain });
    }
    echoDecay = 2;
    hearing = c.createGain();
    hearing.gain.value = 0;
    muffle = c.createBiquadFilter();
    muffle.type = 'lowpass';
    muffle.frequency.value = 18000;
    hearing.connect(muffle);
    muffle.connect(out);
    muffle.connect(echoIn);
    trainBus = c.createGain();
    trainBus.connect(hearing);
    carBus = c.createGain();
    carBus.connect(out);
    roadBus = c.createGain();
    roadBus.connect(out);
    stepBus = c.createGain();
    stepEcho = c.createGain();
    stepEcho.gain.value = 0;
    stepBus.connect(out);
    stepBus.connect(stepEcho).connect(echoIn);
    ambBus = c.createGain();
    ambEcho = c.createGain();
    ambEcho.gain.value = 0.15;
    ambBus.connect(out);
    ambBus.connect(ambEcho).connect(echoIn);
    musicBus = c.createGain();
    musicBus.gain.value = 0;
    musicBus.connect(out);
    for (const ch of channels.values()) wireChannel(ch);
    applyVolume();
    for (const w of unlockWaiters.splice(0)) w(c, musicBus);
  }
  if (ctx.state === 'suspended') void ctx.resume();
}
if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', unlock, { capture: true });
  window.addEventListener('keydown', unlock, { capture: true });
}
const live = () => ctx !== null && ctx.state === 'running';
/** True once the browser lets sound play (after the first click or key). */
export const audioLive = () => live();

function applyVolume() {
  if (!ctx) return;
  const t = ctx.currentTime, voice = vol.voice * master(), sfx = vol.sfx * master();
  for (const ch of channels.values()) ch.input?.gain.setTargetAtTime(voice, t, 0.05);
  trainBus.gain.setTargetAtTime(sfx, t, 0.05);
  carBus.gain.setTargetAtTime(sfx * 0.7, t, 0.05);
  roadBus.gain.setTargetAtTime(sfx * 0.55, t, 0.05);
  stepBus.gain.setTargetAtTime(sfx * 0.45, t, 0.05);
  ambBus.gain.setTargetAtTime(sfx * 0.5, t, 0.05);
  musicBus.gain.setTargetAtTime(vol.musicMuted ? 0 : vol.music * master(), t, 0.05);
}
export function setMusicVolume(v: number) {
  vol.music = v;
  applyVolume();
}
export function setMusicMuted(m: boolean) {
  vol.musicMuted = m;
  applyVolume();
}
/** Calls `fn` with the context and the music bus once sound is unlocked (at once if it already is). */
export function whenMusicReady(fn: (c: AudioContext, bus: GainNode) => void) {
  if (ctx) fn(ctx, musicBus);
  else unlockWaiters.push(fn);
}
export function setMasterVolume(v: number) {
  vol.master = v;
  applyVolume();
}
export function setMuted(m: boolean) {
  vol.muted = m;
  applyVolume();
}
export function setVoiceVolume(v: number) {
  vol.voice = v;
  applyVolume();
}
export function setSfxVolume(v: number) {
  vol.sfx = v;
  applyVolume();
}

// ── Clips ──

const cache = new Map<string, Promise<AudioBuffer | null>>();
/** `path` is relative to public/audio, without extension: "voice/F-1234abcd", "sfx/chime". */
function load(path: string): Promise<AudioBuffer | null> {
  let p = cache.get(path);
  if (!p) {
    p = fetch(`${BASE}${path}.mp3`)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      .then((b) => ctx!.decodeAudioData(b))
      .catch(() => made(path)); // Not generated yet: one made here if there is one, or silence.
    cache.set(path, p);
  }
  return p;
}

// ── Listener and hearing ──

export interface Hearing {
  /** 0 silent … 1 standing on the platform. */
  level: number;
  /** Heard through walls and stairwells: dull the highs. */
  muffled: boolean;
  /** Exact low-pass cutoff, Hz, overriding `muffled` (inside a train: depends on the doors). */
  cutoff?: number;
  /** Below ground: footsteps echo too. */
  under: boolean;
}

let listener: V3 = [0, 0, 0];
export function tickListener(x: number, y: number, z: number, yaw: number, h: Hearing) {
  if (!live()) return;
  const c = ctx!, t = c.currentTime, L = c.listener;
  listener = [x, y, z];
  if (L.positionX) {
    L.positionX.setValueAtTime(x, t);
    L.positionY.setValueAtTime(y, t);
    L.positionZ.setValueAtTime(z, t);
    L.forwardX.setValueAtTime(-Math.sin(yaw), t);
    L.forwardY.setValueAtTime(0, t);
    L.forwardZ.setValueAtTime(-Math.cos(yaw), t);
    L.upX.setValueAtTime(0, t);
    L.upY.setValueAtTime(1, t);
    L.upZ.setValueAtTime(0, t);
  } else {
    L.setPosition(x, y, z);
    L.setOrientation(-Math.sin(yaw), 0, -Math.cos(yaw), 0, 1, 0);
  }
  hearing.gain.setTargetAtTime(h.level, t, 0.25);
  muffle.frequency.setTargetAtTime(h.cutoff ?? (h.muffled ? 1100 : 18000), t, 0.25);
  stepEcho.gain.setTargetAtTime(h.under ? 0.8 : 0, t, 0.3);
  for (const a of attached) {
    const p = a.pos();
    if (!p) continue;
    a.panner.positionX.setValueAtTime(p[0], t);
    a.panner.positionY.setValueAtTime(p[1], t);
    a.panner.positionZ.setValueAtTime(p[2], t);
  }
  // Each PA speaker reaches you after its own travel time: the smeared, overlapping sound
  // of a long row of ceiling speakers.
  for (const ch of channels.values()) {
    for (const s of ch.speakers) s.delay.delayTime.setTargetAtTime(dist(s.at, listener) / SOUND_SPEED, t, 0.05);
  }
}
const dist = (a: V3, b: V3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

function panner(c: AudioContext, at: V3, ref: number, rolloff: number): PannerNode {
  return new PannerNode(c, {
    panningModel: 'HRTF', distanceModel: 'inverse', refDistance: ref, rolloffFactor: rolloff, maxDistance: 500,
    positionX: at[0], positionY: at[1], positionZ: at[2],
  });
}

// ── Ambience: one loop per kind of place, crossfaded ──

export type Ambience = 'amb-platform' | 'amb-concourse' | 'amb-outdoor' | null;
const ambLoops = new Map<string, GainNode>();
export function setAmbience(kind: Ambience, level = 1) {
  if (!live()) return;
  const c = ctx!, t = c.currentTime;
  if (kind && !ambLoops.has(kind)) {
    const g = c.createGain();
    g.gain.value = 0;
    g.connect(ambBus);
    ambLoops.set(kind, g);
    void load(`sfx/${kind}`).then((buf) => {
      if (!buf) return;
      const src = c.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.connect(g);
      src.start(0, Math.random() * buf.duration);
    });
  }
  for (const [k, g] of ambLoops) g.gain.setTargetAtTime(k === kind ? level : 0, t, 0.8);
}

// ── Positional sounds that follow something (a train) ──

interface Attached {
  src: AudioBufferSourceNode;
  gain: GainNode;
  panner: PannerNode;
  pos: () => V3 | null;
}
const attached = new Set<Attached>();
export interface SoundHandle {
  stop(fadeS?: number): void;
}

/** Play an effect at a moving position. Returns a handle to stop it (loops run until stopped). */
export function playAt(name: string, pos: () => V3 | null, opts: { loop?: boolean; gain?: number; road?: boolean } = {}): SoundHandle {
  let a: Attached | null = null, stopped = false;
  if (live()) {
    void load(name.includes('/') ? name : `sfx/${name}`).then((buf) => {
      if (!buf || stopped || !ctx) return;
      const c = ctx;
      const p = panner(c, pos() ?? listener, 10, 1);
      const gain = c.createGain();
      gain.gain.value = opts.gain ?? 1;
      const src = c.createBufferSource();
      src.buffer = buf;
      src.loop = !!opts.loop;
      src.connect(gain).connect(p).connect(opts.road ? roadBus : trainBus);
      a = { src, gain, panner: p, pos };
      attached.add(a);
      src.onended = () => attached.delete(a!);
      src.start();
    });
  }
  return {
    stop(fadeS = 0.6) {
      stopped = true;
      if (!a || !ctx) return;
      a.gain.gain.setTargetAtTime(0, ctx.currentTime, fadeS / 3);
      a.src.stop(ctx.currentTime + fadeS);
    },
  };
}

export interface PosLoopHandle {
  /** Playback rate, level and low-pass cutoff (Hz), eased. */
  set(rate: number, gain: number, cutoff?: number): void;
  stop(fadeS?: number): void;
}

// ── Sounds made here, played until a recording of the same name exists (scripts/gen-sfx.ts) ──

/** Seconds of noise, its ends blended so it loops. `soft`: how much of the hiss is smoothed away (0 … 1). `hum`: an engine note under it, Hz. */
function noise(c: AudioContext, seconds: number, soft: number, hum = 0): AudioBuffer {
  const n = Math.floor(c.sampleRate * seconds), fade = Math.floor(c.sampleRate * 0.25);
  const buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
  const raw = new Float32Array(n + fade);
  let low = 0, seed = 12345 + Math.round(soft * 1000) + hum;
  for (let i = 0; i < raw.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
    low += ((seed / 2147483648) - low) * (1 - soft);
    raw[i] = low * (1 + soft * 40) * 0.08 + (hum ? 0.12 * Math.sin((2 * Math.PI * hum * i) / c.sampleRate) + 0.06 * Math.sin((4 * Math.PI * hum * i) / c.sampleRate) : 0);
  }
  for (let i = 0; i < n; i++) d[i] = i < fade ? raw[i] * (i / fade) + raw[n + i] * (1 - i / fade) : raw[i];
  return buf;
}

/** A short burst of hiss dying away: a bus's air brake. */
function hiss(c: AudioContext): AudioBuffer {
  const n = Math.floor(c.sampleRate * 0.8), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
  let seed = 777, last = 0;
  for (let i = 0; i < n; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
    const w = seed / 2147483648;
    // Keep the highs: the difference of neighbouring samples.
    d[i] = (w - last) * 0.35 * Math.exp((-5 * i) / n) * Math.min(1, i / 300);
    last = w;
  }
  return buf;
}

/** Notes one after another, then silence to make up `seconds`: each is [from Hz, to Hz, seconds]. A pedestrian signal's call. */
function call(c: AudioContext, seconds: number, notes: [number, number, number][]): AudioBuffer {
  const n = Math.floor(c.sampleRate * seconds), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
  let at = 0, phase = 0;
  for (const [f0, f1, len] of notes) {
    const m = Math.floor(c.sampleRate * len);
    for (let i = 0; i < m && at + i < n; i++) {
      const t = i / m;
      phase += (2 * Math.PI * (f0 + (f1 - f0) * t)) / c.sampleRate;
      d[at + i] = Math.sin(phase) * 0.3 * Math.min(1, t * 12, (1 - t) * 12);
    }
    at += m + Math.floor(c.sampleRate * 0.04);
  }
  return buf;
}

/** Wind whistling round corners and through wires: noise rung at a pitch that wanders. Loops. */
function howl(c: AudioContext): AudioBuffer {
  const seconds = 8, n = Math.floor(c.sampleRate * seconds), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
  let seed = 4242, y1 = 0, y2 = 0;
  for (let i = 0; i < n; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
    const t = i / n;
    // Whole turns over the buffer, so the end meets the start.
    const f = 430 + 150 * Math.sin(2 * Math.PI * t * 2) + 70 * Math.sin(2 * Math.PI * t * 5 + 1);
    const w = (2 * Math.PI * f) / c.sampleRate, r = 0.9965;
    const y = (seed / 2147483648) * 0.012 + 2 * r * Math.cos(w) * y1 - r * r * y2;
    y2 = y1;
    y1 = y;
    d[i] = y * 0.15 * (0.6 + 0.4 * Math.sin(2 * Math.PI * t * 3 + 2));
  }
  // Let the ringing settle before the join.
  const fade = Math.floor(c.sampleRate * 0.3);
  for (let i = 0; i < fade; i++) {
    d[i] *= i / fade;
    d[n - 1 - i] *= i / fade;
  }
  return buf;
}

/** Thunder: a crack, then a long low roll that swells and dies away. */
function thunder(c: AudioContext): AudioBuffer {
  const seconds = 6, n = Math.floor(c.sampleRate * seconds), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
  let seed = 9091, low = 0, lower = 0;
  for (let i = 0; i < n; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
    const w = seed / 2147483648, t = i / c.sampleRate;
    low += (w - low) * 0.02;
    lower += (low - lower) * 0.01;
    const crack = Math.exp(-t * 9) * (w * 0.5 + low * 4);
    const roll = lower * 60 * Math.exp(-t * 0.75) * (0.55 + 0.45 * Math.sin(t * 5.3) * Math.sin(t * 1.9 + 1)) * Math.min(1, t * 6 + 0.2);
    d[i] = Math.max(-1, Math.min(1, (crack + roll) * 0.3)) * Math.min(1, (seconds - t) * 2);
  }
  return buf;
}

const MADE: Record<string, (c: AudioContext) => AudioBuffer> = {
  'sfx/storm-wind': (c) => noise(c, 6, 0.985),
  'sfx/storm-howl': howl,
  'sfx/storm-rain': (c) => noise(c, 5, 0.35),
  'sfx/thunder': thunder,
  'sfx/road-car': (c) => noise(c, 4, 0.94),
  'sfx/road-heavy': (c) => noise(c, 4, 0.965, 62),
  'sfx/road-scooter': (c) => noise(c, 3, 0.9, 148),
  'sfx/road-idle': (c) => noise(c, 3, 0.975, 38),
  'sfx/road-wet': (c) => noise(c, 4, 0.55),
  'sfx/bus-brake': hiss,
  'sfx/signal-piyo': (c) => call(c, 1.1, [[2500, 1900, 0.11], [2100, 1600, 0.13]]),
  'sfx/signal-kakko': (c) => call(c, 1.5, [[1060, 1060, 0.2], [840, 840, 0.26]]),
};
function made(path: string): AudioBuffer | null {
  return ctx && MADE[path] ? MADE[path](ctx) : null;
}

/** A looping sound of the sky (wind, rain): no place of its own, heard whatever the station's hearing, steered live. */
export function skyLoop(name: string): PosLoopHandle {
  let src: AudioBufferSourceNode | null = null, g: GainNode | null = null, lp: BiquadFilterNode | null = null, stopped = false;
  let want = { rate: 1, gain: 0, cutoff: 18000 };
  const apply = () => {
    if (!src || !g || !lp || !ctx) return;
    const t = ctx.currentTime;
    src.playbackRate.setTargetAtTime(want.rate, t, 0.3);
    g.gain.setTargetAtTime(want.gain, t, 0.3);
    lp.frequency.setTargetAtTime(want.cutoff, t, 0.4);
  };
  if (live()) {
    void load(`sfx/${name}`).then((buf) => {
      if (!buf || stopped || !ctx) return;
      g = ctx.createGain();
      g.gain.value = 0;
      lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = want.cutoff;
      src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.connect(lp).connect(g).connect(roadBus);
      src.start(0, Math.random() * buf.duration);
      apply();
    });
  }
  return {
    set(rate, gain, cutoff = 18000) {
      want = { rate, gain, cutoff };
      apply();
    },
    stop(fadeS = 1) {
      stopped = true;
      if (!src || !g || !ctx) return;
      g.gain.setTargetAtTime(0, ctx.currentTime, fadeS / 3);
      src.stop(ctx.currentTime + fadeS + 0.5);
    },
  };
}

/** A one-shot from the sky (thunder), `delayS` from now, dulled to `cutoff` Hz. */
export function playSky(name: string, gain = 1, cutoff = 18000, delayS = 0, rate = 1) {
  if (!live()) return;
  void load(`sfx/${name}`).then((buf) => {
    if (!buf || !ctx) return;
    const src = ctx.createBufferSource(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    src.buffer = buf;
    src.playbackRate.value = rate;
    g.gain.value = gain;
    lp.type = 'lowpass';
    lp.frequency.value = cutoff;
    src.connect(lp).connect(g).connect(roadBus);
    src.start(ctx.currentTime + delayS);
  });
}

/**
 * A looping sound that follows a moving position (a train running past), steered live.
 * `road`: heard in the street whatever the station's hearing (road traffic).
 */
export function loopAt(name: string, pos: () => V3 | null, road = false): PosLoopHandle {
  let a: Attached | null = null, lp: BiquadFilterNode | null = null, stopped = false;
  let want = { rate: 1, gain: 0, cutoff: 18000 };
  const apply = () => {
    if (!a || !lp || !ctx) return;
    const t = ctx.currentTime;
    a.src.playbackRate.setTargetAtTime(want.rate, t, 0.15);
    a.gain.gain.setTargetAtTime(want.gain, t, 0.15);
    lp.frequency.setTargetAtTime(want.cutoff, t, 0.2);
  };
  if (live()) {
    void load(`sfx/${name}`).then((buf) => {
      if (!buf || stopped || !ctx) return;
      const c = ctx;
      const p = panner(c, pos() ?? listener, 10, 1);
      const gain = c.createGain();
      gain.gain.value = 0;
      lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = want.cutoff;
      const src = c.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.connect(lp).connect(gain).connect(p).connect(road ? roadBus : trainBus);
      a = { src, gain, panner: p, pos };
      attached.add(a);
      src.onended = () => attached.delete(a!);
      src.start(0, Math.random() * buf.duration);
      apply();
    });
  }
  return {
    set(rate, gain, cutoff = 18000) {
      want = { rate, gain, cutoff };
      apply();
    },
    stop(fadeS = 1) {
      stopped = true;
      if (!a || !ctx) return;
      a.gain.gain.setTargetAtTime(0, ctx.currentTime, fadeS / 3);
      a.src.stop(ctx.currentTime + fadeS);
    },
  };
}

/** Clips back to back from one fixed spot (a platform door's own little speaker). */
export function playSeqAt(paths: string[], at: V3, gain = 1) {
  if (!live()) return;
  void Promise.all(paths.map(load)).then((bufs) => {
    if (!ctx) return;
    const c = ctx;
    const p = panner(c, at, 2, 1.8), g = c.createGain();
    g.gain.value = gain;
    g.connect(p).connect(trainBus);
    let t = c.currentTime + 0.05;
    for (const b of bufs) {
      if (!b) continue;
      const src = c.createBufferSource();
      src.buffer = b;
      src.connect(g);
      src.start(t);
      t += b.duration + 0.15;
    }
  });
}

// ── Inside the car: looping layers steered live, and one-shots ──

export interface LoopHandle {
  /** Playback rate (pitch) and level, eased so changes never click. */
  set(rate: number, gain: number): void;
  stop(): void;
}

/** A looping layer in the car, silent until `set`. Starts at a random point so layers don't phase. */
export function carLoop(name: string): LoopHandle {
  let src: AudioBufferSourceNode | null = null, g: GainNode | null = null, stopped = false;
  let want = { rate: 1, gain: 0 };
  if (live()) {
    void load(`sfx/${name}`).then((buf) => {
      if (!buf || !ctx || stopped) return;
      g = ctx.createGain();
      g.gain.value = 0;
      g.connect(carBus);
      src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.connect(g);
      src.start(0, Math.random() * buf.duration);
      apply();
    });
  }
  function apply() {
    if (!src || !g || !ctx) return;
    src.playbackRate.setTargetAtTime(want.rate, ctx.currentTime, 0.15);
    g.gain.setTargetAtTime(want.gain, ctx.currentTime, 0.12);
  }
  return {
    set(rate, gain) {
      want = { rate, gain };
      apply();
    },
    stop() {
      stopped = true;
      if (!src || !g || !ctx) return;
      g.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
      src.stop(ctx.currentTime + 1);
    },
  };
}

/** A one-shot inside the car (door chime, a passing train). */
export function playCar(name: string, gain = 1) {
  if (!live()) return;
  void load(`sfx/${name}`).then((buf) => {
    if (!buf || !ctx) return;
    const src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = buf;
    g.gain.value = gain;
    src.connect(g).connect(carBus);
    src.start();
  });
}

/** A footstep: dry, straight to the player, with a little pitch and level spread. */
export function playStep(name: string) {
  if (!live()) return;
  void load(`sfx/${name}`).then((buf) => {
    if (!buf || !ctx) return;
    const src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = buf;
    src.playbackRate.value = 0.92 + Math.random() * 0.16;
    g.gain.value = 0.75 + Math.random() * 0.25;
    src.connect(g).connect(stepBus);
    src.start();
  });
}

// ── PA: one channel per track, each with its own queue and row of speakers ──

interface Speaker {
  at: V3;
  delay: DelayNode;
  panner: PannerNode;
}
interface Group {
  tag: string;
  items: string[];
  /** Played instead when the group had to wait (the train is already coming in). */
  short?: string[];
  at: number;
}
interface Channel {
  input: GainNode | null;
  tone: AudioNode | null;
  speakers: Speaker[];
  want: V3[];
  queue: Group[];
  busy: boolean;
  generation: number;
  current: AudioBufferSourceNode | null;
  /** Straight to the output (the in-car PA). */
  direct: boolean;
}
const channels = new Map<string, Channel>();
/** The channel id of the PA inside the train being ridden. */
export const CAR = 'car';

function channel(id: string): Channel {
  let ch = channels.get(id);
  if (!ch) {
    ch = { input: null, tone: null, speakers: [], want: [], queue: [], busy: false, generation: 0, current: null, direct: id === CAR };
    channels.set(id, ch);
    if (ctx) wireChannel(ch);
  }
  return ch;
}

/** Bandwidth-limited, slightly driven: the sound of a station loudspeaker. */
function speakerTone(c: AudioContext, input: AudioNode): AudioNode {
  const hp = c.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 320;
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 4800;
  const presence = c.createBiquadFilter();
  presence.type = 'peaking';
  presence.frequency.value = 2200;
  presence.Q.value = 0.9;
  presence.gain.value = 4;
  const drive = c.createWaveShaper();
  const n = 1024, curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(1.6 * x) / Math.tanh(1.6);
  }
  drive.curve = curve;
  drive.oversample = '2x';
  input.connect(hp).connect(presence).connect(drive).connect(lp);
  return lp;
}

function wireChannel(ch: Channel) {
  const c = ctx!;
  ch.input = c.createGain();
  ch.input.gain.value = vol.voice * master();
  ch.tone = speakerTone(c, ch.input);
  // The in-car PA: the speakers are right overhead, so no position and no station echo.
  if (ch.direct) ch.tone.connect(out);
  else placeSpeakers(ch);
}

function placeSpeakers(ch: Channel) {
  if (!ctx || !ch.tone || ch.direct) return;
  const c = ctx;
  for (const s of ch.speakers) {
    ch.tone.disconnect(s.delay);
    s.panner.disconnect();
  }
  ch.speakers = ch.want.map((at) => {
    const delay = c.createDelay(1);
    delay.delayTime.value = dist(at, listener) / SOUND_SPEED;
    const g = c.createGain();
    g.gain.value = 1 / Math.sqrt(ch.want.length);
    // Zoned, downward-aimed speakers: loud beneath, falling off fast across the platform.
    const p = panner(c, at, 3, 1.6);
    p.orientationX.value = 0;
    p.orientationY.value = -1;
    p.orientationZ.value = 0;
    p.coneInnerAngle = 100;
    p.coneOuterAngle = 240;
    p.coneOuterGain = 0.25;
    ch.tone!.connect(delay).connect(g).connect(p).connect(hearing);
    return { at, delay, panner: p };
  });
}

/** Where a channel's loudspeakers hang, world coordinates. */
export function setSpeakers(id: string, at: V3[]) {
  const ch = channel(id);
  ch.want = at;
  placeSpeakers(ch);
}

/**
 * Queue an announcement on a channel (one set of platform speakers): paths under
 * public/audio, played in order, one group at a time. A newer group with the same `tag`
 * replaces one still waiting. `priority` (the departure melody and doors closing) cuts off
 * whatever is playing and goes to the front; anything else waiting plays after it.
 */
export function announce(channelId: string, tag: string, items: string[], opts: { priority?: boolean; short?: string[] } = {}) {
  if (!live() || vol.voice <= 0) return;
  const ch = channel(channelId);
  const g: Group = { tag, items, short: opts.short, at: performance.now() };
  ch.queue = ch.queue.filter((q) => q.tag !== tag);
  if (opts.priority) {
    ch.queue.unshift(g);
    if (ch.current) {
      ch.generation++;
      try {
        ch.current.stop();
      } catch {
        /* already stopped */
      }
    }
  } else ch.queue.push(g);
  for (const p of [...items, ...(opts.short ?? [])]) void load(p);
  if (!ch.busy) void pump(ch);
}

/** True when no platform channel is playing or waiting. */
export const paIdle = () => [...channels.values()].every((ch) => ch.direct || (!ch.busy && ch.queue.length === 0));

function hushChannel(ch: Channel) {
  ch.queue.length = 0;
  ch.generation++;
  try {
    ch.current?.stop();
  } catch {
    /* already stopped */
  }
}
/** Stop and forget everything on the platform PA (leaving a station, teleporting). */
export function hushVoice() {
  for (const ch of channels.values()) if (!ch.direct) hushChannel(ch);
}
/** Stop the in-car PA (getting off). */
export function hushCar() {
  const ch = channels.get(CAR);
  if (ch) hushChannel(ch);
}

async function pump(ch: Channel) {
  ch.busy = true;
  while (ch.queue.length) {
    const g = ch.queue.shift()!;
    const waited = performance.now() - g.at;
    if (waited > STALE_MS) continue;
    const gen = ch.generation;
    for (const p of waited > SHORT_AFTER_MS && g.short ? g.short : g.items) {
      const buf = await load(p);
      if (gen !== ch.generation) break;
      if (buf) await play(ch, buf, p.startsWith('voice/') ? VOICE_GAIN : 1);
      if (gen !== ch.generation) break;
      await wait(CLIP_GAP_S);
    }
    if (gen === ch.generation) await wait(GROUP_GAP_S);
  }
  ch.busy = false;
}

function play(ch: Channel, buf: AudioBuffer, gain: number): Promise<void> {
  return new Promise((resolve) => {
    const src = ctx!.createBufferSource(), g = ctx!.createGain();
    src.buffer = buf;
    g.gain.value = gain;
    src.connect(g).connect(ch.input!);
    src.onended = () => {
      if (ch.current === src) ch.current = null;
      resolve();
    };
    ch.current = src;
    src.start();
  });
}

const wait = (s: number) => new Promise<void>((r) => setTimeout(r, s * 1000));
