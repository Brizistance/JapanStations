import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // GitHub Pages project site: https://brizistance.github.io/JapanStations/
  base: process.env.GITHUB_ACTIONS ? '/JapanStations/' : '/',
  plugins: [react()],
  server: { port: 5173, strictPort: false },
});
