// 실행: playwright-cli open http://127.0.0.1:5178/?walk
//       playwright-cli run-code --filename=scripts/check-game-dresser.js
// eslint-disable-next-line @typescript-eslint/no-unused-expressions -- Playwright CLI가 이 함수 식을 읽는다.
async page => {
  const url = await page.evaluate(() => new URL('/?walk', location.href).href);
  const pick = [0, 0, 0, 0, 0, 0, 0, 0, 0, 14];
  const check = (ok, message) => { if (!ok) throw new Error(message); };
  const open = async target => {
    await target.goto(url);
    await target.evaluate(pick => { localStorage.clear(); localStorage.setItem('budget-game-me', JSON.stringify({ name: '', pick })); }, pick);
    await target.reload();
    await target.getByRole('button', { name: '출발', exact: true }).click();
    await target.locator('.g-tab').filter({ hasText: /^옷$/ }).click();
  };
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page);
  const row = page.locator('.g-row-scroll').filter({ has: page.locator('[data-row="6"]') });
  const previous = page.getByRole('button', { name: '옷 이전 보기', exact: true });
  const next = page.getByRole('button', { name: '옷 다음 보기', exact: true });
  await next.waitFor({ state: 'visible' });
  check(await next.isVisible() && await next.isEnabled(), 'PC: 다음 버튼이 보여야 한다');
  check(await previous.isDisabled(), 'PC: 처음에는 이전 버튼 비활성');
  check(!await page.getByRole('button', { name: '옷 색 다음 보기', exact: true }).isVisible(), 'PC: 넘치지 않는 색 줄은 버튼 숨김');
  await next.click();
  await page.waitForFunction(() => { const row = document.querySelector('[data-row="6"]').parentElement; return row.scrollLeft >= row.scrollWidth - row.clientWidth - 1 && document.querySelector('[aria-label="옷 다음 보기"]').disabled; });
  check(await next.isDisabled() && await previous.isEnabled(), 'PC: 끝에서 다음 비활성');
  check(await row.locator('.on').textContent() === '가디건', '넘기기는 옷 선택을 바꾸지 않는다');
  await previous.focus();
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelector('[data-row="6"]').parentElement.scrollLeft <= 1 && document.querySelector('[aria-label="옷 이전 보기"]').disabled);
  check(await previous.isDisabled(), '키보드로 처음까지 돌아온다');
  await next.click();
  await row.getByRole('button', { name: '니트', exact: true }).click();
  const heights = [];
  for (const tab of ['얼굴', '머리', '옷']) {
    await page.locator('.g-tab').filter({ hasText: new RegExp(`^${tab}$`) }).click();
    heights.push(await page.locator('.g-sheet').evaluate(el => el.getBoundingClientRect().height));
  }
  check(new Set(heights).size === 1, '탭마다 판 높이가 같아야 한다');
  await page.screenshot({ path: 'game/review/dresser-desktop-navigation-1280.png', animations: 'disabled' });
  await page.setViewportSize({ width: 360, height: 640 });
  await page.getByRole('button', { name: '옷 색 다음 보기', exact: true }).waitFor({ state: 'visible' });
  check(await page.evaluate(() => document.documentElement.scrollWidth === innerWidth), '좁은 PC 창에서 가로 넘침 없음');
  await page.getByRole('button', { name: '이 모습으로 걷기', exact: true }).click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('budget-game-me')).pick);
  check(JSON.stringify(saved) === JSON.stringify(pick.map((n, i) => i === 6 ? 8 : n)), '옷 선택만 저장되어야 한다');

  const context = await page.context().browser().newContext({ viewport: { width: 360, height: 640 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  try {
    const mobile = await context.newPage();
    mobile.on('pageerror', error => errors.push(String(error)));
    await open(mobile);
    check(await mobile.locator('.g-row-nav:visible').count() === 0, '폰에서는 넘기기 버튼 숨김');
    const mobileRow = mobile.locator('.g-row-scroll').filter({ has: mobile.locator('[data-row="6"]') });
    const box = await mobileRow.boundingBox();
    const cdp = await context.newCDPSession(mobile);
    const startX = box.x + box.width * 0.8, y = box.y + box.height / 2;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: startX, y }] });
    for (let i = 1; i <= 10; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: startX - i * 18, y }] });
      await mobile.waitForTimeout(20);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await mobile.waitForFunction(() => document.querySelector('[data-row="6"]').parentElement.scrollLeft > 20).catch(async () => {
      throw new Error('모바일 스와이프: ' + JSON.stringify(await mobileRow.evaluate(row => ({ left: row.scrollLeft, width: row.clientWidth, content: row.scrollWidth, touch: getComputedStyle(row).touchAction }))));
    });
    await cdp.detach();
    check(await mobileRow.locator('.on').textContent() === '가디건', '스와이프는 옷 선택을 바꾸지 않는다');
    check(await mobile.evaluate(() => document.documentElement.scrollWidth === innerWidth), '폰에서 가로 넘침 없음');
    await mobile.screenshot({ path: 'game/review/dresser-mobile-swipe-360.png', animations: 'disabled' });
  } finally { await context.close(); }
  check(errors.length === 0, `브라우저 오류: ${errors.join(', ')}`);
  return { desktopButtons: true, keyboard: true, resize: true, independentSave: true, fixedTabHeight: true, mobileSwipe: true, errors };
}
