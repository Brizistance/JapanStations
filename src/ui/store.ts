// UI state. Small on purpose: the sim and player live in plain modules; this only
// tracks which screen is showing.

import { create } from 'zustand';
import { clock } from '../sim';
import { clearInput, teleport } from '../player/player';
import { setSfxVolume, setVoiceVolume } from '../audio/engine';
import { fromPreset, loadGraphics, saveGraphics, withFx, type Fx, type Graphics, type Preset } from '../render/graphics';

export const dom = { canvas: null as HTMLCanvasElement | null };

function storage(): Storage | null {
  try {
    return localStorage;
  } catch {
    return null;
  }
}

const VOICE_KEY = 'js.voiceVolume', SFX_KEY = 'js.sfxVolume';
function loadVolume(key: string): number {
  try {
    const raw = storage()?.getItem(key);
    const v = raw == null ? NaN : Number(raw);
    return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.8;
  } catch {
    return 0.8;
  }
}
function saveVolume(key: string, v: number) {
  try {
    storage()?.setItem(key, String(v));
  } catch {
    /* ignore */
  }
}
const initialVoice = loadVolume(VOICE_KEY), initialSfx = loadVolume(SFX_KEY);
setVoiceVolume(initialVoice);
setSfxVolume(initialSfx);

interface UI {
  mode: 'menu' | 'play';
  mapOpen: boolean;
  /** Mouse is captured for looking around. */
  locked: boolean;
  fast: boolean;
  graphics: Graphics;
  /** Announcement volume, 0…1. */
  voiceVolume: number;
  setVoiceVolume: (v: number) => void;
  /** Trains, doors, footsteps, 0…1. */
  sfxVolume: number;
  setSfxVolume: (v: number) => void;
  /** The in-game graphics panel (G). */
  gfxOpen: boolean;
  setPreset: (p: Preset) => void;
  setFx: (patch: Partial<Fx>) => void;
  setGfxOpen: (open: boolean) => void;
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
  graphics: loadGraphics(storage()),
  voiceVolume: initialVoice,
  setVoiceVolume: (v) => {
    setVoiceVolume(v);
    saveVolume(VOICE_KEY, v);
    set({ voiceVolume: v });
  },
  sfxVolume: initialSfx,
  setSfxVolume: (v) => {
    setSfxVolume(v);
    saveVolume(SFX_KEY, v);
    set({ sfxVolume: v });
  },
  gfxOpen: false,
  setPreset: (p) => {
    const graphics = fromPreset(p);
    saveGraphics(storage(), graphics);
    set({ graphics });
  },
  setFx: (patch) => {
    const graphics = withFx(get().graphics, patch);
    saveGraphics(storage(), graphics);
    set({ graphics });
  },
  setGfxOpen: (open) => {
    if (get().mode !== 'play') return;
    clearInput();
    if (open) document.exitPointerLock?.();
    set({ gfxOpen: open, mapOpen: open ? false : get().mapOpen });
  },
  start: (id) => {
    teleport(id);
    clearInput();
    set({ mode: 'play', mapOpen: false, gfxOpen: false });
    capturePointer();
  },
  goTo: (id) => {
    teleport(id);
    clearInput();
    set({ mode: 'play', mapOpen: false, gfxOpen: false });
    capturePointer();
  },
  setMap: (open) => {
    if (get().mode !== 'play') return;
    clearInput();
    if (open) document.exitPointerLock?.();
    set({ mapOpen: open, gfxOpen: open ? false : get().gfxOpen });
  },
  toMenu: () => {
    clearInput();
    document.exitPointerLock?.();
    clock.scale = 1;
    set({ mode: 'menu', mapOpen: false, gfxOpen: false, fast: false });
  },
  setLocked: (v) => set({ locked: v }),
  toggleFast: () => {
    const fast = !get().fast;
    clock.scale = fast ? 6 : 1;
    set({ fast });
  },
}));
