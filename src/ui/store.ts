// UI state. Small on purpose: the sim and player live in plain modules; this only
// tracks which screen is showing and the saved settings.

import { season, type Season } from '../render/season';
import { doyOf, monthOf, seasonOf, today, weatherOn, wrapDoy, YEAR_DAYS } from '../sim/climate';
import { create } from 'zustand';
import { clock } from '../sim';
import { clearInput, onFall } from '../player/player';
import { setMasterVolume, setMusicMuted, setMusicVolume, setMuted, setSfxVolume, setVoiceVolume } from '../audio/engine';
import { setMenuMusic, setMusicStyle, type MusicStyle } from '../audio/menuMusic';
import { WEATHERS, type Weather } from '../render/atmosphere';
import { DEFAULT_GRAPHICS, fromPreset, loadGraphics, saveGraphics, withFx, type Fx, type Graphics, type Preset } from '../render/graphics';

export const dom = { canvas: null as HTMLCanvasElement | null, camera: null as import('three').Camera | null };

function storage(): Storage | null {
  try {
    return localStorage;
  } catch {
    return null;
  }
}
function save(key: string, v: string) {
  try {
    storage()?.setItem(key, v);
  } catch {
    /* ignore */
  }
}
/** A saved number, kept inside [min, max]; `fallback` when missing or unreadable. */
function loadNumber(key: string, min: number, max: number, fallback: number): number {
  try {
    const raw = storage()?.getItem(key);
    const v = raw == null ? NaN : Number(raw);
    return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
  } catch {
    return fallback;
  }
}
function loadFlag(key: string): boolean {
  try {
    return storage()?.getItem(key) === '1';
  } catch {
    return false;
  }
}

/** Which language is the large one on menus and the HUD. Signs in the world do not change. */
export type Lang = 'ja' | 'en';
export type SettingsTab = 'graphics' | 'sound' | 'controls' | 'language';

const VOICE_KEY = 'js.voiceVolume', SFX_KEY = 'js.sfxVolume', MASTER_KEY = 'js.masterVolume', MUTE_KEY = 'js.muted', MUSIC_KEY = 'js.musicVolume', MUSIC_MUTE_KEY = 'js.musicMuted', MUSIC_STYLE_KEY = 'js.musicStyle';
const PLAN_KEY = 'js.floorPlan', FPS_KEY = 'js.fps', MAX_FPS_KEY = 'js.maxFps',GUIDE_VIEW_KEY = 'js.guideView';
const SENS_KEY = 'js.sensitivity', INVERT_KEY = 'js.invertY', FOV_KEY = 'js.fov', LANG_KEY = 'js.lang';
export const SENS_RANGE = [0.3, 2.5] as const, FOV_RANGE = [55, 100] as const;
/** What "Reset to defaults" restores. */
export const DEFAULTS = { voiceVolume: 0.8, sfxVolume: 0.8, musicVolume: 0.6, musicMuted: false, musicStyle: 'melody' as MusicStyle, masterVolume: 1, muted: false, sensitivity: 1, invertY: false, fov: 72, lang: 'ja' as Lang };

// The calendar date (day of the year, and a year count that only varies the weather), kept between visits.
const DATE_KEY = 'kawaminato.date', YEAR_KEY = 'kawaminato.year';
const initialDoy = Math.round(loadNumber(DATE_KEY, 1, YEAR_DAYS, doyOf(7, 21))), initialYear = Math.round(loadNumber(YEAR_KEY, 0, 1e6, 1));
const initialSeason: Season = seasonOf(monthOf(initialDoy));
season.now = initialSeason;

const initialVoice = loadNumber(VOICE_KEY, 0, 1, DEFAULTS.voiceVolume), initialSfx = loadNumber(SFX_KEY, 0, 1, DEFAULTS.sfxVolume);
const initialMaster = loadNumber(MASTER_KEY, 0, 1, DEFAULTS.masterVolume), initialMuted = loadFlag(MUTE_KEY);
setVoiceVolume(initialVoice);
setSfxVolume(initialSfx);
setMasterVolume(initialMaster);
setMuted(initialMuted);
const initialMusic = loadNumber(MUSIC_KEY, 0, 1, DEFAULTS.musicVolume), initialMusicMuted = loadFlag(MUSIC_MUTE_KEY);
setMusicVolume(initialMusic);
setMusicMuted(initialMusicMuted);
const initialMusicStyle: MusicStyle = (() => {
  try {
    const v = storage()?.getItem(MUSIC_STYLE_KEY);
    return v === 'traditional' || v === 'citypop' || v === 'melody' ? v : DEFAULTS.musicStyle;
  } catch {
    return DEFAULTS.musicStyle;
  }
})();
setMusicStyle(initialMusicStyle);
const initialLang: Lang = (() => {
  try {
    return storage()?.getItem(LANG_KEY) === 'en' ? 'en' : 'ja';
  } catch {
    return 'ja';
  }
})();

// The hour and weather chosen on the city menu, kept between visits.
const TIME_KEY = 'kawaminato.startTime', WEATHER_KEY = 'kawaminato.weather';
/** The weather picked on the city menu: one kind, or whatever the date brings. */
export type WeatherPick = Weather | 'auto';
function loadWeather(): WeatherPick {
  try {
    const raw = storage()?.getItem(WEATHER_KEY) as Weather | null;
    return raw && WEATHERS.includes(raw) ? raw : 'auto';
  } catch {
    return 'auto';
  }
}
const initialPick = loadWeather();
today.doy = initialDoy;
today.year = initialYear;
today.weather = initialPick === 'auto' ? weatherOn(initialDoy, initialYear) : initialPick;
/** The clock's day count when the date was last brought up to it. */
let clockDay = 0;
clock.time = (() => {
  const v = loadNumber(TIME_KEY, -1, 86400, 10 * 3600);
  return v >= 0 && v < 86400 ? v : 10 * 3600;
})();

/** `title` → `region` → `menu` (the city's own menu) → `play`. */
export type Mode = 'title' | 'region' | 'menu' | 'play';
export type Speed = 0 | 1 | 6;

interface UI {
  mode: Mode;
  /** The screen just shown was reached by the map zoom (region ⇄ city), so it plays the arriving half. */
  zoomed: boolean;
  mapOpen: boolean;
  /** Mouse is captured for looking around. */
  locked: boolean;
  /** How fast the sim clock runs while playing: stopped, real time, or fast-forward. */
  speed: Speed;
  setSpeed: (v: Speed) => void;
  /** The pause screen is up: the clock stands still and the mouse is free. */
  paused: boolean;
  /** `capture` false leaves the mouse free on resuming (the caller captures it a moment later). */
  setPaused: (v: boolean, capture?: boolean) => void;
  /** The cursor is free while the game keeps running (Tab), to click things on the screen. */
  freeMouse: boolean;
  setFreeMouse: (v: boolean) => void;
  /** The destination picker is up (N): the cursor is free and keys go to its search box. */
  pickerOpen: boolean;
  setPicker: (open: boolean) => void;
  /** A thing in a station picked on the floor plan or compass to head for: `station:key`. */
  mark: string | null;
  setMark: (m: string | null) => void;
  /** The whole in-game overlay is hidden (for a clean view). */
  hudHidden: boolean;
  toggleHud: () => void;
  /** The floor plan in the corner of the in-game screen is shown (saved). */
  planOn: boolean;
  setPlan: (v: boolean) => void;
  /** The station the in-game guide is leading to, if any. */
  guideTo: string | null;
  setGuide: (id: string | null) => void;
  graphics: Graphics;
  /** The season the trees are shown in: follows the month. */
  season: Season;
  /** The date: day of the year 1…365, and a year count that only varies the weather. */
  doy: number;
  year: number;
  /** Go to day `doy` of this year (the city menu's month picker). */
  setDate: (doy: number) => void;
  /** Move the date by whole days, into the next or the last year if need be. */
  stepDay: (days: number) => void;
  /** Called every frame: when the clock passes midnight, the date moves on. */
  syncDate: () => void;
  /** The weather picked on the city menu, and the weather it comes to today. */
  weather: WeatherPick;
  weatherNow: Weather;
  setWeather: (w: WeatherPick) => void;
  /** Set the sim clock to `sec` seconds after midnight (the city menu's time of day). Applied under the veil. */
  setTime: (sec: number) => void;
  /** Bumped when work is queued for the short cover (Veil.tsx). */
  veil: number;
  /** Everything, 0…1. */
  masterVolume: number;
  setMasterVolume: (v: number) => void;
  muted: boolean;
  setMuted: (m: boolean) => void;
  /** Announcement volume, 0…1. */
  voiceVolume: number;
  setVoiceVolume: (v: number) => void;
  /** Trains, doors, footsteps, 0…1. */
  sfxVolume: number;
  setSfxVolume: (v: number) => void;
  /** Menu music, 0…1. */
  musicVolume: number;
  setMusicVolume: (v: number) => void;
  /** Menu music off (the speaker button on the menus). */
  musicMuted: boolean;
  setMusicMuted: (m: boolean) => void;
  /** Which menu music: koto and shakuhachi, or 80s city pop (saved). */
  musicStyle: MusicStyle;
  setMusicStyle: (s: MusicStyle) => void;
  /** Mouse look speed, as a multiple of the built-in speed. */
  sensitivity: number;
  setSensitivity: (v: number) => void;
  invertY: boolean;
  setInvertY: (v: boolean) => void;
  /** Vertical field of view of the walking camera, degrees. */
  fov: number;
  setFov: (v: number) => void;
  lang: Lang;
  setLang: (l: Lang) => void;
  /** The settings screen: over any menu, and in game on G. */
  settingsOpen: boolean;
  settingsTab: SettingsTab;
  setSettings: (open: boolean, tab?: SettingsTab) => void;
  setSettingsTab: (tab: SettingsTab) => void;
  resetSettings: () => void;
  setPreset: (p: Preset) => void;
  setFx: (patch: Partial<Fx>) => void;
  toTitle: () => void;
  /** Open the region map. `zoomed` when leaving the city by the map zoom. */
  toRegion: (zoomed?: boolean) => void;
  /** Open the city menu. `zoomed` when arriving by the map zoom. */
  toCity: (zoomed?: boolean) => void;
  start: (stationId: string) => void;
  goTo: (stationId: string) => void;
  /** A teleport in progress: the screen fades to the station's name card, the player moves, it fades back (Travel.tsx). */
  travel: { id: string; seq: number } | null;
  /** Teleport behind the name-card transition. A new call mid-way replaces the destination. */
  travelTo: (stationId: string) => void;
  endTravel: (seq: number) => void;
  /** `pick`: the map is opened to choose where to be guided to; a click on a station starts guidance. */
  setMap: (open: boolean, pick?: boolean) => void;
  mapPick: boolean;
  /** A destination chosen but not yet confirmed: its route shows on the map. */
  preview: string | null;
  setPreview: (id: string | null) => void;
  /** What the guide card shows under the current step: the stops as a list, or the trip on the route diagram (saved). */
  guideView: 'list' | 'map';
  setGuideView: (v: 'list' | 'map') => void;
  /** The frames-per-second counter (saved). */
  fpsOn: boolean;
  setFps: (v: boolean) => void;
  /** Most frames drawn a second while playing (saved): 30 runs the laptop cooler. */
  maxFps: 30 | 60;
  setMaxFps: (v: 30 | 60) => void;
  /** The quick menu ring is up (Z held). */
  wheelOpen: boolean;
  setWheel: (v: boolean) => void;
  toMenu: () => void;
  setLocked: (v: boolean) => void;
  toggleFast: () => void;
  /** Stop or restart the clock without opening the pause screen. */
  toggleFreeze: () => void;
}

// The short cover (Veil.tsx) for changes that would cut visibly: work queued here runs once the
// screen is dark, or at once if it already is (dragging the time slider).
const veilQueue: (() => void)[] = [];
export const veilState = { dark: false };
/** A time picked but not applied yet: the sliders show it so they do not jump back. */
let veilTime: number | null = null;
export const shownTime = () => veilTime ?? clock.time;
export function underVeil(fn: () => void) {
  if (veilState.dark) {
    fn();
    useUI.setState({ veil: useUI.getState().veil + 1 }); // keep the cover up a little longer
    return;
  }
  veilQueue.push(fn);
  useUI.setState({ veil: useUI.getState().veil + 1 });
}
export function runVeiled() {
  for (const fn of veilQueue.splice(0)) fn();
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
  mode: 'title',
  zoomed: false,
  mapOpen: false,
  locked: false,
  speed: 1,
  setSpeed: (speed) => {
    if (!get().paused) clock.scale = speed;
    set({ speed });
  },
  paused: false,
  setPaused: (paused, capture = true) => {
    if (get().mode !== 'play') return;
    clearInput();
    clock.scale = paused ? 0 : get().speed;
    set({ paused, mapOpen: false, settingsOpen: false, freeMouse: false, pickerOpen: false, wheelOpen: false });
    if (paused) document.exitPointerLock?.();
    else if (capture) capturePointer();
  },
  freeMouse: false,
  setFreeMouse: (freeMouse) => {
    if (get().mode !== 'play') return;
    // Set first: the mouse being released must not be taken for a pause.
    set({ freeMouse });
    if (freeMouse) document.exitPointerLock?.();
    else capturePointer();
  },
  pickerOpen: false,
  setPicker: (pickerOpen) => {
    if (get().mode !== 'play' || get().paused) return;
    clearInput();
    // Set first: the mouse being released must not be taken for a pause.
    set({ pickerOpen, mapOpen: false, settingsOpen: false, freeMouse: false, wheelOpen: false });
    if (pickerOpen) document.exitPointerLock?.();
    else capturePointer();
  },
  mark: null,
  setMark: (mark) => set({ mark }),
  hudHidden: false,
  toggleHud: () => set({ hudHidden: !get().hudHidden }),
  planOn: storage()?.getItem(PLAN_KEY) !== '0',
  setPlan: (planOn) => {
    save(PLAN_KEY, planOn ? '1' : '0');
    set({ planOn });
  },
  guideTo: null,
  setGuide: (guideTo) => set({ guideTo }),
  graphics: loadGraphics(storage()),
  season: initialSeason,
  doy: initialDoy,
  year: initialYear,
  setDate: (doy) => get().stepDay(wrapDoy(doy) - get().doy),
  stepDay: (days) => {
    const n = get().doy - 1 + Math.round(days);
    const doy = wrapDoy(n + 1), year = Math.max(0, get().year + Math.floor(n / YEAR_DAYS));
    const apply = () => {
      const pick = get().weather, weatherNow = pick === 'auto' ? weatherOn(doy, year) : pick;
      Object.assign(today, { doy, year, weather: weatherNow });
      season.now = seasonOf(monthOf(doy));
      save(DATE_KEY, String(doy));
      save(YEAR_KEY, String(year));
      set({ doy, year, weatherNow, season: season.now });
    };
    // A new season rebuilds the stations' trees: done under the cover, which hides the stall and the pop.
    if (seasonOf(monthOf(doy)) !== season.now) underVeil(apply);
    else apply();
  },
  syncDate: () => {
    const d = Math.floor(clock.time / 86400);
    if (d > clockDay) get().stepDay(d - clockDay);
    clockDay = d;
  },
  weather: initialPick,
  weatherNow: today.weather,
  setWeather: (weather) => {
    save(WEATHER_KEY, weather);
    today.weather = weather === 'auto' ? weatherOn(get().doy, get().year) : weather;
    set({ weather, weatherNow: today.weather });
  },
  setTime: (sec) => {
    const t = ((sec % 86400) + 86400) % 86400;
    // The trains jump to the timetable at the new time: done under the cover. The sky eases on its own.
    veilTime = t;
    underVeil(() => {
      clockDay = 0;
      clock.time = t;
      if (veilTime === t) veilTime = null;
      save(TIME_KEY, String(clock.time));
    });
  },
  veil: 0,
  masterVolume: initialMaster,
  setMasterVolume: (v) => {
    setMasterVolume(v);
    save(MASTER_KEY, String(v));
    set({ masterVolume: v });
  },
  muted: initialMuted,
  setMuted: (m) => {
    setMuted(m);
    save(MUTE_KEY, m ? '1' : '0');
    set({ muted: m });
  },
  voiceVolume: initialVoice,
  setVoiceVolume: (v) => {
    setVoiceVolume(v);
    save(VOICE_KEY, String(v));
    set({ voiceVolume: v });
  },
  sfxVolume: initialSfx,
  setSfxVolume: (v) => {
    setSfxVolume(v);
    save(SFX_KEY, String(v));
    set({ sfxVolume: v });
  },
  musicVolume: initialMusic,
  setMusicVolume: (v) => {
    setMusicVolume(v);
    save(MUSIC_KEY, String(v));
    set({ musicVolume: v });
  },
  musicMuted: initialMusicMuted,
  setMusicMuted: (m) => {
    setMusicMuted(m);
    save(MUSIC_MUTE_KEY, m ? '1' : '0');
    set({ musicMuted: m });
  },
  musicStyle: initialMusicStyle,
  setMusicStyle: (st) => {
    setMusicStyle(st);
    save(MUSIC_STYLE_KEY, st);
    set({ musicStyle: st });
  },
  sensitivity: loadNumber(SENS_KEY, SENS_RANGE[0], SENS_RANGE[1], DEFAULTS.sensitivity),
  setSensitivity: (v) => {
    save(SENS_KEY, String(v));
    set({ sensitivity: v });
  },
  invertY: loadFlag(INVERT_KEY),
  setInvertY: (v) => {
    save(INVERT_KEY, v ? '1' : '0');
    set({ invertY: v });
  },
  fov: loadNumber(FOV_KEY, FOV_RANGE[0], FOV_RANGE[1], DEFAULTS.fov),
  setFov: (v) => {
    save(FOV_KEY, String(v));
    set({ fov: v });
  },
  lang: initialLang,
  setLang: (lang) => {
    save(LANG_KEY, lang);
    set({ lang });
  },
  settingsOpen: false,
  settingsTab: 'graphics',
  setSettings: (open, tab) => {
    if (get().mode === 'play') {
      clearInput();
      if (open) document.exitPointerLock?.();
    }
    if (get().mode === 'play') clock.scale = get().speed;
    set({ settingsOpen: open, settingsTab: tab ?? get().settingsTab, mapOpen: open ? false : get().mapOpen, paused: false });
  },
  setSettingsTab: (settingsTab) => set({ settingsTab }),
  resetSettings: () => {
    const s = get();
    s.setMasterVolume(DEFAULTS.masterVolume);
    s.setMuted(DEFAULTS.muted);
    s.setVoiceVolume(DEFAULTS.voiceVolume);
    s.setSfxVolume(DEFAULTS.sfxVolume);
    s.setMusicVolume(DEFAULTS.musicVolume);
    s.setMusicMuted(DEFAULTS.musicMuted);
    s.setMusicStyle(DEFAULTS.musicStyle);
    s.setSensitivity(DEFAULTS.sensitivity);
    s.setInvertY(DEFAULTS.invertY);
    s.setFov(DEFAULTS.fov);
    s.setLang(DEFAULTS.lang);
    const graphics: Graphics = { preset: DEFAULT_GRAPHICS.preset, fx: { ...DEFAULT_GRAPHICS.fx } };
    saveGraphics(storage(), graphics);
    set({ graphics });
  },
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
  toTitle: () => set({ mode: 'title', zoomed: false, settingsOpen: false }),
  toRegion: (zoomed = false) => set({ mode: 'region', zoomed, settingsOpen: false }),
  toCity: (zoomed = false) => set({ mode: 'menu', zoomed, settingsOpen: false }),
  start: (id) => get().goTo(id),
  goTo: (id) => {
    // Pointer lock needs the click, so it is taken now. From a menu, the menu stays up under the
    // fade and play mode starts once the cover is dark (Travel.tsx), so nothing pops in.
    clearInput();
    clock.scale = get().speed;
    set({ mapOpen: false, settingsOpen: false, paused: false });
    capturePointer();
    get().travelTo(id);
  },
  travel: null,
  travelTo: (id) => {
    const t = get().travel;
    if (t?.id === id) return;
    set({ travel: { id, seq: (t?.seq ?? 0) + 1 } });
  },
  endTravel: (seq) => {
    if (get().travel?.seq === seq) set({ travel: null });
  },
  setMap: (open, pick = false) => {
    if (get().mode !== 'play') return;
    clearInput();
    clock.scale = get().speed;
    set({ mapOpen: open, mapPick: open && pick, preview: open ? get().preview : null, settingsOpen: open ? false : get().settingsOpen, paused: false, pickerOpen: false, freeMouse: false, wheelOpen: false });
    if (open) document.exitPointerLock?.();
  },
  mapPick: false,
  preview: null,
  setPreview: (id) => {
    if (id) get().setMap(true, true);
    set({ preview: id });
  },
  guideView: storage()?.getItem(GUIDE_VIEW_KEY) === 'map' ? 'map' : 'list',
  setGuideView: (guideView) => {
    save(GUIDE_VIEW_KEY, guideView);
    set({ guideView });
  },
  fpsOn: loadFlag(FPS_KEY),
  setFps: (fpsOn) => {
    save(FPS_KEY, fpsOn ? '1' : '0');
    set({ fpsOn });
  },
  maxFps: loadNumber(MAX_FPS_KEY, 30, 60, 60) < 45 ? 30 : 60,
  setMaxFps: (maxFps) => {
    save(MAX_FPS_KEY, String(maxFps));
    set({ maxFps });
  },
  wheelOpen: false,
  setWheel: (wheelOpen) => set({ wheelOpen }),
  toMenu: () => {
    clearInput();
    document.exitPointerLock?.();
    clock.scale = 1;
    set({ mode: 'menu', zoomed: false, mapOpen: false, settingsOpen: false, speed: 1, paused: false, guideTo: null, preview: null, freeMouse: false, mark: null, pickerOpen: false, wheelOpen: false });
  },
  setLocked: (v) => set({ locked: v }),
  toggleFast: () => get().setSpeed(get().speed === 6 ? 1 : 6),
  toggleFreeze: () => get().setSpeed(get().speed === 0 ? 1 : 0),
}));

onFall.go = (id) => useUI.getState().travelTo(id);

// Menu music plays on every screen but the 3D world.
setMenuMusic(useUI.getState().mode !== 'play');
useUI.subscribe((st) => setMenuMusic(st.mode !== 'play'));
