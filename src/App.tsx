import { useEffect } from 'react';
import { Scene } from './render/Scene';
import { Hud } from './ui/Hud';
import { MainMenu } from './ui/MainMenu';
import { RegionMap } from './ui/RegionMap';
import { Settings } from './ui/Settings';
import { TitleScreen } from './ui/TitleScreen';
import { Travel } from './ui/Travel';
import { Veil } from './ui/Veil';
import { useUI } from './ui/store';

/** The splash in index.html covers the start-up build; fade it out once the app has drawn. */
function useHideSplash() {
  useEffect(() => {
    const el = document.getElementById('splash');
    if (!el) return;
    // Two frames: the first real frame is on screen before the fade starts.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.classList.add('gone');
      setTimeout(() => el.remove(), 700);
    }));
  }, []);
}

export function App() {
  useHideSplash();
  const mode = useUI((s) => s.mode);
  const settingsOpen = useUI((s) => s.settingsOpen);
  return (
    <div className="app">
      <Scene />
      <Veil />
      {mode === 'title' && <TitleScreen />}
      {mode === 'region' && <RegionMap />}
      {mode === 'menu' && <MainMenu />}
      {mode === 'play' && <Hud />}
      <Travel />
      {settingsOpen && <Settings />}
    </div>
  );
}
