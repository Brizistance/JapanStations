import { createRoot } from 'react-dom/client';
import { App } from './App';
import { player, teleport, where } from './player/player';
import { NET, clock } from './sim';
import { STATION_WORLDS } from './stations';
import { trains } from './trains/system';
import { useUI } from './ui/store';
import './styles.css';

createRoot(document.getElementById('root')!).render(<App />);

// Debug handle for poking at the sim from the console.
if (import.meta.env.DEV) {
  Object.assign(window as unknown as Record<string, unknown>, {
    __sim: { clock, NET, trains, player, where, teleport, stations: STATION_WORLDS, ui: useUI },
  });
}
