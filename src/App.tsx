import { Scene } from './render/Scene';
import { Hud } from './ui/Hud';
import { MainMenu } from './ui/MainMenu';
import { useUI } from './ui/store';

export function App() {
  const mode = useUI((s) => s.mode);
  return (
    <div className="app">
      <Scene />
      {mode === 'menu' ? <MainMenu /> : <Hud />}
    </div>
  );
}
