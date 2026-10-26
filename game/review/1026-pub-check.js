async page => {
  const errors = [], results = [];
  page.on('pageerror', error => errors.push(error.message));
  const enter = async () => {
    await page.waitForFunction(() => window.__journey?.hillRoom && window.__journey?.hillOpen());
    await page.evaluate(() => window.__journey.toArch());
    await page.getByRole('button', { name: '다음', exact: true }).waitFor();
    while (await page.getByRole('button', { name: '다음', exact: true }).isVisible()) {
      await page.getByRole('button', { name: '다음', exact: true }).click();
    }
    await page.getByRole('button', { name: '마을로 가기', exact: true }).click();
  };
  for (const width of [360, 1280]) {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.setViewportSize({ width, height: width === 360 ? 640 : 900 });
    await page.goto(`http://127.0.0.1:5187/?pub&end${width === 1280 ? '&hour=22' : ''}`);
    // 실제 걷기·아치 판정을 거친다. toArch는 안내 주민의 「마을로 가기」와 같은 동작.
    await enter();
    await page.waitForFunction(() => window.__village?.children?.getByName('pub-string-lights'));
    const scrollReset = await page.evaluate(() => {
      const shell = document.querySelector('.g');
      const before = shell.scrollTop;
      // Playwright가 안내 단추를 찾아 자동 스크롤한 검토용 컨테이너를 원위치로.
      shell.scrollTop = 0;
      return before;
    });
    await page.waitForTimeout(500);
    const early = await page.evaluate(() => {
      const root = window.__village.children.getByName('pub-string-lights');
      return root.list.filter(el => el.name === 'pub-bulb').map(el => el.list[2].alpha);
    });
    if (early.length !== 27 || !early.some(a => a > 0.9) || !early.some(a => a < 0.3)) throw new Error('전구가 차례로 켜지지 않음');
    await page.screenshot({ path: `game/review/1026-pub-lighting-${width}.png` });
    await page.waitForTimeout(1500);
    const lit = await page.evaluate(() => {
      const root = window.__village.children.getByName('pub-string-lights');
      const sign = root.getByName('pub-welcome');
      const title = sign.list.find(el => el.text === '이어칠하다');
      const bounds = root.getBounds(), view = window.__village.cameras.main.worldView;
      const camera = window.__village.cameras.main;
      return {
        bulbs: root.list.filter(el => el.name === 'pub-bulb').length,
        lit: root.list.filter(el => el.name === 'pub-bulb' && el.list[2].alpha > 0.99).length,
        signAlpha: sign.alpha, title: title.text, resolution: title.style.resolution,
        inside: bounds.left >= view.left && bounds.right <= view.right && bounds.top >= view.top && bounds.bottom <= view.bottom,
        welcome: document.body.innerText.includes('함께하는 시민행동 창립행사에 오신 걸 환영해요!'),
        position: { rootY: root.y, signY: sign.y, viewY: view.y, scrollY: camera.scrollY, zoom: camera.zoom },
      };
    });
    if (lit.lit !== 27 || lit.signAlpha !== 1 || !lit.inside || !lit.welcome || lit.resolution < 2) throw new Error(JSON.stringify(lit));
    await page.screenshot({ path: `game/review/1026-pub-welcome-${width}.png` });
    await page.waitForFunction(() => !window.__village.children.getByName('pub-string-lights'));
    const clean = await page.evaluate(() => window.__village.tweens.getTweens().every(t => t.targets.every(el => el.active !== false)));
    if (!clean) throw new Error('지운 그림을 겨냥한 트윈이 남음');
    results.push({ width, sequential: true, ...lit, cleaned: clean, automationScrollReset: scrollReset });
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto('http://127.0.0.1:5187/?pub&end');
  await enter();
  await page.waitForFunction(() => window.__village?.scene?.isActive());
  await page.waitForTimeout(2000);
  const reduced = await page.evaluate(() => ({
    absent: !window.__village.children.getByName('pub-string-lights'),
    welcome: document.body.innerText.includes('함께하는 시민행동 창립행사에 오신 걸 환영해요!'),
  }));
  if (!reduced.absent || !reduced.welcome || errors.length) throw new Error(JSON.stringify({ reduced, errors }));
  await page.screenshot({ path: 'game/review/1026-pub-reduced-360.png' });
  return { results, reduced, errors };
}
