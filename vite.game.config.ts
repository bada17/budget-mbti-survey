import { defineConfig } from 'vite';

export default defineConfig({
  root: 'game', base: './',
  build: { outDir: '../dist-game', emptyOutDir: true, assetsInlineLimit: 0 },
  server: { host: '127.0.0.1' },
});
