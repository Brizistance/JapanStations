// One-off street pieces a station's spec places on its own lots (surface.ts `pieces`), like the
// small street places. Lot sizes only: no imports, so exits.ts can read them. The builders are in
// the station's street files (hyotanbori-street.ts, minamihorie-street.ts).

export type PieceId = 'kaikan' | 'yokocho' | 'takoyaki' | 'izakaya' | 'tower' | 'cafe' | 'zakka' | 'sento' | 'school' | 'bunbo' | 'park' | 'plaza' | 'ginza';
/** Frontage and depth of each piece's lot (tools/blender/build_hyotan.py, build_yokocho.py, build_horie.py, build_tsuru.py, build_kaisei.py, build_midori.py). */
export const PIECES: Record<PieceId, { w: number; d: number }> = {
  kaikan: { w: 12, d: 16 }, yokocho: { w: 18, d: 30 }, takoyaki: { w: 5, d: 4 }, izakaya: { w: 8, d: 10 },
  tower: { w: 12, d: 12 }, cafe: { w: 12, d: 12 }, zakka: { w: 8, d: 10 }, sento: { w: 14, d: 18 },
  school: { w: 40, d: 26 }, bunbo: { w: 7, d: 10 },
  park: { w: 118.4, d: 26 }, plaza: { w: 35, d: 23 }, ginza: { w: 32, d: 9 },
};
