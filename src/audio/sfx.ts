// Sound effects baked with the ElevenLabs sound-generation API (scripts/gen-sfx.ts) into
// public/audio/sfx/<name>.mp3. Pure list, shared by the generator and the game. Every line has
// its own approach jingle and departure melody, all original.

import { LINES } from '../data/network';

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
export const departSfx = (line: string) => `depart-${line}`;
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
    {
      name: departSfx(l.id),
      prompt: `Japanese railway departure melody (hassha melody), a cheerful catchy short original tune on ${tone(l.id)}, ends cleanly on the tonic. ${PA} ${NO_VOICE}`,
      seconds: 6,
    },
  ]),
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
