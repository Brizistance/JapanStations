// One look per hero station, keyed by station id. Every other station gets the default look.

import { look as aizomecho } from './aizomecho';
import { look as daigakuMae } from './daigaku-mae';
import { defaultLook } from './default';
import { look as hoshimine } from './hoshimine';
import { look as hyotanbori } from './hyotanbori';
import { look as kamomehama } from './kamomehama';
import { look as kurayashiki } from './kurayashiki';
import { look as tomyobori } from './tomyobori';
import { look as tsumugibashi } from './tsumugibashi';
import { look as tsurumatsu } from './tsurumatsu';
import type { StationLook } from './types';

const LOOKS: Record<string, StationLook> = {
  aizomecho, 'daigaku-mae': daigakuMae, hoshimine, hyotanbori, kamomehama, kurayashiki, tomyobori, tsumugibashi, tsurumatsu,
};

export function lookFor(stationId: string): StationLook {
  return LOOKS[stationId] ?? defaultLook;
}

export type { ConcInfo, ExitInfo, PassageInfo, StationLook } from './types';
