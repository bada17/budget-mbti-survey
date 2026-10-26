async page => {
  const errors=[], writes=[];
  page.on('pageerror', e=>errors.push(e.message));
  page.on('request', r=>{if(r.method()==='POST')writes.push(r.url());});
  // 운영 서버에 쓰지 않는다. 정적 빌드가 서버 없이 끝까지 되는지 본다.
  await page.route('**/script.google.com/**',route=>route.abort());
  await page.route('**/api/game/**',route=>route.abort());
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.setViewportSize({width:360,height:740});
  await page.goto('http://127.0.0.1:5192/?pub');
  await page.getByRole('button',{name:'출발',exact:true}).click();
  await page.getByRole('button',{name:'이 모습으로 걷기',exact:true}).click();
  const prompts=[];
  for(let i=0;i<6;i++){
    await page.locator('.g-bubble').first().waitFor({state:'visible'});
    const before=await page.locator('.g-prompt').innerText(); prompts.push(before);
    await page.locator('.g-bubble').first().click();
    await page.locator('.g-replies.open').waitFor();
    await page.locator('.g-replies .g-talk').click();
    await page.locator('.g-replies.typed .g-reply').first().click();
    await page.locator('.g-door').waitFor({state:'visible'});await page.locator('.g-door').click({force:true});
    if(i<5)await page.waitForFunction(prev=>document.querySelector('.g-prompt')?.textContent!==prev,before);
  }
  await page.locator('.g-end-card').waitFor({state:'visible'});
  await page.getByRole('button',{name:'시민의 숲로 들어가기',exact:true}).evaluate(button=>button.click());
  await page.getByRole('button',{name:'고마워요',exact:true}).click();
  for(let i=0;i<2;i++){await page.getByRole('button',{name:'다음',exact:true}).click();}
  await page.getByRole('button',{name:'둘러보기 마치기',exact:true}).click();
  await page.getByRole('button',{name:'주민 폰 — 지도와 건물',exact:true}).click();
  await page.getByRole('button',{name:/따져 볼 지방정부/}).click();
  await page.locator('.v-cut-article').waitFor();
  await page.locator('.v-cut-more summary').click();
  await page.getByRole('searchbox').fill('춘천');
  await page.getByRole('link',{name:'관련 기사 원문',exact:true}).waitFor();
  await page.screenshot({path:'game/review/1026-final-production-offline-360.png'});
  const result={prompts,errors,writes,article:await page.locator('.v-cut-article').innerText(),cuts:(await page.locator('.v-cut-list').innerText()).slice(0,220),durable:await page.evaluate(()=>Object.keys(localStorage))};
  await page.unroute('**/script.google.com/**'); await page.unroute('**/api/game/**');
  return result;
}
