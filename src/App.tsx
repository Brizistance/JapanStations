import { Scene } from './render/Scene';
import { Hud } from './ui/Hud';
import { MainMenu } from './ui/MainMenu';
import { RegionMap } from './ui/RegionMap';
import { Settings } from './ui/Settings';
import { TitleScreen } from './ui/TitleScreen';
import { useUI } from './ui/store';

export function App() {
  const mode = useUI((s) => s.mode);
  const settingsOpen = useUI((s) => s.settingsOpen);
  return (
    <div className="app">
      <Scene />
      {mode === 'title' && <TitleScreen />}
      {mode === 'region' && <RegionMap />}
      {mode === 'menu' && <MainMenu />}
      {mode === 'play' && <Hud />}
      {settingsOpen && <Settings />}
    </div>
  );
}
