// 로컬 게임을 연 뒤 playwright-cli run-code --filename=scripts/check-game-motion-preference.js
// eslint-disable-next-line @typescript-eslint/no-unused-expressions -- Playwright CLI 함수 식.
async page => {
  const { url, origin } = await page.evaluate(() => ({ url: new URL('/?walk', location.href).href, origin: location.origin }));
  const context = await page.context().browser().newContext({ viewport: { width: 375, height: 635 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  try {
    const p = await context.newPage(), errors = [];
    p.on('pageerror', e => errors.push(String(e)));
    await p.route('**/*', route => route.request().url().startsWith(origin + '/') ? route.continue() : route.abort());
    await p.goto(url);
    await p.locator('.g-intro .g-motion').click();
    if (await p.evaluate(() => document.documentElement.dataset.motion) !== 'full') throw new Error('명시적 켜기 선택이 CSS에 적용되지 않았다');
    await p.getByRole('button', { name: '출발', exact: true }).click();
    await p.getByRole('button', { name: '이 모습으로 걷기', exact: true }).click();
    await p.locator('.g-bubble').filter({ hasText: '주민 모두에게' }).click();
    await p.locator('.g-replies.typed .g-reply').nth(1).click();
    await p.locator('.g-door').waitFor({ state: 'visible' });
    const motion = await p.evaluate(async () => {
      const door = document.querySelector('.g-door'), tops = [], start = performance.now();
      await new Promise(resolve => { const tick = now => { tops.push(door.getBoundingClientRect().top); if (now-start < 1200) requestAnimationFrame(tick); else resolve(); }; requestAnimationFrame(tick); });
      return { native: matchMedia('(prefers-reduced-motion: reduce)').matches, range: Math.max(...tops)-Math.min(...tops), animation: getComputedStyle(door).animationName };
    });
    if (!motion.native || motion.range < 4 || motion.animation !== 'door-bob') throw new Error('기기 true에서도 원래 모션이 실행돼야 한다: ' + JSON.stringify(motion));
    await p.screenshot({ path: `work/motion-review/${page.context().browser().browserType().name()}-user-motion-on.png` });
    await p.reload();
    await p.locator('.g-intro .g-motion').click();
    const reset = await p.evaluate(() => ({ value: localStorage.getItem('budget-game-motion'), attr: document.documentElement.dataset.motion, animation: getComputedStyle(document.querySelector('.g-door')).animationName }));
    if (reset.value || reset.attr || reset.animation !== 'none') throw new Error('기기 설정 복귀 실패: ' + JSON.stringify(reset));
    await p.evaluate(() => localStorage.clear()); // 이 시험 전용 격리 컨텍스트.
    await p.goto(origin + '/');
    await p.getByRole('button', { name: '게임 하러 가기', exact: true }).first().click();
    await p.getByRole('button', { name: '이 모습으로 걷기', exact: true }).click();
    const hudMotion = p.locator('.g-hud .g-motion');
    await hudMotion.waitFor({ state: 'visible', timeout: 4000 });
    await hudMotion.click();
    if (await p.evaluate(() => document.documentElement.dataset.motion) !== 'full') throw new Error('소개 페이지 경유 시 모션 설정에 닿을 수 없다');
    await p.evaluate(() => localStorage.setItem('budget-game-town', JSON.stringify({ town: 'a'.repeat(15), type: '111', at: Date.now() })));
    await p.goto(origin + '/');
    await p.locator('.g[data-phase=village]').waitFor();
    await hudMotion.click();
    if (await p.evaluate(() => document.documentElement.dataset.motion) === 'full') throw new Error('재방문 마을에서도 설정을 되돌릴 수 있어야 한다');
    await p.goto(url);
    await p.emulateMedia({ reducedMotion: 'no-preference' });
    await p.waitForFunction(() => document.querySelector('.g-intro .g-motion').hidden);
    await p.emulateMedia({ reducedMotion: 'reduce' });
    await p.waitForFunction(() => !document.querySelector('.g-intro .g-motion').hidden);
    if (errors.length) throw new Error(errors.join('\n'));
    return { motion, remembered: true, reset, landingAccess: true, villageReset: true, liveControl: true, errors };
  } finally { await context.close(); }
}
