async page => {
  const base = 'http://127.0.0.1:5187';
  const results = [], errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const width of [360, 1280]) {
    await page.setViewportSize({ width, height: width === 360 ? 640 : 900 });
    await page.goto(`${base}/review/1026-editorial-v2.html?about`);
    await page.waitForSelector('body[data-preview="editorial-v2"]');
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(700);
    const layout = await page.evaluate(() => {
      const lp = document.querySelector('.lp');
      return {
        width: innerWidth, overflow: lp.scrollWidth - lp.clientWidth,
        heading: lp.querySelector('h1').textContent,
        phones: lp.querySelectorAll('.lp-phone').length,
        slots: [...lp.querySelectorAll('.lp-hero-art,.lp-feature-art')].map(el => ({
          empty: el.classList.contains('lp-empty'), ratio: getComputedStyle(el).aspectRatio,
        })),
        titles: [...lp.querySelectorAll('.lp-h2')].map(el => ({ text: el.textContent, size: getComputedStyle(el).fontSize, color: getComputedStyle(el).color })),
        why: lp.querySelector('.lp-story .lp-h3').textContent,
        unchecked: [...lp.querySelectorAll('input[type=checkbox]')].every(el => !el.checked && el.required),
      };
    });
    if (layout.overflow > 0 || layout.phones || layout.slots.some(s => !s.empty)) throw new Error(JSON.stringify(layout));
    if (new Set(layout.titles.map(t => `${t.size}-${t.color}`)).size !== 1) throw new Error('칸 제목 불일치');
    if (layout.heading !== '우리 동네 살림, 같이 들여다볼 이웃을 찾아요') throw new Error('첫 제목');
    for (const [name, selector] of [['hero', '.lp-hero'], ['intro', '.lp-intro'], ['walk', '[data-feature=walk]'], ['budget', '[data-feature=budget]'], ['cards', '[data-feature=cards]'], ['why', '.lp-why'], ['news', '.lp-news']]) {
      await page.evaluate(selector => {
        const lp = document.querySelector('.lp'), el = lp.querySelector(selector);
        lp.scrollTop += el.getBoundingClientRect().top - lp.getBoundingClientRect().top - lp.querySelector('.lp-top').offsetHeight - 20;
      }, selector);
      await page.waitForTimeout(700);
      await page.screenshot({ path: `game/review/1026-editorial-v2-${name}-${width}.png` });
    }
    layout.dock = await page.evaluate(() => {
      const lp = document.querySelector('.lp'), bar = lp.querySelector('.lp-bar');
      return { on: bar.classList.contains('on'), contentBottom: lp.getBoundingClientRect().bottom, dockTop: bar.getBoundingClientRect().top };
    });
    if (layout.dock.contentBottom > layout.dock.dockTop + 1) throw new Error('게임 단추가 내용을 덮음');
    await page.getByRole('textbox', { name: '이메일 주소' }).focus();
    if (await page.locator('.lp-bar').isVisible()) throw new Error('입력 중 단추가 떠 있음');
    results.push(layout);
  }
  // 글 두 배·태블릿·넓은 PC에서도 내용이 가로로 넘치지 않는지.
  for (const width of [320, 760, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${base}/review/1026-editorial-v2.html?about`);
    await page.waitForSelector('body[data-preview="editorial-v2"]');
    const overflow = await page.evaluate(() => {
      document.querySelectorAll('.lp h1,.lp h2,.lp h3,.lp p').forEach(el => el.style.fontSize = `${parseFloat(getComputedStyle(el).fontSize) * 2}px`);
      const lp = document.querySelector('.lp'); return lp.scrollWidth - lp.clientWidth;
    });
    if (overflow) throw new Error(`글 두 배 ${width}: ${overflow}`);
    results.push({ width, doubleTextOverflow: overflow });
  }
  if (errors.length) throw new Error(errors.join('\n'));
  return { results, errors };
}
