// Two-language text for menus and the HUD. The language setting decides which one is large;
// the other follows small. Signs in the 3D world are not drawn through this.

import type { ReactNode } from 'react';
import { useUI } from './store';

/** `ja` large and `en` small, or the other way round. */
export function Bi({ ja, en }: { ja: ReactNode; en: ReactNode }) {
  const lang = useUI((s) => s.lang);
  return lang === 'ja' ? <>{ja} <em>{en}</em></> : <>{en} <em>{ja}</em></>;
}

/** The pair in display order: [large, small]. */
export function usePair(ja: string, en: string): [string, string] {
  const lang = useUI((s) => s.lang);
  return lang === 'ja' ? [ja, en] : [en, ja];
}

/** The mark of the Seikai region: a low sun over the bay. */
export function RegionMark({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      <rect x="2" y="2" width="96" height="96" rx="20" fill="#f5c400" />
      <path d="M28 50 a22 22 0 0 1 44 0 Z" fill="#16191d" />
      <path d="M16 62 q8.5 -8 17 0 t17 0 t17 0 t17 0" stroke="#16191d" strokeWidth="6.5" strokeLinecap="round" fill="none" />
      <path d="M24 79 q6.5 -7 13 0 t13 0 t13 0 t13 0" stroke="#16191d" strokeWidth="6.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}
