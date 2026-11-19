// Platform announcement wording, Osaka-metro style with Kawaminato names. Pure: shared by the
// offline generator (scripts/gen-voice.ts) and the game, which must agree on each clip's key.
// Train info is in the direction's voice (inbound female, outbound male); safety is always
// male; etiquette and general information always female. Japanese uses kana so the TTS
// reads invented names right.

import { LINES, STATIONS, linesAt, stationById, terminusOf } from '../data/network';
import type { Dir, LineDef, StationDef } from '../data/types';

export type Voice = 'F' | 'M';
export interface Clip {
  key: string;
  voice: Voice;
  text: string;
}
export type Event = 'approach' | 'arrive' | 'closing' | 'terminating';

/** FNV-1a, hex. Stable across Node and browser. */
function hash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

const clip = (voice: Voice, text: string): Clip => ({ key: `${voice}-${hash(voice + text)}`, voice, text });

export const dirVoice = (line: LineDef, dir: Dir): Voice => (dir === (line.inbound ?? 'up') ? 'F' : 'M');

/** 方面: the next interchange a train reaches on its way to the terminus, if any. */
export function viaOf(line: LineDef, st: StationDef, dir: Dir): StationDef | null {
  const i = line.stops.indexOf(st.id), step = dir === 'down' ? 1 : -1;
  for (let j = i + step; j > 0 && j < line.stops.length - 1; j += step) {
    if (linesAt(line.stops[j]).length > 1) return stationById(line.stops[j]);
  }
  return null;
}

/** Other lines to change to here, as named in announcements. */
function transfers(st: StationDef, line: LineDef): LineDef[] {
  return linesAt(st.id).filter((l) => l.id !== line.id && !l.shares && line.shares?.line !== l.id);
}

const enList = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`);

/**
 * Clips for one event at one platform track, in play order. `line` is the train's own line
 * (it may differ from the platform's line where a line runs on another's track).
 */
export function announcement(ev: Event, st: StationDef, line: LineDef, dir: Dir, track: number): Clip[] {
  const v = dirVoice(line, dir);
  const dest = terminusOf(line, dir);
  switch (ev) {
    case 'approach': {
      const ends = dest.id === st.id, via = ends ? null : viaOf(line, st, dir);
      return [
        ends
          ? clip(v, `まもなく、${track}番線に、電車が到着します。この電車は、当駅止まりです。`)
          : clip(v, `まもなく、${track}番線に、${via ? `${via.nameKana}方面、` : ''}${dest.nameKana}行きが到着します。`),
        ends
          ? clip(v, `A train terminating at this station is now arriving on track ${track}.`)
          : clip(v, `The train for ${dest.nameRomaji} is now arriving on track ${track}.`),
        clip('M', 'ホームドアから、手や顔を出したり、もたれたりしないでください。'),
        clip('M', 'Please do not lean on the platform doors.'),
      ];
    }
    case 'arrive': {
      const tx = transfers(st, line);
      return [
        clip('F', `${st.nameKana}、${st.nameKana}です。${tx.length ? `${tx.map((l) => l.nameKana).join('、')}は、お乗り換えです。` : ''}`),
        clip('F', `This is ${st.nameRomaji}.${tx.length ? ` Please transfer here for ${enList(tx.map((l) => `the ${l.nameEn}`))}.` : ''}`),
      ];
    }
    case 'closing':
      // After the departure melody; Japanese only, as on most platforms.
      return [clip('M', `${track}番線、ドアが閉まります。無理なご乗車は、おやめください。`)];
    case 'terminating':
      return [
        clip(v, `${st.nameKana}、${st.nameKana}、終点です。ご乗車、ありがとうございました。`),
        clip(v, `This is ${st.nameRomaji}, the last stop. Thank you for riding the Kawaminato Metro.`),
        clip('F', 'お忘れ物のないよう、ご注意ください。'),
        clip('F', 'Please make sure you have all your belongings.'),
      ];
  }
}

/** General notices, each preceded by the station chime. Played now and then between trains. */
export const NOTICES: Clip[][] = [
  [clip('F', '本日も、かわみなとメトロをご利用いただきまして、ありがとうございます。'), clip('F', 'Thank you for using the Kawaminato Metro.')],
  [clip('F', '電車をお待ちの際は、整列乗車にご協力ください。また、降りる方を先にお通しください。'), clip('F', 'Please line up while waiting, and let passengers off the train first.')],
  [clip('F', '駅構内での歩きスマホは、大変危険です。おやめください。'), clip('F', 'Using your smartphone while walking in the station is dangerous. Please do not do so.')],
  [clip('F', '傘などの、お忘れ物にご注意ください。'), clip('F', 'Please remember to take your umbrella and other belongings.')],
  [clip('M', 'エスカレーターをご利用の際は、手すりにおつかまりのうえ、ステップの黄色い線の内側にお立ちください。'), clip('M', 'When using the escalator, please hold the handrail and stand inside the yellow lines.')],
  [clip('M', '駅構内で、不審な物や不審な人物を見かけましたら、お近くの駅係員までお知らせください。'), clip('M', 'If you see any suspicious items or persons, please inform a station attendant.')],
];

/** Every clip the game can ask for, deduplicated. The generator bakes exactly these. */
export function allClips(): Clip[] {
  const out = new Map<string, Clip>();
  for (const st of STATIONS) {
    for (const pl of linesAt(st.id)) {
      if (!st.platforms[pl.id] || pl.shares) continue;
      const lines = [pl, ...LINES.filter((l) => l.shares?.line === pl.id && l.stops.includes(st.id))];
      for (const line of lines) {
        for (const dir of ['down', 'up'] as const) {
          const track = st.platforms[pl.id][dir === 'down' ? 0 : 1];
          const ends = terminusOf(line, dir).id === st.id;
          const evs: Event[] = ends ? ['approach', 'terminating'] : ['approach', 'arrive', 'closing'];
          for (const ev of evs) for (const c of announcement(ev, st, line, dir, track)) out.set(c.key, c);
        }
      }
    }
  }
  for (const n of NOTICES) for (const c of n) out.set(c.key, c);
  return [...out.values()];
}
