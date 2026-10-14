import { defineConfig, type Plugin } from 'vite';
import { createHash, randomInt } from 'node:crypto';
import { createStore, handle, login } from './game/api';

/**
 * 개발 서버에만 붙는 게임 서버(/api/game). 저장은 메모리 — 서버를 끄면 사라진다.
 * 진짜 서버는 배포 때 정한다(README 정할 것 10). 규칙은 game/api.ts 하나라서 그대로 옮겨 붙인다.
 * 로그인은 가짜 카카오·구글(/fake-login) — 카카오·구글 화면 대신 곧장 게임 주소로 돌려보낸다(game/login.ts). 키가 없어도 흐름을 끝까지 본다.
 */
function devGameApi(): Plugin {
  const store = createStore();
  return {
    name: 'dev-game-api',
    configureServer(server) {
      server.middlewares.use('/api/game', (req, res) => {
        const url = new URL(req.url ?? '/', 'http://local');
        if (url.pathname === '/fake-login') {
          // 카카오는 ?code=, 구글은 #id_token= 으로 돌아온다 — 진짜와 같은 꼴로.
          const provider = url.searchParams.get('provider') === 'google' ? 'google' : 'kakao';
          const back = url.searchParams.get('redirect_uri') ?? '/', state = url.searchParams.get('state') ?? '';
          const proof = `fake-${provider}-tester`; // 늘 같은 사람 — 다른 브라우저에서 로그인하면 기록이 이어지는지 볼 수 있게
          res.statusCode = 302;
          res.setHeader('location', provider === 'kakao' ? `${back}?code=${proof}&state=${state}` : `${back}#id_token=${proof}&state=${state}`);
          res.end();
          return;
        }
        let raw = '';
        req.on('data', chunk => { raw += chunk; if (raw.length > 20_000) req.destroy(); });
        req.on('end', () => {
          let body: unknown = null;
          try { body = raw ? JSON.parse(raw) : null; } catch { body = null; }
          const path = new URL(req.url ?? '/', 'http://local').pathname;
          const proof = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
          const fake = String(proof.code ?? proof.idToken ?? '');
          // 가짜 확인 — 「fake-쪽-번호」 만 통과. 계정은 진짜처럼 해시로.
          const result = path === '/login' && req.method === 'POST'
            ? (/^fake-(kakao|google)-[a-z0-9]+$/.test(fake) && fake.startsWith(`fake-${proof.provider}-`)
              ? login(store, `${proof.provider}:${createHash('sha256').update(fake).digest('hex')}`, Date.now(), () => randomInt(2 ** 32) / 2 ** 32)
              : { status: 401, body: { error: 'login-failed' } })
            : handle(store, req.method ?? 'GET', path, body, Date.now());
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
