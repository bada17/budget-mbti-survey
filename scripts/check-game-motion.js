// 개발 서버 5173 + npm run build:game 뒤 preview 4173을 띄운다.
// playwright-cli open http://127.0.0.1:5173/?walk
// playwright-cli run-code --filename=scripts/check-game-motion.js
// Chrome·WebKit에서 각각 실행. 사진은 무시되는 work/motion-review/에 둔다.
// eslint-disable-next-line @typescript-eslint/no-unused-expressions -- Playwright CLI가 함수 식을 실행한다.
async page => {
  const check = (ok, message) => { if (!ok) throw new Error(message); };
  const { dev, built } = await page.evaluate(() => {
    const dev = new URL('/?walk&diag&pub', location.href), built = new URL(dev);
    built.port = '4173'; built.search = ''; return { dev: dev.href, built: built.href };
  });
  const html = await (await page.request.get(built)).text();
  const href = /<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/.exec(html)?.[1];
  check(href, '배포용 CSS를 찾을 수 없다: build 후 preview 4173 실행');
  const cssUrl = await page.evaluate(({ href, built }) => new URL(href, built).href, { href, built });
  const css = await (await page.request.get(cssUrl)).text();
  const results = [], errors = [], engine = page.context().browser().browserType().name();
  for (const [name, width, height, dpr] of [['phone', 375, 635, 3], ['tablet', 1180, 800, 2]]) {
    const context = await page.context().browser().newContext({ viewport: { width, height }, deviceScaleFactor: dpr, isMobile: true, hasTouch: true });
    try {
      const p = await context.newPage();
      p.on('pageerror', error => errors.push(String(error)));
      for (const reduced of [false, true]) {
        await p.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
        await p.goto(dev);
        await p.waitForFunction(() => window.__journey?.player && window.__village);
        const state = await p.evaluate(async ({ css, reduced }) => {
          // JavaScript는 관찰 가능한 개발판, CSS는 압축을 거친 실제 배포판을 쓴다.
          document.querySelectorAll('style[data-vite-dev-id$="/ui.css"]').forEach(node => node.remove());
          const style = document.createElement('style'); style.textContent = css; document.head.append(style);
          document.querySelector('.g-intro').hidden = true;
          const s = window.__journey, { playOutcome } = await import('/draw.ts');
          const { OUTCOMES } = await import('/outcomes.ts');
          const room = s.room, dpr = s.runtime.view().dpr;
          s.runtime.ui.door('다음 장소', { x: room.door.x, y: room.wallY - 104 });
          const door = document.querySelector('.g-door');
          const made = [];
          const render = (plan, side) => {
            const objects = playOutcome(s, plan, { spot: room.residents[side], room, dpr, reduced, seed: 'motion-check' });
            made.push(...objects); return objects;
          };
          const rain = render(OUTCOMES['C-H1'].b, 'left'), initial = rain.map(o=>o.y);
          const build = render(OUTCOMES['C-H1'].a, 'right');
          const ys = [], tops = [], start = performance.now();
          await new Promise(resolve => {
            const tick = now => {
              ys.push(rain.map(o=>o.y)); tops.push(door.getBoundingClientRect().top);
              if (now-start < 1300) requestAnimationFrame(tick); else resolve();
            };
            requestAnimationFrame(tick);
          });
          const bounds = objects => objects.map(o=>{ const b=o.getBounds();return {x:b.x,y:b.y,w:b.width,h:b.height}; });
          window.__motionCheckMade = made;
          return { reduced, current: s.reduced, village: window.__village.reduced, count: rain.length,
            moved: rain.map((o,i)=>o.y-initial[i]), intermediate: rain.map((o,i)=>ys.some(row=>row[i]>initial[i] && row[i]<o.y)),
            monotonic: ys.every((row,i)=>!i || row.every((y,j)=>y>=ys[i-1][j]-0.01)),
            doorRange: Math.max(...tops)-Math.min(...tops), animation: getComputedStyle(door).animationName,
            rainBounds: bounds(rain), buildBounds: bounds(build), diag: document.querySelector('body > pre')?.textContent?.split('\n').find(line=>line.startsWith('문 화살표')) };
        }, { css, reduced });
        check(state.count === 4, `${name}: rain 네 개`);
        check(state.monotonic, `${name}: 착지 후 튀면 안 된다`);
        check(state.moved.every(y => reduced ? y === 0 : y > 0 && y <= 48), `${name}: 짧은 낙하/축소 시 정지`);
        check(state.intermediate.every(value => value === !reduced), `${name}: 순간 이동 없이 중간 위치를 거친다`);
        check(reduced ? state.doorRange < 0.01 && state.animation === 'none' : state.doorRange > 4, `${name}: 문 화살표 일반/축소`);
        check(state.current === reduced && state.village === reduced, `${name}: 두 장면의 설정`);
        await p.screenshot({ path: `work/motion-review/${engine}-${name}-${reduced ? 'reduced' : 'normal'}.png` });
        // 편지도 같은 rain 분기를 실제로 실행한다.
        const letters = await p.evaluate(async reduced => {
          window.__motionCheckMade.forEach(o=>{ window.__journey.tweens.killTweensOf(o);o.destroy(); });
          const s=window.__journey, {playOutcome}=await import('/draw.ts'), {OUTCOMES}=await import('/outcomes.ts');
          const made=playOutcome(s,OUTCOMES['C-T2'].a,{spot:s.room.residents.left,room:s.room,dpr:s.runtime.view().dpr,reduced,seed:'letters'});
          return made.length;
        }, reduced);
        check(letters === 4, `${name}: 편지도 네 개`);
        // 새로고침 없이 설정을 뒤집는다. 예전 true를 계속 기억하는 회귀를 잡는다.
        await p.emulateMedia({ reducedMotion: reduced ? 'no-preference' : 'reduce' });
        await p.waitForFunction(expected => window.__journey.reduced === expected && window.__village.reduced === expected, !reduced);
        results.push({ device: name, ...state, livePreference: true, letters });
      }
    } finally { await context.close(); }
  }
  check(errors.length === 0, errors.join('\n'));
  return { engine, results, errors };
}
