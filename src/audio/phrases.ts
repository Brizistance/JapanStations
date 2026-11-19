// Platform announcement wording. Pure: shared by the offline generator (scripts/gen-voice.ts)
// and the game, which must agree on each clip's key. Patterns follow Japanese metro platforms:
// train info in the direction's voice (inbound female, outbound male), safety always male,
// etiquette always female. Japanese uses kana so the TTS reads invented names right.

import { LINES, STATIONS, linesAt, terminusOf } from '../data/network';
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

/**
 * Clips for one event at one platform track, in play order. `line` is the train's own line
 * (it may differ from the platform's line where a line runs on another's track).
 */
export function announcement(ev: Event, st: StationDef, line: LineDef, dir: Dir, track: number): Clip[] {
  const v = dirVoice(line, dir);
  const dest = terminusOf(line, dir);
  switch (ev) {
    case 'approach':
      return [
        ...(dest.id === st.id
          ? [clip(v, `まもなく、${track}番線に、当駅止まりの電車が参ります。`), clip(v, `A train terminating at this station will soon arrive at track ${track}.`)]
          : [clip(v, `まもなく、${track}番線に、${dest.nameKana}行きが参ります。`), clip(v, `A train bound for ${dest.nameRomaji} will soon arrive at track ${track}.`)]),
        clip('M', '危ないですから、ホームドアから離れてお待ちください。'),
        clip('M', 'For your safety, please stand back from the platform doors.'),
      ];
    case 'arrive':
      return [
        clip(v, `${track}番線は、${line.nameKana}、${dest.nameKana}行きです。`),
        clip(v, `This is a ${line.nameEn} train bound for ${dest.nameRomaji}.`),
        clip('F', '電車をご利用の際は、降りる方を先にお通しください。'),
        clip('F', 'Please let passengers off the train first.'),
      ];
    case 'closing':
      return [
        clip('M', 'ドアが閉まります。ご注意ください。'),
        clip('M', 'The doors are closing. Please stand clear.'),
        clip('M', '駆け込み乗車は危険ですので、おやめください。'),
        clip('M', 'Please do not rush onto the train.'),
      ];
    case 'terminating':
      return [
        clip(v, `${track}番線の電車は、当駅止まりです。ご乗車になれません。`),
        clip(v, `This train terminates here. Please do not board.`),
        clip('F', 'お忘れ物のないよう、ご注意ください。'),
        clip('F', 'Please make sure you have all your belongings.'),
      ];
  }
}

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
  return [...out.values()];
}
