// Platform announcement wording, Osaka-metro style with Kawaminato names. Pure: shared by the
// offline generator (scripts/gen-voice.ts) and the game, which must agree on each clip's key.
// Train info is in the direction's voice (inbound female, outbound male); safety is always
// male; etiquette and general information always female. Japanese uses kana so the TTS
// reads invented names right.

import { LINES, STATIONS, linesAt, stationById, terminusOf } from '../data/network';
import type { Dir, LineDef, StationDef } from '../data/types';

/** F/M: platform voices (inbound/outbound, etiquette/safety). C: the in-car voice. */
export type Voice = 'F' | 'M' | 'C';
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
        clip(v, `${st.nameKana}、${st.nameKana}です。${tx.length ? `${tx.map((l) => l.nameKana).join('、')}は、お乗り換えです。` : ''}`),
        clip(v, `This is ${st.nameRomaji}.${tx.length ? ` Please transfer here for ${enList(tx.map((l) => `the ${l.nameEn}`))}.` : ''}`),
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

/** Spoken by the platform doors themselves, from the door nearest you. */
export const PLATFORM_DOOR: Clip[] = [clip('F', 'ホームドアが閉まります。ご注意ください。'), clip('F', 'The platform doors are closing.')];

// ── In the car (Tokyo/Osaka Metro style: Japanese first, then English with the station number) ──

export type CarEvent = 'next' | 'soon';
export type DoorSide = 'left' | 'right';

/**
 * The in-car announcement for the run to `stop` (index on `line`) heading `dir`.
 * 'next' (just after departure): greeting and where this train is bound.
 * 'soon' (before the stop), JR/Metro style: 「次は、〇〇、〇〇。お出口は、左側です。〇〇線は、お乗り換えです。」
 */
export function carAnnouncement(ev: CarEvent, line: LineDef, dir: Dir, stop: number, side: DoorSide): Clip[] {
  const st = stationById(line.stops[stop]), dest = terminusOf(line, dir);
  const last = dest.id === st.id, tx = transfers(st, line), no = st.numbers[line.id];
  if (ev === 'next') {
    return [
      clip('C', `本日も、かわみなとメトロをご利用いただきまして、ありがとうございます。この電車は、${line.nameKana}、${dest.nameKana}行きです。`),
      clip('C', `This is the ${line.nameEn} train bound for ${dest.nameRomaji}.`),
    ];
  }
  const out: Clip[] = [
    clip('C', `次は、${last ? '終点、' : ''}${st.nameKana}、${st.nameKana}。お出口は、${side === 'left' ? '左側' : '右側'}です。`),
  ];
  if (tx.length) out.push(clip('C', `${tx.map((l) => l.nameKana).join('、')}は、お乗り換えです。`));
  if (last) out.push(clip('C', 'お忘れ物のないよう、ご注意ください。'));
  out.push(clip('C', `The next station is ${st.nameRomaji}, ${no}${last ? ', the last stop' : ''}. The doors on the ${side} side will open.`));
  if (tx.length) out.push(clip('C', `Please change here for ${enList(tx.map((l) => `the ${l.nameEn}`))}.`));
  if (last) out.push(clip('C', 'Please make sure you have all your belongings.'));
  return out;
}

export const CAR_DOORS_CLOSING: Clip[] = [clip('C', 'ドアが閉まります。ご注意ください。')];

/** Manners and safety, one now and then on longer runs. */
export const CAR_NOTICES: Clip[][] = [
  [clip('C', '優先席付近では、混雑時には、携帯電話の電源をお切りください。それ以外の場所では、マナーモードに設定のうえ、通話はご遠慮ください。'), clip('C', 'Please set your mobile phone to silent mode and refrain from talking on the phone.')],
  [clip('C', '電車が揺れることがありますので、つり革や手すりに、おつかまりください。'), clip('C', 'Please hold on to a strap or handrail, as the train may sway.')],
  [clip('C', '車内で不審な物や、不審な人物を見かけましたら、お近くの係員か、非常通報装置でお知らせください。'), clip('C', 'If you notice any suspicious items or persons, please notify the station staff or use the emergency intercom.')],
  [clip('C', 'リュックなどの大きな荷物は、前に抱えるか、網棚に置いて、周りのお客様のご迷惑にならないよう、ご協力ください。'), clip('C', 'Please hold large bags in front of you or place them on the rack.')],
];

/** Door side (relative to the direction of travel) a train on `line` heading `dir` opens at. */
export function doorSideOf(line: LineDef, _dir: Dir): DoorSide {
  // Left-hand running: the down track is left of increasing chainage. Side platforms are
  // outside the tracks (doors on the left); an island is between them (doors on the right).
  return line.platformType === 'island' ? 'right' : 'left';
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
  for (const n of [...NOTICES, ...CAR_NOTICES, PLATFORM_DOOR, CAR_DOORS_CLOSING]) for (const c of n) out.set(c.key, c);
  for (const line of LINES) {
    for (const dir of ['down', 'up'] as const) {
      const step = dir === 'down' ? 1 : -1, first = dir === 'down' ? 1 : line.stops.length - 2;
      for (let i = first; i >= 0 && i < line.stops.length; i += step) {
        for (const ev of ['next', 'soon'] as const) for (const c of carAnnouncement(ev, line, dir, i, doorSideOf(line, dir))) out.set(c.key, c);
      }
    }
  }
  return [...out.values()];
}
