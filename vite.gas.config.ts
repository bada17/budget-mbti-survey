import { defineConfig } from 'vite';

/**
 * 구글 시트 서버 묶기 — server/gas.ts(+ game/api.ts 규칙)를 앱스 스크립트가 읽는 파일 하나로.
 * 결과는 server/gas/server.js(깃에 안 넣음). 올리는 법은 README 「구글 시트 서버」.
 */
export default defineConfig({
  build: {
    lib: { entry: 'server/gas.ts', formats: ['iife'], name: 'GameServer', fileName: () => 'server.js' },
    outDir: 'server/gas', emptyOutDir: false, minify: false, target: 'es2020',
  },
});
