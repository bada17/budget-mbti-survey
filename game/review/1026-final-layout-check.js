async page => {
  const results={errors:[],layouts:[]};
  page.on('pageerror',e=>results.errors.push(e.message));
  await page.unroute('**/script.google.com/**'); await page.unroute('**/api/game/**');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.setViewportSize({width:360,height:740});
  await page.goto('http://127.0.0.1:5191/?village&tour=1&hour=11');
  await page.evaluate(()=>localStorage.removeItem('budget-game-village-guide-1026'));
  await page.reload();
  await page.getByRole('button',{name:'다음',exact:true}).waitFor();
  await page.getByRole('button',{name:'다음',exact:true}).click();
  await page.getByRole('button',{name:'다음',exact:true}).waitFor();
  await page.screenshot({path:'game/review/1026-final-tour-east-360.png'});
  const zoomBefore=await page.evaluate(()=>window.__village.cameras.main.zoom);
  await page.setViewportSize({width:1280,height:720});
  await page.waitForTimeout(500);
  const rotate=await page.evaluate(()=>({zoom:window.__village.cameras.main.zoom,dpr:window.__village.runtime.view().dpr,ids:window.__village.guided.ids,scroll:document.querySelector('.g').scrollTop}));
  if(rotate.zoom===rotate.dpr||rotate.scroll!==0)throw new Error('안내 회전 구도/스크롤 실패 '+JSON.stringify(rotate));
  results.rotate={zoomBefore,...rotate};
  await page.getByRole('button',{name:'주민 폰 — 지도와 건물',exact:true}).click();
  await page.getByRole('button',{name:/따져 볼 지방정부/}).click();
  await page.locator('.v-cuts').waitFor(); await page.locator('.t-back').click();
  results.cancel=await page.evaluate(()=>({showing:window.__village.showing,paused:window.__village.paused}));
  if(results.cancel.showing||results.cancel.paused)throw new Error('안내 취소 뒤 잠김');
  await page.goto('http://127.0.0.1:5191/?village&go=board');
  await page.getByRole('heading',{name:'쪽지판',exact:true}).waitFor();
  if(!(await page.locator('.t-panel').innerText()).includes('로그인하면 쪽지를 남길 수 있어요'))throw new Error('본편 로그인 조건 누락');
  results.normalBoard=true;
  for(const width of [360,1280]){
    await page.setViewportSize({width,height:width===360?740:900});
    await page.goto('http://127.0.0.1:5191/?about');
    await page.getByRole('heading',{name:'우리 동네 살림, 같이 들여다봐요',exact:true}).waitFor();
    const badge=await page.locator('.lp-badge').innerText();
    if(badge!=='가오픈 · 마을은 아직 단장 중이에요')throw new Error('배지 불일치');
    const text=await page.locator('.lp').innerText();
    if(text.includes('가입 없이 바로 시작해요.'))throw new Error('삭제 문구 남음');
    for(const [name,selector] of [['hero','.lp-hero'],['intro','.lp-intro'],['walk','[data-feature=walk]'],['budget','[data-feature=budget]'],['cards','[data-feature=cards]']]){
      const target=page.locator(selector); await target.scrollIntoViewIfNeeded();
      await page.waitForTimeout(100);
      await target.screenshot({path:'game/review/1026-final-landing-'+name+'-'+width+'.png'});
    }
    const layout=await page.evaluate(()=>({width:innerWidth,overflow:document.querySelector('.lp').scrollWidth>innerWidth,images:[...document.querySelectorAll('img.lp-hero-art,img.lp-feature-art')].map(i=>({src:i.getAttribute('src'),ok:i.complete&&i.naturalWidth>0,w:i.naturalWidth,h:i.naturalHeight}))}));
    if(layout.overflow||layout.images.some(i=>!i.ok))throw new Error('소개 넘침/그림 로드 실패');
    results.layouts.push(layout);
  }
  return results;
}
