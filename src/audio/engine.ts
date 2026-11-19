// Audio output. One AudioContext (unlocked on the first click or key, as browsers require).
//
//   PA (announcements, jingles) ─┐
//   trains (positional) ─────────┴→ hearing gain → muffle (low-pass) ─┬→ out
//                                                                    └→ echo (convolver) → out
//   footsteps ───────────────────────────────────────────────────────┬→ out
//                                                                    └→ echo (underground only)
//
// "Hearing" is how much of the station's sound reaches the player: full on the platform,
// quiet and muffled on stairs and concourse, none outside.

const BASE = `${import.meta.env.BASE_URL}audio/`;
const CLIP_GAP_S = 0.3, GROUP_GAP_S = 0.8;
/** An announcement still waiting after this long is out of date: drop it. */
const STALE_MS = 15000;

let ctx: AudioContext | null = null;
let paBus: GainNode, trainBus: GainNode, stepBus: GainNode, hearing: GainNode, muffle: BiquadFilterNode;
let echoSend: GainNode, stepEcho: GainNode;
const vol = { voice: 0.8, sfx: 0.8 };

function impulse(c: AudioContext, seconds: number, decay: number): AudioBuffer {
  const n = Math.floor(c.sampleRate * seconds), buf = c.createBuffer(2, n, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < n; i++) {
      const t = i / c.sampleRate;
      // A short gap, a few hard early reflections off tile, then a long diffuse tail.
      const early = t > 0.012 && t < 0.09 && Math.random() < 0.004 ? 0.8 : 0;
      d[i] = t < 0.012 ? 0 : (Math.random() * 2 - 1) * Math.exp(-t * decay) * 0.55 + early * (Math.random() < 0.5 ? -1 : 1);
    }
  }
  return buf;
}

function unlock() {
  if (!ctx) {
    const c = (ctx = new AudioContext());
    const out = c.createDynamicsCompressor();
    out.connect(c.destination);
    hearing = c.createGain();
    hearing.gain.value = 0;
    muffle = c.createBiquadFilter();
    muffle.type = 'lowpass';
    muffle.frequency.value = 18000;
    const echo = c.createConvolver();
    echo.buffer = impulse(c, 2.6, 2.6);
    const echoOut = c.createGain();
    echoOut.gain.value = 0.9;
    echo.connect(echoOut).connect(out);
    echoSend = c.createGain();
    echoSend.gain.value = 0.45;
    stepEcho = c.createGain();
    stepEcho.gain.value = 0;
    hearing.connect(muffle);
    muffle.connect(out);
    muffle.connect(echoSend).connect(echo);
    paBus = c.createGain();
    trainBus = c.createGain();
    stepBus = c.createGain();
    paBus.connect(hearing);
    trainBus.connect(hearing);
    stepBus.connect(out);
    stepBus.connect(stepEcho).connect(echo);
    applyVolume();
  }
  if (ctx.state === 'suspended') void ctx.resume();
}
if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', unlock, { capture: true });
  window.addEventListener('keydown', unlock, { capture: true });
}
const live = () => ctx !== null && ctx.state === 'running';

function applyVolume() {
  if (!ctx) return;
  paBus.gain.setTargetAtTime(vol.voice, ctx.currentTime, 0.05);
  trainBus.gain.setTargetAtTime(vol.sfx, ctx.currentTime, 0.05);
  stepBus.gain.setTargetAtTime(vol.sfx * 0.45, ctx.currentTime, 0.05);
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
      .catch(() => null); // Not generated yet: stay silent.
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
  /** Below ground: tiled echo on everything. */
  under: boolean;
}

export function tickListener(x: number, y: number, z: number, yaw: number, h: Hearing) {
  if (!live()) return;
  const c = ctx!, t = c.currentTime, L = c.listener;
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
  muffle.frequency.setTargetAtTime(h.muffled ? 900 : 18000, t, 0.25);
  echoSend.gain.setTargetAtTime(h.under ? 0.45 : 0.08, t, 0.3);
  stepEcho.gain.setTargetAtTime(h.under ? 0.35 : 0, t, 0.3);
  for (const a of attached) {
    const p = a.pos();
    if (!p) continue;
    a.panner.positionX.setValueAtTime(p[0], t);
    a.panner.positionY.setValueAtTime(p[1], t);
    a.panner.positionZ.setValueAtTime(p[2], t);
  }
}

// ── Positional sounds that follow something (a train) ──

interface Attached {
  src: AudioBufferSourceNode;
  gain: GainNode;
  panner: PannerNode;
  pos: () => [number, number, number] | null;
}
const attached = new Set<Attached>();
export interface SoundHandle {
  stop(fadeS?: number): void;
}

/** Play an effect at a moving position. Returns a handle to stop it (loops run until stopped). */
export function playAt(name: string, pos: () => [number, number, number] | null, opts: { loop?: boolean; gain?: number } = {}): SoundHandle {
  let a: Attached | null = null, stopped = false;
  if (live()) {
    void load(`sfx/${name}`).then((buf) => {
      if (!buf || stopped || !ctx) return;
      const c = ctx, p0 = pos();
      const panner = new PannerNode(c, {
        panningModel: 'HRTF', distanceModel: 'inverse', refDistance: 10, rolloffFactor: 0.9, maxDistance: 400,
        positionX: p0?.[0] ?? 0, positionY: p0?.[1] ?? 0, positionZ: p0?.[2] ?? 0,
      });
      const gain = c.createGain();
      gain.gain.value = opts.gain ?? 1;
      const src = c.createBufferSource();
      src.buffer = buf;
      src.loop = !!opts.loop;
      src.connect(gain).connect(panner).connect(trainBus);
      a = { src, gain, panner, pos };
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

// ── PA queue: announcements and jingles, one after another ──

interface Group {
  tag: string;
  items: string[];
  at: number;
}
const queue: Group[] = [];
let busy = false, generation = 0;
let current: AudioBufferSourceNode | null = null;

/**
 * Queue an announcement: paths under public/audio, played in order. A newer group from the
 * same `tag` replaces one still waiting. `preempt` cuts off whatever is playing (the
 * departure melody must start on time).
 */
export function announce(tag: string, items: string[], preempt = false) {
  if (!live() || vol.voice <= 0) return;
  if (preempt) hushVoice();
  const i = queue.findIndex((g) => g.tag === tag);
  if (i >= 0) queue.splice(i, 1);
  queue.push({ tag, items, at: performance.now() });
  for (const p of items) void load(p);
  if (!busy) void pump();
}

/** True when nothing is playing or waiting on the PA. */
export const paIdle = () => !busy && queue.length === 0;

/** Stop and forget everything on the PA (leaving a station, teleporting). */
export function hushVoice() {
  queue.length = 0;
  generation++;
  try {
    current?.stop();
  } catch {
    /* already stopped */
  }
}

async function pump() {
  busy = true;
  while (queue.length) {
    const g = queue.shift()!;
    if (performance.now() - g.at > STALE_MS) continue;
    const gen = generation;
    for (const p of g.items) {
      const buf = await load(p);
      if (gen !== generation) break;
      if (buf) await play(buf);
      if (gen !== generation) break;
      await wait(CLIP_GAP_S);
    }
    if (gen === generation) await wait(GROUP_GAP_S);
  }
  busy = false;
}

function play(buf: AudioBuffer): Promise<void> {
  return new Promise((resolve) => {
    const src = ctx!.createBufferSource();
    src.buffer = buf;
    src.connect(paBus);
    src.onended = () => {
      if (current === src) current = null;
      resolve();
    };
    current = src;
    src.start();
  });
}

const wait = (s: number) => new Promise<void>((r) => setTimeout(r, s * 1000));
