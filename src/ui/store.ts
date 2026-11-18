// UI state. Small on purpose: the sim and player live in plain modules; this only
// tracks which screen is showing.

import { create } from 'zustand';
import { clock } from '../sim';
import { clearInput, teleport } from '../player/player';

export const dom = { canvas: null as HTMLCanvasElement | null };

/** High = ambient occlusion, bloom and sun shadows. Low = none of those, for slower machines. */
export type Quality = 'high' | 'low';
const QUALITY_KEY = 'kawaminato.quality';
function savedQuality(): Quality {
  try {
    return localStorage.getItem(QUALITY_KEY) === 'low' ? 'low' : 'high';
  } catch {
    return 'high';
  }
}

interface UI {
  mode: 'menu' | 'play';
  mapOpen: boolean;
  /** Mouse is captured for looking around. */
  locked: boolean;
  fast: boolean;
  quality: Quality;
  setQuality: (q: Quality) => void;
  start: (stationId: string) => void;
  goTo: (stationId: string) => void;
  setMap: (open: boolean) => void;
  toMenu: () => void;
  setLocked: (v: boolean) => void;
  toggleFast: () => void;
}

export function capturePointer() {
  // Only works from a user gesture; failure is fine (drag-to-look still works).
  try {
    const p = dom.canvas?.requestPointerLock() as unknown;
    if (p && typeof (p as Promise<void>).catch === 'function') (p as Promise<void>).catch(() => {});
  } catch {
    /* ignore */
  }
}

export const useUI = create<UI>((set, get) => ({
  mode: 'menu',
  mapOpen: false,
  locked: false,
  fast: false,
  quality: savedQuality(),
  setQuality: (quality) => {
    try {
      localStorage.setItem(QUALITY_KEY, quality);
    } catch {
      /* private mode: the choice just will not persist */
    }
    set({ quality });
  },
  start: (id) => {
    teleport(id);
    clearInput();
    set({ mode: 'play', mapOpen: false });
    capturePointer();
  },
  goTo: (id) => {
    teleport(id);
    clearInput();
    set({ mode: 'play', mapOpen: false });
    capturePointer();
  },
  setMap: (open) => {
    if (get().mode !== 'play') return;
    clearInput();
    if (open) document.exitPointerLock?.();
    set({ mapOpen: open });
  },
  toMenu: () => {
    clearInput();
    document.exitPointerLock?.();
    clock.scale = 1;
    set({ mode: 'menu', mapOpen: false, fast: false });
  },
  setLocked: (v) => set({ locked: v }),
  toggleFast: () => {
    const fast = !get().fast;
    clock.scale = fast ? 6 : 1;
    set({ fast });
  },
}));
