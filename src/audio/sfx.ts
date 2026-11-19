// Sound effects baked with the ElevenLabs sound-generation API (scripts/gen-sfx.ts) into
// public/audio/sfx/<name>.mp3. Pure list, shared by the generator and the game. Each line has
// its own approach jingle, each station its own departure melody; all original.

import { LINES, STATIONS } from '../data/network';

export interface Sfx {
  name: string;
  prompt: string;
  seconds: number;
  loop?: boolean;
}

const NO_VOICE = 'Instrumental only, no voice, no speech.';
const PA = 'Played over a Japanese station public address speaker in an underground platform.';

/** One instrument and mood per line, so each line's jingles sound like its own. */
const LINE_TONE: Record<string, string> = {
  Y: 'warm wooden marimba, gentle and nostalgic',
  N: 'bright glockenspiel with a light seaside breeze feel',
  A: 'soft vibraphone, calm and elegant',
  S: 'clean modern synth bells, crisp and airy',
  K: 'plucked koto-like strings with a soft electric piano, graceful',
  M: 'music box and celesta, delicate and sweet',
};
const tone = (id: string) => LINE_TONE[id] ?? 'clean electronic bells';

export const approachSfx = (line: string) => `approach-${line}`;
export const melodySfx = (station: string) => `melody-${station}`;

function h32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return h >>> 0;
}
/** Each station's departure melody length, 5–10 s. The closing announcement follows it. */
export const melodySeconds = (station: string) => 5 + (h32(station) % 6);

const INSTRUMENTS = [
  'glockenspiel and soft synth pad', 'marimba and pizzicato strings', 'electric piano and chimes',
  'music box and celesta', 'vibraphone and flute', 'bright synth bells and handclaps',
  'koto-like plucked strings and woodblock', 'steel drum and xylophone', 'acoustic guitar and glockenspiel',
  'harp and bells', 'chiptune square-wave lead', 'ocarina and marimba',
];
const MOODS = ['cheerful and bouncy', 'calm and gentle', 'nostalgic and warm', 'bright and hopeful', 'playful', 'elegant and flowing', 'breezy and light'];

export const STEP_COUNT = 6;

export const SFX: Sfx[] = [
  {
    name: 'chime',
    prompt: `Japanese train station attention chime: four clean electronic bell tones ascending, like a school bell, before an announcement. ${PA} ${NO_VOICE}`,
    seconds: 3,
  },
  ...LINES.flatMap((l): Sfx[] => [
    {
      name: approachSfx(l.id),
      prompt: `Short Japanese railway train-approach jingle (sekkin melody), a three to four note motif on ${tone(l.id)}. ${PA} ${NO_VOICE}`,
      seconds: 3,
    },
  ]),
  ...STATIONS.map((st): Sfx => {
    const h = h32(st.id), place = st.blurb.split(/[.:]/)[0];
    return {
      name: melodySfx(st.id),
      prompt: `Japanese railway station departure melody (hassha melody): a catchy original short tune, ${MOODS[(h >>> 8) % MOODS.length]}, on ${INSTRUMENTS[(h >>> 4) % INSTRUMENTS.length]}. The mood suits this place: ${place}. A complete phrase that ends cleanly on the tonic. Clean studio recording. ${NO_VOICE}`,
      seconds: melodySeconds(st.id),
    };
  }),
  {
    name: 'tunnel-wind',
    prompt: 'Rush of air pushed out of a subway tunnel onto an underground platform just before a train arrives: wind building from silence to a strong gust, distant low rumble growing. No voice.',
    seconds: 10,
  },
  {
    name: 'amb-platform',
    prompt: 'Underground subway platform room tone: steady ventilation hum, faint distant crowd murmur, occasional far-off footsteps, quiet and constant, seamless loop. No clear speech, no music.',
    seconds: 15,
    loop: true,
  },
  {
    name: 'amb-concourse',
    prompt: 'Busy Japanese metro station concourse ambience: crowd murmur, many footsteps on tile, occasional ticket gate beeps, air conditioning hum, constant, seamless loop. No clear speech, no music.',
    seconds: 15,
    loop: true,
  },
  {
    name: 'amb-outdoor',
    prompt: 'Elevated city railway platform outdoors in Japan: light wind, distant city traffic, a few birds, quiet and constant, seamless loop. No speech, no music.',
    seconds: 15,
    loop: true,
  },
  {
    name: 'pd-chime',
    prompt: 'Japanese platform screen door warning chime: a short repeating two-tone electronic beep from a small speaker on the door, then the glass doors start sliding. No voice.',
    seconds: 2,
  },
  {
    name: 'train-arrive',
    prompt: 'Electric subway train arriving at an underground station platform: rumble growing from the tunnel, inverter motor whine winding down, soft brake squeal, comes to a stop. Realistic field recording, no voice.',
    seconds: 9,
  },
  {
    name: 'train-depart',
    prompt: 'Electric subway train departing an underground station platform: inverter motor whine rising in pitch, wheels clacking over rail joints, accelerating away into the tunnel. Realistic field recording, no voice.',
    seconds: 9,
  },
  {
    name: 'train-idle',
    prompt: 'Stopped electric subway train idling at a platform: steady air compressor hum and ventilation fans, constant, seamless loop. No voice.',
    seconds: 6,
    loop: true,
  },
  {
    name: 'doors-open',
    prompt: 'Japanese commuter train sliding doors opening with a pneumatic hiss, together with platform screen doors sliding open, and a short two-tone door chime. No voice.',
    seconds: 2.5,
  },
  {
    name: 'doors-close',
    prompt: 'Japanese commuter train door closing chime, then sliding doors and platform screen doors closing with a pneumatic thud. No voice.',
    seconds: 3,
  },
  ...Array.from({ length: STEP_COUNT }, (_, i): Sfx => ({
    name: `step-${i + 1}`,
    prompt: `A single footstep of a sneaker on a hard tiled floor, short and dry, close up${i % 2 ? ', slightly heavier heel' : ''}. One step only, no voice.`,
    seconds: 0.5,
  })),
];
