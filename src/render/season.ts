// The season the trees are shown in. A look only: it changes which tree models are drawn
// (tools/blender/build_trees.py makes spring, summer, autumn and winter versions), nothing else.
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter'];
export const SEASON_KEY = 'kawaminato.season';
export const season = { now: 'summer' as Season };
const SUFFIX: Record<Season, string> = { spring: 'sp', summer: 'su', autumn: 'au', winter: 'wi' };
/** The model-name suffix of the current season. */
export const seasonSuffix = () => SUFFIX[season.now];
