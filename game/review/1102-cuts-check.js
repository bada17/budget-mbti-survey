// 실행: playwright-cli run-code --filename=game/review/1102-cuts-check.js
// 새 컨텍스트에서 원본 자료 요청을 잠깐 보류해 로딩 전 빈 숫자도 확인한다.
// eslint-disable-next-line @typescript-eslint/no-unused-expressions -- Playwright CLI가 함수식을 실행한다.
async page => {
  const results = [];
  const check = (ok, why) => { if (!ok) throw new Error(why); };
  for (const mine of [null, '4211000', '1111000', '9999999']) {
    const context = await page.context().browser().newContext({ viewport: { width: 360, height: 740 }, reducedMotion: 'reduce' });
    try {
      const p = await context.newPage(); let release;
      const pending = new Promise(resolve => { release = resolve; });
      await p.route('**/*', async route => { const url = route.request().url(); if (!url.startsWith('http://127.0.0.1:5173/')) return route.abort(); if (url.includes('/data/cuts.json')) await pending; return route.continue(); });
      await p.goto('http://127.0.0.1:5173/?village&hour=11'); await p.waitForFunction(() => window.__village?.player);
      await p.evaluate(async mine => {
        if (mine) localStorage.setItem('budget-game-region', JSON.stringify(mine)); else localStorage.removeItem('budget-game-region');
        const { openCuts } = await import('/places.ts'); document.querySelectorAll('.t-panel').forEach(e => e.remove()); openCuts(document.querySelector('.g'), () => {});
      }, mine);
      check(await p.locator('.v-cut-total').textContent() === '', '불러오기 전 숫자가 보임'); release();
      await p.waitForFunction(() => document.querySelector('.v-cut-total')?.textContent);
      const expected = await p.evaluate(async mine => {
        const { loadCuts, CUT_LEAD } = await import('/cuts.ts'), data = await loadCuts();
        const amount = data.rows.reduce((sum, row) => sum + row.amount, 0);
        return { received: data.received, source: data.source, count: data.rows.length, amount, local: data.rows.filter(row => row.code === mine).length, lead: [...CUT_LEAD] };
      }, mine);
      const total = `${expected.count.toLocaleString('ko-KR')}건 · ${Math.round(expected.amount / 1e8).toLocaleString('ko-KR')}억 원`;
      check(await p.locator('.v-cut-total').textContent() === total, '원자료 합계와 카드 숫자가 다름');
      check(await p.locator('.v-cut-mine').isVisible() === Boolean(mine), '동네 표시 조건이 다름');
      if (mine) check(await p.locator('.v-cut-mine').textContent() === `우리 동네 ${expected.local}건`, '목록과 동네 건수 기준이 다름');
      await p.locator('.v-cut-pick').focus(); await p.keyboard.press('Enter');
      check(JSON.stringify(await p.locator('.v-cut-mission p').allTextContents()) === JSON.stringify(expected.lead), '원고 변경');
      await p.locator('.v-cut-more summary').click(); await p.getByRole('searchbox').fill('생태탐방로');
      check((await p.locator('.v-cut-list').textContent()).includes('39.09억 원'), '상세 금액·검색 회귀');
      await p.getByRole('button', { name: '← 다른 이야기', exact: true }).click();
      check(await p.locator('.v-cut-pick').isVisible(), '카드로 돌아가지 못함');
      check(await p.locator('.t-panel').evaluate(e => e.scrollWidth === e.clientWidth), '가로 넘침');
      results.push({ mine, ...expected, lead: undefined, display: total, blankBeforeLoad: true, navigation: true });
    } finally { await context.close(); }
  }
  return results;
}
