import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { relative } from 'node:path';

export default defineConfig({
  // GitHub Pages project site: https://brizistance.github.io/JapanStations/
  base: process.env.GITHUB_ACTIONS ? '/JapanStations/' : '/',
  plugins: [react()],
  // Only scan and watch the real app: .claude/worktrees holds whole copies of the
  // project, and scanning their index.html files made a cold dev start take ~15 s.
  optimizeDeps: { entries: ['index.html'] },
  // (Relative to this project, so a worktree under .claude/worktrees still watches its own files.)
  server: { port: 5173, strictPort: false, watch: { ignored: (p: string) => /^(\.claude|Plans)([\\/]|$)/.test(relative(__dirname, p)) } },
});
