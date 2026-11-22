// The Seikai region: the cities and the railways between them, for the region map.
// Only Kawaminato is playable. Nothing here feeds the sim; the city's own network is `network.ts`.
//
// Geography (owner's rule): Kansai in feel only, never in layout. Kawaminato sits at the mouth of
// the Mio-gawa on the bay's east shore; Kirigahara is far up the valley on a plateau; Asanagi is
// down the coast on an inlet behind islands; Tōnomiya is across the bay, reached round its head.

import { RAIL_LINES } from './network';

export const REGION = { nameJa: '西海', nameKana: 'せいかい', nameRomaji: 'Seikai', titleJa: '西海シミュレーター', titleEn: 'Seikai Simulator' };

/** The region map's size in SVG units: the same shape as the metro route map, so one can zoom into the other. */
export const REGION_W = 1900, REGION_H = 1060;

export interface City {
  id: string;
  nameJa: string;
  nameKana: string;
  nameRomaji: string;
  /** One line on what kind of place it is. */
  characterJa: string;
  characterEn: string;
  /** Position on the region map. */
  x: number;
  y: number;
  label: 'right' | 'left' | 'above' | 'below';
  playable: boolean;
}

const ar = RAIL_LINES[0];

export const CITIES: City[] = [
  {
    id: 'kawaminato', nameJa: '川湊', nameKana: 'かわみなと', nameRomaji: 'Kawaminato',
    characterJa: '澪川の河口にひらけた、西海でいちばん大きな港町。',
    characterEn: 'The big port city at the mouth of the Mio-gawa, and the largest in Seikai.',
    x: 1040, y: 500, label: 'right', playable: true,
  },
  {
    id: 'kirigahara', nameJa: ar.beyond!.up.nameJa, nameKana: ar.beyond!.up.nameKana, nameRomaji: ar.beyond!.up.nameRomaji,
    characterJa: '澪川をさかのぼった高原の街。霧と茶畑、寺と大学。',
    characterEn: 'A cool, misty city on the plateau far up the valley: tea, temples and a university.',
    x: 1600, y: 190, label: 'above', playable: false,
  },
  {
    id: 'asanagi', nameJa: ar.beyond!.down.nameJa, nameKana: ar.beyond!.down.nameKana, nameRomaji: ar.beyond!.down.nameRomaji,
    characterJa: '島かげのおだやかな入り江にある、フェリーと造船の町。',
    characterEn: 'A ferry and shipyard town on a calm inlet behind the islands.',
    x: 930, y: 880, label: 'right', playable: false,
  },
  {
    id: 'tonomiya', nameJa: '遠宮', nameKana: 'とおのみや', nameRomaji: 'Tōnomiya',
    characterJa: '湾のむこうの半島にある、古い社の都。',
    characterEn: 'The old shrine capital on the peninsula across the bay.',
    x: 420, y: 590, label: 'left', playable: false,
  },
];

export interface RegionLine {
  id: string;
  nameJa: string;
  nameEn: string;
  /** Short name used day to day, if it has one. */
  short?: string;
  color: string;
  /** `running` has a timetable today; `planned` is named only. */
  status: 'running' | 'planned';
  cities: string[];
  /** The drawn route on the region map. */
  path: [number, number][];
}

export const REGION_LINES: RegionLine[] = [
  {
    // Name and colour come from the network data, not a copy.
    id: ar.id, nameJa: ar.nameJa, nameEn: ar.nameEn, color: ar.color, status: 'running',
    cities: ['kirigahara', 'kawaminato', 'asanagi'],
    path: [[1600, 190], [1380, 190], [1130, 440], [1040, 500], [1080, 580], [1080, 730], [930, 880]],
  },
  {
    id: 'seiden', nameJa: '西海電鉄', nameEn: 'Seikai Electric Railway', short: 'Seiden', color: '#6b2d5c', status: 'planned',
    cities: ['kawaminato', 'kirigahara'],
    path: [[1040, 500], [1300, 560], [1600, 560], [1720, 440], [1720, 310], [1600, 190]],
  },
  {
    id: 'sonagi', nameJa: '湊凪電鉄', nameEn: 'Sōnagi Electric Railway', color: '#c2571a', status: 'planned',
    cities: ['kawaminato', 'asanagi'],
    path: [[1040, 500], [1010, 600], [1010, 740], [930, 880]],
  },
  {
    id: 'enkyu', nameJa: '遠宮急行', nameEn: 'Tōnomiya Express', short: 'Enkyū', color: '#a8322d', status: 'planned',
    cities: ['kawaminato', 'tonomiya'],
    path: [[1040, 500], [960, 330], [850, 220], [640, 220], [420, 440], [420, 590]],
  },
];

export const cityById = (id: string): City => {
  const c = CITIES.find((x) => x.id === id);
  if (!c) throw new Error(`unknown city ${id}`);
  return c;
};
export const linesServing = (cityId: string): RegionLine[] => REGION_LINES.filter((l) => l.cities.includes(cityId));
/** The city you can enter today. */
export const HOME_CITY = 'kawaminato';
