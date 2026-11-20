// Graphics presets and per-effect switches. Used on the main menu and in the in-game
// panel (G). Settings live in the store and apply live.

import { SEASONS, type Season } from '../render/season';
import { PRESET_ORDER, type Fx, type FxSwitch, type Preset } from '../render/graphics';
import { useUI } from './store';

const PRESET_LABEL: Record<Preset, [string, string]> = {
  low: ['低', 'Low'],
  high: ['高', 'High'],
  ultra: ['最高', 'Ultra'],
};

const PRESET_HINT: Record<Preset | 'custom', string> = {
  low: 'No effects. For slow machines, or if movement stutters.',
  high: 'Shadows, soft occlusion, glow and a film grade. Made for laptops.',
  ultra: 'Adds floor reflections, lens effects and extra detail. For a gaming GPU.',
  custom: 'Your own mix of effects.',
};

type Cost = 'light' | 'medium' | 'heavy';
const SWITCH_INFO: [FxSwitch, string, string, string, Cost][] = [
  ['shadows', '日影', 'Sun shadows', 'Shadows above ground', 'medium'],
  ['ao', '陰影', 'Ambient occlusion', 'Soft darkening where surfaces meet', 'medium'],
  ['bloom', '光のにじみ', 'Glow', 'Lights and LED boards bloom', 'light'],
  ['ssr', '床の映り込み', 'Floor reflections', 'Polished floors reflect lights and trains', 'heavy'],
  ['grade', '色調補正', 'Colour grading', 'Daylight, underground and per-line tints', 'light'],
  ['vignette', '周辺減光', 'Vignette', 'Darker frame corners', 'light'],
  ['grain', 'フィルム粒子', 'Film grain', 'Fine moving grain', 'light'],
  ['chroma', '色収差', 'Chromatic aberration', 'Colour fringes at the frame edges', 'light'],
  ['lensDirt', 'レンズの汚れ', 'Lens dirt', 'Smudges lit by bright lights (needs Glow)', 'light'],
  ['hq', '高精細', 'Extra detail', 'Sharper shadows, finer occlusion, longer reflections', 'heavy'],
];
const COST_LABEL: Record<Cost, string> = { light: 'light', medium: 'medium', heavy: 'heavy' };

const SCALES: Fx['scale'][] = [1, 1.5, 2];

export function PresetButtons() {
  const preset = useUI((s) => s.graphics.preset);
  const setPreset = useUI((s) => s.setPreset);
  return (
    <>
      {PRESET_ORDER.map((p) => (
        <button key={p} className={preset === p ? 'on' : ''} aria-pressed={preset === p} onClick={() => setPreset(p)}>
          {PRESET_LABEL[p][0]} <em>{PRESET_LABEL[p][1]}</em>
        </button>
      ))}
    </>
  );
}

export function PresetHint() {
  const preset = useUI((s) => s.graphics.preset);
  return (
    <small>
      {preset === 'custom' && <b>カスタム Custom · </b>}
      {PRESET_HINT[preset]}
    </small>
  );
}

const SEASON_LABEL: Record<Season, string> = { spring: '春 Spring', summer: '夏 Summer', autumn: '秋 Autumn', winter: '冬 Winter' };

export function EffectSwitches() {
  const fx = useUI((s) => s.graphics.fx);
  const setFx = useUI((s) => s.setFx);
  const season = useUI((s) => s.season);
  const setSeason = useUI((s) => s.setSeason);
  return (
    <div className="gfx-switches">
      {SWITCH_INFO.map(([k, ja, en, hint, cost]) => {
        const disabled = k === 'lensDirt' && !fx.bloom;
        return (
          <label key={k} className={disabled ? 'off' : ''}>
            <input type="checkbox" checked={fx[k]} disabled={disabled} onChange={(e) => setFx({ [k]: e.target.checked })} />
            <span>
              <b>{ja}</b> {en} <i className={`cost ${cost}`}>{COST_LABEL[cost]}</i>
              <small>{hint}</small>
            </span>
          </label>
        );
      })}
      <div className="gfx-scale" role="group" aria-label="Season">
        <span>
          <b>季節</b> Season <small>木の見た目だけが変わります Trees only</small>
        </span>
        {SEASONS.map((v) => (
          <button key={v} type="button" className={season === v ? 'on' : ''} onClick={() => setSeason(v)}>
            {SEASON_LABEL[v]}
          </button>
        ))}
      </div>
      <div className="gfx-scale" role="group" aria-label="Render scale">
        <span>
          <b>解像度</b> Render scale
          <small>Highest pixel ratio drawn; only matters on high-DPI screens</small>
        </span>
        <div>
          {SCALES.map((s) => (
            <button key={s} className={fx.scale === s ? 'on' : ''} aria-pressed={fx.scale === s} onClick={() => setFx({ scale: s })}>
              {s}×
            </button>
          ))}
        </div>
      </div>
      <Volume which="voice" />
      <Volume which="sfx" />
    </div>
  );
}

function Volume({ which }: { which: 'voice' | 'sfx' }) {
  const v = useUI((s) => (which === 'voice' ? s.voiceVolume : s.sfxVolume));
  const set = useUI((s) => (which === 'voice' ? s.setVoiceVolume : s.setSfxVolume));
  const [ja, en, hint] = which === 'voice'
    ? ['案内放送', 'Announcements', 'Platform voice and melodies']
    : ['効果音', 'Sound effects', 'Trains, doors and footsteps'];
  return (
    <div className="gfx-scale" role="group" aria-label={`${en} volume`}>
      <span>
        <b>{ja}</b> {en}
        <small>{hint}{v === 0 ? ' (muted)' : ''}</small>
      </span>
      <div>
        <input type="range" min={0} max={1} step={0.05} value={v} aria-label={`${en} volume`} onChange={(e) => set(Number(e.target.value))} />
      </div>
    </div>
  );
}

/** The in-game panel: no backdrop, so the view behind shows each change live. */
export function GraphicsPanel() {
  const close = useUI((s) => s.setGfxOpen);
  return (
    <div className="gfx-panel" role="dialog" aria-label="Graphics settings">
      <div className="card-title">
        画質 <em>Graphics</em>
        <button className="btn small" onClick={() => close(false)}>とじる <em>Close (G)</em></button>
      </div>
      <div className="menu-quality gfx-presets">
        <PresetButtons />
        <PresetHint />
      </div>
      <EffectSwitches />
    </div>
  );
}
