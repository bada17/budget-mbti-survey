import { defineConfig, type Plugin } from 'vite';
import { createStore, handle } from './game/api';

/**
 * 개발 서버에만 붙는 게임 서버(/api/game). 저장은 메모리 — 서버를 끄면 사라진다.
 * 진짜 서버는 배포 때 정한다(README 정할 것 10). 규칙은 game/api.ts 하나라서 그대로 옮겨 붙인다.
 */
function devGameApi(): Plugin {
  const store = createStore();
  return {
    name: 'dev-game-api',
    configureServer(server) {
      server.middlewares.use('/api/game', (req, res) => {
        let raw = '';
        req.on('data', chunk => { raw += chunk; if (raw.length > 20_000) req.destroy(); });
        req.on('end', () => {
          let body: unknown = null;
          try { body = raw ? JSON.parse(raw) : null; } catch { body = null; }
          const path = new URL(req.url ?? '/', 'http://local').pathname;
          const result = handle(store, req.method ?? 'GET', path, body, Date.now());
          res.statusCode = result.status;
          res.setHeader('content-type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(result.body));
        });
      });
    },
  };
}

export default defineConfig({
  root: 'game', base: './',
  plugins: [devGameApi()],
  build: { outDir: '../dist-game', emptyOutDir: true, assetsInlineLimit: 0 },
  server: { host: '127.0.0.1' },
});
