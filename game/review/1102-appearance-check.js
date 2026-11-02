// 실행: playwright-cli open http://127.0.0.1:5173/?village
//       playwright-cli run-code --filename=game/review/1102-appearance-check.js
// 공개 자료의 사본만 읽는다. 외부 쓰기는 차단하며 쪽지는 명시적인 검토용 표본이다.
// eslint-disable-next-line @typescript-eslint/no-unused-expressions -- Playwright CLI가 함수식을 실행한다.
async page => {
  const base = 'http://127.0.0.1:5173', results = { layouts: [], errors: [], reduced: [], frames: [], source: {} };
  page.on('pageerror', e => results.errors.push(e.message));
  const copies = new Map();
  for (const url of ['https://pb.action.or.kr/', 'https://dok.action.or.kr/data/campaigns.json', 'https://dok.action.or.kr/data/awards.json']) {
    const r = await page.request.get(url); if (!r.ok()) throw new Error(`공개 사본 ${r.status()}: ${url}`);
    copies.set(url, await r.text()); results.source[url] = r.status();
  }
  await page.route('**/*', r => {
    const req = r.request(), url = req.url();
    if (req.method() !== 'GET') return r.abort();
    if (url.startsWith(base)) return r.continue();
    if (copies.has(url)) return r.fulfill({ status: 200, body: copies.get(url), contentType: url.endsWith('.json') ? 'application/json' : 'text/html', headers: { 'access-control-allow-origin': '*' } });
    return r.continue(); // 외부 창이 읽는 공개 시트·글꼴·스크립트도 허용한다. 쓰기는 위에서 차단.
  });
  const shot = async (name, width) => {
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(150);
    const layout = await page.evaluate(() => {
      const e = document.querySelector('.t-panel:not([hidden]),.g-wait') || document.querySelector('.g');
      return { overflow: e.scrollWidth - e.clientWidth, body: document.documentElement.scrollWidth - innerWidth };
    });
    if (layout.overflow || layout.body) throw new Error(`${name} ${width}: ${JSON.stringify(layout)}`);
    await page.screenshot({ path: `game/review/1102-${name}-${width}.png` });
    results.layouts.push({ name, width, ...layout });
  };
  for (const width of [360, 1280]) {
    await page.setViewportSize({ width, height: width === 360 ? 740 : 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`${base}/?village&hour=11`);
    await page.waitForFunction(() => window.__village?.player);
    await page.evaluate(() => localStorage.setItem('budget-game-village-guide-1026', '1'));
    const open = async id => {
      await page.evaluate(id => { document.querySelectorAll('.t-panel,.g-wait').forEach(e => e.remove()); window.__village.runtime.enter(id); }, id);
      await page.locator('.t-panel').waitFor();
    };
    await open('house'); await shot('house', width);
    await open('cards'); await page.waitForFunction(() => document.querySelector('.v-cut-total')?.textContent); await shot('cuts-menu', width);
    await page.locator('.v-cut-pick').focus();
    await page.keyboard.press('Enter');
    await shot('cuts-story', width);
    await page.locator('.v-cut-more summary').click(); await page.getByRole('searchbox').fill('생태탐방로');
    await page.locator('.v-cut-money').first().scrollIntoViewIfNeeded(); await shot('cuts-list', width);
    await page.getByRole('button', { name: '← 다른 이야기', exact: true }).click();
    if (!(await page.locator('.v-cut-pick').isVisible())) throw new Error('다른 이야기 왕복');
    await page.evaluate(() => localStorage.setItem('budget-game-region', JSON.stringify('4211000')));
    await open('cards'); await page.locator('.v-cut-mine').waitFor(); await shot('cuts-mine', width);
    for (const id of ['finance', 'tax']) {
      await open(id); await page.locator('.t-frame').waitFor(); await page.waitForTimeout(1600); await shot(id, width);
      results.frames.push(await page.locator('.t-frame').evaluate(e => ({ title: e.title, border: getComputedStyle(e).borderWidth, width: e.clientWidth, height: e.clientHeight })));
    }
    await page.evaluate(async () => { localStorage.removeItem('budget-game-region'); document.querySelectorAll('.t-panel').forEach(e => e.remove()); const { openLoggedIn } = await import('/town.ts'); openLoggedIn(document.querySelector('.g'), 'google', { fresh: true, unsaved: false }, () => {}); });
    await shot('login-region', width);
    await page.getByRole('button', { name: '내 동네 정하기', exact: true }).click(); await page.locator('.t-picker .t-chip').first().waitFor(); await shot('login-picker', width);
    await open('counsel'); await page.getByRole('button', { name: '전문위원에게 질문하기', exact: true }).click(); await shot('counsel-form', width);
    await page.locator('form.v-ask').evaluate(e => e.scrollIntoView({ block: 'start' })); await shot('counsel-fields', width);
    await open('dok'); await page.getByRole('button', { name: '이 감시에 참여하기', exact: true }).first().waitFor(); await shot('dok', width);
    await page.getByRole('button', { name: '이 감시에 참여하기', exact: true }).first().click(); await page.locator('.t-frame').waitFor();
    await page.frameLocator('.t-frame').locator('input[type=email]').first().waitFor({ timeout: 25000 }); await shot('dok-frame', width);
    await page.getByRole('button', { name: '← 사업 목록으로', exact: true }).click();
    if (!(await page.getByRole('button', { name: '이 감시에 참여하기', exact: true }).first().isVisible())) throw new Error('독상 목록 왕복');
    await open('works'); await page.locator('.v-ware-look:not([hidden])').first().waitFor(); await page.locator('.v-ware').first().scrollIntoViewIfNeeded(); await shot('accessories', width);
    await page.evaluate(async () => {
      document.querySelectorAll('.t-panel').forEach(e => e.remove()); const { panelShell } = await import('/town.ts'), { noteView } = await import('/places.ts');
      const { panel } = panelShell(document.querySelector('.g'), () => {}, '마을로');
      const h = document.createElement('h2'); h.textContent = '쪽지판'; const list = document.createElement('div'); list.className = 'v-notes';
      list.append(noteView({ id: 'review-only', name: '검토용 주민', pick: window.__village.runtime.pick(), at: Date.now(), text: '[검토용] 우리 동네 살림을 같이 들여다봐요. 긴 쪽지도 읽기 편한지 확인하는 화면입니다.', likes: 0 }, { like: async () => undefined, report: async () => false })); panel.append(h, list);
    });
    await shot('note', width);
    await page.evaluate(async () => {
      document.querySelectorAll('.t-panel').forEach(e => e.remove()); const { createUI } = await import('/ui.ts'); const root = document.createElement('div');
      const ui = createUI(root, { start() {}, retry() {}, sound() {}, reply() {}, goTo() {}, goDoor() {} });
      ui.wait('구글로 로그인하는 중이에요', '시민증을 가져오고 있어요. 잠깐만 기다려 주세요.'); document.querySelector('.g').append(root.querySelector('.g-wait'));
    });
    await shot('wait', width);
    results.reduced.push(await page.locator('.g-wait-dot').evaluate(e => ({ width: innerWidth, animation: getComputedStyle(e).animationName })));
    await page.goto(`${base}/?end`); await page.locator('.g-end-card').waitFor(); await page.waitForFunction(() => window.__journey?.guide);
    await shot('end-guide', width);
    await page.evaluate(() => document.querySelector('.g-end-card').hidden = true); await shot('guide', width);
    await page.goto(`${base}/?village&hour=11`); await page.waitForFunction(() => window.__village?.player);
    await page.evaluate(async () => { const { PAVILION_SEAT } = await import('/village.ts'); const s = window.__village; s.setWorks(20); s.pos = { ...PAVILION_SEAT }; s.player.place(s.pos); s.cameras.main.centerOn(s.pos.x, s.pos.y - 65); s.rest(false); });
    await shot('pavilion', width);
    await page.evaluate(async () => { const { BRIDGE_Y, POND } = await import('/village.ts'); const s = window.__village; s.pos = { x: POND.x + POND.w / 2, y: BRIDGE_Y }; s.player.sit(false); s.player.place(s.pos); s.cameras.main.centerOn(s.pos.x, s.pos.y - 40); });
    await shot('bridge', width);
  }
  // 4배 CPU 제한의 실제 장면에서 조작과 프레임. 실기기 저전력 모드를 대신하지 않는다.
  await page.setViewportSize({ width: 360, height: 740 }); await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(`${base}/?village&hour=11`); await page.waitForFunction(() => window.__village?.player);
  const cdp = await page.context().newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  results.slow = await page.evaluate(async () => {
    const s = window.__village, start = s.player.x, times = []; s.runtime.controls.target = { x: s.player.x + 90, y: s.player.y };
    await new Promise(resolve => { const tick = t => { times.push(t); if (times.length < 2 || t - times[0] < 2200) requestAnimationFrame(tick); else resolve(); }; requestAnimationFrame(tick); });
    const frames = times.slice(1).map((t, i) => t - times[i]); return { cpu: 4, fps: 1000 * frames.length / (times.at(-1) - times[0]), maxFrame: Math.max(...frames), moved: s.player.x - start };
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }); await cdp.detach();
  if (results.slow.fps < 35 || Math.abs(results.slow.moved) < 10) throw new Error(`느린 폰 ${JSON.stringify(results.slow)}`);
  if (results.errors.length || results.reduced.some(r => r.animation !== 'none')) throw new Error(JSON.stringify(results));
  return results;
}
