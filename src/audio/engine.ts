// Audio output: one AudioContext (unlocked on the first click or key, as browsers require),
// a decoded-clip cache, and a voice queue that plays announcement clips one after another.

import type { Clip } from './phrases';

const VOICE_URL = `${import.meta.env.BASE_URL}audio/voice/`;
/** Pause between clips in one announcement, and between announcements. */
const CLIP_GAP_S = 0.35, GROUP_GAP_S = 0.9;
/** An announcement still waiting after this long is out of date: drop it. */
const STALE_MS = 12000;

let ctx: AudioContext | null = null;
let voiceBus: GainNode | null = null;
let voiceVolume = 0.8;

function unlock() {
  if (!ctx) {
    ctx = new AudioContext();
    voiceBus = ctx.createGain();
    voiceBus.gain.value = voiceVolume;
    voiceBus.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
}
if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', unlock, { capture: true });
  window.addEventListener('keydown', unlock, { capture: true });
}

export function setVoiceVolume(v: number) {
  voiceVolume = v;
  if (voiceBus && ctx) voiceBus.gain.setTargetAtTime(v, ctx.currentTime, 0.05);
}

const cache = new Map<string, Promise<AudioBuffer | null>>();
function load(key: string): Promise<AudioBuffer | null> {
  let p = cache.get(key);
  if (!p) {
    p = fetch(`${VOICE_URL}${key}.mp3`)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      .then((b) => ctx!.decodeAudioData(b))
      .catch(() => null); // Missing clip (not generated yet): stay silent.
    cache.set(key, p);
  }
  return p;
}

interface Group {
  tag: string;
  clips: Clip[];
  at: number;
}
const queue: Group[] = [];
let busy = false;

/**
 * Queue an announcement. `tag` names its source (a platform track); a newer announcement
 * from the same source replaces one still waiting.
 */
export function announce(tag: string, clips: Clip[]) {
  if (!ctx || ctx.state !== 'running' || voiceVolume <= 0) return;
  const i = queue.findIndex((g) => g.tag === tag);
  if (i >= 0) queue.splice(i, 1);
  queue.push({ tag, clips, at: performance.now() });
  for (const c of clips) void load(c.key);
  if (!busy) void pump();
}

/** Stop and forget everything queued (leaving a platform, teleporting). */
export function hushVoice() {
  queue.length = 0;
  generation++;
}
let generation = 0;

async function pump() {
  busy = true;
  while (queue.length) {
    const g = queue.shift()!;
    if (performance.now() - g.at > STALE_MS) continue;
    const gen = generation;
    for (const c of g.clips) {
      const buf = await load(c.key);
      if (gen !== generation) break;
      if (buf) await play(buf);
      await wait(CLIP_GAP_S);
    }
    await wait(GROUP_GAP_S);
  }
  busy = false;
}

function play(buf: AudioBuffer): Promise<void> {
  return new Promise((resolve) => {
    const src = ctx!.createBufferSource();
    src.buffer = buf;
    src.connect(voiceBus!);
    src.onended = () => resolve();
    src.start();
  });
}

const wait = (s: number) => new Promise<void>((r) => setTimeout(r, s * 1000));
