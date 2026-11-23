// The settings screen: graphics, sound, controls, language. One panel, opened from every menu
// and in game (G). Everything lives in the store, applies live and is saved.

import { useEffect, useState, type ReactNode } from 'react';
import { DENSITIES, PRESET_ORDER, type Fx, type FxSwitch, type Preset } from '../render/graphics';
import { Bi } from './Bi';
import { FOV_RANGE, SENS_RANGE, useUI, type SettingsTab } from './store';

const TABS: [SettingsTab, string, string][] = [
  ['graphics', '画質', 'Graphics'],
  ['sound', '音', 'Sound'],
  ['controls', '操作', 'Controls'],
  ['language', '言語', 'Language'],
];

const PRESET_LABEL: Record<Preset, [string, string]> = {
  low: ['低', 'Low'],
  high: ['高', 'High'],
  ultra: ['最高', 'Ultra'],
};
const PRESET_HINT: Record<Preset | 'custom', string> = {
  low: 'No effects. For slow machines, or if movement stutters.',
  high: 'Shadows, soft occlusion, glow and a film grade. Made for laptops.',
  ultra: 'Adds floor reflections, volumetric clouds, sun shafts, lens effects and extra detail. For a gaming GPU.',
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
  ['clouds', '立体雲', 'Volumetric clouds', 'Clouds with depth, lit by the sun (otherwise a flat sheet)', 'heavy'],
  ['godRays', '光芒', 'Sun shafts', 'Rays of light around the sun', 'medium'],
  ['traffic', '道路の交通', 'Road traffic', 'Cars, buses and scooters driving on the streets', 'light'],
];
const SCALES: Fx['scale'][] = [1, 1.5, 2];

/** A setting: its name and a hint on the left, the control on the right. */
function Row({ ja, en, hint, off, children }: { ja: string; en: string; hint?: ReactNode; off?: boolean; children: ReactNode }) {
  return (
    <div className={`set-row${off ? ' off' : ''}`} role="group" aria-label={en}>
      <span>
        <b><Bi ja={ja} en={en} /></b>
        {hint && <small>{hint}</small>}
      </span>
      <div>{children}</div>
    </div>
  );
}

function Slider({ ja, en, hint, value, min, max, step, show, onChange }: {
  ja: string; en: string; hint?: ReactNode; value: number; min: number; max: number; step: number; show: string; onChange: (v: number) => void;
}) {
  return (
    <Row ja={ja} en={en} hint={hint}>
      <input type="range" min={min} max={max} step={step} value={value} aria-label={en} onChange={(e) => onChange(Number(e.target.value))} />
      <output>{show}</output>
    </Row>
  );
}

function Check({ ja, en, hint, cost, checked, disabled, onChange }: {
  ja: string; en: string; hint?: string; cost?: Cost; checked: boolean; disabled?: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label className={`set-check${disabled ? ' off' : ''}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <b><Bi ja={ja} en={en} /></b>
        {cost && <i className={`cost ${cost}`}>{cost}</i>}
        {hint && <small>{hint}</small>}
      </span>
    </label>
  );
}

function Graphics() {
  const { preset, fx } = useUI((s) => s.graphics);
  const setPreset = useUI((s) => s.setPreset);
  const setFx = useUI((s) => s.setFx);
  return (
    <>
      <h3><Bi ja="プリセット" en="Preset" /></h3>
      <div className="sg-seg" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {PRESET_ORDER.map((p) => (
          <button key={p} className={preset === p ? 'on' : ''} aria-pressed={preset === p} onClick={() => setPreset(p)}>
            <Bi ja={PRESET_LABEL[p][0]} en={PRESET_LABEL[p][1]} />
          </button>
        ))}
      </div>
      <p className="set-hint">
        {preset === 'custom' && <b>カスタム Custom · </b>}
        {PRESET_HINT[preset]}
      </p>
      <h3><Bi ja="効果" en="Effects" /></h3>
      {SWITCH_INFO.map(([k, ja, en, hint, cost]) => (
        <Check key={k} ja={ja} en={en} hint={hint} cost={cost} checked={fx[k]} disabled={k === 'lensDirt' && !fx.bloom} onChange={(v) => setFx({ [k]: v })} />
      ))}
      <Row ja="解像度" en="Render scale" hint="Highest pixel ratio drawn; only matters on high-DPI screens">
        <div className="sg-seg tight">
          {SCALES.map((s) => (
            <button key={s} className={fx.scale === s ? 'on' : ''} aria-pressed={fx.scale === s} onClick={() => setFx({ scale: s })}>{s}×</button>
          ))}
        </div>
      </Row>
      <Row ja="交通量" en="Traffic density" hint="How many vehicles drive" off={!fx.traffic}>
        <div className="sg-seg tight">
          {DENSITIES.map((d, i) => (
            <button key={d} className={fx.density === d ? 'on' : ''} aria-pressed={fx.density === d} disabled={!fx.traffic} onClick={() => setFx({ density: d })}>
              {['Light', 'Normal', 'Busy'][i]}
            </button>
          ))}
        </div>
      </Row>
    </>
  );
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

function Sound() {
  const s = useUI();
  return (
    <>
      <h3><Bi ja="音量" en="Volume" /></h3>
      <Check ja="消音" en="Mute" hint="Silence everything without losing the levels below" checked={s.muted} onChange={s.setMuted} />
      <div className={s.muted ? 'set-dim' : ''}>
        <Slider ja="全体" en="Master" hint="Everything you hear" value={s.masterVolume} min={0} max={1} step={0.05} show={pct(s.masterVolume)} onChange={s.setMasterVolume} />
        <Slider ja="案内放送" en="Announcements" hint="Platform voice and melodies" value={s.voiceVolume} min={0} max={1} step={0.05} show={pct(s.voiceVolume)} onChange={s.setVoiceVolume} />
        <Slider ja="効果音" en="Sound effects" hint="Trains, doors, footsteps, streets" value={s.sfxVolume} min={0} max={1} step={0.05} show={pct(s.sfxVolume)} onChange={s.setSfxVolume} />
      </div>
      <p className="set-hint">Sound starts after your first click or key press: the browser asks for that.</p>
    </>
  );
}

export const KEY_ROWS: [string, string, string][] = [
  ['W A S D', '移動', 'Move'],
  ['マウス', '視点', 'Look (click the view to capture the mouse)'],
  ['Space', 'ジャンプ', 'Jump'],
  ['Shift', '走る', 'Run'],
  ['M', '路線図・駅へ移動', 'Route map / teleport'],
  ['F', '早送り', 'Fast-forward time ×6'],
  ['T', '時間を止める', 'Stop and restart the clock'],
  ['H', '画面表示を隠す', 'Hide the on-screen display'],
  ['N', '行き先を地図でえらぶ', 'Choose a destination on the map and be guided there'],
  ['Z', 'クイックメニュー (押している間)', 'Quick menu: hold, move the mouse, release'],
  ['V', '案内の表示切替', 'Guide card: list or map'],
  ['F3', 'FPS表示', 'Frames-per-second counter'],
  ['X', '案内を終了', 'End route guidance'],
  ['P', 'ミニマップの表示', 'Show or hide the mini-map'],
  ['G', '設定', 'Settings'],
  ['R', '最寄り駅に戻る', 'Respawn at nearest station'],
  ['Tab', 'マウスを自由にする', 'Free the mouse to click the display (Tab or a click on the view goes back)'],
  ['Esc', '一時停止', 'Pause, and resume'],
  ['← → / Q E', '視点 (キーボード)', 'Turn with the keyboard'],
];

function ControlsTab() {
  const s = useUI();
  return (
    <>
      <h3><Bi ja="マウスと視野" en="Mouse and view" /></h3>
      <Slider ja="マウス感度" en="Mouse sensitivity" hint="How fast the view turns" value={s.sensitivity} min={SENS_RANGE[0]} max={SENS_RANGE[1]} step={0.05} show={`${s.sensitivity.toFixed(2)}×`} onChange={s.setSensitivity} />
      <Check ja="上下反転" en="Invert Y" hint="Move the mouse up to look down" checked={s.invertY} onChange={s.setInvertY} />
      <Slider ja="視野角" en="Field of view" hint="Wider shows more, with more stretch at the edges" value={s.fov} min={FOV_RANGE[0]} max={FOV_RANGE[1]} step={1} show={`${s.fov}°`} onChange={s.setFov} />
      <h3><Bi ja="画面表示" en="On-screen display" /></h3>
      <Check ja="ミニマップ" en="Mini-map" hint="The round plan of the level you are on, in the corner while playing (P)" checked={s.planOn} onChange={s.setPlan} />
      <Check ja="FPS表示" en="FPS counter" hint="Frames per second, in the corner while playing (F3)" checked={s.fpsOn} onChange={s.setFps} />
      <h3><Bi ja="キー" en="Keys" /></h3>
      <table className="keys">
        <tbody>
          {KEY_ROWS.map(([k, ja, en]) => (
            <tr key={k}>
              <td><kbd>{k}</kbd></td>
              <td><Bi ja={ja} en={en} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="set-hint">Trains run to a timetable. Wait on the platform, board through the open doors, and ride. The map (M) lets you jump to any station.</p>
    </>
  );
}

function Language() {
  const lang = useUI((s) => s.lang);
  const setLang = useUI((s) => s.setLang);
  return (
    <>
      <h3><Bi ja="表示の順番" en="Which language is large" /></h3>
      <div className="sg-seg" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <button className={lang === 'ja' ? 'on' : ''} aria-pressed={lang === 'ja'} onClick={() => setLang('ja')}>日本語 <em>Japanese first</em></button>
        <button className={lang === 'en' ? 'on' : ''} aria-pressed={lang === 'en'} onClick={() => setLang('en')}>English <em>英語を大きく</em></button>
      </div>
      <p className="set-hint">
        Both languages always show; this chooses the large one on menus and the in-game display. Signs, departure boards and
        announcements inside the stations stay as they are, Japanese first, as in Japan.
      </p>
    </>
  );
}

/** The settings themselves, to sit inside another screen (the pause menu). `only`: one tab, without the tab bar. */
export function SettingsBody({ only }: { only?: SettingsTab }) {
  const cur = useUI((s) => s.settingsTab), setTab = useUI((s) => s.setSettingsTab);
  const tab = only ?? cur;
  return (
    <>
      {!only && (
        <nav className="sg-tabs" role="tablist">
          {TABS.map(([id, ja, en]) => (
            <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}><Bi ja={ja} en={en} /></button>
          ))}
        </nav>
      )}
      <div className="settings-body">
        {tab === 'graphics' && <Graphics />}
        {tab === 'sound' && <Sound />}
        {tab === 'controls' && <ControlsTab />}
        {tab === 'language' && <Language />}
      </div>
    </>
  );
}

export function Settings() {
  const tab = useUI((s) => s.settingsTab);
  const setTab = useUI((s) => s.setSettingsTab);
  const close = useUI((s) => s.setSettings);
  const reset = useUI((s) => s.resetSettings);
  const playing = useUI((s) => s.mode === 'play');
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.code === 'Escape' && close(false);
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [close]);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <>
      {/* In game there is no scrim: the view behind shows each change live. */}
      {!playing && <div className="settings-scrim" onClick={() => close(false)} />}
      <div className="settings" role="dialog" aria-label="Settings">
        <header>
          <div className="sg-brand-big"><Bi ja="設定" en="Settings" /></div>
          <button className="sg-btn" onClick={() => close(false)}><Bi ja="とじる" en={playing ? 'Close (G)' : 'Close'} /></button>
        </header>
        <nav className="sg-tabs" role="tablist">
          {TABS.map(([id, ja, en]) => (
            <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
              <Bi ja={ja} en={en} />
            </button>
          ))}
        </nav>
        <div className="settings-body">
          {tab === 'graphics' && <Graphics />}
          {tab === 'sound' && <Sound />}
          {tab === 'controls' && <ControlsTab />}
          {tab === 'language' && <Language />}
        </div>
        <footer>
          <button className={`sg-btn${armed ? ' warn' : ''}`} onClick={() => (armed ? (reset(), setArmed(false)) : setArmed(true))}>
            {armed ? <Bi ja="もう一度押すと初期化" en="Press again to reset everything" /> : <Bi ja="初期設定に戻す" en="Reset to defaults" />}
          </button>
          <small>Saved on this computer.</small>
        </footer>
      </div>
    </>
  );
}
