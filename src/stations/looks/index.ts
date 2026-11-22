// One look per hero station, keyed by station id. Every other station gets the default look.

import { look as aizomecho } from './aizomecho';
import { look as daigakuMae } from './daigaku-mae';
import { defaultLook } from './default';
import { look as hoshimine } from './hoshimine';
import { look as hyotanbori } from './hyotanbori';
import { look as ikarimachi } from './ikarimachi';
import { look as kaiseicho } from './kaiseicho';
import { look as kamomehama } from './kamomehama';
import { look as kitaOdori } from './kita-odori';
import { look as kurayashiki } from './kurayashiki';
import { look as midorizaka } from './midorizaka';
import { look as minatoCenter } from './minato-center';
import { look as minamihorie } from './minamihorie';
import { look as seiryodai } from './seiryodai';
import { look as shiosaiKoen } from './shiosai-koen';
import { look as todaiDori } from './todai-dori';
import { look as tomyobori } from './tomyobori';
import { look as tsukimizaka } from './tsukimizaka';
import { look as yamabukidai } from './yamabukidai';
import { look as tsumugibashi } from './tsumugibashi';
import { look as tsurumatsu } from './tsurumatsu';
import type { StationLook } from './types';
import { withEntry } from '../entry';

const LOOKS: Record<string, StationLook> = {
  aizomecho, 'daigaku-mae': daigakuMae, hoshimine, hyotanbori, kamomehama, kurayashiki, tomyobori, tsumugibashi, tsurumatsu,
  seiryodai, 'shiosai-koen': shiosaiKoen, tsukimizaka, yamabukidai, 'minato-center': minatoCenter,
  ikarimachi, 'todai-dori': todaiDori, minamihorie, kaiseicho, midorizaka, 'kita-odori': kitaOdori,
};

const cache = new Map<string, StationLook>();

/** The station's look, with its entry area (entry.ts) layered on. */
export function lookFor(stationId: string): StationLook {
  let l = cache.get(stationId);
  if (!l) cache.set(stationId, (l = withEntry(stationId, LOOKS[stationId] ?? defaultLook)));
  return l;
}

export type { ConcInfo, ExitInfo, PassageInfo, StationLook } from './types';
