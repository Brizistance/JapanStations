import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // GitHub Pages project site: https://brizistance.github.io/JapanStations/
  base: process.env.GITHUB_ACTIONS ? '/JapanStations/' : '/',
  plugins: [react()],
  // Only scan and watch the real app: .claude/worktrees holds whole copies of the
  // project, and scanning their index.html files made a cold dev start take ~15 s.
  optimizeDeps: { entries: ['index.html'] },
  server: { port: 5173, strictPort: false, watch: { ignored: ['**/.claude/**', '**/Plans/**'] } },
});
