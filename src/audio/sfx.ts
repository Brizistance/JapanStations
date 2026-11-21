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
  G: 'soft tubular bells and warm strings, spacious and calm',
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

// ── Inside the car: steady loops, pitched and faded live by the train's speed ──

/** Motor sound by line era: classic musical inverter whine → early IGBT → quiet modern SiC. */
export const MOTOR_OF: Record<string, string> = { Y: 'motor-classic', N: 'motor-classic', A: 'motor-mid', S: 'motor-modern', K: 'motor-modern', M: 'motor-modern', G: 'motor-modern' };
const IN_CAR = 'Recorded inside the passenger car.';

export const CAR_SFX: Sfx[] = [
  { name: 'motor-classic', seconds: 6, loop: true, prompt: `Japanese subway train GTO VVVF inverter traction motor: a loud, musical electronic whine at one steady pitch, constant, seamless loop. ${IN_CAR} No voice.` },
  { name: 'motor-mid', seconds: 6, loop: true, prompt: `Japanese commuter train IGBT VVVF inverter traction motor: a steady electronic whine with a low hum, one constant pitch, seamless loop. ${IN_CAR} No voice.` },
  { name: 'motor-modern', seconds: 6, loop: true, prompt: `Modern quiet SiC inverter traction motor of a new Japanese train: a soft smooth hum with a faint high whine, one constant pitch, seamless loop. ${IN_CAR} No voice.` },
  { name: 'roll-tunnel', seconds: 8, loop: true, prompt: `Subway train running at steady speed through a tunnel: deep roaring rumble, wheel noise echoing off tunnel walls, constant, seamless loop. ${IN_CAR} No voice.` },
  { name: 'roll-open', seconds: 8, loop: true, prompt: `Commuter train running at steady speed on elevated track in the open air: smooth rolling wheels, light wind, constant, seamless loop. ${IN_CAR} No voice.` },
  { name: 'rail-joints', seconds: 4, loop: true, prompt: `Train wheels clicking over rail joints, rhythmic ta-tan ta-tan, steady tempo, seamless loop. ${IN_CAR} No voice.` },
  { name: 'ext-roll', seconds: 8, loop: true, prompt: 'A subway train rolling along at steady speed, heard from the station platform beside the track: heavy wheel rumble, rail hiss and clatter, constant, seamless loop. No voice, no announcements.' },
  { name: 'ext-motor', seconds: 6, loop: true, prompt: 'Electric train traction motors heard from the platform as the train runs: a steady inverter whine with a low hum, one constant pitch, seamless loop. No voice.' },
  { name: 'curve-squeal', seconds: 5, loop: true, prompt: 'Steel train wheel flange squeal on a tight curve: sustained high metallic screech, seamless loop. No voice.' },
  { name: 'pass-whoosh', seconds: 3, prompt: `Another subway train passing in the opposite direction in a tunnel, heard from inside a train: a sudden loud whoosh and rumble that quickly fades. ${IN_CAR} No voice.` },
  { name: 'car-ac', seconds: 10, loop: true, prompt: `Inside a stopped Japanese commuter train: steady air-conditioning hum and ventilation fans, quiet, seamless loop. ${IN_CAR} No voice, no music.` },
  { name: 'car-creak', seconds: 8, loop: true, prompt: `Inside a moving train: soft occasional creaks and rattles of the car body, handles and fittings, quiet, seamless loop. ${IN_CAR} No voice.` },
  { name: 'car-door-open', seconds: 3, prompt: `Inside a Japanese commuter train: a short two-tone door chime, then the doors slide open with a pneumatic hiss. ${IN_CAR} No voice.` },
  { name: 'car-door-close', seconds: 3.5, prompt: `Inside a Japanese commuter train: the door-closing chime, then the doors slide shut with a soft thud. ${IN_CAR} No voice.` },
];
// ── The street's traffic (audio/traffic.ts). Until these are generated the engine makes stand-ins of the same names. ──

export const ROAD_SFX: Sfx[] = [
  { name: 'road-car', seconds: 6, loop: true, prompt: 'A small petrol car driving past at a steady 40 km/h on a dry city street, heard from the pavement: soft tyre roar and a quiet engine, constant, seamless loop. No horn, no voice, no music.' },
  { name: 'road-heavy', seconds: 6, loop: true, prompt: 'A diesel city bus driving at steady speed on a city street, heard from the pavement: low engine rumble and heavy tyre noise, constant, seamless loop. No horn, no voice.' },
  { name: 'road-scooter', seconds: 5, loop: true, prompt: 'A 50cc delivery scooter riding at steady speed on a city street, heard from the pavement: a light buzzing engine, constant pitch, seamless loop. No horn, no voice.' },
  { name: 'road-idle', seconds: 6, loop: true, prompt: 'A petrol car idling at a red light, heard from beside it: a quiet steady engine purr, constant, seamless loop. No voice, no music.' },
  { name: 'road-wet', seconds: 6, loop: true, prompt: 'Car tyres hissing on a wet road in the rain at steady speed, heard from the pavement: a constant spray and hiss, seamless loop. No engine, no voice.' },
  { name: 'bus-brake', seconds: 1.5, prompt: 'A city bus coming to a stop: one short sharp hiss of air brakes releasing. No voice.' },
  { name: 'signal-piyo', seconds: 1.2, loop: true, prompt: 'Japanese pedestrian crossing audible signal for the blind: a two-note electronic bird chirp, high then lower, clean, then a short silence, seamless loop. No voice, no traffic.' },
  { name: 'signal-kakko', seconds: 1.6, loop: true, prompt: 'Japanese pedestrian crossing audible signal for the blind: a two-note electronic cuckoo call, then a short silence, clean, seamless loop. No voice, no traffic.' },
];

export const SFX: Sfx[] = [
  ...CAR_SFX,
  ...ROAD_SFX,
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
