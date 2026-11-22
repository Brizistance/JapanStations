// Exits whose lobby carries on through its end wall into something the station's composer builds
// (Tsumugibashi: exit 2's lobby leads on to the rotunda under the Silk Exchange, rotunda.ts).
// No imports, so kit.ts, the looks and the composers can all read it.

export interface ThroughExit {
  /** Exit number. */
  num: string;
  /** The doorway in the lobby's end wall (exit frame x, the lobby being −4 … 0), clear to cf + 2.4. */
  x0: number;
  x1: number;
  /** What the lintel sign says lies beyond. */
  ja: string;
  en: string;
}

export const THROUGH_EXITS: Record<string, ThroughExit> = {
  tsumugibashi: { num: '2', x0: -2.7, x1: -0.2, ja: '紬橋ロトンダ・絹取引所', en: 'Rotunda / Silk Exchange' },
  // Exit 1's lobby opens north onto the lift up to the station house and its café (aobadai-street.ts LIFT).
  aobadai: { num: '1', x0: -3.0, x1: -0.7, ja: 'エレベーター　駅舎・喫茶', en: 'Lift — station house, café' },
};

export const throughExit = (station: string, num: string): ThroughExit | null => {
  const t = THROUGH_EXITS[station];
  return t && t.num === num ? t : null;
};
